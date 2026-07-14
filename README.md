# Medical Analytics Dashboard v2

เวอร์ชันพัฒนาใหม่ที่สร้างแยกจาก `index.html` ต้นฉบับ โดยยังใช้ Google Sheets ชุดเดิมเป็นแหล่งข้อมูล

## สิ่งที่เพิ่มขึ้น

- ตัวกรองเครื่องมือและช่วงเวลาที่เชื่อมกับ KPI, กราฟ และตารางทั้งหน้า
- KPI พร้อมเปรียบเทียบกับช่วงก่อนหน้าที่มีระยะเวลาเท่ากัน
- กราฟ Demo/Consumer แบบสองแกน, Device mix แบบคลิกกรองได้, Top clinics และรูปแบบกิจกรรมรายวัน
- Executive signal สรุปประเด็นสำคัญอัตโนมัติ
- Device scorecard และ Data health สำหรับตรวจข้อมูลวันที่/ชื่อคลินิกที่ไม่สมบูรณ์
- ตาราง Demo แบบค้นหา เรียงลำดับ แบ่งหน้า และ Export CSV
- ตารางผลิตภัณฑ์แบบค้นหา แบ่งหน้า และ Export CSV
- Responsive layout สำหรับ desktop, tablet และ mobile

## เปิดใช้งาน

เปิด `index.html` ผ่าน web server เพื่อให้การดึงข้อมูลข้ามโดเมนทำงานสม่ำเสมอ เช่น

```powershell
python -m http.server 8080
```

จากนั้นเปิด `http://localhost:8080/medical-analytics-v2/`

## หมายเหตุด้านความปลอดภัย

เว็บต้นฉบับตรวจอีเมลและรหัสผ่านใน JavaScript ฝั่ง browser ซึ่งผู้ใช้สามารถอ่านค่าได้จาก source code จึงไม่ใช่ระบบยืนยันตัวตนที่ปลอดภัย เวอร์ชันนี้ไม่ได้คัดลอกรหัสผ่านดังกล่าวมา หากต้องจำกัดสิทธิ์จริง ควรวางเว็บหลัง Google Apps Script/Workspace authentication, Cloudflare Access หรือ backend ที่ตรวจ session ฝั่ง server

## โครงสร้าง

- `index.html` — โครงสร้างหน้าและ semantic UI
- `app.css` — design system และ responsive layout
- `app.js` — data pipeline, analytics, interactions, table และ export
