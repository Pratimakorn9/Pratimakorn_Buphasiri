// ==========================================
// pages/staff/StaffReceipt.jsx
// ออกใบเสร็จรับเงินให้สมาชิก
// ==========================================
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getStatusBadge, formatPrice, formatDate, formatDateTime } from '../../components/Helpers';
import { API, apiFetch, Popup, StaffSidebar, BookingDetailModal, QR_PAYMENT_IMG } from './components/_shared';

// ===== STAFF RECEIPT =====
// หน้าออกใบเสร็จให้สมาชิก — พนักงานค้นหาการจองแล้วพิมพ์ใบเสร็จ
export function StaffReceipt() {
  const { bookings, users, refreshBookings } = useApp();
  // โหลดรายการจองล่าสุดทุกครั้งที่เปิดหน้านี้
  useEffect(() => { refreshBookings(); }, [refreshBookings]);
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);

  const paidBookings = bookings.filter(b =>
    ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED', 'PAYMENT_REVIEW'].includes(b.status)
  );

  const filtered = paidBookings.filter(b => {
    if (!search) return true;
    const s = search.toLowerCase();
    return String(b.id).toLowerCase().includes(s) ||
      (b.contactName || b.userName || '').toLowerCase().includes(s) ||
      (b.contactPhone || '').includes(s) ||
      (b.contactEmail || b.userEmail || '').toLowerCase().includes(s);
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="dashboard-page">
      <StaffSidebar />
      <div className="dashboard-right">
        <div className="dash-top-bar">
          <h4 style={{ fontFamily: 'Playfair Display', margin: 0 }}>ออกใบเสร็จ</h4>
        </div>

        {!selectedBooking ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <input
                className="form-control"
                placeholder="🔍 ค้นหาด้วย รหัสการจอง, ชื่อลูกค้า, เบอร์โทร หรืออีเมล..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ maxWidth: 480, borderRadius: 10, fontSize: 14 }}
              />
            </div>
            <div className="aurora-table">
              <table className="table table-hover mb-0">
                <thead>
                  <tr><th>รหัส</th><th>ผู้จอง</th><th>ห้อง</th><th>เช็คอิน</th><th>เช็คเอาต์</th><th>ยอด</th><th>สถานะ</th><th></th></tr>
                </thead>
                <tbody>
                  {filtered.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{b.id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.contactName || b.userName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{b.contactPhone || b.contactEmail || b.userEmail || '-'}</div>
                      </td>
                      <td>
                        <div>{b.roomName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{b.rooms || 1} ห้อง · จองเมื่อ {formatDateTime(b.createdAt)}</div>
                      </td>
                      <td>{formatDate(b.checkIn)}</td>
                      <td>{formatDate(b.checkOut)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--warm-dark)' }}>฿{formatPrice(b.totalAmount)}</td>
                      <td>{getStatusBadge(b.status)}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-gold"
                          style={{ borderRadius: 8, whiteSpace: 'nowrap', fontSize: 12 }}
                          onClick={() => setSelectedBooking(b)}
                        >
                          <i className="bi bi-receipt me-1"></i>ออกใบเสร็จ
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-4 text-muted">ไม่พบข้อมูล</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div>
            <div className="d-flex gap-2 mb-4 no-print">
              <button className="btn btn-outline-secondary btn-sm" style={{ borderRadius: 8 }} onClick={() => setSelectedBooking(null)}>
                <i className="bi bi-arrow-left me-1"></i>กลับ
              </button>
              <button className="btn btn-gold btn-sm" style={{ borderRadius: 8 }} onClick={handlePrint}>
                <i className="bi bi-printer me-1"></i>พิมพ์ใบเสร็จ
              </button>
            </div>

            {/* ใบเสร็จ */}
            <div id="receipt-area" style={{
              background: 'white',
              maxWidth: 620,
              margin: '0 auto',
              padding: '40px 48px',
              borderRadius: 16,
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--ivory-dark)',
              fontFamily: 'inherit',
            }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 28, borderBottom: '2px solid var(--navy)', paddingBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>Aurora Grand Hotel</div>
                <div style={{ fontFamily: 'Playfair Display', fontSize: 26, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>ใบเสร็จรับเงิน</div>
                <div style={{ fontFamily: 'Playfair Display', fontSize: 13, color: 'var(--text-light)' }}>Official Receipt</div>
              </div>

              {/* Receipt meta */}
              <div className="d-flex justify-content-between align-items-start mb-4">
                <div style={{ fontSize: 13 }}>
                  <div style={{ marginBottom: 4 }}><span style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>เลขที่ใบเสร็จ</span></div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15 }}>#{selectedBooking.id}</div>
                </div>
                <div style={{ fontSize: 13, textAlign: 'right' }}>
                  <div style={{ marginBottom: 4 }}><span style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>วันที่ออกใบเสร็จ</span></div>
                  <div style={{ fontWeight: 600 }}>{formatDate(new Date())}</div>
                </div>
              </div>

              {/* Customer info */}
              <div style={{ background: 'var(--ivory)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: 8 }}>ข้อมูลผู้เข้าพัก</div>
                <div className="row g-2" style={{ fontSize: 14 }}>
                  <div className="col-6">
                    <div style={{ color: 'var(--text-light)', fontSize: 11, marginBottom: 2 }}>ชื่อ-นามสกุล</div>
                    <div style={{ fontWeight: 700 }}>{selectedBooking.contactName || selectedBooking.userName}</div>
                  </div>
                  <div className="col-6">
                    <div style={{ color: 'var(--text-light)', fontSize: 11, marginBottom: 2 }}>เบอร์โทร</div>
                    <div style={{ fontWeight: 600 }}>{selectedBooking.contactPhone || '-'}</div>
                  </div>
                  {(selectedBooking.contactEmail || selectedBooking.userEmail) && (
                    <div className="col-12">
                      <div style={{ color: 'var(--text-light)', fontSize: 11, marginBottom: 2 }}>อีเมล</div>
                      <div style={{ fontWeight: 600 }}>{selectedBooking.contactEmail || selectedBooking.userEmail}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking details table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'var(--navy)', color: 'white' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderRadius: '8px 0 0 0', fontSize: 12 }}>รายการ</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, fontSize: 12 }}>จำนวนคืน</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, borderRadius: '0 8px 0 0', fontSize: 12 }}>ราคา</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--ivory-dark)' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700 }}>{selectedBooking.roomName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>
                        เช็คอิน: {formatDate(selectedBooking.checkIn)} | เช็คเอาต์: {formatDate(selectedBooking.checkOut)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                        ผู้เข้าพัก: ผู้ใหญ่ {selectedBooking.adults} คน{selectedBooking.children > 0 ? ` เด็ก ${selectedBooking.children} คน` : ''}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                        จำนวนห้อง: {selectedBooking.rooms || 1} ห้อง{selectedBooking.roomNumbers ? ` (เลขห้อง ${selectedBooking.roomNumbers})` : ''} | จองเมื่อ: {formatDateTime(selectedBooking.createdAt)}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>{selectedBooking.nights} คืน</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>
                      ฿{formatPrice(selectedBooking.roomPrice || Math.round(selectedBooking.totalAmount / (selectedBooking.nights || 1)))} × {selectedBooking.nights}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Total */}
              <div style={{ borderTop: '2px solid var(--navy)', paddingTop: 16, marginBottom: 24 }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>ยอดรวมทั้งสิ้น</div>
                    <div style={{ fontSize: 12, color: 'var(--text-light)' }}>Total Amount</div>
                  </div>
                  <div style={{ fontFamily: 'Playfair Display', fontSize: 30, fontWeight: 700, color: 'var(--warm-dark)' }}>
                    ฿{formatPrice(selectedBooking.totalAmount)}
                  </div>
                </div>
                <div className="d-flex justify-content-between mt-2" style={{ fontSize: 13, color: 'var(--text-mid)' }}>
                  <span>สถานะการชำระ</span>
                  <span>{getStatusBadge(selectedBooking.status)}</span>
                </div>
              </div>

              {/* Special request */}
              {selectedBooking.specialRequest && (
                <div style={{ background: 'rgba(123,158,135,0.08)', border: '1px solid rgba(123,158,135,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--sage-dark)' }}><i className="bi bi-chat-left-text me-1"></i>คำขอพิเศษ</div>
                  <div>{selectedBooking.specialRequest}</div>
                </div>
              )}

              {/* Footer */}
              <div style={{ borderTop: '1px solid var(--ivory-dark)', paddingTop: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-light)' }}>
                <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>Aurora Grand Hotel</div>
                <div>123 ถนนสกลนคร-อุดรธานี, อำเภอเมือง, สกลนคร 47000</div>
                <div>โทร: 042-123-456 | อีเมล: info@auroragrandhotel.com</div>
                <div style={{ marginTop: 8, fontStyle: 'italic' }}>ขอบคุณที่ไว้วางใจ Aurora Grand Hotel</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}