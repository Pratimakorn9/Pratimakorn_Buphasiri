// ==========================================
// pages/admin/components/_shared.jsx
// คอมโพเนนต์และฟอร์มส่วนกลางโซน Admin
// ==========================================
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import { getStatusBadge, formatPrice, formatDate, formatDateTime } from '../../../components/Helpers';
import logoImg from '/logoaurora.png';

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

// ===== Popup =====
export function Popup({ icon, iconClass, title, message, children, onClose }) {
  return (
    <div className="popup-overlay">
      <div className="popup-card" style={{ maxWidth: 420, position: 'relative' }}>
        {onClose && (
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.07)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
            <i className="bi bi-x-lg"></i>
          </button>
        )}
        <div className={`popup-icon ${iconClass} mx-auto`}><i className={icon}></i></div>
        <h5 style={{ fontFamily: 'Playfair Display', marginBottom: 8 }}>{title}</h5>
        {message && <p style={{ color: 'var(--text-mid)', fontSize: 14, marginBottom: 20 }}>{message}</p>}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>{children}</div>
      </div>
    </div>
  );
}

// ===== Admin Sidebar =====
export function AdminSidebar() {
  const { currentUser, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const items = [
    { to: '/admin', icon: 'bi-grid', label: 'ภาพรวม', exact: true },
    { to: '/admin/rooms', icon: 'bi-building', label: 'จัดการห้องพัก' },
    { to: '/admin/bookings', icon: 'bi-calendar-check', label: 'การจองทั้งหมด' },
    { to: '/admin/members', icon: 'bi-people', label: 'สมาชิก & พนักงาน' },
    { to: '/admin/news', icon: 'bi-newspaper', label: 'ข่าวสาร' },
    { to: '/admin/reports', icon: 'bi-bar-chart-line', label: 'รายงาน' },
  ];

  const isActive = (item) => item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  return (
    <div className="dashboard-left">
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
        <div className="mt-1"><span className="status-badge status-review" style={{ fontSize: 10 }}>ผู้ดูแลระบบ</span></div>
      </div>

      <div style={{ flex: 1 }}>
        {items.map(item => (
          <Link key={item.to} to={item.to} className={`sidebar-nav-item ${isActive(item) ? 'active' : ''}`}>
            <i className={item.icon}></i>{item.label}
          </Link>
        ))}
        <div style={{ borderTop: '1px solid var(--ivory-dark)', margin: '8px 0' }}>
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
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>จำนวนห้อง</div>{b.rooms || 1} ห้อง</div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>เช็คอิน</div>{formatDate(b.checkIn)}</div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>เช็คเอาต์</div>{formatDate(b.checkOut)}</div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>เวลาที่จอง</div>{formatDateTime(b.createdAt)}</div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>เลขห้องที่เข้าพัก</div><div style={{ fontWeight: 700 }}>{b.roomNumbers || '-'}</div></div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>เวลาเช็คอิน</div>{formatDateTime(b.actualCheckIn)}</div>
            <div className="col-6"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>เวลาเช็คเอาต์</div>{formatDateTime(b.actualCheckOut)}</div>
            {b.specialRequest && <div className="col-12"><div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>คำขอพิเศษ</div><div style={{ background: 'var(--ivory)', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>{b.specialRequest}</div></div>}
            {b.slipUrl && (
              <div className="col-12">
                <div style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>หลักฐานการชำระเงิน</div>
                <img src={b.slipUrl} alt="slip" style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 10, border: '1px solid var(--ivory-dark)', cursor: 'zoom-in' }} onClick={() => window.open(b.slipUrl, '_blank')} />
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

// ===== ROOM TYPE FORM (เพิ่มช่องกรอกราคา/คืน) =====
// ===== ROOM TYPE FORM (รองรับการอัปโหลดไฟล์รูปภาพ) =====
export function RoomTypeForm({ initialData, facilities = [], onSave, onCancel, isEdit }) {
  const [form, setForm] = useState(initialData ? {
    ...initialData,
    price: initialData.price || '',
    facility_ids: initialData.facility_ids || [],
    facilities_status: initialData.facilities_status || {}
  } : {
    roomtype_name: '',
    description: '',
    max_guest: 2,
    room_size: '25',
    image_url: '',
    price: '',
    facility_ids: [],
    facilities_status: {}
  });

  // State สำหรับเก็บรูปที่เลือก preview
  const [imagePreview, setImagePreview] = useState(initialData?.image_url || '');

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  // ฟังก์ชันจัดการการเปลี่ยนไฟล์รูปภาพ
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setImagePreview(base64String);
        setForm(p => ({ ...p, image_url: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFacilityToggle = (fId) => {
    setForm(p => {
      const exists = p.facility_ids.includes(fId);
      const updatedIds = exists ? p.facility_ids.filter(id => id !== fId) : [...p.facility_ids, fId];
      
      const updatedStatus = { ...p.facilities_status };
      if (!exists && !updatedStatus[fId]) {
        updatedStatus[fId] = 'พร้อมใช้งาน';
      }
      return {
        ...p,
        facility_ids: updatedIds,
        facilities_status: updatedStatus
      };
    });
  };

  const handleStatusChange = (fId, statusVal) => {
    setForm(p => ({
      ...p,
      facilities_status: {
        ...p.facilities_status,
        [fId]: statusVal
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      price: parseInt(form.price) || 0,
      max_guest: parseInt(form.max_guest) || 1,
      room_size: String(form.room_size || '')
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="row g-3">
        <div className="col-md-8">
          <label className="form-label-aurora">ชื่อประเภทห้อง <span className="required-star">*</span></label>
          <input className="form-control-aurora" placeholder="เช่น Deluxe Room" value={form.roomtype_name} onChange={set('roomtype_name')} required />
        </div>
        <div className="col-md-4">
          <label className="form-label-aurora">ราคา/คืน (฿) <span className="required-star">*</span></label>
          <input type="number" min="1" className="form-control-aurora" placeholder="1500" value={form.price} onChange={set('price')} required />
        </div>
        <div className="col-md-4">
          <label className="form-label-aurora">ผู้เข้าพักสูงสุด (คน) <span className="required-star">*</span></label>
          <input type="number" min="1" max="10" className="form-control-aurora" value={form.max_guest} onChange={set('max_guest')} required />
        </div>
        <div className="col-md-4">
          <label className="form-label-aurora">ขนาดห้อง (ตร.ม.)</label>
          <input className="form-control-aurora" placeholder="25 ตร.ม." value={form.room_size} onChange={set('room_size')} />
        </div>

        {/* เปลี่ยนเป็นช่องอัปโหลดไฟล์รูปภาพ */}
        <div className="col-md-4">
          <label className="form-label-aurora">รูปภาพประเภทห้อง</label>
          <input 
            type="file" 
            accept="image/*" 
            className="form-control-aurora" 
            onChange={handleImageChange} 
            style={{ padding: '6px 12px' }}
          />
        </div>

        {/* ส่วนแสดงตัวอย่างรูปภาพที่อัปโหลด */}
        {imagePreview && (
          <div className="col-12">
            <label className="form-label-aurora mb-1" style={{ fontSize: 12 }}>ตัวอย่างรูปภาพที่เลือก:</label>
            <div style={{ position: 'relative', width: 'fit-content' }}>
              <img 
                src={imagePreview} 
                alt="Preview" 
                style={{ width: 140, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--ivory-dark)' }} 
              />
              <button
                type="button"
                className="btn btn-sm btn-danger"
                style={{ position: 'absolute', top: -8, right: -8, borderRadius: '50%', width: 22, height: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}
                onClick={() => {
                  setImagePreview('');
                  setForm(p => ({ ...p, image_url: '' }));
                }}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
          </div>
        )}

        <div className="col-12">
          <label className="form-label-aurora">คำอธิบาย</label>
          <textarea className="form-control-aurora" rows={2} value={form.description} onChange={set('description')} placeholder="รายละเอียดประเภทห้องพัก"></textarea>
        </div>
        <div className="col-12">
          <label className="form-label-aurora mb-2">สิ่งอำนวยความสะดวก & สถานะความพร้อม</label>
          <div className="row g-2" style={{ maxHeight: 200, overflowY: 'auto', background: 'var(--ivory)', padding: 12, borderRadius: 8, border: '1px solid var(--ivory-dark)' }}>
            {facilities.map(f => {
              const isChecked = form.facility_ids.includes(f.facility_id);
              return (
                <div key={f.facility_id} className="col-12 col-md-6 border-bottom pb-2 mb-2">
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <label className="d-flex align-items-center gap-2 mb-0" style={{ fontSize: 13, cursor: 'pointer', fontWeight: isChecked ? 600 : 400 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleFacilityToggle(f.facility_id)}
                      />
                      {f.facility_name}
                    </label>
                    {isChecked && (
                      <select 
                        className="form-select form-select-sm" 
                        style={{ width: 'auto', fontSize: 12, padding: '2px 8px' }}
                        value={form.facilities_status[f.facility_id] || 'พร้อมใช้งาน'}
                        onChange={(e) => handleStatusChange(f.facility_id, e.target.value)}
                      >
                        <option value="พร้อมใช้งาน">พร้อมใช้งาน</option>
                        <option value="ไม่พร้อมใช้งาน">ไม่พร้อมใช้งาน</option>
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="col-12 d-flex gap-2 mt-3">
          <button type="submit" className="btn-aurora-primary" style={{ maxWidth: 160 }}>
            <i className="bi bi-check-circle me-1"></i>{isEdit ? 'บันทึก' : 'สร้างประเภท'}
          </button>
          <button type="button" className="btn-aurora-secondary" onClick={onCancel}>ยกเลิก</button>
        </div>
      </div>
    </form>
  );
}

// ===== ADMIN ROOMS FORM (ถอดคอลัมน์และฟิลด์ราคาออกอย่างสมบูรณ์) =====
export function RoomForm({ initialData, onSave, onCancel, isEdit, roomTypes = [], onStatusBlocked }) {
  const blankForm = { 
    room_number: '', 
    roomtype_id: roomTypes[0]?.roomtype_id || 1, 
    bed_type: 'เตียงเดี่ยว', 
    people_count: 2, 
    description: '', 
    room_status: 'พร้อมใช้งาน' 
  };
  
  const [form, setForm] = useState(initialData ? { 
    ...initialData, 
    bed_type: initialData.bed_type || 'เตียงเดี่ยว', 
    room_status: initialData.room_status || 'พร้อมใช้งาน' 
  } : blankForm);
  
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  // ถ้าห้องนี้มีผู้เช็คอินอยู่ (ยังไม่เช็คเอาต์) ห้ามเปลี่ยนสถานะ ให้แจ้งเตือนแทน
  const isOccupied = isEdit && Number(initialData?.active_checkins) > 0;
  const setStatus = (e) => {
    if (isOccupied && e.target.value !== initialData.room_status) {
      onStatusBlocked?.(`ไม่สามารถเปลี่ยนสถานะได้ เนื่องจากวันนี้มีผู้เช็คอินห้อง ${initialData.room_number} อยู่`);
      return;
    }
    set('room_status')(e);
  };

  const selectedType = roomTypes.find(rt => String(rt.roomtype_id) === String(form.roomtype_id));
  const maxGuestAllowed = selectedType ? selectedType.max_guest : 10;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ 
      ...form, 
      people_count: parseInt(form.people_count) || 1, 
      roomtype_id: parseInt(form.roomtype_id) 
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="row g-3">
        {/* 1. เลขห้อง (โชว์ทั้งเพิ่มใหม่ และ แก้ไข) */}
        <div className={isEdit ? "col-md-6" : "col-md-4"}>
          <label className="form-label-aurora">เลขห้อง <span className="required-star">*</span></label>
          <input className="form-control-aurora" placeholder="เช่น 101" value={form.room_number} onChange={set('room_number')} required disabled={isEdit} style={isEdit ? { background: 'var(--ivory)', cursor: 'not-allowed', opacity: 0.6 } : {}} />
          {isEdit && <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 3 }}>ไม่สามารถแก้ไขเลขห้องได้</div>}
        </div>

        {/* 2. สถานะห้อง (โชว์ทั้งเพิ่มใหม่ และ แก้ไข) */}
        <div className={isEdit ? "col-md-6" : "col-md-8"}>
          <label className="form-label-aurora">สถานะห้อง</label>
          <select className="form-control-aurora" value={form.room_status} onChange={setStatus}>
            <option value="พร้อมใช้งาน">พร้อมใช้งาน</option>
            <option value="ไม่พร้อมใช้งาน">ไม่พร้อมใช้งาน</option>
          </select>
        </div>

        {/* 3. ซ่อนฟิลด์รายละเอียดเหล่านี้เฉพาะตอน "แก้ไขห้อง" (isEdit = true) */}
        {!isEdit && (
          <>
            <div className="col-md-12">
              <label className="form-label-aurora">ประเภทห้อง <span className="required-star">*</span></label>
              <select className="form-control-aurora" value={form.roomtype_id} onChange={set('roomtype_id')} required>
                {roomTypes.map(rt => (
                  <option key={rt.roomtype_id} value={rt.roomtype_id}>
                    {rt.roomtype_name} (สูงสุด {rt.max_guest} คน) — ฿{rt.price?.toLocaleString()}/คืน
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label-aurora">ประเภทเตียง</label>
              <select className="form-control-aurora" value={form.bed_type} onChange={set('bed_type')}>
                <option value="เตียงเดี่ยว">เตียงเดี่ยว</option>
                <option value="เตียงเดี่ยวใหญ่">เตียงเดี่ยวใหญ่</option>
                <option value="เตียงคู่">เตียงคู่</option>
                <option value="เตียงคู่ใหญ่">เตียงคู่ใหญ่</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label-aurora">จำนวนคนสูงสุด</label>
              <select className="form-control-aurora" value={Math.min(form.people_count, maxGuestAllowed)} onChange={set('people_count')}>
                {Array.from({ length: maxGuestAllowed }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n} คน</option>
                ))}
              </select>
            </div>

            <div className="col-md-12">
              <label className="form-label-aurora">คำอธิบาย</label>
              <input className="form-control-aurora" placeholder="รายละเอียดห้อง" value={form.description} onChange={set('description')} />
            </div>
          </>
        )}

        {/* ปุ่มบันทึก/ยกเลิก */}
        <div className="col-12 d-flex gap-3 mt-2">
          <button type="submit" className="btn-aurora-primary" style={{ maxWidth: 180 }}>
            <i className={`bi ${isEdit ? 'bi-floppy' : 'bi-plus-circle'} me-2`}></i>{isEdit ? 'บันทึก' : 'เพิ่มห้อง'}
          </button>
          <button type="button" className="btn-aurora-secondary" onClick={onCancel}>ยกเลิก</button>
        </div>
      </div>
    </form>
  );
}