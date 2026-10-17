import { motionPreference } from './figures.js';

/* 01 — Edition preference. Storage denial never breaks navigation. */
const root = document.documentElement;
try { root.dataset.theme = localStorage.getItem('faris-edition') === 'dark' ? 'dark' : 'light'; } catch { root.dataset.theme = 'light'; }
const themeButtons = [...document.querySelectorAll('[data-theme-toggle]')];
function labelTheme() {
  themeButtons.forEach(button => { const dark = root.dataset.theme === 'dark'; button.setAttribute('aria-pressed', String(dark)); button.textContent = dark ? '☀ Light edition' : '◐ Dark edition'; });
}
themeButtons.forEach(button => button.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('faris-edition', root.dataset.theme); } catch { /* Private browsing may deny storage. */ }
  labelTheme();
}));
labelTheme();
document.querySelectorAll('[data-today]').forEach(date => {
  const now = new Date();
  date.textContent = new Intl.DateTimeFormat('en-MY',{ timeZone:'Asia/Kuala_Lumpur',weekday:'long',day:'numeric',month:'long',year:'numeric' }).format(now);
  // en-CA date parts avoid a UTC day mismatch around Malaysian midnight.
  date.dateTime = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
});

/* 02 — Final content exists before JS. Only visited rules/paths animate once. */
const revealNodes = [...document.querySelectorAll('[data-reveal],.section,[data-chart]')];
const show = node => { node.classList.add('is-visible'); reveal?.unobserve(node); };
const reveal = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting || entry.boundingClientRect.top < innerHeight) show(entry.target);
}), { threshold:0, rootMargin:'0px 0px -5% 0px' }) : null;
revealNodes.forEach(node => reveal ? reveal.observe(node) : show(node));
function revealPassed() { revealNodes.forEach(node => { if (node.getBoundingClientRect().top < innerHeight) show(node); }); }
addEventListener('scroll', revealPassed, {passive:true});
addEventListener('pageshow', revealPassed);
revealPassed();
// Motion is decoration: a missed observer callback must never hide the evidence.
setTimeout(() => revealNodes.forEach(show), 1800);
document.querySelectorAll('[data-count]').forEach(node => {
  const target = Number(node.dataset.count);
  const finish = () => { node.textContent = target.toLocaleString('en-MY'); };
  if (motionPreference.matches) { finish(); return; }
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect(); const start = performance.now();
    function frame(now) {
      const progress = Math.min(1,(now-start)/650);
      node.textContent = Math.round(target*(1-(1-progress)**3)).toLocaleString('en-MY');
      if (progress < 1 && !motionPreference.matches) requestAnimationFrame(frame); else finish();
    }
    requestAnimationFrame(frame);
  }); observer.observe(node);
});
const progress = document.querySelector('[data-reading-progress]');
let progressFrame = false;
function updateProgress() {
  progressFrame = false;
  const distance = document.documentElement.scrollHeight-innerHeight;
  if (progress) progress.style.transform = `scaleX(${distance > 0 ? Math.max(0,Math.min(1,scrollY/distance)) : 0})`;
}
addEventListener('scroll', () => { if (!progressFrame) { progressFrame=true; requestAnimationFrame(updateProgress); } }, {passive:true});
addEventListener('resize',updateProgress); updateProgress();
// Native cross-document transitions need no interception or SPA router.
addEventListener('pageshow', () => { hideTransientUI(); updateProgress(); });
function hideTransientUI() { const tip=document.querySelector('.figure-tooltip'); if(tip) tip.hidden=true; }
addEventListener('pagereveal', hideTransientUI);

/* 03 — Listings: independent client/type filters with a live result count. */
const archive = document.querySelector('[data-archive]');
if (archive) {
  const selected = { type:'all', client:'all' };
  archive.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    selected[button.dataset.filter] = button.dataset.value;
    archive.querySelectorAll(`[data-filter="${button.dataset.filter}"]`).forEach(peer => peer.setAttribute('aria-pressed',String(peer === button)));
    let shown=0;
    archive.querySelectorAll('tbody tr').forEach(row => {
      row.hidden = !(selected.type === 'all' || row.dataset.type.split('|').includes(selected.type)) || !(selected.client === 'all' || row.dataset.client === selected.client);
      if (!row.hidden) shown++;
    });
    archive.querySelector('[data-archive-count]').textContent = `${shown} listings shown`;
  }));
}

