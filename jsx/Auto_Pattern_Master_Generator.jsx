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

        for (var i = 0; i < sizes.length; i++) {
            var currentSize = sizes[i];
            var sizeLayer = outputLayer.layers.add();
            sizeLayer.name = "SIZE_" + currentSize;

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

                var targetW = targetPattern.width;
                var targetH = targetPattern.height;

                try {
                    var graphicGroup = dupMaster.groupItems.getByName("Graphics");
                    var bgGroup = dupMaster.groupItems.getByName("Background");
                    
                    var refPath = graphicGroup;
                    if (graphicGroup.clipped && graphicGroup.pageItems.length > 0) {
                        refPath = graphicGroup.pageItems[0]; 
                    }

                    var masterRefH = refPath.height;

                    // 2. Uniform Scale
                    var scaleH_Percent = (targetH / masterRefH) * 100;
                    dupMaster.resize(scaleH_Percent, scaleH_Percent, true, true, true, true, scaleH_Percent, Transformation.CENTER);

                    // 3. Non-Uniform Scale Background Width
                    var currentRefW = refPath.width; 
                    var bgScaleW_Percent = (targetW / currentRefW) * 100;
                    bgGroup.resize(bgScaleW_Percent, 100, true, true, true, true, 100, Transformation.CENTER);

                    // 4. Alignment
                    var targetCX = targetPattern.left + (targetPattern.width / 2);
                    var targetCY = targetPattern.top - (targetPattern.height / 2);
                    var refCX = refPath.left + (refPath.width / 2);
                    var refCY = refPath.top - (refPath.height / 2);

                    dupMaster.translate(targetCX - refCX, targetCY - refCY);

                    var currentBgCX = bgGroup.left + (bgGroup.width / 2);
                    bgGroup.translate(targetCX - currentBgCX, 0);

                } catch (e) {
                    var fallbackScale = (targetH / dupMaster.height) * 100;
                    dupMaster.resize(fallbackScale, fallbackScale, true, true, true, true, fallbackScale, Transformation.CENTER);
                    
                    var tCX = targetPattern.left + (targetPattern.width / 2);
                    var tCY = targetPattern.top - (targetPattern.height / 2);
                    var dCX = dupMaster.left + (dupMaster.width / 2);
                    var dCY = dupMaster.top - (dupMaster.height / 2);
                    dupMaster.translate(tCX - dCX, tCY - dCY);
                }

                // ==========================================
                // ✂️ การทำ Clipping Mask พร้อมใส่เส้น Stroke
                // ==========================================
                var maskPath = targetPattern.duplicate(finalGroup, ElementPlacement.PLACEATBEGINNING);
                maskPath.name = "Mask_" + currentSize;
                
                maskPath.clipping = true;
                finalGroup.clipped = true;

                applyStrokeToItem(maskPath, cutColor, 2);

                successCount++;
            }
        }
        
        var jobType = isBasketball ? "บาสเกตบอล 🏀" : "ฟุตบอล ⚽";
        return "SUCCESS|✅ สร้างแพทเทิร์น " + jobType + " เสร็จสิ้น " + successCount + " ชิ้น";
    } catch (err) {
        return "ERROR|❌ ข้อผิดพลาด: " + err.message;
    }
}