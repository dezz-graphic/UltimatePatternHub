function runVDP(exportModeStr) {
    var isPDF = (exportModeStr === 'pdf');
    var isTIFF = (exportModeStr === 'tiff' || exportModeStr === 'true');
    var isJPG = (exportModeStr === 'jpg' || exportModeStr === 'false');
    try {
        if (app.documents.length === 0) {
            return "ERROR|❌ กรุณาเปิดไฟล์ก่อนรันสคริปต์ครับ";
        }
        var doc = app.activeDocument;

        // --- ฟังก์ชันช่วยเหลือ ---
        function applyStroke(item, color, weight) {
            try {
                if (item.typename === "PathItem") {
                    item.filled = false; item.stroked = true; item.strokeWidth = weight; item.strokeColor = color;
                } else if (item.typename === "CompoundPathItem") {
                    for (var p = 0; p < item.pathItems.length; p++) {
                        item.pathItems[p].filled = false; item.pathItems[p].stroked = true; 
                        item.pathItems[p].strokeWidth = weight; item.pathItems[p].strokeColor = color;
                    }
                } else if (item.typename === "GroupItem") {
                    for (var k = 0; k < item.pageItems.length; k++) { applyStroke(item.pageItems[k], color, weight); }
                }
            } catch(e) {}
        }

        function replaceSizeText(group, str) {
            for (var i = 0; i < group.pageItems.length; i++) {
                var item = group.pageItems[i];
                if (item.typename === "TextFrame" && item.name === "SizeText") { 
                    item.contents = str; 
                } else if (item.typename === "GroupItem") { replaceSizeText(item, str); }
            }
        }

        function updateVDP(group, pName, pNum) {
            for (var i = group.pageItems.length - 1; i >= 0; i--) {
                var item = group.pageItems[i];
                if (item.typename === "TextFrame") {
                    if (item.name === "VDP_NAME") {
                        if (pName) item.contents = pName;
                        else try { item.remove(); } catch(e) { item.hidden = true; }
                    } else if (item.name === "VDP_NUMBER") {
                        if (pNum) item.contents = pNum;
                        else try { item.remove(); } catch(e) { item.hidden = true; }
                    }
                } else if (item.typename === "GroupItem") { updateVDP(item, pName, pNum); }
            }
        }

        function cleanName(n) { return n.replace(/[\\\/\:\*\?\"\<\>\|]/g, "_"); }

        var csvFile = File.openDialog("📋 เลือกไฟล์รายชื่อ CSV", "*.csv");
        if (!csvFile) return "ERROR|⚠️ ยกเลิกการเลือกไฟล์ CSV";
        
        var formatName = isPDF ? "PDF (Print Ready)" : (isTIFF ? "TIFF (CMYK)" : "JPG (RGB)");
        var outFolder = Folder.selectDialog("📁 เลือกโฟลเดอร์สำหรับเซฟ " + formatName);
        if (!outFolder) return "ERROR|⚠️ ยกเลิกการเลือกโฟลเดอร์";

        csvFile.open("r");
        var lines = csvFile.read().split('\n');
        csvFile.close();

        var successCount = 0;
        var errLogs = [];
        var cutC = new CMYKColor();
        cutC.cyan=0; cutC.magenta=0; cutC.yellow=0; cutC.black=100;

        var mainAB = doc.artboards[0];
        var origRect = mainAB.artboardRect;

        // สคริปต์จะพยายามหาครบทั้ง 4 ชิ้น ถ้าหาชิ้นไหนไม่เจอ (เช่นแขนเสื้อ) มันจะข้ามไปเองอย่างฉลาด!
        var parts = {
            "Front_Panel": "TARGET_FRONT",
            "Back_Panel": "TARGET_BACK",
            "Left_Sleeve": "TARGET_LEFT_ARM",
            "Right_Sleeve": "TARGET_RIGHT_ARM"
        };

        var fileCounter = 1;
        for (var r = 1; r < lines.length; r++) {
            var line = lines[r];
            if (line.replace(/\s/g, '') === "") continue;
            var data = line.split(',');
            if (data.length === 0) continue;

            var pName = "", pNum = "", pSize = "";
            if (data.length >= 3) {
                pName = data[0].replace(/^\s+|\s+$/g, '');
                pNum = data[1].replace(/^\s+|\s+$/g, '');
                pSize = data[2].replace(/^\s+|\s+$/g, '').toUpperCase();
            } else if (data.length === 2) {
                pName = data[0].replace(/^\s+|\s+$/g, '');
                pSize = data[1].replace(/^\s+|\s+$/g, '').toUpperCase();
            } else if (data.length === 1) {
                pSize = data[0].replace(/^\s+|\s+$/g, '').toUpperCase();
            }
            if (!pSize) continue; 

            var tempGrp = null;

            try {
                tempGrp = doc.groupItems.add();
                tempGrp.name = "TEMP_" + pNum + "_" + pName;

                var bL = Infinity, bT = -Infinity, bR = -Infinity, bB = Infinity;
                var partsFoundCount = 0;

                for (var mName in parts) {
                    var tName = parts[mName] + "_" + pSize;
                    var mArt, tPat;
                    try { 
                        mArt = doc.pageItems.getByName(mName); 
                        tPat = doc.pageItems.getByName(tName); 
                    } catch (e) { 
                        // 🏀 ถ้าหาไม่เจอ (เช่น เป็นเสื้อบาส ไม่มีแขน) ให้ข้ามชิ้นนี้ไปอย่างแนบเนียน
                        continue; 
                    }

                    partsFoundCount++;
                    var isSlv = (mName.indexOf("Sleeve") !== -1);
                    var fGrp = tempGrp.groupItems.add();
                    var dupM = mArt.duplicate(fGrp, ElementPlacement.PLACEATBEGINNING);
                    
                    updateVDP(dupM, pName, pNum);
                    
                    var lbl = pSize;
                    if (mName === "Right_Sleeve") lbl = pSize + "-K";
                    else if (mName === "Left_Sleeve") lbl = pSize + "-Z";
                    replaceSizeText(dupM, lbl);

                    var tW = tPat.width;
                    var tH = tPat.height;
                    var tCX = tPat.left + (tPat.width / 2);

                    try {
                        var gGrp = dupM.groupItems.getByName("Graphics");
                        var bGrp = dupM.groupItems.getByName("Background");
                        var refP = (gGrp.clipped && gGrp.pageItems.length > 0) ? gGrp.pageItems[0] : gGrp;

                        var scale = (tH / refP.height) * 100;
                        var tMode = isSlv ? Transformation.BOTTOM : Transformation.CENTER;
                        dupM.resize(scale, scale, true, true, true, true, scale, tMode);

                        var refW = refP.width;
                        bGrp.resize((tW / refW) * 100, 100, true, true, true, true, 100, tMode);

                        if (isSlv) {
                            try {
                                var cGrp = dupM.groupItems.getByName("Cuff");
                                cGrp.resize((tW / refW)*100, (144 / cGrp.height)*100, true, true, true, true, 100, Transformation.BOTTOM);
                            } catch(e) {}
                        }

                        var rCX = refP.left + (refP.width / 2);
                        var dX = tCX - rCX;
                        var dY = isSlv ? ((tPat.top - tPat.height) - (refP.top - refP.height)) : ((tPat.top - tPat.height/2) - (refP.top - refP.height/2));
                        dupM.translate(dX, dY);

                        var bgCX = bGrp.left + (bGrp.width / 2);
                        bGrp.translate(tCX - bgCX, 0);

                        if (isSlv) {
                            try {
                                var cGrp2 = dupM.groupItems.getByName("Cuff");
                                cGrp2.translate(tCX - (cGrp2.left + cGrp2.width/2), 0);
                                cGrp2.translate(0, (tPat.top - tPat.height) - (cGrp2.top - cGrp2.height));
                            } catch(e) {}
                        }
                    } catch (e) {
                        var fb = (tH / dupM.height) * 100;
                        dupM.resize(fb, fb, true, true, true, true, fb, Transformation.CENTER);
                    }

                    var mask = tPat.duplicate(fGrp, ElementPlacement.PLACEATBEGINNING);
                    mask.clipping = true;
                    fGrp.clipped = true;
                    applyStroke(mask, cutC, 2);

                    var mb = mask.visibleBounds; 
                    if (mb[0] < bL) bL = mb[0];
                    if (mb[1] > bT) bT = mb[1];
                    if (mb[2] > bR) bR = mb[2];
                    if (mb[3] < bB) bB = mb[3];
                }

                if (partsFoundCount === 0 || bL === Infinity) {
                    throw new Error("ไม่พบชิ้นส่วน หรือลืมตั้งชื่อเลเยอร์");
                }

                // --- 📏 สร้าง Artboard ขอบ 0.1 นิ้ว (7.2 pt) ตามของที่มีจริง ---
                var pad = 7.2;
                mainAB.artboardRect = [bL - pad, bT + pad, bR + pad, bB - pad];
                
                // --- 🎯 บังคับเลือก Active Artboard ให้ตรงกับไซส์ที่กำลังจะ Export (ป้องกันการติดขอบขาว) ---
                doc.artboards.setActiveArtboardIndex(0);

                // --- 💾 Export ตามสกุลไฟล์ที่เลือก ---
                var seqStr = ("000" + fileCounter).slice(-3);
                var fNameBase = "";
                if (!pName && !pNum) {
                    fNameBase = "Item-" + seqStr;
                } else if (pNum && !pName) {
                    fNameBase = seqStr + "_#" + pNum;
                } else if (!pNum && pName) {
                    fNameBase = seqStr + "_" + cleanName(pName);
                } else if (pNum && pName) {
                    fNameBase = seqStr + "_#" + pNum + "_" + cleanName(pName);
                }
                
                var ext = isPDF ? ".pdf" : (isTIFF ? ".tif" : ".jpg");
                var fName = fNameBase + "_SIZE-" + pSize + ext;
                var dFile = new File(outFolder.fsName + "/" + fName);

                if (isPDF) {
                    var pdfOpts = new PDFSaveOptions();
                    
                    // 3. ตั้งค่า PDF ให้ครอบคลุมการมองเห็น
                    pdfOpts.artboardRange = "1";
                    pdfOpts.preserveEditability = false; // ปิดการแก้ไข เพื่อให้ไฟล์เล็กสุดๆ
                    pdfOpts.optimization = true;
                    pdfOpts.compressArt = true;

                    try {
                        // เพื่อป้องกัน doc.saveAs เปลี่ยนชื่อไฟล์ Master จึงสร้างไฟล์ชั่วคราว
                        var tempDoc = app.documents.add(doc.documentColorSpace);
                        
                        // 1. เลิกใช้ Copy/Paste เปลี่ยนเป็น Duplicate
                        // ห้ามใช้ app.copy() และ app.paste() เด็ดขาด ให้ใช้คำสั่งโคลน Object ข้าม Document แทน
                        var targetGroup = tempGrp;
                        var duplicatedGroup = targetGroup.duplicate(tempDoc.activeLayer, ElementPlacement.PLACEATEND);
                        
                        // ป้องกันชิ้นงานหลุด Canvas: ย้ายชิ้นงานมาที่พิกัด 0,0 ของไฟล์ใหม่ก่อน
                        var initialBounds = duplicatedGroup.visibleBounds;
                        duplicatedGroup.translate(-initialBounds[0], -initialBounds[1]);
                        
                        // 2. จัดการพิกัดให้ Artboard ครอบชิ้นงานเป๊ะ 100%
                        var bounds = duplicatedGroup.visibleBounds;
                        tempDoc.artboards[0].artboardRect = bounds;
                        
                        // สั่ง Save และปิดไฟล์
                        tempDoc.saveAs(dFile, pdfOpts);
                        tempDoc.close(SaveOptions.DONOTSAVECHANGES);
                        
                        app.activeDocument = doc; // กลับมาไฟล์เดิม
                    } catch(e) {
                        try { tempDoc.close(SaveOptions.DONOTSAVECHANGES); } catch(ex) {}
                        app.activeDocument = doc;
                        alert("PDF Export Error: " + e.message);
                        throw new Error("PDF Export Error: " + e.message);
                    }
                } else if (isTIFF) {
                    var tiffOpts = new ExportOptionsTIFF();
                    tiffOpts.resolution = 300;
                    tiffOpts.imageColorSpace = ImageColorSpace.CMYK;
                    tiffOpts.lzwCompression = false; // ปิดบีบอัดเพื่อให้ RIP อ่านง่ายสุด
                    tiffOpts.byteOrder = TIFFByteOrder.IBMPC;
                    
                    // การจัดการเรื่อง Artboard Range
                    // ห้ามใช้ artBoardClipping = true สำหรับ TIFF เพราะมักจะทำให้เกิดบัค
                    tiffOpts.saveMultipleArtboards = true;
                    tiffOpts.artboardRange = "1";
                    
                    try {
                        doc.exportFile(dFile, ExportType.TIFF, tiffOpts);
                    } catch(e) {
                        alert("TIFF Export Error: " + e.message);
                        throw new Error("TIFF Export Error: " + e.message);
                    }
                } else {
                    var jOpt = new ExportOptionsJPEG();
                    jOpt.artBoardClipping = true;    
                    try {
                        jOpt.saveMultipleArtboards = true;
                        jOpt.artboardRange = "1";
                    } catch(e) {}
                    jOpt.qualitySetting = 100;       
                    // การ Export JPG จากสคริปต์จะไม่ได้ฝัง Metadata 300 PPI (จะกลายเป็น 72 DPI และขยายสเกลเอา)
                    // ทำให้โปรแกรม RIP เห็นเป็นภาพขนาดใหญ่ 4 เท่า จึงควรใช้ TIFF หากต้องการนำไปเข้า RIP
                    jOpt.horizontalScale = 416.6666; // = 300 DPI
                    jOpt.verticalScale = 416.6666;   
                    jOpt.antiAliasing = true;        
                    
                    doc.exportFile(dFile, ExportType.JPEG, jOpt);
                }

                tempGrp.remove();
                successCount++;
                fileCounter++;

            } catch (err) {
                errLogs.push(pName + " (" + pSize + "): " + err.message);
                if (tempGrp) tempGrp.remove();
            }
        }

        // คืนค่า Artboard
        mainAB.artboardRect = origRect;
        
        var msg = "🎉 เสร็จสมบูรณ์! ส่งออกไฟล์ " + formatName + " สำเร็จ " + successCount + " ไฟล์";
        if (errLogs.length > 0) {
            msg += " ⚠️ พบข้อผิดพลาด: " + errLogs.join(" | ");
        }
        return "SUCCESS|" + msg;
    } catch (err) {
        return "ERROR|❌ เกิดข้อผิดพลาด: " + err.message;
    }
}