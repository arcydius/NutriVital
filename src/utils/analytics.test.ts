import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authenticateAdmin,
  calculateCartSummary,
  calculateOrdinaryLinearRegression,
  computeProductStatus,
  deductInventoryAfterPurchase,
  generateWellnessProjection,
} from './analytics';
import { AdminUser, Product, SaleRecord } from '../types/nutrivital';

const sampleProduct: Product = {
  id: 'NV-01',
  name: 'Proteína Vegetal Matcha & Vainilla',
  category: 'Batidos Proteicos',
  tag: '100% Orgánico',
  calories: 130,
  protein: 24,
  fiber: 5,
  price: 40,
  stock: 15,
  status: 'Activo',
  description: 'Aislado de proteína de guisante y arroz.',
  servingSize: '32g por porción',
  illustration: 'protein-matcha',
};

test('calculateOrdinaryLinearRegression computes exact OLS slope m, intercept b, and R^2 for collinear data', () => {
  // Exact line: y = 150x + 1000
  const exactLinearSales: SaleRecord[] = [
    { week: 1, weekLabel: 'Sem 1', revenue: 1150, units: 23, ordersCount: 12 },
    { week: 2, weekLabel: 'Sem 2', revenue: 1300, units: 26, ordersCount: 14 },
    { week: 3, weekLabel: 'Sem 3', revenue: 1450, units: 29, ordersCount: 16 },
    { week: 4, weekLabel: 'Sem 4', revenue: 1600, units: 32, ordersCount: 18 },
  ];

  const result = calculateOrdinaryLinearRegression(
    exactLinearSales,
    'revenue',
    2
  );

  assert.equal(result.slope, 150);
  assert.equal(result.intercept, 1000);
  assert.equal(result.rSquared, 1);
  assert.equal(result.equation, 'y = 150.00x + 1000.00');
  assert.equal(result.nextWeekPrediction, 1750);
  assert.equal(result.points.length, 6); // 4 historical + 2 forecast
  assert.equal(result.points[4].isForecast, true);
  assert.equal(result.points[4].predictedY, 1750);
});

test('calculateCartSummary computes subtotal, 16% tax, and shipping threshold accurately', () => {
  const summaryWithShipping = calculateCartSummary([
    { product: sampleProduct, quantity: 1 }, // $40 < $90 threshold
  ]);
  assert.equal(summaryWithShipping.subtotal, 40);
  assert.equal(summaryWithShipping.tax, 6.4);
  assert.equal(summaryWithShipping.shipping, 6.5);
  assert.equal(summaryWithShipping.total, 52.9);

  const summaryFreeShipping = calculateCartSummary([
    { product: sampleProduct, quantity: 3 }, // $120 >= $90 threshold
  ]);
  assert.equal(summaryFreeShipping.subtotal, 120);
  assert.equal(summaryFreeShipping.tax, 19.2);
  assert.equal(summaryFreeShipping.shipping, 0);
  assert.equal(summaryFreeShipping.total, 139.2);
});

test('deductInventoryAfterPurchase decrements stock and updates status appropriately', () => {
  const updated = deductInventoryAfterPurchase(
    [sampleProduct],
    [{ product: sampleProduct, quantity: 10 }]
  );
  assert.equal(updated[0].stock, 5);
  assert.equal(updated[0].status, 'Bajo Stock');
  assert.equal(computeProductStatus(0), 'Agotado');
});

test('generateWellnessProjection scales monotonically with weeks and adherence', () => {
  const projLow = generateWellnessProjection(6, 55);
  const projHigh = generateWellnessProjection(12, 95);

  assert.equal(projLow.length, 6);
  assert.equal(projHigh.length, 12);
  assert.ok(projHigh[11].energyScore > projLow[5].energyScore);
  assert.ok(projHigh[11].sleepQuality > projHigh[0].sleepQuality);
  assert.ok(
    projHigh[11].inflammationReduction > projHigh[0].inflammationReduction
  );
});

test('authenticateAdmin validates credentials and rejects wrong passwords', () => {
  const admins: AdminUser[] = [
    {
      id: 'ADM-01',
      name: 'Dra. Elena Valdés',
      email: 'admin@nutrivital.com',
      role: 'Administrador General',
      accessCode: 'NV-2026',
      password: 'NutriAdmin2026!',
      createdAt: '2026-01-15',
    },
  ];

  const valid = authenticateAdmin(
    admins,
    'ADMIN@nutrivital.com',
    'NutriAdmin2026!'
  );
  assert.equal(valid.ok, true);

  const invalidPass = authenticateAdmin(
    admins,
    'admin@nutrivital.com',
    'wrong-pass'
  );
  assert.equal(invalidPass.ok, false);
});
