import { playVoiceAlert } from '../lib/voiceAlert';
import { useState, useRef } from "react";
import { useTheme, THEME_PRESETS, applyTheme } from "../context/ThemeContext";
import { toast } from "sonner";
import { Upload, Trash2, RotateCcw, Save, Palette, Settings as SettingsIcon, Image as ImgIcon, Monitor, Menu as MenuIcon, Square, Eye, Sun, Moon, Zap, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { playSiren } from "../lib/sirenAudio";

const TABS = [
  { id: "geral", label: "Geral", icon: SettingsIcon },
  { id: "login", label: "Login", icon: ImgIcon },
  { id: "cores", label: "Cores", icon: Palette },
  { id: "temas", label: "Temas", icon: Zap },
  { id: "menu", label: "Menu", icon: MenuIcon },
  { id: "botoes", label: "Botões & Cards", icon: Square },
  { id: "preview", label: "Pré-visualização", icon: Eye },
  { id: "sirenes", label: "Sirene Bar / Rosh", icon: Zap },
];

export default function SystemSettings() {
  const { settings, setSettings, save, reset } = useTheme();
  const { user } = useAuth();
  const [tab, setTab] = useState("geral");
  const [saving, setSaving] = useState(false);

  if (user?.role !== "Administrador") {
    return <div className="p-10 text-center text-zinc-500">Apenas administradores podem acessar esta área.</div>;
  }

  const handleSave = async () => {
    setSaving(true);
    try { await save(); toast.success("Configurações salvas com sucesso"); }
    catch (e) { toast.error(e.response?.data?.detail || "Erro ao salvar"); }
    finally { setSaving(false); }
  };

  const handleReset = async () => {
    if (!window.confirm("Restaurar todas as configurações padrão? Esta ação não pode ser desfeita.")) return;
    try { await reset(); toast.success("Configurações restauradas ao padrão"); }
    catch (e) { toast.error("Erro ao restaurar"); }
  };

  const btnBg = settings.colors?.button_bg || "#D4AF37";
  const primary = settings.colors?.primary || "#D4AF37";

  return (
    <div className="p-6 lg:p-10 pb-24">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] mb-1" style={{ color: primary }}>Admin</p>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold" style={{ color: primary }}>Configurações do Sistema</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleReset} data-testid="reset-settings" className="px-5 py-3 bg-[#18181D] text-zinc-200 rounded-lg flex items-center gap-2 hover:bg-red-900/30 hover:text-red-300 transition font-medium border border-white/10">
            <RotateCcw size={16} /> Restaurar Padrão
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            data-testid="save-settings"
            className="px-6 py-3 font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 shadow-lg hover:opacity-90 transition"
            style={{ background: `linear-gradient(135deg, ${settings.colors?.accent || "#F3E5AB"}, ${btnBg}, ${settings.colors?.button_hover || "#C5A059"})`, color: "#000" }}
          >
            <Save size={16} /> {saving ? "Salvando..." : "SALVAR ALTERAÇÕES"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto mb-6 pb-2 border-b border-white/5">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              data-testid={`settings-tab-${t.id}`}
              className={`px-4 py-2 rounded-t-lg text-sm whitespace-nowrap flex items-center gap-2 transition ${tab === t.id ? "text-zinc-100 border-b-2" : "text-zinc-400 hover:text-zinc-100"}`}
              style={tab === t.id ? { borderColor: "var(--dl-primary)", background: "rgba(255,255,255,0.03)" } : {}}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "geral" && <GeneralTab settings={settings} setSettings={setSettings} />}
      {tab === "login" && <LoginTab settings={settings} setSettings={setSettings} />}
      {tab === "cores" && <ColorsTab settings={settings} setSettings={setSettings} />}
      {tab === "temas" && <ThemesTab settings={settings} setSettings={setSettings} />}
      {tab === "menu" && <MenuTab settings={settings} setSettings={setSettings} />}
      {tab === "botoes" && <ButtonsTab settings={settings} setSettings={setSettings} />}
      {tab === "preview" && <PreviewTab settings={settings} />}
      {tab === "sirenes" && <SirenSettings settings={settings} setSettings={setSettings} />}
    </div>
  );
}

