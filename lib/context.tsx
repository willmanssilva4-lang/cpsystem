'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Sale, Customer, Loss, Expense, PricingSettings, CompanySettings, CompositionItem, StockMovement, Inventory, Employee, SystemUser, AccessProfile, Permission, SystemSettings, DiscountLog, CashRegister, CashMovement, CashSalesSummary, CashClosing, AuditLog, INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_LOSSES, INITIAL_SALES, INITIAL_EXPENSES } from './types';
import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

interface ERPContextType {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  losses: Loss[];
  expenses: Expense[];
  categories: { id: string; name: string; description: string }[];
  stockMovements: StockMovement[];
  inventories: Inventory[];
  employees: Employee[];
  systemUsers: SystemUser[];
  accessProfiles: AccessProfile[];
  permissions: Permission[];
  pricingSettings: PricingSettings;
  companySettings: CompanySettings;
  systemSettings: SystemSettings;
  user: { id: string; name: string; email: string; role: string; profileId?: string } | null;
  hasPermission: (module: string, action: 'view' | 'create' | 'edit' | 'delete') => boolean;
  discountLogs: DiscountLog[];
  cashRegisters: CashRegister[];
  cashMovements: CashMovement[];
  cashClosings: CashClosing[];
  activeRegister: CashRegister | null;
  openCashRegister: (openingBalance: number, observation?: string) => Promise<void>;
  closeCashRegister: (informedTotals: { method: string; informed: number; system: number }[], justification?: string) => Promise<void>;
  addCashMovement: (movement: Omit<CashMovement, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>;
  suspendCashRegister: () => Promise<void>;
  blockCashRegister: (reason: string) => Promise<void>;
  logAuditAction: (action: string, module: string, entityId?: string, oldData?: any, newData?: any) => Promise<void>;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id'>) => void;
  addDiscountLog: (log: Omit<DiscountLog, 'id'>) => Promise<void>;
  addCustomer: (customer: Customer) => void;
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
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
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
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export function ERPProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [losses, setLosses] = useState<Loss[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; description: string }[]>([]);
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
      const { data: salesData } = await supabase.from('sales').select('*, sale_items(*)');
      const { data: lossesData } = await supabase.from('losses').select('*');
      const { data: expensesData } = await supabase.from('expenses').select('*');
      const { data: movementsData } = await supabase.from('stock_movements').select('*');
      const { data: inventoriesData } = await supabase.from('inventories').select('*');
      const { data: employeesData } = await supabase.from('employees').select('*');
      const { data: systemUsersData } = await supabase.from('system_users').select('*');
      const { data: accessProfilesData } = await supabase.from('access_profiles').select('*');
      const { data: permissionsData } = await supabase.from('permissions').select('*');
      const { data: discountLogsData } = await supabase.from('vendas_descontos').select('*');
      const { data: registersData } = await supabase.from('cash_registers').select('*');
      const { data: movementsData_cash } = await supabase.from('cash_movements').select('*');
      const { data: closingsData } = await supabase.from('cash_closings').select('*');
      const { data: auditLogsData } = await supabase.from('audit_logs').select('*');
      const { data: categoriesData } = await supabase.from('categories').select('*').order('name');

      if (productsData) {
        const baseProducts = productsData.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          categoryId: p.category_id,
          sku: p.sku,
          costPrice: Number(p.cost_price),
          salePrice: Number(p.sale_price),
          stock: p.stock,
          minStock: p.min_stock,
          image: p.image?.includes('mercadinhosupernice.com.br') ? 'https://picsum.photos/seed/product/200/200' : p.image,
          composition: p.composition || [],
          status: p.status || 'Ativo'
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
                // If a component is missing, we can't form any kits
                possibleStock = 0;
              }
            });
            return { ...p, stock: possibleStock === Infinity ? 0 : possibleStock };
          }
          return p;
        });

        setProducts(finalProducts);
      }

      if (categoriesData) {
        setCategories(categoriesData);
      }

      if (customersData) {
        setCustomers(customersData.map(c => ({
          id: c.id,
          name: c.name,
          document: c.document,
          phone: c.phone,
          email: c.email,
          totalSpent: Number(c.total_spent),
          status: c.status,
          image: c.image?.includes('mercadinhosupernice.com.br') ? 'https://i.pravatar.cc/150' : c.image
        })));
      }

      if (salesData) {
        setSales(salesData.map(s => ({
          id: s.id,
          date: s.date,
          total: Number(s.total),
          paymentMethod: s.payment_method,
          customerId: s.customer_id,
          items: s.sale_items.map((si: any) => ({
            productId: si.product_id,
            quantity: si.quantity,
            price: Number(si.price)
          }))
        })));
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
        setExpenses(expensesData.map(e => ({
          id: e.id,
          description: e.description,
          category: e.category,
          amount: Number(e.amount),
          date: e.date,
          status: e.status as 'Pago' | 'Pendente'
        })));
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
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fallback to initial data if Supabase fails or is not configured
      setProducts(INITIAL_PRODUCTS);
      setCustomers(INITIAL_CUSTOMERS);
      setSales(INITIAL_SALES);
      setLosses(INITIAL_LOSSES);
      setExpenses(INITIAL_EXPENSES);
    }
  };

  useEffect(() => {
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
          // Fallback to localStorage if no Supabase session (legacy or dev)
          const savedUser = localStorage.getItem('erp_user');
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        }

        await fetchData();
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
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
      category: product.category,
      category_id: product.categoryId,
      sku: product.sku,
      cost_price: product.costPrice,
      sale_price: product.salePrice,
      stock: product.stock,
      min_stock: product.minStock,
      image: product.image,
      composition: product.composition,
      status: product.status || 'Ativo'
    };

    let { data, error } = await supabase.from('products').insert([insertData]).select();

    // Fallback if composition or status column doesn't exist
    if (error && error.message && (error.message.includes('composition') || error.message.includes('status'))) {
      console.warn('Alguma coluna não encontrada no Supabase. Tentando salvar sem campos extras...');
      if (error.message.includes('composition')) delete (insertData as any).composition;
      if (error.message.includes('status')) delete (insertData as any).status;
      
      const retry = await supabase.from('products').insert([insertData]).select();
      data = retry.data;
      error = retry.error;
      
      if (!error) {
        alert('Produto salvo, mas alguns campos (como Status ou Composição) não foram salvos porque as colunas correspondentes não existem no seu banco de dados Supabase. Por favor, adicione as colunas "status" (text) e "composition" (jsonb) na tabela "products".');
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
      category: updated.category,
      category_id: updated.categoryId,
      sku: updated.sku,
      cost_price: updated.costPrice,
      sale_price: updated.salePrice,
      stock: updated.stock,
      min_stock: updated.minStock,
      image: updated.image,
      composition: updated.composition,
      status: updated.status || 'Ativo'
    };

    let { error } = await supabase.from('products').update(updateData).eq('id', updated.id);

    // Fallback if composition or status column doesn't exist
    if (error && error.message && (error.message.includes('composition') || error.message.includes('status'))) {
      console.warn('Alguma coluna não encontrada no Supabase. Tentando salvar sem campos extras...');
      if (error.message.includes('composition')) delete (updateData as any).composition;
      if (error.message.includes('status')) delete (updateData as any).status;

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

  const addSale = async (sale: Omit<Sale, 'id'>) => {
    const { data: saleData, error: saleError } = await supabase.from('sales').insert([{
      customer_id: sale.customerId,
      total: sale.total,
      subtotal: sale.subtotal,
      discount: sale.discount,
      payment_method: sale.paymentMethod,
      date: sale.date,
      user_id: user?.email || 'system',
      cash_register_id: activeRegister?.id
    }]).select();

    if (!saleError && saleData) {
      const saleId = saleData[0].id;
      
      // Log Audit
      await logAuditAction('venda', 'vendas', saleId, null, sale);

      const itemsToInsert = sale.items.map(item => ({
        sale_id: saleId,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price,
        original_price: item.originalPrice,
        discount: item.discount
      }));

      await supabase.from('sale_items').insert(itemsToInsert);
      
      // Update stock and customer total spent
      for (const item of sale.items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          // Record stock movement
          await supabase.from('stock_movements').insert([{
            product_id: item.productId,
            type: 'SAÍDA',
            quantity: -item.quantity,
            origin: `Venda #${saleId.substring(0, 8)}`,
            date: sale.date,
            user_id: user?.email || 'system',
            user_name: user?.name || 'Sistema'
          }]);

          if (product.composition && product.composition.length > 0) {
            // It's a kit, deduct from components
            for (const comp of product.composition) {
              const componentProduct = products.find(p => p.id === comp.productId);
              if (componentProduct) {
                await supabase.from('products').update({ 
                  stock: componentProduct.stock - (comp.quantity * item.quantity) 
                }).eq('id', componentProduct.id);
              }
            }
          } else {
            // Regular product
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

  const addLoss = async (loss: Omit<Loss, 'id'>) => {
    const { error } = await supabase.from('losses').insert([{
      product_id: loss.productId,
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
          origin: `Perda: ${loss.reason}`,
          date: loss.date,
          user_id: user?.email || 'system',
          user_name: user?.name || 'Sistema'
        }]);

        if (product.composition && product.composition.length > 0) {
          // It's a kit, deduct from components
          for (const comp of product.composition) {
            const componentProduct = products.find(p => p.id === comp.productId);
            if (componentProduct) {
              await supabase.from('products').update({ 
                stock: componentProduct.stock - (comp.quantity * loss.quantity) 
              }).eq('id', componentProduct.id);
            }
          }
        } else {
          // Regular product
          await supabase.from('products').update({
            stock: product.stock - loss.quantity
          }).eq('id', product.id);
        }
      }
      await fetchData();
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    const { error } = await supabase.from('expenses').insert([{
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      status: expense.status
    }]);

    if (!error) {
      await fetchData();
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
      console.error('Error adding stock movement:', error);
      alert('Erro ao registrar movimentação. Verifique se a tabela "stock_movements" existe no Supabase.');
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
    } else {
      console.error('Error adding inventory:', error);
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
      } else {
        alert('Erro ao registrar inventário. Verifique se a tabela "inventories" existe no Supabase.');
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
      amount: expense.amount,
      date: expense.date,
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

  const logAuditAction = async (action: string, module: string, entityId?: string, oldData?: any, newData?: any) => {
    try {
      await supabase.from('audit_logs').insert([{
        user_id: user?.email || 'system', // Ideally we'd have the UUID here, but using email as fallback if needed
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

  return (
    <ERPContext.Provider value={{ 
      products, 
      sales, 
      customers, 
      losses,
      expenses,
      categories,
      stockMovements,
      inventories,
      employees,
      systemUsers,
      accessProfiles,
      permissions,
      pricingSettings,
      companySettings,
      systemSettings,
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
      addDiscountLog,
      addCustomer,
      addLoss,
      addExpense,
      addStockMovement,
      addInventory,
      updateCustomer,
      deleteCustomer,
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
      login,
      logout
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
