/* ================= 模式切換（保留環境） ================= */
const modeKey=()=>S.mode==='aqua'?'aqua':(S.level>0?'palu':'rain');
let modeArm=null,modeArmT=0;
function armMode(t,msg){if(modeArm===t)return true;modeArm=t;clearTimeout(modeArmT);modeArmT=setTimeout(()=>modeArm=null,3500);toast(msg);return false;}
function setMode(t){
  const cur=modeKey();if(t===cur)return;
  const life=S.items.filter(i=>i.alive&&['plant','animal'].includes(CAT[i.type].kind));
  if(t==='aqua'){
    const land=life.filter(i=>!isWater(i));
    if(land.length&&!armMode(t,L(`再撳一次確認：${land.length} 個陸地生物會浸死`,`Tap again: ${land.length} land creature${land.length>1?'s':''} will drown`)))return;
    const salt=S.water==='salt';S.mode='aqua';if(!S.filled&&life.some(isWater))S.filled=true;if(S.level>0)S.filled=true;
    if(salt)S.water='salt';
  } else {
    const wasAqua=S.mode==='aqua',wl=life.filter(isWater);
    if(t==='rain'&&wl.length&&!armMode(t,L(`再撳一次確認：${wl.length} 個水中生物會冇水`,`Tap again: ${wl.length} water creature${wl.length>1?'s':''} will be left dry`)))return;
    if(wasAqua){const a=S.V*.75;S.c.aO2=21*13.3*a;S.c.aCO2=600*a*.0018;S.c.hum=75;S.c.waste=S.c.waste||0;}
    S.mode='rain';
    if(t==='palu'&&!(S.level>0))S.level=wasAqua&&S.filled?8:5;
    if(t==='rain')S.level=0;
  }
  modeArm=null;buildJar({keepCam:true});renderAll();save();
  toast(L('轉咗做','Switched to ')+N({aqua:['水族','aquatic'],rain:['雨林','rainforest'],palu:['水陸共生','paludarium']}[t])+L('，保留晒原有嘅嘢',', keeping everything'));
}
function renderModeSeg(){$('#modeSeg').innerHTML=[['aqua',['水族','Aquatic']],['rain',['雨林','Rainforest']],['palu',['水陸','Paludarium']]].map(([k,l])=>`<button aria-pressed="${modeKey()===k}" data-m="${k}">${N(l)}</button>`).join('');
  $('#modeSeg').querySelectorAll('button').forEach(b=>b.onclick=()=>setMode(b.dataset.m));}

