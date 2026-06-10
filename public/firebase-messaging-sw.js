// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyC04olB4XOwT0E2D5rXOvRkVhpIWB4Uvxw",
  authDomain: "deadlineaware.firebaseapp.com",
  projectId: "deadlineaware",
  storageBucket: "deadlineaware.firebasestorage.app",
  messagingSenderId: "224774407045",
  appId: "1:224774407045:web:d4fe77d588a0139b253aec",
  measurementId: "G-3PW38EVT94"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Deadline Reminder';
  const notificationOptions = {
    body: payload.notification?.body || 'You have an approaching deadline!',
    icon: '/favicon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
