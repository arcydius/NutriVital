/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart,
  ShieldCheck,
  Search,
  ArrowRight,
  Check,
  Plus,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import {
  AdminSession,
  AdminUser,
  CartItem,
  ClientBiometrics,
  ClientSession,
  ClientUser,
  MedicalReportRecord,
  OrderReceipt,
  Product,
  ProductCategory,
} from './types/nutrivital';
import {
  INITIAL_ADMIN_USERS,
  INITIAL_CLIENT_USERS,
  INITIAL_PRODUCTS,
} from './data/seedData';
import {
  calculateCartSummary,
  deductInventoryAfterPurchase,
} from './utils/analytics';
import {
  calculateAge,
  calculateAiSuggestedGoals,
  calculateBMI,
  estimateMaintenanceCalories,
  validateInitialReportRequirements,
} from './utils/healthAnalytics';
import { ProductIllustration } from './components/ProductIllustration';
import { WellnessSimulator } from './components/WellnessSimulator';
import { CartDrawer } from './components/CartDrawer';
import { NutriBotWidget } from './components/NutriBotWidget';
import { AdminAuthModal } from './components/AdminAuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientAuthModal } from './components/ClientAuthModal';
import { HealthAnalyticsSection } from './components/HealthAnalyticsSection';
import { ChartMetricView } from './components/DynamicProgressChart';
import { nutriApi } from './services/api';

