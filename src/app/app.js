(function(){
'use strict';
const ALL=[...RAD.map(x=>({...x,t:'rad'})),...KJ.map(x=>({...x,t:'kan'}))];
ALL.forEach(x=>{if(!x.s&&typeof STK!=='undefined'&&STK[x.g])x.s=STK[x.g].d.length;});
const M={}; ALL.forEach(it=>M[it.g]=it);
(function(){ // хокку по возрастанию сложности; новые знаки урока — те, что встретились впервые
  if(typeof ORDER==='undefined')return;
  const by={};UNITS.forEach(u=>by[u.id]=u);
  const first=UNITS.filter(u=>!u.lines), poems=ORDER.map(id=>by[id]).filter(Boolean);
  UNITS.filter(u=>u.lines&&!ORDER.includes(u.id)).forEach(u=>poems.push(u));
  const seen=new Set(first.flatMap(u=>u.items));
  poems.forEach(u=>{const it=[...new Set([...u.lines.join('')].filter(c=>M[c]&&M[c].t==='kan'&&!seen.has(c)))];
    if(it.length){it.forEach(c=>seen.add(c));u.items=it;} else u.items=u.items.filter(c=>M[c]);});
  const rest=ALL.filter(x=>x.t==='kan'&&!seen.has(x.g)).map(x=>x.g);
  if(rest.length&&poems.length) poems[poems.length-1].items.push(...rest);
  UNITS.length=0;first.concat(poems).forEach(u=>UNITS.push(u));})();
(function(){ // повторение после каждых 5 уроков
  const out=[];let batch=[],k=0;
  UNITS.forEach(u=>{out.push(u);batch.push(u);
    if(batch.length===5){k++;const src=batch;batch=[];
      out.push({id:'rev'+k,kind:'review',node:'復',title:'Повторение '+k,src:src.map(x=>x.id),
        sub:'10 знаков из '+src.map(x=>x.title).join(', '),items:[...new Set(src.flatMap(x=>x.items))]});}});
  UNITS.length=0;out.forEach(u=>UNITS.push(u));})();
UNITS.forEach((u,i)=>{u.idx=i; if(u.lines) u.jp=u.lines.join(''); if(u.kind!=='review') u.items.forEach(g=>{M[g].unit=u;});});

// ---------- state ----------
const KEY='kisti-hokku-v1';
function def(){return {srs:{},xp:0,streak:0,last:null,done:{},unlockAll:false,goal:30,today:null,todayXp:0};}
let S=def();
try{const s=JSON.parse(localStorage.getItem(KEY)||'null'); if(s) S=Object.assign(def(),s);}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
const dayStr=d=>{const x=d||new Date();return x.getFullYear()+'-'+(x.getMonth()+1)+'-'+x.getDate();};
function rollDay(){const t=dayStr(); if(S.today!==t){S.today=t;S.todayXp=0;}
  if(S.last){const y=new Date();y.setDate(y.getDate()-1); if(S.last!==t&&S.last!==dayStr(y)) S.streak=0;}}
rollDay();

// ---------- SRS (упрощённый SM-2 с короткими шагами) ----------
function grade(g,ok){const now=Date.now();const c=S.srs[g]||{ef:2.5,iv:0,n:0,l:0,due:now};
  if(ok){c.n++; c.iv=c.n===1?1:c.n===2?3:Math.round(Math.max(1,c.iv)*c.ef); c.ef=Math.min(3,c.ef+0.05);}
  else{c.l++; c.n=0; c.iv=0; c.ef=Math.max(1.3,c.ef-0.2);}
  c.due=now+(c.iv?c.iv*864e5:10*6e4); S.srs[g]=c;}
const known=g=>!!S.srs[g];
const dueList=()=>ALL.filter(it=>S.srs[it.g]&&S.srs[it.g].due<=Date.now());
const level=g=>{const c=S.srs[g]; if(!c) return 0; return Math.min(5,1+Math.floor(Math.log2(1+c.iv)));};

// ---------- helpers ----------
const $=(s,r=document)=>r.querySelector(s);
function h(tag,attrs,...kids){const e=document.createElement(tag);
  if(attrs) for(const k in attrs){const v=attrs[k]; if(v==null||v===false) continue;
    if(k==='class') e.className=v; else if(k.slice(0,2)==='on') e.addEventListener(k.slice(2),v);
    else if(k==='html') e.innerHTML=v; else e.setAttribute(k,v===true?'':v);}
  for(const k of kids.flat(9)){ if(k==null||k===false) continue; e.append(k.nodeType?k:document.createTextNode(String(k)));}
  return e;}
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const rnd=a=>a[Math.floor(Math.random()*a.length)];
const mask=(t,g)=>t.split(g).join('◯');
const isUnlocked=u=>S.unlockAll||u.idx===0||!!S.done[u.id]||!!S.done[UNITS[u.idx-1].id];
const ico={
  flame:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5c.6 2.3 3.8 3.9 3.8 7.7A3.8 3.8 0 0 1 8 13a3.8 3.8 0 0 1-3.8-3.8c0-1.6.8-2.6 1.6-3.4.1 1.2.7 2 1.4 2.3C6.7 6 7.3 3.7 8 1.5z" fill="var(--shu)"/></svg>',
  brush:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11.5 1.5l3 3-6 6-3-3z" fill="var(--ai)"/><path d="M4.5 8.5l3 3c-.5 2-2.5 3-5.5 3 .3-2.5 1-4.5 2.5-6z" fill="var(--ink)"/></svg>',
  lock:'<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="5" width="8" height="6" rx="1.5" fill="var(--ink2)"/><path d="M4 5V3.5a2 2 0 0 1 4 0V5" stroke="var(--ink2)" stroke-width="1.4" fill="none"/></svg>'
};
function speak(text){try{const u=new SpeechSynthesisUtterance(text);u.lang='ja-JP';u.rate=.8;speechSynthesis.cancel();speechSynthesis.speak(u);}catch(e){}}

// ---------- чёрная тема и картина дня ----------
document.documentElement.dataset.theme='dark';
const BGKEY=(()=>{const keys=Object.keys(SUMI.BG);let last=null;try{last=localStorage.getItem('kh-bg');}catch(e){}
  const pool=keys.filter(k=>k!==last);const k=pool[Math.floor(Math.random()*pool.length)];try{localStorage.setItem('kh-bg',k);}catch(e){}return k;})();
function paintBg(){const cv=document.getElementById('bgart');if(!cv)return;const d=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(innerWidth*d);cv.height=Math.round(innerHeight*d);SUMI.renderBg(cv,BGKEY,.2);}
function decorate(){const v=$('#view');if(!v)return;v.querySelectorAll('.scrollart').forEach(e=>e.remove());
  if(tab==='path'){const path=v.querySelector('.path');if(!path)return;
    const W=path.clientWidth,H=path.scrollHeight;const k=Math.min(2,window.devicePixelRatio||1,Math.sqrt(1.2e7/(W*H)));
    const cv=h('canvas',{class:'scrollart pathart','aria-hidden':'true'});cv.width=Math.round(W*k);cv.height=Math.round(H*k);cv.style.width=W+'px';cv.style.height=H+'px';
    path.prepend(cv);const pr=path.getBoundingClientRect();
    const pts=[...path.querySelectorAll('.node')].map(n=>{const r=n.getBoundingClientRect();return [(r.left+r.width/2-pr.left)/W,(r.top+r.height/2-pr.top)/H];});
    if(pts.length>1) SUMI.renderPath(cv,BGKEY,pts,.26);
  } else {const H=v.scrollHeight,th=Math.round(innerHeight*1.1),n=Math.min(14,Math.ceil(H/th));
    const wrap=h('div',{class:'scrollart','aria-hidden':'true',style:'height:'+H+'px'});v.prepend(wrap);
    const io='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting&&!e.target.dataset.done){e.target.dataset.done=1;SUMI.renderBg(e.target,BGKEY,.17);io.unobserve(e.target);}}),{root:v,rootMargin:'400px'}):null;
    for(let i=0;i<n;i++){const k=Math.min(1.5,window.devicePixelRatio||1);const c=h('canvas',{style:`top:${i*th}px;height:${th}px;`+(i%2?'transform:scaleX(-1)':'')});
      c.width=Math.round(v.clientWidth*k);c.height=Math.round(th*k);wrap.append(c);if(io)io.observe(c);else SUMI.renderBg(c,BGKEY,.17);}}
}
let decoT=null;addEventListener('resize',()=>{clearTimeout(decoT);decoT=setTimeout(decorate,250);});
// ---------- tabs ----------
let tab='path';
['path','poems','kigo','kanji'].forEach(t=>$('#tab-'+t).addEventListener('click',()=>{tab=t;render();}));
function render(){
  ['path','poems','kigo','kanji'].forEach(t=>$('#tab-'+t).setAttribute('aria-selected',String(t===tab)));
  const v=$('#view'); v.innerHTML=''; v.scrollTop=0;
  v.append(topBar());
  if(tab==='path') v.append(viewPath()); else if(tab==='poems') v.append(viewPoems()); else if(tab==='kigo') v.append(viewKigo()); else v.append(viewKanji());
  fixExpl(v);
  requestAnimationFrame(()=>requestAnimationFrame(decorate));
}
function topBar(){
  return h('div',{class:'top'},
    h('div',{class:'brand'},h('b',{class:'hk',lang:'ja'},'発句'),h('span',null,'хокку · кисть и тушь')),
    h('span',{class:'chip',title:'Дней подряд',html:ico.flame+' '+S.streak}),
    h('span',{class:'chip',title:'Очки опыта',html:ico.brush+' '+S.xp}));
}

// ---------- path ----------
function ring(p){const r=18,c=2*Math.PI*r;
  return h('div',{html:`<svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true"><circle cx="23" cy="23" r="${r}" fill="none" stroke="var(--sunk)" stroke-width="6"/><circle cx="23" cy="23" r="${r}" fill="none" stroke="var(--shu)" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c*(1-Math.min(1,p))}" transform="rotate(-90 23 23)"/></svg>`});}
function viewPath(){
  const f=document.createDocumentFragment();
  const due=dueList();
  f.append(h('div',{class:'goal'},ring(S.todayXp/S.goal),
    h('div',{class:'t'},h('b',null,'Цель дня: ',S.todayXp,' / ',S.goal,' очков'),
      h('small',null, due.length? 'К повторению: '+due.length+' '+plural(due.length,'знак','знака','знаков') : (Object.keys(S.srs).length?'Повторять пока нечего — учите новое':'Начните с ключей: из них собраны все знаки'))),
    due.length? h('button',{class:'btn primary',onclick:startReview},'Повторить'):null));
  const p=h('div',{class:'path'});
  const offs=[0,40,60,40,0,-40,-60,-40];
  let curFound=false;
  UNITS.forEach((u,i)=>{
    const open=isUnlocked(u), done=!!S.done[u.id];
    const cur=open&&!done&&!curFound; if(cur) curFound=true;
    const node=h('button',{class:'node '+(u.kind==='review'?'rev ':'')+(cur?'cur':done?'done':open?'open':''),'aria-label':(u.author?u.author+': ':'')+u.title+(open?'':' — закрыто'),onclick:()=>openUnit(u)},
      u.node, cur?h('span',{class:'cur-ring'}):null,
      done?h('span',{class:'seal'},u.node):null,
      !open?h('span',{class:'lock',html:ico.lock}):null);
    if(i) p.append(h('div',{class:'dash gap'}));
    p.append(h('div',{class:'ustep',style:`transform:translateX(${offs[i%8]}px)`},node,
      h('div',{class:'ulabel'},h('b',null,u.author?u.author+' · '+u.title:u.title), u.lines?h('span',{class:'jp'},hlJ(u,'j','',0)):(u.kind==='review'?'10 знаков из 5 уроков':u.sub))));
  });
  f.append(p);
  let armed=false;
  const reset=h('button',{class:'btn ghost',onclick:e=>{ if(!armed){armed=true;e.target.textContent='Точно стереть всё? Нажмите ещё раз';return;} S=def();save();render();}},'Сбросить прогресс');
  const bgd=SUMI.BG[BGKEY];f.append(h('p',{class:'daily'},h('b',{lang:'ja'},bgd.jp),'Картина дня — '+bgd.ru+'. При каждом запуске новая.'));
  f.append(h('div',{class:'settings'},
    h('button',{class:'btn ghost',onclick:()=>{S.unlockAll=!S.unlockAll;save();render();}},S.unlockAll?'Вернуть порядок уроков':'Открыть все уроки'),
    h('button',{class:'btn ghost',onclick:openBackup},'Резервная копия'),
    reset));
  const sc=window.__scr||{};f.append(h('p',{class:'scrdiag'},'Экран '+screen.width+'×'+screen.height+' · окно '+innerWidth+'×'+innerHeight+(sc.sa?' · приложение, высота '+sc.h:' · браузер')));
  return f;
}
function openBackup(){
  const code=JSON.stringify(S);
  const out=h('textarea',{id:'bk-out',class:'bk',readonly:true,rows:4},code);
  const inp=h('textarea',{id:'bk-in',class:'bk',rows:4,placeholder:'Вставьте сюда сохранённый код'});
  const st=h('p',{class:'tinfo',role:'status'});
  const copy=h('button',{class:'btn primary',onclick:async()=>{try{await navigator.clipboard.writeText(code);st.textContent='Код скопирован. Сохраните его в Заметках.';}catch(e){out.focus();out.select();st.textContent='Выделено: скопируйте вручную.';}}},'Скопировать код');
  const restore=h('button',{class:'btn ghost',onclick:()=>{try{const v=JSON.parse(inp.value.trim());if(!v||typeof v!=='object'||!v.srs)throw 0;S=Object.assign(def(),v);save();closeSheet();render();}
    catch(e){st.textContent='Код не распознан. Скопируйте его целиком, от { до }.';}}},'Восстановить');
  sheet(h('div',null,h('h2',{style:'margin:2px 0 8px'},'Резервная копия'),
    h('p',{class:'tinfo',style:'text-align:left'},'Прогресс хранится только на этом устройстве. Скопируйте код и сохраните его, например в Заметках. Чтобы перенести прогресс, вставьте код ниже.'),
    out,h('div',{class:'row',style:'margin:8px 0 16px'},copy),inp,h('div',{class:'row',style:'margin-top:8px'},restore),st));
}
function plural(n,a,b,c){n=Math.abs(n)%100;const n1=n%10;if(n>10&&n<20)return c;if(n1>1&&n1<5)return b;if(n1===1)return a;return c;}

function openUnit(u){
  const open=isUnlocked(u);
  const body=h('div');
  const rev=u.kind==='review';
  body.append(SUMI.el(rev?'rad':u.id,u.node,'hero'),h('div',{class:'tag'},rev?'Повторение':u.author?(u.author+' · '+u.year):'Основы'), h('h2',{style:'margin:2px 0 12px'},u.title));
  if(rev) body.append(h('p',{class:'how',style:'margin-top:0'},'10 случайных знаков из пяти прошлых уроков: '+u.src.map(id=>UNITS.find(x=>x.id===id).title).join(', ')+'. Каждый раз набор новый. Выбор из 4 и рисование по названию, пять сердец.'));
  else if(u.lines) body.append(poemCard(u,false));
  else body.append(h('p',{class:'how',style:'margin-top:0'},'Ключи — повторяющиеся части знаков. Именно их каллиграф сокращает в первую очередь: они предсказуемы, и глаз узнаёт их по силуэту. Сохранять нужно то, что отличает знак от соседей.'));
  body.append(h('div',{class:'sec-h'},rev?'Знаки этих уроков':'Знаки урока'));
  body.append(h('div',{class:'kgrid'},u.items.map(g=>ktile(M[g]))));
  body.append(open? h('button',{class:'btn primary big',onclick:()=>{closeSheet();startLesson(u);}},rev?(S.done[u.id]?'Повторить ещё раз':'Начать повторение'):S.done[u.id]?'Пройти ещё раз':'Начать урок')
    : h('p',{class:'empty'},'Урок откроется после предыдущего. Или нажмите «Открыть все уроки» внизу пути.'));
  sheet(body);
}

// ---------- цветовая разметка хокку ----------
const HLC={k:'hk-k','1':'hk-1',c:'hk-c','2':'hk-2'};
function hlSegLines(u,f){const H=typeof HL!=='undefined'&&HL[u.id];const src=f==='j'?u.lines:u.kana;
  if(!H)return src.map(l=>[{s:l,c:''}]);const L=hlLines(H[f]);return L.length===src.length?L:src.map(l=>[{s:l,c:''}]);}
function hlJ(u,f,sep,only){const L=hlSegLines(u,f||'j');const out=[];
  L.forEach((segs,i)=>{if(only!=null&&i!==only)return;if(out.length&&sep)out.push(sep);segs.forEach(s=>out.push(s.c?h('span',{class:HLC[s.c]},s.s):s.s));});return out;}
function hlS(u,f){const H=typeof HL!=='undefined'&&HL[u.id];const plain=f==='t'?u.tr:u.cyr;if(!H)return [plain];
  return hlParse(H[f]).map(s=>h('span',{class:HLC[s.c]},s.s));}
const hlLegend=()=>h('div',{class:'hlleg'},h('span',{class:'hk-k'},'■ сезонное слово'),h('span',{class:'hk-1'},'■ первый образ'),h('span',{class:'hk-c'},'■ разрыв'),h('span',{class:'hk-2'},'■ второй образ'));

// ---------- poems ----------
function openBio(name){const b=BIO[name];if(!b)return;
  const poems=UNITS.filter(u=>u.author===name);
  const cv=document.createElement('canvas');cv.width=720;cv.height=300;cv.className='sumi biohero';
  try{SUMI.render(cv,poems[0]?poems[0].id:'rad',b.seal);}catch(e){}
  sheet(h('div',{class:'bio'},cv,
    h('div',{class:'biohead'},h('div',{class:'bioname'},h('b',{lang:'ja'},b.jp),h('span',null,b.read+' · '+b.years))),
    h('p',{class:'biolead'},b.lead),
    b.parts.map(([t,x])=>h('div',{class:'biopart'+(/самура|ниндзя/i.test(t)?' hl':'')},h('h4',null,t),h('p',null,x))),
    poems.length?h('div',null,h('div',{class:'sec-h'},'Его хокку в приложении — '+poems.length),h('div',{class:'biopoems'},poems.map(u=>h('button',{class:'bp',onclick:()=>{closeSheet();openUnit(u);}},h('span',{lang:'ja'},hlJ(u,'j','',0)),h('small',null,u.title))))):null));}
function fixExpl(root){(root||document).querySelectorAll('.poem .pm > .expl').forEach(e=>e.closest('.poem').append(e));}
function explBlock(id){const e=EXPL[id];const rows=[['s','Сезон'],['k','Разрез'],['c','Где и когда'],['n','Что было неожиданным'],['m','О чём молчит'],['z','Звук'],['v','Попробуйте увидеть']];
  return h('details',{class:'expl'},h('summary',null,'Пояснение: что видит японец'),
    h('div',{class:'exb'},rows.filter(([k])=>e[k]).map(([k,t])=>h('div',{class:'exr'+(k==='v'?' see':'')},h('b',{class:k==='s'?'hk-k':k==='k'?'hk-c':null},t),h('p',null,e[k])))));}
function poemCard(u,withBtn){
  const tate=h('div',{class:'tate',lang:'ja'});
  hlSegLines(u,'j').forEach((segs,li,L)=>{
    segs.forEach(sg=>{const wrap=sg.c?h('span',{class:HLC[sg.c]}):tate;
      [...sg.s].forEach(ch=>{ if(M[ch]&&M[ch].t==='kan') wrap.append(h('button',{class:'kb',onclick:()=>openKanji(ch),'aria-label':'Знак '+ch+': '+M[ch].m},ch)); else wrap.append(ch);});
      if(wrap!==tate)tate.append(wrap);});
    if(li<L.length-1) tate.append(h('br'));
  });
  return h('div',{class:'poem'},withBtn?SUMI.el(u.id,u.node,'span'):null,h('div',{class:'pleft'},tate,hlLegend(),
      h('div',{class:'pbtns'},
        h('button',{class:'btn ghost',onclick:()=>speak(u.kana.join('、'))},'Слушать'),
        BIO[u.author]?h('button',{class:'btn ghost',onclick:()=>openBio(u.author)},'Об авторе'):null,
        withBtn&&isUnlocked(u)?h('button',{class:'btn primary',onclick:()=>startLesson(u)},S.done[u.id]?'Повторить':'Урок'):null)),
    h('div',{class:'pm'},
      h('div',{class:'who'},u.author,' ',h('small',null,u.year)),
      h('div',{class:'kana',lang:'ja'},hlJ(u,'k',' / ')),
      h('div',{class:'cyr'},hlS(u,'c')),
      h('div',{class:'tr'},hlS(u,'t')),
      h('div',{class:'imgs'},u.items.filter(g=>PIC[g]).map(g=>h('button',{class:'imgchip',onclick:()=>openKanji(g),'aria-label':g+': '+M[g].m},picImg(g),h('span',{lang:'ja'},g)))),
      h('div',{class:'note'},u.note),
      EXPL[u.id]?explBlock(u.id):null));
}
function viewPoems(){
  const f=document.createDocumentFragment();
  f.append(h('p',{class:'how'},'Хокку записаны вертикально, как в оригинале: читаются сверху вниз, столбцы справа налево. Подчёркнутые знаки можно нажать. Переводы — дословные, чтобы видеть, какой иероглиф что значит.'));
  UNITS.filter(u=>u.lines).forEach(u=>f.append(poemCard(u,true)));
  return f;
}

// ---------- kigo ----------
const MON=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const koStart=(d,y)=>new Date(y,d[0]-1,d[1]);
function koRange(i){const a=KO[i].d,b=KO[(i+1)%72].d,y=2026;const end=new Date(koStart(b,y)-864e5);
  return a[0]===end.getMonth()+1?a[1]+'–'+end.getDate()+' '+MON[a[0]-1]:a[1]+' '+MON[a[0]-1]+' – '+end.getDate()+' '+MON[end.getMonth()];}
function koNow(){const t=new Date();t.setHours(0,0,0,0);let best=71,bd=-1;
  KO.forEach((k,i)=>{let s=koStart(k.d,t.getFullYear());if(s>t)s=koStart(k.d,t.getFullYear()-1);if(s>bd){bd=s;best=i;}});return best;}
const seaOf=id=>KIGO_SEASONS.find(x=>x.id===id);
let kigoSeason=null;
let kigoDay=new Date().toDateString();
function kigoDayCheck(){const d=new Date().toDateString();if(d!==kigoDay){kigoDay=d;if(tab==='kigo'&&!document.querySelector('.scrim,.lesson'))render();}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)kigoDayCheck();});
addEventListener('focus',kigoDayCheck);setInterval(kigoDayCheck,60000);
function kigoWord(k){return h('span',{class:'kw',lang:'ja'},[...k].map(ch=>M[ch]&&M[ch].t==='kan'?h('button',{class:'kb',onclick:e=>{e.stopPropagation();openKanji(ch);},'aria-label':'Знак '+ch},ch):ch));}
function segSpans(segs){return segs.map(s=>s.c?h('span',{class:HLC[s.c]},s.s):s.s);}
function openKOH(e){const tate=h('div',{class:'tate',lang:'ja'});
  hlLines(e.hj).forEach((segs,li,L)=>{segs.forEach(sg=>{const wrap=sg.c?h('span',{class:HLC[sg.c]}):tate;
      [...sg.s].forEach(ch=>{if(M[ch]&&M[ch].t==='kan')wrap.append(h('button',{class:'kb',onclick:()=>{closeSheet();openKanji(ch);},'aria-label':'Знак '+ch+': '+M[ch].m},ch));else wrap.append(ch);});
      if(wrap!==tate)tate.append(wrap);});if(li<L.length-1)tate.append(h('br'));});
  const k=KO[e.ko-1];
  sheet(h('div',null,h('div',{class:'tag'},'Микросезон '+e.ko+' · '+k.k+' · '+k.ru),
    h('div',{class:'poem'},h('div',{class:'pleft'},tate,hlLegend(),h('div',{class:'pbtns'},
        h('button',{class:'btn ghost',onclick:()=>speak(e.k.join('、'))},'Слушать'),
        BIO[e.a]?h('button',{class:'btn ghost',onclick:()=>openBio(e.a)},'Об авторе'):null)),
      h('div',{class:'pm'},h('div',{class:'who'},e.a,' ',h('small',null,e.y||'')),
        h('div',{class:'kana',lang:'ja'},hlLines(e.hk).map((l,i)=>[i?' / ':'',...segSpans(l)])),
        h('div',{class:'cyr'},segSpans(hlParse(e.hc))),
        h('div',{class:'tr'},segSpans(hlParse(e.ht))),
        e.note?h('div',{class:'note'},e.note):null))));}