/* ================= 疊加清單（左：平衡；右：生物） ================= */
let ovOpen={L:innerWidth>=920,R:innerWidth>=920};
try{const o=JSON.parse(localStorage.getItem('ecojar.ov')||'null');if(o)ovOpen=o;}catch(e){}
function renderOvToggles(){
  const l=$('#tglL'),r=$('#tglR');l.textContent=L('平衡','Balance');r.textContent=L('清單','List');
  l.setAttribute('aria-pressed',ovOpen.L);r.setAttribute('aria-pressed',ovOpen.R);
}
$('#tglL').onclick=()=>{ovOpen.L=!ovOpen.L;try{localStorage.setItem('ecojar.ov',JSON.stringify(ovOpen));}catch(e){}renderOv();};
$('#tglR').onclick=()=>{ovOpen.R=!ovOpen.R;try{localStorage.setItem('ecojar.ov',JSON.stringify(ovOpen));}catch(e){}renderOv();};
function renderOv(){renderOvToggles();renderOvL();renderOvR();}
function renderOvL(){
  const el=$('#ovL');el.hidden=!ovOpen.L;if(!ovOpen.L)return;
  if(S.mode==='aqua'&&!wLOf(S)){el.hidden=true;return;}
  const items=budgets();
  if(!items.length){el.hidden=true;return;}
  el.innerHTML=`<h4>${L('平衡','Balance')}</h4>`+(items.length?items.map((b,i)=>`<button class="ovrow" data-bi="${i}"><i class="${b.cls==='good'?'':b.cls}"></i><span>${b.title}</span><em>${b.right}</em></button>`).join(''):`<p class="ovnote">${L('未有生物','Nothing living')}</p>`);
  el.querySelectorAll('[data-bi]').forEach(b=>b.onclick=()=>{showTab('bal');const t=$('#bud-'+b.dataset.bi);if(t){t.scrollIntoView({behavior:'smooth',block:'center'});t.classList.remove('flash');void t.offsetWidth;t.classList.add('flash');}});
}
function renderOvR(){
  const el=$('#ovR');el.hidden=!ovOpen.R;if(!ovOpen.R)return;
  const its=S.items.filter(i=>['plant','animal'].includes(CAT[i.type].kind)).sort((a,b)=>(CAT[a.type].kind==='animal'?0:1)-(CAT[b.type].kind==='animal'?0:1)||a.uid-b.uid);
  el.innerHTML=`<h4>${L('瓶內','In jar')} · ${its.filter(i=>i.alive).length}</h4>`+(its.length?its.map(it=>{const [t,c]=statusOf(it);
    return`<button class="ovrow${S.sel===it?' on':''}" data-u="${it.uid}" title="${esc(t)}"><i class="${c}"></i><span>${esc(label(it))}</span><em>${it.alive?Math.round(it.health*100)+'%':'✕'}</em><span class="mini"><b style="width:${it.health*100}%;background:var(--${c==='bad'?'bad':c==='warn'?'warn':'good'})"></b></span></button>`;}).join(''):`<p class="ovnote">${L('空嘅','Empty')}</p>`);
  el.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{const it=S.items.find(i=>i.uid==b.dataset.u);if(it)select(it,null,b);});
}
function fitOverlays(){const m=$('#meters');if(m)$('#stage').style.setProperty('--mh',(m.offsetHeight+20)+'px');}

