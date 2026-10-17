import {svgElement as el, scale, bindTips, drawChart, motionPreference} from './figures.js';

const files=['01_real_income_growth.json','02_mean_median_gap.json','03_income_less_expenditure.json','04_poverty_change.json','05_price_categories.json','06_national_long_view.json'];
const base=new URL('../../data/malaysia/',import.meta.url);
const money=v=>`RM${v.toLocaleString('en-MY')}`;
const short=s=>s.replace('W.P. Kuala Lumpur','Kuala Lumpur').replace('W.P. Putrajaya','Putrajaya').replace('W.P. Labuan','Labuan');
async function read(file){const r=await fetch(new URL(file,base));if(!r.ok)throw Error(`${file}: ${r.status}`);return r.json();}
function svg(host,w,h,label){host.replaceChildren();const s=el('svg',{viewBox:`0 0 ${w} ${h}`,class:'income-svg',role:'img','aria-label':label});s.append(el('title',{},label));host.append(s);return s;}
function text(s,x,y,t,cls='',anchor='start'){s.append(el('text',{x,y,class:cls,'text-anchor':anchor},t));}
function line(s,x1,y1,x2,y2,cls='chart-grid'){s.append(el('line',{x1,y1,x2,y2,class:cls}));}
function animate(s){if(!motionPreference.matches)s.querySelectorAll('.actual').forEach(n=>{n.setAttribute('pathLength',1);n.classList.add('ink-reveal');});}

async function start(){
 const lead=document.querySelector('#income-lead-plot');
 if(lead){const d=await read(files[0]);const rows=d.data.filter(r=>r.start_year===2016);const config={title:'Real median income growth, 2016–2024',description:'Terengganu leads at 25.4%; Perak records 2.9%.',kind:'bar',unit:'%',max:30,data:rows.map(r=>({label:short(r.state),value:r.real_growth_pct}))};new ResizeObserver(()=>drawChart(lead,config)).observe(lead);drawChart(lead,config);return;}
 if(!document.querySelector('#prediction-plot'))return;
 const results=await Promise.all(files.map(read));
 prediction(results[5].data);gap(results[1].data);ledger(results[2].data);poverty(results[3].data);prices(results[4].data);
 maps(results,await read('states.geojson')); 
}