function koQuotes(n){const out=[];
  if(typeof KOH!=='undefined')KOH.filter(e=>e.ko===n).forEach(e=>out.push(h('button',{class:'koq',onclick:()=>openKOH(e)},
    h('small',null,h('b',{lang:'ja'},e.w),' · '+e.a),h('span',{lang:'ja'},hlLines(e.hj).map(segs=>h('i',null,segSpans(segs)))))));
  KIGO.filter(k=>KIGO_KO[k.k]===n).forEach(k=>k.u.forEach(id=>{const u=UNITS.find(x=>x.id===id);if(!u)return;
    const key=[...k.k].filter(c=>c>'一'||/[ぁ-ん]/.test(c));const ov={w18:'花の香は撞く',basho14:'すみれ草',w7:'軒の栗',w5:'植ゑて立ち去る'};const ln=u.lines.find(l=>ov[id]&&l.includes(ov[id]))||u.lines.find(l=>l.includes(k.k))||u.lines.find(l=>key.some(c=>c>'一'&&l.includes(c)))||u.lines[0];
    out.push(h('button',{class:'koq',onclick:()=>openUnit(u)},h('small',null,h('b',{lang:'ja'},k.k),' '+k.ru+' · '+u.author),h('span',{lang:'ja'},hlSegLines(u,'j').map(segs=>h('i',null,segs.map(s=>s.c?h('span',{class:HLC[s.c]},s.s):s.s))))));}));
  return out.length?h('div',{class:'koqs'},out):null;}
