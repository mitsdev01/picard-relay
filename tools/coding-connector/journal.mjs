// Durable local request identity. Losing a response must not mint a new request.
import {closeSync,existsSync,fsyncSync,mkdirSync,openSync,readFileSync,renameSync,writeSync} from 'node:fs';
import {join} from 'node:path';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
function fail(code){const error=new Error(code);error.code=code;return error;}

export function createJournal(dir){
 if(typeof dir!=='string'||!dir)throw fail('journal_unavailable');
 mkdirSync(dir,{recursive:true});
 const file=id=>{if(!UUID.test(id))throw fail('request_invalid');return join(dir,id+'.json');};
 const write=(target,record)=>{
  const tmp=target+'.tmp',fd=openSync(tmp,'w',0o600);
  try{writeSync(fd,JSON.stringify(record));fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(tmp,target);
 };
 return {
  load(id){
   const target=file(id);if(!existsSync(target))return null;
   let record;try{record=JSON.parse(readFileSync(target,'utf8'));}catch{throw fail('journal_invalid');}
   if(!record||record.v!==1||record.requestId!==id||!Number.isSafeInteger(record.revision)||record.revision<1)throw fail('journal_invalid');
   return record;
  },
  create(record){
   const target=file(record?.requestId);
   if(existsSync(target)||record.v!==1||record.revision!==1)throw fail('journal_conflict');
   const fd=openSync(target,'wx',0o600);
   try{writeSync(fd,JSON.stringify(record));fsyncSync(fd);}finally{closeSync(fd);}
   return record;
  },
  save(record){
   const current=this.load(record.requestId);
   if(!current||record.revision!==current.revision+1)throw fail('journal_conflict');
   write(file(record.requestId),record);return record;
  }
 };
}
