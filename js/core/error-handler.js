// 🐛 GLOBAL ERROR HANDLER
console.log('🐛 Error handler attivo - catturerà tutti gli Uncaught');

// Cattura errori globali
window.addEventListener('error', function(event) {
    console.error('🐛 UNCAUGHT ERROR:', {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        col: event.colno,
        error: event.error
    });
    
    // Log stack trace if available
    if (event.error && event.error.stack) {
        console.error('Stack trace:', event.error.stack);
    }
});

// Cattura promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('🐛 UNHANDLED PROMISE REJECTION:', event.reason);
});

// Monkey patch per prevenire ridefinizioni
console.log('🔍 Monkey patch attivo - no ridefinizioni manuali necessarie');

// Previeni ridefinizione di Object.defineProperty
(function() {
    const originalDefineProperty = Object.defineProperty;
    let patchCount = 0;
    
    Object.defineProperty = function(obj, prop, descriptor) {
        // Se tentano di ridefinire navigator.serviceWorker, blocca
        if (obj === navigator && prop === 'serviceWorker') {
            console.warn('🔒 Bloccata ridefinizione di navigator.serviceWorker');
            return obj;
        }
        
        // Se tentano di ridefinire su oggetti critici, monitora
        if (obj === window || obj === document || obj === navigator) {
            patchCount++;
            if (patchCount > 100) {
                console.warn('🔒 Troppe ridefinizioni, possibile loop');
                return obj;
            }
        }
        
        return originalDefineProperty.apply(this, arguments);
    };
    
    // Rendi il nostro patch non sovrascrivibile
    originalDefineProperty(Object, 'defineProperty', {
        value: Object.defineProperty,
        writable: false,
        configurable: false
    });
})();

console.log('✅ Error Handler inizializzato');