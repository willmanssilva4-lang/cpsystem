'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
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

interface ERPContextType {
  user: User | null;
  isAuthReady: boolean;
  isLoading: boolean;
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
  addProduct: (data: Partial<Product>) => Promise<boolean>;
  updateProduct: (data: Product) => Promise<boolean>;
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
  closeCashRegister: (informedTotals: any[], justification: string) => Promise<boolean>;
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
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
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
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [customAlert, setCustomAlert] = useState<any>(null);

  const activeRegister = useMemo(() => {
    return cashRegisters.find(r => r.status === 'open');
  }, [cashRegisters]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const fetchAllProducts = async () => {
        let allProducts: Product[] = [];
        let rangeStart = 0;
        const rangeSize = 1000;
        while (true) {
          const { data, error } = await supabase.from('products').select('*').order('id').range(rangeStart, rangeStart + rangeSize - 1);
          if (error || !data || data.length === 0) break;
          allProducts = [...allProducts, ...data];
          if (data.length < rangeSize) break;
          rangeStart += rangeSize;
        }
        return allProducts;
      };

      const [
        prods,
        supps_res,
        depts_res,
        cats_res,
        subs_res,
        movs_res,
        invs_res,
        maqs_res,
        pays_res,
        ads_res,
        custs_res,
        sls_res,
        exps_res,
        lts_res,
        sysSet,
        sysUsrs_res,
        proms_res,
        rets_res,
        emps_res,
        profs_res,
        perms_res,
        expCats_res,
        ls_res,
        dLogs_res,
        audLogs_res,
        vchs_res,
        cRegs_res,
        cMovs_res,
        cClos_res
      ] = await Promise.all([
        fetchAllProducts(),
        supabase.from('suppliers').select('*'),
        supabase.from('departamentos').select('*'),
        supabase.from('categorias').select('*'),
        supabase.from('subcategorias').select('*'),
        supabase.from('stock_movements').select('*'),
        supabase.from('inventories').select('*'),
        supabase.from('maquininhas').select('*'),
        supabase.from('payment_methods').select('*'),
        supabase.from('advertisements').select('*'),
        supabase.from('customers').select('*').order('name'),
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*'),
        supabase.from('lotes').select('*'),
        supabase.from('system_settings').select('*').single(),
        supabase.from('system_users').select('*'),
        supabase.from('promotions').select('*'),
        supabase.from('returns').select('*'),
        supabase.from('employees').select('*'),
        supabase.from('access_profiles').select('*'),
        supabase.from('permissions').select('*'),
        supabase.from('expense_categories').select('*'),
        supabase.from('losses').select('*'),
        supabase.from('discount_logs').select('*'),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }),
        supabase.from('vouchers').select('*').order('created_at', { ascending: false }),
        supabase.from('cash_registers').select('*'),
        supabase.from('cash_movements').select('*'),
        supabase.from('cash_closings').select('*')
      ]);

      if (prods) {
        setProducts(prods.map((p: any) => ({
          ...p,
          costPrice: p.costPrice ?? p.cost_price,
          salePrice: p.salePrice ?? p.sale_price,
          wholesalePrice: p.wholesalePrice ?? p.wholesale_price,
          wholesaleMinQty: p.wholesaleMinQty ?? p.wholesale_min_qty,
          clubPrice: p.clubPrice ?? p.club_price,
          termPrice: p.termPrice ?? p.term_price,
          minStock: p.minStock ?? p.min_stock,
          controlStock: p.controlStock ?? p.control_stock,
          profit: p.profit,
          profitPercentage: p.profitPercentage
        })));
      }
      if (supps_res.data) setSuppliers(supps_res.data);
      if (depts_res.data) setDepartamentos(depts_res.data);
      if (cats_res.data) setCategorias(cats_res.data);
      if (subs_res.data) setSubcategorias(subs_res.data);
      if (movs_res.data) {
        setStockMovements(movs_res.data.map((m: any) => ({
          ...m,
          productId: m.productId ?? m.product_id ?? '',
          userId: m.userId ?? m.user_id ?? '',
          userName: m.userName ?? m.user_name ?? '',
          companyId: m.companyId ?? m.company_id ?? '',
          quantity: Number(m.quantity) || 0
        })));
      }
      if (invs_res.data) {
        setInventories(invs_res.data.map((i: any) => ({
          ...i,
          itemsCounted: i.itemsCounted ?? i.items_counted ?? 0,
          divergenceValue: i.divergenceValue ?? i.divergence_value ?? 0
        })));
      }
      if (maqs_res.data) setMaquininhas(maqs_res.data);
      if (pays_res.data) setPaymentMethods(pays_res.data);
      if (ads_res.data) setAdvertisements(ads_res.data);
      if (custs_res.data) setCustomers(custs_res.data);
      if (sls_res.data) {
        const movements = movs_res.data || [];
        const loadedProducts = prods || [];
        const mappedSales = sls_res.data.map((sale: any) => {
          const saleMovements = movements.filter((m: any) => 
            m.type === 'VENDA' && 
            (m.origin === `Venda #${sale.id}` || m.origin === `Venda #${sale.id?.substring(0, 8)}`)
          );
          
          const items = saleMovements.map((move: any) => {
            const prodId = move.product_id || move.productId;
            const product = loadedProducts.find((p: any) => p.id === prodId);
            const price = product ? ((product as any).sale_price ?? (product as any).salePrice ?? 0) : 0;
            return {
              productId: prodId,
              quantity: move.quantity || 0,
              price: price,
              originalPrice: price,
              discount: 0,
              promotionId: null
            };
          });

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
      if (exps_res.data) setExpenses(exps_res.data);
      if (lts_res.data) setLotes(lts_res.data);
      if (sysSet.data) setSystemSettings(sysSet.data);
      if (sysUsrs_res.data) {
        setSystemUsers(sysUsrs_res.data.map((u: any) => ({
          ...u,
          fullName: u.fullName || u.full_name || '',
          employeeId: u.employeeId || u.employee_id || '',
          profileId: u.profileId || u.profile_id || '',
          storeId: u.storeId || u.store_id || 'Todas as Lojas',
          status: u.status || (u.active !== undefined ? (u.active ? 'Ativo' : 'Inativo') : 'Ativo'),
          supervisorCode: u.supervisorCode || u.supervisor_code || '',
          companyId: u.companyId || u.company_id || ''
        })));
      }
      if (proms_res.data) setPromotions(proms_res.data);
      if (rets_res.data) setReturns(rets_res.data);
      if (emps_res.data) {
        setEmployees(emps_res.data.map((e: any) => ({
          ...e,
          fullName: e.fullName || e.full_name || '',
          admissionDate: e.admissionDate || e.admission_date || '',
          companyId: e.companyId || e.company_id || ''
        })));
      }
      if (profs_res.data) setAccessProfiles(profs_res.data);
      if (perms_res.data) setPermissions(perms_res.data);
      if (expCats_res.data) setExpenseCategories(expCats_res.data);
      if (ls_res.data) setLosses(ls_res.data);
      if (dLogs_res.data) setDiscountLogs(dLogs_res.data);
      if (audLogs_res.data) setAuditLogs(audLogs_res.data);
      if (vchs_res.data) {
        setVouchers(vchs_res.data.map((v: any) => ({
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
      if (cRegs_res.data) {
        setCashRegisters(cRegs_res.data.map((r: any) => ({
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
      if (cMovs_res.data) {
        setCashMovements(cMovs_res.data.map((m: any) => ({
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
      if (cClos_res.data) {
        setCashClosings(cClos_res.data.map((c: any) => ({
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
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          role: session.user.user_metadata.role || 'admin',
          companyId: session.user.user_metadata.companyId
        });
      }
      setIsAuthReady(true);
      await fetchData();
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          role: session.user.user_metadata.role || 'admin',
          companyId: session.user.user_metadata.companyId
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Products
  const addProduct = async (data: any) => {
    const dbPayload = {
      ...data,
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
      'sabor', 'gramatura', 'tipo_embalagem', 'segmento', 'supplier', 'section', 'unit'
    ];

    Object.keys(dbPayload).forEach(key => {
      if (!validColumns.includes(key)) {
        delete (dbPayload as any)[key];
      }
    });

    const { error } = await supabase.from('products').insert([dbPayload]);
    if (error) {
      console.error('Error adding product:', error);
      return false;
    }
    await fetchData();
    return true;
  };

  const updateProduct = async (data: any) => {
    const dbPayload = {
      ...data,
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
      'sabor', 'gramatura', 'tipo_embalagem', 'segmento', 'supplier', 'section', 'unit'
    ];

    Object.keys(dbPayload).forEach(key => {
      if (!validColumns.includes(key)) {
        delete (dbPayload as any)[key];
      }
    });

    const { error } = await supabase.from('products').update(dbPayload).eq('id', data.id);
    if (error) {
      console.error('Error updating product:', error);
      return false;
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
    await supabase.from('suppliers').insert([data]);
    await fetchData();
  };

  const updateSupplier = async (data: any) => {
    await supabase.from('suppliers').update(data).eq('id', data.id);
    await fetchData();
  };

  const deleteSupplier = async (id: string) => {
    await supabase.from('suppliers').delete().eq('id', id);
    await fetchData();
  };

  // Customers
  const addCustomer = async (data: any) => {
    await supabase.from('customers').insert([data]);
    await fetchData();
  };

  const updateCustomer = async (data: any) => {
    await supabase.from('customers').update(data).eq('id', data.id);
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
    const dbPayload = {
      sale_id: data.saleId,
      saleId: data.saleId,
      date: data.date,
      items: data.items,
      total: data.total,
      type: data.type,
      refund_method: data.refundMethod,
      refundMethod: data.refundMethod,
      user_id: data.userId,
      userId: data.userId,
      status: data.status,
      voucher_code: data.voucherCode,
      voucherCode: data.voucherCode,
      company_id: user?.companyId || null
    };
    const { error } = await supabase.from('returns').insert([dbPayload]);
    await fetchData();
    return !error;
  };

  const updateVoucher = async (data: any) => {
    const dbPayload = {
      code: data.code,
      customer_id: data.customerId || data.customer_id || null,
      current_value: data.currentValue !== undefined ? data.currentValue : data.current_value,
      initial_value: data.initialValue !== undefined ? data.initialValue : data.initial_value,
      status: data.status,
      company_id: data.company_id || user?.companyId || null
    };
    const { error } = await supabase.from('vouchers').update(dbPayload).eq('id', data.id);
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

  const closeCashRegister = async (informedTotals: any[], justification: string) => {
    if (!activeRegister) return false;

    const { error: registerError } = await supabase.from('cash_registers')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: user?.name || user?.id || 'Sistema'
      })
      .eq('id', activeRegister.id);

    if (registerError) {
      console.error('Error updating register:', registerError);
      return false;
    }

    const totalSystem = informedTotals.reduce((acc, t) => acc + (Number(t.system) || 0), 0);
    const totalInformed = informedTotals.reduce((acc, t) => acc + (Number(t.informed) || 0), 0);
    const totalDifference = totalInformed - totalSystem;

    const closingPayload = {
      cash_register_id: activeRegister.id,
      total_system: totalSystem,
      total_informed: totalInformed,
      total_difference: totalDifference,
      justification: justification,
      closed_at: new Date().toISOString(),
      company_id: user?.companyId || null,
      approved_by: user?.name || null
    };

    const { error: closingError } = await supabase.from('cash_closings').insert([closingPayload]);
    if (closingError) {
      console.error('Error creating cash closing:', closingError);
    }

    await fetchData();
    return !closingError;
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
    await supabase.from('sales').delete().eq('id', id);
    await fetchData();
  };

  const addDiscountLog = async (data: any) => {
    await supabase.from('discount_logs').insert([data]);
    await fetchData();
  };

  const addLoss = async (data: any) => {
    await supabase.from('losses').insert([data]);
    await fetchData();
  };

  const addPromotion = async (data: any) => {
    await supabase.from('promotions').insert([data]);
    await fetchData();
  };
  const updatePromotion = async (data: any) => {
    await supabase.from('promotions').update(data).eq('id', data.id);
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
    const { data: product, error: prodError } = await supabase.from('products').select('stock').eq('id', productId).single();
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
      
      const { error: updateError } = await supabase.from('products').update({ stock: newStock }).eq('id', productId);
      if (updateError) {
        console.error('Erro ao atualizar saldo de estoque do produto:', updateError);
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
    await supabase.from('expenses').insert([data]);
    await fetchData();
  };

  const updateExpense = async (data: any) => {
    await supabase.from('expenses').update(data).eq('id', data.id);
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

  const hasPermission = (module: string, action: string) => {
    return true; // Simplified authorize-all
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
    await supabase.from('company_settings').upsert(data);
    await fetchData();
  };

  const updateSystemSettings = async (data: any) => {
    await supabase.from('system_settings').upsert(data);
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
    const dbPayload = {
      username: data.username,
      email: data.email,
      full_name: data.fullName || data.full_name || data.username,
      employee_id: data.employeeId || data.employee_id || null,
      profile_id: data.profileId || data.profile_id || null,
      store_id: data.storeId || data.store_id || 'Todas as Lojas',
      active: data.status !== undefined ? (data.status === 'Ativo') : (data.active !== undefined ? data.active : true),
      supervisor_code: data.supervisorCode || data.supervisor_code || null,
      company_id: data.companyId || data.company_id || user?.companyId || null
    };
    await supabase.from('system_users').insert([dbPayload]);
    await fetchData();
  };

  const updateSystemUser = async (data: any, password?: string) => {
    const dbPayload = {
      username: data.username,
      email: data.email,
      full_name: data.fullName || data.full_name,
      employee_id: data.employeeId || data.employee_id,
      profile_id: data.profileId || data.profile_id,
      store_id: data.storeId || data.store_id,
      active: data.status !== undefined ? (data.status === 'Ativo') : data.active,
      supervisor_code: data.supervisorCode || data.supervisor_code,
      company_id: data.companyId || data.company_id
    };
    Object.keys(dbPayload).forEach(key => {
      if ((dbPayload as any)[key] === undefined) {
        delete (dbPayload as any)[key];
      }
    });
    await supabase.from('system_users').update(dbPayload).eq('id', data.id);
    await fetchData();
  };

  const deleteSystemUser = async (id: string) => {
    await supabase.from('system_users').delete().eq('id', id);
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
    await supabase.from('advertisements').insert([data]);
    await fetchData();
  };

  const updateAdvertisement = async (data: any) => {
    await supabase.from('advertisements').update(data).eq('id', data.id);
    await fetchData();
  };

  const deleteAdvertisement = async (id: string) => {
    await supabase.from('advertisements').delete().eq('id', id);
    await fetchData();
  };

  const addPaymentMethod = async (data: any) => {
    const { error } = await supabase.from('payment_methods').insert([data]);
    if (error) return false;
    await fetchData();
    return true;
  };

  const updatePaymentMethod = async (data: PaymentMethod) => {
    const { error } = await supabase.from('payment_methods').update(data).eq('id', data.id);
    if (error) return false;
    await fetchData();
    return true;
  };

  const deletePaymentMethod = async (id: string) => {
    await supabase.from('payment_methods').delete().eq('id', id);
    await fetchData();
  };

  const updatePermissions = async (profileId: string, permissions: any[]) => {
    // Assuming we need to upsert permissions for a specific profile
    await supabase.from('permissions').upsert(permissions.map(p => ({ ...p, profile_id: profileId })));
    await fetchData();
  };

  const sendEmailNotification = async (to: string, subject: string, text: string, html: string, from?: string) => {
    return { success: true };
  };

  return (
    <ERPContext.Provider value={{
      user, isAuthReady, isLoading, products, suppliers, customers, sales, expenses, lotes,
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