// ========== GERAL ==========
function GeneralTab({ settings, setSettings }) {
  const upd = (k, v) => setSettings({ general: { [k]: v } });
  return (
    <div className="space-y-4 max-w-3xl">
      <Section title="Identidade do Sistema">
        <Field label="Nome do estabelecimento"><input value={settings.general.app_name} onChange={(e) => upd("app_name", e.target.value)} data-testid="g-app-name" className="dl-input" /></Field>
        <Field label="Título no login"><input value={settings.general.login_title} onChange={(e) => upd("login_title", e.target.value)} className="dl-input" /></Field>
        <Field label="Título no menu"><input value={settings.general.menu_title} onChange={(e) => upd("menu_title", e.target.value)} className="dl-input" /></Field>
        <Field label="Subtítulo"><input value={settings.general.subtitle} onChange={(e) => upd("subtitle", e.target.value)} className="dl-input" /></Field>
      </Section>
      <Section title="Logos e Favicon">
        <ImageUpload label="Logo principal (menu/cabeçalho)" value={settings.general.logo_main} onChange={(v) => upd("logo_main", v)} testid="g-logo-main" />
        <ImageUpload label="Logo do login" value={settings.general.logo_login} onChange={(v) => upd("logo_login", v)} testid="g-logo-login" />
        <ImageUpload label="Favicon" value={settings.general.favicon} onChange={(v) => upd("favicon", v)} testid="g-favicon" small />
      </Section>
    </div>
  );
}

// ========== LOGIN ==========
function LoginTab({ settings, setSettings }) {
  const upd = (k, v) => setSettings({ login: { [k]: v } });
  return (
    <div className="space-y-4 max-w-3xl">
      <Section title="Fundo da Tela de Login">
        <ImageUpload label="Imagem de fundo" value={settings.login.bg_image} onChange={(v) => upd("bg_image", v)} testid="l-bg" />
        <Field label="Modo de exibição">
          <select value={settings.login.bg_mode} onChange={(e) => upd("bg_mode", e.target.value)} className="dl-input">
            <option value="cover">Cover (preencher)</option>
            <option value="contain">Contain (ajustar)</option>
            <option value="none">Sem imagem</option>
          </select>
        </Field>
        <Field label="Posição">
          <select value={settings.login.bg_position} onChange={(e) => upd("bg_position", e.target.value)} className="dl-input">
            <option value="center">Centro</option>
            <option value="top">Superior</option>
            <option value="bottom">Inferior</option>
            <option value="left">Esquerda</option>
            <option value="right">Direita</option>
          </select>
        </Field>
        <Field label={`Escurecimento: ${settings.login.bg_opacity}%`}>
          <input type="range" min="0" max="90" value={settings.login.bg_opacity} onChange={(e) => upd("bg_opacity", Number(e.target.value))} className="w-full" />
        </Field>
      </Section>
      {settings.login.bg_image && settings.login.bg_mode !== "none" && (
        <div className="relative h-56 rounded-xl overflow-hidden border border-white/10">
          <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.login.bg_image})`, backgroundSize: settings.login.bg_mode, backgroundPosition: settings.login.bg_position, backgroundRepeat: "no-repeat" }} />
          <div className="absolute inset-0 bg-black" style={{ opacity: settings.login.bg_opacity / 100 }} />
          <div className="relative z-10 h-full flex items-center justify-center text-zinc-100 font-display text-2xl font-bold">Preview</div>
        </div>
      )}
    </div>
  );
}

// ========== CORES ==========
function ColorsTab({ settings, setSettings }) {
  const upd = (k, v) => setSettings({ colors: { [k]: v } });
  const groups = [
    { title: "Principais", keys: [["primary", "Primária"], ["secondary", "Secundária"], ["accent", "Destaque"]] },
    { title: "Botões", keys: [["button_bg", "Fundo"], ["button_hover", "Hover"]] },
    { title: "Layout", keys: [["menu_bg", "Menu lateral"], ["header_bg", "Cabeçalho"], ["body_bg", "Fundo geral"], ["card_bg", "Cards"]] },
    { title: "Textos", keys: [["text_primary", "Primário"], ["text_secondary", "Secundário"]] },
    { title: "Status", keys: [["success", "Sucesso"], ["warning", "Alerta"], ["error", "Erro"], ["info", "Info"]] },
  ];
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <Section key={g.title} title={g.title}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {g.keys.map(([k, label]) => (
              <ColorField key={k} label={label} value={settings.colors[k]} onChange={(v) => upd(k, v)} testid={`color-${k}`} />
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}

// ========== TEMAS ==========
function ThemesTab({ settings, setSettings }) {
  const apply = (presetKey) => {
    const p = THEME_PRESETS[presetKey];
    setSettings({ theme_preset: presetKey, mode: presetKey === "light" ? "light" : "dark", colors: p.colors });
    toast.success(`Tema "${p.name}" aplicado`);
  };
  return (
    <div className="space-y-6 max-w-5xl">
      <Section title="Temas Prontos">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(THEME_PRESETS).map(([k, p]) => (
            <button key={k} onClick={() => apply(k)} data-testid={`preset-${k}`} className={`rounded-xl p-4 border-2 transition ${settings.theme_preset === k ? "border-[color:var(--dl-primary)]" : "border-white/10 hover:border-white/30"}`} style={{ background: p.colors.card_bg }}>
              <div className="flex gap-1 mb-3">
                {["primary", "secondary", "accent", "success"].map((c) => <div key={c} className="h-6 w-6 rounded-md" style={{ background: p.colors[c] }} />)}
              </div>
              <div className="text-sm font-bold" style={{ color: p.colors.text_primary }}>{p.name}</div>
              {settings.theme_preset === k && <Check size={14} className="mt-2 text-[color:var(--dl-primary)]" />}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Modo">
        <div className="grid grid-cols-3 gap-2">
          <ModeBtn active={settings.mode === "dark"} onClick={() => setSettings({ mode: "dark" })} icon={Moon} label="Escuro" />
          <ModeBtn active={settings.mode === "light"} onClick={() => setSettings({ mode: "light" })} icon={Sun} label="Claro" />
          <ModeBtn active={settings.mode === "auto"} onClick={() => setSettings({ mode: "auto" })} icon={Monitor} label="Automático" />
        </div>
      </Section>
    </div>
  );
}

function ModeBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition ${active ? "border-[color:var(--dl-primary)] bg-white/5" : "border-white/10 hover:border-white/30"}`}>
      <Icon size={20} className="text-[color:var(--dl-primary)]" />
      <span className="text-sm">{label}</span>
    </button>
  );
}

