// 🎯 DRAG & DROP MANAGER
console.log('🎯 Inizializzazione Drag & Drop Manager...');

class DragDropManager {
    constructor() {
        this.draggedElements = new Map();
        this.STORAGE_KEY = 'floating_voice_position';
    }
    
    setupFloatingVoiceDragAndDrop(container) {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        console.log('🎯 Setup drag & drop per controlli vocali flottanti...');
        
        // Mouse events per desktop
        container.addEventListener('mousedown', (e) => {
            // Solo drag se si clicca sul container ma non sui pulsanti
            if (e.target.closest('.floating-mic-btn')) return;
            
            isDragging = true;
            container.classList.add('dragging');
            
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = container.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            container.style.transition = 'none';
            
            e.preventDefault();
            console.log('🖱️ Inizio drag mouse');
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            
            this.updateFloatingPosition(container, newX, newY);
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                container.classList.remove('dragging');
                container.style.transition = 'all 0.3s ease';
                this.saveFloatingPosition(container);
                console.log('🖱️ Fine drag mouse');
            }
        });
        
        // Touch events per tablet/mobile
        container.addEventListener('touchstart', (e) => {
            // Solo drag se si clicca sul container ma non sui pulsanti
            if (e.target.closest('.floating-mic-btn')) return;
            
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            
            const rect = container.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            container.style.transition = 'none';
            container.style.opacity = '0.8';
            container.classList.add('dragging');
            
            e.preventDefault();
            console.log('👆 Inizio drag touch');
        }, { passive: false });
        
        container.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;
            
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            
            this.updateFloatingPosition(container, newX, newY);
        }, { passive: false });
        
        container.addEventListener('touchend', () => {
            if (isDragging) {
                isDragging = false;
                container.classList.remove('dragging');
                container.style.transition = 'all 0.3s ease';
                container.style.opacity = '1';
                this.saveFloatingPosition(container);
                console.log('👆 Fine drag touch');
            }
        });
    }
    
    updateFloatingPosition(container, x, y) {
        const maxX = window.innerWidth - container.offsetWidth;
        const maxY = window.innerHeight - container.offsetHeight;
        
        x = Math.max(0, Math.min(x, maxX));
        y = Math.max(0, Math.min(y, maxY));
        
        container.style.left = x + 'px';
        container.style.top = y + 'px';
        container.style.right = 'auto';
        container.style.bottom = 'auto';
    }
    
    saveFloatingPosition(container) {
        const rect = container.getBoundingClientRect();
        const position = {
            left: rect.left,
            top: rect.top,
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(position));
            console.log('📍 Posizione pulsanti vocali salvata:', position);
        } catch (error) {
            console.error('❌ Errore salvataggio posizione:', error);
        }
    }
    
    loadSavedFloatingPosition(container) {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const position = JSON.parse(saved);
                
                // Verifica che la posizione sia ancora valida
                const maxX = window.innerWidth - container.offsetWidth;
                const maxY = window.innerHeight - container.offsetHeight;
                
                const x = Math.max(0, Math.min(position.left, maxX));
                const y = Math.max(0, Math.min(position.top, maxY));
                
                container.style.left = x + 'px';
                container.style.top = y + 'px';
                container.style.right = 'auto';
                container.style.bottom = 'auto';
                
                console.log('📍 Posizione pulsanti vocali ripristinata:', position);
            }
        } catch (error) {
            console.error('❌ Errore caricamento posizione:', error);
        }
    }
}

// Create global instance
window.dragDropManager = new DragDropManager();

// Export functions for backward compatibility
window.setupFloatingVoiceDragAndDrop = (container) => {
    window.dragDropManager.setupFloatingVoiceDragAndDrop(container);
};

window.loadSavedFloatingPosition = (container) => {
    window.dragDropManager.loadSavedFloatingPosition(container);
};

window.saveFloatingPosition = (container) => {
    window.dragDropManager.saveFloatingPosition(container);
};

console.log('✅ Drag & Drop Manager inizializzato');