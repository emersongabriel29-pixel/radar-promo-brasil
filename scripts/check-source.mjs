import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const directories=['api','lib','hatchable','pages','public','server','scripts'];
function files(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):/\.(m?js)$/.test(entry.name)?[path.join(directory,entry.name)]:[]);}
const sources=['server.js',...directories.flatMap(files)];
for(const source of sources){const result=spawnSync(process.execPath,['--check',source],{encoding:'utf8'});if(result.status!==0){process.stderr.write(result.stderr);process.exit(1);}}
console.log(`${sources.length} arquivos JavaScript verificados.`);
