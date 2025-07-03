// Script per forzare il reload bypassando la cache del Service Worker

console.log('🔄 Forzando reload completo...');

// 1. Invalida la cache del Service Worker
if ('caches' in window) {
    caches.keys().then(names => {
        names.forEach(name => {
            console.log('🗑️ Eliminando cache:', name);
            caches.delete(name);
        });
    });
}

// 2. Deregistra il Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
            console.log('🚫 Deregistrando Service Worker:', registration.scope);
            registration.unregister();
        });
    });
}

// 3. Ricarica la pagina dopo 1 secondo
setTimeout(() => {
    console.log('🔄 Ricaricando la pagina...');
    window.location.reload(true);
}, 1000);

console.log('✅ Operazione completata! La pagina si ricaricherà tra 1 secondo...');