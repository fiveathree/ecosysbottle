/* ================= 3D ================= */
const stage=$('#stage'),canvas=$('#c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(38,1,.05,200);
const hemi=new THREE.HemisphereLight(0xdff3ff,0x3b2f22,.6);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff4dc,.9);sun.position.set(2,6,3);scene.add(sun);
const fill=new THREE.DirectionalLight(0x8fb7ff,.25);fill.position.set(-3,2,-2);scene.add(fill);
const J={R:1,H:2.4,sTop:.02,waterTop:null,airTop:2,box:false,pts:[],open:1,minR:1,k:1,subs:{},terrain:false,hillH:0,terrMesh:null};
function rAt(y){if(J.box)return J.R;const t=clamp(y/J.H,0,1),Pt=J.pts;
  for(let i=1;i<Pt.length;i++){if(Pt[i].y>=t){const a=Pt[i-1],b=Pt[i],f=(t-a.y)/((b.y-a.y)||1);return(a.x+(b.x-a.x)*f)*J.R;}}return Pt[Pt.length-1].x*J.R;}
function randIn(y,f){if(J.box)return[rnd(-1,1)*J.R*f,rnd(-1,1)*J.R*f];const a=rnd(0,6.28),r=Math.sqrt(Math.random())*rAt(y)*f;return[Math.cos(a)*r,Math.sin(a)*r];}
function edgeFrac(p){return J.box?Math.max(Math.abs(p.x),Math.abs(p.z))/J.R:Math.hypot(p.x,p.z)/Math.max(.01,rAt(p.y));}
function clampIn(p,f){if(J.box){const m=J.R*f;p.x=clamp(p.x,-m,m);p.z=clamp(p.z,-m,m);return;}const m=rAt(p.y)*f,r=Math.hypot(p.x,p.z);if(r>m){p.x*=m/r;p.z*=m/r;}}
function clampInR(p,r){if(J.box){const m=Math.max(.02,J.R*.985-r);p.x=clamp(p.x,-m,m);p.z=clamp(p.z,-m,m);return;}const m=Math.max(.02,rAt(p.y)*.985-r),d=Math.hypot(p.x,p.z);if(d>m){p.x*=m/d;p.z*=m/d;}}
const _fb=new THREE.Box3();
/* 唔准穿玻璃：超出就推返入去，太大就縮細 */
function fitInJar(it){const g=it.g;if(!g)return;
  for(let pass=0;pass<4;pass++){
    g.updateMatrixWorld(true);_fb.setFromObject(g);if(_fb.isEmpty())return;
    const cx=(_fb.min.x+_fb.max.x)/2,cz=(_fb.min.z+_fb.max.z)/2,hx=(_fb.max.x-_fb.min.x)/2,hz=(_fb.max.z-_fb.min.z)/2,top=J.H*.96;
    if(_fb.max.y>top&&_fb.max.y>g.position.y+1e-4){const f=(top-g.position.y)/(_fb.max.y-g.position.y);if(f>0&&f<1){g.scale.multiplyScalar(f*.98);continue;}}
    let moved=false;
    if(J.box){const lim=J.R*.97;if(hx>lim||hz>lim){g.scale.multiplyScalar(Math.min(lim/hx,lim/hz)*.98);continue;}
      let dx=0,dz=0;if(cx+hx>lim)dx=lim-(cx+hx);if(cx-hx<-lim)dx=-lim-(cx-hx);if(cz+hz>lim)dz=lim-(cz+hz);if(cz-hz<-lim)dz=-lim-(cz-hz);
      if(dx||dz){g.position.x+=dx;g.position.z+=dz;moved=true;}}
    else{let rmin=Infinity;for(let k=0;k<=6;k++)rmin=Math.min(rmin,rAt(_fb.min.y+(_fb.max.y-_fb.min.y)*k/6));
      const lim=rmin*.97,rr=Math.hypot(hx,hz)*.78;
      if(rr>lim){g.scale.multiplyScalar(lim/rr*.98);continue;}
      const d=Math.hypot(cx,cz);if(d+rr>lim){const f=d>1e-4?Math.max(0,lim-rr)/d:0;g.position.x+=cx*f-cx;g.position.z+=cz*f-cz;moved=true;}}
    if(!moved)break;
    if(it.type!=='duckweed')g.position.y=groundY(g.position.x,g.position.z);
  }
}
function shapeSamples(sh){const pts=sh.prof.map(([r,y])=>new THREE.Vector2(r,y));return pts.length>2?new THREE.SplineCurve(pts).getPoints(60):pts;}
const floorR=()=>J.box?J.R:rAt(J.sTop);
const floorF=()=>floorR()*.72;
function floorMap(x,z){const f=floorF();return[x*f,z*f];}
function hillAt(x,z){if(S.terra)return terraH(x,z);if(!J.terrain)return 0;const Rf=floorR(),u=x/Rf,v=z/Rf;
  let b=clamp(-v*.8-u*.3+.25,0,1);b=b*b*(3-2*b);return Math.max(0,J.hillH*b+.008*J.k*(1+Math.sin(x*9)*Math.cos(z*7)));}
const groundY=(x,z)=>J.sTop+hillAt(x,z);
const inWater=(x,z,m=.03)=>J.waterTop!=null&&groundY(x,z)<J.waterTop-m;
function waterPoint(m=.05){if(J.waterTop==null)return null;let best=null,bg=1e9;
  for(let i=0;i<30;i++){const [x,z]=randIn(J.sTop,.8);if(inWater(x,z,m))return[x,z];const g=groundY(x,z);if(g<bg){bg=g;best=[x,z];}}return best;}
function landPoint(){let best=null,bg=-1;
  for(let i=0;i<30;i++){const [x,z]=randIn(J.sTop,.8);if(!inWater(x,z,-.01))return[x,z];const g=groundY(x,z);if(g>bg){bg=g;best=[x,z];}}return best||[0,0];}
const jarG=new THREE.Group();scene.add(jarG);
const world=new THREE.Group();scene.add(world);
let waterMat=null,surfMat=null,lid,lampMat,glassMat,pumpG,filterG;
const mat=(c,o)=>new THREE.MeshLambertMaterial(Object.assign({color:c},o||{}));
function disposeObj(o){if(!o)return;o.parent&&o.parent.remove(o);o.traverse(c=>{c.geometry&&c.geometry.dispose();if(c.material)(Array.isArray(c.material)?c.material:[c.material]).forEach(m=>m.dispose());});}
function latheBand(y0,y1,scale,phi0,phiL){
  const out=[new THREE.Vector2(rAt(y0)*scale,y0)];J.pts.forEach(p=>{const y=p.y*J.H;if(y>y0&&y<y1)out.push(new THREE.Vector2(p.x*scale*J.R,y));});out.push(new THREE.Vector2(rAt(y1)*scale,y1));
  return new THREE.LatheGeometry(out,phiL?16:72,phi0||0,phiL||Math.PI*2);
}
function resetWaterIfNew(oldWL){
  const nw=S.wL,c=S.c;if(!c||c.O2==null||nw===oldWL)return;
  if(nw<=0){['O2','CO2','NH3','NO3','algae','flake','detritus'].forEach(k=>c[k]=0);return;}
  if(oldWL<=0){['O2','CO2','NH3','NO3','algae','flake','detritus'].forEach(k=>c[k]=0);freshWater(c,nw,true);return;}
  if(nw>oldWL)freshWater(c,nw-oldWL,false);else{const r=nw/oldWL;['O2','CO2','NH3','NO3','algae','flake','detritus'].forEach(k=>c[k]*=r);}
}

