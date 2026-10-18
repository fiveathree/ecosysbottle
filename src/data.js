/* ================= 工具 & 語言 ================= */
const $=s=>document.querySelector(s);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
/* 每個瀏覽器自己嘅偏好（語言、左右欄、日夜）；私隱模式讀唔到都唔會出錯 */
const pref={get:k=>{try{return localStorage.getItem(k);}catch(e){return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}},json:k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}}};
const fx=(x,d=1)=>(Math.abs(x)<1e-9||!isFinite(x)?0:x).toFixed(d);
const rnd=(a,b)=>a+Math.random()*(b-a);
const esc=t=>String(t).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
let LANG='zh';
const L=(zh,en)=>LANG==='en'?en:zh;
const N=x=>Array.isArray(x)?(LANG==='en'?x[1]:x[0]):x;
const P=(l,u,min,max,step,h)=>({l,u,min,max,step,h:h||['','']});

/* ================= 參數定義 ================= */
const PD={
  o2Prod:P(['光照時產氧','O₂ made in light'],['mg/小時','mg/h'],0,3,.05,['開燈時每小時製造多少氧氣','Oxygen produced each hour while lit']),
  respP:P(['呼吸耗氧','Respiration'],['mg/小時','mg/h'],0,.5,.01,['日夜都要呼吸，晚上只耗氧不產氧','Plants breathe day and night; at night they only use oxygen']),
  uptake:P(['吸收養分','Nutrient uptake'],['mg/小時','mg/h'],0,.05,.001,['吸收氨和硝酸鹽，也就是動物排泄物分解出來的東西','Absorbs ammonia and nitrate from animal waste']),
  respA:P(['呼吸耗氧','Respiration'],['mg/小時','mg/h'],0,.5,.005,['25°C 時每小時用多少氧；越暖用得越多','Oxygen used per hour at 25°C; more when warmer']),
  food:P(['每日食量','Daily food'],['份/日','portions/day'],0,3,.1,['1 份 ≈ 一撮飼料；無法吃會慢慢餓','1 portion ≈ a pinch of food; goes hungry without it']),
  wasteEvery:P(['多久去一次廁所','Poops every'],['小時','h'],1,48,1,['排泄的時間間隔','Time between droppings']),
  wasteAmt:P(['每次排泄量','Waste per dropping'],['mg 氨','mg NH₃'],0,.4,.005,['一半立即變氨，一半變殘渣慢慢分解','Half turns to ammonia at once, half to detritus that breaks down slowly']),
  o2Min:P(['最少要多少氧','Minimum oxygen'],['mg/L','mg/L'],.5,8,.1,['溶氧低於這個數就會缺氧','Below this it suffocates']),
  nh3Tol:P(['氨耐受上限','Ammonia limit'],['mg/L','mg/L'],.05,3,.05,['氨濃度高於這個數就會中毒','Above this it is poisoned']),
  tMin:P(['最低溫度','Min temperature'],['°C','°C'],0,35,1,['低於這個溫度會受寒','Colder than this is harmful']),
  tMax:P(['最高溫度','Max temperature'],['°C','°C'],5,40,1,['高於這個溫度會過熱','Warmer than this is harmful']),
  breedDays:P(['多少日生一次','Breeds every'],['日','days'],0,60,1,['0 = 不會繁殖；要健康、吃得飽、有伴才會生','0 = never; needs good health, food and a partner']),
  litter:P(['每次生多少隻','Young per brood'],['隻','young'],1,6,1),
  cap:P(['分解氨能力','Ammonia processing'],['mg/小時','mg/h'],0,.3,.005,['每小時最多將多少氨變成硝酸鹽；底沙和石頭越多，細菌住得越多','Max ammonia turned into nitrate per hour; more substrate and rock hold more bacteria']),
  o2PerN:P(['分解耗氧','Oxygen used'],['mg 氧/mg 氨','mg O₂ per mg NH₃'],0,6,.1,['每分解 1 mg 氨要用多少氧','Oxygen used per mg of ammonia']),
  rate:P(['分解速度','Breakdown rate'],['份/小時','portions/h'],0,.5,.01,['每小時分解多少殘渣或者排泄物','How much detritus or waste is broken down per hour']),
  o2Per:P(['分解耗氧','Oxygen used'],['mg/份','mg per portion'],0,5,.05),
  o2ProdL:P(['光照時產氧','O₂ made in light'],['mg/小時','mg/h'],0,5,.1,['開燈時製造氧氣，同時吃走二氧化碳','Makes oxygen and removes CO₂ while lit']),
  respPL:P(['呼吸耗氧','Respiration'],['mg/小時','mg/h'],0,1,.01),
  uptakeL:P(['吸收養分','Nutrient uptake'],['份/小時','portions/h'],0,.1,.002,['吸收泥土裡面分解了的排泄物','Takes up broken-down waste from the soil']),
  transp:P(['蒸散加濕','Transpiration'],['%/小時','%/h'],0,2,.05,['葉子散出水汽，提高濕度','Leaves release water vapour and raise humidity']),
  humMinP:P(['最低濕度','Min humidity'],['%','%'],0,100,1,['低於這個濕度葉子會乾','Leaves dry out below this']),
  respL:P(['呼吸耗氧','Respiration'],['mg/小時','mg/h'],0,8,.1,['密封瓶裡面會令二氧化碳上升','Raises CO₂ in a sealed jar']),
  wasteL:P(['每次排泄量','Waste per dropping'],['份','portions'],0,2,.05,['排泄物落在泥土上，靠分解者處理','Droppings land on the soil for decomposers']),
  humMin:P(['最低濕度','Min humidity'],['%','%'],0,100,1),
  humMax:P(['最高濕度','Max humidity'],['%','%'],0,100,1,['長期太濕會生病','Too humid for long makes it ill']),
  nh3TolW:P(['水中氨耐受','Water ammonia limit'],['mg/L','mg/L'],.1,3,.05,['水區裡面氨高於這個數會生病','Above this in the water it gets ill']),
  x:P(['左右位置','Left–right'],['',''],-1,1,.05,['亦可以在 3D 畫面直接拖','You can also drag it in the 3D view']),
  z:P(['前後位置','Front–back'],['',''],-1,1,.05),
  rot:P(['左右轉','Turn'],['°','°'],0,360,5,['繞住垂直軸轉一圈','Spin around the vertical axis']),
  rotX:P(['前後傾','Tilt front–back'],['°','°'],-180,180,5,['向前或者向後翻','Tip it forwards or backwards']),
  rotZ:P(['左右傾','Tilt left–right'],['°','°'],-180,180,5,['向左或者向右側','Tip it to the left or right']),
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
  decor:[['x','x'],['z','z'],['rot','rot'],['rotX','rotX'],['rotZ','rotZ'],['size','size']],
  sub:[['depth','depth']]
};

const STR={noO2:['缺氧','Low oxygen'],nh3:['氨中毒','Ammonia poisoning'],cold:['太冷','Too cold'],hot:['太熱','Too hot'],hungry:['飢餓','Hungry'],dry:['太乾','Too dry'],wet:['太濕','Too humid'],
  co2:['二氧化碳過高','CO₂ too high'],mould:['霉菌','Mould'],noWater:['沒有水','No water'],needFresh:['要淡水','Needs fresh water'],needSalt:['要海水','Needs salt water'],flow:['水流太強','Current too strong'],
  noSand:['沒有底沙生根','No substrate to root'],noRock:['沒有石或沉木依附','Nothing to attach to'],noSoil:['沒有泥土','No soil'],noMud:['沒有泥生根','No mud to root in'],lowN:['缺養分','Low nutrients'],lowLight:['光照不足','Not enough light'],
  hiN:['氨太高','Ammonia too high'],attacked:['被其他生物攻擊','Attacked'],weak:['衰弱','Weakness'],eaten:['被其他生物吃了','Eaten'],soilDry:['泥土太乾','Soil too dry']};
