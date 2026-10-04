#!/usr/bin/env python3
"""合成 10 个内置闹钟提示音（零版权风险，纯算法合成，可复现）。

用法：
    python3 synthesize_sounds.py [输出目录]
    # 默认输出到 ../android/src/main/res/raw/（即 modules/alarm-ring 的 raw 资源目录）

产出：10 个单声道 OGG Vorbis 文件，`ars_` 前缀命名，峰值归一化 -1 dBFS。
依赖：ffmpeg / ffprobe（用于 OGG 编码与校验），Python 3.8+（仅标准库）。
    无系统 ffmpeg 时可用 FFMPEG_BIN / FFPROBE_BIN 环境变量指定替代二进制路径
    （如 npm 包 ffmpeg-static：`FFMPEG_BIN=/tmp/ffmpeg-tool/node_modules/ffmpeg-static/ffmpeg`）。

声音设计一览：
    ars_classic_alarm  经典闹钟   金属双铃连续敲击（不谐和泛音 + 快速指数衰减）
    ars_buzzer         蜂鸣       方波谐波 + 门控突发 + 颤音
    ars_radar_ping     雷达(尖锐) 四连急促短哔，组间停顿，音高微升
    ars_radar_soft     雷达(柔和) 三连慢速圆哔，组间停顿
    ars_marimba        马林巴     五声音阶旋律，木质共振（强四次泛音）
    ars_piano_arpeggio 钢琴琶音   琶音循环，多泛音微失谐衰减
    ars_music_box      八音盒     高音区拨簧音色 + 简单旋律
    ars_chime          风铃       稀疏钟击，钟声分音（2.4/3.9 倍频）
    ars_birds_morning  清晨鸟鸣   调频啁啾（相位积分扫频）成组出现
    ars_ocean_waves    海浪       布朗噪声 + 单极低通 + 慢波幅调制 + 浪花嘶声
"""

import math
import os
import random
import subprocess
import sys
import tempfile
import wave

SR = 44100
PEAK_DB = -1.0
PEAK = 10 ** (PEAK_DB / 20.0)

TWO_PI = 2.0 * math.pi


# ---------- 基础工具 ----------

def silence(duration: float) -> list:
    return [0.0] * int(duration * SR)


def mix_into(out: list, start_sec: float, samples: list) -> None:
    """把 samples 叠加到 out 的 start_sec 处（越界截断）。"""
    start = int(start_sec * SR)
    n = len(out)
    for i, v in enumerate(samples):
        p = start + i
        if 0 <= p < n:
            out[p] += v


def write_wav(path: str, samples: list) -> None:
    """归一化到 -1 dBFS 峰值后写 16-bit 单声道 WAV。"""
    peak = max((abs(s) for s in samples), default=0.0) or 1.0
    scale = PEAK / peak
    data = bytearray()
    for s in samples:
        v = int(max(-1.0, min(1.0, s * scale)) * 32767)
        data += v.to_bytes(2, "little", signed=True)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(bytes(data))


def beep(freq: float, dur: float, harmonics=None, attack=0.005, release=0.01) -> list:
    """带快攻击/快释放包络的哔声。harmonics: [(倍频, 幅度)]。"""
    if harmonics is None:
        harmonics = [(1.0, 1.0)]
    n = int(dur * SR)
    out = [0.0] * n
    a = max(1, int(attack * SR))
    r = max(1, int(release * SR))
    for i in range(n):
        t = i / SR
        if i < a:
            env = i / a
        elif i >= n - r:
            env = (n - 1 - i) / r
        else:
            env = 1.0
        v = 0.0
        for ratio, amp in harmonics:
            v += amp * math.sin(TWO_PI * freq * ratio * t)
        out[i] = v * env
    return out


def struck_tone(freq: float, dur: float, partials, decay: float, attack=0.004) -> list:
    """打击乐器音色：多个分音各自带指数衰减（partials: [(倍频, 幅度, 衰减系数)]）。"""
    n = int(dur * SR)
    a = max(1, int(attack * SR))
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        env = (i / a) if i < a else math.exp(-decay * t)
        v = 0.0
        for ratio, amp, dec in partials:
            v += amp * math.exp(-dec * t) * math.sin(TWO_PI * freq * ratio * t)
        out[i] = v * env
    return out


