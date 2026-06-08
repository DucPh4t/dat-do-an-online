import React from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart3, Bike, ChefHat, ClipboardList, CreditCard, Home, LogOut, Minus, PackageCheck, Plus, Search, Settings, ShoppingCart, Sparkles, Store, Trash2, UserRound } from 'lucide-react';
import { AccountManager, StaffManager } from './admin/PeopleAdminPanel.jsx';
import './styles.css';

const API_URL = '/api';
const money = (value) => new Intl.NumberFormat('vi-VN', { style: '