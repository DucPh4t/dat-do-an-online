import React from 'react';
import { createRoot } from 'react-dom/client';
import { AccountManager, StaffManager } from './admin/PeopleAdminPanel.jsx';
import './styles.css';

const API_URL = '/api';

function PeopleAdminApp() {
  const [token, setToken] = React.useState(() => localStorage.getItem('food_token') || '');
  const [user, setUser] = React.useState(null);
  const [accounts, setAccounts] = React.useState([]);
  const [staff, setStaff] = React.useState([]);
  const [notice, setNotice] = React.useState('');
  const [loginForm, setLoginForm] = React.useState({ email: 'admin@demo.vn', password: '123456' });

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

  function showNotice(message) {
    setNotice(message);
    setTimeout(() => setNotice(''), 2500);
  }

  function showError(error) {
    setNotice(error.message || 'Không thể xử lý yêu cầu');
    setTimeout(() => setNotice(''), 3000);
  }

  const loadMe = React.useCallback(async () => {
    if (!token) return;
    const data = await request('/auth/me');
    setUser(data.user);
  }, [request, token]);

  const loadAccounts = React.useCallback(async () => {
    if (!token) return;
    const data = await request('/accounts');
    setAccounts(data.accounts || []);
  }, [request, token]);

  const loadStaff = React.useCallback(async () => {
    if (!token) return;
    const data = await request('/staff');
    setStaff(data.staff || []);
  }, [request, token]);

  async function refreshAll() {
    await Promise.all([loadAccounts(), loadStaff()]);
  }

  React.useEffect(() => {
    if (!token) return;
    loadMe().then(refreshAll).catch(showError);
  }, [token, loadMe]);

  async function login(event) {
    event.preventDefault();
    try {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm)
      });
      localStorage.setItem('food_token', data.token);
      setToken(data.token);
      setUser(data.user);
      showNotice('Đăng nhập thành công');
    } catch (error) {
      showError(error);
    }
  }

  function logout() {
    localStorage.removeItem('food_token');
    setToken('');
    setUser(null);
    setAccounts([]);
    setStaff([]);
  }

  async function saveAccount(maTK, payload) {
    try {
      await request(`/accounts/${maTK}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      await loadAccounts();
      showNotice('Đã cập nhật tài khoản');
    } catch (error) {
      showError(error);
    }
  }

  async function saveStaff(payload) {
    try {
      const isUpdate = Boolean(payload.MaNV);
      const method = isUpdate ? 'PUT' : 'POST';
      const path = isUpdate ? `/staff/${payload.MaNV}` : '/staff';
      await request(path, {
        method,
        body: JSON.stringify({ MatKhau: '123456', ...payload })
      });
      await Promise.all([loadStaff(), loadAccounts()]);
      showNotice(isUpdate ? 'Đã cập nhật nhân viên' : 'Đã thêm nhân viên');
    } catch (error) {
      showError(error);
    }
  }

  async function disableStaff(maNV) {
    try {
      await request(`/staff/${maNV}`, { method: 'DELETE' });
      await Promise.all([loadStaff(), loadAccounts()]);
      showNotice('Đã khóa nhân viên');
    } catch (error) {
      showError(error);
    }
  }

  if (!token || !user) {
    return (
      <div className="app-shell">
        {notice && <div className="toast">{notice}</div>}
        <main className="page-canvas">
          <section className="auth-viewport">
            <form className="panel auth-card" onSubmit={login}>
              <div className="auth-title">
                <span className="eyebrow">DeliCore Admin</span>
                <h2>Đăng nhập quản trị</h2>
              </div>
              <label>Email
                <input type="email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required />
              </label>
              <label>Mật khẩu
                <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
              </label>
              <button className="primary" type="submit">Vào quản lý</button>
              <a className="secondary" href="/">Quay về trang chính</a>
            </form>
          </section>
        </main>
      </div>
    );
  }

  const isAdmin = ['ADMIN', 'NHANVIEN'].includes(user.VaiTro);
  if (!isAdmin) {
    return (
      <div className="app-shell">
        <main className="page-canvas">
          <div className="empty-state">
            <h3>Không có quyền truy cập</h3>
            <button className="primary" onClick={logout}>Đăng xuất</button>
            <a className="secondary" href="/">Quay về trang chính</a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {notice && <div className="toast">{notice}</div>}
      <header className="command-bar">
        <a className="brand-chip" href="/">
          <span className="brand-logo">DC</span>
          <span><strong>DeliCore</strong><small>Tài khoản & nhân viên</small></span>
        </a>
        <nav className="top-nav">
          <a className="active" href="/admin-people.html">Tài khoản</a>
          <a href="/">Trang chính</a>
        </nav>
        <div className="session-area">
          <div className="user-pill">
            <span>{user.HoTen}</span>
            <button className="icon-btn" onClick={logout}>Thoát</button>
          </div>
        </div>
      </header>
      <main className="page-canvas">
        <section className="page-stack">
          <div className="header-block">
            <span className="eyebrow">Admin</span>
            <h2>Quản lý tài khoản và nhân viên</h2>
          </div>
          <div className="manage-grid">
            <AccountManager accounts={accounts} onSaveAccount={saveAccount} />
            <StaffManager staff={staff} onSaveStaff={saveStaff} onDisableStaff={disableStaff} />
          </div>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<PeopleAdminApp />);
