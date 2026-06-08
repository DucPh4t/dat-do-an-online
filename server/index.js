import crypto from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { db, initDatabase } from './db.js';

initDatabase();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const tokens = new Map();
const PORT = Number(process.env.PORT || 4000);
const SHIPPING_FEE = 15000;

app.use(cors());
app.use(express.json());

const ok = (res, data = {}) => res.json(data);
const bad = (res, message, status = 400) => res.status(status).json({ message });

const roleForUi = (role) => ({ KhachHang: 'KHACHHANG', NhanVien: 'NHANVIEN', Shipper: 'SHIPPER', Admin: 'ADMIN' }[role] || role);
const dishStatusFromUi = (value) => {
  if (value === true || value === 1 || value === '1') return 'CoSan';
  if (value === false || value === 0 || value === '0') return 'NgungBan';
  return value || 'CoSan';
};
const paymentMethodFromUi = (value = 'TienMat') => ({
  'Tiền mặt': 'TienMat', 'Chuyển khoản': 'ChuyenKhoan', 'Ví điện tử': 'MoMo',
  TienMat: 'TienMat', ChuyenKhoan: 'ChuyenKhoan', VNPay: 'VNPay', MoMo: 'MoMo'
}[value] || 'TienMat');
const orderStatusFromUi = (value) => ({
  'Chờ xác nhận': 'ChoXacNhan', 'Đang xử lý': 'DangChuanBi', 'Đang chuẩn bị': 'DangChuanBi',
  'Đang giao': 'DangGiao', 'Hoàn thành': 'HoanThanh', 'Đã hủy': 'DaHuy',
  ChoXacNhan: 'ChoXacNhan', DangChuanBi: 'DangChuanBi', DangGiao: 'DangGiao', HoanThanh: 'HoanThanh', DaHuy: 'DaHuy'
}[value] || null);
const deliveryStatusFromUi = (value) => ({
  'Chờ phân công': 'ChoNhan', 'Chờ nhận': 'ChoNhan', 'Đang giao': 'DangGiao', 'Đã giao': 'DaGiao',
  ChoNhan: 'ChoNhan', DangGiao: 'DangGiao', DaGiao: 'DaGiao'
}[value] || null);

function publicAccount(row) {
  if (!row) return null;
  return {
    MaTK: row.MaTK,
    Email: row.Email,
    HoTen: row.HoTen,
    SDT: row.SDT,
    VaiTro: roleForUi(row.VaiTro),
    VaiTroSQL: row.VaiTro,
    TrangThai: row.TrangThai,
    MaKH: row.MaKH,
    MaNV: row.MaNV,
    MaShipper: row.MaShipper,
    DiaChi: row.DiaChi,
    AnhDaiDien: row.AnhDaiDien,
    ChucVu: row.ChucVu,
    BienSoXe: row.BienSoXe,
    KhuVucGiao: row.KhuVucGiao
  };
}

function findAccountById(id) {
  return db.prepare(`
    SELECT tk.*, kh.MaKH, kh.DiaChi, kh.AnhDaiDien, nv.MaNV, nv.ChucVu, sp.MaShipper, sp.BienSoXe, sp.KhuVucGiao
    FROM TAIKHOAN tk
    LEFT JOIN KHACHHANG kh ON kh.MaTK = tk.MaTK
    LEFT JOIN NHANVIEN nv ON nv.MaTK = tk.MaTK
    LEFT JOIN SHIPPER sp ON sp.MaTK = tk.MaTK
    WHERE tk.MaTK = ?
  `).get(id);
}

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const accountId = token ? tokens.get(token) : null;
  if (!accountId) return bad(res, 'Vui lòng đăng nhập.', 401);
  const account = findAccountById(accountId);
  if (!account || account.TrangThai !== 'HoatDong') return bad(res, 'Tài khoản không hợp lệ.', 401);
  req.user = publicAccount(account);
  next();
}
function requireAdmin(req, res, next) {
  if (!['ADMIN', 'NHANVIEN'].includes(req.user?.VaiTro)) return bad(res, 'Bạn không có quyền thực hiện thao tác này.', 403);
  next();
}
function requireShipper(req, res, next) {
  if (req.user?.VaiTro !== 'SHIPPER' || !req.user.MaShipper) return bad(res, 'Chỉ shipper mới được thực hiện thao tác này.', 403);
  next();
}

