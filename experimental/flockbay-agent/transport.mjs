import http from 'node:http';
import https from 'node:https';
export function requestJson(url,{method='GET',headers={},body,timeout=30000,signal,maxBytes=2*1024*1024}={}) {
  const u=new URL(url);
  if(u.username||u.password||u.hash||!['https:','http:'].includes(u.protocol)||(u.protocol==='http:'&&u.hostname!=='127.0.0.1')) throw Error('transport_scope_invalid');
  return new Promise((resolve,reject)=>{
    const data=body===undefined?undefined:JSON.stringify(body);
    const req=(u.protocol==='https:'?https:http).request(u,{method,headers:{...headers,...(data?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}:{})},signal,rejectUnauthorized:true,agent:false},res=>{
      if(res.statusCode>=300&&res.statusCode<400){res.destroy();reject(Error('redirect_rejected'));return;}
      let chunks=[],size=0;
      res.on('data',chunk=>{size+=chunk.length;if(size>maxBytes){res.destroy(Error('response_too_large'));return;}chunks.push(chunk);});
      res.on('error',reject);
      res.on('end',()=>{try{const raw=Buffer.concat(chunks).toString('utf8');const headers=Object.fromEntries(Object.entries(res.headers).filter(([k,v])=>(k==='retry-after'||k.startsWith('x-ratelimit-'))&&typeof v==='string'));resolve({status:res.statusCode,headers,body:raw?JSON.parse(raw):null});}catch{reject(Error('invalid_json_response'));}});
    });
    req.setTimeout(timeout,()=>req.destroy(Error('transport_timeout')));
    req.on('error',reject);req.end(data);
  });
}
