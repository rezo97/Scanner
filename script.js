// script.js (გამართული ვერსია კამერის ნებართვის პრობლემის მოსაგვარებლად)

// გლობალური ცვლადები
let currentItemID = null;
let currentShelfID = null;
let cameraId = null; // კამერის ID შესანახად

// ... (DOM ელემენტები უცვლელია)
const itemStatusEl = document.getElementById('item-status');
const shelfStatusEl = document.getElementById('shelf-status');
const saveButton = document.getElementById('save-button');
const resetButton = document.getElementById('reset-button');
const messageLog = document.getElementById('message-log');
const cameraToggleButton = document.getElementById('camera-toggle-button'); 

// ... (ნავიგაციის ელემენტები უცვლელია)
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

// ... (updateStatusDisplay, logMessage, resetData, saveData, onScanSuccess ფუნქციები უცვლელია)


// --- QR სკანერი ლოგიკა ---

// სკანერის გაშვება (გამართული)
async function startScanner() {
    if (isScannerActive || !document.getElementById('reader')) return;
    if (distributeView.classList.contains('hidden-view')) return;

    // ვცდილობთ კამერის მოწყობილობის ID-ის მიღებას
    if (!cameraId) {
        try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length) {
                // ვცდილობთ უკანა კამერის არჩევას
                const backCamera = devices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('environment'));
                cameraId = backCamera ? backCamera.id : devices[0].id; // თუ ვერ ვპოულობთ უკანა კამერას, ვირჩევთ პირველს
            }
        } catch (err) {
            logMessage(`❌ კამერების სიის მიღების შეცდომა: ${err.message}`, 'error');
            // თუ ვერ მივიღეთ ID, ვიყენებთ ზოგად facingMode-ს
            cameraId = { facingMode: "environment" };
        }
    }

    if (!cameraId) {
        logMessage("❌ კამერა ვერ მოიძებნა. გთხოვთ, შეამოწმოთ მოწყობილობის ნებართვები.", 'error');
        cameraToggleButton.innerHTML = '<span class="icon">❌</span> ვერ მოიძებნა';
        cameraToggleButton.disabled = true;
        return;
    }

    // ვცდილობთ გაშვებას კამერის ID-ით ან ზოგადი პარამეტრით
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
            logMessage(`❌ კამერის გაშვების შეცდომა: ${err.message}. შეამოწმეთ ნებართვები.`, 'error');
            console.error("Scanner Start Error:", err);
            cameraToggleButton.innerHTML = '<span class="icon">❌</span> ვერ ჩაირთო';
            cameraToggleButton.disabled = true;
        });
}

// სკანერის შეჩერება (უცვლელია)
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