function ensureCart(maKH) {
  const existing = db.prepare("SELECT * FROM GIOHANG WHERE MaKH = ? AND TrangThai = 'Active' ORDER BY MaGH DESC LIMIT 1").get(maKH);
  if (existing) return existing.MaGH;
  return db.prepare('INSERT INTO GIOHANG (MaKH, NgayTao, TrangThai) VALUES (?, ?, ?)').run(maKH, new Date().toISOString(), 'Active').lastInsertRowid;
}

function cartRows(maKH) {
  const maGH = ensureCart(maKH);
  const items = db.prepare(`
    SELECT ct.MaCTGH, ct.MaGH, ct.MaMon, ct.SoLuong, ct.GiaTaiThoiDiem,
           m.TenMon, m.HinhAnh, m.PhanTramGiam, m.TrangThai,
           ROUND(ct.GiaTaiThoiDiem * (1 - m.PhanTramGiam / 100.0), 0) AS GiaSauGiam,
           ROUND(ct.SoLuong * ct.GiaTaiThoiDiem * (1 - m.PhanTramGiam / 100.0), 0) AS ThanhTien
    FROM CHITIETGIOHANG ct
    JOIN MONAN m ON m.MaMon = ct.MaMon
    WHERE ct.MaGH = ?
    ORDER BY ct.MaCTGH DESC
  `).all(maGH);
  const subtotal = items.reduce((sum, item) => sum + item.ThanhTien, 0);
  return { MaGH: maGH, items, subtotal, shipping: items.length ? SHIPPING_FEE : 0, total: subtotal + (items.length ? SHIPPING_FEE : 0) };
}

function orderDetails(maDH) {
  const order = db.prepare(`
    SELECT dh.*, tk.HoTen AS TenKhach, tk.SDT AS SDTKhach, nvtk.HoTen AS TenNhanVien
    FROM DONHANG dh
    JOIN KHACHHANG kh ON kh.MaKH = dh.MaKH
    JOIN TAIKHOAN tk ON tk.MaTK = kh.MaTK
    LEFT JOIN NHANVIEN nv ON nv.MaNV = dh.MaNV
    LEFT JOIN TAIKHOAN nvtk ON nvtk.MaTK = nv.MaTK
    WHERE dh.MaDH = ?
  `).get(maDH);
  if (!order) return null;
  const items = db.prepare(`SELECT ct.*, m.TenMon, m.HinhAnh FROM CHITIETDONHANG ct JOIN MONAN m ON m.MaMon = ct.MaMon WHERE ct.MaDH = ?`).all(maDH);
  const payment = db.prepare('SELECT * FROM THANHTOAN WHERE MaDH = ? ORDER BY MaTT DESC LIMIT 1').get(maDH);
  const delivery = db.prepare(`
    SELECT gh.*, tk.HoTen AS TenShipper, tk.SDT AS SDTShipper, sp.BienSoXe, sp.KhuVucGiao
    FROM GIAOHANG gh
    LEFT JOIN SHIPPER sp ON sp.MaShipper = gh.MaShipper
    LEFT JOIN TAIKHOAN tk ON tk.MaTK = sp.MaTK
    WHERE gh.MaDH = ?
  `).get(maDH);
  const reviews = db.prepare('SELECT * FROM DANHGIA WHERE MaDH = ? ORDER BY MaDG DESC').all(maDH);
  return { ...order, items, payment, delivery, reviews };
}

