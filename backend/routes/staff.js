// ==========================================
// routes/staff.js
// API สำหรับพนักงาน (Staff): จัดการการจอง, ชำระเงิน, เช็คอิน/เอาต์, รายงาน
// ==========================================
const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { BOOKING_SELECT } = require('../config/bookingQuery');
const { emailError, nameError, phoneError, normalizePhone } = require('../utils/validators');

const router = express.Router();

// ==========================================
// 4. STAFF APIs
// ==========================================

// --- การจองทั้งหมด ---
router.get('/api/staff/bookings', authMiddleware(['staff', 'admin']), async (req, res) => {
    try {
        const [bookings] = await pool.query(`${BOOKING_SELECT} ORDER BY b.booking_datetime DESC`);
        res.json({ success: true, data: bookings });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- รายการรอตรวจสอบชำระเงิน (สลิปสมาชิกเท่านั้น) ---
router.get('/api/staff/payments/pending', authMiddleware(['staff', 'admin']), async (req, res) => {
    try {
        const [bookings] = await pool.query(`${BOOKING_SELECT} WHERE b.status_id = 2 ORDER BY b.booking_datetime DESC`);
        res.json({ success: true, data: bookings });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- ยืนยันการชำระเงินของสมาชิก (CONFIRMED) ---
router.put('/api/staff/bookings/:id/confirm-payment', authMiddleware(['staff', 'admin']), async (req, res) => {
    try {
        const [result] = await pool.query(
            'UPDATE booking SET status_id = 3 WHERE booking_id = ? AND status_id = 2',
            [req.params.id]
        );
        if (!result.affectedRows) return res.status(400).json({ success: false, message: 'ไม่สามารถยืนยันได้' });
        res.json({ success: true, message: 'ยืนยันการชำระเงินสำเร็จ' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- ยืนยันการชำระเงินของ Walk-in + Auto Check-in อัตโนมัติ ---
router.put('/api/staff/bookings/:id/confirm-payment-walkin', authMiddleware(['staff', 'admin']), async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [bookings] = await conn.query('SELECT * FROM booking WHERE booking_id = ? FOR UPDATE', [req.params.id]);
        if (!bookings.length) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลการจอง' });
        }
        const b = bookings[0];

        if (b.status_id !== 1) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'การจองนี้ไม่ได้อยู่ในสถานะรอชำระเงิน หรือถูกยกเลิกไปแล้ว' });
        }

        // ค้นหาห้องว่างตามประเภทที่จอง และจำนวนห้องที่ต้องการ
        const [availableRooms] = await conn.query(
            `SELECT room_id, room_number FROM room
             WHERE roomtype_id = ? AND room_status = 'พร้อมใช้งาน'
             LIMIT ? FOR UPDATE`,
            [b.roomtype_id, b.room_count || 1]
        );

        if (availableRooms.length < (b.room_count || 1)) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: `ห้องว่างไม่เพียงพอสำหรับการเช็คอิน (ต้องการ ${b.room_count || 1} ห้อง)` });
        }

        const checkinTime = new Date();
        const assignedRooms = [];

        for (const r of availableRooms) {
            await conn.query(
                `INSERT INTO checkin (prefix, firstname, lastname, checkin_date, price, member_id, user_id, booking_id, room_id)
                 VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
                ['นาย/นาง/นางสาว', b.contact_name || 'ลูกค้า Walk-in', '-', checkinTime, b.price, req.user.id, b.booking_id, r.room_id]
            );
            // FIX: เดิม set เป็น 'มีผู้เข้าพัก' ซึ่งเป็นค่าสถานะเก่าที่เลิกใช้แล้ว (ตอนนี้ room_status เหลือแค่ 2 ค่า
            // คือ 'พร้อมใช้งาน'/'ไม่พร้อมใช้งาน' ตามที่ปรับใหม่) ถ้าไม่แก้ตรงนี้ห้องจะได้ค่าที่ไม่ตรงกับ dropdown/filter ที่อื่นในระบบ
            await conn.query("UPDATE room SET room_status = 'ไม่พร้อมใช้งาน' WHERE room_id = ?", [r.room_id]);
            assignedRooms.push(r.room_number);
        }

        // เปลี่ยนสถานะการจองเป็น CHECKED_IN (8) ทันที
        await conn.query('UPDATE booking SET status_id = 8 WHERE booking_id = ?', [b.booking_id]);

        await conn.commit();
        res.json({ success: true, message: 'ชำระเงินและเช็คอินสำเร็จ', assigned_rooms: assignedRooms });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        conn.release();
    }
});

// --- ยกเลิกการจองโดย Admin/Staff ---
router.put('/api/staff/bookings/:id/cancel', authMiddleware(['staff', 'admin']), async (req, res) => {
    try {
        // FIX: เดิม statusId = 6 (CANCELLED_ADMIN) ตายตัวเสมอ แต่ frontend (StaffNewBooking.jsx) เรียก
        // cancelBooking(id, 'CANCELLED_SYSTEM') ตอน QR popup หมดเวลา ซึ่งเป็นการตัดสิทธิ์อัตโนมัติ ไม่ใช่พนักงานกดยกเลิกเอง
        // ผลคือ DB บันทึกว่า "ยกเลิกโดยโรงแรม" เสมอ ทั้งที่ควรเป็น "ตัดโดยระบบ" จึงรับ reason มาแมปให้ตรง
        const statusId = req.body?.reason === 'CANCELLED_SYSTEM' ? 5 : 6; // 5=CANCELLED_SYSTEM, 6=CANCELLED_ADMIN
        await pool.query('UPDATE booking SET status_id = ? WHERE booking_id = ?', [statusId, req.params.id]);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- เช็คอิน (รองรับเลือกเช็คอินบางห้อง / Partial Check-in) ---
router.put('/api/staff/bookings/:id/checkin', authMiddleware(['staff', 'admin']), async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { prefix, firstname, lastname, room_ids, checkin_datetime } = req.body;
        const [bookingRows] = await pool.query('SELECT * FROM booking WHERE booking_id=?', [req.params.id]);
        if (!bookingRows.length) return res.status(404).json({ success: false, message: 'ไม่พบการจอง' });
        const b = bookingRows[0];

        const roomIds = Array.isArray(room_ids) ? room_ids.filter(Boolean) : [];

        // ตรวจสอบเงื่อนไข: ต้องเลือกอย่างน้อย 1 ห้อง และไม่เกินจำนวนห้องที่จองไว้
        if (roomIds.length === 0 || roomIds.length > (b.room_count || 1)) {
            return res.status(400).json({
                success: false,
                message: `กรุณาระบุเลขห้องอย่างน้อย 1 ห้อง และไม่เกิน ${b.room_count || 1} ห้อง`
            });
        }

        await conn.beginTransaction();

        const [rooms] = await conn.query(
            `SELECT room_id, roomtype_id, room_status FROM room WHERE room_id IN (${roomIds.map(() => '?').join(',')}) FOR UPDATE`,
            roomIds
        );
        if (rooms.length !== roomIds.length || rooms.some(r => r.roomtype_id !== b.roomtype_id || r.room_status !== 'พร้อมใช้งาน')) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'ห้องที่เลือกไม่ว่างหรือไม่ตรงประเภท กรุณาเลือกใหม่' });
        }

        const checkinTime = checkin_datetime || new Date();

        // บันทึกเฉพาะห้องที่เลือกเช็คอิน
        for (const roomId of roomIds) {
            await conn.query(
                `INSERT INTO checkin (prefix, firstname, lastname, checkin_date, price, member_id, user_id, booking_id, room_id)
                 VALUES (?,?,?,?,?,?,?,?,?)`,
                [prefix || 'นาย', firstname || 'ลูกค้า', lastname || '-', checkinTime,
                 b.price, b.member_id, req.user.id, req.params.id, roomId]
            );
            // FIX: เหมือนจุดข้างบน เดิม set เป็น 'มีผู้เข้าพัก' (ค่าเก่าที่เลิกใช้แล้ว) เปลี่ยนเป็น 'ไม่พร้อมใช้งาน'
            // ให้ตรงกับ 2 สถานะที่เหลือในระบบ (พร้อมใช้งาน / ไม่พร้อมใช้งาน)
            await conn.query("UPDATE room SET room_status = 'ไม่พร้อมใช้งาน' WHERE room_id = ?", [roomId]);
        }

        // เปลี่ยนสถานะการจองเป็น CHECKED_IN (8)
        // และอัปเดต room_count ให้เท่ากับจำนวนห้องที่เช็คอินจริง (roomIds.length)
        // เพื่อคืนห้องที่เหลือเข้าสู่ระบบค้นหาห้องว่าง
        await conn.query('UPDATE booking SET status_id = 8, room_count = ? WHERE booking_id = ?', [roomIds.length, req.params.id]);

        await conn.commit();
        res.json({ success: true, message: 'เช็คอินสำเร็จ' });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        conn.release();
    }
});

// --- เช็คเอาต์ (เวลาที่ระบุเอง + คืนสถานะห้อง) ---
router.put('/api/staff/bookings/:id/checkout', authMiddleware(['staff', 'admin']), async (req, res) => {
    try {
        const { checkout_datetime } = req.body;
        const checkoutTime = checkout_datetime || new Date();
        await pool.query('UPDATE booking SET status_id = 9 WHERE booking_id = ?', [req.params.id]);
        const [checkins] = await pool.query('SELECT room_id FROM checkin WHERE booking_id = ? AND checkout_date IS NULL', [req.params.id]);
        await pool.query('UPDATE checkin SET checkout_date = ? WHERE booking_id = ? AND checkout_date IS NULL', [checkoutTime, req.params.id]);
        for (const c of checkins) {
            if (c.room_id) await pool.query("UPDATE room SET room_status = 'พร้อมใช้งาน' WHERE room_id = ?", [c.room_id]);
        }
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- ดูเลขห้องที่ถูก assign ไปแล้วของการจองนี้ ---
router.get('/api/staff/bookings/:id/checkins', authMiddleware(['staff', 'admin', 'member']), async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT c.*, r.room_number FROM checkin c LEFT JOIN room r ON c.room_id = r.room_id WHERE c.booking_id = ?`,
            [req.params.id]
        );
        res.json({ success: true, data: rows });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- Staff สร้างการจองให้ลูกค้า (Walk-in) ---
router.post('/api/staff/bookings', authMiddleware(['staff', 'admin']), async (req, res) => {
    const { roomtype_id, checkin_date, checkout_date, price, special_request, room_count, contact_name, contact_email, contact_phone } = req.body;
    // ตรวจข้อมูลผู้ติดต่อ (ชื่อ / อีเมล / เบอร์โทรได้หลายเบอร์) ก่อนเริ่มทำรายการ
    const requestedRooms = parseInt(room_count, 10) || 1;
    if (requestedRooms < 1 || requestedRooms > 20) {
        return res.status(400).json({ success: false, message: 'จำนวนห้องไม่ถูกต้อง' });
    }
    const contactError = nameError('ชื่อผู้เข้าพัก', contact_name, { max: 100 }) || emailError(contact_email, { required: false });
    if (contactError) return res.status(400).json({ success: false, message: contactError });
    // เบอร์ติดต่อ: ตัวเลขล้วน ไม่เกิน 10 หลัก (เบอร์นี้กรอกเองได้ ไม่จำเป็นต้องเป็นเบอร์ในโปรไฟล์)
    const contactPhone = normalizePhone(contact_phone);
    const phoneErr = phoneError(contactPhone);
    if (phoneErr) return res.status(400).json({ success: false, message: phoneErr });

    if (!checkin_date || !checkout_date || new Date(checkin_date) >= new Date(checkout_date)) {
        return res.status(400).json({ success: false, message: 'วันเข้าพักต้องมาก่อนวันออกเสมอ' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query('SELECT room_id FROM room WHERE roomtype_id = ? FOR UPDATE', [roomtype_id]);

        const [[{ total_rooms }]] = await conn.query(
            'SELECT COUNT(*) as total_rooms FROM room WHERE roomtype_id = ?',
            [roomtype_id]
        );
        const [[{ booked_rooms }]] = await conn.query(
            `SELECT COALESCE(SUM(room_count), 0) as booked_rooms FROM booking
            WHERE roomtype_id = ? AND status_id NOT IN (5,6,7,9)
            AND checkin_date < ? AND checkout_date > ?`,
            [roomtype_id, checkout_date, checkin_date]
        );
        const availableRooms = total_rooms - booked_rooms;

        if (requestedRooms > availableRooms) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: `ห้องว่างไม่เพียงพอ เหลือเพียง ${Math.max(availableRooms, 0)} ห้องในช่วงวันที่เลือก`
            });
        }

        // status_id = 1 (PENDING_PAYMENT) และ member_id = NULL
        // FIX (ช่องโหว่): เดิมเชื่อราคา (price) ที่ browser ส่งมาตรงๆ ใครแก้ค่าเป็น 1 บาทแล้วยิง API ก็จองได้
        // ตอนนี้คำนวณเองจากราคาประเภทห้องในฐานข้อมูล x จำนวนคืน x จำนวนห้อง และไม่ใช้ค่าจาก client
        const [rtRows] = await conn.query('SELECT price FROM room_type WHERE roomtype_id = ?', [roomtype_id]);
        if (!rtRows.length) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'ไม่พบประเภทห้องที่เลือก' });
        }
        const nights = Math.max(1, Math.round((new Date(checkout_date) - new Date(checkin_date)) / 86400000));
        const serverPrice = rtRows[0].price * nights * requestedRooms;

        const [result] = await conn.query(
            `INSERT INTO booking (roomtype_id, status_id, checkin_date, checkout_date, price, special_request, room_count, contact_name, contact_email, contact_phone, member_id)
             VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
            [roomtype_id, checkin_date, checkout_date, serverPrice, String(special_request || '').slice(0, 500) || null, requestedRooms, String(contact_name).trim(), String(contact_email || '').trim() || null, contactPhone]
        );
        await conn.commit();
        res.json({ success: true, booking_id: result.insertId });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        conn.release();
    }
});

// --- รายงาน Staff ---
router.get('/api/staff/stats', authMiddleware(['staff', 'admin']), async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const [pending] = await pool.query('SELECT COUNT(*) as cnt FROM booking WHERE status_id = 2');
        const [members] = await pool.query('SELECT COUNT(*) as cnt FROM member');
        const [todayCI] = await pool.query(
            "SELECT COUNT(*) as cnt FROM booking WHERE DATE(checkin_date)=? AND status_id=3", [today]
        );
        const [revenue] = await pool.query(
            'SELECT COALESCE(SUM(price),0) as total FROM booking WHERE status_id IN (3,4,8,9)'
        );
        res.json({ success: true, data: {
            pending_payment: pending[0].cnt,
            total_members: members[0].cnt,
            today_checkin: todayCI[0].cnt,
            total_revenue: revenue[0].total
        }});
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;