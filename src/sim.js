/* ================= 狀態 ================= */
const S={mode:'aqua',V:4,shape:'jar',mat:'glass',sealed:true,light:12,feed:0,feedHour:9,pump:false,filter:false,heater:false,wc:0,mist:0,heat:false,
  water:'fresh',filled:true,level:0,hillH:6,breed:true,wL:0,wFrac:0,region:'hk',real:false,
  wxMode:'auto',wx:'sunny',wxLeft:6,hour:6,day:1,c:{},items:[],hist:[],log:[],running:true,speed:4,uid:1,sel:null,report:null,
  jarName:'',cur:0,jars:[null,null,null],ana:null};
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
function envInfo(st){
  const E={sub:0,subTypes:{},rocks:0};
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
  const it={uid:S.uid++,type,n:0,name:'',params:Object.assign({},c.params,params||{}),health:1,satiety:1,wt:Math.floor(Math.random()*6),nShort:0,alive:true,stress:'',lastProd:0,rx:0,rz:0,deadT:0};
  const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*.75;it.rx=Math.cos(a)*r;it.rz=Math.sin(a)*r;
  return it;
}
function nextN(type,list){return Math.max(0,...(list||S.items).filter(i=>i.type===type).map(i=>i.n))+1;}
function logEv(zh,en,c){S.log.unshift({t:[zh,en],c,d:S.day,h:S.hour});if(S.log.length>60)S.log.pop();}

function die(it,why,st,by){
  if(!it.alive)return;it.alive=false;it.deadT=0;it.why=why;
  const k=CAT[it.type].kind,c=st.c,wL=wLOf(st);
  if(why!=='eaten'){if(isWater(it)&&wL>0)c.detritus+=k==='plant'?5:k==='animal'?3:0;else if(st.mode==='rain')c.waste+=k==='plant'?3:k==='animal'?2:0;}
  if(st.trial){st.deaths.push({type:it.type,why});return;}
  const zh=`${label(it)}${it.name?'（'+CAT[it.type].name[0]+'）':''} ${k==='microbe'?'失效':'死亡'}（${why==='eaten'&&by?'俾'+by+'食咗':STR[why]?STR[why][0]:why}）`;
  const en=`${it.name||CAT[it.type].name[1]+' #'+it.n}${it.name?' ('+CAT[it.type].name[1]+')':''} ${k==='microbe'?'stopped working':'died'} (${why==='eaten'&&by?'eaten by '+by:STR[why]?STR[why][1]:why})`;
  logEv(zh,en,'bad');
  if(S.sel===it)renderEditor();
  dirtyList=true;
}