function koRow(i,cur){const k=KO[i];
  return h('div',{class:'ko'+(cur?' now':''),id:'ko'+k.n},
    h('span',{class:'kon'},k.n),
    h('div',{class:'kob'},h('div',{class:'kok'},kigoWord(k.k),cur?h('em',null,'сейчас'):null),
      h('div',{class:'kor',lang:'ja'},k.r),h('div',{class:'koro'},k.ro),h('b',null,k.ru),h('small',null,koRange(i)),
      h('div',{class:'kow'},h('span',null,'киго: '),h('span',{lang:'ja'},k.w.split(' ')[0]),' '+k.w.split(' ').slice(1).join(' ')),koQuotes(k.n)),
    h('button',{class:'kspk','aria-label':'Слушать','onclick':()=>speak(k.r)},'♪'));}
function viewKigo(){
  const f=document.createDocumentFragment();const now=koNow(),nk=KO[now],nsk=SEKKI[nk.sk];
  if(!kigoSeason)kigoSeason='all';
  f.append(h('div',{class:'how'},h('b',{lang:'ja'},'季語 '),h('b',null,'Киго — сезонные слова. '),
    'Японский год делится не на 4 части, а мельче: 4 сезона → 24 «сэкки» (節気, по 15 дней) → 72 «ко» (候, микросезоны по 5 дней). У каждого ко есть имя-картинка: «прилетают ласточки», «гнилая трава становится светлячками». Почти в каждом имени спрятано киго — слово, которое поэт ставит в хокку, чтобы читатель сразу понял время года. Под микросезонами — строки из хокку с их сезонными словами; нажмите, чтобы открыть стих. Счёт идёт по старому календарю, поэтому весна начинается 4 февраля, а осень — 8 августа.'));
  const ns=seaOf(nsk.s);
  f.append(h('button',{class:'konow',style:`--sc:${ns.col}`,onclick:()=>{render();setTimeout(()=>{const el=document.getElementById('ko'+nk.n);el&&el.scrollIntoView({block:'center',behavior:'smooth'});},60);}},
    h('small',null,'Сейчас · '+ns.ru.toLowerCase()+' · '+nsk.k+' «'+nsk.ru+'» · ко '+nk.n+' из 72'),
    h('b',{lang:'ja'},nk.k),h('span',{lang:'ja',class:'kor'},nk.r),h('span',{class:'koro'},nk.ro),h('span',null,nk.ru+' · '+koRange(now)),
    h('small',null,'Дальше: '+KO[(now+1)%72].ru.toLowerCase()+' ('+KO[(now+1)%72].k+')')));
  f.append(h('div',{class:'kgf',role:'tablist','aria-label':'Сезон'},
    [{id:'all',jp:'四季',ru:'Все'}].concat(KIGO_SEASONS).map(s=>h('button',{class:'kgc'+(kigoSeason===s.id?' on':''),style:s.col?`--sc:${s.col}`:'','aria-selected':String(kigoSeason===s.id),
      onclick:()=>{kigoSeason=s.id;render();}},h('span',{lang:'ja'},s.jp),s.ru))));
  // список идёт по кругу от текущего микросезона: сегодняшний ко первым
  let curSea=null,curSk=null,box=null;
  for(let j=0;j<72;j++){const i=(now+j)%72,k=KO[i],sk=SEKKI[k.sk],s=seaOf(sk.s);
    if(kigoSeason!=='all'&&kigoSeason!==s.id)continue;
    if(s.id!==curSea){curSea=s.id;curSk=null;
      f.append(h('div',{class:'kgs',style:`--sc:${s.col}`},h('b',{lang:'ja'},s.jp),h('div',null,h('h3',null,s.ru+(j===0?' · сейчас':'')),h('small',{class:'kgsm'},'6 сэкки · 18 микросезонов'),h('p',null,s.note))));}
    if(k.sk!==curSk){curSk=k.sk;box=h('div',{class:'sekki',style:`--sc:${s.col}`});
      box.append(h('div',{class:'skh'},h('b',{lang:'ja'},sk.k),h('div',null,h('span',{lang:'ja'},sk.r),h('strong',null,sk.ru),h('small',null,'с '+sk.d[1]+' '+MON[sk.d[0]-1]+' · сэкки '+(k.sk+1)+' из 24'))));
      f.append(box);}
    box.append(koRow(i,i===now));}
  return f;
}
// ---------- kanji ----------
function ktile(it){
  const lv=level(it.g);
  return h('button',{class:'ktile'+(known(it.g)?'':' new'),onclick:()=>openKanji(it.g),'aria-label':it.g+': '+it.m},
    PIC[it.g]?h('span',{class:'tpic'},picImg(it.g)):null,h('span',{class:'g'},it.g),h('span',{class:'m'},it.m),
    h('span',{class:'meter','aria-hidden':'true'},[1,2,3,4,5].map(i=>h('i',{class:i<=lv?'on':''}))));
}
function viewKanji(){
  const f=document.createDocumentFragment();
  f.append(h('div',{class:'how'},
    h('b',null,'Как читать заметки каллиграфа. '),
    'Каждый знак проходит путь от кайсё (уставное письмо) к гёсё (полускоропись) и сосё (скоропись). ',
    h('b',{style:'color:var(--ai)'},'Сокращается'),' то, что повторяется и предсказуемо: ключи, точки, внутренние черты. ',
    h('b',{style:'color:var(--shu)'},'Не трогают'),' то, что отличает знак от похожего: число черт внутри рамки, длину горизонталей, точку, выход вертикали.'));
  UNITS.filter(u=>u.kind!=='review').forEach(u=>{
    f.append(h('div',{class:'sec-h'},u.author?u.author+' · '+u.title:u.title));
    f.append(h('div',{class:'kgrid'},u.items.map(g=>ktile(M[g]))));
  });
  f.append(h('p',{class:'tinfo'},'Этимологии — по «Шовэнь цзецзы» и словарям Сиракавы Сидзуки; для ряда знаков есть конкурирующие версии. Порядок и форма черт — ',h('a',{href:'https://kanjivg.tagaini.net/',target:'_blank',rel:'noopener'},'KanjiVG'),' © Ulrich Apel, лицензия CC BY-SA 3.0. Почерки — шрифты Yuji Syuku, Ma Shan Zheng, Long Cang, Zhi Mang Xing, Liu Jian Mao Cao (SIL OFL). Иллюстрации — ',h('a',{href:'https://github.com/jdecked/twemoji',target:'_blank',rel:'noopener'},'Twemoji'),', лицензия CC BY 4.0.'));
  return f;
}
function kanjiCard(it,isLearn){
  const rd=[];
  if(it.on) rd.push(h('div',{class:'rd'},'он: ',h('span',{class:'jp'},it.on),' (',it.onr,')'));
  if(it.kun) rd.push(h('div',{class:'rd'},it.t==='rad'?'название: ':'кун: ',h('span',{class:'jp'},it.kun),it.kunr?' ('+it.kunr+')':''));
  const pl=orderPlayer(it.g); const cv=calViz(it);
  const c=h('div',{class:'kcard'},
    h('div',{class:'khead'},pl.node,
      h('div',{class:'kmeta'},PIC[it.g]?h('div',{class:'kpic'},picImg(it.g)):null,h('span',{class:'tag'},(it.t==='rad'?'ключ · ':'')+it.s+' '+plural(it.s,'черта','черты','черт')),h('h3',null,it.m),rd,
        h('div',null,h('button',{class:'btn ghost',style:'padding:6px 10px;font-size:13px;margin-top:4px',onclick:()=>speak((it.kun||it.on).split(/[・(（ —]/)[0])},'Произнести')))),
    h('div',{class:'blk'},h('span',{class:'tag'},'Почему он такой'),h('p',null,it.et)),
    calRow(it),
    it.parts?h('div',{class:'parts'},it.parts.map((p,i)=>[i?h('span',{class:'plus'},'+'):null,h('span',{class:'pchip'},p)]),h('span',{class:'plus'},'='),h('span',{class:'pchip'},it.g)):null,
    h('div',{class:'cal'},
      h('div',{class:'blk s'},h('span',{class:'tag'},'Можно сокращать'),cv?cv.sim:null,h('p',null,it.sim)),
      h('div',{class:'blk k'},h('span',{class:'tag'},'Нельзя трогать'),cv?cv.keep:null,h('p',null,it.keep)))
  );
  if(!isLearn&&it.unit&&it.unit.lines) c.append(h('div',{class:'rd'},'Из урока: ',it.unit.author,' — ',h('span',{class:'jp'},hlJ(it.unit,'j',' '))));
  return c;
}
function openKanji(g){
  const it=M[g];
  sheet(h('div',null,kanjiCard(it,false),
    h('div',{class:'row',style:'margin-top:14px'},h('button',{class:'btn primary',onclick:()=>{closeSheet();runSession([{t:'trace',it,free:true}],{free:true});}},'Прописать кистью'))));
}

// ---------- sheet ----------
let sheetEl=null;
function sheet(content){closeSheet();
  sheetEl=h('div',{class:'scrim',onclick:e=>{if(e.target===sheetEl)closeSheet();}},
    h('div',{class:'sheet',role:'dialog','aria-modal':'true'},h('div',{class:'grab'}),h('button',{class:'icon-btn x','aria-label':'Закрыть',onclick:closeSheet},'✕'),content));
  document.body.append(sheetEl); fixExpl(sheetEl); $('.x',sheetEl).focus();}
function closeSheet(){if(sheetEl){sheetEl.remove();sheetEl=null;}}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sheetEl)closeSheet();});

