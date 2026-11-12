/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ShoppingBag,
  ShieldCheck,
  Search,
  ArrowRight,
  Check,
  Plus,
  User,
} from 'lucide-react';
import {
  AdminSession,
  AdminUser,
  CartItem,
  ClientBiometrics,
  ClientHealthGoals,
  ClientSession,
  ClientUser,
  MedicalReportRecord,
  OrderReceipt,
  Product,
  ProductCategory,
  SaleRecord,
} from './types/nutrivital';
import {
  INITIAL_ADMIN_USERS,
  INITIAL_CLIENT_USERS,
  INITIAL_PRODUCTS,
  INITIAL_SALES_HISTORY,
} from './data/seedData';
import {
  calculateCartSummary,
  deductInventoryAfterPurchase,
} from './utils/analytics';
import { ProductIllustration } from './components/ProductIllustration';
import { WellnessSimulator } from './components/WellnessSimulator';
import { CartDrawer } from './components/CartDrawer';
import { NutriBotWidget } from './components/NutriBotWidget';
import { AdminAuthModal } from './components/AdminAuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientAuthModal } from './components/ClientAuthModal';
import { ClientBiometricsModal } from './components/ClientBiometricsModal';
import { HealthAnalyticsSection } from './components/HealthAnalyticsSection';
import { ChartMetricView } from './components/DynamicProgressChart';

const STORAGE_KEYS = {
  PRODUCTS: 'nutrivital_products_v1',
  SALES: 'nutrivital_sales_v1',
  ADMINS: 'nutrivital_admins_v1',
  SESSION: 'nutrivital_admin_session_v1',
  CLIENTS: 'nutrivital_clients_v2',
  CLIENT_SESSION: 'nutrivital_client_session_v2',
};

