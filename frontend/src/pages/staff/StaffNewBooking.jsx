// ==========================================
// pages/staff/StaffNewBooking.jsx
// สร้างรายการจองใหม่ให้ลูกค้า (Walk-in)
// ==========================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import generatePayload from 'promptpay-qr';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../../context/AppContext';
import { formatPrice, formatDate } from '../../components/Helpers';
import DateInput from '../../components/DateInput';
import { sanitizeName, sanitizeEmail, sanitizePhone, nameError, emailError, phoneError, normalizePhone } from '../../utils/validators';
import { apiFetch, Popup, StaffSidebar } from './components/_shared';

const PROMPTPAY_ACCOUNT_ID = '0638581730';

export function StaffNewBooking() {
  const { refreshBookings, cancelBooking, confirmWalkInPayment } = useApp();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [roomTypes, setRoomTypes] = useState([]);

  const [form, setForm] = useState({
    roomtypeId: '',
    checkIn: today, checkOut: tomorrow,
    adults: 2, children: 0, rooms: 1,
    contactName: '', contactEmail: '', contactPhone: '',
    specialRequest: '',
  });

  useEffect(() => {
    if (!form.checkIn || !form.checkOut) return;
    apiFetch(`/room-types?checkin=${form.checkIn}&checkout=${form.checkOut}`).then(d => {
      if (d.success) setRoomTypes(d.data.filter(rt => rt.available_rooms > 0));
    }).catch(() => {});
  }, [form.checkIn, form.checkOut]);

  useEffect(() => {
    if (roomTypes.length === 0) return;
    const stillAvailable = roomTypes.some(r => Number(r.roomtype_id) === Number(form.roomtypeId));
    if (!form.roomtypeId || !stillAvailable) {
      setForm(p => ({ ...p, roomtypeId: roomTypes[0].roomtype_id }));
    }
  }, [roomTypes]);

  const [qrPopup, setQrPopup] = useState(null);
  const [payConfirmPopup, setPayConfirmPopup] = useState(false);
  const [assignedRooms, setAssignedRooms] = useState([]);
  const [timeLeft, setTimeLeft] = useState(600); // 10 นาที (600 วินาที)

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const [errors, setErrors] = useState({});
  const setClean = (k, clean) => e => { setForm(p => ({ ...p, [k]: clean(e.target.value) })); if (errors[k]) setErrors(p => ({ ...p, [k]: '' })); };
  const selectedRoom = roomTypes.find(r => r.roomtype_id === parseInt(form.roomtypeId));
  const nights = Math.max(1, Math.round((new Date(form.checkOut) - new Date(form.checkIn)) / 86400000));
  const total = (selectedRoom?.price || 0) * nights * form.rooms;

  useEffect(() => {
    if (selectedRoom) {
      setForm(p => ({ ...p, rooms: Math.min(p.rooms, selectedRoom.available_rooms || 1) }));
    }
  }, [form.roomtypeId, selectedRoom?.available_rooms]);

  // ตัวนับเวลาถอยหลัง 10 นาทีสำหรับ QR Popup
  useEffect(() => {
    if (!qrPopup) return;
    setTimeLeft(600);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          cancelBooking(qrPopup.id, 'CANCELLED_SYSTEM');
          alert('หมดเวลาชำระเงิน (10 นาที) ระบบยกเลิกการจองนี้แล้ว');
          setQrPopup(null);
          refreshBookings();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [qrPopup]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // ตรวจข้อมูลลูกค้าก่อนส่ง (อีเมลไม่บังคับ แต่ถ้ากรอกต้องถูกรูปแบบ)
    const errs = {};
    const nameErr = nameError('ชื่อผู้เข้าพัก', form.contactName, { max: 100 });
    if (nameErr) errs.contactName = nameErr;
    const emailErr = emailError(form.contactEmail, { required: false });
    if (emailErr) errs.contactEmail = emailErr;
    const phoneErr = phoneError(form.contactPhone);
    if (phoneErr) errs.contactPhone = phoneErr;
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      const d = await apiFetch('/staff/bookings', {
        method: 'POST',
        body: JSON.stringify({
          roomtype_id: selectedRoom?.roomtype_id,
          checkin_date: form.checkIn,
          checkout_date: form.checkOut,
          price: total,
          special_request: form.specialRequest,
          room_count: form.rooms,
          contact_name: form.contactName,
          contact_email: form.contactEmail,
          contact_phone: normalizePhone(form.contactPhone),
        }),
      });
      if (d.success) {
        setQrPopup({
          id: d.booking_id,
          contactName: form.contactName,
          roomName: selectedRoom?.roomtype_name,
          rooms: form.rooms,
          checkIn: form.checkIn, checkOut: form.checkOut,
          totalAmount: total,
        });
      }
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาด');
    }
  };

  // ยืนยันการชำระเงิน + เช็คอินให้อัตโนมัติทันที
  const handleConfirmPayment = async () => {
    if (!qrPopup) return;
    try {
      const res = await confirmWalkInPayment(qrPopup.id);
      if (res.success) {
        setAssignedRooms(res.assigned_rooms || []);
        setQrPopup(null);
        setPayConfirmPopup(true);
        refreshBookings();
      }
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการยืนยันชำระเงิน');
    }
  };

  // พนักงานกดยกเลิก
  const handleCancelBooking = async () => {
    if (!qrPopup) return;
    if (window.confirm('คุณต้องการยกเลิกการจองนี้ใช่หรือไม่?')) {
      try {
        await cancelBooking(qrPopup.id, 'CANCELLED_ADMIN');
        setQrPopup(null);
        refreshBookings();
      } catch (err) {
        alert(err.message || 'เกิดข้อผิดพลาด');
      }
    }
  };

  const handlePrintQR = () => {
    if (!qrPopup) return;
    const printWindow = window.open('', '', 'width=420,height=520');
    const qrElement = document.getElementById('new-booking-qr-print');

    printWindow.document.write(`
      <html>
        <head>
          <title>พิมพ์ QR Code - #${qrPopup.id}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; color: #333; }
            .header { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
            .sub { font-size: 12px; color: #666; margin-bottom: 16px; }
            .qr-box { display: inline-block; padding: 12px; border: 1px solid #ccc; border-radius: 8px; margin-bottom: 12px; }
            .amount { font-size: 22px; font-weight: bold; color: #111; margin-top: 6px; }
            .room-info { font-size: 13px; color: #444; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header">สแกนชำระเงิน (PromptPay)</div>
          <div class="sub">รหัสการจอง: #${qrPopup.id} | ผู้จอง: ${qrPopup.contactName}</div>
          <div class="qr-box">${qrElement ? qrElement.innerHTML : ''}</div>
          <div class="amount">ยอดชำระ: ฿${formatPrice(qrPopup.totalAmount)}</div>
          <div class="room-info">ห้องพัก: ${qrPopup.roomName} (${formatDate(qrPopup.checkIn)} - ${formatDate(qrPopup.checkOut)})</div>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="dashboard-page">
      <StaffSidebar />
      <div className="dashboard-right">
        <div className="dash-top-bar">
          <h4 style={{ fontFamily: 'Playfair Display', margin: 0 }}>จองห้องให้ลูกค้า (Walk-in)</h4>
        </div>
        <div className="row g-4">
          <div className="col-lg-8">
            <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow-sm)' }}>
              <form onSubmit={handleSubmit}>
                <h6 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--sage-dark)' }}><i className="bi bi-building me-2"></i>เลือกห้อง</h6>
                <div className="row g-3 mb-4">
                  <div className="col-12">
                    {roomTypes.length === 0 ? (
                      <div style={{ padding: '12px 16px', background: 'var(--ivory)', borderRadius: 10, color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>
                        <i className="bi bi-exclamation-triangle me-2"></i>ไม่มีห้องว่างในขณะนี้
                      </div>
                    ) : (
                      <select className="form-control-aurora" value={form.roomtypeId} onChange={set('roomtypeId')} required>
                        {roomTypes.map(r => (
                          <option key={r.roomtype_id} value={r.roomtype_id}>{r.roomtype_name} — ฿{Number(r.price).toLocaleString()}/คืน (ว่าง {r.available_rooms} ห้อง)</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label-aurora">วันเข้าพัก <span className="required-star">*</span></label>
                    <DateInput min={today} value={form.checkIn} onChange={set('checkIn')} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label-aurora">วันออก <span className="required-star">*</span></label>
                    <DateInput min={form.checkIn} value={form.checkOut} onChange={set('checkOut')} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label-aurora">จำนวนห้อง <span className="required-star">*</span></label>
                    <div className="form-control-aurora d-flex align-items-center justify-content-between" style={{ padding: '6px 8px' }}>
                      <span style={{ fontWeight: 700 }}>{form.rooms} ห้อง</span>
                      <div className="d-flex align-items-center gap-1">
                        <button type="button"
                          onClick={() => setForm(p => ({ ...p, rooms: Math.max(1, p.rooms - 1) }))}
                          disabled={form.rooms <= 1}
                          style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--ivory)', color: 'var(--sage-dark)', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: form.rooms <= 1 ? 'not-allowed' : 'pointer', opacity: form.rooms <= 1 ? 0.35 : 1 }}>
                          <i className="bi bi-dash-lg"></i>
                        </button>
                        <button type="button"
                          onClick={() => setForm(p => ({ ...p, rooms: Math.min(selectedRoom?.available_rooms || 1, p.rooms + 1) }))}
                          disabled={form.rooms >= (selectedRoom?.available_rooms || 1)}
                          style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--ivory)', color: 'var(--sage-dark)', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: form.rooms >= (selectedRoom?.available_rooms || 1) ? 'not-allowed' : 'pointer', opacity: form.rooms >= (selectedRoom?.available_rooms || 1) ? 0.35 : 1 }}>
                          <i className="bi bi-plus-lg"></i>
                        </button>
                      </div>
                    </div>
                    {selectedRoom && <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>ว่าง {selectedRoom.available_rooms} ห้อง</div>}
                  </div>
                </div>
                <hr style={{ borderColor: 'var(--ivory-dark)', margin: '16px 0 20px' }} />
                <h6 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--sage-dark)' }}><i className="bi bi-person me-2"></i>ข้อมูลลูกค้า</h6>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label-aurora">ชื่อ-นามสกุล <span className="required-star">*</span></label>
                    <input className={`form-control-aurora ${errors.contactName ? 'is-invalid' : ''}`} placeholder="ชื่อผู้เข้าพัก" maxLength={100} value={form.contactName} onChange={setClean('contactName', v => sanitizeName(v, 100))} />
                    {errors.contactName && <div className="form-error"><i className="bi bi-exclamation-circle me-1"></i>{errors.contactName}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label-aurora">อีเมล</label>
                    <input type="email" className={`form-control-aurora ${errors.contactEmail ? 'is-invalid' : ''}`} placeholder="กรุณากรอกอีเมลผู้เข้าพัก" maxLength={50} value={form.contactEmail} onChange={setClean('contactEmail', sanitizeEmail)} />
                    {errors.contactEmail && <div className="form-error"><i className="bi bi-exclamation-circle me-1"></i>{errors.contactEmail}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label-aurora">เบอร์โทร <span className="required-star">*</span></label>
                    <input className={`form-control-aurora ${errors.contactPhone ? 'is-invalid' : ''}`} placeholder="กรุณากรอกเบอร์โทรศัพท์" inputMode="numeric" maxLength={10} value={form.contactPhone} onChange={setClean('contactPhone', sanitizePhone)} />
                    {errors.contactPhone && <div className="form-error"><i className="bi bi-exclamation-circle me-1"></i>{errors.contactPhone}</div>}
                  </div>
                  <div className="col-12">
                    <label className="form-label-aurora">คำขอพิเศษ</label>
                    <textarea className="form-control-aurora" rows={2} value={form.specialRequest} onChange={set('specialRequest')} style={{ resize: 'vertical' }} placeholder="เช่น ห้องชั้นสูง, ที่จอดรถ..."></textarea>
                  </div>
                </div>
                <div style={{ marginTop: 20 }}>
                  <button type="submit" className="btn-aurora-primary" style={{ maxWidth: 220 }}>
                    <i className="bi bi-calendar-plus me-2"></i>ทำการจองและรับชำระ
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="col-lg-4">
            {selectedRoom && (
              <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 22, boxShadow: 'var(--shadow-md)', border: '1px solid var(--ivory-dark)', position: 'sticky', top: 20 }}>
                <img src={selectedRoom.image_url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'} alt={selectedRoom.roomtype_name} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10, marginBottom: 14 }} />
                <h6 style={{ fontFamily: 'Playfair Display' }}>{selectedRoom.roomtype_name}</h6>
                <div style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 12 }}>{selectedRoom.room_size} · ว่าง {selectedRoom.available_rooms} ห้อง</div>
                <div style={{ background: 'var(--ivory)', borderRadius: 10, padding: 14 }}>
                  <div className="d-flex justify-content-between mb-1" style={{ fontSize: 13 }}><span>ราคา/คืน</span><strong>฿{Number(selectedRoom.price).toLocaleString()}</strong></div>
                  <div className="d-flex justify-content-between mb-1" style={{ fontSize: 13 }}><span>จำนวนคืน</span><strong>{nights} คืน</strong></div>
                  <div className="d-flex justify-content-between mb-1" style={{ fontSize: 13 }}><span>จำนวนห้อง</span><strong>{form.rooms} ห้อง</strong></div>
                  <div className="d-flex justify-content-between mt-2 pt-2" style={{ borderTop: '1px solid var(--ivory-dark)', fontWeight: 700 }}>
                    <span>รวม</span><span style={{ color: 'var(--warm-dark)', fontSize: 17 }}>฿{total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic PromptPay QR Code Popup */}
      {qrPopup && (() => {
        const payload = generatePayload(PROMPTPAY_ACCOUNT_ID, { amount: Number(qrPopup.totalAmount || 0) });
        return (
          <div className="popup-overlay">
            <div className="popup-card" style={{ maxWidth: 440, position: 'relative' }}>
              <button onClick={handleCancelBooking} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.07)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                <i className="bi bi-x-lg"></i>
              </button>
              <div className="popup-icon success mx-auto"><i className="bi-qr-code"></i></div>
              <h5 style={{ fontFamily: 'Playfair Display', marginBottom: 4 }}>สแกนชำระเงิน (Walk-in)</h5>
              
              <div style={{ background: '#FFF3CD', color: '#856404', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, display: 'inline-block', marginBottom: 12 }}>
                <i className="bi bi-clock-history me-1"></i> กรุณาชำระเงินภายใน {formatTimer(timeLeft)} นาที
              </div>

              <div style={{ background: 'var(--ivory)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, textAlign: 'left', width: '100%' }}>
                <div style={{ fontWeight: 700 }}>{qrPopup.contactName}</div>
                <div style={{ color: 'var(--text-mid)' }}>{qrPopup.roomName} ({qrPopup.rooms} ห้อง) · {formatDate(qrPopup.checkIn)} → {formatDate(qrPopup.checkOut)}</div>
                <div style={{ fontWeight: 700, color: 'var(--warm-dark)', fontSize: 18, marginTop: 4 }}>฿{formatPrice(qrPopup.totalAmount)}</div>
              </div>

              <div id="new-booking-qr-print" style={{ display: 'inline-block', padding: 12, background: '#FFFFFF', borderRadius: 12, border: '2px solid var(--ivory-dark)', marginBottom: 12 }}>
                <QRCodeSVG value={payload} size={180} />
              </div>

              <div className="mb-3">
                <button type="button" className="btn btn-outline-dark btn-sm" style={{ borderRadius: 8, fontSize: 12, fontWeight: 600 }} onClick={handlePrintQR}>
                  <i className="bi bi-printer me-1"></i> พิมพ์ QR Code ให้ลูกค้า
                </button>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 16 }}>
                <i className="bi bi-info-circle me-1"></i>ตรวจสอบสลิปด้วยตาเปล่า แล้วกด "ได้รับเงินแล้ว (เช็คอิน)"
              </p>
              
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button className="btn-aurora-secondary flex-1" onClick={handleCancelBooking}>
                  ยกเลิกการจอง
                </button>
                <button className="btn-aurora-primary flex-1" onClick={handleConfirmPayment}>
                  <i className="bi bi-check-lg me-1"></i>ได้รับเงินแล้ว (เช็คอิน)
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {payConfirmPopup && (
        <Popup icon="bi-door-open-fill" iconClass="success" title="ชำระเงินและเช็คอินสำเร็จ!" onClose={() => setPayConfirmPopup(false)}>
          <p style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: 16 }}>
            จัดสรรห้องให้อัตโนมัติเรียบร้อย: <strong style={{ color: 'var(--sage-dark)', fontSize: 16 }}>ห้อง {assignedRooms.join(', ')}</strong>
          </p>
          <button className="btn-aurora-primary" onClick={() => { setPayConfirmPopup(false); navigate('/staff/bookings'); }}>
            ดูรายการการจองทั้งหมด
          </button>
        </Popup>
      )}
    </div>
  );
}