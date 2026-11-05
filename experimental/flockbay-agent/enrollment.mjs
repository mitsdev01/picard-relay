// Retained enrollment schema v1 / gate v3, owned by this integration.
// No imports from a replaceable Picard release directory.
import {createHash} from 'node:crypto';
const normalize=v=>Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])])):v;
export const enrollmentDigest=e=>createHash('sha256').update(JSON.stringify(normalize(e))).digest('hex');
export function validEnrollment(gate,key){
 const e=gate?.costEnrollment;
 const fields=['v','provider','model','owner','accountLabel','organizationId','projectId','keySha256','accountPlan','noPaidFallback','verifiedAt','enrolledAt','evidenceRef','keyAssociationEvidenceRef'];
 return gate?.v===3&&!!e&&typeof e==='object'&&!Array.isArray(e)&&Object.keys(e).sort().join(',')===fields.sort().join(',')&&e.v===1&&e.provider==='groq'&&e.model==='openai/gpt-oss-20b'&&e.accountPlan==='Free'&&e.noPaidFallback===true&&['owner','accountLabel','organizationId','projectId','evidenceRef','keyAssociationEvidenceRef'].every(k=>typeof e[k]==='string'&&e[k].trim().length>0&&e[k].length<=500)&&/^[a-f0-9]{64}$/.test(e.keySha256)&&Number.isSafeInteger(e.verifiedAt)&&e.verifiedAt>=0&&Number.isSafeInteger(e.enrolledAt)&&e.enrolledAt>=e.verifiedAt&&e.owner===gate.owner&&typeof key==='string'&&key.length>0&&e.keySha256===createHash('sha256').update(key).digest('hex')&&gate.enrollmentId===enrollmentDigest(e);
}
