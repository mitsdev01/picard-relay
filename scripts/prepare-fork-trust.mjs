// Pure staging transform: no filesystem writes, host access or installation.
const upstream='bmartynowicz/picard-relay',fork='mitsdev01/picard-relay';
export function prepareForkTrust(files){
 const counts={'fetch-release.mjs':1,'run-once.mjs':1,'sigstore-verifier.mjs':2,'guarded-update.mjs':1,'policy.json':1};
 if(!files||Object.keys(files).length!==6)throw Error('migration_file_set_invalid');
 const prepared={};
 for(const [name,count] of Object.entries(counts)){
  const text=files[name];
  if(typeof text!=='string'||text.split(upstream).length-1!==count||text.includes(fork))throw Error('migration_source_mismatch');
  prepared[name]=text.replaceAll(upstream,fork).replaceAll(`${fork}/main/releases/stable.json`,`${fork}/release-feed/releases/stable.json`);
 }
 const verifier=prepared['sigstore-verifier.mjs'];
 const old='/sign-release.yml@refs/heads/main';
 if(verifier.split(old).length!==2)throw Error('migration_identity_mismatch');
 prepared['sigstore-verifier.mjs']=verifier.replace(old,'/sign-fork-release.yml@refs/heads/main');
 const policy=JSON.parse(prepared['policy.json']);
 if(policy.signatureMode!=='sigstore'||policy.source!==`https://raw.githubusercontent.com/${fork}/release-feed/releases/stable.json`)throw Error('migration_policy_invalid');
 const pull=files['pull.mjs'],needle='.test(u.pathname))';
 if(typeof pull!=='string'||pull.includes(fork)||pull.split(needle).length!==2)throw Error('migration_fetch_validator_mismatch');
 prepared['pull.mjs']=pull.replace(needle,`.test(u.pathname)&&u.pathname!=='/${fork}/release-feed/releases/stable.json')`);
 return prepared;
}
