import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext();
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const displayFirstName = (firstname) => {
  if (!firstname) return 'ผู้เข้าพัก';
  return firstname[0] + '*'.repeat(Math.max(2, firstname.length - 1));
};

// ตรวจว่า JWT ยังไม่หมดอายุ (decode payload ฝั่ง client เพื่อเช็ก exp เท่านั้น ไม่ได้ verify ลายเซ็น
// การ verify จริงยังทำที่ backend ทุก request) ถ้าหมดอายุแล้วจะไม่คืนสถานะล็อกอินให้
const isTokenValid = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return !payload.exp || payload.exp * 1000 > Date.now();
  } catch { return false; }
};

// FIX (login หายเมื่อเปิดแท็บใหม่): เดิมเก็บ currentUser ไว้ใน sessionStorage ซึ่งแยกกันทุกแท็บ
// จึงย้ายมาเก็บใน localStorage (ใช้ร่วมกันทุกแท็บของเว็บเดียวกัน) และเช็กว่า token ยังไม่หมดอายุ
const loadStoredUser = () => {
  try {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!token || !user || !isTokenValid(token)) {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      return null;
    }
    return user;
  } catch { return null; }
};

const apiFetch = async (path, options = {}) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'เกิดข้อผิดพลาด');
  }
  return data;
};

