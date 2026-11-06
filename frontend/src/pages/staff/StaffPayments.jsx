// ==========================================
// pages/staff/StaffPayments.jsx
// ตรวจสอบและยืนยันการชำระเงิน
// ==========================================
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getStatusBadge, formatPrice, formatDate, formatDateTime } from '../../components/Helpers';
import { API, apiFetch, Popup, StaffSidebar, BookingDetailModal, QR_PAYMENT_IMG } from './components/_shared';

// ===== STAFF PAYMENTS =====
export function StaffPayments() {
  const { bookings, confirmPayment, cancelBooking, refreshBookings } = useApp();
  // โหลดรายการรอตรวจสอบล่าสุดทุกครั้งที่เปิดหน้านี้
  useEffect(() => { refreshBookings(); }, [refreshBookings]);
  const [cancelPopup, setCancelPopup] = useState(null);
  const [detailBooking, setDetailBooking] = useState(null);
  const [confirmSuccessPopup, setConfirmSuccessPopup] = useState(null);
  const pending = bookings.filter(b => b.status === 'PAYMENT_REVIEW').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // FIX: เดิมไม่ await/เช็ค error เลย กด "ยืนยัน" แล้วเด้ง popup สำเร็จทันทีไม่ว่า backend จะรับจริงหรือไม่
  const handleConfirmPay = async (b) => {
    try {
      await confirmPayment(b.id);
      setConfirmSuccessPopup(b);
    } catch (err) {
      alert(err.message || 'ยืนยันการชำระเงินไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  const handleCancelBooking = async () => {
    try {
      await cancelBooking(cancelPopup, 'CANCELLED_ADMIN');
      setCancelPopup(null);
    } catch (err) {
      alert(err.message || 'ยกเลิกไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  return (
    <div className="dashboard-page">
      <StaffSidebar />
      <div className="dashboard-right">
        <div className="dash-top-bar">
          <h4 style={{ fontFamily: 'Playfair Display', margin: 0 }}>ตรวจสอบชำระเงิน</h4>
          <span style={{ background: 'rgba(255,159,67,0.15)', color: '#E65100', border: '1px solid rgba(255,159,67,0.3)', padding: '4px 14px', borderRadius: 50, fontSize: 13, fontWeight: 700 }}>รอตรวจสอบ {pending.length} รายการ</span>
        </div>
        <div className="d-flex flex-column gap-3">
          {pending.map(b => (
            <div key={b.id} style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: 22, boxShadow: 'var(--shadow-sm)', border: '1px solid rgba(255,159,67,0.2)' }}>
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setDetailBooking(b)}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{b.contactName || b.userName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)', fontFamily: 'monospace', marginBottom: 8 }}>#{b.id}</div>
                  <div style={{ fontSize: 14, marginBottom: 4 }}>
                    <i className="bi bi-building me-1" style={{ color: 'var(--sage)' }}></i><span>{b.roomName} ({b.rooms || 1} ห้อง)</span>
                    <span className="ms-3" style={{ color: 'var(--text-light)', fontSize: 13 }}><i className="bi bi-calendar3 me-1"></i>{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 2 }}>
                    <i className="bi bi-clock me-1"></i>จองเมื่อ {formatDateTime(b.createdAt)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                    <i className="bi bi-envelope me-1"></i>{b.contactEmail || b.userEmail || '-'}
                    {(b.contactPhone) && <span className="ms-3"><i className="bi bi-phone me-1"></i>{b.contactPhone}</span>}
                  </div>
                  <div style={{ fontFamily: 'Playfair Display', fontSize: 22, fontWeight: 700, color: 'var(--warm-dark)', marginTop: 8 }}>
                    ฿{formatPrice(b.totalAmount)}
                  </div>
                </div>
                <div className="d-flex flex-column gap-2">
                  <button className="btn btn-success btn-sm" style={{ borderRadius: 8, fontWeight: 600 }} onClick={() => handleConfirmPay(b)}>
                    <i className="bi bi-check-lg me-1"></i>ยืนยัน
                  </button>
                  <button className="btn btn-outline-danger btn-sm" style={{ borderRadius: 8 }} onClick={() => setCancelPopup(b.id)}>
                    <i className="bi bi-x-lg me-1"></i>ยกเลิก
                  </button>
                  <button className="btn btn-outline-secondary btn-sm" style={{ borderRadius: 8, fontSize: 11 }} onClick={() => setDetailBooking(b)}>
                    <i className="bi bi-info-circle me-1"></i>ข้อมูล
                  </button>
                </div>
              </div>
            </div>
          ))}
          {pending.length === 0 && <div className="empty-state"><i className="bi bi-check-circle"></i><h5>ไม่มีรายการรอตรวจสอบ</h5></div>}
        </div>
      </div>

      {/* Cancel Popup */}
      {cancelPopup && (
        <Popup icon="bi-x-circle-fill" iconClass="danger" title="ยืนยันการยกเลิก?" message="ต้องการยกเลิกการชำระเงินและยกเลิกการจองนี้หรือไม่?" onClose={() => setCancelPopup(null)}>
          <div className="d-flex gap-3 w-100">
            <button className="btn-aurora-secondary flex-1" onClick={() => setCancelPopup(null)}>ไม่</button>
            <button className="btn-aurora-danger flex-1" onClick={handleCancelBooking}>ยืนยัน</button>
          </div>
        </Popup>
      )}

      {/* Confirm Success Popup */}
      {confirmSuccessPopup && (
        <Popup icon="bi-check-circle-fill" iconClass="success" title="ยืนยันการชำระเงินสำเร็จ!" onClose={() => setConfirmSuccessPopup(null)}>
          <div style={{ background: 'var(--ivory)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{confirmSuccessPopup.contactName || confirmSuccessPopup.userName}</div>
            <div style={{ color: 'var(--text-mid)' }}>{confirmSuccessPopup.roomName} · {formatDate(confirmSuccessPopup.checkIn)} → {formatDate(confirmSuccessPopup.checkOut)}</div>
            <div style={{ fontWeight: 700, color: 'var(--warm-dark)', marginTop: 4 }}>฿{formatPrice(confirmSuccessPopup.totalAmount)}</div>
          </div>
          <button className="btn-aurora-primary" onClick={() => setConfirmSuccessPopup(null)}>ตกลง</button>
        </Popup>
      )}

      {detailBooking && <BookingDetailModal booking={detailBooking} onClose={() => setDetailBooking(null)} />}
    </div>
  );
}