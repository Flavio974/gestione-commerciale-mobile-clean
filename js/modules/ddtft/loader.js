/**
 * safeLoad 2.0
 *  - evita duplicati
 *  - logga [dup-skipped]
 *  - restituisce Promise
 */
window.__loadedScripts = window.__loadedScripts || new Set();
window.safeLoad = function safeLoad(url) {
  if (window.__loadedScripts.has(url)) {
    console.log('[dup-skipped]', url);
    return Promise.resolve();
  }

  // Normalizza percorsi locali e impedisci caching di errori
  if (!url.startsWith('http') && !url.startsWith('/')) url = '/' + url;

  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = () => {
      console.log('[safe-load]', url);
      window.__loadedScripts.add(url);
      resolve();
    };
    s.onerror = (e) => {
      console.error('[safe-load-error]', url, e);
      reject(e);                 // **non** metterlo tra i caricati
    };
    document.head.appendChild(s);
  });
};

/**
 * safeLoadQueue(...urls)
 *  Carica gli script in serie, nell'ordine fornito.
 */
window.safeLoadQueue = (...urls) =>
  urls.reduce((p, u) => p.then(() => safeLoad(u)), Promise.resolve());

/* Monkey-patch globale per intercettare aggiunta di <script src> */
(function () {
  const _create = document.createElement;
  document.createElement = function patched(tagName, ...rest) {
    const el = _create.call(this, tagName, ...rest);
    if (tagName.toLowerCase() === 'script') {
      Object.defineProperty(el, 'src', {
        set(url) { safeLoad(url); },
        get() { return ''; },
      });
    }
    return el;
  };
})();