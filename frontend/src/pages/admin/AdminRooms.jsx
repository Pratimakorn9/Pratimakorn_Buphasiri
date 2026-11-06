// ==========================================
// pages/admin/AdminRooms.jsx
// จัดการห้องพัก (เพิ่ม/แก้ไข/ลบ) + จัดการประเภทห้อง
// ==========================================
import { useState, useEffect, useCallback } from 'react';
import { API, apiFetch, Popup, AdminSidebar, RoomForm, RoomTypeForm } from './components/_shared';

export function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  // States สำหรับ Modal จัดการประเภทห้อง
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeError, setTypeError] = useState('');

  // States สำหรับจัดการห้องพัก
  const [showAdd, setShowAdd] = useState(false);
  const [editPopup, setEditPopup] = useState(null);
  const [deletePopup, setDeletePopup] = useState(null);
  const [blockedPopup, setBlockedPopup] = useState(''); // ข้อความแจ้งเตือนเมื่อเปลี่ยนสถานะห้องที่มีผู้เข้าพักอยู่
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchRoom, setSearchRoom] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [r, rt, f] = await Promise.all([
        apiFetch('/admin/rooms'),
        apiFetch('/admin/room-types'),
        apiFetch('/admin/facilities')
      ]);
      if (r.success) setRooms(r.data);
      if (rt.success) setRoomTypes(rt.data);
      if (f.success) setFacilities(f.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };

  // บันทึกประเภทห้อง (เพิ่ม/แก้ไข)
  const handleSaveType = async (formData) => {
    setTypeError('');
    try {
      const path = editingType ? `/admin/room-types/${editingType.roomtype_id}` : '/admin/room-types';
      const method = editingType ? 'PUT' : 'POST';
      const res = await apiFetch(path, { method, body: JSON.stringify(formData) });

      if (res.success) {
        showMsg(editingType ? 'แก้ไขประเภทห้องสำเร็จ' : 'เพิ่มประเภทห้องสำเร็จ');
        setEditingType(null);
        load();
      }
    } catch (err) {
      setTypeError(err.message || 'เกิดข้อผิดพลาดในการบันทึกประเภทห้อง');
    }
  };

  // ลบประเภทห้อง
  const handleDeleteType = async (id) => {
    if (!confirm('คุณต้องการลบประเภทห้องนี้ใช่หรือไม่?')) return;
    try {
      const res = await apiFetch(`/admin/room-types/${id}`, { method: 'DELETE' });
      if (res.success) {
        showMsg('ลบประเภทห้องสำเร็จ');
        load();
      }
    } catch (err) {
      alert(err.message || 'ลบประเภทห้องไม่สำเร็จ');
    }
  };

  // บันทึกห้องพัก
  const handleAdd = async (formData) => {
    try {
      const d = await apiFetch('/admin/rooms', { method: 'POST', body: JSON.stringify(formData) });
      if (d.success) { showMsg('เพิ่มห้องสำเร็จ'); setShowAdd(false); load(); }
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการเพิ่มห้อง');
    }
  };

  const handleEdit = async (formData) => {
    try {
      const d = await apiFetch(`/admin/rooms/${editPopup.room_id}`, { method: 'PUT', body: JSON.stringify(formData) });
      if (d.success) { showMsg('บันทึกสำเร็จ'); setEditPopup(null); load(); }
    } catch (err) {
      // กรณี backend ปฏิเสธเพราะมีผู้เช็คอินห้องนี้อยู่ ให้แสดงเป็นป็อปอัพแจ้งเตือน
      if (err.message?.includes('ไม่สามารถเปลี่ยนสถานะได้')) setBlockedPopup(err.message);
      else alert(err.message || 'เกิดข้อผิดพลาดในการแก้ไขห้อง');
    }
  };

  const handleDelete = async () => {
    try {
      const d = await apiFetch(`/admin/rooms/${deletePopup.room_id}`, { method: 'DELETE' });
      if (d.success) { setDeletePopup(null); showMsg('ลบห้องสำเร็จ'); load(); }
    } catch (err) {
      alert(err.message || 'ลบไม่สำเร็จ');
    }
  };

  const statusColor = { 
    'พร้อมใช้งาน': 'var(--success)', 
    'ไม่พร้อมใช้งาน': 'var(--danger)' 
  };

  const filtered = rooms.filter(r => {
    const matchT = filterType === 'all' || r.roomtype_id === parseInt(filterType);
    const matchS = filterStatus === 'all' || r.room_status === filterStatus;
    const matchQ = !searchRoom || String(r.room_number).includes(searchRoom);
    return matchT && matchS && matchQ;
  }).sort((a, b) => String(a.room_number).localeCompare(String(b.room_number), undefined, { numeric: true }));

  const summary = roomTypes.map(rt => ({
    name: rt.roomtype_name,
    total: rooms.filter(r => r.roomtype_id === rt.roomtype_id).length,
    available: rooms.filter(r => r.roomtype_id === rt.roomtype_id && r.room_status === 'พร้อมใช้งาน').length,
  }));

  return (
    <div className="dashboard-page">
      <AdminSidebar />
      <div className="dashboard-right">
        <div className="dash-top-bar d-flex justify-content-between align-items-center">
          <h4 style={{ fontFamily: 'Playfair Display', margin: 0 }}>จัดการห้องพัก</h4>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={() => { setEditingType(null); setTypeError(''); setShowTypeModal(true); }}>
              <i className="bi bi-tags me-1"></i>จัดการประเภทห้อง
            </button>
            <button className="btn btn-gold btn-sm" onClick={() => setShowAdd(true)}>
              <i className="bi bi-plus me-1"></i>เพิ่มห้องใหม่
            </button>
          </div>
        </div>
        {msg && <div className="alert alert-success py-2 mb-3" style={{ fontSize: 14, borderRadius: 10 }}><i className="bi bi-check-circle me-2"></i>{msg}</div>}

        <div className="row g-3 mb-4">
          {summary.map((s, i) => (
            <div key={i} className="col-6 col-xl-3">
              <div className="stat-card" style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{s.name}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)' }}>{s.total} ห้อง</div>
                <div style={{ fontSize: 12, color: s.available > 0 ? 'var(--success)' : 'var(--danger)' }}>พร้อมใช้งาน {s.available} ห้อง</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: '14px 18px', boxShadow: 'var(--shadow-sm)', marginBottom: 18 }}>
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>ค้นหาเลขห้อง</label>
              <input className="form-control" placeholder="101..." value={searchRoom} onChange={e => setSearchRoom(e.target.value)} style={{ borderRadius: 8, fontSize: 13 }} />
            </div>
            <div className="col-md-4">
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>ประเภทห้อง</label>
              <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ borderRadius: 8, fontSize: 13 }}>
                <option value="all">ทั้งหมด</option>
                {roomTypes.map(rt => <option key={rt.roomtype_id} value={rt.roomtype_id}>{rt.roomtype_name}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>สถานะ</label>
              <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ borderRadius: 8, fontSize: 13 }}>
                <option value="all">ทั้งหมด</option>
                <option value="พร้อมใช้งาน">พร้อมใช้งาน</option>
                <option value="ไม่พร้อมใช้งาน">ไม่พร้อมใช้งาน</option>
              </select>
            </div>
            <div className="col-md-2"><span style={{ fontSize: 13, color: 'var(--text-light)' }}>{filtered.length} ห้อง</span></div>
          </div>
        </div>

        {loading ? <div className="text-center py-5"><span className="spinner-border text-sage"></span></div> : (
          <div className="row g-3">
            {filtered.map(r => (
              <div key={r.room_id} className="col-12 col-md-6 col-xl-4">
                <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', border: `2px solid ${r.room_status === 'พร้อมใช้งาน' ? 'rgba(86,169,127,0.25)' : 'rgba(220,53,69,0.2)'}`, overflow: 'hidden' }}>
                  <div style={{ position: 'relative' }}>
                    <img src={r.image_url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'} alt={r.roomtype_name} style={{ width: '100%', height: 110, objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: 8, left: 8, background: 'var(--navy)', color: 'white', borderRadius: 6, padding: '3px 10px', fontWeight: 700, fontSize: 14 }}>ห้อง {r.room_number}</div>
                    <div style={{ position: 'absolute', top: 8, right: 8, background: statusColor[r.room_status] || 'var(--danger)', color: 'white', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                      {r.room_status || 'ไม่พร้อมใช้งาน'}
                    </div>
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{r.roomtype_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 6 }}>{r.bed_type || 'เตียงเดี่ยว'} · {r.people_count} คน</div>
                    {r.active_checkins > 0 && <div style={{ fontSize: 11, color: 'var(--warm-dark)', fontWeight: 600, marginBottom: 6 }}><i className="bi bi-person-fill me-1"></i>มีผู้เข้าพักอยู่</div>}
                    <div className="d-flex justify-content-between align-items-center">
                      <div style={{ fontWeight: 700, color: 'var(--warm-dark)' }}>฿{r.price?.toLocaleString()}<span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-light)' }}>/คืน</span></div>
                      <div className="d-flex gap-1">
                        <button className="btn btn-outline-secondary btn-sm" style={{ borderRadius: 6, padding: '3px 8px', fontSize: 12 }} onClick={() => setEditPopup(r)}><i className="bi bi-pencil"></i></button>
                        <button className="btn btn-outline-danger btn-sm" style={{ borderRadius: 6, padding: '3px 8px', fontSize: 12 }} onClick={() => setDeletePopup(r)}><i className="bi bi-trash"></i></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="col-12"><div className="empty-state"><i className="bi bi-building"></i><h5>ไม่พบห้องพัก</h5></div></div>}
          </div>
        )}
      </div>

      {/* ===== MODAL จัดการประเภทห้อง ===== */}
      {showTypeModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowTypeModal(false); }}>
          <div className="modal-card" style={{ maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-card-header">
              <button className="modal-close-btn" onClick={() => setShowTypeModal(false)}><i className="bi bi-x-lg"></i></button>
              <h5 style={{ fontFamily: 'Playfair Display', margin: 0 }}>
                {editingType ? `แก้ไขประเภท: ${editingType.roomtype_name}` : 'จัดการประเภทห้องพัก'}
              </h5>
            </div>
            <div className="modal-body">
              {typeError && <div className="alert alert-danger py-2 mb-3" style={{ fontSize: 13 }}>{typeError}</div>}
              
              <RoomTypeForm
                key={editingType?.roomtype_id || 'new'}
                initialData={editingType}
                facilities={facilities}
                onSave={handleSaveType}
                onCancel={() => setEditingType(null)}
                isEdit={!!editingType}
              />

              <hr className="my-4" />

              <h6 style={{ fontFamily: 'Playfair Display', marginBottom: 12 }}>รายการประเภทห้องทั้งหมด</h6>
              <div className="table-responsive">
                <table className="table table-sm align-middle" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>ชื่อประเภท</th>
                      <th>ราคา/คืน</th>
                      <th>พักได้สูงสุด</th>
                      <th>ขนาดห้อง</th>
                      <th>สิ่งอำนวยความสะดวก</th>
                      <th>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomTypes.map(rt => (
                      <tr key={rt.roomtype_id}>
                        <td><strong>{rt.roomtype_name}</strong></td>
                        <td><strong style={{ color: 'var(--warm-dark)' }}>฿{rt.price?.toLocaleString() || 0}</strong></td>
                        <td>{rt.max_guest} คน</td>
                        <td>{rt.room_size} ตร.ม.</td>
                        <td><span className="badge bg-light text-dark">{rt.facility_ids?.length || 0} รายการ</span></td>
                        <td>
                          <button className="btn btn-xs btn-outline-primary me-1" style={{ padding: '2px 6px', fontSize: 12 }} onClick={() => setEditingType(rt)}>
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-xs btn-outline-danger" style={{ padding: '2px 6px', fontSize: 12 }} onClick={() => handleDeleteType(rt.roomtype_id)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL เพิ่มห้องพักใหม่ ===== */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal-card" style={{ maxWidth: 620 }}>
            <div className="modal-card-header"><button className="modal-close-btn" onClick={() => setShowAdd(false)}><i className="bi bi-x-lg"></i></button><h5 style={{ fontFamily: 'Playfair Display', margin: 0 }}>เพิ่มห้องพักใหม่</h5></div>
            <div className="modal-body"><RoomForm onSave={handleAdd} onCancel={() => setShowAdd(false)} isEdit={false} roomTypes={roomTypes} /></div>
          </div>
        </div>
      )}

      {/* ===== MODAL แก้ไขห้องพัก ===== */}
      {editPopup && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEditPopup(null); }}>
          <div className="modal-card" style={{ maxWidth: 620 }}>
            <div className="modal-card-header"><button className="modal-close-btn" onClick={() => setEditPopup(null)}><i className="bi bi-x-lg"></i></button><h5 style={{ fontFamily: 'Playfair Display', margin: 0 }}>แก้ไขห้อง {editPopup.room_number}</h5></div>
            <div className="modal-body"><RoomForm initialData={editPopup} onSave={handleEdit} onCancel={() => setEditPopup(null)} isEdit={true} roomTypes={roomTypes} onStatusBlocked={setBlockedPopup} /></div>
          </div>
        </div>
      )}

      {/* ===== POPUP แจ้งเตือน: เปลี่ยนสถานะห้องที่มีผู้เข้าพักอยู่ไม่ได้ ===== */}
      {blockedPopup && (
        <Popup icon="bi-exclamation-triangle-fill" iconClass="danger" title="ไม่สามารถเปลี่ยนสถานะได้" message={blockedPopup.replace('ไม่สามารถเปลี่ยนสถานะได้ เนื่องจาก', '')} onClose={() => setBlockedPopup('')}>
          <button className="btn-aurora-primary" onClick={() => setBlockedPopup('')}>ตกลง</button>
        </Popup>
      )}

      {/* ===== POPUP ยืนยันลบห้องพัก ===== */}
      {deletePopup && (
        <Popup icon="bi-trash-fill" iconClass="danger" title={`ลบห้อง ${deletePopup.room_number}?`} message="การลบจะไม่สามารถกู้คืนได้" onClose={() => setDeletePopup(null)}>
          <div className="d-flex gap-3 w-100">
            <button className="btn-aurora-secondary flex-1" onClick={() => setDeletePopup(null)}>ยกเลิก</button>
            <button className="btn-aurora-danger flex-1" onClick={handleDelete}>ยืนยันลบ</button>
          </div>
        </Popup>
      )}
    </div>
  );
}