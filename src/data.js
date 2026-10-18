/* ================= 工具 & 語言 ================= */
const $=s=>document.querySelector(s);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const fx=(x,d=1)=>(Math.abs(x)<1e-9||!isFinite(x)?0:x).toFixed(d);
const rnd=(a,b)=>a+Math.random()*(b-a);
const esc=t=>String(t).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
let LANG='zh';
const L=(zh,en)=>LANG==='en'?en:zh;
const N=x=>Array.isArray(x)?(LANG==='en'?x[1]:x[0]):x;
const P=(l,u,min,max,step,h)=>({l,u,min,max,step,h:h||['','']});

/* ================= 參數定義 ================= */
const PD={
  o2Prod:P(['光照時產氧','O₂ made in light'],['mg/小時','mg/h'],0,3,.05,['開燈時每小時製造幾多氧氣','Oxygen produced each hour while lit']),
  respP:P(['呼吸耗氧','Respiration'],['mg/小時','mg/h'],0,.5,.01,['日夜都要呼吸，夜晚只用氧唔產氧','Plants breathe day and night; at night they only use oxygen']),
  uptake:P(['吸收養分','Nutrient uptake'],['mg/小時','mg/h'],0,.05,.001,['吸收氨同硝酸鹽，即係動物排泄物分解出嚟嘅嘢','Absorbs ammonia and nitrate from animal waste']),
  respA:P(['呼吸耗氧','Respiration'],['mg/小時','mg/h'],0,.5,.005,['25°C 時每小時用幾多氧；越暖用得越多','Oxygen used per hour at 25°C; more when warmer']),
  food:P(['每日食量','Daily food'],['份/日','portions/day'],0,3,.1,['1 份 ≈ 一撮飼料；冇得食會慢慢餓','1 portion ≈ a pinch of food; goes hungry without it']),
  wasteEvery:P(['幾耐去一次廁所','Poops every'],['小時','h'],1,48,1,['排泄嘅時間間隔','Time between droppings']),
  wasteAmt:P(['每次排泄量','Waste per dropping'],['mg 氨','mg NH₃'],0,.4,.005,['一半即刻變氨，一半變殘渣慢慢分解','Half turns to ammonia at once, half to detritus that breaks down slowly']),
  o2Min:P(['最少要幾多氧','Minimum oxygen'],['mg/L','mg/L'],.5,8,.1,['溶氧低過呢個數就會缺氧','Below this it suffocates']),
  nh3Tol:P(['氨耐受上限','Ammonia limit'],['mg/L','mg/L'],.05,3,.05,['氨濃度高過呢個數就會中毒','Above this it is poisoned']),
  tMin:P(['最低溫度','Min temperature'],['°C','°C'],0,35,1,['低過呢個溫度會凍親','Colder than this is harmful']),
  tMax:P(['最高溫度','Max temperature'],['°C','°C'],5,40,1,['高過呢個溫度會熱親','Warmer than this is harmful']),
  breedDays:P(['幾多日生一次','Breeds every'],['日','days'],0,60,1,['0 = 唔會繁殖；要健康、食得飽、有伴先會生','0 = never; needs good health, food and a partner']),
  litter:P(['每次生幾多隻','Young per brood'],['隻','young'],1,6,1),
  cap:P(['分解氨能力','Ammonia processing'],['mg/小時','mg/h'],0,.3,.005,['每小時最多將幾多氨變成硝酸鹽；底沙同石頭越多，細菌住得越多','Max ammonia turned into nitrate per hour; more substrate and rock hold more bacteria']),
  o2PerN:P(['分解耗氧','Oxygen used'],['mg 氧/mg 氨','mg O₂ per mg NH₃'],0,6,.1,['每分解 1 mg 氨要用幾多氧','Oxygen used per mg of ammonia']),
  rate:P(['分解速度','Breakdown rate'],['份/小時','portions/h'],0,.5,.01,['每小時分解幾多殘渣或者排泄物','How much detritus or waste is broken down per hour']),
  o2Per:P(['分解耗氧','Oxygen used'],['mg/份','mg per portion'],0,5,.05),
  o2ProdL:P(['光照時產氧','O₂ made in light'],['mg/小時','mg/h'],0,5,.1,['開燈時製造氧氣，同時食走二氧化碳','Makes oxygen and removes CO₂ while lit']),
  respPL:P(['呼吸耗氧','Respiration'],['mg/小時','mg/h'],0,1,.01),
  uptakeL:P(['吸收養分','Nutrient uptake'],['份/小時','portions/h'],0,.1,.002,['吸收泥土入面分解咗嘅排泄物','Takes up broken-down waste from the soil']),
  transp:P(['蒸散加濕','Transpiration'],['%/小時','%/h'],0,2,.05,['葉子散出水汽，提高濕度','Leaves release water vapour and raise humidity']),
  humMinP:P(['最低濕度','Min humidity'],['%','%'],0,100,1,['低過呢個濕度葉子會乾','Leaves dry out below this']),
  respL:P(['呼吸耗氧','Respiration'],['mg/小時','mg/h'],0,8,.1,['密封瓶入面會令二氧化碳上升','Raises CO₂ in a sealed jar']),
  wasteL:P(['每次排泄量','Waste per dropping'],['份','portions'],0,2,.05,['排泄物落喺泥土上，靠分解者處理','Droppings land on the soil for decomposers']),
  humMin:P(['最低濕度','Min humidity'],['%','%'],0,100,1),
  humMax:P(['最高濕度','Max humidity'],['%','%'],0,100,1,['長期太濕會生病','Too humid for long makes it ill']),
  nh3TolW:P(['水中氨耐受','Water ammonia limit'],['mg/L','mg/L'],.1,3,.05,['水區入面氨高過呢個數會生病','Above this in the water it gets ill']),
  x:P(['左右位置','Left–right'],['',''],-1,1,.05,['亦可以喺 3D 畫面直接拖','You can also drag it in the 3D view']),
  z:P(['前後位置','Front–back'],['',''],-1,1,.05),
  rot:P(['旋轉','Rotation'],['°','°'],0,360,5),
  size:P(['大細','Size'],['×','×'],.4,2,.05),
  depth:P(['厚度','Thickness'],['cm','cm'],1,8,.5,['越厚越多細菌住，但會佔空間','Thicker holds more bacteria but takes space'])
};
/* group → [param key, def key] */
const GROUPS={
  aplant:[['o2Prod','o2Prod'],['resp','respP'],['uptake','uptake']],
  aanimal:[['resp','respA'],['food','food'],['wasteEvery','wasteEvery'],['wasteAmt','wasteAmt'],['o2Min','o2Min'],['nh3Tol','nh3Tol'],['tMin','tMin'],['tMax','tMax'],['breedDays','breedDays'],['litter','litter']],
  nitri:[['cap','cap'],['o2PerN','o2PerN']],
  decomp:[['rate','rate'],['o2Per','o2Per']],
  rplant:[['o2Prod','o2ProdL'],['resp','respPL'],['uptake','uptakeL'],['transp','transp'],['humMin','humMinP']],
  ranimal:[['resp','respL'],['food','food'],['wasteEvery','wasteEvery'],['wasteAmt','wasteL'],['humMin','humMin'],['humMax','humMax'],['tMin','tMin'],['tMax','tMax'],['breedDays','breedDays'],['litter','litter']],
  amph:[['resp','respL'],['food','food'],['wasteEvery','wasteEvery'],['wasteAmt','wasteL'],['humMin','humMin'],['humMax','humMax'],['tMin','tMin'],['tMax','tMax'],['nh3Tol','nh3TolW'],['breedDays','breedDays'],['litter','litter']],
  soilm:[['rate','rate'],['o2Per','o2Per']],
  decor:[['x','x'],['z','z'],['rot','rot'],['size','size']],
  sub:[['depth','depth']]
};

