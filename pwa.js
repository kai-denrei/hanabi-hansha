(() => {
  const button = document.getElementById('install-app');
  const help = document.getElementById('install-help');
  let installPrompt;
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && !standalone()) {
    help.textContent = 'To install: open the Share menu, then Add to Home Screen.';
    help.hidden = false;
  }
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event;
    button.hidden = standalone();
  });
  button.addEventListener('click', async () => {
    if (!installPrompt) return;
    const prompt = installPrompt; installPrompt = null; button.hidden = true;
    await prompt.prompt(); await prompt.userChoice;
  });
  window.addEventListener('appinstalled', () => { button.hidden = true; help.hidden = true; installPrompt = null; });
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Offline setup unavailable:', error));
  }
})();
