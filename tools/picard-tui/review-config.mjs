import {readFileSync} from 'node:fs';
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
function exact(value,keys){return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===keys.join(',');}

export function loadReviewConfig(file){
 if(typeof file!=='string'||!file)throw new Error('review_configuration_unavailable');
 let text,doc;try{text=readFileSync(file,'utf8');}catch{throw new Error('review_configuration_unavailable');}
 if(Buffer.byteLength(text)>8192)throw new Error('review_configuration_unavailable');
 try{doc=JSON.parse(text);}catch{throw new Error('review_configuration_unavailable');}
 if(!exact(doc,['codingClientId','origin','token','v'])||doc.v!==1||!TOKEN.test(doc.token)||/PLACEHOLDER|REPLACE_ME|example/i.test(doc.token))throw new Error('review_configuration_unavailable');
 let origin;try{origin=new URL(doc.origin);}catch{throw new Error('review_configuration_unavailable');}
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||origin.origin!==doc.origin)throw new Error('review_configuration_unavailable');
 if(typeof doc.codingClientId!=='string'||!/^[a-z0-9-]{1,50}$/.test(doc.codingClientId))throw new Error('review_configuration_unavailable');
 return {v:1,origin:doc.origin,token:doc.token,codingClientId:doc.codingClientId,configFile:file};
}
