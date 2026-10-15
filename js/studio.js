/* One catalog drives navigation, search, organization, previews and copying. */
(function(){
'use strict';
const $=id=>document.getElementById(id),templates=new Map(),cssCache=new Map(),sheetCache=new Map(),previews=new Set();
const read=(name,fallback)=>{try{return JSON.parse(localStorage.getItem('lumen-studio-'+name))??fallback}catch{return fallback}};
const write=(name,value)=>{try{localStorage.setItem('lumen-studio-'+name,JSON.stringify(value))}catch{}};
let comparison=[],catalog,category='home',width='full',selected=null,inspectorPreview=null,observer,noticeTimer,renderSequence=0;
let favorites=read('favorites',[]),recent=read('recent',[]);
const icons=['◈','▦','↗','▤','◉','☷','▣','◇','◌','▥','▷','✦'];
const typeLabels={functional:'Interactive core',css:'CSS / native controls',reference:'Visual reference',composition:'Composition'};
function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node}
function notice(message){$('notice').textContent=message;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,2500)}
async function loadTemplates(file){if(!templates.has(file))templates.set(file,LumenAssets.templateDocument(file,catalog.items));return templates.get(file)}
async function content(item){const doc=await loadTemplates(item.template),t=doc.querySelector('template[id="'+CSS.escape(item.id)+'"]');if(!t)throw Error('Missing template: '+item.key);return t.content.cloneNode(true)}
function legacySnippet(fragment){const sec=fragment.querySelector('section.sec');if(sec){sec.removeAttribute('id');sec.querySelector('.sh')?.remove();sec.classList.remove('sec','w2','w3')}return fragment}
async function markup(item,variant){const fragment=legacySnippet(await content(item));if(variant!==undefined&&variant!=='all'){const candidates=[...fragment.querySelectorAll('button,input,select,textarea,progress,meter')];const node=candidates[Number(variant)];if(node){const label=node.closest('label');return (label||node).outerHTML}}const holder=el('div');holder.append(fragment);return holder.innerHTML}
async function dependencies(item){const doc=await loadTemplates(item.template);return doc.querySelector('template#icons')?.innerHTML||''}
async function standalone(item,variant='all'){
const snippet=await markup(item,variant),defs=await dependencies(item);const links=item.source==='core'?['lumen-core.css']:item.css;
const theme=$('theme').value;
return '<!doctype html>\n<html lang="en" data-theme="'+theme+'">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>'+item.title.replace(/[&<>]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[x]))+'</title>\n'+links.map(f=>'<link rel="stylesheet" href="'+f+'">').join('\n')+'\n<script src="js/components.js" defer></script>\n</head>\n<body class="lm-scope">\n'+defs+'\n'+(item.source==='core'?snippet:'<div class="p">'+snippet+'</div>')+'\n</body>\n</html>';
}
async function preview(item,container){
 const host=el('div','preview-host');host.dataset.theme=$('theme').value;host.style.maxWidth=width==='full'?'100%':width+'px';host.style.containerType='inline-size';host.style.containerName='lm-preview';container.replaceChildren(host);
 const shadow=host.attachShadow({mode:'open'});const root=el('div',item.source==='core'?'lm-scope':'p');
 let destroyed=false,api;
 const handle={host,item,shadow,destroy(){destroyed=true;api?.destroy();previews.delete(handle);host.remove()}};previews.add(handle);
 try{
  const [fragment,doc]=await Promise.all([content(item),loadTemplates(item.template)]);if(destroyed)return handle;
  for(const file of item.source==='core'?['lumen-core.css']:item.css){const sheet=el('style');sheet.textContent=await previewSheet(file);if(destroyed)return handle;shadow.append(sheet)}
  const style=el('style');style.textContent=':host{display:block;min-width:0;font-family:var(--lm-font,system-ui)}*{box-sizing:border-box}[hidden]{display:none!important}.p{padding:0!important;min-height:0;background:transparent}.sec{padding:0!important;border:0!important;box-shadow:none!important;background:transparent;min-width:0;max-width:100%;margin:0}.sh{display:none}.w2,.w3{grid-column:auto}.lumen-variant-label{font-size:.75rem;font-weight:700;margin:1rem 0 .6rem;color:var(--lm-muted,#5b6486)}.r{flex-wrap:wrap!important}img{max-width:100%}';shadow.append(style);
  const defs=doc.querySelector('template#icons');if(defs)root.append(defs.content.cloneNode(true));root.append(fragment);shadow.append(root);
  api=LumenUI.mount(shadow);host.dataset.ready='true';
 }catch(error){if(!destroyed){container.textContent=error.message;host.dataset.ready='error'}throw error}
 return handle;
}
async function previewSheet(file){
 if(!sheetCache.has(file))sheetCache.set(file,(async()=>{
  let text=await LumenAssets.text(file);const imports=[...text.matchAll(/@import\s+url\(['"]([^'"]+)['"]\);/g)];
  for(const match of imports){const path=LumenAssets.path(new URL(match[1],new URL(file,document.baseURI)));text=text.replace(match[0],await previewSheet(path))}
  return text.replace(/:root\b/g,':host').replace(/@media\s*\((min|max)-width\s*:\s*([^)]*)\)/g,'@container lm-preview ($1-width: $2)');
 })());return sheetCache.get(file);
}
function cleanup(){observer?.disconnect();for(const p of [...previews])if(p!==inspectorPreview)p.destroy()}
function resolve(hash){const path=decodeURIComponent(hash.replace(/^#/,'')),parts=path.split('/');
 if(['home','favorites','recent'].includes(path))return {category:path};
 const item=catalog.items.find(x=>x.key===(catalog.aliases?.[path]||path)||x.category+'/'+x.id===path);if(item)return{category:item.category,key:item.key};
 return {category:catalog.categories.some(c=>c.id===path)?path:'home'};
}
function updateFavorites(){write('favorites',favorites);$('favorite-count').textContent=favorites.length;document.querySelectorAll('[data-favorite]').forEach(b=>{const yes=favorites.includes(b.dataset.favorite);b.setAttribute('aria-pressed',String(yes));b.textContent=yes?'★':'☆'});if(selected)$('save-favorite').textContent=favorites.includes(selected.key)?'★ Favorited':'☆ Favorite'}
function toggleFavorite(key){favorites=favorites.includes(key)?favorites.filter(k=>k!==key):[...favorites,key];updateFavorites();if(category==='favorites')render();}
function remember(item){recent=[item.key,...recent.filter(k=>k!==item.key)].slice(0,30);write('recent',recent)}
function baseItems(){if(category==='compare')return comparison.map(k=>catalog.items.find(x=>x.key===k)).filter(Boolean);if(category==='favorites')return catalog.items.filter(x=>favorites.includes(x.key));if(category==='recent')return recent.map(k=>catalog.items.find(x=>x.key===k)).filter(Boolean);return catalog.items.filter(x=>x.category===category)}
function visibleItems(){const term=$('search').value.toLowerCase().trim(),family=$('family-filter').value,type=$('status-filter').value;let items=term?catalog.items:baseItems();return items.filter(x=>(!family||x.family===family)&&(!type||x.status===type)&&(!term||term.split(/\s+/).every(t=>(x.title+' '+x.family+' '+x.tags.join(' ')).toLowerCase().includes(t))))}
function sorted(items){return items.map((item,i)=>({item,i})).sort((a,b)=>a.item.family.localeCompare(b.item.family)||((a.item.source==='core'?0:1)-(b.item.source==='core'?0:1))||a.i-b.i).map(x=>x.item)}
function card(item){const article=el('article','example-card');article.id='item-'+item.key.replace('/','--');article.dataset.key=item.key;const head=el('div','example-head'),titles=el('div');titles.append(el('h3','',item.title),el('p','',catalog.categories.find(c=>c.id===item.category).label));const actions=el('div','card-actions');
 const compare=el('button','',comparison.includes(item.key)?'✓':'⇄');compare.setAttribute('aria-label','Compare '+item.title);compare.dataset.compare=item.key;compare.setAttribute('aria-pressed',String(comparison.includes(item.key)));compare.onclick=()=>{if(comparison.includes(item.key))comparison=comparison.filter(k=>k!==item.key);else if(comparison.length<4)comparison.push(item.key);else return notice('Compare up to four examples');document.querySelectorAll('[data-compare]').forEach(b=>{b.setAttribute('aria-pressed',String(comparison.includes(b.dataset.compare)));b.textContent=comparison.includes(b.dataset.compare)?'✓':'⇄'});$('compare-open').textContent='Compare ('+comparison.length+')';$('compare-open').disabled=!comparison.length};
 const star=el('button','',favorites.includes(item.key)?'★':'☆');star.dataset.favorite=item.key;star.setAttribute('aria-label','Favorite '+item.title);star.setAttribute('aria-pressed',String(favorites.includes(item.key)));star.onclick=()=>toggleFavorite(item.key);
 const inspect=el('button','','Inspect');inspect.setAttribute('aria-label','Inspect '+item.title);inspect.onclick=()=>openInspector(item);
 const copy=el('button','','Copy');copy.setAttribute('aria-label','Copy '+item.title);copy.onclick=async()=>{try{await LumenUI.copy(await markup(item));notice('HTML copied')}catch{notice('Clipboard unavailable')}};actions.append(compare,star,inspect,copy);head.append(titles,actions);
 const surface=el('div','preview-surface');surface.setAttribute('aria-label',item.title+' preview');surface.append(el('span','lm-help','Loading preview…'));
 const foot=el('div','example-foot');foot.append(el('span','',typeLabels[item.status]),el('span','',item.source==='core'?'Public component':'Reference collection'));
 article.append(head,surface,foot);article._item=item;observer.observe(article);return article;
}
function render(){
 const sequence=++renderSequence;cleanup();$('cards').replaceChildren();$('family-nav').replaceChildren();const items=sorted(visibleItems());$('result-count').textContent=items.length+' examples';$('cards').classList.toggle('list',$('layout-filter').value==='list');
 observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){observer.unobserve(e.target);preview(e.target._item,e.target.querySelector('.preview-surface')).catch(error=>notice(error.message))}},{rootMargin:'600px'});
 let family=null;const fragment=document.createDocumentFragment();for(const item of items){if(item.family!==family){family=item.family;const id='family-'+[...family].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);const heading=el('h2','family-heading',family.replace(/^\d+ · /,''));heading.id=id;fragment.append(heading);const link=el('a','',heading.textContent);link.href='#'+id;link.onclick=e=>{e.preventDefault();heading.scrollIntoView({block:'start',behavior:'smooth'})};$('family-nav').append(link)}fragment.append(card(item))}if(!items.length)fragment.append(el('div','empty-results','No matching examples. Try another search or reset the filters.'));$('cards').append(fragment);
 $('overview').hidden=true;$('browser').hidden=false;
 if(sequence!==renderSequence)return;
}
function navigate(){if(!catalog)return;const route=resolve(location.hash);category=route.category;$('family-filter').value='';$('status-filter').value='';$('search').value='';document.querySelectorAll('[data-category]').forEach(a=>{if(a.dataset.category===category)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});$('sidebar').classList.remove('open');$('menu-toggle').setAttribute('aria-expanded','false');syncSidebar();
 if(category==='home'){cleanup();$('overview').hidden=false;$('browser').hidden=true;return}
 const title=catalog.categories.find(c=>c.id===category)?.label||({favorites:'Favorites',recent:'Recently viewed'}[category]);$('page-title').textContent=title;$('page-summary').textContent='Compare related variants, inspect their markup, and copy an example.';$('breadcrumb').textContent='COMPONENT LIBRARY / '+title;
 $('family-filter').replaceChildren(new Option('All families',''),...[...new Set(baseItems().map(x=>x.family))].sort().map(x=>new Option(x.replace(/^\d+ · /,''),x)));render();
 if(route.key){const item=catalog.items.find(x=>x.key===route.key);remember(item);const node=document.querySelector('[data-key="'+CSS.escape(route.key)+'"]');node?.classList.add('is-selected');node?.scrollIntoView({block:'start'});}
}
async function openInspector(item){selected=item;remember(item);$('inspector-title').textContent=item.title;$('standalone-link').href='example.html?item='+encodeURIComponent(item.key)+'&theme='+$('theme').value+(LumenAssets.offline&&location.protocol!=='file:'?'&offline=1':'');$('save-favorite').textContent=favorites.includes(item.key)?'★ Favorited':'☆ Favorite';if(!$('inspector').open)$('inspector').showModal();await inspectTab('preview')}
async function inspectTab(tab){const item=selected;if(!item)return;inspectorPreview?.destroy();inspectorPreview=null;$('inspector-body').replaceChildren();document.querySelectorAll('[data-inspect]').forEach(b=>{const on=b.dataset.inspect===tab;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1});
 if(tab==='preview'){inspectorPreview=await preview(item,$('inspector-body'));if(selected!==item||!$('inspector').open){inspectorPreview.destroy();inspectorPreview=null}return}
 const label=el('label','variant-select','Copy selection'),select=el('select');select.id='variant-selection';select.append(new Option('Complete example','all'));if(tab==='html'){const fragment=await content(item);[...fragment.querySelectorAll('button,input,select,textarea,progress,meter')].forEach((node,i)=>{select.append(new Option((node.textContent.trim()||node.getAttribute('aria-label')||node.getAttribute('placeholder')||node.tagName)+' · '+(i+1),String(i)))})}label.append(select);const source=el('pre');$('inspector-body').append(label,source);
 const refresh=async()=>{source.textContent=tab==='html'?await markup(item,select.value):await styles(item)};select.onchange=refresh;await refresh();
}
async function styles(item){const files=item.source==='core'?['components/core.css','components/utilities.css']:item.css;return '/* Required stylesheet: '+(item.source==='core'?'lumen-core.css':files.join(', '))+' */\n\n'+(await Promise.all(files.map(file=>{if(!cssCache.has(file))cssCache.set(file,LumenAssets.text(file));return cssCache.get(file)}))).join('\n')}
function setTheme(theme){document.documentElement.dataset.theme=theme;write('theme',theme);for(const p of previews)p.host.dataset.theme=theme;if(selected)$('standalone-link').href='example.html?item='+encodeURIComponent(selected.key)+'&theme='+theme+(LumenAssets.offline&&location.protocol!=='file:'?'&offline=1':'')}
$('compare-open').onclick=()=>{if(!comparison.length)return;category='compare';$('page-title').textContent='Compare components';$('page-summary').textContent='Selected examples side by side. Use the theme and width controls to compare.';$('search').value='';$('family-filter').value='';$('status-filter').value='';$('layout-filter').value='grid';render()};
$('direction').onchange=()=>{document.documentElement.dir=$('direction').value};
$('theme').value=read('theme','light');if(!$('theme').value)$('theme').value='light';setTheme($('theme').value);$('theme').onchange=()=>setTheme($('theme').value);
function syncSidebar(){const closed=matchMedia('(max-width:800px)').matches&&!$('sidebar').classList.contains('open');$('sidebar').inert=closed;if(closed)$('sidebar').setAttribute('aria-hidden','true');else $('sidebar').removeAttribute('aria-hidden')}
matchMedia('(max-width:800px)').addEventListener('change',syncSidebar);syncSidebar();
$('menu-toggle').onclick=()=>{const open=$('sidebar').classList.toggle('open');$('menu-toggle').setAttribute('aria-expanded',String(open));syncSidebar()};
$('search').addEventListener('input',()=>{if(!catalog)return;if($('search').value){$('page-title').textContent='Search results';$('page-summary').textContent='Search across all component families.';$('family-filter').value='';render()}else navigate()});
['family-filter','status-filter','layout-filter'].forEach(id=>$(id).onchange=render);$('reset-filters').onclick=()=>{$('search').value='';$('family-filter').value='';$('status-filter').value='';$('layout-filter').value='grid';navigate()};
for(const b of document.querySelectorAll('[data-width]'))b.onclick=()=>{width=b.dataset.width;document.querySelectorAll('[data-width]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));for(const p of previews)p.host.style.maxWidth=width==='full'?'100%':width+'px'};
$('inspector-close').onclick=()=>$('inspector').close();$('inspector').addEventListener('close',()=>{inspectorPreview?.destroy();inspectorPreview=null});
document.querySelectorAll('[data-inspect]').forEach(b=>{b.onclick=()=>inspectTab(b.dataset.inspect);b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const tabs=[...document.querySelectorAll('[data-inspect]')];let i=tabs.indexOf(b);i=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[i].focus();inspectTab(tabs[i].dataset.inspect)}}});
$('copy-snippet').onclick=async()=>{try{await LumenUI.copy(await markup(selected,$('variant-selection')?.value));notice('HTML copied')}catch{notice('Clipboard unavailable')}};
$('copy-standalone').onclick=async()=>{try{await LumenUI.copy(await standalone(selected,$('variant-selection')?.value));notice('Complete example copied')}catch{notice('Clipboard unavailable')}};$('save-favorite').onclick=()=>toggleFavorite(selected.key);
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('search').focus();$('search').select()}if(e.key==='Escape'){$('sidebar').classList.remove('open');$('menu-toggle').setAttribute('aria-expanded','false');syncSidebar()}});
window.addEventListener('hashchange',navigate);
LumenAssets.json('catalog/components.json').then(data=>{
 catalog=data;
 // Migrate old favorites and recent records using stable original keys.
 favorites=[...new Set(favorites.map(k=>catalog.aliases?.[k]||k))].filter(k=>catalog.items.some(x=>x.key===k));recent=[...new Set(recent.map(x=>typeof x==='string'?x:x.p+'/'+x.id).map(k=>catalog.aliases?.[k]||k))].filter(k=>catalog.items.some(x=>x.key===k));
 const families=new Set(catalog.items.map(x=>x.category+'/'+x.family)),core=catalog.items.filter(x=>x.source==='core');
 for(const [value,label] of [[catalog.items.length,'Curated examples'],[families.size,'Component families'],[catalog.categories.length,'Purposeful categories'],[core.length,'Public core examples']]){const stat=el('div');stat.append(el('strong','',String(value)),el('span','',label));$('stats').append(stat)}
 catalog.categories.forEach((cat,i)=>{const count=catalog.items.filter(x=>x.category===cat.id).length;const link=el('a');link.href='#'+cat.id;link.dataset.category=cat.id;link.append(el('span','',icons[i]),document.createTextNode(cat.label),el('span','',String(count)));$('category-nav').append(link);const card=el('a','category-card');card.href='#'+cat.id;card.append(el('div','category-icon',icons[i]),el('h3','',cat.label),el('p','',[...new Set(catalog.items.filter(x=>x.category===cat.id).map(x=>x.family.replace(/^\d+ · /,'')))].slice(0,3).join(' · ')),el('small','',count+' examples ↗'));$('category-grid').append(card)});
 updateFavorites();navigate();window.LumenStudio={catalog,content,markup,standalone,preview,openInspector,render};
}).catch(error=>{$('load-error').textContent=error.message;$('load-error').hidden=false});
})();
