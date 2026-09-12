import {readFile,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {latestCisIssues} from './lib/cis-issues.mjs';

const path=resolve('public/spain-summary.json');
const summary=JSON.parse(await readFile(path,'utf8'));
const issues=await latestCisIssues();
if(issues.date<(summary.issues?.fieldwork?.[1]||summary.issues?.date||''))throw Error('Refusing to replace CIS data with an older study');
// Only commit after all four tables and the matching technical sheet validate.
const output={...summary,issues};
await writeFile(path+'.tmp',JSON.stringify(output)+'\n');await rename(path+'.tmp',path);
console.log(`CIS ${issues.study}: fieldwork ${issues.fieldwork.join('–')}, ${issues.items.length} national and ${issues.personal.length} personal concerns`);
