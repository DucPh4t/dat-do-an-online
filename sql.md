# SQL cập nhật

File này thay cho bản `sql.md` cũ. Nguồn chuẩn là `sql_updated.md` mới nhất mà bạn đã gửi.

## Điểm cập nhật chính

- Thêm bảng `SHIPPER` riêng, có tài khoản đăng nhập qua `TAIKHOAN.MaTK`.
- Sửa `GIAOHANG`: không lưu `TenShipper` / `SDTShipper` dạng text nữa, chuyển sang `MaShipper`.
- `GIAOHANG.MaShipper = NULL` nghĩa là đơn chưa phân công shipper.
- Xóa `DONHANG.PhuongThucTT`; hình thức thanh toán chỉ lưu ở `THANHTOAN.HinhThuc`.
- `THANHTOAN.MaDH` không unique để hỗ trợ nhiều lần thử thanh toán.
- Mỗi đơn chỉ được có tối đa một giao dịch `THANHTOAN.TrangThai = 'ThanhCong'` ở tầng service.
- `GIOHANG.MaKH` không unique; tầng service kiểm soát mỗi khách chỉ có một giỏ `Active`.
- Thêm bảng `DANHGIA`; chỉ cho đánh giá khi đơn hàng đã hoàn thành.

## Danh sách bảng chuẩn

| Bảng | Ý nghĩa |
|---|---|
| `TAIKHOAN` | Tài khoản đăng nhập, vai trò, trạng thái, OTP |
| `KHACHHANG` | Hồ sơ khách hàng |
| `NHANVIEN` | Hồ sơ nhân viên cửa hàng |
| `SHIPPER` | Hồ sơ shipper có tài khoản riêng |
| `DANHMUC` | Danh mục món ăn |
| `MONAN` | Món ăn, giá, trạng thái, giảm giá |
| `GIOHANG` | Giỏ hàng của khách |
| `CHITIETGIOHANG` | Món trong giỏ, số lượng, giá tại thời điểm thêm |
| `DONHANG` | Đơn hàng, địa chỉ giao, tổng tiền, phí ship, trạng thái |
| `CHITIETDONHANG` | Món trong đơn, đơn giá chốt, thành tiền |
| `THANHTOAN` | Lần thanh toán của đơn hàng |
| `GIAOHANG` | Tiến trình giao hàng, phân công shipper |
| `DANHGIA` | Đánh giá món ăn sau khi đơn hoàn thành |

## Trạng thái / enum chuẩn

| Nhóm | Giá trị SQL |
|---|---|
| Vai trò tài khoản | `KhachHang`, `NhanVien`, `Shipper`, `Admin` |
| Tài khoản | `HoatDong`, `KhoaTam`, `ChoDuyet` |
| Món ăn | `CoSan`, `HetMon`, `NgungBan` |
| Giỏ hàng | `Active`, `DatHang`, `Huy` |
| Đơn hàng | `ChoXacNhan`, `DangChuanBi`, `DangGiao`, `HoanThanh`, `DaHuy` |
| Thanh toán | `DangXuLy`, `ThanhCong`, `ThatBai`, `HoanTien` |
| Hình thức thanh toán | `TienMat`, `ChuyenKhoan`, `VNPay`, `MoMo` |
| Giao hàng | `ChoNhan`, `DangGiao`, `DaGiao` |
| Đánh giá | `HienThi`, `DaAn` |

## Schema chuẩn dạng tóm tắt

### TAIKHOAN

- `MaTK` PK
- `Email` unique, not null
- `MatKhauHash`, `HoTen`, `SDT`
- `VaiTro`: KhachHang / NhanVien / Shipper / Admin
- `TrangThai`: HoatDong / KhoaTam / ChoDuyet
- `OTPCode`, `OTPHetHan`, `NgayTao`

### KHACHHANG

- `MaKH` PK
- `MaTK` FK unique tới `TAIKHOAN`
- `DiaChi`, `AnhDaiDien`

### NHANVIEN

- `MaNV` PK
- `MaTK` FK unique tới `TAIKHOAN`
- `ChucVu`, `CaLam`

### SHIPPER

- `MaShipper` PK
- `MaTK` FK unique tới `TAIKHOAN`
- `BienSoXe`, `KhuVucGiao`

### DANHMUC

- `MaDM` PK
- `TenDM`, `MoTa`, `HinhAnh`, `ThuTu`

### MONAN

