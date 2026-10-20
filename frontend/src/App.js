import { NAV_ITEMS } from "./navPermissions";
import { useState } from "react";
import { Menu, X, MoreHorizontal } from "lucide-react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { Toaster } from "./components/ui/sonner";
import ConnectionBadge from "./components/ConnectionBadge";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Balcao from "./pages/Balcao";
import ProductsAdmin from "./pages/ProductsAdmin";
import PrintersAdmin from "./pages/PrintersAdmin";
import Employees from "./pages/Employees";
import BarPanel from "./pages/BarPanel";
import RoshPanel from "./pages/RoshPanel";
import CaixaPanel from "./pages/CaixaPanel";
import Reports from "./pages/Reports";
import PrintQueue from "./pages/PrintQueue";
import AuditPage from "./pages/AuditPage";
import Portaria from "./pages/Portaria";
import SuppostoGanho from "./pages/SuppostoGanho";
import SystemSettings from "./pages/SystemSettings";
import ReservasV5 from "./pages/ReservasV5";
import ComprasEstoque from "./pages/ComprasEstoque";
import ReservasPublicas from "./pages/ReservasPublicas";
import AgendaDLotus from "./pages/AgendaDLotus";
import VendasPrazo from "./pages/VendasPrazo";
import PagasFuncionarios from "./pages/PagasFuncionarios";
import { LayoutDashboard, Beer, Flame, CreditCard, Users, Settings, Printer, FileText, LogOut, ClipboardList, History, UtensilsCrossed, DoorOpen, TrendingUp, Settings2, CalendarCheck, Package, WalletCards } from "lucide-react";

const ICONS = { LayoutDashboard, Beer, Flame, CreditCard, Users, Settings, Printer, FileText, LogOut, ClipboardList, History, UtensilsCrossed, DoorOpen, TrendingUp, Settings2, CalendarCheck, Package, WalletCards };
const navItems = NAV_ITEMS.map(item => ({ ...item, icon: ICONS[item.icon] }));

