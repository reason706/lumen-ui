import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import {chromium,expect} from '@playwright/test';
const registry=JSON.parse(await readFile('naming/classes.json','utf8'));
const catalog=JSON.parse(await readFile('catalog/components.json','utf8'));
let checked=0;
for(const [file,{classes}] of Object.entries(registry.templates)){
 const source=await readFile(file,'utf8'),allowed=new Set(Object.values(classes));
 for(const owner of ['badge','chip'])for(const appearance of ['solid','tonal','outline','ghost','link'])allowed.add(owner+'-style-'+appearance);
 for(const match of source.matchAll(/class="([^"]*)"/g))for(const name of match[1].split(/\s+/).filter(Boolean)){
  assert(allowed.has(name)||name==='color-gradient-violet',file+' unknown canonical class '+name);
  assert(!name.startsWith('lm-'),file+' old public name '+name);checked++;
 }
}
assert.equal(catalog.items.length,524);
for(const item of catalog.items){assert(item.wrapper,item.key+' wrapper');assert(item.css.every(x=>x.includes('/public-')||x==='components/appearance.css'),item.key+' canonical styles')}
const root=resolve('.'),types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));assert(path.startsWith(root+'/'));const body=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'text/plain'});res.end(body)}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage();await page.route(/fonts\./,r=>r.abort());
 await page.goto(base+'/example.html?item=core/cards');await page.locator('#example[data-ready=true]').waitFor();
 assert.equal(await page.locator('.card-style-gradient .btn').evaluate(n=>getComputedStyle(n).color),'rgb(255, 255, 255)','Gradient card actions retain readable ink after merging style names');
 // Use the full bundle together: no Shadow DOM and no old classes in the sample.
 await page.evaluate(url=>new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=url;link.onload=resolve;link.onerror=reject;document.head.append(link)}),base+'/lumen.css');
 await page.evaluate(()=>{
  document.getElementById('example').innerHTML=`<article class="card card-style-raised color-blue size-lg" id="mixed-card">
   <h2 class="heading-lg font-serif weight-bold text-center" id="type-probe">Settings</h2>
   <p class="text-sm text-muted leading-relaxed">Manage your account.</p>
   <button class="btn color-red" id="default-button">Delete</button>
   <button class="btn btn-style-tonal color-red size-xl" id="tonal-button">Delete</button>
   <button class="btn btn-icon btn-style-outline color-red size-xl" id="icon-button" aria-label="Add">+</button>
   <button class="btn btn-style-tonal color-gradient-violet" id="gradient-button">Continue</button>
   <span class="badge badge-style-solid color-red size-sm" id="badge-probe">New</span>
   <input class="input color-blue size-lg" aria-label="Name" value="Lumen" id="input-probe">
   <progress class="progress color-red size-lg" value="50" max="100" aria-label="Progress" id="progress-probe"></progress>
   <span class="avatar color-red size-lg" id="avatar-probe">AB</span>
   <div class="dropdown"><button class="btn" data-lm-menu-toggle aria-expanded="false">Actions</button><div class="menu" role="menu" hidden><button role="menuitem">Save</button></div></div>
   <div class="card card-style-outline p-4" id="nested-card"><button class="btn" id="nested-button">Nested default</button></div>
  </article>
  <div class="lm-scope"><button class="lm-btn lm-btn--outline lm-info" id="old-core">Old core</button></div>
  <div class="buttons-preview"><button class="b ib soft k-success" aria-label="Old icon" id="old-icon">+</button></div>`;
  LumenUI.mount(document).refresh();
 });
 const metric=selector=>page.locator(selector).evaluate(n=>{const c=getComputedStyle(n),r=n.getBoundingClientRect();return{height:r.height,width:r.width,padding:c.paddingTop,font:c.fontSize,weight:c.fontWeight,bg:c.backgroundColor,image:c.backgroundImage,shadow:c.boxShadow}});
 assert.equal((await metric('#default-button')).height,44,'Card size must not resize its child button');
 assert.equal((await metric('#nested-button')).height,44);
 assert.equal((await metric('#mixed-card')).padding,'28px');assert.notEqual((await metric('#mixed-card')).shadow,'none');
 assert.equal((await metric('#tonal-button')).height,62);assert.equal((await metric('#icon-button')).width,62);assert.equal((await metric('#icon-button')).height,62);
 assert.equal((await metric('#input-probe')).height,52);
 assert.equal((await metric('#progress-probe')).height,12);assert.equal((await metric('#avatar-probe')).width,52);
 assert.equal(await page.locator('#progress-probe').evaluate(n=>getComputedStyle(n).accentColor),'rgb(239, 68, 68)');
 assert.equal((await metric('#type-probe')).weight,'700');assert.equal((await metric('#type-probe')).font,'36px');assert.equal((await metric('#badge-probe')).font,'12px');
 assert.notEqual(await page.locator('#tonal-button').evaluate(n=>getComputedStyle(n).color),await page.locator('body').evaluate(n=>getComputedStyle(n).color),'Regular tonal ink must not inherit text after matching a gradient-only rule');
 const red='rgb(239, 68, 68)';assert.equal((await metric('#default-button')).bg,red);assert.equal((await metric('#badge-probe')).bg,red);
 await page.locator('#tonal-button').hover();await expect.poll(async()=>(await metric('#tonal-button')).bg).toBe(red);
 await page.locator('#icon-button').hover();await expect.poll(async()=>(await metric('#icon-button')).bg).toBe(red);
 const rest=await metric('#gradient-button');assert.equal(rest.image,'none');await page.locator('#gradient-button').hover();await expect.poll(async()=>(await metric('#gradient-button')).image).toContain('linear-gradient');
 await page.getByRole('button',{name:'Actions',exact:true}).click();assert(await page.getByRole('menu').isVisible());await page.keyboard.press('Escape');assert(await page.getByRole('menu').isHidden());
 assert.equal((await metric('#old-core')).height,44);assert.equal((await metric('#old-icon')).width,44);
 for(const key of ['core/cards','core/choices','buttons/solid','forms/inputs-text','navigation/tabs-underline-live']){
  const item=catalog.items.find(x=>x.key===key);if(!item)continue;
  await page.goto(base+'/studio-preview.html#'+item.key);await page.waitForFunction(()=>window.LumenStudio);
  const markup=await page.evaluate(key=>LumenStudio.markup(LumenStudio.catalog.items.find(x=>x.key===key)),item.key);
  assert(!/class="[^"]*\blm-/.test(markup),key+' export uses old classes');
 }
 console.log(`PASS naming: ${checked} canonical class uses, 524 catalog entries, mixed components without Shadow DOM, typography, color/gradient states, shared sizes, native interactions and old aliases`);
}finally{await browser?.close();await new Promise(r=>server.close(r))}
