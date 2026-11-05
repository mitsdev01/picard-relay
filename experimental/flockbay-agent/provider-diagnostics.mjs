// Never retain failed_generation, echoed source, headers or arbitrary provider
// message text. Keep safe identifiers and a classification instead.
export function providerDiagnostic(status,body){
 const e=body?.error||{},identifier=v=>typeof v==='string'&&/^[a-zA-Z0-9_.-]{1,80}$/.test(v)?v:null;
 const message=String(e.message||'');
 return {status,code:identifier(e.code),type:identifier(e.type),
  category:/tool|function|failed_generation/i.test(message)?'tool_generation_or_validation':/context|token|length/i.test(message)?'context_or_tokens':/schema|parameter|argument|messages/i.test(message)?'request_validation':'unclassified',
  hasFailedGeneration:typeof e.failed_generation==='string',
  messageLength:message.length};
}
