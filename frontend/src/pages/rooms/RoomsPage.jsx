// ==========================================
// pages/rooms/RoomsPage.jsx
// หน้าแสดงรายการห้องพักทั้งหมด แยกตามประเภทห้อง (4 แบบ)
// ==========================================
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StarRating, formatPrice, calcNights, formatGuestSummary } from '../../components/Helpers';
import DateInput from '../../components/DateInput';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ========================================================
// 1. หน้าแสดงลิสต์ห้องพัก แยกตามประเภทห้อง (4 แบบ)
// ========================================================
export function RoomsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setShowLogin, currentUser } = useApp();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [search, setSearch] = useState({
    checkIn: params.get('checkIn') || today,
    checkOut: params.get('checkOut') || tomorrow,
    adults: parseInt(params.get('adults') || 2),
    children: parseInt(params.get('children') || 0),
    rooms: parseInt(params.get('rooms') || 1),
  });

  const [priceFilter, setPriceFilter] = useState('all');
  const [guestOpen, setGuestOpen] = useState(false);
  const guestRef = useRef(null);
  const nights = calcNights(search.checkIn, search.checkOut);

  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  // FIX: เดิมหน้านี้โหลดและโชว์ห้องพักทั้งหมดทันทีตอนเข้าหน้า ไม่สนว่ากดค้นหาหรือยัง
  // ถ้ามาจากหน้าแรกที่กดค้นหาแล้ว (มี checkIn ใน URL) ให้ถือว่าค้นหาแล้ว ไม่งั้นต้องกดค้นหาเองก่อน
  const [searched, setSearched] = useState(!!params.get('checkIn'));

  const runSearch = () => {
    setLoading(true);
    setSearched(true);
    fetch(`${API}/room-types?checkin=${search.checkIn}&checkout=${search.checkOut}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setRoomTypes(data.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching room types:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    const handler = (e) => { if (guestRef.current && !guestRef.current.contains(e.target)) setGuestOpen(false); };
    document.addEventListener('mousedown', handler);
    if (searched) runSearch(); // มาจากการค้นหาในหน้าแรกแล้ว โหลดผลลัพธ์ทันที
    return () => document.removeEventListener('mousedown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTypes = roomTypes.filter(rt => {
    const price = Number(rt.price || 0);
    if (priceFilter === 'low' && price > 1500) return false;
    if (priceFilter === 'mid' && (price < 1500 || price > 3000)) return false;
    if (priceFilter === 'high' && price < 3000) return false;
    return true;
  });

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1 className="mb-2">ห้องพักทั้งหมด</h1>
          <p className="mb-0">สัมผัสประสบการณ์การพักผ่อนเหนือระดับ เลือกประเภทห้องพักที่เหมาะกับคุณ</p>
        </div>
      </div>

      <div className="container pb-5">
        {/* Search bar */}
        <div className="search-box mb-5" style={{ background: 'var(--white)', padding: 24, borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label-aurora" style={{ fontWeight: 600, marginBottom: 8 }}>วันเข้าพัก (Check-in)</label>
              <DateInput className="" min={today} value={search.checkIn}
                onChange={e => {
                  const newCheckIn = e.target.value;
                  // FIX: เดิมเปลี่ยนวันเข้าพักได้โดยไม่ปรับวันออก ทำให้เลือกวันเข้าพักมากกว่าวันออกได้
                  setSearch(p => ({
                    ...p,
                    checkIn: newCheckIn,
                    checkOut: newCheckIn >= p.checkOut ? new Date(new Date(newCheckIn).getTime() + 86400000).toISOString().split('T')[0] : p.checkOut,
                  }));
                }} />
            </div>
            <div className="col-md-3">
              <label className="form-label-aurora" style={{ fontWeight: 600, marginBottom: 8 }}>วันออก (Check-out)</label>
              <DateInput className="" min={search.checkIn} value={search.checkOut}
                onChange={e => setSearch(p => ({ ...p, checkOut: e.target.value }))} />
            </div>
            <div className="col-md-4" ref={guestRef} style={{ position: 'relative' }}>
              <label className="form-label-aurora" style={{ fontWeight: 600, marginBottom: 8 }}>ผู้เข้าพัก &amp; ห้อง</label>
              <button
                type="button"
                className="form-control-aurora d-flex align-items-center justify-content-between"
                style={{ height: 42, background: 'white', cursor: 'pointer', fontSize: 14, padding: '0 12px' }}
                onClick={() => setGuestOpen(o => !o)}
              >
                <span>
                  <i className="bi bi-people-fill me-2" style={{ color: 'var(--sage)' }}></i>
                  {formatGuestSummary(search.adults, search.children, search.rooms)}
                </span>
                <i className={`bi bi-chevron-${guestOpen ? 'up' : 'down'}`} style={{ fontSize: 11, color: '#999' }}></i>
              </button>

              {guestOpen && (
                // FIX (responsive): เดิม left:0 + minWidth:280 โดยไม่มี right/maxWidth กำกับ
                // บนมือถือจอแคบมาก (ต่ำกว่า ~308px) กล่องนี้จะกว้างเกินคอลัมน์แล้วล้นขอบจอขวาได้
                // เพิ่ม right:0 (ให้ขยายเท่าคอลัมน์เป็นค่าเริ่มต้น) และ maxWidth กันไม่ให้กว้างเกิน viewport เด็ดขาด
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, background: 'white', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid var(--ivory-dark)', padding: '16px 20px', marginTop: 4, minWidth: 280, maxWidth: 'calc(100vw - 32px)' }}>
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
                        <button type="button" className="counter-btn" style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #ccc', background: 'white' }} onClick={() => setSearch(p => ({ ...p, [key]: Math.max(min, p[key] - 1) }))}>−</button>
                        <span style={{ fontWeight: 700, width: 20, textAlign: 'center' }}>{search[key]}</span>
                        <button type="button" className="counter-btn" style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #ccc', background: 'white' }} onClick={() => setSearch(p => ({ ...p, [key]: p[key] + 1 }))}>+</button>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="btn btn-gold w-100 mt-3" style={{ fontSize: 13, fontWeight: 700, borderRadius: 8 }} onClick={() => setGuestOpen(false)}>ยืนยัน</button>
                </div>
              )}
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button type="button" className="btn btn-gold w-100" style={{ height: 42, fontSize: 14, fontWeight: 700 }} onClick={runSearch}>
                <i className="bi bi-search me-1"></i>ค้นหา
              </button>
            </div>
          </div>
          {searched && (
            <div className="mt-2" style={{ fontSize: 13, color: 'var(--text-mid)' }}>
              <i className="bi bi-moon-stars-fill me-1" style={{ color: 'var(--gold)' }}></i>พักผ่อนรวม {nights} คืน
            </div>
          )}
        </div>

        {/* Filter bar */}
        {searched && (
          <div className="d-flex gap-2 mb-4 flex-wrap align-items-center" style={{ background: '#f8f9fa', padding: '12px 20px', borderRadius: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-light)', fontWeight: 700 }}>ช่วงราคาห้องพัก:</span>
            {[
              { v: 'all', l: 'ห้องพักทั้งหมด' },
              // { v: 'low', l: 'งบประหยัด (≤ ฿1,500)' },
              // { v: 'mid', l: 'ระดับมาตรฐาน (฿1,500–3,000)' },
              // { v: 'high', l: 'หรูหราพรีเมียม (≥ ฿3,000)' }
            ].map(f => (
              <button key={f.v} className={`btn btn-sm ${priceFilter === f.v ? 'btn-gold' : 'btn-outline-secondary'}`} style={{ borderRadius: 20, padding: '4px 16px', fontSize: 12, marginLeft: 4 }} onClick={() => setPriceFilter(f.v)}>{f.l}</button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-mid)', fontWeight: 600 }}>พบทั้งหมด {filteredTypes.length} ประเภท</span>
          </div>
        )}

        {/* Room Type Grid List (4 แบบ) */}
        {/* FIX: เดิมโชว์ห้องพักทั้งหมดทันทีไม่ว่าจะกดค้นหาหรือยัง ตอนนี้ต้องกดค้นหาก่อนถึงจะขึ้นผลลัพธ์ */}
        {!searched ? (
          <div className="text-center py-5" style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
            <i className="bi bi-search" style={{ fontSize: 48, color: '#ccc' }}></i>
            <h5 className="mt-3" style={{ color: 'var(--text-light)' }}>กรุณาเลือกวันที่แล้วกด "ค้นหา" เพื่อดูห้องพักที่ว่าง</h5>
          </div>
        ) : loading ? (
          <div className="text-center py-5"><span className="spinner-border text-sage"></span></div>
        ) : filteredTypes.length === 0 ? (
          <div className="text-center py-5" style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
            <i className="bi bi-door-closed" style={{ fontSize: 48, color: '#ccc' }}></i>
            <h5 className="mt-3" style={{ color: 'var(--text-light)' }}>ไม่พบข้อมูลห้องพักที่ตรงกับเงื่อนไขการค้นหา</h5>
          </div>
        ) : (
          <div className="row g-4">
            {filteredTypes.map(rt => {
              const currentPrice = Number(rt.price || 1500);
              const maxGuests = rt.max_guest || 2;
              const imageUrl = rt.image_url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800';

              return (
                <div key={rt.roomtype_id} className="col-12">
                  <div className="room-card" style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid rgba(0,0,0,0.05)', transition: 'all 0.3s' }}>
                    <div className="row g-0">
                      <div className="col-md-4">
                        <img src={imageUrl} alt={rt.roomtype_name} style={{ width: '100%', height: '100%', minHeight: 240, objectFit: 'cover' }} />
                      </div>

                      <div className="col-md-8">
                        <div className="room-card-body h-100 d-flex flex-column" style={{ padding: '24px 28px' }}>
                          <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
                            <div>
                              <h4 style={{ fontFamily: 'Playfair Display', fontWeight: 700, margin: 0, color: 'var(--navy)' }}>
                                {rt.roomtype_name}
                              </h4>
                              <div className="mt-2">
                                <span className={`status-badge ${rt.available_rooms > 0 ? 'status-confirmed' : 'status-cancelled'}`} style={{ fontSize: 11, padding: '4px 12px' }}>
                                  {rt.available_rooms > 0 ? `ว่าง ${rt.available_rooms} ห้อง` : 'ห้องเต็มในขณะนี้'}
                                </span>
                              </div>
                            </div>
                            <div className="text-md-end">
                              <div className="price-tag" style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)' }}>฿{formatPrice(currentPrice)}<small style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 400 }}> / คืน</small></div>
                              <div style={{ fontSize: 12, color: 'var(--warm-dark)', fontWeight: 600, marginTop: 2 }}>ราคารวม ({nights} คืน): ฿{formatPrice(currentPrice * nights)}</div>
                            </div>
                          </div>

                          <div className="d-flex gap-4 mb-3 flex-wrap mt-2" style={{ fontSize: 13, color: 'var(--text-mid)', borderBottom: '1px solid #f0f0f0', paddingBottom: 12 }}>
                            <span><i className="bi bi-person-fill me-1" style={{ color: 'var(--gold)' }}></i>ขนาดความจุ: สูงสุด {maxGuests} ท่าน/ห้อง</span>
                            {rt.room_size && <span><i className="bi bi-rulers me-1" style={{ color: 'var(--gold)' }}></i>ขนาดห้อง: {rt.room_size}</span>}
                          </div>

                          <p style={{ fontSize: 13, color: 'var(--text-mid)', flex: 1, lineHeight: 1.6, margin: 0 }}>
                            {rt.description || 'สัมผัสประสบการณ์การพักผ่อนอันแสนอบอุ่น เพียบพร้อมด้วยสิ่งอำนวยความสะดวกครบครันตามมาตรฐานของโรงแรม ออโรร่า แกรนด์ มาพร้อมการตกแต่งร่วมสมัยอันหรูหรา'}
                          </p>

                          {rt.facilities?.length > 0 && (
                            <div className="d-flex flex-wrap gap-1 mt-3">
                              {rt.facilities.slice(0, 4).map(f => <span key={f} className="amenity-badge" style={{ fontSize: 10 }}>{f}</span>)}
                              {rt.facilities.length > 4 && <span className="amenity-badge" style={{ fontSize: 10 }}>+{rt.facilities.length - 4}</span>}
                            </div>
                          )}

                          <div className="d-flex gap-2 align-items-center mt-3 pt-3" style={{ borderTop: '1px solid #f5f5f5' }}>
                            <div className="ms-auto d-flex gap-2">
                              <button type="button" className="btn btn-outline-secondary btn-sm" style={{ borderRadius: 8, padding: '6px 16px', fontSize: 12 }}
                                onClick={() => navigate(`/rooms/${rt.roomtype_id}?checkIn=${search.checkIn}&checkOut=${search.checkOut}&adults=${search.adults}&children=${search.children}&rooms=${search.rooms}`)}>
                                ดูรายละเอียด
                              </button>

                              {rt.available_rooms > 0 ? (
                                <button type="button" className="btn btn-gold btn-sm" style={{ padding: '6px 20px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}
                                  onClick={() => {
                                    if (currentUser?.role !== 'member') { setShowLogin(true); return; }
                                    navigate(`/booking/${rt.roomtype_id}?checkIn=${search.checkIn}&checkOut=${search.checkOut}&adults=${search.adults}&children=${search.children}&rooms=${search.rooms}`);
                                  }}>
                                  {currentUser?.role === 'member' ? 'จองห้องนี้' : 'เข้าสู่ระบบเพื่อจอง'}
                                </button>
                              ) : (
                                <button type="button" className="btn btn-secondary btn-sm" disabled style={{ opacity: 0.5, padding: '6px 20px', borderRadius: 8, fontSize: 12 }}>
                                  ไม่พร้อมใช้งาน
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}