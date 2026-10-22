import React, { useState } from "react";
import { Bot, Send } from "lucide-react";

// Ajuda local: não utiliza API paga, não acessa o banco e não altera operações.
const normalize = (value) => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const topics = [
  {
    title: "Abrir caixa", keys: ["abrir caixa", "abertura de caixa", "iniciar caixa", "abrir o caixa"],
    answer: "Para abrir o caixa:\n1. Entre na área Caixa do PDV.\n2. Selecione o caixa que vai operar (Caixa 1, Caixa 2 ou Caixa Portaria).\n3. Procure a opção de abertura, informe o valor inicial quando solicitado e confirme.\n4. Confira se o caixa ficou aberto antes de registrar vendas.\nSe a opção não aparecer, peça ao administrador para verificar suas permissões."
  },
  {
    title: "Fechar caixa", keys: ["fechar caixa", "fechamento de caixa", "encerrar caixa", "fechar o caixa"],
    answer: "Para fechar o caixa:\n1. Abra a área Caixa e selecione o caixa correto.\n2. Confira vendas e recebimentos em dinheiro, Pix, débito e crédito.\n3. Procure a opção Fechar caixa e informe os valores de conferência solicitados.\n4. Revise possíveis diferenças antes de confirmar.\nCada caixa tem fechamento próprio. Se aparecer erro, não repita operações sem conferir o resultado; avise o responsável."
  },
  {
    title: "Vender", keys: ["venda rapida", "fazer venda", "registrar venda", "vender", "balcao", "comanda", "adicionar produto"],
    answer: "Para registrar uma venda:\n1. Abra Balcão/PDV ou Venda Rápida.\n2. Selecione a mesa/comanda, quando aplicável, e adicione os produtos.\n3. Confira quantidades, preços e observações do pedido.\n4. Selecione o caixa e a forma de pagamento disponível.\n5. Confirme apenas depois de revisar os dados.\nPedidos de Bar e Rosh podem seguir para as respetivas filas de preparo."
  },
  {
    title: "Cancelar venda", keys: ["cancelar venda", "estornar venda", "excluir venda", "anular venda"],
    answer: "O cancelamento de venda depende das permissões do seu usuário. Localize a venda no PDV ou no histórico correspondente e procure a ação de cancelamento, se estiver disponível. Antes de confirmar, confira a venda e o motivo. Se não existir essa opção ou o pagamento já tiver sido processado, chame o gerente ou administrador; não registre uma venda inversa por conta própria."
  },
  {
    title: "Pagamentos e troco", keys: ["pix", "credito", "debito", "dinheiro", "troco", "pagamento", "recebimento"],
    answer: "Na finalização da venda, confira o total e escolha a forma de pagamento correspondente: dinheiro, Pix, débito ou crédito, conforme as opções disponíveis. Para dinheiro, informe o valor recebido e confira o troco indicado. Confirme o recebimento real antes de concluir; o registo manual no PDV não comprova que um Pix ou cartão foi pago."
  },
  {
    title: "Portaria", keys: ["portaria", "entrada homem", "entrada mulher", "ingresso", "pessoas entraram"],
    answer: "Na aba Portaria, utilize os controles de entrada de Homem ou Mulher conforme o atendimento. Confira os valores de entrada configurados antes de lançar. Os registos devem alimentar o movimento da portaria e o Caixa Portaria. Para corrigir lançamentos ou valores, solicite autorização ao responsável."
  },
  {
    title: "Bar", keys: ["bar", "preparar bebida", "pedido de bebida", "fila do bar", "entregar pedido"],
    answer: "Na aba Bar, acompanhe os pedidos enviados pelo PDV. O fluxo previsto é AGUARDANDO → EM PREPARO → PRONTO → ENTREGUE. Selecione o pedido certo e avance o estado à medida que o atendimento acontece. Confira observações e quantidades antes de preparar ou entregar."
  },
  {
    title: "Rosh", keys: ["rosh", "narguile", "narguiles", "narguilê", "conferencia", "quebrado", "estoque fisico"],
    answer: "Na área Rosh, acompanhe os pedidos e, na aba Narguilês, procure Controle de Narguilês. O administrador cadastra o total físico; o funcionário usa REALIZAR CONFERÊNCIA para informar Grandes, Pequenos e Quebrados. Confira se a soma corresponde ao total cadastrado. Os quebrados devem ser identificados pelo tipo de origem para não haver contagem dupla. Se os totais divergirem, comunique ao responsável antes de alterar o cadastro."
  },
  {
    title: "Reservas", keys: ["reserva", "reservar mesa", "mesa reservada", "check in", "cliente chegou"],
    answer: "Na aba Reservas, localize o evento e a mesa. Para consultar uma reserva, pesquise pelo nome, telefone ou número da mesa, conforme os filtros disponíveis. No check-in, confira os dados do cliente e utilize CLIENTE CHEGOU / FAZER CHECK-IN, se a ação estiver disponível e autorizada. Para cancelar, trocar ou liberar mesas, confirme antes com o responsável."
  },
  {
    title: "Impressoras", keys: ["impressora", "imprimir", "impressao", "comprovante", "segunda via"],
    answer: "Para problemas de impressão:\n1. Confira se a impressora está ligada, com papel e conectada ao computador/rede.\n2. Confira a impressora escolhida para Bar, Caixa, Cozinha ou Rosh nas configurações disponíveis.\n3. Faça um teste de impressão do próprio Windows, quando aplicável.\n4. Se o pedido já foi confirmado, verifique o histórico antes de repetir para evitar duplicidade.\nSe continuar a falhar, avise o administrador."
  },
  {
    title: "Funcionários e permissões", keys: ["funcionario", "permissao", "acesso", "senha", "usuario", "gerente", "administrador"],
    answer: "As funções do PDV dependem do perfil e das permissões atribuídas a cada funcionário. Se um botão, relatório ou operação não aparecer, peça ao administrador para verificar as permissões. Não partilhe a sua senha nem utilize a conta de outra pessoa."
  },
  {
    title: "Dashboard e relatórios", keys: ["dashboard", "relatorio", "faturamento", "total vendido", "vendas de hoje", "lucro", "ticket medio", "indicadores"],
    answer: "O Dashboard reúne indicadores como total vendido, formas de pagamento, quantidade de vendas, ticket médio, portaria e estimativa de lucro bruto, conforme as permissões da conta. Para conferir números reais, abra o Dashboard ou os Relatórios do PDV. Este assistente gratuito não lê valores do sistema em tempo real e não consegue informar o faturamento atual."
  },
  {
    title: "Problemas no PDV", keys: ["erro", "travou", "travando", "lento", "tela preta", "sem internet", "nao abre", "falha", "nao funciona"],
    answer: "Se o PDV apresentar erro:\n1. Anote a mensagem exata e a aba onde aconteceu.\n2. Confira a ligação à internet, se estiver a usar a versão online.\n3. Antes de repetir uma venda ou pagamento, confira se a operação já foi registada.\n4. Se o problema persistir, avise o administrador e envie uma captura do erro sem expor senhas ou dados sensíveis."
  }
];