// ---------- lesson building ----------
function sameKind(it){return ALL.filter(x=>x.t===it.t&&x.g!==it.g);}
function glyphChoices(it,extra){const out=[it.g],seen=new Set(out);
  const add=g=>{if(out.length<4&&g&&!seen.has(g)){seen.add(g);out.push(g);}};
  shuffle(it.conf||[]).slice(0,2).forEach(add);
  shuffle(extra||[]).forEach(add);
  const u=it.unit?it.unit.items:[]; shuffle(u).forEach(add);
  shuffle(sameKind(it).map(x=>x.g)).forEach(add);
  return shuffle(out);}
const CAL=[{id:'kai',jp:'楷書',ru:'кайсё',d:'уставное',f:'"KHKai","KHKaiB",serif',cn:false},
 {id:'gyo',jp:'行書',ru:'гёсё',d:'полускоропись',f:'"KHGyo",serif',cn:true},
 {id:'gs',jp:'行草',ru:'гёсо',d:'переходное',f:'"KHGs",serif',cn:true},
 {id:'so',jp:'草書',ru:'сосё',d:'скоропись',f:'"KHSo",serif',cn:true}];
function calRow(it){
  const v=CALVAR[it.g];
  const none=v==='';
  const row=h('div',{class:'cal4'},CAL.map(c=>{const ch=c.cn&&v?v:it.g; const empty=c.cn&&none;
    return h('div',{class:'c4'},empty?h('div',{class:'c4g c4none'},'—'):h('div',{class:'c4g',lang:c.cn?'zh':'ja',style:'font-family:'+c.f},ch),
      h('div',{class:'c4l'},h('b',{lang:'ja'},c.jp),' ',c.ru),h('div',{class:'c4d'},c.d));}));
  return h('div',{class:'blk'},h('span',{class:'tag'},'Четыре почерка: от устава к скорописи'),row,
    h('p',{class:'c4n'},none?'Этого знака нет в китайских образцах скорописи: он придуман в Японии или пишется только здесь. Посмотрите уставную форму и порядок черт.':v?(CALREL.includes(it.g)?('В шрифтах скорописи нет японской формы этого знака, поэтому показана родственная форма '+v+'. Смотрите на общий ход кисти, а не на детали.'):('В трёх скорописных образцах — форма '+v+': так этот знак пишут скорописью, отсюда и современная китайская форма. Сравните, какие черты исчезли, а какие остались.'))
      :'Сравните слева направо: какие черты сливаются и исчезают, а какие остаются до самого сосё.'));
}
function exSosho(it,onReady){
  const head=[h('div',{class:'q'},'Какой знак написан скорописью?'),
    h('div',{class:'qsosho',lang:'zh',style:'font-family:"KHSo",serif'},it.g),h('div',{class:'sub'},'草書 сосё · подсказка: ',it.m)];
  return mc(it,head,glyphChoices(it),it.g,true,onReady);
}
const picImg=(g,cls)=>PIC[g]?h('img',{src:PIC[g],alt:'',class:cls||'pic','aria-hidden':'true',draggable:'false'}):null;
const shortM=m=>m.split(/[;(]/)[0].trim();
function itemChoices(it){const out=[it],seen=new Set([it.m]);
  const pool=[...shuffle((it.unit?it.unit.items:[]).map(g=>M[g])),...shuffle(sameKind(it))];
  for(const x of pool){if(out.length>=4)break; if(x.g!==it.g&&!seen.has(x.m)&&PIC[x.g]){seen.add(x.m);out.push(x);}}
  return shuffle(out);}
function picMC(it,head,onReady){
  const items=itemChoices(it); let sel=null; const btns=[];
  const grid=h('div',{class:'opts g4 pgrid'});
  items.forEach((x,i)=>{const b=h('button',{class:'opt pcard','aria-pressed':'false','aria-label':x.m,onclick:()=>{
      if(b.disabled)return; btns.forEach(y=>y.setAttribute('aria-pressed','false')); b.setAttribute('aria-pressed','true'); sel=x.g; onReady();}},
      h('span',{class:'pimg'},picImg(x.g)),h('span',{class:'pccap'},shortM(x.m))); btns.push(b); grid.append(b);});
  return {node:h('div',null,head,grid),ready:()=>sel!=null,check:()=>{
    btns.forEach((b,i)=>{b.disabled=true; if(items[i].g===it.g) b.classList.add('right'); else if(items[i].g===sel) b.classList.add('wrong');});
    return {ok:sel===it.g,right:it.m};}};
}
function meaningChoices(it){const out=[it.m],seen=new Set(out);
  const pool=[...shuffle((it.unit?it.unit.items:[]).map(g=>M[g])),...shuffle(sameKind(it))];
  for(const x of pool){if(out.length>=4)break; if(x.g!==it.g&&!seen.has(x.m)){seen.add(x.m);out.push(x.m);}}
  return shuffle(out);}
function testBlock(its){
  const mcs=shuffle(its.map(it=>({t:rnd(['mcm','mcg']),it}))), dr=shuffle(its.map(it=>({t:'draw',it})));
  const n=its.length;
  for(let i=0;i<n;i++) if(n>1&&dr[i].it===mcs[i].it){const k=(i+1)%n;[dr[i],dr[k]]=[dr[k],dr[i]];}
  const q=[];for(let i=0;i<n;i++){q.push(mcs[i]);q.push(dr[i]);}return q;}
function startLesson(u){
  if(u.kind==='review'){const its=shuffle(u.items.map(g=>M[g])).slice(0,10);
    return runSession([{t:'phase',kind:'test',u,n:its.length,review:true,rev:true},...testBlock(its)],{unit:u});}
  const its=u.items.map(g=>M[g]); const q=[];
  const fresh=its.some(it=>!known(it.g));
  q.push({t:'phase',kind:'learn',u,n:its.length,skip:!fresh});
  its.forEach((it,i)=>{q.push({t:'learn',it,i:i+1,n:its.length});q.push({t:'trace',it,mode:'guide'});q.push({t:'trace',it,mode:'blank'});});
  q.push({t:'phase',kind:'test',u,n:its.length});
  q.push(...testBlock(its));
  runSession(q,{unit:u});
}
function startReview(){
  const due=shuffle(dueList()).slice(0,8);
  const items=due.length?due:shuffle(ALL.filter(x=>known(x.g))).slice(0,6);
  if(!items.length) return;
  runSession([{t:'phase',kind:'test',n:items.length,review:true},...testBlock(items)],{review:true});
}

// ---------- session runner ----------
let keyHandler=null;
function runSession(queue,meta){
  closeSheet();
  const L={q:[...queue],done:0,res:{},right:0,wrong:0,combo:0,best:0,hearts:5,testing:false,dead:false,testSnap:null,learnSnap:null};
  const fill=h('i'), combo=h('span',{class:'combo'});
  const HEART='<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21C5 15.5 1 11.8 1 7.2 1 3.8 3.6 1.2 6.9 1.2c2.1 0 3.9 1 5.1 2.7 1.2-1.7 3-2.7 5.1-2.7 3.3 0 5.9 2.6 5.9 6 0 4.6-4 8.3-11 13.8z"/></svg>';
  const hearts=h('div',{class:'hearts',role:'status','aria-label':'Сердца'},[0,1,2,3,4].map(()=>h('span',{class:'ht',html:HEART+'<i class="fl"></i>'})));
  function drawHearts(){hearts.hidden=!L.testing;[...hearts.children].forEach((e,i)=>{e.classList.toggle('gone',i>=L.hearts);e.classList.remove('burn');});hearts.setAttribute('aria-label','Сердец: '+L.hearts);}
  function loseHeart(){if(!L.testing||L.hearts<=0)return;L.hearts--;const e=hearts.children[L.hearts];e.classList.add('burn');setTimeout(()=>{e.classList.add('gone');},750);hearts.setAttribute('aria-label','Сердец: '+L.hearts);if(L.hearts<=0)L.dead=true;}
  const body=h('div',{class:'lbody'}), foot=h('div',{class:'lfoot'});
  const root=h('div',{class:'lesson',role:'dialog','aria-modal':'true','aria-label':'Урок'},
    h('div',{class:'lwrap'},
      h('div',{class:'lbar'},h('button',{class:'icon-btn','aria-label':'Выйти из урока',onclick:exit},'✕'),h('div',{class:'prog'},fill),combo,hearts),
      body,foot));
  document.body.append(root);
  keyHandler=e=>{
    if(e.key==='Escape'){exit();return;}
    if(/^[1-6]$/.test(e.key)){const o=body.querySelectorAll('.opt');const b=o[+e.key-1]; if(b&&!b.disabled) b.click();}
    if(e.key==='Enter'){const b=foot.querySelector('.btn.main'); if(b&&!b.disabled){e.preventDefault();b.click();}}
  };
  document.addEventListener('keydown',keyHandler);
  function exit(){document.removeEventListener('keydown',keyHandler);root.remove();render();}
  function upd(){fill.style.width=(100*L.done/(L.done+L.q.length))+'%'; combo.textContent=L.combo>=3?L.combo+' подряд':'';}
  function next(){upd(); if(L.dead) return failScreen(); if(!L.q.length) return finish(); show(L.q.shift());}
  function restart(fromLearn){L.q=[...(fromLearn&&L.learnSnap?L.learnSnap:L.testSnap)];L.done=0;L.res={};L.right=0;L.wrong=0;L.combo=0;L.dead=false;L.hearts=5;L.testing=false;drawHearts();next();}
  function failScreen(){
    body.innerHTML='';foot.innerHTML='';foot.className='lfoot';
    body.append(h('div',{class:'end'},
      h('div',{class:'hearts big'},[0,1,2,3,4].map(()=>h('span',{class:'ht gone',html:HEART}))),
      h('h2',null,'Сердца сгорели'),
      h('p',{class:'tinfo'},'Пять ошибок — проверка начинается заново. Если знаки ещё путаются, сначала пролистайте карточки обучения.')));
    const again=h('button',{class:'btn primary big main',onclick:()=>restart(false)},'Начать проверку заново');
    foot.append(L.learnSnap?h('div',{class:'row',style:'flex-wrap:nowrap'},h('button',{class:'btn ghost',onclick:()=>restart(true)},'Повторить обучение'),again):again);
    again.focus();
  }
  function show(ex){
    body.innerHTML=''; foot.innerHTML=''; foot.className='lfoot'; body.scrollTop=0;
    let btn;
    if(ex.t==='phase'&&ex.kind==='learn'){L.learnSnap=[ex,...L.q];L.testing=false;drawHearts();}
    if(ex.t==='phase'&&ex.kind==='test'){L.testSnap=[ex,...L.q];L.testing=true;L.hearts=5;L.dead=false;drawHearts();}
    const E=build(ex,()=>{btn.disabled=!E.ready();});
    body.append(E.node);
    if(E.learn){ btn=h('button',{class:'btn primary big main',onclick:()=>{L.done++;next();}},E.btnText||'Понятно');
      if(ex.t==='phase'&&ex.kind==='learn'){const sk=h('button',{class:'btn ghost',onclick:()=>{const k=L.q.findIndex(x=>x.t==='phase'&&x.kind==='test');if(k>0){L.done+=k;L.q.splice(0,k);}next();}},'Сразу к проверке');
        foot.append(h('div',{class:'row',style:'flex-wrap:nowrap'},sk,btn));} else foot.append(btn); return; }
    const skip=E.skippable?h('button',{class:'btn ghost',onclick:()=>{if(ex.t==='draw'&&ex.it){L.wrong++;L.combo=0;L.res[ex.it.g]=false;if(!ex.retried)loseHeart();if(!ex.again&&!ex.retried)L.q.push({...ex,again:true});}L.done++;next();}},ex.t==='draw'?'Не помню':'Пропустить'):null;
    btn=h('button',{class:'btn primary big main',disabled:true,onclick:async()=>{
      btn.disabled=true; const r=await E.check(); feedback(ex,r);}},'Проверить');
    foot.append(skip?h('div',{class:'row',style:'flex-wrap:nowrap'},skip,btn):btn);
  }
  function feedback(ex,r){
    const it=ex.it;
    if(ex.t!=='trace'){
      if(r.ok&&r.hint){L.right++;L.combo=0; if(it) L.res[it.g]=false;}
      else if(r.ok){L.right++;L.combo++;L.best=Math.max(L.best,L.combo); if(it&&L.res[it.g]===undefined) L.res[it.g]=true;}
      else{L.wrong++;L.combo=0; if(it) L.res[it.g]=false; if(!ex.retried) loseHeart(); if(!ex.again&&!ex.retried) L.q.push({...ex,again:true});}
    }
    L.done++; upd();
    foot.innerHTML=''; foot.className='lfoot '+(r.ok?'good':'bad');
    const info=it?h('p',null,it.g+' — '+it.m+'. '+it.et.split('. ')[0].replace(/\.$/,'')+'.'):null;
    foot.append(h('div',{class:'fb'},it?h('span',{class:'fg',lang:'ja'},it.g,PIC[it.g]?h('span',{class:'fpic'},picImg(it.g)):null):null,
      h('div',null,h('h4',null,r.title||(r.ok?rnd(['Верно!','Отлично!','Точно.','Так держать!']):'Не совсем')),
        r.ok?null:(r.right?h('p',null,'Правильно: ',h('b',null,r.right)):null), r.msg?h('p',null,r.msg):info)));
    const row=h('div',{class:'row',style:'flex-wrap:nowrap'});
    if(r.retry&&!L.dead) row.append(h('button',{class:'btn ghost',onclick:()=>{L.done--;show({...ex,retried:true});}},'Ещё раз'));
    row.append(h('button',{class:'btn big main '+(r.ok?'good':'bad'),onclick:next},'Дальше'));
    foot.append(row);
    foot.querySelector('.main').focus();
  }
  function finish(){
    document.removeEventListener('keydown',keyHandler);
    const total=L.right+L.wrong, acc=total?Math.round(100*L.right/total):100;
    Object.entries(L.res).forEach(([g,ok])=>grade(g,ok));
    queue.forEach(ex=>{ if(ex.t==='learn'&&!S.srs[ex.it.g]) grade(ex.it.g,true); });
    const xp=meta.free?3:(10+L.right+(acc===100?5:0));
    rollDay(); S.xp+=xp; S.todayXp+=xp;
    const t=dayStr(); if(S.last!==t){ S.streak=(S.streak||0)+1; S.last=t; }
    if(meta.unit) S.done[meta.unit.id]=(S.done[meta.unit.id]||0)+1;
    save();
    fill.style.width='100%';
    body.innerHTML=''; foot.innerHTML=''; foot.className='lfoot';
    const u=meta.unit;
    const glyphs=[...new Set(queue.filter(x=>x.it).map(x=>x.it.g))].join('');
    body.append(h('div',{class:'end'},
      u?h('div',{class:'endart'},SUMI.el(u.id,null),h('div',{class:'bigseal','aria-hidden':'true'},u.node)):h('div',{class:'bigseal','aria-hidden':'true'},meta.free?'筆':'復'),
      h('h2',null,meta.free?'Прописано':u?'Урок пройден':'Повторение готово'),
      u&&u.lines?h('div',{class:'poemline',lang:'ja'},hlJ(u,'j',' ')):null,
      h('div',{class:'stats'},
        h('div',{class:'stat'},h('b',null,'+'+xp),h('small',null,'очков')),
        h('div',{class:'stat'},h('b',null,acc+'%'),h('small',null,'точность')),
        h('div',{class:'stat'},h('b',null,S.streak),h('small',null,plural(S.streak,'день','дня','дней')+' подряд'))),
      glyphs?h('div',{class:'kl',lang:'ja'},glyphs):null,
      meta.free?null:h('div',{class:'refill'},h('div',{class:'hearts'},[0,1,2,3,4].map(()=>h('span',{class:'ht',html:HEART}))),h('span',null,'Сердца восстановлены: в следующем уроке снова пять.')),
      L.wrong?h('p',{class:'tinfo'},'Ошибки не страшны: эти знаки вернутся в повторении через 10 минут.'):h('p',{class:'tinfo'},'Следующее повторение — завтра.')));
    foot.append(h('button',{class:'btn primary big main',onclick:exit},'Продолжить'));
    document.addEventListener('keydown',keyHandler=e=>{if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();exit();}});
  }
  next();
}

