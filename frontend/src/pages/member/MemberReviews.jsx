import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDate, StarInput, compressImage } from '../../components/Helpers';
import { MemberSidebar } from './components/_shared';

export function MemberReviews() {
  const { currentUser, reviews, updateReview } = useApp();
  const myReviews = reviews.filter(r => r.userId === currentUser.id);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ rating: 5, comment: '' });
  const [editImages, setEditImages] = useState([]);
  const imgRef = useRef(null);

  const openEdit = (r) => {
    setEditModal(r);
    setEditForm({ rating: r.rating, comment: r.comment });
    setEditImages(r.images || []);
  };

  const handleEditImg = (e) => {
    // FIX: ย่อ/บีบอัดรูปก่อนเก็บ base64 กันไฟล์ใหญ่เกินไปจนบันทึกไม่ผ่าน (500 error)
    Array.from(e.target.files).forEach(f => {
      if (editImages.length >= 2) return;
      compressImage(f).then(dataUrl => {
        setEditImages(p => p.length < 2 ? [...p, dataUrl] : p);
      }).catch(() => {});
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editForm.comment.trim()) return;
    try {
      await updateReview(editModal.id, { rating: editForm.rating, comment: editForm.comment, images: editImages });
      setEditModal(null);
    } catch (err) {
      alert(err.message || 'ไม่สามารถแก้ไขรีวิวได้');
    }
  };

  return (
    <div className="container py-5">
      <div className="row g-4">
        <div className="col-lg-4"><MemberSidebar /></div>
        <div className="col-lg-8">
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow-sm)' }}>
            <h5 style={{ fontFamily: 'Playfair Display', marginBottom: 22 }}>รีวิวของฉัน</h5>
            {myReviews.length === 0 ? (
              <div className="empty-state"><i className="bi bi-star"></i><h5>ยังไม่มีรีวิว</h5><p style={{ fontSize: 13, color: 'var(--text-light)' }}>เขียนรีวิวได้หลังจากเข้าพักเสร็จ</p></div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {myReviews.map(r => (
                  <div key={r.id} className="review-card">
                    <div className="d-flex justify-content-between mb-2">
                      <strong>{r.roomType}</strong>
                      <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{formatDate(r.date)}</span>
                    </div>
                    <div style={{ fontSize: 20, marginBottom: 8 }}>
                      {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= r.rating ? '#F0A830' : '#DDD' }}>★</span>)}
                    </div>
                    {r.images?.length > 0 && (
                      <div className="d-flex gap-2 mb-2 flex-wrap">
                        {r.images.map((img, idx) => <img key={idx} src={img} alt="" style={{ width: 72, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--ivory-dark)' }} />)}
                      </div>
                    )}
                    <p style={{ margin: 0, color: 'var(--text-mid)', fontSize: 14 }}>{r.comment}</p>
                    <button className="btn btn-outline-secondary btn-sm mt-3" style={{ borderRadius: 8 }} onClick={() => openEdit(r)}>
                      <i className="bi bi-pencil me-1"></i>แก้ไขรีวิว
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {editModal && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEditModal(null); }}>
            <div className="modal-card" style={{ maxWidth: 500 }}>
              <div className="modal-card-header">
                <button className="modal-close-btn" onClick={() => setEditModal(null)}><i className="bi bi-x-lg"></i></button>
                <h5 style={{ fontFamily: 'Playfair Display', margin: 0 }}>แก้ไขรีวิว: {editModal.roomType}</h5>
              </div>
              <div className="modal-body">
                <form onSubmit={handleUpdate}>
                  <div className="form-group">
                    <label className="form-label-aurora">คะแนน</label>
                    <StarInput value={editForm.rating} onChange={v => setEditForm(p => ({ ...p, rating: v }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label-aurora">ความคิดเห็น <span className="required-star">*</span></label>
                    <textarea className="form-control-aurora" rows={4}
                      maxLength={1000} value={editForm.comment} onChange={e => setEditForm(p => ({ ...p, comment: e.target.value }))} required style={{ resize: 'vertical' }}></textarea>
                  </div>
                  <div className="form-group">
                    <label className="form-label-aurora">รูปภาพประกอบ (ไม่บังคับ, สูงสุด 2 รูป)</label>
                    <div className="d-flex gap-2 flex-wrap mb-2">
                      {editImages.map((img, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={img} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: '2px solid var(--ivory-dark)' }} />
                          <button type="button" onClick={() => setEditImages(p => p.filter((_, j) => j !== i))}
                            style={{ position: 'absolute', top: -6, right: -6, background: 'var(--danger)', border: 'none', color: 'white', borderRadius: '50%', width: 20, height: 20, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                      ))}
                      {editImages.length < 2 && (
                        <button type="button" onClick={() => imgRef.current?.click()}
                          style={{ width: 72, height: 72, borderRadius: 10, border: '2px dashed var(--ivory-dark)', background: 'var(--ivory)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)', fontSize: 11, gap: 3 }}>
                          <i className="bi bi-camera-fill" style={{ fontSize: 18 }}></i>เพิ่มรูป
                        </button>
                      )}
                    </div>
                    <input ref={imgRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleEditImg} />
                  </div>
                  <button type="submit" className="btn-aurora-primary"><i className="bi bi-save me-2"></i>บันทึกการแก้ไข</button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}