// ========== MENU ==========
function MenuTab({ settings, setSettings }) {
  const upd = (k, v) => setSettings({ menu: { [k]: v } });
  return (
    <div className="space-y-4 max-w-3xl">
      <Section title="Aparência do Menu Lateral">
        <ColorField label="Cor dos textos" value={settings.menu.text_color} onChange={(v) => upd("text_color", v)} />
        <ColorField label="Cor dos ícones" value={settings.menu.icon_color} onChange={(v) => upd("icon_color", v)} />
        <Field label={`Tamanho do logo: ${settings.menu.logo_size}px`}>
          <input type="range" min="80" max="260" value={settings.menu.logo_size} onChange={(e) => upd("logo_size", Number(e.target.value))} className="w-full" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={settings.menu.show_name} onChange={(e) => upd("show_name", e.target.checked)} /> Mostrar nome do estabelecimento no menu
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={settings.menu.fixed} onChange={(e) => upd("fixed", e.target.checked)} /> Menu fixo
        </label>
      </Section>
    </div>
  );
}

// ========== BOTÕES & CARDS ==========
function ButtonsTab({ settings, setSettings }) {
  const b = (k, v) => setSettings({ buttons: { [k]: v } });
  const c = (k, v) => setSettings({ cards: { [k]: v } });
  return (
    <div className="space-y-4 max-w-3xl">
      <Section title="Botões">
        <Field label={`Arredondamento: ${settings.buttons.radius}px`}>
          <input type="range" min="0" max="30" value={settings.buttons.radius} onChange={(e) => b("radius", Number(e.target.value))} className="w-full" />
        </Field>
        <Field label="Estilo">
          <select value={settings.buttons.style} onChange={(e) => b("style", e.target.value)} className="dl-input">
            <option value="solid">Sólido</option>
            <option value="outline">Contorno</option>
            <option value="neon">Neon</option>
          </select>
        </Field>
        <Field label="Tamanho">
          <select value={settings.buttons.size} onChange={(e) => b("size", e.target.value)} className="dl-input">
            <option value="sm">Pequeno</option>
            <option value="md">Médio</option>
            <option value="lg">Grande</option>
          </select>
        </Field>
      </Section>
      <Section title="Cards & Painéis">
        <Field label={`Arredondamento: ${settings.cards.radius}px`}>
          <input type="range" min="0" max="30" value={settings.cards.radius} onChange={(e) => c("radius", Number(e.target.value))} className="w-full" />
        </Field>
        <ColorField label="Cor da borda" value={settings.cards.border_color} onChange={(v) => c("border_color", v)} />
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={settings.cards.border} onChange={(e) => c("border", e.target.checked)} /> Mostrar borda
        </label>
        <Field label="Intensidade da sombra">
          <select value={settings.cards.shadow} onChange={(e) => c("shadow", e.target.value)} className="dl-input">
            <option value="none">Sem sombra</option>
            <option value="sm">Suave</option>
            <option value="md">Média</option>
            <option value="lg">Forte</option>
          </select>
        </Field>
      </Section>
    </div>
  );
}