const SS=code=>code?N(STR[code]||[code,code]):'';

/* ================= 物種同造景 =================
   m: 可用模式 aqua / rain / both；hab: water / land / amph / none；w: fresh / salt */
const CAT={
  hornwort:{m:'both',hab:'water',kind:'plant',g:'aplant',name:['金魚藻','Hornwort'],sci:'Ceratophyllum',color:'#4f8f2c',root:'none',desc:['生長快、產氧多，不用生根，浮在水中也可以。','Fast-growing oxygen producer; no roots needed, can float.'],params:{o2Prod:.8,resp:.1,uptake:.012}},
  elodea:{m:'both',hab:'water',kind:'plant',g:'aplant',name:['水蘊草','Brazilian waterweed'],sci:'Egeria densa',color:'#5c9a33',root:'sand',desc:['葉密生長快，產氧大戶，要種在沙裡面。','Dense, fast and a big oxygen producer; plant it in sand.'],params:{o2Prod:.7,resp:.09,uptake:.011}},
  vallis:{m:'both',hab:'water',kind:'plant',g:'aplant',name:['苦草','Vallisneria'],sci:'Vallisneria',color:'#6aa33a',root:'sand',desc:['長條葉子，產氧穩定，要有底沙生根。','Long ribbon leaves and steady oxygen; needs substrate to root.'],params:{o2Prod:.6,resp:.08,uptake:.01}},
  javafern:{m:'both',hab:'water',kind:'plant',g:'aplant',name:['黑木蕨','Java fern'],sci:'Microsorum',color:'#2f6b33',root:'rock',desc:['綁在石頭或沉木上，不用強光，很難養死。','Tied to rock or wood, low light, very hardy.'],params:{o2Prod:.35,resp:.05,uptake:.005}},
  moss:{m:'both',hab:'water',kind:'plant',g:'aplant',name:['莫絲','Java moss'],sci:'Taxiphyllum',color:'#3d6b25',root:'rock',desc:['依附石頭生長，供蝦和螺藏身。','Grows on rock; cover for shrimp and snails.'],params:{o2Prod:.3,resp:.04,uptake:.004}},
  marimo:{m:'both',hab:'water',kind:'plant',g:'aplant',name:['綠藻球','Marimo ball'],sci:'Aegagropila',color:'#3e7d2c',root:'none',desc:['慢慢生長的毛球，產氧不多，但蝦很喜歡在上面覓吃。','Slow fuzzy ball; little oxygen, but shrimp love grazing on it.'],params:{o2Prod:.12,resp:.02,uptake:.003}},
  duckweed:{m:'both',hab:'water',kind:'plant',g:'aplant',name:['浮萍','Duckweed'],sci:'Lemna',color:'#8fc13f',root:'none',floating:1,desc:['浮在水面，一半氧氣散去空氣，但吸收養分快，壓制藻類。','Floats; half its oxygen escapes, but it soaks up nutrients and starves algae.'],params:{o2Prod:.3,resp:.03,uptake:.016}},
  lotus:{m:'both',hab:'water',kind:'plant',g:'aplant',name:['荷花','Lotus'],sci:'Nelumbo nucifera',color:'#e58fa8',root:'mud',shade:.15,airO2:1,desc:['根要種在泥裡面，葉浮在水面遮光，藻類會少很多；大部份氧氣由葉面散去空氣。','Roots in mud; its pads shade the water and cut algae, and much of its oxygen goes to the air.'],params:{o2Prod:1.2,resp:.15,uptake:.02}},
  softcoral:{m:'aqua',hab:'water',w:'salt',kind:'plant',g:'aplant',name:['軟珊瑚','Leather coral'],sci:'Sarcophyton',color:'#e89ab0',root:'rock',shade:.02,desc:['珊瑚其實是動物，體內住了共生藻做光合作用，所以要夠光；要附著在石頭或者假山上面。觸手會伸出來擺動。','Corals are animals with algae living inside that photosynthesise, so they need light; it must sit on stone or rock. Its polyps sway in the water.'],params:{o2Prod:.45,resp:.09,uptake:.006}},
  mushroom:{m:'aqua',hab:'water',w:'salt',kind:'plant',g:'aplant',name:['香菇珊瑚','Mushroom coral'],sci:'Discosoma',color:'#8a5fd1',root:'rock',desc:['好像一朵朵小菇，很耐養，光線不用太強，適合新手；要附著在石頭上。','Like little mushrooms; hardy and happy in modest light, good for beginners. Needs a rock to sit on.'],params:{o2Prod:.3,resp:.06,uptake:.005}},
  seagrass:{m:'aqua',hab:'water',w:'salt',kind:'plant',g:'aplant',name:['海草','Seagrass'],sci:'Halophila',color:'#5f9e3c',root:'sand',desc:['真正會開花的海洋植物，要種在細沙中；是海馬和小魚躲藏的草場。','A true flowering sea plant that roots in sand; a meadow where seahorses and small fish hide.'],params:{o2Prod:.55,resp:.08,uptake:.01}},
  redalgae:{m:'aqua',hab:'water',w:'salt',kind:'plant',g:'aplant',name:['紅藻','Red algae'],sci:'Gracilaria',color:'#c0392b',root:'none',desc:['紅色的海藻（龍鬚菜），不用種，浮在水中也可以；吃硝酸鹽，寄居蟹都喜歡咬。','Red seaweed that floats freely; it soaks up nitrate and hermit crabs like to nibble it.'],params:{o2Prod:.5,resp:.07,uptake:.013}},
  caulerpa:{m:'aqua',hab:'water',w:'salt',kind:'plant',g:'aplant',name:['海葡萄','Sea grapes'],sci:'Caulerpa',color:'#4fa04a',root:'none',desc:['海水藻類，吸收硝酸鹽很快，幫忙產氧。','Marine algae that absorbs nitrate quickly and adds oxygen.'],params:{o2Prod:.6,resp:.07,uptake:.014}},

  guppy:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'swim',name:['孔雀魚','Guppy'],sci:'Poecilia',color:'#e89a3c',diet:{flake:1,algae:.3},desc:['活潑耐養，但食量大、排泄多，要定時餵。','Lively and hardy, but eats and poops a lot; feed daily.'],params:{resp:.1,food:1,wasteEvery:6,wasteAmt:.05,o2Min:3,nh3Tol:.4,tMin:22,tMax:30}},
  medaka:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'swim',name:['青鱂魚','Medaka'],sci:'Oryzias',color:'#e6d3a3',diet:{flake:1,algae:.4},desc:['耐冷耐熱，好適合露台生態缸。','Copes with cold and heat; great for balcony tanks.'],params:{resp:.08,food:.8,wasteEvery:8,wasteAmt:.04,o2Min:2.5,nh3Tol:.5,tMin:8,tMax:32}},
  minnow:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'swim',name:['白雲山魚','White cloud minnow'],sci:'Tanichthys',color:'#c9d3c2',diet:{flake:1,algae:.4,detritus:.2},desc:['香港原生小魚，耐低溫、耐低氧。','Small Hong Kong native; tolerates cold and low oxygen.'],params:{resp:.12,food:1.1,wasteEvery:8,wasteAmt:.06,o2Min:2.5,nh3Tol:.5,tMin:10,tMax:26}},
  betta:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'swim',name:['鬥魚','Betta'],sci:'Betta splendens',color:'#3b4fd1',diet:{flake:1},desc:['會浮上水面吸空氣，不怕缺氧，但怕冷，還會和其他鬥魚打架。','Gulps air so copes with low oxygen; hates cold and fights other bettas.'],params:{resp:.12,food:1,wasteEvery:8,wasteAmt:.06,o2Min:.8,nh3Tol:.4,tMin:24,tMax:30}},
  shrimp:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'hop',name:['米蝦','Cherry shrimp'],sci:'Neocaridina',color:'#d9452f',diet:{algae:1,detritus:.7,flake:.6},desc:['吃藻類和殘渣的清潔工，對氨很敏感。','Cleaner that eats algae and detritus; very sensitive to ammonia.'],params:{resp:.04,food:.4,wasteEvery:8,wasteAmt:.012,o2Min:4,nh3Tol:.2,tMin:18,tMax:28}},
  amano:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'hop',name:['大和藻蝦','Amano shrimp'],sci:'Caridina',color:'#b9b2a0',diet:{algae:1,detritus:.6,flake:.5},desc:['吃藻最強的蝦，可以壓制藻類爆發。','The best algae-eating shrimp; keeps blooms down.'],params:{resp:.06,food:.6,wasteEvery:8,wasteAmt:.018,o2Min:4,nh3Tol:.25,tMin:18,tMax:28}},
  snail:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'crawl',name:['石田螺','Pond snail'],sci:'Sinotaia',color:'#7a5532',diet:{detritus:1,algae:.8,flake:.4},desc:['吃殘渣和藻類，很頑強，是清道夫。','Tough cleaner that eats detritus and algae.'],params:{resp:.03,food:.5,wasteEvery:10,wasteAmt:.015,o2Min:2,nh3Tol:.6,tMin:10,tMax:30}},
  nerite:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'crawl',name:['斑馬螺','Zebra nerite'],sci:'Neritina',color:'#3a3420',diet:{algae:1,detritus:.5},desc:['專吃玻璃和石頭上的藻，淡水不會繁殖過多。','Grazes algae off glass and rock; won\'t overbreed in fresh water.'],params:{resp:.03,food:.5,wasteEvery:12,wasteAmt:.012,o2Min:2,nh3Tol:.5,tMin:20,tMax:28}},
  daphnia:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'swarm',name:['水蚤群','Daphnia swarm'],sci:'Daphnia',color:'#d9b46a',diet:{algae:1},desc:['一群細小浮游動物，濾食綠水，令水變清。','Tiny plankton that filter green water and clear it.'],params:{resp:.02,food:.3,wasteEvery:6,wasteAmt:.004,o2Min:3,nh3Tol:.3,tMin:8,tMax:26}},
  jelly:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'jelly',flow:1,name:['桃花水母','Freshwater jellyfish'],sci:'Craspedacusta',color:'#e9eef2',diet:{flake:.6,algae:.2},desc:['淡水水母，很怕強水流，氧氣泵和過濾器會把牠扯爛。','Freshwater jelly; strong current from a pump or filter tears it apart.'],params:{resp:.02,food:.3,wasteEvery:8,wasteAmt:.005,o2Min:4,nh3Tol:.2,tMin:18,tMax:28}},
  pleco:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'pleco',name:['清道夫魚','Pleco'],sci:'Hypostomus',color:'#5a4a35',diet:{algae:1,detritus:.8,flake:.5},desc:['吸附玻璃吃藻和殘渣，但排泄量大。','Sucks algae and detritus off the glass, but makes a lot of waste.'],params:{resp:.15,food:1.2,wasteEvery:6,wasteAmt:.08,o2Min:2,nh3Tol:.6,tMin:22,tMax:30}},
  crab:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'crab',name:['澤蟹','Freshwater crab'],sci:'Geothelphusa',color:'#c4502c',preys:['shrimp','amano','snail','nerite'],diet:{detritus:1,flake:.8},desc:['吃殘渣，但會夾蝦和螺來吃。','Eats detritus, but will catch shrimp and snails.'],params:{resp:.08,food:.7,wasteEvery:10,wasteAmt:.04,o2Min:3,nh3Tol:.5,tMin:15,tMax:26}},
  slider:{m:'both',hab:'water',kind:'animal',g:'aanimal',move:'aqturtle',name:['巴西龜','Red-eared slider'],sci:'Trachemys',color:'#4f7a3a',preys:['guppy','medaka','minnow','shrimp','amano','snail','nerite','daphnia'],diet:{flake:1,algae:.3},desc:['浮上水面呼吸，不怕缺氧，但排泄很多，還會吃小魚和蝦。','Breathes air so ignores low oxygen, but is messy and eats small fish and shrimp.'],params:{resp:.4,food:2,wasteEvery:6,wasteAmt:.3,o2Min:.5,nh3Tol:1,tMin:20,tMax:30}},
  seahorse:{m:'aqua',hab:'water',w:'salt',kind:'animal',g:'aanimal',move:'seahorse',name:['海馬','Seahorse'],sci:'Hippocampus',color:'#e0a43a',diet:{flake:1},desc:['海水魚，游得很慢，由爸爸負責生育。','Marine fish, a slow swimmer; the father carries the young.'],params:{resp:.06,food:.8,wasteEvery:6,wasteAmt:.03,o2Min:4,nh3Tol:.1,tMin:22,tMax:28}},
  moonjelly:{m:'aqua',hab:'water',w:'salt',kind:'animal',g:'aanimal',move:'jelly',flow:1,name:['海月水母','Moon jellyfish'],sci:'Aurelia',color:'#f0f4ff',diet:{flake:1},desc:['海水水母，要柔和水流。','Marine jelly that needs gentle water.'],params:{resp:.04,food:.5,wasteEvery:8,wasteAmt:.01,o2Min:4,nh3Tol:.1,tMin:18,tMax:25}},
  gardeneel:{m:'aqua',hab:'water',w:'salt',kind:'animal',g:'aanimal',move:'eel',burrow:1,name:['花園鰻','Garden eel'],sci:'Heteroconger',color:'#e8e2d2',diet:{flake:1},desc:['海水魚，一定要有厚細沙鑽進去，平時伸出半個身體吃浮游生物，受驚會縮回沙。','Marine fish that must burrow into deep fine sand; it sways half out to catch plankton and ducks down when startled.'],params:{resp:.05,food:.5,wasteEvery:8,wasteAmt:.015,o2Min:4,nh3Tol:.1,tMin:22,tMax:28}},
  hermit:{m:'aqua',hab:'water',w:'salt',kind:'animal',g:'aanimal',move:'crab',name:['寄居蟹','Hermit crab'],sci:'Paguroidea',color:'#d06a3a',diet:{detritus:1,algae:.6,flake:.6},desc:['海水清道夫，吃殘渣和藻類。','Marine cleaner that eats detritus and algae.'],params:{resp:.04,food:.5,wasteEvery:10,wasteAmt:.02,o2Min:3,nh3Tol:.3,tMin:20,tMax:28}},

  nitri:{m:'both',hab:'water',w:'both',kind:'microbe',g:'nitri',name:['硝化菌群','Nitrifying bacteria'],sci:'Nitrosomonas',color:'#d8c27a',desc:['住在底沙、石頭和過濾，將有毒的氨變成水草吃得的硝酸鹽，過程要用氧。','Live in substrate, rock and filters; turn toxic ammonia into nitrate, using oxygen.'],params:{cap:.03,o2PerN:3.4}},
  decomp:{m:'both',hab:'water',w:'both',kind:'microbe',g:'decomp',name:['分解菌','Decomposer bacteria'],sci:'Bacillus',color:'#c9a96a',desc:['加快分解殘渣和屍體，令底沙乾淨。','Break down detritus and dead matter faster.'],params:{rate:.1,o2Per:.3}},

  fern:{m:'rain',hab:'land',kind:'plant',g:'rplant',name:['腎蕨','Boston fern'],sci:'Nephrolepis',color:'#3f8a3a',desc:['雨林經典植物，蒸散多，幫忙保持濕度。','Classic rainforest plant; transpires a lot and keeps humidity up.'],params:{o2Prod:1.5,resp:.2,uptake:.02,transp:.6,humMin:55}},
  cmoss:{m:'rain',hab:'land',kind:'plant',g:'rplant',name:['苔蘚','Moss carpet'],sci:'Bryophyta',color:'#5aa03a',desc:['鋪滿地面，保濕又好看，太乾會變黃。','Carpets the ground and holds moisture; yellows when dry.'],params:{o2Prod:.6,resp:.08,uptake:.008,transp:.3,humMin:70}},
  pothos:{m:'rain',hab:'land',kind:'plant',g:'rplant',name:['黃金葛','Pothos'],sci:'Epipremnum',color:'#8fbf3a',desc:['最易養的爬藤，產氧多，吸收養分快。','The easiest vine; lots of oxygen and fast nutrient uptake.'],params:{o2Prod:2,resp:.25,uptake:.025,transp:.5,humMin:40}},
  bromeliad:{m:'rain',hab:'land',kind:'plant',g:'rplant',name:['鳳梨','Bromeliad'],sci:'Bromeliaceae',color:'#c0392b',desc:['葉心會積水，箭毒蛙喜歡在裡面休息。','Holds water in its centre where dart frogs like to rest.'],params:{o2Prod:1,resp:.12,uptake:.01,transp:.3,humMin:45}},
  fittonia:{m:'rain',hab:'land',kind:'plant',g:'rplant',name:['網紋草','Fittonia'],sci:'Fittonia',color:'#c8607a',desc:['葉脈有網紋，太乾會立即垂低。','Net-veined leaves that wilt quickly when dry.'],params:{o2Prod:.8,resp:.1,uptake:.012,transp:.5,humMin:65}},

  turtle:{m:'rain',hab:'amph',kind:'animal',g:'amph',move:'amph',name:['麝香龜','Musk turtle'],sci:'Sternotherus',color:'#5a5a34',diet:{feed:1},desc:['體型細小的半水棲龜，要有水區，排泄物會進入水中。','Small semi-aquatic turtle; needs a water area and fouls it.'],params:{resp:3,food:1.5,wasteEvery:8,wasteAmt:.6,humMin:50,humMax:98,tMin:22,tMax:30,nh3Tol:1}},
  newt:{m:'rain',hab:'amph',kind:'animal',g:'amph',move:'amph',name:['東方蠑螈','Fire-belly newt'],sci:'Cynops orientalis',color:'#2b2b2b',diet:{feed:1},desc:['兩棲動物，水區和陸地都要有，怕熱。','Amphibian that needs both water and land; dislikes heat.'],params:{resp:.6,food:.4,wasteEvery:12,wasteAmt:.12,humMin:60,humMax:100,tMin:12,tMax:25,nh3Tol:.5}},
  gecko:{m:'rain',hab:'land',kind:'animal',g:'ranimal',move:'climb',name:['睫角守宮','Crested gecko'],sci:'Correlophus',color:'#c9893f',diet:{feed:1},desc:['會爬玻璃的蜥蜴，要通風，不可以長期太濕或太熱。','Glass-climbing lizard; needs airflow, not constant damp or heat.'],params:{resp:4,food:1,wasteEvery:24,wasteAmt:.8,humMin:50,humMax:90,tMin:20,tMax:27}},
  leopard:{m:'rain',hab:'land',kind:'animal',g:'ranimal',move:'walk',name:['豹紋守宮','Leopard gecko'],sci:'Eublepharis',color:'#e8c23a',diet:{feed:1},desc:['地棲守宮，不會爬玻璃，喜歡乾爽溫暖。','Ground-dwelling gecko; can\'t climb glass, likes it dry and warm.'],params:{resp:3.5,food:1,wasteEvery:24,wasteAmt:.7,humMin:10,humMax:60,tMin:24,tMax:32}},
  frog:{m:'rain',hab:'land',kind:'animal',g:'ranimal',move:'frog',name:['箭毒蛙','Dart frog'],sci:'Dendrobates',color:'#2a6fd6',diet:{feed:1},desc:['人工繁殖的沒有毒，需要很高濕度，怕熱。','Captive-bred ones are harmless; need very high humidity, dislike heat.'],params:{resp:.4,food:.5,wasteEvery:12,wasteAmt:.15,humMin:75,humMax:100,tMin:20,tMax:28}},
  isopod:{m:'rain',hab:'land',kind:'animal',g:'ranimal',move:'colony',mouldOK:1,name:['鼠婦群','Isopod colony'],sci:'Porcellio',color:'#6f6a66',diet:{waste:1,mould:.8,feed:.5},desc:['一群清道夫，吃排泄物和腐葉。','Cleanup crew that eats droppings and leaf litter.'],params:{resp:.15,food:.6,wasteEvery:12,wasteAmt:.05,humMin:60,humMax:100,tMin:15,tMax:30}},
  springtail:{m:'rain',hab:'land',kind:'animal',g:'ranimal',move:'spring',mouldOK:1,name:['跳蟲群','Springtail colony'],sci:'Collembola',color:'#d6d4c8',diet:{mould:1,waste:.7},desc:['小得像白色粉粒，專吃霉菌，防止發霉。','Tiny white specks that eat mould and stop it spreading.'],params:{resp:.1,food:.4,wasteEvery:24,wasteAmt:.01,humMin:70,humMax:100,tMin:15,tMax:30}},
  soilmic:{m:'rain',hab:'land',kind:'microbe',g:'soilm',name:['土壤菌群','Soil microbes'],sci:'Soil microbiome',color:'#8a6a3a',desc:['住在泥土，將排泄物分解成植物養分。','Live in the soil and turn waste into plant food.'],params:{rate:.06,o2Per:2}},

  sand:{m:'both',hab:'none',kind:'sub',g:'sub',name:['細沙','Fine sand'],sci:'',color:'#cab68c',desc:['水草要種在沙裡面先生到根，細菌也住在沙粒之間。','Rooted plants need it; bacteria live between the grains.'],params:{depth:3}},
  gravel:{m:'both',hab:'none',kind:'sub',g:'sub',name:['碎石','Gravel'],sci:'',color:'#8f8a80',desc:['通水性好，住得多細菌。','Good water flow and lots of bacteria.'],params:{depth:3}},
  soil:{m:'both',hab:'none',kind:'sub',g:'sub',name:['泥土','Soil'],sci:'',color:'#5b4030',desc:['雨林植物一定要有泥土；有泥土才會有陸地土坡。','Rainforest plants need it; soil also builds the land slope.'],params:{depth:4}},
  stone:{m:'both',hab:'none',kind:'decor',g:'decor',rock:1,name:['石頭','Stones'],sci:'',color:'#7d786f',desc:['增加細菌附著面積，黑木蕨和莫絲可以依附。','More surface for bacteria; Java fern and moss can attach.'],params:{x:.45,z:.3,rot:0,rotX:0,rotZ:0,size:1}},
  rockmtn:{m:'both',hab:'none',kind:'decor',g:'decor',rock:1,name:['假山','Rock mountain'],sci:'',color:'#8a857c',desc:['層層疊疊的石山，供生物躲藏，也住得下更多細菌。','Stacked rock for hiding, with room for bacteria.'],params:{x:-.4,z:-.3,rot:0,rotX:0,rotZ:0,size:1}},
  bridge:{m:'both',hab:'none',kind:'decor',g:'decor',name:['假橋','Bridge'],sci:'',color:'#9b3b2a',desc:['純裝飾，蝦和蜥蜴可以走過。','Pure decoration that shrimp and lizards can cross.'],params:{x:0,z:.25,rot:20,rotX:0,rotZ:0,size:1}},
  driftwood:{m:'both',hab:'none',kind:'decor',g:'decor',rock:1,name:['沉木','Driftwood'],sci:'',color:'#5b3a22',desc:['天然木頭，植物可以依附，守宮可以攀爬。','Natural wood for plants to attach to and geckos to climb.'],params:{x:.2,z:-.35,rot:40,rotX:0,rotZ:0,size:1}}
};
const BREED={gardeneel:[0,1],guppy:[7,3],medaka:[6,2],minnow:[10,2],shrimp:[8,3],snail:[10,2],seahorse:[14,2],frog:[20,1]};
/* 顏色變化：每隻生物加入時隨機揀一個，BB 跟返父母；喺彈出視窗可以轉 */
const VARIANTS={
  guppy:[{n:['藍尾','Blue tail'],b:0xe8a04a,f:0x3a6fd8},{n:['紅尾','Red tail'],b:0xe8a04a,f:0xd8463a},{n:['紫尾','Purple tail'],b:0xe8a04a,f:0x8a3ad8},{n:['黃金','Gold'],b:0xf2cf5a,f:0xf0a830},{n:['黑禮服','Tuxedo'],b:0xd8d0c0,f:0x2a2a30},{n:['藍草','Blue grass'],b:0x9fc6e8,f:0x2f7fd0}],
  betta:[{n:['寶藍','Royal blue'],b:0x3b4fd1,f:0xd23b5a},{n:['大紅','Red'],b:0xc8283c,f:0x8a1a2a},{n:['白金','Platinum'],b:0xf0efe8,f:0xd8d8f0},{n:['黃金','Yellow'],b:0xe8b83a,f:0xf0d060},{n:['黑橙','Black orange'],b:0x2a2a30,f:0xe8702a},{n:['藍天','Sky'],b:0x3b8fd1,f:0x6ac0f0}],
  medaka:[{n:['白','White'],b:0xe6d3a3,f:0xf0b860},{n:['楊貴妃（橙）','Orange'],b:0xf09040,f:0xf0b060},{n:['黑','Black'],b:0x4a4a4a,f:0x6a6a6a},{n:['幹之（藍光）','Blue sheen'],b:0xb8d0e0,f:0x80b0d8}],
  shrimp:[{n:['紅','Red'],c:0xd9452f},{n:['藍','Blue'],c:0x2f6fd9},{n:['黃','Yellow'],c:0xe8c23a},{n:['綠','Green'],c:0x4caf50},{n:['黑','Black'],c:0x2a2a2a},{n:['橙','Orange'],c:0xf07a2a}],
  snail:[{n:['啡','Brown'],c:0x7a5532,s:0x3e2a17},{n:['金','Gold'],c:0xc9a24a,s:0x7a5a20},{n:['紅','Red'],c:0xb5432f,s:0x6a2015}],
  nerite:[{n:['斑馬','Zebra'],c:0x2d2a20,s:0xd8c25a},{n:['虎紋','Tiger'],c:0x8a5a20,s:0x2a1a0a},{n:['橄欖','Olive'],c:0x5a6a30,s:0x2a3018}],
  fittonia:[{n:['粉紅','Pink'],cs:['#c8607a','#3f6f35','#d77a92']},{n:['紅','Red'],cs:['#c43c3c','#3f6f35','#d65a5a']},{n:['白','White'],cs:['#ecece2','#3f6f35','#f6f6ee']}],
  bromeliad:[{n:['粉紅','Pink'],c:'#e0607a'},{n:['紅','Red'],c:'#d23b2b'},{n:['黃','Yellow'],c:'#e8c23a'},{n:['橙','Orange'],c:'#f07a2a'}],
  lotus:[{n:['粉紅','Pink'],c:0xf0a3b8},{n:['白','White'],c:0xf6f2ea},{n:['黃','Yellow'],c:0xf2d35a}],
  softcoral:[{n:['粉紅','Pink'],c:0xe89ab0,p:0xf6d4de},{n:['綠','Green'],c:0x7fc49a,p:0xd8f0c8},{n:['黃','Yellow'],c:0xe8c86a,p:0xfaf0c0},{n:['紫','Purple'],c:0x9a6ad0,p:0xe0c8f6}],
  mushroom:[{n:['紫','Purple'],c:0x8a5fd1,p:0x4a2a8a},{n:['紅','Red'],c:0xd0484a,p:0x7a1a1a},{n:['藍綠','Teal'],c:0x3fb0a8,p:0x1a5a58},{n:['橙','Orange'],c:0xf0903a,p:0x8a4010}],
  redalgae:[{n:['紅','Red'],cs:['#c0392b','#a93226','#d35400']},{n:['紫紅','Magenta'],cs:['#b03a6a','#8a2a50','#d0508a']}],
};
const variantOf=it=>{const V=VARIANTS[it.type];if(!V)return null;const v=it.params&&it.params.v;return V[(v!=null?v:it.n||0)%V.length];};
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
  acrylic:{n:['亞克力','Acrylic'],c:0xeaf6ff,op:.09,sh:45,tr:.92,d:['輕身不易爛，但會刮花、慢慢變黃','Light and tough, but scratches and yellows']},
  green:{n:['綠玻璃','Green glass'],c:0x5f9a6a,op:.28,sh:110,tr:.8,d:['濾走部份光，藻類生長慢一點','Filters some light, slowing algae']},
  amber:{n:['茶色玻璃','Amber glass'],c:0xb0702a,op:.32,sh:110,tr:.62,d:['擋光多，植物產氧會明顯減少','Blocks a lot of light; plants make much less oxygen']},
  ceramic:{n:['陶瓷','Ceramic'],c:0x9a5f3c,op:.88,sh:25,tr:.7,therm:.55,d:['不透光，只有頂部透光；瓶身厚、保溫好，溫度變化小。畫面會稍為透視，方便你看到裡面','Opaque, so light only enters from the top; thick walls keep the temperature steady. Shown faintly see-through so you can look inside']},
  frosted:{n:['磨砂玻璃','Frosted glass'],c:0xf2f5f5,op:.48,sh:5,tr:.75,d:['光線柔和，但看不清裡面','Soft light, but hard to see inside']}
};
const WX={
  sunny:{n:['晴天','Sunny'],light:1,d:2,dh:-12},
  cloudy:{n:['多雲','Cloudy'],light:.65,d:0,dh:0},
  rain:{n:['下雨','Rain'],light:.45,d:-3,dh:16,rain:1},
  storm:{n:['雷暴','Thunderstorm'],light:.3,d:-4,dh:20,rain:2,bolt:1},
  fog:{n:['起霧','Fog'],light:.5,d:-2,dh:22,fog:1},
  sand:{n:['沙塵暴','Sandstorm'],light:.35,d:1,dh:-15,sand:1},
  snow:{n:['下雪','Snow'],light:.55,d:-7,dh:6,snow:1}
};
/* 地區氣候：t 平均溫度、sw 日夜溫差、hum 平均濕度、light 日照強度、w 各種天氣出現比重 */
/* 地區氣候：type city＝城市地方（所有模式、可自訂）；biome＝真實生態地域（按模式）
   t 平均溫度、sw 日夜溫差、hum 平均濕度、light 日照強度、w 各種天氣出現比重 */
