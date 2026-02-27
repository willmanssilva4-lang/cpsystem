'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Sale, Customer, INITIAL_PRODUCTS, INITIAL_CUSTOMERS } from './types';
import { supabase } from './supabase';

interface ERPContextType {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  user: { name: string; email: string; role: string } | null;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id'>) => void;
  addCustomer: (customer: Customer) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export function ERPProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const { data: productsData } = await supabase.from('products').select('*');
      const { data: customersData } = await supabase.from('customers').select('*');
      const { data: salesData } = await supabase.from('sales').select('*, sale_items(*)');

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
          image: p.image
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
          image: c.image
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
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fallback to initial data if Supabase fails or is not configured
      setProducts(INITIAL_PRODUCTS);
      setCustomers(INITIAL_CUSTOMERS);
    }
  };

  useEffect(() => {
    const init = async () => {
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
      setIsLoading(false);

      return () => subscription.unsubscribe();
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
    const { data, error } = await supabase.from('products').insert([{
      name: product.name,
      category: product.category,
      sku: product.sku,
      cost_price: product.costPrice,
      sale_price: product.salePrice,
      stock: product.stock,
      min_stock: product.minStock,
      image: product.image
    }]).select();

    if (!error && data) {
      await fetchData();
    }
  };

  const updateProduct = async (updated: Product) => {
    const { error } = await supabase.from('products').update({
      name: updated.name,
      category: updated.category,
      sku: updated.sku,
      cost_price: updated.costPrice,
      sale_price: updated.salePrice,
      stock: updated.stock,
      min_stock: updated.minStock,
      image: updated.image
    }).eq('id', updated.id);

    if (!error) {
      await fetchData();
    }
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      await fetchData();
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

  return (
    <ERPContext.Provider value={{ 
      products, 
      sales, 
      customers, 
      user,
      addProduct, 
      updateProduct, 
      deleteProduct,
      addSale, 
      addCustomer,
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
