// ===== Сумиэ: процедурная живопись тушью =====
const SUMI=(function(){
let INK='29,27,25';
function painter(cv,seed){
  const ctx=cv.getContext('2d'),W=cv.width,H=cv.height;
  let r=(seed>>>0)||7; const rnd=()=>{r^=r<<13;r>>>=0;r^=r>>>17;r^=r<<5;r>>>=0;return (r%1e6)/1e6;};
  const rr=(a,b)=>a+(b-a)*rnd();
  const X=x=>x*W,Y=y=>y*H,S=s=>s*W;
  const P={W,H,rnd,rr,ctx};
  function catmull(pts,step){ // normalized pts -> dense pixel pts
    const p=pts.map(([x,y])=>[X(x),Y(y)]); if(p.length<2) return p;
    const out=[]; for(let i=0;i<p.length-1;i++){const p0=p[i-1]||p[i],p1=p[i],p2=p[i+1],p3=p[i+2]||p2;
      const d=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]); const n=Math.max(2,Math.ceil(d/step));
      for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t;
        out.push([0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
                  0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]);}}
    out.push(p[p.length-1]); return out;}
  P.paper=function(){
    const g=ctx.createLinearGradient(0,0,W,H); g.addColorStop(0,'#f6f1e6'); g.addColorStop(1,'#ede5d4');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    for(let i=0;i<W*H/900;i++){ctx.fillStyle=`rgba(120,100,70,${rr(.02,.06)})`;ctx.fillRect(rnd()*W,rnd()*H,rr(.5,1.6),rr(.5,1.6));}
    ctx.strokeStyle='rgba(140,120,90,.05)';ctx.lineWidth=1;
    for(let i=0;i<40;i++){const x=rnd()*W,y=rnd()*H,a=rnd()*6.3,l=rr(6,30);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);ctx.stroke();}
  };
  // мазок кисти: ширина по профилю, щетина, сухая кисть к концу
  P.stroke=function(pts,w,o){o=o||{};const a=o.a==null?.88:o.a,col=o.col||INK,dry=o.dry==null?.35:o.dry;
    const tp=o.taper||[.25,1,.15]; const d=catmull(pts,1.5); if(d.length<2) return;
    const wp=S(w)/2, n=d.length; const B=Math.max(4,Math.min(26,Math.round(wp*1.6)));
    const prof=t=>t<.5?tp[0]+(tp[1]-tp[0])*Math.sin(t*Math.PI):tp[2]+(tp[1]-tp[2])*Math.sin(t*Math.PI);
    const nor=[];for(let i=0;i<n;i++){const p=d[Math.max(0,i-1)],q=d[Math.min(n-1,i+1)];const dx=q[0]-p[0],dy=q[1]-p[1],l=Math.hypot(dx,dy)||1;nor.push([-dy/l,dx/l]);}
    // тело мазка
    ctx.fillStyle=`rgba(${col},${a*.55})`;ctx.beginPath();
    for(let i=0;i<n;i++){const t=i/(n-1),hw=wp*prof(t);ctx.lineTo(d[i][0]+nor[i][0]*hw,d[i][1]+nor[i][1]*hw);}
    for(let i=n-1;i>=0;i--){const t=i/(n-1),hw=wp*prof(t);ctx.lineTo(d[i][0]-nor[i][0]*hw,d[i][1]-nor[i][1]*hw);}
    ctx.closePath();ctx.fill();
    // щетина
    ctx.lineCap='round';
    for(let b=0;b<B;b++){const off=(b/(B-1))*2-1, gapAt=1-dry*rr(.2,1.1), al=a*rr(.35,.75);
      ctx.strokeStyle=`rgba(${col},${al})`;ctx.lineWidth=Math.max(.8,wp*2/B*1.3);ctx.beginPath();let pen=false;
      for(let i=0;i<n;i++){const t=i/(n-1);const hw=wp*prof(t)*.92;
        const skip=t>gapAt&&Math.abs(off)>.25&&rnd()<.5; const x=d[i][0]+nor[i][0]*hw*off,y=d[i][1]+nor[i][1]*hw*off;
        if(skip){pen=false;continue;} if(!pen){ctx.moveTo(x,y);pen=true;} else ctx.lineTo(x,y);}
      ctx.stroke();}
  };
  // размывка: мягкая заливка через размытую тень
  P.wash=function(pts,a,blur,col){col=col||INK;const p=pts.map(([x,y])=>[X(x),Y(y)]);
    ctx.save();ctx.shadowColor=`rgba(${col},${a})`;ctx.shadowBlur=S(blur||.02);ctx.shadowOffsetX=1e4;ctx.fillStyle='#000';
    ctx.beginPath();p.forEach(([x,y],i)=>i?ctx.lineTo(x-1e4,y):ctx.moveTo(x-1e4,y));ctx.closePath();ctx.fill();ctx.restore();};
  P.blot=function(x,y,rad,a,col){col=col||INK;const g=ctx.createRadialGradient(X(x),Y(y),0,X(x),Y(y),S(rad));
    g.addColorStop(0,`rgba(${col},${a})`);g.addColorStop(.7,`rgba(${col},${a*.75})`);g.addColorStop(1,`rgba(${col},0)`);
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(X(x),Y(y),S(rad),0,7);ctx.fill();};
  P.ell=function(cx,cy,rx,ry,a0,a1,n){const o=[];n=n||24;for(let i=0;i<=n;i++){const t=a0+(a1-a0)*i/n;o.push([cx+Math.cos(t)*rx,cy+Math.sin(t)*ry*W/H]);}return o;};
  P.disc=function(x,y,rad,col,a){ctx.fillStyle=`rgba(${col},${a==null?.9:a})`;ctx.beginPath();ctx.arc(X(x),Y(y),S(rad),0,7);ctx.fill();};
  P.mist=function(y,h,a){const g=ctx.createLinearGradient(0,Y(y-h),0,Y(y+h));g.addColorStop(0,'rgba(243,238,227,0)');g.addColorStop(.5,`rgba(243,238,227,${a||.85})`);g.addColorStop(1,'rgba(243,238,227,0)');ctx.fillStyle=g;ctx.fillRect(0,Y(y-h),W,Y(2*h));};
  // ---- мотивы ----
  P.mountains=function(base,peaks,a,blur){const pts=[[peaks[0][0]-.15,base]];peaks.forEach(([x,h])=>{pts.push([x-.06,base-h*.55]);pts.push([x,base-h]);pts.push([x+.07,base-h*.5]);});pts.push([peaks[peaks.length-1][0]+.2,base]);
    P.wash(pts,a||.18,blur||.025);};
  P.ridge=function(x0,x1,base,h,a){const pts=[];for(let i=0;i<=8;i++){const t=i/8;pts.push([x0+(x1-x0)*t,base-h*Math.sin(t*Math.PI)*(.7+.3*rnd())]);}P.stroke(pts,.006,{a:a||.5,dry:.6});};
  P.grass=function(x,base,n,h,spread,w,a){for(let i=0;i<n;i++){const bx=x+rr(-spread,spread),hh=h*rr(.5,1),lean=rr(-.06,.06);
      P.stroke([[bx,base],[bx+lean*.4,base-hh*.5],[bx+lean,base-hh]],w||.006,{a:a||.75,taper:[1,.8,.05],dry:.2});}};
  P.water=function(y0,y1,n,a){for(let i=0;i<n;i++){const y=y0+(y1-y0)*i/(n-1||1)+rr(-.01,.01),x=rr(-.05,.6),l=rr(.12,.4);
      P.stroke([[x,y],[x+l*.5,y+rr(-.006,.006)],[x+l,y]],.0035,{a:a||.35,dry:.5,taper:[.4,1,.2]});}};
  P.rain=function(n,ang,a,y0){for(let i=0;i<n;i++){const x=rr(-.1,1.05),y=rr(y0||0,1),l=rr(.06,.14);P.stroke([[x,y],[x+Math.sin(ang)*l,y+l*1.5]],.0025,{a:a||.3,dry:0,taper:[.6,1,.3]});}};
  P.ripples=function(x,y,n){for(let i=1;i<=n;i++)P.stroke(P.ell(x,y,.03*i,.008*i,0,6.3,30),.003,{a:.5-.1*i,dry:.4,taper:[.6,1,.6]});};
  P.branch=function(x,y,ang,len,w,depth,leaf){const x2=x+Math.cos(ang)*len,y2=y+Math.sin(ang)*len*W/H;
    const mx=(x+x2)/2+rr(-.02,.02),my=(y+y2)/2+rr(-.02,.02);P.stroke([[x,y],[mx,my],[x2,y2]],w,{a:.9,taper:[1,.8,.35],dry:.5});
    if(depth>0){const k=rnd()<.5?1:-1;P.branch(x2,y2,ang+k*rr(.35,.7),len*rr(.55,.75),w*.6,depth-1,leaf);
      if(rnd()<.75)P.branch(mx,my,ang-k*rr(.5,.9),len*rr(.35,.55),w*.5,depth-2,leaf);}
    else if(leaf) leaf(x2,y2,ang);};
  P.blossom=function(x,y,rad,col){for(let i=0;i<5;i++){const t=i*1.2566+rr(-.2,.2);P.blot(x+Math.cos(t)*rad*.6,y+Math.sin(t)*rad*.6*W/H,rad*.55,.55,col);}P.blot(x,y,rad*.2,.8,'120,40,20');};
  P.bird=function(x,y,s,flip){const f=flip?-1:1;P.stroke([[x-s*f,y-s*.25],[x-s*.4*f,y-s*.35],[x,y]],s*.18,{a:.85,taper:[.2,1,.3],dry:.2});P.stroke([[x,y],[x+s*.5*f,y-s*.45],[x+s*1.1*f,y-s*.3]],s*.18,{a:.85,taper:[.3,1,.2],dry:.2});};
  P.crow=function(x,y,s,flip){const f=flip?-1:1;P.wash(P.ell(x,y,s*.42,s*.26,0,6.3,20),.85,.004);P.blot(x+s*.38*f,y-s*.2,s*.18,.95);
    P.stroke([[x-s*.3*f,y+s*.05],[x-s*.75*f,y+s*.25]],s*.16,{a:.9,taper:[1,.8,.2]});P.stroke([[x+s*.5*f,y-s*.22],[x+s*.66*f,y-s*.18]],s*.05,{a:.9});
    P.stroke([[x,y+s*.2],[x+s*.05*f,y+s*.42]],s*.04,{a:.8});};
  P.frog=function(x,y,s,flip){const f=flip?-1:1;P.wash(P.ell(x,y,s*.5,s*.3,0,6.3,22),.55,.004,'46,64,40');
    P.blot(x+s*.3*f,y-s*.28,s*.11,.9);P.blot(x+s*.05*f,y-s*.3,s*.1,.9);
    P.stroke([[x-s*.4*f,y+s*.1],[x-s*.65*f,y+s*.35],[x-s*.3*f,y+s*.42]],s*.1,{a:.8});P.stroke([[x+s*.35*f,y+s*.15],[x+s*.55*f,y+s*.4]],s*.08,{a:.8});};
  P.fish=function(x,y,s,ang){const c=Math.cos(ang),si=Math.sin(ang);const T=(u,v)=>[x+(u*c-v*si)*s,y+(u*si+v*c)*s*W/H];
    P.stroke([T(-.6,0),T(-.1,-.18),T(.5,0)],s*.32,{a:.75,taper:[.3,1,.2],dry:.3});P.stroke([T(-.55,0),T(-.85,-.2)],s*.12,{a:.7});P.stroke([T(-.55,0),T(-.85,.18)],s*.12,{a:.7});
    P.blot(T(.32,-.04)[0],T(.32,-.04)[1],s*.04,.9);};
  P.butterfly=function(x,y,s,torn){P.wash(P.ell(x-s*.25,y-s*.15,s*.25,s*.32,0,6.3,18),.5,.003);if(!torn)P.wash(P.ell(x+s*.25,y-s*.15,s*.25,s*.32,0,6.3,18),.5,.003);
    P.wash(P.ell(x-s*.18,y+s*.18,s*.15,s*.18,0,6.3,16),.45,.003);P.wash(P.ell(x+s*.18,y+s*.18,s*.15,s*.18,0,6.3,16),.45,.003);
    P.stroke([[x,y-s*.3],[x,y+s*.3]],s*.06,{a:.95});P.stroke([[x,y-s*.3],[x-s*.15,y-s*.55]],s*.02,{a:.8});P.stroke([[x,y-s*.3],[x+s*.15,y-s*.55]],s*.02,{a:.8});};
  P.person=function(x,y,s){P.stroke([[x-s*.35,y-s*.95],[x,y-s*1.15],[x+s*.35,y-s*.95]],s*.12,{a:.9,taper:[.4,1,.4]});
    P.stroke([[x,y-s*.9],[x-s*.05,y-s*.4],[x-s*.12,y]],s*.25,{a:.8,taper:[.8,1,.5],dry:.4});P.stroke([[x+s*.2,y-s*.7],[x+s*.3,y+s*.02]],s*.04,{a:.8});};
  P.house=function(x,y,s){P.stroke([[x-s*.6,y-s*.45],[x,y-s*.85],[x+s*.6,y-s*.45]],s*.1,{a:.9,taper:[.5,1,.5]});
    P.stroke([[x-s*.45,y-s*.45],[x-s*.45,y]],s*.05,{a:.75});P.stroke([[x+s*.45,y-s*.45],[x+s*.45,y]],s*.05,{a:.75});P.stroke([[x-s*.5,y],[x+s*.5,y]],s*.04,{a:.6});};
  P.pagoda=function(x,y,s,n){n=n||5;for(let i=0;i<n;i++){const yy=y-i*s*.32,w=s*(.55-i*.07);P.stroke([[x-w,yy],[x,yy-s*.1],[x+w,yy]],s*.07,{a:.85,taper:[.5,1,.5]});P.stroke([[x-w*.6,yy],[x-w*.6,yy+s*.18]],s*.025,{a:.6});P.stroke([[x+w*.6,yy],[x+w*.6,yy+s*.18]],s*.025,{a:.6});}
    P.stroke([[x,y-n*s*.32],[x,y-n*s*.32-s*.35]],s*.03,{a:.85});};
  P.moon=function(x,y,rad,a){P.disc(x,y,rad,'233,226,207',1);P.stroke(P.ell(x,y,rad,rad*H/W,0,6.3,40),.003,{a:a||.35,dry:.6,taper:[.5,1,.5]});};
  P.sun=function(x,y,rad){P.disc(x,y,rad,'200,56,42',.85);};
  P.horse=function(x,y,s){P.wash(P.ell(x,y,s*.5,s*.22,0,6.3,20),.75,.003);P.stroke([[x+s*.4,y-s*.1],[x+s*.6,y-s*.45],[x+s*.75,y-s*.4]],s*.14,{a:.85});
    [[-.35,0],[-.2,.02],[.25,0],[.38,-.02]].forEach(([dx])=>P.stroke([[x+dx*s,y+s*.1],[x+dx*s+s*.03,y+s*.5]],s*.05,{a:.8}));
    P.stroke([[x-s*.48,y-s*.05],[x-s*.7,y+s*.25]],s*.06,{a:.8});P.person(x,y-s*.15,s*.45);};
  P.monkey=function(x,y,s){P.wash(P.ell(x,y,s*.3,s*.35,0,6.3,18),.7,.004);P.blot(x+s*.05,y-s*.45,s*.18,.85);P.blot(x+s*.1,y-s*.43,s*.07,.0,'240,220,200');
    P.stroke([[x-s*.25,y+s*.2],[x-s*.6,y+s*.35],[x-s*.7,y+s*.1]],s*.06,{a:.8});
    P.stroke([[x-s*.3,y-s*.2],[x,y-s*.33],[x+s*.32,y-s*.2]],s*.16,{a:.6,col:'150,120,60',dry:.7});};
  P.pot=function(x,y,s){P.wash([[x-s*.25,y-s*.45],[x+s*.25,y-s*.45],[x+s*.4,y-s*.1],[x+s*.3,y+s*.3],[x-s*.3,y+s*.3],[x-s*.4,y-s*.1]],.5,.004,'120,80,50');
    P.stroke(P.ell(x,y-s*.45,s*.25,s*.06,0,6.3,20),s*.04,{a:.8});};
  P.chrys=function(x,y,rad,col){for(let i=0;i<22;i++){const t=i/22*6.283+rr(-.1,.1),l=rad*rr(.7,1);P.stroke([[x,y],[x+Math.cos(t)*l,y+Math.sin(t)*l*W/H]],rad*.18,{a:.55,col,taper:[.2,1,.4],dry:.3});}P.blot(x,y,rad*.25,.7,'150,110,30');};
  P.poppy=function(x,y,rad){for(let i=0;i<5;i++){const t=i*1.2566;P.stroke(P.ell(x+Math.cos(t)*rad*.45,y+Math.sin(t)*rad*.45*W/H,rad*.5,rad*.4,t+1.6,t+5,14),.003,{a:.6,dry:.3,taper:[.4,1,.4]});}
    P.blot(x,y,rad*.18,.8,'60,70,40');};
  P.stars=function(n,band){for(let i=0;i<n;i++){const x=rnd(),y=band?band(x)+rr(-.06,.06):rnd()*.5;P.blot(x,y,rr(.002,.005),rr(.3,.8));}};
  P.seal=function(ch,x,y,s){const px=X(x),py=Y(y),ps=S(s);ctx.save();ctx.translate(px,py);ctx.rotate(-.03);
    ctx.fillStyle='rgba(196,48,36,.9)';ctx.beginPath();ctx.roundRect?ctx.roundRect(-ps/2,-ps/2,ps,ps,ps*.12):ctx.rect(-ps/2,-ps/2,ps,ps);ctx.fill();
    for(let i=0;i<40;i++){ctx.fillStyle='rgba(246,241,230,.35)';ctx.fillRect(rr(-ps/2,ps/2),rr(-ps/2,ps/2),rr(.5,2),rr(.5,2));}
    ctx.fillStyle='#f6f1e6';ctx.font=`${ps*.72}px KHKai, KHKaiB, serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(ch,0,ps*.04);ctx.restore();};
  P.enso=function(x,y,rad){const pts=P.ell(x,y,rad,rad,-1.2,4.6,40);P.stroke(pts,rad*.22,{a:.9,taper:[.9,1,.15],dry:.8});};
  return P;
}
const SC={
 rad:P=>{P.enso(.5,.5,.27);P.stroke([[.78,.22],[.86,.75]],.012,{a:.8,dry:.5});},
 buson1:P=>{P.mountains(.72,[[.3,.12],[.62,.08],[.85,.11]],.12);P.moon(.18,.3,.05);P.sun(.84,.52,.045);P.mist(.62,.06,.7);
   for(let i=0;i<260;i++){const x=P.rnd(),y=P.rr(.7,1);P.blot(x,y,P.rr(.004,.009),P.rr(.4,.8),'214,176,40');}
   P.grass(.5,1,40,.12,.5,.004,.5);},
 basho1:P=>{P.wash(P.ell(.55,.72,.42,.14,0,6.3,30),.14,.03);P.ripples(.6,.72,4);P.frog(.42,.58,.06,false);
   P.grass(.1,.85,14,.35,.06,.006);P.grass(.92,.8,8,.25,.04,.005);P.wash(P.ell(.2,.86,.07,.03,0,6.3,16),.5,.006);},
 buson3:P=>{P.mountains(.45,[[.25,.12],[.7,.1]],.1);P.wash([[0,.55],[1,.5],[1,.78],[0,.8]],.22,.02);P.water(.56,.76,8,.3);
   P.house(.78,.48,.06);P.house(.88,.5,.05);P.rain(90,.25,.25);},
 issa1:P=>{P.stroke([[0,.82],[.5,.8],[1,.83]],.004,{a:.4,dry:.7});P.horse(.72,.68,.16);P.crow(.2,.8,.05,true);P.grass(.05,.86,8,.08,.04,.004);},
 basho7:P=>{P.moon(.7,.2,.07);P.wash(P.ell(.5,.78,.45,.12,0,6.3,30),.13,.03);P.disc(.7,.77,.05,'233,226,207',.8);P.water(.72,.84,5,.25);
   P.person(.25,.7,.08);P.grass(.92,.75,10,.25,.04,.005);},
 kikaku:P=>{P.moon(.85,.15,.05);for(let i=0;i<4;i++)P.stroke([[.05+i*.25,.45],[.05+i*.25,1]],.003,{a:.25,dry:.3});P.stroke([[0,.45],[1,.45]],.003,{a:.25});P.stroke([[0,.72],[1,.72]],.003,{a:.2});
   P.branch(.05,.6,-.15,.32,.022,3,(x,y)=>{for(let k=0;k<5;k++)P.stroke([[x,y],[x+P.rr(-.04,.04),y+P.rr(-.06,-.01)]],.003,{a:.5,dry:.2});});},
 shiki1:P=>{P.mountains(.7,[[.6,.1]],.1);P.pagoda(.72,.66,.12,5);P.mist(.66,.05,.6);
   P.branch(.0,.15,.35,.35,.02,3,(x,y)=>{P.disc(x,y+.04,.022,'217,119,43',.95);P.stroke([[x-.01,y+.02],[x+.01,y+.02]],.004,{a:.8});});},
 chiyo1:P=>{P.wash([[.28,.8],[.72,.8],[.7,.97],[.3,.97]],.3,.006);P.stroke([[.28,.8],[.72,.8]],.008,{a:.8});P.stroke([[.36,.97],[.37,.22]],.012,{a:.85,dry:.5});P.stroke([[.64,.97],[.63,.22]],.012,{a:.85,dry:.5});P.stroke([[.3,.22],[.7,.21]],.014,{a:.9,taper:[.6,1,.6]});P.stroke([[.5,.22],[.5,.6]],.0035,{a:.7,dry:0});P.wash([[.46,.6],[.54,.6],[.535,.7],[.465,.7]],.6,.003,'110,80,50');P.stroke([[.46,.6],[.54,.6]],.004,{a:.8});const v=[[.5,.24],[.53,.32],[.47,.4],[.53,.48],[.48,.56]];P.stroke(v,.003,{a:.65,col:'60,90,50',dry:.2});[[.53,.32],[.47,.41],[.535,.49]].forEach(([x,y])=>P.blossom(x,y,.022,'70,90,170'));[[.49,.36],[.51,.45]].forEach(([x,y])=>P.blot(x,y,.01,.6,'60,100,50'));},
 issa2:P=>{P.frog(.32,.75,.07,false);P.frog(.68,.76,.1,true);P.grass(.5,.9,16,.1,.45,.004,.5);P.stroke([[.1,.88],[.9,.88]],.003,{a:.3});},
 ransetsu:P=>{P.branch(.02,.85,-.7,.35,.03,3,(x,y)=>{if(P.rnd()<.3)P.blot(x,y,.006,.6);});P.blossom(.42,.38,.03,'200,56,42');P.stars(25);},
 issa3:P=>{P.sun(.8,.3,.06);P.crow(.45,.78,.05,false);P.grass(.5,.88,22,.1,.5,.004,.55);P.stroke([[.0,.86],[1,.86]],.003,{a:.25});},
 basho6:P=>{P.wash([[0,0],[1,0],[1,.5],[0,.6]],.06,.05);P.branch(0,.3,.08,.45,.03,3);P.crow(.42,.27,.07,false);P.mist(.85,.12,.4);},
 buson2:P=>{P.sun(.5,.32,.05);P.stroke([[0,.45],[1,.45]],.003,{a:.3});for(let i=0;i<9;i++){const y=.5+i*.055;const pts=[];for(let k=0;k<=6;k++)pts.push([k/6,y+Math.sin(k*1.2+i)*.008]);P.stroke(pts,.003,{a:.35,dry:.5,taper:[.5,1,.5]});}},
 basho2:P=>{P.wash([[.15,1],[.3,.35],[.42,.3],[.55,.45],[.7,1]],.35,.01);P.stroke([[.15,1],[.28,.4],[.42,.3]],.012,{a:.8,dry:.7});P.stroke([[.42,.3],[.56,.45],[.7,1]],.01,{a:.7,dry:.8});
   P.house(.42,.29,.05);P.branch(.75,1,-1.6,.3,.015,2,(x,y)=>P.blot(x,y,.03,.5));P.blot(.5,.62,.008,.95);P.stroke([[.49,.62],[.47,.6]],.004,{a:.6});},
 shiki2:P=>{P.wash([[0,.75],[.3,.6],[.6,.7],[1,.62],[1,1],[0,1]],.08,.03);P.stroke([[0,.75],[.3,.6],[.6,.7],[1,.62]],.004,{a:.4,dry:.6});
   P.branch(.85,.95,-1.9,.35,.02,2);for(let i=0;i<80;i++)P.blot(P.rnd(),P.rnd()*.8,P.rr(.003,.007),.25);},
 basho8:P=>{P.stroke([[.36,1],[.34,.72],[.38,.52]],.008,{a:.7,col:'60,90,50'});P.stroke([[.35,.8],[.27,.72]],.005,{a:.5,col:'60,90,50'});P.poppy(.38,.42,.15);P.butterfly(.74,.26,.13,true);P.stroke([[.66,.33],[.56,.38],[.47,.4]],.002,{a:.3,dry:.8});P.blot(.5,.39,.008,.5);},
 basho9:P=>{P.wash([[.1,.7],[.42,.18],[.58,.18],[.9,.7]],.07,.01);P.stroke([[.42,.18],[.58,.18]],.004,{a:.25,dry:.8});
   P.mist(.35,.15,.92);P.mist(.6,.12,.9);P.person(.22,.88,.1);P.rain(60,.1,.12,.2);},
 basho3:P=>{P.mountains(.55,[[.7,.15]],.1);P.stroke([[.62,.47],[.66,.42],[.74,.42],[.78,.47]],.006,{a:.5});P.grass(.5,1,70,.4,.55,.006,.6);},
 basho4:P=>{P.stars(120,x=>.12+x*.2);P.wash([[0,.15],[1,.45],[1,.55],[0,.25]],.05,.05);P.wash([[.55,.62],[.7,.55],[.9,.57],[1,.62]],.4,.01);
   for(let i=0;i<7;i++){const y=.68+i*.045;const pts=[];for(let k=0;k<=8;k++)pts.push([k/8,y+Math.sin(k*2+i*1.7)*.02]);P.stroke(pts,.005,{a:.5,dry:.6});}},
 basho5:P=>{P.grass(.5,1,60,.18,.55,.004,.45);const path=[[.05,.95],[.3,.8],[.2,.65],[.55,.55],[.4,.42],[.8,.35]];P.stroke(path,.003,{a:.25,dry:.9,taper:[.5,1,.1]});
   P.mist(.5,.2,.5);P.moon(.85,.15,.03,.2);},
 basho10:P=>{[[.2,.2],[.28,.15],[.36,.22],[.6,.12],[.68,.18]].forEach(([x,y])=>P.bird(x,y,.025,false));P.wash([[0,.6],[1,.58],[1,1],[0,1]],.12,.03);
   P.water(.62,.95,7,.25);P.fish(.45,.78,.09,-.2);P.fish(.7,.86,.06,.3);P.blot(.505,.755,.006,.6,'90,120,170');},
 basho11:P=>{P.mountains(.4,[[.15,.2],[.85,.18]],.18);P.wash([[0,.9],[.6,.35],[.85,.35],[.4,1]],.2,.02);
   for(let i=0;i<14;i++){const t=P.rnd();P.stroke([[.08+t*.45,.95-t*.5],[.2+t*.5,.8-t*.5]],.004,{a:.5,dry:.6});}P.rain(70,.2,.2);},
 basho14:P=>{P.mountains(.55,[[.3,.18],[.75,.25]],.14);P.stroke([[.05,1],[.3,.82],[.5,.75],[.8,.6]],.006,{a:.4,dry:.8});P.grass(.4,.95,20,.08,.3,.004,.5);
   [[.3,.9],[.36,.92],[.48,.88],[.25,.95]].forEach(([x,y])=>P.blossom(x,y,.012,'110,70,160'));},
 basho15:P=>{P.wash([[0,1],[.45,.38],[.6,.42],[1,1]],.25,.01);P.stroke([[0,1],[.45,.38],[.6,.42],[1,1]],.006,{a:.6,dry:.7});P.person(.52,.42,.07);
   P.bird(.3,.62,.02,false);P.wash(P.ell(.2,.3,.12,.03,0,6.3,20),.08,.03);P.wash(P.ell(.82,.25,.1,.025,0,6.3,20),.08,.03);},
 basho16:P=>{P.branch(1,.25,3.0,.5,.03,2);P.monkey(.62,.4,.09);P.rain(80,.15,.18);},
 basho17:P=>{P.branch(.8,1,-1.7,.4,.03,3);for(let i=0;i<10;i++){const y=P.rr(.15,.6);P.stroke([[P.rr(0,.3),y],[P.rr(.4,.9),y-.05]],.003,{a:.3,dry:.8});}
   P.person(.35,.88,.11);P.grass(.5,1,40,.12,.5,.004,.5);},
 basho18:P=>{P.moon(.78,.2,.06);P.house(.3,.6,.12);P.grass(.65,.95,30,.25,.18,.004,.6);
   for(let i=0;i<30;i++)P.blot(P.rr(.5,.85),P.rr(.7,.9),P.rr(.006,.01),.6,'150,90,170');},
 basho19:P=>{P.moon(.78,.15,.05);P.stroke([[0,.35],[.3,.34],[.7,.36],[1,.35]],.004,{a:.4});P.wash([[0,.36],[1,.36],[1,1],[0,1]],.1,.02);P.pot(.35,.82,.14);P.pot(.64,.86,.12);P.blot(.35,.69,.035,.65,'120,60,60');for(let k=0;k<4;k++)P.stroke([[.34+k*.01,.71],[.3+k*.02,.76],[.33+k*.03,.8]],.004,{a:.55,col:'120,60,60'});P.water(.45,.6,4,.15);},
 basho12:P=>{P.house(.55,.85,.3);P.wash([[.45,.68],[.65,.68],[.65,.82],[.45,.82]],.25,.01,'230,180,90');
   P.branch(.0,.3,.2,.35,.025,3,(x,y)=>P.blot(x,y+.02,.01,.6,'190,90,40'));for(let i=0;i<8;i++)P.blot(P.rr(.1,.9),P.rr(.4,.9),.006,.5,'190,90,40');},
 basho13:P=>{P.stroke([[.1,1],[.35,.75],[.45,.6],[.5,.5]],.02,{a:.3,dry:.8,taper:[1,.6,.05]});P.stroke([[.9,1],[.65,.75],[.55,.6],[.5,.5]],.02,{a:.3,dry:.8,taper:[1,.6,.05]});
   P.branch(.8,.95,-1.75,.35,.02,3);P.wash([[0,0],[1,0],[1,.45],[0,.5]],.07,.05);},
 basho20:P=>{P.stroke(P.ell(.7,.47,.12,.12,0,6.3,40),.004,{a:.35,dry:.6,taper:[.5,1,.5]});P.wash([[.58,.88],[.6,.66],[.64,.55],[.76,.55],[.8,.66],[.82,.88]],.55,.008);P.wash(P.ell(.7,.88,.17,.04,0,6.3,24),.55,.006);P.blot(.7,.47,.045,.75);P.blot(.7,.41,.02,.6);P.mist(.97,.05,.4);P.chrys(.24,.76,.08,'200,160,40');P.chrys(.38,.86,.055,'200,200,190');P.grass(.3,1,10,.1,.15,.004,.5);},
};
function render(cv,id,seal){const keyN=[...id].reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,7);const P=painter(cv,keyN);P.paper();(SC[id]||SC.rad)(P);if(seal)P.seal(seal,.93,.88,.075);}
function el(id,seal,cls){const cv=document.createElement('canvas');cv.width=720;cv.height=480;cv.className='sumi '+(cls||'');cv.setAttribute('role','img');cv.setAttribute('aria-label','Иллюстрация тушью');
  const go=()=>{try{render(cv,id,seal);}catch(e){}};
  if(document.fonts&&document.fonts.load) document.fonts.load('40px KHKai','夢').then(go,go); else go();
  return cv;}

// ---- фон: бледные белые картины на чёрном (портретный формат) ----
const BG={
 bamboo:{jp:'竹',ru:'бамбук',f:P=>{
   [[.72,1.02,.66,.05,.03],[.86,1.02,.9,.12,.022],[.6,1.02,.52,.3,.016]].forEach(([x0,y0,x1,y1,w])=>{
     const segs=7;for(let i=0;i<segs;i++){const t0=i/segs+.008,t1=(i+1)/segs-.008;
       P.stroke([[x0+(x1-x0)*t0,y0+(y1-y0)*t0],[x0+(x1-x0)*t1,y0+(y1-y0)*t1]],w,{a:.85,taper:[.9,.75,.9],dry:.25});
       const nx=x0+(x1-x0)*t1,ny=y0+(y1-y0)*t1;P.stroke([[nx-w*.9,ny+.004],[nx+w*.9,ny-.004]],w*.3,{a:.9,dry:.1});}});
   const leaf=(x,y,a,l)=>P.stroke([[x,y],[x+Math.cos(a)*l*.5,y+Math.sin(a)*l*.5*P.W/P.H],[x+Math.cos(a)*l,y+Math.sin(a)*l*P.W/P.H]],.035,{a:.8,taper:[.25,1,.02],dry:.15});
   [[.7,.3],[.66,.18],[.88,.35],[.84,.22],[.56,.42]].forEach(([x,y])=>{const n=4;for(let i=0;i<n;i++)leaf(x,y,P.rr(-2.9,-.2)+(i%2?1.2:0),P.rr(.14,.24));});}},
 orchid:{jp:'蘭',ru:'орхидея',f:P=>{
   const bx=.66,by=.97;
   [[-.42,.62,.5],[-.3,.75,.62],[-.12,.8,.55],[.12,.7,.42],[.22,.5,.6],[-.55,.38,.45],[.02,.9,.3]].forEach(([dx,h,bend])=>{
     P.stroke([[bx,by],[bx+dx*.35,by-h*.55],[bx+dx*.75,by-h*.92],[bx+dx*(1+bend*.4),by-h*(1-bend*.35)]],.011,{a:.85,taper:[.7,1,.02],dry:.15});});
   [[.44,.58],[.5,.5],[.4,.66]].forEach(([x,y])=>{for(let i=0;i<5;i++){const a=-1.57+(i-2)*.7;P.stroke([[x,y],[x+Math.cos(a)*.04,y+Math.sin(a)*.025]],.01,{a:.8,taper:[.3,1,.15]});}P.blot(x,y,.004,.9);});
   P.stroke([[.64,.95],[.55,.75],[.48,.62],[.44,.56]],.003,{a:.6});}},
 plum:{jp:'梅',ru:'слива',f:P=>{
   P.stroke([[1.02,.98],[.86,.78],[.88,.62],[.74,.48]],.06,{a:.85,taper:[1,.9,.5],dry:.7});
   P.branch(.74,.48,-2.4,.28,.03,3);P.branch(.87,.66,-2.9,.3,.022,2);P.branch(.8,.55,-1.6,.22,.018,2);
   for(let i=0;i<14;i++){const x=P.rr(.35,.9),y=P.rr(.2,.6);const r=P.rr(.02,.03);
     P.stroke(P.ell(x,y,r,r*.9,0,6.3,18),.0025,{a:.75,dry:.2,taper:[.6,1,.6]});P.blot(x,y,.003,.9);}}},
 chrys:{jp:'菊',ru:'хризантема',f:P=>{
   [[.68,.38,.11],[.82,.56,.08],[.55,.6,.07]].forEach(([x,y,r])=>{
     for(let i=0;i<26;i++){const a=i/26*6.283+P.rr(-.1,.1),l=r*P.rr(.55,1);P.stroke([[x+Math.cos(a)*l*.25,y+Math.sin(a)*l*.25*P.W/P.H],[x+Math.cos(a)*l,y+Math.sin(a)*l*P.W/P.H]],r*.12,{a:.7,taper:[.3,1,.5],dry:.2});}
     const sx=x+P.rr(-.05,.05);P.stroke([[x,y+r*.6],[sx,1.02]],.006,{a:.7});
     for(let k=0;k<3;k++){const yy=P.rr(y+.12,.95),side=k%2?1:-1;P.stroke([[ (x+sx)/2,yy],[(x+sx)/2+side*.06,yy-.02],[(x+sx)/2+side*.1,yy+.01]],.03,{a:.6,taper:[.3,1,.1],dry:.3});}});}},
 pine:{jp:'松',ru:'сосна',f:P=>{
   P.stroke([[.95,1.02],[.82,.8],[.9,.6],[.7,.42],[.45,.36]],.05,{a:.85,taper:[1,.8,.3],dry:.7});
   P.stroke([[.82,.55],[.98,.45]],.02,{a:.8,dry:.6});
   [[.45,.34],[.58,.38],[.72,.4],[.97,.43],[.86,.6]].forEach(([x,y])=>{for(let i=0;i<16;i++){const a=-3.14+i/15*3.14;P.stroke([[x,y],[x+Math.cos(a)*.06,y+Math.sin(a)*.03]],.002,{a:.7,dry:0});}});}},
 lotus:{jp:'蓮',ru:'лотос',f:P=>{
   P.stroke([[.6,1.02],[.62,.8],[.6,.56]],.006,{a:.75});P.stroke([[.82,1.02],[.8,.84],[.84,.7]],.006,{a:.7});P.stroke([[.4,1.02],[.42,.9],[.38,.82]],.005,{a:.6});
   P.wash(P.ell(.84,.68,.15,.05,0,6.3,30),.3,.006,'240,236,228');P.stroke(P.ell(.84,.68,.15,.05,.2,6.1,30),.004,{a:.6,dry:.4});
   for(let i=0;i<6;i++){const a=-1.4+i*.6;P.stroke([[.84,.68],[.84+Math.cos(a)*.13,.68+Math.sin(a)*.04]],.002,{a:.4});}
   for(let i=-3;i<=3;i++){const a=-1.57+i*.33;P.stroke([[.6,.56],[.6+Math.cos(a)*.08,.56+Math.sin(a)*.08],[.6+Math.cos(a)*.16,.56+Math.sin(a)*.16*P.W/P.H]],.05-Math.abs(i)*.005,{a:.55,taper:[.3,1,.05],dry:.2});}
   P.wash(P.ell(.38,.8,.035,.02,0,6.3,16),.4,.004,'240,236,228');P.stroke(P.ell(.38,.8,.035,.02,0,6.3,16),.003,{a:.6});}}
};
function renderBg(cv,key,alpha){const d=BG[key]||BG.bamboo;const old=INK;INK='240,236,228';
  const P=painter(cv,[...key].reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,11)+(Date.now()%997));
  P.ctx.clearRect(0,0,cv.width,cv.height);P.ctx.save();P.ctx.globalAlpha=alpha||.16;try{d.f(P);}catch(e){}P.ctx.restore();INK=old;}

// ---- свиток пути: плавная трава тушью сквозь кружки (белым по чёрному) ----
function renderPath(cv,key,pts,alpha){const old=INK;INK='240,236,228';
  const P=painter(cv,[...key].reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,5)+(Date.now()%991));
  const ctx=P.ctx,W=P.W,H=P.H;P.ctx.clearRect(0,0,W,H);ctx.save();ctx.globalAlpha=alpha||.26;
  const rnd=P.rnd,rr=P.rr;
  // точки в пикселях и сглаженный сплайн через все кружки
  const U=W/390;const nodes=pts.map(([x,y])=>[x*W,y*H]);
  const px=[[nodes[0][0],Math.max(0,nodes[0][1]-120*U)],...nodes,[nodes[nodes.length-1][0],nodes[nodes.length-1][1]+120*U]];
  const spline=[];for(let i=0;i<px.length-1;i++){const p0=px[i-1]||px[i],p1=px[i],p2=px[i+1],p3=px[i+2]||p2;
    const n=Math.max(8,Math.ceil(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])/4));
    for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t;spline.push([
      .5*(2*p1[0]+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
      .5*(2*p1[1]+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]);}}
  spline.push(px[px.length-1]);
  const N=spline.length;const tan=i=>{const a=spline[Math.max(0,i-2)],b=spline[Math.min(N-1,i+2)];const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return [dx/l,dy/l];};
  // мягкий мазок: переменная ширина, сухой край
  function blade(path,w0,w1,a,dry){if(path.length<2)return;const n=path.length;const nor=[];
    for(let i=0;i<n;i++){const p=path[Math.max(0,i-1)],q=path[Math.min(n-1,i+1)];const dx=q[0]-p[0],dy=q[1]-p[1],l=Math.hypot(dx,dy)||1;nor.push([-dy/l,dx/l]);}
    const wd=t=>{const sw=Math.sin(Math.min(1,t*1.15)*Math.PI*.5);return (w0+(w1-w0)*t)*(t<.12?t/.12:1)*(1-Math.pow(t,3)*.92)*(.85+.15*sw);};
    ctx.fillStyle=`rgba(${INK},${a*.7})`;ctx.beginPath();
    for(let i=0;i<n;i++){const t=i/(n-1),w=wd(t);ctx.lineTo(path[i][0]+nor[i][0]*w,path[i][1]+nor[i][1]*w);}
    for(let i=n-1;i>=0;i--){const t=i/(n-1),w=wd(t);ctx.lineTo(path[i][0]-nor[i][0]*w,path[i][1]-nor[i][1]*w);}
    ctx.closePath();ctx.fill();
    const B=Math.max(3,Math.min(9,Math.round(w0/1.2)));ctx.lineCap='round';
    for(let bI=0;bI<B;bI++){const off=B>1?(bI/(B-1))*2-1:0;ctx.strokeStyle=`rgba(${INK},${a*rr(.25,.55)})`;ctx.lineWidth=Math.max(.6,w0*2/B);ctx.beginPath();let pen=false;
      for(let i=0;i<n;i++){const t=i/(n-1);if(t>1-dry*rr(.3,1)&&Math.abs(off)>.3&&rnd()<.4){pen=false;continue;}
        const w=wd(t)*.9,x=path[i][0]+nor[i][0]*w*off,y=path[i][1]+nor[i][1]*w*off;if(!pen){ctx.moveTo(x,y);pen=true;}else ctx.lineTo(x,y);}ctx.stroke();}}
  // одна травинка: растёт из точки, изгибается и клонится по ветру
  function grass(x,y,ang,len,w,bend,a){const path=[];const steps=26;let cx=x,cy=y,ca=ang;
    for(let i=0;i<=steps;i++){path.push([cx,cy]);const t=i/steps;ca+=bend*(.4+t*1.6)/steps;cx+=Math.cos(ca)*len/steps;cy+=Math.sin(ca)*len/steps;}
    blade(path,w,w*.25,a,.4);return path[path.length-1];}
  // 1) главная линия: длинный стебель, плавно идущий через все кружки
  const nrm=i=>{const [tx,ty]=tan(i);return [-ty,tx];};
  function strand(off,w,a,phase,amp,freq){ctx.strokeStyle=`rgba(${INK},${a})`;ctx.lineWidth=w;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
    let L=0;for(let i=0;i<N;i++){if(i)L+=Math.hypot(spline[i][0]-spline[i-1][0],spline[i][1]-spline[i-1][1]);const [nx,ny]=nrm(i);
      const o=off+(amp?Math.sin(L/freq+phase)*amp:0);const x=spline[i][0]+nx*o,y=spline[i][1]+ny*o;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}
  strand(0,4.2*U,.55,0,0,1);                       // основной стебель
  for(let k=0;k<5;k++)strand(rr(-1.6,1.6)*U,rr(.7,1.3)*U,rr(.35,.6),0,0,1); // волокна кисти
  strand(0,1.6*U,.55,0,14*U,90*U);                  // вьющийся побег вокруг стебля
  strand(0,1.1*U,.4,Math.PI,9*U,60*U);
  const ORDER=['bamboo','plum','orchid','chrys','pine','lotus'];const start=Math.max(0,ORDER.indexOf(key));
  // 2) трава вдоль линии
  let acc=0;for(let i=6;i<N-6;i++){const d=Math.hypot(spline[i][0]-spline[i-1][0],spline[i][1]-spline[i-1][1]);acc+=d;
    if(acc<rr(24,44)*U)continue;acc=0;
    const ang=-Math.PI/2+rr(-.55,.15);const len=rr(60,150)*U;
    grass(spline[i][0],spline[i][1],ang,len,rr(1.2,2.8)*U,rr(.7,1.5),rr(.4,.75));
    if(rnd()<.35)grass(spline[i][0],spline[i][1],ang-rr(.2,.5),len*rr(.5,.8),rr(1,2)*U,rr(.9,1.8),rr(.35,.6));}
  // 3) пучки у каждого кружка и растение дня между ними
  for(let i=0;i<nodes.length;i++){const [x,y]=nodes[i];const R=46*U;const kind=ORDER[(start+i)%ORDER.length];
    for(let k=0;k<5;k++){const ang=-Math.PI/2+rr(-.7,.3);grass(x+rr(-R*.6,R*.6),y+R*.8,ang,rr(60,120)*U,rr(1.4,2.6)*U,rr(.6,1.4),rr(.45,.75));}
    if(i===nodes.length-1)break;
    const [qx,qy]=nodes[i+1],mx=(x+qx)/2,my=(y+qy)/2+18*U,side=qx>=x?-1:1;
    const fx=Math.min(W-40*U,Math.max(40*U,mx+side*125*U)),fy=my;
    // ветка-ответвление от стебля к растению
    const bpath=[];for(let k=0;k<=20;k++){const t=k/20;bpath.push([mx+(fx-mx)*t,my+18*U-Math.sin(t*Math.PI)*22*U-(t*10*U)]);}
    blade(bpath,2.2*U,1*U,.7,.3);
    const tip=bpath[bpath.length-1];
    if(kind==='bamboo'){for(let k=0;k<4;k++){const ang=(side>0?.15:Math.PI-.15)+(k-1.5)*.32;grass(tip[0],tip[1],ang,rr(70,95)*U,rr(4,5.5)*U,(side>0?1:-1)*rr(.3,.7),.7);}
      blade([[tip[0],tip[1]-40*U],[tip[0]+2*U,tip[1]+40*U]],3.5*U,3*U,.75,.1);P.stroke([[ (tip[0]-6*U)/W,tip[1]/H],[(tip[0]+6*U)/W,tip[1]/H]],.006,{a:.9});}
    else if(kind==='plum'){[[0,0,18],[-16,-26,14],[20,-34,12],[-30,8,11]].forEach(([dx,dy,r])=>{const cx=tip[0]+dx*U*side,cy=tip[1]+dy*U;
        for(let k=0;k<5;k++){const a2=k*1.2566+.3;ctx.strokeStyle=`rgba(${INK},.85)`;ctx.lineWidth=1.3*U;ctx.beginPath();ctx.arc(cx+Math.cos(a2)*r*U*.55,cy+Math.sin(a2)*r*U*.55,r*U*.48,0,7);ctx.stroke();}
        P.blot(cx/W,cy/H,.007,.9);for(let k=0;k<5;k++){const a2=k*1.2566;blade([[cx,cy],[cx+Math.cos(a2)*r*U*.35,cy+Math.sin(a2)*r*U*.35]],.8*U,.4*U,.8,0);}});}
    else if(kind==='orchid'){for(let k=0;k<4;k++)grass(tip[0],tip[1]+30*U,-Math.PI/2+side*rr(.1,.9),rr(80,130)*U,rr(2.2,3)*U,side*rr(.7,1.4),.75);
      [[0,0],[14,-22],[-10,-40]].forEach(([dx,dy])=>{const cx=tip[0]+dx*U,cy=tip[1]+dy*U;for(let k=0;k<5;k++){const a2=-Math.PI/2+(k-2)*.75;grass(cx,cy,a2,rr(14,20)*U,4*U,(k-2)*.2,.8);}P.blot(cx/W,cy/H,.005,.9);});}
    else if(kind==='chrys'){[[0,0,24],[side*34,-16,17]].forEach(([dx,dy,r])=>{const cx=tip[0]+dx*U,cy=tip[1]+dy*U;
        for(let k=0;k<30;k++){const a2=k/30*6.283,l=r*U*rr(.7,1);blade([[cx+Math.cos(a2)*l*.2,cy+Math.sin(a2)*l*.2],[cx+Math.cos(a2)*l*.6,cy+Math.sin(a2)*l*.6],[cx+Math.cos(a2)*l,cy+Math.sin(a2)*l]],2*U,1*U,.75,.2);}P.blot(cx/W,cy/H,.008,.8);});
      for(let k=0;k<2;k++)grass(tip[0],tip[1]+14*U,(side>0?.3:Math.PI-.3)+k*.5*side,40*U,7*U,.3,.55);}
    else if(kind==='pine'){[[0,0],[side*30,-18],[side*-18,-26]].forEach(([dx,dy])=>{const cx=tip[0]+dx*U,cy=tip[1]+dy*U;for(let k=0;k<22;k++){const a2=-Math.PI+k/21*Math.PI;grass(cx,cy,a2,rr(30,40)*U,.9*U,0,.75);}});}
    else {const cx=tip[0],cy=tip[1];
      P.wash(P.ell(cx/W,(cy+20*U)/H,58*U/W,16*U/W,0,6.3,30),.28,.006,'240,236,228');P.stroke(P.ell(cx/W,(cy+20*U)/H,58*U/W,16*U/W,.2,6.1,30),.004,{a:.65,dry:.4});
      for(let k=-3;k<=3;k++){const a2=-Math.PI/2+k*.36;grass(cx+side*30*U,cy-26*U,a2,(34-Math.abs(k)*4)*U,(9-Math.abs(k))*U,k*.15,.6);}
      blade([[cx+side*30*U,cy-24*U],[cx+side*26*U,cy+18*U]],1.6*U,1.4*U,.7,.1);}
  }
  ctx.restore();INK=old;}

return {el,render,SC,BG,renderBg,renderPath};
})();
