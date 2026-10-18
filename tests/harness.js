/* 測試用：喺 jsdom 入面行成個網頁，回傳內部函數（__T）。sim.test.js 同診斷腳本共用。 */
const {JSDOM}=require('jsdom');
const THREE=require('three');
const {read,bundleJs}=require('../build.js');

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
  w.eval('(()=>{\n'+bundleJs()+'\nwindow.__T={S,CAT,PRESETS,step,trialState,runTrial,autoBalance,addItem,loadPreset,buildJar,resetChem,moveDoomed,packJar,unpackJar,snapshot,switchJar,PLAY,CHAL,startChal,playTick,travelPreview,fastForward,renderPlay};\n})();');
  return w.__T;
}

/* 載入預設；zoo＝[[種類,數量],…] 會取代原本啲動物 */
function makeSetup(T){const S=T.S,CAT=T.CAT;return(mode,key,zoo)=>{
  S.mode=mode;T.loadPreset(key);
  if(zoo){S.items=S.items.filter(i=>CAT[i.type].kind!=='animal');for(const [t,n] of zoo)for(let k=0;k<n;k++)T.addItem(t,null,true);}
  T.buildJar({keepCam:true});T.resetChem(S);};}
/* 用試算行 h 個鐘，回傳死咗嘅動物 */
const runDays=(T,days)=>{const st=T.trialState(null);for(let i=0;i<days*24;i++)T.step(st);return{st,dead:st.deaths.filter(d=>T.CAT[d.type].kind==='animal')};};
module.exports={boot,makeSetup,runDays};
