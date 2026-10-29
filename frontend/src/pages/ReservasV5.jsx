import "./ReservasDJ.css";
import MapaReservasEditor from "./MapaReservasEditor";
import { useEffect, useState } from "react";
import api from "../lib/api";
import ComprovanteReserva from "../components/ComprovanteReserva";

const dataEventoBR=(valor)=>{
  if(!valor)return "Data não informada";
  const match=String(valor).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if(!match)return String(valor);
  const [,ano,mes,dia,hora="00",minuto="00"]=match;
  return `${dia}/${mes}/${ano} às ${hora}:${minuto}`;
};
// Na Reserva Rápida, eventos de datas anteriores desaparecem à meia-noite.
// O corte usa a data local e não altera o histórico nem o calendário.
const eventoNaoPassou=(evento,agora)=>{
  const match=String(evento?.data||"").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(!match)return false;
  const diaEvento=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));
  const hoje=new Date(agora.getFullYear(),agora.getMonth(),agora.getDate());
  return diaEvento>=hoje;
};
const eventosEmOrdem=(lista)=>[...lista].sort((a,b)=>
  String(a.data||"").localeCompare(String(b.data||"")) ||
  String(a.nome||"").localeCompare(String(b.nome||""))
);



// Cenário decorativo sem dependência externa: DJ vetorial com movimentos CSS.
const ABAS_PORTAL = [
  {id:"eventos",nome:"Eventos disponíveis"},
  {id:"mesas",nome:"Escolher mesa"},
  {id:"minhas",nome:"Minhas reservas e QR Code"},
  {id:"contato",nome:"Contato / WhatsApp"},
];
const PORTAL_PADRAO = {eventos:true,mesas:true,minhas:true,contato:false};
const field = "w-full rounded-lg bg-zinc-900 border border-zinc-700 p-3 text-white";
export default function ReservasV5() {
  const [tab,setTab]=useState("dashboard");
  const [relogioEventos,setRelogioEventos]=useState(()=>new Date());
  useEffect(()=>{const timer=setInterval(()=>setRelogioEventos(new Date()),30000);return ()=>clearInterval(timer);},[]);

  const [mapaMesas,setMapaMesas]=useState(null);
  const [editarMesa,setEditarMesa]=useState(null);
  const [salvandoMesa,setSalvandoMesa]=useState(false);
  const carregarMesas=async()=>{try{setMapaMesas((await api.get('/reservas/mapa')).data);}catch(e){setErro('Falha ao carregar mesas: '+(e.response?.data?.detail||e.message));}};
  const salvarCadastro=async(mapa)=>{setSalvandoMesa(true);setErro('');try{const {data}=await api.put('/reservas/mapa',mapa);setMapaMesas(data);setEditarMesa(null);return true;}catch(e){setErro(e.response?.data?.detail||'Falha ao salvar mesas');return false;}finally{setSalvandoMesa(false);}};
  const novaMesa=()=>{const nums=(mapaMesas?.mesas||[]).map(m=>Number(m.numero));let numero=1;while(nums.includes(numero))numero++;setEditarMesa({numero,tipo:'Mesa',capacidade:6,preco:50,ativa:true,x:50,y:50,largura:9,altura:9,nova:true});};
  const gravarMesa=async()=>{if(!mapaMesas||!editarMesa)return;const {nova,...dados}=editarMesa;const mesas=nova?[...mapaMesas.mesas,dados]:mapaMesas.mesas.map(m=>m.numero===dados.numero?{...m,...dados}:m);await salvarCadastro({...mapaMesas,mesas});};
  const excluirMesa=async(mesa)=>{if(!window.confirm(`Excluir ${mesa.tipo||'Mesa'} ${mesa.numero}? A exclusão será bloqueada se houver reserva ativa.`))return;await salvarCadastro({...mapaMesas,mesas:mapaMesas.mesas.filter(m=>m.numero!==mesa.numero)});};

  const [eventos,setEventos]=useState([]), [reservas,setReservas]=useState([]);
  const [evento,setEvento]=useState({nome:"",data:"",descricao:"",preco_reserva:0});
  const [form,setForm]=useState({evento_id:"",mesa:1,cliente:"",telefone:"",pessoas:1});
  const [erro,setErro]=useState("");
  const [configTab,setConfigTab]=useState("pagamentos");
  const [linkPublico,setLinkPublico]=useState("");
  const [linkMsg,setLinkMsg]=useState("");
  // Configuração visual local até existir endpoint público com autenticação e autorização.
  const [abasPortal,setAbasPortal]=useState(()=>{
    try {return {...PORTAL_PADRAO,...JSON.parse(localStorage.getItem("dlotus_reservas_portal_abas")||"{}")};}
    catch {return {...PORTAL_PADRAO};}
  });
  const [portalMsg,setPortalMsg]=useState("");
  const salvarAbasPortal=()=>{
    try {localStorage.setItem("dlotus_reservas_portal_abas",JSON.stringify(abasPortal));setPortalMsg("Preferências salvas neste navegador. A publicação para clientes exige integração com o servidor.");}
    catch {setPortalMsg("Não foi possível salvar as preferências neste navegador.");}
  };
  const [series,setSeries]=useState([]);
  const [novaSerie,setNovaSerie]=useState({nome:"",dia_semana:3,horario:"22:00",preco_reserva:0});
  const [flyerAberto,setFlyerAberto]=useState(null);
  const [serieEditando,setSerieEditando]=useState(null);
  const carregarLink=async()=>{try{const r=await api.get("/reservas/configuracoes/link-publico");setLinkPublico(r.data.url||"");}catch(e){setLinkMsg("Não foi possível carregar o link público.");}};
  const salvarLink=async(e)=>{e.preventDefault();try{const r=await api.put("/reservas/configuracoes/link-publico",{url:linkPublico});setLinkPublico(r.data.url);setLinkMsg("Link salvo no servidor.");}catch(e){setLinkMsg(e.response?.data?.detail||"Erro ao salvar o link.");}};
  const destinoPublico=linkPublico||new URL('/reservar',window.location.origin).href;
  const criarSerie=async(e)=>{e.preventDefault();setErro("");try{await api.post("/reservas/series",novaSerie);setNovaSerie({nome:"",dia_semana:3,horario:"22:00",preco_reserva:0});await carregarSeries();await carregar();}catch(e){setErro(mensagemFalha(e,"Falha ao criar card"));}};
  const excluirSerie=async(id)=>{if(!window.confirm("Remover este evento semanal? As reservas existentes serão preservadas."))return;try{await api.delete(`/reservas/series/${id}`);await carregarSeries();await carregar();}catch(e){setErro(mensagemFalha(e,"Falha ao remover card"));}};
  const carregarSeries=async()=>{try{setSeries((await api.get('/reservas/eventos/series')).data);}catch(e){setErro('Não foi possível carregar os eventos semanais.');}};
  const mensagemFalha=(e,acao)=>{
    if(e.response?.status===401) return `${acao}: sessão expirada. Entre novamente no PDV.`;
    if(e.response?.status===403) return `${acao}: usuário sem permissão de Reservas.`;
    if(e.response?.status===413) return `${acao}: imagem muito grande para o servidor.`;
    if(e.response?.data?.detail) return `${acao}: ${typeof e.response.data.detail==='string'?e.response.data.detail:JSON.stringify(e.response.data.detail)}`;
    if(e.response?.status) return `${acao}: servidor respondeu HTTP ${e.response.status}.`;
    return `${acao}: não foi possível conectar ao servidor (${e.message||'erro de rede'}). Verifique o endereço do PDV e se a porta 8001 responde.`;
  };
  const imagemArquivo=async(file,callback)=>{
    if(!file)return;
    setErro('');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setErro('Escolha um logo PNG, JPG ou WebP.');return;}
    try {
      const data=await new Promise((resolve,reject)=>{
        const img=new Image();const local=URL.createObjectURL(file);
        img.onload=()=>{try{const max=900;const ratio=Math.min(1,max/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*ratio));canvas.height=Math.max(1,Math.round(img.height*ratio));const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);const encoded=canvas.toDataURL('image/jpeg',0.78);URL.revokeObjectURL(local);resolve(encoded);}catch(err){URL.revokeObjectURL(local);reject(err);}};
        img.onerror=()=>{URL.revokeObjectURL(local);reject(new Error('Arquivo de imagem inválido'));};img.src=local;
      });
      if(data.length>1100000){setErro('A imagem ainda ficou muito grande. Escolha uma imagem menor.');return;}
      await callback(data);
    }catch(e){setErro('Não foi possível processar a imagem: '+e.message);}
  };
  const salvarImagemEvento=async(id,campo,valor)=>{setErro('');try{await api.patch(`/reservas/eventos/${id}/imagens`,{[campo]:valor});await carregar();}catch(e){setErro(mensagemFalha(e,'Falha ao salvar imagem'));}};
  const atualizarSerie=async(id,campo,valor)=>{setErro('');try{await api.patch(`/reservas/series/${id}`,{[campo]:valor});await carregarSeries();await carregar();}catch(e){setErro(mensagemFalha(e,'Falha ao atualizar evento semanal'));}};
  useEffect(()=>{carregarLink();},[]);
  useEffect(()=>{if(tab==='eventos')carregarSeries();},[tab]);
  const [mp,setMp]=useState({ativo:false,token:"",assinatura_webhook:"",token_configurado:false,assinatura_configurada:false});
  const [mpMsg,setMpMsg]=useState("");
  const [mpLoading,setMpLoading]=useState(false);
  const carregarMp=async()=>{try{const r=await api.get("/reservas/configuracoes/pagamentos");setMp(m=>({...m,...r.data,token:"",assinatura_webhook:""}));}catch(e){setMpMsg(e.response?.data?.detail||"Nao foi possivel carregar configuracoes de pagamento");}};
  useEffect(()=>{if(tab==="configuracoes")carregarMp();},[tab]);
  const salvarMp=async(e)=>{e.preventDefault();setMpLoading(true);setMpMsg("");try{await api.put("/reservas/configuracoes/pagamentos",{ativo:mp.ativo,token:mp.token,assinatura_webhook:mp.assinatura_webhook});await carregarMp();setMpMsg("Configuracoes salvas com sucesso.");}catch(e){setMpMsg(e.response?.data?.detail||"Falha ao salvar");}finally{setMpLoading(false);}};
  const testarMp=async()=>{setMpLoading(true);setMpMsg("");try{const r=await api.post("/reservas/configuracoes/pagamentos/testar");setMpMsg(r.data.mensagem);}catch(e){setMpMsg(e.response?.data?.detail||"Falha no teste de conexao");}finally{setMpLoading(false);}};
  const [bilhete,setBilhete]=useState(null);
  const carregar=async()=>{try{const [a,b]=await Promise.all([api.get("/reservas/eventos"),api.get("/reservas/lista")]);setEventos(a.data);setReservas(b.data);}catch(e){setErro(e.response?.data?.detail||"Falha ao carregar reservas");}};
  useEffect(()=>{carregar();carregarMesas();},[]);
  const criarEvento=async(e)=>{e.preventDefault();setErro("");try{await api.post("/reservas/eventos",evento);setEvento({nome:"",data:"",descricao:"",preco_reserva:0});await carregar();}catch(e){setErro(e.response?.data?.detail||"Falha ao criar evento");}};
  const reservar=async(e)=>{e.preventDefault();setErro("");
    if(!eventos.find(x=>x.id===form.evento_id&&eventoNaoPassou(x,new Date()))){
      setErro("Este evento já passou e não aceita novas reservas rápidas.");return;
    }
    try{
    const r=await api.post("/reservas/rapida",{evento_id:form.evento_id,mesa:Number(form.mesa),pessoas:Number(form.pessoas),cliente:form.cliente,telefone:form.telefone});
    const reservaId=r.data?.id;
    if(reservaId){const bilheteResposta=await api.get(`/reservas/${reservaId}/bilhete`);setBilhete(bilheteResposta.data);}
    setForm(f=>({...f,cliente:"",telefone:"",email:"",observacoes:""}));
    await carregar();
  }catch(e){setErro(e.response?.data?.detail||"Falha ao criar reserva ou gerar QR Code");}};
  const abrirBilhete=async(id)=>{try{setErro("");setBilhete((await api.get(`/reservas/${id}/bilhete`)).data);}catch(e){setErro(e.response?.data?.detail||"Erro ao gerar bilhete");}};
  const cancelar=async(id)=>{if(!window.confirm("Cancelar esta reserva e liberar a mesa?"))return;try{setErro("");await api.post(`/reservas/${id}/cancelar`);await carregar();}catch(e){setErro(e.response?.data?.detail||"Nao foi possivel cancelar");}};
  const eventosRapidos=eventosEmOrdem(eventos.filter(x=>eventoNaoPassou(x,relogioEventos)));
  const selecionado=eventosRapidos.find(x=>x.id===form.evento_id);
  useEffect(()=>{if(form.evento_id&&eventos.length&&!eventosRapidos.some(x=>x.id===form.evento_id)){
    setForm(f=>({...f,evento_id:"",mesa:""}));
  }},[relogioEventos,eventos,form.evento_id]);
  const ocupadas=new Set(reservas.filter(x=>x.evento_id===form.evento_id&&["confirmada_manual","confirmada_paga","aguardando_pagamento","verificar_pagamento"].includes(x.status)).map(x=>x.mesa));
  const [painelEvento,setPainelEvento]=useState("");
  const reservasDoEvento=reservas.filter(r=>r.evento_id===painelEvento);
  const statusAtivo=["confirmada_manual","confirmada_paga","aguardando_pagamento","verificar_pagamento","entrada_realizada","presente"];
  const mesasEmUso=new Set(reservasDoEvento.filter(r=>statusAtivo.includes(r.status)).map(r=>Number(r.mesa)));
  const totalLivres=(mapaMesas?.mesas||[]).filter(m=>m.ativa!==false&&!mesasEmUso.has(Number(m.numero))).length;
  // Disponibilidade independente por evento, inclusive para os cards semanais.
  // Não contar reservas canceladas, expiradas ou de outro evento.
  const disponibilidadeEvento=(eventoId)=>{
    if(!eventoId)return {total:0,livres:0,esgotado:false};
    const mesas=(mapaMesas?.mesas||[]).filter(m=>m.ativa!==false);
    const emUso=new Set(reservas.filter(r=>r.evento_id===eventoId && statusAtivo.includes(r.status)).map(r=>Number(r.mesa)));
    const livres=mesas.filter(m=>!emUso.has(Number(m.numero))).length;
    return {total:mesas.length,livres,esgotado:mesas.length>0 && livres===0};
  };
  const indicadores=[
    ["Reservas feitas",reservasDoEvento.filter(r=>statusAtivo.includes(r.status)).length],
    ["Confirmadas",reservasDoEvento.filter(r=>["confirmada_manual","confirmada_paga"].includes(r.status)).length],
    ["Pagas",reservasDoEvento.filter(r=>r.status==="confirmada_paga").length],
    ["Aguardando pagamento",reservasDoEvento.filter(r=>["aguardando_pagamento","verificar_pagamento"].includes(r.status)).length],
    ["Chegaram",reservasDoEvento.filter(r=>r.entrada_em||r.checkin_em||["entrada_realizada","presente"].includes(r.status)).length],
    ["Mesas disponíveis",totalLivres]
  ];
  return <div className="dl-reservas-stage w-full min-w-0 max-w-none p-4 md:p-8 text-white space-y-6">
    <div className="dl-reservas-content">
    <div className="dl-show-header flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 rounded-2xl border border-sky-500/30 bg-gradient-to-r from-slate-950 via-blue-950/70 to-slate-950 p-5 md:p-7">
      <div className="dl-header-eq" aria-hidden="true">{Array.from({length:110},(_,i)=><span key={i} style={{animationDelay:`-${i*.09}s`}}/>)}</div><div className="min-w-0"><p className="text-xs uppercase tracking-[.2em] text-cyan-300 mb-2">D’Lotus Lounge Bar</p><h1 className="text-2xl md:text-4xl font-black leading-tight text-white">Central de <span className="text-sky-300">Reservas</span></h1><p className="text-zinc-300 mt-3 max-w-2xl">Gerencie eventos, mesas, clientes e entradas. Compartilhe o portal de reservas com seus clientes.</p></div>
      <div className="flex flex-wrap gap-3"><a href={destinoPublico} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-5 py-3 min-h-12">Abrir link público ↗</a><button type="button" onClick={()=>{const url=destinoPublico;navigator.clipboard?.writeText(url).then(()=>alert('Link público copiado: '+url)).catch(()=>window.prompt('Copie o link público:',url));}} className="rounded-xl border border-cyan-400/50 px-5 py-3 min-h-12 font-semibold hover:bg-cyan-400/10">Copiar link</button></div>
    </div>
    <div className="dl-reservas-tabs flex flex-wrap gap-2">{[["dashboard","Dashboard"],["eventos","Eventos"],["mesas","Mesas"],["reservas","Reservas"],["rapida","Reserva rápida"],["clientes","Clientes"],["funcionarios","Funcionários"],["configuracoes","Configurações"]].map(([k,v])=><button key={k} onClick={()=>{setTab(k);setErro("");}} className={`rounded-lg px-4 py-3 transition-all duration-300 hover:shadow-[0_0_18px_rgba(56,189,248,0.55)] hover:ring-1 hover:ring-sky-300 ${tab===k?"bg-sky-600":"bg-zinc-800"}`}>{v}</button>)}</div>
    {erro&&<p role="alert" className="rounded-lg bg-red-900/40 p-3 text-red-200">{String(erro)}</p>}
    {(tab==="dashboard"||tab==="reservas")&&<section className="rounded-2xl border border-sky-500/40 bg-slate-950 p-5 space-y-4"><div className="flex flex-wrap items-center gap-3"><h2 className="font-bold text-sky-300">Resumo por evento</h2><select aria-label="Evento para indicadores" className={field+" max-w-md"} value={painelEvento} onChange={e=>setPainelEvento(e.target.value)}><option value="">Selecione um evento</option>{eventosEmOrdem(eventos).map(e=><option key={e.id} value={e.id}>{e.nome} · {dataEventoBR(e.data)}</option>)}</select></div>{painelEvento&&<><div className="grid grid-cols-2 lg:grid-cols-3 gap-3">{indicadores.map(([titulo,valor])=><div key={titulo} className="rounded-xl border border-sky-400/25 bg-sky-950/30 p-4"><p className="text-sm text-slate-300">{titulo}</p><p className="text-3xl font-bold text-white">{valor}</p></div>)}</div>{totalLivres===0&&<div role="status" className="rounded-xl border border-red-400 bg-red-950 p-4 text-center text-red-200 font-black">RESERVAS ESGOTADAS — não há mesas disponíveis neste evento.</div>}</>}</section>}
    {tab==="dashboard"&&<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 items-stretch w-full min-w-0">{[["Reservas",reservas.length],["Eventos",eventos.length],["Mesas cadastradas",mapaMesas?.mesas?.length||0],["Clientes",new Set(reservas.map(r=>r.telefone)).size],["Confirmadas",reservas.filter(r=>["confirmada_manual","confirmada_paga"].includes(r.status)).length],["Pendentes",reservas.filter(r=>["aguardando_pagamento","verificar_pagamento"].includes(r.status)).length]].map(([nome,valor])=><div key={nome} className="min-w-0 w-full h-full rounded-2xl bg-zinc-900 border border-zinc-800 p-5 md:p-6 flex flex-col justify-between gap-3 overflow-hidden"><p className="text-zinc-400 text-sm leading-snug break-words">{nome}</p><p className="text-3xl sm:text-4xl font-bold leading-tight tabular-nums break-all">{valor}</p></div>)}</div>}
    {tab==="dashboard"&&<section className="w-full min-w-0 rounded-xl bg-zinc-900 border border-zinc-800 p-5 md:p-6 space-y-3 overflow-hidden"><h2 className="font-bold text-sky-300">Financeiro das reservas</h2><p className="text-xl sm:text-2xl font-bold break-words tabular-nums">R$ {reservas.filter(r=>r.status==="confirmada_paga").reduce((sum,r)=>sum+Number(r.valor_pago||r.valor||0),0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}</p><p className="text-zinc-400 text-sm">Somente valores registrados nas reservas pagas. Reservas manuais não são contabilizadas como recebimento.</p><p className="text-amber-300 text-sm">Pagamentos aguardando confirmação: {reservas.filter(r=>["aguardando_pagamento","verificar_pagamento"].includes(r.status)).length}</p></section>}
    {tab==="clientes"&&<section className="space-y-3"><h2 className="text-xl font-bold">Clientes de reservas</h2>{Array.from(new Map(reservas.filter(r=>r.telefone).map(r=>[r.telefone,r])).values()).map(r=><div key={r.telefone} className="p-3 rounded bg-zinc-900">{r.cliente} · {r.telefone}</div>)}</section>}
    {tab==="funcionarios"&&<section className="rounded-xl bg-zinc-900 p-5"><h2 className="font-bold">Funcionários</h2><p className="text-zinc-400 mt-2">O cadastro e as permissões dos funcionários permanecem na aba Funcionários do PDV. Utilize essa aba para gerenciar os acessos.</p><a href="/funcionarios" className="text-cyan-300 underline">Abrir funcionários do PDV</a></section>}
    {tab==="configuracoes"&&<section className="space-y-5"><h2 className="text-xl font-bold">Configurações das Reservas</h2>
      <div className="flex flex-wrap gap-2"><button onClick={()=>setConfigTab("link") } className={`rounded-lg px-5 py-3 ${configTab==="link"?"bg-sky-600":"bg-zinc-800"}`}>Link Público</button><button onClick={()=>setConfigTab("pagamentos")} className={`rounded-lg px-5 py-3 ${configTab==="pagamentos"?"bg-sky-600":"bg-zinc-800"}`}>Pagamentos</button><button type="button" onClick={()=>setConfigTab("portal")} className={`rounded-lg px-5 py-3 ${configTab==="portal"?"bg-sky-600":"bg-zinc-800"}`}>Portal do Cliente</button></div>
      {configTab==="portal"&&<section className="rounded-2xl bg-zinc-950 border border-sky-900 p-5 space-y-4 max-w-2xl">
        <h3 className="font-bold text-xl text-sky-300">Configurar Portal do Cliente</h3>
        <p className="text-zinc-300 text-sm">Escolha as áreas que deverão aparecer para o cliente no portal público.</p>
        <div className="space-y-3">{ABAS_PORTAL.map(aba=><label key={aba.id} className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-3"><input type="checkbox" checked={!!abasPortal[aba.id]} onChange={e=>{setAbasPortal(v=>({...v,[aba.id]:e.target.checked}));setPortalMsg("");}}/><span>{aba.nome}</span></label>)}</div>
        <div className="rounded-xl border border-cyan-500/30 bg-slate-900 p-4 space-y-2"><h4 className="font-semibold text-cyan-300">Prévia das abas do cliente</h4><div className="flex flex-wrap gap-2">{ABAS_PORTAL.filter(aba=>abasPortal[aba.id]).map(aba=><span key={aba.id} className="rounded-lg bg-sky-700 px-3 py-2 text-sm">{aba.nome}</span>)}</div><p className="text-xs text-zinc-400">Cadastro e login por telefone e senha, pagamento via Mercado Pago e reserva gratuita somente para reservistas autorizados são regras obrigatórias do portal.</p></div>
        <button type="button" onClick={salvarAbasPortal} className="rounded-lg bg-sky-600 px-5 py-3 font-semibold">Salvar preferências</button>
        {portalMsg&&<p role="status" className="text-amber-200 text-sm">{portalMsg}</p>}
        <p className="text-sm text-amber-300">Esta etapa configura a interface do PDV. Para aplicar as opções no link público e habilitar cadastro, senha, permissões e pagamentos reais, ainda será necessário implementar e conectar as rotas do portal no backend. Nenhuma reserva gratuita pode ser autorizada apenas pelo navegador.</p>
      </section>}
      {configTab==="link"&&<form onSubmit={salvarLink} className="rounded-2xl bg-zinc-950 border border-sky-900 p-5 space-y-4 max-w-2xl"><h3 className="font-bold text-xl">Link Público de Reservas</h3><p className="text-zinc-400">Quando publicar o portal, cole aqui o endereço HTTPS exclusivo dos clientes. O endereço local só funciona na rede onde o PDV está disponível.</p><input className={field} type="url" placeholder="https://reservas.seudominio.com.br" value={linkPublico} onChange={e=>setLinkPublico(e.target.value)}/><button type="submit" className="bg-sky-600 rounded-lg px-5 py-3">Salvar link</button>{linkMsg&&<p role="status">{linkMsg}</p>}</form>}
      {configTab==="pagamentos"&&<form onSubmit={salvarMp} className="rounded-2xl bg-zinc-950 border border-sky-900 p-5 space-y-5 max-w-2xl">
        <h3 className="text-xl font-bold text-sky-300">Pix Mercado Pago</h3>
        <p className="text-zinc-400">Ative para gerar Pix real nas novas reservas e receber confirmações automáticas via webhook. A integração é exclusiva das Reservas.</p>
        <label className="flex items-center gap-3"><input type="checkbox" checked={mp.ativo} onChange={e=>setMp({...mp,ativo:e.target.checked})}/> Ativar Mercado Pago</label>
        <label className="block space-y-2">Access Token <span className="text-xs text-zinc-400">{mp.token_configurado?"(já configurado — deixe vazio para manter)":"(não configurado)"}</span><input type="password" autoComplete="new-password" className={field} value={mp.token} onChange={e=>setMp({...mp,token:e.target.value})} placeholder="Cole seu Access Token de produção"/></label>
        <label className="block space-y-2">Assinatura do Webhook (Secret Signature) <span className="text-xs text-zinc-400">{mp.assinatura_configurada?"(já configurada — deixe vazio para manter)":"(não configurada)"}</span><input type="password" autoComplete="new-password" className={field} value={mp.assinatura_webhook} onChange={e=>setMp({...mp,assinatura_webhook:e.target.value})} placeholder="Cole a assinatura secreta do webhook"/></label>
        <div className="space-y-2"><p className="font-semibold">URL do Webhook para cadastrar no Mercado Pago</p><p className="break-all rounded-lg bg-zinc-900 p-3 text-sky-300">{window.location.origin}/api/pagamentos/mercadopago/webhook</p><p className="text-sm text-amber-300">Para pagamentos reais, use a URL pública HTTPS do seu servidor. localhost não recebe notificações externas. Configure notificações do tipo payment.</p></div>
        {mpMsg&&<p role="status" className="text-sky-200">{mpMsg}</p>}
        <div className="flex flex-wrap gap-3"><button type="submit" disabled={mpLoading} className="rounded-lg bg-sky-600 px-5 py-3 disabled:opacity-50">Salvar configurações</button><button type="button" onClick={testarMp} disabled={mpLoading} className="rounded-lg bg-zinc-700 px-5 py-3 disabled:opacity-50">Testar conexão</button></div>
        <p className="text-xs text-zinc-400">As credenciais ficam criptografadas no banco de dados e não são exibidas novamente. Nunca compartilhe seu Access Token.</p>
      </form>}
    </section>}
    {tab==="eventos"&&<section className="space-y-5"><div><h2 className="text-2xl font-black text-white">Eventos e calendário</h2><p className="text-sm text-slate-400">Gerencie eventos semanais e datas no mesmo lugar. Clique no logo para abrir o flyer.</p></div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{series.map(serie=>{const proximos=eventosEmOrdem(eventos.filter(e=>e.serie_id===serie.id && String(e.data||"").slice(0,10)>=new Date().toLocaleDateString('en-CA')));const proximo=proximos[0]||eventosEmOrdem(eventos.filter(e=>e.serie_id===serie.id))[0];const disp=disponibilidadeEvento(proximo?.id);return <article key={serie.id} className="group relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#060d19] p-4 transition-all duration-500 hover:-translate-y-1 hover:border-cyan-300 hover:shadow-[0_0_35px_rgba(14,165,233,.3)]"><div className="pointer-events-none absolute -inset-12 rounded-full bg-sky-500/10 blur-3xl opacity-40 transition-opacity duration-700 group-hover:opacity-100"/><div className="relative space-y-3">{disp.esgotado&&<div role="status" aria-label="Reservas esgotadas" className="rounded-xl border-2 border-red-400 bg-red-950/95 px-3 py-3 text-center text-lg font-black tracking-wide text-white shadow-[0_0_28px_rgba(239,68,68,.65)] animate-pulse">🔴 RESERVAS ESGOTADAS</div>}<button type="button" className="w-full h-44 flex items-center justify-center rounded-xl bg-black/40 border border-sky-500/20 overflow-hidden" onClick={()=>setFlyerAberto(proximo?.flyer_dia||serie.logo_evento||proximo?.logo_evento||null)} title="Abrir flyer">{(serie.logo_evento||proximo?.logo_evento)?<img className="max-w-full max-h-40 object-contain transition-transform duration-700 group-hover:scale-105" src={serie.logo_evento||proximo?.logo_evento} alt={serie.nome}/>:<span className="text-2xl font-black text-sky-300 text-center">{serie.nome}</span>}</button><h3 className="font-extrabold text-lg text-white">{serie.nome}</h3><p className="text-sm text-sky-200">{proximo?dataEventoBR(proximo.data):'Aguardando próxima data'}</p><div className="flex gap-2"><button type="button" disabled={!proximo||disp.esgotado} onClick={()=>{setForm(f=>({...f,evento_id:proximo.id}));setTab('rapida');}} className="flex-1 rounded-lg bg-sky-500 px-3 py-2 font-bold text-slate-950 disabled:opacity-40">{disp.esgotado?'ESGOTADO':'RESERVAR MESA'}</button><button type="button" onClick={()=>setSerieEditando(serieEditando===serie.id?null:serie.id)} className="rounded-lg border border-sky-500/50 px-3 py-2 text-sky-200">Editar</button></div>{serieEditando===serie.id&&<div className="space-y-3 rounded-xl bg-black/50 p-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={serie.ativo!==false} onChange={e=>atualizarSerie(serie.id,'ativo',e.target.checked)}/> Repetir semanalmente</label><label className="block text-sm">Logo fixo<input type="file" accept="image/png,image/jpeg,image/webp" className="block w-full text-xs mt-1" onChange={e=>imagemArquivo(e.target.files[0],v=>atualizarSerie(serie.id,'logo_evento',v))}/></label><label className="block text-sm">Nome<input className={field} value={serie.nome} onChange={e=>setSeries(old=>old.map(x=>x.id===serie.id?{...x,nome:e.target.value}:x))} onBlur={()=>atualizarSerie(serie.id,'nome',serie.nome)}/></label><label className="block text-sm">Horário<input type="time" className={field} value={serie.horario||'22:00'} onChange={e=>atualizarSerie(serie.id,'horario',e.target.value)}/></label><button type="button" className="text-red-300 text-sm underline" onClick={()=>excluirSerie(serie.id)}>Remover card semanal</button></div>}</div></article>})}</div>
      <form onSubmit={criarSerie} className="rounded-xl border border-sky-500/30 bg-slate-950 p-4 space-y-3"><h3 className="font-bold text-sky-300">+ Novo card semanal</h3><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"><input required className={field} placeholder="Nome do evento" value={novaSerie.nome} onChange={e=>setNovaSerie({...novaSerie,nome:e.target.value})}/><select className={field} value={novaSerie.dia_semana} onChange={e=>setNovaSerie({...novaSerie,dia_semana:Number(e.target.value)})}>{['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'].map((nome,i)=><option key={i} value={i}>{nome}</option>)}</select><input type="time" className={field} value={novaSerie.horario} onChange={e=>setNovaSerie({...novaSerie,horario:e.target.value})}/><button className="rounded-lg bg-sky-600 p-3 font-bold">Criar card</button></div></form>
      <details className="rounded-xl border border-slate-700 p-4"><summary className="cursor-pointer font-bold text-sky-200">Datas, flyers e eventos avulsos ({eventos.length})</summary><div className="mt-4 space-y-3"><form onSubmit={criarEvento} className="grid md:grid-cols-4 gap-3"><input required className={field} placeholder="Nome do evento" value={evento.nome} onChange={e=>setEvento({...evento,nome:e.target.value})}/><input required type="datetime-local" className={field} value={evento.data} onChange={e=>setEvento({...evento,data:e.target.value})}/><input type="number" min="0" step="0.01" className={field} value={evento.preco_reserva} onChange={e=>setEvento({...evento,preco_reserva:Number(e.target.value)})}/><button className="rounded-lg bg-sky-600 p-3">Criar evento avulso</button></form>{eventosEmOrdem(eventos).map(x=><div key={x.id} className="rounded-lg bg-zinc-900 p-3"><div className="font-semibold">{x.nome} · {dataEventoBR(x.data)}</div><div className="grid md:grid-cols-2 gap-3 mt-2"><label className="text-sm">Logo desta data<input type="file" accept="image/png,image/jpeg,image/webp" className="block mt-1" onChange={e=>imagemArquivo(e.target.files[0],v=>salvarImagemEvento(x.id,'logo_evento',v))}/></label><label className="text-sm">Flyer desta data<input type="file" accept="image/png,image/jpeg,image/webp" className="block mt-1" onChange={e=>imagemArquivo(e.target.files[0],v=>salvarImagemEvento(x.id,'flyer_dia',v))}/></label></div>{x.flyer_dia&&<button type="button" onClick={()=>setFlyerAberto(x.flyer_dia)} className="text-sky-300 underline">Visualizar flyer</button>}{!x.serie_id&&<button type="button" className="ml-3 underline" onClick={async()=>{try{await api.patch(`/reservas/eventos/${x.id}/publicacao`,{publicado:!x.publicado});await carregar();}catch(e){setErro(mensagemFalha(e,'Erro ao publicar'));}}}>{x.publicado?'Despublicar':'Publicar'}</button>}</div>)}</div></details>
      {flyerAberto&&<div role="dialog" aria-modal="true" aria-label="Flyer do evento" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5" onClick={()=>setFlyerAberto(null)}><div className="relative max-h-[90vh] max-w-3xl" onClick={e=>e.stopPropagation()}><button type="button" onClick={()=>setFlyerAberto(null)} className="absolute -top-10 right-0 text-white font-bold">✕ Fechar</button><img src={flyerAberto} alt="Flyer ampliado" className="max-h-[85vh] w-auto max-w-full object-contain rounded-xl"/></div></div>}</section>}
    {tab==="mesas"&&<section className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[.25em] text-sky-400">LAYOUT</p><h2 className="text-3xl font-black">Mesas & Bistrôs</h2><p className="text-sm text-zinc-400">Cadastre, edite e exclua posições. Novos itens entram automaticamente no mapa.</p></div><button type="button" onClick={novaMesa} className="rounded-xl bg-sky-500 px-6 py-3 font-bold text-slate-950 shadow-[0_0_24px_rgba(14,165,233,.3)]">+ Novo</button></div>
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">{(mapaMesas?.mesas||[]).map(m=><div key={m.numero} className="group rounded-2xl border border-slate-700/60 bg-[#0b0d17] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400 hover:shadow-[0_0_28px_rgba(14,165,233,.24)]"><p className="text-xs uppercase text-sky-300">♧ {m.tipo||'Mesa'}</p><h3 className="mt-2 text-xl font-extrabold">{m.tipo||'Mesa'} {m.numero}</h3><p className="text-sm text-zinc-400">até {m.capacidade||6} pessoas · {m.ativa===false?'Inativa':'Ativa'}</p><p className="my-2 text-lg font-black text-sky-400">{Number(m.preco??50).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p><div className="flex gap-2"><button type="button" onClick={()=>setEditarMesa({...m,nova:false})} className="flex-1 rounded-full border border-cyan-600 py-2 text-cyan-300 hover:bg-cyan-500/20" aria-label={`Editar ${m.tipo||'Mesa'} ${m.numero}`}>✎ Editar</button><button type="button" onClick={()=>excluirMesa(m)} className="flex-1 rounded-full border border-red-800 py-2 text-red-300 hover:bg-red-600/20" aria-label={`Excluir ${m.tipo||'Mesa'} ${m.numero}`}>♲ Excluir</button></div></div>)}</div>
  {editarMesa&&<div className="rounded-2xl border border-sky-500/50 bg-slate-950 p-5 space-y-3"><h3 className="text-xl font-bold">{editarMesa.nova?'Novo item':'Editar item'} — {editarMesa.numero}</h3><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"><label>Tipo<select className={field} value={editarMesa.tipo||'Mesa'} onChange={e=>setEditarMesa({...editarMesa,tipo:e.target.value})}><option>Mesa</option><option>Bistrô</option></select></label><label>Número<input className={field} type="number" min="1" max="999" disabled={!editarMesa.nova} value={editarMesa.numero} onChange={e=>setEditarMesa({...editarMesa,numero:Number(e.target.value)})}/></label><label>Capacidade<input className={field} type="number" min="1" max="20" value={editarMesa.capacidade} onChange={e=>setEditarMesa({...editarMesa,capacidade:Number(e.target.value)})}/></label><label>Valor (R$)<input className={field} type="number" min="0" step="0.01" value={editarMesa.preco??50} onChange={e=>setEditarMesa({...editarMesa,preco:Number(e.target.value)})}/></label></div><label className="flex items-center gap-2"><input type="checkbox" checked={editarMesa.ativa!==false} onChange={e=>setEditarMesa({...editarMesa,ativa:e.target.checked})}/> Disponível para reservas</label><div className="flex gap-3"><button disabled={salvandoMesa} type="button" onClick={gravarMesa} className="rounded-lg bg-sky-600 px-5 py-3 disabled:opacity-50">Salvar</button><button type="button" onClick={()=>setEditarMesa(null)} className="rounded-lg bg-zinc-700 px-5 py-3">Cancelar</button></div></div>}
  <div className="rounded-xl border border-sky-500/30 p-4"><h3 className="font-bold text-sky-300 mb-3">Mapa — arraste para posicionar</h3><MapaReservasEditor eventoId={form.evento_id} ocupadas={ocupadas} onMapaSalvo={setMapaMesas} onSelect={n=>{setForm({...form,mesa:n});setTab('rapida');}}/></div></section>}
    {tab==="rapida"&&<section className="mx-auto max-w-3xl space-y-5">
      <p className="text-sm text-slate-400">Cadastre o cliente e libere a reserva confirmada, sem passar por pagamento online.</p>
      <form onSubmit={reservar} className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-[#101018] p-5 space-y-5">
          <h2 className="text-xl font-black text-white">Evento e mesa</h2>
          <label className="block text-xs tracking-wider text-slate-400">EVENTO
            <select required className={`${field} mt-2`} value={form.evento_id} onChange={e=>setForm(f=>({...f,evento_id:e.target.value,mesa:""}))}><option value="">Escolha um evento</option>{eventosRapidos.map(x=><option key={x.id} value={x.id}>{x.nome} · {dataEventoBR(x.data)}</option>)}</select>
          </label>
          {eventosRapidos.length===0&&<p className="text-sm text-amber-300">Nenhum evento de hoje ou de datas futuras disponível para Reserva Rápida.</p>}
          <label className="block text-xs tracking-wider text-slate-400">MESA / CAMAROTE / BISTRÔ
            <select required disabled={!selecionado} className={`${field} mt-2`} value={form.mesa} onChange={e=>setForm(f=>({...f,mesa:Number(e.target.value)}))}>
              <option value="">Selecione o evento primeiro</option>
              {(mapaMesas?.mesas||[]).filter(m=>m.ativa!==false).map(m=><option key={m.numero} value={m.numero} disabled={ocupadas.has(Number(m.numero))}>{m.tipo==='Bistrô'?'Bistrô ':'Mesa '}{m.numero}{ocupadas.has(Number(m.numero))?' — Reservada':''}</option>)}
            </select>
          </label>
          {selecionado&&<details className="rounded-xl border border-cyan-500/25 bg-black/30 p-3" open><summary className="cursor-pointer font-semibold text-cyan-300">Escolher pelo mapa</summary><div className="mt-3"><MapaReservasEditor eventoId={form.evento_id} ocupadas={ocupadas} onSelect={n=>{if(!ocupadas.has(Number(n)))setForm(f=>({...f,mesa:Number(n)}));}}/></div></details>}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs tracking-wider text-slate-400">CONVIDADOS<input required type="number" min="1" max="6" className={`${field} mt-2`} value={form.pessoas} onChange={e=>setForm(f=>({...f,pessoas:e.target.value}))}/></label>
            <label className="text-xs tracking-wider text-slate-400">TIPO<select className={`${field} mt-2`} value="cortesia" disabled><option value="cortesia">Cortesia (grátis)</option></select></label>
          </div>
          <label className="block text-xs tracking-wider text-slate-400">OBSERVAÇÕES (OPCIONAL)<textarea rows={2} className={`${field} mt-2`} value={form.observacoes||""} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))}/></label>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#101018] p-5 space-y-4">
          <h2 className="text-xl font-black text-white">Dados do cliente</h2>
          <label className="block text-xs tracking-wider text-slate-400">NOME<input required className={`${field} mt-2`} value={form.cliente} onChange={e=>setForm(f=>({...f,cliente:e.target.value}))}/></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs tracking-wider text-slate-400">E-MAIL (OPCIONAL)<input type="email" className={`${field} mt-2`} value={form.email||""} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></label>
            <label className="text-xs tracking-wider text-slate-400">WHATSAPP (DDD + NÚMERO)<input required type="tel" className={`${field} mt-2`} placeholder="(11) 99999-0000" value={form.telefone} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))}/></label>
          </div>
        </div>
        <button type="submit" disabled={!form.evento_id||!form.mesa} className="rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-4 font-extrabold text-black shadow-[0_0_24px_rgba(249,115,22,.35)] transition hover:brightness-110 disabled:opacity-40">Criar reserva e gerar QR Code</button>
      </form>
    </section>}
    {tab==="mesas"&&<section className="space-y-4"><label className="block">Evento<select className={field} value={form.evento_id} onChange={e=>setForm({...form,evento_id:e.target.value})}><option value="">Selecione um evento</option>{eventosEmOrdem(eventos).map(x=><option key={x.id} value={x.id}>{x.nome} · {dataEventoBR(x.data)}</option>)}</select></label></section>}
        {bilhete&&<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"><ComprovanteReserva token={bilhete.token} cliente={bilhete.cliente} evento={eventos.find(x=>x.id===bilhete.evento_id)?.nome} data={eventos.find(x=>x.id===bilhete.evento_id)?.data} mesa={bilhete.mesa} pessoas={bilhete.pessoas} codigo={bilhete.reserva_id} onFechar={()=>setBilhete(null)}/></div>}
    {tab==="reservas"&&<section className="space-y-3"><h2 className="text-xl font-semibold">Reservas registradas ({reservas.length})</h2>{reservas.length===0&&<p className="text-zinc-400">Nenhuma reserva cadastrada.</p>}{reservas.map(x=><div key={x.id} className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 flex flex-wrap justify-between gap-3"><div><strong>Mesa {x.mesa} · {x.cliente}</strong><p className="text-sm text-zinc-400">{eventos.find(y=>y.id===x.evento_id)?.nome||"Evento"} · {x.pessoas} pessoas · {x.telefone}</p><p className="text-xs text-amber-300">{x.status === "confirmada_paga" ? "Pagamento online aprovado" : x.status === "confirmada_manual" ? "Reserva manual" : x.status === "aguardando_pagamento" ? "Aguardando pagamento" : x.status} · {!["confirmada_manual","confirmada_paga"].includes(x.status)?"Cancelada":x.entrada?"Entrada registrada":"Aguardando entrada"}</p></div><div className="flex flex-wrap gap-2">{["confirmada_manual","confirmada_paga"].includes(x.status)&&<button onClick={()=>abrirBilhete(x.id)} className="rounded-lg bg-indigo-700 p-3">Ver QR</button>}{["confirmada_manual","confirmada_paga"].includes(x.status)&&!x.entrada&&<button onClick={()=>cancelar(x.id)} className="rounded-lg bg-red-900 p-3">Cancelar (admin)</button>}</div></div>)}</section>}
    </div>
  </div>;
}
