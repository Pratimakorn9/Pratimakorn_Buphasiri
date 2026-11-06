// ==========================================
// routes/bookings.js
// การจองห้องพักและรีวิวฝั่งสมาชิก
// ==========================================
const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { BOOKING_SELECT } = require('../config/bookingQuery');
const { emailError, nameError, phoneError, normalizePhone } = require('../utils/validators');

const router = express.Router();

// ตรวจรีวิว: คะแนนต้องเป็นจำนวนเต็ม 1-5 และความเห็นต้องไม่ว่าง/ไม่เกิน 1,000 ตัวอักษร
function checkReview(rating, comment) {
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) return 'คะแนนต้องเป็น 1-5 ดาว';
    const text = String(comment ?? '').trim();
    if (!text) return 'กรุณากรอกความเห็น';
    if (text.length > 1000) return 'ความเห็นต้องไม่เกิน 1,000 ตัวอักษร';
    return null;
}

// ==========================================
// 3. BOOKING — สมาชิก
// ==========================================
router.post('/api/bookings', authMiddleware(['member']), async (req, res) => {
    // FIX: เดิมหน้า BookingPage.jsx มีช่องให้ลูกค้ากรอก "ชื่อผู้เข้าพัก" และ "เบอร์โทร" แยกจากโปรไฟล์ได้
    // (เผื่อจองแทนคนอื่น หรือใช้เบอร์อื่นติดต่อ) แต่ backend ไม่เคยรับ/บันทึกค่า contact_name, contact_phone เลย
    // ทำให้สิ่งที่ลูกค้ากรอกในสองช่องนี้หายไปเงียบๆ ไม่ถูกเก็บที่ไหนทั้งสิ้น จึงเพิ่มรับค่าและบันทึกลง booking
    const { member_id, roomtype_id, checkin_date, checkout_date, price, special_request, room_count, adults, children, contact_name, contact_email, contact_phone } = req.body;
    // ตรวจข้อมูลผู้ติดต่อ (ชื่อ / อีเมล / เบอร์โทรได้หลายเบอร์) ก่อนเริ่มทำรายการ
    const requestedRooms = parseInt(room_count, 10) || 1;
    if (requestedRooms < 1 || requestedRooms > 20) {
        return res.status(400).json({ success: false, message: 'จำนวนห้องไม่ถูกต้อง' });
    }
    const contactError = nameError('ชื่อผู้เข้าพัก', contact_name, { max: 100 }) || emailError(contact_email, { required: true });
    if (contactError) return res.status(400).json({ success: false, message: contactError });
    // เบอร์ติดต่อ: ตัวเลขล้วน ไม่เกิน 10 หลัก (เบอร์นี้กรอกเองได้ ไม่จำเป็นต้องเป็นเบอร์ในโปรไฟล์)
    const contactPhone = normalizePhone(contact_phone);
    const phoneErr = phoneError(contactPhone);
    if (phoneErr) return res.status(400).json({ success: false, message: phoneErr });

    // FIX: เดิม backend ไม่เช็คเลยว่าวันเข้าพักต้องมาก่อนวันออก (เช็คแค่ฝั่ง frontend)
    // ถ้ายิง API ตรงๆ ข้าม frontend จะสร้างการจองที่วันออกก่อนวันเข้าพักได้
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
            'INSERT INTO booking (member_id, roomtype_id, status_id, checkin_date, checkout_date, price, special_request, room_count, adults, children, contact_name, contact_email, contact_phone) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            // member_id มาจาก token ไม่ใช่ body (กันจองในชื่อสมาชิกคนอื่น)
            [req.user.id, roomtype_id, checkin_date, checkout_date, serverPrice, String(special_request || '').slice(0, 500) || null, requestedRooms, Math.max(1, parseInt(adults, 10) || 1), Math.max(0, parseInt(children, 10) || 0), String(contact_name).trim(), String(contact_email).trim(), contactPhone]
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

// FIX (ช่องโหว่): เดิม endpoint นี้ไม่ต้องล็อกอิน ใครเดาเลข booking_id ก็ดูชื่อ อีเมล เบอร์ และรูปสลิปของคนอื่นได้
// ตอนนี้ต้องมี token และสมาชิกดูได้เฉพาะการจองของตัวเอง (พนักงาน/แอดมินดูได้ทุกรายการ)
router.get('/api/bookings/:id', authMiddleware(['member', 'staff', 'admin']), async (req, res) => {
    try {
        const [bookings] = await pool.query(`
            SELECT b.*, bs.status_name, rt.roomtype_name
            FROM booking b
            JOIN booking_status bs ON b.status_id = bs.status_id
            LEFT JOIN room_type rt ON b.roomtype_id = rt.roomtype_id
            WHERE b.booking_id = ?
        `, [req.params.id]);
        // ไม่ใช่เจ้าของ ตอบ "ไม่พบ" เหมือนไม่มีรายการ เพื่อไม่บอกใบ้ว่าเลขนั้นมีอยู่จริง
        if (!bookings.length || (req.user.role === 'member' && Number(bookings[0].member_id) !== Number(req.user.id))) {
            return res.status(404).json({ success: false, message: 'ไม่พบการจอง' });
        }
        res.json({ success: true, data: bookings[0] });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/api/bookings/:id/pay', authMiddleware(['member']), async (req, res) => {
    try {
        const { slip_image } = req.body;
        // FIX: เดิมถ้ารูปสลิปใหญ่เกินไป (เช่น เกิน max_allowed_packet ของ MySQL) query ด้านล่างจะล้มเหลวแบบเงียบๆ
        // แล้วโผล่เป็น 500 Internal Server Error ที่ผู้ใช้งานไม่เข้าใจว่าเกิดจากอะไร จึงเช็คขนาดไฟล์ก่อน แล้วแจ้งเหตุผลที่ชัดเจน
        if (slip_image && slip_image.length > 8 * 1024 * 1024) {
            return res.status(400).json({ success: false, message: 'ไฟล์รูปสลิปใหญ่เกินไป กรุณาอัปโหลดรูปที่มีขนาดเล็กลง' });
        }
        // FIX: เดิม endpoint นี้ไม่เช็คว่า booking_id เป็นของสมาชิกที่ล็อกอินอยู่จริงหรือไม่ (IDOR)
        // สมาชิกคนไหนก็เดาเลข booking_id ของคนอื่นแล้วอัปโหลดสลิป/เปลี่ยนสถานะการจองได้ จึงเพิ่มการเช็คสิทธิ์เจ้าของก่อน
        const [rows] = await pool.query('SELECT member_id FROM booking WHERE booking_id=?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบการจอง' });
        if (Number(rows[0].member_id) !== Number(req.user.id)) return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์' });

        // FIX: เดิมไม่เช็คสถานะปัจจุบันก่อนอัปเดตเลย ทำให้การจองที่ถูกยกเลิกไปแล้ว (หมดเวลา/ถูกตัดโดยระบบ)
        // ยังแนบสลิปแล้ว "ฟื้นคืนชีพ" กลับมาเป็น PAYMENT_REVIEW ได้ ทั้งที่ห้องอาจถูกปล่อยให้คนอื่นจองไปแล้ว
        // เสี่ยงจองซ้อนห้องเดียวกัน 2 รายการ จึงต้องจำกัดให้แนบสลิปได้เฉพาะตอนยังอยู่สถานะ PENDING_PAYMENT (1) เท่านั้น
        const [result] = await pool.query(
            'UPDATE booking SET status_id = 2, slip_image = ? WHERE booking_id = ? AND status_id = 1',
            [slip_image, req.params.id]
        );
        if (!result.affectedRows) {
            return res.status(400).json({ success: false, message: 'การจองนี้ไม่ได้อยู่ในสถานะรอชำระเงินแล้ว ไม่สามารถแนบสลิปได้' });
        }
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ยกเลิกการจองโดยสมาชิก
router.put('/api/bookings/:id/cancel', authMiddleware(['member']), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT status_id, member_id FROM booking WHERE booking_id=?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบการจอง' });
        if (rows[0].member_id !== req.user.id) return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์' });
        if (![1, 2].includes(rows[0].status_id)) return res.status(400).json({ success: false, message: 'ไม่สามารถยกเลิกได้' });
        // FIX: เดิม endpoint นี้เซ็ต status_id = 7 (CANCELLED_USER) ตายตัวเสมอ ไม่ว่าฝั่ง frontend จะตั้งใจยกเลิกแบบไหน
        // ทำให้ตอนหมดเวลาชำระเงิน (PaymentPage.jsx เรียก cancelBooking(id, 'CANCELLED_SYSTEM') ตอน countdown หมด)
        // ค่าที่ถูกบันทึกจริงใน DB กลับกลายเป็น "ยกเลิกโดยผู้จอง" เสมอ ทั้งที่เป็นการตัดสิทธิ์โดยระบบ ไม่ใช่ผู้ใช้กดยกเลิกเอง
        // จึงรับ reason จาก body และแมปเป็น status_id ให้ตรงกับความตั้งใจจริง
        const statusId = req.body?.reason === 'CANCELLED_SYSTEM' ? 5 : 7; // 5=CANCELLED_SYSTEM, 7=CANCELLED_USER
        await pool.query('UPDATE booking SET status_id = ? WHERE booking_id = ?', [statusId, req.params.id]);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ประวัติการจองของสมาชิก
router.get('/api/member/:id/bookings', authMiddleware(['member', 'staff', 'admin']), async (req, res) => {
    try {
        // FIX: เดิมสมาชิก (role='member') เปลี่ยนเลข :id ใน URL เป็นของคนอื่นแล้วดูประวัติการจอง/อีเมล/เบอร์โทรคนอื่นได้ (IDOR)
        // staff/admin ยังดูของสมาชิกคนไหนก็ได้ตามปกติ แต่ member ต้องดูได้เฉพาะของตัวเองเท่านั้น
        if (req.user.role === 'member' && String(req.user.id) !== String(req.params.id)) {
            return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์' });
        }
        const [bookings] = await pool.query(
            `${BOOKING_SELECT} WHERE b.member_id = ? ORDER BY b.booking_datetime DESC`,
            [req.params.id]
        );
        res.json({ success: true, data: bookings });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// รีวิวของสมาชิก
router.get('/api/member/:id/reviews', authMiddleware(['member']), async (req, res) => {
    try {
        // FIX: เช่นเดียวกับ endpoint ประวัติการจอง เดิมไม่เช็คว่า :id ตรงกับสมาชิกที่ล็อกอินอยู่ (IDOR)
        if (String(req.user.id) !== String(req.params.id)) {
            return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์' });
        }
        const [reviews] = await pool.query(`
            SELECT r.*, rt.roomtype_name
            FROM review r
            JOIN booking b ON r.booking_id = b.booking_id
            LEFT JOIN room_type rt ON b.roomtype_id = rt.roomtype_id
            WHERE r.member_id = ? ORDER BY r.created_at DESC
        `, [req.params.id]);
        res.json({ success: true, data: reviews });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// เขียนรีวิว
router.post('/api/reviews', authMiddleware(['member']), async (req, res) => {
    try {
        // FIX: เดิมใช้ member_id จาก req.body ตรงๆ (เชื่อค่าที่ client ส่งมา) ทำให้ถ้ารู้ booking_id + member_id ของคนอื่น
        // ก็ปลอมรีวิวในชื่อสมาชิกคนอื่นได้ (IDOR) จึงเปลี่ยนไปใช้ req.user.id จาก token แทนเสมอ ไม่สนใจ member_id ที่ client ส่งมา
        const { booking_id, rating, comment, image_url_1, image_url_2 } = req.body;
        const member_id = req.user.id;
        // ตรวจคะแนนและความยาวความเห็นที่ฝั่ง server (กันส่งคะแนนแปลกๆ หรือข้อความยาวผิดปกติ)
        const reviewError = checkReview(rating, comment);
        if (reviewError) return res.status(400).json({ success: false, message: reviewError });
        // FIX: เดิมเช็คแค่ IN (4,8) แต่ระบบไม่เคยเซ็ต status_id=4 (COMPLETED) เลย มีแต่ checkout ที่เซ็ตเป็น 9 (CHECKED_OUT)
        // ผลคือหลังลูกค้า checkout จริงจะรีวิวไม่ได้อีกเลย จึงเพิ่ม 9 เข้าไปในเงื่อนไข
        const [bookings] = await pool.query(
            'SELECT * FROM booking WHERE booking_id=? AND member_id=? AND status_id IN (4,8,9)',
            [booking_id, member_id]
        );
        if (!bookings.length) return res.status(400).json({ success: false, message: 'ไม่สามารถรีวิวได้' });
        const [existing] = await pool.query('SELECT review_id FROM review WHERE booking_id=? AND member_id=?', [booking_id, member_id]);
        if (existing.length) return res.status(400).json({ success: false, message: 'รีวิวนี้แล้ว' });
        const [result] = await pool.query(
            'INSERT INTO review (booking_id, member_id, rating, comment, image_url_1, image_url_2) VALUES (?,?,?,?,?,?)',
            [booking_id, member_id, rating, comment, image_url_1 || null, image_url_2 || null]
        );
        res.json({ success: true, message: 'รีวิวสำเร็จ', review_id: result.insertId });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// แก้ไขรีวิว
router.put('/api/reviews/:id', authMiddleware(['member']), async (req, res) => {
    try {
        const { rating, comment, image_url_1, image_url_2 } = req.body;
        const reviewError = checkReview(rating, comment);
        if (reviewError) return res.status(400).json({ success: false, message: reviewError });
        const [existing] = await pool.query('SELECT member_id FROM review WHERE review_id=?', [req.params.id]);
        if (!existing.length) return res.status(404).json({ success: false, message: 'ไม่พบรีวิว' });
        if (existing[0].member_id !== req.user.id) return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์แก้ไขรีวิวนี้' });
        await pool.query(
            'UPDATE review SET rating=?, comment=?, image_url_1=?, image_url_2=? WHERE review_id=?',
            [rating, comment, image_url_1 || null, image_url_2 || null, req.params.id]
        );
        res.json({ success: true, message: 'แก้ไขรีวิวสำเร็จ' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;