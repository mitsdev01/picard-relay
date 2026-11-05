// Fixed host launcher: expected identity follows the immutable current pointer.
// No caller-selected code/path or environment-file rewriting on each upgrade.
import {readlinkSync,lstatSync,realpathSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root='/opt/picard-relay',link=root+'/current',target=readlinkSync(link),s=lstatSync(link);
if(!s.isSymbolicLink()||s.uid!==0||!/^releases\/[a-f0-9]{64}$/.test(target)||realpathSync(link)!==root+'/'+target)throw Error('unsafe_current');
process.env.BRIDGE_RELEASE_HASH=target.slice(9);
const {main}=await import(pathToFileURL(root+'/'+target+'/src/oracle-service.mjs'));
await main();
