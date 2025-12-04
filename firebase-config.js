// firebase-config.js (თქვენი მონაცემებით)

// 1. Firebase-ის კონფიგურაცია (თქვენი პირადი მონაცემები)
const firebaseConfig = {
    apiKey: "AIzaSyB6zReg3Z_f3jEm6gnQG76D_azm63zXL2E", 
    authDomain: "warehouse-scanner-2cd7d.firebaseapp.com",
    projectId: "warehouse-scanner-2cd7d",
    storageBucket: "warehouse-scanner-2cd7d.firebasestorage.app",
    messagingSenderId: "231541585722",
    appId: "1:231541585722:web:de72b26115224154c40203",
    // measurementId: "G-P0HNC85XLH" // არ არის საჭირო Firestore-ისთვის
};

// 2. Firebase-ის ინიციალიზაცია
firebase.initializeApp(firebaseConfig);

// 3. Firestore-ის ინიციალიზაცია და გლობალურ ცვლადში შენახვა
// *** ეს ქმნის გლობალურ ცვლადს "db" ***
const db = firebase.firestore();
