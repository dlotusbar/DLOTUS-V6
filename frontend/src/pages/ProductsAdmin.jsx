import { useEffect, useState } from "react";
import api, { formatBRL } from "../lib/api";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Camera, X } from "lucide-react";

const empty = { image_data: null, name: "", category_id: "", price_cost: 0, price_sale: 0, stock: 0, printer_id: "", print_second_copy_cashier: false, active: true };

export default function ProductsAdmin() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [showCat, setShowCat] = useState(false);
  const [catName, setCatName] = useState("");

  const load = async () => {
    const [p, c, pr] = await Promise.all([api.get("/products"), api.get("/categories"), api.get("/printers")]);
    setProducts(p.data); setCategories(c.data); setPrinters(pr.data);
    if (!form.category_id && c.data[0]) setForm((f) => ({ ...f, category_id: c.data[0].id }));
    if (!form.printer_id && pr.data[0]) setForm((f) => ({ ...f, printer_id: pr.data[0].id }));
  };
  useEffect(() => { load(); }, []);

  const escolherFoto = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) { toast.error("Selecione uma imagem."); return; }
    if (arquivo.size > 12 * 1024 * 1024) { toast.error("A imagem deve ter no máximo 12 MB."); return; }
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () => {
      try {
        const escala = Math.min(1, 500 / Math.max(imagem.width, imagem.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(imagem.width * escala));
        canvas.height = Math.max(1, Math.round(imagem.height * escala));
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);
        const foto = canvas.toDataURL("image/jpeg", 0.7);
        setForm((anterior) => ({ ...anterior, image_data: foto }));
      } catch { toast.error("Não foi possível processar a imagem."); }
      finally { URL.revokeObjectURL(url); }
    };
    imagem.onerror = () => { URL.revokeObjectURL(url); toast.error("Imagem inválida."); };
    imagem.src = url;
    e.target.value = "";
  };

  const save = async () => {
    try {
      const payload = { ...form, price_cost: Number(form.price_cost), price_sale: Number(form.price_sale), stock: Number(form.stock) };
      if (editing) await api.put(`/products/${editing}`, payload);
      else await api.post("/products", payload);
      toast.success("Produto salvo"); setForm(empty); setEditing(null); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };

  const edit = (p) => { setEditing(p.id); setForm({ ...p }); window.scrollTo(0, 0); };
  const del = async (p) => {
    if (!window.confirm(`EXCLUIR permanentemente "${p.name}"? Essa ação não pode ser desfeita.`)) return;
    try { await api.delete(`/products/${p.id}`); toast.success("Produto excluído"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Erro ao excluir"); }
  };

  const addCat = async () => {
    if (!catName) return;
    await api.post("/categories", { name: catName, sort_order: categories.length + 1, active: true });
    setCatName(""); load(); toast.success("Categoria criada");
  };
  const delCat = async (c) => {
    if (!window.confirm(`EXCLUIR a categoria "${c.name}"? Produtos vinculados precisam ser movidos antes.`)) return;
    try { await api.delete(`/categories/${c.id}`); toast.success("Categoria excluída"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Erro ao excluir"); }
  };

  return (
    <div className="p-6 lg:p-10 pb-24 space-y-6">
      <h1 className="font-display text-3xl font-extrabold gold-text">Produtos</h1>
      <div className="bg-[#121215] border border-white/5 rounded-2xl p-5">
        <h3 className="font-display text-lg font-bold mb-4">{editing ? "Editar Produto" : "Novo Produto"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="prod-name" className="px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100" />
          <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} data-testid="prod-cat" className="px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={form.printer_id} onChange={(e) => setForm({ ...form, printer_id: e.target.value })} data-testid="prod-printer" className="px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100">
            {printers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.kind})</option>)}
          </select>
          <input type="number" step="0.01" placeholder="Preço Compra" value={form.price_cost} onChange={(e) => setForm({ ...form, price_cost: e.target.value })} className="px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100 mono" />
          <input type="number" step="0.01" placeholder="Preço Venda" value={form.price_sale} onChange={(e) => setForm({ ...form, price_sale: e.target.value })} data-testid="prod-price" className="px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100 mono" />
          <input type="number" placeholder="Estoque" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg text-zinc-100 mono" />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-[#0A0A0C] p-3">
          <div className="w-24 h-24 shrink-0 rounded-xl border border-[#D4AF37]/30 bg-[#18181D] flex items-center justify-center overflow-hidden">
            {form.image_data ? <img src={form.image_data} alt="Prévia do produto" className="w-full h-full object-contain" /> : <Camera size={30} className="text-zinc-500" />}
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-zinc-100">Foto do produto</div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 font-bold text-black hover:brightness-110">
              <Camera size={17} /> {form.image_data ? "Trocar foto" : "Adicionar foto"}
              <input type="file" accept="image/*" onChange={escolherFoto} className="hidden" data-testid="prod-image-input" />
            </label>
            {form.image_data && <button type="button" onClick={() => setForm((f) => ({ ...f, image_data: null }))} className="ml-2 inline-flex items-center gap-1 text-sm text-red-300"><X size={15} /> Remover</button>}
            <p className="text-xs text-zinc-500">Escolha uma imagem do computador (até 12 MB). A foto será otimizada antes de salvar.</p>
          </div>
        </div>
        <label className="flex items-center gap-2 mt-3 text-sm text-zinc-300">
          <input type="checkbox" checked={form.print_second_copy_cashier} onChange={(e) => setForm({ ...form, print_second_copy_cashier: e.target.checked })} /> Imprimir 2ª via no Caixa
        </label>
        <label className="flex items-center gap-2 mt-2 text-sm text-zinc-300">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo
        </label>
        <div className="flex gap-2 mt-4">
          <button onClick={save} data-testid="save-prod" className="px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg">{editing ? "Atualizar" : "Criar"}</button>
          {editing && <button onClick={() => { setEditing(null); setForm(empty); }} className="px-4 py-2 bg-[#18181D] text-zinc-300 rounded-lg">Cancelar</button>}
          <button onClick={() => setShowCat(!showCat)} className="px-4 py-2 bg-[#18181D] text-[#D4AF37] rounded-lg">Categorias</button>
        </div>
        {showCat && (
          <div className="mt-4 bg-[#0A0A0C] border border-white/10 rounded-xl p-4 space-y-3" data-testid="cat-manager">
            <div className="flex gap-2">
              <input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCat()}
                placeholder="Nome da nova categoria"
                data-testid="cat-new-name"
                className="flex-1 px-3 py-2 bg-[#121215] border border-white/10 rounded-lg text-zinc-100"
              />
              <button onClick={addCat} data-testid="cat-create" className="px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg">Criar</button>
            </div>
            <div className="divide-y divide-white/5">
              {categories.length === 0 && <p className="text-sm text-zinc-500 py-2">Nenhuma categoria cadastrada.</p>}
              {categories.map((c) => {
                const count = products.filter((p) => p.category_id === c.id).length;
                return (
                  <div key={c.id} className="flex items-center justify-between py-2" data-testid={`cat-row-${c.name}`}>
                    <div>
                      <div className="text-zinc-100 font-medium">{c.name}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{count} produto{count === 1 ? "" : "s"}</div>
                    </div>
                    <button
                      onClick={() => delCat(c)}
                      data-testid={`cat-del-${c.name}`}
                      className="p-1.5 text-zinc-400 hover:text-red-400"
                      title={count > 0 ? "Mova os produtos antes de excluir" : "Excluir categoria"}
                    ><Trash2 size={14} /></button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#18181D] text-zinc-400 uppercase text-xs tracking-widest">
            <tr><th className="px-4 py-3 text-left">Produto</th><th className="px-4 py-3 text-left">Categoria</th><th className="px-4 py-3 text-left">Impressora</th><th className="px-4 py-3 text-right">Venda</th><th className="px-4 py-3 text-right">Estoque</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-white/5 hover:bg-white/5" data-testid={`row-${p.name}`}>
                <td className="px-4 py-3 text-zinc-100"><div className="flex items-center gap-3">{p.image_data ? <img src={p.image_data} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/10" /> : <Camera size={20} className="text-zinc-600" />}<span>{p.name} {!p.active && <span className="text-xs text-red-400">(inativo)</span>}</span></div></td>
                <td className="px-4 py-3 text-zinc-400">{categories.find((c) => c.id === p.category_id)?.name}</td>
                <td className="px-4 py-3 text-zinc-400">{printers.find((pr) => pr.id === p.printer_id)?.name}</td>
                <td className="px-4 py-3 mono text-right text-[#D4AF37]">{formatBRL(p.price_sale)}</td>
                <td className="px-4 py-3 mono text-right text-zinc-300">{p.stock}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => edit(p)} className="p-1.5 text-zinc-400 hover:text-[#D4AF37]"><Edit2 size={14} /></button>
                  <button onClick={() => del(p)} className="p-1.5 text-zinc-400 hover:text-red-400"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
