// script.js (გამართული ვერსია კამერის ჩართვის პრობლემის მოსაგვარებლად)

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

let isScannerActive = false; // სკანერის მდგომარეობის შესანახი ცვლადი

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

        logMessage(`✅ წარმატება: ნივთი **${currentItemID}** დამაგრდა თაროზე **${currentShelfID}**`, 'success');
        resetData(); 
        
    } catch (error) {
        logMessage(`❌ Firebase შეცდომა: ${error.message}`, 'error');
    }
}

// --- QR სკანერი ლოგიკა ---

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
        
        // თუ ორივე დასკანერებულია, სკანირების შეჩერება
        stopScanner(false);
    } else {
        logMessage("გასუფთავება საჭიროა ახალი ოპერაციის დასაწყებად.", 'warning');
        return;
    }
    
    updateStatusDisplay();
}

// სკანერის გაშვება (გამართული)
function startScanner() {
    if (isScannerActive || !document.getElementById('reader')) return;
    
    // დარწმუნდით, რომ 'reader' ელემენტი ნამდვილად ხილვადია
    if (distributeView.classList.contains('hidden-view')) return;

    // ვცდილობთ გაშვებას
    html5Qrcode.start({ facingMode: "environment" }, config, onScanSuccess)
        .then(() => {
            isScannerActive = true;
            cameraToggleButton.innerHTML = '<span class="icon">⏹️</span> კამერის გამორთვა';
            cameraToggleButton.classList.remove('start-btn');
            cameraToggleButton.classList.add('stop-btn');
            logMessage("კამერა ჩაირთო. გთხოვთ, დაასკანეროთ ნივთის QR.", 'info');
        })
        .catch(err => {
            isScannerActive = false;
            logMessage(`❌ კამერის გაშვების შეცდომა. ${err.message}`, 'error');
            console.error("Scanner Start Error:", err);
            cameraToggleButton.innerHTML = '<span class="icon">❌</span> ვერ ჩაირთო';
            cameraToggleButton.disabled = true;
        });
}

// სკანერის შეჩერება
function stopScanner(shouldLog = true) {
    // შემოწმება, არის თუ არა html5Qrcode გაშვებული
    if (html5Qrcode.isScanning) { 
        html5Qrcode.stop().then(() => {
            isScannerActive = false;
            cameraToggleButton.innerHTML = '<span class="icon">▶️</span> კამერის ჩართვა';
            cameraToggleButton.classList.remove('stop-btn');
            cameraToggleButton.classList.add('start-btn');
            cameraToggleButton.disabled = false; // ღილაკის ჩართვა
            if (shouldLog) logMessage("სკანერი გამორთულია.", 'info');
        }).catch(err => {
            // თუ შეცდომაა და მაინც არ არის გაშვებული (ანუ წარმატებით შეჩერდა)
            if (err.includes("Html5Qrcode is not running")) {
                 isScannerActive = false;
                 return;
            }
            logMessage(`სკანერის შეჩერების შეცდომა: ${err}`, 'error');
        });
    } else {
        // თუ ლოგიკური ცვლადი აქტიურია, მაგრამ სკანერი არა, უბრალოდ ვანახლებთ ღილაკს
        isScannerActive = false;
        cameraToggleButton.innerHTML = '<span class="icon">▶️</span> კამერის ჩართვა';
        cameraToggleButton.classList.remove('stop-btn');
        cameraToggleButton.classList.add('start-btn');
        cameraToggleButton.disabled = false; 
    }
}

// --- მენიუს და ნივთების ლოგიკა ---

// გვერდის გადამრთველი
function switchView(viewName) {
    const views = {
        'distribute': { view: distributeView, btn: navDistributeBtn },
        'items': { view: itemsView, btn: navItemsBtn }
    };

    for (const name in views) {
        views[name].view.classList.remove('active-view');
        views[name].view.classList.add('hidden-view');
        views[name].btn.classList.remove('active');
    }

    views[viewName].view.classList.add('active-view');
    views[viewName].view.classList.remove('hidden-view');
    views[viewName].btn.classList.add('active');

    // თუ ვტოვებთ გადანაწილების გვერდს, ვთიშავთ კამერას
    if (viewName !== 'distribute') {
        stopScanner(false);
    }
}

// ჩანაწერების ჩატვირთვა Firestore-დან
async function loadInventory() {
    inventoryList.innerHTML = '<h4>ჩატვირთვა...</h4>';

    try {
        const snapshot = await db.collection("inventory").orderBy("lastMoved", "desc").get();
        
        if (snapshot.empty) {
            inventoryList.innerHTML = '<p>ჩანაწერები არ მოიძებნა.</p>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const lastMoved = data.lastMoved ? data.lastMoved.toDate().toLocaleString('ka-GE') : 'N/A';
            
            html += `
                <div>
                    <strong>ნივთის ID:</strong> ${data.itemID}<br>
                    <strong>თარო:</strong> <span>${data.shelfID}</span><br>
                    <small>ბოლო განთავსება: ${lastMoved}</small>
                </div>
            `;
        });

        inventoryList.innerHTML = html;

    } catch (error) {
        inventoryList.innerHTML = `<p class="message-error">შეცდომა ჩატვირთვისას: ${error.message}</p>`;
        console.error("Error loading inventory: ", error);
    }
}


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

// კამერის ჩართვა/გამორთვა ღილაკით
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
