import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sets={
  'rome-vecchia':{
    roomName:'Domus Emilia · Single Room',roomArea:'待官网确认',bedType:'1张单人床',refundableRoomMatch:'目标日期可退价对应房型仍需付款页确认',
    source:'https://www.vecchiaromaresort.it/it/camere',
    urls:['https://res.cloudinary.com/amenitiz/image/upload/w_1400,dpr_auto,f_auto,q_auto:good/v1645018923/rhjhxginxyeetn3mljal.jpg','https://res.cloudinary.com/amenitiz/image/upload/w_1400,dpr_auto,f_auto,q_auto:good/v1645018927/j8omxksqw3lnhs0mbdh6.jpg','https://res.cloudinary.com/amenitiz/image/upload/w_1400,dpr_auto,f_auto,q_auto:good/v1645018933/iizcgjp6yky21qf8evlg.jpg']
  }
};
const file=path.join(root,'data','hotels.json');
const data=JSON.parse(fs.readFileSync(file,'utf8'));
for(const hotel of data.hotels){
  const set=sets[hotel.id]; if(!set) continue;
  hotel.roomName=set.roomName; hotel.roomArea=set.roomArea; hotel.bedType=set.bedType; hotel.refundableRoomMatch=set.refundableRoomMatch;
  hotel.roomImages=[];
  for(let index=0;index<3;index+=1){
    const target=path.join(root,'public','images',`${hotel.id}-room-${index+1}.webp`);
    if(!fs.existsSync(target)){
      const response=await fetch(set.urls[index],{headers:{'user-agent':'PersonalTravelGuide/1.0'}});if(!response.ok)throw new Error(`${response.status} ${set.urls[index]}`);
      await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize(1400,1050,{fit:'inside',withoutEnlargement:true}).webp({quality:82}).toFile(target);
    }
    hotel.roomImages.push({id:`${hotel.id}-room-${index+1}`,file:`/images/${hotel.id}-room-${index+1}.webp`,caption:index===0?'Single Room整体与床':index===1?'Single Room空间与窗户/收纳':'Single Room私人卫浴或另一视角',status:'官网房型页已关联',source:set.source});
  }
}
const vienna=data.hotels.find((hotel)=>hotel.id==='vienna-bnb');
if(vienna){vienna.roomName='Single Room';vienna.roomArea='待官网确认';vienna.bedType='1张法式床 140×200cm';vienna.refundableRoomMatch='目标日期可退价对应Single Room仍需付款页确认';vienna.privateBathroom='官网确认：淋浴、WC、洗手台';vienna.airConditioning='官网确认：房内空调；冬季运行与暖气控制待确认';vienna.frontDesk='官网：平日06:00–22:00；周末/节假日缩短';vienna.lateArrival='22:00后自助入住流程需书面确认';vienna.rating='4.4 / 5';vienna.ratingCount='719';}
const morandi=data.hotels.find((hotel)=>hotel.id==='florence-morandi');
if(morandi){morandi.roomName='Single Room';morandi.roomArea='8㎡';morandi.bedType='1人单人房；床宽待确认';morandi.refundableRoomMatch='目标日期可退价对应Single Room仍需付款页确认';morandi.roomImages=[1,2,3].map((n)=>({id:`${morandi.id}-room-${n}`,file:null,caption:n===1?'Single Room整体与单人床':n===2?'窗户、书桌与收纳':'私人卫浴或另一核心视角',status:'房型图片待确认',source:null}));}
fs.writeFileSync(file,`${JSON.stringify(data,null,2)}\n`);
console.log('Verified room-photo sets:',Object.keys(sets).length);
