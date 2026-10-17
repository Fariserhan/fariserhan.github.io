/* Ink desk — enhancement only. HTML conclusions/tables remain useful without JS.
   Reuse: [data-ink-network] with data-links="a>b,b>c"; native button[data-node]
   contains [data-anchor], data-explain, data-evidence and data-evidence-label.
   Charts: [data-chart] contains JSON script.chart-data and a static data table. */
export const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const NS = 'http://www.w3.org/2000/svg';
export function svgElement(tag, attributes = {}, text) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}
export const scale = (d0, d1, r0, r1) => value => r0 + (value - d0) / (d1 - d0 || 1) * (r1 - r0);

/* 01 — Text-safe tooltips. One owner, same text on hover, focus and tap. */
const tip = document.createElement('div');
tip.className = 'figure-tooltip'; tip.id = 'ink-tooltip'; tip.role = 'tooltip'; tip.hidden = true;
document.body.append(tip);
let tipOwner = null;
function hideTip() { tip.hidden = true; tipOwner?.removeAttribute('aria-describedby'); tipOwner = null; }
function showTip(owner) {
  hideTip(); tipOwner = owner; owner.setAttribute('aria-describedby', tip.id);
  tip.textContent = owner.dataset.tip;
  tip.hidden = false;
  const box = owner.getBoundingClientRect();
  tip.style.left = `${Math.max(12, Math.min(innerWidth - tip.offsetWidth - 12, box.left + box.width / 2 - tip.offsetWidth / 2))}px`;
  tip.style.top = `${Math.max(12, Math.min(innerHeight - tip.offsetHeight - 12, box.top - tip.offsetHeight - 10))}px`;
}
export function bindTips(scope = document) {
  scope.querySelectorAll('[data-tip]').forEach(node => {
    if (node.dataset.tipBound) return;
    node.dataset.tipBound = 'true';
    node.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') showTip(node); });
    node.addEventListener('pointerleave', hideTip);
    node.addEventListener('focus', () => showTip(node)); node.addEventListener('blur', hideTip);
    node.addEventListener('click', () => showTip(node));
    if (node instanceof SVGElement) node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showTip(node); }
    });
  });
}
addEventListener('keydown', event => { if (event.key === 'Escape') hideTip(); });
addEventListener('pointerdown', event => { if (!event.target.closest('[data-tip]')) hideTip(); });
addEventListener('scroll', hideTip, { passive:true });

/* 02 — Connectors use real HTML anchor geometry, so mobile labels keep their size.
   A single rAF clock animates only visible, unpaused figures. No SMIL idle loops. */
