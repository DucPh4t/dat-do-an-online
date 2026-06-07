# Thiết kế cơ sở dữ liệu

## Nhận xét nhanh

Mô hình dữ liệu này dùng được cho demo ứng dụng đặt đồ ăn online. Bản này bổ sung thêm:
- Bảng `SHIPPER` riêng với tài khoản đăng nhập (thay vì lưu tên/SĐT dạng text tự do)
- Toàn bộ ràng buộc `CHECK` cho các trường số và enum
- `THANHTOAN.MaDH` giữ không `unique` để hỗ trợ nhiều lần thử thanh toán
- `GIOHANG.MaKH` không `unique`, kiểm soát giỏ ACTIVE bằng logic ứng dụng

Các giá trị hợp lệ cần thống nhất trong code hoặc `CHECK`:
- `VaiTro`: `'KhachHang'`, `'NhanVien'`, `'Shipper'`, `'Admin'`
- `TrangThai` đơn hàng: `'ChoXacNhan'`, `'DangChuanBi'`, `'DangGiao'`, `'HoanThanh'`, `'DaHuy'`
- `TrangThai` giỏ hàng: `'Active'`, `'DatHang'`, `'Huy'`
- `TrangThai` giao hàng: `'ChoNhan'`, `'DangGiao'`, `'DaGiao'`
- `HinhThuc` thanh toán: `'TienMat'`, `'ChuyenKhoan'`, `'VNPay'`, `'MoMo'`
- `PhuongThucTT`: `'TienMat'`, `'Online'`

---

## Schema DBML (cập nhật)

