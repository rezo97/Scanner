// script.js (ჩაანაცვლეთ არსებული კოდი სრულად)

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
const config = { fps: 10, qrbox: { width: 250, height: 250 } };

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
        
        // ვინახავთ "inventory" კოლექციაში, სადაც დოკუმენტის ID იქნება ნივთის ID
        await db.collection("inventory").doc(currentItemID).set({
            itemID: currentItemID,
            shelfID: currentShelfID,
            lastMoved: timestamp
        });

        logMessage(`✅ წარმატება: ნივთი ${currentItemID} დამაგრდა თაროზე ${currentShelfID}`, 'success');
        resetData(); 
        startScanner(); // წარმატების შემდეგ სკანერის ავტომატური გაშვება

    } catch (error) {
        logMessage(`❌ Firebase შეცდომა: ${error.message}`, 'error');
    }
}

// --- QR სკანერი ლოგიკა ---

function onScanSuccess(decodedText, decodedResult) {
    const scannedID = decodedText.trim();
    logMessage(`QR დასკანერდა: ${scannedID}`, 'info'); // დებუგირებისთვის

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
        currentShelfID = scannedID;
        logMessage(`**თაროს QR დასკანერდა:** ${currentShelfID}`);
        
        // თუ ორივე დასკანერებულია, სკანირების შეჩერება
        stopScanner(false);
    } else {
        logMessage("გასუფთავება საჭიროა ახალი ოპერაციის დასაწყებად.", 'warning');
        return;
    }
    
    updateStatusDisplay();
}

// სკანერის გაშვება
function startScanner() {
    if (isScannerActive || !document.getElementById('reader')) return;
    
    html5Qrcode.start({ facingMode: "environment" }, config, onScanSuccess)
        .then(() => {
            isScannerActive = true;
            logMessage("კამერა ჩაირთო. გთხოვთ, დაასკანეროთ ნივთის QR.", 'info');
        })
        .catch(err => {
            isScannerActive = false;
            logMessage(`❌ კამერის გაშვების შეცდომა. ${err.message}`, 'error');
        });
}

// სკანერის შეჩერება
function stopScanner(shouldLog = true) {
    if (isScannerActive) {
        html5Qrcode.stop().then(() => {
            isScannerActive = false;
            if (shouldLog) logMessage("სკანერი შეჩერდა.", 'info');
        }).catch(err => {
            logMessage(`სკანერის შეჩერების შეცდომა: ${err}`, 'error');
        });
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

    // სკანერის მართვა გვერდების მიხედვით
    if (viewName === 'distribute') {
        startScanner();
    } else {
        stopScanner();
    }
}

// ჩანაწერების ჩატვირთვა Firestore-დან
async function loadInventory() {
    inventoryList.innerHTML = 'ჩატვირთვა...';

    try {
        const snapshot = await db.collection("inventory").get();
        
        if (snapshot.empty) {
            inventoryList.innerHTML = '<p>ჩანაწერები არ მოიძებნა.</p>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const lastMoved = data.lastMoved ? data.lastMoved.toDate().toLocaleString() : 'N/A';
            
            html += `
                <div>
                    <strong>ნივთის ID:</strong> ${data.itemID}<br>
                    <strong>თარო:</strong> ${data.shelfID}<br>
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
    resetData();
    startScanner();
});

navDistributeBtn.addEventListener('click', () => {
    switchView('distribute');
});

navItemsBtn.addEventListener('click', () => {
    switchView('items');
});

loadItemsButton.addEventListener('click', loadInventory);

// აპლიკაციის დაწყება
window.onload = () => {
    updateStatusDisplay();
    switchView('distribute'); // ნაგულისხმევად გადანაწილების გვერდი
    logMessage("აპლიკაცია ჩაიტვირთა.", 'info');
};
