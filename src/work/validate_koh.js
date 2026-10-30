// usage: node validate_koh.js file1.json file2.json ... -> writes /home/claude/app/koh.js
const fs=require('fs');
const src=fs.readFileSync('/home/claude/app/hl.js','utf8')+';module.exports={hlParse,hlLines}';
fs.writeFileSync('/tmp/claude-0/hlmod.js',src);const {hlParse,hlLines}=require('/tmp/claude-0/hlmod.js');
const exist=new Set(require('/tmp/claude-0/u4.js').UNITS.filter(u=>u.lines).map(u=>u.lines.join('')));
let all=[],bad=0;const seen=new Set();
for(const f of process.argv.slice(2)){const arr=JSON.parse(fs.readFileSync(f,'utf8'));
  for(const e of arr){const errs=[];
    if(!(e.ko>=1&&e.ko<=72))errs.push('ko');
    if(!Array.isArray(e.j)||e.j.length!==3)errs.push('j3');if(!Array.isArray(e.k)||e.k.length!==3)errs.push('k3');
    const J=hlLines(e.hj||'').map(l=>l.map(s=>s.s).join(''));if(JSON.stringify(J)!==JSON.stringify(e.j))errs.push('hj '+JSON.stringify(J)+' vs '+JSON.stringify(e.j));
    const K=hlLines(e.hk||'').map(l=>l.map(s=>s.s).join(''));if(JSON.stringify(K)!==JSON.stringify(e.k))errs.push('hk '+JSON.stringify(K)+' vs '+JSON.stringify(e.k));
    if(hlParse(e.hc||'').map(s=>s.s).join('')!==e.c)errs.push('hc');
    if(hlParse(e.ht||'').map(s=>s.s).join('')!==e.t)errs.push('ht');
    if(!e.src)errs.push('src');
    const key=(e.j||[]).join('');if(exist.has(key))errs.push('dup-app');if(seen.has(key))errs.push('dup');seen.add(key);
    if(errs.length){bad++;console.log('BAD',f,e.ko,key,errs.join('; '));}
    all.push(e);}}
all.sort((a,b)=>a.ko-b.ko);
const cnt={};all.forEach(e=>cnt[e.ko]=(cnt[e.ko]||0)+1);
console.log('total',all.length,'bad',bad);console.log(Object.entries(cnt).map(([k,v])=>k+':'+v).join(' '));
fs.writeFileSync('/tmp/claude-0/koh_all.json',JSON.stringify(all,null,1));
