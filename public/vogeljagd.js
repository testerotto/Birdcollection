/* ============================================================================
   VOGELJAGD – Spiel-Overlay für BirdNET Live (real-time-pwa Fork)
   ----------------------------------------------------------------------------
   Hängt sich an die schon funktionierende BirdNET-Erkennung der PWA und macht
   daraus ein Sammelspiel mit Rangliste, XP und Abzeichen.
   Erkennungen werden auf zwei Wegen abgegriffen:
     1) HOOK (präzise):   window.Vogeljagd.report("Amsel", 87)
        -> EINE Zeile im Detektions-Code der PWA, siehe README.
     2) AUTO (kein Edit): beobachtet das DOM nach neuen "Name … 87%"-Einträgen.
   Wenn AUTO nicht sofort greift: im Spiel "⚙ → Erkennung kalibrieren" tippen.
   ============================================================================ */
(function(){
'use strict';

/* ---------- KONFIG (bei Bedarf anpassen) ---------- */
const CFG = {
  AUTO_CAPTURE: true,          // DOM automatisch beobachten
  MIN_CONF: 15,                // Mindest-% zum Sammeln (passend zur App-Schwelle)
  COOLDOWN_MS: 3600000,        // gleiche Art erst nach 1 STUNDE wieder zählbar (übersteht Neuladen)
  // CSS-Selektor des Detektions-Containers (leer = ganzes Dokument beobachten).
  DETECTION_CONTAINER: ''
};

/* ---------- ARTEN (Mitteleuropa: dt. Name, sci, en, emoji, rarity 1-5) ---------- */
const SPECIES = [
 ["Amsel","Turdus merula","Eurasian Blackbird","🐦‍⬛",1],["Kohlmeise","Parus major","Great Tit","🐤",1],
 ["Blaumeise","Cyanistes caeruleus","Eurasian Blue Tit","🐤",1],["Buchfink","Fringilla coelebs","Common Chaffinch","🐦",1],
 ["Haussperling","Passer domesticus","House Sparrow","🐦",1],["Rotkehlchen","Erithacus rubecula","European Robin","🐦",1],
 ["Star","Sturnus vulgaris","European Starling","🐦",1],["Ringeltaube","Columba palumbus","Common Wood-Pigeon","🕊️",1],
 ["Elster","Pica pica","Eurasian Magpie","🐦‍⬛",1],["Rabenkrähe","Corvus corone","Carrion Crow","🐦‍⬛",1],
 ["Zaunkönig","Troglodytes troglodytes","Eurasian Wren","🐤",2],["Zilpzalp","Phylloscopus collybita","Common Chiffchaff","🐤",2],
 ["Mönchsgrasmücke","Sylvia atricapilla","Eurasian Blackcap","🐦",2],["Singdrossel","Turdus philomelos","Song Thrush","🐦",2],
 ["Grünfink","Chloris chloris","European Greenfinch","🐤",2],["Stieglitz","Carduelis carduelis","European Goldfinch","🐤",2],
 ["Heckenbraunelle","Prunella modularis","Dunnock","🐦",2],["Bachstelze","Motacilla alba","White Wagtail","🐦",2],
 ["Kleiber","Sitta europaea","Eurasian Nuthatch","🐤",2],["Buntspecht","Dendrocopos major","Great Spotted Woodpecker","🐦",2],
 ["Eichelhäher","Garrulus glandarius","Eurasian Jay","🐦",2],["Mauersegler","Apus apus","Common Swift","🐦",2],
 ["Rauchschwalbe","Hirundo rustica","Barn Swallow","🐦",2],["Hausrotschwanz","Phoenicurus ochruros","Black Redstart","🐦",2],
 ["Feldsperling","Passer montanus","Eurasian Tree Sparrow","🐦",2],["Stockente","Anas platyrhynchos","Mallard","🦆",2],
 ["Girlitz","Serinus serinus","European Serin","🐤",3],["Gartenrotschwanz","Phoenicurus phoenicurus","Common Redstart","🐦",3],
 ["Fitis","Phylloscopus trochilus","Willow Warbler","🐤",3],["Gartengrasmücke","Sylvia borin","Garden Warbler","🐦",3],
 ["Sumpfmeise","Poecile palustris","Marsh Tit","🐤",3],["Tannenmeise","Periparus ater","Coal Tit","🐤",3],
 ["Schwanzmeise","Aegithalos caudatus","Long-tailed Tit","🐤",3],["Goldammer","Emberiza citrinella","Yellowhammer","🐤",3],
 ["Feldlerche","Alauda arvensis","Eurasian Skylark","🐦",3],["Grünspecht","Picus viridis","European Green Woodpecker","🐦",3],
 ["Kuckuck","Cuculus canorus","Common Cuckoo","🐦",3],["Turmfalke","Falco tinnunculus","Eurasian Kestrel","🦅",3],
 ["Mäusebussard","Buteo buteo","Common Buzzard","🦅",3],["Graureiher","Ardea cinerea","Gray Heron","🐦",3],
 ["Gimpel","Pyrrhula pyrrhula","Eurasian Bullfinch","🐤",3],["Wacholderdrossel","Turdus pilaris","Fieldfare","🐦",3],
 ["Misteldrossel","Turdus viscivorus","Mistle Thrush","🐦",3],["Sommergoldhähnchen","Regulus ignicapilla","Common Firecrest","🐤",3],
 ["Wintergoldhähnchen","Regulus regulus","Goldcrest","🐤",3],["Grauschnäpper","Muscicapa striata","Spotted Flycatcher","🐦",3],
 ["Dorngrasmücke","Curruca communis","Greater Whitethroat","🐦",3],["Klappergrasmücke","Curruca curruca","Lesser Whitethroat","🐦",3],
 ["Teichrohrsänger","Acrocephalus scirpaceus","Eurasian Reed Warbler","🐦",4],["Nachtigall","Luscinia megarhynchos","Common Nightingale","🐦",4],
 ["Pirol","Oriolus oriolus","Eurasian Golden Oriole","🐦",4],["Kernbeißer","Coccothraustes coccothraustes","Hawfinch","🐤",4],
 ["Waldkauz","Strix aluco","Tawny Owl","🦉",4],["Schwarzspecht","Dryocopus martius","Black Woodpecker","🐦",4],
 ["Eisvogel","Alcedo atthis","Common Kingfisher","🐦",4],["Trauerschnäpper","Ficedula hypoleuca","European Pied Flycatcher","🐦",4],
 ["Baumpieper","Anthus trivialis","Tree Pipit","🐦",4],["Rotmilan","Milvus milvus","Red Kite","🦅",4],
 ["Kranich","Grus grus","Common Crane","🐦",4],["Weißstorch","Ciconia ciconia","White Stork","🐦",4],
 ["Waldohreule","Asio otus","Long-eared Owl","🦉",5],["Wendehals","Jynx torquilla","Eurasian Wryneck","🐦",5],
 ["Wiedehopf","Upupa epops","Eurasian Hoopoe","🐦",5]
];
const RAR_NAMES=["","sehr häufig","häufig","gelegentlich","selten","sehr selten"];
const RAR_PTS=[0,10,16,28,48,80];
const RAR_COL=['','#9fb3a8','#6fb6a0','#f2a65a','#d98ad9','#e7c878'];

// Suche Art per dt./engl./sci-Name (locker, case-insensitiv)
function findSpecies(name){
  const q=name.trim().toLowerCase();
  return SPECIES.find(s=>s[0].toLowerCase()===q||s[1].toLowerCase()===q||s[2].toLowerCase()===q)
      || SPECIES.find(s=>s[0].toLowerCase().includes(q)||s[2].toLowerCase().includes(q));
}
// Schlüssel je Art = sci wenn bekannt, sonst der erkannte Name
function keyFor(name){ const s=findSpecies(name); return s?s[1]:name.trim(); }
function infoFor(name){
  const s=findSpecies(name);
  if(s)return {key:s[1],de:s[0],sci:s[1],emoji:s[3],rar:s[4]};
  return {key:name.trim(),de:name.trim(),sci:name.trim(),emoji:'🐦',rar:2};
}

/* ---------- ZUSTAND ---------- */
const KEY='vogeljagd_overlay_v1';
const LEVELS=[[0,"Küken"],[50,"Nestling"],[150,"Frischling"],[350,"Beobachter"],[700,"Späher"],
 [1200,"Kenner"],[2000,"Ornithologe"],[3200,"Falkner"],[5000,"Adlerauge"],[8000,"Vogelkönig"]];
const BADGES=[["frueh","🌅","Frühaufsteher"],["nacht","🦉","Nachtschwärmer"],["arten10","🔟","10 Arten"],
 ["arten25","🎯","25 Arten"],["specht","🪵","Spechtfreund"],["selten","💎","Seltener Fund"],
 ["serie7","🔥","7-Tage-Serie"],["hundert","💯","100 Fänge"]];

function fresh(){return {name:"Spieler",avatar:"🐦",xp:0,catches:[],species:{},streak:0,lastDay:null,
  friends:[],badges:[],seenIntro:false};}
let S=load();
function load(){try{const r=localStorage.getItem(KEY);if(r)return Object.assign(fresh(),JSON.parse(r));}catch(e){}return fresh();}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}

const todayStr=()=>new Date().toISOString().slice(0,10);
function levelInfo(){let i=0;for(let k=0;k<LEVELS.length;k++)if(S.xp>=LEVELS[k][0])i=k;
  const next=LEVELS[i+1];return {num:i+1,name:LEVELS[i][1],min:LEVELS[i][0],nextMin:next?next[0]:LEVELS[i][0],
  nextName:next?next[1]:"Max",max:!next};}

/* ---------- FANG REGISTRIEREN ---------- */
function registerCatch(inf,conf){
  const k=inf.key;
  const isNew=!S.species[k];
  let pts=RAR_PTS[inf.rar]; if(isNew)pts*=3;
  const t=todayStr();
  if(S.lastDay!==t){ if(S.lastDay){const d=(new Date(t)-new Date(S.lastDay))/86400000;S.streak=d===1?S.streak+1:1;}else S.streak=1; S.lastDay=t; }
  if(!S.species[k])S.species[k]={count:0,first:Date.now(),best:0,de:inf.de,emoji:inf.emoji,rar:inf.rar,sci:inf.sci};
  S.species[k].count++; S.species[k].best=Math.max(S.species[k].best,conf); S.species[k].last=Date.now();
  S.catches.unshift({k,t:Date.now(),conf}); if(S.catches.length>800)S.catches.length=800;
  S.xp+=pts; checkBadges(); save();
  return {inf,isNew,pts,conf,k};
}
function checkBadges(){
  const have=new Set(S.badges),h=new Date().getHours(),n=Object.keys(S.species).length;
  const add=id=>{if(!have.has(id)){S.badges.push(id);have.add(id);toast('🏅 Abzeichen: '+BADGES.find(b=>b[0]===id)[2]);}};
  if(h<7)add('frueh'); if(h>=21)add('nacht'); if(n>=10)add('arten10'); if(n>=25)add('arten25');
  if(Object.values(S.species).some(s=>/Woodpecker|specht/i.test(s.sci+s.de)))add('specht');
  if(Object.values(S.species).some(s=>s.rar>=4))add('selten');
  if(S.streak>=7)add('serie7'); if(S.catches.length>=100)add('hundert');
}

/* ---------- DETEKTION: AUFLÖSEN / FILTERN / EXTRAHIEREN ---------- */
function resolveSpecies(common, sci){
  let s = sci && findSpecies(sci);
  if(!s && common) s = findSpecies(common);
  if(s) return {key:s[1], de:s[0], sci:s[1], emoji:s[3], rar:s[4]};
  const key = sci || common;
  return {key, de:(common||sci), sci:(sci||''), emoji:'🐦', rar:2};
}
function isNoise(t){
  return /keine detekt|no detection|detections will|tippe auf|tap '?start|modell bereit|nehme auf|inferenz|wahrschein|standortfilter|geolocation|geolokal|use geo|filters? species|filtert|sensitiv|empfindlich|schwelle|threshold|interval|mic gain|rumble|high-?pass|hochpass|spektrogramm|spectrogram|colormap|viridis|magma|inferno|plasma|turbo|cubehelix|frequenz|frequency|amplitude|duration|grid|app language|label language|sprache|^settings|einstellung|coordinates|koordinaten|awaiting|close|schließen/i.test(t);
}
function extractDetection(text){
  text = (text||'').replace(/\s+/g,' ').trim();
  if(!text || text.length>160) return null;
  if(isNoise(text)) return null;
  const sciM = text.match(/\b([A-ZÀ-Þ][a-zà-ÿ]+)\s+([a-zà-ÿ]{3,})\b/);
  if(!sciM) return null;
  const sci = sciM[1]+' '+sciM[2];
  const before = text.slice(0, sciM.index);
  const pm = before.match(/(\d{1,3})(?:[.,]\d+)?\s*%/);
  if(!pm) return null;
  const conf = parseInt(pm[1],10);
  let common = before.slice(0, before.indexOf(pm[0])).replace(/[•·:|]/g,' ').replace(/\s+/g,' ').trim();
  if(!common || common.length<2) common = sci;
  return {common, sci, conf};
}

/* ---------- LIVE-TREFFER + COOLDOWN-STATUS ---------- */
let liveList=[]; // [{key,de,sci,emoji,conf,t}]
function cdStatus(key){
  const sp=S.species[key]; if(!sp||!sp.last) return {caught:false};
  const rem=CFG.COOLDOWN_MS-(Date.now()-sp.last);
  return rem>0 ? {caught:true, min:Math.max(1,Math.ceil(rem/60000))} : {caught:false};
}
function handleDetection(d){
  if(!d) return;
  const conf=Math.round(d.conf); if(isNaN(conf)||conf<CFG.MIN_CONF) return;
  const inf=resolveSpecies(d.common,d.sci);
  const now=Date.now();
  const cd=cdStatus(inf.key);
  liveList=liveList.filter(x=>x.key!==inf.key);
  liveList.unshift({key:inf.key,de:inf.de,sci:inf.sci,emoji:inf.emoji,conf,t:now});
  if(liveList.length>8)liveList.length=8;
  if(!cd.caught){
    const res=registerCatch(inf,conf);
    updateHeader();
    if(res.isNew) celebrate(res); else toast('🎙️ '+inf.de+' · +'+res.pts+' XP');
  }
  if(curTab==='jagen') renderContent();
}
function onDetection(name,conf,sci){ handleDetection({common:name,sci:sci||'',conf}); }
window.Vogeljagd={ report:onDetection, reportDetection:handleDetection, extract:extractDetection, state:()=>S, version:'2.0' };

function purgeBogus(){
  let changed=false;
  Object.keys(S.species).forEach(k=>{ const sp=S.species[k];
    if(isNoise(k)||isNoise((sp&&sp.de)||'')){ delete S.species[k]; changed=true; } });
  if(changed){
    S.catches=S.catches.filter(c=>S.species[c.k]);
    const chron=[...S.catches].sort((a,b)=>a.t-b.t); const seen=new Set(); let xp=0;
    chron.forEach(c=>{ const r=(S.species[c.k]&&S.species[c.k].rar)||2; let p=RAR_PTS[r]; if(!seen.has(c.k)){p*=3;seen.add(c.k);} xp+=p; });
    S.xp=xp; save();
  }
}

/* ---------- DOM-BEOBACHTER (liest BirdNETs echte Trefferkarten) ---------- */
let calibrate=false;
function startObserver(){
  const seen=new Set();
  const handle=node=>{
    if(!node||node.nodeType!==1)return;
    if(node.closest && node.closest('#vj-app'))return;   // eigene UI ignorieren!
    const d=extractDetection(node.textContent||'');
    if(!d)return;
    const sig=d.sci+'|'+d.conf;
    if(seen.has(sig))return; seen.add(sig); setTimeout(()=>seen.delete(sig),4000);
    if(calibrate) toast('Kalibrierung: "'+d.common+'" ('+d.sci+', '+d.conf+'%)');
    handleDetection(d);
  };
  new MutationObserver(muts=>muts.forEach(m=>{
    m.addedNodes&&m.addedNodes.forEach(n=>{ if(n.nodeType===1){handle(n); n.querySelectorAll&&n.querySelectorAll('*').forEach(handle);} });
    if(m.type==='characterData')handle(m.target.parentElement);
  })).observe(document.body,{childList:true,subtree:true,characterData:true});
}

/* ---------- BIRDNET FERNSTEUERN: Canvas spiegeln + Start-Knopf klicken ---------- */
const DPR=Math.min(window.devicePixelRatio||1,2);
let srcCanvas=null;
function birdnetCanvas(){
  if(srcCanvas&&document.body.contains(srcCanvas))return srcCanvas;
  const cs=[...document.querySelectorAll('canvas')].filter(c=>!(c.closest&&c.closest('#vj-app')));
  cs.sort((a,b)=>(b.width*b.height)-(a.width*a.height));
  srcCanvas=cs[0]||null; return srcCanvas;
}
function birdnetButton(){
  return [...document.querySelectorAll('button,a,[role=button],input[type=button],input[type=submit]')].find(b=>{
    if(b.closest&&b.closest('#vj-app'))return false;
    const t=((b.textContent||b.value||'')+'').trim();
    return /^(start|stopp?|aufnahme|stop)\b/i.test(t)&&t.length<16;
  });
}
function birdnetListening(){ const b=birdnetButton(); return b?/stop/i.test((b.textContent||b.value||'')):false; }
function toggleBirdnet(){ const b=birdnetButton(); if(b){ b.click(); } else { toast('BirdNET lädt noch …'); } }
// Spektrogramm: den ECHTEN BirdNET-Canvas in unser Feld verschieben (zeigt 2D & WebGL korrekt)
let specTries=0;
function stashSpectrogram(){
  const stash=document.getElementById('vj-spec-stash'), content=document.getElementById('vj-content');
  if(srcCanvas && stash && content && content.contains(srcCanvas) && srcCanvas.parentElement!==stash){
    stash.appendChild(srcCanvas);
  }
}
function placeSpectrogram(){
  const host=document.getElementById('vj-spechost'); if(!host)return;
  const cv=birdnetCanvas();
  if(!cv){ if(specTries++<24) setTimeout(placeSpectrogram,500); return; }
  specTries=0;
  cv.style.width='100%'; cv.style.height='100%'; cv.style.display='block';
  cv.removeAttribute('width-hint');
  if(cv.parentElement!==host) host.appendChild(cv);
}
function syncStart(){
  const btn=document.getElementById('vj-startbtn'); if(!btn)return;
  const on=birdnetListening();
  btn.textContent = on?'■  Stopp':'▶  Start';
  btn.classList.toggle('on',on);
}

/* ---------- STYLES (Vollbild, handy-optimiert) ---------- */
const CSS=`
:root{--vbg:#0e1c18;--vbg2:#13261f;--vsurf:#17302a;--vsurf2:#1e3b33;--vline:#2a4940;--vtext:#eaf0e4;
 --vmut:#85a094;--vamber:#f2a65a;--vteal:#6fb6a0;--vgold:#e7c878;--vdng:#e07a6f}
#vj-app{position:fixed;inset:0;z-index:2147483000;background:var(--vbg);color:var(--vtext);
 font-family:'Inter',system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;overflow:hidden;
 -webkit-font-smoothing:antialiased}
#vj-app *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
#vj-app h1,#vj-app h2,#vj-app h3{font-family:'Fraunces',Georgia,serif;margin:0;font-weight:600}
.vj-head{display:flex;align-items:center;justify-content:space-between;gap:10px;
 padding:calc(env(safe-area-inset-top) + 12px) 16px 12px;border-bottom:1px solid var(--vline);background:var(--vbg2)}
.vj-brand{display:flex;align-items:center;gap:9px}
.vj-logo{width:34px;height:34px;border-radius:10px;background:linear-gradient(145deg,var(--vamber),#c9853f);
 display:grid;place-items:center;font-size:19px}
.vj-brand b{font-family:'Fraunces',serif;font-size:19px}
.vj-brand small{display:block;color:var(--vmut);font-size:10px;letter-spacing:.12em;text-transform:uppercase;margin-top:-2px}
.vj-lvl{display:flex;align-items:center;gap:7px;background:var(--vsurf);border:1px solid var(--vline);padding:6px 11px;border-radius:30px}
.vj-lvl .lv{font-family:monospace;font-weight:700;color:var(--vamber);font-size:14px}
.vj-lvl .nm{font-size:12px;color:var(--vmut)}
#vj-content{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px 16px 24px}
.vj-bottomnav{display:flex;background:var(--vbg2);border-top:1px solid var(--vline);
 padding:8px 8px calc(env(safe-area-inset-bottom) + 12px)}
.vj-bottomnav button{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;
 color:#5f7a6e;padding:6px;border-radius:12px;cursor:pointer}
.vj-bottomnav button.on{color:var(--vamber)}
.vj-bottomnav .i{font-size:21px;line-height:1}.vj-bottomnav .l{font-size:10px;font-weight:600}

.vj-specwrap{position:relative;border-radius:18px;overflow:hidden;border:1px solid var(--vline);background:#0a1512;height:190px;margin-bottom:14px}
#vj-spec{width:100%;height:100%;display:block}
.vj-speclab{position:absolute;top:9px;left:11px;font-family:monospace;font-size:10px;letter-spacing:.14em;
 color:#cbe0d6;text-transform:uppercase;background:rgba(10,21,18,.55);padding:2px 7px;border-radius:6px}
.vj-start{display:block;width:100%;background:#3b82f6;color:#fff;font-weight:700;font-size:17px;border:none;
 padding:16px;border-radius:15px;cursor:pointer;margin-bottom:16px;transition:transform .12s}
.vj-start:active{transform:scale(.98)}
.vj-start.on{background:var(--vdng)}
.vj-secthd{display:flex;align-items:baseline;justify-content:space-between;margin:4px 2px 10px}
.vj-secthd h3{font-size:16px}.vj-secthd .m{color:var(--vmut);font-size:12px;font-family:monospace}

.vj-det{display:flex;align-items:center;gap:11px;background:var(--vsurf);border:1px solid var(--vline);
 border-radius:14px;padding:11px 13px;margin-bottom:9px}
.vj-det.fresh{border-color:var(--vamber);background:linear-gradient(90deg,rgba(242,166,90,.12),var(--vsurf))}
.vj-det .e{font-size:24px}
.vj-det .d{flex:1;min-width:0}
.vj-det .d b{font-size:15px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vj-det .d small{color:var(--vmut);font-size:11px;font-style:italic}
.vj-det .r{text-align:right;flex:none}
.vj-det .conf{font-family:monospace;font-weight:700;font-size:15px;color:var(--vteal)}
.vj-det .st{display:block;font-size:10px;font-weight:700;margin-top:2px}
.vj-det .st.go{color:var(--vgold)}.vj-det .st.cd{color:var(--vmut)}

.vj-stripe{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:14px}
.vj-stat{background:var(--vsurf);border:1px solid var(--vline);border-radius:13px;padding:12px;text-align:center}
.vj-stat .n{font-family:'Fraunces',serif;font-size:24px;line-height:1}
.vj-stat .l{color:var(--vmut);font-size:10px;text-transform:uppercase;letter-spacing:.08em;margin-top:5px}
.vj-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.vj-card{background:var(--vsurf);border:1px solid var(--vline);border-radius:14px;padding:12px;position:relative}
.vj-card.lock{opacity:.45;filter:grayscale(.4)}
.vj-card .e{font-size:25px}.vj-card .nm{font-family:'Fraunces',serif;font-size:15px;margin-top:4px;line-height:1.1}
.vj-card .me{display:flex;justify-content:space-between;align-items:center;margin-top:8px}
.vj-rar{font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;display:inline-flex;gap:5px;align-items:center}
.vj-rar i{width:7px;height:7px;border-radius:50%;display:inline-block}
.vj-card .cnt{font-family:monospace;font-size:12px;color:var(--vmut)}
.vj-new{position:absolute;top:8px;right:8px;background:var(--vamber);color:#241405;font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px}
.vj-lbrow{display:flex;align-items:center;gap:12px;background:var(--vsurf);border:1px solid var(--vline);border-radius:13px;padding:11px 13px;margin-bottom:9px}
.vj-lbrow.me{border-color:var(--vamber);background:linear-gradient(90deg,rgba(242,166,90,.1),var(--vsurf))}
.vj-rank{font-family:'Fraunces',serif;font-weight:700;font-size:18px;width:24px;text-align:center;color:var(--vmut)}
.vj-av{width:40px;height:40px;border-radius:11px;background:var(--vsurf2);display:grid;place-items:center;font-size:21px}
.vj-lbi{flex:1;min-width:0}.vj-lbi b{font-size:14px;display:block}.vj-lbi small{color:var(--vmut);font-size:11px}
.vj-sc{font-family:monospace;font-weight:700;color:var(--vamber);font-size:16px}
.vj-btn{display:block;width:100%;text-align:center;background:var(--vamber);color:#241405;font-weight:700;padding:14px;border:none;border-radius:13px;font-size:15px;cursor:pointer;margin-top:10px;font-family:inherit}
.vj-btn.sec{background:var(--vsurf);color:var(--vtext);border:1px solid var(--vline)}
.vj-xpbar{height:9px;background:var(--vsurf);border:1px solid var(--vline);border-radius:20px;overflow:hidden;margin:14px 0 6px}
.vj-xpbar i{display:block;height:100%;background:linear-gradient(90deg,var(--vamber),var(--vgold))}
.vj-badges{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}
.vj-bd{aspect-ratio:1;background:var(--vsurf);border:1px solid var(--vline);border-radius:13px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;text-align:center;padding:5px}
.vj-bd.lock{opacity:.3}.vj-bd .be{font-size:22px}.vj-bd .bn{font-size:9px;color:var(--vmut);line-height:1.05}
.vj-lab{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--vmut);margin:18px 0 8px;font-weight:600}
.vj-row{display:flex;justify-content:space-between;align-items:center;padding:13px 2px;border-bottom:1px solid var(--vline);font-size:14px}
.vj-row .v{color:var(--vmut);font-size:13px;font-family:monospace;background:none;border:none;cursor:pointer}
.vj-input{width:100%;background:var(--vsurf);border:1px solid var(--vline);color:var(--vtext);padding:12px;border-radius:11px;font-size:14px;outline:none;font-family:inherit;margin-bottom:8px}
.vj-codebox{background:var(--vsurf);border:1px dashed var(--vline);border-radius:11px;padding:11px;font-family:monospace;font-size:11px;word-break:break-all;color:var(--vteal);margin:8px 0}
.vj-banner{background:linear-gradient(120deg,rgba(111,182,160,.12),rgba(242,166,90,.08));border:1px solid var(--vline);border-radius:12px;padding:12px;font-size:12px;color:var(--vmut);margin-top:12px}
.vj-empty{text-align:center;color:var(--vmut);padding:34px 14px;font-size:13px}
#vj-toast{position:fixed;left:50%;bottom:96px;transform:translateX(-50%) translateY(15px);z-index:2147483600;
 background:var(--vsurf2);border:1px solid var(--vline);color:var(--vtext);padding:11px 16px;border-radius:30px;
 font-size:14px;font-family:'Inter',sans-serif;opacity:0;transition:.3s;pointer-events:none;max-width:88%;box-shadow:0 8px 24px -8px #000}
#vj-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
#vj-modal{position:fixed;inset:0;z-index:2147483500;display:none;align-items:center;justify-content:center;padding:24px}
#vj-modal.open{display:flex}
#vj-modal .sc{position:absolute;inset:0;background:rgba(0,0,0,.6)}
#vj-modal .bx{position:relative;width:100%;max-width:380px;background:var(--vbg2);border:1px solid var(--vline);border-radius:20px;padding:22px;text-align:center}
`;

/* ---------- AUFBAU ---------- */
let curTab='jagen';
function el(html){const d=document.createElement('div');d.innerHTML=html.trim();return d.firstChild;}
function build(){
  const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  const f=document.createElement('link');f.rel='stylesheet';
  f.href='https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;600;700&display=swap';
  document.head.appendChild(f);
  const app=el(`<div id="vj-app">
    <div class="vj-head">
      <div class="vj-brand"><div class="vj-logo">🪶</div><div><b>Vogeljagd</b><small id="vj-greet">Live</small></div></div>
      <div class="vj-lvl"><span class="lv" id="vj-lv">1</span><span class="nm" id="vj-lvn">Küken</span></div>
    </div>
    <div id="vj-content"></div>
    <div class="vj-bottomnav" id="vj-nav">
      <button data-t="jagen" class="on"><span class="i">🎙️</span><span class="l">Jagen</span></button>
      <button data-t="sammlung"><span class="i">📖</span><span class="l">Sammlung</span></button>
      <button data-t="rangliste"><span class="i">🏆</span><span class="l">Rangliste</span></button>
      <button data-t="profil"><span class="i">⚙️</span><span class="l">Profil</span></button>
    </div>
  </div>`);
  document.body.appendChild(app);
  document.body.appendChild(el('<div id="vj-spec-stash" style="position:absolute;left:-99999px;top:0;width:1px;height:1px;overflow:hidden"></div>'));
  document.body.appendChild(el('<div id="vj-toast"></div>'));
  document.body.appendChild(el('<div id="vj-modal"><div class="sc"></div><div class="bx" id="vj-modalbx"></div></div>'));
  document.getElementById('vj-modal').querySelector('.sc').onclick=closeModal;
  app.querySelectorAll('#vj-nav button').forEach(b=>b.onclick=()=>{curTab=b.dataset.t;
    app.querySelectorAll('#vj-nav button').forEach(x=>x.classList.toggle('on',x===b));renderContent();});
  updateHeader(); renderContent();
  setInterval(syncStart,900);
}
function toast(m){const t=document.getElementById('vj-toast');if(!t)return;t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2300);}
function openModal(html){const m=document.getElementById('vj-modal');document.getElementById('vj-modalbx').innerHTML=html;m.classList.add('open');}
function closeModal(){const m=document.getElementById('vj-modal');if(m)m.classList.remove('open');}
function updateHeader(){const li=levelInfo();const a=document.getElementById('vj-lv'),b=document.getElementById('vj-lvn');if(a)a.textContent=li.num;if(b)b.textContent=li.name;}

