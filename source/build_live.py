import argparse
import json
import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BUILD = ROOT / "xingjian-cabin"


def build(*, refresh_markup: bool = False) -> None:
    destination = ROOT.parent if refresh_markup else BUILD
    if refresh_markup:
        if not (destination / "manifest.json").is_file():
            raise ValueError("Place the source folder inside a published Xingjian extension.")
    else:
        destination.mkdir(exist_ok=True)
        for name in (
            "manifest.json", "index.js", "cabin-ui.js", "window-motion.js",
            "reader-resize.js", "reader-frame.js", "reader-ui.js", "reader.css", "tavern.css",
        ):
            shutil.copyfile(ROOT / "live" / name, destination / name)
        shutil.copyfile(ROOT.parent / "forest-tavern" / "theme-choice.js", destination / "theme-choice.js")
        shutil.copytree(ROOT.parent / "forest-tavern" / "fonts", destination / "fonts", dirs_exist_ok=True)

    template = (ROOT / "index.html").read_text(encoding="utf-8").split("<body>", 1)[1]
    template = template.split("<script>/* CABIN_SCRIPT */", 1)[0]
    template = re.sub(r'<main class="panel conversation".*?</main>', "", template, flags=re.S)
    template = re.sub(r'<input type="file" id="image-input".*?>', "", template)
    template = re.sub(r'<p class="sheet-note" id="terminal-note".*?</p>', "", template, flags=re.S)
    template = re.sub(r'<header class="cabin-mark".*?</header>', "", template, flags=re.S)
    template = re.sub(
        r'<div class="welcome" id="welcome">.*?</p>\s*</div>',
        '<div class="orb-perch"><div class="orb" aria-hidden="true"></div><p>ยินดีต้อนรับกลับมา ผู้บัญชาการ</p></div>',
        template, flags=re.S,
    )
    template = template.replace(
        '<div class="window-shade"></div>\n                    <div class="star-reflections"></div>',
        '<canvas class="window-motion" aria-hidden="true"></canvas><div class="window-shade"></div>',
    )
    template = template.replace(
        '        <nav class="sill-controls mounted"',
        '        <div class="cabin-pan" tabindex="0" aria-label="ลากซ้าย-ขวาเพื่อชมวิว หรือใช้ปุ่มลูกศรก็ได้"></div>\n'
        '        <nav class="sill-controls mounted"',
        1,
    )
    template = template.replace('id="add-images"', 'id="import-role"').replace("เพิ่มรูปตัวอย่าง", "นำเข้าตัวละคร")
    template = re.sub(
        r'(<button[^>]+id="import-role"[^>]*>.*?</button>)',
        lambda match: (
            '<div class="library-actions">' + match[1] +
            '<button class="holo-key" id="close-library" type="button">'
            '<svg aria-hidden="true"><use href="#i-close"/></svg>ปิด</button></div>'
        ),
        template,
        count=1,
    )
    template = template.replace(
        "</defs>",
        '<symbol id="i-audio" viewBox="0 0 24 24">'
        '<path d="M4 10v4h4l5 4V6l-5 4Zm12-1a4.4 4.4 0 0 1 0 6m2.3-8a7 7 0 0 1 0 10"/>'
        "</symbol></defs>",
        1,
    )
    template = template.replace(
        '        </nav>\n\n        <nav class="wall-controls mounted"',
        '            <button class="cabin-key" id="ambient-toggle" type="button" aria-pressed="false">'
        '<svg aria-hidden="true"><use href="#i-audio"/></svg><span>ไวท์นอยส์</span></button>\n'
        '        </nav>\n\n        <nav class="wall-controls mounted"',
        1,
    )
    template = template.replace(
        '        <div class="setting">\n            <label for="still-mode">',
        '        <div class="setting"><label for="ambient-volume">ระดับเสียงไวท์นอยส์</label>'
        '<input id="ambient-volume" type="range" min="0" max="100" value="32">'
        '<output id="ambient-level" for="ambient-volume">32%</output></div>\n'
        '        <div class="setting">\n            <label for="still-mode">',
        1,
    )
    template = template.replace(
        '    </dialog>\n\n    <dialog class="attached-sheet session-sheet"',
        '        <div class="cabin-theme-option">'
        '<label class="cabin-start-setting" for="cabin-start-route">เมื่อเข้าห้องโดยสาร'
        '<select id="cabin-start-route"><option value="">วิวล่าสุด</option>'
        '<option value="galaxy">ล่องทางช้างเผือก</option><option value="rings">ชมวงแหวนดาว</option>'
        '<option value="dawn">รุ่งอรุณวงโคจร</option></select></label>'
        '<div id="cabin-theme-option" hidden>'
        '<div id="cabin-theme-links" aria-label="สลับธีม"></div>'
        '<p id="cabin-theme-status" role="status" hidden></p></div></div>\n'
        '    </dialog>\n\n    <dialog class="attached-sheet session-sheet"',
        1,
    )
    template = template.replace(
        '<div class="cards" id="cards"></div>',
        '<div class="cards" id="cards"></div>'
        '<p class="carousel-empty" id="carousel-empty" hidden>นำเข้าตัวละครแล้วจะเริ่มการสื่อสารได้ที่นี่</p>',
    )
    markup = "export const cabinMarkup = " + json.dumps(template, ensure_ascii=False) + ";\n"
    (destination / "cabin-markup.js").write_text(markup, encoding="utf-8")

    css = (ROOT / "cabin.css").read_text(encoding="utf-8")
    css = css.replace(":root", ":host")
    css = css.replace("body { margin: 0; overflow: hidden; }", "")
    css = css.replace('html[data-still="true"]', ':host([data-still="true"])')
    css = css.replace('html:not([data-still="false"])', ':host(:not([data-still="false"]))')
    for token, filename in (
        ("__CABIN_DESKTOP__", "cabin-desktop.webp"),
        ("__CABIN_MOBILE__", "cabin-mobile.webp"),
        ("__VISTA_RINGS__", "rings.jpg"),
        ("__VISTA_DAWN__", "dawn.jpg"),
    ):
        css = css.replace(token, "./assets/" + filename)
        if not refresh_markup:
            (destination / "assets").mkdir(exist_ok=True)
            shutil.copyfile(ROOT / "assets" / filename, destination / "assets" / filename)
    if not refresh_markup:
        for filename in ("cabin-air.wav", "bedroom-roomtone.wav", "bedroom-roomtone-source.txt"):
            (destination / "assets" / filename).unlink(missing_ok=True)
        for filename in ("space-ambience.m4a", "space-ambience-source.txt"):
            shutil.copyfile(ROOT / "assets" / filename, destination / "assets" / filename)

    css += """
/* The cabin and the native app share a viewport, with separate surfaces. */
:host { color: var(--text); color-scheme: dark; pointer-events: none; }
.cabin button, .cabin input, .carousel, .panel, .attached-sheet { pointer-events: auto; }
.holo-card[aria-hidden="true"] { pointer-events: none; }
.vista { animation: none; }
.window-motion { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.cabin-pan { display: none; }
.orb-perch { position: absolute; display: flex; align-items: center; gap: 12px; left: var(--sill-x); bottom: calc(100% - var(--sill) + 31px); pointer-events: none; }
.orb-perch p { color: #f4e9de; font-size: clamp(14px, 1.28vw, 19px); letter-spacing: 0; text-shadow: 0 1px 8px #0b0913, 0 2px 20px #0b0913; }
.cabin:not([data-page="home"]) .orb-perch { display: none; }
.library-actions { display: flex; gap: 2px; }
#terminal::backdrop { background: transparent; }
.sill-controls #ambient-toggle { box-shadow: -1px 0 #d8baa431; }
.sill-controls #ambient-toggle[aria-pressed="true"] { color: #ffe2b7; background: #221b245c; }
.carousel-empty { position: absolute; inset: 40% 12px auto; text-align: center; color: var(--secondary); font-size: 14px; }
.role-actions button[aria-busy="true"] { opacity: .72; }
.cover-unavailable { display: grid; place-items: center; }
.cover-unavailable > svg { width: 34%; height: 34%; opacity: .65; }
.archive-cover.cover-unavailable { display: grid; }
.cabin-theme-option { border-top: 1px solid var(--line); margin-top: 9px; padding-top: 4px; }
.cabin-theme-option p { padding: 0 10px 6px; color: var(--secondary); font-size: 12px; }
.cabin-start-setting { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 4px 9px 6px; font-size: 13px; }
.cabin-start-setting select { min-height: 40px; max-width: 55%; padding: 4px 7px; border: 1px solid var(--line); border-radius: 5px; background: #201b29; color: var(--text); font: inherit; }
.toast { z-index: 8; }
@media (max-width: 760px) {
    .cabin-pan { display: block; position: absolute; inset: 0; z-index: -1; pointer-events: auto; touch-action: pan-y; }
    .cabin-pan:focus-visible { outline-offset: -5px; }
    .cabin .scene-plate { left: var(--cabin-pan-left, max(-30px, calc((100vw - var(--plate-width)) * .1))); }
    .orb-perch { left: 23px; top: max(53px, calc(env(safe-area-inset-top) + 37px)); bottom: auto; }
    .orb-perch p { font-size: 13px; }
    .sill-controls { width: max-content; max-width: calc(100% - 22px); }
    .sill-controls .cabin-key { gap: 5px; padding-inline: 7px; }
}
"""
    (destination / "cabin.css").write_text(css, encoding="utf-8")
    print(destination)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh-markup", action="store_true", help="Rebuild the cabin HTML and CSS in an installed extension.")
    build(refresh_markup=parser.parse_args().refresh_markup)
