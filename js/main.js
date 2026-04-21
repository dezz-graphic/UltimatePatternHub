const csInterface = new CSInterface();
const statusText = document.getElementById('status-text');

// ==========================================
// 0. DRM System (Hardware Lock)
// ==========================================
const os = require('os');
const crypto = require('crypto');

function getMachineID() {
    const interfaces = os.networkInterfaces();
    let macAddress = "UNKNOWN-MAC";
    for (let name of Object.keys(interfaces)) {
        for (let net of interfaces[name]) {
            if (net.mac && net.mac !== '00:00:00:00:00:00' && !net.internal) {
                macAddress = net.mac;
                break;
            }
        }
        if (macAddress !== "UNKNOWN-MAC") break;
    }
    // Clean MAC to standard format
    return macAddress.toUpperCase().replace(/:/g, '-');
}

function generateExpectedKey(machineID) {
    const secretSalt = "DEZZ_MASTER_KEY_2024";
    const hash = crypto.createHash('md5').update(machineID + secretSalt).digest('hex');
    // Expected Key Format: DEZZ-XXXX-XXXX
    return `DEZZ-${hash.substring(0,4).toUpperCase()}-${hash.substring(4,8).toUpperCase()}`;
}

const lockScreenOverlay = document.getElementById('lock-screen-overlay');
const machineIdDisplay = document.getElementById('machine-id-display');
const licenseInput = document.getElementById('license-key-input');
const btnUnlock = document.getElementById('btn-unlock');
const errorMsg = document.getElementById('drm-error-msg');

const machineID = getMachineID();
machineIdDisplay.value = machineID;
const expectedKey = generateExpectedKey(machineID);

// 💡 Secret Log for you to see the key:
console.log("Expected License Key for this machine: " + expectedKey);

// 1. เช็ก localStorage เมื่อ Extension เริ่มทำงาน (Init)
if (localStorage.getItem('ultimate_pattern_license') === 'true') {
    // ถ้ามี License แล้ว ซ่อนหน้าต่างทันที และเริ่มต้นระบบ
    lockScreenOverlay.style.display = 'none';
    initCoreLogic();
} else {
    // ถ้ายังไม่มี License ปล่อยหน้าต่างไว้และยังไม่รันฟังก์ชันหลัก
    lockScreenOverlay.style.display = 'flex';
}

// 2. เมื่อผู้ใช้กดปุ่ม Unlock
btnUnlock.addEventListener('click', () => {
    const inputKey = licenseInput.value.trim();
    
    // ตรวจสอบกับรหัสที่ได้จากสมการ
    if (inputKey === expectedKey) {
        // ถ้ารหัสถูกต้อง บันทึก 'true' ลงใน localStorage
        localStorage.setItem('ultimate_pattern_license', 'true');
        
        // ซ่อนหน้าจอ Lock
        lockScreenOverlay.style.display = 'none';
        setStatus("✅ License verified successfully!", "success");
        
        // เริ่มต้นฟังก์ชันหลัก
        initCoreLogic();
    } else {
        // ถ้ารหัสผิด
        errorMsg.textContent = "❌ Invalid License Key. Please try again.";
        licenseInput.value = "";
    }
});

// 3. ปุ่มติดต่อเพื่อขอรับ License
const btnContactDezz = document.getElementById('btn-contact-dezz');
if (btnContactDezz) {
    btnContactDezz.addEventListener('click', () => {
        require('child_process').exec('start "" "https://sites.google.com/view/dezz-bio/"');
    });
}

// Utility to set status
function setStatus(msg, type = '') {
    statusText.textContent = msg;
    statusText.className = '';
    if (type) statusText.classList.add(`status-${type}`);
}

