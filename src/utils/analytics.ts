import {
  AdminUser,
  CartItem,
  CartSummary,
  LinearRegressionResult,
  OrderReceipt,
  Product,
  ProductStatus,
  RegressionPoint,
  SaleRecord,
  SalesAggregationPeriod,
  TopSellingProductSummary,
  WellnessProjectionPoint,
} from '../types/nutrivital';

export const TAX_RATE = 0.16; // 16% IVA
export const FREE_SHIPPING_THRESHOLD = 90;
export const STANDARD_SHIPPING_FEE = 6.5;

/**
 * Computes product inventory status based on available stock count.
 */
export function computeProductStatus(stock: number): ProductStatus {
  if (stock <= 0) return 'Agotado';
  if (stock <= 8) return 'Bajo Stock';
  return 'Activo';
}

/**
 * Calculates cart subtotal, tax (16%), shipping, and final total.
 */
export function calculateCartSummary(items: CartItem[]): CartSummary {
  const subtotalRaw = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = Number(subtotalRaw.toFixed(2));
  const tax = Number((subtotal * TAX_RATE).toFixed(2));
  const shipping =
    subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : STANDARD_SHIPPING_FEE;
  const total = Number((subtotal + tax + shipping).toFixed(2));

  return {
    subtotal,
    tax,
    shipping,
    total,
    totalItems,
  };
}

/**
 * Deducts purchased cart items from product inventory and updates status.
 */
export function deductInventoryAfterPurchase(
  products: Product[],
  cartItems: CartItem[]
): Product[] {
  const purchasedMap = new Map<string, number>();
  for (const item of cartItems) {
    purchasedMap.set(
      item.product.id,
      (purchasedMap.get(item.product.id) ?? 0) + item.quantity
    );
  }

  return products.map((product) => {
    const bought = purchasedMap.get(product.id);
    if (!bought) return product;
    const nextStock = Math.max(0, product.stock - bought);
    return {
      ...product,
      stock: nextStock,
      status: computeProductStatus(nextStock),
    };
  });
}

/**
 * Ordinary Least Squares (OLS) Linear Regression (strictly non-logarithmic):
 * y = m * x + b
 *
 * Where x = week number (1..n) and y = revenue or units sold.
 * No logarithmic scales, exponential transforms, or polynomial smoothing.
 */
export function calculateOrdinaryLinearRegression(
  sales: SaleRecord[],
  metric: 'revenue' | 'units' = 'revenue',
  forecastWeeks: number = 2
): LinearRegressionResult {
  const n = sales.length;
  if (n === 0) {
    return {
      slope: 0,
      intercept: 0,
      rSquared: 0,
      correlation: 0,
      equation: 'y = 0x + 0',
      meanX: 0,
      meanY: 0,
      points: [],
      nextWeekPrediction: 0,
    };
  }

  const xs = sales.map((s) => s.week);
  const ys = sales.map((s) => (metric === 'revenue' ? s.revenue : s.units));

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    numerator += dx * dy;
    denominatorX += dx * dx;
    denominatorY += dy * dy;
  }

  const rawSlope = denominatorX === 0 ? 0 : numerator / denominatorX;
  const rawIntercept = meanY - rawSlope * meanX;

  const correlationDenom = Math.sqrt(denominatorX * denominatorY);
  const rawCorrelation =
    correlationDenom === 0 ? 0 : numerator / correlationDenom;
  const rawRSquared = Math.max(
    0,
    Math.min(1, rawCorrelation * rawCorrelation)
  );

  const slope = Number(rawSlope.toFixed(2));
  const intercept = Number(rawIntercept.toFixed(2));
  const rSquared = Number(rawRSquared.toFixed(4));
  const correlation = Number(rawCorrelation.toFixed(4));

  const sign = intercept >= 0 ? '+' : '-';
  const absIntercept = Math.abs(intercept).toFixed(2);
  const equation = `y = ${slope.toFixed(2)}x ${sign} ${absIntercept}`;

  const points: RegressionPoint[] = sales.map((s) => {
    const actualY = metric === 'revenue' ? s.revenue : s.units;
    const predictedY = Number((rawSlope * s.week + rawIntercept).toFixed(2));
    const residual = Number((actualY - predictedY).toFixed(2));
    return {
      x: s.week,
      weekLabel: s.weekLabel,
      actualY,
      predictedY,
      residual,
      isForecast: false,
    };
  });

  const maxWeek = Math.max(...xs);
  for (let f = 1; f <= forecastWeeks; f++) {
    const futureWeek = maxWeek + f;
    const predictedY = Number(
      (rawSlope * futureWeek + rawIntercept).toFixed(2)
    );
    points.push({
      x: futureWeek,
      weekLabel: `Sem ${futureWeek} (Proy.)`,
      actualY: null,
      predictedY,
      residual: null,
      isForecast: true,
    });
  }

  const nextWeekPrediction = Number(
    (rawSlope * (maxWeek + 1) + rawIntercept).toFixed(2)
  );

  return {
    slope,
    intercept,
    rSquared,
    correlation,
    equation,
    meanX: Number(meanX.toFixed(2)),
    meanY: Number(meanY.toFixed(2)),
    points,
    nextWeekPrediction,
  };
}