// ========== PREVIEW ==========
function PreviewTab({ settings }) {
  const c = settings.colors;
  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500">Esta é uma pré-visualização em tempo real. Altere nas outras abas para ver mudanças aqui.</p>
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: c.card_bg, background: c.body_bg }}>
        <div className="flex min-h-[400px]">
          <aside className="w-56 p-4" style={{ background: c.menu_bg }}>
            <div className="font-bold mb-6" style={{ color: c.primary }}>{settings.general.menu_title}</div>
            {["Dashboard", "Vendas", "Produtos"].map((it, i) => (
              <div key={it} className={`px-3 py-2 rounded-lg mb-1 text-sm ${i === 0 ? "font-bold" : ""}`} style={{ background: i === 0 ? settings.menu.selected_bg : "transparent", color: i === 0 ? c.primary : settings.menu.text_color }}>{it}</div>
            ))}
          </aside>
          <main className="flex-1 p-6" style={{ background: c.body_bg }}>
            <h2 className="text-2xl font-bold mb-4" style={{ color: c.text_primary }}>Dashboard</h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {["Vendas", "Clientes", "Receita"].map((l) => (
                <div key={l} className="p-4 rounded-xl border" style={{ background: c.card_bg, borderColor: settings.cards.border_color, borderRadius: settings.cards.radius }}>
                  <div className="text-xs uppercase tracking-widest" style={{ color: c.text_secondary }}>{l}</div>
                  <div className="text-2xl font-bold mt-1 mono" style={{ color: c.text_primary }}>R$ 1.250</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              <button className="px-4 py-2 font-bold" style={{ background: c.button_bg, color: "#000", borderRadius: settings.buttons.radius }}>Principal</button>
              <button className="px-4 py-2 border" style={{ borderColor: c.primary, color: c.primary, borderRadius: settings.buttons.radius }}>Secundário</button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[["success", "Sucesso"], ["warning", "Alerta"], ["error", "Erro"], ["info", "Info"]].map(([k, l]) => (
                <span key={k} className="px-3 py-1 text-xs rounded-full" style={{ background: c[k] + "22", color: c[k], border: `1px solid ${c[k]}60` }}>{l}</span>
              ))}
            </div>
            <table className="w-full mt-5 text-sm" style={{ color: c.text_primary }}>
              <thead><tr style={{ color: c.text_secondary }}><th className="text-left py-2">Produto</th><th className="text-right py-2">Preço</th></tr></thead>
              <tbody>
                <tr style={{ borderTop: `1px solid ${settings.cards.border_color}` }}><td className="py-2">Cerveja Heineken</td><td className="text-right mono" style={{ color: c.primary }}>R$ 14,00</td></tr>
                <tr style={{ borderTop: `1px solid ${settings.cards.border_color}` }}><td className="py-2">Rosh Premium</td><td className="text-right mono" style={{ color: c.primary }}>R$ 80,00</td></tr>
              </tbody>
            </table>
          </main>
        </div>
      </div>
    </div>
  );
}

