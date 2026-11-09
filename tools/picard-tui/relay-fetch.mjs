import {createHttpsTransport} from '../coding-connector/client.mjs';

export async function relayGet({origin,token,path}){
 const transport=createHttpsTransport(origin);
 const base=new URL(origin);
 const headers={accept:'application/json',host:base.host,origin,authorization:'Bearer '+token};
 const response=await transport({method:'GET',path,headers});
 let body;try{body=JSON.parse(response.body);}catch{throw new Error('response_invalid');}
 return {status:response.status,body};
}

export async function relayPost({origin,token,path,json}){
 const transport=createHttpsTransport(origin);
 const base=new URL(origin);
 const raw=JSON.stringify(json);
 if(Buffer.byteLength(raw)>24576)throw new Error('request_too_large');
 const headers={accept:'application/json',host:base.host,origin,authorization:'Bearer '+token,'content-type':'application/json; charset=utf-8'};
 const response=await transport({method:'POST',path,headers,body:raw});
 let body;try{body=JSON.parse(response.body);}catch{throw new Error('response_invalid');}
 return {status:response.status,body};
}
