import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const vazio = {grande: 0, pequeno: 0, quebrado: 0};
const nomes = {grande:'Grandes', pequeno:'Pequenos', quebrado:'Quebrados'};
const inputClass = 'w-full min-w-0 rounded-lg bg-[#10121b] border border-white/20 p-3 text-white';
const buttonClass = 'rounded-xl bg-blue-700 hover:bg-blue-600 disabled:opacity-40 px-4 py-3 font-bold text-white';
const dt = (s) => s ? new Date(s).toLocaleString('pt-BR') : 'Ainda não realizada';

export default function NarguileControle() {
  const {user} = useAuth();
  const admin = ['administrador','gerente'].includes((user?.role || '').toLowerCase());
  const [state,setState] = useState(null);
  const [history,setHistory] = useState([]);
  const [movements,setMovements] = useState([]);
  const [count,setCount] = useState({...vazio});
  const [stock,setStock] = useState({...vazio});
  const [note,setNote] = useState('');
  const [reason,setReason] = useState('');
  const [origin,setOrigin] = useState('grande');
  const [qty,setQty] = useState(1);
  const [mode,setMode] = useState('conferencia');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const refresh = async () => {
    const [a,b,c] = await Promise.all([
      api.get('/narguile/controle'), api.get('/narguile/controle/historico'), api.get('/narguile/controle/movimentos')
    ]);
    setState(a.data); setHistory(b.data); setMovements(c.data);
    if (a.data.estoque) {
      const values = {grande:a.data.estoque.grande, pequeno:a.data.estoque.pequeno, quebrado:a.data.estoque.quebrado};
      setStock(values);
      setCount(values);
    }
  };
  useEffect(()=>{refresh().catch((e)=>setError(e.response?.data?.detail || 'Não foi possível carregar o estoque. Confira sua conexão.'));},[]);
  const execute = async (url,payload,success) => {
    setBusy(true);setError('');
    try {await api.post(url,payload); await refresh();setReason('');setNote('');toast.success(success);}
    catch(e){const msg=e.response?.data?.detail || 'Não foi possível salvar. Confira sua conexão.';setError(msg);toast.error(msg);}
    finally{setBusy(false);}
  };
  if(!state) return <div className="p-6 text-white">Carregando controle de narguilês... {error}</div>;
  const expected = state.estoque;
  const counted = Object.values(count).reduce((a,b)=>a+Number(b||0),0);
  const diff = expected ? counted-expected.total : 0;
  const mismatch = expected && (diff !== 0 || Object.keys(vazio).some(k=>Number(count[k])!==expected[k]));
  const numberFields = (values,setter) => <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{Object.keys(vazio).map(k=><label key={k} className="text-sm text-zinc-300">{nomes[k]}<input className={inputClass} type="number" min="0" step="1" value={values[k]} onChange={e=>setter(v=>({...v,[k]:e.target.value}))}/></label>)}</div>;
  const normalized = (obj) => Object.fromEntries(Object.keys(vazio).map(k=>[k,Number(obj[k])]));
  const valid = obj => Object.keys(vazio).every(k=>Number.isInteger(Number(obj[k])) && Number(obj[k])>=0 && obj[k] !== '');
  return <div className="p-4 sm:p-6 lg:p-10 pb-28 space-y-5 text-zinc-100">
    <header><h2 className="text-2xl font-black">Controle de Narguilês</h2><p className="text-zinc-400 text-sm">Patrimônio físico e conferências · D’Lotus</p></header>
    {!expected ? <section className="bg-[#15151d] rounded-xl p-5 space-y-4 border border-blue-500/30">
      <h3 className="font-bold text-xl">Cadastro inicial do estoque</h3>
      {admin ? <>{numberFields(stock,setStock)}<p>Total físico: <b>{Object.values(stock).reduce((a,b)=>a+Number(b||0),0)}</b></p>
        <input className={inputClass} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Motivo do cadastro inicial" />
        <button disabled={busy||!valid(stock)||!reason.trim()} className={buttonClass} onClick={()=>execute('/narguile/controle/inicial',{...normalized(stock),motivo:reason},'Estoque cadastrado')}>Cadastrar estoque</button></>
      : <p className="text-amber-300">Aguardando o administrador cadastrar o estoque físico inicial.</p>}</section> : <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[['Total físico',expected.total],['Grandes',expected.grande],['Pequenos',expected.pequeno],['Quebrados',expected.quebrado]].map(([label,value])=><div key={label} className="rounded-xl bg-[#141722] border border-blue-500/20 p-4"><p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p><p className="text-3xl font-black mt-2">{value}</p></div>)}</div>
      <div className="rounded-xl border border-white/10 bg-[#141722] p-4 flex flex-wrap gap-6 text-sm"><span>Última conferência: <b>{dt(state.ultima_conferencia?.data_hora)}</b></span><span>Status: <b className={state.ultima_conferencia?.status==='DIVERGENCIA'?'text-red-400':'text-green-400'}>{state.ultima_conferencia?.status||'Pendente'}</b></span></div>
      <div className="flex flex-wrap gap-2">{[['conferencia','Realizar conferência'],['quebra','Registrar quebrado'],['historico','Histórico de conferências'],['movimentos','Movimentações'],...(admin?[['baixa','Dar baixa'],['ajuste','Ajustar / adicionar']]:[])].map(([id,label])=><button key={id} onClick={()=>{setMode(id);setError('');}} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode===id?'bg-blue-700 text-white':'bg-[#202331] text-zinc-300'}`}>{label}</button>)}</div>
      {mode==='conferencia'&&<section className="rounded-xl border border-white/10 bg-[#15151d] p-4 sm:p-6 space-y-4"><h3 className="text-xl font-bold">Realizar conferência</h3>{numberFields(count,setCount)}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm"><div>Esperado: <b>{expected.total}</b></div><div>Contado: <b>{counted}</b></div><div>Diferença: <b>{diff>0?'+':''}{diff}</b></div></div>
        {mismatch ? <div role="alert" className="rounded-xl border-2 border-red-500 bg-red-950/50 p-4 text-red-200"><b>⚠ DIVERGÊNCIA NA CONFERÊNCIA</b><p>Esperado: {expected.total} · Encontrado: {counted} · {diff<0?`Faltam ${Math.abs(diff)}`:diff>0?`Sobram ${diff}`:'As categorias não conferem'} narguilê(s).</p></div> : <div className="text-emerald-400 font-bold">✓ Quantidades conferem com o estoque esperado</div>}
        <textarea className={inputClass} value={note} onChange={e=>setNote(e.target.value)} placeholder={mismatch?'Observação obrigatória: explique a diferença':'Observação (opcional)'} rows={3}/>
        <button disabled={busy||!valid(count)||(mismatch&&!note.trim())} className={buttonClass} onClick={()=>execute('/narguile/controle/conferir',{...normalized(count),observacao:note},'Conferência registrada no histórico')}>Salvar conferência</button><p className="text-xs text-zinc-400">A conferência não altera o estoque oficial, mesmo com divergência.</p></section>}
      {mode==='quebra'&&<section className="rounded-xl bg-[#15151d] p-5 space-y-3"><h3 className="text-xl font-bold">Registrar narguilê quebrado</h3><label>Origem<select className={inputClass} value={origin} onChange={e=>setOrigin(e.target.value)}><option value="grande">Grande</option><option value="pequeno">Pequeno</option></select></label><label>Quantidade<input className={inputClass} type="number" min="1" step="1" value={qty} onChange={e=>setQty(e.target.value)}/></label><textarea className={inputClass} placeholder="Motivo da quebra (obrigatório)" value={reason} onChange={e=>setReason(e.target.value)}/><p className="text-sm text-zinc-400">Apenas transfere para Quebrados. O total físico não muda.</p><button className={buttonClass} disabled={busy||!reason.trim()||!Number.isInteger(Number(qty))||Number(qty)<1} onClick={()=>execute('/narguile/controle/quebrar',{origem:origin,quantidade:Number(qty),motivo:reason},'Quebra registrada')}>Registrar quebra</button></section>}
      {mode==='baixa'&&admin&&<section className="rounded-xl bg-[#15151d] p-5 space-y-3"><h3 className="text-xl font-bold">Baixa definitiva de quebrados</h3><p>Disponíveis para baixa: {expected.quebrado}</p><input className={inputClass} type="number" min="1" step="1" max={expected.quebrado} value={qty} onChange={e=>setQty(e.target.value)}/><textarea className={inputClass} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Motivo da baixa (obrigatório)"/><button className={buttonClass} disabled={busy||!reason.trim()||!Number.isInteger(Number(qty))||Number(qty)<1||Number(qty)>expected.quebrado} onClick={()=>{if(window.confirm(`Confirma a baixa definitiva de ${qty} narguilê(s)?`))execute('/narguile/controle/baixa',{quantidade:Number(qty),motivo:reason},'Baixa registrada');}}>Confirmar baixa definitiva</button></section>}
      {mode==='ajuste'&&admin&&<section className="rounded-xl bg-[#15151d] p-5 space-y-3"><h3 className="text-xl font-bold">Ajuste autorizado do patrimônio</h3>{numberFields(stock,setStock)}<p>Novo total: {Object.values(stock).reduce((a,b)=>a+Number(b||0),0)}</p><textarea className={inputClass} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Justificativa obrigatória"/><button className={buttonClass} disabled={busy||!valid(stock)||!reason.trim()} onClick={()=>{if(window.confirm('Confirmar alteração do estoque oficial?'))execute('/narguile/controle/ajuste',{...normalized(stock),motivo:reason},'Estoque ajustado');}}>Salvar ajuste</button></section>}
      {mode==='historico'&&<section className="overflow-x-auto rounded-xl border border-white/10"><table className="min-w-[780px] w-full text-sm"><thead className="bg-[#242739]"><tr>{['Data e hora','Funcionário','Grandes','Pequenos','Quebrados','Contado','Esperado','Diferença','Status','Observação'].map(x=><th key={x} className="p-3 text-left">{x}</th>)}</tr></thead><tbody>{history.map(h=><tr key={h.id} className="border-t border-white/10">{[dt(h.data_hora),h.funcionario,h.grande,h.pequeno,h.quebrado,h.total_contado,h.total_esperado,h.diferenca,h.status,h.observacao].map((x,i)=><td key={i} className={`p-3 ${i===8&&x==='DIVERGENCIA'?'text-red-400 font-bold':''}`}>{x}</td>)}</tr>)}</tbody></table>{!history.length&&<p className="p-4">Nenhuma conferência registrada.</p>}</section>}
      {mode==='movimentos'&&<section className="space-y-2">{movements.map(m=><div key={m.id} className="rounded-xl bg-[#15151d] p-4 text-sm"><b>{m.tipo.replaceAll('_',' ').toUpperCase()}</b> · {dt(m.data_hora)} · {m.funcionario}<p className="text-zinc-400">{m.motivo}</p></div>)}{!movements.length&&<p>Nenhuma movimentação registrada.</p>}</section>}
    </>}
    {error&&<div role="alert" className="rounded-xl border border-red-500 p-4 text-red-300">{error}</div>}
  </div>;
}