/* ================= 點選位置嘅彈出選單 ================= */
let popIt=null;
function select(it,ev,anchor){
  S.sel=it;
  if(curTab==='jar'){renderJarList();renderEditor();if(!ev&&!anchor){const e=$('#editor');if(e)e.scrollIntoView({block:'nearest',behavior:'smooth'});}}
  if(ev||anchor)openPop(it,ev,anchor);
  renderOvR();
}
function openPop(it,ev,anchor){
  const pop=$('#pop'),st=$('#stage').getBoundingClientRect();let x,y;
  if(anchor){const a=anchor.getBoundingClientRect();x=a.left-st.left-240;y=a.top-st.top-10;}
  else{x=ev.clientX-st.left+14;y=ev.clientY-st.top-20;}
  popIt=it;pop.hidden=false;renderPop();
  const w=pop.offsetWidth,h=pop.offsetHeight;
  pop.style.left=clamp(x,8,st.width-w-8)+'px';pop.style.top=clamp(y,46,Math.max(46,st.height-h-8))+'px';
}
function closePop(){$('#pop').hidden=true;popIt=null;}
function popDyn(it){
  const c=CAT[it.type],k=c.kind,[t,cls]=statusOf(it),deco=['sub','decor'].includes(k),rows=[];
  if(!deco)rows.push([L('健康','Health'),Math.round(it.health*100)+'%']);
  if(k==='animal'&&it.alive){rows.push([L('飽肚','Fullness'),Math.round(it.satiety*100)+'%']);rows.push([L('下次去廁所','Next poop'),L(`${Math.max(0,it.params.wasteEvery-it.wt)} 小時後`,`in ${Math.max(0,it.params.wasteEvery-it.wt)} h`)]);}
  if(k==='plant'&&it.alive)rows.push([L('而家產氧','O₂ now'),fx(it.lastProd,2)+' mg/h']);
  return`<div class="lede" style="margin-bottom:6px">${esc(N(c.name))} · <span style="color:var(--${cls||'good'})">${esc(t)}</span></div>
    ${rows.length?`<div class="kv2">${rows.map(([a,b])=>`<span>${a}</span><b class="mono">${b}</b>`).join('')}</div>`:''}
    ${!deco?`<div class="hbar ${it.health<.35?'bad':it.health<.7?'warn':''}" style="margin-top:6px"><span style="width:${it.health*100}%"></span></div>`:''}`;
}
function updatePop(){const it=popIt;if(!it||$('#pop').hidden)return;if(!S.items.includes(it)){closePop();return;}const d=$('#popDyn');if(d)d.innerHTML=popDyn(it);}
function renderPop(){
  const it=popIt,pop=$('#pop');if(!it||pop.hidden)return;
  if(!S.items.includes(it)){closePop();return;}
  const c=CAT[it.type],k=c.kind,[t,cls]=statusOf(it),deco=['sub','decor'].includes(k);
  const rows=[];
  if(false)rows.push([L('健康','Health'),Math.round(it.health*100)+'%']);
  if(k==='animal'&&it.alive){rows.push([L('飽肚','Fullness'),Math.round(it.satiety*100)+'%']);rows.push([L('下次去廁所','Next poop'),L(`${Math.max(0,it.params.wasteEvery-it.wt)} 小時後`,`in ${Math.max(0,it.params.wasteEvery-it.wt)} h`)]);}
  if(k==='plant'&&it.alive)rows.push([L('而家產氧','O₂ now'),fx(it.lastProd,2)+' mg/h']);
  pop.innerHTML=`<div class="ed-head"><span class="dot" style="background:${c.color}"></span><b style="margin-right:auto">${esc(label(it))}</b><button class="x" id="popX" aria-label="${L('關閉','Close')}">×</button></div>
    <div id="popDyn">${popDyn(it)}</div>
    ${k==='decor'&&it.alive?`<div class="rotpad"><span>${L('左右轉','Turn')}</span><button data-r="rot,-15">⟲</button><button data-r="rot,15">⟳</button>
      <span>${L('前後傾','Tilt F/B')}</span><button data-r="rotX,-15">▲</button><button data-r="rotX,15">▼</button>
      <span>${L('左右傾','Tilt L/R')}</span><button data-r="rotZ,15">◀</button><button data-r="rotZ,-15">▶</button>
      <button class="rotreset" data-r="reset">${L('擺返正','Level it')}</button></div>`:''}
    <div class="ed-actions"><button class="btn primary" id="popMore">${L('詳細設定','Settings')}</button><button class="btn danger" id="popDel">${it.alive?L('移走','Remove'):L('清走','Clear')}</button></div>`;
  $('#popX').onclick=closePop;
  pop.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{const v=b.dataset.r;
    if(v==='reset'){it.params.rotX=0;it.params.rotZ=0;}
    else{const [key,dv]=v.split(','),p=it.params;let n=(p[key]||0)+ +dv;if(key==='rot')n=(n%360+360)%360;else{if(n>180)n-=360;if(n<-180)n+=360;}p[key]=n;}
    placeItem(it);save();if(S.sel===it&&$('#editor'))renderEditor();});
  $('#popMore').onclick=()=>{closePop();showTab('jar');renderJarList();renderEditor();const e=$('#editor');if(e)e.scrollIntoView({behavior:'smooth',block:'nearest'});if(innerWidth<920)$('.panel').scrollIntoView({behavior:'smooth',block:'start'});};
  $('#popDel').onclick=()=>{closePop();removeItem(it);};
}

