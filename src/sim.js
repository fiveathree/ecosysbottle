/* ================= 狀態 ================= */
const S={mode:'aqua',V:4,shape:'jar',mat:'glass',sealed:true,light:12,feed:0,feedHour:9,pump:false,filter:false,heater:false,fan:false,wc:0,mist:0,heat:false,
  water:'fresh',filled:true,level:0,hillH:6,breed:true,wL:0,wFrac:0,region:'hk',real:false,customRegion:null,
  wxMode:'auto',wx:'sunny',wxLeft:6,hour:6,day:1,c:{},items:[],hist:[],log:[],running:true,speed:4,uid:1,sel:null,report:null,
  jarName:'',cur:0,jars:[null,null,null],ana:null,chal:null,deathN:0};
const isLight=(st,h)=>{const on=7,off=7+st.light;return st.light>=24||(h>=on&&h<off)||(off>24&&h<off-24);};
const aliveIn=(st,k)=>st.items.filter(i=>i.alive&&CAT[i.type].kind===k);
const sat=T=>468/(31.6+T);
const airL=st=>st.V*(st.mode==='rain'?.75:.15);
const wLOf=st=>st.mode==='aqua'?(st.filled?st.V:0):(st.wL||0);
const isWater=it=>CAT[it.type].hab==='water';

function resetChem(st){
  const wL=wLOf(st),a=airL(st);st.hist=[];
  st.c={T:24,O2:wL?sat(24)*.95*wL:0,CO2:wL?1.5*wL:0,NH3:wL?.02*wL:0,NO3:wL?2*wL:0,algae:wL?3:0,flake:0,detritus:wL?.5:0,
    aO2:21*13.3*a,aCO2:600*a*.0018,hum:st.mode==='rain'?75:60,waste:st.mode==='rain'?1:0,soilN:2,mould:0,feed:0};
}
function freshWater(c,dWL,first){c.O2+=sat(c.T||24)*dWL;c.CO2+=.6*dWL;c.NO3+=.5*dWL;if(first)c.algae=1;}
const TMAT={1:'sand',2:'gravel',3:'soil'},TMAT_ID={sand:1,gravel:2,soil:3};
function terraInfo(t){if(t._info)return t._info;const n=t.n*t.n,area={};let hs=0;
  for(let i=0;i<n;i++){const m=t.m[i];if(m){area[m]=(area[m]||0)+1;hs+=t.h[i];}}
  const subTypes={};let rocks=0;Object.entries(area).forEach(([m,a])=>{const tm=TMATS[m]||TMATS[1];if(a/n>.01)subTypes[tm.cls]=1;if(tm.rock&&a/n>.05)rocks++;});
  return t._info={sub:hs/n,subTypes,rocks};}
function envInfo(st){
  const E={sub:0,subTypes:{},rocks:0};
  if(st.terra){const ti=terraInfo(st.terra);E.sub+=ti.sub;Object.assign(E.subTypes,ti.subTypes);E.rocks+=ti.rocks;}
  for(const it of st.items){if(!it.alive)continue;const c=CAT[it.type];
    if(c.kind==='sub'){E.sub+=it.params.depth;E.subTypes[it.type]=1;}
    if(c.rock)E.rocks++;}
  E.surf=clamp(1+.2*Math.min(4,E.rocks)+.12*Math.min(6,E.sub),1,2.5);
  return E;
}
const label=it=>it.name||`${N(CAT[it.type].name)} #${it.n}`;
function randName(){const used=new Set(S.items.map(i=>i.name));const free=PET_NAMES.filter(n=>!used.has(N(n)));const Lst=free.length?free:PET_NAMES;return N(Lst[Math.floor(Math.random()*Lst.length)]);}
function makeItem(type,params){
  const c=CAT[type];
  const P=Object.assign({},c.params,params||{});if(VARIANTS[type]&&P.v==null)P.v=Math.floor(Math.random()*VARIANTS[type].length);
  const it={uid:S.uid++,type,n:0,name:'',params:P,health:1,satiety:1,wt:Math.floor(Math.random()*6),nShort:0,alive:true,stress:'',lastProd:0,rx:0,rz:0,deadT:0};
  const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*.75;it.rx=Math.cos(a)*r;it.rz=Math.sin(a)*r;
  return it;
}
function nextN(type,list){return Math.max(0,...(list||S.items).filter(i=>i.type===type).map(i=>i.n))+1;}
function logEv(zh,en,c){S.log.unshift({t:[zh,en],c,d:S.day,h:S.hour});if(S.log.length>60)S.log.pop();}

function die(it,why,st,by){
  if(!it.alive)return;it.alive=false;it.deadT=0;it.why=why;
  const k=CAT[it.type].kind,c=st.c,wL=wLOf(st);
  if(why!=='eaten'){if(isWater(it)&&wL>0)c.detritus+=k==='plant'?5:k==='animal'?3:0;else if(st.mode==='rain')c.waste+=k==='plant'?3:k==='animal'?2:0;}
  if(st.trial){st.deaths.push({type:it.type,why,uid:it.uid});return;}
  const zh=`${label(it)}${it.name?'（'+CAT[it.type].name[0]+'）':''} ${k==='microbe'?'失效':'死亡'}（${why==='eaten'&&by?'被'+by+'吃了':why==='attacked'&&by?'被'+by+'咬死':STR[why]?STR[why][0]:why}）`;
  const en=`${it.name||CAT[it.type].name[1]+' #'+it.n}${it.name?' ('+CAT[it.type].name[1]+')':''} ${k==='microbe'?'stopped working':'died'} (${why==='eaten'&&by?'eaten by '+by:why==='attacked'&&by?'killed by '+by:STR[why]?STR[why][1]:why})`;
  logEv(zh,en,'bad');if(k==='animal')S.deathN=(S.deathN||0)+1;
  if(S.sel===it)renderEditor();
  dirtyList=true;
}

