// ==========================================
// pages/staff/StaffDashboard.jsx
// หน้าแดชบอร์ดสรุปภาพรวมของพนักงาน
// ==========================================
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getStatusBadge, formatPrice, formatDate, formatDateTime } from '../../components/Helpers';
import { API, apiFetch, Popup, StaffSidebar, BookingDetailModal, QR_PAYMENT_IMG } from './components/_shared';

// ===== STAFF DASHBOARD =====
export function StaffDashboard() {
  const { bookings, refreshBookings } = useApp();
  const [detailBooking, setDetailBooking] = useState(null);
  const [stats, setStats] = useState({ pending_payment: 0, total_members: 0, today_checkin: 0, total_revenue: 0 });
  useEffect(() => {
    refreshBookings(); // โหลดรายการจองล่าสุดทุกครั้งที่เปิดหน้านี้
    apiFetch('/staff/stats').then(d => { if (d.success) setStats(d.data); }).catch(() => {});
  }, [refreshBookings]);
  const statsList = [
    { icon: 'bi-calendar-check', label: 'เช็คอินวันนี้', val: stats.today_checkin, color: '#4A9EFF' },
    { icon: 'bi-hourglass-split', label: 'รอตรวจสอบ', val: stats.pending_payment, color: '#FF9F43' },
    { icon: 'bi-people', label: 'สมาชิกทั้งหมด', val: stats.total_members, color: 'var(--sage)' },
    { icon: 'bi-currency-exchange', label: 'รายได้รวม', val: `฿${Math.round(stats.total_revenue / 1000)}K`, color: 'var(--warm)' },
  ];
  const recent = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

  return (
    <div className="dashboard-page">
      <StaffSidebar />
      <div className="dashboard-right">
        <div className="dash-top-bar">
          <h4 style={{ fontFamily: 'Playfair Display', margin: 0 }}>ภาพรวมระบบ</h4>
          <span style={{ fontSize: 13, color: 'var(--text-light)' }}>{formatDate(new Date())}</span>
        </div>
        <div className="row g-3 mb-4">
          {statsList.map((s, i) => (
            <div key={i} className="col-6 col-xl-3">
              <div className="stat-card">
                <i className={s.icon} style={{ fontSize: 22, color: s.color, marginBottom: 8, display: 'block' }}></i>
                <div className="stat-number" style={{ fontSize: '1.7rem' }}>{s.val}</div>
                <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 22, boxShadow: 'var(--shadow-sm)' }}>
          <h6 style={{ fontWeight: 700, marginBottom: 14 }}>การจองล่าสุด <span style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 400 }}>คลิกเพื่อดูรายละเอียด</span></h6>
          <div className="aurora-table">
            <table className="table table-hover mb-0">
              <thead><tr><th>รหัส</th><th>ชื่อ</th><th>ห้อง</th><th>เวลาจอง</th><th>เช็คอิน</th><th>ยอด</th><th>สถานะ</th></tr></thead>
              <tbody>
                {recent.map(b => (
                  <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => setDetailBooking(b)}>
                    <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{b.id}</td>
                    <td><div style={{ fontWeight: 600 }}>{b.contactName || b.userName}</div><div style={{ fontSize: 11, color: 'var(--text-light)' }}>{b.contactEmail || b.userEmail}</div></td>
                    <td>
                      <div>{b.roomName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{b.rooms || 1} ห้อง{b.roomNumbers ? ` · เลขห้อง ${b.roomNumbers}` : ''}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>{formatDateTime(b.createdAt)}</td>
                    <td>{formatDate(b.checkIn)}</td>
                    <td style={{ fontWeight: 700 }}>฿{formatPrice(b.totalAmount)}</td>
                    <td>{getStatusBadge(b.status)}</td>
                  </tr>
                ))}
                {recent.length === 0 && <tr><td colSpan={7} className="text-center py-4 text-muted">ยังไม่มีข้อมูล</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {detailBooking && <BookingDetailModal booking={detailBooking} onClose={() => setDetailBooking(null)} />}
    </div>
  );
}