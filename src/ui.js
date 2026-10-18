/* ================= 分頁標籤 ================= */
const paneTag={jar:'all',env:'all',ana:'all'};
const ENV_TAGS=[['all',['全部','All']],['place',['地區天氣','Region & weather']],['jar',['瓶子','Jar']],['water',['水和設備','Water & equipment']],['care',['光照餵食','Light & care']],['preset',['預設','Presets']]];
const JAR_TAGS=[['all',['全部','All']],['scape',['造景','Hardscape']],['plant',['植物','Plants']],['animal',['動物','Animals']],['microbe',['微生物','Microbes']],['stress',['受壓','Stressed']],['baby',['BB','Young']]];
const ANA_TAGS=[['all',['全部','All']],['basic',['基本資料','Basics']],['equip',['設備','Equipment']],['species',['生物','Species']],['test',['實測','Tests']],['obs',['觀察','Observations']]];
function paneTagBar(p,tags){return`<div class="tagrow ptags" data-pane="${p}" role="group" aria-label="${L('篩選','Filter')}">${tags.map(([k,n])=>`<button data-ptag="${k}" aria-pressed="${paneTag[p]===k}">${N(n)}</button>`).join('')}</div>`;}
function bindPaneTags(p,root,onChange){const bar=root.querySelector(`[data-pane="${p}"]`);if(!bar)return;dragScroll(bar);
  const apply=()=>{bar.querySelectorAll('[data-ptag]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.ptag===paneTag[p]));
    if(onChange)onChange();else root.querySelectorAll('[data-sec]').forEach(el=>{el.hidden=paneTag[p]!=='all'&&!el.dataset.sec.split(' ').includes(paneTag[p]);});};
  bar.querySelectorAll('[data-ptag]').forEach(b=>b.onclick=()=>{paneTag[p]=b.dataset.ptag;apply();root.scrollTop=0;});if(!onChange)apply();}
function customRegionHtml(){const c=Object.assign({},CUSTOM_DEF,S.customRegion||{});
  const r=(k,l,min,max,step,u)=>`<div class="param"><div class="ph"><label for="cr-${k}">${l}</label><output id="cro-${k}">${c[k]} ${u}</output></div><input type="range" id="cr-${k}" data-cr="${k}" min="${min}" max="${max}" step="${step}" value="${c[k]}"></div>`;
  return`<div class="customreg"><label class="field"><span>${L('地方名','Place name')}</span><input type="text" class="txt" id="cr-name" maxlength="14" value="${esc(c.name)}" placeholder="${L('例如 家中露台','e.g. my balcony')}"></label>
    ${r('t',L('平均溫度','Average temperature'),-5,38,.5,'°C')}${r('sw',L('日夜溫差','Day–night swing'),0,20,1,'°C')}${r('hum',L('平均濕度','Average humidity'),10,100,1,'%')}
    ${r('light',L('日照強度','Sunlight'),.4,1.3,.05,'×')}${r('rain',L('下雨程度','Rain'),0,5,.5,'')}${r('fog',L('起霧','Fog'),0,3,.5,'')}${r('snow',L('下雪','Snow'),0,3,.5,'')}</div>`;}
function bindCustomRegion(){
  document.querySelectorAll('[data-cr]').forEach(el=>{el.oninput=()=>{S.customRegion=Object.assign({},CUSTOM_DEF,S.customRegion||{},{[el.dataset.cr]:+el.value});$('#cro-'+el.dataset.cr).textContent=el.value+' '+({t:'°C',sw:'°C',hum:'%',light:'×'}[el.dataset.cr]||'');renderMeters();save();};
    el.onchange=()=>{if(!(regionOf(S).w[S.wx]>0))S.wx=typicalWx('custom');renderEnv();};});
  const nm=$('#cr-name');if(nm)nm.oninput=()=>{S.customRegion=Object.assign({},CUSTOM_DEF,S.customRegion||{},{name:nm.value.trim().slice(0,14)});renderMeters();save();};
}

/* ================= 生物增減 ================= */
let dirtyList=false,curTab='add';
function addItem(type,params,silent){
  const it=makeItem(type,params);it.n=nextN(type);S.items.push(it);
  if(CAT[type].kind==='sub')buildJar({keepCam:true});else buildItem(it);
  if(!silent){refreshLists();save();toast(L('已加入 ','Added ')+N(CAT[type].name));}
  return it;
}
function removeItem(it,silent){
  const wasSub=CAT[it.type].kind==='sub';
  disposeObj(it.g);S.items=S.items.filter(x=>x!==it);if(S.sel===it)S.sel=null;
  if(wasSub)buildJar({keepCam:true});
  if(!silent){refreshLists();renderEditor();save();}
}
function removeOne(type){
  const list=S.items.filter(i=>i.type===type);if(!list.length)return;
  const it=list.find(i=>!i.alive)||list[list.length-1];removeItem(it);toast(L('已移走 ','Removed ')+N(CAT[type].name));
}
function addFromCatalog(t){
  {const u=lockOf('type',t);if(u){toast(lockText(u));return;}}
  const c=CAT[t],n=S.items.filter(i=>i.type===t&&i.alive).length;
  if(c.kind==='sub'&&S.terra){terraEnsure(t);renderCatalog();save();toast(L(`已經在空位鋪了${c.name[0]}；想選位置就用「自訂造景」`,`Laid ${c.name[1].toLowerCase()} on bare floor; use Build to choose where`));return;}
  if(LIMIT[t]!=null&&n>=LIMIT[t]){toast(L(`${c.name[0]}最多 ${LIMIT[t]} 個`,`Up to ${LIMIT[t]} ${c.name[1].toLowerCase()}`));return;}
  if(c.kind==='sub'&&S.items.filter(i=>i.alive&&CAT[i.type].kind==='sub').length>=3){toast(L('底材最多 3 層','Up to 3 substrate layers'));return;}
  let par=null;
  if(c.kind==='decor'&&n>0)par={x:+rnd(-.6,.6).toFixed(2),z:+rnd(-.6,.6).toFixed(2),rot:Math.round(rnd(0,360)/5)*5};
  addItem(t,par);
}

/* ================= 外框 ================= */
function showTab(t){if(t==='bal'){openBal();return;}curTab=t;if(typeof setSheet==='function'&&isPhone())setSheet(true);document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t));
  ['add','jar','env','ana','play'].forEach(k=>$('#pane-'+k).hidden=k!==t);if(t==='jar')renderJarList();if(t==='play')renderPlay();if(t==='ana'&&!$('#anaGo'))renderAnalyze();}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
let toastT;function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('on'),1900);}
function renderChrome(){
  document.documentElement.lang=LANG==='en'?'en':'zh-Hant';
  $('#brandT').textContent=L('生態瓶實驗室','Eco Jar Lab');$('#brandS').textContent=L('ECO JAR LAB','生態瓶實驗室');
  $('#playBtn').textContent=S.running?L('暫停','Pause'):L('繼續','Play');
  $('#feedBtn').textContent=L('立即餵食','Feed now');$('#buildHdr').textContent=S.build?L('完成造景','Finish building'):(lockOf('feature','build')?'🔒 ':'')+L('自訂造景','Build');if(typeof renderTaskChip==='function')renderTaskChip();$('#buildHdr').classList.toggle('on',!!S.build);$('#balBtn').textContent=L('一鍵平衡','Auto-balance');$('#shareBtn').textContent=L('🔗 分享這個瓶','🔗 Share this jar');$('#presetBtn').textContent=L('預設組合','Presets');
  $('#langBtn').textContent=LANG==='en'?'🌐 中文':'🌐 English';$('#moreBtn').setAttribute('aria-label',L('更多','More'));$('#tourBtn').textContent=L('🧭 新手教學','🧭 Quick guide');$('#langBtn').setAttribute('aria-label',L('Switch to English','切換到中文'));
  if(!clearArm)$('#clearBtn').textContent=L('一鍵清空','Empty jar');
  const tabs={add:['加入','Add'],jar:['瓶內','In jar'],bal:['平衡分析','Balance'],env:['環境和天氣','Setup & weather'],ana:['分析水缸','Analyse a tank'],play:['玩法','Play']};
  document.querySelectorAll('.tabs button').forEach(b=>{b.textContent=N(tabs[b.dataset.tab])+(b.dataset.tab==='jar'?` (${S.items.filter(i=>i.alive).length})`:'');});
  if(typeof renderDock==='function')renderDock(tabs);
  $('#c').setAttribute('aria-label',L('3D 生態瓶，拖動旋轉，按生物看參數','3D jar: drag to rotate, tap a creature to see its settings'));
}
const SPEEDS=[[1,['1 小時/秒','1 h/s']],[4,['4 小時/秒','4 h/s']],[24,['1 日/秒','1 day/s']]];
function renderSpeed(){$('#speedSeg').innerHTML=SPEEDS.map(([v,l])=>`<button aria-pressed="${S.speed===v}" data-v="${v}">${N(l)}</button>`).join('');
  $('#speedSeg').querySelectorAll('button').forEach(b=>b.onclick=()=>{S.speed=+b.dataset.v;if(S.speed>=24)taskFlag('fast');renderSpeed();});}

const jarNames=()=>S.jars.map((j,i)=>i===S.cur?(S.jarName||L(`瓶${i+1}`,`Jar ${i+1}`)):(j&&j.name?j.name:L(`瓶${i+1}`,`Jar ${i+1}`)));
function jarLock(i){if(!i||i===S.cur)return null;const j=S.jars[i];if(j&&(j.items||[]).length)return null;return lockOf('feature','jar'+(i+1));}
function renderJarSeg(){$('#jarSeg').innerHTML=jarNames().map((n,i)=>{const real=i===S.cur?S.real:(S.jars[i]&&S.jars[i].real),lk=jarLock(i);return`<button aria-pressed="${i===S.cur}" data-j="${i}" title="${esc(lk?lockText(lk):n)}" ${lk?'class="locked"':''}>${esc(n)}${lk?L(' (鎖)',' (locked)'):''}${real?`<span class="realtag">${L('真','REAL')}</span>`:''}</button>`;}).join('');
  $('#jarSeg').querySelectorAll('button').forEach(b=>b.onclick=()=>switchJar(+b.dataset.j));}
$('#playBtn').onclick=()=>{S.running=!S.running;$('#playBtn').classList.toggle('primary',S.running);renderChrome();};
$('#feedBtn').onclick=()=>{taskFlag('feed');const n=Math.max(1,S.feed),wL=wLOf(S);
  if(S.mode==='aqua'){if(!wL){toast(L('未注水，無法餵食','No water to feed into'));return;}S.c.flake+=n;feedFx(n);}
  else{const hasW=wL>0&&S.items.some(i=>i.alive&&isWater(i)&&CAT[i.type].kind==='animal');if(hasW){S.c.flake+=n/2;S.c.feed+=n/2;feedFx(n/2);}else S.c.feed+=n;}
  toast(L(`餵了 ${n} 份`,`Fed ${n} portion${n>1?'s':''}`));};
$('#buildHdr').onclick=()=>{if(!S.build){const u=lockOf('feature','build');if(u){toast(lockText(u));return;}}if(S.build)exitBuild();else enterBuild();renderChrome();};
$('#balBtn').onclick=()=>{toast(L('正在計算最平衡的設定…','Working out the most balanced setup…'));setTimeout(autoBalance,30);};
$('#langBtn').onclick=()=>{LANG=LANG==='en'?'zh':'en';pref.set('ecojar.lang',LANG);$('#pane-ana').innerHTML='';renderAll();if(curTab==='ana')renderAnalyze();};
let clearArm=0;
$('#clearBtn').onclick=()=>{const b=$('#clearBtn');
  if(!clearArm){b.textContent=L('再按一次確認','Tap again to confirm');b.classList.add('arm');clearArm=setTimeout(()=>{clearArm=0;b.classList.remove('arm');renderChrome();},3000);return;}
  clearTimeout(clearArm);clearArm=0;b.classList.remove('arm');emptyJar();};

/* ================= 加入 ================= */
function paramChips(type){const c=CAT[type],p=c.params,g=c.g;
  if(g==='aplant')return[L(`產氧 ${p.o2Prod} mg/h`,`O₂ ${p.o2Prod} mg/h`),L(`吸收 ${p.uptake} mg/h`,`uptake ${p.uptake} mg/h`)];
  if(g==='rplant')return[L(`產氧 ${p.o2Prod} mg/h`,`O₂ ${p.o2Prod} mg/h`),L(`加濕 ${p.transp}%/h`,`humidity +${p.transp}%/h`),L(`濕度 ≥${p.humMin}%`,`humidity ≥${p.humMin}%`)];
  if(g==='aanimal')return[L(`吃 ${p.food} 份/日`,`eats ${p.food}/day`),L(`每 ${p.wasteEvery} 小時去廁所`,`poops every ${p.wasteEvery} h`),`${p.tMin}–${p.tMax}°C`,...(p.breedDays?[L(`約 ${p.breedDays} 日生一次`,`breeds ~${p.breedDays} days`)]:[]),...(c.w==='salt'?[L('海水','salt water')]:[])];
  if(g==='ranimal'||g==='amph')return[L(`吃 ${p.food} 份/日`,`eats ${p.food}/day`),L(`濕度 ${p.humMin}–${p.humMax}%`,`humidity ${p.humMin}–${p.humMax}%`),`${p.tMin}–${p.tMax}°C`,...(c.hab==='amph'?[L('要有水區','needs water')]:[])];
  if(g==='nitri')return[L(`分解氨 ${p.cap} mg/h`,`ammonia ${p.cap} mg/h`)];
  if(g==='decomp'||g==='soilm')return[L(`分解 ${p.rate} 份/h`,`breaks down ${p.rate}/h`)];
  if(g==='sub')return[L(`厚 ${p.depth} cm`,`${p.depth} cm thick`)];
  if(g==='decor')return[c.rock?L('細菌附著 +20%','+20% bacteria surface'):L('純裝飾','decorative')];
  return[];}
