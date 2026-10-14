import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const catalog=JSON.parse(await readFile('catalog/components.json','utf8')),axe=await readFile('node_modules/axe-core/axe.min.js','utf8');
const server=spawn('python3',['-m','http.server','8124','--bind','127.0.0.1'],{stdio:'ignore'});
const base='http://127.0.0.1:8124';let browser;
try{
 for(let n=0;n<50;n++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage();let checks=0;const issues=[];
 for(const theme of ['light','dark','oled','cyberpunk','obsidian','arctic','sport','luxury']){
  for(const item of catalog.items.filter(x=>x.source==='core')){
   await page.goto(base+'/example.html?item='+encodeURIComponent(item.key)+'&theme='+theme);await page.locator('#example[data-ready=true]').waitFor();await page.addScriptTag({content:axe});
   if(item.id==='validation')await page.getByRole('button',{name:'Validate form'}).click();
   if(item.id==='popover')await page.locator('[popovertarget]').click();
   if(item.id==='dropdown'||item.id==='split-button')await page.locator('[data-lm-menu-toggle]').click();
   if(['dialog','drawer','command','lightbox'].includes(item.id))await page.locator('[data-lm-dialog]').click();
   const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('#example'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target),summary:v.nodes.map(n=>n.failureSummary)}))});if(violations.length)issues.push({theme,key:item.key,violations});checks++;
   await page.setViewportSize({width:390,height:844});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)issues.push({theme,key:item.key,overflow:true});await page.setViewportSize({width:1280,height:720});
  }
 }
 assert.deepEqual(issues,[],'Public core accessibility or responsive regression');console.log(`PASS themes: ${checks} core/theme accessibility audits and narrow layout checks (including open dialogs)`);
}finally{await browser?.close();server.kill()}