function prediction(rows){
 const host=document.querySelector('#prediction-plot'),year=document.querySelector('#guess-year'),input=document.querySelector('#guess-value');
 const guesses=new Map([[1970,166]]);let revealed=motionPreference.matches,dragging=false;
 rows.filter(r=>r.year!==1970&&r.year!==2020).forEach(r=>year.add(new Option(r.year,r.year)));year.value='2024';
 function keyboard(){input.value=guesses.get(+year.value)??166;document.querySelector('#guess-output').value=money(+input.value);}
 year.addEventListener('change',keyboard);input.addEventListener('input',()=>{guesses.set(+year.value,+input.value);document.querySelector('#guess-output').value=money(+input.value);draw();});
 function reveal(){revealed=true;draw(true);document.querySelector('#prediction-readout').textContent='In 2024: RM7,017 nominal; RM5,284 at 2010 prices. The 1970 real median was RM706. Coverage changes prevent a like-for-like historical growth claim.';document.querySelector('.keyboard-guess').hidden=true;document.querySelector('#reset-guess').disabled=true;}
 document.querySelector('#reveal').onclick=reveal;document.querySelector('#skip-evidence').onclick=reveal;
 document.querySelector('#reset-guess').onclick=()=>{guesses.clear();guesses.set(1970,166);draw();keyboard();};
 function draw(ink=false){
  const w=Math.max(280,host.clientWidth),h=w<500?350:440,L=48,R=18,T=42,B=h-60,x=scale(1970,2024,L,w-R),y=scale(0,10000,B,T),s=svg(host,w,h,'National median household income, 1970–2024; nominal RM and constant 2010 RM.');
  [0,2500,5000,7500,10000].forEach(v=>{line(s,L,y(v),w-R,y(v));text(s,L-8,y(v)+4,v===0?'0':`${v/1000}k`,'axis-label','end');});
  [1970,1989,2010,2024].forEach(v=>text(s,x(v),h-35,v,'axis-label',v===2024?'end':'start'));text(s,L,19,'Monthly household income (RM)');
  if(revealed){
   const survey=rows.filter(r=>r.year!==2020);
   for(const [key,color,label] of [['median_nominal_rm','var(--blue)','Nominal RM7,017'],['median_real_2010_rm','var(--teal)','2010 RM5,284']]){
    s.append(el('path',{d:survey.map((r,i)=>`${i?'L':'M'}${x(r.year)},${y(r[key])}`).join(' '),class:'actual',stroke:color}));
    survey.forEach(r=>s.append(el('circle',{cx:x(r.year),cy:y(r[key]),r:3,class:'actual-dot',stroke:color,tabindex:0,'data-tip':`${r.year}: ${money(r[key])}; ${r.geography}; ${r.population_scope}`})));
    const last=rows.at(-1);text(s,x(2024)-4,y(last[key])-12,label,'','end');
    const estimate=rows.find(r=>r.year===2020),px=x(2020),py=y(estimate[key]);s.append(el('path',{d:`M${px},${py-5}l5,5 -5,5 -5,-5Z`,class:'estimate','data-tip':`2020 estimate: ${money(estimate[key])}`,tabindex:0}));
   }
   line(s,x(1989),T,x(1989),B,'pencil');text(s,x(1989)+6,T+18,'1989: citizens only','pencil-note');
   text(s,L,h-8,'1970 & 1974: Peninsular Malaysia only','axis-label');
   if(ink){animate(s);s.querySelectorAll('.pencil-note').forEach(n=>n.classList.add('ink-callout'));}
  }else{text(s,w-20,85,'Your line goes here','pencil-note','end');}
  const sorted=[...guesses].sort((a,b)=>a[0]-b[0]);s.append(el('path',{d:sorted.map(([a,b],i)=>`${i?'L':'M'}${x(a)},${y(b)}`).join(' '),class:'guess-line'}));
  s.append(el('circle',{cx:x(1970),cy:y(166),r:4,fill:'var(--blue)'}));
  function mark(event){if(revealed)return;const box=s.getBoundingClientRect(),px=(event.clientX-box.left)*w/box.width,py=(event.clientY-box.top)*h/box.height;const target=rows.filter(r=>r.year!==1970&&r.year!==2020).reduce((a,b)=>Math.abs(x(a.year)-px)<Math.abs(x(b.year)-px)?a:b);guesses.set(target.year,Math.round(Math.max(0,Math.min(10000,scale(B,T,0,10000)(py)))));year.value=String(target.year);keyboard();s.querySelector('.guess-line').setAttribute('d',[...guesses].sort((a,b)=>a[0]-b[0]).map(([a,b],i)=>`${i?'L':'M'}${x(a)},${y(b)}`).join(' '));}
  s.addEventListener('pointerdown',ev=>{if(revealed)return;dragging=true;host.classList.add('drawing');s.setPointerCapture(ev.pointerId);mark(ev);});s.addEventListener('pointermove',ev=>{if(dragging){ev.preventDefault();mark(ev);}});s.addEventListener('pointerup',()=>{dragging=false;host.classList.remove('drawing');});s.addEventListener('pointercancel',()=>{dragging=false;host.classList.remove('drawing');});
 }
 new ResizeObserver(()=>draw()).observe(host);keyboard();if(revealed)reveal();else draw();
}

