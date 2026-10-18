/* ================= 玩法：挑戰、成就、收藏、時間旅行 =================
   成就同收藏屬於玩家（每個瀏覽器一份，用 pref 存）；挑戰進度屬於個瓶（S.chal，跟 SNAP_KEYS 存）。
   全部只係睇模擬結果，唔會改個瓶。 */
const PLAY={ach:pref.json('ecojar.ach')||{},col:pref.json('ecojar.col')||{},unl:pref.json('ecojar.unl')||{},lastDay:null,tt:null,ttDay:30};
const savePlay=()=>{pref.set('ecojar.ach',JSON.stringify(PLAY.ach));pref.set('ecojar.col',JSON.stringify(PLAY.col));pref.set('ecojar.unl',JSON.stringify(PLAY.unl));};
const PLAY_TAGS=[['all',['全部','All']],['unlock',['解鎖','Unlocks']],['chal',['挑戰','Challenges']],['ach',['成就','Achievements']],['col',['收藏','Collection']],['travel',['時間旅行','Time travel']]];
paneTag.play='all';

const aliveK=k=>S.items.filter(i=>i.alive&&CAT[i.type].kind===k);
const chalHours=()=>S.chal?(S.day*24+S.hour)-(S.chal.d0*24+S.chal.h0):0;

/* ---- 挑戰 ----
   req：開始前要啱嘅條件（唔啱就話佢知差咩）；keep：途中要一直保持，唔啱就失敗；
   survive＝撐夠日數冇動物死；reach＝限期內達到 goal */
