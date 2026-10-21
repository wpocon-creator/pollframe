import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

test('topic and profile PNGs are actually painted in light/dark and retain the selected scope',async({page},info)=>{
  await page.goto('/?view=party-match&lang=de');
  const outputs=await page.evaluate(async()=>{
    const {questionsForRound}=await import('/src/party-match-rounds.js');
    const {MATCH_QUESTIONS}=await import('/src/party-match-data.js');
    const {calculateMatches}=await import('/src/party-match-model.js');
    const {resultDocument,renderMatchPng,matchDesignSvg}=await import('/src/party-match-design.js');
    const out=[];
    for(const round of ['economy','social','climate-energy','general']){
      const questions=round==='general'?MATCH_QUESTIONS:questionsForRound(round);
      const answers=Object.fromEntries(questions.map((q,i)=>[q.id,{value:[1,0,-1][i%3]}]));
      const doc=resultDocument(calculateMatches(answers,questions),questions.length,'de',{answers,questions,round});
      for(const dark of [false,true])for(const style of round==='general'?['spectrum-profile']:['pollframe','topics-bars']){
        const design={style,dark,party:'spd',spectrumX:'society',spectrumY:'climate'};
        const vector=matchDesignSvg(doc,design);
        const blob=await renderMatchPng(doc,design);
        const url=URL.createObjectURL(blob),img=new Image();
        try{
          await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src=url;});
          const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
          const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
          const data=ctx.getImageData(0,0,img.width,img.height).data,colors=new Set();
          for(let p=0;p<data.length;p+=4*43)if(data[p+3]>240)colors.add(`${data[p]},${data[p+1]},${data[p+2]}`);
          const encoded=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});
          out.push({round,dark,style,bytes:blob.size,width:img.width,height:img.height,colors:colors.size,svg:vector.svg,png:encoded});
        }finally{URL.revokeObjectURL(url);}
      }
    }
    return out;
  });
  expect(outputs).toHaveLength(14);
  for(const o of outputs){
    expect(o.bytes).toBeGreaterThan(12000);
    expect(o.width).toBe(1200);expect(o.height).toBe(1200);
    expect(o.colors).toBeGreaterThan(8);
    expect(o.svg).not.toMatch(/NaN|Infinity|undefined/);
    if(o.round!=='general')expect(o.svg).toContain('15 Fragen');
    if((o.round==='social'&&o.style==='topics-bars'&&!o.dark)||(o.round==='general'&&o.dark))await writeFile(info.outputPath(`${o.round}-${o.style}.png`),Buffer.from(o.png.split(',')[1],'base64'));
  }
});
