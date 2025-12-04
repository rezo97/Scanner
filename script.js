// script.js (User-Friendly და ოპტიმიზებული ვერსია Order ID-ის ლოგიკით)

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
    fps: 15, 
    qrbox: { width: 250, height: 250 }, 
    aspectRatio: 1.777778, 
    disableFlip: false,
    verbose: true     
};

let isScannerActive = false; 

// --- ლოგიკური ფუნქციები ---

function updateStatusDisplay() {
    itemStatusEl.innerHTML = `**Order ID:** ${currentItemID || 'არ დასკანერებულა'}`;
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
    logMessage("სტატუსი გასუფთავდა. მზადაა ახალი ნივთის დასამაგრებლად.", 'info');
    if (!isScannerActive) {
        cameraToggleButton.innerHTML = '<span class="icon">▶️</span> კამერის ჩართვა';
        cameraToggleButton.classList.remove('stop-btn', 'start-btn');
        cameraToggleButton.classList.add('start-btn');
        cameraToggleButton.disabled = false;
    }
}

async function saveData() {
    if (!currentItemID || !currentShelfID) return;
    
    saveButton.disabled = true;
    saveButton.innerHTML = '...შენახვა'; 

    try {
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        // *** .add() მეთოდის გამოყენება უზრუნველყოფს უნიკალურ ჩანაწერს ყოველ ჯერზე ***
        await db.collection("inventory").add({ 
            orderID: currentItemID, // ItemID გამოიყენება OrderID-ის აღსანიშნავად
            shelfID: currentShelfID,
            lastMoved: timestamp
        });

        logMessage(`✅ წარმატება: Order ID **${currentItemID}** დამაგრდა თაროზე **${currentShelfID}**`, 'success');
        resetData(); 
        
    } catch (error) {
        logMessage(`❌ Firebase შეცდომა: ${error.name || ''}: ${error.message}. შეამოწმეთ firebase-config.js!`, 'error');
        updateStatusDisplay();
        saveButton.innerHTML = '💾 დამაგრება'; 
    }
}

function onScanSuccess(decodedText, decodedResult) {
    const scannedID = decodedText.trim();
    
    if (!currentItemID) {
        currentItemID = scannedID;
        logMessage(`**Order ID დასკანერდა:** **${currentItemID}**. ახლა დაასკანერეთ თაროს QR.`, 'info');
    } else if (!currentShelfID) {
        if (scannedID === currentItemID) {
            logMessage("გაფრთხილება: Order ID და თარო ვერ იქნება ერთი და იგივე კოდი. სცადეთ ხელახლა.", 'warning');
            return;
        }
        currentShelfID = scannedID;
        logMessage(`**თაროს QR დასკანერდა:** **${currentShelfID}**. დააჭირეთ 'დამაგრებას'.`, 'info');
        
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
            logMessage("კამერა ჩაირთო. **გთხოვთ, დაასკანეროთ Order ID.**", 'info');
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

// --- მენიუს და ნივთების ლოგიკა (ძიებით) ---

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

// ინვენტარის ჩატვირთვა
async function loadInventory() {
    const viewContainer = document.getElementById('items-view');
    const filterInput = document.getElementById('inventory-filter-input');
    
    // 1. საძიებო ველის შექმნა (თუ არ არსებობს)
    if (!filterInput) {
        const inputHTML = `
            <input type="text" id="inventory-filter-input" placeholder="მოძებნეთ Order ID-ით..." 
                   style="width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px;">
        `;
        // ჩავსვათ ღილაკსა და სია კონტეინერს შორის
        viewContainer.insertBefore(document.createRange().createContextualFragment(inputHTML), inventoryList);
        
        const newFilterInput = document.getElementById('inventory-filter-input');
        
        // დავამატოთ Event Listener ძიებისთვის (keyup)
        newFilterInput.addEventListener('keyup', () => {
            filterInventory(newFilterInput.value);
        });
    }
    
    inventoryList.innerHTML = '<p>ჩატვირთვა...</p>';

    try {
        const snapshot = await db.collection("inventory").orderBy("lastMoved", "desc").get();
        
        if (snapshot.empty) {
            inventoryList.innerHTML = '<p>ჩანაწერები არ მოიძებნა.</p>';
            return;
        }

        // შევინახოთ ყველა ნივთი, რათა შევძლოთ ადგილობრივი ფილტრაცია
        const items = [];
        snapshot.forEach(doc => items.push({ ...doc.data(), docId: doc.id }));
        
        renderInventoryList(items);

    } catch (error) {
        inventoryList.innerHTML = `<p class="message-error">შეცდომა ჩატვირთვისას: ${error.message}</p>`;
        console.error("Error loading inventory: ", error);
    }
}

// სიის გამოტანა (რენდერინგი)
function renderInventoryList(items) {
    const listContainer = document.getElementById('inventory-list');
    listContainer.innerHTML = ''; 
    
    let html = '';
    
    items.forEach(data => {
        // ჩვენ ვვარაუდობთ, რომ Order ID არის "orderID" ველში
        const orderId = data.orderID || 'N/A'; 
        const lastMoved = data.lastMoved ? data.lastMoved.toDate().toLocaleString('ka-GE') : 'N/A';
        
        // ლოგიკა სხვა ნივთების პოვნისთვის (იგივე Order ID-ით)
        const otherItems = items.filter(i => 
            i.orderID === orderId && i.docId !== data.docId
        );

        let statusText = '';
        if (otherItems.length > 0) {
            // უნიკალური თაროების სიის მიღება
            const otherShelves = [...new Set(otherItems.map(i => i.shelfID))].join(', ');
            
            // User-Friendly: გაფრთხილება, თუ სხვა ნივთები სხვაგანაა
            statusText = `<span class="message-warning" style="display:block; padding: 5px; margin-top: 5px; font-size: 0.9em; border-radius: 4px;">
                            ⚠️ Order ID-ის სხვა ნივთები ნაპოვნია თაროებზე: ${otherShelves}
                          </span>`;
        }

        html += `
            <div data-order-id="${orderId}">
                <strong>Order ID:</strong> ${orderId}<br>
                <strong>თარო:</strong> <span style="font-size: 1.1em; color: var(--success-color);">${data.shelfID}</span><br>
                <small>ბოლო განთავსება: ${lastMoved}</small>
                ${statusText}
            </div>
        `;
    });

    listContainer.innerHTML = html;
}

// ძიების ფუნქცია
function filterInventory(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const items = document.querySelectorAll('#inventory-list > div');
    
    items.forEach(item => {
        const orderId = item.getAttribute('data-order-id');
        if (orderId && orderId.toLowerCase().includes(term)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// --- ინიციალიზაცია და ღილაკების დამმუშავებლები ---

saveButton.addEventListener('click', async () => {
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
    loadInventory(); // ჩატვირთვა ყოველთვის, როცა გადავდივართ
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