/* ================= 問題清單同快速處理 ================= */
const FIX={
  fill:[['注水','Fill'],()=>fillWater(true)],
  water:[['加水區','Add water'],()=>setLevel(Math.max(5,S.level))],
  pump:[['開氧氣泵','Air pump on'],()=>{S.pump=true;}],
  open:[['打開瓶口','Open the lid'],()=>{S.sealed=false;}],
  seal:[['密封保濕','Seal to hold moisture'],()=>{S.sealed=true;}],
  wc:[['即刻換 30% 水','Change 30% now'],()=>{const c=S.c;c.NH3*=.7;c.NO3*=.7;c.detritus*=.85;c.algae*=.9;logEv('即刻換咗 30% 水','Changed 30% of the water','muted');}],
  feedLess:[['每日少餵 1 份','Feed 1 less a day'],()=>{S.feed=Math.max(0,S.feed-1);}],
  feedMore:[['每日多餵 0.5 份','Feed 0.5 more a day'],()=>{S.feed+=.5;}],
  feedNow:[['即刻餵食','Feed now'],()=>$('#feedBtn').click()],
  lightLess:[['光照減 2 小時','2 h less light'],()=>{S.light=Math.max(4,S.light-2);}],
  lightMore:[['光照加 2 小時','2 h more light'],()=>{S.light=Math.min(18,S.light+2);}],
  heat:[['開加熱','Heating on'],()=>{if(wLOf(S)>0)S.heater=true;if(S.mode==='rain')S.heat=true;}],
  cool:[['關加熱、開蓋','Heating off, lid open'],()=>{S.heater=false;S.heat=false;S.sealed=false;}],
  mistMore:[['多啲噴霧','Mist more'],()=>{S.mist=Math.min(6,S.mist+1);}],
  mistLess:[['少啲噴霧','Mist less'],()=>{S.mist=Math.max(0,S.mist-1);}],
  flowOff:[['關泵同過濾','Pump & filter off'],()=>{S.pump=false;S.filter=false;}],
  nitri:[['加硝化菌','Add bacteria'],()=>addFromCatalog('nitri')],
  spring:[['加跳蟲','Add springtails'],()=>addFromCatalog('springtail')],
  isopod:[['加鼠婦','Add isopods'],()=>addFromCatalog('isopod')],
  sand:[['鋪細沙','Add sand'],()=>addFromCatalog('sand')],
  stone:[['加石頭','Add stones'],()=>addFromCatalog('stone')],
  soil:[['鋪泥土','Add soil'],()=>addFromCatalog('soil')],
  balance:[['一鍵平衡','Auto-balance'],()=>$('#balBtn').click()]
};
const METER_FIX={wo2:v=>['pump','open','balance'],wnh3:v=>['wc','feedLess','nitri'],no3:v=>['wc'],algae:v=>['lightLess','wc'],wco2:v=>['open'],food:v=>['feedLess','wc'],
  ao2:v=>['open'],co2:v=>['open'],waste:v=>['isopod','feedLess'],mould:v=>['spring','open'],
  hum:v=>{const r=rangeOf('hum');return r&&v<r[0]?['mistMore','seal']:['open','mistLess'];},T:v=>{const r=rangeOf('t');return r&&v<r[0]?['heat']:['cool'];}};
const STRESS_FIX={noO2:['pump','open'],nh3:['wc','feedLess','nitri'],cold:['heat'],hot:['cool'],hungry:['feedNow','feedMore'],dry:['mistMore','seal'],wet:['open','mistLess'],
  co2:['open'],mould:['spring','open'],flow:['flowOff'],noSand:['sand'],noMud:['soil'],noRock:['stone'],noSoil:['soil'],lowLight:['lightMore'],hiN:['wc'],lowN:['feedMore']};
function liveIssues(){
  const out=[],aq=S.mode==='aqua',wL=wLOf(S);
  if(aq&&!wL)out.push({cls:'warn',t:L('未注水','No water'),d:L('水中生物冇水會死。','Water life dies without water.'),fixes:['fill']});
  meterList().forEach(m=>{const st=m[5](m[1]);if(!st)return;out.push({cls:st,t:`${m[0]} ${fx(m[1],m[3])} ${m[2]}`,d:N(METER_TIP[m[6]]||['',''])||'',fixes:(METER_FIX[m[6]]||(()=>[]))(m[1])});});
  const g={};S.items.forEach(i=>{if(i.alive&&i.stress&&['animal','plant'].includes(CAT[i.type].kind))(g[i.stress]=g[i.stress]||[]).push(i);});
  Object.entries(g).sort((a,b)=>b[1].length-a[1].length).forEach(([code,list])=>{
    let fixes=STRESS_FIX[code]||[];if(code==='noWater')fixes=aq?['fill']:['water'];
    out.push({cls:list.some(i=>i.health<.4)?'bad':'warn',t:L(`${list.length} 個${SS(code)}`,`${list.length} × ${SS(code)}`),d:list.slice(0,5).map(label).join(L('、',', '))+(list.length>5?'…':''),
      fixes,items:list,extra:code==='needSalt'||code==='needFresh'?L('水質唔啱：喺「環境」轉水質，或者移走佢哋。','Wrong water type: change it in Setup, or remove them.'):''});});
  return out.sort((a,b)=>(a.cls==='bad'?0:1)-(b.cls==='bad'?0:1));
}
const METER_TIP={wo2:['溶氧低過 3 mg/L 魚會辛苦。','Below 3 mg/L fish struggle.'],wnh3:['氨由排泄物同殘渣產生，有毒。','Ammonia comes from waste and is toxic.'],no3:['長期太高會令藻類爆發。','High for long, it fuels algae.'],
  algae:['藻類太多，水會變綠。','Too much algae turns the water green.'],wco2:['水中 CO₂ 太少，水草難光合。','Too little CO₂ for plants to photosynthesise.'],food:['剩食太多會腐爛變氨。','Leftovers rot into ammonia.'],
  ao2:['空氣入面氧氣唔夠。','The air is short of oxygen.'],co2:['空氣唔流通，二氧化碳累積。','Stale air is building up CO₂.'],waste:['排泄物堆積。','Droppings are piling up.'],mould:['太濕又多排泄物，開始生霉。','Damp and waste are breeding mould.'],
  hum:['濕度唔啱瓶入面嘅動物。','Humidity does not suit the animals.'],T:['溫度唔啱瓶入面嘅動物。','Temperature does not suit the animals.']};