- `MaMon` PK
- `MaDM` FK tới `DANHMUC`
- `TenMon`, `Gia`, `HinhAnh`, `MoTa`
- `TrangThai`: CoSan / HetMon / NgungBan
- `PhanTramGiam`, `NgayTao`, `NgayCapNhat`

### GIOHANG

- `MaGH` PK
- `MaKH` FK tới `KHACHHANG`
- `NgayTao`
- `TrangThai`: Active / DatHang / Huy

### CHITIETGIOHANG

- `MaCTGH` PK
- `MaGH` FK tới `GIOHANG`
- `MaMon` FK tới `MONAN`
- `SoLuong`, `GiaTaiThoiDiem`
- Unique logic: một món chỉ xuất hiện một lần trong một giỏ

### DONHANG

- `MaDH` PK
- `MaKH` FK tới `KHACHHANG`
- `MaNV` FK tới `NHANVIEN`, có thể null
- `NgayDat`, `DiaChiGiao`, `SDTNhanHang`
- `TongTien`, `PhiShip`
- `TrangThai`: ChoXacNhan / DangChuanBi / DangGiao / HoanThanh / DaHuy
- `LyDoHuy`

### CHITIETDONHANG

- `MaCTDH` PK
- `MaDH` FK tới `DONHANG`
- `MaMon` FK tới `MONAN`
- `SoLuong`, `DonGia`, `PhanTramGiam`, `ThanhTien`

### THANHTOAN

- `MaTT` PK
- `MaDH` FK tới `DONHANG`
- `ThoiGianTT`, `SoTien`
- `HinhThuc`: TienMat / ChuyenKhoan / VNPay / MoMo
- `TrangThai`: DangXuLy / ThanhCong / ThatBai / HoanTien
- `MaGiaoDich`

### GIAOHANG

- `MaGiaoHang` PK
- `MaDH` FK unique tới `DONHANG`
- `MaShipper` FK tới `SHIPPER`, có thể null
- `ThoiGianNhan`, `ThoiGianGiao`
- `TrangThai`: ChoNhan / DangGiao / DaGiao

### DANHGIA

- `MaDG` PK
- `MaKH` FK tới `KHACHHANG`
- `MaMon` FK tới `MONAN`
- `MaDH` FK tới `DONHANG`
- `SoSao`, `NoiDung`, `NgayDanhGia`
- `TrangThai`: HienThi / DaAn
- Unique logic: `(MaKH, MaMon, MaDH)`

## Rule kiểm soát ở tầng service

| Rule | Nội dung |
|---|---|
| Một giỏ active | Mỗi khách chỉ có tối đa một giỏ `Active` tại một thời điểm |
| Thêm món vào giỏ | Nếu món đã có trong giỏ thì tăng số lượng, không thêm dòng trùng |
| Đặt món | Chốt đơn giá từ `MONAN.Gia`, tạo đơn, tạo chi tiết đơn, chuyển giỏ sang `DatHang` |
| Tính tiền | `TongTien = tổng ThanhTien + PhiShip` |
| Thanh toán | Một đơn có thể có nhiều lần thử thanh toán, nhưng tối đa một lần `ThanhCong` |
| COD | `TienMat` ban đầu là `DangXuLy`, khi giao thành công mới cập nhật `ThanhCong` |
| Phân công shipper | `MaShipper = NULL` là chưa phân công, không phải lỗi dữ liệu |
| Giao hàng | Khi shipper nhận đơn: `ChoNhan -> DangGiao`; khi giao xong: `DaGiao` |
| Đồng bộ đơn hàng | Trạng thái `DONHANG` và `GIAOHANG` được đồng bộ ở tầng service |
| Đánh giá | Chỉ cho đánh giá khi `DONHANG.TrangThai = 'HoanThanh'` |
| Hủy đơn | Khi hủy đơn phải lưu `LyDoHuy` và đổi trạng thái `DaHuy` |

## Ghi chú so với code hiện tại

Code demo trong `server/db.js` hiện vẫn còn một số phần theo schema cũ:

- Vai trò đang dùng `KHACHHANG`, `NHANVIEN`, `ADMIN`, chưa có `Shipper`.
- Bảng `SHIPPER` chưa được tạo trong SQLite demo.
- `GIAOHANG` vẫn đang lưu `TenShipper`, `SDTShipper` thay vì `MaShipper`.
- `DONHANG` vẫn còn `PhuongThucTT`.
- `THANHTOAN.MaDH` trong demo đang unique.
- Chưa có bảng `DANHGIA` trong SQLite demo.

Vì vậy file này là chuẩn thiết kế mới; code backend cần cập nhật sau để khớp hoàn toàn.