const STR={noO2:['缺氧','Low oxygen'],nh3:['氨中毒','Ammonia poisoning'],cold:['太凍','Too cold'],hot:['太熱','Too hot'],hungry:['飢餓','Hungry'],dry:['太乾','Too dry'],wet:['太濕','Too humid'],
  co2:['二氧化碳過高','CO₂ too high'],mould:['霉菌','Mould'],noWater:['冇水','No water'],needFresh:['要淡水','Needs fresh water'],needSalt:['要海水','Needs salt water'],flow:['水流太強','Current too strong'],
  noSand:['冇底沙生根','No substrate to root'],noRock:['冇石或沉木依附','Nothing to attach to'],noSoil:['冇泥土','No soil'],noMud:['冇泥生根','No mud to root in'],lowN:['缺養分','Low nutrients'],lowLight:['光照不足','Not enough light'],
  hiN:['氨太高','Ammonia too high'],weak:['衰弱','Weakness'],eaten:['俾其他生物食咗','Eaten'],soilDry:['泥土太乾','Soil too dry']};
const SS=code=>code?N(STR[code]||[code,code]):'';

/* ================= 物種同造景 =================
   m: 可用模式 aqua / rain / both；hab: water / land / amph / none；w: fresh / salt */
const CAT={
  hornwort:{m:'both',hab:'water',kind:'plant',g:'aplant',name:['金魚藻','Hornwort'],sci:'Ceratophyllum',color:'#4f8f2c',root:'none',desc:['生長快、產氧多，唔使生根，浮喺水中都得。','Fast-growing oxygen producer; no roots needed, can float.'],params:{o2Prod:.8,resp:.1,uptake:.012}},
  elodea:{m:'both',hab:'water',kind:'plant',g:'aplant',name:['水蘊草','Brazilian waterweed'],sci:'Egeria densa',color:'#5c9a33',root:'sand',desc:['葉密生長快，產氧大戶，要種喺沙入面。','Dense, fast and a big oxygen producer; plant it in sand.'],params:{o2Prod:.7,resp:.09,uptake:.011}},
  vallis:{m:'both',hab:'water',kind:'plant',g:'aplant',name:['苦草','Vallisneria'],sci:'Vallisneria',color:'#6aa33a',root:'sand',desc:['長條葉子，產氧穩定，要有底沙生根。','Long ribbon leaves and steady oxygen; needs substrate to root.'],params:{o2Prod:.6,resp:.08,uptake:.01}},
  javafern:{m:'both',hab:'water',kind:'plant',g:'aplant',name:['黑木蕨','Java fern'],sci:'Microsorum',color:'#2f6b33',root:'rock',desc:['綁喺石頭或沉木上，唔使強光，好難養死。','Tied to rock or wood, low light, very hardy.'],params:{o2Prod:.35,resp:.05,uptake:.005}},
  moss:{m:'both',hab:'water',kind:'plant',g:'aplant',name:['莫絲','Java moss'],sci:'Taxiphyllum',color:'#3d6b25',root:'rock',desc:['依附石頭生長，俾蝦同螺藏身。','Grows on rock; cover for shrimp and snails.'],params:{o2Prod:.3,resp:.04,uptake:.004}},
  marimo:{m:'both',hab:'water',kind:'plant',g:'aplant',name:['綠藻球','Marimo ball'],sci:'Aegagropila',color:'#3e7d2c',root:'none',desc:['慢慢生長嘅毛球，產氧唔多，但蝦好鍾意喺上面揾食。','Slow fuzzy ball; little oxygen, but shrimp love grazing on it.'],params:{o2Prod:.12,resp:.02,uptake:.003}},
  duckweed:{m:'both',hab:'water',kind:'plant',g:'aplant',name:['浮萍','Duckweed'],sci:'Lemna',color:'#8fc13f',root:'none',floating:1,desc:['浮喺水面，一半氧氣散去空氣，但吸收養分快，壓制藻類。','Floats; half its oxygen escapes, but it soaks up nutrients and starves algae.'],params:{o2Prod:.3,resp:.03,uptake:.016}},
  lotus:{m:'both',hab:'water',kind:'plant',g:'aplant',name:['荷花','Lotus'],sci:'Nelumbo nucifera',color:'#e58fa8',root:'mud',shade:.15,airO2:1,desc:['根要種喺泥入面，葉浮喺水面遮光，藻類會少好多；大部份氧氣由葉面散去空氣。','Roots in mud; its pads shade the water and cut algae, and much of its oxygen goes to the air.'],params:{o2Prod:1.2,resp:.15,uptake:.02}},
  caulerpa:{m:'aqua',hab:'water',w:'salt',kind:'plant',g:'aplant',name:['海葡萄','Sea grapes'],sci:'Caulerpa',color:'#4fa04a',root:'none',desc:['海水藻類，吸收硝酸鹽好快，幫手產氧。','Marine algae that absorbs nitrate quickly and adds oxygen.'],params:{o2Prod:.6,resp:.07,uptake:.014}},

  guppy:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'swim',name:['孔雀魚','Guppy'],sci:'Poecilia',color:'#e89a3c',diet:{flake:1,algae:.3},desc:['活潑耐養，但食量大、排泄多，要定時餵。','Lively and hardy, but eats and poops a lot; feed daily.'],params:{resp:.1,food:1,wasteEvery:6,wasteAmt:.05,o2Min:3,nh3Tol:.4,tMin:22,tMax:30}},
  medaka:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'swim',name:['青鱂魚','Medaka'],sci:'Oryzias',color:'#e6d3a3',diet:{flake:1,algae:.4},desc:['耐冷耐熱，好適合露台生態缸。','Copes with cold and heat; great for balcony tanks.'],params:{resp:.08,food:.8,wasteEvery:8,wasteAmt:.04,o2Min:2.5,nh3Tol:.5,tMin:8,tMax:32}},
  minnow:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'swim',name:['白雲山魚','White cloud minnow'],sci:'Tanichthys',color:'#c9d3c2',diet:{flake:1,algae:.4,detritus:.2},desc:['香港原生小魚，耐低溫、耐低氧。','Small Hong Kong native; tolerates cold and low oxygen.'],params:{resp:.12,food:1.1,wasteEvery:8,wasteAmt:.06,o2Min:2.5,nh3Tol:.5,tMin:10,tMax:26}},
  betta:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'swim',name:['鬥魚','Betta'],sci:'Betta splendens',color:'#3b4fd1',diet:{flake:1},desc:['識得浮上水面吸空氣，唔怕缺氧，但怕凍，仲會同其他鬥魚打交。','Gulps air so copes with low oxygen; hates cold and fights other bettas.'],params:{resp:.12,food:1,wasteEvery:8,wasteAmt:.06,o2Min:.8,nh3Tol:.4,tMin:24,tMax:30}},
  shrimp:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'hop',name:['米蝦','Cherry shrimp'],sci:'Neocaridina',color:'#d9452f',diet:{algae:1,detritus:.7,flake:.6},desc:['食藻類同殘渣嘅清潔工，對氨好敏感。','Cleaner that eats algae and detritus; very sensitive to ammonia.'],params:{resp:.04,food:.4,wasteEvery:8,wasteAmt:.012,o2Min:4,nh3Tol:.2,tMin:18,tMax:28}},
  amano:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'hop',name:['大和藻蝦','Amano shrimp'],sci:'Caridina',color:'#b9b2a0',diet:{algae:1,detritus:.6,flake:.5},desc:['食藻最勁嘅蝦，可以壓制藻類爆發。','The best algae-eating shrimp; keeps blooms down.'],params:{resp:.06,food:.6,wasteEvery:8,wasteAmt:.018,o2Min:4,nh3Tol:.25,tMin:18,tMax:28}},
  snail:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'crawl',name:['石田螺','Pond snail'],sci:'Sinotaia',color:'#7a5532',diet:{detritus:1,algae:.8,flake:.4},desc:['食殘渣同藻類，好頑強，係清道夫。','Tough cleaner that eats detritus and algae.'],params:{resp:.03,food:.5,wasteEvery:10,wasteAmt:.015,o2Min:2,nh3Tol:.6,tMin:10,tMax:30}},
  nerite:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'crawl',name:['斑馬螺','Zebra nerite'],sci:'Neritina',color:'#3a3420',diet:{algae:1,detritus:.5},desc:['專食玻璃同石頭上嘅藻，淡水唔會繁殖過多。','Grazes algae off glass and rock; won\'t overbreed in fresh water.'],params:{resp:.03,food:.5,wasteEvery:12,wasteAmt:.012,o2Min:2,nh3Tol:.5,tMin:20,tMax:28}},
  daphnia:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'swarm',name:['水蚤群','Daphnia swarm'],sci:'Daphnia',color:'#d9b46a',diet:{algae:1},desc:['一群細小浮游動物，濾食綠水，令水變清。','Tiny plankton that filter green water and clear it.'],params:{resp:.02,food:.3,wasteEvery:6,wasteAmt:.004,o2Min:3,nh3Tol:.3,tMin:8,tMax:26}},
  jelly:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'jelly',flow:1,name:['桃花水母','Freshwater jellyfish'],sci:'Craspedacusta',color:'#e9eef2',diet:{flake:.6,algae:.2},desc:['淡水水母，好怕強水流，氧氣泵同過濾會扯爛佢。','Freshwater jelly; strong current from a pump or filter tears it apart.'],params:{resp:.02,food:.3,wasteEvery:8,wasteAmt:.005,o2Min:4,nh3Tol:.2,tMin:18,tMax:28}},
  pleco:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'pleco',name:['清道夫魚','Pleco'],sci:'Hypostomus',color:'#5a4a35',diet:{algae:1,detritus:.8,flake:.5},desc:['吸附玻璃食藻同殘渣，但排泄量大。','Sucks algae and detritus off the glass, but makes a lot of waste.'],params:{resp:.15,food:1.2,wasteEvery:6,wasteAmt:.08,o2Min:2,nh3Tol:.6,tMin:22,tMax:30}},
  crab:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'crab',name:['澤蟹','Freshwater crab'],sci:'Geothelphusa',color:'#c4502c',preys:['shrimp','amano','snail','nerite'],diet:{detritus:1,flake:.8},desc:['食殘渣，但會夾蝦同螺嚟食。','Eats detritus, but will catch shrimp and snails.'],params:{resp:.08,food:.7,wasteEvery:10,wasteAmt:.04,o2Min:3,nh3Tol:.5,tMin:15,tMax:26}},
  slider:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'aqturtle',name:['巴西龜','Red-eared slider'],sci:'Trachemys',color:'#4f7a3a',preys:['guppy','medaka','minnow','shrimp','amano','snail','nerite','daphnia'],diet:{flake:1,algae:.3},desc:['浮上水面呼吸，唔怕缺氧，但排泄好多，仲會食細魚同蝦。','Breathes air so ignores low oxygen, but is messy and eats small fish and shrimp.'],params:{resp:.4,food:2,wasteEvery:6,wasteAmt:.3,o2Min:.5,nh3Tol:1,tMin:20,tMax:30}},
  seahorse:{m:'aqua',hab:'water',w:'salt',kind:'animal',g:'aanimal',move:'seahorse',name:['海馬','Seahorse'],sci:'Hippocampus',color:'#e0a43a',diet:{flake:1},desc:['海水魚，游得好慢，係爸爸負責生仔。','Marine fish, a slow swimmer; the father carries the young.'],params:{resp:.06,food:.8,wasteEvery:6,wasteAmt:.03,o2Min:4,nh3Tol:.1,tMin:22,tMax:28}},
  moonjelly:{m:'aqua',hab:'water',w:'salt',kind:'animal',g:'aanimal',move:'jelly',flow:1,name:['海月水母','Moon jellyfish'],sci:'Aurelia',color:'#f0f4ff',diet:{flake:1},desc:['海水水母，要柔和水流。','Marine jelly that needs gentle water.'],params:{resp:.04,food:.5,wasteEvery:8,wasteAmt:.01,o2Min:4,nh3Tol:.1,tMin:18,tMax:25}},
  gardeneel:{m:'aqua',hab:'water',w:'salt',kind:'animal',g:'aanimal',move:'eel',burrow:1,name:['花園鰻','Garden eel'],sci:'Heteroconger',color:'#e8e2d2',diet:{flake:1},desc:['海水魚，一定要有厚細沙鑽入去，平時伸出半條身食浮游生物，受驚會縮返落沙。','Marine fish that must burrow into deep fine sand; it sways half out to catch plankton and ducks down when startled.'],params:{resp:.05,food:.5,wasteEvery:8,wasteAmt:.015,o2Min:4,nh3Tol:.1,tMin:22,tMax:28}},
  hermit:{m:'aqua',hab:'water',w:'salt',kind:'animal',g:'aanimal',move:'crab',name:['寄居蟹','Hermit crab'],sci:'Paguroidea',color:'#d06a3a',diet:{detritus:1,algae:.6,flake:.6},desc:['海水清道夫，食殘渣同藻類。','Marine cleaner that eats detritus and algae.'],params:{resp:.04,food:.5,wasteEvery:10,wasteAmt:.02,o2Min:3,nh3Tol:.3,tMin:20,tMax:28}},

  nitri:{m:'both',hab:'water',w:'both',kind:'microbe',g:'nitri',name:['硝化菌群','Nitrifying bacteria'],sci:'Nitrosomonas',color:'#d8c27a',desc:['住喺底沙、石頭同過濾，將有毒嘅氨變成水草食得嘅硝酸鹽，過程要用氧。','Live in substrate, rock and filters; turn toxic ammonia into nitrate, using oxygen.'],params:{cap:.03,o2PerN:3.4}},
  decomp:{m:'both',hab:'water',w:'both',kind:'microbe',g:'decomp',name:['分解菌','Decomposer bacteria'],sci:'Bacillus',color:'#c9a96a',desc:['加快分解殘渣同屍體，令底沙乾淨啲。','Break down detritus and dead matter faster.'],params:{rate:.1,o2Per:.3}},

  fern:{m:'rain',hab:'land',kind:'plant',g:'rplant',name:['腎蕨','Boston fern'],sci:'Nephrolepis',color:'#3f8a3a',desc:['雨林經典植物，蒸散多，幫手保持濕度。','Classic rainforest plant; transpires a lot and keeps humidity up.'],params:{o2Prod:1.5,resp:.2,uptake:.02,transp:.6,humMin:55}},
  cmoss:{m:'rain',hab:'land',kind:'plant',g:'rplant',name:['苔蘚','Moss carpet'],sci:'Bryophyta',color:'#5aa03a',desc:['鋪滿地面，保濕又好睇，太乾會變黃。','Carpets the ground and holds moisture; yellows when dry.'],params:{o2Prod:.6,resp:.08,uptake:.008,transp:.3,humMin:70}},
  pothos:{m:'rain',hab:'land',kind:'plant',g:'rplant',name:['黃金葛','Pothos'],sci:'Epipremnum',color:'#8fbf3a',desc:['最易養嘅爬藤，產氧多，吸收養分快。','The easiest vine; lots of oxygen and fast nutrient uptake.'],params:{o2Prod:2,resp:.25,uptake:.025,transp:.5,humMin:40}},
  bromeliad:{m:'rain',hab:'land',kind:'plant',g:'rplant',name:['鳳梨','Bromeliad'],sci:'Bromeliaceae',color:'#c0392b',desc:['葉心會積水，箭毒蛙鍾意喺入面休息。','Holds water in its centre where dart frogs like to rest.'],params:{o2Prod:1,resp:.12,uptake:.01,transp:.3,humMin:45}},
  fittonia:{m:'rain',hab:'land',kind:'plant',g:'rplant',name:['網紋草','Fittonia'],sci:'Fittonia',color:'#c8607a',desc:['葉脈有網紋，太乾會即刻垂低。','Net-veined leaves that wilt quickly when dry.'],params:{o2Prod:.8,resp:.1,uptake:.012,transp:.5,humMin:65}},

  turtle:{m:'rain',hab:'amph',kind:'animal',g:'amph',move:'amph',name:['麝香龜','Musk turtle'],sci:'Sternotherus',color:'#5a5a34',diet:{feed:1},desc:['細隻嘅半水棲龜，要有水區，排泄物會落水。','Small semi-aquatic turtle; needs a water area and fouls it.'],params:{resp:3,food:1.5,wasteEvery:8,wasteAmt:.6,humMin:50,humMax:98,tMin:22,tMax:30,nh3Tol:1}},
  newt:{m:'rain',hab:'amph',kind:'animal',g:'amph',move:'amph',name:['東方蠑螈','Fire-belly newt'],sci:'Cynops orientalis',color:'#2b2b2b',diet:{feed:1},desc:['兩棲動物，水區同陸地都要有，怕熱。','Amphibian that needs both water and land; dislikes heat.'],params:{resp:.6,food:.4,wasteEvery:12,wasteAmt:.12,humMin:60,humMax:100,tMin:12,tMax:25,nh3Tol:.5}},
  gecko:{m:'rain',hab:'land',kind:'animal',g:'ranimal',move:'climb',name:['睫角守宮','Crested gecko'],sci:'Correlophus',color:'#c9893f',diet:{feed:1},desc:['識爬玻璃嘅蜥蜴，要通風，唔可以長期太濕或太熱。','Glass-climbing lizard; needs airflow, not constant damp or heat.'],params:{resp:4,food:1,wasteEvery:24,wasteAmt:.8,humMin:50,humMax:90,tMin:20,tMax:27}},
  leopard:{m:'rain',hab:'land',kind:'animal',g:'ranimal',move:'walk',name:['豹紋守宮','Leopard gecko'],sci:'Eublepharis',color:'#e8c23a',diet:{feed:1},desc:['地棲守宮，唔識爬玻璃，鍾意乾爽溫暖。','Ground-dwelling gecko; can\'t climb glass, likes it dry and warm.'],params:{resp:3.5,food:1,wasteEvery:24,wasteAmt:.7,humMin:10,humMax:60,tMin:24,tMax:32}},
  frog:{m:'rain',hab:'land',kind:'animal',g:'ranimal',move:'frog',name:['箭毒蛙','Dart frog'],sci:'Dendrobates',color:'#2a6fd6',diet:{feed:1},desc:['人工繁殖嘅冇毒，需要好高濕度，怕熱。','Captive-bred ones are harmless; need very high humidity, dislike heat.'],params:{resp:.4,food:.5,wasteEvery:12,wasteAmt:.15,humMin:75,humMax:100,tMin:20,tMax:27}},
  isopod:{m:'rain',hab:'land',kind:'animal',g:'ranimal',move:'colony',mouldOK:1,name:['鼠婦群','Isopod colony'],sci:'Porcellio',color:'#6f6a66',diet:{waste:1,mould:.8,feed:.5},desc:['一群清道夫，食排泄物同腐葉。','Cleanup crew that eats droppings and leaf litter.'],params:{resp:.15,food:.6,wasteEvery:12,wasteAmt:.05,humMin:60,humMax:100,tMin:15,tMax:30}},
  springtail:{m:'rain',hab:'land',kind:'animal',g:'ranimal',move:'spring',mouldOK:1,name:['跳蟲群','Springtail colony'],sci:'Collembola',color:'#d6d4c8',diet:{mould:1,waste:.7},desc:['細到好似白色粉粒，專食霉菌，防止生霉。','Tiny white specks that eat mould and stop it spreading.'],params:{resp:.1,food:.4,wasteEvery:24,wasteAmt:.01,humMin:70,humMax:100,tMin:15,tMax:30}},
  soilmic:{m:'rain',hab:'land',kind:'microbe',g:'soilm',name:['土壤菌群','Soil microbes'],sci:'Soil microbiome',color:'#8a6a3a',desc:['住喺泥土，將排泄物分解成植物養分。','Live in the soil and turn waste into plant food.'],params:{rate:.06,o2Per:2}},

  sand:{m:'both',hab:'none',kind:'sub',g:'sub',name:['細沙','Fine sand'],sci:'',color:'#cab68c',desc:['水草要種喺沙入面先生到根，細菌亦都住喺沙粒之間。','Rooted plants need it; bacteria live between the grains.'],params:{depth:3}},
  gravel:{m:'both',hab:'none',kind:'sub',g:'sub',name:['碎石','Gravel'],sci:'',color:'#8f8a80',desc:['通水性好，住得多細菌。','Good water flow and lots of bacteria.'],params:{depth:3}},
  soil:{m:'both',hab:'none',kind:'sub',g:'sub',name:['泥土','Soil'],sci:'',color:'#5b4030',desc:['雨林植物一定要有泥土；有泥土先會有陸地土坡。','Rainforest plants need it; soil also builds the land slope.'],params:{depth:4}},
  stone:{m:'both',hab:'none',kind:'decor',g:'decor',rock:1,name:['石頭','Stones'],sci:'',color:'#7d786f',desc:['增加細菌附著面積，黑木蕨同莫絲可以依附。','More surface for bacteria; Java fern and moss can attach.'],params:{x:.45,z:.3,rot:0,size:1}},
  rockmtn:{m:'both',hab:'none',kind:'decor',g:'decor',rock:1,name:['假山','Rock mountain'],sci:'',color:'#8a857c',desc:['層層疊嘅石山，俾生物躲藏，細菌都住得多。','Stacked rock for hiding, with room for bacteria.'],params:{x:-.4,z:-.3,rot:0,size:1}},
  bridge:{m:'both',hab:'none',kind:'decor',g:'decor',name:['假橋','Bridge'],sci:'',color:'#9b3b2a',desc:['純裝飾，蝦同蜥蜴可以行過。','Pure decoration that shrimp and lizards can cross.'],params:{x:0,z:.25,rot:20,size:1}},
  driftwood:{m:'both',hab:'none',kind:'decor',g:'decor',rock:1,name:['沉木','Driftwood'],sci:'',color:'#5b3a22',desc:['天然木頭，植物可以依附，守宮可以攀爬。','Natural wood for plants to attach to and geckos to climb.'],params:{x:.2,z:-.35,rot:40,size:1}}
};
const BREED={gardeneel:[0,1],guppy:[7,3],medaka:[6,2],minnow:[10,2],shrimp:[8,3],snail:[10,2],seahorse:[14,2],frog:[20,1]};
const LIMIT={stone:4,rockmtn:2,bridge:2,driftwood:2,sand:2,gravel:2,soil:2};
const PH={betta:[6,7.5],shrimp:[6.5,7.8],amano:[6.5,7.8],slider:[6,8.5],crab:[6.5,8]};
Object.entries(CAT).forEach(([k,c])=>{
  if(c.kind==='animal'&&c.params.breedDays==null){const b=BREED[k]||[0,1];c.params.breedDays=b[0];c.params.litter=b[1];}
  if(c.hab==='water'&&!c.w)c.w='fresh';
  if(c.hab==='water'&&c.kind==='animal')c.ph=PH[k]||(c.w==='salt'?[8,8.4]:[6.5,8]);
});
const POOLNAME={flake:['飼料','Flakes'],algae:['藻類','Algae'],detritus:['殘渣','Detritus'],feed:['飼料／昆蟲','Food / insects'],waste:['排泄物','Droppings'],mould:['霉菌','Mould']};
const KIND_ORDER=['sub','decor','plant','animal','microbe'];