function rarTag(r){const c=['','#9fb3a8','#6fb6a0','#f2a65a','#d98ad9','#e7c878'][r];return `<span class="vj-rar" style="color:${c}"><i style="background:${c}"></i>${RAR_NAMES[r]}</span>`;}

function renderContent(){
  const c=document.getElementById('vj-content'); if(!c)return;
  stashSpectrogram();                 // echten Canvas vor dem Wipe in Sicherheit bringen
  if(curTab==='jagen')c.innerHTML=viewJagen();
  else if(curTab==='sammlung')c.innerHTML=viewSammlung();
  else if(curTab==='rangliste')c.innerHTML=viewRangliste();
  else c.innerHTML=viewProfil();
  wire(c); syncStart();
  if(curTab==='jagen') placeSpectrogram();   // echten Canvas ins Spektrogramm-Feld holen
}

function viewJagen(){
  const det = liveList.length ? liveList.map(it=>{
    const cd=cdStatus(it.key);
    const fresh = !cd.caught;
    const st = cd.caught
      ? `<span class="st cd">✓ schon · noch ${cd.min} Min</span>`
      : `<span class="st go">+ zählt!</span>`;
    return `<div class="vj-det ${fresh?'fresh':''}"><span class="e">${it.emoji}</span>
      <div class="d"><b>${it.de}</b><small>${it.sci||''}</small></div>
      <div class="r"><span class="conf">${it.conf}%</span>${st}</div></div>`;
  }).join('') : `<div class="vj-empty">Drück <b>Start</b> und halte das Handy Richtung Gesang – erkannte Vögel erscheinen hier.</div>`;
  return `
    <div class="vj-specwrap"><span class="vj-speclab">BirdNET · Live</span><div id="vj-spechost" style="width:100%;height:100%"></div></div>
    <button class="vj-start" id="vj-startbtn">▶  Start</button>
    <div class="vj-secthd"><h3>Live erkannt</h3><span class="m">Sperre: 1 Std/Art</span></div>
    ${det}`;
}
function viewSammlung(){
  const owned=Object.keys(S.species).length;
  let rar=0,rarN='–';Object.values(S.species).forEach(s=>{if(s.rar>rar){rar=s.rar;rarN=s.de;}});
  const extra=Object.keys(S.species).filter(k=>!SPECIES.some(s=>s[1]===k)).map(k=>{const r=S.species[k];
    return `<div class="vj-card"><div class="e">${r.emoji}</div><div class="nm">${r.de}</div>
      <div class="me">${rarTag(r.rar)}<span class="cnt">×${r.count}</span></div></div>`;}).join('');
  const cards=SPECIES.map(sp=>{const rec=S.species[sp[1]],own=!!rec;
    return `<div class="vj-card ${own?'':'lock'}">${own&&Date.now()-rec.first<60000?'<span class="vj-new">NEU</span>':''}
      <div class="e">${sp[3]}</div><div class="nm">${sp[0]}</div>
      <div class="me">${rarTag(sp[4])}<span class="cnt">${own?'×'+rec.count:'—'}</span></div></div>`;}).join('');
  return `<div class="vj-stripe">
     <div class="vj-stat"><div class="n" style="color:var(--vamber)">${owned}</div><div class="l">Arten</div></div>
     <div class="vj-stat"><div class="n" style="color:var(--vteal)">${S.catches.length}</div><div class="l">Fänge</div></div>
     <div class="vj-stat"><div class="n" style="color:var(--vgold);font-size:15px">${rarN}</div><div class="l">Seltenster</div></div>
   </div><div class="vj-grid">${extra}${cards}</div>`;
}
function viewRangliste(){
  const me={name:S.name,avatar:S.avatar,arten:Object.keys(S.species).length,faenge:S.catches.length,me:true};
  const players=[me,...S.friends].sort((a,b)=>(b.arten||0)-(a.arten||0));
  return players.map((p,i)=>`<div class="vj-lbrow ${p.me?'me':''}"><span class="vj-rank">${i+1}</span>
     <span class="vj-av">${p.avatar||'🐦'}</span>
     <div class="vj-lbi"><b>${p.me?p.name+' (du)':p.name}</b><small>${p.arten} Arten · ${p.faenge} Fänge</small></div>
     <span class="vj-sc">${p.arten}</span></div>`).join('')
   +`<button class="vj-btn sec" id="vj-share">Meinen Code teilen</button>
     <button class="vj-btn sec" id="vj-add">Freund hinzufügen</button>
     <div class="vj-banner">Code teilen, gegenseitig einfügen – Rangliste rechnet lokal, kein Server nötig.</div>`;
}
function viewProfil(){
  const li=levelInfo(),span=li.nextMin-li.min,pct=li.max?100:Math.max(3,Math.round((S.xp-li.min)/span*100));
  const have=new Set(S.badges);
  return `<div style="text-align:center;padding:6px 0">
     <button class="vj-av" id="vj-avbtn" style="width:74px;height:74px;border-radius:20px;font-size:38px;margin:0 auto 8px;border:1px solid var(--vline)">${S.avatar}</button>
     <h2>${S.name}</h2><div style="color:var(--vmut);font-size:13px">${li.name} · Level ${li.num}</div>
     <div class="vj-xpbar"><i style="width:${pct}%"></i></div>
     <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--vmut);font-family:monospace"><span>${S.xp} XP</span><span>${li.max?'Max':'→ '+li.nextName}</span></div></div>
   <div class="vj-lab">Abzeichen</div>
   <div class="vj-badges">${BADGES.map(b=>`<div class="vj-bd ${have.has(b[0])?'':'lock'}"><span class="be">${b[1]}</span><span class="bn">${b[2]}</span></div>`).join('')}</div>
   <div class="vj-lab">Einstellungen</div>
   <div class="vj-row"><span>Dein Name</span><button class="v" id="vj-name">ändern ›</button></div>
   <div class="vj-row"><span>Erkennung kalibrieren</span><button class="v" id="vj-cal">${calibrate?'läuft · stoppen':'starten ›'}</button></div>
   <button class="vj-btn sec" id="vj-export" style="margin-top:16px">Daten exportieren</button>
   <button class="vj-btn sec" id="vj-reset" style="color:var(--vdng)">Zurücksetzen</button>
   <div class="vj-banner">Erkennung: BirdNET (Cornell/TU Chemnitz). Dieselbe Art zählt erst nach 1 Stunde wieder.</div>`;
}