let issueOpen=false;
$('#status').onclick=()=>{issueOpen=!issueOpen;renderIssuePop();};
function renderIssuePop(){
  const pop=$('#issuePop');if(!issueOpen){pop.hidden=true;return;}
  const list=liveIssues();pop.hidden=false;
  pop.innerHTML=`<div class="ed-head"><b style="margin-right:auto">${list.length?L(`${list.length} 個問題`,`${list.length} issue${list.length>1?'s':''}`):L('冇問題','All good')}</b><button class="x" id="issX" aria-label="${L('關閉','Close')}">×</button></div>
    ${S.real?`<p class="lede">${L('呢個係真實嘅瓶：以下只係建議，你撳先會改模擬。','This is a real tank: these are suggestions and only change the simulation if you tap them.')}</p>`:''}
    ${list.length?list.map((x,i)=>`<div class="issue ${x.cls}"><div class="bh"><b>${esc(x.t)}</b>${x.items?`<button class="linkbtn" data-see="${i}">${L('去睇','Show')}</button>`:`<button class="linkbtn" data-bal="1">${L('分析','Details')}</button>`}</div>
      ${x.d?`<p>${esc(x.d)}</p>`:''}${x.extra?`<p>${esc(x.extra)}</p>`:''}${x.fixes.length?`<div class="fixes">${x.fixes.filter(f=>FIX[f]).map(f=>`<button data-fix="${f}">${N(FIX[f][0])}</button>`).join('')}</div>`:''}</div>`).join('')
      :`<p class="lede">${L('而家冇生物受壓，讀數都正常。','Nothing is stressed and all readings are normal.')}</p>`}`;
  $('#issX').onclick=()=>{issueOpen=false;renderIssuePop();};
  pop.querySelectorAll('[data-fix]').forEach(b=>b.onclick=()=>{const f=FIX[b.dataset.fix];f[1]();toast(L('已處理：','Done: ')+N(f[0]));renderAll();save();renderIssuePop();});
  pop.querySelectorAll('[data-see]').forEach(b=>b.onclick=()=>{const x=list[+b.dataset.see],it=x.items[0];issueOpen=false;pop.hidden=true;
    const r=$('#stage').getBoundingClientRect(),v=it.m?it.m.p.clone():new THREE.Vector3();if(it.g)v.copy(it.g.position);v.project(camera);
    select(it,{clientX:r.left+(v.x+1)/2*r.width,clientY:r.top+(1-v.y)/2*r.height});});
  pop.querySelectorAll('[data-bal]').forEach(b=>b.onclick=()=>{issueOpen=false;pop.hidden=true;showTab('bal');});
}

