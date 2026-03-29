import { ShoppingCart, Package, DollarSign, BarChart3, Settings, ShoppingBag, Users, HelpCircle, BookOpen, Info, Truck, Wallet } from 'lucide-react';

export interface HelpArticle {
  id: string;
  category: string;
  title: string;
  steps: string[];
  tip?: string;
  videoUrl?: string;
}

export interface HelpCategory {
  id: string;
  label: string;
  icon: any;
}

export const HELP_CATEGORIES: HelpCategory[] = [
  { id: 'pdv', label: 'PDV', icon: ShoppingCart },
  { id: 'vendas', label: 'Vendas', icon: ShoppingBag },
  { id: 'estoque', label: 'Estoque', icon: Package },
  { id: 'compras', label: 'Compras', icon: Users },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

export const HELP_ARTICLES: HelpArticle[] = [
  // PDV
  {
    id: 'venda-pdv',
    category: 'pdv',
    title: 'Como fazer uma venda',
    steps: [
      'Abra o PDV no menu lateral ou atalho',
      'Passe o código de barras no leitor ou digite o código do produto',
      'Pressione F4 se precisar alterar a quantidade do item',
      'Pressione F10 para iniciar o fechamento da venda',
      'Escolha a forma de pagamento e confirme com Enter',
      'Aguarde a impressão do cupom e finalize'
    ],
    tip: 'Use o atalho F3 para buscar produtos manualmente pelo nome.'
  },
  {
    id: 'desconto-pdv',
    category: 'pdv',
    title: 'Como aplicar desconto',
    steps: [
      'Durante a venda, pressione F6 para desconto no item ou F7 para desconto na venda total',
      'Informe o valor ou porcentagem do desconto',
      'Pressione Enter para confirmar',
      'Caso não tenha permissão, será solicitada a senha do gerente (F12)'
    ]
  },
  {
    id: 'cancelar-item-pdv',
    category: 'pdv',
    title: 'Como cancelar item',
    steps: [
      'Pressione F8 para abrir a tela de cancelamento de item',
      'Digite o número do item que deseja cancelar (ex: 1, 2, 3)',
      'Confirme o cancelamento com Enter',
      'O item será removido e o total da venda atualizado'
    ]
  },
  {
    id: 'finalizar-venda-pdv',
    category: 'pdv',
    title: 'Como finalizar venda',
    steps: [
      'Após inserir todos os itens, pressione F10',
      'Selecione a forma de pagamento (Dinheiro, Cartão, PIX)',
      'Informe o valor recebido para cálculo de troco se necessário',
      'Pressione Enter para concluir a transação'
    ]
  },
  {
    id: 'devolucao-pdv',
    category: 'pdv',
    title: 'Como fazer uma devolução',
    steps: [
      'Acesse o menu Vendas',
      'Clique em Devoluções / Estornos',
      'Busque o número do cupom ou nota fiscal',
      'Selecione o produto que será devolvido',
      'Informe a quantidade a ser devolvida',
      'Escolha a forma de devolução (Crédito, Dinheiro, Estorno)',
      'Clique em confirmar para finalizar'
    ],
    tip: 'Sempre confira o estado do produto antes de confirmar a devolução.'
  },
  // Estoque
  {
    id: 'inventario-estoque',
    category: 'estoque',
    title: 'Como fazer inventário',
    steps: [
      'Acesse Menu > Estoque > Inventário',
      'Inicie um novo inventário selecionando o setor',
      'Conte os produtos fisicamente e lance as quantidades no sistema',
      'Confira as divergências apontadas pelo sistema',
      'Finalize para atualizar o saldo real do estoque'
    ]
  },
  {
    id: 'ajuste-estoque',
    category: 'estoque',
    title: 'Como ajustar estoque',
    steps: [
      'Busque o produto no cadastro de produtos',
      'Clique na aba Estoque ou no botão Ajustar',
      'Informe o novo saldo ou a movimentação (entrada/saída)',
      'Justifique o motivo do ajuste',
      'Salve as alterações'
    ]
  },
  {
    id: 'perdas-estoque',
    category: 'estoque',
    title: 'Como lançar perdas',
    steps: [
      'Vá em Estoque > Movimentações > Lançar Perda',
      'Selecione o produto e a quantidade perdida',
      'Informe o motivo (Quebra, Vencimento, Furto, etc)',
      'Confirme o lançamento para baixar do estoque'
    ]
  },
  {
    id: 'vencimento-estoque',
    category: 'estoque',
    title: 'Como ver produtos vencendo',
    steps: [
      'Acesse Relatórios > Estoque > Validade de Produtos',
      'Filtre pelo período desejado (ex: próximos 30 dias)',
      'O sistema listará todos os lotes próximos ao vencimento',
      'Você pode exportar essa lista ou gerar alertas'
    ]
  },
  // Financeiro
  {
    id: 'contas-pagar-financeiro',
    category: 'financeiro',
    title: 'Como lançar conta a pagar',
    steps: [
      'Acesse Financeiro > Contas a Pagar > Novo Lançamento',
      'Selecione o fornecedor e a categoria de despesa',
      'Informe o valor, data de vencimento e documento',
      'Defina se a conta é recorrente ou única',
      'Clique em Salvar'
    ]
  },
  {
    id: 'pagamento-financeiro',
    category: 'financeiro',
    title: 'Como registrar pagamento',
    steps: [
      'Localize a conta no Contas a Pagar ou Receber',
      'Clique no botão Baixar ou Pagar',
      'Confirme a data do pagamento e a conta bancária/caixa utilizada',
      'Informe descontos ou juros se houver',
      'Confirme a operação'
    ]
  },
  {
    id: 'conferir-caixa-financeiro',
    category: 'financeiro',
    title: 'Como conferir caixa',
    steps: [
      'No final do expediente, acesse Financeiro > Fluxo de Caixa',
      'Selecione o caixa e o período',
      'Compare o saldo físico com o saldo do sistema',
      'Verifique as sangrias e suprimentos realizados',
      'Realize o fechamento do caixa'
    ]
  }
];

export const SHORTCUTS = [
  { key: 'F1', description: 'Ajuda / Dicas do Sistema' },
  { key: 'F2', description: 'Devolução Rápida' },
  { key: 'F3', description: 'Buscar Produto Manual' },
  { key: 'F4', description: 'Alterar Quantidade' },
  { key: 'F5', description: 'Inserir Cliente' },
  { key: 'F6', description: 'Desconto (Item ou Venda)' },
  { key: 'F7', description: 'Desconto na Venda Total' },
  { key: 'F8', description: 'Cancelar Item' },
  { key: 'F9', description: 'Cancelar Venda' },
  { key: 'F10', description: 'Finalizar Venda' },
  { key: 'F12', description: 'Autorização Rápida' },
  { key: 'ESC', description: 'Sair / Voltar / Cancelar' },
  { key: 'Ctrl + S', description: 'Realizar Sangria' },
  { key: 'Ctrl + U', description: 'Realizar Suprimento' },
  { key: 'Ctrl + F', description: 'Fechar Caixa' },
  { key: 'Alt + T', description: 'Estorno / Devolução' },
  { key: 'Alt + L', description: 'Lista de Produtos' },
];

export const CONTEXTUAL_TIPS: Record<string, string> = {
  '/': 'DICA: Acompanhe o faturamento em tempo real no gráfico acima.',
  '/pdv': 'DICA: Use F10 para finalizar a venda rapidamente após passar os itens.',
  '/produtos': 'DICA: Mantenha seu estoque atualizado para evitar rupturas de vendas.',
  '/vendas': 'DICA: Você pode filtrar as vendas por período ou vendedor.',
  '/financeiro': 'DICA: Registre todas as entradas e saídas para um controle rigoroso.',
};