const CHAL=[
  {id:'sealed7',n:['密封一星期','Sealed for a week'],d:['水族缸密封、唔餵食，最少 3 隻動物，7 日冇動物死。','Sealed aquatic jar, no feeding, at least 3 animals, no animal deaths for 7 days.'],days:7,type:'survive',
    req:()=>S.mode!=='aqua'?L('要用水族模式','Use aquatic mode'):!S.filled?L('要注水','Fill it with water'):!S.sealed?L('要密封瓶口','Seal the jar'):S.feed>0?L('每日餵食要係 0','Set daily food to 0'):aliveK('animal').length<3?L('最少要 3 隻動物','Needs at least 3 animals'):null,
    keep:()=>!S.sealed?L('打開咗瓶口','The lid was opened'):S.feed>0?L('開始餵食','Feeding started'):null},
  {id:'tiny',n:['細瓶大世界','Tiny world'],d:['瓶容量 3L 或以下，最少 4 隻動物，5 日冇動物死。','A jar of 3 L or less with at least 4 animals and no deaths for 5 days.'],days:5,type:'survive',
    req:()=>S.V>3?L('瓶容量要 3L 或以下','Volume must be 3 L or less'):aliveK('animal').length<4?L('最少要 4 隻動物','Needs at least 4 animals'):null,
    keep:()=>S.V>3?L('瓶容量加大咗','The jar was made bigger'):null},
  {id:'nogear',n:['零設備','No gadgets'],d:['水族缸唔開氧氣泵、過濾、加熱棒同風扇，最少 5 隻動物，7 日冇動物死。','Aquatic jar with no air pump, filter, heater or fan, at least 5 animals, no deaths for 7 days.'],days:7,type:'survive',
    req:()=>S.mode!=='aqua'?L('要用水族模式','Use aquatic mode'):(S.pump||S.filter||S.heater||S.fan)?L('要關晒氧氣泵、過濾、加熱棒同風扇','Turn off the pump, filter, heater and fan'):aliveK('animal').length<5?L('最少要 5 隻動物','Needs at least 5 animals'):null,
    keep:()=>(S.pump||S.filter||S.heater||S.fan)?L('開咗設備','A gadget was switched on'):null},
  {id:'shrimp15',n:['蝦丁興旺','Shrimp boom'],d:['由最多 6 隻米蝦開始，14 日內生到 12 隻（8L 或以上嘅瓶先養得到咁多）。','Start with 6 or fewer cherry shrimp and grow them to 12 within 14 days (needs a jar of 8 L or more).'],days:14,type:'reach',
    req:()=>S.V<8?L('瓶容量要 8L 或以上','Volume must be 8 L or more'):S.items.filter(i=>i.alive&&i.type==='shrimp').length<2?L('最少要 2 隻米蝦先生到','Needs at least 2 cherry shrimp to breed'):S.items.filter(i=>i.alive&&i.type==='shrimp').length>6?L('開始時米蝦最多 6 隻','Start with 6 or fewer cherry shrimp'):!S.breed?L('要開「生物繁殖」','Turn on breeding'):null,
    keep:()=>!S.breed?L('關咗繁殖','Breeding was turned off'):null,goal:()=>S.items.filter(i=>i.alive&&i.type==='shrimp').length>=12,
    prog:()=>L(`米蝦 ${S.items.filter(i=>i.alive&&i.type==='shrimp').length}／12 隻`,`${S.items.filter(i=>i.alive&&i.type==='shrimp').length}/12 shrimp`)},
  {id:'palu2',n:['水陸兩棲','Both worlds'],d:['水陸缸入面，水中動物同陸地／兩棲動物各最少 2 隻，7 日冇動物死。','A paludarium with at least 2 water animals and 2 land or amphibious animals, no deaths for 7 days.'],days:7,type:'survive',
    req:()=>{if(S.mode!=='rain'||!(S.level>0))return L('要用水陸模式（雨林加水位）','Use paludarium mode (rainforest with water)');const a=aliveK('animal');
      return a.filter(isWater).length<2?L('水中動物最少 2 隻','Needs 2 or more water animals'):a.filter(i=>!isWater(i)).length<2?L('陸地或兩棲動物最少 2 隻','Needs 2 or more land or amphibious animals'):null;},
    keep:()=>!(S.level>0)?L('抽乾咗水區','The water area was drained'):null},
  {id:'month',n:['一個月老手','Old hand'],d:['任何瓶，最少 3 隻動物，30 日冇動物死。解鎖咗快轉之後，可以用時間旅行快轉。','Any jar with at least 3 animals and no deaths for 30 days. Once fast-forward is unlocked, time travel can speed it up.'],days:30,type:'survive',
    req:()=>aliveK('animal').length<3?L('最少要 3 隻動物','Needs at least 3 animals'):null,keep:()=>null},
];

/* ---- 成就 ---- */
const ACH=[
  {id:'baby',n:['第一隻 BB','First baby'],d:['有動物喺你個瓶生 BB。','An animal had young in your jar.']},
  {id:'week',n:['平安一星期','A calm week'],d:['一個瓶去到第 8 日，冇動物死過，仲有 2 隻以上動物。','A jar reached day 8 with 2+ animals and no deaths.']},
  {id:'month',n:['一個月','A whole month'],d:['一個瓶去到第 31 日，冇動物死過。','A jar reached day 31 with no deaths.']},
  {id:'saved',n:['救命恩人','Lifesaver'],d:['一鍵平衡保住咗原本會死嘅生物。','Auto-balance saved creatures that were going to die.']},
  {id:'builder',n:['砌缸師','Landscaper'],d:['用「自己砌缸」砌好一次地形。','Shaped your own terrain with Build.']},
  {id:'pov',n:['魚眼看世界','Through its eyes'],d:['用生物嘅第一視角睇過個瓶。','Saw the jar from a creature\'s point of view.']},
  {id:'share',n:['分享','Show and tell'],d:['整咗一條分享連結。','Made a share link.']},
  {id:'col10',n:['收藏家','Collector'],d:['收藏 10 種生物。','Collected 10 species.']},
  {id:'col30',n:['生態學家','Ecologist'],d:['收藏 30 種生物。','Collected 30 species.']},
  {id:'ch1',n:['挑戰者','Challenger'],d:['完成第一個挑戰。','Completed your first challenge.']},
  {id:'chAll',n:['全部過關','Clean sweep'],d:['完成全部挑戰。','Completed every challenge.']},
];
/* ---- 解鎖：完成挑戰、成就、收藏，開放更多生物、地區同玩法 ----
   已經喺瓶入面嘅嘢唔會被收走；分享連結同「分析水缸」唔受限制。 */
