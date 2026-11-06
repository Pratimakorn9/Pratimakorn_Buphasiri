// ==========================================
// config/mailer.js
// ตัวส่งอีเมล (Nodemailer) สำหรับ OTP ผ่าน Gmail
// ==========================================
const nodemailer = require('nodemailer');

const createTransporter = () => nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Gmail App Password
    },
});

module.exports = { createTransporter };
