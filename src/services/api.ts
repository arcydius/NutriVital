import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  AdminRole,
  AdminUser,
  ClientBiometrics,
  ClientHealthGoals,
  ClientUser,
  FattyLiverGrade,
  Gender,
  IllustrationVariant,
  MedicalLabMarkers,
  MedicalReportRecord,
  OrderReceipt,
  Product,
  ProductCategory,
  ProductStatus,
  ProductTag,
  SaleRecord,
} from '../types/nutrivital';

export interface CloudInitialState {
  products: Product[];
  salesHistory: SaleRecord[];
  clients: ClientUser[];
  adminUsers: AdminUser[];
  recentOrders: OrderReceipt[];
}

interface DbUserRow {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  access_code: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  created_at: string;
  last_login: string | null;
}

interface DbBiometricsRow {
  user_id: string;
  systolic_bp: number | string;
  diastolic_bp: number | string;
  heart_rate: number | string;
  body_weight: number | string;
  height: number | string | null;
  waist_circumference: number | string | null;
  body_mass: number | string;
  daily_calories: number | string;
  fatty_liver_grade: number | null;
  updated_at: string | null;
}

interface DbGoalsRow {
  user_id: string;
  target_systolic_bp: number | string;
  target_diastolic_bp: number | string;
  target_heart_rate: number | string;
  target_weight: number | string;
  target_body_mass: number | string;
  target_calories: number | string;
  timeline_weeks: number | string;
  source: 'ai_report' | 'baseline_default' | null;
  ai_rationale: string | null;
  generated_from_report_id: string | null;
  generated_at: string | null;
}

interface DbReportRow {
  id: string;
  user_id: string;
  file_name: string;
  storage_path: string | null;
  report_type: MedicalReportRecord['reportType'];
  report_date: string | null;
  uploaded_at: string | null;
  ai_clinical_summary: string | null;
  markers_json: MedicalLabMarkers | null;
  flagged_findings: string[] | null;
  contraindications: string[] | null;
  detected_systolic_bp: number | string | null;
  detected_diastolic_bp: number | string | null;
  detected_heart_rate: number | string | null;
  detected_weight: number | string | null;
  detected_height: number | string | null;
  detected_waist: number | string | null;
  suggested_goals_json: ClientHealthGoals | null;
}

interface DbProductRow {
  id: string;
  name: string;
  category: ProductCategory;
  tag: ProductTag;
  calories: number | string;
  protein: number | string;
  fiber: number | string;
  price: number | string;
  stock: number | string;
  status: ProductStatus;
  description: string | null;
  serving_size: string | null;
  illustration: IllustrationVariant | null;
}

interface DbOrderRow {
  id: string;
  customer_name: string;
  customer_email: string;
  payment_method: string;
  subtotal: number | string;
  tax: number | string;
  shipping: number | string;
  total: number | string;
  created_at_label: string | null;
  created_at: string;
}

interface DbOrderItemRow {
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number | string;
  unit_price: number | string;
  line_total: number | string;
}

interface DbSaleRow {
  week: number | string;
  week_label: string;
  revenue: number | string;
  units: number | string;
  orders_count: number | string;
}

function mapProductRow(row: DbProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    tag: row.tag,
    calories: Number(row.calories),
    protein: Number(row.protein),
    fiber: Number(row.fiber),
    price: Number(row.price),
    stock: Number(row.stock),
    status: row.status,
    description: row.description || '',
    servingSize: row.serving_size || '30g · 25 porciones',
    illustration: row.illustration || 'protein-matcha',
  };
}

function mapReportRow(row: DbReportRow): MedicalReportRecord {
  return {
    id: row.id,
    fileName: row.file_name,
    filePath: row.storage_path || undefined,
    reportType: row.report_type,
    reportDate: row.report_date || new Date().toISOString().slice(0, 10),
    uploadedAt: row.uploaded_at || '',
    aiClinicalSummary: row.ai_clinical_summary || '',
    markers: row.markers_json || {},
    flaggedFindings: Array.isArray(row.flagged_findings) ? row.flagged_findings : [],
    contraindications: Array.isArray(row.contraindications) ? row.contraindications : [],
    detectedSystolicBP:
      row.detected_systolic_bp !== null ? Number(row.detected_systolic_bp) : undefined,
    detectedDiastolicBP:
      row.detected_diastolic_bp !== null ? Number(row.detected_diastolic_bp) : undefined,
    detectedHeartRate:
      row.detected_heart_rate !== null ? Number(row.detected_heart_rate) : undefined,
    detectedWeight:
      row.detected_weight !== null ? Number(row.detected_weight) : undefined,
    detectedHeight:
      row.detected_height !== null ? Number(row.detected_height) : undefined,
    detectedWaist:
      row.detected_waist !== null ? Number(row.detected_waist) : undefined,
    suggestedGoals: row.suggested_goals_json || undefined,
  };
}