// ========== Shared components ==========
function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/5 p-5 space-y-3" style={{ background: "var(--dl-card-bg)" }}>
      <h3 className="font-display text-lg font-bold text-zinc-100">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-zinc-400 block mb-2">{label}</label>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange, testid }) {
  return (
    <Field label={label}>
      <div className="flex gap-2 items-center">
        <input type="color" value={value?.startsWith("#") ? value : "#000000"} onChange={(e) => onChange(e.target.value)} data-testid={testid} className="w-14 h-10 rounded-lg cursor-pointer bg-transparent border border-white/10" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="dl-input flex-1 mono text-sm" placeholder="#FFFFFF or rgba(..)" />
      </div>
    </Field>
  );
}

function ImageUpload({ label, value, onChange, testid, small }) {
  const ref = useRef(null);
  const handleFile = (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Máximo 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };
  const onDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); };
  return (
    <Field label={label}>
      <div onDragOver={(e) => e.preventDefault()} onDrop={onDrop} className="border-2 border-dashed border-white/10 rounded-xl p-4 flex items-center gap-4 hover:border-[color:var(--dl-primary)]/40 transition">
        {value ? (
          <img src={value} alt="" className={`${small ? "h-10 w-10" : "h-20 w-20"} object-contain bg-black/40 rounded-lg`} />
        ) : (
          <div className={`${small ? "h-10 w-10" : "h-20 w-20"} bg-black/40 rounded-lg flex items-center justify-center text-zinc-600`}><ImgIcon size={small ? 16 : 28} /></div>
        )}
        <div className="flex-1">
          <input type="file" accept="image/*" ref={ref} onChange={(e) => handleFile(e.target.files[0])} data-testid={testid} className="hidden" />
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => ref.current.click()} className="px-3 py-1.5 bg-[#18181D] rounded-lg text-xs flex items-center gap-1 hover:bg-white/5"><Upload size={12} /> Enviar</button>
            {value && <button onClick={() => onChange("")} className="px-3 py-1.5 bg-red-900/30 text-red-300 rounded-lg text-xs flex items-center gap-1"><Trash2 size={12} /> Remover</button>}
          </div>
          <p className="text-[10px] text-zinc-600 mt-1">Arraste e solte ou clique em Enviar · Max 2MB</p>
        </div>
      </div>
    </Field>
  );
}

