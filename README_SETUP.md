# Aurora Grand Hotel — คู่มือติดตั้งและรัน

## ลำดับการติดตั้ง

### ขั้นที่ 1 — สร้างฐานข้อมูล MySQL
```sql
-- รัน dbd.sql ก่อน (สร้างตาราง)
source dbd.sql;

-- จากนั้นรัน seed_data.sql (เพิ่มข้อมูล)
source seed_data.sql;
```

### ขั้นที่ 2 — ตั้งค่า Backend
แก้ไขไฟล์ `backend/.env` ให้ตรงกับ MySQL ของคุณ:
```
DB_HOST=localhost
DB_USER=root
DB_PASS=รหัสผ่าน MySQL ของคุณ
DB_NAME=aurora_hotel_db
JWT_SECRET=aurora_secret_key_2025
PORT=5000
```

### ขั้นที่ 3 — รัน Backend
```bash
cd backend
npm install   # (ถ้ายังไม่ได้ติดตั้ง)
npm start
```
Backend จะรันที่ http://localhost:5000

### ขั้นที่ 4 — รัน Frontend
```bash
cd frontend
npm install   # (ถ้ายังไม่ได้ติดตั้ง)
npm run dev
```
Frontend จะรันที่ http://localhost:5173

---

## บัญชีทดสอบ

| Role  | Email | Password |
|-------|-------|----------|
| Admin | admin@aurora.com | admin1234 |
| Staff | staff@aurora.com | staff1234 |
| Staff | staff2@aurora.com | staff1234 |
| Member | member@aurora.com | member1234 |
| Member | member2@aurora.com | member1234 |

---

## ข้อมูลใน Database
- **ห้องพัก**: 10 ห้อง (Standard 2 / Superior 3 / Deluxe 3 / Suite 2)
- **ประเภทห้อง**: 4 ประเภทพร้อมสิ่งอำนวยความสะดวก
- **ข่าวสาร**: 4 รายการ
- **รีวิว**: 2 รายการ ตัวอย่าง
- **Booking**: 2 รายการ ตัวอย่าง

---

## API Endpoints สำคัญ

### Public
- `GET /api/room-types` — ประเภทห้องพักทั้งหมด
- `GET /api/news` — ข่าวที่ active
- `GET /api/reviews` — รีวิวทั้งหมด
- `POST /api/login` — เข้าสู่ระบบ (member/staff/admin)
- `POST /api/register` — สมัครสมาชิก

### Member (ต้องมี JWT)
- `POST /api/bookings` — สร้างการจอง
- `POST /api/bookings/:id/pay` — อัปโหลดสลิป
- `PUT /api/bookings/:id/cancel` — ยกเลิกการจอง
- `GET /api/member/:id/bookings` — ประวัติการจอง

### Staff (ต้องมี JWT)
- `GET /api/staff/bookings` — การจองทั้งหมด
- `PUT /api/staff/bookings/:id/confirm-payment` — ยืนยันชำระ
- `PUT /api/staff/bookings/:id/checkin` — เช็คอิน
- `PUT /api/staff/bookings/:id/checkout` — เช็คเอาต์
- `POST /api/staff/bookings` — จองให้ลูกค้า

### Admin (ต้องมี JWT)
- `GET /api/admin/stats` — สถิติ Dashboard
- `GET/POST /api/admin/rooms` — จัดการห้องพัก
- `PUT/DELETE /api/admin/rooms/:id` — แก้ไข/ลบห้อง
- `GET /api/admin/members` — รายชื่อสมาชิก
- `GET/POST /api/admin/staff` — จัดการพนักงาน
- `GET /api/admin/reports` — รายงานสถิติ