function wire(c){
  const q=s=>c.querySelector(s);
  if(q('#vj-startbtn'))q('#vj-startbtn').onclick=()=>{ toggleBirdnet(); setTimeout(syncStart,200); };
  if(q('#vj-share'))q('#vj-share').onclick=shareCode;
  if(q('#vj-add'))q('#vj-add').onclick=addFriend;
  if(q('#vj-name'))q('#vj-name').onclick=()=>{const n=prompt('Dein Name:',S.name);if(n){S.name=n.slice(0,20);save();renderContent();}};
  if(q('#vj-avbtn'))q('#vj-avbtn').onclick=()=>{const o=['🐦','🐤','🐦‍⬛','🦉','🦅','🦆','🕊️','🦜','🪶'];const i=o.indexOf(S.avatar);S.avatar=o[(i+1)%o.length];save();renderContent();};
  if(q('#vj-cal'))q('#vj-cal').onclick=()=>{calibrate=!calibrate;toast(calibrate?'Kalibrierung an':'Kalibrierung aus');renderContent();};
  if(q('#vj-export'))q('#vj-export').onclick=()=>{const b=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='vogeljagd-daten.json';a.click();toast('💾 Exportiert');};
  if(q('#vj-reset'))q('#vj-reset').onclick=()=>{if(confirm('Alle Spieldaten löschen?')){S=fresh();liveList=[];save();updateHeader();renderContent();toast('Zurückgesetzt');}};
}

