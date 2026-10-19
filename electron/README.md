# D'Lotus PDV — Guia de Instalação Desktop (Windows)

> **⚠️ ATUALIZAÇÃO v1.1.0 — Impressoras Windows**
> Esta versão adiciona o botão **"BUSCAR IMPRESSORAS DO WINDOWS"** e impressão silenciosa.
> **Se você já tinha o PDV instalado**, é OBRIGATÓRIO reinstalar o `.exe` desta versão
> (o botão só funciona depois do reinstall, porque exige o novo `preload.js` embarcado).
>
> 1. Desinstale o D'Lotus PDV antigo (Painel de Controle → Programas)
> 2. Rode `npm run build:win` em `/app/electron/` em um PC Windows com Node 18+
> 3. Rode o novo `D-Lotus-PDV-Setup-1.1.0.exe`
> 4. Abra o app → Impressoras → selecione **🖥 Windows (auto)** → clique no botão dourado

O sistema funciona **100% offline** no computador da D'Lotus e sincroniza automaticamente quando a internet volta. Há duas formas de instalar:

---

## OPÇÃO 1 · Instalar como aplicativo (PWA) — RECOMENDADO para começar

**Nenhuma instalação de programa necessária.** Em segundos o PDV vira um ícone na área de trabalho igual a qualquer programa do Windows.

### Passo a passo

1. Abra o **Microsoft Edge** ou o **Google Chrome** no computador da D'Lotus
2. Acesse: `https://lotus-pdv-bar.preview.emergentagent.com`
3. Faça login com `admin / admin`
4. No canto superior direito da barra de endereço, clique no ícone **"Instalar app"** (ou ⋮ → "Instalar D'Lotus PDV")
5. Pronto! O PDV abre em uma janela própria, sem barra de endereço, igual a um programa nativo
6. Um atalho na **área de trabalho** e no **menu Iniciar** é criado automaticamente

### Benefícios imediatos
- Abre direto no PDV, sem passar pelo navegador
- Fica listado em "Programas e Recursos" do Windows
- Funciona offline (vendas, portaria, etc.)
- Atualiza automaticamente quando sai nova versão

---

## OPÇÃO 2 · Gerar um instalador `.exe` completo (Electron)

Útil se quiser distribuir um instalador tradicional `.exe` para vários computadores da casa. Requer um PC com **Windows + Node.js 18+** para gerar.

### Em um PC Windows

```bash
# 1. Baixe Node.js: https://nodejs.org/
# 2. Abra PowerShell e vá para a pasta do projeto
cd electron

# 3. Instale as dependências do Electron (apenas na primeira vez)
npm install

# 4. (Opcional) Testar o app Electron
npm start

# 5. Gerar o instalador .exe
npm run build:win
```

O instalador aparece em `electron/dist/D-Lotus-PDV-Setup-1.1.0.exe` — basta duplo-clicar para instalar em qualquer PC Windows da D'Lotus.

### O que o instalador gera
- **D-Lotus-PDV-Setup-1.1.0.exe** — Instalador NSIS tradicional (cria atalhos, desinstalador, pode escolher pasta)
- **D-Lotus-PDV-1.1.0.exe** — Versão portátil (não precisa instalar, basta copiar)

### Personalização
- **Ícone**: substitua `/app/electron/icon.ico` (256x256 recomendado)
- **URL do servidor**: edite `APP_URL` em `/app/electron/main.js` ou defina a env `DLOTUS_APP_URL` antes de abrir

---

## Como funciona o Offline-First

### Com internet 🟢
```
PDV Desktop ↔ Banco local (cache) ↔ Banco online (MongoDB)
```
Tudo funciona em tempo real, dados aparecem no dashboard na hora.

### Sem internet 🟠
```
PDV Desktop ↔ Banco local (cache + fila de sincronização)
```
Vendas, entradas da portaria, cliente, abertura/fechamento de caixa, mudança de status de pedido — tudo continua funcionando. Cada operação ganha um **UUID único** gerado no cliente e vai para uma **fila local** no `localStorage` do navegador/Electron.

### Internet volta 🔵
A fila é enviada automaticamente ao servidor. Como cada operação carrega o `id` gerado offline, o backend **detecta duplicatas** e retorna o registro já existente — zero duplicação.

Também há tentativa periódica a cada **30 segundos** e detecção automática no evento `online` do navegador.

### Estados visíveis no badge superior direito
| Badge | Significado |
|---|---|
| 🟢 **ONLINE** | Conectado e sincronizado |
| 🟠 **OFFLINE** | Sem internet, operando localmente |
| 🔵 **SINCRONIZANDO** | Enviando fila ao servidor |
| 🟡 **PENDENTE N** | N operações aguardando sync |
| 🔴 **ERRO SYNC** | Alguma operação não foi aceita pelo servidor (ver detalhes clicando no badge) |