let catTag='all',catQ='',tagScroll=0;
const tagList=avail=>['all',...Object.keys(TAGS).filter(t=>t!=='all'&&avail.has(t))];
/* 標籤列左右拖：滑鼠拖（捉住指標，拖出範圍都得）、滾輪橫向捲、電腦有 ‹ › 箭咀；手指照用原生捲動 */
function dragScroll(el){let sx=0,sl=0,down=false,moved=false,pid=null;
  el.onpointerdown=e=>{if(e.pointerType!=='mouse'||e.button!==0)return;down=true;moved=false;sx=e.clientX;sl=el.scrollLeft;pid=e.pointerId;};
  el.onpointermove=e=>{if(!down)return;const d=e.clientX-sx;
    if(!moved&&Math.abs(d)>3){moved=true;try{el.setPointerCapture(pid);}catch(err){}el.style.scrollBehavior='auto';el.classList.add('dragging');}
    if(moved)el.scrollLeft=sl-d;};
  const up=()=>{if(!down)return;down=false;el.classList.remove('dragging');el.style.scrollBehavior='';try{if(pid!=null&&el.hasPointerCapture(pid))el.releasePointerCapture(pid);}catch(err){}};
  el.onpointerup=el.onpointercancel=up;el.onlostpointercapture=up;
  el.addEventListener('click',e=>{if(moved){e.stopPropagation();e.preventDefault();moved=false;}},true);
  el.addEventListener('wheel',e=>{if(el.scrollWidth<=el.clientWidth+1)return;const d=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;if(!d)return;
    e.preventDefault();el.style.scrollBehavior='auto';el.scrollLeft+=d;el.style.scrollBehavior='';},{passive:false});
  tagArrows(el);}
function tagArrows(el){if(!matchMedia('(hover:hover) and (pointer:fine)').matches||!el.parentNode||el.parentNode.classList.contains('tagwrap'))return;
  const w=document.createElement('div');w.className='tagwrap'+(el.classList.contains('ptags')?' ptagwrap':'');el.parentNode.insertBefore(w,el);
  const mk=(dir,t)=>{const b=document.createElement('button');b.type='button';b.className='tagarr '+(dir<0?'l':'r');b.textContent=dir<0?'‹':'›';b.setAttribute('aria-label',t);
    b.onclick=()=>el.scrollBy({left:dir*Math.max(120,el.clientWidth*.7),behavior:'smooth'});return b;};
  const l=mk(-1,L('向左','Scroll left')),r=mk(1,L('向右','Scroll right'));w.append(l,el,r);
  const upd=()=>{const max=el.scrollWidth-el.clientWidth;l.hidden=el.scrollLeft<=2;r.hidden=max<=2||el.scrollLeft>=max-2;};
  el.addEventListener('scroll',upd,{passive:true});requestAnimationFrame(upd);}
function swipeFlip(el,flip){if(el._sw)return;el._sw=1;let sx=0,sy=0,t0=0;
  el.addEventListener('touchstart',e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY;t0=Date.now();},{passive:true});
  el.addEventListener('touchend',e=>{const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.6&&Date.now()-t0<600)flip(dx<0?1:-1);},{passive:true});}
function renderCatalog(){
  const m=S.mode,aq=m==='aqua';
  const okMode=c=>(c.m===m||c.m==='both')&&(aq?(c.hab!=='land'&&c.hab!=='amph'&&(!c.w||c.w==='both'||c.w===S.water)):c.w!=='salt');
  const ids=Object.keys(CAT).filter(id=>okMode(CAT[id]));
  const avail=new Set();ids.forEach(id=>tagsOf(id).forEach(t=>avail.add(t)));
  if(catTag!=='all'&&!avail.has(catTag))catTag='all';
  const pa=$('#pane-add');
  if(!$('#catBar')){pa.innerHTML=`<div class="catbar" id="catBar"></div><div id="catList" class="catlist"></div>`;}
  $('#catBar').innerHTML=`<input type="search" id="catQ" class="txt" placeholder="${L('搜尋名稱，例如 蝦、fern','Search, e.g. shrimp, 蝦')}" value="${esc(catQ)}">
    <div class="tagrow" id="tagRow" role="group" aria-label="${L('篩選，可以左右拖','Filters, drag sideways')}">${tagList(avail).map(t=>`<button data-tag="${t}" aria-pressed="${catTag===t}">${N(TAGS[t])}</button>`).join('')}</div>`;
  const row=$('#tagRow');row.scrollLeft=tagScroll;row.onscroll=()=>{tagScroll=row.scrollLeft;};dragScroll(row);
  const q=$('#catQ');q.oninput=()=>{catQ=q.value;renderCatList();};
  $('#catBar').querySelectorAll('[data-tag]').forEach(b=>b.onclick=()=>{catTag=b.dataset.tag;renderCatalog();$('#pane-add').scrollTop=0;});
  renderCatList();
}
function renderCatList(){
  const m=S.mode,aq=m==='aqua';
  const okMode=c=>(c.m===m||c.m==='both')&&(aq?(c.hab!=='land'&&c.hab!=='amph'&&(!c.w||c.w==='both'||c.w===S.water)):c.w!=='salt');
  const qq=catQ.trim().toLowerCase();
  const match=id=>{const c=CAT[id];if(!okMode(c))return false;if(catTag!=='all'&&!tagsOf(id).includes(catTag))return false;
    if(qq&&!(c.name.join(' ')+' '+c.sci+' '+id).toLowerCase().includes(qq))return false;return true;};
  const groups=aq?[['scape',['造景','Hardscape']],['wplant',['水草','Water plants']],['wanimal',['動物','Animals']],['microbe',['微生物','Microbes']]]
    :[['scape',['造景','Hardscape']],['lplant',['陸地植物','Land plants']],['wplant',['水區水草','Water plants']],['lanimal',['陸地和兩棲動物','Land & amphibians']],['wanimal',['水中動物','Water animals']],['microbe',['微生物','Microbes']]];
  const grp=c=>['sub','decor'].includes(c.kind)?'scape':c.kind==='microbe'?'microbe':c.kind==='plant'?(c.hab==='water'?'wplant':'lplant'):(c.hab==='water'?'wanimal':'lanimal');
  const subN=S.items.filter(i=>i.alive&&CAT[i.type].kind==='sub').length;
  const showWater=(catTag==='all'||catTag==='scape')&&!qq;
  const waterCard=!showWater?'':aq?`<div class="card"><div class="nm"><span class="dot" style="background:#7fc4d6"></span>${L('水','Water')}<em>${S.water==='salt'?L('海水','salt'):L('淡水','fresh')}</em></div>
      <p>${S.filled?L('已經注滿水。抽乾會令水中生物死亡。','Filled. Draining it kills everything living in the water.'):L('瓶子還沒有水。鋪好底沙和石頭之後才注水；新水還沒有細菌。','No water yet. Add substrate and stones first; fresh water has no bacteria.')}</p>
      <div class="ctr"><button class="${S.filled?'minus':''} wide" id="waterBtn">${S.filled?L('抽乾','Drain'):L('注水','Fill')}</button></div></div>`
    :`<div class="card"><div class="nm"><span class="dot" style="background:#7fc4d6"></span>${L('水位','Water level')}<em>${S.level>0?L(`約 ${fx(S.wL)} L 水`,`about ${fx(S.wL)} L`):L('沒有水區','no water')}</em></div>
      <p>${S.level>0?L(`水位 ${S.level} cm。前面低處是水區，後面土坡是陸地。`,`${S.level} cm deep. The low front is water; the slope at the back is land.`):L('現在是純陸缸。加水位就會變成水陸共生缸，可以養魚。','Land only for now. Raise the water level to make a paludarium with fish.')}</p>
      <div class="ctr"><button class="minus" id="lvDown" ${S.level>0?'':'disabled'} aria-label="${L('降低水位','Lower water')}">−</button><output>${S.level}</output><button id="lvUp" ${S.level<14?'':'disabled'} aria-label="${L('提高水位','Raise water')}">+</button></div></div>`;
  const html=groups.map(([gk,t])=>{const list=Object.keys(CAT).filter(id=>match(id)&&grp(CAT[id])===gk);if(!list.length&&!(gk==='scape'&&waterCard))return'';
    return`<section class="cards"><h3>${N(t)}</h3>${gk==='scape'?waterCard:''}${list.map(id=>{const c=CAT[id];
      const lk=lockOf('type',id),n=S.items.filter(i=>i.type===id).length,lim=LIMIT[id],full=!!lk||(lim!=null&&S.items.filter(i=>i.type===id&&i.alive).length>=lim)||(c.kind==='sub'&&subN>=3);
      const chips=lk?[lockText(lk)]:paramChips(id);if(lim!=null)chips.push(L(`最多 ${lim}`,`max ${lim}`));
      if(!aq&&c.hab==='water'&&c.kind!=='microbe'&&!(S.level>0))chips.push(L('要先加水位','raise the water first'));
      if(c.burrow)chips.push(L('要有細沙','needs fine sand'));if(c.root==='mud')chips.push(L('要有泥土','needs mud'));if(c.attacks)chips.push(L('會攻擊其他生物','attacks others'));if(c.preys)chips.push(L('會吃小生物','eats small animals'));if(c.shade)chips.push(L('遮光減藻','shades out algae'));
      return`<div class="card${lk?' locked':''}" data-card="${id}"><div class="nm"><span class="dot" style="background:${c.color}"></span>${N(c.name)}<em>${c.sci}</em></div>
      <p>${N(c.desc)}</p><div class="ctr"><button class="minus" data-rm="${id}" aria-label="${L('減少','Remove')} ${esc(N(c.name))}" ${n?'':'disabled'}>−</button><output>${n}</output><button data-add="${id}" aria-label="${L('加入','Add')} ${esc(N(c.name))}" ${full?'disabled':''}>+</button></div>
      <div class="chips">${chips.map(x=>`<span class="chip">${x}</span>`).join('')}</div></div>`;}).join('')}</section>`;}).join('');
  const cl=$('#catList');cl.innerHTML=html||`<div class="empty">${L('沒有符合的項目。','Nothing matches.')}</div>`;
  cl.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addFromCatalog(b.dataset.add));
  cl.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>removeOne(b.dataset.rm));
  const wb=$('#waterBtn');if(wb)wb.onclick=()=>fillWater(!S.filled);
  const lu=$('#lvUp'),ld=$('#lvDown');if(lu){lu.onclick=()=>setLevel(Math.min(14,S.level+1));ld.onclick=()=>setLevel(Math.max(0,S.level-1));}}
function fillWater(on){
  S.filled=on;const c=S.c;['O2','CO2','NH3','NO3','algae','flake','detritus'].forEach(k=>c[k]=0);
  buildJar({keepChem:true,keepCam:true});
  if(on){freshWater(c,wLOf(S),true);logEv('注滿了水','Filled with water','muted');}else logEv('抽乾了水','Drained the water','muted');
  renderAll();save();toast(on?L('注滿水。新水還沒有細菌，記得加硝化菌。','Filled. Fresh water has no bacteria yet, so add some.'):L('已抽乾水','Water drained'));
}
function setLevel(v){if(v===S.level)return;
  if(S.mode==='rain'&&!(S.level>0)&&v>0){const u=lockOf('feature','palu');if(u){toast(lockText(u));if(curTab==='env')renderEnv();return;}}
  const before=S.level;S.level=v;buildJar({keepCam:true});
  if(before===0&&v>0)logEv('加了水區','Added a water area','muted');if(v===0)logEv('抽乾了水區','Drained the water area','muted');
  renderAll();save();}
function emptyJar(){
  S.items.forEach(i=>disposeObj(i.g));S.items=[];S.sel=null;S.report=null;
  S.terra=null;
  Object.assign(S,{chal:null,filled:false,level:0,feed:0,pump:false,filter:false,heater:false,fan:false,mist:0,heat:false,wc:0,hour:6,day:1});
  buildJar({keepCam:true});resetChem(S);S.log=[];logEv('已清空瓶子','Emptied the jar','muted');
  renderAll();save();toast(S.mode==='aqua'?L('已清空，連水都沒有','Emptied: no water, nothing inside'):L('已清空，連泥都沒有','Emptied: no soil, nothing inside'));
}

