// ================= DifeeCult ERP · MODO DEMONSTRAÇÃO =================
// O servidor do ERP (server.js) roda aqui dentro do navegador, com o SQLite em
// JavaScript (sql.js). As chamadas a /api não saem da página: são atendidas pelo
// mesmo código do servidor de verdade. O banco fica salvo no localStorage deste
// navegador; cada pessoa que abrir a página tem a própria cópia.
(function () {
  'use strict';
  const VERSAO = window.DEMO_VERSAO || 'v1';
  const CHAVE = 'difeecult-demo-banco';
  const CHAVE_V = 'difeecult-demo-versao';
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (_) { /* sem armazenamento */ } }
  };
  const paraB64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const deB64 = (b) => { const s = atob(b); const u8 = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i); return u8; };

  // Sessões de login: o servidor guarda num Map; aqui ele sobrevive ao recarregar a aba.
  const CHAVE_SESSOES = 'difeecult-demo-sessoes';
  class Sessoes extends Map {
    constructor() {
      super();
      try { for (const [k, v] of JSON.parse(sessionStorage.getItem(CHAVE_SESSOES) || '[]')) Map.prototype.set.call(this, k, v); } catch (_) { /* aba nova */ }
    }
    _salvar() { try { sessionStorage.setItem(CHAVE_SESSOES, JSON.stringify([...this])); } catch (_) { /* sem armazenamento */ } }
    set(k, v) { super.set(k, v); this._salvar(); return this; }
    delete(k) { const r = super.delete(k); this._salvar(); return r; }
  }

  let db = null, app = null, criarRes = null, pendentes = 0, timer = null, avisouCheio = false;
  function salvarAgora() {
    if (!db) return;
    if (pendentes > 0) { agendar(); return; }
    const ok = ls.set(CHAVE, paraB64(db.export())) && ls.set(CHAVE_V, VERSAO);
    if (!ok && !avisouCheio) { avisouCheio = true; aviso('Este navegador não deixou salvar os dados: as mudanças valem até fechar a página.'); }
  }
  function agendar() { clearTimeout(timer); timer = setTimeout(salvarAgora, 600); }

  const pronto = (async () => {
    const SQL = await window.initSqlJs();
    let dados = null;
    if (ls.get(CHAVE_V) === VERSAO) { const salvo = ls.get(CHAVE); if (salvo) { try { dados = deB64(salvo); } catch (_) { dados = null; } } }
    if (!dados) dados = deB64(window.DEMO_BANCO_B64);
    db = new SQL.Database(dados);
    globalThis.__DEMO_SQL = db;
    globalThis.__DEMO_SESSOES = new Sessoes();
    globalThis.__DEMO_ALTEROU = agendar;
    const servidor = window.DemoServidor.iniciar();
    criarRes = window.DemoServidor.criarRes;
    await servidor.ready;
    app = servidor.app;
    agendar();
  })();
  pronto.catch((e) => { console.error('Falha ao iniciar a demonstração', e); aviso('Não foi possível iniciar a demonstração neste navegador.'); });

  function lerQuery(params) {
    const q = {};
    for (const [k, v] of params) { if (k in q) q[k] = [].concat(q[k], v); else q[k] = v; }
    return q;
  }
  async function lerCorpo(input, init) {
    let corpo = init.body;
    if (corpo === undefined && input instanceof Request && !['GET', 'HEAD'].includes(input.method)) corpo = await input.clone().arrayBuffer();
    if (corpo === undefined || corpo === null) return { texto: null, bruto: null };
    if (typeof corpo === 'string') return { texto: corpo, bruto: window.DemoBuffer.from(corpo, 'utf8') };
    if (corpo instanceof URLSearchParams) return { texto: corpo.toString(), bruto: window.DemoBuffer.from(corpo.toString(), 'utf8') };
    if (corpo instanceof Blob) corpo = await corpo.arrayBuffer();
    if (corpo instanceof ArrayBuffer) return { texto: null, bruto: window.DemoBuffer.from(new Uint8Array(corpo)) };
    if (ArrayBuffer.isView(corpo)) return { texto: null, bruto: window.DemoBuffer.from(new Uint8Array(corpo.buffer, corpo.byteOffset, corpo.byteLength)) };
    return { texto: String(corpo), bruto: window.DemoBuffer.from(String(corpo), 'utf8') };
  }
  const fetchReal = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    init = init || {};
    const texto = typeof input === 'string' ? input : (input && input.url) || String(input);
    const url = new URL(texto, location.href);
    const pos = url.pathname.indexOf('/api/');
    const ehApi = url.origin === location.origin && (pos >= 0 || /\/api$/.test(url.pathname));
    if (!ehApi) return fetchReal(input, init);
    await pronto;
    const caminho = pos >= 0 ? url.pathname.slice(pos) : '/api';
    const metodo = String(init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const headers = {};
    new Headers(init.headers || (input instanceof Request ? input.headers : undefined)).forEach((v, k) => { headers[k.toLowerCase()] = v; });
    const { texto: corpoTexto, bruto } = await lerCorpo(input, init);
    const req = {
      method: metodo, url: caminho + url.search, originalUrl: caminho + url.search, path: caminho, baseUrl: '',
      query: lerQuery(url.searchParams), headers, params: {}, body: undefined, _bruto: bruto,
      ip: '127.0.0.1', protocol: location.protocol.replace(':', ''), hostname: location.hostname, secure: true,
      get(n) { return this.headers[String(n).toLowerCase()]; }, header(n) { return this.get(n); }
    };
    if (corpoTexto !== null && String(headers['content-type'] || '').includes('json') && corpoTexto.trim()) {
      try { req.body = JSON.parse(corpoTexto); } catch (_) { return new Response(JSON.stringify({ error: 'JSON inválido.' }), { status: 400, headers: { 'content-type': 'application/json' } }); }
    }
    const res = criarRes();
    pendentes++;
    try { await app.handle(req, res); } finally { pendentes--; }
    if (metodo !== 'GET' && metodo !== 'HEAD') agendar();
    let corpo = res.corpo;
    if (corpo instanceof Uint8Array) corpo = new Uint8Array(corpo.buffer, corpo.byteOffset, corpo.byteLength);
    const semCorpo = res.statusCode === 204 || res.statusCode === 304 || metodo === 'HEAD';
    return new Response(semCorpo ? null : corpo, { status: res.statusCode, headers: res.headers });
  };

  // Fotos: o ERP mostra <img src="/api/fotos/ID">, que não passa pelo fetch.
  // Aqui a foto sai do banco local como blob: URL.
  const VAZIA = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  const fotos = new Map();
  window.DemoERP = {
    urlFoto(id) {
      if (fotos.has(String(id))) return fotos.get(String(id));
      if (!db) return VAZIA;
      const st = db.prepare('SELECT tipo_mime, dados FROM foto WHERE id_foto=?');
      try {
        st.bind([Number(id)]);
        if (!st.step()) return VAZIA;
        const linha = st.getAsObject();
        const url = URL.createObjectURL(new Blob([linha.dados], { type: linha.tipo_mime }));
        fotos.set(String(id), url);
        return url;
      } finally { st.free(); }
    },
    restaurar() {
      ls.del(CHAVE); ls.del(CHAVE_V);
      try { sessionStorage.clear(); } catch (_) { /* nada */ }
      location.reload();
    }
  };

  // Hospedagem comum (GitHub Pages, Netlify...): confirmações, impressão e downloads funcionam normalmente.

  function aviso(texto) {
    if (typeof window.showToast === 'function') { try { window.showToast(texto, 'error'); return; } catch (_) { /* segue */ } }
    console.info(texto);
  }

  // Selo do modo demonstração + atalhos de login.
  function montarInterface() {
    const estilo = document.createElement('style');
    estilo.textContent = `
      .demo-selo{position:fixed;right:12px;bottom:12px;z-index:40000;display:flex;align-items:center;gap:.5rem;padding:.4rem .5rem .4rem .75rem;border-radius:999px;background:#14161a;color:#fff;font:600 12px/1.2 Inter,system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.35);border:1px solid #2e323a}
      .demo-selo b{color:#ff5a66;letter-spacing:.06em}
      .demo-selo button{border:0;border-radius:999px;padding:.35rem .7rem;background:#2a2e35;color:#fff;font:inherit;cursor:pointer}
      .demo-selo button.perigo{background:#d7192a}
      .demo-login{margin-top:1rem;padding:.85rem 1rem;border:1px dashed var(--border-strong,#444);border-radius:12px;font-size:.88rem}
      .demo-login p{margin:0 0 .5rem;color:var(--text-muted,#999)}
      .demo-login .demo-contas{display:flex;flex-wrap:wrap;gap:.5rem}
      .demo-login button{flex:1 1 9rem;padding:.55rem .7rem;border-radius:10px;border:1px solid var(--border-color,#333);background:var(--hover-bg,#1b1e24);color:var(--text-main,#fff);font:inherit;cursor:pointer;text-align:left}
      .demo-login button small{display:block;color:var(--text-muted,#999);font-size:.75rem}
      @media (max-width:760px){.demo-selo{right:8px;bottom:calc(5.2rem + env(safe-area-inset-bottom));padding:.25rem .3rem .25rem .6rem;font-size:11px;opacity:.92}.demo-selo span .longo{display:none}.demo-selo button{padding:.3rem .55rem}}
      @media print{.demo-selo{display:none}}
    `;
    document.head.appendChild(estilo);
    const selo = document.createElement('div');
    selo.className = 'demo-selo no-print';
    selo.innerHTML = '<span><b>DEMO</b><span class="longo"> · dados salvos neste navegador</span></span><button type="button">Restaurar dados</button>';
    const botao = selo.querySelector('button');
    let armado = false;
    botao.addEventListener('click', () => {
      if (!armado) { armado = true; botao.textContent = 'Confirmar? Apaga as mudanças'; botao.classList.add('perigo'); setTimeout(() => { armado = false; botao.textContent = 'Restaurar dados'; botao.classList.remove('perigo'); }, 4000); return; }
      window.DemoERP.restaurar();
    });
    document.body.appendChild(selo);
    const form = document.getElementById('form-login');
    if (form && Array.isArray(window.DEMO_CONTAS)) {
      const caixa = document.createElement('div');
      caixa.className = 'demo-login';
      caixa.innerHTML = '<p>Demonstração: entre com um destes usuários.</p><div class="demo-contas">' + window.DEMO_CONTAS.map((c, i) => `<button type="button" data-demo-conta="${i}">${c.rotulo}<small>${c.login} · senha ${c.senha}</small></button>`).join('') + '</div>';
      caixa.addEventListener('click', (e) => {
        const b = e.target.closest('[data-demo-conta]');
        if (!b) return;
        const c = window.DEMO_CONTAS[Number(b.dataset.demoConta)];
        document.getElementById('login-user').value = c.login;
        document.getElementById('login-senha').value = c.senha;
        form.requestSubmit ? form.requestSubmit() : form.querySelector('[type=submit]').click();
      });
      form.appendChild(caixa);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarInterface); else montarInterface();
})();
