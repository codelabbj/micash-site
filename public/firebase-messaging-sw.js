// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

// Firebase configuration - REPLACE WITH YOUR CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAXiRXibyXK2IbSNUlb0GAGrRUDgsd5h6Q",
  authDomain: "micash-890bd.firebaseapp.com",
  projectId: "micash-890bd",
  storageBucket: "micash-890bd.firebasestorage.app",
  messagingSenderId: "21928347232",
  appId: "1:21928347232:web:8a0dfee805587e3024a505",
  measurementId: "G-Q1Y9042CZY"
};
// apiKey: "AIzaSyAXiRXibyXK2IbSNUlb0GAGrRUDgsd5h6Q",
//   authDomain: "micash-890bd.firebaseapp.com",
//   projectId: "micash-890bd",
//   storageBucket: "micash-890bd.firebasestorage.app",
//   messagingSenderId: "21928347232",
//   appId: "1:21928347232:web:8a0dfee805587e3024a505",
//   measurementId: "G-Q1Y9042CZY"
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

console.log('[firebase-messaging-sw.js] Firebase initialized with config:', firebaseConfig.projectId);

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: payload.notification?.icon || '/icon-192x192.png',
    badge: '/badge-72x72.png',
    image: payload.notification?.image,
    data: payload.data,
    tag: payload.data?.tag || 'default',
    requireInteraction: payload.data?.requireInteraction === 'true',
    actions: payload.data?.actions ? JSON.parse(payload.data.actions) : [],
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
    renotify: true,
    silent: false,
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  // Handle different click actions
  if (event.action) {
    // Handle action button clicks
    handleActionClick(event.action, event.notification.data);
  } else {
    // Handle main notification click
    handleNotificationClick(event.notification.data, event);
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Track notification close event
  if (event.notification.data?.trackClose) {
    trackNotificationEvent('close', event.notification.data);
  }
});

// Handle push events (for additional processing)
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('Push payload:', payload);
      
      // Additional processing can be done here
      processPushPayload(payload);
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  
  // Take control of all clients immediately
  event.waitUntil(self.clients.claim());
});

// Handle service worker fetch
self.addEventListener('fetch', (event) => {
  // Add caching strategies here if needed
  // For now, just pass through
});

// Helper functions
function handleNotificationClick(data, event) {
  const url = data?.url || data?.click_action || '/';
  
  // Open or focus the app
  if (event && event.waitUntil) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (client.navigate) {
              client.navigate(url);
            }
            return;
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }

  // Track notification click
  if (data?.trackClick) {
    trackNotificationEvent('click', data);
  }
}

function handleActionClick(action, data) {
  console.log('Action clicked:', action, data);
  
  // Handle different actions
  switch (action) {
    case 'view':
      handleNotificationClick(data, null);
      break;
    case 'dismiss':
      // Just close the notification (already closed by default)
      break;
    case 'reply':
      // Handle reply action
      handleReplyAction(data, null);
      break;
    default:
      console.log('Unknown action:', action);
  }

  // Track action click
  if (data?.trackActions) {
    trackNotificationEvent('action', { action, ...data });
  }
}

function handleReplyAction(data, event) {
  // Handle reply functionality
  console.log('Reply action triggered:', data);
  
  // You can implement reply functionality here
  // For example, open a reply dialog or navigate to a reply page
  const replyUrl = data?.replyUrl || '/reply';
  
  if (event && event.waitUntil) {
    event.waitUntil(
      clients.openWindow(replyUrl)
    );
  }
}

function processPushPayload(payload) {
  // Additional processing for push payloads
  console.log('Processing push payload:', payload);
  
  // You can add custom logic here
  // For example, updating local storage, sending analytics, etc.
}

function trackNotificationEvent(eventType, data) {
  // Track notification events for analytics
  console.log('Tracking notification event:', eventType, data);
  
  // Send to analytics service
  if (data?.analyticsId) {
    // Implement analytics tracking here
    fetch('/api/analytics/notification-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType,
        data,
        timestamp: Date.now(),
      }),
    }).catch(error => {
      console.error('Error tracking notification event:', error);
    });
  }
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle errors
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason);
});

console.log('Firebase Messaging Service Worker loaded');
