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

function App() {
  const [token, setToken] = React.useState(() => localStorage.getItem('food_token') || '');
  const [user, setUser] = React.useState(null);
  const [view, setView] = React.useState('home');
  const [categories, setCategories] = React.useState([]);
  const [dishes, setDishes] = React.useState([]);
  const [cart, setCart] = React.useState({ items: [], subtotal: 0, shipping: 0, total: 0 });
  const [orders, setOrders] = React.useState([]);
  const [stats, setStats] = React.useState(null);
  const [selectedDish, setSelectedDish] = React.useState(null);
  const [notice, setNotice] = React.useState('');
  const isAdmin = ['ADMIN', 'NHANVIEN'].includes(user?.VaiTro);

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
    const params = new URLSearchParams(filters);
    const data = await request(`/dishes?${params.toString()}`);
    setDishes(data.dishes);
  }, [request]);

  const loadCart = React.useCallback(async () => {
    if (!token || isAdmin) return;
    const data = await request('/cart');
    setCart(data.cart);
  }, [request, token, isAdmin]);

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

  React.useEffect(() => {
    request('/categories').then((data) => setCategories(data.categories)).catch(showError);
    loadDishes({ active: 1 }).catch(showError);
  }, [loadDishes, request]);

  React.useEffect(() => {
    if (!token) return;
    request('/auth/me')
      .then((data) => {
        setUser(data.user);
        setView(['ADMIN', 'NHANVIEN'].includes(data.user.VaiTro) ? 'dashboard' : 'home');
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
    if (isAdmin) loadDishes({}).catch(showError);
  }, [isAdmin, loadCart, loadOrders, loadStats, loadDishes]);

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
    setView(['ADMIN', 'NHANVIEN'].includes(data.user.VaiTro) ? 'dashboard' : 'home');
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
    showNotice('Đã tắt trạng thái món');
  }

  async function updateOrder(id, payload) {
    await request(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    await loadOrders();
    await loadStats();
    showNotice('Đã cập nhật đơn hàng');
  }

  const nav = isAdmin
    ? [
        ['dashboard', 'Tổng quan', BarChart3],
        ['manage', 'Điều hành', Settings]
      ]
    : [
        ['home', 'Thực đơn', Home],
        ['cart', 'Giỏ hàng', ShoppingCart],
        ['checkout', 'Đặt món', CreditCard],
        ['orders', 'Theo dõi', ClipboardList]
      ];

  return (
    <div className="app-shell">
      {notice && <div className="toast">{notice}</div>}
      <header className="command-bar">
        <button className="brand-chip" onClick={() => setView(isAdmin ? 'dashboard' : 'home')}>
          <span className="brand-logo"><ChefHat size={22} /></span>
          <span>
            <strong>DeliCore</strong>
            <small>{isAdmin ? 'Operations Console' : 'Order Studio'}</small>
          </span>
        </button>

        <nav className="top-nav">
          {nav.map(([key, label, Icon]) => (
            <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}>
              <Icon size={18} />
              <span>{label}</span>
              {key === 'cart' && cart.items?.length > 0 && <b>{cart.items.length}</b>}
            </button>
          ))}
        </nav>

        <div className="session-area">
          {user ? (
            <div className="user-pill">
              <UserRound size={18} />
              <span>{user.HoTen}</span>
              <button className="icon-btn" onClick={logout} aria-label="Đăng xuất"><LogOut size={16} /></button>
            </div>
          ) : (
            <button className="primary" onClick={() => setView('login')}>Đăng nhập</button>
          )}
        </div>
      </header>

      <main className="page-canvas">
        {!user && view !== 'home' && view !== 'dish' ? (
          <AuthScreen onLogin={login} onRegister={register} onError={showError} />
        ) : view === 'login' ? (
          <AuthScreen onLogin={login} onRegister={register} onError={showError} />
        ) : view === 'home' ? (
          <HomeScreen
            categories={categories}
            dishes={dishes}
            cart={cart}
            orders={orders}
            onSearch={(filters) => loadDishes({ ...filters, active: 1 }).catch(showError)}
            onOpenDish={(dish) => { setSelectedDish(dish); setView('dish'); }}
            onAdd={addToCart}
          />
        ) : view === 'dish' ? (
          <DishDetail dish={selectedDish} onBack={() => setView('home')} onAdd={addToCart} />
        ) : view === 'cart' ? (
          <CartScreen cart={cart} onUpdate={updateCartItem} onRemove={removeCartItem} onCheckout={() => setView('checkout')} onBrowse={() => setView('home')} />
        ) : view === 'checkout' ? (
          <CheckoutScreen user={user} cart={cart} onSubmit={placeOrder} onBack={() => setView('cart')} />
        ) : view === 'orders' ? (
          <OrdersScreen orders={orders} isAdmin={false} />
        ) : view === 'dashboard' ? (
          <Dashboard stats={stats} orders={orders} onManage={() => setView('manage')} />
        ) : (
          <ManageScreen
            categories={categories}
            dishes={dishes}
            orders={orders}
            onSaveDish={saveDish}
            onDisableDish={disableDish}
            onUpdateOrder={updateOrder}
          />
        )}
      </main>
    </div>
  );
}

