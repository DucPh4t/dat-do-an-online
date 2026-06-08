import React from 'react';
import { Trash2 } from 'lucide-react';

const accountStatusLabel = {
  HoatDong: 'Hoạt động',
  KhoaTam: 'Khóa tạm',
  ChoDuyet: 'Chờ duyệt'
};

const roleLabel = {
  KhachHang: 'Khách hàng',
  NhanVien: 'Nhân viên',
  Shipper: 'Shipper',
  Admin: 'Admin',
  KHACHHANG: 'Khách hàng',
  NHANVIEN: 'Nhân viên',
  SHIPPER: 'Shipper',
  ADMIN: 'Admin'
};

function HeaderBlock({ eyebrow, title, compact = false }) {
  return (
    <div className={compact ? 'header-block compact' : 'header-block'}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
    </div>
  );
}

export function AccountManager({ accounts = [], onSaveAccount }) {
  return (
    <section className="panel table-panel">
      <HeaderBlock eyebrow="Tài khoản" title="Quản lý trạng thái tài khoản" compact />
      <div className="dish-table">
        {accounts.map((account) => (
          <AccountRow key={account.MaTK} account={account} onSaveAccount={onSaveAccount} />
        ))}
      </div>
    </section>
  );
}

function AccountRow({ account, onSaveAccount }) {
  const [form, setForm] = React.useState({
    HoTen: account.HoTen || '',
    Email: account.Email || '',
    SDT: account.SDT || '',
    VaiTro: account.VaiTro || account.VaiTroSQL || 'KhachHang',
    TrangThai: account.TrangThai || 'HoatDong'
  });

  React.useEffect(() => {
    setForm({
      HoTen: account.HoTen || '',
      Email: account.Email || '',
      SDT: account.SDT || '',
      VaiTro: account.VaiTro || account.VaiTroSQL || 'KhachHang',
      TrangThai: account.TrangThai || 'HoatDong'
    });
  }, [account]);

  return (
    <div>
      <span>
        {account.HoTen}
        <small>{account.Email} · {roleLabel[account.VaiTro] || roleLabel[account.VaiTroSQL] || account.VaiTro}</small>
      </span>
      <select value={form.TrangThai} onChange={(e) => setForm({ ...form, TrangThai: e.target.value })}>
        <option value="HoatDong">Hoạt động</option>
        <option value="KhoaTam">Khóa tạm</option>
        <option value="ChoDuyet">Chờ duyệt</option>
      </select>
      <strong>{accountStatusLabel[form.TrangThai] || form.TrangThai}</strong>
      <button className="secondary" type="button" onClick={() => onSaveAccount(account.MaTK, form)}>Lưu</button>
    </div>
  );
}

export function StaffManager({ staff = [], onSaveStaff, onDisableStaff }) {
  const blank = {
    HoTen: '',
    Email: '',
    SDT: '',
    ChucVu: 'Nhân viên xử lý đơn',
    CaLam: 'Ca chiều',
    TrangThai: 'HoatDong'
  };
  const [form, setForm] = React.useState(blank);
  const setField = (key, value) => setForm({ ...form, [key]: value });

  return (
    <section className="panel form-card">
      <HeaderBlock eyebrow="Nhân viên" title={form.MaNV ? 'Cập nhật nhân viên' : 'Thêm nhân viên'} compact />
      <form onSubmit={(event) => { event.preventDefault(); onSaveStaff(form); setForm(blank); }}>
        <label>Họ tên<input value={form.HoTen} onChange={(e) => setField('HoTen', e.target.value)} required /></label>
        <label>Email<input type="email" value={form.Email} onChange={(e) => setField('Email', e.target.value)} required /></label>
        <label>SĐT<input value={form.SDT || ''} onChange={(e) => setField('SDT', e.target.value)} /></label>
        <label>Chức vụ<input value={form.ChucVu || ''} onChange={(e) => setField('ChucVu', e.target.value)} /></label>
        <label>Ca làm<input value={form.CaLam || ''} onChange={(e) => setField('CaLam', e.target.value)} /></label>
        <label>Trạng thái<select value={form.TrangThai || 'HoatDong'} onChange={(e) => setField('TrangThai', e.target.value)}>
          <option value="HoatDong">Hoạt động</option>
          <option value="KhoaTam">Khóa tạm</option>
          <option value="ChoDuyet">Chờ duyệt</option>
        </select></label>
        <div className="button-row">
          <button className="primary" type="submit">Lưu nhân viên</button>
          <button className="secondary" type="button" onClick={() => setForm(blank)}>Tạo mới</button>
        </div>
      </form>
      <div className="dish-table">
        {staff.map((employee) => (
          <div key={employee.MaNV}>
            <span>{employee.HoTen}<small>{employee.Email} · {employee.ChucVu || 'Nhân viên'} · {accountStatusLabel[employee.TrangThai] || employee.TrangThai}</small></span>
            <strong>{employee.CaLam || 'Chưa set ca'}</strong>
            <button className="secondary" type="button" onClick={() => setForm(employee)}>Sửa</button>
            <button className="icon-btn danger" type="button" onClick={() => onDisableStaff(employee.MaNV)}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </section>
  );
}
