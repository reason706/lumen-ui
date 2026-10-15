/* Lumen public interaction layer. Mount once per Document or ShadowRoot. */
(function(global){
 'use strict';
 const mounts=new WeakMap();let seq=0;
 const closest=(event,selector)=>event.composedPath().find(n=>n?.matches?.(selector));
 function mount(root=document){
  if(mounts.has(root)){const existing=mounts.get(root);existing.refresh();return existing;}
  const abort=new AbortController(),cleanups=[],timers=new Set(),dialogs=new WeakSet();
  const on=(type,fn)=>root.addEventListener(type,fn,{signal:abort.signal});
  const query=id=>id?root.querySelector('#'+CSS.escape(id)):null;
  const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn()},ms);timers.add(id);return id};
  const emit=(el,name,detail={})=>el.dispatchEvent(new CustomEvent('lumen:'+name,{bubbles:true,composed:true,detail}));
  function toast(message){
   let region=root.querySelector(':is(.lm-toast-region,.toast-region)');
   if(!region){region=document.createElement('div');region.className='toast-region lumen';region.setAttribute('aria-label','Notifications');(root.body||root).append(region);cleanups.push(()=>region.remove())}
   const el=document.createElement('div');el.className='toast';el.setAttribute('role','status');
   const text=document.createElement('span');text.textContent=message;
   const close=document.createElement('button');close.className='btn btn-style-ghost';close.type='button';close.textContent='×';close.setAttribute('aria-label','Dismiss notification');close.onclick=()=>el.remove();el.append(text,close);region.append(el);later(()=>el.remove(),5000);return el;
  }
  function closeMenu(drop,focus=false){const btn=drop.querySelector('[data-lm-menu-toggle]');const menu=drop.querySelector('[role=menu]');if(menu)menu.hidden=true;btn?.setAttribute('aria-expanded','false');if(focus)btn?.focus()}
  function selectTab(tab){
   const list=tab.closest('[role=tablist]');if(tab.dataset.lmRadio){const radio=query(tab.dataset.lmRadio);if(radio)radio.checked=true}list.querySelectorAll('[role=tab]').forEach(t=>{const selected=t===tab;t.setAttribute('aria-selected',selected);t.tabIndex=selected?0:-1;const panel=query(t.getAttribute('aria-controls'));if(panel)panel.hidden=!selected});emit(tab,'tabchange',{id:tab.id});
  }
  function carousel(el,step){const slides=[...el.querySelectorAll('[data-lm-slide]')];if(!slides.length)return;let index=slides.findIndex(s=>!s.hidden);index=(index+step+slides.length)%slides.length;slides.forEach((s,i)=>s.hidden=i!==index);const out=el.querySelector('[data-lm-slide-count]');if(out)out.textContent=(index+1)+' / '+slides.length;emit(el,'slide',{index})}
  on('click',e=>{
   const tab=closest(e,'[role=tab]');if(tab){selectTab(tab);return}
   const legacyStep=closest(e,'[data-lm-legacy-step]');if(legacyStep){const out=legacyStep.parentElement.querySelector('b');if(out){const value=parseFloat(out.textContent)||0;out.textContent=out.textContent.replace(/-?\d+(?:\.\d+)?/,String(Math.max(0,value+Number(legacyStep.dataset.lmLegacyStep))))}return}
   const legacyDismiss=closest(e,'[data-lm-legacy-dismiss]');if(legacyDismiss){const check=query(legacyDismiss.dataset.lmLegacyDismiss);if(check)check.checked=true;return}
   const menuToggle=closest(e,'[data-lm-menu-toggle]');
   root.querySelectorAll(':is(.lm-dropdown,.dropdown)').forEach(d=>{if(d!==menuToggle?.closest(':is(.lm-dropdown,.dropdown)')&&!e.composedPath().includes(d))closeMenu(d)});
   if(menuToggle){const d=menuToggle.closest(':is(.lm-dropdown,.dropdown)'),m=d.querySelector('[role=menu]');if(!m)return;m.hidden=!m.hidden;menuToggle.setAttribute('aria-expanded',String(!m.hidden));if(!m.hidden)m.querySelector('[role=menuitem]:not(:disabled)')?.focus();return}
   const menuItem=closest(e,'[role=menuitem]');if(menuItem){const d=menuItem.closest(':is(.lm-dropdown,.dropdown)');if(d)closeMenu(d,true);emit(menuItem,'action',{value:menuItem.textContent.trim()});return}
   const opener=closest(e,'[data-lm-dialog]');if(opener){const dialog=query(opener.dataset.lmDialog);if(dialog?.showModal){dialog._lmOpener=opener;dialog.showModal();emit(dialog,'open')}return}
   const close=closest(e,'[data-lm-close]');if(close){const dialog=close.closest('dialog');if(dialog){dialog.close();dialog._lmOpener?.focus();emit(dialog,'close')}return}
   const dismiss=closest(e,'[data-lm-dismiss]');if(dismiss){const target=dismiss.closest(':is(.lm-alert,.alert),:is(.lm-toast,.toast),:is(.lm-chip,.chip)');if(target){target.hidden=true;emit(target,'dismiss')}return}
   const toggle=closest(e,'[data-lm-toggle]');if(toggle){toggle.setAttribute('aria-pressed',String(toggle.getAttribute('aria-pressed')!=='true'));emit(toggle,'toggle',{pressed:toggle.getAttribute('aria-pressed')==='true'});return}
   const toastBtn=closest(e,'[data-lm-toast]');if(toastBtn){toast(toastBtn.dataset.lmToast);return}
   const collapse=closest(e,'[data-lm-collapse]');if(collapse){const target=query(collapse.dataset.lmCollapse);if(target){target.hidden=!target.hidden;collapse.setAttribute('aria-expanded',String(!target.hidden));emit(target,'collapse',{open:!target.hidden})}return}
   const stepper=closest(e,'[data-lm-step]');if(stepper){const input=stepper.closest('[data-lm-stepper]').querySelector('input');if(stepper.dataset.lmStep==='up')input.stepUp();else input.stepDown();input.dispatchEvent(new Event('input',{bubbles:true,composed:true}));return}
   const pager=closest(e,'[data-lm-page]');if(pager){const group=pager.closest('[data-lm-pagination]');group.querySelectorAll('[data-lm-page]').forEach(b=>{if(b===pager)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});const out=group.querySelector('output');if(out)out.textContent='Page '+pager.dataset.lmPage;emit(group,'page',{page:Number(pager.dataset.lmPage)});return}
   const slide=closest(e,'[data-lm-slide-step]');if(slide){carousel(slide.closest(':is(.lm-carousel,.carousel)'),Number(slide.dataset.lmSlideStep));return}
   const sort=closest(e,'[data-lm-sort]');if(sort){const th=sort.closest('th'),table=th.closest('table'),body=table.tBodies[0],index=th.cellIndex;const ascending=th.getAttribute('aria-sort')!=='ascending';table.querySelectorAll('th[aria-sort]').forEach(t=>t.setAttribute('aria-sort','none'));th.setAttribute('aria-sort',ascending?'ascending':'descending');[...body.rows].sort((a,b)=>a.cells[index].textContent.trim().localeCompare(b.cells[index].textContent.trim(),undefined,{numeric:true})*(ascending?1:-1)).forEach(row=>body.append(row));emit(table,'sort',{index,ascending});return}
   const option=closest(e,'[data-lm-option]');if(option){const combo=option.closest(':is(.lm-combobox,.combobox)'),input=combo.querySelector('[role=combobox]');input.value=option.textContent.trim();input.dataset.value=option.dataset.lmOption;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');combo.querySelector('[role=listbox]').hidden=true;input.focus();emit(input,'select',{value:option.dataset.lmOption});return}
   const copy=closest(e,'[data-lm-copy]');if(copy){const target=query(copy.dataset.lmCopy);if(target)global.LumenUI.copy(target.textContent).then(()=>toast('Copied')).catch(()=>toast('Clipboard unavailable'));return}
   const uploadRemove=closest(e,'[data-lm-upload-remove]');if(uploadRemove){const wrap=uploadRemove.closest('[data-lm-upload]');wrap.querySelector('input').value='';wrap.querySelector('output').textContent='No files selected';return}
  });
  on('keydown',e=>{
   const legacyButton=closest(e,'[data-lm-legacy-dismiss]');if(legacyButton&&['Enter',' '].includes(e.key)){e.preventDefault();legacyButton.click();return}
   const tab=closest(e,'[role=tab]');if(tab&&['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const tabs=[...tab.closest('[role=tablist]').querySelectorAll('[role=tab]:not(:disabled)')];let i=tabs.indexOf(tab);const rtl=getComputedStyle(tab).direction==='rtl';if(e.key==='Home')i=0;else if(e.key==='End')i=tabs.length-1;else i=(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)*(rtl&&['ArrowRight','ArrowLeft'].includes(e.key)?-1:1)+tabs.length)%tabs.length;tabs[i].focus();selectTab(tabs[i]);return}
   const drop=closest(e,':is(.lm-dropdown,.dropdown)');if(drop){const menu=drop.querySelector('[role=menu]'),items=[...menu.querySelectorAll('[role=menuitem]:not(:disabled)')];if(e.key==='Escape'){closeMenu(drop,true);e.preventDefault()}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();menu.hidden=false;drop.querySelector('[data-lm-menu-toggle]').setAttribute('aria-expanded','true');let i=items.indexOf(e.composedPath()[0]);i=e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;items[i]?.focus()}return}
   const combo=closest(e,':is(.lm-combobox,.combobox)');if(combo){const input=combo.querySelector('[role=combobox]'),list=combo.querySelector('[role=listbox]'),options=[...list.querySelectorAll('[role=option]')].filter(o=>!o.hidden);if(e.key==='Escape'){if(!list.hidden)e.preventDefault();list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant')}else if(['ArrowDown','ArrowUp','Enter'].includes(e.key)){const id=input.getAttribute('aria-activedescendant');let i=options.findIndex(o=>o.id===id);if(e.key==='Enter'){if(i>=0&&!list.hidden){e.preventDefault();options[i].click()}}else{e.preventDefault();list.hidden=false;input.setAttribute('aria-expanded','true');i=(i+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;options.forEach((o,n)=>o.setAttribute('aria-selected',String(n===i)));if(options[i]){input.setAttribute('aria-activedescendant',options[i].id);options[i].scrollIntoView({block:'nearest'})}}}return}
   if(e.key==='Escape')root.querySelectorAll('[popover]').forEach(el=>{if(el.matches(':popover-open'))el.hidePopover()});
  });
  on('focusout',e=>{const combo=closest(e,':is(.lm-combobox,.combobox)');if(combo&&!combo.contains(e.relatedTarget)){const input=combo.querySelector('[role=combobox]');combo.querySelector('[role=listbox]').hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant')}});
  on('input',e=>{
   const input=e.composedPath()[0];
   if(input.matches?.('[data-lm-compare]')){const target=query(input.dataset.lmCompare);target?.style.setProperty('--lm-compare',input.value+'%')}
   if(input.matches?.('[data-lm-dual]')){const wrap=input.closest('[data-lm-range]'),low=wrap.querySelector('[data-lm-dual=low]'),high=wrap.querySelector('[data-lm-dual=high]');if(Number(low.value)>Number(high.value)){if(input===low)low.value=high.value;else high.value=low.value}const out=wrap.querySelector('output');if(out)out.textContent=low.value+' – '+high.value}
   if(input.matches?.('[data-lm-output]')){const out=query(input.dataset.lmOutput);if(out)out.textContent=input.value}
   if(input.matches?.('[role=combobox]')){const list=input.closest(':is(.lm-combobox,.combobox)').querySelector('[role=listbox]');list.hidden=false;input.setAttribute('aria-expanded','true');input.removeAttribute('aria-activedescendant');list.querySelectorAll('[role=option]').forEach(o=>{o.hidden=!o.textContent.toLowerCase().includes(input.value.toLowerCase());o.setAttribute('aria-selected','false')})}
   if(input.matches?.('[data-lm-filter]')){const table=query(input.dataset.lmFilter);table?.querySelectorAll('tbody tr').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(input.value.toLowerCase()))}
   if(input.matches?.('[data-lm-markdown]')){const out=query(input.dataset.lmMarkdown);if(out){out.replaceChildren();input.value.split('\n').forEach(line=>{const h=/^(#{1,3})\s+(.*)/.exec(line);const el=document.createElement(h?'h'+h[1].length:'p');el.textContent=h?h[2]:line;out.append(el)})}}
   if(input.matches?.('[data-lm-password]')){const out=query(input.dataset.lmPassword);if(out){const v=input.value,score=[v.length>=8,/[A-Z]/.test(v),/[0-9]/.test(v),/[^a-zA-Z0-9]/.test(v)].filter(Boolean).length;out.value=score;out.setAttribute('aria-label','Password strength '+score+' of 4')}}
  });
  on('change',e=>{
   const input=e.composedPath()[0];
   if(input.matches?.('[data-lm-tree-parent]')){const branch=input.closest('li');branch.querySelectorAll('input[type=checkbox]').forEach(c=>{c.checked=input.checked;c.indeterminate=false})}
   const tree=input.closest?.('[data-lm-tree]');if(tree){const parent=tree.querySelector('[data-lm-tree-parent]'),leaves=[...tree.querySelectorAll('input[type=checkbox]:not([data-lm-tree-parent])')];parent.checked=leaves.every(c=>c.checked);parent.indeterminate=!parent.checked&&leaves.some(c=>c.checked)}
   if(input.matches?.('[data-lm-date-start]')){const end=query(input.dataset.lmDateStart);if(end){end.min=input.value;if(end.value&&end.value<input.value)end.value=input.value}}
   if(input.matches?.('[data-lm-select-all]')){query(input.dataset.lmSelectAll)?.querySelectorAll('tbody input[type=checkbox]').forEach(c=>c.checked=input.checked)}
   if(input.matches?.('[type=file]')){const wrap=input.closest('[data-lm-upload]');if(wrap)wrap.querySelector('output').textContent=[...input.files].map(f=>f.name+' ('+Math.ceil(f.size/1024)+' KB)').join(', ')||'No files selected'}
  });
  on('submit',e=>{const form=closest(e,'[data-lm-validate]');if(!form)return;e.preventDefault();let first=null;form.querySelectorAll('input,select,textarea').forEach(input=>{const valid=input.checkValidity();input.setAttribute('aria-invalid',String(!valid));const error=query(input.getAttribute('aria-describedby')||'');if(error?.matches('.lm-error,.input-error')){error.textContent=valid?'':input.validationMessage;error.hidden=valid}if(!valid&&!first)first=input});if(first)first.focus();else{emit(form,'submit',Object.fromEntries(new FormData(form)));toast('Form validated successfully.')}});
  function refresh(){
  // Adapt existing native demo controls without changing their visual classes.
  root.querySelectorAll(':is(.tabs,.tabs-native)').forEach(tabs=>{
   const list=tabs.querySelector(':is(.tl,.tabs-list-native)');if(!list)return;
   list.setAttribute('role','tablist');list.setAttribute('aria-label','Example tabs');if(tabs.matches('.vt,.tabs-vertical'))list.setAttribute('aria-orientation','vertical');
   const panels=tabs.querySelectorAll(':is(.pn,.tabs-panel-native)');list.querySelectorAll('label[for]').forEach((label,i)=>{const input=query(label.htmlFor);if(!input||!panels[i])return;label.setAttribute('role','tab');label.dataset.lmRadio=input.id;label.id=label.id||'lm-tab-'+(++seq);panels[i].id=panels[i].id||'lm-panel-'+(++seq);label.setAttribute('aria-controls',panels[i].id);label.setAttribute('aria-selected',String(input.checked));label.tabIndex=input.checked?0:-1;panels[i].setAttribute('role','tabpanel');panels[i].setAttribute('aria-labelledby',label.id);panels[i].hidden=!input.checked});
  });
  root.querySelectorAll(':is(.aw,.alert-wrapper) :is(.cl,.alert-close)[for]').forEach(label=>{label.dataset.lmLegacyDismiss=label.htmlFor;label.tabIndex=0;label.setAttribute('role','button')});
  root.querySelectorAll('input[type=range]:not([data-lm-output]):not([data-lm-dual]):not([data-lm-compare])').forEach(input=>{const line=input.parentElement.querySelector(':is(.vl,.range-value)');const out=line?.querySelector('b');if(out){out.id=out.id||'lm-range-'+(++seq);input.dataset.lmOutput=out.id;input.setAttribute('aria-label',line.querySelector('span')?.textContent||'Value')}});
  root.querySelectorAll(':is(.stp,.stepper-native)>button[aria-label],:is(.vst,.stepper-vertical)>button[aria-label]').forEach(button=>{if(button.getAttribute('aria-label')==='Less')button.dataset.lmLegacyStep='-1';if(button.getAttribute('aria-label')==='More')button.dataset.lmLegacyStep='1'});
  root.querySelectorAll('table').forEach(table=>{
   table.querySelectorAll(':is(.srt,.table-sort)').forEach(span=>{if(span.tagName==='BUTTON')return;const button=document.createElement('button');button.type='button';button.className=span.className;button.dataset.lmSort='';button.style.cssText='border:0;background:none;color:inherit;font:inherit;cursor:pointer';button.append(...span.childNodes);span.replaceWith(button);button.closest('th').setAttribute('aria-sort','none')});
   const all=table.querySelector('thead input[type=checkbox]');if(all&&!all.dataset.lmSelectAll){table.id=table.id||'lm-table-'+(++seq);all.dataset.lmSelectAll=table.id}
  });
  root.querySelectorAll(':is(.lm-combobox,.combobox) [role=option]').forEach(o=>{if(!o.id)o.id='lm-option-'+(++seq)});
  root.querySelectorAll('dialog').forEach(d=>{if(dialogs.has(d))return;dialogs.add(d);const closed=()=>{d._lmOpener?.focus()};d.addEventListener('close',closed,{signal:abort.signal});cleanups.push(()=>{if(d.open)d.close()})});
  }
  refresh();
  const api={toast,refresh,destroy(){abort.abort();timers.forEach(clearTimeout);cleanups.forEach(fn=>fn());mounts.delete(root)}};mounts.set(root,api);return api;
 }
 async function copy(text){if(navigator.clipboard&&global.isSecureContext)return navigator.clipboard.writeText(text);const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.append(t);t.select();const success=document.execCommand('copy');t.remove();if(!success)throw Error('Clipboard unavailable')}
 global.LumenUI={version:'3.0.0',mount,refresh:root=>mount(root).refresh(),copy};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount(document),{once:true});else mount(document);
})(window);