/**
 * Generates consumer wellness transformation curves across 1 to 12 weeks
 * and adherence level (50% to 100%).
 */
export function generateWellnessProjection(
  weeks: number,
  adherencePercent: number
): WellnessProjectionPoint[] {
  const clampedWeeks = Math.max(1, Math.min(12, Math.round(weeks)));
  const clampedAdherence = Math.max(50, Math.min(100, adherencePercent));
  const adherenceFactor = clampedAdherence / 100;

  const points: WellnessProjectionPoint[] = [];

  for (let w = 1; w <= clampedWeeks; w++) {
    // Progressive physiological adaptation curves scaled by adherence
    const progressRatio = w / 12;
    const curvedProgress = 1 - Math.pow(1 - progressRatio, 1.35);

    const energyScore = Math.min(
      99,
      Math.round(42 + 54 * curvedProgress * adherenceFactor)
    );
    const sleepQuality = Math.min(
      98,
      Math.round(38 + 56 * Math.pow(progressRatio, 0.85) * adherenceFactor)
    );
    const inflammationReduction = Math.min(
      95,
      Math.round(14 + 76 * Math.pow(progressRatio, 0.92) * adherenceFactor)
    );

    const compositeVitality = Math.round(
      (energyScore + sleepQuality + inflammationReduction) / 3
    );

    points.push({
      week: w,
      weekLabel: `Sem ${w}`,
      energyScore,
      sleepQuality,
      inflammationReduction,
      compositeVitality,
    });
  }

  return points;
}

/**
 * Authenticates an administrator against registered admin users.
 * Supports email, access code, or admin ID matching, with whitespace resilience.
 */
export function authenticateAdmin(
  users: AdminUser[],
  emailInput: string,
  passwordInput: string
): { ok: true; user: AdminUser } | { ok: false; error: string } {
  const normalizedIdentifier = emailInput.trim().toLowerCase();
  const trimmedPassword = passwordInput ? passwordInput.trim() : '';

  if (!normalizedIdentifier || !trimmedPassword) {
    return {
      ok: false,
      error: 'Por favor ingresa tu correo institucional y contraseña.',
    };
  }

  const matchedUser = users.find(
    (u) =>
      u.email.toLowerCase() === normalizedIdentifier ||
      u.id.toLowerCase() === normalizedIdentifier ||
      u.accessCode.toLowerCase() === normalizedIdentifier
  );

  if (!matchedUser) {
    return {
      ok: false,
      error: 'No existe una cuenta de administrador asociada a este correo.',
    };
  }

  // Support both exact password and trimmed password to avoid copy-paste whitespace failures
  if (
    matchedUser.password !== passwordInput &&
    matchedUser.password !== trimmedPassword
  ) {
    return {
      ok: false,
      error: 'Contraseña incorrecta. Verifica tus credenciales de acceso.',
    };
  }

  return { ok: true, user: matchedUser };
}