function reportSupabaseError(
  action: string,
  error: { message?: string; code?: string; details?: string } | null
): boolean {
  if (!error) return false;
  console.error(`[NutriVital Supabase] Error en ${action}:`, error.code || '', error.message || error);
  return true;
}

export const nutriApi = {
  isCloudEnabled(): boolean {
    return isSupabaseConfigured && supabase !== null;
  },

  async fetchInitialState(): Promise<CloudInitialState | null> {
    if (!supabase) return null;
    try {
      const [
        productsRes,
        salesRes,
        usersRes,
        biometricsRes,
        goalsRes,
        activeSuppRes,
        reportsRes,
        ordersRes,
        orderItemsRes,
      ] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('sales_history').select('*').order('week', { ascending: true }),
        supabase.from('users').select('*').order('created_at', { ascending: true }),
        supabase.from('user_biometrics').select('*'),
        supabase.from('user_health_goals').select('*'),
        supabase.from('user_active_supplements').select('user_id, supplement_id'),
        supabase.from('medical_reports').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(25),
        supabase.from('order_items').select('*'),
      ]);

      if (productsRes.error || usersRes.error) {
        console.error(
          '[NutriVital Supabase] Error cargando estado inicial:',
          productsRes.error || usersRes.error
        );
        return null;
      }

      const products = ((productsRes.data || []) as DbProductRow[]).map(mapProductRow);

      const salesHistory: SaleRecord[] = ((salesRes.data || []) as DbSaleRow[]).map((s) => ({
        week: Number(s.week),
        weekLabel: s.week_label,
        revenue: Number(s.revenue),
        units: Number(s.units),
        ordersCount: Number(s.orders_count),
      }));

      const bioMap = new Map<string, ClientBiometrics>();
      for (const b of (biometricsRes.data || []) as DbBiometricsRow[]) {
        bioMap.set(b.user_id, {
          systolicBP: Number(b.systolic_bp),
          diastolicBP: Number(b.diastolic_bp),
          heartRate: Number(b.heart_rate),
          bodyWeight: Number(b.body_weight),
          height: b.height !== null ? Number(b.height) : undefined,
          waistCircumference:
            b.waist_circumference !== null ? Number(b.waist_circumference) : undefined,
          bodyMass: Number(b.body_mass),
          dailyCalories: Number(b.daily_calories),
          fattyLiverGrade: (b.fatty_liver_grade ?? 0) as FattyLiverGrade,
          lastUpdated: b.updated_at ? b.updated_at.replace('T', ' ').substring(0, 16) : '',
        });
      }

      const goalsMap = new Map<string, ClientHealthGoals>();
      for (const g of (goalsRes.data || []) as DbGoalsRow[]) {
        goalsMap.set(g.user_id, {
          targetSystolicBP: Number(g.target_systolic_bp),
          targetDiastolicBP: Number(g.target_diastolic_bp),
          targetHeartRate: Number(g.target_heart_rate),
          targetWeight: Number(g.target_weight),
          targetBodyMass: Number(g.target_body_mass),
          targetCalories: Number(g.target_calories),
          timelineWeeks: Number(g.timeline_weeks),
          source: g.source || 'baseline_default',
          aiRationale: g.ai_rationale || undefined,
          generatedFromReportId: g.generated_from_report_id || undefined,
          generatedAt: g.generated_at || undefined,
        });
      }

      const suppMap = new Map<string, string[]>();
      for (const s of (activeSuppRes.data || []) as { user_id: string; supplement_id: string }[]) {
        const list = suppMap.get(s.user_id) || [];
        list.push(s.supplement_id);
        suppMap.set(s.user_id, list);
      }

      const reportsMap = new Map<string, MedicalReportRecord[]>();
      for (const r of (reportsRes.data || []) as DbReportRow[]) {
        const list = reportsMap.get(r.user_id) || [];
        list.push(mapReportRow(r));
        reportsMap.set(r.user_id, list);
      }

      const adminUsers: AdminUser[] = [];
      const clients: ClientUser[] = [];

      for (const u of (usersRes.data || []) as DbUserRow[]) {
        if (u.role === 'Cliente') {
          const userReports = reportsMap.get(u.id) || [];
          const hasReports = userReports.length > 0;
          clients.push({
            id: u.id,
            name: u.name,
            email: u.email,
            password: u.password,
            role: 'Cliente',
            createdAt: u.created_at ? u.created_at.substring(0, 10) : '',
            dateOfBirth: u.date_of_birth || undefined,
            gender: u.gender || undefined,
            biometrics: hasReports ? (bioMap.get(u.id) ?? null) : null,
            goals: hasReports ? (goalsMap.get(u.id) ?? null) : null,
            activeSupplements: hasReports ? (suppMap.get(u.id) || []) : [],
            medicalReports: userReports,
          });
        } else {
          adminUsers.push({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role as AdminRole,
            accessCode: u.access_code || 'NV-2026',
            password: u.password,
            createdAt: u.created_at ? u.created_at.substring(0, 10) : '',
            lastLogin: u.last_login || undefined,
          });
        }
      }

      const orderItemsMap = new Map<string, OrderReceipt['items']>();
      for (const item of (orderItemsRes.data || []) as DbOrderItemRow[]) {
        const list = orderItemsMap.get(item.order_id) || [];
        list.push({
          productId: item.product_id || '',
          name: item.product_name,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
          lineTotal: Number(item.line_total),
        });
        orderItemsMap.set(item.order_id, list);
      }

      const recentOrders: OrderReceipt[] = ((ordersRes.data || []) as DbOrderRow[]).map((o) => ({
        id: o.id,
        createdAt: o.created_at_label || o.created_at.substring(0, 16),
        customerName: o.customer_name,
        customerEmail: o.customer_email,
        paymentMethod: o.payment_method,
        items: orderItemsMap.get(o.id) || [],
        subtotal: Number(o.subtotal),
        tax: Number(o.tax),
        shipping: Number(o.shipping),
        total: Number(o.total),
      }));

      return { products, salesHistory, clients, adminUsers, recentOrders };
    } catch (err) {
      console.warn('Error cargando estado desde Supabase:', err);
      return null;
    }
  },

  async registerClientToDb(client: ClientUser) {
    if (!supabase) return null;
    try {
      const { error: userErr } = await supabase.from('users').upsert(
        {
          id: client.id,
          name: client.name,
          email: client.email,
          password: client.password || 'Cliente2026!',
          role: 'Cliente',
          date_of_birth: client.dateOfBirth || null,
          gender: client.gender || null,
        },
        { onConflict: 'id' }
      );
      if (reportSupabaseError('registerClientToDb (users)', userErr)) return null;

      if (client.biometrics) {
        const { error: bioErr } = await supabase.from('user_biometrics').upsert(
          {
            user_id: client.id,
            systolic_bp: client.biometrics.systolicBP,
            diastolic_bp: client.biometrics.diastolicBP,
            heart_rate: client.biometrics.heartRate,
            body_weight: client.biometrics.bodyWeight,
            height: client.biometrics.height ?? null,
            waist_circumference: client.biometrics.waistCircumference ?? null,
            body_mass: client.biometrics.bodyMass,
            daily_calories: client.biometrics.dailyCalories,
            fatty_liver_grade: client.biometrics.fattyLiverGrade ?? 0,
          },
          { onConflict: 'user_id' }
        );
        if (reportSupabaseError('registerClientToDb (user_biometrics)', bioErr)) return null;
      }

      if (client.goals) {
        const { error: goalsErr } = await supabase.from('user_health_goals').upsert(
          {
            user_id: client.id,
            target_systolic_bp: client.goals.targetSystolicBP,
            target_diastolic_bp: client.goals.targetDiastolicBP,
            target_heart_rate: client.goals.targetHeartRate,
            target_weight: client.goals.targetWeight,
            target_body_mass: client.goals.targetBodyMass,
            target_calories: client.goals.targetCalories,
            timeline_weeks: client.goals.timelineWeeks,
            source: client.goals.source || 'ai_report',
            ai_rationale: client.goals.aiRationale || null,
          },
          { onConflict: 'user_id' }
        );
        if (reportSupabaseError('registerClientToDb (user_health_goals)', goalsErr)) return null;
      }

      if (client.activeSupplements && client.activeSupplements.length > 0) {
        const suppOk = await this.syncClientSupplements(client.id, client.activeSupplements);
        if (!suppOk) return null;
      }
      return true;
    } catch (err) {
      console.error('[NutriVital Supabase] Excepción registrando cliente:', err);
      return null;
    }
  },

  async registerAdminToDb(admin: AdminUser) {
    if (!supabase) return null;
    try {
      const { error } = await supabase.from('users').upsert(
        {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          password: admin.password,
          role: admin.role,
          access_code: admin.accessCode,
          last_login: admin.lastLogin || null,
        },
        { onConflict: 'id' }
      );
      if (reportSupabaseError('registerAdminToDb', error)) return null;
      return true;
    } catch (err) {
      console.error('[NutriVital Supabase] Excepción registrando admin:', err);
      return null;
    }
  },

  async updateAdminLastLogin(adminId: string, lastLogin: string) {
    if (!supabase) return null;
    try {
      const { error } = await supabase
        .from('users')
        .update({ last_login: lastLogin })
        .eq('id', adminId);
      if (reportSupabaseError('updateAdminLastLogin', error)) return null;
      return true;
    } catch (err) {
      console.error('[NutriVital Supabase] Excepción actualizando lastLogin:', err);
      return null;
    }
  },

  async syncClientSupplements(userId: string, supplementIds: string[]) {
    if (!supabase) return null;
    try {
      const { error: deleteErr } = await supabase
        .from('user_active_supplements')
        .delete()
        .eq('user_id', userId);
      if (reportSupabaseError('syncClientSupplements (delete)', deleteErr)) return null;

      if (supplementIds.length > 0) {
        const { error: insertErr } = await supabase.from('user_active_supplements').insert(
          supplementIds.map((supplement_id) => ({
            user_id: userId,
            supplement_id,
          }))
        );
        if (reportSupabaseError('syncClientSupplements (insert)', insertErr)) return null;
      }
      return true;
    } catch (err) {
      console.error('[NutriVital Supabase] Excepción sincronizando suplementos:', err);
      return null;
    }
  },

  async uploadReportToCloudDb(
    userId: string,
    report: MedicalReportRecord,
    biometrics: ClientBiometrics,
    goals: ClientHealthGoals,
    rawFile?: File
  ) {
    if (!supabase) return null;
    try {
      let storagePath: string | null = report.filePath || null;

      if (rawFile) {
        const safeName = rawFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${userId}/${report.id}_${safeName}`;
        const { error: uploadErr } = await supabase.storage
          .from('medical-reports')
          .upload(path, rawFile, { upsert: true });
        if (uploadErr) {
          reportSupabaseError('uploadReportToCloudDb (storage.upload)', uploadErr);
        } else {
          storagePath = path;
        }
      }

      const { error: reportErr } = await supabase.from('medical_reports').upsert(
        {
          id: report.id,
          user_id: userId,
          file_name: report.fileName,
          storage_path: storagePath,
          report_type: report.reportType,
          report_date: report.reportDate,
          uploaded_at: report.uploadedAt,
          ai_clinical_summary: report.aiClinicalSummary,
          markers_json: report.markers,
          flagged_findings: report.flaggedFindings,
          contraindications: report.contraindications,
          detected_systolic_bp: report.detectedSystolicBP ?? null,
          detected_diastolic_bp: report.detectedDiastolicBP ?? null,
          detected_heart_rate: report.detectedHeartRate ?? null,
          detected_weight: report.detectedWeight ?? null,
          detected_height: report.detectedHeight ?? null,
          detected_waist: report.detectedWaist ?? null,
          suggested_goals_json: goals,
        },
        { onConflict: 'id' }
      );
      if (reportSupabaseError('uploadReportToCloudDb (medical_reports)', reportErr)) return null;

      const { error: bioErr } = await supabase.from('user_biometrics').upsert(
        {
          user_id: userId,
          systolic_bp: biometrics.systolicBP,
          diastolic_bp: biometrics.diastolicBP,
          heart_rate: biometrics.heartRate,
          body_weight: biometrics.bodyWeight,
          height: biometrics.height ?? null,
          waist_circumference: biometrics.waistCircumference ?? null,
          body_mass: biometrics.bodyMass,
          daily_calories: biometrics.dailyCalories,
          fatty_liver_grade: biometrics.fattyLiverGrade ?? 0,
        },
        { onConflict: 'user_id' }
      );
      if (reportSupabaseError('uploadReportToCloudDb (user_biometrics)', bioErr)) return null;

      const { error: goalsErr } = await supabase.from('user_health_goals').upsert(
        {
          user_id: userId,
          target_systolic_bp: goals.targetSystolicBP,
          target_diastolic_bp: goals.targetDiastolicBP,
          target_heart_rate: goals.targetHeartRate,
          target_weight: goals.targetWeight,
          target_body_mass: goals.targetBodyMass,
          target_calories: goals.targetCalories,
          timeline_weeks: goals.timelineWeeks,
          source: goals.source || 'ai_report',
          ai_rationale: goals.aiRationale || null,
          generated_from_report_id: goals.generatedFromReportId || report.id,
          generated_at: goals.generatedAt || null,
        },
        { onConflict: 'user_id' }
      );
      if (reportSupabaseError('uploadReportToCloudDb (user_health_goals)', goalsErr)) return null;

      return storagePath;
    } catch (err) {
      console.error('[NutriVital Supabase] Excepción guardando informe:', err);
      return null;
    }
  },

  async deleteReportFromCloudDb(reportId: string, storagePath?: string) {
    if (!supabase) return null;
    try {
      const { error: delErr } = await supabase
        .from('medical_reports')
        .delete()
        .eq('id', reportId);
      if (reportSupabaseError('deleteReportFromCloudDb (medical_reports)', delErr)) return null;
      if (storagePath) {
        const { error: rmErr } = await supabase.storage
          .from('medical-reports')
          .remove([storagePath]);
        reportSupabaseError('deleteReportFromCloudDb (storage.remove)', rmErr);
      }
      return true;
    } catch (err) {
      console.error('[NutriVital Supabase] Excepción eliminando informe:', err);
      return null;
    }
  },

  async clearClientClinicalProfileFromDb(userId: string) {
    if (!supabase) return null;
    try {
      const [bioDel, goalsDel, suppDel] = await Promise.all([
        supabase.from('user_biometrics').delete().eq('user_id', userId),
        supabase.from('user_health_goals').delete().eq('user_id', userId),
        supabase.from('user_active_supplements').delete().eq('user_id', userId),
      ]);
      reportSupabaseError('clearClientClinicalProfileFromDb (user_biometrics)', bioDel.error);
      reportSupabaseError('clearClientClinicalProfileFromDb (user_health_goals)', goalsDel.error);
      reportSupabaseError('clearClientClinicalProfileFromDb (user_active_supplements)', suppDel.error);
      return true;
    } catch (err) {
      console.error('[NutriVital Supabase] Excepción limpiando perfil clínico:', err);
      return null;
    }
  },

  async saveProductToDb(product: Product) {
    if (!supabase) return null;
    try {
      const { error } = await supabase.from('products').upsert(
        {
          id: product.id,
          name: product.name,
          category: product.category,
          tag: product.tag,
          calories: product.calories,
          protein: product.protein,
          fiber: product.fiber,
          price: product.price,
          stock: product.stock,
          status: product.status,
          description: product.description,
          serving_size: product.servingSize,
          illustration: product.illustration,
        },
        { onConflict: 'id' }
      );
      if (reportSupabaseError('saveProductToDb', error)) return null;
      return true;
    } catch (err) {
      console.error('[NutriVital Supabase] Excepción guardando producto:', err);
      return null;
    }
  },

  async saveProductsBulkToDb(productsList: Product[]) {
    if (!supabase || productsList.length === 0) return null;
    try {
      const payload = productsList.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        tag: product.tag,
        calories: product.calories,
        protein: product.protein,
        fiber: product.fiber,
        price: product.price,
        stock: product.stock,
        status: product.status,
        description: product.description,
        serving_size: product.servingSize,
        illustration: product.illustration,
      }));
      const { error } = await supabase.from('products').upsert(payload, { onConflict: 'id' });
      if (reportSupabaseError('saveProductsBulkToDb', error)) return null;
      return true;
    } catch (err) {
      console.error('[NutriVital Supabase] Excepción guardando lote de productos:', err);
      return null;
    }
  },

  async deleteProductFromDb(productId: string) {
    if (!supabase) return null;
    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (reportSupabaseError('deleteProductFromDb', error)) return null;
      return true;
    } catch (err) {
      console.error('[NutriVital Supabase] Excepción eliminando producto:', err);
      return null;
    }
  },

  async recordOrderToDb(
    receipt: OrderReceipt,
    updatedProducts: Product[],
    updatedSalesWeek: SaleRecord,
    userId?: string
  ) {
    if (!supabase) return null;
    try {
      const { error: orderErr } = await supabase.from('orders').insert({
        id: receipt.id,
        user_id: userId || null,
        customer_name: receipt.customerName,
        customer_email: receipt.customerEmail,
        payment_method: receipt.paymentMethod,
        subtotal: receipt.subtotal,
        tax: receipt.tax,
        shipping: receipt.shipping,
        total: receipt.total,
        created_at_label: receipt.createdAt,
      });
      if (reportSupabaseError('recordOrderToDb (orders)', orderErr)) return null;

      if (receipt.items.length > 0) {
        const { error: itemsErr } = await supabase.from('order_items').insert(
          receipt.items.map((item) => ({
            order_id: receipt.id,
            product_id: item.productId,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            line_total: item.lineTotal,
          }))
        );
        if (reportSupabaseError('recordOrderToDb (order_items)', itemsErr)) return null;
      }

      const purchasedIds = new Set(receipt.items.map((i) => i.productId));
      const stockResults = await Promise.all(
        updatedProducts
          .filter((p) => purchasedIds.has(p.id))
          .map((p) =>
            supabase!
              .from('products')
              .update({ stock: p.stock, status: p.status })
              .eq('id', p.id)
          )
      );
      for (const res of stockResults) {
        if (reportSupabaseError('recordOrderToDb (products stock)', res.error)) return null;
      }

      const salesOk = await this.upsertSalesWeekToDb(updatedSalesWeek);
      if (!salesOk) return null;
      return true;
    } catch (err) {
      console.error('[NutriVital Supabase] Excepción registrando orden:', err);
      return null;
    }
  },

  async upsertSalesWeekToDb(record: SaleRecord) {
    if (!supabase) return null;
    try {
      const { error } = await supabase.from('sales_history').upsert(
        {
          week: record.week,
          week_label: record.weekLabel,
          revenue: record.revenue,
          units: record.units,
          orders_count: record.ordersCount,
        },
        { onConflict: 'week' }
      );
      if (reportSupabaseError('upsertSalesWeekToDb', error)) return null;
      return true;
    } catch (err) {
      console.error('[NutriVital Supabase] Excepción guardando semana de ventas:', err);
      return null;
    }
  },

  async resetSalesHistoryInDb(initialRecords: SaleRecord[]) {
    if (!supabase) return null;
    try {
      const { error: delErr } = await supabase.from('sales_history').delete().gte('week', 0);
      if (reportSupabaseError('resetSalesHistoryInDb (delete)', delErr)) return null;
      if (initialRecords.length > 0) {
        const { error: insErr } = await supabase.from('sales_history').insert(
          initialRecords.map((r) => ({
            week: r.week,
            week_label: r.weekLabel,
            revenue: r.revenue,
            units: r.units,
            orders_count: r.ordersCount,
          }))
        );
        if (reportSupabaseError('resetSalesHistoryInDb (insert)', insErr)) return null;
      }
      return true;
    } catch (err) {
      console.error('[NutriVital Supabase] Excepción reiniciando historial de ventas:', err);
      return null;
    }
  },
};
