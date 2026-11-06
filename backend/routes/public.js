// ==========================================
// routes/public.js
// ข้อมูลสาธารณะ: ข่าวสาร, รีวิว, ห้องพัก, ประเภทห้องพัก
// ==========================================
const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// สถานะสิ่งอำนวยความสะดวกของประเภทห้อง (room_type_facility.is_available)
// ไม่มีค่า = ถือว่าพร้อมใช้งาน
const isFacilityAvailable = (v) => (v || 'พร้อมใช้งาน') !== 'ไม่พร้อมใช้งาน';

router.get('/api/news', async (req, res) => {
    try {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const [news] = await pool.query(
            `SELECT n.*, u.firstname as author_name FROM news n
             LEFT JOIN user u ON n.user_id = u.user_id
             WHERE n.publish_date <= ? AND (n.end_date IS NULL OR n.end_date >= ?)
             ORDER BY n.publish_date DESC`, [now, now]
        );
        res.json({ success: true, data: news });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/api/news/all', authMiddleware(['admin', 'staff']), async (req, res) => {
    try {
        const [news] = await pool.query(
            `SELECT n.*, u.firstname as author_name FROM news n
             LEFT JOIN user u ON n.user_id = u.user_id
             ORDER BY n.publish_date DESC`
        );
        res.json({ success: true, data: news });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/api/reviews', async (req, res) => {
    try {
        const [reviews] = await pool.query(`
            SELECT r.*, m.firstname, m.lastname, m.prefix, rt.roomtype_name
            FROM review r
            LEFT JOIN member m ON r.member_id = m.member_id
            LEFT JOIN booking b ON r.booking_id = b.booking_id
            LEFT JOIN room_type rt ON b.roomtype_id = rt.roomtype_id
            ORDER BY r.created_at DESC
        `);
        res.json({ success: true, data: reviews });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// Public — ดูห้องพักทั้งหมด (ไม่ต้อง login)
router.get('/api/rooms', async (req, res) => {
    try {
        const [rooms] = await pool.query(`
            SELECT r.*, rt.roomtype_name, rt.image_url, rt.room_size, rt.max_guest, rt.price
            FROM room r
            LEFT JOIN room_type rt ON r.roomtype_id = rt.roomtype_id
            ORDER BY r.room_number
        `);
        const [facilities] = await pool.query(`
            SELECT rtf.roomtype_id, f.facility_name, rtf.is_available
            FROM room_type_facility rtf
            JOIN facility f ON rtf.facility_id = f.facility_id
        `);
        const facilityMap = {};
        const facilityDetailMap = {};
        facilities.forEach(f => {
            if (!facilityMap[f.roomtype_id]) facilityMap[f.roomtype_id] = [];
            if (!facilityDetailMap[f.roomtype_id]) facilityDetailMap[f.roomtype_id] = [];
            facilityMap[f.roomtype_id].push(f.facility_name);
            facilityDetailMap[f.roomtype_id].push({ name: f.facility_name, available: isFacilityAvailable(f.is_available) });
        });
        const data = rooms.map(r => ({ ...r, facilities: facilityMap[r.roomtype_id] || [], facility_details: facilityDetailMap[r.roomtype_id] || [] }));
        res.json({ success: true, data });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ลบ Subquery คำนวณ MIN(price) ออก เนื่องจาก price เป็น Column จริงใน room_type แล้ว
router.get('/api/room-types', async (req, res) => {
    try {
        const { checkin, checkout } = req.query;
        const [roomTypes] = await pool.query(`
            SELECT rt.*, 
                   (SELECT COUNT(*) FROM room WHERE roomtype_id = rt.roomtype_id AND room_status = 'พร้อมใช้งาน') as total_rooms,
                   (SELECT ROUND(AVG(r.rating), 1) FROM review r JOIN booking b ON r.booking_id = b.booking_id WHERE b.roomtype_id = rt.roomtype_id) as avg_rating,
                   (SELECT COUNT(*) FROM review r JOIN booking b ON r.booking_id = b.booking_id WHERE b.roomtype_id = rt.roomtype_id) as review_count
            FROM room_type rt
            ORDER BY rt.roomtype_id
        `);

        let bookedMap = {};
        if (checkin && checkout) {
            const [booked] = await pool.query(
                `SELECT roomtype_id, COALESCE(SUM(room_count), 0) as booked_rooms FROM booking
                 WHERE status_id NOT IN (5,6,7,9) AND checkin_date < ? AND checkout_date > ?
                 GROUP BY roomtype_id`,
                [checkout, checkin]
            );
            booked.forEach(b => { bookedMap[b.roomtype_id] = b.booked_rooms; });
        }

        const [facilities] = await pool.query(`
            SELECT rtf.roomtype_id, f.facility_name, rtf.is_available
            FROM room_type_facility rtf
            JOIN facility f ON rtf.facility_id = f.facility_id
        `);
        const facilityMap = {};
        const facilityDetailMap = {};
        facilities.forEach(f => {
            if (!facilityMap[f.roomtype_id]) facilityMap[f.roomtype_id] = [];
            if (!facilityDetailMap[f.roomtype_id]) facilityDetailMap[f.roomtype_id] = [];
            facilityMap[f.roomtype_id].push(f.facility_name);
            facilityDetailMap[f.roomtype_id].push({ name: f.facility_name, available: isFacilityAvailable(f.is_available) });
        });
        const data = roomTypes.map(rt => {
            const available_rooms = (checkin && checkout)
                ? Math.max(0, rt.total_rooms - (bookedMap[rt.roomtype_id] || 0))
                : rt.total_rooms;
            return { ...rt, available_rooms, facilities: facilityMap[rt.roomtype_id] || [], facility_details: facilityDetailMap[rt.roomtype_id] || [] };
        });
        res.json({ success: true, data });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/api/room-types/:id', async (req, res) => {
    try {
        const { checkin, checkout } = req.query;
        const [roomTypes] = await pool.query(`
            SELECT rt.*,
                   (SELECT COUNT(*) FROM room WHERE roomtype_id = rt.roomtype_id AND room_status = 'พร้อมใช้งาน') as available_rooms,
                   (SELECT ROUND(AVG(r.rating), 1) FROM review r JOIN booking b ON r.booking_id = b.booking_id WHERE b.roomtype_id = rt.roomtype_id) as avg_rating,
                   (SELECT COUNT(*) FROM review r JOIN booking b ON r.booking_id = b.booking_id WHERE b.roomtype_id = rt.roomtype_id) as review_count
            FROM room_type rt WHERE rt.roomtype_id = ?
        `, [req.params.id]);
        if (!roomTypes.length) return res.status(404).json({ success: false, message: 'ไม่พบห้องพัก' });

        let roomType = roomTypes[0];

        if (checkin && checkout) {
            const [[{ total_rooms }]] = await pool.query(
                "SELECT COUNT(*) as total_rooms FROM room WHERE roomtype_id = ? AND room_status = 'พร้อมใช้งาน'",
                [req.params.id]
            );
            const [[{ booked_rooms }]] = await pool.query(
                `SELECT COALESCE(SUM(room_count), 0) as booked_rooms FROM booking
                WHERE roomtype_id = ? AND status_id NOT IN (5,6,7,9)
                AND checkin_date < ? AND checkout_date > ?`,
                [req.params.id, checkout, checkin]
            );
            roomType.available_rooms = Math.max(0, total_rooms - booked_rooms);
        }

        const [facilities] = await pool.query(`
            SELECT f.facility_name, rtf.is_available FROM room_type_facility rtf
            JOIN facility f ON rtf.facility_id = f.facility_id
            WHERE rtf.roomtype_id = ?
            ORDER BY f.facility_id
        `, [req.params.id]);
        res.json({ success: true, data: {
            ...roomType,
            facilities: facilities.map(f => f.facility_name),
            // ใช้แสดงติ๊กถูก/กากบาทในหน้ารายละเอียดห้อง
            facility_details: facilities.map(f => ({ name: f.facility_name, available: isFacilityAvailable(f.is_available) })),
        } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;