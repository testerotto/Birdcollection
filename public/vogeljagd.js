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

/* ---------- DETEKTION-CAPTURE ---------- */
let lastSeen={};

// Art aus (deutscher Name, wiss. Name) auflösen – wiss. Name ist der zuverlässige Schlüssel
function resolveSpecies(common, sci){
  let s = sci && findSpecies(sci);
  if(!s && common) s = findSpecies(common);
  if(s) return {key:s[1], de:s[0], sci:s[1], emoji:s[3], rar:s[4]};
  const key = sci || common;
  return {key, de:(common||sci), sci:(sci||''), emoji:'🐦', rar:2};
}

// Texte, die KEINE Treffer sind (Status-/Einstellungs-/Hinweistexte) – hart ausschließen
function isNoise(t){
  return /keine detekt|no detection|detections will|tippe auf|tap '?start|modell bereit|nehme auf|inferenz|wahrschein|standortfilter|geolocation|geolokal|use geo|filters? species|filtert|sensitiv|empfindlich|schwelle|threshold|interval|mic gain|rumble|high-?pass|hochpass|spektrogramm|spectrogram|colormap|viridis|magma|inferno|plasma|turbo|cubehelix|frequenz|frequency|amplitude|duration|grid|app language|label language|sprache|^settings|einstellung|coordinates|koordinaten|awaiting|close|schließen/i.test(t);
}

// Aus dem Karten-Text {common, sci, conf} ziehen. Eine echte Treffer-Karte enthält
// IMMER (a) einen wissenschaftlichen Namen und (b) eine echte Prozent-Konfidenz.
function extractDetection(text){
  text = (text||'').replace(/\s+/g,' ').trim();
  if(!text || text.length>160) return null;
  if(isNoise(text)) return null;
  const sciM = text.match(/\b([A-ZÀ-Þ][a-zà-ÿ]+)\s+([a-zà-ÿ]{3,})\b/); // Genus species
  if(!sciM) return null;
  const sci = sciM[1]+' '+sciM[2];
  const before = text.slice(0, sciM.index);                 // alles vor dem wiss. Namen
  const pm = before.match(/(\d{1,3})(?:[.,]\d+)?\s*%/);     // Konfidenz MUSS vor dem wiss. Namen stehen
  if(!pm) return null;                                       // keine echte %-Zahl -> kein Treffer
  const conf = parseInt(pm[1],10);
  let common = before.slice(0, before.indexOf(pm[0]));
  common = common.replace(/[•·:|]/g,' ').replace(/\s+/g,' ').trim();
  if(!common || common.length<2) common = sci;
  return {common, sci, conf};
}

function reportDetection(d){
  if(!d) return;
  const conf = (d.conf==null||isNaN(d.conf)) ? 0 : Math.round(d.conf);
  if(conf < CFG.MIN_CONF) return;
  const inf = resolveSpecies(d.common, d.sci);
  const now = Date.now();
  // persistente Zeitsperre: letzter Fang dieser Art aus dem gespeicherten Stand
  const sp = S.species[inf.key];
  if(sp && sp.last && now - sp.last < CFG.COOLDOWN_MS) return;
  const res = registerCatch(inf, conf);
  renderAll();
  if(res.isNew) celebrate(res); else toast('🎙️ '+res.inf.de+' · +'+res.pts+' XP');
}

// Öffentlicher Hook (präzise Variante): window.Vogeljagd.report("Dohle", 98, "Corvus monedula")
function onDetection(name, conf, sci){ reportDetection({common:name, sci:sci||'', conf}); }
window.Vogeljagd = { report:onDetection, reportDetection, extract:extractDetection, state:()=>S, version:'1.1' };

// Einmaliges Aufräumen falscher Alt-Einträge (z.B. "Keine Detektionen über")
function purgeBogus(){
  let changed=false;
  Object.keys(S.species).forEach(k=>{
    const sp=S.species[k];
    if(isNoise(k) || isNoise((sp&&sp.de)||'')){ delete S.species[k]; changed=true; }
  });
  if(changed){
    S.catches = S.catches.filter(c=>S.species[c.k]);
    // XP sauber neu berechnen aus den verbliebenen Fängen
    const chron=[...S.catches].sort((a,b)=>a.t-b.t); const seen=new Set(); let xp=0;
    chron.forEach(c=>{ const r=(S.species[c.k]&&S.species[c.k].rar)||2; let p=RAR_PTS[r]; if(!seen.has(c.k)){p*=3;seen.add(c.k);} xp+=p; });
    S.xp=xp; save();
  }
}

