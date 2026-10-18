/* 自動測試：用 jsdom（假瀏覽器）+ 真 three.js 行成個網頁嘅程式，唔使開瀏覽器。
   用法：npm test      （會先 build，再行呢個檔）
   測試：
   1. 每個預設（失衡示範、由零開始除外）模擬 6 日，冇動物死 —— CLAUDE.md 嘅規矩
   2. 一鍵平衡唔會令預設變差，亦唔會出錯
   3. 雜亂嘅缸：一鍵平衡之後，搬走保唔住嘅動物，兩個瓶都要撐到 6 日
   4. 肚餓嘅動物餵咗食會回復
   5. 分享連結：壓縮再解壓，內容一樣 */
const {JSDOM}=require('jsdom');
const THREE=require('three');
const {read,bundleJs}=require('../build.js');

const RUNS=+process.env.RUNS||5,HOURS=144;
let fails=0;const ok=(cond,msg)=>{console.log((cond?'  ✓ ':'  ✗ ')+msg);if(!cond)fails++;};

function boot(){
  const dom=new JSDOM('<!doctype html><html><body>'+read('body.html')+'</body></html>',{runScripts:'outside-only',url:'http://localhost/'});
  const w=dom.window;
  class FakeRenderer{constructor(o){this.domElement=(o&&o.canvas)||w.document.createElement('canvas');this.shadowMap={};this.capabilities={};}
    setSize(){}setPixelRatio(){}render(){}setClearColor(){}dispose(){}}
  w.THREE=Object.assign({},THREE,{WebGLRenderer:FakeRenderer});
  const any=()=>({width:0,height:0,data:new Uint8ClampedArray(4)});
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({canvas:this},{get:(t,k)=>k in t?t[k]:()=>any(),set:(t,k,v)=>{t[k]=v;return true;}});};
  w.HTMLCanvasElement.prototype.toDataURL=()=>'data:,';
  w.ResizeObserver=class{observe(){}disconnect(){}};
  w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
  w.requestAnimationFrame=()=>0;
  if(w.HTMLDialogElement){w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};}
  w.CompressionStream=globalThis.CompressionStream;w.DecompressionStream=globalThis.DecompressionStream;
  w.Response=globalThis.Response;w.Blob=globalThis.Blob;w.TextEncoder=globalThis.TextEncoder;w.TextDecoder=globalThis.TextDecoder;
  w.eval('(()=>{\n'+bundleJs()+'\nwindow.__T={S,CAT,PRESETS,step,trialState,runTrial,autoBalance,addItem,loadPreset,buildJar,resetChem,moveDoomed,packJar,unpackJar,snapshot,switchJar};\n})();');
  return w.__T;
}

const T=boot(),S=T.S,CAT=T.CAT;
const animalDeaths=st=>st.deaths.filter(d=>CAT[d.type].kind==='animal');
function setup(mode,key,zoo){
  S.mode=mode;T.loadPreset(key);
  if(zoo){S.items=S.items.filter(i=>CAT[i.type].kind!=='animal');for(const [t,n] of zoo)for(let k=0;k<n;k++)T.addItem(t,null,true);}
  T.buildJar({keepCam:true});T.resetChem(S);
}
function run6(){const st=T.trialState(null);for(let i=0;i<HOURS;i++)T.step(st);return animalDeaths(st);}

console.log(`\n1. 預設撐到 6 日（每個行 ${RUNS} 次）`);
for(const mode of Object.keys(T.PRESETS))for(const key of Object.keys(T.PRESETS[mode])){
  if(key==='bad'||key==='zero')continue;
  setup(mode,key);let worst=[];
  for(let r=0;r<RUNS;r++){const d=run6();if(d.length>worst.length)worst=d;}
  ok(!worst.length,`${mode}.${key}`+(worst.length?` 死咗：${worst.map(d=>d.type+'('+d.why+')').join(', ')}`:''));
}

console.log('\n2. 一鍵平衡唔會令預設變差');
for(const [mode,key] of [['aqua','eco'],['aqua','tank'],['aqua','bad'],['rain','palu'],['rain','forest']]){
  setup(mode,key);let err=null;try{T.autoBalance();}catch(e){err=e;}
  ok(!err&&S.report&&!S.report.afterDead.length||key==='bad'&&!err,`${mode}.${key}`+(err?` 出錯：${err.message}`:S.report.afterDead.length?` 仍然會死：${S.report.afterDead.join('、')}`:''));
}

console.log('\n3. 雜亂嘅水陸缸：一鍵平衡 + 搬走保唔住嘅');
S.jars=[null,null,null];S.cur=0;
setup('rain','palu',[['daphnia',1],['crab',1],['minnow',1],['medaka',1],['newt',2],['snail',1],['gecko',1],['frog',2],['betta',1]]);
S.sealed=false;T.autoBalance();
const doomed=(S.report.doomed||[]).length;
if(doomed){T.moveDoomed();ok(S.jars.some((j,i)=>i!==S.cur&&j&&j.items.length),`搬咗 ${doomed} 隻去另一個瓶`);}
T.autoBalance();let d1=run6();ok(!d1.length,'原本個瓶撐到 6 日'+(d1.length?`：${d1.map(d=>d.type).join(', ')}`:''));
const other=S.jars.findIndex((j,i)=>i!==S.cur&&j&&j.items.length);
if(other>=0){T.switchJar(other);T.autoBalance();const d2=run6();ok(!d2.length,'分出嚟個瓶撐到 6 日'+(d2.length?`：${d2.map(d=>d.type).join(', ')}`:''));}

console.log('\n4. 肚餓嘅動物餵咗食會回復');
setup('aqua','betta');{const st=T.trialState(null),b=st.items.find(i=>i.type==='betta');b.satiety=0;st.feed=1.5;st.c.flake+=1;for(let h=0;h<48;h++)T.step(st);
  ok(b.satiety>.5,`鬥魚飽肚度由 0 回到 ${Math.round(b.satiety*100)}%`);}

(async()=>{
  console.log('\n5. 分享連結');
  setup('aqua','shrimp');S.jarName='測試瓶';
  const packed=await T.packJar(),back=await T.unpackJar(packed);
  ok(/^[\w-]+$/.test(packed),`連結只用網址安全字元（長度 ${packed.length}）`);
  ok(back.name==='測試瓶'&&back.items.length===T.snapshot().items.length&&back.real===false,'解返出嚟同原本一樣，而且唔當真實缸');
  console.log(fails?`\n✗ ${fails} 項失敗\n`:'\n✓ 全部通過\n');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
