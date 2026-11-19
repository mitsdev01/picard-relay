// Source recipe: accept only the legacy and current KDF profiles.
export function applyKdfHardening(source){
 const swap=(before,after)=>{if(source.includes(after))return;if(source.split(before).length!==2)throw Error('Password KDF compatibility anchor changed');source=source.replace(before,after);};
 swap('const PARAMS=Object.freeze({N:16384,r:8,p:1,maxmem:32*1024*1024});', 'const PARAMS=Object.freeze({N:16384,r:8,p:5,maxmem:32*1024*1024});\nfunction storedParams(password){return {...PARAMS,p:password.p};}');
 swap('p.p===PARAMS.p&&encoded(p.salt,16)', '(p.p===1||p.p===PARAMS.p)&&encoded(p.salt,16)');
 swap("const derived=await scrypt(bytes,Buffer.from(state.password.salt,'base64url'),32,PARAMS);let valid;", "const derived=await scrypt(bytes,Buffer.from(state.password.salt,'base64url'),32,storedParams(state.password));let valid;");
 swap('const completedAt=now();check(integer(completedAt)&&completedAt>=at);const result=session(state,completedAt);', "if(state.password.p!==PARAMS.p){\n     const salt=randomBytes(16),upgraded=await scrypt(bytes,salt,32,PARAMS);\n     try{state.password={algorithm:'scrypt',N:PARAMS.N,r:PARAMS.r,p:PARAMS.p,salt:salt.toString('base64url'),hash:upgraded.toString('base64url')};}finally{upgraded.fill(0); }\n    }\n    const completedAt=now();check(integer(completedAt)&&completedAt>=at);const result=session(state,completedAt);");
 if(source.includes("const proof=await scrypt(current,"))swap("const proof=await scrypt(current,Buffer.from(state.password.salt,'base64url'),32,PARAMS);", "const proof=await scrypt(current,Buffer.from(state.password.salt,'base64url'),32,storedParams(state.password));");
 return source;
}