function AuthScreen({ onLogin, onRegister, onError }) {
  const [mode, setMode] = React.useState('login');
  const [form, setForm] = React.useState({
    email: 'khach@demo.vn',
    password: '123456',
    HoTen: '',
    SDT: '',
    DiaChi: ''
  });

  async function submit(event) {
    event.preventDefault();
    try {
      if (mode === 'login') {
        await onLogin({ email: form.email, password: form.password });
      } else {
        await onRegister({
          HoTen: form.HoTen,
          Email: form.email,
          MatKhau: form.password,
          SDT: form.SDT,
          DiaChi: form.DiaChi
        });
      }
    } catch (error) {
      onError(error);
    }
  }

  return (
    <section className="auth-viewport">
      <form className="panel auth-card" onSubmit={submit}>
        <div className="auth-title">
          <span className="eyebrow">DeliCore Access</span>
          <h2>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
        </div>
        <div className="mode-switch">
          <button type="button" className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>Đăng nhập</button>
          <button type="button" className={mode === 'register' ? 'selected' : ''} onClick={() => setMode('register')}>Đăng ký</button>
        </div>
        {mode === 'register' && (
          <label>Họ tên<input value={form.HoTen} onChange={(e) => setForm({ ...form, HoTen: e.target.value })} required /></label>
        )}
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>Mật khẩu<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        {mode === 'register' && (
          <>
            <label>Số điện thoại<input value={form.SDT} onChange={(e) => setForm({ ...form, SDT: e.target.value })} /></label>
            <label>Địa chỉ<input value={form.DiaChi} onChange={(e) => setForm({ ...form, DiaChi: e.target.value })} /></label>
          </>
        )}
        <button className="primary" type="submit">{mode === 'login' ? 'Vào hệ thống' : 'Tạo tài khoản'}</button>
        <div className="demo-actions">
          <button type="button" className="secondary" onClick={() => setForm((old) => ({ ...old, email: 'khach@demo.vn', password: '123456' }))}>Khách demo</button>
          <button type="button" className="secondary" onClick={() => setForm((old) => ({ ...old, email: 'admin@demo.vn', password: '123456' }))}>Admin demo</button>
        </div>
      </form>

      <div className="auth-visual">
        <span className="eyebrow">Demo hệ thống thông tin</span>
        <h2>Một app demo đủ luồng đặt món và vận hành.</h2>
        <p>Khách đặt món ở một phía, admin xử lý đơn ở phía còn lại. Tất cả chạy chung backend và SQLite.</p>
        <div className="visual-tags">
          <span><Sparkles size={14} /> Live order flow</span>
          <span><Store size={14} /> Multi-role dashboard</span>
          <span><ClipboardList size={14} /> Tracking timeline</span>
        </div>
      </div>
    </section>
  );
}

