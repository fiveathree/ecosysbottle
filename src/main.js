/* ================= 開始 ================= */
if(!load()){
  // 新玩家：由一個未注水嘅空瓶開始，跟住「新手任務」一步步砌
  const p=PRESETS.aqua.zero;Object.assign(S,{mode:'aqua',V:p.V,shape:p.shape,sealed:p.sealed,light:p.light,feed:p.feed,filled:false});
  buildJar({keepChem:true});resetChem(S);
}
renderAll();resize();fitOverlays();
{const shared=location.hash.startsWith('#s=');checkShareLink();if(!shared&&pref.get('ecojar.tour')!=='1')setTimeout(startTour,700);} // 第一次嚟：新手教學
let last=performance.now(),acc=0,lastUI=0,lastBal=0,lastSave=0,lastOv=0;
const editing=()=>{const a=document.activeElement;return a&&a.closest&&a.closest('#editor,#catBar,#pane-env,#pane-ana')&&['INPUT','SELECT'].includes(a.tagName);};
function frame(t){
  const dt=Math.min(.1,Math.max(0,(t-last)/1000));last=t;
  if(S.running){acc+=dt*S.speed;let n=0;while(acc>=1&&n<60){step(S);acc-=1;n++;}}
  animate(dt,S.hour+(S.running?acc:0));
  renderer.render(scene,camera);
  if(t-lastUI>250){lastUI=t;renderMeters();fitOverlays();
    if(dirtyList&&!editing()){renderJarList();updateCatCounts();if(S.sel&&!S.items.includes(S.sel)){S.sel=null;}renderOvR();}else updateJarLive();
    if(popIt)updatePop();
    if(ovOpen.L&&t-lastBal>2500&&!document.activeElement?.closest?.('#pane-bal')&&!($('#repBox')&&$('#repBox').matches(':hover'))){lastBal=t;renderBalance();}}
  if(t-lastOv>1000){lastOv=t;playTick();renderOvL();if(!dirtyList)renderOvR();if(issueOpen)renderIssuePop();}
  if(t-lastSave>15000){lastSave=t;save();}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
