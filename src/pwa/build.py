import re,json,shutil,os,sys
VERSION=sys.argv[1]
A='/home/claude/app'; F='/home/claude/pwa/flat'
t=open(A+'/template.html',encoding='utf8').read()
t=re.sub(r'<link rel="preconnect"[^>]*>\n','',t)
t=re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>\n','',t)
fonts='''@font-face{font-family:"Golos Text";src:url(Golos.woff) format("woff");font-weight:400 700;font-display:swap}
@font-face{font-family:"Klee One";src:url(KleeOne-400.woff) format("woff");font-weight:400;font-display:swap}
@font-face{font-family:"Klee One";src:url(KleeOne-600.woff) format("woff");font-weight:600;font-display:swap}
@font-face{font-family:"Shippori Mincho";src:url(Shippori-500.woff) format("woff");font-weight:500;font-display:swap}
@font-face{font-family:"Shippori Mincho";src:url(Shippori-700.woff) format("woff");font-weight:700;font-display:swap}
@font-face{font-family:"Yuji Syuku";src:url(YujiSyuku.woff) format("woff");font-weight:400;font-display:swap}
:root{color-scheme:dark;background:#0B0B0C}
html,body{margin:0;height:100%;overflow:hidden}
body{margin:0;overscroll-behavior:none;-webkit-text-size-adjust:100%}
img{max-width:100%}[hidden]{display:none!important}
'''
t=t.replace('<style>','<style>\n'+fonts,1)
title=re.search(r'<title>.*?</title>\n',t).group(0); t=t.replace(title,'')
head='''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
'''+title+'''<meta name="description" content="Иероглифы, порядок черт и каллиграфия на хокку Басё и его последователей">
<meta name="theme-color" content="#0B0B0C">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="発句">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" type="image/png" href="icon-192.png">
<link rel="manifest" href="manifest.webmanifest">
<link rel="preload" href="KleeOne-400.woff" as="font" type="font/woff" crossorigin>
'''
t=t.replace('<div id="app">','</head>\n<body>\n<div id="app">',1)
t=head+t
data=''.join(open(A+'/'+f,encoding='utf8').read()+'\n' for f in ['data.js', 'keep.js', 'wave5.js', 'strokes.js', 'ann.js', 'pics.js', 'calvar.js', 'sumi.js', 'scenes2.js', 'expl.js', 'expl2.js', 'bio.js', 'kigo.js', 'ko.js', 'order.js', 'hl.js'])
t=t.replace('/*CALFONTS*/',open(A+'/calfonts.css').read()).replace('/*DATA*/',data).replace('/*APP*/',open(A+'/app.js',encoding='utf8').read())
t+='''<script>
if('serviceWorker' in navigator){addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{});});}
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist();}catch(e){}
</script>
</body>
</html>
'''
open(F+'/index.html','w',encoding='utf8').write(t)
sw=open(F+'/sw.js').read()
sw=re.sub(r"const VERSION='[^']*';",f"const VERSION='{VERSION}';",sw)
open(F+'/sw.js','w').write(sw)
print('built',VERSION,os.path.getsize(F+'/index.html'))
