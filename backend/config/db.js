// ==========================================
// config/db.js
// การเชื่อมต่อฐานข้อมูล MySQL (connection pool)
// ==========================================
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aurora_hotel_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // FIX: เดิมไม่ตั้งค่านี้ ทำให้ mysql2 แปลงคอลัมน์ DATETIME เป็น JS Date object ตาม timezone ของเครื่อง Node.js
    // แล้วพอ Express ส่ง JSON กลับไป ตัว Date จะถูกแปลงเป็น UTC string อัตโนมัติ ทำให้วันที่เพี้ยนไป 1 วัน
    // (เช่น เที่ยงคืนวันที่ 16 เวลาไทย กลายเป็น 17:00 ของวันที่ 15 ใน UTC)
    // dateStrings: true ทำให้ได้ค่า DATE/DATETIME กลับมาเป็น string ดิบตรงจาก DB ไม่ผ่านการแปลง timezone เลย
    dateStrings: true
});

module.exports = pool;
