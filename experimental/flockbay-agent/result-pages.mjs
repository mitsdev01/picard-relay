// Full results remain in the audit ledger. These pages are mission-local and
// read-only: fetching an old result never repeats the original game action.
export class ResultPages {
 constructor(){this.results=new Map();}
 put(id,result){const text=JSON.stringify(result);this.results.set(id,text);return this.read({id});}
 read({id,offset=0,search}){
  const text=this.results.get(id);
  if(text===undefined)return JSON.stringify({error:'unknown_result'});
  if(!Number.isInteger(offset)||offset<0)return JSON.stringify({error:'invalid_offset'});
  if(search!==undefined){if(typeof search!=='string'||!search)return JSON.stringify({error:'invalid_search'});const found=text.indexOf(search,offset);if(found<0)return JSON.stringify({error:'not_found',id});offset=Math.max(0,found-100);}
  if(text.length<=4000&&offset===0)return text;
  return JSON.stringify({id,offset,total:text.length,next:offset+4000<text.length?offset+4000:null,notice:'Partial cached result. Use read_result with id and next offset, or search for exact text. Never infer omitted output.',text:text.slice(offset,offset+4000)});
 }
}