Clique no badge para ver:
- Fila pendente, com erro, sincronizados nesta sessão
- Horário da última sincronização
- Botão **"Sincronizar Agora"** para forçar envio manual

---

## Operações que funcionam offline

✅ Criar comanda (mesa ou venda rápida)
✅ Adicionar itens a uma comanda
✅ Mudar status do item (produção/entregue)
✅ Fechar comanda / registrar pagamento
✅ Cobrar entrada da portaria (homem/mulher)
✅ Cadastrar cliente
✅ Consultar dados que foram vistos antes (cache)

### Operações que exigem internet
❌ Login (apenas na primeira vez; sessão fica salva por 12h)
❌ Dashboard / relatórios em tempo real do dia (dados estão no servidor)
❌ Cadastrar/alterar produtos, impressoras e funcionários (requer sincronia imediata)
❌ Abrir/fechar caixa da portaria (operações críticas que exigem confirmação do servidor)

---

## Segurança do banco local

- Dados offline ficam em `localStorage` (navegador) ou no profile do Electron
- Protegidos pela **conta Windows do usuário** — outro usuário Windows no mesmo PC não vê os dados
- Token JWT expira em **12 horas** — passado esse prazo, exige novo login
- Toda sincronização é registrada no log de **Auditoria** do servidor com usuário, data e horário
- `localStorage.clear()` do navegador apaga a fila local — a fila deve estar vazia (badge verde) antes de limpar

---

## Backup e Recuperação

### Backup do banco online (MongoDB)
Rotina já configurada no servidor. Dados jamais são deletados — apenas marcados como `cancelled` ou `inactive`.

### Backup da fila local (caso o PC quebre antes da sync)
Em casos extremos, se o PC do PDV quebrar com fila pendente:
1. Antes de reinstalar o Windows, copie a pasta `%APPDATA%\D'Lotus PDV\` (ou `%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Local Storage\` se PWA)
2. Em outro PC, cole no mesmo local
3. Abra o PDV — a fila será sincronizada

Para operações mais críticas, considere ativar o backup automático em nuvem (Google Drive / OneDrive) da pasta de perfil do app.

---

## Problemas comuns

**"OFFLINE" mesmo com internet funcionando?**
- Verifique se o servidor `lotus-pdv-bar.preview.emergentagent.com` responde no navegador
- Faça logout e login novamente

**Fila com N "ERRO SYNC"?**
- Clique no badge → "Sincronizar Agora"
- Se persistir, abra o Console (Ctrl+Shift+I no Electron) e veja o erro — geralmente é conflito de regra (ex.: mesa já ocupada por outro operador que estava online)

**Instalação PWA não aparece no Edge/Chrome?**
- A opção aparece apenas em **HTTPS** (nosso domínio já é HTTPS)
- Em Edge: barra de endereço → ícone de monitor com seta
- Em Chrome: ⋮ → "Instalar D'Lotus PDV"

---

## Arquitetura técnica

```
┌─────────────────────────────────────────────────┐
│  D'LOTUS PDV DESKTOP (Electron ou PWA)          │
│  ┌──────────────────────────────────────────┐   │
│  │  React UI (balcão, portaria, dashboard)  │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │  Camada Offline  (src/lib/offline.js)    │   │
│  │  • Cache GET em localStorage             │   │
│  │  • Fila de writes com UUID cliente       │   │
│  │  • Auto-sync 30s + evento 'online'       │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                       ↕ HTTPS
┌─────────────────────────────────────────────────┐
│  BACKEND FastAPI + MongoDB                      │
│  • Aceita `id` do cliente → idempotência        │
│  • Retorna registro existente se duplicado      │
│  • Log de auditoria em todas as operações       │
└─────────────────────────────────────────────────┘
```

### Idempotência
Toda operação de criação (`POST /api/orders`, `POST /api/portaria/entries`, etc.) aceita um campo opcional `id` enviado pelo cliente. Se o servidor já tem esse `id`, retorna o registro existente em vez de criar um novo — isso elimina 100% das duplicatas, mesmo se a mesma operação for enviada 10 vezes.

### Conflitos
Regra atual: **o servidor sempre vence** em caso de conflito (ex.: mesa já ocupada quando a sync tenta criar comanda). O erro fica visível no badge, e o usuário é alertado para resolver manualmente. Operações normais (criar venda em venda rápida, entrada de portaria) não geram conflito.

---

Em caso de dúvida, abra o aplicativo e clique no **badge de conexão** no canto superior direito.
