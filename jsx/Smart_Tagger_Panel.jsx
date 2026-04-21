function applyNameToSelection(newName) {
    try {
        if (app.documents.length === 0) {
            return "ERROR|⚠️ ไม่พบหน้ากระดาษที่เปิดอยู่";
        }
        var doc = app.activeDocument; 
        var sel = doc.selection;
        
        if (!sel || sel.length === 0) {
            return "ERROR|⚠️ กรุณาคลิกเลือกชิ้นงานก่อนกดปุ่ม";
        }
        
        for (var i = 0; i < sel.length; i++) { 
            sel[i].name = newName; 
        }
        app.redraw();
        return "SUCCESS|✅ สำเร็จ! เปลี่ยนชื่อเป็น '" + newName + "'";

    } catch (err) {
        return "ERROR|❌ ขัดข้องระบบภายใน: " + err.message;
    }
}