function buildJar(opt){
  opt=opt||{};
  while(jarG.children.length)disposeObj(jarG.children[0]);J.terrMesh=null;
  const sh=SHAPES[S.shape],M=MATS[S.mat],k=Math.cbrt(S.V/4);
  J.k=k;J.box=!!sh.box;J.R=sh.R*k;J.H=sh.H*k;J.pts=shapeSamples(sh);
  let y=.008*k;J.subs={};J.floor=y;
  if(!S.terra)for(const it of S.items)if(it.alive&&CAT[it.type].kind==='sub'){const d=it.params.depth*.025*k;J.subs[it.uid]=[y,y+d];y+=d;}
  J.sTop=Math.min(y,J.H*.35);
  J.terrain=!S.terra&&S.mode==='rain'&&S.items.some(i=>i.alive&&i.type==='soil');
  J.hillH=(S.hillH||0)*.025*k;
  J.airTop=J.H*.9;
  if(S.mode==='aqua')J.waterTop=S.filled?J.H*sh.w:null;
  else J.waterTop=S.level>0?Math.min(J.sTop+S.level*.025*k,J.H*.7):null;
  const {R,H}=J;
  const maxR=J.box?R:Math.max(...J.pts.map(p=>p.x))*R;
  J.open=J.box?1:Math.pow(rAt(H)/maxR,2);
  const topY=J.waterTop||J.H*.8;
  J.minR=J.box?R:Math.min(...[0,.2,.4,.6,.8,1].map(f=>rAt(J.sTop+f*(Math.min(topY,H*.85)-J.sTop))));
  // 水量
  const oldWL=S._lastWL??wLOf(S);
  if(S.mode==='aqua'){S.wL=S.filled?S.V:0;S.wFrac=1;}
  else if(J.waterTop==null){S.wL=0;S.wFrac=0;}
  else{let n=0,sd=0;for(let i=0;i<240;i++){const [x,z]=randIn(J.sTop,.98),d=J.waterTop-groundY(x,z);if(d>0){n++;sd+=d;}}S.wFrac=n/240;
    S.wL=+(S.V*clamp(sd/240/(J.H*.82),0,1)).toFixed(2);}
  if(!opt.keepChem)resetWaterIfNew(oldWL);
  S._lastWL=wLOf(S);
  // 玻璃
  glassMat=new THREE.MeshPhongMaterial({color:M.c,transparent:true,opacity:M.op,shininess:M.sh,specular:M.sh>20?0xffffff:0x222222,side:THREE.DoubleSide,depthWrite:false});
  glassMat.userData.base=M.op;
  const hlMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:M.sh>20?.09:.02,side:THREE.DoubleSide,depthWrite:false});
  const hidden=new THREE.MeshBasicMaterial({visible:false});
  if(J.box){
    const g=new THREE.BoxGeometry(2*R,H,2*R).translate(0,H/2,0);
    jarG.add(new THREE.Mesh(g,[glassMat,glassMat,hidden,glassMat,glassMat,glassMat]));
    jarG.add(new THREE.LineSegments(new THREE.EdgesGeometry(g),new THREE.LineBasicMaterial({color:0x2c3a3c,transparent:true,opacity:.55})));
    const hl=new THREE.Mesh(new THREE.PlaneGeometry(R*.12,H*.85),hlMat);hl.position.set(R*.55,H*.5,R+.004);jarG.add(hl);
  } else {
    jarG.add(new THREE.Mesh(latheBand(0,H,1),glassMat));
    jarG.add(new THREE.Mesh(latheBand(H*.04,H*.96,1.004,.4,.24),hlMat));
    const bot=new THREE.Mesh(new THREE.CircleGeometry(rAt(0),72),glassMat);bot.rotation.x=-Math.PI/2;bot.position.y=.002;jarG.add(bot);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(rAt(H),.025*k,8,72),glassMat.clone());rim.material.opacity=Math.min(.6,M.op*2.5);rim.rotation.x=Math.PI/2;rim.position.y=H;jarG.add(rim);
  }
  buildTerrain();
  // 水
  waterMat=surfMat=null;
  if(J.waterTop!=null){
    waterMat=new THREE.MeshPhongMaterial({color:0x9fd6e0,transparent:true,opacity:.18,shininess:60,depthWrite:false,side:THREE.DoubleSide});
    surfMat=new THREE.MeshPhongMaterial({color:0xbfe6ee,transparent:true,opacity:.32,shininess:140,specular:0xffffff,side:THREE.DoubleSide,depthWrite:false});
    const wt=J.waterTop;
    if(J.box){
      jarG.add(new THREE.Mesh(new THREE.BoxGeometry(2*R*.985,wt-J.sTop,2*R*.985).translate(0,(wt+J.sTop)/2,0),[waterMat,waterMat,hidden,hidden,waterMat,waterMat]));
      const s=new THREE.Mesh(new THREE.PlaneGeometry(2*R*.985,2*R*.985),surfMat);s.rotation.x=-Math.PI/2;s.position.y=wt;jarG.add(s);
    } else {
      jarG.add(new THREE.Mesh(latheBand(J.sTop,wt,.985),waterMat));
      const s=new THREE.Mesh(new THREE.CircleGeometry(rAt(wt)*.985,72),surfMat);s.rotation.x=-Math.PI/2;s.position.y=wt;jarG.add(s);
    }
  }
  lid=new THREE.Group();
  if(J.box){const l=new THREE.Mesh(new THREE.BoxGeometry(2*R+.04,.03,2*R+.04),glassMat.clone());l.material.opacity=Math.min(.6,M.op*2);l.position.y=H+.02;lid.add(l);}
  else{const rt=rAt(H);const cork=new THREE.Mesh(new THREE.CylinderGeometry(rt*.97,rt*.9,Math.max(.12,rt*.25),40),mat(0xa77a4c));cork.position.y=H+.03;lid.add(cork);}
  jarG.add(lid);
  lampMat=new THREE.MeshBasicMaterial({color:0xfff3c4});
  const ly=H+.9*k;
  const lamp=new THREE.Mesh(new THREE.CylinderGeometry(maxR*.5,maxR*.5,.04,32),lampMat);lamp.position.y=ly;jarG.add(lamp);
  const cord=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,3,4),mat(0x333333));cord.position.y=ly+1.5;jarG.add(cord);
  // 氧氣泵（氣石）同過濾器：擺喺水最深嘅地方
  const deep=J.waterTop!=null?(waterPoint(.15)||[0,0]):[0,0];
  pumpG=new THREE.Group();
  const [px,pz]=J.box&&S.mode==='aqua'?[-R*.7,R*.55]:[deep[0]*.9,deep[1]*.9];
  const pg=groundY(px,pz);
  const stoneM=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.05,12),mat(0xd9d4cc));stoneM.position.set(px,pg+.025,pz);pumpG.add(stoneM);
  pumpG.userData.src=new THREE.Vector3(px,pg+.05,pz);jarG.add(pumpG);
  filterG=new THREE.Group();
  const [fx2,fz]=J.box&&S.mode==='aqua'?[R*.7,-R*.65]:[deep[0]*.5+.12,deep[1]*.5-.08];
  const fg=groundY(fx2,fz);
  const sponge=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.18,14),mat(0x1d1f22));sponge.position.set(fx2,fg+.09,fz);filterG.add(sponge);
  filterG.userData.src=new THREE.Vector3(fx2,fg+.2,fz);jarG.add(filterG);
  // 重建生物
  S.items.forEach(it=>{if(it.g)disposeObj(it.g);it.g=null;if(!it.alive){it.gone=true;return;}buildItem(it);});
  S.items=S.items.filter(i=>!i.gone);
  if(S.sel&&!S.items.includes(S.sel))S.sel=null;
  dirtyList=true;
  if(!opt.keepCam){cam.target.set(0,H*.45,0);cam.dist=Math.max(H,maxR*2)*2.5;}
  buildMicrobeLayer();layoutWeather(maxR);
}
function buildTerrain(){
  if(S.terra){buildTerraMesh();return;}
  if(J.terrMesh){disposeObj(J.terrMesh);J.terrMesh=null;}
  if(!J.terrain)return;
  const R=floorR()*.985,geo=new THREE.PlaneGeometry(2*R,2*R,52,52);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position,col=new Float32Array(pos.count*3),c1=new THREE.Color(0x5b4030),c2=new THREE.Color(0x4f6b2e),c3=new THREE.Color(0x3e2b1f),tmp=new THREE.Color();
  for(let i=0;i<pos.count;i++){let x=pos.getX(i),z=pos.getZ(i);if(!J.box){const r=Math.hypot(x,z);if(r>R){x*=R/r;z*=R/r;}}
    const h=hillAt(x,z),under=J.waterTop!=null&&J.sTop+h<J.waterTop;
    pos.setXYZ(i,x,J.sTop+h+.002,z);
    tmp.copy(under?c3:c1).lerp(under?c1:c2,clamp((under?.3:.35)+.35*Math.sin(x*13+z*11),0,1));col.set([tmp.r,tmp.g,tmp.b],i*3);}
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.computeVertexNormals();
  J.terrMesh=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true}));jarG.add(J.terrMesh);
}