let calibrate=false;
function startObserver(){
  if(!CFG.AUTO_CAPTURE)return;
  const root = (CFG.DETECTION_CONTAINER && document.querySelector(CFG.DETECTION_CONTAINER)) || document.body;
  const seen=new Set();
  const handle=node=>{
    if(!node || node.nodeType!==1)return;
    const d=extractDetection(node.textContent||'');
    if(!d)return;
    const sig=d.sci+'|'+d.conf;
    if(seen.has(sig))return; seen.add(sig); setTimeout(()=>seen.delete(sig),4000);
    if(calibrate) toast('Kalibrierung: "'+d.common+'" ('+d.sci+', '+d.conf+'%)');
    reportDetection(d);
  };
  const obs=new MutationObserver(muts=>{
    muts.forEach(m=>{
      m.addedNodes && m.addedNodes.forEach(n=>{ if(n.nodeType===1){ handle(n); n.querySelectorAll && n.querySelectorAll('*').forEach(handle); } });
      if(m.type==='characterData') handle(m.target.parentElement);
    });
  });
  obs.observe(root,{childList:true,subtree:true,characterData:true});
}

/* ---------- STYLES ---------- */
const CSS=`
#vj-fab{position:fixed;right:16px;bottom:84px;z-index:99998;width:58px;height:58px;border-radius:50%;
 background:radial-gradient(circle at 35% 30%,#f2a65a,#c9853f);box-shadow:0 8px 24px -6px rgba(242,166,90,.7);
 display:grid;place-items:center;font-size:26px;border:none;cursor:pointer;color:#241405}
#vj-fab .vj-badge{position:absolute;top:-4px;right:-4px;background:#17302a;color:#eaf0e4;border:1px solid #2a4940;
 font-size:11px;font-weight:700;min-width:20px;height:20px;border-radius:20px;display:grid;place-items:center;padding:0 5px;font-family:monospace}
#vj-panel{position:fixed;inset:0;z-index:99999;display:none}
#vj-panel.open{display:block}
#vj-panel .vj-scrim{position:absolute;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(3px)}
#vj-sheet{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:100%;max-width:520px;
 background:#0e1c18;color:#eaf0e4;border:1px solid #2a4940;border-radius:22px 22px 0 0;max-height:92vh;overflow-y:auto;
 padding:8px 18px calc(24px + env(safe-area-inset-bottom));font-family:'Inter',system-ui,sans-serif;
 box-shadow:0 -12px 40px -12px rgba(0,0,0,.6)}
#vj-sheet *{box-sizing:border-box}
#vj-sheet .vj-grab{width:40px;height:4px;background:#2a4940;border-radius:10px;margin:8px auto 14px}
#vj-sheet h2{font-family:'Fraunces',Georgia,serif;font-size:21px;margin:0 0 2px}
.vj-tabs{display:flex;background:#17302a;border:1px solid #2a4940;border-radius:12px;padding:4px;margin:6px 0 16px}
.vj-tabs button{flex:1;padding:9px;border:none;background:none;color:#85a094;border-radius:9px;font-weight:600;font-size:13px;cursor:pointer}
.vj-tabs button.on{background:#1e3b33;color:#eaf0e4}
.vj-stripe{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:14px}
.vj-stat{background:#17302a;border:1px solid #2a4940;border-radius:13px;padding:12px;text-align:center}
.vj-stat .n{font-family:'Fraunces',Georgia,serif;font-size:24px;line-height:1}
.vj-stat .l{color:#85a094;font-size:10px;text-transform:uppercase;letter-spacing:.08em;margin-top:5px}
.vj-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.vj-card{background:#17302a;border:1px solid #2a4940;border-radius:14px;padding:12px;position:relative}
.vj-card.lock{opacity:.45;filter:grayscale(.4)}
.vj-card .e{font-size:26px}
.vj-card .nm{font-family:'Fraunces',Georgia,serif;font-size:15px;margin-top:4px;line-height:1.1}
.vj-card .me{display:flex;justify-content:space-between;align-items:center;margin-top:8px}
.vj-rar{font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;display:inline-flex;gap:5px;align-items:center}
.vj-rar i{width:7px;height:7px;border-radius:50%;display:inline-block}
.vj-card .cnt{font-family:monospace;font-size:12px;color:#85a094}
.vj-new{position:absolute;top:8px;right:8px;background:#f2a65a;color:#241405;font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px}
.vj-btn{display:block;width:100%;text-align:center;background:#f2a65a;color:#241405;font-weight:700;padding:14px;
 border:none;border-radius:13px;font-size:15px;cursor:pointer;margin-top:10px;font-family:inherit}
.vj-btn.sec{background:#17302a;color:#eaf0e4;border:1px solid #2a4940}
.vj-row{display:flex;justify-content:space-between;align-items:center;padding:13px 2px;border-bottom:1px solid #2a4940;font-size:14px}
.vj-row .v{color:#85a094;font-size:13px;font-family:monospace;background:none;border:none;cursor:pointer}
.vj-lbrow{display:flex;align-items:center;gap:12px;background:#17302a;border:1px solid #2a4940;border-radius:13px;padding:11px 13px;margin-bottom:9px}
.vj-lbrow.me{border-color:#f2a65a;background:linear-gradient(90deg,rgba(242,166,90,.1),#17302a)}
.vj-rank{font-family:'Fraunces',Georgia,serif;font-weight:700;font-size:19px;width:26px;text-align:center;color:#85a094}
.vj-av{width:40px;height:40px;border-radius:11px;background:#1e3b33;display:grid;place-items:center;font-size:21px}
.vj-lbi{flex:1;min-width:0}.vj-lbi b{font-size:14px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vj-lbi small{color:#85a094;font-size:11px}
.vj-sc{font-family:monospace;font-weight:700;color:#f2a65a;font-size:16px}
.vj-xpbar{height:9px;background:#17302a;border:1px solid #2a4940;border-radius:20px;overflow:hidden;margin:14px 0 6px}
.vj-xpbar i{display:block;height:100%;background:linear-gradient(90deg,#f2a65a,#e7c878)}
.vj-badges{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}
.vj-bd{aspect-ratio:1;background:#17302a;border:1px solid #2a4940;border-radius:13px;display:flex;flex-direction:column;
 align-items:center;justify-content:center;gap:3px;text-align:center;padding:5px}
.vj-bd.lock{opacity:.3}.vj-bd .be{font-size:22px}.vj-bd .bn{font-size:9px;color:#85a094;line-height:1.05}
.vj-lab{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#85a094;margin:18px 0 8px;font-weight:600}
.vj-input{width:100%;background:#17302a;border:1px solid #2a4940;color:#eaf0e4;padding:12px;border-radius:11px;font-size:14px;outline:none;font-family:inherit}
.vj-code{width:100%;height:80px;background:#17302a;border:1px solid #2a4940;color:#6fb6a0;border-radius:11px;padding:11px;
 font-family:monospace;font-size:11px;word-break:break-all;resize:none;outline:none}
.vj-codebox{background:#17302a;border:1px dashed #2a4940;border-radius:11px;padding:11px;font-family:monospace;font-size:11px;
 word-break:break-all;color:#6fb6a0;margin-bottom:10px}
.vj-banner{background:linear-gradient(120deg,rgba(111,182,160,.12),rgba(242,166,90,.08));border:1px solid #2a4940;
 border-radius:12px;padding:12px;font-size:12px;color:#85a094;margin-top:12px}
#vj-toast{position:fixed;left:50%;bottom:150px;transform:translateX(-50%) translateY(15px);z-index:100000;
 background:#1e3b33;border:1px solid #2a4940;color:#eaf0e4;padding:11px 16px;border-radius:30px;font-size:14px;
 font-family:'Inter',sans-serif;opacity:0;transition:.3s;pointer-events:none;max-width:88%;box-shadow:0 8px 24px -8px #000}
#vj-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.vj-empty{text-align:center;color:#85a094;padding:30px 10px;font-size:13px}
`;