# ---------- 10 个音色 ----------

def classic_alarm() -> list:
    """金属双铃：约 12.5 次/秒 连续敲击，不谐和泛音，奇偶敲击音高微差。"""
    dur = 5.0
    out = silence(dur)
    partials = [(1.0, 0.90), (2.01, 0.45), (2.98, 0.28), (4.03, 0.18), (5.42, 0.10)]
    f0 = 1750.0
    period = 0.08
    strike_dur = 0.09
    t = 0.0
    idx = 0
    while t < dur:
        alt = 1.0 + 0.035 * (idx % 2)
        n = int(strike_dur * SR)
        a = max(1, int(0.002 * SR))
        body = []
        for i in range(n):
            ts = i / SR
            env = (i / a) if i < a else math.exp(-28.0 * ts)
            v = 0.0
            for ratio, amp in partials:
                v += amp * math.sin(TWO_PI * f0 * alt * ratio * ts)
            body.append(v * env)
        mix_into(out, t, body)
        t += period
        idx += 1
    # 结尾整体淡出，保证循环点无爆音
    fade = int(0.05 * SR)
    for i in range(fade):
        out[len(out) - 1 - i] *= i / fade
    return out


def buzzer() -> list:
    """蜂鸣：奇次谐波近似方波 + 0.5s 开 / 0.3s 关门控 + 10Hz 颤音。"""
    dur = 4.0
    n = int(dur * SR)
    out = [0.0] * n
    f = 620.0
    edge = int(0.008 * SR)
    for i in range(n):
        t = i / SR
        cycle = t % 0.8
        gate = 1.0 if cycle < 0.5 else 0.0
        # 门控边缘 8ms 斜坡，避免爆音
        ci = int(cycle * SR)
        if ci < edge:
            gate *= ci / edge
        elif cycle >= 0.5:
            off = int((cycle - 0.5) * SR)
            if off < edge:
                gate *= max(0.0, 1.0 - off / edge)
        trem = 0.75 + 0.25 * math.sin(TWO_PI * 10.0 * t)
        v = 0.0
        for k in range(1, 10, 2):
            v += math.sin(TWO_PI * f * k * t) / k
        out[i] = v * gate * trem
    return out


def radar_ping() -> list:
    """尖锐雷达：四连急促短哔（0.10s 哔 / 0.12s 隙），组周期 1.5s，逐哔音高微升。"""
    dur = 6.0
    out = silence(dur)
    f = 1320.0
    group_period = 1.5
    beep_len, beep_gap = 0.10, 0.12
    tg = 0.0
    while tg < dur:
        for b in range(4):
            t0 = tg + b * (beep_len + beep_gap)
            if t0 >= dur:
                break
            freq = f * (1.0 + 0.02 * b)
            mix_into(out, t0, beep(freq, beep_len, attack=0.004, release=0.008))
        tg += group_period
    return out


def radar_soft() -> list:
    """柔和雷达：三连慢速圆哔（0.22s 哔 / 0.22s 隙），组周期 2.2s，含二次泛音。"""
    dur = 6.0
    out = silence(dur)
    f = 980.0
    harmonics = [(1.0, 1.0), (2.0, 0.22)]
    group_period = 2.2
    beep_len, beep_gap = 0.22, 0.22
    tg = 0.0
    while tg < dur:
        for b in range(3):
            t0 = tg + b * (beep_len + beep_gap)
            if t0 >= dur:
                break
            mix_into(out, t0, beep(f, beep_len, harmonics, attack=0.02, release=0.04))
        tg += group_period
    return out


def marimba() -> list:
    """马林巴：五声音阶旋律循环，木质音色（强四次泛音）。"""
    dur = 8.0
    out = silence(dur)
    # C 大调五声音阶 C5 D5 E5 G5 A5 C6
    scale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]
    melody = [0, 2, 4, 5, 4, 2, 3, 1, 0, 2, 4, 3, 2, 1, 0, 0]
    partials = [(1.0, 1.0, 5.0), (2.0, 0.12, 9.0), (3.0, 0.06, 12.0), (4.0, 0.18, 8.0)]
    note_gap = 0.46
    t = 0.0
    i = 0
    while t < dur:
        freq = scale[melody[i % len(melody)]]
        mix_into(out, t, struck_tone(freq, 0.5, partials, decay=4.5))
        t += note_gap
        i += 1
    return out


