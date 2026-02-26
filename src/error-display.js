const box = document.getElementById('globalErr');

function show(msg) {
  if (!box) return;
  box.textContent = `Fehler: ${  msg}`;
  box.style.display = 'block';
}

window.addEventListener('error', event => {
  const { message, filename, lineno } = event;
  const details = filename ? `\n${  filename  }:${  lineno}` : '';
  show(message + details);
});

window.addEventListener('unhandledrejection', event => {
  const { reason } = event;
  const text = reason && reason.message ? reason.message : reason;
  show(`Promise rejected: ${  text}`);
});
