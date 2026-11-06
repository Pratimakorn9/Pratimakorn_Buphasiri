// ==========================================
// pages/admin/AdminBookings.jsx
// จัดการรายการจองทั้งหมด
// ==========================================
import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getStatusBadge, formatPrice, formatDate, formatDateTime } from '../../components/Helpers';
import DateInput from '../../components/DateInput';
import { API, apiFetch, Popup, AdminSidebar, BookingDetailModal, RoomForm } from './components/_shared';


// ===== ADMIN BOOKINGS =====
export function AdminBookings() {
  const { bookings, refreshBookings } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailBooking, setDetailBooking] = useState(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  // เพิ่มระบบแบ่งหน้า แสดงทีละ 20 รายการ กันตารางยาวเกินไป
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => { refreshBookings(); }, []);

  const years = [...new Set(bookings.map(b => b.checkIn ? new Date(b.checkIn).getFullYear() : null).filter(Boolean))].sort((a, b) => b - a);
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

  const filtered = bookings.filter(b => {
    const matchS = !search || String(b.id).includes(search) || (b.userName || '').toLowerCase().includes(search.toLowerCase()) || (b.contactName || '').toLowerCase().includes(search.toLowerCase()) || (b.roomName || '').toLowerCase().includes(search.toLowerCase());
    const matchSt = statusFilter === 'all' || b.status === statusFilter;
    const checkInDate = b.checkIn ? new Date(b.checkIn) : null;
    const matchDate = !filterDate || b.checkIn === filterDate;
    const matchMonth = !filterMonth || (checkInDate && checkInDate.getMonth() === parseInt(filterMonth));
    const matchYear = !filterYear || (checkInDate && checkInDate.getFullYear() === parseInt(filterYear));
    return matchS && matchSt && matchDate && matchMonth && matchYear;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // กรองเปลี่ยนแล้วต้องกลับไปหน้า 1 เสมอ ไม่งั้นอาจค้างอยู่หน้าที่ไม่มีข้อมูลแล้ว
  useEffect(() => { setPage(1); }, [search, statusFilter, filterDate, filterMonth, filterYear]);

  return (
    <div className="dashboard-page">
      <AdminSidebar />
      <div className="dashboard-right">
        <div className="dash-top-bar">
          <h4 style={{ fontFamily: 'Playfair Display', margin: 0 }}>การจองทั้งหมด</h4>
          <span style={{ fontSize: 13, color: 'var(--text-light)' }}>{filtered.length} รายการ</span>
        </div>
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: '16px 20px', boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
          <div className="row g-2 align-items-end">
            <div className="col-md-3"><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>ค้นหา</label><input className="form-control" placeholder="รหัส / ชื่อ / ห้อง..." value={search} onChange={e => setSearch(e.target.value)} style={{ borderRadius: 8, fontSize: 13 }} /></div>
            <div className="col-md-2"><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>สถานะ</label>
              <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ borderRadius: 8, fontSize: 13 }}>
                <option value="all">ทั้งหมด</option>
                <option value="PENDING_PAYMENT">รอชำระ</option>
                <option value="PAYMENT_REVIEW">รอตรวจสอบ</option>
                <option value="CONFIRMED">ยืนยันแล้ว</option>
                <option value="CHECKED_IN">เช็คอินแล้ว</option>
                <option value="CHECKED_OUT">เช็คเอาต์แล้ว</option>
                <option value="COMPLETED">เสร็จสมบูรณ์</option>
                <option value="CANCELLED_USER">ยกเลิกโดยผู้ใช้</option>
                <option value="CANCELLED_SYSTEM">ยกเลิกการจองโดยระบบ</option>
                <option value="CANCELLED_ADMIN">ยกเลิกโดยโรงแรม</option>
              </select>
            </div>
            <div className="col-md-2"><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>วันที่เช็คอิน</label><DateInput value={filterDate} onChange={e => { setFilterDate(e.target.value); setFilterMonth(''); setFilterYear(''); }} /></div>
            <div className="col-md-2"><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>เดือน</label>
              <select className="form-select" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setFilterDate(''); }} style={{ borderRadius: 8, fontSize: 13 }}>
                <option value="">ทุกเดือน</option>
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="col-md-2"><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>ปี</label>
              <select className="form-select" value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ borderRadius: 8, fontSize: 13 }}>
                <option value="">ทุกปี</option>
                {years.map(y => <option key={y} value={y}>{y + 543}</option>)}
              </select>
            </div>
            <div className="col-md-1"><button className="btn btn-outline-secondary btn-sm w-100" style={{ borderRadius: 8, height: 38 }} onClick={() => { setSearch(''); setStatusFilter('all'); setFilterDate(''); setFilterMonth(''); setFilterYear(''); setPage(1); }}><i className="bi bi-x-lg"></i></button></div>
          </div>
        </div>
        <div className="aurora-table">
          <table className="table table-hover mb-0">
            <thead><tr><th>รหัส</th><th>ผู้จอง</th><th>ห้อง</th><th>เวลาจอง</th><th>เช็คอิน</th><th>เช็คเอาต์</th><th>ยอด</th><th>สถานะ</th></tr></thead>
            <tbody>
              {paginated.map(b => (
                <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => setDetailBooking(b)}>
                  <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{b.id}</td>
                  <td><div style={{ fontWeight: 600 }}>{b.contactName || b.userName}</div><div style={{ fontSize: 11, color: 'var(--text-light)' }}>{b.contactEmail || b.userEmail}</div></td>
                  <td>
                    <div>{b.roomName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{b.rooms || 1} ห้อง{b.roomNumbers ? ` · เลขห้อง ${b.roomNumbers}` : ''}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>{formatDateTime(b.createdAt)}</td>
                  <td>{formatDate(b.checkIn)}</td>
                  <td>{formatDate(b.checkOut)}</td>
                  <td style={{ fontWeight: 700 }}>฿{formatPrice(b.totalAmount)}</td>
                  <td>{getStatusBadge(b.status)}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-4 text-muted">ไม่พบข้อมูล</td></tr>}
            </tbody>
          </table>
        </div>

        {/* แถบเปลี่ยนหน้า */}
        {filtered.length > 0 && (
          <div className="d-flex align-items-center justify-content-between mt-3" style={{ fontSize: 13 }}>
            <span style={{ color: 'var(--text-light)' }}>
              แสดง {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ
            </span>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 8 }}
                disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                <i className="bi bi-chevron-left"></i>
              </button>
              <span style={{ fontWeight: 600 }}>หน้า {page} / {totalPages}</span>
              <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 8 }}
                disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
      {detailBooking && <BookingDetailModal booking={detailBooking} onClose={() => setDetailBooking(null)} />}
    </div>
  );
}