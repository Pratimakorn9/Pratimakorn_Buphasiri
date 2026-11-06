import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { sanitizeName, sanitizeEmail, sanitizePhone, nameError, emailError, phoneError } from '../utils/validators';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ===== OTP Input Component =====
function OtpInputBlock({ email, onClose, onSuccess, onResend }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setVerifying(true); setError('');
    try {
      const res = await fetch(`${API}/otp/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message); setVerifying(false); return; }
      const errMsg = await onSuccess();
      if (errMsg) { setError(errMsg); setVerifying(false); }
    } catch { setError('เกิดข้อผิดพลาด กรุณาลองใหม่'); setVerifying(false); }
  };

  const handleResend = async () => {
    setResending(true); setResendMsg(''); setError('');
    try {
      const res = await fetch(`${API}/otp/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) { setResendMsg(data.demo ? 'ดู OTP ใน console ของ backend' : `ส่ง OTP ใหม่ไปที่ ${email} แล้ว`); setOtp(''); }
      else setError(data.message);
    } catch { setError('ส่งอีเมลไม่สำเร็จ'); }
    setResending(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 420 }}>
        <div className="modal-card-header text-center">
          <button className="modal-close-btn" onClick={onClose}><i className="bi bi-x-lg"></i></button>
          <h4 style={{ fontFamily: 'Playfair Display', marginBottom: 4 }}>ยืนยันอีเมล</h4>
          <p style={{ opacity: 0.65, fontSize: 13, margin: 0 }}>ส่ง OTP ไปที่ <strong>{email}</strong> แล้ว</p>
        </div>
        <div className="modal-body text-center">
          <div className="form-group">
            <label className="form-label-aurora">รหัส OTP (6 หลัก)</label>
            <input className="form-control-aurora text-center"
              style={{ fontSize: 22, letterSpacing: 8, fontWeight: 700 }}
              maxLength={6} placeholder="○○○○○○" value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && otp.length === 6 && handleVerify()} />
          </div>
          {error && <div className="form-error mb-3"><i className="bi bi-exclamation-circle me-1"></i>{error}</div>}
          {resendMsg && <div style={{ fontSize: 13, color: 'var(--sage-dark)', marginBottom: 12 }}><i className="bi bi-check-circle me-1"></i>{resendMsg}</div>}
          <button className="btn-aurora-primary" onClick={handleVerify} disabled={otp.length !== 6 || verifying}>
            {verifying ? 'กำลังตรวจสอบ...' : 'ยืนยัน OTP'}
          </button>
          <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-light)' }}>
            ไม่ได้รับ OTP?{' '}
            <button style={{ background: 'none', border: 'none', color: 'var(--sage-dark)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              onClick={handleResend} disabled={resending}>
              {resending ? 'กำลังส่ง...' : 'ส่งใหม่'}
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 8 }}>OTP หมดอายุใน 5 นาที</p>
        </div>
      </div>
    </div>
  );
}

