import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft,
  BarChart3,
  Bike,
  ChefHat,
  ClipboardList,
  CreditCard,
  Home,
  LogOut,
  Minus,
  PackageCheck,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  Trash2,
  UserRound
} from 'lucide-react';
import './styles.css';

const API_URL = '/api';
const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
const statusClass = (status = '') => `status ${status.toLowerCase().replaceAll(' ', '-').replaceAll('ờ', 'o').replaceAll('ã', 'a')}`;

const orderLabel = {
  ChoXacNhan: 'Chờ xác nhận',
  DangChuanBi: 'Đang chuẩn bị',
  DangGiao: 'Đang giao',
  HoanThanh: 'Hoàn thành',
  DaHuy: 'Đã hủy'
};
const deliveryLabel = { ChoNhan: 'Chờ nhận', DangGiao: 'Đang giao', DaGiao: 'Đã giao' };
const paymentLabel = { TienMat: 'Tiền mặt', ChuyenKhoan: 'Chuyển khoản', VNPay: 'VNPay', MoMo: 'MoMo' };
const paymentStatusLabel = { DangXuLy: 'Đang xử lý', ThanhCong: 'Thành công', ThatBai: 'Thất bại', HoanTien: 'Hoàn tiền' };
const dishStatusLabel = { CoSan: 'Có sẵn', HetMon: 'Hết món', NgungBan: 'Ngừng bán' };

