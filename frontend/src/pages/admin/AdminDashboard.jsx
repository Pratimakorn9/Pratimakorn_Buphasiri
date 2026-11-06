// ==========================================
// pages/admin/AdminDashboard.jsx
// หน้าแดชบอร์ดสรุปภาพรวมของแอดมิน
// ==========================================
import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getStatusBadge, formatPrice, formatDate, formatDateTime } from '../../components/Helpers';
import { API, apiFetch, Popup, AdminSidebar, BookingDetailModal, RoomForm } from './components/_shared';


// ===== ADMIN DASHBOARD =====
export function AdminDashboard() {
  const { bookings, refreshBookings } = useApp();
  const [stats, setStats] = useState({ total_members: 0, total_staff: 0, pending_payment: 0, total_revenue: 0 });
  const [roomTypes, setRoomTypes] = useState([]);
  const [detailBooking, setDetailBooking] = useState(null);

  useEffect(() => {
    refreshBookings(); // โหลดรายการจองล่าสุดทุกครั้งที่เปิดหน้านี้
    apiFetch('/admin/stats').then(d => { if (d.success) setStats(d.data); }).catch(() => {});
    apiFetch('/room-types').then(d => { if (d.success) setRoomTypes(d.data); }).catch(() => {});
  }, [refreshBookings]);

  const statCards = [
    { icon: 'bi-people-fill', label: 'สมาชิก', val: stats.total_members, color: '#28C76F' },
    { icon: 'bi-person-badge', label: 'พนักงาน', val: stats.total_staff, color: '#4A9EFF' },
    { icon: 'bi-hourglass-split', label: 'รอตรวจสอบ', val: stats.pending_payment, color: '#FF9F43' },
    { icon: 'bi-currency-exchange', label: 'รายได้รวม', val: `฿${Math.round(stats.total_revenue / 1000)}K`, color: 'var(--warm)' },
  ];

  return (
    <div className="dashboard-page">
      <AdminSidebar />
      <div className="dashboard-right">
        <div className="dash-top-bar">
          <h4 style={{ fontFamily: 'Playfair Display', margin: 0 }}>ภาพรวมระบบ</h4>
          <span style={{ fontSize: 13, color: 'var(--text-light)' }}>{formatDate(new Date())}</span>
        </div>
        <div className="row g-3 mb-4">
          {statCards.map((s, i) => (
            <div key={i} className="col-6 col-xl-3">
              <div className="stat-card">
                <i className={s.icon} style={{ fontSize: 24, color: s.color, marginBottom: 8, display: 'block' }}></i>
                <div className="stat-number" style={{ fontSize: '2rem' }}>{s.val}</div>
                <div style={{ fontSize: 13, color: 'var(--text-light)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="row g-4">
          <div className="col-md-5">
            <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
              <h6 style={{ fontWeight: 700, marginBottom: 12 }}>ประเภทห้องพัก</h6>
              {roomTypes.map(r => (
                <div key={r.roomtype_id} className="d-flex justify-content-between align-items-center py-2" style={{ borderBottom: '1px solid var(--ivory-dark)', fontSize: 14 }}>
                  <span>{r.roomtype_name}</span>
                  <div className="d-flex gap-2 align-items-center">
                    <span style={{ color: 'var(--warm-dark)', fontWeight: 700 }}>฿{formatPrice(r.price || 0)}</span>
                    <span style={{ fontSize: 12, color: r.available_rooms > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {r.available_rooms > 0 ? `ว่าง ${r.available_rooms}` : 'เต็ม'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="col-md-7">
            <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
              <h6 style={{ fontWeight: 700, marginBottom: 12 }}>การจองล่าสุด <span style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 400 }}>คลิกเพื่อดูรายละเอียด</span></h6>
              {bookings.slice(0, 6).map(b => (
                <div key={b.id} className="d-flex justify-content-between align-items-center py-2" style={{ borderBottom: '1px solid var(--ivory-dark)', fontSize: 13, cursor: 'pointer' }} onClick={() => setDetailBooking(b)}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{b.contactName || b.userName}</div>
                    <div style={{ color: 'var(--text-light)', fontSize: 12 }}>{b.roomName} ({b.rooms || 1} ห้อง) · {formatDate(b.checkIn)}</div>
                    <div style={{ color: 'var(--text-light)', fontSize: 11 }}>จองเมื่อ {formatDateTime(b.createdAt)}</div>
                  </div>
                  {getStatusBadge(b.status)}
                </div>
              ))}
              {bookings.length === 0 && <p style={{ color: 'var(--text-light)', fontSize: 14 }}>ยังไม่มีข้อมูล</p>}
            </div>
          </div>
        </div>
      </div>
      {detailBooking && <BookingDetailModal booking={detailBooking} onClose={() => setDetailBooking(null)} />}
    </div>
  );
}