const networks = [];
export function initNetworks() {
  document.querySelectorAll('[data-ink-network]').forEach(figure => {
    if (figure.inkController) return;
    const nodes = [...figure.querySelectorAll('[data-node]')];
    const wires = svgElement('svg', { class:'ink-wires', 'aria-hidden':'true' });
    figure.prepend(wires);
    const readout = figure.querySelector('[data-explanation]');
    const evidence = figure.querySelector('[data-evidence-link]');
    const hint = readout?.textContent || '';
    let pinned = null, step = null, active = null, flows = [], visible = false;
    const set = id => {
      active = id;
      nodes.forEach(node => {
        node.classList.toggle('active', node.dataset.node === id);
        node.setAttribute('aria-pressed', String(node.dataset.node === pinned));
      });
      flows.forEach(flow => flow.path.classList.toggle('active', flow.a === id || flow.b === id));
      const current = nodes.find(node => node.dataset.node === id);
      if (readout) readout.textContent = current?.dataset.explain || hint;
      if (evidence) {
        evidence.hidden = !current?.dataset.evidence;
        if (current?.dataset.evidence) { evidence.setAttribute('href', current.dataset.evidence); evidence.textContent = current.dataset.evidenceLabel || 'See the evidence'; }
      }
    };
    nodes.forEach(node => {
      node.setAttribute('aria-pressed', 'false');
      node.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') set(node.dataset.node); });
      node.addEventListener('pointerleave', () => set(pinned || step));
      node.addEventListener('focus', () => set(node.dataset.node));
      node.addEventListener('blur', () => set(pinned || step));
      node.addEventListener('click', () => { pinned = pinned === node.dataset.node ? null : node.dataset.node; set(pinned || step); });
      node.addEventListener('keydown', event => { if (event.key === 'Escape') { pinned = null; set(step); } });
    });
    function draw() {
      const base = figure.getBoundingClientRect();
      wires.setAttribute('viewBox', `0 0 ${base.width} ${base.height}`);
      wires.replaceChildren(); flows = [];
      (figure.dataset.links || '').split(',').filter(Boolean).forEach((link, index) => {
        const [a, b] = link.split('>');
        const start = nodes.find(node => node.dataset.node === a)?.querySelector('[data-anchor]');
        const end = nodes.find(node => node.dataset.node === b)?.querySelector('[data-anchor]');
        if (!start || !end) return;
        const ra = start.getBoundingClientRect(), rb = end.getBoundingClientRect();
        let x1 = ra.left - base.left + ra.width / 2, y1 = ra.top - base.top + ra.height / 2;
        let x2 = rb.left - base.left + rb.width / 2, y2 = rb.top - base.top + rb.height / 2;
        const vertical = Math.abs(y2-y1) > Math.abs(x2-x1);
        if (vertical) { y1 += Math.sign(y2-y1)*ra.height/2; y2 -= Math.sign(y2-y1)*rb.height/2; }
        else { x1 += Math.sign(x2-x1)*ra.width/2; x2 -= Math.sign(x2-x1)*rb.width/2; }
        const d = vertical ? `M${x1},${y1} C${x1},${(y1+y2)/2} ${x2},${(y1+y2)/2} ${x2},${y2}` : `M${x1},${y1} C${(x1+x2)/2},${y1} ${(x1+x2)/2},${y2} ${x2},${y2}`;
        const path = svgElement('path', { d, class:'ink-wire draw-line', pathLength:1 });
        const particles = [0, 1].map(() => svgElement('circle', { r:2.3, class:'ink-particle' }));
        wires.append(path, ...particles);
        flows.push({ path, particles, a, b, index, length:path.getTotalLength() });
      });
      set(active);
    }
    const controller = { figure, draw, get visible() { return visible; }, tick(time) {
      flows.forEach(flow => flow.particles.forEach((particle, index) => {
        const point = flow.path.getPointAtLength(((time/4200 + index/2 + flow.index*.11) % 1) * flow.length);
        particle.setAttribute('cx', point.x); particle.setAttribute('cy', point.y);
      }));
    }, setStep(id) { step = id; set(pinned || step); } };
    figure.inkController = controller; networks.push(controller);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting; figure.classList.toggle('in-view', visible);
      if (visible) { draw(); startClock(); }
    }, { rootMargin:'40px' });
    observer.observe(figure);
    let frame;
    new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); }).observe(figure);
    figure.querySelector('[data-pause-ink]')?.addEventListener('click', event => {
      const paused = figure.classList.toggle('paused');
      event.currentTarget.setAttribute('aria-pressed', String(paused));
      event.currentTarget.textContent = paused ? 'Resume ink flow' : 'Pause ink flow'; startClock();
    });
    document.fonts.ready.then(draw); draw();
  });
}
let clockRunning = false;
function startClock() {
  if (clockRunning || motionPreference.matches || document.hidden) return;
  clockRunning = true;
  requestAnimationFrame(function frame(time) {
    const active = networks.filter(network => network.visible && !network.figure.classList.contains('paused'));
    if (!active.length || motionPreference.matches || document.hidden) { clockRunning = false; return; }
    active.forEach(network => network.tick(time)); requestAnimationFrame(frame);
  });
}
document.addEventListener('visibilitychange', startClock);
motionPreference.addEventListener('change', startClock);

