const { chromium } = require('/opt/codex/runtimes/cua/lib/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = __dirname;
const labels = {readiness:'出发准备',bookings:'订单',transport:'交通',checkin:'在线入住',deadlines:'关键日期',tasks:'待办'};
const results = {sourceSHA:'395cb61c36be1ddb77b8693981d8b8dd3b95fd81',targetSHA:'a44eb943a4f37f3d1bd14b21e20563a86ce90267',cases:[],screenshots:[],pageErrors:[],externalRequestsBlocked:[],scope:'Fresh isolated browser contexts; local app only; UI and browser-history navigation; no real profiles/accounts/business edits.'};
let browser;
if(process.env.RESUME==='1') {
 const previous=JSON.parse(fs.readFileSync(path.join(out,'browser-results.json'),'utf8'));
 Object.assign(results,previous);
 results.cases=results.cases.filter(c=>c.status);
 results.evidenceCorrections=['First mobile Home screenshot guard incorrectly treated offscreen horizontal carousel lazy images as visible because it only checked y bounds. No invalid mobile screenshot was saved. Corrected guard checks both x and y visibility, then waits for actual visible images to finish loading. Completed browser cases retained; incomplete cases rerun.'];
 delete results.error;delete results.status;
}
const pause = ms => new Promise(r=>setTimeout(r,ms));
async function stable(page) {
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 await pause(450);
}
async function screenshot(page,name) {
 await stable(page);
 await page.waitForFunction(()=>[...document.images].every(i=>{const r=i.getBoundingClientRect();return !(r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth)||(i.complete&&i.naturalWidth>0);}));
 const measurements=await page.evaluate(()=>({width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,scrollY,activeTab:document.querySelector('.subnav button.active,.mobile-plan-tabs button.active')?.textContent.trim()??null,url:location.href,visibleBrokenImages:[...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&(!i.complete||i.naturalWidth===0);}).map(i=>i.getAttribute('src'))}));
 assert.ok(measurements.documentWidth<=measurements.width,`overflow ${name}`);
 assert.deepEqual(measurements.visibleBrokenImages,[],`broken images ${name}`);
 await page.screenshot({path:path.join(out,name),fullPage:false});
 results.screenshots.push({name,...measurements});
}
async function assertBudget(page,width) {
 await page.waitForURL(u=>u.searchParams.get('view')==='plan'&&u.searchParams.get('tab')==='budget',{waitUntil:'domcontentloaded'});
 const active=page.locator(width>767?'.subnav button.active':'.mobile-plan-tabs button.active');
 await active.filter({hasText:'预算'}).waitFor();
 await page.locator(width>767?'.budget-summary':'.mobile-budget-card').waitFor();
 assert.equal(await active.textContent(),'预算');
}
async function contextFor(width,height) {
 const context=await browser.newContext({viewport:{width,height},isMobile:width<768,hasTouch:width<768,deviceScaleFactor:1});
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(['localhost','127.0.0.1'].includes(u.hostname)||['data:','blob:'].includes(u.protocol))return route.continue();results.externalRequestsBlocked.push(u.origin);return route.abort();});
 return context;
}
async function runCase(width,height,previousTab,base='http://localhost:3103',expectedFixed=true) {
 const context=await contextFor(width,height);const page=await context.newPage();
 page.on('pageerror',error=>results.pageErrors.push({width,previousTab,message:error.message}));
 const record={width,height,previousTab,base,expectedFixed,stages:[]};results.cases.push(record);
 await page.goto(`${base}/?view=home&tab=${previousTab}#budget-nav-check`,{waitUntil:'domcontentloaded'});
 await page.locator('[data-home-mounted-at]').waitFor({timeout:60000});
 if(width>767){await page.locator('.side-nav nav').getByRole('button',{name:'Plan',exact:true}).click();}
 else {await page.getByRole('button',{name:'查看详情',exact:true}).click();}
 await page.waitForURL(u=>u.searchParams.get('view')==='plan',{waitUntil:'domcontentloaded'});
 const tabs=page.locator(width>767?'.subnav':'.mobile-plan-tabs');
 await tabs.getByRole('button',{name:labels[previousTab],exact:true}).click();
 await page.waitForURL(u=>u.searchParams.get('tab')===previousTab,{waitUntil:'domcontentloaded'});
 await tabs.locator('button.active').filter({hasText:labels[previousTab]}).waitFor();
 record.stages.push({action:'select non-budget tab through real UI',url:page.url()});
 if(width>767){await page.locator('.side-nav nav').getByRole('button',{name:'Home',exact:true}).click();}
 else {await page.evaluate(()=>history.go(-2));}
 await page.locator('[data-home-mounted-at]').waitFor();
 await page.waitForURL(u=>u.searchParams.get('view')==='home',{waitUntil:'domcontentloaded'});
 record.returnHome=width>767?'visible Home nav button':'browser history.go(-2), mobile Plan has no Home nav button';
 record.stages.push({action:record.returnHome,url:page.url()});
 if(previousTab==='bookings'&&expectedFixed){await page.getByRole('button',{name:'查看明细',exact:true}).scrollIntoViewIfNeeded();await screenshot(page,`home-before-budget-${width}.png`);}
 const beforeLength=await page.evaluate(()=>history.length);
 await page.getByRole('button',{name:'查看明细',exact:true}).click();
 await page.waitForURL(u=>u.searchParams.get('view')==='plan',{waitUntil:'domcontentloaded'});
 await page.locator(width>767?'.budget-summary':'.mobile-budget-card').waitFor();
 record.budgetURL=page.url();
 record.historyDelta=await page.evaluate(()=>history.length)-beforeLength;
 // Mobile history.go(-2) truncates forward entries, so history.length is not
 // a count of action pushes. Back/Forward destinations establish that instead.
 if(width>767)assert.equal(record.historyDelta,1);
 if(!expectedFixed){
  assert.equal(new URL(page.url()).searchParams.get('tab'),previousTab);
  await screenshot(page,`baseline-budget-url-mismatch-${width}.png`);
  await page.reload({waitUntil:'domcontentloaded'});
  await tabs.locator('button.active').filter({hasText:labels[previousTab]}).waitFor();
  await screenshot(page,`baseline-reload-old-tab-${width}.png`);
  record.reloadedTab=await tabs.locator('button.active').textContent();record.status='baseline defect reproduced';
  await context.close();return;
 }
 await assertBudget(page,width);
 if(previousTab==='bookings')await screenshot(page,`budget-after-click-${width}.png`);
 await page.reload({waitUntil:'domcontentloaded'});await assertBudget(page,width);await stable(page);
 record.stages.push({action:'real browser reload retains Budget',url:page.url()});
 if(previousTab==='bookings')await screenshot(page,`budget-after-refresh-${width}.png`);
 await page.goBack({waitUntil:'domcontentloaded'});await page.locator('[data-home-mounted-at]').waitFor();
 assert.equal(new URL(page.url()).searchParams.get('view'),'home');
 record.stages.push({action:'Back returns directly to Home',url:page.url()});
 if(previousTab==='bookings')await screenshot(page,`home-after-back-${width}.png`);
 await page.goForward({waitUntil:'domcontentloaded'});await assertBudget(page,width);
 record.stages.push({action:'Forward returns directly to Budget',url:page.url()});
 const reopened=await context.newPage();await reopened.goto(page.url(),{waitUntil:'domcontentloaded'});await assertBudget(reopened,width);await stable(reopened);
 record.stages.push({action:'new page reopened URL retains Budget',url:reopened.url()});
 if(previousTab==='bookings')await screenshot(reopened,`budget-reopened-${width}.png`);
 await reopened.close();
 for(let repeat=0;repeat<3;repeat++){
  await page.goBack({waitUntil:'domcontentloaded'});await page.locator('[data-home-mounted-at]').waitFor();
  await page.getByRole('button',{name:'查看明细',exact:true}).click();await assertBudget(page,width);
  record.stages.push({action:`repeat budget click ${repeat+1}`,url:page.url()});
 }
 await page.goBack({waitUntil:'domcontentloaded'});await page.locator('[data-home-mounted-at]').waitFor();
 assert.equal(new URL(page.url()).searchParams.get('view'),'home');
 await page.goForward({waitUntil:'domcontentloaded'});await assertBudget(page,width);
 record.status='passed';console.log(`PASS ${width} ${previousTab}`);await context.close();
}
(async()=>{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 results.browserVersion=browser.version();
 if(!results.cases.some(c=>c.status==='baseline defect reproduced'))await runCase(1440,1000,'bookings','http://localhost:3104',false);
 for(const [width,height] of [[1440,1000],[375,812],[390,844]])for(const tab of Object.keys(labels))if(!results.cases.some(c=>c.width===width&&c.previousTab===tab&&c.expectedFixed&&c.status==='passed'))await runCase(width,height,tab);
 assert.deepEqual(results.pageErrors,[]);
 results.status='passed';
})().catch(error=>{results.status='failed';results.error=error.stack;console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();results.externalRequestsBlocked=[...new Set(results.externalRequestsBlocked)];fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2)+'\n');});
