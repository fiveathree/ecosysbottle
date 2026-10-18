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
  const l=$('#tglL'),r=$('#tglR');l.textContent=L('平衡分析','Balance');r.textContent=L('清單','List');
  l.setAttribute('aria-pressed',ovOpen.L);r.setAttribute('aria-pressed',ovOpen.R);
  const eL=$('#edgeL'),eR=$('#edgeR');eL.textContent=ovOpen.L?'‹':'›';eR.textContent=ovOpen.R?'›':'‹';
  eL.classList.toggle('open',!!ovOpen.L);eR.classList.toggle('open',!!ovOpen.R);
  eL.setAttribute('aria-label',ovOpen.L?L('收埋平衡分析','Hide balance'):L('打開平衡分析','Show balance'));eR.setAttribute('aria-label',ovOpen.R?L('收埋清單','Hide list'):L('打開清單','Show list'));
  eL.setAttribute('aria-expanded',!!ovOpen.L);eR.setAttribute('aria-expanded',!!ovOpen.R);
}
$('#tglL').onclick=()=>{ovOpen.L=!ovOpen.L;try{localStorage.setItem('ecojar.ov',JSON.stringify(ovOpen));}catch(e){}renderOv();if(ovOpen.L)renderBalance();};
$('#edgeL').onclick=()=>$('#tglL').click();$('#edgeR').onclick=()=>$('#tglR').click();
$('#tglR').onclick=()=>{ovOpen.R=!ovOpen.R;try{localStorage.setItem('ecojar.ov',JSON.stringify(ovOpen));}catch(e){}renderOv();};
/* 跟住生物時嘅鏡頭列 */
function renderCamBar(){const b=$('#camBar'),it=camF.it;b.hidden=!camF.mode;if(!camF.mode)return;
  b.innerHTML=`<span class="dot" style="background:${CAT[it.type].color}"></span><b>${esc(label(it))}</b><div class="seg" role="group" aria-label="${L('鏡頭','Camera')}"><button aria-pressed="${camF.mode==='follow'}" data-cm="follow">${L('以佢為中心','Centred')}</button><button aria-pressed="${camF.mode==='pov'}" data-cm="pov">${L('第一視角','Its view')}</button></div><button class="x" id="camX" aria-label="${L('停止跟住','Stop following')}">×</button>`;
  b.querySelectorAll('[data-cm]').forEach(x=>x.onclick=()=>camFollow(camF.it,x.dataset.cm));$('#camX').onclick=camStop;}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&camF.mode&&!document.querySelector('dialog[open]'))camStop();});
/* 日夜畫面鎖定：只改 3D 畫面嘅光暗，模擬入面嘅光照同光合作用照舊 */
let viewLight='auto';try{const v=localStorage.getItem('ecojar.dn');if(v==='day'||v==='night')viewLight=v;}catch(e){}
const DN={auto:['☀︎☾ 日夜自動','☀︎☾ Auto day/night'],day:['☀︎ 一直日頭','☀︎ Always day'],night:['☾ 一直夜晚','☾ Always night']};
function renderDn(){const b=$('#dnBtn');b.textContent=N(DN[viewLight]);b.setAttribute('aria-pressed',viewLight!=='auto');b.title=L('只改畫面，唔影響模擬嘅光照同光合作用','Only changes the view; simulated light and photosynthesis are unchanged');}
$('#dnBtn').onclick=()=>{viewLight={auto:'day',day:'night',night:'auto'}[viewLight];try{localStorage.setItem('ecojar.dn',viewLight);}catch(e){}renderDn();
  toast(viewLight==='auto'?L('畫面跟返模擬時間轉日夜','The view follows the simulated time again'):L('只係鎖住畫面；模擬照樣有日夜','Only the view is locked; the simulation still has day and night'));};
/* 頂部「預設組合」：揀一個取代而家呢個瓶 */
$('#presetBtn').onclick=()=>{const ps=PRESETS[S.mode],real=S.real;
  const d=openDlg(`<h4>${L('預設組合','Presets')} · ${N({aqua:['水族','Aquatic'],rain:['雨林／水陸','Rainforest / paludarium']}[S.mode])}</h4>
    <p class="lede">${real?L('呢個係真實嘅瓶，唔可以用預設取代。請先轉去另一個瓶。','This is a real tank and cannot be replaced by a preset. Switch to another jar first.'):L('揀一個會取代而家呢個瓶入面所有嘢。想保留而家個瓶，就先轉去一個空瓶。','Picking one replaces everything in this jar. To keep this jar, switch to an empty one first.')}</p>
    <div class="plist">${Object.entries(ps).map(([k,p])=>`<button class="preset" data-pp="${k}" ${real?'disabled':''}><b>${N(p.n)}</b><span>${N(p.d)}</span></button>`).join('')}</div>
    <div class="acts"><button class="btn" data-close>${L('取消','Cancel')}</button></div>`);
  d.querySelectorAll('[data-pp]').forEach(b=>b.onclick=()=>{d.close();loadPreset(b.dataset.pp);});};