// Ajustes disponíveis apenas no painel do administrador; persistidos pelo endpoint existente.
function SirenSettings({ settings, setSettings }) {
  const sirens = settings.sirens || {};
  const change = (kind, key, value) => setSettings({ sirens: { [kind]: { [key]: value } } });
  const play = async (kind, secondary = false) => {
    const c = sirens[kind] || {};
    const suffix = secondary ? 'Secondary' : '';
    const source = c[`source${suffix}`] || 'tone';
    if (source === 'voice') {
      if (!playVoiceAlert(kind, c.volume ?? 85)) toast.error('Este dispositivo não oferece voz sintetizada.');
    } else if (source === 'mp3' && c[`mp3${suffix}`]) {
      const audio = new Audio(c[`mp3${suffix}`]);
      audio.volume = Math.max(0, Math.min(1, Number(c.volume ?? 85) / 100));
      try { await audio.play(); } catch (_) { toast.error('O navegador bloqueou o áudio.'); }
    } else {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        await ctx.resume();
        playSiren(ctx, Number(c[`tone${suffix}`] || 1), Number(c.volume ?? 85));
        setTimeout(() => ctx.close().catch(() => {}), 3000);
      } catch (_) { toast.error('Não foi possível testar a sirene.'); }
    }
  };
  const loadMp3 = (kind, secondary, file) => {
    if (!file) return;
    if (!(/\.mp3$/i.test(file.name) || file.type === 'audio/mpeg')) return toast.error('Selecione um arquivo MP3.');
    if (file.size > 1024 * 1024) return toast.error('O MP3 deve ter até 1 MB para salvar nas configurações.');
    const reader = new FileReader();
    reader.onload = () => { change(kind, secondary ? 'mp3Secondary' : 'mp3', reader.result); change(kind, secondary ? 'sourceSecondary' : 'source', 'mp3'); toast.success('MP3 carregado. Clique em SALVAR ALTERAÇÕES.'); };
    reader.readAsDataURL(file);
  };
  const soundFields = (kind, c, secondary) => {
    const suffix = secondary ? 'Secondary' : '';
    return <div className="space-y-2 border border-blue-900/60 rounded-xl p-3">
      <p className="font-semibold text-amber-300">{secondary ? 'Segundo alerta (pedido não reconhecido)' : 'Primeiro alerta (pedido novo)'}</p>
      <label className="block text-sm">Origem do som
        <select className="dl-input mt-1 w-full" value={c[`source${suffix}`] || 'tone'} onChange={e => change(kind, `source${suffix}`, e.target.value)}>
          <option value="tone">Uma das 10 sirenes</option><option value="voice">11 — Voz de alerta ({kind === 'rosh' ? 'OLHA O ROSH!' : 'Ó O GORÓ!'})</option><option value="mp3">Meu arquivo MP3</option>
        </select>
      </label>
      {(c[`source${suffix}`] || 'tone') === 'voice' ? <p className="text-xs text-amber-300">Voz masculina aguda quando disponível no aparelho. A intensidade da fala depende da voz instalada; teste no computador do setor.</p> : (c[`source${suffix}`] || 'tone') === 'tone' ? <label className="block text-sm">Sirene
        <select className="dl-input mt-1 w-full" value={c[`tone${suffix}`] || 1} onChange={e => change(kind, `tone${suffix}`, Number(e.target.value))}>
          {Array.from({length: 10}, (_, i) => <option key={i} value={i + 1}>Sirene {i + 1}</option>)}
        </select>
      </label> : <label className="block text-sm">Arquivo MP3 (até 1 MB)
        <input className="block w-full mt-1 text-xs" type="file" accept=".mp3,audio/mpeg" onChange={e => loadMp3(kind, secondary, e.target.files?.[0])}/>
        <span className="text-xs text-zinc-400">{c[`mp3${suffix}`] ? 'Áudio carregado e pronto para salvar' : 'Nenhum áudio carregado'}</span>
      </label>}
      <button type="button" onClick={() => play(kind, secondary)} className="bg-blue-700 rounded-lg px-3 py-2 text-white">▶ Ouvir {secondary ? 'segundo' : 'primeiro'} alerta</button>
    </div>;
  };
  return <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
    {['bar', 'rosh'].map(kind => { const c = sirens[kind] || {}; return <section key={kind} className="bg-[#121822] border border-blue-900 rounded-2xl p-5 space-y-4">
      <h2 className="text-xl font-bold text-[#D4AF37]">Alertas sonoros — {kind === 'bar' ? 'Bar' : 'Rosh'}</h2>
      {soundFields(kind, c, false)}
      <label className="block text-sm">Modo de aviso
        <select className="dl-input mt-1 w-full" value={c.mode || 'repeat'} onChange={e => change(kind, 'mode', e.target.value)}>
          <option value="once">Tocar uma vez por pedido</option>
          <option value="repeat">Repetir o mesmo som até confirmar</option>
          <option value="escalate">Primeiro som; depois segundo som se não confirmar</option>
        </select>
      </label>
      {c.mode === 'escalate' && <>{soundFields(kind, c, true)}<label className="block text-sm">Intervalo até o segundo som (segundos)
        <input type="number" min="5" max="3600" className="dl-input mt-1 w-full" value={c.delaySeconds ?? 40} onChange={e => change(kind, 'delaySeconds', Math.max(5, Math.min(3600, Number(e.target.value) || 40)))}/>
      </label><p className="text-xs text-zinc-400">O segundo som se repete enquanto o pedido não for confirmado.</p></>}
      <label className="block text-sm">Volume do PDV: {c.volume ?? 85}% (somente ADM)
        <input className="w-full mt-2" type="range" min="0" max="100" value={c.volume ?? 85} onChange={e => change(kind, 'volume', Number(e.target.value))}/>
      </label>
    </section>; })}
    <p className="text-zinc-400 text-sm xl:col-span-2">As configurações são exclusivas do administrador. Clique em SALVAR ALTERAÇÕES. O funcionário só ativa/desativa o áudio e confirma o alerta. MP3s ficam salvos nas configurações do sistema; use arquivos curtos (até 1 MB). O volume geral do dispositivo não pode ser bloqueado pelo PDV.</p>
  </div>;
}
