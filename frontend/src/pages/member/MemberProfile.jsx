// ==========================================
// pages/member/MemberProfile.jsx
// หน้าโปรไฟล์และแก้ไขข้อมูลส่วนตัวสมาชิก
// ==========================================
import { useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getStatusBadge, formatPrice, StarInput } from '../../components/Helpers';
import { API, apiFetch, MemberSidebar } from './components/_shared';
import { sanitizeName, sanitizePhone, nameError, phoneError, normalizePhone } from '../../utils/validators';

// ===== MEMBER PROFILE =====
export function MemberProfile() {
  const { currentUser, updateUser } = useApp();
  const [isEditing, setIsEditing] = useState(false); // ควบคุมสถานะโหมดแก้ไข (Read-only / Edit)
  const [form, setForm] = useState({
    prefix: currentUser?.prefix || '',
    firstName: currentUser?.firstName || '',
    lastName: currentUser?.lastName || '',
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
  });
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const PREFIXES = ['นาย', 'นาง', 'นางสาว', 'Mr.', 'Mrs.', 'Ms.'];

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    // ตรวจชื่อ/นามสกุล/เบอร์ก่อนบันทึก (เบอร์ต้องไม่ซ้ำกับบัญชีอื่น — backend เป็นผู้ตรวจและแจ้งกลับ)
    const formErr = nameError('ชื่อ', form.firstName) || nameError('นามสกุล', form.lastName) || phoneError(form.phone);
    if (formErr) { setSaveError(formErr); return; }
    try {
      await updateUser(currentUser.id, { ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: normalizePhone(form.phone) });
      setSaved(true);
      setIsEditing(false); // บันทึกเสร็จแล้วกลับสู่โหมด Read-only
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      // FIX: เดิม updateUser ไม่เคย throw (กลืน error ไว้เอง) ทำให้เห็น "บันทึกสำเร็จ" แม้ backend ปฏิเสธ
      setSaveError(err.message || 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  const handleCancel = () => {
    // รีเซ็ตค่าฟอร์มกลับเป็นค่าเดิมของ User และปิดโหมดแก้ไข
    setForm({
      prefix: currentUser?.prefix || '',
      firstName: currentUser?.firstName || '',
      lastName: currentUser?.lastName || '',
      phone: currentUser?.phone || '',
      email: currentUser?.email || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="container py-5">
      <div className="row g-4">
        <div className="col-lg-4"><MemberSidebar /></div>
        <div className="col-lg-8">

          {/* Profile Hero Card */}
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
            <div style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 60%, #3a6b6b 100%)', padding: '32px', position: 'relative', overflow: 'hidden' }}>
              {/* decorative circles */}
              <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(168,197,176,0.08)' }}></div>
              <div style={{ position: 'absolute', bottom: -20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(168,197,176,0.06)' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, position: 'relative', zIndex: 1 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--sage-light), var(--sage))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700, color: 'white', border: '3px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
                  {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
                </div>
                <div style={{ color: 'white', flexGrid: 1 }} className="w-100">
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <div>
                      <div style={{ fontFamily: 'Playfair Display', fontSize: 22, fontWeight: 700 }}>{currentUser?.prefix} {currentUser?.firstName} {currentUser?.lastName}</div>
                      <div style={{ opacity: 0.65, fontSize: 13, marginTop: 4 }}><i className="bi bi-envelope me-1"></i>{currentUser?.email}</div>
                      {currentUser?.phone && <div style={{ opacity: 0.65, fontSize: 13, marginTop: 2 }}><i className="bi bi-telephone me-1"></i>{currentUser?.phone}</div>}
                    </div>
                    
                    {/* ปุ่มกดเปิดโหมดแก้ไข จะแสดงเมื่ออยู่ในสถานะอ่านปกติเท่านั้น */}
                    {!isEditing && (
                      <button 
                        type="button" 
                        className="btn btn-gold btn-sm" 
                        style={{ padding: '6px 16px', borderRadius: 8, fontSize: 13 }}
                        onClick={() => setIsEditing(true)}
                      >
                        <i className="bi bi-pencil-square me-1"></i>แก้ไขข้อมูล
                      </button>
                    )}
                  </div>
                  
                  <div style={{ marginTop: 10 }}>
                    <span style={{ background: 'rgba(168,197,176,0.2)', border: '1px solid rgba(168,197,176,0.35)', color: 'var(--sage-light)', padding: '3px 14px', borderRadius: 50, fontSize: 11, fontWeight: 600 }}>
                      สมาชิก Aurora Grand Hotel
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <i className="bi bi-person-gear" style={{ color: 'var(--sage)', fontSize: 18 }}></i>
                <h6 style={{ fontFamily: 'Playfair Display', margin: 0, fontSize: 16 }}>
                  {isEditing ? 'กำลังแก้ไขข้อมูลส่วนตัว' : 'ข้อมูลส่วนตัว'}
                </h6>
              </div>
              
              <form onSubmit={handleSave}>
                <div className="row g-3 mb-4">
                  <div className="col-md-3">
                    <label className="form-label-aurora">คำนำหน้า</label>
                    <select 
                      className="form-control-aurora" 
                      value={form.prefix} 
                      disabled={!isEditing} 
                      onChange={e => setForm(p => ({ ...p, prefix: e.target.value }))}
                    >
                      <option value="">-</option>
                      {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label-aurora">ชื่อ</label>
                    <input 
                      className="form-control-aurora" 
                      value={form.firstName} 
                      disabled={!isEditing} 
                      maxLength={50}
                      onChange={e => setForm(p => ({ ...p, firstName: sanitizeName(e.target.value) }))} 
                    />
                  </div>
                  <div className="col-md-5">
                    <label className="form-label-aurora">นามสกุล</label>
                    <input 
                      className="form-control-aurora" 
                      value={form.lastName} 
                      disabled={!isEditing} 
                      maxLength={50}
                      onChange={e => setForm(p => ({ ...p, lastName: sanitizeName(e.target.value) }))} 
                    />
                  </div>
                  <div className="col-md-6">
                    {/* อีเมลถูกล็อกตายตัวถาวร ไม่สามารถแก้ไขได้แม้จะกดปุ่มแก้ไข */}
                    <label className="form-label-aurora">อีเมล (ไม่สามารถแก้ไขได้)</label>
                    <input 
                      type="email" 
                      className="form-control-aurora" 
                      value={form.email} 
                      disabled 
                      style={{ background: 'var(--ivory-dark)', cursor: 'not-allowed', opacity: 0.8 }} 
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label-aurora">เบอร์โทรศัพท์</label>
                    <input 
                      className="form-control-aurora" 
                      value={form.phone} 
                      disabled={!isEditing} 
                      inputMode="numeric" maxLength={10}
                      onChange={e => setForm(p => ({ ...p, phone: sanitizePhone(e.target.value) }))} 
                    />
                  </div>
                </div>
                
                {saved && (
                  <div style={{ background: 'rgba(86,169,127,0.1)', border: '1px solid rgba(86,169,127,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="bi bi-check-circle-fill"></i>บันทึกข้อมูลสำเร็จ
                  </div>
                )}

                {saveError && (
                  <div style={{ background: 'rgba(220,53,69,0.1)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="bi bi-exclamation-circle-fill"></i>{saveError}
                  </div>
                )}
                
                {/* กลุ่มปุ่มกดยืนยันการทำงาน จะปรากฏเฉพาะเวลากดโหมดแก้ไขเท่านั้น */}
                {isEditing && (
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn-aurora-primary" style={{ maxWidth: 140 }}>
                      <i className="bi bi-floppy me-2"></i>บันทึก
                    </button>
                    <button type="button" className="btn-aurora-secondary" style={{ padding: '10px 20px' }} onClick={handleCancel}>
                      ยกเลิก
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}