/* ================= 模擬（每小時） ================= */
let wasteFx=[],mistFx=0;
function step(st){
  const RG=regionOf(st),c=st.c,light=isLight(st,st.hour),w=WX[st.wx]||WX.cloudy,tr=MATS[st.mat].tr,lm=light?w.light*RG.light*tr:0,E=envInfo(st),wL=wLOf(st);
  const amb=RG.t+(w.d+(st.hour>=8&&st.hour<18?RG.sw/2:-RG.sw/2))*.6;
  let tgt=amb+(light?1.5:0)+(st.mode==='rain'&&st.heat&&light?5:0)+(st.sealed?.5:0);
  if(st.fan&&!st.sealed)tgt-=st.mode==='aqua'||wL>0?3:2; // 風扇：開口時靠蒸發降溫
  if(st.heater&&wL>0)tgt=Math.max(tgt,st.mode==='aqua'?25.5:23);
  c.T+=(tgt-c.T)*.15*(MATS[st.mat].therm||1);
  const q=clamp(1+.04*(c.T-25),.5,1.6);
  // 餵食：水中動物食飼料，陸上動物食昆蟲
  if(st.hour===st.feedHour&&st.feed>0){
    let nW=0,nL=0;for(const it of aliveIn(st,'animal')){const d=CAT[it.type].diet;if(isWater(it)&&d.flake)nW+=it.params.food;if(!isWater(it)&&d.feed)nL+=it.params.food;}
    // 水陸缸：陸地動物（昆蟲）先分夠佢哋需要，剩低先落水俾魚；唔會因為魚生多咗，蛙就冇得食
    const fl=st.mode==='aqua'?0:nW>0?Math.min(st.feed,nL*1.1):st.feed,fw=st.feed-fl;
    if(fw>0){if(wL>0){c.flake+=fw;if(!st.trial)feedFx(fw);}else c.waste+=fw*(st.mode==='rain'?1:0);}
    if(fl>0)c.feed+=fl;
  }
  const W=stepWater(st,c,wL,light,lm,q,E,w);
  let A={ao2:0,co2:0};if(st.mode==='rain')A=stepLand(st,c,wL,light,lm,q,E,w);
  predation(st);
  if(st.breed)breedStep(st);
  for(const i of st.items)if(i.alive&&i.age!=null&&i.age<5)i.age+=1/24;
  st.hist.push({light,T:c.T,wo2:wL?c.O2/wL:0,wnh3:wL?c.NH3/wL:0,algae:c.algae,grown:W.grown,o2p:W.o2p,o2u:W.o2u,ao2:A.ao2,co2:A.co2,hum:c.hum,waste:c.waste,mould:c.mould,hasW:wL>0});
  if(st.hist.length>240)st.hist.shift();
  st.hour++;if(st.hour>=24){st.hour=0;st.day++;}
  st.t=(st.t||0)+1;
  if(!st.trial){
    if(st.wxMode==='auto'){st.wxLeft--;if(st.wxLeft<=0){
      let nx=st.wx;if(Math.random()>.4||!RG.w[st.wx]){const tot=Object.values(RG.w).reduce((a,b)=>a+b,0);let r=Math.random()*tot;for(const [k,p] of Object.entries(RG.w)){r-=p;if(r<=0){nx=k;break;}}}
      if(nx!==st.wx)logEv('天氣轉為'+WX[nx].n[0],'Weather turned '+WX[nx].n[1].toLowerCase(),'muted');st.wx=nx;st.wxLeft=Math.round(rnd(3,9));}}
    if(wL>0){
      const oc=c.O2/wL;
      if(oc<2&&!st._lowO2){st._lowO2=true;logEv(`溶氧跌到 ${fx(oc)} mg/L`,`Dissolved O₂ fell to ${fx(oc)} mg/L`,'warn');}if(oc>4)st._lowO2=false;
      if(c.NH3/wL>.5&&!st._hiN){st._hiN=true;logEv(`氨升到 ${fx(c.NH3/wL,2)} mg/L`,`Ammonia rose to ${fx(c.NH3/wL,2)} mg/L`,'warn');}if(c.NH3/wL<.3)st._hiN=false;
      if(c.algae>35&&!st._bloom){st._bloom=true;logEv('藻類爆發，水開始變綠','Algae bloom: the water is turning green','warn');}if(c.algae<25)st._bloom=false;
    }
    if(st.mode==='rain'){
      if(c.mould>20&&!st._mould){st._mould=true;logEv('開始生霉','Mould is spreading','warn');}if(c.mould<10)st._mould=false;
      if(A.co2>5000&&!st._co2){st._co2=true;logEv('二氧化碳超過 5000 ppm','CO₂ above 5000 ppm','warn');}if(A.co2<3000)st._co2=false;
    }
  }
}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function hurt(it,dh,st){it.health=clamp(it.health+dh,0,1);if(it.health<=0)die(it,it.stress||'weak',st);}
function stepWater(st,c,wL,light,lm,q,E,w){
  const plants=st.items.filter(i=>i.alive&&isWater(i)&&CAT[i.type].kind==='plant'),animals=st.items.filter(i=>i.alive&&isWater(i)&&CAT[i.type].kind==='animal'),mic=st.items.filter(i=>i.alive&&isWater(i)&&CAT[i.type].kind==='microbe');
  if(wL<=0){
    animals.forEach(it=>{it.stress='noWater';hurt(it,-.25,st);});
    plants.forEach(it=>{it.stress='noWater';it.lastProd=0;hurt(it,-.03,st);});
    mic.forEach(it=>{it.stress='noWater';hurt(it,-.02,st);});
    return{o2p:0,o2u:0,grown:0};
  }
  const sv=sat(c.T),co2c=c.CO2/wL,co2f=co2c/(co2c+.4),op=st.openF??J.open,wt=st.mode==='aqua'?st.water:'fresh';
  let o2p=0,o2u=0,grown=0;
  const useO2=x=>{const t=Math.min(c.O2,x);c.O2-=t;c.CO2+=t*1.375;o2u+=t;return t;};
  for(const it of plants){
    const p=it.params,h=it.health,C=CAT[it.type];
    useO2(p.resp*Math.max(.3,h)*q);
    if(lm>0){
      const prod=p.o2Prod*h*co2f*lm,kept=C.floating?.5:C.airO2?.35:1;
      c.O2+=prod*kept;c.CO2=Math.max(0,c.CO2-prod*1.375);o2p+=prod*kept;it.lastProd=prod*kept;
      let need=p.uptake*h;const a=Math.min(c.NH3,need);c.NH3-=a;need-=a;const b=Math.min(c.NO3,need);c.NO3-=b;need-=b;
      it.nShort=need>p.uptake*h*.7?it.nShort+1:Math.max(0,it.nShort-2);
    } else it.lastProd=0;
    let dh=.003;it.stress='';
    if(it.nShort>60){dh=-.004;it.stress='lowN';}
    if(st.light<5){dh=-.005;it.stress='lowLight';}
    if(c.NH3/wL>3){dh-=.004;it.stress='hiN';}
    if(C.root==='sand'&&!E.sub){dh=Math.min(dh,0)-.004;it.stress='noSand';}
    if(C.root==='rock'&&!E.rocks){dh=Math.min(dh,0)-.002;it.stress='noRock';}
    if(C.root==='mud'&&!E.subTypes.soil){dh=Math.min(dh,0)-.005;it.stress='noMud';}
    if(C.w!=='both'&&C.w!==wt){dh=Math.min(dh,0)-.02;it.stress=wt==='salt'?'needFresh':'needSalt';}
    c.detritus+=.004*it.health; // 枯葉同老葉慢慢跌落嚟，俾分解者同螺食
    hurt(it,dh,st);
  }
  shuffle(animals); // 每個鐘輪流食，唔好次次排頭嗰隻食先
  for(const it of animals){
    const p=it.params,C=CAT[it.type];useO2(p.resp*q*(it.age!=null&&it.age<4?.5:1));eat(it,c);
    it.wt+=1;if(it.wt>=p.wasteEvery){it.wt=0;c.NH3+=p.wasteAmt*.5;c.detritus+=p.wasteAmt*.5/.1;if(!st.trial)wasteFx.push(it);}
    const oc=c.O2/wL,nc=c.NH3/wL;let dh=.004;it.stress='';
    if(oc<p.o2Min){dh=-.03*(1+(p.o2Min-oc));it.stress='noO2';}
    if(nc>p.nh3Tol){dh=Math.min(dh,0)-.012*(nc/p.nh3Tol);it.stress=it.stress||'nh3';}
    if(c.T<p.tMin||c.T>p.tMax){dh=Math.min(dh,0)-.008*(1+Math.max(p.tMin-c.T,c.T-p.tMax));it.stress=it.stress||(c.T<p.tMin?'cold':'hot');}
    if(C.w!=='both'&&C.w!==wt){dh=Math.min(dh,0)-.05;it.stress=it.stress||(wt==='salt'?'needFresh':'needSalt');}
    if(C.flow&&(st.pump||st.filter)){dh=Math.min(dh,0)-.012;it.stress=it.stress||'flow';}
    if(C.burrow&&!E.subTypes.sand){dh=Math.min(dh,0)-.01;it.stress=it.stress||'noSand';}
    if(it.satiety<=0){dh=Math.min(dh,0)-.006;it.stress=it.stress||'hungry';}
    if(it.atkT>0){it.atkT--;dh=Math.min(dh,0);it.stress=it.stress||'attacked';}
    hurt(it,dh,st);
  }
  for(const it of mic){
    const p=it.params;
    if(it.type==='nitri'){
      let conv=Math.min(c.NH3,p.cap*it.health*E.surf);if(p.o2PerN>0)conv=Math.min(conv,c.O2/p.o2PerN);
      c.NH3-=conv;c.NO3+=conv;c.O2-=conv*p.o2PerN;o2u+=conv*p.o2PerN;c.CO2=Math.max(0,c.CO2-conv*.5);
    } else {const d=Math.min(c.detritus,p.rate*it.health*E.surf);c.detritus-=d;c.NH3+=d*.1;useO2(d*p.o2Per);}
    it.stress=c.O2/wL<1?'noO2':'';it.health=clamp(it.health+(c.O2/wL<1?-.01:.005),0,1);if(it.health<=0)die(it,'noO2',st);
  }
  if(st.filter){
    let conv=Math.min(c.NH3,.012*wL,c.O2/3.4);c.NH3-=conv;c.NO3+=conv;c.O2-=conv*3.4;o2u+=conv*3.4;
    const d=c.detritus*.04;c.detritus-=d;c.NO3+=d*.1;useO2(d*.1*3.4);
  }
  const shade=Math.min(.7,plants.reduce((a,i)=>a+(CAT[i.type].shade||(CAT[i.type].floating?.04:0))*i.health,0)*Math.min(1,4/Math.sqrt(wL)));
  if(lm>0){
    // 藻類 = 水中藻（跟現有藻量增長）+ 表面生物膜（石頭、底沙、玻璃上面一直有，俾蝦螺刮嚟食，唔會俾食清光）
    const no3c=c.NO3/wL,bio=.07*E.surf*Math.pow(wL,2/3)*lm*(1-shade*.5)*(.4+.6*no3c/(no3c+.3));let g=(.04*c.algae+.01)*(no3c/(no3c+1.5))*Math.max(0,1-c.algae/60)*co2f*lm*(1-shade)+bio*Math.max(0,1-c.algae/60);
    g=Math.max(0,Math.min(g,c.NO3/.01));c.algae+=g;c.NO3-=g*.01;c.O2+=g*.6;c.CO2=Math.max(0,c.CO2-g*.8);o2p+=g*.6;grown=g;
  }
  useO2(.003*c.algae);
  const ad=c.algae*.004;c.algae-=ad;c.detritus+=ad;
  let d=c.flake*.04;c.flake-=d;c.detritus+=d;
  d=c.detritus*.02;c.detritus-=d;c.NH3+=d*.1;useO2(d*.3);
  let k=st.mode==='rain'?.1:(st.sealed?.002:.06*op);if(st.filter&&!st.sealed)k+=.02;
  c.O2+=(sv*wL-c.O2)*k;c.CO2+=(.6*wL-c.CO2)*k;
  if(st.pump){const kp=st.mode==='aqua'&&st.sealed?.04:.15;c.O2+=(sv*wL-c.O2)*kp;c.CO2+=(.6*wL-c.CO2)*kp;}
  if(!st.sealed&&w.rain){const f=.01*w.rain*op;c.NH3*=1-f;c.NO3*=1-f;}
  if(st.wc>0&&st.day%7===0&&st.hour===10){const f=st.wc/100;c.NH3*=1-f;c.NO3*=1-f;c.detritus*=1-f*.5;c.algae*=1-f*.3;if(!st.trial)logEv(`換了 ${st.wc}% 水`,`Changed ${st.wc}% of the water`,'muted');}
  c.O2=clamp(c.O2,0,sv*1.7*wL);for(const key of ['CO2','NH3','NO3','algae','flake','detritus'])c[key]=Math.max(0,c[key]);
  return{o2p,o2u,grown};
}
function stepLand(st,c,wL,light,lm,q,E,w){
  const a=airL(st),hf=Math.min(2,4/st.V),op=st.openF??J.open,RG=regionOf(st);
  let ppm=c.aCO2/(a*.0018);const co2f=ppm/(ppm+300);
  const useO2=x=>{const t=Math.min(c.aO2,x);c.aO2-=t;c.aCO2+=t*1.375;};
  for(const it of shuffle(st.items.slice())){
    if(!it.alive||isWater(it))continue;const C=CAT[it.type],k=C.kind,p=it.params;
    if(k==='plant'){
      const h=it.health;useO2(p.resp*Math.max(.3,h)*q);
      if(lm>0){const prod=p.o2Prod*h*co2f*lm;c.aO2+=prod;c.aCO2=Math.max(0,c.aCO2-prod*1.375);it.lastProd=prod;
        const u=Math.min(c.soilN,p.uptake*h);c.soilN-=u;it.nShort=u<p.uptake*h*.3?it.nShort+1:Math.max(0,it.nShort-2);} else it.lastProd=0;
      c.hum+=p.transp*h*(light?1:.3)*hf;
      let dh=.003;it.stress='';
      if(!E.subTypes.soil){dh=-.004;it.stress='noSoil';}
      if(Math.min(c.hum,100)<p.humMin){dh=Math.min(dh,0)-.006*(1+(p.humMin-c.hum)/10);it.stress=it.stress||'dry';}
      if(c.mould>40){dh=Math.min(dh,0)-.004;it.stress=it.stress||'mould';}
      if(it.nShort>72){dh=Math.min(dh,0)-.003;it.stress=it.stress||'lowN';}
      if(st.light<5){dh=-.005;it.stress='lowLight';}
      c.waste+=.008*it.health; // 落葉：跳蟲、鼠婦同泥土菌嘅食物
      hurt(it,dh,st);
    } else if(k==='animal'){
      useO2(p.resp*q*(it.age!=null&&it.age<4?.5:1));eat(it,c);
      it.wt+=1;if(it.wt>=p.wasteEvery){it.wt=0;if(C.hab==='amph'&&wL>0)c.NH3+=p.wasteAmt*.1;else c.waste+=p.wasteAmt;if(!st.trial)wasteFx.push(it);}
      const o2pct=c.aO2/(a*13.3),hv=clamp(c.hum,15,100);ppm=c.aCO2/(a*.0018);let dh=.004;it.stress='';
      if(hv<p.humMin||hv>p.humMax){dh=-.006*(1+Math.max(p.humMin-hv,hv-p.humMax)/10);it.stress=hv<p.humMin?'dry':'wet';}
      if(c.T<p.tMin||c.T>p.tMax){dh=Math.min(dh,0)-.008*(1+Math.max(p.tMin-c.T,c.T-p.tMax));it.stress=it.stress||(c.T<p.tMin?'cold':'hot');}
      if(o2pct<17){dh=Math.min(dh,0)-.02*(17-o2pct);it.stress=it.stress||'noO2';}
      if(ppm>5000){dh=Math.min(dh,0)-.01*(ppm/5000);it.stress=it.stress||'co2';}
      if(c.mould>20&&!C.mouldOK){dh=Math.min(dh,0)-.004*(c.mould/20);it.stress=it.stress||'mould';}
      if(C.hab==='amph'){if(wL<=0){dh=Math.min(dh,0)-.01;it.stress=it.stress||'noWater';}
        else if(c.NH3/wL>p.nh3Tol){dh=Math.min(dh,0)-.01*(c.NH3/wL/p.nh3Tol);it.stress=it.stress||'nh3';}}
      if(it.satiety<=0){dh=Math.min(dh,0)-.006;it.stress=it.stress||'hungry';}
      if(it.atkT>0){it.atkT--;dh=Math.min(dh,0);it.stress=it.stress||'attacked';}
      hurt(it,dh,st);
    } else if(k==='microbe'){
      const d=Math.min(c.waste,p.rate*it.health*E.surf);c.waste-=d;c.soilN+=d;useO2(d*p.o2Per);
      it.stress=c.hum<40?'soilDry':'';it.health=clamp(it.health+(c.hum<40?-.005:.005),0,1);if(it.health<=0)die(it,'soilDry',st);
    }
  }
  let d=c.waste*.005;c.waste-=d;c.soilN+=d;
  d=c.feed*.04;c.feed-=d;c.waste+=d;
  if(st.mist>0){for(let i=0;i<st.mist;i++)if(st.hour===8+Math.floor(i*12/st.mist)){c.hum+=12*hf;if(!st.trial)mistFx=1.5;}}
  if(wL>0)c.hum+=.5*(st.wFrac||0)*hf;
  if(st.heat&&light)c.hum-=.8;
  if(st.fan&&!st.sealed)c.hum-=.5*hf;
  const kh=st.sealed?.01:.12*Math.max(.3,op);c.hum+=(clamp(RG.hum+w.dh*.6,10,100)-c.hum)*kh;
  if(!st.sealed&&w.rain)c.hum+=.3*w.rain*op;
  c.hum=clamp(c.hum,15,100);
  const k=st.sealed?.003:.12*op;c.aO2+=(a*13.3*21-c.aO2)*k;c.aCO2+=(a*.0018*420-c.aCO2)*k;
  if(c.hum>80)c.mould+=(.012*c.waste+.03*c.mould)*(c.hum-80)/20+.004;else c.mould-=c.mould*.03;
  c.mould=clamp(c.mould,0,60);
  for(const key of ['aO2','aCO2','waste','soilN','feed'])c[key]=Math.max(0,c[key]);
  return{ao2:c.aO2/(a*13.3),co2:c.aCO2/(a*.0018)};
}
function eat(it,c){
  const p=it.params,per=p.food/24*(it.age!=null&&it.age<4?.5:1);if(per<=0)return;
  // 肚餓時食多啲（最多正常 3 倍）先追得返；以前最多食正常份量，飽肚度只會跌唔會升
  let need=per*(1+2*(1-it.satiety)),got=0;
  for(const [pool,w] of Object.entries(CAT[it.type].diet).sort((a,b)=>b[1]-a[1])){
    if(need<=1e-9)break;const take=Math.min(c[pool]||0,need/w);c[pool]-=take;got+=take*w;need-=take*w;}
  it.satiety=clamp(it.satiety+(got/per-1)/36,0,1);
}
function predation(st){
  for(const it of aliveIn(st,'animal')){const C=CAT[it.type];if(!C.attacks)continue;
    for(const [t,dmg] of Object.entries(C.attacks)){if(Math.random()>.15)continue;
      const tg=st.items.filter(i=>i.alive&&i.type===t&&i!==it);if(!tg.length)continue;
      const v=tg[Math.floor(Math.random()*tg.length)];v.health=clamp(v.health-dmg,0,1);v.atkT=6;
      if(!st.trial){it.chase=v;it.chaseT=4;v.fleeT=4;if(Math.random()<.1){const lz=x=>x.name||`${CAT[x.type].name[0]} #${x.n}`,le=x=>x.name||`${CAT[x.type].name[1]} #${x.n}`;logEv(`${lz(it)} 攻擊了 ${lz(v)}`,`${le(it)} attacked ${le(v)}`,'warn');}}
      if(v.health<=0)die(v,'attacked',st,st.trial?'':label(it));}
  }
  for(const it of aliveIn(st,'animal')){const C=CAT[it.type];if(!C.preys||it.satiety>.6||Math.random()>.03)continue;
    const prey=st.items.filter(i=>i.alive&&C.preys.includes(i.type));if(!prey.length)continue;
    const v=prey[Math.floor(Math.random()*prey.length)];die(v,'eaten',st,st.trial?'':label(it));it.satiety=Math.min(1,it.satiety+.5);}
}
// 繁殖上限跟瓶大細：細瓶養唔到咁多，免得生到冇嘢食、冇氧
const breedCap=st=>{const f=st.sealed?.6:1;return{each:clamp(Math.round(2+st.V*1.2*f),4,12),total:Math.round(6+st.V*2*f)};}; // 密封瓶冇新鮮空氣，養得少啲
// 主要食飼料嘅水中動物（魚）：每日飼料夠多一窩先生，免得生到餓死（蝦螺主要刮藻，唔計）
const flakeFed=t=>{const d=CAT[t].diet;return CAT[t].hab==='water'&&d.flake>0&&d.flake>=Math.max(...Object.values(d));};
function breedStep(st){const cap=breedCap(st);
  const types={};for(const it of aliveIn(st,'animal'))(types[it.type]=types[it.type]||[]).push(it);
  const an=aliveIn(st,'animal'),landNeed=an.filter(i=>!isWater(i)&&CAT[i.type].diet.feed).reduce((s,i)=>s+i.params.food,0);
  const flakeNeed=an.filter(i=>flakeFed(i.type)).reduce((s,i)=>s+i.params.food*(i.age!=null&&i.age<4?.5:1),0),flakeSupply=st.mode==='aqua'?st.feed:Math.max(0,st.feed-landNeed*1.1);
  let total=Object.values(types).reduce((s,a)=>s+a.length,0);
  for(const [t,list] of Object.entries(types)){
    const p=list[0].params;if(!(p.breedDays>0)||list.length<2||list.length>=cap.each||total>=cap.total)continue;
    if(isWater(list[0])&&wLOf(st)<=0)continue;
    if(flakeFed(t)&&flakeNeed+p.food*(p.litter||1)>flakeSupply)continue;
    const adults=list.filter(i=>(i.age==null||i.age>=4)&&i.health>.8&&i.satiety>.9&&!i.stress);
    if(adults.length<2)continue;
    if(Math.random()<(adults.length/2)/(p.breedDays*24)){
      const n=Math.min(p.litter||1,cap.each-list.length);total+=n;
      for(let k=0;k<n;k++){
        if(st.trial){const b=makeItem(t,p);S.uid--;b.age=0;b.satiety=.8;st.items.push(b);}
        else{const b=addItem(t,Object.assign({},p),true);b.age=0;b.satiety=.8;}
      }
      if(!st.trial){if(!S.real)unlock('baby');logEv(`${CAT[t].name[0]}生了 ${n} 隻BB`,`${CAT[t].name[1]} had ${n} young`,'good');dirtyList=true;}
    }
  }
}

