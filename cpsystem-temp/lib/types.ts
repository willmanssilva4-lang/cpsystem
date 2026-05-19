import { Type } from "@google/genai";

export interface Loss {
  id: string;
  productId: string;
  loteId?: string;
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

export interface Departamento {
  id: string;
  codigo?: string;
  nome: string;
  ativo: boolean;
  segmento?: string;
  secao?: string;
}

export interface ExpenseCategory {
  id: string;
  nome: string;
}

export interface Categoria {
  id: string;
  codigo?: string;
  nome: string;
  departamento_id: string;
}

export interface Subcategoria {
  id: string;
  codigo?: string;
  nome: string;
  categoria_id: string;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  costPrice: number;
  salePrice: number;
  wholesalePrice?: number;
  wholesaleMinQty?: number;
  termPrice?: number; // Preço 2
  clubPrice?: number; // Preço para cliente clube
  stock: number;
  minStock: number;
  image: string;
  brand?: string;
  unit?: string;
  supplier?: string;
  profit?: number;
  profitPercentage?: number;
  composition?: CompositionItem[];
  status?: 'Ativo' | 'Inativo';
  subcategoria_id?: string;
  codigo_mercadologico?: string;
  category?: string;
  subgroup?: string;
  validade?: string;
  has_had_stock?: boolean;
  barcode?: string;
  controlStock?: string;
  product_type?: 'BASE' | 'SALE' | 'KIT';
  base_product_id?: string;
  conversion_factor?: number;
  gramatura?: string;
  tipo_embalagem?: string;
  segmento?: string;
  section?: string;
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

export interface ReturnItem {
  productId: string;
  quantity: number;
  price: number;
  reason: string;
}

export interface Return {
  id: string;
  saleId: string;
  date: string;
  items: ReturnItem[];
  total: number;
  type: 'PARCIAL' | 'TOTAL';
  refundMethod: string;
  userId: string;
  status: 'CONCLUÍDO' | 'CANCELADO';
  voucherCode?: string;
}

export interface Voucher {
  id: string;
  code: string;
  initialValue: number;
  currentValue: number;
  customerId?: string;
  saleId?: string;
  returnId?: string;
  status: 'Ativo' | 'Utilizado' | 'Cancelado';
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  quantity: number;
  price: number;
  costPrice?: number; // Preço de custo no momento da venda
  discount?: number; // Valor do desconto aplicado ao item
  originalPrice?: number; // Preço original antes do desconto
  promotionId?: string; // ID da promoção aplicada
}

export interface SalePayment {
  method: string;
  amount: number;
  maquininhaId?: string;
  taxAmount?: number;
  netAmount?: number;
  taxPercentage?: number;
  voucherCode?: string;
  voucherId?: string;
}

export interface Sale {
  id: string;
  companyId: string;
  date: string;
  items: SaleItem[];
  total: number;
  subtotal?: number; // Total antes dos descontos
  discount?: number; // Desconto total na venda
  paymentMethod: string; // Mantido para compatibilidade, será o primeiro método ou 'Múltiplo'
  payments?: SalePayment[];
  customerId?: string;
  userId?: string; // Usuário que realizou a venda
  cashRegisterId?: string; // ID do caixa
  maquininhaId?: string;
  taxAmount?: number;
  netAmount?: number;
  status?: string; // 'Concluída' | 'Cancelada'
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
  companyId: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  totalSpent: number;
  status: 'Ativo' | 'Inativo' | 'VIP' | 'Em Débito';
  image?: string;
  isClubMember?: boolean; // Cliente Clube
  clubJoinDate?: string; // Data de adesão ao clube
}

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
}

export interface Promotion {
  id: string;
  name: string;
  type: 'PRICE' | 'PERCENTAGE' | 'BUY_X_GET_Y' | 'COMBO';
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'INACTIVE';
  targetType: 'PRODUCT' | 'CATEGORY' | 'SUBCATEGORY' | 'ALL';
  targetId?: string | string[];
  productPrices?: Record<string, number>;
  discountValue?: number;
  buyQuantity?: number;
  payQuantity?: number;
  comboItems?: string[];
  comboPrice?: number;
  applyAutomatically: boolean;
  limitPerCustomer?: number;
  quantityLimit?: number;
  daysOfWeek?: number[];
  onlyForClubMembers?: boolean;
}

export interface Expense {
  id: string;
  companyId: string;
  description: string;
  category: string;
  supplier?: string; // Nome do fornecedor
  supplierId?: string; // ID do fornecedor
  amount: number;
  issueDate: string;
  dueDate: string;
  date: string; // Added for UI compatibility
  paymentDate?: string;
  paymentMethod?: string;
  financialAccount?: string;
  observation?: string;
  isRecurring?: boolean;
  frequency?: 'Mensal' | 'Semanal' | 'Anual';
  status: 'Pago' | 'Pendente' | 'Vencido';
  origin?: string;
  type?: string; // Tipo de despesa (Fixa, Variável, etc)
  interest?: number; // Multa/Juros
  discount?: number; // Desconto
  paymentType?: 'À vista' | 'A prazo';
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
  logo?: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  email?: string;
  phone?: string;
}

export interface StockMovement {
  id: string;
  companyId: string;
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
  full_name?: string;
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
    senderEmail?: string;
    recipientEmail?: string;
  };
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'Dinheiro' | 'Pix' | 'Crédito' | 'Débito' | 'Fiado' | 'Voucher' | 'Outro';
  taxPercentage: number;
  taxFixed: number;
  active: boolean;
}

export interface Maquininha {
  id: string;
  nome: string;
  taxa_debito: number;
  taxa_credito: number;
  taxa_credito_parcelado: number;
  taxa_pix?: number;
  ativo: boolean;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: 'Ativo' | 'Inativo';
  createdAt: string;
  adminEmail?: string;
}

export interface Advertisement {
  id: string;
  titulo: string;
  descricao: string;
  imagem_url: string;
  ativo: boolean;
  company_id?: string;
}

export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_LOSSES: Loss[] = [];
export const INITIAL_SALES: Sale[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
export const INITIAL_ADS: Advertisement[] = [
  {
    id: '1',
    titulo: 'Ofertas da Semana',
    descricao: 'Preços imbatíveis em todo o setor de hortifruti!',
    imagem_url: 'https://picsum.photos/seed/promo1/1200/600',
    ativo: true
  },
  {
    id: '2',
    titulo: 'Clube SuperNice',
    descricao: 'Faça seu cadastro e ganhe descontos exclusivos na hora.',
    imagem_url: 'https://picsum.photos/seed/promo2/1200/600',
    ativo: true
  },
  {
    id: '3',
    titulo: 'Bebidas Geladas',
    descricao: 'Variedade em cervejas e refrigerantes com o melhor preço.',
    imagem_url: 'https://picsum.photos/seed/promo3/1200/600',
    ativo: true
  }
];
