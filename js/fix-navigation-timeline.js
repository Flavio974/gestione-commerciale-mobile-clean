/**
 * 🚨 FIX CRITICO NAVIGAZIONE E TIMELINE
 * 
 * PROBLEMA: La navigazione delle tab genera loop infiniti e la Timeline 
 * non si inizializza mai correttamente.
 * 
 * SOLUZIONE: Intercettare e correggere il flusso di navigazione
 */

console.log('🚨 [FIX NAV-TIMELINE] Inizializzazione fix navigazione...');

// Flag per prevenire loop
let isNavigating = false;
let lastNavigatedTab = null;
let navigationCount = 0;

// Override navigateTo per debug e fix
const originalNavigateTo = window.navigateTo;
if (originalNavigateTo) {
    window.navigateTo = function(tabName) {
        navigationCount++;
        console.log(`🎯 [FIX NAV] navigateTo #${navigationCount} chiamato:`, tabName, 'ultimo:', lastNavigatedTab);
        
        // Previeni loop - se stiamo già navigando verso questa tab, ignora
        if (isNavigating && lastNavigatedTab === tabName) {
            console.warn('⚠️ [FIX NAV] Loop prevenuto! Già navigando verso:', tabName);
            return;
        }
        
        // Se è la stessa tab dell'ultima volta, ignora
        if (lastNavigatedTab === tabName && navigationCount > 1) {
            console.log('📍 [FIX NAV] Già su questa tab, ignoro navigazione duplicata');
            return;
        }
        
        isNavigating = true;
        lastNavigatedTab = tabName;
        
        // Chiama l'originale
        try {
            const result = originalNavigateTo.call(this, tabName);
            
            // Se è timeline, assicura inizializzazione
            if (tabName === 'timeline' || tabName === 'timeline-content') {
                console.log('📅 [FIX NAV] Navigazione Timeline rilevata, forzo init...');
                setTimeout(() => {
                    initializeTimeline();
                }, 300);
            }
            
            return result;
        } finally {
            // Reset flag dopo un po'
            setTimeout(() => {
                isNavigating = false;
            }, 500);
        }
    };
}

// Funzione per inizializzare Timeline in modo sicuro
function initializeTimeline() {
    console.log('🔧 [FIX NAV] Tentativo inizializzazione Timeline...');
    
    if (!window.Timeline) {
        console.error('❌ [FIX NAV] window.Timeline non esiste!');
        return;
    }
    
    // Verifica se già inizializzata
    if (window.Timeline.elements && window.Timeline.elements.canvas) {
        console.log('✅ [FIX NAV] Timeline già inizializzata');
        return;
    }
    
    // Verifica dipendenze
    if (!window.TimelineConfig) {
        console.error('❌ [FIX NAV] TimelineConfig mancante!');
        return;
    }
    
    if (!window.TimelineEvents) {
        console.error('❌ [FIX NAV] TimelineEvents mancante!');
        return;
    }
    
    if (!window.TimelineRendering) {
        console.error('❌ [FIX NAV] TimelineRendering mancante!');
        return;
    }
    
    // Verifica elementi DOM
    const container = document.getElementById('timeline-container');
    const content = document.getElementById('timeline-content');
    
    if (!content) {
        console.error('❌ [FIX NAV] timeline-content non trovato!');
        return;
    }
    
    // Crea container se mancante
    if (!container) {
        console.log('🔧 [FIX NAV] Creazione timeline-container...');
        const newContainer = document.createElement('div');
        newContainer.id = 'timeline-container';
        newContainer.className = 'timeline-container';
        newContainer.style.width = '100%';
        newContainer.style.height = '500px';
        newContainer.style.position = 'relative';
        content.appendChild(newContainer);
    }
    
    // Crea canvas se mancante
    let canvas = document.getElementById('timeline-canvas');
    if (!canvas) {
        console.log('🔧 [FIX NAV] Creazione timeline-canvas...');
        canvas = document.createElement('canvas');
        canvas.id = 'timeline-canvas';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        const finalContainer = document.getElementById('timeline-container');
        if (finalContainer) {
            finalContainer.appendChild(canvas);
        }
    }
    
    // Inizializza Timeline
    try {
        console.log('🚀 [FIX NAV] Chiamata Timeline.init()...');
        window.Timeline.init();
        console.log('✅ [FIX NAV] Timeline inizializzata con successo!');
        
        // Verifica inizializzazione
        if (window.Timeline.elements && window.Timeline.elements.canvas) {
            console.log('✅ [FIX NAV] Verifica post-init: canvas presente');
        } else {
            console.error('❌ [FIX NAV] Verifica post-init: canvas mancante');
        }
        
    } catch (error) {
        console.error('❌ [FIX NAV] Errore durante Timeline.init():', error);
        console.error('Stack:', error.stack);
    }
}

// Fix per il sistema di tab
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 [FIX NAV] DOM Ready, setup listener tab...');
    
    // Intercetta tutti i click sulle tab
    document.addEventListener('click', (e) => {
        const tab = e.target.closest('[data-tab]');
        if (tab) {
            const tabName = tab.getAttribute('data-tab');
            console.log('🖱️ [FIX NAV] Click su tab:', tabName);
            
            // Se è timeline, assicura inizializzazione dopo navigazione
            if (tabName === 'timeline') {
                setTimeout(() => {
                    const content = document.getElementById('timeline-content');
                    if (content && content.style.display !== 'none') {
                        initializeTimeline();
                    }
                }, 500);
            }
        }
    });
    
    // Se siamo già su timeline all'avvio, inizializza
    const currentTab = window.location.hash.replace('#', '');
    if (currentTab === 'timeline' || currentTab === 'timeline-content') {
        console.log('📅 [FIX NAV] Avvio su Timeline, inizializzo...');
        setTimeout(initializeTimeline, 1000);
    }
});

// Funzione di test
window.testNavigationFix = function() {
    console.log('\n🧪 === TEST NAVIGATION FIX ===\n');
    
    console.log('Navigation count:', navigationCount);
    console.log('Last navigated tab:', lastNavigatedTab);
    console.log('Is navigating:', isNavigating);
    
    console.log('\n📊 Timeline status:');
    if (window.Timeline) {
        console.log('- Timeline object:', 'EXISTS');
        console.log('- Timeline.elements:', window.Timeline.elements);
        console.log('- Canvas:', window.Timeline.elements?.canvas);
        console.log('- State:', window.Timeline.state);
    } else {
        console.log('- Timeline object:', 'MISSING');
    }
    
    console.log('\n📋 DOM elements:');
    console.log('- timeline-content:', document.getElementById('timeline-content'));
    console.log('- timeline-container:', document.getElementById('timeline-container'));
    console.log('- timeline-canvas:', document.getElementById('timeline-canvas'));
    
    console.log('\n💡 Per testare navigazione: clicca sulla tab Timeline');
    console.log('💡 Per forzare init: window.initializeTimeline()');
    
    console.log('\n✅ Test completato\n');
};

// Esporta funzione globalmente
window.initializeTimeline = initializeTimeline;

console.log('✅ [FIX NAV-TIMELINE] Fix navigazione caricato!');
console.log('💡 Usa window.testNavigationFix() per debug');