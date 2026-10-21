import markdown, re, pathlib
src = pathlib.Path('docs/产品说明书.md').read_text(encoding='utf-8')
# 去掉正文开头的 H1 与版本行（封面已经承担），避免重复
src = re.sub(r'^#\s+.*?\n', '', src, count=1)
src = re.sub(r'^\*\*版本\*\*.*?\n', '', src, count=1, flags=re.M)
body = markdown.markdown(src, extensions=['tables'])
# 第一段（标题 + 版本行）单独做成封面
html = f"""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>不熟局 · 产品说明书</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600;700&family=Noto+Sans+SC:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
@page {{ size: A4; margin: 20mm 18mm 18mm; }}
* {{ box-sizing: border-box; }}
html, body {{ margin: 0; padding: 0; }}
body {{
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 10.5pt; line-height: 1.75; color: #17140F;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}}
h1, h2, h3 {{ font-family: "Noto Serif SC", "SimSun", serif; font-weight: 600; letter-spacing: 0; }}
h1 {{ font-size: 30pt; line-height: 1.25; margin: 0 0 6mm; }}
h2 {{
  font-size: 17pt; margin: 10mm 0 4mm; padding-top: 3mm;
  border-top: 1px solid rgba(23,20,15,.18);
  break-after: avoid;
}}
h3 {{ font-size: 12.5pt; margin: 6mm 0 2mm; break-after: avoid; }}
p {{ margin: 0 0 3mm; text-wrap: pretty; }}
strong {{ font-weight: 700; }}
em {{ font-style: normal; color: #4A443B; }}
hr {{ border: 0; border-top: 1px solid rgba(23,20,15,.18); margin: 6mm 0; }}
blockquote {{
  margin: 4mm 0; padding: 3mm 5mm; border-left: 2px solid #D8351B;
  background: #FBF8F1; color: #4A443B;
}}
table {{ width: 100%; border-collapse: collapse; margin: 3mm 0 5mm; font-size: 9.5pt; break-inside: auto; }}
th, td {{ border-bottom: 1px solid rgba(23,20,15,.16); padding: 2mm 2.5mm; text-align: left; vertical-align: top; line-height: 1.6; }}
th {{ font-weight: 700; border-bottom-color: #17140F; background: #F7F3EA; }}
tr {{ break-inside: avoid; }}
ul, ol {{ margin: 0 0 3mm; padding-left: 5mm; }}
li {{ margin-bottom: 1.2mm; }}
code {{ font-family: "JetBrains Mono", monospace; font-size: 9pt; background: #F2EDE3; padding: 0 1mm; }}
pre {{
  font-family: "JetBrains Mono", monospace; font-size: 8.6pt; line-height: 1.6;
  background: #FBF8F1; border: 1px solid rgba(23,20,15,.16); padding: 4mm; margin: 3mm 0;
  white-space: pre-wrap; break-inside: avoid;
}}
.cover {{ height: 246mm; display: flex; flex-direction: column; justify-content: space-between; }}
.cover__mark {{ font-family: "JetBrains Mono", monospace; font-size: 9pt; letter-spacing: .28em; color: #6A6155; }}
.cover__title {{ font-family: "Noto Serif SC", serif; font-size: 44pt; font-weight: 600; line-height: 1.18; letter-spacing: 0; margin: 8mm 0 6mm; }}
.cover__lead {{ font-size: 12pt; line-height: 1.9; color: #4A443B; max-width: 120mm; }}
.cover__meta {{ font-family: "JetBrains Mono", monospace; font-size: 9pt; letter-spacing: .06em; color: #6A6155; }}
.cover__rule {{ height: 2px; background: #D8351B; width: 46mm; margin: 10mm 0; }}
.page-break {{ break-after: page; }}
h2:first-of-type {{ border-top: 0; padding-top: 0; }}
</style></head><body>
<section class="cover">
  <div class="cover__mark">BU SHU · 广州大学城 · 小谷围岛</div>
  <div>
    <div class="cover__rule"></div>
    <div class="cover__title">不熟局<br>产品说明书</div>
    <div class="cover__lead">把「想认识人但不想硬聊」的大学生，按问卷配成一桌 4–8 人，<br>一起干一件具体的小事。</div>
  </div>
  <div class="cover__meta">v1.0 · 2026-10-21 · 前端演示版<br>https://whatif146.github.io/bushu/</div>
</section>
<div class="page-break"></div>
{body}
</body></html>"""
pathlib.Path('docs/manual.html').write_text(html, encoding='utf-8')
print('html ok', len(html))