/* ================= 瓶內 ================= */
function statusOf(it){
  const k=CAT[it.type].kind;
  if(!it.alive)return[L('已死亡','Dead'),'bad'];
  if(k==='sub')return[L(`${it.params.depth} cm 厚`,`${it.params.depth} cm thick`),''];
  if(k==='decor')return[L('造景','Hardscape'),''];
  if(it.stress)return[SS(it.stress),it.health<.4?'bad':'warn'];
  if(k==='animal'&&it.age!=null&&it.age<4)return[L('BB 成長中','Growing up'),''];
  if(k==='plant')return[it.lastProd>0?L(`產氧中 ${fx(it.lastProd,2)} mg/h`,`making ${fx(it.lastProd,2)} mg/h O₂`):L('夜間休息','Resting'),''];
  if(k==='animal')return[it.satiety<.4?L('有點餓','A bit hungry'):L('精神','Healthy'),''];
  return[L('運作中','Working'),''];
}
function refreshLists(){renderJarList();updateCatCounts();}
function updateCatCounts(){
  const subN=S.items.filter(i=>i.alive&&CAT[i.type].kind==='sub').length;
  document.querySelectorAll('#catList [data-card]').forEach(card=>{const id=card.dataset.card,c=CAT[id],n=S.items.filter(i=>i.type===id).length,lim=LIMIT[id];
    const full=(lim!=null&&S.items.filter(i=>i.type===id&&i.alive).length>=lim)||(c.kind==='sub'&&subN>=3);
    card.querySelector('output').textContent=n;card.querySelector('[data-rm]').disabled=!n;card.querySelector('[data-add]').disabled=full||!!lockOf('type',id);});
}
function renderJarList(){
  const el=$('#pane-jar');renderChrome();
  if(!$('#jarlist'))el.innerHTML=`<div id="jarlist"></div>`;
  const its=[...S.items].sort((a,b)=>KIND_ORDER.indexOf(CAT[a.type].kind)-KIND_ORDER.indexOf(CAT[b.type].kind)||a.uid-b.uid);
  const jt=paneTag.jar,jm=it=>{const k=CAT[it.type].kind;if(jt==='all')return true;if(jt==='scape')return k==='sub'||k==='decor';if(jt==='stress')return it.alive&&!!it.stress;if(jt==='baby')return it.age!=null&&it.age<4;return k===jt;};
  const shown=its.filter(jm);
  $('#jarlist').innerHTML=its.length?`${paneTagBar('jar',JAR_TAGS)}<p class="lede" style="margin:8px 0">${L('按一行就會在那裡打開設定。','Tap a row to open its settings right there.')}</p>${shown.length?'':`<div class="empty">${L('這個分類還沒有東西。','Nothing in this category.')}</div>`}<div class="list"${shown.length?'':' hidden'}>${shown.map(it=>{const c=CAT[it.type],deco=['sub','decor'].includes(c.kind);
    return`<button class="row${S.sel===it?' sel':''}" data-uid="${it.uid}" aria-expanded="${S.sel===it}"><span class="dot" style="background:${c.color}"></span>
    <span class="t"><b id="nm-${it.uid}">${esc(label(it))}</b><span id="st-${it.uid}"></span></span>${deco?'<span></span>':`<span class="hbar" id="hb-${it.uid}"><span></span></span>`}</button>${S.sel===it?'<div id="editor" class="acc"></div>':''}`;}).join('')}</div>`
    :`<div class="empty">${L('瓶子還是空的。到「加入」由造景開始佈置。','The jar is empty. Start with hardscape in the Add tab.')}</div>`;
  bindPaneTags('jar',$('#jarlist'),renderJarList);
  $('#jarlist').querySelectorAll('[data-uid]').forEach(b=>b.onclick=()=>{const it=S.items.find(i=>i.uid==b.dataset.uid);if(!it)return;if(S.sel===it){S.sel=null;renderJarList();renderOvR();return;}select(it);});
  if(S.sel)renderEditor();
  updateJarLive();dirtyList=false;
}
function updateJarLive(){
  for(const it of S.items){const st=$('#st-'+it.uid);if(!st)continue;const [t,c]=statusOf(it);st.textContent=t;st.className=c;
    const hb=$('#hb-'+it.uid);if(hb){hb.className='hbar'+(it.health<.35?' bad':it.health<.7?' warn':'');hb.firstChild.style.width=(it.health*100)+'%';}}
  const it=S.sel;if(!it)return;
  const set=(id,v)=>{const e=$('#'+id);if(e)e.textContent=v;};
  set('v-health',Math.round(it.health*100)+'%');set('v-state',statusOf(it)[0]);
  const k=CAT[it.type].kind;
  if(k==='animal'){set('v-sat',Math.round(it.satiety*100)+'%');set('v-wc',L(`${Math.max(0,it.params.wasteEvery-it.wt)} 小時後`,`in ${Math.max(0,it.params.wasteEvery-it.wt)} h`));}
  if(k==='plant'){set('v-prod',fx(it.lastProd,2)+' mg/h');set('v-day',fx(it.params.o2Prod*it.health*Math.min(24,S.light)*MATS[S.mat].tr-it.params.resp*24,1)+L(' mg/日',' mg/day'));}
}
function renderEditor(){
  const ed=$('#editor');if(!ed)return;const it=S.sel;
  if(!it){ed.innerHTML='';return;}
  const c=CAT[it.type],k=c.kind,defs=GROUPS[c.g]||[],deco=['sub','decor'].includes(k);
  const vit=deco?[]:[[L('健康','Health'),'v-health'],[L('狀態','Status'),'v-state']];
  if(k==='animal')vit.push([L('飽肚程度','Fullness'),'v-sat'],[L('下次去廁所','Next poop'),'v-wc']);
  if(k==='plant')vit.push([L('現在產氧','O₂ now'),'v-prod'],[L('每日淨產氧','Net O₂ per day'),'v-day']);
  const notes=[];
  if(c.root==='sand')notes.push(L('要種在底沙。','Needs substrate to root.'));if(c.root==='rock')notes.push(L('要依附石頭或沉木。','Needs rock or wood to attach to.'));if(c.root==='mud')notes.push(L('要種在泥土（在「加入 › 造景」鋪泥土）。','Needs soil to root in (add it under Hardscape).'));
  if(c.hab==='amph')notes.push(L('要有水區和陸地。','Needs water and land.'));if(c.preys)notes.push(L('會吃：','Eats: ')+c.preys.map(x=>N(CAT[x].name)).join(L('、',', '))+L('。','.'));if(c.attacks)notes.push(L('會攻擊：','Attacks: ')+Object.keys(c.attacks).map(x=>N(CAT[x].name)).join(L('、',', '))+L('。','.'));
  if(c.flow)notes.push(L('開氧氣泵或者過濾會受傷。','Hurt by a pump or filter current.'));
  if(k==='animal')notes.unshift(L('食物：','Food: ')+Object.keys(c.diet).map(p=>N(POOLNAME[p])).join(L('、',', '))+L('（按喜好排序）。',' (in order of preference).'));
  ed.innerHTML=`<div class="editor"><div class="ed-head"><span class="dot" style="background:${c.color}"></span><h2 id="edTitle">${esc(label(it))}</h2><button class="x" id="edClose" aria-label="${L('關閉','Close')}">×</button></div>
   ${(k==='animal'||k==='plant')&&it.alive?`<div class="field"><label for="p-name">${k==='animal'?L('幫牠改名','Give it a name'):L('名稱','Name')}</label><div class="namerow"><input type="text" id="p-name" maxlength="14" value="${esc(it.name||'')}" placeholder="${esc(N(c.name)+' #'+it.n)}"><button class="btn" id="nameRnd">${L('隨機名','Random')}</button></div></div>`:''}
   ${vit.length?`<div class="vitals">${vit.map(([l,id])=>`<div class="vital">${l}<b id="${id}">–</b></div>`).join('')}</div>`:`<p class="lede">${N(c.desc)}</p>`}
   ${notes.length?`<p class="lede">${notes.join(' ')}</p>`:''}
   ${defs.map(([key,dk])=>{const d=PD[dk];return`<div class="param"><div class="ph"><label for="p-${key}">${N(d.l)}</label><output id="o-${key}">${it.params[key]} ${N(d.u)}</output></div>
     <input type="range" id="p-${key}" min="${d.min}" max="${d.max}" step="${d.step}" value="${it.params[key]}" ${it.alive?'':'disabled'}>${N(d.h)?`<small>${N(d.h)}</small>`:''}</div>`;}).join('')}
   <div class="ed-actions">${it.alive&&!deco?`<button class="btn" id="edAll">${L('套用到所有','Apply to all ')}${esc(N(c.name))}</button>`:''}${it.alive?`<button class="btn" id="edReset">${L('還原預設','Reset')}</button>`:''}<button class="btn danger" id="edDel">${it.alive?L('移走','Remove'):L('清走屍體','Clear body')}</button></div></div>`;
  defs.forEach(([key,dk])=>{const inp=$('#p-'+key);
    inp.oninput=()=>{it.params[key]=+inp.value;$('#o-'+key).textContent=`${inp.value} ${N(PD[dk].u)}`;if(k==='decor')placeItem(it);save();};
    inp.onchange=()=>{if(k==='sub')buildJar({keepCam:true});save();};});
  $('#edClose').onclick=()=>{S.sel=null;renderJarList();renderOvR();};
  $('#edDel').onclick=()=>removeItem(it);
  const nm=$('#p-name');if(nm){const apply=v=>{it.name=v.trim().slice(0,14);$('#edTitle').textContent=label(it);const li=$('#nm-'+it.uid);if(li)li.textContent=label(it);save();};
    nm.oninput=()=>apply(nm.value);$('#nameRnd').onclick=()=>{nm.value=randName();apply(nm.value);};}
  const all=$('#edAll');if(all)all.onclick=()=>{S.items.filter(i=>i.type===it.type).forEach(i=>i.params=Object.assign({},it.params));toast(L('已套用到所有','Applied to all ')+N(c.name));save();};
  const rs=$('#edReset');if(rs)rs.onclick=()=>{it.params=Object.assign({},c.params);if(k==='sub')buildJar({keepCam:true});else if(k==='decor')placeItem(it);renderEditor();save();};
  updateJarLive();
}

/* ================= 讀數 ================= */
function rangeOf(key,list){const ans=(list||aliveIn(S,'animal')).filter(a=>a.params[key+'Min']!=null);if(!ans.length)return null;
  return[Math.max(...ans.map(a=>a.params[key+'Min'])),Math.min(...ans.map(a=>a.params[key+'Max']))];}
function meterList(){
  const aq=S.mode==='aqua',c=S.c,wL=wLOf(S),a=airL(S),out=[];
  const tr=rangeOf('t'),hr=rangeOf('hum');
  const rs=(v,r,pad)=>r?(v<r[0]-pad||v>r[1]+pad?'bad':v<r[0]||v>r[1]?'warn':''):'';
  if(!aq){
    out.push([L('空氣 O₂','Air O₂'),c.aO2/(a*13.3),'%',1,21,v=>v<17?'bad':v<19?'warn':'','ao2']);
    out.push(['CO₂',c.aCO2/(a*.0018),'ppm',0,6000,v=>v>5000?'bad':v>2500?'warn':'','co2']);
    out.push([L('濕度','Humidity'),c.hum,'%',0,100,v=>rs(v,hr,5),'hum']);
    out.push([L('溫度','Temp'),c.T,'°C',1,40,v=>rs(v,tr,2),'T']);
    out.push([L('排泄物','Droppings'),c.waste,'',1,20,v=>v>10?'bad':v>5?'warn':'','waste']);
    out.push([L('霉菌','Mould'),c.mould,'',1,60,v=>v>20?'bad':v>10?'warn':'','mould']);
  }
  if(wL>0){
    out.push([aq?L('溶氧 O₂','Dissolved O₂'):L('水中溶氧','Water O₂'),c.O2/wL,'mg/L',1,14,v=>v<3?'bad':v<5?'warn':'','wo2']);
    if(aq)out.push([L('水溫','Water temp'),c.T,'°C',1,40,v=>rs(v,tr,2),'T']);
    out.push([aq?L('氨 NH₃','Ammonia'):L('水中氨','Water NH₃'),c.NH3/wL,'mg/L',2,1,v=>v>.5?'bad':v>.2?'warn':'','wnh3']);
    if(aq){out.push([L('硝酸鹽','Nitrate'),c.NO3/wL,'mg/L',1,50,v=>v>40?'bad':v>20?'warn':'','no3']);
      out.push(['CO₂',c.CO2/wL,'mg/L',2,6,v=>v<.3?'warn':'','wco2']);}
    out.push([L('藻類','Algae'),c.algae,'',0,60,v=>v>45?'bad':v>30?'warn':'','algae']);
    if(aq)out.push([L('飼料/殘渣','Food/detritus'),c.flake+c.detritus,'',1,20,v=>v>15?'warn':'','food']);
  }
  return out;
}
function renderMeters(){
  const aq=S.mode==='aqua',wL=wLOf(S),M=meterList();
  let html=M.map(([l,v,u,d,mx,f])=>`<div class="meter ${f(v)}"><div class="l">${l}</div><div class="v">${fx(v,d)}<small>${u}</small></div><div class="bar"><span style="width:${clamp(v/mx,0,1)*100}%"></span></div></div>`).join('');
  if(aq&&!wL)html=`<div class="meter warn"><div class="l">${L('水','Water')}</div><div class="v">${L('未注水','Empty')}</div></div><div class="meter"><div class="l">${L('溫度','Temp')}</div><div class="v">${fx(S.c.T)}<small>°C</small></div></div>`;
  $('#meters').innerHTML=html;
  $('#clkDay').textContent=L(`第 ${S.day} 日`,`Day ${S.day}`);$('#clkTime').textContent=String(S.hour).padStart(2,'0')+':00';
  const Lt=isLight(S,S.hour),lt=$('#lightTag');lt.textContent=Lt?L('開燈','Lights on'):L('熄燈','Lights off');lt.className='tag '+(Lt?'day':'night');
  $('#wxPill').textContent=`${aq?(S.water==='salt'?L('海水 · ','Salt · '):L('淡水 · ','Fresh · ')):(S.level>0?L('水陸 · ','Paludarium · '):L('陸缸 · ','Terrarium · '))}${N(WX[S.wx].n)} · ${fx(S.c.T)}°C${S.wxMode!=='auto'?L('（固定）',' (fixed)'):''}`;
  const an=S.items.filter(i=>i.alive&&CAT[i.type].kind==='animal'),stressed=an.filter(i=>i.stress).length,states=M.map(m=>m[5](m[1]));
  let cls='',txt=L('穩定','Stable');
  if(states.includes('bad')||an.some(i=>i.stress&&i.health<.4)){cls='bad';txt=stressed?L(`危險 · ${stressed} 隻受壓`,`Danger · ${stressed} stressed`):L('危險','Danger');}
  else if(states.includes('warn')||stressed){cls='warn';txt=stressed?L(`注意 · ${stressed} 隻受壓`,`Watch · ${stressed} stressed`):L('注意','Watch');}
  if(!an.length&&!S.items.some(i=>i.alive&&CAT[i.type].kind==='plant')){cls='';txt=L('還沒有生物','Nothing living');}
  if(aq&&!wL){cls='warn';txt=L('未注水','No water');}
  const p=$('#status');p.className='pill '+cls;p.lastChild.textContent=txt;
  $('#hint').textContent=S.sel&&S.sel.alive?L('已選：','Selected: ')+label(S.sel):L('拖動旋轉 · 按生物看參數 · 拖裝飾搬位','Drag to rotate · tap to inspect · drag hardscape to move');
}

/* ================= 平衡分析 ================= */
function pairRow(l,v,mx,col,u){return`<div class="pair"><span>${l}</span><span class="track"><span style="width:${clamp(v/mx,0,1)*100}%;background:${col}"></span></span><span class="n">${fx(v,1)} ${u}</span></div>`;}
function rangeRow(l,lo,hi,cur,min,max,u){const X=v=>clamp((v-min)/(max-min),0,1)*100;
  return`<div class="pair"><span>${l}</span><span class="track"><span style="margin-left:${X(lo)}%;width:${Math.max(0,X(hi)-X(lo))}%;background:var(--good);opacity:.5"></span><i style="left:calc(${X(cur)}% - 1px)"></i></span><span class="n">${fx(lo,0)}–${fx(hi,0)}${u}</span></div>`;}
