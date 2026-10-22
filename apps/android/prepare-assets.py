"""Copy the existing web app and apply only Android-specific offline adaptations."""
import re
import shutil
from pathlib import Path

root = Path(__file__).resolve().parent
source = root.parent / 'web' / 'dist'
target = root / 'app/src/main/assets/calendar'
if not source.is_dir():
    raise SystemExit('Existing bundled assets are ready to build. To refresh, place web dist at ../web/dist.')
shutil.copytree(source, target, dirs_exist_ok=True)
html = (target / 'index.html').read_text()
html = re.sub(r'  <link rel="manifest"[^>]*>\n', '', html)
html = html.replace('<script src="./app.js" defer></script>', '<script src="./app.js" defer></script>\n  <script src="./holidays.js" defer></script>\n  <script src="./android.js" defer></script>\n  <script src="./dialogs.js" defer></script>')
html = html.replace('<link rel="stylesheet" href="./styles.css">', '<link rel="stylesheet" href="./styles.css">\n  <link rel="stylesheet" href="./android.css">\n  <link rel="stylesheet" href="./dialogs.css">')
html = html.replace('  <title>岁时 · 万年历</title>', '  <title>岁时万年历</title>')
html = re.sub(r'<button id="install-btn">.*?</button>', '<span class="android-version">安卓版 · 1.2.0</span>', html)
html = re.sub(r'  <dialog id="install-dialog">.*?</dialog>\n', '', html)
html = html.replace('记事保存在当前浏览器，清理浏览器数据后会丢失。', '记事保存在当前应用，清除应用数据或卸载后会丢失。')
html = html.replace('内容只保存在当前浏览器。', '内容只保存在当前应用，清除应用数据或卸载后会丢失。')
html = html.replace('节日标注表示节日当天，不表示法定放假或调休安排。', '“休”表示放假，“班”表示调休上班。已收录 2002—2026 年放假调休安排；未收录年份会提示，不推算放假日期。')
html = html.replace('<p class="muted">农历数据：', '<p>安卓版 1.2.0 · 农历离线可用，放假安排联网自动更新。</p><p class="muted">农历数据：')
(target / 'index.html').write_text(html)
css = (target / 'styles.css').read_text()
css = re.sub(r"^@import[^\n]*\n", '', css, flags=re.MULTILINE)
css += '\n.android-version{display:block;font-size:11px;color:var(--muted);padding:0 8px 20px}\n'
(target / 'styles.css').write_text(css)
js = (target / 'app.js').read_text()
js = re.sub(r"if\('serviceWorker' in navigator\).+\n?", '', js)
js = js.replace("localStorage.getItem('suishi-notes')", "SuishiStorage.readNotes()")
js = js.replace("localStorage.setItem('suishi-notes',JSON.stringify(next));", "if(!SuishiStorage.writeNotes(JSON.stringify(next)))throw new Error('Native storage failed');")
js = js.replace('记事未保存：浏览器存储空间不足或被限制', '记事未保存：请检查设备可用存储空间')
js = js.replace("if(note&&confirm(`删除“${note.title}”？`)&&saveNotes(notes.filter(n=>n.id!==note.id))){renderNotes();toast('记事已删除');}", "if(note)window.requestDeleteNote(note);")
(target / 'app.js').write_text(js)
shutil.copytree(root / 'android-assets', target, dirs_exist_ok=True)
for name in ['sw.js', 'manifest.webmanifest']:
    (target / name).unlink(missing_ok=True)
print('Android offline assets prepared')
