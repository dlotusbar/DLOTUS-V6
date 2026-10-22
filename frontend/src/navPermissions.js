// Menu e permissões: adicione uma nova aba aqui para aparecer automaticamente em Funcionários.
export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", perm: "dashboard" },
  { to: "/suposto-ganho", label: "Suposto Ganho", icon: "TrendingUp", perm: "suposto_ganho" },
  { to: "/caixa", label: "Caixa", icon: "CreditCard", perm: "caixa" },
  { to: "/balcao", label: "Balcão", icon: "ClipboardList", perm: "venda" },
  { to: "/portaria", label: "Portaria", icon: "DoorOpen", perm: "portaria" },
  { to: "/reservas", label: "Reservas", icon: "CalendarCheck", perm: "reservas" },
  { to: "/pagas-funcionarios", label: "Pagas Funcionários", icon: "WalletCards", perm: "pagas_funcionarios" },
  { to: "/vendas-prazo", label: "Vendas a Prazo", icon: "WalletCards", perm: "vendas_prazo" },
  { to: "/agenda", label: "Agenda", icon: "CalendarCheck", perm: "agenda" },
  { to: "/assistente-ia", label: "D’Lotus IA", icon: "Bot", perm: "dashboard" },
  { to: "/bar", label: "Bar", icon: "Beer", perm: "bar" },
  { to: "/rosh", label: "Rosh", icon: "Flame", perm: "rosh" },
  { to: "/compras", label: "Estoque / Compras", icon: "Package", perm: "compras" },
  { to: "/produtos", label: "Produtos", icon: "UtensilsCrossed", perm: "produtos" },
  { to: "/impressoras", label: "Impressoras", icon: "Printer", perm: "impressoras" },
  { to: "/funcionarios", label: "Funcionários", icon: "Users", perm: "funcionarios" },
  { to: "/relatorios", label: "Relatórios", icon: "FileText", perm: "relatorios" },
  { to: "/auditoria", label: "Auditoria", icon: "History", perm: "auditoria" },
  { to: "/configuracoes", label: "Configurações", icon: "Settings2", perm: "configuracoes" },
];
export const EXTRA_PERMISSIONS = ["mesas", "venda_rapida", "fechamento", "portaria_caixa", "portaria_config"];
export const ALL_PERMISSIONS = [...new Set([...NAV_ITEMS.map(i => i.perm), ...EXTRA_PERMISSIONS])];