app.get('/api/health', (_req, res) => ok(res, { status: 'ok' }));

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const account = db.prepare('SELECT * FROM TAIKHOAN WHERE Email = ? AND MatKhauHash = ?').get(email, password);
  if (!account) return bad(res, 'Email hoặc mật khẩu không đúng.', 401);
  const token = crypto.randomUUID();
  tokens.set(token, account.MaTK);
  ok(res, { token, user: publicAccount(findAccountById(account.MaTK)) });
});

app.post('/api/auth/register', (req, res) => {
  const { HoTen, Email, MatKhau, SDT, DiaChi } = req.body;
  if (!HoTen || !Email || !MatKhau) return bad(res, 'Vui lòng nhập họ tên, email và mật khẩu.');
  const exists = db.prepare('SELECT MaTK FROM TAIKHOAN WHERE Email = ?').get(Email);
  if (exists) return bad(res, 'Email đã được sử dụng.');
  const result = db.prepare(`INSERT INTO TAIKHOAN (Email, MatKhauHash, HoTen, SDT, VaiTro, TrangThai, NgayTao) VALUES (?, ?, ?, ?, 'KhachHang', 'HoatDong', ?)`).run(Email, MatKhau, HoTen, SDT || '', new Date().toISOString());
  const maKH = db.prepare('INSERT INTO KHACHHANG (MaTK, DiaChi, AnhDaiDien) VALUES (?, ?, ?)').run(result.lastInsertRowid, DiaChi || '', '').lastInsertRowid;
  ensureCart(maKH);
  const token = crypto.randomUUID();
  tokens.set(token, result.lastInsertRowid);
  ok(res, { token, user: publicAccount(findAccountById(result.lastInsertRowid)) });
});

app.get('/api/auth/me', requireAuth, (req, res) => ok(res, { user: req.user }));

app.get('/api/categories', (_req, res) => ok(res, { categories: db.prepare('SELECT * FROM DANHMUC ORDER BY ThuTu, MaDM').all() }));
app.post('/api/categories', requireAuth, requireAdmin, (req, res) => {
  const { TenDM, MoTa, HinhAnh, ThuTu } = req.body;
  if (!TenDM) return bad(res, 'Tên danh mục không được để trống.');
  const result = db.prepare('INSERT INTO DANHMUC (TenDM, MoTa, HinhAnh, ThuTu) VALUES (?, ?, ?, ?)').run(TenDM, MoTa || '', HinhAnh || '', Number(ThuTu || 0));
  ok(res, { category: db.prepare('SELECT * FROM DANHMUC WHERE MaDM = ?').get(result.lastInsertRowid) });
});
app.put('/api/categories/:id', requireAuth, requireAdmin, (req, res) => {
  const { TenDM, MoTa, HinhAnh, ThuTu } = req.body;
  if (!TenDM) return bad(res, 'Tên danh mục không được để trống.');
  db.prepare('UPDATE DANHMUC SET TenDM = ?, MoTa = ?, HinhAnh = ?, ThuTu = ? WHERE MaDM = ?').run(TenDM, MoTa || '', HinhAnh || '', Number(ThuTu || 0), req.params.id);
  ok(res, { category: db.prepare('SELECT * FROM DANHMUC WHERE MaDM = ?').get(req.params.id) });
});
app.delete('/api/categories/:id', requireAuth, requireAdmin, (req, res) => {
  const used = db.prepare('SELECT COUNT(*) AS total FROM MONAN WHERE MaDM = ?').get(req.params.id).total;
  if (used > 0) return bad(res, 'Không thể xóa danh mục đang có món ăn.');
  db.prepare('DELETE FROM DANHMUC WHERE MaDM = ?').run(req.params.id);
  ok(res, { success: true });
});

