// script.js

// გლობალური ცვლადები დასკანერებული მონაცემების შესანახად
let currentItemID = null;
let currentShelfID = null;

// DOM ელემენტები
const itemStatusEl = document.getElementById('item-status');
const shelfStatusEl = document.getElementById('shelf-status');
const saveButton = document.getElementById('save-button');
const resetButton = document.getElementById('reset-button');
const messageLog = document.getElementById('message-log');

// --- ლოგიკური ფუნქციები ---

// სტატუსის განახლება
function updateStatusDisplay() {
    itemStatusEl.textContent = `**ნივთის QR (ID):** ${currentItemID || 'არ დასკანერებულა'}`;
    shelfStatusEl.textContent = `**თაროს QR (ID):** ${currentShelfID || 'არ დასკანერებულა'}`;
    
    // "დამაგრების" ღილაკის ჩართვა/გამორთვა
    saveButton.disabled = !(currentItemID && currentShelfID);
}

// შეტყობინებების ჩვენება
function logMessage(message, type = 'info') {
    const p = document.createElement('p');
    p.textContent = message;
    p.className = `message-${type}`; // CSS სტილისთვის
    messageLog.prepend(p); // უახლესი შეტყობინება ზემოთ
    // ავტომატური წაშლა 10 წამში
    setTimeout(() => p.remove(), 10000);
}

// მონაცემთა გასუფთავება
function resetData() {
    currentItemID = null;
    currentShelfID = null;
    updateStatusDisplay();
    logMessage("სტატუსი გასუფთავდა. მზადაა ახალი სკანირებისთვის.", 'info');
}

// მონაცემთა შენახვა Firestore-ში
async function saveData() {
    if (!currentItemID || !currentShelfID) {
        logMessage("შეცდომა: ორივე QR კოდი უნდა იყოს დასკანერებული.", 'error');
        return;
    }

    try {
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        // ვინახავთ "inventory" კოლექციაში, სადაც დოკუმენტის ID იქნება ნივთის ID
        await db.collection("inventory").doc(currentItemID).set({
            itemID: currentItemID,
            shelfID: currentShelfID,
            lastMoved: timestamp
        });

        logMessage(`✅ წარმატება: ნივთი ${currentItemID} დამაგრდა თაროზე ${currentShelfID}`, 'success');
        resetData(); // წარმატების შემდეგ გასუფთავება

    } catch (error) {
        logMessage(`❌ Firebase შეცდომა: ${error.message}`, 'error');
    }
}

// --- QR სკანერი ---
const html5Qrcode = new Html5Qrcode("reader");

const config = { fps: 10, qrbox: { width: 250, height: 250 } };

function onScanSuccess(decodedText, decodedResult) {
    
    // ვვარაუდობთ, რომ სკანირებული ტექსტი არის უნიკალური ID (QR-ის შინაარსი)
    const scannedID = decodedText.trim();

    if (!currentItemID) {
        // 1. ნივთის სკანირება
        currentItemID = scannedID;
        logMessage(`**ნივთის QR დასკანერდა:** ${currentItemID}`);
    } else if (!currentShelfID) {
        // 2. თაროს სკანირება
        if (scannedID === currentItemID) {
            logMessage("გაფრთხილება: ნივთი და თარო ვერ იქნება ერთი და იგივე კოდი. სცადეთ თაროს კოდის სკანირება.", 'warning');
            return;
        }
        currentShelfID = scannedID;
        logMessage(`**თაროს QR დასკანერდა:** ${currentShelfID}`);
        
        // თუ ორივე დასკანერებულია, სკანირების პროცესი შეჩერდეს და მომხმარებელს დამაგრება მოვთხოვოთ
        if(html5Qrcode.isScanning) {
             html5Qrcode.stop().then((ignore) => {
                 logMessage("სკანერი შეჩერდა. დააჭირეთ 'დამაგრებას'.", 'info');
             }).catch((err) => {
                 logMessage(`სკანერის შეჩერების შეცდომა: ${err}`, 'error');
             });
        }
    } else {
        // თუ ორივე უკვე არის, ახალი სკანირება მოითხოვს გასუფთავებას
        logMessage("გასუფთავება საჭიროა ახალი ოპერაციის დასაწყებად.", 'warning');
        return;
    }
    
    updateStatusDisplay();
}

// სკანერის გაშვება
function startScanner() {
    html5Qrcode.start({ facingMode: "environment" }, config, onScanSuccess)
        .catch(err => {
            logMessage(`❌ კამერის გაშვების შეცდომა. დარწმუნდით, რომ გაქვთ HTTPS და ნებართვა: ${err}`, 'error');
            // ეკრანზე გამოვიტანოთ ღილაკი ხელით შეყვანისთვის, თუ კამერა არ მუშაობს
        });
}

// --- ღილაკების დამმუშავებლები ---
saveButton.addEventListener('click', async () => {
    saveButton.disabled = true; // ღილაკის გამორთვა დაჭერისას
    await saveData();
    
    // სკანერის თავიდან გაშვება
    startScanner();
});

resetButton.addEventListener('click', () => {
    resetData();
    // სკანერის თავიდან გაშვება
    if(!html5Qrcode.isScanning) {
        startScanner();
    }
});


// აპლიკაციის დაწყება
window.onload = () => {
    updateStatusDisplay();
    startScanner();
    logMessage("აპლიკაცია ჩაიტვირთა. კამერის გაშვება მიმდინარეობს...");
};
