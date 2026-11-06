// ==========================================
// pages/staff/StaffReports.jsx
// รายงานสรุปพนักงาน (ปรับส่วน Filter Control เท่าเทียม Admin เป๊ะๆ)
// ==========================================
import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatPrice } from '../../components/Helpers';
import { StaffSidebar } from './components/_shared';
import DateInput from '../../components/DateInput';

export function StaffReports() {
  const { bookings } = useApp();
  
  // viewType: 'daily' (วัน) | 'monthly' (เดือน) | 'yearly' (ปี)
  const [viewType, setViewType] = useState('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const monthsFull = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const daysOfWeekTh = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];
  const now = new Date();
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  // 1. คำนวณโหมด "วัน" (แสดง 7 วันในสัปดาห์ของวันที่เลือก)
  const getWeeklyData = () => {
    const target = new Date(selectedDate);
    const dayOfWeek = target.getDay();
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

      return {
        label: `${daysOfWeekTh[d.getDay()]} ${dateNum}`,
        count: inDay.length,
        revenue: inDay.reduce((s, b) => s + (b.totalAmount || 0), 0),
        isSelected: d.toISOString().split('T')[0] === selectedDate
      };
    });
  };

  // 2. คำนวณโหมด "เดือน" (แสดงทั้งเดือนของเดือนที่เลือก)
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

  // 3. คำนวณโหมด "ปี" (แสดงทั้ง 12 เดือน)
  const getYearlyData = () => {
    return Array.from({ length: 12 }, (_, i) => {
      const inMonth = bookings.filter(b => {
        if (!b.checkIn) return false;
        const bd = new Date(b.checkIn);
        return bd.getMonth() === i && bd.getFullYear() === selectedYear && ['CONFIRMED','COMPLETED','CHECKED_IN','CHECKED_OUT'].includes(b.status);
      });
      return {
        label: months[i],
        labelFull: monthsFull[i],
        count: inMonth.length,
        revenue: inMonth.reduce((s, b) => s + (b.totalAmount || 0), 0)
      };
    });
  };

  const weeklyData = getWeeklyData();
  const monthlyDailyData = getMonthlyDailyData();
  const yearlyData = getYearlyData();

  let displayData = yearlyData;
  let chartTitle = `รายได้ รายเดือน ปี ${selectedYear + 543}`;

  if (viewType === 'daily') {
    displayData = weeklyData;
    const dateObj = new Date(selectedDate);
    chartTitle = `รายได้รายสัปดาห์ — ประจำวันที่ ${dateObj.getDate()} ${monthsFull[dateObj.getMonth()]} ${dateObj.getFullYear() + 543}`;
  } else if (viewType === 'monthly') {
    displayData = monthlyDailyData;
    chartTitle = `รายได้รายวัน — ${monthsFull[selectedMonth]} ${selectedYear + 543}`;
  }

  const maxRevenue = Math.max(...displayData.map(m => m.revenue), 1);

  return (
    <div className="dashboard-page">
      <StaffSidebar />
      <div className="dashboard-right">
        
        {/* ================= BAR ด้านบน (เหมือนแอดมิน) ================= */}
        <div className="dash-top-bar d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h4 style={{ fontFamily: 'Playfair Display', margin: 0 }}>รายงานสรุป</h4>
          
          <div className="d-flex gap-2 flex-wrap align-items-center">
            
            {/* 1. เมื่อเลือกแท็บ 'วัน' -> แสดง DateInput */}
            {viewType === 'daily' && (
              <div style={{ width: 140 }}>
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

            {/* 2. เมื่อเลือกแท็บ 'เดือน' -> แสดง Dropdown เดือน (ตรงกับรูปภาพ) */}
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

            {/* 3. Dropdown ปี (แสดงเสมอ) */}
            <select 
              className="form-select form-select-sm" 
              style={{ width: 100, borderRadius: 8 }} 
              value={selectedYear} 
              onChange={e => setSelectedYear(parseInt(e.target.value))}
            >
              {years.map(y => <option key={y} value={y}>{y + 543}</option>)}
            </select>

            {/* 4. แท็บสลับ วัน / เดือน / ปี (เหมือนในรูปแอดมิน) */}
            <div className="aurora-tabs" style={{ marginBottom: 0, padding: 3, display: 'flex', gap: 2 }}>
              {[
                { v: 'daily', l: 'วัน' },
                { v: 'monthly', l: 'เดือน' },
                { v: 'yearly', l: 'ปี' }
              ].map(t => (
                <button 
                  key={t.v} 
                  className={`aurora-tab ${viewType === t.v ? 'active' : ''}`} 
                  style={{ padding: '5px 16px', fontSize: 13, whiteSpace: 'nowrap' }} 
                  onClick={() => setViewType(t.v)}
                >
                  {t.l}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* ================= CHART ================= */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
          <h6 style={{ fontWeight: 700, marginBottom: 4 }}>{chartTitle}</h6>
          <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 20 }}>
            {displayData.reduce((s, m) => s + m.count, 0)} การจอง · รายได้ ฿{formatPrice(displayData.reduce((s, m) => s + m.revenue, 0))}
          </p>

          <div className="d-flex align-items-end gap-1" style={{ height: 220, overflowX: 'auto', paddingTop: 25, paddingBottom: 8 }}>
            {displayData.map((m, i) => (
              <div 
                key={i} 
                style={{ 
                  flex: `1 0 ${viewType === 'monthly' ? '22px' : '55px'}`, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end',
                  height: '100%',
                  minWidth: viewType === 'monthly' ? 22 : 55 
                }}
              >
                {/* ยอดเงินบนกราฟ */}
                <div style={{ 
                  fontSize: 10, 
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
                    height: m.revenue > 0 ? `${Math.max((m.revenue / maxRevenue) * 120, 6)}px` : '3px', 
                    background: m.isSelected 
                      ? 'linear-gradient(180deg, #FF9F43, #E65100)'
                      : m.revenue > 0 
                        ? 'linear-gradient(180deg, var(--sage-light, #a3b18a), var(--sage, #588157))' 
                        : 'var(--ivory-dark, #e0e0e0)', 
                    borderRadius: '4px 4px 0 0', 
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                ></div>

                {/* ข้อความกำกับแท่งกราฟ */}
                <div style={{ fontSize: 10, color: m.isSelected ? '#E65100' : 'var(--text-dark, #333)', fontWeight: m.isSelected || m.revenue > 0 ? 700 : 400, marginTop: 6 }}>
                  {m.label}
                </div>

                {/* จำนวนการจอง */}
                <div style={{ fontSize: 9, color: m.count > 0 ? '#2e7d32' : 'var(--text-light, #888)', marginTop: 2 }}>
                  {m.count > 0 ? `${m.count} จอง` : '-'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= TABLE สรุปรายเดือน ================= */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 22, boxShadow: 'var(--shadow-sm)' }}>
          <h6 style={{ fontWeight: 700, marginBottom: 14 }}>สรุปรายเดือน ปี {selectedYear + 543}</h6>
          <div className="aurora-table">
            <table className="table mb-0">
              <thead>
                <tr>
                  <th>เดือน</th>
                  <th>การจอง</th>
                  <th>รายได้</th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((m, i) => (
                  <tr key={i} style={{ fontWeight: i === now.getMonth() && selectedYear === now.getFullYear() ? 700 : 400 }}>
                    <td>{m.labelFull} {selectedYear + 543}</td>
                    <td>{m.count} ครั้ง</td>
                    <td style={{ fontWeight: 700, color: m.revenue > 0 ? 'var(--warm-dark)' : 'var(--text-light)' }}>
                      ฿{formatPrice(m.revenue)}
                    </td>
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