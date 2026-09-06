import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rows = [
  ['visual-34',3,'forum','Roman Forum / columns and archaeological layers','ForumRomanumColumns_10050024c.jpg','Túrelio / Wikimedia Commons','https://commons.wikimedia.org/wiki/File:ForumRomanumColumns_10050024c.jpg','architecture','午前'],
  ['visual-35',6,'oltrarno','Oltrarno / residential street texture','Oltrarno.JPG','Lorenzo Testa / Wikimedia Commons','https://commons.wikimedia.org/wiki/File:Oltrarno.JPG','street','午后'],
  ['visual-36',8,'bridge_sighs','Bridge of Sighs / canal axis','Bridge of Sighs, Venice (30127461850).jpg','Vassilis Online / Wikimedia Commons','https://commons.wikimedia.org/wiki/File:Bridge_of_Sighs,_Venice_(30127461850).jpg','architecture','上午'],
  ['visual-37',12,'st_vitus','St. Vitus / nave and vertical scale','St vitus cathedral interior.jpg','PerSona77 / Wikimedia Commons','https://commons.wikimedia.org/wiki/File:St_vitus_cathedral_interior.jpg','interior','上午'],
  ['visual-38',12,'mala_strana','Malá Strana / winter morning street','Malá Strana January 2026.jpg','Wikimedia Commons contributor','https://commons.wikimedia.org/wiki/File:Malá_Strana_January_2026.jpg','street','午后'],
  ['visual-39',16,'sacre_coeur','Sacré-Cœur / night facade','Basilique du Sacré Coeur at night.jpg','AlfvanBeem / Wikimedia Commons','https://commons.wikimedia.org/wiki/File:Basilique_du_Sacré_Coeur_at_night.jpg','night','蓝调/夜景'],
];
const imagesPath = path.join(root,'data','images.json');
const images = JSON.parse(fs.readFileSync(imagesPath,'utf8')).filter((image)=>!rows.some((row)=>row[0]===image.id));
for (const [id,dayId,placeId,caption,fileName,credit,sourcePage,type,timeOfDay] of rows) {
  const output = path.join(root,'public','images',`${id}.webp`);
  if (!fs.existsSync(output)) {
    const url = `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(fileName)}?width=1600`;
    const response = await fetch(url,{headers:{'user-agent':'PersonalTravelGuide/1.0 (local project)'}});
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize(1600,1200,{fit:'inside',withoutEnlargement:true}).webp({quality:82}).toFile(output);
  }
  images.push({id,day:dayId,dayId,placeId,file:`/images/${id}.webp`,key:id,caption,use:type==='interior'?'室内空间':type==='night'?'夜景':type==='street'?'街景环境':'建筑细节',role:'stop',type,timeOfDay,bestTime:timeOfDay,focalLength:type==='interior'?'24–35mm':'35–50mm',composition:type==='street'?'人物沿街道边缘行走，保留纵深':'用建筑轴线表现尺度，人物只作比例',credit,sourcePage,sourceType:'real_photo',visuallyReviewed:true,duplicateAllowed:false,lastVerified:'2026-09-06'});
}
images.sort((a,b)=>a.dayId-b.dayId||a.id.localeCompare(b.id));
fs.writeFileSync(imagesPath,`${JSON.stringify(images,null,2)}\n`);
console.log(`Added ${rows.length} stop images; total ${images.length}`);
