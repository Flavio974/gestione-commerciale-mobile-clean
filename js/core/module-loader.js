// 🚀 SISTEMA DI CARICAMENTO ROBUSTO MODULI
console.log('🚀 Inizializzazione sistema caricamento moduli...');

window.ModuleLoader = {
    loadedModules: new Set(),
    failedModules: new Set(),
    
    loadScript: async function(src, required = false) {
        if (this.loadedModules.has(src)) {
            console.log('✅ Modulo già caricato:', src);
            return true;
        }
        
        try {
            console.log('🔄 Caricamento modulo:', src);
            
            const response = await fetch(src);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('javascript') && !contentType.includes('text/plain')) {
                const text = await response.text();
                if (text.trim().startsWith('<!DOCTYPE') || text.includes('<html')) {
                    throw new Error('Server restituisce HTML invece di JavaScript');
                }
            }
            
            const script = document.createElement('script');
            script.src = src;
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = () => reject(new Error('Script load failed'));
                document.head.appendChild(script);
            });
            
            this.loadedModules.add(src);
            console.log('✅ Modulo caricato:', src);
            return true;
            
        } catch (error) {
            console.error(`❌ Errore caricamento ${src}:`, error);
            this.failedModules.add(src);
            
            if (required) {
                throw error;
            }
            return false;
        }
    },
    
    loadMultiple: async function(modules) {
        const results = await Promise.allSettled(
            modules.map(m => this.loadScript(m.src, m.required))
        );
        
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
            console.error('❌ Alcuni moduli hanno fallito:', failed);
        }
        
        return results;
    }
};

console.log('✅ Sistema base moduli inizializzato');