import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  TrendingUp,
  Package,
  DollarSign,
  ShieldCheck,
  LogOut,
  Calculator,
  RotateCcw,
  Users,
  Check,
  X,
  Search,
  Download,
  AlertTriangle,
  Copy,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import {
  AdminSession,
  AdminUser,
  IllustrationVariant,
  OrderReceipt,
  Product,
  ProductCategory,
  ProductTag,
  SaleRecord,
} from '../types/nutrivital';
import {
  calculateOrdinaryLinearRegression,
  computeProductStatus,
} from '../utils/analytics';
import { ProductIllustration } from './ProductIllustration';

interface AdminDashboardProps {
  session: AdminSession;
  adminUsers: AdminUser[];
  products: Product[];
  salesHistory: SaleRecord[];
  recentOrders: OrderReceipt[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onBulkUpdateProducts: (products: Product[]) => void;
  onDeleteProduct: (productId: string) => void;
  onAddWeekSale: (revenue: number, units: number) => void;
  onResetSalesHistory: () => void;
  onLogout: () => void;
  onOpenRegisterAdmin: () => void;
}

type StatusFilter = 'Todos' | 'Criticos' | 'Activo' | 'Bajo Stock' | 'Agotado';
type SortOption =
  | 'default'
  | 'stock_asc'
  | 'stock_desc'
  | 'price_asc'
  | 'price_desc'
  | 'name_asc';

const ILLUSTRATION_OPTIONS: { value: IllustrationVariant; label: string }[] = [
  { value: 'protein-matcha', label: 'Bote Proteína / Matcha' },
  { value: 'spirulina-jar', label: 'Frasco Ámbar / Espirulina' },
  { value: 'keto-bars', label: 'Caja de Barras' },
  { value: 'omega-capsules', label: 'Cápsulas / Softgels' },
  { value: 'cacao-maca', label: 'Bolsa Doypack / Elixir' },
  { value: 'collagen-peptides', label: 'Tarro Péptidos / Colágeno' },
  { value: 'chia-granola', label: 'Empaque Semillas / Granola' },
  { value: 'ashwagandha-drops', label: 'Frasco Botánico Nocturno' },
];

export function parseNonNegativeMetric(raw: string, fallback: number): number {
  const trimmed = raw.trim();
  if (trimmed === '') return fallback;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return Number(parsed.toFixed(1));
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  session,
  adminUsers,
  products,
  salesHistory,
  recentOrders,
  onAddProduct,
  onUpdateProduct,
  onBulkUpdateProducts,
  onDeleteProduct,
  onAddWeekSale,
  onResetSalesHistory,
  onLogout,
  onOpenRegisterAdmin,
}) => {
  const [regressionMetric, setRegressionMetric] = useState<'revenue' | 'units'>('revenue');

  // Product Table Filtering, Sorting & Bulk Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkQuantity, setBulkQuantity] = useState<string>('20');

  // Inline Price & Stock Quick Edit State
  const [inlinePriceId, setInlinePriceId] = useState<string | null>(null);
  const [inlinePriceValue, setInlinePriceValue] = useState<string>('');
  const [inlineStockId, setInlineStockId] = useState<string | null>(null);
  const [inlineStockValue, setInlineStockValue] = useState<string>('');

  // Add / Edit Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('Superalimentos');
  const [formTag, setFormTag] = useState<ProductTag>('100% Orgánico');
  const [formPrice, setFormPrice] = useState('35.00');
  const [formStock, setFormStock] = useState('25');
  const [formServingSize, setFormServingSize] = useState('30g · 25 porciones');
  const [formIllustration, setFormIllustration] =
    useState<IllustrationVariant>('protein-matcha');
  const [formCalories, setFormCalories] = useState('110');
  const [formProtein, setFormProtein] = useState('15');
  const [formFiber, setFormFiber] = useState('6');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Safe Confirmation Modals & Expanded Orders
  const [productPendingDelete, setProductPendingDelete] = useState<Product | null>(null);
  const [confirmResetSales, setConfirmResetSales] = useState<boolean>(false);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  // Sales Week Simulator inputs
  const [simRevenue, setSimRevenue] = useState('4480');
  const [simUnits, setSimUnits] = useState('108');

  const regression = useMemo(
    () => calculateOrdinaryLinearRegression(salesHistory, regressionMetric, 2),
    [salesHistory, regressionMetric]
  );

  const revenueRegression = useMemo(
    () => calculateOrdinaryLinearRegression(salesHistory, 'revenue', 2),
    [salesHistory]
  );

  const unitsRegression = useMemo(
    () => calculateOrdinaryLinearRegression(salesHistory, 'units', 2),
    [salesHistory]
  );

  const totalRevenue = useMemo(
    () => salesHistory.reduce((acc, s) => acc + s.revenue, 0),
    [salesHistory]
  );
  const totalUnitsSold = useMemo(
    () => salesHistory.reduce((acc, s) => acc + s.units, 0),
    [salesHistory]
  );
  const totalInventoryUnits = useMemo(
    () => products.reduce((acc, p) => acc + p.stock, 0),
    [products]
  );
  const totalInventoryValue = useMemo(
    () => products.reduce((acc, p) => acc + p.price * p.stock, 0),
    [products]
  );

  const outOfStockProducts = useMemo(
    () => products.filter((p) => p.stock <= 0),
    [products]
  );
  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock > 0 && p.stock <= 8),
    [products]
  );
  const criticalProducts = useMemo(
    () => products.filter((p) => p.stock <= 8),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchesCategory =
        categoryFilter === 'Todas' || p.category === categoryFilter;
      const matchesStatus =
        statusFilter === 'Todos'
          ? true
          : statusFilter === 'Criticos'
            ? p.stock <= 8
            : p.status === statusFilter;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.tag.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return matchesCategory && matchesStatus && matchesQuery;
    });

    if (sortBy === 'stock_asc') {
      return [...list].sort((a, b) => a.stock - b.stock);
    }
    if (sortBy === 'stock_desc') {
      return [...list].sort((a, b) => b.stock - a.stock);
    }
    if (sortBy === 'price_asc') {
      return [...list].sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price_desc') {
      return [...list].sort((a, b) => b.price - a.price);
    }
    if (sortBy === 'name_asc') {
      return [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }
    return list;
  }, [products, searchQuery, categoryFilter, statusFilter, sortBy]);

  // Remove stale selected IDs if products are deleted
  useEffect(() => {
    const existingIds = new Set(products.map((p) => p.id));
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (existingIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [products]);

  // Escape key handler for open modals
  useEffect(() => {
    if (!isProductModalOpen && !productPendingDelete && !confirmResetSales) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProductModalOpen(false);
        setProductPendingDelete(null);
        setConfirmResetSales(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProductModalOpen, productPendingDelete, confirmResetSales]);

  const handleOpenAddModal = () => {
    setEditingProductId(null);
    setFormName('');
    setFormCategory('Superalimentos');
    setFormTag('100% Orgánico');
    setFormPrice('39.00');
    setFormStock('24');
    setFormServingSize('30g · 25 porciones');
    setFormIllustration(
      ILLUSTRATION_OPTIONS[products.length % ILLUSTRATION_OPTIONS.length].value
    );
    setFormCalories('120');
    setFormProtein('18');
    setFormFiber('5');
    setFormDescription(
      'Fórmula funcional elaborada con ingredientes botánicos de trazabilidad orgánica certificada.'
    );
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProductId(product.id);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormTag(product.tag);
    setFormPrice(product.price.toFixed(2));
    setFormStock(String(product.stock));
    setFormServingSize(product.servingSize);
    setFormIllustration(product.illustration);
    setFormCalories(String(product.calories));
    setFormProtein(String(product.protein));
    setFormFiber(String(product.fiber));
    setFormDescription(product.description);
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const handleOpenDuplicateModal = (product: Product) => {
    setEditingProductId(null);
    setFormName(`${product.name} (Edición Especial)`);
    setFormCategory(product.category);
    setFormTag(product.tag);
    setFormPrice(product.price.toFixed(2));
    setFormStock(String(Math.max(15, product.stock)));
    setFormServingSize(product.servingSize);
    setFormIllustration(product.illustration);
    setFormCalories(String(product.calories));
    setFormProtein(String(product.protein));
    setFormFiber(String(product.fiber));
    setFormDescription(product.description);
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const handleProductFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formName.trim();
    const numericPrice = Number(formPrice);
    const parsedStock = Number(formStock);

    if (!trimmedName) {
      setFormError('El nombre del producto es obligatorio.');
      return;
    }
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      setFormError('Ingresa un precio unitario válido mayor a $0.00.');
      return;
    }
    if (Number.isNaN(parsedStock) || parsedStock < 0) {
      setFormError('Ingresa un stock válido (0 o mayor).');
      return;
    }

    const numericStock = Math.max(0, Math.round(parsedStock));
    const servingClean = formServingSize.trim() || '30g · 25 porciones';

    if (editingProductId) {
      const existing = products.find((p) => p.id === editingProductId);
      if (existing) {
        onUpdateProduct({
          ...existing,
          name: trimmedName,
          category: formCategory,
          tag: formTag,
          price: Number(numericPrice.toFixed(2)),
          stock: numericStock,
          status: computeProductStatus(numericStock),
          servingSize: servingClean,
          illustration: formIllustration,
          calories: Math.round(parseNonNegativeMetric(formCalories, existing.calories)),
          protein: parseNonNegativeMetric(formProtein, existing.protein),
          fiber: parseNonNegativeMetric(formFiber, existing.fiber),
          description: formDescription.trim() || existing.description,
        });
      }
    } else {
      const highestNum = products.reduce((max, p) => {
        const match = p.id.match(/\d+/);
        return match ? Math.max(max, parseInt(match[0], 10)) : max;
      }, 100);
      const nextNum = highestNum + 1;
      const newProduct: Product = {
        id: `NV-${nextNum}`,
        name: trimmedName,
        category: formCategory,
        tag: formTag,
        price: Number(numericPrice.toFixed(2)),
        stock: numericStock,
        status: computeProductStatus(numericStock),
        calories: Math.round(parseNonNegativeMetric(formCalories, 0)),
        protein: parseNonNegativeMetric(formProtein, 0),
        fiber: parseNonNegativeMetric(formFiber, 0),
        description:
          formDescription.trim() ||
          'Suplemento nutricional de alta biodisponibilidad.',
        servingSize: servingClean,
        illustration: formIllustration,
      };
      onAddProduct(newProduct);
    }

    setIsProductModalOpen(false);
  };

  const handleSaveInlinePrice = (product: Product) => {
    const parsed = Number(inlinePriceValue);
    if (!Number.isNaN(parsed) && parsed > 0) {
      onUpdateProduct({
        ...product,
        price: Number(parsed.toFixed(2)),
      });
    }
    setInlinePriceId(null);
  };

  const handleSaveInlineStock = (product: Product) => {
    const parsed = Number(inlineStockValue);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      const nextStock = Math.max(0, Math.round(parsed));
      onUpdateProduct({
        ...product,
        stock: nextStock,
        status: computeProductStatus(nextStock),
      });
    }
    setInlineStockId(null);
  };

  const handleAdjustStock = (product: Product, delta: number) => {
    const nextStock = Math.max(0, product.stock + delta);
    if (nextStock === product.stock) return;
    onUpdateProduct({
      ...product,
      stock: nextStock,
      status: computeProductStatus(nextStock),
    });
  };

  const allFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.has(p.id));

  const handleToggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredProducts.forEach((p) => next.delete(p.id));
      } else {
        filteredProducts.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const handleToggleSelectOne = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleBulkStockOperation = (mode: 'add' | 'set') => {
    const qty = Math.round(Number(bulkQuantity));
    if (Number.isNaN(qty) || (mode === 'set' && qty < 0) || (mode === 'add' && qty === 0)) {
      return;
    }

    const updatedBatch = products
      .filter((p) => selectedIds.has(p.id))
      .map((p) => {
        const nextStock = Math.max(0, mode === 'add' ? p.stock + qty : qty);
        return {
          ...p,
          stock: nextStock,
          status: computeProductStatus(nextStock),
        };
      });

    if (updatedBatch.length > 0) {
      onBulkUpdateProducts(updatedBatch);
      setSelectedIds(new Set());
    }
  };

  const handleRestockAllCritical = (targetStock: number = 25) => {
    const updatedBatch = criticalProducts.map((p) => {
      const nextStock = Math.max(targetStock, p.stock);
      return {
        ...p,
        stock: nextStock,
        status: computeProductStatus(nextStock),
      };
    });
    if (updatedBatch.length > 0) {
      onBulkUpdateProducts(updatedBatch);
    }
  };

  const handleExportInventoryCsv = () => {
    const headers = [
      'ID',
      'Nombre',
      'Categoria',
      'Etiqueta',
      'Presentacion',
      'Precio_USD',
      'Stock_Unidades',
      'Valor_Inventario_USD',
      'Estado',
      'Calorias_kcal',
      'Proteina_g',
      'Fibra_g',
    ];
    const escapeCsv = (val: string | number) => {
      const s = String(val);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const rows = products.map((p) =>
      [
        p.id,
        p.name,
        p.category,
        p.tag,
        p.servingSize,
        p.price.toFixed(2),
        p.stock,
        (p.price * p.stock).toFixed(2),
        p.status,
        p.calories,
        p.protein,
        p.fiber,
      ]
        .map(escapeCsv)
        .join(',')
    );

    const csvContent = `\uFEFF${headers.join(',')}\n${rows.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NutriVital_Inventario_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleToggleExpandOrder = (orderId: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleAddSimulatedWeek = (e: React.FormEvent) => {
    e.preventDefault();
    const rev = Number(simRevenue);
    const uni = Number(simUnits);
    if (Number.isNaN(rev) || rev <= 0 || Number.isNaN(uni) || uni <= 0) return;
    onAddWeekSale(Math.round(rev), Math.round(uni));
    setSimRevenue(String(Math.round(rev + 240)));
    setSimUnits(String(Math.round(uni + 6)));
  };

  // Ordinary Linear Regression Chart Geometry (Strictly Non-Logarithmic Linear Scale)
  const svgW = 780;
  const svgH = 340;
  const padL = 64;
  const padR = 32;
  const padT = 28;
  const padB = 48;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const allYValues = regression.points.flatMap((pt) =>
    pt.actualY !== null ? [pt.actualY, pt.predictedY] : [pt.predictedY]
  );
  const minX = 1;
  const maxX =
    regression.points.length > 0
      ? regression.points[regression.points.length - 1].x
      : 12;

  const rawMinY = allYValues.length > 0 ? Math.min(...allYValues) : 0;
  const rawMaxY = allYValues.length > 0 ? Math.max(...allYValues) : 5000;
  const yPadding = Math.max(50, (rawMaxY - rawMinY) * 0.18);
  const yMinDomain = Math.max(0, Math.floor((rawMinY - yPadding) / 100) * 100);
  const yMaxDomain = Math.ceil((rawMaxY + yPadding) / 100) * 100 || 1000;

  const mapX = (x: number) => {
    if (maxX <= minX) return padL + plotW / 2;
    return padL + ((x - minX) / (maxX - minX)) * plotW;
  };

  const mapY = (y: number) => {
    if (yMaxDomain <= yMinDomain) return padT + plotH / 2;
    return (
      padT +
      plotH -
      ((y - yMinDomain) / (yMaxDomain - yMinDomain)) * plotH
    );
  };

  const xStart = minX;
  const yStart = regression.slope * xStart + regression.intercept;
  const xEnd = maxX;
  const yEnd = regression.slope * xEnd + regression.intercept;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    Math.round(yMinDomain + t * (yMaxDomain - yMinDomain))
  );

  const correlationLabel =
    regression.correlation > 0.05
      ? 'Ajuste lineal positivo'
      : regression.correlation < -0.05
        ? 'Tendencia lineal descendente'
        : 'Tendencia estable / neutra';

  return (
    <div className="py-10 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto px-6 space-y-10">
        {/* Authenticated Admin Top Banner */}
        <div className="bg-white rounded-2xl border border-emerald-200/90 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-800 font-medium">
                <span>Sesión Administrativa Verificada</span>
                <span aria-hidden="true">·</span>
                <span>{session.role}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{session.email}</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Ingreso: {session.loggedInAt}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
                Panel de Control & Gestión de Catálogo — {session.name}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenRegisterAdmin}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Users className="w-4 h-4 text-emerald-700" />
              <span>Administradores ({adminUsers.length})</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Ingresos Acumulados ({salesHistory.length} sem)</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
              ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-emerald-700 font-mono tabular-nums">
              Pendiente m = {revenueRegression.slope >= 0 ? `+$${revenueRegression.slope.toFixed(2)}` : `-$${Math.abs(revenueRegression.slope).toFixed(2)}`} / sem
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Unidades Vendidas</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {totalUnitsSold.toLocaleString('en-US')} uds
            </p>
            <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
              {regressionMetric === 'units'
                ? `Pendiente m = ${unitsRegression.slope >= 0 ? `+${unitsRegression.slope.toFixed(2)}` : unitsRegression.slope.toFixed(2)} uds / sem`
                : `Ajuste lineal R² = ${regression.rSquared.toFixed(4)}`}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Inventario & Valor en Stock</span>
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {totalInventoryUnits.toLocaleString('en-US')} uds
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-xs font-mono tabular-nums">
              <span className="text-slate-600">
                ${totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({products.length} SKU)
              </span>
              {criticalProducts.length > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-sans font-bold text-[10px]">
                  {criticalProducts.length} alerta(s)
                </span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Proyección Próxima Semana</span>
              <Calculator className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-700 font-mono tabular-nums">
              {regressionMetric === 'revenue'
                ? `$${regression.nextWeekPrediction.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `${Math.round(regression.nextWeekPrediction).toLocaleString('en-US')} uds`}
            </p>
            <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
              Evaluado en x = Semana {salesHistory.length + 1}
            </p>
          </div>
        </div>

        {/* SECTION 1: ORDINARY LEAST SQUARES LINEAR REGRESSION (y = mx + b) */}
        <section
          aria-labelledby="ols-regression-heading"
          className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 lg:p-8 space-y-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs font-medium text-emerald-700">
                Módulo Analítico de Ventas · Mínimos Cuadrados Ordinarios (OLS)
              </p>
              <h2
                id="ols-regression-heading"
                className="text-xl md:text-2xl font-bold text-slate-900 mt-0.5"
              >
                Proyección de Ventas (Modelo Lineal)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Escala estrictamente cartesiana lineal sin transformaciones logarítmicas ni suavizados polinómicos: <strong className="font-mono text-slate-700">y = mx + b</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRegressionMetric('revenue')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    regressionMetric === 'revenue'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ingresos ($ USD)
                </button>
                <button
                  type="button"
                  onClick={() => setRegressionMetric('units')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    regressionMetric === 'units'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Unidades Vendidas
                </button>
              </div>

              <button
                type="button"
                onClick={() => setConfirmResetSales(true)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Serie Base</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Scatter Plot + Straight OLS Line */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#15803D] inline-block" />
                    Datos Reales Históricos (Dispersión)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 bg-[#16A34A] inline-block" />
                    Recta de Ajuste Lineal ({regression.equation})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border-2 border-emerald-500 bg-white inline-block" />
                    Proyección Lineal (+2 semanas)
                  </span>
                </div>
              </div>

              <div className="w-full overflow-x-auto bg-[#F8FAFC] rounded-2xl border border-slate-200/80 p-4">
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  className="w-full h-auto min-w-[560px]"
                  role="img"
                  aria-label={`Gráfica de regresión lineal ordinaria ${regression.equation}`}
                >
                  {yTicks.map((tickVal) => {
                    const yPos = mapY(tickVal);
                    return (
                      <g key={tickVal}>
                        <line
                          x1={padL}
                          y1={yPos}
                          x2={svgW - padR}
                          y2={yPos}
                          stroke="#E2E8F0"
                          strokeWidth="1"
                        />
                        <text
                          x={padL - 10}
                          y={yPos + 4}
                          textAnchor="end"
                          className="text-[11px] fill-slate-500 font-mono"
                        >
                          {regressionMetric === 'revenue' ? `$${tickVal}` : `${tickVal}`}
                        </text>
                      </g>
                    );
                  })}

                  {regression.points.map((pt) => {
                    const xPos = mapX(pt.x);
                    return (
                      <g key={pt.x}>
                        <line
                          x1={xPos}
                          y1={padT}
                          x2={xPos}
                          y2={padT + plotH}
                          stroke={pt.isForecast ? '#DCFCE7' : '#F1F5F9'}
                          strokeWidth="1"
                        />
                        <text
                          x={xPos}
                          y={svgH - 16}
                          textAnchor="middle"
                          className={`text-[10px] font-mono ${
                            pt.isForecast ? 'fill-emerald-700 font-semibold' : 'fill-slate-500'
                          }`}
                        >
                          S{pt.x}
                        </text>
                      </g>
                    );
                  })}

                  {regression.points.map((pt) => {
                    if (pt.actualY === null) return null;
                    const xPos = mapX(pt.x);
                    const yActual = mapY(pt.actualY);
                    const yPred = mapY(pt.predictedY);
                    return (
                      <line
                        key={`res-${pt.x}`}
                        x1={xPos}
                        y1={yActual}
                        x2={xPos}
                        y2={yPred}
                        stroke="#86EFAC"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    );
                  })}

                  <line
                    x1={mapX(xStart)}
                    y1={mapY(yStart)}
                    x2={mapX(xEnd)}
                    y2={mapY(yEnd)}
                    stroke="#16A34A"
                    strokeWidth="3"
                  />

                  {regression.points.map((pt) => {
                    const xPos = mapX(pt.x);
                    if (pt.actualY !== null) {
                      const yActual = mapY(pt.actualY);
                      return (
                        <g key={`pt-${pt.x}`}>
                          <circle
                            cx={xPos}
                            cy={yActual}
                            r={5.5}
                            fill="#15803D"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                          />
                          <text
                            x={xPos}
                            y={yActual - 10}
                            textAnchor="middle"
                            className="text-[10px] fill-slate-700 font-mono"
                          >
                            {regressionMetric === 'revenue' ? `$${pt.actualY}` : pt.actualY}
                          </text>
                        </g>
                      );
                    }
                    const yPred = mapY(pt.predictedY);
                    return (
                      <g key={`fc-${pt.x}`}>
                        <circle
                          cx={xPos}
                          cy={yPred}
                          r={5.5}
                          fill="#FFFFFF"
                          stroke="#16A34A"
                          strokeWidth="2.5"
                        />
                        <text
                          x={xPos}
                          y={yPred - 10}
                          textAnchor="middle"
                          className="text-[10px] fill-emerald-700 font-mono font-semibold"
                        >
                          {regressionMetric === 'revenue'
                            ? `$${pt.predictedY.toFixed(0)}`
                            : pt.predictedY.toFixed(0)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Mathematical Model Box */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-5 rounded-2xl bg-[#F0FDF4] border border-emerald-200 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-emerald-800">
                    Ecuación de la Recta (Mínimos Cuadrados)
                  </p>
                  <p
                    data-testid="ols-equation"
                    className="mt-1.5 text-xl font-bold font-mono text-slate-900 bg-white px-3.5 py-2.5 rounded-xl border border-emerald-200 tabular-nums"
                  >
                    {regression.equation}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <p className="text-[11px] text-slate-500">Pendiente (m)</p>
                    <p
                      data-testid="ols-slope"
                      className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5"
                    >
                      {regression.slope >= 0
                        ? `+${regression.slope.toFixed(2)}`
                        : regression.slope.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-emerald-700">Variación por semana (x)</p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <p className="text-[11px] text-slate-500">Intercepto (b)</p>
                    <p
                      data-testid="ols-intercept"
                      className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5"
                    >
                      {regression.intercept.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-500">Ordenada en el origen (x=0)</p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <p className="text-[11px] text-slate-500">Coef. Determinación (R²)</p>
                    <p
                      data-testid="ols-r2"
                      className="text-base font-bold text-emerald-700 font-mono tabular-nums mt-0.5"
                    >
                      {regression.rSquared.toFixed(4)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {(regression.rSquared * 100).toFixed(1)}% varianza explicada
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <p className="text-[11px] text-slate-500">Correlación Lineal (r)</p>
                    <p className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                      {regression.correlation.toFixed(4)}
                    </p>
                    <p className="text-[10px] text-slate-500">{correlationLabel}</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed border-t border-emerald-200/70 pt-3">
                  Cada compra completada en el carrito actualiza la semana activa (<strong className="font-mono">Sem {salesHistory.length}</strong>) y recalcula instantáneamente los coeficientes <strong className="font-mono">m</strong>, <strong className="font-mono">b</strong> y <strong className="font-mono">R²</strong>.
                </div>
              </div>

              <form
                onSubmit={handleAddSimulatedWeek}
                className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3"
              >
                <h3 className="text-xs font-bold text-slate-800">
                  Simular Cierre de Semana {salesHistory.length + 1}
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="sim-rev-input"
                      className="block text-[11px] text-slate-500 mb-1"
                    >
                      Ingresos ($ USD)
                    </label>
                    <input
                      id="sim-rev-input"
                      name="simRevenue"
                      type="number"
                      min={100}
                      step={1}
                      value={simRevenue}
                      onChange={(e) => setSimRevenue(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sim-units-input"
                      className="block text-[11px] text-slate-500 mb-1"
                    >
                      Unidades Vendidas
                    </label>
                    <input
                      id="sim-units-input"
                      type="number"
                      min={1}
                      step={1}
                      value={simUnits}
                      onChange={(e) => setSimUnits(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  + Añadir Semana {salesHistory.length + 1} al Modelo Lineal
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* SECTION 2: ADVANCED PRODUCT & INVENTORY MANAGEMENT */}
        <section
          aria-labelledby="crud-products-heading"
          className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 lg:p-8 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs font-medium text-emerald-700">
                Inventario por Lotes, Filtros & Precios en Tiempo Real (Supabase)
              </p>
              <h2
                id="crud-products-heading"
                className="text-xl md:text-2xl font-bold text-slate-900 mt-0.5"
              >
                Gestión de Productos
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportInventoryCsv}
                className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Exportar .CSV</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-xs whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Producto</span>
              </button>
            </div>
          </div>

          {/* Critical Stock Alert Strip (One-click filter & One-click bulk replenish) */}
          {criticalProducts.length > 0 && (
            <div className="rounded-2xl bg-amber-50/90 border border-amber-200/90 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="text-xs text-amber-950">
                  <p className="font-bold">
                    Atención de Inventario:{' '}
                    {outOfStockProducts.length > 0 && (
                      <span className="text-red-700">
                        {outOfStockProducts.length} agotado(s)
                      </span>
                    )}
                    {outOfStockProducts.length > 0 && lowStockProducts.length > 0 && ' · '}
                    {lowStockProducts.length > 0 && (
                      <span>{lowStockProducts.length} en bajo stock (≤8 uds)</span>
                    )}
                  </p>
                  <p className="text-amber-800 mt-0.5">
                    Puedes filtrarlos o reponer todos los productos críticos a 25 unidades en una sola operación hacia Supabase.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setStatusFilter((prev) => (prev === 'Criticos' ? 'Todos' : 'Criticos'))
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    statusFilter === 'Criticos'
                      ? 'bg-amber-800 text-white border-amber-800'
                      : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100/70'
                  }`}
                >
                  {statusFilter === 'Criticos' ? 'Ver Todos' : 'Filtrar Críticos'}
                </button>
                <button
                  type="button"
                  onClick={() => handleRestockAllCritical(25)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow-2xs"
                >
                  Reponer Críticos a 25 uds
                </button>
              </div>
            </div>
          )}

          {/* Search, Category, Status & Sort Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            <div className="relative lg:col-span-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="search"
                aria-label="Buscar producto en inventario"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, SKU (NV-101) o etiqueta..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="lg:col-span-3">
              <select
                aria-label="Filtrar por categoría"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600"
              >
                <option value="Todas">Todas las categorías</option>
                <option value="Batidos Proteicos">Batidos Proteicos</option>
                <option value="Superalimentos">Superalimentos</option>
                <option value="Suplementos Naturales">Suplementos Naturales</option>
                <option value="Snacks Orgánicos">Snacks Orgánicos</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <select
                aria-label="Filtrar por estado de stock"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600"
              >
                <option value="Todos">Estado: Todos</option>
                <option value="Criticos">Bajo Stock + Agotados</option>
                <option value="Activo">Solo Activos</option>
                <option value="Bajo Stock">Solo Bajo Stock</option>
                <option value="Agotado">Solo Agotados</option>
              </select>
            </div>

            <div className="relative lg:col-span-3">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <select
                aria-label="Ordenar productos"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600"
              >
                <option value="default">Orden: Predeterminado</option>
                <option value="stock_asc">Menor stock primero</option>
                <option value="stock_desc">Mayor stock primero</option>
                <option value="price_asc">Menor precio primero</option>
                <option value="price_desc">Mayor precio primero</option>
                <option value="name_asc">Nombre (A - Z)</option>
              </select>
            </div>
          </div>

          {/* Bulk Replenishment Action Bar (when 1+ checkboxes are selected) */}
          {selectedIds.size > 0 && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-950">
                <Layers className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>{selectedIds.size}</strong>{' '}
                  {selectedIds.size === 1 ? 'producto seleccionado' : 'productos seleccionados'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="bulk-stock-qty" className="text-xs font-medium text-emerald-900">
                  Cantidad:
                </label>
                <input
                  id="bulk-stock-qty"
                  type="number"
                  min={0}
                  step={1}
                  value={bulkQuantity}
                  onChange={(e) => setBulkQuantity(e.target.value)}
                  className="w-20 px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-emerald-300 bg-white text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => handleBulkStockOperation('add')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors"
                >
                  + Sumar lote
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkStockOperation('set')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                >
                  = Fijar stock exacto
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Products Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-3 w-9">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todos los productos visibles"
                      checked={allFilteredSelected}
                      onChange={handleToggleSelectAllFiltered}
                      className="rounded border-slate-300 accent-emerald-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3">Producto</th>
                  <th className="py-3 px-3">Categoría</th>
                  <th className="py-3 px-3">Precio (USD)</th>
                  <th className="py-3 px-3">Reposición & Stock</th>
                  <th className="py-3 px-3">Valor / Estado</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs text-slate-500">
                      No hay productos que coincidan con los filtros actuales.{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setCategoryFilter('Todas');
                          setStatusFilter('Todos');
                        }}
                        className="text-emerald-700 font-semibold hover:underline ml-1"
                      >
                        Limpiar filtros
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const isChecked = selectedIds.has(product.id);
                    const stockValue = product.price * product.stock;

                    return (
                      <tr
                        key={product.id}
                        className={`transition-colors ${
                          isChecked ? 'bg-emerald-50/50' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3.5 px-3">
                          <input
                            type="checkbox"
                            aria-label={`Seleccionar ${product.name}`}
                            checked={isChecked}
                            onChange={() => handleToggleSelectOne(product.id)}
                            className="rounded border-slate-300 accent-emerald-600 cursor-pointer"
                          />
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3 min-w-[230px]">
                            <ProductIllustration
                              variant={product.illustration}
                              className="w-11 h-11 rounded-xl border border-slate-200/70 shrink-0 overflow-hidden"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 tabular-nums">
                                  {product.id}
                                </span>
                                <p className="font-semibold text-slate-900 leading-snug">
                                  {product.name}
                                </p>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {product.servingSize} · {product.tag} · {product.calories} kcal ·{' '}
                                {product.protein}g prot · {product.fiber}g fibra
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-xs text-slate-600 whitespace-nowrap">
                          {product.category}
                        </td>

                        <td className="py-3.5 px-3 font-mono tabular-nums whitespace-nowrap">
                          {inlinePriceId === product.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                autoFocus
                                aria-label={`Nuevo precio para ${product.name}`}
                                value={inlinePriceValue}
                                onChange={(e) => setInlinePriceValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlinePrice(product);
                                  if (e.key === 'Escape') setInlinePriceId(null);
                                }}
                                className="w-20 px-2 py-1 text-xs font-mono border border-emerald-500 rounded-lg bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlinePrice(product)}
                                aria-label={`Guardar precio de ${product.name}`}
                                className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setInlinePriceId(null)}
                                aria-label="Cancelar edición de precio"
                                className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">
                                ${product.price.toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setInlinePriceId(product.id);
                                  setInlinePriceValue(product.price.toFixed(2));
                                }}
                                aria-label={`Editar precio rápido de ${product.name}`}
                                className="text-[11px] font-sans text-emerald-700 hover:underline"
                              >
                                Editar
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-3 font-mono tabular-nums">
                          {inlineStockId === product.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                autoFocus
                                aria-label={`Fijar stock exacto para ${product.name}`}
                                value={inlineStockValue}
                                onChange={(e) => setInlineStockValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineStock(product);
                                  if (e.key === 'Escape') setInlineStockId(null);
                                }}
                                className="w-20 px-2 py-1 text-xs font-mono font-bold border border-emerald-500 rounded-lg bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlineStock(product)}
                                aria-label={`Guardar stock de ${product.name}`}
                                className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setInlineStockId(null)}
                                aria-label="Cancelar edición de stock"
                                className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleAdjustStock(product, -1)}
                                disabled={product.stock <= 0}
                                aria-label={`Reducir 1 unidad de ${product.name}`}
                                className="w-6 h-6 rounded-md border border-slate-200 text-xs flex items-center justify-center hover:bg-slate-100 disabled:opacity-40"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setInlineStockId(product.id);
                                  setInlineStockValue(String(product.stock));
                                }}
                                title="Clic para escribir el stock exacto"
                                className="min-w-[40px] px-2 py-0.5 rounded-md border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 text-center font-bold text-slate-900 transition-colors"
                              >
                                {product.stock}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdjustStock(product, 1)}
                                aria-label={`Sumar 1 unidad a ${product.name}`}
                                className="w-6 h-6 rounded-md border border-slate-200 text-xs flex items-center justify-center hover:bg-slate-100"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdjustStock(product, 10)}
                                title="Reponer +10 unidades en 1 clic"
                                className="px-1.5 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold transition-colors"
                              >
                                +10
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdjustStock(product, 25)}
                                title="Reponer +25 unidades en 1 clic"
                                className="px-1.5 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold transition-colors"
                              >
                                +25
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="text-xs font-mono font-semibold text-slate-800 tabular-nums">
                            ${stockValue.toFixed(2)}
                          </div>
                          <span
                            className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              product.status === 'Activo'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : product.status === 'Bajo Stock'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {product.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(product)}
                              title="Editar todos los detalles del producto"
                              aria-label={`Editar detalles de ${product.name}`}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDuplicateModal(product)}
                              title="Duplicar producto como base para una variante"
                              aria-label={`Duplicar ${product.name}`}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setProductPendingDelete(product)}
                              title="Eliminar producto"
                              aria-label={`Eliminar ${product.name}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Mostrando <strong>{filteredProducts.length}</strong> de{' '}
              <strong>{products.length}</strong> productos
            </span>
            <span>
              Tip: Haz clic directamente sobre cualquier número de stock para escribir la cantidad exacta y presiona <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px]">Enter</kbd>.
            </span>
          </div>
        </section>

        {/* SECTION 3: EXPANDABLE ORDERS HISTORY (Synced with Supabase) */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-emerald-700">
                Registro de E-Commerce · Sincronizado con Supabase
              </p>
              <h3 className="text-lg font-bold text-slate-900">
                Historial de Pedidos ({recentOrders.length})
              </h3>
            </div>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Aún no se han registrado pedidos en la tienda.
            </p>
          ) : (
            <div className="space-y-2.5">
              {recentOrders.map((ord) => {
                const isExpanded = expandedOrderIds.has(ord.id);
                return (
                  <div
                    key={ord.id}
                    className="rounded-xl bg-slate-50/90 border border-slate-200/80 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleExpandOrder(ord.id)}
                      className="w-full p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs hover:bg-slate-100/80 transition-colors text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          #{ord.id}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {ord.customerName}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 font-mono">{ord.customerEmail}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500">{ord.createdAt}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">
                          {ord.items.reduce((acc, i) => acc + i.quantity, 0)} art.
                        </span>
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          ${ord.total.toFixed(2)} USD
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 bg-white border-t border-slate-200/70 space-y-2.5 text-xs">
                        <div className="divide-y divide-slate-100">
                          {ord.items.map((item, idx) => (
                            <div
                              key={`${ord.id}-${idx}`}
                              className="py-1.5 flex items-center justify-between gap-2"
                            >
                              <span className="text-slate-700">
                                <strong className="font-mono text-slate-900">
                                  {item.quantity}x
                                </strong>{' '}
                                {item.name}{' '}
                                <span className="text-slate-400 font-mono">
                                  (${item.unitPrice.toFixed(2)} c/u)
                                </span>
                              </span>
                              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                                ${item.lineTotal.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
                          <span>Método: {ord.paymentMethod}</span>
                          <div className="flex items-center gap-3">
                            <span>Subtotal: ${ord.subtotal.toFixed(2)}</span>
                            <span>IVA (16%): ${ord.tax.toFixed(2)}</span>
                            <span>
                              Envío: {ord.shipping === 0 ? 'GRATIS' : `$${ord.shipping.toFixed(2)}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Add / Edit / Duplicate Product Modal */}
      {isProductModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
          onClick={() => setIsProductModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[#F0FDF4] border-b border-emerald-100 flex items-center justify-between">
              <h3 id="product-modal-title" className="text-base font-bold text-slate-900">
                {editingProductId
                  ? `Editar Producto (${editingProductId})`
                  : 'Añadir Nuevo Producto al Catálogo'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                aria-label="Cerrar formulario de producto"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProductFormSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {formError && (
                <p className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {formError}
                </p>
              )}

              <div>
                <label
                  htmlFor="prod-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Nombre del Producto
                </label>
                <input
                  id="prod-name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej. Magnesio Treonato + L-Teanina Pura"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="prod-category"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Categoría
                  </label>
                  <select
                    id="prod-category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Batidos Proteicos">Batidos Proteicos</option>
                    <option value="Superalimentos">Superalimentos</option>
                    <option value="Suplementos Naturales">Suplementos Naturales</option>
                    <option value="Snacks Orgánicos">Snacks Orgánicos</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="prod-tag"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Etiqueta Nutricional
                  </label>
                  <select
                    id="prod-tag"
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value as ProductTag)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="100% Orgánico">100% Orgánico</option>
                    <option value="Sin Azúcar">Sin Azúcar</option>
                    <option value="Keto">Keto</option>
                    <option value="Vegano">Vegano</option>
                    <option value="Sin Gluten">Sin Gluten</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="prod-serving"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Presentación / Dosis
                  </label>
                  <input
                    id="prod-serving"
                    type="text"
                    value={formServingSize}
                    onChange={(e) => setFormServingSize(e.target.value)}
                    placeholder="Ej. 60 cápsulas vegetales"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="prod-price"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Precio Unitario ($ USD)
                  </label>
                  <input
                    id="prod-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label
                    htmlFor="prod-stock"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Stock Disponible (Unidades)
                  </label>
                  <input
                    id="prod-stock"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="prod-cal"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Calorías (kcal)
                  </label>
                  <input
                    id="prod-cal"
                    type="number"
                    min="0"
                    step="1"
                    value={formCalories}
                    onChange={(e) => setFormCalories(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label
                    htmlFor="prod-prot"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Proteína (g)
                  </label>
                  <input
                    id="prod-prot"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formProtein}
                    onChange={(e) => setFormProtein(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label
                    htmlFor="prod-fiber"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Fibra (g)
                  </label>
                  <input
                    id="prod-fiber"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formFiber}
                    onChange={(e) => setFormFiber(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {/* Illustration Picker with Live Preview */}
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/60 space-y-2">
                <label
                  htmlFor="prod-illustration"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Diseño de Envase / Ilustración en Tienda
                </label>
                <div className="flex items-center gap-3">
                  <ProductIllustration
                    variant={formIllustration}
                    className="w-16 h-16 rounded-xl border border-emerald-200 shrink-0 overflow-hidden"
                  />
                  <select
                    id="prod-illustration"
                    value={formIllustration}
                    onChange={(e) =>
                      setFormIllustration(e.target.value as IllustrationVariant)
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    {ILLUSTRATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="prod-desc"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Descripción Nutricional
                </label>
                <textarea
                  id="prod-desc"
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  {editingProductId ? 'Guardar Cambios' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Delete Product Confirmation Modal */}
      {productPendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-product-title"
          onClick={() => setProductPendingDelete(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-product-title" className="text-base font-bold text-slate-900">
                  ¿Eliminar producto del catálogo?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Se eliminará permanentemente{' '}
                  <strong>{productPendingDelete.name}</strong> (
                  <span className="font-mono">{productPendingDelete.id}</span>) tanto de la tienda como de Supabase.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductPendingDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProduct(productPendingDelete.id);
                  setProductPendingDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl"
              >
                Sí, Eliminar Producto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Reset Sales History Confirmation Modal */}
      {confirmResetSales && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-sales-title"
          onClick={() => setConfirmResetSales(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 id="reset-sales-title" className="text-base font-bold text-slate-900">
                  ¿Restaurar serie histórica de ventas?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  El historial semanal volverá a las 10 semanas base de demostración en el panel y en Supabase.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetSales(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetSalesHistory();
                  setConfirmResetSales(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl"
              >
                Restaurar Serie Base
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