app.get('/api/shippers', requireAuth, requireAdmin, (_req, res) => {
  const shippers = db.prepare(`
    SELECT sp.MaShipper, sp.MaTK, sp.BienSoXe, sp.KhuVucGiao, tk.HoTen, tk.SDT, tk.Email, tk.TrangThai
    FROM SHIPPER sp JOIN TAIKHOAN tk ON tk.MaTK = sp.MaTK
    ORDER BY sp.MaShipper
  `).all();
  ok(res, { shippers });
});
app.post('/api/shippers', requireAuth, requireAdmin, (req, res) => {
  const { HoTen, Email, MatKhau, SDT, BienSoXe, KhuVucGiao } = req.body;
  if (!HoTen || !Email || !MatKhau) return bad(res, 'Vui lòng nhập họ tên, email và mật khẩu shipper.');
  const exists = db.prepare('SELECT MaTK FROM TAIKHOAN WHERE Email = ?').get(Email);
  if (exists) return bad(res, 'Email shipper đã tồn tại.');
  const tk = db.prepare(`INSERT INTO TAIKHOAN (Email, MatKhauHash, HoTen, SDT, VaiTro, TrangThai, NgayTao) VALUES (?, ?, ?, ?, 'Shipper', 'HoatDong', ?)`).run(Email, MatKhau, HoTen, SDT || '', new Date().toISOString());
  const sp = db.prepare('INSERT INTO SHIPPER (MaTK, BienSoXe, KhuVucGiao) VALUES (?, ?, ?)').run(tk.lastInsertRowid, BienSoXe || '', KhuVucGiao || '');
  ok(res, { shipper: db.prepare(`SELECT sp.MaShipper, sp.MaTK, sp.BienSoXe, sp.KhuVucGiao, tk.HoTen, tk.SDT, tk.Email, tk.TrangThai FROM SHIPPER sp JOIN TAIKHOAN tk ON tk.MaTK = sp.MaTK WHERE sp.MaShipper = ?`).get(sp.lastInsertRowid) });
});
app.put('/api/shippers/:id', requireAuth, requireAdmin, (req, res) => {
  const { HoTen, Email, MatKhau, SDT, BienSoXe, KhuVucGiao, TrangThai } = req.body;
  const shipper = db.prepare('SELECT * FROM SHIPPER WHERE MaShipper = ?').get(req.params.id);
  if (!shipper) return bad(res, 'Không tìm thấy shipper.', 404);
  if (!HoTen || !Email) return bad(res, 'Vui lòng nhập họ tên và email shipper.');
  if (MatKhau) db.prepare('UPDATE TAIKHOAN SET Email = ?, MatKhauHash = ?, HoTen = ?, SDT = ?, TrangThai = ? WHERE MaTK = ?').run(Email, MatKhau, HoTen, SDT || '', TrangThai || 'HoatDong', shipper.MaTK);
  else db.prepare('UPDATE TAIKHOAN SET Email = ?, HoTen = ?, SDT = ?, TrangThai = ? WHERE MaTK = ?').run(Email, HoTen, SDT || '', TrangThai || 'HoatDong', shipper.MaTK);
  db.prepare('UPDATE SHIPPER SET BienSoXe = ?, KhuVucGiao = ? WHERE MaShipper = ?').run(BienSoXe || '', KhuVucGiao || '', req.params.id);
  ok(res, { shipper: db.prepare(`SELECT sp.MaShipper, sp.MaTK, sp.BienSoXe, sp.KhuVucGiao, tk.HoTen, tk.SDT, tk.Email, tk.TrangThai FROM SHIPPER sp JOIN TAIKHOAN tk ON tk.MaTK = sp.MaTK WHERE sp.MaShipper = ?`).get(req.params.id) });
});
app.delete('/api/shippers/:id', requireAuth, requireAdmin, (req, res) => {
  const shipper = db.prepare('SELECT * FROM SHIPPER WHERE MaShipper = ?').get(req.params.id);
  if (!shipper) return bad(res, 'Không tìm thấy shipper.', 404);
  db.prepare("UPDATE TAIKHOAN SET TrangThai = 'KhoaTam' WHERE MaTK = ?").run(shipper.MaTK);
  ok(res, { success: true });
});

