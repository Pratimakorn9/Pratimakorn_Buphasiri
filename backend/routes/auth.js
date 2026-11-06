// ==========================================
// routes/auth.js
// สมัครสมาชิก, เข้าสู่ระบบ, แก้ไขข้อมูล/รหัสผ่านสมาชิก
// ==========================================
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { normalizePhone, emailError, phoneError, nameError, prefixError, isPhoneTaken, isEmailTaken } = require('../utils/validators');

const router = express.Router();

// ==========================================
// 1. AUTH — สมาชิก
// ==========================================
router.post('/api/register', async (req, res) => {
    try {
        const { prefix, password } = req.body;
        const firstname = String(req.body.firstname ?? '').trim();
        const lastname = String(req.body.lastname ?? '').trim();
        const email = String(req.body.email ?? '').trim();
        const phone = normalizePhone(req.body.phone);
        if (!prefix || !firstname || !lastname || !email || !password || !phone)
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });

        // ตรวจรูปแบบข้อมูลทุกช่องที่ฝั่ง server (ห้ามเชื่อ frontend อย่างเดียว)
        const formatError = prefixError(prefix) || nameError('ชื่อ', firstname) || nameError('นามสกุล', lastname)
            || emailError(email) || phoneError(phone);
        if (formatError) return res.status(400).json({ success: false, message: formatError });
        if (String(password).length < 6 || String(password).length > 100)
            return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมี 6-100 ตัวอักษร' });

        // อีเมลและเบอร์ต้องไม่ซ้ำกับบัญชีใดๆ (ทั้งสมาชิกและพนักงาน)
        if (await isEmailTakenisEmailTaken(pool, email)) return res.status(400).json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });
        if (await isPhoneTaken(pool, phone)) return res.status(400).json({ success: false, message: 'เบอร์โทรนี้ถูกใช้งานแล้ว' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO member (prefix, firstname, lastname, email, password, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [prefix, firstname, lastname, email, hashedPassword, phone]
        );
        res.status(201).json({ success: true, message: 'สมัครสมาชิกสำเร็จ!', member_id: result.insertId });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ตรวจว่าอีเมล/เบอร์โทรถูกใช้แล้วหรือยัง (เรียกก่อนส่ง OTP ตอนสมัครสมาชิก)
router.post('/api/check-availability', async (req, res) => {
    try {
        const email = String(req.body.email ?? '').trim();
        const phone = normalizePhone(req.body.phone);
        const errors = {};
        if (email && await isEmailTaken(pool, email)) errors.email = 'อีเมลนี้ถูกใช้งานแล้ว';
        if (phone && await isPhoneTaken(pool, phone)) errors.phone = 'เบอร์โทรนี้ถูกใช้งานแล้ว';
        res.json({ success: Object.keys(errors).length === 0, errors });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// Login — รองรับทั้ง member และ user (staff/admin)
router.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // ลอง member ก่อน
        let [rows] = await pool.query('SELECT * FROM member WHERE email = ?', [email]);
        if (rows.length > 0) {
            const user = rows[0];
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
            const userData = { id: user.member_id, prefix: user.prefix, email: user.email, firstname: user.firstname, lastname: user.lastname, phone: user.phone, role: 'member' };
            const token = jwt.sign(userData, process.env.JWT_SECRET || 'aurora_secret_key_2025', { expiresIn: '1d' });
            return res.json({ success: true, token, user: userData });
        }
        // ลอง user (staff/admin)
        // ค้นหาทุกสถานะ แล้วค่อยตรวจสถานะหลังรหัสผ่านถูก (คนที่ไม่รู้รหัสผ่านจะไม่ได้รู้ว่าบัญชีนี้ถูกระงับ)
        [rows] = await pool.query('SELECT * FROM user WHERE email = ?', [email]);
        if (rows.length > 0) {
            const user = rows[0];
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
            if (user.status !== 'active') {
                return res.status(403).json({ success: false, message: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
            }
            const userData = { id: user.user_id, prefix: user.prefix, email: user.email, firstname: user.firstname, lastname: user.lastname, phone: user.phone, role: user.role };
            const token = jwt.sign(userData, process.env.JWT_SECRET || 'aurora_secret_key_2025', { expiresIn: '1d' });
            return res.json({ success: true, token, user: userData });
        }
        return res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// Update member profile
router.put('/api/member/:id', authMiddleware(['member']), async (req, res) => {
    try {
        // FIX: เดิมไม่เช็คว่า :id ใน URL ตรงกับสมาชิกที่ถือ token อยู่หรือไม่ (IDOR)
        // ทำให้สมาชิกคนไหนก็เปลี่ยนเลข id เป็นของคนอื่นแล้วแก้ชื่อ/เบอร์โทรของคนอื่นได้ จึงเพิ่มการเช็คก่อนอัปเดต
        if (String(req.user.id) !== String(req.params.id)) {
            return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์' });
        }
        const { prefix } = req.body;
        const firstname = String(req.body.firstname ?? '').trim();
        const lastname = String(req.body.lastname ?? '').trim();
        const phone = normalizePhone(req.body.phone);
        const formatError = prefixError(prefix) || nameError('ชื่อ', firstname) || nameError('นามสกุล', lastname)
            || phoneError(phone);
        if (formatError) return res.status(400).json({ success: false, message: formatError });
        // เบอร์ต้องไม่ซ้ำกับบัญชีอื่น (ยกเว้นของตัวเอง)
        if (await isPhoneTaken(pool, phone, { exceptMemberId: Number(req.params.id) })) {
            return res.status(400).json({ success: false, message: 'เบอร์โทรนี้ถูกใช้งานแล้ว' });
        }
        await pool.query('UPDATE member SET prefix=?, firstname=?, lastname=?, phone=? WHERE member_id=?',
            [prefix, firstname, lastname, phone, req.params.id]);
        res.json({ success: true, message: 'อัปเดตโปรไฟล์สำเร็จ' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// Change password member
router.put('/api/member/:id/password', authMiddleware(['member']), async (req, res) => {
    try {
        // FIX: เดิมไม่เช็คว่า :id ใน URL ตรงกับเจ้าของ token (IDOR) แม้ต้องรู้ current_password ของเป้าหมายอยู่ก่อน
        // ก็ควรกันไว้อีกชั้นไม่ให้ยิง API แก้รหัสผ่านบัญชีอื่นได้เลยตั้งแต่ต้น
        if (String(req.user.id) !== String(req.params.id)) {
            return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์' });
        }
        const { current_password, new_password } = req.body;
        if (!new_password || String(new_password).length < 6 || String(new_password).length > 100)
            return res.status(400).json({ success: false, message: 'รหัสผ่านใหม่ต้องมี 6-100 ตัวอักษร' });
        const [rows] = await pool.query('SELECT password FROM member WHERE member_id=?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบบัญชี' });
        const isMatch = await bcrypt.compare(current_password, rows[0].password);
        if (!isMatch) return res.status(400).json({ success: false, message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
        const hashed = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE member SET password=? WHERE member_id=?', [hashed, req.params.id]);
        res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;