const REGIONS={
  hk:{type:'city',n:['香港','Hong Kong'],t:24,sw:5,hum:76,light:1,w:{sunny:3,cloudy:3,rain:2,storm:1,fog:.5},d:['亞熱帶，濕熱多雨，夏天有雷暴。','Subtropical: warm, humid and wet, with summer storms.']},
  kaohsiung:{type:'city',n:['高雄','Kaohsiung'],t:25.5,sw:6,hum:75,light:1.05,w:{sunny:4,cloudy:2.5,rain:1.5,storm:1},d:['陽光充足，夏天午後雷雨，冬天乾爽溫暖。','Sunny, with summer afternoon storms and mild dry winters.']},
  taipei:{type:'city',n:['台北','Taipei'],t:23,sw:6,hum:78,light:.95,w:{sunny:2.5,cloudy:3,rain:3,storm:1,fog:.5},d:['盆地地形，潮濕多雨。','A humid basin with frequent rain.']},
  tokyo:{type:'city',n:['東京','Tokyo'],t:16.5,sw:8,hum:65,light:.95,w:{sunny:3.5,cloudy:3,rain:2,snow:.3},d:['四季分明，冬天乾冷。','Distinct seasons with cold, dry winters.']},
  kyoto:{type:'city',n:['京都','Kyoto'],t:16,sw:8,hum:66,light:.95,w:{sunny:3,cloudy:3,rain:2,fog:.6,snow:.4},d:['四季分明，冬天會下雪。','Four distinct seasons with some winter snow.']},
  singapore:{type:'city',n:['新加坡','Singapore'],t:27.5,sw:5,hum:84,light:1,w:{sunny:2.5,cloudy:2.5,rain:3,storm:2},d:['赤道附近，全年炎熱潮濕。','Near the equator: hot and humid all year.']},
  london:{type:'city',n:['倫敦','London'],t:11,sw:7,hum:78,light:.7,w:{cloudy:4,rain:3,fog:1.5,sunny:1.5,snow:.2},d:['陰天多、日照少、經常下微雨。','Overcast, little sun and frequent drizzle.']},
  custom:{type:'city',custom:1,n:['自訂','Custom'],t:22,sw:6,hum:70,light:1,w:{sunny:3,cloudy:2,rain:2},d:['自己設定溫度、濕度、日照和天氣。','Set your own temperature, humidity, sunlight and weather.']},
  gbr:{type:'biome',modes:['aqua'],n:['大堡礁','Great Barrier Reef'],t:26,sw:3,hum:74,light:1.1,w:{sunny:5,cloudy:2,rain:1.5,storm:.8},d:['熱帶珊瑚海，陽光強烈、溫度穩定。','Tropical coral sea with strong sun and steady warmth.']},
  redsea:{type:'biome',modes:['aqua'],n:['紅海','Red Sea'],t:27,sw:6,hum:60,light:1.15,w:{sunny:7,cloudy:1,sand:.4},d:['又熱又鹹的海，很少下雨。','A hot, very salty sea with little rain.']},
  med:{type:'biome',modes:['aqua'],n:['地中海','Mediterranean'],t:21,sw:9,hum:60,light:1.1,w:{sunny:6,cloudy:2,rain:.8,storm:.3},d:['陽光充足、夏乾冬濕。','Sunny, with dry summers and wet winters.']},
  amazonriver:{type:'biome',modes:['aqua','palu'],n:['亞馬遜河','Amazon River'],t:28,sw:5,hum:85,light:.9,w:{sunny:2,cloudy:3,rain:4,storm:2},d:['溫暖軟水的大河，很多熱帶魚的老家。','A warm, soft-water river and home to many tropical fish.']},
  tanganyika:{type:'biome',modes:['aqua'],n:['坦干依喀湖','Lake Tanganyika'],t:26,sw:4,hum:65,light:1.05,w:{sunny:5,cloudy:2,rain:1.5,storm:.5},d:['非洲大湖，水溫穩定。','A great African lake with steady water temperature.']},
  baikal:{type:'biome',modes:['aqua'],n:['貝加爾湖','Lake Baikal'],t:6,sw:9,hum:70,light:.8,w:{sunny:2,cloudy:3,fog:1.5,snow:2,rain:.5},d:['寒冷湖區，經常起霧和下雪。','A cold lake region with frequent fog and snow.']},
  amazon:{type:'biome',modes:['rain','palu'],n:['亞馬遜雨林','Amazon rainforest'],t:27,sw:6,hum:88,light:.95,w:{sunny:2,cloudy:3,rain:4,storm:2,fog:1},d:['全年炎熱潮濕，幾乎每天下雨。','Hot and humid all year with rain most days.']},
  borneo:{type:'biome',modes:['rain','palu'],n:['婆羅洲雨林','Borneo rainforest'],t:26,sw:5,hum:90,light:.9,w:{cloudy:3,rain:4,storm:1.5,fog:1.5,sunny:1.5},d:['雲霧多，濕度很高。','Misty and extremely humid.']},
  cloudforest:{type:'biome',modes:['rain'],n:['哥斯達黎加雲霧林','Costa Rica cloud forest'],t:18,sw:6,hum:95,light:.8,w:{fog:4,cloudy:3,rain:3,sunny:1},d:['高山雲霧終年不散，涼爽潮濕。','Mountain mist all year; cool and damp.']},
  sahara:{type:'biome',modes:['rain'],n:['撒哈拉沙漠','Sahara Desert'],t:29,sw:16,hum:28,light:1.15,w:{sunny:7,cloudy:1,sand:1.5},d:['白天很熱、夜晚很冷、極乾，會有沙塵暴。','Scorching days, cold nights, bone dry, with sandstorms.']},
  pantanal:{type:'biome',modes:['palu'],n:['潘塔納爾濕地','Pantanal wetland'],t:26,sw:8,hum:80,light:1,w:{sunny:3,cloudy:2,rain:3,storm:1.5},d:['世界最大濕地，水陸交替。','The largest wetland on Earth, half water and half land.']},
  mekong:{type:'biome',modes:['palu'],n:['湄公河三角洲','Mekong Delta'],t:27,sw:6,hum:80,light:1,w:{sunny:3,cloudy:2.5,rain:3,storm:1},d:['河道、稻田和紅樹林交錯。','Channels, rice paddies and mangroves.']}
};
const CUSTOM_DEF={name:'',t:22,sw:6,hum:70,light:1,rain:2,fog:.5,snow:0};
function regionOf(st){const r=REGIONS[st.region]||REGIONS.hk;if(!r.custom)return r;
  const c=Object.assign({},CUSTOM_DEF,st.customRegion||S.customRegion||{});
  return{type:'city',custom:1,n:[c.name||'自訂',c.name||'Custom'],t:c.t,sw:c.sw,hum:c.hum,light:c.light,d:r.d,
    w:{sunny:Math.max(.5,5-c.rain),cloudy:2,rain:c.rain,storm:c.rain*.3,fog:c.fog,snow:c.snow}};}
