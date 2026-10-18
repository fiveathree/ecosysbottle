/* ================= 自己砌缸：地形高度圖 =================
   S.terra = {n, h:[cm 高度], m:[0 冇 / 1 細沙 / 2 碎石 / 3 泥土]}，蓋住成個瓶底 */
const TMATS={
  1:{n:['細沙','Fine sand'],c:0xcab68c,cls:'sand'},4:{n:['白沙','White sand'],c:0xe9e3d3,cls:'sand'},5:{n:['珊瑚沙','Coral sand'],c:0xf0d4bc,cls:'sand'},6:{n:['黑金沙','Black sand'],c:0x2f2d2a,cls:'sand'},
  2:{n:['碎石','Gravel'],c:0x8f8a80,cls:'gravel',rough:1},7:{n:['卵石','Pebbles'],c:0xa7a196,cls:'gravel',rough:2},8:{n:['火山石','Lava rock'],c:0x6a3a2a,cls:'gravel',rough:2,rock:1},
  3:{n:['泥土','Soil'],c:0x5b4030,cls:'soil'},9:{n:['水草泥','Aqua soil'],c:0x3a2c22,cls:'soil',rough:1},10:{n:['赤玉土','Akadama'],c:0xa5603a,cls:'soil',rough:1},11:{n:['苔蘚地','Moss bed'],c:0x4f7d2e,cls:'soil',moss:1}};
const TCOL=new Proxy({},{get:(o,m)=>m==0?0xb9c6ca:(TMATS[m]||TMATS[1]).c});
const TN=24;
function terraIdx(x,z){const Rf=floorR()*.985,n=S.terra.n;return[clamp((x/Rf+1)/2*(n-1),0,n-1),clamp((z/Rf+1)/2*(n-1),0,n-1)];}
function terraH(x,z){const t=S.terra;if(!t)return 0;const n=t.n,[u,v]=terraIdx(x,z),i0=Math.floor(u),j0=Math.floor(v),i1=Math.min(n-1,i0+1),j1=Math.min(n-1,j0+1),fu=u-i0,fv=v-j0;
  const h=(i,j)=>t.h[j*n+i];return((h(i0,j0)*(1-fu)+h(i1,j0)*fu)*(1-fv)+(h(i0,j1)*(1-fu)+h(i1,j1)*fu)*fv)*.025*J.k;}