/* ================= 試算：預測 & 一鍵平衡 ================= */
const ST_KEYS=['customRegion','terra','region','mode','V','shape','mat','sealed','light','feed','feedHour','pump','filter','heater','fan','wc','mist','heat','water','filled','level','hillH','breed','wL','wFrac'];
function trialState(cfg){
  const st={wx:S.wxMode==='auto'?typicalWx(S.region):S.wxMode,wxMode:'fixed',hour:S.hour,day:S.day,trial:true,t:0,deaths:[],c:Object.assign({},S.c),hist:[],
    items:S.items.filter(i=>i.alive).map(i=>({type:i.type,uid:i.uid,n:i.n,params:Object.assign({},i.params),alive:true,health:i.health,satiety:i.satiety,wt:i.wt,nShort:i.nShort,stress:'',lastProd:0,age:i.age}))};
  ST_KEYS.forEach(k=>st[k]=S[k]);
  if(cfg){Object.assign(st,cfg.env);cfg.add.forEach(t=>{const it=makeItem(t);S.uid--;st.items.push(it);});
    const wL=wLOf(st);if(cfg.wcNow&&wL>0){const c=st.c;c.NH3*=.7;c.NO3*=.7;c.detritus*=.85;c.algae*=.9;freshWater(c,wL*.3,false);c.O2=Math.min(c.O2,sat(c.T)*wL);}}
  return st;
}
function runTrial(st,h){
  const mn={},mx={},stress={},ks=['wo2','wnh3','algae','T','ao2','co2','hum','mould'];
  ks.forEach(k=>{mn[k]=Infinity;mx[k]=-Infinity;});
  for(let i=0;i<h;i++){step(st);const r=st.hist[st.hist.length-1];ks.forEach(k=>{mn[k]=Math.min(mn[k],r[k]);mx[k]=Math.max(mx[k],r[k]);});
    st.items.forEach(it=>{if(it.alive&&it.stress&&CAT[it.type].kind==='animal')stress[it.stress]=(stress[it.stress]||0)+1;});}
  return{mn,mx,stress,deaths:st.deaths,st};
}
const forecast=h=>runTrial(trialState(null),h);
/* 試算用固定隨機數，令唔同方案喺同一套天氣同捕食運氣下比較 */
function seeded(seed,f){const R=Math.random;let a=seed>>>0;Math.random=()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};try{return f();}finally{Math.random=R;}}
const BAL_SEED=20261019;
function balanceScore(cfg){return seeded(BAL_SEED,()=>scoreRun(cfg));}
function scoreRun(cfg){
  const st=trialState(cfg),wL=wLOf(st);let s=0;
  for(let i=0;i<120;i++){step(st);
    for(const it of st.items){if(!it.alive||!it.stress)continue;const k=CAT[it.type].kind;s+=k==='animal'?3:k==='plant'?.3:.1;}
    const c=st.c;if(wL>0){if(c.algae>35)s+=.5;if(c.NH3/wL>.25)s+=1;if(c.O2/wL<3)s+=1;}if(st.mode==='rain'&&c.mould>15)s+=.5;}
  for(const d of st.deaths)s+=CAT[d.type].kind==='animal'?1000:CAT[d.type].kind==='plant'?40:10;
  const e=cfg.env,b=cfg.base;let cost=cfg.add.length*.5+(cfg.wcNow?.6:0);
  for(const k of ['pump','filter','heater','fan','heat','sealed'])if(e[k]!==b[k])cost+=1;
  cost+=Math.abs(e.feed-b.feed)*.25+Math.abs(e.light-b.light)*.15+Math.abs(e.mist-b.mist)*.25+Math.abs(e.wc-b.wc)*.03;
  return{s:s+cost,deaths:st.deaths};
}
function deadNames(deaths){const m={};deaths.filter(d=>CAT[d.type].kind==='animal').forEach(d=>{const k=N(CAT[d.type].name)+L('（','(')+SS(d.why)+L('）',')');m[k]=(m[k]||0)+1;});return Object.entries(m).map(([k,n])=>n>1?`${k} ×${n}`:k);}
/* 一鍵平衡：先保住現有生物（只加水草同微生物、唔郁動物），唔夠先調環境同水質 */
function autoBalance(){
  const aq=S.mode==='aqua',real=S.real,pre=[];
  // 0. 保命必需：冇水、冇泥、冇水區
  const alive0=S.items.filter(i=>i.alive),E0=envInfo(S);
  const waterLife=alive0.some(i=>isWater(i)&&CAT[i.type].kind!=='microbe'||CAT[i.type].hab==='amph');
  if(aq&&!S.filled&&waterLife){if(real)pre.push(L('注水','Fill with water'));else{fillWaterQuiet();pre.push(L('注水','Filled with water'));}}
  if(!aq&&waterLife&&!(S.level>0)){if(real)pre.push(L('加水區（約 5 cm）','Add a water area (about 5 cm)'));else{S.level=5;buildJar({keepCam:true});pre.push(L('加水區 5 cm','Added a 5 cm water area'));}}
  if(!aq&&!E0.subTypes.soil&&alive0.some(i=>CAT[i.type].kind==='plant'&&!isWater(i))){if(real)pre.push(L('鋪泥土','Lay soil'));else{addSubstrate('soil');pre.push(L('鋪泥土','Laid soil'));}}
  const wL=wLOf(S),E=envInfo(S),alive=S.items.filter(i=>i.alive),salt=aq&&S.water==='salt';
  if(wL>0&&!E.sub&&alive.some(i=>CAT[i.type].kind==='plant'&&CAT[i.type].root==='sand'||CAT[i.type].burrow)){if(real)pre.push(L('鋪細沙','Lay sand'));else{addSubstrate('sand');pre.push(L('鋪細沙','Laid sand'));}}
  if(wL>0&&!E.rocks&&alive.some(i=>CAT[i.type].root==='rock')){if(real)pre.push(L('加石頭','Add stones'));else{addItem('stone',null,true);pre.push(L('加石頭','Added stones'));}}
  const base={light:S.light,feed:S.feed,pump:S.pump,filter:S.filter,heater:S.heater,fan:!!S.fan,sealed:S.sealed,mist:S.mist,heat:S.heat,wc:S.wc};
  let cfg={env:Object.assign({},base),base,add:[],wcNow:false},best=balanceScore(cfg);const before=best;
  const greedy=gen=>{for(let it=0;it<14;it++){let imp=null,bs=best;for(const c2 of gen(cfg)){const r=balanceScore(c2);if(r.s<bs.s-.3){bs=r;imp=c2;}}if(!imp)break;cfg=imp;best=bs;}};
  const mk=(c,ch,add,extra)=>Object.assign({env:Object.assign({},c.env,ch),base,add:add?[...c.add,add]:c.add.slice(),wcNow:c.wcNow},extra||{});
  // 1. 先加水草同微生物
  const plantOpts=[...(wL>0?(salt?['caulerpa']:['hornwort','elodea','duckweed']):[]),...(!aq?['pothos','fern']:[]),...(wL>0?['nitri','decomp']:[]),...(!aq?['soilmic']:[])];
  greedy(c=>plantOpts.filter(t=>c.add.filter(x=>x===t).length<4).map(t=>mk(c,{},t)));
  // 2. 再調環境同水質
  greedy(c=>{const e=c.env,Ls=[];
    if(e.light<16)Ls.push(mk(c,{light:e.light+2}));if(e.light>4)Ls.push(mk(c,{light:e.light-2}));
    if(e.feed<10){Ls.push(mk(c,{feed:e.feed+.5}));Ls.push(mk(c,{feed:Math.min(10,e.feed+1)}));}if(e.feed>0){Ls.push(mk(c,{feed:Math.max(0,e.feed-.5)}));Ls.push(mk(c,{feed:Math.max(0,e.feed-1)}));}
    Ls.push(mk(c,{sealed:!e.sealed}));Ls.push(mk(c,{fan:!e.fan}));if(!e.fan&&e.sealed)Ls.push(mk(c,{fan:true,sealed:false}));
    if(wL>0){Ls.push(mk(c,{pump:!e.pump}));Ls.push(mk(c,{filter:!e.filter}));Ls.push(mk(c,{heater:!e.heater}));
      if(e.wc<50)Ls.push(mk(c,{wc:e.wc+10}));if(e.wc>0)Ls.push(mk(c,{wc:e.wc-10}));if(!c.wcNow)Ls.push(mk(c,{},null,{wcNow:true}));}
    if(!aq){if(e.mist<6)Ls.push(mk(c,{mist:e.mist+1}));if(e.mist<5)Ls.push(mk(c,{mist:e.mist+2}));if(e.mist>0)Ls.push(mk(c,{mist:e.mist-1}));Ls.push(mk(c,{heat:!e.heat}));}
    return Ls;});
  // 結果
  const e=cfg.env,plantCh=[],envCh=[];
  const ad={};cfg.add.forEach(t=>{ad[t]=(ad[t]||0)+1;});
  Object.entries(ad).forEach(([t,n])=>plantCh.push(L(`${real?'加':'加入'} ${CAT[t].name[0]} ×${n}`,`${real?'Add':'Added'} ${CAT[t].name[1]} ×${n}`)));
  const lab={light:v=>L(`光照 ${S.light} → ${v} 小時`,`Light ${S.light} → ${v} h`),feed:v=>L(`每日餵食 ${S.feed} → ${v} 份`,`Daily food ${S.feed} → ${v}`),
    pump:v=>v?L('開氧氣泵','Air pump on'):L('關氧氣泵','Air pump off'),filter:v=>v?L('開過濾','Filter on'):L('關過濾','Filter off'),heater:v=>v?L('開加熱棒','Heater on'):L('關加熱棒','Heater off'),fan:v=>v?L('開風扇降溫','Fan on to cool'):L('關風扇','Fan off'),
    sealed:v=>v?L('密封','Seal the jar'):L('打開瓶口通風','Open the lid'),mist:v=>L(`每日噴霧 ${S.mist} → ${v} 次`,`Misting ${S.mist} → ${v} a day`),heat:v=>v?L('開加熱燈','Heat lamp on'):L('關加熱燈','Heat lamp off'),
    wc:v=>L(`每週換水 ${S.wc}% → ${v}%`,`Weekly water change ${S.wc}% → ${v}%`)};
  for(const k of Object.keys(e))if(e[k]!==base[k])envCh.push(lab[k](e[k]));
  if(cfg.wcNow)envCh.unshift(L('立即換 30% 水','Change 30% of the water now'));
  const beforeDead=deadNames(before.deaths),afterDead=deadNames(best.deaths);
  const nDead=r=>r.deaths.filter(d=>CAT[d.type].kind==='animal').length;if(!real&&nDead(best)<nDead(before))unlock('saved');
  if(!real){
    for(const k of Object.keys(e))S[k]=e[k];
    Object.entries(ad).forEach(([t,n])=>{for(let i=0;i<n;i++)addItem(t,null,true);});
    if(cfg.wcNow&&wLOf(S)>0){const c=S.c;c.NH3*=.7;c.NO3*=.7;c.detritus*=.85;c.algae*=.9;freshWater(c,wLOf(S)*.3,false);c.O2=Math.min(c.O2,sat(c.T)*wLOf(S));}
    buildJar({keepCam:true,keepChem:true});
  }
  // 改完都保唔住嘅動物（包括俾其他生物食嘅），記低 uid，俾用家一撳搬去另一個瓶
  // 加埋原本會俾食或者俾咬嘅：捕食靠運氣，試算一次冇發生唔代表安全
  const doomed=[...new Set([...best.deaths.filter(d=>CAT[d.type].kind==='animal'),...before.deaths.filter(d=>d.why==='eaten'||d.why==='attacked')].map(d=>d.uid))].filter(u=>S.items.some(i=>i.uid===u&&i.alive));
  taskFlag('bal');
  S.reportOpen=true;S.report={suggest:real,pre,plantCh,envCh,beforeDead,afterDead,doomed,changes:[...pre,...plantCh,...envCh]};
  const all=S.report.changes;
  logEv((real?'一鍵平衡建議：':'一鍵平衡：')+(all.length?all.map(x=>x).join('、'):'沒有需要改'),(real?'Auto-balance suggestions: ':'Auto-balance: ')+(all.length?all.join(', '):'nothing to change'),real?'muted':'good');
  renderAll();save();showTab('bal');
  toast(beforeDead.length?L(`原本 ${before.deaths.filter(d=>CAT[d.type].kind==='animal').length} 隻會死，現在 ${best.deaths.filter(d=>CAT[d.type].kind==='animal').length} 隻`,`${before.deaths.filter(d=>CAT[d.type].kind==='animal').length} were going to die; now ${best.deaths.filter(d=>CAT[d.type].kind==='animal').length}`)
    :all.length?L(`一鍵平衡：${real?'建議':'改了'} ${all.length} 樣東西`,`Auto-balance: ${all.length} ${real?'suggestions':'changes'}`):L('現在已經是最平衡','Already as balanced as it gets'));
}
function fillWaterQuiet(){S.filled=true;const c=S.c;['O2','CO2','NH3','NO3','algae','flake','detritus'].forEach(k=>c[k]=0);buildJar({keepChem:true,keepCam:true});freshWater(c,wLOf(S),true);S._lastWL=wLOf(S);}
function addSubstrate(t){if(S.terra){terraEnsure(t);return;}addItem(t,null,true);}

