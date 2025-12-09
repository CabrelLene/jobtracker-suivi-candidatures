// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// ⬇️ Remplace ces valeurs par celles de ta config Firebase Web
const firebaseConfig = {
  apiKey: 'AIzaSyDUak6SOH0W1XfgLHAzNCasXg6h0yEOVxM',
  authDomain: 'jobtracker-64155.firebaseapp.com',
  projectId: 'jobtracker-64155',
  storageBucket: 'jobtracker-64155.firebasestorage.app',
  messagingSenderId: '486878162800',
  appId: '486878162800:web:1aff75635ab36b003b69b5',
};

// Initialisation de l'app Firebase
const app = initializeApp(firebaseConfig);

// ⚠️ Export nommé EXACTEMENT "auth"
export const auth = getAuth(app);