const colN=()=>Object.keys(PLAY.col).length,chN=()=>CHAL.filter(c=>PLAY.ach['ch_'+c.id]).length;
const UNLOCKS=[
  {id:'u_col5',t:['收藏 5 種生物','Collect 5 species'],prog:()=>`${Math.min(5,colN())}/5`,cond:()=>colN()>=5,types:['minnow','nerite','amano','lotus']},
  {id:'u_baby',t:['有動物生 BB','Have an animal give birth'],cond:()=>!!PLAY.ach.baby,types:['frog','bromeliad']},
  {id:'u_ch1',t:['完成 1 個挑戰','Complete 1 challenge'],prog:()=>`${Math.min(1,chN())}/1`,cond:()=>chN()>=1,types:['caulerpa','seahorse','moonjelly','gardeneel','hermit'],regions:['gbr','redsea','med'],features:['salt']},
  {id:'u_week',t:['平安一星期','A calm week'],cond:()=>!!PLAY.ach.week,types:['jelly','pleco','crab'],regions:['amazon','amazonriver','borneo','pantanal','mekong'],features:['ff']},
  {id:'u_col12',t:['收藏 12 種生物','Collect 12 species'],prog:()=>`${Math.min(12,colN())}/12`,cond:()=>colN()>=12,types:['gecko','newt'],regions:['cloudforest','tanganyika','baikal']},
  {id:'u_ch3',t:['完成 3 個挑戰','Complete 3 challenges'],prog:()=>`${Math.min(3,chN())}/3`,cond:()=>chN()>=3,types:['turtle','slider','leopard'],regions:['sahara']},
];
const FEAT_N={salt:['海水','Salt water'],ff:['時間旅行快轉','Time-travel fast-forward']};
/* 回傳鎖住佢嘅解鎖項目（冇鎖就 null）；kind = type／region／feature */
function lockOf(kind,key){const f=kind==='type'?'types':kind==='region'?'regions':'features';for(const u of UNLOCKS)if(u[f]&&u[f].includes(key)&&!u.cond())return u;return null;}
const lockText=u=>L('🔒 解鎖條件：','🔒 Unlock by: ')+N(u.t)+(u.prog?L(`（${u.prog()}）`,` (${u.prog()})`):'');
function presetLock(p){for(const [t] of p.items){const u=lockOf('type',t);if(u)return u;}return lockOf('region',p.region||'hk')||(p.water==='salt'?lockOf('feature','salt'):null);}
function rewardNames(u){return[...(u.types||[]).map(t=>N(CAT[t].name)),...(u.regions||[]).map(k=>N(REGIONS[k].n)),...(u.features||[]).map(k=>N(FEAT_N[k]))];}
function checkUnlocks(quiet){let got=[];for(const u of UNLOCKS)if(!PLAY.unl[u.id]&&u.cond()){PLAY.unl[u.id]=Date.now();got.push(u);}
  if(!got.length)return;savePlay();if(!quiet){toast(L('🔓 解鎖：','🔓 Unlocked: ')+got.flatMap(rewardNames).join(L('、',', ')));if(typeof renderCatalog==='function')renderCatalog();}}
