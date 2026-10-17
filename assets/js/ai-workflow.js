const tray = document.querySelector('[data-tray-demo]');
if (tray) {
  const readout = tray.querySelector('[data-tray-readout]');
  const windows = '<div><strong>Claude / ChatGPT</strong><span>5-hour and weekly windows</span><i aria-hidden="true"></i></div><div><strong>Google AI Pro</strong><span>Three rolling usage rows</span><i aria-hidden="true"></i></div><p>Shows remaining capacity and reset timing; keeps the last good reading during temporary request limits.</p>';
  const pace = '<div><strong>Weekly allowance</strong><span>Spread across days left</span><i aria-hidden="true"></i></div><div><strong>Today’s pace</strong><span>Used against a daily guide</span><i aria-hidden="true"></i></div><p>A pacing guide estimates a daily share from the weekly limit. It is not a usage target or a quality score.</p>';
  tray.querySelectorAll('[data-tray-mode]').forEach(button => button.addEventListener('click', () => {
    tray.querySelectorAll('[data-tray-mode]').forEach(peer => peer.setAttribute('aria-pressed', String(peer === button)));
    readout.innerHTML = button.dataset.trayMode === 'pace' ? pace : windows;
  }));
}