function typicalWx(r){const w=regionOf({region:r}).w;return Object.entries(w).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]||(a[0]==='cloudy'?-1:b[0]==='cloudy'?1:0))[0][0];} // 同分揀多雲，唔好次次當晴天

const PRESETS={
  aqua:{
    eco:{n:['密封生態瓶','Sealed eco jar'],d:['4L 梅森罐密封：細沙、石頭、金魚藻、莫絲、苦草、米蝦、石田螺、硝化菌，不用餵。','4 L sealed mason jar with sand, stones, hornwort, moss, vallisneria, shrimp, snails and bacteria. No feeding.'],
      V:4,shape:'jar',sealed:true,light:12,feed:0,items:[['sand',1],['stone',1],['hornwort',2],['moss',1],['vallis',1],['shrimp',5],['snail',2],['nitri',1]]},
    tank:{n:['開口小魚缸','Open fish tank'],d:['10L 方缸，有氧氣泵、過濾和加熱棒，碎石、假山、假橋、孔雀魚 4 條。','10 L box tank with pump, filter and heater, gravel, rock mountain, bridge and 4 guppies.'],
      V:10,shape:'box',sealed:false,light:10,feed:5,pump:true,filter:true,heater:true,items:[['gravel',1],['rockmtn',1],['bridge',1],['hornwort',2],['vallis',2],['duckweed',1],['guppy',4],['snail',1],['nitri',1],['decomp',1]]},
    sea:{n:['海馬小海缸','Seahorse reef'],d:['20L 海水方缸：厚細沙、假山上面的軟珊瑚、海草、海葡萄、海馬、花園鰻和寄居蟹，有過濾和加熱棒。','20 L salt-water box tank with deep sand, a leather coral on the rock mountain, seagrass, sea grapes, seahorses, garden eels and hermit crabs; filter and heater.'],
      V:20,shape:'box',water:'salt',sealed:false,light:10,feed:3.5,filter:true,heater:true,region:'med',items:[['sand',1,{depth:5}],['rockmtn',1],['softcoral',1],['seagrass',1],['caulerpa',2],['seahorse',2],['gardeneel',3],['hermit',2],['nitri',1],['decomp',1]]},
    reef:{n:['珊瑚礁小缸','Coral reef nano'],d:['20L 海水方缸，跟大堡礁天氣：石頭和假山上有軟珊瑚和香菇珊瑚，細沙上種了海草，養花園鰻和寄居蟹；有過濾、氧氣泵、加熱棒，熱天開風扇降溫。','20 L salt-water box tank in Great Barrier Reef weather: leather and mushroom corals on stones and a rock mountain, seagrass in the sand, garden eels and hermit crabs; filter, air pump, heater and a fan for hot days.'],
      V:20,shape:'box',water:'salt',sealed:false,light:9,feed:2.5,filter:true,pump:true,heater:true,fan:true,region:'gbr',items:[['sand',1,{depth:5}],['rockmtn',1],['stone',2],['softcoral',2],['mushroom',2],['seagrass',1],['gardeneel',3],['hermit',3],['nitri',1],['decomp',1]]},
    moon:{n:['海月水母缸','Moon jelly tank'],d:['15L 海水圓柱瓶：3 隻海月水母、海葡萄和紅藻，還有一隻寄居蟹清理殘渣。水母怕水流，所以不開氧氣泵和過濾，改用風扇保持涼快，每週換水。','15 L salt-water cylinder: 3 moon jellies, sea grapes, red algae and a hermit crab to clean up. Jellies hate water flow, so there is no pump or filter; a fan keeps it cool and the water is changed weekly.'],
      V:15,shape:'cyl',water:'salt',sealed:false,light:10,feed:1.5,fan:true,wc:20,region:'hk',items:[['sand',1],['caulerpa',2],['redalgae',1],['moonjelly',3],['hermit',1],['nitri',1],['decomp',1]]},
    shrimp:{n:['米蝦水草缸','Shrimp planted tank'],d:['8L 圓柱瓶：沉木、黑木蕨、莫絲、水蘊草、綠藻球、10 隻米蝦和斑馬螺，少量餵食。','8 L cylinder with driftwood, Java fern, moss, waterweed, marimo, 10 cherry shrimp and nerites; light feeding.'],
      V:8,shape:'cyl',sealed:false,light:10,feed:1,items:[['sand',1],['driftwood',1],['javafern',1],['moss',1],['elodea',2],['marimo',1],['shrimp',10],['nerite',2],['nitri',1],['decomp',1]]},
    betta:{n:['鬥魚獨居缸','Betta solo tank'],d:['5L 方缸，有加熱棒：一條鬥魚、黑木蕨、綠藻球同一隻石田螺。','5 L box tank with a heater: one betta, Java fern, marimo and a pond snail.'],
      V:5,shape:'box',sealed:false,light:8,feed:1,heater:true,items:[['gravel',1],['stone',1],['javafern',1],['marimo',1],['betta',1],['snail',1],['nitri',1]]},
    stream:{n:['香港溪流缸','Hong Kong stream'],d:['15L 方缸，有氧氣泵、過濾和風扇（香港夏天熱，白雲山魚要涼水）：碎石、石頭、假山、苦草、白雲山魚、米蝦和石田螺。','15 L box tank with pump, filter and a fan (Hong Kong is warm and white cloud minnows like cool water): gravel, stones, rock mountain, vallisneria, white cloud minnows, shrimp and snails.'],
      V:15,shape:'box',sealed:false,light:10,feed:5,pump:true,filter:true,fan:true,region:'hk',items:[['gravel',1],['stone',2],['rockmtn',1],['vallis',2],['minnow',6],['shrimp',4],['snail',2],['nitri',1]]},
    jelly:{n:['桃花水母缸','Jellyfish tank'],d:['6L 圓柱瓶，不開泵和過濾：4 隻桃花水母和少量金魚藻。','6 L cylinder with no pump or filter: 4 freshwater jellyfish and some hornwort.'],
      V:6,shape:'cyl',sealed:false,light:10,feed:1,items:[['sand',1],['hornwort',1],['jelly',4],['nitri',1]]},
    medaka:{n:['青鱂魚露台缸','Medaka balcony bowl'],d:['20L 開口金魚缸放在露台：浮萍、金魚藻、青鱂魚、水蚤和石田螺，跟京都天氣。','20 L open bowl outdoors in Kyoto weather: duckweed, hornwort, medaka, daphnia and snails.'],
      V:20,shape:'bowl',sealed:false,light:12,feed:3,region:'kyoto',items:[['sand',1],['stone',1],['duckweed',2],['hornwort',2],['medaka',6],['daphnia',1],['snail',2],['nitri',1]]},
    lotus:{n:['陶缸荷花魚','Ceramic lotus pond'],d:['30L 開口陶缸放在室外：泥土、細沙、2 棵荷花、浮萍、青鱂魚和石田螺，不用泵。','30 L open ceramic basin outdoors: soil, sand, 2 lotus, duckweed, medaka and pond snails; no pump.'],
      V:30,shape:'basin',mat:'ceramic',sealed:false,light:12,feed:4.5,region:'hk',items:[['soil',1,{depth:5}],['sand',1,{depth:1.5}],['lotus',2],['duckweed',1],['stone',1],['medaka',6],['snail',3],['nitri',1]]},
    bad:{n:['失衡示範','Unbalanced demo'],d:['3L 密封金魚缸，5 條孔雀魚只有一撮莫絲，沒有硝化菌。','3 L sealed fishbowl: 5 guppies, one clump of moss and no bacteria.'],V:3,shape:'bowl',sealed:true,light:12,feed:2,items:[['moss',1],['guppy',5]]},
    zero:{n:['由零開始','Start from scratch'],d:['一個未注水的空瓶，由鋪沙、擺石頭開始自己打造。','An empty, dry jar. Lay sand and stones, then add water.'],V:4,shape:'jar',sealed:false,light:12,feed:0,filled:false,items:[]}
  },
  rain:{
    palu:{n:['水陸共生缸','Paludarium'],d:['20L 方缸，水區有氧氣泵和過濾：後面是泥土坡和植物，前面是水區，有青鱂魚、米蝦和水草，陸地有箭毒蛙。','20 L box tank with an air pump and filter in the water: a soil slope with plants and dart frogs at the back, and a water area at the front with medaka, shrimp and water plants.'],
      V:20,shape:'box',sealed:false,light:12,feed:5.5,mist:2,level:8,hillH:10,filter:true,pump:true,
      items:[['soil',1,{depth:4}],['driftwood',1,{x:-.3,z:-.45}],['stone',1,{x:.45,z:.5}],['fern',1],['pothos',1],['cmoss',1],['hornwort',2],['vallis',1],['javafern',1],['medaka',4],['shrimp',4],['frog',2],['isopod',1],['springtail',1],['soilmic',1],['nitri',1]]},
    forest:{n:['雨林生態瓶','Rainforest jar'],d:['6L 密封圓柱瓶：泥土、沉木、苔蘚、腎蕨、網紋草、鳳梨、箭毒蛙和清道夫。','6 L sealed cylinder with soil, driftwood, moss, fern, fittonia, bromeliad, a dart frog and cleanup crew.'],
      V:6,shape:'cyl',sealed:true,light:12,feed:1,mist:1,level:0,hillH:6,items:[['soil',1],['driftwood',1],['cmoss',1],['fern',1],['fittonia',1],['bromeliad',1],['frog',1],['isopod',1],['springtail',1],['soilmic',1]]},
    turtle:{n:['龜池雨林','Turtle paludarium'],d:['20L 開口方缸：泥土坡、大水區、黃金葛同一隻麝香龜，有加熱燈和過濾。','20 L open box tank with a soil slope, big water area, pothos and a musk turtle; heat lamp and filter.'],
      V:20,shape:'box',sealed:false,light:12,feed:2,heat:true,filter:true,level:8,hillH:10,items:[['soil',1],['stone',1,{x:-.5,z:-.3}],['pothos',1],['fern',2],['hornwort',2],['turtle',1],['isopod',1],['soilmic',1],['nitri',1]]},
    gecko:{n:['守宮攀爬缸','Gecko climbing tank'],d:['12L 開口圓柱瓶：泥土、沉木、假橋、黃金葛、睫角守宮和清道夫。','12 L open cylinder with soil, driftwood, a bridge, pothos, a crested gecko and cleanup crew.'],
      V:12,shape:'cyl',sealed:false,light:12,feed:1.5,mist:0,level:0,hillH:6,items:[['soil',1],['driftwood',1],['bridge',1],['pothos',2],['fern',1],['gecko',1],['isopod',1],['springtail',1],['soilmic',1]]},
    moss:{n:['苔蘚微景觀瓶','Moss terrarium'],d:['3L 密封梅森罐：泥土、石頭、苔蘚、網紋草和跳蟲，不用餵。','3 L sealed mason jar with soil, stones, moss, fittonia and springtails. No feeding.'],
      V:3,shape:'jar',sealed:true,light:10,feed:0,mist:0,level:0,hillH:4,items:[['soil',1],['stone',1],['cmoss',3],['fittonia',1],['springtail',1],['soilmic',1]]},
    amazon:{n:['亞馬遜水陸缸','Amazon paludarium'],d:['30L 方缸跟亞馬遜天氣：泥土坡、鳳梨、腎蕨、黃金葛、箭毒蛙，水區有孔雀魚和清道夫魚。','30 L box tank in Amazon weather: soil slope, bromeliads, fern, pothos and dart frogs, with guppies and a pleco in the water.'],
      V:30,shape:'box',sealed:false,light:12,feed:7,mist:2,level:8,hillH:10,filter:true,pump:true,region:'amazon',
      items:[['soil',1],['driftwood',1,{x:-.3,z:-.4}],['bromeliad',2],['fern',1],['pothos',1],['vallis',2],['hornwort',1],['frog',2],['guppy',5],['pleco',1],['isopod',1],['springtail',1],['soilmic',1],['nitri',1]]},
    newt:{n:['蠑螈溪邊缸','Newt streamside'],d:['15L 方缸跟京都天氣：石頭、苔蘚、黑木蕨、東方蠑螈和青鱂魚。','15 L box tank in Kyoto weather: stones, moss, Java fern, fire-belly newts and medaka.'],
      V:15,shape:'box',sealed:false,light:10,feed:3,mist:2,level:7,hillH:9,region:'kyoto',items:[['soil',1],['stone',2,{x:.4,z:.45}],['cmoss',1],['javafern',1],['hornwort',1],['newt',2],['medaka',3],['soilmic',1],['nitri',1]]},
    desert:{n:['豹紋守宮沙漠缸','Leopard gecko desert'],d:['20L 方缸跟撒哈拉天氣：細沙、碎石、石頭、假山同一隻豹紋守宮；沙漠夠熱不用加熱燈，反而要開風扇，免得中午太熱。','20 L box tank in Sahara weather: sand, gravel, stones, rock mountain and a leopard gecko; the desert is warm enough without a heat lamp, and a fan keeps midday from getting too hot.'],
      V:20,shape:'box',sealed:false,light:12,feed:1,mist:0,fan:true,level:0,hillH:0,region:'sahara',items:[['gravel',1],['sand',1],['stone',2],['rockmtn',1],['leopard',1]]},
    zero:{n:['由零開始','Start from scratch'],d:['一個空瓶，由鋪泥土、擺沉木、決定水位開始自己打造。','An empty jar. Lay soil, place driftwood and choose a water level.'],V:12,shape:'box',sealed:false,light:12,feed:0,level:0,hillH:8,items:[]}
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

/* 攻擊（唔食，但會咬傷）同捕食 */
const ATTACKS={betta:{guppy:.03,betta:.05,medaka:.015},crab:{guppy:.02,medaka:.02,minnow:.02,newt:.02},guppy:{jelly:.02},medaka:{jelly:.02},minnow:{jelly:.02},pleco:{},hermit:{nerite:.015},slider:{newt:.04}};
const PREYS={turtle:['shrimp','amano','snail','nerite','daphnia','guppy','medaka'],newt:['daphnia','shrimp']};
Object.entries(ATTACKS).forEach(([k,v])=>{if(Object.keys(v).length)CAT[k].attacks=v;});
Object.entries(PREYS).forEach(([k,v])=>{CAT[k].preys=[...new Set([...(CAT[k].preys||[]),...v])];});
