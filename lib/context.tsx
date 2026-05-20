'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Product, Sale, Customer, Supplier, Loss, Expense, PricingSettings, CompanySettings, CompositionItem, StockMovement, Inventory, Employee, SystemUser, AccessProfile, Permission, SystemSettings, DiscountLog, CashRegister, CashMovement, CashSalesSummary, CashClosing, AuditLog, PaymentMethod, Departamento, Categoria, Subcategoria, ProductLote, Maquininha, Promotion, Return, Voucher, ExpenseCategory, Advertisement, INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_LOSSES, INITIAL_SALES, INITIAL_EXPENSES, INITIAL_ADS } from './types';
import { supabase } from './supabase';
import bcrypt from 'bcryptjs';
import { DEFAULT_MERCADOLOGICAL_TREE } from './default-tree';

interface ERPContextType {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  suppliers: Supplier[];
  losses: Loss[];
  expenses: Expense[];
  departamentos: Departamento[];
  categorias: Categoria[];
  expenseCategories: ExpenseCategory[];
  subcategorias: Subcategoria[];
  stockMovements: StockMovement[];
  inventories: Inventory[];
  employees: Employee[];
  systemUsers: SystemUser[];
  accessProfiles: AccessProfile[];
  permissions: Permission[];
  pricingSettings: PricingSettings;
  companySettings: CompanySettings;
  systemSettings: SystemSettings;
  paymentMethods: PaymentMethod[];
  maquininhas: Maquininha[];
  promotions: Promotion[];
  returns: Return[];
  vouchers: Voucher[];
  advertisements: Advertisement[];
  user: { id: string; name: string; email: string; role: string; profileId?: string; companyId?: string } | null;
  isSuperAdmin: boolean;
  isAuthReady: boolean;
  isLoading: boolean;
  hasPermission: (module: string, action: 'view' | 'create' | 'edit' | 'delete') => boolean;
  discountLogs: DiscountLog[];
  auditLogs: AuditLog[];
  cashRegisters: CashRegister[];
  cashMovements: CashMovement[];
  cashClosings: CashClosing[];
  activeRegister: CashRegister | null;
  lotes: ProductLote[];
  openCashRegister: (openingBalance: number, observation?: string) => Promise<void>;
  closeCashRegister: (informedTotals: { method: string; informed: number; system: number }[], justification?: string) => Promise<void>;
  addCashMovement: (movement: Omit<CashMovement, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>;
  suspendCashRegister: () => Promise<void>;
  blockCashRegister: (reason: string) => Promise<void>;
  logAuditAction: (action: string, module: string, entityId?: string, oldData?: any, newData?: any) => Promise<void>;
  addProduct: (product: Product, skipFetch?: boolean) => Promise<boolean>;
  updateProduct: (product: Product) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id'>) => Promise<Sale | null>;
  addReturn: (returnData: Omit<Return, 'id'>) => Promise<boolean>;
  addVoucher: (voucher: Omit<Voucher, 'id' | 'createdAt'>) => Promise<Voucher | null>;
  updateVoucher: (voucher: Voucher) => Promise<boolean>;
  getVoucherByCode: (code: string) => Voucher | undefined;
  addDiscountLog: (log: Omit<DiscountLog, 'id'>) => Promise<void>;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addSupplier: (supplier: Supplier) => Promise<void>;
  updateSupplier: (supplier: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  addLoss: (loss: Omit<Loss, 'id'>) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  addStockMovement: (movement: Omit<StockMovement, 'id'>, skipFetch?: boolean) => Promise<void>;
  addInventory: (inventory: Omit<Inventory, 'id'>, skipFetch?: boolean) => Promise<boolean>;
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (employee: Employee) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  addSystemUser: (systemUser: Omit<SystemUser, 'id'>, password?: string) => Promise<void>;
  updateSystemUser: (systemUser: SystemUser, password?: string) => Promise<void>;
  deleteSystemUser: (id: string) => Promise<void>;
  addAccessProfile: (profile: Omit<AccessProfile, 'id'>) => Promise<void>;
  updateAccessProfile: (profile: AccessProfile) => Promise<void>;
  deleteAccessProfile: (id: string) => Promise<void>;
  updatePermissions: (profileId: string, permissions: Omit<Permission, 'id'>[]) => Promise<void>;
  updatePricingSettings: (settings: PricingSettings) => void;
  updateCompanySettings: (settings: CompanySettings) => Promise<void> | void;
  updateSystemSettings: (settings: SystemSettings) => void;
  sendEmailNotification: (to: string, subject: string, body: string, html?: string, from?: string) => Promise<{ success: boolean; error?: string }>;
  addPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => Promise<boolean>;
  updatePaymentMethod: (method: PaymentMethod) => Promise<boolean>;
  deletePaymentMethod: (id: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<{success: boolean, error?: string}>;
  logout: () => Promise<void>;
  updateSale: (sale: Sale) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  updateLoss: (loss: Loss) => Promise<void>;
  deleteLoss: (id: string) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  updateStockMovement: (movement: StockMovement) => Promise<void>;
  deleteStockMovement: (id: string) => Promise<void>;
  updateInventory: (inventory: Inventory) => Promise<void>;
  deleteInventory: (id: string) => Promise<void>;
  addCategoria: (categoria: Omit<Categoria, 'id'>) => Promise<void>;
  updateCategoria: (categoria: Categoria) => Promise<void>;
  deleteCategoria: (id: string) => Promise<{success: boolean, error?: any}>;
  addExpenseCategory: (categoria: Omit<ExpenseCategory, 'id'>) => Promise<void>;
  addSubcategoria: (subcategoria: Omit<Subcategoria, 'id'>) => Promise<void>;
  updateSubcategoria: (subcategoria: Subcategoria) => Promise<void>;
  deleteSubcategoria: (id: string) => Promise<{success: boolean, error?: any}>;
  addDepartamento: (departamento: Omit<Departamento, 'id'>) => Promise<void>;
  updateDepartamento: (departamento: Departamento) => Promise<void>;
  deleteDepartamento: (id: string) => Promise<{success: boolean, error?: any}>;
  addMaquininha: (maquininha: Omit<Maquininha, 'id' | 'created_at'>) => Promise<void>;
  updateMaquininha: (maquininha: Maquininha) => Promise<void>;
  deleteMaquininha: (id: string) => Promise<void>;
  addPromotion: (promotion: Omit<Promotion, 'id'>) => Promise<void>;
  updatePromotion: (promotion: Promotion) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;
  addAdvertisement: (ad: Omit<Advertisement, 'id'>) => Promise<void>;
  updateAdvertisement: (ad: Advertisement) => Promise<void>;
  deleteAdvertisement: (id: string) => Promise<void>;
  seedMercadologicalTree: () => Promise<void>;
  seedExpenseCategories: () => Promise<void>;
  fetchData: () => Promise<void>;
  customAlert: { message: string; type: 'success' | 'error' | 'warning' | 'info' } | null;
  setCustomAlert: (alert: { message: string; type: 'success' | 'error' | 'warning' | 'info' } | null) => void;
  changePassword: (newPassword: string) => Promise<{ error: any }>;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

const INITIAL_SYSTEM_SETTINGS: SystemSettings = {
  theme: 'system',
  language: 'pt-BR',
  currency: 'BRL',
  timezone: 'America/Sao_Paulo',
  dateFormat: 'DD/MM/YYYY',
  notifications: {
    email: true,
    push: true,
    sms: false
  }
};

const INITIAL_PRICING_SETTINGS: PricingSettings = {
  defaultMethod: 'markup',
  defaultMargin: 30,
  defaultMarkup: 50,
  allowEditOnProduct: true,
  autoRounding: false
};

const INITIAL_COMPANY_SETTINGS: CompanySettings = {
  tradeName: 'Cp Sister PDV',
  legalName: 'Cp Sister Soluções Tecnológicas LTDA',
  cnpj: '00.000.000/0001-00',
  stateRegistration: 'Isento',
  address: {
    street: 'Avenida das Américas, 1000',
    number: 'Sala 204',
    neighborhood: 'Barra da Tijuca',
    city: 'Rio de Janeiro',
    state: 'RJ'
  }
};

const getRoleFromUser = (userData: any): string => {
  if (userData.access_profiles?.name) {
    return userData.access_profiles.name;
  }
  
  // Fallbacks for global default profile IDs
  const pId = userData.profile_id || userData.profileId || '';
  const idLower = pId.toLowerCase();
  
  if (idLower === '00000000-0000-0000-0000-000000000000') return 'Administrador';
  if (idLower === 'f8ab109e-2361-4521-9e5e-0f57ea773b50' || idLower === '2c5c33b7-bfc3-46c6-a236-e7ef70906c19' || idLower === '825d7f60-4152-4597-862b-e00021de47b8') return 'Caixa';
  if (idLower === 'e962be8b-7f3f-4c86-a52a-eda3c7f3aff7') return 'Gerente';
  if (idLower === 'fd8c75ae-db58-40b2-b7e6-c9800d484caf') return 'Financeiro';
  
  return userData.role || 'user';
};

export function ERPProvider({ children }: { children: React.ReactNode }) {
  const getInitialState = <T,>(key: string, defaultValue: T): T => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(key);
      try {
        return saved ? JSON.parse(saved) : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    }
    return defaultValue;
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [losses, setLosses] = useState<Loss[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [accessProfiles, setAccessProfiles] = useState<AccessProfile[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [discountLogs, setDiscountLogs] = useState<DiscountLog[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [cashClosings, setCashClosings] = useState<CashClosing[]>([]);
  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [lotes, setLotes] = useState<ProductLote[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [maquininhas, setMaquininhas] = useState<Maquininha[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>(INITIAL_ADS);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(INITIAL_SYSTEM_SETTINGS);
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(INITIAL_PRICING_SETTINGS);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(INITIAL_COMPANY_SETTINGS);
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string; profileId?: string; companyId?: string } | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customAlert, setCustomAlert] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const loadFromStorage = <T,>(key: string, setter: (val: T) => void, defaultValue: T) => {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          setter(JSON.parse(saved));
        } catch (e) {
          setter(defaultValue);
        }
      }
    };

    loadFromStorage('erp_products', setProducts, []);
    loadFromStorage('erp_sales', setSales, []);
    loadFromStorage('erp_customers', setCustomers, []);
    loadFromStorage('erp_suppliers', setSuppliers, []);
    loadFromStorage('erp_expenses', setExpenses, []);
    loadFromStorage('payment_methods', setPaymentMethods, []);
    loadFromStorage('maquininhas', setMaquininhas, []);
    loadFromStorage('advertisements', setAdvertisements, INITIAL_ADS);
    loadFromStorage('system_settings', setSystemSettings, INITIAL_SYSTEM_SETTINGS);
    loadFromStorage('pricing_settings', setPricingSettings, INITIAL_PRICING_SETTINGS);
    loadFromStorage('company_settings', setCompanySettings, INITIAL_COMPANY_SETTINGS);
    loadFromStorage('erp_user', setUser, null);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalAlert = window.alert;
      window.alert = (message: string) => {
        setCustomAlert({ message, type: 'info' });
      };
      return () => {
        window.alert = originalAlert;
      };
    }
  }, []);

  // Periodic check for expired promotions
  useEffect(() => {
    if (promotions.length === 0) return;

    const checkExpirations = () => {
      const now = new Date();
      let hasChanges = false;
      const updatedPromotions = promotions.map(p => {
        const promoEndDate = new Date(p.endDate);
        if (p.status === 'ACTIVE' && promoEndDate < now) {
          hasChanges = true;
          return { ...p, status: 'INACTIVE' as const };
        }
        return p;
      });

      if (hasChanges) {
        setPromotions(updatedPromotions);
      }
    };

    const interval = setInterval(checkExpirations, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [promotions]);

  useEffect(() => {
    if (user?.email?.toLowerCase() === 'willmanssilva4@gmail.com') {
      setIsSuperAdmin(true);
    } else {
      setIsSuperAdmin(false);
    }
  }, [user]);

  const pendingResolvesRef = useRef<Array<() => void>>([]);

  const fetchData = useCallback(async (targetTables?: string[]) => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    return new Promise<void>((resolve) => {
      pendingResolvesRef.current.push(resolve);
      
      fetchTimeoutRef.current = setTimeout(async () => {
        const resolves = [...pendingResolvesRef.current];
        pendingResolvesRef.current = [];
        
        // Get current user from localStorage to avoid dependency cycles
        const storedUser = localStorage.getItem('erp_user');
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        
        const companyId = currentUser?.companyId || null;
        const shouldFetch = (table: string) => !targetTables || targetTables.includes(table);

    try {
      console.log('DEBUG: fetchData called');
      // Define all possible queries
      // If companyId is null, we fetch records where company_id is null using .is('company_id', null)
      const buildQuery = (table: string, select = '*') => {
        let q = supabase.from(table).select(select);
        if (companyId) {
          return q.eq('company_id', companyId);
        } else {
          return q.is('company_id', null);
        }
      };

      const fetchAll = async (table: string, select = '*', orderBy?: { column: string, ascending: boolean }) => {
        let allData: any[] = [];
        let from = 0;
        const PAGE_SIZE = 1000;
        let finished = false;
        
        while (!finished) {
          let q = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
          if (companyId) {
            q = q.eq('company_id', companyId);
          } else {
            q = q.is('company_id', null);
          }
          
          if (orderBy) {
            q = q.order(orderBy.column, { ascending: orderBy.ascending });
          }
          
          const { data, error } = await q;
          if (error) throw error;
          
          if (data && data.length > 0) {
            allData = [...allData, ...data];
            if (data.length < PAGE_SIZE) {
              finished = true;
            } else {
              from += PAGE_SIZE;
            }
          } else {
            finished = true;
          }
        }
        return { data: allData, error: null };
      };

      const queries: Record<string, any> = {
        products: fetchAll('products', '*', { column: 'name', ascending: true }),
        customers: fetchAll('customers', '*', { column: 'name', ascending: true }),
        suppliers: fetchAll('suppliers', '*', { column: 'name', ascending: true }),
        losses: buildQuery('losses'),
        expenses: fetchAll('expenses'),
        stock_movements: buildQuery('stock_movements').order('date', { ascending: false }).limit(500),
        inventories: buildQuery('inventories').order('date', { ascending: false }),
        employees: buildQuery('employees'),
        system_users: buildQuery('system_users'),
        access_profiles: companyId 
          ? supabase.from('access_profiles').select('*').or(`company_id.eq.${companyId},company_id.is.null`)
          : supabase.from('access_profiles').select('*').is('company_id', null),
        permissions: companyId
          ? supabase.from('permissions').select('*').or(`company_id.eq.${companyId},company_id.is.null`)
          : supabase.from('permissions').select('*').is('company_id', null),
        departamentos: buildQuery('departamentos'),
        categorias: buildQuery('categorias'),
        expense_categories: buildQuery('expense_categories'),
        subcategorias: buildQuery('subcategorias'),
        vendas_descontos: buildQuery('vendas_descontos'),
        cash_registers: buildQuery('cash_registers').order('opened_at', { ascending: false }).limit(100),
        cash_movements: buildQuery('cash_movements').order('created_at', { ascending: false }).limit(200),
        cash_closings: buildQuery('cash_closings').order('closed_at', { ascending: false }).limit(100),
        audit_logs: buildQuery('audit_logs').order('created_at', { ascending: false }).limit(200),
        produto_lotes: fetchAll('produto_lotes'),
        payment_methods: buildQuery('payment_methods'),
        maquininhas: buildQuery('maquininhas'),
        promotions: buildQuery('promotions'),
        returns: buildQuery('returns', '*, return_items(*)').order('date', { ascending: false }).limit(500),
        vouchers: buildQuery('vouchers').order('created_at', { ascending: false }),
        companies: companyId ? supabase.from('companies').select('*').eq('id', companyId).single() : Promise.resolve({ data: null })
      };

      // Filter queries based on targetTables
      const activeTableNames = Object.keys(queries).filter(shouldFetch);
      const activeQueries = activeTableNames.map(name => queries[name]);

      const results = await Promise.all(activeQueries);
      
      // Map results back to data variables
      const data: Record<string, any> = {};
      activeTableNames.forEach((name, index) => {
        data[name] = results[index].data;
      });

      const productsData = data.products;
      const customersData = data.customers;
      const suppliersData = data.suppliers;
      const lossesData = data.losses;
      const expensesData = data.expenses;
      const movementsData = data.stock_movements;
      const inventoriesData = data.inventories;
      const employeesData = data.employees;
      const systemUsersData = data.system_users;
      const accessProfilesData = data.access_profiles;
      const permissionsData = data.permissions;
      const departamentosData = data.departamentos;
      const categoriasData = data.categorias;
      const expenseCategoriesData = data.expense_categories;
      const subcategoriasData = data.subcategorias;
      const discountLogsData = data.vendas_descontos;
      const registersData = data.cash_registers;
      const movementsData_cash = data.cash_movements;
      const closingsData = data.cash_closings;
      const auditLogsData = data.audit_logs;
      const lotesData = data.produto_lotes;
      const paymentMethodsData = data.payment_methods;
      const maquininhasData = data.maquininhas;
      const promotionsData = data.promotions;
      const returnsData = data.returns;
      const vouchersData = data.vouchers;
      const companyData = data.companies;

      // Fetch sales separately if needed
      let salesData;
      if (shouldFetch('sales')) {
        try {
          const res = await buildQuery('sales', '*, sale_items(*)').order('date', { ascending: false }).limit(2000);
          if (res.error) throw res.error;
          salesData = res.data;
        } catch (e) {
          console.warn('Failed to fetch sales with join, fetching separately...', e);
          const [salesRes, itemsRes] = await Promise.all([
            buildQuery('sales').order('date', { ascending: false }).limit(2000),
            buildQuery('sale_items').order('created_at', { ascending: false }).limit(8000)
          ]);
          if (salesRes.data) {
            // Group items by sale_id for O(N) lookup
            const itemsBySaleId = new Map<string, any[]>();
            if (itemsRes.data) {
              itemsRes.data.forEach((item: any) => {
                const items = itemsBySaleId.get(item.sale_id) || [];
                items.push(item);
                itemsBySaleId.set(item.sale_id, items);
              });
            }

            salesData = salesRes.data.map((s: any) => ({
              ...s,
              sale_items: itemsBySaleId.get(s.id) || []
            }));
          }
        }
      }
      
      if (companyData) {
        setCompanySettings(prev => ({
          ...prev,
          tradeName: companyData.trade_name || companyData.name || prev.tradeName,
          legalName: companyData.legal_name || companyData.name || prev.legalName,
          cnpj: companyData.document || prev.cnpj,
          stateRegistration: companyData.state_registration || prev.stateRegistration,
          email: companyData.email || prev.email,
          phone: companyData.phone || prev.phone,
          address: {
            ...prev.address,
            street: companyData.address || prev.address.street,
            number: companyData.address_number || prev.address.number,
            neighborhood: companyData.neighborhood || prev.address.neighborhood,
            city: companyData.city || prev.address.city,
            state: companyData.state || prev.address.state
          }
        }));
      } else {
        const savedCompany = localStorage.getItem('company_settings');
        if (savedCompany) {
          setCompanySettings(JSON.parse(savedCompany));
        }
      }
      if (returnsData) {
        const mappedReturns = returnsData.map((r: any) => ({
          id: r.id,
          saleId: r.sale_id,
          date: r.date,
          items: (r.return_items || []).map((ri: any) => ({
            productId: ri.product_id,
            quantity: Number(ri.quantity || 0),
            price: Number(ri.price),
            reason: ri.reason
          })),
          total: Number(r.total),
          type: r.type,
          refundMethod: r.refund_method,
          userId: r.user_id,
          status: r.status
        }));
        setReturns(mappedReturns);
        localStorage.setItem('erp_returns', JSON.stringify(mappedReturns));
      }

      if (vouchersData) {
        const mappedVouchers = vouchersData.map((v: any) => ({
          id: v.id,
          code: v.code,
          initialValue: Number(v.initial_value),
          currentValue: Number(v.current_value),
          customerId: v.customer_id,
          saleId: v.sale_id,
          returnId: v.return_id,
          status: v.status,
          createdAt: v.created_at
        }));
        setVouchers(mappedVouchers);
        localStorage.setItem('erp_vouchers', JSON.stringify(mappedVouchers));
      }

      if (promotionsData) {
        const now = new Date();
        setPromotions(promotionsData.map((p: any) => {
          const promoEndDate = new Date(p.end_date);
          const isExpired = promoEndDate < now;
          const status = (p.status === 'ACTIVE' && isExpired) ? 'INACTIVE' : p.status;
          
          return {
            id: p.id,
            name: p.name,
            type: p.type,
            startDate: p.start_date,
            endDate: p.end_date,
            status: status as 'ACTIVE' | 'INACTIVE',
            targetType: p.target_type,
            targetId: (p.target_id && typeof p.target_id === 'string' && p.target_id.startsWith('[')) ? JSON.parse(p.target_id) : p.target_id,
            productPrices: p.product_prices || {},
            discountValue: p.discount_value ? Number(p.discount_value) : undefined,
            buyQuantity: p.buy_quantity,
            payQuantity: p.pay_quantity,
            comboItems: p.combo_items,
            comboPrice: p.combo_price ? Number(p.combo_price) : undefined,
            applyAutomatically: p.apply_automatically,
            limitPerCustomer: p.limit_per_customer,
            quantityLimit: p.quantity_limit,
            daysOfWeek: p.days_of_week,
            onlyForClubMembers: p.only_for_club_members
          };
        }));
      }

      if (productsData) {
        const baseProducts = productsData.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku ? String(p.sku) : '',
          costPrice: Number(p.cost_price),
          salePrice: Number(p.sale_price),
          wholesalePrice: p.wholesale_price ? Number(p.wholesale_price) : undefined,
          termPrice: p.term_price ? Number(p.term_price) : undefined,
          wholesaleMinQty: p.wholesale_min_qty ? Number(p.wholesale_min_qty) : 0,
          clubPrice: p.club_price ? Number(p.club_price) : undefined,
          stock: p.stock,
          minStock: p.min_stock,
          image: (!p.image || p.image.includes('mercadinhosupernice.com.br') || p.image.includes('images.unsplash.com') || p.image.includes('picsum.photos/seed/produto')) ? 'https://i.imgur.com/jGU5BUa.png' : p.image,
          composition: p.composition || [],
          status: p.status || 'Ativo',
          codigo_mercadologico: p.codigo_mercadologico,
          subcategoria_id: p.subcategoria_id,
          supplier: p.supplier,
          validade: p.validade,
          has_had_stock: p.has_had_stock,
          controlStock: p.control_stock,
          product_type: p.product_type || 'SALE',
          base_product_id: p.base_product_id,
          conversion_factor: p.conversion_factor ? Number(p.conversion_factor) : 1,
          brand: p.brand,
          gramatura: p.gramatura,
          tipo_embalagem: p.tipo_embalagem,
          segmento: p.segmento,
          section: p.section
        }));

        // Create a map for O(1) lookup
        const productsById = new Map<string, Product>(baseProducts.map((p: any) => [p.id, p]));

        // Calculate virtual stock for kits and sale products with conversion
        const finalProducts = baseProducts.map((p: any) => {
          // Case 1: KIT (Composition)
          if (p.composition && p.composition.length > 0) {
            let possibleStock = Infinity;
            p.composition.forEach((item: CompositionItem) => {
              const component = productsById.get(item.productId);
              if (component) {
                const stock = Number(component.stock) || 0;
                const available = Math.floor(stock / item.quantity);
                if (available < possibleStock) {
                  possibleStock = available;
                }
              } else {
                possibleStock = 0;
              }
            });
            return { ...p, stock: possibleStock === Infinity ? 0 : possibleStock };
          }
          
          // Case 2: SALE product with BASE product and conversion factor
          if (p.product_type === 'SALE' && p.base_product_id && p.conversion_factor) {
            const baseProduct = productsById.get(p.base_product_id);
            if (baseProduct) {
              const virtualStock = Math.floor((Number(baseProduct.stock) || 0) / p.conversion_factor);
              return { ...p, stock: virtualStock };
            }
          }
          
          return p;
        });

        setProducts(finalProducts);
        localStorage.setItem('erp_products', JSON.stringify(finalProducts));
      }

      if (departamentosData) setDepartamentos(departamentosData);
      if (categoriasData) setCategorias(categoriasData);
      if (expenseCategoriesData) setExpenseCategories(expenseCategoriesData);
      if (subcategoriasData) setSubcategorias(subcategoriasData);

      if (customersData) {
        const mappedCustomers = customersData.map((c: any) => ({
          id: c.id,
          name: c.name,
          document: c.document,
          phone: c.phone,
          email: c.email,
          totalSpent: Number(c.total_spent),
          status: c.status,
          image: c.image?.includes('mercadinhosupernice.com.br') ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=250&auto=format&fit=crop' : c.image,
          isClubMember: c.is_club_member,
          clubJoinDate: c.club_join_date
        }));
        setCustomers(mappedCustomers);
        localStorage.setItem('erp_customers', JSON.stringify(mappedCustomers));
      }

      if (suppliersData) {
        setSuppliers(suppliersData.map((s: any) => ({
          id: s.id,
          name: s.name,
          document: s.document,
          phone: s.phone,
          email: s.email,
          address: s.address
        })));
      }

      if (salesData) {
        const mappedSales = salesData.map((s: any) => ({
          id: s.id,
          companyId: s.company_id,
          date: s.date,
          total: Number(s.total),
          paymentMethod: s.payment_method,
          customerId: s.customer_id,
          userId: s.user_id,
          status: s.status || 'Concluída',
          taxAmount: s.tax_amount ? Number(s.tax_amount) : 0,
          netAmount: s.net_amount ? Number(s.net_amount) : Number(s.total),
          items: (s.sale_items || []).map((si: any) => ({
            productId: si.product_id,
            quantity: Number(si.quantity || 0),
            price: Number(si.price),
            costPrice: Number(si.cost_price || 0),
            originalPrice: si.original_price ? Number(si.original_price) : Number(si.price),
            discount: si.discount ? Number(si.discount) : 0,
            promotionId: si.promotion_id || undefined
          }))
        }));
        setSales(mappedSales);
        localStorage.setItem('erp_sales', JSON.stringify(mappedSales));
      }

      if (lossesData) {
        setLosses(lossesData.map((l: any) => ({
          id: l.id,
          productId: l.product_id,
          quantity: l.quantity,
          reason: l.reason,
          date: l.date,
          totalValue: Number(l.total_value)
        })));
      }

      if (expensesData) {
        console.log('Expenses data fetched:', expensesData);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const mappedExpenses = expensesData.map((e: any) => {
          let status = e.status as 'Pago' | 'Pendente' | 'Vencido';
          
          // If it's pending but the due date has passed, mark as overdue
          if (status === 'Pendente' && e.due_date) {
            const dueDate = new Date(e.due_date);
            dueDate.setHours(0, 0, 0, 0);
            if (dueDate.getTime() < now.getTime()) {
              status = 'Vencido';
            }
          }

          return {
            id: e.id,
            description: e.description,
            category: e.category,
            supplier: e.supplier,
            amount: Number(e.amount),
            issueDate: e.issue_date,
            dueDate: e.due_date,
            date: e.due_date || e.issue_date || e.date,
            paymentDate: e.payment_date,
            paymentMethod: e.payment_method,
            financialAccount: e.financial_account,
            observation: e.observation,
            isRecurring: e.is_recurring,
            frequency: e.frequency,
            status: status,
            origin: e.origin,
            type: e.type,
            interest: e.interest || 0,
            discount: e.discount || 0,
            paymentType: e.payment_type
          };
        });
        setExpenses(mappedExpenses);
        localStorage.setItem('erp_expenses', JSON.stringify(mappedExpenses));
      }

      if (movementsData) {
        // Create a map for faster product name lookup
        const productsMap = new Map<string, string>((productsData || []).map((p: any) => [p.id, p.name]));
        
        setStockMovements(movementsData.map((m: any) => ({
          id: m.id,
          productId: m.product_id,
          type: m.type,
          quantity: m.quantity,
          origin: m.origin,
          date: m.date,
          userId: m.user_id,
          userName: m.user_name,
          productName: productsMap.get(m.product_id)
        })));
      }

      if (inventoriesData) {
        setInventories(inventoriesData.map((i: any) => ({
          id: i.id,
          date: i.date,
          location: i.location,
          itemsCounted: i.items_counted,
          divergenceValue: Number(i.divergence_value),
          status: i.status,
          type: i.type || 'Geral',
          responsible: i.responsible || 'Sistema',
          notes: i.notes
        })));
      }

      if (employeesData) {
        setEmployees(employeesData.map((e: any) => ({
          id: e.id,
          fullName: e.full_name,
          cpf: e.cpf,
          phone: e.phone,
          role: e.role,
          admissionDate: e.admission_date,
          salary: e.salary ? Number(e.salary) : undefined,
          status: e.status
        })));
      }

      if (systemUsersData) {
        setSystemUsers(systemUsersData.map((u: any) => ({
          id: u.id,
          username: u.username,
          email: u.email || u.username, // Fallback to username if email is null
          employeeId: u.employee_id,
          profileId: u.profile_id,
          storeId: u.store_id,
          status: u.status,
          supervisorCode: u.supervisor_code
        })));
      }

      if (accessProfilesData) {
        // Ensure default profiles exist
        const defaultProfiles = [
          { name: 'Administrador', description: 'Acesso total a todas as funcionalidades do sistema.' },
          { name: 'Gerente', description: 'Acesso gerencial, pode visualizar relatórios e gerenciar equipe.' },
          { name: 'Financeiro', description: 'Acesso aos módulos financeiros, contas a pagar e receber.' },
          { name: 'Comprador', description: 'Acesso ao módulo de compras e gestão de fornecedores.' },
          { name: 'Estoquista', description: 'Acesso ao controle de estoque, entrada e saída de mercadorias.' },
          { name: 'Caixa', description: 'Acesso ao PDV e abertura/fechamento de caixa.' },
          { name: 'Fiscal de Caixa', description: 'Responsável por autorizações especiais no PDV, cancelamentos e estornos.' }
        ];

        // Unique the fetched access profiles by name case-insensitively, preferring those with permissions
        const uniqueProfilesMap = new Map<string, any>();
        
        // Group profiles by lowercase name to find the best candidate for each name
        const groupedByName = new Map<string, any[]>();
        accessProfilesData.forEach((p: any) => {
          const nameKey = p.name?.trim()?.toLowerCase();
          if (!nameKey) return;
          const list = groupedByName.get(nameKey) || [];
          list.push(p);
          groupedByName.set(nameKey, list);
        });

        // For each group, choose the best candidate
        groupedByName.forEach((list, nameKey) => {
          // 1. Prefer profile that has permissions in permissionsData
          let best = list.find(p => permissionsData && permissionsData.some((perm: any) => perm.profile_id === p.id));
          // 2. Otherwise prefer company-specific
          if (!best && companyId) {
            best = list.find(p => p.company_id === companyId);
          }
          // 3. Fallback to the first one
          if (!best) {
            best = list[0];
          }
          uniqueProfilesMap.set(nameKey, best);
        });

        const uniqueProfiles = Array.from(uniqueProfilesMap.values());

        // Check which profiles are missing
        const missingProfiles = defaultProfiles.filter(dp => 
          !uniqueProfiles.some((ap: any) => ap.name?.trim()?.toLowerCase() === dp.name.toLowerCase())
        );

        if (missingProfiles.length > 0) {
          const profilesToInsert = missingProfiles.map(p => ({
            ...p,
            company_id: companyId
          }));
          console.log('Inserting missing default profiles:', profilesToInsert);
          const { data: newProfiles, error: insertError } = await supabase
            .from('access_profiles')
            .insert(profilesToInsert)
            .select();
            
          if (!insertError && newProfiles) {
            // Combine unique and new profiles
            const allProfiles = [...uniqueProfiles, ...newProfiles];
            setAccessProfiles(allProfiles.map((p: any) => ({
              id: p.id,
              name: p.name,
              description: p.description
            })));
          } else {
            console.error('Error inserting missing profiles:', insertError);
            setAccessProfiles(uniqueProfiles.map((p: any) => ({
              id: p.id,
              name: p.name,
              description: p.description
            })));
          }
        } else {
          setAccessProfiles(uniqueProfiles.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description
          })));
        }
      }

      if (permissionsData) {
        setPermissions(permissionsData.map((p: any) => ({
          id: p.id,
          profileId: p.profile_id,
          module: p.module,
          canView: p.can_view,
          canCreate: p.can_create,
          canEdit: p.can_edit,
          canDelete: p.can_delete
        })));
      }

      if (discountLogsData) {
        setDiscountLogs(discountLogsData.map((d: any) => ({
          id: d.id,
          saleId: d.venda_id,
          productId: d.produto_id,
          type: d.tipo as 'item' | 'sale',
          method: d.percentual ? 'percentage' : 'value',
          percentage: d.percentual,
          value: Number(d.valor),
          appliedBy: d.usuario_aplicou,
          authorizedBy: d.usuario_autorizou,
          reason: d.motivo,
          date: d.data_hora
        })));
      }

      if (registersData) {
        const registers = registersData.map((r: any) => ({
          id: r.id,
          companyId: r.company_id,
          storeId: r.store_id,
          terminalId: r.terminal_id,
          operatorId: r.operator_id,
          openingBalance: Number(r.opening_balance),
          status: r.status as 'open' | 'closed' | 'blocked' | 'suspended',
          openedAt: r.opened_at,
          closedAt: r.closed_at,
          closedBy: r.closed_by,
          observation: r.observation
        }));
        setCashRegisters(registers);
        const active = registers.find((r: any) => r.status === 'open');
        setActiveRegister(active || null);
      }

      if (movementsData_cash) {
        setCashMovements(movementsData_cash.map((m: any) => ({
          id: m.id,
          cashRegisterId: m.cash_register_id,
          type: m.type as 'sangria' | 'suprimento' | 'ajuste',
          amount: Number(m.amount),
          reason: m.reason,
          createdBy: m.created_by,
          createdAt: m.created_at
        })));
      }

      if (closingsData) {
        setCashClosings(closingsData.map((c: any) => ({
          id: c.id,
          cashRegisterId: c.cash_register_id,
          totalSystem: Number(c.total_system),
          totalInformed: Number(c.total_informed),
          totalDifference: Number(c.total_difference),
          approvedBy: c.approved_by,
          justification: c.justification,
          closedAt: c.closed_at
        })));
      }

      if (auditLogsData) {
        setAuditLogs(auditLogsData.map((l: any) => ({
          id: l.id,
          userId: l.user_id,
          action: l.action,
          module: l.module,
          entityId: l.entity_id,
          oldData: l.old_data,
          newData: l.new_data,
          ip: l.ip,
          terminal: l.terminal,
          createdAt: l.created_at
        })));
      }

      if (lotesData) {
        setLotes(lotesData.map((l: any) => ({
          id: l.id,
          productId: l.produto_id,
          numeroLote: l.numero_lote,
          dataEntrada: l.data_entrada,
          validade: l.validade,
          custoUnit: Number(l.custo_unit),
          quantidadeInicial: Number(l.quantidade_inicial),
          saldoAtual: Number(l.saldo_atual),
          fornecedorId: l.fornecedor_id
        })));
      }

      // Load pricing settings from localStorage as fallback for now
      const savedPricing = localStorage.getItem('pricing_settings');
      if (savedPricing) {
        setPricingSettings(JSON.parse(savedPricing));
      }

      // Load system settings from localStorage as fallback for now
      const savedSystem = localStorage.getItem('system_settings');
      if (savedSystem) {
        setSystemSettings(JSON.parse(savedSystem));
      }

      if (paymentMethodsData) {
        let methods = paymentMethodsData.map((m: any) => ({
          id: m.id,
          name: m.name,
          type: m.type,
          taxPercentage: Number(m.tax_percentage),
          taxFixed: Number(m.tax_value),
          active: m.active
        }));

        // Ensure "Vale Crédito" exists for the voucher system
        const hasVoucher = methods.some((m: any) => m.type === 'Voucher' || m.name === 'Vale Crédito');
        if (!hasVoucher) {
          methods.push({
            id: 'voucher-default',
            name: 'Vale Crédito',
            type: 'Voucher',
            taxPercentage: 0,
            taxFixed: 0,
            active: true
          });
        }
        
        setPaymentMethods(methods);
        localStorage.setItem('payment_methods', JSON.stringify(paymentMethodsData));
      }

      if (maquininhasData) {
        setMaquininhas(maquininhasData.map((m: any) => ({
          id: m.id,
          nome: m.nome,
          taxa_debito: Number(m.taxa_debito),
          taxa_credito: Number(m.taxa_credito),
          taxa_credito_parcelado: Number(m.taxa_credito_parcelado),
          taxa_pix: Number(m.taxa_pix || 0),
          ativo: m.ativo,
          created_at: m.created_at
        })));
        localStorage.setItem('maquininhas', JSON.stringify(maquininhasData));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fallback to localStorage if Supabase fails or is not configured
      const savedProducts = localStorage.getItem('erp_products');
      const savedCustomers = localStorage.getItem('erp_customers');
      const savedSales = localStorage.getItem('erp_sales');
      const savedExpenses = localStorage.getItem('erp_expenses');
      const savedReturns = localStorage.getItem('erp_returns');

      if (savedProducts) setProducts(JSON.parse(savedProducts));
      else setProducts(INITIAL_PRODUCTS);

      if (savedCustomers) setCustomers(JSON.parse(savedCustomers));
      else setCustomers(INITIAL_CUSTOMERS);

      if (savedSales) setSales(JSON.parse(savedSales));
      else setSales(INITIAL_SALES);

      if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
      else setExpenses(INITIAL_EXPENSES);

      if (savedReturns) setReturns(JSON.parse(savedReturns));
      else setReturns([]);

      setLosses(INITIAL_LOSSES);
    } finally {
      resolves.forEach(r => r());
    }
  }, 500);
});
}, []);

  const logAuditAction = useCallback(async (action: string, module: string, entityId?: string, oldData?: any, newData?: any) => {
    try {
      await supabase.from('audit_logs').insert([{
        company_id: user?.companyId || null,
        user_id: user?.id || null, // UUID esperado pelo banco
        action,
        module,
        entity_id: entityId,
        old_data: oldData,
        new_data: newData,
        terminal: 'Terminal 01', // Should come from settings/env
        ip: '127.0.0.1' // Should be captured server-side if possible
      }]);
      await fetchData();
    } catch (error: any) {
      console.error('Error logging audit action:', error);
    }
  }, [user, fetchData]);

  const hasPermission = useCallback((module: string, action: 'view' | 'create' | 'edit' | 'delete') => {
    if (!user) return false;
    const userEmail = user.email?.toLowerCase();
    
    // Super Admin has all permissions, but restricted to specific modules if it's the management email
    if (userEmail === 'willmanssilva4@gmail.com') {
      // This specific superadmin is ONLY for managing companies
      return module === 'Gestão de Empresas';
    }

    // Find checking profile ID. If user.role matches a profile name in our deduplicated accessProfiles, prefer that ID
    let profileIdToCheck = user.profileId;
    if (user.role) {
      const activeProfile = accessProfiles.find(p => p.name?.trim()?.toLowerCase() === user.role.toLowerCase());
      if (activeProfile) {
        profileIdToCheck = activeProfile.id;
      }
    }

    const profilePerms = permissions.filter(p => p.profileId === profileIdToCheck);
    const modPerm = profilePerms.find(p => p.module === module);
    
    if (modPerm) {
      switch (action) {
        case 'view': return modPerm.canView;
        case 'create': return modPerm.canCreate;
        case 'edit': return modPerm.canEdit;
        case 'delete': return modPerm.canDelete;
        default: return false;
      }
    }

    // -- FALLBACKS IF NOT DEFINED IN DATABASE PERMISSIONS TABLE --
    if (user.role === 'Administrador') return true;
    
    if (user.role) {
      const roleLower = user.role.trim().toLowerCase();
      
      if (roleLower === 'caixa') {
        if (module === 'Vendas') return true;
        if (module === 'Dashboard' && action === 'view') return true;
        if (module === 'Clientes' && (action === 'view' || action === 'create')) return true;
      }
      
      if (roleLower === 'fiscal de caixa') {
        if (module === 'Vendas') return true;
        if (module === 'Dashboard' && action === 'view') return true;
        if (module === 'Clientes' && (action === 'view' || action === 'create' || action === 'edit')) return true;
      }
      
      if (roleLower === 'gerente') {
        if (module === 'Gestão de Empresas') return false;
        return true; // Gerente has access to all operational modules by default
      }
      
      if (roleLower === 'financeiro') {
        if (module === 'Financeiro') return true;
        if (module === 'Dashboard' && action === 'view') return true;
        if (module === 'Relatórios' && action === 'view') return true;
      }
      
      if (roleLower === 'estoquista') {
        if (module === 'Estoque') return true;
        if (module === 'Compras' && (action === 'view' || action === 'create')) return true;
        if (module === 'Dashboard' && action === 'view') return true;
      }
      
      if (roleLower === 'comprador') {
        if (module === 'Compras') return true;
        if (module === 'Estoque' && action === 'view') return true;
        if (module === 'Dashboard' && action === 'view') return true;
      }
    }
    
    return false;
  }, [user, permissions, accessProfiles]);

  const addCashMovement = useCallback(async (movement: Omit<CashMovement, 'id' | 'createdAt' | 'createdBy'>) => {
    const { data, error } = await supabase.from('cash_movements').insert([{
      company_id: user?.companyId || null,
      cash_register_id: movement.cashRegisterId,
      type: movement.type,
      amount: movement.amount,
      reason: movement.reason,
      created_by: (await supabase.auth.getUser()).data.user?.id
    }]).select();

    if (!error && data) {
      await logAuditAction(movement.type, 'caixa', data[0].id, null, movement);
      await fetchData();
    } else {
      console.error('Error adding cash movement:', error);
      alert('Erro ao registrar movimentação: ' + (error?.message || 'Erro desconhecido'));
    }
  }, [user, logAuditAction, fetchData]);

  useEffect(() => {
    let productsSubscription: any;
    let salesSubscription: any;
    let saleItemsSubscription: any;
    let customersSubscription: any;
    let suppliersSubscription: any;
    let expensesSubscription: any;
    let registersSubscription: any;
    let movimentosSubscription: any;
    let categoriasSubscription: any;
    let subcategoriasSubscription: any;
    let departamentosSubscription: any;
    let paymentMethodsSubscription: any;
    let promotionsSubscription: any;
    let returnsSubscription: any;

    const init = async () => {
      try {
        console.log('DEBUG: init started');
        
        // Set isAuthReady to true after a short timeout even if getSession hangs
        // to allow AuthGuard to proceed with whatever state it has (e.g. from localStorage)
        const authReadyTimeout = setTimeout(() => {
          console.warn('DEBUG: isAuthReady timeout reached, forcing true');
          setIsAuthReady(true);
        }, 3000);

        // Check Supabase session first
        console.log('DEBUG: fetching session');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('DEBUG: session fetched', !!session);
        
        clearTimeout(authReadyTimeout);
        
        if (session?.user) {
          console.log('DEBUG: user found in session', session.user.id);
          // Fetch user details from system_users table
          let userData = null;
          try {
            console.log('DEBUG: fetching system_user details');
            // Try simple query first to avoid join issues
            const { data, error: userError } = await supabase
              .from('system_users')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (userError) {
              console.warn('DEBUG: system_user fetch error', userError);
              if (userError.code === 'PGRST116') {
                console.warn('User not found in system_users table');
              } else {
                console.error('Error fetching system_user:', userError.message);
              }
            } else {
              console.log('DEBUG: system_user found', data.id);
              userData = data;
              
              // Try to get joined data separately or in a second pass if needed
              // For now, we'll just use the data we have and try to enrich it
              try {
                console.log('DEBUG: enriching user data');
                const { data: enrichedData } = await supabase
                  .from('system_users')
                  .select('employees!employee_id(full_name), access_profiles!profile_id(name)')
                  .eq('id', session.user.id)
                  .single();
                
                if (enrichedData) {
                  console.log('DEBUG: user data enriched');
                  userData = { ...userData, ...enrichedData };
                }
              } catch (enrichErr) {
                console.warn('Could not enrich user data with joins:', enrichErr);
              }
            }
          } catch (err: any) {
            console.error('Unexpected error fetching user details:', err?.message || err);
          }

          if (userData) {
            console.log('DEBUG: setting user state');
            const user = {
              id: userData.id,
              name: userData.employees?.full_name || userData.username || userData.full_name || session.user.email?.split('@')[0] || 'Usuário',
              email: userData.email || session.user.email || userData.username || '',
              role: getRoleFromUser(userData),
              profileId: userData.profile_id,
              companyId: userData.company_id
            };
            setUser(user);
            localStorage.setItem('erp_user', JSON.stringify(user));
          } else {
             console.log('DEBUG: using fallback user');
             // Fallback if user exists in Auth but not in system_users (should be rare due to trigger)
             console.warn('User in Auth but not in system_users, using fallback');
             const fallbackUser = {
                id: session.user.id,
                name: session.user.email || 'User',
                email: session.user.email || '',
                role: 'user'
             };
             setUser(fallbackUser);
             localStorage.setItem('erp_user', JSON.stringify(fallbackUser));
          }
        } else {
          console.log('DEBUG: no session found');
          // No Supabase session, clear local storage to force re-login
          // This prevents RLS errors on tables that require authentication
          localStorage.removeItem('erp_user');
          setUser(null);
        }

        console.log('DEBUG: setting isAuthReady to true');
        setIsAuthReady(true);

        // Fetch data in the background only if user is logged in
        if (session?.user) {
          console.log('DEBUG: calling fetchData');
          fetchData().then(() => {
            console.log('DEBUG: fetchData completed');
            setIsLoading(false);
            console.log('DEBUG: init completed');
          }).catch(err => {
            console.error('DEBUG: fetchData error', err);
            setIsLoading(false);
          });

          // Set up real-time subscriptions
          productsSubscription = supabase
            .channel('products-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchData(['products']))
            .subscribe();

          salesSubscription = supabase
            .channel('sales-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchData(['sales']))
            .subscribe();

          saleItemsSubscription = supabase
            .channel('sale-items-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, () => fetchData(['sales']))
            .subscribe();

          customersSubscription = supabase
            .channel('customers-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => fetchData(['customers']))
            .subscribe();

          suppliersSubscription = supabase
            .channel('suppliers-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => fetchData(['suppliers']))
            .subscribe();

          expensesSubscription = supabase
            .channel('expenses-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchData(['expenses']))
            .subscribe();

          registersSubscription = supabase
            .channel('registers-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_registers' }, () => fetchData(['cash_registers']))
            .subscribe();

          movimentosSubscription = supabase
            .channel('movements-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_movements' }, () => fetchData(['cash_movements']))
            .subscribe();

          categoriasSubscription = supabase
            .channel('categorias-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias' }, () => fetchData(['categorias']))
            .subscribe();

          subcategoriasSubscription = supabase
            .channel('subcategorias-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'subcategorias' }, () => fetchData(['subcategorias']))
            .subscribe();

          departamentosSubscription = supabase
            .channel('departamentos-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'departamentos' }, () => fetchData(['departamentos']))
            .subscribe();

          paymentMethodsSubscription = supabase
            .channel('payment-methods-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_methods' }, () => fetchData(['payment_methods']))
            .subscribe();

          promotionsSubscription = supabase
            .channel('promotions-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'promotions' }, () => fetchData(['promotions']))
            .subscribe();

          returnsSubscription = supabase
            .channel('returns-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'returns' }, () => fetchData(['returns']))
            .subscribe();
        } else {
          console.log('DEBUG: No session, skipping initial fetchData and subscriptions');
          setIsLoading(false);
          console.log('DEBUG: init completed (no session)');
        }

      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    return () => {
      if (productsSubscription) supabase.removeChannel(productsSubscription);
      if (salesSubscription) supabase.removeChannel(salesSubscription);
      if (saleItemsSubscription) supabase.removeChannel(saleItemsSubscription);
      if (customersSubscription) supabase.removeChannel(customersSubscription);
      if (suppliersSubscription) supabase.removeChannel(suppliersSubscription);
      if (expensesSubscription) supabase.removeChannel(expensesSubscription);
      if (registersSubscription) supabase.removeChannel(registersSubscription);
      if (movimentosSubscription) supabase.removeChannel(movimentosSubscription);
      if (categoriasSubscription) supabase.removeChannel(categoriasSubscription);
      if (subcategoriasSubscription) supabase.removeChannel(subcategoriasSubscription);
      if (departamentosSubscription) supabase.removeChannel(departamentosSubscription);
      if (paymentMethodsSubscription) supabase.removeChannel(paymentMethodsSubscription);
      if (promotionsSubscription) supabase.removeChannel(promotionsSubscription);
      if (returnsSubscription) supabase.removeChannel(returnsSubscription);
    };
  }, [fetchData]);

  const login = useCallback(async (username: string, password: string): Promise<{success: boolean, error?: string}> => {
    try {
      const cleanInput = username.trim();
      const cleanPassword = password;

      console.log('Attempting login for:', cleanInput);

      let emailToUse = cleanInput;

      // If input is not an email, try to find the email associated with the username
      if (!cleanInput.includes('@')) {
        try {
          // Call our server-side lookup API to bypass RLS
          const lookupResponse = await fetch('/api/auth/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanInput })
          });

          if (lookupResponse.ok) {
            const lookupData = await lookupResponse.json();
            if (lookupData.email) {
              emailToUse = lookupData.email;
              console.log('Found email for username via API:', emailToUse);
            } else {
              // Not found in DB, fallback to generated email
              if (cleanInput.toLowerCase() === 'admin' || cleanInput.toLowerCase() === 'administrador' || cleanInput.toLowerCase() === 'superadmin') {
                emailToUse = 'willmanssilva4@gmail.com';
              } else {
                const sanitizedUsername = cleanInput.toLowerCase().replace(/[^a-z0-9._-]/g, '');
                emailToUse = `${sanitizedUsername}@example.com`;
              }
              console.log('Using generated/fallback email (not found in DB):', emailToUse);
            }
          } else {
            console.error('Lookup API failed:', await lookupResponse.text());
            // Fallback
            const sanitizedUsername = cleanInput.toLowerCase().replace(/[^a-z0-9._-]/g, '');
            emailToUse = `${sanitizedUsername}@example.com`;
          }
        } catch (err) {
          console.error('Error during email lookup:', err);
          // Fallback
          const sanitizedUsername = cleanInput.toLowerCase().replace(/[^a-z0-9._-]/g, '');
          emailToUse = `${sanitizedUsername}@example.com`;
        }
      }

      // Check if Supabase is configured before trying to sign in
      const { isSupabaseConfigured } = require('./supabase');
      if (!isSupabaseConfigured) {
        return { 
          success: false, 
          error: 'O Supabase não está configurado. Por favor, adicione as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nos segredos do AI Studio.' 
        };
      }

      let authResult;
      try {
        const { isSupabaseConfigured } = require('./supabase');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        
        if (!isSupabaseConfigured) {
          return { 
            success: false, 
            error: `O Supabase não está configurado corretamente. URL atual: "${supabaseUrl.substring(0, 20)}...". Certifique-se de que a URL comece com https:// e a chave não esteja vazia nos Segredos do AI Studio.` 
          };
        }

        authResult = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password: cleanPassword,
        });
      } catch (err: any) {
        console.error('Network or fetch error during login:', err);
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        if (err?.message === 'Failed to fetch') {
          return { 
            success: false, 
            error: `Erro de rede ao conectar ao Supabase (${supabaseUrl.substring(0, 25)}...). Verifique se a URL está correta nos Segredos do AI Studio e se você tem conexão com a internet.` 
          };
        }
        return { success: false, error: `Erro de conexão: ${err?.message || 'Erro inesperado'}` };
      }

      const { data, error } = authResult;

      if (error) {
        console.error('Supabase Auth Login error:', error.message);
        return { success: false, error: `Login failed for email ${emailToUse}: ${error.message}` };
      }

      if (data.user) {
        // Fetch user details from system_users table
        let userData = null;
        try {
          // Try simple query first
          const { data: simpleData, error: userError } = await supabase
            .from('system_users')
            .select('*')
            .eq('id', data.user.id)
            .single();
          
          if (!userError && simpleData) {
            userData = simpleData;
            
            // Try to enrich
            try {
              const { data: enrichedData } = await supabase
                .from('system_users')
                .select('employees!employee_id(full_name), access_profiles!profile_id(name)')
                .eq('id', data.user.id)
                .single();
              
              if (enrichedData) {
                userData = { ...userData, ...enrichedData };
              }
            } catch (enrichErr) {
              console.warn('Could not enrich user data with joins:', enrichErr);
            }
          } else if (userError && userError.code !== 'PGRST116') {
            console.error('Error fetching system_user:', userError.message);
          }
        } catch (err: any) {
          console.error('Unexpected error fetching user details:', err?.message || err);
        }

        if (userData) {
          const user = {
            id: userData.id,
            name: userData.employees?.full_name || userData.username || userData.full_name || data.user.email?.split('@')[0] || 'Usuário',
            email: userData.email || data.user.email || emailToUse,
            role: getRoleFromUser(userData),
            profileId: userData.profile_id,
            companyId: userData.company_id
          };
          setUser(user);
          localStorage.setItem('erp_user', JSON.stringify(user));
        } else {
          console.warn('System user not found, using auth user data');
          // Fallback if system_users entry is missing
          const fallbackUser = {
            id: data.user.id,
            name: data.user.email || emailToUse,
            email: data.user.email || emailToUse,
            role: 'user'
          };
          setUser(fallbackUser);
          localStorage.setItem('erp_user', JSON.stringify(fallbackUser));
        }
        
        // Fetch data immediately after successful login
        await fetchData();
        
        return { success: true };
      }
      
      return { success: false, error: 'Unknown error occurred' };
    } catch (err: any) {
      console.error('Login error:', err);
      return { success: false, error: err.message || 'Unknown error occurred' };
    }
  }, [fetchData]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('erp_user');
    setUser(null);
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  }, []);

  const addProduct = useCallback(async (product: Product, skipFetch?: boolean): Promise<boolean> => {
    if (!user?.companyId) return false;

    // Check for duplicate SKU (code)
    const productSkuStr = product.sku ? String(product.sku).trim() : '';
    if (productSkuStr !== '') {
      const existingProduct = products.find(p => 
        p.sku && String(p.sku).toLowerCase() === productSkuStr.toLowerCase()
      );
      if (existingProduct) {
        setCustomAlert({
          message: "produto já cadastrado, código não pode ser cadastrado",
          type: 'error'
        });
        return false;
      }
    }
    
    let insertData = {
      company_id: user.companyId,
      name: product.name,
      subcategoria_id: product.subcategoria_id === '' ? undefined : product.subcategoria_id,
      sku: product.sku,
      cost_price: (product.costPrice === undefined || product.costPrice === null) ? 0 : Number(product.costPrice),
      sale_price: (product.salePrice === undefined || product.salePrice === null) ? 0 : Number(product.salePrice),
      wholesale_price: (product.wholesalePrice === undefined || product.wholesalePrice === null) ? 0 : Number(product.wholesalePrice),
      term_price: (product.termPrice === undefined || product.termPrice === null) ? 0 : Number(product.termPrice),
      wholesale_min_qty: (product.wholesaleMinQty === undefined || product.wholesaleMinQty === null) ? 0 : Number(product.wholesaleMinQty),
      club_price: (product.clubPrice === undefined || product.clubPrice === null) ? 0 : Number(product.clubPrice),
      stock: (product.stock === undefined || product.stock === null) ? 0 : Number(product.stock),
      min_stock: (product.minStock === undefined || product.minStock === null) ? 0 : Number(product.minStock),
      image: product.image,
      composition: product.composition,
      status: (product.status && String(product.status).trim().toLowerCase() === 'inativo') ? 'Inativo' : 'Ativo',
      codigo_mercadologico: product.codigo_mercadologico,
      validade: product.validade || null,
      has_had_stock: product.stock > 0,
      control_stock: product.controlStock,
      category: product.category,
      subgroup: product.subgroup,
      product_type: product.product_type || 'SALE',
      base_product_id: product.base_product_id || null,
      conversion_factor: (product.conversion_factor === undefined || product.conversion_factor === null || String(product.conversion_factor) === '') ? 1 : Number(product.conversion_factor),
      gramatura: product.gramatura,
      tipo_embalagem: product.tipo_embalagem,
      segmento: product.segmento,
      brand: product.brand,
      section: product.section,
      supplier: product.supplier
    };

    let { data, error } = await supabase.from('products').insert([insertData]).select();

    // Fallback if composition or status column doesn't exist
    if (error && error.message && (error.message.includes('composition') || error.message.includes('status') || error.message.includes('codigo_mercadologico') || error.message.includes('validade') || error.message.includes('category') || error.message.includes('subgroup') || error.message.includes('wholesale_price') || error.message.includes('term_price') || error.message.includes('club_price') || error.message.includes('control_stock') || error.message.includes('product_type') || error.message.includes('base_product_id') || error.message.includes('conversion_factor') || error.message.includes('gramatura') || error.message.includes('tipo_embalagem') || error.message.includes('segmento') || error.message.includes('brand') || error.message.includes('section') || error.message.includes('supplier'))) {
      console.warn('Alguma coluna não encontrada no Supabase. Tentando salvar sem campos extras...');
      if (error.message.includes('composition')) delete (insertData as any).composition;
      if (error.message.includes('status')) delete (insertData as any).status;
      if (error.message.includes('codigo_mercadologico')) delete (insertData as any).codigo_mercadologico;
      if (error.message.includes('validade')) delete (insertData as any).validade;
      if (error.message.includes('category')) delete (insertData as any).category;
      if (error.message.includes('subgroup')) delete (insertData as any).subgroup;
      if (error.message.includes('wholesale_price')) delete (insertData as any).wholesale_price;
      if (error.message.includes('term_price')) delete (insertData as any).term_price;
      if (error.message.includes('wholesale_min_qty')) delete (insertData as any).wholesale_min_qty;
      if (error.message.includes('club_price')) delete (insertData as any).club_price;
      if (error.message.includes('control_stock')) delete (insertData as any).control_stock;
      if (error.message.includes('product_type')) delete (insertData as any).product_type;
      if (error.message.includes('base_product_id')) delete (insertData as any).base_product_id;
      if (error.message.includes('conversion_factor')) delete (insertData as any).conversion_factor;
      if (error.message.includes('gramatura')) delete (insertData as any).gramatura;
      if (error.message.includes('tipo_embalagem')) delete (insertData as any).tipo_embalagem;
      if (error.message.includes('segmento')) delete (insertData as any).segmento;
      if (error.message.includes('brand')) delete (insertData as any).brand;
      if (error.message.includes('section')) delete (insertData as any).section;
      if (error.message.includes('supplier')) delete (insertData as any).supplier;
      
      const retry = await supabase.from('products').insert([insertData]).select();
      data = retry.data;
      error = retry.error;
      
      if (!error && !skipFetch) {
        setCustomAlert({
          message: 'Produto salvo, mas alguns campos (como Tipo de Produto, Produto Base ou Fator de Conversão) não foram salvos porque as colunas correspondentes não existem no seu banco de dados Supabase. Por favor, execute o script SQL de correção de schema (update_product_types.sql) no seu painel do Supabase.',
          type: 'warning'
        });
      }
    }

    if (error) {
      console.error('Error adding product:', error.message, error.details, error.hint, error);
      setCustomAlert({
        message: `Erro ao adicionar produto: ${error.message || JSON.stringify(error)}`,
        type: 'error'
      });
      return false;
    } else if (data) {
      if (!skipFetch) {
        // Update local state manually to include fields that might not be in DB yet
        const newProduct = { ...product, ...insertData, id: data[0].id };
        setProducts(prev => [newProduct as Product, ...prev]);
      }
      return true;
    }
    return false;
  }, [user?.companyId, products, setCustomAlert]);

  const updateProduct = useCallback(async (updated: Product): Promise<boolean> => {
    if (!user?.companyId) return false;

    // Check for duplicate SKU (code) excluding current product
    const updatedSkuStr = updated.sku ? String(updated.sku).trim() : '';
    if (updatedSkuStr !== '') {
      const existingProduct = products.find(p => 
        p.id !== updated.id && 
        p.sku && String(p.sku).toLowerCase() === updatedSkuStr.toLowerCase()
      );
      if (existingProduct) {
        setCustomAlert({
          message: "produto já cadastrado, código não pode ser cadastrado",
          type: 'error'
        });
        return false;
      }
    }

    let updateData = {
      company_id: user.companyId,
      name: updated.name,
      subcategoria_id: updated.subcategoria_id === '' ? null : updated.subcategoria_id,
      sku: updated.sku,
      cost_price: (updated.costPrice === undefined || updated.costPrice === null || String(updated.costPrice) === '') ? 0 : Number(updated.costPrice),
      sale_price: (updated.salePrice === undefined || updated.salePrice === null || String(updated.salePrice) === '') ? 0 : Number(updated.salePrice),
      wholesale_price: (updated.wholesalePrice === undefined || updated.wholesalePrice === null || String(updated.wholesalePrice) === '') ? 0 : Number(updated.wholesalePrice),
      term_price: (updated.termPrice === undefined || updated.termPrice === null || String(updated.termPrice) === '') ? 0 : Number(updated.termPrice),
      wholesale_min_qty: (updated.wholesaleMinQty === undefined || updated.wholesaleMinQty === null || String(updated.wholesaleMinQty) === '') ? 0 : Number(updated.wholesaleMinQty),
      club_price: (updated.clubPrice === undefined || updated.clubPrice === null || String(updated.clubPrice) === '') ? 0 : Number(updated.clubPrice),
      stock: (updated.stock === undefined || updated.stock === null || String(updated.stock) === '') ? 0 : Number(updated.stock),
      min_stock: (updated.minStock === undefined || updated.minStock === null || String(updated.minStock) === '') ? 0 : Number(updated.minStock),
      image: updated.image,
      composition: updated.composition,
      status: ((updated.status && String(updated.status).trim().toLowerCase() === 'inativo') ? 'Inativo' : 'Ativo') as 'Ativo' | 'Inativo',
      codigo_mercadologico: updated.codigo_mercadologico === '' ? null : updated.codigo_mercadologico,
      validade: updated.validade || undefined,
      has_had_stock: updated.stock > 0 || updated.has_had_stock,
      control_stock: updated.controlStock,
      category: updated.category === '' ? null : updated.category,
      subgroup: updated.subgroup === '' ? null : updated.subgroup,
      product_type: updated.product_type || 'SALE',
      base_product_id: updated.base_product_id || undefined,
      conversion_factor: (updated.conversion_factor === undefined || updated.conversion_factor === null || String(updated.conversion_factor) === '') ? 1 : Number(updated.conversion_factor),
      gramatura: updated.gramatura,
      tipo_embalagem: updated.tipo_embalagem,
      segmento: updated.segmento,
      brand: updated.brand,
      section: updated.section,
      supplier: updated.supplier
    };

    let { error } = await supabase.from('products').update(updateData).eq('id', updated.id);

    // Fallback if composition or status column doesn't exist
    if (error && error.message && (error.message.includes('composition') || error.message.includes('status') || error.message.includes('codigo_mercadologico') || error.message.includes('validade') || error.message.includes('category') || error.message.includes('subgroup') || error.message.includes('wholesale_price') || error.message.includes('term_price') || error.message.includes('club_price') || error.message.includes('control_stock') || error.message.includes('product_type') || error.message.includes('base_product_id') || error.message.includes('conversion_factor') || error.message.includes('gramatura') || error.message.includes('tipo_embalagem') || error.message.includes('segmento') || error.message.includes('brand') || error.message.includes('section') || error.message.includes('supplier'))) {
      console.warn('Alguma coluna não encontrada no Supabase. Tentando salvar sem campos extras...');
      if (error.message.includes('composition')) delete (updateData as any).composition;
      if (error.message.includes('status')) delete (updateData as any).status;
      if (error.message.includes('codigo_mercadologico')) delete (updateData as any).codigo_mercadologico;
      if (error.message.includes('validade')) delete (updateData as any).validade;
      if (error.message.includes('category')) delete (updateData as any).category;
      if (error.message.includes('subgroup')) delete (updateData as any).subgroup;
      if (error.message.includes('wholesale_price')) delete (updateData as any).wholesale_price;
      if (error.message.includes('term_price')) delete (updateData as any).term_price;
      if (error.message.includes('wholesale_min_qty')) delete (updateData as any).wholesale_min_qty;
      if (error.message.includes('club_price')) delete (updateData as any).club_price;
      if (error.message.includes('control_stock')) delete (updateData as any).control_stock;
      if (error.message.includes('product_type')) delete (updateData as any).product_type;
      if (error.message.includes('base_product_id')) delete (updateData as any).base_product_id;
      if (error.message.includes('conversion_factor')) delete (updateData as any).conversion_factor;
      if (error.message.includes('gramatura')) delete (updateData as any).gramatura;
      if (error.message.includes('tipo_embalagem')) delete (updateData as any).tipo_embalagem;
      if (error.message.includes('segmento')) delete (updateData as any).segmento;
      if (error.message.includes('brand')) delete (updateData as any).brand;
      if (error.message.includes('section')) delete (updateData as any).section;
      if (error.message.includes('supplier')) delete (updateData as any).supplier;

      const retry = await supabase.from('products').update(updateData).eq('id', updated.id);
      error = retry.error;
      
      if (!error) {
        setCustomAlert({
          message: 'Produto atualizado, mas alguns campos (como Tipo de Produto, Produto Base ou Fator de Conversão) não foram salvos porque as colunas correspondentes não existem no seu banco de dados Supabase. Por favor, execute o script SQL de correção de schema (update_product_types.sql) no seu painel do Supabase.',
          type: 'warning'
        });
      }
    }

    if (error) {
      console.error('Error updating product:', error.message, error.details, error.hint, error);
      setCustomAlert({
        message: `Erro ao atualizar produto: ${error.message || JSON.stringify(error)}`,
        type: 'error'
      });
      return false;
    } else {
      // Update local state manually to include fields that might not be in DB yet
      setProducts(prev => prev.map(p => {
        if (p.id === updated.id) {
          const merged = { ...p, ...updated, ...updateData };
          if (merged.subcategoria_id === null) delete merged.subcategoria_id;
          if (merged.codigo_mercadologico === null) delete merged.codigo_mercadologico;
          if (merged.category === null) delete merged.category;
          if (merged.subgroup === null) delete merged.subgroup;
          return merged as Product;
        }
        return p;
      }));
      return true;
    }
  }, [user?.companyId, products, setCustomAlert]);

  const deleteProduct = useCallback(async (id: string) => {
    console.log('Tentando excluir produto:', id);
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        console.error('Error deleting product from Supabase:', error);
        throw error;
      }
      console.log('Produto excluído com sucesso');
      await fetchData();
    } catch (error) {
      console.error('deleteProduct failed:', error);
      throw error;
    }
  }, [fetchData]);

  const addSale = useCallback(async (sale: Omit<Sale, 'id'>): Promise<Sale | null> => {
    console.log('DEBUG: addSale recebendo:', sale);
    const tempId = Math.random().toString(36).substring(2, 9);
    const newSale: Sale = { ...sale, id: tempId };

    try {
      let saleData, saleError;
      
      const insertPayload = {
        company_id: user?.companyId || null,
        customer_id: sale.customerId || null,
        total: sale.total,
        subtotal: sale.subtotal || sale.total,
        discount: sale.discount || 0,
        payment_method: sale.paymentMethod,
        maquininha_id: sale.maquininhaId || null,
        tax_amount: sale.taxAmount || 0,
        net_amount: sale.netAmount || sale.total,
        payments: sale.payments || null,
        date: sale.date,
        user_id: user?.id || null,
        cash_register_id: activeRegister?.id || null
      };

      console.log('DEBUG: insertPayload para Supabase:', insertPayload);

      const res = await supabase.from('sales').insert([insertPayload]).select();
      saleData = res.data;
      saleError = res.error;

      // If it fails, try a more robust fallback
      if (saleError) {
        console.warn('Sale insert failed, trying fallback...', { error: saleError, status: res.status });
        
        const errorMsg = saleError.message?.toLowerCase() || '';
        const safePayload: any = {
          company_id: user?.companyId || null,
          total: sale.total,
          payment_method: ['Dinheiro', 'Pix', 'Crédito', 'Débito', 'Fiado'].includes(sale.paymentMethod) ? sale.paymentMethod : 'Dinheiro',
          date: sale.date
        };

        if (!errorMsg.includes('user_id')) safePayload.user_id = user?.id || null;
        if (!errorMsg.includes('cash_register_id')) safePayload.cash_register_id = activeRegister?.id || null;

        if (!errorMsg.includes('subtotal')) safePayload.subtotal = sale.subtotal || sale.total;
        if (!errorMsg.includes('discount')) safePayload.discount = sale.discount || 0;
        if (!errorMsg.includes('tax_amount')) safePayload.tax_amount = sale.taxAmount || 0;
        if (!errorMsg.includes('net_amount')) safePayload.net_amount = sale.netAmount || sale.total;
        if (!errorMsg.includes('payments')) safePayload.payments = sale.payments || null;
        if (!errorMsg.includes('maquininha_id')) safePayload.maquininha_id = sale.maquininhaId || null;

        const fallbackRes = await supabase.from('sales').insert([safePayload]).select();
        
        if (!fallbackRes.error) {
          saleData = fallbackRes.data;
          saleError = null;
        } else {
          console.error('Fallback insert also failed:', fallbackRes.error);
          const absoluteMinimal = {
            company_id: user?.companyId || null,
            total: sale.total,
            payment_method: 'Dinheiro', // Use a guaranteed valid method for the absolute fallback
            date: sale.date
          };
          const finalRes = await supabase.from('sales').insert([absoluteMinimal]).select();
          if (!finalRes.error) {
            saleData = finalRes.data;
            saleError = null;
          }
        }
      }

      if (saleError) {
        console.error('Final Supabase error inserting sale:', saleError);
        try {
          console.error('Detailed Error:', JSON.stringify(saleError, Object.getOwnPropertyNames(saleError)));
        } catch (e) {
          console.error('Could not stringify error object');
        }
        const errorMsg = saleError.message || saleError.details || saleError.hint || saleError.code || JSON.stringify(saleError);
        alert(`Erro ao salvar venda: ${errorMsg === '{}' ? `Erro de conexão, permissão ou restrição de banco de dados (Status: ${res.status})` : errorMsg}`);
        return null;
      } else if (!saleData || saleData.length === 0) {
        console.warn('Sale inserted but no data returned. RLS might be preventing SELECT.');
        alert('Venda salva, mas os itens não puderam ser salvos devido a permissões (RLS).');
        return null;
      }

      if (!saleError && saleData && saleData.length > 0) {
        const saleId = saleData[0].id;
        
        // Log Audit
        await logAuditAction('venda', 'vendas', saleId, null, sale);

        const itemsToInsert = sale.items.map(item => {
          return {
            company_id: user?.companyId || null,
            sale_id: saleId,
            product_id: item.productId,
            quantity: item.quantity,
            price: item.price,
            original_price: item.originalPrice || item.price,
            discount: item.discount || 0,
            promotion_id: item.promotionId || null
          };
        });
        
        console.log('Payload sale_items:', itemsToInsert);

        let { error: itemsError } = await supabase.from('sale_items').insert(itemsToInsert);
        
        if (itemsError && itemsError.message && itemsError.message.includes('column')) {
          console.warn('Retrying sale_items insert without extra columns due to schema error...');
          const fallbackItems = sale.items.map(item => ({
            company_id: user?.companyId || null,
            sale_id: saleId,
            product_id: item.productId,
            quantity: item.quantity,
            price: item.price
          }));
          const fallbackRes = await supabase.from('sale_items').insert(fallbackItems);
          itemsError = fallbackRes.error;
        }

        if (itemsError) {
          console.error('Supabase error inserting sale items:', itemsError);
          alert(`Aviso: A venda foi salva, mas ocorreu um erro ao salvar os itens: ${itemsError.message}`);
        }
        
        // Update stock and customer total spent in Supabase
        for (const item of sale.items) {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            // Record stock movement
            const movePayload = {
              company_id: user?.companyId || null,
              product_id: item.productId,
              type: 'SAÍDA',
              quantity: -item.quantity,
              origin: `Venda #${saleId.substring(0, 8)}`,
              date: sale.date,
              user_id: user?.id || 'Sistema',
              user_name: user?.name || 'Sistema'
            };
            
            let { error: moveError } = await supabase.from('stock_movements').insert([movePayload]);
            
            if (moveError) {
              console.error('Supabase error inserting stock movement:', JSON.stringify(moveError));
              alert(`Erro ao registrar movimentação de estoque: ${JSON.stringify(moveError)}`);
            }

            if (product.product_type === 'SALE' && product.base_product_id && product.conversion_factor) {
              const baseProduct = products.find(p => p.id === product.base_product_id);
              if (baseProduct) {
                const qtyToDeduct = item.quantity * product.conversion_factor;
                await supabase.from('products').update({ 
                  company_id: user?.companyId || null, 
                  stock: baseProduct.stock - qtyToDeduct 
                }).eq('id', baseProduct.id);
              }
            }

            if (product.composition && product.composition.length > 0) {
              // It's a kit, deduct from components
              for (const comp of product.composition) {
                const componentProduct = products.find(p => p.id === comp.productId);
                if (componentProduct) {
                  // FIFO for components
                  const componentLotes = lotes
                    .filter(l => l.productId === componentProduct.id && l.saldoAtual > 0)
                    .sort((a, b) => new Date(a.dataEntrada).getTime() - new Date(b.dataEntrada).getTime());
                  
                  let qtyToDeduct = comp.quantity * item.quantity;
                  for (const lote of componentLotes) {
                    if (qtyToDeduct <= 0) break;
                    const deduction = Math.min(lote.saldoAtual, qtyToDeduct);
                    await supabase.from('produto_lotes').update({ company_id: user?.companyId || null, saldo_atual: lote.saldoAtual - deduction }).eq('id', lote.id);
                    qtyToDeduct -= deduction;
                  }

                  await supabase.from('products').update({ 
                    company_id: user?.companyId || null,
                    stock: componentProduct.stock - (comp.quantity * item.quantity) 
                  }).eq('id', componentProduct.id);
                }
              }
            } else {
              // Regular product - FIFO
              const productLotes = lotes
                .filter(l => l.productId === product.id && l.saldoAtual > 0)
                .sort((a, b) => new Date(a.dataEntrada).getTime() - new Date(b.dataEntrada).getTime());
              
              let qtyToDeduct = item.quantity;
              for (const lote of productLotes) {
                if (qtyToDeduct <= 0) break;
                const deduction = Math.min(lote.saldoAtual, qtyToDeduct);
                await supabase.from('produto_lotes').update({ company_id: user?.companyId || null, saldo_atual: lote.saldoAtual - deduction }).eq('id', lote.id);
                qtyToDeduct -= deduction;
              }

              await supabase.from('products').update({ company_id: user?.companyId || null, stock: product.stock - item.quantity }).eq('id', product.id);
            }
          }
        }

        if (sale.customerId) {
          const customer = customers.find(c => c.id === sale.customerId);
          if (customer) {
            await supabase.from('customers').update({ company_id: user?.companyId || null, total_spent: customer.totalSpent + sale.total }).eq('id', customer.id);
          }
        }

        await fetchData();
        
        return { ...sale, id: saleId };
      }
      return null;
    } catch (err: any) {
      console.error('Error in addSale Supabase sync:', err);
      alert(`Erro inesperado ao salvar venda no banco de dados: ${err.message || JSON.stringify(err)}`);
      return null;
    }
  }, [user, activeRegister, logAuditAction, products, lotes, customers, fetchData]);

  const addVoucher = useCallback(async (voucherData: Omit<Voucher, 'id' | 'createdAt'>): Promise<Voucher | null> => {
    try {
      const { data: res, error } = await supabase
        .from('vouchers')
        .insert([{
          company_id: user?.companyId || null,
          code: voucherData.code,
          initial_value: voucherData.initialValue,
          current_value: voucherData.currentValue,
          customer_id: voucherData.customerId,
          sale_id: voucherData.saleId,
          return_id: voucherData.returnId,
          status: voucherData.status
        }])
        .select();

      if (error) {
        console.error('Error inserting voucher:', error);
        // Fallback
        const newVoucher: Voucher = {
          ...voucherData,
          id: Math.random().toString(36).substring(2, 9),
          createdAt: new Date().toISOString()
        };
        setVouchers(prev => [...prev, newVoucher]);
        return newVoucher;
      }

      if (res && res.length > 0) {
        const mapped = {
          id: res[0].id,
          code: res[0].code,
          initialValue: Number(res[0].initial_value),
          currentValue: Number(res[0].current_value),
          customerId: res[0].customer_id,
          saleId: res[0].sale_id,
          returnId: res[0].return_id,
          status: res[0].status,
          createdAt: res[0].created_at
        };
        setVouchers(prev => [...prev, mapped]);
        return mapped;
      }
      return null;
    } catch (err) {
      console.error('Error in addVoucher:', err);
      return null;
    }
  }, [user]);

  const updateVoucher = useCallback(async (voucher: Voucher): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('vouchers')
        .update({
          current_value: voucher.currentValue,
          status: voucher.status
        })
        .eq('id', voucher.id);

      if (error) {
        console.error('Error updating voucher:', error);
        setVouchers(prev => prev.map(v => v.id === voucher.id ? voucher : v));
        return true;
      }

      setVouchers(prev => prev.map(v => v.id === voucher.id ? voucher : v));
      return true;
    } catch (err) {
      console.error('Error in updateVoucher:', err);
      return false;
    }
  }, []);

  const getVoucherByCode = useCallback((code: string) => {
    return vouchers.find(v => v.code.toUpperCase() === code.toUpperCase() && v.status === 'Ativo');
  }, [vouchers]);

  const addReturn = useCallback(async (returnData: Omit<Return, 'id'>): Promise<boolean> => {
    try {
      let voucherCode = returnData.voucherCode;

      // Handle Store Credit by generating a voucher if not already provided
      if (returnData.refundMethod === 'Crédito em Loja' && !voucherCode) {
        voucherCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      }

      const { data: returnRes, error: returnError } = await supabase
        .from('returns')
        .insert([{
          company_id: user?.companyId || null,
          sale_id: returnData.saleId,
          date: returnData.date,
          total: returnData.total,
          type: returnData.type,
          refund_method: returnData.refundMethod,
          user_id: user?.id || null,
          status: returnData.status,
          voucher_code: voucherCode
        }])
        .select();

      if (returnError) {
        console.error('Error inserting return:', JSON.stringify(returnError, null, 2));
        // Fallback for local state if Supabase fails (e.g. table doesn't exist yet)
        const tempId = Math.random().toString(36).substring(2, 9);
        const newReturn = { ...returnData, id: tempId };
        setReturns(prev => [...prev, newReturn]);
        return true; 
      }

      if (returnRes && returnRes.length > 0) {
        const returnId = returnRes[0].id;

        // Create the voucher if needed
        if (returnData.refundMethod === 'Crédito em Loja' && voucherCode) {
          await addVoucher({
            code: voucherCode,
            initialValue: returnData.total,
            currentValue: returnData.total,
            saleId: returnData.saleId,
            returnId: returnId,
            status: 'Ativo'
          });
        }

        const itemsToInsert = returnData.items.map(item => ({
          company_id: user?.companyId || null,
          return_id: returnId,
          product_id: item.productId,
          quantity: item.quantity,
          price: item.price,
          reason: item.reason
        }));

        await supabase.from('return_items').insert(itemsToInsert);

        // Update stock
        for (const item of returnData.items) {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            // Record stock movement
            await supabase.from('stock_movements').insert([{
              company_id: user?.companyId || null,
              product_id: item.productId,
              type: 'ENTRADA',
              quantity: item.quantity,
              origin: `Devolução #${returnId.substring(0, 8)}`,
              date: returnData.date,
              user_id: user?.id || 'Sistema',
              user_name: user?.name || 'Sistema'
            }]);

            await supabase.from('products').update({ 
              company_id: user?.companyId || null, 
              stock: product.stock + item.quantity,
              has_had_stock: true 
            }).eq('id', product.id);
          }
        }

        // Update the original sale to reflect the return and refund taxes
        if (returnData.saleId) {
          const originalSale = sales.find(s => s.id === returnData.saleId);
          if (originalSale) {
            const newTotal = Math.max(0, originalSale.total - returnData.total);
            const taxRatio = originalSale.total > 0 ? (originalSale.taxAmount || 0) / originalSale.total : 0;
            const newTaxAmount = newTotal * taxRatio;
            const newNetAmount = newTotal - newTaxAmount;
            const newSubtotal = Math.max(0, (originalSale.subtotal || originalSale.total) - returnData.total);

            await supabase.from('sales').update({
              total: newTotal,
              subtotal: newSubtotal,
              tax_amount: newTaxAmount,
              net_amount: newNetAmount
            }).eq('id', originalSale.id);

            // Update sale_items
            for (const item of returnData.items) {
              const saleItem = originalSale.items.find(si => si.productId === item.productId);
              if (saleItem) {
                const newQuantity = saleItem.quantity - item.quantity;
                if (newQuantity <= 0) {
                  await supabase.from('sale_items').delete().eq('sale_id', originalSale.id).eq('product_id', item.productId);
                } else {
                  await supabase.from('sale_items').update({
                    quantity: newQuantity
                  }).eq('sale_id', originalSale.id).eq('product_id', item.productId);
                }
              }
            }
          }
        }

        // If refund method is cash, record cash movement
        if (returnData.refundMethod === 'Dinheiro' && activeRegister) {
          await addCashMovement({
            cashRegisterId: activeRegister.id,
            type: 'sangria',
            amount: returnData.total,
            reason: `Devolução Venda ${returnData.saleId ? '#' + returnData.saleId.substring(0, 8) : ''}`
          });
        }

        await logAuditAction('devolução', 'vendas', returnId, null, returnData);
        await fetchData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding return:', error);
      return false;
    }
  }, [user, products, sales, activeRegister, addCashMovement, logAuditAction, fetchData]);

  const addDiscountLog = useCallback(async (log: Omit<DiscountLog, 'id'>) => {
    const { error } = await supabase.from('vendas_descontos').insert([{
      company_id: user?.companyId || null,
      venda_id: log.saleId,
      produto_id: log.productId,
      tipo: log.type,
      percentual: log.percentage,
      valor: log.value,
      usuario_aplicou: log.appliedBy,
      usuario_autorizou: log.authorizedBy,
      motivo: log.reason,
      data_hora: log.date
    }]);

    if (!error) {
      await logAuditAction('desconto', 'vendas', log.saleId || 'item', null, log);
      await fetchData();
    } else {
      console.error('Error adding discount log:', error);
    }
  }, [user, logAuditAction, fetchData]);

  const addCustomer = useCallback(async (customer: Customer) => {
    const { error } = await supabase.from('customers').insert([{
      company_id: user?.companyId || null,
      name: customer.name,
      document: customer.document,
      phone: customer.phone,
      email: customer.email,
      total_spent: customer.totalSpent,
      status: customer.status,
      image: customer.image,
      is_club_member: customer.isClubMember,
      club_join_date: customer.clubJoinDate
    }]);

    if (!error) {
      await fetchData();
    }
  }, [user, fetchData]);

  const addSupplier = useCallback(async (supplier: Supplier) => {
    const { error } = await supabase.from('suppliers').insert([{
      company_id: user?.companyId || null,
      name: supplier.name,
      document: supplier.document,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address
    }]);

    if (!error) {
      await fetchData();
    }
  }, [user, fetchData]);

  const updateSupplier = useCallback(async (supplier: Supplier) => {
    const { error } = await supabase.from('suppliers').update({
      company_id: user?.companyId || null,
      name: supplier.name,
      document: supplier.document,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address
    }).eq('id', supplier.id);
    if (!error) await fetchData();
    else console.error('Error updating supplier:', error);
  }, [user, fetchData]);

  const deleteSupplier = useCallback(async (id: string) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (!error) await fetchData();
    else console.error('Error deleting supplier:', error);
  }, [fetchData]);

  const addLoss = useCallback(async (loss: Omit<Loss, 'id'>) => {
    const { error } = await supabase.from('losses').insert([{
      company_id: user?.companyId || null,
      product_id: loss.productId,
      lote_id: loss.loteId,
      quantity: loss.quantity,
      reason: loss.reason,
      date: loss.date,
      total_value: loss.totalValue
    }]);

    if (!error) {
      const product = products.find(p => p.id === loss.productId);
      if (product) {
        // Record stock movement
        await supabase.from('stock_movements').insert([{
          company_id: user?.companyId || null,
          product_id: loss.productId,
          type: 'SAÍDA',
          quantity: -loss.quantity,
          origin: `Perda: ${loss.reason}${loss.loteId ? ` (Lote: ${lotes.find(l => l.id === loss.loteId)?.numeroLote})` : ''}`,
          date: loss.date,
          user_id: user?.email || 'system',
          user_name: user?.name || 'Sistema'
        }]);

        if (product.composition && product.composition.length > 0) {
          // It's a kit, deduct from components
          for (const comp of product.composition) {
            const componentProduct = products.find(p => p.id === comp.productId);
            if (componentProduct) {
              // FIFO for components
              const componentLotes = lotes
                .filter(l => l.productId === componentProduct.id && l.saldoAtual > 0)
                .sort((a, b) => new Date(a.dataEntrada).getTime() - new Date(b.dataEntrada).getTime());
              
              let qtyToDeduct = comp.quantity * loss.quantity;
              for (const lote of componentLotes) {
                if (qtyToDeduct <= 0) break;
                const deduction = Math.min(lote.saldoAtual, qtyToDeduct);
                await supabase.from('produto_lotes').update({ company_id: user?.companyId || null, saldo_atual: lote.saldoAtual - deduction }).eq('id', lote.id);
                qtyToDeduct -= deduction;
              }

              await supabase.from('products').update({ 
                company_id: user?.companyId || null,
                stock: componentProduct.stock - (comp.quantity * loss.quantity) 
              }).eq('id', componentProduct.id);
            }
          }
        } else {
          // Regular product
          if (loss.loteId) {
            // Specific lote selected
            const lote = lotes.find(l => l.id === loss.loteId);
            if (lote) {
              await supabase.from('produto_lotes').update({ 
                company_id: user?.companyId || null,
                saldo_atual: lote.saldoAtual - loss.quantity 
              }).eq('id', lote.id);
            }
          } else {
            // No specific lote, follow FIFO (PEPS)
            const productLotes = lotes
              .filter(l => l.productId === product.id && l.saldoAtual > 0)
              .sort((a, b) => new Date(a.dataEntrada).getTime() - new Date(b.dataEntrada).getTime());
            
            let qtyToDeduct = loss.quantity;
            for (const lote of productLotes) {
              if (qtyToDeduct <= 0) break;
              const deduction = Math.min(lote.saldoAtual, qtyToDeduct);
              await supabase.from('produto_lotes').update({ company_id: user?.companyId || null, saldo_atual: lote.saldoAtual - deduction }).eq('id', lote.id);
              qtyToDeduct -= deduction;
            }
          }

          await supabase.from('products').update({
            company_id: user?.companyId || null,
            stock: product.stock - loss.quantity
          }).eq('id', product.id);
        }
      }
      await fetchData();
    } else {
      console.error('Error adding loss:', JSON.stringify(error, null, 2), error);
      throw new Error('Failed to add loss');
    }
  }, [user, products, lotes, fetchData]);

  const addExpense = useCallback(async (expense: Omit<Expense, 'id'>) => {
    const { error } = await supabase.from('expenses').insert([{
      company_id: user?.companyId || null,
      description: expense.description,
      category: expense.category,
      supplier: expense.supplier,
      amount: expense.amount,
      issue_date: expense.issueDate,
      due_date: expense.dueDate,
      payment_date: expense.paymentDate,
      payment_method: expense.paymentMethod,
      financial_account: expense.financialAccount,
      observation: expense.observation,
      is_recurring: expense.isRecurring,
      frequency: expense.frequency,
      status: expense.status,
      origin: expense.origin,
      type: expense.type,
      interest: expense.interest || 0,
      discount: expense.discount || 0,
      payment_type: expense.paymentType
    }]);

    if (!error) {
      // If added as "Pago", record cash movement if account is "Caixa"
      if (expense.status === 'Pago' && expense.financialAccount === 'Caixa') {
        const storedUser = localStorage.getItem('erp_user');
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        const activeReg = cashRegisters.find(r => r.status === 'open');
        
        if (activeReg) {
          await supabase.from('cash_movements').insert([{
            company_id: user?.companyId || null,
            cash_register_id: activeReg.id,
            type: 'sangria',
            amount: expense.amount,
            reason: `Despesa: ${expense.description}`,
            created_by: currentUser?.id
          }]);
        }
      }
      await fetchData();
    } else {
      console.error('Error adding expense:', JSON.stringify(error, null, 2), error);
      throw new Error('Failed to add expense');
    }
  }, [user, cashRegisters, fetchData]);

  const addStockMovement = useCallback(async (movement: Omit<StockMovement, 'id'>, skipFetch?: boolean) => {
    const { error } = await supabase.from('stock_movements').insert([{
      company_id: user?.companyId || null,
      product_id: movement.productId,
      lote_id: movement.loteId,
      type: movement.type,
      quantity: movement.quantity,
      cost: movement.cost,
      origin: movement.origin,
      date: movement.date,
      user_id: movement.userId,
      user_name: movement.userName
    }]);

    if (!error) {
      const product = products.find(p => p.id === movement.productId);
      if (product) {
        const updatePayload: any = { company_id: user?.companyId || null };
        
        if (product.product_type === 'SALE' && product.base_product_id && product.conversion_factor) {
          const baseProduct = products.find(p => p.id === product.base_product_id);
          if (baseProduct) {
            const qtyToAdd = movement.quantity * product.conversion_factor;
            await supabase.from('products').update({
              company_id: user?.companyId || null,
              stock: baseProduct.stock + qtyToAdd
            }).eq('id', baseProduct.id);
          }
        }

        if (movement.type !== 'COMPRA') {
          updatePayload.stock = product.stock + movement.quantity;
        }
        
        // Se a movimentação for de entrada (positiva), marca que o produto já teve estoque
        if (movement.quantity > 0) {
          updatePayload.has_had_stock = true;
        }
        
        if (Object.keys(updatePayload).length > 1) {
          await supabase.from('products').update(updatePayload).eq('id', product.id);
        }
      }
      if (!skipFetch) {
        await fetchData();
      }
    } else {
      console.error('Error adding stock movement:', JSON.stringify(error, null, 2), error);
      alert('Erro ao registrar movimentação. Verifique se a tabela "stock_movements" existe no Supabase.');
      throw new Error('Failed to add stock movement');
    }
  }, [user, products, fetchData]);

  const addInventory = useCallback(async (inventory: Omit<Inventory, 'id'>, skipFetch?: boolean) => {
    const { error } = await supabase.from('inventories').insert([{
      company_id: user?.companyId || null,
      date: inventory.date,
      location: inventory.location,
      items_counted: inventory.itemsCounted,
      divergence_value: inventory.divergenceValue,
      status: inventory.status,
      type: inventory.type,
      responsible: inventory.responsible,
      notes: inventory.notes
    }]);

    if (!error) {
      if (!skipFetch) await fetchData();
      return true;
    } else {
      console.error('Error adding inventory:', JSON.stringify(error, null, 2), error);
      // Fallback if columns don't exist yet - try without new columns
      const { error: retryError } = await supabase.from('inventories').insert([{
        company_id: user?.companyId || null,
        date: inventory.date,
        location: inventory.location,
        items_counted: inventory.itemsCounted,
        divergence_value: inventory.divergenceValue,
        status: inventory.status,
        notes: inventory.notes
      }]);
      
      if (!retryError) {
        if (!skipFetch) await fetchData();
        return true;
      } else {
        console.error('Retry error adding inventory:', JSON.stringify(retryError, null, 2), retryError);
        alert('Erro ao registrar inventário. Verifique se a tabela "inventories" existe no Supabase.');
        throw new Error('Failed to add inventory');
      }
    }
  }, [user, fetchData]);

  const updateCustomer = useCallback(async (customer: Customer) => {
    const { error } = await supabase.from('customers').update({
      company_id: user?.companyId || null,
      name: customer.name,
      document: customer.document,
      phone: customer.phone,
      email: customer.email,
      total_spent: customer.totalSpent,
      status: customer.status,
      image: customer.image,
      is_club_member: customer.isClubMember,
      club_join_date: customer.clubJoinDate
    }).eq('id', customer.id);
    if (!error) await fetchData();
    else console.error('Error updating customer:', error);
  }, [user, fetchData]);

  const deleteCustomer = useCallback(async (id: string) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (!error) await fetchData();
    else console.error('Error deleting customer:', error);
  }, [fetchData]);

  const updateSale = useCallback(async (sale: Sale) => {
    // Note: Updating a sale with items is complex. This is a simplified version.
    const { error } = await supabase.from('sales').update({
      company_id: user?.companyId || null,
      total: sale.total,
      payment_method: sale.paymentMethod,
      customer_id: sale.customerId,
      date: sale.date
    }).eq('id', sale.id);
    if (!error) {
      const oldSale = sales.find(s => s.id === sale.id);
      await logAuditAction('edição', 'vendas', sale.id, oldSale, sale);
      await fetchData();
    }
    else console.error('Error updating sale:', error);
  }, [user, sales, logAuditAction, fetchData]);

  const deleteSale = useCallback(async (id: string) => {
    const oldSale = sales.find(s => s.id === id);
    if (!oldSale) return;

    try {
      // 1. Return items to stock
      for (const item of oldSale.items) {
        const movePayload = {
          company_id: user?.companyId || null,
          product_id: item.productId,
          type: 'ENTRADA',
          quantity: item.quantity,
          origin: `Cancelamento Venda #${id.substring(0, 8)}`,
          date: new Date().toISOString(),
          user_id: user?.id || 'Sistema',
          user_name: user?.name || 'Sistema'
        };
        await supabase.from('stock_movements').insert([movePayload]);
      }

      // 2. Not touching existing returns so they stay linked to this sale
      // Create an "ESTORNO" return record to track this cancellation
      const { data: returnRes } = await supabase
        .from('returns')
        .insert([{
          company_id: user?.companyId || null,
          sale_id: id,
          date: new Date().toISOString(),
          total: oldSale.total,
          type: 'TOTAL',
          refund_method: oldSale.paymentMethod || 'Estorno',
          user_id: user?.id || null,
          status: 'CONCLUÍDO'
        }])
        .select();

      if (returnRes && returnRes.length > 0) {
        const returnId = returnRes[0].id;
        const itemsToInsert = oldSale.items.map(item => ({
          company_id: user?.companyId || null,
          return_id: returnId,
          product_id: item.productId,
          quantity: item.quantity,
          price: item.price,
          reason: `Estorno de Venda #${id.substring(0, 8)}`
        }));
        await supabase.from('return_items').insert(itemsToInsert);
      }

      // Restore vouchers if the sale was paid with vouchers
      if (oldSale.payments && oldSale.payments.length > 0) {
        for (const payment of oldSale.payments) {
          if (payment.voucherId || payment.voucherCode) {
            const voucher = vouchers.find(v => (payment.voucherId && v.id === payment.voucherId) || (payment.voucherCode && v.code === payment.voucherCode));
            if (voucher) {
              const newValue = voucher.currentValue + payment.amount;
              await supabase.from('vouchers').update({
                current_value: newValue,
                status: 'Ativo'
              }).eq('id', voucher.id);
            }
          }
        }
      }

      // 3. Mark the sale as cancelled instead of deleting
      const { error } = await supabase.from('sales').update({ status: 'Cancelada' }).eq('id', id);
      
      if (!error) {
        await logAuditAction('cancelamento', 'vendas', id, oldSale, { status: 'Cancelada' });
        await fetchData();
      }
      else {
        console.error('Error deleting sale:', error, error?.message, error?.details);
        
        // Se falhou por não ter a coluna 'status' (PGRST204) ou outro erro, tentamos a exclusão física do item como fallback (comportamento antigo)
        const errorMessage = error?.message || '';
        if (errorMessage.includes('status') || errorMessage.includes('schema') || error?.code === 'PGRST204') {
            console.warn('Fallback: Coluna status não existe, executando delete normal.');
            await supabase.from('sale_items').delete().eq('sale_id', id);
            await supabase.from('vendas_descontos').delete().eq('sale_id', id);
            const { error: deleteError } = await supabase.from('sales').delete().eq('id', id);
            
            if (!deleteError) {
                await logAuditAction('excluir', 'vendas', id, oldSale, null);
                await fetchData();
            } else {
                alert(`Erro ao excluir venda (fallback): ${deleteError.message || JSON.stringify(deleteError)}`);
            }
        } else {
            alert(`Erro ao cancelar venda: ${error?.message || JSON.stringify(error)}`);
        }
      }
    } catch (err: any) {
      console.error('Unexpected error during sale deletion:', err);
      alert(`Ocorreu um erro inesperado ao tentar cancelar a venda: ${err?.message || 'Erro Desconhecido'}`);
    }
  }, [user, sales, logAuditAction, fetchData]);

  const updateLoss = useCallback(async (loss: Loss) => {
    const { error } = await supabase.from('losses').update({
      company_id: user?.companyId || null,
      product_id: loss.productId,
      quantity: loss.quantity,
      reason: loss.reason,
      date: loss.date,
      total_value: loss.totalValue
    }).eq('id', loss.id);
    if (!error) await fetchData();
    else console.error('Error updating loss:', error);
  }, [user, fetchData]);

  const deleteLoss = useCallback(async (id: string) => {
    const { error } = await supabase.from('losses').delete().eq('id', id);
    if (!error) await fetchData();
    else console.error('Error deleting loss:', error);
  }, [fetchData]);

  const updateExpense = useCallback(async (expense: Expense) => {
    const { error } = await supabase.from('expenses').update({
      company_id: user?.companyId || null,
      description: expense.description,
      category: expense.category,
      supplier: expense.supplier,
      amount: expense.amount,
      issue_date: expense.issueDate,
      due_date: expense.dueDate,
      payment_date: expense.paymentDate,
      payment_method: expense.paymentMethod,
      financial_account: expense.financialAccount,
      observation: expense.observation,
      is_recurring: expense.isRecurring,
      frequency: expense.frequency,
      status: expense.status,
      origin: expense.origin,
      type: expense.type,
      interest: expense.interest || 0,
      discount: expense.discount || 0,
      payment_type: expense.paymentType
    }).eq('id', expense.id);

    if (!error) {
      // If status changed to "Pago", record cash movement if account is "Caixa"
      const oldExpense = expenses.find(e => e.id === expense.id);
      if (oldExpense && oldExpense.status !== 'Pago' && expense.status === 'Pago' && expense.financialAccount === 'Caixa') {
        const storedUser = localStorage.getItem('erp_user');
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        const activeReg = cashRegisters.find(r => r.status === 'open');
        
        if (activeReg) {
          await supabase.from('cash_movements').insert([{
            company_id: user?.companyId || null,
            cash_register_id: activeReg.id,
            type: 'sangria',
            amount: expense.amount,
            reason: `Pagamento: ${expense.description}`,
            created_by: currentUser?.id
          }]);
        }
      }
      await fetchData();
    } else console.error('Error updating expense:', error);
  }, [user, expenses, cashRegisters, fetchData]);

  const deleteExpense = useCallback(async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) await fetchData();
    else console.error('Error deleting expense:', error);
  }, [fetchData]);

  const updateStockMovement = useCallback(async (movement: StockMovement) => {
    const { error } = await supabase.from('stock_movements').update({
      company_id: user?.companyId || null,
      product_id: movement.productId,
      type: movement.type,
      quantity: movement.quantity,
      origin: movement.origin,
      date: movement.date,
      user_id: movement.userId,
      user_name: movement.userName
    }).eq('id', movement.id);
    if (!error) await fetchData();
    else console.error('Error updating stock movement:', error);
  }, [user, fetchData]);

  const deleteStockMovement = useCallback(async (id: string) => {
    const { error } = await supabase.from('stock_movements').delete().eq('id', id);
    if (!error) await fetchData();
    else console.error('Error deleting stock movement:', error);
  }, [fetchData]);

  const updateInventory = useCallback(async (inventory: Inventory) => {
    const { error } = await supabase.from('inventories').update({
      company_id: user?.companyId || null,
      date: inventory.date,
      location: inventory.location,
      items_counted: inventory.itemsCounted,
      divergence_value: inventory.divergenceValue,
      status: inventory.status,
      type: inventory.type,
      responsible: inventory.responsible,
      notes: inventory.notes
    }).eq('id', inventory.id);
    if (!error) await fetchData();
    else console.error('Error updating inventory:', error);
  }, [user, fetchData]);

  const deleteInventory = useCallback(async (id: string) => {
    const { error } = await supabase.from('inventories').delete().eq('id', id);
    if (!error) await fetchData();
    else console.error('Error deleting inventory:', error);
  }, [fetchData]);

  const addAdvertisement = async (ad: Omit<Advertisement, 'id'>) => {
    try {
      const newAd = { ...ad, id: Date.now().toString() };
      setAdvertisements(prev => {
        const next = [...prev, newAd];
        localStorage.setItem('advertisements', JSON.stringify(next));
        return next;
      });
    } catch (error) {
      console.error('Error adding advertisement:', error);
      throw error;
    }
  };

  const updateAdvertisement = async (ad: Advertisement) => {
    try {
      setAdvertisements(prev => {
        const next = prev.map(a => a.id === ad.id ? ad : a);
        localStorage.setItem('advertisements', JSON.stringify(next));
        return next;
      });
    } catch (error) {
      console.error('Error updating advertisement:', error);
      throw error;
    }
  };

  const deleteAdvertisement = async (id: string) => {
    try {
      setAdvertisements(prev => {
        const next = prev.filter(a => a.id !== id);
        localStorage.setItem('advertisements', JSON.stringify(next));
        return next;
      });
    } catch (error) {
      console.error('Error deleting advertisement:', error);
      throw error;
    }
  };

  const addEmployee = useCallback(async (employee: Omit<Employee, 'id'>) => {
    const { error } = await supabase.from('employees').insert([{
      company_id: user?.companyId || null,
      full_name: employee.fullName,
      cpf: employee.cpf,
      phone: employee.phone,
      role: employee.role,
      admission_date: employee.admissionDate,
      salary: employee.salary,
      status: employee.status
    }]);
    if (!error) await fetchData();
    else console.error('Error adding employee:', error);
  }, [user, fetchData]);

  const updateEmployee = useCallback(async (employee: Employee) => {
    const { error } = await supabase.from('employees').update({
      company_id: user?.companyId || null,
      full_name: employee.fullName,
      cpf: employee.cpf,
      phone: employee.phone,
      role: employee.role,
      admission_date: employee.admissionDate,
      salary: employee.salary,
      status: employee.status
    }).eq('id', employee.id);
    if (!error) await fetchData();
    else console.error('Error updating employee:', error);
  }, [user, fetchData]);

  const deleteEmployee = useCallback(async (id: string) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (!error) await fetchData();
    else console.error('Error deleting employee:', error);
  }, [fetchData]);

  const addSystemUser = useCallback(async (systemUser: Omit<SystemUser, 'id'>, password?: string) => {
    try {
      // 1. Create user in Supabase Auth via Server Action/API Route (to use Service Role)
      // We need to do this server-side because the client key cannot create users directly without email confirmation flow usually
      // or we use a specific API route that uses the Service Role Key.
      
      if (password) {
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: systemUser.username,
            email: systemUser.email,
            password: password,
            employeeId: systemUser.employeeId,
            profileId: systemUser.profileId,
            storeId: systemUser.storeId,
            status: systemUser.status,
            companyId: user?.companyId || null,
            user_metadata: {
              name: systemUser.username
            }
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          console.error('Error creating user (API):', data.error);
          alert(`Erro ao criar usuário: ${data.error}`);
          return;
        }
        
        await fetchData();
        alert('Usuário criado com sucesso!');
      } else {
        alert('Senha é obrigatória para novos usuários.');
      }
    } catch (err: any) {
      console.error('Unexpected error in addSystemUser:', err);
      alert('Erro inesperado ao criar usuário.');
    }
  }, [user, fetchData]);

  const updateSystemUser = useCallback(async (systemUser: SystemUser, password?: string) => {
    try {
      const payload = {
        username: systemUser.username,
        email: systemUser.email || null,
        employeeId: systemUser.employeeId || null,
        profileId: systemUser.profileId || null,
        storeId: systemUser.storeId || null,
        status: systemUser.status,
        supervisorCode: systemUser.supervisorCode || null,
        password: password || undefined,
        companyId: user?.companyId || null
      };

      const response = await fetch(`/api/admin/users/${systemUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Error updating user (API):', data.error);
        alert(`Erro ao atualizar usuário: ${data.error}`);
        return;
      }

      await fetchData();
      alert('Usuário atualizado com sucesso!');
    } catch (err: any) {
      console.error('Unexpected error in updateSystemUser:', err);
      alert('Erro inesperado ao atualizar usuário.');
    }
  }, [user, fetchData]);

  const deleteSystemUser = useCallback(async (id: string) => {
    try {
      // Delete from Auth & Database using the unified API route
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Error deleting user:', data.error);
        alert(`Erro ao excluir usuário: ${data.error}`);
        return;
      }

      await fetchData();
      alert('Usuário excluído com sucesso!');
    } catch (err: any) {
      console.error('Unexpected error in deleteSystemUser:', err);
      alert('Erro inesperado ao excluir usuário.');
    }
  }, [fetchData]);

  const addAccessProfile = useCallback(async (profile: Omit<AccessProfile, 'id'>) => {
    const { error } = await supabase.from('access_profiles').insert([{
      company_id: user?.companyId || null,
      name: profile.name,
      description: profile.description
    }]);
    if (!error) await fetchData();
    else console.error('Error adding access profile:', error);
  }, [user, fetchData]);

  const updateAccessProfile = useCallback(async (profile: AccessProfile) => {
    const { error } = await supabase.from('access_profiles').update({
      company_id: user?.companyId || null,
      name: profile.name,
      description: profile.description
    }).eq('id', profile.id);
    if (!error) await fetchData();
    else console.error('Error updating access profile:', error);
  }, [user, fetchData]);

  const deleteAccessProfile = useCallback(async (id: string) => {
    const { error } = await supabase.from('access_profiles').delete().eq('id', id);
    if (!error) await fetchData();
    else console.error('Error deleting access profile:', error);
  }, [fetchData]);

  const updatePermissions = useCallback(async (profileId: string, perms: Omit<Permission, 'id'>[]) => {
    // Delete existing permissions for profile
    await supabase.from('permissions').delete().eq('profile_id', profileId);
    
    // Insert new permissions
    const { error } = await supabase.from('permissions').insert(
      perms.map((p: any) => ({
        company_id: user?.companyId || null,
        profile_id: profileId,
        module: p.module,
        can_view: p.canView,
        can_create: p.canCreate,
        can_edit: p.canEdit,
        can_delete: p.canDelete
      }))
    );
    if (!error) await fetchData();
    else console.error('Error updating permissions:', error);
  }, [user, fetchData]);

  const updatePricingSettings = useCallback((settings: PricingSettings) => {
    setPricingSettings(settings);
    localStorage.setItem('pricing_settings', JSON.stringify(settings));
  }, [setPricingSettings]);

  const updateCompanySettings = useCallback(async (settings: CompanySettings) => {
    setCompanySettings(settings);
    localStorage.setItem('company_settings', JSON.stringify(settings));
    
    if (user?.companyId) {
      const updatePayload: any = {
        name: settings.tradeName,
        trade_name: settings.tradeName,
        legal_name: settings.legalName,
        document: settings.cnpj,
        state_registration: settings.stateRegistration,
        email: settings.email,
        phone: settings.phone,
        address: settings.address.street,
        address_number: settings.address.number,
        neighborhood: settings.address.neighborhood,
        city: settings.address.city,
        state: settings.address.state
      };

      const { error } = await supabase.from('companies').update(updatePayload).eq('id', user.companyId);
      
      if (error) {
        console.error('Error updating company in database:', error);
        
        // Fallback for missing columns
        if (error.message && error.message.includes('column')) {
          console.warn('Fallback: updating company with basic fields only...');
          const basicPayload = {
            name: settings.tradeName,
            document: settings.cnpj,
            email: settings.email,
            phone: settings.phone,
            address: settings.address.street
          };
          await supabase.from('companies').update(basicPayload).eq('id', user.companyId);
        }
      }
    }
  }, [user, setCompanySettings]);

  const updateSystemSettings = useCallback((settings: SystemSettings) => {
    setSystemSettings(settings);
    localStorage.setItem('system_settings', JSON.stringify(settings));
  }, [setSystemSettings]);

  const sendEmailNotification = useCallback(async (to: string, subject: string, body: string, html?: string, from?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          to, 
          subject, 
          body, 
          html,
          from: from || companySettings?.email || systemSettings?.notifications?.senderEmail 
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Erro desconhecido ao enviar e-mail';
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.error || errorMessage;
          console.error('Erro ao enviar e-mail:', errorData.error || errorData);
        } else {
          const errorText = await response.text();
          if (errorText.includes('Rate exceeded')) {
            errorMessage = 'Limite de envio de e-mail atingido. Tente novamente em instantes.';
          } else {
            errorMessage = errorText.substring(0, 100);
          }
          console.error('Erro ao enviar e-mail (não-JSON):', errorText);
        }
        return { success: false, error: errorMessage };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Erro de rede ao enviar e-mail:', error);
      return { success: false, error: error.message || 'Erro de rede' };
    }
  }, [companySettings?.email, systemSettings?.notifications?.senderEmail]);

  const addPaymentMethod = useCallback(async (method: Omit<PaymentMethod, 'id'>): Promise<boolean> => {
    const { error } = await supabase.from('payment_methods').insert([{
      company_id: user?.companyId || null,
      name: method.name,
      type: method.type,
      tax_percentage: method.taxPercentage,
      tax_value: method.taxFixed,
      active: method.active
    }]);
    if (!error) {
      await fetchData();
      return true;
    } else {
      console.error('Error adding payment method details:', JSON.stringify(error, null, 2));
      if (error.code === '23505') {
        setCustomAlert({ message: 'Uma forma de pagamento com este nome já existe.', type: 'error' });
      } else {
        setCustomAlert({ message: `Erro ao adicionar forma de pagamento: ${error.message || 'Erro desconhecido'}`, type: 'error' });
      }
      return false;
    }
  }, [user, fetchData, setCustomAlert]);

  const updatePaymentMethod = useCallback(async (method: PaymentMethod): Promise<boolean> => {
    const { error } = await supabase.from('payment_methods').update({
      company_id: user?.companyId || null,
      name: method.name,
      type: method.type,
      tax_percentage: method.taxPercentage,
      tax_value: method.taxFixed,
      active: method.active
    }).eq('id', method.id);
    if (!error) {
      await fetchData();
      return true;
    } else {
      console.error('Error updating payment method:', error);
      if (error.code === '23505') {
        setCustomAlert({ message: 'Uma forma de pagamento com este nome já existe.', type: 'error' });
      } else {
        setCustomAlert({ message: `Erro ao atualizar forma de pagamento: ${error.message || 'Erro desconhecido'}`, type: 'error' });
      }
      return false;
    }
  }, [user, fetchData, setCustomAlert]);

  const deletePaymentMethod = useCallback(async (id: string): Promise<boolean> => {
    console.log('Context: deletePaymentMethod called with ID:', id);
    const { data, error } = await supabase.from('payment_methods').delete().eq('id', id);
    
    if (error) {
      console.error('Context: Error deleting payment method from Supabase:', JSON.stringify(error, null, 2));
      setCustomAlert({ message: `Erro ao excluir forma de pagamento: ${error.message || 'Erro desconhecido'}`, type: 'error' });
      return false;
    } else {
      console.log('Context: Payment method deleted successfully from Supabase. Data:', data);
      await fetchData();
      return true;
    }
  }, [fetchData, setCustomAlert]);

  const addCategoria = useCallback(async (categoria: Omit<Categoria, 'id'>) => {
    const { error } = await supabase.from('categorias').insert([{ ...categoria, company_id: user?.companyId || null }]);
    if (error) {
      console.error('Error adding categoria:', error);
      alert('Erro ao adicionar categoria');
    } else {
      await fetchData();
    }
  }, [user, fetchData]);

  const addExpenseCategory = useCallback(async (categoria: Omit<ExpenseCategory, 'id'>) => {
    const { error } = await supabase.from('expense_categories').insert([{ ...categoria, company_id: user?.companyId || null }]);
    if (error) {
      console.error('Error adding expense category:', error);
      alert('Erro ao adicionar categoria de despesa');
    } else {
      await fetchData();
    }
  }, [user, fetchData]);

  const updateCategoria = useCallback(async (categoria: Categoria) => {
    const { error } = await supabase.from('categorias').update({ ...categoria, company_id: user?.companyId || null }).eq('id', categoria.id);
    if (error) {
      console.error('Error updating categoria:', error);
      alert('Erro ao atualizar categoria');
    } else {
      await fetchData();
    }
  }, [user, fetchData]);

  const deleteCategoria = useCallback(async (id: string) => {
    // First check if there are linked subcategories
    const { data: linkedSubcategories } = await supabase.from('subcategorias').select('id').eq('categoria_id', id);
    
    if (linkedSubcategories && linkedSubcategories.length > 0) {
      alert(`Não é possível excluir. Existem ${linkedSubcategories.length} subcategoria(s) vinculada(s) a esta categoria.`);
      return { success: false, error: 'Has linked subcategories' };
    }

    const { error } = await supabase.from('categorias').delete().eq('id', id);
    if (error) {
      console.error('Error deleting categoria:', JSON.stringify(error, null, 2));
      alert('Erro ao excluir categoria. Verifique se existem subcategorias ou produtos vinculados.');
      return { success: false, error };
    } else {
      await fetchData();
      return { success: true };
    }
  }, [fetchData]);

  const addSubcategoria = useCallback(async (subcategoria: Omit<Subcategoria, 'id'>) => {
    const { error } = await supabase.from('subcategorias').insert([{ ...subcategoria, company_id: user?.companyId || null }]);
    if (error) {
      console.error('Error adding subcategoria:', error);
      alert('Erro ao adicionar subcategoria');
    } else {
      await fetchData();
    }
  }, [user, fetchData]);

  const updateSubcategoria = useCallback(async (subcategoria: Subcategoria) => {
    const { error } = await supabase.from('subcategorias').update({ ...subcategoria, company_id: user?.companyId || null }).eq('id', subcategoria.id);
    if (error) {
      console.error('Error updating subcategoria:', error);
      alert('Erro ao atualizar subcategoria');
    } else {
      await fetchData();
    }
  }, [user, fetchData]);

  const deleteSubcategoria = useCallback(async (id: string) => {
    // First check if there are linked products
    const { data: linkedProducts } = await supabase.from('products').select('id').eq('subcategoria_id', id);
    
    if (linkedProducts && linkedProducts.length > 0) {
      alert(`Não é possível excluir. Existem ${linkedProducts.length} produto(s) vinculado(s) a esta subcategoria.`);
      return { success: false, error: 'Has linked products' };
    }

    const { error } = await supabase.from('subcategorias').delete().eq('id', id);
    if (error) {
      console.error('Error deleting subcategoria:', JSON.stringify(error, null, 2));
      alert('Erro ao excluir subcategoria. Verifique se existem produtos vinculados.');
      return { success: false, error };
    } else {
      await fetchData();
      return { success: true };
    }
  }, [fetchData]);

  const addDepartamento = useCallback(async (departamento: Omit<Departamento, 'id'>) => {
    let { error } = await supabase.from('departamentos').insert([{ ...departamento, company_id: user?.companyId || null }]);
    if (error && error.message && (error.message.includes('segmento') || error.message.includes('secao'))) {
      const { segmento, secao, ...rest } = departamento;
      const retry = await supabase.from('departamentos').insert([{ ...rest, company_id: user?.companyId || null }]);
      error = retry.error;
    }
    if (error) {
      console.error('Error adding departamento:', error);
      alert('Erro ao adicionar departamento');
    } else {
      await fetchData();
    }
  }, [user, fetchData]);

  const updateDepartamento = useCallback(async (departamento: Departamento) => {
    const { id, created_at, ...updateData } = departamento as any;
    let { error } = await supabase.from('departamentos').update({ ...updateData, company_id: user?.companyId || null }).eq('id', id);
    if (error && error.message && (error.message.includes('segmento') || error.message.includes('secao'))) {
      const { segmento, secao, ...rest } = updateData;
      const retry = await supabase.from('departamentos').update({ ...rest, company_id: user?.companyId || null }).eq('id', id);
      error = retry.error;
    }
    if (error) {
      console.error('Error updating departamento:', error);
      alert('Erro ao atualizar departamento');
    } else {
      await fetchData();
    }
  }, [user, fetchData]);

  const deleteDepartamento = useCallback(async (id: string) => {
    // First check if there are linked categories
    const { data: linkedCategories } = await supabase.from('categorias').select('id').eq('departamento_id', id);
    
    if (linkedCategories && linkedCategories.length > 0) {
      alert(`Não é possível excluir. Existem ${linkedCategories.length} categoria(s) vinculada(s) a este departamento.`);
      return { success: false, error: 'Has linked categories' };
    }

    const { error } = await supabase.from('departamentos').delete().eq('id', id);
    if (error) {
      console.error('Error deleting departamento:', JSON.stringify(error, null, 2));
      alert('Erro ao excluir departamento. Verifique se existem categorias vinculadas.');
      return { success: false, error };
    } else {
      await fetchData();
      return { success: true };
    }
  }, [fetchData]);

  const openCashRegister = useCallback(async (openingBalance: number, observation?: string) => {
    const { data, error } = await supabase.from('cash_registers').insert([{
      company_id: user?.companyId || null,
      operator_id: (await supabase.auth.getUser()).data.user?.id,
      opening_balance: openingBalance,
      status: 'open',
      terminal_id: 'Terminal 01',
      observation
    }]).select();

    if (!error && data) {
      await logAuditAction('abertura', 'caixa', data[0].id, null, { openingBalance, observation });
      await fetchData();
    } else {
      console.error('Error opening cash register:', error);
      alert('Erro ao abrir caixa: ' + (error?.message || 'Erro desconhecido'));
    }
  }, [user, logAuditAction, fetchData]);

  const closeCashRegister = useCallback(async (informedTotals: { method: string; informed: number; system: number }[], justification?: string) => {
    if (!activeRegister) return;

    const totalSystem = informedTotals.reduce((acc: number, curr: any) => acc + curr.system, 0);
    const totalInformed = informedTotals.reduce((acc: number, curr: any) => acc + curr.informed, 0);
    const totalDifference = totalInformed - totalSystem;

    // 1. Update Register Status
    const { error: regError } = await supabase.from('cash_registers').update({
      company_id: user?.companyId || null,
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: (await supabase.auth.getUser()).data.user?.id
    }).eq('id', activeRegister.id);

    if (regError) {
      console.error('Error closing register:', regError);
      alert('Erro ao fechar caixa: ' + regError.message);
      return;
    }

    // 2. Insert Sales Summary
    const summaryToInsert = informedTotals.map((item: any) => ({
      company_id: user?.companyId || null,
      cash_register_id: activeRegister.id,
      payment_method: item.method,
      system_total: item.system,
      informed_total: item.informed,
      difference: item.informed - item.system
    }));

    await supabase.from('cash_sales_summary').insert(summaryToInsert);

    // 3. Insert Closing Record
    const { data: closingData } = await supabase.from('cash_closings').insert([{
      company_id: user?.companyId || null,
      cash_register_id: activeRegister.id,
      total_system: totalSystem,
      total_informed: totalInformed,
      total_difference: totalDifference,
      justification,
      approved_by: totalDifference === 0 ? (await supabase.auth.getUser()).data.user?.id : null // Auto-approve if no difference
    }]).select();

    await logAuditAction('fechamento', 'caixa', activeRegister.id, null, { totalSystem, totalInformed, totalDifference, justification });
    await fetchData();
  }, [user, activeRegister, logAuditAction, fetchData]);

  const addMaquininha = useCallback(async (maquininha: Omit<Maquininha, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('maquininhas').insert([{ ...maquininha, company_id: user?.companyId || null }]);
    if (!error) await fetchData();
  }, [user, fetchData]);

  const updateMaquininha = useCallback(async (maquininha: Maquininha) => {
    const { error } = await supabase.from('maquininhas').update({
      company_id: user?.companyId || null,
      nome: maquininha.nome,
      taxa_debito: maquininha.taxa_debito,
      taxa_credito: maquininha.taxa_credito,
      taxa_credito_parcelado: maquininha.taxa_credito_parcelado,
      taxa_pix: maquininha.taxa_pix,
      ativo: maquininha.ativo
    }).eq('id', maquininha.id);
    if (!error) await fetchData();
  }, [user, fetchData]);

  const deleteMaquininha = useCallback(async (id: string) => {
    const { error } = await supabase.from('maquininhas').delete().eq('id', id);
    if (!error) await fetchData();
  }, [fetchData]);

  const suspendCashRegister = useCallback(async () => {
    if (!activeRegister) return;
    const { error } = await supabase.from('cash_registers').update({ 
      company_id: user?.companyId || null,
      status: 'suspended' 
    }).eq('id', activeRegister.id);
    if (!error) {
      await logAuditAction('suspensao', 'caixa', activeRegister.id);
      await fetchData();
    }
  }, [user, activeRegister, logAuditAction, fetchData]);

  const blockCashRegister = useCallback(async (reason: string) => {
    if (!activeRegister) return;
    const { error } = await supabase.from('cash_registers').update({ 
      company_id: user?.companyId || null,
      status: 'blocked',
      observation: (activeRegister.observation || '') + ' | Bloqueado: ' + reason 
    }).eq('id', activeRegister.id);
    if (!error) {
      await logAuditAction('bloqueio', 'caixa', activeRegister.id, null, { reason });
      await fetchData();
    }
  }, [user, activeRegister, logAuditAction, fetchData]);

  const seedMercadologicalTree = useCallback(async () => {
    try {
      console.log('Starting mercadological tree seeding...');
      if (!DEFAULT_MERCADOLOGICAL_TREE || DEFAULT_MERCADOLOGICAL_TREE.length === 0) {
        throw new Error('A árvore padrão está vazia ou não foi carregada.');
      }

      for (const dept of DEFAULT_MERCADOLOGICAL_TREE) {
        // 1. Add/Get Department
        const { data: existingDepts, error: checkDeptError } = await supabase
          .from('departamentos')
          .select('id')
          .eq('codigo', dept.codigo);

        if (checkDeptError) {
          console.error('Error checking department:', checkDeptError);
          // Continue or throw? Let's throw to be safe
          throw checkDeptError;
        }

        let deptId;
        if (existingDepts && existingDepts.length > 0) {
          deptId = existingDepts[0].id;
          console.log(`Department ${dept.nome} (${dept.codigo}) already exists. ID: ${deptId}`);
        } else {
          const { data: deptData, error: deptError } = await supabase
            .from('departamentos')
            .insert([{ company_id: user?.companyId || null, nome: dept.nome, codigo: dept.codigo, ativo: true }])
            .select();

          if (deptError) {
            console.error(`Error inserting department ${dept.nome}:`, deptError);
            throw deptError;
          }
          if (!deptData || deptData.length === 0) {
            throw new Error(`Failed to insert department ${dept.nome}`);
          }
          deptId = deptData[0].id;
          console.log(`Department ${dept.nome} created. ID: ${deptId}`);
        }

        for (const cat of dept.categorias) {
          // 2. Add/Get Category
          const { data: existingCats, error: checkCatError } = await supabase
            .from('categorias')
            .select('id')
            .eq('codigo', cat.codigo);

          if (checkCatError) {
            console.error('Error checking category:', checkCatError);
            throw checkCatError;
          }

          let catId;
          if (existingCats && existingCats.length > 0) {
            catId = existingCats[0].id;
            console.log(`Category ${cat.nome} (${cat.codigo}) already exists. ID: ${catId}`);
          } else {
            const { data: catData, error: catError } = await supabase
              .from('categorias')
              .insert([{ company_id: user?.companyId || null, nome: cat.nome, codigo: cat.codigo, departamento_id: deptId }])
              .select();

            if (catError) {
              console.error(`Error inserting category ${cat.nome}:`, catError);
              throw catError;
            }
            if (!catData || catData.length === 0) {
              throw new Error(`Failed to insert category ${cat.nome}`);
            }
            catId = catData[0].id;
            console.log(`Category ${cat.nome} created. ID: ${catId}`);
          }

          for (const sub of cat.subcategorias) {
            // 3. Add Subcategory if not exists
            const { data: existingSubs, error: checkSubError } = await supabase
              .from('subcategorias')
              .select('id')
              .eq('codigo', sub.codigo);

            if (checkSubError) {
              console.error('Error checking subcategory:', checkSubError);
              throw checkSubError;
            }

            if (!existingSubs || existingSubs.length === 0) {
              const { error: subError } = await supabase
                .from('subcategorias')
                .insert([{ company_id: user?.companyId || null, nome: sub.nome, codigo: sub.codigo, categoria_id: catId }]);

              if (subError) {
                console.error(`Error inserting subcategory ${sub.nome}:`, subError);
                throw subError;
              }
              console.log(`Subcategory ${sub.nome} created.`);
            } else {
              console.log(`Subcategory ${sub.nome} (${sub.codigo}) already exists.`);
            }
          }
        }
      }
      await fetchData();
      alert('Árvore mercadológica carregada com sucesso!');
    } catch (error: any) {
      console.error('Error seeding mercadological tree:', error);
      alert(`Erro ao carregar árvore mercadológica: ${error.message || 'Erro desconhecido'}`);
    }
  }, [user, fetchData]);

  const seedExpenseCategories = useCallback(async () => {
    const defaultCategories = [
      'Aluguel',
      'Energia Elétrica',
      'Água e Esgoto',
      'Internet e Telefone',
      'Salários e Encargos',
      'Fornecedores de Mercadorias',
      'Manutenção e Reparos',
      'Limpeza e Conservação',
      'Marketing e Propaganda',
      'Impostos e Taxas',
      'Seguros',
      'Material de Escritório',
      'Outras Despesas'
    ];

    try {
      for (const name of defaultCategories) {
        const { data: existing } = await supabase
          .from('expense_categories')
          .select('id')
          .eq('nome', name)
          .maybeSingle();

        if (!existing) {
          await supabase.from('expense_categories').insert([{ company_id: user?.companyId || null, nome: name }]);
        }
      }
      await fetchData();
    } catch (error: any) {
      console.error('Error seeding expense categories:', error);
    }
  }, [user, fetchData]);

  const addPromotion = useCallback(async (promotion: Omit<Promotion, 'id'>) => {
    if (user?.role !== 'Administrador') {
      alert('Apenas administradores podem criar promoções.');
      return;
    }

    const dataToInsert = {
      company_id: user?.companyId || null,
      name: promotion.name,
      type: promotion.type,
      start_date: promotion.startDate,
      end_date: promotion.endDate,
      status: promotion.status,
      target_type: promotion.targetType,
      target_id: Array.isArray(promotion.targetId) ? JSON.stringify(promotion.targetId) : promotion.targetId,
      product_prices: promotion.productPrices || {},
      discount_value: promotion.discountValue,
      buy_quantity: promotion.buyQuantity,
      pay_quantity: promotion.payQuantity,
      combo_items: promotion.comboItems,
      combo_price: promotion.comboPrice,
      apply_automatically: promotion.applyAutomatically,
      limit_per_customer: promotion.limitPerCustomer,
      quantity_limit: promotion.quantityLimit,
      days_of_week: promotion.daysOfWeek,
      only_for_club_members: promotion.onlyForClubMembers
    };

    let { error } = await supabase.from('promotions').insert([dataToInsert]);
    
    // Fallback if columns don't exist
    if (error && error.message && (error.message.includes('product_prices') || error.message.includes('only_for_club_members'))) {
      const fallbackData = { ...dataToInsert } as any;
      delete fallbackData.product_prices;
      delete fallbackData.only_for_club_members;
      const { error: fallbackError } = await supabase.from('promotions').insert([fallbackData]);
      error = fallbackError;
    }

    if (!error) await fetchData();
    else {
      console.error('Error adding promotion:', error);
      alert(`Erro ao adicionar promoção: ${error.message || JSON.stringify(error)}`);
    }
  }, [user, fetchData]);

  const updatePromotion = useCallback(async (promotion: Promotion) => {
    if (user?.role !== 'Administrador') {
      alert('Apenas administradores podem editar promoções.');
      return;
    }

    const dataToUpdate = {
      company_id: user?.companyId || null,
      name: promotion.name,
      type: promotion.type,
      start_date: promotion.startDate,
      end_date: promotion.endDate,
      status: promotion.status,
      target_type: promotion.targetType,
      target_id: Array.isArray(promotion.targetId) ? JSON.stringify(promotion.targetId) : promotion.targetId,
      product_prices: promotion.productPrices || {},
      discount_value: promotion.discountValue,
      buy_quantity: promotion.buyQuantity,
      pay_quantity: promotion.payQuantity,
      combo_items: promotion.comboItems,
      combo_price: promotion.comboPrice,
      apply_automatically: promotion.applyAutomatically,
      limit_per_customer: promotion.limitPerCustomer,
      quantity_limit: promotion.quantityLimit,
      days_of_week: promotion.daysOfWeek,
      only_for_club_members: promotion.onlyForClubMembers
    };

    let { error } = await supabase.from('promotions').update(dataToUpdate).eq('id', promotion.id);

    // Fallback if columns don't exist
    if (error && error.message && (error.message.includes('product_prices') || error.message.includes('only_for_club_members'))) {
      const fallbackData = { ...dataToUpdate } as any;
      delete fallbackData.product_prices;
      delete fallbackData.only_for_club_members;
      const { error: fallbackError } = await supabase.from('promotions').update(fallbackData).eq('id', promotion.id);
      error = fallbackError;
    }

    if (!error) await fetchData();
    else {
      console.error('Error updating promotion:', error);
      alert(`Erro ao atualizar promoção: ${error.message || JSON.stringify(error)}`);
    }
  }, [user, fetchData]);

  const deletePromotion = useCallback(async (id: string) => {
    if (user?.role !== 'Administrador') {
      throw new Error('Apenas administradores podem excluir promoções.');
    }
    const { error } = await supabase.from('promotions').delete().eq('id', id);
    if (!error) await fetchData();
    else {
      console.error('Error deleting promotion:', error);
      throw error;
    }
  }, [user, fetchData]);

  const contextValue = React.useMemo(() => ({ 
      products, 
      sales, 
      customers, 
      suppliers,
      losses,
      expenses,
      departamentos,
      categorias,
      expenseCategories,
      subcategorias,
      stockMovements,
      inventories,
      employees,
      systemUsers,
      accessProfiles,
      permissions,
      pricingSettings,
      companySettings,
      systemSettings,
      paymentMethods,
      maquininhas,
      promotions,
      returns,
      vouchers,
      advertisements,
      user,
      isSuperAdmin,
      isAuthReady,
      isLoading,
      hasPermission,
      discountLogs,
      auditLogs,
      cashRegisters,
      cashMovements,
      cashClosings,
      activeRegister,
      openCashRegister,
      closeCashRegister,
      addCashMovement,
      suspendCashRegister,
      blockCashRegister,
      logAuditAction,
      addProduct, 
      updateProduct, 
      deleteProduct,
      addSale, 
      addReturn,
      addVoucher,
      updateVoucher,
      getVoucherByCode,
      addDiscountLog,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      addLoss,
      addExpense,
      addStockMovement,
      addInventory,
      updateSale,
      deleteSale,
      updateLoss,
      deleteLoss,
      updateExpense,
      deleteExpense,
      updateStockMovement,
      deleteStockMovement,
      updateInventory,
      deleteInventory,
      addCategoria,
      updateCategoria,
      deleteCategoria,
      addExpenseCategory,
      addSubcategoria,
      updateSubcategoria,
      deleteSubcategoria,
      addDepartamento,
      updateDepartamento,
      deleteDepartamento,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      addSystemUser,
      updateSystemUser,
      deleteSystemUser,
      addAccessProfile,
      updateAccessProfile,
      deleteAccessProfile,
      updatePermissions,
      updatePricingSettings,
      updateCompanySettings,
      updateSystemSettings,
      sendEmailNotification,
      addPaymentMethod,
      updatePaymentMethod,
      deletePaymentMethod,
      addMaquininha,
      updateMaquininha,
      deleteMaquininha,
      addPromotion,
      updatePromotion,
      deletePromotion,
      addAdvertisement,
      updateAdvertisement,
      deleteAdvertisement,
      lotes,
      login,
      logout,
      seedMercadologicalTree,
      seedExpenseCategories,
      fetchData,
      customAlert,
      setCustomAlert,
      changePassword
    }), [
      products, sales, customers, suppliers, losses, expenses, departamentos, categorias, expenseCategories, subcategorias,
      stockMovements, inventories, employees, systemUsers, accessProfiles, permissions, pricingSettings, companySettings,
      systemSettings, paymentMethods, maquininhas, promotions, returns, vouchers, advertisements, user, isSuperAdmin, isAuthReady, isLoading, hasPermission,
      discountLogs, auditLogs, cashRegisters, cashMovements, cashClosings, activeRegister, openCashRegister, closeCashRegister,
      addCashMovement, suspendCashRegister, blockCashRegister, logAuditAction, addProduct, updateProduct, deleteProduct,
      addSale, addReturn, addVoucher, updateVoucher, getVoucherByCode, addDiscountLog, addCustomer, updateCustomer, deleteCustomer, addSupplier, updateSupplier,
      deleteSupplier, addLoss, addExpense, addStockMovement, addInventory, updateSale, deleteSale, updateLoss,
      deleteLoss, updateExpense, deleteExpense, updateStockMovement, deleteStockMovement, updateInventory,
      deleteInventory, addCategoria, updateCategoria, deleteCategoria, addExpenseCategory, addSubcategoria,
      updateSubcategoria, deleteSubcategoria, addDepartamento, updateDepartamento, deleteDepartamento, addEmployee,
      updateEmployee, deleteEmployee, addSystemUser, updateSystemUser, deleteSystemUser, addAccessProfile,
      updateAccessProfile, deleteAccessProfile, updatePermissions, updatePricingSettings, updateCompanySettings,
      updateSystemSettings, sendEmailNotification, addPaymentMethod, updatePaymentMethod, deletePaymentMethod,
      addMaquininha, updateMaquininha, deleteMaquininha, addPromotion, updatePromotion, deletePromotion,
      addAdvertisement, updateAdvertisement, deleteAdvertisement,
      lotes, login, logout, seedMercadologicalTree, seedExpenseCategories, fetchData, customAlert, setCustomAlert, changePassword
    ]);

  return (
    <ERPContext.Provider value={contextValue}>
      {children}
    </ERPContext.Provider>
  );
}

export function useERP() {
  const context = useContext(ERPContext);
  if (context === undefined) throw new Error('useERP must be used within an ERPProvider');
  return context;
}
