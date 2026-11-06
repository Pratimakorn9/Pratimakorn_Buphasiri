import { Link } from 'react-router-dom';
const HOTEL_INFO = {
  address: '123 ถนนสกลนคร-อุดรธานี ตำบลธาตุเชิงชุม อำเภอเมือง จังหวัดสกลนคร 47000',
  phone: '042-123-456',
  email: 'info@auroragrandhotel.com',
};
import { useApp } from '../context/AppContext';
import logoImg from '/logoaurora.png';

export default function Footer() {
  const { currentUser } = useApp();
  const role = currentUser?.role;

  return (
    <footer className="footer-aurora" style={{ marginTop: 0 }}>
      <div className="container">
        <div className="row g-4">

          {/* โลโก้ + ที่อยู่ */}
          <div className="col-lg-3">
            <div className="mb-3">
              <img src={logoImg} alt="Aurora Grand Hotel"
                style={{ height: 52, width: 'auto', objectFit: 'contain' }} />
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.8 }}>{HOTEL_INFO.address}</p>
            <p style={{ fontSize: 13, marginBottom: 6 }}>
              <i className="bi bi-telephone me-2"></i>{HOTEL_INFO.phone}
            </p>
            <p style={{ fontSize: 13, marginBottom: 0 }}>
              <i className="bi bi-envelope me-2"></i>{HOTEL_INFO.email}
            </p>
          </div>

          {/* เมนูหลัก */}
          <div className="col-lg-2 col-6">
            <h5>เมนู</h5>
            <Link to="/">หน้าแรก</Link>
            <Link to="/rooms">ห้องพัก</Link>
            <Link to="/news">ข่าวสาร</Link>
            <Link to="/reviews">รีวิว</Link>
          </div>

          {/* Sitemap ตาม role */}
          {!role && (
            <div className="col-lg-2 col-6">
              <h5>บริการ</h5>
              <div style={{ fontSize: 13 }}>
                <i className="bi bi-clock me-2"></i>เปิดให้บริการ 24 ชั่วโมง
              </div>
            </div>
          )}

          {role === 'member' && (
            <div className="col-lg-2 col-6">
              <h5>สมาชิก</h5>
              <Link to="/member/profile">โปรไฟล์ของฉัน</Link>
              <Link to="/member/bookings">ประวัติการจอง</Link>
              <Link to="/member/reviews">รีวิวของฉัน</Link>
            </div>
          )}

          {role === 'staff' && (
            <div className="col-lg-3 col-6">
              <h5>พนักงาน</h5>
              <Link to="/staff">ภาพรวม</Link>
              <Link to="/staff/bookings">การจองทั้งหมด</Link>
              <Link to="/staff/checkin">เช็คอิน / เช็คเอาต์</Link>
              <Link to="/staff/payments">ตรวจสอบชำระเงิน</Link>
              <Link to="/staff/new-booking">จองให้ลูกค้า</Link>
              <Link to="/staff/reports">รายงาน</Link>
            </div>
          )}

          {role === 'admin' && (
            <div className="col-lg-3 col-6">
              <h5>ผู้ดูแลระบบ</h5>
              <Link to="/admin">ภาพรวม</Link>
              <Link to="/admin/rooms">จัดการห้องพัก</Link>
              <Link to="/admin/bookings">การจองทั้งหมด</Link>
              <Link to="/admin/members">สมาชิก &amp; พนักงาน</Link>
              <Link to="/admin/news">ข่าวสาร</Link>
              <Link to="/admin/reports">รายงาน</Link>
            </div>
          )}

          {role && (
            <div className="col-lg-2 col-6">
              <h5>บริการ</h5>
              <div style={{ fontSize: 13 }}>
                <i className="bi bi-clock me-2"></i>เปิดให้บริการ 24 ชั่วโมง
              </div>
            </div>
          )}

        </div>
        <hr className="footer-divider" />
        <div className="text-center" style={{ fontSize: 13 }}>
          © 2026 Aurora Grand Hotel. สงวนลิขสิทธิ์ทุกประการ.
        </div>
      </div>
    </footer>
  );
}