/* 03 — JSON → exact SVG scales. Bars start at zero; interval marks are separate.
   Width is recalculated, not merely shrunk, so 12–14px labels survive at 375px. */
export function drawChart(host, config) {
  host.querySelector('svg.chart-svg')?.remove();
  const width = Math.max(260, host.clientWidth);
  const mini = host.classList.contains('mini-chart');
  const margin = { top:config.annotation ? 68 : 20, right:mini ? 38 : 52, bottom:36, left:config.kind === 'bar' ? (mini ? 88 : width < 500 ? 128 : 150) : config.kind === 'interval' ? 100 : 36 };
  const plotWidth = width - margin.left - margin.right;
  const rowHeight = mini ? 29 : 43;
  const height = ['bar','interval'].includes(config.kind) ? config.data.length * rowHeight + margin.top + margin.bottom : mini ? 128 : 300;
  const svg = svgElement('svg', { class:'chart-svg', viewBox:`0 0 ${width} ${height}`, role:'img', 'aria-label':config.description || config.title });
  svg.append(svgElement('title', {}, config.title));
  const max = config.max ?? Math.max(...config.data.map(row => row.high ?? row.value)) * 1.12;
  const x = scale(0, max, margin.left, width-margin.right);
  if (config.kind === 'bar' || config.kind === 'interval') {
    [0,.5,1].forEach(fraction => {
      const pos = x(max*fraction);
      svg.append(svgElement('line', { x1:pos, x2:pos, y1:margin.top-8, y2:height-margin.bottom, class:'chart-grid' }));
      svg.append(svgElement('text', { x:pos, y:height-12, 'text-anchor':'middle', class:'axis-label' }, `${Math.round(max*fraction)}${config.unit || ''}`));
    });
    config.data.forEach((row, index) => {
      const y = margin.top + index*rowHeight + rowHeight/2;
      svg.append(svgElement('text', { x:margin.left-10, y:y+4, 'text-anchor':'end', class:mini ? 'axis-label' : 'direct-label' }, row.label));
      const summary = `${row.label}: ${row.value}${config.unit || ''}${row.low != null ? `; 95% interval ${row.low}–${row.high}%` : ''}${row.n ? `; n=${row.n}` : ''}`;
      const mark = svgElement('g', { tabindex:0, 'data-tip':summary, 'aria-label':summary });
      if (config.kind === 'interval') {
        mark.append(svgElement('line', { x1:x(row.low),x2:x(row.high),y1:y,y2:y,class:'interval' }));
        for (const end of [row.low,row.high]) mark.append(svgElement('line',{x1:x(end),x2:x(end),y1:y-5,y2:y+5,class:'interval'}));
        mark.append(svgElement('circle', { cx:x(row.value),cy:y,r:4,class:'chart-dot' }));
      } else {
        mark.append(svgElement('rect', { x:x(0),y:y-7,width:x(row.value)-x(0),height:14,class:'data-bar' }));
      }
      mark.append(svgElement('rect', { x:margin.left,y:y-14,width:plotWidth,height:28,fill:'transparent' }));
      svg.append(mark,svgElement('text',{x:width-margin.right+8,y:y+4,class:'direct-label'},`${row.value}${config.unit || ''}`));
    });
  } else {
    const y = scale(0,max,height-margin.bottom,margin.top);
    [0,.5,1].forEach(fraction => {
      svg.append(svgElement('line',{x1:margin.left,x2:width-margin.right,y1:y(max*fraction),y2:y(max*fraction),class:'chart-grid'}));
      svg.append(svgElement('text',{x:margin.left-6,y:y(max*fraction)+4,'text-anchor':'end',class:'axis-label'},Math.round(max*fraction)));
    });
    const px = index => margin.left + index/(config.data.length-1 || 1)*plotWidth;
    svg.append(svgElement('path',{d:config.data.map((row,index)=>`${index?'L':'M'}${px(index)},${y(row.value)}`).join(' '),class:'data-line draw-line',pathLength:1}));
    config.data.forEach((row,index) => {
      const summary = `${row.label}: ${row.value}${config.unit || ''}`;
      svg.append(svgElement('circle',{cx:px(index),cy:y(row.value),r:4,class:'chart-dot',tabindex:0,'data-tip':summary,'aria-label':summary}));
      if (!mini || index === 0 || index === config.data.length-1) svg.append(svgElement('text',{x:px(index),y:height-12,'text-anchor':'middle',class:'axis-label'},row.label));
    });
    const last = config.data.at(-1);
    svg.append(svgElement('text',{x:px(config.data.length-1)+10,y:y(last.value)+4,class:'direct-label'},last.value));
  }
  if (config.annotation) {
    const index = config.annotation.index;
    const row = config.data[index];
    const point = config.kind === 'line'
      ? {x:margin.left + index/(config.data.length-1 || 1)*plotWidth, y:scale(0,max,height-margin.bottom,margin.top)(row.value)}
      : {x:x(row.value), y:margin.top+index*rowHeight+rowHeight/2};
    const labelX = Math.min(width-180, Math.max(8, point.x-70));
    svg.append(svgElement('path',{d:`M${labelX+70},43 L${point.x},${point.y-7}`,class:'pencil draw-line',pathLength:1}));
    svg.append(svgElement('circle',{cx:point.x,cy:point.y,r:7,class:'pencil'}));
    config.annotation.lines.forEach((line,index) => svg.append(svgElement('text',{x:labelX,y:18+index*18,class:'pencil-note annotation-label'},line)));
  }
  host.append(svg); bindTips(host);
}
export function initCharts() {
  document.querySelectorAll('[data-chart]').forEach(host => {
    const config = JSON.parse(host.querySelector('.chart-data').textContent);
    const plot = host.querySelector('[data-plot]');
    const draw = () => drawChart(plot, config);
    if (host.classList.contains('mini-chart')) plot.classList.add('mini-chart');
    let frame;
    new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); }).observe(plot);
    draw();
  });
}

