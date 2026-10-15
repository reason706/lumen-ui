import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const server=spawn('python3',['-m','http.server','8126','--bind','127.0.0.1'],{stdio:'ignore'});const base='http://127.0.0.1:8126';let browser;
try{
 for(let n=0;n<50;n++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1100}});await page.route(/fonts\./,r=>r.abort());
 await page.goto(base+'/studio-preview.html#foundations');await page.waitForFunction(()=>window.LumenStudio);
 const paletteCard=page.locator('[data-key="foundations/semantic-palette"]');await paletteCard.scrollIntoViewIfNeeded();await paletteCard.locator('.preview-host[data-ready=true]').waitFor();
 const palette=await paletteCard.locator('.color-grid>div').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>[[...n.childNodes].find(x=>x.nodeType===3)?.textContent.trim().toLowerCase(),getComputedStyle(n.querySelector('.color-swatch')).backgroundColor])));
 palette.secondary=palette.muted;palette.dark=palette.ink;palette.light=palette.surface;
 const gradientsCard=page.locator('[data-key="foundations/gradients"]');await gradientsCard.scrollIntoViewIfNeeded();await gradientsCard.locator('.preview-host[data-ready=true]').waitFor();const gradients=await gradientsCard.locator('.color-swatch').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).backgroundImage));
 await page.goto(base+'/studio-preview.html#buttons');await page.waitForFunction(()=>window.LumenStudio);
 assert.equal(await page.locator('[data-key="core/buttons-solid"]').count(),0);assert.equal(await page.locator('[data-key="buttons/gradient-buttons"]').count(),0);
 const data=await page.evaluate(()=>LumenStudio.catalog);for(const key of ['core/buttons-solid','core/buttons-tonal','core/buttons-outline','core/buttons-ghost','core/buttons-link','core/button-sizes','core/button-states','core/button-group','core/split-button','buttons/gradient-buttons'])assert(data.aliases[key],key+' alias');
 const solid=page.locator('[data-key="buttons/solid"]');await solid.scrollIntoViewIfNeeded();await solid.locator('.preview-host[data-ready=true]').waitFor();for(const [name,color] of Object.entries(palette).filter(([n])=>['primary','secondary','success','info','warning','danger','dark','light'].includes(n)))assert.equal(await solid.locator('.color-'+name).evaluate(n=>getComputedStyle(n).backgroundColor),color,name+' Foundation color');
 for(let i=1;i<=8;i++)assert.equal(await solid.locator('.color-gradient-'+['violet','ocean','sunset','candy','forest','midnight','rose','aurora'][i-1]).evaluate(n=>getComputedStyle(n).backgroundImage),gradients[i-1],'Gradient '+i+' matches Foundations');
 let stateChecks=0;
 for(const [key,selector,gradient] of [['buttons/soft-tinted','.btn.btn-style-tonal.color-info',false],['buttons/outline','.btn.btn-style-outline.color-success',false],['buttons/soft-tinted','.btn.btn-style-tonal.color-gradient-violet',true],['buttons/outline','.btn.btn-style-outline.color-gradient-ocean',true],['buttons/icon-buttons-variants','.btn-icon.btn-style-tonal.color-info',false],['buttons/icon-buttons-variants','.btn-icon.btn-style-outline.color-success',false],['buttons/icon-buttons-variants','.btn-icon.btn-style-tonal.color-gradient-violet',true],['buttons/icon-buttons-variants','.btn-icon.btn-style-outline.color-gradient-ocean',true]]){
  const card=page.locator('[data-key="'+key+'"]');await card.scrollIntoViewIfNeeded();await card.locator('.preview-host[data-ready=true]').waitFor();const button=card.locator(selector);await page.mouse.move(0,0);const rest=await button.evaluate(n=>({bg:getComputedStyle(n).backgroundColor,image:getComputedStyle(n).backgroundImage}));await button.hover();if(!gradient)await expect.poll(()=>button.evaluate(n=>getComputedStyle(n).backgroundColor)).toBe(palette[selector.includes('color-info')?'info':'success']);const hover=await button.evaluate(n=>({bg:getComputedStyle(n).backgroundColor,image:getComputedStyle(n).backgroundImage,filter:getComputedStyle(n).filter,shadow:getComputedStyle(n).boxShadow}));
  if(gradient)assert.equal(hover.image,gradients[selector.includes('color-gradient-ocean')?1:0],key+' gradient hover fill');else assert.equal(hover.bg,palette[selector.includes('color-info')?'info':'success'],key+' semantic hover fill');assert(rest.bg!==hover.bg||rest.image!==hover.image,'Hover must visibly fill');
  await page.mouse.down();await expect.poll(()=>button.evaluate(n=>getComputedStyle(n).boxShadow)).not.toBe(hover.shadow);const pressed=await button.evaluate(n=>({filter:getComputedStyle(n).filter,shadow:getComputedStyle(n).boxShadow,transform:getComputedStyle(n).transform}));assert.notEqual(pressed.shadow,hover.shadow,'Press shadow differs from hover');assert.notEqual(pressed.transform,'none','Press has displacement');await page.mouse.up();stateChecks++;
 }
 const states=page.locator('[data-key="buttons/button-states"]');await states.scrollIntoViewIfNeeded();await states.locator('.preview-host[data-ready=true]').waitFor();const disabled=states.locator('.btn.btn-style-tonal:disabled').first();const before=await disabled.evaluate(n=>getComputedStyle(n).backgroundColor);await disabled.hover();assert.equal(await disabled.evaluate(n=>getComputedStyle(n).backgroundColor),before,'Disabled never fills');
 // Text and icon controls share dimensions at every size in both APIs.
 const sizing=await browser.newPage();await sizing.route(/fonts\./,r=>r.abort());
 await sizing.goto(base+'/example.html?item=buttons/solid');await sizing.locator('#example[data-ready=true]').waitFor();
 const sizes=[['xs',32,12],['sm',40,16],['',44,20],['lg',52,28],['xl',62,36]];
 for(const [size,height,padding] of sizes){
  const metrics=await sizing.evaluate(({size})=>{
   const root=document.createElement('div');document.body.append(root);
   const results={};
   for(const api of ['legacy','core']){
    const wrap=document.createElement('div');wrap.className=api==='core'?'lumen':'buttons-preview';root.append(wrap);
    for(const kind of ['text','icon','compat']){
     if(api==='core'&&kind==='compat')continue;
     const button=document.createElement('button');button.type='button';button.textContent=kind==='text'?'Save changes':'+';
     button.className=api==='core'?'btn '+(size?'size-'+size:'')+(kind==='icon'?' btn-icon':''):(kind==='compat'?'ib':'btn'+(kind==='icon'?' btn-icon':''))+' btn-style-solid color-primary '+(size?'size-'+size:'');
     wrap.append(button);const css=getComputedStyle(button),rect=button.getBoundingClientRect();
     results[api+'-'+kind]={height:rect.height,width:rect.width,padding:parseFloat(css.paddingInlineStart),font:css.fontSize,radius:css.borderRadius,overflow:button.scrollWidth>button.clientWidth};
    }
   }
   root.remove();return results;
  },{size});
  for(const [key,metric] of Object.entries(metrics)){
   assert.equal(metric.height,height,size+' '+key+' height');
   assert.equal(metric.padding,key.endsWith('text')?padding:0,size+' '+key+' padding');
   if(!key.endsWith('text'))assert.equal(metric.width,height,size+' '+key+' square');
   assert.equal(metric.font,metrics['legacy-text'].font,size+' '+key+' font');
   assert.equal(metric.radius,metrics['legacy-text'].radius,size+' '+key+' radius');
   assert(!metric.overflow,size+' '+key+' clipped content');
  }
 }
 // Each original category must import the shared base, including when used alone.
 for(const category of ['buttons','forms','navigation','sliders-values','surfaces','feedback','data-media','foundations']){
  const css=await readFile('components/'+category+'.css','utf8');
  assert(css.includes("@import url('./button-base.css')"),category+' shared base import');
  assert(!/^\.b\{display:inline-flex/m.test(css),category+' duplicated base');
  assert(!/^\.ib\{width:44px/m.test(css),category+' duplicated icon dimensions');
  await sizing.setContent('<div class="buttons-preview"><button class="btn btn-style-solid size-lg">Save</button><button class="btn btn-icon btn-style-solid size-lg" aria-label="Add">+</button><button class="btn-icon btn-style-solid size-lg" aria-label="Legacy add">+</button></div>');
  await sizing.evaluate(url=>new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=url;link.onload=resolve;link.onerror=reject;document.head.append(link)}),base+'/components/public-'+category+'.css');
  const dimensions=await sizing.locator('button').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return{height:r.height,width:r.width}}));
  for(const metric of dimensions)assert.equal(metric.height,52,category+' aligned height');
  for(const metric of dimensions.slice(1))assert.equal(metric.width,52,category+' square icon');
 }
 await sizing.close();
 // Standalone lm- buttons must agree with the retained originals too.
 await page.goto(base+'/example.html?item=core/cards');await page.locator('#example[data-ready=true]').waitFor();await page.evaluate(()=>{const wrap=document.createElement('div');wrap.className='lumen';wrap.id='button-probes';wrap.innerHTML='<button class="btn btn-style-tonal color-info">Info tonal</button><button class="btn btn-style-outline color-success btn-icon" aria-label="Success outline icon">+</button><button class="btn color-gradient-ocean">Ocean</button>';document.getElementById('example').append(wrap)});
 assert.equal(await page.locator('.color-gradient-ocean').evaluate(n=>getComputedStyle(n).backgroundImage),gradients[1]);for(const [selector,color] of [['#button-probes .color-info',palette.info],['#button-probes .color-success',palette.success]]){await page.locator(selector).hover();await expect.poll(()=>page.locator(selector).evaluate(n=>getComputedStyle(n).backgroundColor)).toBe(color)}
 const axe=await readFile('node_modules/axe-core/axe.min.js','utf8');let audits=0;
 for(const theme of ['light','dark','oled','cyberpunk','obsidian','arctic','sport','luxury'])for(const key of ['buttons/solid','buttons/soft-tinted','buttons/outline','buttons/ghost-and-link','buttons/link','buttons/icon-buttons-variants']){await page.goto(base+'/example.html?item='+encodeURIComponent(key)+'&theme='+theme);await page.locator('#example[data-ready=true]').waitFor();await page.addScriptTag({content:axe});const violations=await page.evaluate(async()=>{const r=await axe.run(document.getElementById('example'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(x=>({id:x.id,nodes:x.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});assert.deepEqual(violations,[],theme+' '+key+' accessibility');audits++}
 console.log(`PASS buttons: Foundation colors and eight gradients, merged aliases, five shared sizes, eight category imports, ${stateChecks} text/icon hover and press combinations, disabled behavior, public CSS parity, ${audits} accessibility audits`);
}finally{await browser?.close();server.kill()}
