export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  price?: number;
  costPrice: number;
  salePrice: number;
  wholesalePrice?: number;
  wholesaleMinQty?: number;
  clubPrice?: number;
  termPrice?: number;
  stock: number;
  minStock: number;
  category: string;
  category_id?: string;
  active: boolean;
  image?: string;
  description?: string;
  validade?: string;
  status: 'Ativo' | 'Inativo';
  company_id?: string;
  subcategoria_id?: string;
  unit?: string;
  brand?: string;
  gramatura?: string;
  tipo_embalagem?: string;
  segmento?: string;
  section?: string;
  codigo_mercadologico?: string;
  profit?: number;
  profitPercentage: number;
  conversion_factor?: number;
  product_type?: 'PADRAO' | 'KIT' | 'SALE' | 'BASE';
  composition?: any[];
  base_product_id?: string;
  has_had_stock?: boolean;
  controlStock?: string | boolean | null;
  supplier?: string;
  supplier_id?: string;
  isAdicional?: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  document: string;
  phone?: string;
  email?: string;
  address?: string;
  contact?: string;
  cnpj?: string;
  status?: 'Ativo' | 'Inativo';
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'ENTRADA' | 'SAÍDA' | 'AJUSTE' | 'VENDA' | 'DEVOLUÇÃO' | 'COMPRA';
  quantity: number;
  cost?: number;
  financialAccount?: string;
  origin: string;
  date: string;
  userId: string;
  userName: string;
  companyId: string;
  productName?: string;
}

export interface Inventory {
  id: string;
  date: string;
  status: 'Pendente' | 'Concluído' | 'Cancelado';
  items?: any[];
  description?: string;
  location?: string;
  responsible?: string;
  type?: string;
}

export interface Departamento {
  id: string;
  nome: string;
  codigo?: string;
  ativo: boolean;
  secao?: string;
  segmento?: string;
  company_id?: string;
}

export interface Categoria {
  id: string;
  nome: string;
  codigo?: string;
  departamento_id: string;
  company_id?: string;
}

export interface Subcategoria {
  id: string;
  nome: string;
  codigo?: string;
  categoria_id: string;
  company_id?: string;
}

export interface Lote {
  id: string;
  productId: string;
  numeroLote: string;
  validade: string;
  saldoAtual: number;
  dataEntrada?: string;
  company_id?: string;
  custoUnit?: number;
  quantidadeInicial?: number;
}

export interface CompositionItem {
  productId: string;
  price: number;
  quantity: number;
}

export interface PricingSettings {
  defaultMethod?: 'markup' | 'margin';
  rounding?: boolean;
  markup?: number;
  defaultMargin?: number;
  defaultMarkup?: number;
  allowEditOnProduct?: boolean;
  autoRounding?: boolean;
}

export interface SystemSettings {
  theme?: 'light' | 'dark' | 'system';
  tradeName?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    senderEmail?: string;
  };
  language?: string;
  currency?: string;
  timezone?: string;
  legalName?: string;
  cnpj?: string;
  stateRegistration?: string;
  email?: string;
  phone?: string;
  logo?: string;
  address?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
  companyId?: string;
}

export interface Customer {
  id: string;
  name: string;
  document: string;
  email?: string;
  phone?: string;
  address?: string;
  active?: boolean;
  status?: 'Ativo' | 'Inativo' | 'VIP' | 'Em Débito';
  isClubMember?: boolean;
  clubJoinDate?: string;
  clubPoints?: number;
  totalSpent?: number;
  image?: string;
}

export interface Sale {
  id: string;
  date: string;
  customerId?: string;
  items: SaleItem[];
  total: number;
  paymentMethod: string;
  status: 'concluida' | 'cancelada' | 'pendente' | 'Cancelada' | string;
  subtotal?: number;
  discount?: number;
  netAmount?: number;
  payments?: any[];
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  discount?: number;
}

export interface Maquininha {
  id: string;
  nome: string;
  taxa_debito: number;
  taxa_credito: number;
  taxa_credito_parcelado: number;
  taxa_pix: number;
  ativo: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  active: boolean;
  taxPercentage?: number;
  taxFixed?: number;
}

export interface Promotion {
  id: string;
  name: string;
  type: 'PRICE' | 'PERCENTAGE' | 'BUY_X_GET_Y' | 'COMBO';
  status: 'ACTIVE' | 'INACTIVE';
  startDate: string;
  endDate: string;
  targetType: 'PRODUCT' | 'CATEGORY' | 'ALL';
  targetId?: string | string[];
  productPrices?: Record<string, number>;
  discountValue?: number;
  buyQuantity?: number;
  payQuantity?: number;
  comboItems?: string[];
  comboPrice?: number;
  applyAutomatically?: boolean;
  onlyForClubMembers?: boolean;
  limitPerCustomer?: number;
  quantityLimit?: number;
  daysOfWeek?: number[];
}

export interface Advertisement {
  id: string;
  titulo: string;
  descricao?: string;
  imagem_url: string;
  ativo: boolean;
  order?: number;
  duration?: number;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  supplier?: string;
  supplierId?: string;
  amount: number;
  interest?: number;
  discount?: number;
  paymentType?: 'À vista' | 'A prazo';
  issueDate?: string;
  dueDate: string;
  observation?: string;
  status: 'Pago' | 'Pendente' | 'Vencido';
  paymentMethod?: string;
  financialAccount?: string;
  type: string;
  date?: string;
  paymentDate?: string;
  origin?: string;
}

export interface CashMovement {
  id: string;
  cashRegisterId: string;
  type: string;
  amount: number;
  reason: string;
  createdAt: string;
  company_id: string;
}

export interface ReturnItem {
  productId: string;
  quantity: number;
}

export interface Return {
  id: string;
  saleId: string;
  date: string;
  items: ReturnItem[];
  total: number;
  type: string;
  refundMethod: string;
  userId: string;
  status: string;
  voucherCode?: string;
  companyId?: string;
}

export interface Company {
  id: string;
  name: string;
  document?: string;
  status?: string;
  createdAt: string;
  adminEmail?: string;
}
