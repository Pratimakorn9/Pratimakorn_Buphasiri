// ==========================================
// middleware/auth.js
// ตรวจสอบ JWT Token และสิทธิ์การเข้าถึงตาม role
// พนักงาน/แอดมิน: ตรวจสถานะบัญชีในฐานข้อมูลทุกครั้งด้วย (ถูกระงับแล้วใช้ token เดิมต่อไม่ได้)
// ==========================================
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authMiddleware = (roles = []) => async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'ไม่มี Token' });
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'aurora_secret_key_2025');
    } catch { return res.status(401).json({ success: false, message: 'Token ไม่ถูกต้อง' }); }

    if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์' });
    }

    // FIX: เดิม token ยังใช้ได้อีกถึง 1 วันแม้บัญชีพนักงานถูกระงับไปแล้ว
    // ตอนนี้เช็คสถานะจริงในตาราง user ทุกครั้ง (ถูกระงับ/ไม่มีบัญชีแล้ว = ใช้งานไม่ได้ทันที)
    if (decoded.role !== 'member') {
        try {
            const [rows] = await pool.query('SELECT status FROM user WHERE user_id = ?', [decoded.id]);
            if (!rows.length || rows[0].status !== 'active') {
                return res.status(401).json({ success: false, message: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
            }
        } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
    }

    req.user = decoded;
    next();
};

module.exports = authMiddleware;