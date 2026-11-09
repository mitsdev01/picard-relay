import {homedir} from 'node:os';
import {join} from 'node:path';

export function userPicardDir(){return join(homedir(),'.picard');}
export function defaultCodingConfigPath(){return join(userPicardDir(),'coding-client.json');}
export function defaultReviewClientPath(){return join(userPicardDir(),'review-client.json');}
export function defaultWorkspacesPath(){return join(userPicardDir(),'workspaces.json');}
