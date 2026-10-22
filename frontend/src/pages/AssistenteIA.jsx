import React, { useState } from "react";
import api from "../lib/api";
import { Bot, Send } from "lucide-react";

export default function AssistenteIA() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", content: "Olá! Sou a D’Lotus IA. Posso explicar funções do PDV e consultar os indicadores autorizados do Dashboard. O que você precisa?" }]);
  const [loading, setLoading] = useState(false);
  async function send(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;
    setQuestion(""); setMessages(m => [...m, {role:"user", content:q}]); setLoading(true);
    try {
      const {data} = await api.post("/assistant/chat", {message:q});
      setMessages(m => [...m, {role:"assistant", content:data.answer}]);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setMessages(m => [...m, {role:"assistant", content:typeof detail === "string" ? detail : "Não consegui consultar o servidor agora. Confira sua conexão e tente novamente."}]);
    } finally {setLoading(false);}
  }
  return <div className="mx-auto max-w-4xl p-4 md:p-6 space-y-4" data-testid="assistente-ia">
    <div className="flex items-center gap-3"><Bot className="h-8 w-8 text-blue-500"/><div><h1 className="text-2xl font-bold">D’Lotus IA</h1><p className="text-sm text-muted-foreground">Assistente do PDV · consultas somente leitura</p></div></div>
    <div className="rounded-xl border bg-card p-4 h-[55vh] min-h-[300px] overflow-y-auto space-y-3" aria-live="polite">
      {messages.map((m,i)=><div key={i} className={`max-w-[90%] whitespace-pre-wrap rounded-xl p-3 text-sm ${m.role === "user" ? "ml-auto bg-blue-600 text-white" : "mr-auto bg-muted text-foreground"}`}>{m.content}</div>)}
      {loading && <p className="text-sm text-muted-foreground">Consultando...</p>}
    </div>
    <form onSubmit={send} className="flex gap-2"><input aria-label="Pergunta para D’Lotus IA" className="flex-1 min-w-0 rounded-lg border bg-background p-3" value={question} maxLength={1000} onChange={e=>setQuestion(e.target.value)} placeholder="Pergunte sobre o PDV ou as vendas de hoje..."/><button type="submit" disabled={loading || !question.trim()} className="rounded-lg bg-blue-600 px-4 text-white disabled:opacity-50" aria-label="Enviar pergunta"><Send size={20}/></button></form>
    <p className="text-xs text-muted-foreground">A IA pode cometer erros. Confira os valores nos relatórios antes de tomar decisões. Dados limitados às permissões da sua conta.</p>
  </div>;
}
