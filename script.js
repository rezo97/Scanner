// script.js (ფინალური გამართული ვერსია კამერასთან დაკავშირებით)

// გლობალური ცვლადები
let currentItemID = null;
let currentShelfID = null;

// DOM ელემენტები
const itemStatusEl = document.getElementById('item-status');
const shelfStatusEl = document.getElementById('shelf-status');
const saveButton = document.getElementById('save-button');
const resetButton = document.getElementById('reset-button');
const messageLog = document.getElementById('message-log');
const cameraToggleButton = document.getElementById('camera-toggle-button'); 

// ნავიგაციის ელემენტები
const navDistributeBtn = document.getElementById('nav-distribute');
const navItemsBtn = document.getElementById('nav-items');
const distributeView = document.getElementById('distribute-view');
const itemsView = document.getElementById('items-view');
const loadItemsButton = document.getElementById('load-items-button');
const inventoryList = document.getElementById('inventory-list');

// QR სკანერის ინსტანცია
const html5Qrcode = new Html5Qrcode("reader");

const config = { 
    fps: 10, 
    qrbox: { width: 250, height: 250 }, 
    aspectRatio: 1.0, 
    verbose: true     
};

let isScannerActive = false; 
let cameraId = null; // კამერის ID-ის შესანახად

// --- ლოგიკური ფუნქციები ---

function updateStatusDisplay() {
    itemStatusEl.innerHTML = `**ნივთის QR (ID):** ${currentItemID || 'არ დასკანერებულა'}`;
    shelfStatusEl.innerHTML = `**თაროს QR (ID):** ${currentShelfID || 'არ დასკანერებულა'}`;
    saveButton.disabled = !(currentItemID && currentShelfID);
}

function logMessage(message, type = 'info') {
    const p = document.createElement('p');
    p.innerHTML = message;
    p.className = `message-${type}`;
    messageLog.prepend(p);
    setTimeout(() => p.remove(), 10000);
}

function resetData() {
    currentItemID = null;
    currentShelfID = null;
    updateStatusDisplay();
    logMessage("სტატუსი გასუფთავდა. მზადაა ახალი სკანირებისთვის. ჩართეთ კამერა.", 'info');
}

async function saveData() {
    if (!currentItemID || !currentShelfID) return;

    try {
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        await db.collection("inventory").doc(currentItemID).set({
            itemID: currentItemID,
            shelfID: currentShelfID,
            lastMoved: timestamp
        });

        logMessage(`✅ წარმატება: ნივთი **${currentItemID}** დამაგრდა თაროზე **${currentShelfID}**`, 'success');
        resetData(); 
        
    } catch (error) {
        logMessage(`❌ Firebase შეცდომა: ${error.message}`, 'error');
    }
}

function onScanSuccess(decodedText, decodedResult) {
    const scannedID = decodedText.trim();
    
    if (!currentItemID) {
        currentItemID = scannedID;
        logMessage(`**ნივთის QR დასკანერდა:** **${currentItemID}**`);
    } else if (!currentShelfID) {
        if (scannedID === currentItemID) {
            logMessage("გაფრთხილება: ნივთი და თარო ვერ იქნება ერთი და იგივე კოდი.", 'warning');
            return;
        }
        currentShelfID = scannedID;
        logMessage(`**თაროს QR დასკანერდა:** **${currentShelfID}**`);
        
        stopScanner(false);
    } else {
        logMessage("გასუფთავება საჭიროა ახალი ოპერაციის დასაწყებად.", 'warning');
        return;
    }
    
    updateStatusDisplay();
}

// --- კამერის ფუნქციები ---