const suggestions = ["Como abrir o caixa?", "Como fechar o caixa?", "Como fazer uma venda?", "Como conferir os narguilês?", "Como fazer check-in de uma reserva?"];

function getAnswer(question) {
  const text = normalize(question);
  if (/^(oi|ola|bom dia|boa tarde|boa noite|ajuda|menu)$/.test(text)) {
    return "Olá! Posso orientar sobre Caixa, Vendas, Pagamentos, Portaria, Bar, Rosh, Narguilês, Reservas, Impressoras, Funcionários e Dashboard. Escreva sua dúvida ou escolha uma sugestão abaixo.";
  }
  const scored = topics.map((topic) => {
    const score = topic.keys.reduce((best, key) => {
      const normalizedKey = normalize(key);
      if (text.includes(normalizedKey)) return Math.max(best, normalizedKey.split(" ").length + 2);
      return best;
    }, 0);
    return { topic, score };
  }).sort((a, b) => b.score - a.score);
  if (scored[0].score > 0) return scored[0].topic.answer;
  return "Ainda não tenho uma orientação cadastrada para essa pergunta. Tente citar a aba ou a função (por exemplo: 'fechar caixa', 'impressora', 'reserva' ou 'narguilês'). Se for uma operação importante, peça ajuda ao gerente ou administrador. Não vou inventar uma função que talvez não exista no PDV.";
}

export default function AssistenteIA() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Olá! Sou a D’Lotus IA, seu guia gratuito do PDV. Posso ensinar como usar as funções cadastradas, sem precisar de uma chave de API. O que você precisa?" }
  ]);

  function ask(value) {
    const q = value.trim();
    if (!q) return;
    setMessages((current) => [...current, { role: "user", content: q }, { role: "assistant", content: getAnswer(q) }]);
    setQuestion("");
  }

  function send(e) {
    e.preventDefault();
    ask(question);
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6 space-y-4" data-testid="assistente-ia">
      <div className="flex items-center gap-3">
        <Bot className="h-8 w-8 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold">D’Lotus IA</h1>
          <p className="text-sm text-muted-foreground">Guia gratuito do PDV · sem API paga</p>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-4 h-[55vh] min-h-[300px] overflow-y-auto space-y-3" aria-live="polite">
        {messages.map((message, index) => (
          <div key={index} className={`max-w-[90%] whitespace-pre-wrap rounded-xl p-3 text-sm ${message.role === "user" ? "ml-auto bg-blue-600 text-white" : "mr-auto bg-muted text-foreground"}`}>
            {message.content}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button key={suggestion} type="button" onClick={() => ask(suggestion)} className="rounded-full border px-3 py-2 text-xs hover:bg-muted">
            {suggestion}
          </button>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input aria-label="Pergunta para D’Lotus IA" className="flex-1 min-w-0 rounded-lg border bg-background p-3" value={question} maxLength={1000} onChange={(e) => setQuestion(e.target.value)} placeholder="Pergunte como usar uma função do PDV..." />
        <button type="submit" disabled={!question.trim()} className="rounded-lg bg-blue-600 px-4 text-white disabled:opacity-50" aria-label="Enviar pergunta"><Send size={20} /></button>
      </form>
      <p className="text-xs text-muted-foreground">Este assistente oferece orientações cadastradas. Não consulta dados em tempo real, não altera vendas e pode não refletir mudanças recentes do sistema. Confirme operações importantes com o responsável.</p>
    </div>
  );
}