// Function to call JSX logic
function evalScript(scriptStr) {
    setStatus("⏳ กำลังประมวลผล...", "busy");
    
    // Check if we need to call with arguments or just variable assignment
    csInterface.evalScript(scriptStr, (res) => {
        if (!res || res === "EvalScript error.") {
            setStatus("❌ เกิดข้อผิดพลาดในการเชื่อมต่อกับ Illustrator", "error");
            return;
        }

        const parts = res.split('|');
        const status = parts[0];
        const message = parts.length > 1 ? parts[1] : res;

        if (status === 'SUCCESS') {
            setStatus(message, "success");
        } else if (status === 'ERROR') {
            setStatus(message, "error");
        } else {
            setStatus(res, "warning");
        }
    });
}

// ฟังก์ชันหลัก จะถูกเรียกใช้เมื่อ License ผ่านแล้วเท่านั้น
function initCoreLogic() {
    // ==========================================
    // 1. Renamer & Layout
    // ==========================================
    document.getElementById('btn-rename-front').addEventListener('click', () => {
        evalScript(`UPH_RenameAndGather('TARGET_FRONT')`);
    });
    document.getElementById('btn-rename-back').addEventListener('click', () => {
        evalScript(`UPH_RenameAndGather('TARGET_BACK')`);
    });
    document.getElementById('btn-rename-left').addEventListener('click', () => {
        evalScript(`UPH_RenameAndGather('TARGET_LEFT_ARM')`);
    });
    document.getElementById('btn-rename-right').addEventListener('click', () => {
        evalScript(`UPH_RenameAndGather('TARGET_RIGHT_ARM')`);
    });

    document.getElementById('btn-layout-football').addEventListener('click', () => {
        evalScript(`UPH_AutoLayout('false')`);
    });
    document.getElementById('btn-layout-basketball').addEventListener('click', () => {
        evalScript(`UPH_AutoLayout('true')`);
    });

    // ==========================================
    // 2. Smart Tagger
    // ==========================================
    const tagButtons = document.querySelectorAll('.btn-tag');
    tagButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tagName = e.target.getAttribute('data-tag');
            evalScript(`applyNameToSelection('${tagName}')`);
        });
    });

    // ==========================================
    // 3. Auto Pattern Master
    // ==========================================
    document.getElementById('btn-pattern-football').addEventListener('click', () => {
        evalScript(`generatePatterns('false')`);
    });
    document.getElementById('btn-pattern-basketball').addEventListener('click', () => {
        evalScript(`generatePatterns('true')`);
    });

    // ==========================================
    // 4. VDP Exporter
    // ==========================================
    document.getElementById('btn-export-tiff').addEventListener('click', () => {
        evalScript(`runVDP('true')`);
    });
    document.getElementById('btn-export-jpg').addEventListener('click', () => {
        evalScript(`runVDP('false')`);
    });

    // ==========================================
    // 5. Branding / Links & Modal
    // ==========================================
    const modal = document.getElementById('dezz-modal');
    const btnVisit = document.getElementById('modal-btn-visit');
    const btnCancel = document.getElementById('modal-btn-cancel');

    document.getElementById('dezz-bio-link').addEventListener('click', (e) => {
        e.preventDefault();
        modal.classList.add('active');
    });

    btnCancel.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    btnVisit.addEventListener('click', () => {
        require('child_process').exec('start "" "https://sites.google.com/view/dezz-bio/"');
        modal.classList.remove('active');
    });
}

// Setup Adobe theme handling (Optional, but makes it look native)
function updateThemeWithAppSkinInfo(appSkinInfo) {
    const theme = appSkinInfo.panelBackgroundColor.color;
    const isDark = theme.red < 128;
    document.body.style.backgroundColor = isDark ? '#323232' : '#f0f0f0';
    document.body.style.color = isDark ? '#e0e0e0' : '#333333';
}

csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, () => {
    updateThemeWithAppSkinInfo(csInterface.getHostEnvironment().appSkinInfo);
});
updateThemeWithAppSkinInfo(csInterface.getHostEnvironment().appSkinInfo);
