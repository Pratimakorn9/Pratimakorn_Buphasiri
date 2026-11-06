// ==========================================
// config/bookingQuery.js
// SQL กลางสำหรับดึงรายการจอง ใช้ร่วมกันทั้งฝั่งสมาชิก / พนักงาน / แอดมิน
// เพื่อให้ทุกหน้าได้ข้อมูลชุดเดียวกัน (เลขห้องที่จัดให้, เวลาเช็คอิน-เอาต์จริง, สถานะรีวิว)
// ใช้งาน: pool.query(`${BOOKING_SELECT} WHERE ... ORDER BY ...`, params)
// ==========================================
const BOOKING_SELECT = `
    SELECT b.*, bs.status_name, rt.roomtype_name,
           m.firstname, m.lastname, m.prefix, m.email AS member_email, m.phone AS member_phone,
           (SELECT GROUP_CONCAT(DISTINCT r.room_number ORDER BY r.room_number SEPARATOR ', ')
              FROM checkin c JOIN room r ON r.room_id = c.room_id
             WHERE c.booking_id = b.booking_id) AS room_numbers,
           (SELECT MIN(c.checkin_date) FROM checkin c WHERE c.booking_id = b.booking_id) AS actual_checkin,
           (SELECT MAX(c.checkout_date) FROM checkin c WHERE c.booking_id = b.booking_id) AS actual_checkout,
           EXISTS(SELECT 1 FROM review rv WHERE rv.booking_id = b.booking_id) AS has_review
    FROM booking b
    JOIN booking_status bs ON b.status_id = bs.status_id
    LEFT JOIN room_type rt ON b.roomtype_id = rt.roomtype_id
    LEFT JOIN member m ON b.member_id = m.member_id`;

module.exports = { BOOKING_SELECT };