// แปลงแถวจาก API (booking) -> รูปแบบที่หน้าเว็บใช้ ใช้ร่วมกันทั้งสมาชิก/พนักงาน/แอดมิน
// ข้อมูลผู้ติดต่อ (ชื่อ/อีเมล/เบอร์) ใช้ค่าที่กรอกตอนจองก่อน ถ้าไม่มีค่อย fallback ไปโปรไฟล์สมาชิก
const mapBooking = (b) => {
  const memberName = `${b.prefix || ''} ${b.firstname || ''} ${b.lastname || ''}`.trim();
  return {
    id: b.booking_id,
    userId: b.member_id,
    roomName: b.roomtype_name || 'ห้องพัก',
    roomId: b.roomtype_id,
    checkIn: b.checkin_date ? String(b.checkin_date).slice(0, 10) : '',
    checkOut: b.checkout_date ? String(b.checkout_date).slice(0, 10) : '',
    nights: b.checkin_date && b.checkout_date
      ? Math.round((new Date(String(b.checkout_date).slice(0, 10)) - new Date(String(b.checkin_date).slice(0, 10))) / 86400000)
      : 1,
    totalAmount: b.price,
    status: b.status_name,
    specialRequest: b.special_request,
    slipUrl: b.slip_image,
    createdAt: b.booking_datetime,
    adults: b.adults ?? 1, children: b.children ?? 0, rooms: b.room_count || 1,
    contactName: b.contact_name || memberName,
    contactEmail: b.contact_email || b.member_email,
    contactPhone: b.contact_phone || b.member_phone,
    userName: memberName || b.contact_name || 'ลูกค้า Walk-in',
    userEmail: b.member_email,
    roomNumbers: b.room_numbers || '',
    actualCheckIn: b.actual_checkin || '',
    actualCheckOut: b.actual_checkout || '',
    reviewed: !!Number(b.has_review),
  };
};

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(loadStoredUser);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [news, setNews] = useState([]);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    apiFetch('/reviews').then(d => { if (d.success) setReviews(d.data.map(r => ({
      id: r.review_id,
      userId: r.member_id,
      userName: displayFirstName(r.firstname),
      roomType: r.roomtype_name || 'ห้องพัก',
      rating: r.rating,
      comment: r.comment,
      images: [r.image_url_1, r.image_url_2].filter(Boolean),
      date: r.created_at ? String(r.created_at).slice(0, 10) : '',
    }))); }).catch(() => {});

    apiFetch('/news').then(d => { if (d.success) setNews(d.data.map(n => ({
      id: n.news_id,
      title: n.title,
      content: n.detail,
      image: n.image_url,
      category: 'ทั่วไป',
      date: n.publish_date ? String(n.publish_date).slice(0, 10) : '',
      publishDate: n.publish_date ? String(n.publish_date).slice(0, 10) : '',
      endDate: n.end_date ? String(n.end_date).slice(0, 10) : '',
    }))); }).catch(() => {});
  }, []);

  // ล็อกเอาต์/ล็อกอินในแท็บหนึ่ง ให้อีกแท็บอัปเดตตามอัตโนมัติ (event 'storage' ยิงเฉพาะแท็บอื่น)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'token' || e.key === 'currentUser' || e.key === null) setCurrentUser(loadStoredUser());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const loadMemberBookings = useCallback(async (memberId) => {
    try {
      const d = await apiFetch(`/member/${memberId}/bookings`);
      if (d.success) {
        setBookings(d.data.map(mapBooking));
      }
    } catch {}
  }, []);

  const loadAllBookings = useCallback(async (role) => {
    const path = role === 'admin' ? '/admin/bookings' : '/staff/bookings';
    try {
      const d = await apiFetch(path);
      if (d.success) {
        setBookings(d.data.map(mapBooking));
      }
    } catch {}
  }, []);

  // โหลดรายการจองใหม่จากเซิร์ฟเวอร์ (หน้าที่แสดงรายการจองเรียกตอนเปิดหน้า เพื่อไม่ต้องกดรีเฟรชเอง)
  const refreshBookings = useCallback(() => {
    if (!currentUser) return Promise.resolve();
    return currentUser.role === 'member'
      ? loadMemberBookings(currentUser.id)
      : loadAllBookings(currentUser.role);
  }, [currentUser, loadMemberBookings, loadAllBookings]);

  useEffect(() => {
    if (!currentUser) { setBookings([]); return; }
    if (currentUser.role === 'member') loadMemberBookings(currentUser.id);
    else loadAllBookings(currentUser.role);
  }, [currentUser, loadMemberBookings, loadAllBookings]);

  const login = (userData) => {
    const formattedUser = {
      ...userData,
      firstName: userData.firstname || userData.firstName,
      lastName: userData.lastname || userData.lastName,
    };
    setCurrentUser(formattedUser);
    localStorage.setItem('currentUser', JSON.stringify(formattedUser));
    setShowLogin(false);
    return { success: true, role: formattedUser.role };
  };

  const logout = () => {
    setCurrentUser(null);
    setBookings([]);
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
  };

  const register = async (data) => {
    try {
      await apiFetch('/register', { method: 'POST', body: JSON.stringify({
        prefix: data.prefix, firstname: data.firstName, lastname: data.lastName,
        email: data.email, password: data.password, phone: data.phone,
      })});
      return { success: true };
    } catch (err) { return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }; }
  };

  const updateUser = async (id, updates) => {
    const payload = {
      prefix: updates.prefix,
      firstname: updates.firstName || updates.firstname,
      lastname: updates.lastName || updates.lastname,
      phone: updates.phone,
    };
    await apiFetch(`/member/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    const updated = { ...currentUser, ...updates, firstName: payload.firstname, lastName: payload.lastname };
    setCurrentUser(updated);
    localStorage.setItem('currentUser', JSON.stringify(updated));
  };

  const createBooking = async (bookingData) => {
    try {
      const d = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          member_id: currentUser.id,
          roomtype_id: bookingData.roomId,
          checkin_date: bookingData.checkIn,
          checkout_date: bookingData.checkOut,
          price: bookingData.totalAmount,
          special_request: bookingData.specialRequest,
          room_count: bookingData.rooms || 1,
          adults: bookingData.adults,
          children: bookingData.children,
          contact_name: bookingData.contactName,
          contact_email: bookingData.contactEmail,
          contact_phone: bookingData.contactPhone,
        }),
      });
      const newBooking = { id: d.booking_id, ...bookingData, status: 'PENDING_PAYMENT', userId: currentUser.id };
      setBookings(prev => [newBooking, ...prev]);
      return newBooking;
    } catch (err) {
      return null;
    }
  };

  const cancelBooking = async (id, reason = 'CANCELLED_USER') => {
    const endpoint = (currentUser?.role === 'staff' || currentUser?.role === 'admin')
      ? `/staff/bookings/${id}/cancel`
      : `/bookings/${id}/cancel`;
    // FIX: เดิมไม่ส่ง reason ไปให้ backend เลย ทำให้ backend เซ็ต status_id ตายตัวเสมอ (CANCELLED_USER/CANCELLED_ADMIN)
    // ไม่ว่าเหตุผลจริงจะเป็นอะไร (เช่น ตอนหมดเวลาชำระเงินเรียกมาพร้อม reason='CANCELLED_SYSTEM' แต่ไม่เคยถูกบันทึกจริง)
    await apiFetch(endpoint, { method: 'PUT', body: JSON.stringify({ reason }) });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: reason } : b));
  };

  const payBooking = async (id, slipUrl) => {
    await apiFetch(`/bookings/${id}/pay`, { method: 'POST', body: JSON.stringify({ slip_image: slipUrl }) });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'PAYMENT_REVIEW', slipUrl } : b));
  };

  const confirmPayment = async (id) => {
    await apiFetch(`/staff/bookings/${id}/confirm-payment`, { method: 'PUT' });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'CONFIRMED' } : b));
  };

  const confirmWalkInPayment = async (id) => {
    const data = await apiFetch(`/staff/bookings/${id}/confirm-payment-walkin`, { method: 'PUT' });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'CHECKED_IN' } : b));
    refreshBookings();
    return data;
  };

  // 🛠️️ [จุดที่แก้ไข]: ปรับปรุงให้รองรับ Partial Check-in (เลือก 1 ห้องขึ้นไปแต่ไม่เกินจำนวนที่จอง)
  const checkIn = async (id, { roomIds, checkinDatetime } = {}) => {
    const booking = bookings.find(b => b.id === id);
    const totalBooked = booking?.rooms || 1;
    const validRoomIds = Array.isArray(roomIds) ? roomIds.filter(Boolean) : [];

    if (validRoomIds.length === 0 || validRoomIds.length > totalBooked) {
      throw new Error(`กรุณาระบุเลขห้องอย่างน้อย 1 ห้อง (และไม่เกิน ${totalBooked} ห้อง)`);
    }

    await apiFetch(`/staff/bookings/${id}/checkin`, {
      method: 'PUT',
      body: JSON.stringify({
        firstname: booking?.contactName?.split(' ')[0] || 'ลูกค้า',
        lastname: booking?.contactName?.split(' ').slice(1).join(' ') || '-',
        room_ids: validRoomIds,
        checkin_datetime: checkinDatetime,
      }),
    });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'CHECKED_IN' } : b));
    refreshBookings(); // ดึงเลขห้องและเวลาเช็คอินจริงมาแสดง
  };

  const checkOut = async (id, { checkoutDatetime } = {}) => {
    await apiFetch(`/staff/bookings/${id}/checkout`, {
      method: 'PUT',
      body: JSON.stringify({ checkout_datetime: checkoutDatetime }),
    });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'CHECKED_OUT' } : b));
    refreshBookings(); // ดึงเวลาเช็คเอาต์จริงมาแสดง
  };

  const updateBooking = (id, updates) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const addReview = async (reviewData) => {
    const res = await apiFetch('/reviews', {
      method: 'POST',
      body: JSON.stringify({
        booking_id: reviewData.bookingId,
        member_id: currentUser.id,
        rating: reviewData.rating,
        comment: reviewData.comment,
        image_url_1: reviewData.images?.[0] || null,
        image_url_2: reviewData.images?.[1] || null,
      }),
    });
    const newReview = {
      id: res.review_id,
      userId: currentUser.id,
      userName: `${currentUser.firstName} ${currentUser.lastName}`,
      roomType: reviewData.roomType,
      rating: reviewData.rating,
      comment: reviewData.comment,
      images: reviewData.images || [],
      date: new Date().toISOString().split('T')[0],
    };
    setReviews(prev => [newReview, ...prev]);
    setBookings(prev => prev.map(b => b.id === reviewData.bookingId ? { ...b, reviewed: true } : b));
  };

  const updateReview = async (reviewId, reviewData) => {
    await apiFetch(`/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify({
        rating: reviewData.rating,
        comment: reviewData.comment,
        image_url_1: reviewData.images?.[0] || null,
        image_url_2: reviewData.images?.[1] || null,
      }),
    });
    setReviews(prev => prev.map(r => r.id === reviewId
      ? { ...r, rating: reviewData.rating, comment: reviewData.comment, images: reviewData.images || [] }
      : r));
  };

  const addNews = async (newsData) => {
    const d = await apiFetch('/admin/news', {
      method: 'POST',
      body: JSON.stringify({
        title: newsData.title,
        detail: newsData.content,
        image_url: newsData.image || null,
        publish_date: newsData.publishDate + ' 00:00:00',
        end_date: newsData.endDate ? newsData.endDate + ' 23:59:00' : null,
      }),
    });
    const newItem = {
      id: d.news_id || 'N' + Date.now(),
      title: newsData.title,
      content: newsData.content,
      image: newsData.image,
      category: newsData.category || 'ทั่วไป',
      date: newsData.publishDate,
      publishDate: newsData.publishDate,
      endDate: newsData.endDate || '',
    };
    setNews(prev => [newItem, ...prev]);
  };

  const deleteNews = async (id) => {
    await apiFetch(`/admin/news/${id}`, { method: 'DELETE' });
    setNews(prev => prev.filter(n => n.id !== id));
  };

  const updateNews = (id, updates) => setNews(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));

  const [users, setUsers] = useState([]);

  const loadUsers = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
      const [mRes, sRes] = await Promise.all([
        apiFetch('/admin/members'),
        apiFetch('/admin/staff'),
      ]);
      const members = mRes.success ? mRes.data.map(m => ({
        id: m.member_id, role: 'member',
        prefix: m.prefix, firstName: m.firstname, lastName: m.lastname,
        email: m.email, phone: m.phone,
        createdAt: m.created_at ? String(m.created_at).slice(0, 10) : '',
      })) : [];
      const staffList = sRes.success ? sRes.data.map(s => ({
        id: s.user_id, role: s.role,
        prefix: s.prefix, firstName: s.firstname, lastName: s.lastname,
        email: s.email, phone: s.phone, password: '••••••••',
        createdAt: s.created_at ? String(s.created_at).slice(0, 10) : '',
      })) : [];
      setUsers([...members, ...staffList]);
    } catch {}
  }, [currentUser]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const addStaff = async (data) => {
    try {
      const d = await apiFetch('/admin/staff', {
        method: 'POST',
        body: JSON.stringify({
          prefix: data.prefix, firstname: data.firstName, lastname: data.lastName,
          email: data.email, phone: data.phone, password: data.password, role: 'staff',
        }),
      });
      const newStaff = {
        id: d.user_id, role: 'staff',
        prefix: data.prefix, firstName: data.firstName, lastName: data.lastName,
        email: data.email, phone: data.phone, password: '••••••••',
        createdAt: new Date().toISOString().split('T')[0],
      };
      setUsers(prev => [...prev, newStaff]);
      return { success: true };
    } catch (err) { return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }; }
  };

  const deleteUser = async (id) => {
    await apiFetch(`/admin/staff/${id}`, { method: 'DELETE' });
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const getUserBookings = (userId) => bookings.filter(b => b.userId === userId);

  return (
    <AppContext.Provider value={{
      currentUser, users, bookings, reviews, news,
      showLogin, setShowLogin, showRegister, setShowRegister,
      login, logout, register, updateUser,
      createBooking, updateBooking, cancelBooking, payBooking, confirmPayment, confirmWalkInPayment,
      checkIn, checkOut,
      addReview, updateReview, addNews, updateNews, deleteNews,
      getUserBookings, addStaff, deleteUser,
      refreshBookings, loadMemberBookings,
    }}>
      {children}
    </AppContext.Provider>
  );
}