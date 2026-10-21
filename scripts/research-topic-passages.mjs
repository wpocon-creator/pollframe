// Read-only evidence helper. Input PDFs/text are temporary research material,
// never bundled or redistributed. Pages count the cover, matching PDF links.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const [folder, expression, parties='spd,union,fdp,greens,afd,bsw,left'] = process.argv.slice(2);
if (!folder || !expression) throw Error('Usage: research-topic-passages.mjs directory regex [parties]');
const pattern=new RegExp(expression,'i');
for(const id of parties.split(',')) {
  if(!/^(spd|union|fdp|greens|afd|bsw|left)$/.test(id))throw Error('Unknown party');
  console.log('\nPARTY',id);
  readFileSync(resolve(folder,id+'.txt'),'utf8').split('\f').forEach((page,i)=>{
    if(i<3)return; // Tables of contents are not evidence of a position.
    const lines=page.split('\n');
    lines.forEach((line,j)=>{
      if(pattern.test(line)) console.log('PDF',i+1,lines.slice(Math.max(0,j-2),j+6).join(' ').replace(/\s+/g,' '));
    });
  });
}
