import React from 'react';
import { createRoot } from 'react-dom/client';
import { AccountManager, StaffManager } from './admin/PeopleAdminPanel.jsx';
import './styles.css';

const API = '/api';
const vnd = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const label = {
  ChoXacNhan: 'Chờ xác nhận', DangChuanBi: 'Đang chuẩn bị', DangGiao: 'Đang giao', HoanThanh: 'Hoàn thành', DaHuy: 'Đã hủy',
  ChoNhan