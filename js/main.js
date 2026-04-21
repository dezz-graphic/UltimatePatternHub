const csInterface = new CSInterface();
const statusText = document.getElementById('status-text');

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
    csInterface.openURLInDefaultBrowser("https://sites.google.com/view/dezz-bio/");
    modal.classList.remove('active');
});

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
