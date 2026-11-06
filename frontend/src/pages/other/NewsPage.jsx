// ==========================================
// pages/other/NewsPage.jsx
// หน้าแสดงข่าวสาร/โปรโมชั่นของโรงแรม (ปรับแต่งการ์ดให้สูงเท่ากันเรียบร้อย)
// ==========================================
import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { StarRating, formatDate } from '../../components/Helpers';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function NewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/news`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setNews(d.data.map(n => ({
          id: n.news_id,
          title: n.title,
          content: n.detail,
          image: n.image_url,
          category: 'ทั่วไป',
          date: n.publish_date ? String(n.publish_date).slice(0, 10) : '',
          endDate: n.end_date ? String(n.end_date).slice(0, 10) : '',
        })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1 className="mb-2">ข่าวสารและกิจกรรม</h1>
          <p className="mb-0">ติดตามข่าวสาร และกิจกรรมล่าสุดจาก Aurora Grand Hotel</p>
        </div>
      </div>
      <div className="container pb-5">
        {loading ? (
          <div className="text-center py-5"><span className="spinner-border text-sage"></span></div>
        ) : news.length === 0 ? (
          <div className="empty-state"><i className="bi bi-newspaper"></i><h5>ยังไม่มีข่าวสาร</h5></div>
        ) : (
          <div className="row g-4">
            {news.map(n => (
              <div key={n.id} className="col-md-6 col-lg-4 d-flex">
                <div 
                  className="news-card h-100 d-flex flex-column w-100"
                  style={{ 
                    borderRadius: 16, 
                    overflow: 'hidden',
                    background: 'var(--white)',
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--ivory-dark)'
                  }}
                >
                  {/* กรอบรูปภาพ: ล็อคความสูง 200px ให้เท่ากันทุกการ์ด */}
                  <div style={{ height: 200, width: '100%', overflow: 'hidden', background: '#f5f5f5', flexShrink: 0 }}>
                    {n.image ? (
                      <img 
                        src={n.image} 
                        alt={n.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                        <i className="bi bi-newspaper fs-1"></i>
                      </div>
                    )}
                  </div>

                  {/* เนื้อหาการ์ด: ใช้ flex-column + flex-grow-1 เพื่อดันส่วนล่างให้เท่ากัน */}
                  <div className="news-card-body d-flex flex-column flex-grow-1" style={{ padding: 20 }}>
                    <div className="mb-2">
                      <span style={{ background: 'rgba(123,158,135,0.1)', color: 'var(--sage-dark)', padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600 }}>
                        {n.category}
                      </span>
                    </div>

                    {/* หัวข้อข่าว: ล็อคไม่เกิน 2 บรรทัด และตั้ง minHeight กันข้อความสั้น */}
                    <h6 
                      style={{ 
                        fontFamily: 'Playfair Display', 
                        fontSize: 17, 
                        marginBottom: 8,
                        fontWeight: 700,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: 48 
                      }}
                    >
                      {n.title}
                    </h6>

                    {/* รายละเอียดข่าว: ล็อคไม่เกิน 3 บรรทัด และขยายส่วนกลาง */}
                    <p 
                      style={{ 
                        fontSize: 13, 
                        color: 'var(--text-mid)', 
                        marginBottom: 16,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        flexGrow: 1
                      }}
                    >
                      {n.content}
                    </p>

                    {/* ส่วนแสดงวันที่: อยู่ชิดล่างสุดของการ์ดเสมอ */}
                    <div className="mt-auto pt-2" style={{ fontSize: 12, color: 'var(--text-light)', borderTop: '1px dashed #eee' }}>
                      <i className="bi bi-calendar3 me-1"></i>{formatDate(n.date)}
                      {n.endDate && <span className="ms-2" style={{ color: '#E65100' }}><i className="bi bi-calendar-x me-1"></i>ถึง {n.endDate}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}