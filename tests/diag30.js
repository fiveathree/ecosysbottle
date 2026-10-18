/* 診斷：每個預設行 30 日，列出幾時、咩原因死，同埋最後數量。用法：node tests/diag30.js [mode.key] */
const {boot,makeSetup}=require('./harness.js');
const T=boot(),S=T.S,CAT=T.CAT,setup=makeSetup(T),only=process.argv[2];
const RUNS=+process.env.RUNS||3,DAYS=+process.env.DAYS||30;
for(const mode of Object.keys(T.PRESETS))for(const key of Object.keys(T.PRESETS[mode])){
  if(key==='bad'||key==='zero'||only&&only!==mode+'.'+key)continue;
  setup(mode,key);const out=[];
  for(let r=0;r<RUNS;r++){const st=T.trialState(null);let n=0;const ev=[];
    for(let h=0;h<DAYS*24;h++){T.step(st);while(n<st.deaths.length){const d=st.deaths[n++];if(CAT[d.type].kind==='animal')ev.push(`d${Math.floor(h/24)+1}:${d.type}(${d.why})`);}}
    const cnt={};st.items.forEach(i=>{if(i.alive&&CAT[i.type].kind==='animal')cnt[i.type]=(cnt[i.type]||0)+1;});
    const c=st.c,wL=st.mode==='aqua'?(st.filled?st.V:0):st.wL;
    out.push(`  run${r}: ${ev.length?ev.slice(0,8).join(' ')+(ev.length>8?` …(+${ev.length-8})`:''):'冇死'} | 最後 ${JSON.stringify(cnt)} | NO3 ${wL?(c.NO3/wL).toFixed(1):'-'} algae ${c.algae.toFixed(1)} det ${c.detritus.toFixed(1)} waste ${(c.waste||0).toFixed(1)} mould ${(c.mould||0).toFixed(1)} hum ${(c.hum||0).toFixed(0)} T ${c.T.toFixed(1)}`);}
  console.log(`${mode}.${key}`);console.log(out.join('\n'));
}
