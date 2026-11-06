-- =====================================================
-- Aurora Grand Hotel — Seed Data
-- รันไฟล์นี้หลังจาก import dbd.sql แล้ว
-- =====================================================
USE aurora_hotel_db;

-- =====================================================
-- 1. room_type (4 ประเภท)
-- =====================================================
INSERT INTO room_type (roomtype_name, description, max_guest, room_size, image_url) VALUES
('Standard Room',  'ห้องพักมาตรฐานที่คุ้มค่า สะอาด และสะดวกสบาย เหมาะสำหรับนักเดินทางประหยัดงบ', 2, '20 ตร.ม.', 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=800'),
('Superior Room',  'ห้องพักซูพีเรียร์ที่สะดวกสบาย เหมาะสำหรับการเดินทางทั้งทางธุรกิจและพักผ่อน', 2, '26 ตร.ม.', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'),
('Deluxe Room',    'ห้องพักดีลักซ์กว้างขวางพร้อมวิวเมืองที่สวยงาม ตกแต่งด้วยเฟอร์นิเจอร์หรูหรา', 2, '32 ตร.ม.', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'),
('Suite Room',     'ห้องสวีทหรูหราพร้อมวิว Panoramic ของเมือง พื้นที่นั่งเล่นแยก และสิ่งอำนวยความสะดวกครบครัน', 4, '58 ตร.ม.', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800');

-- =====================================================
-- 2. facility
-- =====================================================
INSERT INTO facility (facility_name) VALUES
('Wi-Fi ฟรี'), ('เครื่องปรับอากาศ'), ('โทรทัศน์'), ('มินิบาร์'),
('ตู้นิรภัย'), ('อ่างอาบน้ำ'), ('จากุซซี่'), ('เลาจน์ส่วนตัว'),
('ที่จอดรถ'), ('สระว่ายน้ำ');

-- =====================================================
-- 3. room_type_facility
-- =====================================================
-- Standard: wifi, ac, tv
INSERT INTO room_type_facility VALUES (1,1),(1,2),(1,3);
-- Superior: wifi, ac, tv, safe
INSERT INTO room_type_facility VALUES (2,1),(2,2),(2,3),(2,5);
-- Deluxe: wifi, ac, tv, minibar, safe, bathtub
INSERT INTO room_type_facility VALUES (3,1),(3,2),(3,3),(3,4),(3,5),(3,6);
-- Suite: all
INSERT INTO room_type_facility VALUES (4,1),(4,2),(4,3),(4,4),(4,5),(4,6),(4,7),(4,8);

-- =====================================================
-- 4. room (10 ห้อง)
-- =====================================================
INSERT INTO room (room_number, room_status, description, price, bed_type, people_count, roomtype_id) VALUES
-- Standard (ชั้น 1)
('101', 'ว่าง', 'ห้องมาตรฐาน วิวสวน ชั้น 1',   900, 'เตียงเดี่ยว Queen Size', 2, 1),
('102', 'ว่าง', 'ห้องมาตรฐาน วิวสวน ชั้น 1',   900, 'เตียงเดี่ยว 2 เตียง',   2, 1),
-- Superior (ชั้น 2)
('201', 'ว่าง', 'ห้องซูพีเรียร์ วิวเมือง ชั้น 2', 1200, 'เตียงเดี่ยว 2 เตียง',   2, 2),
('202', 'ว่าง', 'ห้องซูพีเรียร์ วิวเมือง ชั้น 2', 1200, 'เตียงเดี่ยว Queen Size', 2, 2),
('203', 'ว่าง', 'ห้องซูพีเรียร์ วิวสระว่ายน้ำ',  1300, 'เตียงคู่ Twin Size',    2, 2),
-- Deluxe (ชั้น 3)
('301', 'ว่าง', 'ห้องดีลักซ์ วิวเมือง ชั้น 3',  1800, 'เตียงคู่ King Size',    2, 3),
('302', 'ว่าง', 'ห้องดีลักซ์ วิวสวน ชั้น 3',    1800, 'เตียงคู่ King Size',    2, 3),
('303', 'ว่าง', 'ห้องดีลักซ์ corner view',       2000, 'เตียงคู่ King Size',    2, 3),
-- Suite (ชั้น 5)
('501', 'ว่าง', 'ห้องสวีทหรูหรา วิว Panoramic', 3500, 'เตียงคู่ King Size + โซฟาเบด', 4, 4),
('502', 'ว่าง', 'ห้องสวีทหรูหรา พร้อมจากุซซี่', 4000, 'เตียงคู่ King Size + โซฟาเบด', 4, 4);

-- =====================================================
-- 5. user (Admin + Staff)  รหัสผ่านทั้งหมด hash ด้วย bcrypt
-- admin1234 → $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh.y
-- staff1234 → $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- =====================================================
INSERT INTO user (prefix, firstname, lastname, role, email, status, password, phone) VALUES
('นาย',    'ธนกร',   'วงศ์สุวรรณ', 'admin', 'admin@aurora.com',  'active', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh.y', '042-111-001'),
('นางสาว', 'สุดารัตน์','ใจดี',      'staff', 'staff@aurora.com',  'active', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '042-111-002'),
('นาย',    'วิชัย',   'พรหมมา',    'staff', 'staff2@aurora.com', 'active', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '042-111-003');

-- =====================================================
-- 6. member (Demo member account)
-- member1234 → $2a$10$Fj3kPmZgjBXO.lWagwJn7OVqaJ/blLuiFBR.8k9Kv9reMuUY9KoNi
-- =====================================================
INSERT INTO member (prefix, firstname, lastname, email, password, phone) VALUES
('นาย',    'สมชาย',  'ใจดี',      'member@aurora.com',  '$2a$10$Fj3kPmZgjBXO.lWagwJn7OVqaJ/blLuiFBR.8k9Kv9reMuUY9KoNi', '081-234-5678'),
('นางสาว', 'วิไลพร', 'รักสกล',   'member2@aurora.com', '$2a$10$Fj3kPmZgjBXO.lWagwJn7OVqaJ/blLuiFBR.8k9Kv9reMuUY9KoNi', '082-345-6789');

-- =====================================================
-- 7. news
-- =====================================================
INSERT INTO news (title, detail, image_url, publish_date, end_date, user_id) VALUES
('เปิดตัว Spa & Wellness Center แห่งใหม่',
 'Aurora Grand Hotel ขอต้อนรับสู่ Spa & Wellness Center แห่งใหม่ของเรา ที่ออกแบบมาเพื่อให้คุณได้สัมผัสประสบการณ์การผ่อนคลายอย่างสมบูรณ์แบบ พร้อมบริการนวดแผนไทย อโรมาเทอราพี และซาวน่าระดับพรีเมียม',
 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
 '2025-06-01 08:00:00', '2025-12-31 23:59:00', 1),

('โปรโมชั่นพิเศษ: จองล่วงหน้า 30 วัน ลด 20%',
 'จองห้องพักล่วงหน้าอย่างน้อย 30 วัน รับส่วนลดพิเศษ 20% สำหรับทุกประเภทห้อง ตั้งแต่วันนี้ถึง 31 ธันวาคม 2568 อย่าพลาดโอกาสทอง!',
 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
 '2025-06-15 08:00:00', '2025-12-31 23:59:00', 1),

('เมนูอาหารเช้าบุฟเฟต์นานาชาติ',
 'สัมผัสประสบการณ์อาหารเช้าบุฟเฟต์นานาชาติมากกว่า 50 รายการ ทั้งอาหารไทย อาหารญี่ปุ่น อาหารตะวันตก และขนมหวานหลากหลายชนิด เสิร์ฟทุกวัน เวลา 06:30 - 10:30 น.',
 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
 '2025-05-01 08:00:00', NULL, 1),

('กิจกรรมท่องเที่ยวสกลนคร — Aurora Tour Package',
 'Aurora Grand Hotel นำเสนอแพ็คเกจทัวร์สกลนครสุดพิเศษ เที่ยวชมวัดพระธาตุเชิงชุม หนองหาร และตลาดอินโดจีน พร้อมไกด์ท้องถิ่นที่มีประสบการณ์',
 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800',
 '2025-07-01 08:00:00', '2025-09-30 23:59:00', 2);

-- =====================================================
-- 8. booking + receipt + review (ตัวอย่างข้อมูล)
-- =====================================================
INSERT INTO receipt (receipt_date, receipt_status) VALUES
('2025-06-01 10:00:00', 'PAID'),
('2025-06-05 14:30:00', 'PAID');

INSERT INTO booking (room_count, roomtype_id, checkin_date, checkout_date, booking_datetime, price, special_request, slip_image, member_id, status_id, receipt_id) VALUES
(1, 3, '2025-06-10 14:00:00', '2025-06-12 12:00:00', '2025-06-01 10:00:00', 3600, 'ขอห้องชั้นสูง', NULL, 1, 4, 1),
(1, 2, '2025-06-20 14:00:00', '2025-06-22 12:00:00', '2025-06-05 14:30:00', 2400, NULL,              NULL, 2, 3, 2);

INSERT INTO review (booking_id, member_id, rating, comment, created_at) VALUES
(1, 1, 5, 'ห้องสวยมาก บริการดีเยี่ยม ประทับใจมากครับ', '2025-06-13 09:00:00'),
(2, 2, 4, 'ห้องสะอาด อาหารเช้าอร่อย แต่อยากให้มีช่วงเวลาเช็คอินเร็วกว่านี้นิดนึงค่ะ', '2025-06-23 10:00:00');

-- แสดงผลตรวจสอบ
SELECT 'room_type' AS tbl, COUNT(*) AS cnt FROM room_type
UNION ALL SELECT 'room', COUNT(*) FROM room
UNION ALL SELECT 'facility', COUNT(*) FROM facility
UNION ALL SELECT 'user', COUNT(*) FROM user
UNION ALL SELECT 'member', COUNT(*) FROM member
UNION ALL SELECT 'news', COUNT(*) FROM news
UNION ALL SELECT 'booking', COUNT(*) FROM booking
UNION ALL SELECT 'review', COUNT(*) FROM review;
