// ==========================================
// components/DateInput.jsx
// ==========================================
import { useState, useRef, useEffect } from 'react';

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function toDisplay(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

function pad(n) { return String(n).padStart(2, '0'); }

function toYMD(year, monthIndex0, day) {
  return `${year}-${pad(monthIndex0 + 1)}-${pad(day)}`;
}

export default function DateInput({ value, onChange, min, max, required, className = '', placeholder = 'วว/ดด/ปปปป' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const base = value || min || new Date().toISOString().slice(0, 10);
  const [baseY, baseM] = base.split('-').map(Number);
  const [viewYear, setViewYear] = useState(baseY);
  const [viewMonth, setViewMonth] = useState(baseM - 1);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openCalendar = () => {
    const b = value || min || new Date().toISOString().slice(0, 10);
    const [y, m] = b.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
    setOpen(true);
  };

  const pick = (day) => {
    const ymd = toYMD(viewYear, viewMonth, day);
    if (min && ymd < min) return;
    if (max && ymd > max) return;
    onChange({ target: { value: ymd } });
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else { setViewMonth(m => m - 1); }
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else { setViewMonth(m => m + 1); }
  };

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div
        className={`form-control-aurora ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          backgroundColor: 'var(--white, #ffffff)',
          border: '1px solid #ced4da',
          borderRadius: '8px',
          padding: '0 12px',
          height: 42,
          fontSize: '0.875rem'
        }}
        onClick={openCalendar}
        role="button"
        tabIndex={0}
      >
        <span style={{ color: value ? 'var(--text-dark)' : 'var(--text-light)' }}>
          {value ? toDisplay(value) : placeholder}
        </span>
        <i className="bi bi-calendar3" style={{ color: 'var(--sage)', fontSize: 14, marginLeft: 6 }}></i>
      </div>
      <input type="text" value={value || ''} onChange={() => {}} required={required} readOnly
        style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} tabIndex={-1} />

      {open && (
        // FIX (responsive): width: 280 ตายตัว + left:0 โดยไม่มี maxWidth กำกับ
        // คอมโพเนนต์นี้ถูกใช้ในหลายหน้า บางที่อยู่ในคอลัมน์แคบ (เช่น col-md-3) บนจอมือถือจิ๋วมากๆ
        // อาจกว้างเกินจอแล้วล้นขวาได้ เพิ่ม maxWidth กันไว้ไม่ให้กว้างเกิน viewport
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1050,
          background: 'var(--white, #ffffff)', border: '1.5px solid var(--ivory-dark)', borderRadius: 12,
          boxShadow: 'var(--shadow-md)', padding: 12, width: 280, maxWidth: 'calc(100vw - 32px)'
        }}>
          <div className="d-flex align-items-center justify-content-between mb-2">
            <button type="button" className="btn btn-sm" onClick={prevMonth} style={{ border: 'none', background: 'transparent' }}>
              <i className="bi bi-chevron-left"></i>
            </button>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)' }}>
              {MONTHS[viewMonth]} {viewYear + 543}
            </div>
            <button type="button" className="btn btn-sm" onClick={nextMonth} style={{ border: 'none', background: 'transparent' }}>
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {WEEKDAYS.map(w => (
              <div key={w} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-light)', fontWeight: 700, padding: '4px 0' }}>{w}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const ymd = toYMD(viewYear, viewMonth, day);
              const disabled = (min && ymd < min) || (max && ymd > max);
              const selected = ymd === value;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(day)}
                  style={{
                    border: 'none', borderRadius: 8, padding: '7px 0', fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
                    background: selected ? 'var(--sage)' : 'transparent',
                    color: disabled ? 'var(--ivory-dark)' : selected ? 'var(--white)' : 'var(--text-dark)',
                    fontWeight: selected ? 700 : 400,
                  }}
                  onMouseEnter={(e) => { if (!disabled && !selected) e.currentTarget.style.background = 'var(--ivory)'; }}
                  onMouseLeave={(e) => { if (!disabled && !selected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}