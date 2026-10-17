const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const txt=(x,y,s,c='direct-label',extra='')=>`<text x="${x}" y="${y}" class="${c}" ${extra}>${esc(s)}</text>`;
const line=(x1,y1,x2,y2,c='chart-grid')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${c}"/>`;
const note=(x,y,s,x2,y2)=>`${line(x,y+8,x2,y2,'pencil draw-line')}${txt(x,y,s,'pencil-note')}`;
const tip=(s,marks)=>`<g tabindex="0" data-tip="${esc(s)}" aria-label="${esc(s)}">${marks}</g>`;
const rect=(x,y,w,h,c='data-bar')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${c}"/>`;
export function render(c,width=900,regional=true){
 const w=Math.max(280,Math.round(width)), small=w<550;let h=360,a='';

 if(c.kind==='barcode'){
  const rows=c.data.filter(r=>r.year>=2020), cols=small?25:60, pitch=(w-100)/cols;
  h=40+rows.reduce((s,r)=>s+Math.ceil(r.papers/cols)*7+38,0);let y=25;
  for(const r of rows){
   a+=txt(0,y+12,r.year,'direct-label')+txt(w-1,y+12,r.papers+(r.year===2026?'*':''),'direct-label','text-anchor="end"');
   for(let i=0;i<r.papers;i++) a+=rect(52+i%cols*pitch,y+Math.floor(i/cols)*7,pitch*.5,4,r.year===2025?'focus-mark':'muted-mark');
   y+=Math.ceil(r.papers/cols)*7+38;
  }
  a+=txt(52,h-7,'One mark = one credited paper','axis-label');
 }else if(c.kind==='coverage'){
  h=small?430:330; const r=small?76:110,cx=small?w/2:w*.29,cy=small?110:147,total=c.data.reduce((s,r)=>s+r.value,0);let at=-90;
  for(const d of c.data){const end=at+d.value/total*360;const p=t=>[cx+r*Math.cos(t*Math.PI/180),cy+r*Math.sin(t*Math.PI/180)];const s=p(at),e=p(end);a+=`<path d="M${s} A${r},${r} 0 ${end-at>180?1:0} 1 ${e}" fill="none" stroke="var(--${d.label==='-'?'axis':d.label==='Q1'?'teal':'rule'})" stroke-width="28"/>`;at=end;}
  a+=txt(cx,cy, total,'aperture-number','text-anchor="middle"')+txt(cx,cy+24,'papers','axis-label','text-anchor="middle"');
  let y=small?242:55,x=small?15:w*.57;
  for(const d of c.data){a+=line(x,y-4,x+15,y-4,d.label==='Q1'?'data-line':'context-line')+txt(x+26,y,`${d.label==='-'?'No quartile':d.label}: ${d.value}`);y+=30;}
  a+=line(small?218:w*.55,small?208:h-47,cx+r*.7,cy+r*.7,'pencil draw-line')+txt(small?12:w*.55,small?214:h-28,'397 / 671 = 59.2% Q1+Q2','pencil-note');
 }else if(c.kind==='wos'){
  h=310;const labels=['Matched to FKK Scopus','Not in FKK Scopus','Scopus; profile mismatch'];
  c.data.forEach((d,i)=>{const y=45+i*79;a+=txt(0,y,labels[i])+rect(0,y+12,(w-68)*d.value/886,18,i===0?'focus-mark':'muted-mark')+txt((w-68)*d.value/886+8,y+26,d.value);});
  a+=txt(0,h-4,'886 records in this WoS extract','axis-label');
 }else if(c.kind==='sdg'){
  h=360;const max=220,left=small?70:100,right=55;
  c.data.forEach((d,i)=>{const y=38+i*59; a+=txt(left-12,y+5,d.label,'direct-label','text-anchor="end"')+line(left,y+19,w-right,y+19)+tip(`${d.goal}: ${d.value} papers`,rect(left,y-8,(w-left-right)*d.value/max,20,d.label==='SDG 7'?'focus-mark':'muted-mark'))+txt(left+(w-left-right)*d.value/max+8,y+7,d.value);});
  const end=left+(w-left-right)*196/max;
  a+=`<path d="M${left} ${h-28} H${end} V${38+2*59+12}" class="pencil draw-line" fill="none"/>`+txt(left,h-9,'Energy has the largest count shown','pencil-note');
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
