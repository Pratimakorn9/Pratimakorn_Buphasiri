// ==========================================
// pages/booking/PaymentPage.jsx
// หน้าชำระเงินผ่าน QR Dynamic (สร้างตามยอดเงินจริง) พร้อมตัวจับเวลาถอยหลัง
// ==========================================
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import generatePayload from 'promptpay-qr';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../../context/AppContext';
import { formatPrice, formatDate, formatDateTime, compressImage } from '../../components/Helpers';
import { API, authHeaders, BookingSteps, ConfirmPayPopup, CancelConfirmPopup } from './components/_shared';

// ** ระบุเบอร์โทรศัพท์ หรือ เลขประจำตัวผู้เสียภาษี 13 หลัก ของที่พัก/โรงแรมตรงนี้ **
const PROMPTPAY_ACCOUNT_ID = '0638581730'; 

// ===== PAYMENT PAGE =====
export function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { currentUser, cancelBooking } = useApp();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [showPayPopup, setShowPayPopup] = useState(false);
  const [paying, setPaying] = useState(false);
  const fileRef = useRef(null);

  // ดึงข้อมูลการจองจาก Database
  useEffect(() => {
    // ต้องส่ง token ไปด้วย (backend ให้ดูได้เฉพาะเจ้าของการจองหรือพนักงาน)
    fetch(`${API}/bookings/${bookingId}`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        if(data.success) {
          const b = data.data;
          setBooking({
            id: b.booking_id,
            roomName: b.roomtype_name,
            checkIn: b.checkin_date ? String(b.checkin_date).slice(0, 10) : '',
            checkOut: b.checkout_date ? String(b.checkout_date).slice(0, 10) : '',
            totalAmount: b.price,
            status: b.status_name,
            // FIX: เดิมใช้ข้อมูลโปรไฟล์สมาชิกเสมอ ทำให้กรณีจองให้คนอื่น (ชื่อ/อีเมล/เบอร์ต่างจากโปรไฟล์) แสดงผิด
            // ตอนนี้ใช้ข้อมูลที่กรอกตอนจองก่อน ถ้าไม่มีค่อยใช้โปรไฟล์
            contactName: b.contact_name || `${currentUser?.firstName} ${currentUser?.lastName}`,
            contactEmail: b.contact_email || currentUser?.email,
            contactPhone: b.contact_phone || currentUser?.phone,
            booking_datetime: b.booking_datetime,
            rooms: b.room_count || 1,
            adults: b.adults,
            children: b.children
          });
          const bookTime = new Date(b.booking_datetime).getTime();
          const now = Date.now();
          // FIX: เดิมใช้ 60000 ms (1 นาที) ทั้งที่ comment เดิมและ backend (server.js expireStalePendingBookings
          // ให้สมาชิกเวลาชำระเงิน 1 ชั่วโมงก่อนตัดอัตโนมัติ) ตั้งใจไว้ว่าเป็น 1 ชั่วโมง = 3600000 ms
          // ผลคือ countdown ฝั่งหน้าเว็บหมดเวลาแล้วเรียกยกเลิกเร็วกว่าที่ backend อนุญาตไว้มาก (หลังจองแค่ 1 นาที)
          const diff = Math.floor((bookTime + 3600000 - now) / 1000); // 1 ชั่วโมง (3600000 ms)
          setTimeLeft(Math.max(0, diff));
        }
        setLoading(false);
      });
  }, [bookingId, currentUser]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && booking && !['CANCELLED_USER', 'CANCELLED_SYSTEM', 'PAYMENT_REVIEW', 'CONFIRMED'].includes(booking.status)) {
      cancelBooking(bookingId, 'CANCELLED_SYSTEM').catch(() => {});
    }
  }, [timeLeft, booking, bookingId]);

  const handleSlip = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSlipFile(file);
    try {
      const compressed = await compressImage(file);
      setSlipPreview(compressed);
    } catch {
      alert('ไม่สามารถอ่านไฟล์รูปนี้ได้ กรุณาลองใหม่');
    }
  };

  // ส่ง API ชำระเงิน
  const handlePay = async () => {
    if (!slipPreview) return alert('กรุณาอัปโหลดสลิปการชำระเงิน');
    setPaying(true);
    try {
      const res = await fetch(`${API}/bookings/${bookingId}/pay`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ slip_image: slipPreview }),
      });
      const data = await res.json();
      if(data.success) {
        setShowPayPopup(true);
      } else {
        alert(data.message);
      }
    } catch(err) {
      alert("เชื่อมต่อล้มเหลว");
    } finally {
      setPaying(false);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelBooking(bookingId, 'CANCELLED_USER');
      setShowCancelPopup(false);
      navigate('/member/bookings');
    } catch (err) {
      setShowCancelPopup(false);
      alert(err.message || 'ยกเลิกการจองไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  if (loading) return <div className="text-center py-5"><span className="spinner-border text-sage"></span></div>;
  if (!booking) return (
    <div className="container py-5 text-center">
      <i className="bi bi-exclamation-circle" style={{ fontSize: 48, color: 'var(--danger)' }}></i>
      <h4 className="mt-3">ไม่พบข้อมูลการจอง</h4>
      <button className="btn btn-gold mt-3" onClick={() => navigate('/member/bookings')}>ดูประวัติการจอง</button>
    </div>
  );

  if (booking.status !== 'PENDING_PAYMENT' && booking.status !== 'PAYMENT_REVIEW') {
    return (
      <div className="container py-5" style={{ maxWidth: 560 }}>
        <div className="qr-box text-center">
          {booking.status.startsWith('CANCELLED') ? (
            <><div className="popup-icon danger mx-auto mb-3"><i className="bi bi-x-circle-fill"></i></div><h4>การจองถูกยกเลิก</h4></>
          ) : (
            <><div className="popup-icon success mx-auto mb-3"><i className="bi bi-check-circle-fill"></i></div><h4>รอการยืนยันจากเจ้าหน้าที่</h4></>
          )}
          <p style={{ color: 'var(--text-light)' }}>รหัสการจอง: <strong>{booking.id}</strong></p>
          <button className="btn-aurora-primary mt-2" onClick={() => navigate('/member/bookings')}>ดูประวัติการจอง</button>
        </div>
      </div>
    );
  }

  const hrs = Math.floor(timeLeft / 3600);
  const mins = Math.floor((timeLeft % 3600) / 60);
  const secs = Math.floor(timeLeft % 60);
  const fmt = n => String(n).padStart(2, '0');
  const isUrgent = timeLeft < 300;

  // สร้าง Payload PromptPay QR Code ตามยอดเงินจริง
  const qrPayload = generatePayload(PROMPTPAY_ACCOUNT_ID, { amount: Number(booking.totalAmount) });

  return (
    <div className="container py-5" style={{ maxWidth: 720 }}>
      <button className="btn btn-outline-secondary btn-sm mb-4" style={{ borderRadius: 8 }} onClick={() => navigate(-1)}>
        <i className="bi bi-arrow-left me-2"></i>กลับ
      </button>
      <BookingSteps step={3} />
      <h4 style={{ fontFamily: 'Playfair Display', marginBottom: 4 }}>ชำระเงิน</h4>
      <p style={{ color: 'var(--text-light)', marginBottom: 24 }}>กรุณาชำระเงินภายในเวลาที่กำหนด</p>

      <div className="row g-4">
        {/* Dynamic QR + Timer */}
        <div className="col-md-6">
          <div className="qr-box text-center">
            <div style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>หมดเวลาใน</div>
            <div className={`qr-timer ${isUrgent ? 'urgent' : ''}`}>{fmt(hrs)}:{fmt(mins)}:{fmt(secs)}</div>
            {isUrgent && timeLeft > 0 && (
              <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}><i className="bi bi-exclamation-triangle me-1"></i>กรุณาชำระเงิน</div>
            )}
            
            {/* กล่องแสดง Dynamic QR Code */}
            <div style={{ margin: '20px auto', width: 220, height: 220, padding: 12, borderRadius: 14, background: '#fff', border: '2px solid var(--ivory-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QRCodeSVG value={qrPayload} size={196} />
            </div>

            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warm-dark)', marginBottom: 2 }}>
              ยอดชำระ: ฿{formatPrice(booking.totalAmount)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-light)' }}>สแกน QR เพื่อชำระเงินผ่านแอปธนาคาร</div>
          </div>
        </div>

        {/* Booking Info + Slip */}
        <div className="col-md-6">
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 22, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--ivory-dark)', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>
              <i className="bi bi-person-circle me-2" style={{ color: 'var(--sage)' }}></i>ข้อมูลผู้จอง
            </div>
            <div style={{ fontSize: 13, lineHeight: 2 }}>
              <div><span style={{ color: 'var(--text-light)' }}>ชื่อ:</span> <strong>{booking.contactName}</strong></div>
              <div><span style={{ color: 'var(--text-light)' }}>อีเมล:</span> {booking.contactEmail}</div>
              <div><span style={{ color: 'var(--text-light)' }}>โทร:</span> {booking.contactPhone}</div>
              <div><span style={{ color: 'var(--text-light)' }}>ห้อง:</span> <strong>{booking.roomName}</strong> ({booking.rooms} ห้อง)</div>
              <div><span style={{ color: 'var(--text-light)' }}>เวลาที่จอง:</span> {formatDateTime(booking.booking_datetime)}</div>
              <div><span style={{ color: 'var(--text-light)' }}>ผู้เข้าพัก:</span> ผู้ใหญ่ {booking.adults} คน{booking.children > 0 ? `, เด็ก ${booking.children} คน` : ''}</div>
              <div><span style={{ color: 'var(--text-light)' }}>เช็คอิน:</span> {formatDate(booking.checkIn)}</div>
              <div><span style={{ color: 'var(--text-light)' }}>เช็คเอาต์:</span> {formatDate(booking.checkOut)}</div>
              <div style={{ borderTop: '1px solid var(--ivory-dark)', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>ยอดชำระ</span>
                <span style={{ fontFamily: 'Playfair Display', fontSize: 20, fontWeight: 700, color: 'var(--warm-dark)' }}>฿{formatPrice(booking.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Slip Upload */}
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--ivory-dark)', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>
              <i className="bi bi-upload me-2" style={{ color: 'var(--sage)' }}></i>อัปโหลดสลิปการชำระเงิน
            </div>
            {slipPreview ? (
              <div style={{ position: 'relative' }}>
                <img src={slipPreview} alt="slip" style={{ width: '100%', borderRadius: 10, maxHeight: 160, objectFit: 'cover' }} />
                <button onClick={() => { setSlipFile(null); setSlipPreview(null); }}
                  style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: 50, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="bi bi-x" style={{ fontSize: 14 }}></i>
                </button>
                <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 6 }}><i className="bi bi-check-circle me-1"></i>{slipFile?.name}</div>
              </div>
            ) : (
              <div className="upload-zone" onClick={() => fileRef.current?.click()}>
                <i className="bi bi-image" style={{ fontSize: 28, color: 'var(--text-light)', display: 'block', marginBottom: 8 }}></i>
                <div style={{ fontSize: 13, color: 'var(--text-light)' }}>คลิกเพื่อเลือกสลิป</div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>PNG, JPG, JPEG (ไม่เกิน 5MB)</div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSlip} />
          </div>

          {timeLeft > 0 ? (
            <div className="d-flex gap-2">
              <button className="btn-aurora-secondary flex-1" style={{ padding: '10px' }} onClick={() => setShowCancelPopup(true)}>
                ยกเลิกการชำระ
              </button>
              <button className="btn-aurora-primary flex-1" style={{ padding: '10px' }} onClick={handlePay} disabled={paying}>
                {paying ? 'กำลังส่งสลิป...' : <><i className="bi bi-check-lg me-1"></i>ยืนยันการชำระเงิน</>}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: 8 }}>หมดเวลาชำระเงิน</div>
              <button className="btn-aurora-primary" onClick={() => navigate('/member/bookings')}>กลับหน้าประวัติ</button>
            </div>
          )}
        </div>
      </div>

      {showCancelPopup && <CancelConfirmPopup onConfirm={handleCancel} onClose={() => setShowCancelPopup(false)} />}
      {showPayPopup && <ConfirmPayPopup onClose={() => setShowPayPopup(false)} />}
    </div>
  );
}