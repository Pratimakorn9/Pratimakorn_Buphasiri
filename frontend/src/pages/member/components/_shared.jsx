// ==========================================
// pages/member/components/_shared.jsx
// ตัวช่วยและคอมโพเนนต์ที่ใช้ร่วมกันในโซน Member
// (API helper, Sidebar สมาชิก)
// ==========================================
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';

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

// ===== Member Sidebar =====
export function MemberSidebar() {
  const { currentUser, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const items = [
    { to: '/member/profile', icon: 'bi-person-circle', label: 'โปรไฟล์' },
    { to: '/member/bookings', icon: 'bi-calendar-check', label: 'ประวัติการจอง' },
    { to: '/member/reviews', icon: 'bi-star', label: 'รีวิวของฉัน' },
  ];
  return (
    <div className="dashboard-sidebar">
      <div className="sidebar-header">
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--sage-light), var(--sage))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'white', margin: '0 auto 12px', border: '3px solid rgba(255,255,255,0.25)' }}>
          {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
        </div>
        <div style={{ fontWeight: 700 }}>{currentUser?.prefix} {currentUser?.firstName} {currentUser?.lastName}</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{currentUser?.email}</div>
        <div className="mt-2"><span className="status-badge status-confirmed" style={{ fontSize: 10 }}>สมาชิก Aurora</span></div>
      </div>
      <div>
        {items.map(item => (
          <Link key={item.to} to={item.to} className={`sidebar-nav-item ${location.pathname === item.to ? 'active' : ''}`}>
            <i className={item.icon}></i>{item.label}
          </Link>
        ))}
        <div style={{ borderTop: '1px solid var(--ivory-dark)', margin: '8px 0' }}>
          <Link to="/" className="sidebar-nav-item"><i className="bi bi-house"></i>กลับหน้าหลัก</Link>
          <button className="sidebar-nav-item" style={{ color: 'var(--danger)' }} onClick={() => { logout(); navigate('/'); }}>
            <i className="bi bi-box-arrow-right"></i>ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