checkUnlocks(true);
function unlock(id){
  if(PLAY.ach[id])return;PLAY.ach[id]=Date.now();savePlay();
  const a=ACH.find(x=>x.id===id),c=CHAL.find(x=>'ch_'+x.id===id);
  if(a)toast(L('🏆 解鎖成就：','🏆 Achievement: ')+N(a.n));
  const done=CHAL.filter(x=>PLAY.ach['ch_'+x.id]).length;if(c){if(done>=1)unlock('ch1');if(done>=CHAL.length)unlock('chAll');}
  checkUnlocks();if(curTab==='play')renderPlay();
}

/* ---- 收藏：一種生物喺瓶入面撐過一個午夜就收錄 ---- */
const COL_TYPES=()=>Object.keys(CAT).filter(t=>['plant','animal'].includes(CAT[t].kind));
function collectNow(){let n=0;for(const it of S.items){if(!it.alive||!['plant','animal'].includes(CAT[it.type].kind)||PLAY.col[it.type])continue;PLAY.col[it.type]=Date.now();n++;}
  if(!n)return;savePlay();const c=Object.keys(PLAY.col).length;if(c>=10)unlock('col10');if(c>=30)unlock('col30');checkUnlocks();if(curTab==='play')renderPlay();}

/* ---- 每秒檢查一次（main.js 叫） ---- */
function playTick(){
  const animals=aliveK('animal').length,dn=S.deathN||0;
  if(PLAY.lastDay!=null&&S.day!==PLAY.lastDay){collectNow();
    if(S.day>=8&&!dn&&animals>=2)unlock('week');if(S.day>=31&&!dn&&animals>=1)unlock('month');}
  PLAY.lastDay=S.day;
  if(!S.chal)return;const c=CHAL.find(x=>x.id===S.chal.id);if(!c){S.chal=null;return;}
  const why=(c.type==='survive'&&dn>S.chal.dead0?L('有動物死咗','An animal died'):null)||c.keep();
  const h=chalHours();
  if(why){S.chal=null;logEv(`挑戰「${c.n[0]}」失敗：${why}`,`Challenge "${c.n[1]}" failed: ${why}`,'bad');toast(L(`挑戰失敗：${why}`,`Challenge failed: ${why}`));save();if(curTab==='play')renderPlay();return;}
  if(c.type==='reach'&&c.goal()||c.type==='survive'&&h>=c.days*24){S.chal=null;logEv(`完成挑戰「${c.n[0]}」`,`Completed the challenge "${c.n[1]}"`,'good');toast(L(`🎉 完成挑戰：${c.n[0]}`,`🎉 Challenge complete: ${c.n[1]}`));unlock('ch_'+c.id);save();if(curTab==='play')renderPlay();return;}
  if(c.type==='reach'&&h>=c.days*24){S.chal=null;logEv(`挑戰「${c.n[0]}」失敗：夠鐘`,`Challenge "${c.n[1]}" failed: out of time`,'bad');toast(L('挑戰失敗：夠鐘','Challenge failed: out of time'));save();if(curTab==='play')renderPlay();return;}
  const pg=$('#chProg');if(pg){const f=Math.min(1,h/(c.days*24));pg.querySelector('b').style.width=(f*100)+'%';pg.querySelector('span').textContent=chalProgText(c,h);}
}
const chalProgText=(c,h)=>(c.prog?c.prog()+' · ':'')+L(`第 ${Math.floor(h/24)}／${c.days} 日`,`Day ${Math.floor(h/24)}/${c.days}`);
function startChal(id){const c=CHAL.find(x=>x.id===id),why=c.req();if(why){toast(L('未啱條件：','Not ready: ')+why);return;}
  S.chal={id,d0:S.day,h0:S.hour,dead0:S.deathN||0};logEv(`開始挑戰「${c.n[0]}」`,`Started the challenge "${c.n[1]}"`,'muted');save();renderPlay();toast(L(`開始挑戰：${c.n[0]}`,`Challenge started: ${c.n[1]}`));}

