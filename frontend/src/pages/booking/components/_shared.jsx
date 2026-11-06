import { useNavigate } from 'react-router-dom';
// ==========================================
// pages/booking/components/_shared.jsx
// ตัวช่วยและป็อปอัพที่ใช้ร่วมกันในขั้นตอนการจอง/ชำระเงิน
// ==========================================
export const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const getToken = () => sessionStorage.getItem('token') || localStorage.getItem('token') || '';
export const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

// ===== Booking Steps =====
export function BookingSteps({ step }) {
  const steps = ['เลือกห้อง', 'ข้อมูลการจอง', 'ชำระเงิน', 'เสร็จสิ้น'];
  return (
    <div className="booking-steps mb-4">
      {steps.map((s, i) => {
        const idx = i + 1;
        const isActive = idx === step;
        const isDone = idx < step;
        return (
          <div key={i} className={`step-item ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}`}>
            <div className="step-circle">
              {isDone ? <i className="bi bi-check-lg" style={{ fontSize: 13 }}></i> : idx}
            </div>
            <div className="step-label">{s}</div>
          </div>
        );
      })}
    </div>
  );
}

// ===== Confirm Booking Popup =====
export function ConfirmBookingPopup({ bookingId, onClose }) {
  const navigate = useNavigate();
  return (
    <div className="popup-overlay">
      <div className="popup-card">
        <div className="popup-icon success"><i className="bi bi-calendar-check-fill"></i></div>
        <h5 style={{ fontFamily: 'Playfair Display', marginBottom: 8 }}>ยืนยันการจองเสร็จสิ้น!</h5>
        <p style={{ color: 'var(--text-mid)', fontSize: 14, marginBottom: 8 }}>
          การจองของคุณได้รับการยืนยันแล้ว กรุณาชำระเงินภายใน 1 ชั่วโมง
        </p>
        <div style={{ background: 'var(--ivory)', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13 }}>
          รหัสการจอง: <strong style={{ color: 'var(--sage-dark)', fontFamily: 'monospace' }}>{bookingId}</strong>
        </div>
        <button className="btn-aurora-primary" onClick={() => { onClose(); navigate(`/payment/${bookingId}`); }}>
          ไปหน้าชำระเงิน
        </button>
      </div>
    </div>
  );
}

// ===== Confirm Pay Popup =====
export function ConfirmPayPopup({ onClose }) {
  const navigate = useNavigate();
  return (
    <div className="popup-overlay">
      <div className="popup-card">
        <div className="popup-icon success"><i className="bi bi-check-circle-fill"></i></div>
        <h5 style={{ fontFamily: 'Playfair Display', marginBottom: 8 }}>ยืนยันการชำระเงินเสร็จสิ้น</h5><br/>
        <button className="btn-aurora-primary" onClick={() => { onClose(); navigate('/member/bookings'); }}>
          ไปหน้าประวัติการจอง
        </button>
      </div>
    </div>
  );
}

// ===== Cancel Confirm Popup =====
export function CancelConfirmPopup({ onConfirm, onClose }) {
  return (
    <div className="popup-overlay">
      <div className="popup-card">
        <div className="popup-icon danger"><i className="bi bi-x-circle-fill"></i></div>
        <h5 style={{ fontFamily: 'Playfair Display', marginBottom: 8 }}>ยืนยันการยกเลิก?</h5>
        <p style={{ color: 'var(--text-mid)', fontSize: 14, marginBottom: 20 }}>
          เมื่อยกเลิกการจอง เงินที่ชำระไปแล้วจะไม่สามารถคืนได้<br />คุณแน่ใจหรือไม่?
        </p>
        <div className="d-flex gap-3 w-100">
          <button className="btn-aurora-secondary flex-1" onClick={onClose}>ไม่ยกเลิก</button>
          <button className="btn-aurora-danger flex-1" onClick={onConfirm}>ยืนยันยกเลิก</button>
        </div>
      </div>
    </div>
  );
}
