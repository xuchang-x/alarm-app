#!/usr/bin/env python3
"""用选定的 Lucide 日历时钟图标合成 Expo App 图标所需的 4 个 SVG 源文件。

视觉体系（spec 006）：主色 #6C5CE7，深紫 #5545C8，浅紫 #EAE6FF。
"""
import os

OUT = os.path.dirname(os.path.abspath(__file__))

# lucide-calendar-clock 的 24x24 网格 path（来自 Iconify，ISC 授权）
GLYPH = (
    '<path d="M16 14v2.2l1.6 1M16 2v3m5 2.338V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2.338M3 9h5.859M8 2v3"/>'
    '<circle cx="16" cy="16" r="6"/>'
)

GRADIENT_DEFS = (
    '<defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">'
    '<stop offset="0%" stop-color="#6C5CE7"/>'
    '<stop offset="100%" stop-color="#5545C8"/>'
    '</linearGradient></defs>'
)


def glyph_group(canvas: int, ratio: float, stroke_color: str) -> str:
    """把 24 单位网格的图形按 ratio 比例居中缩放到 canvas 画布。"""
    size = canvas * ratio
    scale = size / 24
    offset = (canvas - size) / 2
    return (
        f'<g transform="translate({offset:.1f} {offset:.1f}) scale({scale:.4f})" '
        f'fill="none" stroke="{stroke_color}" stroke-linecap="round" '
        f'stroke-linejoin="round" stroke-width="2">{GLYPH}</g>'
    )


def write(name: str, body: str) -> None:
    path = os.path.join(OUT, name)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(body)
    print(f'wrote {path}')


# 1. icon.svg：满幅 1024 紫渐变底 + 白色图形（图形占 62%，对应预览页比例）
write('icon.svg', (
    '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">'
    f'{GRADIENT_DEFS}<rect width="1024" height="1024" fill="url(#bg)"/>'
    f'{glyph_group(1024, 0.62, "#FFFFFF")}</svg>'
))

# 2. android-icon-foreground.svg：透明底 + 白色图形（安全区，图形占 52%）
write('android-icon-foreground.svg', (
    '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">'
    f'{glyph_group(1024, 0.52, "#FFFFFF")}</svg>'
))

# 3. android-icon-monochrome.svg：透明底 + 白色图形（单色通道用 alpha）
write('android-icon-monochrome.svg', (
    '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">'
    f'{glyph_group(1024, 0.52, "#FFFFFF")}</svg>'
))

# 4. android-icon-background.svg：纯主紫底（自适应图标背景层不支持渐变，用纯色）
write('android-icon-background.svg', (
    '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">'
    '<rect width="1024" height="1024" fill="#6C5CE7"/></svg>'
))
