import React from 'react';
import { AccountManager, StaffManager } from './admin/PeopleAdminPanel.jsx';

const API = '/api';
const vnd = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

export default function App() {
  const [token, setToken] = React.useState(localStorage.getItem('food_token') || '');
  const [user, setUser] = React.useState(null);
  const [view, setView] = React.useState('login');
  const [data