/* ================= 分析現有水缸（引擎） ================= */
const ANA_DEF={name:'',region:'hk',type:'fresh',V:30,weeks:8,pump:true,filter:true,heater:true,sub:true,rocks:true,soil:true,waterL:0,mist:1,heat:false,sealed:false,feed:2,light:8,wc:20,counts:{},nh3:'',no2:'',no3:'',ph:'',temp:'',hum:'',obs:{}};
function anaState(A){
  const rain=A.type==='rain',V=Math.max(1,+A.V||30),wL=rain?clamp(+A.waterL||0,0,V*.8):V;
  const st={mode:rain?'rain':'aqua',water:A.type==='salt'?'salt':'fresh',filled:true,V,shape:'box',mat:'glass',sealed:!!A.sealed,light:+A.light||0,feed:+A.feed||0,feedHour:9,
    pump:!!A.pump&&wL>0,filter:!!A.filter&&wL>0,heater:!!A.heater&&wL>0,wc:+A.wc||0,mist:rain?(+A.mist||0):0,heat:rain&&!!A.heat,breed:false,level:wL>0?4:0,hillH:8,wL,wFrac:rain?clamp(wL/V*2,0,1):1,
    region:A.region||'hk',wx:typicalWx(A.region||'hk'),wxMode:'fixed',hour:8,day:1,trial:true,t:0,deaths:[],hist:[],openF:1,items:[]};
  const add=(t,p)=>{const it=makeItem(t,p);S.uid--;it.n=nextN(t,st.items);st.items.push(it);return it;};
  if(rain){if(A.soil)add('soil');}else{if(A.sub)add('sand');}
  if(A.rocks)add('stone');
  const est=(+A.weeks||0)>=4;
  if(est){if(rain)add('soilmic',{rate:+(.06*V/6).toFixed(3)});if(wL>0)add('nitri',{cap:+(.03*wL/8).toFixed(3)});}
  Object.entries(A.counts||{}).forEach(([t,n])=>{if(CAT[t])for(let i=0;i<n;i++)add(t);});
  resetChem(st);const c=st.c;
  if(wL>0){if(A.nh3!=='')c.NH3=+A.nh3*wL;if(A.no3!=='')c.NO3=+A.no3*wL;}
  if(A.temp!=='')c.T=+A.temp;if(rain&&A.hum!=='')c.hum=+A.hum;
  return st;
}