/* ---- 時間旅行：用試算預覽未來 30 日，唔會改個瓶；想真係去到嗰日先撳「快轉」 ---- */
function travelPreview(days=30){
  return seeded(BAL_SEED+S.day,()=>{const st=trialState(null);st.breed=S.breed;const rec=[],cnt=()=>{const m={};st.items.forEach(i=>{if(i.alive&&['plant','animal'].includes(CAT[i.type].kind))m[i.type]=(m[i.type]||0)+1;});return m;};
    rec.push({d:0,day:st.day,counts:cnt(),deaths:0,env:null});
    for(let d=1;d<=days;d++){for(let h=0;h<24;h++)step(st);const hs=st.hist.slice(-24),avg=k=>hs.reduce((a,r)=>a+(r[k]||0),0)/hs.length;
      rec.push({d,day:st.day,counts:cnt(),deaths:st.deaths.filter(x=>CAT[x.type].kind==='animal').length,
        env:{T:avg('T'),wo2:hs[0].hasW?Math.min(...hs.map(r=>r.wo2)):null,nh3:hs[0].hasW?Math.max(...hs.map(r=>r.wnh3)):null,hum:S.mode==='rain'?avg('hum'):null}});}
    rec.deathList=st.deaths.filter(x=>CAT[x.type].kind==='animal');return rec;});
}
function fastForward(days){
  if(S.real){toast(L('真實嘅瓶唔可以快轉','A real tank cannot be fast-forwarded'));return;}
  {const u=lockOf('feature','ff');if(u){toast(lockText(u));return;}}
  const t0=performance.now();for(let i=0;i<days*24;i++){step(S);if(i%24===23)playTick();}
  wasteFx.length=0;buildJar({keepCam:true,keepChem:true});PLAY.tt=null;renderAll();save();
  toast(L(`快轉咗 ${days} 日，而家第 ${S.day} 日`,`Fast-forwarded ${days} days; now day ${S.day}`));return performance.now()-t0;
}
function sparkSvg(vals,cls){const w=260,h=44,mx=Math.max(1,...vals),pts=vals.map((v,i)=>`${(i/(vals.length-1)*w).toFixed(1)},${(h-2-v/mx*(h-6)).toFixed(1)}`).join(' ');
  return`<svg class="spark ${cls||''}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}"/></svg>`;}