function gap(all){const host=document.querySelector('#gap-plot'),rows=all.filter(r=>r.year===2024).sort((a,b)=>b.mean_median_ratio-a.mean_median_ratio);
 function draw(){const w=Math.max(280,host.clientWidth),mobile=w<500,L=mobile?112:150,R=20,h=rows.length*42+65,x=scale(0,15000,L,w-R),s=svg(host,w,h,'Median and mean household income in 2024; Sabah has the largest ratio, 1.329.');
 [0,5000,10000,15000].forEach(v=>{line(s,x(v),25,x(v),h-22);text(s,x(v),15,v===0?'0':`${v/1000}k`,'axis-label','middle');});
 rows.forEach((r,i)=>{const y=48+i*42,c=r.state==='Sabah'?'var(--red)':'var(--teal)',tip=`${r.state}: median ${money(r.median_income_rm)}, mean ${money(r.mean_income_rm)}; ratio ${r.mean_median_ratio}; Gini ${r.gini}`;text(s,L-10,y+4,short(r.state),'','end');line(s,x(r.median_income_rm),y,x(r.mean_income_rm),y,'muted-line');for(const [key,fill] of [['median_income_rm','var(--paper)'],['mean_income_rm',c]])s.append(el('circle',{cx:x(r[key]),cy:y,r:r.state==='Sabah'?5:4,fill,stroke:c,tabindex:0,'data-tip':tip}));if(r.state==='Sabah')text(s,L,y+20,'RM1,608 gap · 1.329×','pencil-note');});bindTips(host);}
 new ResizeObserver(draw).observe(host);draw();}

function ledger(all){const host=document.querySelector('#ledger-plot');const key=document.createElement('p');key.className='ledger-key';key.textContent='Grey: mean consumption spending. Teal: aggregate difference. Total bar: mean gross income; common RM scale.';host.append(key);const rows=all.filter(r=>r.year===2024).sort((a,b)=>b.mean_income_less_expenditure_rm-a.mean_income_less_expenditure_rm),max=Math.max(...rows.map(r=>r.mean_income_rm));rows.forEach(r=>{const row=document.createElement('div');row.className='ledger-bar';const label=document.createElement('span');label.textContent=short(r.state);const track=document.createElement('div');track.className='ledger-track';track.style.width=`${r.mean_income_rm/max*100}%`;track.tabIndex=0;track.dataset.tip=`${r.state}: income ${money(r.mean_income_rm)}, consumption ${money(r.mean_expenditure_rm)}, difference ${money(r.mean_income_less_expenditure_rm)}; not savings.`;for(const [v,c] of [[r.mean_expenditure_rm,'ledger-spent'],[r.mean_income_less_expenditure_rm,'ledger-gap']]){const part=document.createElement('span');part.className=c;part.style.width=`${v/r.mean_income_rm*100}%`;track.append(part);}const value=document.createElement('span');value.textContent=money(r.mean_income_less_expenditure_rm);row.append(label,track,value);host.append(row);});bindTips(host);}

function poverty(all){const host=document.querySelector('#poverty-plot'),rows=all.filter(r=>[2019,2022,2024].includes(r.year)),states=[...new Set(rows.map(r=>r.state))];
 function draw(){const w=Math.max(280,host.clientWidth),h=400,L=40,R=30,T=40,B=350,x=scale(2019,2024,L,w-R),y=scale(0,25,B,T),s=svg(host,w,h,'Reported absolute poverty at 2019, 2022 and 2024 surveys; Sarawak falls from 10.8% to 8.4% in 2022–2024.');[0,5,10,15,20,25].forEach(v=>{line(s,L,y(v),w-R,y(v));text(s,L-8,y(v)+4,`${v}%`,'axis-label','end');});[2019,2022,2024].forEach(v=>text(s,x(v),380,v,'axis-label','middle'));states.sort((a,b)=>(a==='Sarawak')-(b==='Sarawak')).forEach(state=>{const rr=rows.filter(r=>r.state===state),focus=state==='Sarawak';s.append(el('path',{d:rr.map((r,i)=>`${i?'L':'M'}${x(r.year)},${y(r.absolute_poverty_pct)}`).join(' '),class:focus?'focus-line':'muted-line'}));rr.forEach(r=>{s.append(el('circle',{cx:x(r.year),cy:y(r.absolute_poverty_pct),r:focus?5:3,fill:focus?'var(--red)':'var(--paper)',stroke:focus?'var(--red)':'var(--axis)',tabindex:0,'data-tip':`${state}, ${r.year}: ${r.absolute_poverty_pct}%` }));if(focus&&r.year>=2022)text(s,x(r.year)-8,y(r.absolute_poverty_pct)-14,`${r.absolute_poverty_pct}%`,'pencil-note','end');});});text(s,L,20,'Sarawak: −2.4 percentage points, 2022–2024','pencil-note');bindTips(host);}
 new ResizeObserver(draw).observe(host);draw();}