const SHAPES={
  jar:{n:['梅森罐','Mason jar'],R:1,H:2.25,w:.8,prof:[[.95,0],[1,.04],[1,.8],[.9,.87],[.82,.92],[.82,1]]},
  cyl:{n:['圓柱瓶','Cylinder'],R:.95,H:2.4,w:.82,prof:[[1,0],[1,.5],[1,1]]},
  bowl:{n:['金魚缸','Fishbowl'],R:1.25,H:2.1,w:.72,prof:[[.6,0],[.85,.08],[.98,.25],[1,.42],[.95,.6],[.8,.78],[.62,.92],[.66,1]]},
  flask:{n:['燒瓶','Flask'],R:1.2,H:2.7,w:.6,prof:[[.88,0],[.98,.06],[1,.2],[.94,.4],[.72,.55],[.4,.67],[.32,.74],[.32,.97],[.36,1]]},
  basin:{n:['陶缸','Ceramic basin'],R:1.35,H:1.55,w:.86,prof:[[.68,0],[.88,.08],[.98,.3],[1,.6],[.97,.86],[1,1]]},
  box:{n:['方缸','Box tank'],R:1,H:1.9,w:.85,box:true,prof:[[1,0],[1,1]]}
};
const MATS={
  glass:{n:['透明玻璃','Clear glass'],c:0xdcefff,op:.14,sh:120,tr:1,d:['最常見，透光最好','Most common, best light']},
  acrylic:{n:['亞克力','Acrylic'],c:0xeaf6ff,op:.09,sh:45,tr:.92,d:['輕身唔易爛，但會刮花、慢慢變黃','Light and tough, but scratches and yellows']},
  green:{n:['綠玻璃','Green glass'],c:0x5f9a6a,op:.28,sh:110,tr:.8,d:['濾走部份光，藻類生長慢啲','Filters some light, slowing algae']},
  amber:{n:['茶色玻璃','Amber glass'],c:0xb0702a,op:.32,sh:110,tr:.62,d:['擋光多，植物產氧會明顯減少','Blocks a lot of light; plants make much less oxygen']},
  ceramic:{n:['陶瓷','Ceramic'],c:0x9a5f3c,op:.88,sh:25,tr:.7,therm:.55,d:['唔透光，只有頂部入光；厚身保溫，溫度變化細。畫面會淡淡透視方便你睇入面','Opaque, so light only enters from the top; thick walls keep the temperature steady. Shown faintly see-through so you can look inside']},
  frosted:{n:['磨砂玻璃','Frosted glass'],c:0xf2f5f5,op:.48,sh:5,tr:.75,d:['光線柔和，但睇唔清入面','Soft light, but hard to see inside']}
};
const WX={
  sunny:{n:['晴天','Sunny'],light:1,d:2,dh:-12},
  cloudy:{n:['多雲','Cloudy'],light:.65,d:0,dh:0},
  rain:{n:['落雨','Rain'],light:.45,d:-3,dh:16,rain:1},
  storm:{n:['雷暴','Thunderstorm'],light:.3,d:-4,dh:20,rain:2,bolt:1},
  fog:{n:['起霧','Fog'],light:.5,d:-2,dh:22,fog:1},
  sand:{n:['沙塵暴','Sandstorm'],light:.35,d:1,dh:-15,sand:1},
  snow:{n:['落雪','Snow'],light:.55,d:-7,dh:6,snow:1}
};
/* 地區氣候：t 平均溫度、sw 日夜溫差、hum 平均濕度、light 日照強度、w 各種天氣出現比重 */
const REGIONS={
  hk:{n:['香港','Hong Kong'],t:24,sw:5,hum:76,light:1,w:{sunny:3,cloudy:3,rain:2,storm:1,fog:.5},d:['亞熱帶，濕熱多雨，夏天有雷暴。','Subtropical: warm, humid and wet, with summer storms.']},
  amazon:{n:['亞馬遜雨林','Amazon rainforest'],t:27,sw:6,hum:88,light:.95,w:{sunny:2,cloudy:3,rain:4,storm:2,fog:1},d:['全年炎熱潮濕，幾乎日日落雨。','Hot and humid all year with rain most days.']},
  borneo:{n:['婆羅洲雨林','Borneo rainforest'],t:26,sw:5,hum:90,light:.9,w:{cloudy:3,rain:4,storm:1.5,fog:1.5,sunny:1.5},d:['雲霧多，濕度好高。','Misty and extremely humid.']},
  sahara:{n:['撒哈拉沙漠','Sahara Desert'],t:29,sw:16,hum:28,light:1.15,w:{sunny:7,cloudy:1,sand:1.5},d:['日頭好熱、夜晚好凍、極乾，會有沙塵暴。','Scorching days, cold nights, bone dry, with sandstorms.']},
  gbr:{n:['大堡礁','Great Barrier Reef'],t:26,sw:3,hum:74,light:1.1,w:{sunny:5,cloudy:2,rain:1.5,storm:.8},d:['熱帶海洋，陽光猛、溫度穩定。','Tropical sea with strong sun and steady warmth.']},
  med:{n:['地中海','Mediterranean'],t:21,sw:9,hum:60,light:1.1,w:{sunny:6,cloudy:2,rain:.8,storm:.3},d:['陽光充足、夏乾冬濕。','Sunny, with dry summers and wet winters.']},
  kyoto:{n:['京都','Kyoto'],t:16,sw:8,hum:66,light:.95,w:{sunny:3,cloudy:3,rain:2,fog:.6,snow:.4},d:['四季分明，冬天會落雪。','Four distinct seasons with some winter snow.']},
  baikal:{n:['貝加爾湖','Lake Baikal'],t:6,sw:9,hum:70,light:.8,w:{sunny:2,cloudy:3,fog:1.5,snow:2,rain:.5},d:['寒冷湖區，經常起霧同落雪。','A cold lake region with frequent fog and snow.']}
};
const regionOf=st=>REGIONS[st.region]||REGIONS.hk;
function typicalWx(r){const w=(REGIONS[r]||REGIONS.hk).w;return Object.entries(w).sort((a,b)=>b[1]-a[1])[0][0];}