/* ---- 模型 ---- */
function plantStem(color,leafGeo,leafN,spacing,tilt,maxH){
  const g=new THREE.Group(),h=clamp(rnd(.65,1)*maxH*.8,.2,3);
  const bb=Math.min(.2,J.minR*.15),bx=rnd(-bb,bb),bz=rnd(-bb,bb),pts=[];
  for(let i=0;i<=4;i++){const t=i/4;pts.push(new THREE.Vector3(bx*t*t,t*h,bz*t*t));}
  const curve=new THREE.CatmullRomCurve3(pts),m=mat(color,{side:THREE.DoubleSide});
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve,16,.01,5,false),m));
  const wh=Math.max(1,Math.floor(h/spacing)),im=new THREE.InstancedMesh(leafGeo,m,wh*leafN),d=new THREE.Object3D();let k=0;
  for(let w=0;w<wh;w++){const t=(w+1)/(wh+1),p=curve.getPoint(t),s=1.15-.6*t;
    for(let j=0;j<leafN;j++){d.position.copy(p);d.rotation.set(0,j/leafN*6.283+w*.7,0);d.rotateZ(-tilt);d.scale.setScalar(s);d.updateMatrix();im.setMatrixAt(k++,d.matrix);}}
  g.add(im);g.userData.top=h;return g;
}
function blades(color,n,hMul,w,bendMax){
  const g=new THREE.Group(),m=mat(color,{side:THREE.DoubleSide});g.userData.blades=[];let top=0;
  for(let i=0;i<n;i++){const h=clamp(rnd(.6,.95)*hMul,.08,3);top=Math.max(top,h);
    const geo=new THREE.PlaneGeometry(w,h,1,10);geo.translate(0,h/2,0);const pos=geo.attributes.position,bend=rnd(bendMax*.3,bendMax)*(Math.random()<.5?-1:1);
    for(let v=0;v<pos.count;v++){const y=pos.getY(v)/h;pos.setX(v,pos.getX(v)*(1-y*.5)+bend*y*y);}geo.computeVertexNormals();
    const b=new THREE.Mesh(geo,m);b.rotation.y=rnd(0,6.28);b.position.set(rnd(-.04,.04),0,rnd(-.04,.04));b.userData.ph=rnd(0,6);g.add(b);g.userData.blades.push(b);}
  g.userData.top=top;return g;
}
function fronds(color,n,len,w,arch){
  const g=new THREE.Group(),m=mat(color,{side:THREE.DoubleSide});g.userData.blades=[];
  for(let i=0;i<n;i++){const Ln=len*rnd(.75,1.1),geo=new THREE.PlaneGeometry(w,Ln,1,10);geo.translate(0,Ln/2,0);const pos=geo.attributes.position;
    for(let v=0;v<pos.count;v++){const t=pos.getY(v)/Ln;pos.setX(v,pos.getX(v)*(1-t*.85));pos.setZ(v,arch*t*t*Ln);pos.setY(v,pos.getY(v)*(1-.35*t*t));}
    geo.computeVertexNormals();const b=new THREE.Mesh(geo,m);b.rotation.y=i/n*6.28+rnd(-.2,.2);b.rotateX(rnd(.15,.45));b.userData.ph=rnd(0,6);g.add(b);g.userData.blades.push(b);}
  g.userData.top=len;return g;
}
function clump(colors,n,rad,sz,h){
  const g=new THREE.Group(),ms=colors.map(c=>mat(c));
  for(let i=0;i<n;i++){const a=rnd(0,6.28),r=Math.sqrt(Math.random())*rad,s=new THREE.Mesh(new THREE.IcosahedronGeometry(rnd(sz*.6,sz),0),ms[i%ms.length]);
    s.position.set(Math.cos(a)*r,rnd(0,h)*(1-r/rad*.6),Math.sin(a)*r);s.scale.y=.7;g.add(s);}
  g.userData.top=h;return g;
}
function fishModel(body,fin,r,slim,bigFin){
  const g=new THREE.Group(),inner=new THREE.Group();g.add(inner);
  const bm=mat(body,{transparent:true}),fm=mat(fin,{transparent:true,opacity:.92,side:THREE.DoubleSide});
  const b=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),bm);b.scale.set(1.9,slim?.6:.75,.5);inner.add(b);
  const tg=new THREE.ConeGeometry(r*(slim?.7:1.05)*(bigFin?1.8:1),r*1.7*(bigFin?1.5:1),12);tg.rotateZ(-Math.PI/2);
  const tail=new THREE.Mesh(tg,fm);tail.scale.z=.18;tail.position.x=-r*(bigFin?3:2.6);inner.add(tail);
  const dor=new THREE.Mesh(new THREE.ConeGeometry(r*.4*(bigFin?2:1),r*.8*(bigFin?1.6:1),6),fm);dor.scale.z=.2;dor.position.set(-r*.3,r*.75,0);dor.rotation.z=.5;inner.add(dor);
  const em=mat(0x111111);[1,-1].forEach(s=>{const e=new THREE.Mesh(new THREE.SphereGeometry(r*.16,6,6),em);e.position.set(r*1.3,r*.18,s*r*.36);inner.add(e);});
  g.userData={inner,tail};return g;
}
function shrimpModel(color,op){
  const g=new THREE.Group(),inner=new THREE.Group();g.add(inner);
  const bm=mat(color,{transparent:true,opacity:op});
  const b=new THREE.Mesh(new THREE.SphereGeometry(.022,10,8),bm);b.scale.set(2.3,.85,.8);inner.add(b);
  const t=new THREE.Mesh(new THREE.ConeGeometry(.016,.04,6).rotateZ(-Math.PI/2),bm);t.position.x=-.065;t.scale.z=.4;inner.add(t);
  const am=mat(0xc8735f);[1,-1].forEach(s=>{const a=new THREE.Mesh(new THREE.CylinderGeometry(.0015,.0015,.09,3),am);a.rotation.z=-1.2;a.rotation.y=s*.4;a.position.set(.07,.02,s*.012);inner.add(a);});
  g.userData={inner};return g;
}
function snailModel(shell,stripe){
  const g=new THREE.Group(),inner=new THREE.Group();g.add(inner);
  const sm=mat(shell),fm=mat(0x8a8072);
  const foot=new THREE.Mesh(new THREE.SphereGeometry(.03,10,8),fm);foot.scale.set(2,.35,.9);foot.position.y=.008;inner.add(foot);
  const sh=new THREE.Mesh(new THREE.SphereGeometry(.042,12,10),sm);sh.position.set(-.012,.045,0);inner.add(sh);
  const st=new THREE.Mesh(new THREE.TorusGeometry(.028,.007,6,16),mat(stripe));st.position.set(-.012,.05,0);inner.add(st);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.02,.05,10),sm);tip.position.set(-.03,.085,0);tip.rotation.z=.6;inner.add(tip);
  g.userData={inner};return g;
}
function turtleModel(shellC,skinC,sz){
  const g=new THREE.Group(),inner=new THREE.Group();g.add(inner);inner.scale.setScalar(sz||1);
  const shell=new THREE.Mesh(new THREE.SphereGeometry(.07,16,8,0,Math.PI*2,0,Math.PI/2),mat(shellC));shell.scale.set(1.3,.65,1);shell.position.y=.02;inner.add(shell);
  const plates=new THREE.Mesh(new THREE.TorusGeometry(.05,.006,6,20),mat(0x2f2e1a));plates.rotation.x=Math.PI/2;plates.position.y=.045;plates.scale.set(1.3,1,1);inner.add(plates);
  const pl=new THREE.Mesh(new THREE.CylinderGeometry(.088,.088,.02,16),mat(0x6b5a3a));pl.scale.set(1.05,1,.8);pl.position.y=.018;inner.add(pl);
  const skin=mat(skinC);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.025,10,8),skin);head.position.set(.12,.03,0);head.scale.set(1.3,1,1);inner.add(head);
  [[.06,.06],[.06,-.06],[-.06,.06],[-.06,-.06]].forEach(([x,z])=>{const l=new THREE.Mesh(new THREE.SphereGeometry(.018,8,6),skin);l.position.set(x,.012,z*1.1);l.scale.set(1.4,.6,1);inner.add(l);});
  const tl=new THREE.Mesh(new THREE.ConeGeometry(.01,.04,6).rotateZ(Math.PI/2),skin);tl.position.set(-.11,.015,0);inner.add(tl);
  g.userData={inner};return g;
}
function lizardModel(bc,tc,spot,belly){
  const g=new THREE.Group(),inner=new THREE.Group();g.add(inner);const m=mat(bc),d=mat(tc);
  const body=new THREE.Mesh(new THREE.SphereGeometry(.03,12,8),m);body.scale.set(2.3,.65,.9);body.position.y=.018;inner.add(body);
  if(belly!=null){const b=new THREE.Mesh(new THREE.SphereGeometry(.029,12,8),mat(belly));b.scale.set(2.2,.4,.85);b.position.y=.01;inner.add(b);}
  const head=new THREE.Mesh(new THREE.SphereGeometry(.026,12,8),m);head.position.set(.075,.022,0);head.scale.set(1.3,.8,1);inner.add(head);
  const tail=new THREE.Mesh(new THREE.ConeGeometry(.016,.14,8).rotateZ(Math.PI/2),d);tail.position.set(-.13,.016,0);inner.add(tail);
  [[.035,.04],[.035,-.04],[-.035,.04],[-.035,-.04]].forEach(([x,z])=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(.005,.005,.04,4),m);l.position.set(x,.01,z);l.rotation.x=z>0?1.2:-1.2;inner.add(l);});
  const em=mat(0x111111);[1,-1].forEach(s=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.007,6,6),em);e.position.set(.09,.03,s*.017);inner.add(e);});
  if(spot!=null){const sm=mat(spot);for(let i=0;i<10;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.006,6,4),sm);s.position.set(rnd(-.06,.05),.036,rnd(-.018,.018));inner.add(s);}}
  g.userData={inner};return g;
}
function frogModel(){
  const g=new THREE.Group(),inner=new THREE.Group();g.add(inner);const m=mat(0x2a6fd6),k=mat(0x0d1530);
  const body=new THREE.Mesh(new THREE.SphereGeometry(.03,12,10),m);body.scale.set(1.25,.85,1);body.position.y=.025;inner.add(body);
  for(let i=0;i<6;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.006,6,4),k);const a=rnd(0,6.28);s.position.set(Math.cos(a)*.022,.045,Math.sin(a)*.02);inner.add(s);}
  [[.02,.028],[.02,-.028],[-.025,.03],[-.025,-.03]].forEach(([x,z])=>{const l=new THREE.Mesh(new THREE.SphereGeometry(.012,8,6),m);l.position.set(x,.008,z);l.scale.set(1.5,.5,1);inner.add(l);});
  [1,-1].forEach(s=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.008,6,6),k);e.position.set(.03,.045,s*.015);inner.add(e);});
  g.userData={inner};return g;
}
function jellyModel(color,r){
  const g=new THREE.Group(),inner=new THREE.Group();g.add(inner);
  const bm=new THREE.MeshPhongMaterial({color,transparent:true,opacity:.45,shininess:90,side:THREE.DoubleSide,depthWrite:false});
  const bell=new THREE.Mesh(new THREE.SphereGeometry(r,16,10,0,Math.PI*2,0,Math.PI/2),bm);bell.scale.y=.7;inner.add(bell);
  const gon=new THREE.Mesh(new THREE.TorusGeometry(r*.35,r*.08,6,16),mat(0xf2b8c8,{transparent:true,opacity:.7}));gon.rotation.x=Math.PI/2;gon.position.y=r*.3;inner.add(gon);
  const tm=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.5});
  for(let i=0;i<10;i++){const a=i/10*6.28,t=new THREE.Mesh(new THREE.CylinderGeometry(.0015,.0015,r*2.2,3),tm);t.position.set(Math.cos(a)*r*.85,-r*1.1,Math.sin(a)*r*.85);inner.add(t);}
  g.userData={inner,bell};return g;
}
function seahorseModel(){
  const g=new THREE.Group(),inner=new THREE.Group();g.add(inner);const m=mat(0xe0a43a);
  const pts=[[0,.1,0],[.012,.07,0],[.008,.035,0],[-.008,0,0],[-.004,-.035,0],[.014,-.055,0],[.022,-.045,0]].map(p=>new THREE.Vector3(p[0],p[1],p[2]));
  inner.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.012,8,false),m));
  const head=new THREE.Mesh(new THREE.SphereGeometry(.016,10,8),m);head.position.set(.004,.108,0);inner.add(head);
  const snout=new THREE.Mesh(new THREE.CylinderGeometry(.005,.006,.04,6),m);snout.rotation.z=Math.PI/2;snout.position.set(.03,.104,0);inner.add(snout);
  const fin=new THREE.Mesh(new THREE.CircleGeometry(.014,8),mat(0xf2c86a,{side:THREE.DoubleSide,transparent:true,opacity:.8}));fin.position.set(-.018,.05,0);inner.add(fin);
  const em=mat(0x111111);[1,-1].forEach(s=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.004,6,6),em);e.position.set(.01,.112,s*.012);inner.add(e);});
  g.userData={inner};return g;
}
function crabModel(color,shell){
  const g=new THREE.Group(),inner=new THREE.Group();g.add(inner);const m=mat(color);
  const body=new THREE.Mesh(new THREE.SphereGeometry(.035,12,8),m);body.scale.set(1,.45,1.35);body.position.y=.03;inner.add(body);
  for(let s=-1;s<=1;s+=2)for(let i=0;i<3;i++){const l=new THREE.Mesh(new THREE.CylinderGeometry(.004,.003,.06,4),m);l.position.set(-.012+i*.014,.02,s*.05);l.rotation.x=s*1.0;inner.add(l);}
  [1,-1].forEach(s=>{const c=new THREE.Mesh(new THREE.SphereGeometry(.014,8,6),m);c.scale.set(1.5,.8,1);c.position.set(.045,.028,s*.03);inner.add(c);});
  if(shell){const sh=new THREE.Mesh(new THREE.ConeGeometry(.04,.08,10),mat(0xe8dcc0));sh.rotation.z=Math.PI/2;sh.position.set(-.05,.045,0);inner.add(sh);}
  g.userData={inner};return g;
}
function eelModel(){
  const g=new THREE.Group(),inner=new THREE.Group();g.add(inner);const m=mat(0xe8e2d2),k=mat(0x1a1a1a);
  const pts=[[0,0,0],[.006,.06,0],[-.004,.12,0],[.008,.18,0],[.02,.21,0]].map(p=>new THREE.Vector3(p[0],p[1],p[2]));
  inner.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),20,.008,6,false),m));
  for(let i=0;i<9;i++){const sp=new THREE.Mesh(new THREE.SphereGeometry(.004,5,4),k);const t=i/9;sp.position.set(Math.sin(t*6)*.005+.008*(i%2?1:-1),.02+t*.17,.004*(i%2?1:-1));inner.add(sp);}
  const head=new THREE.Mesh(new THREE.SphereGeometry(.011,8,6),m);head.position.set(.022,.212,0);head.scale.set(1.5,1,1);inner.add(head);
  [1,-1].forEach(s=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.004,6,6),k);e.position.set(.03,.216,s*.007);inner.add(e);});
  const hole=new THREE.Mesh(new THREE.CircleGeometry(.018,12),mat(0x8a7a5a));hole.rotation.x=-Math.PI/2;hole.position.y=.002;g.add(hole);
  g.userData={inner};return g;
}
function swarmPoints(n,color,size,rad){
  const pos=new Float32Array(n*3),off=[];for(let i=0;i<n;i++){const v=new THREE.Vector3(rnd(-1,1),rnd(-1,1),rnd(-1,1)).multiplyScalar(rad);off.push(v);pos[i*3]=v.x;pos[i*3+1]=v.y;pos[i*3+2]=v.z;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const p=new THREE.Points(geo,new THREE.PointsMaterial({color,size,transparent:true,opacity:.9,depthWrite:false}));p.userData.off=off;p.userData.rad=rad;return p;
}
function decorModel(type){
  const g=new THREE.Group();
  if(type==='stone'){const ms=[mat(0x6b665e),mat(0x8f8578),mat(0x56514a)];[[0,0,.08],[.1,.03,.055],[-.07,.05,.05],[.02,-.09,.045]].forEach(([x,z,s],i)=>{const r=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),ms[i%3]);r.position.set(x,s*.45,z);r.scale.y=.7;r.rotation.y=i;g.add(r);});}
  else if(type==='rockmtn'){const ms=[mat(0x7d786f),mat(0x8d877c),mat(0x6a655d)],moss=mat(0x4f7d2e);
    [[0,0,0,.2],[.08,.16,.03,.14],[-.03,.3,-.02,.1],[.02,.42,.01,.065],[-.14,.05,.06,.1],[.15,.04,-.08,.09]].forEach(([x,y,z,s],i)=>{const r=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),ms[i%3]);r.position.set(x,y+s*.5,z);r.scale.set(1,.85,1);r.rotation.set(i,i*2,0);g.add(r);});
    for(let i=0;i<10;i++){const s=new THREE.Mesh(new THREE.IcosahedronGeometry(.025,0),moss);s.position.set(rnd(-.12,.12),rnd(.1,.4),rnd(-.08,.08));g.add(s);}}
  else if(type==='bridge'){const wood=mat(0x8a5a35),red=mat(0x9b3b2a);const R=.22,Nn=11;
    for(let i=0;i<Nn;i++){const a=Math.PI*(i+.5)/Nn,pl=new THREE.Mesh(new THREE.BoxGeometry(.045,.012,.16),wood);pl.position.set(-Math.cos(a)*R,Math.sin(a)*R*.55,0);pl.rotation.z=-Math.atan2(Math.cos(a)*.55,Math.sin(a));g.add(pl);}
    [-.085,.085].forEach(z=>{const pts=[];for(let i=0;i<=16;i++){const a=Math.PI*i/16;pts.push(new THREE.Vector3(-Math.cos(a)*R,Math.sin(a)*R*.55+.06,z));}
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.007,5,false),red));
      for(let i=1;i<16;i+=3){const a=Math.PI*i/16,p=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.06,4),red);p.position.set(-Math.cos(a)*R,Math.sin(a)*R*.55+.03,z);g.add(p);}});}
  else if(type==='driftwood'){const m=mat(0x5b3a22),m2=mat(0x6e4a2e);
    const main=new THREE.CatmullRomCurve3([new THREE.Vector3(-.25,.02,0),new THREE.Vector3(-.08,.07,.03),new THREE.Vector3(.08,.16,-.02),new THREE.Vector3(.2,.32,.03)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(main,20,.03,7,false),m));
    [[0,.11,0,.18,.3,.12],[.1,.2,0,0,.36,-.1],[-.15,.05,0,-.28,.15,.1]].forEach(([a,b,c,d,e,f],i)=>{const cv=new THREE.CatmullRomCurve3([new THREE.Vector3(a,b,c),new THREE.Vector3((a+d)/2,(b+e)/2+.03,(c+f)/2),new THREE.Vector3(d,e,f)]);g.add(new THREE.Mesh(new THREE.TubeGeometry(cv,10,.014-i*.002,5,false),m2));});}
  return g;
}
function subModel(it){
  const [y0,y1]=J.subs[it.uid]||[0,.001],g=new THREE.Group(),m=mat(CAT[it.type].color);
  if(J.box){const b=new THREE.Mesh(new THREE.BoxGeometry(2*J.R*.985,y1-y0,2*J.R*.985),m);b.position.y=(y0+y1)/2;g.add(b);}
  else{const pts=[new THREE.Vector2(0,y0),new THREE.Vector2(rAt(y0)*.985,y0)];J.pts.forEach(p=>{const y=p.y*J.H;if(y>y0&&y<y1)pts.push(new THREE.Vector2(p.x*J.R*.985,y));});
    pts.push(new THREE.Vector2(rAt(y1)*.985,y1),new THREE.Vector2(0,y1));g.add(new THREE.Mesh(new THREE.LatheGeometry(pts,56),m));}
  if(Math.abs(y1-J.sTop)<1e-6&&!(it.type==='soil'&&J.terrain)){
    const n=it.type==='gravel'?40:it.type==='soil'?16:10;
    const ms=it.type==='soil'?[mat(0x3e2b1f),mat(0x6a4a2c)]:it.type==='gravel'?[mat(0x6b665e),mat(0xa39b8e),mat(0x56514a)]:[mat(0xb9a379),mat(0x8f8578)];
    for(let i=0;i<n;i++){const [x,z]=randIn(y1,.88),s=(it.type==='gravel'?rnd(.02,.035):rnd(.012,.03))*J.k,p=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),ms[i%ms.length]);p.scale.y=.5;p.position.set(x,y1+s*.2,z);g.add(p);}
  }
  return g;
}
let microbeLayer=null;
function buildMicrobeLayer(){
  if(microbeLayer)disposeObj(microbeLayer);
  const n=160,pos=new Float32Array(n*3);
  for(let i=0;i<n;i++){const [x,z]=randIn(J.sTop,.92);pos[i*3]=x;pos[i*3+1]=groundY(x,z)+rnd(0,.05);pos[i*3+2]=z;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  microbeLayer=new THREE.Points(geo,new THREE.PointsMaterial({color:S.mode==='aqua'?0xf2e2a0:0xd9b98a,size:.022,transparent:true,opacity:0,depthWrite:false}));
  world.add(microbeLayer);
}
function buildItem(it){
  const t=it.type,C=CAT[t],k=C.kind;let g;
  const wH=(J.waterTop!=null?J.waterTop:J.H*.8)-J.sTop;
  if(k==='sub')g=subModel(it);
  else if(k==='decor')g=decorModel(t);
  else if(t==='hornwort')g=plantStem(C.color,new THREE.ConeGeometry(.006,.12,3).translate(0,.06,0),7,.055,1.05,wH);
  else if(t==='elodea')g=plantStem(C.color,new THREE.PlaneGeometry(.018,.07).translate(0,.035,0),4,.045,.9,wH);
  else if(t==='vallis')g=blades(C.color,7,wH*.85,.03,.22);
  else if(t==='javafern'){g=fronds(C.color,6,.22,.06,.25);const r=new THREE.Mesh(new THREE.DodecahedronGeometry(.07,0),mat(0x6d6a63));r.scale.y=.6;r.position.y=.03;g.add(r);}
  else if(t==='moss'){g=clump(['#3d6b25','#4f7d2e','#2f5a1d'],26,.16,.055,.12);const r=new THREE.Mesh(new THREE.DodecahedronGeometry(.12,0),mat(0x6d6a63));r.scale.set(1.3,.6,1);r.position.y=.03;g.add(r);}
  else if(t==='marimo'){g=new THREE.Group();const s=new THREE.Mesh(new THREE.IcosahedronGeometry(.07,2),mat(C.color));s.position.y=.07;g.add(s);g.userData.top=.14;}
  else if(t==='lotus'){g=new THREE.Group();const top=J.waterTop!=null?J.waterTop-J.sTop:J.H*.4,sm=mat(0x5f7d2a),lm=mat(0x4f8f3a,{side:THREE.DoubleSide}),pk=mat(0xf0a3b8,{side:THREE.DoubleSide}),yl=mat(0xf2d35a);
    for(let i=0;i<5;i++){const a=rnd(0,6.28),r=rnd(.05,.22),up=i<2?rnd(.08,.2):0,h=top+up,x=Math.cos(a)*r,z=Math.sin(a)*r;
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(x*.4,h*.5,z*.4),new THREE.Vector3(x,h,z)]),10,.007,5,false),sm));
      const pad=new THREE.Mesh(new THREE.CircleGeometry(rnd(.1,.15),20,.15,Math.PI*2-.3),lm);pad.rotation.x=-Math.PI/2;pad.rotation.z=rnd(0,6.28);pad.position.set(x,h+.003,z);if(up){pad.rotation.x=-Math.PI/2+rnd(-.5,.5);pad.scale.setScalar(.9);}g.add(pad);}
    const fh=top+.22,fl=new THREE.Group();fl.position.set(.03,fh,0);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.02,fh*.5,0),new THREE.Vector3(.03,fh,0)]),10,.006,5,false),sm));
    for(let i=0;i<9;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),pk);p.scale.set(.45,1,.2);const a=i/9*6.28;p.position.set(Math.cos(a)*.025,.03,Math.sin(a)*.025);p.rotation.set(Math.sin(a)*.5,-a,Math.cos(a)*-.5);fl.add(p);}
    const pod=new THREE.Mesh(new THREE.CylinderGeometry(.015,.01,.02,10),yl);pod.position.y=.03;fl.add(pod);g.add(fl);g.userData.top=fh;}
  else if(t==='caulerpa')g=clump(['#4fa04a','#6abf5a','#3f8a3a'],34,.15,.03,.14);
  else if(t==='duckweed'){g=new THREE.Group();const m=mat(C.color,{side:THREE.DoubleSide});
    for(let i=0;i<14;i++){const l=new THREE.Mesh(new THREE.CircleGeometry(rnd(.025,.04),10),m);l.rotation.x=-Math.PI/2;const a=rnd(0,6.28),r=rnd(0,.2);l.position.set(Math.cos(a)*r,.004,Math.sin(a)*r);g.add(l);}g.userData.top=0;}
  else if(t==='fern')g=fronds(C.color,9,.32,.07,.5);
  else if(t==='cmoss')g=clump(['#5aa03a','#6db246','#4a8a2e'],46,.3,.05,.05);
  else if(t==='pothos'){g=new THREE.Group();const h=clamp(J.H*.55,.4,2),pts=[];for(let i=0;i<=6;i++){const tt=i/6;pts.push(new THREE.Vector3(Math.sin(tt*5)*.08,tt*h,Math.cos(tt*4)*.06));}
    const cv=new THREE.CatmullRomCurve3(pts);g.add(new THREE.Mesh(new THREE.TubeGeometry(cv,30,.008,5,false),mat(0x5f7d2a)));
    const lm=mat(C.color,{side:THREE.DoubleSide});for(let i=1;i<14;i++){const p=cv.getPoint(i/14),lf=new THREE.Mesh(new THREE.CircleGeometry(.045,10),lm);lf.scale.set(.75,1,1);lf.position.copy(p);lf.rotation.set(rnd(-.6,.6),i*1.9,rnd(-.4,.4));lf.translateX(.04);g.add(lf);}
    g.userData.top=h;}
  else if(t==='bromeliad'){g=fronds('#3f7d35',10,.2,.04,.6);g.add(fronds(C.color,5,.09,.03,.4));}
  else if(t==='fittonia')g=clump(['#c8607a','#3f6f35','#d77a92'],30,.13,.04,.1);
  else if(t==='guppy')g=fishModel(0xe8a04a,[0x3a6fd8,0xd8463a,0x8a3ad8][it.n%3],.055,false);
  else if(t==='medaka')g=fishModel(0xe6d3a3,0xf0b860,.045,true);
  else if(t==='minnow')g=fishModel(0xc9d3c2,0xd3473a,.05,true);
  else if(t==='betta')g=fishModel(0x3b4fd1,[0xd23b5a,0x3b8fd1,0x8a3ad8][it.n%3],.055,false,true);
  else if(t==='pleco')g=fishModel(0x5a4a35,0x3d3226,.06,false);
  else if(t==='shrimp')g=shrimpModel(0xd9452f,.92);
  else if(t==='amano')g=shrimpModel(0xb9b2a0,.6);
  else if(t==='snail')g=snailModel(0x7a5532,0x3e2a17);
  else if(t==='nerite')g=snailModel(0x2d2a20,0xd8c25a);
  else if(t==='daphnia')g=swarmPoints(40,0xd9b46a,.022,.12);
  else if(t==='jelly')g=jellyModel(0xe9eef2,.035);
  else if(t==='moonjelly')g=jellyModel(0xdfe6ff,.06);
  else if(t==='seahorse')g=seahorseModel();
  else if(t==='gardeneel')g=eelModel();
  else if(t==='crab')g=crabModel(0xc4502c,false);
  else if(t==='hermit')g=crabModel(0xd06a3a,true);
  else if(t==='slider')g=turtleModel(0x4f7a3a,0x7a9a3a,1.1);
  else if(t==='turtle')g=turtleModel(0x4b4a2c,0x5d6b4a,1);
  else if(t==='newt')g=lizardModel(0x2b2b2b,0x222222,null,0xe0542a);
  else if(t==='gecko')g=lizardModel(0xc9893f,0x8e5a22,null,null);
  else if(t==='leopard')g=lizardModel(0xe8c23a,0xd9b030,0x3a2a1a,null);
  else if(t==='frog')g=frogModel();
  else if(t==='isopod'){g=new THREE.Group();it.agents=[];const m=mat(0x6f6a66);
    for(let i=0;i<8;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.013,8,6),m);b.scale.set(1.7,.55,1.1);g.add(b);it.agents.push({mesh:b,p:new THREE.Vector3(),hd:rnd(0,6.28)});}}
  else if(t==='springtail')g=swarmPoints(70,0xeeeeea,.014,.2);
  else {g=new THREE.Group();g.add(new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.02,24),new THREE.MeshBasicMaterial({visible:false})));}
  if(k==='animal'){const b=new THREE.Box3().setFromObject(g);g.userData.br=b.isEmpty()?.05:Math.max(Math.abs(b.min.x),Math.abs(b.max.x),Math.abs(b.min.z),Math.abs(b.max.z))||.05;}
  g.userData.uid=it.uid;it.g=g;world.add(g);
  it.m={p:new THREE.Vector3(),v:new THREE.Vector3(),tgt:new THREE.Vector3(),prev:new THREE.Vector3(),tt:0,spd:.05,hd:rnd(0,6.28),ph:rnd(0,6),hop:0,h0:new THREE.Vector3()};
  placeItem(it);
}
function plantF(it){if(it.type==='duckweed')return J.box?J.R*.6:rAt(J.waterTop||J.sTop)*.55;if(J.box)return J.R*.78;if(['moss','cmoss','marimo'].includes(it.type))return rAt(J.sTop)*.75;return Math.min(J.minR,rAt(J.sTop))*.72;}
function placeItem(it){
  const C=CAT[it.type],k=C.kind,g=it.g;if(!g)return;
  if(k==='sub'){g.position.set(0,0,0);return;}
  if(k==='decor'){const [x,z]=floorMap(it.params.x,it.params.z);g.position.set(x,groundY(x,z),z);const d2r=Math.PI/180;g.rotation.order='YXZ';g.rotation.set((it.params.rotX||0)*d2r,(it.params.rot||0)*d2r,(it.params.rotZ||0)*d2r);g.scale.setScalar(it.params.size*J.k);fitInJar(it);return;}
  if(k==='plant'){
    const f=plantF(it);let px=it.rx*f,pz=it.rz*f;
    if(S.mode==='rain'&&!it.userPlaced){
      const want=isWater(it),now=inWater(px,pz,.02);
      if(want!==now){const p=want?waterPoint(.05):landPoint();if(p){px=p[0];pz=p[1];it.rx=px/f;it.rz=pz/f;}}
    }
    if(it.type==='duckweed')g.position.set(px,J.waterTop!=null?J.waterTop:J.sTop,pz);
    else g.position.set(px,groundY(px,pz),pz);
    g.visible=!(it.type==='duckweed'&&J.waterTop==null);
    fitInJar(it);
    return;
  }
  if(k==='animal'){
    const m=it.m,mv=C.move,hab=C.hab;let x,z;
    if(hab==='water'){const p=waterPoint(.05)||randIn(J.sTop,.6);[x,z]=p;}
    else if(hab==='land'){[x,z]=landPoint();}
    else{const p=Math.random()<.5&&J.waterTop!=null?waterPoint(.05):landPoint();[x,z]=p||[0,0];}
    const gy=groundY(x,z),swim=['swim','swarm','jelly','seahorse','aqturtle'].includes(mv);
    if(mv==='eel'){m.p.set(x,gy,z);g.position.copy(m.p);g.rotation.y=rnd(0,6.28);m.prev.copy(m.p);m.tgt.copy(m.p);return;}
    let y=gy+.01;if(swim&&J.waterTop!=null)y=rnd(gy+.1,Math.max(gy+.1,J.waterTop-.08));
    m.p.set(x,y,z);m.prev.copy(m.p);m.tgt.copy(m.p);g.position.copy(m.p);
    if(it.agents)it.agents.forEach(a=>{const [ax,az]=landPoint();a.p.set(x*.5+ax*.5,0,z*.5+az*.5);a.p.y=groundY(a.p.x,a.p.z)+.006;a.mesh.position.copy(a.p);});
    if(mv==='spring')g.position.set(x,gy+.01,z);
    return;
  }
  g.position.set(0,J.sTop,0);
}

