export function verifyProjectStatus(result,project){
 const first=(result.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\n').split('\n')[0];
 const actual=first.match(/ editor is open on .+ at (.+)\/\.$/)?.[1];
 const norm=s=>s.replaceAll('\\','/').replace(/\/$/,'').toLowerCase();
 if(result.isError||!actual||norm(actual)!==norm(project))throw Error('Pinned Flockbay project is not open');
 return result;
}