/* ---------- FREUNDESCODES ---------- */
function myCode(){const p={n:S.name,a:S.avatar,s:Object.keys(S.species).length,f:S.catches.length,k:S.streak};return 'VJ1.'+btoa(unescape(encodeURIComponent(JSON.stringify(p))));}
function parseCode(c){try{if(!c.startsWith('VJ1.'))return null;const o=JSON.parse(decodeURIComponent(escape(atob(c.slice(4)))));return {name:o.n||'Freund',avatar:o.a||'🐦',arten:o.s||0,faenge:o.f||0,streak:o.k||0};}catch(e){return null;}}
function shareCode(){const code=myCode();
  openModal(`<h2>Dein Code</h2><p style="color:var(--vmut);font-size:13px;margin:6px 0 0">Freunden schicken – sie fügen ihn ein.</p>
    <div class="vj-codebox">${code}</div><button class="vj-btn" id="vj-cp">Kopieren</button><button class="vj-btn sec" id="vj-cl">Schließen</button>`);
  document.getElementById('vj-cp').onclick=()=>{(navigator.share?navigator.share({text:'Vogeljagd – tritt gegen mich an!\n'+code}):navigator.clipboard.writeText(code).then(()=>toast('📋 Kopiert')));};
  document.getElementById('vj-cl').onclick=closeModal;
}
function addFriend(){
  openModal(`<h2>Freund hinzufügen</h2><input class="vj-input" id="vj-fi" placeholder="VJ1.…" style="margin-top:12px">
    <button class="vj-btn" id="vj-sf">Hinzufügen</button><button class="vj-btn sec" id="vj-cl">Schließen</button>`);
  document.getElementById('vj-sf').onclick=()=>{const f=parseCode(document.getElementById('vj-fi').value.trim());
    if(!f){toast('Ungültiger Code');return;}const ix=S.friends.findIndex(x=>x.name===f.name);if(ix>=0)S.friends[ix]=f;else S.friends.push(f);
    save();toast('✅ '+f.name+' hinzugefügt');closeModal();if(curTab==='rangliste')renderContent();};
  document.getElementById('vj-cl').onclick=closeModal;
}

