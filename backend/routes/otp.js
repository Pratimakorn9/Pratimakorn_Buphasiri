// ==========================================
// routes/otp.js
// ระบบ OTP ทางอีเมล: ส่งรหัส, ยืนยันรหัส, รีเซ็ตรหัสผ่าน
// ==========================================
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { createTransporter } = require('../config/mailer');

const { emailError } = require('../utils/validators');
const router = express.Router();

// ==========================================
// OTP Store (in-memory)
// ==========================================
const otpStore = new Map(); // email → { code, expiresAt }

// ส่ง OTP ทางอีเมล
router.post('/api/otp/send', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'กรุณาระบุอีเมล' });
        const emailErr = emailError(email);
        if (emailErr) return res.status(400).json({ success: false, message: emailErr });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // หมดอายุใน 5 นาที
        otpStore.set(email, { code, expiresAt });

        // ถ้าไม่ได้ตั้งค่า EMAIL_USER ใน .env → fallback เป็น demo mode
        if (!process.env.EMAIL_USER) {
            console.log(`[OTP Demo] ${email} → ${code}`);
            return res.json({ success: true, demo: true, message: 'Demo mode: ดู OTP ใน console ของ backend' });
        }

        const transporter = createTransporter();
        await transporter.sendMail({
            from: `"Aurora Grand Hotel" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'รหัส OTP สำหรับสมัครสมาชิก Aurora Grand Hotel',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <div style="background: #2C3E50; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h2 style="color: gold; margin: 0; font-family: Georgia;">Aurora Grand Hotel</h2>
                    </div>
                    <div style="background: #f9f9f9; padding: 32px; text-align: center; border-radius: 0 0 8px 8px;">
                        <p style="font-size: 16px; color: #333;">รหัส OTP สำหรับยืนยันการสมัครสมาชิก</p>
                        <div style="background: white; border: 2px dashed #7BA987; border-radius: 12px; padding: 20px; margin: 20px 0;">
                            <h1 style="color: #2C3E50; font-size: 42px; letter-spacing: 12px; margin: 0;">${code}</h1>
                        </div>
                        <p style="color: #888; font-size: 13px;">รหัสนี้จะหมดอายุใน <strong>5 นาที</strong></p>
                        <p style="color: #888; font-size: 12px;">หากคุณไม่ได้ทำรายการนี้ กรุณาเพิกเฉยต่ออีเมลนี้</p>
                    </div>
                </div>
            `,
        });

        res.json({ success: true, message: `ส่ง OTP ไปที่ ${email} แล้ว` });
    } catch (error) {
        console.error('OTP send error:', error.message);
        res.status(500).json({ success: false, message: 'ส่งอีเมลไม่สำเร็จ: ' + error.message });
    }
});

// ยืนยัน OTP
router.post('/api/otp/verify', (req, res) => {
    const { email, code } = req.body;
    const stored = otpStore.get(email);

    if (!stored) return res.status(400).json({ success: false, message: 'ไม่พบ OTP กรุณาขอใหม่' });
    if (Date.now() > stored.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ success: false, message: 'OTP หมดอายุแล้ว กรุณาขอใหม่' });
    }
    if (stored.code !== code) return res.status(400).json({ success: false, message: 'รหัส OTP ไม่ถูกต้อง' });

    // mark verified แต่ยังไม่ลบ เผื่อ reset-password ต้องใช้
    stored.verified = true;
    otpStore.set(email, stored);
    res.json({ success: true, message: 'OTP ถูกต้อง' });
});

// รีเซ็ตรหัสผ่าน (หลังยืนยัน OTP แล้ว)
router.post('/api/reset-password', async (req, res) => {
    try {
        const { email, new_password } = req.body;
        if (!email || !new_password) return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบ' });
        if (new_password.length < 6) return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัว' });

        // FIX: เดิม endpoint นี้เปลี่ยนรหัสผ่านได้ทันทีโดยไม่เช็คว่ายืนยัน OTP แล้วหรือยัง
        // (ใครก็ยิง POST เปลี่ยนรหัสผ่านบัญชีคนอื่นได้เลยโดยไม่ต้องรู้ OTP) ต้องเช็ค verified ก่อนเสมอ
        const stored = otpStore.get(email);
        if (!stored || !stored.verified) {
            return res.status(400).json({ success: false, message: 'กรุณายืนยัน OTP ก่อนตั้งรหัสผ่านใหม่' });
        }
        if (Date.now() > stored.expiresAt) {
            otpStore.delete(email);
            return res.status(400).json({ success: false, message: 'OTP หมดอายุแล้ว กรุณาขอใหม่' });
        }

        const hashed = await bcrypt.hash(new_password, 10);

        // ลองเปลี่ยนใน member ก่อน
        const [mResult] = await pool.query('UPDATE member SET password=? WHERE email=?', [hashed, email]);
        if (mResult.affectedRows > 0) {
            otpStore.delete(email);
            return res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
        }
        // ถ้าไม่เจอใน member ลอง user (staff/admin)
        const [uResult] = await pool.query('UPDATE user SET password=? WHERE email=?', [hashed, email]);
        if (uResult.affectedRows > 0) {
            otpStore.delete(email);
            return res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
        }
        return res.status(404).json({ success: false, message: 'ไม่พบบัญชีนี้ในระบบ' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;