function renderOv(){renderCamBar();renderDn();renderOvToggles();renderOvL();renderOvR();fitOverlays();}
function renderOvL(){
  const el=$('#ovL');el.hidden=!ovOpen.L;$('#ovLT').textContent=L('平衡分析','Balance');
  $('#ovLX').setAttribute('aria-label',L('收起平衡分析','Close balance'));
}
function openBal(){ovOpen.L=true;try{localStorage.setItem('ecojar.ov',JSON.stringify(ovOpen));}catch(e){}renderOv();renderBalance();$('#ovL').scrollTop=0;}
$('#ovLX').onclick=()=>{ovOpen.L=false;try{localStorage.setItem('ecojar.ov',JSON.stringify(ovOpen));}catch(e){}renderOv();};
function renderOvR(){
  const el=$('#ovR');el.hidden=!ovOpen.R;if(!ovOpen.R)return;
  const its=S.items.filter(i=>['plant','animal'].includes(CAT[i.type].kind)).sort((a,b)=>(CAT[a.type].kind==='animal'?0:1)-(CAT[b.type].kind==='animal'?0:1)||a.uid-b.uid);
  el.innerHTML=`<h4>${L('瓶內','In jar')} · ${its.filter(i=>i.alive).length}</h4>`+(its.length?its.map(it=>{const [t,c]=statusOf(it);
    return`<button class="ovrow${S.sel===it?' on':''}" data-u="${it.uid}" title="${esc(t)}"><i class="${c}"></i><span>${esc(label(it))}</span><em>${it.alive?Math.round(it.health*100)+'%':'✕'}</em><span class="mini"><b style="width:${it.health*100}%;background:var(--${c==='bad'?'bad':c==='warn'?'warn':'good'})"></b></span></button>`;}).join(''):`<p class="ovnote">${L('空嘅','Empty')}</p>`);
  el.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{const it=S.items.find(i=>i.uid==b.dataset.u);if(it)select(it,null,b);});
}
function fitOverlays(){const m=$('#meters'),st=$('#stage');if(m)st.style.setProperty('--mh',(m.offsetHeight+20)+'px');
  for(const s of ['L','R']){const o=$('#ov'+s);if(!o.hidden)st.style.setProperty('--ov'+s+'w',o.offsetWidth+'px');}}

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
  popIt=it;pop.hidden=false;renderPop();
  const w=pop.offsetWidth,h=pop.offsetHeight;
  if(anchor){const a=anchor.getBoundingClientRect();x=a.left-st.left-w-10;y=a.top-st.top-10;}
  else{
    // 擺喺物件側邊，唔遮住佢：用物件喺畫面上嘅範圍
    let cx=ev.clientX-st.left,cy=ev.clientY-st.top,rx=40,ry=40;
    if(it.g){const b=new THREE.Box3().setFromObject(it.g),pts=[];if(!b.isEmpty()){for(const X of [b.min.x,b.max.x])for(const Y of [b.min.y,b.max.y])for(const Z of [b.min.z,b.max.z]){const v=new THREE.Vector3(X,Y,Z).project(camera);pts.push([(v.x+1)/2*st.width,(1-v.y)/2*st.height]);}
      const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);cx=(Math.min(...xs)+Math.max(...xs))/2;cy=(Math.min(...ys)+Math.max(...ys))/2;rx=(Math.max(...xs)-Math.min(...xs))/2;ry=(Math.max(...ys)-Math.min(...ys))/2;}}
    const right=cx+rx+16,left=cx-rx-16-w;
    x=right+w<=st.width-8?right:left>=8?left:(cx<st.width/2?st.width-w-8:8);
    y=cy-h/2;if(x<cx+rx&&x+w>cx-rx){y=cy-ry-h-12;if(y<46)y=cy+ry+12;}
  }
  pop.style.left=clamp(x,8,st.width-w-8)+'px';pop.style.top=clamp(y,46,Math.max(46,st.height-h-8))+'px';
}
function makeDraggable(box,handle){if(!handle)return;handle.classList.add('draghandle');
  handle.onpointerdown=e=>{if(e.target.closest('button'))return;e.preventDefault();handle.setPointerCapture(e.pointerId);
    const st=$('#stage').getBoundingClientRect(),ox=e.clientX-box.offsetLeft,oy=e.clientY-box.offsetTop;
    handle.onpointermove=m=>{box.style.left=clamp(m.clientX-ox,4,st.width-box.offsetWidth-4)+'px';box.style.top=clamp(m.clientY-oy,4,st.height-box.offsetHeight-4)+'px';};
    handle.onpointerup=handle.onpointercancel=()=>{handle.onpointermove=null;};};}
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
      <span>${L('大細','Size')} <b class="mono" id="popSz">${(+it.params.size).toFixed(2)}×</b></span><button data-sz="-.1" aria-label="${L('縮細','Smaller')}">－</button><button data-sz=".1" aria-label="${L('放大','Larger')}">＋</button>
      <button class="rotreset" data-r="reset">${L('擺返正','Level it')}</button></div>`:''}
    ${k==='animal'&&it.alive?`<div class="ed-actions"><button class="btn" id="popFollow">${L('鏡頭跟住佢','Follow it')}</button><button class="btn" id="popPov">${L('佢嘅第一視角','See as it sees')}</button></div>`:''}
    <div class="ed-actions"><button class="btn primary" id="popMore">${L('詳細設定','Settings')}</button><button class="btn danger" id="popDel">${it.alive?L('移走','Remove'):L('清走','Clear')}</button></div>`;
  $('#popX').onclick=closePop;
  const pf=$('#popFollow'),pv=$('#popPov');if(pf)pf.onclick=()=>{closePop();camFollow(it,'follow');};if(pv)pv.onclick=()=>{closePop();camFollow(it,'pov');};
  pop.querySelectorAll('[data-sz]').forEach(b=>b.onclick=()=>{const p=it.params;p.size=+clamp((+p.size)+(+b.dataset.sz),.4,2).toFixed(2);placeItem(it);const z=$('#popSz');if(z)z.textContent=p.size.toFixed(2)+'×';save();if(S.sel===it&&$('#editor'))renderEditor();});
  makeDraggable(pop,pop.querySelector('.ed-head'));
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
  cool:[['開風扇、開蓋、關加熱','Fan on, lid open, heating off'],()=>{S.heater=false;S.heat=false;S.sealed=false;S.fan=true;}],
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
  co2:['open'],mould:['spring','open'],flow:['flowOff'],noSand:['sand'],attacked:[],noMud:['soil'],noRock:['stone'],noSoil:['soil'],lowLight:['lightMore'],hiN:['wc'],lowN:['feedMore']};
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
    const r=$('#c').getBoundingClientRect(),v=it.m?it.m.p.clone():new THREE.Vector3();if(it.g)v.copy(it.g.position);v.project(camera);
    select(it,{clientX:r.left+(v.x+1)/2*r.width,clientY:r.top+(1-v.y)/2*r.height});});
  pop.querySelectorAll('[data-bal]').forEach(b=>b.onclick=()=>{issueOpen=false;pop.hidden=true;openBal();});
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
    ${R.afterDead&&R.afterDead.length?`<p class="lede" style="margin-top:6px">${L('有啲生物同呢個瓶嘅條件唔夾（例如溫度、會食其他生物），可以搬去另一個瓶，分開養。','Some creatures do not suit this jar (temperature, or eating each other, for example); move them to another jar and keep them apart.')}</p>${!R.suggest&&R.doomed&&R.doomed.length?`<div class="ed-actions" style="margin-top:6px"><button class="btn primary" id="moveDoomed">${L(`將呢 ${R.doomed.length} 隻搬去空瓶`,`Move these ${R.doomed.length} to an empty jar`)}</button></div>`:''}`:''}
    ${R.suggest&&!none?`<p class="lede" style="margin-top:6px">${L('呢個係真實嘅瓶，所以只係列出建議。','This is a real tank, so these are only suggestions.')}</p><div class="ed-actions" style="margin-top:6px"><button class="btn primary" id="tryCopy">${L('複製去另一個瓶試','Try in another jar')}</button></div>`:''}</details>`;
}
function bindReport(){const b=$('#tryCopy');if(b)b.onclick=copyToTrial;const mvb=$('#moveDoomed');if(mvb)mvb.onclick=moveDoomed;
  const d=$('#repBox');if(d)d.ontoggle=()=>{S.reportOpen=d.open;};
  const x=$('#repX');if(x)x.onclick=e=>{e.preventDefault();e.stopPropagation();S.report=null;renderBalance();};}
/* 一鍵平衡都保唔住嘅動物：連同造景、植物、微生物同設定，搬去一個空瓶分開養 */
function moveDoomed(){
  const R=S.report;if(!R||S.real)return;const ids=new Set(R.doomed||[]),alive=S.items.filter(i=>i.alive),mv=alive.filter(i=>ids.has(i.uid));if(!mv.length)return;
  const slot=[0,1,2].find(i=>i!==S.cur&&!(S.jars[i]&&(S.jars[i].items||[]).length)&&!(S.jars[i]&&S.jars[i].real));
  if(slot==null){toast(L('冇空瓶：先清空另一個瓶','No empty jar: empty another jar first'));return;}
  const snap=snapshot(),name=(S.jarName||jarNames()[S.cur])+L('（分出）',' (split)');
  snap.items=snap.items.filter((o,k)=>CAT[o.type].kind!=='animal'||ids.has(alive[k].uid));
  S.jars[slot]=Object.assign(snap,{name,real:false,log:[],hist:[]});
  mv.forEach(i=>{disposeObj(i.g);if(S.sel===i)S.sel=null;});S.items=S.items.filter(i=>!mv.includes(i));
  const names=[...new Set(mv.map(i=>N(CAT[i.type].name)))].join(L('、',', '));
  logEv(`將 ${names} 搬咗去「${name}」`,`Moved ${names} to "${name}"`,'muted');S.report=null;
  renderAll();save();toast(L(`搬咗 ${mv.length} 隻去「${name}」；去嗰個瓶再撳一鍵平衡`,`Moved ${mv.length} to "${name}"; open that jar and auto-balance it`));
}
function copyToTrial(){
  const snap=snapshot();let slot=S.jars.findIndex((j,i)=>i!==S.cur&&!j);if(slot<0)slot=(S.cur+1)%3;
  const name=(S.jarName||jarNames()[S.cur])+L('（試）',' (trial)');
  S.jars[S.cur]=snap;S.cur=slot;restoreSnap(Object.assign({},snap,{name,real:false}));S.report=null;
  renderAll();save();toast(L(`複製咗去「${name}」，而家套用建議`,`Copied to "${name}" and applying the suggestions`));setTimeout(autoBalance,60);
}

/* ================= 分享連結 & 複製呢個瓶 =================
   成個瓶壓縮後放喺網址 #s= 後面，唔使伺服器同登入。 */
const b64u={enc:u=>{let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');},
  dec:t=>Uint8Array.from(atob(t.replace(/-/g,'+').replace(/_/g,'/')),ch=>ch.charCodeAt(0))};
const zpipe=(u,T)=>new Response(new Blob([u]).stream().pipeThrough(new T('deflate-raw'))).arrayBuffer().then(b=>new Uint8Array(b));
async function packJar(){const o=snapshot();delete o.log;delete o.hist;o.real=false;return b64u.enc(await zpipe(new TextEncoder().encode(JSON.stringify(o)),CompressionStream));}
async function unpackJar(t){return JSON.parse(new TextDecoder().decode(await zpipe(b64u.dec(t),DecompressionStream)));}
function openDlg(html){const d=$('#dlg');d.innerHTML=html;if(!d.open)d.showModal();d.onclick=e=>{if(e.target===d)d.close();};d.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>d.close());return d;}
$('#shareBtn').onclick=async()=>{
  if(!S.items.some(i=>i.alive)){toast(L('個瓶仲係空嘅，砌啲嘢先分享','The jar is empty; add something first'));return;}
  let url;try{url=location.href.split('#')[0]+'#s='+await packJar();}catch(e){toast(L('呢個瀏覽器整唔到分享連結','This browser cannot make share links'));return;}
  const name=jarNames()[S.cur],title=L('生態瓶實驗室','Eco Jar Lab')+' · '+name,text=L('睇吓我砌嘅生態瓶，撳「複製呢個瓶」就可以自己玩。','Have a look at my eco jar. Tap "Copy this jar" to play with it yourself.');
  if(navigator.share&&matchMedia('(pointer:coarse)').matches){try{await navigator.share({title,text,url});return;}catch(e){if(e.name==='AbortError')return;}}
  const d=openDlg(`<h4>${L('分享','Share')}「${esc(name)}」</h4>
    <p class="lede">${L('成個瓶已經包咗喺呢條連結入面，唔使登入。朋友打開之後可以撳「複製呢個瓶」，喺佢自己部機繼續玩；佢點改都唔會影響你個瓶。','The whole jar is packed into this link; no login needed. Friends can tap "Copy this jar" to keep playing on their own device. Nothing they change affects your jar.')}</p>
    <div class="linkrow"><input id="shareUrl" readonly value="${esc(url)}" aria-label="${L('分享連結','Share link')}"><button class="btn primary" id="shareCopy">${L('複製連結','Copy link')}</button></div>
    ${S.real?`<p class="lede">${L('呢個係真實嘅瓶；朋友收到嘅只係模擬副本。','This is a real tank; friends only get a simulated copy.')}</p>`:''}
    <div class="acts"><button class="btn" data-close>${L('完成','Done')}</button></div>`);
  const inp=d.querySelector('#shareUrl');inp.onfocus=()=>inp.select();
  d.querySelector('#shareCopy').onclick=async()=>{try{await navigator.clipboard.writeText(url);}catch(e){inp.focus();inp.select();document.execCommand&&document.execCommand('copy');}toast(L('已複製連結','Link copied'));};
};
async function checkShareLink(){
  const m=location.hash.match(/^#s=([\w-]+)$/);if(!m)return;
  history.replaceState(null,'',location.pathname+location.search);
  let d;try{d=await unpackJar(m[1]);if(!d||!Array.isArray(d.items))throw 0;}catch(e){toast(L('呢條分享連結唔完整，開唔到','This share link is incomplete and cannot be opened'));return;}
  d.real=false;d.items=d.items.filter(o=>CAT[o.type]);const name=String(d.name||L('朋友嘅瓶','A friend\'s jar')).slice(0,24);d.name=name;
  const cnt={};d.items.forEach(o=>{if(['plant','animal'].includes(CAT[o.type].kind))cnt[o.type]=(cnt[o.type]||0)+1;});
  const life=Object.entries(cnt).map(([t,n])=>`${N(CAT[t].name)} ×${n}`).join(L('、',', '));
  const mk=d.mode==='aqua'?'aqua':(d.level>0?'palu':'rain'),modeN=N({aqua:['水族','Aquatic'],rain:['雨林','Rainforest'],palu:['水陸','Paludarium']}[mk]);
  const snapOf=i=>i===S.cur?snapshot():S.jars[i],names=jarNames();
  const slots=[0,1,2].map(i=>{const j=snapOf(i),n=j?(j.items||[]).length:0;return{i,n,real:!!(j&&j.real)};});
  const def=(slots.find(s=>!s.n&&!s.real)||{}).i;
  const dl=openDlg(`<h4>${L('朋友分享咗個生態瓶','A friend shared an eco jar')}</h4>
    <p class="sum"><b>${esc(name)}</b> · ${modeN} · ${d.V} L<br><span class="lede">${life||L('未有生物','No living things yet')}</span></p>
    <p class="lede">${L('揀放入你邊個瓶：','Choose which of your jars to put it in:')}</p>
    <fieldset class="slots">${slots.map(s=>`<label><input type="radio" name="slot" value="${s.i}" ${s.real?'disabled':''} ${s.i===def?'checked':''}><span>${esc(names[s.i])} <small>${s.real?L('真實嘅瓶，唔會取代','real tank, never replaced'):s.n?L(`會取代入面 ${s.n} 樣嘢`,`replaces ${s.n} thing${s.n>1?'s':''} inside`):L('空','empty')}</small></span></label>`).join('')}</fieldset>
    <div class="acts"><button class="btn" data-close>${L('唔使喇','No thanks')}</button><button class="btn primary" id="cpyGo" ${def==null?'disabled':''}>${L('複製呢個瓶','Copy this jar')}</button></div>`);
  const go=dl.querySelector('#cpyGo');dl.querySelectorAll('[name=slot]').forEach(r=>r.onchange=()=>go.disabled=false);
  go.onclick=()=>{const r=dl.querySelector('[name=slot]:checked');if(!r)return;const i=+r.value;if(slots[i].real)return;
    if(S.build)exitBuild();if(i!==S.cur){S.jars[S.cur]=snapshot();S.cur=i;}
    restoreSnap(d);S.log=[];logEv(`複製咗朋友分享嘅「${name}」`,`Copied the shared jar "${name}"`,'muted');
    renderAll();save();dl.close();toast(L(`已經複製咗「${name}」`,`Copied "${name}"`));};
}