/* ---- 特效 & 天氣 ---- */
const fxGeo=new THREE.SphereGeometry(1,6,5);
const bubMat=new THREE.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:.55,shininess:200,depthWrite:false});
const poopMat=mat(0x5a4630),flakeMat=mat(0xe07a2e);
const bubbles=[],poops=[],flakes=[];
function spawn(list,matl,s,max){let o=list.find(b=>!b.visible);if(!o){if(list.length>=max)return null;o=new THREE.Mesh(fxGeo,matl);world.add(o);list.push(o);}o.visible=true;o.scale.setScalar(s);o.userData.age=0;return o;}
function feedFx(n){if(J.waterTop==null)return;const c=Math.min(30,Math.round(n*8));for(let i=0;i<c;i++){const f=spawn(flakes,flakeMat,.012,40);if(!f)break;const p=waterPoint(.02)||[0,0];f.position.set(p[0],J.waterTop-.01,p[1]);f.scale.set(.014,.004,.012);f.userData.vy=rnd(.02,.05);}}
function bubbleAt(x,y,z,s){if(J.waterTop==null||y>=J.waterTop)return;const b=spawn(bubbles,bubMat,s,140);if(b){b.position.set(x,y,z);b.userData.vy=rnd(.2,.32);}}
const ring=(()=>{const r=new THREE.Mesh(new THREE.TorusGeometry(1,.06,8,40),new THREE.MeshBasicMaterial({color:0x46b8ac,transparent:true,opacity:.9,depthTest:false}));r.rotation.x=Math.PI/2;r.renderOrder=10;r.visible=false;world.add(r);return r;})();
let flash=0,boltT=0;
const RAIN_N=600;
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(RAIN_N*6),3));
const rainLines=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0xaac4d6,transparent:true,opacity:.55}));scene.add(rainLines);
const rainDrops=[];
const boltGeo=new THREE.BufferGeometry();boltGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(30*3),3));
const bolt=new THREE.Line(boltGeo,new THREE.LineBasicMaterial({color:0xf4f6ff}));bolt.visible=false;scene.add(bolt);
const mistCloud=swarmPoints(140,0xffffff,.09,1);mistCloud.material.opacity=0;scene.add(mistCloud);
function layoutWeather(maxR){
  rainDrops.length=0;
  for(let i=0;i<RAIN_N;i++){const a=rnd(0,6.28),r=rnd(maxR*1.25,7);rainDrops.push({x:Math.cos(a)*r,z:Math.sin(a)*r,y:rnd(-1,9),v:rnd(7,10)});}
  const ma=mistCloud.geometry.attributes.position.array;
  mistCloud.userData.off.forEach((v,i)=>{const [x,z]=randIn(J.H*.5,.9);v.set(x,rnd(J.sTop+.05,J.H*.85),z);ma[i*3]=v.x;ma[i*3+1]=v.y;ma[i*3+2]=v.z;});
  mistCloud.geometry.attributes.position.needsUpdate=true;
}
function makeBolt(){
  const a=rnd(-1.2,1.2),R=rnd(9,13),arr=boltGeo.attributes.position.array;let x=Math.sin(a)*R,y=12,z=-Math.cos(a)*R;
  for(let i=0;i<30;i++){arr[i*3]=x;arr[i*3+1]=y;arr[i*3+2]=z;x+=rnd(-.5,.5);y-=.45;z+=rnd(-.3,.3);}
  boltGeo.attributes.position.needsUpdate=true;bolt.visible=true;
}