app.get('/api/dishes', (req, res) => {
  const search = `%${String(req.query.search || '').trim()}%`;
  const category = Number(req.query.category || 0);
  const onlyActive = req.query.active === '1';
  const rows = db.prepare(`
    SELECT m.*, dm.TenDM, ROUND(m.Gia * (1 - m.PhanTramGiam / 100.0), 0) AS GiaSauGiam
    FROM MONAN m JOIN DANHMUC dm ON dm.MaDM = m.MaDM
    WHERE (? = 0 OR m.MaDM = ?) AND (? = '%%' OR m.TenMon LIKE ? OR m.MoTa LIKE ?) AND (? = 0 OR m.TrangThai = 'CoSan')
    ORDER BY m.MaMon DESC
  `).all(category, category, search, search, search, onlyActive ? 1 : 0);
  ok(res, { dishes: rows });
});

app.get('/api/dishes/:id', (req, res) => {
  const dish = db.prepare(`SELECT m.*, dm.TenDM, ROUND(m.Gia * (1 - m.PhanTramGiam / 100.0), 0) AS GiaSauGiam FROM MONAN m JOIN DANHMUC dm ON dm.MaDM = m.MaDM WHERE m.MaMon = ?`).get(req.params.id);
  if (!dish) return bad(res, 'Không tìm thấy món ăn.', 404);
  const reviews = db.prepare(`SELECT dg.*, tk.HoTen AS TenKhach FROM DANHGIA dg JOIN KHACHHANG kh ON kh.MaKH = dg.MaKH JOIN TAIKHOAN tk ON tk.MaTK = kh.MaTK WHERE dg.MaMon = ? AND dg.TrangThai = 'HienThi' ORDER BY dg.MaDG DESC`).all(req.params.id);
  ok(res, { dish, reviews });
});