def piano_arpeggio() -> list:
    """钢琴琶音：C 大调和弦琶音上下行循环，多泛音微失谐（k^2 失谐项）。"""
    dur = 10.0
    out = silence(dur)
    arp = [261.63, 329.63, 392.00, 523.25, 659.25, 523.25, 392.00, 329.63]
    partials = []
    for k in range(1, 7):
        # 钢琴弦微失谐：倍频比带 k^2 * 0.0004 的拉伸
        partials.append((k * (1.0 + 0.0004 * k * k), 1.0 / (k ** 1.3), 1.5 + 0.6 * k))
    note_gap = 0.55
    t = 0.0
    i = 0
    while t < dur:
        freq = arp[i % len(arp)]
        mix_into(out, t, struck_tone(freq, note_gap + 0.4, partials, decay=2.2))
        t += note_gap
        i += 1
    # 结尾淡出
    fade = int(0.3 * SR)
    for i in range(fade):
        out[len(out) - 1 - i] *= i / fade
    return out


def music_box() -> list:
    """八音盒：高音区拨簧音色，简单原创旋律，部分位置叠五度和音。"""
    dur = 10.0
    out = silence(dur)
    # 高音区音符（E6 起）
    e6, g6, a6, b6, c7, d7 = 1318.51, 1567.98, 1760.00, 1975.53, 2093.00, 2349.32
    melody = [
        (e6, True), (g6, False), (a6, False), (g6, False),
        (e6, False), (d7, False), (b6, True), (g6, False),
        (a6, False), (c7, False), (b6, False), (g6, True),
        (e6, False), (g6, False), (d7, False), (e6, True),
    ]
    partials = [(1.0, 1.0, 6.0), (2.0, 0.30, 11.0), (4.1, 0.08, 16.0)]
    note_gap = 0.47
    t = 0.0
    i = 0
    while t < dur:
        freq, with_fifth = melody[i % len(melody)]
        mix_into(out, t, struck_tone(freq, 0.5, partials, decay=5.5))
        if with_fifth:
            mix_into(out, t, struck_tone(freq * 1.5, 0.5, partials, decay=6.5))
        t += note_gap
        i += 1
    return out


def chime() -> list:
    """风铃：稀疏钟击，钟声分音（2.4 / 3.9 倍频），固定种子伪随机时序。"""
    dur = 8.0
    out = silence(dur)
    rng = random.Random(42)
    pitches = [659.25, 783.99, 987.77, 1174.66]
    partials = [(1.0, 1.0, 1.8), (2.4, 0.40, 3.2), (3.9, 0.22, 5.0), (5.4, 0.10, 7.0)]
    t = 0.15
    while t < dur - 0.5:
        freq = pitches[rng.randrange(len(pitches))]
        mix_into(out, t, struck_tone(freq, 1.6, partials, decay=1.6))
        if rng.random() < 0.3:
            # 三成概率紧跟一个高八度轻击
            mix_into(out, t + 0.18, struck_tone(freq * 2, 1.2, partials, decay=2.2))
        t += 0.55 + rng.random() * 0.55
    return out


def birds_morning() -> list:
    """清晨鸟鸣：相位积分的调频啁啾，成组出现，组间留白。"""
    dur = 10.0
    out = silence(dur)
    rng = random.Random(7)
    t = 0.2
    while t < dur - 1.0:
        group_size = 2 + rng.randrange(3)  # 2~4 声
        chirp_dur = 0.10 + rng.random() * 0.08
        for g in range(group_size):
            base = 3400.0 + rng.random() * 800.0
            sweep = 1400.0 + rng.random() * 1200.0  # 扫频幅度
            rate = 22.0 + rng.random() * 14.0       # 扫频速率（Hz）
            n = int(chirp_dur * SR)
            body = [0.0] * n
            phase = 0.0
            dt = 1.0 / SR
            for i in range(n):
                f = base + sweep * math.sin(TWO_PI * rate * (i / SR))
                phase += TWO_PI * f * dt
                # hann 包络
                w = math.sin(math.pi * (i + 1) / (n + 1))
                body[i] = 0.8 * w * math.sin(phase)
            t0 = t + g * (chirp_dur + 0.06)
            if t0 + chirp_dur >= dur:
                break
            mix_into(out, t0, body)
        t += chirp_dur * group_size + 0.6 + rng.random() * 0.9
    return out


