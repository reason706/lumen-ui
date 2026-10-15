/* Shared component factory: the configurator, preview and export use the same markup. */
(function(global){
'use strict';
const types={btn:['solid','tonal','outline','ghost','link'],card:['solid','tonal','outline','raised','glass','gradient'],badge:['solid','tonal','outline'],input:[],alert:['tonal','solid','outline'],chip:['solid','tonal','outline'],avatar:[],progress:[]};
const colors=['primary','secondary','success','info','warning','danger','red','blue','green','teal','orange','yellow','purple','pink','violet','slate','dark','light'];
const gradients=['violet','ocean','sunset','candy','forest','midnight','rose','aurora'].map(x=>'gradient-'+x);
const sizes=['xs','sm','md','lg','xl'];
function normalize(value={}){
 const type=Object.hasOwn(types,value.type)?value.type:'btn';
 return{type,style:types[type].includes(value.style)?value.style:types[type][0]||'',color:[...colors,...(!['input','progress'].includes(type)?gradients:[])].includes(value.color)?value.color:'primary',size:sizes.includes(value.size)?value.size:'md',shape:['rounded','pill','square',...(['btn','avatar'].includes(type)?['circle']:[])].includes(value.shape)?value.shape:'rounded',state:(type==='btn'?['normal','hover','pressed','focus','disabled','loading']:type==='input'?['normal','hover','focus','disabled','invalid']:['normal']).includes(value.state)?value.state:'normal',icon:type==='btn'&&!!value.icon,iconOnly:type==='btn'&&!!value.iconOnly,iconName:global.LumenIcons?.names.includes(value.iconName)?value.iconName:'plus',text:String(value.text||({btn:'Continue',card:'Your next project',badge:'New',input:'Your name',alert:'Changes saved successfully.',chip:'Design',avatar:'AB',progress:'Upload progress'}[type])).slice(0,200)};
}
function create(value){
 const c=normalize(value),tag={btn:'button',card:'article',badge:'span',input:'input',alert:'div',chip:'span',avatar:'span',progress:'progress'}[c.type],node=document.createElement(tag);
 node.className=c.type+' color-'+c.color+' size-'+c.size+(c.style?' '+c.type+'-style-'+c.style:'')+(c.shape!=='rounded'?' shape-'+c.shape:'');
 if(c.type==='btn'){node.type='button';if(c.icon||c.iconOnly)node.append(LumenIcons.create(c.iconName));if(c.iconOnly){node.classList.add('btn-icon');node.setAttribute('aria-label',c.text)}else node.append(document.createTextNode(c.text))}
 else if(c.type==='input'){node.type='text';node.setAttribute('aria-label',c.text);node.setAttribute('placeholder',c.text)}
 else if(c.type==='card'){const head=document.createElement('header');head.className='card-header';const title=document.createElement('h3');title.textContent=c.text;head.append(title);const body=document.createElement('div');body.className='card-body';body.textContent='Shared foundations. Ready for your next interface.';node.append(head,body)}
 else if(c.type==='progress'){node.max=100;node.value=65;node.setAttribute('aria-label',c.text)}
 else{node.textContent=c.text;if(c.type==='alert')node.setAttribute('role','status')}
 if(c.state==='disabled'){node.disabled=true;node.setAttribute('disabled','')}
 if(c.state==='loading'&&c.type==='btn'){node.disabled=true;node.setAttribute('disabled','');node.setAttribute('aria-busy','true')}
 if(c.state==='hover')node.classList.add('demo-hover');if(c.state==='pressed')node.classList.add('demo-pressed');if(c.state==='invalid')node.setAttribute('aria-invalid','true');if(c.state==='focus')node.classList.add('demo-focus');
 return node;
}
function infer(item){if(item.category==='buttons')return'btn';if(item.key.includes('badge'))return'badge';if(item.key.includes('chip'))return'chip';if(item.category==='forms')return'input';if(item.key.includes('progress'))return'progress';if(item.key.includes('avatar'))return'avatar';if(item.key.includes('alert'))return'alert';if(item.category==='surfaces')return'card';return null}
const synonyms={ib:'icon',icons:'icon',btn:'button',buttons:'button',soft:'tonal',tinted:'tonal',dropdowns:'dropdown',inputs:'input',dialogs:'dialog',modal:'dialog',modals:'dialog',toggles:'toggle',colour:'color',colours:'color',gradiant:'gradient',gradiants:'gradient'};
function terms(text){return String(text).toLowerCase().replace(/(?:btn-style-|card-style-|color-|size-)/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean).map(word=>synonyms[word]||word)}
function matches(item,text){const hay=terms(item.title+' '+item.family+' '+item.key+' '+item.tags.join(' ')).join(' ');return terms(text).every(t=>hay.includes(t))}
global.LumenVariants={types,colors,gradients,sizes,normalize,create,infer,matches};
})(window);
