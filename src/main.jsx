import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChefHat, ShoppingCart, ClipboardList, Settings, Bike, LogOut, Trash2 } from 'lucide-react';
import { AccountManager, StaffManager } from './admin/PeopleAdminPanel.jsx';
import './styles.css';

const API = '/api';
const vnd = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
