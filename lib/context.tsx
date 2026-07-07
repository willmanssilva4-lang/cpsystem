'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './supabase';
import { getDBValue, setDBValue } from './indexedDb';
import { 
  Product, 
  Supplier,
  Customer, 
  Departamento, 
  Categoria, 
  Subcategoria, 
  Lote, 
  SystemSettings, 
  User,
  StockMovement,
  Inventory,
  PricingSettings,
  PaymentMethod,
  Maquininha,
  Advertisement
} from './types';
import { normalizeArray } from './utils';


interface ERPContextType {
  user: User | null;
  isAuthReady: boolean;
  isLoading: boolean;
  systemUsersError?: string | null;
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: any[];
  expenses: any[];
  lotes: Lote[];
  stockMovements: StockMovement[];
  inventories: Inventory[];
  systemSettings: SystemSettings | null;
  pricingSettings: PricingSettings;
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  departamentos: Departamento[];
  paymentMethods: PaymentMethod[];
  systemUsers: any[];
  promotions: any[];
  returns: any[];
  employees: any[];
  accessProfiles: any[];
  maquininhas: Maquininha[];
  companySettings: SystemSettings | null;
  expenseCategories: any[];
  losses: any[];
  discountLogs: any[];
  auditLogs: any[];
  vouchers: any[];
  cashRegisters: any[];
  cashMovements: any[];
  cashClosings: any[];
  advertisements: Advertisement[];
  addAdvertisement: (data: any) => Promise<void>;
  updateAdvertisement: (data: any) => Promise<void>;
  deleteAdvertisement: (id: string) => Promise<void>;
  
  fetchData: () => Promise<void>;
  
  // Settings
  updateCompanySettings: (data: any) => Promise<void>;
  updateSystemSettings: (data: any) => Promise<void>;
  updatePricingSettings: (data: any) => Promise<void>;
  changePassword: (password: string) => Promise<{error: any}>;

  // Products
  addProduct: (data: Partial<Product>) => Promise<boolean | string>;
  updateProduct: (data: Product) => Promise<boolean | string>;
  deleteProduct: (id: string) => Promise<void>;

  // Payment Methods
  addPaymentMethod: (data: any) => Promise<boolean>;
  updatePaymentMethod: (data: PaymentMethod) => Promise<boolean>;
  deletePaymentMethod: (id: string) => Promise<void>;

  // System Users
  addSystemUser: (data: any, password?: string) => Promise<void>;
  updateSystemUser: (data: any, password?: string) => Promise<void>;
  deleteSystemUser: (id: string) => Promise<void>;

  // Access Profiles
  addAccessProfile: (data: any) => Promise<void>;
  updateAccessProfile: (data: any) => Promise<void>;
  deleteAccessProfile: (id: string) => Promise<void>;

  // Maquininhas
  addMaquininha: (data: any) => Promise<void>;
  updateMaquininha: (data: Maquininha) => Promise<void>;
  deleteMaquininha: (id: string) => Promise<void>;

  // Permissions
  permissions: any[];
  updatePermissions: (profileId: string, permissions: any[]) => Promise<void>;
  
