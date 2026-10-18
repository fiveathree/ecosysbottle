/* Build index.html (GitHub Pages) and dist/artifact.html from src/ — Node 版，同 build.py 出一樣嘅結果。
   用法：node build.js        （或者 npm run build） */
const fs=require('fs'),path=require('path');
const root=__dirname,src=path.join(root,'src');
const JS=['data.js','sim.js','scene.js','terra.js','ui.js','ui2.js','play.js','main.js'];
const read=f=>fs.readFileSync(path.join(src,f),'utf8').replace(/\r\n/g,'\n');

function bundleJs(){return JS.map(read).join('\n');}
function build(){
  const inner=read('head.html')+'<style>\n'+read('style.css')+'</style>\n'+read('body.html')+
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n<script>\n(()=>{\n'+bundleJs()+'\n})();\n</script>\n';
  fs.mkdirSync(path.join(root,'dist'),{recursive:true});
  fs.writeFileSync(path.join(root,'dist','artifact.html'),inner);
  const page='<!doctype html>\n<html lang="zh-Hant">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>\n'+inner+'</html>\n';
  fs.writeFileSync(path.join(root,'index.html'),page);
  // 語法檢查：砌完即刻試 parse 一次
  new Function('(()=>{\n'+bundleJs()+'\n})')();
  return page.length;
}
module.exports={build,bundleJs,read};
if(require.main===module)console.log('built',build());
