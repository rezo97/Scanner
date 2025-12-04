// script.js
// მოიცავს QR სკანერის ლოგიკას, Firebase-თან ურთიერთობას და მენიუს მართვას.

// გლობალური ცვლადები
let currentItemID = null;
let currentShelfID = null;

// DOM ელემენტები
const itemStatusEl = document.getElementById('item-status');
const shelfStatusEl = document.getElementById('shelf-status');
const saveButton = document.getElementById('save-button');
const resetButton = document.getElementById('reset-button');
const messageLog = document.getElementById('message-log');

// ნავიგაციის ელემენტები
const navDistributeBtn = document.getElementById('nav-distribute');
const navItemsBtn = document.getElementById('nav-items');
const distributeView = document.getElementById('distribute-view');
const itemsView = document.getElementById('items-view');
const loadItemsButton = document.getElementById('load-items-button');
const inventoryList = document.getElementById('inventory-list');

// QR სკანერის ინსტანცია
const html5Qrcode = new Html5Qrcode("reader");

// განახლებული კონფიგურაცია QR-ის უკეთ ამოსაცნობად
const config = { 
    fps: 10, 
    qrbox: { width: 300, height: 300 }, // ზომა გავზარდეთ
    aspectRatio: 1.0, 
    verbose: true     // დეტალური ლოგირება კონსოლში
};

let isScannerActive = false; // სკანერის მდგომარეობის შესანახი ცვლადი

// --- ლოგიკური ფუნქციები ---

function updateStatusDisplay() {
    itemStatusEl.textContent = `**ნივთის QR (ID):** ${currentItemID || 'არ დასკანერებულა'}`;
    shelfStatusEl.textContent = `**თაროს QR (ID):** ${currentShelfID || 'არ დასკანერებულა'}`;
    saveButton.disabled = !(currentItemID && currentShelfID);
}

function logMessage(message, type = 'info') {
    const p = document.createElement('p');
    p.textContent = message;
    p.className = `message-${type}`;
    messageLog.prepend(p);
    setTimeout(() => p.remove(), 10000);
}

function resetData() {
    currentItemID = null;
    currentShelfID = null;
    updateStatusDisplay();
    logMessage("სტატუსი გასუფთავდა. მზადაა ახალი სკანირებისთვის.", 'info');
}

// მონაცემთა შენახვა Firestore-ში
async function saveData() {
    if (!currentItemID || !currentShelfID) return;

    try {
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        await db.collection("inventory").doc(currentItemID).set({
            itemID: currentItemID,
            shelfID: currentShelfID,
            lastMoved: timestamp
        });

        logMessage(`✅ წარმატება: ნივთი ${currentItemID} დამაგრდა თაროზე ${currentShelfID}`, 'success');
        resetData(); 
        startScanner(); 

    } catch (error) {
        logMessage(`❌ Firebase შეცდომა: ${error.message}`, 'error');
    }
}

// --- QR სკანერი ლოგიკა ---

function onScanSuccess(decodedText, decodedResult) {
    const scannedID = decodedText.trim();
    
    // თუ კამერა წარმატებით მუშაობს, მაგრამ შედეგი მოდის, შეგვიძლია ეს ლოგი გამოიყენოთ
    console.log(`QR დასკანერდა: ${scannedID}`); 

    if (!currentItemID) {
        // 1. ნივთის სკანირება
        currentItemID = scannedID;
        logMessage(`**ნივთის QR დასკანერდა:** ${currentItemID}`);
    } else if (!currentShelfID) {
        // 2. თაროს სკანირება
        if (scannedID === currentItemID) {
            logMessage("გაფრთხილება: ნივთი და თარო ვერ იქნება ერთი და იგივე კოდი.", 'warning');
            return;
        }
        currentShelfID = scanned
