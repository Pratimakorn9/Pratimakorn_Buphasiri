// ==========================================
// pages/booking/BookingPage.jsx
// หน้ากรอกข้อมูลและยืนยันการจองห้องพัก
// ==========================================
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPrice, calcNights, formatDate, formatGuestSummary } from '../../components/Helpers';
import DateInput from '../../components/DateInput';
import { sanitizeName, sanitizeEmail, sanitizePhone, nameError, emailError, phoneError, normalizePhone } from '../../utils/validators';
import { API, getToken, authHeaders, BookingSteps, ConfirmBookingPopup, ConfirmPayPopup, CancelConfirmPopup } from './components/_shared';

// ===== FIELD (ช่องกรอกพร้อมป้ายชื่อ/ข้อความผิดพลาด) =====
// FIX: เดิมประกาศ Field ไว้ "ข้างใน" BookingPage ทำให้ทุกครั้งที่พิมพ์ 1 ตัวอักษร (state เปลี่ยน → render ใหม่)
// React มองว่า Field เป็นคอมโพเนนต์ตัวใหม่ จึงถอด input เก่าทิ้งแล้วสร้างใหม่ ทำให้ cursor หลุดต้องคลิกใหม่ทุกตัวอักษร
// ย้ายออกมาประกาศนอกคอมโพเนนต์ เพื่อให้ identity คงที่และ input ไม่ถูกสร้างใหม่
function Field({ label, required, error, children }) {
  return (
    <div className="form-group">
      <label className="form-label-aurora">{label}{required && <span className="required-star ms-1">*</span>}</label>
      {children}
      {error && <div className="form-error"><i className="bi bi-exclamation-circle me-1"></i>{error}</div>}
    </div>
  );
}