/* ---- 鏡頭 & 拖動 ---- */
const cam={theta:.6,phi:1.15,dist:6,target:new THREE.Vector3(0,1,0),idle:0};
function updateCam(){const {theta,phi,dist,target}=cam;camera.position.set(target.x+dist*Math.sin(phi)*Math.sin(theta),target.y+dist*Math.cos(phi),target.z+dist*Math.sin(phi)*Math.cos(theta));camera.lookAt(target);}
const ray=new THREE.Raycaster();ray.params.Points.threshold=.04;
const dragPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hitP=new THREE.Vector3();let drag=null;
function setRay(e){const r=canvas.getBoundingClientRect();ray.setFromCamera({x:(e.clientX-r.left)/r.width*2-1,y:-(e.clientY-r.top)/r.height*2+1},camera);}
const draggable=i=>{const k=CAT[i.type].kind;return k==='decor'||(k==='plant'&&!CAT[i.type].floating);};
function hitItem(e,f){setRay(e);const groups=S.items.filter(i=>i.alive&&i.g&&f(i)).map(i=>i.g);const hit=ray.intersectObjects(groups,true)[0];if(!hit)return null;
  let o=hit.object;while(o&&o.userData.uid===undefined)o=o.parent;return o?S.items.find(i=>i.uid===o.userData.uid):null;}
