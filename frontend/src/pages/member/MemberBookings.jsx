// ==========================================
// pages/member/MemberBookings.jsx
// ประวัติและรายการจองของสมาชิก
// ==========================================
import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getStatusBadge, formatPrice, formatDate, formatDateTime, StarInput, compressImage } from '../../components/Helpers';
import { API, apiFetch, MemberSidebar } from './components/_shared';
import { createPortal } from 'react-dom';

// ===== MEMBER BOOKINGS =====
export function MemberBookings() {
  const { currentUser, bookings, cancelBooking, addReview, refreshBookings } = useApp();
  const navigate = useNavigate();
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', images: [] });
  const [reviewImages, setReviewImages] = useState([]);
  const [cancelPopup, setCancelPopup] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [detailModal, setDetailModal] = useState(null);
  const imgRef = useRef(null);

  // โหลดประวัติการจองล่าสุดทุกครั้งที่เปิดหน้านี้ (เดิมต้องกดรีเฟรชเบราว์เซอร์เอง)
  useEffect(() => { refreshBookings(); }, [refreshBookings]);

  const myBookings = bookings.filter(b => b.userId === currentUser.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // FIX: เดิมกดยกเลิกแล้ว UI จะบอกว่ายกเลิกสำเร็จเสมอ แม้ backend จะปฏิเสธคำขอจริงๆ
  const handleCancelBooking = async () => {
    setCancelError('');
    try {
      await cancelBooking(cancelPopup, 'CANCELLED_USER');
      setCancelPopup(null);
    } catch (err) {
      setCancelError(err.message || 'ยกเลิกการจองไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.comment.trim()) return;
    try {
      await addReview({ bookingId: reviewModal.id, roomType: reviewModal.roomName, ...reviewForm, images: reviewImages });
      setReviewModal(null);
      setReviewForm({ rating: 5, comment: '', images: [] });
      setReviewImages([]);
    } catch (err) {
      alert(err.message || 'ไม่สามารถส่งรีวิวได้ กรุณาลองใหม่');
    }
  };

  const handleReviewImg = (e) => {
    const files = Array.from(e.target.files);
    // FIX: ย่อ/บีบอัดรูปก่อนเก็บ base64 กันไฟล์ใหญ่เกินไปจนบันทึกรีวิวไม่ผ่าน (500 error) เหมือนหน้าอัปโหลดสลิป
    files.forEach(f => {
      if (reviewImages.length >= 2) return;
      compressImage(f).then(dataUrl => {
        setReviewImages(p => p.length < 2 ? [...p, dataUrl] : p);
      }).catch(() => {});
    });
  };

  const canCancel = (b) => b.status === 'PENDING_PAYMENT' || b.status === 'PAYMENT_REVIEW';
  // FIX: backend อนุญาตรีวิวตอน CHECKED_OUT ด้วยแล้ว (เดิม booking ไม่มีวันถึงสถานะ COMPLETED เลย)
  const canReview = (b) => (b.status === 'COMPLETED' || b.status === 'CHECKED_IN' || b.status === 'CHECKED_OUT') && !b.reviewed;

  const statusSteps = {
    PENDING_PAYMENT: 1,
    PAYMENT_REVIEW: 2,
    CONFIRMED: 3,
    CHECKED_IN: 4,
    COMPLETED: 5,
    CHECKED_OUT: 5,
    CANCELLED_USER: -1,
    CANCELLED_SYSTEM: -1,
    CANCELLED_ADMIN: -1,
  };

  return (
    <div className="container py-5">
      <div className="row g-4">
        <div className="col-lg-4"><MemberSidebar /></div>
        <div className="col-lg-8">
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow-sm)' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 style={{ fontFamily: 'Playfair Display', margin: 0 }}>ประวัติการจอง</h5>
              <Link to="/rooms" className="btn btn-gold btn-sm"><i className="bi bi-plus me-1"></i>จองใหม่</Link>
            </div>

            {myBookings.length === 0 ? (
              <div className="empty-state"><i className="bi bi-calendar-x"></i><h5>ยังไม่มีประวัติการจอง</h5><Link to="/rooms" className="btn btn-gold mt-2">ดูห้องพัก</Link></div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {myBookings.map(b => {
                  const step = statusSteps[b.status] || 1;
                  const cancelled = step === -1;
                  return (
                    <div key={b.id} style={{ border: '1px solid var(--ivory-dark)', borderRadius: 'var(--radius)', padding: 20, transition: 'box-shadow 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{b.roomName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-light)', fontFamily: 'monospace' }}>#{b.id}</div>
                        </div>
                        {getStatusBadge(b.status)}
                      </div>

                      {/* Progress Steps */}
                      {!cancelled && (
                        <div className="mb-3" style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                          {['รอชำระ', 'รอตรวจสอบ', 'ยืนยันแล้ว', 'เช็คอิน', 'เสร็จสิ้น'].map((s, i) => {
                            const idx = i + 1;
                            const done = step > idx;
                            const active = step === idx;
                            return (
                              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                                {i < 4 && <div style={{ position: 'absolute', top: 12, left: '50%', width: '100%', height: 2, background: done ? 'var(--sage)' : 'var(--ivory-dark)', zIndex: 0 }}></div>}
                                <div style={{ width: 26, height: 26, borderRadius: '50%', background: done ? 'var(--success)' : active ? 'var(--sage)' : 'var(--ivory-dark)', color: (done || active) ? 'white' : 'var(--text-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, zIndex: 1, border: active ? '2px solid var(--sage)' : 'none', transition: 'all 0.3s' }}>
                                  {done ? <i className="bi bi-check-lg" style={{ fontSize: 10 }}></i> : idx}
                                </div>
                                <div style={{ fontSize: 9, color: active ? 'var(--sage-dark)' : done ? 'var(--success)' : 'var(--text-light)', marginTop: 4, fontWeight: active || done ? 700 : 400, textAlign: 'center', whiteSpace: 'nowrap' }}>{s}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="d-flex gap-3 flex-wrap mb-3" style={{ fontSize: 13, color: 'var(--text-mid)' }}>
                        <span><i className="bi bi-calendar3 me-1"></i>{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</span>
                        <span><i className="bi bi-people me-1"></i>ผู้ใหญ่ {b.adults} คน{b.children > 0 ? ` เด็ก ${b.children} คน` : ''}</span>
                        <span><i className="bi bi-door-open me-1"></i>{b.rooms || 1} ห้อง</span>
                        <span style={{ fontWeight: 700, color: 'var(--warm-dark)' }}>฿{formatPrice(b.totalAmount)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: -6, marginBottom: 12 }}>
                        <i className="bi bi-clock me-1"></i>จองเมื่อ {formatDateTime(b.createdAt)}
                      </div>

                      <div className="d-flex gap-2 flex-wrap">
                        <button className="btn btn-outline-secondary btn-sm" style={{ borderRadius: 8 }} onClick={() => setDetailModal(b)}>
                          <i className="bi bi-eye me-1"></i>รายละเอียด
                        </button>
                        {b.status === 'PENDING_PAYMENT' && (
                          <button className="btn btn-gold btn-sm" onClick={() => navigate(`/payment/${b.id}`)}>
                            <i className="bi bi-credit-card me-1"></i>ชำระเงิน
                          </button>
                        )}
                        {canCancel(b) && (
                          <button className="btn btn-outline-danger btn-sm" style={{ borderRadius: 8 }} onClick={() => setCancelPopup(b.id)}>ยกเลิกการจอง</button>
                        )}
                        {canReview(b) && (
                          <button className="btn btn-outline-warning btn-sm" style={{ borderRadius: 8 }} onClick={() => setReviewModal(b)}>
                            <i className="bi bi-star me-1"></i>เขียนรีวิว
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detail Modal */}
        {detailModal && createPortal(
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDetailModal(null); }}>
            <div className="modal-card" style={{ maxWidth: 500 }}>
              <div className="modal-card-header">
                <button className="modal-close-btn" onClick={() => setDetailModal(null)}><i className="bi bi-x-lg"></i></button>
                <h5 style={{ fontFamily: 'Playfair Display', margin: 0 }}>รายละเอียดการจอง</h5>
                <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4, fontFamily: 'monospace' }}>#{detailModal.id}</div>
              </div>
              <div className="modal-body">
                <div className="row g-3" style={{ fontSize: 14 }}>
                  {[
                    ['ห้องพัก', detailModal.roomName],
                    ['ชื่อผู้เข้าพัก', detailModal.contactName || detailModal.userName],
                    ['อีเมล', detailModal.contactEmail || detailModal.userEmail],
                    ['เบอร์โทร', detailModal.contactPhone || '-'],
                    ['วันเช็คอิน', formatDate(detailModal.checkIn)],
                    ['วันเช็คเอาต์', formatDate(detailModal.checkOut)],
                    ['จำนวนคืน', `${detailModal.nights} คืน`],
                    ['ผู้เข้าพัก', `ผู้ใหญ่ ${detailModal.adults} คน${detailModal.children > 0 ? ` เด็ก ${detailModal.children} คน` : ''}`],
                    ['จำนวนห้อง', `${detailModal.rooms || 1} ห้อง`],
                    ['เวลาที่จอง', formatDateTime(detailModal.createdAt)],
                    ...(detailModal.roomNumbers ? [['เลขห้องที่เข้าพัก', detailModal.roomNumbers]] : []),
                    ...(detailModal.actualCheckIn ? [['เวลาเช็คอิน', formatDateTime(detailModal.actualCheckIn)]] : []),
                    ...(detailModal.actualCheckOut ? [['เวลาเช็คเอาต์', formatDateTime(detailModal.actualCheckOut)]] : []),
                  ].map(([k, v]) => (
                    <div key={k} className="col-6">
                      <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                      <div style={{ fontWeight: 600 }}>{v}</div>
                    </div>
                  ))}
                  {detailModal.specialRequest && (
                    <div className="col-12">
                      <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>คำขอพิเศษ</div>
                      <div style={{ background: 'var(--ivory)', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>{detailModal.specialRequest}</div>
                    </div>
                  )}
                  <div className="col-12" style={{ borderTop: '1px solid var(--ivory-dark)', paddingTop: 14 }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <span style={{ fontWeight: 700 }}>ยอดรวม</span>
                      <span style={{ fontFamily: 'Playfair Display', fontSize: 22, fontWeight: 700, color: 'var(--warm-dark)' }}>฿{formatPrice(detailModal.totalAmount)}</span>
                    </div>
                    <div className="mt-2">{getStatusBadge(detailModal.status)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Cancel Popup */}
        {cancelPopup && (
          <div className="popup-overlay">
            <div className="popup-card">
              <div className="popup-icon danger"><i className="bi bi-calendar-x-fill"></i></div>
              <h5 style={{ fontFamily: 'Playfair Display', marginBottom: 8 }}>ยืนยันยกเลิกการจอง</h5>
              <p style={{ color: 'var(--text-mid)', fontSize: 14, marginBottom: 20 }}>
                เมื่อยกเลิกการจอง เงินที่ชำระไปแล้วจะไม่สามารถคืนได้<br />คุณแน่ใจหรือไม่?
              </p>
              {cancelError && (
                <div style={{ background: 'rgba(220,53,69,0.1)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>
                  <i className="bi bi-exclamation-circle-fill me-2"></i>{cancelError}
                </div>
              )}
              <div className="d-flex gap-3 w-100">
                <button className="btn-aurora-secondary flex-1" onClick={() => { setCancelPopup(null); setCancelError(''); }}>ไม่ยกเลิก</button>
                <button className="btn-aurora-danger flex-1" onClick={handleCancelBooking}>ยืนยันการยกเลิก</button>
              </div>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {reviewModal && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setReviewModal(null); }}>
            <div className="modal-card" style={{ maxWidth: 500 }}>
              <div className="modal-card-header">
                <button className="modal-close-btn" onClick={() => setReviewModal(null)}><i className="bi bi-x-lg"></i></button>
                <h5 style={{ fontFamily: 'Playfair Display', margin: 0 }}>รีวิว: {reviewModal.roomName}</h5>
              </div>
              <div className="modal-body">
                <form onSubmit={handleReview}>
                  <div className="form-group">
                    <label className="form-label-aurora">คะแนน</label>
                    <StarInput value={reviewForm.rating} onChange={v => setReviewForm(p => ({ ...p, rating: v }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label-aurora">ความคิดเห็น <span className="required-star">*</span></label>
                    <textarea className="form-control-aurora" rows={4} placeholder="แชร์ประสบการณ์การพักของคุณ..."
                      maxLength={1000} value={reviewForm.comment} onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))} required style={{ resize: 'vertical' }}></textarea>
                  </div>
                  <div className="form-group">
                    <label className="form-label-aurora">รูปภาพประกอบ (ไม่บังคับ, สูงสุด 2 รูป)</label>
                    <div className="d-flex gap-2 flex-wrap mb-2">
                      {reviewImages.map((img, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={img} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: '2px solid var(--ivory-dark)' }} />
                          <button type="button" onClick={() => setReviewImages(p => p.filter((_, j) => j !== i))}
                            style={{ position: 'absolute', top: -6, right: -6, background: 'var(--danger)', border: 'none', color: 'white', borderRadius: '50%', width: 20, height: 20, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                      ))}
                      {reviewImages.length < 2 && (
                      <button type="button" onClick={() => imgRef.current?.click()}
                        style={{ width: 72, height: 72, borderRadius: 10, border: '2px dashed var(--ivory-dark)', background: 'var(--ivory)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)', fontSize: 11, gap: 3 }}>
                        <i className="bi bi-camera-fill" style={{ fontSize: 18 }}></i>
                        เพิ่มรูป
                      </button>
                      )}
                    </div>
                    <input ref={imgRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleReviewImg} />
                  </div>
                  <button type="submit" className="btn-aurora-primary">
                    <i className="bi bi-send me-2"></i>ส่งรีวิว
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}