function prices(all){const host=document.querySelector('#price-plots');all.filter(r=>r.state==='Malaysia').forEach(r=>{const panel=document.createElement('div');panel.className=`price-panel${r.division==='01'?' food':''}`;const title=document.createElement('h4');title.textContent=r.division_name;const value=document.createElement('strong');value.textContent=`${r.price_growth_pct>0?'+':''}${r.price_growth_pct.toFixed(1)}%`;panel.append(title,value);host.append(panel);function draw(){panel.querySelector('svg')?.remove();const w=Math.max(240,panel.clientWidth),s=el('svg',{viewBox:`0 0 ${w} 60`,class:'income-svg',role:'img','aria-label':`${r.division_name}: ${r.price_growth_pct}% price change, 2019–2024.`}),x=scale(-5,20,14,w-20);line(s,x(-5),30,x(20),30);line(s,x(0),20,x(0),40,'muted-line');s.append(el('rect',{x:Math.min(x(0),x(r.price_growth_pct)),y:24,width:Math.abs(x(r.price_growth_pct)-x(0)),height:12,fill:r.division==='01'?'var(--red)':'var(--teal)'}));[-5,0,20].forEach(v=>text(s,x(v),56,`${v}%`,'axis-label','middle'));panel.append(s);}new ResizeObserver(draw).observe(panel);draw();});}

function measures(data){const [growth,gap,,poverty]=data;return {
 nominal:{label:'Nominal median income growth, 2016–2024 (%)',unit:'%',rows:growth.data.filter(r=>r.start_year===2016).map(r=>({state:r.state,value:r.nominal_growth_pct})),domain:[0,50]},
 real16:{label:'Real median income growth, 2016–2024 (%)',unit:'%',rows:growth.data.filter(r=>r.start_year===2016).map(r=>({state:r.state,value:r.real_growth_pct})),domain:[-10,30]},
 real19:{label:'Real median income growth, 2019–2024 (%)',unit:'%',rows:growth.data.filter(r=>r.start_year===2019).map(r=>({state:r.state,value:r.real_growth_pct})),domain:[-10,30]},
 median:{label:'Median household income, 2024 (RM)',unit:'RM',rows:gap.data.filter(r=>r.year===2024).map(r=>({state:r.state,value:r.median_income_rm})),domain:[0,12000]},
 gini:{label:'Gini, 2024 (0–1)',unit:'',rows:gap.data.filter(r=>r.year===2024).map(r=>({state:r.state,value:r.gini})),domain:[0,.5]},
 poverty:{label:'Absolute household poverty, 2024 (%)',unit:'%',rows:poverty.data.filter(r=>r.year===2024).map(r=>({state:r.state,value:r.absolute_poverty_pct})),domain:[0,20]}};}
function format(m,v){return m.unit==='RM'?money(v):`${m.unit===''?v.toFixed(3):v.toFixed(1)}${m.unit}`;}
function initStateSelector(data,onChange=()=>{}){const mm=measures(data),measure=document.querySelector('#map-measure'),state=document.querySelector('#state-select');mm.real16.rows.forEach(r=>state.add(new Option(r.state,r.state)));state.value='Terengganu';function update(){const m=mm[measure.value],r=m.rows.find(r=>r.state===state.value);document.querySelector('#state-name').textContent=r.state;document.querySelector('#state-value').textContent=format(m,r.value);document.querySelector('#state-description').textContent=`${r.state}: ${format(m,r.value)}. ${m.label}.`;document.querySelector('#explore-title').textContent=m.label;document.querySelector('#explore-conclusion').textContent=`${r.state} records ${format(m,r.value)} for ${m.label.toLowerCase()}.`;onChange(measure.value,state.value);}measure.addEventListener('change',update);state.addEventListener('change',update);return {update,select(name){state.value=name;update();}};}

