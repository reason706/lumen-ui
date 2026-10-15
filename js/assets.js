/* Shared asset transport: fetch over HTTP, classic-script snapshot for file://. */
(function(global){
 'use strict';
 const base=new URL('.',document.baseURI);
 const offline=location.protocol==='file:'||new URLSearchParams(location.search).get('offline')==='1';
 let snapshot;
 function pathOf(file){
  const url=new URL(file,base);
  if(!url.href.startsWith(base.href))throw Error('Asset is outside the Lumen directory');
  return decodeURIComponent(url.href.slice(base.href.length).split(/[?#]/)[0]);
 }
 function loadSnapshot(){
  if(!snapshot)snapshot=new Promise((resolve,reject)=>{
   if(global.LumenStudioAssets){resolve(global.LumenStudioAssets);return}
   const script=document.createElement('script');
   script.src=new URL('js/studio-data.js',base).href;
   script.onload=()=>global.LumenStudioAssets?resolve(global.LumenStudioAssets):reject(Error('Local studio data is missing. Pull the complete repository again.'));
   script.onerror=()=>reject(Error('Cannot load local studio data. Make sure js/studio-data.js is present.'));
   document.head.append(script);
  });
  return snapshot;
 }
 async function text(file){
  const key=pathOf(file);
  if(offline){
   const assets=await loadSnapshot();
   if(!Object.hasOwn(assets,key))throw Error('Local preview asset is missing: '+key);
   return assets[key];
  }
  const response=await fetch(new URL(key,base),{cache:'no-store'});
  if(!response.ok)throw Error('Could not load '+key+' (HTTP '+response.status+')');
  return response.text();
 }
 // Validate the parsed DOM, not just template IDs appearing in source text.
 async function templateDocument(file,items){
  const expected=items.filter(item=>item.template===file);
  function parse(source){
   const doc=document.createElement('div');doc.innerHTML=source;
   const missing=expected.filter(item=>!doc.querySelector('template[id="'+CSS.escape(item.id)+'"]')?.content);
   return {doc,missing};
  }
  let parsed=parse(await text(file));
  if(parsed.missing.length&&!offline){
   // A partial checkout or stale server response can mix a new catalog with old HTML.
   const assets=await loadSnapshot();
   if(Object.hasOwn(assets,pathOf(file)))parsed=parse(assets[pathOf(file)]);
  }
  if(parsed.missing.length)throw Error('Incomplete template file '+file+': '+parsed.missing.map(item=>item.id).join(', ')+'. Pull the complete repository, including js/studio-data.js.');
  return parsed.doc;
 }
 global.LumenAssets={offline,text,templateDocument,json:async file=>JSON.parse(await text(file)),path:pathOf};
})(window);