function terraM(x,z){const t=S.terra;if(!t)return 0;const [u,v]=terraIdx(x,z);return t.m[Math.round(v)*t.n+Math.round(u)];}
function initTerra(){
  const n=TN,h=new Array(n*n).fill(0),m=new Array(n*n).fill(0),Rf=floorR()*.985;
  const top=S.items.filter(i=>i.alive&&CAT[i.type].kind==='sub').pop();
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=(i/(n-1)*2-1)*Rf,z=(j/(n-1)*2-1)*Rf,g=groundY(x,z)-.008*J.k;
    h[j*n+i]=+Math.max(0,g/(.025*J.k)).toFixed(1);m[j*n+i]=h[j*n+i]>.2?(J.terrain?3:TMAT_ID[top?top.type:'sand']||1):0;}
  S.items.filter(i=>CAT[i.type].kind==='sub').forEach(i=>removeItem(i,true));
  S.terra={n,h,m};
}
function terraEnsure(t){
  if(!S.terra)initTerra();const T=S.terra,id=TMAT_ID[t]||1;
  for(let i=0;i<T.h.length;i++)if(!T.m[i]){T.m[i]=id;T.h[i]=Math.max(T.h[i],1.5);}
  delete T._info;buildJar({keepCam:true});
}
const BRUSH_TOOLS=[['raise',['堆高','Raise']],['lower',['挖低','Dig']],['smooth',['抹平','Smooth']],['water',['水區','Water']],['erase',['清走','Clear']],['view',['淨係睇','View only']]];
let buildTool='paint',paintMat=1,brushSize=.18,terraDirty=false;
function applyBrush(x,z){
  const T=S.terra;if(!T)return;const n=T.n,Rf=floorR()*.985,cu=(x/Rf+1)/2*(n-1),cv=(z/Rf+1)/2*(n-1),br=brushSize*(n-1)/2;
  const lvl=S.mode==='rain'?S.level:0,defM=S.mode==='rain'?3:1;
  for(let j=Math.max(0,Math.floor(cv-br));j<=Math.min(n-1,Math.ceil(cv+br));j++)for(let i=Math.max(0,Math.floor(cu-br));i<=Math.min(n-1,Math.ceil(cu+br));i++){
    const d=Math.hypot(i-cu,j-cv)/br;if(d>1)continue;const w=1-d*d,k=j*n+i;
    if(buildTool==='paint'){T.m[k]=paintMat;T.h[k]=Math.min(15,T.h[k]+.6*w);}
    else if(buildTool==='raise'){T.h[k]=Math.min(15,T.h[k]+.5*w);if(!T.m[k])T.m[k]=defM;}
    else if(buildTool==='lower'){T.h[k]=Math.max(0,T.h[k]-.5*w);if(T.h[k]<.1)T.m[k]=0;}
    else if(buildTool==='smooth'){let s=0,c=0;for(let b=-1;b<=1;b++)for(let a=-1;a<=1;a++){const ii=i+a,jj=j+b;if(ii>=0&&jj>=0&&ii<n&&jj<n){s+=T.h[jj*n+ii];c++;}}T.h[k]+=(s/c-T.h[k])*.35*w;}
    else if(buildTool==='water'){const tgt=Math.max(0,(S.mode==='rain'?Math.max(lvl,5):6)-3);T.h[k]=Math.max(0,T.h[k]-(T.h[k]-Math.min(T.h[k],tgt))*.5*w-.2*w);if(!T.m[k]||T.m[k]===3)T.m[k]=1;}
    else if(buildTool==='erase'){T.h[k]*=1-.6*w;T.m[k]=T.h[k]<.3?0:T.m[k];if(T.h[k]<.3)T.h[k]=0;}
    T.h[k]=+T.h[k].toFixed(2);
  }
  if(buildTool==='water'&&S.mode==='rain'&&!(S.level>0))S.level=5;
  delete T._info;terraDirty=true;
}
function buildTerraMesh(){
  if(J.terrMesh){disposeObj(J.terrMesh);J.terrMesh=null;}
  if(!S.terra)return;
  const Rf=floorR()*.985,pos=[],col=[],idx=[],ring=[],fl=J.floor,c=new THREE.Color(),moss=new THREE.Color(0x4f6b2e),wet=new THREE.Color(0x3e2b1f);
  const vtx=(x,z,y)=>{pos.push(x,y,z);return pos.length/3-1;};
  const colorAt=(x,z,y,top)=>{const m=top?terraM(x,z):3;c.setHex(TCOL[m]);if(!top)c.multiplyScalar(.75);
    if(top&&TMATS[m]&&TMATS[m].cls==='soil'&&!TMATS[m].moss&&S.mode==='rain'){const under=J.waterTop!=null&&y<J.waterTop;c.lerp(under?wet:moss,under?.4:clamp(.35+.3*Math.sin(x*13+z*11),0,.7));}
    const tm=TMATS[m];if(top&&tm&&tm.cls!=='soil')c.multiplyScalar(.92+.08*Math.sin(x*29+z*17));if(top&&tm&&tm.rough)c.multiplyScalar(1-.18*tm.rough*Math.abs(Math.sin(x*61)*Math.cos(z*53)));if(top&&tm&&tm.moss)c.lerp(moss,.3+.2*Math.sin(x*17+z*9));col.push(c.r,c.g,c.b);};
  if(J.box){const G=40,grid=[];
    for(let j=0;j<=G;j++)for(let i=0;i<=G;i++){const x=(i/G*2-1)*Rf,z=(j/G*2-1)*Rf,y=fl+terraH(x,z)+.002;grid.push(vtx(x,z,y));colorAt(x,z,y,true);}
    for(let j=0;j<G;j++)for(let i=0;i<G;i++){const a=j*(G+1)+i,b=a+1,d=a+G+1,e=d+1;idx.push(a,d,b,b,d,e);}
    for(let i=0;i<G;i++)ring.push(grid[i]);for(let j=0;j<G;j++)ring.push(grid[j*(G+1)+G]);for(let i=G;i>0;i--)ring.push(grid[G*(G+1)+i]);for(let j=G;j>0;j--)ring.push(grid[j*(G+1)]);
  } else {const RN=24,SG=72;const ctr=vtx(0,0,fl+terraH(0,0)+.002);colorAt(0,0,fl+terraH(0,0),true);const rows=[];
    for(let r=1;r<=RN;r++){const row=[];for(let s=0;s<SG;s++){const a=s/SG*Math.PI*2,x=Math.cos(a)*Rf*r/RN,z=Math.sin(a)*Rf*r/RN,y=fl+terraH(x,z)+.002;row.push(vtx(x,z,y));colorAt(x,z,y,true);}rows.push(row);}
    for(let s=0;s<SG;s++){idx.push(ctr,rows[0][(s+1)%SG],rows[0][s]);}
    for(let r=0;r<RN-1;r++)for(let s=0;s<SG;s++){const a=rows[r][s],b=rows[r][(s+1)%SG],d=rows[r+1][s],e=rows[r+1][(s+1)%SG];idx.push(a,b,d,b,e,d);}
    ring.push(...rows[RN-1]);}
  // 側邊：由邊界落返瓶底
  const bot=ring.map(k=>{const x=pos[k*3],z=pos[k*3+2];const v=vtx(x,z,fl);colorAt(x,z,fl,false);return v;});
  const top0=ring.map(k=>{const x=pos[k*3],y=pos[k*3+1],z=pos[k*3+2];const v=vtx(x,z,y);colorAt(x,z,y,false);return v;});
  for(let i=0;i<ring.length;i++){const a=top0[i],b=top0[(i+1)%ring.length],d=bot[i],e=bot[(i+1)%ring.length];idx.push(a,d,b,b,d,e);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.setIndex(idx);geo.computeVertexNormals();
  J.terrMesh=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));jarG.add(J.terrMesh);
}
/* 砌缸工具列 */
function enterBuild(){
  if(!S.terra){initTerra();buildJar({keepCam:true});}
  S._wasRunning=S.running;S.running=false;S.buildDay=true;$('#playBtn').classList.remove('primary');renderChrome();
  S.build=true;closePop();issueOpen=false;renderIssuePop();buildTool='paint';paintMat=S.mode==='rain'?3:(S.water==='salt'?5:1);
  renderChrome();  renderBuildBar();toast(L('一隻手指／左鍵：砌（同一位置撳多幾下會疊高）；兩隻手指或右鍵：轉視角；捏或滾輪：縮放。','One finger or left click builds (tap the same spot to stack higher); two fingers or right-drag rotates; pinch or scroll zooms.'));
}
function exitBuild(){S.build=false;setTimeout(renderChrome,0);S.running=S._wasRunning!==false;$('#playBtn').classList.toggle('primary',S.running);$('#buildBar').hidden=true;$('#meters').hidden=false;buildJar({keepCam:true});renderAll();save();toast(L('砌好咗','Build saved'));}
function renderBuildBar(){
  const b=$('#buildBar');b.hidden=!S.build;$('#meters').hidden=!!S.build;if(!S.build)return;
  const lvl=S.mode==='rain'?`<label class="bb-sl">${L('水位','Water')} <output id="bbLvO">${S.level} cm</output><input type="range" id="bbLv" min="0" max="14" step="1" value="${S.level}"></label>`:'';
  b.innerHTML=`<div class="bb-head"><b>${L('材質','Material')}</b><span class="lede">${L('揀一樣再喺瓶底掃；同一位置撳多幾下會疊高。砌緊時間暫停、日頭、冇特殊天氣、鏡頭唔會自己轉。','Pick one, then brush the floor; tap the same spot again to stack higher. While building, time is paused, it is daytime, weather is clear and the camera stays still.')}</span></div>
    <div class="bb-tools mats" role="group" aria-label="${L('材質','Material')}">${Object.entries(TMATS).map(([id,t])=>`<button data-mat="${id}" aria-pressed="${buildTool==='paint'&&paintMat==id}"><i class="sw2" style="background:#${t.c.toString(16).padStart(6,'0')}"></i>${N(t.n)}</button>`).join('')}</div>
    <div class="bb-tools" role="group" aria-label="${L('地形工具','Shape tools')}">${BRUSH_TOOLS.filter(([k])=>k!=='water'||S.mode==='rain').map(([k,n])=>`<button data-tool="${k}" aria-pressed="${buildTool===k}"><i class="sw2 t-${k}"></i>${N(n)}</button>`).join('')}
      <span class="bb-cam"><button data-cam="l" aria-label="${L('向左轉','Rotate left')}">⟲</button><button data-cam="r" aria-label="${L('向右轉','Rotate right')}">⟳</button><button data-cam="top">${L('俯視','Top')}</button><button data-cam="side">${L('側視','Side')}</button><button id="bbDay" aria-pressed="${S.buildDay}">${S.buildDay?L('日頭','Day'):L('夜晚','Night')}</button></span></div>
    <div class="bb-row"><label class="bb-sl">${L('筆刷','Brush')} <input type="range" id="bbSz" min=".06" max=".45" step=".01" value="${brushSize}"></label>${lvl}
    <button class="btn" id="bbFlat">${L('全部鋪平','Flatten all')}</button><button class="btn primary" id="bbDone">${L('完成','Done')}</button></div>`;
  b.querySelectorAll('[data-tool]').forEach(x=>x.onclick=()=>{buildTool=x.dataset.tool;renderBuildBar();});
  b.querySelectorAll('[data-mat]').forEach(x=>x.onclick=()=>{buildTool='paint';paintMat=+x.dataset.mat;renderBuildBar();});
  $('#bbDay').onclick=()=>{S.buildDay=!S.buildDay;renderBuildBar();};
  b.querySelectorAll('[data-cam]').forEach(x=>x.onclick=()=>{const v=x.dataset.cam;if(v==='l')cam.theta+=.5;if(v==='r')cam.theta-=.5;if(v==='top')cam.phi=.3;if(v==='side')cam.phi=1.3;});
  $('#bbSz').oninput=e=>{brushSize=+e.target.value;};
  const lv=$('#bbLv');if(lv){lv.oninput=()=>{$('#bbLvO').textContent=lv.value+' cm';};lv.onchange=()=>{setLevel(+lv.value);renderBuildBar();};}
  $('#bbFlat').onclick=()=>{const T=S.terra;const avg=T.h.reduce((a,b)=>a+b,0)/T.h.length;T.h=T.h.map(()=>+avg.toFixed(1));delete T._info;buildJar({keepCam:true});};
  $('#bbDone').onclick=exitBuild;
}
function resetTerra(){S.terra=null;buildJar({keepCam:true});renderAll();save();toast(L('已還原做一層層嘅底材','Back to simple substrate layers'));}