function setFloorPos(it,x,z){const k=CAT[it.type].kind;
  if(k==='plant'){const f=plantF(it);it.rx=clamp(x/f,-1.3,1.3);it.rz=clamp(z/f,-1.3,1.3);it.userPlaced=true;}
  else{const f=floorF();it.params.x=+clamp(x/f,-1,1).toFixed(2);it.params.z=+clamp(z/f,-1,1).toFixed(2);}
  placeItem(it);}
const ptrs=new Map();let downXY=null,pinch0=0,mid0=null;
let painting=false,terraTouched=false;
function paintEv(e){setRay(e);let p=null;if(J.terrMesh){const h=ray.intersectObject(J.terrMesh)[0];if(h)p=h.point;}
  if(!p){dragPlane.constant=-J.floor;if(ray.ray.intersectPlane(dragPlane,hitP))p=hitP;}if(p){applyBrush(p.x,p.z);terraTouched=true;}}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});downXY={x:e.clientX,y:e.clientY,moved:false};cam.idle=0;
  if(S.build&&buildTool!=='view'&&ptrs.size===1&&e.button===0){painting=true;drag=null;paintEv(e);return;}
  if(S.build&&e.button!==0)drag=null;
  if(painting&&ptrs.size>1){painting=false;}
  if(ptrs.size===1){const it=hitItem(e,draggable);drag=it?{it,moved:false}:null;}else drag=null;
  if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch0=Math.hypot(a.x-b.x,a.y-b.y);mid0={x:(a.x+b.x)/2,y:(a.y+b.y)/2};}});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p)return;
  if(painting&&ptrs.size===1){paintEv(e);p.x=e.clientX;p.y=e.clientY;cam.idle=0;return;}
  if(drag&&ptrs.size===1){
    if(Math.hypot(e.clientX-downXY.x,e.clientY-downXY.y)>6){drag.moved=true;downXY.moved=true;}
    if(drag.moved){setRay(e);dragPlane.constant=-J.sTop;if(ray.ray.intersectPlane(dragPlane,hitP)){hitP.y=J.sTop;clampIn(hitP,.86);setFloorPos(drag.it,hitP.x,hitP.z);}}
    p.x=e.clientX;p.y=e.clientY;cam.idle=0;return;}
  const dx=e.clientX-p.x,dy=e.clientY-p.y;
  if(ptrs.size===1){cam.theta-=dx*.008;cam.phi=clamp(cam.phi-dy*.006,.25,1.62);}
  p.x=e.clientX;p.y=e.clientY;
  if(ptrs.size===2){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;if(pinch0)cam.dist=clamp(cam.dist*pinch0/d,J.H*1.1,J.H*6);pinch0=d;
    if(mid0){cam.theta-=(mx-mid0.x)*.008;cam.phi=clamp(cam.phi-(my-mid0.y)*.006,.25,1.62);}mid0={x:mx,y:my};}
  if(downXY&&Math.hypot(e.clientX-downXY.x,e.clientY-downXY.y)>6)downXY.moved=true;cam.idle=0;});
const up=e=>{
  if(painting||(S.build&&terraTouched)){painting=false;terraTouched=false;ptrs.delete(e.pointerId);if(ptrs.size<2){pinch0=0;mid0=null;}if(!ptrs.size)downXY=null;buildJar({keepCam:true});renderCatalog();renderMeters();save();return;}
  if(drag&&ptrs.size===1){const it=drag.it,moved=drag.moved;drag=null;ptrs.delete(e.pointerId);downXY=null;if(moved){if(S.sel===it)renderEditor();save();}select(it,e);return;}
  if(downXY&&!downXY.moved&&ptrs.size===1)pick(e);ptrs.delete(e.pointerId);if(ptrs.size<2){pinch0=0;mid0=null;}if(!ptrs.size)downXY=null;};
canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);downXY=null;drag=null;if(painting){painting=false;buildJar({keepCam:true});}mid0=null;pinch0=0;});
canvas.addEventListener('wheel',e=>{e.preventDefault();cam.dist=clamp(cam.dist*(1+e.deltaY*.001),J.H*1.1,J.H*6);cam.idle=0;},{passive:false});
function pick(e){const it=hitItem(e,i=>CAT[i.type].kind!=='microbe');if(it)select(it,e);else closePop();}


/* ---- 每格動畫 ---- */
const sandC=new THREE.Color(0xc9a46a),cDay=new THREE.Color(0xcfe3e3),cGray=new THREE.Color(0x8d9aa0),cNight=new THREE.Color(0x0a141b),cBg=new THREE.Color(),cWhite=new THREE.Color(0xf2f4ff),dayCol=new THREE.Color();
const wClear=new THREE.Color(0x9fd6e0),wSalt=new THREE.Color(0x7cc3dd),wGreen=new THREE.Color(0x6d9a35),wCol=new THREE.Color(),grayC=new THREE.Color(0x8a8a80),brownC=new THREE.Color(0x6b5a3a),whiteC=new THREE.Color(0xffffff);
let tAll=0;
function lightLevel(hf){const on=7,off=7+S.light;if(S.light>=24)return 1;if(S.light<=0)return 0;
  const ramp=x=>clamp(x/.6,0,1);let v=Math.min(ramp(hf-on+.3),ramp(off-hf+.3));if(off>24)v=Math.max(v,ramp(off-24-hf+.3));return clamp(v,0,1);}
