const slider = document.querySelector('#guess-share');
const output = document.querySelector('#guess-output');
const reveal = document.querySelector('#reveal-counterfactual');
const result = document.querySelector('#counterfactual-result');
const placeholder = document.querySelector('#cf-placeholder');
const live = document.querySelector('#cf-live');
if (slider && output) slider.addEventListener('input', () => { output.value = `${slider.value}%`; output.textContent = `${slider.value}%`; });
if (reveal && result && placeholder) reveal.addEventListener('click', () => {
  const shown = reveal.getAttribute('aria-expanded') !== 'true';
  reveal.setAttribute('aria-expanded', String(shown));
  result.classList.toggle('is-shown', shown);
  result.setAttribute('aria-hidden', String(!shown));
  document.querySelector('#ledger').classList.toggle('counterfactual-shown', shown);
  placeholder.style.opacity = shown ? '0' : '1';
  reveal.textContent = shown ? 'Hide the counterfactual' : 'Show the model’s no-diabetes prediction';
  if (live) live.textContent = shown
    ? `Your estimate: ${slider?.value || 5} percent. Model estimate: 6.45 percent, or 74,063 of 1,147,700 observed deaths.`
    : 'Counterfactual hidden. Observed deaths: 1,147,700.';
});