// კამერის ID-ის მიღება (ეს აიძულებს ბრაუზერს ნებართვა ითხოვოს)
async function getCameraId() {
    try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
            // ვცდილობთ უკანა კამერის არჩევას
            const backCamera = devices.find(device => 
                device.label.toLowerCase().includes('back') || 
                device.label.toLowerCase().includes('environment') || 
                devices.length === 1 // თუ მხოლოდ ერთია, ის იქნება
            );
            cameraId = backCamera ? backCamera.id : devices[0].id;
        }
    } catch (err) {
        // თუ ნებართვა არ არის, აქ დაგვიბრუნდება შეცდომა (NotAllowedError)
        logMessage(`❌ კამერის მოთხოვნის შეცდომა: ${err.name}. ${err.message}`, 'error');
        console.error("getCameraError:", err);
        return null;
    }
    return cameraId;
}


// სკანერის გაშვება
async function startScanner() {
    if (isScannerActive || !document.getElementById('reader') || distributeView.classList.contains('hidden-view')) return;

    // 1. ვცდილობთ კამერის ID-ის მიღებას
    if (!cameraId) {
        if (await getCameraId() === null) {
            cameraToggleButton.innerHTML = '<span class="icon">🔒</span> ნებართვა უარყოფილია';
            cameraToggleButton.disabled = true;
            return;
        }
    }
    
    // 2. კამერის გაშვება ID-ით
    html5Qrcode.start(cameraId, config, onScanSuccess)
        .then(() => {
            isScannerActive = true;
            cameraToggleButton.innerHTML = '<span class="icon">⏹️</span> კამერის გამორთვა';
            cameraToggleButton.classList.remove('start-btn');
            cameraToggleButton.classList.add('stop-btn');
            cameraToggleButton.disabled = false;
            logMessage("კამერა ჩაირთო. გთხოვთ, დაასკანეროთ ნივთის QR.", 'info');
        })
        .catch(err => {
            isScannerActive = false;
            logMessage(`❌ კამერის გაშვების შეცდომა: ${err.name}. ${err.message}`, 'error');
            console.error("Scanner Start Error:", err);
            cameraToggleButton.innerHTML = '<span class="icon">❌</span> ვერ ჩაირთო';
            cameraToggleButton.disabled = true;
        });
}

// სკანერის შეჩერება
function stopScanner(shouldLog = true) {
    if (html5Qrcode.isScanning) { 
        html5Qrcode.stop().then(() => {
            isScannerActive = false;
            cameraToggleButton.innerHTML = '<span class="icon">▶️</span> კამერის ჩართვა';
            cameraToggleButton.classList.remove('stop-btn');
            cameraToggleButton.classList.add('start-btn');
            cameraToggleButton.disabled = false; 
            if (shouldLog) logMessage("სკანერი გამორთულია.", 'info');
        }).catch(err => {
            if (err.includes("Html5Qrcode is not running")) {
                 isScannerActive = false;
                 return;
            }
            logMessage(`სკანერის შეჩერების შეცდომა: ${err}`, 'error');
        });
    } else {
        isScannerActive = false;
        cameraToggleButton.innerHTML = '<span class="icon">▶️</span> კამერის ჩართვა';
        cameraToggleButton.classList.remove('stop-btn');
        cameraToggleButton.classList.add('start-btn');
        cameraToggleButton.disabled = false; 
    }
}

// ... (switchView, loadInventory ფუნქციები უცვლელია)

// --- ინიციალიზაცია და ღილაკების დამმუშავებლები ---

saveButton.addEventListener('click', async () => {
    saveButton.disabled = true;
    await saveData();
});

resetButton.addEventListener('click', () => {
    stopScanner(false); 
    resetData();
});

navDistributeBtn.addEventListener('click', () => {
    switchView('distribute');
});

navItemsBtn.addEventListener('click', () => {
    switchView('items');
});

loadItemsButton.addEventListener('click', loadInventory);

cameraToggleButton.addEventListener('click', () => {
    if (isScannerActive) {
        stopScanner(true);
    } else {
        startScanner();
    }
});


// აპლიკაციის დაწყება
window.onload = () => {
    updateStatusDisplay();
    switchView('distribute'); 
    logMessage("აპლიკაცია ჩაიტვირთა. კამერის ჩასართავად დააჭირეთ ღილაკს.", 'info');
};
