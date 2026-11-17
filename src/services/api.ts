import {
  ClientBiometrics,
  ClientHealthGoals,
  ClientUser,
  Gender,
  MedicalReportRecord,
  Product,
} from '../types/nutrivital';

// URL base cuando la carpeta api/ se monta en XAMPP (C:\xampp\htdocs\nutrivital\api)
const PHP_API_BASE = 'http://localhost/nutrivital/api';

async function safeFetch(url: string, options?: RequestInit) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // XAMPP Apache / MySQL no activo: la aplicación continúa operando offline con localStorage
    return null;
  }
}

export const nutriApi = {
  async syncBiometricsToDb(
    userId: string,
    biometrics: ClientBiometrics,
    dateOfBirth?: string,
    gender?: Gender
  ) {
    return safeFetch(`${PHP_API_BASE}/users.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_biometrics',
        userId,
        biometrics,
        dateOfBirth,
        gender,
      }),
    });
  },

  async syncAdminGoalsToDb(
    userId: string,
    goals: ClientHealthGoals,
    adminId: string
  ) {
    return safeFetch(`${PHP_API_BASE}/users.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_goals',
        userId,
        goals,
        adminId,
      }),
    });
  },

  async registerClientToDb(client: ClientUser) {
    return safeFetch(`${PHP_API_BASE}/users.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        id: client.id,
        name: client.name,
        email: client.email,
        password: client.password,
        dateOfBirth: client.dateOfBirth,
        gender: client.gender,
      }),
    });
  },

  async uploadReportToCloudDb(userId: string, report: MedicalReportRecord, rawContent?: string) {
    return safeFetch(`${PHP_API_BASE}/reports.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        report,
        rawContent,
      }),
    });
  },

  async deleteReportFromCloudDb(reportId: string) {
    return safeFetch(`${PHP_API_BASE}/reports.php?id=${encodeURIComponent(reportId)}`, {
      method: 'DELETE',
    });
  },

  async saveProductToDb(product: Product) {
    return safeFetch(`${PHP_API_BASE}/products.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product }),
    });
  },
};