const PRESETS={
  aqua:{
    eco:{n:['密封生態瓶','Sealed eco jar'],d:['4L 梅森罐密封：細沙、石頭、金魚藻、莫絲、苦草、米蝦、石田螺、硝化菌，唔使餵。','4 L sealed mason jar with sand, stones, hornwort, moss, vallisneria, shrimp, snails and bacteria. No feeding.'],
      V:4,shape:'jar',sealed:true,light:12,feed:0,items:[['sand',1],['stone',1],['hornwort',2],['moss',1],['vallis',1],['shrimp',5],['snail',2],['nitri',1]]},
    tank:{n:['開口小魚缸','Open fish tank'],d:['10L 方缸，有氧氣泵、過濾同加熱棒，碎石、假山、假橋、孔雀魚 4 條。','10 L box tank with pump, filter and heater, gravel, rock mountain, bridge and 4 guppies.'],
      V:10,shape:'box',sealed:false,light:10,feed:3,pump:true,filter:true,heater:true,items:[['gravel',1],['rockmtn',1],['bridge',1],['hornwort',2],['vallis',2],['duckweed',1],['guppy',4],['snail',1],['nitri',1],['decomp',1]]},
    sea:{n:['海馬小海缸','Seahorse reef'],d:['20L 海水方缸：厚細沙、假山、海葡萄、海馬、花園鰻同寄居蟹，有過濾同加熱棒。','20 L salt-water box tank with deep sand, rock mountain, sea grapes, seahorses, garden eels and hermit crabs; filter and heater.'],
      V:20,shape:'box',water:'salt',sealed:false,light:10,feed:1.5,filter:true,heater:true,region:'med',items:[['sand',1,{depth:5}],['rockmtn',1],['caulerpa',2],['seahorse',2],['gardeneel',3],['hermit',2],['nitri',1],['decomp',1]]},
    shrimp:{n:['米蝦水草缸','Shrimp planted tank'],d:['8L 圓柱瓶：沉木、黑木蕨、莫絲、水蘊草、綠藻球、10 隻米蝦同斑馬螺，少少餵。','8 L cylinder with driftwood, Java fern, moss, waterweed, marimo, 10 cherry shrimp and nerites; light feeding.'],
      V:8,shape:'cyl',sealed:false,light:10,feed:.3,items:[['sand',1],['driftwood',1],['javafern',1],['moss',1],['elodea',2],['marimo',1],['shrimp',10],['nerite',2],['nitri',1],['decomp',1]]},
    betta:{n:['鬥魚獨居缸','Betta solo tank'],d:['5L 方缸，有加熱棒：一條鬥魚、黑木蕨、綠藻球同一隻石田螺。','5 L box tank with a heater: one betta, Java fern, marimo and a pond snail.'],
      V:5,shape:'box',sealed:false,light:8,feed:1,heater:true,items:[['gravel',1],['stone',1],['javafern',1],['marimo',1],['betta',1],['snail',1],['nitri',1]]},
    stream:{n:['香港溪流缸','Hong Kong stream'],d:['15L 方缸，有氧氣泵同過濾：碎石、石頭、假山、苦草、白雲山魚、米蝦同石田螺。','15 L box tank with pump and filter: gravel, stones, rock mountain, vallisneria, white cloud minnows, shrimp and snails.'],
      V:15,shape:'box',sealed:false,light:10,feed:2,pump:true,filter:true,region:'hk',items:[['gravel',1],['stone',2],['rockmtn',1],['vallis',2],['minnow',6],['shrimp',4],['snail',2],['nitri',1]]},
    jelly:{n:['桃花水母缸','Jellyfish tank'],d:['6L 圓柱瓶，唔開泵同過濾：4 隻桃花水母同少少金魚藻。','6 L cylinder with no pump or filter: 4 freshwater jellyfish and some hornwort.'],
      V:6,shape:'cyl',sealed:false,light:10,feed:.5,items:[['sand',1],['hornwort',1],['jelly',4],['nitri',1]]},
    medaka:{n:['青鱂魚露台缸','Medaka balcony bowl'],d:['20L 開口金魚缸放喺露台：浮萍、金魚藻、青鱂魚、水蚤同石田螺，跟京都天氣。','20 L open bowl outdoors in Kyoto weather: duckweed, hornwort, medaka, daphnia and snails.'],
      V:20,shape:'bowl',sealed:false,light:12,feed:1,region:'kyoto',items:[['sand',1],['stone',1],['duckweed',2],['hornwort',2],['medaka',6],['daphnia',1],['snail',2],['nitri',1]]},
    lotus:{n:['陶缸荷花魚','Ceramic lotus pond'],d:['30L 開口陶缸放喺室外：泥土、細沙、2 棵荷花、浮萍、青鱂魚同石田螺，唔使泵。','30 L open ceramic basin outdoors: soil, sand, 2 lotus, duckweed, medaka and pond snails; no pump.'],
      V:30,shape:'basin',mat:'ceramic',sealed:false,light:12,feed:1,region:'hk',items:[['soil',1,{depth:5}],['sand',1,{depth:1.5}],['lotus',2],['duckweed',1],['stone',1],['medaka',6],['snail',3],['nitri',1]]},
    bad:{n:['失衡示範','Unbalanced demo'],d:['3L 密封金魚缸，5 條孔雀魚只得一撮莫絲，冇硝化菌。','3 L sealed fishbowl: 5 guppies, one clump of moss and no bacteria.'],V:3,shape:'bowl',sealed:true,light:12,feed:2,items:[['moss',1],['guppy',5]]},
    zero:{n:['由零開始','Start from scratch'],d:['一個未注水嘅空瓶，由鋪沙、擺石頭開始自己砌。','An empty, dry jar. Lay sand and stones, then add water.'],V:4,shape:'jar',sealed:false,light:12,feed:0,filled:false,items:[]}
  },
  rain:{
    palu:{n:['水陸共生缸','Paludarium'],d:['20L 方缸：後面係泥土坡同植物，前面係水區，有青鱂魚、米蝦同水草，陸地有箭毒蛙。','20 L box tank: a soil slope with plants and dart frogs at the back, and a water area at the front with medaka, shrimp and water plants.'],
      V:20,shape:'box',sealed:false,light:12,feed:3,mist:2,level:8,hillH:10,filter:true,
      items:[['soil',1,{depth:4}],['driftwood',1,{x:-.3,z:-.45}],['stone',1,{x:.45,z:.5}],['fern',1],['pothos',1],['cmoss',1],['hornwort',2],['vallis',1],['javafern',1],['medaka',4],['shrimp',4],['frog',2],['isopod',1],['springtail',1],['soilmic',1],['nitri',1]]},
    forest:{n:['雨林生態瓶','Rainforest jar'],d:['6L 密封圓柱瓶：泥土、沉木、苔蘚、腎蕨、網紋草、鳳梨、箭毒蛙同清道夫。','6 L sealed cylinder with soil, driftwood, moss, fern, fittonia, bromeliad, a dart frog and cleanup crew.'],
      V:6,shape:'cyl',sealed:true,light:12,feed:.5,mist:1,level:0,hillH:6,items:[['soil',1],['driftwood',1],['cmoss',1],['fern',1],['fittonia',1],['bromeliad',1],['frog',1],['isopod',1],['springtail',1],['soilmic',1]]},
    turtle:{n:['龜池雨林','Turtle paludarium'],d:['20L 開口方缸：泥土坡、大水區、黃金葛同一隻麝香龜，有加熱燈同過濾。','20 L open box tank with a soil slope, big water area, pothos and a musk turtle; heat lamp and filter.'],
      V:20,shape:'box',sealed:false,light:12,feed:1.5,heat:true,filter:true,level:8,hillH:10,items:[['soil',1],['stone',1,{x:-.5,z:-.3}],['pothos',1],['fern',2],['hornwort',2],['turtle',1],['isopod',1],['soilmic',1],['nitri',1]]},
    gecko:{n:['守宮攀爬缸','Gecko climbing tank'],d:['12L 開口圓柱瓶：泥土、沉木、假橋、黃金葛、睫角守宮同清道夫。','12 L open cylinder with soil, driftwood, a bridge, pothos, a crested gecko and cleanup crew.'],
      V:12,shape:'cyl',sealed:false,light:12,feed:1,mist:0,level:0,hillH:6,items:[['soil',1],['driftwood',1],['bridge',1],['pothos',2],['fern',1],['gecko',1],['isopod',1],['springtail',1],['soilmic',1]]},
    moss:{n:['苔蘚微景觀瓶','Moss terrarium'],d:['3L 密封梅森罐：泥土、石頭、苔蘚、網紋草同跳蟲，唔使餵。','3 L sealed mason jar with soil, stones, moss, fittonia and springtails. No feeding.'],
      V:3,shape:'jar',sealed:true,light:10,feed:0,mist:0,level:0,hillH:4,items:[['soil',1],['stone',1],['cmoss',2],['fittonia',1],['springtail',1],['soilmic',1]]},
    amazon:{n:['亞馬遜水陸缸','Amazon paludarium'],d:['30L 方缸跟亞馬遜天氣：泥土坡、鳳梨、腎蕨、黃金葛、箭毒蛙，水區有孔雀魚同清道夫魚。','30 L box tank in Amazon weather: soil slope, bromeliads, fern, pothos and dart frogs, with guppies and a pleco in the water.'],
      V:30,shape:'box',sealed:false,light:12,feed:4,mist:2,level:8,hillH:10,filter:true,region:'amazon',
      items:[['soil',1],['driftwood',1,{x:-.3,z:-.4}],['bromeliad',2],['fern',1],['pothos',1],['vallis',2],['hornwort',1],['frog',2],['guppy',5],['pleco',1],['isopod',1],['springtail',1],['soilmic',1],['nitri',1]]},
    newt:{n:['蠑螈溪邊缸','Newt streamside'],d:['15L 方缸跟京都天氣：石頭、苔蘚、黑木蕨、東方蠑螈同青鱂魚。','15 L box tank in Kyoto weather: stones, moss, Java fern, fire-belly newts and medaka.'],
      V:15,shape:'box',sealed:false,light:10,feed:1,mist:2,level:7,hillH:9,region:'kyoto',items:[['soil',1],['stone',2,{x:.4,z:.45}],['cmoss',1],['javafern',1],['hornwort',1],['newt',2],['medaka',3],['soilmic',1],['nitri',1]]},
    desert:{n:['豹紋守宮沙漠缸','Leopard gecko desert'],d:['20L 方缸跟撒哈拉天氣：細沙、碎石、石頭、假山同一隻豹紋守宮；沙漠夠熱，唔使加熱燈。','20 L box tank in Sahara weather: sand, gravel, stones, rock mountain and a leopard gecko; the desert is warm enough without a heat lamp.'],
      V:20,shape:'box',sealed:false,light:12,feed:1,mist:0,level:0,hillH:0,region:'sahara',items:[['gravel',1],['sand',1],['stone',2],['rockmtn',1],['leopard',1]]},
    zero:{n:['由零開始','Start from scratch'],d:['一個空嘅瓶，由鋪泥土、擺沉木、決定水位開始自己砌。','An empty jar. Lay soil, place driftwood and choose a water level.'],V:12,shape:'box',sealed:false,light:12,feed:0,level:0,hillH:8,items:[]}
  }
};
const PET_NAMES=[['波波','Bubbles'],['咕咕','Coco'],['豆豆','Bean'],['阿橙','Sunny'],['小藍','Blue'],['芝麻','Sesame'],['布甸','Pudding'],['麻糬','Mochi'],['珍珠','Pearl'],['雪糕','Gelato'],['叉燒','Char Siu'],['菠蘿包','Bolo'],['奶茶','Milk Tea'],['湯圓','Tangyuan'],['花生','Peanut'],['檸檬','Lemon'],['蛋撻','Tart'],['咖喱','Curry'],['鴛鴦','Yuenyeung'],['雞蛋仔','Waffle'],['魚蛋','Fishball'],['燒賣','Siu Mai'],['西多','Toastie'],['番薯','Yam'],['栗子','Chestnut'],['紅豆','Red Bean'],['椰子','Coconut'],['QQ','QQ']];