```dbml
Table TAIKHOAN {
  MaTK int [pk, increment]
  Email varchar(100) [not null, unique]
  MatKhauHash varchar(255) [not null]
  HoTen varchar(100) [not null]
  SDT varchar(20)
  VaiTro varchar(30) [not null, note: 'KhachHang | NhanVien | Shipper | Admin']
  TrangThai varchar(30) [note: 'HoatDong | KhoaTam | ChoDuyet']
  OTPCode varchar(10)
  OTPHetHan datetime
  NgayTao datetime
}

Table KHACHHANG {
  MaKH int [pk, increment]
  MaTK int [not null, unique]
  DiaChi varchar(255)
  AnhDaiDien varchar(255)
}

Table NHANVIEN {
  MaNV int [pk, increment]
  MaTK int [not null, unique]
  ChucVu varchar(50)
  CaLam varchar(50)
}

// Bảng mới: Shipper có tài khoản đăng nhập riêng
Table SHIPPER {
  MaShipper int [pk, increment]
  MaTK int [not null, unique]
  BienSoXe varchar(20)
  KhuVucGiao varchar(100)
}

Table DANHMUC {
  MaDM int [pk, increment]
  TenDM varchar(100) [not null]
  MoTa text
  HinhAnh varchar(255)
  ThuTu int
}

Table MONAN {
  MaMon int [pk, increment]
  MaDM int [not null]
  TenMon varchar(100) [not null]
  Gia decimal(12,2) [not null, note: '>= 0']
  HinhAnh varchar(255)
  MoTa text
  TrangThai varchar(30) [note: 'CoSan | HetMon | NgungBan']
  PhanTramGiam decimal(5,2) [note: '0 - 100']
  NgayTao datetime
  NgayCapNhat datetime
}

Table GIOHANG {
  MaGH int [pk, increment]
  MaKH int [not null]
  NgayTao datetime
  TrangThai varchar(30) [note: 'Active | DatHang | Huy']
}

Table CHITIETGIOHANG {
  MaCTGH int [pk, increment]
  MaGH int [not null]
  MaMon int [not null]
  SoLuong int [not null, note: '> 0']
  GiaTaiThoiDiem decimal(12,2) [not null, note: '>= 0']
}

Table DONHANG {
  MaDH int [pk, increment]
  MaKH int [not null]
  MaNV int
  NgayDat datetime
  DiaChiGiao varchar(255) [not null]
  SDTNhanHang varchar(20) [not null]
  TongTien decimal(12,2) [not null, note: '>= 0']
  PhiShip decimal(12,2) [note: '>= 0']
  PhuongThucTT varchar(50) [note: 'TienMat | Online']
  TrangThai varchar(30) [note: 'ChoXacNhan | DangChuanBi | DangGiao | HoanThanh | DaHuy']
  LyDoHuy text
}

Table CHITIETDONHANG {
  MaCTDH int [pk, increment]
  MaDH int [not null]
  MaMon int [not null]
  SoLuong int [not null, note: '> 0']
  DonGia decimal(12,2) [not null, note: '>= 0']
  PhanTramGiam decimal(5,2) [note: '0 - 100']
  ThanhTien decimal(12,2) [not null, note: '>= 0']
}

Table THANHTOAN {
  MaTT int [pk, increment]
  MaDH int [not null]
  ThoiGianTT datetime
  SoTien decimal(12,2) [not null, note: '> 0']
  HinhThuc varchar(50) [not null, note: 'TienMat | ChuyenKhoan | VNPay | MoMo']
  TrangThai varchar(30) [note: 'ThanhCong | ThatBai | DangXuLy | HoanTien']
  MaGiaoDich varchar(100)
}

Table GIAOHANG {
  MaGiaoHang int [pk, increment]
  MaDH int [not null, unique]
  // Thay TenShipper/SDTShipper bằng FK đến SHIPPER
  MaShipper int
  ThoiGianNhan datetime
  ThoiGianGiao datetime
  TrangThai varchar(30) [note: 'ChoNhan | DangGiao | DaGiao']
}

Table DANHGIA {
  MaDG int [pk, increment]
  MaKH int [not null]
  MaMon int [not null]
  MaDH int [not null]
  SoSao int [not null, note: '1 - 5']
  NoiDung text
  NgayDanhGia datetime
  TrangThai varchar(30) [note: 'HienThi | AnDi']

  Indexes {
    (MaKH, MaMon, MaDH) [unique]
  }
}

Ref: KHACHHANG.MaTK > TAIKHOAN.MaTK
Ref: NHANVIEN.MaTK > TAIKHOAN.MaTK
Ref: SHIPPER.MaTK > TAIKHOAN.MaTK
Ref: MONAN.MaDM > DANHMUC.MaDM
Ref: GIOHANG.MaKH > KHACHHANG.MaKH
Ref: CHITIETGIOHANG.MaGH > GIOHANG.MaGH
Ref: CHITIETGIOHANG.MaMon > MONAN.MaMon
Ref: DONHANG.MaKH > KHACHHANG.MaKH
Ref: DONHANG.MaNV > NHANVIEN.MaNV
Ref: CHITIETDONHANG.MaDH > DONHANG.MaDH
Ref: CHITIETDONHANG.MaMon > MONAN.MaMon
Ref: THANHTOAN.MaDH > DONHANG.MaDH
Ref: GIAOHANG.MaDH > DONHANG.MaDH
Ref: GIAOHANG.MaShipper > SHIPPER.MaShipper
Ref: DANHGIA.MaKH > KHACHHANG.MaKH
Ref: DANHGIA.MaMon > MONAN.MaMon
Ref: DANHGIA.MaDH > DONHANG.MaDH
```

---

## SQL đầy đủ (MySQL)

> **Lưu ý kiểm soát bằng application layer:**
> - `DANHGIA` chỉ được tạo khi `DONHANG.TrangThai = 'HoanThanh'` — kiểm tra ở tầng service trước khi INSERT.
> - `DONHANG.TongTien` phải bằng `Σ(CHITIETDONHANG.ThanhTien) + PhiShip` — tính và gán ở tầng service khi tạo đơn.
> - `GIAOHANG.MaShipper = NULL` có nghĩa là đơn chưa được phân công shipper, không phải lỗi dữ liệu.