const STORAGE_KEYS = {
  PRODUCTS: 'nutrivital_products_v1',
  ORDERS: 'nutrivital_orders_v1',
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

  // Client & Biometrics Persistent State (0 metrics until medical report is uploaded)
  const [clients, setClients] = useState<ClientUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c: ClientUser) => {
            const hasReports = Array.isArray(c.medicalReports) && c.medicalReports.length > 0;
            return hasReports
              ? c
              : {
                  ...c,
                  biometrics: null,
                  goals: null,
                  activeSupplements: [],
                  medicalReports: [],
                };
          });
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
      return null;
    } catch {
      return null;
    }
  });

  const currentClient = useMemo(() => {
    if (!clientSession) return null;
    return clients.find((c) => c.id === clientSession.userId) ?? null;
  }, [clients, clientSession]);

  const [isClientAuthModalOpen, setIsClientAuthModalOpen] = useState<boolean>(false);
  const [activeSupplementIds, setActiveSupplementIds] = useState<string[]>([]);
  const [simulatedCalories, setSimulatedCalories] = useState<number>(0);
  const [selectedChartMetric, setSelectedChartMetric] = useState<ChartMetricView>('presion');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const medicalReports = useMemo(() => {
    return currentClient ? currentClient.medicalReports || [] : [];
  }, [currentClient]);

  // Never keep client auth modal open once authenticated
  useEffect(() => {
    if (currentClient) {
      setIsClientAuthModalOpen(false);
    }
  }, [currentClient]);

  // Synchronize simulation defaults ONLY when currentClient has real biometrics from a report
  useEffect(() => {
    if (currentClient?.biometrics && (currentClient.medicalReports?.length ?? 0) > 0) {
      setActiveSupplementIds(currentClient.activeSupplements || []);
      setSimulatedCalories(currentClient.biometrics.dailyCalories);
    } else {
      setActiveSupplementIds([]);
      setSimulatedCalories(0);
    }
  }, [
    currentClient?.id,
    currentClient?.biometrics?.dailyCalories,
    currentClient?.medicalReports?.length,
  ]);

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
  const [activeView, setActiveView] = useState<'client' | 'admin'>(() =>
    adminSession ? 'admin' : 'client'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [reopenCartAfterLogin, setReopenCartAfterLogin] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Automatically reopen cart after login when checkout triggered authentication
  useEffect(() => {
    if (currentClient && reopenCartAfterLogin) {
      setReopenCartAfterLogin(false);
      setIsCartOpen(true);
    }
  }, [currentClient, reopenCartAfterLogin]);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderReceipt[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Hydrate initial state from Supabase if configured
  useEffect(() => {
    if (!nutriApi.isCloudEnabled()) return;
    let mounted = true;

    void nutriApi.fetchInitialState().then((cloud) => {
      if (!mounted || !cloud) return;
      if (cloud.products.length > 0) setProducts(cloud.products);
      if (cloud.clients.length > 0) setClients(cloud.clients);
      if (cloud.adminUsers.length > 0) setAdminUsers(cloud.adminUsers);
      setRecentOrders(cloud.recentOrders);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch {
      // Ignore storage errors
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(recentOrders));
    } catch {
      // Ignore storage errors
    }
  }, [recentOrders]);

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
    customerEmail: string,
    paymentMethod = 'PayPal Sandbox'
  ): OrderReceipt | null => {
    if (!currentClient || cart.length === 0) return null;

    const summary = calculateCartSummary(cart);
    const updatedProducts = deductInventoryAfterPurchase(products, cart);
    setProducts(updatedProducts);

    const now = new Date();
    const receipt: OrderReceipt = {
      id: `NV-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: now.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      createdAtIso: now.toISOString(),
      customerName: currentClient.name || customerName,
      customerEmail: currentClient.email || customerEmail,
      paymentMethod,
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
    void nutriApi.recordOrderToDb(receipt, updatedProducts, currentClient.id);
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

    setClientSession(null);
    setIsClientAuthModalOpen(false);
    setIsMobileMenuOpen(false);
    setAdminSession(session);
    setIsAuthModalOpen(false);
    setActiveView('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    void nutriApi.updateAdminLastLogin(session.userId, formattedDate);
  };

  const handleRegisterAdmin = (newAdmin: AdminUser) => {
    setAdminUsers((prev) => {
      // Prevent duplicates by email
      const filtered = prev.filter(
        (u) => u.email.toLowerCase() !== newAdmin.email.toLowerCase()
      );
      return [...filtered, newAdmin];
    });
    void nutriApi.registerAdminToDb(newAdmin);
  };

  const handleAdminLogout = () => {
    setAdminSession(null);
    setActiveView('client');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Client Auth Handlers
  const handleOpenClientAuth = () => {
    if (currentClient) return;
    setIsClientAuthModalOpen(true);
  };

  const handleLoginClient = (session: ClientSession) => {
    setClientSession(session);
    setIsClientAuthModalOpen(false);
    const matched = clients.find((c) => c.id === session.userId);
    if (matched?.biometrics && (matched.medicalReports?.length ?? 0) > 0) {
      setActiveSupplementIds(matched.activeSupplements || []);
      setSimulatedCalories(matched.biometrics.dailyCalories);
    } else {
      setActiveSupplementIds([]);
      setSimulatedCalories(0);
    }
  };

  const handleRegisterClient = (newClient: ClientUser) => {
    setClients((prev) => [newClient, ...prev]);
    void nutriApi.registerClientToDb(newClient);
  };

  const handleLogoutClient = () => {
    setClientSession(null);
    setIsClientAuthModalOpen(false);
    setCart([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.CLIENT_SESSION);
    } catch {
      // Ignore storage errors
    }
  };

  const handleToggleSupplement = (suppId: string) => {
    setActiveSupplementIds((prev) => {
      const next = prev.includes(suppId)
        ? prev.filter((id) => id !== suppId)
        : [...prev, suppId];

      if (currentClient) {
        setClients((all) =>
          all.map((c) =>
            c.id === currentClient.id ? { ...c, activeSupplements: next } : c
          )
        );
        void nutriApi.syncClientSupplements(currentClient.id, next);
      }
      return next;
    });
  };

  // Medical Reports Handlers (AI Lab & Clinical Document Engine — requires authenticated client & complete vitals)
  const handleUploadMedicalReport = (
    newReport: MedicalReportRecord,
    rawFile?: File
  ): { ok: boolean; error?: string } => {
    if (!currentClient) {
      setIsClientAuthModalOpen(true);
      return { ok: false, error: 'Inicia sesión para subir tu informe médico.' };
    }

    const hasExistingBio = Boolean(
      currentClient.biometrics && (currentClient.medicalReports?.length ?? 0) > 0
    );
    const validation = validateInitialReportRequirements(newReport, hasExistingBio);
    if (!validation.valid) {
      return {
        ok: false,
        error: `Para activar tus métricas e IA sin inventar datos, tu primer informe médico debe incluir tus signos vitales base. Faltó detectar: ${validation.missingFields.join(', ')}.`,
      };
    }

    const prevBio = hasExistingBio ? currentClient.biometrics! : null;
    const nextWeight = newReport.detectedWeight ?? prevBio!.bodyWeight;
    const nextHeight = newReport.detectedHeight ?? prevBio!.height!;
    const nextWaist = newReport.detectedWaist ?? prevBio?.waistCircumference;
    const nextBmi = calculateBMI(nextWeight, nextHeight);
    const clientAge = calculateAge(currentClient.dateOfBirth);
    const nextCalories =
      newReport.detectedDailyCalories ??
      prevBio?.dailyCalories ??
      estimateMaintenanceCalories(nextWeight, nextHeight, clientAge, currentClient.gender);

    const updatedBiometrics: ClientBiometrics = {
      systolicBP: newReport.detectedSystolicBP ?? prevBio!.systolicBP,
      diastolicBP: newReport.detectedDiastolicBP ?? prevBio!.diastolicBP,
      heartRate: newReport.detectedHeartRate ?? prevBio!.heartRate,
      bodyWeight: nextWeight,
      height: nextHeight,
      waistCircumference: nextWaist,
      bodyMass: nextBmi,
      dailyCalories: nextCalories,
      fattyLiverGrade: newReport.markers.fattyLiverGrade ?? prevBio?.fattyLiverGrade ?? 0,
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    // La IA calcula automáticamente metas orientativas seguras a partir del informe médico
    const aiSuggestedGoals = calculateAiSuggestedGoals(
      updatedBiometrics,
      newReport,
      clientAge,
      currentClient.gender
    );

    const enrichedReport: MedicalReportRecord = {
      ...newReport,
      suggestedGoals: aiSuggestedGoals,
    };

    const updatedReports = [enrichedReport, ...(currentClient.medicalReports || [])];

    setSimulatedCalories(updatedBiometrics.dailyCalories);
    setClients((prev) =>
      prev.map((c) =>
        c.id === currentClient.id
          ? {
              ...c,
              biometrics: updatedBiometrics,
              goals: aiSuggestedGoals,
              medicalReports: updatedReports,
            }
          : c
      )
    );
    void nutriApi.uploadReportToCloudDb(
      currentClient.id,
      enrichedReport,
      updatedBiometrics,
      aiSuggestedGoals,
      rawFile
    );
    return { ok: true };
  };

  const handleDeleteMedicalReport = (reportId: string) => {
    if (!currentClient) return;

    const targetReport = (currentClient.medicalReports || []).find(
      (r) => r.id === reportId
    );
    const updatedReports = (currentClient.medicalReports || []).filter(
      (r) => r.id !== reportId
    );

    if (updatedReports.length === 0) {
      setActiveSupplementIds([]);
      setSimulatedCalories(0);
      setClients((prev) =>
        prev.map((c) =>
          c.id === currentClient.id
            ? {
                ...c,
                biometrics: null,
                goals: null,
                activeSupplements: [],
                medicalReports: [],
              }
            : c
        )
      );
      void nutriApi.deleteReportFromCloudDb(reportId, targetReport?.filePath);
      void nutriApi.clearClientClinicalProfileFromDb(currentClient.id);
      return;
    }

    const latestRemaining = updatedReports[0];
    const recalculatedGoals = currentClient.biometrics
      ? latestRemaining.suggestedGoals ??
        calculateAiSuggestedGoals(
          currentClient.biometrics,
          latestRemaining,
          calculateAge(currentClient.dateOfBirth),
          currentClient.gender
        )
      : null;

    setClients((prev) =>
      prev.map((c) =>
        c.id === currentClient.id
          ? {
              ...c,
              goals: recalculatedGoals,
              medicalReports: updatedReports,
            }
          : c
      )
    );
    void nutriApi.deleteReportFromCloudDb(reportId, targetReport?.filePath);
  };

  // Admin CRUD callbacks
  const handleAddProduct = (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev]);
    void nutriApi.saveProductToDb(newProd);
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProd.id ? updatedProd : p))
    );
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== updatedProd.id) return item;
          if (updatedProd.stock <= 0) return null;
          return {
            product: updatedProd,
            quantity: Math.min(item.quantity, updatedProd.stock),
          };
        })
        .filter((item): item is CartItem => item !== null)
    );
    void nutriApi.saveProductToDb(updatedProd);
  };

  const handleBulkUpdateProducts = (updatedList: Product[]) => {
    if (updatedList.length === 0) return;
    const map = new Map(updatedList.map((p) => [p.id, p]));
    setProducts((prev) => prev.map((p) => map.get(p.id) ?? p));
    setCart((prev) =>
      prev
        .map((item) => {
          const updated = map.get(item.product.id);
          if (!updated) return item;
          if (updated.stock <= 0) return null;
          return {
            product: updated,
            quantity: Math.min(item.quantity, updated.stock),
          };
        })
        .filter((item): item is CartItem => item !== null)
    );
    void nutriApi.saveProductsBulkToDb(updatedList);
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    void nutriApi.deleteProductFromDb(productId);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-8">
          {/* Zone 1: Single text element brand wordmark */}
          <a
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('client');
              setIsMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-xl font-extrabold tracking-tight text-emerald-800 whitespace-nowrap shrink-0 font-display"
          >
            NutriVital
          </a>

          {/* Zone 2: Primary navigation links (always visible, plus Panel Administrador when logged in as admin) */}
          <nav
            aria-label="Navegación Principal"
            className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium text-slate-600"
          >
            <a
              href="#inicio"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('client');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'client' ? 'text-emerald-700 font-semibold' : ''
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
                className={`hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  activeView === 'admin' ? 'text-emerald-700 font-semibold' : ''
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Panel Administrador</span>
              </a>
            )}
          </nav>

          {/* Zone 3: Active Account (Admin or Client) + Shopping Cart (Client only) + Mobile Menu */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {adminSession ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div
                  aria-label={`Sesión administrativa de ${adminSession.name}`}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 text-xs font-semibold rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-950 select-none"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="truncate max-w-[110px] sm:max-w-[160px]">
                    {adminSession.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  aria-label="Cerrar sesión de administrador"
                  title="Cerrar sesión"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-700 transition-colors whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
              </div>
            ) : (
              <>
                {currentClient ? (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div
                      aria-label={`Sesión iniciada como ${currentClient.name}`}
                      className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 text-xs font-semibold rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-950 select-none"
                    >
                      <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="truncate max-w-[82px] sm:max-w-[110px]">
                        {currentClient.name.split(' ')[0]}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogoutClient}
                      aria-label="Cerrar sesión de cliente"
                      title="Cerrar sesión"
                      className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-700 transition-colors whitespace-nowrap shrink-0"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline">Cerrar Sesión</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenClientAuth}
                    aria-label="Cuenta de cliente e inicio de sesión"
                    className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-colors shadow-2xs"
                  >
                    <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="truncate max-w-[92px] sm:max-w-[110px]">
                      Iniciar Sesión
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  aria-label={`Abrir carrito de compras con ${cartSummary.totalItems} artículos`}
                  className="px-3 sm:px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 shadow-2xs"
                >
                  <ShoppingCart className="w-4 h-4 text-[#86EFAC]" />
                  <span className="hidden xs:inline sm:inline">Carrito</span>
                  <span>({cartSummary.totalItems})</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
              aria-expanded={isMobileMenuOpen}
              className="md:hidden p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <nav
            aria-label="Navegación Móvil"
            className="md:hidden border-t border-slate-200/80 bg-white px-4 py-3 space-y-1 shadow-sm"
          >
            {[
              { id: 'inicio', label: 'Inicio' },
              { id: 'catalogo', label: 'Catálogo Saludable' },
              { id: 'mi-salud', label: 'Mi Salud & Biometría' },
              { id: 'progreso', label: 'Tu Progreso' },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView('client');
                  setIsMobileMenuOpen(false);
                  if (item.id === 'inicio') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    setTimeout(() => {
                      document
                        .getElementById(item.id)
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }, 40);
                  }
                }}
                className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
              >
                {item.label}
              </a>
            ))}
            {adminSession && (
              <a
                href="#administrador"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView('admin');
                  setIsMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-emerald-800 bg-emerald-50"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Panel Administrador</span>
              </a>
            )}
          </nav>
        )}
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1">
        {activeView === 'admin' && adminSession ? (
          <AdminDashboard
            session={adminSession}
            adminUsers={adminUsers}
            products={products}
            recentOrders={recentOrders}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onBulkUpdateProducts={handleBulkUpdateProducts}
            onDeleteProduct={handleDeleteProduct}
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
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span>Fórmula Destacada del Mes</span>
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
                            onClick={() =>
                              handleAddToCart(
                                products.find((p) => p.id === 'NV-101') ??
                                  products[0] ??
                                  INITIAL_PRODUCTS[0]
                              )
                            }
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
                      id="catalog-search"
                      name="catalogSearch"
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
              onRequireLogin={handleOpenClientAuth}
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

            {/* WELLNESS PROJECTION SIMULATOR (Module D — Connected to real client metrics & protocol) */}
            <WellnessSimulator
              currentClient={currentClient}
              activeSupplementIds={activeSupplementIds}
              simulatedCalories={simulatedCalories}
              medicalReports={medicalReports}
              onRequireLogin={handleOpenClientAuth}
            />
          </>
        )}
      </main>

      {/* CLEAN FOOTER */}
      <footer className="bg-white border-t border-slate-200 pt-10 pb-24 sm:pb-14">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-bold text-slate-900 font-display">
              NutriVital
            </span>{' '}
            · Plataforma de Nutrición Funcional & Bienestar Integral
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <a
              href="https://wa.me/15550192834?text=Hola%20NutriVital,%20solicito%20asesor%C3%ADa%20nutricional"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366] hover:text-white font-semibold transition-colors"
              title="Contactar a un especialista NutriVital por WhatsApp"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.766.469 3.484 1.344 5l-1.406 5.156 5.281-1.375c1.469.797 3.109 1.219 4.75 1.219 5.516 0 9.969-4.453 9.969-9.969S17.547 2 12.031 2zm5.813 14.125c-.25.703-1.438 1.344-2 1.422-.516.078-1.188.141-3.344-.75-2.672-1.094-4.391-3.828-4.516-4-.125-.172-1.078-1.438-1.078-2.734s.672-1.938.922-2.203c.25-.266.547-.328.734-.328s.375.016.531.016c.172 0 .406-.063.641.484.25.578.844 2.063.922 2.219.078.156.125.344.016.563-.109.219-.156.344-.313.531-.156.188-.328.406-.469.547-.156.156-.328.328-.141.641.188.313.844 1.391 1.813 2.25 1.25 1.109 2.297 1.453 2.609 1.609.313.156.5.125.688-.094.188-.219.813-.953 1.031-1.281.219-.328.438-.281.734-.172.297.109 1.891.891 2.219 1.047.328.156.547.234.625.359.078.125.078.734-.172 1.438z" />
              </svg>
              <span>WhatsApp Asesoría</span>
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
              className="hover:text-slate-900"
            >
              Catálogo
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
              className="hover:text-slate-900"
            >
              Simulador
            </a>
            {!adminSession && (
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
        currentClient={currentClient}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onCompletePurchase={handleCompletePurchase}
        onRequireLogin={() => {
          setReopenCartAfterLogin(true);
          setIsCartOpen(false);
          handleOpenClientAuth();
        }}
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

      {/* CLIENT AUTHENTICATION MODAL (ONLY WHEN NOT LOGGED IN) */}
      <ClientAuthModal
        isOpen={isClientAuthModalOpen && !currentClient}
        onClose={() => {
          setIsClientAuthModalOpen(false);
          setReopenCartAfterLogin(false);
        }}
        currentClient={clientSession ? currentClient : null}
        allClients={clients}
        onLoginClient={handleLoginClient}
        onRegisterClient={handleRegisterClient}
        onLogoutClient={handleLogoutClient}
      />

      {/* FLOATING NUTRIBOT VIRTUAL ASSISTANT (Module E — visible on storefront view) */}
      {activeView === 'client' && (
        <NutriBotWidget
          currentClient={currentClient}
          onSelectCategory={(cat: ProductCategory) => {
            setActiveView('client');
            setSearchQuery('');
            setSelectedCategory(cat);
          }}
        />
      )}
    </div>
  );
}