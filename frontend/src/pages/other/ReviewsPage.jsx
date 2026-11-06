// ==========================================
// pages/other/ReviewsPage.jsx
// หน้าแสดงรีวิวจากผู้เข้าพัก (แสดงครบทั้ง 4 ประเภทห้อง)
// ==========================================
import { useState, useEffect } from 'react';
import { StarRating, formatDate } from '../../components/Helpers';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ระบุประเภทห้องพักหลัก 4 ประเภทตรงนี้
const ALL_ROOM_TYPES = [
  'Standard Room',
  'Superior Room',
  'Deluxe Room',
  'Suite Room'
];

function displayFirstName(firstname) {
  if (!firstname) return 'ผู้เข้าพัก';
  return firstname[0] + '*'.repeat(Math.max(2, firstname.length - 1));
}

export function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(ALL_ROOM_TYPES[0]);

  useEffect(() => {
    fetch(`${API}/reviews`)
      .then(r => r.json())
      .then(d => {
        if (d && d.success && Array.isArray(d.data)) {
          const mapped = d.data.map(r => ({
            id: r.review_id,
            displayName: displayFirstName(r.firstname),
            roomType: (r.roomtype_name || 'Standard Room').trim(),
            rating: Number(r.rating) || 0,
            comment: r.comment,
            images: [r.image_url_1, r.image_url_2].filter(Boolean),
            date: r.created_at ? String(r.created_at).slice(0, 10) : '',
          }));
          setReviews(mapped);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch reviews error:", err);
        setLoading(false);
      });
  }, []);

  // กรองรีวิวเฉพาะประเภทห้องที่เลือก (ไม่สนตัวพิมพ์เล็ก-ใหญ่)
  const filtered = reviews.filter(r => 
    r.roomType.toLowerCase().trim() === selectedType.toLowerCase().trim()
  );

  const avgRating = filtered.length 
    ? (filtered.reduce((a, r) => a + r.rating, 0) / filtered.length).toFixed(1) 
    : '0.0';

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1 className="mb-2">รีวิวจากผู้เข้าพัก</h1>
          <p className="mb-0">ความคิดเห็นจริงจากลูกค้าที่เคยเข้าพัก</p>
        </div>
      </div>
      <div className="container pb-5">
        {loading ? (
          <div className="text-center py-5"><span className="spinner-border text-sage"></span></div>
        ) : (
          <>
            {/* ปุ่มเลือกประเภทห้อง (โชว์ครบทั้ง 4 ห้องแน่นอน) */}
            <div className="d-flex gap-2 flex-wrap mb-4">
              {ALL_ROOM_TYPES.map(t => (
                <button key={t} onClick={() => setSelectedType(t)}
                  style={{
                    padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1.5px solid var(--sage)',
                    background: selectedType.toLowerCase() === t.toLowerCase() ? 'var(--sage)' : 'var(--white)',
                    color: selectedType.toLowerCase() === t.toLowerCase() ? 'var(--white)' : 'var(--sage-dark)',
                    cursor: 'pointer', transition: 'var(--transition)',
                  }}>
                  {t}
                </button>
              ))}
            </div>

            {/* กล่องสรุปคะแนนดาวเฉลี่ย */}
            <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 32, boxShadow: 'var(--shadow-sm)', marginBottom: 40 }}>
              <div className="text-center">
                <div style={{ fontFamily: 'Playfair Display', fontSize: '5rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{avgRating}</div>
                <StarRating rating={parseFloat(avgRating)} size="lg" />
                <div style={{ fontSize: 14, color: 'var(--text-light)', marginTop: 8 }}>{selectedType} · {filtered.length} รีวิว</div>
              </div>
            </div>

            {/* รายการรีวิว หรือ แสดงกล่องยังไม่มีรีวิว */}
            {filtered.length === 0 ? (
              <div className="empty-state py-5 text-center" style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--ivory-dark)' }}>
                <i className="bi bi-star" style={{ fontSize: 48, color: 'var(--text-light)' }}></i>
                <h5 className="mt-3" style={{ color: 'var(--text-mid)' }}>ยังไม่มีรีวิวสำหรับ {selectedType}</h5>
              </div>
            ) : (
              <div className="row g-4">
                {filtered.map(r => (
                  <div key={r.id} className="col-md-6">
                    <div className="review-card">
                      <div className="d-flex align-items-center gap-3 mb-3">
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, var(--sage-light), var(--sage))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
                          {r.displayName[0] || '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{r.displayName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{r.roomType}</div>
                        </div>
                        <div className="ms-auto text-end">
                          <StarRating rating={r.rating} size="sm" />
                          <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{formatDate(r.date)}</div>
                        </div>
                      </div>
                      {r.images.length > 0 && (
                        <div className="d-flex gap-2 mb-3 flex-wrap">
                          {r.images.map((img, idx) => (
                            <img key={idx} src={img} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--ivory-dark)' }} />
                          ))}
                        </div>
                      )}
                      <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: 0, fontStyle: 'italic' }}>"{r.comment}"</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}