/* ---------- DOM-AUFBAU ---------- */
function el(html){const d=document.createElement('div');d.innerHTML=html.trim();return d.firstChild;}
let panel, sheet, tab='sammlung';

function build(){
  const style=document.createElement('style');style.textContent=CSS;document.head.appendChild(style);
  // Fonts (best effort)
  const f=document.createElement('link');f.rel='stylesheet';
  f.href='https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;600;700&display=swap';
  document.head.appendChild(f);

  const fab=el('<button id="vj-fab">🪶<span class="vj-badge" id="vj-fabn">0</span></button>');
  fab.onclick=openPanel; document.body.appendChild(fab);

  panel=el('<div id="vj-panel"><div class="vj-scrim"></div><div id="vj-sheet"></div></div>');
  document.body.appendChild(panel);
  sheet=panel.querySelector('#vj-sheet');
  panel.querySelector('.vj-scrim').onclick=closePanel;

  const toastEl=el('<div id="vj-toast"></div>');document.body.appendChild(toastEl);
}
function toast(msg){const t=document.getElementById('vj-toast');if(!t)return;t.textContent=msg;t.classList.add('show');
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2200);}

function openPanel(){tab='sammlung';renderPanel();panel.classList.add('open');}
function closePanel(){panel.classList.remove('open');}