```sql
-- ============================================================
-- HỆ THỐNG ĐẶT ĐỒ ĂN ONLINE — Full Schema (MySQL)
-- ============================================================

-- 1. TAIKHOAN
CREATE TABLE TAIKHOAN (
    MaTK        INT AUTO_INCREMENT PRIMARY KEY,
    Email       VARCHAR(100) NOT NULL UNIQUE,
    MatKhauHash VARCHAR(255) NOT NULL,
    HoTen       VARCHAR(100) NOT NULL,
    SDT         VARCHAR(20),
    VaiTro      VARCHAR(30)  NOT NULL,
    TrangThai   VARCHAR(30)  DEFAULT 'HoatDong',
    OTPCode     CHAR(6),                          -- OTP 6 ký tự số, NULL = chưa yêu cầu OTP
    OTPHetHan   DATETIME,
    NgayTao     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_VaiTro      CHECK (VaiTro    IN ('KhachHang', 'NhanVien', 'Shipper', 'Admin')),
    CONSTRAINT chk_TrangThaiTK CHECK (TrangThai IN ('HoatDong', 'KhoaTam', 'ChoDuyet'))
);

-- 2. KHACHHANG
CREATE TABLE KHACHHANG (
    MaKH       INT AUTO_INCREMENT PRIMARY KEY,
    MaTK       INT NOT NULL UNIQUE,
    DiaChi     VARCHAR(255),
    AnhDaiDien VARCHAR(255),
    FOREIGN KEY (MaTK) REFERENCES TAIKHOAN(MaTK)
);

-- 3. NHANVIEN
CREATE TABLE NHANVIEN (
    MaNV   INT AUTO_INCREMENT PRIMARY KEY,
    MaTK   INT NOT NULL UNIQUE,
    ChucVu VARCHAR(50),
    CaLam  VARCHAR(50),
    FOREIGN KEY (MaTK) REFERENCES TAIKHOAN(MaTK)
);

-- 4. SHIPPER
CREATE TABLE SHIPPER (
    MaShipper  INT AUTO_INCREMENT PRIMARY KEY,
    MaTK       INT NOT NULL UNIQUE,
    BienSoXe   VARCHAR(20),
    KhuVucGiao VARCHAR(100),
    FOREIGN KEY (MaTK) REFERENCES TAIKHOAN(MaTK)
);

-- 5. DANHMUC
CREATE TABLE DANHMUC (
    MaDM    INT AUTO_INCREMENT PRIMARY KEY,
    TenDM   VARCHAR(100) NOT NULL,
    MoTa    TEXT,
    HinhAnh VARCHAR(255),
    ThuTu   INT
);

-- 6. MONAN
CREATE TABLE MONAN (
    MaMon        INT AUTO_INCREMENT PRIMARY KEY,
    MaDM         INT           NOT NULL,
    TenMon       VARCHAR(100)  NOT NULL,
    Gia          DECIMAL(12,2) NOT NULL,
    HinhAnh      VARCHAR(255),
    MoTa         TEXT,
    TrangThai    VARCHAR(30)   DEFAULT 'CoSan',
    PhanTramGiam DECIMAL(5,2)  DEFAULT 0,
    NgayTao      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    NgayCapNhat  DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (MaDM) REFERENCES DANHMUC(MaDM),
    CONSTRAINT chk_Gia          CHECK (Gia >= 0),
    CONSTRAINT chk_PhanTramGiam CHECK (PhanTramGiam >= 0 AND PhanTramGiam <= 100),
    CONSTRAINT chk_TrangThaiMon CHECK (TrangThai IN ('CoSan', 'HetMon', 'NgungBan'))
);

-- INDEX hỗ trợ tìm món theo danh mục (query thường xuyên)
CREATE INDEX idx_monan_madm ON MONAN(MaDM);

-- 7. GIOHANG
CREATE TABLE GIOHANG (
    MaGH      INT AUTO_INCREMENT PRIMARY KEY,
    MaKH      INT NOT NULL,
    NgayTao   DATETIME    DEFAULT CURRENT_TIMESTAMP,
    TrangThai VARCHAR(30) DEFAULT 'Active',
    FOREIGN KEY (MaKH) REFERENCES KHACHHANG(MaKH),
    CONSTRAINT chk_TrangThaiGH CHECK (TrangThai IN ('Active', 'DatHang', 'Huy'))
);

-- 8. CHITIETGIOHANG
-- UNIQUE (MaGH, MaMon): mỗi món chỉ xuất hiện 1 lần trong giỏ, tăng SoLuong thay vì thêm dòng mới
CREATE TABLE CHITIETGIOHANG (
    MaCTGH         INT AUTO_INCREMENT PRIMARY KEY,
    MaGH           INT           NOT NULL,
    MaMon          INT           NOT NULL,
    SoLuong        INT           NOT NULL,
    GiaTaiThoiDiem DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (MaGH)  REFERENCES GIOHANG(MaGH),
    FOREIGN KEY (MaMon) REFERENCES MONAN(MaMon),
    UNIQUE KEY uq_MonTrongGio (MaGH, MaMon),
    CONSTRAINT chk_SoLuongGH   CHECK (SoLuong > 0),
    CONSTRAINT chk_GiaThoiDiem CHECK (GiaTaiThoiDiem >= 0)
);

-- 9. DONHANG
-- TongTien = Σ(CHITIETDONHANG.ThanhTien) + PhiShip — tính và gán ở tầng service
CREATE TABLE DONHANG (
    MaDH         INT AUTO_INCREMENT PRIMARY KEY,
    MaKH         INT           NOT NULL,
    MaNV         INT,
    NgayDat      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    DiaChiGiao   VARCHAR(255)  NOT NULL,
    SDTNhanHang  VARCHAR(20)   NOT NULL,
    TongTien     DECIMAL(12,2) NOT NULL,
    PhiShip      DECIMAL(12,2) DEFAULT 0,
    PhuongThucTT VARCHAR(50),
    TrangThai    VARCHAR(30)   DEFAULT 'ChoXacNhan',
    LyDoHuy      TEXT,
    FOREIGN KEY (MaKH) REFERENCES KHACHHANG(MaKH),
    FOREIGN KEY (MaNV) REFERENCES NHANVIEN(MaNV),
    CONSTRAINT chk_TongTien     CHECK (TongTien >= 0),
    CONSTRAINT chk_PhiShip      CHECK (PhiShip >= 0),
    CONSTRAINT chk_PhuongThucTT CHECK (PhuongThucTT IN ('TienMat', 'Online')),
    CONSTRAINT chk_TrangThaiDH  CHECK (TrangThai IN ('ChoXacNhan', 'DangChuanBi', 'DangGiao', 'HoanThanh', 'DaHuy'))
);

-- INDEX hỗ trợ lịch sử đơn theo khách và lọc theo trạng thái
CREATE INDEX idx_donhang_makh      ON DONHANG(MaKH);
CREATE INDEX idx_donhang_trangthai ON DONHANG(TrangThai);

-- 10. CHITIETDONHANG
-- ThanhTien = SoLuong × DonGia × (1 - PhanTramGiam/100) — tính và gán ở tầng service
CREATE TABLE CHITIETDONHANG (
    MaCTDH       INT AUTO_INCREMENT PRIMARY KEY,
    MaDH         INT           NOT NULL,
    MaMon        INT           NOT NULL,
    SoLuong      INT           NOT NULL,
    DonGia       DECIMAL(12,2) NOT NULL,
    PhanTramGiam DECIMAL(5,2)  DEFAULT 0,
    ThanhTien    DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (MaDH)  REFERENCES DONHANG(MaDH),
    FOREIGN KEY (MaMon) REFERENCES MONAN(MaMon),
    CONSTRAINT chk_SoLuongCTDH    CHECK (SoLuong > 0),
    CONSTRAINT chk_DonGia         CHECK (DonGia >= 0),
    CONSTRAINT chk_PhanTramGiamCT CHECK (PhanTramGiam >= 0 AND PhanTramGiam <= 100),
    CONSTRAINT chk_ThanhTien      CHECK (ThanhTien >= 0)
);

-- INDEX hỗ trợ thống kê top món bán chạy
CREATE INDEX idx_ctdh_madh  ON CHITIETDONHANG(MaDH);
CREATE INDEX idx_ctdh_mamon ON CHITIETDONHANG(MaMon);

-- 11. THANHTOAN
-- MaDH không UNIQUE: cho phép nhiều lần thử thanh toán (thất bại rồi thử lại)
CREATE TABLE THANHTOAN (
    MaTT       INT AUTO_INCREMENT PRIMARY KEY,
    MaDH       INT           NOT NULL,
    ThoiGianTT DATETIME      DEFAULT CURRENT_TIMESTAMP,
    SoTien     DECIMAL(12,2) NOT NULL,
    HinhThuc   VARCHAR(50)   NOT NULL,
    TrangThai  VARCHAR(30)   DEFAULT 'DangXuLy',
    MaGiaoDich VARCHAR(100),
    FOREIGN KEY (MaDH) REFERENCES DONHANG(MaDH),
    CONSTRAINT chk_SoTien      CHECK (SoTien > 0),
    CONSTRAINT chk_HinhThuc    CHECK (HinhThuc  IN ('TienMat', 'ChuyenKhoan', 'VNPay', 'MoMo')),
    CONSTRAINT chk_TrangThaiTT CHECK (TrangThai IN ('ThanhCong', 'ThatBai', 'DangXuLy', 'HoanTien'))
);

-- 12. GIAOHANG
-- MaShipper = NULL: đơn chưa phân công shipper (hợp lệ khi vừa tạo bản ghi giao hàng)
CREATE TABLE GIAOHANG (
    MaGiaoHang   INT AUTO_INCREMENT PRIMARY KEY,
    MaDH         INT NOT NULL UNIQUE,
    MaShipper    INT,                             -- NULL = chưa phân công
    ThoiGianNhan DATETIME,
    ThoiGianGiao DATETIME,
    TrangThai    VARCHAR(30) DEFAULT 'ChoNhan',
    FOREIGN KEY (MaDH)      REFERENCES DONHANG(MaDH),
    FOREIGN KEY (MaShipper) REFERENCES SHIPPER(MaShipper),
    CONSTRAINT chk_TrangThaiGH2 CHECK (TrangThai IN ('ChoNhan', 'DangGiao', 'DaGiao'))
);

-- 13. DANHGIA
-- Chỉ tạo đánh giá khi DONHANG.TrangThai = 'HoanThanh' — kiểm tra ở tầng service
CREATE TABLE DANHGIA (
    MaDG        INT AUTO_INCREMENT PRIMARY KEY,
    MaKH        INT NOT NULL,
    MaMon       INT NOT NULL,
    MaDH        INT NOT NULL,
    SoSao       INT NOT NULL,
    NoiDung     TEXT,
    NgayDanhGia DATETIME    DEFAULT CURRENT_TIMESTAMP,
    TrangThai   VARCHAR(30) DEFAULT 'HienThi',
    FOREIGN KEY (MaKH)  REFERENCES KHACHHANG(MaKH),
    FOREIGN KEY (MaMon) REFERENCES MONAN(MaMon),
    FOREIGN KEY (MaDH)  REFERENCES DONHANG(MaDH),
    UNIQUE KEY uq_DanhGia (MaKH, MaMon, MaDH),
    CONSTRAINT chk_SoSao       CHECK (SoSao BETWEEN 1 AND 5),
    CONSTRAINT chk_TrangThaiDG CHECK (TrangThai IN ('HienThi', 'AnDi'))
);
```

