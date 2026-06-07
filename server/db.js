import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(join(dataDir, 'food_delivery.sqlite'));
db.exec('PRAGMA foreign_keys = ON;');

const now = () => new Date().toISOString();

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS TAIKHOAN (
      MaTK INTEGER PRIMARY KEY AUTOINCREMENT,
      Email TEXT UNIQUE NOT NULL,
      MatKhau TEXT NOT NULL,
      HoTen TEXT NOT NULL,
      SDT TEXT,
      VaiTro TEXT NOT NULL CHECK (VaiTro IN ('KHACHHANG', 'NHANVIEN', 'ADMIN')),
      TrangThai TEXT NOT NULL DEFAULT 'Hoạt động',
      NgayTao TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS KHACHHANG (
      MaKH INTEGER PRIMARY KEY AUTOINCREMENT,
      MaTK INTEGER UNIQUE NOT NULL,
      DiaChi TEXT,
      AnhDaiDien TEXT,
      FOREIGN KEY (MaTK) REFERENCES TAIKHOAN(MaTK)
    );

    CREATE TABLE IF NOT EXISTS NHANVIEN (
      MaNV INTEGER PRIMARY KEY AUTOINCREMENT,
      MaTK INTEGER UNIQUE NOT NULL,
      ChucVu TEXT,
      CaLam TEXT,
      FOREIGN KEY (MaTK) REFERENCES TAIKHOAN(MaTK)
    );

    CREATE TABLE IF NOT EXISTS DANHMUC (
      MaDM INTEGER PRIMARY KEY AUTOINCREMENT,
      TenDM TEXT NOT NULL,
      MoTa TEXT,
      HinhAnh TEXT,
      ThuTu INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS MONAN (
      MaMon INTEGER PRIMARY KEY AUTOINCREMENT,
      MaDM INTEGER NOT NULL,
      TenMon TEXT NOT NULL,
      Gia REAL NOT NULL,
      HinhAnh TEXT,
      MoTa TEXT,
      TrangThai INTEGER NOT NULL DEFAULT 1,
      PhanTramGiam REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (MaDM) REFERENCES DANHMUC(MaDM)
    );

    CREATE TABLE IF NOT EXISTS GIOHANG (
      MaGH INTEGER PRIMARY KEY AUTOINCREMENT,
      MaKH INTEGER UNIQUE NOT NULL,
      NgayTao TEXT NOT NULL,
      FOREIGN KEY (MaKH) REFERENCES KHACHHANG(MaKH)
    );

    CREATE TABLE IF NOT EXISTS CHITIETGIOHANG (
      MaCTGH INTEGER PRIMARY KEY AUTOINCREMENT,
      MaGH INTEGER NOT NULL,
      MaMon INTEGER NOT NULL,
      SoLuong INTEGER NOT NULL,
      GiaTaiThoiDiem REAL NOT NULL,
      UNIQUE (MaGH, MaMon),
      FOREIGN KEY (MaGH) REFERENCES GIOHANG(MaGH) ON DELETE CASCADE,
      FOREIGN KEY (MaMon) REFERENCES MONAN(MaMon)
    );

    CREATE TABLE IF NOT EXISTS DONHANG (
      MaDH INTEGER PRIMARY KEY AUTOINCREMENT,
      MaKH INTEGER NOT NULL,
      MaNV INTEGER,
      NgayDat TEXT NOT NULL,
      DiaChiGiao TEXT NOT NULL,
      SDTNhanHang TEXT NOT NULL,
      TongTien REAL NOT NULL,
      PhiShip REAL NOT NULL,
      TrangThai TEXT NOT NULL,
      PhuongThucTT TEXT NOT NULL,
      FOREIGN KEY (MaKH) REFERENCES KHACHHANG(MaKH),
      FOREIGN KEY (MaNV) REFERENCES NHANVIEN(MaNV)
    );

    CREATE TABLE IF NOT EXISTS CHITIETDONHANG (
      MaCTDH INTEGER PRIMARY KEY AUTOINCREMENT,
      MaDH INTEGER NOT NULL,
      MaMon INTEGER NOT NULL,
      SoLuong INTEGER NOT NULL,
      DonGia REAL NOT NULL,
      PhanTramGiam REAL NOT NULL,
      ThanhTien REAL NOT NULL,
      FOREIGN KEY (MaDH) REFERENCES DONHANG(MaDH) ON DELETE CASCADE,
      FOREIGN KEY (MaMon) REFERENCES MONAN(MaMon)
    );

    CREATE TABLE IF NOT EXISTS THANHTOAN (
      MaTT INTEGER PRIMARY KEY AUTOINCREMENT,
      MaDH INTEGER UNIQUE NOT NULL,
      ThoiGianTT TEXT,
      SoTien REAL NOT NULL,
      HinhThuc TEXT NOT NULL,
      TrangThai TEXT NOT NULL,
      MaGiaoDich TEXT,
      FOREIGN KEY (MaDH) REFERENCES DONHANG(MaDH) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS GIAOHANG (
      MaGH2 INTEGER PRIMARY KEY AUTOINCREMENT,
      MaDH INTEGER UNIQUE NOT NULL,
      TenShipper TEXT,
      SDTShipper TEXT,
      ThoiGianNhan TEXT,
      ThoiGianGiao TEXT,
      TrangThai TEXT NOT NULL,
      FOREIGN KEY (MaDH) REFERENCES DONHANG(MaDH) ON DELETE CASCADE
    );
  `);

  const accountCount = db.prepare('SELECT COUNT(*) AS total FROM TAIKHOAN').get().total;
  if (accountCount > 0) return;

  seedDatabase();
}

function seedDatabase() {
  const insertAccount = db.prepare(`
    INSERT INTO TAIKHOAN (Email, MatKhau, HoTen, SDT, VaiTro, TrangThai, NgayTao)
    VALUES (?, ?, ?, ?, ?, 'Hoạt động', ?)
  `);
  const adminId = insertAccount.run('admin@demo.vn', '123456', 'Nguyễn Minh Admin', '0909000001', 'ADMIN', now()).lastInsertRowid;
  const staffId = insertAccount.run('nhanvien@demo.vn', '123456', 'Trần Bảo Nhân', '0909000002', 'NHANVIEN', now()).lastInsertRowid;
  const customerId = insertAccount.run('khach@demo.vn', '123456', 'Nguyễn Đức Phát', '0909000003', 'KHACHHANG', now()).lastInsertRowid;

  db.prepare('INSERT INTO NHANVIEN (MaTK, ChucVu, CaLam) VALUES (?, ?, ?)').run(adminId, 'Quản trị viên', 'Full-time');
  const staffMaNV = db.prepare('INSERT INTO NHANVIEN (MaTK, ChucVu, CaLam) VALUES (?, ?, ?)').run(staffId, 'Nhân viên xử lý đơn', 'Ca chiều').lastInsertRowid;
  const customerMaKH = db.prepare('INSERT INTO KHACHHANG (MaTK, DiaChi, AnhDaiDien) VALUES (?, ?, ?)').run(customerId, '12 Nguyễn Huệ, Quận 1, TP.HCM', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80').lastInsertRowid;
  db.prepare('INSERT INTO GIOHANG (MaKH, NgayTao) VALUES (?, ?)').run(customerMaKH, now());

  const categories = [
    ['Cơm văn phòng', 'Các phần cơm no bụng cho bữa trưa', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80', 1],
    ['Món nước', 'Phở, bún, mì nóng hổi', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80', 2],
    ['Ăn vặt', 'Món nhẹ, đồ chiên, snack', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=900&q=80', 3],
    ['Đồ uống', 'Trà sữa, cà phê, nước ép', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=80', 4],
    ['Combo tiết kiệm', 'Set món có ưu đãi', 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80', 5]
  ];
  const insertCategory = db.prepare('INSERT INTO DANHMUC (TenDM, MoTa, HinhAnh, ThuTu) VALUES (?, ?, ?, ?)');
  categories.forEach((category) => insertCategory.run(...category));

  const dishes = [
    [1, 'Cơm gà xối mỡ', 59000, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', 'Cơm nóng, gà da giòn, nước mắm gừng.', 1, 10],
    [1, 'Cơm sườn bì chả', 65000, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=900&q=80', 'Sườn nướng mật ong kèm bì chả.', 1, 0],
    [1, 'Cơm bò lúc lắc', 72000, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80', 'Bò mềm áp chảo, khoai tây, salad.', 1, 5],
    [2, 'Phở bò tái', 55000, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=900&q=80', 'Nước dùng trong, bò tái mềm.', 1, 0],
    [2, 'Bún bò Huế', 60000, 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=900&q=80', 'Vị cay thơm, chả cua, giò heo.', 1, 8],
    [2, 'Mì trộn đặc biệt', 52000, 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=900&q=80', 'Mì dai, sốt đậm vị, topping phong phú.', 1, 0],
    [3, 'Gà rán giòn cay', 49000, 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=900&q=80', 'Miếng gà giòn, sốt cay nhẹ.', 1, 15],
    [3, 'Khoai tây lắc phô mai', 35000, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80', 'Khoai chiên nóng, bột phô mai béo.', 1, 0],
    [3, 'Bánh tráng trộn', 30000, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80', 'Bánh tráng, xoài, rau răm, khô bò.', 1, 0],
    [4, 'Trà sữa trân châu', 39000, 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=900&q=80', 'Trà sữa thơm, trân châu đường đen.', 1, 12],
    [4, 'Cà phê sữa đá', 29000, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=80', 'Cà phê rang xay, sữa đặc.', 1, 0],
    [4, 'Nước ép cam', 36000, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80', 'Cam tươi ép trong ngày.', 1, 0],
    [5, 'Combo cơm gà + trà sữa', 89000, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=900&q=80', 'Một phần cơm gà và một ly trà sữa.', 1, 18],
    [5, 'Combo phở + cà phê', 76000, 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80', 'Bữa sáng nhanh gọn, đủ năng lượng.', 1, 10],
    [5, 'Combo ăn vặt đôi', 69000, 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=900&q=80', 'Gà rán, khoai tây và nước ngọt.', 0, 0]
  ];
  const insertDish = db.prepare(`
    INSERT INTO MONAN (MaDM, TenMon, Gia, HinhAnh, MoTa, TrangThai, PhanTramGiam)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  dishes.forEach((dish) => insertDish.run(...dish));

  createSeedOrder(customerMaKH, staffMaNV, 'Đang giao', 'Tiền mặt', [
    { MaMon: 1, SoLuong: 1 },
    { MaMon: 10, SoLuong: 2 }
  ]);
  createSeedOrder(customerMaKH, staffMaNV, 'Hoàn thành', 'Ví điện tử', [
    { MaMon: 4, SoLuong: 2 },
    { MaMon: 8, SoLuong: 1 }
  ]);
}

function createSeedOrder(maKH, maNV, status, method, items) {
  const dishStmt = db.prepare('SELECT MaMon, Gia, PhanTramGiam FROM MONAN WHERE MaMon = ?');
  const detailRows = items.map((item) => {
    const dish = dishStmt.get(item.MaMon);
    const price = dish.Gia * (1 - dish.PhanTramGiam / 100);
    return { ...dish, SoLuong: item.SoLuong, ThanhTien: price * item.SoLuong };
  });
  const subtotal = detailRows.reduce((sum, row) => sum + row.ThanhTien, 0);
  const shipping = 15000;
  const orderId = db.prepare(`
    INSERT INTO DONHANG (MaKH, MaNV, NgayDat, DiaChiGiao, SDTNhanHang, TongTien, PhiShip, TrangThai, PhuongThucTT)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(maKH, maNV, now(), '12 Nguyễn Huệ, Quận 1, TP.HCM', '0909000003', subtotal + shipping, shipping, status, method).lastInsertRowid;

  const insertDetail = db.prepare(`
    INSERT INTO CHITIETDONHANG (MaDH, MaMon, SoLuong, DonGia, PhanTramGiam, ThanhTien)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  detailRows.forEach((row) => insertDetail.run(orderId, row.MaMon, row.SoLuong, row.Gia, row.PhanTramGiam, row.ThanhTien));
  db.prepare('INSERT INTO THANHTOAN (MaDH, ThoiGianTT, SoTien, HinhThuc, TrangThai, MaGiaoDich) VALUES (?, ?, ?, ?, ?, ?)')
    .run(orderId, status === 'Hoàn thành' ? now() : null, subtotal + shipping, method, method === 'Tiền mặt' ? 'Chờ thanh toán' : 'Đã thanh toán', `PAY${String(orderId).padStart(4, '0')}`);
  db.prepare('INSERT INTO GIAOHANG (MaDH, TenShipper, SDTShipper, ThoiGianNhan, ThoiGianGiao, TrangThai) VALUES (?, ?, ?, ?, ?, ?)')
    .run(orderId, 'Phạm Quốc Ship', '0911222333', now(), status === 'Hoàn thành' ? now() : null, status === 'Hoàn thành' ? 'Đã giao' : 'Đang giao');
}
