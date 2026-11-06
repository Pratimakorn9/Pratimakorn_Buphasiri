// ==========================================
// pages/home/HomePage.jsx
// ==========================================
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StarRating, formatPrice, formatGuestSummary } from '../../components/Helpers';
import DateInput from '../../components/DateInput';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const HOTEL_INFO = {
  badge: '✦ Aurora Grand Hotel ',
  subTagline: 'ที่พักหรูใจกลางเมือง ผสานความงามของธรรมชาติกับการบริการระดับสูง',
};

export default function HomePage() {
  const navigate = useNavigate();
  const { reviews, setShowLogin, currentUser } = useApp();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [search, setSearch] = useState({ checkIn: today, checkOut: tomorrow, adults: 2, children: 0, rooms: 1 });
  const [guestOpen, setGuestOpen] = useState(false);
  const guestRef = useRef(null);
  const [featuredRooms, setFeaturedRooms] = useState([]);

  useEffect(() => {
    const handler = (e) => { if (guestRef.current && !guestRef.current.contains(e.target)) setGuestOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    fetch(`${API}/room-types?checkin=${search.checkIn}&checkout=${search.checkOut}`)
      .then(r => r.json())
      .then(d => { if (d.success) setFeaturedRooms(d.data); })
      .catch(() => {});
  }, []);

  const handleSearch = () => {
    navigate(`/rooms?checkIn=${search.checkIn}&checkOut=${search.checkOut}&adults=${search.adults}&children=${search.children}&rooms=${search.rooms}`);
  };

  return (
    <>
      {/* Hero */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">{HOTEL_INFO.badge}</div>
            <h1 className="hero-title">
              Aurora Grand Hotel
            </h1>
            <p className="hero-subtitle">{HOTEL_INFO.subTagline}</p>

            {/* Search Box */}
            <div className="search-box">
              <p className="text-start mb-3" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
                <i className="bi bi-search me-2" style={{ color: 'var(--sage)' }}></i>ค้นหาห้องพักที่ว่าง
              </p>
              <div className="row g-3 align-items-end">
                {/* 1. วันที่เข้าพัก */}
                <div className="col-6 col-md-3">
                  <label>วันที่เข้าพัก</label>
                  <DateInput min={today} value={search.checkIn}
                    onChange={e => {
                      const newCheckIn = e.target.value;
                      setSearch(p => ({
                        ...p,
                        checkIn: newCheckIn,
                        checkOut: newCheckIn >= p.checkOut ? new Date(new Date(newCheckIn).getTime() + 86400000).toISOString().split('T')[0] : p.checkOut,
                      }));
                    }} />
                </div>
                {/* 2. วันที่ออกจากที่พัก */}
                <div className="col-6 col-md-3">
                  <label>วันที่ออกจากที่พัก</label>
                  <DateInput min={search.checkIn} value={search.checkOut}
                    onChange={e => setSearch(p => ({ ...p, checkOut: e.target.value }))} />
                </div>
                {/* 3. ผู้เข้าพัก & ห้อง */}
                <div className="col-6 col-md-3" ref={guestRef} style={{ position: 'relative' }}>
                  <label>ผู้เข้าพัก &amp; ห้อง</label>
                  <button
                    type="button"
                    className="form-control d-flex align-items-center justify-content-between"
                    style={{ height: 42, background: 'white', border: '1px solid #ced4da', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#333', padding: '0 12px', textAlign: 'left' }}
                    onClick={() => setGuestOpen(o => !o)}
                  >
                    <span>
                      <i className="bi bi-person me-1" style={{ color: 'var(--sage)' }}></i>
                      {formatGuestSummary(search.adults, search.children, search.rooms)}
                    </span>
                    <i className={`bi bi-chevron-${guestOpen ? 'up' : 'down'}`} style={{ fontSize: 11, color: '#999' }}></i>
                  </button>
                  {guestOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
                      background: 'white', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                      border: '1px solid var(--ivory-dark)', padding: '16px 20px', marginTop: 4, minWidth: 260,
                      maxHeight: 320, overflowY: 'auto'
                    }}>
                      {[
                        { key: 'adults', label: 'ผู้ใหญ่', sub: 'อายุ 18 ปีขึ้นไป', min: 1 },
                        { key: 'children', label: 'เด็ก', sub: 'อายุต่ำกว่า 18 ปี', min: 0 },
                        { key: 'rooms', label: 'ห้อง', sub: 'จำนวนห้องพัก', min: 1 },
                      ].map(({ key, label, sub, min }, idx, arr) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: idx < arr.length - 1 ? '1px solid var(--ivory-dark)' : 'none' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{sub}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button type="button"
                              style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--ivory-dark)', background: search[key] <= min ? 'var(--ivory)' : 'white', cursor: search[key] <= min ? 'not-allowed' : 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: search[key] <= min ? '#ccc' : 'var(--sage-dark)', transition: 'all 0.15s' }}
                              onClick={() => setSearch(p => ({ ...p, [key]: Math.max(min, p[key] - 1) }))}>−</button>
                            <span style={{ width: 24, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>{search[key]}</span>
                            <button type="button"
                              style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--sage)', background: 'var(--sage)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', transition: 'all 0.15s' }}
                              onClick={() => setSearch(p => ({ ...p, [key]: p[key] + 1 }))}>+</button>
                          </div>
                        </div>
                      ))}
                      <button type="button" className="btn btn-gold w-100 mt-3" style={{ fontSize: 13, fontWeight: 700, borderRadius: 8 }} onClick={() => setGuestOpen(false)}>
                        ยืนยัน
                      </button>
                    </div>
                  )}
                </div>
                {/* 4. ปุ่มค้นหา */}
                <div className="col-6 col-md-3">
                  <button className="btn btn-gold w-100" style={{ fontSize: 14, fontWeight: 700, height: 42 }} onClick={handleSearch}>
                    <i className="bi bi-search me-1"></i>ค้นหา
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 1. บริการและสิ่งอำนวยความสะดวกภายในโรงแรม */}
      {/* ========================================== */}
      <section className="py-5" style={{ background: 'var(--ivory)' }}>
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="section-title">บริการและสิ่งอำนวยความสะดวก</h2>
            <div className="gold-divider"></div>
            <p className="section-subtitle">ยกระดับประสบการณ์การเข้าพักของคุณด้วยบริการระดับพรีเมียมจากเรา</p>
          </div>

          <div className="row g-4">
            {[
              { icon: 'bi-headset', title: 'บริการแผนกต้อนรับ 24 ชม.', desc: 'เจ้าหน้าที่พร้อมดูแลและให้บริการช่วยเหลือตลอด 24 ชั่วโมง' },
              { icon: 'bi-wifi', title: 'อินเทอร์เน็ตความเร็วสูง', desc: 'บริการ Wi-Fi ฟรีครอบคลุมทุกพื้นที่ทั้งในห้องพักและพื้นที่ส่วนกลาง' },
              { icon: 'bi-cup-hot', title: 'ห้องอาหาร & คาเฟ่', desc: 'เสิร์ฟอาหารเช้าบุฟเฟต์นานาชาติ และเครื่องดื่มเลิศรสตลอดวัน' },
              { icon: 'bi-water', title: 'สระว่ายน้ำกลางแจ้ง', desc: 'สระว่ายน้ำระบบเกลือพร้อมโซนพักผ่อนชมบรรยากาศธรรมชาติ' },
              { icon: 'bi-activity', title: 'ศูนย์ออกกำลังกาย', desc: 'ฟิตเนสครบครันด้วยอุปกรณ์ทันสมัยเปิดให้บริการทุกวัน' },
              { icon: 'bi-p-circle', title: 'ที่จอดรถส่วนตัวฟรี', desc: 'พื้นที่จอดรถกว้างขวาง ปลอดภัย พร้อมระบบกล้องวงจรปิด 24 ชม.' },
            ].map((facility, idx) => (
              <div key={idx} className="col-md-6 col-lg-4">
                <div style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: '24px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                  border: '1px solid var(--ivory-dark)',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'start',
                  gap: '16px',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'var(--sage-light)',
                    color: 'var(--sage-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    flexShrink: 0
                  }}>
                    <i className={`bi ${facility.icon}`}></i>
                  </div>
                  <div>
                    <h5 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#2c3e50' }}>{facility.title}</h5>
                    <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: 0, lineHeight: 1.5 }}>{facility.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 2. กฎและเงื่อนไขการเข้าพัก                  */}
      {/* ========================================== */}
      <section className="py-5" style={{ background: 'white' }}>
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="section-title">กฎและเงื่อนไขการเข้าพัก</h2>
            <div className="gold-divider"></div>
            <p className="section-subtitle">ข้อควรรู้เพื่อให้การเข้าพักของคุณและผู้ร่วมเดินทางเป็นไปอย่างราบรื่น</p>
          </div>

          <div className="row g-4 justify-content-center">
            {[
              {
                icon: 'bi-card-heading',
                title: 'เอกสารที่ต้องใช้แสดง',
                details: [
                  'บัตรประชาชน หรือ พาสปอร์ต (สำหรับชาวต่างชาติ) ตัวจริงของผู้เข้าพัก',
                  'การยืนยันการจองห้องพัก (Booking Confirmation)',
                  'ผู้เข้าพักต้องมีอายุ 18 ปีขึ้นไปสำหรับการลงทะเบียนเข้าพัก'
                ]
              },
              {
                icon: 'bi-exclamation-shield',
                title: 'ข้อปฏิบัติภายในที่พัก',
                details: [
                  'งดส่งเสียงดังรบกวนผู้อื่นหลังเวลา 22:00 น.',
                  'ห้ามสูบบุหรี่ภายในห้องพัก (สามารถสูบได้ในพื้นที่ที่จัดไว้ให้เท่านั้น)',
                  'ไม่อนุญาตให้นำสัตว์เลี้ยงเข้าพักภายในโรงแรม'
                ]
              }
            ].map((policy, idx) => (
              <div key={idx} className="col-md-6 col-lg-5">
                <div style={{
                  background: 'var(--ivory)',
                  borderRadius: 12,
                  padding: '24px',
                  borderLeft: '4px solid var(--sage)',
                  height: '100%',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className={`bi ${policy.icon}`} style={{ fontSize: 20, color: 'var(--sage-dark)' }}></i>
                    <h5 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#2c3e50' }}>{policy.title}</h5>
                  </div>
                  <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.7 }}>
                    {policy.details.map((item, i) => (
                      <li key={i} className="mb-1">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Rooms */}
      <section className="py-5 mt-2">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="section-title">ห้องพักของเรา</h2>
            <div className="gold-divider"></div>
            <p className="section-subtitle">เลือกห้องพักที่เหมาะกับคุณจากตัวเลือกหลากหลาย</p>
          </div>
          <div className="row g-4">
            {featuredRooms.map(room => (
              <div key={room.roomtype_id} className="col-lg-6">
                <div className="room-card">
                  <div style={{ overflow: 'hidden', position: 'relative' }}>
                    <img src={room.image_url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'} alt={room.roomtype_name} />
                    <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
                      <span style={{ background: 'rgba(44,62,80,0.75)', backdropFilter: 'blur(8px)', color: 'white', padding: '4px 12px', borderRadius: 50, fontSize: 12, fontWeight: 600 }}>{room.roomtype_name}</span>
                      <span style={{ background: room.available_rooms > 0 ? 'rgba(86,169,127,0.8)' : 'rgba(220,53,69,0.8)', backdropFilter: 'blur(8px)', color: 'white', padding: '4px 12px', borderRadius: 50, fontSize: 12, fontWeight: 600 }}>
                        {room.available_rooms > 0 ? `ว่าง ${room.available_rooms} ห้อง` : 'เต็ม'}
                      </span>
                    </div>
                  </div>
                  <div className="room-card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h5 style={{ fontFamily: 'Playfair Display', marginBottom: 2 }}>{room.roomtype_name}</h5>
                        <div className="d-flex align-items-center gap-2">
                          {room.review_count > 0 ? (
                            <>
                              <StarRating rating={Number(room.avg_rating)} size="sm" />
                              <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{Number(room.avg_rating).toFixed(1)}</span>
                            </>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-light)' }}>ยังไม่มีรีวิว</span>
                          )}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="price-tag">฿{formatPrice(room.price || 0)}<small>/คืน</small></div>
                        <div style={{ fontSize: 11, color: room.available_rooms > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                          {room.available_rooms > 0 ? 'ว่าง' : 'ไม่ว่าง'}
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 12 }}>{room.description}</p>
                    <div className="d-flex flex-wrap gap-1 mb-3">
                      {(room.facilities || []).slice(0, 4).map(a => <span key={a} className="amenity-badge">{a}</span>)}
                      {(room.facilities || []).length > 4 && <span className="amenity-badge">+{room.facilities.length - 4}</span>}
                    </div>
                    <div className="d-flex gap-2">
                      <button className="btn btn-outline-secondary btn-sm flex-1" style={{ borderRadius: 8 }}
                        onClick={() => navigate(`/rooms/${room.roomtype_id}`)}>ดูรายละเอียด</button>
                      {room.available_rooms > 0 ? (
                        <button className="btn btn-gold btn-sm flex-1"
                          onClick={() => currentUser?.role === 'member' ? navigate(`/booking/${room.roomtype_id}`) : setShowLogin(true)}>
                          {currentUser?.role === 'member' ? 'จองเลย' : 'เข้าสู่ระบบเพื่อจอง'}
                        </button>
                      ) : (
                        <button className="btn btn-secondary btn-sm flex-1" disabled style={{ borderRadius: 8, opacity: 0.5 }}>ไม่ว่าง</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Reviews */}
      {reviews.length > 0 && (
        <section className="py-5" style={{ background: 'var(--ivory-dark)' }}>
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="section-title">รีวิวจากผู้เข้าพัก</h2>
              <div className="gold-divider"></div>
            </div>
            <div className="row g-4">
              {reviews.slice(0, 3).map(r => (
                <div key={r.id} className="col-md-4">
                  <div className="review-card">
                    <div className="d-flex align-items-center gap-3 mb-3">
                      {r.images?.length > 0 ? (
                        <img src={r.images[0]} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--sage-light)', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--sage-light), var(--sage))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                          {r.userName[0]}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{r.userName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{r.roomType}</div>
                      </div>
                    </div>
                    <StarRating rating={r.rating} />
                    {r.images?.length > 0 && (
                      <div className="d-flex gap-2 mt-2 mb-2 flex-wrap">
                        {r.images.slice(0, 3).map((img, idx) => (
                          <img key={idx} src={img} alt="" style={{ width: 60, height: 50, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--ivory-dark)' }} />
                        ))}
                      </div>
                    )}
                    <p style={{ fontSize: 14, color: 'var(--text-mid)', marginTop: 8, marginBottom: 0 }}>"{r.comment}"</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-4">
              <button className="btn btn-outline-secondary" style={{ borderRadius: 50, padding: '8px 28px' }}
                onClick={() => navigate('/reviews')}>ดูรีวิวทั้งหมด</button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}