const BEGINNER=['lotus','hornwort','javafern','moss','marimo','guppy','medaka','minnow','snail','shrimp','pothos','fern','isopod','springtail','nitri','soilmic','sand','soil','stone','gravel'];
const TAGS={all:['全部','All'],scape:['造景','Hardscape'],plant:['植物','Plants'],animal:['動物','Animals'],microbe:['微生物','Microbes'],easy:['新手易養','Beginner'],o2:['產氧多','High O₂'],clean:['清道夫','Cleaners'],breed:['會繁殖','Breeders'],predator:['肉食','Predators'],amph:['兩棲','Amphibians'],salt:['海水','Salt water']};
function tagsOf(id){const c=CAT[id],t=[];
  t.push(['sub','decor'].includes(c.kind)?'scape':c.kind);
  if(BEGINNER.includes(id))t.push('easy');
  if(c.kind==='plant'&&c.params.o2Prod>=.6)t.push('o2');
  if(c.kind==='animal'&&c.diet&&(c.diet.detritus>=.7||c.diet.waste>=.7||c.diet.mould||(c.diet.algae>=1&&!c.diet.flake)))t.push('clean');
  if(c.kind==='animal'&&c.params.breedDays>0)t.push('breed');
  if(c.preys)t.push('predator');if(c.hab==='amph')t.push('amph');if(c.w==='salt')t.push('salt');
  return t;}