function renderPanel(){
  sheet.innerHTML='<div class="vj-grab"></div>'+
    '<div class="vj-tabs">'+
      ['sammlung|Sammlung','rangliste|Rangliste','profil|Profil'].map(t=>{const[id,l]=t.split('|');
        return `<button data-t="${id}" class="${tab===id?'on':''}">${l}</button>`;}).join('')+
    '</div><div id="vj-body"></div>';
  sheet.querySelectorAll('.vj-tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;renderPanel();});
  const body=sheet.querySelector('#vj-body');
  if(tab==='sammlung')body.innerHTML=viewCollection();
  else if(tab==='rangliste')body.innerHTML=viewLeaderboard();
  else body.innerHTML=viewProfile();
  wire(body);
}

function rarTag(r){return `<span class="vj-rar" style="color:${RAR_COL[r]}"><i style="background:${RAR_COL[r]}"></i>${RAR_NAMES[r]}</span>`;}

function viewCollection(){
  const owned=Object.keys(S.species).length;
  let rar=0,rarN='–';Object.values(S.species).forEach(s=>{if(s.rar>rar){rar=s.rar;rarN=s.de;}});
  const cards=SPECIES.map(sp=>{
    const k=sp[1],rec=S.species[k],own=!!rec;
    return `<div class="vj-card ${own?'':'lock'}">${own&&Date.now()-rec.first<60000?'<span class="vj-new">NEU</span>':''}
      <div class="e">${sp[3]}</div><div class="nm">${sp[0]}</div>
      <div class="me">${rarTag(sp[4])}<span class="cnt">${own?'×'+rec.count:'—'}</span></div></div>`;
  }).join('');
  // zusätzlich gesammelte Arten außerhalb der Liste
  const extra=Object.keys(S.species).filter(k=>!SPECIES.some(s=>s[1]===k)).map(k=>{const r=S.species[k];
    return `<div class="vj-card"><div class="e">${r.emoji}</div><div class="nm">${r.de}</div>
      <div class="me">${rarTag(r.rar)}<span class="cnt">×${r.count}</span></div></div>`;}).join('');
  return `<div class="vj-stripe">
     <div class="vj-stat"><div class="n" style="color:#f2a65a">${owned}</div><div class="l">Arten</div></div>
     <div class="vj-stat"><div class="n" style="color:#6fb6a0">${S.catches.length}</div><div class="l">Fänge</div></div>
     <div class="vj-stat"><div class="n" style="color:#e7c878;font-size:15px">${rarN}</div><div class="l">Seltenster</div></div>
   </div><div class="vj-grid">${extra}${cards}</div>`;
}

function viewLeaderboard(){
  const me={name:S.name,avatar:S.avatar,arten:Object.keys(S.species).length,faenge:S.catches.length,streak:S.streak,me:true};
  const players=[me,...S.friends].sort((a,b)=>(b.arten||0)-(a.arten||0));
  return players.map((p,i)=>`<div class="vj-lbrow ${p.me?'me':''}"><span class="vj-rank">${i+1}</span>
     <span class="vj-av">${p.avatar||'🐦'}</span>
     <div class="vj-lbi"><b>${p.me?p.name+' (du)':p.name}</b><small>${p.arten} Arten · ${p.faenge} Fänge</small></div>
     <span class="vj-sc">${p.arten}</span></div>`).join('')
   +`<button class="vj-btn sec" id="vj-share">Meinen Code teilen</button>
     <button class="vj-btn sec" id="vj-add">Freund hinzufügen</button>
     <div class="vj-banner">Kein Server nötig: Code teilen, gegenseitig einfügen – die Rangliste rechnet lokal.</div>`;
}

function viewProfile(){
  const li=levelInfo(),span=li.nextMin-li.min,pct=li.max?100:Math.max(3,Math.round((S.xp-li.min)/span*100));
  const have=new Set(S.badges);
  return `<div style="text-align:center;padding:6px 0">
     <button class="vj-av" id="vj-avbtn" style="width:74px;height:74px;border-radius:20px;font-size:38px;margin:0 auto 8px;border:1px solid #2a4940">${S.avatar}</button>
     <h2>${S.name}</h2><div style="color:#85a094;font-size:13px">${li.name} · Level ${li.num}</div>
     <div class="vj-xpbar"><i style="width:${pct}%"></i></div>
     <div style="display:flex;justify-content:space-between;font-size:12px;color:#85a094;font-family:monospace">
       <span>${S.xp} XP</span><span>${li.max?'Max':'→ '+li.nextName}</span></div>
   </div>
   <div class="vj-lab">Abzeichen</div>
   <div class="vj-badges">${BADGES.map(b=>`<div class="vj-bd ${have.has(b[0])?'':'lock'}"><span class="be">${b[1]}</span><span class="bn">${b[2]}</span></div>`).join('')}</div>
   <div class="vj-lab">Einstellungen</div>
   <div class="vj-row"><span>Dein Name</span><button class="v" id="vj-name">ändern ›</button></div>
   <div class="vj-row"><span>Erkennung kalibrieren</span><button class="v" id="vj-calib">${calibrate?'läuft… stoppen':'starten ›'}</button></div>
   <div class="vj-row"><span>Auto-Erfassung</span><span class="v">${CFG.AUTO_CAPTURE?'an':'aus'}</span></div>
   <button class="vj-btn sec" id="vj-export" style="margin-top:16px">Daten exportieren</button>
   <button class="vj-btn sec" id="vj-reset" style="color:#e07a6f">Zurücksetzen</button>
   <div class="vj-banner">Tipp: Wenn neue Vögel nicht automatisch im Spiel landen, tippe „Erkennung kalibrieren", löse in der App eine Erkennung aus und schau, ob eine Meldung erscheint.</div>`;
}

function wire(body){
  const q=s=>body.querySelector(s);
  if(q('#vj-share'))q('#vj-share').onclick=shareCode;
  if(q('#vj-add'))q('#vj-add').onclick=addFriend;
  if(q('#vj-name'))q('#vj-name').onclick=()=>{const n=prompt('Dein Name:',S.name);if(n){S.name=n.slice(0,20);save();renderPanel();updateFab();}};
  if(q('#vj-avbtn'))q('#vj-avbtn').onclick=()=>{const o=['🐦','🐤','🐦‍⬛','🦉','🦅','🦆','🕊️','🦜','🪶'];
    const i=o.indexOf(S.avatar);S.avatar=o[(i+1)%o.length];save();renderPanel();updateFab();};
  if(q('#vj-calib'))q('#vj-calib').onclick=()=>{calibrate=!calibrate;toast(calibrate?'Kalibrierung an – löse eine Erkennung aus':'Kalibrierung aus');renderPanel();};
  if(q('#vj-export'))q('#vj-export').onclick=()=>{const b=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='vogeljagd-daten.json';a.click();toast('💾 Exportiert');};
  if(q('#vj-reset'))q('#vj-reset').onclick=()=>{if(confirm('Alle Spieldaten löschen?')){S=fresh();save();renderPanel();updateFab();}};
}

/* ---------- FREUNDESCODES ---------- */
function myCode(){const p={n:S.name,a:S.avatar,s:Object.keys(S.species).length,f:S.catches.length,k:S.streak};
  return 'VJ1.'+btoa(unescape(encodeURIComponent(JSON.stringify(p))));}
function parseCode(c){try{if(!c.startsWith('VJ1.'))return null;const o=JSON.parse(decodeURIComponent(escape(atob(c.slice(4)))));
  return {name:o.n||'Freund',avatar:o.a||'🐦',arten:o.s||0,faenge:o.f||0,streak:o.k||0};}catch(e){return null;}}
function shareCode(){const code=myCode();
  sheet.querySelector('#vj-body').innerHTML=`<h2>Dein Code</h2><p style="color:#85a094;font-size:13px">Schick ihn Freunden – sie fügen ihn ein.</p>
    <div class="vj-codebox">${code}</div><button class="vj-btn" id="vj-cp">Kopieren</button><button class="vj-btn sec" id="vj-bk">Zurück</button>`;
  sheet.querySelector('#vj-cp').onclick=()=>{(navigator.share?navigator.share({text:'Vogeljagd – tritt gegen mich an!\n'+code}):navigator.clipboard.writeText(code).then(()=>toast('📋 Kopiert')));};
  sheet.querySelector('#vj-bk').onclick=renderPanel;
}
function addFriend(){
  sheet.querySelector('#vj-body').innerHTML=`<h2>Freund hinzufügen</h2><p style="color:#85a094;font-size:13px">Code einfügen:</p>
    <textarea class="vj-code" id="vj-fi" placeholder="VJ1.…"></textarea><button class="vj-btn" id="vj-sf">Hinzufügen</button>
    <button class="vj-btn sec" id="vj-bk">Zurück</button>
    ${S.friends.length?'<div class="vj-lab">Freunde</div>'+S.friends.map((f,i)=>`<div class="vj-row"><span>${f.avatar} ${f.name}</span><button class="v" data-rm="${i}" style="color:#e07a6f">entfernen</button></div>`).join(''):''}`;
  sheet.querySelector('#vj-sf').onclick=()=>{const f=parseCode(sheet.querySelector('#vj-fi').value.trim());
    if(!f){toast('Ungültiger Code');return;}const ix=S.friends.findIndex(x=>x.name===f.name);
    if(ix>=0)S.friends[ix]=f;else S.friends.push(f);save();toast('✅ '+f.name+' hinzugefügt');addFriend();};
  sheet.querySelector('#vj-bk').onclick=renderPanel;
  sheet.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{S.friends.splice(+b.dataset.rm,1);save();addFriend();});
}