function bud(cls,title,right,body,text){return{cls,title,right,html:`<div class="bud ${cls}"><div class="bh"><b>${title}</b><span>${right}</span></div>${body}<p>${text}</p></div>`};}
const rate=(r,good=1.2,ok=.8)=>r>=good?'good':r>=ok?'warn':'bad';
function budgets(){
  const aq=S.mode==='aqua',c=S.c,wL=wLOf(S),L24=Math.min(24,S.light),E=envInfo(S),tr=MATS[S.mat].tr;
  const wl=(WX[S.wxMode==='auto'?typicalWx(S.region):S.wxMode]||WX.cloudy).light,lm=tr*wl*regionOf(S).light,q=clamp(1+.04*(c.T-25),.5,1.6),out=[];
  const lightNote=L(`按 ${L24} 小時光照、${MATS[S.mat].n[0]}透光 ${Math.round(tr*100)}%、${S.wxMode==='auto'?'平均天氣':WX[S.wxMode].n[0]}計`,`Using ${L24} h of light, ${MATS[S.mat].n[1].toLowerCase()} at ${Math.round(tr*100)}%, ${S.wxMode==='auto'?'average weather':WX[S.wxMode].n[1].toLowerCase()}`);
  const pre=aq?'':L('水區 · ','Water · ');
  const alive=S.items.filter(i=>i.alive);
  if(wL>0){
    const P=alive.filter(i=>isWater(i)&&CAT[i.type].kind==='plant'),A=alive.filter(i=>isWater(i)&&CAT[i.type].kind==='animal'),amph=alive.filter(i=>CAT[i.type].hab==='amph');
    let o2In=0,o2Out=0,hr=0,wIn=0,need=0;
    P.forEach(it=>{const p=it.params;o2In+=p.o2Prod*it.health*L24*lm*(CAT[it.type].floating?.5:CAT[it.type].airO2?.35:1);const r=p.resp*Math.max(.3,it.health)*q;o2Out+=r*24;hr+=r;});
    A.forEach(it=>{const p=it.params;o2Out+=p.resp*q*24;hr+=p.resp*q;wIn+=p.wasteAmt*24/p.wasteEvery;need+=p.food;});
    amph.forEach(it=>{wIn+=it.params.wasteAmt*.1*24/it.params.wasteEvery;});
    const flakeEat=A.reduce((s,it)=>s+(CAT[it.type].diet.flake?it.params.food:0),0),landEat=alive.filter(i=>!isWater(i)&&CAT[i.type].kind==='animal'&&CAT[i.type].diet.feed).reduce((s,i)=>s+i.params.food,0);
    const feedW=aq?S.feed:(flakeEat+landEat>0?S.feed*flakeEat/(flakeEat+landEat):0);
    wIn+=Math.max(0,feedW-flakeEat)*.1;
    const cap=alive.filter(i=>i.type==='nitri').reduce((s,i)=>s+i.params.cap*24*i.health*E.surf,0)+(S.filter?.012*wL*24:0);
    const upt=P.reduce((s,i)=>s+i.params.uptake*i.health*L24,0);
    const nitr=Math.min(wIn,cap);o2Out+=nitr*3.4;hr+=nitr*3.4/24;
    const r=o2Out>0?o2In/o2Out:9,mx=Math.max(o2In,o2Out,1);
    let cls=rate(r,1.2,1),t=r>=1.2?L('水草產氧足夠，還有剩。','Plants make more oxygen than is used.'):r>=1?L('產氧和耗氧差不多，邊緣平衡。','Oxygen made and used are about equal.'):L('耗氧多於產氧。','More oxygen is used than made.');
    if(r<1&&(S.pump||!S.sealed||!aq)){cls='warn';t+=S.pump?L('靠氧氣泵補充。','The air pump makes up the difference.'):L('暫時靠與空氣交換維持。','Air exchange is covering it for now.');}
    else if(r<1)t+=L('密封會慢慢缺氧：加水草、開氧氣泵或者減少動物。','Sealed, it will slowly run out: add plants, a pump or fewer animals.');
    if(!P.length&&o2Out>0&&!S.pump&&aq){cls=S.sealed?'bad':'warn';t=S.sealed?L('沒有水草，密封之後氧氣只會一直跌。','No plants: sealed, oxygen will only fall.'):L('沒有水草，全靠開口換氣。','No plants: the open top supplies all the oxygen.');}
    out.push(bud(cls,pre+L('氧氣（每日）','Oxygen per day'),fx(r,2)+'×',pairRow(L('產氧','Made'),o2In,mx,'var(--o2)','mg')+pairRow(L('耗氧','Used'),o2Out,mx,'var(--muted)','mg'),t+`<br><span class="lede">${lightNote}</span>`));
    const nightUse=hr*(24-L24),stock=Math.max(0,c.O2-2*wL),pumpAdd=S.pump?(aq&&S.sealed?.04:.15)*2*wL*(24-L24):0,avail=stock+pumpAdd+(aq?0:.1*2*wL*(24-L24));
    const nc=nightUse>avail?'bad':nightUse>avail*.6?'warn':'good',nm=Math.max(nightUse,avail,1);
    out.push(bud(nc,pre+L(`熄燈 ${24-L24} 小時`,`${24-L24} h of darkness`),`${fx(nightUse)} / ${fx(avail)} mg`,pairRow(L('夜晚用','Night use'),nightUse,nm,'var(--muted)','mg')+pairRow(L('可用','Available'),avail,nm,'var(--o2)','mg'),
      nc==='good'?L('存量夠撐到天光。','Enough oxygen to last until morning.'):nc==='warn'?L('天亮前溶氧會降得很低，留意敏感的蝦。','Oxygen will dip before dawn; watch sensitive shrimp.'):L('夜晚會缺氧！開氧氣泵、縮短熄燈時間或者減少動物。','It will run out at night: add a pump, shorten darkness or remove animals.')));
    if(wIn>0){const r2=(cap+upt)/wIn,m2=Math.max(wIn,cap+upt,.01);
      out.push(bud(rate(r2),pre+L('排泄物（氨，每日）','Ammonia per day'),fx(r2,2)+'×',pairRow(L('產生','Made'),wIn,m2,'var(--warn)','mg')+pairRow(L('處理','Removed'),cap+upt,m2,'var(--leaf)','mg'),
        (r2>=1.2?L('硝化菌和水草處理得來。','Bacteria and plants keep up.'):r2>=.8?L('剛剛好，餵多了就會累積氨。','Just enough; overfeeding will build ammonia.'):L('氨會累積：加硝化菌、底沙、石頭或者開過濾。','Ammonia will build up: add bacteria, substrate, rock or a filter.'))+`<br><span class="lede">${L('細菌附著面','Bacteria surface')} ×${fx(E.surf,2)}${S.filter?L('，過濾器幫忙',', filter helping'):''}</span>`));}
    if(need>0){const algaeDay=S.hist.slice(-24).reduce((s,h)=>s+(h.grown||0),0),sup=feedW+algaeDay+c.detritus*.1,r3=sup/need,m3=Math.max(need,sup,.1);
      out.push(bud(rate(r3),pre+L('食物（每日）','Food per day'),fx(r3,2)+'×',pairRow(L('需要','Needed'),need,m3,'var(--muted)',L('份',''))+pairRow(L('供應','Supplied'),sup,m3,'var(--accent)',L('份','')),
        r3>=1.2?L('食物夠。','Enough food.'):r3>=.8?L('食物勉強夠。','Barely enough food.'):L('不夠吃：增加餵食，或者選吃藻的蝦和螺。','Not enough: feed more, or choose algae-eating shrimp and snails.')));}
  }
  if(!aq){
    const P=alive.filter(i=>!isWater(i)&&CAT[i.type].kind==='plant'),A=alive.filter(i=>!isWater(i)&&CAT[i.type].kind==='animal'),M=alive.filter(i=>i.type==='soilmic');
    let o2In=0,o2Out=0,wIn=0,need=0,eatW=0;
    P.forEach(it=>{const p=it.params;o2In+=p.o2Prod*it.health*L24*lm;o2Out+=p.resp*Math.max(.3,it.health)*q*24;});
    A.forEach(it=>{const p=it.params,C=CAT[it.type];o2Out+=p.resp*q*24;if(!(C.hab==='amph'&&wL>0))wIn+=p.wasteAmt*24/p.wasteEvery;if(C.diet.feed&&!C.diet.waste)need+=p.food;if(C.diet.waste)eatW+=p.food*.6;});
    M.forEach(it=>{o2Out+=it.params.rate*24*it.params.o2Per;});
    const cap=M.reduce((s,i)=>s+i.params.rate*24*i.health*E.surf,0)+eatW+c.waste*.12;
    if(o2Out>0){const r=o2In/o2Out,mx=Math.max(o2In,o2Out,1);let cls=rate(r,1.1,.9);if(!S.sealed)cls=r>=.5?'good':'warn';
      out.push(bud(cls,L('陸地 · 氧氣和二氧化碳','Land · O₂ and CO₂'),fx(r,2)+'×',pairRow(L('植物產氧','Plants make'),o2In,mx,'var(--o2)','mg')+pairRow(L('全部耗氧','All use'),o2Out,mx,'var(--muted)','mg'),
        S.sealed?(r>=1.1?L('密封也可以：植物吃走的二氧化碳多於動物呼出的。','Works sealed: plants remove more CO₂ than animals exhale.'):L('密封會令二氧化碳不斷上升，要開網蓋或加植物。','Sealed, CO₂ keeps rising: open the mesh lid or add plants.')):L('開了口，空氣會自然交換。','The lid is open, so air exchanges naturally.')));}
    if(wIn>0){const r2=cap/wIn,m2=Math.max(wIn,cap,.01);
      out.push(bud(rate(r2),L('陸地 · 排泄物（每日）','Land · droppings per day'),fx(r2,2)+'×',pairRow(L('產生','Made'),wIn,m2,'var(--warn)',L('份',''))+pairRow(L('分解','Broken down'),cap,m2,'var(--leaf)',L('份','')),
        r2>=1.2?L('分解者處理得切。','Decomposers keep up.'):L('排泄物會堆積、生霉：加土壤菌群、鼠婦或者泥土。','Droppings will pile up and mould: add soil microbes, isopods or soil.')));}
    if(need>0){const fl=S.feed*(()=>{const fw=alive.filter(i=>isWater(i)&&CAT[i.type].kind==='animal'&&CAT[i.type].diet.flake).reduce((s,i)=>s+i.params.food,0);return need/(need+fw||1);})(),r3=fl/need,m3=Math.max(need,fl,.1);
      out.push(bud(rate(r3),L('陸地 · 食物（每日）','Land · food per day'),fx(r3,2)+'×',pairRow(L('需要','Needed'),need,m3,'var(--muted)',L('份',''))+pairRow(L('餵食','Fed'),fl,m3,'var(--accent)',L('份','')),r3>=1.2?L('夠吃。','Enough food.'):r3>=.8?L('勉強夠。','Barely enough.'):L('不夠吃，增加每日餵食。','Not enough: feed more.')));}
    const hr2=rangeOf('hum',A);if(hr2){const ok=c.hum>=hr2[0]&&c.hum<=hr2[1],bad=hr2[0]>hr2[1];
      out.push(bud(bad?'bad':ok?'good':'warn',L('濕度','Humidity'),`${fx(c.hum,0)}%`,rangeRow(L('舒適','Comfort'),hr2[0],hr2[1],c.hum,0,100,'%'),
        bad?L('動物之間沒有共同適合的濕度，例如守宮怕太濕、箭毒蛙要很濕。','No humidity suits every animal; a gecko dislikes damp but a dart frog needs it.'):ok?L('濕度適合。','Humidity is right.'):c.hum<hr2[0]?L('太乾：加噴霧、密封或者加水位。','Too dry: mist more, seal it or add water.'):L('太濕：打開網蓋、減噴霧或者開加熱燈。','Too humid: open the lid, mist less or use the heat lamp.')));}
    if(A.some(i=>CAT[i.type].hab==='amph')&&!(wL>0))out.push(bud('bad',L('水區','Water area'),L('沒有','none'),'',L('兩棲動物一定要有水，在「加入」提高水位。','Amphibians need water: raise the water level in the Add tab.')));
  }
  const tr2=rangeOf('t');if(tr2){const ok=c.T>=tr2[0]&&c.T<=tr2[1],bad=tr2[0]>tr2[1];
    out.push(bud(bad?'bad':ok?'good':'warn',L('溫度','Temperature'),`${fx(c.T)}°C`,rangeRow(L('舒適','Comfort'),tr2[0],tr2[1],c.T,0,40,'°C'),
      bad?L('動物沒有一個共同適合的溫度，要重新選擇生物。','No temperature suits every animal; rethink the mix.'):ok?L('溫度在全部動物都舒服的範圍。','Every animal is comfortable.'):c.T<tr2[0]?L('太冷：開加熱棒或者加熱燈。','Too cold: use a heater or heat lamp.'):L('太熱：搬離陽光或者打開瓶口。','Too hot: move out of the sun or open the lid.')));}
  return out;
}
function renderBalance(){
  const aq=S.mode==='aqua',wL=wLOf(S);
  if(aq&&!wL){$('#pane-bal').innerHTML=`<div class="verdict"><div><b>${L('未注水','No water yet')}</b>${L('可以先鋪底沙、擺石頭，再在「加入」注水。','Lay substrate and stones, then fill it from the Add tab.')}</div></div>`;return;}
  const anyLife0=S.items.some(i=>i.alive&&['plant','animal'].includes(CAT[i.type].kind));
  if(!anyLife0){$('#pane-bal').innerHTML=`<p class="lede compactnote">${L('還沒有生物，加入植物或者動物之後才有平衡分析。','Nothing living yet. Add plants or animals to see the balance.')}</p>`;return;}
  const items=budgets(),fc=forecast(72);
  const bads=items.filter(x=>x.cls==='bad').length+(fc.deaths.length?1:0),warns=items.filter(x=>x.cls==='warn').length;
  const anyLife=S.items.some(i=>i.alive&&['plant','animal'].includes(CAT[i.type].kind));
  let vt,vb;
  if(!anyLife){vt=L('還沒有生物','Nothing living yet');vb=L('到「加入」由造景開始佈置，再放植物和動物。','Start with hardscape in the Add tab, then plants and animals.');}
  else if(!bads&&!warns){vt=S.sealed?L('可以長期密封自給自足','Can run sealed indefinitely'):L('生態平衡','Balanced');vb=L('氧氣、排泄物和食物循環都閉合得到。','The oxygen, waste and food cycles all close.');}
  else if(!bads){vt=L('基本平衡，有些邊緣','Mostly balanced');vb=L('可以運作，但留意黃色項目。','It works, but watch the amber items.');}
  else{vt=L('未能自給自足','Not self-sustaining');vb=L(`有 ${bads} 項不平衡。跟著紅色項目調整，或者按「一鍵平衡」。`,`${bads} item${bads>1?'s are':' is'} out of balance. Fix the red items or tap Auto-balance.`);}
  const reasons=Object.entries(fc.stress).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([r,n])=>L(`${SS(r)}（${n} 隻·小時）`,`${SS(r)} (${n} animal-hours)`)).join(L('、',', '));
  const parts=[];
  if(wL>0)parts.push(L(`水中溶氧最低 ${fx(fc.mn.wo2)} mg/L，氨最高 ${fx(fc.mx.wnh3,2)} mg/L`,`water O₂ low ${fx(fc.mn.wo2)} mg/L, ammonia high ${fx(fc.mx.wnh3,2)} mg/L`));
  if(!aq)parts.push(L(`空氣 O₂ 最低 ${fx(fc.mn.ao2)}%，CO₂ 最高 ${fx(fc.mx.co2,0)} ppm，濕度 ${fx(fc.mn.hum,0)}–${fx(fc.mx.hum,0)}%，霉菌最高 ${fx(fc.mx.mould)}`,`air O₂ low ${fx(fc.mn.ao2)}%, CO₂ high ${fx(fc.mx.co2,0)} ppm, humidity ${fx(fc.mn.hum,0)}–${fx(fc.mx.hum,0)}%, mould high ${fx(fc.mx.mould)}`));
  parts.push(L(`溫度 ${fx(fc.mn.T)}–${fx(fc.mx.T)}°C`,`temperature ${fx(fc.mn.T)}–${fx(fc.mx.T)}°C`));
  const R=S.report;
  $('#pane-bal').innerHTML=`${reportHtml()}
    <div class="verdict"><div><b>${vt}</b>${vb}</div><button class="btn magic" id="balBtn2" style="align-self:flex-start">${L('一鍵平衡','Auto-balance')}</button></div>
    <div class="bud ${fc.deaths.length?'bad':reasons?'warn':'good'}"><div class="bh"><b>${L('預測未來 3 日','Next 3 days')}</b><span>${S.wxMode==='auto'?L('以多雲天氣','assuming cloudy'):N(WX[S.wxMode].n)}</span></div>
      <p>${fc.deaths.length?L(`會有 ${fc.deaths.length} 個生物死亡：`,`${fc.deaths.length} will die: `)+[...new Set(fc.deaths.map(d=>N(CAT[d.type].name)+L('（','(')+SS(d.why)+L('）',')')))].join(L('、',', '))+L('。','.'):L('沒有生物會死。','Nothing dies.')}${reasons?' '+L('受壓原因：','Stress: ')+reasons+L('。','.'):''}<br><span class="lede">${parts.join(L('；','; '))}</span></p></div>
    <div class="budget">${items.map((b,i)=>b.html.replace('<div class="bud','<div id="bud-'+i+'" class="bud')).join('')}</div>
    <div class="chartbox"><h3>${L(`走勢（最近 ${Math.min(S.hist.length,168)} 小時）`,`Trend (last ${Math.min(S.hist.length,168)} h)`)}</h3><canvas id="chart"></canvas>
    <div class="legend">${aq?`<span><i style="background:var(--o2)"></i>${L('溶氧 mg/L（左）','Dissolved O₂ mg/L (left)')}</span><span><i style="background:var(--warn)"></i>${L('氨 mg/L（右）','Ammonia mg/L (right)')}</span>`:`<span><i style="background:var(--o2)"></i>${L('濕度 %（左）','Humidity % (left)')}</span><span><i style="background:var(--warn)"></i>${L('溫度 °C（右）','Temperature °C (right)')}</span>`}<span><i style="background:var(--line);height:8px"></i>${L('夜間','Night')}</span></div></div>
    <section><h3 style="margin-bottom:6px">${L('事件紀錄','Event log')}</h3>${S.log.length?`<ul class="log">${S.log.slice(0,16).map(l=>`<li><span class="tm">${L(`第${l.d}日`,`Day ${l.d}`)} ${String(l.h).padStart(2,'0')}:00</span><span style="color:var(--${l.c==='muted'?'muted':l.c})">${esc(N(l.t))}</span></li>`).join('')}</ul>`:`<p class="lede">${L('暫時沒有事發生。','Nothing has happened yet.')}</p>`}</section>`;
  $('#balBtn2').onclick=()=>$('#balBtn').click();bindReport();
  drawChart();
}
function drawChart(){
  const cv=$('#chart');if(!cv)return;const w=cv.clientWidth,h=cv.clientHeight||170,dpr=Math.min(devicePixelRatio,2);cv.width=w*dpr;cv.height=h*dpr;
  const x=cv.getContext('2d');x.scale(dpr,dpr);const cs=getComputedStyle(document.documentElement);const col=k=>cs.getPropertyValue(k).trim();
  const H=S.hist.slice(-168),pl=30,pr=34,pt=8,pb=18,iw=w-pl-pr,ih=h-pt-pb;
  x.font='10px '+col('--f-mono');x.fillStyle=col('--muted');
  if(H.length<2){x.fillText(L('模擬緊，等一陣…','Simulating…'),pl,h/2);return;}
  const aq=S.mode==='aqua';
  const k1=aq?'wo2':'hum',max1=aq?14:100,ticks1=aq?[0,4,8,12]:[0,25,50,75,100];
  const k2=aq?'wnh3':'T',max2=aq?Math.max(1,Math.ceil(Math.max(...H.map(p=>p.wnh3||0))*2)/2):40;
  const X=i=>pl+i/(H.length-1)*iw,Y1=v=>pt+ih-clamp(v/max1,0,1)*ih,Y2=v=>pt+ih-clamp(v/max2,0,1)*ih;
  x.fillStyle=col('--line');x.globalAlpha=.5;H.forEach((p,i)=>{if(!p.light)x.fillRect(X(i)-iw/(H.length-1)/2,pt,iw/(H.length-1)+.5,ih);});x.globalAlpha=1;
  x.strokeStyle=col('--line');x.lineWidth=1;x.fillStyle=col('--muted');x.textAlign='right';
  ticks1.forEach(v=>{x.beginPath();x.moveTo(pl,Y1(v));x.lineTo(pl+iw,Y1(v));x.stroke();x.fillText(v,pl-5,Y1(v)+3);});
  x.textAlign='left';[0,max2/2,max2].forEach(v=>x.fillText(fx(v,aq?2:0),pl+iw+5,Y2(v)+3));
  if(aq){x.strokeStyle=col('--bad');x.setLineDash([3,3]);x.beginPath();x.moveTo(pl,Y1(3));x.lineTo(pl+iw,Y1(3));x.stroke();x.setLineDash([]);}
  const line=(k,Y,c)=>{x.strokeStyle=c;x.lineWidth=2;x.beginPath();H.forEach((p,i)=>i?x.lineTo(X(i),Y(p[k]||0)):x.moveTo(X(i),Y(p[k]||0)));x.stroke();
    const l=H[H.length-1];x.fillStyle=c;x.beginPath();x.arc(X(H.length-1),Y(l[k]||0),3,0,7);x.fill();};
  line(k1,Y1,col('--o2'));line(k2,Y2,col('--warn'));
  x.fillStyle=col('--muted');x.textAlign='center';x.fillText(L(`${H.length} 小時前`,`${H.length} h ago`),pl+30,h-4);x.fillText(L('現在','now'),pl+iw-10,h-4);
}

