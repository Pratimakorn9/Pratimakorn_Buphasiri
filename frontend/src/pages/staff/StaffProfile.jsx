// ==========================================
// pages/staff/StaffProfile.jsx
// หน้าข้อมูลโปรไฟล์พนักงาน
// ==========================================
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getStatusBadge, formatPrice } from '../../components/Helpers';
import { API, apiFetch, Popup, StaffSidebar, BookingDetailModal, QR_PAYMENT_IMG } from './components/_shared';

// Staff Profile (info only)
export function StaffProfile() {
  const { currentUser } = useApp();
  return (
    <div className="dashboard-page">
      <StaffSidebar />
      <div className="dashboard-right">
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 32, boxShadow: 'var(--shadow-sm)', maxWidth: 420 }}>
          <h5 style={{ fontFamily: 'Playfair Display', marginBottom: 24 }}>ข้อมูลพนักงาน</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'ชื่อ-นามสกุล', val: `${currentUser?.prefix || ''} ${currentUser?.firstName} ${currentUser?.lastName}` },
              { label: 'อีเมล', val: currentUser?.email },
              { label: 'ตำแหน่ง', val: 'พนักงานต้อนรับ' },
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
