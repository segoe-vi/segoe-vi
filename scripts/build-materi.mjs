// Membaca folder materi/ (bersarang, format apa pun) -> data/materi.json
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.env.MATERI_DIR||'materi';
const OUT=process.env.MATERI_OUT||'data/materi.json';
const nat=(a,b)=>a.localeCompare(b,'id',{numeric:true,sensitivity:'base'});
const skip=n=>n.startsWith('.')||n.startsWith('~$')||/^(thumbs\.db|desktop\.ini)$/i.test(n);
function walk(dir,rel){
  const kids=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(skip(e.name))continue;
    const abs=path.join(dir,e.name),r=[...rel,e.name];
    if(e.isDirectory())kids.push({type:'dir',name:e.name,children:walk(abs,r)});
    else if(e.isFile()){const s=fs.statSync(abs);const ext=path.extname(e.name).slice(1).toLowerCase();
      let target=null;
      if(ext==='url'||ext==='link'){const t=fs.readFileSync(abs,'utf8').slice(0,4000);target=(t.match(/^\s*URL\s*=\s*(\S+)/im)||t.match(/(https?:\/\/\S+)/i)||[])[1]||null;}
      if(target&&/^https?:\/\//i.test(target)){kids.push({type:'file',name:e.name.replace(/\.[^.]+$/,''),ext,size:s.size,mtime:s.mtime.toISOString().slice(0,10),url:ROOT.split('/').concat(r).map(encodeURIComponent).join('/'),target});continue;}
      kids.push({type:'file',name:e.name,ext,size:s.size,mtime:s.mtime.toISOString().slice(0,10),
        url:ROOT.split('/').concat(r).map(encodeURIComponent).join('/')});}
  }
  return kids.sort((a,b)=>(a.type===b.type?nat(a.name,b.name):a.type==='dir'?-1:1));
}
if(!fs.existsSync(ROOT)){console.error('Folder tidak ada:',ROOT);process.exit(1);}
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify({generated:new Date().toISOString(),root:{type:'dir',name:'Materi Kuliah',children:walk(ROOT,[])}},null,1));
console.log('materi.json dibuat dari',ROOT);
