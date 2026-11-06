# โครงสร้างโปรเจกต์ Aurora Grand Hotel (จัดระเบียบใหม่)

## Backend (`backend/`)
```
backend/
├── server.js              ← จุดเริ่มต้นของแอป (แทน index.js เดิม)
├── config/
│   ├── db.js               ← การเชื่อมต่อ MySQL (connection pool)
│   └── mailer.js            ← ตัวส่งอีเมล OTP ผ่าน Gmail (Nodemailer)
├── middleware/
│   └── auth.js               ← ตรวจสอบ JWT Token และสิทธิ์ตาม role
└── routes/
    ├── otp.js                 ← ส่ง/ยืนยัน OTP, รีเซ็ตรหัสผ่าน
    ├── auth.js                ← สมัครสมาชิก, เข้าสู่ระบบ, แก้ไขข้อมูลสมาชิก
    ├── public.js               ← ข่าวสาร, รีวิว, ห้องพัก, ประเภทห้องพัก (ไม่ต้อง login)
    ├── bookings.js              ← การจอง/รีวิวฝั่งสมาชิก
    ├── staff.js                  ← API ทั้งหมดของพนักงาน
    └── admin.js                  ← API ทั้งหมดของแอดมิน
```
รัน: `npm run start` (หรือ `node server.js`) — พฤติกรรมเหมือนเดิมทุกประการ
เปลี่ยนแค่ `main`/`start` ใน package.json จาก `index.js` เป็น `server.js`

หมายเหตุ: พบว่า `nodemailer` เคยขาดหายจาก `package.json` (มีแค่ในโค้ดแต่ไม่ได้ประกาศ dependency) แก้ไขเพิ่มให้แล้ว

## Frontend (`frontend/src/pages/`)
```
pages/
├── home/            HomePage.jsx
├── rooms/           RoomsPage.jsx, RoomDetailPage.jsx
├── booking/         BookingPage.jsx, PaymentPage.jsx
│                    components/_shared.jsx (ป็อปอัพ/ขั้นตอนการจอง)
├── member/          MemberProfile.jsx, MemberBookings.jsx, MemberReviews.jsx
│                    components/_shared.jsx (Sidebar สมาชิก)
├── staff/           StaffDashboard.jsx, StaffBookings.jsx, StaffCheckIn.jsx,
│                    StaffPayments.jsx, StaffNewBooking.jsx, StaffReports.jsx,
│                    StaffProfile.jsx, StaffReceipt.jsx
│                    components/_shared.jsx (Popup, Sidebar, Modal รายละเอียดจอง)
├── admin/           AdminDashboard.jsx, AdminRooms.jsx, AdminBookings.jsx,
│                    AdminMembers.jsx, AdminNews.jsx, AdminReports.jsx,
│                    AdminProfile.jsx, AdminStaff.jsx
│                    components/_shared.jsx (Popup, Sidebar, Modal, RoomForm)
└── other/           NewsPage.jsx, ReviewsPage.jsx
```
แต่ละโฟลเดอร์มี `index.js` เป็นจุดรวม export (barrel file) เพื่อให้ `App.jsx`
import ได้สั้นๆ เช่น `import { AdminDashboard } from './pages/admin'`

ทุกไฟล์หน้าใหม่มีคอมเมนต์หัวข้อบอกว่าไฟล์นี้คืออะไร และโค้ด JSX/CSS class ทั้งหมด
**เหมือนเดิม 100%** — เป็นการย้ายโค้ดไปจัดกลุ่มใหม่เท่านั้น ไม่ได้แก้ logic หรือดีไซน์ใดๆ
(ตรวจสอบแล้วว่า build ผ่านและ index.css ไม่ถูกแก้ไขเลยแม้แต่บรรทัดเดียว)
