import { motionPreference } from './figures.js';

const routes = {
  heat: 'Heat uses pyrolysis, gasification or combustion to convert biomass.',
  bio: 'Enzymes and microbes release intermediates, then fermentation or digestion produces useful outputs.',
  both: 'Two conceptual conversion routes lead to fuels, materials and power. No flow quantities are implied.'
};
document.querySelectorAll('[data-route-select]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-route-select]').forEach(peer => peer.setAttribute('aria-pressed', String(peer === button)));
  document.querySelector('.route-plate').dataset.selection = button.dataset.routeSelect;
  document.querySelector('.route-status').textContent = routes[button.dataset.routeSelect];
}));

let turning = false;
const gearButton = document.querySelector('[data-turn-gears]');
gearButton.addEventListener('click', () => {
  const figure = document.querySelector('#gear-gallery');
  const note = document.querySelector('#gear-motion-note');
  if (motionPreference.matches) {
    note.textContent = 'Motion reduced: Bio-Nexus connects energy and materials. The drawing remains static.';
    return;
  }
  if (turning) return;
  turning = true;
  figure.classList.add('turning');
  note.textContent = 'Turning once: the directions show a linked mechanism, not research performance.';
  setTimeout(() => {
    figure.classList.remove('turning');
    turning = false;
    note.textContent = 'Turn complete. The research areas remain connected.';
  }, 1800);
});