/* ================= 環境 ================= */
function loadPreset(key){
  const p=PRESETS[S.mode][key];camStop();S.items.forEach(i=>disposeObj(i.g));S.items=[];S.sel=null;S.uid=1;S.report=null;
  S.terra=null;S.build=false;
  Object.assign(S,{V:p.V,shape:p.shape,mat:p.mat||'glass',sealed:p.sealed,light:p.light,feed:p.feed,pump:!!p.pump,filter:!!p.filter,heater:!!p.heater,fan:!!p.fan,wc:p.wc||0,mist:p.mist||0,heat:!!p.heat,
    region:p.region||'hk',real:false,chal:null,deathN:0,water:p.water||'fresh',filled:p.filled!==false,level:p.level||0,hillH:p.hillH??6,log:[],hour:6,day:1});
  p.items.forEach(([t,n,par])=>{for(let i=0;i<n;i++){const it=makeItem(t,par);it.n=nextN(t);S.items.push(it);}});
  buildJar({keepChem:true});resetChem(S);renderAll();save();toast(L('已載入：','Loaded: ')+N(p.n));
}
function shapeIcon(k){const sh=SHAPES[k];
  if(sh.box)return`<svg viewBox="0 0 40 50" aria-hidden="true"><rect x="5" y="${46-sh.H/2.7*40}" width="30" height="${sh.H/2.7*40}" rx="1"/></svg>`;
  const pts=shapeSamples(sh).map(p=>[p.x*sh.R*14,46-p.y*sh.H/2.7*40]);
  const d='M'+pts.map(([x,y])=>`${(20+x).toFixed(1)} ${y.toFixed(1)}`).join('L')+'L'+[...pts].reverse().map(([x,y])=>`${(20-x).toFixed(1)} ${y.toFixed(1)}`).join('L')+'Z';
  return`<svg viewBox="0 0 40 50" aria-hidden="true"><path d="${d}"/></svg>`;}
