// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyAt8jhL3ugh_Fuc9lbS1Nv1wG5hemSX0qk",
  authDomain: "groupchat-d3e5f.firebaseapp.com",
  projectId: "groupchat-d3e5f",
  storageBucket: "groupchat-d3e5f.firebasestorage.app",
  messagingSenderId: "617052407292",
  appId: "1:617052407292:web:1f94f7a4d93e397ab8de79",
  measurementId: "G-B5EWX9BMR9"
});

const messaging = firebase.messaging();

// Track recently shown notifications to prevent duplicates
const recentNotifications = new Map();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Received background message:', payload);
  
  // Create a unique key using messageId from data or fallback to title+body+timestamp
  const messageId = payload.data?.messageId || payload.messageId;
  const notificationKey = messageId || `${payload.notification?.title}-${payload.notification?.body}-${Date.now()}`;
  const now = Date.now();
  
  // Check if we recently showed this exact notification (within last 5 seconds)
  if (recentNotifications.has(notificationKey)) {
    const lastShown = recentNotifications.get(notificationKey);
    if (now - lastShown < 5000) {
      console.log('[FCM SW] Duplicate notification detected, skipping:', notificationKey);
      return;
    }
  }
  
  // Track this notification
  recentNotifications.set(notificationKey, now);
  
  // Cleanup old entries
  recentNotifications.forEach((timestamp, key) => {
    if (now - timestamp > 10000) {
      recentNotifications.delete(key);
    }
  });
  
  // Show notification with unique tag to prevent duplicates
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/favicon.svg',
    data: payload.data,
    tag: messageId || `msg-${now}`, // Unique tag per message
    requireInteraction: false,
    renotify: false, // Don't notify again if tag exists
  };

  self.registration.showNotification(notificationTitle, notificationOptions)
    .then(() => console.log('[FCM SW] Notification shown:', notificationTitle))
    .catch(err => console.error('[FCM SW] Failed to show notification:', err));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Notification clicked:', event);
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
