'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Sale, Customer, Loss, Expense, PricingSettings, CompositionItem, StockMovement, Inventory, INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_LOSSES, INITIAL_SALES, INITIAL_EXPENSES } from './types';
import { supabase } from './supabase';

interface ERPContextType {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  losses: Loss[];
  expenses: Expense[];
  stockMovements: StockMovement[];
  inventories: Inventory[];
  pricingSettings: PricingSettings;
  user: { name: string; email: string; role: string } | null;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id'>) => void;
  addCustomer: (customer: Customer) => void;
  addLoss: (loss: Omit<Loss, 'id'>) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  addStockMovement: (movement: Omit<StockMovement, 'id'>) => Promise<void>;
  addInventory: (inventory: Omit<Inventory, 'id'>) => Promise<void>;
  updatePricingSettings: (settings: PricingSettings) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export function ERPProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [losses, setLosses] = useState<Loss[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>({
    defaultMethod: 'markup',
    defaultMargin: 30,
    defaultMarkup: 50,
    allowEditOnProduct: true,
    autoRounding: false
  });
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
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

      if (productsData) {
        const baseProducts = productsData.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
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
          notes: i.notes
        })));
      }

      // Load pricing settings from localStorage as fallback for now
      const savedPricing = localStorage.getItem('pricing_settings');
      if (savedPricing) {
        setPricingSettings(JSON.parse(savedPricing));
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
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Usuário',
            email: session.user.email || '',
            role: session.user.user_metadata.role || 'admin'
          });
        }

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            setUser({
              name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Usuário',
              email: session.user.email || '',
              role: session.user.user_metadata.role || 'admin'
            });
          } else {
            setUser(null);
          }
        });

        await fetchData();
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error.message);
      return false;
    }

    return !!data.user;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const addProduct = async (product: Product) => {
    let insertData = {
      name: product.name,
      category: product.category,
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
      payment_method: sale.paymentMethod,
      date: sale.date
    }]).select();

    if (!saleError && saleData) {
      const saleId = saleData[0].id;
      const itemsToInsert = sale.items.map(item => ({
        sale_id: saleId,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price
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
      type: movement.type,
      quantity: movement.quantity,
      origin: movement.origin,
      date: movement.date,
      user_id: movement.userId,
      user_name: movement.userName
    }]);

    if (!error) {
      const product = products.find(p => p.id === movement.productId);
      if (product) {
        await supabase.from('products').update({
          stock: product.stock + movement.quantity
        }).eq('id', product.id);
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
      notes: inventory.notes
    }]);

    if (!error) {
      await fetchData();
    } else {
      console.error('Error adding inventory:', error);
      alert('Erro ao registrar inventário. Verifique se a tabela "inventories" existe no Supabase.');
    }
  };

  const updatePricingSettings = (settings: PricingSettings) => {
    setPricingSettings(settings);
    localStorage.setItem('pricing_settings', JSON.stringify(settings));
  };

  return (
    <ERPContext.Provider value={{ 
      products, 
      sales, 
      customers, 
      losses,
      expenses,
      stockMovements,
      inventories,
      pricingSettings,
      user,
      addProduct, 
      updateProduct, 
      deleteProduct,
      addSale, 
      addCustomer,
      addLoss,
      addExpense,
      addStockMovement,
      addInventory,
      updatePricingSettings,
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
