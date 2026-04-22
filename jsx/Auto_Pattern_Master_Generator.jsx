function generatePatterns(isBasketballStr) {
    var isBasketball = (isBasketballStr === 'true');
    try {
        if (app.documents.length === 0) {
            return "ERROR|❌ กรุณาเปิดไฟล์ก่อนครับ";
        }
        var doc = app.activeDocument;

        var sizes = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
        
        // 🌟 กำหนด Mapping ชิ้นส่วนตามประเภทเสื้อที่เลือก
        var partMapping = {};
        if (isBasketball) {
            partMapping = {
                "Front_Panel": "TARGET_FRONT",
                "Back_Panel": "TARGET_BACK"
            };
        } else {
            partMapping = {
                "Front_Panel": "TARGET_FRONT",
                "Back_Panel": "TARGET_BACK",
                "Left_Sleeve": "TARGET_LEFT_ARM",
                "Right_Sleeve": "TARGET_RIGHT_ARM"
            };
        }

        var outputLayer;
        try { outputLayer = doc.layers.getByName("OUTPUT_PRODUCTION"); }
        catch (e) { outputLayer = doc.layers.add(); outputLayer.name = "OUTPUT_PRODUCTION"; }

        var successCount = 0;
        
        // ตั้งสีเส้นขอบเป็นสีดำ 100%
        var cutColor = new CMYKColor();
        cutColor.cyan = 0; cutColor.magenta = 0; cutColor.yellow = 0; cutColor.black = 100;

        // ฟังก์ชันใส่เส้นขอบ (อัปเดตให้เสถียรขึ้น)
        function applyStrokeToItem(item, color, weight) {
            if (item.typename === "PathItem") {
                item.filled = false; item.stroked = true; item.strokeWidth = weight; item.strokeColor = color;
            } else if (item.typename === "CompoundPathItem" && item.pathItems.length > 0) {
                for (var p = 0; p < item.pathItems.length; p++) {
                    item.pathItems[p].filled = false; 
                    item.pathItems[p].stroked = true; 
                    item.pathItems[p].strokeWidth = weight; 
                    item.pathItems[p].strokeColor = color;
                }
            } else if (item.typename === "GroupItem") {
                for (var k = 0; k < item.pageItems.length; k++) {
                    applyStrokeToItem(item.pageItems[k], color, weight);
                }
            }
        }

        // ฟังก์ชันค้นหาและเปลี่ยน Text ป้ายไซส์
        function findAndReplaceSizeText(group, newSizeStr) {
            for (var i = 0; i < group.pageItems.length; i++) {
                var item = group.pageItems[i];
                if (item.typename === "TextFrame" && item.name === "SizeText") {
                    item.contents = newSizeStr;
                } else if (item.typename === "GroupItem") {
                    findAndReplaceSizeText(item, newSizeStr);
                }
            }
        }

        // ฟังก์ชันหาหน้ากากหลัก (Direct DOM Targeting — ไม่ใช้ Recursive)
        // โครงสร้าง: Background (Group) -> <Clip Group> -> <Clipping Path> (index 0 เสมอ)
        function getMainMaskBounds(bgGroup) {
            try {
                // วนลูปหา Clip Group ที่เป็นลูกสายตรงของ Background
                for (var i = 0; i < bgGroup.groupItems.length; i++) {
                    var childGroup = bgGroup.groupItems[i];
                    // เช็คว่า Group นี้ถูก Clip ไว้หรือไม่
                    if (childGroup.clipped === true) {
                        // หน้ากากหลักจะอยู่ตำแหน่ง index 0 ของ Clip Group เสมอ!
                        var maskItem = childGroup.pageItems[0];
                        $.writeln('getMainMaskBounds -> Found Clip Group: ' + childGroup.name + ', Mask: ' + maskItem.name + ', Bounds: ' + maskItem.geometricBounds);
                        return maskItem.geometricBounds;
                    }
                }
            } catch (e) {
                $.writeln('getMainMaskBounds Error: ' + e.message);
            }
            return null; // ถ้าหาไม่เจอจริงๆ ค่อย return null
        }

        for (var i = 0; i < sizes.length; i++) {
            var currentSize = sizes[i];
            var sizeLayer = outputLayer.layers.add();
            sizeLayer.name = "SIZE_" + currentSize;

            var bL = Infinity, bT = -Infinity, bR = -Infinity, bB = Infinity;

            for (var masterName in partMapping) {
                var targetNameBase = partMapping[masterName];
                var targetFullName = targetNameBase + "_" + currentSize;

                var masterArtGroup, targetPattern;
                try { masterArtGroup = doc.pageItems.getByName(masterName); } catch (e) { continue; }
                try { targetPattern = doc.pageItems.getByName(targetFullName); } catch (e) { continue; }

                var finalGroup = sizeLayer.groupItems.add();
                finalGroup.name = masterName + "_" + currentSize;

                var dupMaster = masterArtGroup.duplicate(finalGroup, ElementPlacement.PLACEATBEGINNING);
                dupMaster.name = "Artwork";

                // ==========================================
                // 🏷️ อัปเดต Text ป้ายกำกับไซส์ (แก้ไขเพิ่มระบบ Z และ K)
                // ==========================================
                var sizeLabelToPrint = currentSize; // ค่าเริ่มต้นคือไซส์ปกติ (เช่น M)
                
                if (masterName === "Left_Sleeve") {
                    sizeLabelToPrint = currentSize + "-Z"; // แขนซ้าย เติม -Z
                } else if (masterName === "Right_Sleeve") {
                    sizeLabelToPrint = currentSize + "-K"; // แขนขวา เติม -K
                }
                
                findAndReplaceSizeText(dupMaster, sizeLabelToPrint);
                // ==========================================

                var targetBounds = targetPattern.geometricBounds;
                var targetW = targetBounds[2] - targetBounds[0];
                var targetH = targetBounds[1] - targetBounds[3];

                try {
                    var graphicGroup = dupMaster.groupItems.getByName("Graphics");
                    var bgGroup = dupMaster.groupItems.getByName("Background");

                    // ดึงขนาด Master จาก Background Mask (แม่นยำ 100%)
                    var masterRefBounds = getMainMaskBounds(bgGroup) || bgGroup.visibleBounds;
                    var masterRefH = masterRefBounds[1] - masterRefBounds[3];
                    var masterRefW = masterRefBounds[2] - masterRefBounds[0];

                    // === STEP 1: Uniform Scale ===
                    var scaleH_Percent = (targetH / masterRefH) * 100;
                    dupMaster.resize(scaleH_Percent, scaleH_Percent, true, true, true, true, scaleH_Percent, Transformation.CENTER);

                    // === STEP 2: Non-Uniform Scale Background Width ===
                    var bgScaleW_Percent = (targetW / masterRefW) * 100;
                    bgGroup.resize(bgScaleW_Percent, 100, true, true, true, true, 100, Transformation.CENTER);

                    // === STEP 3: ALIGNMENT (ลำดับเคร่งครัด — ห้ามสลับ!) ===
                    // 3.1 — บังคับเคลียร์แคช Illustrator ทันทีหลัง Scale เสร็จ
                    app.redraw();

                    // 3.2 — ดึง Background Mask bounds ใหม่สด (หลัง redraw แล้ว!)
                    var sourceBg = dupMaster.groupItems.getByName("Background");
                    var sourceBounds = getMainMaskBounds(sourceBg);

                    // ตรวจสอบว่าหาหน้ากากเจอหรือไม่ ถ้าไม่เจอให้ฟ้องผู้ใช้ทันที ห้ามเงียบ!
                    if (!sourceBounds) {
                        alert('CRITICAL ERROR: \u0e44\u0e21\u0e48\u0e1e\u0e1a Clipping Mask \u0e2b\u0e25\u0e31\u0e01\u0e43\u0e19\u0e42\u0e1f\u0e25\u0e40\u0e14\u0e2d\u0e23\u0e4c Background \u0e02\u0e2d\u0e07\u0e0a\u0e34\u0e49\u0e19\u0e2a\u0e48\u0e27\u0e19 "' + masterName + '"! \u0e23\u0e30\u0e1a\u0e1a\u0e01\u0e33\u0e25\u0e31\u0e07\u0e43\u0e0a\u0e49\u0e04\u0e48\u0e32 Fallback \u0e0b\u0e36\u0e48\u0e07\u0e2d\u0e32\u0e08\u0e17\u0e33\u0e43\u0e2b\u0e49\u0e15\u0e33\u0e41\u0e2b\u0e19\u0e48\u0e07\u0e04\u0e25\u0e32\u0e14\u0e40\u0e04\u0e25\u0e37\u0e48\u0e2d\u0e19');
                        sourceBounds = sourceBg.visibleBounds;
                    }
                    $.writeln('Source BG Mask Bounds (after redraw): ' + sourceBounds);

                    // 3.3 — คำนวณ Target Center
                    var targetCenterX = (targetBounds[0] + targetBounds[2]) / 2;
                    var targetCenterY = (targetBounds[1] + targetBounds[3]) / 2;

                    // 3.4 — คำนวณ Source Center
                    var sourceCenterX = (sourceBounds[0] + sourceBounds[2]) / 2;
                    var sourceCenterY = (sourceBounds[1] + sourceBounds[3]) / 2;

                    // 3.5 — คำนวณ Delta
                    var deltaX = targetCenterX - sourceCenterX;
                    var deltaY = targetCenterY - sourceCenterY;
                    $.writeln('Calculated Delta: ' + deltaX + ', ' + deltaY);

                    // 3.6 — ย้ายชิ้นงานทั้งหมดไปยังตำแหน่งเป้าหมาย
                    dupMaster.translate(deltaX, deltaY);

                    // === STEP 4: จัดศูนย์ Background แกน X ===
                    app.redraw();
                    var updatedBgBounds = getMainMaskBounds(dupMaster.groupItems.getByName("Background"));
                    if (!updatedBgBounds) updatedBgBounds = dupMaster.groupItems.getByName("Background").visibleBounds;
                    var currentBgCX = (updatedBgBounds[0] + updatedBgBounds[2]) / 2;
                    bgGroup.translate(targetCenterX - currentBgCX, 0);
                    
                    var targetCX = targetCenterX; // for cuff lock below

                    // ==========================================
                    // 🛡️ ระบบล็อคสัดส่วนปลายแขน (Cuff Lock)
                    // ==========================================
                    if (masterName === "Left_Sleeve" || masterName === "Right_Sleeve") {
                        try {
                            app.redraw();
                            var cuffGroup = dupMaster.groupItems.getByName("Cuff");
                            
                            // 1. ล็อคความสูง (Height) ไว้ที่ 2 นิ้ว (144 points) พอดี
                            var targetCuffH = 144;
                            var cuffScaleH = (targetCuffH / cuffGroup.height) * 100;
                            
                            // 2. ขยายความกว้าง (Width) ตามสัดส่วนหน้าต่าง
                            var cuffScaleW = bgScaleW_Percent;
                            
                            // 3. สั่ง Resize โดยอ้างอิงตำแหน่งด้านล่าง
                            cuffGroup.resize(cuffScaleW, cuffScaleH, true, true, true, true, 100, Transformation.BOTTOM);
                            
                            // 4. จัดตำแหน่งกึ่งกลางแนวแกน X ใหม่
                            app.redraw();
                            var currentCuffCX = cuffGroup.left + (cuffGroup.width / 2);
                            cuffGroup.translate(targetCX - currentCuffCX, 0);
                            
                        } catch (eCuff) {
                            // ถ้าเลเยอร์นี้ไม่มี Cuff ก็ให้ทำงานผ่านไปตามปกติ
                        }
                    }

                } catch (e) {
                    // Fallback: ไม่มี Graphics/Background — ใช้ bounds ของ dupMaster ตรงๆ
                    var fallbackScale = (targetH / dupMaster.height) * 100;
                    dupMaster.resize(fallbackScale, fallbackScale, true, true, true, true, fallbackScale, Transformation.CENTER);
                    
                    // บังคับเคลียร์แคชก่อนดึงค่า bounds
                    app.redraw();
                    
                    // ดึง bounds ใหม่สดหลัง redraw - ใช้ Direct DOM Targeting
                    var fbSourceBounds;
                    try {
                        var fbBg = dupMaster.groupItems.getByName("Background");
                        fbSourceBounds = getMainMaskBounds(fbBg);
                        if (!fbSourceBounds) {
                            alert('CRITICAL ERROR: \u0e44\u0e21\u0e48\u0e1e\u0e1a Clipping Mask \u0e2b\u0e25\u0e31\u0e01\u0e43\u0e19\u0e42\u0e1f\u0e25\u0e40\u0e14\u0e2d\u0e23\u0e4c Background (Fallback Mode)! \u0e23\u0e30\u0e1a\u0e1a\u0e01\u0e33\u0e25\u0e31\u0e07\u0e43\u0e0a\u0e49\u0e04\u0e48\u0e32 visibleBounds \u0e0b\u0e36\u0e48\u0e07\u0e2d\u0e32\u0e08\u0e17\u0e33\u0e43\u0e2b\u0e49\u0e15\u0e33\u0e41\u0e2b\u0e19\u0e48\u0e07\u0e04\u0e25\u0e32\u0e14\u0e40\u0e04\u0e25\u0e37\u0e48\u0e2d\u0e19');
                            fbSourceBounds = fbBg.visibleBounds;
                        }
                    } catch (eBg) {
                        fbSourceBounds = dupMaster.geometricBounds;
                    }

                    var fbTargetCX = (targetBounds[0] + targetBounds[2]) / 2;
                    var fbTargetCY = (targetBounds[1] + targetBounds[3]) / 2;
                    var fbSourceCX = (fbSourceBounds[0] + fbSourceBounds[2]) / 2;
                    var fbSourceCY = (fbSourceBounds[1] + fbSourceBounds[3]) / 2;
                    
                    dupMaster.translate(fbTargetCX - fbSourceCX, fbTargetCY - fbSourceCY);
                }

                // ==========================================
                // ✂️ การทำ Clipping Mask พร้อมใส่เส้น Stroke
                // ==========================================
                var maskPath = targetPattern.duplicate(finalGroup, ElementPlacement.PLACEATBEGINNING);
                maskPath.name = "Mask_" + currentSize;
                
                maskPath.clipping = true;
                finalGroup.clipped = true;

                applyStrokeToItem(maskPath, cutColor, 2);

                var mb = maskPath.visibleBounds;
                if (mb[0] < bL) bL = mb[0];
                if (mb[1] > bT) bT = mb[1];
                if (mb[2] > bR) bR = mb[2];
                if (mb[3] < bB) bB = mb[3];

                successCount++;
            }

            if (bL !== Infinity) {
                var newRect = [bL - 15, bT + 15, bR + 15, bB - 15];
                var newAB = doc.artboards.add(newRect);
                newAB.name = "SIZE_" + currentSize;
            }
        }
        
        var jobType = isBasketball ? "บาสเกตบอล 🏀" : "ฟุตบอล ⚽";
        return "SUCCESS|✅ สร้างแพทเทิร์น " + jobType + " เสร็จสิ้น " + successCount + " ชิ้น";
    } catch (err) {
        return "ERROR|❌ ข้อผิดพลาด: " + err.message;
    }
}