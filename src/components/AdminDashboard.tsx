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

interface AdminDashboardProps {
  session: AdminSession;
  adminUsers: AdminUser[];
  products: Product[];
  salesHistory: SaleRecord[];
  recentOrders: OrderReceipt[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onAddWeekSale: (revenue: number, units: number) => void;
  onResetSalesHistory: () => void;
  onLogout: () => void;
  onOpenRegisterAdmin: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  session,
  adminUsers,
  products,
  salesHistory,
  recentOrders,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddWeekSale,
  onResetSalesHistory,
  onLogout,
  onOpenRegisterAdmin,
}) => {
  const [regressionMetric, setRegressionMetric] = useState<'revenue' | 'units'>('revenue');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [inlinePriceId, setInlinePriceId] = useState<string | null>(null);
  const [inlinePriceValue, setInlinePriceValue] = useState<string>('');

  // New / Edit Product Modal State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('Superalimentos');
  const [formTag, setFormTag] = useState<ProductTag>('100% Orgánico');
  const [formPrice, setFormPrice] = useState('35.00');
  const [formStock, setFormStock] = useState('25');
  const [formCalories, setFormCalories] = useState('110');
  const [formProtein, setFormProtein] = useState('15');
  const [formFiber, setFormFiber] = useState('6');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // New Sales Week Simulator inputs
  const [simRevenue, setSimRevenue] = useState('4480');
  const [simUnits, setSimUnits] = useState('108');

  const regression = useMemo(
    () => calculateOrdinaryLinearRegression(salesHistory, regressionMetric, 2),
    [salesHistory, regressionMetric]
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

  // Handle Escape key to close product modal
  useEffect(() => {
    if (!isProductModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProductModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProductModalOpen]);
  const handleOpenAddModal = () => {
    setEditingProductId(null);
    setFormName('');
    setFormCategory('Superalimentos');
    setFormTag('100% Orgánico');
    setFormPrice('39.00');
    setFormStock('24');
    setFormCalories('120');
    setFormProtein('18');
    setFormFiber('5');
    setFormDescription(
      'Fórmula funcional elaborada con ingredientes botánicos de trazabilidad orgánica certificada.'
    );
    setFormError(null);
    setIsProductModalOpen(true);
  };

  // Open modal for Editing existing Product
  const handleOpenEditModal = (product: Product) => {
    setEditingProductId(product.id);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormTag(product.tag);
    setFormPrice(product.price.toFixed(2));
    setFormStock(String(product.stock));
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
    const numericStock = Math.max(0, Math.round(Number(formStock)));

    if (!trimmedName) {
      setFormError('El nombre del producto es obligatorio.');
      return;
    }
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      setFormError('Ingresa un precio unitario válido mayor a 0.');
      return;
    }

    const illustrations: IllustrationVariant[] = [
      'protein-matcha',
      'spirulina-jar',
      'keto-bars',
      'omega-capsules',
      'cacao-maca',
      'collagen-peptides',
      'chia-granola',
      'ashwagandha-drops',
    ];

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
          calories: Math.max(0, Number(formCalories) || 0),
          protein: Math.max(0, Number(formProtein) || 0),
          fiber: Math.max(0, Number(formFiber) || 0),
          description:
            formDescription.trim() || existing.description,
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
        calories: Math.max(0, Number(formCalories) || 100),
        protein: Math.max(0, Number(formProtein) || 12),
        fiber: Math.max(0, Number(formFiber) || 4),
        description:
          formDescription.trim() ||
          'Suplemento nutricional de alta biodisponibilidad.',
        servingSize: '30g · 25 porciones',
        illustration:
          illustrations[products.length % illustrations.length],
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

  const handleAdjustStock = (product: Product, delta: number) => {
    const nextStock = Math.max(0, product.stock + delta);
    onUpdateProduct({
      ...product,
      stock: nextStock,
      status: computeProductStatus(nextStock),
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

  // Strictly linear coordinate mappers
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

  // Straight OLS regression line endpoints: y = m*x + b
  const xStart = minX;
  const yStart = regression.slope * xStart + regression.intercept;
  const xEnd = maxX;
  const yEnd = regression.slope * xEnd + regression.intercept;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    Math.round(yMinDomain + t * (yMaxDomain - yMinDomain))
  );

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
                Panel de Control & Analítica Lineal — {session.name}
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
              ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-emerald-700 font-mono tabular-nums">
              Pendiente m = +${regression.slope.toFixed(2)} / sem
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Unidades Vendidas</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {totalUnitsSold} uds
            </p>
            <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
              Ajuste lineal R² = {regression.rSquared.toFixed(4)}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Referencias en Catálogo</span>
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {products.length} productos
            </p>
            <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
              Stock total: {totalInventoryUnits} unidades
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Proyección Próxima Semana</span>
              <Calculator className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-700 font-mono tabular-nums">
              {regressionMetric === 'revenue'
                ? `$${regression.nextWeekPrediction.toFixed(2)}`
                : `${regression.nextWeekPrediction.toFixed(0)} uds`}
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
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${regressionMetric === 'revenue'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Ingresos ($ USD)
                </button>
                <button
                  type="button"
                  onClick={() => setRegressionMetric('units')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${regressionMetric === 'units'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Unidades Vendidas
                </button>
              </div>

              <button
                type="button"
                onClick={onResetSalesHistory}
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
                  {/* Horizontal Grid Lines (Linear Y spacing) */}
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
                          {regressionMetric === 'revenue'
                            ? `$${tickVal}`
                            : `${tickVal}`}
                        </text>
                      </g>
                    );
                  })}

                  {/* Vertical Grid Lines & Week Labels */}
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
                          className={`text-[10px] font-mono ${pt.isForecast
                            ? 'fill-emerald-700 font-semibold'
                            : 'fill-slate-500'
                            }`}
                        >
                          S{pt.x}
                        </text>
                      </g>
                    );
                  })}

                  {/* Residual vertical dashed lines from actual Y to OLS regression line */}
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

                  {/* STRICT STRAIGHT LINE OF BEST FIT: y = m*x + b */}
                  <line
                    x1={mapX(xStart)}
                    y1={mapY(yStart)}
                    x2={mapX(xEnd)}
                    y2={mapY(yEnd)}
                    stroke="#16A34A"
                    strokeWidth="3"
                  />

                  {/* Scatter Plot Points (Historical Actuals & Forecasted Line Points) */}
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
                            {regressionMetric === 'revenue'
                              ? `$${pt.actualY}`
                              : pt.actualY}
                          </text>
                        </g>
                      );
                    } else {
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
                    }
                  })}
                </svg>
              </div>
            </div>

            {/* Mathematical Model Box: Equation y = mx + b, m, b, R^2 & Simulator */}
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
                    <p className="text-[11px] text-slate-500">
                      Pendiente (m)
                    </p>
                    <p
                      data-testid="ols-slope"
                      className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5"
                    >
                      {regression.slope >= 0 ? `+${regression.slope.toFixed(2)}` : regression.slope.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-emerald-700">
                      Variación por semana (x)
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <p className="text-[11px] text-slate-500">
                      Intercepto (b)
                    </p>
                    <p
                      data-testid="ols-intercept"
                      className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5"
                    >
                      {regression.intercept.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Ordenada en el origen (x=0)
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <p className="text-[11px] text-slate-500">
                      Coef. Determinación (R²)
                    </p>
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
                    <p className="text-[11px] text-slate-500">
                      Correlación Lineal (r)
                    </p>
                    <p className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                      {regression.correlation.toFixed(4)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Ajuste lineal positivo
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed border-t border-emerald-200/70 pt-3">
                  Cada compra completada en el carrito actualiza la semana activa (<strong className="font-mono">Sem {salesHistory.length}</strong>) y recalcula instantáneamente los coeficientes <strong className="font-mono">m</strong>, <strong className="font-mono">b</strong> y <strong className="font-mono">R²</strong>.
                </div>
              </div>

              {/* Add Weekly Observation Form */}
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
                      type="number"
                      min={100}
                      step={50}
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

        {/* SECTION 2: PRODUCT MANAGEMENT (CRUD) */}
        <section
          aria-labelledby="crud-products-heading"
          className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 lg:p-8 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs font-medium text-emerald-700">
                Inventario & Precios en Tiempo Real
              </p>
              <h2
                id="crud-products-heading"
                className="text-xl md:text-2xl font-bold text-slate-900 mt-0.5"
              >
                Gestión de Productos
              </h2>
            </div>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 self-start sm:self-auto shadow-xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Producto</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Nombre</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Precio (USD)</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500 tabular-nums">
                      {product.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">
                        {product.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {product.tag} · {product.calories} kcal · {product.protein}g prot
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {product.category}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums">
                      {inlinePriceId === product.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            aria-label={`Nuevo precio para ${product.name}`}
                            value={inlinePriceValue}
                            onChange={(e) => setInlinePriceValue(e.target.value)}
                            className="w-20 px-2 py-1 text-xs font-mono border border-emerald-500 rounded-lg"
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
                            className="text-xs text-emerald-700 hover:underline"
                          >
                            Editar
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(product, -1)}
                          aria-label={`Reducir stock de ${product.name}`}
                          className="w-6 h-6 rounded border border-slate-200 text-xs flex items-center justify-center hover:bg-slate-100"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-semibold text-slate-800">
                          {product.stock}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(product, 1)}
                          aria-label={`Incrementar stock de ${product.name}`}
                          className="w-6 h-6 rounded border border-slate-200 text-xs flex items-center justify-center hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium">
                      <span
                        className={
                          product.status === 'Activo'
                            ? 'text-emerald-700'
                            : product.status === 'Bajo Stock'
                              ? 'text-amber-700'
                              : 'text-red-600'
                        }
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(product)}
                          aria-label={`Editar detalles de ${product.name}`}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProduct(product.id)}
                          aria-label={`Eliminar ${product.name}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Transactions Log */}
        {recentOrders.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              Transacciones Recientes Registradas en la Sesión ({recentOrders.length})
            </h3>
            <div className="space-y-2">
              {recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-mono font-semibold text-emerald-800">
                      #{ord.id}
                    </span>
                    <span className="mx-2 text-slate-400">·</span>
                    <span className="font-medium text-slate-900">
                      {ord.customerName}
                    </span>
                    <span className="mx-2 text-slate-400">·</span>
                    <span className="text-slate-500">{ord.createdAt}</span>
                  </div>
                  <div className="font-mono font-bold text-slate-900 tabular-nums">
                    Total: ${ord.total.toFixed(2)} USD
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
          onClick={() => setIsProductModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[#F0FDF4] border-b border-emerald-100 flex items-center justify-between">
              <h3
                id="product-modal-title"
                className="text-base font-bold text-slate-900"
              >
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

            <form onSubmit={handleProductFormSubmit} className="p-6 space-y-4">
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
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej. Magnesio Treonato + L-Teanina Pura"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    onChange={(e) =>
                      setFormCategory(e.target.value as ProductCategory)
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Batidos Proteicos">Batidos Proteicos</option>
                    <option value="Superalimentos">Superalimentos</option>
                    <option value="Suplementos Naturales">
                      Suplementos Naturales
                    </option>
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
                    step="0.50"
                    min="1"
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
                    value={formFiber}
                    onChange={(e) => setFormFiber(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200"
                  />
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
    </div>
  );
};
