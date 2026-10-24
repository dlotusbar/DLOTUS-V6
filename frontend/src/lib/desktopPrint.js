// Utilitário para impressão silenciosa via Electron (desktop)
// No navegador comum, as funções retornam null / false.

export const isDesktop = () => typeof window !== "undefined" && !!window.dlotus?.isDesktop;

export async function listWindowsPrinters() {
  if (!isDesktop()) {
    return { ok: false, error: "Disponível apenas no app desktop (Windows)", printers: [] };
  }
  try {
    return await window.dlotus.listPrinters();
  } catch (e) {
    return { ok: false, error: String(e), printers: [] };
  }
}

// ----- Helpers -----
const brl = (v) => "R$ " + (Number(v || 0)).toFixed(2).replace(".", ",");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtDate = (iso) => {
  try {
    const d = iso ? new Date(iso) : new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch (_) { return ""; }
};

// Monta HTML limpo com estilos INLINE (não depende de Tailwind nem CSS externo).
// Formato: 80mm de largura, fonte monoespaçada 11pt, negrito escuro.
export function buildReceiptHtml(order) {
  if (!order) return "";
  const items = (order.items || []).filter((i) => i.status !== "cancelled");
  const total = Number(order.total || items.reduce((s, i) => s + Number(i.subtotal || 0), 0));
  const payments = order.payments || [];
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const dinheiro = payments.find((p) => p.method === "dinheiro");
  const troco = Math.max(0, totalPaid - total);
  const shortId = (order.id || "").slice(0, 8).toUpperCase();

  const row = (left, right, bold) =>
    `<div style="display:flex;justify-content:space-between;align-items:flex-start;${bold ? "font-weight:900;font-size:13pt;" : ""}"><span style="padding-right:4px;">${left}</span><span style="white-space:nowrap;${bold ? "font-weight:900;" : ""}">${right}</span></div>`;

  const divider = `<div style="border-top:1px dashed #000;margin:4px 0;height:1px;"></div>`;
  const dividerThick = `<div style="border-top:2px dashed #000;margin:4px 0;height:2px;"></div>`;

  const itemsHtml = items.map((it) => `
    <div style="margin-bottom:3px;">
      ${row(`${it.quantity}x ${esc(it.product_name)}`, brl(it.subtotal))}
      <div style="font-size:9pt;color:#000;padding-left:8px;">unit ${brl(it.unit_price)}</div>
    </div>
  `).join("");

  const paymentsHtml = payments.map((p) =>
    row(esc(String(p.method || "").toUpperCase()), brl(p.amount))
  ).join("");

  const trocoBlock = (dinheiro && totalPaid > total) ? `
    <div style="margin-top:2px;padding-top:2px;border-top:1px solid #000;">
      ${row("Recebido", brl(totalPaid))}
      ${row("TROCO", brl(troco), true)}
    </div>
  ` : "";

  return `
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Via</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    background: #fff; color: #000;
    font-family: 'Courier New', Consolas, monospace;
    font-size: 11pt;
    font-weight: 700;
    line-height: 1.3;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body { padding: 4px; width: 100%; }
  .center { text-align: center; }
  .title { font-size: 14pt; font-weight: 900; letter-spacing: 1px; }
  .sub { font-size: 10pt; text-transform: uppercase; letter-spacing: 2px; margin-top: 2px; }
  .section-label { font-size: 9pt; text-transform: uppercase; letter-spacing: 1px; font-weight: 900; margin-bottom: 2px; }
  .total { font-size: 14pt; font-weight: 900; display:flex; justify-content:space-between; }
  .thanks { text-align: center; font-size: 9pt; text-transform: uppercase; letter-spacing: 2px; margin-top: 6px; }
  @media print {
    @page { margin: 0; }
    body { padding: 2px; }
  }
</style>
</head>
<body>
  <div class="center">
    <div class="title">D'LOTUS LOUNGE BAR</div>
    <div class="sub">Via da Venda · Caixa</div>
  </div>
  ${divider}
  ${row("Pedido:", "#" + esc(shortId))}
  ${row("Local:", esc(order.table_label || "Venda Rápida"))}
  ${row("Data:", fmtDate(order.closed_at || order.created_at))}
  ${divider}
  <div class="section-label">Itens</div>
  ${itemsHtml}
  ${dividerThick}
  <div class="total">
    <span>TOTAL</span><span>${brl(total)}</span>
  </div>
  ${divider}
  <div class="section-label">Pagamento</div>
  ${paymentsHtml}
  ${trocoBlock}
  <div class="thanks">* Obrigado! Volte sempre *</div>
  <div style="height:30px;"></div>
</body>
</html>`.trim();
}

// Imprime silenciosamente o cupom na impressora Windows
// opts: { printerName, order }
export async function silentPrintReceipt(printerName, order) {
  if (!isDesktop()) return { ok: false, error: "não é desktop" };
  if (!printerName) return { ok: false, error: "impressora não informada" };
  if (!order) return { ok: false, error: "pedido não informado" };
  const html = buildReceiptHtml(order);
  try {
    return await window.dlotus.silentPrint({ printerName, html });
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ---------- Fechamento de caixa (Caixa 1/2 ou Portaria) ----------
export function buildCashCloseHtml(report, opts = {}) {
  if (!report) return "";
  const title = opts.title || "FECHAMENTO DE CAIXA";
  const sub = opts.subtitle || (report.cashier_name || "");
  const totals = report.sales_by_method || { dinheiro: 0, pix: 0, credito: 0, debito: 0 };
  const row = (left, right, bold, big) =>
    `<div style="display:flex;justify-content:space-between;align-items:flex-start;${bold ? "font-weight:900;" : ""}${big ? "font-size:14pt;" : ""}"><span style="padding-right:4px;">${left}</span><span style="white-space:nowrap;${bold ? "font-weight:900;" : ""}">${right}</span></div>`;
  const divider = `<div style="border-top:1px dashed #000;margin:4px 0;height:1px;"></div>`;
  const dividerThick = `<div style="border-top:2px dashed #000;margin:5px 0;height:2px;"></div>`;

  const payRows = Object.entries(totals).map(([k, v]) => row(esc(k.toUpperCase()), brl(v))).join("");
  const detail = report.detalhamento_precos;
  const priceRows = detail ? [["mulher", "MULHERES"], ["homem", "HOMENS"]].map(([sexo, label]) => {
    const items = detail[sexo] || [];
    const subtotal = items.reduce((s, item) => s + Number(item.total || 0), 0);
    return `<div class="lbl">${label}</div>` +
      items.map(item => row(`${Number(item.quantidade)} x ${brl(item.preco)}`, brl(item.total))).join("") +
      row(`SUBTOTAL ${label}`, brl(subtotal), true) + divider;
  }).join("") : "";

  const diffBlock = report.counted ? `
    ${divider}
    <div style="font-size:9pt;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Conferência Contagem</div>
    ${Object.entries(report.counted).map(([k, v]) => {
      const esperado = Number((report.expected || {})[k] || 0);
      const contado = Number(v || 0);
      const diff = contado - esperado;
      return `<div style="font-size:9pt;">${esc(k.toUpperCase())}: esp ${brl(esperado)} / ct ${brl(contado)} / dif ${brl(diff)}</div>`;
    }).join("")}
  ` : "";

  return `
<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Fechamento</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body{background:#fff;color:#000;width:80mm;max-width:80mm;font-family:'Courier New',Consolas,monospace;font-size:11pt;font-weight:700;line-height:1.3;}
  body{padding:2mm;width:80mm;max-width:80mm;overflow-wrap:anywhere;}
  .c{text-align:center;}
  .title{font-size:14pt;font-weight:900;letter-spacing:1px;}
  .sub{font-size:10pt;text-transform:uppercase;letter-spacing:2px;margin-top:2px;}
  .lbl{font-size:9pt;text-transform:uppercase;letter-spacing:1px;font-weight:900;margin-bottom:2px;}
  @media print{@page{size:80mm auto;margin:0;}html,body{width:80mm;max-width:80mm;}body{padding:2mm;}}
</style></head><body>
  <div class="c">
    <div class="title">D'LOTUS LOUNGE BAR</div>
    <div class="sub">${esc(title)}</div>
    ${sub ? `<div class="sub" style="color:#000;">${esc(sub)}</div>` : ""}
  </div>
  ${divider}
  ${row("Abertura:", fmtDate(report.opened_at))}
  ${report.closed_at ? row("Fechamento:", fmtDate(report.closed_at)) : ""}
  ${report.opened_by_name ? row("Aberto por:", esc(report.opened_by_name)) : ""}
  ${report.closed_by_name ? row("Fechado por:", esc(report.closed_by_name)) : ""}
  ${divider}
  <div class="lbl">Movimentação</div>
  ${report.orders_count !== undefined ? row("Vendas", String(report.orders_count)) : ""}
  ${report.items_sold !== undefined ? row("Itens vendidos", String(report.items_sold)) : ""}
  ${report.total_pessoas !== undefined ? row("Total pessoas", String(report.total_pessoas)) : ""}
  ${report.homens !== undefined ? row("Homens", String(report.homens)) : ""}
  ${report.mulheres !== undefined ? row("Mulheres", String(report.mulheres)) : ""}
  ${divider}
  ${priceRows}
  <div class="lbl">Pagamentos</div>
  ${payRows}
  ${divider}
  ${row("Troco inicial", brl(report.initial_change || 0))}
  ${report.sangrias_total !== undefined ? row("Sangrias", "- " + brl(report.sangrias_total)) : ""}
  ${(report.sangrias || []).map(s => row(s.reason || "Sangria", "- " + brl(s.amount))).join("")}
  ${report.expected_cash !== undefined ? row("Dinheiro esperado", brl(report.expected_cash), true) : ""}
  ${diffBlock}
  ${dividerThick}
  ${row("TOTAL VENDAS", brl(report.total_sales || report.total || 0), true, true)}
  ${divider}
  <div class="c" style="font-size:9pt;letter-spacing:2px;margin-top:6px;">* FIM DO RELATÓRIO *</div>
  <div style="height:40px;"></div>
</body></html>`.trim();
}

export async function silentPrintCashClose(printerName, report, opts = {}) {
  if (!isDesktop()) return { ok: false, error: "não é desktop" };
  if (!printerName) return { ok: false, error: "impressora não informada" };
  const html = buildCashCloseHtml(report, opts);
  try { return await window.dlotus.silentPrint({ printerName, html, copies: 1, paperWidthMm: 80 }); }
  catch (e) { return { ok: false, error: String(e) }; }
}

// Dado /api/printers, acha a primeira impressora "caixa" ativa com nome windows
export function pickCaixaPrinter(printers) {
  const list = Array.isArray(printers) ? printers : [];
  return list.find((p) => p.kind === "caixa" && p.active && p.connection_type === "windows" && p.windows_printer_name)
      || list.find((p) => p.kind === "caixa" && p.active)
      || null;
}

// Imprime um cupom de teste (não depende de order)
export async function silentPrintTest(printerName) {
  if (!isDesktop()) return { ok: false, error: "não é desktop" };
  if (!printerName) return { ok: false, error: "impressora não informada" };
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box;color:#000;}
  html,body{background:#fff;}
  body{font-family:'Courier New',Consolas,monospace;font-weight:900;font-size:13pt;line-height:1.4;padding:8px;width:100%;}
  .c{text-align:center;}
  .big{font-size:18pt;font-weight:900;letter-spacing:2px;}
  .md{font-size:14pt;font-weight:900;}
  .dash{border-top:2px dashed #000;margin:6px 0;height:0;}
  .box{border:2px solid #000;padding:6px;margin:6px 0;text-align:center;font-weight:900;}
</style></head><body>
<div class="c big">D'LOTUS PDV</div>
<div class="c md">TESTE DE IMPRESSAO</div>
<div class="dash"></div>
<div><b>Impressora:</b></div>
<div>${esc(printerName)}</div>
<div class="dash"></div>
<div><b>Data/Hora:</b> ${dateStr}</div>
<div class="dash"></div>
<div class="box">IMPRESSAO<br/>FUNCIONANDO OK</div>
<div class="c">Se voce esta lendo isso,</div>
<div class="c">a comunicacao esta 100%!</div>
<div class="dash"></div>
<div class="c" style="font-size:9pt;">v1.1.3 — ${dateStr}</div>
<div style="height:40px;"></div>
</body></html>`;
  try {
    return await window.dlotus.silentPrint({ printerName, html });
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

