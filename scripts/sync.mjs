// Sinkronisasi bulanan: PDDikti (profil) + Google Scholar via SerpApi (publikasi).
// Aman: jika sumber gagal/kosong, file lama TIDAK ditimpa.
import fs from 'node:fs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const profile=read('data/profile.json');
const now=new Date().toISOString().slice(0,10);
let failed=false;

// 1) PDDikti (best-effort; API tidak resmi -> ubah PDDIKTI_API bila perlu)
try{
  const base=process.env.PDDIKTI_API||'https://api-pddikti.ridwaanhall.com';
  const r=await fetch(`${base}/dosen/profile/${encodeURIComponent(profile.pddiktiId)}`,{headers:{'user-agent':'Mozilla/5.0'}});
  if(!r.ok)throw new Error('PDDikti HTTP '+r.status);
  const d=await r.json();const p=Array.isArray(d)?d[0]:d;
  if(!p||!(p.nama_dosen||p.nama))throw new Error('PDDikti respons kosong');
  const m={nama:p.nama_dosen||p.nama,pt:p.nama_pt,prodi:p.nama_prodi,jabatan:p.jabatan_akademik||p.jabfung,pendidikan:p.pendidikan_tertinggi,ikatanKerja:p.ikatan_kerja||p.status_ikatan_kerja,status:p.status_aktivitas||p.status_saat_ini};
  for(const [k,v] of Object.entries(m))if(v)profile[k]=v;
  profile.updated=now;fs.writeFileSync('data/profile.json',JSON.stringify(profile,null,2));
  console.log('PDDikti OK');
}catch(e){console.warn('PDDikti dilewati:',e.message);failed=true;}

// 2) Google Scholar via SerpApi
try{
  const key=process.env.SERPAPI_API_KEY;if(!key)throw new Error('SERPAPI_API_KEY belum diset');
  const items=[];
  for(let start=0;start<500;start+=100){
    const u=`https://serpapi.com/search.json?engine=google_scholar_author&author_id=${profile.scholarId}&hl=id&num=100&start=${start}&api_key=${key}`;
    const r=await fetch(u);if(!r.ok)throw new Error('SerpApi HTTP '+r.status);
    const d=await r.json();const a=d.articles||[];
    for(const x of a){
      const year=+(x.year||0),venue=x.publication||'';
      const cat=/prosiding|proceeding|conference|seminar|symposium/i.test(venue)?'prosiding':/buku|book/i.test(venue)?'buku':'jurnal';
      items.push({year,cat,title:x.title,authors:x.authors||'',meta:venue,desc:`Dikutip ${x.cited_by?.value||0} kali di Google Scholar.`,cite:`${x.authors||''} (${year||'t.t.'}). ${x.title}. ${venue}.`,isNew:year>=new Date().getFullYear()-1,link:x.link||''});
    }
    if(a.length<100)break;
  }
  if(!items.length)throw new Error('Scholar kosong, data lama dipertahankan');
  fs.writeFileSync('data/publications.json',JSON.stringify({updated:now,items},null,2));
  console.log('Scholar OK:',items.length,'publikasi');
}catch(e){console.warn('Scholar gagal:',e.message);failed=true;}
process.exit(failed?1:0);
