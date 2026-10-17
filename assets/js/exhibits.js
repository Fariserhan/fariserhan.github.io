/* Exhibits: picture-desk screenshots from shots.json manifests.
   <section class="exhibits" data-shots="folder/">      plate (hero) + contact sheet (strip)
   <figure class="exhibit-inline" data-shots="folder/" data-file="03-x.webp">  one inline shot
   <img class="exhibit-thumb" data-shots="folder/" alt="">  hero thumbnail
   <div class="exhibit-gallery" data-items="items.json">   picture-desk gallery
   Missing or empty manifests render nothing. No libraries. */
(() => {
  const cache = new Map();
  const load = url => {
    const abs = new URL(url, location.href).href;
    if (!cache.has(abs)) cache.set(abs, fetch(abs).then(r => r.ok ? r.json() : null).catch(() => null)
      .then(d => Array.isArray(d) && d.length ? d : null));
    return cache.get(abs);
  };
  const shotsOf = folder => load(folder + 'shots.json');
  const src = (folder, file) => new URL(file, new URL(folder, location.href)).href;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const pad = n => String(n).padStart(2, '0');
  const img = (url, w, h, alt, eager) => {
    const i = el('img'); i.src = url; i.alt = alt || ''; i.width = w; i.height = h; i.decoding = 'async';
    if (!eager) i.loading = 'lazy'; return i;
  };
  const thumbSize = s => [480, Math.round(480 * s.h / s.w)];

  /* Frame: device chrome by kind, with a stage sized to the image so markers stay put at any width. */
  function frame(s, folder, eager) {
    const kind = ['browser', 'laptop', 'slide', 'sheet', 'doc', 'video', 'phone'].includes(s.frame) ? s.frame : 'browser';
    const f = el('div', 'ex-frame'); f.dataset.frame = kind; f.style.setProperty('--ar', (s.w / s.h).toFixed(4));
    const stage = el('div', 'ex-stage');
    stage.append(img(src(folder, s.file), s.w, s.h, s.title || '', eager));
    (s.markers || []).forEach(m => {
      const b = el('button', 'ex-mark', m.n); b.type = 'button'; b.dataset.n = m.n;
      b.style.left = (m.x * 100) + '%'; b.style.top = (m.y * 100) + '%';
      b.setAttribute('aria-label', `Note ${m.n}: ${m.text}`);
      stage.append(b);
    });
    const label = s.label || '';
    if (kind === 'browser') { const bar = el('div', 'ex-bar'); bar.append(el('i'), el('i'), el('i'), el('span', 'ex-url', label)); f.append(bar, stage); }
    else if (kind === 'laptop') { const lid = el('div', 'ex-lid'); lid.append(el('span', 'ex-cam'), stage); f.append(lid, el('div', 'ex-base')); if (label) f.append(el('span', 'ex-label', label)); }
    else if (kind === 'sheet') { const tabs = el('div', 'ex-tabs'); tabs.append(el('span', 'ex-tab-nav', '◂ ▸'), el('span', 'ex-tab is-on', label || 'Sheet1'), el('span', 'ex-tab', '+')); f.append(stage, tabs); }
    else if (kind === 'video') { stage.append(el('span', 'ex-tc', label || '00:00')); const bar = el('div', 'ex-scrub'); f.append(stage, bar); }
    else if (kind === 'doc') { f.append(el('span', 'ex-runhead', label), stage); }
    else if (kind === 'slide') { f.append(stage, el('span', 'ex-label', label)); }
    else { f.append(el('span', 'ex-notch'), stage); if (label) f.append(el('span', 'ex-label', label)); }
    return f;
  }

  function key(s) {
    if (!(s.markers || []).length) return null;
    const ol = el('ol', 'ex-key');
    s.markers.forEach(m => { const li = el('li'); li.dataset.n = m.n; li.tabIndex = 0; li.append(el('span', 'ex-num', m.n), el('span', '', m.text)); ol.append(li); });
    return ol;
  }

  /* Marker <-> key linking inside one scope (plate, inline figure or loupe). */
  function link(scope) {
    const set = (n, on) => scope.querySelectorAll(`[data-n="${n}"]`).forEach(e => e.classList.toggle('is-lit', on));
    scope.querySelectorAll('.ex-mark,.ex-key li').forEach(e => {
      const n = e.dataset.n;
      e.addEventListener('mouseenter', () => set(n, true)); e.addEventListener('mouseleave', () => set(n, false));
      e.addEventListener('focus', () => set(n, true)); e.addEventListener('blur', () => set(n, false));
      if (e.matches('.ex-mark')) e.addEventListener('click', ev => { ev.stopPropagation(); e.focus(); });
    });
  }

  function caption(s, extra) {
    const fc = el('figcaption', 'ex-caption');
    if (extra) fc.append(el('span', 'ex-frameno', extra));
    if (s.title) fc.append(el('strong', '', s.title + '. '));
    fc.append(document.createTextNode(s.caption || ''));
    return fc;
  }

  function openable(stage, open) {
    const b = el('button', 'ex-open', 'Enlarge'); b.type = 'button'; b.setAttribute('aria-label', 'Enlarge picture');
    b.addEventListener('click', e => { e.stopPropagation(); open(b); });
    stage.append(b); stage.addEventListener('click', () => open(b)); stage.classList.add('is-openable');
  }

  /* Loupe: one native dialog per page, light-table styling. */
  let dlg, list, at, folderNow, opener;
  function loupe(shots, folder, i, from) {
    if (!dlg) {
      dlg = el('dialog', 'ex-loupe'); dlg.setAttribute('aria-label', 'Picture viewer');
      dlg.addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(at + 1); if (e.key === 'ArrowLeft') show(at - 1); });
      dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener('close', () => { document.documentElement.classList.remove('ex-lock'); opener && opener.focus(); });
      document.body.append(dlg);
    }
    list = shots; folderNow = folder; opener = from || document.activeElement;
    show(i); dlg.showModal(); document.documentElement.classList.add('ex-lock');
    dlg.querySelector('.ex-close').focus();
  }
  function show(i) {
    at = (i + list.length) % list.length; const s = list[at];
    const keep = dlg.contains(document.activeElement) && document.activeElement.className.split(' ')[0];
    dlg.replaceChildren();
    const top = el('div', 'ex-loupe-top');
    const count = el('span', 'ex-count', `${at + 1} / ${list.length}`); count.setAttribute('aria-live', 'polite');
    const nav = el('div', 'ex-loupe-nav');
    const btn = (cls, t, lab, fn) => { const b = el('button', cls, t); b.type = 'button'; b.setAttribute('aria-label', lab); b.addEventListener('click', fn); return b; };
    if (list.length > 1) nav.append(btn('ex-prev', '←', 'Previous picture', () => show(at - 1)), count, btn('ex-next', '→', 'Next picture', () => show(at + 1)));
    else nav.append(count);
    top.append(nav, btn('ex-close', 'Close ×', 'Close viewer', () => dlg.close()));
    const body = el('div', 'ex-loupe-body');
    const fig = el('figure', 'ex-loupe-fig'); fig.append(frame(s, folderNow, true));
    const side = el('div', 'ex-loupe-side'); const k = key(s);
    side.append(caption(s, 'Frame ' + pad(at + 1))); if (k) side.append(k);
    body.append(fig, side); dlg.append(top, body); link(dlg);
    if (keep) (dlg.querySelector('.' + keep) || dlg.querySelector('.ex-close')).focus();
  }

  /* Plate + contact sheet. */
  async function exhibits(sec) {
    const folder = sec.dataset.shots, shots = await shotsOf(folder);
    if (!shots) return;
    const hero = shots.find(s => s.role === 'hero') || shots[0];
    const strip = shots.filter(s => s !== hero && s.role !== 'inline');
    const open = (s, from) => loupe(shots, folder, shots.indexOf(s), from);
    const plate = el('figure', 'ex-plate');
    plate.append(el('p', 'kicker ex-kicker', 'What I built'));
    const grid = el('div', 'ex-plate-grid'); const f = frame(hero, folder, true);
    openable(f.querySelector('.ex-stage'), b => open(hero, b));
    grid.append(f); const k = key(hero); if (k) grid.append(k); else grid.classList.add('no-key');
    plate.append(grid, caption(hero)); link(plate); sec.append(plate);
    if (!strip.length) return;
    const sheet = el('div', 'ex-sheet');
    const head = el('div', 'ex-sheet-head'); head.append(el('h3', 'ex-sheet-title', 'More from this project'), el('span', 'ex-sheet-count', `${strip.length} frame${strip.length > 1 ? 's' : ''}`));
    const ul = el('ul', 'ex-film');
    strip.forEach(s => {
      const li = el('li'); const b = el('button', 'ex-cell'); b.type = 'button';
      b.setAttribute('aria-label', `Open frame ${pad(shots.indexOf(s) + 1)}: ${s.title || ''}`);
      const [w, h] = thumbSize(s); const pic = el('span', 'ex-cell-pic');
      pic.append(img(src(folder, s.thumb || s.file), w, h, ''), ring());
      b.append(pic, el('span', 'ex-cell-no', pad(shots.indexOf(s) + 1) + 'A'), el('span', 'ex-cell-title', s.title || ''));
      b.addEventListener('click', () => open(s, b)); li.append(b); ul.append(li);
    });
    const more = el('button', 'ex-more'); more.type = 'button'; more.hidden = true;
    let all = false;
    const fit = () => {
      const cols = getComputedStyle(ul).gridTemplateColumns.split(' ').length;
      [...ul.children].forEach((li, i) => li.hidden = !all && i >= cols);
      more.hidden = strip.length <= cols; more.textContent = all ? 'Show one row' : `Show all ${strip.length}`;
      more.setAttribute('aria-expanded', all);
    };
    more.addEventListener('click', () => { all = !all; fit(); });
    sheet.append(head, ul, more); sec.append(sheet); fit();
    new ResizeObserver(fit).observe(ul);
  }

  /* Grease-pencil circle, drawn on hover/focus. */
  function ring() {
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), p = document.createElementNS(ns, 'path');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('class', 'ex-ring'); svg.setAttribute('aria-hidden', 'true');
    p.setAttribute('d', 'M58 6C30 3 6 18 5 48c-1 30 24 47 50 46 27-1 42-20 40-46C93 22 74 7 46 9');
    p.setAttribute('pathLength', '1'); svg.append(p); return svg;
  }

  async function inline(fig) {
    const folder = fig.dataset.shots, shots = await shotsOf(folder);
    const s = shots && shots.find(x => x.file === fig.dataset.file);
    if (!s) return;
    const f = frame(s, folder); openable(f.querySelector('.ex-stage'), b => loupe(shots, folder, shots.indexOf(s), b));
    fig.append(f); const k = key(s); if (k) fig.append(k); fig.append(caption(s)); link(fig);
  }

  async function thumb(im) {
    const folder = im.dataset.shots, shots = await shotsOf(folder);
    const s = shots && (shots.find(x => x.role === 'hero') || shots[0]);
    if (!s) { im.hidden = true; return; }
    const [w, h] = thumbSize(s); im.width = w; im.height = h; im.loading = 'lazy'; im.decoding = 'async';
    im.src = src(folder, s.thumb || s.file);
  }

  async function gallery(box) {
    const items = await load(box.dataset.items);
    if (!items) return;
    const base = new URL(box.dataset.items, location.href).href;
    const grid = el('ul', 'ex-gallery');
    const list = el('ul', 'ex-index'); // ponytail: text-only items as a compact index, not empty picture slots
    await Promise.all(items.map(async (it, i) => {
      const folder = it.shots ? new URL(it.shots, base).href : null;
      const shots = folder ? await shotsOf(folder) : null;
      const s = shots && (shots.find(x => x.file === it.cover) || shots.find(x => x.role === 'hero') || shots[0]);
      if (!s) {
        const row = el('li', 'ex-index-row');
        const t = it.href ? Object.assign(el('a', 'ex-index-title', it.title), { href: it.href }) : el('span', 'ex-index-title', it.title);
        row.append(t, el('span', 'ex-index-meta', [it.client, it.month, [].concat(it.tags || []).join(', ')].filter(Boolean).join(' · ')));
        row.style.order = i; list.append(row); return;
      }
      const li = el('li', 'ex-card');
      {
        const pic = el(it.href ? 'a' : 'button', 'ex-card-pic');
        if (it.href) { pic.href = it.href; pic.tabIndex = -1; pic.setAttribute('aria-hidden', 'true'); }
        else { pic.type = 'button'; pic.setAttribute('aria-label', `View pictures: ${it.title}`); pic.addEventListener('click', () => loupe(shots, folder, shots.indexOf(s), pic)); }
        const [w, h] = thumbSize(s); pic.append(img(src(folder, s.thumb || s.file), w, h, ''), ring());
        if (shots.length > 1) pic.append(el('span', 'ex-card-n', shots.length + ' frames'));
        li.append(pic);
      }
      const t = el('h3', 'ex-card-title');
      if (it.href) { const a = el('a', '', it.title); a.href = it.href; t.append(a); } else t.textContent = it.title;
      li.append(el('span', 'ex-card-meta', [it.client, it.month].filter(Boolean).join(' · ')), t);
      const tags = [].concat(it.tags || []);
      if (tags.length) { const ul = el('ul', 'ex-tags'); tags.forEach(x => ul.append(el('li', '', x))); li.append(ul); }
      li.style.order = i; grid.append(li);
    }));
    box.append(grid);
    if (list.children.length) box.append(el('h3', 'ex-index-head', `Also on file, without pictures · ${list.children.length}`), el('p', 'ex-index-note', 'Exam papers and unpublished manuscripts are listed by title only.'), list);
  }

  const run = () => {
    document.querySelectorAll('section.exhibits[data-shots]').forEach(exhibits);
    document.querySelectorAll('figure.exhibit-inline[data-shots]').forEach(inline);
    document.querySelectorAll('img.exhibit-thumb[data-shots]').forEach(thumb);
    document.querySelectorAll('.exhibit-gallery[data-items]').forEach(gallery);
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', run) : run();
})();
