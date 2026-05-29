import { 
  Package, 
  ShoppingCart, 
  Wallet, 
  Users, 
  Settings, 
  BarChart3,
  Book
} from 'lucide-react';

export interface HelpArticle {
  id: string;
  category: string;
  title: string;
  content: string;
  steps: string[];
  videoUrl?: string;
  tip?: string;
}

export const HELP_CATEGORIES = [
  { id: 'vendas', label: 'Vendas & PDV', icon: ShoppingCart },
  { id: 'estoque', label: 'Estoque & Produtos', icon: Package },
  { id: 'financeiro', label: 'Financeiro', icon: Wallet },
  { id: 'cadastros', label: 'Cadastros', icon: Users },
  { id: 'gerencial', label: 'Relatórios & Auditoria', icon: BarChart3 },
  { id: 'config', label: 'Configurações', icon: Settings },
];

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'fazer-venda',
    category: 'vendas',
    title: 'Como realizar uma venda no PDV',
    content: 'Para realizar uma venda, acesse o menu PDV, pesquise o produto pelo nome ou código de barras, adicione ao carrinho e pressione F12 para finalizar o pagamento.',
    steps: [
      'Acesse a tela do PDV',
      'Insira as mercadorias digitando o código ou buscando pelo nome',
      'Confirme as quantidades e descontos no painel lateral',
      'Finalize o pagamento com dinheiro, cartão ou Pix e conclua a venda'
    ],
    tip: 'Lembre-se de abrir o Caixa do dia antes de iniciar as vendas do PDV!'
  },
  {
    id: 'cadastrar-produto',
    category: 'estoque',
    title: 'Como cadastrar um novo produto',
    content: 'Acesse o menu Cadastro > Produtos, clique no botão Novo Produto, preencha as informações obrigatórias (nome, preço de custo, preço de venda) e salve.',
    steps: [
      'Navegue até Cadastros > Produtos',
      'Pressione o botão "Novo Produto" no topo',
      'Preencha informações básicas do produto (nome, marca, código)',
      'Preencha os valores financeiros correspondentes e salve'
    ],
    tip: 'Tente manter sempre os preços de custo atualizados para que seus relatórios financeiros fiquem exatos!'
  }
];

export const SHORTCUTS = [
  { key: 'F1', label: 'Ajuda', description: 'Ajuda e Dicas Rápidas' },
  { key: 'F2', label: 'Pesquisar Produto', description: 'Pesquisar produto' },
  { key: 'F12', label: 'Finalizar Venda', description: 'Finalizar cupom / venda' },
  { key: 'ESC', label: 'Cancelar / Voltar', description: 'Cancelar item / Voltar' },
];

export const CONTEXTUAL_TIPS: Record<string, string> = {
  'pdv': 'Utilize o leitor de código de barras para agilizar o atendimento.',
  'financeiro': 'Mantenha suas contas a pagar e receber sempre atualizadas.',
  'dashboard': 'Acompanhe suas metas diárias através dos gráficos de desempenho.'
};
