// ==========================================
// pages/staff/components/_shared.jsx
// ตัวช่วยและคอมโพเนนต์ที่ใช้ร่วมกันหลายหน้าในโซน Staff
// (API helper, Popup แจ้งเตือน, Sidebar, Modal รายละเอียดการจอง, รูป QR จ่ายเงิน)
// ==========================================
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import { getStatusBadge, formatPrice, formatDate, formatDateTime } from '../../../components/Helpers';
import logoImg from '/logoaurora.png';
import qrImg from '/qr-payment.png';

export const QR_PAYMENT_IMG = qrImg;
export const LOGO_IMG = logoImg;
export const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const apiFetch = async (path, options = {}) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'เกิดข้อผิดพลาด');
  }
  return data;
};

// ===== Popup Component =====
// ใช้แสดง dialog ยืนยัน/แจ้งเตือน ทุกหน้าใน Staff
export function Popup({ icon, iconClass, title, message, children, onClose }) {
  return (
    <div className="popup-overlay">
      <div className="popup-card" style={{ position: 'relative' }}>
        {onClose && (
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.07)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
            <i className="bi bi-x-lg"></i>
          </button>
        )}
        <div className={`popup-icon ${iconClass} mx-auto`}><i className={icon}></i></div>
        <h5 style={{ fontFamily: 'Playfair Display', marginBottom: 8 }}>{title}</h5>
        {message && <p style={{ color: 'var(--text-mid)', fontSize: 14, marginBottom: 20 }}>{message}</p>}
        {/* ครอบ children ด้วย flex center เพื่อให้ปุ่มอยู่ตรงกลางเสมอ */}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ===== Staff Sidebar =====
export function StaffSidebar() {
  const { currentUser, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const items = [
    { to: '/staff', icon: 'bi-grid', label: 'ภาพรวม', exact: true },
    { to: '/staff/bookings', icon: 'bi-calendar-check', label: 'การจองทั้งหมด' },
    { to: '/staff/checkin', icon: 'bi-box-arrow-in-right', label: 'เช็คอิน / เช็คเอาต์' },
    { to: '/staff/payments', icon: 'bi-credit-card', label: 'ตรวจสอบชำระเงิน' },
    { to: '/staff/new-booking', icon: 'bi-calendar-plus', label: 'จองให้ลูกค้า' },
    { to: '/staff/receipt', icon: 'bi-receipt', label: 'ออกใบเสร็จ' },
    { to: '/staff/reports', icon: 'bi-bar-chart', label: 'รายงาน' },
  ];
  const isActive = (item) => item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  return (
    <div className="dashboard-left">
      {/* header ของ sidebar — แสดงโลโก้, ชื่อโรงแรม และข้อมูลพนักงาน */}
      <div className="sidebar-header" style={{ background: '#FFFFFF', borderBottom: '1px solid var(--ivory-dark)' }}>
        <img src={logoImg} alt="Aurora Grand Hotel"
          style={{    height: 44, 
                      width: 'auto', 
                      objectFit: 'contain', 
                      marginBottom: 8,
                      background: 'var(--navy)',
                      borderRadius: 6,
                      padding: '2px 4px' }} />
        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--navy)', marginBottom: 10, letterSpacing: 0.5 }}>Aurora Grand Hotel</div>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #4A9EFF, #2866CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'white', margin: '0 auto 8px', border: '2px solid rgba(255,255,255,0.25)' }}>
          {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
        </div>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{currentUser?.firstName} {currentUser?.lastName}</div>
        <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2, color: 'var(--text-mid)' }}>{currentUser?.email}</div>
        <div className="mt-1"><span className="status-badge status-review" style={{ fontSize: 10 }}>พนักงานต้อนรับ</span></div>
      </div>
      <div style={{ flex: 1 }}>
        {items.map(item => (
          <Link key={item.to} to={item.to} className={`sidebar-nav-item ${isActive(item) ? 'active' : ''}`}>
            <i className={item.icon}></i>{item.label}
          </Link>
        ))}
        <div style={{ borderTop: '1px solid var(--ivory-dark)', margin: '8px 0' }}>
          {/* ไม่มีปุ่มหน้าหลัก — พนักงานใช้งานผ่าน dashboard เท่านั้น */}
          <button className="sidebar-nav-item" style={{ color: 'var(--danger)' }} onClick={() => { logout(); navigate('/'); }}>
            <i className="bi bi-box-arrow-right"></i>ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Booking Detail Modal =====
export function BookingDetailModal({ booking: b, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: 520 }}>
        <div className="modal-card-header">
          <button className="modal-close-btn" onClick={onClose}><i className="bi bi-x-lg"></i></button>
          <h5 style={{ fontFamily: 'Playfair Display', margin: 0 }}>รายละเอียดการจอง</h5>
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4, fontFamily: 'monospace' }}>#{b.id}</div>
        </div>
        <div className="modal-body">
          <div className="row g-3" style={{ fontSize: 14 }}>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>ชื่อผู้จอง</div><div style={{ fontWeight: 700 }}>{b.contactName || b.userName}</div></div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>สถานะ</div>{getStatusBadge(b.status)}</div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>อีเมล</div>{b.contactEmail || b.userEmail || '-'}</div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>เบอร์โทร</div>{b.contactPhone || '-'}</div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>ห้องพัก</div><div style={{ fontWeight: 700 }}>{b.roomName}</div></div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>ผู้เข้าพัก</div>ผู้ใหญ่ {b.adults} คน{b.children > 0 ? ` เด็ก ${b.children} คน` : ''}</div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>เช็คอิน</div>{formatDate(b.checkIn)}</div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>เช็คเอาต์</div>{formatDate(b.checkOut)}</div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>จำนวนคืน</div>{b.nights} คืน</div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>จำนวนห้อง</div>{b.rooms || 1} ห้อง</div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>เวลาที่จอง</div>{formatDateTime(b.createdAt)}</div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>เลขห้องที่เข้าพัก</div><div style={{ fontWeight: 700 }}>{b.roomNumbers || '-'}</div></div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>เวลาเช็คอิน</div>{formatDateTime(b.actualCheckIn)}</div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>เวลาเช็คเอาต์</div>{formatDateTime(b.actualCheckOut)}</div>
            {b.specialRequest && <div className="col-12"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>คำขอพิเศษ</div><div style={{ background: 'var(--ivory)', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>{b.specialRequest}</div></div>}

            {/* แสดงรูปสลิปการชำระเงิน ถ้ามี */}
            {b.slipUrl && (
              <div className="col-12">
                <div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
                  <i className="bi bi-receipt me-1"></i>หลักฐานการชำระเงิน
                </div>
                <img
                  src={b.slipUrl}
                  alt="สลิปการชำระเงิน"
                  style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 10, border: '1px solid var(--ivory-dark)', background: 'var(--ivory)', cursor: 'zoom-in' }}
                  onClick={() => window.open(b.slipUrl, '_blank')}
                />
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
                  <i className="bi bi-zoom-in me-1"></i>คลิกรูปเพื่อขยาย
                </div>
              </div>
            )}
            {!b.slipUrl && b.status === 'PAYMENT_REVIEW' && (
              <div className="col-12">
                <div style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--warning)' }}>
                  <i className="bi bi-exclamation-triangle me-2"></i>ยังไม่มีรูปสลิปแนบมา
                </div>
              </div>
            )}
            <div className="col-12" style={{ borderTop: '1px solid var(--ivory-dark)', paddingTop: 12 }}>
              <div className="d-flex justify-content-between align-items-center">
                <span style={{ fontWeight: 700 }}>ยอดชำระทั้งหมด</span>
                <span style={{ fontFamily: 'Playfair Display', fontSize: 22, fontWeight: 700, color: 'var(--warm-dark)' }}>฿{formatPrice(b.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}