function travelHtml(){
  const R=PLAY.tt;if(!R)return`<p class="lede">${L('用而家個瓶預覽之後 30 日：每種生物數量、有冇生物死、水質點變。只係預覽，唔會改個瓶。','Preview the next 30 days of this jar: how many of each species, any deaths, and how the water changes. It is only a preview and changes nothing.')}</p><div class="ed-actions"><button class="btn primary" id="ttGo">${L('預覽未來 30 日','Preview the next 30 days')}</button></div>`;
  const animalsAt=x=>Object.entries(x.counts).filter(([t])=>CAT[t].kind==='animal').reduce((a,[,n])=>a+n,0);
  return`<div class="tt"><input type="range" id="ttSl" min="0" max="${R.length-1}" step="1" value="${PLAY.ttDay}" aria-label="${L('揀日子','Pick a day')}">
    <div class="tt-spark"><span class="lede">${L('動物數量','Animals')}</span>${sparkSvg(R.map(animalsAt))}</div>
    <div id="ttBody">${ttBody()}</div>
    <p class="lede">${L('預覽用典型天氣同固定隨機數；真係快轉時天氣會變，結果可能有少少出入。','The preview uses typical weather and a fixed random seed; a real fast-forward has changing weather, so results may differ a little.')}</p>
    <div class="ed-actions"><button class="btn" id="ttRe">${L('重新預覽','Preview again')}</button></div>
    ${S.real?`<p class="lede">${L('真實嘅瓶只可以預覽，唔可以快轉。','A real tank can be previewed but not fast-forwarded.')}</p>`:''}</div>`;
}
function ttBody(){
  const R=PLAY.tt,k=PLAY.ttDay,r=R[k],r0=R[0],types=[...new Set([...Object.keys(r0.counts),...Object.keys(r.counts)])].sort((a,b)=>(CAT[a].kind==='animal'?0:1)-(CAT[b].kind==='animal'?0:1));
  const deadSoFar=R.deathList.slice(0,r.deaths),dm={};deadSoFar.forEach(x=>{const n=N(CAT[x.type].name);dm[n]=(dm[n]||0)+1;});const e=r.env;
  return`<div class="tt-head"><b>${L(`第 ${r.day} 日`,`Day ${r.day}`)}</b><span class="lede">${k?L(`（${k} 日後）`,`(in ${k} day${k>1?'s':''})`):L('（今日）','(today)')}</span>${k&&!S.real&&lockOf('feature','ff')?`<span class="lede">${L('快轉','Fast-forward')} ${lockText(lockOf('feature','ff'))}</span>`:''}${k&&!S.real&&!lockOf('feature','ff')?`<button class="btn primary" id="ttFf">${L(`快轉到第 ${r.day} 日`,`Fast-forward to day ${r.day}`)}</button>`:''}</div>
    <div class="tt-grid">${types.map(t=>{const a=r0.counts[t]||0,b=r.counts[t]||0,dv=b-a;return`<div class="tt-sp"><span class="dot" style="background:${CAT[t].color}"></span><span>${N(CAT[t].name)}</span><b class="mono">${b}</b><em class="${dv>0?'up':dv<0?'down':''}">${dv>0?'+'+dv:dv<0?dv:''}</em></div>`;}).join('')}</div>
    <p class="${deadSoFar.length?'bad':'good'}">${deadSoFar.length?L('期間死咗：','Deaths so far: ')+Object.entries(dm).map(([n,c])=>c>1?`${n} ×${c}`:n).join(L('、',', ')):L('到呢日都冇動物死。','No animal deaths up to this day.')}</p>
    ${e?`<p class="lede">${L('平均溫度','Avg temp')} ${fx(e.T)}°C${e.wo2!=null?L(`；水中溶氧最低 ${fx(e.wo2)} mg/L；氨最高 ${fx(e.nh3,2)} mg/L`,`; water O₂ low ${fx(e.wo2)} mg/L; ammonia high ${fx(e.nh3,2)} mg/L`):''}${e.hum!=null?L(`；平均濕度 ${fx(e.hum,0)}%`,`; avg humidity ${fx(e.hum,0)}%`):''}</p>`:''}`;
}

