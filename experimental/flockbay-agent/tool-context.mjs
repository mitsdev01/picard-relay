// Documentation is not validation. Keep every schema constraint while omitting
// verbose descriptive metadata from the provider-facing copy only.
export function compactSchema(value){
 if(Array.isArray(value))return value.map(compactSchema);
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).filter(([key])=>!['description','title','examples','$comment'].includes(key)).map(([key,v])=>[key,['enum','const','default'].includes(key)?structuredClone(v):['properties','patternProperties','$defs','definitions'].includes(key)?Object.fromEntries(Object.entries(v).map(([name,schema])=>[name,compactSchema(schema)])):compactSchema(v)]));
}
export function discoverTools(available,query){
 const exact=available.find(t=>t.name===String(query).trim());if(exact)return [exact];
 const words=String(query||'').toLowerCase().split(/\W+/).filter(Boolean);
 return available.map(t=>({t,n:words.reduce((n,w)=>n+(t.name.toLowerCase().includes(w)?5:0),0)})).filter(x=>x.n).sort((a,b)=>b.n-a.n).slice(0,2).map(x=>x.t);
}
