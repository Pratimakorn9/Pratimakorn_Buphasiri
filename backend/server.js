// ==========================================
// server.js
// ไฟล์เริ่มต้นของ Aurora Grand Hotel API
// รวบรวมทุก Route Module เข้าด้วยกัน
// ==========================================
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const otpRoutes = require('./routes/otp');
const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
const bookingRoutes = require('./routes/bookings');
const staffRoutes = require('./routes/staff');
const adminRoutes = require('./routes/admin');
const pool = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// Routes
// ==========================================
app.use(otpRoutes);      // /api/otp/*, /api/reset-password
app.use(authRoutes);     // /api/register, /api/login, /api/member/*
app.use(publicRoutes);   // /api/news, /api/reviews, /api/rooms, /api/room-types
app.use(bookingRoutes);  // /api/bookings/*, /api/member/:id/*, /api/reviews
app.use(staffRoutes);    // /api/staff/*
app.use(adminRoutes);    // /api/admin/*

// กวาดตรวจการจองที่ค้าง PENDING_PAYMENT (status_id = 1) ทุก 1 นาที
// - Walk-in (ไม่มี member_id) เกิน 10 นาที -> ตัดเป็น CANCELLED_SYSTEM (5)
// - สมาชิก (มี member_id) เกิน 1 ชั่วโมง -> ตัดเป็น CANCELLED_SYSTEM (5)
async function expireStalePendingBookings() {
    try {
        const [staffRes] = await pool.query(
            `UPDATE booking SET status_id = 5
             WHERE status_id = 1 AND member_id IS NULL AND booking_datetime < (NOW() - INTERVAL 10 MINUTE)`
        );

        const [memberRes] = await pool.query(
            `UPDATE booking SET status_id = 5
             WHERE status_id = 1 AND member_id IS NOT NULL AND booking_datetime < (NOW() - INTERVAL 1 HOUR)`
        );

        if (staffRes.affectedRows > 0 || memberRes.affectedRows > 0) {
            console.log(`⏱️  ยกเลิกอัตโนมัติ: Walk-in ${staffRes.affectedRows} รายการ, สมาชิก ${memberRes.affectedRows} รายการ`);
        }
    } catch (error) {
        console.error('เกิดข้อผิดพลาดตอนกวาดการจองที่หมดเวลา:', error.message);
    }
}
setInterval(expireStalePendingBookings, 60 * 1000);
expireStalePendingBookings();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Aurora Hotel API running on port ${PORT}`));