export default function App() {
  // Persistent State
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SALES);
      return saved ? JSON.parse(saved) : INITIAL_SALES_HISTORY;
    } catch {
      return INITIAL_SALES_HISTORY;
    }
  });

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADMINS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Verify that default demo admin accounts are preserved
          const missing = INITIAL_ADMIN_USERS.filter(
            (initU) =>
              !parsed.some(
                (p: AdminUser) =>
                  p.email.toLowerCase() === initU.email.toLowerCase()
              )
          );
          return missing.length > 0 ? [...parsed, ...missing] : parsed;
        }
      }
      return INITIAL_ADMIN_USERS;
    } catch {
      return INITIAL_ADMIN_USERS;
    }
  });

  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSION);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Client & Biometrics Persistent State
  const [clients, setClients] = useState<ClientUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return INITIAL_CLIENT_USERS;
    } catch {
      return INITIAL_CLIENT_USERS;
    }
  });

  const [clientSession, setClientSession] = useState<ClientSession | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLIENT_SESSION);
      if (saved) {
        return JSON.parse(saved);
      }
      return {
        userId: INITIAL_CLIENT_USERS[0].id,
        name: INITIAL_CLIENT_USERS[0].name,
        email: INITIAL_CLIENT_USERS[0].email,
        role: 'Cliente',
        loggedInAt: new Date().toISOString(),
      };
    } catch {
      return {
        userId: INITIAL_CLIENT_USERS[0].id,
        name: INITIAL_CLIENT_USERS[0].name,
        email: INITIAL_CLIENT_USERS[0].email,
        role: 'Cliente',
        loggedInAt: new Date().toISOString(),
      };
    }
  });

  const currentClient = useMemo(() => {
    return (
      clients.find((c) => c.id === clientSession?.userId) ??
      clients[0] ??
      INITIAL_CLIENT_USERS[0]
    );
  }, [clients, clientSession]);

  const [isClientAuthModalOpen, setIsClientAuthModalOpen] = useState<boolean>(false);
  const [isClientBiometricsModalOpen, setIsClientBiometricsModalOpen] = useState<boolean>(false);
  const [activeSupplementIds, setActiveSupplementIds] = useState<string[]>(() => {
    return INITIAL_CLIENT_USERS[0].activeSupplements || ['SUP-OMEGA3', 'SUP-MAGNESIO'];
  });
  const [simulatedCalories, setSimulatedCalories] = useState<number>(() => {
    return INITIAL_CLIENT_USERS[0].biometrics.dailyCalories || 2200;
  });
  const [selectedChartMetric, setSelectedChartMetric] = useState<ChartMetricView>('presion');
  const [medicalReports, setMedicalReports] = useState<MedicalReportRecord[]>(() => {
    return currentClient?.medicalReports || [];
  });

  // Synchronize simulation defaults & medical reports when currentClient changes
  useEffect(() => {
    if (currentClient) {
      setActiveSupplementIds(currentClient.activeSupplements || ['SUP-OMEGA3', 'SUP-MAGNESIO']);
      setSimulatedCalories(currentClient.biometrics.dailyCalories || 2200);
      setMedicalReports(currentClient.medicalReports || []);
    }
  }, [currentClient.id]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    } catch {
      // Ignore storage errors
    }
  }, [clients]);

  useEffect(() => {
    try {
      if (clientSession) {
        localStorage.setItem(STORAGE_KEYS.CLIENT_SESSION, JSON.stringify(clientSession));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CLIENT_SESSION);
      }
    } catch {
      // Ignore storage errors
    }
  }, [clientSession]);

  // UI & Navigation State
  const [activeView, setActiveView] = useState<'client' | 'admin'>('client');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([
    { product: INITIAL_PRODUCTS[0], quantity: 1 },
  ]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderReceipt[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch {
      // Ignore storage errors
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(salesHistory));
    } catch {
      // Ignore storage errors
    }
  }, [salesHistory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(adminUsers));
    } catch {
      // Ignore storage errors
    }
  }, [adminUsers]);

  useEffect(() => {
    try {
      if (adminSession) {
        localStorage.setItem(
          STORAGE_KEYS.SESSION,
          JSON.stringify(adminSession)
        );
      } else {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
      }
    } catch {
      // Ignore storage errors
    }
  }, [adminSession]);

  const cartSummary = useMemo(() => calculateCartSummary(cart), [cart]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat =
        selectedCategory === 'Todos' || p.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Handlers
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const nextQty = Math.min(product.stock, existing.quantity + 1);
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, product, quantity: nextQty }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });

    setRecentlyAddedId(product.id);
    setTimeout(() => {
      setRecentlyAddedId((current) =>
        current === product.id ? null : current
      );
    }, 1200);
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const latestProduct =
            products.find((p) => p.id === productId) ?? item.product;
          const nextQty = Math.min(
            latestProduct.stock,
            item.quantity + delta
          );
          return nextQty > 0
            ? { product: latestProduct, quantity: nextQty }
            : null;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleCompletePurchase = (
    customerName: string,
    customerEmail: string
  ): OrderReceipt | null => {
    if (cart.length === 0) return null;

    const summary = calculateCartSummary(cart);
    const updatedProducts = deductInventoryAfterPurchase(products, cart);
    setProducts(updatedProducts);

    // Record transaction in latest week of salesHistory for Admin OLS regression
    setSalesHistory((prev) => {
      if (prev.length === 0) {
        return [
          {
            week: 1,
            weekLabel: 'Sem 1',
            revenue: Math.round(summary.total),
            units: summary.totalItems,
            ordersCount: 1,
          },
        ];
      }
      const lastIdx = prev.length - 1;
      return prev.map((rec, idx) =>
        idx === lastIdx
          ? {
            ...rec,
            revenue: Number((rec.revenue + summary.total).toFixed(2)),
            units: rec.units + summary.totalItems,
            ordersCount: rec.ordersCount + 1,
          }
          : rec
      );
    });

    const receipt: OrderReceipt = {
      id: `NV-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      customerName,
      customerEmail,
      paymentMethod: 'Pago Verificado NutriVital Pay',
      items: cart.map((c) => ({
        productId: c.product.id,
        name: c.product.name,
        quantity: c.quantity,
        unitPrice: c.product.price,
        lineTotal: Number((c.product.price * c.quantity).toFixed(2)),
      })),
      subtotal: summary.subtotal,
      tax: summary.tax,
      shipping: summary.shipping,
      total: summary.total,
    };

    setRecentOrders((prev) => [receipt, ...prev]);
    setCart([]);
    return receipt;
  };

  const handleSwitchToAdmin = () => {
    if (adminSession) {
      setActiveView('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
    }
  };

  const handleAdminLoginSuccess = (session: AdminSession) => {
    const now = new Date();
    const formattedDate = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    // Update lastLogin timestamp for the logged-in administrator
    setAdminUsers((prev) =>
      prev.map((u) =>
        u.id === session.userId || u.email.toLowerCase() === session.email.toLowerCase()
          ? { ...u, lastLogin: formattedDate }
          : u
      )
    );

    setAdminSession(session);
    setIsAuthModalOpen(false);
    setActiveView('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegisterAdmin = (newAdmin: AdminUser) => {
    setAdminUsers((prev) => {
      // Prevent duplicates by email
      const filtered = prev.filter(
        (u) => u.email.toLowerCase() !== newAdmin.email.toLowerCase()
      );
      return [...filtered, newAdmin];
    });
  };

  const handleAdminLogout = () => {
    setAdminSession(null);
    setActiveView('client');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Client & Biometric Handlers
  const handleUpdateClientBiometrics = (
    clientId: string,
    biometrics: ClientBiometrics,
    goals: ClientHealthGoals
  ) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId ? { ...c, biometrics, goals } : c
      )
    );
    setSimulatedCalories(biometrics.dailyCalories);
  };

  const handleLoginClient = (session: ClientSession) => {
    setClientSession(session);
    const matched = clients.find((c) => c.id === session.userId);
    if (matched) {
      setActiveSupplementIds(matched.activeSupplements || ['SUP-OMEGA3', 'SUP-MAGNESIO']);
      setSimulatedCalories(matched.biometrics.dailyCalories || 2200);
      setMedicalReports(matched.medicalReports || []);
    }
  };

  const handleRegisterClient = (newClient: ClientUser) => {
    setClients((prev) => [newClient, ...prev]);
  };

  const handleLogoutClient = () => {
    if (clients.length > 0) {
      setClientSession({
        userId: clients[0].id,
        name: clients[0].name,
        email: clients[0].email,
        role: 'Cliente',
        loggedInAt: new Date().toISOString(),
      });
    } else {
      setClientSession(null);
    }
  };

  const handleToggleSupplement = (suppId: string) => {
    setActiveSupplementIds((prev) => {
      const next = prev.includes(suppId)
        ? prev.filter((id) => id !== suppId)
        : [...prev, suppId];

      setClients((all) =>
        all.map((c) =>
          c.id === currentClient.id ? { ...c, activeSupplements: next } : c
        )
      );
      return next;
    });
  };

  // Medical Reports Handlers (AI Lab & Clinical Document Engine)
  const handleUploadMedicalReport = (newReport: MedicalReportRecord) => {
    const updatedReports = [newReport, ...medicalReports];
    setMedicalReports(updatedReports);

    if (!currentClient) return;

    const updatedBiometrics: ClientBiometrics = {
      ...currentClient.biometrics,
      ...(newReport.detectedSystolicBP
        ? { systolicBP: newReport.detectedSystolicBP }
        : {}),
      ...(newReport.detectedDiastolicBP
        ? { diastolicBP: newReport.detectedDiastolicBP }
        : {}),
      ...(newReport.detectedHeartRate
        ? { heartRate: newReport.detectedHeartRate }
        : {}),
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    setClients((prev) =>
      prev.map((c) =>
        c.id === currentClient.id
          ? {
            ...c,
            biometrics: updatedBiometrics,
            medicalReports: updatedReports,
          }
          : c
      )
    );
  };

  const handleDeleteMedicalReport = (reportId: string) => {
    const updatedReports = medicalReports.filter((r) => r.id !== reportId);
    setMedicalReports(updatedReports);

    if (!currentClient) return;

    setClients((prev) =>
      prev.map((c) =>
        c.id === currentClient.id
          ? { ...c, medicalReports: updatedReports }
          : c
      )
    );
  };

  // Admin CRUD callbacks
  const handleAddProduct = (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev]);
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProd.id ? updatedProd : p))
    );
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleAddWeekSale = (revenue: number, units: number) => {
    setSalesHistory((prev) => {
      const nextWeek = prev.length + 1;
      return [
        ...prev,
        {
          week: nextWeek,
          weekLabel: `Sem ${nextWeek}`,
          revenue,
          units,
          ordersCount: Math.max(1, Math.round(units / 1.8)),
        },
      ];
    });
  };

  const handleResetSalesHistory = () => {
    setSalesHistory(INITIAL_SALES_HISTORY);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element brand wordmark */}
          <a
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('client');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-xl font-extrabold tracking-tight text-emerald-800 whitespace-nowrap shrink-0 font-display"
          >
            NutriVital
          </a>

          {/* Zone 2: 4 concise single-line text navigation links */}
          <nav
            aria-label="Navegación Principal"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            <a
              href="#inicio"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('client');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 ${activeView === 'client' ? 'text-emerald-700 font-semibold' : ''
                }`}
            >
              Inicio
            </a>
            <a
              href="#catalogo"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('client');
                setTimeout(() => {
                  document
                    .getElementById('catalogo')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }, 40);
              }}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0"
            >
              Catálogo Saludable
            </a>
            <a
              href="#mi-salud"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('client');
                setTimeout(() => {
                  document
                    .getElementById('mi-salud')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }, 40);
              }}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0"
            >
              Mi Salud & Biometría
            </a>
            <a
              href="#progreso"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('client');
                setTimeout(() => {
                  document
                    .getElementById('progreso')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }, 40);
              }}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0"
            >
              Tu Progreso
            </a>
            {adminSession && (
              <a
                href="#administrador"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView('admin');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${activeView === 'admin' ? 'text-emerald-700 font-semibold' : ''
                  }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Panel Administrador</span>
              </a>
            )}
          </nav>

          {/* Zone 3: Client Account access + Shopping Cart */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsClientAuthModalOpen(true)}
              aria-label="Cuenta de cliente e inicio de sesión"
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-colors shadow-2xs"
            >
              <User className="w-3.5 h-3.5 text-emerald-700" />
              <span className="truncate max-w-[110px]">
                {currentClient ? currentClient.name.split(' ')[0] : 'Iniciar Sesión'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label={`Abrir carrito de compras con ${cartSummary.totalItems} artículos`}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 shadow-2xs"
            >
              <ShoppingBag className="w-4 h-4 text-[#86EFAC]" />
              <span>Carrito ({cartSummary.totalItems})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sub-header Workspace Bar */}
      <div className="bg-[#F0FDF4] border-b border-emerald-100/90">
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-medium text-emerald-900">
              Nutrición Celular & Biotecnología Botánica
            </span>
            <span aria-hidden="true">·</span>
            <span>Envío Eco-Térmico gratis desde $90 USD</span>
          </div>

          {/* Admin controls: ONLY shown when an administrator is authenticated */}
          {adminSession ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-emerald-100/70 text-emerald-900 text-[11px] font-medium border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span className="truncate max-w-[140px] font-semibold">{adminSession.name}</span>
                <span className="text-emerald-700 font-normal">({adminSession.role})</span>
              </div>

              {/* Interactive View Switcher for logged-in Administrator */}
              <div
                role="group"
                aria-label="Selector de vista de plataforma"
                className="flex items-center gap-1 p-1 bg-white rounded-xl border border-emerald-200/80"
              >
                <button
                  type="button"
                  onClick={() => setActiveView('client')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${activeView === 'client'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Vista Cliente
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('admin')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${activeView === 'admin'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Panel Administrador</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdminLogout}
                aria-label="Cerrar sesión activa de administrador"
                className="px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Salir (Admin)
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 text-slate-500 text-[11px]">
              <span className="text-emerald-800 font-medium">Biotecnología & Nutrición Celular</span>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1">
        {activeView === 'admin' && adminSession ? (
          <AdminDashboard
            session={adminSession}
            adminUsers={adminUsers}
            products={products}
            salesHistory={salesHistory}
            recentOrders={recentOrders}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onAddWeekSale={handleAddWeekSale}
            onResetSalesHistory={handleResetSalesHistory}
            onLogout={handleAdminLogout}
            onOpenRegisterAdmin={() => {
              setAuthModalMode('register');
              setIsAuthModalOpen(true);
            }}
          />
        ) : (
          <>
            {/* HERO SECTION */}
            <section
              id="inicio"
              className="bg-gradient-to-b from-[#F0FDF4] via-white to-[#F8FAFC] pt-12 pb-16 border-b border-slate-200/60"
            >
              <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                  <div className="lg:col-span-7 space-y-6">
                    <p className="text-xs font-semibold text-emerald-700 tracking-wide">
                      Fórmulas Limpias · Trazabilidad Clínica · 100% Biodisponible
                    </p>
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
                      Nutrición funcional diseñada para transformar tu energía celular.
                    </h1>
                    <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                      En <strong>NutriVital</strong> combinamos superalimentos orgánicos, extractos adaptógenos estandarizados y proteínas vegetales germinadas sin azúcares añadidos para optimizar tu metabolismo, descanso y longevidad.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <a
                        href="#catalogo"
                        className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-2xl transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
                      >
                        <span>Explorar Catálogo Saludable</span>
                        <ArrowRight className="w-4 h-4" />
                      </a>
                      <a
                        href="#progreso"
                        className="px-6 py-3.5 bg-white hover:bg-emerald-50 text-slate-800 border border-slate-200 font-semibold text-sm rounded-2xl transition-colors whitespace-nowrap"
                      >
                        Simular Mi Progreso
                      </a>
                    </div>

                    <div className="pt-4 grid grid-cols-3 gap-6 border-t border-emerald-100 max-w-xl">
                      <div>
                        <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                          100%
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Extractos puros sin rellenos sintéticos
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">
                          +94%
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Biodisponibilidad celular verificada
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                          24h
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Despacho en empaque eco-térmico
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Hero Featured Product Showcase Card */}
                  <div className="lg:col-span-5">
                    <div className="bg-white rounded-2xl border border-emerald-100 shadow-md p-6 space-y-5">
                      <ProductIllustration
                        variant="protein-matcha"
                        className="h-56 rounded-xl"
                      />
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Fórmula Destacada del Mes</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-emerald-700 font-semibold">
                            25g Proteína / 6g Fibra
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">
                          Proteína Bio-Activa Matcha & Vainilla
                        </h2>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Aislado de guisante germinado con té verde matcha ceremonial de Uji y complejo multienzimático para digestión ligera.
                        </p>
                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                            $44.50 USD
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(products[0] ?? INITIAL_PRODUCTS[0])}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors"
                          >
                            Añadir al Carrito
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* CATALOG SECTION (Module B) */}
            <section
              id="catalogo"
              aria-labelledby="catalog-heading"
              className="py-16 max-w-7xl mx-auto px-6 space-y-8"
            >
              <div className="flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 mb-1">
                      E-Commerce de Nutrición Funcional
                    </p>
                    <h2
                      id="catalog-heading"
                      className="text-3xl font-bold text-slate-900 tracking-tight"
                    >
                      Catálogo de Productos Saludables
                    </h2>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      type="search"
                      aria-label="Buscar productos por nombre o etiqueta"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar proteína, keto, matcha..."
                      className="pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 w-full"
                    />
                  </div>
                </div>

                {/* Single-line Category Filter Controls */}
                <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1">
                  <div
                    role="group"
                    aria-label="Filtrar por categoría"
                    className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0"
                  >
                    {[
                      'Todos',
                      'Batidos Proteicos',
                      'Superalimentos',
                      'Suplementos Naturales',
                      'Snacks Orgánicos',
                    ].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${selectedCategory === cat
                            ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <span className="hidden md:inline text-xs text-slate-500 font-mono tabular-nums shrink-0">
                    Mostrando {filteredProducts.length} de {products.length} productos
                  </span>
                </div>
              </div>

              {/* Product Grid */}
              {filteredProducts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                  <p className="text-base font-semibold text-slate-800">
                    No encontramos productos que coincidan con tu filtro.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('Todos');
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
                  >
                    Mostrar todo el catálogo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                  {filteredProducts.map((product) => {
                    const isAdded = recentlyAddedId === product.id;
                    const isOutOfStock = product.stock <= 0;

                    return (
                      <article
                        key={product.id}
                        className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden"
                      >
                        <div>
                          {/* Illustration / Minimalist Mockup */}
                          <ProductIllustration
                            variant={product.illustration}
                            className="h-52 border-b border-slate-100"
                          />

                          <div className="p-6 space-y-3">
                            {/* Unboxed clean metadata (Zero-Pill discipline) */}
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="font-medium text-emerald-700">
                                {product.tag}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{product.category}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                Stock: {product.stock}
                              </span>
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 leading-snug">
                              {product.name}
                            </h3>

                            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                              {product.description}
                            </p>

                            {/* Quick Nutritional Facts (Unboxed clean typography with tabular numerals) */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-mono tabular-nums">
                              <span>{product.calories} kcal</span>
                              <span aria-hidden="true">·</span>
                              <span>{product.protein}g Proteína</span>
                              <span aria-hidden="true">·</span>
                              <span>{product.fiber}g Fibra</span>
                            </div>
                          </div>
                        </div>

                        {/* Price & Add to Cart Footer */}
                        <div className="px-6 pb-6 pt-2 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-[11px] text-slate-400">
                              {product.servingSize}
                            </p>
                            <p className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                              ${product.price.toFixed(2)}
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => handleAddToCart(product)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${isOutOfStock
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : isAdded
                                  ? 'bg-emerald-800 text-white'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                              }`}
                          >
                            {isOutOfStock ? (
                              <span>Agotado</span>
                            ) : isAdded ? (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Añadido</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                <span>Añadir al Carrito</span>
                              </>
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* HEALTH ANALYTICS, BIOMETRICS, LAB REPORTS & DYNAMIC GOALS CHART */}
            <HealthAnalyticsSection
              currentClient={currentClient}
              onOpenProfileModal={() => setIsClientBiometricsModalOpen(true)}
              products={products}
              onAddToCart={handleAddToCart}
              activeSupplementIds={activeSupplementIds}
              onToggleSupplement={handleToggleSupplement}
              simulatedCalories={simulatedCalories}
              onChangeSimulatedCalories={setSimulatedCalories}
              selectedChartMetric={selectedChartMetric}
              onSelectChartMetric={setSelectedChartMetric}
              medicalReports={medicalReports}
              onUploadMedicalReport={handleUploadMedicalReport}
              onDeleteMedicalReport={handleDeleteMedicalReport}
            />

            {/* WELLNESS PROJECTION SIMULATOR (Module D) */}
            <WellnessSimulator />
          </>
        )}
      </main>

      {/* CLEAN FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-bold text-slate-900 font-display">
              NutriVital
            </span>{' '}
            · Plataforma de Nutrición Funcional & Bienestar Integral
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#catalogo"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('client');
                document
                  .getElementById('catalogo')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-slate-900"
            >
              Catálogo
            </a>
            <a
              href="#progreso"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('client');
                document
                  .getElementById('progreso')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-slate-900"
            >
              Simulador
            </a>
            {adminSession ? (
              <button
                type="button"
                onClick={handleAdminLogout}
                className="hover:text-red-600 font-medium text-red-500 text-xs"
              >
                Cerrar Sesión Administrador
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSwitchToAdmin}
                className="hover:text-slate-700 text-slate-400 text-[11px] transition-colors"
                title="Acceso exclusivo para personal administrativo"
              >
                Portal Administrador
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* SLIDE-OVER SHOPPING CART DRAWER (Module C) */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onCompletePurchase={handleCompletePurchase}
      />

      {/* ADMIN AUTHENTICATION MODAL */}
      <AdminAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        adminUsers={adminUsers}
        onLoginSuccess={handleAdminLoginSuccess}
        onRegisterAdmin={handleRegisterAdmin}
        initialMode={authModalMode}
        currentSession={adminSession}
      />

      {/* CLIENT AUTHENTICATION MODAL (LOGIN & REGISTER - 100% CLEAN WITHOUT NUTRITIONAL DATA) */}
      <ClientAuthModal
        isOpen={isClientAuthModalOpen}
        onClose={() => setIsClientAuthModalOpen(false)}
        currentClient={clientSession ? currentClient : null}
        allClients={clients}
        onLoginClient={handleLoginClient}
        onRegisterClient={handleRegisterClient}
        onLogoutClient={handleLogoutClient}
      />

      {/* CLIENT BIOMETRICS & HEALTH GOALS MODAL (OPENED STRICTLY FROM THE HEALTH/NUTRITION SECTION) */}
      <ClientBiometricsModal
        isOpen={isClientBiometricsModalOpen}
        onClose={() => setIsClientBiometricsModalOpen(false)}
        currentClient={currentClient}
        allClients={clients}
        onUpdateBiometrics={handleUpdateClientBiometrics}
        onSelectClient={(c) => {
          handleLoginClient({
            userId: c.id,
            name: c.name,
            email: c.email,
            role: 'Cliente',
            loggedInAt: new Date().toISOString(),
          });
        }}
      />

      {/* FLOATING NUTRIBOT VIRTUAL ASSISTANT (Module E) */}
      <NutriBotWidget
        onSelectCategory={(cat: ProductCategory) => {
          setActiveView('client');
          setSelectedCategory(cat);
        }}
      />
    </div>
  );
}