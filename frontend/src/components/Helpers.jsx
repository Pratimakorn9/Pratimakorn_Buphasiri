export function StarRating({ rating, size = 'md' }) {
  const sz = size === 'lg' ? 20 : size === 'sm' ? 13 : 16;
  return (
    <div style={{ display: 'inline-flex', gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: sz, color: i <= Math.round(rating) ? '#F0A830' : '#DDD', lineHeight: 1 }}>★</span>
      ))}
    </div>
  );
}

export function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i}
          style={{ fontSize: 28, cursor: 'pointer', color: i <= (hover || value) ? '#F0A830' : '#DDD', transition: 'color 0.15s', lineHeight: 1 }}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}>★</span>
      ))}
    </div>
  );
}

import { useState } from 'react';

export function getStatusBadge(status) {
  const map = {
    PENDING_PAYMENT: ['status-pending', 'รอชำระเงิน'],
    PAYMENT_REVIEW: ['status-review', 'รอตรวจสอบ'],
    CONFIRMED: ['status-confirmed', 'ยืนยันแล้ว'],
    COMPLETED: ['status-completed', 'เสร็จสมบูรณ์'],
    CANCELLED_SYSTEM: ['status-cancelled', 'ยกเลิกการจองโดยระบบ'],
    CANCELLED_ADMIN: ['status-cancelled', 'ยกเลิกโดยโรงแรม'],
    CANCELLED_USER: ['status-cancelled', 'ยกเลิกโดยผู้จอง'],
    CHECKED_IN: ['status-checkin', 'เช็คอินแล้ว'],
    CHECKED_OUT: ['status-checkout', 'เช็คเอาต์แล้ว'],
  };
  const [cls, label] = map[status] || ['status-pending', status];
  return <span className={`status-badge ${cls}`}>{label}</span>;
}

export function formatDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('en-GB'); // เช่น 23/07/2026 (วัน/เดือน/ปี ค.ศ.)
  } catch { return d; }
}

// แสดงวัน+เวลา เช่น 12/10/2026 14:30 น. (รับค่า 'YYYY-MM-DD HH:mm:ss' จากฐานข้อมูล)
export function formatDateTime(d) {
  if (!d) return '-';
  const dt = new Date(String(d).replace(' ', 'T'));
  if (isNaN(dt.getTime())) return String(d);
  const text = dt.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  return `${text.replace(',', '')} น.`;
}

export function formatPrice(n) {
  return Number(n || 0).toLocaleString('th-TH');
}

export function calcNights(checkIn, checkOut) {
  const diff = new Date(checkOut) - new Date(checkIn);
  return Math.max(1, Math.round(diff / 86400000));
}

export function formatGuestSummary(adults, children, rooms) {
  const parts = [`ผู้ใหญ่ ${adults} คน`];
  if (children > 0) parts.push(`เด็ก ${children} คน`);
  parts.push(`ห้อง ${rooms} ห้อง`);
  return parts.join(' ');
}

// FIX: จุดที่อัปโหลดรูป (สลิปโอนเงิน, รูปรีวิว) เดิมแปลงไฟล์เป็น base64 ตรงๆ ด้วย FileReader โดยไม่ย่อขนาดเลย
// รูปถ่ายจากมือถือมักมีขนาด 2-8MB ทำให้ query ไปอัปเดต DB ล้มเหลว (เช่น ชน max_allowed_packet ของ MySQL) กลาย
// เป็น 500 error ตอนกดยืนยัน จึงเพิ่มฟังก์ชันนี้ไว้ย่อ/บีบอัดรูปให้เล็กลงก่อนแปลงเป็น base64 เสมอ
// resize ให้ด้านยาวสุดไม่เกิน maxSize px แล้ว re-encode เป็น JPEG คุณภาพ quality (ไฟล์เล็กลงมาก แต่ยังอ่านสลิปได้ชัดเจน)
export function compressImage(file, { maxSize = 1280, quality = 0.7 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('อ่านไฟล์รูปไม่สำเร็จ'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('โหลดรูปไม่สำเร็จ'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width >= height) { height = Math.round(height * (maxSize / width)); width = maxSize; }
          else { width = Math.round(width * (maxSize / height)); height = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}