/* ================= 模擬（每小時） ================= */
let wasteFx=[],mistFx=0;
function step(st){
  const RG=regionOf(st),c=st.c,light=isLight(st,st.hour),w=WX[st.wx]||WX.cloudy,tr=MATS[st.mat].tr,lm=light?w.light*RG.light*tr:0,E=envInfo(st),wL=wLOf(st);
  const amb=RG.t+(w.d+(st.hour>=8&&st.hour<18?RG.sw/2:-RG.sw/2))*.6;
  let tgt=amb+(light?1.5:0)+(st.mode==='rain'&&st.heat&&light?5:0)+(st.sealed?.5:0);
  if(st.heater&&wL>0)tgt=Math.max(tgt,st.mode==='aqua'?25.5:23);
  c.T+=(tgt-c.T)*.15;
  const q=clamp(1+.04*(c.T-25),.5,1.6);
  // 餵食：水中動物食飼料，陸上動物食昆蟲
  if(st.hour===st.feedHour&&st.feed>0){
    let nW=0,nL=0;for(const it of aliveIn(st,'animal')){const d=CAT[it.type].diet;if(isWater(it)&&d.flake)nW+=it.params.food;if(!isWater(it)&&d.feed)nL+=it.params.food;}
    const fw=st.mode==='aqua'?st.feed:(nW+nL>0?st.feed*nW/(nW+nL):0),fl=st.feed-fw;
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
      const prod=p.o2Prod*h*co2f*lm,kept=C.floating?.5:1;
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
    if(C.w!=='both'&&C.w!==wt){dh=Math.min(dh,0)-.02;it.stress=wt==='salt'?'needFresh':'needSalt';}
    hurt(it,dh,st);
  }
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
  if(lm>0){
    const no3c=c.NO3/wL;let g=(.04*c.algae+.01)*(no3c/(no3c+1.5))*Math.max(0,1-c.algae/60)*co2f*lm;
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
  if(st.wc>0&&st.day%7===0&&st.hour===10){const f=st.wc/100;c.NH3*=1-f;c.NO3*=1-f;c.detritus*=1-f*.5;c.algae*=1-f*.3;if(!st.trial)logEv(`換咗 ${st.wc}% 水`,`Changed ${st.wc}% of the water`,'muted');}
  c.O2=clamp(c.O2,0,sv*1.7*wL);for(const key of ['CO2','NH3','NO3','algae','flake','detritus'])c[key]=Math.max(0,c[key]);
  return{o2p,o2u,grown};
}
function stepLand(st,c,wL,light,lm,q,E,w){
  const a=airL(st),hf=Math.min(2,4/st.V),op=st.openF??J.open,RG=regionOf(st);
  let ppm=c.aCO2/(a*.0018);const co2f=ppm/(ppm+300);
  const useO2=x=>{const t=Math.min(c.aO2,x);c.aO2-=t;c.aCO2+=t*1.375;};
  for(const it of st.items){
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
  let need=per,got=0;
  for(const [pool,w] of Object.entries(CAT[it.type].diet).sort((a,b)=>b[1]-a[1])){
    if(need<=1e-9)break;const take=Math.min(c[pool]||0,need/w);c[pool]-=take;got+=take*w;need-=take*w;}
  it.satiety=clamp(it.satiety+(got/per-1)/36,0,1);
}
function predation(st){
  for(const it of aliveIn(st,'animal')){const C=CAT[it.type];if(!C.preys||it.satiety>.6||Math.random()>.03)continue;
    const prey=st.items.filter(i=>i.alive&&C.preys.includes(i.type));if(!prey.length)continue;
    const v=prey[Math.floor(Math.random()*prey.length)];die(v,'eaten',st,st.trial?'':label(it));it.satiety=Math.min(1,it.satiety+.5);}
}
function breedStep(st){
  const types={};for(const it of aliveIn(st,'animal'))(types[it.type]=types[it.type]||[]).push(it);
  let total=Object.values(types).reduce((s,a)=>s+a.length,0);
  for(const [t,list] of Object.entries(types)){
    const p=list[0].params;if(!(p.breedDays>0)||list.length<2||list.length>=12||total>=45)continue;
    if(isWater(list[0])&&wLOf(st)<=0)continue;
    const adults=list.filter(i=>(i.age==null||i.age>=4)&&i.health>.8&&i.satiety>.6&&!i.stress);
    if(adults.length<2)continue;
    if(Math.random()<(adults.length/2)/(p.breedDays*24)){
      const n=Math.min(p.litter||1,12-list.length);total+=n;
      for(let k=0;k<n;k++){
        if(st.trial){const b=makeItem(t,p);S.uid--;b.age=0;b.satiety=.8;st.items.push(b);}
        else{const b=addItem(t,Object.assign({},p),true);b.age=0;b.satiety=.8;}
      }
      if(!st.trial){logEv(`${CAT[t].name[0]}生咗 ${n} 隻BB`,`${CAT[t].name[1]} had ${n} young`,'good');dirtyList=true;}
    }
  }
}

/* ================= 試算：預測 & 一鍵平衡 ================= */
const ST_KEYS=['region','mode','V','shape','mat','sealed','light','feed','feedHour','pump','filter','heater','wc','mist','heat','water','filled','level','hillH','breed','wL','wFrac'];
function trialState(cfg){
  const st={wx:S.wxMode==='auto'?typicalWx(S.region):S.wxMode,wxMode:'fixed',hour:S.hour,day:S.day,trial:true,t:0,deaths:[],c:Object.assign({},S.c),hist:[],
    items:S.items.filter(i=>i.alive).map(i=>({type:i.type,uid:i.uid,n:i.n,params:Object.assign({},i.params),alive:true,health:i.health,satiety:i.satiety,wt:i.wt,nShort:i.nShort,stress:'',lastProd:0,age:i.age}))};
  ST_KEYS.forEach(k=>st[k]=S[k]);
  if(cfg){Object.assign(st,cfg.env);st.breed=false;cfg.add.forEach(t=>{const it=makeItem(t);S.uid--;st.items.push(it);});
    resetChem(st);st.items.forEach(i=>{i.health=1;i.satiety=1;i.nShort=0;});}
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
function score(cfg){
  const st=trialState(cfg);let s=0;const wL=wLOf(st);
  for(let i=0;i<120;i++){step(st);
    for(const it of st.items){if(!it.alive)continue;const k=CAT[it.type].kind;if(it.stress)s+=k==='animal'?1:k==='plant'?.4:.2;}
    const c=st.c;
    if(wL>0){if(c.algae>35)s+=1;if(c.NH3/wL>.25)s+=1;if(c.O2/wL<3)s+=.5;}
    if(st.mode==='rain'&&c.mould>15)s+=1;
  }
  const e=cfg.env;
  return s+st.deaths.length*200+cfg.add.length*4+(e.pump?.8:0)+(e.filter?.8:0)+(e.heat?.5:0)+(e.heater?.5:0)+e.feed*.3+Math.abs(e.light-12)*.3+e.mist*.4;
}
function autoBalance(){
  const pre=[],aq=S.mode==='aqua',real=S.real;
  if(aq&&!S.filled){if(real)pre.push(L('注水','Fill with water'));else{S.filled=true;resetChem(S);buildJar();pre.push(L('注水','Filled with water'));}}
  const alive=S.items.filter(i=>i.alive),E=envInfo(S);
  const needsWater=alive.some(i=>isWater(i)&&CAT[i.type].kind!=='microbe'||CAT[i.type].hab==='amph');
  if(!aq&&!E.subTypes.soil&&alive.some(i=>['plant','animal'].includes(CAT[i.type].kind)&&!isWater(i))){if(real)pre.push(L('加泥土','Add soil'));else{addItem('soil',null,true);pre.push(L('加入 泥土','Added soil'));}}
  if(!aq&&needsWater&&!(S.level>0)){if(real)pre.push(L('加水區（約 5 cm）','Add a water area (about 5 cm)'));else{S.level=5;buildJar();resetWaterIfNew(0);pre.push(L('水位 0 → 5 cm','Water level 0 → 5 cm'));}}
  const env={light:S.light,feed:S.feed,pump:S.pump,filter:S.filter,heater:S.heater,sealed:S.sealed,mist:S.mist,heat:S.heat};
  let cfg={env,add:[]};
  const plants=alive.filter(i=>CAT[i.type].kind==='plant'),wL=wLOf(S);
  if(wL>0&&!E.sub&&plants.some(i=>CAT[i.type].root==='sand'))cfg.add.push('sand');
  if(wL>0&&!E.rocks&&plants.some(i=>CAT[i.type].root==='rock'))cfg.add.push('stone');
  const feeders=alive.some(i=>{const d=CAT[i.type].diet;return d&&(d.flake||d.feed);});
  const salt=aq&&S.water==='salt';
  const acts=c=>{const Ls=[],e=c.env,mk=(ch,add)=>({env:Object.assign({},e,ch),add:add?[...c.add,add]:c.add.slice()});
    if(e.light<16)Ls.push(mk({light:e.light+2}));if(e.light>6)Ls.push(mk({light:e.light-2}));
    if(feeders){Ls.push(mk({feed:e.feed+.5}));if(e.feed>0)Ls.push(mk({feed:Math.max(0,e.feed-.5)}));}
    Ls.push(mk({sealed:!e.sealed}));
    if(wL>0){Ls.push(mk({pump:!e.pump}));Ls.push(mk({filter:!e.filter}));Ls.push(mk({heater:!e.heater}));
      (salt?['caulerpa','nitri','hermit']:['hornwort','nitri','duckweed','amano','snail']).forEach(t=>{if(c.add.filter(x=>x===t).length<3)Ls.push(mk({},t));});}
    if(!aq){if(e.mist<6)Ls.push(mk({mist:e.mist+1}));if(e.mist>0)Ls.push(mk({mist:e.mist-1}));Ls.push(mk({heat:!e.heat}));
      ['pothos','fern','soilmic','springtail','isopod'].forEach(t=>{if(c.add.filter(x=>x===t).length<3)Ls.push(mk({},t));});}
    return Ls;};
  let best=score(cfg);
  for(let it=0;it<14;it++){let imp=null,bs=best;for(const c2 of acts(cfg)){const s=score(c2);if(s<bs-.5){bs=s;imp=c2;}}if(!imp)break;cfg=imp;best=bs;}
  const changes=pre.slice(),e=cfg.env;
  if(real){
    const lab2={light:v=>L(`光照改做 ${v} 小時（而家 ${S.light}）`,`Light ${v} h (now ${S.light})`),feed:v=>L(`每日餵 ${v} 份（而家 ${S.feed}）`,`Feed ${v} per day (now ${S.feed})`),pump:v=>v?L('開氧氣泵','Add an air pump'):L('可以關氧氣泵','The air pump can go'),filter:v=>v?L('加過濾','Add a filter'):L('可以唔使過濾','The filter is not needed'),heater:v=>v?L('加加熱棒','Add a heater'):L('可以關加熱棒','The heater can go off'),sealed:v=>v?L('可以密封','It can be sealed'):L('打開瓶口通風','Open the lid'),mist:v=>L(`每日噴霧 ${v} 次（而家 ${S.mist}）`,`Mist ${v} times a day (now ${S.mist})`),heat:v=>v?L('開加熱燈','Use a heat lamp'):L('關加熱燈','Turn the heat lamp off')};
    for(const k of Object.keys(e))if(e[k]!==S[k])changes.push(lab2[k](e[k]));
    const ad={};cfg.add.forEach(t=>{ad[t]=(ad[t]||0)+1;});Object.entries(ad).forEach(([t,n])=>changes.push(L(`加 ${CAT[t].name[0]} ×${n}`,`Add ${CAT[t].name[1]} ×${n}`)));
    S.report={suggest:true,changes,ok:null};
    logEv('一鍵平衡（建議）：'+(changes.length?changes.join('、'):'冇建議'),'Auto-balance suggestions: '+(changes.length?changes.join(', '):'none'),'muted');
    renderAll();save();showTab('bal');toast(L('真實嘅瓶：只列出建議，冇改任何嘢','Real tank: suggestions only, nothing changed'));return;
  }
  const lab={light:v=>L(`光照 ${S.light} → ${v} 小時`,`Light ${S.light} → ${v} h`),feed:v=>L(`每日餵食 ${S.feed} → ${v} 份`,`Daily food ${S.feed} → ${v}`),
    pump:v=>v?L('開氧氣泵','Air pump on'):L('關氧氣泵','Air pump off'),filter:v=>v?L('開過濾','Filter on'):L('關過濾','Filter off'),heater:v=>v?L('開加熱棒','Heater on'):L('關加熱棒','Heater off'),
    sealed:v=>v?L('改為密封','Sealed the jar'):L('打開瓶口','Opened the jar'),mist:v=>L(`每日噴霧 ${S.mist} → ${v} 次`,`Misting ${S.mist} → ${v} per day`),heat:v=>v?L('開加熱燈','Heat lamp on'):L('關加熱燈','Heat lamp off')};
  for(const k of Object.keys(e))if(e[k]!==S[k]){changes.push(lab[k](e[k]));S[k]=e[k];}
  const added={};cfg.add.forEach(t=>{added[t]=(added[t]||0)+1;});
  Object.entries(added).forEach(([t,n])=>{for(let i=0;i<n;i++)addItem(t,null,true);changes.push(L(`加入 ${CAT[t].name[0]} ×${n}`,`Added ${CAT[t].name[1]} ×${n}`));});
  S.items=S.items.filter(i=>{if(!i.alive){disposeObj(i.g);return false;}return true;});
  buildJar();resetChem(S);S.items.forEach(i=>{i.health=1;i.satiety=1;i.nShort=0;i.stress='';});
  const fc=forecast(120);
  S.report={changes,ok:!fc.deaths.length};
  logEv('一鍵平衡：'+(changes.length?changes.join('、'):'冇需要改'),'Auto-balance: '+(changes.length?changes.join(', '):'nothing to change'),'good');
  renderAll();save();showTab('bal');
  toast(changes.length?L(`一鍵平衡：改咗 ${changes.length} 樣嘢`,`Auto-balance made ${changes.length} changes`):L('而家已經係最平衡','Already as balanced as it gets'));
}

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