// ===== Forgot Password Flow =====
function ForgotPasswordModal({ onClose, onBackToLogin }) {
  const [step, setStep] = useState('email'); // email → otp → newpw → done
  const [email, setEmail] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ขั้น 1: ส่ง OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/otp/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) setStep('otp');
      else setError(data.message || 'ส่ง OTP ไม่สำเร็จ');
    } catch { setError('เกิดข้อผิดพลาด กรุณาลองใหม่'); }
    setLoading(false);
  };

  // ขั้น 2: ยืนยัน OTP แล้วไปหน้ากรอก pw ใหม่
  const handleOtpSuccess = async () => {
    setStep('newpw');
    return null;
  };

  // ขั้น 3: เปลี่ยนรหัสผ่านจริง
  const handleResetPw = async (e) => {
    e.preventDefault();
    setError('');
    if (newPw.length < 6) return setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัว');
    if (newPw !== confirm) return setError('รหัสผ่านไม่ตรงกัน');
    setLoading(true);
    try {
      const res = await fetch(`${API}/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, new_password: newPw }),
      });
      const data = await res.json();
      if (data.success) setStep('done');
      else setError(data.message || 'เกิดข้อผิดพลาด');
    } catch { setError('เกิดข้อผิดพลาด กรุณาลองใหม่'); }
    setLoading(false);
  };

  if (step === 'otp') {
    return <OtpInputBlock email={email} onClose={onClose} onSuccess={handleOtpSuccess} />;
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: 420 }}>
        <div className="modal-card-header text-center">
          <button className="modal-close-btn" onClick={onClose}><i className="bi bi-x-lg"></i></button>
          {step === 'done' ? (
            <>
              <div style={{ fontSize: 48, marginBottom: 8 }}></div>
              <h4 style={{ fontFamily: 'Playfair Display', marginBottom: 4 }}>เปลี่ยนรหัสผ่านสำเร็จ</h4>
              <p style={{ opacity: 0.65, fontSize: 13, margin: 0 }}>คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว</p>
            </>
          ) : step === 'newpw' ? (
            <>
              <div style={{ fontSize: 36, marginBottom: 8 }}></div>
              <h4 style={{ fontFamily: 'Playfair Display', marginBottom: 4 }}>ตั้งรหัสผ่านใหม่</h4>
              <p style={{ opacity: 0.65, fontSize: 13, margin: 0 }}>สำหรับบัญชี {email}</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 36, marginBottom: 8 }}></div>
              <h4 style={{ fontFamily: 'Playfair Display', marginBottom: 4 }}>ลืมรหัสผ่าน?</h4>
              <p style={{ opacity: 0.65, fontSize: 13, margin: 0 }}>กรอกอีเมลที่ลงทะเบียนไว้ เราจะส่ง OTP ให้คุณ</p>
            </>
          )}
        </div>
        <div className="modal-body">
          {step === 'email' && (
            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label className="form-label-aurora">อีเมล</label>
                <input type="email" className="form-control-aurora" placeholder="กรุณากรอกอีเมล"
                  maxLength={50} value={email} onChange={e => setEmail(sanitizeEmail(e.target.value))} required />
              </div>
              {error && <div className="form-error mb-3"><i className="bi bi-exclamation-circle me-1"></i>{error}</div>}
              <button type="submit" className="btn-aurora-primary" disabled={loading}>
                {loading ? 'กำลังส่ง OTP...' : 'ส่ง OTP ไปยังอีเมล'}
              </button>
              <div className="text-center mt-3">
                <button type="button" style={{ background: 'none', border: 'none', color: 'var(--sage-dark)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                  onClick={onBackToLogin}>
                  <i className="bi bi-arrow-left me-1"></i>กลับไปหน้าเข้าสู่ระบบ
                </button>
              </div>
            </form>
          )}
          {step === 'newpw' && (
            <form onSubmit={handleResetPw}>
              <div className="form-group">
                <label className="form-label-aurora">รหัสผ่านใหม่</label>
                <input type="password" className="form-control-aurora" placeholder="อย่างน้อย 6 ตัว"
                  value={newPw} onChange={e => setNewPw(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label-aurora">ยืนยันรหัสผ่านใหม่</label>
                <input type="password" className="form-control-aurora" placeholder="••••••"
                  value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </div>
              {error && <div className="form-error mb-3"><i className="bi bi-exclamation-circle me-1"></i>{error}</div>}
              <button type="submit" className="btn-aurora-primary" disabled={loading}>
                {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
              </button>
            </form>
          )}
          {step === 'done' && (
            <button className="btn-aurora-primary" onClick={onBackToLogin}>
              <i className="bi bi-box-arrow-in-right me-2"></i>ไปหน้าเข้าสู่ระบบ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== LOGIN MODAL =====
export function LoginModal() {
  const { login, setShowLogin, setShowRegister } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  if (showForgot) {
    return <ForgotPasswordModal onClose={() => setShowLogin(false)} onBackToLogin={() => setShowForgot(false)} />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await response.json();
      if (data.success) {
        sessionStorage.setItem('token', data.token);
        localStorage.setItem('token', data.token);
        login(data.user);
        setShowLogin(false);
        if (data.user.role === 'staff') navigate('/staff');
        else if (data.user.role === 'admin') navigate('/admin');
      } else {
        setError(data.message);
      }
    } catch { setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); }
    setLoading(false);
  };

  const demoAccounts = [
    { label: 'Admin', email: 'admin@aurora.com', password: 'admin1234' },
    { label: 'Staff', email: 'staff@aurora.com', password: 'staff1234' },
    { label: 'Member', email: 'member@aurora.com', password: 'member1234' },
  ];

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowLogin(false); }}>
      <div className="modal-card" style={{ maxWidth: 460 }}>
        <div className="modal-card-header">
          <button className="modal-close-btn" onClick={() => setShowLogin(false)}><i className="bi bi-x-lg"></i></button>
          <div className="text-center">
            <h4 style={{ fontFamily: 'Playfair Display', marginBottom: 4 }}>เข้าสู่ระบบ</h4>
            <p style={{ opacity: 0.65, fontSize: 13, margin: 0 }}>Aurora Grand Hotel</p>
          </div>
        </div>
        <div className="modal-body">
          <div className="mb-4">
            {/* <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>ทดสอบระบบ</div> */}
            {/* <div className="d-flex gap-2 flex-wrap">
              {demoAccounts.map(acc => (
                <button key={acc.email} type="button"
                  style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '1.5px solid var(--ivory-dark)', background: 'var(--ivory)', cursor: 'pointer', fontFamily: 'Noto Sans Thai' }}
                  onClick={() => setForm({ email: acc.email, password: acc.password })}>
                  {acc.label}
                </button>
              ))}
            </div> */}
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label-aurora">อีเมล</label>
              <input type="email" className="form-control-aurora" placeholder="กรุณากรอกอีเมล"
                maxLength={50} value={form.email} onChange={e => setForm(p => ({ ...p, email: sanitizeEmail(e.target.value) }))} required />
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label-aurora" style={{ margin: 0 }}>รหัสผ่าน</label>
                <button type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--sage-dark)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  onClick={() => setShowForgot(true)}>
                  ลืมรหัสผ่าน?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} className="form-control-aurora" placeholder=""
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required
                  style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}>
                  <i className={`bi bi-eye${showPass ? '-slash' : ''}`}></i>
                </button>
              </div>
            </div>
            {error && <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3" style={{ fontSize: 13, borderRadius: 10 }}><i className="bi bi-exclamation-circle"></i>{error}</div>}
            <button type="submit" className="btn-aurora-primary" disabled={loading}>
              {loading ? <><span className="spinner-border spinner-border-sm me-2"></span>กำลังเข้าสู่ระบบ...</> : 'เข้าสู่ระบบ'}
            </button>
          </form>
          <div className="text-center mt-4" style={{ fontSize: 13, color: 'var(--text-light)' }}>
            ยังไม่มีบัญชี?{' '}
            <button style={{ background: 'none', border: 'none', color: 'var(--sage-dark)', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => { setShowLogin(false); setShowRegister(true); }}>
              สมัครสมาชิก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== REGISTER MODAL =====
function RegisterField({ label, required, error, children }) {
  return (
    <div className="form-group" style={{ marginBottom: 14 }}>
      <label className="form-label-aurora">{label}{required && <span className="required-star ms-1">*</span>}</label>
      {children}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}

export function RegisterModal() {
  const { setShowRegister, setShowLogin } = useApp();
  const [step, setStep] = useState('form'); // form → otp → success
  const [pendingData, setPendingData] = useState(null);
  const [form, setForm] = useState({ prefix: '', firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [registeredName, setRegisteredName] = useState('');
  const PREFIXES = ['นาย', 'นาง', 'นางสาว'];

  const validate = () => {
    const e = {};
    if (!form.prefix) e.prefix = 'กรุณาเลือกคำนำหน้า';
    const fnErr = nameError('ชื่อ', form.firstName);
    if (fnErr) e.firstName = fnErr;
    const lnErr = nameError('นามสกุล', form.lastName);
    if (lnErr) e.lastName = lnErr;
    const emErr = emailError(form.email);
    if (emErr) e.email = emErr;
    const phErr = phoneError(form.phone);
    if (phErr) e.phone = phErr;
    if (!form.password) e.password = 'กรุณากรอกรหัสผ่าน';
    else if (form.password.length < 6) e.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
    if (form.password !== form.confirm) e.confirm = 'รหัสผ่านไม่ตรงกัน';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      const chk = await fetch(`${API}/check-availability`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, phone: form.phone }),
      });
      const chkData = await chk.json();
      if (!chkData.success && chkData.errors) { setErrors(prev => ({ ...prev, ...chkData.errors })); setLoading(false); return; }
    } catch { setErrors(prev => ({ ...prev, email: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' })); setLoading(false); return; }
    try {
      const res = await fetch(`${API}/otp/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!data.success) { setErrors(prev => ({ ...prev, email: data.message })); setLoading(false); return; }
    } catch { setErrors(prev => ({ ...prev, email: 'ส่ง OTP ไม่สำเร็จ' })); setLoading(false); return; }
    setLoading(false);
    setPendingData(form);
    setStep('otp');
  };

  const handleOtpSuccess = async () => {
    try {
      const response = await fetch(`${API}/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: pendingData.prefix, firstname: pendingData.firstName.trim(), lastname: pendingData.lastName.trim(), email: pendingData.email.trim(), phone: pendingData.phone, password: pendingData.password }),
      });
      const data = await response.json();
      if (data.success) { setRegisteredName(pendingData.firstName); setStep('success'); return null; }
      return data.message;
    } catch { return 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'; }
  };

  const set = k => e => { setForm(p => ({ ...p, [k]: e.target.value })); if (errors[k]) setErrors(p => ({ ...p, [k]: '' })); };
  // กรองตัวอักษรที่ไม่อนุญาตตอนพิมพ์ (ชื่อ: ไทย/อังกฤษ, อีเมล: อังกฤษ/ตัวเลข, เบอร์: ตัวเลข ไม่เกิน 10 หลัก)
  const setClean = (k, clean) => e => { setForm(p => ({ ...p, [k]: clean(e.target.value) })); if (errors[k]) setErrors(p => ({ ...p, [k]: '' })); };

  // สมัครเสร็จ → เด้งไปหน้า login
  if (step === 'success') {
    return (
      <div className="popup-overlay">
        <div className="popup-card">
          <div className="popup-icon success"><i className="bi bi-person-check-fill"></i></div>
          <h5 style={{ fontFamily: 'Playfair Display', marginBottom: 8 }}>ยินดีต้อนรับ คุณ {registeredName}</h5>
          <p style={{ color: 'var(--text-mid)', fontSize: 14, marginBottom: 20 }}>สมัครสมาชิกสำเร็จ</p>
          <button className="btn-aurora-primary" onClick={() => { setShowRegister(false); setShowLogin(true); }}>
            <i className="bi bi-box-arrow-in-right me-2"></i>เข้าสู่ระบบ
          </button>
        </div>
      </div>
    );
  }

  if (step === 'otp') return <OtpInputBlock email={pendingData.email} onClose={() => setStep('form')} onSuccess={handleOtpSuccess} />;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowRegister(false); }}>
      <div className="modal-card" style={{ maxWidth: 500 }}>
        <div className="modal-card-header">
          <button className="modal-close-btn" onClick={() => setShowRegister(false)}><i className="bi bi-x-lg"></i></button>
          <div className="text-center">
            <h4 style={{ fontFamily: 'Playfair Display', marginBottom: 4 }}>สมัครสมาชิก</h4>
            <p style={{ opacity: 0.65, fontSize: 13, margin: 0 }}>Aurora Grand Hotel</p>
          </div>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} noValidate>
            <RegisterField label="คำนำหน้า" required error={errors.prefix}>
              <select className={`form-control-aurora ${errors.prefix ? 'is-invalid' : ''}`} value={form.prefix} onChange={set('prefix')}>
                <option value="">-- เลือกคำนำหน้า --</option>
                {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </RegisterField>
            <div className="row g-3">
              <div className="col-6">
                <RegisterField label="ชื่อ" required error={errors.firstName}>
                  <input className={`form-control-aurora ${errors.firstName ? 'is-invalid' : ''}`} placeholder="ชื่อ" maxLength={50} value={form.firstName} onChange={setClean('firstName', sanitizeName)} />
                </RegisterField>
              </div>
              <div className="col-6">
                <RegisterField label="นามสกุล" required error={errors.lastName}>
                  <input className={`form-control-aurora ${errors.lastName ? 'is-invalid' : ''}`} placeholder="นามสกุล" maxLength={50} value={form.lastName} onChange={setClean('lastName', sanitizeName)} />
                </RegisterField>
              </div>
            </div>
            <RegisterField label="อีเมล" required error={errors.email}>
              <input type="email" className={`form-control-aurora ${errors.email ? 'is-invalid' : ''}`} placeholder="กรุณากรอกอีเมล" maxLength={50} value={form.email} onChange={setClean('email', sanitizeEmail)} />
            </RegisterField>
            <RegisterField label="เบอร์โทรศัพท์" required error={errors.phone}>
              <input className={`form-control-aurora ${errors.phone ? 'is-invalid' : ''}`} placeholder="กรุณากรอกเบอร์โทรศัพท์" inputMode="numeric" maxLength={10} value={form.phone} onChange={setClean('phone', sanitizePhone)} />
            </RegisterField>
            <div className="row g-3">
              <div className="col-6">
                <RegisterField label="รหัสผ่าน" required error={errors.password}>
                  <input type="password" className={`form-control-aurora ${errors.password ? 'is-invalid' : ''}`} placeholder="อย่างน้อย 6 ตัว" maxLength={100} value={form.password} onChange={set('password')} />
                </RegisterField>
              </div>
              <div className="col-6">
                <RegisterField label="ยืนยันรหัสผ่าน" required error={errors.confirm}>
                  <input type="password" className={`form-control-aurora ${errors.confirm ? 'is-invalid' : ''}`} placeholder="••••••" value={form.confirm} onChange={set('confirm')} />
                </RegisterField>
              </div>
            </div>
            <button type="submit" className="btn-aurora-primary mt-2" disabled={loading}>
              {loading ? <><span className="spinner-border spinner-border-sm me-2"></span>กำลังส่ง OTP...</> : 'ดำเนินการต่อ'}
            </button>
          </form>
          <div className="text-center mt-3" style={{ fontSize: 13, color: 'var(--text-light)' }}>
            มีบัญชีแล้ว?{' '}
            <button style={{ background: 'none', border: 'none', color: 'var(--sage-dark)', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => { setShowRegister(false); setShowLogin(true); }}>
              เข้าสู่ระบบ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}