function face(g,v,pitchMax){if(v.lengthSq()>1e-8){g.rotation.y=Math.atan2(-v.z,v.x);const hz=Math.hypot(v.x,v.z);g.rotation.z=clamp(Math.atan2(v.y,hz),-pitchMax,pitchMax);}}
function steer(m,spd,dt,rate){const d=m.tgt.clone().sub(m.p),l=d.length();if(l>1e-4)d.multiplyScalar(spd/l);m.v.lerp(d,Math.min(1,dt*rate));}
function hasLand(){if(J.waterTop==null)return false;for(let i=0;i<12;i++){const [x,z]=randIn(J.sTop,.8);if(!inWater(x,z,-.01))return true;}return false;}
function swimTarget(m,lo,hi){const p=waterPoint(.06);if(!p){m.tgt.copy(m.p);return;}const gy=groundY(p[0],p[1]),a=gy+(lo??.08),b=Math.max(a,J.waterTop-(hi??.06));m.tgt.set(p[0],rnd(a,b),p[1]);}
const SWIMMERS=['swim','swarm','jelly','seahorse','aqturtle'],BOTTOM=['crawl','pleco','crab'];
function animate(dt,hf){
  if(terraDirty){terraDirty=false;buildTerraMesh();}if(S.build)cam.idle=0;
  tAll+=dt;const lv=S.build?(S.buildDay?1:0):lightLevel(hf),w=S.build?WX.sunny:(WX[S.wx]||WX.cloudy),c=S.c,wL=wLOf(S);
  flash=Math.max(0,flash-dt*3);boltT=Math.max(0,boltT-dt);bolt.visible=boltT>0;
  if(w.bolt&&Math.random()<dt*.35){flash=1;boltT=.18;makeBolt();}
  dayCol.copy(cDay).lerp(cGray,(1-w.light)*.85);
  cBg.copy(cNight).lerp(dayCol,lv).lerp(cWhite,flash*.7);renderer.setClearColor(cBg);
  const wl=(.35+.65*w.light)*Math.min(1.1,regionOf(S).light);
  sun.intensity=(.12+.88*lv)*wl+flash*1.5;hemi.intensity=(.25+.45*lv)*(.6+.4*w.light)+flash;fill.intensity=.35-.1*lv;
  lampMat.color.setHex(lv>.5?0xfff1bf:0x2a2f33);
  if(w.fog||w.sand){if(!scene.fog)scene.fog=new THREE.Fog(cBg.getHex(),4,14);scene.fog.color.copy(cBg);if(w.sand)scene.fog.color.lerp(sandC,.6);scene.fog.near=J.H*(w.sand?.9:1.2);scene.fog.far=J.H*(w.sand?4.5:6);}else scene.fog=null;
  if(w.sand)renderer.setClearColor(cBg.clone().lerp(sandC,.5));
  const pOn=!!(w.rain||w.snow||w.sand);rainLines.visible=pOn;
  if(pOn){const arr=rainGeo.attributes.position.array,n=Math.round(RAIN_N*(w.rain>1||w.sand?1:.6)),sp=w.snow?.12:w.sand?.25:1;
    rainLines.material.color.setHex(w.snow?0xffffff:w.sand?0xc9a46a:0xaac4d6);rainLines.material.opacity=w.snow?.9:.55;
    for(let i=0;i<RAIN_N;i++){const d=rainDrops[i];if(!d)continue;
      if(w.sand){d.x+=d.v*dt*.6;if(d.x>7)d.x=-7;d.y-=d.v*dt*.05;if(d.y<0)d.y+=9;}else{d.y-=d.v*dt*sp;if(d.y<0)d.y+=9;if(w.snow)d.x+=Math.sin(tAll+i)*dt*.1;}
      const on=i<n,dx=w.sand?.3:.03,dy=w.snow?.04:w.sand?.01:.35;
      arr[i*6]=d.x;arr[i*6+1]=on?d.y:-50;arr[i*6+2]=d.z;arr[i*6+3]=d.x+dx;arr[i*6+4]=on?d.y+dy:-50;arr[i*6+5]=d.z;}
    rainGeo.attributes.position.needsUpdate=true;}
  if(waterMat){const ag=clamp(c.algae/45,0,1);wCol.copy(S.mode==='aqua'&&S.water==='salt'?wSalt:wClear).lerp(wGreen,ag);waterMat.color.copy(wCol);waterMat.opacity=.16+.3*ag;surfMat.color.copy(wCol).lerp(whiteC,.3);}
  if(glassMat){const cond=S.mode==='rain'&&c.hum>85?(c.hum-85)/15*.35:0;glassMat.opacity=glassMat.userData.base+cond;}
  mistFx=Math.max(0,mistFx-dt*.5);mistCloud.visible=S.mode==='rain';mistCloud.material.opacity=S.mode==='rain'?clamp(mistFx*.4+(c.hum>92?(c.hum-92)/8*.25:0),0,.5):0;
  lid.visible=S.sealed;
  pumpG.visible=wL>0&&S.pump;filterG.visible=wL>0&&S.filter;
  const vis=Math.min(1.6,1+S.speed/40);
  if(pumpG.visible&&Math.random()<dt*25){const s=pumpG.userData.src;bubbleAt(s.x+rnd(-.02,.02),s.y,s.z+rnd(-.02,.02),rnd(.008,.016));}
  if(filterG.visible&&Math.random()<dt*8){const s=filterG.userData.src;bubbleAt(s.x,s.y,s.z,rnd(.006,.011));}
  if(microbeLayer){const m=aliveIn(S,'microbe');microbeLayer.material.opacity=m.length?.25+.35*Math.max(...m.map(i=>i.health)):0;}
  const oc=wL>0?c.O2/wL:0,wt=J.waterTop;
  for(const it of S.items){
    const g=it.g;if(!g)continue;const C=CAT[it.type],k=C.kind,m=it.m;
    if(!it.alive){
      it.deadT+=dt;const u=g.userData;
      if(u.inner)u.inner.rotation.x=Math.min(Math.PI,u.inner.rotation.x+dt*2);
      if(SWIMMERS.includes(C.move)&&wt!=null){m.p.y=Math.min(wt-.04,m.p.y+dt*.12);g.position.copy(m.p);}
      if(k==='plant')g.scale.y=Math.max(.2,1-it.deadT*.08);
      g.traverse(o=>{const mm=o.material;if(mm&&!Array.isArray(mm)){mm.transparent=true;if(mm.color)mm.color.lerp(k==='plant'?brownC:grayC,dt*.5);mm.opacity=clamp(1-(it.deadT-5)/4,0,1);}});
      if(it.deadT>9){disposeObj(g);it.g=null;it.gone=true;}
      continue;
    }
    if(k==='plant'){
      if(it.type==='hornwort'||it.type==='elodea')g.rotation.z=Math.sin(tAll*.7+m.ph)*.04;
      if(g.userData.blades)g.userData.blades.forEach(b=>{b.rotation.z=Math.sin(tAll*.8+b.userData.ph)*(isWater(it)?.07:.03);});
      if(it.type==='duckweed'){g.position.x+=Math.sin(tAll*.2+m.ph)*dt*.01;g.position.z+=Math.cos(tAll*.17+m.ph)*dt*.01;}
      if(isWater(it)&&!C.floating&&Math.random()<it.lastProd*lv*2.2*vis*dt)bubbleAt(g.position.x+rnd(-.08,.08),g.position.y+rnd(.1,1)*(g.userData.top||.2),g.position.z+rnd(-.08,.08),rnd(.008,.016));
      continue;
    }
    if(k!=='animal')continue;
    const mv=C.move,p=it.params,u=g.userData,hb=.5+.5*it.health,hab=C.hab,BR=Math.min(.25,(u.br||.05)*(g.scale.x||1))+.006;
    if(it.age!=null)g.scale.setScalar(.45+.55*clamp(it.age/4,0,1));
    m.prev.copy(m.p);
    // 攻擊：追住目標；俾人攻擊：走快啲
    if(it.chaseT>0){it.chaseT-=dt;if(it.chase&&it.chase.alive&&it.chase.m){m.tgt.copy(it.chase.m.p);m.tt=Math.max(m.tt,.5);m.hd=Math.atan2(it.chase.m.p.z-m.p.z,it.chase.m.p.x-m.p.x);}else it.chaseT=0;}
    let boost=1;if(it.fleeT>0){it.fleeT-=dt;boost*=1.7;}if(it.chaseT>0)boost*=1.6;
    // 水中生物冇水：攤喺地上
    if(hab==='water'&&wt==null){m.p.y=groundY(m.p.x,m.p.z)+.02;g.position.copy(m.p);if(u.inner)u.inner.rotation.x=Math.PI/2;continue;}
    if(mv==='eel'){
      m.tt-=dt;if(m.tt<=0){m.hop=Math.random()<.25?1:0;m.tt=m.hop?rnd(1.5,3):rnd(4,10);}
      const tgtH=m.hop?.15:(it.stress?.6:1);m.spd=(m.spd??1);m.spd+=(tgtH-m.spd)*Math.min(1,dt*3);
      u.inner.scale.y=m.spd;u.inner.rotation.z=Math.sin(tAll*1.3+m.ph)*.18;u.inner.rotation.x=Math.cos(tAll*.9+m.ph)*.1;
      m.p.y=groundY(m.p.x,m.p.z);g.position.copy(m.p);continue;
    }
    if(mv==='swim'){
      m.tt-=dt;if(m.tt<=0||m.p.distanceTo(m.tgt)<.08){swimTarget(m);m.tt=rnd(2.5,6);}
      if(oc<p.o2Min+.6){m.tgt.y=wt-.07;}
      steer(m,(it.stress?.14:.24)*hb,dt,1.6);
      u.tail.rotation.y=Math.sin(tAll*(8+m.v.length()*30)+m.ph)*.45;
    } else if(mv==='aqturtle'&&(m.onLand||(lv>.5&&Math.random()<dt*.08&&hasLand()))){
      // 有陸地時：日頭會爬上岸曬背，夜晚落返水
      if(!m.onLand){const q=landPoint();m.tgt.set(q[0],groundY(q[0],q[1])+.006,q[1]);m.onLand=true;m.tt=rnd(8,16);}
      m.tt-=dt;if(m.tt<=0||lv<.3){m.onLand=false;swimTarget(m);m.tt=rnd(4,8);}
      const sw=inWater(m.p.x,m.p.z,.02);steer(m,(sw?.1:.05)*hb,dt,1.2);m.v.y=0;
      m.p.addScaledVector(m.v,dt*vis);clampInR(m.p,BR);m.p.y=sw?Math.min(m.p.y,wt-.015):groundY(m.p.x,m.p.z)+.006;
      g.position.copy(m.p);face(g,m.v,0);continue;
    } else if(mv==='aqturtle'){
      m.tt-=dt;if(m.tt<=0||m.p.distanceTo(m.tgt)<.08){swimTarget(m);if(Math.random()<.4)m.tgt.y=wt-.05;m.tt=rnd(4,8);}
      steer(m,.1*hb,dt,1);
    } else if(mv==='jelly'||mv==='seahorse'){
      m.tt-=dt;if(m.tt<=0||m.p.distanceTo(m.tgt)<.05){swimTarget(m,.15,.08);m.tt=rnd(5,10);}
      steer(m,(mv==='jelly'?.03:.04)*hb,dt,.8);
      if(u.bell){const s=1+.18*Math.sin(tAll*3+m.ph);u.bell.scale.set(s,.7/s,s);}
      if(mv==='seahorse')m.v.y+=Math.sin(tAll*1.5+m.ph)*.004;
    } else if(mv==='swarm'){
      m.tt-=dt;if(m.tt<=0){swimTarget(m,.15,.12);m.tt=rnd(4,8);}
      steer(m,.05,dt,1);
      const arr=g.geometry.attributes.position.array,off=u.off,rad=u.rad;
      off.forEach((o,i)=>{o.x+=rnd(-1,1)*dt*.08;o.y+=rnd(-1,1)*dt*.08;o.z+=rnd(-1,1)*dt*.08;if(o.length()>rad)o.multiplyScalar(.95);arr[i*3]=o.x;arr[i*3+1]=o.y;arr[i*3+2]=o.z;});
      g.geometry.attributes.position.needsUpdate=true;
    } else if(mv==='hop'){
      m.tt-=dt;if(m.tt<=0){const q=waterPoint(.04);if(q){const gy=groundY(q[0],q[1]);m.tgt.set(q[0],Math.min(gy+rnd(.02,.35),wt-.05),q[1]);}m.tt=rnd(1.5,5);m.spd=rnd(.18,.32);}
      m.spd=Math.max(.015,m.spd*(1-dt*1.4));
      const d=m.tgt.clone().sub(m.p),l=d.length();if(l>.02)d.multiplyScalar(m.spd/l);else d.set(0,-.02,0);m.v.lerp(d,Math.min(1,dt*3));
    } else if(BOTTOM.includes(mv)||mv==='walk'){
      m.tt-=dt;if(m.tt<=0){m.tt=rnd(1,5);m.spd=Math.random()<.3?0:(mv==='crawl'?.02:mv==='crab'?.03:.04);}
      m.hd+=rnd(-1,1)*dt*.8;if(edgeFrac(m.p)>.8)m.hd=Math.atan2(-m.p.z,-m.p.x)+rnd(-.3,.3);
      const s=(m.spd??.02)*hb;m.v.set(Math.cos(m.hd)*s,0,Math.sin(m.hd)*s);
      if(mv==='pleco')u.tail.rotation.y=Math.sin(tAll*4+m.ph)*.2;
    } else if(mv==='spring'){
      const arr=g.geometry.attributes.position.array,off=u.off;
      off.forEach((o,i)=>{if(Math.random()<dt*.6){o.x+=rnd(-.08,.08);o.z+=rnd(-.08,.08);}if(Math.hypot(o.x,o.z)>.25){o.x*=.9;o.z*=.9;}arr[i*3]=o.x;arr[i*3+1]=Math.abs(Math.sin(tAll*3+i))*.006;arr[i*3+2]=o.z;});
      g.geometry.attributes.position.needsUpdate=true;continue;
    } else if(mv==='colony'){
      it.agents.forEach(a=>{a.hd+=rnd(-1,1)*dt*1.5;if(edgeFrac(a.p)>.85)a.hd=Math.atan2(-a.p.z,-a.p.x)+rnd(-.3,.3);
        const s=.03*hb,nx=a.p.x+Math.cos(a.hd)*s*dt*vis,nz=a.p.z+Math.sin(a.hd)*s*dt*vis;
        if(inWater(nx,nz,0))a.hd+=Math.PI;else{a.p.x=nx;a.p.z=nz;}
        a.p.y=groundY(a.p.x,a.p.z)+.006;clampInR(a.p,.025);a.mesh.position.copy(a.p);a.mesh.rotation.y=-a.hd;});
      m.p.copy(it.agents[0].p);continue;
    } else if(mv==='amph'){
      m.tt-=dt;
      if(m.tt<=0||m.p.distanceTo(m.tgt)<.05){
        // 自己決定：開燈想上岸休息；夜晚、太熱、太乾或者肚餓就落水
        const c=S.c,hot=c.T>p.tMax-1,dry=c.hum<p.humMin+5,hungry=it.satiety<.5;
        const wantWater=wt!=null&&(lv<.4||hot||dry||hungry||Math.random()<.25);
        if(wantWater){const q=waterPoint(.04);if(q)m.tgt.set(q[0],wt-.015,q[1]);m.mood='water';}
        else{const q=landPoint();m.tgt.set(q[0],groundY(q[0],q[1])+.006,q[1]);m.mood='land';}
        m.tt=rnd(8,18);}
      const sw=inWater(m.p.x,m.p.z,.02);steer(m,(sw?.07:.045)*hb,dt,1.2);m.v.y=0;
    } else if(mv==='climb'){
      m.tt-=dt;
      if(m.tt<=0){if(Math.random()<.5){const q=landPoint();m.tgt.set(q[0],groundY(q[0],q[1])+.01,q[1]);}
        else{const lo=Math.max(J.sTop+.15,(wt||0)+.05),y=rnd(lo,J.H*.75);if(J.box){const s=Math.random()<.5?1:-1,o=rnd(-.8,.8)*J.R;Math.random()<.5?m.tgt.set(s*J.R*.93,y,o):m.tgt.set(o,y,s*J.R*.93);}
          else{const a=rnd(0,6.28),r=rAt(y)*.93;m.tgt.set(Math.cos(a)*r,y,Math.sin(a)*r);}}
        m.tt=rnd(4,9);m.spd=rnd(.08,.14);}
      m.spd=Math.max(.01,m.spd*(1-dt*.4));steer(m,m.spd*hb,dt,2);
    } else if(mv==='frog'){
      if(m.hop>0){m.hop=Math.max(0,m.hop-dt*2.2);const f=1-m.hop;m.p.lerpVectors(m.h0,m.tgt,f);m.p.y=groundY(m.p.x,m.p.z)+.004+Math.sin(Math.PI*f)*.09;
        g.position.copy(m.p);const d=m.tgt.clone().sub(m.h0);g.rotation.y=Math.atan2(-d.z,d.x);continue;}
      m.tt-=dt;if(m.tt<=0){m.h0.copy(m.p);const a=rnd(0,6.28),r=rnd(.08,.25);m.tgt.set(m.p.x+Math.cos(a)*r,0,m.p.z+Math.sin(a)*r);clampIn(m.tgt,.8);
        if(!inWater(m.tgt.x,m.tgt.z,0))m.hop=1;m.tt=rnd(1.5,5);}
      continue;
    }
    m.p.addScaledVector(m.v,dt*vis*boost);
    // 按棲息地限制位置
    if(SWIMMERS.includes(mv)||mv==='hop'){
      clampInR(m.p,BR);const gy=groundY(m.p.x,m.p.z);m.p.y=clamp(m.p.y,gy+.02,wt-.03);
      if(!inWater(m.p.x,m.p.z,.01)){m.p.copy(m.prev);m.tt=0;m.v.multiplyScalar(-.3);}
    } else if(BOTTOM.includes(mv)){
      clampInR(m.p,BR);if(!inWater(m.p.x,m.p.z,.01)){m.p.copy(m.prev);m.hd+=Math.PI;}m.p.y=groundY(m.p.x,m.p.z)+.005;
    } else if(mv==='walk'){
      clampInR(m.p,BR);if(inWater(m.p.x,m.p.z,0)){m.p.copy(m.prev);m.hd+=Math.PI;}m.p.y=groundY(m.p.x,m.p.z)+.005;
    } else if(mv==='amph'){
      clampInR(m.p,BR);m.p.y=inWater(m.p.x,m.p.z,.02)?wt-.015+Math.sin(tAll*2+m.ph)*.003:groundY(m.p.x,m.p.z)+.006;
    } else if(mv==='climb'){
      clampInR(m.p,.03);m.p.y=clamp(m.p.y,groundY(m.p.x,m.p.z)+.01,J.H*.85);
      if(inWater(m.p.x,m.p.z,0)&&m.p.y<wt+.01){m.p.copy(m.prev);m.tt=0;}
    }
    g.position.copy(m.p);
    if(mv==='swarm')continue;
    face(g,m.v,mv==='climb'?1.4:['swim','aqturtle','hop'].includes(mv)?.5:0);
    if(mv==='crab')g.rotation.y+=Math.PI/2;
  }
  if(S.items.some(i=>i.gone)){S.items=S.items.filter(i=>!i.gone);dirtyList=true;}
  for(const it of wasteFx.splice(0)){if(!it.alive||!it.g)continue;if(poops.filter(p=>p.visible).length>60)break;const pp=spawn(poops,poopMat,.007,70);if(pp){pp.position.copy(it.m.p);pp.scale.set(.006,.006,.014);}}
  bubbles.forEach(b=>{if(!b.visible)return;b.position.y+=b.userData.vy*dt;b.position.x+=Math.sin(tAll*5+b.id)*dt*.01;if(wt==null||b.position.y>wt)b.visible=false;});
  poops.forEach(p=>{if(!p.visible)return;p.userData.age+=dt;const gy=groundY(p.position.x,p.position.z);if(p.position.y>gy+.01)p.position.y-=dt*.08;if(p.userData.age>25)p.visible=false;});
  const want=wt!=null?Math.ceil(c.flake*8):0;let shown=0;
  flakes.forEach(f=>{if(!f.visible)return;shown++;if(shown>want){f.visible=false;return;}if(f.position.y>groundY(f.position.x,f.position.z)+.01){f.position.y-=f.userData.vy*dt;f.rotation.z+=dt;f.position.x+=Math.sin(tAll+f.id)*dt*.02;}});
  if(S.sel&&S.sel.alive&&S.sel.g){const it=S.sel,k=CAT[it.type].kind;ring.visible=true;
    if(k==='animal'){ring.position.copy(it.m.p);ring.scale.setScalar(['amph','aqturtle'].includes(CAT[it.type].move)?.14:.1);}
    else if(k==='microbe'||k==='sub'){ring.position.set(0,J.sTop+.02,0);ring.scale.setScalar(floorR()*.7);}
    else{ring.position.set(it.g.position.x,it.g.position.y+.02,it.g.position.z);ring.scale.setScalar(k==='decor'?.25*it.params.size*J.k:it.type==='duckweed'?.26:.16);}
    ring.material.opacity=.55+.35*Math.sin(tAll*4);} else ring.visible=false;
  if(!ptrs.size&&!S.build){cam.idle+=dt;if(cam.idle>4&&!matchMedia('(prefers-reduced-motion: reduce)').matches)cam.theta+=dt*.06;}
  updateCam();
}
function resize(){const r=stage.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);
