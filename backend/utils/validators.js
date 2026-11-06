// ==========================================
// utils/validators.js
// ตัวตรวจข้อมูลที่รับจากฟอร์ม (ใช้ร่วมกันทุก route) — ฝั่ง backend คือด่านสุดท้าย
// ต่อให้ผู้ใช้ข้าม frontend ยิง API ตรงๆ ก็ต้องผ่านกฎเหล่านี้
// แต่ละฟังก์ชัน error คืนข้อความภาษาไทย ถ้าผ่านคืน null
// ==========================================

// อีเมล: ภาษาอังกฤษ/ตัวเลข/สัญลักษณ์ . _ % + - เท่านั้น (ห้ามภาษาไทยและอักขระอื่น)
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
// เบอร์โทร: ตัวเลขล้วน ขึ้นต้นด้วย 0 ยาว 9-10 หลัก (09-10 หลักของไทย: มือถือ 10 / เบอร์บ้าน 9)
const PHONE_RE = /^0\d{8,9}$/;
// ชื่อ: อักษรไทย/อังกฤษ เว้นวรรค และ . ' - เท่านั้น (ห้ามตัวเลข/อีโมจิ/สัญลักษณ์แปลกๆ)
const NAME_RE = /^[A-Za-zก-๙][A-Za-zก-๙\s.'-]*$/;

const PREFIXES = ['นาย', 'นาง', 'นางสาว', 'Mr.', 'Mrs.', 'Ms.'];

// ตัดช่องว่างและขีดออก เช่น "081-234 5678" -> "0812345678"
const normalizePhone = (v) => String(v ?? '').replace(/[\s-]/g, '');

function emailError(v, { required = true } = {}) {
    const s = String(v ?? '').trim();
    if (!s) return required ? 'กรุณากรอกอีเมล' : null;
    if (s.length > 50) return 'อีเมลยาวเกินไป (ไม่เกิน 50 ตัวอักษร)';
    if (!EMAIL_RE.test(s)) return 'รูปแบบอีเมลไม่ถูกต้อง (ใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข และ . _ % + -)';
    return null;
}

// รับค่าที่ normalize แล้ว (เรียก normalizePhone ก่อน)
function phoneError(v, { required = true } = {}) {
    const s = String(v ?? '');
    if (!s) return required ? 'กรุณากรอกเบอร์โทร' : null;
    if (!/^\d+$/.test(s)) return 'เบอร์โทรต้องเป็นตัวเลขเท่านั้น';
    if (s.length > 10) return 'เบอร์โทรต้องไม่เกิน 10 หลัก';
    if (!PHONE_RE.test(s)) return 'เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 9-10 หลัก';
    return null;
}

function nameError(label, v, { required = true, max = 50 } = {}) {
    const s = String(v ?? '').trim();
    if (!s) return required ? `กรุณากรอก${label}` : null;
    if (s.length > max) return `${label}ยาวเกินไป (ไม่เกิน ${max} ตัวอักษร)`;
    if (!NAME_RE.test(s)) return `${label}ใช้ได้เฉพาะตัวอักษรไทย/อังกฤษ (ห้ามตัวเลขและสัญลักษณ์พิเศษ)`;
    return null;
}

function prefixError(v) {
    return PREFIXES.includes(v) ? null : 'คำนำหน้าไม่ถูกต้อง';
}

// ---- ตรวจความซ้ำของบัญชี (สมาชิก + พนักงาน ใช้ร่วมกัน) ----
// เบอร์เก่าในฐานข้อมูลอาจมีขีด/เว้นวรรค จึงเทียบแบบตัดขีดและเว้นวรรคออกก่อน
const PHONE_SQL = "REPLACE(REPLACE(phone, '-', ''), ' ', '')";

async function isPhoneTaken(db, phone, { exceptMemberId = null, exceptUserId = null } = {}) {
    const [m] = await db.query(
        `SELECT member_id FROM member WHERE ${PHONE_SQL} = ? AND member_id <> ? LIMIT 1`,
        [phone, exceptMemberId ?? 0]
    );
    if (m.length) return true;
    const [u] = await db.query(
        `SELECT user_id FROM user WHERE ${PHONE_SQL} = ? AND user_id <> ? LIMIT 1`,
        [phone, exceptUserId ?? 0]
    );
    return u.length > 0;
}

async function isEmailTaken(db, email) {
    const [m] = await db.query('SELECT member_id FROM member WHERE email = ? LIMIT 1', [email]);
    if (m.length) return true;
    const [u] = await db.query('SELECT user_id FROM user WHERE email = ? LIMIT 1', [email]);
    return u.length > 0;
}

module.exports = {
    PREFIXES,
    normalizePhone, emailError, phoneError, nameError, prefixError,
    isPhoneTaken, isEmailTaken,
};