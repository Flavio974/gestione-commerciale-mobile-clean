// 🚫 SERVICE WORKER & CACHE MANAGER
console.log('🧹 SW e cache eliminati - caricamento pulito');

// Blocca timer che potrebbero essere cache-ati
if (window.demoTabIntervalId) {
    clearInterval(window.demoTabIntervalId);
    window.demoTabIntervalId = null;
}

// Disabilita completamente Service Worker
if ('serviceWorker' in navigator) {
    console.log('🚫 ServiceWorker API DISABILITATO');
    
    // Kill all service workers
    async function killAllServiceWorkers() {
        console.log('🧹 Killing Service Workers...');
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));
            console.log('✅ SW rimossi all\'avvio');
        } catch (e) {
            console.error('❌ Errore rimozione SW:', e);
        }
    }
    
    // Clear all caches
    async function clearAllCaches() {
        console.log('🗑️ Clearing all caches...');
        try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('✅ Cache svuotate');
        } catch (e) {
            console.error('❌ Errore pulizia cache:', e);
        }
    }
    
    // Execute cleanup
    (async () => {
        await killAllServiceWorkers();
        await clearAllCaches();
        console.log('🧹 CLEAN START - No SW, No Cache');
    })();
}

// Previeni registrazione futura di SW
Object.defineProperty(navigator, 'serviceWorker', {
    get: function() {
        console.warn('🚫 ServiceWorker bloccato');
        return undefined;
    },
    configurable: false
});

console.log('✅ Service Worker Manager inizializzato');