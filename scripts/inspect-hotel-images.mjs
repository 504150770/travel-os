for (const url of ['https://www.vecchiaromaresort.it/it/camere','https://www.hotelmorandi.it/en/rooms/','https://www.hotel-bb.com/en/hotel/wien-meidling']) {
  const html=await (await fetch(url)).text();
  console.log('\nURL',url,'len',html.length);
  const images=[...html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)].map((match)=>match[1]);
  console.log(images.slice(0,30).join('\n'));
  const singleAt=html.indexOf('Single Room');
  if(singleAt>=0){
    console.log('AFTER SINGLE');
    console.log([...html.slice(singleAt,singleAt+50000).matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)].slice(0,12).map((match)=>match[1]).join('\n'));
  }
}
