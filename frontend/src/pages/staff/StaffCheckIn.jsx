// ==========================================
// pages/staff/StaffCheckIn.jsx
// หน้าเช็คอิน/เช็คเอาต์ผู้เข้าพัก (รองรับ Partial Check-in)
// ==========================================
import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getStatusBadge, formatPrice, formatDate, formatDateTime } from '../../components/Helpers';
import { apiFetch, StaffSidebar, BookingDetailModal } from './components/_shared';

const toDatetimeLocal = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

// Helper function: เช็คว่าถึงวันเช็คอินแล้วหรือยัง (เปรียบเทียบเฉพาะ YYYY-MM-DD)
const isCheckInAllowed = (checkInDateStr) => {
  if (!checkInDateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(checkInDateStr);
  targetDate.setHours(0, 0, 0, 0);

  return today >= targetDate;
};

// ===== STAFF CHECK-IN =====
export function StaffCheckIn() {
  const { bookings, checkIn, checkOut, refreshBookings } = useApp();
  // โหลดรายการจองล่าสุดทุกครั้งที่เปิดหน้านี้
  useEffect(() => { refreshBookings(); }, [refreshBookings]);
  const [search, setSearch] = useState('');
  const [detailBooking, setDetailBooking] = useState(null);

  const [checkinModal, setCheckinModal] = useState(null);
  const [checkinDatetime, setCheckinDatetime] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [checkinError, setCheckinError] = useState('');
  const [showPartialConfirm, setShowPartialConfirm] = useState(false);

  const [checkoutModal, setCheckoutModal] = useState(null);
  const [checkoutDatetime, setCheckoutDatetime] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  const relevant = bookings.filter(b => ['CONFIRMED', 'CHECKED_IN'].includes(b.status))
    .filter(b => !search || String(b.id).includes(search) || (b.contactName||b.userName||'').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

  const openCheckin = async (b) => {
    if (!isCheckInAllowed(b.checkIn)) {
      alert(`ยังไม่ถึงกำหนดวันเช็คอิน (${formatDate(b.checkIn)})`);
      return;
    }

    setCheckinModal(b);
    setCheckinDatetime(toDatetimeLocal());
    setSelectedRooms([]);
    setCheckinError('');
    setAvailableRooms([]);
    try {
      const res = await apiFetch('/admin/rooms');
      if (res.success) {
        setAvailableRooms(res.data.filter(r => r.roomtype_id === b.roomId && r.room_status === 'พร้อมใช้งาน'));
      }
    } catch {}
  };

  const toggleRoom = (roomId) => {
    setSelectedRooms(prev => {
      if (prev.includes(roomId)) return prev.filter(id => id !== roomId);
      if (prev.length >= (checkinModal.rooms || 1)) return prev;
      return [...prev, roomId];
    });
  };

  const submitCheckin = async () => {
    const totalBooked = checkinModal.rooms || 1;

    if (selectedRooms.length === 0) {
      setCheckinError('กรุณาเลือกห้องอย่างน้อย 1 ห้อง');
      return;
    }

    // FIX: เดิมใช้ window.confirm() ของเบราว์เซอร์ (หน้าตาเป็นป๊อปอัพ "localhost:5173 says" ไม่สวย ไม่ตรงธีมเว็บ)
    // เปลี่ยนเป็นป๊อปอัพในธีมของเว็บเอง และตัดข้อความเตือนยาวๆ ออกตามที่ตกลงกัน เหลือแค่ถามยืนยันสั้นๆ
    if (selectedRooms.length < totalBooked) {
      setShowPartialConfirm(true);
      return;
    }

    await doCheckin();
  };

  const doCheckin = async () => {
    try {
      await checkIn(checkinModal.id, {
        roomIds: selectedRooms,
        checkinDatetime: checkinDatetime.replace('T', ' ') + ':00',
      });
      setShowPartialConfirm(false);
      setCheckinModal(null);
    } catch (err) {
      setShowPartialConfirm(false);
      setCheckinError(err.message || 'เช็คอินไม่สำเร็จ');
    }
  };

  const openCheckout = (b) => {
    setCheckoutModal(b);
    setCheckoutDatetime(toDatetimeLocal());
    setCheckoutError('');
  };

  const submitCheckout = async () => {
    try {
      await checkOut(checkoutModal.id, { checkoutDatetime: checkoutDatetime.replace('T', ' ') + ':00' });
      setCheckoutModal(null);
    } catch (err) {
      setCheckoutError(err.message || 'เช็คเอาต์ไม่สำเร็จ');
    }
  };

  return (
    <div className="dashboard-page">
      <StaffSidebar />
      <div className="dashboard-right">
        <div className="dash-top-bar">
          <h4 style={{ fontFamily: 'Playfair Display', margin: 0 }}>เช็คอิน / เช็คเอาต์</h4>
          <span style={{ fontSize: 13, color: 'var(--text-light)' }}>{relevant.length} รายการ</span>
        </div>

        <input className="form-control mb-4" placeholder="🔍 ค้นหา รหัสการจอง หรือชื่อลูกค้า..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 340, borderRadius: 10 }} />

        <div className="d-flex flex-column gap-3">
          {relevant.map(b => {
            const canCheckIn = isCheckInAllowed(b.checkIn);

            return (
              <div key={b.id} style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow-sm)', border: `1px solid ${b.status === 'CHECKED_IN' ? 'rgba(86,169,127,0.25)' : 'var(--ivory-dark)'}` }}>
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setDetailBooking(b)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{b.contactName || b.userName}</div>
                      {getStatusBadge(b.status)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 6, fontFamily: 'monospace' }}>#{b.id} · {b.roomName} · {b.rooms || 1} ห้อง</div>
                    <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 6, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span><i className="bi bi-clock me-1"></i>จองเมื่อ {formatDateTime(b.createdAt)}</span>
                      {b.roomNumbers && <span><i className="bi bi-door-closed me-1"></i>เลขห้อง <strong>{b.roomNumbers}</strong></span>}
                      {b.actualCheckIn && <span><i className="bi bi-box-arrow-in-right me-1"></i>เช็คอินจริง {formatDateTime(b.actualCheckIn)}</span>}
                      {b.actualCheckOut && <span><i className="bi bi-box-arrow-right me-1"></i>เช็คเอาต์จริง {formatDateTime(b.actualCheckOut)}</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-mid)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span><i className="bi bi-calendar3 me-1"></i>{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</span>
                      <span><i className="bi bi-people me-1"></i>ผู้ใหญ่ {b.adults} คน{b.children > 0 ? ` เด็ก ${b.children} คน` : ''}</span>
                      <span style={{ fontWeight: 700, color: 'var(--warm-dark)' }}>฿{formatPrice(b.totalAmount)}</span>
                    </div>
                    {b.specialRequest && <div style={{ fontSize: 12, color: 'var(--warm-dark)', marginTop: 6 }}><i className="bi bi-chat-left-text me-1"></i>{b.specialRequest}</div>}
                  </div>
                  <div className="d-flex flex-column gap-2 align-items-end">
                    {b.status === 'CONFIRMED' && canCheckIn && (
                      <button 
                        className="btn btn-sm btn-success" 
                        style={{ borderRadius: 8, fontWeight: 600, whiteSpace: 'nowrap' }}
                        onClick={() => openCheckin(b)}
                      >
                        <i className="bi bi-box-arrow-in-right me-1"></i>เช็คอิน
                      </button>
                    )}
                    {b.status === 'CHECKED_IN' && (
                      <button className="btn btn-sm btn-warning" style={{ borderRadius: 8, fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap' }}
                        onClick={() => openCheckout(b)}>
                        <i className="bi bi-box-arrow-right me-1"></i>เช็คเอาต์
                      </button>
                    )}
                    <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 8, fontSize: 12 }} onClick={() => setDetailBooking(b)}>
                      <i className="bi bi-info-circle me-1"></i>รายละเอียด
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {relevant.length === 0 && <div className="empty-state"><i className="bi bi-inbox"></i><h5>ไม่มีรายการ</h5></div>}
        </div>
      </div>

      {/* Check-in Modal */}
      {checkinModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setCheckinModal(null); }}>
          <div className="modal-card" style={{ maxWidth: 520 }}>
            <div className="modal-card-header">
              <button className="modal-close-btn" onClick={() => setCheckinModal(null)}><i className="bi bi-x-lg"></i></button>
              <h5 style={{ fontFamily: 'Playfair Display', margin: 0 }}>เช็คอิน — {checkinModal.contactName || checkinModal.userName}</h5>
              <div style={{ fontSize: 12, opacity: 0.85 }}>#{checkinModal.id} · {checkinModal.roomName} · จองทั้งหมด {checkinModal.rooms || 1} ห้อง</div>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label-aurora">วันเวลาเช็คอิน</label>
                <input type="datetime-local" className="form-control-aurora" value={checkinDatetime}
                  onChange={e => setCheckinDatetime(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label-aurora">
                  เลือกเลขห้องที่เข้าพักจริง (เลือกแล้ว {selectedRooms.length}/{checkinModal.rooms || 1} ห้อง)
                </label>
                {availableRooms.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--danger)' }}>ไม่มีห้องว่างของประเภทนี้ในระบบขณะนี้</div>
                ) : (
                  <div className="d-flex gap-2 flex-wrap">
                    {availableRooms.map(r => (
                      <button key={r.room_id} type="button" onClick={() => toggleRoom(r.room_id)}
                        style={{
                          padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
                          border: selectedRooms.includes(r.room_id) ? '2px solid var(--sage)' : '2px solid var(--ivory-dark)',
                          background: selectedRooms.includes(r.room_id) ? 'rgba(86,169,127,0.12)' : 'var(--white)',
                        }}>
                        {r.room_number}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {checkinError && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{checkinError}</div>}
              <button className="btn-aurora-primary w-100" onClick={submitCheckin} disabled={availableRooms.length === 0}>
                <i className="bi bi-check-lg me-2"></i>ยืนยันเช็คอิน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-out Modal */}
      {checkoutModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setCheckoutModal(null); }}>
          <div className="modal-card" style={{ maxWidth: 460 }}>
            <div className="modal-card-header">
              <button className="modal-close-btn" onClick={() => setCheckoutModal(null)}><i className="bi bi-x-lg"></i></button>
              <h5 style={{ fontFamily: 'Playfair Display', margin: 0 }}>เช็คเอาต์ — {checkoutModal.contactName || checkoutModal.userName}</h5>
              <div style={{ fontSize: 12, opacity: 0.85 }}>#{checkoutModal.id} · {checkoutModal.roomName}</div>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label-aurora">วันเวลาเช็คเอาต์</label>
                <input type="datetime-local" className="form-control-aurora" value={checkoutDatetime}
                  onChange={e => setCheckoutDatetime(e.target.value)} />
              </div>
              {checkoutError && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{checkoutError}</div>}
              <button className="btn-aurora-primary w-100"
                style={{ background: 'linear-gradient(135deg, #F0A830, #d4880d)' }} onClick={submitCheckout}>
                <i className="bi bi-check-lg me-2"></i>ยืนยันเช็คเอาต์
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Check-in Confirm Popup (แทน window.confirm เดิม) */}
      {showPartialConfirm && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={e => { if (e.target === e.currentTarget) setShowPartialConfirm(false); }}>
          <div className="modal-card" style={{ maxWidth: 400 }}>
            <div className="modal-card-header">
              <button className="modal-close-btn" onClick={() => setShowPartialConfirm(false)}><i className="bi bi-x-lg"></i></button>
              <h5 style={{ fontFamily: 'Playfair Display', margin: 0 }}>ยืนยันเช็คอินบางส่วน</h5>
            </div>
            <div className="modal-body text-center">
              <i className="bi bi-question-circle" style={{ fontSize: 40, color: 'var(--sage)', marginBottom: 12, display: 'inline-block' }}></i>
              <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: '12px 0 20px' }}>
                ลูกค้ายืนยันเข้าพักเพียง <strong>{selectedRooms.length}</strong> จาก <strong>{checkinModal?.rooms || 1}</strong> ห้องที่จองไว้
                ต้องการดำเนินการต่อหรือไม่?
              </p>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary flex-fill" style={{ borderRadius: 8 }} onClick={() => setShowPartialConfirm(false)}>ยกเลิก</button>
                <button className="btn-aurora-primary flex-fill" onClick={doCheckin}>ยืนยันเช็คอิน</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailBooking && <BookingDetailModal booking={detailBooking} onClose={() => setDetailBooking(null)} />}
    </div>
  );
}