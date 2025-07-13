/**
 * SAFE SCRIPT LOADER - Sistema anti-duplicati globale
 */

window.__allScriptsLoaded = window.__allScriptsLoaded || new Set();

window.safeLoad = function(src, options = {}) {
    return new Promise((resolve, reject) => {
        const normalizedSrc = src.startsWith('http') ? src : 
                            src.startsWith('/') ? window.location.origin + src :
                            new URL(src, window.location.href).href;
        
        if (window.__allScriptsLoaded.has(normalizedSrc)) {
            console.debug('[dup-skipped]', normalizedSrc);
            resolve();
            return;
        }
        
        const existing = document.querySelector(`script[src="${normalizedSrc}"], script[src="${src}"]`);
        if (existing) {
            console.debug('[dom-exists]', normalizedSrc);
            window.__allScriptsLoaded.add(normalizedSrc);
            resolve();
            return;
        }
        
        console.log('[safe-load]', normalizedSrc);
        
        const script = document.createElement('script');
        script.src = normalizedSrc;
        script.defer = options.defer !== false;
        
        if (options.type) script.type = options.type;
        
        script.onload = () => {
            window.__allScriptsLoaded.add(normalizedSrc);
            console.debug('[loaded]', normalizedSrc);
            resolve();
        };
        
        script.onerror = (error) => {
            console.error('[load-error]', normalizedSrc, error);
            reject(error);
        };
        
        document.head.appendChild(script);
    });
};

window.safeLoadMultiple = async function(scripts) {
    for (const script of scripts) {
        await window.safeLoad(script);
    }
};

window.isScriptLoaded = function(src) {
    const normalizedSrc = src.startsWith('http') ? src : 
                        src.startsWith('/') ? window.location.origin + src :
                        new URL(src, window.location.href).href;
    return window.__allScriptsLoaded.has(normalizedSrc);
};

console.log('✅ SafeLoad system initialized');