function HomeScreen({ categories, dishes, cart, orders, onSearch, onOpenDish, onAdd }) {
  const [filters, setFilters] = React.useState({ search: '', category: '' });

  function apply(next) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    onSearch(merged);
  }

  return (
    <section className="menu-screen">
      <div className="menu-hero">
        <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80" alt="Bàn đồ ăn" />
        <div className="menu-hero-copy">
          <span className="eyebrow">DeliCore Kitchen</span>
          <h2>Đặt món như chọn set vận hành.</h2>
          <p>Menu, giỏ hàng và trạng thái đơn được gom trong một màn hình để demo luồng nghiệp vụ nhìn rõ hơn.</p>
        </div>
        <div className="order-snapshot">
          <span>{cart?.items?.length || 0} món trong giỏ</span>
          <strong>{money(cart?.total || 0)}</strong>
          <small>{orders?.length || 0} đơn đã tạo</small>
        </div>
      </div>

      <div className="menu-workbench">
        <aside className="category-rail">
          <button className={!filters.category ? 'active' : ''} onClick={() => apply({ category: '' })}>
            <span>Tất cả</span>
            <small>{dishes.length} món</small>
          </button>
          {categories.map((category) => (
            <button key={category.MaDM} className={filters.category === String(category.MaDM) ? 'active' : ''} onClick={() => apply({ category: String(category.MaDM) })}>
              <img src={category.HinhAnh} alt="" />
              <span>{category.TenDM}</span>
            </button>
          ))}
        </aside>

        <div className="menu-main">
          <div className="control-bar">
            <label className="search-input"><Search size={18} /><input placeholder="Tìm món ăn..." value={filters.search} onChange={(e) => apply({ search: e.target.value })} /></label>
            <select value={filters.category} onChange={(e) => apply({ category: e.target.value })}>
              <option value="">Tất cả danh mục</option>
              {categories.map((category) => <option key={category.MaDM} value={category.MaDM}>{category.TenDM}</option>)}
            </select>
          </div>

          <div className="menu-list">
            {dishes.map((dish) => <DishCard key={dish.MaMon} dish={dish} onOpen={() => onOpenDish(dish)} onAdd={() => onAdd(dish.MaMon, 1)} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function DishCard({ dish, onOpen, onAdd }) {
  return (
    <article className="menu-card">
      <button className="cover-btn" onClick={onOpen}><img src={dish.HinhAnh} alt={dish.TenMon} /></button>
      <div className="menu-body">
        <div className="menu-head">
          <small>{dish.TenDM}</small>
          {dish.PhanTramGiam > 0 && <span>-{dish.PhanTramGiam}%</span>}
        </div>
        <h3>{dish.TenMon}</h3>
        <p>{dish.MoTa}</p>
        <div className="menu-foot">
          <strong>{money(dish.GiaSauGiam)}</strong>
          <button className="primary" onClick={onAdd}><Plus size={16} /> Thêm</button>
        </div>
      </div>
    </article>
  );
}

function DishDetail({ dish, onBack, onAdd }) {
  const [quantity, setQuantity] = React.useState(1);
  if (!dish) return <EmptyState title="Chưa chọn món" action="Quay lại danh sách" onAction={onBack} />;
  return (
    <section className="detail-layout">
      <img className="detail-cover" src={dish.HinhAnh} alt={dish.TenMon} />
      <div className="panel detail-card">
        <button className="link-btn" onClick={onBack}><ArrowLeft size={16} /> Quay lại</button>
        <span className="eyebrow">{dish.TenDM}</span>
        <h2>{dish.TenMon}</h2>
        <p>{dish.MoTa}</p>
        <div className="price-line">
          <strong>{money(dish.GiaSauGiam)}</strong>
          {dish.PhanTramGiam > 0 && <span>Giảm {dish.PhanTramGiam}%</span>}
        </div>
        <div className="qty-box">
          <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button>
          <strong>{quantity}</strong>
          <button onClick={() => setQuantity(quantity + 1)}><Plus size={16} /></button>
        </div>
        <button className="primary" onClick={() => onAdd(dish.MaMon, quantity)}>Thêm vào giỏ</button>
      </div>
    </section>
  );
}

function CartScreen({ cart, onUpdate, onRemove, onCheckout, onBrowse }) {
  if (!cart.items?.length) return <EmptyState title="Giỏ hàng đang trống" action="Chọn món ngay" onAction={onBrowse} />;
  return (
    <section className="two-col">
      <div>
        <HeaderBlock eyebrow="Giỏ hàng" title="Các món đã chọn" />
        <div className="stack">
          {cart.items.map((item) => (
            <article className="cart-item" key={item.MaCTGH}>
              <img src={item.HinhAnh} alt={item.TenMon} />
              <div>
                <strong>{item.TenMon}</strong>
                <small>{money(item.GiaSauGiam)} / phần</small>
              </div>
              <div className="qty-box compact">
                <button onClick={() => onUpdate(item.MaCTGH, item.SoLuong - 1)}><Minus size={14} /></button>
                <strong>{item.SoLuong}</strong>
                <button onClick={() => onUpdate(item.MaCTGH, item.SoLuong + 1)}><Plus size={14} /></button>
              </div>
              <strong>{money(item.ThanhTien)}</strong>
              <button className="icon-btn danger" onClick={() => onRemove(item.MaCTGH)}><Trash2 size={16} /></button>
            </article>
          ))}
        </div>
      </div>
      <OrderSummary cart={cart} action="Đặt hàng" onAction={onCheckout} />
    </section>
  );
}

function CheckoutScreen({ user, cart, onSubmit, onBack }) {
  const [form, setForm] = React.useState({
    DiaChiGiao: user?.DiaChi || '',
    SDTNhanHang: user?.SDT || '',
    PhuongThucTT: 'Tiền mặt'
  });

  if (!cart.items?.length) return <EmptyState title="Chưa có món để đặt" action="Quay về giỏ hàng" onAction={onBack} />;

  return (
    <section className="two-col">
      <form className="panel form-card" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
        <HeaderBlock eyebrow="Checkout" title="Xác nhận thông tin nhận hàng" />
        <label>Địa chỉ giao hàng<input value={form.DiaChiGiao} onChange={(e) => setForm({ ...form, DiaChiGiao: e.target.value })} required /></label>
        <label>Số điện thoại nhận hàng<input value={form.SDTNhanHang} onChange={(e) => setForm({ ...form, SDTNhanHang: e.target.value })} required /></label>
        <label>Phương thức thanh toán
          <select value={form.PhuongThucTT} onChange={(e) => setForm({ ...form, PhuongThucTT: e.target.value })}>
            <option>Tiền mặt</option>
            <option>Chuyển khoản</option>
            <option>Ví điện tử</option>
          </select>
        </label>
        <button className="primary" type="submit">Xác nhận đặt hàng</button>
      </form>
      <OrderSummary cart={cart} />
    </section>
  );
}

function OrdersScreen({ orders, isAdmin, onUpdateOrder }) {
  if (!orders.length) return <EmptyState title="Chưa có đơn hàng" action={isAdmin ? null : 'Quay lại thực đơn'} onAction={() => {}} />;
  return (
    <section>
      <HeaderBlock eyebrow={isAdmin ? 'Quản lý đơn' : 'Theo dõi'} title={isAdmin ? 'Danh sách đơn hàng' : 'Đơn hàng của tôi'} />
      <div className="orders-list">
        {orders.map((order) => <OrderCard key={order.MaDH} order={order} isAdmin={isAdmin} onUpdateOrder={onUpdateOrder} />)}
      </div>
    </section>
  );
}

function OrderCard({ order, isAdmin, onUpdateOrder }) {
  const [delivery, setDelivery] = React.useState({
    TenShipper: order.delivery?.TenShipper || '',
    SDTShipper: order.delivery?.SDTShipper || '',
    TrangThaiGiao: order.delivery?.TrangThai || 'Chờ phân công'
  });

  return (
    <article className="panel order-card">
      <div className="order-head">
        <div>
          <strong>Đơn #{order.MaDH}</strong>
          <small>{new Date(order.NgayDat).toLocaleString('vi-VN')} · {order.TenKhach}</small>
        </div>
        <span className={statusClass(order.TrangThai)}>{order.TrangThai}</span>
      </div>
      <div className="mini-items">
        {order.items.map((item) => (
          <span key={item.MaCTDH}>{item.TenMon} x{item.SoLuong}</span>
        ))}
      </div>
      <div className="order-meta">
        <span><CreditCard size={16} /> {order.payment?.HinhThuc} · {order.payment?.TrangThai}</span>
        <span><Bike size={16} /> {order.delivery?.TenShipper || 'Chưa phân công'} · {order.delivery?.TrangThai}</span>
        <strong>{money(order.TongTien)}</strong>
      </div>
      {isAdmin && (
        <div className="admin-tools">
          <select defaultValue={order.TrangThai} onChange={(e) => onUpdateOrder(order.MaDH, { TrangThai: e.target.value })}>
            <option>Chờ xác nhận</option>
            <option>Đang xử lý</option>
            <option>Đang giao</option>
            <option>Hoàn thành</option>
            <option>Đã hủy</option>
          </select>
          <input placeholder="Tên shipper" value={delivery.TenShipper} onChange={(e) => setDelivery({ ...delivery, TenShipper: e.target.value })} />
          <input placeholder="SĐT shipper" value={delivery.SDTShipper} onChange={(e) => setDelivery({ ...delivery, SDTShipper: e.target.value })} />
          <select value={delivery.TrangThaiGiao} onChange={(e) => setDelivery({ ...delivery, TrangThaiGiao: e.target.value })}>
            <option>Chờ phân công</option>
            <option>Đang giao</option>
            <option>Đã giao</option>
            <option>Giao thất bại</option>
          </select>
          <button className="secondary" onClick={() => onUpdateOrder(order.MaDH, delivery)}>Lưu giao hàng</button>
        </div>
      )}
    </article>
  );
}

function Dashboard({ stats, orders, onManage }) {
  const cards = [
    ['Tổng đơn', stats?.totalOrders || 0, ClipboardList],
    ['Doanh thu', money(stats?.revenue || 0), CreditCard],
    ['Món ăn', stats?.dishes || 0, ChefHat],
    ['Khách hàng', stats?.customers || 0, UserRound]
  ];
  return (
    <section className="page-stack">
      <HeaderBlock eyebrow="Admin dashboard" title="Tổng quan vận hành" />
      <div className="metric-grid">
        {cards.map(([label, value, Icon]) => (
          <article className="metric-card" key={label}>
            <Icon size={20} />
            <small>{label}</small>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <HeaderBlock eyebrow="Trạng thái" title="Phân bổ đơn hàng" compact />
          <div className="bar-list">
            {(stats?.byStatus || []).map((row) => (
              <div key={row.TrangThai}>
                <span>{row.TrangThai}</span>
                <b style={{ width: `${Math.max(12, row.total * 18)}%` }} />
                <strong>{row.total}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <HeaderBlock eyebrow="Cần xử lý" title="Đơn mới nhất" compact />
          <div className="stack">
            {orders.slice(0, 4).map((order) => (
              <div className="small-order" key={order.MaDH}>
                <PackageCheck size={17} />
                <span>#{order.MaDH} · {order.TrangThai}</span>
                <strong>{money(order.TongTien)}</strong>
              </div>
            ))}
          </div>
          <button className="primary" onClick={onManage}>Mở khu điều hành</button>
        </div>
      </div>
    </section>
  );
}

function ManageScreen({ categories, dishes, orders, onSaveDish, onDisableDish, onUpdateOrder }) {
  const [editing, setEditing] = React.useState(null);
  const blank = {
    MaDM: categories[0]?.MaDM || 1,
    TenMon: '',
    Gia: 45000,
    HinhAnh: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80',
    MoTa: '',
    TrangThai: 1,
    PhanTramGiam: 0
  };
  const form = editing || blank;
  const setField = (key, value) => setEditing({ ...form, [key]: value });

  return (
    <section className="page-stack">
      <HeaderBlock eyebrow="Quản trị" title="Quản lý món ăn và đơn hàng" />
      <div className="manage-grid">
        <form className="panel form-card" onSubmit={(event) => { event.preventDefault(); onSaveDish(form); setEditing(null); }}>
          <HeaderBlock eyebrow="Món ăn" title={form.MaMon ? 'Cập nhật món' : 'Thêm món mới'} compact />
          <label>Tên món<input value={form.TenMon} onChange={(e) => setField('TenMon', e.target.value)} required /></label>
          <label>Danh mục
            <select value={form.MaDM} onChange={(e) => setField('MaDM', Number(e.target.value))}>
              {categories.map((category) => <option key={category.MaDM} value={category.MaDM}>{category.TenDM}</option>)}
            </select>
          </label>
          <label>Giá<input type="number" value={form.Gia} onChange={(e) => setField('Gia', Number(e.target.value))} required /></label>
          <label>Phần trăm giảm<input type="number" value={form.PhanTramGiam} onChange={(e) => setField('PhanTramGiam', Number(e.target.value))} /></label>
          <label>Ảnh món<input value={form.HinhAnh} onChange={(e) => setField('HinhAnh', e.target.value)} /></label>
          <label>Mô tả<textarea value={form.MoTa} onChange={(e) => setField('MoTa', e.target.value)} /></label>
          <label className="checkbox"><input type="checkbox" checked={Boolean(form.TrangThai)} onChange={(e) => setField('TrangThai', e.target.checked ? 1 : 0)} /> Đang bán</label>
          <div className="button-row">
            <button className="primary" type="submit">Lưu món</button>
            <button className="secondary" type="button" onClick={() => setEditing(null)}>Tạo mới</button>
          </div>
        </form>
        <div className="panel table-panel">
          <HeaderBlock eyebrow="Danh sách" title="Món ăn trong hệ thống" compact />
          <div className="dish-table">
            {dishes.map((dish) => (
              <div key={dish.MaMon}>
                <img src={dish.HinhAnh} alt="" />
                <span>{dish.TenMon}<small>{dish.TenDM}</small></span>
                <strong>{money(dish.Gia)}</strong>
                <button className="secondary" onClick={() => setEditing(dish)}>Sửa</button>
                <button className="icon-btn danger" onClick={() => onDisableDish(dish.MaMon)}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <OrdersScreen orders={orders} isAdmin onUpdateOrder={onUpdateOrder} />
    </section>
  );
}

function OrderSummary({ cart, action, onAction }) {
  return (
    <aside className="panel summary-card">
      <HeaderBlock eyebrow="Tổng kết" title="Chi phí đơn hàng" compact />
      <div><span>Tạm tính</span><strong>{money(cart.subtotal)}</strong></div>
      <div><span>Phí ship</span><strong>{money(cart.shipping)}</strong></div>
      <div className="total"><span>Tổng thanh toán</span><strong>{money(cart.total)}</strong></div>
      {action && <button className="primary" onClick={onAction}>{action}</button>}
    </aside>
  );
}

function HeaderBlock({ eyebrow, title, compact = false }) {
  return (
    <div className={compact ? 'header-block compact' : 'header-block'}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
    </div>
  );
}

function EmptyState({ title, action, onAction }) {
  return (
    <div className="empty-state">
      <ShoppingCart size={42} />
      <h3>{title}</h3>
      {action && <button className="primary" onClick={onAction}>{action}</button>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
