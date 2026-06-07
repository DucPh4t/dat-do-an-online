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

function publicAccount(row) {
  if (!row) return null;
  return {
    MaTK: row.MaTK,
    Email: row.Email,
    HoTen: row.HoTen,
    SDT: row.SDT,
    VaiTro: row.VaiTro,
    TrangThai: row.TrangThai,
    MaKH: row.MaKH,
    MaNV: row.MaNV,
    DiaChi: row.DiaChi,
    AnhDaiDien: row.AnhDaiDien,
    ChucVu: row.ChucVu
  };
}

function findAccountById(id) {
  return db.prepare(`
    SELECT tk.*, kh.MaKH, kh.DiaChi, kh.AnhDaiDien, nv.MaNV, nv.ChucVu
    FROM TAIKHOAN tk
    LEFT JOIN KHACHHANG kh ON kh.MaTK = tk.MaTK
    LEFT JOIN NHANVIEN nv ON nv.MaTK = tk.MaTK
    WHERE tk.MaTK = ?
  `).get(id);
}

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const accountId = token ? tokens.get(token) : null;
  if (!accountId) return bad(res, 'Vui lòng đăng nhập.', 401);
  const account = findAccountById(accountId);
  if (!account || account.TrangThai !== 'Hoạt động') return bad(res, 'Tài khoản không hợp lệ.', 401);
  req.user = publicAccount(account);
  next();
}

function requireAdmin(req, res, next) {
  if (!['ADMIN', 'NHANVIEN'].includes(req.user?.VaiTro)) return bad(res, 'Bạn không có quyền thực hiện thao tác này.', 403);
  next();
}

function ensureCart(maKH) {
  const existing = db.prepare('SELECT * FROM GIOHANG WHERE MaKH = ?').get(maKH);
  if (existing) return existing.MaGH;
  return db.prepare('INSERT INTO GIOHANG (MaKH, NgayTao) VALUES (?, ?)').run(maKH, new Date().toISOString()).lastInsertRowid;
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
  const items = db.prepare(`
    SELECT ct.*, m.TenMon, m.HinhAnh
    FROM CHITIETDONHANG ct
    JOIN MONAN m ON m.MaMon = ct.MaMon
    WHERE ct.MaDH = ?
  `).all(maDH);
  const payment = db.prepare('SELECT * FROM THANHTOAN WHERE MaDH = ?').get(maDH);
  const delivery = db.prepare('SELECT * FROM GIAOHANG WHERE MaDH = ?').get(maDH);
  return { ...order, items, payment, delivery };
}

app.get('/api/health', (_req, res) => ok(res, { status: 'ok' }));

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const account = db.prepare('SELECT * FROM TAIKHOAN WHERE Email = ? AND MatKhau = ?').get(email, password);
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
  const result = db.prepare(`
    INSERT INTO TAIKHOAN (Email, MatKhau, HoTen, SDT, VaiTro, TrangThai, NgayTao)
    VALUES (?, ?, ?, ?, 'KHACHHANG', 'Hoạt động', ?)
  `).run(Email, MatKhau, HoTen, SDT || '', new Date().toISOString());
  const maKH = db.prepare('INSERT INTO KHACHHANG (MaTK, DiaChi, AnhDaiDien) VALUES (?, ?, ?)').run(result.lastInsertRowid, DiaChi || '', '').lastInsertRowid;
  ensureCart(maKH);
  const token = crypto.randomUUID();
  tokens.set(token, result.lastInsertRowid);
  ok(res, { token, user: publicAccount(findAccountById(result.lastInsertRowid)) });
});

app.get('/api/auth/me', requireAuth, (req, res) => ok(res, { user: req.user }));

app.get('/api/categories', (_req, res) => {
  ok(res, { categories: db.prepare('SELECT * FROM DANHMUC ORDER BY ThuTu, MaDM').all() });
});

app.get('/api/dishes', (req, res) => {
  const search = `%${String(req.query.search || '').trim()}%`;
  const category = Number(req.query.category || 0);
  const onlyActive = req.query.active === '1';
  const rows = db.prepare(`
    SELECT m.*, dm.TenDM,
           ROUND(m.Gia * (1 - m.PhanTramGiam / 100.0), 0) AS GiaSauGiam
    FROM MONAN m
    JOIN DANHMUC dm ON dm.MaDM = m.MaDM
    WHERE (? = 0 OR m.MaDM = ?)
      AND (? = '%%' OR m.TenMon LIKE ? OR m.MoTa LIKE ?)
      AND (? = 0 OR m.TrangThai = 1)
    ORDER BY m.MaMon DESC
  `).all(category, category, search, search, search, onlyActive ? 1 : 0);
  ok(res, { dishes: rows });
});