/* ---------- ERFOLGS-POPUP ---------- */
function celebrate(res){
  const {inf,pts,conf}=res;
  openModal(`<div style="font-size:58px">${inf.emoji}</div>
    <div class="vj-new" style="position:static;display:inline-block;margin:6px 0">Neue Art!</div>
    <h2>${inf.de}</h2><div style="color:var(--vmut);font-size:13px">${inf.sci||''}</div>
    <div style="margin:14px 0">${rarTag(inf.rar)}</div>
    <div style="font-family:monospace;color:var(--vgold);font-weight:700;font-size:16px">+${pts} XP · Erstfund!</div>
    <button class="vj-btn" id="vj-ok" style="margin-top:14px">Weiter lauschen</button>`);
  document.getElementById('vj-ok').onclick=closeModal;
  updateHeader();
}

/* ---------- INTRO ---------- */
function maybeIntro(){
  if(S.seenIntro)return; S.seenIntro=true; save();
  openModal(`<div style="font-size:50px">🪶</div><h2>Willkommen zur Vogeljagd</h2>
    <p style="color:var(--vmut);font-size:13px;margin:8px 0 14px">Drück Start, lass BirdNET lauschen – jede erkannte Art landet automatisch in deiner Sammlung. Tritt gegen Freunde an!</p>
    <button class="vj-btn" id="vj-ig">Los geht's</button>`);
  document.getElementById('vj-ig').onclick=()=>{const n=prompt('Dein Name (für die Rangliste):','');if(n){S.name=n.slice(0,20);save();updateHeader();}closeModal();};
}

/* ---------- START ---------- */
function init(){ build(); purgeBogus(); startObserver(); updateHeader(); renderContent(); setTimeout(maybeIntro,700); }
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();

})();
