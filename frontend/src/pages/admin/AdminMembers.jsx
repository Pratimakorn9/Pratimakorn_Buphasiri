// ==========================================
// pages/admin/AdminMembers.jsx
// จัดการสมาชิกและพนักงาน
// ==========================================
import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getStatusBadge, formatPrice } from '../../components/Helpers';
import { API, apiFetch, Popup, AdminSidebar, BookingDetailModal, RoomForm } from './components/_shared';
import { sanitizeName, sanitizeEmail, sanitizePhone, nameError, emailError, phoneError, normalizePhone } from '../../utils/validators';


// ===== ADMIN MEMBERS =====
export function AdminMembers() {
  const { users, setStaffStatus, addStaff } = useApp();
  const [tab, setTab] = useState('members');
  const members = users.filter(u => u.role === 'member');
  const staffList = users.filter(u => u.role === 'staff');
  const [statusPopup, setStatusPopup] = useState(null); // { user, status } รอยืนยันระงับ/เปิดใช้งาน
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [addForm, setAddForm] = useState({ prefix: '', firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [addError, setAddError] = useState('');
  const PREFIXES = ['นาย', 'นาง', 'นางสาว'];

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setAddError('');
    // ตรวจข้อมูลก่อนส่ง (เบอร์/อีเมลซ้ำ backend จะตรวจและแจ้งกลับ)
    const formErr = nameError('ชื่อ', addForm.firstName) || nameError('นามสกุล', addForm.lastName)
      || emailError(addForm.email) || phoneError(addForm.phone, { required: false });
    if (formErr) { setAddError(formErr); return; }
    if (!addForm.password || addForm.password.length < 6) { setAddError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return; }
    const res = await addStaff({ ...addForm, firstName: addForm.firstName.trim(), lastName: addForm.lastName.trim(), phone: normalizePhone(addForm.phone) });
    if (res.success) { setAddForm({ prefix: '', firstName: '', lastName: '', email: '', phone: '', password: '' }); setShowAddStaff(false); }
    else setAddError(res.message);
  };

  // ระงับ/เปิดใช้งานบัญชีพนักงาน (ไม่ลบข้อมูลจริง) — รอยืนยันในป็อปอัพก่อน
  const handleChangeStatus = async () => {
    const { user, status } = statusPopup;
    try {
      await setStaffStatus(user.id, status);
      setStatusPopup(null);
    } catch (err) {
      alert(err.message || 'เปลี่ยนสถานะบัญชีไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  return (
    <div className="dashboard-page">
      <AdminSidebar />
      <div className="dashboard-right">
        <div className="dash-top-bar">
          <h4 style={{ fontFamily: 'Playfair Display', margin: 0 }}>สมาชิก/พนักงาน</h4>
          {tab === 'staff' && <button className="btn btn-gold btn-sm" onClick={() => setShowAddStaff(true)}><i className="bi bi-person-plus me-1"></i>เพิ่มพนักงาน</button>}
        </div>
        <div className="aurora-tabs" style={{ maxWidth: 320 }}>
          <button className={`aurora-tab ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}><i className="bi bi-people me-1"></i>สมาชิก ({members.length})</button>
          <button className={`aurora-tab ${tab === 'staff' ? 'active' : ''}`} onClick={() => setTab('staff')}><i className="bi bi-person-badge me-1"></i>พนักงาน ({staffList.length})</button>
        </div>

        {tab === 'members' && (
          <div className="aurora-table">
            <table className="table table-hover mb-0">
              <thead><tr><th>ชื่อ</th><th>อีเมล</th><th>เบอร์โทร</th><th>สมัครวันที่</th></tr></thead>
              <tbody>
                {members.map(u => (<tr key={u.id}><td style={{ fontWeight: 600 }}>{u.prefix} {u.firstName} {u.lastName}</td><td>{u.email}</td><td>{u.phone || '-'}</td><td>{u.createdAt}</td></tr>))}
                {members.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-muted">ยังไม่มีสมาชิก</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'staff' && (
          <div className="aurora-table">
            <table className="table table-hover mb-0">
              <thead><tr><th>ชื่อ</th><th>อีเมล</th><th>เบอร์โทร</th><th>สมัครวันที่</th><th>สถานะ</th><th></th></tr></thead>
              <tbody>
                {staffList.map(u => (
                  <tr key={u.id} style={u.status === 'suspended' ? { opacity: 0.65 } : undefined}>
                    <td style={{ fontWeight: 600 }}>{u.prefix} {u.firstName} {u.lastName}</td>
                    <td>{u.email}</td><td>{u.phone || '-'}</td><td>{u.createdAt}</td>
                    <td>
                      {u.status === 'suspended'
                        ? <span style={{ background: 'rgba(220,53,69,0.12)', color: 'var(--danger)', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>ระงับการใช้งาน</span>
                        : <span style={{ background: 'rgba(86,169,127,0.12)', color: 'var(--success)', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>ใช้งานอยู่</span>}
                    </td>
                    <td>
                      {u.status === 'suspended'
                        ? <button className="btn btn-outline-success btn-sm" style={{ borderRadius: 8 }} onClick={() => setStatusPopup({ user: u, status: 'active' })}><i className="bi bi-person-check me-1"></i>เปิดใช้งาน</button>
                        : <button className="btn btn-outline-danger btn-sm" style={{ borderRadius: 8 }} onClick={() => setStatusPopup({ user: u, status: 'suspended' })}><i className="bi bi-person-x me-1"></i>ระงับ</button>}
                    </td>
                  </tr>
                ))}
                {staffList.length === 0 && <tr><td colSpan={6} className="text-center py-4 text-muted">ยังไม่มีพนักงาน</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {statusPopup && (statusPopup.status === 'suspended' ? (
        <Popup icon="bi-person-x-fill" iconClass="danger" title={`ระงับการใช้งานบัญชี "${statusPopup.user.firstName} ${statusPopup.user.lastName}"?`} message="พนักงานคนนี้จะเข้าสู่ระบบไม่ได้ แต่ข้อมูลและประวัติการทำงานยังอยู่ และเปิดใช้งานใหม่ได้ภายหลัง" onClose={() => setStatusPopup(null)}>
          <div className="d-flex gap-3 w-100">
            <button className="btn-aurora-secondary flex-1" onClick={() => setStatusPopup(null)}>ยกเลิก</button>
            <button className="btn-aurora-danger flex-1" onClick={handleChangeStatus}>ยืนยันระงับ</button>
          </div>
        </Popup>
      ) : (
        <Popup icon="bi-person-check-fill" iconClass="success" title={`เปิดใช้งานบัญชี "${statusPopup.user.firstName} ${statusPopup.user.lastName}" อีกครั้ง?`} message="พนักงานคนนี้จะกลับมาเข้าสู่ระบบได้ตามปกติ" onClose={() => setStatusPopup(null)}>
          <div className="d-flex gap-3 w-100">
            <button className="btn-aurora-secondary flex-1" onClick={() => setStatusPopup(null)}>ยกเลิก</button>
            <button className="btn-aurora-primary flex-1" onClick={handleChangeStatus}>ยืนยันเปิดใช้งาน</button>
          </div>
        </Popup>
      ))}

      {showAddStaff && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddStaff(false); }}>
          <div className="modal-card" style={{ maxWidth: 520 }}>
            <div className="modal-card-header"><button className="modal-close-btn" onClick={() => setShowAddStaff(false)}><i className="bi bi-x-lg"></i></button><h5 style={{ fontFamily: 'Playfair Display', margin: 0 }}>เพิ่มพนักงานใหม่</h5></div>
            <div className="modal-body">
              <form onSubmit={handleAddStaff}>
                <div className="row g-3">
                  <div className="col-12"><label className="form-label-aurora">คำนำหน้า <span className="required-star">*</span></label><select className="form-control-aurora" value={addForm.prefix} onChange={e => setAddForm(p => ({ ...p, prefix: e.target.value }))} required><option value="">-- เลือก --</option>{PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                  <div className="col-md-6"><label className="form-label-aurora">ชื่อ <span className="required-star">*</span></label><input className="form-control-aurora" maxLength={50} value={addForm.firstName} onChange={e => setAddForm(p => ({ ...p, firstName: sanitizeName(e.target.value) }))} required /></div>
                  <div className="col-md-6"><label className="form-label-aurora">นามสกุล <span className="required-star">*</span></label><input className="form-control-aurora" maxLength={50} value={addForm.lastName} onChange={e => setAddForm(p => ({ ...p, lastName: sanitizeName(e.target.value) }))} required /></div>
                  <div className="col-md-6"><label className="form-label-aurora">อีเมล <span className="required-star">*</span></label><input type="email" className="form-control-aurora" maxLength={50} value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: sanitizeEmail(e.target.value) }))} required /></div>
                  <div className="col-md-6"><label className="form-label-aurora">เบอร์โทร</label><input className="form-control-aurora" inputMode="numeric" maxLength={10} placeholder="0812345678" value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: sanitizePhone(e.target.value) }))} /></div>
                  <div className="col-12"><label className="form-label-aurora">รหัสผ่าน <span className="required-star">*</span></label><input type="password" className="form-control-aurora" maxLength={100} value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} required /></div>
                  {addError && <div className="col-12"><div className="alert alert-danger py-2" style={{ fontSize: 13, borderRadius: 10 }}>{addError}</div></div>}
                  <div className="col-12 d-flex gap-3 mt-2"><button type="submit" className="btn-aurora-primary" style={{ maxWidth: 180 }}>เพิ่มพนักงาน</button><button type="button" className="btn-aurora-secondary" onClick={() => setShowAddStaff(false)}>ยกเลิก</button></div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}