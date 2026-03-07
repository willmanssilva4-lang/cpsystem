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
  categoryId?: string;
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

export interface CashRegister {
  id: string;
  companyId?: string;
  storeId?: string;
  terminalId?: string;
  operatorId: string;
  openingBalance: number;
  status: 'open' | 'closed' | 'blocked' | 'suspended';
  openedAt: string;
  closedAt?: string;
  closedBy?: string;
  observation?: string;
}

export interface CashMovement {
  id: string;
  cashRegisterId: string;
  type: 'sangria' | 'suprimento' | 'ajuste';
  amount: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface CashSalesSummary {
  id: string;
  cashRegisterId: string;
  paymentMethod: string;
  systemTotal: number;
  informedTotal: number;
  difference: number;
}

export interface CashClosing {
  id: string;
  cashRegisterId: string;
  totalSystem: number;
  totalInformed: number;
  totalDifference: number;
  approvedBy?: string;
  justification?: string;
  closedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  module: string;
  entityId?: string;
  oldData?: any;
  newData?: any;
  ip?: string;
  terminal?: string;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  quantity: number;
  price: number;
  discount?: number; // Valor do desconto aplicado ao item
  originalPrice?: number; // Preço original antes do desconto
}

export interface Sale {
  id: string;
  date: string;
  items: SaleItem[];
  total: number;
  subtotal?: number; // Total antes dos descontos
  discount?: number; // Desconto total na venda
  paymentMethod: 'Dinheiro' | 'Pix' | 'Crédito' | 'Débito' | 'Fiado' | 'Voucher';
  customerId?: string;
  userId?: string; // Usuário que realizou a venda
  cashRegisterId?: string; // ID do caixa
}

export interface DiscountLog {
  id: string;
  saleId: string;
  productId?: string;
  type: 'item' | 'sale';
  method: 'percentage' | 'value';
  percentage?: number;
  value: number; // Valor do desconto em R$
  appliedBy: string;
  authorizedBy?: string;
  reason: string;
  date: string;
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

export interface CompanySettings {
  tradeName: string;
  legalName: string;
  cnpj: string;
  stateRegistration: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

export interface StockMovement {
  id: string;
  productId: string;
  loteId?: string;
  type: 'ENTRADA' | 'SAÍDA' | 'AJUSTE' | 'COMPRA';
  quantity: number;
  cost?: number;
  origin: string;
  date: string;
  userId: string;
  userName?: string;
  productName?: string;
}

export interface ProductLote {
  id: string;
  productId: string;
  numeroLote: string;
  dataEntrada: string;
  validade: string;
  custoUnit: number;
  quantidadeInicial: number;
  saldoAtual: number;
  fornecedorId: string;
}

export interface Inventory {
  id: string;
  date: string;
  location: string;
  itemsCounted: number;
  divergenceValue: number;
  status: 'Concluído' | 'Em Andamento';
  type: 'Geral' | 'Rotativo' | 'Categoria';
  responsible: string;
  notes?: string;
}

export interface Employee {
  id: string;
  fullName: string;
  cpf: string;
  phone: string;
  role: string;
  admissionDate: string;
  salary?: number;
  status: 'Ativo' | 'Inativo';
}

export interface AccessProfile {
  id: string;
  name: string;
  description: string;
}

export interface SystemUser {
  id: string;
  username: string;
  email?: string;
  employeeId?: string;
  profileId?: string;
  storeId?: string;
  status: 'Ativo' | 'Inativo';
  supervisorCode?: string;
}

export interface Permission {
  id: string;
  profileId: string;
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface SystemSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'pt-BR' | 'en-US';
  currency: 'BRL' | 'USD';
  timezone: string;
  dateFormat: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_LOSSES: Loss[] = [];
export const INITIAL_SALES: Sale[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