// ---------- exercises ----------
function build(ex,onReady){
  switch(ex.t){
    case 'learn': return {learn:true,btnText:'Обвести',node:h('div',null,h('span',{class:'learn-tag'},(ex.it.t==='rad'?'Ключ ':'Знак ')+(ex.i?ex.i+' из '+ex.n+' · шаг 1 из 3':'')),kanjiCard(ex.it,true))};
    case 'mcm': return PIC[ex.it.g]?picMC(ex.it,[h('div',{class:'q'},'Что значит этот знак?'),h('div',{class:'qbig',lang:'ja'},ex.it.g)],onReady)
      : mc(ex.it,[h('div',{class:'q'},'Что значит этот знак?'),h('div',{class:'qbig',lang:'ja'},ex.it.g)],meaningChoices(ex.it),ex.it.m,false,onReady);
    case 'mcg': return mc(ex.it,[h('div',{class:'q'},'Какой знак значит «',ex.it.m,'»?'),PIC[ex.it.g]?h('div',{class:'qpic'},picImg(ex.it.g)):null],glyphChoices(ex.it),ex.it.g,true,onReady);
    case 'etym': return mc(ex.it,[h('div',{class:'q'},'О каком знаке эта история?'),h('div',{class:'quote'},mask(ex.it.et,ex.it.g))],glyphChoices(ex.it),ex.it.g,true,onReady);
    case 'keep': return mc(ex.it,[h('div',{class:'q'},'Правило каллиграфа: о каком знаке?'),h('div',{class:'quote'},h('span',{class:'tag',style:'color:var(--shu)'},'Нельзя трогать'),h('br'),mask(ex.it.keep,ex.it.g))],glyphChoices(ex.it),ex.it.g,true,onReady);
    case 'gap': return exGap(ex,onReady);
    case 'build': return exBuild(ex.it,onReady);
    case 'asm': return exAsm(ex.u,onReady);
    case 'trace': return exTrace(ex.it,onReady,ex.free,ex.mode||'guide');
    case 'order': return exOrder(ex.it,onReady);
    case 'draw': return exTrace(ex.it,onReady,false,'memory');
    case 'phase': return exPhase(ex);
    case 'sosho': return exSosho(ex.it,onReady);
  }
}
function exPhase(ex){
  const u=ex.u;
  if(ex.kind==='learn') return {learn:true,btnText:'Начать обучение',node:h('div',{class:'phase'},
    u&&u.lines?SUMI.el(u.id,u.node,'hero'):null,
    h('span',{class:'learn-tag'},'Часть 1 · Обучение'),
    h('h2',null,u&&u.lines?u.author+' · '+u.title:(u?u.title:'Обучение')),
    u&&u.lines?h('div',{class:'poemline',lang:'ja'},hlJ(u,'j',' ')):null,
    h('p',{class:'tinfo',style:'text-align:left'},'Для каждого из '+ex.n+' '+plural(ex.n,'знака','знаков','знаков')+' — три шага: разберите карточку (смысл, части, порядок черт), обведите по образцу, затем напишите сами на чистом листе. Проверка по памяти будет после всех знаков — так память закрепляется лучше.'),
    ex.skip?h('p',{class:'tinfo',style:'text-align:left'},'Эти знаки вы уже проходили — можно сразу перейти к проверке.'):null)};
  return {learn:true,btnText:'Начать проверку',node:h('div',{class:'phase'},
    h('span',{class:'learn-tag'},ex.review?'Повторение':'Часть 2 · Проверка'),
    h('h2',null,ex.rev?u.title+': '+ex.n+' знаков из пяти уроков':'Проверка на запоминание'),
    h('div',{class:'ph2'},
      h('div',{class:'phc'},h('b',null,'Выбор из 4'),h('span',null,'знак → значение или значение → знак')),
      h('div',{class:'phc'},h('b',null,'Нарисовать по названию'),h('span',null,'пустой лист, только слово; проверяются форма и порядок черт'))),
    h('p',{class:'tinfo',style:'text-align:left'},'Ошибки вернутся в конце урока. Подсказка при рисовании засчитывается, но знак попадёт в повторение раньше.'))};
}
function mc(it,head,choices,right,glyph,onReady){
  let sel=null; const btns=[];
  const grid=h('div',{class:'opts'+(glyph?' g4':'')});
  choices.forEach((c,i)=>{const b=h('button',{class:'opt'+(glyph?' gl':''),'aria-pressed':'false',lang:glyph?'ja':null,onclick:()=>{
      if(b.disabled)return; btns.forEach(x=>x.setAttribute('aria-pressed','false')); b.setAttribute('aria-pressed','true'); sel=c; onReady();}},
      glyph?null:h('span',{class:'n'},i+1), c); btns.push(b); grid.append(b);});
  return {node:h('div',null,head,grid),ready:()=>sel!=null,check:()=>{
    btns.forEach((b,i)=>{b.disabled=true; if(choices[i]===right) b.classList.add('right'); else if(choices[i]===sel) b.classList.add('wrong');});
    return {ok:sel===right,right:right};}};
}
function exGap(ex,onReady){
  const u=ex.u, g=ex.it.g; const i=u.jp.indexOf(g);
  const blank=h('span',{class:'blank'},' ');
  let sel=null; const btns=[];
  const choices=glyphChoices(ex.it,u.items);
  const grid=h('div',{class:'opts g4'});
  choices.forEach(c=>{const b=h('button',{class:'opt gl','aria-pressed':'false',lang:'ja',onclick:()=>{
    if(b.disabled)return; btns.forEach(x=>x.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed','true');sel=c;blank.textContent=c;onReady();}},c);btns.push(b);grid.append(b);});
  const line=h('div',{class:'poemline',lang:'ja'},u.jp.slice(0,i),blank,u.jp.slice(i+1));
  return {node:h('div',null,h('div',{class:'q'},'Впишите пропущенный знак'),line,h('div',{class:'sub'},u.author,' · ',hlS(u,'t')),grid),
    ready:()=>sel!=null,
    check:()=>{btns.forEach((b,k)=>{b.disabled=true;if(choices[k]===g)b.classList.add('right');else if(choices[k]===sel)b.classList.add('wrong');});
      return {ok:sel===g,right:g};}};
}
function exBuild(it,onReady){
  const pool=new Set(it.parts);
  const others=shuffle(ALL.filter(x=>x.parts&&x.g!==it.g).flatMap(x=>x.parts)).filter(p=>!pool.has(p));
  const tiles=shuffle([...it.parts,...[...new Set(others)].slice(0,6-it.parts.length)]);
  const chosen=new Set();
  const out=h('span',{class:'pchip',style:'min-width:46px;text-align:center'},'?');
  const bank=h('div',{class:'bank'});
  const tbs=tiles.map(p=>{const b=h('button',{class:'tile k','aria-pressed':'false',lang:'ja',onclick:()=>{if(b.disabled)return;
    if(chosen.has(p)){chosen.delete(p);b.setAttribute('aria-pressed','false');}else{chosen.add(p);b.setAttribute('aria-pressed','true');} onReady();}},p);bank.append(b);return b;});
  return {node:h('div',null,h('div',{class:'q'},'Соберите знак «',it.m,'» из частей'),h('div',{class:'sub'},'Выберите ',it.parts.length,' ',plural(it.parts.length,'часть','части','частей')),
      h('div',{class:'parts',style:'justify-content:center;margin-bottom:18px'},out),bank),
    ready:()=>chosen.size>0,
    check:()=>{tbs.forEach(b=>b.disabled=true);
      const ok=chosen.size===it.parts.length&&it.parts.every(p=>chosen.has(p));
      out.textContent=it.g; out.lang='ja';
      tbs.forEach((b,i)=>{if(pool.has(tiles[i]))b.style.borderColor='var(--good)';else if(chosen.has(tiles[i]))b.style.borderColor='var(--bad)';});
      return {ok,right:it.parts.join(' + ')+' = '+it.g};}};
}
function exAsm(u,onReady){
  const order=u.chunks.map((c,i)=>({c,i}));
  const bankItems=shuffle(order);
  const ans=h('div',{class:'ans',lang:'ja'}), bank=h('div',{class:'bank',lang:'ja'});
  const picked=[];
  bankItems.forEach(o=>{const b=h('button',{class:'tile',onclick:()=>{if(b.disabled||b.classList.contains('used'))return;
      b.classList.add('used'); picked.push(o);
      const a=h('button',{class:'tile',onclick:()=>{if(a.disabled)return;a.remove();b.classList.remove('used');picked.splice(picked.indexOf(o),1);onReady();}},o.c);
      o.a=a; ans.append(a); onReady();}},o.c); o.b=b; bank.append(b);});
  return {node:h('div',null,h('div',{class:'q'},'Соберите хокку'),h('div',{class:'sub'},u.author,' · ',hlS(u,'t')),ans,bank),
    ready:()=>picked.length===u.chunks.length,
    check:()=>{order.forEach(o=>{o.b.disabled=true;if(o.a)o.a.disabled=true;});
      const ok=picked.map(o=>o.c).join('')===u.jp;
      return {ok,right:u.lines.join(' '),msg:ok?u.lines.join(' ')+' — '+u.cyr:null};}};
}

// ---------- stroke SVG ----------
const SVGNS='http://www.w3.org/2000/svg';
function sv(tag,attrs,style){const e=document.createElementNS(SVGNS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(style)Object.assign(e.style,style);return e;}
function spath(d,color,w,extra){return sv('path',Object.assign({d,fill:'none','stroke-linecap':'round','stroke-linejoin':'round','stroke-width':w},extra||{}),{stroke:color});}
function glyphSvg(g,o){o=o||{};const d=STK[g];
  const svg=sv('svg',{viewBox:'0 0 109 109',class:'gsvg',role:'img','aria-label':g});
  if(!d){const t=sv('text',{x:54.5,y:58,'text-anchor':'middle','dominant-baseline':'middle','font-size':84},{fill:'var(--ink)',fontFamily:'var(--f-kan)'});t.textContent=g;svg.append(t);return svg;}
  d.d.forEach((p,i)=>svg.append(spath(p,o.color?o.color(i+1):'var(--ink)',o.width?o.width(i+1):4)));
  (o.links||[]).forEach(([a,b])=>{const ea=d.e[a-1],eb=d.e[b-1];
    svg.append(sv('line',{x1:ea[2],y1:ea[3],x2:eb[0],y2:eb[1],'stroke-width':1.8,'stroke-dasharray':'2.4 2.6','stroke-linecap':'round'},{stroke:'var(--ai)'}));});
  if(o.nums) d.n.forEach(([x,y],i)=>{const t=sv('text',{x,y,'font-size':8},{fill:'var(--ink2)',fontFamily:'var(--f-ui)'});t.textContent=i+1;svg.append(t);});
  return svg;}
const stName=(g,i)=>{const t=STK[g]&&STK[g].t[i];return STYPE[t]||'черта';};

const COMP_COL=['var(--ink)','var(--ai)','var(--shu)'];
const JNUM=['いち','に','さん','し','ご','ろく','しち','はち','く','じゅう','じゅういち','じゅうに','じゅうさん','じゅうし','じゅうご','じゅうろく','じゅうしち','じゅうはち','じゅうく','にじゅう'];
let countAloud=false; try{countAloud=localStorage.getItem('kh-count')==='1';}catch(e){}
function compOf(g,i){const c=STK[g]&&STK[g].c;if(!c||!c.length)return -1;return c.findIndex(([,a,b])=>i>=a&&i<=b);}
function compChips(g){const c=STK[g]&&STK[g].c;if(!c||!c.length)return null;
  return h('div',{class:'comps'},c.map(([el,a,b],k)=>h('span',{class:'cchip',style:'color:'+COMP_COL[k%3]},h('b',{lang:'ja'},el),' ',a===b?('черта '+a):('черты '+a+'–'+b))));}
function sayNum(i){if(!countAloud)return;try{const u=new SpeechSynthesisUtterance(JNUM[i]||String(i+1));u.lang='ja-JP';u.rate=1.1;speechSynthesis.speak(u);}catch(e){}}
function orderPlayer(g){
  const d=STK[g]; const box=h('div',{class:'kbig player',lang:'ja'});
  if(!d){box.textContent=g;return {node:h('div',null,box)};}
  const colOf=i=>{const k=compOf(g,i+1);return k<0?'var(--ink)':COMP_COL[k%3];};
  const svg=sv('svg',{viewBox:'0 0 109 109',class:'gsvg'});
  d.d.forEach(p=>svg.append(spath(p,'var(--ghost)',4)));
  const live=d.d.map((p,i)=>{const e=spath(p,colOf(i),4.4,{pathLength:1});svg.append(e);return e;});
  const nums=d.n.map(([x,y],i)=>{const t=sv('text',{x,y,'font-size':8.5},{fill:'var(--ink2)',fontFamily:'var(--f-ui)'});t.textContent=i+1;svg.append(t);return t;});
  const dot=sv('circle',{r:3.2},{fill:'var(--shu)',opacity:0});svg.append(dot);
  box.append(svg);
  const cap=h('div',{class:'pcap'});
  let i=d.d.length,timer=null;
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function paint(n,animLast){
    live.forEach((e,k)=>{e.style.transition='none';e.style.strokeDasharray='1';e.style.strokeDashoffset=k<n?'0':'1';e.style.stroke=colOf(k);nums[k].style.opacity=k<n?1:0;});
    if(animLast&&n>0&&!reduce){const e=live[n-1];e.style.strokeDashoffset='1';e.getBoundingClientRect();e.style.transition='stroke-dashoffset .55s ease-in-out';e.style.strokeDashoffset='0';}
    if(n>0&&n<=d.d.length){const s=d.e[n-1];dot.setAttribute('cx',s[0]);dot.setAttribute('cy',s[1]);dot.style.opacity=1;}else dot.style.opacity=0;
    const k=compOf(g,n);const part=k>=0?' · часть '+d.c[k][0]:'';
    cap.textContent=n===0?'С чистого листа':('Черта '+n+' из '+d.d.length+' — '+stName(g,n-1)+part);
  }
  function stop(){clearInterval(timer);timer=null;play.textContent='▶';play.setAttribute('aria-label','Показать порядок черт');}
  const play=h('button',{class:'pbtn','aria-label':'Показать порядок черт',onclick:()=>{
    if(timer){stop();return;} i=0;paint(0);play.textContent='❚❚';play.setAttribute('aria-label','Пауза');
    timer=setInterval(()=>{i++;paint(i,true);sayNum(i-1);if(i>=d.d.length)stop();},800);}},'▶');
  const prev=h('button',{class:'pbtn','aria-label':'Предыдущая черта',onclick:()=>{stop();i=Math.max(0,(i>d.d.length?d.d.length:i)-1);paint(i);}},'‹');
  const next=h('button',{class:'pbtn','aria-label':'Следующая черта',onclick:()=>{stop();if(i>=d.d.length)i=0;i++;paint(i,true);sayNum(i-1);}},'›');
  const voice=h('button',{class:'pbtn voice'+(countAloud?' on':''),'aria-pressed':String(countAloud),title:'Считать черты вслух по-японски',onclick:()=>{countAloud=!countAloud;try{localStorage.setItem('kh-count',countAloud?'1':'0');}catch(e){}voice.classList.toggle('on',countAloud);voice.setAttribute('aria-pressed',String(countAloud));}},'一二三');
  paint(d.d.length); cap.textContent=d.d.length+' '+plural(d.d.length,'черта','черты','черт')+' · ▶ — показать порядок';
  return {node:h('div',{class:'pwrap'},box,h('div',{class:'pctl'},prev,play,next,voice),cap,compChips(g))};
}

function autoAnn(g){const d=STK[g];if(!d)return null;const n=d.d.length;const c=d.c&&d.c.length?d.c:null;
  if(c){const f=c[0],l=c[c.length-1];const r=(a,b)=>{const o=[];for(let i=a;i<=b;i++)o.push(i);return o;};return {s:r(f[1],f[2]),k:r(l[1],l[2])};}
  return {s:n>2?[2,3].filter(i=>i<n):[],k:[n]};}
function calViz(it){
  const a=ANN[it.g]||autoAnn(it.g); if(!a||!STK[it.g]) return null;
  const S1=new Set(a.s),K=new Set(a.k);
  const links=[];a.s.forEach(x=>{if(S1.has(x+1))links.push([x,x+1]);});
  const simSvg=glyphSvg(it.g,{color:i=>S1.has(i)?'var(--ai)':'var(--faint)',width:i=>S1.has(i)?5.2:3.6,links});
  const keepSvg=glyphSvg(it.g,{color:i=>K.has(i)?'var(--shu)':'var(--faint)',width:i=>K.has(i)?5.4:3.6});
  const confs=(it.conf||[]).slice(0,3).map(c=>h('div',{class:'cf'},h('div',{class:'cfg'},glyphSvg(c)),h('small',null,M[c]?M[c].m.split(/[;,(]/)[0]:(CONFM[c]||''))));
  return {
    sim:h('div',{class:'viz'},h('div',{class:'vg'},simSvg),
      h('div',{class:'vl'},a.s.length?(a.s.length+' '+plural(a.s.length,'черта','черты','черт')+' → '+(links.length?'связываются в одно движение':'сжимаются')):'нечего сокращать',
        links.length?h('span',{class:'leg'},h('i',{class:'dash-ico'}),'путь кисти: в гёсё становится видимой связкой'):null)),
    keep:h('div',{class:'viz'},h('div',{class:'vg'},keepSvg),
      confs.length?h('div',{class:'vl'},h('span',null,'Похожие знаки — не спутать:'),h('div',{class:'cfs'},confs)):null)
  };
}
// ---------- brush tracing with stroke-order check ----------
function cssVar(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}
function refCanvas(g,W){const c=document.createElement('canvas');c.width=c.height=W;const x=c.getContext('2d');const d=STK[g];
  if(d){x.scale(W/109,W/109);x.lineWidth=6;x.lineCap='round';x.lineJoin='round';x.strokeStyle='#000';d.d.forEach(p=>x.stroke(new Path2D(p)));}
  else{x.fillStyle='#000';x.textAlign='center';x.textBaseline='middle';x.font='600 '+Math.round(W*0.8)+'px "Klee One", sans-serif';x.fillText(g,W/2,W/2+W*0.03);}
  return c;}
function maskOf(src,N){const c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');x.drawImage(src,0,0,N,N);
  const d=x.getImageData(0,0,N,N).data,m=new Uint8Array(N*N);for(let i=0;i<N*N;i++)m[i]=d[i*4+3]>50?1:0;return m;}
function dilate(m,N,r){const o=new Uint8Array(N*N);for(let y=0;y<N;y++)for(let x=0;x<N;x++){if(!m[y*N+x])continue;
  for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<N&&Y<N)o[Y*N+X]=1;}}return o;}
function exTrace(it,onReady,free,mode){
  if(mode===true) mode='memory'; mode=mode||'guide';
  const blank=mode==='blank', memory=mode==='memory'||blank, fade=mode==='fade', strict=memory||fade;
  const D=STK[it.g]; const n=D?D.d.length:it.s;
  const size=Math.max(200,Math.min(300,window.innerWidth-48));
  const DPR=Math.min(2,window.devicePixelRatio||1), W=Math.round(size*DPR);
  const fg=h('canvas');fg.width=fg.height=W;fg.style.width=fg.style.height=size+'px';
  const ghost=sv('svg',{viewBox:'0 0 109 109',class:'gsvg tghost'});
  const gp=D?D.d.map(p=>{const e=spath(p,'var(--ghost)',5);ghost.append(e);return e;}):[];
  const hint=sv('g',{});ghost.append(hint);
  const flash=sv('svg',{viewBox:'0 0 109 109',class:'gsvg tghost'});
  const box=h('div',{class:'tbox',style:`width:${size}px;height:${size}px`},h('div',{class:'grid'}),ghost,flash,fg);
  const fx=fg.getContext('2d');
  let showGhost=!memory, strokes=0, pts=[], res=[], hintUsed=false, snap=null; const miss=new Array(n).fill(0);
  if(memory) ghost.style.visibility='hidden';
  if(fade) ghost.style.opacity='.38';
  const info=h('div',{class:'tinfo',role:'status'});
  function setHint(){hint.innerHTML='';
    if(!D||!showGhost||strokes>=n||fade) return;
    const e=D.e[strokes];
    hint.append(sv('circle',{cx:e[0],cy:e[1],r:4.5,class:'hdot'},{fill:'var(--shu)'}));
    const dx=e[2]-e[0],dy=e[3]-e[1],L=Math.hypot(dx,dy)||1;
    hint.append(sv('line',{x1:e[0],y1:e[1],x2:e[0]+dx/L*11,y2:e[1]+dy/L*11,'stroke-width':2,'stroke-linecap':'round'},{stroke:'var(--shu)'}));}
  function partName(i){const k=compOf(it.g,i+1);return k>=0?' · часть '+D.c[k][0]:'';}
  function setInfo(msg){info.textContent=msg||(strokes>=n?'Все черты написаны — нажмите «Проверить»':('Черта '+(strokes+1)+' из '+n+(D&&!memory?' — '+stName(it.g,strokes):'')+(D?partName(strokes):'')));}
  function flashStroke(i,keep){const p=spath(D.d[i],'var(--shu)',5,{pathLength:1});p.style.strokeDasharray='1';p.style.strokeDashoffset='1';flash.append(p);
    p.getBoundingClientRect();p.style.transition='stroke-dashoffset .6s ease-out';p.style.strokeDashoffset='0';
    const e=D.e[i];const c=sv('circle',{cx:e[0],cy:e[1],r:4},{fill:'var(--shu)'});flash.append(c);
    setTimeout(()=>{c.remove();if(keep){p.style.transition='stroke .4s';p.style.stroke='var(--ghost)';}else{p.style.transition='opacity .4s';p.style.opacity='0';setTimeout(()=>p.remove(),450);}},1300);}
  setHint();setInfo();
  const ink=cssVar('--ink')||'#1c1e21';
  let drawing=false,last=null,lw=0; const base=W*0.05;
  const pt=e=>{const r=fg.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*W/r.height,t:e.timeStamp};};
  fg.addEventListener('pointerdown',e=>{e.preventDefault();try{fg.setPointerCapture(e.pointerId);}catch(_){}
    if(strict){try{snap=fx.getImageData(0,0,W,W);}catch(_){snap=null;}}
    drawing=true;last=pt(e);pts=[last];lw=base*0.55;
    fx.fillStyle=ink;fx.beginPath();fx.arc(last.x,last.y,lw/2,0,Math.PI*2);fx.fill();});
  fg.addEventListener('pointermove',e=>{if(!drawing)return;const p=pt(e);const d=Math.hypot(p.x-last.x,p.y-last.y);if(d<1)return;
    const v=d/Math.max(1,p.t-last.t)/DPR; let target=base*Math.max(0.35,Math.min(1.15,1.2-v*0.45));
    if(e.pointerType==='pen'&&e.pressure>0) target*=0.5+e.pressure;
    const nw=lw*0.65+target*0.35; fx.strokeStyle=ink;fx.lineCap='round';fx.lineJoin='round';
    const steps=Math.ceil(d/2);for(let i=1;i<=steps;i++){const t=i/steps;fx.lineWidth=lw+(nw-lw)*t;fx.beginPath();
      fx.moveTo(last.x+(p.x-last.x)*(i-1)/steps,last.y+(p.y-last.y)*(i-1)/steps);fx.lineTo(last.x+(p.x-last.x)*t,last.y+(p.y-last.y)*t);fx.stroke();}
    lw=nw;last=p;pts.push(p);});
  const up=()=>{if(!drawing)return;drawing=false;
    const a=pts[0],b=pts[pts.length-1]; const idx=strokes;
    if(!D){strokes++;setInfo();onReady();return;}
    if(idx>=n){ if(strict&&snap){fx.putImageData(snap,0,0);setInfo('Все '+n+' '+plural(n,'черта','черты','черт')+' уже написаны — лишний штрих стёрт.');} else {strokes++;setInfo('Лишний штрих: в знаке '+n+' '+plural(n,'черта','черты','черт')+'.');} onReady();return;}
    const k=W/109,e=D.e[idx];
    const ds=Math.hypot(a.x-e[0]*k,a.y-e[1]*k)/W, de=Math.hypot(b.x-e[2]*k,b.y-e[3]*k)/W;
    const ex=e[2]-e[0],ey=e[3]-e[1],ux=b.x-a.x,uy=b.y-a.y,el=Math.hypot(ex,ey);
    const dirOk=el<6||(ux*ex+uy*ey)/(el*(Math.hypot(ux,uy)||1))>0.3;
    const ok=ds<0.17&&de<0.22&&dirOk;
    if(strict){
      if(ok){strokes++;res[idx]=miss[idx]===0;setInfo();}
      else{ if(snap) fx.putImageData(snap,0,0); miss[idx]++;
        const keep=miss[idx]>=2; if(keep) hintUsed=true; flashStroke(idx,keep);
        setInfo(keep?('Черта '+(idx+1)+' оставлена бледной — обведите её.'):('Не та черта — вот как пишется черта '+(idx+1)+(D.t[idx]?' ('+stName(it.g,idx)+')':'')+'. Попробуйте ещё раз.'));}
    } else {
      strokes++; res[idx]=ok; gp[idx].style.stroke=ok?'var(--good-line)':'var(--shu-line)';
      let msg='';
      if(!ok){const rs=Math.hypot(a.x-e[2]*k,a.y-e[3]*k)/W,re=Math.hypot(b.x-e[0]*k,b.y-e[1]*k)/W;
        msg=(!dirOk||(rs<0.17&&re<0.22))?('Черта '+(idx+1)+' написана в обратную сторону. Начало — у красной точки.'):('Черта '+(idx+1)+' ('+stName(it.g,idx)+') должна начинаться у красной точки.');}
      setInfo(msg||null);
    }
    setHint(); onReady();};
  fg.addEventListener('pointerup',up); fg.addEventListener('pointercancel',up);
  const clear=()=>{fx.clearRect(0,0,W,W);strokes=0;res=[];miss.fill(0);flash.innerHTML='';gp.forEach(e=>e.style.stroke='var(--ghost)');setHint();setInfo();onReady();};
  const gbtn=h('button',{class:'btn ghost',onclick:()=>{showGhost=!showGhost;ghost.style.visibility=showGhost?'visible':'hidden';setHint();gbtn.textContent=showGhost?'Скрыть образец':'Показать образец';}},'Скрыть образец');
  const hbtn=h('button',{class:'btn ghost',onclick:()=>{showGhost=true;hintUsed=true;ghost.style.visibility='visible';ghost.style.opacity='.38';setHint();hbtn.disabled=true;hbtn.textContent='Образец показан';}},'Подсказка');
  const pl=memory?null:orderPlayer(it.g);
  const demo=memory?null:h('details',{class:'demo',open:mode==='guide'&&!free?true:null},h('summary',null,'Порядок черт'),pl.node);
  const tag=mode==='guide'?'Шаг 2 из 3 · обведите':fade?'Шаг 3 из 3 · бледный образец':'По памяти';
  const head=memory?[blank?h('span',{class:'learn-tag'},'Шаг 3 из 3 · чистый лист'):null,h('div',{class:'q'},blank?'Теперь сами, на чистом листе: «'+it.m+'»':'Нарисуйте по памяти: «'+it.m+'»'),
      h('div',{class:'drawhint'},PIC[it.g]?h('span',{class:'dpic'},picImg(it.g)):null,h('span',null,(it.kun||it.on||'').split('・')[0],' · ',n,' ',plural(n,'черта','черты','черт')))]
    :[free?null:h('span',{class:'learn-tag'},tag),h('div',{class:'q'},fade?'Напишите «'+it.m+'» по бледному образцу':'Обведите «'+it.m+'» по порядку черт')];
  const tip=memory?'Неверная черта сразу стирается, и показывается правильная. После двух промахов черта остаётся бледной.'
    :fade?'Образец бледный, подсказок нет. Неверная черта стирается, и показывается правильная.'
    :'Красная точка — где начинается черта, штрих — куда вести кисть. Скажите номер черты вслух, как японские школьники.';
  return {skippable:true,
    node:h('div',null,head,
      h('div',{class:'trace'},box,info,h('div',{class:'row'},h('button',{class:'btn ghost',onclick:clear},'Стереть'),memory?hbtn:(fade?null:gbtn)),demo,
        h('div',{class:'tinfo'},tip))),
    ready:()=>strokes>0,
    check:async()=>{
      const ref=refCanvas(it.g,W);
      const N=64,G=maskOf(ref,N),U=maskOf(fg,N),Gd=dilate(G,N,3),Ud=dilate(U,N,2);
      let g=0,gc=0,u=0,uc=0;for(let i=0;i<N*N;i++){if(G[i]){g++;if(Ud[i])gc++;}if(U[i]){u++;if(Gd[i])uc++;}}
      const cov=g?gc/g:0,prec=u?uc/u:0,form=cov+prec?2*cov*prec/(cov+prec):0;
      ghost.style.visibility='visible';ghost.style.opacity='1';
      if(strict){
        const misses=miss.reduce((a,b)=>a+b,0), done=strokes>=n, allowed=Math.max(1,Math.floor(n/3));
        const ok=done&&misses<=allowed&&form>=.4;
        const firstTry=res.filter(Boolean).length;
        return {ok,hint:hintUsed,retry:true,title:(hintUsed?'С подсказкой · ':'')+'С первой попытки '+firstTry+' из '+n+' черт',
          msg:(!done?'Написано '+strokes+' из '+n+' черт. ':'')+(misses?('Промахов: '+misses+'. '):'Без единого промаха! ')+(ok?'':'Посмотрите порядок черт и попробуйте снова.')};
      }
      const good=res.filter(Boolean).length, ordR=D?good/Math.max(n,strokes):1;
      const ok=form>=0.5&&ordR>=0.6;
      const wrongN=[];for(let i=0;i<n;i++) if(res[i]!==true) wrongN.push(i+1);
      return {ok,retry:true,title:'Форма '+Math.round(form*100)+'%, порядок '+good+'/'+n,
        msg:(ok?'Хорошо. ':'')+(wrongN.length&&D?'Проверьте черты: '+wrongN.slice(0,6).join(', ')+'. ':'Порядок верный. ')+(strokes!==n?'Штрихов '+strokes+', нужно '+n+'.':'')};
    }};
}

function exOrder(it,onReady){
  const D=STK[it.g],n=D.d.length,k=1+Math.floor(Math.random()*n);
  const svg=glyphSvg(it.g,{color:i=>i===k?'var(--shu)':'var(--ink)',width:i=>i===k?5.5:4});
  const e=D.e[k-1]; svg.append(sv('circle',{cx:e[0],cy:e[1],r:3},{fill:'var(--shu)'}));
  const cand=new Set([k]); const near=shuffle([k-2,k-1,k+1,k+2,k-3,k+3,1,n].filter(x=>x>=1&&x<=n));
  near.forEach(x=>{if(cand.size<4)cand.add(x);});
  const ch=[...cand].sort((a,b)=>a-b).map(String);
  const E=mc(it,[h('div',{class:'q'},'Какой по счёту пишется красная черта?'),h('div',{class:'qsvg',lang:'ja'},svg),h('div',{class:'sub'},it.g+' — '+it.m+', всего '+n+' '+plural(n,'черта','черты','черт'))],ch,String(k),false,onReady);
  const chk=E.check; E.check=()=>{const r=chk();r.right=k+'-я — '+stName(it.g,k-1);r.msg='Черта '+k+' — '+stName(it.g,k-1)+'.';return r;};
  return E;
}

render();
})();
