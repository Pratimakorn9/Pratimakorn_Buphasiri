// ==========================================
// utils/validators.js
// ตัวกรองและตัวตรวจข้อมูลฟอร์ม (frontend) — กฎต้องตรงกับ backend/utils/validators.js
// sanitizeXxx  = กรองตัวอักษรที่ไม่อนุญาตทิ้ง "ตอนพิมพ์" (พิมพ์ภาษาไทยในช่องอีเมลแล้วไม่ขึ้น)
// xxxError     = ตรวจตอนกดส่งฟอร์ม คืนข้อความผิดพลาดภาษาไทย หรือ '' ถ้าผ่าน
// ==========================================

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const PHONE_RE = /^0\d{8,9}$/;
const NAME_RE = /^[A-Za-zก-๙][A-Za-zก-๙\s.'-]*$/;

// ---------- กรองตอนพิมพ์ ----------
export const sanitizeEmail = (v) => String(v ?? '').replace(/[^A-Za-z0-9._%+@-]/g, '').slice(0, 50);
export const sanitizePhone = (v) => String(v ?? '').replace(/\D/g, '').slice(0, 10);
export const sanitizeName = (v, max = 50) => String(v ?? '').replace(/[^A-Za-zก-๙\s.'-]/g, '').slice(0, max);

// "081-234 5678" -> "0812345678"
export const normalizePhone = (v) => String(v ?? '').replace(/[\s-]/g, '');

// ---------- ตรวจตอนส่งฟอร์ม ----------
export function emailError(v, { required = true } = {}) {
  const s = String(v ?? '').trim();
  if (!s) return required ? 'กรุณากรอกอีเมล' : '';
  if (s.length > 50) return 'อีเมลยาวเกินไป (ไม่เกิน 50 ตัวอักษร)';
  if (!EMAIL_RE.test(s)) return 'รูปแบบอีเมลไม่ถูกต้อง (ใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข และ . _ % + -)';
  return '';
}

export function phoneError(v, { required = true } = {}) {
  const s = normalizePhone(v);
  if (!s) return required ? 'กรุณากรอกเบอร์โทร' : '';
  if (!/^\d+$/.test(s)) return 'เบอร์โทรต้องเป็นตัวเลขเท่านั้น';
  if (s.length > 10) return 'เบอร์โทรต้องไม่เกิน 10 หลัก';
  if (!PHONE_RE.test(s)) return 'เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 9-10 หลัก';
  return '';
}

export function nameError(label, v, { required = true, max = 50 } = {}) {
  const s = String(v ?? '').trim();
  if (!s) return required ? `กรุณากรอก${label}` : '';
  if (s.length > max) return `${label}ยาวเกินไป (ไม่เกิน ${max} ตัวอักษร)`;
  if (!NAME_RE.test(s)) return `${label}ใช้ได้เฉพาะตัวอักษรไทย/อังกฤษ (ห้ามตัวเลขและสัญลักษณ์พิเศษ)`;
  return '';
}