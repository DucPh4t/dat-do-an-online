# Đặt Đồ Ăn Online

Repository cho project **hệ thống đặt đồ ăn online**.

Project hiện có giao diện demo bằng React/Vite và backend Express/SQLite. Tài liệu thiết kế dữ liệu chuẩn mới nhất nằm ở `sql.md`.

## Mục tiêu

Xây dựng hệ thống cho phép khách hàng xem món ăn, thêm món vào giỏ hàng, đặt món, thanh toán, theo dõi giao hàng và đánh giá món sau khi đơn hoàn thành. Phía cửa hàng có thể quản lý món ăn, đơn hàng, thanh toán, giao hàng, shipper và thống kê vận hành.

## Công nghệ hiện tại

- Frontend: React, Vite, CSS
- Backend: Node.js, Express
- Demo database: SQLite
- Thiết kế database chuẩn: MySQL trong `sql.md`

## Chạy project

```bash
npm install
npm run dev
```

Các script chính:

```bash
npm run client
npm run server
npm run build
npm start
```

## Tài khoản demo hiện tại

```text
Khách hàng: khach@demo.vn / 123456
Admin: admin@demo.vn / 123456
Nhân viên: nhanvien@demo.vn / 123456
```

## Chức năng theo SQL mới nhất

### 1. Tài khoản và phân quyền

Dựa trên bảng `TAIKHOAN`, hệ thống cần hỗ trợ các vai trò:

- `KhachHang`
- `NhanVien`
- `Shipper`
- `Admin`

Trạng thái tài khoản:

- `HoatDong`: tài khoản đang hoạt động
- `KhoaTam`: tài khoản bị khóa
- `ChoDuyet`: tài khoản chờ xác thực / chờ duyệt

Chức năng liên quan:

- Đăng nhập
- Đăng ký
- Quên mật khẩu bằng OTP
- Kiểm tra trạng thái tài khoản trước khi cho vào hệ thống
- Chuyển hướng giao diện theo vai trò người dùng

### 2. Khách hàng

Dựa trên `KHACHHANG`, `GIOHANG`, `CHITIETGIOHANG`, `DONHANG`, `THANHTOAN`, `GIAOHANG`, `DANHGIA`.

Chức năng cần có:

- Xem danh sách món ăn
- Lọc món theo danh mục
- Tìm kiếm món ăn
- Xem chi tiết món
- Thêm món vào giỏ hàng
- Cập nhật số lượng món trong giỏ
- Xóa món khỏi giỏ
- Xác nhận đặt món
- Nhập địa chỉ giao hàng và số điện thoại nhận hàng
- Chọn hình thức thanh toán: `TienMat`, `ChuyenKhoan`, `VNPay`, `MoMo`
- Theo dõi trạng thái đơn hàng
- Theo dõi trạng thái giao hàng
- Hủy đơn khi còn trong trạng thái cho phép
- Đánh giá món ăn sau khi đơn `HoanThanh`

### 3. Giỏ hàng

Dựa trên `GIOHANG` và `CHITIETGIOHANG`.

Quy tắc chính:

- Mỗi khách tại một thời điểm chỉ có tối đa một giỏ `Active`.
- Một món chỉ xuất hiện một lần trong cùng một giỏ.
- Nếu thêm lại món đã có trong giỏ thì tăng số lượng.
- Khi đặt hàng thành công, giỏ chuyển sang `DatHang`.
- Giỏ có thể ở trạng thái `Active`, `DatHang`, `Huy`.

### 4. Đơn hàng

Dựa trên `DONHANG` và `CHITIETDONHANG`.

Trạng thái đơn hàng chuẩn:

- `ChoXacNhan`: đơn đang chờ xác nhận
- `DangChuanBi`: đơn đang chuẩn bị
- `DangGiao`: đơn đang giao
- `HoanThanh`: đơn đã hoàn thành
- `DaHuy`: đơn đã hủy

Quy tắc chính:

- Khi khách xác nhận đặt món, hệ thống chốt `DonGia` từ `MONAN.Gia`.
- `ThanhTien = SoLuong × DonGia × (1 - PhanTramGiam/100)`.
- `TongTien = SUM(ThanhTien) + PhiShip`.
- Nếu hủy đơn phải lưu `LyDoHuy`.

### 5. Thanh toán

Dựa trên `THANHTOAN`.

Quy tắc mới:

- Không lưu phương thức thanh toán trong `DONHANG`.
- Hình thức thanh toán chỉ lưu ở `THANHTOAN.HinhThuc`.
- Một đơn có thể có nhiều lần thử thanh toán.
- Tầng service chỉ cho tối đa một giao dịch `ThanhCong` cho mỗi đơn.

Trạng thái thanh toán:

- `DangXuLy`
- `ThanhCong`
- `ThatBai`
- `HoanTien`

Luồng chính:

- COD / tiền mặt: tạo thanh toán `DangXuLy`, khi giao thành công mới cập nhật `ThanhCong`.
- Online: tạo thanh toán `DangXuLy`, gửi qua cổng thanh toán, cập nhật `ThanhCong` hoặc `ThatBai` theo kết quả.

