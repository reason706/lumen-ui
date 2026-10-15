import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const c=JSON.parse(await readFile('catalog/components.json','utf8'));
assert.equal(c.items.filter(x=>x.source!=='core'&&!x.added).length+(c.mergedOriginalKeys||[]).length,473,'Retain original content through canonical examples and merged aliases');
for(const key of c.mergedOriginalKeys||[])assert(c.items.some(x=>x.key===c.aliases[key]),'Merged example must resolve: '+key);
assert.equal(new Set(c.items.map(x=>x.key)).size,c.items.length,'Stable keys must be unique');
const sources=new Map();
for(const item of c.items){
 assert(c.categories.some(x=>x.id===item.category),item.key+' category');
 assert(item.title&&item.title!=='section',item.key+' must have a meaningful title');
 assert(item.family&&item.tags.length,item.key+' metadata');
 if(!sources.has(item.template))sources.set(item.template,await readFile(item.template,'utf8'));
 assert(sources.get(item.template).includes('<template id="'+item.id+'">'),item.key+' missing markup');
 for(const file of item.css)await access(file);
}
console.log(`PASS catalog: ${c.items.length} examples, ${c.categories.length} categories; original content retained with merged aliases`);
