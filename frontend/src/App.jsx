import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { LoginModal, RegisterModal } from './components/AuthModals';
import HomePage from './pages/home';
import { RoomsPage, RoomDetailPage } from './pages/rooms';
import { BookingPage, PaymentPage } from './pages/booking';
import { MemberProfile, MemberBookings, MemberReviews } from './pages/member';
import {
  StaffDashboard, StaffBookings, StaffCheckIn, StaffPayments, StaffReports, StaffProfile, StaffNewBooking, StaffReceipt,
} from './pages/staff';
import {
  AdminDashboard, AdminRooms, AdminBookings, AdminMembers, AdminStaff, AdminNews, AdminReports, // ลบ AdminProfile ออกจากตรงนี้
} from './pages/admin';
import { NewsPage, ReviewsPage } from './pages/other';

function RequireRole({ roles, children }) {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/" replace />;
  if (!roles.includes(currentUser.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { showLogin, showRegister } = useApp();
  const location = useLocation();
  const hideFooter = ['/staff', '/admin', '/member'].some(p => location.pathname.startsWith(p));
  const hideNavbar = ['/staff', '/admin'].some(p => location.pathname.startsWith(p));

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/rooms/:roomId" element={<RoomDetailPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />

        <Route path="/booking/:roomId" element={<RequireRole roles={['member']}><BookingPage /></RequireRole>} />
        <Route path="/payment/:bookingId" element={<RequireRole roles={['member']}><PaymentPage /></RequireRole>} />

        <Route path="/member" element={<Navigate to="/member/profile" replace />} />
        <Route path="/member/profile" element={<RequireRole roles={['member']}><MemberProfile /></RequireRole>} />
        <Route path="/member/bookings" element={<RequireRole roles={['member']}><MemberBookings /></RequireRole>} />
        <Route path="/member/reviews" element={<RequireRole roles={['member']}><MemberReviews /></RequireRole>} />

        <Route path="/staff" element={<RequireRole roles={['staff']}><StaffDashboard /></RequireRole>} />
        <Route path="/staff/bookings" element={<RequireRole roles={['staff']}><StaffBookings /></RequireRole>} />
        <Route path="/staff/checkin" element={<RequireRole roles={['staff']}><StaffCheckIn /></RequireRole>} />
        <Route path="/staff/payments" element={<RequireRole roles={['staff']}><StaffPayments /></RequireRole>} />
        <Route path="/staff/new-booking" element={<RequireRole roles={['staff']}><StaffNewBooking /></RequireRole>} />
        <Route path="/staff/receipt" element={<RequireRole roles={['staff']}><StaffReceipt /></RequireRole>} />
        <Route path="/staff/reports" element={<RequireRole roles={['staff']}><StaffReports /></RequireRole>} />
        <Route path="/staff/profile" element={<RequireRole roles={['staff']}><StaffProfile /></RequireRole>} />

        <Route path="/admin" element={<RequireRole roles={['admin']}><AdminDashboard /></RequireRole>} />
        <Route path="/admin/rooms" element={<RequireRole roles={['admin']}><AdminRooms /></RequireRole>} />
        <Route path="/admin/bookings" element={<RequireRole roles={['admin']}><AdminBookings /></RequireRole>} />
        <Route path="/admin/members" element={<RequireRole roles={['admin']}><AdminMembers /></RequireRole>} />
        <Route path="/admin/staff" element={<RequireRole roles={['admin']}><AdminStaff /></RequireRole>} />
        <Route path="/admin/news" element={<RequireRole roles={['admin']}><AdminNews /></RequireRole>} />
        <Route path="/admin/reports" element={<RequireRole roles={['admin']}><AdminReports /></RequireRole>} />
        {/* ลบ Route /admin/profile ออกแล้ว */}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideFooter && <Footer />}
      {showLogin && <LoginModal />}
      {showRegister && <RegisterModal />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}