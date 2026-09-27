import React,{useState} from 'react';
import StudioSelect from './studio-select.jsx';
import StudioResourceDialog from './studio-resource-dialog.jsx';
import {STUDIO_DATASETS,studioRegionName,studioRegionPatch} from './studio-regions.js';
import {searchRows} from './studio-search-core.js';

export default function StudioDataControls({state,snapshot,template,change,l}){
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[limit,setLimit]=useState(40);
  const historical=['history','party'].includes(template.topic);
  const pollsters=Object.entries(snapshot?.pollsters||{}).map(([id,p])=>({id,name:typeof p==='string'?p:p.name}));
  const selected=state.pollsters===null ? (snapshot?.selectedPollsters||pollsters.map(p=>p.id)) : state.pollsters.split(',');
  const polls=(snapshot?.calculationInputs?.polls||[]).filter(p=>p.date>=snapshot.start&&p.date<=snapshot.end).slice().reverse();
  const name=id=>pollsters.find(p=>p.id===id)?.name||id;
  const visible=searchRows(polls,query,p=>`${p.date} ${name(p.pollster)} ${(p.fieldwork||[]).join(' ')}`);
  if(template.topic==='map')return <p>{l('Diese Karte zeigt immer alle Bundesländer.','This map always shows all German states.','Este mapa siempre muestra todos los estados alemanes.')}</p>;
  return <div className="studio-data-controls">
    <label>{l('Datensatz','Dataset','Conjunto de datos')}
      <StudioSelect aria-label={l('Datensatz','Dataset','Conjunto de datos')} value={state.region} onChange={e=>change(studioRegionPatch(e.target.value))}>
        {STUDIO_DATASETS.map(r=><option key={r[0]} value={r[0]}>{studioRegionName(r[0],state.lang)}</option>)}
      </StudioSelect>
    </label>
    {template.topic==='current'&&<label>{l('Datengrundlage','Data basis','Base de datos')}
      <StudioSelect aria-label={l('Datengrundlage','Data basis','Base de datos')} value={state.currentBasis} onChange={e=>change({currentBasis:e.target.value})}>
        <option value="latest">{l('Neueste Einzelumfrage','Latest individual poll','Última encuesta individual')}</option>
        <option value="average">{l('Institutsdurchschnitt','Polling average','Media de institutos')}</option>
      </StudioSelect>
    </label>}
    {(historical||state.currentBasis==='average')&&<small>{l('Durchschnitt: je ausgewähltem Institut die neueste Umfrage innerhalb von 45 Tagen, gleich gewichtet. Fehlende Werte bleiben fehlend.','Average: latest poll per selected institute within 45 days, equally weighted. Missing values are not filled in.','Media: última encuesta de cada instituto seleccionado en 45 días, con igual peso. No se completan los valores ausentes.')}</small>}
    {pollsters.length>0&&<details className="studio-institute-picker"><summary>{l('Institute auswählen','Choose institutes','Elegir institutos')} · {selected.length}/{pollsters.length}</summary>
      <button className="secondary-button" type="button" onClick={()=>change({pollsters:null})}>{l('Alle Institute','All institutes','Todos los institutos')}</button>
      {pollsters.map(p=><div className="studio-institute-row" key={p.id}><label><input type="checkbox" checked={selected.includes(p.id)} disabled={selected.length===1&&selected.includes(p.id)} onChange={e=>change({pollsters:(e.target.checked?[...selected,p.id]:selected.filter(id=>id!==p.id)).join(',')})}/>{p.name}</label><button type="button" className="secondary-button" aria-label={`${l('Nur','Only','Solo')} ${p.name}`} onClick={()=>change({pollsters:p.id})}>{l('Nur','Only','Solo')}</button></div>)}
    </details>}
    {historical&&<>
      {!['panels','change'].includes(template.design)&&<label><input type="checkbox" checked={state.showPollOrigins} onChange={e=>change({showPollOrigins:e.target.checked})}/>{l('Einzelumfragen auf der Zeitachse zeigen','Show individual polls on the timeline','Mostrar encuestas individuales en la cronología')}</label>}
      <button type="button" className="secondary-button" onClick={()=>setOpen(true)}>{l('Umfragen und Herkunft ansehen','Inspect polls and provenance','Ver encuestas y procedencia')} ({polls.length})</button>
      {open&&<StudioResourceDialog wide title={l('Umfragen und Herkunft','Polls and provenance','Encuestas y procedencia')} l={l} onClose={()=>setOpen(false)}>
        <p>{studioRegionName(state.region,state.lang)} · {snapshot.start} – {snapshot.end}</p>
        <p>{l('Originalveröffentlichungen der ausgewählten Institute. Linien zeigen berechnete Durchschnitte, nicht jede Einzelumfrage.','Original publications from the selected institutes. Lines show calculated averages, not every individual poll.','Publicaciones originales de los institutos seleccionados. Las líneas muestran medias calculadas, no cada encuesta individual.')}</p>
        <input type="search" aria-label={l('Umfragen suchen','Search polls','Buscar encuestas')} value={query} placeholder={l('Institut oder Datum','Institute or date','Instituto o fecha')} onChange={e=>{setQuery(e.target.value);setLimit(40);}}/>
        <div className="studio-poll-audit"><table><thead><tr><th>{l('Veröffentlicht','Published','Publicada')}</th><th>{l('Institut','Institute','Instituto')}</th><th>{l('Befragung / Stichprobe','Fieldwork / sample','Trabajo de campo / muestra')}</th><th>{l('Werte (%)','Values (%)','Valores (%)')}</th></tr></thead><tbody>{visible.slice(0,limit).map((p,i)=><tr key={`${p.date}-${p.pollster}-${i}`}><td>{p.date}</td><td>{name(p.pollster)}</td><td>{p.fieldwork?.join(' – ')||'—'}<br/>{p.sample?`n = ${p.sample.toLocaleString(state.lang)}`:'—'}</td><td>{snapshot.rows.filter(r=>Number.isFinite(p.results[r.id])).map(r=>`${r.name}: ${p.results[r.id].toLocaleString(state.lang)}%`).join(' · ')}</td></tr>)}</tbody></table></div>
        {!visible.length&&<p>{l('Keine Umfragen in dieser Auswahl.','No polls in this selection.','No hay encuestas en esta selección.')}</p>}
        {visible.length>limit&&<button type="button" className="secondary-button" onClick={()=>setLimit(n=>n+40)}>{l('Mehr anzeigen','Show more','Mostrar más')}</button>}
        <a href={`/?region=${state.region}&lang=${state.lang}`} target="_blank" rel="noreferrer">{l('Datensatz und Quellen öffnen','Open dataset and sources','Abrir datos y fuentes')} ↗</a>
      </StudioResourceDialog>}
    </>}
  </div>;
}
