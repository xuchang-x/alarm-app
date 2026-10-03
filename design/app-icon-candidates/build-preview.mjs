import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgDir = join(__dirname, 'svg');
const files = readdirSync(svgDir).filter((f) => f.endsWith('.svg')).sort();

/** 图标元信息（语义方向 / 图标集 / 授权） */
const meta = {
  'ph-alarm-duotone': { label: 'Phosphor 双色闹钟', set: 'Phosphor', license: 'MIT', note: '双色层次最贴合 Eva 浅色紫' },
  'ph-alarm-fill': { label: 'Phosphor 实心闹钟', set: 'Phosphor', license: 'MIT', note: '实心版，小尺寸下更清晰' },
  'ph-clock-duotone': { label: 'Phosphor 双色时钟', set: 'Phosphor', license: 'MIT', note: '纯时钟，克制中性' },
  'ph-clock-countdown-duotone': { label: 'Phosphor 倒计时时钟', set: 'Phosphor', license: 'MIT', note: '暗合「下一次还有多久」' },
  'ph-clock-afternoon-duotone': { label: 'Phosphor 午后时钟', set: 'Phosphor', license: 'MIT', note: '指针斜切构图更动感' },
  'ph-calendar-check-duotone': { label: 'Phosphor 日历对勾', set: 'Phosphor', license: 'MIT', note: '日历语义，弱化闹铃' },
  'ph-bell-ringing-duotone': { label: 'Phosphor 响铃', set: 'Phosphor', license: 'MIT', note: '铃铛+震动线，响铃感强' },
  'lucide-alarm-clock': { label: 'Lucide 闹钟', set: 'Lucide', license: 'ISC', note: '细线优雅，精致感' },
  'lucide-calendar-clock': { label: 'Lucide 日历时钟', set: 'Lucide', license: 'ISC', note: '日历+时钟双语义' },
  'tabler-alarm-filled': { label: 'Tabler 实心闹钟', set: 'Tabler', license: 'MIT', note: '圆角亲和，轮廓友好' },
  'tabler-calendar-repeat': { label: 'Tabler 日历循环', set: 'Tabler', license: 'MIT', note: '循环箭头=周期，差异化最强' },
  'material-symbols-alarm': { label: 'Material 闹钟', set: 'Material Symbols', license: 'Apache 2.0', note: '经典系统感' },
  'material-symbols-alarm-rounded': { label: 'Material 圆角闹钟', set: 'Material Symbols', license: 'Apache 2.0', note: '圆润更柔和' },
  'material-symbols-calendar-clock': { label: 'Material 日历时钟', set: 'Material Symbols', license: 'Apache 2.0', note: '双语义填充版' },
  'material-symbols-event-repeat': { label: 'Material 日程循环', set: 'Material Symbols', license: 'Apache 2.0', note: '日历+循环箭头，周期语义最全' },
  'mdi-alarm': { label: 'MDI 闹钟', set: 'MaterialDesign', license: 'Apache 2.0', note: '标准闹钟剪影' },
  'mdi-alarm-multiple': { label: 'MDI 多重闹钟', set: 'MaterialDesign', license: 'Apache 2.0', note: '双表盘叠加=重复提醒' },
  'mdi-calendar-clock-outline': { label: 'MDI 日历时钟', set: 'MaterialDesign', license: 'Apache 2.0', note: '描边版双语义' },
  'solar-alarm-bold': { label: 'Solar 粗体闹钟', set: 'Solar', license: 'CC BY 4.0', note: '现代粗线条（需署名）' },
  'solar-alarm-bold-duotone': { label: 'Solar 双色闹钟', set: 'Solar', license: 'CC BY 4.0', note: '粗线条双色（需署名）' },
  'ic-round-alarm': { label: 'Material 圆形闹钟', set: 'Material Icons', license: 'Apache 2.0', note: '经典 Android 感' },
};

const items = files.map((f) => {
  const key = f.replace('.svg', '');
  const raw = readFileSync(join(svgDir, f), 'utf8')
    .replace(/<\?xml[^>]*\?>\s*/g, '');
  // 去掉固定宽高，保留 viewBox；直接替换颜色值（描边图标 fill:none 不受影响，细节保留）
  const shape = raw
    .replace(/\s*width="[^"]*"/, '')
    .replace(/\s*height="[^"]*"/, '');
  const white = shape.replace(/#6C5CE7/g, '#FFFFFF').replace(/currentColor/g, '#FFFFFF');
  const purple = shape.replace(/currentColor/g, '#6C5CE7');
  const m = meta[key] ?? { label: key, set: '-', license: '-', note: '' };
  return { key, svgWhite: white, svgPurple: purple, ...m };
});

const card = (it) => `
<div class="card">
  <div class="tile purple">${it.svgWhite}</div>
  <div class="tile soft">${it.svgPurple}</div>
  <div class="name">${it.label}</div>
  <div class="sub">${it.set} · ${it.license}</div>
  <div class="note">${it.note}</div>
  <div class="file">${it.key}.svg</div>
</div>`;

const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<title>App 图标候选 · 我的节奏</title>
<style>
  :root { --primary: #6C5CE7; --primary-dark: #5545C8; --soft: #EAE6FF; --bg: #F7F5FC; --text: #25223A; --muted: #9C97AC; }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: -apple-system, "PingFang SC", sans-serif; }
  header { padding: 32px 40px 8px; }
  h1 { margin: 0 0 6px; font-size: 22px; }
  p.desc { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.7; max-width: 720px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; padding: 24px 40px 60px; }
  .card { background: #fff; border: 1px solid #E5E1F0; border-radius: 16px; padding: 18px; text-align: center; }
  .tile { width: 96px; height: 96px; margin: 0 auto 10px; display: grid; place-items: center; }
  .tile svg { width: 60px; height: 60px; }
  .tile.purple { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); border-radius: 24px; box-shadow: 0 6px 14px rgba(81,70,138,.28); }
  .tile.soft { background: var(--soft); border-radius: 24px; }
  .name { font-size: 13px; font-weight: 600; margin-top: 6px; }
  .sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .note { font-size: 11px; color: #6D6880; margin-top: 6px; line-height: 1.5; min-height: 32px; }
  .file { font-size: 10px; color: var(--muted); font-family: ui-monospace, monospace; margin-top: 4px; }
</style>
</head>
<body>
<header>
  <h1>App 图标候选（基于 006「我的节奏」视觉方向）</h1>
  <p class="desc">筛选逻辑：Eva / UI Kitten 浅色紫主色 #6C5CE7；语义覆盖「闹铃 / 时钟倒计时 / 日历循环」三方向，呼应产品叙事「我的节奏 · 每 N 天提醒一次」。每张卡上为紫渐变实底 + 白色图形（上架图标形态），下为 primarySoft 浅紫底 + 紫色图形（内页/营销形态）。全部图标来自开源图标集，可免费商用；Solar 为 CC BY 4.0 需署名，其余 MIT / ISC / Apache 2.0 无需署名。</p>
</header>
<div class="grid">${items.map(card).join('')}</div>
</body>
</html>`;

writeFileSync(join(__dirname, 'preview.html'), html);
console.log(`preview.html generated with ${items.length} icons`);
