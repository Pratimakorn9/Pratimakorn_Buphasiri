// ==========================================
// routes/admin.js
// API สำหรับผู้ดูแลระบบ (Admin)
// ==========================================
const express = require('express');
const bcrypt = require('bcryptjs'); 
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { BOOKING_SELECT } = require('../config/bookingQuery');
const { normalizePhone, emailError, phoneError, nameError, prefixError, isPhoneTaken, isEmailTaken } = require('../utils/validators');

const router = express.Router();

// --- สถิติ Dashboard ---
router.get('/api/admin/stats', authMiddleware(['admin']), async (req, res) => {
    try {
        const [members] = await pool.query('SELECT COUNT(*) as cnt FROM member');
        const [staffs] = await pool.query("SELECT COUNT(*) as cnt FROM user WHERE role='staff'");
        const [pending] = await pool.query('SELECT COUNT(*) as cnt FROM booking WHERE status_id = 2');
        const [revenue] = await pool.query('SELECT COALESCE(SUM(price),0) as total FROM booking WHERE status_id IN (3,4,8,9)');
        res.json({ success: true, data: {
            total_members: members[0].cnt,
            total_staff: staffs[0].cnt,
            pending_payment: pending[0].cnt,
            total_revenue: revenue[0].total
        }});
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- ดึงรายการสิ่งอำนวยความสะดวกทั้งหมด ---
router.get('/api/admin/facilities', authMiddleware(['admin', 'staff']), async (req, res) => {
    try {
        const [facilities] = await pool.query('SELECT * FROM facility ORDER BY facility_id ASC');
        res.json({ success: true, data: facilities });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- ดึงประเภทห้องพร้อมรหัส facility และสถานะ is_available ---
router.get('/api/admin/room-types', authMiddleware(['admin', 'staff']), async (req, res) => {
    try {
        const [roomTypes] = await pool.query('SELECT * FROM room_type ORDER BY roomtype_id ASC');
        const [typeFacilities] = await pool.query('SELECT * FROM room_type_facility');

        const data = roomTypes.map(rt => {
            const matchedFacilities = typeFacilities.filter(tf => tf.roomtype_id === rt.roomtype_id);
            return {
                ...rt,
                facility_ids: matchedFacilities.map(tf => tf.facility_id),
                facilities_status: matchedFacilities.reduce((acc, tf) => {
                    acc[tf.facility_id] = tf.is_available || 'พร้อมใช้งาน';
                    return acc;
                }, {})
            };
        });

        res.json({ success: true, data });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- สร้างประเภทห้อง พร้อมบันทึก price, facility และ is_available ---
router.post('/api/admin/room-types', authMiddleware(['admin']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { roomtype_name, description, max_guest, room_size, image_url, price, facility_ids = [], facilities_status = {} } = req.body;

        if (!roomtype_name || !max_guest) {
            connection.release();
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อประเภทห้องและจำนวนผู้เข้าพักสูงสุด' });
        }
        if (!price || parseInt(price) <= 0) {
            connection.release();
            return res.status(400).json({ success: false, message: 'ราคาต้องมากกว่า 0 บาท' });
        }

        await connection.beginTransaction();

        const [result] = await connection.query(
            'INSERT INTO room_type (roomtype_name, description, max_guest, room_size, image_url, price) VALUES (?, ?, ?, ?, ?, ?)',
            [roomtype_name, description || '', parseInt(max_guest), String(room_size || ''), image_url || '', parseInt(price)]
        );

        const newRoomTypeId = result.insertId;

        if (Array.isArray(facility_ids) && facility_ids.length > 0) {
            for (const fId of facility_ids) {
                const status = facilities_status[fId] || 'พร้อมใช้งาน';
                await connection.query(
                    'INSERT INTO room_type_facility (roomtype_id, facility_id, is_available) VALUES (?, ?, ?)',
                    [newRoomTypeId, fId, status]
                );
            }
        }

        await connection.commit();
        res.json({ success: true, message: 'เพิ่มประเภทห้องสำเร็จ', roomtype_id: newRoomTypeId });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
});

// --- แก้ไขประเภทห้อง และ sync facility + is_available ใหม่ทั้งชุด ---
router.put('/api/admin/room-types/:id', authMiddleware(['admin']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const { roomtype_name, description, max_guest, room_size, image_url, price, facility_ids = [], facilities_status = {} } = req.body;

        if (!roomtype_name || !max_guest) {
            connection.release();
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อประเภทห้องและจำนวนผู้เข้าพักสูงสุด' });
        }
        if (!price || parseInt(price) <= 0) {
            connection.release();
            return res.status(400).json({ success: false, message: 'ราคาต้องมากกว่า 0 บาท' });
        }

        await connection.beginTransaction();

        await connection.query(
            'UPDATE room_type SET roomtype_name = ?, description = ?, max_guest = ?, room_size = ?, image_url = ?, price = ? WHERE roomtype_id = ?',
            [roomtype_name, description || '', parseInt(max_guest), String(room_size || ''), image_url || '', parseInt(price), id]
        );

        await connection.query('DELETE FROM room_type_facility WHERE roomtype_id = ?', [id]);

        if (Array.isArray(facility_ids) && facility_ids.length > 0) {
            for (const fId of facility_ids) {
                const status = facilities_status[fId] || 'พร้อมใช้งาน';
                await connection.query(
                    'INSERT INTO room_type_facility (roomtype_id, facility_id, is_available) VALUES (?, ?, ?)',
                    [id, fId, status]
                );
            }
        }

        await connection.commit();
        res.json({ success: true, message: 'แก้ไขประเภทห้องสำเร็จ' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
});

// --- ลบประเภทห้อง ---
router.delete('/api/admin/room-types/:id', authMiddleware(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const [rooms] = await pool.query('SELECT room_id FROM room WHERE roomtype_id = ?', [id]);
        if (rooms.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `ไม่สามารถลบได้ เนื่องจากมีห้องพักอ้างอิงประเภทนี้อยู่ ${rooms.length} ห้อง` 
            });
        }

        await pool.query('DELETE FROM room_type_facility WHERE roomtype_id = ?', [id]);
        await pool.query('DELETE FROM room_type WHERE roomtype_id = ?', [id]);

        res.json({ success: true, message: 'ลบประเภทห้องสำเร็จ' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- ห้องพักทั้งหมด (รายห้อง) SELECT rt.price เพื่อคงคีย์ r.price ไว้ให้ frontend ---
router.get('/api/admin/rooms', authMiddleware(['admin', 'staff']), async (req, res) => {
    try {
        const [rooms] = await pool.query(`
            SELECT r.*, rt.roomtype_name, rt.image_url, rt.price,
                   (SELECT COUNT(*) FROM checkin c WHERE c.room_id = r.room_id AND c.checkout_date IS NULL) AS active_checkins
            FROM room r LEFT JOIN room_type rt ON r.roomtype_id = rt.roomtype_id
            ORDER BY r.room_number
        `);
        res.json({ success: true, data: rooms });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- เพิ่มห้องพัก (ถอด price ออก) ---
router.post('/api/admin/rooms', authMiddleware(['admin']), async (req, res) => {
    try {
        const { room_number, room_status, description, bed_type, people_count, roomtype_id } = req.body;

        if (!room_number || String(room_number).trim() === '') {
            return res.status(400).json({ success: false, message: 'กรุณากรอกเลขห้องพัก' });
        }

        const [rt] = await pool.query('SELECT max_guest FROM room_type WHERE roomtype_id = ?', [roomtype_id]);
        if (rt.length > 0 && parseInt(people_count) > rt[0].max_guest) {
            return res.status(400).json({ 
                success: false, 
                message: `จำนวนคน (${people_count} คน) เกินกว่าที่ประเภทห้องนี้รองรับได้สูงสุด (${rt[0].max_guest} คน)` 
            });
        }

        const [existing] = await pool.query('SELECT room_id FROM room WHERE room_number=?', [room_number]);
        if (existing.length) return res.status(400).json({ success: false, message: `เลขห้อง ${room_number} มีอยู่แล้ว` });

        const [result] = await pool.query(
            'INSERT INTO room (room_number, room_status, description, bed_type, people_count, roomtype_id) VALUES (?,?,?,?,?,?)',
            [room_number, room_status || 'พร้อมใช้งาน', description || '', bed_type || 'เตียงเดี่ยว', parseInt(people_count) || 2, roomtype_id]
        );
        res.json({ success: true, room_id: result.insertId });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- แก้ไขห้องพัก (ถอด price ออก) ---
router.put('/api/admin/rooms/:id', authMiddleware(['admin']), async (req, res) => {
    try {
        const { room_status, description, bed_type, people_count, roomtype_id } = req.body;

        // ห้ามเปลี่ยนสถานะห้องขณะที่มีผู้เข้าพักเช็คอินค้างอยู่ (ยังไม่เช็คเอาต์)
        const [current] = await pool.query('SELECT room_number, room_status FROM room WHERE room_id = ?', [req.params.id]);
        if (!current.length) return res.status(404).json({ success: false, message: 'ไม่พบห้องพัก' });
        const newStatus = room_status || 'พร้อมใช้งาน';
        if (newStatus !== current[0].room_status) {
            const [[{ active }]] = await pool.query(
                'SELECT COUNT(*) AS active FROM checkin WHERE room_id = ? AND checkout_date IS NULL',
                [req.params.id]
            );
            if (active > 0) {
                return res.status(400).json({
                    success: false,
                    message: `ไม่สามารถเปลี่ยนสถานะได้ เนื่องจากวันนี้มีผู้เช็คอินห้อง ${current[0].room_number} อยู่`
                });
            }
        }

        const [rt] = await pool.query('SELECT max_guest FROM room_type WHERE roomtype_id = ?', [roomtype_id]);
        if (rt.length > 0 && parseInt(people_count) > rt[0].max_guest) {
            return res.status(400).json({ 
                success: false, 
                message: `จำนวนคน (${people_count} คน) เกินกว่าที่ประเภทห้องนี้รองรับได้สูงสุด (${rt[0].max_guest} คน)` 
            });
        }

        await pool.query(
            'UPDATE room SET room_status=?, description=?, bed_type=?, people_count=?, roomtype_id=? WHERE room_id=?',
            [room_status || 'พร้อมใช้งาน', description, bed_type, parseInt(people_count), roomtype_id, req.params.id]
        );
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- ลบห้องพัก ---
router.delete('/api/admin/rooms/:id', authMiddleware(['admin']), async (req, res) => {
    try {
        await pool.query('DELETE FROM room WHERE room_id=?', [req.params.id]);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- สมาชิกทั้งหมด ---
router.get('/api/admin/members', authMiddleware(['admin']), async (req, res) => {
    try {
        const [members] = await pool.query('SELECT member_id, prefix, firstname, lastname, email, phone, created_at FROM member ORDER BY created_at DESC');
        res.json({ success: true, data: members });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- พนักงานทั้งหมด ---
router.get('/api/admin/staff', authMiddleware(['admin']), async (req, res) => {
    try {
        const [staff] = await pool.query("SELECT user_id, prefix, firstname, lastname, email, phone, role, status, created_at FROM user WHERE role != 'admin' ORDER BY created_at DESC");
        res.json({ success: true, data: staff });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- เพิ่มพนักงาน ---
router.post('/api/admin/staff', authMiddleware(['admin']), async (req, res) => {
    try {
        const { prefix, password, role } = req.body;
        const firstname = String(req.body.firstname ?? '').trim();
        const lastname = String(req.body.lastname ?? '').trim();
        const email = String(req.body.email ?? '').trim();
        const phone = normalizePhone(req.body.phone);

        const formatError = prefixError(prefix) || nameError('ชื่อ', firstname) || nameError('นามสกุล', lastname)
            || emailError(email) || phoneError(phone, { required: false });
        if (formatError) return res.status(400).json({ success: false, message: formatError });
        if (!password || String(password).length < 6 || String(password).length > 100)
            return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมี 6-100 ตัวอักษร' });
        if (role && !['staff', 'admin'].includes(role))
            return res.status(400).json({ success: false, message: 'ตำแหน่งไม่ถูกต้อง' });

        // อีเมล/เบอร์ต้องไม่ซ้ำกับบัญชีใดๆ (สมาชิกหรือพนักงาน)
        if (await isEmailTaken(pool, email)) return res.status(400).json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });
        if (phone && await isPhoneTaken(pool, phone)) return res.status(400).json({ success: false, message: 'เบอร์โทรนี้ถูกใช้งานแล้ว' });
        const hashed = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO user (prefix, firstname, lastname, role, email, password, phone, status) VALUES (?,?,?,?,?,?,?,?)',
            [prefix, firstname, lastname, role || 'staff', email, hashed, phone || null, 'active']
        );
        res.json({ success: true, user_id: result.insertId });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- ระงับ / เปิดใช้งานบัญชีพนักงาน (ไม่ลบข้อมูลจริง) ---
// เดิมเป็น DELETE FROM user ลบถาวร ทำให้ประวัติที่พนักงานคนนั้นทำไว้ (เช็คอิน, ข่าว) ขาดความเชื่อมโยง
// ตอนนี้แค่เปลี่ยน user.status เป็น 'suspended' (ล็อกอินและใช้ token เดิมไม่ได้) และเปิดกลับเป็น 'active' ได้
router.put('/api/admin/staff/:id/status', authMiddleware(['admin']), async (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'suspended'].includes(status)) {
            return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
        }
        if (Number(req.params.id) === Number(req.user.id)) {
            return res.status(400).json({ success: false, message: 'ไม่สามารถระงับบัญชีของตัวเองได้' });
        }
        const [rows] = await pool.query('SELECT role FROM user WHERE user_id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบบัญชีพนักงาน' });
        if (rows[0].role === 'admin') {
            return res.status(400).json({ success: false, message: 'ไม่สามารถระงับบัญชีผู้ดูแลระบบได้' });
        }
        await pool.query('UPDATE user SET status = ? WHERE user_id = ?', [status, req.params.id]);
        res.json({ success: true, status });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- ข่าวสาร Admin ---
router.post('/api/admin/news', authMiddleware(['admin', 'staff']), async (req, res) => {
    try {
        const { image_url, publish_date, end_date } = req.body;
        const title = String(req.body.title ?? '').trim();
        const detail = String(req.body.detail ?? '').trim();
        // ตรวจความยาวตามขนาดคอลัมน์จริง (news.title = VARCHAR(100)) กัน error จากฐานข้อมูลและข้อมูลว่าง
        if (!title) return res.status(400).json({ success: false, message: 'กรุณากรอกหัวข้อข่าว' });
        if (title.length > 100) return res.status(400).json({ success: false, message: 'หัวข้อข่าวต้องไม่เกิน 100 ตัวอักษร' });
        if (!detail) return res.status(400).json({ success: false, message: 'กรุณากรอกรายละเอียดข่าว' });
        if (detail.length > 5000) return res.status(400).json({ success: false, message: 'รายละเอียดข่าวต้องไม่เกิน 5,000 ตัวอักษร' });
        if (!publish_date || isNaN(new Date(publish_date).getTime()))
            return res.status(400).json({ success: false, message: 'วันที่เผยแพร่ไม่ถูกต้อง' });
        if (end_date && (isNaN(new Date(end_date).getTime()) || new Date(end_date) < new Date(publish_date)))
            return res.status(400).json({ success: false, message: 'วันสิ้นสุดต้องไม่ก่อนวันที่เผยแพร่' });
        const [result] = await pool.query(
            'INSERT INTO news (title, detail, image_url, publish_date, end_date, user_id) VALUES (?,?,?,?,?,?)',
            [title, detail, image_url || null, publish_date, end_date || null, req.user.id]
        );
        res.json({ success: true, news_id: result.insertId });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.delete('/api/admin/news/:id', authMiddleware(['admin', 'staff']), async (req, res) => {
    try {
        await pool.query('DELETE FROM news WHERE news_id=?', [req.params.id]);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- รายงาน Admin ---
router.get('/api/admin/reports', authMiddleware(['admin']), async (req, res) => {
    try {
        const { year } = req.query;
        const selectedYear = year || new Date().getFullYear();
        const [monthly] = await pool.query(`
            SELECT MONTH(checkin_date) as month, COUNT(*) as count, COALESCE(SUM(price),0) as revenue
            FROM booking
            WHERE YEAR(checkin_date) = ? AND status_id IN (3,4,8,9)
            GROUP BY MONTH(checkin_date)
        `, [selectedYear]);
        const [statusCounts] = await pool.query(`
            SELECT bs.status_name, COUNT(*) as count
            FROM booking b JOIN booking_status bs ON b.status_id = bs.status_id
            WHERE YEAR(b.checkin_date) = ?
            GROUP BY b.status_id, bs.status_name
        `, [selectedYear]);
        const [roomStats] = await pool.query(`
            SELECT rt.roomtype_name, COUNT(b.booking_id) as booking_count, COALESCE(SUM(b.price),0) as revenue
            FROM room_type rt
            LEFT JOIN booking b ON b.roomtype_id = rt.roomtype_id AND b.status_id IN (3,4,8,9)
                                AND YEAR(b.checkin_date) = ?
            GROUP BY rt.roomtype_id, rt.roomtype_name
        `, [selectedYear]);
        res.json({ success: true, data: { monthly, statusCounts, roomStats } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- การจองทั้งหมด (Admin) ---
router.get('/api/admin/bookings', authMiddleware(['admin']), async (req, res) => {
    try {
        const [bookings] = await pool.query(`${BOOKING_SELECT} ORDER BY b.booking_datetime DESC`);
        res.json({ success: true, data: bookings });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;