/* ---------- ERFOLGS-POPUP ---------- */
function celebrate(res){
  if(!panel)return;
  const {inf,pts,conf}=res;
  panel.classList.add('open');
  sheet.innerHTML=`<div class="vj-grab"></div><div style="text-align:center;padding:10px 0">
     <div style="font-size:60px">${inf.emoji}</div>
     <div class="vj-new" style="position:static;display:inline-block;margin:6px 0">Neue Art!</div>
     <h2>${inf.de}</h2><div style="color:#85a094;font-size:13px">${inf.sci}</div>
     <div style="margin:14px 0">${rarTag(inf.rar)}</div>
     <div style="font-family:monospace;color:#e7c878;font-weight:700;font-size:16px">+${pts} XP · Erstfund-Bonus!</div>
     <button class="vj-btn" id="vj-ok">Weiter lauschen</button></div>`;
  sheet.querySelector('#vj-ok').onclick=closePanel;
  updateFab();
}

function updateFab(){const n=document.getElementById('vj-fabn');if(n)n.textContent=Object.keys(S.species).length;}
function renderAll(){
  updateFab();
  // wenn das Panel offen ist und eine Tab-Ansicht zeigt, aktualisieren
  if(panel && panel.classList.contains('open') && sheet && sheet.querySelector('#vj-body')) renderPanel();
}

/* ---------- INTRO ---------- */
function maybeIntro(){
  if(S.seenIntro)return; S.seenIntro=true; save();
  panel.classList.add('open');
  sheet.innerHTML=`<div class="vj-grab"></div><div style="text-align:center;padding:8px 0">
     <div style="font-size:54px">🪶</div><h2>Willkommen zur Vogeljagd</h2>
     <p style="color:#85a094;font-size:13px;margin:8px 0 16px">Lass BirdNET lauschen – jede erkannte Art landet automatisch in deiner Sammlung. Tritt gegen Freunde an: wer hört die meisten Arten?</p></div>
     <button class="vj-btn" id="vj-go">Los geht's</button>`;
  sheet.querySelector('#vj-go').onclick=()=>{const n=prompt('Dein Name (für die Rangliste):','');if(n){S.name=n.slice(0,20);save();}closePanel();updateFab();};
}

/* ---------- START ---------- */
function init(){ build(); purgeBogus(); updateFab(); startObserver(); setTimeout(maybeIntro,800); }
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();

})();
