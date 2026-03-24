'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Sale, Customer, Supplier, Loss, Expense, PricingSettings, CompanySettings, CompositionItem, StockMovement, Inventory, Employee, SystemUser, AccessProfile, Permission, SystemSettings, DiscountLog, CashRegister, CashMovement, CashSalesSummary, CashClosing, AuditLog, PaymentMethod, Departamento, Categoria, Subcategoria, ProductLote, Maquininha, Promotion, INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_LOSSES, INITIAL_SALES, INITIAL_EXPENSES } from './types';
import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

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
  user: { id: string; name: string; email: string; role: string; profileId?: string } | null;
  hasPermission: (module: string, action: 'view' | 'create' | 'edit' | 'delete') => boolean;
  discountLogs: DiscountLog[];
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
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id'>) => Promise<Sale | null>;
  addReturn: (returnData: Omit<Return, 'id'>) => Promise<boolean>;
  addDiscountLog: (log: Omit<DiscountLog, 'id'>) => Promise<void>;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addSupplier: (supplier: Supplier) => Promise<void>;
  updateSupplier: (supplier: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  addLoss: (loss: Omit<Loss, 'id'>) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  addStockMovement: (movement: Omit<StockMovement, 'id'>) => Promise<void>;
  addInventory: (inventory: Omit<Inventory, 'id'>) => Promise<void>;
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
  updateCompanySettings: (settings: CompanySettings) => void;
  updateSystemSettings: (settings: SystemSettings) => void;
  sendEmailNotification: (to: string, subject: string, body: string, html?: string) => Promise<boolean>;
  addPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => void;
  updatePaymentMethod: (method: PaymentMethod) => void;
  deletePaymentMethod: (id: string) => void;
  login: (email: string, password: string) => Promise<boolean>;
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
  deleteCategoria: (id: string) => Promise<void>;
  addExpenseCategory: (categoria: Omit<ExpenseCategory, 'id'>) => Promise<void>;
  addSubcategoria: (subcategoria: Omit<Subcategoria, 'id'>) => Promise<void>;
  updateSubcategoria: (subcategoria: Subcategoria) => Promise<void>;
  deleteSubcategoria: (id: string) => Promise<void>;
  addDepartamento: (departamento: Omit<Departamento, 'id'>) => Promise<void>;
  updateDepartamento: (departamento: Departamento) => Promise<void>;
  deleteDepartamento: (id: string) => Promise<void>;
  addMaquininha: (maquininha: Omit<Maquininha, 'id' | 'created_at'>) => Promise<void>;
  updateMaquininha: (maquininha: Maquininha) => Promise<void>;
  deleteMaquininha: (id: string) => Promise<void>;
  addPromotion: (promotion: Omit<Promotion, 'id'>) => Promise<void>;
  updatePromotion: (promotion: Promotion) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;
  seedMercadologicalTree: () => Promise<void>;
  seedExpenseCategories: () => Promise<void>;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

import { DEFAULT_MERCADOLOGICAL_TREE } from './default-tree';

export function ERPProvider({ children }: { children: React.ReactNode }) {
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
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
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
  });
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>({
    defaultMethod: 'markup',
    defaultMargin: 30,
    defaultMarkup: 50,
    allowEditOnProduct: true,
    autoRounding: false
  });
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
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
  });
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string; profileId?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const { data: productsData } = await supabase.from('products').select('*');
      const { data: customersData } = await supabase.from('customers').select('*');
      const { data: suppliersData } = await supabase.from('suppliers').select('*');
      let salesData, saleItemsData;
      try {
        const res = await supabase.from('sales').select('*, sale_items(*)');
        if (res.error) throw res.error;
        salesData = res.data;
      } catch (e) {
        console.warn('Failed to fetch sales with join, fetching separately...', e);
        const [salesRes, itemsRes] = await Promise.all([
          supabase.from('sales').select('*'),
          supabase.from('sale_items').select('*')
        ]);
        if (salesRes.data) {
          salesData = salesRes.data.map(s => ({
            ...s,
            sale_items: itemsRes.data ? itemsRes.data.filter(i => i.sale_id === s.id) : []
          }));
        }
      }
      const { data: lossesData } = await supabase.from('losses').select('*');
      const { data: expensesData } = await supabase.from('expenses').select('*');
      const { data: movementsData } = await supabase.from('stock_movements').select('*');
      const { data: inventoriesData } = await supabase.from('inventories').select('*');
      const { data: employeesData } = await supabase.from('employees').select('*');
      const { data: systemUsersData } = await supabase.from('system_users').select('*');
      const { data: accessProfilesData } = await supabase.from('access_profiles').select('*');
      const { data: permissionsData } = await supabase.from('permissions').select('*');
      const { data: departamentosData } = await supabase.from('departamentos').select('*');
      const { data: categoriasData } = await supabase.from('categorias').select('*');
      const { data: expenseCategoriesData } = await supabase.from('expense_categories').select('*');
      const { data: subcategoriasData } = await supabase.from('subcategorias').select('*');
      const { data: discountLogsData } = await supabase.from('vendas_descontos').select('*');
      const { data: registersData } = await supabase.from('cash_registers').select('*');
      const { data: movementsData_cash } = await supabase.from('cash_movements').select('*');
      const { data: closingsData } = await supabase.from('cash_closings').select('*');
      const { data: auditLogsData } = await supabase.from('audit_logs').select('*');
      const { data: lotesData } = await supabase.from('produto_lotes').select('*');
      const { data: paymentMethodsData } = await supabase.from('payment_methods').select('*');
      const { data: maquininhasData } = await supabase.from('maquininhas').select('*');
      const { data: promotionsData } = await supabase.from('promotions').select('*');
      const { data: returnsData } = await supabase.from('returns').select('*, return_items(*)');
      
      if (returnsData) {
        setReturns(returnsData.map(r => ({
          id: r.id,
          saleId: r.sale_id,
          date: r.date,
          items: (r.return_items || []).map((ri: any) => ({
            productId: ri.product_id,
            quantity: ri.quantity,
            price: Number(ri.price),
            reason: ri.reason
          })),
          total: Number(r.total),
          type: r.type,
          refundMethod: r.refund_method,
          userId: r.user_id,
          status: r.status
        })));
      }

      if (promotionsData) {
        setPromotions(promotionsData.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          startDate: p.start_date,
          endDate: p.end_date,
          status: p.status,
          targetType: p.target_type,
          targetId: p.target_id,
          discountValue: p.discount_value ? Number(p.discount_value) : undefined,
          buyQuantity: p.buy_quantity,
          payQuantity: p.pay_quantity,
          comboItems: p.combo_items,
          comboPrice: p.combo_price ? Number(p.combo_price) : undefined,
          applyAutomatically: p.apply_automatically,
          limitPerCustomer: p.limit_per_customer,
          quantityLimit: p.quantity_limit,
          daysOfWeek: p.days_of_week
        })));
      }

      if (productsData) {
        const baseProducts = productsData.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          costPrice: Number(p.cost_price),
          salePrice: Number(p.sale_price),
          stock: p.stock,
          minStock: p.min_stock,
          image: p.image?.includes('mercadinhosupernice.com.br') ? 'https://picsum.photos/seed/product/200/200' : p.image,
          composition: p.composition || [],
          status: p.status || 'Ativo',
          codigo_mercadologico: p.codigo_mercadologico,
          subcategoria_id: p.subcategoria_id,
          validade: p.validade
        }));

        // Calculate virtual stock for kits
        const finalProducts = baseProducts.map(p => {
          if (p.composition && p.composition.length > 0) {
            let possibleStock = Infinity;
            p.composition.forEach((item: CompositionItem) => {
              const component = baseProducts.find(bp => bp.id === item.productId);
              if (component) {
                const available = Math.floor(component.stock / item.quantity);
                if (available < possibleStock) {
                  possibleStock = available;
                }
              } else {
                possibleStock = 0;
              }
            });
            return { ...p, stock: possibleStock === Infinity ? 0 : possibleStock };
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
        const mappedCustomers = customersData.map(c => ({
          id: c.id,
          name: c.name,
          document: c.document,
          phone: c.phone,
          email: c.email,
          totalSpent: Number(c.total_spent),
          status: c.status,
          image: c.image?.includes('mercadinhosupernice.com.br') ? 'https://i.pravatar.cc/150' : c.image
        }));
        setCustomers(mappedCustomers);
        localStorage.setItem('erp_customers', JSON.stringify(mappedCustomers));
      }

      if (suppliersData) {
        setSuppliers(suppliersData.map(s => ({
          id: s.id,
          name: s.name,
          document: s.document,
          phone: s.phone,
          email: s.email,
          address: s.address
        })));
      }

      if (salesData) {
        const mappedSales = salesData.map(s => ({
          id: s.id,
          date: s.date,
          total: Number(s.total),
          paymentMethod: s.payment_method,
          customerId: s.customer_id,
          userId: s.user_id,
          taxAmount: s.tax_amount ? Number(s.tax_amount) : 0,
          netAmount: s.net_amount ? Number(s.net_amount) : Number(s.total),
          items: (s.sale_items || []).map((si: any) => ({
            productId: si.product_id,
            quantity: si.quantity,
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
        setLosses(lossesData.map(l => ({
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
        
        const mappedExpenses = expensesData.map(e => {
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
            status: status
          };
        });
        setExpenses(mappedExpenses);
        localStorage.setItem('erp_expenses', JSON.stringify(mappedExpenses));
      }

      if (movementsData) {
        setStockMovements(movementsData.map(m => ({
          id: m.id,
          productId: m.product_id,
          type: m.type,
          quantity: m.quantity,
          origin: m.origin,
          date: m.date,
          userId: m.user_id,
          userName: m.user_name,
          productName: productsData?.find(p => p.id === m.product_id)?.name
        })));
      }

      if (inventoriesData) {
        setInventories(inventoriesData.map(i => ({
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
        setEmployees(employeesData.map(e => ({
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
        setSystemUsers(systemUsersData.map(u => ({
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

        // Check which profiles are missing
        const missingProfiles = defaultProfiles.filter(dp => 
          !accessProfilesData.some(ap => ap.name === dp.name)
        );

        if (missingProfiles.length > 0) {
          console.log('Inserting missing default profiles:', missingProfiles);
          const { data: newProfiles, error: insertError } = await supabase
            .from('access_profiles')
            .insert(missingProfiles)
            .select();
            
          if (!insertError && newProfiles) {
            // Combine existing and new profiles
            const allProfiles = [...accessProfilesData, ...newProfiles];
            setAccessProfiles(allProfiles.map(p => ({
              id: p.id,
              name: p.name,
              description: p.description
            })));
          } else {
            console.error('Error inserting missing profiles:', insertError);
            // Fallback to just showing existing ones
            setAccessProfiles(accessProfilesData.map(p => ({
              id: p.id,
              name: p.name,
              description: p.description
            })));
          }
        } else {
          setAccessProfiles(accessProfilesData.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description
          })));
        }
      }

      if (permissionsData) {
        setPermissions(permissionsData.map(p => ({
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
        setDiscountLogs(discountLogsData.map(d => ({
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
        const registers = registersData.map(r => ({
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
        const active = registers.find(r => r.status === 'open');
        setActiveRegister(active || null);
      }

      if (movementsData_cash) {
        setCashMovements(movementsData_cash.map(m => ({
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
        setCashClosings(closingsData.map(c => ({
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
        setAuditLogs(auditLogsData.map(l => ({
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
        setLotes(lotesData.map(l => ({
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

      // Load company settings from localStorage as fallback for now
      const savedCompany = localStorage.getItem('company_settings');
      if (savedCompany) {
        setCompanySettings(JSON.parse(savedCompany));
      }

      // Load system settings from localStorage as fallback for now
      const savedSystem = localStorage.getItem('system_settings');
      if (savedSystem) {
        setSystemSettings(JSON.parse(savedSystem));
      }

      if (paymentMethodsData) {
        setPaymentMethods(paymentMethodsData.map(m => ({
          id: m.id,
          name: m.name,
          type: m.type,
          taxPercentage: Number(m.tax_percentage),
          taxFixed: Number(m.tax_value),
          active: m.active
        })));
        localStorage.setItem('payment_methods', JSON.stringify(paymentMethodsData));
      }

      if (maquininhasData) {
        setMaquininhas(maquininhasData.map(m => ({
          id: m.id,
          nome: m.nome,
          taxa_debito: Number(m.taxa_debito),
          taxa_credito: Number(m.taxa_credito),
          taxa_credito_parcelado: Number(m.taxa_credito_parcelado),
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

      if (savedProducts) setProducts(JSON.parse(savedProducts));
      else setProducts(INITIAL_PRODUCTS);

      if (savedCustomers) setCustomers(JSON.parse(savedCustomers));
      else setCustomers(INITIAL_CUSTOMERS);

      if (savedSales) setSales(JSON.parse(savedSales));
      else setSales(INITIAL_SALES);

      if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
      else setExpenses(INITIAL_EXPENSES);

      setLosses(INITIAL_LOSSES);
    }
  };

  useEffect(() => {
    let productsSubscription: any;
    let salesSubscription: any;
    let customersSubscription: any;
    let suppliersSubscription: any;
    let expensesSubscription: any;
    let registersSubscription: any;
    let movimentosSubscription: any;
    let categoriasSubscription: any;
    let subcategoriasSubscription: any;
    let departamentosSubscription: any;
    let paymentMethodsSubscription: any;

    const init = async () => {
      try {
        // Check Supabase session first
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('Found Supabase session, restoring user...');
          // Fetch user details from system_users table
          const { data: userData, error: userError } = await supabase
            .from('system_users')
            .select('*, employees(full_name), access_profiles(name)')
            .eq('id', session.user.id)
            .single();

          if (userData) {
            const user = {
              id: userData.id,
              name: userData.employees?.full_name || userData.username,
              email: userData.email || userData.username,
              role: userData.access_profiles?.name || userData.profile_id || 'user',
              profileId: userData.profile_id
            };
            setUser(user);
            localStorage.setItem('erp_user', JSON.stringify(user));
          } else {
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
          // No Supabase session, clear local storage to force re-login
          // This prevents RLS errors on tables that require authentication
          localStorage.removeItem('erp_user');
          setUser(null);
        }

        await fetchData();

        // Set up real-time subscriptions
        productsSubscription = supabase
          .channel('products-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchData())
          .subscribe();

        salesSubscription = supabase
          .channel('sales-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchData())
          .subscribe();

        customersSubscription = supabase
          .channel('customers-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => fetchData())
          .subscribe();

        suppliersSubscription = supabase
          .channel('suppliers-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => fetchData())
          .subscribe();

        expensesSubscription = supabase
          .channel('expenses-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchData())
          .subscribe();

        registersSubscription = supabase
          .channel('registers-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_registers' }, () => fetchData())
          .subscribe();

        movimentosSubscription = supabase
          .channel('movements-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_movements' }, () => fetchData())
          .subscribe();

        categoriasSubscription = supabase
          .channel('categorias-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias' }, () => fetchData())
          .subscribe();

        subcategoriasSubscription = supabase
          .channel('subcategorias-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'subcategorias' }, () => fetchData())
          .subscribe();

        departamentosSubscription = supabase
          .channel('departamentos-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'departamentos' }, () => fetchData())
          .subscribe();

        paymentMethodsSubscription = supabase
          .channel('payment-methods-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_methods' }, () => fetchData())
          .subscribe();

        const promotionsSubscription = supabase
          .channel('promotions-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'promotions' }, () => fetchData())
          .subscribe();

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
      if (customersSubscription) supabase.removeChannel(customersSubscription);
      if (suppliersSubscription) supabase.removeChannel(suppliersSubscription);
      if (expensesSubscription) supabase.removeChannel(expensesSubscription);
      if (registersSubscription) supabase.removeChannel(registersSubscription);
      if (movimentosSubscription) supabase.removeChannel(movimentosSubscription);
      if (categoriasSubscription) supabase.removeChannel(categoriasSubscription);
      if (subcategoriasSubscription) supabase.removeChannel(subcategoriasSubscription);
      if (departamentosSubscription) supabase.removeChannel(departamentosSubscription);
      if (paymentMethodsSubscription) supabase.removeChannel(paymentMethodsSubscription);
    };
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const cleanInput = username.trim();
      const cleanPassword = password.trim();

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
              if (cleanInput.toLowerCase() === 'admin' || cleanInput.toLowerCase() === 'administrador') {
                emailToUse = 'suporte@cpsstem.com.br';
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: cleanPassword,
      });

      if (error) {
        console.error('Supabase Auth Login error:', error.message);
        return false;
      }

      if (data.user) {
        // Fetch user details from system_users table
        const { data: userData, error: userError } = await supabase
          .from('system_users')
          .select('*, employees(full_name), access_profiles(name)')
          .eq('id', data.user.id)
          .single();

        if (userError || !userData) {
          console.error('Error fetching user details:', userError?.message);
          // Fallback if system_users entry is missing
          const fallbackUser = {
            id: data.user.id,
            name: data.user.email || emailToUse,
            email: data.user.email || emailToUse,
            role: 'user'
          };
          setUser(fallbackUser);
          localStorage.setItem('erp_user', JSON.stringify(fallbackUser));
        } else {
          const user = {
            id: userData.id,
            name: userData.employees?.full_name || userData.username,
            email: userData.email || userData.username,
            role: userData.access_profiles?.name || userData.profile_id || 'user',
            profileId: userData.profile_id
          };
          setUser(user);
          localStorage.setItem('erp_user', JSON.stringify(user));
        }
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('erp_user');
    setUser(null);
  };

  const addProduct = async (product: Product) => {
    let insertData = {
      name: product.name,
      subcategoria_id: product.subcategoria_id === '' ? null : product.subcategoria_id,
      sku: product.sku,
      cost_price: product.costPrice,
      sale_price: product.salePrice,
      stock: product.stock,
      min_stock: product.minStock,
      image: product.image,
      composition: product.composition,
      status: product.status || 'Ativo',
      codigo_mercadologico: product.codigo_mercadologico,
      validade: product.validade || null
    };

    let { data, error } = await supabase.from('products').insert([insertData]).select();

    // Fallback if composition or status column doesn't exist
    if (error && error.message && (error.message.includes('composition') || error.message.includes('status') || error.message.includes('codigo_mercadologico') || error.message.includes('validade'))) {
      console.warn('Alguma coluna não encontrada no Supabase. Tentando salvar sem campos extras...');
      if (error.message.includes('composition')) delete (insertData as any).composition;
      if (error.message.includes('status')) delete (insertData as any).status;
      if (error.message.includes('codigo_mercadologico')) delete (insertData as any).codigo_mercadologico;
      if (error.message.includes('validade')) delete (insertData as any).validade;
      
      const retry = await supabase.from('products').insert([insertData]).select();
      data = retry.data;
      error = retry.error;
      
      if (!error) {
        alert('Produto salvo, mas alguns campos (como Status, Composição ou Cód. Mercadológico) não foram salvos porque as colunas correspondentes não existem no seu banco de dados Supabase. Por favor, adicione as colunas "status" (text), "composition" (jsonb) e "codigo_mercadologico" (text) na tabela "products".');
      }
    }

    if (error) {
      console.error('Error adding product:', error.message, error.details, error.hint, error);
      alert(`Erro ao adicionar produto: ${error.message || JSON.stringify(error)}`);
    } else if (data) {
      await fetchData();
    }
  };

  const updateProduct = async (updated: Product) => {
    let updateData = {
      name: updated.name,
      subcategoria_id: updated.subcategoria_id === '' ? null : updated.subcategoria_id,
      sku: updated.sku,
      cost_price: updated.costPrice,
      sale_price: updated.salePrice,
      stock: updated.stock,
      min_stock: updated.minStock,
      image: updated.image,
      composition: updated.composition,
      status: updated.status || 'Ativo',
      codigo_mercadologico: updated.codigo_mercadologico,
      validade: updated.validade || null
    };

    let { error } = await supabase.from('products').update(updateData).eq('id', updated.id);

    // Fallback if composition or status column doesn't exist
    if (error && error.message && (error.message.includes('composition') || error.message.includes('status') || error.message.includes('codigo_mercadologico') || error.message.includes('validade'))) {
      console.warn('Alguma coluna não encontrada no Supabase. Tentando salvar sem campos extras...');
      if (error.message.includes('composition')) delete (updateData as any).composition;
      if (error.message.includes('status')) delete (updateData as any).status;
      if (error.message.includes('codigo_mercadologico')) delete (updateData as any).codigo_mercadologico;
      if (error.message.includes('validade')) delete (updateData as any).validade;

      const retry = await supabase.from('products').update(updateData).eq('id', updated.id);
      error = retry.error;
      
      if (!error) {
        alert('Produto atualizado, mas alguns campos (como Status ou Composição) não foram salvos porque as colunas correspondentes não existem no seu banco de dados Supabase. Por favor, adicione as colunas "status" (text) e "composition" (jsonb) na tabela "products".');
      }
    }

    if (error) {
      console.error('Error updating product:', error.message, error.details, error.hint, error);
      alert(`Erro ao atualizar produto: ${error.message || JSON.stringify(error)}`);
    } else {
      await fetchData();
    }
  };

  const deleteProduct = async (id: string) => {
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
  };

  const addSale = async (sale: Omit<Sale, 'id'>): Promise<Sale | null> => {
    console.log('DEBUG: addSale recebendo:', sale);
    const tempId = Math.random().toString(36).substring(2, 9);
    const newSale: Sale = { ...sale, id: tempId };

    try {
      let saleData, saleError;
      
      const insertPayload = {
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
        console.log('DEBUG: Fallback acionado. safePayload:', { tax_amount: sale.taxAmount, errorMsg });

        const errorMsg = saleError.message?.toLowerCase() || '';
        const safePayload: any = {
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
        return false;
      } else if (!saleData || saleData.length === 0) {
        console.warn('Sale inserted but no data returned. RLS might be preventing SELECT.');
        alert('Venda salva, mas os itens não puderam ser salvos devido a permissões (RLS).');
        return false;
      }

      if (!saleError && saleData && saleData.length > 0) {
        const saleId = saleData[0].id;
        
        // Log Audit
        await logAuditAction('venda', 'vendas', saleId, null, sale);

        const itemsToInsert = sale.items.map(item => {
          const product = products.find(p => p.id === item.productId);
          return {
            sale_id: saleId,
            product_id: item.productId,
            quantity: item.quantity,
            price: item.price,
            cost_price: product?.costPrice || 0,
            original_price: item.originalPrice || item.price,
            discount: item.discount || 0,
            promotion_id: item.promotionId || null
          };
        });
        
        console.log('Payload sale_items:', itemsToInsert);

        let { error: itemsError } = await supabase.from('sale_items').insert(itemsToInsert);
        
        if (itemsError && itemsError.message && itemsError.message.includes('column')) {
          console.warn('Retrying sale_items insert without original_price/discount columns...');
          const fallbackItems = sale.items.map(item => ({
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
                    await supabase.from('produto_lotes').update({ saldo_atual: lote.saldoAtual - deduction }).eq('id', lote.id);
                    qtyToDeduct -= deduction;
                  }

                  await supabase.from('products').update({ 
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
                await supabase.from('produto_lotes').update({ saldo_atual: lote.saldoAtual - deduction }).eq('id', lote.id);
                qtyToDeduct -= deduction;
              }

              await supabase.from('products').update({ stock: product.stock - item.quantity }).eq('id', product.id);
            }
          }
        }

        if (sale.customerId) {
          const customer = customers.find(c => c.id === sale.customerId);
          if (customer) {
            await supabase.from('customers').update({ total_spent: customer.totalSpent + sale.total }).eq('id', customer.id);
          }
        }

        await fetchData();
        
        return { ...sale, id: saleData[0].id };
      }
      return null;
    } catch (err: any) {
      console.error('Error in addSale Supabase sync:', err);
      alert(`Erro inesperado ao salvar venda no banco de dados: ${err.message || JSON.stringify(err)}`);
      return null;
    }
  };

  const addReturn = async (returnData: Omit<Return, 'id'>): Promise<boolean> => {
    try {
      const { data: returnRes, error: returnError } = await supabase
        .from('returns')
        .insert([{
          sale_id: returnData.saleId,
          date: returnData.date,
          total: returnData.total,
          type: returnData.type,
          refund_method: returnData.refundMethod,
          user_id: user?.id || null,
          status: returnData.status
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

        const itemsToInsert = returnData.items.map(item => ({
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
              product_id: item.productId,
              type: 'ENTRADA',
              quantity: item.quantity,
              origin: `Devolução #${returnId.substring(0, 8)}`,
              date: returnData.date,
              user_id: user?.id || 'Sistema',
              user_name: user?.name || 'Sistema'
            }]);

            await supabase.from('products').update({ stock: product.stock + item.quantity }).eq('id', product.id);
          }
        }

        // If refund method is cash, record cash movement
        if (returnData.refundMethod === 'Dinheiro' && activeRegister) {
          await addCashMovement({
            cashRegisterId: activeRegister.id,
            type: 'sangria',
            amount: returnData.total,
            reason: `Devolução Venda #${returnData.saleId.substring(0, 8)}`
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
  };

  const addDiscountLog = async (log: Omit<DiscountLog, 'id'>) => {
    const { error } = await supabase.from('vendas_descontos').insert([{
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
      await fetchData();
    } else {
      console.error('Error adding discount log:', error);
    }
  };

  const addCustomer = async (customer: Customer) => {
    const { error } = await supabase.from('customers').insert([{
      name: customer.name,
      document: customer.document,
      phone: customer.phone,
      email: customer.email,
      total_spent: customer.totalSpent,
      status: customer.status,
      image: customer.image
    }]);

    if (!error) {
      await fetchData();
    }
  };

  const addSupplier = async (supplier: Supplier) => {
    const { error } = await supabase.from('suppliers').insert([{
      name: supplier.name,
      document: supplier.document,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address
    }]);

    if (!error) {
      await fetchData();
    }
  };

  const updateSupplier = async (supplier: Supplier) => {
    const { error } = await supabase.from('suppliers').update({
      name: supplier.name,
      document: supplier.document,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address
    }).eq('id', supplier.id);
    if (!error) await fetchData();
    else console.error('Error updating supplier:', error);
  };

  const deleteSupplier = async (id: string) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (!error) await fetchData();
    else console.error('Error deleting supplier:', error);
  };

  const addLoss = async (loss: Omit<Loss, 'id'>) => {
    const { error } = await supabase.from('losses').insert([{
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
                await supabase.from('produto_lotes').update({ saldo_atual: lote.saldoAtual - deduction }).eq('id', lote.id);
                qtyToDeduct -= deduction;
              }

              await supabase.from('products').update({ 
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
              await supabase.from('produto_lotes').update({ saldo_atual: lote.saldoAtual - deduction }).eq('id', lote.id);
              qtyToDeduct -= deduction;
            }
          }

          await supabase.from('products').update({
            stock: product.stock - loss.quantity
          }).eq('id', product.id);
        }
      }
      await fetchData();
    } else {
      console.error('Error adding loss:', JSON.stringify(error, null, 2), error);
      throw new Error('Failed to add loss');
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    const { error } = await supabase.from('expenses').insert([{
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
      status: expense.status
    }]);

    if (!error) {
      await fetchData();
    } else {
      console.error('Error adding expense:', JSON.stringify(error, null, 2), error);
      throw new Error('Failed to add expense');
    }
  };

  const addStockMovement = async (movement: Omit<StockMovement, 'id'>) => {
    const { error } = await supabase.from('stock_movements').insert([{
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
        if (movement.type !== 'COMPRA') {
          await supabase.from('products').update({
            stock: product.stock + movement.quantity
          }).eq('id', product.id);
        }
      }
      await fetchData();
    } else {
      console.error('Error adding stock movement:', JSON.stringify(error, null, 2), error);
      alert('Erro ao registrar movimentação. Verifique se a tabela "stock_movements" existe no Supabase.');
      throw new Error('Failed to add stock movement');
    }
  };

  const addInventory = async (inventory: Omit<Inventory, 'id'>) => {
    const { error } = await supabase.from('inventories').insert([{
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
      await fetchData();
      return true;
    } else {
      console.error('Error adding inventory:', JSON.stringify(error, null, 2), error);
      // Fallback if columns don't exist yet - try without new columns
      const { error: retryError } = await supabase.from('inventories').insert([{
        date: inventory.date,
        location: inventory.location,
        items_counted: inventory.itemsCounted,
        divergence_value: inventory.divergenceValue,
        status: inventory.status,
        notes: inventory.notes
      }]);
      
      if (!retryError) {
        await fetchData();
        return true;
      } else {
        console.error('Retry error adding inventory:', JSON.stringify(retryError, null, 2), retryError);
        alert('Erro ao registrar inventário. Verifique se a tabela "inventories" existe no Supabase.');
        throw new Error('Failed to add inventory');
      }
    }
  };

  const updateCustomer = async (customer: Customer) => {
    const { error } = await supabase.from('customers').update({
      name: customer.name,
      document: customer.document,
      phone: customer.phone,
      email: customer.email,
      total_spent: customer.totalSpent,
      status: customer.status,
      image: customer.image
    }).eq('id', customer.id);
    if (!error) await fetchData();
    else console.error('Error updating customer:', error);
  };

  const deleteCustomer = async (id: string) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (!error) await fetchData();
    else console.error('Error deleting customer:', error);
  };

  const updateSale = async (sale: Sale) => {
    // Note: Updating a sale with items is complex. This is a simplified version.
    const { error } = await supabase.from('sales').update({
      total: sale.total,
      payment_method: sale.paymentMethod,
      customer_id: sale.customerId,
      date: sale.date
    }).eq('id', sale.id);
    if (!error) await fetchData();
    else console.error('Error updating sale:', error);
  };

  const deleteSale = async (id: string) => {
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (!error) await fetchData();
    else console.error('Error deleting sale:', error);
  };

  const updateLoss = async (loss: Loss) => {
    const { error } = await supabase.from('losses').update({
      product_id: loss.productId,
      quantity: loss.quantity,
      reason: loss.reason,
      date: loss.date,
      total_value: loss.totalValue
    }).eq('id', loss.id);
    if (!error) await fetchData();
    else console.error('Error updating loss:', error);
  };

  const deleteLoss = async (id: string) => {
    const { error } = await supabase.from('losses').delete().eq('id', id);
    if (!error) await fetchData();
    else console.error('Error deleting loss:', error);
  };

  const updateExpense = async (expense: Expense) => {
    const { error } = await supabase.from('expenses').update({
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
      status: expense.status
    }).eq('id', expense.id);
    if (!error) await fetchData();
    else console.error('Error updating expense:', error);
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) await fetchData();
    else console.error('Error deleting expense:', error);
  };

  const updateStockMovement = async (movement: StockMovement) => {
    const { error } = await supabase.from('stock_movements').update({
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
  };

  const deleteStockMovement = async (id: string) => {
    const { error } = await supabase.from('stock_movements').delete().eq('id', id);
    if (!error) await fetchData();
    else console.error('Error deleting stock movement:', error);
  };

  const updateInventory = async (inventory: Inventory) => {
    const { error } = await supabase.from('inventories').update({
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
  };

  const deleteInventory = async (id: string) => {
    const { error } = await supabase.from('inventories').delete().eq('id', id);
    if (!error) await fetchData();
    else console.error('Error deleting inventory:', error);
  };

  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    const { error } = await supabase.from('employees').insert([{
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
  };

  const updateEmployee = async (employee: Employee) => {
    const { error } = await supabase.from('employees').update({
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
  };

  const deleteEmployee = async (id: string) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (!error) await fetchData();
    else console.error('Error deleting employee:', error);
  };

  const addSystemUser = async (systemUser: Omit<SystemUser, 'id'>, password?: string) => {
    try {
      // 1. Create user in Supabase Auth via Server Action/API Route (to use Service Role)
      // We need to do this server-side because the client key cannot create users directly without email confirmation flow usually
      // or we use a specific API route that uses the Service Role Key.
      
      let authUserId = null;
      
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
    } catch (err) {
      console.error('Unexpected error in addSystemUser:', err);
      alert('Erro inesperado ao criar usuário.');
    }
  };

  const updateSystemUser = async (systemUser: SystemUser, password?: string) => {
    try {
      // 1. Update Auth user if password changed or email changed
      // Note: Changing email in Auth usually requires re-confirmation.
      // For now, let's assume we only update password via this API for simplicity, 
      // or if we want to update email, we pass it.
      
      if (password || systemUser.email) {
        const updatePayload: any = {};
        if (password) updatePayload.password = password;
        if (systemUser.email) updatePayload.email = systemUser.email;

        const response = await fetch(`/api/admin/users/${systemUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        });

        if (!response.ok) {
          const data = await response.json();
          
          if (data.error && (data.error.includes('User not found') || data.error.includes('User not allowed'))) {
             // Try to create the user instead
             console.log('User might not exist in Auth, trying to create...');
             const createResponse = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  username: systemUser.username,
                  email: systemUser.email,
                  password: password || 'mudar123', // Default password if trying to create without one? Or require it.
                  user_metadata: {
                    name: systemUser.username
                  }
                })
             });
             
             if (createResponse.ok) {
                const createData = await createResponse.json();
                console.log('User created in Auth during update:', createData.user.id);
                alert('Login recriado com sucesso. Tente logar com a nova senha.');
             } else {
                const createData = await createResponse.json();
                alert(`Erro ao atualizar e ao tentar recriar login: ${createData.error}`);
                return;
             }
          } else {
             alert(`Erro ao atualizar login: ${data.error}`);
             return;
          }
        }
      }

      // 2. Update system_users table
      let updateData: any = {
        username: systemUser.username,
        email: systemUser.email,
        employee_id: systemUser.employeeId,
        profile_id: systemUser.profileId,
        store_id: systemUser.storeId,
        status: systemUser.status
      };

      if (password) {
        updateData.password_hash = await bcrypt.hash(password, 10);
      }

      const { error } = await supabase.from('system_users').update(updateData).eq('id', systemUser.id);
      
      if (!error) {
        await fetchData();
        alert('Usuário atualizado com sucesso!');
      } else {
        console.error('Error updating system user:', error);
        alert(`Erro ao atualizar dados: ${error.message}`);
      }
    } catch (err) {
      console.error('Unexpected error in updateSystemUser:', err);
      alert('Erro inesperado ao atualizar usuário.');
    }
  };

  const deleteSystemUser = async (id: string) => {
    try {
      // 1. Delete from Auth
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Error deleting auth user:', data.error);
        alert(`Erro ao excluir login: ${data.error}`);
        // If auth delete fails, should we delete from DB? Maybe not.
        return;
      }

      // 2. Delete from DB
      const { error } = await supabase.from('system_users').delete().eq('id', id);
      
      if (!error) {
        await fetchData();
        alert('Usuário excluído com sucesso!');
      } else {
        console.error('Error deleting system user:', error);
        alert(`Erro ao excluir dados: ${error.message}`);
      }
    } catch (err) {
      console.error('Unexpected error in deleteSystemUser:', err);
      alert('Erro inesperado ao excluir usuário.');
    }
  };

  const addAccessProfile = async (profile: Omit<AccessProfile, 'id'>) => {
    const { error } = await supabase.from('access_profiles').insert([{
      name: profile.name,
      description: profile.description
    }]);
    if (!error) await fetchData();
    else console.error('Error adding access profile:', error);
  };

  const updateAccessProfile = async (profile: AccessProfile) => {
    const { error } = await supabase.from('access_profiles').update({
      name: profile.name,
      description: profile.description
    }).eq('id', profile.id);
    if (!error) await fetchData();
    else console.error('Error updating access profile:', error);
  };

  const deleteAccessProfile = async (id: string) => {
    const { error } = await supabase.from('access_profiles').delete().eq('id', id);
    if (!error) await fetchData();
    else console.error('Error deleting access profile:', error);
  };

  const updatePermissions = async (profileId: string, perms: Omit<Permission, 'id'>[]) => {
    // Delete existing permissions for profile
    await supabase.from('permissions').delete().eq('profile_id', profileId);
    
    // Insert new permissions
    const { error } = await supabase.from('permissions').insert(
      perms.map(p => ({
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
  };

  const updatePricingSettings = (settings: PricingSettings) => {
    setPricingSettings(settings);
    localStorage.setItem('pricing_settings', JSON.stringify(settings));
  };

  const updateCompanySettings = (settings: CompanySettings) => {
    setCompanySettings(settings);
    localStorage.setItem('company_settings', JSON.stringify(settings));
  };

  const updateSystemSettings = (settings: SystemSettings) => {
    setSystemSettings(settings);
    localStorage.setItem('system_settings', JSON.stringify(settings));
  };

  const sendEmailNotification = async (to: string, subject: string, body: string, html?: string) => {
    try {
      const response = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, subject, body, html }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          console.error('Erro ao enviar e-mail:', errorData.error || errorData);
        } else {
          const errorText = await response.text();
          console.error('Erro ao enviar e-mail (não-JSON):', errorText.substring(0, 100));
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro de rede ao enviar e-mail:', error);
      return false;
    }
  };

  const addPaymentMethod = async (method: Omit<PaymentMethod, 'id'>) => {
    const { error } = await supabase.from('payment_methods').insert([{
      name: method.name,
      type: method.type,
      tax_percentage: method.taxPercentage,
      tax_value: method.taxFixed,
      active: method.active
    }]);
    if (!error) {
      await fetchData();
    } else {
      console.error('Error adding payment method details:', JSON.stringify(error, null, 2));
      alert(`Erro ao adicionar forma de pagamento: ${error.message || 'Erro desconhecido'}`);
      // Fallback
      const newMethod = { ...method, id: Math.random().toString(36).substr(2, 9) };
      const updated = [...paymentMethods, newMethod];
      setPaymentMethods(updated);
      localStorage.setItem('payment_methods', JSON.stringify(updated));
    }
  };

  const updatePaymentMethod = async (method: PaymentMethod) => {
    const { error } = await supabase.from('payment_methods').update({
      name: method.name,
      type: method.type,
      tax_percentage: method.taxPercentage,
      tax_value: method.taxFixed,
      active: method.active
    }).eq('id', method.id);
    if (!error) {
      await fetchData();
    } else {
      console.error('Error updating payment method:', error);
      // Fallback
      const updated = paymentMethods.map(m => m.id === method.id ? method : m);
      setPaymentMethods(updated);
      localStorage.setItem('payment_methods', JSON.stringify(updated));
    }
  };

  const deletePaymentMethod = async (id: string) => {
    console.log('Context: deletePaymentMethod called with ID:', id);
    const { data, error } = await supabase.from('payment_methods').delete().eq('id', id);
    
    if (error) {
      console.error('Context: Error deleting payment method from Supabase:', JSON.stringify(error, null, 2));
      // Fallback to local deletion if table doesn't exist or other error
      const updated = paymentMethods.filter(m => m.id !== id);
      setPaymentMethods(updated);
      localStorage.setItem('payment_methods', JSON.stringify(updated));
      console.log('Context: Fallback to local deletion performed.');
    } else {
      console.log('Context: Payment method deleted successfully from Supabase. Data:', data);
      await fetchData();
    }
  };

  const addCategoria = async (categoria: Omit<Categoria, 'id'>) => {
    const { error } = await supabase.from('categorias').insert([categoria]);
    if (error) {
      console.error('Error adding categoria:', error);
      alert('Erro ao adicionar categoria');
    } else {
      await fetchData();
    }
  };

  const addExpenseCategory = async (categoria: Omit<ExpenseCategory, 'id'>) => {
    const { error } = await supabase.from('expense_categories').insert([categoria]);
    if (error) {
      console.error('Error adding expense category:', error);
      alert('Erro ao adicionar categoria de despesa');
    } else {
      await fetchData();
    }
  };

  const updateCategoria = async (categoria: Categoria) => {
    const { error } = await supabase.from('categorias').update(categoria).eq('id', categoria.id);
    if (error) {
      console.error('Error updating categoria:', error);
      alert('Erro ao atualizar categoria');
    } else {
      await fetchData();
    }
  };

  const deleteCategoria = async (id: string) => {
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
  };

  const addSubcategoria = async (subcategoria: Omit<Subcategoria, 'id'>) => {
    const { error } = await supabase.from('subcategorias').insert([subcategoria]);
    if (error) {
      console.error('Error adding subcategoria:', error);
      alert('Erro ao adicionar subcategoria');
    } else {
      await fetchData();
    }
  };

  const updateSubcategoria = async (subcategoria: Subcategoria) => {
    const { error } = await supabase.from('subcategorias').update(subcategoria).eq('id', subcategoria.id);
    if (error) {
      console.error('Error updating subcategoria:', error);
      alert('Erro ao atualizar subcategoria');
    } else {
      await fetchData();
    }
  };

  const deleteSubcategoria = async (id: string) => {
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
  };

  const addDepartamento = async (departamento: Omit<Departamento, 'id'>) => {
    const { error } = await supabase.from('departamentos').insert([departamento]);
    if (error) {
      console.error('Error adding departamento:', error);
      alert('Erro ao adicionar departamento');
    } else {
      await fetchData();
    }
  };

  const updateDepartamento = async (departamento: Departamento) => {
    const { error } = await supabase.from('departamentos').update(departamento).eq('id', departamento.id);
    if (error) {
      console.error('Error updating departamento:', error);
      alert('Erro ao atualizar departamento');
    } else {
      await fetchData();
    }
  };

  const deleteDepartamento = async (id: string) => {
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
  };

  const logAuditAction = async (action: string, module: string, entityId?: string, oldData?: any, newData?: any) => {
    try {
      await supabase.from('audit_logs').insert([{
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
    } catch (error) {
      console.error('Error logging audit action:', error);
    }
  };

  const openCashRegister = async (openingBalance: number, observation?: string) => {
    const { data, error } = await supabase.from('cash_registers').insert([{
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
  };

  const closeCashRegister = async (informedTotals: { method: string; informed: number; system: number }[], justification?: string) => {
    if (!activeRegister) return;

    const totalSystem = informedTotals.reduce((acc, curr) => acc + curr.system, 0);
    const totalInformed = informedTotals.reduce((acc, curr) => acc + curr.informed, 0);
    const totalDifference = totalInformed - totalSystem;

    // 1. Update Register Status
    const { error: regError } = await supabase.from('cash_registers').update({
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
    const summaryToInsert = informedTotals.map(item => ({
      cash_register_id: activeRegister.id,
      payment_method: item.method,
      system_total: item.system,
      informed_total: item.informed,
      difference: item.informed - item.system
    }));

    await supabase.from('cash_sales_summary').insert(summaryToInsert);

    // 3. Insert Closing Record
    const { data: closingData } = await supabase.from('cash_closings').insert([{
      cash_register_id: activeRegister.id,
      total_system: totalSystem,
      total_informed: totalInformed,
      total_difference: totalDifference,
      justification,
      approved_by: totalDifference === 0 ? (await supabase.auth.getUser()).data.user?.id : null // Auto-approve if no difference
    }]).select();

    await logAuditAction('fechamento', 'caixa', activeRegister.id, null, { totalSystem, totalInformed, totalDifference, justification });
    await fetchData();
  };

  const addMaquininha = async (maquininha: Omit<Maquininha, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('maquininhas').insert([maquininha]);
    if (!error) await fetchData();
  };

  const updateMaquininha = async (maquininha: Maquininha) => {
    const { error } = await supabase.from('maquininhas').update({
      nome: maquininha.nome,
      taxa_debito: maquininha.taxa_debito,
      taxa_credito: maquininha.taxa_credito,
      taxa_credito_parcelado: maquininha.taxa_credito_parcelado,
      ativo: maquininha.ativo
    }).eq('id', maquininha.id);
    if (!error) await fetchData();
  };

  const deleteMaquininha = async (id: string) => {
    const { error } = await supabase.from('maquininhas').delete().eq('id', id);
    if (!error) await fetchData();
  };

  const addCashMovement = async (movement: Omit<CashMovement, 'id' | 'createdAt' | 'createdBy'>) => {
    const { data, error } = await supabase.from('cash_movements').insert([{
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
  };

  const suspendCashRegister = async () => {
    if (!activeRegister) return;
    const { error } = await supabase.from('cash_registers').update({ status: 'suspended' }).eq('id', activeRegister.id);
    if (!error) {
      await logAuditAction('suspensao', 'caixa', activeRegister.id);
      await fetchData();
    }
  };

  const blockCashRegister = async (reason: string) => {
    if (!activeRegister) return;
    const { error } = await supabase.from('cash_registers').update({ 
      status: 'blocked',
      observation: (activeRegister.observation || '') + ' | Bloqueado: ' + reason 
    }).eq('id', activeRegister.id);
    if (!error) {
      await logAuditAction('bloqueio', 'caixa', activeRegister.id, null, { reason });
      await fetchData();
    }
  };

  const hasPermission = (module: string, action: 'view' | 'create' | 'edit' | 'delete') => {
    if (!user) return false;
    if (user.role === 'Administrador') return true;
    
    const profilePerms = permissions.filter(p => p.profileId === user.profileId);
    const modPerm = profilePerms.find(p => p.module === module);
    
    if (!modPerm) return false;
    
    switch (action) {
      case 'view': return modPerm.canView;
      case 'create': return modPerm.canCreate;
      case 'edit': return modPerm.canEdit;
      case 'delete': return modPerm.canDelete;
      default: return false;
    }
  };

  const seedMercadologicalTree = async () => {
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
            .insert([{ nome: dept.nome, codigo: dept.codigo, ativo: true }])
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
              .insert([{ nome: cat.nome, codigo: cat.codigo, departamento_id: deptId }])
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
                .insert([{ nome: sub.nome, codigo: sub.codigo, categoria_id: catId }]);

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
  };

  const seedExpenseCategories = async () => {
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
          await supabase.from('expense_categories').insert([{ nome: name }]);
        }
      }
      await fetchData();
    } catch (error) {
      console.error('Error seeding expense categories:', error);
    }
  };

  const addPromotion = async (promotion: Omit<Promotion, 'id'>) => {
    if (user?.role !== 'Administrador') {
      alert('Apenas administradores podem criar promoções.');
      return;
    }
    const { error } = await supabase.from('promotions').insert([{
      name: promotion.name,
      type: promotion.type,
      start_date: promotion.startDate,
      end_date: promotion.endDate,
      status: promotion.status,
      target_type: promotion.targetType,
      target_id: promotion.targetId,
      discount_value: promotion.discountValue,
      buy_quantity: promotion.buyQuantity,
      pay_quantity: promotion.payQuantity,
      combo_items: promotion.comboItems,
      combo_price: promotion.comboPrice,
      apply_automatically: promotion.applyAutomatically,
      limit_per_customer: promotion.limitPerCustomer,
      quantity_limit: promotion.quantityLimit,
      days_of_week: promotion.daysOfWeek
    }]);
    if (!error) await fetchData();
    else {
      console.error('Error adding promotion:', error);
      alert(`Erro ao adicionar promoção: ${error.message || JSON.stringify(error)}`);
    }
  };

  const updatePromotion = async (promotion: Promotion) => {
    if (user?.role !== 'Administrador') {
      alert('Apenas administradores podem editar promoções.');
      return;
    }
    const { error } = await supabase.from('promotions').update({
      name: promotion.name,
      type: promotion.type,
      start_date: promotion.startDate,
      end_date: promotion.endDate,
      status: promotion.status,
      target_type: promotion.targetType,
      target_id: promotion.targetId,
      discount_value: promotion.discountValue,
      buy_quantity: promotion.buyQuantity,
      pay_quantity: promotion.payQuantity,
      combo_items: promotion.comboItems,
      combo_price: promotion.comboPrice,
      apply_automatically: promotion.applyAutomatically,
      limit_per_customer: promotion.limitPerCustomer,
      quantity_limit: promotion.quantityLimit,
      days_of_week: promotion.daysOfWeek
    }).eq('id', promotion.id);
    if (!error) await fetchData();
    else {
      console.error('Error updating promotion:', error);
      alert(`Erro ao atualizar promoção: ${error.message || JSON.stringify(error)}`);
    }
  };

  const deletePromotion = async (id: string) => {
    if (user?.role !== 'Administrador') {
      throw new Error('Apenas administradores podem excluir promoções.');
    }
    const { error } = await supabase.from('promotions').delete().eq('id', id);
    if (!error) await fetchData();
    else {
      console.error('Error deleting promotion:', error);
      throw error;
    }
  };

  return (
    <ERPContext.Provider value={{ 
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
      user,
      hasPermission,
      discountLogs,
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
      paymentMethods,
      addPaymentMethod,
      updatePaymentMethod,
      deletePaymentMethod,
      maquininhas,
      addMaquininha,
      updateMaquininha,
      deleteMaquininha,
      addPromotion,
      updatePromotion,
      deletePromotion,
      lotes,
      login,
      logout,
      seedMercadologicalTree,
      seedExpenseCategories
    }}>
      {!isLoading && children}
    </ERPContext.Provider>
  );
}

export function useERP() {
  const context = useContext(ERPContext);
  if (context === undefined) throw new Error('useERP must be used within an ERPProvider');
  return context;
}
