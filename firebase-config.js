// firebase-config.js

// 1. Firebase-ის კონფიგურაცია (შეცვალეთ თქვენი მონაცემებით)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", 
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// 2. Firebase-ის ინიციალიზაცია
firebase.initializeApp(firebaseConfig);

// 3. Firestore-ის ინიციალიზაცია და გლობალურ ცვლადში შენახვა
// *** ეს ხაზი ქმნის ცვლადს "db" ***
const db = firebase.firestore();
