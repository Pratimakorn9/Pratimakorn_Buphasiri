// ==========================================
// pages/rooms/RoomDetailPage.jsx
// หน้ารายละเอียดประเภทห้องพัก เลือก/เพิ่มจำนวนห้องได้
// ==========================================
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StarRating, formatPrice, calcNights } from '../../components/Helpers';
import DateInput from '../../components/DateInput';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ========================================================
// 2. หน้ารายละเอียดประเภทห้องพัก (เลือกจำนวนห้อง + กดเพิ่มห้องได้)
// ========================================================
export function RoomDetailPage() {
  const { roomId } = useParams(); // roomtype_id
  const navigate = useNavigate();
  const { setShowLogin, currentUser } = useApp();
  const [params] = useSearchParams();

  const [roomType, setRoomType] = useState(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [search, setSearch] = useState({
    checkIn: params.get('checkIn') || today,
    checkOut: params.get('checkOut') || tomorrow,
    adults: parseInt(params.get('adults') || 2),
    children: parseInt(params.get('children') || 0),
    rooms: parseInt(params.get('rooms') || 1),
  });
  const nights = calcNights(search.checkIn, search.checkOut);

  useEffect(() => {
    // FIX: เดิมไม่ส่ง checkin/checkout เลย ทั้งที่หน้านี้มีวันที่ (search.checkIn/checkOut) อยู่แล้วจาก URL params
    // ทำให้ backend คืน available_rooms = COUNT ห้องทั้งหมดเสมอ ไม่หักห้องที่ถูกจองไปแล้วในช่วงวันที่นั้น
    // ผลคือห้องที่ถูกจองเต็มแล้ว (แม้ยังไม่จ่ายเงิน) ก็ยังโชว์ว่าจองเพิ่มได้ในหน้ารายละเอียดห้อง
    fetch(`${API}/room-types/${roomId}?checkin=${search.checkIn}&checkout=${search.checkOut}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRoomType(data.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching room type detail:", err);
        setLoading(false);
      });
  }, [roomId, search.checkIn, search.checkOut]);

  if (loading) return <div className="text-center py-5"><span className="spinner-border text-sage"></span></div>;
  if (!roomType) return (
    <div className="container py-5 text-center">
      <h4>ไม่พบข้อมูลห้องพักประเภทนี้ในระบบ</h4>
      <button className="btn btn-sm btn-outline-secondary mb-3" onClick={() => navigate(`/rooms?checkIn=${search.checkIn}&checkOut=${search.checkOut}&adults=${search.adults}&children=${search.children}&rooms=${search.rooms}`)}>
        <i className="bi bi-arrow-left me-2"></i>กลับหน้าห้องพักทั้งหมด
      </button>
    </div>
  );

  const price = Number(roomType.price || 0);
  const availableRooms = roomType.available_rooms || 0;
  const maxRooms = Math.max(1, availableRooms);
  // รายการสิ่งอำนวยความสะดวกพร้อมสถานะ (พร้อมใช้งาน = ติ๊กถูก / ไม่พร้อมใช้งาน = กากบาท)
  const facilityList = roomType.facility_details?.length
    ? roomType.facility_details
    : (roomType.facilities || []).map(name => ({ name, available: true }));

  return (
    <>
      <div className="page-header">
        <div className="container">
          <button className="btn btn-sm btn-outline-light mb-3" onClick={() => navigate(`/rooms?checkIn=${search.checkIn}&checkOut=${search.checkOut}&adults=${search.adults}&children=${search.children}&rooms=${search.rooms}`)}>
            <i className="bi bi-arrow-left me-2"></i>กลับหน้าห้องพักทั้งหมด
          </button>
          <h1 style={{ fontFamily: 'Playfair Display', fontWeight: 700 }}>{roomType.roomtype_name}</h1>
          {roomType.review_count > 0 && (
            <div className="d-flex align-items-center gap-3 mt-2">
              <StarRating rating={Number(roomType.avg_rating)} />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                คะแนนรีวิวห้องพัก {Number(roomType.avg_rating).toFixed(1)} / 5 ({roomType.review_count} รีวิว)
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="container pb-5">
        <div className="row g-4">
          {/* ส่วนเนื้อหารูปภาพฝั่งซ้าย */}
          <div className="col-lg-8">
            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 12, boxShadow: 'var(--shadow-sm)' }}>
              <img src={roomType.image_url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'} alt={roomType.roomtype_name} style={{ width: '100%', height: 420, objectFit: 'cover' }} />
            </div>

            <h4 style={{ fontFamily: 'Playfair Display', fontWeight: 700, marginBottom: 12, color: 'var(--navy)' }}>รายละเอียดห้องพัก</h4>
            <p style={{ color: 'var(--text-mid)', lineHeight: 1.8, fontSize: 14.5 }}>{roomType.description || 'สัมผัสบรรยากาศความหรูหราและความเงียบสงบอย่างเป็นส่วนตัวภายในห้องพักที่ถูกจัดเตรียมมาเป็นพิเศษสำหรับคุณ'}</p>

            <div className="row g-3 mb-4 mt-2">
              {[
                { icon: 'bi-rulers', label: 'ขนาดห้อง', val: roomType.room_size || '-' },
                { icon: 'bi-person-fill', label: 'ขนาดความจุห้อง', val: `สูงสุด ${roomType.max_guest} ท่าน/ห้อง` },
                { icon: 'bi-door-open-fill', label: 'ห้องว่างขณะนี้', val: `${availableRooms} ห้อง` },
              ].map((info, i) => (
                <div key={i} className="col-6 col-md-4">
                  <div style={{ background: 'var(--ivory)', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', border: '1px solid var(--ivory-dark)' }}>
                    <i className={info.icon} style={{ color: 'var(--sage)', fontSize: 18 }}></i>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{info.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginTop: 2 }}>{info.val}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {facilityList.length > 0 && (
              <>
                <h5 style={{ fontFamily: 'Playfair Display', fontWeight: 700, marginBottom: 14, color: 'var(--navy)' }}>สิ่งอำนวยความสะดวกครบครัน</h5>
                <div className="d-flex flex-wrap gap-2 mb-4">
                  {facilityList.map(f => (
                    <span key={f.name} className="amenity-badge" style={{ padding: '8px 16px', fontSize: 13, background: 'white', border: '1px solid var(--ivory-dark)', borderRadius: 8, color: f.available ? undefined : 'var(--text-light)' }}>
                      <i className={`bi ${f.available ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} me-2`} style={{ color: f.available ? 'var(--success)' : 'var(--danger)' }}></i>{f.name}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ส่วนกล่องตะกร้าคำนวณเงินฝั่งขวา — เลือก/เพิ่มจำนวนห้องได้ */}
          <div className="col-lg-4">
            <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 26, boxShadow: 'var(--shadow-md)', border: '1px solid var(--ivory-dark)', position: 'sticky', top: 80 }}>
              <div className="mb-3 pb-3" style={{ borderBottom: '1px solid var(--ivory-dark)' }}>
                <div className="price-tag" style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)' }}>฿{formatPrice(price)}<small style={{ fontSize: 13, color: 'var(--text-light)' }}> / คืน</small></div>
                <div style={{ fontSize: 12, color: availableRooms > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600, marginTop: 4 }}>
                  {availableRooms > 0 ? ` ว่างพร้อมเปิดจอง ${availableRooms} ห้อง` : ' ขออภัย ห้องประเภทนี้ไม่ว่างในขณะนี้'}
                </div>
              </div>

              <div className="form-group mb-3">
                <label className="form-label-aurora">วันเข้าพัก (Check-in)</label>
                <DateInput min={today} value={search.checkIn}
                  onChange={e => setSearch(p => ({ ...p, checkIn: e.target.value }))} />
              </div>
              <div className="form-group mb-3">
                <label className="form-label-aurora">วันออก (Check-out)</label>
                <DateInput min={search.checkIn} value={search.checkOut}
                  onChange={e => setSearch(p => ({ ...p, checkOut: e.target.value }))} />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-4">
                  <label className="form-label-aurora">ผู้ใหญ่</label>
                  <div className="counter-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--ivory-dark)', borderRadius: 8, padding: 4 }}>
                    <button type="button" className="counter-btn" style={{ border: 'none', background: 'transparent', width: 24, height: 24 }} onClick={() => setSearch(p => ({ ...p, adults: Math.max(1, p.adults - 1) }))}>−</button>
                    <span className="counter-value" style={{ fontWeight: 700 }}>{search.adults}</span>
                    <button type="button" className="counter-btn" style={{ border: 'none', background: 'transparent', width: 24, height: 24 }} onClick={() => setSearch(p => ({ ...p, adults: p.adults + 1 }))}>+</button>
                  </div>
                </div>
                <div className="col-4">
                  <label className="form-label-aurora">เด็ก</label>
                  <div className="counter-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--ivory-dark)', borderRadius: 8, padding: 4 }}>
                    <button type="button" className="counter-btn" style={{ border: 'none', background: 'transparent', width: 24, height: 24 }} onClick={() => setSearch(p => ({ ...p, children: Math.max(0, p.children - 1) }))}>−</button>
                    <span className="counter-value" style={{ fontWeight: 700 }}>{search.children}</span>
                    <button type="button" className="counter-btn" style={{ border: 'none', background: 'transparent', width: 24, height: 24 }} onClick={() => setSearch(p => ({ ...p, children: p.children + 1 }))}>+</button>
                  </div>
                </div>
                <div className="col-4">
                  <label className="form-label-aurora">จำนวนห้อง</label>
                  <div className="counter-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--ivory-dark)', borderRadius: 8, padding: 4 }}>
                    <button type="button" className="counter-btn" style={{ border: 'none', background: 'transparent', width: 24, height: 24 }} onClick={() => setSearch(p => ({ ...p, rooms: Math.max(1, p.rooms - 1) }))}>−</button>
                    <span className="counter-value" style={{ fontWeight: 700 }}>{search.rooms}</span>
                    {/* ปุ่มกดเพิ่มห้อง: จองห้องประเภทเดียวกันได้หลายห้องในคราวเดียว */}
                    <button type="button" className="counter-btn" style={{ border: 'none', background: 'transparent', width: 24, height: 24 }}
                      onClick={() => setSearch(p => ({ ...p, rooms: Math.min(maxRooms, p.rooms + 1) }))}
                      disabled={search.rooms >= maxRooms} title="เพิ่มห้อง">+</button>
                  </div>
                </div>
              </div>
              {search.rooms >= maxRooms && availableRooms > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: -8, marginBottom: 12 }}>
                  <i className="bi bi-info-circle me-1"></i>มีห้องว่างสูงสุด {maxRooms} ห้องสำหรับประเภทนี้
                </div>
              )}

              <div className="alert-aurora-info mb-4" style={{ fontSize: 13.5, background: 'rgba(123,158,135,0.08)', padding: 14, borderRadius: 8 }}>
                <div className="d-flex justify-content-between align-items-center">
                  <span>฿{formatPrice(price)} × {nights} คืน × {search.rooms} ห้อง</span>
                  <strong style={{ color: 'var(--navy)', fontSize: 15 }}>฿{formatPrice(price * nights * search.rooms)}</strong>
                </div>
              </div>

              {availableRooms > 0 ? (
                <button type="button" className="btn-aurora-primary w-100" style={{ padding: '12px', fontWeight: 600 }}
                  onClick={() => {
                    if (currentUser?.role !== 'member') { setShowLogin(true); return; }
                    navigate(`/booking/${roomType.roomtype_id}?checkIn=${search.checkIn}&checkOut=${search.checkOut}&adults=${search.adults}&children=${search.children}&rooms=${search.rooms}`);
                  }}>
                  {currentUser?.role === 'member' ? `จองห้องนี้ (${search.rooms} ห้อง)` : 'เข้าสู่ระบบเพื่อดำเนินการจอง'}
                </button>
              ) : (
                <button type="button" className="btn-aurora-primary w-100" disabled style={{ opacity: 0.6 }}>ห้องประเภทนี้ไม่ว่าง</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}