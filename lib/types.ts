import { Type } from "@google/genai";

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

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Smartphone Pro Max',
    category: 'Eletrônicos',
    sku: 'CEL-PRM-256',
    costPrice: 4200,
    salePrice: 5899,
    stock: 42,
    minStock: 10,
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop',
  },
  {
    id: '2',
    name: 'Fone Wireless Pro Audio',
    category: 'Eletrônicos',
    sku: 'AUD-WRL-PRO',
    costPrice: 150,
    salePrice: 349,
    stock: 8,
    minStock: 15,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
  },
  {
    id: '3',
    name: 'Teclado Mecânico Office',
    category: 'Periféricos',
    sku: 'TEC-MEC-OFF',
    costPrice: 200,
    salePrice: 450,
    stock: 120,
    minStock: 20,
    image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&h=300&fit=crop',
  },
  {
    id: '4',
    name: 'Monitor UltraSharp 27"',
    category: 'Eletrônicos',
    sku: 'MON-ULT-27',
    costPrice: 1800,
    salePrice: 2400,
    stock: 5,
    minStock: 8,
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop',
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    name: 'João Silva',
    document: '123.456.789-00',
    phone: '(11) 98765-4321',
    email: 'joao@email.com',
    totalSpent: 12500,
    status: 'Ativo',
    image: 'https://i.pravatar.cc/150?u=joao',
  },
  {
    id: 'c2',
    name: 'Maria Oliveira',
    document: '98.765.432/0001-99',
    phone: '(21) 99887-7665',
    email: 'maria@empresa.com',
    totalSpent: 8200.50,
    status: 'VIP',
    image: 'https://i.pravatar.cc/150?u=maria',
  },
];
