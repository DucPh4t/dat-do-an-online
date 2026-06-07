# Đặt Đồ Ăn Online

Repository cho project **hệ thống đặt đồ ăn online**.

## Mục tiêu

Xây dựng hệ thống cho phép khách hàng xem món ăn, thêm vào giỏ hàng, đặt món, thanh toán và theo dõi đơn hàng. Phía cửa hàng có thể quản lý món ăn, danh mục, đơn hàng và trạng thái xử lý.

## Chức năng chính

### Khách hàng

- Đăng ký / đăng nhập tài khoản
- Xem danh mục món ăn
- Tìm kiếm món ăn
- Thêm món vào giỏ hàng
- Đặt hàng
- Chọn phương thức thanh toán
- Theo dõi trạng thái đơn hàng

### Cửa hàng / Nhân viên

- Quản lý danh mục món ăn
- Quản lý món ăn
- Xác nhận đơn hàng
- Cập nhật trạng thái chế biến / giao hàng

### Thanh toán

- Hỗ trợ thanh toán khi nhận hàng (COD)
- Hỗ trợ thanh toán online theo thiết kế hệ thống
- Lưu trạng thái thanh toán của đơn hàng

### Shipper

- Nhận đơn giao hàng
- Cập nhật trạng thái giao hàng
- Hoàn tất giao hàng

## Cấu trúc thư mục dự kiến

```text
.
├── database/      # SQL, ERD, dữ liệu mẫu
├── diagrams/      # Use Case, Activity, Sequence, Class Diagram
├── docs/          # Tài liệu phân tích thiết kế hệ thống
└── src/           # Source code chính của project
```

## Công nghệ dự kiến

Có thể triển khai theo một trong các hướng sau:

- Frontend: HTML, CSS, JavaScript hoặc React
- Backend: Node.js / Express, PHP, Java Spring Boot hoặc ASP.NET
- Database: MySQL / SQL Server
- Diagram: Draw.io, StarUML

## Trạng thái project

Đang khởi tạo repository và chuẩn bị cấu trúc ban đầu.
