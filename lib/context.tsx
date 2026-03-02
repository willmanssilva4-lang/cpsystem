'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Sale, Customer, Loss, Expense, INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_LOSSES, INITIAL_SALES, INITIAL_EXPENSES } from './types';
import { supabase } from './supabase';

interface ERPContextType {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  losses: Loss[];
  expenses: Expense[];
  user: { name: string; email: string; role: string } | null;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id'>) => void;
  addCustomer: (customer: Customer) => void;
  addLoss: (loss: Omit<Loss, 'id'>) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
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
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const { data: productsData } = await supabase.from('products').select('*');
      const { data: customersData } = await supabase.from('customers').select('*');
      const { data: salesData } = await supabase.from('sales').select('*, sale_items(*)');
      const { data: lossesData } = await supabase.from('losses').select('*');
      const { data: expensesData } = await supabase.from('expenses').select('*');

      if (productsData) {
        setProducts(productsData.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          sku: p.sku,
          costPrice: Number(p.cost_price),
          salePrice: Number(p.sale_price),
          stock: p.stock,
          minStock: p.min_stock,
          image: p.image?.includes('mercadinhosupernice.com.br') ? 'https://picsum.photos/seed/product/200/200' : p.image,
          composition: p.composition || []
        })));
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
      composition: product.composition
    };

    let { data, error } = await supabase.from('products').insert([insertData]).select();

    // Fallback if composition column doesn't exist
    if (error && error.message && error.message.includes('composition')) {
      console.warn('Coluna composition não encontrada. Tentando salvar sem a composição...');
      delete (insertData as any).composition;
      const retry = await supabase.from('products').insert([insertData]).select();
      data = retry.data;
      error = retry.error;
      if (!error) {
        alert('Produto salvo, mas a composição do kit não foi salva porque a coluna "composition" (jsonb) não existe no banco de dados Supabase.');
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
      composition: updated.composition
    };

    let { error } = await supabase.from('products').update(updateData).eq('id', updated.id);

    // Fallback if composition column doesn't exist
    if (error && error.message && error.message.includes('composition')) {
      console.warn('Coluna composition não encontrada. Tentando salvar sem a composição...');
      delete (updateData as any).composition;
      const retry = await supabase.from('products').update(updateData).eq('id', updated.id);
      error = retry.error;
      if (!error) {
        alert('Produto atualizado, mas a composição do kit não foi salva porque a coluna "composition" (jsonb) não existe no banco de dados Supabase.');
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
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        console.error('Error deleting product from Supabase:', error);
        throw error;
      }
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
          await supabase.from('products').update({ stock: product.stock - item.quantity }).eq('id', product.id);
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
        await supabase.from('products').update({
          stock: product.stock - loss.quantity
        }).eq('id', product.id);
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

  return (
    <ERPContext.Provider value={{ 
      products, 
      sales, 
      customers, 
      losses,
      expenses,
      user,
      addProduct, 
      updateProduct, 
      deleteProduct,
      addSale, 
      addCustomer,
      addLoss,
      addExpense,
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
