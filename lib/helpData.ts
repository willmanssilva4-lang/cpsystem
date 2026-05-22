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
  { id: 'produtos', label: 'Produtos', icon: BookOpen },
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
      'Abra o PDV no menu lateral ou use o atalho correspondente',
      'Passe o código de barras no leitor ou digite o código/SKU do produto',
      'Pressione F4 se precisar alterar a quantidade do item antes de bipar',
      'Pressione F10 para iniciar o fechamento da venda',
      'Escolha a forma de pagamento (Dinheiro, Cartão, PIX)',
      'Confirme o valor recebido e pressione Enter para finalizar',
      'O sistema registrará a venda e atualizará o estoque automaticamente'
    ],
    tip: 'Use o atalho F3 para buscar produtos manualmente pelo nome ou Alt+L para ver a lista completa.'
  },
  {
    id: 'desconto-pdv',
    category: 'pdv',
    title: 'Como aplicar descontos',
    steps: [
      'Para desconto no item: Pressione F6, informe o item e o valor/porcentagem',
      'Para desconto no total: Pressione F7 na tela de fechamento (F10)',
      'Informe o valor ou porcentagem do desconto desejado',
      'Pressione Enter para confirmar a aplicação',
      'Caso o usuário não tenha permissão, será solicitada a senha do gerente'
    ]
  },
  {
    id: 'cancelar-item-pdv',
    category: 'pdv',
    title: 'Como cancelar itens ou vendas',
    steps: [
      'Cancelar Item: Pressione F8, digite o número do item na lista e confirme',
      'Cancelar Venda Total: Pressione F9 antes de finalizar o pagamento',
      'Confirme a intenção de cancelamento no alerta que aparecerá',
      'O sistema limpará o carrinho e voltará para o início da venda'
    ]
  },
  {
    id: 'consulta-preco-pdv',
    category: 'pdv',
    title: 'Como consultar preços rapidamente',
    steps: [
      'No PDV, pressione a tecla F3',
      'Bipe o produto ou digite parte do nome/SKU',
      'O sistema exibirá o preço de venda e o saldo em estoque',
      'Pressione ESC para fechar a consulta e continuar a venda'
    ]
  },

  // Produtos
  {
    id: 'produto-base-estoque',
    category: 'produtos',
    title: 'Como cadastrar Produto Base (Estoque Real)',
    steps: [
      'Vá em Cadastro > Produtos > Novo Produto',
      'No campo "Tipo de Produto", selecione "PRODUTO BASE (ESTOQUE)"',
      'Defina a unidade de medida real (ex: ML para líquidos, GR para peso)',
      'Este produto NÃO aparecerá no PDV para venda direta',
      'Ele servirá como o "tanque" de estoque para outros produtos de venda'
    ],
    tip: 'Use este tipo para itens que você compra em fardo/litro mas vende fracionado.'
  },
  {
    id: 'produto-venda-estoque',
    category: 'produtos',
    title: 'Como cadastrar Produto de Venda (com Conversão)',
    steps: [
      'Vá em Cadastro > Produtos > Novo Produto',
      'No campo "Tipo de Produto", selecione "PRODUTO DE VENDA"',
      'Selecione o "Produto Base" ao qual este item pertence',
      'Informe o "Fator de Conversão" (ex: se vende garrafa de 1L e a base é ML, coloque 1000)',
      'Defina o preço de venda para esta unidade específica',
      'Ao vender este item, o sistema baixará a quantidade exata do Produto Base'
    ]
  },
  {
    id: 'produto-kit-estoque',
    category: 'produtos',
    title: 'Como cadastrar KIT / Combo',
    steps: [
      'Vá em Cadastro > Produtos > Novo Produto',
      'No campo "Tipo de Produto", selecione "KIT / COMBO"',
      'Clique em "Composição" para adicionar os itens que compõem o kit',
      'Selecione os Produtos Base e informe a quantidade de cada um no kit',
      'O sistema calculará o custo total baseado na composição',
      'O estoque do KIT é calculado automaticamente baseado na disponibilidade dos itens base'
    ]
  },
  {
    id: 'configurar-estoque-custo-kit',
    category: 'produtos',
    title: 'Configurar Estoque e Custo Corretos em Kits',
    steps: [
      'Passo 1: Cadastre o Produto de Compra (Produto Base / Estoque Real) - Este é o produto físico comprado do fornecedor e guardado em estoque (Ex: "Energético 2L (Garrafa)", Custo: 7,49, Unidade: GFA ou UN).',
      'Passo 2: Cadastre o Produto Fracionado (A dose/ingrediente do Kit) - Este é o produto virtual que representa a unidade das receitas (Ex: Nome: "Energético (por Litro)", Tipo: Venda Normal).',
      'Configuração de Conversão: No final da tela, no campo "Produto Base (Estoque Real)", selecione "Energético 2L (Garrafa)".',
      'Defina o Fator Conversão: Insira "2" no campo (isso diz que dentro de 1 garrafa cabem 2 unidades do produto fracionado, ou seja, 2 Litros).',
      'Cálculo Automático: O sistema calcula o custo fracionado de R$ 3,745 por Litro. O estoque é automático e virtual (ex: 10 garrafas físicas se tornam 20 Litros).',
      'Passo 3: Monte o Kit: Na busca de componentes do Kit, adicione a porção fracionada "Energético (por Litro)" e insira a quantidade "0.4" (representando os 400ml, calculando o custo exato de R$ 1,498).'
    ],
    tip: 'Isso resolve de forma profissional e precisa tanto a baixa automática fracionada de estoque físico quanto a contabilidade de custos exatos dos seus kits e combos.'
  },

  // Estoque
  {
    id: 'inventario-estoque',
    category: 'estoque',
    title: 'Como realizar um Inventário',
    steps: [
      'Acesse Menu > Estoque > Inventário',
      'Clique em "Novo Inventário" e selecione o setor ou categoria',
      'Bipe os produtos ou digite a quantidade contada fisicamente',
      'O sistema mostrará a divergência entre o estoque atual e o contado',
      'Clique em "Finalizar" para que o sistema ajuste os saldos automaticamente'
    ]
  },

  // Compras
  {
    id: 'registrar-compra',
    category: 'compras',
    title: 'Como registrar entrada de mercadorias',
    steps: [
      'Acesse Menu > Compras > Nova Compra',
      'Selecione o fornecedor e a data da nota',
      'Adicione os produtos comprados e suas quantidades',
      'Confira se o preço de custo mudou (o sistema atualizará o cadastro)',
      'Ao finalizar, o estoque será alimentado automaticamente',
      'O sistema também gerará a conta a pagar no financeiro se desejar'
    ],
    tip: 'Se comprar um Produto de Venda, o sistema converterá automaticamente para o estoque do Produto Base.'
  },

  // Financeiro
  {
    id: 'fechamento-caixa',
    category: 'financeiro',
    title: 'Como realizar o Fechamento de Caixa',
    steps: [
      'No final do turno, acesse Financeiro > Fechar Caixa',
      'Confira os totais por forma de pagamento (Dinheiro, Cartão, etc)',
      'Realize a "Sangria" do valor que será retirado do caixa físico',
      'Informe o valor final em mãos para conferência',
      'Clique em "Confirmar Fechamento" para gerar o relatório do turno'
    ]
  },
  {
    id: 'sangria-suprimento',
    category: 'financeiro',
    title: 'Como fazer Sangria ou Suprimento',
    steps: [
      'Sangria (Retirada): Use Ctrl + S no PDV ou vá em Financeiro',
      'Suprimento (Entrada): Use Ctrl + U no PDV ou vá em Financeiro',
      'Informe o valor e o motivo da movimentação',
      'Confirme para que o saldo do caixa atual seja atualizado',
      'Essas movimentações aparecerão no relatório de fechamento'
    ]
  },

  // Relatórios
  {
    id: 'relatorio-vendas',
    category: 'relatorios',
    title: 'Como analisar vendas e lucratividade',
    steps: [
      'Acesse Menu > Relatórios > Vendas',
      'Filtre pelo período desejado (hoje, semana, mês)',
      'Analise o gráfico de faturamento e o ticket médio',
      'Veja o "Lucro Bruto" calculado com base no custo vs venda',
      'Identifique os "Produtos Mais Vendidos" para planejar compras'
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
