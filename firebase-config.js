// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB6zReg3Z_f3jEm6gnQG76D_azm63zXL2E",
  authDomain: "warehouse-scanner-2cd7d.firebaseapp.com",
  projectId: "warehouse-scanner-2cd7d",
  storageBucket: "warehouse-scanner-2cd7d.firebasestorage.app",
  messagingSenderId: "231541585722",
  appId: "1:231541585722:web:de72b26115224154c40203",
  measurementId: "G-P0HNC85XLH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