function App() {
  const [token, setToken] = React.useState(() => localStorage.getItem('food_token') || '');
  const [user, setUser] = React.useState(null);
  const [view, setView] = React.useState('home');
  const [categories, setCategories] = React.useState([]);
  const [dishes, setDishes] = React.useState([]);
  const [cart, setCart] = React.useState({ items: [], subtotal: 0, shipping: 0, total: 0 });
  const [orders, setOrders] = React.useState([]);
  const [stats, setStats] = React.useState(null);
  const [shippers, setShippers] = React.useState([]);
  const [selectedDish, setSelectedDish] = React.useState(null);
  const [notice, setNotice] = React.useState('');
  const isAdmin = ['ADMIN', 'NHANVIEN'].includes(user?.VaiTro);
  const isShipper = user?.VaiTro === 'SHIPPER';

  const request = React.useCallback(async (path, options = {}) => {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Có lỗi xảy ra');
    return data;
  }, [token]);

  const loadDishes = React.useCallback(async (filters = {}) => {
    const data = await request(`/dishes?${new URLSearchParams(filters).toString()}`);
    setDishes(data.dishes);
  }, [request]);
  const loadCart = React.useCallback(async () => {
    if (!token || isAdmin || isShipper) return;
    const data = await request('/cart');
    setCart(data.cart);
  }, [request, token, isAdmin, isShipper]);
  const loadOrders = React.useCallback(async () => {
    if (!token) return;
    const data = await request('/orders');
    setOrders(data.orders);
  }, [request, token]);
  const loadStats = React.useCallback(async () => {
    if (!isAdmin) return;
    const data = await request('/admin/stats');
    setStats(data.stats);
  }, [request, isAdmin]);
  const loadShippers = React.useCallback(async () => {
    if (!isAdmin) return;
    const data = await request('/shippers');
    setShippers(data.shippers || []);
  }, [request, isAdmin]);

  React.useEffect(() => {
    request('/categories').then((data) => setCategories(data.categories)).catch(showError);
    loadDishes({ active: 1 }).catch(showError);
  }, [loadDishes, request]);

  React.useEffect(() => {
    if (!token) return;
    request('/auth/me')
      .then((data) => {
        setUser(data.user);
        setView(data.user.VaiTro === 'SHIPPER' ? 'shipper' : ['ADMIN', 'NHANVIEN'].includes(data.user.VaiTro) ? 'dashboard' : 'home');
      })
      .catch(() => {
        localStorage.removeItem('food_token');
        setToken('');
      });
  }, [request, token]);

  React.useEffect(() => {
    loadCart().catch(showError);
    loadOrders().catch(showError);
    loadStats().catch(showError);
    loadShippers().catch(showError);
    if (isAdmin) loadDishes({}).catch(showError);
  }, [isAdmin, loadCart, loadOrders, loadStats, loadShippers, loadDishes]);

  function showError(error) {
    setNotice(error.message || 'Không thể xử lý yêu cầu');
    setTimeout(() => setNotice(''), 3000);
  }
  function showNotice(message) {
    setNotice(message);
    setTimeout(() => setNotice(''), 2500);
  }
  async function login(payload) {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
    localStorage.setItem('food_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setView(data.user.VaiTro === 'SHIPPER' ? 'shipper' : ['ADMIN', 'NHANVIEN'].includes(data.user.VaiTro) ? 'dashboard' : 'home');
    showNotice(`Xin chào ${data.user.HoTen}`);
  }
  async function register(payload) {
    const data = await request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    localStorage.setItem('food_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setView('home');
    showNotice('Đăng ký thành công');
  }
  function logout() {
    localStorage.removeItem('food_token');
    setToken('');
    setUser(null);
    setCart({ items: [], subtotal: 0, shipping: 0, total: 0 });
    setOrders([]);
    setView('login');
  }
  async function addToCart(maMon, quantity = 1) {
    if (!user) {
      setView('login');
      showNotice('Đăng nhập để thêm món vào giỏ');
      return;
    }
    const data = await request('/cart/items', { method: 'POST', body: JSON.stringify({ MaMon: maMon, SoLuong: quantity }) });
    setCart(data.cart);
    showNotice('Đã thêm vào giỏ hàng');
  }
  async function updateCartItem(id, quantity) {
    const data = await request(`/cart/items/${id}`, { method: 'PATCH', body: JSON.stringify({ SoLuong: quantity }) });
    setCart(data.cart);
  }
  async function removeCartItem(id) {
    const data = await request(`/cart/items/${id}`, { method: 'DELETE' });
    setCart(data.cart);
  }
  async function placeOrder(payload) {
    const data = await request('/orders', { method: 'POST', body: JSON.stringify(payload) });
    setCart(data.cart);
    await loadOrders();
    setView('orders');
    showNotice(`Đã tạo đơn #${data.order.MaDH}`);
  }
  async function saveDish(payload) {
    const method = payload.MaMon ? 'PUT' : 'POST';
    const path = payload.MaMon ? `/dishes/${payload.MaMon}` : '/dishes';
    await request(path, { method, body: JSON.stringify(payload) });
    await loadDishes(isAdmin ? {} : { active: 1 });
    await loadStats();
    showNotice(payload.MaMon ? 'Đã cập nhật món' : 'Đã thêm món mới');
  }
  async function disableDish(id) {
    await request(`/dishes/${id}`, { method: 'DELETE' });
    await loadDishes({});
    await loadStats();
    showNotice('Đã chuyển món sang Ngừng bán');
  }
  async function updateOrder(id, payload) {
    await request(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    await loadOrders();
    await loadStats();
    showNotice('Đã cập nhật đơn hàng');
  }
  async function updateShipperOrder(id, payload) {
    await request(`/shipper/orders/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    await loadOrders();
    showNotice('Đã cập nhật giao hàng');
  }
  async function submitReview(payload) {
    await request('/reviews', { method: 'POST', body: JSON.stringify(payload) });
    await loadOrders();
    showNotice('Đã gửi đánh giá');
  }

  const nav = isShipper
    ? [['shipper', 'Giao hàng', Bike]]
    : isAdmin
      ? [['dashboard', 'Tổng quan', BarChart3], ['manage', 'Điều hành', Settings]]
      : [['home', 'Thực đơn', Home], ['cart', 'Giỏ hàng', ShoppingCart], ['checkout', 'Đặt món', CreditCard], ['orders', 'Theo dõi', ClipboardList]];

  return (
    <div className="app-shell">
      {notice && <div className="toast">{notice}</div>}
      <header className="command-bar">
        <button className="brand-chip" onClick={() => setView(isShipper ? 'shipper' : isAdmin ? 'dashboard' : 'home')}>
          <span className="brand-logo"><ChefHat size={22} /></span>
          <span><strong>DeliCore</strong><small>{isShipper ? 'Shipper Console' : isAdmin ? 'Operations Console' : 'Order Studio'}</small></span>
        </button>
        <nav className="top-nav">
          {nav.map(([key, label, Icon]) => (
            <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}>
              <Icon size={18} /><span>{label}</span>{key === 'cart' && cart.items?.length > 0 && <b>{cart.items.length}</b>}
            </button>
          ))}
        </nav>
        <div className="session-area">
          {user ? <div className="user-pill"><UserRound size={18} /><span>{user.HoTen}</span><button className="icon-btn" onClick={logout} aria-label="Đăng xuất"><LogOut size={16} /></button></div> : <button className="primary" onClick={() => setView('login')}>Đăng nhập</button>}
        </div>
      </header>
      <main className="page-canvas">
        {!user && view !== 'home' && view !== 'dish' ? <AuthScreen onLogin={login} onRegister={register} onError={showError} />
          : view === 'login' ? <AuthScreen onLogin={login} onRegister={register} onError={showError} />
          : view === 'home' ? <HomeScreen categories={categories} dishes={dishes} cart={cart} orders={orders} onSearch={(filters) => loadDishes({ ...filters, active: 1 }).catch(showError)} onOpenDish={(dish) => { setSelectedDish(dish); setView('dish'); }} onAdd={addToCart} />
          : view === 'dish' ? <DishDetail dish={selectedDish} onBack={() => setView('home')} onAdd={addToCart} />
          : view === 'cart' ? <CartScreen cart={cart} onUpdate={updateCartItem} onRemove={removeCartItem} onCheckout={() => setView('checkout')} onBrowse={() => setView('home')} />
          : view === 'checkout' ? <CheckoutScreen user={user} cart={cart} onSubmit={placeOrder} onBack={() => setView('cart')} />
          : view === 'orders' ? <OrdersScreen orders={orders} isAdmin={false} onReview={submitReview} />
          : view === 'shipper' ? <ShipperScreen orders={orders} onUpdateOrder={updateShipperOrder} />
          : view === 'dashboard' ? <Dashboard stats={stats} orders={orders} onManage={() => setView('manage')} />
          : <ManageScreen categories={categories} dishes={dishes} orders={orders} shippers={shippers} onSaveDish={saveDish} onDisableDish={disableDish} onUpdateOrder={updateOrder} />}
      </main>
    </div>
  );
}

function AuthScreen({ onLogin, onRegister, onError }) {
  const [mode, setMode] = React.useState('login');
  const [form, setForm] = React.useState({ email: 'khach@demo.vn', password: '123456', HoTen: '', SDT: '', DiaChi: '' });
  async function submit(event) {
    event.preventDefault();
    try {
      if (mode === 'login') await onLogin({ email: form.email, password: form.password });
      else await onRegister({ HoTen: form.HoTen, Email: form.email, MatKhau: form.password, SDT: form.SDT, DiaChi: form.DiaChi });
    } catch (error) { onError(error); }
  }
  return (
    <section className="auth-viewport">
      <form className="panel auth-card" onSubmit={submit}>
        <div className="auth-title"><span className="eyebrow">DeliCore Access</span><h2>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h2></div>
        <div className="mode-switch"><button type="button" className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>Đăng nhập</button><button type="button" className={mode === 'register' ? 'selected' : ''} onClick={() => setMode('register')}>Đăng ký</button></div>
        {mode === 'register' && <label>Họ tên<input value={form.HoTen} onChange={(e) => setForm({ ...form, HoTen: e.target.value })} required /></label>}
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>Mật khẩu<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        {mode === 'register' && <><label>Số điện thoại<input value={form.SDT} onChange={(e) => setForm({ ...form, SDT: e.target.value })} /></label><label>Địa chỉ<input value={form.DiaChi} onChange={(e) => setForm({ ...form, DiaChi: e.target.value })} /></label></>}
        <button className="primary" type="submit">{mode === 'login' ? 'Vào hệ thống' : 'Tạo tài khoản'}</button>
        <div className="demo-actions">
          <button type="button" className="secondary" onClick={() => setForm((old) => ({ ...old, email: 'khach@demo.vn', password: '123456' }))}>Khách demo</button>
          <button type="button" className="secondary" onClick={() => setForm((old) => ({ ...old, email: 'admin@demo.vn', password: '123456' }))}>Admin demo</button>
          <button type="button" className="secondary" onClick={() => setForm((old) => ({ ...old, email: 'shipper@demo.vn', password: '123456' }))}>Shipper demo</button>
        </div>
      </form>
      <div className="auth-visual"><span className="eyebrow">Demo hệ thống thông tin</span><h2>Một app demo đủ luồng đặt món, vận hành và giao hàng.</h2><p>Khách đặt món, admin xử lý, shipper giao hàng. Tất cả chạy chung backend và SQLite.</p><div className="visual-tags"><span><Sparkles size={14} /> Live order flow</span><span><Store size={14} /> Multi-role dashboard</span><span><ClipboardList size={14} /> Tracking timeline</span></div></div>
    </section>
  );
}

function HomeScreen({ categories, dishes, cart, orders, onSearch, onOpenDish, onAdd }) {
  const [filters, setFilters] = React.useState({ search: '', category: '' });
  function apply(next) { const merged = { ...filters, ...next }; setFilters(merged); onSearch(merged); }
  return (
    <section className="menu-screen">
      <div className="menu-hero"><img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80" alt="Bàn đồ ăn" /><div className="menu-hero-copy"><span className="eyebrow">DeliCore Kitchen</span><h2>Đặt món như chọn set vận hành.</h2><p>Menu, giỏ hàng và trạng thái đơn được gom trong một màn hình để demo luồng nghiệp vụ.</p></div><div className="order-snapshot"><span>{cart?.items?.length || 0} món trong giỏ</span><strong>{money(cart?.total || 0)}</strong><small>{orders?.length || 0} đơn đã tạo</small></div></div>
      <div className="menu-workbench"><aside className="category-rail"><button className={!filters.category ? 'active' : ''} onClick={() => apply({ category: '' })}><span>Tất cả</span><small>{dishes.length} món</small></button>{categories.map((category) => <button key={category.MaDM} className={filters.category === String(category.MaDM) ? 'active' : ''} onClick={() => apply({ category: String(category.MaDM) })}><img src={category.HinhAnh} alt="" /><span>{category.TenDM}</span></button>)}</aside>
        <div className="menu-main"><div className="control-bar"><label className="search-input"><Search size={18} /><input placeholder="Tìm món ăn..." value={filters.search} onChange={(e) => apply({ search: e.target.value })} /></label><select value={filters.category} onChange={(e) => apply({ category: e.target.value })}><option value="">Tất cả danh mục</option>{categories.map((category) => <option key={category.MaDM} value={category.MaDM}>{category.TenDM}</option>)}</select></div><div className="menu-list">{dishes.map((dish) => <DishCard key={dish.MaMon} dish={dish} onOpen={() => onOpenDish(dish)} onAdd={() => onAdd(dish.MaMon, 1)} />)}</div></div>
      </div>
    </section>
  );
}

function DishCard({ dish, onOpen, onAdd }) {
  return <article className="menu-card"><button className="cover-btn" onClick={onOpen}><img src={dish.HinhAnh} alt={dish.TenMon} /></button><div className="menu-body"><div className="menu-head"><small>{dish.TenDM}</small>{dish.PhanTramGiam > 0 && <span>-{dish.PhanTramGiam}%</span>}</div><h3>{dish.TenMon}</h3><p>{dish.MoTa}</p><small>{dishStatusLabel[dish.TrangThai] || dish.TrangThai}</small><div className="menu-foot"><strong>{money(dish.GiaSauGiam)}</strong><button className="primary" onClick={onAdd}><Plus size={16} /> Thêm</button></div></div></article>;
}

function DishDetail({ dish, onBack, onAdd }) {
  const [quantity, setQuantity] = React.useState(1);
  if (!dish) return <EmptyState title="Chưa chọn món" action="Quay lại danh sách" onAction={onBack} />;
  return <section className="detail-layout"><img className="detail-cover" src={dish.HinhAnh} alt={dish.TenMon} /><div className="panel detail-card"><button className="link-btn" onClick={onBack}><ArrowLeft size={16} /> Quay lại</button><span className="eyebrow">{dish.TenDM}</span><h2>{dish.TenMon}</h2><p>{dish.MoTa}</p><div className="price-line"><strong>{money(dish.GiaSauGiam)}</strong>{dish.PhanTramGiam > 0 && <span>Giảm {dish.PhanTramGiam}%</span>}</div><div className="qty-box"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button><strong>{quantity}</strong><button onClick={() => setQuantity(quantity + 1)}><Plus size={16} /></button></div><button className="primary" onClick={() => onAdd(dish.MaMon, quantity)}>Thêm vào giỏ</button></div></section>;
}

function CartScreen({ cart, onUpdate, onRemove, onCheckout, onBrowse }) {
  if (!cart.items?.length) return <EmptyState title="Giỏ hàng đang trống" action="Chọn món ngay" onAction={onBrowse} />;
  return <section className="two-col"><div><HeaderBlock eyebrow="Giỏ hàng" title="Các món đã chọn" /><div className="stack">{cart.items.map((item) => <article className="cart-item" key={item.MaCTGH}><img src={item.HinhAnh} alt={item.TenMon} /><div><strong>{item.TenMon}</strong><small>{money(item.GiaSauGiam)} / phần</small></div><div className="qty-box compact"><button onClick={() => onUpdate(item.MaCTGH, item.SoLuong - 1)}><Minus size={14} /></button><strong>{item.SoLuong}</strong><button onClick={() => onUpdate(item.MaCTGH, item.SoLuong + 1)}><Plus size={14} /></button></div><strong>{money(item.ThanhTien)}</strong><button className="icon-btn danger" onClick={() => onRemove(item.MaCTGH)}><Trash2 size={16} /></button></article>)}</div></div><OrderSummary cart={cart} action="Đặt hàng" onAction={onCheckout} /></section>;
}

function CheckoutScreen({ user, cart, onSubmit, onBack }) {
  const [form, setForm] = React.useState({ DiaChiGiao: user?.DiaChi || '', SDTNhanHang: user?.SDT || '', PhuongThucTT: 'TienMat' });
  if (!cart.items?.length) return <EmptyState title="Chưa có món để đặt" action="Quay về giỏ hàng" onAction={onBack} />;
  return <section className="two-col"><form className="panel form-card" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}><HeaderBlock eyebrow="Checkout" title="Xác nhận thông tin nhận hàng" /><label>Địa chỉ giao hàng<input value={form.DiaChiGiao} onChange={(e) => setForm({ ...form, DiaChiGiao: e.target.value })} required /></label><label>Số điện thoại nhận hàng<input value={form.SDTNhanHang} onChange={(e) => setForm({ ...form, SDTNhanHang: e.target.value })} required /></label><label>Phương thức thanh toán<select value={form.PhuongThucTT} onChange={(e) => setForm({ ...form, PhuongThucTT: e.target.value })}><option value="TienMat">Tiền mặt / COD</option><option value="ChuyenKhoan">Chuyển khoản</option><option value="VNPay">VNPay</option><option value="MoMo">MoMo</option></select></label><button className="primary" type="submit">Xác nhận đặt hàng</button></form><OrderSummary cart={cart} /></section>;
}

function OrdersScreen({ orders, isAdmin, shippers = [], onUpdateOrder, onReview }) {
  if (!orders.length) return <EmptyState title="Chưa có đơn hàng" action={isAdmin ? null : 'Quay lại thực đơn'} onAction={() => {}} />;
  return <section><HeaderBlock eyebrow={isAdmin ? 'Quản lý đơn' : 'Theo dõi'} title={isAdmin ? 'Danh sách đơn hàng' : 'Đơn hàng của tôi'} /><div className="orders-list">{orders.map((order) => <OrderCard key={order.MaDH} order={order} isAdmin={isAdmin} shippers={shippers} onUpdateOrder={onUpdateOrder} onReview={onReview} />)}</div></section>;
}

function OrderCard({ order, isAdmin, shippers = [], onUpdateOrder, onReview }) {
  const [delivery, setDelivery] = React.useState({ MaShipper: order.delivery?.MaShipper || '', TrangThaiGiao: order.delivery?.TrangThai || 'ChoNhan' });
  return <article className="panel order-card"><div className="order-head"><div><strong>Đơn #{order.MaDH}</strong><small>{new Date(order.NgayDat).toLocaleString('vi-VN')} · {order.TenKhach}</small></div><span className={statusClass(order.TrangThai)}>{orderLabel[order.TrangThai] || order.TrangThai}</span></div><div className="mini-items">{order.items.map((item) => <span key={item.MaCTDH}>{item.TenMon} x{item.SoLuong}</span>)}</div><div className="order-meta"><span><CreditCard size={16} /> {paymentLabel[order.payment?.HinhThuc] || order.payment?.HinhThuc} · {paymentStatusLabel[order.payment?.TrangThai] || order.payment?.TrangThai}</span><span><Bike size={16} /> {order.delivery?.TenShipper || 'Chưa phân công'} · {deliveryLabel[order.delivery?.TrangThai] || order.delivery?.TrangThai}</span><strong>{money(order.TongTien)}</strong></div>{isAdmin && <div className="admin-tools"><select defaultValue={order.TrangThai} onChange={(e) => onUpdateOrder(order.MaDH, { TrangThai: e.target.value })}><option value="ChoXacNhan">Chờ xác nhận</option><option value="DangChuanBi">Đang chuẩn bị</option><option value="DangGiao">Đang giao</option><option value="HoanThanh">Hoàn thành</option><option value="DaHuy">Đã hủy</option></select><select value={delivery.MaShipper} onChange={(e) => setDelivery({ ...delivery, MaShipper: e.target.value })}><option value="">Chưa phân công shipper</option>{shippers.map((shipper) => <option key={shipper.MaShipper} value={shipper.MaShipper}>{shipper.HoTen} · {shipper.SDT}</option>)}</select><select value={delivery.TrangThaiGiao} onChange={(e) => setDelivery({ ...delivery, TrangThaiGiao: e.target.value })}><option value="ChoNhan">Chờ nhận</option><option value="DangGiao">Đang giao</option><option value="DaGiao">Đã giao</option></select><button className="secondary" onClick={() => onUpdateOrder(order.MaDH, delivery)}>Lưu giao hàng</button></div>}{!isAdmin && order.TrangThai === 'HoanThanh' && <ReviewBox order={order} onReview={onReview} />}</article>;
}

function ReviewBox({ order, onReview }) {
  const [form, setForm] = React.useState({ MaMon: order.items[0]?.MaMon || '', SoSao: 5, NoiDung: '' });
  return <form className="admin-tools" onSubmit={(e) => { e.preventDefault(); onReview({ MaDH: order.MaDH, ...form }); }}><select value={form.MaMon} onChange={(e) => setForm({ ...form, MaMon: Number(e.target.value) })}>{order.items.map((item) => <option key={item.MaMon} value={item.MaMon}>{item.TenMon}</option>)}</select><select value={form.SoSao} onChange={(e) => setForm({ ...form, SoSao: Number(e.target.value) })}><option value={5}>5 sao</option><option value={4}>4 sao</option><option value={3}>3 sao</option><option value={2}>2 sao</option><option value={1}>1 sao</option></select><input placeholder="Nội dung đánh giá" value={form.NoiDung} onChange={(e) => setForm({ ...form, NoiDung: e.target.value })} /><button className="secondary" type="submit">Gửi đánh giá</button></form>;
}

function ShipperScreen({ orders, onUpdateOrder }) {
  const deliveryOrders = orders.filter((order) => ['ChoNhan', 'DangGiao'].includes(order.delivery?.TrangThai));
  if (!deliveryOrders.length) return <EmptyState title="Chưa có đơn giao hàng" action={null} onAction={() => {}} />;
  return <section><HeaderBlock eyebrow="Shipper" title="Đơn cần giao" /><div className="orders-list">{deliveryOrders.map((order) => <article className="panel order-card" key={order.MaDH}><div className="order-head"><div><strong>Đơn #{order.MaDH}</strong><small>{order.DiaChiGiao} · {order.SDTNhanHang}</small></div><span className={statusClass(order.delivery?.TrangThai)}>{deliveryLabel[order.delivery?.TrangThai] || order.delivery?.TrangThai}</span></div><div className="mini-items">{order.items.map((item) => <span key={item.MaCTDH}>{item.TenMon} x{item.SoLuong}</span>)}</div><div className="order-meta"><span><CreditCard size={16} /> {paymentLabel[order.payment?.HinhThuc] || order.payment?.HinhThuc}</span><strong>{money(order.TongTien)}</strong></div><div className="admin-tools"><button className="secondary" onClick={() => onUpdateOrder(order.MaDH, { TrangThaiGiao: 'DangGiao' })}>Nhận / đang giao</button><button className="primary" onClick={() => onUpdateOrder(order.MaDH, { TrangThaiGiao: 'DaGiao' })}>Đã giao</button></div></article>)}</div></section>;
}

function Dashboard({ stats, orders, onManage }) {
  const cards = [['Tổng đơn', stats?.totalOrders || 0, ClipboardList], ['Doanh thu', money(stats?.revenue || 0), CreditCard], ['Món ăn', stats?.dishes || 0, ChefHat], ['Khách hàng', stats?.customers || 0, UserRound]];
  return <section className="page-stack"><HeaderBlock eyebrow="Admin dashboard" title="Tổng quan vận hành" /><div className="metric-grid">{cards.map(([label, value, Icon]) => <article className="metric-card" key={label}><Icon size={20} /><small>{label}</small><strong>{value}</strong></article>)}</div><div className="dashboard-grid"><div className="panel"><HeaderBlock eyebrow="Trạng thái" title="Phân bổ đơn hàng" compact /><div className="bar-list">{(stats?.byStatus || []).map((row) => <div key={row.TrangThai}><span>{orderLabel[row.TrangThai] || row.TrangThai}</span><b style={{ width: `${Math.max(12, row.total * 18)}%` }} /><strong>{row.total}</strong></div>)}</div></div><div className="panel"><HeaderBlock eyebrow="Cần xử lý" title="Đơn mới nhất" compact /><div className="stack">{orders.slice(0, 4).map((order) => <div className="small-order" key={order.MaDH}><PackageCheck size={17} /><span>#{order.MaDH} · {orderLabel[order.TrangThai] || order.TrangThai}</span><strong>{money(order.TongTien)}</strong></div>)}</div><button className="primary" onClick={onManage}>Mở khu điều hành</button></div></div></section>;
}

function ManageScreen({ categories, dishes, orders, shippers, onSaveDish, onDisableDish, onUpdateOrder }) {
  const [editing, setEditing] = React.useState(null);
  const blank = { MaDM: categories[0]?.MaDM || 1, TenMon: '', Gia: 45000, HinhAnh: '', MoTa: '', TrangThai: 'CoSan', PhanTramGiam: 0 };
  const form = editing || blank;
  const setField = (key, value) => setEditing({ ...form, [key]: value });
  return <section className="page-stack"><HeaderBlock eyebrow="Quản trị" title="Quản lý món ăn và đơn hàng" /><div className="manage-grid"><form className="panel form-card" onSubmit={(event) => { event.preventDefault(); onSaveDish(form); setEditing(null); }}><HeaderBlock eyebrow="Món ăn" title={form.MaMon ? 'Cập nhật món' : 'Thêm món mới'} compact /><label>Tên món<input value={form.TenMon} onChange={(e) => setField('TenMon', e.target.value)} required /></label><label>Danh mục<select value={form.MaDM} onChange={(e) => setField('MaDM', Number(e.target.value))}>{categories.map((category) => <option key={category.MaDM} value={category.MaDM}>{category.TenDM}</option>)}</select></label><label>Giá<input type="number" value={form.Gia} onChange={(e) => setField('Gia', Number(e.target.value))} required /></label><label>Phần trăm giảm<input type="number" value={form.PhanTramGiam} onChange={(e) => setField('PhanTramGiam', Number(e.target.value))} /></label><label>Trạng thái món<select value={form.TrangThai} onChange={(e) => setField('TrangThai', e.target.value)}><option value="CoSan">Có sẵn</option><option value="HetMon">Hết món</option><option value="NgungBan">Ngừng bán</option></select></label><label>Ảnh món<input value={form.HinhAnh || ''} onChange={(e) => setField('HinhAnh', e.target.value)} /></label><label>Mô tả<textarea value={form.MoTa || ''} onChange={(e) => setField('MoTa', e.target.value)} /></label><div className="button-row"><button className="primary" type="submit">Lưu món</button><button className="secondary" type="button" onClick={() => setEditing(null)}>Tạo mới</button></div></form><div className="panel table-panel"><HeaderBlock eyebrow="Danh sách" title="Món ăn trong hệ thống" compact /><div className="dish-table">{dishes.map((dish) => <div key={dish.MaMon}><img src={dish.HinhAnh} alt="" /><span>{dish.TenMon}<small>{dish.TenDM} · {dishStatusLabel[dish.TrangThai] || dish.TrangThai}</small></span><strong>{money(dish.Gia)}</strong><button className="secondary" onClick={() => setEditing(dish)}>Sửa</button><button className="icon-btn danger" onClick={() => onDisableDish(dish.MaMon)}><Trash2 size={16} /></button></div>)}</div></div></div><OrdersScreen orders={orders} isAdmin shippers={shippers} onUpdateOrder={onUpdateOrder} /></section>;
}

function OrderSummary({ cart, action, onAction }) {
  return <aside className="panel summary-card"><HeaderBlock eyebrow="Tổng kết" title="Chi phí đơn hàng" compact /><div><span>Tạm tính</span><strong>{money(cart.subtotal)}</strong></div><div><span>Phí ship</span><strong>{money(cart.shipping)}</strong></div><div className="total"><span>Tổng thanh toán</span><strong>{money(cart.total)}</strong></div>{action && <button className="primary" onClick={onAction}>{action}</button>}</aside>;
}
function HeaderBlock({ eyebrow, title, compact = false }) { return <div className={compact ? 'header-block compact' : 'header-block'}><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>; }
function EmptyState({ title, action, onAction }) { return <div className="empty-state"><ShoppingCart size={42} /><h3>{title}</h3>{action && <button className="primary" onClick={onAction}>{action}</button>}</div>; }

createRoot(document.getElementById('root')).render(<App />);