// ===== BOOKING PAGE =====
export function BookingPage() {
  const { roomId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useApp();

  // 1. เปลี่ยนการใช้ mockData (ROOMS) เป็นดึงจาก Database แทน
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const roomIdsParam = params.get('roomIds') || roomId;
  const selectedRoomIds = roomIdsParam.split(',').filter(Boolean);

  const [form, setForm] = useState({
    checkIn: params.get('checkIn') || today,
    checkOut: params.get('checkOut') || tomorrow,
    adults: parseInt(params.get('adults') || 2),
    children: parseInt(params.get('children') || 0),
    rooms: parseInt(params.get('rooms') || selectedRoomIds.length || 1),
    contactName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : '',
    contactEmail: currentUser?.email || '',
    contactPhone: sanitizePhone(currentUser?.phone || ''), // เริ่มจากเบอร์ในโปรไฟล์ แก้เป็นเบอร์คนอื่นได้
    specialRequest: '',
  });
  const [errors, setErrors] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState(null);
  const [guestOpen, setGuestOpen] = useState(false);
  const guestRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (guestRef.current && !guestRef.current.contains(e.target)) setGuestOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 2. useEffect สำหรับดึงข้อมูลห้องพักจาก Database
  useEffect(() => {
    fetch(`${API}/room-types/${roomId}?checkin=${form.checkIn}&checkout=${form.checkOut}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const maxAdultsPerRoom = data.data.max_guest;
          const maxChildrenPerRoom = 2;
          setRoom({
            id: data.data.roomtype_id,
            roomNumber: data.data.roomtype_id,
            name: data.data.roomtype_name,
            price: data.data.price || 0,
            maxAdults: maxAdultsPerRoom,
            maxChildren: maxChildrenPerRoom,
            availableRooms: data.data.available_rooms || 0,
            image: data.data.image_url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
          });
          setForm(prev => {
            // FIX: เดิมถ้าจำนวนผู้เข้าพักเกินความจุของจำนวนห้องที่มี จะตัดจำนวนคนลงเงียบๆ
            // (เช่นค้นหา 3 คนแต่ห้องนี้จุ 2 คน/ห้อง กับเลือกไว้ 1 ห้อง จะโดนลดเหลือ 2 คนโดยไม่บอกเหตุผล)
            // ตอนนี้ให้เพิ่มจำนวนห้องอัตโนมัติให้พอกับจำนวนคนที่ค้นหามาก่อน แล้วค่อยจำกัดตามห้องว่างจริง
            const neededRoomsForGuests = Math.max(1, Math.ceil(prev.adults / maxAdultsPerRoom));
            const desiredRooms = Math.max(prev.rooms, neededRoomsForGuests);
            const clampedRooms = Math.max(1, Math.min(desiredRooms, data.data.available_rooms || 1));
            return {
              ...prev,
              rooms: clampedRooms,
              adults: Math.max(1, Math.min(prev.adults, maxAdultsPerRoom * clampedRooms)),
              children: Math.min(prev.children, maxChildrenPerRoom * clampedRooms),
            };
          });
        }
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [roomId, form.checkIn, form.checkOut]);

  if (loading) return <div className="text-center py-5"><span className="spinner-border text-sage"></span></div>;
  if (!room) return <div className="container py-5 text-center"><h4>ไม่พบห้องพัก</h4><button className="btn btn-gold mt-3" onClick={() => navigate('/rooms')}>กลับ</button></div>;
  if (!currentUser || currentUser.role !== 'member') { navigate('/'); return null; }

  const nights = calcNights(form.checkIn, form.checkOut);
  const total = room.price * nights * form.rooms;
  const set = k => e => { setForm(p => ({ ...p, [k]: e.target.value })); if (errors[k]) setErrors(p => ({ ...p, [k]: '' })); };
  // กรองตัวอักษรที่ไม่อนุญาตตอนพิมพ์ (ชื่อ: ไทย/อังกฤษ, อีเมล: อังกฤษ/ตัวเลข/สัญลักษณ์อีเมล)
  const setClean = (k, clean) => e => { setForm(p => ({ ...p, [k]: clean(e.target.value) })); if (errors[k]) setErrors(p => ({ ...p, [k]: '' })); };
  // FIX: เดิมเปลี่ยนวันเข้าพักได้โดยไม่ปรับวันออก ทำให้เลือกวันเข้าพักมากกว่าวันออกได้
  const setCheckIn = e => {
    const newCheckIn = e.target.value;
    setForm(p => ({
      ...p,
      checkIn: newCheckIn,
      checkOut: newCheckIn >= p.checkOut ? new Date(new Date(newCheckIn).getTime() + 86400000).toISOString().split('T')[0] : p.checkOut,
    }));
  };

  const validate = () => {
    const e = {};
    const nameErr = nameError('ชื่อผู้เข้าพัก', form.contactName, { max: 100 });
    if (nameErr) e.contactName = nameErr;
    const emailErr = emailError(form.contactEmail);
    if (emailErr) e.contactEmail = emailErr;
    const phoneErr = phoneError(form.contactPhone);
    if (phoneErr) e.contactPhone = phoneErr;
    return e;
  };

  // 3. เปลี่ยนการบันทึกเป็นการยิง API เข้าฐานข้อมูลจริง
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    
    const payload = {
      member_id: currentUser.id,
      roomtype_id: room.id,
      checkin_date: form.checkIn,
      checkout_date: form.checkOut,
      price: total,
      special_request: form.specialRequest,
      room_count: form.rooms,
      adults: form.adults,
      children: form.children,
      // FIX: เดิมกรอกชื่อ/เบอร์ผู้ติดต่อในฟอร์มนี้ได้ (เผื่อจองแทนคนอื่น หรือใช้เบอร์อื่น) แต่ไม่เคยส่งไป backend เลย
      // ทำให้สิ่งที่พิมพ์ไปหายเงียบๆ ตอนนี้ส่งไปเก็บจริงด้วย
      contact_name: form.contactName,
      contact_email: form.contactEmail,
      contact_phone: normalizePhone(form.contactPhone),
    };

    try {
      const res = await fetch(`${API}/bookings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if(data.success) {
        setPendingBookingId(data.booking_id);
        setShowConfirm(true);
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  };

  return (
    <div className="container py-5">
      <button className="btn btn-outline-secondary btn-sm mb-4" style={{ borderRadius: 8 }} onClick={() => navigate(-1)}>
        <i className="bi bi-arrow-left me-2"></i>กลับ
      </button>
      <BookingSteps step={2} />
      <div className="row g-4">
        <div className="col-lg-8">
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 32, boxShadow: 'var(--shadow-sm)' }}>
            <h4 style={{ fontFamily: 'Playfair Display', marginBottom: 6 }}>ข้อมูลการจอง</h4>
            <p style={{ color: 'var(--text-light)', fontSize: 13, marginBottom: 26 }}>กรุณากรอกข้อมูลให้ครบถ้วน <span className="required-star">*</span> = จำเป็น</p>
            <form onSubmit={handleSubmit} noValidate>
              <h6 style={{ fontWeight: 700, marginBottom: 14, color: 'var(--sage-dark)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-calendar3"></i>วันที่เข้าพัก
              </h6>
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <Field label="วันเข้าพัก" required>
                    <DateInput min={today} value={form.checkIn} onChange={setCheckIn} required />
                  </Field>
                </div>
                <div className="col-md-6">
                  <Field label="วันออก" required>
                    <DateInput min={form.checkIn} value={form.checkOut} onChange={set('checkOut')} required />
                  </Field>
                </div>
                <div className="col-12" ref={guestRef} style={{ position: 'relative' }}>
                  <label className="form-label-aurora">ผู้เข้าพัก &amp; ห้อง</label>
                  <button
                    type="button"
                    className="form-control-aurora d-flex align-items-center justify-content-between"
                    style={{ cursor: 'pointer', fontSize: 14, padding: '0 14px', height: 44 }}
                    onClick={() => setGuestOpen(o => !o)}
                  >
                    <span>
                      <i className="bi bi-person me-2" style={{ color: 'var(--sage)' }}></i>
                      {formatGuestSummary(form.adults, form.children, form.rooms)}
                    </span>
                    <i className={`bi bi-chevron-${guestOpen ? 'up' : 'down'}`} style={{ fontSize: 11, color: '#999' }}></i>
                  </button>
                  {guestOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
                      background: 'white', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                      border: '1px solid var(--ivory-dark)', padding: '16px 20px', marginTop: 4
                    }}>
                      {[
                        { key: 'adults', label: 'ผู้ใหญ่', sub: `สูงสุด ${room.maxAdults} คน/ห้อง`, min: 1, max: room.maxAdults * form.rooms },
                        { key: 'children', label: 'เด็ก', sub: `สูงสุด ${room.maxChildren} คน/ห้อง`, min: 0, max: room.maxChildren * form.rooms },
                        { key: 'rooms', label: 'ห้อง', sub: room.availableRooms > 0 ? `ว่าง ${room.availableRooms} ห้อง` : 'ไม่มีห้องว่างในช่วงนี้', min: 1, max: Math.max(room.availableRooms, 0) },
                      ].map(({ key, label, sub, min, max }, idx, arr) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: idx < arr.length - 1 ? '1px solid var(--ivory-dark)' : 'none' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{sub}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button type="button"
                              style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--ivory-dark)', background: form[key] <= min ? 'var(--ivory)' : 'white', cursor: form[key] <= min ? 'not-allowed' : 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: form[key] <= min ? '#ccc' : 'var(--sage-dark)', transition: 'all 0.15s' }}
                              onClick={() => setForm(p => ({ ...p, [key]: Math.max(min, p[key] - 1) }))}>−</button>
                            <span style={{ width: 24, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>{form[key]}</span>
                            <button type="button"
                              style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--sage)', background: form[key] >= max ? 'var(--ivory)' : 'var(--sage)', cursor: form[key] >= max ? 'not-allowed' : 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: form[key] >= max ? '#ccc' : 'white', transition: 'all 0.15s' }}
                              onClick={() => setForm(p => ({ ...p, [key]: Math.min(max, p[key] + 1) }))}>+</button>
                          </div>
                        </div>
                      ))}
                      <button type="button" className="btn btn-gold w-100 mt-3" style={{ fontSize: 13, fontWeight: 700, borderRadius: 8 }} onClick={() => setGuestOpen(false)}>
                        ยืนยัน
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <hr style={{ borderColor: 'var(--ivory-dark)', margin: '20px 0' }} />
              <h6 style={{ fontWeight: 700, marginBottom: 14, color: 'var(--sage-dark)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-person"></i>ข้อมูลผู้ติดต่อ
              </h6>
              <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 16 }}>
                <i className="bi bi-info-circle me-1"></i>สามารถใส่ชื่อบุคคลอื่นได้ หากต้องการจองให้ผู้อื่น
              </p>
              <div className="row g-3 mb-3">
                <div className="col-12">
                  <Field label="ชื่อ-นามสกุลผู้เข้าพัก" required error={errors.contactName}>
                    <input className={`form-control-aurora ${errors.contactName ? 'is-invalid' : ''}`}
                      placeholder="ชื่อผู้เข้าพักจริง" maxLength={100} value={form.contactName} onChange={setClean('contactName', v => sanitizeName(v, 100))} />
                  </Field>
                </div>
                <div className="col-md-6">
                  <Field label="อีเมล" required error={errors.contactEmail}>
                    <input type="email" className={`form-control-aurora ${errors.contactEmail ? 'is-invalid' : ''}`}
                      placeholder="email@example.com" maxLength={50} value={form.contactEmail} onChange={setClean('contactEmail', sanitizeEmail)} />
                  </Field>
                </div>
                <div className="col-md-6">
                  <Field label="เบอร์โทร" required error={errors.contactPhone}>
                    <input className={`form-control-aurora ${errors.contactPhone ? 'is-invalid' : ''}`}
                      placeholder="กรุณากรอกเบอร์โทรศัพท์" inputMode="numeric" maxLength={10} value={form.contactPhone} onChange={setClean('contactPhone', sanitizePhone)} />
                  </Field>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label-aurora">คำขอพิเศษ (ไม่บังคับ)</label>
                <textarea className="form-control-aurora" rows={3} placeholder="เช่น ห้องชั้นสูง, ที่จอดรถ, อาหารพิเศษ..."
                  value={form.specialRequest} onChange={set('specialRequest')} style={{ resize: 'vertical' }}></textarea>
              </div>
              <button 
                className="btn-aurora-primary w-100"
                disabled={form.rooms > room.availableRooms || room.availableRooms <= 0}
                onClick={handleSubmit}
              >
                {room.availableRooms <= 0 ? 'ห้องเต็มในช่วงวันที่เลือก' : 'ยืนยันการจอง'}
              </button>
            </form>
          </div>
        </div>

        {/* Summary */}
        <div className="col-lg-4">
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 22, boxShadow: 'var(--shadow-md)', border: '1px solid var(--ivory-dark)', position: 'sticky', top: 80 }}>
            <img src={room.image} alt={room.name} style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 12, marginBottom: 14 }} />
            <h6 style={{ fontFamily: 'Playfair Display', fontSize: 17 }}>{room.name}</h6>
            <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 14 }}><i className="bi bi-geo-alt me-1"></i>Aurora Grand Hotel</div>
            <div style={{ background: 'var(--ivory)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div className="d-flex justify-content-between mb-2" style={{ fontSize: 13 }}><span style={{ color: 'var(--text-mid)' }}>เช็คอิน</span><strong>{formatDate(form.checkIn)}</strong></div>
              <div className="d-flex justify-content-between mb-2" style={{ fontSize: 13 }}><span style={{ color: 'var(--text-mid)' }}>เช็คเอาต์</span><strong>{formatDate(form.checkOut)}</strong></div>
              <div className="d-flex justify-content-between mb-2" style={{ fontSize: 13 }}><span style={{ color: 'var(--text-mid)' }}>ระยะเวลา</span><strong>{nights} คืน</strong></div>
              <div className="d-flex justify-content-between mb-2" style={{ fontSize: 13 }}><span style={{ color: 'var(--text-mid)' }}>ผู้ใหญ่</span><strong>{form.adults} คน</strong></div>
              {form.children > 0 && (
                <div className="d-flex justify-content-between mb-2" style={{ fontSize: 13 }}><span style={{ color: 'var(--text-mid)' }}>เด็ก</span><strong>{form.children} คน</strong></div>
              )}
              <div className="d-flex justify-content-between" style={{ fontSize: 13 }}><span style={{ color: 'var(--text-mid)' }}>จำนวนห้อง</span><strong>{form.rooms} ห้อง</strong></div>
            </div>
            <div style={{ borderTop: '1px solid var(--ivory-dark)', paddingTop: 14 }}>
              <div className="d-flex justify-content-between mb-2" style={{ fontSize: 13 }}>
                <span>฿{formatPrice(room.price)} × {nights} คืน × {form.rooms} ห้อง</span>
                <span>฿{formatPrice(total)}</span>
              </div>
              <div className="d-flex justify-content-between fw-700 mt-2" style={{ fontSize: 17 }}>
                <span>รวมทั้งหมด</span>
                <span style={{ color: 'var(--warm-dark)' }}>฿{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showConfirm && <ConfirmBookingPopup bookingId={pendingBookingId} onClose={() => setShowConfirm(false)} />}
    </div>
  );
}