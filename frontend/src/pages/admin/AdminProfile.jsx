// ==========================================
// pages/admin/AdminProfile.jsx
// หน้าข้อมูลโปรไฟล์ผู้ดูแลระบบ (Admin)
// ==========================================
import { useApp } from '../../context/AppContext';
import { AdminSidebar } from './components/_shared';

export function AdminProfile() {
  const { currentUser } = useApp();

  return (
    <div className="dashboard-page">
      <AdminSidebar />
      <div className="dashboard-right">
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 32, boxShadow: 'var(--shadow-sm)', maxWidth: 420 }}>
          <h5 style={{ fontFamily: 'Playfair Display', marginBottom: 24 }}>ข้อมูลผู้ดูแลระบบ</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'ชื่อ-นามสกุล', val: `${currentUser?.prefix || ''} ${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'ผู้ดูแลระบบ' },
              { label: 'อีเมล', val: currentUser?.email || '-' },
              { label: 'ตำแหน่ง', val: 'ผู้ดูแลระบบ (Administrator)' },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: 'var(--ivory)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}