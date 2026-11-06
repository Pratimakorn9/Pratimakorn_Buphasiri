// ==========================================
// pages/admin/AdminStaff.jsx
// หน้าจัดการพนักงาน (ใช้หน้าสมาชิกร่วมกัน)
// ==========================================
import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getStatusBadge, formatPrice } from '../../components/Helpers';
import { API, apiFetch, Popup, AdminSidebar, BookingDetailModal, RoomForm } from './components/_shared';
import { AdminMembers } from './AdminMembers';

export function AdminStaff() { return <AdminMembers />; }