### 6. Giao hàng và shipper

Dựa trên `SHIPPER` và `GIAOHANG`.

Quy tắc mới:

- Shipper là tài khoản riêng trong `TAIKHOAN`.
- `SHIPPER.MaTK` liên kết với `TAIKHOAN.MaTK`.
- `GIAOHANG.MaShipper` có thể `NULL` khi đơn chưa được phân công.
- Không dùng `TenShipper` / `SDTShipper` dạng text trong schema mới.

Trạng thái giao hàng:

- `ChoNhan`: chờ shipper nhận
- `DangGiao`: đang giao hàng
- `DaGiao`: đã giao hàng

Chức năng cần có:

- Nhân viên phân công shipper cho đơn
- Shipper nhận đơn giao hàng
- Shipper cập nhật trạng thái đang giao
- Shipper xác nhận đã giao hàng
- Hệ thống đồng bộ trạng thái giao hàng với trạng thái đơn hàng ở tầng service

### 7. Nhân viên / Admin

Dựa trên `NHANVIEN`, `DANHMUC`, `MONAN`, `DONHANG`, `GIAOHANG`, `THANHTOAN`, `SHIPPER`.

Chức năng cần có:

- Quản lý danh mục món ăn
- Quản lý món ăn
- Cập nhật trạng thái món: `CoSan`, `HetMon`, `NgungBan`
- Quản lý giảm giá món bằng `PhanTramGiam`
- Xác nhận đơn hàng
- Cập nhật đơn sang đang chuẩn bị
- Phân công shipper
- Theo dõi giao hàng
- Xử lý hủy đơn
- Quản lý thanh toán
- Thống kê đơn hàng, doanh thu, món bán chạy, khách hàng

### 8. Đánh giá món ăn

Dựa trên `DANHGIA`.

Quy tắc chính:

- Chỉ đánh giá khi `DONHANG.TrangThai = 'HoanThanh'`.
- Món được đánh giá phải tồn tại trong `CHITIETDONHANG` của đơn đó.
- Đơn hàng phải thuộc về khách hàng đang đánh giá.
- Mỗi khách chỉ đánh giá một món trong một đơn một lần, theo unique `(MaKH, MaMon, MaDH)`.
- Trạng thái đánh giá: `HienThi`, `DaAn`.

## Đối chiếu với Activity / Sequence ngôn ngữ tự nhiên

Các file Activity và Sequence ngôn ngữ tự nhiên dùng nhãn nghiệp vụ dễ hiểu, còn SQL dùng enum ngắn. Khi triển khai giao diện/code cần map đúng như sau:

| Nhãn tự nhiên | Giá trị SQL |
|---|---|
| Tài khoản bị khóa | `KhoaTam` |
| Tài khoản chưa kích hoạt / chờ xác thực | `ChoDuyet` |
| Tài khoản đang hoạt động | `HoatDong` |
| Món còn bán | `CoSan` |
| Món hết hàng | `HetMon` |
| Món ngừng bán | `NgungBan` |
| Giỏ hàng đang dùng | `Active` |
| Giỏ hàng đã đặt hàng | `DatHang` |
| Giỏ hàng đã hủy | `Huy` |
| Đơn đang chờ xác nhận | `ChoXacNhan` |
| Đơn đang chuẩn bị | `DangChuanBi` |
| Đơn đang giao | `DangGiao` |
| Đơn đã hoàn thành | `HoanThanh` |
| Đơn đã hủy | `DaHuy` |
| Thanh toán đang xử lý | `DangXuLy` |
| Thanh toán thành công | `ThanhCong` |
| Thanh toán thất bại | `ThatBai` |
| Đã hoàn tiền / cần hoàn tiền | `HoanTien` |
| Chờ shipper nhận | `ChoNhan` |
| Đang giao hàng | `DangGiao` |
| Đã giao hàng | `DaGiao` |

## Trạng thái code hiện tại so với SQL mới

Code demo hiện tại đã có giao diện và backend cơ bản, nhưng còn một số phần đang theo schema demo cũ:

- `server/db.js` chưa có bảng `SHIPPER`.
- `GIAOHANG` trong demo còn dùng `TenShipper`, `SDTShipper`.
- `DONHANG` trong demo còn `PhuongThucTT`.
- `THANHTOAN.MaDH` trong demo đang unique.
- `GIOHANG.MaKH` trong demo đang unique.
- Demo chưa có bảng và giao diện `DANHGIA`.
- Vai trò trong code đang dùng `KHACHHANG`, `NHANVIEN`, `ADMIN`, chưa đồng bộ với `KhachHang`, `NhanVien`, `Shipper`, `Admin`.

Vì vậy `sql.md` là chuẩn thiết kế mới nhất; bước tiếp theo là cập nhật backend và giao diện để khớp hoàn toàn.

## Cấu trúc project hiện tại

```text
.
├── index.html
├── package.json
├── README.md
├── sql.md
├── server/
│   ├── db.js
│   └── index.js
└── src/
    ├── main.jsx
    └── styles.css
```
