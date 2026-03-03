import { Type } from "@google/genai";

export interface Loss {
  id: string;
  productId: string;
  quantity: number;
  reason: string;
  date: string;
  totalValue: number;
}

export interface CompositionItem {
  productId: string;
  quantity: number;
  name?: string;
  price?: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  image: string;
  brand?: string;
  unit?: string;
  supplier?: string;
  group?: string;
  subgroup?: string;
  profit?: number;
  profitPercentage?: number;
  composition?: CompositionItem[];
  status?: 'Ativo' | 'Inativo';
}

export interface SaleItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Sale {
  id: string;
  date: string;
  items: SaleItem[];
  total: number;
  paymentMethod: 'Dinheiro' | 'Pix' | 'Crédito' | 'Débito' | 'Fiado';
  customerId?: string;
}

export interface Customer {
  id: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  totalSpent: number;
  status: 'Ativo' | 'Inativo' | 'VIP' | 'Em Débito';
  image?: string;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  status: 'Pago' | 'Pendente';
}

export interface PricingSettings {
  defaultMethod: 'markup' | 'margin';
  defaultMargin: number;
  defaultMarkup: number;
  allowEditOnProduct: boolean;
  autoRounding: boolean;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'ENTRADA' | 'SAÍDA' | 'AJUSTE';
  quantity: number;
  origin: string;
  date: string;
  userId: string;
  userName?: string;
  productName?: string;
}

export interface Inventory {
  id: string;
  date: string;
  location: string;
  itemsCounted: number;
  divergenceValue: number;
  status: 'Concluído' | 'Em Andamento';
  notes?: string;
}

export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_LOSSES: Loss[] = [];
export const INITIAL_SALES: Sale[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