function renderPlay(){
  const pe=$('#pane-play');if(!pe)return;const nCol=Object.keys(PLAY.col).length,all=COL_TYPES(),done=id=>!!PLAY.ach['ch_'+id];
  const cur=S.chal&&CHAL.find(x=>x.id===S.chal.id);
  pe.innerHTML=`${paneTagBar('play',PLAY_TAGS)}
   <section data-sec="unlock"><h3>${L('解鎖','Unlocks')} · ${UNLOCKS.filter(u=>u.cond()).length}/${UNLOCKS.length}</h3><p class="lede">${L('完成挑戰、成就同收藏，就會開放更多生物、地區同玩法。','Complete challenges, achievements and collections to open up more species, regions and features.')}</p>
    <div class="unls">${UNLOCKS.map(u=>{const ok=u.cond();return`<div class="unl${ok?' got':''}"><b>${ok?'🔓':'🔒'} ${N(u.t)}${!ok&&u.prog?` <span class="lede">${u.prog()}</span>`:''}</b><span>${rewardNames(u).join(L('、',', '))}</span></div>`;}).join('')}</div></section>
   <section data-sec="chal"><h3>${L('挑戰','Challenges')} · ${CHAL.filter(c=>done(c.id)).length}/${CHAL.length}</h3>
    ${cur?`<div class="chal on"><div class="bh"><b>${N(cur.n)}</b><button class="linkbtn" id="chQuit">${L('放棄','Give up')}</button></div><p>${N(cur.d)}</p>
      <div class="prog" id="chProg"><span>${chalProgText(cur,chalHours())}</span><i><b style="width:${Math.min(100,chalHours()/(cur.days*24)*100)}%"></b></i></div></div>`:''}
    <div class="chals">${CHAL.filter(c=>c!==cur).map(c=>{const why=cur?null:c.req();return`<div class="chal${done(c.id)?' done':''}"><div class="bh"><b>${done(c.id)?'✓ ':''}${N(c.n)}</b><span class="lede">${L(`${c.days} 日`,`${c.days} days`)}</span></div><p>${N(c.d)}</p>
      ${cur?'':`<div class="ed-actions"><button class="btn${why?'':' primary'}" data-chal="${c.id}">${done(c.id)?L('再玩一次','Play again'):L('開始','Start')}</button>${why?`<span class="lede">${L('未啱：','Not yet: ')}${why}</span>`:''}</div>`}</div>`;}).join('')}</div>
    ${cur?`<p class="lede">${L('同一時間每個瓶只可以做一個挑戰。','Each jar can run one challenge at a time.')}</p>`:''}</section>
   <section data-sec="ach"><h3>${L('成就','Achievements')} · ${ACH.filter(a=>PLAY.ach[a.id]).length}/${ACH.length}</h3>
    <div class="achs">${ACH.map(a=>`<div class="ach${PLAY.ach[a.id]?' got':''}"><b>${PLAY.ach[a.id]?'🏆':'🔒'} ${N(a.n)}</b><span>${N(a.d)}</span></div>`).join('')}</div></section>
   <section data-sec="col"><h3>${L('收藏','Collection')} · ${nCol}/${all.length}</h3><p class="lede">${L('一種生物喺你個瓶撐過一個午夜，就會收錄。','A species is collected once it makes it through a night in one of your jars.')}</p>
    <div class="cols">${all.map(t=>{const got=!!PLAY.col[t],c=CAT[t];return`<div class="colc${got?' got':''}" title="${esc(N(c.name))}"><span class="dot" style="background:${got?c.color:'var(--line)'}"></span><span>${got?esc(N(c.name)):'？？？'}</span></div>`;}).join('')}</div></section>
   <section data-sec="travel"><h3>${L('時間旅行','Time travel')}</h3><div id="ttBox">${travelHtml()}</div></section>`;
  bindPaneTags('play',pe);
  pe.querySelectorAll('[data-chal]').forEach(b=>b.onclick=()=>startChal(b.dataset.chal));
  const q=$('#chQuit');if(q)q.onclick=()=>{const c=CHAL.find(x=>x.id===S.chal.id);S.chal=null;logEv(`放棄挑戰「${c.n[0]}」`,`Gave up the challenge "${c.n[1]}"`,'muted');save();renderPlay();};
  bindTravel();
}
function bindTravel(){
  const box=$('#ttBox');if(!box)return;
  const run=()=>{toast(L('計緊未來 30 日…','Working out the next 30 days…'));setTimeout(()=>{PLAY.tt=travelPreview(30);PLAY.ttDay=30;box.innerHTML=travelHtml();bindTravel();},30);};
  const go=$('#ttGo'),rr=$('#ttRe'),sl=$('#ttSl');if(go)go.onclick=run;if(rr)rr.onclick=run;
  const bindFf=()=>{const ff=$('#ttFf');if(ff)ff.onclick=()=>{if(S.build){toast(L('先完成砌缸','Finish building first'));return;}const d=PLAY.ttDay;toast(L('快轉緊…','Fast-forwarding…'));setTimeout(()=>fastForward(d),30);};};
  if(sl)sl.oninput=()=>{PLAY.ttDay=+sl.value;$('#ttBody').innerHTML=ttBody();bindFf();};
  bindFf();
}
