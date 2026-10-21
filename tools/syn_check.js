const fs=require('fs');const h=fs.readFileSync(process.argv[2],'utf8');
const bs=[...h.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
try{new Function(bs.join('\n;\n'));console.log('OK',bs.length)}catch(e){console.log('ERR',e.message);
 bs.forEach((b,i)=>{try{new Function(b)}catch(e){console.log(' block',i,e.message)}})}
