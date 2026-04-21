

// ==========================================
// 📦 1. CORE PAYLOADS (ก้อนคำสั่งที่จะถูกฉีดเข้าเธรดหลัก)
// ==========================================

// ฟังก์ชันสำหรับตั้งชื่อและจัดเข้ากึ่งกลาง
function UPH_RenameAndGather(prefix) {
    var sizes = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
    try {
        // ลบ app.activate(); ออกไปแล้ว เพราะ BridgeTalk รันวงในได้เลยไม่ต้องแย่ง Focus
        var doc = app.documents.length > 0 ? app.activeDocument : null;
        if (!doc) return "ERROR|❌ ไม่พบหน้ากระดาษที่เปิดอยู่";

        var sel = doc.selection;
        if (!sel || sel.length !== sizes.length) {
            return "ERROR|⚠️ ต้องใช้ลูกศรดำเลือกชิ้นงานให้ครบ " + sizes.length + " ชิ้น (คุณเลือก " + (sel ? sel.length : 0) + " ชิ้น)";
        }

        // ฟังก์ชันย่อยคำนวณขอบเขตแบบแม่นยำ
        function getTrueBounds(item) {
            var vb = item.visibleBounds; 
            return { left: vb[0], top: vb[1], right: vb[2], bottom: vb[3], width: vb[2] - vb[0], height: vb[1] - vb[3] };
        }

        var itemsArray = [];
        var modifiedItems = [];
        for (var i = 0; i < sel.length; i++) { itemsArray.push(sel[i]); }
        
        // เรียงจากซ้ายไปขวา
        itemsArray.sort(function(a, b) { return a.left - b.left; });

        // ตั้งชื่อ
        for (var j = 0; j < sizes.length; j++) {
            itemsArray[j].name = prefix + "_" + sizes[j];
            modifiedItems.push(itemsArray[j]);
        }

        // จับมาเรียงชิดติดกัน
        var currentX = 0, currentY = 0;
        for (var k = 0; k < itemsArray.length; k++) {
            var item = itemsArray[k];
            var vb = getTrueBounds(item);
            item.translate(currentX - vb.left, currentY - vb.top);
            currentX += vb.width;
        }

        // หาจุดกึ่งกลางของทั้งกลุ่ม
        var gL = Infinity, gT = -Infinity, gR = -Infinity, gB = Infinity;
        for (var m = 0; m < itemsArray.length; m++) {
            var bounds = getTrueBounds(itemsArray[m]);
            if (bounds.left < gL) gL = bounds.left;
            if (bounds.top > gT) gT = bounds.top;
            if (bounds.right > gR) gR = bounds.right;
            if (bounds.bottom < gB) gB = bounds.bottom;
        }
        var groupCX = gL + (gR - gL) / 2;
        var groupCY = gB + (gT - gB) / 2;

        // หาจุดกึ่งกลาง Artboard
        var abIdx = doc.artboards.getActiveArtboardIndex();
        var abRect = doc.artboards[abIdx].artboardRect;
        var abCX = abRect[0] + (abRect[2] - abRect[0]) / 2;
        var abCY = abRect[1] + (abRect[3] - abRect[1]) / 2;

        // ดึงเข้ากลาง
        var dx = abCX - groupCX;
        var dy = abCY - groupCY;
        for (var n = 0; n < itemsArray.length; n++) {
            itemsArray[n].translate(dx, dy);
        }

        // รีเฟรช Layers
        doc.selection = null; 
        app.redraw();         
        for (var p = 0; p < modifiedItems.length; p++) {
            modifiedItems[p].selected = true; 
        }
        app.redraw(); 
        
        try { app.executeMenuCommand("fitall"); } catch(e){}

        return "SUCCESS|✅ สำเร็จ! เปลี่ยนชื่อ '" + prefix + "' และดึงเข้ากึ่งกลางแล้ว";
    } catch (e) {
        return "ERROR|❌ ขัดข้องระบบภายใน: " + e.message;
    }
}