  // Suppliers
  addSupplier: (data: Partial<Supplier>) => Promise<void>;
  updateSupplier: (data: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  // Customers
  addCustomer: (data: Partial<Customer>) => Promise<void>;
  updateCustomer: (data: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  
  // Employees
  addEmployee: (data: any) => Promise<void>;
  updateEmployee: (data: any) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  
  // Stock
  addStockMovement: (data: any, skipFetch?: boolean) => Promise<void>;
  addInventory: (data: any, skipFetch?: boolean) => Promise<void>;
  deleteInventory: (id: string) => Promise<void>;
  
  // Others
  addExpense: (data: any) => Promise<void>;
  updateExpense: (data: any) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addExpenseCategory: (data: any) => Promise<void>;
  addCategoria: (data: any) => Promise<void>;
  updateCategoria: (data: any) => Promise<void>;
  deleteCategoria: (id: string) => Promise<void>;
  addSubcategoria: (data: any) => Promise<void>;
  updateSubcategoria: (data: any) => Promise<void>;
  deleteSubcategoria: (id: string) => Promise<void>;
  addDepartamento: (data: any) => Promise<void>;
  updateDepartamento: (data: any) => Promise<void>;
  deleteDepartamento: (id: string) => Promise<void>;
  addSale: (data: any) => Promise<any>;
  updateSale: (data: any) => Promise<boolean>;
  deleteSale: (id: string) => Promise<void>;
  addReturn: (data: any) => Promise<boolean>;
  updateVoucher: (data: any) => Promise<boolean>;
  getVoucherByCode: (code: string) => any;
  openCashRegister: (openingBalance: number) => Promise<boolean>;
  closeCashRegister: (informedTotals: any[], justification: string, explicitRegisterId?: string) => Promise<boolean>;
  addCashMovement: (movement: any) => Promise<boolean>;
  addDiscountLog: (data: any) => Promise<void>;
  addLoss: (data: any) => Promise<void>;
  addPromotion: (data: any) => Promise<void>;
  updatePromotion: (data: any) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;
  activeRegister?: any;
  seedMercadologicalTree: () => Promise<void>;
  seedExpenseCategories: () => Promise<void>;
  customAlert: any;
  setCustomAlert: (alert: { message: string, type: 'success' | 'error' | 'warning' | 'info' } | null) => void;
  hasPermission: (module: string, action: string) => boolean;
  logout: () => Promise<void>;
  login: (email: string, password: string) => Promise<{success: boolean, error?: string}>;
  sendEmailNotification: (to: string, subject: string, text: string, html: string, from?: string) => Promise<{success: boolean, error?: string}>;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export function ERPProvider({ children }: { children: React.ReactNode }) {
  const returnsInProgress = useRef<Set<string>>(new Set());
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('systemSettings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return null;
  });
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pricingSettings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return { defaultMethod: 'markup' };
  });
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [systemUsersError, setSystemUsersError] = useState<string | null>(null);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [accessProfiles, setAccessProfiles] = useState<any[]>([]);
  const [maquininhas, setMaquininhas] = useState<Maquininha[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [losses, setLosses] = useState<any[]>([]);
  const [discountLogs, setDiscountLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [cashRegisters, setCashRegisters] = useState<any[]>([]);
  const [cashMovements, setCashMovements] = useState<any[]>([]);
  const [cashClosings, setCashClosings] = useState<any[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('advertisements');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [customAlert, setCustomAlert] = useState<any>(null);

  useEffect(() => {
    const channel = supabase.channel('data_sync');
    channel
      .on('broadcast', { event: 'data_imported' }, () => {
        console.log('🔄 Sincronização recebida! Recarregando...');
        window.location.reload();
      })
      .on('broadcast', { event: 'carga_enviada' }, ({ payload }) => {
        console.log('📦 Nova carga de produtos recebida via broadcast!', payload);
        if (payload && payload.products) {
          setDBValue('erp_pdv_carga_pending_products', payload.products)
            .then(() => {
              localStorage.setItem('erp_pdv_carga_pending_flag', 'true');
              
              // Trigger local window events so the active PDV page can instantly update
              try {
                window.dispatchEvent(new StorageEvent('storage', {
                  key: 'erp_pdv_carga_pending_flag',
                  newValue: 'true'
                }));
              } catch (evErr) {
                console.warn('Falha ao disparar StorageEvent padrão, tentando CustomEvent:', evErr);
              }
              window.dispatchEvent(new CustomEvent('erp_pdv_carga_pending_flag_changed', { detail: 'true' }));
            })
            .catch(err => {
              console.error('[context] Erro ao salvar carga pendente no IndexedDB via broadcast:', err);
            });
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const activeRegister = useMemo(() => {
    return cashRegisters.find(r => r.status === 'open' && r.userId === user?.id);
  }, [cashRegisters, user?.id]);

  const fetchData = async (explicitCompanyId?: string) => {
    setIsLoading(true);
    const targetCompanyId = explicitCompanyId || user?.companyId;

    try {
      console.log('[ERPProvider] fetchData starting parallel fetches for company:', targetCompanyId);
      
      const fetchAllProducts = async () => {
        try {
          let allProducts: Product[] = [];
          let rangeStart = 0;
          const rangeSize = 1000;
          while (true) {
            let query = supabase.from('products').select('*').order('id').range(rangeStart, rangeStart + rangeSize - 1);
            
            if (targetCompanyId) {
              // Allow fetch from company OR null (legacy/global)
              query = query.or(`company_id.eq.${targetCompanyId},company_id.is.null`);
            }

            const { data, error } = await query;
            if (error) {
              console.error('[ERPProvider] Error fetching products. Range:', rangeStart, '-', rangeStart + rangeSize, 'Error:', error);
              break;
            }
            if (!data || data.length === 0) break;
            allProducts = [...allProducts, ...data];
            if (data.length < rangeSize) break;
            rangeStart += rangeSize;
          }
          return allProducts;
        } catch (e) {
          console.error('[ERPProvider] Exception in fetchAllProducts:', e);
          return [];
        }
      };

      const baseQuery = (table: string, skipCompanyFilter: boolean = false) => {
        let q = supabase.from(table).select('*');
        if (targetCompanyId && !skipCompanyFilter) {
          // Standard company field is company_id
          q = q.or(`company_id.eq.${targetCompanyId},company_id.is.null`);
        }
        return q;
      };

      const fetchReturns = async () => {
        try {
          let q = supabase.from('returns').select('*');
          if (targetCompanyId) {
            q = q.or(`company_id.eq.${targetCompanyId},company_id.is.null`);
          }
          const { data: returnsData, error: returnsError } = await q;
          
          if (returnsError) {
            console.error('[ERPProvider] Error fetching returns:', returnsError);
            throw returnsError;
          }

          if (!returnsData) return [];

          // Try fetching return_items separately if the initial join failed or just for safety
          const { data: itemsData, error: itemsError } = await supabase.from('return_items').select('*');
          
          if (itemsError) {
             console.warn('[ERPProvider] Could not fetch return_items:', itemsError);
             return returnsData;
          }

          return returnsData.map(r => ({
            ...r,
            return_items: itemsData.filter(i => i.return_id === r.id)
          }));
        } catch (e) {
          console.error('[ERPProvider] Exception in fetchReturns:', e);
          return [];
        }
      };

      console.log(`[ERPProvider] fetchData: Starting fetches for company ${targetCompanyId || 'ALL'}`);

      const results = await Promise.allSettled([
        fetchAllProducts(),
        baseQuery('suppliers'),
        baseQuery('departamentos', true),
        baseQuery('categorias', true),
        baseQuery('subcategorias', true),
        baseQuery('stock_movements').order('date', { ascending: false }).limit(5000),
        baseQuery('inventories'),
        baseQuery('maquininhas'),
        baseQuery('payment_methods', true),
        baseQuery('advertisements'),
        baseQuery('customers').order('name'),
        baseQuery('sales').order('created_at', { ascending: false }).limit(2000),
        baseQuery('expenses'),
        baseQuery('produto_lotes'),
        supabase.from('system_settings').select('*').single(), // Settings might be per company
        typeof window !== 'undefined'
          ? fetch(`/api/admin/users?companyId=${targetCompanyId || ''}`).then(async (res) => {
              if (!res.ok) {
                const text = await res.text();
                throw new Error(`API status ${res.status}: ${text}`);
              }
              const json = await res.json();
              setSystemUsersError(null);
              return { data: json.data || [] };
            }).catch(async (err) => {
              console.warn('[ERPProvider] Error fetching system_users from API, trying client-side fallback:', err.message || err);
              try {
                let q = supabase.from('system_users').select('*');
                if (targetCompanyId) {
                  q = q.or(`company_id.eq.${targetCompanyId},company_id.is.null`);
                }
                const { data: fallbackData, error: fallbackError } = await q;
                if (fallbackError) {
                  console.error('[ERPProvider] Fallback query to system_users also failed:', fallbackError);
                  setSystemUsersError(`Erro na API e no fallback do banco: ${fallbackError.message}`);
                  return { data: [] };
                }
                console.log('[ERPProvider] Successfully fetched system_users via client fallback:', fallbackData?.length);
                setSystemUsersError(null);
                return { data: fallbackData || [] };
              } catch (fallbackExc: any) {
                console.error('[ERPProvider] Exception in system_users fallback:', fallbackExc);
                setSystemUsersError(`Erro na API: ${err.message || err}. Fallback falhou: ${fallbackExc.message || fallbackExc}`);
                return { data: [] };
              }
            })
          : Promise.resolve({ data: [] }), // Filter users by company later if needed
        baseQuery('promotions'),
        fetchReturns(),
        baseQuery('employees'),
        supabase.from('access_profiles').select('*'),
        supabase.from('permissions').select('*'),
        baseQuery('expense_categories'),
        baseQuery('losses'),
        baseQuery('discount_logs'),
        baseQuery('audit_logs').order('created_at', { ascending: false }).limit(100),
        baseQuery('vouchers').order('created_at', { ascending: false }),
        baseQuery('cash_registers'),
        baseQuery('cash_movements'),
        baseQuery('cash_closings'),
        baseQuery('sale_items').limit(5000)
      ]);

      console.log('[ERPProvider] Parallel fetches finished, processing results');

      const getLocalFallback = (key: string) => {
        if (typeof window === 'undefined') return null;
        try {
          const saved = localStorage.getItem(key);
          return saved ? JSON.parse(saved) : null;
        } catch (e) { return null; }
      };

      const getData = (index: number, localKey?: string) => {
        const res = results[index];
        if (res.status === 'fulfilled') {
          const val = res.value as any;
          // Supabase responses have a 'data' property
          if (val && typeof val === 'object' && 'data' in val) {
            // If data is empty array, try local fallback if key provided
            if (localKey && Array.isArray(val.data) && val.data.length === 0) {
              const local = getLocalFallback(localKey);
              if (local) {
                console.log(`[ERPProvider] Supabase empty for ${localKey}, using local fallback`);
                return local;
              }
            }
            return val.data;
          }
          return val;
        }
        
        if (localKey) {
          const local = getLocalFallback(localKey);
          if (local) {
            console.log(`[ERPProvider] Fetch failed for ${localKey}, using local fallback`);
            return local;
          }
        }
        
        console.warn(`[ERPProvider] Fetch failed at index ${index}:`, (res as any).reason);
        return null;
      };

      const prods = getData(0, 'erp_products');
      let supps_res = getData(1, 'suppliers');
      
      // Fallback check if suppliers is empty - maybe table name is different?
      if (!supps_res || (Array.isArray(supps_res) && supps_res.length === 0)) {
        console.log('[ERPProvider] suppliers table empty, trying erp_suppliers fallback...');
        const { data: fallbackSups } = await baseQuery('erp_suppliers');
        if (fallbackSups && fallbackSups.length > 0) {
          console.log(`[ERPProvider] Found ${fallbackSups.length} suppliers in erp_suppliers`);
          supps_res = fallbackSups;
        }
      }

      const depts_res = getData(2, 'departamentos');
      const cats_res = getData(3, 'categorias');
      const subs_res = getData(4, 'subcategorias');
      const movs_res = getData(5, 'stock_movements');
      const invs_res = getData(6, 'inventories');
      const maqs_res = getData(7, 'maquininhas');
      const pays_res = getData(8, 'payment_methods');
      const ads_res = getData(9, 'advertisements');
      const custs_res = getData(10, 'erp_customers');
      const sls_res = getData(11, 'erp_sales');
      const exps_res = getData(12, 'erp_expenses');
      const lts_res = getData(13, 'produto_lotes');
      const sysSet = getData(14, 'system_settings');
      const sysUsrs_res = getData(15, 'system_users');
      const proms_res = getData(16, 'promotions');
      const rets_res = getData(17, 'returns');
      const emps_res = getData(18, 'employees');
      const profs_res = getData(19, 'access_profiles');
      const perms_res = getData(20, 'permissions');
      const expCats_res = getData(21, 'expense_categories');
      const ls_res = getData(22, 'losses');
      const dLogs_res = getData(23, 'discount_logs');
      const audLogs_res = getData(24, 'audit_logs');
      const vchs_res = getData(25, 'vouchers');
      const cRegs_res = getData(26, 'cash_registers');
      const cMovs_res = getData(27, 'cash_movements');
      const cClos_res = getData(28, 'cash_closings');
      const saleItems_res = getData(29, 'sale_items');

      if (Array.isArray(prods)) {
        const resolvedBasicProducts = prods.map((p: any) => {
          let costPrice = p.costPrice ?? p.cost_price;
          let image = p.image || '';
          if (image.includes('#cost:')) {
            const parts = image.split('#cost:');
            image = parts[0];
            const parsedCost = Number(parts[1]);
            if (!isNaN(parsedCost)) {
              costPrice = parsedCost;
            }
          }
          return {
            ...p,
            image,
            costPrice,
            salePrice: p.salePrice ?? p.sale_price,
            wholesalePrice: p.wholesalePrice ?? p.wholesale_price,
            wholesaleMinQty: p.wholesaleMinQty ?? p.wholesale_min_qty,
            clubPrice: p.clubPrice ?? p.club_price,
            termPrice: p.termPrice ?? p.term_price,
            minStock: p.minStock ?? p.min_stock,
            controlStock: p.controlStock ?? p.control_stock,
            profit: p.profit,
            profitPercentage: p.profitPercentage,
            brand: p.brand ?? p.marca
          };
        });

        const resolvedWithVirtual = resolvedBasicProducts.map((p: any) => {
          if (p.base_product_id && p.conversion_factor) {
            const baseProduct = resolvedBasicProducts.find(bp => bp.id === p.base_product_id);
            if (baseProduct) {
              const baseStock = Number(baseProduct.stock || 0);
              const convFactor = Number(p.conversion_factor) || 1;
              const virtualStock = Math.floor(baseStock * convFactor);
              
              const baseCost = Number(baseProduct.costPrice || baseProduct.cost_price || 0);
              const virtualCost = Number((baseCost / convFactor).toFixed(3));
              
              return {
                ...p,
                stock: virtualStock,
                costPrice: virtualCost
              };
            }
          }
          return p;
        });

        const resolvedProducts = resolvedWithVirtual.map((p: any) => {
          if (p.product_type === 'KIT' && p.composition && Array.isArray(p.composition)) {
            const updatedComposition = p.composition.map((item: any) => {
              const compProd = resolvedWithVirtual.find(bp => bp.id === item.productId);
              return {
                ...item,
                price: compProd ? compProd.costPrice : (item.price || 0)
              };
            });
            const dynamicCostPrice = Number(updatedComposition.reduce((acc: number, item: any) => acc + ((item.price || 0) * item.quantity), 0).toFixed(3));
            
            // Calculate Stock for KIT dynamically based on components (with pre-resolved virtual stocks)
            let kitStock = Infinity;
            if (updatedComposition.length > 0) {
              updatedComposition.forEach((item: any) => {
                const component = resolvedWithVirtual.find(bp => bp.id === item.productId);
                if (component) {
                  const compStock = Number(component.stock || 0);
                  const qtyNeeded = Number(item.quantity) || 1;
                  const available = Math.floor(compStock / qtyNeeded);
                  if (available < kitStock) {
                    kitStock = available;
                  }
                } else {
                  kitStock = 0;
                }
              });
            }
            if (kitStock === Infinity) kitStock = 0;

            return {
              ...p,
              composition: updatedComposition,
              costPrice: dynamicCostPrice,
              stock: kitStock
            };
          }
          
          return p;
        });

        setProducts(resolvedProducts);
        
        // Snapshot initial state if not already set
        const checkAndSetInitialSnapshot = async () => {
          const saved = await getDBValue<Product[]>('erp_pdv_last_sent_products');
          if (!saved || saved.length === 0) {
            console.log('[ERPProvider] Snapshotting initial product state');
            await setDBValue('erp_pdv_last_sent_products', resolvedProducts);
          }
        };
        checkAndSetInitialSnapshot();
      }
      if (Array.isArray(supps_res)) {
        setSuppliers(supps_res.map(s => ({
          ...s,
          status: s.status || 'Ativo'
        })));
      }
      if (Array.isArray(depts_res)) setDepartamentos(depts_res);
      if (Array.isArray(cats_res)) setCategorias(cats_res);
      console.log('[DEBUG] Subs Result:', subs_res);
      if (Array.isArray(subs_res)) {
        setSubcategorias(subs_res);
      } else {
        console.log('[DEBUG] Subs Result is NOT an array!');
      }
      if (Array.isArray(movs_res)) {
        setStockMovements(movs_res.map((m: any) => ({
          ...m,
          productId: m.productId ?? m.product_id ?? '',
          userId: m.userId ?? m.user_id ?? '',
          userName: m.userName ?? m.user_name ?? '',
          companyId: m.companyId ?? m.company_id ?? '',
          quantity: Number(m.quantity) || 0
        })));
      }
      if (Array.isArray(invs_res)) {
        setInventories(invs_res.map((i: any) => ({
          ...i,
          itemsCounted: i.itemsCounted ?? i.items_counted ?? 0,
          divergenceValue: i.divergenceValue ?? i.divergence_value ?? 0
        })));
      }
      if (Array.isArray(maqs_res)) setMaquininhas(maqs_res);
      if (Array.isArray(pays_res)) {
        setPaymentMethods(pays_res.map((p: any) => {
          let infType = p.type;
          if (!infType && p.name) {
            const up = p.name.toUpperCase();
            if (up === 'CRÉDITO' || up === 'CREDITO' || up.includes('CRÉDITO') || up.includes('CREDITO')) infType = 'Crédito';
            else if (up === 'DÉBITO' || up === 'DEBITO' || up.includes('DÉBITO') || up.includes('DEBITO')) infType = 'Débito';
            else if (up === 'PIX' || up.includes('PIX')) infType = 'Pix';
            else if (up === 'DINHEIRO' || up.includes('DINHEIRO')) infType = 'Dinheiro';
            else if (up.includes('FIADO') || up.includes('CREDIAR') || up.includes('PRAZO')) infType = 'Fiado';
            else if (up.includes('VOUCHER') || up.includes('VALE') || up.includes('CUPOM')) infType = 'Voucher';
          }
          return {
            id: p.id,
            name: p.name,
            type: infType || 'Dinheiro',
            active: p.active,
            taxPercentage: p.tax_percentage ?? p.taxPercentage ?? 0,
            taxFixed: p.tax_value ?? p.tax_fixed ?? p.taxFixed ?? 0,
            companyId: p.companyId ?? p.company_id ?? null
          };
        }));
      }
      if (Array.isArray(ads_res)) {
        setAdvertisements(ads_res);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('advertisements', JSON.stringify(ads_res));
          } catch (e) {
            console.error('[ERPProvider] Error saving advertisements to localStorage:', e);
          }
        }
      }
      if (Array.isArray(custs_res)) {
        setCustomers(custs_res.map((c: any) => ({
          id: c.id,
          name: c.name,
          document: c.document,
          email: c.email || '',
          phone: c.phone || '',
          address: c.address || '',
          active: c.active !== undefined ? c.active : (c.status === 'Ativo' || c.status === 'VIP'),
          status: c.status || 'Ativo',
          isClubMember: c.is_club_member ?? c.isClubMember ?? false,
          clubJoinDate: c.club_join_date ?? c.clubJoinDate ?? null,
          clubPoints: c.club_points ?? c.clubPoints ?? 0,
          totalSpent: c.total_spent ?? c.totalSpent ?? 0,
          image: c.image || '',
          companyId: c.company_id ?? c.companyId ?? null
        })));
      }
      if (Array.isArray(sls_res)) {
        const movements = Array.isArray(movs_res) ? movs_res : [];
        const loadedProducts = Array.isArray(prods) ? prods : [];
        const saleItemsList = Array.isArray(saleItems_res) ? saleItems_res : [];
        const mappedSales = sls_res.map((sale: any) => {
          const saleMovements = movements.filter((m: any) => 
            m.type === 'VENDA' && 
            (m.origin === `Venda #${sale.id}` || m.origin === `Venda #${sale.id?.substring(0, 8)}`)
          );
          
          const dbItems = saleItemsList.filter((si: any) => si.sale_id === sale.id);
          
          let items;
          if (dbItems && dbItems.length > 0) {
            items = dbItems.map((si: any) => {
              const product = loadedProducts.find((p: any) => p.id === si.product_id);
              const cost = product ? (product.costPrice ?? product.cost_price ?? 0) : 0;
              return {
                productId: si.product_id,
                quantity: si.quantity || 0,
                price: si.price || 0,
                costPrice: cost,
                originalPrice: si.original_price ?? si.price ?? 0,
                discount: si.discount || 0,
                promotionId: si.promotion_id || null
              };
            });
          } else {
            items = saleMovements.map((move: any) => {
              const prodId = move.product_id || move.productId;
              const product = loadedProducts.find((p: any) => p.id === prodId);
              const price = product ? ((product as any).sale_price ?? (product as any).salePrice ?? 0) : 0;
              const cost = move.cost !== undefined ? move.cost : (product ? (product.costPrice ?? product.cost_price ?? 0) : 0);
              return {
                productId: prodId,
                quantity: move.quantity || 0,
                price: price,
                costPrice: cost,
                originalPrice: price,
                discount: 0,
                promotionId: null
              };
            });
          }

          return {
            ...sale,
            paymentMethod: sale.payment_method ?? sale.paymentMethod,
            customerId: sale.customer_id ?? sale.customerId,
            userId: sale.user_id ?? sale.userId,
            cashRegisterId: sale.cash_register_id ?? sale.cashRegisterId,
            maquininhaId: sale.maquininha_id ?? sale.maquininhaId,
            taxAmount: sale.tax_amount !== undefined ? sale.tax_amount : sale.taxAmount,
            netAmount: sale.net_amount !== undefined ? sale.net_amount : sale.netAmount,
            companyId: sale.company_id ?? sale.companyId,
            storeId: sale.store_id ?? sale.storeId,
            items: items
          };
        });
        setSales(mappedSales);
      }
      if (Array.isArray(exps_res)) {
        setExpenses(exps_res.map((e: any) => ({
          ...e,
          // camelCase standard equivalents
          companyId: e.companyId ?? e.company_id ?? '',
          supplierId: e.supplierId ?? e.supplier_id ?? '',
          paymentType: e.paymentType ?? e.payment_type ?? 'À vista',
          issueDate: e.issueDate ?? e.issue_date ?? '',
          dueDate: e.dueDate ?? e.due_date ?? '',
          paymentDate: e.paymentDate ?? e.payment_date ?? '',
          paymentMethod: e.paymentMethod ?? e.payment_method ?? '',
          financialAccount: e.financialAccount ?? e.financial_account ?? '',
          storeId: e.storeId ?? e.store_id ?? '',
          isRecurring: e.isRecurring ?? e.is_recurring ?? false,
          // snake_case standard equivalents for database queries/inserts
          company_id: e.company_id ?? e.companyId ?? '',
          supplier_id: e.supplier_id ?? e.supplierId ?? '',
          payment_type: e.payment_type ?? e.paymentType ?? 'À vista',
          issue_date: e.issue_date ?? e.issueDate ?? '',
          due_date: e.due_date ?? e.dueDate ?? '',
          payment_date: e.payment_date ?? e.paymentDate ?? '',
          payment_method: e.payment_method ?? e.paymentMethod ?? '',
          financial_account: e.financial_account ?? e.financialAccount ?? '',
          store_id: e.store_id ?? e.storeId ?? '',
          is_recurring: e.is_recurring ?? e.isRecurring ?? false
        })));
      }
      if (Array.isArray(lts_res)) {
        setLotes(lts_res.map((l: any) => ({
          ...l,
          productId: l.productId ?? l.produto_id ?? '',
          produto_id: l.produto_id ?? l.productId ?? '',
          numeroLote: l.numeroLote ?? l.numero_lote ?? '',
          numero_lote: l.numero_lote ?? l.numeroLote ?? '',
          validade: l.validade ?? '',
          saldoAtual: Number(l.saldoAtual ?? l.saldo_atual ?? 0),
          saldo_atual: Number(l.saldo_atual ?? l.saldoAtual ?? 0),
          dataEntrada: l.dataEntrada ?? l.data_entrada ?? '',
          data_entrada: l.data_entrada ?? l.dataEntrada ?? '',
          custoUnit: Number(l.custoUnit ?? l.custo_unit ?? 0),
          custo_unit: Number(l.custo_unit ?? l.custoUnit ?? 0),
          quantidadeInicial: Number(l.quantidadeInicial ?? l.quantidade_inicial ?? 0),
          quantidade_inicial: Number(l.quantidade_inicial ?? l.quantidadeInicial ?? 0),
          company_id: l.company_id ?? l.companyId ?? '',
          companyId: l.companyId ?? l.company_id ?? '',
          fornecedor_id: l.fornecedor_id ?? l.fornecedorId ?? '',
          fornecedorId: l.fornecedorId ?? l.fornecedor_id ?? ''
        })));
      }
      if (sysSet) {
        setSystemSettings(sysSet);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('systemSettings', JSON.stringify(sysSet));
          } catch (e) {
            console.error('[ERPProvider] Error saving systemSettings to localStorage:', e);
          }
        }
      }
      if (Array.isArray(sysUsrs_res)) {
        setSystemUsers(sysUsrs_res.map((u: any) => {
          const rawCode = u.supervisor_code || u.supervisorCode || '';
          let userNumber = '';
          let supervisorCode = '';
          if (rawCode.includes('|')) {
            const parts = rawCode.split('|');
            userNumber = parts[0] || '';
            supervisorCode = parts[1] || '';
          } else {
            supervisorCode = rawCode;
          }
          return {
            ...u,
            fullName: u.fullName || u.full_name || '',
            employeeId: u.employeeId || u.employee_id || '',
            profileId: u.profileId || u.profile_id || '',
            storeId: u.storeId || u.store_id || 'Todas as Lojas',
            status: u.status || (u.active !== undefined ? (u.active ? 'Ativo' : 'Inativo') : 'Ativo'),
            supervisorCode: supervisorCode,
            userNumber: userNumber,
            companyId: u.companyId || u.company_id || ''
          };
        }));
      }
      if (Array.isArray(proms_res)) {
        setPromotions(proms_res.map((p: any) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          status: p.status,
          startDate: p.start_date || p.startDate || '',
          endDate: p.end_date || p.endDate || '',
          targetType: p.target_type || p.targetType || 'PRODUCT',
          targetId: p.target_type === 'PRODUCT' ? normalizeArray(p.target_id || p.targetId) : (p.target_id || p.targetId || ''),
          productPrices: p.product_prices || p.productPrices || {},
          discountValue: p.discount_value !== undefined ? p.discount_value : p.discountValue,
          buyQuantity: p.buy_quantity !== undefined ? p.buy_quantity : p.buyQuantity,
          payQuantity: p.pay_quantity !== undefined ? p.pay_quantity : p.payQuantity,
          comboItems: normalizeArray(p.combo_items || p.comboItems),
          comboPrice: p.combo_price !== undefined ? p.combo_price : p.comboPrice,
          applyAutomatically: p.apply_automatically !== undefined ? p.apply_automatically : p.applyAutomatically,
          onlyForClubMembers: p.only_for_club_members !== undefined ? p.only_for_club_members : p.onlyForClubMembers,
          limitPerCustomer: p.limit_per_customer !== undefined ? p.limit_per_customer : p.limitPerCustomer,
          quantityLimit: p.quantity_limit !== undefined ? p.quantity_limit : p.quantityLimit,
          daysOfWeek: p.days_of_week || p.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
          companyId: p.company_id || p.companyId
        })));
      }
      if (Array.isArray(rets_res)) {
        setReturns(rets_res.map((r: any) => ({
          ...r,
          id: r.id,
          saleId: r.saleId || r.sale_id || '',
          sale_id: r.sale_id || r.saleId || '',
          date: r.date || r.created_at || '',
          items: r.return_items ? r.return_items.map((ri: any) => ({
            productId: ri.product_id,
            quantity: ri.quantity,
            price: ri.price || 0,
            reason: ri.reason || ''
          })) : (r.items || []),
          total: r.total !== undefined ? Number(r.total) : 0,
          type: r.type || 'TOTAL',
          refundMethod: r.refundMethod || r.refund_method || '',
          refund_method: r.refund_method || r.refundMethod || '',
          userId: r.userId || r.user_id || '',
          user_id: r.user_id || r.userId || '',
          status: r.status || 'CONCLUIDO',
          voucherCode: r.voucherCode || r.voucher_code || '',
          voucher_code: r.voucher_code || r.voucherCode || '',
          companyId: r.companyId || r.company_id || '',
          company_id: r.company_id || r.companyId || ''
        })));
      }
      if (Array.isArray(emps_res)) {
        setEmployees(emps_res.map((e: any) => ({
          ...e,
          fullName: e.fullName || e.full_name || '',
          admissionDate: e.admissionDate || e.admission_date || '',
          companyId: e.companyId || e.company_id || ''
        })));
      }
      if (Array.isArray(profs_res)) setAccessProfiles(profs_res);
      if (Array.isArray(perms_res)) {
        setPermissions(perms_res.map((p: any) => ({
          ...p,
          profileId: p.profileId || p.profile_id || '',
          profile_id: p.profile_id || p.profileId || '',
          canView: p.canView !== undefined ? p.canView : (p.can_view !== undefined ? p.can_view : false),
          can_view: p.can_view !== undefined ? p.can_view : (p.canView !== undefined ? p.canView : false),
          canCreate: p.canCreate !== undefined ? p.canCreate : (p.can_create !== undefined ? p.can_create : false),
          can_create: p.can_create !== undefined ? p.can_create : (p.canCreate !== undefined ? p.canCreate : false),
          canEdit: p.canEdit !== undefined ? p.canEdit : (p.can_edit !== undefined ? p.can_edit : false),
          can_edit: p.can_edit !== undefined ? p.can_edit : (p.canEdit !== undefined ? p.canEdit : false),
          canDelete: p.canDelete !== undefined ? p.canDelete : (p.can_delete !== undefined ? p.can_delete : false),
          can_delete: p.can_delete !== undefined ? p.can_delete : (p.canDelete !== undefined ? p.canDelete : false),
          companyId: p.companyId || p.company_id || '',
          company_id: p.company_id || p.companyId || ''
        })));
      }
      if (Array.isArray(expCats_res)) setExpenseCategories(expCats_res);
      if (Array.isArray(ls_res)) {
        setLosses(ls_res.map((l: any) => ({
          ...l,
          id: l.id,
          productId: l.productId || l.product_id,
          product_id: l.product_id || l.productId,
          loteId: l.loteId || l.lote_id,
          lote_id: l.lote_id || l.loteId,
          totalValue: l.totalValue !== undefined ? Number(l.totalValue) : (l.total_value !== undefined ? Number(l.total_value) : 0),
          total_value: l.total_value !== undefined ? Number(l.total_value) : (l.totalValue !== undefined ? Number(l.totalValue) : 0),
          quantity: l.quantity !== undefined ? Number(l.quantity) : 0,
          reason: l.reason,
          date: l.date || l.created_at
        })));
      }
      if (Array.isArray(dLogs_res)) {
        setDiscountLogs(dLogs_res.map((d: any) => ({
          ...d,
          id: d.id,
          saleId: d.saleId || d.sale_id,
          sale_id: d.sale_id || d.saleId,
          appliedBy: d.appliedBy || d.applied_by,
          applied_by: d.applied_by || d.appliedBy,
          value: d.value !== undefined ? Number(d.value) : 0,
          percentage: d.percentage !== undefined ? Number(d.percentage) : 0,
          method: d.method,
          reason: d.reason,
          date: d.date || d.created_at
        })));
      }
      if (Array.isArray(audLogs_res)) {
        setAuditLogs(audLogs_res.map((log: any) => ({
          ...log,
          createdAt: log.createdAt || log.created_at,
          created_at: log.created_at || log.createdAt,
          userId: log.userId || log.user_id,
          user_id: log.user_id || log.userId,
          entityId: log.entityId || log.entity_id,
          entity_id: log.entity_id || log.entityId,
          oldData: log.oldData || log.old_data,
          old_data: log.old_data || log.oldData,
          newData: log.newData || log.new_data,
          new_data: log.new_data || log.newData,
          actionName: log.action || log.action_name,
          moduleName: log.module || log.module_name,
        })));
      }
      if (Array.isArray(vchs_res)) {
        setVouchers(vchs_res.map((v: any) => ({
          id: v.id,
          code: v.code,
          customerId: v.customerId || v.customer_id || null,
          customer_id: v.customer_id || v.customerId || null,
          currentValue: v.currentValue !== undefined ? v.currentValue : (v.current_value !== undefined ? v.current_value : 0),
          current_value: v.current_value !== undefined ? v.current_value : (v.currentValue !== undefined ? v.currentValue : 0),
          initialValue: v.initialValue !== undefined ? v.initialValue : (v.initial_value !== undefined ? v.initial_value : 0),
          initial_value: v.initial_value !== undefined ? v.initial_value : (v.initialValue !== undefined ? v.initialValue : 0),
          createdAt: v.createdAt || v.created_at || null,
          created_at: v.created_at || v.createdAt || null,
          status: v.status || 'Ativo',
          company_id: v.company_id || null
        })));
      }
      if (Array.isArray(cRegs_res)) {
        setCashRegisters(cRegs_res.map((r: any) => ({
          id: r.id,
          openingBalance: r.opening_balance !== undefined ? Number(r.opening_balance) : 0,
          opening_balance: r.opening_balance !== undefined ? Number(r.opening_balance) : 0,
          status: r.status || 'closed',
          openedAt: r.opened_at || null,
          opened_at: r.opened_at || null,
          closedAt: r.closed_at || null,
          closed_at: r.closed_at || null,
          userId: r.operator_id || 'Sistema',
          user_id: r.operator_id || 'Sistema',
          company_id: r.company_id || null
        })));
      }
      if (Array.isArray(cMovs_res)) {
        setCashMovements(cMovs_res.map((m: any) => ({
          id: m.id,
          cashRegisterId: m.cash_register_id || '',
          cash_register_id: m.cash_register_id || '',
          type: m.type,
          amount: Number(m.amount) || 0,
          reason: m.reason,
          createdAt: m.created_at || null,
          created_at: m.created_at || null,
          company_id: m.company_id || null
        })));
      }
      if (Array.isArray(cClos_res)) {
        setCashClosings(cClos_res.map((c: any) => ({
          id: c.id,
          cashRegisterId: c.cash_register_id || '',
          cash_register_id: c.cash_register_id || '',
          closedAt: c.closed_at || null,
          closed_at: c.closed_at || null,
          totalSystem: c.total_system !== undefined ? Number(c.total_system) : 0,
          total_system: c.total_system !== undefined ? Number(c.total_system) : 0,
          totalInformed: c.total_informed !== undefined ? Number(c.total_informed) : 0,
          total_informed: c.total_informed !== undefined ? Number(c.total_informed) : 0,
          totalDifference: c.total_difference !== undefined ? Number(c.total_difference) : 0,
          total_difference: c.total_difference !== undefined ? Number(c.total_difference) : 0,
          informedTotals: c.informed_totals || [],
          informed_totals: c.informed_totals || [],
          justification: c.justification,
          approvedBy: c.approved_by || null,
          approved_by: c.approved_by || null,
          company_id: c.company_id || null
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const initAuth = async () => {
      console.log('[ERPProvider] initAuth started');
      try {
        // Wrap getSession in a timeout to prevent hanging
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getSession timed out')), 5000)
        );
        
        const response = await Promise.race([sessionPromise, timeoutPromise]) as any;
        const session = response?.data?.session;
        const error = response?.error;
        
        if (error) {
          console.error('[ERPProvider] Auth session error:', error);
        }
        
        console.log('[ERPProvider] session status:', session ? 'User present' : 'No session');
        
        const companyId = session?.user?.user_metadata?.companyId || session?.user?.user_metadata?.company_id;
        if (session?.user) {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata.name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            role: session.user.user_metadata.role || 'admin',
            companyId: companyId
          });
        }
        
        console.log('[ERPProvider] Auth init ready, calling fetchData with:', companyId || 'Global');
        // We don't await fetchData to allow the UI to load faster, but it will start loading data
        fetchData(companyId);
      } catch (err) {
        console.error('[ERPProvider] Critical auth init error:', err);
      } finally {
        console.log('[ERPProvider] Setting isAuthReady to true');
        setIsAuthReady(true);
      }
    };

    // Force auth readiness after 3 seconds to prevent stuck loading screen
    timeout = setTimeout(() => {
      console.warn('[ERPProvider] initAuth timed out, forcing isAuthReady to true');
      setIsAuthReady(true);
    }, 3000);

    console.log('[ERPProvider] Starting initAuth');
    initAuth();

    const authResponse = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[ERPProvider] Auth state change:', _event);
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          role: session.user.user_metadata.role || 'admin',
          companyId: session.user.user_metadata.companyId || session.user.user_metadata.company_id
        });
      } else {
        setUser(null);
      }
      setIsAuthReady(true); // Ensure it's ready when auth state changes
    });

    const subscription = authResponse?.data?.subscription;

    return () => {
        clearTimeout(timeout);
        subscription?.unsubscribe();
    };
  }, []);

  // Products
  const addProduct = async (data: any) => {
    const rawImage = data.image ?? 'https://i.imgur.com/jGU5BUa.png';
    const cleanImage = String(rawImage).split('#cost:')[0];
    const costVal = Number(data.costPrice ?? data.cost_price ?? 0);
    const costStr = isNaN(costVal) ? '0' : String(costVal);

    const dbPayload = {
      ...data,
      image: `${cleanImage}#cost:${costStr}`,
      cost_price: Number(data.costPrice ?? data.cost_price) || 0,
      sale_price: Number(data.salePrice ?? data.sale_price) || 0,
      wholesale_price: Number(data.wholesalePrice ?? data.wholesale_price) || 0,
      wholesale_min_qty: Number(data.wholesaleMinQty ?? data.wholesale_min_qty) || 0,
      club_price: Number(data.clubPrice ?? data.club_price) || 0,
      term_price: Number(data.termPrice ?? data.term_price) || 0,
      min_stock: Number(data.minStock ?? data.min_stock) || 0,
      stock: Number(data.stock) || 0,
      control_stock: data.controlStock ?? data.control_stock ?? 'SIM'
    };

    // Remover campos camelCase e outros campos que não existem no banco
    const validColumns = [
      'id', 'name', 'category', 'sku', 'cost_price', 'sale_price', 'stock', 'min_stock', 
      'image', 'composition', 'status', 'created_at', 'category_id', 'department', 
      'group', 'subgroup', 'subcategoria_id', 'validade', 'company_id', 'codigo_mercadologico', 
      'has_had_stock', 'wholesale_price', 'control_stock', 'club_price', 'product_type', 
      'base_product_id', 'conversion_factor', 'wholesale_min_qty', 'term_price', 'linha', 
      'sabor', 'gramatura', 'tipo_embalagem', 'segmento', 'supplier', 'section', 'unit', 'barcode', 'brand'
    ];

    Object.keys(dbPayload).forEach(key => {
      const payload = dbPayload as any;
      if (['sku', 'barcode', 'subcategoria_id', 'base_product_id', 'company_id'].includes(key) && (!payload[key] || payload[key] === '')) {
        payload[key] = null;
      }
      if (['validade'].includes(key) && (!payload[key] || payload[key] === '')) {
        payload[key] = null;
      }
      if (!validColumns.includes(key)) {
        delete payload[key];
      }
    });

    const isUUID = (str: any) => {
      if (typeof str !== 'string') return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    };

    const uuidFields = ['id', 'subcategoria_id', 'base_product_id', 'company_id'];
    uuidFields.forEach(field => {
      const val = (dbPayload as any)[field];
      if (val !== undefined && val !== null) {
        if (!isUUID(val)) {
          if (field === 'id') {
            delete (dbPayload as any)[field];
          } else {
            (dbPayload as any)[field] = null;
          }
        }
      }
    });

    const { error } = await supabase.from('products').insert([dbPayload]);
    if (error) {
      console.error('Error adding product:', error);
      return error.message;
    }
    await fetchData();
    return true;
  };

  const updateProduct = async (data: any) => {
    const rawImage = data.image ?? data.image_url ?? 'https://i.imgur.com/jGU5BUa.png';
    const cleanImage = String(rawImage).split('#cost:')[0];
    const costVal = Number(data.costPrice ?? data.cost_price ?? 0);
    const costStr = isNaN(costVal) ? '0' : String(costVal);

    const dbPayload = {
      ...data,
      image: `${cleanImage}#cost:${costStr}`,
      cost_price: Number(data.costPrice ?? data.cost_price) || 0,
      sale_price: Number(data.salePrice ?? data.sale_price) || 0,
      wholesale_price: Number(data.wholesalePrice ?? data.wholesale_price) || 0,
      wholesale_min_qty: Number(data.wholesaleMinQty ?? data.wholesale_min_qty) || 0,
      club_price: Number(data.clubPrice ?? data.club_price) || 0,
      term_price: Number(data.termPrice ?? data.term_price) || 0,
      min_stock: Number(data.minStock ?? data.min_stock) || 0,
      stock: Number(data.stock) || 0,
      control_stock: data.controlStock ?? data.control_stock ?? 'SIM'
    };

    const validColumns = [
      'id', 'name', 'category', 'sku', 'cost_price', 'sale_price', 'stock', 'min_stock', 
      'image', 'composition', 'status', 'created_at', 'category_id', 'department', 
      'group', 'subgroup', 'subcategoria_id', 'validade', 'company_id', 'codigo_mercadologico', 
      'has_had_stock', 'wholesale_price', 'control_stock', 'club_price', 'product_type', 
      'base_product_id', 'conversion_factor', 'wholesale_min_qty', 'term_price', 'linha', 
      'sabor', 'gramatura', 'tipo_embalagem', 'segmento', 'supplier', 'section', 'unit', 'barcode', 'brand'
    ];

    Object.keys(dbPayload).forEach(key => {
      const payload = dbPayload as any;
      if (['sku', 'barcode', 'subcategoria_id', 'base_product_id', 'company_id'].includes(key) && (!payload[key] || payload[key] === '')) {
        payload[key] = null;
      }
      if (['validade'].includes(key) && (!payload[key] || payload[key] === '')) {
        payload[key] = null;
      }
      if (!validColumns.includes(key)) {
        delete payload[key];
      }
    });

    const isUUID = (str: any) => {
      if (typeof str !== 'string') return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    };

    const uuidFields = ['subcategoria_id', 'base_product_id', 'company_id'];
    uuidFields.forEach(field => {
      const val = (dbPayload as any)[field];
      if (val !== undefined && val !== null) {
        if (!isUUID(val)) {
          (dbPayload as any)[field] = null;
        }
      }
    });

    delete (dbPayload as any).id;

    const { error } = await supabase.from('products').update(dbPayload).eq('id', data.id);
    if (error) {
      console.error('Error updating product:', error);
      console.error('dbPayload:', dbPayload);
      console.error('data.id:', data.id);
      return error.message;
    }
    await fetchData();
    return true;
  };

  const deleteProduct = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    await fetchData();
  };

  // Suppliers
  const addSupplier = async (data: any) => {
    const payload = {
      name: data.name,
      document: data.document,
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      company_id: data.company_id || user?.companyId || null
    };
    const { error } = await supabase.from('suppliers').insert([payload]);
    if (error) {
      console.error('[addSupplier] Error inserting supplier:', error);
      throw error;
    }
    await fetchData();
  };

  const updateSupplier = async (data: any) => {
    const payload = {
      name: data.name,
      document: data.document,
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      company_id: data.company_id || user?.companyId || null
    };
    const { error } = await supabase.from('suppliers').update(payload).eq('id', data.id);
    if (error) {
      console.error('[updateSupplier] Error updating supplier:', error);
      throw error;
    }
    await fetchData();
  };

  const deleteSupplier = async (id: string) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) {
      console.error('[deleteSupplier] Error deleting supplier:', error);
      throw error;
    }
    await fetchData();
  };

  // Customers
  const addCustomer = async (data: any) => {
    const rawDate = data.clubJoinDate ?? data.club_join_date ?? null;
    const dbPayload = {
      id: data.id,
      name: data.name,
      document: data.document,
      phone: data.phone ?? '',
      email: data.email ?? '',
      status: data.status ?? 'Ativo',
      image: data.image ?? null,
      company_id: (data.companyId || data.company_id) ? (data.companyId || data.company_id) : null,
      is_club_member: data.isClubMember ?? data.is_club_member ?? false,
      club_join_date: rawDate === '' ? null : rawDate,
      total_spent: data.totalSpent ?? data.total_spent ?? 0
    };
    const { error } = await supabase.from('customers').insert([dbPayload]);
    if (error) {
      console.error('[addCustomer] Error inserting customer:', error);
      throw error;
    }
    await fetchData();
  };

  const updateCustomer = async (data: any) => {
    const rawDate = data.clubJoinDate ?? data.club_join_date ?? null;
    const dbPayload = {
      name: data.name,
      document: data.document,
      phone: data.phone ?? '',
      email: data.email ?? '',
      status: data.status ?? 'Ativo',
      image: data.image ?? null,
      company_id: (data.companyId || data.company_id) ? (data.companyId || data.company_id) : null,
      is_club_member: data.isClubMember ?? data.is_club_member ?? false,
      club_join_date: rawDate === '' ? null : rawDate,
      total_spent: data.totalSpent ?? data.total_spent ?? 0
    };
    const { error } = await supabase.from('customers').update(dbPayload).eq('id', data.id);
    if (error) {
      console.error('[updateCustomer] Error updating customer:', error);
      throw error;
    }
    await fetchData();
  };

  const deleteCustomer = async (id: string) => {
    await supabase.from('customers').delete().eq('id', id);
    await fetchData();
  };

  const addSale = async (data: any) => {
    // Separate items out of the data object so it doesn't get inserted into public.sales (which lacks an items column)
    const { items, ...rest } = data;

    // Prepare payload by mapping any camelCase variables to their database snake_case counterparts
    const dbPayload = {
      date: rest.date || new Date().toISOString(),
      total: rest.total || 0,
      subtotal: rest.subtotal || 0,
      discount: rest.discount || 0,
      status: rest.status || 'completed',
      payments: rest.payments || [],
      payment_method: rest.paymentMethod || rest.payment_method || 'Dinheiro',
      customer_id: rest.customerId || rest.customer_id || null,
      user_id: rest.userId || rest.user_id || null,
      cash_register_id: rest.cashRegisterId || rest.cash_register_id || activeRegister?.id || null,
      maquininha_id: rest.maquininhaId || rest.maquininha_id || null,
      tax_amount: rest.taxAmount !== undefined ? rest.taxAmount : (rest.tax_amount || 0),
      net_amount: rest.netAmount !== undefined ? rest.netAmount : (rest.net_amount || 0),
      company_id: rest.companyId || rest.company_id || user?.companyId || null,
      store_id: rest.storeId || rest.store_id || null
    };

    const { data: inserted, error } = await supabase.from('sales').insert([dbPayload]).select().single();
    if (error) {
      console.error('DEBUG: Erro ao inserir venda no Supabase:', error);
      return null;
    }

    // Registrar movimentos de estoque para cada item da venda
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await addStockMovement({
          productId: item.productId,
          type: 'VENDA',
          quantity: item.quantity,
          origin: `Venda #${inserted.id || 'Nova'}`,
          date: new Date().toISOString(),
          userId: data.userId || user?.email || 'system',
          userName: user?.name || 'Sistema',
          companyId: data.companyId || user?.companyId || ''
        }, true);
      }

      // Registrar itens da venda na tabela sale_items para preservar preços, descontos e dados promocionais
      const saleItemsToInsert = items.map(item => ({
        sale_id: inserted.id,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price !== undefined ? item.price : 0,
        original_price: item.originalPrice !== undefined ? item.originalPrice : (item.price !== undefined ? item.price : 0),
        discount: item.discount || 0,
        promotion_id: item.promotionId || null,
        company_id: inserted.company_id || null,
        store_id: inserted.store_id || null
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(saleItemsToInsert);
      if (itemsError) {
        console.error('DEBUG: Erro ao inserir itens de venda no sale_items:', itemsError);
      }
    }

    await fetchData();
    if (inserted) {
      return {
        ...inserted,
        paymentMethod: inserted.payment_method ?? inserted.paymentMethod,
        customerId: inserted.customer_id ?? inserted.customerId,
        userId: inserted.user_id ?? inserted.userId,
        cashRegisterId: inserted.cash_register_id ?? inserted.cashRegisterId,
        maquininhaId: inserted.maquininha_id ?? inserted.maquininhaId,
        taxAmount: inserted.tax_amount !== undefined ? inserted.tax_amount : inserted.taxAmount,
        netAmount: inserted.net_amount !== undefined ? inserted.net_amount : inserted.netAmount,
        companyId: inserted.company_id ?? inserted.companyId,
        storeId: inserted.store_id ?? inserted.storeId,
        items
      };
    }
    return null;
  };

  const updateSale = async (data: any) => {
    const { error } = await supabase.from('sales').update(data).eq('id', data.id);
    await fetchData();
    return !error;
  };

  const addReturn = async (data: any) => {
    if (data.saleId) {
      if (returnsInProgress.current.has(data.saleId)) {
        console.warn(`[addReturn] A return is already in progress for saleId ${data.saleId}. Ignoring duplicate request.`);
        return false;
      }
      returnsInProgress.current.add(data.saleId);
    }

    try {
      // Check if a total return already exists for this sale ID to prevent duplicates
      if (data.saleId && data.type === 'TOTAL') {
        const { data: existingReturns } = await supabase
          .from('returns')
          .select('id, type')
          .eq('sale_id', data.saleId)
          .eq('type', 'TOTAL');
        
        if (existingReturns && existingReturns.length > 0) {
          console.warn(`[addReturn] This sale ID ${data.saleId} has already been fully returned.`);
          return false;
        }
      }

      const parentPayload = {
        sale_id: data.saleId,
        date: data.date,
        total: data.total,
        type: data.type,
        refund_method: data.refundMethod,
        user_id: (user?.id && user.id !== 'Sistema') ? user.id : null,
        status: data.status,
        voucher_code: data.voucherCode,
        company_id: user?.companyId || null
      };

      const { data: insertedReturn, error: returnError } = await supabase
        .from('returns')
        .insert([parentPayload])
        .select('id')
        .single();

      if (returnError) {
        console.error('[addReturn] Error inserting parent return:', returnError);
        return false;
      }

      const returnId = insertedReturn?.id;

      if (returnId && data.items && data.items.length > 0) {
        const itemsPayload = data.items.map((item: any) => ({
          return_id: returnId,
          product_id: item.productId,
          quantity: item.quantity,
          price: item.price || 0,
          reason: item.reason || '',
          company_id: user?.companyId || null
        }));

        const { error: itemsError } = await supabase
          .from('return_items')
          .insert(itemsPayload);

        if (itemsError) {
          console.error('[addReturn] Error inserting return items:', itemsError);
          // Clean up parent return to prevent orphans on partial failure
          await supabase.from('returns').delete().eq('id', returnId);
          return false;
        }

        // Add stock movements to revert the sale
        for (const item of data.items) {
          await addStockMovement({
            productId: item.productId,
            type: 'DEVOLUÇÃO',
            quantity: item.quantity,
            origin: `Devolução #${returnId}`,
            date: new Date().toISOString(),
            userId: user?.email || 'Sistema'
          }, true);
        }
      }

      // Se o reembolso for Crédito em Loja e houver um voucherCode gerado, insere o voucher na tabela 'vouchers'
      if (returnId && data.voucherCode && data.refundMethod === 'Crédito em Loja') {
        let customerId = data.customerId || null;
        if (!customerId && data.saleId) {
          try {
            const { data: saleObj } = await supabase
              .from('sales')
              .select('customer_id')
              .eq('id', data.saleId)
              .single();
            if (saleObj) {
              customerId = saleObj.customer_id;
            }
          } catch (err) {
            console.error('[addReturn] Could not query sale customer_id:', err);
          }
        }

        const voucherPayload = {
          code: data.voucherCode,
          initial_value: data.total,
          current_value: data.total,
          customer_id: customerId,
          sale_id: data.saleId || null,
          return_id: returnId,
          status: 'Ativo',
          company_id: user?.companyId || null
        };

        const { error: voucherInsertError } = await supabase
          .from('vouchers')
          .insert([voucherPayload]);

        if (voucherInsertError) {
          console.error('[addReturn] Error inserting voucher:', voucherInsertError);
        } else {
          console.log('[addReturn] Voucher registered in DB as active:', data.voucherCode);
        }
      }

      await fetchData();
      return true;
    } finally {
      if (data.saleId) {
        returnsInProgress.current.delete(data.saleId);
      }
    }
  };

  const updateVoucher = async (data: any) => {
    console.log('[ERPContext] updateVoucher called with:', data);
    const dbPayload = {
      code: data.code,
      customer_id: data.customerId || data.customer_id || null,
      current_value: data.currentValue !== undefined ? data.currentValue : data.current_value,
      initial_value: data.initialValue !== undefined ? data.initialValue : data.initial_value,
      status: data.status,
      company_id: data.company_id || user?.companyId || null
    };
    const { error } = await supabase.from('vouchers').update(dbPayload).eq('id', data.id);
    if (error) {
      console.error('[ERPContext] Error updating voucher:', error);
    } else {
      console.log('[ERPContext] Voucher updated successfully');
    }
    await fetchData();
    return !error;
  };

  const getVoucherByCode = (code: string) => {
    return vouchers.find(v => v.code?.toUpperCase() === code?.toUpperCase() && v.status === 'Ativo');
  };

  const openCashRegister = async (openingBalance: number) => {
    const dbPayload = {
      opening_balance: openingBalance,
      status: 'open',
      opened_at: new Date().toISOString(),
      operator_id: user?.id || null,
      company_id: user?.companyId || null
    };
    const { error } = await supabase.from('cash_registers').insert([dbPayload]);
    await fetchData();
    return !error;
  };

  const closeCashRegister = async (informedTotals: any[], justification: string, explicitRegisterId?: string) => {
    const targetId = explicitRegisterId || activeRegister?.id;
    if (!targetId) return false;

    const { error: registerError } = await supabase.from('cash_registers')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: user?.id || null
      })
      .eq('id', targetId);

    if (registerError) {
      console.error('Error updating register:', registerError);
      return false;
    }

    const totalSystem = informedTotals.reduce((acc, t) => acc + (Number(t.system) || 0), 0);
    const totalInformed = informedTotals.reduce((acc, t) => acc + (Number(t.informed) || 0), 0);
    const totalDifference = totalInformed - totalSystem;

    // Encapsulate both text justification and dynamic payment method totals breakdown in the justification field
    const justificationPayload = JSON.stringify({
      text: justification,
      informedTotals: informedTotals,
      operatorName: user?.name || 'Operador'
    });

    const closingPayload = {
      cash_register_id: targetId,
      total_system: totalSystem,
      total_informed: totalInformed,
      total_difference: totalDifference,
      justification: justificationPayload,
      closed_at: new Date().toISOString(),
      company_id: user?.companyId || null,
      approved_by: user?.id || null
    };

    const { error: closingError } = await supabase.from('cash_closings').insert([closingPayload]);
    if (closingError) {
      console.error('Error creating cash closing:', closingError);
    }

    await fetchData();
    return !registerError && !closingError;
  };

  const addCashMovement = async (movement: any) => {
    const dbPayload = {
      cash_register_id: movement.cashRegisterId,
      type: (movement.type || 'suprimento').toLowerCase(),
      amount: Number(movement.amount) || 0,
      reason: movement.reason,
      created_by: user?.id || null,
      company_id: user?.companyId || null
    };
    const { error } = await supabase.from('cash_movements').insert([dbPayload]);
    await fetchData();
    return !error;
  };

  const deleteSale = async (id: string) => {
    // Find the original sale in state to snapshot it
    const sale = sales?.find(s => s.id === id);
    if (sale) {
      try {
        const logPayload = {
          action: 'cancelamento',
          module: 'vendas',
          entity_id: id,
          user_id: user?.id || null,
          old_data: JSON.stringify(sale),
          reason: 'Venda Cancelada pelo Usuário',
          company_id: user?.companyId || null,
          terminal: 'Terminal Web',
          ip: 'Local'
        };
        await supabase.from('audit_logs').insert([logPayload]);
      } catch (auditErr) {
        console.error('[deleteSale] failed to insert audit log entry:', auditErr);
      }
    }
    // Mark as cancelled instead of deleting
    const { error: cancelError } = await supabase.from('sales').update({ status: 'cancelada' }).eq('id', id);
    if (cancelError) {
      console.error('[deleteSale] failed to cancel sale:', cancelError);
    } else {
      // Reverter estoque dos itens da venda
      const { data: saleItems } = await supabase.from('sale_items').select('*').eq('sale_id', id);
      console.log(`[deleteSale] Reversing sale ${id}, items found:`, saleItems);
      if (saleItems) {
        for (const item of saleItems) {
          console.log(`[deleteSale] Processing item ${item.product_id} with qty ${item.quantity}`);
          // Force a conversion to number just in case
          const qty = Number(item.quantity) || 0;
          console.log(`[deleteSale] Converted qty: ${qty}`);
          await addStockMovement({
            productId: item.product_id,
            type: 'DEVOLUÇÃO',
            quantity: qty,
            origin: `Estorno Venda #${id}`,
            date: new Date().toISOString(),
            userId: user?.email || 'Sistema',
            companyId: user?.companyId
          }, true);
        }
      }
    }
    await fetchData();
  };

  const addDiscountLog = async (data: any) => {
    await supabase.from('discount_logs').insert([data]);
    await fetchData();
  };

  const addLoss = async (data: any) => {
    const { error: lossError } = await supabase.from('losses').insert([{
      product_id: data.productId,
      lote_id: data.loteId,
      quantity: data.quantity,
      reason: data.reason,
      date: data.date,
      total_value: data.totalValue,
      company_id: user?.companyId
    }]);
    if (lossError) {
      console.error('Error inserting loss:', lossError);
      return;
    }
    
    await addStockMovement({
      productId: data.productId,
      loteId: data.loteId,
      type: 'PERDA',
      quantity: data.quantity,
      origin: `Perda: ${data.reason}`,
      date: data.date,
      userId: user?.name || 'Sistema',
      companyId: user?.companyId
    }, true);

    await fetchData();
  };

  const addPromotion = async (data: any) => {
    const dbPromo: any = {
      id: data.id,
      name: data.name,
      type: data.type,
      status: data.status,
      start_date: data.startDate,
      end_date: data.endDate,
      target_type: data.targetType,
      target_id: data.targetId,
      product_prices: data.productPrices || {},
      discount_value: data.discountValue,
      buy_quantity: data.buyQuantity,
      pay_quantity: data.payQuantity,
      combo_items: data.comboItems,
      combo_price: data.comboPrice,
      apply_automatically: data.applyAutomatically ?? true,
      only_for_club_members: data.onlyForClubMembers ?? false,
      limit_per_customer: data.limitPerCustomer,
      quantity_limit: data.quantityLimit,
      days_of_week: data.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
      company_id: data.companyId || data.company_id || user?.companyId
    };
    Object.keys(dbPromo).forEach(key => {
      if (dbPromo[key] === undefined) delete dbPromo[key];
    });
    await supabase.from('promotions').insert([dbPromo]);
    await fetchData();
  };
  const updatePromotion = async (data: any) => {
    const dbPromo: any = {
      name: data.name,
      type: data.type,
      status: data.status,
      start_date: data.startDate,
      end_date: data.endDate,
      target_type: data.targetType,
      target_id: data.targetId,
      product_prices: data.productPrices || {},
      discount_value: data.discountValue,
      buy_quantity: data.buyQuantity,
      pay_quantity: data.payQuantity,
      combo_items: data.comboItems,
      combo_price: data.comboPrice,
      apply_automatically: data.applyAutomatically ?? true,
      only_for_club_members: data.onlyForClubMembers ?? false,
      limit_per_customer: data.limitPerCustomer,
      quantity_limit: data.quantityLimit,
      days_of_week: data.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
      company_id: data.companyId || data.company_id || user?.companyId
    };
    Object.keys(dbPromo).forEach(key => {
      if (dbPromo[key] === undefined) delete dbPromo[key];
    });
    await supabase.from('promotions').update(dbPromo).eq('id', data.id);
    await fetchData();
  };
  const deletePromotion = async (id: string) => {
    await supabase.from('promotions').delete().eq('id', id);
    await fetchData();
  };

  // Employees
  const addEmployee = async (data: any) => {
    const dbPayload = {
      full_name: data.fullName || data.full_name,
      cpf: data.cpf,
      phone: data.phone,
      role: data.role,
      admission_date: data.admissionDate || data.admission_date,
      salary: data.salary,
      status: data.status,
      company_id: data.companyId || data.company_id || user?.companyId
    };
    await supabase.from('employees').insert([dbPayload]);
    await fetchData();
  };

  const updateEmployee = async (data: any) => {
    const dbPayload = {
      full_name: data.fullName || data.full_name,
      cpf: data.cpf,
      phone: data.phone,
      role: data.role,
      admission_date: data.admissionDate || data.admission_date,
      salary: data.salary,
      status: data.status,
      company_id: data.companyId || data.company_id
    };
    Object.keys(dbPayload).forEach(key => {
      if ((dbPayload as any)[key] === undefined) {
        delete (dbPayload as any)[key];
      }
    });
    await supabase.from('employees').update(dbPayload).eq('id', data.id);
    await fetchData();
  };

  const deleteEmployee = async (id: string) => {
    await supabase.from('employees').delete().eq('id', id);
    await fetchData();
  };

  // Stock
  const addStockMovement = async (data: any, skipFetch?: boolean) => {
    console.log('[ERPContext] addStockMovement received:', data);
    const dbPayload = {
      product_id: data.productId || data.product_id,
      type: data.type,
      quantity: Number(data.quantity) || 0,
      origin: data.origin,
      date: data.date || new Date().toISOString(),
      user_id: data.userId || data.user_id,
      user_name: data.userName || data.user_name,
      company_id: data.companyId || data.company_id,
      cost: Number(data.cost) || null,
      lote_id: data.loteId || data.lote_id
    };

    // 1. Inserir o movimento no histórico
    const { error: moveError } = await supabase.from('stock_movements').insert([dbPayload]);
    if (moveError) {
      console.error('Erro ao inserir movimento de estoque:', moveError);
      return;
    }

    const productId = dbPayload.product_id;
    // 2. Atualizar o saldo de estoque no produto
    const { data: product, error: prodError } = await supabase.from('products').select('*').eq('id', productId).single();
    if (prodError) {
      console.error('Erro ao buscar produto para atualizar estoque:', prodError);
    } else {
      let modifier = 1;
      const typeStr = (data.type || '').toString().toUpperCase();
      // Tipos que subtraem do estoque (se a quantidade for enviada positiva)
      if (['SAIDA', 'SAÍDA', 'VENDA', 'PERDA'].includes(typeStr)) {
        modifier = -1;
      }
      
      const currentStock = Number(product?.stock) || 0;
      const moveQty = Number(data.quantity) || 0;
      const newStock = currentStock + (moveQty * modifier);
      
      console.log(`[ERPContext] Updating stock for product ${productId}: ${currentStock} + (${moveQty} * ${modifier}) = ${newStock}`);
      
      const { error: updateError } = await supabase.from('products').update({ stock: newStock }).eq('id', productId);
      if (updateError) {
        console.error('Erro ao atualizar saldo de estoque do produto:', updateError);
        throw updateError; // Force visibility
      }

      // --- ATUALIZAÇÃO REAIS DE LOTES E PEPS (FIFO) ---
      try {
        const targetLoteId = dbPayload.lote_id;
        
        if (modifier === -1) {
          // Movimento de saída (VENDA, SAIDA, PERDA)
          if (targetLoteId) {
            // Decrementar saldo do lote específico selecionado
            const { data: specificLote, error: sLoteErr } = await supabase
              .from('produto_lotes')
              .select('*')
              .eq('id', targetLoteId)
              .single();
            
            if (!sLoteErr && specificLote) {
              const currentLoteSaldo = Number(specificLote.saldo_atual ?? specificLote.saldoAtual ?? 0);
              const newLoteSaldo = Math.max(0, currentLoteSaldo - moveQty);
              console.log(`[PEPS] Decrementando lote específico ${targetLoteId}: ${currentLoteSaldo} -> ${newLoteSaldo}`);
              await supabase
                .from('produto_lotes')
                .update({ saldo_atual: newLoteSaldo, saldoAtual: newLoteSaldo })
                .eq('id', targetLoteId);
            }
          } else {
            // Se nenhum lote específico foi definido, segue fila PEPS (automática por data de entrada)
            const { data: activeLotes, error: actLotesErr } = await supabase
              .from('produto_lotes')
              .select('*')
              .eq('produto_id', productId)
              .gt('saldo_atual', 0)
              .order('data_entrada', { ascending: true });
            
            if (!actLotesErr && activeLotes && activeLotes.length > 0) {
              let remainingToDeduct = moveQty;
              console.log(`[PEPS] Iniciando dedução automática PEPS para o produto ${productId}. Total: ${remainingToDeduct}`);
              
              for (const lote of activeLotes) {
                if (remainingToDeduct <= 0) break;
                const loteSaldo = Number(lote.saldo_atual ?? lote.saldoAtual ?? 0);
                if (loteSaldo <= 0) continue;
                
                const deduction = Math.min(loteSaldo, remainingToDeduct);
                const newLoteSaldo = Number((loteSaldo - deduction).toFixed(4));
                remainingToDeduct = Number((remainingToDeduct - deduction).toFixed(4));
                
                console.log(`[PEPS] Deduzindo Lote ${lote.numero_lote || lote.numeroLote || lote.id}: ${loteSaldo} - ${deduction} = ${newLoteSaldo}. Restante: ${remainingToDeduct}`);
                await supabase
                  .from('produto_lotes')
                  .update({ saldo_atual: newLoteSaldo, saldoAtual: newLoteSaldo })
                  .eq('id', lote.id);
              }
            }
          }
        } else if (modifier === 1 && targetLoteId) {
          // Movimento de entrada em lote específico (EX: Estorno/Devolução ou Entrada Manual de lote existente)
          const { data: specificLote, error: sLoteErr } = await supabase
            .from('produto_lotes')
            .select('*')
            .eq('id', targetLoteId)
            .single();
          
          if (!sLoteErr && specificLote) {
            const currentLoteSaldo = Number(specificLote.saldo_atual ?? specificLote.saldoAtual ?? 0);
            const newLoteSaldo = Number((currentLoteSaldo + moveQty).toFixed(4));
            console.log(`[PEPS] Incrementando lote específico ${targetLoteId}: ${currentLoteSaldo} -> ${newLoteSaldo}`);
            await supabase
              .from('produto_lotes')
              .update({ saldo_atual: newLoteSaldo, saldoAtual: newLoteSaldo })
              .eq('id', targetLoteId);
          }
        }
      } catch (pepsErr) {
        console.error('[PEPS] Erro no fluxo automático de atualização de lotes PEPS:', pepsErr);
      }

      // Se o produto for do tipo SALE (venda) com base_product_id e conversion_factor, atualizar o produto base (estoque real)
      if (product?.product_type === 'SALE' && product?.base_product_id) {
        const { data: baseProduct, error: baseError } = await supabase.from('products').select('*').eq('id', product.base_product_id).single();
        if (baseError) {
          console.error('[addStockMovement] Erro ao buscar produto base:', baseError);
        } else if (baseProduct) {
          const convFactor = Number(product.conversion_factor) || 1;
          const baseQty = Number((moveQty / convFactor).toFixed(4));
          console.log(`[DEBUG_STOCK] Produto virtual ${product.name} detectado. Base product: ${baseProduct.name}, baseQty calculada: ${baseQty}`);
          
          await addStockMovement({
            productId: product.base_product_id,
            type: data.type,
            quantity: baseQty,
            origin: `${data.origin || 'Venda'} (via Produto Virtual: ${product.name})`,
            date: dbPayload.date,
            userId: dbPayload.user_id,
            userName: dbPayload.user_name,
            companyId: dbPayload.company_id,
            cost: baseProduct.cost_price || baseProduct.costPrice || null,
            loteId: dbPayload.lote_id
          }, true);
        }
      }

      // Se o produto for um KIT, registrar movimentação recursiva de estoque e desconto dos componentes
      let parsedComposition = product?.composition;
      console.log(`[DEBUG_STOCK] Product ${product?.name} type ${product?.product_type} comp:`, parsedComposition);
      if (parsedComposition && typeof parsedComposition === 'string') {
        try {
          parsedComposition = JSON.parse(parsedComposition);
        } catch (e) {
          console.error('[addStockMovement] Error parsing composition:', e);
          parsedComposition = null;
        }
      }

      if (product?.product_type === 'KIT' && parsedComposition && Array.isArray(parsedComposition)) {
        console.log(`[DEBUG_STOCK] Recursively updating ${parsedComposition.length} components`);
        for (const comp of parsedComposition) {
          const compQty = (Number(comp.quantity) || 0) * moveQty;
          console.log(`[DEBUG_STOCK] Updating component ${comp.productId} qty ${compQty}`);
          
          await addStockMovement({
            productId: comp.productId,
            type: data.type,
            quantity: compQty,
            origin: `${data.origin || 'Venda'} (via ${product.product_type === 'KIT' ? 'Kit' : 'Produto Virtual'}: ${product.name})`,
            date: dbPayload.date,
            userId: dbPayload.user_id,
            userName: dbPayload.user_name,
            companyId: dbPayload.company_id,
            cost: comp.price || null,
            loteId: dbPayload.lote_id
          }, true);
        }
      }
    }

    if (!skipFetch) {
      await fetchData();
    }
  };

  const addInventory = async (data: any, skipFetch?: boolean) => {
    const dbPayload = {
      date: data.date || new Date().toISOString(),
      location: data.location,
      items_counted: Number(data.itemsCounted || data.items_counted) || 0,
      divergence_value: Number(data.divergenceValue || data.divergence_value) || 0,
      status: data.status,
      type: data.type,
      responsible: data.responsible,
      notes: data.notes
    };
    await supabase.from('inventories').insert([dbPayload]);
    if (!skipFetch) {
      await fetchData();
    }
  };

  const deleteInventory = async (id: string) => {
    await supabase.from('inventories').delete().eq('id', id);
    await fetchData();
  };

  // Expenses
  const addExpense = async (data: any) => {
    const clean = (val: any) => {
      if (val === undefined || val === null || val === '') return null;
      return val;
    };

    const dbPayload = {
      id: typeof data.id === 'string' && data.id.trim() !== '' ? data.id.trim() : undefined,
      description: data.description,
      category: data.category,
      amount: Number(data.amount) || 0,
      date: clean(data.date ?? data.issueDate ?? data.issue_date ?? null),
      status: data.status,
      supplier: data.supplier,
      issue_date: clean(data.issueDate ?? data.issue_date ?? null),
      due_date: clean(data.dueDate ?? data.due_date ?? null),
      payment_date: clean(data.paymentDate ?? data.payment_date ?? null),
      payment_method: clean(data.paymentMethod ?? data.payment_method ?? null),
      financial_account: clean(data.financialAccount ?? data.financial_account ?? null),
      observation: data.observation,
      is_recurring: data.isRecurring ?? data.is_recurring ?? false,
      frequency: data.frequency,
      supplier_id: clean(data.supplierId ?? data.supplier_id ?? null),
      company_id: clean(data.companyId ?? data.company_id ?? user?.companyId ?? null),
      origin: data.origin,
      type: data.type,
      interest: Number(data.interest) || 0,
      discount: Number(data.discount) || 0,
      payment_type: clean(data.paymentType ?? data.payment_type ?? null),
      store_id: clean(data.storeId ?? data.store_id ?? null)
    };

    const sanitized: any = {};
    Object.entries(dbPayload).forEach(([key, val]) => {
      if (val !== undefined) sanitized[key] = val;
    });

    const { error } = await supabase.from('expenses').insert([sanitized]);
    if (error) {
      console.error('[addExpense] Error inserting expense:', error);
      throw error;
    }
    await fetchData();
  };

  const updateExpense = async (data: any) => {
    const clean = (val: any) => {
      if (val === undefined || val === null || val === '') return null;
      return val;
    };

    const dbPayload = {
      description: data.description,
      category: data.category,
      amount: Number(data.amount) || 0,
      date: clean(data.date ?? data.issueDate ?? data.issue_date ?? null),
      status: data.status,
      supplier: data.supplier,
      issue_date: clean(data.issueDate ?? data.issue_date ?? null),
      due_date: clean(data.dueDate ?? data.due_date ?? null),
      payment_date: clean(data.paymentDate ?? data.payment_date ?? null),
      payment_method: clean(data.paymentMethod ?? data.payment_method ?? null),
      financial_account: clean(data.financialAccount ?? data.financial_account ?? null),
      observation: data.observation,
      is_recurring: data.isRecurring ?? data.is_recurring ?? false,
      frequency: data.frequency,
      supplier_id: clean(data.supplierId ?? data.supplier_id ?? null),
      company_id: clean(data.companyId ?? data.company_id ?? user?.companyId ?? null),
      origin: data.origin,
      type: data.type,
      interest: Number(data.interest) || 0,
      discount: Number(data.discount) || 0,
      payment_type: clean(data.paymentType ?? data.payment_type ?? null),
      store_id: clean(data.storeId ?? data.store_id ?? null)
    };

    const sanitized: any = {};
    Object.entries(dbPayload).forEach(([key, val]) => {
      if (val !== undefined) sanitized[key] = val;
    });

    const { error } = await supabase.from('expenses').update(sanitized).eq('id', data.id);
    if (error) {
      console.error('[updateExpense] Error updating expense:', error);
      throw error;
    }
    await fetchData();
  };

  const deleteExpense = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id);
    await fetchData();
  };

  const addExpenseCategory = async (data: any) => {
    await supabase.from('expense_categories').insert([data]);
    await fetchData();
  };

  // Categories & Departments
  const addCategoria = async (data: any) => {
    await supabase.from('categorias').insert([data]);
    await fetchData();
  };
  const updateCategoria = async (data: any) => {
    await supabase.from('categorias').update(data).eq('id', data.id);
    await fetchData();
  };
  const deleteCategoria = async (id: string) => {
    await supabase.from('categorias').delete().eq('id', id);
    await fetchData();
  };

  const addSubcategoria = async (data: any) => {
    await supabase.from('subcategorias').insert([data]);
    await fetchData();
  };
  const updateSubcategoria = async (data: any) => {
    await supabase.from('subcategorias').update(data).eq('id', data.id);
    await fetchData();
  };
  const deleteSubcategoria = async (id: string) => {
    await supabase.from('subcategorias').delete().eq('id', id);
    await fetchData();
  };

  const addDepartamento = async (data: any) => {
    await supabase.from('departamentos').insert([data]);
    await fetchData();
  };
  const updateDepartamento = async (data: any) => {
    await supabase.from('departamentos').update(data).eq('id', data.id);
    await fetchData();
  };
  const deleteDepartamento = async (id: string) => {
    await supabase.from('departamentos').delete().eq('id', id);
    await fetchData();
  };

  const seedMercadologicalTree = async () => {
    console.log('Seeding mercadological tree...');
  };

  const seedExpenseCategories = async () => {
    console.log('Seeding expense categories...');
  };

  const derivedUser = useMemo(() => {
    if (!user) return null;
    
    // Find in systemUsers
    const dbUser = systemUsers.find(
      u => u.id === user.id || u.email?.toLowerCase() === user.email?.toLowerCase()
    );
    
    if (dbUser) {
      const profileId = dbUser.profileId || dbUser.profile_id;
      if (profileId) {
        const profile = accessProfiles.find(p => p.id === profileId);
        if (profile?.name) {
          return {
            ...user,
            role: profile.name,
            userNumber: dbUser.userNumber
          };
        }
      }
    }
    
    return user;
  }, [user, systemUsers, accessProfiles]);

  const hasPermission = (module: string, action: string) => {
    // 1. If no user is logged in, no permissions
    if (!derivedUser) return false;

    // 2. Super admin gets all permissions
    const isSuperAdmin = derivedUser.email?.toLowerCase() === 'willmanssilva4@gmail.com';
    if (isSuperAdmin) return true;

    // 3. Find the user record in system_users
    const dbUser = systemUsers.find(
      u => u.id === derivedUser.id || u.email?.toLowerCase() === derivedUser.email?.toLowerCase()
    );

    if (!dbUser) {
      // Fallback to role-based check if not found in system_users
      return derivedUser.role?.toLowerCase() === 'admin' || derivedUser.role?.toLowerCase() === 'administrador';
    }

    // 4. If user is inactive, deny all permissions
    if (dbUser.status === 'Inativo') return false;

    // 5. Find their access profile
    const profileId = dbUser.profileId || dbUser.profile_id;
    if (!profileId) {
      return derivedUser.role?.toLowerCase() === 'admin' || derivedUser.role?.toLowerCase() === 'administrador';
    }

    const profile = accessProfiles.find(p => p.id === profileId);
    
    // 6. If the profile name is 'Administrador' (case-insensitive), grant full access
    const isProfileAdmin = profile?.name?.toLowerCase() === 'administrador';
    if (isProfileAdmin) {
      return true;
    }

    // 7. Look up the specific permission record for this profile and module
    const perm = permissions.find(
      p => (p.profileId === profileId || p.profile_id === profileId) &&
           p.module?.toLowerCase() === module?.toLowerCase()
    );

    if (!perm) {
      // If no permission record exists yet, default to false (or true for Gerente if needed)
      const isProfileGerente = profile?.name?.toLowerCase() === 'gerente';
      if (isProfileGerente) {
        return action === 'view' || action === 'create' || action === 'edit';
      }
      return false;
    }

    // 8. Return the action's corresponding boolean value
    if (action === 'view') return !!(perm.canView || perm.can_view);
    if (action === 'create') return !!(perm.canCreate || perm.can_create);
    if (action === 'edit') return !!(perm.canEdit || perm.can_edit);
    if (action === 'delete') return !!(perm.canDelete || perm.can_delete);

    return false;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  const updateCompanySettings = async (data: any) => {
    const payload = {
      ...(systemSettings || {}),
      ...data,
      id: data.id || systemSettings?.id || user?.companyId || 'd3b07384-d113-4c9b-a010-86d11f26487e',
      company_id: data.company_id || data.companyId || systemSettings?.company_id || systemSettings?.companyId || user?.companyId || null
    };
    
    // Always update state immediately so the UI reflects changes instantly
    setSystemSettings(payload);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('systemSettings', JSON.stringify(payload));
      } catch (e) {
        console.error('[ERPProvider] Error saving systemSettings to localStorage:', e);
      }
    }

    try {
      const { error } = await supabase.from('system_settings').upsert([payload]);
      if (error) {
        console.warn('[updateCompanySettings] Supabase upsert failed, relying on local state/storage:', error.message);
      }
    } catch (e) {
      console.warn('[updateCompanySettings] Supabase exception, relying on local state/storage:', e);
    }
    
    await fetchData();
  };

  const updateSystemSettings = async (data: any) => {
    const payload = {
      ...(systemSettings || {}),
      ...data,
      id: data.id || systemSettings?.id || user?.companyId || 'd3b07384-d113-4c9b-a010-86d11f26487e',
      company_id: data.company_id || data.companyId || systemSettings?.company_id || systemSettings?.companyId || user?.companyId || null
    };

    // Always update state immediately so the UI reflects changes instantly
    setSystemSettings(payload);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('systemSettings', JSON.stringify(payload));
      } catch (e) {
        console.error('[ERPProvider] Error saving systemSettings to localStorage:', e);
      }
    }

    try {
      const { error } = await supabase.from('system_settings').upsert([payload]);
      if (error) {
        console.warn('[updateSystemSettings] Supabase upsert failed, relying on local state/storage:', error.message);
      }
    } catch (e) {
      console.warn('[updateSystemSettings] Supabase exception, relying on local state/storage:', e);
    }

    await fetchData();
  };

  const updatePricingSettings = async (data: any) => {
    setPricingSettings(data);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pricingSettings', JSON.stringify(data));
    }
  };

  const changePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const addSystemUser = async (data: any, password?: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          password: password || '123456',
          companyId: data.companyId || data.company_id || user?.companyId || null
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create user');
      }
    } catch (apiErr: any) {
      console.warn('API signup failed, falling back to direct db insert:', apiErr);
      const dbPayload = {
        username: data.username,
        email: data.email,
        employee_id: data.employeeId || data.employee_id || null,
        profile_id: data.profileId || data.profile_id || null,
        store_id: data.storeId || data.store_id || 'Todas as Lojas',
        status: data.status || 'Ativo',
        supervisor_code: data.supervisorCode !== undefined ? data.supervisorCode : (data.supervisor_code !== undefined ? data.supervisor_code : null),
        user_number: data.userNumber || null,
        company_id: data.companyId || data.company_id || user?.companyId || null
      };
      await supabase.from('system_users').insert([dbPayload]);
    }
    await fetchData();
  };

  const updateSystemUser = async (data: any, password?: string) => {
    try {
      const response = await fetch(`/api/admin/users/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          password
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update user');
      }
    } catch (apiErr: any) {
      console.warn('API update failed, falling back to direct db update:', apiErr);
      const dbPayload = {
        username: data.username,
        email: data.email,
        employee_id: data.employeeId || data.employee_id,
        profile_id: data.profileId || data.profile_id,
        store_id: data.storeId || data.store_id,
        status: data.status || 'Ativo',
        supervisor_code: data.supervisorCode !== undefined ? data.supervisorCode : data.supervisor_code,
        company_id: data.companyId || data.company_id
      };
      Object.keys(dbPayload).forEach(key => {
        if ((dbPayload as any)[key] === undefined) {
          delete (dbPayload as any)[key];
        }
      });
      await supabase.from('system_users').update(dbPayload).eq('id', data.id);
    }
    await fetchData();
  };

  const deleteSystemUser = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete user');
      }
    } catch (apiErr: any) {
      console.warn('API delete failed, falling back to direct db delete:', apiErr);
      await supabase.from('system_users').delete().eq('id', id);
    }
    await fetchData();
  };

  const addAccessProfile = async (data: any) => {
    await supabase.from('access_profiles').insert([data]);
    await fetchData();
  };

  const updateAccessProfile = async (data: any) => {
    await supabase.from('access_profiles').update(data).eq('id', data.id);
    await fetchData();
  };

  const deleteAccessProfile = async (id: string) => {
    await supabase.from('access_profiles').delete().eq('id', id);
    await fetchData();
  };

  const addMaquininha = async (data: any) => {
    await supabase.from('maquininhas').insert([data]);
    await fetchData();
  };

  const updateMaquininha = async (data: Maquininha) => {
    await supabase.from('maquininhas').update(data).eq('id', data.id);
    await fetchData();
  };

  const deleteMaquininha = async (id: string) => {
    await supabase.from('maquininhas').delete().eq('id', id);
    await fetchData();
  };

  const addAdvertisement = async (data: any) => {
    const newAd = {
      id: data.id || crypto.randomUUID(),
      titulo: data.titulo,
      descricao: data.descricao || '',
      imagem_url: data.imagem_url,
      ativo: data.ativo ?? true,
      company_id: user?.companyId || null,
      created_at: new Date().toISOString()
    };

    // 1. Try saving to Supabase (catch errors gracefully)
    try {
      const { error } = await supabase.from('advertisements').insert([newAd]);
      if (error) {
        console.warn('[addAdvertisement] Supabase insert failed, relying on local storage:', error.message);
      }
    } catch (e) {
      console.warn('[addAdvertisement] Supabase exception, relying on local storage:', e);
    }

    // 2. Always update local storage and state so it works immediately
    if (typeof window !== 'undefined') {
      const currentAds = [...advertisements, newAd];
      setAdvertisements(currentAds);
      localStorage.setItem('advertisements', JSON.stringify(currentAds));
    } else {
      await fetchData();
    }
  };

  const updateAdvertisement = async (data: any) => {
    const updatedAd = {
      ...data,
      company_id: data.company_id || user?.companyId || null
    };

    // 1. Try saving to Supabase (catch errors gracefully)
    try {
      const { error } = await supabase.from('advertisements').update(updatedAd).eq('id', data.id);
      if (error) {
        console.warn('[updateAdvertisement] Supabase update failed, relying on local storage:', error.message);
      }
    } catch (e) {
      console.warn('[updateAdvertisement] Supabase exception, relying on local storage:', e);
    }

    // 2. Always update local storage and state so it works immediately
    if (typeof window !== 'undefined') {
      const currentAds = advertisements.map(ad => ad.id === data.id ? updatedAd : ad);
      setAdvertisements(currentAds);
      localStorage.setItem('advertisements', JSON.stringify(currentAds));
    } else {
      await fetchData();
    }
  };

  const deleteAdvertisement = async (id: string) => {
    // 1. Try saving to Supabase (catch errors gracefully)
    try {
      const { error } = await supabase.from('advertisements').delete().eq('id', id);
      if (error) {
        console.warn('[deleteAdvertisement] Supabase delete failed, relying on local storage:', error.message);
      }
    } catch (e) {
      console.warn('[deleteAdvertisement] Supabase exception, relying on local storage:', e);
    }

    // 2. Always update local storage and state so it works immediately
    if (typeof window !== 'undefined') {
      const currentAds = advertisements.filter(ad => ad.id !== id);
      setAdvertisements(currentAds);
      localStorage.setItem('advertisements', JSON.stringify(currentAds));
    } else {
      await fetchData();
    }
  };

  const addPaymentMethod = async (data: any) => {
    const dbPayload = {
      name: data.name,
      type: data.type,
      active: data.active,
      tax_percentage: data.taxPercentage ?? 0,
      tax_value: data.taxFixed ?? 0,
      company_id: (data.companyId || data.company_id) ? (data.companyId || data.company_id) : null
    };
    const { error } = await supabase.from('payment_methods').insert([dbPayload]);
    if (error) {
      console.error('[addPaymentMethod] Error inserting:', error);
      return false;
    }
    await fetchData();
    return true;
  };

  const updatePaymentMethod = async (data: PaymentMethod) => {
    const dbPayload = {
      name: data.name,
      type: data.type,
      active: data.active,
      tax_percentage: data.taxPercentage ?? 0,
      tax_value: data.taxFixed ?? 0,
    };
    const { error } = await supabase.from('payment_methods').update(dbPayload).eq('id', data.id);
    if (error) {
      console.error('[updatePaymentMethod] Error updating:', error);
      return false;
    }
    await fetchData();
    return true;
  };

  const deletePaymentMethod = async (id: string) => {
    await supabase.from('payment_methods').delete().eq('id', id);
    await fetchData();
  };

  const updatePermissions = async (profileId: string, permissions: any[]) => {
    // Map permissions back to snake_case schema to match Database table
    const payload = permissions.map(p => {
      const obj: any = {
        profile_id: profileId,
        module: p.module,
        can_view: p.canView !== undefined ? p.canView : (p.can_view !== undefined ? p.can_view : false),
        can_create: p.canCreate !== undefined ? p.canCreate : (p.can_create !== undefined ? p.can_create : false),
        can_edit: p.canEdit !== undefined ? p.canEdit : (p.can_edit !== undefined ? p.can_edit : false),
        can_delete: p.canDelete !== undefined ? p.canDelete : (p.can_delete !== undefined ? p.can_delete : false),
        company_id: p.company_id || p.companyId || user?.companyId || null
      };
      if (p.id) {
        obj.id = p.id;
      }
      return obj;
    });
    const { error } = await supabase.from('permissions').upsert(payload, { onConflict: 'profile_id,module' });
    if (error) {
      console.error('Error upserting permissions:', error.message);
    }
    await fetchData();
  };

  const sendEmailNotification = async (to: string, subject: string, text: string, html: string, from?: string) => {
    return { success: true };
  };

  return (
    <ERPContext.Provider value={{
      user: derivedUser, isAuthReady, isLoading, systemUsersError, products, suppliers, customers, sales, expenses, lotes,
      stockMovements, inventories, systemSettings, pricingSettings,
      categorias, subcategorias, departamentos, paymentMethods, systemUsers, promotions, returns, employees, accessProfiles, permissions, maquininhas,
      expenseCategories, losses, discountLogs, auditLogs, vouchers, cashRegisters, cashMovements, cashClosings, advertisements, customAlert,
      companySettings: systemSettings, activeRegister,
      fetchData, addProduct, updateProduct, deleteProduct,
      addSystemUser, updateSystemUser, deleteSystemUser,
      addAccessProfile, updateAccessProfile, deleteAccessProfile,
      addMaquininha, updateMaquininha, deleteMaquininha,
      addAdvertisement, updateAdvertisement, deleteAdvertisement,
      addPaymentMethod, updatePaymentMethod, deletePaymentMethod,
      updatePermissions,
      updateCompanySettings, updateSystemSettings, updatePricingSettings, changePassword,
      addSupplier, updateSupplier, deleteSupplier,
      addCustomer, updateCustomer, deleteCustomer,
      addSale, updateSale, deleteSale, addReturn, updateVoucher, getVoucherByCode, openCashRegister, closeCashRegister, addCashMovement, addDiscountLog,
      addEmployee, updateEmployee, deleteEmployee,
      addStockMovement, addInventory, deleteInventory,
      addExpense, updateExpense, deleteExpense, addExpenseCategory, addCategoria, updateCategoria, deleteCategoria,
      addSubcategoria, updateSubcategoria, deleteSubcategoria,
      addDepartamento, updateDepartamento, deleteDepartamento,
      addPromotion, updatePromotion, deletePromotion,
      seedMercadologicalTree, seedExpenseCategories,
      setCustomAlert, hasPermission, login, logout, sendEmailNotification,
      addLoss
    }}>
      {children}
    </ERPContext.Provider>
  );
}

export function useERP() {
  const context = useContext(ERPContext);
  if (context === undefined) {
    throw new Error('useERP must be used within an ERPProvider');
  }
  return context;
}
