import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

// DB v2 dùng schema mới theo sql.md / sql_updated.md.
// Đổi tên file để không bị kẹt bởi database demo cũ đã tạo bảng sai schema.
export const db = new DatabaseSync(join(dataDir, 'food_delivery_v2.sqlite'));
db.exec('PRAGMA foreign_keys = ON;');

const now = () => new Date().toISOString();

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS TAIKHOAN (
      MaTK INTEGER PRIMARY KEY AUTOINCREMENT,
      Email TEXT UNIQUE NOT NULL,
      MatKhauHash TEXT NOT NULL,
      HoTen TEXT NOT NULL,
      SDT TEXT,
      VaiTro TEXT NOT NULL,
      TrangThai TEXT NOT NULL DEFAULT 'HoatDong',
      OTPCode TEXT,
      OTPHetHan TEXT,
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

    CREATE TABLE IF NOT EXISTS SHIPPER (
      MaShipper INTEGER PRIMARY KEY AUTOINCREMENT,
      MaTK INTEGER UNIQUE NOT NULL,
      BienSoXe TEXT,
      KhuVucGiao TEXT,
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
      TrangThai TEXT NOT NULL DEFAULT 'CoSan',
      PhanTramGiam REAL NOT NULL DEFAULT 0,
      NgayTao TEXT NOT NULL,
      NgayCapNhat TEXT NOT NULL,
      FOREIGN KEY (MaDM) REFERENCES DANHMUC(MaDM)
    );

    CREATE TABLE IF NOT EXISTS GIOHANG (
      MaGH INTEGER PRIMARY KEY AUTOINCREMENT,
      MaKH INTEGER NOT NULL,
      NgayTao TEXT NOT NULL,
      TrangThai TEXT NOT NULL DEFAULT 'Active',
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
      PhiShip REAL NOT NULL DEFAULT 0,
      TrangThai TEXT NOT NULL DEFAULT 'ChoXacNhan',
      LyDoHuy TEXT,
      FOREIGN KEY (MaKH) REFERENCES KHACHHANG(MaKH),
      FOREIGN KEY (MaNV) REFERENCES NHANVIEN(MaNV)
    );

    CREATE TABLE IF NOT EXISTS CHITIETDONHANG (
      MaCTDH INTEGER PRIMARY KEY AUTOINCREMENT,
      MaDH INTEGER NOT NULL,
      MaMon INTEGER NOT NULL,
      SoLuong INTEGER NOT NULL,
      DonGia REAL NOT NULL,
      PhanTramGiam REAL NOT NULL DEFAULT 0,
      ThanhTien REAL NOT NULL,
      FOREIGN KEY (MaDH) REFERENCES DONHANG(MaDH) ON DELETE CASCADE,
      FOREIGN KEY (MaMon) REFERENCES MONAN(MaMon)
    );

    CREATE TABLE IF NOT EXISTS THANHTOAN (
      MaTT INTEGER PRIMARY KEY AUTOINCREMENT,
      MaDH INTEGER NOT NULL,
      ThoiGianTT TEXT,
      SoTien REAL NOT NULL,
      HinhThuc TEXT NOT NULL,
      TrangThai TEXT NOT NULL DEFAULT 'DangXuLy',
      MaGiaoDich TEXT,
      FOREIGN KEY (MaDH) REFERENCES DONHANG(MaDH) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS GIAOHANG (
      MaGiaoHang INTEGER PRIMARY KEY AUTOINCREMENT,
      MaDH INTEGER UNIQUE NOT NULL,
      MaShipper INTEGER,
      ThoiGianNhan TEXT,
      ThoiGianGiao TEXT,
      TrangThai TEXT NOT NULL DEFAULT 'ChoNhan',
      FOREIGN KEY (MaDH) REFERENCES DONHANG(MaDH) ON DELETE CASCADE,
      FOREIGN KEY (MaShipper) REFERENCES SHIPPER(MaShipper)
    );

    CREATE TABLE IF NOT EXISTS DANHGIA (
      MaDG INTEGER PRIMARY KEY AUTOINCREMENT,
      MaKH INTEGER NOT NULL,
      MaMon INTEGER NOT NULL,
      MaDH INTEGER NOT NULL,
      SoSao INTEGER NOT NULL,
      NoiDung TEXT,
      NgayDanhGia TEXT NOT NULL,
      TrangThai TEXT NOT NULL DEFAULT 'HienThi',
      UNIQUE (MaKH, MaMon, MaDH),
      FOREIGN KEY (MaKH) REFERENCES KHACHHANG(MaKH),
      FOREIGN KEY (MaMon) REFERENCES MONAN(MaMon),
      FOREIGN KEY (MaDH) REFERENCES DONHANG(MaDH)
    );
  `);

  const accountCount = db.prepare('SELECT COUNT(*) AS total FROM TAIKHOAN').get().total;
  if (accountCount > 0) return;
  seedDatabase();
}

function seedDatabase() {
  const insertAccount = db.prepare(`
    INSERT INTO TAIKHOAN (Email, MatKhauHash, HoTen, SDT, VaiTro, TrangThai, NgayTao)
    VALUES (?, ?, ?, ?, ?, 'HoatDong', ?)
  `);

  const adminId = insertAccount.run('admin@demo.vn', '123456', 'Nguyễn Minh Admin', '0909000001', 'Admin', now()).lastInsertRowid;
  const staffId = insertAccount.run('nhanvien@demo.vn', '123456', 'Trần Bảo Nhân', '0909000002', 'NhanVien', now()).lastInsertRowid;
  const customerId = insertAccount.run('khach@demo.vn', '123456', 'Nguyễn Đức Phát', '0909000003', 'KhachHang', now()).lastInsertRowid;
  const shipperId = insertAccount.run('shipper@demo.vn', '123456', 'Phạm Quốc Ship', '0911222333', 'Shipper', now()).lastInsertRowid;

  db.prepare('INSERT INTO NHANVIEN (MaTK, ChucVu, CaLam) VALUES (?, ?, ?)').run(adminId, 'Quản trị viên', 'Full-time');
  const staffMaNV = db.prepare('INSERT INTO NHANVIEN (MaTK, ChucVu, CaLam) VALUES (?, ?, ?)').run(staffId, 'Nhân viên xử lý đơn', 'Ca chiều').lastInsertRowid;
  const customerMaKH = db.prepare('INSERT INTO KHACHHANG (MaTK, DiaChi, AnhDaiDien) VALUES (?, ?, ?)').run(customerId, '12 Nguyễn Huệ, Quận 1, TP.HCM', '').lastInsertRowid;
  const shipperMa = db.prepare('INSERT INTO SHIPPER (MaTK, BienSoXe, KhuVucGiao) VALUES (?, ?, ?)').run(shipperId, '59A1-12345', 'Quận 1').lastInsertRowid;

  db.prepare('INSERT INTO GIOHANG (MaKH, NgayTao, TrangThai) VALUES (?, ?, ?)').run(customerMaKH, now(), 'Active');

  const insertCategory = db.prepare('INSERT INTO DANHMUC (TenDM, MoTa, HinhAnh, ThuTu) VALUES (?, ?, ?, ?)');
  [
    ['Cơm văn phòng', 'Các phần cơm no bụng', '', 1],
    ['Món nước', 'Phở, bún, mì', '', 2],
    ['Ăn vặt', 'Món nhẹ và đồ chiên', '', 3],
    ['Đồ uống', 'Trà sữa, cà phê, nước ép', '', 4],
    ['Combo tiết kiệm', 'Set món ưu đãi', '', 5]
  ].forEach((category) => insertCategory.run(...category));

  const insertDish = db.prepare(`
    INSERT INTO MONAN (MaDM, TenMon, Gia, HinhAnh, MoTa, TrangThai, PhanTramGiam, NgayTao, NgayCapNhat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  [
    [1, 'Cơm gà xối mỡ', 59000, '', 'Cơm nóng, gà da giòn.', 'CoSan', 10],
    [1, 'Cơm sườn bì chả', 65000, '', 'Sườn nướng kèm bì chả.', 'CoSan', 0],
    [2, 'Phở bò tái', 55000, '', 'Nước dùng trong, bò tái mềm.', 'CoSan', 0],
    [2, 'Bún bò Huế', 60000, '', 'Vị cay thơm, đậm đà.', 'CoSan', 8],
    [3, 'Gà rán giòn cay', 49000, '', 'Miếng gà giòn, sốt cay nhẹ.', 'CoSan', 15],
    [4, 'Trà sữa trân châu', 39000, '', 'Trà sữa thơm, trân châu đường đen.', 'CoSan', 12],
    [5, 'Combo cơm gà + trà sữa', 89000, '', 'Một phần cơm gà và một ly trà sữa.', 'CoSan', 18]
  ].forEach((dish) => insertDish.run(...dish, now(), now()));

  createSeedOrder(customerMaKH, staffMaNV, shipperMa, 'DangGiao', 'TienMat', [
    { MaMon: 1, SoLuong: 1 },
    { MaMon: 6, SoLuong: 1 }
  ]);
}

function createSeedOrder(maKH, maNV, maShipper, status, method, items) {
  const dishStmt = db.prepare('SELECT MaMon, Gia, PhanTramGiam FROM MONAN WHERE MaMon = ?');
  const details = items.map((item) => {
    const dish = dishStmt.get(item.MaMon);
    const thanhTien = dish.Gia * (1 - dish.PhanTramGiam / 100) * item.SoLuong;
    return { ...dish, SoLuong: item.SoLuong, ThanhTien: thanhTien };
  });
  const phiShip = 15000;
  const tongTien = details.reduce((sum, row) => sum + row.ThanhTien, 0) + phiShip;
  const maDH = db.prepare(`
    INSERT INTO DONHANG (MaKH, MaNV, NgayDat, DiaChiGiao, SDTNhanHang, TongTien, PhiShip, TrangThai, LyDoHuy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
  `).run(maKH, maNV, now(), '12 Nguyễn Huệ, Quận 1, TP.HCM', '0909000003', tongTien, phiShip, status).lastInsertRowid;

  const insertDetail = db.prepare('INSERT INTO CHITIETDONHANG (MaDH, MaMon, SoLuong, DonGia, PhanTramGiam, ThanhTien) VALUES (?, ?, ?, ?, ?, ?)');
  details.forEach((row) => insertDetail.run(maDH, row.MaMon, row.SoLuong, row.Gia, row.PhanTramGiam, row.ThanhTien));

  db.prepare('INSERT INTO THANHTOAN (MaDH, ThoiGianTT, SoTien, HinhThuc, TrangThai, MaGiaoDich) VALUES (?, NULL, ?, ?, ?, ?)')
    .run(maDH, tongTien, method, 'DangXuLy', `PAY${String(maDH).padStart(4, '0')}`);
  db.prepare('INSERT INTO GIAOHANG (MaDH, MaShipper, ThoiGianNhan, ThoiGianGiao, TrangThai) VALUES (?, ?, ?, NULL, ?)')
    .run(maDH, maShipper, now(), 'DangGiao');
}
