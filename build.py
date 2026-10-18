"""Build index.html (GitHub Pages) and dist/artifact.html from src/."""
import pathlib
root=pathlib.Path(__file__).parent;src=root/'src'
js='\n'.join((src/f).read_text() for f in ['data.js','sim.js','scene.js','ui.js','ui2.js','main.js'])
inner=(src/'head.html').read_text()+'<style>\n'+(src/'style.css').read_text()+'</style>\n'+(src/'body.html').read_text()+ \
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n<script>\n(()=>{\n'+js+'\n})();\n</script>\n'
(root/'dist').mkdir(exist_ok=True)
(root/'dist'/'artifact.html').write_text(inner)
page='<!doctype html>\n<html lang="zh-Hant">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>\n'+inner+'</html>\n'
(root/'index.html').write_text(page)
print('built',len(page))