const matHex=k=>'#'+MATS[k].c.toString(16).padStart(6,'0');
let envAdv=pref.get('ecojar.envAdv')==='1'; // 環境設定：false＝簡易（預設），true＝進階
function renderEnv(){
  const aq=S.mode==='aqua',wL=wLOf(S);
  const sw=(id,on,t,d)=>`<label class="switch" for="${id}"><span><b>${t}</b><br><span class="lede">${d}</span></span><input type="checkbox" id="${id}" ${on?'checked':''}></label>`;
  const sl=(id,l,v,min,max,step,u,h)=>`<div class="field param"><div class="ph"><label for="${id}">${l}</label><output id="o${id}">${v} ${u}</output></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${v}"><small>${h}</small></div>`;
  const hasW=aq?S.filled:S.level>0,adv=x=>`<div data-adv>${x}</div>`;
  $('#pane-env').innerHTML=`
   <div class="envmode"><b>${L('顯示設定','Show settings')}</b><div class="seg" role="group" aria-label="${L('顯示設定','Show settings')}"><button data-envm="0" aria-pressed="${!envAdv}">${L('簡易','Simple')}</button><button data-envm="1" aria-pressed="${envAdv}">${L('進階','Advanced')}</button></div><span class="lede">${envAdv?L('顯示全部設定','Showing every setting'):L('只顯示常用設定；形狀、材質、天氣、風扇、換水等等在「進階」','Common settings only; shape, material, weather, fan, water changes and more are under Advanced')}</span></div>
   ${paneTagBar('env',ENV_TAGS)}
   <div class="field" data-sec="jar"><label for="e-name"><b>${L('這個瓶的名','Name of this jar')}</b></label><input type="text" id="e-name" class="txt" maxlength="16" value="${esc(S.jarName)}" placeholder="${esc(jarNames()[S.cur])}"></div>
   <section class="field" data-sec="place"><h3>${L('地區氣候','Region')}</h3>
     <p class="subhead">${L('城市／地方（可以自訂）','Cities and places (customisable)')}</p>
     <div class="opts">${Object.entries(REGIONS).filter(([,r])=>r.type==='city').map(([k,r])=>{const rr=r.custom?regionOf({region:'custom'}):r;return`<button class="opt" data-region="${k}" aria-pressed="${S.region===k}"><span>${esc(N(rr.n))}</span><em>${rr.t}°C · ${rr.hum}%</em></button>`;}).join('')}</div>
     ${S.region==='custom'?customRegionHtml():''}
     <p class="subhead" data-adv>${L('真實生態地域','Real biomes')} · ${N({aqua:['水族','aquatic'],rain:['雨林','rainforest'],palu:['水陸','paludarium']}[modeKey()])}</p>
     <div class="opts" data-adv>${Object.entries(REGIONS).filter(([k,r])=>r.type==='biome'&&(r.modes.includes(modeKey())||S.region===k)).map(([k,r])=>{const lk=S.region!==k&&lockOf('region',k);return`<button class="opt" data-region="${k}" aria-pressed="${S.region===k}" ${lk?`disabled title="${esc(lockText(lk))}"`:''}><span>${lk?'🔒 ':''}${N(r.n)}</span><em>${lk?esc(N(lk.t)):`${r.t}°C · ${r.hum}%`}</em></button>`;}).join('')}</div>
     <small class="lede">${N(regionOf(S).d)} ${L(`平均 ${regionOf(S).t}°C，日夜溫差 ${regionOf(S).sw}°C，濕度 ${regionOf(S).hum}%。`,`Average ${regionOf(S).t}°C, day–night swing ${regionOf(S).sw}°C, humidity ${regionOf(S).hum}%.`)}</small></section>
   <section class="field" data-sec="place" data-adv><h3>${L('天氣','Weather')}</h3><div class="opts">${[['auto',['自動','Auto']],...Object.entries(WX).filter(([k])=>regionOf(S).w[k]>0).map(([k,w])=>[k,w.n])].map(([k,n])=>`<button class="opt" data-wx="${k}" aria-pressed="${S.wxMode===k}"><span>${N(n)}</span></button>`).join('')}</div>
     <small class="lede">${L('瓶子放在窗邊：天氣會改變光照和溫度；開口時下雨會沖淡氨、提高濕度；雷暴會打雷閃電。','The jar sits by a window: weather changes light and temperature; rain dilutes ammonia and raises humidity when open; storms bring lightning.')}</small></section>
   ${aq?`<section class="field" data-sec="water"><h3>${L('水質','Water type')}</h3><div class="opts">${[['fresh',['淡水','Fresh']],['salt',['海水','Salt']]].map(([k,n])=>{const lk=k==='salt'&&S.water!=='salt'&&lockOf('feature','salt');return`<button class="opt" data-water="${k}" aria-pressed="${S.water===k}" ${lk?`disabled title="${esc(lockText(lk))}"`:''}><span>${lk?'🔒 ':''}${N(n)}</span>${lk?`<em>${esc(N(lk.t))}</em>`:''}</button>`;}).join('')}</div><small class="lede">${L('海馬、海月水母、寄居蟹和海葡萄要海水；其他淡水生物放入海水會死。','Seahorses, moon jellies, hermit crabs and sea grapes need salt water; freshwater life dies in it.')}</small></section>`:''}
   <section class="field" data-sec="jar" data-adv><h3>${L('瓶形狀','Shape')}</h3><div class="opts">${Object.entries(SHAPES).map(([k,sh])=>`<button class="opt" data-shape="${k}" aria-pressed="${S.shape===k}">${shapeIcon(k)}<span>${N(sh.n)}</span></button>`).join('')}</div>
     <small class="lede">${L(`開口越窄，打開蓋時換氣越慢。現在開口換氣效率：${Math.round(J.open*100)}%`,`A narrower neck exchanges less air when open. Current opening efficiency: ${Math.round(J.open*100)}%`)}</small></section>
   <section class="field" data-sec="jar" data-adv><h3>${L('瓶材質','Material')}</h3><div class="opts">${Object.entries(MATS).map(([k,m])=>`<button class="opt" data-mat="${k}" aria-pressed="${S.mat===k}"><i class="sw" style="background:${matHex(k)};opacity:${Math.min(1,m.op*2.5+.3)}"></i><span>${N(m.n)}</span><em>${L('透光','light')} ${Math.round(m.tr*100)}%</em></button>`).join('')}</div>
     <small class="lede">${N(MATS[S.mat].n)}${L('：','. ')}${N(MATS[S.mat].d)}${L('。透光率會直接乘落光合作用。','. Light transmission scales photosynthesis directly.')}</small></section>
   <div data-sec="jar">${sl('e-V',L('瓶容量','Volume'),S.V,1,30,1,'L',L('越大越穩定，變化越慢。','Bigger is more stable and changes more slowly.'))}</div>
   <div data-sec="care">${sl('e-L',L('每日光照','Light per day'),S.light,0,24,1,L('小時','h'),L('朝早 7 點開燈。光照長產氧多，但藻類都長得快。','Lights come on at 7 am. More light means more oxygen, and faster algae.'))}
   ${sl('e-F',L('每日餵食','Food per day'),S.feed,0,10,.5,L('份',''),L('每朝 9 點投放飼料；吃不完會腐爛。','Food goes in at 9 am; leftovers rot.'))}</div>
   <div data-sec="water">${aq?sw('e-W',S.filled,L('已注水','Filled with water'),L('抽乾會令水中生物死亡；新注的水還沒有細菌。','Draining kills water life; fresh water has no bacteria.'))
     :sl('e-Lv',L('水位','Water level'),S.level,0,14,1,'cm',L(`0 = 純陸缸。有泥土土坡時，前面低處是水區。現在約 ${fx(S.wL)} L 水、佔地面 ${Math.round(S.wFrac*100)}%。`,`0 = land only. With a soil slope, the low front is water. Now about ${fx(S.wL)} L covering ${Math.round(S.wFrac*100)}% of the floor.`))
      +(S.terra?'':adv(sl('e-Hill',L('土坡高度','Slope height'),S.hillH,0,14,1,'cm',L('要有泥土才有土坡；後面高、前面低。想自己選位就用「自訂造景」。','Needs soil; high at the back, low at the front. Use Build to shape it yourself.'))))}</div>
   <div data-sec="water">${hasW?sw('e-P',S.pump,L('氧氣泵','Air pump'),L('打氣入水，補氧和趕走 CO₂。','Bubbles air into the water, adding O₂ and removing CO₂.'))+sw('e-Fi',S.filter,L('過濾','Filter'),L('海綿裡面住了大量硝化菌，分解氨和隔走殘渣。','The sponge hosts lots of bacteria that remove ammonia and trap detritus.'))
     +sw('e-Ht',S.heater,L('加熱棒','Heater'),L('保持水溫，熱帶魚需要。','Keeps the water warm for tropical fish.'))
     +adv(sl('e-WC',L('每週換水','Weekly water change'),S.wc,0,50,5,'%',L('每 7 日朝早 10 點換水，沖淡氨和硝酸鹽。','Every 7 days at 10 am, diluting ammonia and nitrate.'))):''}</div>
   <div data-sec="care" data-adv>${sw('e-Fan',S.fan,L('風扇','Fan'),S.sealed?L('對住水面或者瓶口吹，靠蒸發降溫約 2–3°C。現在是密封的，要開蓋才有效。','Blows across the water or opening to cool it by 2–3°C through evaporation. The jar is sealed now, so it only works once the lid is open.'):L('對住水面或者瓶口吹，靠蒸發降溫約 2–3°C，空氣會稍為乾燥。','Blows across the water or opening to cool it by 2–3°C through evaporation; the air gets a little drier.'))}</div>
   <div data-sec="care">${aq?'':sl('e-M',L('每日噴霧','Misting per day'),S.mist,0,6,1,L('次','×'),L('每次噴霧立即提高濕度。','Each misting raises humidity at once.'))+adv(sw('e-H',S.heat,L('加熱燈','Heat lamp'),L('開燈時加熱約 5°C，同時令空氣乾燥一點。','Adds about 5°C while lit and dries the air.')))}</div>
   <div data-sec="jar">${sw('e-S',S.sealed,aq?L('密封瓶口','Sealed'):L('密封（不用網蓋）','Sealed (no mesh lid)'),aq?L('密封＝完全靠瓶內循環；開口＝空氣會補氧。','Sealed relies on its own cycles; open lets air add oxygen.'):L('密封＝濕度高、空氣不流通；網蓋＝通風。','Sealed keeps humidity high but traps air; a mesh lid ventilates.'))}
   ${sw('e-Real',S.real,L('這是真實的瓶','This is a real tank'),L('一鍵平衡只會給建議，不會自動改或者刪任何東西。','Auto-balance only suggests; it never changes or removes anything.'))}</div>
   <div data-sec="care" data-adv>${sw('e-B',S.breed,L('生物繁殖','Breeding'),L('健康、吃得飽、有伴的動物會生BB，BB會慢慢長大。','Healthy, well-fed animals with a partner have young that grow up.'))}</div>
   <section class="presets" data-sec="preset"><h3>${L('預設組合','Presets')}</h3><p class="lede">${L(`這個模式有 ${Object.keys(PRESETS[S.mode]).length} 個預設，亦可以在頂部「預設組合」選。`,`${Object.keys(PRESETS[S.mode]).length} presets for this mode; also under Presets at the top.`)}</p></section>
   <div class="ed-actions" data-sec="preset"><button class="btn primary" id="e-presets">${L('選預設組合','Choose a preset')}</button><button class="btn" id="e-restart" data-adv>${L('保留生物，重新開始時間','Keep everything, restart time')}</button></div>`;
  $('#pane-env').classList.toggle('simple',!envAdv);
  $('#pane-env').querySelectorAll('[data-envm]').forEach(b=>b.onclick=()=>{envAdv=b.dataset.envm==='1';pref.set('ecojar.envAdv',envAdv?'1':'0');renderEnv();});
  const bind=(id,f,u)=>{const e=$('#'+id);if(!e)return;e.oninput=()=>{$('#o'+id).textContent=e.value+' '+u;f(+e.value,false);save();};e.onchange=()=>f(+e.value,true);};
  bind('e-V',(v,done)=>{if(!done)return;const r=v/S.V;['O2','CO2','NH3','NO3','aO2','aCO2','waste'].forEach(k=>{if(S.c[k]!=null)S.c[k]*=r;});S.V=v;buildJar({keepChem:S.mode==='aqua'});renderEnv();},'L');
  bind('e-L',v=>S.light=v,L('小時','h'));bind('e-F',v=>S.feed=v,L('份',''));bind('e-M',v=>S.mist=v,L('次','×'));bind('e-WC',v=>S.wc=v,'%');
  bind('e-Lv',(v,done)=>{if(done)setLevel(v);},'cm');
  bind('e-Hill',(v,done)=>{S.hillH=v;if(done){buildJar({keepCam:true});renderEnv();}},'cm');
  const chk=(id,k)=>{const e=$('#'+id);if(e)e.onchange=()=>{S[k]=e.checked;save();};};
  chk('e-Real','real');const er=$('#e-Real');if(er)er.addEventListener('change',()=>{renderAll();toast(S.real?L('真實的瓶：所有生物和設定都可以使用，只作分析','Real tank: every species and setting is available, for analysis only'):L('轉回模擬瓶','Back to a simulated jar'));});chk('e-P','pump');chk('e-Fi','filter');chk('e-Ht','heater');chk('e-Fan','fan');chk('e-H','heat');chk('e-S','sealed');{const es=$('#e-S');if(es)es.addEventListener('change',renderEnv);}chk('e-B','breed');
  const ew=$('#e-W');if(ew)ew.onchange=()=>fillWater(ew.checked);
  const en=$('#e-name');en.oninput=()=>{S.jarName=en.value.trim().slice(0,16);renderJarSeg();save();};
  const pe=$('#pane-env');bindPaneTags('env',pe);bindCustomRegion();
  pe.querySelectorAll('[data-region]').forEach(b=>b.onclick=()=>{S.region=b.dataset.region;if(S.wxMode!=='auto'&&!(regionOf(S).w[S.wxMode]>0))S.wxMode='auto';if(!(regionOf(S).w[S.wx]>0))S.wx=typicalWx(S.region);renderEnv();renderMeters();save();toast(L('地區：','Region: ')+N(regionOf(S).n));});
  pe.querySelectorAll('[data-wx]').forEach(b=>b.onclick=()=>{S.wxMode=b.dataset.wx;if(S.wxMode!=='auto')S.wx=S.wxMode;renderEnv();save();toast(S.wxMode==='auto'?L('天氣自動變化','Weather changes on its own'):L('天氣固定為','Weather fixed to ')+N(WX[S.wx].n));});
  pe.querySelectorAll('[data-water]').forEach(b=>b.onclick=()=>{S.water=b.dataset.water;renderAll();save();toast(S.water==='salt'?L('已轉為海水','Switched to salt water'):L('已轉為淡水','Switched to fresh water'));});
  pe.querySelectorAll('[data-shape]').forEach(b=>b.onclick=()=>{S.shape=b.dataset.shape;buildJar();renderEnv();renderJarList();renderEditor();save();toast(L('已換成','Changed to ')+N(SHAPES[S.shape].n));});
  pe.querySelectorAll('[data-mat]').forEach(b=>b.onclick=()=>{S.mat=b.dataset.mat;buildJar({keepCam:true});renderEnv();save();toast(L('已換成','Changed to ')+N(MATS[S.mat].n));});
  $('#e-presets').onclick=()=>$('#presetBtn').click();
  $('#e-restart').onclick=()=>{S.items=S.items.filter(i=>{if(!i.alive){disposeObj(i.g);return false;}return true;});resetChem(S);S.hour=6;S.day=1;S.log=[];S.items.forEach(i=>{i.health=1;i.satiety=1;});renderAll();toast(L('時間重新開始','Time restarted'));};
}
function renderAll(){if(S.build)renderBuildBar();if(typeof renderOv==='function'){renderOv();renderIssuePop();}if(popIt)renderPop();renderChrome();renderJarSeg();renderModeSeg();renderSpeed();renderCatalog();renderJarList();renderEditor();renderEnv();renderMeters();if(ovOpen.L)renderBalance();}

/* ================= 三個瓶 & 儲存 ================= */
const SNAP_KEYS=['customRegion','terra','region','real','mode','V','shape','mat','sealed','light','feed','pump','filter','heater','fan','wc','mist','heat','water','filled','level','hillH','breed','wxMode','wx','hour','day','chal','deathN'];
function snapshot(){if(S.terra)delete S.terra._info;const o={name:S.jarName,c:Object.assign({},S.c),log:S.log.slice(0,40),hist:S.hist.slice(-120),
  items:S.items.filter(i=>i.alive).map(i=>({type:i.type,params:i.params,name:i.name||'',n:i.n,health:+i.health.toFixed(3),satiety:+i.satiety.toFixed(3),rx:+i.rx.toFixed(3),rz:+i.rz.toFixed(3),age:i.age,up:i.userPlaced?1:0}))};
  SNAP_KEYS.forEach(k=>o[k]=S[k]);return o;}
function restoreSnap(d){
  camStop();S.items.forEach(i=>disposeObj(i.g));S.items=[];S.sel=null;S.report=null;
  SNAP_KEYS.forEach(k=>{if(d[k]!==undefined)S[k]=d[k];});S.jarName=d.name||'';if(d.fan===undefined)S.fan=false;if(d.chal===undefined)S.chal=null;if(d.deathN===undefined)S.deathN=0;
  if(S.terra){S.terra=JSON.parse(JSON.stringify(S.terra));delete S.terra._info;}S.build=false;
  if(!SHAPES[S.shape])S.shape='jar';if(!MATS[S.mat])S.mat='glass';if(!PRESETS[S.mode])S.mode='aqua';if(S.wxMode!=='auto'&&!WX[S.wxMode])S.wxMode='auto';if(!WX[S.wx])S.wx='sunny';
  (d.items||[]).forEach(o=>{if(!CAT[o.type])return;const it=makeItem(o.type,o.params);Object.assign(it,{n:o.n||nextN(o.type),name:o.name||'',health:o.health??1,satiety:o.satiety??1});
    if(o.rx!=null){it.rx=o.rx;it.rz=o.rz;}if(o.age!=null)it.age=o.age;if(o.up)it.userPlaced=true;S.items.push(it);});
  buildJar({keepChem:true});resetChem(S);if(d.c)Object.assign(S.c,d.c);S.log=d.log||[];S.hist=d.hist||[];
}
const blankSnap=i=>({terra:null,name:'',region:'hk',real:false,mode:'aqua',V:4,shape:'jar',mat:'glass',sealed:false,light:12,feed:0,pump:false,filter:false,heater:false,fan:false,wc:0,mist:0,heat:false,water:'fresh',filled:false,level:0,hillH:6,breed:true,wxMode:'auto',wx:'sunny',hour:6,day:1,items:[]});
function switchJar(i){if(i===S.cur)return;{const lk=jarLock(i);if(lk){toast(lockText(lk));return;}}S.jars[S.cur]=snapshot();S.cur=i;restoreSnap(S.jars[i]||blankSnap(i));renderAll();save();toast(L('轉了去 ','Switched to ')+jarNames()[i]);}
const KEY='ecojar.v4';
let saveT;function save(){clearTimeout(saveT);saveT=setTimeout(()=>{try{const jars=S.jars.slice();jars[S.cur]=snapshot();S.jars=jars;localStorage.setItem(KEY,JSON.stringify({cur:S.cur,jars,ana:S.ana}));}catch(e){}},500);}
/* 舊版自動改嘅瓶名（「瓶 1」「瓶 1（分出）」「（試）」）清走，顯示返預設「瓶1」；自己改嘅名保留 */
function cleanJarName(n){if(!n)return'';const t=String(n).replace(/(（分出）|（試）| \(split\)| \(trial\))+$/,'');return /^(瓶 ?\d+|Jar \d+)$/.test(t)?'':t;}
function load(){
  {const l=pref.get('ecojar.lang');if(l==='en'||l==='zh')LANG=l;}
  try{const d=JSON.parse(localStorage.getItem(KEY)||'null');
    if(d&&Array.isArray(d.jars)){S.jars=[0,1,2].map(i=>{const j=d.jars[i]||null;if(j)j.name=cleanJarName(j.name);return j;});S.cur=clamp(d.cur|0,0,2);S.ana=d.ana||null;const j=S.jars[S.cur];if(j){restoreSnap(j);return true;}return false;}
    const o=JSON.parse(localStorage.getItem('ecojar.v2')||'null');
    if(o&&o.items&&PRESETS[o.mode]){const snap=Object.assign({},o,{name:'',level:o.mode==='rain'?0:0,items:o.items.filter(([t])=>CAT[t]).map(([type,params,name])=>({type,params,name}))});restoreSnap(snap);return true;}
  }catch(e){}
  return false;
}

