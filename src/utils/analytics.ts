import {
  AdminUser,
  CartItem,
  CartSummary,
  LinearRegressionResult,
  Product,
  ProductStatus,
  RegressionPoint,
  SaleRecord,
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
 */
export function authenticateAdmin(
  users: AdminUser[],
  emailInput: string,
  passwordInput: string
): { ok: true; user: AdminUser } | { ok: false; error: string } {
  const normalizedEmail = emailInput.trim().toLowerCase();
  if (!normalizedEmail || !passwordInput) {
    return {
      ok: false,
      error: 'Por favor ingresa tu correo institucional y contraseña.',
    };
  }

  const matchedUser = users.find(
    (u) => u.email.toLowerCase() === normalizedEmail
  );

  if (!matchedUser) {
    return {
      ok: false,
      error: 'No existe una cuenta de administrador asociada a este correo.',
    };
  }

  if (matchedUser.password !== passwordInput) {
    return {
      ok: false,
      error: 'Contraseña incorrecta. Verifica tus credenciales de acceso.',
    };
  }

  return { ok: true, user: matchedUser };
}
