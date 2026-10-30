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

function orderPlayer(g){
  const d=STK[g]; const box=h('div',{class:'kbig player',lang:'ja'});
  if(!d){box.textContent=g;return {node:h('div',null,box)};}
  const svg=sv('svg',{viewBox:'0 0 109 109',class:'gsvg'});
  d.d.forEach(p=>svg.append(spath(p,'var(--ghost)',4)));
  const live=d.d.map(p=>{const e=spath(p,'var(--ink)',4.4,{pathLength:1});svg.append(e);return e;});
  const nums=d.n.map(([x,y],i)=>{const t=sv('text',{x,y,'font-size':8.5},{fill:'var(--ink2)',fontFamily:'var(--f-ui)'});t.textContent=i+1;svg.append(t);return t;});
  const dot=sv('circle',{r:3.2},{fill:'var(--shu)',opacity:0});svg.append(dot);
  box.append(svg);
  const cap=h('div',{class:'pcap'},d.d.length+' '+plural(d.d.length,'черта','черты','черт')+' · нажмите ▶');
  let i=d.d.length,timer=null;
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function paint(n,animLast){
    live.forEach((e,k)=>{e.style.transition='none';
      if(k<n){e.style.strokeDasharray='1';e.style.strokeDashoffset='0';e.style.stroke=k===n-1?'var(--shu)':'var(--ink)';}
      else{e.style.strokeDasharray='1';e.style.strokeDashoffset='1';}
      nums[k].style.opacity=k<n?1:0;});
    if(animLast&&n>0&&!reduce){const e=live[n-1];e.style.strokeDashoffset='1';e.getBoundingClientRect();
      e.style.transition='stroke-dashoffset .55s ease-in-out';e.style.strokeDashoffset='0';}
    if(n>0&&n<=d.d.length){const s=d.e[n-1];dot.setAttribute('cx',s[0]);dot.setAttribute('cy',s[1]);dot.style.opacity=1;}else dot.style.opacity=0;
    cap.textContent=n===0?'С чистого листа':('Черта '+n+' из '+d.d.length+' — '+stName(g,n-1));
  }
  function stop(){clearInterval(timer);timer=null;play.textContent='▶';play.setAttribute('aria-label','Показать порядок черт');}
  const play=h('button',{class:'pbtn','aria-label':'Показать порядок черт',onclick:()=>{
    if(timer){stop();return;} i=0;paint(0);play.textContent='❚❚';play.setAttribute('aria-label','Пауза');
    timer=setInterval(()=>{i++;paint(i,true);if(i>=d.d.length){stop();setTimeout(()=>{live.forEach(e=>e.style.stroke='var(--ink)');},700);}},750);}},'▶');
  const prev=h('button',{class:'pbtn','aria-label':'Предыдущая черта',onclick:()=>{stop();i=Math.max(0,(i>d.d.length?d.d.length:i)-1);paint(i);}},'‹');
  const next=h('button',{class:'pbtn','aria-label':'Следующая черта',onclick:()=>{stop();if(i>=d.d.length)i=0;i++;paint(i,true);}},'›');
  paint(d.d.length); live.forEach(e=>e.style.stroke='var(--ink)'); cap.textContent=d.d.length+' '+plural(d.d.length,'черта','черты','черт')+' · ▶ — показать порядок';
  return {node:h('div',{class:'pwrap'},box,h('div',{class:'pctl'},prev,play,next),cap)};
}

function calViz(it){
  const a=ANN[it.g]; if(!a||!STK[it.g]) return null;
  const S1=new Set(a.s),K=new Set(a.k);
  const links=[];a.s.forEach(x=>{if(S1.has(x+1))links.push([x,x+1]);});
  const simSvg=glyphSvg(it.g,{color:i=>S1.has(i)?'var(--ai)':'var(--faint)',width:i=>S1.has(i)?5.2:3.6,links});
  const keepSvg=glyphSvg(it.g,{color:i=>K.has(i)?'var(--shu)':'var(--faint)',width:i=>K.has(i)?5.4:3.6});
  const confs=(it.conf||[]).slice(0,3).map(c=>h('div',{class:'cf'},h('div',{class:'cfg'},glyphSvg(c)),M[c]?h('small',null,M[c].m.split(/[;,]/)[0]):null));
  return {
    sim:h('div',{class:'viz'},h('div',{class:'vg'},simSvg),
      h('div',{class:'vl'},a.s.length?(a.s.length+' '+plural(a.s.length,'черта','черты','черт')+' → '+(links.length?'связываются в одно движение':'сжимаются')):'нечего сокращать',
        links.length?h('span',{class:'leg'},h('i',{class:'dash-ico'}),'путь кисти: в гёсё становится видимой связкой'):null)),
    keep:h('div',{class:'viz'},h('div',{class:'vg'},keepSvg),
      confs.length?h('div',{class:'vl'},h('span',null,'иначе получится:'),h('div',{class:'cfs'},confs)):null)
  };
}
