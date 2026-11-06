// ==========================================
// pages/admin/AdminReports.jsx
// รายงานสรุปผลประกอบการ (ปรับปรุงโหมด วัน/เดือน/ปี)
// ==========================================
import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatPrice } from '../../components/Helpers';
import { apiFetch, AdminSidebar } from './components/_shared';
import DateInput from '../../components/DateInput'; // อิมพอร์ต Custom DateInput

export function AdminReports() {
  const { bookings, refreshBookings } = useApp();
  useEffect(() => { refreshBookings(); }, [refreshBookings]);
  const [reportData, setReportData] = useState({ monthly: [], statusCounts: [], roomStats: [] });
  
  // โหมดการมองเห็น: 'daily' (สัปดาห์), 'monthly' (รายวันในเดือน), 'yearly' (12 เดือนในปี)
  const [viewType, setViewType] = useState('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const monthsFull = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const daysOfWeekTh = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];
  const now = new Date();
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  // ดึงข้อมูลตามปีที่เลือก
  useEffect(() => {
    apiFetch(`/admin/reports?year=${selectedYear}`).then(d => { if (d.success) setReportData(d.data); }).catch(() => {});
  }, [selectedYear]);

  // สกิลกรองรายการการจองเฉพาะช่วงเวลา/ปี เพื่อสรุปการ์ดด้านบน
  const yearBookings = bookings.filter(b => {
    const dateStr = b.checkIn || b.createdAt || b.booking_datetime;
    if (!dateStr) return false;
    return new Date(dateStr).getFullYear() === selectedYear;
  });

  const totalYearBookings = yearBookings.length;
  const pendingCount = yearBookings.filter(b => ['PENDING_PAYMENT','PAYMENT_REVIEW','CONFIRMED','CHECKED_IN'].includes(b.status)).length;
  const cancelledCount = yearBookings.filter(b => b.status?.startsWith('CANCELLED')).length;

  // 1. คำนวณข้อมูลสำหรับโหมด "วัน" (แสดง 7 วันในสัปดาห์ของวันที่เลือก)
  const getWeeklyData = () => {
    const target = new Date(selectedDate);
    const dayOfWeek = target.getDay(); // 0 = Sun, 1 = Mon ...
    // หา จันทร์ ของสัปดาห์
    const distanceToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(target);
    monday.setDate(target.getDate() + distanceToMon);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = d.getMonth();
      const dateNum = d.getDate();

      const inDay = bookings.filter(b => {
        if (!b.checkIn) return false;
        const bd = new Date(b.checkIn);
        return bd.getDate() === dateNum && bd.getMonth() === m && bd.getFullYear() === y && ['CONFIRMED','COMPLETED','CHECKED_IN','CHECKED_OUT'].includes(b.status);
      });

      const isSelected = d.toISOString().split('T')[0] === selectedDate;

      return {
        label: `${daysOfWeekTh[d.getDay()]} ${dateNum}`,
        fullDate: d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
        count: inDay.length,
        revenue: inDay.reduce((s, b) => s + (b.totalAmount || 0), 0),
        isSelected
      };
    });
  };

  // 2. คำนวณข้อมูลสำหรับโหมด "เดือน" (แสดงทั้งเดือนของเดือนนั้นๆ)
  const getMonthlyDailyData = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const inDay = bookings.filter(b => {
        if (!b.checkIn) return false;
        const bd = new Date(b.checkIn);
        return bd.getDate() === day && bd.getMonth() === selectedMonth && bd.getFullYear() === selectedYear && ['CONFIRMED','COMPLETED','CHECKED_IN','CHECKED_OUT'].includes(b.status);
      });
      return {
        label: `${day}`,
        count: inDay.length,
        revenue: inDay.reduce((s, b) => s + (b.totalAmount || 0), 0)
      };
    });
  };

  // 3. คำนวณข้อมูลสำหรับโหมด "ปี" (แสดงทั้ง 12 เดือน)
  const getYearlyData = () => {
    return Array.from({ length: 12 }, (_, i) => {
      const found = reportData.monthly.find(m => m.month === i + 1);
      return {
        label: months[i],
        labelFull: monthsFull[i],
        count: found?.count || 0,
        revenue: found?.revenue || 0
      };
    });
  };

  const weeklyData = getWeeklyData();
  const monthlyDailyData = getMonthlyDailyData();
  const yearlyData = getYearlyData();

  // กำหนดข้อมูลที่จะเอามาแสดงในกราฟ
  let displayData = yearlyData;
  let chartTitle = `กราฟรายได้รายเดือน ปี ${selectedYear + 543}`;

  if (viewType === 'daily') {
    displayData = weeklyData;
    const dateObj = new Date(selectedDate);
    chartTitle = `กราฟรายได้รายสัปดาห์ (ประจำวันที่ ${dateObj.getDate()} ${monthsFull[dateObj.getMonth()]} ${dateObj.getFullYear() + 543})`;
  } else if (viewType === 'monthly') {
    displayData = monthlyDailyData;
    chartTitle = `กราฟรายได้รายวัน ประจำเดือน ${monthsFull[selectedMonth]} ปี ${selectedYear + 543}`;
  }

  const maxRevenue = Math.max(...displayData.map(m => m.revenue), 1);
  const totalRevenue = reportData.monthly.reduce((s, m) => s + Number(m.revenue || 0), 0);

  const statusSummary = [
    { label: 'รอชำระเงิน', status: 'PENDING_PAYMENT', color: '#E65100', bg: '#FFF3E0', icon: 'bi-hourglass' },
    { label: 'รอตรวจสอบสลิป', status: 'PAYMENT_REVIEW', color: '#1565C0', bg: '#E3F2FD', icon: 'bi-receipt' },
    { label: 'ยืนยันแล้ว', status: 'CONFIRMED', color: '#2E7D32', bg: '#E8F5E9', icon: 'bi-check-circle' },
    { label: 'เช็คอินแล้ว', status: 'CHECKED_IN', color: '#006064', bg: '#E0F7FA', icon: 'bi-box-arrow-in-right' },
    { label: 'เสร็จสมบูรณ์', status: 'COMPLETED', color: '#4527A0', bg: '#EDE7F6', icon: 'bi-award' },
    { label: 'ยกเลิกโดยผู้เข้าพัก', status: 'CANCELLED_USER', color: '#B71C1C', bg: '#FFEBEE', icon: 'bi-person-x' },
    { label: 'ยกเลิกการจองโดยระบบ', status: 'CANCELLED_SYSTEM', color: '#BF360C', bg: '#FBE9E7', icon: 'bi-robot' },
    { label: 'ยกเลิกโดยโรงแรม', status: 'CANCELLED_ADMIN', color: '#880E4F', bg: '#FCE4EC', icon: 'bi-building-x' },
  ];

  return (
    <div className="dashboard-page">
      <AdminSidebar />
      <div className="dashboard-right">
        <div className="dash-top-bar d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h4 style={{ fontFamily: 'Playfair Display', margin: 0 }}>รายงานสรุป</h4>
          
          <div className="d-flex gap-2 flex-wrap align-items-center">
            {/* 1. ปุ่มเลือกปฏิทิน (แสดงเมื่ออยู่ในโหมด 'วัน') - ใช้ Custom DateInput */}
            {viewType === 'daily' && (
              <div style={{ width: 150 }}>
                <DateInput
                  value={selectedDate}
                  onChange={e => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                      const d = new Date(e.target.value);
                      setSelectedYear(d.getFullYear());
                      setSelectedMonth(d.getMonth());
                    }
                  }}
                />
              </div>
            )}

            {/* 2. Dropdown เลือกเดือน (แสดงเมื่ออยู่ในโหมด 'เดือน') */}
            {viewType === 'monthly' && (
              <select 
                className="form-select form-select-sm" 
                style={{ width: 140, borderRadius: 8 }} 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(parseInt(e.target.value))}
              >
                {monthsFull.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            )}

            {/* 3. Dropdown เลือกปี (แสดงเสมอ) */}
            <select 
              className="form-select form-select-sm" 
              style={{ width: 110, borderRadius: 8 }} 
              value={selectedYear} 
              onChange={e => setSelectedYear(parseInt(e.target.value))}
            >
              {years.map(y => <option key={y} value={y}>{y + 543}</option>)}
            </select>

            {/* แท็บเปลี่ยนโหมด วัน / เดือน / ปี */}
            <div className="aurora-tabs" style={{ marginBottom: 0, padding: 3 }}>
              {[
                { v: 'daily', l: 'วัน' },
                { v: 'monthly', l: 'เดือน' },
                { v: 'yearly', l: 'ปี' }
              ].map(t => (
                <button 
                  key={t.v} 
                  className={`aurora-tab ${viewType === t.v ? 'active' : ''}`} 
                  style={{ padding: '5px 14px', fontSize: 12 }} 
                  onClick={() => setViewType(t.v)}
                >
                  {t.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* การ์ดสรุปสถิติทั่วไป */}
        <div className="row g-3 mb-4">
          {[
            { label: 'การจองทั้งหมด', val: totalYearBookings, icon: 'bi-calendar3', color: '#4A9EFF' },
            { label: 'กำลังดำเนินการ', val: pendingCount, icon: 'bi-arrow-repeat', color: '#FF9F43' },
            { label: 'ยกเลิกทั้งหมด', val: cancelledCount, icon: 'bi-x-circle', color: '#EA5455' },
            { label: 'รายได้รวม', val: `฿${formatPrice(totalRevenue)}`, icon: 'bi-currency-exchange', color: 'var(--warm)' },
          ].map((s, i) => (
            <div key={i} className="col-6 col-xl-3">
              <div className="stat-card text-center">
                <i className={s.icon} style={{ fontSize: 22, color: s.color, marginBottom: 8, display: 'block' }}></i>
                <div className="stat-number" style={{ fontSize: '1.7rem' }}>{s.val}</div>
                <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* สรุปตามสถานะการจอง */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
          <h6 style={{ fontWeight: 700, marginBottom: 16 }}>สรุปตามสถานะการจอง</h6>
          <div className="row g-2">
            {statusSummary.map(({ label, status, color, bg, icon }) => {
              const cnt = yearBookings.filter(b => b.status === status).length;
              return (
                <div key={status} className="col-md-6 col-xl-3">
                  <div style={{ background: bg, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={icon} style={{ color, fontSize: 18 }}></i>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontFamily: 'Playfair Display', fontSize: 22, fontWeight: 700, color }}>{cnt}</span>
                        <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)' }}>รายการ</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* กราฟสรุปผลตามโหมดที่เลือก */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h6 style={{ fontWeight: 700, margin: 0 }}>{chartTitle}</h6>
          </div>
          <div className="d-flex align-items-end gap-2" style={{ height: 240, overflowX: 'auto', paddingTop: 30, paddingBottom: 10 }}>
            {displayData.map((m, i) => (
              <div 
                key={i} 
                style={{ 
                  flex: '1 0 45px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end',
                  height: '100%',
                  minWidth: 45 
                }}
              >
                {/* ตัวเลขจำนวนเงินด้านบนแท่งกราฟ */}
                <div style={{ 
                  fontSize: 11, 
                  fontWeight: 700, 
                  color: m.revenue > 0 ? 'var(--warm-dark, #d97706)' : '#a1a1aa', 
                  whiteSpace: 'nowrap',
                  marginBottom: 6,
                  textAlign: 'center'
                }}>
                  {m.revenue > 0 ? `฿${formatPrice(m.revenue)}` : '-'}
                </div>

                {/* แท่งกราฟ */}
                <div 
                  title={`${m.label}: ฿${formatPrice(m.revenue)} (${m.count} การจอง)`}
                  style={{ 
                    width: '75%', 
                    height: m.revenue > 0 ? `${Math.max((m.revenue / maxRevenue) * 130, 8)}px` : '4px', 
                    background: m.isSelected 
                      ? 'linear-gradient(180deg, #FF9F43, #E65100)' 
                      : m.revenue > 0 
                        ? 'linear-gradient(180deg, var(--sage-light, #a3b18a), var(--sage, #588157))' 
                        : '#e0e0e0', 
                    borderRadius: '6px 6px 0 0', 
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                ></div>

                {/* ชื่อเดือน / วัน */}
                <div style={{ 
                  fontSize: 11, 
                  color: m.isSelected ? '#E65100' : 'var(--text-dark, #333)', 
                  fontWeight: m.isSelected || m.revenue > 0 ? 700 : 500,
                  marginTop: 8
                }}>
                  {m.label}
                </div>

                {/* จำนวนการจองด้านล่าง */}
                <div style={{ 
                  fontSize: 10, 
                  color: m.count > 0 ? '#2e7d32' : 'var(--text-light, #888)',
                  fontWeight: m.count > 0 ? 600 : 400,
                  marginTop: 2
                }}>
                  {m.count > 0 ? `${m.count} จอง` : '-'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* สถิติประเภทห้องพัก */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
          <h6 style={{ fontWeight: 700, marginBottom: 16 }}>สถิติการจองตามประเภทห้อง</h6>
          <div className="aurora-table">
            <table className="table mb-0">
              <thead><tr><th>ประเภทห้อง</th><th>จำนวนการจอง</th><th>รายได้</th></tr></thead>
              <tbody>
                {reportData.roomStats.map((r, i) => (
                  <tr key={i}><td style={{ fontWeight: 600 }}>{r.roomtype_name}</td><td>{r.booking_count} ครั้ง</td><td style={{ fontWeight: 700, color: 'var(--warm-dark)' }}>฿{formatPrice(r.revenue)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* รายละเอียดรายเดือน */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 22, boxShadow: 'var(--shadow-sm)' }}>
          <h6 style={{ fontWeight: 700, marginBottom: 14 }}>รายละเอียดรายเดือน ปี {selectedYear + 543}</h6>
          <div className="aurora-table">
            <table className="table mb-0">
              <thead><tr><th>เดือน</th><th>การจอง</th><th>รายได้</th><th>เฉลี่ย/จอง</th></tr></thead>
              <tbody>
                {yearlyData.map((m, i) => (
                  <tr key={i} style={{ fontWeight: i === now.getMonth() && selectedYear === now.getFullYear() ? 700 : 400 }}>
                    <td>{m.labelFull} {selectedYear + 543}</td><td>{m.count} ครั้ง</td>
                    <td style={{ fontWeight: 700, color: m.revenue > 0 ? 'var(--warm-dark)' : 'var(--text-light)' }}>฿{m.revenue.toLocaleString()}</td>
                    <td>{m.count > 0 ? `฿${Math.round(m.revenue / m.count).toLocaleString()}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}