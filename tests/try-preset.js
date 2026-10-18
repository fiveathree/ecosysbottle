/* 試新預設：唔使改 data.js，直接喺記憶體加入再行 30 日。
   用法：node tests/try-preset.js <檔案.json>   （json：{mode,key,preset}，或者佢哋嘅陣列） */
const {boot,makeSetup}=require('./harness.js');
const T=boot(),S=T.S,CAT=T.CAT,setup=makeSetup(T);
const list=[].concat(JSON.parse(require('fs').readFileSync(process.argv[2],'utf8')));
const RUNS=+process.env.RUNS||4,DAYS=+process.env.DAYS||30;
for(const {mode,key,preset} of list){
  T.PRESETS[mode][key]=preset;setup(mode,key);const out=[];
  for(let r=0;r<RUNS;r++){const st=T.trialState(null);let n=0,mx=0,mn=99,maxNH3=0;const ev=[];const wL=st.mode==='aqua'?st.V:st.wL;
    for(let h=0;h<DAYS*24;h++){T.step(st);mx=Math.max(mx,st.c.T);mn=Math.min(mn,st.c.T);maxNH3=Math.max(maxNH3,st.c.NH3/wL);
      while(n<st.deaths.length){const d=st.deaths[n++];if(CAT[d.type].kind==='animal')ev.push(`d${Math.floor(h/24)+1}:${d.type}(${d.why})`);}}
    const cnt={};st.items.forEach(i=>{if(i.alive&&CAT[i.type].kind==='animal')cnt[i.type]=(cnt[i.type]||0)+1;});
    out.push(`  run${r}: ${ev.slice(0,6).join(' ')||'冇死'} | ${JSON.stringify(cnt)} | T ${mn.toFixed(1)}–${mx.toFixed(1)} NH3max ${maxNH3.toFixed(2)} O2 ${(st.c.O2/wL).toFixed(1)} algae ${st.c.algae.toFixed(0)}`);}
  console.log(mode+'.'+key);console.log(out.join('\n'));
  T.autoBalance();console.log('  一鍵平衡：',S.report.changes.join('；')||'冇需要改');
}
