/**
 * Service Worker per PWA
 * Gestisce cache e funzionalità offline
 */

const CACHE_NAME = 'smart-commercial-assistant-v1.0.3-js-fixed'; // PWA - JS fetch fix
const CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  
  // CSS Files
  '/css/main.css',
  '/css/mobile.css',
  '/css/mobile-responsive.css',
  '/css/base-components.css',
  '/css/timeline-components.css',
  '/css/modal-components.css',
  '/css/ui-components.css',
  '/css/clients-module.css',
  '/css/orders-module.css',
  '/css/ordini.css',
  '/css/ddtft-module.css',
  '/css/products-module.css',
  '/css/percorsi-module.css',
  '/css/worksheet-module.css',
  '/css/worksheet.css',
  '/css/tables.css',
  '/css/smart-assistant.css',
  
  // JS Files - Core
  '/js/app.js',
  '/js/navigation.js',
  '/js/api.js',
  
  // JS Files - Utilities
  '/js/utils/device-detector.js',
  
  // JS Files - AI
  '/js/ai/ai-voice-manager.js',
  '/js/ai/ai-command-parser.js',
  
  // JS Files - Timeline
  '/js/timeline/timeline-core.js',
  '/js/timeline/timeline-rendering.js',
  '/js/timeline/timeline-events.js',
  '/js/timeline/timeline-controls.js',
  '/js/timeline/timeline-config.js',
  
  // JS Files - Modules
  '/js/clienti-core.js',
  '/js/clienti-form.js',
  '/js/ordini.js',
  '/js/prodotti.js',
  '/js/percorsi.js',
  '/js/percorsi-core.js',
  '/js/worksheet-core.js',
  '/js/worksheet-ui.js',
  '/js/worksheet-view.js',
  '/js/worksheet-import.js',
  '/js/worksheet-itinerary.js',
  '/js/worksheet-dragdrop.js',
  '/js/smart-assistant.js',
  
  // External Libraries (CDN - cache solo se disponibili)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
];

// Installa il service worker
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Service Worker: Caching files...');
        return cache.addAll(CACHE_URLS.map(url => new Request(url, {
          credentials: 'same-origin'
        })));
      })
      .catch(error => {
        console.error('❌ Service Worker: Cache failed:', error);
      })
  );
  
  // Forza l'attivazione immediata
  self.skipWaiting();
});

// Attiva il service worker
self.addEventListener('activate', event => {
  console.log('✅ Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Prendi controllo di tutte le pagine aperte
  self.clients.claim();
});

// ✅ SERVICE WORKER FIXED - Lascia passare script JS senza intercettazione
self.addEventListener('fetch', event => {
  // ✅ GUARDIA CRITICA: Non intercettare richieste di script JS
  if (event.request.destination === 'script' || 
      event.request.url.includes('temporal') || 
      event.request.url.includes('config/') ||
      event.request.url.includes('middleware/') ||
      event.request.url.endsWith('.js')) {
    console.log('[SW] JS request bypassed:', event.request.url);
    // ✅ FIX CRITICO: Non fare return vuoto, lascia che il browser gestisca
    return;
  }
  
  // Per altre richieste NON-JS, potresti implementare cache logic
  // Ma per ora lasciamo passare tutto per evitare conflitti
});

// Gestisci messaggi dal client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_NAME
    });
  }
});

// Gestisci sincronizzazione in background
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('🔄 Service Worker: Background sync triggered');
    
    event.waitUntil(
      // Qui puoi implementare la sincronizzazione con Supabase
      syncWithSupabase()
    );
  }
});

// Funzione di sincronizzazione Supabase (placeholder)
async function syncWithSupabase() {
  try {
    // Implementa qui la logica di sincronizzazione
    console.log('🔄 Sync con Supabase...');
    
    // Per ora è solo un placeholder
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Sync fallito:', error);
    throw error;
  }
}

// Gestisci notifiche push per promemoria
self.addEventListener('push', event => {
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }
  
  const options = {
    body: data.body || 'Promemoria Smart Assistant',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: data.tag || 'smart-reminder',
    requireInteraction: data.requireInteraction || true,
    silent: false,
    vibrate: [200, 100, 200],
    data: data,
    actions: [
      {
        action: 'complete',
        title: '✅ Completato',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'postpone',
        title: '⏰ Rinvia 15min',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'open',
        title: '📱 Apri App',
        icon: '/icons/icon-96x96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('🔔 Smart Assistant', options)
  );
});

// Gestisci click su notifiche
self.addEventListener('notificationclick', event => {
  const action = event.action;
  const data = event.notification.data || {};
  
  event.notification.close();
  
  switch (action) {
    case 'complete':
      // Marca come completato
      event.waitUntil(
        handleTaskCompletion(data)
      );
      break;
      
    case 'postpone':
      // Rinvia di 15 minuti
      event.waitUntil(
        scheduleReminderDelay(data, 15)
      );
      break;
      
    case 'open':
    default:
      // Apri l'app
      event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
          // Se l'app è già aperta, portala in primo piano
          for (let client of clientList) {
            if (client.url === self.location.origin + '/' && 'focus' in client) {
              return client.focus();
            }
          }
          // Altrimenti apri una nuova finestra
          if (clients.openWindow) {
            return clients.openWindow('/?from=notification');
          }
        })
      );
      break;
  }
});

// Funzioni helper per gestire le azioni delle notifiche
async function handleTaskCompletion(data) {
  try {
    // Invia messaggio all'app per completare il task
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'COMPLETE_TASK',
        taskId: data.taskId,
        taskType: data.taskType
      });
    });
  } catch (error) {
    console.error('❌ Errore completamento task:', error);
  }
}

async function scheduleReminderDelay(data, delayMinutes) {
  try {
    // Programma un nuovo promemoria
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'POSTPONE_REMINDER',
        taskId: data.taskId,
        delayMinutes: delayMinutes,
        originalData: data
      });
    });
    
    // Mostra conferma
    self.registration.showNotification('⏰ Promemoria Rinviato', {
      body: `Ti ricorderemo fra ${delayMinutes} minuti`,
      icon: '/icons/icon-96x96.png',
      tag: 'postpone-confirmation',
      requireInteraction: false
    });
  } catch (error) {
    console.error('❌ Errore rinvio promemoria:', error);
  }
}

console.log('🚀 Service Worker caricato:', CACHE_NAME);