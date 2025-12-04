// script.js (User-Friendly და ოპტიმიზებული ვერსია)

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

// კონფიგურაცია - ოპტიმიზებულია სკანირების სიჩქარისა და სიზუსტისთვის
const config = { 
    fps: 15, // გაზრდილი კადრი წამში
    qrbox: { width: 250, height: 250 }, // ოპტიმალური ყუთის ზომა
    aspectRatio: 1.777778, // 16:9 ასპექტის თანაფარდობა
    disableFlip: false,
    verbose: true     
};

let isScannerActive = false; 

// --- ლოგიკური ფუნქციები ---

function updateStatusDisplay() {
    itemStatusEl.innerHTML = `**ნივთის QR (ID):** ${currentItemID || 'არ დასკანერებულა'}`;
    shelfStatusEl.innerHTML = `**თაროს QR (ID):** ${currentShelfID || 'არ დასკანერებულა'}`;
    // "დამაგრება" აქტიურდება, როცა ორივე ID არსებობს
    saveButton.disabled = !(currentItemID && currentShelfID); 
}

function logMessage(message, type = 'info') {
    const p = document.createElement('p');
    p.innerHTML = message;
    p.className = `message-${type}`;
    messageLog.prepend(p);
    // შეტყობინებების ავტომატური წაშლა 10 წამში
    setTimeout(() => p.remove(), 10000); 
}

function resetData() {
    currentItemID = null;
    currentShelfID = null;
    updateStatusDisplay();
    logMessage("სტატუსი გასუფთავდა. მზადაა ახალი ნივთის დასამაგრებლად.", 'info');
    // ჩართვის ღილაკის აღდგენა (თუ არ არის აქტიური)
    if (!isScannerActive) {
        cameraToggleButton.innerHTML = '<span class="icon">▶️</span> კამერის ჩართვა';
        cameraToggleButton.classList.remove('stop-btn', 'start-btn');
        cameraToggleButton.classList.add('start-btn');
        cameraToggleButton.disabled = false;
    }
}

async function saveData() {
    if (!currentItemID || !currentShelfID) return;
    
    // **User-Friendly: ღილაკის დროებითი გათიშვა**
    saveButton.disabled = true;
    saveButton.innerHTML = '...შენახვა'; 

    try {
        // **შეამოწმეთ, რომ "db" ცვლადი გლობალურადაა განსაზღვრული firebase-config.js-ში!**
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        await db.collection("inventory").doc(currentItemID).set({
            itemID: currentItemID,
            shelfID: currentShelfID,
            lastMoved: timestamp
        });

        logMessage(`✅ წარმატება: ნივთი **${currentItemID}** დამაგრდა თაროზე **${currentShelfID}**`, 'success');
        resetData(); 
        
    } catch (error) {
        logMessage(`❌ Firebase შეცდომა: ${error.name || ''}: ${error.message}. შეამოწმეთ firebase-config.js!`, 'error');
        // შეცდომის შემთხვევაში ღილაკის აღდგენა
        updateStatusDisplay();
        saveButton.innerHTML = '💾 დამაგრება'; 

    }
}

function onScanSuccess(decodedText, decodedResult) {
    const scannedID = decodedText.trim();
    
    if (!currentItemID) {
        currentItemID = scannedID;
        logMessage(`**ნივთის QR დასკანერდა:** **${currentItemID}**. ახლა დაასკანერეთ თაროს QR.`, 'info');
    } else if (!currentShelfID) {
        if (scannedID === currentItemID) {
            logMessage("გაფრთხილება: ნივთი და თარო ვერ იქნება ერთი და იგივე კოდი. სცადეთ ხელახლა.", 'warning');
            return;
        }
        currentShelfID = scannedID;
        logMessage(`**თაროს QR დასკანერდა:** **${currentShelfID}**. დააჭირეთ 'დამაგრებას'.`, 'info');
        
        // **User-Friendly: ავტომატური გამორთვა სკანირების დასრულების შემდეგ**
        stopScanner(false);
    } 
    
    updateStatusDisplay();
}

// --- კამერის ფუნქციები (User-Friendly ლოგირებით) ---

async function startScanner() {
    if (isScannerActive || !document.getElementById('reader') || distributeView.classList.contains('hidden-view')) return;
    
    const cameraRequest = { facingMode: "environment" };

    html5Qrcode.start(cameraRequest, config, onScanSuccess)
        .then(() => {
            isScannerActive = true;
            cameraToggleButton.innerHTML = '<span class="icon">⏹️</span> კამერის გამორთვა';
            cameraToggleButton.classList.remove('start-btn');
            cameraToggleButton.classList.add('stop-btn');
            cameraToggleButton.disabled = false;
            // **User-Friendly: მკაფიო მითითება, რა უნდა დასკანერდეს პირველ რიგში**
            logMessage("კამერა ჩაირთო. **გთხოვთ, დაასკანეროთ ნივთის QR.**", 'info');
        })
        .catch(err => {
            isScannerActive = false;
            logMessage(`❌ კამერის გაშვების შეცდომა: ${err.name}. ${err.message}`, 'error');
            cameraToggleButton.innerHTML = '<span class="icon">❌</span> ვერ ჩაირთო';
            cameraToggleButton.disabled = true;
        });
}

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

// --- მენიუს და ნივთების ლოგიკა (უცვლელია) ---

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

    if (viewName !== 'distribute') {
        stopScanner(false);
    }
}

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
    // SaveData-ში უკვე ხდება saveButton.disabled = true;
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
    logMessage("აპლიკაცია ჩაიტვირთა. დააჭირეთ 'კამერის ჩართვა'.", 'info');
};