app.get('/api/dishes/:id', (req, res) => {
  const dish = db.prepare(`
    SELECT m.*, dm.TenDM, ROUND(m.Gia * (1 - m.PhanTramGiam / 100.0), 0) AS GiaSauGiam
    FROM MONAN m JOIN DANHMUC dm ON dm.MaDM = m.MaDM
    WHERE m.MaMon = ?
  `).get(req.params.id);
  if (!dish) return bad(res, 'Không tìm thấy món ăn.', 404);
  ok(res, { dish });
});

app.post('/api/dishes', requireAuth, requireAdmin, (req, res) => {
  const { MaDM, TenMon, Gia, HinhAnh, MoTa, TrangThai, PhanTramGiam } = req.body;
  if (!MaDM || !TenMon || !Gia) return bad(res, 'Thiếu thông tin món ăn.');
  const result = db.prepare(`
    INSERT INTO MONAN (MaDM, TenMon, Gia, HinhAnh, MoTa, TrangThai, PhanTramGiam)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(MaDM, TenMon, Gia, HinhAnh || '', MoTa || '', TrangThai ? 1 : 0, PhanTramGiam || 0);
  ok(res, { dish: db.prepare('SELECT * FROM MONAN WHERE MaMon = ?').get(result.lastInsertRowid) });
});

app.put('/api/dishes/:id', requireAuth, requireAdmin, (req, res) => {
  const { MaDM, TenMon, Gia, HinhAnh, MoTa, TrangThai, PhanTramGiam } = req.body;
  db.prepare(`
    UPDATE MONAN
    SET MaDM = ?, TenMon = ?, Gia = ?, HinhAnh = ?, MoTa = ?, TrangThai = ?, PhanTramGiam = ?
    WHERE MaMon = ?
  `).run(MaDM, TenMon, Gia, HinhAnh || '', MoTa || '', TrangThai ? 1 : 0, PhanTramGiam || 0, req.params.id);
  ok(res, { dish: db.prepare('SELECT * FROM MONAN WHERE MaMon = ?').get(req.params.id) });
});

app.delete('/api/dishes/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('UPDATE MONAN SET TrangThai = 0 WHERE MaMon = ?').run(req.params.id);
  ok(res, { success: true });
});

app.get('/api/cart', requireAuth, (req, res) => {
  if (!req.user.MaKH) return bad(res, 'Chỉ khách hàng mới có giỏ hàng.', 403);
  ok(res, { cart: cartRows(req.user.MaKH) });
});

app.post('/api/cart/items', requireAuth, (req, res) => {
  if (!req.user.MaKH) return bad(res, 'Chỉ khách hàng mới có giỏ hàng.', 403);
  const maGH = ensureCart(req.user.MaKH);
  const dish = db.prepare('SELECT * FROM MONAN WHERE MaMon = ? AND TrangThai = 1').get(req.body.MaMon);
  if (!dish) return bad(res, 'Món ăn không khả dụng.', 404);
  const qty = Math.max(1, Number(req.body.SoLuong || 1));
  db.prepare(`
    INSERT INTO CHITIETGIOHANG (MaGH, MaMon, SoLuong, GiaTaiThoiDiem)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(MaGH, MaMon) DO UPDATE SET SoLuong = SoLuong + excluded.SoLuong
  `).run(maGH, dish.MaMon, qty, dish.Gia);
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
  const method = req.body.PhuongThucTT || 'Tiền mặt';
  if (!address || !phone) return bad(res, 'Vui lòng nhập địa chỉ và số điện thoại nhận hàng.');

  const result = db.prepare(`
    INSERT INTO DONHANG (MaKH, MaNV, NgayDat, DiaChiGiao, SDTNhanHang, TongTien, PhiShip, TrangThai, PhuongThucTT)
    VALUES (?, NULL, ?, ?, ?, ?, ?, 'Chờ xác nhận', ?)
  `).run(req.user.MaKH, new Date().toISOString(), address, phone, cart.total, cart.shipping, method);
  const maDH = result.lastInsertRowid;
  const insertDetail = db.prepare(`
    INSERT INTO CHITIETDONHANG (MaDH, MaMon, SoLuong, DonGia, PhanTramGiam, ThanhTien)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  cart.items.forEach((item) => insertDetail.run(maDH, item.MaMon, item.SoLuong, item.GiaTaiThoiDiem, item.PhanTramGiam, item.ThanhTien));
  db.prepare('INSERT INTO THANHTOAN (MaDH, ThoiGianTT, SoTien, HinhThuc, TrangThai, MaGiaoDich) VALUES (?, NULL, ?, ?, ?, ?)')
    .run(maDH, cart.total, method, method === 'Tiền mặt' ? 'Chờ thanh toán' : 'Đã thanh toán', `PAY${String(maDH).padStart(4, '0')}`);
  db.prepare('INSERT INTO GIAOHANG (MaDH, TrangThai) VALUES (?, ?)').run(maDH, 'Chờ phân công');
  db.prepare('DELETE FROM CHITIETGIOHANG WHERE MaGH = ?').run(cart.MaGH);
  ok(res, { order: orderDetails(maDH), cart: cartRows(req.user.MaKH) });
});

app.get('/api/orders', requireAuth, (req, res) => {
  const rows = req.user.MaKH
    ? db.prepare('SELECT MaDH FROM DONHANG WHERE MaKH = ? ORDER BY MaDH DESC').all(req.user.MaKH)
    : db.prepare('SELECT MaDH FROM DONHANG ORDER BY MaDH DESC').all();
  ok(res, { orders: rows.map((row) => orderDetails(row.MaDH)) });
});

app.get('/api/orders/:id', requireAuth, (req, res) => {
  const order = orderDetails(req.params.id);
  if (!order) return bad(res, 'Không tìm thấy đơn hàng.', 404);
  if (req.user.MaKH && order.MaKH !== req.user.MaKH) return bad(res, 'Bạn không có quyền xem đơn này.', 403);
  ok(res, { order });
});

app.patch('/api/orders/:id', requireAuth, requireAdmin, (req, res) => {
  const { TrangThai, TenShipper, SDTShipper, TrangThaiGiao } = req.body;
  const staffId = req.user.MaNV || db.prepare('SELECT MaNV FROM NHANVIEN ORDER BY MaNV LIMIT 1').get()?.MaNV;
  db.prepare('UPDATE DONHANG SET TrangThai = COALESCE(?, TrangThai), MaNV = COALESCE(?, MaNV) WHERE MaDH = ?').run(TrangThai, staffId, req.params.id);
  db.prepare(`
    UPDATE GIAOHANG
    SET TenShipper = COALESCE(?, TenShipper),
        SDTShipper = COALESCE(?, SDTShipper),
        TrangThai = COALESCE(?, TrangThai),
        ThoiGianNhan = CASE WHEN ? IN ('Đang giao', 'Đã giao') AND ThoiGianNhan IS NULL THEN ? ELSE ThoiGianNhan END,
        ThoiGianGiao = CASE WHEN ? = 'Đã giao' AND ThoiGianGiao IS NULL THEN ? ELSE ThoiGianGiao END
    WHERE MaDH = ?
  `).run(TenShipper, SDTShipper, TrangThaiGiao, TrangThaiGiao, new Date().toISOString(), TrangThaiGiao, new Date().toISOString(), req.params.id);
  if (TrangThai === 'Hoàn thành') {
    db.prepare("UPDATE THANHTOAN SET TrangThai = 'Đã thanh toán', ThoiGianTT = COALESCE(ThoiGianTT, ?) WHERE MaDH = ?").run(new Date().toISOString(), req.params.id);
  }
  ok(res, { order: orderDetails(req.params.id) });
});

app.get('/api/admin/stats', requireAuth, requireAdmin, (_req, res) => {
  const totalOrders = db.prepare('SELECT COUNT(*) AS value FROM DONHANG').get().value;
  const revenue = db.prepare("SELECT COALESCE(SUM(TongTien), 0) AS value FROM DONHANG WHERE TrangThai != 'Đã hủy'").get().value;
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