---

## Tóm tắt thay đổi so với phiên bản cũ

| Thay đổi | Chi tiết |
|----------|----------|
| ➕ Thêm bảng `SHIPPER` | Có `MaTK` → đăng nhập được, thêm `BienSoXe`, `KhuVucGiao` |
| 🔄 Sửa `GIAOHANG` | Bỏ `TenShipper`/`SDTShipper` text → thay bằng FK `MaShipper` (NULL = chưa phân công) |
| ➕ `CHECK` toàn bộ | Tất cả trường số và enum đều có ràng buộc rõ ràng |
| ➕ `DEFAULT` hợp lý | `TrangThai`, `NgayTao`, `PhanTramGiam`, `PhiShip` có giá trị mặc định |
| ➕ `ON UPDATE` cho `NgayCapNhat` | `MONAN.NgayCapNhat` tự cập nhật khi sửa bản ghi |
| ➕ `UNIQUE (MaGH, MaMon)` | `CHITIETGIOHANG`: mỗi món chỉ 1 dòng/giỏ, tránh trùng lặp |
| ➕ INDEX thực tế | `MONAN(MaDM)`, `DONHANG(MaKH)`, `DONHANG(TrangThai)`, `CHITIETDONHANG(MaDH, MaMon)` |
| ➕ `OTPCode CHAR(6)` | Đổi từ `VARCHAR(10)` → `CHAR(6)` cho đúng độ dài OTP |
| 📝 Ghi chú application layer | Rõ ràng 3 rule phải kiểm soát ở code: đánh giá, TongTien, shipper NULL |