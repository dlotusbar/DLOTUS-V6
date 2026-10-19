import { useEffect, useState } from "react";
import api from "../lib/api";
import { ALL_PERMISSIONS, NAV_ITEMS } from "../navPermissions";
import { toast } from "sonner";
import { Edit2, Shield, Trash2 } from "lucide-react";

const ROLES = ["Administrador", "Gerente", "Caixa", "Atendente", "Bar", "Rosh", "Portaria"];
const empty = { username: "", password: "", name: "", role: "Atendente", permissions: [], active: true };

export default function Employees() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  const load = () => api.get("/users").then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const togglePerm = (p) => {
    const has = form.permissions.includes(p);
    setForm({ ...form, permissions: has ? form.permissions.filter((x) => x !== p) : [...form.permissions, p] });
  };

  const save = async () => {
    const payload = { ...form };
    if (payload.username) payload.username = payload.username.toLowerCase().trim();
    if (payload.password) payload.password = payload.password.trim();
    if (payload.name) payload.name = payload.name.trim();
    if (!editing) {
      if (!payload.username) return toast.error("Informe o usuário");
      if (!payload.password || payload.password.length < 4) return toast.error("Senha deve ter pelo menos 4 caracteres");
      if (!payload.name) return toast.error("Informe o nome");
    }
    try {
      if (editing) {
        const upd = { name: payload.name, role: payload.role, permissions: payload.permissions, active: payload.active };
        if (payload.password) upd.password = payload.password;
        await api.put(`/users/${editing}`, upd);
      } else {
        await api.post("/users", payload);
      }
      toast.success(editing ? "Usuário atualizado" : `Usuário "${payload.username}" criado — já pode fazer login`);
      setForm(empty); setEditing(null); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao salvar"); }
  };

  const edit = (u) => { setEditing(u.id); setForm({ ...u, password: "" }); window.scrollTo(0, 0); };
  const del = async (u) => {
    if (!window.confirm(`EXCLUIR permanentemente "${u.name}"? Essa ação não pode ser desfeita.`)) return;
    try { await api.delete(`/users/${u.id}`); toast.success("Funcionário excluído"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Erro ao excluir"); }
  };

  return (
    <div className="p-6 lg:p-10 pb-24 space-y-6">
      <h1 className="font-display text-3xl font-extrabold gold-text">Funcionários</h1>
      <div className="bg-[#121215] border border-white/5 rounded-2xl p-5">
        <h3 className="font-display text-lg font-bold mb-3">{editing ? "Editar" : "Novo Funcionário"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="emp-name" className="px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg" />
          <input placeholder="Usuário" value={form.username} disabled={!!editing} onChange={(e) => setForm({ ...form, username: e.target.value })} data-testid="emp-username" className="px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg" />
          <input placeholder={editing ? "Nova senha (opcional)" : "Senha"} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="emp-password" className="px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} data-testid="emp-role" className="px-3 py-2 bg-[#0A0A0C] border border-white/10 rounded-lg">
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="mt-4">
          <p className="text-xs uppercase tracking-widest text-zinc-400 mb-2">Permissões Individuais</p>
          <div className="flex flex-wrap gap-2 mb-3">
            <button type="button" onClick={() => setForm(prev => ({...prev, permissions: ALL_PERMISSIONS.slice()}))} className="px-3 py-2 rounded-lg bg-emerald-900/40 border border-emerald-500/40 text-sm">Selecionar Todas</button>
            <button type="button" onClick={() => setForm(prev => ({...prev, permissions: []}))} className="px-3 py-2 rounded-lg bg-zinc-800 border border-white/20 text-sm">Desmarcar Todas</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_PERMISSIONS.map((p) => (
              <button key={p} onClick={() => togglePerm(p)} data-testid={`perm-${p}`} className={`px-3 py-1.5 rounded-full text-xs border transition ${form.permissions.includes(p) ? "bg-[#D4AF37]/15 border-[#D4AF37]/60 text-[#F3E5AB]" : "bg-[#0A0A0C] border-white/10 text-zinc-400"}`}>
                {NAV_ITEMS.find(i => i.perm === p)?.label || p.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={save} data-testid="save-emp" className="px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg">{editing ? "Atualizar" : "Criar"}</button>
          {editing && <button onClick={() => { setEditing(null); setForm(empty); }} className="px-4 py-2 bg-[#18181D] rounded-lg">Cancelar</button>}
        </div>
      </div>

      <div className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#18181D] text-zinc-400 uppercase text-xs tracking-widest">
            <tr><th className="px-4 py-3 text-left">Nome</th><th className="px-4 py-3 text-left">Usuário</th><th className="px-4 py-3 text-left">Cargo</th><th className="px-4 py-3 text-left">Permissões</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-white/5">
                <td className="px-4 py-3 text-zinc-100 flex items-center gap-2"><Shield size={14} className="text-[#D4AF37]" /> {u.name} {!u.active && <span className="text-xs text-red-400">(inativo)</span>}</td>
                <td className="px-4 py-3 mono text-zinc-400">{u.username}</td>
                <td className="px-4 py-3 text-[#D4AF37]">{u.role}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">{(u.permissions || []).slice(0, 4).join(", ")}{(u.permissions || []).length > 4 && ` +${u.permissions.length - 4}`}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => edit(u)} className="p-1.5 text-zinc-400 hover:text-[#D4AF37]"><Edit2 size={14} /></button>
                  <button onClick={() => del(u)} className="p-1.5 text-zinc-400 hover:text-red-400"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