/* ================= 分析現有水缸（介面） ================= */
function renderAnalyze(){
  const A=S.ana=Object.assign({},ANA_DEF,S.ana||{});A.counts=A.counts||{};A.obs=A.obs||{};if(!A.name)A.name=L('朋友的魚缸','A friend\'s tank');
  const rain=A.type==='rain',water=A.type==='salt'?'salt':'fresh';
  const spp=Object.entries(CAT).filter(([,c])=>['plant','animal'].includes(c.kind)&&(rain?c.w!=='salt'&&(c.m==='rain'||c.m==='both'):c.hab==='water'&&(c.w==='both'||c.w===water)));
  const ck=(k,l)=>`<label><input type="checkbox" data-a="${k}" ${A[k]?'checked':''}>${l}</label>`;
  const num=(k,l,u,ph)=>`<label>${l}${u?` (${u})`:''}<input type="number" step="any" min="0" data-a="${k}" value="${A[k]}" placeholder="${ph??L('不知道可以留空','Leave blank if unknown')}"></label>`;
  const OBS=rain?[['mould',['有白霉','White mould']],['dry',['植物乾黃','Plants drying out']],['wet',['玻璃長期很多水珠','Constant condensation']],['death',['最近有生物死','Recent deaths']],['appetite',['食慾差','Poor appetite']],['green',['水區變綠','Green water']]]
    :[['green',['水變綠／混濁','Green or cloudy water']],['gasp',['魚浮頭','Fish gasping at the surface']],['mould',['有白霉／白絲','White fuzz or mould']],['death',['最近有魚死','Recent deaths']],['appetite',['食慾差','Poor appetite']]];
  $('#pane-ana').innerHTML=`<p class="lede">${L('輸入你或者朋友現有水缸的資料。結果會分開「已知數據」、「觀察」、「規則推斷」和「模擬推測」，找出最值得關注的問題和下一步。不知道的可以留空。','Enter details of your own or a friend\'s tank. Results separate measured data, observations, rule-based checks and simulation, then rank what matters most and what to do next. Leave unknowns blank.')}</p>
   ${paneTagBar('ana',ANA_TAGS)}
   <div class="ana-grid" data-sec="basic"><label style="grid-column:1/-1">${L('缸名','Tank name')}<input type="text" data-a="name" maxlength="16" value="${esc(A.name)}"></label>
    <label>${L('地區','Region')}<select data-a="region"><optgroup label="${L('城市／地方','Cities and places')}">${Object.entries(REGIONS).filter(([,r])=>r.type==='city').map(([k,r])=>`<option value="${k}" ${A.region===k?'selected':''}>${esc(N(regionOf({region:k}).n))}</option>`).join('')}</optgroup><optgroup label="${L('真實生態地域','Real biomes')}">${Object.entries(REGIONS).filter(([,r])=>r.type==='biome').map(([k,r])=>`<option value="${k}" ${A.region===k?'selected':''}>${N(r.n)}</option>`).join('')}</optgroup></select></label>
    <label>${L('類型','Type')}<select data-a="type">${[['fresh',['淡水缸','Freshwater']],['salt',['海水缸','Saltwater']],['rain',['雨林／水陸缸','Rainforest / paludarium']]].map(([k,n])=>`<option value="${k}" ${A.type===k?'selected':''}>${N(n)}</option>`).join('')}</select></label>
    ${num('V',L('容量','Volume'),'L','')}${rain?num('waterL',L('水區水量','Water area'),'L',L('0 = 沒有水','0 = none')):''}${num('weeks',L('開缸多久','Tank age'),L('週','weeks'),'')}
    ${num('feed',L('每日餵食','Food per day'),L('份','portions'),'')}${num('light',L('每日開燈','Light per day'),L('小時','h'),'')}
    ${rain?num('mist',L('每日噴霧','Misting per day'),L('次','×'),''):num('wc',L('每週換水','Weekly water change'),'%','')}</div>
   <h3 data-sec="equip">${L('設備和造景','Equipment & hardscape')}</h3><div class="checks" data-sec="equip">${rain?ck('soil',L('有泥土','Soil'))+ck('rocks',L('有石頭／沉木','Rock / wood'))+ck('heat',L('加熱燈','Heat lamp'))+ck('sealed',L('密封（沒有網蓋）','Sealed'))+ck('pump',L('水區氧氣泵','Air pump'))+ck('filter',L('水區過濾','Filter'))
     :ck('pump',L('氧氣泵','Air pump'))+ck('filter',L('過濾','Filter'))+ck('heater',L('加熱棒','Heater'))+ck('sub',L('有底沙','Substrate'))+ck('rocks',L('有石頭／沉木','Rock / wood'))+ck('sealed',L('密封','Sealed'))}</div>
   <h3 data-sec="species">${L('有什麼生物？（填數量）','What lives in it? (counts)')}</h3><div class="spp" data-sec="species">${spp.map(([k,c])=>`<label class="sp"><span><span class="dot" style="background:${c.color}"></span> ${N(c.name)}</span><input type="number" min="0" max="50" data-c="${k}" value="${A.counts[k]||''}" placeholder="0"></label>`).join('')}</div>
   <h3 data-sec="test">${L('實測數據（有測先填）','Test results (if you have them)')}</h3><div class="ana-grid" data-sec="test">${(rain?num('hum',L('濕度','Humidity'),'%')+num('temp',L('溫度','Temperature'),'°C'):'')+(!rain||+A.waterL>0?num('nh3',L('氨 NH₃','Ammonia NH₃'),'mg/L')+num('no2',L('亞硝酸鹽 NO₂','Nitrite NO₂'),'mg/L')+num('no3',L('硝酸鹽 NO₃','Nitrate NO₃'),'mg/L')+num('ph','pH','')+(rain?'':num('temp',L('水溫','Water temp'),'°C')):'')}</div>
   <h3 data-sec="obs">${L('觀察到的情況','What you have noticed')}</h3><div class="checks" data-sec="obs">${OBS.map(([k,l])=>`<label><input type="checkbox" data-o="${k}" ${A.obs[k]?'checked':''}>${N(l)}</label>`).join('')}</div>
   <button class="btn primary" id="anaGo" style="align-self:flex-start">${L('分析這個缸','Analyse this tank')}</button>
   <div id="anaOut" class="anaout"></div>`;
  const pe=$('#pane-ana');bindPaneTags('ana',pe);
  pe.querySelectorAll('[data-a]').forEach(el=>{const k=el.dataset.a;const h=()=>{A[k]=el.type==='checkbox'?el.checked:el.type==='number'?(el.value===''?'':+el.value):el.value;save();};
    el.oninput=h;el.onchange=()=>{h();if(k==='type'||k==='waterL')renderAnalyze();};});
  pe.querySelectorAll('[data-c]').forEach(el=>el.oninput=()=>{const v=+el.value||0;if(v>0)A.counts[el.dataset.c]=Math.min(50,Math.round(v));else delete A.counts[el.dataset.c];save();});
  pe.querySelectorAll('[data-o]').forEach(el=>el.onchange=()=>{A.obs[el.dataset.o]=el.checked;save();});
  $('#anaGo').onclick=()=>{$('#anaOut').innerHTML=analyzeTank(A);bindAnaOut(A);$('#anaOut').scrollIntoView({behavior:'smooth',block:'start'});};
}
function analyzeTank(A){
  const rain=A.type==='rain',salt=A.type==='salt',types=Object.keys(A.counts||{}).filter(t=>CAT[t]);
  if(!types.length)return`<div class="empty">${L('請先填寫缸裡有哪些生物和數量。','Enter what lives in the tank first.')}</div>`;
  const animals=types.filter(t=>CAT[t].kind==='animal'),wL=rain?(+A.waterL||0):(+A.V||30);
  const issues=[],known=[];
  const add=(sev,title,why,steps,src)=>issues.push({sev,title,why,steps,src});
  const SRC={known:['已知數據','Measured'],obs:['觀察','Observed'],rule:['規則推斷','Rule check'],sim:['模擬推測','Simulation']};
  const rng=key=>{const a=animals.map(t=>CAT[t].params).filter(p=>p[key+'Min']!=null);if(!a.length)return null;return[Math.max(...a.map(p=>p[key+'Min'])),Math.min(...a.map(p=>p[key+'Max']))];};
  const kv=(l,v,u,sev,txt)=>known.push({l,v:`${v}${u}`,sev,txt});
  const hasW=!rain||wL>0;
  if(hasW){
    if(A.nh3!==''){const v=+A.nh3,s=v<=.02?'good':v<=.25?'warn':'bad';kv(L('氨 NH₃','Ammonia'),v,' mg/L',s,s==='good'?L('安全','Safe'):s==='warn'?L('偏高，要留意','Elevated, keep an eye on it'):L('危險，會中毒','Dangerous, toxic'));
      if(s!=='good')add(s,L('氨偏高','Ammonia is high'),L(`實測 ${v} mg/L。氨由排泄物和殘渣產生，硝化菌不夠就會累積。`,`Measured ${v} mg/L. Ammonia comes from waste and leftovers and builds up without enough bacteria.`),[L('立即換 30% 水（新水要去氯、和溫）','Change 30% of the water now (dechlorinated, same temperature)'),L('餵食減半，清走殘渣','Halve feeding and remove leftovers'),L('加硝化菌，或者檢查過濾有沒有洗得太乾淨','Add bacteria, or check the filter was not over-cleaned')],SRC.known);}
    if(A.no2!==''){const v=+A.no2,s=v<=.1?'good':v<=.5?'warn':'bad';kv(L('亞硝酸鹽 NO₂','Nitrite'),v,' mg/L',s,s==='good'?L('安全','Safe'):s==='warn'?L('偏高','Elevated'):L('危險，影響魚呼吸','Dangerous, stops fish breathing'));
      if(s!=='good')add(s,L('亞硝酸鹽偏高','Nitrite is high'),L(`實測 ${v} mg/L，代表硝化菌未穩定，新缸好常見。`,`Measured ${v} mg/L: the bacteria are not established yet, common in new tanks.`),[L('換 25–30% 水','Change 25–30% of the water'),L('暫停加新生物','Stop adding animals for now'),L('每天檢測，直到回落 0','Test daily until it reads 0')],SRC.known);}
    if(A.no3!==''){const v=+A.no3,lim=salt?[10,20]:[20,40],s=v<=lim[0]?'good':v<=lim[1]?'warn':'bad';kv(L('硝酸鹽 NO₃','Nitrate'),v,' mg/L',s,s==='good'?L('正常','Normal'):s==='warn'?L('偏高，藻類會多','Elevated, expect algae'):L('太高','Too high'));
      if(s!=='good')add(s,L('硝酸鹽偏高','Nitrate is high'),L(`實測 ${v} mg/L，換水不夠或者生物太多。`,`Measured ${v} mg/L: not enough water changes or too many animals.`),[L('加大每週換水比例','Change more water each week'),L('加快生長水草或者浮萍','Add fast-growing plants or duckweed')],SRC.known);}
    if(A.ph!==''&&animals.some(t=>CAT[t].ph)){const v=+A.ph,ws=animals.filter(t=>CAT[t].ph),r=[Math.max(...ws.map(t=>CAT[t].ph[0])),Math.min(...ws.map(t=>CAT[t].ph[1]))];
      const s=v<r[0]||v>r[1]?(Math.abs(v-(v<r[0]?r[0]:r[1]))>.5?'bad':'warn'):'good';kv('pH',v,'',s,L(`適合 ${r[0]}–${r[1]}`,`suits ${r[0]}–${r[1]}`));
      if(s!=='good')add(s,L('pH 不適合','pH is off'),L(`實測 ${v}，這缸生物適合 ${r[0]}–${r[1]}。`,`Measured ${v}; these animals suit ${r[0]}–${r[1]}.`),[L('不要一次大幅調整，每日最多改 0.2','Change it slowly, no more than 0.2 a day'),L('檢查底沙和石頭會不會改變 pH','Check whether substrate or rock is shifting pH')],SRC.known);}
  }
  if(rain&&A.hum!==''){const v=+A.hum,r=rng('hum'),s=!r||v>=r[0]&&v<=r[1]?'good':'warn';kv(L('濕度','Humidity'),v,'%',s,r?L(`適合 ${r[0]}–${r[1]}%`,`suits ${r[0]}–${r[1]}%`):'');
    if(s!=='good'&&r[0]<=r[1])add('warn',v<r[0]?L('太乾','Too dry'):L('太濕','Too humid'),L(`實測 ${v}%，這缸動物適合 ${r[0]}–${r[1]}%。`,`Measured ${v}%; these animals suit ${r[0]}–${r[1]}%.`),v<r[0]?[L('增加噴霧次數','Mist more often'),L('加水區或者蓋回部分網蓋','Add water or partly cover the lid')]:[L('打開網蓋通風','Open the mesh lid'),L('減少噴霧','Mist less')],SRC.known);}
  if(A.temp!==''){const v=+A.temp,r=rng('t'),s=!r||v>=r[0]&&v<=r[1]?'good':'warn';kv(rain?L('溫度','Temperature'):L('水溫','Water temp'),v,'°C',s,r?L(`適合 ${r[0]}–${r[1]}°C`,`suits ${r[0]}–${r[1]}°C`):'');
    if(s!=='good'&&r&&r[0]<=r[1])add('warn',v<r[0]?L('溫度太低','Too cold'):L('溫度太高','Too warm'),L(`實測 ${v}°C，這缸動物適合 ${r[0]}–${r[1]}°C。`,`Measured ${v}°C; these animals suit ${r[0]}–${r[1]}°C.`),v<r[0]?[rain?L('開加熱燈','Use a heat lamp'):L('加加熱棒','Add a heater')]:[L('搬離陽光直射','Move it out of direct sun'),L('開風扇降溫','Use a fan to cool it')],SRC.known);}
  const tr=rng('t');if(tr&&tr[0]>tr[1])add('bad',L('溫度要求沒有交集','No shared temperature'),animals.map(t=>`${N(CAT[t].name)} ${CAT[t].params.tMin}–${CAT[t].params.tMax}°C`).join(L('、',', ')),[L('分開兩個缸養','Keep them in separate tanks'),L('選溫度範圍相近的品種','Choose species with similar ranges')],SRC.rule);
  if(rain){const hr=rng('hum');if(hr&&hr[0]>hr[1])add('bad',L('濕度要求沒有交集','No shared humidity'),L('例如守宮怕濕、箭毒蛙要很濕，放在一起總有一方不舒服。','A gecko dislikes damp while a dart frog needs it; one of them will suffer.'),[L('分開兩個缸養','Keep them in separate tanks')],SRC.rule);
    const needW=types.filter(t=>CAT[t].hab==='amph'||(CAT[t].hab==='water'&&CAT[t].kind!=='microbe'));if(needW.length&&!(wL>0))add('bad',L('沒有水區','No water area'),needW.map(t=>N(CAT[t].name)).join(L('、',', '))+L('需要水。',' need water.'),[L('加一個可以完全浸身的水區','Add water deep enough to submerge in')],SRC.rule);}
  else{const wrong=types.filter(t=>CAT[t].w&&CAT[t].w!=='both'&&CAT[t].w!==(salt?'salt':'fresh')||CAT[t].hab==='land'||CAT[t].hab==='amph');
    if(wrong.length)add('bad',L('生物和水質不合','Wrong water for some species'),wrong.map(t=>N(CAT[t].name)).join(L('、',', '))+L(salt?'不適合海水。':'不適合這個缸。',salt?' cannot live in salt water.':' do not belong in this tank.'),[L('移去適合的環境','Move them to a suitable setup')],SRC.rule);}
  animals.forEach(t=>{const C=CAT[t];if(C.preys){const v=types.filter(x=>C.preys.includes(x));if(v.length)add('bad',L(`${C.name[0]}會吃其他生物`,`${C.name[1]} will eat tankmates`),L(`${C.name[0]}會捉${v.map(x=>CAT[x].name[0]).join('、')}來吃。`,`${C.name[1]} hunts ${v.map(x=>CAT[x].name[1].toLowerCase()).join(', ')}.`),[L('分開飼養','Keep them apart'),L('或者接受會有損失','Or accept some losses')],SRC.rule);}});
  animals.forEach(t=>{const C=CAT[t];if(C.attacks){const v=types.filter(x=>C.attacks[x]&&!(x==='betta'&&t==='betta'));if(v.length)add('warn',L(`${C.name[0]}會攻擊其他生物`,`${C.name[1]} attacks tankmates`),L(`${C.name[0]}會咬傷${v.map(x=>CAT[x].name[0]).join('、')}。`,`${C.name[1]} injures ${v.map(x=>CAT[x].name[1].toLowerCase()).join(', ')}.`),[L('分開飼養，或者多加一些水草和躲藏處','Separate them, or add plants and hiding spots')],SRC.rule);}});
  if((A.counts.betta||0)>1)add('bad',L('多於一條鬥魚','More than one betta'),L('鬥魚放在一起會打鬥致死。','Bettas kept together fight, often to the death.'),[L('每條鬥魚獨立一缸','One betta per tank')],SRC.rule);
  if(A.counts.betta&&A.counts.guppy)add('warn',L('鬥魚和孔雀魚','Betta with guppies'),L('鬥魚會咬孔雀魚條長尾。','Bettas nip guppies\' long tails.'),[L('留意孔雀魚條尾','Watch the guppies\' tails'),L('準備隔離板','Have a divider ready')],SRC.rule);
  const jel=types.filter(t=>CAT[t].flow);if(jel.length&&(A.pump||A.filter))add('warn',L('水母怕水流','Jellyfish and current'),jel.map(t=>N(CAT[t].name)).join(L('、',', '))+L('會被氧氣泵或過濾器扯爛。',' can be torn by a pump or filter.'),[L('用柔和水流','Use gentle flow'),L('過濾入水口加海綿套','Cover the filter intake with sponge')],SRC.rule);
  if(hasW&&!((+A.weeks||0)>=4))add('warn',L('新缸未穩定','New tank'),L(`開缸 ${+A.weeks||0} 週，硝化菌通常要 4–6 週先建立。`,`${+A.weeks||0} weeks old; bacteria usually take 4–6 weeks to establish.`),[L('每次只加少量生物','Add animals slowly'),L('每日測氨和亞硝酸鹽','Test ammonia and nitrite daily'),L('可以加硝化菌加快','Bottled bacteria can speed it up')],SRC.rule);
  const ob=A.obs||{};
  if(ob.gasp)add('bad',L('魚浮頭','Fish gasping'),L('魚在水面急促呼吸，很可能缺氧。','Fish breathing hard at the surface usually means low oxygen.'),[L('立即開氧氣泵或者加大水面波動','Turn on an air pump or increase surface movement now'),L('減少魚或者餵食','Reduce fish or feeding')],SRC.obs);
  if(ob.green)add('warn',L('水變綠','Green water'),L('藻類爆發，通常是光照太長、養分太多。','An algae bloom, usually from too much light or nutrients.'),[L('光照縮短到 6–8 小時','Cut light to 6–8 hours'),L('少餵','Feed less'),L('加浮萍、大和藻蝦或者水蚤','Add duckweed, Amano shrimp or daphnia')],SRC.obs);
  if(ob.mould)add('warn',L('有白霉','White mould'),rain?L('排泄物或者剩餘飼料發霉，通風不夠。','Droppings or leftovers are moulding; airflow is poor.'):L('剩餘飼料或者屍體腐爛。','Leftover food or a body is rotting.'),rain?[L('清走剩餘飼料','Remove leftovers'),L('加跳蟲和鼠婦','Add springtails and isopods'),L('打開網蓋通風','Open the mesh lid')]:[L('清走殘渣和剩餘飼料','Remove debris and leftovers'),L('減少餵食','Feed less')],SRC.obs);
  if(ob.death)add('bad',L('最近有生物死','Recent deaths'),L('要先找原因，不要立即補新生物。','Find the cause before adding more animals.'),rain?[L('檢查濕度和溫度','Check humidity and temperature'),L('清走屍體','Remove the body')]:[L('立即測氨和亞硝酸鹽','Test ammonia and nitrite now'),L('換 30% 水','Change 30% of the water'),L('清走屍體','Remove the body')],SRC.obs);
  if(ob.appetite)add('warn',L('食慾差','Poor appetite'),L('通常和溫度或者水質有關。','Usually linked to temperature or water quality.'),[L('測溫度和水質','Check temperature and water quality'),L('減少餵食，避免剩餘飼料','Feed less to avoid leftovers')],SRC.obs);
  if(ob.dry)add('warn',L('植物乾黃','Plants drying out'),L('濕度不夠或者光照太強。','Humidity is too low or light too strong.'),[L('增加噴霧','Mist more'),L('移開熱源','Move heat sources away')],SRC.obs);
  if(ob.wet)add('warn',L('水珠太多','Too much condensation'),L('長期太濕，容易生霉。','Constant damp invites mould.'),[L('打開部份網蓋通風','Open part of the lid')],SRC.obs);
  const R=runTrial(anaState(A),168);
  const dn=[...new Set(R.deaths.map(d=>N(CAT[d.type].name)+L('（','(')+SS(d.why)+L('）',')')))];
  if(R.deaths.length)add('bad',L(`模擬 7 日會有 ${R.deaths.length} 個生物死亡`,`${R.deaths.length} die in a 7-day simulation`),dn.join(L('、',', '))+L('。','.'),[L('先處理上面其他問題','Fix the other issues first'),L('載入模擬器試不同改法','Load it into a jar and try changes')],SRC.sim);
  if(hasW){if(R.mn.wo2<3)add('bad',L('夜晚會缺氧','Oxygen runs low at night'),L(`模擬溶氧最低 ${fx(R.mn.wo2)} mg/L（低於 3 魚會辛苦）。`,`Simulated low of ${fx(R.mn.wo2)} mg/L (below 3 stresses fish).`),[L('開氧氣泵','Add an air pump'),L('減少魚','Keep fewer fish'),L('加水草','Add plants')],SRC.sim);
    if(R.mx.wnh3>.5)add('bad',L('氨會累積','Ammonia will build up'),L(`模擬 7 日氨最高 ${fx(R.mx.wnh3,2)} mg/L。`,`Simulated peak of ${fx(R.mx.wnh3,2)} mg/L over 7 days.`),[L('減少餵食','Feed less'),L('加強過濾或者加硝化菌','Improve filtration or add bacteria'),L('增加換水','Change more water')],SRC.sim);
    else if(R.mx.wnh3>.25)add('warn',L('氨會偏高','Ammonia will run high'),L(`模擬 7 日氨最高 ${fx(R.mx.wnh3,2)} mg/L。`,`Simulated peak of ${fx(R.mx.wnh3,2)} mg/L over 7 days.`),[L('少一點餵','Feed a little less'),L('留意每週換水','Keep up weekly changes')],SRC.sim);
    if(R.mx.algae>35&&!ob.green)add('warn',L('好可能會爆藻','An algae bloom is likely'),L(`模擬藻類去到 ${fx(R.mx.algae)}。`,`Simulated algae reached ${fx(R.mx.algae)}.`),[L('縮短光照','Shorten the light period'),L('加吃藻生物','Add algae eaters')],SRC.sim);}
  if(rain){if(R.mx.mould>20)add('warn',L('會生霉','Mould will spread'),L(`模擬霉菌最高 ${fx(R.mx.mould)}。`,`Simulated mould reached ${fx(R.mx.mould)}.`),[L('加跳蟲','Add springtails'),L('加強通風','Improve airflow'),L('少一點餵','Feed less')],SRC.sim);
    if(R.mx.co2>5000)add('bad',L('二氧化碳過高','CO₂ too high'),L(`模擬最高 ${fx(R.mx.co2,0)} ppm。`,`Simulated peak of ${fx(R.mx.co2,0)} ppm.`),[L('打開網蓋','Open the lid'),L('加植物','Add plants')],SRC.sim);}
  const top=Object.entries(R.stress).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const rank={bad:0,warn:1,good:2};issues.sort((a,b)=>rank[a.sev]-rank[b.sev]);
  const seen=new Set(),uniq=issues.filter(i=>{if(seen.has(i.title))return false;seen.add(i.title);return true;});
  const head=uniq.slice(0,3),rest=uniq.slice(3);
  const iss=i=>`<div class="issue ${i.sev}"><div class="bh"><b>${esc(i.title)}</b><span class="src">${N(i.src)}</span></div><p>${esc(i.why)}</p><ol>${i.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></div>`;
  const sim=[];if(hasW)sim.push(L(`溶氧最低 ${fx(R.mn.wo2)} mg/L，氨最高 ${fx(R.mx.wnh3,2)} mg/L`,`water O₂ low ${fx(R.mn.wo2)} mg/L, ammonia high ${fx(R.mx.wnh3,2)} mg/L`));
  if(rain)sim.push(L(`空氣 O₂ 最低 ${fx(R.mn.ao2)}%，CO₂ 最高 ${fx(R.mx.co2,0)} ppm，濕度 ${fx(R.mn.hum,0)}–${fx(R.mx.hum,0)}%`,`air O₂ low ${fx(R.mn.ao2)}%, CO₂ high ${fx(R.mx.co2,0)} ppm, humidity ${fx(R.mn.hum,0)}–${fx(R.mx.hum,0)}%`));
  sim.push(L(`溫度 ${fx(R.mn.T)}–${fx(R.mx.T)}°C`,`temperature ${fx(R.mn.T)}–${fx(R.mx.T)}°C`));
  const bad=uniq.some(i=>i.sev==='bad');
  return`<div class="verdict"><div><b>${esc(A.name)}${L('：',': ')}${bad?L('有問題要處理','Needs attention'):uniq.length?L('大致穩定，有幾樣要留意','Mostly stable, a few things to watch'):L('狀況良好','In good shape')}</b>${uniq.length?L(`找到 ${uniq.length} 個要留意的地方，最重要的排在最前。`,`Found ${uniq.length} thing${uniq.length>1?'s':''} to look at, most important first.`):L('已知數據、規則和模擬都沒有發現問題。','Measurements, rules and simulation found no problems.')}</div></div>
   ${known.length?`<section class="bud"><div class="bh"><b>${L('已知數據','Measured')}</b><span class="src">${L('你填的實測','your test results')}</span></div><div class="kv">${known.map(k=>`<span>${k.l}</span><span style="color:var(--${k.sev==='good'?'good':k.sev})">${k.txt}</span><b class="mono">${k.v}</b>`).join('')}</div></section>`:`<p class="lede">${L('沒有填實測數據，以下只是按生物和設備推斷。','No test results entered; the following is inferred from the animals and equipment.')}</p>`}
   ${head.length?`<h3>${L('最值得關注','Most important')}</h3>${head.map(iss).join('')}`:''}${rest.length?`<h3>${L('其他要留意','Also worth checking')}</h3>${rest.map(iss).join('')}`:''}
   <div class="bud"><div class="bh"><b>${L('模擬未來 7 日','7-day simulation')}</b><span class="src">${L('模擬推測','Simulation')}</span></div><p>${sim.join(L('；','; '))}${top.length?'<br>'+L('最常見受壓原因：','Most common stress: ')+top.map(([r,n])=>L(`${SS(r)}（${n} 隻·小時）`,`${SS(r)} (${n} animal-hours)`)).join(L('、',', ')):''}</p><p class="lede">${L('模擬用簡化的生態規則計，只供參考，不等於真實結果；實際情況以測試數據為準。','The simulation uses simplified ecological rules and is a guide only; real test results take priority.')}</p></div>
   <div class="verdict"><div><b>${L('想試「如果這麼改會怎樣」？','Want to try "what if"?')}</b>${L('載入到其中一個瓶，就可以加減生物、改設備，看看有什麼變化。','Load it into one of your jars to add or remove animals and change equipment.')}</div>
     <div class="ed-actions">${[0,1,2].map(i=>`<button class="btn" data-load="${i}">${L('載入到','Load into')}「${esc(jarNames()[i])}」</button>`).join('')}</div></div>`;
}
function bindAnaOut(A){$('#anaOut').querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>{
  const i=+b.dataset.load,st=anaState(A),rain=st.mode==='rain';
  const snap={name:A.name||'',mode:st.mode,V:st.V,shape:'box',mat:'glass',sealed:st.sealed,light:st.light,feed:st.feed,pump:st.pump,filter:st.filter,heater:st.heater,wc:st.wc,mist:st.mist,heat:st.heat,
    region:A.region||'hk',real:true,water:st.water,filled:true,level:rain?(st.wL>0?Math.max(2,Math.round(st.wL/st.V*25)):0):0,hillH:8,breed:true,wxMode:'auto',wx:'cloudy',hour:8,day:1,c:rain?null:st.c,
    items:st.items.map(it=>({type:it.type,params:it.params,n:it.n,name:''}))};
  if(i!==S.cur)S.jars[S.cur]=snapshot();S.cur=i;restoreSnap(snap);
  renderAll();save();showTab('jar');toast(L('已載入：','Loaded: ')+(A.name||''));});}
