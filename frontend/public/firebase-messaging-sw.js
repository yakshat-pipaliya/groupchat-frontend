// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyDIr-SSna8YAnsQI7FpBdWPWKUP5ZGXxlY",
  authDomain: "fir-test-55401.firebaseapp.com",
  databaseURL: "https://fir-test-55401-default-rtdb.firebaseio.com",
  projectId: "fir-test-55401",
  storageBucket: "fir-test-55401.firebasestorage.app",
  messagingSenderId: "746089020187",
  appId: "1:746089020187:web:1e1c8fb701e5d0192a71be",
  measurementId: "G-JRYRF45FJ2"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message: ', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/favicon.svg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