function getOrderTimestampMs(order: OrderReceipt, fallbackIndex: number): number {
  if (order.createdAtIso) {
    const t = Date.parse(order.createdAtIso);
    if (!Number.isNaN(t)) return t;
  }
  const t2 = Date.parse(order.createdAt);
  if (!Number.isNaN(t2)) return t2;
  return fallbackIndex;
}

function getMondayUtcKey(date: Date): { key: string; label: string } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getUTCDate()).padStart(2, '0');
  return {
    key: `${y}-${m}-${dayStr}`,
    label: `Sem ${dayStr}/${m}`,
  };
}

/**
 * Agrupa pedidos reales (orders + order_items) en una serie cronológica real
 * por día, semana, mes o por pedido individual para alimentar la regresión lineal OLS.
 */
export function aggregateOrdersToSalesSeries(
  orders: OrderReceipt[],
  period: SalesAggregationPeriod = 'day'
): SaleRecord[] {
  if (!orders || orders.length === 0) return [];

  const sorted = orders
    .map((order, idx) => ({ order, ts: getOrderTimestampMs(order, idx) }))
    .sort((a, b) => a.ts - b.ts);

  if (period === 'order') {
    return sorted.map(({ order }, idx) => {
      const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
      return {
        week: idx + 1,
        weekLabel: `#${idx + 1}`,
        revenue: Number(order.total.toFixed(2)),
        units,
        ordersCount: 1,
      };
    });
  }

  const buckets = new Map<
    string,
    { label: string; revenue: number; units: number; ordersCount: number }
  >();

  const shortMonths = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];

  for (const { order, ts } of sorted) {
    const date = new Date(ts);
    const validDate = !Number.isNaN(date.getTime()) ? date : new Date();
    const y = validDate.getFullYear();
    const mIdx = validDate.getMonth();
    const mStr = String(mIdx + 1).padStart(2, '0');
    const dStr = String(validDate.getDate()).padStart(2, '0');

    let key: string;
    let label: string;

    if (period === 'day') {
      key = `${y}-${mStr}-${dStr}`;
      label = `${dStr} ${shortMonths[mIdx]}`;
    } else if (period === 'week') {
      const mon = getMondayUtcKey(validDate);
      key = mon.key;
      label = mon.label;
    } else {
      key = `${y}-${mStr}`;
      label = `${shortMonths[mIdx]} ${String(y).slice(-2)}`;
    }

    const orderUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const prev = buckets.get(key);
    if (prev) {
      prev.revenue = Number((prev.revenue + order.total).toFixed(2));
      prev.units += orderUnits;
      prev.ordersCount += 1;
    } else {
      buckets.set(key, {
        label,
        revenue: Number(order.total.toFixed(2)),
        units: orderUnits,
        ordersCount: 1,
      });
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, b], idx) => ({
      week: idx + 1,
      weekLabel: b.label,
      revenue: b.revenue,
      units: b.units,
      ordersCount: b.ordersCount,
    }));
}

/**
 * Calcula los productos más vendidos reales a partir de order_items en los pedidos registrados.
 */
export function calculateTopSellingProducts(
  orders: OrderReceipt[]
): TopSellingProductSummary[] {
  const map = new Map<string, TopSellingProductSummary>();

  for (const order of orders) {
    const seenInOrder = new Set<string>();
    for (const item of order.items) {
      const key = item.productId || item.name;
      const existing = map.get(key);
      if (existing) {
        existing.unitsSold += item.quantity;
        existing.revenue = Number((existing.revenue + item.lineTotal).toFixed(2));
        if (!seenInOrder.has(key)) {
          existing.ordersCount += 1;
          seenInOrder.add(key);
        }
      } else {
        map.set(key, {
          productId: item.productId || 'N/D',
          productName: item.name,
          unitsSold: item.quantity,
          revenue: Number(item.lineTotal.toFixed(2)),
          ordersCount: 1,
        });
        seenInOrder.add(key);
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold
  );
}
