const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const txt=(x,y,s,c='direct-label',extra='')=>`<text x="${x}" y="${y}" class="${c}" ${extra}>${esc(s)}</text>`;
const line=(x1,y1,x2,y2,c='chart-grid')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${c}"/>`;
const note=(x,y,s,x2,y2)=>`${line(x,y+8,x2,y2,'pencil draw-line')}${txt(x,y,s,'pencil-note')}`;
const tip=(s,marks)=>`<g tabindex="0" data-tip="${esc(s)}" aria-label="${esc(s)}">${marks}</g>`;
const rect=(x,y,w,h,c='data-bar')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${c}"/>`;
export function render(c,width=900,regional=true){
 const w=Math.max(280,Math.round(width)), small=w<550;let h=360,a='';

 if(c.kind==='scatter'){
  h=small?440:490;const left=42,right=small?25:55,top=65,bottom=75,x=v=>left+v/14*(w-left-right),y=v=>h-bottom-(v-50)/50*(h-top-bottom);
  for(const v of [50,75,100])a+=line(left,y(v),w-right,y(v))+txt(left-8,y(v)+4,v,'axis-label','text-anchor="end"');
  for(const v of [0,3,6,9,12])a+=txt(x(v),h-bottom+24,v,'axis-label','text-anchor="middle"');
  a+=txt(left,20,'Q1+Q2 share of quartiled journal articles/reviews (%)','axis-label')+txt(left,h-8,'Papers per academic per year','axis-label');
  const rows=c.data.filter(r=>r.rate!=null&&(regional||r.group==='Malaysia'));
  rows.filter(r=>r.unit!=='UPM').forEach(r=>a+=tip(`${r.unit}: ${r.rate} papers per academic/year; ${r.q12}% Q1+Q2`,`<circle cx="${x(r.rate)}" cy="${y(r.q12)}" r="5" class="peer-dot"/>`));
  const r=rows.find(r=>r.unit==='UPM');a+=line(x(r.rate),y(50),x(r.rate),y(r.q12),'compass-guide')+line(left,y(r.q12),x(r.rate),y(r.q12),'compass-guide');
  a+=tip('UPM: 3.05 papers per academic/year; 78% Q1+Q2',`<circle cx="${x(r.rate)}" cy="${y(r.q12)}" r="8" class="focus-dot"/>`)+txt(x(r.rate)+12,y(r.q12)+22,'UPM');
  a+=note(small?90:w*.5,46,'Two measures, one position',x(r.rate),y(r.q12)-10);
  a+=txt(w-right,h-bottom+48,`${rows.length} units plotted`,'axis-label','text-anchor="end"');
 }else if(c.kind==='rates'){
  h=430;const left=small?115:175,right=48,x=v=>left+v/10*(w-left-right);
  a+=txt(left,24,'\u25cb 2006\u20132026   \u25cf 2022\u20132026','axis-label');
  c.data.forEach((r,i)=>{let y=65+i*53;a+=(small&&r.unit==='Nottingham Malaysia'?txt(left-12,y-4,'Nottingham','direct-label','text-anchor="end"')+txt(left-12,y+12,'Malaysia','direct-label','text-anchor="end"'):txt(left-12,y+4,r.unit,'direct-label','text-anchor="end"'))+line(x(r.full),y,x(r.recent),y,r.unit==='UPM'?'data-line draw-line':'context-line')+`<circle cx="${x(r.full)}" cy="${y}" r="5" class="open-dot"/><circle cx="${x(r.recent)}" cy="${y}" r="5" class="${r.unit==='UPM'?'focus-dot':'peer-dot'}"/>`+txt(x(r.recent)+9,y+4,r.recent);});
  for(const v of [0,5,10])a+=txt(x(v),h-20,v,'axis-label','text-anchor="middle"');
 }else if(c.kind==='trend'){
  h=small?360:400;const left=35,right=35,top=65,bot=45,x=i=>left+i/20*(w-left-right),y=v=>h-bot-v/160*(h-top-bot);
  for(const v of [0,80,160])a+=line(left,y(v),w-right,y(v))+txt(left-6,y(v)+4,v,'axis-label','text-anchor="end"');
  let path=c.data.map((r,i)=>`${i?'L':'M'}${x(i)},${y(r.papers)}`).join(' ');a+=`<path d="${path}" class="data-line draw-line" pathLength="1"/>`;
  c.data.forEach((r,i)=>a+=tip(`${r.year}: ${r.papers} papers${r.year===2026?' (partial year)':''}`,`<circle cx="${x(i)}" cy="${y(r.papers)}" r="${r.year===2020?5:3}" class="${r.year===2020?'focus-dot':'peer-dot'}"/>`));
  [0,7,14,20].forEach(i=>a+=txt(x(i),h-12,c.data[i].year,'axis-label','text-anchor="middle"'));
  a+=note(small?60:180,25,'2020 peak: 152 papers',x(14),y(152)-6)+txt(x(20)-8,y(65)+24,'65*','direct-label','text-anchor="end"');
 }else if(c.kind==='bases'){
  h=300;const max=1800;c.data.forEach((r,i)=>{let y=42+i*112;a+=txt(0,y,r.label)+rect(0,y+16,(w-65)*r.value/max,27,i===0?'focus-mark':'muted-mark')+txt((w-65)*r.value/max+8,y+36,r.value);});
  a+=txt(0,280,'Different inclusion rules; neither is a correction of the other.','axis-label');
 }

 return `<svg xmlns="http://www.w3.org/2000/svg" class="chart-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(c.title)}"><title>${esc(c.title)}</title>${a}</svg>`;
}
if(typeof document!=='undefined'){
 const {bindTips}=await import('./figures.js');
 const plots=[...document.querySelectorAll('[data-profile-figure]')];let regional=true;
 function draw(host){const c=JSON.parse(host.querySelector('.chart-data').textContent);host.querySelector('[data-plot]').innerHTML=render(c,host.clientWidth,regional);bindTips(host);}
 for(const host of plots){let frame;new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>draw(host));}).observe(host);draw(host);}
 document.querySelectorAll('[data-scope]').forEach(button=>button.addEventListener('click',()=>{regional=button.dataset.scope==='all';document.querySelectorAll('[data-scope]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));plots.filter(p=>p.dataset.kind==='scatter').forEach(draw);document.querySelector('[data-scope-status]').textContent=regional?'22 units with staff denominators; Malaysia and regional peers.':'19 Malaysian units with staff denominators.';}));
}