def ocean_waves() -> list:
    """海浪：布朗噪声 + 单极低通 + 慢波幅调制（两个周期错相叠加）+ 浪尖嘶声。"""
    dur = 10.0
    n = int(dur * SR)
    out = [0.0] * n
    rng = random.Random(2026)
    brown = 0.0
    lp = 0.0
    for i in range(n):
        t = i / SR
        white = rng.random() * 2.0 - 1.0
        # 布朗噪声（泄漏积分）+ 单极低通
        brown += 0.02 * (white - brown)
        lp += 0.06 * (brown - lp)
        # 两个错相慢波幅包络（周期 7.5s / 4.7s）
        crest = max(0.0, math.sin(TWO_PI * t / 7.5)) ** 2.2
        swell = 0.4 * max(0.0, math.sin(TWO_PI * t / 4.7 + 1.3)) ** 2
        amp = 0.12 + crest + swell
        # 浪尖轻量白噪声嘶声
        hiss = white * 0.05 * (crest + swell)
        out[i] = lp * amp + hiss
    # 首尾 0.4s 淡入淡出，循环点平滑
    fade = int(0.4 * SR)
    for i in range(fade):
        out[i] *= i / fade
        out[n - 1 - i] *= i / fade
    return out


SOUNDS = [
    ("ars_classic_alarm", classic_alarm),
    ("ars_buzzer", buzzer),
    ("ars_radar_ping", radar_ping),
    ("ars_radar_soft", radar_soft),
    ("ars_marimba", marimba),
    ("ars_piano_arpeggio", piano_arpeggio),
    ("ars_music_box", music_box),
    ("ars_chime", chime),
    ("ars_birds_morning", birds_morning),
    ("ars_ocean_waves", ocean_waves),
]


def main() -> int:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_out = os.path.normpath(
        os.path.join(script_dir, "..", "android", "src", "main", "res", "raw")
    )
    out_dir = sys.argv[1] if len(sys.argv) > 1 else default_out
    os.makedirs(out_dir, exist_ok=True)

    for name in (s[0] for s in SOUNDS):
        # Android 资源名仅允许小写字母/数字/下划线
        if not name.replace("_", "").isalnum() or name != name.lower():
            print(f"[ERROR] 非法资源名: {name}")
            return 1

    with tempfile.TemporaryDirectory(prefix="alarm-sounds-") as tmp:
        ffmpeg_bin = os.environ.get("FFMPEG_BIN", "ffmpeg")
        ffprobe_bin = os.environ.get("FFPROBE_BIN", "ffprobe")
        total_bytes = 0
        for name, gen in SOUNDS:
            wav_path = os.path.join(tmp, name + ".wav")
            ogg_path = os.path.join(out_dir, name + ".ogg")
            print(f"[synth] {name} ...", flush=True)
            write_wav(wav_path, gen())
            # 编码：单声道 OGG Vorbis，质量档 q4（WAV 已做 -1dBFS 峰值归一化）
            subprocess.run(
                [
                    ffmpeg_bin, "-y", "-loglevel", "error",
                    "-i", wav_path,
                    "-ac", "1", "-ar", str(SR),
                    "-c:a", "libvorbis", "-q:a", "4",
                    ogg_path,
                ],
                check=True,
            )
            size = os.path.getsize(ogg_path)
            total_bytes += size
            probe = subprocess.run(
                [
                    ffprobe_bin, "-v", "error",
                    "-select_streams", "a:0",
                    "-show_entries", "stream=codec_name,channels,sample_rate",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1",
                    ogg_path,
                ],
                capture_output=True, text=True, check=True,
            )
            print(f"  -> {size/1024:.1f} KB")
            print("  " + probe.stdout.strip().replace("\n", "  "))

        print(f"\n[done] 共 {len(SOUNDS)} 个文件，总体积 {total_bytes/1024/1024:.2f} MB"
              f"（预算 ≤5 MB）")
        if total_bytes > 5 * 1024 * 1024:
            print("[ERROR] 总体积超出 5MB 预算")
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
