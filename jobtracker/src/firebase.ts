// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDUak6SOH0W1XfgLHAzNCasXg6h0yEOVxM",
  authDomain: "jobtracker-64155.firebaseapp.com",
  projectId: "jobtracker-64155",
  storageBucket: "jobtracker-64155.firebasestorage.app",
  messagingSenderId: "486878162800",
  appId: "1:486878162800:web:1aff75635ab36b003b69b5",
  measurementId: "G-JVLFZ07YL4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);