import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtemp,symlink,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import vm from 'node:vm';
// Exercise the actual file:// transport with a Windows URL, without a browser policy override.
const source=await readFile('js/assets.js','utf8'),snapshot=await readFile('js/studio-data.js','utf8');
const scripts=[];
const sandbox={URL,URLSearchParams,location:{protocol:'file:',search:''},fetch(){throw Error('Local assets must not use fetch')}};
sandbox.window=sandbox;
sandbox.document={baseURI:'file:///D:/Project%20Car%20Dashboard/Components/studio-preview.html',createElement(){return{}},head:{append(script){scripts.push(script.src);vm.runInContext(snapshot,sandbox);script.onload()}}};
vm.createContext(sandbox);vm.runInContext(source,sandbox);
const fileCatalog=await sandbox.LumenAssets.json('catalog/components.json');assert.equal(fileCatalog.items.length,524);
assert.equal(scripts.length,1);assert.equal(scripts[0],'file:///D:/Project%20Car%20Dashboard/Components/js/studio-data.js');
const cssPath=sandbox.LumenAssets.path(new URL('../tokens/colors.css',new URL('components/buttons.css',sandbox.document.baseURI)));assert.equal(cssPath,'tokens/colors.css');assert((await sandbox.LumenAssets.text(cssPath)).includes('--indigo-700'));
assert((await sandbox.LumenAssets.text('templates/core.html')).includes('<template id="dialog">'));
console.log('PASS file transport: Windows drive, spaces, relative CSS imports, catalog, templates, one snapshot load, no fetch');
const directory=await mkdtemp(join(tmpdir(),'Lumen preview project '));
await symlink(resolve('.'),join(directory,'Components'),'dir');await symlink(resolve('.'),join(directory,'Components with spaces'),'dir');
let browser,server;
try{
 server=spawn('python3',['-m','http.server','8125','--bind','127.0.0.1','--directory',directory],{stdio:'ignore'});
 for(let n=0;n<50;n++){try{if((await fetch('http://127.0.0.1:8125')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
 const errors=[];let page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.addInitScript(()=>{window.fetch=()=>{throw Error('Offline previews must not fetch local assets')}});
 const fileURL=pathToFileURL(join(directory,'Components','studio-preview.html')).href;
 let direct=true,studioURL=fileURL,exampleURL=pathToFileURL(join(directory,'Components','example.html')).href;
 try{await page.goto(studioURL)}catch(error){
  if(!String(error).includes('ERR_BLOCKED_BY_ADMINISTRATOR'))throw error;
  direct=false;studioURL='http://127.0.0.1:8125/Components%20with%20spaces/studio-preview.html?offline=1';exampleURL='http://127.0.0.1:8125/Components%20with%20spaces/example.html?offline=1';
  console.log('SKIP browser file:// navigation: managed Chromium administrator policy blocks the scheme; validating the same snapshot transport over HTTP');await page.close();page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.addInitScript(()=>{window.fetch=()=>{throw Error('Offline previews must not fetch local assets')}});await page.goto(studioURL);
 }
 await page.waitForFunction(()=>window.LumenStudio);assert.equal(await page.locator('#category-nav a').count(),12);assert(await page.locator('#load-error').isHidden());
 const inventory=await page.evaluate(async()=>{const target=document.createElement('div');document.body.append(target);let count=0;const failures=[];for(const item of LumenStudio.catalog.items){try{const preview=await LumenStudio.preview(item,target);if(preview.host.dataset.ready!=='true')throw Error('Preview not ready');preview.destroy();count++}catch(e){failures.push(item.key+': '+e.message)}}target.remove();return{count,failures}});
 assert.equal(inventory.count,524);assert.deepEqual(inventory.failures,[]);
 await page.goto(studioURL+'#buttons');await page.waitForFunction(()=>window.LumenStudio);await page.locator('[data-key="buttons/solid"] .preview-host[data-ready=true]').waitFor();assert.equal(await page.locator('[data-key="buttons/solid"] .row').count(),2);
 await page.locator('[aria-label="Inspect Solid"]').click();await page.locator('[data-inspect=html]').click();assert((await page.locator('#inspector-body pre').textContent()).includes('class="b'));await page.locator('[data-inspect=css]').click();await page.waitForFunction(()=>document.querySelector('#inspector-body pre')?.textContent.includes('.btn'));await page.locator('#inspector-close').click();
 await page.locator('#search').fill('combobox');assert.equal(await page.locator('.example-card').count(),1);await page.locator('[aria-label="Inspect Searchable combobox"]').click();await page.locator('#inspector-body .preview-host[data-ready=true]').waitFor();const combo=page.locator('#inspector-body').getByRole('combobox');await combo.fill('sy');await combo.press('ArrowDown');await combo.press('Enter');assert.equal(await combo.inputValue(),'Sydney');await page.locator('#inspector-close').click();
 await page.goto(exampleURL+(direct?'?':'&')+'item=core/dialog');await page.locator('#example[data-ready=true]').waitFor();await page.getByRole('button',{name:'Open modal dialog'}).click();assert(await page.getByRole('dialog').isVisible());await page.keyboard.press('Escape');assert.deepEqual(errors,[]);
 // HTTP mode also resolves CSS imports from a subdirectory containing encoded spaces.
 const hosted=await context.newPage();hosted.on('pageerror',e=>errors.push(e.message));await hosted.goto('http://127.0.0.1:8125/Components%20with%20spaces/studio-preview.html#buttons');await hosted.waitForFunction(()=>window.LumenStudio);await hosted.locator('[data-key="buttons/solid"] .preview-host[data-ready=true]').waitFor();await hosted.locator('[aria-label="Inspect Solid"]').click();await hosted.locator('[data-inspect=css]').click();await hosted.waitForFunction(()=>document.querySelector('#inspector-body pre')?.textContent.includes('.btn'));assert.deepEqual(errors,[]);
 console.log(`PASS ${direct?'direct-file browser':'offline browser'}: ${inventory.count} previews without fetch, inspection, search, interactions, standalone page, paths with spaces, HTTP subdirectory`);
}finally{await browser?.close();server?.kill();await rm(directory,{recursive:true,force:true})}