// ฟังก์ชันสำหรับจัดเรียง Auto Layout
function UPH_AutoLayout(isBasketballStr) {
    var sizes = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
    var isBasketball = (isBasketballStr === 'true'); // แปลง String เป็น Boolean
    try {
        var doc = app.documents.length > 0 ? app.activeDocument : null;
        if (!doc) return "ERROR|❌ ไม่พบหน้ากระดาษ";

        function getTrueBounds(item) {
            var vb = item.visibleBounds; 
            return { left: vb[0], top: vb[1], right: vb[2], bottom: vb[3], width: vb[2] - vb[0], height: vb[1] - vb[3] };
        }

        var gap = 50, sizeGap = 150;  
        var row1Blocks = [], row2Blocks = []; 

        for (var i = 0; i < sizes.length; i++) {
            var sz = sizes[i];
            var front = null, back = null, lSleeve = null, rSleeve = null;

            try { front = doc.pageItems.getByName("TARGET_FRONT_" + sz); } catch(e){}
            try { back = doc.pageItems.getByName("TARGET_BACK_" + sz); } catch(e){}
            
            if (!isBasketball) {
                try { lSleeve = doc.pageItems.getByName("TARGET_LEFT_ARM_" + sz); } catch(e){}
                try { rSleeve = doc.pageItems.getByName("TARGET_RIGHT_ARM_" + sz); } catch(e){}
            }

            if (!front) continue; 

            var fB = getTrueBounds(front);
            var oX = fB.left;
            var oY = fB.top;

            if (back) {
                var bB = getTrueBounds(back);
                back.translate((oX + fB.width + gap) - bB.left, oY - bB.top);
            }
            if (rSleeve && !isBasketball) {
                var rsB = getTrueBounds(rSleeve);
                rSleeve.translate((oX + (fB.width/2) - (rsB.width/2)) - rsB.left, (oY - fB.height - gap) - rsB.top);
            }
            if (back && lSleeve && !isBasketball) {
                var bB2 = getTrueBounds(back); 
                var lsB = getTrueBounds(lSleeve);
                lSleeve.translate((bB2.left + (bB2.width/2) - (lsB.width/2)) - lsB.left, (oY - fB.height - gap) - lsB.top);
            }

            var blockItems = [front];
            if(back) blockItems.push(back);
            if(rSleeve && !isBasketball) blockItems.push(rSleeve);
            if(lSleeve && !isBasketball) blockItems.push(lSleeve);

            var bL = Infinity, bT = -Infinity, bR = -Infinity, bBtm = Infinity;
            for(var k=0; k<blockItems.length; k++){
                var tb = getTrueBounds(blockItems[k]);
                if(tb.left < bL) bL = tb.left;
                if(tb.top > bT) bT = tb.top;
                if(tb.right > bR) bR = tb.right;
                if(tb.bottom < bBtm) bBtm = tb.bottom;
            }

            var blockObj = {
                items: blockItems,
                bounds: { left: bL, top: bT, right: bR, bottom: bBtm, width: bR - bL, height: bT - bBtm }
            };

            if (i < 4) row1Blocks.push(blockObj);
            else row2Blocks.push(blockObj);
        }

        var allBlocks = row1Blocks.concat(row2Blocks);
        if (allBlocks.length === 0) {
            return "ERROR|⚠️ ไม่พบชิ้นส่วน! คุณลืมตั้งชื่อเลเยอร์หรือเปล่า?";
        }

        var startX = 0, startY = 0, maxRow1H = 0;

        for (var r1 = 0; r1 < row1Blocks.length; r1++) {
            var blk1 = row1Blocks[r1];
            var dX = startX - blk1.bounds.left;
            var dY = startY - blk1.bounds.top;
            for(var m1 = 0; m1 < blk1.items.length; m1++) { blk1.items[m1].translate(dX, dY); }
            
            startX += blk1.bounds.width + sizeGap;
            if (blk1.bounds.height > maxRow1H) maxRow1H = blk1.bounds.height;
        }

        startX = 0;
        startY = startY - maxRow1H - 200; 
        for (var r2 = 0; r2 < row2Blocks.length; r2++) {
            var blk2 = row2Blocks[r2];
            var dX2 = startX - blk2.bounds.left;
            var dY2 = startY - blk2.bounds.top;
            for(var m2 = 0; m2 < blk2.items.length; m2++) { blk2.items[m2].translate(dX2, dY2); }
            
            startX += blk2.bounds.width + sizeGap;
        }

        var gL = Infinity, gT = -Infinity, gR = -Infinity, gB = Infinity;
        for(var a = 0; a < allBlocks.length; a++){
            for(var b = 0; b < allBlocks[a].items.length; b++){
                var ftb = getTrueBounds(allBlocks[a].items[b]);
                if(ftb.left < gL) gL = ftb.left;
                if(ftb.top > gT) gT = ftb.top;
                if(ftb.right > gR) gR = ftb.right;
                if(ftb.bottom < gB) gB = ftb.bottom;
            }
        }

        var gridCX = gL + (gR - gL) / 2;
        var gridCY = gB + (gT - gB) / 2;

        var abIdx = doc.artboards.getActiveArtboardIndex();
        var abRect = doc.artboards[abIdx].artboardRect;
        var abCX = abRect[0] + (abRect[2] - abRect[0]) / 2;
        var abCY = abRect[1] + (abRect[3] - abRect[1]) / 2;

        var finalDx = abCX - gridCX;
        var finalDy = abCY - gridCY;

        for(var a2 = 0; a2 < allBlocks.length; a2++){
            for(var b2 = 0; b2 < allBlocks[a2].items.length; b2++){
                allBlocks[a2].items[b2].translate(finalDx, finalDy);
            }
        }

        doc.selection = null; 
        app.redraw(); 
        try { app.executeMenuCommand("fitall"); } catch(e){} 

        var jobType = isBasketball ? "บาสเกตบอล 🏀" : "ฟุตบอล ⚽";
        return "SUCCESS|✨ จัดระเบียบ " + jobType + " และวางตรงกลางหน้ากระดาษสำเร็จ!";
    } catch (e) {
        return "ERROR|❌ จัดเรียงล้มเหลว: " + e.message;
    }
}