/* 04 — Scroll position chooses one architecture stage; pinning takes priority.
   A single position calculation handles reverse scroll and large jumps. */
export function initScrolly() {
  document.querySelectorAll('[data-scrolly]').forEach(section => {
    const steps = [...section.querySelectorAll('[data-step]')];
    const graphic = section.querySelector('[data-ink-network]');
    let previous = '', scheduled = false;
    function update() {
      scheduled = false;
      const trigger = innerHeight * .6;
      const current = steps.filter(step => step.getBoundingClientRect().top <= trigger).at(-1) || steps[0];
      if (previous === current.dataset.step) return;
      previous = current.dataset.step;
      steps.forEach(step => step.classList.toggle('current', step === current));
      graphic.inkController?.setStep(previous);
    }
    addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }, {passive:true});
    addEventListener('resize', update); update();
  });
}
/* 05 — A finite ink pass for the small schematic figures; never an idle loop. */
document.querySelectorAll('[data-schematic]').forEach(figure => {
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    if (motionPreference.matches) return;
    const svg = figure.querySelector('svg');
    const paths = [...svg.querySelectorAll('.data-line')];
    const started = performance.now();
    const dots = paths.map(() => svgElement('circle',{r:2.5,class:'ink-particle'}));
    svg.append(...dots);
    function pass(now) {
      const progress = Math.min(1,(now-started)/1200);
      paths.forEach((path,index) => { const point=path.getPointAtLength(progress*path.getTotalLength()); dots[index].setAttribute('cx',point.x); dots[index].setAttribute('cy',point.y); });
      if(progress<1 && !motionPreference.matches) requestAnimationFrame(pass); else dots.forEach(dot=>dot.remove());
    }
    requestAnimationFrame(pass);
  }); observer.observe(figure);
});
initNetworks(); initCharts(); initScrolly(); bindTips();