function maps(data,geo){const mm=measures(data);let stateUI;
 const d3=window.d3, east=['Sabah','Sarawak','W.P. Labuan'];
 function map(hostId,legendId,key,highlight=[]){const host=document.getElementById(hostId),m=mm[key];
  const colors=key.startsWith('real')?['--div-1','--div-2','--div-3','--div-4','--div-5']:['--seq-1','--seq-2','--seq-3','--seq-4','--seq-5'];
  const palette=colors.map(c=>getComputedStyle(document.documentElement).getPropertyValue(c).trim());
  const color=d3.scaleLinear().domain(palette.map((_,i)=>m.domain[0]+i*(m.domain[1]-m.domain[0])/4)).range(palette).clamp(true);
  const spotlight=hostId==='story-map'&&highlight.length;
  if(!host.querySelector('svg')){
   host.classList.add('geographic-map');
   for(const isEast of [false,true]){
    const features=geo.features.filter(f=>east.includes(f.properties.state)===isEast);
    const projection=d3.geoMercator().fitExtent(isEast?[[30,115],[470,405]]:[[96,48],[428,458]],{type:'FeatureCollection',features});
    const path=d3.geoPath(projection),s=el('svg',{viewBox:'0 0 500 520',role:'group','aria-label':isEast?'Borneo inset: Sabah, Sarawak and Labuan':'Peninsular Malaysia'});
    text(s,20,26,isEast?'BORNEO / OFFSET INSET':'PENINSULAR MALAYSIA','region-label');
    if(isEast)text(s,20,506,'Panels fitted separately; not to a common scale.','map-note');
    host.append(s);
    features.forEach(f=>{
     const name=f.properties.state,centre=path.centroid(f),node=el('path',{d:path(f),class:'map-state state-boundary','data-state':name,tabindex:0,role:hostId==='explore-map'?'button':'img'});s.append(node);
     function activate(){if(hostId==='explore-map')stateUI?.select(name);}
     node.addEventListener('click',activate);node.addEventListener('focus',activate);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
     const tiny={'W.P. Kuala Lumpur':[70,350],'W.P. Putrajaya':[70,410],'W.P. Labuan':[220,72]}[name];
     if(tiny){
      line(s,centre[0],centre[1],tiny[0],tiny[1],'territory-leader');
      const circle=el('circle',{cx:tiny[0],cy:tiny[1],r:14,class:'map-state territory-target','data-state':name,tabindex:0,role:hostId==='explore-map'?'button':'img'});s.append(circle);circle.addEventListener('click',activate);circle.addEventListener('focus',activate);circle.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
      text(s,tiny[0]-24,tiny[1]+34,short(name),'territory-label');
     }
     if(['Sabah','Sarawak'].includes(name))text(s,centre[0],centre[1],name,'region-name','middle');
    });
   }
  }
  host.querySelectorAll('.map-state').forEach(n=>{
   const r=m.rows.find(r=>r.state===n.dataset.state),active=highlight.includes(r.state);
   n.setAttribute('fill',spotlight&&!active?'var(--inset)':color(r.value));
   n.classList.toggle('selected',active);
   n.setAttribute('aria-label',`${r.state}: ${format(m,r.value)}. ${m.label}`);
   n.dataset.tip=`${r.state}: ${format(m,r.value)}. ${m.label}`;
  });
  host.querySelectorAll('.map-callout').forEach(n=>n.remove());
  if(spotlight)highlight.forEach(name=>{
   const node=[...host.querySelectorAll('.state-boundary')].find(n=>n.dataset.state===name),s=node.ownerSVGElement;
   const f=geo.features.find(f=>f.properties.state===name),isEast=east.includes(name);
   const features=geo.features.filter(f=>east.includes(f.properties.state)===isEast);
   const projection=d3.geoMercator().fitExtent(isEast?[[30,115],[470,405]]:[[96,48],[428,458]],{type:'FeatureCollection',features});
   const [x,y]=d3.geoPath(projection).centroid(f),g=el('g',{class:'map-callout','aria-hidden':'true'});
   const target=[...host.querySelectorAll('.territory-target')].find(n=>n.dataset.state===name);
   if(target){g.append(el('ellipse',{cx:target.getAttribute('cx'),cy:target.getAttribute('cy'),rx:20,ry:18,class:'pencil-ring'}));s.append(g);return;}
   const slots={'Terengganu':[330,83],'Selangor':[24,260],'Perlis':[25,65]};
   const [tx,ty]=slots[name]||[24,480];
   g.append(el('ellipse',{cx:x,cy:y,rx:17,ry:12,class:'pencil-ring'}),el('path',{d:`M${tx},${ty-7} L${x},${y}`,class:'pencil-leader'}));
   text(g,tx,ty-13,short(name),'pencil-note');s.append(g);
  });
  bindTips(host);
  const legend=document.getElementById(legendId);legend.replaceChildren();const lo=document.createElement('span');lo.textContent=format(m,m.domain[0]);legend.append(lo);colors.forEach(c=>{const swatch=document.createElement('i');swatch.style.background=`var(${c})`;swatch.ariaHidden='true';legend.append(swatch);});const hi=document.createElement('span');hi.textContent=format(m,m.domain[1]);legend.append(hi);
  const note=document.createElement('span');note.textContent=spotlight?'Grey: context states; colour: named states.':key.startsWith('real')?'0% = no real growth':'';legend.append(note);
 }
 let story='nominal';
 const stepKeys={nominal:'nominal',real:'real16',leaders:'real19',laggards:'real19',caveats:'real19'};
 function storyDraw(){const key=stepKeys[story],highlight=story==='leaders'?['Selangor','Terengganu']:story==='laggards'?['W.P. Putrajaya','W.P. Kuala Lumpur','Perlis']:[];map('story-map','story-legend',key,highlight);document.querySelector('#map-title').textContent=mm[key].label;document.querySelector('#map-subtitle').textContent='Cumulative change; matched survey endpoints. Same real-growth colour scale in both periods.';document.querySelector('#map-conclusion').textContent=document.querySelector(`[data-map-step="${story}"] p:last-child`).textContent;}
 let exploreKey='real16',selected='Terengganu';stateUI=initStateSelector(data,(key,state)=>{const changed=key!==exploreKey;exploreKey=key;selected=state;if(changed)map('explore-map','explore-legend',key);document.querySelectorAll('#explore-map .map-state').forEach(n=>n.classList.toggle('selected',n.dataset.state===state));});
 const steps=[...document.querySelectorAll('[data-map-step]')];
 const controls=document.createElement('nav');controls.className='atlas-steps';controls.setAttribute('aria-label','Five steps through the state story');
 steps[0].parentElement.prepend(controls);
 function selectStep(key){story=key;steps.forEach(n=>{n.hidden=n.dataset.mapStep!==key;});controls.querySelectorAll('button').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.step===key)));storyDraw();}
 steps.forEach((step,i)=>{const button=document.createElement('button');button.type='button';button.dataset.step=step.dataset.mapStep;button.textContent=`${i+1}. ${step.querySelector('h3').textContent}`;button.addEventListener('click',()=>selectStep(step.dataset.mapStep));controls.append(button);});
 new MutationObserver(()=>{storyDraw();map('explore-map','explore-legend',exploreKey,[selected]);}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 
 storyDraw();map('explore-map','explore-legend','real16');stateUI.update();selectStep('nominal');
}
start().catch(error=>{console.error(error);document.querySelectorAll('#prediction-plot,#income-lead-plot').forEach(n=>n.textContent='The interactive figure could not load. The verified conclusion and data table remain available below.');});