/* ================= 真實嘅瓶：建議 & 副本試 ================= */
function reportHtml(){
  const R=S.report;if(!R)return'';
  const li=a=>a&&a.length?`<ul>${a.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
  const sec=(t,a)=>a&&a.length?`<p style="margin:8px 0 0"><b>${t}</b></p>${li(a)}`:'';
  const life=R.beforeDead&&R.beforeDead.length?`<p style="margin:6px 0 0">${L('原本會死：','Were going to die: ')}${esc(R.beforeDead.join(L('、',', ')))}</p>
      <p style="margin:2px 0 0;color:var(--${R.afterDead.length?'bad':'good'})">${R.afterDead.length?L('仍然保唔住：','Still at risk: ')+esc(R.afterDead.join(L('、',', '))):L(R.suggest?'跟建議做，全部保得住。':'而家全部保得住。',R.suggest?'Following these suggestions saves them all.':'All of them are now safe.')}</p>`
    :`<p style="margin:6px 0 0;color:var(--good)">${L('模擬未來 5 日，現有生物都冇事。','Simulated 5 days: every current creature is safe.')}</p>`;
  const none=!(R.changes&&R.changes.length);
  const n=(R.changes||[]).length,sumLine=`${R.suggest?L('改善建議','Suggestions'):L('一鍵平衡結果','Auto-balance result')} · ${n?L(`${n} 項`,`${n} item${n>1?'s':''}`):L('冇需要改','nothing to change')}${R.afterDead&&R.afterDead.length?L('，仍有生物有危險',', some still at risk'):R.beforeDead&&R.beforeDead.length?L('，已保住生物',', creatures saved'):''}`;
  return`<details class="report" id="repBox" ${S.reportOpen!==false?'open':''}><summary><span>${sumLine}</span><button class="x" id="repX" aria-label="${L('收起結果','Dismiss result')}">×</button></summary><b>${R.suggest?L('改善建議（冇改任何嘢）','Suggestions (nothing changed)'):L('一鍵平衡結果','Auto-balance result')}</b>
    <p class="lede" style="margin:2px 0 0">${L('次序：先保住現有生物，再加水草同微生物，唔夠先調環境同水質。唔會移走任何生物。','Order: protect current creatures first, then add plants and microbes, then adjust the environment and water. No creature is removed.')}</p>
    ${life}
    ${none?`<p class="lede" style="margin-top:6px">${L('而家嘅設定已經係最平衡。','The current setup is already the most balanced.')}</p>`:''}
    ${sec(L('保命必需','Essentials'),R.pre)}${sec(L('水草同微生物','Plants & microbes'),R.plantCh)}${sec(L('環境同水質','Environment & water'),R.envCh)}
    ${R.afterDead&&R.afterDead.length?`<p class="lede" style="margin-top:6px">${L('有啲生物同呢個瓶嘅條件唔夾（例如溫度、水質），可以考慮搬去另一個瓶。','Some creatures do not suit this jar (temperature or water type, for example); consider moving them to another jar.')}</p>`:''}
    ${R.suggest&&!none?`<p class="lede" style="margin-top:6px">${L('呢個係真實嘅瓶，所以只係列出建議。','This is a real tank, so these are only suggestions.')}</p><div class="ed-actions" style="margin-top:6px"><button class="btn primary" id="tryCopy">${L('複製去另一個瓶試','Try in another jar')}</button></div>`:''}</details>`;
}
function bindReport(){const b=$('#tryCopy');if(b)b.onclick=copyToTrial;
  const d=$('#repBox');if(d)d.ontoggle=()=>{S.reportOpen=d.open;};
  const x=$('#repX');if(x)x.onclick=e=>{e.preventDefault();e.stopPropagation();S.report=null;renderBalance();};}
function copyToTrial(){
  const snap=snapshot();let slot=S.jars.findIndex((j,i)=>i!==S.cur&&!j);if(slot<0)slot=(S.cur+1)%3;
  const name=(S.jarName||jarNames()[S.cur])+L('（試）',' (trial)');
  S.jars[S.cur]=snap;S.cur=slot;restoreSnap(Object.assign({},snap,{name,real:false}));S.report=null;
  renderAll();save();toast(L(`複製咗去「${name}」，而家套用建議`,`Copied to "${name}" and applying the suggestions`));setTimeout(autoBalance,60);
}
