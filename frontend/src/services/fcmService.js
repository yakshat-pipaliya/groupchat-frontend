import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAt8jhL3ugh_Fuc9lbS1Nv1wG5hemSX0qk",
  authDomain: "groupchat-d3e5f.firebaseapp.com",
  projectId: "groupchat-d3e5f",
  storageBucket: "groupchat-d3e5f.firebasestorage.app",
  messagingSenderId: "617052407292",
  appId: "1:617052407292:web:1f94f7a4d93e397ab8de79",
  measurementId: "G-B5EWX9BMR9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get messaging instance
let messaging = null;

try {
  messaging = getMessaging(app);
} catch (error) {
  console.error('Firebase messaging initialization error:', error);
}

// VAPID key
const VAPID_KEY = "BERk1EelnRmqeSfs-JBkr4RTPEGgmXhG1wb6FZEbRC2zDH_6sUtUbh8EMWbGpny-AYvU8SHQPsz5DekWUe5PuLU";

export const requestNotificationPermission = async () => {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission === 'granted';
  } catch (error) {
    console.error('Notification permission error:', error);
    return false;
  }
};

export const getFCMToken = async () => {
  try {
    // Check if messaging is available
    if (!messaging) {
      console.log('Firebase messaging is not available');
      return null;
    }

    // Request permission first
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('Notification permission denied');
      return null;
    }

    // Get FCM token
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    
    if (token) {
      console.log('FCM Token generated successfully');
      return token;
    } else {
      console.log('No registration token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    // Return null instead of throwing to prevent login failure
    return null;
  }
};

export const setupMessageListener = (callback) => {
  if (!messaging) {
    console.log('Firebase messaging is not available for listener');
    return () => {};
  }

  // Set up the message listener
  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });

  // Return unsubscribe function
  return unsubscribe;
};

// Legacy function for compatibility
export const onMessageListener = () => {
  return new Promise((resolve) => {
    if (!messaging) {
      resolve(null);
      return;
    }
    
    const unsubscribe = onMessage(messaging, (payload) => {
      resolve(payload);
      unsubscribe();
    });
  });
};

export { messaging };
