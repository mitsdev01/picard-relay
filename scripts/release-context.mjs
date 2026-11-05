// Separate publisher domains; never reset the host's monotonic sequence state.
export function releaseContext(env) {
 const fork=env.PICARD_FORK_RELEASE==='1';
 const repository=fork?'mitsdev01/picard-relay':'bmartynowicz/picard-relay';
 if(env.GITHUB_REPOSITORY!==repository||env.GITHUB_REF!=='refs/heads/main'||!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??''))throw Error('release_context_invalid');
 const run=Number(env.GITHUB_RUN_NUMBER),attempt=Number(env.GITHUB_RUN_ATTEMPT);
 if(!Number.isSafeInteger(run)||run<1||!Number.isSafeInteger(attempt)||attempt<1||attempt>999)throw Error('release_sequence_invalid');
 const sequence=(fork?1000000000:0)+run*1000+attempt;
 if(!Number.isSafeInteger(sequence))throw Error('release_sequence_invalid');
 return {sequence,version:`${fork?2:1}.0.${run}`};
}