app.post('/api/dishes', requireAuth, requireAdmin, (req, res) => {
  const { MaDM, TenMon, Gia, HinhAnh, MoTa, TrangThai, PhanTramGiam } = req.body;
  if (!MaDM || !TenMon || !Gia) return bad(res, 'Thiếu thông tin món ăn.');
  const result = db.prepare(`INSERT INTO MONAN (MaDM, TenMon, Gia, HinhAnh, MoTa, TrangThai, PhanTramGiam, NgayTao, NgayCapNhat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(MaDM, TenMon, Gia, HinhAnh || '', MoTa || '', dishStatusFromUi(TrangThai), PhanTramGiam || 0, new Date().toISOString(), new Date().toISOString());
  ok(res, { dish: db.prepare('SELECT * FROM MONAN WHERE MaMon = ?').get(result.lastInsertRowid) });
});

app.put('/api/dishes/:id', requireAuth, requireAdmin, (req, res) => {
  const { MaDM, TenMon, Gia, HinhAnh, MoTa, TrangThai, PhanTramGiam } = req.body;
  db.prepare(`UPDATE MONAN SET MaDM = ?, TenMon = ?, Gia = ?, HinhAnh = ?, MoTa = ?, TrangThai = ?, PhanTramGiam = ?, NgayCapNhat = ? WHERE MaMon = ?`).run(MaDM, TenMon, Gia, HinhAnh || '', MoTa || '', dishStatusFromUi(TrangThai), PhanTramGiam || 0, new Date().toISOString(), req.params.id);
  ok(res, { dish: db.prepare('SELECT * FROM MONAN WHERE MaMon = ?').get(req.params.id) });
});

app.delete('/api/dishes/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare("UPDATE MONAN SET TrangThai = 'NgungBan', NgayCapNhat = ? WHERE MaMon = ?").run(new Date().toISOString(), req.params.id);
  ok(res, { success: true });
});

app.get('/api/cart', requireAuth, (req, res) => {
  if (!req.user.MaKH) return bad(res, 'Chỉ khách hàng mới có giỏ hàng.', 403);
  ok(res, { cart: cartRows(req.user.MaKH) });
});
app.post('/api/cart/items', requireAuth, (req, res) => {
  if (!req.user.MaKH) return bad(res, 'Chỉ khách hàng mới có giỏ hàng.', 403);
  const maGH = ensureCart(req.user.MaKH);
  const dish = db.prepare("SELECT * FROM MONAN WHERE MaMon = ? AND TrangThai = 'CoSan'").get(req.body.MaMon);
  if (!dish) return bad(res, 'Món ăn không khả dụng.', 404);
  const qty = Math.max(1, Number(req.body.SoLuong || 1));
  db.prepare(`INSERT INTO CHITIETGIOHANG (MaGH, MaMon, SoLuong, GiaTaiThoiDiem) VALUES (?, ?, ?, ?) ON CONFLICT(MaGH, MaMon) DO UPDATE SET SoLuong = SoLuong + excluded.SoLuong`).run(maGH, dish.MaMon, qty, dish.Gia);
  ok(res, { cart: cartRows(req.user.MaKH) });
});
app.patch('/api/cart/items/:id', requireAuth, (req, res) => {
  if (!req.user.MaKH) return bad(res, 'Chỉ khách hàng mới có giỏ hàng.', 403);
  const qty = Math.max(1, Number(req.body.SoLuong || 1));
  db.prepare('UPDATE CHITIETGIOHANG SET SoLuong = ? WHERE MaCTGH = ?').run(qty, req.params.id);
  ok(res, { cart: cartRows(req.user.MaKH) });
});
app.delete('/api/cart/items/:id', requireAuth, (req, res) => {
  if (!req.user.MaKH) return bad(res, 'Chỉ khách hàng mới có giỏ hàng.', 403);
  db.prepare('DELETE FROM CHITIETGIOHANG WHERE MaCTGH = ?').run(req.params.id);
  ok(res, { cart: cartRows(req.user.MaKH) });
});

app.post('/api/orders', requireAuth, (req, res) => {
  if (!req.user.MaKH) return bad(res, 'Chỉ khách hàng mới được đặt hàng.', 403);
  const cart = cartRows(req.user.MaKH);
  if (!cart.items.length) return bad(res, 'Giỏ hàng đang trống.');
  const address = req.body.DiaChiGiao || req.user.DiaChi;
  const phone = req.body.SDTNhanHang || req.user.SDT;
  const method = paymentMethodFromUi(req.body.PhuongThucTT || req.body.HinhThuc);
  if (!address || !phone) return bad(res, 'Vui lòng nhập địa chỉ và số điện thoại nhận hàng.');
  const result = db.prepare(`INSERT INTO DONHANG (MaKH, MaNV, NgayDat, DiaChiGiao, SDTNhanHang, TongTien, PhiShip, TrangThai, LyDoHuy) VALUES (?, NULL, ?, ?, ?, ?, ?, 'ChoXacNhan', NULL)`).run(req.user.MaKH, new Date().toISOString(), address, phone, cart.total, cart.shipping);
  const maDH = result.lastInsertRowid;
  const insertDetail = db.prepare(`INSERT INTO CHITIETDONHANG (MaDH, MaMon, SoLuong, DonGia, PhanTramGiam, ThanhTien) VALUES (?, ?, ?, ?, ?, ?)`);
  cart.items.forEach((item) => insertDetail.run(maDH, item.MaMon, item.SoLuong, item.GiaTaiThoiDiem, item.PhanTramGiam, item.ThanhTien));
  db.prepare('INSERT INTO THANHTOAN (MaDH, ThoiGianTT, SoTien, HinhThuc, TrangThai, MaGiaoDich) VALUES (?, NULL, ?, ?, ?, ?)').run(maDH, cart.total, method, method === 'TienMat' ? 'DangXuLy' : 'ThanhCong', `PAY${String(maDH).padStart(4, '0')}`);
  db.prepare('INSERT INTO GIAOHANG (MaDH, MaShipper, TrangThai) VALUES (?, NULL, ?)').run(maDH, 'ChoNhan');
  db.prepare("UPDATE GIOHANG SET TrangThai = 'DatHang' WHERE MaGH = ?").run(cart.MaGH);
  ok(res, { order: orderDetails(maDH), cart: cartRows(req.user.MaKH) });
});

app.get('/api/orders', requireAuth, (req, res) => {
  let rows;
  if (req.user.MaKH) rows = db.prepare('SELECT MaDH FROM DONHANG WHERE MaKH = ? ORDER BY MaDH DESC').all(req.user.MaKH);
  else if (req.user.MaShipper) rows = db.prepare(`SELECT dh.MaDH FROM DONHANG dh JOIN GIAOHANG gh ON gh.MaDH = dh.MaDH WHERE gh.MaShipper = ? OR gh.MaShipper IS NULL ORDER BY dh.MaDH DESC`).all(req.user.MaShipper);
  else rows = db.prepare('SELECT MaDH FROM DONHANG ORDER BY MaDH DESC').all();
  ok(res, { orders: rows.map((row) => orderDetails(row.MaDH)) });
});

app.get('/api/orders/:id', requireAuth, (req, res) => {
  const order = orderDetails(req.params.id);
  if (!order) return bad(res, 'Không tìm thấy đơn hàng.', 404);
  if (req.user.MaKH && order.MaKH !== req.user.MaKH) return bad(res, 'Bạn không có quyền xem đơn này.', 403);
  ok(res, { order });
});

app.patch('/api/orders/:id', requireAuth, requireAdmin, (req, res) => {
  const trangThai = orderStatusFromUi(req.body.TrangThai);
  const trangThaiGiao = deliveryStatusFromUi(req.body.TrangThaiGiao);
  const maShipper = req.body.MaShipper || null;
  const staffId = req.user.MaNV || db.prepare('SELECT MaNV FROM NHANVIEN ORDER BY MaNV LIMIT 1').get()?.MaNV;
  db.prepare('UPDATE DONHANG SET TrangThai = COALESCE(?, TrangThai), MaNV = COALESCE(?, MaNV) WHERE MaDH = ?').run(trangThai, staffId, req.params.id);
  db.prepare(`UPDATE GIAOHANG SET MaShipper = COALESCE(?, MaShipper), TrangThai = COALESCE(?, TrangThai), ThoiGianNhan = CASE WHEN ? IN ('DangGiao', 'DaGiao') AND ThoiGianNhan IS NULL THEN ? ELSE ThoiGianNhan END, ThoiGianGiao = CASE WHEN ? = 'DaGiao' AND ThoiGianGiao IS NULL THEN ? ELSE ThoiGianGiao END WHERE MaDH = ?`).run(maShipper, trangThaiGiao, trangThaiGiao, new Date().toISOString(), trangThaiGiao, new Date().toISOString(), req.params.id);
  if (trangThai === 'HoanThanh' || trangThaiGiao === 'DaGiao') db.prepare("UPDATE THANHTOAN SET TrangThai = 'ThanhCong', ThoiGianTT = COALESCE(ThoiGianTT, ?) WHERE MaDH = ? AND HinhThuc = 'TienMat'").run(new Date().toISOString(), req.params.id);
  ok(res, { order: orderDetails(req.params.id) });
});

app.patch('/api/shipper/orders/:id', requireAuth, requireShipper, (req, res) => {
  const trangThaiGiao = deliveryStatusFromUi(req.body.TrangThaiGiao) || 'DangGiao';
  const current = db.prepare('SELECT * FROM GIAOHANG WHERE MaDH = ?').get(req.params.id);
  if (!current) return bad(res, 'Không tìm thấy thông tin giao hàng.', 404);
  if (current.MaShipper && current.MaShipper !== req.user.MaShipper) return bad(res, 'Đơn đã được phân công cho shipper khác.', 403);
  db.prepare(`UPDATE GIAOHANG SET MaShipper = COALESCE(MaShipper, ?), TrangThai = ?, ThoiGianNhan = CASE WHEN ThoiGianNhan IS NULL THEN ? ELSE ThoiGianNhan END, ThoiGianGiao = CASE WHEN ? = 'DaGiao' AND ThoiGianGiao IS NULL THEN ? ELSE ThoiGianGiao END WHERE MaDH = ?`).run(req.user.MaShipper, trangThaiGiao, new Date().toISOString(), trangThaiGiao, new Date().toISOString(), req.params.id);
  if (trangThaiGiao === 'DangGiao') db.prepare("UPDATE DONHANG SET TrangThai = 'DangGiao' WHERE MaDH = ?").run(req.params.id);
  if (trangThaiGiao === 'DaGiao') {
    db.prepare("UPDATE DONHANG SET TrangThai = 'HoanThanh' WHERE MaDH = ?").run(req.params.id);
    db.prepare("UPDATE THANHTOAN SET TrangThai = 'ThanhCong', ThoiGianTT = COALESCE(ThoiGianTT, ?) WHERE MaDH = ? AND HinhThuc = 'TienMat'").run(new Date().toISOString(), req.params.id);
  }
  ok(res, { order: orderDetails(req.params.id) });
});

app.post('/api/reviews', requireAuth, (req, res) => {
  if (!req.user.MaKH) return bad(res, 'Chỉ khách hàng mới được đánh giá.', 403);
  const { MaDH, MaMon, SoSao, NoiDung } = req.body;
  const order = db.prepare("SELECT * FROM DONHANG WHERE MaDH = ? AND MaKH = ? AND TrangThai = 'HoanThanh'").get(MaDH, req.user.MaKH);
  if (!order) return bad(res, 'Chỉ được đánh giá đơn hàng đã hoàn thành của bạn.', 400);
  const item = db.prepare('SELECT MaCTDH FROM CHITIETDONHANG WHERE MaDH = ? AND MaMon = ?').get(MaDH, MaMon);
  if (!item) return bad(res, 'Món ăn không thuộc đơn hàng này.', 400);
  try {
    db.prepare('INSERT INTO DANHGIA (MaKH, MaMon, MaDH, SoSao, NoiDung, NgayDanhGia, TrangThai) VALUES (?, ?, ?, ?, ?, ?, ?)').run(req.user.MaKH, MaMon, MaDH, Math.max(1, Math.min(5, Number(SoSao || 5))), NoiDung || '', new Date().toISOString(), 'HienThi');
  } catch {
    return bad(res, 'Bạn đã đánh giá món này trong đơn hàng này rồi.', 400);
  }
  ok(res, { order: orderDetails(MaDH) });
});

app.get('/api/admin/stats', requireAuth, requireAdmin, (_req, res) => {
  const totalOrders = db.prepare('SELECT COUNT(*) AS value FROM DONHANG').get().value;
  const revenue = db.prepare("SELECT COALESCE(SUM(TongTien), 0) AS value FROM DONHANG WHERE TrangThai != 'DaHuy'").get().value;
  const dishes = db.prepare('SELECT COUNT(*) AS value FROM MONAN').get().value;
  const customers = db.prepare('SELECT COUNT(*) AS value FROM KHACHHANG').get().value;
  const byStatus = db.prepare('SELECT TrangThai, COUNT(*) AS total FROM DONHANG GROUP BY TrangThai').all();
  ok(res, { stats: { totalOrders, revenue, dishes, customers, byStatus } });
});

const distDir = join(__dirname, '..', 'dist');
app.use(express.static(distDir));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