function Shell({ children }) {
  const { user, logout, can } = useAuth();
  const { settings } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const logoSrc = settings.general?.logo_main || "/dlotus-logo-sm.png";
  const logoSize = settings.menu?.logo_size ?? 180;

  return (
    <div className="min-h-screen flex" style={{ background: "var(--dl-body-bg)", color: "var(--dl-text-primary)" }}>
      <aside className="hidden md:flex w-64 flex-col p-5 border-r" style={{ background: "var(--dl-menu-bg)", borderColor: "rgba(212,175,55,0.15)" }}>
        <Link to="/dashboard" className="mb-8 block" data-testid="brand-link">
          <img src={logoSrc} alt="Logo" className="mx-auto drop-shadow-[0_0_12px_rgba(56,189,248,0.3)]" style={{ maxWidth: `${logoSize}px`, width: "100%" }} />
          {settings.menu?.show_name && <p className="text-[10px] tracking-[0.3em] text-zinc-500 uppercase mt-2 text-center">PDV · {settings.general?.menu_title}</p>}
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.filter((i) => can(i.perm)).map((i) => {
            const Icon = i.icon;
            const active = location.pathname.startsWith(i.to);
            return (
              <Link
                key={i.to}
                to={i.to}
                data-testid={`nav-${i.to.slice(1)}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all border"
                style={active
                  ? { background: settings.menu?.selected_bg, color: "var(--dl-primary)", borderColor: "var(--dl-primary)" }
                  : { background: "transparent", color: settings.menu?.text_color, borderColor: "transparent" }}
              >
                <Icon size={16} style={{ color: active ? "var(--dl-primary)" : settings.menu?.icon_color }} />
                {i.label}
              </Link>
            );
          })}
        </nav>
        <div className="pt-4 border-t border-white/5">
          <div className="text-xs text-zinc-500 mb-3">
            <div className="text-zinc-200 font-medium">{user?.name}</div>
          </div>
          <button
            data-testid="logout-btn"
            onClick={() => { logout(); navigate("/login"); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition"
          >
            <LogOut size={14} /> Sair
          </button>
          <p className="text-[9px] tracking-[0.25em] text-zinc-600 uppercase mt-4 text-center">
            Desenvolvido por <span style={{ color: "var(--dl-primary, #D4AF37)" }}>D'Lotus</span>
          </p>
        </div>
      </aside>
      {mobileMenuOpen && <div className="md:hidden fixed inset-0 z-40 bg-black/70" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />}
      <aside className={`md:hidden fixed inset-y-0 left-0 z-50 w-[min(86vw,340px)] flex flex-col border-r border-white/10 bg-[#121215] shadow-2xl transition-transform duration-200 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`} aria-label="Menu principal" aria-hidden={!mobileMenuOpen}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <strong className="text-white">Menu D’Lotus</strong>
          <button type="button" aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg text-white"><X size={24}/></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navItems.filter(i => can(i.perm)).map(i => {
            const Icon = i.icon;
            const active = location.pathname.startsWith(i.to);
            return <Link key={i.to} to={i.to} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 rounded-xl px-4 py-3 min-h-[48px] text-sm ${active ? "bg-sky-500/15 text-sky-300" : "text-zinc-200 hover:bg-white/10"}`}><Icon size={20}/>{i.label}</Link>;
          })}
        </nav>
        <button type="button" onClick={() => { setMobileMenuOpen(false); logout(); navigate('/login'); }} className="flex items-center gap-3 p-5 border-t border-white/10 text-red-300"><LogOut size={20}/> Sair</button>
      </aside>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 border-b px-3 py-2 flex items-center justify-between mobile-topbar" style={{ background: "var(--dl-menu-bg)", borderColor: "rgba(212,175,55,0.15)" }}>
        <button type="button" aria-label="Abrir menu" onClick={() => setMobileMenuOpen(true)} className="p-2 text-white rounded-lg"><Menu size={24}/></button>
        <Link to="/dashboard" className="flex items-center gap-2 min-w-0"><img src={logoSrc} alt="D’Lotus" className="h-9 max-w-[120px] object-contain"/><span className="text-xs font-semibold text-zinc-200">PDV</span></Link>
        <button type="button" aria-label="Todas as funções" onClick={() => setMobileMenuOpen(true)} className="p-2 text-zinc-200 rounded-lg"><MoreHorizontal size={24}/></button>
      </div>
      <main className="flex-1 min-w-0 overflow-x-hidden pt-16 pb-24 md:pt-0 md:pb-0">
        {children}
        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#121215] border-t border-[#D4AF37]/15 flex overflow-x-auto mobile-bottom-nav">
          {navItems.filter((i) => can(i.perm)).slice(0, 5).map((i) => {
            const Icon = i.icon;
            const active = location.pathname.startsWith(i.to);
            return (
              <Link key={i.to} to={i.to} className={`flex-1 min-w-[70px] flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-[10px] ${active ? "text-[#D4AF37]" : "text-zinc-500"}`}>
                <Icon size={18} />
                {i.label}
              </Link>
            );
          })}
          <button type="button" onClick={() => setMobileMenuOpen(true)} className="flex-1 min-w-[70px] flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-[10px] text-zinc-300"><Menu size={18}/>Mais</button>
        </div>
      </main>
    </div>
  );
}

function Protected({ children }) {
  const { user, loading, can } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0A0A0C] text-[#D4AF37]">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  const onlyCompras = user.role?.toLowerCase() !== "administrador" && (user.permissions || []).length === 1 && ["estoque", "compras"].includes(user.permissions[0]);
  if (onlyCompras && location.pathname !== "/compras") return <Navigate to="/compras" replace />;
  const page = NAV_ITEMS.find(item => item.to === location.pathname);
  if (page && !can(page.perm)) return <Navigate to="/dashboard" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
      <BrowserRouter>
        <Toaster theme="dark" position="top-right" richColors />
        <ConnectionBadge />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reservar" element={<ReservasPublicas />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/balcao" element={<Protected><Balcao /></Protected>} 
          <Route path="/bar" element={<Protected><BarPanel /></Protected>} />
          <Route path="/rosh" element={<Protected><RoshPanel /></Protected>} />
          <Route path="/caixa" element={<Protected><CaixaPanel /></Protected>} />
          <Route path="/compras" element={<Protected><ComprasEstoque /></Protected>} />
          <Route path="/produtos" element={<Protected><ProductsAdmin /></Protected>} />
          <Route path="/impressoras" element={<Protected><PrintersAdmin /></Protected>} />
          <Route path="/funcionarios" element={<Protected><Employees /></Protected>} />
          <Route path="/relatorios" element={<Protected><Reports /></Protected>} />
          <Route path="/impressoes" element={<Protected><PrintQueue /></Protected>} />
          <Route path="/auditoria" element={<Protected><AuditPage /></Protected>} />
          <Route path="/portaria" element={<Protected><Portaria /></Protected>} />
          <Route path="/reservas" element={<Protected><ReservasV5 /></Protected>} />
          <Route path="/pagas-funcionarios" element={<Protected><PagasFuncionarios /></Protected>} />
          <Route path="/vendas-prazo" element={<Protected><VendasPrazo /></Protected>} />
          <Route path="/agenda" element={<Protected><AgendaDLotus /></Protected>} />
          <Route path="/suposto-ganho" element={<Protected><SuppostoGanho /></Protected>} />
          <Route path="/configuracoes" element={<Protected><SystemSettings /></Protected>} />
        </Routes>
      </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
