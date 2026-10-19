import { useEffect, useRef, useState } from 'react';
import api from '../lib/api';

const clamp = (n) => Math.min(98, Math.max(2, n));
const button = 'rounded-lg px-3 py-2 bg-sky-700 disabled:opacity-40';

export default function MapaReservasEditor({ eventoId, ocupadas, onSelect, onMapaSalvo }) {
  const [mapa, setMapa] = useState(null);
  const [edicao, setEdicao] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [selecionada, setSelecionada] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [imagemPendente, setImagemPendente] = useState(false);
  const [proporcaoImagem, setProporcaoImagem] = useState(null);
  const area = useRef(null);
  const dragging = useRef(null);

  useEffect(() => {
    let ativo = true;
    api.get('/reservas/mapa').then(({ data }) => { if (ativo) setMapa(data); }).catch(() => { if (ativo) setErro('Não foi possível carregar o mapa'); });
    api.get('/auth/me').then(({data}) => { if (ativo) setAdmin((data.role || '').toLowerCase() === 'administrador'); }).catch(() => {});
    return () => { ativo = false; };
  }, []);

  // Respeita a proporção original da planta, inclusive ao recarregar uma imagem já salva.
  useEffect(() => {
    if (!mapa?.imagem) { setProporcaoImagem(null); return; }
    let ativo = true;
    const imagem = new Image();
    imagem.onload = () => {
      if (ativo && imagem.naturalWidth && imagem.naturalHeight) {
        setProporcaoImagem(`${imagem.naturalWidth} / ${imagem.naturalHeight}`);
      }
    };
    imagem.onerror = () => { if (ativo) setProporcaoImagem(null); };
    imagem.src = mapa.imagem;
    return () => { ativo = false; };
  }, [mapa?.imagem]);

  const alterar = (tipo, id, patch) => setMapa(prev => ({...prev, [tipo]: prev[tipo].map(item => (tipo === 'mesas' ? item.numero === id : item.id === id) ? {...item, ...patch} : item)}));
  const mover = (event) => {
    if (!edicao || !dragging.current || !area.current) return;
    const bounds = area.current.getBoundingClientRect();
    const x = clamp(Math.round(((event.clientX - bounds.left) / bounds.width) * 1000) / 10);
    const y = clamp(Math.round(((event.clientY - bounds.top) / bounds.height) * 1000) / 10);
    alterar(dragging.current.tipo, dragging.current.id, {x, y});
  };
  const carregarImagem = (arquivo) => {
    if (!arquivo) return;
    if (!['image/png','image/jpeg','image/webp'].includes(arquivo.type) || arquivo.size > 3000000) { setErro('Use PNG, JPG ou WebP com até 3 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setMapa(prev => ({...prev, imagem: String(reader.result)})); setImagemPendente(true); setErro(''); };
    reader.readAsDataURL(arquivo);
  };
  const salvar = async () => {
    setErro(''); setSucesso('');
    try { const {data} = await api.put('/reservas/mapa', mapa); setMapa(data); setEdicao(false); setImagemPendente(false); setSucesso('Mapa e posições salvos com sucesso.'); onMapaSalvo?.(data); }
    catch (e) { setErro(e.response?.data?.detail || 'Falha ao salvar mapa'); }
  };
  const restaurar = async () => {
    try { const {data} = await api.get('/reservas/mapa'); setMapa(data); setEdicao(false); setErro(''); } catch(e) { setErro('Falha ao descartar alterações'); }
  };
  if (!mapa) return <p className="text-zinc-400">{erro || 'Carregando mapa...'}</p>;
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-xl font-semibold mr-auto">Mapa de reservas — {mapa.mesas.length} posições</h2>
      {admin && !edicao && <button type="button" className={button} onClick={() => {setEdicao(true); setSucesso('');}}>Editar mapa</button>}
      {admin && edicao && <><button type="button" className={button} onClick={salvar}>Salvar posições</button><button type="button" className="rounded-lg px-3 py-2 bg-zinc-700" onClick={restaurar}>Descartar</button></>}
    </div>
    {admin && <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 space-y-2"><h3 className="font-semibold">Configurações da planta da casa</h3><p className="text-sm text-zinc-400">Escolha uma foto da planta. Depois clique em Editar mapa, arraste e redimensione as mesas. Salve para atualizar o mapa de Reservas e o mapa público.</p><input aria-label="Escolher foto da planta" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>carregarImagem(e.target.files?.[0])} className="block max-w-full text-sm" />{imagemPendente && <button type="button" className={button} onClick={salvar}>Salvar nova foto do mapa</button>}{mapa.imagem && <button type="button" className="rounded-lg bg-zinc-700 px-3 py-2" onClick={()=>{setMapa(prev=>({...prev,imagem:''}));setImagemPendente(true);}}>Remover foto</button>}</div>}
    {mapa.imagem && <p className="text-sm text-sky-300">A foto é exibida na proporção original, sem achatar ou esticar. As mesas continuam posicionadas sobre a planta.</p>}
    <p className="text-sm text-zinc-400">{edicao ? 'Arraste mesas e ambientes para reposicionar. Toque numa mesa para editar sua capacidade e disponibilidade. Apenas o administrador pode salvar.' : 'Verde: livre · Vermelho: reservada · Cinza: desativada. Selecione um evento e toque numa mesa livre para reservar.'}</p>
    {erro && <p role="alert" className="text-red-300">{String(erro)}</p>}{sucesso && <p className="text-emerald-300">{sucesso}</p>}
    <div ref={area} onPointerMove={mover} onPointerUp={() => dragging.current = null} onPointerCancel={() => dragging.current = null}
      className="relative w-full rounded-xl border-2 border-sky-900 bg-zinc-950 overflow-hidden select-none"
      style={{aspectRatio:mapa.imagem ? (proporcaoImagem || '1.4 / 1') : '1.4 / 1', touchAction: edicao ? 'none' : 'auto', backgroundImage:mapa.imagem ? `url(${mapa.imagem})` : 'linear-gradient(to right, #222 1px, transparent 1px),linear-gradient(to bottom, #222 1px, transparent 1px)', backgroundSize:mapa.imagem?'contain':'10% 10%', backgroundRepeat:'no-repeat', backgroundPosition:'center'}}>
      <div className="absolute left-1/3 right-1/3 top-[2%] text-center text-xs text-zinc-500 pointer-events-none">PISTA / FRENTE</div>
      {mapa.ambientes.map(item => <button key={item.id} type="button"
        onPointerDown={e => { if (edicao) {dragging.current = {tipo:'ambientes',id:item.id}; e.currentTarget.setPointerCapture(e.pointerId);} }}
        style={{position:'absolute',left:`${item.x}%`,top:`${item.y}%`,transform:'translate(-50%,-50%)',touchAction:'none'}}
        className={`text-[10px] sm:text-xs rounded border border-amber-600/70 bg-amber-950/80 px-2 py-1 max-w-[24%] ${edicao ? 'cursor-move' : 'cursor-default'}`}>{item.nome}</button>)}
      {mapa.mesas.map(mesa => { const ocupada = ocupadas.has(mesa.numero); return <button key={mesa.numero} type="button"
        onPointerDown={e => { if(edicao){dragging.current = {tipo:'mesas',id:mesa.numero}; e.currentTarget.setPointerCapture(e.pointerId);} }}
        onClick={() => { if(edicao) setSelecionada(mesa.numero); else if (eventoId && mesa.ativa && !ocupada) onSelect(mesa.numero); }}
        style={{position:'absolute',left:`${mesa.x}%`,top:`${mesa.y}%`,transform:'translate(-50%,-50%)',touchAction:'none',width:`${mesa.largura||9}%`,height:`${mesa.altura||9}%`}}
        className={`rounded-lg border p-1 sm:p-2 text-center shadow-lg overflow-hidden ${!mesa.ativa ? 'bg-zinc-700 border-zinc-500' : ocupada ? 'bg-red-950 border-red-500' : 'bg-emerald-900 border-emerald-500'} ${edicao ? 'cursor-move' : 'cursor-pointer'}`}
        title={`${mesa.tipo||"Mesa"} ${mesa.numero} — ${mesa.capacidade} pessoas`}><strong className="block text-sm">{mesa.numero}</strong><span className="block text-[9px] sm:text-[10px]">{!mesa.ativa ? 'Inativa' : ocupada ? 'Reservada' : 'Livre'}</span></button>; })}
    </div>
    {edicao && selecionada != null && (() => {const mesa = mapa.mesas.find(m=>m.numero===selecionada); return <div className="flex flex-wrap items-center gap-3 rounded-lg bg-zinc-900 p-3"><strong>{mesa.tipo||"Mesa"} {selecionada}</strong><label>Capacidade <input type="number" min="1" max="20" className="w-20 bg-zinc-800 p-2 rounded" value={mesa.capacidade} onChange={e=>alterar('mesas',selecionada,{capacidade:Math.max(1,Math.min(20,Number(e.target.value)||1))})}/></label><label>Largura (%) <input type="number" min="3" max="35" className="w-20 bg-zinc-800 p-2 rounded" value={mesa.largura||9} onChange={e=>alterar('mesas',selecionada,{largura:Number(e.target.value)})}/></label><label>Altura (%) <input type="number" min="3" max="35" className="w-20 bg-zinc-800 p-2 rounded" value={mesa.altura||9} onChange={e=>alterar('mesas',selecionada,{altura:Number(e.target.value)})}/></label><label className="flex items-center gap-2"><input type="checkbox" checked={mesa.ativa} onChange={e=>alterar('mesas',selecionada,{ativa:e.target.checked})}/> Ativa</label><button className={button} onClick={()=>setSelecionada(null)}>Concluir</button></div>})()}
  </section>;
}
