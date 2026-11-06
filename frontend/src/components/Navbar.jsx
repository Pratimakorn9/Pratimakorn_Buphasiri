import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import logoImg from '/logoaurora.png';

export default function Navbar() {
  const { currentUser, logout, setShowLogin, setShowRegister } = useApp();
  const [dropOpen, setDropOpen] = useState(false);
  // FIX (responsive): เดิมเมนู หน้าแรก/ห้องพัก/ข่าวสาร/รีวิว ใช้ class "d-none d-lg-flex"
  // แปลว่าจอเล็กกว่า 992px เมนูพวกนี้หายไปเฉยๆ ไม่มีปุ่มแฮมเบอร์เกอร์ทดแทนเลย
  // บนมือถือจึงกดไปหน้าห้องพัก/ข่าวสาร/รีวิวจาก navbar ไม่ได้ เพิ่ม state ควบคุมเมนูมือถือนี้ขึ้นมา
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropRef = useRef(null);
  const mobileRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
      if (mobileRef.current && !mobileRef.current.contains(e.target)) setMobileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ปิดเมนูมือถืออัตโนมัติทุกครั้งที่เปลี่ยนหน้า ไม่งั้นเมนูจะค้างเปิดอยู่หลังกดลิงก์
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const navLinks = [
    { to: '/', label: 'หน้าแรก' },
    { to: '/rooms', label: 'ห้องพัก' },
    { to: '/news', label: 'ข่าวสาร' },
    { to: '/reviews', label: 'รีวิว' },
  ];

  const getInitials = (u) => `${u.firstName?.[0] || ''}`;
  const handleLogout = () => { logout(); setDropOpen(false); navigate('/'); };
  const getRoleLabel = (role) => ({ admin: 'ผู้ดูแลระบบ', staff: 'พนักงานต้อนรับ' }[role] || 'สมาชิก');
  const getDashboardPath = (role) => ({ admin: '/admin', staff: '/staff' }[role] || '/member');

  return (
    <nav className="navbar-aurora">
      <div style={{ width: '100%', paddingLeft: 16, paddingRight: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Brand - ใช้ไฟล์โลโก้จริงแทน text placeholder */}
        <Link to="/" className="navbar-brand" style={{ marginLeft: 0, flexShrink: 0, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <img src={logoImg} alt="Aurora Grand Hotel" style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
        </Link>

        {/* Nav Links - center */}
        <div className="d-none d-lg-flex align-items-center gap-1" style={{ flex: 1, justifyContent: 'center' }}>
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} className={`nav-link ${location.pathname === l.to ? 'active' : ''}`}>{l.label}</Link>
          ))}
          {currentUser && (currentUser.role === 'staff' || currentUser.role === 'admin') && (
            <Link to={getDashboardPath(currentUser.role)}
              className={`nav-link ${location.pathname.startsWith('/admin') || location.pathname.startsWith('/staff') ? 'active' : ''}`}>
              <i className="bi bi-grid-3x3-gap me-1"></i>แดชบอร์ด
            </Link>
          )}
        </div>

        {/* Auth area - flush right */}
        <div className="d-flex align-items-center gap-2" style={{ marginRight: 0, flexShrink: 0 }}>
          {/* ปุ่มแฮมเบอร์เกอร์ แสดงเฉพาะจอเล็กกว่า lg (ต่ำกว่า 992px) คู่กับเมนูที่ถูกซ่อนไปด้านบน */}
          <button
            className="navbar-mobile-toggle d-lg-none"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="เปิดเมนู"
          >
            <i className={`bi ${mobileOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
          </button>
          {currentUser ? (
            <div className="position-relative" ref={dropRef}>
              <button className="user-avatar-btn" onClick={() => setDropOpen(o => !o)}>
                <div className="user-avatar">
                  {currentUser.avatar ? <img src={currentUser.avatar} alt="" /> : getInitials(currentUser)}
                </div>
                <span className="user-name-nav d-none d-md-block">{currentUser.firstName}</span>
                <i className="bi bi-chevron-down" style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}></i>
              </button>
              {dropOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{currentUser.prefix} {currentUser.firstName} {currentUser.lastName}</div>
                    <div style={{ fontSize: 11, opacity: 0.65 }}>{currentUser.email}</div>
                    <div className="mt-1"><span className="status-badge status-confirmed" style={{ fontSize: 10 }}>{getRoleLabel(currentUser.role)}</span></div>
                  </div>
                  {currentUser.role === 'member' && (
                    <>
                      <Link to="/member/profile" className="user-dropdown-item" onClick={() => setDropOpen(false)}>
                        <i className="bi bi-person-circle" style={{ color: 'var(--sage)' }}></i> โปรไฟล์ของฉัน
                      </Link>
                      <Link to="/member/bookings" className="user-dropdown-item" onClick={() => setDropOpen(false)}>
                        <i className="bi bi-calendar-check" style={{ color: 'var(--sage)' }}></i> ประวัติการจอง
                      </Link>
                    </>
                  )}
                  {(currentUser.role === 'staff' || currentUser.role === 'admin') && (
                    <Link to={getDashboardPath(currentUser.role)} className="user-dropdown-item" onClick={() => setDropOpen(false)}>
                      <i className="bi bi-grid-3x3-gap" style={{ color: 'var(--sage)' }}></i> แดชบอร์ด
                    </Link>
                  )}
                  <div style={{ borderTop: '1px solid #F0F0F0', margin: '4px 0' }}></div>
                  <button className="user-dropdown-item danger" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right"></i> ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button className="btn-outline-gold btn" onClick={() => setShowLogin(true)}>เข้าสู่ระบบ</button>
              <button className="btn-gold btn" onClick={() => setShowRegister(true)}>สมัครสมาชิก</button>
            </>
          )}
        </div>
      </div>

      {/* เมนูมือถือ: แสดงเมื่อกดปุ่มแฮมเบอร์เกอร์ เฉพาะจอเล็กกว่า lg (ตัว .navbar-mobile-menu ซ่อนเองบน desktop ผ่าน CSS) */}
      {mobileOpen && (
        <div className="navbar-mobile-menu d-lg-none" ref={mobileRef}>
          {navLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`navbar-mobile-link ${location.pathname === l.to ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {currentUser && (currentUser.role === 'staff' || currentUser.role === 'admin') && (
            <Link
              to={getDashboardPath(currentUser.role)}
              className={`navbar-mobile-link ${location.pathname.startsWith('/admin') || location.pathname.startsWith('/staff') ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <i className="bi bi-grid-3x3-gap me-2"></i>แดชบอร์ด
            </Link>
          )}
          {currentUser && currentUser.role === 'member' && (
            <>
              <Link to="/member/profile" className="navbar-mobile-link" onClick={() => setMobileOpen(false)}>
                <i className="bi bi-person-circle me-2"></i>โปรไฟล์ของฉัน
              </Link>
              <Link to="/member/bookings" className="navbar-mobile-link" onClick={() => setMobileOpen(false)}>
                <i className="bi bi-calendar-check me-2"></i>ประวัติการจอง
              </Link>
            </>
          )}
          {currentUser && (
            <button className="navbar-mobile-link danger" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right me-2"></i>ออกจากระบบ
            </button>
          )}
        </div>
      )}
    </nav>
  );
}