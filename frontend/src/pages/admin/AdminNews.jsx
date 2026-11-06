// ==========================================
// pages/admin/AdminNews.jsx
// จัดการข่าวสาร/โปรโมชั่น (รองรับการอัปโหลดรูปภาพ)
// ==========================================
import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getStatusBadge, formatPrice } from '../../components/Helpers';
import DateInput from '../../components/DateInput';
import { API, apiFetch, Popup, AdminSidebar, BookingDetailModal, RoomForm } from './components/_shared';


// ===== ADMIN NEWS =====
export function AdminNews() {
  const { addNews, deleteNews } = useApp();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ title: '', content: '', image: '', publishDate: today, endDate: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [addError, setAddError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // ข่าวที่กำลังจะลบ (รอยืนยัน)

  const loadNews = useCallback(async () => {
    const d = await apiFetch('/news/all');
    if (d.success) setNews(d.data.map(n => ({
      id: n.news_id, title: n.title, content: n.detail, image: n.image_url, category: 'ทั่วไป',
      date: n.publish_date ? String(n.publish_date).slice(0, 10) : '',
      publishDate: n.publish_date ? String(n.publish_date).slice(0, 10) : '',
      endDate: n.end_date ? String(n.end_date).slice(0, 10) : '',
    })));
    setLoading(false);
  }, []);

  useEffect(() => { loadNews(); }, [loadNews]);

  // ฟังก์ชันแปลงไฟล์รูปภาพเป็น Base64 String
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // ตรวจสอบประเภทไฟล์
    if (!file.type.startsWith('image/')) {
      setAddError('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    // ตรวจสอบขนาดไฟล์ (เช่น ไม่เกิน 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAddError('ขนาดรูปภาพต้องไม่เกิน 5MB');
      return;
    }

    setAddError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    try {
      await addNews(form);
      setForm({ title: '', content: '', image: '', publishDate: today, endDate: '' });
      setShowAddPopup(false);
      setSuccessMsg('เพิ่มข่าวสำเร็จ');
      setTimeout(() => setSuccessMsg(''), 2500);
      loadNews();
    } catch (err) {
      setAddError(err.message || 'เพิ่มข่าวไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  // ลบจริงหลังผู้ใช้กดยืนยันในป็อปอัพ
  const handleDelete = async (id) => {
    try {
      await deleteNews(id);
      setNews(prev => prev.filter(n => n.id !== id));
      setDeleteTarget(null);
      setSuccessMsg('ลบข่าวสำเร็จ');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      setDeleteTarget(null);
      alert(err.message || 'ลบข่าวไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  const now = today;
  const activeNews = news.filter(n => !n.endDate || n.endDate >= now);
  const expiredNews = news.filter(n => n.endDate && n.endDate < now);

  return (
    <div className="dashboard-page">
      <AdminSidebar />
      <div className="dashboard-right">
        <div className="dash-top-bar">
          <h4 style={{ fontFamily: 'Playfair Display', margin: 0 }}>จัดการข่าวสาร</h4>
          <button className="btn btn-gold btn-sm" onClick={() => setShowAddPopup(true)}><i className="bi bi-plus me-1"></i>เพิ่มข่าว</button>
        </div>
        {successMsg && <div className="alert alert-success py-2 mb-3" style={{ fontSize: 14, borderRadius: 10 }}><i className="bi bi-check-circle me-2"></i>{successMsg}</div>}
        {loading ? <div className="text-center py-5"><span className="spinner-border text-sage"></span></div> : (
          <>
            <h6 style={{ fontWeight: 700, marginBottom: 12, color: 'var(--sage-dark)' }}><i className="bi bi-newspaper me-2"></i>ข่าวที่เผยแพร่อยู่ ({activeNews.length})</h6>
            <div className="d-flex flex-column gap-3 mb-4">
              {activeNews.map(n => (
                <div key={n.id} style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--ivory-dark)' }}>
                  <div className="d-flex gap-3 align-items-start">
                    {n.image && <img src={n.image} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 4 }}>
                        <span><i className="bi bi-calendar-event me-1"></i>{n.publishDate}</span>
                        {n.endDate && <span className="ms-2" style={{ color: '#E65100' }}><i className="bi bi-calendar-x me-1"></i>ถึง {n.endDate}</span>}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>{n.content.substring(0, 100)}{n.content.length > 100 ? '...' : ''}</div>
                    </div>
                    <button className="btn btn-outline-danger btn-sm" style={{ borderRadius: 8, flexShrink: 0 }} onClick={() => setDeleteTarget(n)}><i className="bi bi-trash"></i></button>
                  </div>
                </div>
              ))}
              {activeNews.length === 0 && <div className="empty-state"><i className="bi bi-newspaper"></i><h5>ยังไม่มีข่าว</h5></div>}
            </div>
            {expiredNews.length > 0 && (
              <>
                <h6 style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text-light)' }}><i className="bi bi-archive me-2"></i>ข่าวที่หมดอายุแล้ว ({expiredNews.length})</h6>
                <div className="d-flex flex-column gap-3">
                  {expiredNews.map(n => (
                    <div key={n.id} style={{ background: 'var(--ivory)', borderRadius: 'var(--radius)', padding: 20, border: '1px solid var(--ivory-dark)', opacity: 0.7 }}>
                      <div className="d-flex gap-3 align-items-start">
                        {n.image && <img src={n.image} alt="" style={{ width: 70, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0, filter: 'grayscale(50%)' }} />}
                        <div style={{ flex: 1 }}><div style={{ fontWeight: 600, color: 'var(--text-mid)' }}>{n.title}</div><div style={{ fontSize: 12, color: 'var(--danger)' }}>หมดอายุ: {n.endDate}</div></div>
                        <button className="btn btn-outline-danger btn-sm" style={{ borderRadius: 8 }} onClick={() => setDeleteTarget(n)}><i className="bi bi-trash"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ป็อปอัพยืนยันก่อนลบข่าว */}
      {deleteTarget && (
        <Popup icon="bi-trash-fill" iconClass="danger" title="ลบข่าวนี้?" message={`ต้องการลบข่าว "${deleteTarget.title}" ใช่หรือไม่? การลบจะไม่สามารถกู้คืนได้`} onClose={() => setDeleteTarget(null)}>
          <div className="d-flex gap-3 w-100">
            <button className="btn-aurora-secondary flex-1" onClick={() => setDeleteTarget(null)}>ยกเลิก</button>
            <button className="btn-aurora-danger flex-1" onClick={() => handleDelete(deleteTarget.id)}>ยืนยันลบ</button>
          </div>
        </Popup>
      )}

      {showAddPopup && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddPopup(false); }}>
          <div className="modal-card" style={{ maxWidth: 560 }}>
            <div className="modal-card-header"><button className="modal-close-btn" onClick={() => setShowAddPopup(false)}><i className="bi bi-x-lg"></i></button><h5 style={{ fontFamily: 'Playfair Display', margin: 0 }}>เพิ่มข่าวใหม่</h5></div>
            <div className="modal-body">
              <form onSubmit={handleAdd}>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label-aurora">หัวข้อข่าว <span className="required-star">*</span></label>
                    <input className="form-control-aurora" placeholder="หัวข้อ" maxLength={100} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
                  </div>
                  
                  {/* เปลี่ยนจาก URL Text Box เป็น File Upload */}
                  <div className="col-12">
                    <label className="form-label-aurora">รูปภาพข่าวสาร</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="form-control-aurora" 
                      onChange={handleImageChange} 
                    />
                    
                    {/* แสดงรูปตัวอย่าง (Preview) เมื่อเลือกรูปแล้ว */}
                    {form.image && (
                      <div className="mt-2 text-center" style={{ position: 'relative', display: 'inline-block' }}>
                        <img 
                          src={form.image} 
                          alt="Preview" 
                          style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 8, border: '1px solid var(--ivory-dark)', objectFit: 'cover' }} 
                        />
                        <button 
                          type="button" 
                          className="btn btn-danger btn-sm" 
                          style={{ position: 'absolute', top: 5, right: 5, borderRadius: '50%', padding: '2px 6px', fontSize: 12 }} 
                          onClick={() => setForm(p => ({ ...p, image: '' }))}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label-aurora">วันที่เผยแพร่ <span className="required-star">*</span></label>
                    <DateInput value={form.publishDate} onChange={e => setForm(p => ({ ...p, publishDate: e.target.value }))} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label-aurora">วันที่สิ้นสุด</label>
                    <DateInput min={form.publishDate} value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
                    <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>ถ้าไม่กำหนด จะแสดงตลอดไป</div>
                  </div>
                  <div className="col-12">
                    <label className="form-label-aurora">เนื้อหา <span className="required-star">*</span></label>
                    <textarea className="form-control-aurora" rows={4} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} required style={{ resize: 'vertical' }}></textarea>
                  </div>
                  
                  {addError && <div className="col-12"><div className="alert alert-danger py-2" style={{ fontSize: 13, borderRadius: 10 }}>{addError}</div></div>}
                  
                  <div className="col-12 d-flex gap-3 mt-2">
                    <button type="submit" className="btn-aurora-primary" style={{ maxWidth: 160 }}>เพิ่มข่าว</button>
                    <button type="button" className="btn-aurora-secondary" onClick={() => setShowAddPopup(false)}>ยกเลิก</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}