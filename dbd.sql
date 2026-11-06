-- ลบฐานข้อมูลเก่าทิ้ง (เพื่อรีเซ็ตโครงสร้างใหม่ทั้งหมด)
DROP DATABASE IF EXISTS aurora_hotel_db;

-- สร้างฐานข้อมูลใหม่
CREATE DATABASE IF NOT EXISTS aurora_hotel_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE aurora_hotel_db;

-- 1. ตารางสมาชิก (MEMBER)
CREATE TABLE member (
    member_id INT AUTO_INCREMENT PRIMARY KEY,
    prefix VARCHAR(20) NOT NULL,
    firstname VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    email VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, 
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ตารางผู้ใช้งาน / พนักงาน / Admin (USER)
CREATE TABLE user (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    prefix VARCHAR(20) NOT NULL,
    firstname VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    role VARCHAR(30) NOT NULL, 
    email VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. ตารางสถานะการจอง (BOOKINGSTATUS)
CREATE TABLE booking_status (
    status_id INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL UNIQUE
);

-- 4. ตารางประเภทห้องพัก (ROOMTYPE)
CREATE TABLE room_type (
    roomtype_id INT AUTO_INCREMENT PRIMARY KEY, 
    roomtype_name VARCHAR(50) NOT NULL,
    description TEXT,
    max_guest INT NOT NULL,
    room_size VARCHAR(50),
    image_url MEDIUMTEXT
);

-- 5. ตารางสิ่งอำนวยความสะดวก (FACILITY)
CREATE TABLE facility (
    facility_id INT AUTO_INCREMENT PRIMARY KEY,
    facility_name VARCHAR(50) NOT NULL UNIQUE
);

-- 5.1 ตารางเชื่อมความสัมพันธ์ ประเภทห้องพัก กับ สิ่งอำนวยความสะดวก
CREATE TABLE room_type_facility (
    roomtype_id INT, 
    facility_id INT,
    PRIMARY KEY (roomtype_id, facility_id),
    FOREIGN KEY (roomtype_id) REFERENCES room_type(roomtype_id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES facility(facility_id) ON DELETE CASCADE
);

-- 6. ตารางห้องพัก (ROOM)
CREATE TABLE room (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(10) NOT NULL UNIQUE,
    room_status VARCHAR(20) NOT NULL DEFAULT 'ว่าง',
    description VARCHAR(255),
    price INT NOT NULL,
    bed_type VARCHAR(30),
    people_count INT,
    roomtype_id INT, 
    FOREIGN KEY (roomtype_id) REFERENCES room_type(roomtype_id) ON DELETE SET NULL
);

-- 7. ตารางใบเสร็จ (RECEIPT)
CREATE TABLE receipt (
    receipt_id INT AUTO_INCREMENT PRIMARY KEY,
    receipt_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    receipt_status VARCHAR(20) NOT NULL
);

-- 8. ตารางการจอง (BOOKING)
CREATE TABLE booking (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    room_count INT NOT NULL DEFAULT 1,
    roomtype_id INT,                                                              -- ประเภทห้องที่จอง (เพิ่มจาก schema เดิม)
    checkin_date DATETIME NOT NULL,
    checkout_date DATETIME NOT NULL,
    booking_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    price INT NOT NULL,
    special_request TEXT, 
    slip_image MEDIUMTEXT,                                                        -- ขยายจาก VARCHAR(255) เพื่อรองรับ base64
    member_id INT,
    status_id INT,
    receipt_id INT,
    -- FIX: เดิมตารางนี้ไม่มี 4 คอลัมน์ด้านล่าง แต่ routes/bookings.js (สมาชิก) เขียน INSERT พยายามใส่ adults/children
    -- ทำให้ MySQL error "Unknown column 'adults' in 'field list'" และการจองพังทุกครั้ง จึงเพิ่มคอลัมน์ให้ตรงกับโค้ดจริง
    adults INT NOT NULL DEFAULT 1,                                                -- จำนวนผู้ใหญ่ที่เข้าพัก
    children INT NOT NULL DEFAULT 0,                                             -- จำนวนเด็กที่เข้าพัก
    -- เพิ่มไว้ให้ routes/staff.js เก็บชื่อ/เบอร์ผู้ติดต่อของลูกค้า walk-in ที่ไม่มี member_id (ไม่งั้นข้อมูลนี้จะถูกทิ้งเงียบๆ)
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    FOREIGN KEY (roomtype_id) REFERENCES room_type(roomtype_id) ON DELETE SET NULL,
    FOREIGN KEY (member_id) REFERENCES member(member_id) ON DELETE SET NULL,
    FOREIGN KEY (status_id) REFERENCES booking_status(status_id) ON DELETE SET NULL,
    FOREIGN KEY (receipt_id) REFERENCES receipt(receipt_id) ON DELETE SET NULL
);

-- 9. ตารางการเข้าพักจริง (CHECKIN)
CREATE TABLE checkin (
    checkin_id INT AUTO_INCREMENT PRIMARY KEY,
    prefix VARCHAR(20) NOT NULL,
    firstname VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    checkin_date DATETIME NOT NULL,
    checkout_date DATETIME,
    price INT NOT NULL,
    member_id INT,
    user_id INT, 
    booking_id INT,                                                               -- เชื่อมกับการจองที่ตรงกัน (เพิ่มจาก schema เดิม)
    receipt_id INT,
    room_id INT,
    FOREIGN KEY (member_id) REFERENCES member(member_id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE SET NULL,
    FOREIGN KEY (booking_id) REFERENCES booking(booking_id) ON DELETE SET NULL,
    FOREIGN KEY (receipt_id) REFERENCES receipt(receipt_id) ON DELETE SET NULL,
    FOREIGN KEY (room_id) REFERENCES room(room_id) ON DELETE SET NULL
);

-- 10. ตารางระบบรีวิว 
CREATE TABLE review (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT,
    member_id INT,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    image_url_1 MEDIUMTEXT,                                                       -- ขยายจาก VARCHAR(255) เพื่อรองรับ base64
    image_url_2 MEDIUMTEXT,                                                       -- ขยายจาก VARCHAR(255) เพื่อรองรับ base64
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES booking(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES member(member_id) ON DELETE CASCADE
);

-- 11. ตารางข่าวสาร (NEWS)
CREATE TABLE news (
    news_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    detail TEXT NOT NULL,
    image_url MEDIUMTEXT,                                                         -- ขยายจาก VARCHAR(255) เพื่อรองรับ base64
    publish_date DATETIME NOT NULL,
    end_date DATETIME,
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE SET NULL
);

-- 12. ข้อมูลตั้งต้นสถานะการจอง
INSERT INTO booking_status (status_name) VALUES 
('PENDING_PAYMENT'),
('PAYMENT_REVIEW'),
('CONFIRMED'),
('COMPLETED'),
('CANCELLED_SYSTEM'),
('CANCELLED_ADMIN'),
('CANCELLED_USER'),
('CHECKED_IN'),
('CHECKED_OUT');
