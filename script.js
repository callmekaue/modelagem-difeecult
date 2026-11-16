// Usa o mesmo endereço que serviu a página; isso permite acesso por outro PC da rede.
const API_URL = '/api';
let relatorioVendasState = [];
let relatorioProdutosState = [];
// Quantidades digitadas na tela de estoque para lançar em lote: id do produto -> quantidade.
const loteEstoque = new Map();
let relatorioCaixaState = [];

// Todas as chamadas à API usam o token da sessão atual.
const fetchOriginal = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const token = sessionStorage.getItem('erpToken') || '';
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetchOriginal(input, { ...init, headers });
};
let syncTimer = null;

// A sessão fica isolada por aba para permitir testar dois usuários no mesmo
// navegador. A autorização definitiva continua sendo feita pelo servidor.
// Escapa texto antes de colocá-lo em innerHTML (usada por quase todas as telas).
function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function setSessionUser(user) {
  if (!user) return;
  const nomeOperador = document.getElementById('nomeOperador');
  if (nomeOperador) {
    const nome = escapeHtml(user.nome || '');
    const departamento = escapeHtml(user.departamento || '');
    nomeOperador.innerHTML = `${nome}<br><span class="operador-depto">${departamento}</span>`;
  }
  const avatar = document.getElementById('operador-avatar');
  if (avatar) avatar.textContent = String(user.nome || '?').trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
  sessionStorage.setItem('erpUsuarioLogado', JSON.stringify(user));
  if (user.token) sessionStorage.setItem('erpToken', user.token);
}

function clearSessionUser() {
  sessionStorage.removeItem('erpUsuarioLogado');
  sessionStorage.removeItem('erpToken');
  const nomeOperador = document.getElementById('nomeOperador');
  if (nomeOperador) nomeOperador.innerHTML = '';
}

function getUsuarioAtual() {
  const usuarioSalvo = sessionStorage.getItem('erpUsuarioLogado');
  if (!usuarioSalvo) return null;

  try {
    return JSON.parse(usuarioSalvo);
  } catch (error) {
    return null;
  }
}

function getHeadersComUsuario(extra = {}) {
  const user = getUsuarioAtual();
  return {
    'Content-Type': 'application/json',
    'Authorization': user?.token ? `Bearer ${user.token}` : '',
    ...extra
  };
}

function isAdminMaster(user = getUsuarioAtual()) {
  if (!user) return false;
  return user.admin === true || user.login === 'admin' || (user.departamento || '').toLowerCase() === 'diretoria';
}

// ================= PERMISSÕES POR TELA =================
// O servidor confere tudo de novo; aqui a tela só mostra o que o usuário pode usar.
// `pode('estoque')` = pode ver; `pode('estoque', 'editar')` = pode alterar.
function pode(tela, nivel = 'ver', user = getUsuarioAtual()) {
  if (!user) return false;
  if (isAdminMaster(user)) return true;
  const atual = user.permissoes?.[tela];
  return nivel === 'editar' ? atual === 'editar' : atual === 'ver' || atual === 'editar';
}
const telaDaAba = (aba) => String(aba || '').replace(/^tab-/, '');
function podeAbrirAba(aba) { return aba === 'tab-usuarios' ? isAdminMaster() : pode(telaDaAba(aba)); }
// Telas com formulários e botões de alteração: sem "editar", ficam só para leitura.
const ABAS_COM_EDICAO = ['tab-caixa', 'tab-estoque', 'tab-precos', 'tab-movimentar', 'tab-eventos', 'tab-contas', 'tab-recebimentos', 'tab-clt', 'tab-fornecedores', 'tab-descontos', 'tab-parametros'];

function aplicarPermissoes() {
  // A interface mostra só o que o usuário pode usar; as rotas do server.js
  // repetem essa validação para impedir acesso por requisição manual.
  document.querySelectorAll('#sidebar .sidebar-btn').forEach((botao) => {
    const alvo = /'(tab-[a-z-]+)'/.exec(botao.getAttribute('onclick') || '');
    if (alvo) botao.style.display = podeAbrirAba(alvo[1]) ? '' : 'none';
  });
  // Grupo sem nenhuma tela liberada some inteiro (título incluído).
  document.querySelectorAll('.menu-grupo').forEach((grupo) => {
    grupo.style.display = [...grupo.querySelectorAll('.sidebar-btn')].some((b) => b.style.display !== 'none') ? '' : 'none';
  });
  document.querySelectorAll('.nav-inferior-btn[data-aba]').forEach((botao) => { botao.hidden = !podeAbrirAba(botao.dataset.aba); });
  document.querySelectorAll('.tab-content').forEach((aba) => {
    if (!podeAbrirAba(aba.id)) { aba.classList.remove('active'); aba.style.display = 'none'; }
    aba.classList.toggle('somente-leitura', ABAS_COM_EDICAO.includes(aba.id) && !pode(telaDaAba(aba.id), 'editar'));
  });
  document.querySelectorAll('[data-acao="nova-venda"]').forEach((botao) => { botao.hidden = !pode('vendas'); });
  // Se a tela aberta deixou de ser permitida, abre a primeira liberada (PDV de preferência).
  const aberta = document.querySelector('.tab-content.active');
  if (!aberta || !podeAbrirAba(aberta.id)) {
    const ordem = ['tab-dashboard', 'tab-vendas', ...[...document.querySelectorAll('#sidebar .sidebar-btn')].map((b) => (/'(tab-[a-z-]+)'/.exec(b.getAttribute('onclick') || '') || [])[1]).filter(Boolean)];
    const primeira = (isAdminMaster() ? ordem : ['tab-vendas', ...ordem]).find((aba) => podeAbrirAba(aba));
    if (primeira) openTab(null, primeira);
    else document.getElementById('sem-acesso')?.removeAttribute('hidden');
  }
  if (document.querySelector('.tab-content.active')) document.getElementById('sem-acesso')?.setAttribute('hidden', '');
}

// Busca as permissões atuais no servidor (o administrador pode mudá-las com o
// usuário logado) e reaplica a tela quando algo mudou.
let permissoesAssinatura = '';
async function atualizarPermissoesDoServidor() {
  const user = getUsuarioAtual();
  if (!user?.token) return;
  try {
    const resposta = await fetch(`${API_URL}/me`, { headers: getHeadersComUsuario() });
    if (!resposta.ok) return;
    const atual = await resposta.json();
    const assinatura = JSON.stringify([atual.admin, atual.permissoes]);
    if (assinatura === permissoesAssinatura) return;
    const mudou = permissoesAssinatura !== '';
    permissoesAssinatura = assinatura;
    setSessionUser({ ...user, ...atual, token: user.token });
    aplicarPermissoes();
    if (mudou) { showToast('Suas permissões foram atualizadas pelo administrador.'); carregarTudo(); }
  } catch (_) { /* tenta de novo no próximo ciclo */ }
}

function startRealtimeSync() {
  // Atualiza dados compartilhados periodicamente para manter abas abertas
  // sincronizadas sem exigir que o usuário recarregue a página.
  if (syncTimer) clearInterval(syncTimer);
  permissoesAssinatura = '';
  atualizarPermissoesDoServidor();
  let ciclos = 0;
  syncTimer = setInterval(() => {
    ciclos += 1;
    if (ciclos % 4 === 0) atualizarPermissoesDoServidor();
    const appScreen = document.getElementById('appScreen');
    if (appScreen && !appScreen.classList.contains('hidden')) {
      carregarTudo();
    }
  }, 3000);
}

function stopRealtimeSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

window.addEventListener('storage', (event) => {
  if (event.key === 'erp-sync-trigger') {
    const appScreen = document.getElementById('appScreen');
    if (appScreen && !appScreen.classList.contains('hidden')) {
      carregarTudo();
    }
  }
});

function triggerSync() {
  localStorage.setItem('erp-sync-trigger', String(Date.now()));
}

function restoreSession() {
  const usuarioSalvo = sessionStorage.getItem('erpUsuarioLogado');
  if (!usuarioSalvo || !sessionStorage.getItem('erpToken')) return false;

  try {
    const user = JSON.parse(usuarioSalvo);
    setSessionUser(user);

    const appScreen = document.getElementById('appScreen');
    const loginScreen = document.getElementById('loginScreen');

    // Sem `style.display = 'flex'`: o display inline venceria a regra
    // `.app-layout { display: block }` das telas estreitas e o menu lateral
    // espremeria o conteúdo. A classe alone já controla a visibilidade.
    if (appScreen) appScreen.classList.remove('hidden');

    if (loginScreen) loginScreen.style.display = 'none';

    aplicarPermissoes();
    startRealtimeSync();
    carregarTudo();
    return true;
  } catch (err) {
    clearSessionUser();
    return false;
  }
}

// O usuário comum conversa somente com admin. O admin escolhe qual usuário
// responder, mantendo uma conversa independente para cada login.
// ================= SISTEMA DE NOTIFICAÇÕES ANIMADAS (TOAST) =================
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; align-items: flex-end;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#f59e0b');
    const corTexto = bgColor === '#f59e0b' ? '#2f1d00' : 'white';
    
    toast.style.cssText = `
        background-color: ${bgColor}; color: ${corTexto}; padding: 15px 25px; border-radius: 8px;
        margin-bottom: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); font-weight: 600; font-size: 0.95rem;
        opacity: 0; transform: translateX(100%); transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        display: flex; align-items: center; gap: 10px;
    `;
    
    toast.textContent = String(message);
    container.appendChild(toast);
    
    // Animação de Entrada
    setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(0)'; }, 10);
    
    // Animação de Saída automática
    setTimeout(() => {
        toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// ================= NAVEGAÇÃO E LOGIN =================
function openTab(evt, tabName) {
  // Somente uma seção fica visível por vez; a anterior é ocultada antes de
  // ativar a escolhida. Vale para o menu, os atalhos, a paleta e os cartões.
  const tab = document.getElementById(tabName);
  if (!tab) return;
  if (getUsuarioAtual() && !podeAbrirAba(tabName)) { showToast('Você não tem acesso a esta área.', 'error'); return; }
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.remove('active');
    content.style.display = 'none';
  });
  tab.classList.add('active');
  tab.style.display = 'block';
  // Destaca no menu a entrada da aba aberta, venha o clique de onde vier.
  document.querySelectorAll('.sidebar-btn').forEach((botao) => {
    const alvo = /'(tab-[a-z-]+)'/.exec(botao.getAttribute('onclick') || '');
    botao.classList.toggle('active', Boolean(alvo) && alvo[1] === tabName);
  });
  atualizarTopbar(tabName);
  fecharMenuMovel();
  document.body.dataset.aba = tabName;
  atualizarNavInferior(tabName);
  if (tabName === 'tab-historico-produtos') carregarHistoricoProdutos(true);
  if (tabName === 'tab-log') carregarLogAtividades(true);
  if (tabName === 'tab-clt') carregarFolhaClt(true);
  if (tabName === 'tab-precos') carregarPrecos(true);
  if (tabName === 'tab-movimentar') atualizarFormularioMovimentar();
  if (tabName === 'tab-parametros') carregarTabelasCltParametros();
  if (tabName === 'tab-relatorios') renderizarRelatorios(true);
  if (tabName === 'tab-vendas') carregarEventosHoje(true);
  if (tabName === 'tab-eventos') { eventosAssinatura = ''; carregarEventos(); }
  // Aba de vendas: antes de começar a venda, pergunta se o cliente quer CPF na nota.
  if (tabName === 'tab-vendas') {
    atualizarBarraCpf();
    if (!cpfVenda || !cpfVenda.respondido) perguntarCpfNota();
  } else {
    fecharDialogo('modal-cpf-nota');
    fecharDialogo('modal-confirmar-venda');
  }

  // SEGREDO DO TEMPO REAL: Atualiza os dados toda vez que o usuário clica em uma aba
  if (document.getElementById('appScreen').style.display !== 'none') {
      carregarTudo();
  }
}

// ================= TEMA CLARO / ESCURO =================
// O escuro é o padrão. A escolha fica no navegador (localStorage "erp-tema") e o
// <head> do index.html aplica o tema antes da página aparecer, sem "piscada".
const CHAVE_TEMA = 'erp-tema';
let temporizadorTema = null;
let temaAntesDeImprimir = null;

function prefereMenosMovimento() {
  return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function temaAtual() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function atualizarBotoesTema() {
  const claro = temaAtual() === 'light';
  const rotulo = claro ? 'Ativar modo escuro' : 'Ativar modo claro';
  document.querySelectorAll('[data-tema-toggle]').forEach((botao) => {
    botao.setAttribute('aria-label', rotulo);
    botao.title = rotulo;
  });
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', claro ? '#f2f2f4' : '#0a0a0b');
}

function aplicarTema(tema, { salvar = true } = {}) {
  const novo = tema === 'light' ? 'light' : 'dark';
  const raiz = document.documentElement;
  if (!prefereMenosMovimento()) {
    raiz.classList.add('tema-transicao');
    clearTimeout(temporizadorTema);
    temporizadorTema = setTimeout(() => raiz.classList.remove('tema-transicao'), 400);
  }
  raiz.setAttribute('data-theme', novo);
  if (salvar) {
    try { localStorage.setItem(CHAVE_TEMA, novo); } catch (_) { /* navegação privada: vale só nesta sessão */ }
  }
  atualizarBotoesTema();
}

document.querySelectorAll('[data-tema-toggle]').forEach((botao) => {
  botao.addEventListener('click', () => aplicarTema(temaAtual() === 'light' ? 'dark' : 'light'));
});
// Outra aba mudou o tema: acompanha sem gravar de novo.
window.addEventListener('storage', (evento) => {
  if (evento.key === CHAVE_TEMA) aplicarTema(evento.newValue === 'light' ? 'light' : 'dark', { salvar: false });
});
// Papel é branco: imprime sempre no tema claro e depois volta ao que estava.
window.addEventListener('beforeprint', () => {
  if (temaAtual() === 'dark') { temaAntesDeImprimir = 'dark'; document.documentElement.setAttribute('data-theme', 'light'); }
});
window.addEventListener('afterprint', () => {
  if (temaAntesDeImprimir) { document.documentElement.setAttribute('data-theme', temaAntesDeImprimir); temaAntesDeImprimir = null; }
});
atualizarBotoesTema();

// ================= TRANSIÇÃO DE ENTRADA COM O NOME DA EMPRESA =================
// Cobre a tela depois do login enquanto os dados carregam por trás. Dura cerca de
// 2s, pode ser pulada com clique, Enter, Espaço ou Esc, e fica curta para quem
// prefere menos movimento. Não aparece ao recarregar a página com sessão aberta.
function iniciarIntroEmpresa(user) {
  const intro = document.getElementById('intro-empresa');
  if (!intro) return { pronta: Promise.resolve(), pulada: new Promise(() => {}), fechar() {} };
  const reduzir = prefereMenosMovimento();
  const primeiroNome = String(user?.nome || '').trim().split(/\s+/)[0];
  intro.querySelector('[data-intro-texto]').textContent = primeiroNome ? `Bem-vindo(a), ${primeiroNome}` : 'Bem-vindo(a)';
  intro.classList.remove('hidden', 'saindo', 'ativa');
  void intro.offsetWidth; // reinicia as animações a cada login
  intro.classList.add('ativa');

  const inicio = Date.now();
  let encerrada = false;
  let liberar = () => {};
  let marcarPulada = () => {};
  const pulada = new Promise((resolve) => { marcarPulada = resolve; });
  const pronta = new Promise((resolve) => {
    const limite = setTimeout(resolve, reduzir ? 700 : 2000);
    liberar = () => { clearTimeout(limite); resolve(); };
  });
  const pular = (evento) => {
    if (Date.now() - inicio < 400) return; // ignora o Enter que acabou de enviar o login
    if (evento.type === 'keydown' && !['Escape', 'Enter', ' '].includes(evento.key)) return;
    liberar();
    marcarPulada();
  };
  intro.addEventListener('click', pular);
  document.addEventListener('keydown', pular);

  function fechar() {
    if (encerrada) return;
    encerrada = true;
    intro.removeEventListener('click', pular);
    document.removeEventListener('keydown', pular);
    intro.classList.add('saindo');
    setTimeout(() => {
      intro.classList.remove('ativa', 'saindo');
      intro.classList.add('hidden');
    }, reduzir ? 200 : 500);
  }
  return { pronta, pulada, fechar };
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const login = document.getElementById('login-user').value;
  const senha = document.getElementById('login-senha').value;
  const errorMsg = document.getElementById('loginError');

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, senha })
    });
    
    if (res.ok) {
      const user = await res.json();
      setSessionUser(user);
      // A transição cobre a tela inteira antes de o login sumir, então não há corte.
      const intro = iniciarIntroEmpresa(user);
      document.getElementById('loginScreen').style.display = 'none';
      
      const appScreen = document.getElementById('appScreen');
      // Ver comentário em restoreSession: nada de display inline em appScreen.
      appScreen.classList.remove('hidden');

      aplicarPermissoes();
      startRealtimeSync();
      try {
        // Os dados carregam por trás da transição, que dura no mínimo cerca de 2s.
        // Com internet lenta ela espera no máximo 6s pelos dados (eles seguem
        // carregando por trás), e o clique sempre pula na hora.
        const dadosProntos = Promise.race([carregarTudo(), new Promise((resolve) => setTimeout(resolve, 6000))]);
        await Promise.race([Promise.all([dadosProntos, intro.pronta]), intro.pulada]);
      } finally {
        intro.fechar();
      }
      triggerSync();
      showToast(`Bem-vindo(a), ${user.nome}!`, 'success');
    } else { 
      errorMsg.textContent = "Usuário ou senha incorretos!";
      errorMsg.classList.remove('hidden');
    }
  } catch (err) { 
      errorMsg.textContent = "Erro de conexão com o banco de dados.";
      errorMsg.classList.remove('hidden');
  }
});

window.addEventListener('DOMContentLoaded', () => {
  restoreSession();
});

function logout() {
  clearSessionUser();
  stopRealtimeSync();
  const appScreen = document.getElementById('appScreen');
  if (appScreen) appScreen.classList.add('hidden');
  const loginScreen = document.getElementById('loginScreen');
  if (loginScreen) loginScreen.style.display = 'flex';
  document.getElementById('intro-empresa')?.classList.add('hidden');
  fecharPaleta(false);
  fecharMenuMovel();
  localStorage.removeItem('erp-sync-trigger');
}

// ================= CARREGAMENTO GERAL =================
async function carregarTudo() {
  // Todas as operações que alteram dados chamam esta função para atualizar
  // Dashboard, tabelas, estoque e Caixa.
  const tbodyUsuarios = document.getElementById('tabela-usuarios');
  if (isAdminMaster() && tbodyUsuarios) {
    await carregarUsuarios();
  }

  const tbodyEstoque = document.getElementById('tabela-estoque');
  if (tbodyEstoque) {
    await carregarProdutos();
    await carregarCores();
    await carregarCategoriasProduto();
    await carregarModelos();
    if (pode('estoque') || pode('movimentar')) await carregarMovimentacoes();
  }

  // Cada bloco só carrega o que o usuário pode ver (o servidor recusa o resto).
  const veVendas = pode('caixa') || pode('dashboard') || pode('relatorios');
  if (veVendas && document.getElementById('tabela-vendas')) await carregarVendas();
  if (veVendas && document.getElementById('tabela-caixa')) await carregarCaixa();
  if (pode('caixa') && document.getElementById('tabela-vendas-canceladas')) await carregarVendasCanceladas();

  // Contas a pagar e a receber são só do administrador (o servidor também recusa os demais).
  const tbodyContas = document.getElementById('tabela-contas');
  if (pode('contas') && tbodyContas) {
    await carregarContas();
    await carregarContasFixas();
  }

  if (pode('recebimentos') && document.getElementById('tabela-recebimentos')) await carregarRecebimentos();
  if ((pode('fornecedores') || pode('contas')) && document.getElementById('tabela-fornecedores')) await carregarFornecedores();
  if (pode('clt') && abaAberta('tab-clt')) await carregarFolhaClt();
  if (pode('precos') && abaAberta('tab-precos')) await carregarPrecos();
  if (pode('movimentar') && document.getElementById('tabela-movimentar-recentes')) await carregarMovimentarRecentes();
  if (pode('historico-produtos') && abaAberta('tab-historico-produtos')) await carregarHistoricoProdutos();
  if (pode('log') && abaAberta('tab-log')) await carregarLogAtividades();
  if (document.getElementById('tabela-descontos')) await carregarDescontos();
  if (document.getElementById('lista-parametros')) await carregarParametros();
  if ((pode('eventos') || pode('dashboard')) && document.getElementById('evento-calendario')) await carregarEventos();
  if (pode('vendas') || pode('movimentar')) carregarEventosHoje();
  if ((pode('contas') || pode('recebimentos')) && document.getElementById('fin-receber-pendente')) await carregarIndicadoresFinanceiros();
  if (pode('dashboard') && document.getElementById('dash-grid')) await carregarDashboard();
  atualizarAvisosEstoque();
}

// ================= RECUPERACAO DE ACESSO (secao 9.3) =================
function alternarFormularioRecuperacao(mostrar) {
  document.getElementById('form-login').classList.toggle('hidden', mostrar);
  document.getElementById('form-recuperacao').classList.toggle('hidden', !mostrar);
  document.getElementById('recuperacaoMensagem').classList.add('hidden');
}
document.getElementById('abrir-recuperacao').addEventListener('click', () => alternarFormularioRecuperacao(true));
document.getElementById('cancelar-recuperacao').addEventListener('click', () => alternarFormularioRecuperacao(false));
document.getElementById('form-recuperacao').addEventListener('submit', async (event) => {
  event.preventDefault();
  const mensagem = document.getElementById('recuperacaoMensagem');
  const mostrar = (texto, erro) => {
    mensagem.textContent = texto;
    mensagem.classList.toggle('msg-error', erro);
    mensagem.classList.remove('hidden');
  };
  const resposta = await fetch(`${API_URL}/recuperar-acesso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login: document.getElementById('recuperacao-login').value,
      chave_recuperacao: document.getElementById('recuperacao-chave').value,
      nova_senha: document.getElementById('recuperacao-senha').value
    })
  });
  const resultado = await resposta.json();
  if (!resposta.ok) return mostrar(resultado.error || 'Não foi possível redefinir a senha.', true);
  mostrar(resultado.mensagem, false);
  document.getElementById('recuperacao-chave').value = '';
  document.getElementById('recuperacao-senha').value = '';
  document.getElementById('login-user').value = document.getElementById('recuperacao-login').value;
  setTimeout(() => alternarFormularioRecuperacao(false), 2500);
});

// ================= CAIXA =================
async function carregarCaixa() {
  const res = await fetch(`${API_URL}/caixa`);
  const registros = await res.json();
  if (!res.ok) {
    showToast(registros.error || 'Não foi possível carregar os recebimentos do caixa.', 'error');
    return;
  }
  relatorioCaixaState = registros;
  const tabela = document.getElementById('tabela-caixa');
  tabela.innerHTML = '';

  const totais = {
    Dinheiro: 0,
    Cartão: 0,
    Pix: 0,
    Crédito: 0
  };

  registros.forEach(item => {
    const forma = item.forma_pagamento || 'Dinheiro';
    if (totais[forma] !== undefined) {
      totais[forma] += Number(item.valor || 0);
    } else {
      totais.Dinheiro += Number(item.valor || 0);
    }

    tabela.innerHTML += `
      <tr>
        <td>${(item.data_pagamento || new Date().toISOString().split('T')[0]).split('-').reverse().join('/')}</td>
        <td>${forma}</td>
        <td>R$ ${(Number(item.valor || 0)).toFixed(2)}</td>
        <td><span class="badge badge-pago">${item.status || 'Pago'}</span></td>
      </tr>
    `;
  });

  const totalGeral = Object.values(totais).reduce((soma, valor) => soma + valor, 0);
  const totalEletronico = (totais.Cartão || 0) + (totais.Pix || 0) + (totais.Crédito || 0);

  document.getElementById('caixa-total-geral').textContent = `R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  document.getElementById('caixa-dinheiro').textContent = `R$ ${(totais.Dinheiro || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  document.getElementById('caixa-eletronico').textContent = `R$ ${totalEletronico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  renderizarRelatorioCaixa();
}

function estadoPagamentoLabel(estado) { return ({ aguardando: 'Aguardando confirmação', aprovado: 'Pago / Confirmado', recusado: 'Recusado', cancelado: 'Cancelado', resultado_desconhecido: 'Revisar / Divergência' })[estado] || 'Estado desconhecido'; }


// O banco grava carimbo ISO com ou sem fuso; normaliza para a leitura local.
// Forma de pagamento da venda: no diversificado, mostra as partes embaixo.
function htmlFormaVenda(v, tagNota = 'small') {
  if (v.forma_pagamento === 'Diversificado') return `Diversificado${v.forma_pagamento_detalhe ? `<${tagNota} class="cell-note">${escapeHtml(v.forma_pagamento_detalhe)}</${tagNota}>` : ''}`;
  return `${escapeHtml(v.forma_pagamento || 'Dinheiro')}${Number(v.parcelas || 1) > 1 ? ` <small>${v.parcelas}x</small>` : ''}`;
}
function formatarDataHora(valor) {
  if (!valor) return '-';
  const data = new Date(String(valor).includes('T') || String(valor).endsWith('Z') ? valor : `${String(valor).replace(' ', 'T')}Z`);
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function configurarPagamentoManual() {
  const forma = document.getElementById('venda-pagamento');
  const parcelasGrupo = document.getElementById('venda-parcelas-grupo');
  const detalheGrupo = document.getElementById('venda-forma-detalhe-grupo');
  const orientacao = document.getElementById('venda-pagamento-orientacao');
  const atualizar = () => {
    const ehCredito = ['Cartão crédito', 'Crédito'].includes(forma.value);
    const ehOutro = forma.value === 'Outro';
    const dividido = forma.value === 'Diversificado';
    parcelasGrupo.classList.toggle('hidden', !ehCredito);
    detalheGrupo.classList.toggle('hidden', !ehOutro);
    document.getElementById('pdv-divisao').classList.toggle('hidden', !dividido);
    if (dividido && !document.querySelector('#pdv-divisao-linhas .pdv-divisao-linha')) iniciarDivisao();
    if (dividido) atualizarDivisao();
    orientacao.textContent = dividido
      ? 'Receba cada parte antes de finalizar: ao finalizar, cada forma entra no caixa com o seu valor.'
      : forma.value === 'Dinheiro'
        ? 'Ao finalizar, a venda é confirmada e o valor entra no caixa.'
        : 'Receba o valor antes de finalizar: ao finalizar, a venda é confirmada e o valor entra no caixa.';
  };
  forma.addEventListener('change', atualizar);
  atualizar();
}

// ---- Pagamento diversificado: o total dividido em várias formas ----
const FORMAS_DIVISAO_PDV = [['Cartão crédito', 'Crédito'], ['Pix', 'Pix'], ['Dinheiro', 'Dinheiro'], ['Cartão débito', 'Débito'], ['Transferência', 'Transferência']];
const totalDaVenda = () => Math.round((Number(document.getElementById('venda-total')?.value) || 0) * 100);
function linhasDivisao() { return [...document.querySelectorAll('#pdv-divisao-linhas .pdv-divisao-linha')]; }
function lerDivisao() {
  return linhasDivisao().map((l) => ({ forma: l.querySelector('[data-div="forma"]').value, valor: l.querySelector('[data-div="valor"]').value, parcelas: Number(l.querySelector('[data-div="parcelas"]').value) || 1 }));
}
function criarLinhaDivisao(forma, valor = '') {
  const linha = document.createElement('div');
  linha.className = 'pdv-divisao-linha';
  linha.innerHTML = `<select data-div="forma" aria-label="Forma de pagamento">${FORMAS_DIVISAO_PDV.map(([v, r]) => `<option value="${v}" ${v === forma ? 'selected' : ''}>${r}</option>`).join('')}</select>
    <label class="pdv-divisao-valor"><span>R$</span><input type="number" data-div="valor" min="0" step="0.01" inputmode="decimal" placeholder="0,00" aria-label="Valor nesta forma" value="${valor}"></label>
    <select data-div="parcelas" aria-label="Parcelas do crédito">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}x</option>`).join('')}</select>
    <button type="button" class="pdv-divisao-remover" data-div="remover" aria-label="Tirar esta forma">×</button>`;
  return linha;
}
function proximaFormaLivre() {
  const usadas = new Set(lerDivisao().map((p) => p.forma));
  return (FORMAS_DIVISAO_PDV.find(([v]) => !usadas.has(v)) || FORMAS_DIVISAO_PDV[0])[0];
}
function iniciarDivisao() {
  const caixa = document.getElementById('pdv-divisao-linhas');
  caixa.replaceChildren(criarLinhaDivisao('Cartão crédito'), criarLinhaDivisao('Pix'));
  atualizarDivisao();
}
function limparDivisao() { document.getElementById('pdv-divisao-linhas').replaceChildren(); }
// Situação: quanto falta, quanto passou ou se fechou o total.
function situacaoDivisao() {
  const partes = lerDivisao();
  const soma = partes.reduce((t, p) => t + Math.round((Number(p.valor) || 0) * 100), 0);
  const total = totalDaVenda();
  return { partes, soma, total, falta: total - soma };
}
function atualizarDivisao() {
  const linhas = linhasDivisao();
  linhas.forEach((l) => {
    const credito = l.querySelector('[data-div="forma"]').value === 'Cartão crédito';
    l.querySelector('[data-div="parcelas"]').hidden = !credito;
    l.querySelector('[data-div="remover"]').hidden = linhas.length <= 2;
    l.classList.toggle('com-parcelas', credito);
  });
  const repetidas = new Set(lerDivisao().map((p) => p.forma)).size !== linhas.length;
  const { falta, total } = situacaoDivisao();
  const status = document.getElementById('pdv-divisao-status');
  status.className = 'pdv-divisao-status';
  if (!total) { status.textContent = 'Adicione produtos para dividir o valor.'; return; }
  if (repetidas) { status.textContent = 'Há uma forma repetida: junte os valores numa linha só.'; status.classList.add('erro'); return; }
  if (falta === 0) { status.textContent = `✓ Fechou ${formatarMoeda(total / 100)}`; status.classList.add('ok'); }
  else if (falta > 0) { status.textContent = `Falta ${formatarMoeda(falta / 100)}`; status.classList.add('falta'); }
  else { status.textContent = `Passou ${formatarMoeda(-falta / 100)} do total`; status.classList.add('erro'); }
  document.getElementById('pdv-divisao-adicionar').hidden = linhas.length >= FORMAS_DIVISAO_PDV.length;
}
function erroDivisao() {
  const { partes, falta } = situacaoDivisao();
  const preenchidas = partes.filter((p) => Number(p.valor) > 0);
  if (preenchidas.length < 2) return 'No pagamento diversificado, coloque valor em pelo menos duas formas.';
  if (new Set(preenchidas.map((p) => p.forma)).size !== preenchidas.length) return 'Há uma forma repetida no pagamento diversificado.';
  if (falta > 0) return `Ainda falta ${formatarMoeda(falta / 100)} para fechar o total.`;
  if (falta < 0) return `As formas passaram ${formatarMoeda(-falta / 100)} do total da venda.`;
  return '';
}
const textoDivisao = () => lerDivisao().filter((p) => Number(p.valor) > 0).map((p) => `${(FORMAS_DIVISAO_PDV.find(([v]) => v === p.forma) || [, p.forma])[1]} ${formatarMoeda(Number(p.valor))}${p.forma === 'Cartão crédito' && p.parcelas > 1 ? ` (${p.parcelas}x)` : ''}`).join(' + ');
document.getElementById('pdv-divisao-linhas').addEventListener('input', atualizarDivisao);
// Ao entrar num valor já preenchido (ex.: o que faltava), o texto fica selecionado para digitar por cima.
document.getElementById('pdv-divisao-linhas').addEventListener('focusin', (e) => { if (e.target.dataset.div === 'valor') e.target.select(); });
document.getElementById('pdv-divisao-linhas').addEventListener('change', (e) => {
  // Preencheu uma forma e só sobrou uma vazia: ela recebe o que falta.
  if (e.target.dataset.div === 'valor') {
    const vazias = linhasDivisao().filter((l) => !l.querySelector('[data-div="valor"]').value);
    const { falta } = situacaoDivisao();
    if (vazias.length === 1 && falta > 0) vazias[0].querySelector('[data-div="valor"]').value = (falta / 100).toFixed(2);
  }
  atualizarDivisao();
});
document.getElementById('pdv-divisao-linhas').addEventListener('click', (e) => {
  if (e.target.closest('[data-div="remover"]') && linhasDivisao().length > 2) { e.target.closest('.pdv-divisao-linha').remove(); atualizarDivisao(); }
});
document.getElementById('pdv-divisao-adicionar').addEventListener('click', () => {
  const { falta } = situacaoDivisao();
  const linha = criarLinhaDivisao(proximaFormaLivre(), falta > 0 ? (falta / 100).toFixed(2) : '');
  document.getElementById('pdv-divisao-linhas').appendChild(linha);
  atualizarDivisao();
  linha.querySelector('[data-div="valor"]').focus();
});

configurarPagamentoManual();

// ================= PARAMETROS DO SISTEMA =================
// Tela em categorias (Vendas e caixa, Estoque, Financeiro, Folha CLT). Liga/desliga
// salva na hora; número tem − e +, e "Salvar / Desfazer" só aparecem quando muda.
// A lista é atualizada a cada 3 s junto com o resto do sistema, mas só é redesenhada
// quando o servidor mudou algum valor, devolvendo o que a pessoa já digitou.
let parametrosState = [];
let parametrosAssinatura = '';
let parametroCategoria = 'vendas';
const rotuloValorParametro = (parametro, valor) => (parametro.tipo === 'booleano' ? (String(valor) === 'true' ? 'Ligado' : 'Desligado') : `${valor}${parametro.unidade ? ` ${parametro.unidade}` : ''}`);
// O que o valor escolhido faz, em português do dia a dia.
const EFEITO_PARAMETRO = {
  permitir_estoque_negativo: (v) => (v === 'true' ? 'O caixa vende mesmo sem peça no estoque; o saldo pode ficar negativo.' : 'O caixa não consegue vender mais do que há no estoque.'),
  brinde_quantidade_minima: (v) => (Number(v) === 0 ? 'Brinde desligado: o caixa não pergunta.' : `Vendas com ${v} ou mais peças perguntam se o cliente ganhou brinde.`),
  estoque_minimo_aviso: (v) => (Number(v) === 0 ? 'Avisa só quando o produto esgota.' : `Produtos com ${v} un. ou menos aparecem como "acabando".`),
  dias_vencimento_proximo: (v) => `Contas que vencem nos próximos ${v} ${Number(v) === 1 ? 'dia' : 'dias'} aparecem como "vencendo".`,
  clt_encargos_patronais_percentual: (v) => (Number(v) === 0 ? 'Custo do funcionário = salário + benefícios (sem encargos da empresa).' : `Custo do funcionário = salário + benefícios + ${v}% de encargos da empresa.`),
};
// Confirmação antes de ligar opções que podem bagunçar o estoque.
const CONFIRMAR_PARAMETRO = { permitir_estoque_negativo: 'Ligar "Vender mesmo sem estoque"? O saldo dos produtos poderá ficar negativo.' };

function valorDoCampoParametro(campo) { return campo.type === 'checkbox' ? String(campo.checked) : String(campo.value).trim(); }

function htmlItemParametro(parametro) {
  const chave = escapeHtml(parametro.chave);
  const padrao = rotuloValorParametro(parametro, parametro.padrao);
  const efeito = EFEITO_PARAMETRO[parametro.chave]?.(parametro.valor) || '';
  const estado = parametro.alterado && parametro.valor !== parametro.padrao
    ? `<span class="param-estado alterado">Alterado · padrão: ${escapeHtml(padrao)}<button type="button" class="link-botao-inline" data-param-padrao="${chave}">Voltar ao padrão</button></span>`
    : '<span class="param-estado">Padrão do sistema</span>';
  const controle = parametro.tipo === 'booleano'
    ? `<label class="param-switch" for="parametro-${chave}">
        <input type="checkbox" role="switch" id="parametro-${chave}" data-parametro="${chave}"${parametro.valor === 'true' ? ' checked' : ''}>
        <span class="param-trilho" aria-hidden="true"><i></i></span>
        <span class="param-switch-rotulo">${parametro.valor === 'true' ? 'Ligado' : 'Desligado'}</span>
      </label>`
    : `<div class="param-numero">
        <div class="pdv-stepper param-stepper">
          <button type="button" data-param-passo="-1" aria-label="Diminuir">−</button>
          <input type="number" inputmode="numeric" min="${parametro.minimo ?? 0}" max="${parametro.maximo ?? 365}" step="1" id="parametro-${chave}" data-parametro="${chave}" value="${escapeHtml(parametro.valor)}" aria-label="${escapeHtml(parametro.rotulo)}">
          <button type="button" data-param-passo="1" aria-label="Aumentar">+</button>
        </div>
        ${parametro.unidade ? `<span class="param-unidade">${escapeHtml(parametro.unidade)}</span>` : ''}
      </div>
      <small class="param-limites">de ${parametro.minimo} a ${parametro.maximo}</small>
      <div class="param-acoes parametro-pendente" hidden>
        <button type="button" class="btn btn-sm btn-accent" data-param-salvar="${chave}">Salvar</button>
        <button type="button" class="btn btn-sm btn-secondary" data-param-desfazer="${chave}">Desfazer</button>
      </div>`;
  return `<div class="param-item${parametro.alterado && parametro.valor !== parametro.padrao ? ' alterado' : ''}" data-item-parametro="${chave}">
      <div class="param-texto">
        <strong class="param-rotulo">${escapeHtml(parametro.rotulo)}</strong>
        <p class="param-desc">${escapeHtml(parametro.descricao)}</p>
        <p class="param-efeito" data-param-efeito="${chave}">${escapeHtml(efeito)}</p>
        ${estado}
      </div>
      <div class="param-controle">${controle}</div>
    </div>`;
}
function htmlParametros(categoria) {
  const itens = parametrosState.filter((p) => p.categoria === categoria);
  return itens.length ? itens.map(htmlItemParametro).join('') : '<p class="field-help">Nenhum ajuste nesta categoria.</p>';
}

// Mostra "Salvar / Desfazer" e o efeito do valor digitado enquanto ele difere do salvo.
function marcarParametrosPendentes() {
  document.querySelectorAll('#lista-parametros [data-parametro]').forEach((campo) => {
    const guardado = parametrosState.find((item) => item.chave === campo.dataset.parametro);
    if (!guardado) return;
    const valor = valorDoCampoParametro(campo);
    const pendente = valor !== String(guardado.valor);
    const item = campo.closest('.param-item');
    const acoes = item?.querySelector('.parametro-pendente');
    if (acoes && acoes.hidden === pendente) acoes.hidden = !pendente;
    item?.classList.toggle('pendente', pendente);
    const efeito = item?.querySelector('[data-param-efeito]');
    const texto = EFEITO_PARAMETRO[guardado.chave]?.(valor) || '';
    if (efeito && efeito.textContent !== texto) efeito.textContent = texto;
  });
}

function renderizarParametros(container) {
  const campos = () => [...container.querySelectorAll('input[type="number"][data-parametro]')];
  const digitado = new Map(campos().filter((el) => el.value !== el.defaultValue).map((el) => [el.dataset.parametro, el.value]));
  const ativo = document.activeElement && container.contains(document.activeElement) ? document.activeElement.dataset.parametro : null;
  container.querySelectorAll('[data-param-lista]').forEach((lista) => { lista.innerHTML = htmlParametros(lista.dataset.paramLista); });
  campos().forEach((el) => { if (digitado.has(el.dataset.parametro)) el.value = digitado.get(el.dataset.parametro); });
  marcarParametrosPendentes();
  if (ativo) document.getElementById(`parametro-${ativo}`)?.focus();
  // Contador de ajustes alterados em cada aba
  document.querySelectorAll('[data-param-categoria]').forEach((aba) => {
    const alterados = parametrosState.filter((p) => p.categoria === aba.dataset.paramCategoria && p.alterado && p.valor !== p.padrao).length;
    let marca = aba.querySelector('.param-marca');
    if (alterados && !marca) { marca = document.createElement('span'); marca.className = 'param-marca'; aba.appendChild(marca); }
    if (marca) { if (alterados) marca.textContent = alterados; else marca.remove(); }
  });
}

async function carregarParametros() {
  const container = document.getElementById('lista-parametros');
  if (!container) return;
  const resposta = await fetch(`${API_URL}/parametros`);
  if (!resposta.ok) return;
  const recebidos = await resposta.json();
  if (!Array.isArray(recebidos)) return;
  parametrosState = recebidos;
  const assinatura = JSON.stringify(recebidos);
  if (assinatura !== parametrosAssinatura) {
    parametrosAssinatura = assinatura;
    renderizarParametros(container);
  }
}

async function salvarParametro(chave, valorForcado) {
  const campo = document.getElementById(`parametro-${chave}`);
  const status = document.getElementById('parametros-status');
  if (!campo) return;
  const parametro = parametrosState.find((item) => item.chave === chave) || { rotulo: chave, tipo: 'inteiro' };
  const valor = valorForcado ?? valorDoCampoParametro(campo);
  if (parametro.tipo === 'inteiro') {
    const n = Number(valor);
    if (!Number.isInteger(n) || n < parametro.minimo || n > parametro.maximo) {
      showToast(`${parametro.rotulo}: use um número inteiro de ${parametro.minimo} a ${parametro.maximo}.`, 'error');
      campo.focus();
      return;
    }
  }
  if (parametro.tipo === 'booleano' && valor === 'true' && CONFIRMAR_PARAMETRO[chave] && !confirm(CONFIRMAR_PARAMETRO[chave])) {
    campo.checked = false;
    return;
  }
  const item = campo.closest('.param-item');
  item?.classList.add('salvando');
  try {
    const resposta = await fetch(`${API_URL}/parametros/${encodeURIComponent(chave)}`, { method: 'PUT', headers: getHeadersComUsuario(), body: JSON.stringify({ valor }) });
    const resultado = await resposta.json();
    if (!resposta.ok) {
      const mensagem = resultado.error || 'Não foi possível salvar o parâmetro.';
      if (status) status.textContent = mensagem;
      showToast(mensagem, 'error');
      if (campo.type === 'checkbox') campo.checked = String(parametro.valor) === 'true';
      return;
    }
    const mensagem = `${parametro.rotulo}: ${rotuloValorParametro(parametro, valor)}.`;
    if (status) status.textContent = mensagem;
    showToast(mensagem);
    if (campo.type === 'number') campo.defaultValue = valor;
    await carregarParametros();
    atualizarAvisosEstoque(); // o limite do Quadro de avisos passa a valer na hora
  } catch (_) {
    showToast('Erro ao conectar com o servidor.', 'error');
  } finally {
    item?.classList.remove('salvando');
  }
}

function mostrarCategoriaParametros(categoria) {
  parametroCategoria = ['vendas', 'estoque', 'financeiro', 'clt', 'empresa'].includes(categoria) ? categoria : 'vendas';
  if (parametroCategoria === 'empresa') setTimeout(carregarEmpresa, 0);
  document.querySelectorAll('[data-param-categoria]').forEach((b) => { const ativo = b.dataset.paramCategoria === parametroCategoria; b.classList.toggle('ativa', ativo); b.setAttribute('aria-selected', String(ativo)); });
  document.querySelectorAll('[data-param-painel]').forEach((p) => { p.hidden = p.dataset.paramPainel !== parametroCategoria; });
  salvarPreferencia('erp-parametros-categoria', parametroCategoria);
}

const listaParametros = document.getElementById('lista-parametros');
if (listaParametros) {
  document.querySelectorAll('[data-param-categoria]').forEach((b) => b.addEventListener('click', () => mostrarCategoriaParametros(b.dataset.paramCategoria)));
  mostrarCategoriaParametros(lerPreferencia('erp-parametros-categoria', 'vendas'));
  listaParametros.addEventListener('input', marcarParametrosPendentes);
  listaParametros.addEventListener('change', (evento) => {
    // Liga/desliga salva na hora.
    if (evento.target.matches('input[type="checkbox"][data-parametro]')) salvarParametro(evento.target.dataset.parametro);
    else marcarParametrosPendentes();
  });
  listaParametros.addEventListener('click', (evento) => {
    const passo = evento.target.closest('[data-param-passo]');
    if (passo) {
      const campo = passo.parentElement.querySelector('input');
      const novo = Math.min(Number(campo.max), Math.max(Number(campo.min), (Number(campo.value) || 0) + Number(passo.dataset.paramPasso)));
      campo.value = novo;
      marcarParametrosPendentes();
      return;
    }
    const salvar = evento.target.closest('[data-param-salvar]');
    if (salvar) { salvarParametro(salvar.dataset.paramSalvar); return; }
    const desfazer = evento.target.closest('[data-param-desfazer]');
    if (desfazer) {
      const guardado = parametrosState.find((p) => p.chave === desfazer.dataset.paramDesfazer);
      const campo = document.getElementById(`parametro-${desfazer.dataset.paramDesfazer}`);
      if (guardado && campo) { campo.value = guardado.valor; marcarParametrosPendentes(); }
      return;
    }
    const padrao = evento.target.closest('[data-param-padrao]');
    if (padrao) {
      const guardado = parametrosState.find((p) => p.chave === padrao.dataset.paramPadrao);
      if (guardado) salvarParametro(guardado.chave, guardado.padrao);
    }
  });
  listaParametros.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter' && evento.target.matches('input[type="number"][data-parametro]')) { evento.preventDefault(); salvarParametro(evento.target.dataset.parametro); }
    if (evento.key === 'Escape' && evento.target.matches('input[type="number"][data-parametro]')) { evento.target.closest('.param-item')?.querySelector('[data-param-desfazer]')?.click(); }
  });
}

// ================= EVENTOS: AGENDA DA LOJA + VENDAS DO EVENTO =================
// Calendário do mês, lista (próximos, do mês, passados), destaque do evento de
// hoje ou do próximo, e o detalhe com o resultado das vendas feitas no evento.
// No PDV, quando há evento hoje, o caixa escolhe "Loja" ou o evento.
let eventosState = [];
let eventoMesAtual = null;
let eventoFiltro = 'proximos'; // 'proximos' | 'mes' | 'passados' | 'AAAA-MM-DD' (um dia do calendário)
let eventoDetalheId = null;
let eventosHoje = [];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
// Tipos de evento: lista editável que vem do servidor (/api/tipos-evento).
let TIPOS_EVENTO = {
  encontro: { nome: 'Encontro de carros', cor: '#e8212e' },
  corrida: { nome: 'Corrida / track day', cor: '#3b82f6' },
  feira: { nome: 'Feira / exposição', cor: '#f59e0b' },
  promocao: { nome: 'Promoção', cor: '#22c55e' },
  lancamento: { nome: 'Lançamento', cor: '#a855f7' },
  outro: { nome: 'Outro', cor: '#94a3b8' },
};
let tiposEventoState = [];
let coresTipoEvento = ['#e8212e', '#f97316', '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#94a3b8'];
const tipoEvento = (e) => TIPOS_EVENTO[e?.tipo] || TIPOS_EVENTO.outro || { nome: 'Evento', cor: '#94a3b8' };

function mesISOde(ano, mesNumero) { return `${ano}-${String(mesNumero).padStart(2, '0')}`; }
// 'AAAA-MM' + dia em 'AAAA-MM-DD' sem passar por UTC (evita pular de dia).
function dataISOde(mes, dia) { return `${mes}-${String(dia).padStart(2, '0')}`; }
function diaDaSemanaISO(iso) { return new Date(`${iso}T12:00:00`).getDay(); }
function diasNoMes(ano, mesNumero) { return new Date(ano, mesNumero, 0).getDate(); }
function rotuloMesEvento(mes) { const [ano, m] = mes.split('-').map(Number); return `${NOMES_MESES[m - 1]} ${ano}`; }
const fimEvento = (e) => e.data_fim || e.data;
function diaSomado(iso, n) { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
const eventoNoDia = (e, iso) => e.data <= iso && iso <= fimEvento(e);
function situacaoEvento(e) { const hoje = hojeNaLoja(); if (eventoNoDia(e, hoje)) return 'agora'; return e.data > hoje ? 'futuro' : 'passado'; }
function diasAteEvento(e) { return Math.round((new Date(`${e.data}T12:00:00Z`) - new Date(`${hojeNaLoja()}T12:00:00Z`)) / 86400000); }
function textoHorario(e) { if (!e.hora_inicio) return 'Dia todo'; return e.hora_fim ? `${e.hora_inicio} – ${e.hora_fim}` : `A partir das ${e.hora_inicio}`; }
function textoDatasEvento(e, longo = false) {
  const formatar = (iso, opcoes) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC', ...opcoes }).replace('.', '');
  if (!e.data_fim) return formatar(e.data, longo ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' });
  const mesmoMes = e.data.slice(0, 7) === e.data_fim.slice(0, 7);
  return mesmoMes ? `${Number(e.data.slice(8))} a ${formatar(e.data_fim, { day: 'numeric', month: longo ? 'long' : 'short' })}` : `${formatar(e.data, { day: 'numeric', month: 'short' })} a ${formatar(e.data_fim, { day: 'numeric', month: 'short' })}`;
}
function faltaPara(hora) {
  const [h, m] = hora.split(':').map(Number); const [ah, am] = horaAgoraLojaCliente().split(':').map(Number);
  const min = h * 60 + m - (ah * 60 + am);
  if (min <= 0) return 'agora';
  return min < 60 ? `em ${min} min` : `em ${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}`;
}
function textoQuando(e) {
  const s = situacaoEvento(e);
  if (s === 'agora') { const est = estadoEventoAgora(e); return est === 'ao_vivo' ? 'Ao vivo' : est === 'antes' ? `Hoje às ${e.hora_inicio}` : 'Encerrado hoje'; }
  if (s === 'passado') { const dias = -Math.round((new Date(`${fimEvento(e)}T12:00:00Z`) - new Date(`${hojeNaLoja()}T12:00:00Z`)) / 86400000); return dias === 1 ? 'Ontem' : `Há ${dias} dias`; }
  const dias = diasAteEvento(e);
  return dias === 1 ? 'Amanhã' : `Em ${dias} dias`;
}
const iconeLocal = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';
const iconeRelogio = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
const iconeRepetir = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>';

async function carregarTiposEvento() {
  try {
    const r = await fetch(`${API_URL}/tipos-evento`);
    if (!r.ok) return;
    const dados = await r.json();
    const assinatura = JSON.stringify(dados);
    if (assinatura === carregarTiposEvento.assinatura) return;
    carregarTiposEvento.assinatura = assinatura;
    tiposEventoState = dados.tipos;
    coresTipoEvento = dados.cores || coresTipoEvento;
    TIPOS_EVENTO = Object.fromEntries(dados.tipos.map((t) => [t.chave, { nome: t.nome, cor: t.cor }]));
    eventosAssinatura = '';
    if (!document.getElementById('modal-tipos-evento').classList.contains('hidden')) renderizarTiposEvento();
  } catch (_) { /* tenta de novo no próximo ciclo */ }
}
async function carregarEventos() {
  if (!document.getElementById('evento-calendario')) return;
  await carregarTiposEvento();
  const resposta = await fetch(`${API_URL}/eventos`);
  if (!resposta.ok) return;
  eventosState = (await resposta.json()).map((e) => ({ ...e, data: String(e.data).slice(0, 10), data_fim: e.data_fim ? String(e.data_fim).slice(0, 10) : null }));
  if (!eventoMesAtual) eventoMesAtual = hojeNaLoja().slice(0, 7);
  preencherSelecoesEventos();
  renderizarEventos();
}
let eventosAssinatura = '';
function renderizarEventos() {
  const assinatura = JSON.stringify([eventosState, eventoMesAtual, eventoFiltro, hojeNaLoja(), eventosState.filter((e) => situacaoEvento(e) === 'agora').map((e) => [e.id, estadoEventoAgora(e), e.hora_inicio ? faltaPara(e.hora_inicio) : ''])]);
  if (assinatura === eventosAssinatura) return;
  eventosAssinatura = assinatura;
  renderizarCalendarioEventos();
  renderizarListaEventos();
  renderizarDestaqueEvento();
}

function renderizarCalendarioEventos() {
  const grade = document.getElementById('evento-calendario');
  const [ano, mes] = eventoMesAtual.split('-').map(Number);
  document.getElementById('evento-mes-titulo').textContent = rotuloMesEvento(eventoMesAtual);
  const hoje = hojeNaLoja();
  const primeiro = diaDaSemanaISO(dataISOde(eventoMesAtual, 1));
  const total = diasNoMes(ano, mes);
  const celulas = [];
  for (let i = 0; i < primeiro; i += 1) celulas.push('<span class="ev-dia vazio" aria-hidden="true"></span>');
  for (let dia = 1; dia <= total; dia += 1) {
    const iso = dataISOde(eventoMesAtual, dia);
    const doDia = eventosState.filter((e) => eventoNoDia(e, iso));
    const pills = doDia.slice(0, 2).map((e) => {
      // Evento de vários dias: o nome aparece no primeiro dia e no começo de cada semana.
      const continua = e.data_fim && iso !== e.data && diaDaSemanaISO(iso) !== 0;
      return `<span class="ev-pill${continua ? ' continua' : ''}" style="--cor:${tipoEvento(e).cor}">${continua ? '' : escapeHtml(e.titulo)}</span>`;
    }).join('');
    const classes = ['ev-dia', iso === hoje ? 'hoje' : '', iso < hoje ? 'passou' : '', doDia.length ? 'tem' : '', eventoFiltro === iso ? 'selecionado' : ''].filter(Boolean).join(' ');
    const rotulo = `${dia} de ${NOMES_MESES[mes - 1]}${doDia.length ? `: ${doDia.map((e) => e.titulo).join(', ')}` : ''}`;
    celulas.push(`<button type="button" class="${classes}" data-dia="${iso}" aria-label="${escapeHtml(rotulo)}"><span class="ev-num">${dia}</span>${pills}${doDia.length > 2 ? `<span class="ev-mais">+${doDia.length - 2}</span>` : ''}<span class="ev-pontos">${doDia.slice(0, 4).map((e) => `<i style="--cor:${tipoEvento(e).cor}"></i>`).join('')}</span></button>`);
  }
  grade.innerHTML = celulas.join('');
  const tiposUsados = new Set(eventosState.map((e) => e.tipo));
  document.getElementById('evento-legenda').innerHTML = Object.entries(TIPOS_EVENTO).filter(([chave]) => tiposUsados.has(chave)).map(([, t]) => `<span><i style="--cor:${t.cor}"></i>${escapeHtml(t.nome)}</span>`).join('');
}

function htmlCartaoEvento(e) {
  const t = tipoEvento(e);
  const s = situacaoEvento(e);
  const [, mm, dd] = e.data.split('-');
  const resultado = e.vendas_count ? `<span class="ev-resultado"><strong>${formatarMoeda(e.faturamento)}</strong> · ${plural(e.vendas_count, 'venda', 'vendas')} · ${e.pecas} peças</span>` : '';
  return `<button type="button" class="ev-cartao ${s}" style="--cor:${t.cor}" data-evento="${e.id}">
      <span class="ev-data"><small>${DIAS_SEMANA[diaDaSemanaISO(e.data)]}</small><strong>${Number(dd)}</strong><small>${NOMES_MESES[Number(mm) - 1].slice(0, 3)}</small></span>
      <span class="ev-corpo">
        <span class="ev-linha1"><span class="ev-tipo">${escapeHtml(t.nome)}</span><span class="ev-quando ${s}">${escapeHtml(textoQuando(e))}</span></span>
        <strong class="ev-titulo">${escapeHtml(e.titulo)}${e.anual_id ? `<span class="ev-anual-icone" title="Repete todo ano">${iconeRepetir}</span>` : ''}</strong>
        <span class="ev-info">${iconeRelogio}${escapeHtml(e.data_fim ? `${textoDatasEvento(e)} · ${textoHorario(e)}` : textoHorario(e))}${e.local ? `<span class="ev-sep"></span>${iconeLocal}${escapeHtml(e.local)}` : ''}</span>
        ${resultado}
      </span>
    </button>`;
}
function renderizarListaEventos() {
  const lista = document.getElementById('evento-lista');
  const hoje = hojeNaLoja();
  let eventos;
  let vazio;
  document.querySelectorAll('[data-evento-filtro]').forEach((b) => { const ativo = b.dataset.eventoFiltro === eventoFiltro; b.classList.toggle('ativo', ativo); b.setAttribute('aria-selected', String(ativo)); });
  let cabecalho = '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(eventoFiltro)) {
    eventos = eventosState.filter((e) => eventoNoDia(e, eventoFiltro));
    cabecalho = `<div class="ev-lista-dia"><strong>${escapeHtml(textoDatasEvento({ data: eventoFiltro }, true))}</strong><button type="button" class="link-botao-inline" data-evento-filtro-voltar>Ver próximos</button></div>`;
    vazio = 'Nenhum evento neste dia.';
  } else if (eventoFiltro === 'passados') {
    eventos = eventosState.filter((e) => fimEvento(e) < hoje).sort((a, b) => b.data.localeCompare(a.data));
    vazio = 'Nenhum evento passado ainda.';
  } else if (eventoFiltro === 'mes') {
    eventos = eventosState.filter((e) => e.data.slice(0, 7) <= eventoMesAtual && fimEvento(e).slice(0, 7) >= eventoMesAtual);
    vazio = `Nenhum evento em ${rotuloMesEvento(eventoMesAtual).toLowerCase()}.`;
  } else {
    // Próximos 6 meses; o que vem depois (ex.: o ano que vem de um evento anual) fica no calendário.
    const limite = diaSomado(hoje, 183);
    eventos = eventosState.filter((e) => fimEvento(e) >= hoje && e.data <= limite);
    vazio = 'Nenhum evento nos próximos meses.';
  }
  const podeCriar = pode('eventos', 'editar');
  lista.innerHTML = cabecalho + (eventos.length ? eventos.map(htmlCartaoEvento).join('') : `<div class="ev-vazio"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg><strong>${escapeHtml(vazio)}</strong>${podeCriar ? `<button type="button" class="btn btn-secondary btn-sm" data-evento-criar="${/^\d{4}-/.test(eventoFiltro) ? eventoFiltro : ''}">Criar evento</button>` : ''}</div>`);
}

function renderizarDestaqueEvento() {
  const area = document.getElementById('evento-destaque');
  // Hoje: ao vivo pelo horário, ou ainda vai começar / já encerrou.
  const agora = eventosState.filter((e) => situacaoEvento(e) === 'agora').map((e) => ({ ...e, estadoHoje: estadoEventoAgora(e) }));
  const proximo = eventosState.filter((e) => situacaoEvento(e) === 'futuro').sort((a, b) => a.data.localeCompare(b.data) || String(a.hora_inicio || '').localeCompare(String(b.hora_inicio || '')))[0];
  const podeVender = pode('vendas');
  if (agora.length) {
    area.innerHTML = agora.map((e) => `<div class="ev-destaque agora" style="--cor:${tipoEvento(e).cor}">
        <div class="ev-destaque-info">
          ${e.estadoHoje === 'ao_vivo' ? '<span class="ev-ao-vivo"><i></i>Acontecendo agora</span>' : e.estadoHoje === 'antes' ? `<span class="ev-ao-vivo espera">Hoje · começa às ${escapeHtml(e.hora_inicio)} · ${escapeHtml(faltaPara(e.hora_inicio))}</span>` : `<span class="ev-ao-vivo encerrado">Hoje · encerrado${e.hora_fim ? ` às ${escapeHtml(e.hora_fim)}` : ''}</span>`}
          <h3>${escapeHtml(e.titulo)}</h3>
          <p>${iconeRelogio}${escapeHtml(textoHorario(e))}${e.local ? ` · ${escapeHtml(e.local)}` : ''}</p>
        </div>
        <div class="ev-destaque-numeros">
          <div><small>Vendido</small><strong>${formatarMoeda(e.faturamento)}</strong></div>
          <div><small>Vendas</small><strong>${e.vendas_count}</strong></div>
          <div><small>Peças</small><strong>${e.pecas}</strong></div>
        </div>
        <div class="ev-destaque-acoes">
          ${podeVender ? `<button type="button" class="btn btn-accent" data-vender-evento="${e.id}">Vender neste evento</button>` : ''}
          <button type="button" class="btn btn-secondary" data-evento="${e.id}">Ver resultado</button>
        </div>
      </div>`).join('');
  } else if (proximo) {
    const dias = diasAteEvento(proximo);
    area.innerHTML = `<button type="button" class="ev-destaque proximo" style="--cor:${tipoEvento(proximo).cor}" data-evento="${proximo.id}">
        <span class="ev-contagem"><strong>${dias}</strong><small>${dias === 1 ? 'dia' : 'dias'}</small></span>
        <span class="ev-destaque-info">
          <span class="ev-proximo-rotulo">Próximo evento · ${escapeHtml(tipoEvento(proximo).nome)}</span>
          <strong class="ev-destaque-titulo">${escapeHtml(proximo.titulo)}</strong>
          <span class="ev-destaque-sub">${escapeHtml(textoDatasEvento(proximo, true))} · ${escapeHtml(textoHorario(proximo))}${proximo.local ? ` · ${escapeHtml(proximo.local)}` : ''}</span>
        </span>
      </button>`;
  } else area.innerHTML = '';
}

// ---------- Detalhe ----------
async function abrirDetalheEvento(id) {
  eventoDetalheId = Number(id);
  const caixa = document.getElementById('evento-detalhe');
  caixa.innerHTML = '<div class="ev-carregando">Carregando…</div>';
  abrirDialogo('modal-evento-detalhe');
  const resposta = await fetch(`${API_URL}/eventos/${id}`);
  const e = await resposta.json();
  if (!resposta.ok) { caixa.innerHTML = `<div class="ev-carregando">${escapeHtml(e.error || 'Não foi possível abrir o evento.')}</div>`; return; }
  e.data = String(e.data).slice(0, 10); e.data_fim = e.data_fim ? String(e.data_fim).slice(0, 10) : null;
  const t = tipoEvento(e);
  const r = e.resultado;
  const s = situacaoEvento(e);
  const editar = pode('eventos', 'editar');
  const barra = (valor, maximo) => `<span class="ev-barra"><i style="width:${maximo ? Math.max(4, valor / maximo * 100) : 0}%"></i></span>`;
  const maxProduto = Math.max(1, ...r.produtos.map((p) => p.quantidade));
  const maxDia = Math.max(1, ...r.por_dia.map((p) => p.valor));
  const resultado = r.vendas || r.canceladas ? `
      <div class="ev-kpis">
        <div class="destaque"><small>Faturamento</small><strong>${formatarMoeda(r.faturamento)}</strong>${r.descontos ? `<span>${formatarMoeda(r.descontos)} em descontos</span>` : ''}</div>
        <div><small>Vendas</small><strong>${r.vendas}</strong><span>ticket ${formatarMoeda(r.ticket_medio)}</span></div>
        <div><small>Peças vendidas</small><strong>${r.pecas}</strong>${r.brindes ? `<span>+ ${plural(r.brindes, 'brinde', 'brindes')}</span>` : ''}</div>
      </div>
      ${r.por_dia.length > 1 ? `<h4 class="ev-sub">Por dia</h4><div class="ev-ranking">${r.por_dia.map((d) => `<div><span>${escapeHtml(textoDatasEvento({ data: d.dia }))}</span>${barra(d.valor, maxDia)}<strong>${formatarMoeda(d.valor)}</strong><small>${plural(d.vendas, 'venda', 'vendas')}</small></div>`).join('')}</div>` : ''}
      ${r.produtos.length ? `<h4 class="ev-sub">Mais vendidos</h4><div class="ev-ranking">${r.produtos.slice(0, 8).map((p, i) => `<div><span><b>${i + 1}</b>${escapeHtml(p.produto_nome)}</span>${barra(p.quantidade, maxProduto)}<strong>${p.quantidade} un.</strong><small>${formatarMoeda(p.valor)}</small></div>`).join('')}</div>` : ''}
      <div class="ev-duas">
        <div><h4 class="ev-sub">Pagamento</h4>${r.por_pagamento.map((p) => `<p class="ev-linha"><span>${escapeHtml(p.forma)}</span><strong>${formatarMoeda(p.valor)}</strong></p>`).join('') || '<p class="field-help">—</p>'}</div>
        <div><h4 class="ev-sub">Vendedores</h4>${r.por_vendedor.map((p) => `<p class="ev-linha"><span>${escapeHtml(p.nome)}</span><strong>${formatarMoeda(p.valor)}</strong></p>`).join('') || '<p class="field-help">—</p>'}</div>
      </div>
      <details class="ev-vendas"><summary>Vendas do evento (${e.vendas.length})</summary>
        ${e.vendas.map((v) => `<div class="ev-venda${v.cancelada ? ' cancelada' : ''}"><span class="ev-venda-num">#${v.id}</span><span class="ev-venda-itens">${v.itens.map((i) => `${i.quantidade}× ${escapeHtml(i.produto_nome)}${i.tipo === 'BRINDE' ? ' <em>brinde</em>' : ''}`).join('<br>')}<small>${escapeHtml(formatarDataHora(v.criado_em))} · ${escapeHtml(v.vendedor_nome || '-')} · ${escapeHtml(v.forma_pagamento)}${v.parcelas > 1 ? ` ${v.parcelas}x` : ''}${v.cancelada ? ' · cancelada' : ''}</small></span><strong>${formatarMoeda(v.total)}</strong></div>`).join('')}
      </details>`
    : `<div class="ev-sem-vendas">${s === 'futuro' ? '<strong>As vendas aparecem aqui durante o evento.</strong><span>No dia, escolha este evento em <b>Onde é a venda?</b> no PDV.</span>' : '<strong>Nenhuma venda ligada a este evento.</strong><span>Para ligar, escolha o evento em <b>Onde é a venda?</b> no PDV enquanto ele acontece.</span>'}</div>`;
  caixa.innerHTML = `
    <div class="ev-detalhe-topo" style="--cor:${t.cor}">
      <div>
        <span class="ev-tipo">${escapeHtml(t.nome)}</span>
        <h3 id="evento-detalhe-titulo">${escapeHtml(e.titulo)}</h3>
        <p class="ev-detalhe-info">${iconeRelogio}${escapeHtml(textoDatasEvento(e, true))} · ${escapeHtml(textoHorario(e))}</p>
        ${e.local ? `<p class="ev-detalhe-info">${iconeLocal}${escapeHtml(e.local)}</p>` : ''}
        ${e.anual_id ? `<p class="ev-detalhe-info">${iconeRepetir}${e.anual_ativo ? 'Repete todo ano' : 'Parou de repetir'}</p>` : ''}
      </div>
      <button type="button" class="pdv-fechar" data-fechar-dialogo="modal-evento-detalhe" aria-label="Fechar">×</button>
    </div>
    ${e.descricao ? `<p class="ev-descricao">${escapeHtml(e.descricao)}</p>` : ''}
    <div class="ev-detalhe-acoes">
      ${s === 'agora' && pode('vendas') ? `<button type="button" class="btn btn-accent btn-sm" data-vender-evento="${e.id}">Vender neste evento</button>` : ''}
      ${editar ? `<button type="button" class="btn btn-secondary btn-sm" data-editar-evento="${e.id}">Editar</button>` : ''}
      ${editar && e.anual_id && e.anual_ativo ? `<button type="button" class="btn btn-secondary btn-sm" data-parar-anual="${e.anual_id}">Parar de repetir</button>` : ''}
      ${editar && !e.vendas.length ? `<button type="button" class="btn btn-danger btn-sm" data-excluir-evento="${e.id}">Excluir</button>` : ''}
    </div>
    <div class="ev-resultado-bloco"><h4 class="ev-sub ev-sub-forte">Resultado</h4>${resultado}</div>`;
  caixa.querySelectorAll('[data-fechar-dialogo]').forEach((b) => b.addEventListener('click', () => fecharDialogo('modal-evento-detalhe')));
}

// ---------- Cadastro / edição ----------
function abrirFormEvento(evento = null, dataSugerida = '') {
  const e = evento || {};
  document.getElementById('evento-id').value = e.id || '';
  document.getElementById('evento-form-titulo').textContent = e.id ? 'Editar evento' : 'Novo evento';
  document.getElementById('evento-salvar').textContent = e.id ? 'Salvar' : 'Criar evento';
  document.getElementById('evento-titulo').value = e.titulo || '';
  document.getElementById('evento-data').value = e.data || dataSugerida || hojeNaLoja();
  document.getElementById('evento-data-fim').value = e.data_fim || '';
  document.getElementById('evento-hora-inicio').value = e.hora_inicio || '';
  document.getElementById('evento-hora-fim').value = e.hora_fim || '';
  document.getElementById('evento-local').value = e.local || '';
  document.getElementById('evento-descricao').value = e.descricao || '';
  document.getElementById('evento-status').textContent = '';
  const tipoAtual = e.tipo && TIPOS_EVENTO[e.tipo] ? e.tipo : (TIPOS_EVENTO.encontro ? 'encontro' : Object.keys(TIPOS_EVENTO)[0]);
  document.getElementById('evento-tipos').innerHTML = Object.entries(TIPOS_EVENTO).map(([chave, t]) => `<label class="ev-tipo-opcao" style="--cor:${t.cor}"><input type="radio" name="evento-tipo" value="${chave}"${chave === tipoAtual ? ' checked' : ''}><span><i></i>${escapeHtml(t.nome)}</span></label>`).join('');
  const anual = document.getElementById('evento-anual');
  const opcao = anual.closest('.ev-anual');
  anual.checked = false;
  opcao.hidden = Boolean(e.anual_id && !e.anual_ativo);
  document.getElementById('evento-anual-titulo').textContent = e.anual_id ? 'Aplicar as mudanças nos próximos anos' : 'Repetir todo ano na mesma data';
  document.getElementById('evento-anual-ajuda').textContent = e.anual_id ? 'Nome, tipo, local, horário e duração mudam também nos anos que ainda vão acontecer. O dia de cada ano continua o mesmo.' : 'Aparece sozinho no calendário do próximo ano, no mesmo dia e mês.';
  fecharDialogo('modal-evento-detalhe');
  abrirDialogo('modal-evento-form');
}
async function salvarEvento(evento) {
  evento.preventDefault();
  const status = document.getElementById('evento-status');
  const id = document.getElementById('evento-id').value;
  const corpo = {
    titulo: document.getElementById('evento-titulo').value.trim(),
    tipo: document.querySelector('input[name="evento-tipo"]:checked')?.value || 'outro',
    data: document.getElementById('evento-data').value,
    data_fim: document.getElementById('evento-data-fim').value,
    hora_inicio: document.getElementById('evento-hora-inicio').value,
    hora_fim: document.getElementById('evento-hora-fim').value,
    local: document.getElementById('evento-local').value.trim(),
    descricao: document.getElementById('evento-descricao').value.trim(),
  };
  if (!corpo.titulo) { status.textContent = 'Dê um nome ao evento.'; document.getElementById('evento-titulo').focus(); return; }
  if (!corpo.data) { status.textContent = 'Escolha o dia do evento.'; return; }
  if (document.getElementById('evento-anual').checked) {
    const atual = id ? eventosState.find((e) => Number(e.id) === Number(id)) : null;
    if (atual && atual.anual_id) corpo.aplicar_serie = true; else corpo.repetir_anualmente = true;
  }
  const botao = document.getElementById('evento-salvar');
  botao.disabled = true;
  try {
    const resposta = await fetch(`${API_URL}/eventos${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', headers: getHeadersComUsuario(), body: JSON.stringify(corpo) });
    const resultado = await resposta.json();
    if (!resposta.ok) { status.textContent = resultado.error || 'Não foi possível salvar o evento.'; return; }
    fecharDialogo('modal-evento-form');
    showToast(resultado.mensagem || 'Evento salvo.');
    eventoMesAtual = corpo.data.slice(0, 7);
    eventosAssinatura = '';
    await carregarEventos();
    carregarEventosHoje(true);
    abrirDetalheEvento(id || resultado.id);
  } finally { botao.disabled = false; }
}
async function excluirEvento(id) {
  const e = eventosState.find((item) => Number(item.id) === Number(id));
  const aviso = e && e.anual_id && e.anual_ativo ? '\n\nSó este ano será excluído; o evento continua se repetindo nos outros anos.' : '';
  if (!confirm(`Excluir o evento "${e?.titulo || ''}"?${aviso}`)) return;
  const resposta = await fetch(`${API_URL}/eventos/${id}`, { method: 'DELETE', headers: getHeadersComUsuario() });
  const resultado = await resposta.json();
  if (!resposta.ok) return showToast(resultado.error || 'Não foi possível excluir.', 'error');
  showToast(resultado.mensagem || 'Evento excluído.');
  fecharDialogo('modal-evento-detalhe');
  eventosAssinatura = '';
  await carregarEventos();
  carregarEventosHoje(true);
}
async function pararEventoAnual(anualId) {
  if (!confirm('Parar de repetir este evento todo ano? Os anos futuros sem vendas serão removidos.')) return;
  const resposta = await fetch(`${API_URL}/eventos-anuais/${anualId}/parar`, { method: 'PUT', headers: getHeadersComUsuario() });
  const resultado = await resposta.json();
  if (!resposta.ok) return showToast(resultado.error || 'Não foi possível parar a repetição.', 'error');
  showToast(resultado.mensagem);
  eventosAssinatura = '';
  await carregarEventos();
  if (eventoDetalheId) abrirDetalheEvento(eventoDetalheId);
}

// ---------- PDV: venda na loja ou no evento — automático pelo horário ----------
// Quando um evento começa (dia + hora marcados), o caixa passa sozinho a vender
// para ele; quando termina, volta para a Loja. Quem estiver na loja física pode
// escolher "Loja" na mão: essa escolha vale até o próximo começo/fim de evento.
let eventosHojeEm = 0;
let alvoAutomaticoAnterior; // undefined na primeira leitura (não avisa)
function horaAgoraLojaCliente() { return new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()); }
// Mesma regra do servidor (eventoAoVivo).
function eventoAoVivoAgora(e) {
  const hoje = hojeNaLoja();
  const hora = horaAgoraLojaCliente();
  const fim = e.data_fim || e.data;
  const hi = e.hora_inicio || null;
  const hf = e.hora_fim || null;
  const viraNoite = Boolean(hi && hf && hf <= hi);
  if (hoje < e.data || hoje > fim) return viraNoite && hoje === diaSomado(fim, 1) && hora < hf;
  if (!hi) return true;
  if (!hf) return hora >= hi;
  if (!viraNoite) return hora >= hi && hora < hf;
  return hora >= hi || (hoje !== e.data && hora < hf);
}
function estadoEventoAgora(e) {
  if (eventoAoVivoAgora(e)) return 'ao_vivo';
  const hoje = hojeNaLoja();
  if (e.hora_inicio && horaAgoraLojaCliente() < e.hora_inicio && hoje >= e.data && hoje <= (e.data_fim || e.data)) return 'antes';
  return 'encerrado';
}
function alvoAutomatico() { return eventosHoje.find((e) => eventoAoVivoAgora(e))?.id ?? null; }
function chaveOndeVenda() { return `erp-pdv-onde-${hojeNaLoja()}`; }
function escolhaManualOnde() { try { return JSON.parse(lerPreferencia(chaveOndeVenda(), 'null')); } catch (_) { return null; } }
// Evento da venda: a escolha manual vale enquanto o "automático" não mudar.
function idEventoDaVenda() {
  const auto = alvoAutomatico();
  const manual = escolhaManualOnde();
  if (manual && (manual.alvo ?? null) === auto) return manual.id ?? null;
  return auto;
}
function eventoDaVendaAtual() { const id = idEventoDaVenda(); return id ? eventosHoje.find((e) => Number(e.id) === Number(id)) || null : null; }

async function carregarEventosHoje(forcar = false) {
  if (!pode('vendas') && !pode('eventos') && !pode('dashboard') && !pode('movimentar')) return;
  if (!forcar && Date.now() - eventosHojeEm < 60000) { verificarOndeAutomatico(); return; }
  eventosHojeEm = Date.now();
  try {
    const resposta = await fetch(`${API_URL}/eventos/hoje`);
    if (!resposta.ok) return;
    eventosHoje = (await resposta.json()).map((e) => ({ ...e, id: Number(e.id), data: String(e.data).slice(0, 10), data_fim: e.data_fim ? String(e.data_fim).slice(0, 10) : null }));
  } catch (_) { return; }
  verificarOndeAutomatico();
}
// Roda a cada 20 s: percebe quando um evento começa ou termina e troca sozinho.
function verificarOndeAutomatico() {
  const auto = alvoAutomatico();
  if (alvoAutomaticoAnterior !== undefined && auto !== alvoAutomaticoAnterior) {
    const manual = escolhaManualOnde();
    if (manual) salvarPreferencia(chaveOndeVenda(), 'null'); // o automático volta a mandar
    const comecou = auto ? eventosHoje.find((e) => e.id === auto) : null;
    const terminou = alvoAutomaticoAnterior ? eventosHoje.find((e) => e.id === alvoAutomaticoAnterior) : null;
    if (comecou) showToast(`${comecou.titulo} começou: as vendas agora vão para o evento.`);
    else if (terminou) showToast(`${terminou.titulo} terminou: as vendas voltaram para a Loja.`, 'warning');
    document.getElementById('pdv-onde')?.classList.remove('trocou'); void document.getElementById('pdv-onde')?.offsetWidth;
    document.getElementById('pdv-onde')?.classList.add('trocou');
  }
  alvoAutomaticoAnterior = auto;
  renderizarOndeVenda();
  preencherSelecoesEventos();
  sugerirEventoMovimentar();
}
function definirOndeVenda(id) {
  const escolhido = id ? Number(id) : null;
  const auto = alvoAutomatico();
  // Escolher o mesmo que o automático é voltar ao automático.
  salvarPreferencia(chaveOndeVenda(), escolhido === auto ? 'null' : JSON.stringify({ id: escolhido, alvo: auto }));
  renderizarOndeVenda();
}
function renderizarOndeVenda() {
  const bloco = document.getElementById('pdv-onde');
  if (!bloco) return;
  bloco.hidden = !eventosHoje.length;
  if (!eventosHoje.length) return;
  const atual = idEventoDaVenda();
  const auto = alvoAutomatico();
  const manual = escolhaManualOnde();
  const automatico = !(manual && (manual.alvo ?? null) === auto);
  const opcoes = [{ id: null, titulo: 'Loja', cor: 'var(--text-muted)', estado: '' }, ...eventosHoje.map((e) => ({ id: e.id, titulo: e.titulo, cor: tipoEvento(e).cor, estado: estadoEventoAgora(e) }))];
  const html = opcoes.map((o) => {
    const ativo = (o.id ?? null) === (atual ?? null);
    return `<button type="button" role="radio" aria-checked="${ativo}" class="${ativo ? 'ativo' : ''}${o.estado === 'ao_vivo' ? ' ao-vivo' : ''}" data-onde="${o.id ?? ''}" style="--cor:${o.cor}"><i></i>${escapeHtml(o.titulo)}</button>`;
  }).join('');
  const area = document.getElementById('pdv-onde-opcoes');
  if (area._html !== html) { area._html = html; area.innerHTML = html; }
  // Linha de situação
  const vivo = auto ? eventosHoje.find((e) => e.id === auto) : null;
  const proximo = eventosHoje.filter((e) => estadoEventoAgora(e) === 'antes').sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))[0];
  let texto;
  if (vivo) texto = `<b class="ao-vivo-ponto"></b>${escapeHtml(vivo.titulo)} começou${vivo.hora_inicio ? ` às ${vivo.hora_inicio}` : ''}${vivo.hora_fim ? ` e vai até ${vivo.hora_fim}` : ''}.`;
  else if (proximo) texto = `${escapeHtml(proximo.titulo)} começa às ${proximo.hora_inicio}. Até lá, as vendas ficam na Loja.`;
  else {
    const encerrado = eventosHoje.filter((e) => e.hora_fim && estadoEventoAgora(e) === 'encerrado').sort((a, b) => b.hora_fim.localeCompare(a.hora_fim))[0];
    texto = encerrado ? `${escapeHtml(encerrado.titulo)} terminou às ${encerrado.hora_fim}. As vendas ficam na Loja.` : 'Nenhum evento acontecendo agora. As vendas ficam na Loja.';
  }
  const modo = automatico
    ? '<span class="pdv-onde-modo auto">Automático</span>'
    : '<button type="button" class="pdv-onde-modo manual" data-onde-auto>Escolhido à mão · voltar ao automático</button>';
  const status = `<span class="pdv-onde-status">${texto}</span>${modo}`;
  const linha = document.getElementById('pdv-onde-info');
  if (linha._html !== status) { linha._html = status; linha.innerHTML = status; }
}
setInterval(() => { if (eventosHoje.length) verificarOndeAutomatico(); if (document.getElementById('tab-eventos')?.classList.contains('active')) renderizarEventos(); }, 20000);

function configurarEventos() {
  document.getElementById('evento-mes-anterior').addEventListener('click', () => { const [a, m] = eventoMesAtual.split('-').map(Number); eventoMesAtual = m === 1 ? mesISOde(a - 1, 12) : mesISOde(a, m - 1); if (/^\d{4}-\d{2}-\d{2}$/.test(eventoFiltro)) eventoFiltro = 'mes'; renderizarEventos(); });
  document.getElementById('evento-mes-seguinte').addEventListener('click', () => { const [a, m] = eventoMesAtual.split('-').map(Number); eventoMesAtual = m === 12 ? mesISOde(a + 1, 1) : mesISOde(a, m + 1); if (/^\d{4}-\d{2}-\d{2}$/.test(eventoFiltro)) eventoFiltro = 'mes'; renderizarEventos(); });
  document.getElementById('evento-mes-hoje').addEventListener('click', () => { eventoMesAtual = hojeNaLoja().slice(0, 7); eventoFiltro = 'proximos'; renderizarEventos(); });
  document.getElementById('evento-novo').addEventListener('click', () => abrirFormEvento(null, /^\d{4}-\d{2}-\d{2}$/.test(eventoFiltro) ? eventoFiltro : ''));
  document.getElementById('evento-calendario').addEventListener('click', (ev) => {
    const dia = ev.target.closest('[data-dia]');
    if (!dia) return;
    const doDia = eventosState.filter((e) => eventoNoDia(e, dia.dataset.dia));
    if (!doDia.length && pode('eventos', 'editar')) { abrirFormEvento(null, dia.dataset.dia); return; }
    eventoFiltro = dia.dataset.dia;
    renderizarEventos();
    if (doDia.length === 1) abrirDetalheEvento(doDia[0].id);
  });
  document.querySelectorAll('[data-evento-filtro]').forEach((b) => b.addEventListener('click', () => { eventoFiltro = b.dataset.eventoFiltro; renderizarEventos(); }));
  // Cliques dentro da aba e do detalhe (cartões, botões de ação)
  const aoClicar = (ev) => {
    const alvo = ev.target.closest('[data-vender-evento],[data-editar-evento],[data-excluir-evento],[data-parar-anual],[data-evento-criar],[data-evento-filtro-voltar],[data-evento]');
    if (!alvo) return;
    if (alvo.dataset.venderEvento) { definirOndeVenda(alvo.dataset.venderEvento); fecharDialogo('modal-evento-detalhe'); irParaAba('tab-vendas'); carregarEventosHoje(true); return; }
    if (alvo.dataset.editarEvento) { abrirFormEvento(eventosState.find((e) => Number(e.id) === Number(alvo.dataset.editarEvento))); return; }
    if (alvo.dataset.excluirEvento) { excluirEvento(alvo.dataset.excluirEvento); return; }
    if (alvo.dataset.pararAnual) { pararEventoAnual(alvo.dataset.pararAnual); return; }
    if (alvo.hasAttribute('data-evento-criar')) { abrirFormEvento(null, alvo.dataset.eventoCriar); return; }
    if (alvo.hasAttribute('data-evento-filtro-voltar')) { eventoFiltro = 'proximos'; renderizarEventos(); return; }
    if (alvo.dataset.evento) abrirDetalheEvento(alvo.dataset.evento);
  };
  document.getElementById('tab-eventos').addEventListener('click', aoClicar);
  document.getElementById('evento-detalhe').addEventListener('click', aoClicar);
  document.getElementById('form-evento').addEventListener('submit', salvarEvento);
  // "Até" nunca fica antes do dia
  document.getElementById('evento-data').addEventListener('change', () => { const fim = document.getElementById('evento-data-fim'); fim.min = document.getElementById('evento-data').value; if (fim.value && fim.value < fim.min) fim.value = ''; });
  document.getElementById('pdv-onde').addEventListener('click', (ev) => {
    if (ev.target.closest('[data-onde-auto]')) { salvarPreferencia(chaveOndeVenda(), 'null'); renderizarOndeVenda(); return; }
    const b = ev.target.closest('[data-onde]');
    if (b) definirOndeVenda(b.dataset.onde);
  });
}
configurarEventos();

// ================= PRODUTOS E ESTOQUE =================
// ================= FOTOS DE PRODUTO (opcionais) =================
// A foto fica no banco e é servida em /api/fotos/:id. Antes de enviar, a imagem é
// reduzida no navegador (até 800 px, JPEG), então fica leve para a tela de venda.
const urlFoto = (idFoto) => (window.DemoERP ? window.DemoERP.urlFoto(idFoto) : `${API_URL}/fotos/${idFoto}`);
function htmlMiniatura(idFoto, alt = '') {
  return idFoto
    ? `<img class="foto-mini" src="${urlFoto(idFoto)}" alt="${escapeHtml(alt)}" loading="lazy" onclick="ampliarFoto(${idFoto})">`
    : '<span class="foto-mini foto-vazia" title="Sem foto" aria-hidden="true"></span>';
}
function ampliarFoto(idFoto) {
  const camada = document.createElement('div');
  camada.className = 'foto-ampliada';
  camada.innerHTML = `<img src="${urlFoto(idFoto)}" alt="Foto ampliada do produto">`;
  const fechar = () => { camada.remove(); document.removeEventListener('keydown', aoTeclar); };
  const aoTeclar = (evento) => { if (evento.key === 'Escape') fechar(); };
  camada.addEventListener('click', fechar);
  document.addEventListener('keydown', aoTeclar);
  document.body.appendChild(camada);
}
// Mostra a foto do produto escolhido (venda e entrada de estoque). Sem foto, o bloco some.
function atualizarFotoProduto(containerId, idProduto) {
  const area = document.getElementById(containerId);
  if (!area) return;
  const produto = relatorioProdutosState.find((p) => String(p.id) === String(idProduto));
  if (!produto || !produto.id_foto_efetivo) { area.hidden = true; area.innerHTML = ''; return; }
  area.innerHTML = `${htmlMiniatura(produto.id_foto_efetivo, produto.nome).replace('foto-mini', 'foto-mini foto-grande')}<div><strong>${escapeHtml(produto.nome)}</strong><br><small class="field-help">R$ ${Number(produto.preco).toFixed(2)}</small></div>`;
  area.hidden = false;
}
async function prepararFoto(arquivo) {
  if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) throw new Error('Escolha uma imagem JPG, PNG ou WebP.');
  if (arquivo.size > 15 * 1024 * 1024) throw new Error('A imagem tem mais de 15 MB.');
  const imagem = await createImageBitmap(arquivo);
  const escala = Math.min(1, 800 / Math.max(imagem.width, imagem.height));
  const tela = document.createElement('canvas');
  tela.width = Math.max(1, Math.round(imagem.width * escala));
  tela.height = Math.max(1, Math.round(imagem.height * escala));
  const contexto = tela.getContext('2d');
  contexto.fillStyle = '#ffffff'; // PNG com fundo transparente vira JPEG sobre branco
  contexto.fillRect(0, 0, tela.width, tela.height);
  contexto.drawImage(imagem, 0, 0, tela.width, tela.height);
  let qualidade = 0.85;
  let blob = null;
  do {
    blob = await new Promise((resolve) => tela.toBlob(resolve, 'image/jpeg', qualidade));
    qualidade -= 0.1;
  } while (blob && blob.size > 280 * 1024 && qualidade > 0.3);
  if (!blob || blob.size > 290 * 1024) throw new Error('Não foi possível reduzir esta imagem. Tente outra foto.');
  return blob;
}
async function enviarFoto(caminho, arquivo) {
  const blob = await prepararFoto(arquivo);
  const resposta = await fetch(`${API_URL}${caminho}`, { method: 'PUT', headers: getHeadersComUsuario({ 'Content-Type': 'image/jpeg' }), body: blob });
  const resultado = await resposta.json();
  if (!resposta.ok) throw new Error(resultado.error || 'Não foi possível salvar a foto.');
}
let alvoFoto = null;
function escolherFoto(caminho) {
  alvoFoto = caminho;
  const campo = document.getElementById('foto-arquivo-oculto');
  campo.value = '';
  campo.click();
}
async function apagarFoto(caminho) {
  if (!confirm('Remover esta foto?')) return;
  const resposta = await fetch(`${API_URL}${caminho}`, { method: 'DELETE', headers: getHeadersComUsuario() });
  const resultado = await resposta.json();
  if (!resposta.ok) return showToast(resultado.error || 'Não foi possível remover a foto.', 'error');
  showToast(resultado.mensagem || 'Foto removida.');
  modelosAssinatura = '';
  await carregarTudo();
}
document.getElementById('foto-arquivo-oculto')?.addEventListener('change', async (evento) => {
  const arquivo = evento.target.files[0];
  const caminho = alvoFoto;
  alvoFoto = null;
  if (!arquivo || !caminho) return;
  try {
    await enviarFoto(caminho, arquivo);
    showToast('Foto salva.');
  } catch (erro) {
    showToast(erro.message, 'error');
  }
  modelosAssinatura = '';
  await carregarTudo();
});
// Prévia da foto escolhida nos formulários de cadastro.
function ligarPreviaFoto(campoId, imagemId) {
  const campo = document.getElementById(campoId), imagem = document.getElementById(imagemId);
  if (!campo || !imagem) return;
  campo.addEventListener('change', () => {
    const arquivo = campo.files[0];
    if (imagem.dataset.url) URL.revokeObjectURL(imagem.dataset.url);
    imagem.dataset.url = arquivo ? URL.createObjectURL(arquivo) : '';
    imagem.src = imagem.dataset.url;
    imagem.classList.toggle('hidden', !arquivo);
  });
}
function limparPreviaFoto(imagemId) {
  const imagem = document.getElementById(imagemId);
  if (!imagem) return;
  if (imagem.dataset.url) URL.revokeObjectURL(imagem.dataset.url);
  imagem.dataset.url = '';
  imagem.removeAttribute('src');
  imagem.classList.add('hidden');
}
ligarPreviaFoto('prod-foto', 'prod-foto-previa');
ligarPreviaFoto('modelo-foto', 'modelo-foto-previa');

async function carregarProdutos() {
  // Atualiza a lista de produtos usada no PDV, nos relatórios e na tela de
  // Produtos & Estoque (lista, peças únicas e resumo).
  const res = await fetch(`${API_URL}/produtos`);
  const produtos = await res.json();
  if (!res.ok) {
    showToast(produtos.error || 'Não foi possível carregar os produtos para os relatórios.', 'error');
    return;
  }
  relatorioProdutosState = produtos;

  // Datalist do PDV: só produtos ativos com saldo.
  const datalistVenda = document.getElementById('lista-produtos');
  const opcoesVenda = produtos.filter((p) => p.ativo && p.estoque > 0).map((p) => `<option value="${escapeHtml(`${p.nome} - R$ ${Number(p.preco).toFixed(2)} (Saldo: ${p.estoque})`)}" data-id="${p.id}" data-preco="${p.preco}"></option>`).join('');
  if (datalistVenda && datalistVenda.dataset.assinatura !== opcoesVenda) { datalistVenda.innerHTML = opcoesVenda; datalistVenda.dataset.assinatura = opcoesVenda; }

  renderizarTelaEstoque();
  renderizarVitrine();
  atualizarFotoProduto('venda-foto', document.getElementById('venda-produto-id').value);
  preencherSelecoesMovimentar(produtos);
  renderizarRelatorios();
}

async function alternarProdutoAtivo(id, ativo) {
  const pergunta = ativo ? 'Reativar este produto?' : 'Inativar este produto? Ele sairá das vendas e das movimentações, mas o histórico será preservado.';
  if (!confirm(pergunta)) return;
  const resposta = await fetch(`${API_URL}/produtos/${id}/status`, { method: 'PUT', headers: getHeadersComUsuario(), body: JSON.stringify({ ativo }) });
  const resultado = await resposta.json();
  if (!resposta.ok) return showToast(resultado.error || 'Não foi possível alterar a situação do produto.', 'error');
  showToast(resultado.mensagem);
  await carregarTudo();
}


document.getElementById('form-produto').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!pode('estoque', 'editar')) {
    showToast('Você não pode cadastrar produtos.', 'error');
    return;
  }

  const data = { 
      nome: document.getElementById('prod-nome').value, 
      categoria: document.getElementById('prod-categoria').value, 
      preco: document.getElementById('prod-preco').value 
  };
  const resposta = await fetch(`${API_URL}/produtos`, { method: 'POST', headers: getHeadersComUsuario(), body: JSON.stringify(data) });
  const criado = await resposta.json().catch(() => ({}));
  const arquivoFoto = document.getElementById('prod-foto').files[0];
  if (resposta.ok && criado.id && arquivoFoto) {
    try { await enviarFoto(`/produtos/${criado.id}/foto`, arquivoFoto); } catch (erro) { showToast(`Produto cadastrado, mas a foto não foi salva: ${erro.message}`, 'error'); }
  }
  showToast("Produto cadastrado com sucesso!"); 
  e.target.reset(); 
  limparPreviaFoto('prod-foto-previa');
  carregarTudo();
});

// ===== Modelos com variações (cor + tamanho) =====
// Um modelo (ex.: Camisa Ferrari) gera uma peça por combinação de cor e tamanho.
// Cada peça é um produto comum, com estoque próprio, então PDV, movimentação e
// planilha de eventos continuam usando o nome completo "Modelo - Cor - Tamanho".
let modelosState = [];
let modelosAssinatura = '';
const ORDEM_TAMANHOS = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'EXG', 'G1', 'G2', 'G3'];
const CATEGORIAS_MODELO = ['Camiseta', 'Moletom', 'Calça', 'Acessório', 'Outros'];

function ordenarTamanhos(tamanhos) {
  const chave = (tamanho) => {
    const posicao = ORDEM_TAMANHOS.indexOf(String(tamanho).toUpperCase());
    if (posicao >= 0) return posicao;
    const numero = Number(tamanho);
    return Number.isNaN(numero) || tamanho === '' ? 1000 : 100 + numero;
  };
  return [...tamanhos].sort((a, b) => chave(a) - chave(b) || String(a).localeCompare(String(b), 'pt-BR'));
}

// ================= CORES CADASTRADAS =================
// As cores vêm da tabela `cor` e são escolhidas por seleção (caixas), nunca
// digitadas no cadastro do modelo. O servidor também recusa cor fora da tabela.
let coresState = [];
let coresAssinatura = '';
function coresSelecionadas(container) {
  const area = typeof container === 'string' ? document.getElementById(container) : container;
  return area ? [...area.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)')].map((caixa) => caixa.value) : [];
}
function renderizarSeletorNovoModelo() {
  const area = document.getElementById('modelo-cores');
  if (!area) return;
  const marcadas = new Set(coresSelecionadas(area));
  area.innerHTML = coresState.length
    ? coresState.map((c) => `<label class="cor-opcao"><input type="checkbox" value="${escapeHtml(c.nome)}"${marcadas.has(c.nome) ? ' checked' : ''}><span>${escapeHtml(c.nome)}</span></label>`).join('')
    : '<span class="field-help">Nenhuma cor cadastrada. Cadastre em "Cores cadastradas", logo acima.</span>';
  atualizarPreviaModelo();
}
function renderizarCoresCadastradas() {
  const lista = document.getElementById('lista-cores');
  if (!lista) return;
  lista.innerHTML = coresState.length
    ? coresState.map((c) => `<span class="cor-chip">${escapeHtml(c.nome)}<button type="button" class="cor-chip-remover" title="Excluir a cor" aria-label="Excluir a cor ${escapeHtml(c.nome)}" onclick="excluirCor(${c.id_cor})">&times;</button></span>`).join('')
    : '<span class="field-help">Nenhuma cor cadastrada ainda.</span>';
}
async function carregarCores() {
  const resposta = await fetch(`${API_URL}/cores`);
  const dados = await resposta.json();
  if (!resposta.ok || !Array.isArray(dados)) return;
  const assinatura = JSON.stringify(dados);
  if (assinatura === coresAssinatura) return;
  coresAssinatura = assinatura;
  coresState = dados;
  renderizarCoresCadastradas();
  renderizarSeletorNovoModelo();
  renderizarModelos(); // a assinatura dos modelos inclui as cores
}
// ================= CATÁLOGOS EDITÁVEIS: CATEGORIAS E TIPOS DE EVENTO =================
// Uma lista com cadastrar, renomear/editar e excluir. Excluir algo em uso abre,
// na própria linha, a escolha de para onde mover o que estava nele.
let categoriasProdutoState = [];
let categoriasAssinatura = '';
function usoCategoria(c) {
  if (!c.em_uso) return 'sem produtos';
  return [c.modelos ? `${c.modelos} ${c.modelos === 1 ? 'modelo' : 'modelos'}` : '', c.pecas_unicas ? `${c.pecas_unicas} ${c.pecas_unicas === 1 ? 'peça única' : 'peças únicas'}` : ''].filter(Boolean).join(' · ');
}
function usoTipoEvento(t) { return t.eventos ? `${t.eventos} ${t.eventos === 1 ? 'evento' : 'eventos'}` : 'sem eventos'; }
const htmlPaletaCores = (nome, atual) => coresTipoEvento.map((cor) => `<label class="tipo-cor" style="--cor:${cor}" title="${cor}"><input type="radio" name="${nome}" value="${cor}" ${cor === atual ? 'checked' : ''}><span></span></label>`).join('');
function htmlItemCatalogo(tipo, item, podeEditar) {
  const evento = tipo === 'evento';
  return `<div class="catalogo-item" data-catalogo="${tipo}" data-id="${item.id}">
    <div class="catalogo-ver">
      ${evento ? `<i class="catalogo-cor" style="--cor:${item.cor}"></i>` : '<i class="catalogo-cor catalogo-cor-neutra"></i>'}
      <div class="catalogo-nome"><strong>${escapeHtml(item.nome)}</strong><small>${evento ? usoTipoEvento(item) : usoCategoria(item)}</small></div>
      ${podeEditar ? `<div class="catalogo-acoes">
        <button type="button" class="fin-icone" data-catalogo-acao="editar" title="${evento ? 'Editar' : 'Renomear'}" aria-label="${evento ? 'Editar' : 'Renomear'} ${escapeHtml(item.nome)}">${svgIcone('editar')}</button>
        <button type="button" class="fin-icone perigo" data-catalogo-acao="excluir" title="Excluir" aria-label="Excluir ${escapeHtml(item.nome)}">${svgIcone('lixo')}</button>
      </div>` : ''}
    </div>
  </div>`;
}
function renderizarCategoriasProduto() {
  const lista = document.getElementById('lista-categorias');
  if (!lista) return;
  const editar = pode('estoque', 'editar');
  lista.innerHTML = categoriasProdutoState.length ? categoriasProdutoState.map((c) => htmlItemCatalogo('categoria', c, editar)).join('') : '<p class="field-help">Nenhuma categoria cadastrada.</p>';
}
function preencherSelectsCategoria() {
  const nomes = categoriasProdutoState.map((c) => c.nome);
  document.querySelectorAll('[data-select-categoria]').forEach((select) => {
    const atual = select.value;
    const html = nomes.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
    if (select.dataset.opcoes === html) return;
    select.innerHTML = html; select.dataset.opcoes = html;
    if (nomes.includes(atual)) select.value = atual;
  });
}
async function carregarCategoriasProduto(forcar = false) {
  try {
    const r = await fetch(`${API_URL}/categorias-produto`);
    if (!r.ok) return;
    const dados = await r.json();
    const assinatura = JSON.stringify([dados, pode('estoque', 'editar')]);
    if (!forcar && assinatura === categoriasAssinatura) return;
    categoriasAssinatura = assinatura;
    categoriasProdutoState = dados;
    preencherSelectsCategoria();
    // Não atrapalha quem está renomeando ou escolhendo para onde mover.
    if (!document.querySelector('#lista-categorias .catalogo-item.editando')) renderizarCategoriasProduto();
    if (typeof modelosAssinatura !== 'undefined') modelosAssinatura = '';
  } catch (_) { /* tenta de novo no próximo ciclo */ }
}
function renderizarTiposEvento() {
  const lista = document.getElementById('lista-tipos-evento');
  const editar = pode('eventos', 'editar');
  lista.innerHTML = tiposEventoState.map((t) => htmlItemCatalogo('evento', t, editar)).join('') || '<p class="field-help">Nenhum tipo cadastrado.</p>';
  const paleta = document.getElementById('tipo-evento-cores');
  const usadas = new Set(tiposEventoState.map((t) => t.cor));
  const sugerida = coresTipoEvento.find((c) => !usadas.has(c)) || coresTipoEvento[0];
  if (!paleta.querySelector('input:checked')) paleta.innerHTML = htmlPaletaCores('tipo-evento-cor-nova', sugerida);
}
async function abrirTiposEvento() {
  await carregarTiposEvento();
  document.getElementById('tipo-evento-cores').innerHTML = '';
  renderizarTiposEvento();
  abrirDialogo('modal-tipos-evento');
}
const CATALOGOS = {
  categoria: {
    rota: 'categorias-produto', estado: () => categoriasProdutoState, recarregar: () => carregarCategoriasProduto(true),
    depois: () => { carregarProdutos(); carregarModelos(); }, rotuloMover: () => 'Mover tudo para'
  },
  evento: {
    rota: 'tipos-evento', estado: () => tiposEventoState,
    recarregar: async () => { carregarTiposEvento.assinatura = ''; await carregarTiposEvento(); renderizarTiposEvento(); },
    depois: () => { eventosAssinatura = ''; atualizarTiposNoFormEvento(); carregarEventos(); }, rotuloMover: (n) => `Mover ${n === 1 ? 'o evento' : `os ${n} eventos`} para`
  }
};
async function enviarCatalogo(tipo, metodo, caminho, corpo) {
  const r = await fetch(`${API_URL}/${CATALOGOS[tipo].rota}${caminho}`, { method: metodo, headers: getHeadersComUsuario(), body: corpo ? JSON.stringify(corpo) : undefined });
  const resultado = await r.json().catch(() => ({}));
  if (!r.ok) { showToast(resultado.error || 'Não foi possível salvar.', 'error'); return null; }
  showToast(resultado.mensagem || 'Pronto.');
  await CATALOGOS[tipo].recarregar();
  CATALOGOS[tipo].depois();
  return resultado;
}
function abrirEdicaoCatalogo(linha, tipo, item) {
  linha.classList.add('editando');
  const evento = tipo === 'evento';
  linha.innerHTML = `<form class="catalogo-form" data-catalogo-form="editar">
    <input type="text" maxlength="40" value="${escapeHtml(item.nome)}" aria-label="Nome" data-campo="nome">
    ${evento ? `<div class="tipo-cores">${htmlPaletaCores(`cor-tipo-${item.id}`, item.cor)}</div>` : ''}
    <div class="catalogo-form-acoes"><button type="button" class="btn btn-sm btn-secondary" data-catalogo-acao="cancelar">Cancelar</button><button type="submit" class="btn btn-sm btn-accent">Salvar</button></div>
  </form>`;
  const campo = linha.querySelector('[data-campo="nome"]');
  campo.focus(); campo.select();
}
function abrirExclusaoCatalogo(linha, tipo, item) {
  if (!item.em_uso) {
    if (confirm(`Excluir "${item.nome}"?`)) enviarCatalogo(tipo, 'DELETE', `/${item.id}`);
    return;
  }
  const outros = CATALOGOS[tipo].estado().filter((x) => x.id !== item.id);
  if (!outros.length) return showToast('Cadastre outra opção antes: o que está aqui precisa ir para algum lugar.', 'error');
  linha.classList.add('editando');
  linha.innerHTML = `<form class="catalogo-form catalogo-mover" data-catalogo-form="excluir">
    <p><strong>${escapeHtml(item.nome)}</strong> está em uso (${tipo === 'evento' ? usoTipoEvento(item) : usoCategoria(item)}). ${CATALOGOS[tipo].rotuloMover(item.em_uso)}:</p>
    <select data-campo="destino" aria-label="Para onde mover">${outros.map((o) => `<option value="${o.id}">${escapeHtml(o.nome)}</option>`).join('')}</select>
    <div class="catalogo-form-acoes"><button type="button" class="btn btn-sm btn-secondary" data-catalogo-acao="cancelar">Cancelar</button><button type="submit" class="btn btn-sm btn-danger">Mover e excluir</button></div>
  </form>`;
  linha.querySelector('select').focus();
}
function ligarCatalogo(container) {
  container.addEventListener('click', (e) => {
    const botao = e.target.closest('[data-catalogo-acao]');
    if (!botao) return;
    const linha = botao.closest('.catalogo-item');
    const tipo = linha.dataset.catalogo;
    const item = CATALOGOS[tipo].estado().find((x) => x.id === Number(linha.dataset.id));
    if (!item) return;
    const acao = botao.dataset.catalogoAcao;
    if (acao === 'editar') abrirEdicaoCatalogo(linha, tipo, item);
    if (acao === 'excluir') abrirExclusaoCatalogo(linha, tipo, item);
    if (acao === 'cancelar') { linha.outerHTML = htmlItemCatalogo(tipo, item, true); }
  });
  container.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const linha = form.closest('.catalogo-item');
    const tipo = linha.dataset.catalogo;
    const id = Number(linha.dataset.id);
    if (form.dataset.catalogoForm === 'editar') {
      const nome = form.querySelector('[data-campo="nome"]').value.trim();
      if (!nome) return showToast('Informe o nome.', 'error');
      const cor = form.querySelector('input[type="radio"]:checked')?.value;
      await enviarCatalogo(tipo, 'PUT', `/${id}`, tipo === 'evento' ? { nome, cor } : { nome });
    } else {
      await enviarCatalogo(tipo, 'DELETE', `/${id}?mover_para=${form.querySelector('[data-campo="destino"]').value}`);
    }
  });
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && e.target.closest('.catalogo-item.editando')) { e.stopPropagation(); e.target.closest('.catalogo-item').querySelector('[data-catalogo-acao="cancelar"]')?.click(); }
  });
}
ligarCatalogo(document.getElementById('lista-categorias'));
ligarCatalogo(document.getElementById('lista-tipos-evento'));
document.getElementById('form-categoria').addEventListener('submit', async (e) => {
  e.preventDefault();
  const campo = document.getElementById('categoria-nome');
  if (!campo.value.trim()) { campo.focus(); return showToast('Escreva o nome da categoria.', 'error'); }
  if (await enviarCatalogo('categoria', 'POST', '', { nome: campo.value })) campo.value = '';
});
document.getElementById('form-tipo-evento').addEventListener('submit', async (e) => {
  e.preventDefault();
  const campo = document.getElementById('tipo-evento-nome');
  if (!campo.value.trim()) { campo.focus(); return showToast('Escreva o nome do tipo.', 'error'); }
  const cor = document.querySelector('input[name="tipo-evento-cor-nova"]:checked')?.value || coresTipoEvento[0];
  if (await enviarCatalogo('evento', 'POST', '', { nome: campo.value, cor })) { campo.value = ''; document.getElementById('tipo-evento-cores').innerHTML = ''; renderizarTiposEvento(); }
});
document.querySelectorAll('[data-ir-categorias]').forEach((b) => b.addEventListener('click', () => { abrirPainelEstoque('categorias'); document.getElementById('categoria-nome')?.focus(); }));
document.getElementById('evento-tipos-gerenciar').addEventListener('click', abrirTiposEvento);
document.getElementById('evento-tipos-link').addEventListener('click', abrirTiposEvento);
// Mudou a lista com o formulário do evento aberto: atualiza as opções sem perder a escolha.
function atualizarTiposNoFormEvento() {
  const area = document.getElementById('evento-tipos');
  if (!area || document.getElementById('modal-evento-form').classList.contains('hidden')) return;
  const marcado = area.querySelector('input:checked')?.value;
  const atual = marcado && TIPOS_EVENTO[marcado] ? marcado : Object.keys(TIPOS_EVENTO)[0];
  area.innerHTML = Object.entries(TIPOS_EVENTO).map(([chave, t]) => `<label class="ev-tipo-opcao" style="--cor:${t.cor}"><input type="radio" name="evento-tipo" value="${chave}"${chave === atual ? ' checked' : ''}><span><i></i>${escapeHtml(t.nome)}</span></label>`).join('');
}

async function excluirCor(id) {
  const cor = coresState.find((c) => c.id_cor === id);
  if (!confirm(`Excluir a cor "${cor?.nome || id}" da lista?`)) return;
  const resposta = await fetch(`${API_URL}/cores/${id}`, { method: 'DELETE', headers: getHeadersComUsuario() });
  const resultado = await resposta.json();
  if (!resposta.ok) return showToast(resultado.error || 'Não foi possível excluir a cor.', 'error');
  showToast(resultado.mensagem || 'Cor excluída.');
  await carregarCores();
}
document.getElementById('form-cor')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!pode('estoque', 'editar')) return showToast('Você não pode cadastrar cores.', 'error');
  const campo = document.getElementById('cor-nome');
  const resposta = await fetch(`${API_URL}/cores`, { method: 'POST', headers: getHeadersComUsuario(), body: JSON.stringify({ nome: campo.value }) });
  const resultado = await resposta.json();
  if (!resposta.ok) return showToast(resultado.error || 'Não foi possível cadastrar a cor.', 'error');
  showToast(`Cor "${resultado.nome}" cadastrada.`);
  campo.value = '';
  await carregarCores();
});
document.getElementById('modelo-cores')?.addEventListener('change', () => atualizarPreviaModelo());

// Mesma regra do servidor: separa por vírgula, ponto e vírgula ou quebra de linha,
// tira vazios e repetidos (sem diferenciar maiúsculas).
function listaDeRotulos(texto) {
  const vistos = new Set();
  const lista = [];
  String(texto || '').split(/[,;\n]/).forEach((parte) => {
    const rotulo = parte.trim().replace(/\s+/g, ' ');
    if (rotulo && !vistos.has(rotulo.toLowerCase())) {
      vistos.add(rotulo.toLowerCase());
      lista.push(rotulo);
    }
  });
  return lista;
}

function atualizarPreviaModelo() {
  const previa = document.getElementById('modelo-previa');
  if (!previa) return;
  const cores = coresSelecionadas('modelo-cores');
  const tamanhos = listaDeRotulos(document.getElementById('modelo-tamanhos').value);
  if (!cores.length && !tamanhos.length) {
    previa.textContent = 'Informe ao menos uma cor ou um tamanho.';
    return;
  }
  const total = Math.max(cores.length, 1) * Math.max(tamanhos.length, 1);
  const nome = document.getElementById('modelo-nome').value.trim() || 'Modelo';
  const exemplo = [nome, cores[0], tamanhos[0]].filter(Boolean).join(' - ');
  const partes = [];
  if (cores.length) partes.push(`${cores.length} ${cores.length === 1 ? 'cor' : 'cores'}`);
  if (tamanhos.length) partes.push(`${tamanhos.length} ${tamanhos.length === 1 ? 'tamanho' : 'tamanhos'}`);
  previa.textContent = `Serão criadas ${total} ${total === 1 ? 'peça' : 'peças'} (${partes.join(' x ')}), todas com estoque 0. Exemplo: ${exemplo}`;
}

['modelo-nome', 'modelo-tamanhos'].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', atualizarPreviaModelo);
});
document.querySelectorAll('.atalhos-tamanhos [data-tamanhos]').forEach((botao) => {
  botao.addEventListener('click', () => {
    const campo = document.getElementById('modelo-tamanhos');
    campo.value = botao.dataset.tamanhos;
    atualizarPreviaModelo();
    campo.focus();
  });
});
atualizarPreviaModelo();

document.getElementById('form-modelo')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!pode('estoque', 'editar')) {
    showToast('Você não pode cadastrar modelos.', 'error');
    return;
  }
  const dados = {
    nome: document.getElementById('modelo-nome').value,
    categoria: document.getElementById('modelo-categoria').value,
    preco: document.getElementById('modelo-preco').value,
    cores: coresSelecionadas('modelo-cores'),
    tamanhos: listaDeRotulos(document.getElementById('modelo-tamanhos').value)
  };
  const resposta = await fetch(`${API_URL}/modelos`, { method: 'POST', headers: getHeadersComUsuario(), body: JSON.stringify(dados) });
  const resultado = await resposta.json();
  if (!resposta.ok) return showToast(resultado.error || 'Não foi possível cadastrar o modelo.', 'error');
  const fotoDoModelo = document.getElementById('modelo-foto').files[0];
  if (fotoDoModelo && resultado.id) {
    try { await enviarFoto(`/modelos/${resultado.id}/foto`, fotoDoModelo); } catch (erro) { showToast(`Modelo cadastrado, mas a foto não foi salva: ${erro.message}`, 'error'); }
  }
  showToast(`Modelo cadastrado com ${resultado.variacoes_criadas} ${resultado.variacoes_criadas === 1 ? 'peça' : 'peças'}!`);
  e.target.reset();
  limparPreviaFoto('modelo-foto-previa');
  atualizarPreviaModelo();
  await carregarTudo();
});

async function carregarModelos() {
  const resposta = await fetch(`${API_URL}/modelos`);
  const dados = await resposta.json();
  if (!resposta.ok || !Array.isArray(dados)) return;
  modelosState = dados;
  renderizarModelos();
}

function htmlModelo(modelo, admin) {
  const nomeSeguro = escapeHtml(modelo.nome);
  const cores = [...new Set(modelo.variacoes.map((v) => v.cor))];
  const jaNoModelo = new Set(cores.map((c) => String(c).toLowerCase()));
  const opcoesCores = coresState.length
    ? coresState.map((c) => { const ja = jaNoModelo.has(c.nome.toLowerCase()); return `<label class="cor-opcao${ja ? ' cor-opcao-desativada' : ''}"${ja ? ' title="Já está neste modelo"' : ''}><input type="checkbox" name="cores" value="${escapeHtml(c.nome)}"${ja ? ' checked disabled' : ''}><span>${escapeHtml(c.nome)}</span></label>`; }).join('')
    : '<span class="field-help">Nenhuma cor cadastrada. Cadastre em "Cores cadastradas".</span>';
  const tamanhos = ordenarTamanhos([...new Set(modelo.variacoes.map((v) => v.tamanho))]);
  const porChave = new Map(modelo.variacoes.map((v) => [`${v.cor}\u0000${v.tamanho}`, v]));
  const cabecalho = tamanhos.map((t) => `<th>${escapeHtml(t) || 'Estoque'}</th>`).join('');
  const linhas = cores.map((cor) => {
    const celulas = tamanhos.map((tamanho) => {
      const v = porChave.get(`${cor}\u0000${tamanho}`);
      if (!v) return '<td><span class="celula-vazia">-</span></td>';
      const classe = !v.ativo ? 'inativa' : (nivelEstoque(v.estoque) !== 'ok' ? 'baixo' : '');
      // Campo de quantidade para lançar entrada/saída direto na grade.
      const campo = admin && v.ativo ? `<input type="number" class="lote-input" min="0" step="1" inputmode="numeric" placeholder="+" data-lote="${v.id}" data-campo="lote:${v.id}" value="${loteEstoque.get(Number(v.id)) || ''}" aria-label="Quantidade para ${escapeHtml(v.nome)}">` : '';
      return `<td class="celula-lote${loteEstoque.has(Number(v.id)) ? ' tem-lote' : ''}"><span class="celula-estoque ${classe}" title="${escapeHtml(v.nome)}: ${Number(v.estoque)} em estoque">${Number(v.estoque)}</span>${campo}</td>`;
    }).join('');
    const total = modelo.variacoes.filter((v) => v.cor === cor).reduce((soma, v) => soma + Number(v.estoque), 0);
    const fotoDaCor = modelo.variacoes.find((v) => v.cor === cor && v.id_foto)?.id_foto ?? modelo.id_foto;
    return `<tr><td>${fotoDaCor ? `${htmlMiniatura(fotoDaCor, `${modelo.nome} ${cor}`)} ` : ''}${escapeHtml(cor) || 'Sem cor'}</td>${celulas}<td><strong>${total}</strong></td></tr>`;
  }).join('');

  const nomesCategorias = categoriasProdutoState.length ? categoriasProdutoState.map((c) => c.nome) : CATEGORIAS_MODELO;
  const categorias = nomesCategorias.includes(modelo.categoria) ? nomesCategorias : [...nomesCategorias, modelo.categoria];
  const opcoes = categorias.map((c) => `<option value="${escapeHtml(c)}"${c === modelo.categoria ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('');
  const linhaFoto = (rotulo, idFoto, caminho, propria) => `<div class="foto-gestao"><span class="foto-gestao-rotulo">${escapeHtml(rotulo)}</span>${htmlMiniatura(idFoto, rotulo)}<button type="button" class="btn btn-sm btn-secondary" data-caminho="${escapeHtml(caminho)}" onclick="escolherFoto(this.dataset.caminho)">${idFoto ? 'Trocar' : 'Enviar foto'}</button>${propria ? `<button type="button" class="btn btn-sm btn-danger" data-caminho="${escapeHtml(caminho)}" onclick="apagarFoto(this.dataset.caminho)">Remover</button>` : ''}</div>`;
  const fotosHtml = `<div class="modelo-fotos"><h4>Fotos (opcional)</h4><small class="field-help" style="display: block; margin-bottom: 0.5rem;">A foto do modelo vale para todas as peças. A foto de uma cor tem prioridade nas peças daquela cor.</small>${linhaFoto('Modelo (padrão)', modelo.id_foto, `/modelos/${modelo.id}/foto`, Boolean(modelo.id_foto))}${cores.filter(Boolean).map((cor) => linhaFoto(cor, modelo.variacoes.find((v) => v.cor === cor && v.id_foto)?.id_foto ?? modelo.id_foto, `/modelos/${modelo.id}/foto?cor=${encodeURIComponent(cor)}`, modelo.variacoes.some((v) => v.cor === cor && v.id_foto))).join('')}</div>`;
  const edicao = admin ? `
    <details class="modelo-editar" data-modelo="${modelo.id}">
      <summary>Adicionar cores e tamanhos ou editar o modelo</summary>
      <div class="modelo-editar-corpo">
        ${fotosHtml}
        <form onsubmit="adicionarVariacoes(event, ${modelo.id})">
          <h4>Adicionar cores e tamanhos</h4>
          <div class="form-group"><label>Novas cores</label><div class="cores-seletor">${opcoesCores}</div></div>
          <div class="form-group"><label>Novos tamanhos</label><input type="text" name="tamanhos" data-campo="${modelo.id}:tamanhos" placeholder="Ex.: XG" autocomplete="off"></div>
          <small class="field-help" style="display: block;">Cores novas valem para todos os tamanhos do modelo, e tamanhos novos para todas as cores. O estoque das novas peças começa em 0.</small>
          <button type="submit" class="btn btn-primary btn-sm" style="margin-top: 0.75rem; width: 100%;">Adicionar</button>
        </form>
        <form onsubmit="salvarModelo(event, ${modelo.id})">
          <h4>Editar modelo</h4>
          <div class="form-group"><label>Nome do modelo</label><input type="text" name="nome" data-campo="${modelo.id}:nome" maxlength="60" value="${nomeSeguro}" required></div>
          <div class="form-group"><label>Categoria</label><select name="categoria" data-campo="${modelo.id}:categoria" required>${opcoes}</select></div>
          <div class="form-group"><label>Preço de venda (R$)</label><input type="number" name="preco" data-campo="${modelo.id}:preco" min="0" step="0.01" value="${Number(modelo.preco).toFixed(2)}" required></div>
          <small class="field-help" style="display: block;">Nome, categoria e preço valem para todas as peças do modelo. Vendas já feitas não mudam de valor.</small>
          <button type="submit" class="btn btn-warning btn-sm" style="margin-top: 0.75rem; width: 100%;">Salvar alterações</button>
        </form>
      </div>
    </details>` : '';

  return `
    <div class="modelo-bloco">
      <div class="modelo-topo">
        <div>
          <div class="modelo-titulo">${modelo.id_foto ? `${htmlMiniatura(modelo.id_foto, modelo.nome)} ` : ''}${nomeSeguro} <span class="badge ${modelo.ativo ? 'badge-pago' : 'badge-cancelado'}">${modelo.ativo ? 'Ativo' : 'Inativo'}</span></div>
          <div class="modelo-meta">${escapeHtml(modelo.categoria)} - R$ ${Number(modelo.preco).toFixed(2)} - ${modelo.variacoes.length} ${modelo.variacoes.length === 1 ? 'peça' : 'peças'} - ${Number(modelo.total_estoque)} un. em estoque</div>
        </div>
        <div class="modelo-acoes">${admin ? `<button type="button" class="btn btn-sm ${modelo.ativo ? 'btn-danger' : 'btn-success'}" onclick="alternarModeloAtivo(${modelo.id}, ${!modelo.ativo})">${modelo.ativo ? 'Inativar modelo' : 'Reativar modelo'}</button>` : ''}</div>
      </div>
      <div class="table-responsive">
        <table class="matriz-variacoes">
          <thead><tr><th>Cor</th>${cabecalho}<th>Total</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
      ${edicao}
    </div>`;
}

// A tela é atualizada a cada 3 segundos. Só redesenha quando algo mudou e, se
// precisar redesenhar, devolve o que a pessoa estava digitando.
function renderizarModelos() {
  const area = document.getElementById('lista-modelos');
  if (!area) return;
  const filtro = document.getElementById('filtro-produto-status')?.value || 'ativos';
  const admin = pode('estoque', 'editar');
  const filtros = filtrosEstoque();
  const assinatura = JSON.stringify([modelosState, filtro, admin, coresState, filtros]);
  if (assinatura === modelosAssinatura) return;
  modelosAssinatura = assinatura;

  const abertos = new Set([...area.querySelectorAll('details[open]')].map((d) => d.dataset.modelo));
  const coresMarcadas = new Set([...area.querySelectorAll('input[name="cores"]:checked:not(:disabled)')].map((i) => `${i.closest('details')?.dataset.modelo}:${i.value}`));
  const foiEditado = (el) => (el.tagName === 'SELECT' ? !el.options[el.selectedIndex]?.defaultSelected : el.value !== el.defaultValue);
  const digitado = new Map([...area.querySelectorAll('[data-campo]')].filter(foiEditado).map((el) => [el.dataset.campo, el.value]));
  const ativo = document.activeElement && area.contains(document.activeElement) ? document.activeElement : null;
  const foco = ativo?.dataset?.campo ? { campo: ativo.dataset.campo, inicio: ativo.selectionStart, fim: ativo.selectionEnd } : null;

  const visiveis = modelosState.filter((m) => filtro === 'todos' || (filtro === 'inativos' ? !m.ativo : m.ativo)).filter((m) => modeloPassaFiltros(m, filtros));
  area.innerHTML = visiveis.length
    ? visiveis.map((m) => htmlModelo(m, admin)).join('')
    : `<p class="field-help estoque-vazio">${modelosState.length ? 'Nenhum modelo com estes filtros.' : 'Nenhum modelo cadastrado ainda. Cadastre em "Cadastrar produto".'}</p>`;

  area.querySelectorAll('details').forEach((d) => { if (abertos.has(d.dataset.modelo)) d.open = true; });
  area.querySelectorAll('input[name="cores"]:not(:disabled)').forEach((i) => { if (coresMarcadas.has(`${i.closest('details')?.dataset.modelo}:${i.value}`)) i.checked = true; });
  area.querySelectorAll('[data-campo]').forEach((el) => { if (digitado.has(el.dataset.campo)) el.value = digitado.get(el.dataset.campo); });
  if (foco) {
    const el = [...area.querySelectorAll('[data-campo]')].find((item) => item.dataset.campo === foco.campo);
    if (el) {
      el.focus();
      try { if (foco.inicio !== null && foco.inicio !== undefined) el.setSelectionRange(foco.inicio, foco.fim); } catch (_) { /* select e number não têm cursor */ }
    }
  }
}


async function adicionarVariacoes(evento, id) {
  evento.preventDefault();
  const form = evento.target;
  const dados = { cores: coresSelecionadas(form), tamanhos: listaDeRotulos(form.elements.tamanhos.value) };
  const resposta = await fetch(`${API_URL}/modelos/${id}/variacoes`, { method: 'POST', headers: getHeadersComUsuario(), body: JSON.stringify(dados) });
  const resultado = await resposta.json();
  if (!resposta.ok) return showToast(resultado.error || 'Não foi possível adicionar as variações.', 'error');
  const criadas = resultado.variacoes_criadas;
  showToast(criadas ? `${criadas} ${criadas === 1 ? 'nova peça criada' : 'novas peças criadas'}.` : 'Essas cores e tamanhos já existem neste modelo.');
  form.reset();
  await carregarTudo();
}

async function salvarModelo(evento, id) {
  evento.preventDefault();
  const campos = evento.target.elements;
  const dados = { nome: campos.nome.value, categoria: campos.categoria.value, preco: campos.preco.value };
  const resposta = await fetch(`${API_URL}/modelos/${id}`, { method: 'PUT', headers: getHeadersComUsuario(), body: JSON.stringify(dados) });
  const resultado = await resposta.json();
  if (!resposta.ok) return showToast(resultado.error || 'Não foi possível salvar o modelo.', 'error');
  showToast(resultado.mensagem);
  modelosAssinatura = '';
  await carregarTudo();
}

async function alternarModeloAtivo(id, ativo) {
  const pergunta = ativo ? 'Reativar todas as peças deste modelo?' : 'Inativar este modelo? Todas as cores e tamanhos saem das vendas e das movimentações, mas o histórico e o saldo são preservados.';
  if (!confirm(pergunta)) return;
  const resposta = await fetch(`${API_URL}/modelos/${id}/status`, { method: 'PUT', headers: getHeadersComUsuario(), body: JSON.stringify({ ativo }) });
  const resultado = await resposta.json();
  if (!resposta.ok) return showToast(resultado.error || 'Não foi possível alterar a situação do modelo.', 'error');
  showToast(resultado.mensagem);
  await carregarTudo();
}


// ================= VENDAS INTELIGENTES =================
let precoVendaAtual = 0;
let descontoVendaAtual = null;
// Carrinho do PDV: uma venda pode levar vários produtos. O brinde (quando o cliente
// ganha) é escolhido na hora de finalizar e nunca entra no subtotal.
let itensVenda = []; // { produto_id, nome, preco, quantidade }
let brindeVenda = null; // { produto_id, nome }
let brindeMinimo = 3;
// Produto e quantidade digitados nos campos mas ainda não adicionados ao carrinho.
function linhaPendenteVenda() {
  const id = Number(document.getElementById('venda-produto-id').value);
  const quantidade = Number(document.getElementById('venda-qtde').value);
  if (!id || !Number.isInteger(quantidade) || quantidade < 1) return null;
  return { produto_id: id, nome: document.getElementById('venda-produto-busca').value.replace(/\s+-\s+R\$.*$/, ''), preco: precoVendaAtual, quantidade };
}
function somarLinhaNoCarrinho(lista, linha) {
  const existente = lista.find((item) => item.produto_id === linha.produto_id);
  if (existente) existente.quantidade += linha.quantidade; else lista.push({ ...linha });
  return lista;
}
// Itens da venda como ela seria registrada agora (carrinho + linha pendente).
function itensDaVendaAtual() {
  const lista = itensVenda.map((item) => ({ ...item }));
  const pendente = linhaPendenteVenda();
  return pendente ? somarLinhaNoCarrinho(lista, pendente) : lista;
}
function totalPecasVenda(lista = itensVenda) { return lista.reduce((soma, item) => soma + item.quantidade, 0); }
function subtotalDosItens(lista) { return Math.round(lista.reduce((soma, item) => soma + Math.round(item.preco * item.quantidade * 100), 0)) / 100; }
function atualizarResumoVenda() {
  const itens = itensDaVendaAtual();
  if (!itens.length) {
    ['venda-subtotal', 'venda-desconto-valor', 'venda-total'].forEach((id) => { document.getElementById(id).value = ''; });
    atualizarPainelVenda();
    return;
  }
  const subtotal = subtotalDosItens(itens);
  const percentual = Number(descontoVendaAtual?.percentual || 0);
  let desconto = Math.round(subtotal * percentual) / 100;
  if (descontoVendaAtual?.reais !== undefined) {
    // Desconto em reais nunca passa do subtotal (se o carrinho diminuir, ele acompanha).
    descontoVendaAtual.reais = Math.min(descontoVendaAtual.reais, subtotal);
    desconto = descontoVendaAtual.reais;
    document.getElementById('venda-desconto-status').textContent = `Desconto de ${formatarMoeda(desconto)} aplicado`;
  }
  document.getElementById('venda-subtotal').value = subtotal.toFixed(2);
  document.getElementById('venda-desconto-valor').value = desconto.toFixed(2);
  document.getElementById('venda-total').value = Math.max(0, subtotal - desconto).toFixed(2);
  atualizarPainelVenda();
}
function limparDescontoVenda() {
  descontoVendaAtual = null;
  document.getElementById('venda-desconto-codigo').value = '';
  document.getElementById('venda-desconto-manual-percentual').value = '';
  document.getElementById('venda-desconto-reais').value = '';
  document.getElementById('venda-desconto-status').textContent = '';
  document.getElementById('remover-desconto').classList.add('hidden');
  document.getElementById('aplicar-desconto').classList.remove('hidden');
  document.getElementById('aplicar-desconto-manual').classList.remove('hidden');
  document.getElementById('aplicar-desconto-reais').classList.remove('hidden');
  atualizarResumoVenda();
}

function selecionarTipoDesconto(tipo) {
  // Três formas de desconto, uma por venda: cupom de influencer, percentual manual ou valor em R$.
  ['cupom', 'manual', 'reais'].forEach((nome) => {
    const ativo = nome === tipo;
    document.getElementById(`aba-desconto-${nome}`).classList.toggle('active', ativo);
    document.getElementById(`aba-desconto-${nome}`).setAttribute('aria-selected', String(ativo));
    document.getElementById(`painel-desconto-${nome}`).classList.toggle('hidden', !ativo);
  });
  limparDescontoVenda();
}
document.getElementById('aba-desconto-cupom').addEventListener('click', () => selecionarTipoDesconto('cupom'));
document.getElementById('aba-desconto-manual').addEventListener('click', () => selecionarTipoDesconto('manual'));
document.getElementById('aba-desconto-reais').addEventListener('click', () => selecionarTipoDesconto('reais'));

// Lógica para detectar quando o usuário escolhe um produto na barra de pesquisa
document.getElementById('venda-produto-busca').addEventListener('input', function() {
    const val = this.value;
    const options = document.getElementById('lista-produtos').options;
    let produtoEncontrado = null;
    
    // Procura na datalist oculta qual opção corresponde exatamente ao que foi selecionado
    for (let i = 0; i < options.length; i++) {
        if (options[i].value === val) {
            produtoEncontrado = options[i];
            break;
        }
    }
    
    // Se encontrou o produto, extrai o ID, o Preço e calcula sozinho o total
    if (produtoEncontrado) {
        const id = produtoEncontrado.getAttribute('data-id');
        const preco = parseFloat(produtoEncontrado.getAttribute('data-preco'));
        
        document.getElementById('venda-produto-id').value = id; // Guarda o ID verdadeiro oculto
        atualizarFotoProduto('venda-foto', id);
        
        precoVendaAtual = preco;
        atualizarResumoVenda();
    } else {
        // Se o usuário apagar o campo, limpa os totais
        document.getElementById('venda-produto-id').value = '';
        atualizarFotoProduto('venda-foto', '');
        precoVendaAtual = 0;
        atualizarResumoVenda();
    }
});

// Se ele mudar a quantidade, recalcula o preço na hora
document.getElementById('venda-qtde').addEventListener('input', function() {
    atualizarResumoVenda();
});

document.getElementById('aplicar-desconto').addEventListener('click', async () => {
  const codigo = document.getElementById('venda-desconto-codigo').value.trim();
  if (!codigo) return showToast('Informe um código de desconto.', 'error');
  const resposta = await fetch(`${API_URL}/descontos/validar`, { method: 'POST', headers: getHeadersComUsuario(), body: JSON.stringify({ codigo }) });
  const resultado = await resposta.json();
  if (!resposta.ok) return showToast(resultado.error || 'Desconto inválido.', 'error');
  descontoVendaAtual = resultado;
  document.getElementById('aplicar-desconto-reais').classList.add('hidden');
  document.getElementById('venda-desconto-codigo').value = resultado.codigo;
  document.getElementById('venda-desconto-status').textContent = `${resultado.nome}: ${Number(resultado.percentual).toFixed(2)}% aplicado`;
  document.getElementById('remover-desconto').classList.remove('hidden');
  document.getElementById('aplicar-desconto').classList.add('hidden');
  document.getElementById('aplicar-desconto-manual').classList.add('hidden');
  atualizarResumoVenda();
});
document.getElementById('aplicar-desconto-manual').addEventListener('click', () => {
  const percentual = Number(document.getElementById('venda-desconto-manual-percentual').value);
  if (!Number.isFinite(percentual) || percentual <= 0 || percentual > 100) {
    return showToast('Informe um percentual maior que 0 e de até 100%.', 'error');
  }
  descontoVendaAtual = { percentual, manual: true };
  document.getElementById('aplicar-desconto-reais').classList.add('hidden');
  document.getElementById('venda-desconto-status').textContent = `Desconto manual de ${percentual.toFixed(2)}% aplicado`;
  document.getElementById('remover-desconto').classList.remove('hidden');
  document.getElementById('aplicar-desconto').classList.add('hidden');
  document.getElementById('aplicar-desconto-manual').classList.add('hidden');
  atualizarResumoVenda();
});
document.getElementById('aplicar-desconto-reais').addEventListener('click', () => {
  const reais = Math.round(Number(document.getElementById('venda-desconto-reais').value) * 100) / 100;
  const subtotal = Number(document.getElementById('venda-subtotal').value) || 0;
  if (!Number.isFinite(reais) || reais <= 0) return showToast('Informe um desconto em reais maior que zero.', 'error');
  if (!subtotal) return showToast('Adicione o produto antes de aplicar o desconto em reais.', 'error');
  if (reais > subtotal) return showToast(`O desconto não pode passar do subtotal (${formatarMoeda(subtotal)}).`, 'error');
  descontoVendaAtual = { reais };
  document.getElementById('remover-desconto').classList.remove('hidden');
  document.getElementById('aplicar-desconto').classList.add('hidden');
  document.getElementById('aplicar-desconto-manual').classList.add('hidden');
  document.getElementById('aplicar-desconto-reais').classList.add('hidden');
  atualizarResumoVenda();
});
document.getElementById('remover-desconto').addEventListener('click', limparDescontoVenda);

// ---------------------------------------------------------------------------
// CPF na nota e confirmação da venda.
// Antes de cada venda o sistema pergunta se o cliente quer CPF na nota: se sim,
// o CPF (validado) fica gravado na venda; se não, a venda segue sem CPF.
// Antes de registrar, uma tela mostra produto, quantidade, desconto e valor para
// o cliente conferir; só o botão "Confirmar venda" grava.
// ---------------------------------------------------------------------------
var cpfVenda = { respondido: false, cpf: null };

function validarCpfNota(valor) {
  const cpf = String(valor || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i += 1) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(cpf.slice(0, 9)) === Number(cpf[9]) && digito(cpf.slice(0, 10)) === Number(cpf[10]);
}

function formatarCpfNota(valor) {
  const d = String(valor || '').replace(/[^0-9*]/g, '');
  if (d.length !== 11) return String(valor || '');
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function mascararDigitandoCpf(texto) {
  const d = String(texto || '').replace(/\D/g, '').slice(0, 11);
  const p = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9), d.slice(9, 11)];
  return p[0] + (p[1] ? `.${p[1]}` : '') + (p[2] ? `.${p[2]}` : '') + (p[3] ? `-${p[3]}` : '');
}

function abrirDialogo(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  document.body.classList.add('dialogo-aberto');
  const foco = el.querySelector('[data-foco]');
  if (foco) foco.focus();
}

function fecharDialogo(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
  if (!document.querySelector('.dialogo:not(.hidden)')) document.body.classList.remove('dialogo-aberto');
}

function atualizarBarraCpf() {
  const form = document.getElementById('form-venda');
  const resumo = document.getElementById('venda-cpf-resumo');
  const botao = document.getElementById('venda-cpf-alterar');
  if (!form || !resumo || !botao) return;
  if (!cpfVenda || !cpfVenda.respondido) {
    resumo.textContent = 'CPF na nota: pergunte ao cliente antes de começar a venda.';
    botao.textContent = 'Perguntar';
    form.setAttribute('inert', '');
    form.classList.add('venda-bloqueada');
    document.getElementById('pdv-catalogo')?.classList.add('venda-aguardando-cpf');
    document.getElementById('venda-cpf-barra')?.classList.add('pendente');
    return;
  }
  document.getElementById('pdv-catalogo')?.classList.remove('venda-aguardando-cpf');
  document.getElementById('venda-cpf-barra')?.classList.remove('pendente');
  resumo.textContent = cpfVenda.cpf ? `CPF na nota: ${formatarCpfNota(cpfVenda.cpf)}` : 'O cliente não quis CPF na nota.';
  botao.textContent = 'Alterar';
  form.removeAttribute('inert');
  form.classList.remove('venda-bloqueada');
}

function perguntarCpfNota() {
  const entrada = document.getElementById('cpf-nota-input');
  entrada.value = cpfVenda && cpfVenda.cpf ? formatarCpfNota(cpfVenda.cpf) : '';
  document.getElementById('cpf-nota-erro').textContent = '';
  const temCpf = Boolean(cpfVenda && cpfVenda.cpf);
  document.getElementById('cpf-campo-grupo').classList.toggle('hidden', !temCpf);
  document.getElementById('cpf-escolha').classList.toggle('hidden', temCpf);
  abrirDialogo('modal-cpf-nota');
}

function novaVendaCpf() {
  cpfVenda = { respondido: false, cpf: null };
  atualizarBarraCpf();
}

function salvarCpfNota() {
  const entrada = document.getElementById('cpf-nota-input');
  const erro = document.getElementById('cpf-nota-erro');
  if (!validarCpfNota(entrada.value)) {
    erro.textContent = 'CPF inválido. Confira os 11 números.';
    entrada.focus();
    return;
  }
  cpfVenda = { respondido: true, cpf: entrada.value.replace(/\D/g, '') };
  fecharDialogo('modal-cpf-nota');
  atualizarBarraCpf();
}

document.getElementById('cpf-quer-sim').addEventListener('click', () => {
  // Como no brinde: ao escolher "Sim", a pergunta dá lugar ao campo do CPF.
  document.getElementById('cpf-escolha').classList.add('hidden');
  document.getElementById('cpf-campo-grupo').classList.remove('hidden');
  document.getElementById('cpf-nota-input').focus();
});
document.getElementById('cpf-quer-nao').addEventListener('click', () => {
  cpfVenda = { respondido: true, cpf: null };
  fecharDialogo('modal-cpf-nota');
  atualizarBarraCpf();
});
document.getElementById('cpf-salvar').addEventListener('click', salvarCpfNota);
document.getElementById('cpf-voltar').addEventListener('click', () => {
  document.getElementById('cpf-campo-grupo').classList.add('hidden');
  document.getElementById('cpf-escolha').classList.remove('hidden');
  document.getElementById('cpf-quer-sim').focus();
});
document.getElementById('cpf-nota-input').addEventListener('input', (e) => {
  e.target.value = mascararDigitandoCpf(e.target.value);
  document.getElementById('cpf-nota-erro').textContent = '';
});
document.getElementById('cpf-nota-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); salvarCpfNota(); }
});
document.getElementById('venda-cpf-alterar').addEventListener('click', perguntarCpfNota);
document.querySelectorAll('[data-fechar-dialogo]').forEach((el) => el.addEventListener('click', () => fecharDialogo(el.dataset.fecharDialogo)));
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const aberto = document.querySelector('.dialogo:not(.hidden)');
  if (aberto) fecharDialogo(aberto.id);
});
atualizarBarraCpf();

function limparCamposDoProduto() {
  document.getElementById('venda-produto-busca').value = '';
  document.getElementById('venda-produto-id').value = '';
  document.getElementById('venda-qtde').value = '1';
  atualizarFotoProduto('venda-foto', '');
  precoVendaAtual = 0;
  const aviso = document.getElementById('venda-aviso-estoque');
  if (aviso) aviso.hidden = true;
}

function adicionarItemVenda() {
  const pendente = linhaPendenteVenda();
  if (!pendente) {
    showToast('Selecione um produto da lista e informe a quantidade.', 'error');
    return false;
  }
  somarLinhaNoCarrinho(itensVenda, pendente);
  brindeVenda = null;
  limparCamposDoProduto();
  renderizarItensVenda();
  atualizarResumoVenda();
  document.getElementById('venda-produto-busca').focus();
  return true;
}

function removerItemVenda(produtoId) {
  itensVenda = itensVenda.filter((item) => item.produto_id !== Number(produtoId));
  brindeVenda = null;
  renderizarItensVenda();
  atualizarResumoVenda();
}

function limparVendaEmAndamento() {
  itensVenda = [];
  brindeVenda = null;
  renderizarItensVenda();
}

document.getElementById('venda-adicionar-item').addEventListener('click', adicionarItemVenda);
document.getElementById('venda-itens').addEventListener('click', (evento) => {
  const botao = evento.target.closest('[data-remover-item]');
  if (botao) removerItemVenda(botao.dataset.removerItem);
});

function abrirConfirmacaoVenda() {
  const select = document.getElementById('venda-pagamento');
  const parcelasVisiveis = !document.getElementById('venda-parcelas-grupo').classList.contains('hidden');
  const parcelas = Number(document.getElementById('venda-parcelas').value) || 1;
  const detalhe = document.getElementById('venda-forma-detalhe').value.trim();
  const subtotal = Number(document.getElementById('venda-subtotal').value) || 0;
  const descontoValor = Number(document.getElementById('venda-desconto-valor').value) || 0;
  const total = Number(document.getElementById('venda-total').value) || 0;
  let descontoTexto = 'Sem desconto';
  if (descontoVendaAtual && descontoValor > 0) {
    if (descontoVendaAtual.reais !== undefined) {
      descontoTexto = `Valor em reais: − ${formatarMoeda(descontoValor)}`;
    } else {
      const origem = descontoVendaAtual.manual ? 'manual' : `cupom ${descontoVendaAtual.codigo}`;
      const percentualTexto = Number(descontoVendaAtual.percentual).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
      descontoTexto = `${percentualTexto}% (${origem}): − ${formatarMoeda(descontoValor)}`;
    }
  }
  let pagamentoTexto = select.options[select.selectedIndex] ? select.options[select.selectedIndex].text : select.value;
  if (parcelasVisiveis && parcelas > 1) pagamentoTexto += ` em ${parcelas}x`;
  if (detalhe && select.value === 'Outro') pagamentoTexto += ` (${detalhe})`;
  if (select.value === 'Diversificado') pagamentoTexto = `Diversificado: ${textoDivisao()}`;
  const linhas = itensVenda.map((item, indice) => [
    itensVenda.length === 1 ? 'Produto' : `Item ${indice + 1}`,
    `${item.nome} — ${item.quantidade} un × ${formatarMoeda(item.preco)}`
  ]);
  // O brinde aparece como linha de R$ 0,00 e não soma no subtotal.
  if (brindeVenda) linhas.push(['BRINDE', `${brindeVenda.nome} — 1 un × ${formatarMoeda(0)}`]);
  linhas.push(
    ['Peças cobradas', `${totalPecasVenda()} un`],
    ['Subtotal', formatarMoeda(subtotal)],
    ['Desconto', descontoTexto],
    ['Pagamento', pagamentoTexto],
    ['CPF na nota', cpfVenda.cpf ? formatarCpfNota(cpfVenda.cpf) : 'Sem CPF na nota']
  );
  if (eventosHoje.length) linhas.push(['Onde', eventoDaVendaAtual() ? `Evento: ${eventoDaVendaAtual().titulo}` : 'Loja']);
  document.getElementById('confirmar-venda-detalhes').innerHTML = linhas.map(([nome, valor]) => `<dt>${escapeHtml(nome)}</dt><dd>${escapeHtml(valor)}</dd>`).join('')
    + `<dt class="resumo-total">Total a pagar</dt><dd class="resumo-total">${escapeHtml(formatarMoeda(total))}</dd>`;
  abrirDialogo('modal-confirmar-venda');
}

// ---------------------------------------------------------------------------
// Brinde: a partir da quantidade mínima de peças (parâmetro do sistema, padrão 3),
// antes da tela de resumo o caixa pergunta "Cliente ganhou brinde?". Se sim,
// escolhe o produto; ele baixa do estoque como BRINDE e sai a R$ 0,00.
// ---------------------------------------------------------------------------
async function lerBrindeMinimo() {
  try {
    const resposta = await fetch(`${API_URL}/vendas/config`, { headers: getHeadersComUsuario() });
    if (resposta.ok) {
      const minimo = Number((await resposta.json()).brinde_quantidade_minima);
      if (Number.isInteger(minimo) && minimo >= 0) brindeMinimo = minimo;
    }
  } catch (_) { /* sem rede: vale o último valor conhecido */ }
  return brindeMinimo;
}

async function iniciarEtapaBrinde() {
  brindeVenda = null;
  const minimo = await lerBrindeMinimo();
  if (minimo > 0 && totalPecasVenda() >= minimo) {
    document.getElementById('brinde-texto').textContent = `Esta venda tem ${totalPecasVenda()} peças (a partir de ${minimo} o cliente pode ganhar um brinde).`;
    document.getElementById('brinde-campo-grupo').classList.add('hidden');
    document.getElementById('brinde-escolha').classList.remove('hidden');
    document.getElementById('brinde-erro').textContent = '';
    abrirDialogo('modal-brinde');
    return;
  }
  abrirConfirmacaoVenda();
}

async function mostrarEscolhaDoBrinde() {
  const select = document.getElementById('brinde-produto');
  const erro = document.getElementById('brinde-erro');
  erro.textContent = '';
  let produtos = [];
  try { produtos = await (await fetch(`${API_URL}/produtos`)).json(); } catch (_) { /* usa a lista vazia */ }
  // O saldo que já está no carrinho não pode ser dado de novo como brinde.
  const noCarrinho = new Map(itensVenda.map((item) => [item.produto_id, item.quantidade]));
  const disponiveis = (Array.isArray(produtos) ? produtos : [])
    .filter((p) => p.ativo && Number(p.estoque) - (noCarrinho.get(Number(p.id)) || 0) >= 1)
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  select.innerHTML = disponiveis.map((p) => `<option value="${p.id}" data-nome="${escapeHtml(p.nome)}">${escapeHtml(p.nome)} (Saldo: ${p.estoque})</option>`).join('');
  document.getElementById('brinde-confirmar').disabled = !disponiveis.length;
  if (!disponiveis.length) erro.textContent = 'Nenhum produto com saldo disponível para brinde.';
  document.getElementById('brinde-escolha').classList.add('hidden');
  document.getElementById('brinde-campo-grupo').classList.remove('hidden');
  select.focus();
}

document.getElementById('brinde-quer-sim').addEventListener('click', mostrarEscolhaDoBrinde);
document.getElementById('brinde-quer-nao').addEventListener('click', () => {
  brindeVenda = null;
  fecharDialogo('modal-brinde');
  abrirConfirmacaoVenda();
});
document.getElementById('brinde-voltar').addEventListener('click', () => {
  document.getElementById('brinde-campo-grupo').classList.add('hidden');
  document.getElementById('brinde-escolha').classList.remove('hidden');
  document.getElementById('brinde-quer-sim').focus();
});
document.getElementById('brinde-confirmar').addEventListener('click', () => {
  const select = document.getElementById('brinde-produto');
  const opcao = select.options[select.selectedIndex];
  if (!opcao) { document.getElementById('brinde-erro').textContent = 'Escolha o produto do brinde.'; return; }
  brindeVenda = { produto_id: Number(opcao.value), nome: opcao.dataset.nome };
  fecharDialogo('modal-brinde');
  abrirConfirmacaoVenda();
});

document.getElementById('form-venda').addEventListener('submit', async (e) => {
  // O submit só abre as telas seguintes (brinde, se houver, e confirmação);
  // quem grava a venda é o botão Confirmar.
  e.preventDefault();
  if (!itensDaVendaAtual().length) {
    showToast("Por favor, selecione um produto válido da lista de busca!", 'error');
    return;
  }
  if (!cpfVenda || !cpfVenda.respondido) {
    showToast('Pergunte ao cliente se quer CPF na nota antes de continuar.', 'error');
    perguntarCpfNota();
    return;
  }
  // Produto e quantidade digitados e não adicionados entram na venda ao finalizar.
  if (linhaPendenteVenda()) adicionarItemVenda();
  if (document.getElementById('venda-pagamento').value === 'Diversificado') {
    const erro = erroDivisao();
    if (erro) { showToast(erro, 'error'); document.querySelector('#pdv-divisao-linhas input')?.focus(); return; }
  }
  await iniciarEtapaBrinde();
});

document.getElementById('confirmar-venda-voltar').addEventListener('click', () => fecharDialogo('modal-confirmar-venda'));
document.getElementById('confirmar-venda-ok').addEventListener('click', enviarVenda);

async function enviarVenda() {
  // Venda concluída = venda confirmada: o valor entra no caixa na hora, em qualquer
  // forma de pagamento. O total é recalculado no servidor.
  const botao = document.getElementById('confirmar-venda-ok');
  if (botao.disabled) return;
  botao.disabled = true;
  const produtosAfetados = [...itensVenda.map((item) => item.produto_id), ...(brindeVenda ? [brindeVenda.produto_id] : [])];
  const data = {
      itens: itensVenda.map((item) => ({ produto_id: item.produto_id, quantidade: item.quantidade })),
      brinde_produto_id: brindeVenda ? brindeVenda.produto_id : '',
      total: document.getElementById('venda-total').value,
      forma_pagamento: document.getElementById('venda-pagamento').value,
      parcelas: document.getElementById('venda-parcelas').value,
      forma_pagamento_detalhe: document.getElementById('venda-forma-detalhe').value,
      pagamentos: document.getElementById('venda-pagamento').value === 'Diversificado' ? lerDivisao().filter((p) => Number(p.valor) > 0) : undefined,
      desconto_codigo: descontoVendaAtual?.manual ? '' : (descontoVendaAtual?.codigo || ''),
      desconto_percentual_manual: descontoVendaAtual?.manual ? descontoVendaAtual.percentual : '',
      desconto_valor_manual: descontoVendaAtual?.reais !== undefined ? descontoVendaAtual.reais : '',
      cpf_nota: cpfVenda.cpf || '',
      evento_id: eventoDaVendaAtual()?.id || ''
  };
  try {
      const resposta = await fetch(`${API_URL}/vendas`, { method: 'POST', headers: getHeadersComUsuario(), body: JSON.stringify(data) });
      const resultado = await resposta.json();
      fecharDialogo('modal-confirmar-venda');
      if (resposta.ok) {
          showToast(resultado.mensagem || "Venda registrada.");
          document.getElementById('form-venda').reset();
          limparDivisao();
          document.getElementById('venda-pagamento').dispatchEvent(new Event('change'));
          limparCamposDoProduto();
          limparVendaEmAndamento();
          document.getElementById('venda-total').value = '';
          limparDescontoVenda();
          ultimoItemCarrinho = null;
          fecharCarrinhoCelular();
          document.getElementById('pdv-desconto').open = false;
          document.getElementById('venda-produto-busca').value = '';
          triggerSync();
          await carregarTudo();
          [...new Set(produtosAfetados)].forEach((id) => avisarEstoquePosVenda(String(id)));
          // Próxima venda: pergunta o CPF de novo.
          novaVendaCpf();
          perguntarCpfNota();
      } else {
          showToast(resultado.error || "Erro ao registrar venda.", 'error');
      }
  } catch (erro) {
      fecharDialogo('modal-confirmar-venda');
      showToast("Erro ao conectar com o servidor.", 'error');
  } finally {
      botao.disabled = false;
  }
}

// ================= MOVIMENTAÇÕES DO ESTOQUE =================
const ROTULO_MOVIMENTO = { ENTRADA: 'Entrada', SAIDA: 'Saída', VENDA: 'Venda', BRINDE: 'Brinde', DOACAO: 'Doação', DEVOLUCAO: 'Devolução' };
let movimentacoesAssinatura = '';
async function carregarMovimentacoes() {
  const corpo = document.getElementById('tabela-movimentacoes');
  if (!corpo) return;
  const tipo = document.getElementById('filtro-mov-tipo').value;
  const onde = document.getElementById('filtro-mov-evento')?.value || '';
  try {
    const resposta = await fetch(`${API_URL}/movimentacoes-estoque?limite=100${tipo ? `&tipo=${encodeURIComponent(tipo)}` : ''}${onde ? `&evento=${encodeURIComponent(onde)}` : ''}`, { headers: getHeadersComUsuario() });
    if (!resposta.ok) return;
    const linhas = await resposta.json();
    const assinatura = JSON.stringify(linhas);
    if (assinatura === movimentacoesAssinatura) return;
    movimentacoesAssinatura = assinatura;
    corpo.innerHTML = linhas.length ? linhas.map((m) => {
      const quando = formatarDataHora(m.criado_em);
      const quantidade = Number(m.quantidade);
      return `<tr>
        <td>${escapeHtml(quando)}</td>
        <td>${escapeHtml(m.produto_nome)}</td>
        <td><span class="mov-${String(m.tipo).toLowerCase()}">${escapeHtml(ROTULO_MOVIMENTO[m.tipo] || m.tipo)}</span></td>
        <td>${quantidade > 0 ? '+' : ''}${quantidade}</td>
        <td>${m.venda_id ? `#${escapeHtml(m.venda_id)}` : '-'}</td>
        <td>${htmlEventoCelula(m)}</td>
        <td>${escapeHtml(m.usuario_nome || '-')}</td>
        <td>${m.destino ? `<strong>${escapeHtml(m.destino)}</strong>${m.observacao ? ' · ' : ''}` : ''}${escapeHtml(m.observacao || '')}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="8" class="empty-cell">Nenhuma movimentação registrada.</td></tr>';
  } catch (_) { /* a próxima atualização tenta de novo */ }
}
document.getElementById('filtro-mov-tipo').addEventListener('change', () => { movimentacoesAssinatura = ''; carregarMovimentacoes(); });
document.getElementById('filtro-mov-evento')?.addEventListener('change', () => { movimentacoesAssinatura = ''; carregarMovimentacoes(); });
// Etiqueta do evento numa célula de tabela (movimentações, histórico).
function htmlEventoCelula(linha) {
  if (!linha.evento_titulo) return '<span class="texto-loja">Loja</span>';
  const ev = (eventosState || []).find((e) => Number(e.id) === Number(linha.evento_id));
  return `<span class="tag-evento" style="--cor:${tipoEvento(ev || {}).cor}"><i></i>${escapeHtml(linha.evento_titulo)}</span>`;
}
// Os seletores "Onde" (movimentações, histórico) e o evento do Movimentar listam os eventos.
let selecoesEventosAssinatura = '';
function preencherSelecoesEventos() {
  const hoje = hojeNaLoja();
  const lista = [...(eventosState || []), ...(eventosHoje || []).filter((h) => !(eventosState || []).some((e) => Number(e.id) === Number(h.id)))]
    .filter((e) => e.data <= diaSomado(hoje, 7))
    .sort((a, b) => b.data.localeCompare(a.data)).slice(0, 60);
  const assinatura = JSON.stringify(lista.map((e) => [e.id, e.titulo, e.data]));
  if (assinatura === selecoesEventosAssinatura) return;
  selecoesEventosAssinatura = assinatura;
  const opcoesEventos = lista.map((e) => `<option value="${e.id}">${escapeHtml(e.titulo)} · ${escapeHtml(dataBR(e.data).slice(0, 5))}</option>`).join('');
  document.querySelectorAll('select.select-onde').forEach((sel) => {
    const atual = sel.value;
    sel.innerHTML = `<option value="">Loja e eventos</option><option value="loja">Só a loja</option><option value="eventos">Só eventos</option>${opcoesEventos ? `<optgroup label="Evento">${opcoesEventos}</optgroup>` : ''}`;
    if ([...sel.options].some((o) => o.value === atual)) sel.value = atual;
  });
  const mov = document.getElementById('movimentar-evento');
  if (mov) {
    const atual = mov.value;
    mov.innerHTML = `<option value="">Nenhum (loja)</option>${opcoesEventos}`;
    if ([...mov.options].some((o) => o.value === atual)) mov.value = atual;
  }
  sugerirEventoMovimentar();
}
// Durante um evento, o Movimentar já vem com ele marcado (até a pessoa mudar).
let movimentarEventoTocado = false;
function sugerirEventoMovimentar() {
  const mov = document.getElementById('movimentar-evento');
  if (!mov || movimentarEventoTocado) return;
  const auto = typeof alvoAutomatico === 'function' ? alvoAutomatico() : null;
  const valor = auto && [...mov.options].some((o) => o.value === String(auto)) ? String(auto) : '';
  if (mov.value !== valor) mov.value = valor;
}
document.getElementById('movimentar-evento')?.addEventListener('change', () => { movimentarEventoTocado = true; });

async function carregarVendas() {
  // A resposta alimenta o histórico, os totais do Dashboard, o indicador de saídas
  // e o gráfico de vendas.
  const res = await fetch(`${API_URL}/vendas`);
  const vendas = await res.json();
  if (!res.ok) {
    showToast(vendas.error || 'Não foi possível carregar as vendas para os relatórios.', 'error');
    return;
  }
  relatorioVendasState = vendas;
  
  const tabela = document.getElementById('tabela-vendas');
  tabela.innerHTML = '';
  let somaVendas = 0;
  let totalSaidas = 0;
  let totalCanceladas = 0;
  const vendasPorProduto = {};

  vendas.forEach(v => {
    // O servidor grava 'confirmado' em vendas antigas e os estados manuais em vendas novas.
    const estadoVenda = v.status_pagamento === 'confirmado' ? 'aprovado' : v.status_pagamento === 'divergencia' ? 'resultado_desconhecido' : v.status_pagamento;
    // Canceladas e recusadas saem de faturamento, unidades e grafico (secao 4),
    // mas permanecem na listagem para preservar a rastreabilidade.
    const cancelada = ['cancelado', 'recusado'].includes(estadoVenda);
    if (cancelada) {
      totalCanceladas += 1;
    } else {
      somaVendas += Number(v.total || 0);
      totalSaidas += Number(v.quantidade || 0);
      const nomeProduto = v.produto_nome || v.nome || 'Produto Padrão';
      vendasPorProduto[nomeProduto] = (vendasPorProduto[nomeProduto] || 0) + Number(v.quantidade || 0);
    }

    const nomeProd = v.produto_nome || v.nome || "Produto Padrão";
    const dataBanco = v.data_venda || v.data || new Date().toISOString().split('T')[0];
    const dataBR = dataBanco.split('-').reverse().join('/');
    const classeEstado = cancelada ? 'badge-cancelado' : estadoVenda === 'aprovado' ? 'badge-pago' : 'badge-pendente';

    tabela.innerHTML += `<tr>
        <td>${dataBR}</td>
        <td>${escapeHtml(nomeProd)}${v.evento_titulo ? `<small class="cell-note">Evento: ${escapeHtml(v.evento_titulo)}</small>` : ''}${v.cpf_nota ? `<small class="cell-note">CPF na nota: ${escapeHtml(formatarCpfNota(v.cpf_nota))}</small>` : ''}</td>
        <td>${v.quantidade} Un</td>
        <td>${v.forma_pagamento === 'Diversificado' ? htmlFormaVenda(v) : `${escapeHtml(v.forma_pagamento || 'Dinheiro')}${Number(v.parcelas || 1) > 1 ? ` (${v.parcelas}x)` : ''}${v.forma_pagamento_detalhe ? `<small class="cell-note">${escapeHtml(v.forma_pagamento_detalhe)}</small>` : ''}`}</td>
        <td><strong>R$ ${(Number(v.total || 0)).toFixed(2)}</strong>${Number(v.desconto_valor || 0) > 0 ? `<small class="cell-note">-${Number(v.desconto_valor).toFixed(2)} ${Number(v.desconto_percentual || 0) > 0 ? ` (${Number(v.desconto_percentual).toFixed(2)}%)` : ''}</small>` : ''}</td>
        <td>${escapeHtml(v.desconto_codigo || (Number(v.desconto_valor || 0) > 0 ? (Number(v.desconto_percentual || 0) > 0 ? `Manual (${Number(v.desconto_percentual).toFixed(2)}%)` : 'Manual (R$)') : '-'))}</td>
        <td>
          <span class="badge ${classeEstado}">${escapeHtml(estadoPagamentoLabel(estadoVenda))}</span>
          ${v.cancelada_em ? `<small class="cell-note">Cancelada: ${escapeHtml(v.motivo_cancelamento || '')}</small>` : ''}
          ${pode('caixa', 'editar') && !v.cancelada_em ? `<button class="btn btn-sm btn-warning" onclick="cancelarVenda(${v.id})" style="margin-left: 0.5rem;">Cancelar</button>` : ''}
        </td>
    </tr>`;
  });

  renderizarRelatorios();
  renderizarVendasAutorizadas();
}

// Converte um Date em AAAA-MM-DD no fuso local. Usada para preencher e
// validar os campos de data dos relatorios, que comparam com datas montadas
// localmente (new Date(ano, mes, dia)).
function formatDataISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// ================= RELATÓRIOS (folhas A4) =================
// Cada relatório é montado como uma "folha": a prévia na tela é a mesma que vai
// para o PDF. Ao imprimir, só a folha ativa é copiada para #area-impressao, que
// tem página A4 em pé própria, cabeçalho de marca e numeração de páginas.
const FUSO_DA_LOJA = 'America/Sao_Paulo';
const formatoDiaLoja = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_DA_LOJA, year: 'numeric', month: '2-digit', day: '2-digit' });
function hojeNaLoja() { return formatoDiaLoja.format(new Date()); }
function somarDiasIso(dia, n) { const d = new Date(`${dia}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function formatarDataRelatorio(data) { return data ? String(data).slice(0, 10).split('-').reverse().join('/') : '-'; }
function formatarMoedaRelatorio(valor) { return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function numeroRelatorio(valor) { return Number(valor || 0).toLocaleString('pt-BR'); }
function dataHoraLoja(iso, soHora = false) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const opcoes = soHora ? { hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  return d.toLocaleString('pt-BR', { timeZone: FUSO_DA_LOJA, ...opcoes });
}
// Num relatório de um dia só a data já está no cabeçalho: as linhas mostram só a hora.
function quandoNaFolha(iso, dia, periodo) {
  if (!iso) return formatarDataRelatorio(dia);
  if (periodo && periodo.inicio === periodo.fim) return dataHoraLoja(iso, true);
  return dataHoraLoja(iso).replace(',', '');
}
function rotuloPeriodo(inicio, fim) {
  if (inicio === fim) {
    const nome = new Date(`${inicio}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' });
    const nomeDia = nome.charAt(0).toUpperCase() + nome.slice(1);
    return `${formatarDataRelatorio(inicio)} · ${nomeDia}`;
  }
  const dias = Math.round((new Date(`${fim}T12:00:00Z`) - new Date(`${inicio}T12:00:00Z`)) / 86400000) + 1;
  return `${formatarDataRelatorio(inicio)} a ${formatarDataRelatorio(fim)} · ${dias} dias`;
}

let relatorioAtivo = 'saidas';
let relatorioSaidas = { dados: null, chave: '', em: 0, carregando: false, erro: '' };
const SECOES_SAIDAS = [['produtos', 'Produtos que saíram'], ['vendas', 'Vendas'], ['brindes', 'Brindes'], ['doacoes', 'Doações'], ['outras', 'Outras saídas'], ['resumos', 'Por pagamento e vendedor']];

function relatorioVisivel() { return document.getElementById('tab-relatorios')?.classList.contains('active'); }
function secoesEscolhidas() { return new Set([...document.querySelectorAll('[data-secao-toggle]')].filter((c) => c.checked).map((c) => c.dataset.secaoToggle)); }
function filtrosSaidas() {
  const inicio = document.getElementById('relatorio-inicio').value;
  const fim = document.getElementById('relatorio-fim').value;
  const valida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);
  return { valido: valida(inicio) && valida(fim) && inicio <= fim, inicio, fim, busca: document.getElementById('relatorio-busca').value.trim(), categoria: document.getElementById('relatorio-categoria').value, pagamento: document.getElementById('relatorio-pagamento').value };
}

// Partes comuns da folha
function cabecalhoFolha(titulo, subtitulo, meta) {
  const usuario = getUsuarioAtual();
  const linhas = [['Gerado em', dataHoraLoja(new Date().toISOString())], ['Por', usuario?.nome || '-'], ...meta.filter(([, v]) => v)];
  return `<header class="folha-topo">
      <img src="logo-difeecult.svg" alt="Difeecult" class="folha-logo">
      <div class="folha-titulo"><span>Relatório</span><h1>${escapeHtml(titulo)}</h1><p>${escapeHtml(subtitulo)}</p></div>
      <dl class="folha-meta">${linhas.map(([r, v]) => `<div><dt>${escapeHtml(r)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('')}</dl>
    </header>
    <div class="folha-quadriculado" aria-hidden="true"></div>`;
}
function kpiFolha(rotulo, valor, detalhe = '', classe = '') {
  return `<div class="folha-kpi ${classe}"><span>${escapeHtml(rotulo)}</span><strong>${valor}</strong>${detalhe ? `<small>${detalhe}</small>` : ''}</div>`;
}
function secaoFolha(numero, titulo, conteudo, nota = '') {
  // Seção curta não se divide entre páginas (o título nunca fica sozinho no fim da folha).
  const linhas = (conteudo.match(/<tr/g) || []).length;
  return `<section class="folha-secao${linhas <= 14 ? ' secao-curta' : ''}"><h2><span>${String(numero).padStart(2, '0')}</span>${escapeHtml(titulo)}</h2>${nota ? `<p class="folha-nota">${nota}</p>` : ''}${conteudo}</section>`;
}
function vazioFolha(texto) { return `<p class="folha-vazio">${escapeHtml(texto)}</p>`; }
function rodapeFolha(texto) { return `<footer class="folha-rodape"><span>Difeecult · Sistema de Gestão</span><span>${texto}</span></footer>`; }

// ---------- Saídas e vendas ----------
async function carregarRelatorioSaidas(forcar = false) {
  const f = filtrosSaidas();
  const aviso = document.getElementById('relatorio-aviso');
  if (!f.valido) { relatorioSaidas = { ...relatorioSaidas, dados: null, erro: 'Escolha datas válidas: a data final não pode ser anterior à inicial.' }; renderizarFolhaSaidas(); return; }
  const chave = JSON.stringify(f);
  if (!forcar && chave === relatorioSaidas.chave && Date.now() - relatorioSaidas.em < 20000) return;
  if (relatorioSaidas.carregando && chave === relatorioSaidas.chave) return;
  relatorioSaidas = { ...relatorioSaidas, chave, carregando: true, erro: '' };
  if (!relatorioSaidas.dados) renderizarFolhaSaidas();
  try {
    const consulta = new URLSearchParams({ inicio: f.inicio, fim: f.fim, busca: f.busca, categoria: f.categoria, pagamento: f.pagamento });
    const resposta = await fetch(`${API_URL}/relatorios/saidas?${consulta}`);
    const corpo = await resposta.json();
    if (chave !== relatorioSaidas.chave) return; // os filtros mudaram enquanto carregava
    if (!resposta.ok) throw new Error(corpo.error || 'Não foi possível montar o relatório.');
    relatorioSaidas = { dados: corpo, chave, em: Date.now(), carregando: false, erro: '' };
  } catch (erro) {
    relatorioSaidas = { ...relatorioSaidas, carregando: false, erro: erro.message };
  }
  if (aviso) aviso.textContent = relatorioSaidas.erro || '';
  renderizarFolhaSaidas();
}

function itensDaVendaFolha(venda) {
  return venda.itens.map((i) => `<span class="folha-item">${i.quantidade}× ${escapeHtml(i.produto_nome)}${i.tipo === 'BRINDE' ? ' <em class="folha-tag tag-brinde">brinde</em>' : ''}</span>`).join('');
}
function barraComposicao(r) {
  const partes = [['vendidas', 'Vendidas', r.pecas_vendidas], ['brindes', 'Brindes', r.brindes], ['doacoes', 'Doações', r.doacoes], ['outras', 'Outras saídas', r.outras_saidas]].filter(([, , q]) => q > 0);
  if (!r.total_pecas) return '';
  return `<div class="folha-composicao">
      <div class="folha-composicao-titulo"><span>Composição das saídas</span><strong>${numeroRelatorio(r.total_pecas)} peças saíram do estoque</strong></div>
      <div class="folha-barra">${partes.map(([c, , q]) => `<span class="parte-${c}" style="width:${(q / r.total_pecas * 100).toFixed(2)}%"></span>`).join('')}</div>
      <ul class="folha-legenda">${partes.map(([c, n, q]) => `<li><i class="parte-${c}"></i>${n} <strong>${numeroRelatorio(q)}</strong> <small>${Math.round(q / r.total_pecas * 100)}%</small></li>`).join('')}</ul>
    </div>`;
}

function renderizarFolhaSaidas() {
  const folha = document.getElementById('folha-saidas');
  if (!folha) return;
  const f = filtrosSaidas();
  const d = relatorioSaidas.dados;
  const filtrosTexto = [f.busca && `Produto: "${f.busca}"`, f.categoria && `Categoria: ${f.categoria}`, f.pagamento && `Pagamento: ${f.pagamento}`].filter(Boolean).join(' · ');
  const subtitulo = f.valido ? rotuloPeriodo(f.inicio, f.fim) : 'Período inválido';
  if (!d || relatorioSaidas.erro) {
    folha.innerHTML = cabecalhoFolha('Saídas e vendas', subtitulo, [['Filtros', filtrosTexto]])
      + `<div class="folha-carregando">${escapeHtml(relatorioSaidas.erro || 'Montando o relatório…')}</div>`;
    return;
  }
  const r = d.resumo;
  const mostrar = secoesEscolhidas();
  let n = 0;
  let html = cabecalhoFolha('Saídas e vendas', rotuloPeriodo(d.periodo.inicio, d.periodo.fim), [['Filtros', filtrosTexto]]);
  html += `<div class="folha-kpis">
      ${kpiFolha('Faturamento', formatarMoedaRelatorio(r.faturamento), r.descontos > 0 ? `${formatarMoedaRelatorio(r.descontos)} em descontos` : 'sem descontos', 'kpi-destaque')}
      ${kpiFolha('Vendas', numeroRelatorio(r.vendas), r.vendas ? `ticket médio ${formatarMoedaRelatorio(r.ticket_medio)}` : '—')}
      ${kpiFolha('Peças vendidas', numeroRelatorio(r.pecas_vendidas))}
      ${kpiFolha('Brindes', numeroRelatorio(r.brindes), r.brindes ? `${r.brindes_em_vendas} em vendas · ${r.brindes_avulsos} avulsos` : '')}
      ${kpiFolha('Doações', numeroRelatorio(r.doacoes))}
      ${kpiFolha('Canceladas', numeroRelatorio(r.vendas_canceladas), 'fora dos totais', r.vendas_canceladas ? 'kpi-alerta' : '')}
    </div>`;
  html += barraComposicao(r);

  if (mostrar.has('produtos')) {
    const t = d.produtos.reduce((a, p) => ({ v: a.v + p.vendidas, val: a.val + p.valor_vendido, b: a.b + p.brindes, d: a.d + p.doacoes, o: a.o + p.outras_saidas, s: a.s + p.total_saiu }), { v: 0, val: 0, b: 0, d: 0, o: 0, s: 0 });
    html += secaoFolha(++n, 'Produtos que saíram', d.produtos.length ? `<table class="folha-tabela tabela-produtos">
        <thead><tr><th>Produto</th><th class="num">Vendidas</th><th class="num">Brindes</th><th class="num">Doações</th><th class="num">Outras</th><th class="num">Total saiu</th><th class="num">Valor vendido</th><th class="num">Saldo atual</th></tr></thead>
        <tbody>${d.produtos.map((p) => `<tr>
          <td><strong>${escapeHtml(p.produto_nome)}</strong><small>${escapeHtml(p.categoria || '')}</small></td>
          <td class="num">${p.vendidas || '<span class="zero">–</span>'}</td><td class="num">${p.brindes || '<span class="zero">–</span>'}</td><td class="num">${p.doacoes || '<span class="zero">–</span>'}</td><td class="num">${p.outras_saidas || '<span class="zero">–</span>'}</td>
          <td class="num forte">${p.total_saiu}</td><td class="num">${formatarMoedaRelatorio(p.valor_vendido)}</td>
          <td class="num ${p.saldo_atual <= 0 ? 'saldo-zero' : p.saldo_atual <= limiteEstoqueAviso() ? 'saldo-baixo' : ''}">${p.saldo_atual}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Total · ${d.produtos.length} ${d.produtos.length === 1 ? 'produto' : 'produtos'}</td><td class="num">${t.v}</td><td class="num">${t.b}</td><td class="num">${t.d}</td><td class="num">${t.o}</td><td class="num">${t.s}</td><td class="num">${formatarMoedaRelatorio(t.val)}</td><td></td></tr></tfoot>
      </table>` : vazioFolha('Nenhum produto saiu do estoque neste período.'), 'Valor vendido = quantidade × preço da peça na venda, antes do desconto da venda. Saldo atual é o estoque de agora.');
  }
  if (mostrar.has('vendas')) {
    html += secaoFolha(++n, `Vendas (${d.vendas.length})`, d.vendas.length ? `<table class="folha-tabela tabela-vendas">
        <thead><tr><th>Nº</th><th>${d.periodo.inicio === d.periodo.fim ? 'Hora' : 'Data e hora'}</th><th>Itens</th><th>Vendedor</th><th>Pagamento</th><th class="num">Desconto</th><th class="num">Total</th></tr></thead>
        <tbody>${d.vendas.map((v) => `<tr class="${v.cancelada ? 'linha-cancelada' : ''}">
          <td class="forte">#${v.id}</td>
          <td class="quando">${quandoNaFolha(v.quando, v.data, d.periodo)}</td>
          <td>${itensDaVendaFolha(v)}${v.evento_titulo ? `<em class="folha-tag tag-evento-folha">${escapeHtml(v.evento_titulo)}</em>` : ''}${v.cancelada ? `<em class="folha-tag tag-cancelada">cancelada${v.motivo_cancelamento ? `: ${escapeHtml(v.motivo_cancelamento)}` : ''}</em>` : ''}</td>
          <td>${escapeHtml(v.vendedor_nome || '-')}</td>
          <td>${htmlFormaVenda(v)}</td>
          <td class="num">${v.desconto_valor > 0 ? `−${formatarMoedaRelatorio(v.desconto_valor)}${v.desconto_codigo ? `<small>${escapeHtml(v.desconto_codigo)}</small>` : ''}` : '<span class="zero">–</span>'}</td>
          <td class="num forte">${formatarMoedaRelatorio(v.total)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="5">${r.vendas} ${r.vendas === 1 ? 'venda válida' : 'vendas válidas'}${r.vendas_canceladas ? ` · ${r.vendas_canceladas} cancelada(s) fora do total` : ''}</td><td class="num">${r.descontos > 0 ? `−${formatarMoedaRelatorio(r.descontos)}` : ''}</td><td class="num">${formatarMoedaRelatorio(r.faturamento)}</td></tr></tfoot>
      </table>` : vazioFolha('Nenhuma venda neste período.'));
  }
  if (mostrar.has('brindes')) {
    html += secaoFolha(++n, `Brindes (${r.brindes} ${r.brindes === 1 ? 'peça' : 'peças'})`, d.brindes.length ? `<table class="folha-tabela">
        <thead><tr><th>${d.periodo.inicio === d.periodo.fim ? 'Hora' : 'Data e hora'}</th><th>Produto</th><th class="num">Qtd.</th><th>Origem</th><th>Quem deu</th></tr></thead>
        <tbody>${d.brindes.map((b) => `<tr><td class="quando">${quandoNaFolha(b.quando, b.data, d.periodo)}</td><td>${escapeHtml(b.produto_nome)}</td><td class="num">${b.quantidade}</td>
          <td>${b.origem === 'VENDA' ? `Na venda <strong>#${b.venda_id}</strong>` : `Avulso${b.destino ? ` · ${escapeHtml(b.destino)}` : ''}`}${b.evento_titulo ? `<small>Evento: ${escapeHtml(b.evento_titulo)}</small>` : ''}${b.observacao ? `<small>${escapeHtml(b.observacao)}</small>` : ''}</td>
          <td>${escapeHtml(b.usuario_nome || '-')}</td></tr>`).join('')}</tbody>
      </table>` : vazioFolha('Nenhum brinde neste período.'), 'Brinde sai de graça: baixa o estoque e não entra no faturamento.');
  }
  if (mostrar.has('doacoes')) {
    html += secaoFolha(++n, `Doações (${r.doacoes} ${r.doacoes === 1 ? 'peça' : 'peças'})`, d.doacoes.length ? `<table class="folha-tabela">
        <thead><tr><th>${d.periodo.inicio === d.periodo.fim ? 'Hora' : 'Data e hora'}</th><th>Produto</th><th class="num">Qtd.</th><th>Destino</th><th>Registrado por</th></tr></thead>
        <tbody>${d.doacoes.map((m) => `<tr><td class="quando">${quandoNaFolha(m.quando, m.data, d.periodo)}</td><td>${escapeHtml(m.produto_nome)}</td><td class="num">${m.quantidade}</td><td>${escapeHtml(m.destino || '-')}${m.observacao ? `<small>${escapeHtml(m.observacao)}</small>` : ''}</td><td>${escapeHtml(m.usuario_nome || '-')}</td></tr>`).join('')}</tbody>
      </table>` : vazioFolha('Nenhuma doação neste período.'));
  }
  if (mostrar.has('outras') && d.outras_saidas.length) {
    html += secaoFolha(++n, 'Outras saídas', `<table class="folha-tabela">
        <thead><tr><th>${d.periodo.inicio === d.periodo.fim ? 'Hora' : 'Data e hora'}</th><th>Produto</th><th class="num">Qtd.</th><th>Observação</th><th>Registrado por</th></tr></thead>
        <tbody>${d.outras_saidas.map((m) => `<tr><td class="quando">${quandoNaFolha(m.quando, m.data, d.periodo)}</td><td>${escapeHtml(m.produto_nome)}</td><td class="num">${m.quantidade}</td><td>${escapeHtml(m.observacao || m.destino || '-')}</td><td>${escapeHtml(m.usuario_nome || '-')}</td></tr>`).join('')}</tbody>
      </table>`, 'Baixas manuais de estoque (perda, ajuste, troca).');
  }
  if (mostrar.has('resumos') && (d.por_pagamento.length || d.por_vendedor.length)) {
    const tabelaPagamento = `<table class="folha-tabela"><thead><tr><th>Forma de pagamento</th><th class="num">Vendas</th><th class="num">Valor</th><th class="num">%</th></tr></thead>
      <tbody>${d.por_pagamento.map((p) => `<tr><td>${escapeHtml(p.forma)}</td><td class="num">${p.vendas}</td><td class="num">${formatarMoedaRelatorio(p.valor)}</td><td class="num">${r.faturamento ? Math.round(p.valor / r.faturamento * 100) : 0}%</td></tr>`).join('')}</tbody></table>`;
    const tabelaVendedor = `<table class="folha-tabela"><thead><tr><th>Vendedor</th><th class="num">Vendas</th><th class="num">Peças</th><th class="num">Valor</th></tr></thead>
      <tbody>${d.por_vendedor.map((p) => `<tr><td>${escapeHtml(p.nome)}</td><td class="num">${p.vendas}</td><td class="num">${p.pecas}</td><td class="num">${formatarMoedaRelatorio(p.valor)}</td></tr>`).join('')}</tbody></table>`;
    html += secaoFolha(++n, 'Por pagamento e vendedor', `<div class="folha-duas">${tabelaPagamento}${tabelaVendedor}</div>`);
  }
  html += rodapeFolha('Vendas canceladas não entram nos totais. Brindes e doações não geram receita.');
  folha.innerHTML = html;
}

// ---------- Uma data ou de uma data a outra (estoque e caixa) ----------
function modoData(grupo) { return document.querySelector(`.modo-data[data-grupo="${grupo}"] .ativo`)?.dataset.modo === 'periodo' ? 'periodo' : 'dia'; }
// Devolve { valido, inicio, fim, umDia } a partir dos campos do grupo.
function intervaloDoGrupo(grupo) {
  const valida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (modoData(grupo) === 'dia') {
    const dia = document.getElementById(`relatorio-${grupo}-data`).value;
    return { valido: valida(dia), inicio: dia, fim: dia, umDia: true };
  }
  const inicio = document.getElementById(`relatorio-${grupo}-inicio`).value;
  const fim = document.getElementById(`relatorio-${grupo}-fim`).value;
  return { valido: valida(inicio) && valida(fim) && inicio <= fim, inicio, fim, umDia: inicio === fim };
}
function definirModoData(grupo, modo) {
  document.querySelectorAll(`.modo-data[data-grupo="${grupo}"] [data-modo]`).forEach((b) => { const ativo = b.dataset.modo === modo; b.classList.toggle('ativo', ativo); b.setAttribute('aria-pressed', String(ativo)); });
  document.querySelectorAll(`[data-campos="${grupo}-dia"]`).forEach((el) => { el.hidden = modo !== 'dia'; });
  document.querySelectorAll(`[data-campos="${grupo}-periodo"]`).forEach((el) => { el.hidden = modo !== 'periodo'; });
  salvarPreferencia(`erp-relatorio-modo-${grupo}`, modo);
  marcarAtalhosGrupo(grupo);
}
function intervaloDoAtalho(tipo) {
  const hoje = hojeNaLoja();
  if (tipo === '7dias') return [somarDiasIso(hoje, -6), hoje];
  if (tipo === 'mes') return [`${hoje.slice(0, 8)}01`, hoje];
  const fim = somarDiasIso(`${hoje.slice(0, 8)}01`, -1);
  return [`${fim.slice(0, 8)}01`, fim];
}
function marcarAtalhosGrupo(grupo) {
  const inicio = document.getElementById(`relatorio-${grupo}-inicio`).value;
  const fim = document.getElementById(`relatorio-${grupo}-fim`).value;
  document.querySelectorAll(`[data-atalho="${grupo}"]`).forEach((b) => { const [i, f] = intervaloDoAtalho(b.dataset.periodoAtalho); b.classList.toggle('ativo', i === inicio && f === fim); });
}
function rotuloIntervalo(intervalo) { return intervalo.valido ? rotuloPeriodo(intervalo.inicio, intervalo.fim) : 'Datas inválidas'; }

// ---------- Posição de estoque ----------
// Hoje, num dia só: usa o saldo de agora (já carregado). Dia passado ou período: pede ao servidor.
let relatorioEstoque = { dados: null, chave: '', carregando: false, erro: '' };
async function carregarRelatorioEstoque(forcar = false) {
  const intervalo = intervaloDoGrupo('estoque');
  if (!intervalo.valido) { relatorioEstoque = { dados: null, chave: '', carregando: false, erro: 'Escolha datas válidas: a data final não pode ser anterior à inicial.' }; renderizarFolhaEstoque(); return; }
  if (intervalo.umDia && intervalo.inicio === hojeNaLoja()) { relatorioEstoque = { dados: null, chave: 'agora', carregando: false, erro: '' }; renderizarFolhaEstoque(); return; }
  const chave = `${intervalo.inicio}|${intervalo.fim}`;
  if (!forcar && chave === relatorioEstoque.chave && relatorioEstoque.dados) { renderizarFolhaEstoque(); return; }
  relatorioEstoque = { dados: null, chave, carregando: true, erro: '' };
  renderizarFolhaEstoque();
  try {
    const resposta = await fetch(`${API_URL}/relatorios/estoque?${new URLSearchParams({ inicio: intervalo.inicio, fim: intervalo.fim })}`);
    const corpo = await resposta.json();
    if (chave !== relatorioEstoque.chave) return;
    if (!resposta.ok) throw new Error(corpo.error || 'Não foi possível montar o relatório.');
    relatorioEstoque = { dados: corpo, chave, carregando: false, erro: '' };
  } catch (erro) {
    if (chave !== relatorioEstoque.chave) return;
    relatorioEstoque = { dados: null, chave, carregando: false, erro: erro.message };
  }
  renderizarFolhaEstoque();
}

function filtrosEstoqueRelatorio() {
  const busca = document.getElementById('relatorio-estoque-busca').value.trim();
  const filtroEl = document.getElementById('relatorio-estoque-filtro');
  return { busca, termo: semAcento(busca), categoria: document.getElementById('relatorio-estoque-categoria').value, filtro: filtroEl.value, filtroTexto: filtroEl.value ? filtroEl.selectedOptions[0].textContent : '', inativos: document.getElementById('relatorio-estoque-inativos').checked };
}
function linhasEstoqueRelatorio(intervalo) {
  const limite = limiteEstoqueAviso();
  const ativo = (v) => v === undefined || v === true || v === 1 || v === '1';
  // Normaliza as duas fontes para o mesmo formato.
  const base = relatorioEstoque.chave === 'agora'
    ? relatorioProdutosState.map((p) => ({ produto_id: Number(p.id), produto_nome: p.nome, categoria: p.categoria || '', preco: Number(p.preco || 0), ativo: ativo(p.ativo), saldo_final: Number(p.estoque || 0), movimentou: true }))
    : (relatorioEstoque.dados?.produtos || []).map((p) => ({ ...p, ativo: ativo(p.ativo) }));
  const f = filtrosEstoqueRelatorio();
  return base.filter((p) => (f.inativos || p.ativo) && (!f.termo || semAcento(`${p.produto_nome} ${p.categoria}`).includes(f.termo)) && (!f.categoria || p.categoria === f.categoria)
    && (f.filtro !== 'baixo' || (p.saldo_final > 0 && p.saldo_final <= limite)) && (f.filtro !== 'zerado' || p.saldo_final <= 0)
    && (f.filtro !== 'com' || p.saldo_final > 0) && (f.filtro !== 'movimentou' || p.movimentou));
}
function agruparPorCategoria(lista) {
  const grupos = new Map();
  lista.forEach((p) => { const c = p.categoria || 'Sem categoria'; if (!grupos.has(c)) grupos.set(c, []); grupos.get(c).push(p); });
  return [...grupos.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((c) => [c, grupos.get(c).sort((a, b) => String(a.produto_nome).localeCompare(String(b.produto_nome), 'pt-BR'))]);
}
function avisoHistoricoEstoque(intervalo) {
  const desde = relatorioEstoque.dados?.historico_desde;
  if (relatorioEstoque.chave === 'agora' || !relatorioEstoque.dados?.produtos_com_estoque_anterior) return '';
  if (!desde) return `<p class="folha-aviso">Ainda não há movimentações registradas: os saldos abaixo são os de agora.</p>`;
  // O saldo inicial é o fim do dia anterior ao início; num dia só, o fim do próprio dia.
  const referencia = intervalo.umDia ? intervalo.fim : somarDiasIso(intervalo.inicio, -1);
  if (referencia < desde) return `<p class="folha-aviso">O histórico de movimentações começa em <strong>${formatarDataRelatorio(desde)}</strong>. Mudanças de estoque anteriores a essa data não foram registradas, então saldos antes dela podem não bater com a realidade.</p>`;
  return '';
}

function renderizarFolhaEstoque() {
  const folha = document.getElementById('folha-estoque');
  if (!folha) return;
  const intervalo = intervaloDoGrupo('estoque');
  const f = filtrosEstoqueRelatorio();
  const periodo = intervalo.valido && !intervalo.umDia;
  const agora = relatorioEstoque.chave === 'agora';
  const filtrosTexto = [f.busca && `Produto: "${f.busca}"`, f.categoria && `Categoria: ${f.categoria}`, f.filtroTexto, f.inativos && 'com inativos'].filter(Boolean).join(' · ');
  const titulo = periodo ? 'Movimento de estoque' : 'Posição de estoque';
  const subtitulo = !intervalo.valido ? 'Datas inválidas' : agora ? `Saldo agora · ${dataHoraLoja(new Date().toISOString())}` : periodo ? rotuloIntervalo(intervalo) : `Saldo no fim do dia ${rotuloIntervalo(intervalo)}`;
  if (!agora && (!relatorioEstoque.dados || relatorioEstoque.erro)) {
    folha.innerHTML = cabecalhoFolha(titulo, subtitulo, [['Filtros', filtrosTexto]]) + `<div class="folha-carregando">${escapeHtml(relatorioEstoque.erro || 'Montando o relatório…')}</div>`;
    return;
  }
  const limite = limiteEstoqueAviso();
  const produtos = linhasEstoqueRelatorio(intervalo);
  const grupos = agruparPorCategoria(produtos);
  const pos = (n) => Math.max(0, Number(n || 0));
  const classeSaldo = (s) => (s <= 0 ? 'saldo-zero' : s <= limite ? 'saldo-baixo' : '');
  const zero = (n) => (n ? numeroRelatorio(n) : '<span class="zero">–</span>');
  let html = cabecalhoFolha(titulo, subtitulo, [['Filtros', filtrosTexto]]);
  html += avisoHistoricoEstoque(intervalo);

  if (!periodo) {
    const pecas = produtos.reduce((t, p) => t + pos(p.saldo_final), 0);
    const valor = produtos.reduce((t, p) => t + pos(p.saldo_final) * p.preco, 0);
    const acabando = produtos.filter((p) => p.saldo_final > 0 && p.saldo_final <= limite).length;
    const esgotados = produtos.filter((p) => p.saldo_final <= 0).length;
    const situacao = (p) => { if (!p.ativo) return '<em class="folha-tag">inativo</em>'; if (p.saldo_final <= 0) return '<em class="folha-tag tag-esgotado">esgotado</em>'; if (p.saldo_final <= limite) return '<em class="folha-tag tag-alerta">acabando</em>'; return '<em class="folha-tag tag-ok">ok</em>'; };
    html += `<div class="folha-kpis kpis-4">
        ${kpiFolha('Peças em estoque', numeroRelatorio(pecas), `${produtos.length} produtos`, 'kpi-destaque')}
        ${kpiFolha('Valor em estoque', formatarMoedaRelatorio(valor), 'pelo preço de venda atual')}
        ${kpiFolha('Acabando', numeroRelatorio(acabando), `até ${limite} un.`, acabando ? 'kpi-aviso' : '')}
        ${kpiFolha('Esgotados', numeroRelatorio(esgotados), 'saldo 0', esgotados ? 'kpi-alerta' : '')}
      </div>`;
    html += secaoFolha(1, 'Saldo por produto', produtos.length ? `<table class="folha-tabela">
        <thead><tr><th>Produto</th><th class="num">Preço</th><th class="num">Saldo</th><th class="num">Valor em estoque</th><th>Situação</th></tr></thead>
        ${grupos.map(([c, lista]) => { const sub = lista.reduce((t, p) => ({ q: t.q + pos(p.saldo_final), v: t.v + pos(p.saldo_final) * p.preco }), { q: 0, v: 0 });
          return `<tbody><tr class="linha-grupo"><td colspan="2">${escapeHtml(c)}</td><td class="num">${numeroRelatorio(sub.q)}</td><td class="num">${formatarMoedaRelatorio(sub.v)}</td><td>${lista.length} ${lista.length === 1 ? 'produto' : 'produtos'}</td></tr>
            ${lista.map((p) => `<tr><td>${escapeHtml(p.produto_nome)}</td><td class="num">${formatarMoedaRelatorio(p.preco)}</td><td class="num forte ${classeSaldo(p.saldo_final)}">${numeroRelatorio(p.saldo_final)}</td><td class="num">${formatarMoedaRelatorio(pos(p.saldo_final) * p.preco)}</td><td>${situacao(p)}</td></tr>`).join('')}</tbody>`; }).join('')}
        <tfoot><tr><td colspan="2">Total geral</td><td class="num">${numeroRelatorio(pecas)}</td><td class="num">${formatarMoedaRelatorio(valor)}</td><td></td></tr></tfoot>
      </table>` : vazioFolha('Nenhum produto para os filtros escolhidos.'), 'O valor em estoque usa o preço de venda atual, não o custo de compra.');
    html += rodapeFolha(agora ? 'Posição do momento em que a folha foi gerada.' : 'Saldo reconstruído pelo histórico de movimentações.');
    folha.innerHTML = html;
    return;
  }

  // Período: saldo inicial + entradas + devoluções − saídas = saldo final.
  const campos = ['saldo_inicial', 'entradas', 'vendas', 'brindes', 'doacoes', 'outras_saidas', 'devolucoes', 'saldo_final'];
  const somar = (lista) => lista.reduce((t, p) => { campos.forEach((c) => { t[c] += Number(p[c] || 0); }); return t; }, Object.fromEntries(campos.map((c) => [c, 0])));
  const t = somar(produtos);
  const saidas = t.vendas + t.brindes + t.doacoes + t.outras_saidas;
  html += `<div class="folha-kpis kpis-4">
      ${kpiFolha('Saldo inicial', numeroRelatorio(t.saldo_inicial), `fim de ${formatarDataRelatorio(somarDiasIso(intervalo.inicio, -1))}`)}
      ${kpiFolha('Entraram', `+${numeroRelatorio(t.entradas + t.devolucoes)}`, `${numeroRelatorio(t.entradas)} entradas · ${numeroRelatorio(t.devolucoes)} devoluções`, 'kpi-entrada')}
      ${kpiFolha('Saíram', `−${numeroRelatorio(saidas)}`, `${numeroRelatorio(t.vendas)} vendas · ${numeroRelatorio(t.brindes)} brindes · ${numeroRelatorio(t.doacoes)} doações`, 'kpi-alerta')}
      ${kpiFolha('Saldo final', numeroRelatorio(t.saldo_final), `fim de ${formatarDataRelatorio(intervalo.fim)}`, 'kpi-destaque')}
    </div>`;
  const cabecalho = '<thead><tr><th>Produto</th><th class="num">Saldo<br>inicial</th><th class="num">Entradas</th><th class="num">Vendas</th><th class="num">Brindes</th><th class="num">Doações</th><th class="num">Outras</th><th class="num">Devol.</th><th class="num">Saldo<br>final</th></tr></thead>';
  const linha = (p) => `<tr><td>${escapeHtml(p.produto_nome)}${p.ativo ? '' : ' <em class="folha-tag">inativo</em>'}</td><td class="num">${numeroRelatorio(p.saldo_inicial)}</td><td class="num entrada">${p.entradas ? `+${numeroRelatorio(p.entradas)}` : '<span class="zero">–</span>'}</td><td class="num">${zero(p.vendas)}</td><td class="num">${zero(p.brindes)}</td><td class="num">${zero(p.doacoes)}</td><td class="num">${zero(p.outras_saidas)}</td><td class="num">${zero(p.devolucoes)}</td><td class="num forte ${classeSaldo(p.saldo_final)}">${numeroRelatorio(p.saldo_final)}</td></tr>`;
  html += secaoFolha(1, 'Movimento por produto', produtos.length ? `<table class="folha-tabela tabela-movimento">${cabecalho}
      ${grupos.map(([c, lista]) => { const s = somar(lista); return `<tbody><tr class="linha-grupo"><td>${escapeHtml(c)}</td>${campos.map((k) => `<td class="num">${numeroRelatorio(s[k])}</td>`).join('')}</tr>${lista.map(linha).join('')}</tbody>`; }).join('')}
      <tfoot><tr><td>Total · ${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'}</td>${campos.map((k) => `<td class="num">${numeroRelatorio(t[k])}</td>`).join('')}</tr></tfoot>
    </table>` : vazioFolha('Nenhum produto para os filtros escolhidos.'), 'Saldo inicial + entradas + devoluções − vendas − brindes − doações − outras saídas = saldo final. Devoluções são peças que voltaram de vendas canceladas.');
  html += rodapeFolha('Saldos reconstruídos pelo histórico de movimentações.');
  folha.innerHTML = html;
}

// ---------- Contagem do caixa ----------
function renderizarFolhaCaixa() {
  const folha = document.getElementById('folha-caixa');
  if (!folha) return;
  const intervalo = intervaloDoGrupo('caixa');
  if (!intervalo.valido) {
    folha.innerHTML = cabecalhoFolha('Contagem do caixa', 'Datas inválidas', []) + '<div class="folha-carregando">Escolha datas válidas: a data final não pode ser anterior à inicial.</div>';
    return;
  }
  const { inicio, fim, umDia } = intervalo;
  const recebimentos = relatorioCaixaState
    .map((item) => ({ ...item, dia: String(item.data_pagamento).slice(0, 10) }))
    .filter((item) => item.dia >= inicio && item.dia <= fim && item.status === 'Pago')
    .sort((a, b) => a.dia.localeCompare(b.dia) || Number(a.venda_id) - Number(b.venda_id));
  const formas = new Map();
  const porDia = new Map();
  recebimentos.forEach((item) => {
    const forma = item.forma_pagamento || 'Outro';
    const valor = Number(item.valor || 0);
    const t = formas.get(forma) || { quantidade: 0, valor: 0 }; t.quantidade += 1; t.valor += valor; formas.set(forma, t);
    const d = porDia.get(item.dia) || { quantidade: 0, total: 0, formas: new Map() }; d.quantidade += 1; d.total += valor; d.formas.set(forma, (d.formas.get(forma) || 0) + valor); porDia.set(item.dia, d);
  });
  const total = recebimentos.reduce((s, i) => s + Number(i.valor || 0), 0);
  const listaFormas = [...formas.entries()].sort((a, b) => b[1].valor - a[1].valor);
  const dinheiro = formas.get('Dinheiro')?.valor || 0;
  const titulo = umDia ? 'Contagem do caixa' : 'Caixa do período';
  let html = cabecalhoFolha(titulo, rotuloPeriodo(inicio, fim), []);
  if (umDia) {
    html += `<div class="folha-kpis kpis-3">
        ${kpiFolha('Total recebido', formatarMoedaRelatorio(total), '', 'kpi-destaque')}
        ${kpiFolha('Recebimentos', numeroRelatorio(recebimentos.length))}
        ${kpiFolha('Em dinheiro', formatarMoedaRelatorio(dinheiro), 'deve estar na gaveta')}
      </div>`;
  } else {
    const diasComMovimento = porDia.size;
    const melhor = [...porDia.entries()].sort((a, b) => b[1].total - a[1].total)[0];
    html += `<div class="folha-kpis kpis-4">
        ${kpiFolha('Total recebido', formatarMoedaRelatorio(total), `${numeroRelatorio(recebimentos.length)} recebimentos`, 'kpi-destaque')}
        ${kpiFolha('Média por dia', formatarMoedaRelatorio(diasComMovimento ? total / diasComMovimento : 0), `${diasComMovimento} ${diasComMovimento === 1 ? 'dia com movimento' : 'dias com movimento'}`)}
        ${kpiFolha('Melhor dia', melhor ? formatarMoedaRelatorio(melhor[1].total) : '—', melhor ? formatarDataRelatorio(melhor[0]) : '')}
        ${kpiFolha('Em dinheiro', formatarMoedaRelatorio(dinheiro), 'no período')}
      </div>`;
  }
  let n = 0;
  html += secaoFolha(++n, 'Por forma de pagamento', listaFormas.length ? `<table class="folha-tabela">
      <thead><tr><th>Forma</th><th class="num">Recebimentos</th><th class="num">Valor</th><th class="folha-col-barra">Participação</th></tr></thead>
      <tbody>${listaFormas.map(([f, t]) => `<tr><td class="forte">${escapeHtml(f)}</td><td class="num">${t.quantidade}</td><td class="num">${formatarMoedaRelatorio(t.valor)}</td><td class="folha-col-barra"><span class="folha-mini-barra"><i style="width:${total ? (t.valor / total * 100).toFixed(1) : 0}%"></i></span> ${total ? Math.round(t.valor / total * 100) : 0}%</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td><td class="num">${recebimentos.length}</td><td class="num">${formatarMoedaRelatorio(total)}</td><td></td></tr></tfoot>
    </table>` : vazioFolha(umDia ? 'Nenhum recebimento neste dia.' : 'Nenhum recebimento neste período.'));
  if (umDia) {
    html += secaoFolha(++n, 'Conferência', `<div class="folha-conferencia">
        <div><span>Dinheiro esperado</span><strong>${formatarMoedaRelatorio(dinheiro)}</strong></div>
        <div><span>Dinheiro contado</span><b></b></div>
        <div><span>Diferença</span><b></b></div>
        <div class="assinatura"><span>Conferido por (nome e assinatura)</span><b></b></div>
      </div>`, 'Preencha à mão na hora de fechar o caixa.');
  } else if (porDia.size) {
    const colunas = listaFormas.map(([f]) => f);
    const dias = [...porDia.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const nomeDia = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');
    html += secaoFolha(++n, 'Dia a dia', `<table class="folha-tabela tabela-dia-a-dia">
        <thead><tr><th>Dia</th><th class="num">Receb.</th>${colunas.map((c) => `<th class="num">${escapeHtml(c)}</th>`).join('')}<th class="num">Total</th></tr></thead>
        <tbody>${dias.map(([d, v]) => `<tr><td class="quando">${formatarDataRelatorio(d)} <small class="dia-semana">${nomeDia(d)}</small></td><td class="num">${v.quantidade}</td>${colunas.map((c) => `<td class="num">${v.formas.get(c) ? formatarMoedaRelatorio(v.formas.get(c)) : '<span class="zero">–</span>'}</td>`).join('')}<td class="num forte">${formatarMoedaRelatorio(v.total)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Total</td><td class="num">${recebimentos.length}</td>${colunas.map((c) => `<td class="num">${formatarMoedaRelatorio(formas.get(c).valor)}</td>`).join('')}<td class="num">${formatarMoedaRelatorio(total)}</td></tr></tfoot>
      </table>`, 'Só aparecem os dias com algum recebimento.');
  }
  html += secaoFolha(++n, `Recebimentos (${recebimentos.length})`, recebimentos.length ? `<table class="folha-tabela">
      <thead><tr>${umDia ? '' : '<th>Data</th>'}<th>Venda</th><th>Forma de pagamento</th><th class="num">Valor</th></tr></thead>
      <tbody>${recebimentos.map((i) => `<tr>${umDia ? '' : `<td class="quando">${formatarDataRelatorio(i.dia)}</td>`}<td class="forte">#${escapeHtml(i.venda_id)}</td><td>${escapeHtml(i.forma_pagamento || 'Outro')}</td><td class="num">${formatarMoedaRelatorio(i.valor)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="${umDia ? 2 : 3}">Total</td><td class="num">${formatarMoedaRelatorio(total)}</td></tr></tfoot>
    </table>` : vazioFolha(umDia ? 'Nenhum recebimento neste dia.' : 'Nenhum recebimento neste período.'));
  html += rodapeFolha('Vendas canceladas são estornadas e não aparecem no caixa.');
  folha.innerHTML = html;
}


// ---------- Vendas por evento ----------
let relatorioEventos = { dados: null, chave: '', erro: '' };
let opcoesEventosRelatorio = [];
function intervaloEventosAtalho(tipo) {
  const hoje = hojeNaLoja();
  if (tipo === 'ano') return [`${hoje.slice(0, 4)}-01-01`, hoje];
  if (tipo === '12meses') return [`${Number(hoje.slice(0, 4)) - 1}-${hoje.slice(5, 7)}-01`, hoje];
  return intervaloDoAtalho(tipo);
}
function marcarAtalhosEventos() {
  const i = document.getElementById('relatorio-eventos-inicio').value;
  const f = document.getElementById('relatorio-eventos-fim').value;
  document.querySelectorAll('[data-atalho="eventos"]').forEach((b) => { const [a, z] = intervaloEventosAtalho(b.dataset.periodoAtalho); b.classList.toggle('ativo', a === i && z === f); });
}
async function carregarRelatorioEventos(forcar = false) {
  const inicio = document.getElementById('relatorio-eventos-inicio').value;
  const fim = document.getElementById('relatorio-eventos-fim').value;
  const evento = document.getElementById('relatorio-eventos-evento').value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim) || fim < inicio) { relatorioEventos = { dados: null, chave: '', erro: 'Escolha datas válidas: a data final não pode ser anterior à inicial.' }; renderizarFolhaEventos(); return; }
  const chave = `${inicio}|${fim}|${evento}`;
  if (!forcar && chave === relatorioEventos.chave && relatorioEventos.dados) { renderizarFolhaEventos(); return; }
  relatorioEventos = { dados: null, chave, erro: '' };
  renderizarFolhaEventos();
  try {
    const resposta = await fetch(`${API_URL}/relatorios/eventos?${new URLSearchParams({ inicio, fim, ...(evento ? { evento_id: evento } : {}) })}`);
    const corpo = await resposta.json();
    if (chave !== relatorioEventos.chave) return;
    if (!resposta.ok) throw new Error(corpo.error || 'Não foi possível montar o relatório.');
    relatorioEventos = { dados: corpo, chave, erro: '' };
    if (!evento) {
      // A lista de eventos do seletor sai do próprio período.
      opcoesEventosRelatorio = corpo.eventos.map((e) => ({ id: e.id, titulo: e.titulo, data: e.data }));
      const sel = document.getElementById('relatorio-eventos-evento');
      const html = '<option value="">Todos os eventos do período</option>' + opcoesEventosRelatorio.map((e) => `<option value="${e.id}">${escapeHtml(e.titulo)} · ${escapeHtml(formatarDataRelatorio(e.data).slice(0, 5))}</option>`).join('');
      if (sel._html !== html) { sel._html = html; sel.innerHTML = html; }
    }
  } catch (erro) {
    if (chave !== relatorioEventos.chave) return;
    relatorioEventos = { dados: null, chave, erro: erro.message };
  }
  renderizarFolhaEventos();
}
function renderizarFolhaEventos() {
  const folha = document.getElementById('folha-eventos');
  if (!folha) return;
  const inicio = document.getElementById('relatorio-eventos-inicio').value;
  const fim = document.getElementById('relatorio-eventos-fim').value;
  const selEvento = document.getElementById('relatorio-eventos-evento');
  const filtro = selEvento.value ? selEvento.selectedOptions[0]?.textContent || '' : '';
  const subtitulo = /^\d{4}-/.test(inicio) && /^\d{4}-/.test(fim) && fim >= inicio ? rotuloPeriodo(inicio, fim) : 'Datas inválidas';
  const d = relatorioEventos.dados;
  if (!d || relatorioEventos.erro) {
    folha.innerHTML = cabecalhoFolha('Vendas por evento', subtitulo, [['Evento', filtro]]) + `<div class="folha-carregando">${escapeHtml(relatorioEventos.erro || 'Montando o relatório…')}</div>`;
    return;
  }
  const r = d.resumo;
  const datas = (e) => (e.data_fim ? `${formatarDataRelatorio(e.data).slice(0, 5)} a ${formatarDataRelatorio(e.data_fim)}` : formatarDataRelatorio(e.data));
  let html = cabecalhoFolha('Vendas por evento', subtitulo, [['Evento', filtro]]);
  html += `<div class="folha-kpis kpis-4">
      ${kpiFolha('Faturado em eventos', formatarMoedaRelatorio(r.faturamento), `${numeroRelatorio(r.vendas)} vendas · ticket ${formatarMoedaRelatorio(r.ticket_medio)}`, 'kpi-destaque')}
      ${kpiFolha('Peças vendidas', numeroRelatorio(r.pecas), r.brindes ? `+ ${numeroRelatorio(r.brindes)} brindes` : 'nos eventos')}
      ${kpiFolha('Eventos', numeroRelatorio(r.eventos), `${r.eventos_com_vendas} com vendas`)}
      ${kpiFolha('Parte das vendas', `${String(r.participacao).replace('.', ',')}%`, `loja: ${formatarMoedaRelatorio(r.loja.faturamento)}`)}
    </div>`;
  const total = r.faturamento + r.loja.faturamento;
  if (total > 0 && !selEvento.value) {
    html += `<div class="folha-composicao">
        <div class="folha-composicao-titulo"><span>Eventos × loja no período</span><strong>${formatarMoedaRelatorio(total)} vendidos</strong></div>
        <div class="folha-barra"><span class="parte-brindes" style="width:${(r.faturamento / total * 100).toFixed(2)}%"></span><span class="parte-vendidas" style="width:${(r.loja.faturamento / total * 100).toFixed(2)}%"></span></div>
        <ul class="folha-legenda"><li><i class="parte-brindes"></i>Eventos <strong>${formatarMoedaRelatorio(r.faturamento)}</strong> <small>${numeroRelatorio(r.pecas)} peças</small></li><li><i class="parte-vendidas"></i>Loja <strong>${formatarMoedaRelatorio(r.loja.faturamento)}</strong> <small>${numeroRelatorio(r.loja.pecas)} peças</small></li></ul>
      </div>`;
  }
  const nomeTipo = (t) => (TIPOS_EVENTO[t] || TIPOS_EVENTO.outro).nome;
  let n = 0;
  html += secaoFolha(++n, `Por evento (${d.eventos.length})`, d.eventos.length ? `<table class="folha-tabela tabela-por-evento">
      <thead><tr><th>Data</th><th>Evento</th><th class="num">Vendas</th><th class="num">Peças</th><th class="num">Brindes</th><th class="num">Ticket médio</th><th class="num">Faturamento</th></tr></thead>
      <tbody>${d.eventos.map((e) => `<tr>
        <td class="quando">${escapeHtml(datas(e))}</td>
        <td><strong>${escapeHtml(e.titulo)}</strong><small>${escapeHtml([nomeTipo(e.tipo), e.local].filter(Boolean).join(' · '))}${e.canceladas ? ` · ${e.canceladas} cancelada(s) fora` : ''}</small></td>
        <td class="num">${e.vendas || '<span class="zero">–</span>'}</td><td class="num">${e.pecas || '<span class="zero">–</span>'}</td><td class="num">${e.brindes || '<span class="zero">–</span>'}${e.doacoes ? `<small>+${e.doacoes} doação</small>` : ''}</td>
        <td class="num">${e.vendas ? formatarMoedaRelatorio(e.ticket_medio) : '<span class="zero">–</span>'}</td><td class="num forte">${formatarMoedaRelatorio(e.faturamento)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="2">Total</td><td class="num">${r.vendas}</td><td class="num">${r.pecas}</td><td class="num">${r.brindes}</td><td class="num">${formatarMoedaRelatorio(r.ticket_medio)}</td><td class="num">${formatarMoedaRelatorio(r.faturamento)}</td></tr></tfoot>
    </table>` : vazioFolha('Nenhum evento neste período.'), 'Só entram vendas feitas com o evento escolhido em "Onde é a venda?" no PDV. Vendas canceladas ficam fora. Brindes: os dados nas vendas e os registrados no Movimentar com o evento.');
  if (d.produtos.length) {
    html += secaoFolha(++n, 'Mais vendidos nos eventos', `<table class="folha-tabela">
        <thead><tr><th>Produto</th><th class="num">Peças</th><th class="num">Valor vendido</th></tr></thead>
        <tbody>${d.produtos.slice(0, 15).map((p) => `<tr><td>${escapeHtml(p.produto_nome)}<small>${escapeHtml(p.categoria || '')}</small></td><td class="num forte">${p.quantidade}</td><td class="num">${formatarMoedaRelatorio(p.valor)}</td></tr>`).join('')}</tbody>
      </table>`, d.produtos.length > 15 ? `Os 15 primeiros de ${d.produtos.length} produtos.` : '');
  }
  if (document.getElementById('relatorio-eventos-produtos').checked) {
    for (const e of d.eventos.filter((x) => x.produtos.length)) {
      html += secaoFolha(++n, e.titulo, `<table class="folha-tabela">
          <thead><tr><th>Produto</th><th class="num">Peças</th><th class="num">Valor vendido</th></tr></thead>
          <tbody>${e.produtos.map((p) => `<tr><td>${escapeHtml(p.produto_nome)}</td><td class="num">${p.quantidade}</td><td class="num">${formatarMoedaRelatorio(p.valor)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td>${datas(e)}${e.local ? ` · ${escapeHtml(e.local)}` : ''}</td><td class="num">${e.pecas}</td><td class="num">${formatarMoedaRelatorio(e.faturamento)}</td></tr></tfoot>
        </table>${e.por_pagamento.length ? `<p class="folha-nota">Pagamento: ${e.por_pagamento.map((p) => `${escapeHtml(p.forma)} ${formatarMoedaRelatorio(p.valor)}`).join(' · ')}</p>` : ''}`);
    }
  }
  html += rodapeFolha('Valor vendido = quantidade × preço da peça, antes do desconto da venda.');
  folha.innerHTML = html;
}

// ---------- Controle da tela ----------
function atualizarCategoriasRelatorio() {
  const categorias = [...new Set(relatorioProdutosState.map((p) => p.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  ['relatorio-categoria', 'relatorio-estoque-categoria'].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    const atual = select.value;
    const opcoes = '<option value="">Todas as categorias</option>' + categorias.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if (select.dataset.opcoes !== opcoes) { select.innerHTML = opcoes; select.dataset.opcoes = opcoes; }
    if (categorias.includes(atual)) select.value = atual;
  });
}
function trocarRelatorio(nome) {
  relatorioAtivo = ['saidas', 'estoque', 'caixa', 'eventos'].includes(nome) ? nome : 'saidas';
  document.querySelectorAll('[data-relatorio]').forEach((b) => { const ativa = b.dataset.relatorio === relatorioAtivo; b.classList.toggle('ativa', ativa); b.setAttribute('aria-selected', String(ativa)); });
  document.querySelectorAll('[data-controles]').forEach((c) => { c.hidden = c.dataset.controles !== relatorioAtivo; });
  document.querySelectorAll('.folha-area .folha').forEach((f) => { f.hidden = f.dataset.folha !== relatorioAtivo; });
  document.getElementById('relatorio-aviso').textContent = '';
  salvarPreferencia('erp-relatorio-ativo', relatorioAtivo);
  if (relatorioVisivel()) renderizarRelatorios(true);
}
// Chamada quando produtos, vendas ou caixa são recarregados e ao abrir a aba.
function renderizarRelatorios(forcar = false) {
  atualizarCategoriasRelatorio();
  if (!relatorioVisivel() && !forcar) return;
  if (relatorioAtivo === 'saidas') carregarRelatorioSaidas(forcar);
  else if (relatorioAtivo === 'estoque') carregarRelatorioEstoque(false);
  else if (relatorioAtivo === 'eventos') carregarRelatorioEventos(forcar);
  else renderizarFolhaCaixa();
}
function renderizarRelatorioCaixa() { if (relatorioVisivel() && relatorioAtivo === 'caixa') renderizarFolhaCaixa(); }

function definirPeriodoRelatorio(tipo) {
  const hoje = hojeNaLoja();
  let inicio = hoje, fim = hoje;
  if (tipo === 'ontem') { inicio = fim = somarDiasIso(hoje, -1); }
  else if (tipo === '7dias') { inicio = somarDiasIso(hoje, -6); }
  else if (tipo === 'mes') { inicio = `${hoje.slice(0, 8)}01`; }
  else if (tipo === 'mes-passado') { fim = somarDiasIso(`${hoje.slice(0, 8)}01`, -1); inicio = `${fim.slice(0, 8)}01`; }
  document.getElementById('relatorio-inicio').value = inicio;
  document.getElementById('relatorio-fim').value = fim;
  marcarPeriodoAtivo();
  carregarRelatorioSaidas(true);
}
function marcarPeriodoAtivo() {
  const { inicio, fim } = filtrosSaidas();
  const hoje = hojeNaLoja();
  const ontem = somarDiasIso(hoje, -1);
  const fimMesPassado = somarDiasIso(`${hoje.slice(0, 8)}01`, -1);
  const mapa = { hoje: [hoje, hoje], ontem: [ontem, ontem], '7dias': [somarDiasIso(hoje, -6), hoje], mes: [`${hoje.slice(0, 8)}01`, hoje], 'mes-passado': [`${fimMesPassado.slice(0, 8)}01`, fimMesPassado] };
  document.querySelectorAll('[data-periodo]').forEach((b) => { const [i, f] = mapa[b.dataset.periodo]; b.classList.toggle('ativo', i === inicio && f === fim); });
}

function nomeArquivoRelatorio() {
  if (relatorioAtivo === 'saidas') { const { inicio, fim } = filtrosSaidas(); return `Difeecult - Saidas e vendas ${inicio === fim ? inicio : `${inicio} a ${fim}`}`; }
  const trecho = (grupo) => { const i = intervaloDoGrupo(grupo); return i.umDia ? i.inicio : `${i.inicio} a ${i.fim}`; };
  if (relatorioAtivo === 'estoque') return `Difeecult - ${modoData('estoque') === 'periodo' && !intervaloDoGrupo('estoque').umDia ? 'Movimento' : 'Posicao'} de estoque ${trecho('estoque')}`;
  if (relatorioAtivo === 'eventos') { const i = document.getElementById('relatorio-eventos-inicio').value; const f = document.getElementById('relatorio-eventos-fim').value; return `Difeecult - Vendas por evento ${i === f ? i : `${i} a ${f}`}`; }
  return `Difeecult - Caixa ${trecho('caixa')}`;
}
// Copia a folha ativa para a área de impressão (fora do layout do sistema).
function prepararImpressaoRelatorio() {
  const folha = document.querySelector(`.folha-area .folha[data-folha="${relatorioAtivo}"]`);
  if (!folha) return false;
  let area = document.getElementById('area-impressao');
  if (!area) { area = document.createElement('div'); area.id = 'area-impressao'; document.body.appendChild(area); }
  area.innerHTML = `<article class="folha folha-impressa">${folha.innerHTML}</article>`;
  document.body.dataset.tituloAntes = document.title;
  document.title = nomeArquivoRelatorio(); // vira o nome sugerido do PDF
  document.body.classList.add('imprimindo-folha');
  return true;
}
function encerrarImpressaoRelatorio() {
  if (!document.body.classList.contains('imprimindo-folha')) return;
  document.body.classList.remove('imprimindo-folha');
  if (document.body.dataset.tituloAntes) document.title = document.body.dataset.tituloAntes;
  delete document.body.dataset.tituloAntes;
}
async function imprimirRelatorio() {
  if (relatorioAtivo === 'saidas') {
    if (!filtrosSaidas().valido) { showToast('Escolha um período válido antes de gerar o PDF.', 'error'); return; }
    await carregarRelatorioSaidas(true);
    if (relatorioSaidas.erro) { showToast(relatorioSaidas.erro, 'error'); return; }
  } else if (relatorioAtivo === 'estoque') {
    if (!intervaloDoGrupo('estoque').valido) { showToast('Escolha datas válidas antes de gerar o PDF.', 'error'); return; }
    await carregarRelatorioEstoque(true);
    if (relatorioEstoque.erro) { showToast(relatorioEstoque.erro, 'error'); return; }
  } else if (relatorioAtivo === 'eventos') {
    await carregarRelatorioEventos(true);
    if (relatorioEventos.erro) { showToast(relatorioEventos.erro, 'error'); return; }
  } else {
    if (!intervaloDoGrupo('caixa').valido) { showToast('Escolha datas válidas antes de gerar o PDF.', 'error'); return; }
    renderizarFolhaCaixa();
  }
  if (prepararImpressaoRelatorio()) window.print();
}

function iniciarRelatorios() {
  const hoje = hojeNaLoja();
  document.getElementById('relatorio-inicio').value = hoje;
  document.getElementById('relatorio-fim').value = hoje;
  marcarPeriodoAtivo();
  try {
    const ocultas = JSON.parse(lerPreferencia('erp-relatorio-secoes-ocultas', '[]'));
    document.querySelectorAll('[data-secao-toggle]').forEach((c) => { c.checked = !ocultas.includes(c.dataset.secaoToggle); });
  } catch (_) { /* preferência corrompida: mantém tudo marcado */ }
  document.querySelectorAll('[data-relatorio]').forEach((b) => b.addEventListener('click', () => trocarRelatorio(b.dataset.relatorio)));
  document.querySelectorAll('[data-periodo]').forEach((b) => b.addEventListener('click', () => definirPeriodoRelatorio(b.dataset.periodo)));
  let espera = null;
  const aoFiltrar = () => { marcarPeriodoAtivo(); clearTimeout(espera); espera = setTimeout(() => carregarRelatorioSaidas(true), 300); };
  ['relatorio-inicio', 'relatorio-fim', 'relatorio-busca', 'relatorio-categoria', 'relatorio-pagamento'].forEach((id) => document.getElementById(id).addEventListener('input', aoFiltrar));
  document.querySelectorAll('[data-secao-toggle]').forEach((c) => c.addEventListener('change', () => {
    salvarPreferencia('erp-relatorio-secoes-ocultas', JSON.stringify([...document.querySelectorAll('[data-secao-toggle]')].filter((x) => !x.checked).map((x) => x.dataset.secaoToggle)));
    renderizarFolhaSaidas();
  }));
  ['relatorio-estoque-busca', 'relatorio-estoque-categoria', 'relatorio-estoque-filtro', 'relatorio-estoque-inativos'].forEach((id) => document.getElementById(id).addEventListener('input', renderizarFolhaEstoque));
  // Uma data ou de uma data a outra (estoque e caixa)
  const atualizarGrupo = { estoque: () => carregarRelatorioEstoque(false), caixa: renderizarFolhaCaixa };
  ['estoque', 'caixa'].forEach((grupo) => {
    const [ini, fimMes] = intervaloDoAtalho('mes');
    document.getElementById(`relatorio-${grupo}-data`).value = hoje;
    document.getElementById(`relatorio-${grupo}-inicio`).value = ini;
    document.getElementById(`relatorio-${grupo}-fim`).value = fimMes;
    definirModoData(grupo, lerPreferencia(`erp-relatorio-modo-${grupo}`, 'dia') === 'periodo' ? 'periodo' : 'dia');
    document.querySelectorAll(`.modo-data[data-grupo="${grupo}"] [data-modo]`).forEach((b) => b.addEventListener('click', () => { definirModoData(grupo, b.dataset.modo); atualizarGrupo[grupo](); }));
    document.querySelectorAll(`[data-atalho="${grupo}"]`).forEach((b) => b.addEventListener('click', () => {
      const [i, f] = intervaloDoAtalho(b.dataset.periodoAtalho);
      document.getElementById(`relatorio-${grupo}-inicio`).value = i;
      document.getElementById(`relatorio-${grupo}-fim`).value = f;
      marcarAtalhosGrupo(grupo); atualizarGrupo[grupo]();
    }));
    [`relatorio-${grupo}-data`, `relatorio-${grupo}-inicio`, `relatorio-${grupo}-fim`].forEach((id) => document.getElementById(id).addEventListener('input', () => {
      marcarAtalhosGrupo(grupo);
      clearTimeout(espera); espera = setTimeout(atualizarGrupo[grupo], 250);
    }));
  });
  // Vendas por evento: padrão "Este ano"
  const [anoIni, anoFim] = intervaloEventosAtalho('ano');
  document.getElementById('relatorio-eventos-inicio').value = anoIni;
  document.getElementById('relatorio-eventos-fim').value = anoFim;
  marcarAtalhosEventos();
  document.querySelectorAll('[data-atalho="eventos"]').forEach((b) => b.addEventListener('click', () => {
    const [i, f] = intervaloEventosAtalho(b.dataset.periodoAtalho);
    document.getElementById('relatorio-eventos-inicio').value = i;
    document.getElementById('relatorio-eventos-fim').value = f;
    marcarAtalhosEventos(); carregarRelatorioEventos(true);
  }));
  ['relatorio-eventos-inicio', 'relatorio-eventos-fim', 'relatorio-eventos-evento'].forEach((id) => document.getElementById(id).addEventListener('input', () => { marcarAtalhosEventos(); clearTimeout(espera); espera = setTimeout(() => carregarRelatorioEventos(true), 250); }));
  document.getElementById('relatorio-eventos-produtos').addEventListener('change', renderizarFolhaEventos);
  document.getElementById('relatorio-baixar-pdf').addEventListener('click', imprimirRelatorio);
  window.addEventListener('afterprint', encerrarImpressaoRelatorio);
  window.addEventListener('beforeprint', () => {
    // Ctrl+P na aba Relatórios imprime a folha aberta, como o botão.
    if (document.body.classList.contains('imprimindo-holerite') || document.body.classList.contains('imprimindo-folha') || !relatorioVisivel()) return;
    prepararImpressaoRelatorio();
  });
  const salvo = lerPreferencia('erp-relatorio-ativo', 'saidas');
  trocarRelatorio(salvo);
}

function statusRelatorioVenda(status) {
  const estados = {
    confirmado: 'Confirmado',
    aprovado: 'Aprovado',
    aguardando: 'Aguardando confirmação',
    processando: 'Processando',
    recusado: 'Recusado',
    cancelado: 'Cancelado',
    divergencia: 'Divergência',
    resultado_desconhecido: 'Resultado desconhecido'
  };
  return estados[status] || status || 'Não informado';
}

// Regra unica da secao 4: cancelada ou recusada nao soma em nenhum total.
// Usada pelo dashboard e pelos relatorios para os numeros nao divergirem.
function vendaForaDoFaturamento(venda) {
  const estado = venda.status_pagamento === 'confirmado' ? 'aprovado' : venda.status_pagamento === 'divergencia' ? 'resultado_desconhecido' : venda.status_pagamento;
  return ['cancelado', 'recusado'].includes(estado);
}

function configurarRelatorios() {
  iniciarRelatorios();
  const descontoManual = document.getElementById('venda-desconto-manual-percentual');
  descontoManual.addEventListener('keydown', (event) => {
    if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
  });
  descontoManual.addEventListener('paste', (event) => {
    const texto = event.clipboardData.getData('text').trim();
    event.preventDefault();
    const valor = texto.replace(/[^\d.,]/g, '').replace(',', '.');
    if (!/^\d*(?:\.\d*)?$/.test(valor)) return;
    descontoManual.value = valor;
    descontoManual.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const descontoReais = document.getElementById('venda-desconto-reais');
  descontoReais.addEventListener('keydown', (event) => {
    if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
  });
}

configurarRelatorios();

function cancelarVenda(id) { abrirCancelarVenda(id); }

let canceladasAssinatura = '';
async function carregarVendasCanceladas() {
  const tabela = document.getElementById('tabela-vendas-canceladas');
  if (!tabela) return;
  const busca = document.getElementById('canceladas-busca')?.value.trim() || '';
  const res = await fetch(`${API_URL}/vendas-canceladas${busca ? `?busca=${encodeURIComponent(busca)}` : ''}`, { headers: getHeadersComUsuario() });
  if (!res.ok) return;
  const registros = await res.json();
  const assinatura = JSON.stringify([busca, registros]);
  if (assinatura === canceladasAssinatura) return;
  canceladasAssinatura = assinatura;
  tabela.innerHTML = registros.length ? registros.map((c) => `<tr>
      <td class="sem-quebra"><strong>#${c.venda_id}</strong></td>
      <td class="sem-quebra">${c.venda_criada_em ? escapeHtml(formatarDataHora(c.venda_criada_em)) : escapeHtml(dataBR(String(c.data_venda).slice(0, 10)))}</td>
      <td>${htmlItensDaVenda(c.itens, c.produto_nome)}${c.cpf_nota ? `<small class="cell-note">CPF na nota: ${escapeHtml(formatarCpfNota(c.cpf_nota))}</small>` : ''}</td>
      <td>${escapeHtml(c.vendedor_nome || '-')}</td>
      <td class="sem-quebra"><strong>${formatarMoeda(c.total)}</strong><small class="cell-note">${escapeHtml(c.forma_pagamento || '')}</small></td>
      <td>${escapeHtml(c.motivo)}</td>
      <td>${escapeHtml(c.cancelado_por_nome || '-')}<small class="cell-note">${escapeHtml(formatarDataHora(c.cancelado_em))}</small></td>
    </tr>`).join('') : `<tr><td colspan="7" class="empty-cell">${busca ? 'Nenhuma venda cancelada encontrada.' : 'Nenhuma venda cancelada.'}</td></tr>`;
}


// ================= INDICADORES DE VENDAS E FINANCEIROS =================
let mesDashboardAtual = null;
const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function mesAtualISO() { return hojeISO().slice(0, 7); }
// Soma meses respeitando a virada de ano.
function deslocarMes(mes, delta) {
  const [ano, mesNumero] = mes.split('-').map(Number);
  const referencia = new Date(Date.UTC(ano, mesNumero - 1 + delta, 1));
  return `${referencia.getUTCFullYear()}-${String(referencia.getUTCMonth() + 1).padStart(2, '0')}`;
}
function rotuloMes(mes) {
  const [ano, mesNumero] = mes.split('-').map(Number);
  return `${NOMES_MESES[mesNumero - 1]} de ${ano}`;
}
function formatarMoeda(valor) {
  return `R$ ${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ================= MENU LATERAL, BARRA SUPERIOR E ATALHOS =================
const ABAS = {
  'tab-dashboard': ['Comercial', 'Dashboard'],
  'tab-vendas': ['Comercial', 'Vendas (PDV)'],
  'tab-caixa': ['Comercial', 'Caixa'],
  'tab-estoque': ['Comercial', 'Produtos & Estoque'],
  'tab-precos': ['Comercial', 'Preço & custo'],
  'tab-avisos': ['Comercial', 'Quadro de avisos'],
  'tab-eventos': ['Comercial', 'Eventos'],
  'tab-movimentar': ['Comercial', 'Movimentar'],
  'tab-relatorios': ['Comercial', 'Relatórios'],
  'tab-contas': ['Financeiro', 'Contas a Pagar'],
  'tab-recebimentos': ['Financeiro', 'Contas a Receber'],
  'tab-clt': ['Cadastros', 'Funcionários'],
  'tab-fornecedores': ['Cadastros', 'Fornecedores'],
  'tab-descontos': ['Cadastros', 'Cupons de Influencer'],
  'tab-historico-produtos': ['Administrativo', 'Histórico de Produtos'],
  'tab-log': ['Administrativo', 'Log de Atividades'],
  'tab-parametros': ['Administrativo', 'Parâmetros do Sistema'],
  'tab-usuarios': ['Administrativo', 'Usuários e acessos']
};
const CHAVE_MENU = 'erp-menu';
const ICONES = {
  alerta: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18h.01"/>',
  caixa: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  seta: '<path d="M9 6l6 6-6 6"/>',
  vendas: '<path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
  raio: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>'
};
const icone = (caminhos) => `<svg class="icone" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${caminhos}</svg>`;

function atualizarTopbar(tabName) {
  const [grupo, pagina] = ABAS[tabName] || ['', ''];
  const rotuloGrupo = document.getElementById('topbar-grupo');
  const rotuloPagina = document.getElementById('topbar-pagina');
  if (rotuloGrupo) rotuloGrupo.textContent = grupo;
  if (rotuloPagina) rotuloPagina.textContent = pagina;
  if (pagina) document.title = `${pagina} · Difeecult`;
}


function irParaAba(tab) {
  if (!podeAbrirAba(tab)) { showToast('Você não tem acesso a esta área.', 'error'); return false; }
  openTab(null, tab);
  window.scrollTo({ top: 0, behavior: prefereMenosMovimento() ? 'auto' : 'smooth' });
  return true;
}

// Menu recolhido no computador (guardado no navegador) e gaveta no celular.
const layoutApp = document.getElementById('appScreen');
const fundoMenu = document.getElementById('sidebar-fundo');
const botaoAbrirMenu = document.getElementById('abrir-menu');
const botaoRecolher = document.getElementById('colapsar-menu');

function aplicarMenuRecolhido(recolhido, salvar = true) {
  layoutApp.classList.toggle('menu-recolhido', recolhido);
  const rotulo = recolhido ? 'Expandir menu' : 'Recolher menu';
  botaoRecolher.setAttribute('aria-label', rotulo);
  botaoRecolher.title = rotulo;
  botaoRecolher.querySelector('.sidebar-label').textContent = rotulo;
  if (salvar) { try { localStorage.setItem(CHAVE_MENU, recolhido ? 'recolhido' : 'aberto'); } catch (_) { /* vale só nesta sessão */ } }
}
function abrirMenuMovel() {
  layoutApp.classList.add('menu-aberto');
  fundoMenu.hidden = false;
  botaoAbrirMenu.setAttribute('aria-expanded', 'true');
}
function fecharMenuMovel() {
  if (!layoutApp.classList.contains('menu-aberto')) return;
  layoutApp.classList.remove('menu-aberto');
  fundoMenu.hidden = true;
  botaoAbrirMenu.setAttribute('aria-expanded', 'false');
}
botaoAbrirMenu.addEventListener('click', () => (layoutApp.classList.contains('menu-aberto') ? fecharMenuMovel() : abrirMenuMovel()));

// ================= CELULAR: NAVEGAÇÃO INFERIOR E TABELAS EM CARTÕES =================
// A barra inferior leva às telas mais usadas; o botão Menu abre a gaveta lateral.
function atualizarNavInferior(tabName) {
  document.querySelectorAll('.nav-inferior-btn[data-aba]').forEach((botao) => {
    const ativo = botao.dataset.aba === tabName;
    botao.classList.toggle('ativo', ativo);
    if (ativo) botao.setAttribute('aria-current', 'page'); else botao.removeAttribute('aria-current');
  });
}
document.querySelectorAll('.nav-inferior-btn[data-aba]').forEach((botao) => botao.addEventListener('click', () => openTab(null, botao.dataset.aba)));
document.getElementById('nav-inferior-menu').addEventListener('click', () => (layoutApp.classList.contains('menu-aberto') ? fecharMenuMovel() : abrirMenuMovel()));

// No celular cada linha da tabela vira um cartão "rótulo: valor". O rótulo vem do
// cabeçalho da coluna (data-rotulo) e é refeito sempre que a tabela é redesenhada.
function rotularTabela(tabela) {
  const cabecalho = [...tabela.querySelectorAll('thead th')].map((th) => th.textContent.trim());
  if (!cabecalho.length) return;
  tabela.querySelectorAll('tbody tr, tfoot tr').forEach((linha) => {
    let coluna = 0;
    [...linha.children].forEach((celula) => {
      if (celula.tagName !== 'TD') return;
      const largura = Number(celula.getAttribute('colspan') || 1);
      if (largura > 1) { celula.classList.add('celula-unica'); coluna += largura; return; }
      if (cabecalho[coluna] && !/^a[cç](ão|ões|oes|ao)$/i.test(cabecalho[coluna])) celula.dataset.rotulo = cabecalho[coluna];
      else celula.classList.add('celula-acoes');
      if (celula.querySelector('button, a.btn')) celula.classList.add('celula-com-botoes');
      coluna += 1;
    });
  });
}
let rotulagemAgendada = false;
function agendarRotulagemTabelas() {
  if (rotulagemAgendada) return;
  rotulagemAgendada = true;
  requestAnimationFrame(() => {
    rotulagemAgendada = false;
    document.querySelectorAll('.table-responsive table').forEach(rotularTabela);
  });
}
new MutationObserver(agendarRotulagemTabelas).observe(document.body, { childList: true, subtree: true });
agendarRotulagemTabelas();
fundoMenu.addEventListener('click', fecharMenuMovel);
botaoRecolher.addEventListener('click', () => aplicarMenuRecolhido(!layoutApp.classList.contains('menu-recolhido')));
try { if (localStorage.getItem(CHAVE_MENU) === 'recolhido') aplicarMenuRecolhido(true, false); } catch (_) { /* sem armazenamento */ }

// Atalhos de ação: usados pela barra superior, pelo dashboard e pela paleta.
function executarAcao(acao) {
  const focar = (seletor) => {
    requestAnimationFrame(() => {
      const campo = seletor && document.querySelector(seletor);
      if (!campo) return;
      campo.focus();
      campo.scrollIntoView({ block: 'center', behavior: prefereMenosMovimento() ? 'auto' : 'smooth' });
    });
  };
  if (acao === 'nova-venda') { if (irParaAba('tab-vendas')) focar('#venda-produto-busca'); }
  else if (acao === 'entrada-estoque') { if (irParaAba('tab-estoque')) { abrirPainelEstoque('estoque'); definirTipoLote('Entrada'); focar('#estoque-busca'); } }
  else if (acao === 'novo-modelo') { if (irParaAba('tab-estoque')) { abrirPainelEstoque('cadastrar'); focar('#modelo-nome'); } }
  else if (acao === 'novo-evento') { if (irParaAba('tab-eventos')) focar('#evento-titulo'); }
  else if (acao === 'relatorios') irParaAba('tab-relatorios');
  else if (acao === 'nova-conta') { if (irParaAba('tab-contas')) abrirNovaConta(); }
  else if (acao === 'novo-recebimento') { if (irParaAba('tab-recebimentos')) document.getElementById('novo-recebimento').click(); }
  else if (acao === 'novo-funcionario') { if (irParaAba('tab-clt')) abrirFormFuncionario(); }
  else if (acao === 'holerites') { if (irParaAba('tab-clt')) mostrarPainelFuncionarios('folha'); }
}

function venderProduto(produto) {
  if (!irParaAba('tab-vendas')) return;
  // Põe 1 peça na venda (se o CPF ainda não foi perguntado, a pergunta vem antes).
  if (cpfVenda?.respondido) adicionarAoCarrinho(produto.id, 1);
  else {
    const campo = document.getElementById('venda-produto-busca');
    campo.value = produto.nome;
    renderizarVitrine();
  }
}

function reporProduto(id) {
  // Vem do Dashboard ou do Quadro de avisos: abre o estoque já no campo da peça.
  if (!irParaAba('tab-estoque')) return;
  abrirPainelEstoque('estoque');
  definirTipoLote('Entrada');
  for (const [campo, valor] of [['estoque-busca', ''], ['estoque-categoria', ''], ['estoque-nivel', ''], ['filtro-produto-status', 'ativos']]) { const el = document.getElementById(campo); if (el) el.value = valor; }
  renderizarTelaEstoque(true);
  requestAnimationFrame(() => {
    const campo = document.querySelector(`#tab-estoque .estoque-painel[data-painel="estoque"] [data-lote="${id}"]:not([hidden])`);
    if (!campo) return;
    campo.scrollIntoView({ block: 'center', behavior: prefereMenosMovimento() ? 'auto' : 'smooth' });
    campo.focus();
    campo.closest('td, .peca-linha')?.classList.add('lote-destaque');
    setTimeout(() => campo.closest('td, .peca-linha')?.classList.remove('lote-destaque'), 2200);
  });
}

document.addEventListener('click', (evento) => {
  const acao = evento.target.closest('[data-acao]');
  if (acao) { evento.preventDefault(); executarAcao(acao.dataset.acao); return; }
  const destino = evento.target.closest('[data-ir]');
  if (destino) { evento.preventDefault(); irParaAba(destino.dataset.ir); if (destino.dataset.param) mostrarCategoriaParametros(destino.dataset.param); return; }
  const repor = evento.target.closest('[data-repor]');
  if (repor) { evento.preventDefault(); reporProduto(repor.dataset.repor); }
});

// ================= PALETA DE BUSCA (Ctrl+K) =================
// Reúne páginas, ações e produtos em uma lista só, pesquisável pelo teclado.
const CHAVE_RECENTES = 'erp-recentes';
const paletaEstado = { aberta: false, itens: [], ativo: 0, anterior: null };
const paletaEl = document.getElementById('paleta');
const paletaInput = document.getElementById('paleta-input');
const paletaLista = document.getElementById('paleta-lista');
const normalizar = (texto) => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function lerRecentes() {
  try { const lista = JSON.parse(localStorage.getItem(CHAVE_RECENTES) || '[]'); return Array.isArray(lista) ? lista.slice(0, 4) : []; } catch (_) { return []; }
}
function registrarRecente(id) {
  if (id.startsWith('produto:')) return; // produtos mudam de saldo; só páginas e ações viram "recentes"
  const lista = [id, ...lerRecentes().filter((item) => item !== id)].slice(0, 4);
  try { localStorage.setItem(CHAVE_RECENTES, JSON.stringify(lista)); } catch (_) { /* sem armazenamento */ }
}

function itensDaPaleta() {
  const admin = pode('estoque', 'editar');
  const itens = [];
  // Páginas: lidas do próprio menu, que já respeita as permissões do usuário.
  document.querySelectorAll('#sidebar .sidebar-btn').forEach((botao) => {
    if (botao.style.display === 'none' || botao.closest('.menu-grupo')?.style.display === 'none') return;
    const alvo = /'(tab-[a-z-]+)'/.exec(botao.getAttribute('onclick') || '');
    if (!alvo) return;
    itens.push({ id: `pagina:${alvo[1]}`, grupo: 'Ir para', titulo: ABAS[alvo[1]]?.[1] || botao.title, dica: ABAS[alvo[1]]?.[0] || '', icone: botao.querySelector('svg')?.outerHTML || '', executar: () => irParaAba(alvo[1]) });
  });
  const acoes = [
    ['nova-venda', 'Nova venda', 'Abrir o PDV', false],
    ['entrada-estoque', 'Entrada de estoque', 'Repor produtos', true],
    ['novo-modelo', 'Novo modelo com cores e tamanhos', 'Produtos & Estoque', true],
    ['novo-evento', 'Novo evento', 'Planilha de envio', false],
    ['relatorios', 'Imprimir relatório', 'Relatórios e PDF', false],
    ['nova-conta', 'Lançar conta a pagar', 'Contas a pagar', 'contas'],
    ['novo-recebimento', 'Lançar valor a receber', 'Contas a receber', 'recebimentos'],
    ['novo-funcionario', 'Cadastrar funcionário', 'Funcionários', 'clt'],
    ['holerites', 'Gerar holerites do mês', 'Folha e holerites', 'clt']
  ];
  acoes.forEach(([acao, titulo, dica, soAdmin]) => {
    if (typeof soAdmin === 'string' ? !pode(soAdmin, 'editar') : soAdmin && !admin) return;
    itens.push({ id: `acao:${acao}`, grupo: 'Ações', titulo, dica, icone: icone(ICONES.raio), executar: () => executarAcao(acao) });
  });
  const claro = temaAtual() === 'light';
  itens.push({ id: 'acao:tema', grupo: 'Ações', titulo: claro ? 'Ativar modo escuro' : 'Ativar modo claro', dica: 'Aparência', icone: icone(ICONES.raio), executar: () => aplicarTema(claro ? 'dark' : 'light') });
  itens.push({ id: 'acao:sair', grupo: 'Ações', titulo: 'Sair do sistema', dica: 'Encerrar a sessão', icone: icone(ICONES.raio), executar: logout });
  // Produtos com saldo: "Vender" já preenche o PDV.
  (relatorioProdutosState || []).filter((p) => p.ativo && Number(p.estoque) > 0).forEach((p) => {
    itens.push({ id: `produto:${p.id}`, grupo: 'Vender produto', titulo: p.nome, dica: `${formatarMoeda(p.preco)} · ${p.estoque} un. em estoque${nivelEstoque(p.estoque) === 'acabando' ? ' · acabando' : ''}`, icone: icone(ICONES.vendas), executar: () => venderProduto(p) });
  });
  return itens;
}

function filtrarPaleta(consulta) {
  const termos = normalizar(consulta).split(/\s+/).filter(Boolean);
  const todos = itensDaPaleta();
  if (!termos.length) {
    const porId = new Map(todos.map((item) => [item.id, item]));
    const recentes = lerRecentes().map((id) => porId.get(id)).filter(Boolean).map((item) => ({ ...item, grupo: 'Recentes' }));
    const usados = new Set(recentes.map((item) => item.id));
    return [...recentes, ...todos.filter((item) => item.grupo !== 'Vender produto' && !usados.has(item.id))];
  }
  const pontuados = [];
  todos.forEach((item) => {
    const alvo = normalizar(`${item.titulo} ${item.dica}`);
    if (!termos.every((termo) => alvo.includes(termo))) return;
    const titulo = normalizar(item.titulo);
    let pontos = 0;
    if (titulo.startsWith(termos[0])) pontos += 3;
    if (titulo.split(/\s+/).some((palavra) => palavra.startsWith(termos[0]))) pontos += 2;
    if (item.grupo === 'Ir para') pontos += 1;
    pontuados.push({ item, pontos });
  });
  pontuados.sort((a, b) => b.pontos - a.pontos);
  let produtos = 0;
  return pontuados.map((x) => x.item).filter((item) => item.grupo !== 'Vender produto' || ++produtos <= 6);
}

function renderizarPaleta() {
  const { itens, ativo } = paletaEstado;
  let html = '';
  let grupoAtual = '';
  itens.forEach((item, i) => {
    if (item.grupo !== grupoAtual) { grupoAtual = item.grupo; html += `<li class="paleta-grupo" role="presentation">${escapeHtml(item.grupo)}</li>`; }
    html += `<li id="paleta-op-${i}" class="paleta-item${i === ativo ? ' ativo' : ''}" role="option" aria-selected="${i === ativo}" data-i="${i}"><span class="paleta-icone">${item.icone || ''}</span><span class="paleta-texto"><strong>${escapeHtml(item.titulo)}</strong>${item.dica ? `<small>${escapeHtml(item.dica)}</small>` : ''}</span></li>`;
  });
  if (!itens.length) html = `<li class="paleta-vazio" role="presentation">Nada encontrado para “${escapeHtml(paletaInput.value)}”.</li>`;
  paletaLista.innerHTML = html;
  paletaInput.setAttribute('aria-activedescendant', itens.length ? `paleta-op-${ativo}` : '');
  paletaLista.querySelector('.ativo')?.scrollIntoView({ block: 'nearest' });
}

function atualizarPaleta() {
  paletaEstado.itens = filtrarPaleta(paletaInput.value);
  paletaEstado.ativo = 0;
  renderizarPaleta();
}

function abrirPaleta() {
  const app = document.getElementById('appScreen');
  if (!app || app.classList.contains('hidden') || paletaEstado.aberta) return;
  paletaEstado.anterior = document.activeElement;
  paletaEstado.aberta = true;
  paletaEl.classList.remove('hidden');
  paletaInput.value = '';
  atualizarPaleta();
  paletaInput.focus();
}

function fecharPaleta(devolverFoco = true) {
  if (!paletaEstado.aberta) return;
  paletaEstado.aberta = false;
  paletaEl.classList.add('hidden');
  if (devolverFoco) paletaEstado.anterior?.focus?.();
}

function executarItemDaPaleta(indice) {
  const item = paletaEstado.itens[indice];
  if (!item) return;
  registrarRecente(item.id);
  fecharPaleta(false);
  item.executar();
}

function moverPaleta(delta) {
  const total = paletaEstado.itens.length;
  if (!total) return;
  paletaEstado.ativo = (paletaEstado.ativo + delta + total) % total;
  renderizarPaleta();
}

paletaInput.addEventListener('input', atualizarPaleta);
paletaInput.addEventListener('keydown', (evento) => {
  if (evento.key === 'ArrowDown') { evento.preventDefault(); moverPaleta(1); }
  else if (evento.key === 'ArrowUp') { evento.preventDefault(); moverPaleta(-1); }
  else if (evento.key === 'Home') { evento.preventDefault(); paletaEstado.ativo = 0; renderizarPaleta(); }
  else if (evento.key === 'End') { evento.preventDefault(); paletaEstado.ativo = Math.max(0, paletaEstado.itens.length - 1); renderizarPaleta(); }
  else if (evento.key === 'Enter') { evento.preventDefault(); executarItemDaPaleta(paletaEstado.ativo); }
  else if (evento.key === 'Tab') evento.preventDefault(); // o foco fica na busca enquanto a paleta está aberta
});
paletaLista.addEventListener('click', (evento) => {
  const linha = evento.target.closest('[data-i]');
  if (linha) executarItemDaPaleta(Number(linha.dataset.i));
});
paletaLista.addEventListener('mousemove', (evento) => {
  const linha = evento.target.closest('[data-i]');
  if (!linha || Number(linha.dataset.i) === paletaEstado.ativo) return;
  paletaEstado.ativo = Number(linha.dataset.i);
  paletaLista.querySelectorAll('.paleta-item').forEach((el) => { const ativo = Number(el.dataset.i) === paletaEstado.ativo; el.classList.toggle('ativo', ativo); el.setAttribute('aria-selected', String(ativo)); });
  paletaInput.setAttribute('aria-activedescendant', `paleta-op-${paletaEstado.ativo}`);
});
paletaEl.addEventListener('click', (evento) => { if (evento.target.closest('[data-fechar-paleta]')) fecharPaleta(); });
document.getElementById('abrir-paleta').addEventListener('click', abrirPaleta);
document.addEventListener('keydown', (evento) => {
  if ((evento.ctrlKey || evento.metaKey) && !evento.shiftKey && !evento.altKey && evento.key.toLowerCase() === 'k') {
    evento.preventDefault();
    if (paletaEstado.aberta) fecharPaleta(); else abrirPaleta();
  } else if (evento.key === 'Escape') {
    if (paletaEstado.aberta) fecharPaleta(); else fecharMenuMovel();
  }
});

// ================= AVISOS DE ESTOQUE (quadro, sino e alerta na venda) =================
// "Acabando" = saldo entre 1 e o limite do parâmetro "Estoque mínimo para avisar"
// (padrão 5, o administrador altera em Parâmetros). "Esgotado" = saldo zero ou
// negativo. Tudo é calculado com os produtos já carregados; o servidor só guarda o limite.
const LIMITE_AVISO_PADRAO = 5;
let avisosFiltro = 'todos';
let avisosAssinatura = '';
let ultimaVendaAviso = null; // produto que acabou de ser vendido e ficou com pouco estoque

function limiteEstoqueAviso() {
  const parametro = (parametrosState || []).find((item) => item.chave === 'estoque_minimo_aviso');
  const numero = Number(parametro?.valor);
  return Number.isInteger(numero) && numero >= 0 ? numero : LIMITE_AVISO_PADRAO;
}

function nivelEstoque(estoque, limite = limiteEstoqueAviso()) {
  const saldo = Number(estoque);
  if (!(saldo > 0)) return 'esgotado';
  return saldo <= limite ? 'acabando' : 'ok';
}

function resumoEstoque() {
  const limite = limiteEstoqueAviso();
  const resumo = { limite, esgotados: 0, acabando: 0, emDia: 0 };
  (relatorioProdutosState || []).forEach((produto) => {
    if (!produto.ativo) return;
    const nivel = nivelEstoque(produto.estoque, limite);
    if (nivel === 'esgotado') resumo.esgotados += 1;
    else if (nivel === 'acabando') resumo.acabando += 1;
    else resumo.emDia += 1;
  });
  resumo.total = resumo.esgotados + resumo.acabando;
  return resumo;
}

// Um cartão por modelo (ex.: Camisa Ferrari) ou por produto avulso, só com as peças que precisam de reposição.
function agruparAvisos() {
  const limite = limiteEstoqueAviso();
  const modelos = new Map((modelosState || []).map((modelo) => [Number(modelo.id), modelo]));
  const grupos = new Map();
  (relatorioProdutosState || []).forEach((produto) => {
    if (!produto.ativo) return;
    const chave = produto.modelo_id ? `m${produto.modelo_id}` : `p${produto.id}`;
    const modelo = produto.modelo_id ? modelos.get(Number(produto.modelo_id)) : null;
    const grupo = grupos.get(chave) || { chave, nome: modelo ? modelo.nome : String(produto.nome).split(' - ')[0], variacoes: Boolean(produto.modelo_id), itens: [], emDia: 0 };
    const nivel = nivelEstoque(produto.estoque, limite);
    if (nivel === 'ok') grupo.emDia += 1;
    else grupo.itens.push({ id: produto.id, nome: produto.nome, rotulo: [produto.cor, produto.tamanho].filter(Boolean).join(' · ') || 'Unidade única', estoque: Number(produto.estoque), nivel });
    grupos.set(chave, grupo);
  });
  const lista = [...grupos.values()].filter((grupo) => grupo.itens.length);
  lista.forEach((grupo) => {
    grupo.itens.sort((a, b) => a.estoque - b.estoque || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
    grupo.esgotados = grupo.itens.filter((item) => item.nivel === 'esgotado').length;
    grupo.acabando = grupo.itens.length - grupo.esgotados;
    grupo.menor = grupo.itens[0].estoque;
  });
  return lista.sort((a, b) => (b.esgotados > 0) - (a.esgotados > 0) || a.menor - b.menor || a.nome.localeCompare(b.nome, 'pt-BR'));
}

// Sino da barra superior e selo do menu: aparecem em qualquer tela.
function atualizarIndicadoresAvisos(resumo) {
  const contagem = document.getElementById('avisos-contagem');
  const sino = document.getElementById('abrir-avisos');
  const selo = document.getElementById('menu-avisos-badge');
  const texto = resumo.total > 99 ? '99+' : String(resumo.total);
  const rotulo = resumo.total
    ? `Quadro de avisos: ${plural(resumo.esgotados, 'esgotado', 'esgotados')} e ${plural(resumo.acabando, 'acabando', 'acabando')}`
    : 'Quadro de avisos: sem avisos';
  [contagem, selo].forEach((el) => {
    if (!el) return;
    if (el.hidden !== !resumo.total) el.hidden = !resumo.total;
    if (el.textContent !== (resumo.total ? texto : '')) el.textContent = resumo.total ? texto : '';
    el.classList.toggle('urgente', resumo.esgotados > 0);
  });
  if (sino) {
    if (sino.getAttribute('aria-label') !== rotulo) sino.setAttribute('aria-label', rotulo);
    if (sino.title !== rotulo) sino.title = rotulo;
  }
}

function htmlResumoAvisos(resumo) {
  const tile = (filtro, classe, numero, titulo, sub) => {
    const corpo = `<span class="aviso-tile-num">${numero}</span><span class="aviso-tile-txt"><strong>${titulo}</strong><small>${sub}</small></span>`;
    if (!filtro) return `<div class="aviso-tile ${classe}">${corpo}</div>`;
    const ativo = avisosFiltro === filtro;
    return `<button type="button" class="aviso-tile ${classe}${ativo ? ' ativo' : ''}" data-filtro="${filtro}" aria-pressed="${ativo}" title="${ativo ? 'Clique para mostrar todos' : 'Clique para mostrar só estes'}">${corpo}</button>`;
  };
  return tile('esgotado', 'tile-esgotado', resumo.esgotados, 'Esgotados', 'sem nenhuma unidade')
    + tile('acabando', 'tile-acabando', resumo.acabando, 'Acabando', resumo.limite > 0 ? `com até ${plural(resumo.limite, 'unidade', 'unidades')}` : 'aviso desativado (limite 0)')
    + tile('', 'tile-emdia', resumo.emDia, 'Em dia', 'estoque confortável');
}

function htmlLimiteAvisos(resumo, admin) {
  const texto = resumo.limite > 0
    ? `Avisamos quando o estoque chega a <strong>${plural(resumo.limite, 'unidade', 'unidades')}</strong> ou menos.`
    : 'Avisando somente os produtos <strong>esgotados</strong>.';
  return `${texto}${admin ? ' <button type="button" class="link-botao-inline" data-ir="tab-parametros" data-param="estoque">Alterar limite</button>' : ''}`;
}

function htmlCartaoAviso(grupo, admin, limite) {
  const selos = [
    grupo.esgotados ? `<span class="selo selo-esgotado">${grupo.esgotados} ${grupo.esgotados === 1 ? 'esgotado' : 'esgotados'}</span>` : '',
    grupo.acabando ? `<span class="selo selo-acabando">${grupo.acabando} acabando</span>` : ''
  ].join('');
  const total = grupo.itens.length + grupo.emDia;
  const sub = grupo.variacoes ? `${grupo.itens.length} de ${plural(total, 'variação', 'variações')} precisam de reposição` : 'Produto avulso';
  const itens = grupo.itens.map((item) => {
    const preenchido = item.nivel === 'esgotado' || limite <= 0 ? 0 : Math.max(6, Math.min(100, item.estoque / limite * 100));
    const controle = admin
      ? `<div class="aviso-repor"><input type="number" min="1" step="1" inputmode="numeric" placeholder="Qtd" data-campo="repor-${item.id}" aria-label="Quantidade a repor de ${escapeHtml(item.nome)}"><button type="button" class="btn btn-secondary btn-sm" data-repor-rapido="${item.id}" aria-label="Repor ${escapeHtml(item.nome)}">Repor</button></div>`
      : '';
    return `<li class="aviso-item nivel-${item.nivel}"><div class="aviso-item-info"><strong>${escapeHtml(item.rotulo)}</strong><div class="aviso-barra" aria-hidden="true"><span style="width:${preenchido.toFixed(0)}%"></span></div></div><span class="aviso-saldo">${item.estoque} un.</span>${controle}</li>`;
  }).join('');
  const rodape = grupo.emDia ? `<p class="aviso-rodape">+ ${plural(grupo.emDia, 'variação', 'variações')} com estoque em dia</p>` : '';
  return `<article class="aviso-card${grupo.esgotados ? ' tem-esgotado' : ''}"><header class="aviso-topo"><div><h3 class="aviso-nome">${escapeHtml(grupo.nome)}</h3><p class="aviso-sub">${sub}</p></div><div class="aviso-selos">${selos}</div></header><ul class="aviso-itens">${itens}</ul>${rodape}</article>`;
}

// A tela é atualizada a cada 3s: só redesenha quando algo mudou e devolve o que a
// pessoa estava digitando (quantidade a repor) e o foco.
function renderizarAvisos() {
  const raiz = document.getElementById('tab-avisos');
  const quadro = document.getElementById('avisos-quadro');
  if (!raiz || !quadro) return;
  const resumo = resumoEstoque();
  const admin = pode('estoque', 'editar');
  const filtrados = agruparAvisos()
    .map((grupo) => ({ ...grupo, itens: grupo.itens.filter((item) => avisosFiltro === 'todos' || item.nivel === avisosFiltro) }))
    .filter((grupo) => grupo.itens.length);
  const assinatura = JSON.stringify([resumo, avisosFiltro, admin, filtrados]);
  if (assinatura === avisosAssinatura) return;
  avisosAssinatura = assinatura;

  const digitado = new Map([...raiz.querySelectorAll('[data-campo]')].filter((el) => el.value !== '').map((el) => [el.dataset.campo, el.value]));
  const ativo = document.activeElement && raiz.contains(document.activeElement) ? document.activeElement : null;
  const foco = ativo ? { campo: ativo.dataset.campo, filtro: ativo.dataset.filtro, repor: ativo.dataset.reporRapido, inicio: ativo.selectionStart, fim: ativo.selectionEnd } : null;

  document.getElementById('avisos-resumo').innerHTML = htmlResumoAvisos(resumo);
  document.getElementById('avisos-limite').innerHTML = htmlLimiteAvisos(resumo, admin);
  if (filtrados.length) {
    quadro.innerHTML = filtrados.map((grupo) => htmlCartaoAviso(grupo, admin, resumo.limite)).join('')
      + (admin ? '' : '<p class="aviso-nota">Somente o administrador registra entradas de estoque. Avise quem cuida da reposição.</p>');
  } else if (resumo.total && avisosFiltro !== 'todos') {
    quadro.innerHTML = `<div class="vazio">${icone(ICONES.ok)}<p>Nenhum item neste filtro.</p><small>Clique no quadro selecionado para voltar a ver todos.</small></div>`;
  } else {
    quadro.innerHTML = `<div class="vazio vazio-ok">${icone(ICONES.ok)}<p>Tudo certo por aqui</p><small>${resumo.limite > 0 ? `Quando um produto chegar a ${plural(resumo.limite, 'unidade', 'unidades')} ou menos, ele aparece neste quadro.` : 'Produtos esgotados aparecem neste quadro.'}</small></div>`;
  }

  raiz.querySelectorAll('[data-campo]').forEach((el) => { if (digitado.has(el.dataset.campo)) el.value = digitado.get(el.dataset.campo); });
  if (foco) {
    const alvo = foco.campo ? raiz.querySelector(`[data-campo="${foco.campo}"]`)
      : foco.filtro ? raiz.querySelector(`[data-filtro="${foco.filtro}"]`)
        : foco.repor ? raiz.querySelector(`[data-repor-rapido="${foco.repor}"]`) : null;
    if (alvo) {
      alvo.focus();
      try { if (foco.inicio !== null && foco.inicio !== undefined) alvo.setSelectionRange(foco.inicio, foco.fim); } catch (_) { /* campos numéricos e botões não têm cursor */ }
    }
  }
}

async function reporRapido(id, botao) {
  const entrada = document.querySelector(`[data-campo="repor-${id}"]`);
  const quantidade = Number(entrada?.value);
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    showToast('Informe quantas unidades chegaram (número inteiro maior que zero).', 'error');
    entrada?.focus();
    return;
  }
  botao.disabled = true;
  try {
    const resposta = await fetch(`${API_URL}/produtos/${id}/estoque`, { method: 'PUT', headers: getHeadersComUsuario(), body: JSON.stringify({ tipo: 'Entrada', quantidade }) });
    const resultado = await resposta.json();
    if (!resposta.ok) { showToast(resultado.error || 'Não foi possível registrar a entrada.', 'error'); return; }
    const produto = (relatorioProdutosState || []).find((item) => Number(item.id) === Number(id));
    showToast(`Entrada de ${plural(quantidade, 'unidade', 'unidades')} registrada${produto ? ` em ${produto.nome}` : ''}.`);
    if (entrada) entrada.value = '';
    triggerSync();
    await carregarTudo();
  } catch (_) {
    showToast('Erro ao conectar com o servidor.', 'error');
  } finally {
    botao.disabled = false;
  }
}

document.getElementById('tab-avisos').addEventListener('click', (evento) => {
  const filtro = evento.target.closest('[data-filtro]');
  if (filtro) { avisosFiltro = avisosFiltro === filtro.dataset.filtro ? 'todos' : filtro.dataset.filtro; renderizarAvisos(); return; }
  const repor = evento.target.closest('[data-repor-rapido]');
  if (repor) reporRapido(repor.dataset.reporRapido, repor);
});
document.getElementById('tab-avisos').addEventListener('keydown', (evento) => {
  if (evento.key !== 'Enter' || !evento.target.matches('[data-campo^="repor-"]')) return;
  evento.preventDefault();
  evento.target.parentElement.querySelector('[data-repor-rapido]')?.click();
});
document.getElementById('abrir-avisos').addEventListener('click', () => irParaAba('tab-avisos'));

// ---- Alerta na venda: antes de concluir e logo depois ----
function atualizarAvisoEstoqueVenda() {
  const caixa = document.getElementById('venda-aviso-estoque');
  if (!caixa) return;
  const digitado = Number(document.getElementById('venda-produto-id').value) || 0;
  const noCarrinho = !digitado && ultimoItemCarrinho && itensVenda.some((i) => i.produto_id === ultimoItemCarrinho.id) ? ultimoItemCarrinho.id : 0;
  const selecionado = digitado || noCarrinho;
  const alvoId = selecionado || ultimaVendaAviso?.id || 0;
  const produto = alvoId ? (relatorioProdutosState || []).find((item) => Number(item.id) === alvoId) : null;
  let aviso = null;
  if (produto) {
    const saldo = Number(produto.estoque);
    const permiteNegativo = (parametrosState || []).find((item) => item.chave === 'permitir_estoque_negativo')?.valor === 'true';
    if (selecionado) {
      const quantidade = digitado ? Math.max(1, Math.floor(Number(document.getElementById('venda-qtde').value) || 1)) : quantidadeNoCarrinho(noCarrinho);
      const restante = saldo - quantidade;
      if (saldo <= 0) aviso = { sev: 'perigo', titulo: 'Produto esgotado', texto: permiteNegativo ? 'Não há unidades em estoque. A venda deixará o saldo negativo.' : 'Não há unidades em estoque. Reponha antes de vender.' };
      else if (quantidade > saldo) aviso = { sev: 'perigo', titulo: 'Estoque insuficiente', texto: `Restam ${plural(saldo, 'unidade', 'unidades')} e a venda pede ${quantidade}.${permiteNegativo ? ' O saldo ficará negativo.' : ''}` };
      else if (restante === 0) aviso = { sev: 'aviso', titulo: 'Esta venda zera o estoque', texto: `${produto.nome} ficará sem nenhuma unidade. Avise o administrador para repor.` };
      else if (restante <= limiteEstoqueAviso()) aviso = { sev: 'aviso', titulo: 'Estoque acabando', texto: `Restam ${plural(saldo, 'unidade', 'unidades')}; depois desta venda ficarão ${plural(restante, 'unidade', 'unidades')}. Avise o administrador para repor.` };
    } else {
      const nivel = nivelEstoque(saldo);
      if (nivel === 'ok') ultimaVendaAviso = null;
      else aviso = nivel === 'esgotado'
        ? { sev: 'perigo', titulo: `${produto.nome} esgotou`, texto: 'Não há mais unidades. Avise o administrador para repor.' }
        : { sev: 'aviso', titulo: `${produto.nome} está acabando`, texto: `Restam ${plural(saldo, 'unidade', 'unidades')}. Avise o administrador para repor.` };
    }
  }
  if (!aviso) {
    if (!caixa.hidden) { caixa.hidden = true; caixa.innerHTML = ''; caixa._html = ''; }
    return;
  }
  const html = `<span class="aviso-estoque-icone">${icone(ICONES.alerta)}</span><div class="aviso-estoque-texto"><strong>${escapeHtml(aviso.titulo)}</strong><span>${escapeHtml(aviso.texto)}</span></div><button type="button" class="link-botao-inline" data-ir="tab-avisos">Ver quadro de avisos</button>`;
  const classe = `aviso-estoque sev-${aviso.sev}`;
  if (caixa.className !== classe) caixa.className = classe;
  if (caixa._html !== html) { caixa._html = html; caixa.innerHTML = html; }
  if (caixa.hidden) caixa.hidden = false;
}

// Depois de registrar a venda: lembra na hora, com aviso na tela e no formulário.
function avisarEstoquePosVenda(produtoId) {
  const produto = (relatorioProdutosState || []).find((item) => Number(item.id) === Number(produtoId));
  if (!produto) return;
  const nivel = nivelEstoque(produto.estoque);
  if (nivel === 'ok') { ultimaVendaAviso = null; atualizarAvisoEstoqueVenda(); return; }
  ultimaVendaAviso = { id: produto.id };
  showToast(nivel === 'esgotado' ? `${produto.nome} esgotou. Reponha o estoque.` : `Atenção: ${produto.nome} está acabando (restam ${produto.estoque} un.).`, 'warning');
  atualizarAvisoEstoqueVenda();
}

document.getElementById('venda-produto-busca').addEventListener('input', () => {
  if (document.getElementById('venda-produto-id').value) ultimaVendaAviso = null;
  atualizarAvisoEstoqueVenda();
});
document.getElementById('venda-qtde').addEventListener('input', atualizarAvisoEstoqueVenda);

// Chamado ao fim de cada atualização de dados.
function atualizarAvisosEstoque() {
  atualizarIndicadoresAvisos(resumoEstoque());
  const opcaoBaixo = document.querySelector('option[value="baixo"]'); // filtro dos relatórios
  const rotuloBaixo = `Estoque baixo (até ${plural(limiteEstoqueAviso(), 'unidade', 'unidades')})`;
  if (opcaoBaixo && opcaoBaixo.textContent !== rotuloBaixo) opcaoBaixo.textContent = rotuloBaixo;
  renderizarAvisos();
  atualizarAvisoEstoqueVenda();
  if (dashDados) renderizarDashboard(); // radar e reposição dependem do limite
}

// ================= DASHBOARD (central de comando) =================
// Responde três perguntas: o que aconteceu, o que precisa de atenção e o que vem
// por aí. Reaproveita os dados que o sistema já carrega; o servidor não muda.
let dashDados = null;        // indicadores do mês, do mês anterior e dos últimos meses
let dashFinanceiro = null;   // último resumo financeiro (preenchido em carregarIndicadoresFinanceiros)
const dashHtml = new Map();  // o painel é atualizado a cada 3s: só mexe no DOM quando algo mudou
const moedaCompacta = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });

function estadoDaVenda(venda) {
  return venda.status_pagamento === 'confirmado' ? 'aprovado' : venda.status_pagamento === 'divergencia' ? 'resultado_desconhecido' : venda.status_pagamento;
}
const vendaConta = (venda) => !['cancelado', 'recusado'].includes(estadoDaVenda(venda));
const mesDaVenda = (venda) => String(venda.data_venda || venda.data || '').slice(0, 7);
const plural = (n, singular, pluralTexto) => `${n} ${Number(n) === 1 ? singular : pluralTexto}`;

function definirHtml(id, html) {
  const el = document.getElementById(id);
  if (!el || dashHtml.get(id) === html) return;
  dashHtml.set(id, html);
  el.innerHTML = html;
}
function definirTexto(id, texto) {
  const el = document.getElementById(id);
  if (el && el.textContent !== texto) el.textContent = texto;
}

// Números do placar sobem até o valor novo; com "reduzir movimento" aparecem direto.
function animarNumero(id, destino, formatar) {
  const el = document.getElementById(id);
  if (!el) return;
  const anterior = el._valor;
  if (anterior === destino) return;
  el._valor = destino;
  if (el.classList.contains('skel')) el.classList.remove('skel');
  cancelAnimationFrame(el._anim);
  const inicio = typeof anterior === 'number' ? anterior : 0;
  if (prefereMenosMovimento() || inicio === destino) { el.textContent = formatar(destino); return; }
  const t0 = performance.now();
  const passo = (agora) => {
    const k = Math.min(1, (agora - t0) / 700);
    el.textContent = formatar(inicio + (destino - inicio) * (1 - Math.pow(1 - k, 3)));
    if (k < 1) el._anim = requestAnimationFrame(passo); else el.textContent = formatar(destino);
  };
  el._anim = requestAnimationFrame(passo);
}
const inteiro = (n) => String(Math.round(n));

async function carregarDashboard() {
  if (!document.getElementById('dash-grid')) return;
  if (!mesDashboardAtual) mesDashboardAtual = mesAtualISO();
  const mes = mesDashboardAtual;
  const consultar = (caminho) => fetch(`${API_URL}${caminho}`).then((resposta) => (resposta.ok ? resposta.json() : null)).catch(() => null);
  const [atual, anterior, mensais] = await Promise.all([
    consultar(`/indicadores/vendas?mes=${encodeURIComponent(mes)}`),
    consultar(`/indicadores/vendas?mes=${encodeURIComponent(deslocarMes(mes, -1))}`),
    consultar('/indicadores/vendas-mensais?meses=6')
  ]);
  if (!atual || mes !== mesDashboardAtual) return; // trocou de mês no meio da consulta
  dashDados = { mes: atual, anterior, mensais };
  renderizarDashboard();
}

function agruparVendasDoMes(mes) {
  const produtos = new Map((relatorioProdutosState || []).map((p) => [Number(p.id), p]));
  const modelos = new Map((modelosState || []).map((m) => [Number(m.id), m]));
  const grupos = new Map();
  (relatorioVendasState || []).forEach((venda) => {
    if (!vendaConta(venda) || mesDaVenda(venda) !== mes) return;
    // Cada produto da venda conta no seu grupo; o total da venda (já com desconto) é
    // dividido na proporção do valor de cada item. O brinde não entra.
    const vendidos = (venda.itens || []).filter((item) => item.tipo === 'VENDA');
    const linhas = vendidos.length ? vendidos : [{ produto_id: venda.produto_id, produto_nome: venda.produto_nome, quantidade: venda.quantidade, preco_unitario: 1 }];
    const valorBruto = linhas.reduce((soma, linha) => soma + Number(linha.quantidade || 0) * Number(linha.preco_unitario || 0), 0);
    linhas.forEach((linha) => {
      const produto = produtos.get(Number(linha.produto_id));
      const modelo = produto && produto.modelo_id ? modelos.get(Number(produto.modelo_id)) : null;
      const chave = modelo ? `m${modelo.id}` : `p${linha.produto_id}`;
      const grupo = grupos.get(chave) || { nome: modelo ? modelo.nome : (linha.produto_nome || venda.produto_nome || 'Produto'), unidades: 0, total: 0 };
      const parte = valorBruto > 0 ? (Number(linha.quantidade || 0) * Number(linha.preco_unitario || 0)) / valorBruto : 1 / linhas.length;
      grupo.unidades += Number(linha.quantidade || 0);
      grupo.total += Number(venda.total || 0) * parte;
      grupos.set(chave, grupo);
    });
  });
  return [...grupos.values()].sort((a, b) => b.unidades - a.unidades || b.total - a.total);
}

function diasAte(dataISO) {
  const [a, m, d] = String(dataISO).split('-').map(Number);
  const hoje = new Date();
  return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / 86400000);
}
function textoPrazo(dias) { return dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `Em ${dias} dias`; }

function itensDoRadar() {
  const itens = [];
  const admin = pode('estoque', 'editar');
  const financeiro = pode('contas') || pode('recebimentos');
  const produtos = (relatorioProdutosState || []).filter((p) => p.ativo);
  const limite = limiteEstoqueAviso();
  const semEstoque = produtos.filter((p) => nivelEstoque(p.estoque, limite) === 'esgotado').length;
  const baixo = produtos.filter((p) => nivelEstoque(p.estoque, limite) === 'acabando').length;
  const aguardando = (relatorioVendasState || []).filter((v) => !['aprovado', 'cancelado', 'recusado'].includes(estadoDaVenda(v))).length;
  if (semEstoque) itens.push({ sev: 'perigo', icone: ICONES.caixa, titulo: plural(semEstoque, 'produto sem estoque', 'produtos sem estoque'), sub: 'Reponha para continuar vendendo', ir: 'tab-avisos' });
  if (baixo) itens.push({ sev: 'aviso', icone: ICONES.caixa, titulo: plural(baixo, 'produto com estoque baixo', 'produtos com estoque baixo'), sub: `Restam ${plural(limite, 'unidade', 'unidades')} ou menos`, ir: 'tab-avisos' });
  if (aguardando) itens.push({ sev: 'aviso', icone: ICONES.relogio, titulo: plural(aguardando, 'venda aguardando confirmação', 'vendas aguardando confirmação'), sub: 'Confira os pagamentos no Caixa', ir: 'tab-caixa' });
  if (financeiro && dashFinanceiro) {
    const pagar = Number(dashFinanceiro.contas_a_pagar?.vencido || 0);
    const receber = Number(dashFinanceiro.contas_a_receber?.vencido || 0);
    if (pagar > 0) itens.push({ sev: 'perigo', icone: ICONES.alerta, titulo: `${formatarMoeda(pagar)} vencidos a pagar`, sub: 'Contas com prazo vencido', ir: 'tab-contas' });
    if (receber > 0) itens.push({ sev: 'aviso', icone: ICONES.alerta, titulo: `${formatarMoeda(receber)} vencidos a receber`, sub: 'Cobranças em atraso', ir: 'tab-recebimentos' });
  }
  const proximo = (eventosState || []).map((e) => ({ e, dias: diasAte(e.data) })).filter((x) => x.dias >= 0 && x.dias <= 7).sort((a, b) => a.dias - b.dias)[0];
  if (proximo) itens.push({ sev: 'info', icone: ICONES.calendario, titulo: `${textoPrazo(proximo.dias)}: ${proximo.e.titulo}`, sub: [textoHorario(proximo.e), proximo.e.local].filter(Boolean).join(' · '), ir: 'tab-eventos' });
  const ordem = { perigo: 0, aviso: 1, info: 2 };
  return itens.sort((a, b) => ordem[a.sev] - ordem[b.sev]).slice(0, 6);
}

function htmlRadar() {
  const itens = itensDoRadar();
  if (!itens.length) return `<li class="radar-vazio">${icone(ICONES.ok)}<div><strong>Tudo em dia</strong><small>Nenhuma pendência no radar agora.</small></div></li>`;
  return itens.map((item) => {
    const corpo = `<span class="radar-icone">${icone(item.icone)}</span><span class="radar-texto"><strong>${escapeHtml(item.titulo)}</strong><small>${escapeHtml(item.sub)}</small></span>`;
    return podeAbrirAba(item.ir)
      ? `<li><button type="button" class="radar-item sev-${item.sev}" data-ir="${item.ir}">${corpo}<span class="radar-seta">${icone(ICONES.seta)}</span></button></li>`
      : `<li><div class="radar-item sev-${item.sev}">${corpo}</div></li>`;
  }).join('');
}

function htmlPodio(grupos) {
  if (!grupos.length) return `<div class="vazio">${icone(ICONES.vendas)}<p>Sem vendas neste mês.</p><small>Os mais vendidos aparecem aqui assim que a primeira venda for registrada.</small></div>`;
  const top = grupos.slice(0, 3).map((g, i) => ({ ...g, pos: i + 1 }));
  const visual = [top[1], top[0], top[2]].filter(Boolean);
  const degrau = (g) => `<div class="podio-item podio-${g.pos}"><strong class="podio-nome" title="${escapeHtml(g.nome)}">${escapeHtml(g.nome)}</strong><span class="podio-dado">${plural(g.unidades, 'un.', 'un.')} · ${moedaCompacta.format(g.total)}</span><span class="podio-degrau"><span class="podio-num">${g.pos}</span></span></div>`;
  const resto = grupos.slice(3, 6).map((g, i) => `<li><span class="resto-pos">${i + 4}</span><span class="resto-nome">${escapeHtml(g.nome)}</span><span class="resto-un">${g.unidades} un.</span></li>`).join('');
  return `<div class="podio">${visual.map(degrau).join('')}</div>${resto ? `<ol class="podio-resto">${resto}</ol>` : ''}`;
}

function htmlPagamentos(mes) {
  const porForma = new Map();
  (relatorioVendasState || []).forEach((v) => {
    if (!vendaConta(v) || mesDaVenda(v) !== mes) return;
    for (const p of v.pagamentos || [{ forma: v.forma_pagamento || 'Dinheiro', valor: v.total }]) porForma.set(p.forma, (porForma.get(p.forma) || 0) + Number(p.valor || 0));
  });
  const linhas = [...porForma.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const soma = linhas.reduce((t, [, valor]) => t + valor, 0);
  if (!linhas.length) return `<div class="vazio"><p>Sem recebimentos neste mês.</p></div>`;
  return `<ul class="pagamentos">${linhas.map(([forma, valor]) => {
    const pct = soma > 0 ? valor / soma * 100 : 0;
    return `<li><div class="pag-topo"><span>${escapeHtml(forma)}</span><strong>${Math.round(pct)}%</strong></div><div class="pag-barra" role="img" aria-label="${escapeHtml(forma)}: ${Math.round(pct)}% do total"><span style="width:${pct.toFixed(1)}%"></span></div><small>${formatarMoeda(valor)}</small></li>`;
  }).join('')}</ul>`;
}

function htmlUltimasVendas() {
  const vendas = [...(relatorioVendasState || [])].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 6);
  if (!vendas.length) return `<li class="vazio">${icone(ICONES.vendas)}<p>Nenhuma venda registrada ainda.</p><small>Use "Nova venda" para começar.</small></li>`;
  return vendas.map((v) => {
    const estado = estadoDaVenda(v);
    const cancelada = ['cancelado', 'recusado'].includes(estado);
    const classe = cancelada ? 'badge-cancelado' : estado === 'aprovado' ? 'badge-pago' : 'badge-pendente';
    const data = String(v.data_venda || v.data || '').split('-').reverse().slice(0, 2).join('/');
    return `<li class="venda-linha"><div class="venda-info"><strong>${escapeHtml(v.produto_nome || v.nome || 'Produto')}</strong><small>${data} · ${escapeHtml(v.forma_pagamento || 'Dinheiro')} · ${plural(v.quantidade, 'un.', 'un.')}</small></div><div class="venda-valor"><strong class="${cancelada ? 'riscado' : ''}">${formatarMoeda(v.total)}</strong><span class="badge ${classe}">${escapeHtml(estadoPagamentoLabel(estado))}</span></div></li>`;
  }).join('');
}

function htmlReposicao() {
  const admin = pode('estoque', 'editar');
  const limite = limiteEstoqueAviso();
  const criticos = (relatorioProdutosState || []).filter((p) => p.ativo && nivelEstoque(p.estoque, limite) !== 'ok').sort((a, b) => Number(a.estoque) - Number(b.estoque) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  if (!criticos.length) return `<li class="vazio">${icone(ICONES.ok)}<p>Estoque saudável.</p><small>${limite > 0 ? `Nenhum produto ativo com ${plural(limite, 'unidade', 'unidades')} ou menos.` : 'Nenhum produto ativo esgotado.'}</small></li>`;
  const linhas = criticos.slice(0, 6).map((p) => {
    const saldo = Math.max(0, Number(p.estoque));
    return `<li class="rep-linha"><div class="rep-info"><strong>${escapeHtml(p.nome)}</strong><div class="rep-barra" role="img" aria-label="${saldo} de ${limite} unidades"><span class="${saldo === 0 ? 'zero' : ''}" style="width:${saldo === 0 || limite <= 0 ? 0 : Math.max(8, Math.min(100, saldo / limite * 100))}%"></span></div></div><span class="rep-saldo ${saldo === 0 ? 'zero' : ''}">${saldo} un.</span>${admin ? `<button type="button" class="btn btn-secondary btn-sm" data-repor="${p.id}" aria-label="Repor ${escapeHtml(p.nome)}">Repor</button>` : ''}</li>`;
  }).join('');
  const mais = criticos.length > 6 ? `<li class="rep-mais">+ ${criticos.length - 6} ${criticos.length - 6 === 1 ? 'produto' : 'produtos'} no limite</li>` : '';
  return linhas + mais;
}

function htmlAgenda() {
  const proximos = (eventosState || []).map((e) => ({ e, dias: Math.max(0, diasAte(e.data)) })).filter((x) => fimEvento(x.e) >= hojeNaLoja()).sort((a, b) => a.e.data.localeCompare(b.e.data)).slice(0, 4);
  if (!proximos.length) return `<li class="vazio">${icone(ICONES.calendario)}<p>Nenhum evento à frente.</p><small>Marque encontros, feiras e promoções na aba Eventos.</small></li>`;
  return proximos.map(({ e, dias }) => {
    const [, mm, dd] = String(e.data).split('-');
    return `<li><button type="button" class="agenda-item" data-ir="tab-eventos"><span class="agenda-data"><strong>${dd}</strong><small>${NOMES_MESES[Number(mm) - 1].slice(0, 3)}</small></span><span class="agenda-texto"><strong>${escapeHtml(e.titulo)}</strong><small>${escapeHtml([textoPrazo(dias), textoHorario(e), e.local].filter(Boolean).join(' · '))}</small></span></button></li>`;
  }).join('');
}

function renderizarDashboard() {
  if (!dashDados || !document.getElementById('dash-grid')) return;
  const { mes: d, anterior, mensais } = dashDados;
  const mes = d.mes;
  const hoje = new Date();
  const nome = String(getUsuarioAtual()?.nome || '').trim().split(/\s+/)[0];
  const hora = hoje.getHours();
  definirTexto('dash-saudacao', hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite');
  definirTexto('dash-nome', nome ? `, ${nome}` : '');
  definirTexto('dash-data-hoje', hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));

  // Seletor de mês
  definirTexto('mes-selecionado-texto', rotuloMes(mes));
  definirTexto('mes-selecionado-detalhe', `${dataBR(d.inicio)} a ${dataBR(d.fim)}${mes === mesAtualISO() ? ' · mês atual' : ''}`);
  const proximoMes = document.getElementById('mes-seguinte');
  if (proximoMes.disabled !== (mes >= mesAtualISO())) proximoMes.disabled = mes >= mesAtualISO();
  definirTexto('dash-mes-chip', mes === mesAtualISO() ? 'Em andamento' : 'Mês fechado');

  // Placar e variação sobre o mês anterior
  animarNumero('dash-mes-total', Number(d.total || 0), formatarMoeda);
  const delta = document.getElementById('dash-mes-delta');
  const totalAnterior = Number(anterior?.total || 0);
  let textoDelta = '';
  let classeDelta = 'delta';
  if (anterior && totalAnterior > 0) {
    const pct = (Number(d.total) - totalAnterior) / totalAnterior * 100;
    textoDelta = `${pct > 0 ? '▲' : pct < 0 ? '▼' : '='} ${Math.abs(pct).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
    classeDelta += pct > 0 ? ' delta-sobe' : pct < 0 ? ' delta-desce' : '';
  } else if (anterior && Number(d.total) > 0) {
    textoDelta = 'Mês sem vendas antes';
    classeDelta += ' delta-sobe';
  }
  const dicaDelta = textoDelta && anterior ? `Comparado a ${rotuloMes(deslocarMes(mes, -1))}: ${formatarMoeda(totalAnterior)}` : '';
  if (delta.hidden !== !textoDelta) delta.hidden = !textoDelta;
  if (delta.className !== classeDelta) delta.className = classeDelta;
  if (delta.textContent !== textoDelta) delta.textContent = textoDelta;
  if (delta.title !== dicaDelta) delta.title = dicaDelta;
  definirTexto('dash-mes-legenda', `${plural(d.vendas, 'venda', 'vendas')} · ${plural(d.unidades, 'unidade', 'unidades')} · sem canceladas e recusadas`);

  // Barras dos últimos meses (clicar em uma abre o mês)
  const meses = mensais?.meses || [];
  const maior = Math.max(0, ...meses.map((m) => m.total));
  definirHtml('dash-barras', meses.map((m) => {
    const altura = maior > 0 ? Math.max(4, Math.round(m.total / maior * 100)) : 4;
    const ativo = m.mes === mes;
    return `<button type="button" class="barra${ativo ? ' ativa' : ''}" data-mes="${m.mes}" aria-pressed="${ativo}" aria-label="${rotuloMes(m.mes)}: ${formatarMoeda(m.total)}" title="${rotuloMes(m.mes)}: ${formatarMoeda(m.total)}"><span class="barra-valor">${moedaCompacta.format(m.total)}</span><span class="barra-trilho"><span class="barra-fill" style="--h:${altura}%"></span></span><span class="barra-rotulo">${NOMES_MESES[Number(m.mes.slice(5, 7)) - 1].slice(0, 3)}</span></button>`;
  }).join(''));

  // KPIs
  animarNumero('dash-mes-vendas', Number(d.vendas || 0), inteiro);
  definirTexto('dash-mes-unidades', plural(d.unidades, 'unidade', 'unidades'));
  animarNumero('dash-mes-ticket', Number(d.vendas) > 0 ? Number(d.total) / Number(d.vendas) : 0, formatarMoeda);
  animarNumero('dash-mes-brindes', Number(d.brindes || 0), inteiro);
  animarNumero('dash-mes-canceladas', Number(d.canceladas || 0), inteiro);
  const brindesValor = Number(d.brindes_valor || 0);
  definirTexto('dash-mes-brindes-valor', Number(d.brindes) ? `${formatarMoeda(brindesValor)} em peças${Number(d.brindes_avulsos) ? ` · ${d.brindes_avulsos} ${Number(d.brindes_avulsos) === 1 ? 'avulso' : 'avulsos'}` : ''}` : 'Nenhum brinde no mês');
  document.getElementById('dash-kpi-brindes').title = Number(d.brindes) ? `${plural(d.brindes_em_vendas || 0, 'brinde', 'brindes')} junto com vendas e ${plural(d.brindes_avulsos || 0, 'avulso', 'avulsos')} no Movimentar. Valor pelo preço de venda das peças.` : 'Ver os brindes no Movimentar';

  // Painéis calculados com o que já está carregado
  definirHtml('dash-radar', htmlRadar());
  definirHtml('dash-podio', htmlPodio(agruparVendasDoMes(mes)));
  definirHtml('dash-pagamentos', htmlPagamentos(mes));
  definirHtml('dash-ultimas', htmlUltimasVendas());
  renderizarVendasDoDia();
  definirHtml('dash-reposicao', htmlReposicao());
  definirTexto('dash-rep-chip', limiteEstoqueAviso() > 0 ? `Até ${limiteEstoqueAviso()} un.` : 'Só esgotados');
  definirHtml('dash-agenda', htmlAgenda());

  document.querySelectorAll('.fin-valor').forEach((el) => el.classList.toggle('zero', /^R\$\s?0,00$/.test(el.textContent.trim())));
  const financeiro = pode('contas') || pode('recebimentos');
  const painelFinanceiro = document.querySelector('.painel-financeiro');
  if (painelFinanceiro && painelFinanceiro.hidden !== !financeiro) painelFinanceiro.hidden = !financeiro; // contas a pagar e a receber: quem tem acesso ao Financeiro
  document.querySelectorAll('[data-acao="entrada-estoque"], [data-acao="novo-modelo"]').forEach((botao) => { botao.hidden = !pode('estoque', 'editar'); });
  document.querySelectorAll('[data-acao="novo-evento"]').forEach((botao) => { botao.hidden = !pode('eventos', 'editar'); });
  document.querySelectorAll('[data-acao="relatorios"]').forEach((botao) => { botao.hidden = !pode('relatorios'); });
  document.getElementById('tab-dashboard').removeAttribute('data-carregando');
}

document.getElementById('dash-barras').addEventListener('click', (evento) => {
  const barra = evento.target.closest('[data-mes]');
  if (!barra) return;
  mesDashboardAtual = barra.dataset.mes;
  carregarDashboard();
});

async function carregarIndicadoresFinanceiros() {
  if (!document.getElementById('fin-receber-pendente') || !(pode('contas') || pode('recebimentos'))) return;
  const params = new URLSearchParams();
  const de = document.getElementById('indicador-periodo-inicio').value;
  const ate = document.getElementById('indicador-periodo-fim').value;
  if (de && ate) { params.set('de', de); params.set('ate', ate); }
  const resposta = await fetch(`${API_URL}/indicadores/financeiro?${params}`);
  if (!resposta.ok) return;
  const dados = await resposta.json();
  dashFinanceiro = dados;
  const receber = dados.contas_a_receber;
  const pagar = dados.contas_a_pagar;
  definirTexto('fin-receber-pendente', formatarMoeda(receber.pendente));
  definirTexto('fin-receber-pendente-qtd', `${receber.quantidade} título(s) pendente(s)`);
  definirTexto('fin-receber-vencido', formatarMoeda(receber.vencido));
  definirTexto('fin-receber-proximo', formatarMoeda(receber.proximo));
  definirTexto('fin-pagar-pendente', formatarMoeda(pagar.pendente));
  definirTexto('fin-pagar-pendente-qtd', `${pagar.quantidade} título(s) pendente(s)`);
  definirTexto('fin-pagar-vencido', formatarMoeda(pagar.vencido));
  definirTexto('fin-pagar-proximo', formatarMoeda(pagar.proximo));
  const prazo = `até ${dataBR(dados.referencia.vencimento_proximo_ate)}`;
  definirTexto('fin-receber-proximo-prazo', prazo);
  definirTexto('fin-pagar-proximo-prazo', prazo);
  const temPeriodo = dados.periodo;
  definirTexto('fin-receber-periodo', temPeriodo ? formatarMoeda(receber.recebido_no_periodo) : formatarMoeda(receber.recebido_total));
  definirTexto('fin-receber-periodo-rotulo', temPeriodo ? `${dataBR(dados.periodo.de)} a ${dataBR(dados.periodo.ate)}` : 'Total acumulado. Informe o período.');
  definirTexto('fin-pagar-periodo', temPeriodo ? formatarMoeda(pagar.pago_no_periodo) : formatarMoeda(pagar.pago_total));
  definirTexto('fin-pagar-periodo-rotulo', temPeriodo ? `${dataBR(dados.periodo.de)} a ${dataBR(dados.periodo.ate)}` : 'Total acumulado. Informe o período.');
}

// Cada indicador navega para a lista que o compoe, ja filtrada.
document.querySelectorAll('[data-indicador-ir]').forEach((cartao) => {
  cartao.addEventListener('click', () => {
    const destino = cartao.dataset.indicadorIr;
    const status = cartao.dataset.indicadorStatus;
    if (status && destino === 'tab-recebimentos') {
      receberVisao.filtro = status === 'Vencido' ? 'vencidas' : 'abertas';
      if (status === 'Vencido') receberVisao.mes = '';
      renderizarRecebimentos(true);
    }
    openTab(null, destino);
    document.getElementById(destino)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

document.getElementById('mes-anterior').addEventListener('click', () => { mesDashboardAtual = deslocarMes(mesDashboardAtual || mesAtualISO(), -1); carregarDashboard(); });
document.getElementById('mes-seguinte').addEventListener('click', () => {
  const proximo = deslocarMes(mesDashboardAtual || mesAtualISO(), 1);
  if (proximo > mesAtualISO()) return;
  mesDashboardAtual = proximo;
  carregarDashboard();
});
document.getElementById('mes-atual').addEventListener('click', () => { mesDashboardAtual = mesAtualISO(); carregarDashboard(); });
['indicador-periodo-inicio', 'indicador-periodo-fim'].forEach((id) => document.getElementById(id).addEventListener('change', carregarIndicadoresFinanceiros));
document.getElementById('indicador-periodo-limpar').addEventListener('click', () => {
  document.getElementById('indicador-periodo-inicio').value = '';
  document.getElementById('indicador-periodo-fim').value = '';
  carregarIndicadoresFinanceiros();
});

// ================= FINANCEIRO: PEÇAS EM COMUM (pagar e receber) =================
// Lista agrupada (vencidas, hoje, próximos dias...), resumo no topo, filtro por
// mês e situação e a janela de baixa (pagar/receber com dia e forma).
const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_NOME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const rotuloMesFin = (mes) => (mes ? `${MESES_NOME[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}` : 'Todos os meses');
const mesSeguinteFin = (mes, n) => { const [a, m] = mes.split('-').map(Number); const d = new Date(Date.UTC(a, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
function diasAte(data) { return Math.round((new Date(`${data}T12:00:00Z`) - new Date(`${hojeNaLoja()}T12:00:00Z`)) / 86400000); }
function textoPrazo(data, verbo = 'Vence') {
  const d = diasAte(data);
  if (d === 0) return `${verbo} hoje`;
  if (d === 1) return `${verbo} amanhã`;
  if (d === -1) return 'Venceu ontem';
  if (d < 0) return `Venceu há ${-d} dias`;
  return `${verbo} em ${d} dias`;
}
const ICONE = {
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/>',
  lixo: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  desfazer: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  fixa: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  zap: '<path d="M7 17L17 7M8 7h9v9"/>'
};
const svgIcone = (nome) => `<svg class="icone" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONE[nome]}</svg>`;
const botaoIcone = (nome, rotulo, acao, classe = '') => `<button type="button" class="fin-icone ${classe}" data-acao-fin="${acao}" title="${rotulo}" aria-label="${rotulo}">${svgIcone(nome)}</button>`;
function htmlDataFin(data, estado) {
  const [, m, d] = data.split('-');
  return `<div class="fin-data ${estado}"><strong>${d}</strong><span>${MESES_ABREV[Number(m) - 1]}</span></div>`;
}
function tileResumo({ rotulo, valor, detalhe, tom = '', filtro = '', painel = '' }) {
  const tag = filtro ? 'button' : 'div';
  return `<${tag} ${filtro ? `type="button" data-${painel}-ir="${filtro}"` : ''} class="resumo-tile ${tom}"><span>${rotulo}</span><strong>${valor}</strong><small>${detalhe}</small></${tag}>`;
}
// Agrupa por prazo: vencidas, hoje, próximos 7 dias, mais adiante e, por fim, as quitadas.
function gruposPorPrazo(itens, quitada) {
  const grupos = [['vencidas', 'Vencidas', []], ['hoje', 'Vencem hoje', []], ['semana', 'Próximos 7 dias', []], ['depois', 'Mais para frente', []], ['quitadas', '', []], ['canceladas', 'Canceladas', []]];
  const por = Object.fromEntries(grupos.map((g) => [g[0], g[2]]));
  for (const item of itens) {
    if (item.status === 'Cancelado') por.canceladas.push(item);
    else if (quitada(item)) por.quitadas.push(item);
    else { const d = diasAte(item.vencimento); (d < 0 ? por.vencidas : d === 0 ? por.hoje : d <= 7 ? por.semana : por.depois).push(item); }
  }
  por.quitadas.sort((a, b) => (b.data_pagamento || b.data_recebimento || b.vencimento).localeCompare(a.data_pagamento || a.data_recebimento || a.vencimento));
  return grupos;
}
const somaValores = (lista) => lista.reduce((t, i) => t + Number(i.valor || 0), 0);
function preencherSelectCategorias(select, lista, atual) {
  const categorias = [...new Set(lista.map((i) => (i.categoria || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const html = `<option value="">Todas as categorias</option>${categorias.map((c) => `<option ${c === atual ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}`;
  if (select.dataset.assinatura !== html) { select.innerHTML = html; select.dataset.assinatura = html; }
}

// ---- Janela de baixa (pagar uma conta ou receber um valor) ----
const FORMAS_BAIXA = { pagar: ['Pix', 'Boleto', 'Transferência', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Débito automático'], receber: ['Pix', 'Dinheiro', 'Transferência', 'Boleto', 'Cartão de crédito', 'Cartão de débito'] };
let baixaAtual = null; // { tipo, id }
function abrirBaixa(tipo, item) {
  baixaAtual = { tipo, id: item.id };
  const pagar = tipo === 'pagar';
  document.getElementById('baixa-titulo').textContent = pagar ? 'Pagar conta' : 'Receber valor';
  document.getElementById('baixa-data-rotulo').textContent = pagar ? 'Pago em' : 'Recebido em';
  document.getElementById('baixa-forma-rotulo').textContent = pagar ? 'Como foi pago' : 'Como foi recebido';
  document.getElementById('baixa-confirmar').textContent = pagar ? 'Confirmar pagamento' : 'Confirmar recebimento';
  document.getElementById('baixa-resumo').innerHTML = `<span>${escapeHtml(item.descricao)}</span><strong>${formatarMoeda(item.valor)}</strong><small>${pagar ? 'Vencimento' : 'Previsto para'} ${dataBR(item.vencimento)}</small>`;
  const data = document.getElementById('baixa-data');
  data.value = hojeNaLoja(); data.max = hojeNaLoja();
  const preferida = lerPreferencia(`erp-forma-${tipo}`, 'Pix');
  document.getElementById('baixa-formas').innerHTML = FORMAS_BAIXA[tipo].map((f) => `<label class="baixa-forma"><input type="radio" name="baixa-forma" value="${f}" ${f === preferida ? 'checked' : ''}><span>${f}</span></label>`).join('');
  document.getElementById('baixa-erro').textContent = '';
  abrirDialogo('modal-baixa');
}
document.getElementById('form-baixa').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!baixaAtual) return;
  const data = document.getElementById('baixa-data').value;
  const forma = document.querySelector('input[name="baixa-forma"]:checked')?.value || '';
  const erro = document.getElementById('baixa-erro');
  if (!data) { erro.textContent = 'Escolha o dia.'; return; }
  if (data > hojeNaLoja()) { erro.textContent = 'O dia não pode ser no futuro.'; return; }
  const { tipo, id } = baixaAtual;
  const corpo = tipo === 'pagar' ? { data_pagamento: data, forma_pagamento: forma } : { data_recebimento: data, forma_recebimento: forma };
  const botao = document.getElementById('baixa-confirmar');
  botao.disabled = true;
  try {
    const resposta = await fetch(`${API_URL}/${tipo === 'pagar' ? 'contas' : 'recebimentos'}/${id}/${tipo === 'pagar' ? 'pagar' : 'receber'}`, { method: 'PUT', headers: getHeadersComUsuario(), body: JSON.stringify(corpo) });
    const resultado = await resposta.json();
    if (!resposta.ok) { erro.textContent = resultado.error || 'Não foi possível dar baixa.'; return; }
    salvarPreferencia(`erp-forma-${tipo}`, forma);
    fecharDialogo('modal-baixa');
    showToast(tipo === 'pagar' ? 'Conta paga.' : 'Valor recebido.');
    carregarTudo();
  } catch (_) { erro.textContent = 'Sem conexão com o servidor.'; } finally { botao.disabled = false; }
});

// ================= CONTAS A PAGAR =================
let contasState = [];
let contasFixasState = [];
let contasFixasAssinatura = '';
let contasAssinatura = '';
let contaFixaEditandoId = null;
const pagarVisao = { mes: hojeNaLoja().slice(0, 7), filtro: 'abertas' };
const AJUDA_DIVIDA_FIXA = 'Para despesas que se repetem (aluguel, internet, contador). Você lança uma vez só e o sistema anota a conta de cada mês sozinho, sempre no mesmo dia.';
const CATEGORIAS_SUGERIDAS = ['Aluguel', 'Contas de consumo', 'Fornecedores', 'Folha de pagamento', 'Impostos', 'Marketing', 'Serviços', 'Frete', 'Manutenção', 'Outros'];

async function carregarContas() {
  const res = await fetch(`${API_URL}/contas`);
  if (!res.ok) return;
  contasState = await res.json();
  renderizarContas();
}
// No mês escolhido entram as contas que vencem nele; as vencidas e não pagas de
// meses anteriores continuam aparecendo enquanto não forem pagas.
function contasDoMes() {
  const { mes } = pagarVisao;
  if (!mes) return contasState;
  const hoje = hojeNaLoja();
  return contasState.filter((c) => c.vencimento.startsWith(mes) || (c.status === 'Pendente' && c.vencimento < `${mes}-01` && mes >= hoje.slice(0, 7)));
}
function renderizarContas(forcar = false) {
  const lista = document.getElementById('tabela-contas');
  if (!lista) return;
  const busca = document.getElementById('pagar-busca').value.trim().toLowerCase();
  const categoriaSel = document.getElementById('pagar-categoria');
  preencherSelectCategorias(categoriaSel, contasState, categoriaSel.value);
  const categoria = categoriaSel.value;
  const assinatura = JSON.stringify([contasState, pagarVisao, busca, categoria, hojeNaLoja(), pode('contas', 'editar')]);
  if (!forcar && assinatura === contasAssinatura) return;
  contasAssinatura = assinatura;
  const hoje = hojeNaLoja();
  const mes = pagarVisao.mes;
  document.getElementById('pagar-mes-rotulo').textContent = rotuloMesFin(mes);
  document.querySelectorAll('[data-fin-mes="pagar"][data-passo="todos"]').forEach((b) => b.setAttribute('aria-pressed', String(!mes)));

  // Resumo: vencidas e próximos 7 dias valem para tudo; mês para o que está escolhido.
  const pendentes = contasState.filter((c) => c.status === 'Pendente');
  const vencidas = pendentes.filter((c) => c.vencimento < hoje);
  const semana = pendentes.filter((c) => c.vencimento >= hoje && diasAte(c.vencimento) <= 7);
  const doMes = mes ? contasState.filter((c) => c.vencimento.startsWith(mes)) : contasState;
  const abertoMes = doMes.filter((c) => c.status === 'Pendente'), pagoMes = doMes.filter((c) => c.status === 'Pago');
  const qtd = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  document.getElementById('pagar-resumo').innerHTML = [
    tileResumo({ rotulo: 'Vencidas', valor: formatarMoeda(somaValores(vencidas)), detalhe: vencidas.length ? qtd(vencidas.length, 'conta atrasada', 'contas atrasadas') : 'nada atrasado', tom: vencidas.length ? 'resumo-perigo' : 'zerado', filtro: 'vencidas', painel: 'pagar' }),
    tileResumo({ rotulo: 'Próximos 7 dias', valor: formatarMoeda(somaValores(semana)), detalhe: semana.length ? qtd(semana.length, 'conta', 'contas') : 'nada vencendo', tom: semana.length ? 'resumo-alerta' : 'zerado', filtro: 'abertas', painel: 'pagar' }),
    tileResumo({ rotulo: mes ? `A pagar · ${MESES_NOME[Number(mes.slice(5, 7)) - 1]}` : 'A pagar', valor: formatarMoeda(somaValores(abertoMes)), detalhe: qtd(abertoMes.length, 'conta em aberto', 'contas em aberto'), filtro: 'abertas', painel: 'pagar' }),
    tileResumo({ rotulo: mes ? `Pago · ${MESES_NOME[Number(mes.slice(5, 7)) - 1]}` : 'Pago', valor: formatarMoeda(somaValores(pagoMes)), detalhe: qtd(pagoMes.length, 'conta paga', 'contas pagas'), tom: 'resumo-ok', filtro: 'pagas', painel: 'pagar' })
  ].join('');

  const base = contasDoMes().filter((c) => (!categoria || c.categoria === categoria)
    && (!busca || `${c.descricao} ${c.categoria || ''} ${c.fornecedor_razao_social || ''} ${c.fornecedor_nome_fantasia || ''} ${c.observacoes || ''}`.toLowerCase().includes(busca)));
  const filtros = {
    abertas: (c) => c.status === 'Pendente',
    vencidas: (c) => c.status === 'Pendente' && c.vencimento < hoje,
    pagas: (c) => c.status === 'Pago',
    todas: () => true
  };
  document.querySelectorAll('[data-pagar-filtro]').forEach((b) => {
    const n = (b.dataset.pagarFiltro === 'vencidas' ? base.filter(filtros.vencidas) : base.filter(filtros[b.dataset.pagarFiltro])).length;
    b.classList.toggle('ativo', b.dataset.pagarFiltro === pagarVisao.filtro);
    b.querySelector('span').textContent = n;
  });
  const itens = base.filter(filtros[pagarVisao.filtro]);
  if (!itens.length) {
    const vazio = { abertas: 'Nenhuma conta em aberto neste período. 🎉', vencidas: 'Nenhuma conta vencida.', pagas: 'Nenhuma conta paga neste período.', todas: 'Nenhuma conta neste período.' }[pagarVisao.filtro];
    lista.innerHTML = `<div class="fin-vazio"><strong>${vazio}</strong>${pode('contas', 'editar') ? '<span>Use <b>Nova conta</b> para lançar uma despesa.</span>' : ''}</div>`;
    return;
  }
  const editar = pode('contas', 'editar');
  lista.innerHTML = gruposPorPrazo(itens, (c) => c.status === 'Pago').filter((g) => g[2].length).map(([chave, titulo, grupo]) => `
    <section class="fin-grupo fin-grupo-${chave}">
      <header><h4>${titulo || 'Pagas'}</h4><span>${grupo.length} · ${formatarMoeda(somaValores(grupo))}</span></header>
      ${grupo.map((c) => {
        const paga = c.status === 'Pago';
        const estado = paga ? 'paga' : diasAte(c.vencimento) < 0 ? 'vencida' : diasAte(c.vencimento) === 0 ? 'hoje' : '';
        const credor = c.fornecedor_razao_social ? (c.fornecedor_nome_fantasia || c.fornecedor_razao_social) : '';
        const tags = [
          c.conta_fixa_id ? `<span class="etq etq-fixa">${svgIcone('fixa')}Fixa</span>` : '',
          c.holerite_id ? `<span class="etq etq-folha">${svgIcone('doc')}Holerite</span>` : '',
          c.categoria ? `<span class="etq">${escapeHtml(c.categoria)}</span>` : '',
          credor ? `<span class="etq etq-credor">${escapeHtml(credor)}</span>` : ''
        ].join('');
        const detalhe = paga ? `Pago${c.data_pagamento ? ` em ${dataBR(c.data_pagamento)}` : ''}${c.forma_pagamento ? ` · ${escapeHtml(c.forma_pagamento)}` : ''}` : `${textoPrazo(c.vencimento)} · ${dataBR(c.vencimento)}`;
        const acoes = editar ? (paga
          ? botaoIcone('desfazer', 'Desfazer pagamento', `estornar-conta:${c.id}`)
          : `<button type="button" class="btn btn-sm btn-success fin-pagar" data-acao-fin="pagar:${c.id}">${svgIcone('check')}Pagar</button>${botaoIcone('editar', 'Editar', `editar-conta:${c.id}`)}${botaoIcone('lixo', 'Excluir', `excluir-conta:${c.id}`, 'perigo')}`) : '';
        return `<article class="fin-item ${estado}">
          ${htmlDataFin(c.vencimento, estado)}
          <div class="fin-info"><strong>${escapeHtml(c.descricao)}</strong>${tags ? `<div class="fin-tags">${tags}</div>` : ''}<small class="fin-detalhe">${detalhe}</small>${c.observacoes ? `<small class="fin-obs">${escapeHtml(c.observacoes)}</small>` : ''}</div>
          <div class="fin-valor">${formatarMoeda(c.valor)}</div>
          <div class="fin-acoes">${acoes}</div>
        </article>`;
      }).join('')}
    </section>`).join('');
}

// A caixa "Dívida fixa" troca os rótulos do formulário para deixar claro o que vai acontecer.
function atualizarOpcaoFixa() {
  const fixa = document.getElementById('conta-fixa').checked && !contaFixaEditandoId;
  document.getElementById('conta-venc-rotulo').textContent = fixa ? 'Primeiro vencimento' : 'Vencimento';
  document.getElementById('conta-salvar').textContent = contaFixaEditandoId || fixa ? 'Salvar dívida fixa' : (document.getElementById('conta-id').value ? 'Salvar alterações' : 'Lançar conta');
  document.getElementById('conta-obs-grupo').hidden = fixa || Boolean(contaFixaEditandoId);
  if (!contaFixaEditandoId) {
    document.getElementById('conta-fixa-ajuda').textContent = fixa
      ? 'A conta deste mês é lançada agora. Nos próximos meses o sistema lança sozinho, no mesmo dia. Para mudar o valor ou encerrar, use a aba "Dívidas fixas".'
      : AJUDA_DIVIDA_FIXA;
  }
}
document.getElementById('conta-fixa').addEventListener('change', atualizarOpcaoFixa);

function preencherCategoriasConta() {
  const todas = [...new Set([...CATEGORIAS_SUGERIDAS, ...contasState.map((c) => c.categoria).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  document.getElementById('conta-categorias').innerHTML = todas.map((c) => `<option value="${escapeHtml(c)}">`).join('');
}
function resetarFormularioConta() {
  document.getElementById('form-conta').reset();
  document.getElementById('conta-id').value = '';
  contaFixaEditandoId = null;
  document.getElementById('conta-fixa').disabled = false;
  document.getElementById('conta-fixa-opcao').classList.remove('hidden');
  document.getElementById('conta-fixa-dia-grupo').classList.add('hidden');
  document.getElementById('conta-fixa-dia').required = false;
  document.getElementById('conta-venc-grupo').classList.remove('hidden');
  document.getElementById('conta-venc').required = true;
  document.getElementById('titulo-conta').textContent = 'Nova conta';
  document.getElementById('conta-erro').textContent = '';
  atualizarOpcaoFixa();
}
function abrirNovaConta(fixa = false) {
  resetarFormularioConta();
  preencherCategoriasConta();
  document.getElementById('conta-venc').value = hojeNaLoja();
  if (fixa) { document.getElementById('conta-fixa').checked = true; document.getElementById('titulo-conta').textContent = 'Nova dívida fixa'; }
  atualizarOpcaoFixa();
  abrirDialogo('modal-conta');
}

async function carregarContasFixas() {
  const corpo = document.getElementById('tabela-contas-fixas');
  if (!corpo || !pode('contas')) return;
  const resposta = await fetch(`${API_URL}/contas-fixas`);
  if (!resposta.ok) return;
  const lista = await resposta.json();
  if (!Array.isArray(lista)) return;
  contasFixasState = lista;
  const assinatura = JSON.stringify([lista, pode('contas', 'editar')]);
  if (assinatura === contasFixasAssinatura) return;
  contasFixasAssinatura = assinatura;
  const ativas = lista.filter((f) => f.ativa);
  document.getElementById('pagar-fixas-contagem').textContent = ativas.length || '';
  const editar = pode('contas', 'editar');
  corpo.innerHTML = lista.length
    ? `<div class="fin-fixas-total"><span>${ativas.length} ${ativas.length === 1 ? 'dívida fixa ativa' : 'dívidas fixas ativas'}</span><strong>${formatarMoeda(somaValores(ativas))} por mês</strong></div>` + lista.map((fixa) => {
      const credor = fixa.fornecedor_razao_social ? (fixa.fornecedor_nome_fantasia || fixa.fornecedor_razao_social) : '';
      return `<article class="fin-item ${fixa.ativa ? '' : 'encerrada'}">
        <div class="fin-data fixa"><strong>${String(fixa.dia_vencimento).padStart(2, '0')}</strong><span>todo mês</span></div>
        <div class="fin-info"><strong>${escapeHtml(fixa.descricao)}</strong>
          <div class="fin-tags">${fixa.categoria ? `<span class="etq">${escapeHtml(fixa.categoria)}</span>` : ''}${credor ? `<span class="etq etq-credor">${escapeHtml(credor)}</span>` : ''}${fixa.ativa ? '' : '<span class="etq etq-off">Encerrada</span>'}</div>
          <small class="fin-detalhe">${fixa.ativa ? (fixa.proximo_vencimento ? `Próxima: ${dataBR(fixa.proximo_vencimento)}` : 'Sem conta em aberto') : `Encerrada${fixa.encerrada_em ? ` em ${dataBR(fixa.encerrada_em)}` : ''}`}</small></div>
        <div class="fin-valor">${formatarMoeda(fixa.valor)}</div>
        <div class="fin-acoes">${editar ? `${botaoIcone('editar', 'Editar', `editar-fixa:${fixa.id}`)}${fixa.ativa ? `<button type="button" class="btn btn-sm btn-secondary" data-acao-fin="encerrar-fixa:${fixa.id}">Encerrar</button>` : `<button type="button" class="btn btn-sm btn-secondary" data-acao-fin="reativar-fixa:${fixa.id}">Reativar</button>`}` : ''}</div>
      </article>`;
    }).join('')
    : '<div class="fin-vazio"><strong>Nenhuma dívida fixa ainda.</strong><span>Use <b>Dívida fixa</b> para lançar aluguel, internet ou outra conta que se repete todo mês.</span></div>';
}

function editarContaFixa(id) {
  const fixa = contasFixasState.find((item) => item.id === id);
  if (!fixa) return;
  resetarFormularioConta();
  preencherCategoriasConta();
  contaFixaEditandoId = id;
  document.getElementById('conta-desc').value = fixa.descricao;
  definirFornecedorDaConta(fixa.id_fornecedor);
  document.getElementById('conta-valor').value = fixa.valor;
  document.getElementById('conta-categoria').value = fixa.categoria || '';
  const caixa = document.getElementById('conta-fixa');
  caixa.checked = true;
  caixa.disabled = true;
  document.getElementById('conta-fixa-dia-grupo').classList.remove('hidden');
  document.getElementById('conta-fixa-dia').value = fixa.dia_vencimento;
  document.getElementById('conta-fixa-dia').required = true;
  document.getElementById('conta-venc-grupo').classList.add('hidden');
  document.getElementById('conta-venc').required = false;
  document.getElementById('titulo-conta').textContent = 'Editar dívida fixa';
  document.getElementById('conta-fixa-ajuda').textContent = 'A mudança vale para as contas ainda pendentes deste mês em diante. Contas já pagas e de meses passados não mudam.';
  atualizarOpcaoFixa();
  abrirDialogo('modal-conta');
}

async function alterarSituacaoContaFixa(id, acao, pergunta) {
  if (pergunta && !confirm(pergunta)) return;
  try {
    const resposta = await fetch(`${API_URL}/contas-fixas/${id}/${acao}`, { method: 'PUT', headers: getHeadersComUsuario() });
    const resultado = await resposta.json();
    if (!resposta.ok) return showToast(resultado.error || 'Não foi possível alterar a dívida fixa.', 'error');
    showToast(resultado.mensagem);
    contasFixasAssinatura = '';
    await carregarTudo();
  } catch (_) {
    showToast('Erro ao conectar com o servidor.', 'error');
  }
}
const encerrarContaFixa = (id) => alterarSituacaoContaFixa(id, 'encerrar', 'Encerrar esta dívida fixa? O sistema para de lançar contas novas e remove a conta futura que ainda não foi paga. O histórico é mantido.');
const reativarContaFixa = (id) => alterarSituacaoContaFixa(id, 'reativar', '');

function editarConta(id) {
  const conta = contasState.find((item) => item.id === id);
  if (!conta) return;
  resetarFormularioConta();
  preencherCategoriasConta();
  document.getElementById('conta-fixa-opcao').classList.add('hidden');
  document.getElementById('conta-id').value = id;
  document.getElementById('conta-desc').value = conta.descricao;
  definirFornecedorDaConta(conta.id_fornecedor);
  document.getElementById('conta-valor').value = conta.valor;
  document.getElementById('conta-venc').value = conta.vencimento;
  document.getElementById('conta-categoria').value = conta.categoria || '';
  document.getElementById('conta-obs').value = conta.observacoes || '';
  document.getElementById('titulo-conta').textContent = conta.holerite_id ? 'Editar conta do holerite' : 'Editar conta';
  atualizarOpcaoFixa();
  abrirDialogo('modal-conta');
}
document.getElementById('cancelar-edicao-conta').addEventListener('click', resetarFormularioConta);
document.getElementById('form-conta').addEventListener('submit', async (e) => {
  e.preventDefault();
  const erro = document.getElementById('conta-erro');
  if (!pode('contas', 'editar')) { erro.textContent = 'Você não pode lançar despesas.'; return; }
  const id = document.getElementById('conta-id').value;
  const descricao = document.getElementById('conta-desc').value.trim();
  const valor = document.getElementById('conta-valor').value;
  const vencimento = document.getElementById('conta-venc').value;
  const categoria = document.getElementById('conta-categoria').value.trim();
  const observacoes = document.getElementById('conta-obs').value.trim();
  const fixa = document.getElementById('conta-fixa').checked && !id;
  if (!descricao) { erro.textContent = 'Escreva a descrição da conta.'; return; }
  if (!(Number(valor) > 0)) { erro.textContent = 'Informe o valor.'; return; }
  let caminho = `/contas${id ? `/${id}` : ''}`;
  let metodo = id ? 'PUT' : 'POST';
  const idFornecedor = document.getElementById('conta-fornecedor').value || null;
  let data = { descricao, valor, vencimento, id_fornecedor: idFornecedor, categoria, observacoes };
  if (contaFixaEditandoId) {
    caminho = `/contas-fixas/${contaFixaEditandoId}`;
    metodo = 'PUT';
    data = { descricao, valor, categoria, dia_vencimento: document.getElementById('conta-fixa-dia').value, id_fornecedor: idFornecedor };
  } else if (fixa) {
    caminho = '/contas-fixas';
    metodo = 'POST';
    data = { descricao, valor, categoria, primeiro_vencimento: vencimento, id_fornecedor: idFornecedor };
  }
  const botao = document.getElementById('conta-salvar');
  botao.disabled = true;
  try {
    const resposta = await fetch(`${API_URL}${caminho}`, { method: metodo, headers: getHeadersComUsuario(), body: JSON.stringify(data) });
    const resultado = await resposta.json();
    if (!resposta.ok) { erro.textContent = resultado.error || 'Não foi possível salvar a conta.'; return; }
    showToast(contaFixaEditandoId || fixa ? resultado.mensagem : (id ? 'Conta atualizada.' : 'Conta lançada.'));
    contasFixasAssinatura = '';
    fecharDialogo('modal-conta');
    resetarFormularioConta();
    carregarTudo();
  } catch (_) { erro.textContent = 'Sem conexão com o servidor.'; } finally { botao.disabled = false; }
});

async function estornarConta(id) {
  const conta = contasState.find((c) => c.id === id);
  if (!conta || !confirm(`Desfazer o pagamento de "${conta.descricao}"? A conta volta a ficar em aberto.`)) return;
  const resposta = await fetch(`${API_URL}/contas/${id}/estornar`, { method: 'PUT', headers: getHeadersComUsuario() });
  const resultado = await resposta.json();
  if (!resposta.ok) return showToast(resultado.error || 'Não foi possível desfazer.', 'error');
  showToast(resultado.mensagem);
  carregarTudo();
}
async function deletarConta(id) {
  const contaAlvo = contasState.find((item) => item.id === id);
  if (!contaAlvo) return;
  const aviso = contaAlvo.conta_fixa_id ? '\n\nSó a conta deste mês será excluída. A dívida fixa continua lançando os próximos meses.'
    : contaAlvo.holerite_id ? '\n\nO holerite continua salvo, só deixa de ter conta a pagar.' : '';
  if (!confirm(`Excluir "${contaAlvo.descricao}"?${aviso}`)) return;
  const res = await fetch(`${API_URL}/contas/${id}`, { method: 'DELETE', headers: getHeadersComUsuario() });
  const resultado = await res.json();
  if (!res.ok) { showToast(resultado.error || 'Erro ao excluir conta.', 'error'); return; }
  showToast('Conta excluída.');
  carregarTudo();
}

document.querySelectorAll('[data-nova-conta]').forEach((b) => b.addEventListener('click', () => abrirNovaConta(b.dataset.novaConta === 'fixa')));
document.querySelectorAll('[data-painel-pagar]').forEach((aba) => aba.addEventListener('click', () => {
  document.querySelectorAll('[data-painel-pagar]').forEach((b) => { const ativa = b === aba; b.classList.toggle('ativa', ativa); b.setAttribute('aria-selected', String(ativa)); });
  document.querySelectorAll('[data-painel-pagar-conteudo]').forEach((p) => { p.hidden = p.dataset.painelPagarConteudo !== aba.dataset.painelPagar; });
}));
document.querySelectorAll('[data-pagar-filtro]').forEach((b) => b.addEventListener('click', () => { pagarVisao.filtro = b.dataset.pagarFiltro; renderizarContas(true); }));
document.getElementById('pagar-resumo').addEventListener('click', (e) => {
  const alvo = e.target.closest('[data-pagar-ir]');
  if (!alvo) return;
  pagarVisao.filtro = alvo.dataset.pagarIr;
  if (pagarVisao.filtro === 'vencidas') pagarVisao.mes = '';
  renderizarContas(true);
});
['pagar-busca', 'pagar-categoria'].forEach((id) => document.getElementById(id).addEventListener('input', () => renderizarContas(true)));

// ================= CONTAS A RECEBER =================
let recebimentosState = [];
let recebimentosAssinatura = '';
const receberVisao = { mes: hojeNaLoja().slice(0, 7), filtro: 'abertas' };
function hojeISO() { return new Date().toISOString().slice(0, 10); }
function statusRecebimento(item) { return item.status === 'Pendente' && item.vencimento < hojeNaLoja() ? 'Vencido' : item.status; }
function dataBR(data) { return data ? String(data).slice(0, 10).split('-').reverse().join('/') : '-'; }
function preencherDataPadrao(id) { const campo = document.getElementById(id); if (campo && !campo.value) campo.value = hojeNaLoja(); }
function resetarFormularioRecebimento() {
  document.getElementById('form-recebimento').reset();
  document.getElementById('recebimento-id').value = '';
  document.getElementById('titulo-recebimento').textContent = 'Novo recebimento';
  document.getElementById('recebimento-salvar').textContent = 'Salvar recebimento';
  document.getElementById('recebimento-erro').textContent = '';
}
function preencherCategoriasRecebimento() {
  const todas = [...new Set(['Encomenda', 'Venda a prazo', 'Evento', 'Parceria', 'Reembolso', ...recebimentosState.map((r) => r.categoria).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  document.getElementById('recebimento-categorias').innerHTML = todas.map((c) => `<option value="${escapeHtml(c)}">`).join('');
}
function recebimentosDoMes() {
  const { mes } = receberVisao;
  if (!mes) return recebimentosState;
  const hoje = hojeNaLoja();
  return recebimentosState.filter((r) => r.vencimento.startsWith(mes) || (r.status === 'Pendente' && r.vencimento < `${mes}-01` && mes >= hoje.slice(0, 7)));
}
function renderizarRecebimentos(forcar = false) {
  const lista = document.getElementById('tabela-recebimentos');
  if (!lista) return;
  const busca = document.getElementById('receber-busca').value.trim().toLowerCase();
  const origem = document.getElementById('receber-origem').value;
  const categoriaSel = document.getElementById('receber-categoria');
  preencherSelectCategorias(categoriaSel, recebimentosState, categoriaSel.value);
  const categoria = categoriaSel.value;
  const assinatura = JSON.stringify([recebimentosState, receberVisao, busca, origem, categoria, hojeNaLoja(), pode('recebimentos', 'editar')]);
  if (!forcar && assinatura === recebimentosAssinatura) return;
  recebimentosAssinatura = assinatura;
  const hoje = hojeNaLoja();
  const mes = receberVisao.mes;
  document.getElementById('receber-mes-rotulo').textContent = rotuloMesFin(mes);
  document.querySelectorAll('[data-fin-mes="receber"][data-passo="todos"]').forEach((b) => b.setAttribute('aria-pressed', String(!mes)));

  const pendentes = recebimentosState.filter((r) => r.status === 'Pendente');
  const vencidos = pendentes.filter((r) => r.vencimento < hoje);
  const semana = pendentes.filter((r) => r.vencimento >= hoje && diasAte(r.vencimento) <= 7);
  const doMes = mes ? recebimentosState.filter((r) => r.vencimento.startsWith(mes)) : recebimentosState;
  const abertoMes = doMes.filter((r) => r.status === 'Pendente');
  const recebidoMes = recebimentosState.filter((r) => r.status === 'Recebido' && (!mes || String(r.data_recebimento || r.vencimento).startsWith(mes)));
  const qtd = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const nomeMes = mes ? MESES_NOME[Number(mes.slice(5, 7)) - 1] : '';
  document.getElementById('receber-resumo').innerHTML = [
    tileResumo({ rotulo: 'Vencidos', valor: formatarMoeda(somaValores(vencidos)), detalhe: vencidos.length ? qtd(vencidos.length, 'valor atrasado', 'valores atrasados') : 'nada atrasado', tom: vencidos.length ? 'resumo-perigo' : 'zerado', filtro: 'vencidas', painel: 'receber' }),
    tileResumo({ rotulo: 'Próximos 7 dias', valor: formatarMoeda(somaValores(semana)), detalhe: semana.length ? qtd(semana.length, 'valor', 'valores') : 'nada previsto', tom: semana.length ? 'resumo-alerta' : 'zerado', filtro: 'abertas', painel: 'receber' }),
    tileResumo({ rotulo: mes ? `A receber · ${nomeMes}` : 'A receber', valor: formatarMoeda(somaValores(abertoMes)), detalhe: qtd(abertoMes.length, 'em aberto', 'em aberto'), filtro: 'abertas', painel: 'receber' }),
    tileResumo({ rotulo: mes ? `Recebido · ${nomeMes}` : 'Recebido', valor: formatarMoeda(somaValores(recebidoMes)), detalhe: qtd(recebidoMes.length, 'recebimento', 'recebimentos'), tom: 'resumo-ok', filtro: 'recebidas', painel: 'receber' })
  ].join('');

  const base = recebimentosDoMes().filter((r) => (!categoria || r.categoria === categoria)
    && (!origem || (origem === 'vendas' ? r.venda_id : !r.venda_id))
    && (!busca || `${r.descricao} ${r.relacionado || ''} ${r.categoria || ''} ${r.observacoes || ''}`.toLowerCase().includes(busca)));
  const filtros = {
    abertas: (r) => r.status === 'Pendente',
    vencidas: (r) => r.status === 'Pendente' && r.vencimento < hoje,
    recebidas: (r) => r.status === 'Recebido',
    canceladas: (r) => r.status === 'Cancelado',
    todas: () => true
  };
  document.querySelectorAll('[data-receber-filtro]').forEach((b) => {
    b.classList.toggle('ativo', b.dataset.receberFiltro === receberVisao.filtro);
    b.querySelector('span').textContent = base.filter(filtros[b.dataset.receberFiltro]).length;
  });
  const itens = base.filter(filtros[receberVisao.filtro]);
  if (!itens.length) {
    const vazio = { abertas: 'Nada em aberto neste período.', vencidas: 'Nenhum valor vencido.', recebidas: 'Nada recebido neste período.', canceladas: 'Nenhum recebimento cancelado.', todas: 'Nenhum recebimento neste período.' }[receberVisao.filtro];
    lista.innerHTML = `<div class="fin-vazio"><strong>${vazio}</strong><span>As vendas entram aqui sozinhas. Use <b>Novo recebimento</b> para encomendas, vendas a prazo e outros valores.</span></div>`;
    return;
  }
  const editar = pode('recebimentos', 'editar');
  lista.innerHTML = gruposPorPrazo(itens, (r) => r.status === 'Recebido').filter((g) => g[2].length).map(([chave, titulo, grupo]) => `
    <section class="fin-grupo fin-grupo-${chave}">
      <header><h4>${titulo || 'Recebidos'}</h4><span>${grupo.length} · ${formatarMoeda(somaValores(grupo))}</span></header>
      ${grupo.map((r) => {
        const recebido = r.status === 'Recebido', cancelado = r.status === 'Cancelado';
        const estado = cancelado ? 'cancelada' : recebido ? 'paga' : diasAte(r.vencimento) < 0 ? 'vencida' : diasAte(r.vencimento) === 0 ? 'hoje' : '';
        const tags = [
          r.venda_id ? `<span class="etq etq-venda">Venda #${r.venda_id}</span>` : '',
          r.categoria && !(r.venda_id && r.categoria === 'Venda') ? `<span class="etq">${escapeHtml(r.categoria)}</span>` : '',
          r.relacionado && !r.venda_id ? `<span class="etq etq-credor">${escapeHtml(r.relacionado)}</span>` : ''
        ].join('');
        const detalhe = cancelado ? 'Cancelado' : recebido ? `Recebido${r.data_recebimento ? ` em ${dataBR(r.data_recebimento)}` : ''}${r.forma_recebimento ? ` · ${escapeHtml(r.forma_recebimento)}` : ''}` : `${textoPrazo(r.vencimento, 'Previsto')} · ${dataBR(r.vencimento)}`;
        let acoes = '';
        if (editar && !cancelado) {
          if (recebido) acoes = r.venda_id ? '' : botaoIcone('desfazer', 'Desfazer recebimento', `estornar-receb:${r.id}`);
          else acoes = `<button type="button" class="btn btn-sm btn-success fin-pagar" data-acao-fin="receber:${r.id}">${svgIcone('check')}Receber</button>${r.venda_id ? '' : botaoIcone('editar', 'Editar', `editar-receb:${r.id}`)}${botaoIcone('x', 'Cancelar', `cancelar-receb:${r.id}`, 'perigo')}`;
        }
        if (r.venda_id && pode('caixa')) acoes += botaoIcone('zap', 'Ver no Caixa', `ver-venda:${r.venda_id}`);
        return `<article class="fin-item ${estado}">
          ${htmlDataFin(recebido && r.data_recebimento ? r.data_recebimento : r.vencimento, estado)}
          <div class="fin-info"><strong>${escapeHtml(r.descricao)}</strong>${tags ? `<div class="fin-tags">${tags}</div>` : ''}<small class="fin-detalhe">${detalhe}</small>${r.observacoes && !r.venda_id ? `<small class="fin-obs">${escapeHtml(r.observacoes)}</small>` : ''}</div>
          <div class="fin-valor">${formatarMoeda(r.valor)}</div>
          <div class="fin-acoes">${acoes}</div>
        </article>`;
      }).join('')}
    </section>`).join('');
}
async function carregarRecebimentos() { const res = await fetch(`${API_URL}/recebimentos`); if (!res.ok) return; recebimentosState = (await res.json()).map((r) => ({ ...r, valor: Number(r.valor), vencimento: String(r.vencimento).slice(0, 10), data_recebimento: r.data_recebimento ? String(r.data_recebimento).slice(0, 10) : null })); renderizarRecebimentos(); }
function editarRecebimento(id) {
  const item = recebimentosState.find((registro) => registro.id === id);
  if (!item) return;
  resetarFormularioRecebimento();
  preencherCategoriasRecebimento();
  ['descricao', 'categoria', 'relacionado', 'valor', 'vencimento', 'observacoes'].forEach((campo) => { document.getElementById(`recebimento-${campo}`).value = item[campo] ?? ''; });
  document.getElementById('recebimento-id').value = id;
  document.getElementById('titulo-recebimento').textContent = 'Editar recebimento';
  document.getElementById('recebimento-salvar').textContent = 'Salvar alterações';
  abrirDialogo('modal-recebimento');
}
async function cancelarRecebimento(id) {
  const item = recebimentosState.find((r) => r.id === id);
  if (!item || !confirm(`Cancelar "${item.descricao}"? Ele sai dos valores a receber.`)) return;
  const resposta = await fetch(`${API_URL}/recebimentos/${id}/cancelar`, { method: 'PUT', headers: getHeadersComUsuario() });
  const resultado = await resposta.json();
  if (!resposta.ok) return showToast(resultado.error, 'error');
  showToast('Recebimento cancelado.');
  carregarTudo();
}
async function estornarRecebimento(id) {
  const item = recebimentosState.find((r) => r.id === id);
  if (!item || !confirm(`Desfazer o recebimento de "${item.descricao}"? O valor volta a ficar em aberto.`)) return;
  const resposta = await fetch(`${API_URL}/recebimentos/${id}/estornar`, { method: 'PUT', headers: getHeadersComUsuario() });
  const resultado = await resposta.json();
  if (!resposta.ok) return showToast(resultado.error, 'error');
  showToast(resultado.mensagem);
  carregarTudo();
}
document.getElementById('form-recebimento').addEventListener('submit', async (event) => {
  event.preventDefault();
  const erro = document.getElementById('recebimento-erro');
  const id = document.getElementById('recebimento-id').value;
  const dados = { descricao: document.getElementById('recebimento-descricao').value.trim(), categoria: document.getElementById('recebimento-categoria').value.trim(), relacionado: document.getElementById('recebimento-relacionado').value.trim(), valor: document.getElementById('recebimento-valor').value, vencimento: document.getElementById('recebimento-vencimento').value, observacoes: document.getElementById('recebimento-observacoes').value.trim() };
  if (!dados.descricao) { erro.textContent = 'Escreva a descrição.'; return; }
  if (!(Number(dados.valor) > 0)) { erro.textContent = 'Informe o valor.'; return; }
  if (!dados.vencimento) { erro.textContent = 'Escolha a data prevista.'; return; }
  const atual = recebimentosState.find((item) => item.id === Number(id));
  const corpo = id ? { ...dados, status: atual?.status || 'Pendente', data_recebimento: atual?.data_recebimento || '', forma_recebimento: atual?.forma_recebimento || '' } : dados;
  const botao = document.getElementById('recebimento-salvar');
  botao.disabled = true;
  try {
    const resposta = await fetch(`${API_URL}/recebimentos${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', headers: getHeadersComUsuario(), body: JSON.stringify(corpo) });
    const resultado = await resposta.json();
    if (!resposta.ok) { erro.textContent = resultado.error || 'Não foi possível salvar.'; return; }
    showToast(id ? 'Recebimento atualizado.' : 'Recebimento lançado.');
    fecharDialogo('modal-recebimento');
    resetarFormularioRecebimento();
    carregarTudo();
  } catch (_) { erro.textContent = 'Sem conexão com o servidor.'; } finally { botao.disabled = false; }
});
document.getElementById('cancelar-edicao-recebimento').addEventListener('click', resetarFormularioRecebimento);
document.getElementById('novo-recebimento').addEventListener('click', () => { resetarFormularioRecebimento(); preencherCategoriasRecebimento(); document.getElementById('recebimento-vencimento').value = hojeNaLoja(); abrirDialogo('modal-recebimento'); });
document.querySelectorAll('[data-receber-filtro]').forEach((b) => b.addEventListener('click', () => { receberVisao.filtro = b.dataset.receberFiltro; renderizarRecebimentos(true); }));
document.getElementById('receber-resumo').addEventListener('click', (e) => {
  const alvo = e.target.closest('[data-receber-ir]');
  if (!alvo) return;
  receberVisao.filtro = alvo.dataset.receberIr;
  if (receberVisao.filtro === 'vencidas') receberVisao.mes = '';
  renderizarRecebimentos(true);
});
['receber-busca', 'receber-origem', 'receber-categoria'].forEach((id) => document.getElementById(id).addEventListener('input', () => renderizarRecebimentos(true)));

// Navegação de mês e ações das listas (um único ouvinte por tela).
document.querySelectorAll('[data-fin-mes]').forEach((b) => b.addEventListener('click', () => {
  const visao = b.dataset.finMes === 'pagar' ? pagarVisao : receberVisao;
  if (b.dataset.passo === 'todos') visao.mes = visao.mes ? '' : hojeNaLoja().slice(0, 7);
  else visao.mes = mesSeguinteFin(visao.mes || hojeNaLoja().slice(0, 7), Number(b.dataset.passo));
  if (b.dataset.finMes === 'pagar') renderizarContas(true); else renderizarRecebimentos(true);
}));
['tab-contas', 'tab-recebimentos'].forEach((aba) => document.getElementById(aba).addEventListener('click', (e) => {
  const alvo = e.target.closest('[data-acao-fin]');
  if (!alvo) return;
  const [acao, valor] = alvo.dataset.acaoFin.split(':');
  const id = Number(valor);
  const conta = () => contasState.find((c) => c.id === id);
  const receb = () => recebimentosState.find((r) => r.id === id);
  ({
    pagar: () => conta() && abrirBaixa('pagar', conta()),
    'editar-conta': () => editarConta(id),
    'excluir-conta': () => deletarConta(id),
    'estornar-conta': () => estornarConta(id),
    'editar-fixa': () => editarContaFixa(id),
    'encerrar-fixa': () => encerrarContaFixa(id),
    'reativar-fixa': () => reativarContaFixa(id),
    receber: () => receb() && abrirBaixa('receber', receb()),
    'editar-receb': () => editarRecebimento(id),
    'cancelar-receb': () => cancelarRecebimento(id),
    'estornar-receb': () => estornarRecebimento(id),
    'ver-venda': () => irParaAba('tab-caixa')
  }[acao] || (() => {}))();
}));

// ================= USUÁRIOS =================
async function carregarUsuarios() {
  const tabela = document.getElementById('tabela-usuarios');
  if (!tabela) return;

  try {
    const res = await fetch(`${API_URL}/usuarios`);
    const usuarios = await res.json();
    // A tabela só é limpa depois de saber que os dados mudaram: antes ela era
    // apagada a cada atualização automática e ficava vazia.
    if (!res.ok || !Array.isArray(usuarios) || usuarios.length === 0) {
      usuariosAssinatura = '';
      tabela.innerHTML = `<div class="fin-vazio"><strong>${res.ok ? 'Nenhum usuário encontrado.' : 'Não foi possível carregar os usuários.'}</strong></div>`;
      return;
    }
    usuariosState = usuarios;
    const assinatura = JSON.stringify(usuarios);
    if (assinatura === usuariosAssinatura) return;
    usuariosAssinatura = assinatura;
    const admins = usuarios.filter((u) => u.admin).length;
    const semAcesso = usuarios.filter((u) => !u.admin && !Object.keys(u.permissoes || {}).length).length;
    document.getElementById('usuarios-resumo').innerHTML = [
      tileResumo({ rotulo: 'Usuários', valor: String(usuarios.length), detalhe: 'podem entrar no sistema' }),
      tileResumo({ rotulo: 'Administradores', valor: String(admins), detalhe: 'acesso total', tom: 'resumo-perigo' }),
      tileResumo({ rotulo: 'Acesso por tela', valor: String(usuarios.length - admins - semAcesso), detalhe: 'veem só o que foi liberado' }),
      tileResumo({ rotulo: 'Sem acesso', valor: String(semAcesso), detalhe: semAcesso ? 'libere em Permissões' : 'todos com alguma tela', tom: semAcesso ? 'resumo-alerta' : 'zerado' })
    ].join('');
    const eu = getUsuarioAtual();
    tabela.innerHTML = usuarios.map((u) => `<article class="func-card usuario-card">
      <header>
        ${htmlAvatar(u.nome)}
        <div class="func-nome"><strong>${escapeHtml(u.nome)}${eu && eu.login === u.login ? ' <small class="usuario-voce">você</small>' : ''}</strong><span>${escapeHtml(u.departamento)} · @${escapeHtml(u.login)}</span></div>
      </header>
      <div class="usuario-acesso">${resumoAcesso(u)}</div>
      <footer>
        <div>
          ${u.admin ? '' : `<button type="button" class="btn btn-sm btn-secondary" onclick="abrirPermissoes(${u.id})">Permissões</button>`}
          <button type="button" class="btn btn-sm btn-secondary" onclick="abrirSenhaUsuario(${u.id})">Senha</button>
        </div>
        <button type="button" class="fin-icone perigo" onclick="deletarUsuario(${u.id})" title="Excluir usuário" aria-label="Excluir usuário">${svgIcone('lixo')}</button>
      </footer>
    </article>`).join('');
  } catch (err) {
    usuariosAssinatura = '';
    tabela.innerHTML = '<div class="fin-vazio"><strong>Erro ao carregar usuários.</strong></div>';
  }
}

document.getElementById('form-usuario').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isAdminMaster()) {
    showToast('Apenas o admin master pode adicionar usuários.', 'error');
    return;
  }
  await carregarCatalogoTelas();

  const data = { 
      nome: document.getElementById('user-nome').value, 
      departamento: document.getElementById('user-depto').value, 
      login: document.getElementById('user-login').value, 
      senha: document.getElementById('user-senha').value,
      permissoes: PERFIS_ACESSO[document.getElementById('user-perfil').value]?.permissoes(catalogoTelas) || undefined
  };
  
  try {
      const resposta = await fetch(`${API_URL}/usuarios`, { method: 'POST', headers: getHeadersComUsuario(), body: JSON.stringify(data) });
      const resultado = await resposta.json();

      if(resposta.ok) {
          showToast(`Usuário criado! Login: ${normalizarLoginTela(data.login)}`); 
          e.target.reset(); 
          document.getElementById('usuario-erro').textContent = '';
          fecharDialogo('modal-usuario');
          triggerSync();
          carregarTudo();
      } else {
          document.getElementById('usuario-erro').textContent = resultado.error || 'Erro ao criar usuário.';
      }
  } catch(err) {
      showToast("Erro ao comunicar com o servidor.", 'error');
  }
});

async function deletarUsuario(id) {
  if (!isAdminMaster()) {
    showToast('Apenas o admin master pode excluir usuários.', 'error');
    return;
  }

  if(confirm("Deseja realmente excluir este usuário?")) {
    const res = await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE', headers: getHeadersComUsuario() });
    const resultado = await res.json();

    if (!res.ok) {
      showToast(resultado.error || 'Erro ao excluir usuário.', 'error');
      return;
    }

    showToast("Usuário excluído com sucesso!");
    carregarTudo();
  }
}

// ================= CUPONS, BRINDES E DOACOES =================


// ================= FORNECEDORES (somente administrador) =================
// Telefones e e-mails são multivalorados: cada um é uma linha do formulário e
// uma linha própria no banco (fornecedor_telefone / fornecedor_email). O
// telefone é digitado em três campos: país (DDI), DDD e número.
let fornecedoresState = [];
const formatarCnpj = (valor) => {
  const d = String(valor ?? '').replace(/\D/g, '').slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
};
function formatarTelefoneFornecedor(t) {
  let numero = String(t.numero || '');
  if (t.codigo_pais === '55' && (numero.length === 8 || numero.length === 9)) numero = `${numero.slice(0, numero.length - 4)}-${numero.slice(-4)}`;
  return `+${t.codigo_pais}${t.ddd ? ` (${t.ddd})` : ''} ${numero}`;
}
function criarLinhaTelefoneFornecedor(t = {}) {
  const linha = document.createElement('div');
  linha.className = 'contato-linha contato-telefone';
  linha.innerHTML = '<input type="text" inputmode="numeric" maxlength="4" class="forn-tel-pais" aria-label="Código do país (DDI)" placeholder="País">'
    + '<input type="text" inputmode="numeric" maxlength="3" class="forn-tel-ddd" aria-label="DDD" placeholder="DDD">'
    + '<input type="text" inputmode="numeric" maxlength="15" class="forn-tel-numero" aria-label="Número do telefone" placeholder="Número">'
    + '<button type="button" class="btn btn-sm btn-secondary contato-remover" aria-label="Remover telefone">Remover</button>';
  linha.querySelector('.forn-tel-pais').value = t.codigo_pais ?? '55';
  linha.querySelector('.forn-tel-ddd').value = t.ddd ?? '';
  linha.querySelector('.forn-tel-numero').value = t.numero ?? '';
  linha.querySelector('.contato-remover').addEventListener('click', () => linha.remove());
  return linha;
}
function criarLinhaEmailFornecedor(e = {}) {
  const linha = document.createElement('div');
  linha.className = 'contato-linha contato-email';
  linha.innerHTML = '<input type="email" maxlength="254" class="forn-email" aria-label="E-mail" placeholder="contato@empresa.com.br">'
    + '<button type="button" class="btn btn-sm btn-secondary contato-remover" aria-label="Remover e-mail">Remover</button>';
  linha.querySelector('.forn-email').value = e.email ?? '';
  linha.querySelector('.contato-remover').addEventListener('click', () => linha.remove());
  return linha;
}
function preencherContatosFornecedor(telefones = [], emails = []) {
  const blocoTel = document.getElementById('fornecedor-telefones'), blocoEmail = document.getElementById('fornecedor-emails');
  blocoTel.replaceChildren(...(telefones.length ? telefones : [{}]).map(criarLinhaTelefoneFornecedor));
  blocoEmail.replaceChildren(...(emails.length ? emails : [{}]).map(criarLinhaEmailFornecedor));
}
function lerContatosDoFormularioFornecedor() {
  const telefones = [...document.querySelectorAll('#fornecedor-telefones .contato-linha')].map((linha) => ({
    codigo_pais: linha.querySelector('.forn-tel-pais').value.trim(), ddd: linha.querySelector('.forn-tel-ddd').value.trim(), numero: linha.querySelector('.forn-tel-numero').value.trim()
  })).filter((t) => t.ddd || t.numero); // linha em branco (só o país preenchido) é ignorada
  const emails = [...document.querySelectorAll('#fornecedor-emails .forn-email')].map((campo) => ({ email: campo.value.trim() })).filter((e) => e.email);
  return { telefones, emails };
}
function resetarFormularioFornecedor() {
  document.getElementById('form-fornecedor').reset();
  document.getElementById('fornecedor-id').value = '';
  document.getElementById('titulo-fornecedor').textContent = 'Novo fornecedor';
  document.getElementById('fornecedor-erro').textContent = '';
  preencherContatosFornecedor();
}
const ROTULO_TIPO_FORNECEDOR = { FORNECEDOR: 'Fornecedor', PRESTADOR_PJ: 'Prestador PJ' };
const nomeDoFornecedor = (f) => (f.nome_fantasia ? `${f.razao_social} (${f.nome_fantasia})` : f.razao_social);
// Linha pequena com o credor vinculado à conta (ou dívida fixa), quando houver.
function htmlCredorVinculado(razao, fantasia, tipo) {
  if (!razao) return '';
  return `<br><small class="field-help">${escapeHtml(ROTULO_TIPO_FORNECEDOR[tipo] || 'Fornecedor')}: ${escapeHtml(fantasia ? `${razao} (${fantasia})` : razao)}</small>`;
}
let fornecedoresAssinatura = '';
function renderizarFornecedores(forcar = false) {
  const lista = document.getElementById('tabela-fornecedores');
  const busca = document.getElementById('filtro-fornecedor').value.toLowerCase().trim(), buscaDigitos = busca.replace(/\D/g, '');
  const situacao = document.getElementById('filtro-fornecedor-situacao').value, tipo = document.getElementById('filtro-fornecedor-tipo').value;
  const assinatura = JSON.stringify([fornecedoresState, busca, situacao, tipo, pode('fornecedores', 'editar')]);
  if (forcar !== true && assinatura === fornecedoresAssinatura) return;
  fornecedoresAssinatura = assinatura;
  const ativos = fornecedoresState.filter((f) => f.ativo);
  document.getElementById('fornecedor-resumo').innerHTML = [
    tileResumo({ rotulo: 'Cadastros ativos', valor: String(ativos.length), detalhe: `${fornecedoresState.length - ativos.length} inativos` }),
    tileResumo({ rotulo: 'Fornecedores', valor: String(ativos.filter((f) => f.tipo === 'FORNECEDOR').length), detalhe: 'materiais e produtos' }),
    tileResumo({ rotulo: 'Prestadores PJ', valor: String(ativos.filter((f) => f.tipo === 'PRESTADOR_PJ').length), detalhe: 'serviços contratados' })
  ].join('');
  const registros = fornecedoresState.filter((f) => {
    if (situacao !== 'todos' && (situacao === 'inativos' ? f.ativo : !f.ativo)) return false;
    if (tipo && f.tipo !== tipo) return false;
    if (!busca) return true;
    const texto = `${f.razao_social} ${f.nome_fantasia} ${f.emails.map((e) => e.email).join(' ')} ${f.telefones.map(formatarTelefoneFornecedor).join(' ')}`.toLowerCase();
    return texto.includes(busca) || (buscaDigitos && (f.cnpj.includes(buscaDigitos) || f.telefones.some((t) => `${t.codigo_pais}${t.ddd}${t.numero}`.includes(buscaDigitos))));
  });
  if (!registros.length) {
    lista.innerHTML = `<div class="fin-vazio"><strong>${fornecedoresState.length ? 'Nenhum cadastro com esses filtros.' : 'Nenhum fornecedor cadastrado ainda.'}</strong>${!fornecedoresState.length && pode('fornecedores', 'editar') ? '<span>Use <b>Novo fornecedor</b> para cadastrar quem vende ou presta serviço para a loja.</span>' : ''}</div>`;
    return;
  }
  const editar = pode('fornecedores', 'editar');
  lista.innerHTML = registros.map((f) => `<article class="func-card forn-card ${f.ativo ? '' : 'desligado'}">
    <header>
      ${htmlAvatar(f.nome_fantasia || f.razao_social)}
      <div class="func-nome"><strong>${escapeHtml(f.nome_fantasia || f.razao_social)}</strong><span>${f.nome_fantasia ? escapeHtml(f.razao_social) : `CNPJ ${escapeHtml(formatarCnpj(f.cnpj))}`}</span></div>
      <span class="etq ${f.tipo === 'PRESTADOR_PJ' ? 'etq-pj' : 'etq-clt'}">${f.tipo === 'PRESTADOR_PJ' ? 'PJ' : 'Fornecedor'}</span>
    </header>
    ${f.nome_fantasia ? `<p class="forn-cnpj">CNPJ ${escapeHtml(formatarCnpj(f.cnpj))}</p>` : ''}
    <div class="func-contato">
      ${f.telefones.map((t) => `<span>${escapeHtml(formatarTelefoneFornecedor(t))}${t.codigo_pais === '55' && t.numero.length === 9 ? ` <a href="https://wa.me/${t.codigo_pais}${t.ddd}${t.numero}" target="_blank" rel="noopener" class="func-zap">WhatsApp</a>` : ''}</span>`).join('') || '<span class="mudo">Sem telefone</span>'}
      ${f.emails.map((e) => `<a href="mailto:${escapeHtml(e.email)}">${escapeHtml(e.email)}</a>`).join('')}
    </div>
    <footer>
      <small>${f.ativo ? 'Ativo' : 'Inativo: não aparece nas contas novas'}</small>
      ${editar ? `<div>
        <button type="button" class="btn btn-sm btn-secondary" onclick="alternarFornecedorAtivo(${f.id_fornecedor}, ${!f.ativo})">${f.ativo ? 'Inativar' : 'Reativar'}</button>
        <button type="button" class="fin-icone" onclick="editarFornecedor(${f.id_fornecedor})" title="Editar" aria-label="Editar">${svgIcone('editar')}</button>
        <button type="button" class="fin-icone perigo" onclick="excluirFornecedor(${f.id_fornecedor})" title="Excluir" aria-label="Excluir">${svgIcone('lixo')}</button>
      </div>` : ''}
    </footer>
  </article>`).join('');
}
async function alternarFornecedorAtivo(id, ativo) {
  const resposta = await fetch(`${API_URL}/fornecedores/${id}/status`, { method: 'PUT', headers: getHeadersComUsuario(), body: JSON.stringify({ ativo }) });
  const resultado = await resposta.json();
  if (!resposta.ok) return showToast(resultado.error || 'Não foi possível alterar a situação.', 'error');
  showToast(resultado.mensagem);
  await carregarFornecedores();
}
// Lista de escolha das contas a pagar: só cadastros ativos (mais o já vinculado, mesmo inativo).
function atualizarSelectFornecedorConta(forcarId) {
  const campo = document.getElementById('conta-fornecedor');
  if (!campo) return;
  const atual = forcarId !== undefined ? String(forcarId ?? '') : campo.value;
  const visiveis = fornecedoresState.filter((f) => f.ativo || String(f.id_fornecedor) === atual);
  const grupo = (tipo, titulo) => {
    const itens = visiveis.filter((f) => f.tipo === tipo);
    return itens.length ? `<optgroup label="${titulo}">${itens.map((f) => `<option value="${f.id_fornecedor}">${escapeHtml(nomeDoFornecedor(f))}${f.ativo ? '' : ' (inativo)'}</option>`).join('')}</optgroup>` : '';
  };
  const html = `<option value="">Sem vínculo</option>${grupo('FORNECEDOR', 'Fornecedores')}${grupo('PRESTADOR_PJ', 'Prestadores PJ')}`;
  if (campo.dataset.assinatura !== html) { campo.innerHTML = html; campo.dataset.assinatura = html; }
  campo.value = atual;
  if (campo.value !== atual) campo.value = '';
}
const definirFornecedorDaConta = (id) => atualizarSelectFornecedorConta(id ?? '');
document.getElementById('conta-fornecedor')?.addEventListener('change', (e) => {
  const f = fornecedoresState.find((item) => String(item.id_fornecedor) === e.target.value);
  const descricao = document.getElementById('conta-desc');
  if (f && !descricao.value.trim()) descricao.value = (f.nome_fantasia || f.razao_social).slice(0, 120);
});
async function carregarFornecedores() {
  const res = await fetch(`${API_URL}/fornecedores`);
  if (!res.ok) return; // funcionário recebe 403; a aba nem aparece para ele
  fornecedoresState = await res.json();
  renderizarFornecedores();
  atualizarSelectFornecedorConta();
}
function editarFornecedor(id) {
  const f = fornecedoresState.find((registro) => registro.id_fornecedor === id);
  if (!f) return;
  document.getElementById('fornecedor-id').value = f.id_fornecedor;
  document.getElementById('fornecedor-tipo').value = f.tipo;
  document.getElementById('fornecedor-razao').value = f.razao_social;
  document.getElementById('fornecedor-fantasia').value = f.nome_fantasia;
  document.getElementById('fornecedor-cnpj').value = formatarCnpj(f.cnpj);
  preencherContatosFornecedor(f.telefones, f.emails);
  document.getElementById('titulo-fornecedor').textContent = 'Editar fornecedor';
  document.getElementById('fornecedor-erro').textContent = '';
  abrirDialogo('modal-fornecedor');
}
async function excluirFornecedor(id) {
  const f = fornecedoresState.find((registro) => registro.id_fornecedor === id);
  if (!confirm(`Excluir o fornecedor "${f?.razao_social || id}" com todos os telefones e e-mails dele?`)) return;
  const resposta = await fetch(`${API_URL}/fornecedores/${id}`, { method: 'DELETE', headers: getHeadersComUsuario() });
  const resultado = await resposta.json();
  if (!resposta.ok) return showToast(resultado.error || 'Não foi possível excluir o fornecedor.', 'error');
  showToast(resultado.mensagem || 'Fornecedor excluído.');
  if (document.getElementById('fornecedor-id').value === String(id)) resetarFormularioFornecedor();
  await carregarFornecedores();
}
document.getElementById('form-fornecedor').addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = document.getElementById('fornecedor-id').value;
  const dados = {
    tipo: document.getElementById('fornecedor-tipo').value, razao_social: document.getElementById('fornecedor-razao').value, nome_fantasia: document.getElementById('fornecedor-fantasia').value,
    cnpj: document.getElementById('fornecedor-cnpj').value, ...lerContatosDoFormularioFornecedor()
  };
  const resposta = await fetch(`${API_URL}/fornecedores${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', headers: getHeadersComUsuario(), body: JSON.stringify(dados) });
  const resultado = await resposta.json();
  if (!resposta.ok) { document.getElementById('fornecedor-erro').textContent = resultado.error || 'Não foi possível salvar o fornecedor.'; return; }
  showToast(id ? 'Fornecedor atualizado.' : 'Fornecedor cadastrado.');
  fecharDialogo('modal-fornecedor');
  resetarFormularioFornecedor();
  await carregarFornecedores();
});
document.getElementById('fornecedor-cnpj').addEventListener('input', (event) => { event.target.value = formatarCnpj(event.target.value); });
document.getElementById('fornecedor-add-telefone').addEventListener('click', () => document.getElementById('fornecedor-telefones').appendChild(criarLinhaTelefoneFornecedor()));
document.getElementById('fornecedor-add-email').addEventListener('click', () => document.getElementById('fornecedor-emails').appendChild(criarLinhaEmailFornecedor()));
document.getElementById('cancelar-edicao-fornecedor').addEventListener('click', resetarFormularioFornecedor);
document.getElementById('filtro-fornecedor').addEventListener('input', () => renderizarFornecedores(true));
document.getElementById('filtro-fornecedor-tipo').addEventListener('change', () => renderizarFornecedores(true));
document.getElementById('filtro-fornecedor-situacao').addEventListener('change', () => renderizarFornecedores(true));
document.getElementById('fornecedor-novo').addEventListener('click', () => { resetarFormularioFornecedor(); abrirDialogo('modal-fornecedor'); });
preencherContatosFornecedor();

// ================= DESCONTOS PERCENTUAIS =================
let descontosState = [];
function resetarFormularioDesconto() { document.getElementById('form-desconto').reset(); document.getElementById('desconto-id').value = ''; document.getElementById('desconto-comissao').value = '0'; document.getElementById('titulo-desconto').textContent = 'Novo cupom'; document.getElementById('desconto-erro').textContent = ''; }
let descontosAssinatura = '';
function renderizarDescontos(forcar = false) {
  const busca = document.getElementById('filtro-desconto').value.toLowerCase().trim(), status = document.getElementById('filtro-desconto-status').value, lista = document.getElementById('tabela-descontos');
  const assinatura = JSON.stringify([descontosState, busca, status, pode('descontos', 'editar')]);
  if (forcar !== true && assinatura === descontosAssinatura) return;
  descontosAssinatura = assinatura;
  const registros = descontosState.filter((item) => (!busca || `${item.nome} ${item.codigo}`.toLowerCase().includes(busca)) && (!status || item.status === status));
  const soma = (campo) => registros.reduce((total, item) => total + Number(item[campo] || 0), 0);
  const ativos = descontosState.filter((d) => d.status === 'Ativo').length;
  document.getElementById('cupons-resumo').innerHTML = [
    tileResumo({ rotulo: 'Cupons ativos', valor: String(ativos), detalhe: `${descontosState.length} cadastrados` }),
    tileResumo({ rotulo: 'Vezes usados', valor: String(soma('usos')), detalhe: `${formatarMoeda(soma('desconto_concedido'))} de desconto dado` }),
    tileResumo({ rotulo: 'Faturamento com cupom', valor: formatarMoeda(soma('faturamento')), detalhe: 'vendas pagas com cupom', tom: 'resumo-ok' }),
    tileResumo({ rotulo: 'Ganho dos influencers', valor: formatarMoeda(soma('ganho_influencer')), detalhe: 'comissões a repassar', tom: soma('ganho_influencer') ? 'resumo-alerta' : 'zerado' })
  ].join('');
  if (!registros.length) {
    lista.innerHTML = `<div class="fin-vazio"><strong>${descontosState.length ? 'Nenhum cupom com esses filtros.' : 'Nenhum cupom ainda.'}</strong>${!descontosState.length && pode('descontos', 'editar') ? '<span>Use <b>Novo cupom</b> para criar o código de um influencer.</span>' : ''}</div>`;
    return;
  }
  const editar = pode('descontos', 'editar');
  const hoje = hojeNaLoja();
  lista.innerHTML = registros.map((item) => {
    const ativo = item.status === 'Ativo';
    const vencido = item.validade && item.validade < hoje;
    const futuro = item.data_inicio && item.data_inicio > hoje;
    const periodo = `${item.data_inicio ? `de ${dataBR(item.data_inicio)}` : 'Desde já'}${item.validade ? ` até ${dataBR(item.validade)}` : ', sem data para acabar'}`;
    const situacao = !ativo ? '<span class="etq etq-off">Inativo</span>' : vencido ? '<span class="etq etq-apagar">Vencido</span>' : futuro ? '<span class="etq etq-gerado">Começa depois</span>' : '<span class="etq etq-pago">Ativo</span>';
    return `<article class="func-card cupom-card ${ativo ? '' : 'desligado'}">
      <header>
        <span class="cupom-codigo">${escapeHtml(item.codigo)}</span>
        <div class="func-nome"><strong>${escapeHtml(item.nome)}</strong><span>${Number(item.percentual).toLocaleString('pt-BR')}% de desconto · ${Number(item.comissao_percentual || 0).toLocaleString('pt-BR')}% de comissão</span></div>
        ${situacao}
      </header>
      <dl class="func-numeros cupom-numeros">
        <div><dt>Usos</dt><dd>${Number(item.usos || 0)}</dd></div>
        <div><dt>Faturou</dt><dd>${formatarMoeda(item.faturamento || 0)}</dd></div>
        <div><dt>Desconto dado</dt><dd>${formatarMoeda(item.desconto_concedido || 0)}</dd></div>
        <div><dt>Ganho influencer</dt><dd>${formatarMoeda(item.ganho_influencer || 0)}</dd></div>
      </dl>
      <footer>
        <small>${periodo}</small>
        ${editar ? `<div><button type="button" class="btn btn-sm btn-secondary" onclick="alternarDesconto(${item.id}, '${ativo ? 'Inativo' : 'Ativo'}')">${ativo ? 'Desativar' : 'Ativar'}</button><button type="button" class="fin-icone" onclick="editarDesconto(${item.id})" title="Editar" aria-label="Editar">${svgIcone('editar')}</button></div>` : ''}
      </footer>
    </article>`;
  }).join('');
}
async function carregarDescontos() { const res = await fetch(`${API_URL}/descontos`); if (!res.ok) return; descontosState = await res.json(); renderizarDescontos(); }
function editarDesconto(id) { const item = descontosState.find((registro) => registro.id === id); if (!item) return; document.getElementById('desconto-id').value = item.id; document.getElementById('desconto-nome').value = item.nome; document.getElementById('desconto-codigo').value = item.codigo; document.getElementById('desconto-percentual').value = item.percentual; document.getElementById('desconto-comissao').value = Number(item.comissao_percentual || 0); document.getElementById('desconto-status').value = item.status; document.getElementById('desconto-data-inicio').value = item.data_inicio || ''; document.getElementById('desconto-validade').value = item.validade || ''; document.getElementById('titulo-desconto').textContent = 'Editar cupom'; document.getElementById('desconto-erro').textContent = ''; abrirDialogo('modal-desconto'); }
// Ativar um desconto vencido exige revisar a validade (secao 5). O servidor
// responde 400 com `exige_validade` quando cupom esta fora do prazo.
async function alternarDesconto(id, status) {
  if (status !== 'Ativo') {
    const resposta = await fetch(`${API_URL}/descontos/${id}/status`, { method: 'PUT', headers: getHeadersComUsuario(), body: JSON.stringify({ status }) });
    const resultado = await resposta.json();
    if (!resposta.ok) return showToast(resultado.error || 'Não foi possível desativar o desconto.', 'error');
    showToast('Desconto desativado!');
    return carregarDescontos();
  }
  const resposta = await fetch(`${API_URL}/descontos/${id}/status`, { method: 'PUT', headers: getHeadersComUsuario(), body: JSON.stringify({ status: 'Ativo' }) });
  const resultado = await resposta.json();
  if (resposta.ok) {
    showToast('Desconto ativado!');
    return carregarDescontos();
  }
  if (!resultado.exige_validade) {
    showToast(resultado.error || 'Não foi possível ativar o desconto.', 'error');
    return;
  }
  const minima = dataBR(hojeISO());
  const novaValidade = prompt(`${resultado.error}\n\nInforme a nova data de validade (dd/mm/aaaa). A data mínima aceita é ${minima}.`);
  if (novaValidade === null) return;
  const iso = dataParaISO(novaValidade);
  if (!iso) return showToast('Data inválida. Use o formato dd/mm/aaaa.', 'error');
  const segundaTentativa = await fetch(`${API_URL}/descontos/${id}/status`, { method: 'PUT', headers: getHeadersComUsuario(), body: JSON.stringify({ status: 'Ativo', validade: iso }) });
  const resultadoFinal = await segundaTentativa.json();
  if (!segundaTentativa.ok) return showToast(resultadoFinal.error || 'Não foi possível ativar o desconto.', 'error');
  showToast('Desconto ativado com nova validade.');
  carregarDescontos();
}

// Aceita dd/mm/aaaa e devolve o formato ISO usado pelo servidor.
function dataParaISO(texto) {
  const partes = String(texto || '').trim().split('/');
  if (partes.length !== 3) return '';
  const [dia, mes, ano] = partes.map(Number);
  if (![dia, mes, ano].every(Number.isInteger) || mes < 1 || mes > 12 || dia < 1 || dia > 31) return '';
  const iso = `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  return dataBR(iso) === String(texto).trim() ? iso : '';
}
document.getElementById('form-desconto').addEventListener('submit', async (event) => { event.preventDefault(); const id = document.getElementById('desconto-id').value; const dados = { nome: document.getElementById('desconto-nome').value, codigo: document.getElementById('desconto-codigo').value, percentual: document.getElementById('desconto-percentual').value, comissao_percentual: document.getElementById('desconto-comissao').value, status: document.getElementById('desconto-status').value, data_inicio: document.getElementById('desconto-data-inicio').value, validade: document.getElementById('desconto-validade').value }; const resposta = await fetch(`${API_URL}/descontos${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', headers: getHeadersComUsuario(), body: JSON.stringify(dados) }); const resultado = await resposta.json(); if (!resposta.ok) { document.getElementById('desconto-erro').textContent = resultado.error || 'Não foi possível salvar o cupom.'; return; } showToast(id ? 'Cupom atualizado!' : 'Cupom criado!'); fecharDialogo('modal-desconto'); resetarFormularioDesconto(); carregarDescontos(); });
document.getElementById('cancelar-edicao-desconto').addEventListener('click', resetarFormularioDesconto);
document.getElementById('filtro-desconto').addEventListener('input', () => renderizarDescontos(true));
document.getElementById('filtro-desconto-status').addEventListener('input', () => renderizarDescontos(true));
document.getElementById('desconto-novo').addEventListener('click', () => { resetarFormularioDesconto(); abrirDialogo('modal-desconto'); });
document.getElementById('desconto-codigo').addEventListener('input', (e) => { const pos = e.target.selectionStart; e.target.value = e.target.value.toUpperCase().replace(/\s/g, ''); e.target.setSelectionRange(pos, pos); });


// ================= MOVIMENTAR, HISTÓRICO DE PRODUTOS E LOG (administrador) =================
function abaAberta(id) { return document.getElementById(id)?.classList.contains('active') || false; }
function htmlTipoSaida(tipo) {
  const rotulo = { VENDA: 'Venda', BRINDE: 'Brinde', DOACAO: 'Doação', ENTRADA: 'Entrada', SAIDA: 'Saída' }[tipo] || tipo;
  return `<span class="tipo-saida tipo-saida-${String(tipo).toLowerCase()}">${escapeHtml(rotulo)}</span>`;
}

// ---- Movimentar ----
const TEXTO_MOVIMENTAR = {
  DOACAO: { botao: 'Registrar doação', destino: 'Para quem / para onde (obrigatório)', exemplo: 'Ex.: Instituto Criança Feliz', obrigatorio: true },
  BRINDE: { botao: 'Registrar brinde', destino: 'Para quem (opcional)', exemplo: 'Ex.: Cliente Maria, sorteio do Instagram', obrigatorio: false },
  ENTRADA: { botao: 'Registrar entrada', destino: 'De onde veio (opcional)', exemplo: 'Ex.: Fornecedor, produção', obrigatorio: false },
  SAIDA: { botao: 'Registrar saída', destino: 'Motivo / destino (opcional)', exemplo: 'Ex.: Peça com defeito', obrigatorio: false }
};
function tipoMovimentarAtual() { return document.querySelector('input[name="movimentar-tipo"]:checked')?.value || 'DOACAO'; }
function atualizarFormularioMovimentar() {
  const tipo = tipoMovimentarAtual(), textos = TEXTO_MOVIMENTAR[tipo];
  const botao = document.getElementById('movimentar-enviar');
  if (!botao) return;
  botao.textContent = textos.botao;
  document.getElementById('movimentar-destino-rotulo').textContent = textos.destino;
  const destino = document.getElementById('movimentar-destino');
  destino.placeholder = textos.exemplo;
  destino.required = textos.obrigatorio;
  const produtoId = document.getElementById('movimentar-produto').value;
  const produto = (relatorioProdutosState || []).find((p) => String(p.id) === String(produtoId));
  document.getElementById('movimentar-saldo').textContent = produto ? `Saldo atual: ${produto.estoque} ${Number(produto.estoque) === 1 ? 'peça' : 'peças'}` : '';
  atualizarFotoProduto('movimentar-foto', produtoId);
}
function preencherSelecoesMovimentar(produtos) {
  const selMov = document.getElementById('movimentar-produto');
  if (selMov) {
    const atual = selMov.value;
    const opcoes = produtos.filter((p) => p.ativo).map((p) => `<option value="${p.id}">${escapeHtml(p.nome)} (saldo ${p.estoque})</option>`).join('');
    if (selMov.dataset.opcoes !== opcoes) {
      selMov.innerHTML = opcoes || '<option value="">Nenhum produto ativo</option>';
      selMov.dataset.opcoes = opcoes;
      if ([...selMov.options].some((o) => o.value === atual)) selMov.value = atual;
    }
    atualizarFormularioMovimentar();
  }
  const selHist = document.getElementById('historico-produto');
  if (selHist) {
    const atual = selHist.value;
    const opcoes = '<option value="">Todos os produtos</option>' + produtos.map((p) => `<option value="${p.id}">${escapeHtml(p.nome)}${p.ativo ? '' : ' (inativo)'}</option>`).join('');
    if (selHist.dataset.opcoes !== opcoes) {
      selHist.innerHTML = opcoes;
      selHist.dataset.opcoes = opcoes;
      if ([...selHist.options].some((o) => o.value === atual)) selHist.value = atual;
    }
  }
}
document.querySelectorAll('input[name="movimentar-tipo"]').forEach((radio) => radio.addEventListener('change', atualizarFormularioMovimentar));
document.getElementById('movimentar-produto')?.addEventListener('change', atualizarFormularioMovimentar);
document.getElementById('form-movimentar')?.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const botao = document.getElementById('movimentar-enviar');
  const dados = {
    tipo: tipoMovimentarAtual(),
    produto_id: document.getElementById('movimentar-produto').value,
    quantidade: document.getElementById('movimentar-quantidade').value,
    destino: document.getElementById('movimentar-destino').value,
    observacao: document.getElementById('movimentar-observacao').value,
    evento_id: document.getElementById('movimentar-evento')?.value || ''
  };
  botao.disabled = true;
  try {
    const resposta = await fetch(`${API_URL}/movimentacoes-estoque`, { method: 'POST', headers: getHeadersComUsuario(), body: JSON.stringify(dados) });
    const resultado = await resposta.json();
    if (!resposta.ok) return showToast(resultado.error || 'Não foi possível registrar a movimentação.', 'error');
    showToast(`${resultado.mensagem} Saldo agora: ${resultado.estoque}.`);
    document.getElementById('movimentar-quantidade').value = 1;
    document.getElementById('movimentar-destino').value = '';
    document.getElementById('movimentar-observacao').value = '';
    movimentarEventoTocado = false;
    sugerirEventoMovimentar();
    movimentacoesAssinatura = '';
    movimentarAssinatura = '';
    await carregarTudo();
  } finally { botao.disabled = false; }
});
let movimentarAssinatura = '';
async function carregarMovimentarRecentes() {
  const corpo = document.getElementById('tabela-movimentar-recentes');
  if (!corpo) return;
  try {
    const [doacoes, brindes] = await Promise.all(['DOACAO', 'BRINDE'].map((tipo) => fetch(`${API_URL}/movimentacoes-estoque?limite=30&tipo=${tipo}`, { headers: getHeadersComUsuario() }).then((r) => (r.ok ? r.json() : []))));
    const linhas = [...doacoes, ...brindes.filter((m) => !m.venda_id)].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 30);
    const assinatura = JSON.stringify(linhas);
    if (assinatura === movimentarAssinatura) return;
    movimentarAssinatura = assinatura;
    corpo.innerHTML = linhas.length ? linhas.map((m) => `<tr>
      <td>${escapeHtml(formatarDataHora(m.criado_em))}</td>
      <td>${htmlTipoSaida(m.tipo)}</td>
      <td>${escapeHtml(m.produto_nome)}</td>
      <td>${Math.abs(Number(m.quantidade))}</td>
      <td>${escapeHtml(m.destino || '-')}</td>
      <td>${htmlEventoCelula(m)}</td>
      <td>${escapeHtml(m.usuario_nome || '-')}</td>
    </tr>`).join('') : '<tr><td colspan="7" class="empty-cell">Nenhuma doação ou brinde registrado ainda.</td></tr>';
  } catch (_) { /* a próxima atualização tenta de novo */ }
}

// ---- Histórico de produtos ----
let historicoAssinatura = '';
async function carregarHistoricoProdutos(forcar = false) {
  const corpo = document.getElementById('tabela-historico-produtos');
  if (!corpo || !pode('historico-produtos')) return;
  const params = new URLSearchParams();
  for (const [campo, id] of [['tipo', 'historico-tipo'], ['produto_id', 'historico-produto'], ['inicio', 'historico-inicio'], ['fim', 'historico-fim'], ['evento', 'historico-evento']]) {
    const valor = document.getElementById(id).value;
    if (valor) params.set(campo, valor);
  }
  try {
    const resposta = await fetch(`${API_URL}/historico-produtos?${params}`, { headers: getHeadersComUsuario() });
    if (!resposta.ok) return;
    const dados = await resposta.json();
    const assinatura = JSON.stringify(dados);
    if (!forcar && assinatura === historicoAssinatura) return;
    historicoAssinatura = assinatura;
    document.getElementById('historico-total-venda').textContent = dados.resumo.VENDA.pecas;
    document.getElementById('historico-valor-venda').textContent = formatarMoeda(dados.resumo.VENDA.valor);
    document.getElementById('historico-total-brinde').textContent = dados.resumo.BRINDE.pecas;
    document.getElementById('historico-total-doacao').textContent = dados.resumo.DOACAO.pecas;
    corpo.innerHTML = dados.linhas.length ? dados.linhas.map((l) => {
      const detalhe = [l.destino ? `<strong>${escapeHtml(l.destino)}</strong>` : '', escapeHtml(l.observacao || ''), l.tipo === 'BRINDE' && l.venda_id ? 'Brinde da venda' : '', l.cancelada ? '<span class="badge badge-cancelado">Venda cancelada</span>' : ''].filter(Boolean).join(' · ');
      return `<tr class="${l.cancelada ? 'linha-cancelada' : ''}">
        <td class="sem-quebra">${escapeHtml(formatarDataHora(l.quando))}</td>
        <td>${htmlTipoSaida(l.tipo)}</td>
        <td>${escapeHtml(l.produto_nome)}</td>
        <td>${l.quantidade}</td>
        <td class="sem-quebra">${l.tipo === 'VENDA' ? formatarMoeda(l.valor) : '<span class="texto-gratis">Grátis</span>'}</td>
        <td>${l.venda_id ? `#${l.venda_id}` : '-'}</td>
        <td>${htmlEventoCelula(l)}</td>
        <td>${escapeHtml(l.usuario_nome || '-')}</td>
        <td>${detalhe || '-'}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="9" class="empty-cell">Nada encontrado com estes filtros.</td></tr>';
  } catch (_) { /* a próxima atualização tenta de novo */ }
}
['historico-tipo', 'historico-produto', 'historico-inicio', 'historico-fim', 'historico-evento'].forEach((id) => document.getElementById(id)?.addEventListener('change', () => carregarHistoricoProdutos(true)));

// ---- Log de atividades ----
const ROTULO_LOG = { VENDA: 'Venda', BRINDE: 'Brinde', VENDA_CANCELADA: 'Venda cancelada', VENDA_EXCLUIDA: 'Venda excluída', PRODUTO: 'Produto', MODELO: 'Modelo', VARIACAO: 'Variações', COR: 'Cor', ENTRADA: 'Entrada', SAIDA: 'Saída', DOACAO: 'Doação', PERMISSAO: 'Permissões', CLT: 'Funcionários', USUARIO: 'Usuários' };
let logAssinatura = '';
let logBuscaTimer = null;
async function carregarLogAtividades(forcar = false) {
  const corpo = document.getElementById('tabela-log');
  if (!corpo || !pode('log')) return;
  const selUsuario = document.getElementById('log-usuario');
  if (selUsuario.options.length <= 1) {
    try {
      const usuarios = await (await fetch(`${API_URL}/usuarios`, { headers: getHeadersComUsuario() })).json();
      if (Array.isArray(usuarios)) selUsuario.innerHTML = '<option value="">Todos</option>' + usuarios.map((u) => `<option value="${u.id}">${escapeHtml(u.nome)}</option>`).join('');
    } catch (_) { /* segue sem a lista */ }
  }
  const params = new URLSearchParams();
  for (const [campo, id] of [['acao', 'log-acao'], ['usuario_id', 'log-usuario'], ['inicio', 'log-inicio'], ['fim', 'log-fim'], ['busca', 'log-busca']]) {
    const valor = document.getElementById(id).value.trim();
    if (valor) params.set(campo, valor);
  }
  try {
    const resposta = await fetch(`${API_URL}/log-atividades?${params}`, { headers: getHeadersComUsuario() });
    if (!resposta.ok) return;
    const linhas = await resposta.json();
    const assinatura = JSON.stringify(linhas);
    if (!forcar && assinatura === logAssinatura) return;
    logAssinatura = assinatura;
    document.getElementById('log-contagem').textContent = `${linhas.length} ${linhas.length === 1 ? 'registro' : 'registros'}${linhas.length >= 1000 ? ' (mostrando os 1000 mais recentes; use os filtros)' : ''}.`;
    if (!linhas.length) { corpo.innerHTML = '<div class="fin-vazio"><strong>Nenhuma atividade encontrada.</strong><span>Mude os filtros ou o período.</span></div>'; return; }
    const dias = new Map();
    for (const l of linhas) {
      const quando = new Date(l.criado_em);
      const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(quando);
      if (!dias.has(dia)) dias.set(dia, []);
      dias.get(dia).push({ ...l, hora: quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) });
    }
    const hoje = hojeNaLoja(), ontem = new Date(Date.parse(`${hoje}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
    const tituloDia = (d) => {
      const semana = new Date(`${d}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' });
      return d === hoje ? `Hoje · ${dataBR(d)}` : d === ontem ? `Ontem · ${dataBR(d)}` : `${semana} · ${dataBR(d)}`;
    };
    corpo.innerHTML = [...dias].map(([dia, itens]) => `<section class="log-dia">
      <header><h4>${escapeHtml(tituloDia(dia))}</h4><span>${itens.length} ${itens.length === 1 ? 'atividade' : 'atividades'}</span></header>
      ${itens.map((l) => `<article class="log-item">
        <time>${l.hora}</time>
        <span class="log-acao log-acao-${l.acao.toLowerCase()}">${escapeHtml(ROTULO_LOG[l.acao] || l.acao)}</span>
        <div class="log-texto"><p>${escapeHtml(l.descricao)}</p><small>${escapeHtml(l.usuario_nome || 'Sistema')}</small></div>
        <strong class="log-valor">${l.valor === null ? '' : (l.valor === 0 && ['BRINDE', 'DOACAO'].includes(l.acao) ? '<span class="texto-gratis">Grátis</span>' : formatarMoeda(l.valor))}</strong>
      </article>`).join('')}
    </section>`).join('');
  } catch (_) { /* a próxima atualização tenta de novo */ }
}
['log-acao', 'log-usuario', 'log-inicio', 'log-fim'].forEach((id) => document.getElementById(id)?.addEventListener('change', () => carregarLogAtividades(true)));
document.getElementById('log-busca')?.addEventListener('input', () => { clearTimeout(logBuscaTimer); logBuscaTimer = setTimeout(() => carregarLogAtividades(true), 300); });


// ================= USUÁRIOS: PERMISSÕES POR TELA =================
let usuariosState = [];
let usuariosAssinatura = '';
let catalogoTelas = [];
let permissoesEditando = null; // { usuario, mapa }
const NIVEIS = ['nenhum', 'ver', 'editar'];
const todasNoMaximo = (telas) => Object.fromEntries(telas.map((t) => [t.chave, t.editar ? 'editar' : 'ver']));
const somente = (telas, mapa) => Object.fromEntries(Object.entries(mapa).filter(([chave]) => telas.some((t) => t.chave === chave)));
// Perfis prontos: ponto de partida que o administrador ajusta tela a tela.
const PERFIS_ACESSO = {
  vendedor: { nome: 'Vendedor(a)', permissoes: (t) => somente(t, { dashboard: 'ver', vendas: 'ver', caixa: 'ver', avisos: 'ver', eventos: 'ver', relatorios: 'ver' }) },
  caixa: { nome: 'Caixa / Gerente de loja', permissoes: (t) => somente(t, { dashboard: 'ver', vendas: 'ver', caixa: 'editar', estoque: 'ver', movimentar: 'ver', avisos: 'ver', eventos: 'ver', relatorios: 'ver', 'historico-produtos': 'ver' }) },
  estoquista: { nome: 'Estoquista', permissoes: (t) => somente(t, { dashboard: 'ver', estoque: 'editar', movimentar: 'editar', avisos: 'ver', eventos: 'editar', relatorios: 'ver', 'historico-produtos': 'ver' }) },
  financeiro: { nome: 'Financeiro / RH', permissoes: (t) => somente(t, { dashboard: 'ver', caixa: 'ver', relatorios: 'ver', precos: 'ver', contas: 'editar', recebimentos: 'editar', clt: 'editar', fornecedores: 'editar' }) },
  gerente: { nome: 'Gerente (tudo, menos usuários)', permissoes: (t) => todasNoMaximo(t) },
  nenhum: { nome: 'Nenhum acesso (liberar depois)', permissoes: () => ({}) }
};

async function carregarCatalogoTelas() {
  if (catalogoTelas.length) return catalogoTelas;
  const resposta = await fetch(`${API_URL}/permissoes/telas`, { headers: getHeadersComUsuario() });
  if (resposta.ok) catalogoTelas = (await resposta.json()).telas;
  return catalogoTelas;
}
function resumoAcesso(u) {
  if (u.admin) return '<span class="selo-acesso selo-admin">Administrador · tudo</span>';
  const mapa = u.permissoes || {};
  const telas = Object.keys(mapa).length;
  if (!telas) return '<span class="selo-acesso selo-nenhum">Nenhuma tela</span>';
  const editar = Object.values(mapa).filter((n) => n === 'editar').length;
  return `<span class="selo-acesso">${telas} ${telas === 1 ? 'tela' : 'telas'}${editar ? ` · edita ${editar}` : ' · só ver'}</span>`;
}
function preencherPerfis() {
  const sel = document.getElementById('user-perfil');
  if (!sel || sel.options.length) return;
  sel.innerHTML = Object.entries(PERFIS_ACESSO).map(([chave, perfil]) => `<option value="${chave}">${escapeHtml(perfil.nome)}</option>`).join('');
}

function renderizarGradePermissoes() {
  const { mapa } = permissoesEditando;
  const grupos = [...new Set(catalogoTelas.map((t) => t.grupo))];
  document.getElementById('permissoes-grade').innerHTML = grupos.map((grupo) => {
    const telas = catalogoTelas.filter((t) => t.grupo === grupo);
    return `<fieldset class="permissoes-grupo">
      <legend><span>${escapeHtml(grupo)}</span>
        <span class="permissoes-grupo-acoes">
          <button type="button" class="link-botao-inline" onclick="definirGrupoPermissao('${grupo}', 'nenhum')">Nada</button>
          <button type="button" class="link-botao-inline" onclick="definirGrupoPermissao('${grupo}', 'ver')">Ver tudo</button>
          <button type="button" class="link-botao-inline" onclick="definirGrupoPermissao('${grupo}', 'editar')">Editar tudo</button>
        </span>
      </legend>
      ${telas.map((t) => {
        const atual = mapa[t.chave] || 'nenhum';
        const dica = atual === 'editar' ? t.editar : atual === 'ver' ? (t.ver || 'Só consulta, sem alterar nada') : 'Tela escondida';
        return `<div class="permissao-linha">
          <div class="permissao-nome"><strong>${escapeHtml(t.nome)}</strong><small>${escapeHtml(dica || '')}</small></div>
          <div class="permissao-niveis" role="radiogroup" aria-label="${escapeHtml(t.nome)}">
            ${NIVEIS.map((nivel) => {
              const desabilitado = nivel === 'editar' && !t.editar;
              return `<label class="permissao-nivel nivel-${nivel}${desabilitado ? ' desabilitado' : ''}" title="${desabilitado ? 'Esta tela não tem o que editar' : ''}"><input type="radio" name="perm-${t.chave}" value="${nivel}" ${atual === nivel ? 'checked' : ''} ${desabilitado ? 'disabled' : ''} onchange="definirPermissao('${t.chave}', '${nivel}')"><span>${nivel === 'nenhum' ? 'Sem acesso' : nivel === 'ver' ? (t.chave === 'vendas' ? 'Vender' : 'Ver') : 'Editar'}</span></label>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </fieldset>`;
  }).join('');
}
function definirPermissao(tela, nivel) {
  if (nivel === 'nenhum') delete permissoesEditando.mapa[tela]; else permissoesEditando.mapa[tela] = nivel;
  renderizarGradePermissoes();
}
function definirGrupoPermissao(grupo, nivel) {
  for (const t of catalogoTelas.filter((x) => x.grupo === grupo)) {
    if (nivel === 'nenhum') delete permissoesEditando.mapa[t.chave];
    else permissoesEditando.mapa[t.chave] = nivel === 'editar' && t.editar ? 'editar' : 'ver';
  }
  renderizarGradePermissoes();
}
async function abrirPermissoes(id) {
  const usuario = usuariosState.find((u) => Number(u.id) === Number(id));
  if (!usuario) return;
  await carregarCatalogoTelas();
  permissoesEditando = { usuario, mapa: { ...(usuario.permissoes || {}) } };
  document.getElementById('permissoes-titulo').textContent = `Permissões de ${usuario.nome}`;
  document.getElementById('permissoes-subtitulo').textContent = `Login ${usuario.login} · ${usuario.departamento}. "Ver" mostra a tela sem deixar alterar; "Editar" libera cadastrar, alterar e excluir. Usuários e permissões continuam só com o administrador.`;
  document.getElementById('permissoes-atalhos').innerHTML = '<span>Perfil pronto:</span>' + Object.entries(PERFIS_ACESSO).map(([chave, perfil]) => `<button type="button" class="btn btn-sm btn-secondary" onclick="aplicarPerfilPermissao('${chave}')">${escapeHtml(perfil.nome)}</button>`).join('');
  renderizarGradePermissoes();
  abrirDialogo('modal-permissoes');
}
function aplicarPerfilPermissao(chave) { permissoesEditando.mapa = { ...PERFIS_ACESSO[chave].permissoes(catalogoTelas) }; renderizarGradePermissoes(); }
document.getElementById('permissoes-salvar')?.addEventListener('click', async () => {
  if (!permissoesEditando) return;
  const botao = document.getElementById('permissoes-salvar');
  botao.disabled = true;
  try {
    const completo = Object.fromEntries(catalogoTelas.map((t) => [t.chave, permissoesEditando.mapa[t.chave] || 'nenhum']));
    const resposta = await fetch(`${API_URL}/usuarios/${permissoesEditando.usuario.id}/permissoes`, { method: 'PUT', headers: getHeadersComUsuario(), body: JSON.stringify({ permissoes: completo }) });
    const resultado = await resposta.json();
    if (!resposta.ok) return showToast(resultado.error || 'Não foi possível salvar.', 'error');
    showToast(`Permissões de ${permissoesEditando.usuario.nome} salvas. Valem na hora, mesmo com o usuário logado.`);
    fecharDialogo('modal-permissoes');
    usuariosAssinatura = '';
    await carregarUsuarios();
  } finally { botao.disabled = false; }
});
preencherPerfis();
document.getElementById('usuario-novo').addEventListener('click', () => { document.getElementById('form-usuario').reset(); document.getElementById('usuario-erro').textContent = ''; preencherPerfis(); abrirDialogo('modal-usuario'); });

// ================= FUNCIONÁRIOS, FOLHA DO MÊS E HOLERITES =================
let cltState = { funcionarios: [], totais: null };
let cltTabelas = null;
let funcAssinatura = '';
let folhaState = null;
let folhaAssinatura = '';
let folhaMes = hojeNaLoja().slice(0, 7);
const funcFiltro = { vinculo: '' };
let funSimularTimer = null, holSimularTimer = null;
const moedaClt = (v) => formatarMoeda(v);
const pct = (v) => `${(Number(v) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
const cpfMascarado = (cpf) => (cpf ? `${cpf.slice(0, 3)}.***.***-${cpf.slice(9)}` : '-');
const UFS_BR = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const TIPOS_TELEFONE = ['Celular', 'WhatsApp', 'Residencial', 'Trabalho', 'Recado'];
const TIPOS_EMAIL = ['Pessoal', 'Trabalho'];
const iniciais = (nome) => String(nome || '?').trim().split(/\s+/).filter((p) => p.length > 2 || /^[A-ZÁ-Ú]/.test(p)).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
const tomAvatar = (texto) => [...String(texto)].reduce((t, c) => t + c.charCodeAt(0), 0) % 6;
const htmlAvatar = (nome, classe = '') => `<span class="func-avatar tom-${tomAvatar(nome)} ${classe}" aria-hidden="true">${escapeHtml(iniciais(nome))}</span>`;
const formatarTelefoneFun = (t) => {
  const n = t.numero || '';
  const numero = n.length === 9 ? `${n.slice(0, 5)}-${n.slice(5)}` : n.length === 8 ? `${n.slice(0, 4)}-${n.slice(4)}` : n;
  return `${t.codigo_pais && t.codigo_pais !== '55' ? `+${t.codigo_pais} ` : ''}${t.ddd ? `(${t.ddd}) ` : ''}${numero}`;
};
const linkWhatsApp = (t) => `https://wa.me/${t.codigo_pais || '55'}${t.ddd || ''}${t.numero}`;
const formatarCepFun = (c) => (c && c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : c || '');
const formatarPis = (p) => (p && p.length === 11 ? `${p.slice(0, 3)}.${p.slice(3, 8)}.${p.slice(8, 10)}-${p.slice(10)}` : p || '');
const mesAnoCurto = (c) => `${MESES_ABREV[Number(c.slice(5, 7)) - 1]}/${c.slice(0, 4)}`;
// 5º dia útil do mês seguinte (segunda a sábado; feriados não entram na conta).
function quintoDiaUtil(competencia) {
  const [a, m] = mesSeguinteFin(competencia, 1).split('-').map(Number);
  let uteis = 0;
  for (let d = 1; d <= 31; d += 1) {
    const data = new Date(Date.UTC(a, m - 1, d));
    if (data.getUTCDay() !== 0) uteis += 1;
    if (uteis === 5) return data.toISOString().slice(0, 10);
  }
  return `${a}-${String(m).padStart(2, '0')}-05`;
}

// ---- Valor por extenso (recibo do holerite) ----
function porExtenso(valor) {
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const ate999 = (n) => {
    if (n === 100) return 'cem';
    const c = Math.floor(n / 100), r = n % 100, partes = [];
    if (c) partes.push(centenas[c]);
    if (r < 20) { if (r) partes.push(unidades[r]); } else { partes.push(dezenas[Math.floor(r / 10)] + (r % 10 ? ` e ${unidades[r % 10]}` : '')); }
    return partes.join(' e ');
  };
  const inteiro = Math.floor(valor + 1e-9), cents = Math.round((valor - inteiro) * 100);
  const milhoes = Math.floor(inteiro / 1e6), milhares = Math.floor((inteiro % 1e6) / 1000), resto = inteiro % 1000;
  const grupos = [];
  if (milhoes) grupos.push(`${ate999(milhoes)} ${milhoes === 1 ? 'milhão' : 'milhões'}`);
  if (milhares) grupos.push(milhares === 1 ? 'mil' : `${ate999(milhares)} mil`);
  if (resto) grupos.push(ate999(resto));
  // "mil novecentos e setenta e cinco", mas "mil e cem" e "mil e cinquenta".
  let texto = grupos.length > 1 && resto && (resto < 100 || resto % 100 === 0) ? `${grupos.slice(0, -1).join(' ')} e ${grupos[grupos.length - 1]}` : grupos.join(' ');
  if (inteiro) texto += `${milhoes && !milhares && !resto ? ' de' : ''} ${inteiro === 1 ? 'real' : 'reais'}`;
  if (cents) texto += `${inteiro ? ' e ' : ''}${ate999(cents)} ${cents === 1 ? 'centavo' : 'centavos'}`;
  return texto || 'zero real';
}

// ---- Tabelas do ano (rodapé da folha) ----
function renderizarTabelasClt() {
  const t = cltTabelas;
  if (!t) return;
  document.getElementById('clt-vigencia').textContent = t.vigencia;
  const avisoTabela = document.getElementById('clt-aviso-tabela');
  if (avisoTabela) { avisoTabela.hidden = !t.aviso_tabela; avisoTabela.textContent = t.aviso_tabela ? `${t.aviso_tabela} Atualize em Parâmetros → Folha CLT.` : ''; }
  const faixasInss = t.inss.faixas.map((f, i, todas) => `<tr><td>${i ? `De ${moedaClt(todas[i - 1].ate + 0.01)} a ` : 'Até '}${moedaClt(f.ate)}</td><td>${pct(f.aliquota)}</td></tr>`).join('');
  const faixasIr = t.irrf.faixas.map((f, i, todas) => `<tr><td>${i === 0 ? `Até ${moedaClt(f.ate)}` : f.ate === null || f.ate > 1e12 || !Number.isFinite(f.ate) ? `Acima de ${moedaClt(todas[i - 1].ate)}` : `De ${moedaClt(todas[i - 1].ate + 0.01)} a ${moedaClt(f.ate)}`}</td><td>${f.aliquota ? pct(f.aliquota) : 'Isento'}</td><td>${f.deduzir ? moedaClt(f.deduzir) : '-'}</td></tr>`).join('');
  const r = t.irrf.reducao;
  document.getElementById('clt-tabelas-conteudo').innerHTML = `
    <div class="clt-tabelas-grid">
      <div><p class="clt-secao">INSS do empregado ${t.vigencia} (teto ${moedaClt(t.inss.teto)})</p><table><thead><tr><th>Salário</th><th>Alíquota</th></tr></thead><tbody>${faixasInss}</tbody></table><p class="field-help">Progressivo: cada alíquota vale só para a parte do salário dentro da faixa.</p></div>
      <div><p class="clt-secao">IRRF mensal ${t.vigencia}</p><table><thead><tr><th>Base</th><th>Alíquota</th><th>Deduzir</th></tr></thead><tbody>${faixasIr}</tbody></table>
        <p class="field-help">Base = salário − INSS − ${moedaClt(t.irrf.deducao_dependente)} por dependente − pensão, ou salário − ${moedaClt(t.irrf.desconto_simplificado)} (desconto simplificado); vale o que der menos imposto. Lei 15.270/2025: até ${moedaClt(r.isencao_ate)} o imposto zera; de ${moedaClt(r.isencao_ate + 0.01)} a ${moedaClt(r.transicao_ate)} a redução é ${moedaClt(r.fixo)} − ${String(r.fator).replace('.', ',')} × salário.</p></div>
    </div>
    <p class="field-help">Horas extras: valor da hora = salário ÷ (jornada × 5), com 50% ou 100% a mais. DSR sobre horas extras e comissões = valor ÷ dias úteis × domingos e feriados do mês. Faltas: salário ÷ 30 por dia. Vale-transporte: até ${pct(t.vt_percentual_maximo)} do salário. Alimentação no PAT: até ${pct(t.alimentacao_desconto_maximo)} do benefício. FGTS: ${pct(t.fgts)} por conta da empresa. Salário mínimo ${t.vigencia}: ${moedaClt(t.salario_minimo)}. Férias, 13º e rescisão ficam com a contabilidade.</p>`;
}

async function carregarFolhaClt(forcar = false) {
  if (!document.getElementById('func-lista') || !pode('clt')) return;
  try {
    if (!cltTabelas || forcar) {
      const r = await fetch(`${API_URL}/clt/tabelas`, { headers: getHeadersComUsuario() });
      if (r.ok) { cltTabelas = await r.json(); renderizarTabelasClt(); }
    }
    const [respFunc, respFolha] = await Promise.all([
      fetch(`${API_URL}/funcionarios`, { headers: getHeadersComUsuario() }),
      fetch(`${API_URL}/folha?competencia=${folhaMes}`, { headers: getHeadersComUsuario() })
    ]);
    if (respFunc.ok) cltState = await respFunc.json();
    if (respFolha.ok) folhaState = await respFolha.json();
    renderizarResumoFuncionarios();
    renderizarEquipe(forcar);
    renderizarFolhaMes(forcar);
  } catch (_) { /* tenta de novo no próximo ciclo */ }
}

function renderizarResumoFuncionarios() {
  const t = cltState.totais || {};
  const f = folhaState?.totais || {};
  const nomeMes = MESES_NOME[Number(folhaMes.slice(5, 7)) - 1];
  const html = [
    tileResumo({ rotulo: 'Na equipe', valor: String(t.funcionarios || 0), detalhe: `${t.clt || 0} CLT · ${t.pj || 0} PJ` }),
    tileResumo({ rotulo: 'Custo mensal', valor: moedaClt(t.custo_total), detalhe: 'salários, encargos e benefícios' }),
    tileResumo({ rotulo: 'Líquido a pagar', valor: moedaClt(t.liquido), detalhe: `${moedaClt(t.descontos)} em descontos` }),
    tileResumo({ rotulo: `Holerites · ${nomeMes}`, valor: `${f.gerados || 0}/${f.pessoas || 0}`, detalhe: f.pessoas ? (f.pendentes ? `${f.pendentes} ${f.pendentes === 1 ? 'falta gerar' : 'faltam gerar'}` : 'todos gerados') : 'ninguém na folha', tom: f.pendentes ? 'resumo-alerta' : f.pessoas ? 'resumo-ok' : 'zerado', filtro: 'folha', painel: 'func' })
  ].join('');
  const alvo = document.getElementById('func-resumo');
  if (alvo.dataset.assinatura !== html) { alvo.innerHTML = html; alvo.dataset.assinatura = html; }
}

function renderizarEquipe(forcar = false) {
  const lista = document.getElementById('func-lista');
  const busca = document.getElementById('func-busca').value.trim().toLowerCase();
  const situacao = document.getElementById('func-situacao').value;
  const assinatura = JSON.stringify([cltState.funcionarios, busca, situacao, funcFiltro, pode('clt', 'editar')]);
  if (!forcar && assinatura === funcAssinatura) return;
  funcAssinatura = assinatura;
  document.querySelectorAll('[data-func-vinculo]').forEach((b) => b.classList.toggle('ativa', b.dataset.funcVinculo === funcFiltro.vinculo));
  const digitos = busca.replace(/\D/g, '');
  const pessoas = cltState.funcionarios.filter((f) => (situacao === 'todos' || (situacao === 'ativos' ? f.ativo : !f.ativo))
    && (!funcFiltro.vinculo || f.tipo_vinculo === funcFiltro.vinculo)
    && (!busca || `${f.nome_completo} ${f.cargo} ${f.departamento} ${f.razao_social} ${f.emails.map((e) => e.email).join(' ')}`.toLowerCase().includes(busca)
      || (digitos.length >= 3 && `${f.cpf} ${f.cnpj || ''} ${f.telefones.map((t) => t.ddd + t.numero).join(' ')}`.includes(digitos))));
  if (!pessoas.length) {
    const nenhum = !cltState.funcionarios.length;
    lista.innerHTML = `<div class="fin-vazio"><strong>${nenhum ? 'Nenhum funcionário cadastrado ainda.' : 'Ninguém encontrado com esses filtros.'}</strong>${nenhum && pode('clt', 'editar') ? '<span>Clique em <b>Novo funcionário</b> para cadastrar a primeira pessoa da equipe.</span>' : ''}</div>`;
    return;
  }
  const editar = pode('clt', 'editar');
  lista.innerHTML = pessoas.map((f) => {
    const c = f.calculo;
    const tel = f.telefones[0], email = f.emails[0];
    const zap = f.telefones.find((t) => t.tipo === 'WhatsApp') || f.telefones.find((t) => t.tipo === 'Celular');
    return `<article class="func-card ${f.ativo ? '' : 'desligado'}" data-func-id="${f.id}">
      <header>
        ${htmlAvatar(f.nome_completo)}
        <div class="func-nome"><strong>${escapeHtml(f.nome_completo)}</strong><span>${escapeHtml([f.cargo || 'Sem cargo', f.departamento].filter(Boolean).join(' · '))}</span></div>
        <span class="etq etq-${f.tipo_vinculo.toLowerCase()}">${f.tipo_vinculo}</span>
      </header>
      <dl class="func-numeros">
        <div><dt>${f.tipo_vinculo === 'PJ' ? 'Contrato' : 'Salário'}</dt><dd>${moedaClt(c.bruto)}</dd></div>
        <div><dt>Recebe</dt><dd>${moedaClt(c.liquido)}</dd></div>
        <div><dt>Custo/mês</dt><dd>${moedaClt(c.empresa.custo_total)}</dd></div>
      </dl>
      <div class="func-contato">
        ${tel ? `<span>${escapeHtml(formatarTelefoneFun(tel))}${zap ? ` <a href="${linkWhatsApp(zap)}" target="_blank" rel="noopener" class="func-zap" title="Abrir no WhatsApp">WhatsApp</a>` : ''}</span>` : '<span class="mudo">Sem telefone</span>'}
        ${email ? `<a href="mailto:${escapeHtml(email.email)}">${escapeHtml(email.email)}</a>` : ''}
      </div>
      <footer>
        <small>${f.ativo ? (f.data_admissao ? `Desde ${dataBR(f.data_admissao)}` : 'Sem data de admissão') : `Desligado${f.data_desligamento ? ` em ${dataBR(f.data_desligamento)}` : ''}`}${f.holerites ? ` · ${f.holerites} ${f.holerites === 1 ? 'holerite' : 'holerites'}` : ''}</small>
        <div>
          <button type="button" class="btn btn-sm btn-secondary" data-func-acao="ficha">Ficha</button>
          ${editar && f.ativo ? '<button type="button" class="btn btn-sm btn-secondary" data-func-acao="holerite">Holerite</button>' : ''}
          ${editar ? `<button type="button" class="fin-icone" data-func-acao="editar" title="Editar" aria-label="Editar">${svgIcone('editar')}</button>` : ''}
        </div>
      </footer>
    </article>`;
  }).join('');
}

// ---- Folha do mês ----
function renderizarFolhaMes(forcar = false) {
  const lista = document.getElementById('folha-lista');
  if (!folhaState || !lista) return;
  const assinatura = JSON.stringify([folhaState, pode('clt', 'editar')]);
  if (!forcar && assinatura === folhaAssinatura) return;
  folhaAssinatura = assinatura;
  document.getElementById('folha-mes-rotulo').textContent = folhaState.competencia_rotulo;
  const aviso = document.getElementById('folha-aviso');
  aviso.hidden = !folhaState.aviso_tabela; aviso.textContent = folhaState.aviso_tabela || '';
  const t = folhaState.totais;
  const editar = pode('clt', 'editar');
  document.getElementById('folha-gerar-todos').hidden = !editar || !t.pendentes;
  document.getElementById('folha-gerar-todos').textContent = t.pendentes === 1 ? 'Gerar o holerite que falta' : `Gerar os ${t.pendentes} holerites que faltam`;
  if (!folhaState.linhas.length) {
    lista.innerHTML = `<div class="fin-vazio"><strong>Ninguém na folha de ${escapeHtml(folhaState.competencia_rotulo)}.</strong><span>Entram aqui as pessoas da equipe admitidas até o fim do mês.</span></div>`;
    return;
  }
  lista.innerHTML = `
    <div class="folha-mes-total">
      <div><span>Proventos</span><strong>${moedaClt(t.proventos)}</strong></div>
      <div><span>Descontos</span><strong>${moedaClt(t.descontos)}</strong></div>
      <div class="destaque"><span>Líquido a pagar</span><strong>${moedaClt(t.liquido)}</strong></div>
      <div><span>Custo da empresa</span><strong>${moedaClt(t.custo_total)}</strong></div>
      <div><span>Pagos</span><strong>${t.pagos}/${t.gerados}</strong></div>
    </div>
    ${folhaState.linhas.map((l) => {
      const f = l.funcionario, h = l.holerite;
      let situacao;
      if (l.erro) situacao = `<span class="etq etq-off" title="${escapeHtml(l.erro)}">Sem holerite</span>`;
      else if (!h) situacao = '<span class="etq etq-previa">Prévia</span>';
      else if (h.conta?.status === 'Pago') situacao = `<span class="etq etq-pago">Pago${h.conta.data_pagamento ? ` ${dataBR(h.conta.data_pagamento).slice(0, 5)}` : ''}</span>`;
      else if (h.conta) situacao = `<span class="etq etq-apagar">A pagar até ${dataBR(h.conta.vencimento).slice(0, 5)}</span>`;
      else situacao = '<span class="etq etq-gerado">Gerado</span>';
      const acoes = h
        ? `<button type="button" class="btn btn-sm btn-secondary" data-folha-acao="ver:${h.id}">Ver holerite</button>${editar && h.conta?.status !== 'Pago' ? `<button type="button" class="fin-icone" data-folha-acao="refazer:${f.id}:${h.id}" title="Refazer" aria-label="Refazer">${svgIcone('editar')}</button>` : ''}`
        : (editar && !l.erro ? `<button type="button" class="btn btn-sm btn-accent" data-folha-acao="gerar:${f.id}">Gerar holerite</button>` : '');
      return `<article class="folha-linha ${h ? 'gerado' : ''}">
        ${htmlAvatar(f.nome_completo)}
        <div class="folha-quem"><strong>${escapeHtml(f.nome_completo)}</strong><span><span class="etq etq-${f.tipo_vinculo.toLowerCase()}">${f.tipo_vinculo}</span> ${escapeHtml(f.cargo || '')}</span>${l.erro ? `<small class="fin-obs">${escapeHtml(l.erro)}</small>` : ''}</div>
        <div class="folha-num"><span>Proventos</span><strong>${moedaClt(l.proventos)}</strong></div>
        <div class="folha-num"><span>Descontos</span><strong>${moedaClt(l.descontos)}</strong></div>
        <div class="folha-num liquido"><span>Líquido</span><strong>${moedaClt(l.liquido)}</strong></div>
        <div class="folha-situacao">${situacao}</div>
        <div class="fin-acoes">${acoes}</div>
      </article>`;
    }).join('')}`;
}
async function trocarMesFolha(passo) {
  folhaMes = mesSeguinteFin(folhaMes, passo);
  folhaAssinatura = '';
  document.getElementById('folha-mes-rotulo').textContent = rotuloMesFin(folhaMes);
  await carregarFolhaClt();
}
async function gerarHoleritesPendentes() {
  const pendentes = (folhaState?.linhas || []).filter((l) => !l.holerite && !l.erro);
  if (!pendentes.length) return;
  const venc = quintoDiaUtil(folhaMes);
  if (!confirm(`Gerar ${pendentes.length} ${pendentes.length === 1 ? 'holerite' : 'holerites'} de ${folhaState.competencia_rotulo} sem horas extras, faltas ou comissões?\n\nO líquido de cada um entra em Contas a pagar com vencimento em ${dataBR(venc)}. Depois dá para refazer qualquer um.`)) return;
  const botao = document.getElementById('folha-gerar-todos');
  botao.disabled = true;
  let ok = 0;
  try {
    for (const l of pendentes) {
      const r = await fetch(`${API_URL}/holerites`, { method: 'POST', headers: getHeadersComUsuario(), body: JSON.stringify({ funcionario_id: l.funcionario.id, competencia: folhaMes, variaveis: {}, lancar_conta: true, vencimento: venc }) });
      if (r.ok) ok += 1;
    }
  } finally { botao.disabled = false; }
  showToast(`${ok} ${ok === 1 ? 'holerite gerado' : 'holerites gerados'}.`, ok === pendentes.length ? 'success' : 'error');
  carregarTudo();
  carregarFolhaClt(true);
}

// ---- Formulário do funcionário ----
const vinculoForm = () => document.querySelector('input[name="fun-vinculo"]:checked')?.value || 'CLT';
function aplicarVinculoForm() {
  const pj = vinculoForm() === 'PJ';
  document.querySelectorAll('#form-funcionario .so-clt').forEach((el) => { el.hidden = pj; });
  document.querySelectorAll('#form-funcionario .so-pj').forEach((el) => { el.hidden = !pj; });
  document.getElementById('fun-salario-rotulo').textContent = pj ? 'Valor mensal do contrato (R$)' : 'Salário bruto mensal (R$)';
  document.getElementById('fun-admissao-rotulo').textContent = pj ? 'Início do contrato' : 'Admissão';
  document.querySelector('#form-funcionario .fun-vt').hidden = pj || !document.getElementById('fun-recebe-vt').checked;
  agendarSimulacaoFuncionario();
}
function linhaTelefone(t = {}) {
  const linha = document.createElement('div');
  linha.className = 'fun-contato-linha fun-telefone';
  linha.innerHTML = `<select aria-label="Tipo de telefone" data-campo="tipo">${TIPOS_TELEFONE.map((x) => `<option ${x === (t.tipo || 'Celular') ? 'selected' : ''}>${x}</option>`).join('')}</select>
    <input type="text" inputmode="numeric" maxlength="3" placeholder="DDD" aria-label="DDD" data-campo="ddd" value="${escapeHtml(t.ddd || '')}">
    <input type="text" inputmode="numeric" maxlength="10" placeholder="Número" aria-label="Número" data-campo="numero" value="${escapeHtml(t.numero || '')}">
    <button type="button" class="fin-icone perigo" data-remover-contato title="Remover" aria-label="Remover telefone">${svgIcone('x')}</button>`;
  return linha;
}
function linhaEmail(e = {}) {
  const linha = document.createElement('div');
  linha.className = 'fun-contato-linha fun-email';
  linha.innerHTML = `<select aria-label="Tipo de e-mail" data-campo="tipo">${TIPOS_EMAIL.map((x) => `<option ${x === (e.tipo || 'Pessoal') ? 'selected' : ''}>${x}</option>`).join('')}</select>
    <input type="email" maxlength="254" placeholder="nome@exemplo.com" aria-label="E-mail" data-campo="email" value="${escapeHtml(e.email || '')}">
    <button type="button" class="fin-icone perigo" data-remover-contato title="Remover" aria-label="Remover e-mail">${svgIcone('x')}</button>`;
  return linha;
}
function lerContatosForm() {
  const telefones = [...document.querySelectorAll('#fun-telefones .fun-contato-linha')].map((l) => ({ tipo: l.querySelector('[data-campo="tipo"]').value, codigo_pais: '55', ddd: l.querySelector('[data-campo="ddd"]').value.replace(/\D/g, ''), numero: l.querySelector('[data-campo="numero"]').value.replace(/\D/g, '') })).filter((t) => t.ddd || t.numero);
  const emails = [...document.querySelectorAll('#fun-emails .fun-contato-linha')].map((l) => ({ tipo: l.querySelector('[data-campo="tipo"]').value, email: l.querySelector('[data-campo="email"]').value.trim() })).filter((e) => e.email);
  return { telefones, emails };
}
function dadosFormularioFuncionario() {
  const v = (id) => document.getElementById(id).value;
  const marcado = (id) => document.getElementById(id).checked;
  return {
    tipo_vinculo: vinculoForm(), nome_completo: v('fun-nome'), cpf: v('fun-cpf'), rg: v('fun-rg'), data_nascimento: v('fun-nascimento'), estado_civil: v('fun-estado-civil'),
    ...lerContatosForm(),
    cep: v('fun-cep'), logradouro: v('fun-logradouro'), numero: v('fun-numero'), complemento: v('fun-complemento'), bairro: v('fun-bairro'), cidade: v('fun-cidade'), uf: v('fun-uf'),
    cargo: v('fun-cargo'), departamento: v('fun-departamento'), cbo: v('fun-cbo'), data_admissao: v('fun-admissao'), jornada_semanal: v('fun-jornada') || '44', pis: v('fun-pis'), ctps: v('fun-ctps'),
    cnpj: v('fun-cnpj'), razao_social: v('fun-razao'),
    salario_bruto: v('fun-salario'), dependentes_irrf: v('fun-dependentes') || '0', pensao_alimenticia: v('fun-pensao') || '0',
    recebe_vt: marcado('fun-recebe-vt'), descontar_vt: marcado('fun-descontar-vt'), vt_valor_diario: v('fun-vt-diario') || '0', vt_dias_uteis: v('fun-vt-dias') || '0',
    alimentacao_valor: v('fun-alimentacao') || '0', alimentacao_desconto_percentual: v('fun-alimentacao-pct') || '0', outros_descontos: v('fun-outros') || '0', outros_descontos_descricao: v('fun-outros-desc'),
    pj_irrf_percentual: v('fun-pj-irrf') || '0', pj_csrf_percentual: v('fun-pj-csrf') || '0', pj_iss_percentual: v('fun-pj-iss') || '0',
    banco: v('fun-banco'), agencia: v('fun-agencia'), conta_bancaria: v('fun-conta'), tipo_conta: v('fun-tipo-conta'), chave_pix: v('fun-pix'),
    emergencia_nome: v('fun-emerg-nome'), emergencia_parentesco: v('fun-emerg-parentesco'), emergencia_telefone: v('fun-emerg-telefone'), observacoes: v('fun-obs')
  };
}
function htmlPreviaFuncionario(c, pj) {
  const linha = (rotulo, valor, classe = '') => `<div class="fun-previa-linha ${classe}"><span>${rotulo}</span><strong>${valor}</strong></div>`;
  const d = c.descontos;
  return `<p class="fun-previa-titulo">Estimativa do mês cheio</p>
    ${linha(pj ? 'Valor do contrato' : 'Salário bruto', moedaClt(c.bruto))}
    ${pj ? [d.irrf ? linha('IRRF retido', `− ${moedaClt(d.irrf)}`) : '', d.csrf ? linha('PIS/COFINS/CSLL', `− ${moedaClt(d.csrf)}`) : '', d.iss ? linha('ISS', `− ${moedaClt(d.iss)}`) : ''].join('')
    : [linha('INSS', `− ${moedaClt(d.inss)}`), linha('IRRF', d.irrf ? `− ${moedaClt(d.irrf)}` : 'isento'), d.vale_transporte ? linha('Vale-transporte', `− ${moedaClt(d.vale_transporte)}`) : '', d.alimentacao ? linha('Alimentação', `− ${moedaClt(d.alimentacao)}`) : '', d.pensao_alimenticia ? linha('Pensão', `− ${moedaClt(d.pensao_alimenticia)}`) : '', d.outros ? linha('Outros', `− ${moedaClt(d.outros)}`) : ''].join('')}
    ${linha(pj ? 'Valor a transferir' : 'Líquido a receber', moedaClt(c.liquido), 'forte')}
    <div class="fun-previa-empresa">${linha('Custo para a empresa', moedaClt(c.empresa.custo_total), 'forte')}${pj ? '' : `<small>FGTS ${moedaClt(c.empresa.fgts)}${c.empresa.encargos_patronais ? ` · encargos ${moedaClt(c.empresa.encargos_patronais)}` : ''}</small>`}</div>
    ${(c.avisos || []).length ? `<ul class="clt-avisos">${c.avisos.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>` : ''}`;
}
async function simularFuncionario() {
  const area = document.getElementById('fun-previa');
  const dados = dadosFormularioFuncionario();
  if (!Number(dados.salario_bruto)) { area.innerHTML = `<p class="field-help">Digite o ${dados.tipo_vinculo === 'PJ' ? 'valor do contrato' : 'salário'} para ver quanto a pessoa recebe e quanto custa.</p>`; return; }
  try {
    const resposta = await fetch(`${API_URL}/funcionarios/simular`, { method: 'POST', headers: getHeadersComUsuario(), body: JSON.stringify({ ...dados, telefones: [], emails: [] }) });
    const resultado = await resposta.json();
    area.innerHTML = resposta.ok ? htmlPreviaFuncionario(resultado, dados.tipo_vinculo === 'PJ') : `<p class="field-help clt-erro">${escapeHtml(resultado.error)}</p>`;
  } catch (_) { /* sem conexão: tenta na próxima digitação */ }
}
function agendarSimulacaoFuncionario() { clearTimeout(funSimularTimer); funSimularTimer = setTimeout(simularFuncionario, 250); }

function abrirFormFuncionario(f = null) {
  const form = document.getElementById('form-funcionario');
  form.reset();
  const set = (id, valor) => { document.getElementById(id).value = valor ?? ''; };
  document.getElementById('fun-uf').innerHTML = `<option value="">—</option>${UFS_BR.map((u) => `<option>${u}</option>`).join('')}`;
  const cargos = [...new Set(cltState.funcionarios.map((x) => x.cargo).filter(Boolean))];
  const setores = [...new Set(cltState.funcionarios.map((x) => x.departamento).filter(Boolean))];
  document.getElementById('fun-cargos').innerHTML = [...new Set([...cargos, 'Vendedor(a)', 'Caixa', 'Estoquista', 'Gerente de loja', 'Designer', 'Social media', 'Fotógrafo(a)'])].map((c) => `<option value="${escapeHtml(c)}">`).join('');
  document.getElementById('fun-setores').innerHTML = [...new Set([...setores, 'Loja', 'Estoque', 'Administrativo', 'Marketing', 'Produção'])].map((c) => `<option value="${escapeHtml(c)}">`).join('');
  const telefones = document.getElementById('fun-telefones'), emails = document.getElementById('fun-emails');
  telefones.innerHTML = ''; emails.innerHTML = '';
  set('fun-id', f?.id);
  document.querySelector(`input[name="fun-vinculo"][value="${f?.tipo_vinculo || 'CLT'}"]`).checked = true;
  if (f) {
    set('fun-nome', f.nome_completo); set('fun-cpf', formatarCpfNota(f.cpf)); set('fun-rg', f.rg); set('fun-nascimento', f.data_nascimento); set('fun-estado-civil', f.estado_civil);
    set('fun-cep', formatarCepFun(f.cep)); set('fun-logradouro', f.logradouro); set('fun-numero', f.numero); set('fun-complemento', f.complemento); set('fun-bairro', f.bairro); set('fun-cidade', f.cidade); set('fun-uf', f.uf);
    set('fun-cargo', f.cargo); set('fun-departamento', f.departamento); set('fun-cbo', f.cbo); set('fun-admissao', f.data_admissao); set('fun-jornada', f.jornada_semanal || 44); set('fun-pis', formatarPis(f.pis)); set('fun-ctps', f.ctps);
    set('fun-cnpj', f.cnpj ? formatarCnpj(f.cnpj) : ''); set('fun-razao', f.razao_social);
    set('fun-salario', f.salario_bruto); set('fun-dependentes', f.dependentes_irrf); set('fun-pensao', f.pensao_alimenticia);
    document.getElementById('fun-recebe-vt').checked = f.recebe_vt; document.getElementById('fun-descontar-vt').checked = f.descontar_vt;
    set('fun-vt-diario', f.vt_valor_diario); set('fun-vt-dias', f.vt_dias_uteis); set('fun-alimentacao', f.alimentacao_valor); set('fun-alimentacao-pct', f.alimentacao_desconto_percentual);
    set('fun-outros', f.outros_descontos); set('fun-outros-desc', f.outros_descontos_descricao);
    set('fun-pj-irrf', f.pj_irrf_percentual); set('fun-pj-csrf', f.pj_csrf_percentual); set('fun-pj-iss', f.pj_iss_percentual);
    set('fun-banco', f.banco); set('fun-agencia', f.agencia); set('fun-conta', f.conta_bancaria); set('fun-tipo-conta', f.tipo_conta); set('fun-pix', f.chave_pix);
    set('fun-emerg-nome', f.emergencia_nome); set('fun-emerg-parentesco', f.emergencia_parentesco); set('fun-emerg-telefone', f.emergencia_telefone); set('fun-obs', f.observacoes);
    f.telefones.forEach((t) => telefones.appendChild(linhaTelefone(t)));
    f.emails.forEach((e) => emails.appendChild(linhaEmail(e)));
  }
  if (!telefones.children.length) telefones.appendChild(linhaTelefone());
  if (!emails.children.length) emails.appendChild(linhaEmail());
  document.getElementById('fun-titulo').textContent = f ? `Editar · ${f.nome_completo}` : 'Novo funcionário';
  document.getElementById('fun-salvar').textContent = f ? 'Salvar alterações' : 'Cadastrar funcionário';
  document.getElementById('fun-erro').textContent = '';
  document.getElementById('fun-cep-status').textContent = 'Digite o CEP para preencher a rua.';
  aplicarVinculoForm();
  simularFuncionario();
  abrirDialogo('modal-funcionario');
  document.querySelector('#modal-funcionario .dialogo-caixa').scrollTop = 0;
}
async function buscarCep() {
  const campo = document.getElementById('fun-cep');
  const cep = campo.value.replace(/\D/g, '');
  const status = document.getElementById('fun-cep-status');
  if (cep.length !== 8) return;
  status.textContent = 'Buscando endereço…';
  try {
    const controle = new AbortController();
    const limite = setTimeout(() => controle.abort(), 6000);
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controle.signal });
    clearTimeout(limite);
    const d = await r.json();
    if (d.erro) { status.textContent = 'CEP não encontrado. Preencha à mão.'; return; }
    const set = (id, valor) => { if (valor) document.getElementById(id).value = valor; };
    set('fun-logradouro', d.logradouro); set('fun-bairro', d.bairro); set('fun-cidade', d.localidade); set('fun-uf', d.uf);
    status.textContent = 'Endereço preenchido. Confira o número.';
    document.getElementById('fun-numero').focus();
  } catch (_) { status.textContent = 'Não deu para buscar o CEP agora. Preencha à mão.'; }
}
document.getElementById('form-funcionario').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const erro = document.getElementById('fun-erro');
  const dados = dadosFormularioFuncionario();
  const pj = dados.tipo_vinculo === 'PJ';
  const falta = !dados.nome_completo.trim() ? ['fun-nome', 'Informe o nome completo.']
    : dados.cpf.replace(/\D/g, '').length !== 11 ? ['fun-cpf', 'Informe o CPF com 11 números.']
    : !dados.telefones.length ? [document.querySelector('#fun-telefones [data-campo="numero"]')?.id, 'Cadastre pelo menos um telefone.']
    : pj && dados.cnpj.replace(/\D/g, '').length !== 14 ? ['fun-cnpj', 'Informe o CNPJ do prestador.']
    : !(Number(dados.salario_bruto) > 0) ? ['fun-salario', pj ? 'Informe o valor do contrato.' : 'Informe o salário.'] : null;
  if (falta) {
    erro.textContent = falta[1];
    const alvo = falta[0] ? document.getElementById(falta[0]) : document.querySelector('#fun-telefones input');
    alvo?.focus();
    return;
  }
  const id = document.getElementById('fun-id').value;
  const botao = document.getElementById('fun-salvar');
  botao.disabled = true;
  try {
    const resposta = await fetch(`${API_URL}/funcionarios${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', headers: getHeadersComUsuario(), body: JSON.stringify(dados) });
    const resultado = await resposta.json();
    if (!resposta.ok) { erro.textContent = resultado.error || 'Não foi possível salvar.'; return; }
    fecharDialogo('modal-funcionario');
    showToast(id ? 'Cadastro atualizado.' : `${dados.nome_completo.split(' ')[0]} entrou na equipe.`);
    funcAssinatura = ''; folhaAssinatura = '';
    carregarFolhaClt(true);
  } catch (_) { erro.textContent = 'Sem conexão com o servidor.'; } finally { botao.disabled = false; }
});
document.querySelectorAll('input[name="fun-vinculo"]').forEach((r) => r.addEventListener('change', aplicarVinculoForm));
document.getElementById('fun-recebe-vt').addEventListener('change', () => { document.querySelector('#form-funcionario .fun-vt').hidden = !document.getElementById('fun-recebe-vt').checked || vinculoForm() === 'PJ'; });
document.getElementById('fun-sec-pagamento').addEventListener('input', agendarSimulacaoFuncionario);
document.getElementById('fun-cpf').addEventListener('input', (e) => { e.target.value = mascararDigitandoCpf(e.target.value); });
document.getElementById('fun-cnpj').addEventListener('input', (e) => { e.target.value = formatarCnpj(e.target.value); });
document.getElementById('fun-cep').addEventListener('input', (e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 8); e.target.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; if (d.length === 8) buscarCep(); });
document.getElementById('fun-add-telefone').addEventListener('click', () => { const l = linhaTelefone(); document.getElementById('fun-telefones').appendChild(l); l.querySelector('[data-campo="ddd"]').focus(); });
document.getElementById('fun-add-email').addEventListener('click', () => { const l = linhaEmail(); document.getElementById('fun-emails').appendChild(l); l.querySelector('[data-campo="email"]').focus(); });
document.getElementById('form-funcionario').addEventListener('click', (e) => {
  const remover = e.target.closest('[data-remover-contato]');
  if (remover) { const lista = remover.closest('.fun-contato-lista'); remover.closest('.fun-contato-linha').remove(); if (!lista.children.length) lista.appendChild(lista.id === 'fun-telefones' ? linhaTelefone() : linhaEmail()); }
});
document.querySelectorAll('.fun-atalhos a').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: prefereMenosMovimento() ? 'auto' : 'smooth', block: 'start' });
}));

// ---- Ficha do funcionário ----
async function abrirFicha(id) {
  const f = cltState.funcionarios.find((x) => x.id === id);
  if (!f) return;
  const editar = pode('clt', 'editar');
  const item = (rotulo, valor) => (valor ? `<div><dt>${rotulo}</dt><dd>${valor}</dd></div>` : '');
  const endereco = [f.logradouro && `${escapeHtml(f.logradouro)}${f.numero ? `, ${escapeHtml(f.numero)}` : ''}${f.complemento ? ` · ${escapeHtml(f.complemento)}` : ''}`, f.bairro && escapeHtml(f.bairro), (f.cidade || f.uf) && `${escapeHtml(f.cidade)}${f.uf ? `/${f.uf}` : ''}`, f.cep && `CEP ${formatarCepFun(f.cep)}`].filter(Boolean).join('<br>');
  const c = f.calculo;
  document.getElementById('ficha-conteudo').innerHTML = `
    <div class="ficha-topo">
      ${htmlAvatar(f.nome_completo, 'grande')}
      <div><h3 id="ficha-nome">${escapeHtml(f.nome_completo)}</h3><p>${escapeHtml([f.cargo || 'Sem cargo', f.departamento].filter(Boolean).join(' · '))}</p>
        <div class="fin-tags"><span class="etq etq-${f.tipo_vinculo.toLowerCase()}">${f.tipo_vinculo}</span>${f.ativo ? '<span class="etq etq-pago">Na equipe</span>' : `<span class="etq etq-off">Desligado${f.data_desligamento ? ` em ${dataBR(f.data_desligamento)}` : ''}</span>`}</div></div>
      <button type="button" class="pdv-fechar" data-fechar-dialogo="modal-ficha" aria-label="Fechar">×</button>
    </div>
    <div class="ficha-acoes">
      ${editar ? `<button type="button" class="btn btn-sm btn-secondary" data-ficha-acao="editar">Editar cadastro</button>` : ''}
      ${editar && f.ativo ? `<button type="button" class="btn btn-sm btn-accent" data-ficha-acao="holerite">Holerite de ${MESES_NOME[Number(folhaMes.slice(5, 7)) - 1]}</button>` : ''}
      ${editar ? (f.ativo ? '<button type="button" class="btn btn-sm btn-secondary" data-ficha-acao="desligar">Desligar</button>' : '<button type="button" class="btn btn-sm btn-secondary" data-ficha-acao="reativar">Voltar para a equipe</button>') : ''}
      ${editar && !f.holerites ? '<button type="button" class="btn btn-sm btn-secondary perigo" data-ficha-acao="excluir">Excluir</button>' : ''}
    </div>
    <form class="ficha-desligar" id="ficha-desligar" hidden><label for="ficha-desligar-data">Último dia de trabalho</label><input type="date" id="ficha-desligar-data" value="${hojeNaLoja()}"><button type="submit" class="btn btn-sm btn-accent">Confirmar desligamento</button><small class="field-help">O cadastro e os holerites ficam guardados.</small></form>
    <div class="ficha-grade">
      <section><h4>Pessoal</h4><dl>${item('CPF', formatarCpfNota(f.cpf))}${item('RG', escapeHtml(f.rg))}${item('Nascimento', f.data_nascimento ? dataBR(f.data_nascimento) : '')}${item('Estado civil', escapeHtml(f.estado_civil))}</dl></section>
      <section><h4>Contato</h4><dl>
        ${f.telefones.map((t) => item(t.tipo, `${escapeHtml(formatarTelefoneFun(t))}${['WhatsApp', 'Celular'].includes(t.tipo) ? ` <a href="${linkWhatsApp(t)}" target="_blank" rel="noopener" class="func-zap">WhatsApp</a>` : ''}`)).join('') || '<p class="field-help">Sem telefone.</p>'}
        ${f.emails.map((e) => item(`E-mail ${e.tipo.toLowerCase()}`, `<a href="mailto:${escapeHtml(e.email)}">${escapeHtml(e.email)}</a>`)).join('')}
      </dl></section>
      <section><h4>Endereço</h4>${endereco ? `<p>${endereco}</p>` : '<p class="field-help">Não informado.</p>'}</section>
      <section><h4>Trabalho</h4><dl>${item(f.tipo_vinculo === 'PJ' ? 'Início do contrato' : 'Admissão', f.data_admissao ? dataBR(f.data_admissao) : '')}${f.tipo_vinculo === 'PJ' ? item('CNPJ', f.cnpj ? formatarCnpj(f.cnpj) : '') + item('Razão social', escapeHtml(f.razao_social)) : item('Jornada', `${f.jornada_semanal}h por semana`) + item('CBO', escapeHtml(f.cbo)) + item('PIS', formatarPis(f.pis)) + item('Carteira', escapeHtml(f.ctps))}</dl></section>
      <section><h4>Remuneração</h4><dl>${item(f.tipo_vinculo === 'PJ' ? 'Contrato' : 'Salário', moedaClt(c.bruto))}${item('Recebe no mês', moedaClt(c.liquido))}${item('Custo para a empresa', moedaClt(c.empresa.custo_total))}${f.tipo_vinculo === 'CLT' ? item('Dependentes no IR', String(f.dependentes_irrf)) + (f.recebe_vt ? item('Vale-transporte', `${moedaClt(f.vt_valor_diario)}/dia × ${f.vt_dias_uteis}`) : '') + (f.alimentacao_valor ? item('Alimentação', moedaClt(f.alimentacao_valor)) : '') : ''}</dl></section>
      <section><h4>Pagamento</h4><dl>${item('Banco', escapeHtml(f.banco))}${item('Agência / conta', [f.agencia, f.conta_bancaria].filter(Boolean).map(escapeHtml).join(' / '))}${item('Tipo', escapeHtml(f.tipo_conta))}${item('Pix', escapeHtml(f.chave_pix))}</dl>${!f.banco && !f.chave_pix ? '<p class="field-help">Não informado.</p>' : ''}</section>
      ${f.emergencia_nome || f.observacoes ? `<section class="ficha-largo"><h4>Emergência e observações</h4><dl>${item('Emergência', `${escapeHtml(f.emergencia_nome)}${f.emergencia_parentesco ? ` (${escapeHtml(f.emergencia_parentesco)})` : ''}${f.emergencia_telefone ? ` · ${escapeHtml(f.emergencia_telefone)}` : ''}`)}</dl>${f.observacoes ? `<p class="ficha-obs">${escapeHtml(f.observacoes)}</p>` : ''}</section>` : ''}
      <section class="ficha-largo"><h4>Holerites</h4><div id="ficha-holerites"><p class="field-help">Carregando…</p></div></section>
    </div>`;
  document.getElementById('ficha-conteudo').dataset.funcId = f.id;
  abrirDialogo('modal-ficha');
  try {
    const r = await fetch(`${API_URL}/holerites?funcionario_id=${f.id}`, { headers: getHeadersComUsuario() });
    const lista = r.ok ? await r.json() : [];
    document.querySelector('#ficha-holerites').innerHTML = lista.length
      ? `<div class="ficha-hol-lista">${lista.map((h) => `<button type="button" class="ficha-hol" data-ficha-holerite="${h.id}"><span>${escapeHtml(rotuloMesFin(h.competencia))}</span><strong>${moedaClt(h.liquido)}</strong><small>${h.conta?.status === 'Pago' ? 'Pago' : h.conta ? `A pagar até ${dataBR(h.conta.vencimento)}` : 'Gerado'}</small></button>`).join('')}</div>`
      : '<p class="field-help">Nenhum holerite gerado ainda.</p>';
  } catch (_) { /* fica o "Carregando" */ }
}
async function alterarSituacaoFuncionario(id, ativo, data = '') {
  const resposta = await fetch(`${API_URL}/funcionarios/${id}/status`, { method: 'PUT', headers: getHeadersComUsuario(), body: JSON.stringify({ ativo, data_desligamento: data }) });
  const resultado = await resposta.json();
  if (!resposta.ok) return showToast(resultado.error, 'error');
  showToast(resultado.mensagem);
  fecharDialogo('modal-ficha');
  carregarFolhaClt(true);
}
document.getElementById('modal-ficha').addEventListener('click', async (e) => {
  const id = Number(document.getElementById('ficha-conteudo').dataset.funcId);
  const f = cltState.funcionarios.find((x) => x.id === id);
  if (e.target.closest('[data-fechar-dialogo]')) { fecharDialogo('modal-ficha'); return; }
  const hol = e.target.closest('[data-ficha-holerite]');
  if (hol) { abrirHoleriteVer(Number(hol.dataset.fichaHolerite)); return; }
  const acao = e.target.closest('[data-ficha-acao]')?.dataset.fichaAcao;
  if (!acao || !f) return;
  if (acao === 'editar') { fecharDialogo('modal-ficha'); abrirFormFuncionario(f); }
  if (acao === 'holerite') { fecharDialogo('modal-ficha'); abrirGerarHolerite(f.id, folhaMes); }
  if (acao === 'desligar') { const form = document.querySelector('#ficha-desligar'); form.hidden = !form.hidden; if (!form.hidden) document.querySelector('#ficha-desligar-data').focus(); }
  if (acao === 'reativar') alterarSituacaoFuncionario(f.id, true);
  if (acao === 'excluir') {
    if (!confirm(`Excluir ${f.nome_completo} de vez? Quem saiu da empresa deve ser "desligado", para guardar o histórico.`)) return;
    const resposta = await fetch(`${API_URL}/funcionarios/${f.id}`, { method: 'DELETE', headers: getHeadersComUsuario() });
    const resultado = await resposta.json();
    if (!resposta.ok) return showToast(resultado.error, 'error');
    showToast(resultado.mensagem); fecharDialogo('modal-ficha'); carregarFolhaClt(true);
  }
});
document.getElementById('modal-ficha').addEventListener('submit', (e) => {
  if (e.target.id !== 'ficha-desligar') return;
  e.preventDefault();
  const id = Number(document.getElementById('ficha-conteudo').dataset.funcId);
  alterarSituacaoFuncionario(id, false, document.querySelector('#ficha-desligar-data').value);
});

// ---- Gerar holerite (variáveis do mês e prévia) ----
const CAMPOS_HOLERITE = { 'hol-he50': 'horas_extras_50', 'hol-he100': 'horas_extras_100', 'hol-feriados': 'feriados', 'hol-comissoes': 'comissoes', 'hol-bonus': 'bonus', 'hol-reembolsos': 'reembolsos', 'hol-outros-prov': 'outros_proventos', 'hol-outros-prov-desc': 'outros_proventos_descricao', 'hol-faltas': 'faltas_dias', 'hol-atrasos': 'atrasos_horas', 'hol-adiantamento': 'adiantamento', 'hol-outros-desc': 'outros_descontos_mes', 'hol-outros-desc-desc': 'outros_descontos_mes_descricao', 'hol-nf': 'nota_fiscal' };
function variaveisDoFormulario() {
  const v = {};
  for (const [id, campo] of Object.entries(CAMPOS_HOLERITE)) {
    const el = document.getElementById(id);
    if (el.closest('[hidden]')) continue;
    v[campo] = el.type === 'number' ? (el.value === '' ? 0 : Number(el.value)) : el.value.trim();
  }
  return v;
}
async function abrirGerarHolerite(funcionarioId, competencia, holeriteId = null) {
  const f = cltState.funcionarios.find((x) => x.id === funcionarioId);
  if (!f) return;
  const form = document.getElementById('form-holerite');
  form.reset();
  document.getElementById('hol-funcionario-id').value = f.id;
  document.getElementById('hol-competencia').value = competencia;
  const pj = f.tipo_vinculo === 'PJ';
  form.querySelectorAll('.so-clt').forEach((el) => { el.hidden = pj; });
  form.querySelectorAll('.so-pj').forEach((el) => { el.hidden = !pj; });
  document.getElementById('hol-titulo').textContent = `${pj ? 'Recibo' : 'Holerite'} · ${f.nome_completo.split(' ')[0]}`;
  document.getElementById('hol-subtitulo').textContent = `${rotuloMesFin(competencia)} · ${f.tipo_vinculo}${f.cargo ? ` · ${f.cargo}` : ''}`;
  document.getElementById('hol-gerar').textContent = holeriteId ? 'Salvar holerite' : 'Gerar holerite';
  document.getElementById('hol-erro').textContent = '';
  const venc = quintoDiaUtil(competencia);
  document.getElementById('hol-vencimento').value = venc;
  document.getElementById('hol-vencimento-dica').textContent = pj ? 'Data combinada com o prestador.' : `5º dia útil: ${dataBR(venc)} (sem contar feriados).`;
  document.getElementById('hol-lancar').checked = true;
  if (holeriteId) {
    try {
      const r = await fetch(`${API_URL}/holerites/${holeriteId}`, { headers: getHeadersComUsuario() });
      if (r.ok) {
        const h = await r.json();
        for (const [id, campo] of Object.entries(CAMPOS_HOLERITE)) { const valor = h.calculo.variaveis?.[campo]; document.getElementById(id).value = valor === 0 || valor === undefined ? '' : valor; }
        document.getElementById('hol-lancar').checked = Boolean(h.conta);
        if (h.conta?.vencimento) document.getElementById('hol-vencimento').value = h.conta.vencimento;
      }
    } catch (_) { /* abre vazio */ }
  }
  document.getElementById('hol-vencimento-grupo').hidden = !document.getElementById('hol-lancar').checked;
  abrirDialogo('modal-holerite');
  simularHolerite();
}
function htmlPreviaHolerite(c) {
  const itens = c.itens.map((i) => `<tr><td>${escapeHtml(i.descricao)}${i.referencia ? `<small>${escapeHtml(i.referencia)}</small>` : ''}</td><td class="num">${i.provento ? moedaClt(i.provento) : ''}</td><td class="num">${i.desconto ? moedaClt(i.desconto) : ''}</td></tr>`).join('');
  return `<p class="fun-previa-titulo">Prévia</p>
    <table class="hol-previa-tabela"><thead><tr><th>Item</th><th class="num">Ganhos</th><th class="num">Descontos</th></tr></thead><tbody>${itens}</tbody>
    <tfoot><tr><td>Totais</td><td class="num">${moedaClt(c.totais.proventos)}</td><td class="num">${moedaClt(c.totais.descontos)}</td></tr></tfoot></table>
    <div class="hol-previa-liquido"><span>${c.tipo_vinculo === 'PJ' ? 'A transferir' : 'Líquido'}</span><strong>${moedaClt(c.totais.liquido)}</strong></div>
    <small class="field-help">Custo para a empresa: ${moedaClt(c.empresa.custo_total)}${c.empresa.fgts ? ` (FGTS ${moedaClt(c.empresa.fgts)})` : ''}</small>
    ${c.avisos.length ? `<ul class="clt-avisos">${c.avisos.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>` : ''}`;
}
async function simularHolerite() {
  const area = document.getElementById('hol-previa');
  const corpo = { funcionario_id: Number(document.getElementById('hol-funcionario-id').value), competencia: document.getElementById('hol-competencia').value, variaveis: variaveisDoFormulario() };
  try {
    const r = await fetch(`${API_URL}/holerites/simular`, { method: 'POST', headers: getHeadersComUsuario(), body: JSON.stringify(corpo) });
    const c = await r.json();
    area.innerHTML = r.ok ? htmlPreviaHolerite(c) : `<p class="field-help clt-erro">${escapeHtml(c.error)}</p>`;
  } catch (_) { /* tenta de novo na próxima digitação */ }
}
document.getElementById('form-holerite').addEventListener('input', (e) => {
  if (e.target.id === 'hol-lancar') document.getElementById('hol-vencimento-grupo').hidden = !e.target.checked;
  if (e.target.id === 'hol-vencimento' || e.target.id === 'hol-lancar') return;
  clearTimeout(holSimularTimer); holSimularTimer = setTimeout(simularHolerite, 250);
});
document.getElementById('form-holerite').addEventListener('submit', async (e) => {
  e.preventDefault();
  const erro = document.getElementById('hol-erro');
  const lancar = document.getElementById('hol-lancar').checked;
  const vencimento = document.getElementById('hol-vencimento').value;
  if (lancar && !vencimento) { erro.textContent = 'Escolha até quando pagar.'; return; }
  const corpo = { funcionario_id: Number(document.getElementById('hol-funcionario-id').value), competencia: document.getElementById('hol-competencia').value, variaveis: variaveisDoFormulario(), lancar_conta: lancar, vencimento };
  const botao = document.getElementById('hol-gerar');
  botao.disabled = true;
  try {
    const r = await fetch(`${API_URL}/holerites`, { method: 'POST', headers: getHeadersComUsuario(), body: JSON.stringify(corpo) });
    const resultado = await r.json();
    if (!r.ok) { erro.textContent = resultado.error || 'Não foi possível gerar.'; return; }
    fecharDialogo('modal-holerite');
    showToast(resultado.mensagem);
    folhaAssinatura = ''; funcAssinatura = '';
    carregarFolhaClt(true);
    carregarTudo();
    abrirHoleriteVer(resultado.id);
  } catch (_) { erro.textContent = 'Sem conexão com o servidor.'; } finally { botao.disabled = false; }
});

// ---- Holerite pronto (folha A4) ----
let holeriteAberto = null;
function htmlFolhaHolerite(h) {
  const c = h.calculo, f = h.funcionario, e = h.empresa || {};
  const pj = h.tipo_vinculo === 'PJ';
  const nomeEmpresa = e.razao_social || e.nome_fantasia || 'Difeecult';
  const enderecoEmpresa = [e.endereco, [e.cidade, e.uf].filter(Boolean).join('/')].filter(Boolean).join(' · ');
  const celula = (rotulo, valor, classe = '') => `<div class="hol-campo ${classe}"><span>${rotulo}</span><strong>${valor || '—'}</strong></div>`;
  const ident = pj
    ? [celula('Código', String(f.id).padStart(4, '0')), celula('Prestador (empresa)', escapeHtml(f.razao_social || f.nome_completo), 'largo'), celula('CNPJ', f.cnpj ? formatarCnpj(f.cnpj) : ''),
       celula('Responsável', escapeHtml(f.nome_completo), 'largo'), celula('CPF', formatarCpfNota(f.cpf)), celula('Serviço', escapeHtml(f.cargo)),
       celula('Nota fiscal', escapeHtml(c.variaveis?.nota_fiscal || '')), celula('Início do contrato', f.data_admissao ? dataBR(f.data_admissao) : ''), celula('Valor mensal do contrato', moedaClt(f.salario_bruto), 'largo')]
    : [celula('Código', String(f.id).padStart(4, '0')), celula('Nome do funcionário', escapeHtml(f.nome_completo), 'largo'), celula('CBO', escapeHtml(f.cbo)),
       celula('Cargo', escapeHtml(f.cargo)), celula('Setor', escapeHtml(f.departamento)), celula('Admissão', f.data_admissao ? dataBR(f.data_admissao) : ''), celula('CPF', formatarCpfNota(f.cpf)),
       celula('PIS', formatarPis(f.pis)), celula('Salário contratual', moedaClt(f.salario_bruto)), celula('Jornada', f.jornada_semanal ? `${f.jornada_semanal}h semanais` : ''), celula('Dependentes IR', String(f.dependentes_irrf ?? 0))];
  const linhasMin = 12;
  const vazias = Math.max(0, linhasMin - c.itens.length);
  const itens = c.itens.map((i) => `<tr><td class="cod">${i.codigo}</td><td>${escapeHtml(i.descricao)}</td><td class="ref">${escapeHtml(i.referencia || '')}</td><td class="num">${i.provento ? moedaClt(i.provento).replace('R$ ', '') : ''}</td><td class="num">${i.desconto ? moedaClt(i.desconto).replace('R$ ', '') : ''}</td></tr>`).join('')
    + '<tr class="vazia"><td></td><td></td><td></td><td></td><td></td></tr>'.repeat(vazias);
  const b = c.bases;
  const bases = pj
    ? [['Valor do contrato', moedaClt(b.valor_contrato)], ['Base das retenções', moedaClt(b.base_retencoes)], ['IRRF retido', moedaClt(b.irrf)], ['PIS/COFINS/CSLL', moedaClt(b.csrf)], ['ISS retido', moedaClt(b.iss)], ['Total retido', moedaClt(b.retencoes)]]
    : [['Salário base', moedaClt(b.salario_base)], ['Sal. contr. INSS', moedaClt(b.base_inss)], ['Base cálc. FGTS', moedaClt(b.base_fgts)], ['FGTS do mês', moedaClt(b.fgts_mes)], ['Base cálc. IRRF', moedaClt(b.base_irrf)], ['Faixa IRRF', escapeHtml(b.faixa_irrf)]];
  const pagamento = [f.banco && `Banco ${escapeHtml(f.banco)}`, f.agencia && `ag. ${escapeHtml(f.agencia)}`, f.conta_bancaria && `conta ${escapeHtml(f.conta_bancaria)}${f.tipo_conta ? ` (${escapeHtml(f.tipo_conta.toLowerCase())})` : ''}`, f.chave_pix && `Pix ${escapeHtml(f.chave_pix)}`].filter(Boolean).join(' · ');
  return `
    <header class="hol-cab">
      <div class="hol-empresa">
        <img src="logo-difeecult.svg" alt="" class="folha-logo">
        <div><strong>${escapeHtml(nomeEmpresa)}</strong>${e.cnpj ? `<span>CNPJ ${formatarCnpj(e.cnpj)}</span>` : '<span class="hol-falta">CNPJ não cadastrado (Parâmetros → Empresa)</span>'}${enderecoEmpresa ? `<span>${escapeHtml(enderecoEmpresa)}</span>` : ''}</div>
      </div>
      <div class="hol-doc">
        <span>${pj ? 'Recibo de pagamento · serviços' : 'Demonstrativo de pagamento de salário'}</span>
        <strong>${escapeHtml(c.competencia_rotulo.replace(/^./, (l) => l.toUpperCase()))}</strong>
        <small>${pj ? 'Prestação de serviços (PJ)' : 'Folha mensal'} · nº ${String(h.id).padStart(6, '0')}</small>
      </div>
    </header>
    <div class="folha-quadriculado"></div>
    <div class="hol-ident">${ident.join('')}</div>
    <table class="hol-itens">
      <thead><tr><th class="cod">Cód.</th><th>Descrição</th><th class="ref">Referência</th><th class="num">${pj ? 'Valores' : 'Vencimentos'}</th><th class="num">Descontos</th></tr></thead>
      <tbody>${itens}</tbody>
      <tfoot><tr><td colspan="3" class="hol-total-rotulo">Totais</td><td class="num">${moedaClt(c.totais.proventos).replace('R$ ', '')}</td><td class="num">${moedaClt(c.totais.descontos).replace('R$ ', '')}</td></tr></tfoot>
    </table>
    <div class="hol-liquido"><div><span>${pj ? 'Valor líquido a transferir' : 'Valor líquido'}</span><small>${escapeHtml(porExtenso(c.totais.liquido))}</small></div><strong>${moedaClt(c.totais.liquido)}</strong></div>
    <div class="hol-bases">${bases.map(([r, v]) => `<div><span>${r}</span><strong>${v}</strong></div>`).join('')}</div>
    ${pagamento ? `<p class="hol-pagamento"><b>Crédito em:</b> ${pagamento}</p>` : ''}
    ${(c.avisos || []).length ? `<p class="hol-nota">${c.avisos.map(escapeHtml).join(' ')}</p>` : ''}
    <div class="hol-recibo">
      <p>${pj ? `Recebi de ${escapeHtml(nomeEmpresa)} a importância líquida acima, referente aos serviços prestados em ${escapeHtml(c.competencia_rotulo)}.` : 'Declaro ter recebido a importância líquida discriminada neste recibo.'}</p>
      <div class="hol-assinatura"><div><b></b><span>Data</span></div><div class="largo"><b></b><span>${escapeHtml(f.nome_completo)}</span></div></div>
    </div>
    <footer class="folha-rodape"><span>Gerado em ${h.gerado_em ? new Date(h.gerado_em).toLocaleDateString('pt-BR') : dataBR(hojeNaLoja())}${h.gerado_por_nome ? ` por ${escapeHtml(h.gerado_por_nome)}` : ''}</span><span>Tabelas de ${c.vigencia} · Difeecult</span></footer>`;
}
async function abrirHoleriteVer(id) {
  try {
    const r = await fetch(`${API_URL}/holerites/${id}`, { headers: getHeadersComUsuario() });
    const h = await r.json();
    if (!r.ok) return showToast(h.error || 'Holerite não encontrado.', 'error');
    holeriteAberto = h;
    document.getElementById('holver-titulo').textContent = `${h.funcionario.nome_completo} · ${rotuloMesFin(h.competencia)}`;
    document.getElementById('holver-folha').innerHTML = htmlFolhaHolerite(h);
    const pago = h.conta?.status === 'Pago';
    document.getElementById('holver-refazer').hidden = !pode('clt', 'editar') || pago;
    document.getElementById('holver-excluir').hidden = !pode('clt', 'editar') || pago;
    fecharDialogo('modal-ficha');
    abrirDialogo('modal-holerite-ver');
  } catch (_) { showToast('Sem conexão com o servidor.', 'error'); }
}
function imprimirHolerite() {
  if (!holeriteAberto) return;
  let area = document.getElementById('area-impressao');
  if (!area) { area = document.createElement('div'); area.id = 'area-impressao'; document.body.appendChild(area); }
  area.innerHTML = `<article class="folha folha-impressa holerite">${document.getElementById('holver-folha').innerHTML}</article>`;
  document.body.dataset.tituloAntes = document.title;
  const h = holeriteAberto;
  document.title = `${h.tipo_vinculo === 'PJ' ? 'Recibo' : 'Holerite'} ${h.competencia} - ${h.funcionario.nome_completo}`;
  document.body.classList.add('imprimindo-folha');
  window.print();
}
document.getElementById('holver-imprimir').addEventListener('click', imprimirHolerite);
document.getElementById('holver-refazer').addEventListener('click', () => {
  if (!holeriteAberto) return;
  fecharDialogo('modal-holerite-ver');
  abrirGerarHolerite(holeriteAberto.funcionario_id, holeriteAberto.competencia, holeriteAberto.id);
});
document.getElementById('holver-excluir').addEventListener('click', async () => {
  const h = holeriteAberto;
  if (!h || !confirm(`Excluir o holerite de ${rotuloMesFin(h.competencia)} de ${h.funcionario.nome_completo}?${h.conta ? '\n\nA conta a pagar dele também sai.' : ''}`)) return;
  const r = await fetch(`${API_URL}/holerites/${h.id}`, { method: 'DELETE', headers: getHeadersComUsuario() });
  const resultado = await r.json();
  if (!r.ok) return showToast(resultado.error, 'error');
  showToast(resultado.mensagem);
  fecharDialogo('modal-holerite-ver');
  folhaAssinatura = '';
  carregarFolhaClt(true); carregarTudo();
});

// ---- Dados da empresa (Parâmetros → Empresa) ----
async function carregarEmpresa() {
  const uf = document.getElementById('empresa-uf');
  if (uf.options.length < 2) uf.innerHTML = `<option value="">—</option>${UFS_BR.map((u) => `<option>${u}</option>`).join('')}`;
  try {
    const r = await fetch(`${API_URL}/empresa`, { headers: getHeadersComUsuario() });
    if (!r.ok) return;
    const e = await r.json();
    const set = (id, v) => { document.getElementById(id).value = v || ''; };
    set('empresa-razao', e.razao_social); set('empresa-cnpj', e.cnpj ? formatarCnpj(e.cnpj) : ''); set('empresa-fantasia', e.nome_fantasia); set('empresa-endereco', e.endereco);
    set('empresa-cidade', e.cidade); set('empresa-uf', e.uf); set('empresa-telefone', e.telefone); set('empresa-email', e.email);
    document.querySelectorAll('#form-empresa input, #form-empresa select').forEach((el) => { el.disabled = !pode('parametros', 'editar'); });
  } catch (_) { /* tenta ao abrir de novo */ }
}
document.getElementById('empresa-cnpj').addEventListener('input', (e) => { e.target.value = formatarCnpj(e.target.value); });
document.getElementById('form-empresa').addEventListener('submit', async (e) => {
  e.preventDefault();
  const v = (id) => document.getElementById(id).value.trim();
  const erro = document.getElementById('empresa-erro');
  const corpo = { razao_social: v('empresa-razao'), cnpj: v('empresa-cnpj'), nome_fantasia: v('empresa-fantasia'), endereco: v('empresa-endereco'), cidade: v('empresa-cidade'), uf: v('empresa-uf'), telefone: v('empresa-telefone'), email: v('empresa-email') };
  const botao = document.getElementById('empresa-salvar');
  botao.disabled = true;
  try {
    const r = await fetch(`${API_URL}/empresa`, { method: 'PUT', headers: getHeadersComUsuario(), body: JSON.stringify(corpo) });
    const resultado = await r.json();
    if (!r.ok) { erro.textContent = resultado.error || 'Não foi possível salvar.'; return; }
    erro.textContent = '';
    showToast(resultado.mensagem);
  } catch (_) { erro.textContent = 'Sem conexão com o servidor.'; } finally { botao.disabled = false; }
});

// ---- Ouvintes da tela ----
document.getElementById('func-novo').addEventListener('click', () => abrirFormFuncionario());
document.querySelectorAll('[data-painel-func]').forEach((aba) => aba.addEventListener('click', () => mostrarPainelFuncionarios(aba.dataset.painelFunc)));
function mostrarPainelFuncionarios(painel) {
  document.querySelectorAll('[data-painel-func]').forEach((b) => { const ativa = b.dataset.painelFunc === painel; b.classList.toggle('ativa', ativa); b.setAttribute('aria-selected', String(ativa)); });
  document.querySelectorAll('[data-painel-func-conteudo]').forEach((p) => { p.hidden = p.dataset.painelFuncConteudo !== painel; });
}
document.getElementById('func-resumo').addEventListener('click', (e) => { if (e.target.closest('[data-func-ir]')) mostrarPainelFuncionarios('folha'); });
document.querySelectorAll('[data-func-vinculo]').forEach((b) => b.addEventListener('click', () => { funcFiltro.vinculo = b.dataset.funcVinculo; renderizarEquipe(true); }));
['func-busca', 'func-situacao'].forEach((id) => document.getElementById(id).addEventListener('input', () => renderizarEquipe(true)));
document.getElementById('func-lista').addEventListener('click', (e) => {
  const cartao = e.target.closest('[data-func-id]');
  if (!cartao || e.target.closest('a')) return;
  const id = Number(cartao.dataset.funcId);
  const acao = e.target.closest('[data-func-acao]')?.dataset.funcAcao || 'ficha';
  if (acao === 'ficha') abrirFicha(id);
  if (acao === 'editar') abrirFormFuncionario(cltState.funcionarios.find((f) => f.id === id));
  if (acao === 'holerite') abrirGerarHolerite(id, folhaMes, (folhaState?.linhas || []).find((l) => l.funcionario.id === id)?.holerite?.id || null);
});
document.getElementById('folha-lista').addEventListener('click', (e) => {
  const alvo = e.target.closest('[data-folha-acao]');
  if (!alvo) return;
  const [acao, a, b] = alvo.dataset.folhaAcao.split(':');
  if (acao === 'ver') abrirHoleriteVer(Number(a));
  if (acao === 'gerar') abrirGerarHolerite(Number(a), folhaMes);
  if (acao === 'refazer') abrirGerarHolerite(Number(a), folhaMes, Number(b));
});
document.getElementById('folha-mes-anterior').addEventListener('click', () => trocarMesFolha(-1));
document.getElementById('folha-mes-seguinte').addEventListener('click', () => trocarMesFolha(1));
document.getElementById('folha-gerar-todos').addEventListener('click', gerarHoleritesPendentes);


// ================= PARÂMETROS: TABELAS DA FOLHA CLT POR ANO =================
// O editor só é redesenhado ao abrir a aba, trocar de ano, salvar ou excluir,
// para a atualização automática (a cada 3 s) não apagar o que está sendo digitado.
// Campos criados pelo próprio editor (ficam dentro do formulário).
const campoTabelaClt = (id) => document.querySelector(`#form-clt-tabelas [id="${id}"]`);
let cltTabParam = null;       // resposta de /clt/tabelas-anuais
let cltTabRascunho = null;    // { ano, tabela, nova }
const pctCampo = (fracao) => Number((Number(fracao) * 100).toFixed(4));
const valorCampo = (v) => (v === null || v === undefined ? '' : Number(v));

async function carregarTabelasCltParametros(anoEscolhido) {
  const card = document.getElementById('card-clt-tabelas');
  if (!card) return;
  if (!pode('parametros')) { card.hidden = true; return; }
  card.hidden = false;
  try {
    const resposta = await fetch(`${API_URL}/clt/tabelas-anuais`, { headers: getHeadersComUsuario() });
    if (!resposta.ok) return;
    cltTabParam = await resposta.json();
    const ano = anoEscolhido ?? cltTabParam.ano_vigente;
    const item = cltTabParam.tabelas.find((t) => t.ano === ano) || cltTabParam.tabelas[cltTabParam.tabelas.length - 1];
    cltTabRascunho = { ano: item.ano, tabela: JSON.parse(JSON.stringify(item.tabela)), nova: false };
    renderizarTabelasCltParametros();
  } catch (_) { /* sem conexão: tenta ao abrir a aba de novo */ }
}

function renderizarTabelasCltParametros() {
  const d = cltTabParam, r = cltTabRascunho;
  if (!d || !r) return;
  const status = document.getElementById('clt-tab-status');
  status.className = `clt-tab-status ${d.desatualizada ? 'clt-tab-alerta' : 'clt-tab-ok'}`;
  status.innerHTML = d.desatualizada
    ? `<strong>Atenção:</strong> as tabelas de ${d.ano_atual} ainda não foram cadastradas. A Folha CLT está calculando com as de ${d.ano_vigente}. Clique em <strong>+ Novo ano</strong>, confira os valores publicados para ${d.ano_atual} e salve.`
    : `Em uso agora: <strong>tabelas de ${d.ano_vigente}</strong>${d.tabelas.find((t) => t.ano === d.ano_vigente)?.origem === 'padrao' ? ' (padrão que vem com o sistema)' : ''}.`;

  const chips = d.tabelas.map((t) => `<button type="button" class="clt-tab-chip${t.ano === r.ano && !r.nova ? ' ativo' : ''}" data-ano="${t.ano}">${t.ano}${t.ano === d.ano_vigente ? ' · em uso' : ''}<small>${t.origem === 'padrao' ? 'padrão do sistema' : `editada${t.atualizado_por_nome ? ` por ${escapeHtml(t.atualizado_por_nome)}` : ''}`}</small></button>`).join('');
  document.getElementById('clt-tab-anos').innerHTML = chips + `<button type="button" class="clt-tab-chip clt-tab-novo so-edicao${r.nova ? ' ativo' : ''}" id="clt-tab-novo-ano">+ Novo ano</button>`;

  const t = r.tabela;
  const linhaInss = (f, i) => `<tr><td>Faixa ${i + 1}</td><td><input type="number" step="0.01" min="0" data-inss-ate="${i}" value="${valorCampo(f.ate)}" aria-label="INSS faixa ${i + 1}: até"></td><td><input type="number" step="0.01" min="0" max="100" data-inss-aliq="${i}" value="${pctCampo(f.aliquota)}" aria-label="INSS faixa ${i + 1}: alíquota"></td><td>${t.inss.faixas.length > 1 ? `<button type="button" class="btn btn-sm btn-secondary" data-remover-inss="${i}">Remover</button>` : ''}</td></tr>`;
  const ultimaIr = t.irrf.faixas.length - 1;
  const linhaIr = (f, i) => `<tr><td>Faixa ${i + 1}</td><td>${i === ultimaIr ? '<span class="field-help">Acima da faixa anterior</span>' : `<input type="number" step="0.01" min="0" data-ir-ate="${i}" value="${valorCampo(f.ate)}" aria-label="IRRF faixa ${i + 1}: até">`}</td><td><input type="number" step="0.01" min="0" max="100" data-ir-aliq="${i}" value="${pctCampo(f.aliquota)}" aria-label="IRRF faixa ${i + 1}: alíquota"></td><td><input type="number" step="0.01" min="0" data-ir-ded="${i}" value="${valorCampo(f.deduzir)}" aria-label="IRRF faixa ${i + 1}: parcela a deduzir"></td><td>${t.irrf.faixas.length > 2 && i !== ultimaIr ? `<button type="button" class="btn btn-sm btn-secondary" data-remover-ir="${i}">Remover</button>` : ''}</td></tr>`;
  const red = t.irrf.reducao;
  const campo = (id, rotulo, valor, ajuda = '', passo = '0.01') => `<div class="form-group"><label for="${id}">${rotulo}</label><input type="number" id="${id}" step="${passo}" min="0" value="${valor}">${ajuda ? `<small class="field-help">${ajuda}</small>` : ''}</div>`;
  const salvo = d.tabelas.find((x) => x.ano === r.ano && x.origem === 'parametros');
  document.getElementById('form-clt-tabelas').innerHTML = `
    <div class="clt-tab-cabecalho">
      <div class="form-group"><label for="clt-tab-ano">Ano das tabelas</label><input type="number" id="clt-tab-ano" min="2020" max="2100" step="1" value="${r.ano}" ${r.nova ? '' : 'readonly'}><small class="field-help">${r.nova ? 'Ano novo: os valores abaixo foram copiados do ano mais recente. Atualize com os publicados.' : 'Para outro ano, use + Novo ano.'}</small></div>
      ${campo('clt-tab-minimo', 'Salário mínimo (R$)', valorCampo(t.salario_minimo))}
    </div>
    <p class="clt-secao">INSS do empregado (progressivo; o teto é o limite da última faixa)</p>
    <div class="table-responsive"><table class="clt-tab-tabela"><thead><tr><th></th><th>Até (R$)</th><th>Alíquota (%)</th><th></th></tr></thead><tbody>${t.inss.faixas.map(linhaInss).join('')}</tbody></table></div>
    <button type="button" class="btn btn-sm btn-secondary" id="clt-tab-add-inss">+ Faixa do INSS</button>
    <p class="clt-secao">IRRF mensal (tabela progressiva)</p>
    <div class="table-responsive"><table class="clt-tab-tabela"><thead><tr><th></th><th>Base até (R$)</th><th>Alíquota (%)</th><th>Parcela a deduzir (R$)</th><th></th></tr></thead><tbody>${t.irrf.faixas.map(linhaIr).join('')}</tbody></table></div>
    <button type="button" class="btn btn-sm btn-secondary" id="clt-tab-add-ir">+ Faixa do IRRF</button>
    <div class="form-grid clt-tab-grade">
      ${campo('clt-tab-dependente', 'Dedução por dependente (R$)', valorCampo(t.irrf.deducao_dependente))}
      ${campo('clt-tab-simplificado', 'Desconto simplificado mensal (R$)', valorCampo(t.irrf.desconto_simplificado))}
    </div>
    <p class="clt-secao">Redução do IR (Lei 15.270/2025) · use 0 para desligar</p>
    <div class="form-grid clt-tab-grade">
      ${campo('clt-tab-isencao', 'Imposto zerado até (R$)', valorCampo(red.isencao_ate), 'Salário bruto até este valor não paga IR.')}
      ${campo('clt-tab-redmax', 'Redução máxima nessa faixa (R$)', valorCampo(red.reducao_maxima))}
      ${campo('clt-tab-transicao', 'Redução parcial até (R$)', valorCampo(red.transicao_ate), 'Acima deste valor não há redução.')}
      ${campo('clt-tab-fixo', 'Valor fixo da fórmula (R$)', valorCampo(red.fixo), 'Redução = valor fixo − fator × salário bruto.')}
      ${campo('clt-tab-fator', 'Fator da fórmula', valorCampo(red.fator), 'Ex.: 0,133145', '0.000001')}
    </div>
    <p class="clt-secao">Benefícios e FGTS</p>
    <div class="form-grid clt-tab-grade">
      ${campo('clt-tab-vt', 'Desconto máximo do VT (% do salário)', pctCampo(t.vt_percentual_maximo))}
      ${campo('clt-tab-alim', 'Desconto máximo da alimentação (% do benefício)', pctCampo(t.alimentacao_desconto_maximo))}
      ${campo('clt-tab-fgts', 'FGTS (% do salário)', pctCampo(t.fgts))}
    </div>
    <div class="form-actions clt-tab-acoes">
      <button type="submit" class="btn btn-accent" id="clt-tab-salvar">Salvar tabelas de ${r.ano}</button>
      ${r.nova ? '<button type="button" class="btn btn-secondary" id="clt-tab-cancelar">Cancelar</button>' : ''}
      ${salvo ? `<button type="button" class="btn btn-secondary" id="clt-tab-excluir">${r.ano === d.ano_padrao ? 'Voltar ao padrão do sistema' : `Excluir tabelas de ${r.ano}`}</button>` : ''}
    </div>`;
  if (!pode('parametros', 'editar')) document.querySelectorAll('#form-clt-tabelas input').forEach((el) => { el.readOnly = true; });
}

// Lê o formulário de volta para o rascunho (percentuais viram fração).
function lerFormularioTabelasClt() {
  const t = cltTabRascunho.tabela;
  const n = (id) => { const v = document.getElementById(id)?.value; return v === '' || v === undefined ? null : Number(v); };
  const q = (sel) => document.querySelector(sel)?.value;
  const fr = (v) => (v === '' || v === undefined || v === null ? null : Number(v) / 100);
  cltTabRascunho.ano = Number(campoTabelaClt('clt-tab-ano').value);
  t.salario_minimo = n('clt-tab-minimo');
  t.inss.faixas = t.inss.faixas.map((_, i) => ({ ate: q(`[data-inss-ate="${i}"]`) === '' ? null : Number(q(`[data-inss-ate="${i}"]`)), aliquota: fr(q(`[data-inss-aliq="${i}"]`)) }));
  const ultima = t.irrf.faixas.length - 1;
  t.irrf.faixas = t.irrf.faixas.map((_, i) => ({ ate: i === ultima ? null : (q(`[data-ir-ate="${i}"]`) === '' ? null : Number(q(`[data-ir-ate="${i}"]`))), aliquota: fr(q(`[data-ir-aliq="${i}"]`)), deduzir: Number(q(`[data-ir-ded="${i}"]`) || 0) }));
  t.irrf.deducao_dependente = n('clt-tab-dependente');
  t.irrf.desconto_simplificado = n('clt-tab-simplificado');
  t.irrf.reducao = { isencao_ate: n('clt-tab-isencao') ?? 0, reducao_maxima: n('clt-tab-redmax') ?? 0, transicao_ate: n('clt-tab-transicao') ?? 0, fixo: n('clt-tab-fixo') ?? 0, fator: n('clt-tab-fator') ?? 0 };
  t.vt_percentual_maximo = fr(campoTabelaClt('clt-tab-vt').value);
  t.alimentacao_desconto_maximo = fr(campoTabelaClt('clt-tab-alim').value);
  t.fgts = fr(campoTabelaClt('clt-tab-fgts').value);
}

function mensagemTabelasClt(texto, erro = false) {
  const el = document.getElementById('clt-tab-mensagem');
  el.textContent = texto;
  el.classList.toggle('clt-erro', erro);
}

document.getElementById('clt-tab-anos')?.addEventListener('click', (evento) => {
  const botao = evento.target.closest('button');
  if (!botao || !cltTabParam) return;
  mensagemTabelasClt('');
  if (botao.id === 'clt-tab-novo-ano') {
    const maisRecente = cltTabParam.tabelas[cltTabParam.tabelas.length - 1];
    const ano = Math.max(cltTabParam.ano_atual, maisRecente.ano + 1);
    cltTabRascunho = { ano, tabela: JSON.parse(JSON.stringify(maisRecente.tabela)), nova: true };
  } else {
    const item = cltTabParam.tabelas.find((t) => t.ano === Number(botao.dataset.ano));
    if (!item) return;
    cltTabRascunho = { ano: item.ano, tabela: JSON.parse(JSON.stringify(item.tabela)), nova: false };
  }
  renderizarTabelasCltParametros();
});

document.getElementById('form-clt-tabelas')?.addEventListener('click', (evento) => {
  const botao = evento.target.closest('button');
  if (!botao || !cltTabRascunho) return;
  const t = cltTabRascunho.tabela;
  if (botao.dataset.removerInss !== undefined) { lerFormularioTabelasClt(); t.inss.faixas.splice(Number(botao.dataset.removerInss), 1); renderizarTabelasCltParametros(); }
  else if (botao.dataset.removerIr !== undefined) { lerFormularioTabelasClt(); t.irrf.faixas.splice(Number(botao.dataset.removerIr), 1); renderizarTabelasCltParametros(); }
  else if (botao.id === 'clt-tab-add-inss') { lerFormularioTabelasClt(); const ult = t.inss.faixas[t.inss.faixas.length - 1]; t.inss.faixas.push({ ate: null, aliquota: ult?.aliquota ?? 0 }); renderizarTabelasCltParametros(); }
  else if (botao.id === 'clt-tab-add-ir') { lerFormularioTabelasClt(); t.irrf.faixas.splice(t.irrf.faixas.length - 1, 0, { ate: null, aliquota: t.irrf.faixas[t.irrf.faixas.length - 2]?.aliquota ?? 0, deduzir: 0 }); renderizarTabelasCltParametros(); }
  else if (botao.id === 'clt-tab-cancelar') carregarTabelasCltParametros();
  else if (botao.id === 'clt-tab-excluir') excluirTabelasClt(cltTabRascunho.ano, botao);
});

async function excluirTabelasClt(ano, botao) {
  // Confirmação em dois cliques, sem caixa de diálogo do navegador.
  if (botao.dataset.confirmar !== '1') { botao.dataset.confirmar = '1'; botao.textContent = 'Clique de novo para confirmar'; return; }
  const resposta = await fetch(`${API_URL}/clt/tabelas-anuais/${ano}`, { method: 'DELETE', headers: getHeadersComUsuario() });
  const resultado = await resposta.json();
  if (!resposta.ok) return mensagemTabelasClt(resultado.error || 'Não foi possível excluir.', true);
  showToast(resultado.mensagem);
  cltTabelas = null;
  await carregarTabelasCltParametros();
}

document.getElementById('form-clt-tabelas')?.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!cltTabRascunho || !pode('parametros', 'editar')) return;
  lerFormularioTabelasClt();
  const ano = cltTabRascunho.ano;
  if (cltTabRascunho.nova && cltTabParam.tabelas.some((t) => t.ano === ano && t.origem === 'parametros')) {
    return mensagemTabelasClt(`Já existem tabelas salvas para ${ano}. Abra o ano ${ano} para alterá-las.`, true);
  }
  const botao = campoTabelaClt('clt-tab-salvar');
  botao.disabled = true;
  try {
    const resposta = await fetch(`${API_URL}/clt/tabelas-anuais/${ano}`, { method: 'PUT', headers: getHeadersComUsuario(), body: JSON.stringify({ tabela: cltTabRascunho.tabela }) });
    const resultado = await resposta.json();
    if (!resposta.ok) return mensagemTabelasClt(resultado.error || 'Não foi possível salvar.', true);
    showToast(resultado.mensagem);
    cltTabelas = null; // a Folha CLT relê as tabelas na próxima atualização
    await carregarTabelasCltParametros(ano);
    mensagemTabelasClt(resultado.mensagem);
  } finally { botao.disabled = false; }
});


// ================= SENHAS DE USUÁRIOS =================
const normalizarLoginTela = (valor) => String(valor || '').trim().toLowerCase();
// Botão "Mostrar" ao lado dos campos de senha (cadastro e redefinição).
document.addEventListener('click', (evento) => {
  const botao = evento.target.closest('[data-mostrar-senha]');
  if (!botao) return;
  const campo = document.getElementById(botao.dataset.mostrarSenha);
  if (!campo) return;
  const mostrar = campo.type === 'password';
  campo.type = mostrar ? 'text' : 'password';
  botao.textContent = mostrar ? 'Ocultar' : 'Mostrar';
  botao.setAttribute('aria-pressed', String(mostrar));
});
function esconderSenha(id) {
  const campo = document.getElementById(id);
  if (campo) campo.type = 'password';
  const botao = document.querySelector(`[data-mostrar-senha="${id}"]`);
  if (botao) { botao.textContent = 'Mostrar'; botao.setAttribute('aria-pressed', 'false'); }
}
document.getElementById('form-usuario')?.addEventListener('reset', () => esconderSenha('user-senha'));

function abrirSenhaUsuario(id) {
  if (!isAdminMaster()) return;
  const usuario = (usuariosState || []).find((u) => Number(u.id) === Number(id));
  if (!usuario) return;
  document.getElementById('senha-usuario-id').value = usuario.id;
  document.getElementById('senha-usuario-titulo').textContent = `Redefinir senha de ${usuario.nome}`;
  document.getElementById('senha-usuario-subtitulo').textContent = `Login: ${usuario.login}. Depois de salvar, a pessoa entra com esta senha nova (se estiver conectada, precisa entrar de novo).`;
  document.getElementById('senha-usuario-nova').value = '';
  document.getElementById('senha-usuario-erro').textContent = '';
  esconderSenha('senha-usuario-nova');
  abrirDialogo('modal-senha-usuario');
  document.getElementById('senha-usuario-nova').focus();
}

document.getElementById('form-senha-usuario')?.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const id = document.getElementById('senha-usuario-id').value;
  const senha = document.getElementById('senha-usuario-nova').value;
  const erro = document.getElementById('senha-usuario-erro');
  if (senha.length < 6) { erro.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; return; }
  const botao = document.getElementById('senha-usuario-salvar');
  botao.disabled = true;
  try {
    const resposta = await fetch(`${API_URL}/usuarios/${id}/senha`, { method: 'PUT', headers: getHeadersComUsuario(), body: JSON.stringify({ senha }) });
    const resultado = await resposta.json();
    if (!resposta.ok) { erro.textContent = resultado.error || 'Não foi possível redefinir a senha.'; return; }
    fecharDialogo('modal-senha-usuario');
    document.getElementById('senha-usuario-nova').value = '';
    showToast(resultado.mensagem);
  } catch (_) {
    erro.textContent = 'Erro ao comunicar com o servidor.';
  } finally { botao.disabled = false; }
});


// ================= DASHBOARD: VENDAS DO DIA =================
// Todas as vendas de hoje (horário do computador), sempre do dia atual,
// independente do mês escolhido no painel. Canceladas aparecem riscadas e
// ficam fora dos totais.
function diaLocalIso(data = new Date()) { return data.toLocaleDateString('sv-SE'); }
function diaDaVenda(v) {
  if (v.criado_em) {
    const quando = new Date(String(v.criado_em).includes('T') || String(v.criado_em).endsWith('Z') ? v.criado_em : `${String(v.criado_em).replace(' ', 'T')}Z`);
    if (!Number.isNaN(quando.getTime())) return diaLocalIso(quando);
  }
  return String(v.data_venda || '').slice(0, 10);
}
function horaDaVenda(v) {
  if (!v.criado_em) return '—';
  const quando = new Date(String(v.criado_em).includes('T') || String(v.criado_em).endsWith('Z') ? v.criado_em : `${String(v.criado_em).replace(' ', 'T')}Z`);
  return Number.isNaN(quando.getTime()) ? '—' : quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
let vendasDoDiaAssinatura = '';
function renderizarVendasDoDia() {
  const lista = document.getElementById('dash-dia-lista');
  if (!lista) return;
  const linkCaixa = document.getElementById('dash-dia-caixa');
  if (linkCaixa) linkCaixa.hidden = !pode('caixa');
  const hoje = diaLocalIso();
  const vendas = (relatorioVendasState || []).filter((v) => diaDaVenda(v) === hoje).sort((a, b) => Number(b.id) - Number(a.id));
  const assinatura = JSON.stringify([hoje, vendas.map((v) => [v.id, v.status_pagamento, v.total])]);
  if (assinatura === vendasDoDiaAssinatura) return;
  vendasDoDiaAssinatura = assinatura;

  const validas = vendas.filter(vendaConta);
  const total = validas.reduce((t, v) => t + Number(v.total || 0), 0);
  const pecas = validas.reduce((t, v) => t + Number(v.quantidade || 0), 0);
  const brindes = validas.reduce((t, v) => t + Number(v.quantidade_brinde || 0), 0);
  const canceladas = vendas.length - validas.length;
  document.getElementById('dash-dia-data').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  document.getElementById('dash-dia-resumo').innerHTML = `
    <div class="dia-num"><strong>${formatarMoeda(total)}</strong><small>vendido hoje</small></div>
    <div class="dia-num"><strong>${validas.length}</strong><small>${validas.length === 1 ? 'venda' : 'vendas'}</small></div>
    <div class="dia-num"><strong>${pecas}</strong><small>${pecas === 1 ? 'peça' : 'peças'}${brindes ? ` + ${brindes} ${brindes === 1 ? 'brinde' : 'brindes'}` : ''}</small></div>
    <div class="dia-num"><strong>${validas.length ? formatarMoeda(total / validas.length) : 'R$ 0,00'}</strong><small>ticket médio${canceladas ? ` · ${canceladas} ${canceladas === 1 ? 'cancelada' : 'canceladas'}` : ''}</small></div>`;

  if (!vendas.length) {
    lista.innerHTML = `<p class="dia-vazio">${icone(ICONES.vendas)}<span>Nenhuma venda hoje ainda.</span></p>`;
    return;
  }
  lista.innerHTML = `<div class="table-responsive"><table class="tabela-dia"><thead><tr><th>Hora</th><th>Venda</th><th>Itens</th><th>Pagamento</th><th>Vendedor</th><th>Valor</th><th>Situação</th></tr></thead><tbody>${vendas.map((v) => {
    const estado = estadoDaVenda(v);
    const cancelada = !vendaConta(v);
    const situacao = cancelada ? '<span class="badge badge-cancelado">Cancelada</span>' : estado === 'aprovado' ? '<span class="badge badge-pago">Pago</span>' : '<span class="badge badge-pendente">Pendente</span>';
    const itens = (v.itens || []).filter((i) => i.tipo === 'VENDA').map((i) => `${escapeHtml(i.produto_nome)}${i.quantidade > 1 ? ` <small>x${i.quantidade}</small>` : ''}`).join('<br>') || escapeHtml(v.produto_nome || '—');
    const brinde = (v.itens || []).find((i) => i.tipo === 'BRINDE');
    const desconto = Number(v.desconto_valor || 0) > 0 ? `<small class="dia-desconto">− ${formatarMoeda(v.desconto_valor)} de desconto</small>` : '';
    return `<tr class="${cancelada ? 'linha-cancelada' : ''}">
      <td class="sem-quebra"><strong>${horaDaVenda(v)}</strong></td>
      <td class="sem-quebra">#${v.id}</td>
      <td>${itens}${brinde ? `<br><small class="dia-brinde">+ brinde: ${escapeHtml(brinde.produto_nome)}</small>` : ''}</td>
      <td>${htmlFormaVenda(v)}</td>
      <td>${escapeHtml(v.vendedor_nome || '—')}</td>
      <td class="sem-quebra"><strong>${formatarMoeda(v.total)}</strong>${desconto}</td>
      <td>${situacao}</td>
    </tr>`;
  }).join('')}</tbody></table></div>`;
}


// ================= CAIXA: CANCELAR VENDA =================
// Lista as vendas pagas (autorizadas) que ainda podem ser canceladas, com os
// produtos, data e hora e quem vendeu. Usa a mesma lista de vendas do sistema.
function htmlItensDaVenda(itens, resumo) {
  const lista = (itens || []).filter((i) => i.tipo === 'VENDA');
  if (!lista.length) return escapeHtml(resumo || '-');
  const brinde = (itens || []).find((i) => i.tipo === 'BRINDE');
  return lista.map((i) => `${escapeHtml(i.produto_nome)}${i.quantidade > 1 ? ` <small>x${i.quantidade}</small>` : ''}`).join('<br>') + (brinde ? `<br><small class="dia-brinde">+ brinde: ${escapeHtml(brinde.produto_nome)}</small>` : '');
}
function vendaPodeCancelar(v) { return !v.cancelada_em && vendaConta(v) && estadoDaVenda(v) === 'aprovado'; }
let cancelarLimite = 30;
let cancelarAssinatura = '';
function renderizarVendasAutorizadas(forcar = false) {
  const tabela = document.getElementById('tabela-vendas-autorizadas');
  if (!tabela) return;
  const busca = (document.getElementById('cancelar-busca')?.value || '').trim().toLowerCase().replace(/^#/, '');
  const data = document.getElementById('cancelar-data')?.value || '';
  const vendas = (relatorioVendasState || []).filter(vendaPodeCancelar)
    .filter((v) => !data || diaDaVenda(v) === data)
    .filter((v) => !busca || String(v.id) === busca || [v.produto_nome, v.vendedor_nome, ...(v.itens || []).map((i) => i.produto_nome)].some((t) => String(t || '').toLowerCase().includes(busca)))
    .sort((a, b) => Number(b.id) - Number(a.id));
  const assinatura = JSON.stringify([busca, data, cancelarLimite, vendas.map((v) => v.id)]);
  if (!forcar && assinatura === cancelarAssinatura) return;
  cancelarAssinatura = assinatura;
  const visiveis = vendas.slice(0, cancelarLimite);
  tabela.innerHTML = visiveis.length ? visiveis.map((v) => `<tr>
      <td class="sem-quebra"><strong>#${v.id}</strong></td>
      <td class="sem-quebra">${v.criado_em ? escapeHtml(formatarDataHora(v.criado_em)) : escapeHtml(dataBR(v.data_venda))}</td>
      <td>${htmlItensDaVenda(v.itens, v.produto_nome)}</td>
      <td>${escapeHtml(v.vendedor_nome || '-')}</td>
      <td>${htmlFormaVenda(v)}</td>
      <td class="sem-quebra"><strong>${formatarMoeda(v.total)}</strong></td>
      <td><button type="button" class="btn btn-sm btn-danger" onclick="abrirCancelarVenda(${v.id})">Cancelar</button></td>
    </tr>`).join('') : `<tr><td colspan="7" class="empty-cell">${busca || data ? 'Nenhuma venda paga encontrada com estes filtros.' : 'Nenhuma venda paga para cancelar.'}</td></tr>`;
  const mais = document.getElementById('cancelar-mais');
  if (mais) { mais.classList.toggle('hidden', vendas.length <= cancelarLimite); mais.textContent = `Mostrar mais (${vendas.length - visiveis.length} restantes)`; }
}
document.getElementById('cancelar-mais')?.addEventListener('click', () => { cancelarLimite += 30; renderizarVendasAutorizadas(true); });
['cancelar-busca', 'cancelar-data'].forEach((id) => document.getElementById(id)?.addEventListener('input', () => { cancelarLimite = 30; renderizarVendasAutorizadas(true); }));
let canceladasBuscaTimer = null;
document.getElementById('canceladas-busca')?.addEventListener('input', () => { clearTimeout(canceladasBuscaTimer); canceladasBuscaTimer = setTimeout(() => { canceladasAssinatura = ''; carregarVendasCanceladas(); }, 300); });

function abrirCancelarVenda(id) {
  if (!pode('caixa', 'editar')) return showToast('Você não pode cancelar vendas. Peça ao administrador.', 'error');
  const v = (relatorioVendasState || []).find((x) => Number(x.id) === Number(id));
  if (!v) return;
  if (!vendaPodeCancelar(v)) return showToast('Esta venda já foi cancelada ou não está paga.', 'error');
  document.getElementById('cancelar-venda-id').value = v.id;
  document.getElementById('cancelar-venda-titulo').textContent = `Cancelar a venda #${v.id}`;
  document.getElementById('cancelar-venda-resumo').innerHTML = `
    <dt>Data e hora</dt><dd>${escapeHtml(v.criado_em ? formatarDataHora(v.criado_em) : dataBR(v.data_venda))}</dd>
    <dt>Produtos</dt><dd>${htmlItensDaVenda(v.itens, v.produto_nome)}</dd>
    <dt>Vendedor</dt><dd>${escapeHtml(v.vendedor_nome || '-')}</dd>
    <dt>Pagamento</dt><dd>${htmlFormaVenda(v)}</dd>
    <dt class="resumo-total">Valor estornado</dt><dd class="resumo-total">${escapeHtml(formatarMoeda(v.total))}</dd>`;
  document.getElementById('cancelar-venda-motivo').value = '';
  document.getElementById('cancelar-venda-erro').textContent = '';
  abrirDialogo('modal-cancelar-venda');
  document.getElementById('cancelar-venda-motivo').focus();
}

document.getElementById('form-cancelar-venda')?.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const id = document.getElementById('cancelar-venda-id').value;
  const motivo = document.getElementById('cancelar-venda-motivo').value.trim();
  const erro = document.getElementById('cancelar-venda-erro');
  if (motivo.length < 3) { erro.textContent = 'Informe o motivo (pelo menos 3 letras).'; return; }
  const botao = document.getElementById('cancelar-venda-confirmar');
  botao.disabled = true;
  try {
    const res = await fetch(`${API_URL}/vendas/${id}/cancelar`, { method: 'POST', headers: getHeadersComUsuario(), body: JSON.stringify({ motivo }) });
    const resultado = await res.json();
    if (!res.ok) { erro.textContent = resultado.error || 'Não foi possível cancelar a venda.'; return; }
    fecharDialogo('modal-cancelar-venda');
    showToast(`Venda #${id} cancelada. O estoque voltou e o valor saiu do caixa.`);
    canceladasAssinatura = '';
    triggerSync();
    await carregarTudo();
  } catch (_) { erro.textContent = 'Erro ao comunicar com o servidor.'; }
  finally { botao.disabled = false; }
});


// ================= PRODUTOS & ESTOQUE: FILTROS, RESUMO, LISTAS E LANÇAMENTO EM LOTE =================
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function filtrosEstoque() {
  return {
    busca: semAcento(document.getElementById('estoque-busca')?.value.trim() || ''),
    categoria: document.getElementById('estoque-categoria')?.value || '',
    nivel: document.getElementById('estoque-nivel')?.value || '',
    status: document.getElementById('filtro-produto-status')?.value || 'ativos'
  };
}
function nivelPassa(estoque, nivel) {
  if (!nivel) return true;
  const n = nivelEstoque(estoque);
  return nivel === 'esgotado' ? n === 'esgotado' : n !== 'ok';
}
function produtoPassaFiltros(p, f = filtrosEstoque()) {
  if (f.status === 'ativos' && !p.ativo) return false;
  if (f.status === 'inativos' && p.ativo) return false;
  if (f.categoria && p.categoria !== f.categoria) return false;
  if (!nivelPassa(p.estoque, f.nivel)) return false;
  return !f.busca || semAcento(`${p.nome} ${p.categoria} ${p.cor || ''} ${p.tamanho || ''}`).includes(f.busca);
}
function modeloPassaFiltros(m, f = filtrosEstoque()) {
  if (f.categoria && m.categoria !== f.categoria) return false;
  if (f.nivel && !m.variacoes.some((v) => v.ativo && nivelPassa(v.estoque, f.nivel))) return false;
  return !f.busca || semAcento(`${m.nome} ${m.categoria}`).includes(f.busca) || m.variacoes.some((v) => semAcento(`${v.nome} ${v.cor} ${v.tamanho}`).includes(f.busca));
}

function campoLote(p) {
  if (!pode('estoque', 'editar') || !p.ativo) return '';
  return `<input type="number" class="lote-input" min="0" step="1" inputmode="numeric" placeholder="+" data-lote="${p.id}" data-campo="lote-lista:${p.id}" value="${loteEstoque.get(Number(p.id)) || ''}" aria-label="Quantidade para ${escapeHtml(p.nome)}">`;
}
function seloSaldo(p) {
  const nivel = nivelEstoque(p.estoque);
  const classe = !p.ativo ? 'saldo-inativo' : nivel === 'esgotado' ? 'saldo-esgotado' : nivel === 'acabando' ? 'saldo-baixo' : 'saldo-ok';
  return `<span class="saldo ${classe}" title="${nivel === 'esgotado' ? 'Esgotado' : nivel === 'acabando' ? 'Acabando' : 'Em estoque'}"><strong>${Number(p.estoque)}</strong> un.</span>`;
}
function acoesProduto(p) {
  if (!pode('estoque', 'editar')) return '';
  return `<button class="btn btn-sm btn-secondary" onclick="escolherFoto('/produtos/${p.id}/foto')">${p.id_foto_efetivo ? 'Trocar foto' : 'Foto'}</button>${p.id_foto ? `<button class="btn btn-sm btn-secondary" onclick="apagarFoto('/produtos/${p.id}/foto')">Tirar foto</button>` : ''}<button class="btn btn-sm ${p.ativo ? 'btn-secondary' : 'btn-success'}" onclick="alternarProdutoAtivo(${p.id}, ${!p.ativo})">${p.ativo ? 'Inativar' : 'Reativar'}</button>`;
}

let estoqueAssinatura = '';
function renderizarTelaEstoque(forcar = false) {
  const produtos = relatorioProdutosState || [];
  const f = filtrosEstoque();
  const admin = pode('estoque', 'editar');

  // Categorias para o filtro (mantém a escolhida).
  const selCat = document.getElementById('estoque-categoria');
  if (selCat) {
    const categorias = [...new Set(produtos.map((p) => p.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const opcoes = '<option value="">Todas as categorias</option>' + categorias.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if (selCat.dataset.opcoes !== opcoes) { const atual = selCat.value; selCat.innerHTML = opcoes; selCat.dataset.opcoes = opcoes; if (categorias.includes(atual)) selCat.value = atual; }
  }

  // Resumo do topo (sempre dos produtos ativos).
  const ativos = produtos.filter((p) => p.ativo);
  const pecas = ativos.reduce((t, p) => t + Math.max(0, Number(p.estoque || 0)), 0);
  const acabando = ativos.filter((p) => nivelEstoque(p.estoque) === 'acabando').length;
  const esgotados = ativos.filter((p) => nivelEstoque(p.estoque) === 'esgotado').length;
  const resumo = document.getElementById('estoque-resumo');
  const resumoHtml = `
    <div class="resumo-tile"><span>Peças em estoque</span><strong>${pecas}</strong></div>
    <div class="resumo-tile"><span>Produtos ativos</span><strong>${ativos.length}</strong></div>
    <button type="button" class="resumo-tile resumo-alerta${acabando ? '' : ' zerado'}" data-filtro-nivel="baixo"><span>Acabando</span><strong>${acabando}</strong><small>até ${limiteEstoqueAviso()} un.</small></button>
    <button type="button" class="resumo-tile resumo-perigo${esgotados ? '' : ' zerado'}" data-filtro-nivel="esgotado"><span>Esgotados</span><strong>${esgotados}</strong><small>saldo 0</small></button>`;
  if (resumo && resumo.dataset.html !== resumoHtml) { resumo.innerHTML = resumoHtml; resumo.dataset.html = resumoHtml; }

  const assinatura = JSON.stringify([produtos.map((p) => [p.id, p.nome, p.estoque, p.ativo, p.id_foto_efetivo, p.id_foto, p.preco, p.categoria, p.modelo_id]), f, admin, visaoEstoque()]);
  if (!forcar && assinatura === estoqueAssinatura) { atualizarBarraLote(); return; }
  estoqueAssinatura = assinatura;
  const focoAntes = document.activeElement?.dataset?.campo || null;

  const visiveis = produtos.filter((p) => produtoPassaFiltros(p, f));

  // Peças únicas (sem modelo), na visão "Por modelo".
  const unicas = visiveis.filter((p) => !p.modelo_id);
  const blocoUnicas = document.getElementById('bloco-pecas-unicas');
  if (blocoUnicas) blocoUnicas.hidden = !unicas.length;
  const listaUnicas = document.getElementById('lista-pecas-unicas');
  if (listaUnicas) {
    listaUnicas.innerHTML = unicas.map((p) => `<div class="peca-linha${loteEstoque.has(Number(p.id)) ? ' tem-lote' : ''}${p.ativo ? '' : ' inativa'}">
        <div class="peca-foto">${htmlMiniatura(p.id_foto_efetivo, p.nome) || '<span class="peca-sem-foto" aria-hidden="true"></span>'}</div>
        <div class="peca-info"><strong>${escapeHtml(p.nome)}</strong><small>${escapeHtml(p.categoria)} · ${formatarMoeda(p.preco)}${p.ativo ? '' : ' · inativo'}</small></div>
        ${seloSaldo(p)}
        <div class="peca-lote">${campoLote(p)}</div>
        <div class="peca-acoes">${acoesProduto(p)}</div>
      </div>`).join('');
  }

  // Visão "Lista": todas as peças numa tabela.
  const tabela = document.getElementById('tabela-estoque');
  if (tabela) {
    tabela.innerHTML = visiveis.length ? visiveis.map((p) => `<tr class="${loteEstoque.has(Number(p.id)) ? 'tem-lote' : ''}">
        <td>${htmlMiniatura(p.id_foto_efetivo, p.nome)}</td>
        <td><strong>${escapeHtml(p.nome)}</strong><small class="cell-note">Cód. ${p.id}</small></td>
        <td>${escapeHtml(p.categoria)}</td>
        <td class="sem-quebra">${formatarMoeda(p.preco)}</td>
        <td>${seloSaldo(p)}</td>
        <td class="so-edicao">${campoLote(p)}</td>
        <td><span class="badge ${p.ativo ? 'badge-pago' : 'badge-cancelado'}">${p.ativo ? 'Ativo' : 'Inativo'}</span></td>
        <td class="peca-acoes">${acoesProduto(p)}</td>
      </tr>`).join('') : '<tr><td colspan="8" class="empty-cell">Nenhuma peça com estes filtros.</td></tr>';
  }

  renderizarModelos();
  if (focoAntes) document.querySelector(`[data-campo="${focoAntes}"]`)?.focus();
  atualizarBarraLote();
}

// ---- Abas internas e visão ----
const CHAVE_PAINEL_ESTOQUE = 'erp-estoque-painel', CHAVE_VISAO_ESTOQUE = 'erp-estoque-visao';
function lerPreferencia(chave, padrao) { try { return localStorage.getItem(chave) || padrao; } catch (_) { return padrao; } }
function salvarPreferencia(chave, valor) { try { localStorage.setItem(chave, valor); } catch (_) { /* sem armazenamento */ } }
function abrirPainelEstoque(nome) {
  if (nome === 'cadastrar' && !pode('estoque', 'editar')) nome = 'estoque';
  document.querySelectorAll('#tab-estoque .estoque-painel').forEach((p) => { p.hidden = p.dataset.painel !== nome; });
  document.querySelectorAll('#tab-estoque [data-painel-estoque]').forEach((b) => { const ativa = b.dataset.painelEstoque === nome; b.classList.toggle('ativa', ativa); b.setAttribute('aria-selected', String(ativa)); });
  salvarPreferencia(CHAVE_PAINEL_ESTOQUE, nome);
}
function visaoEstoque() { return document.querySelector('#tab-estoque [data-visao].ativa')?.dataset.visao || 'modelos'; }
function definirVisaoEstoque(visao) {
  document.querySelectorAll('#tab-estoque [data-visao]').forEach((b) => { const ativa = b.dataset.visao === visao; b.classList.toggle('ativa', ativa); b.setAttribute('aria-pressed', String(ativa)); });
  document.getElementById('estoque-visao-modelos').hidden = visao !== 'modelos';
  document.getElementById('estoque-visao-lista').hidden = visao !== 'lista';
  salvarPreferencia(CHAVE_VISAO_ESTOQUE, visao);
  modelosAssinatura = '';
  renderizarTelaEstoque(true);
}
document.querySelectorAll('#tab-estoque [data-painel-estoque]').forEach((b) => b.addEventListener('click', () => abrirPainelEstoque(b.dataset.painelEstoque)));
document.querySelectorAll('#tab-estoque [data-visao]').forEach((b) => b.addEventListener('click', () => definirVisaoEstoque(b.dataset.visao)));
abrirPainelEstoque(lerPreferencia(CHAVE_PAINEL_ESTOQUE, 'estoque'));
(() => { const visao = lerPreferencia(CHAVE_VISAO_ESTOQUE, 'modelos'); document.querySelectorAll('#tab-estoque [data-visao]').forEach((b) => { const ativa = b.dataset.visao === visao; b.classList.toggle('ativa', ativa); b.setAttribute('aria-pressed', String(ativa)); }); document.getElementById('estoque-visao-modelos').hidden = visao !== 'modelos'; document.getElementById('estoque-visao-lista').hidden = visao !== 'lista'; })();

let estoqueBuscaTimer = null;
document.getElementById('estoque-busca')?.addEventListener('input', () => { clearTimeout(estoqueBuscaTimer); estoqueBuscaTimer = setTimeout(() => renderizarTelaEstoque(true), 180); });
['estoque-categoria', 'estoque-nivel', 'filtro-produto-status'].forEach((id) => document.getElementById(id)?.addEventListener('change', () => renderizarTelaEstoque(true)));
document.getElementById('estoque-resumo')?.addEventListener('click', (evento) => {
  const tile = evento.target.closest('[data-filtro-nivel]');
  if (!tile) return;
  const sel = document.getElementById('estoque-nivel');
  sel.value = sel.value === tile.dataset.filtroNivel ? '' : tile.dataset.filtroNivel;
  abrirPainelEstoque('estoque');
  renderizarTelaEstoque(true);
});

// ---- Lançamento em lote ----
function tipoLote() { return document.querySelector('input[name="lote-tipo"]:checked')?.value || 'Entrada'; }
function definirTipoLote(tipo) { const r = document.querySelector(`input[name="lote-tipo"][value="${tipo}"]`); if (r) r.checked = true; atualizarBarraLote(); }
function atualizarBarraLote() {
  const barra = document.getElementById('lote-barra');
  if (!barra) return;
  const pecas = loteEstoque.size;
  const unidades = [...loteEstoque.values()].reduce((t, q) => t + q, 0);
  barra.hidden = !pecas || !pode('estoque', 'editar');
  const entrada = tipoLote() === 'Entrada';
  barra.classList.toggle('modo-saida', !entrada);
  document.getElementById('lote-resumo').innerHTML = `<strong>${pecas} ${pecas === 1 ? 'peça' : 'peças'}</strong> · ${entrada ? '+' : '−'}${unidades} ${unidades === 1 ? 'unidade' : 'unidades'}`;
  document.getElementById('lote-lancar').textContent = entrada ? 'Lançar entrada' : 'Lançar saída';
  document.querySelectorAll('#tab-estoque .lote-input').forEach((el) => el.closest('td, .peca-linha, tr')?.classList.toggle('tem-lote', loteEstoque.has(Number(el.dataset.lote))));
  posicionarBarraLote();
}
// A barra fica fixa no rodapé da tela, alinhada com a área de conteúdo (sem cobrir o menu lateral).
function posicionarBarraLote() {
  const barra = document.getElementById('lote-barra');
  const painel = document.querySelector('#tab-estoque [data-painel="estoque"]');
  if (!barra || barra.hidden || !painel) return;
  const area = painel.getBoundingClientRect();
  if (!area.width) return;
  barra.style.left = `${Math.round(area.left)}px`;
  barra.style.width = `${Math.round(area.width)}px`;
}
window.addEventListener('resize', posicionarBarraLote);
if (window.ResizeObserver) {
  const painelEstoque = document.querySelector('#tab-estoque [data-painel="estoque"]');
  if (painelEstoque) new ResizeObserver(() => posicionarBarraLote()).observe(painelEstoque);
}
document.getElementById('tab-estoque')?.addEventListener('input', (evento) => {
  const campo = evento.target.closest('.lote-input');
  if (!campo) return;
  const id = Number(campo.dataset.lote);
  const quantidade = Number.parseInt(campo.value, 10);
  if (Number.isInteger(quantidade) && quantidade > 0) loteEstoque.set(id, Math.min(quantidade, 100000)); else loteEstoque.delete(id);
  // O mesmo produto pode aparecer na visão por modelo e na lista: mantém os dois iguais.
  document.querySelectorAll(`#tab-estoque .lote-input[data-lote="${id}"]`).forEach((outro) => { if (outro !== campo) outro.value = campo.value; });
  atualizarBarraLote();
});
document.getElementById('tab-estoque')?.addEventListener('keydown', (evento) => {
  const campo = evento.target.closest('.lote-input');
  if (!campo || evento.key !== 'Enter') return;
  evento.preventDefault();
  const visiveis = [...document.querySelectorAll('#tab-estoque .estoque-painel[data-painel="estoque"] .lote-input')].filter((el) => el.offsetParent !== null);
  const proximo = visiveis[visiveis.indexOf(campo) + 1];
  if (proximo) { proximo.focus(); proximo.select?.(); } else document.getElementById('lote-lancar')?.focus();
});
document.querySelectorAll('input[name="lote-tipo"]').forEach((r) => r.addEventListener('change', atualizarBarraLote));
document.getElementById('lote-limpar')?.addEventListener('click', () => {
  loteEstoque.clear();
  document.querySelectorAll('#tab-estoque .lote-input').forEach((el) => { el.value = ''; });
  atualizarBarraLote();
});
document.getElementById('lote-lancar')?.addEventListener('click', async () => {
  if (!loteEstoque.size) return;
  const botao = document.getElementById('lote-lancar');
  const tipo = tipoLote();
  botao.disabled = true;
  try {
    const resposta = await fetch(`${API_URL}/estoque/lote`, { method: 'POST', headers: getHeadersComUsuario(), body: JSON.stringify({ tipo, itens: [...loteEstoque].map(([produto_id, quantidade]) => ({ produto_id, quantidade })) }) });
    const resultado = await resposta.json();
    if (!resposta.ok) return showToast(resultado.error || 'Não foi possível lançar.', 'error');
    showToast(resultado.mensagem);
    loteEstoque.clear();
    document.querySelectorAll('#tab-estoque .lote-input').forEach((el) => { el.value = ''; });
    definirTipoLote('Entrada');
    estoqueAssinatura = ''; modelosAssinatura = ''; movimentacoesAssinatura = '';
    triggerSync();
    await carregarTudo();
  } catch (_) {
    showToast('Erro ao comunicar com o servidor.', 'error');
  } finally { botao.disabled = false; }
});

// ================= PDV: VITRINE + VENDA ATUAL =================
// A vitrine mostra os produtos em cartões (modelos com cores e tamanhos viram um
// cartão só, que abre a grade cor × tamanho). Cada toque soma 1 peça na venda.
// A venda atual (carrinho) fica ao lado no computador e numa folha que sobe no
// celular. Todo o resto (CPF, brinde, desconto, confirmação) é o fluxo de sempre.
let vitrineCategoria = '';
let vitrineLimite = 60;
let vitrineHtml = '';
let variacoesAbertas = null; // chave do modelo com a grade aberta
let ultimoItemCarrinho = null; // { id } da última peça mexida, para o aviso de estoque

function permiteEstoqueNegativo() { return (parametrosState || []).find((item) => item.chave === 'permitir_estoque_negativo')?.valor === 'true'; }
function produtoAtivo(p) { return p.ativo === undefined || p.ativo === true || p.ativo === 1 || p.ativo === '1'; }
function quantidadeNoCarrinho(id) { return itensVenda.find((item) => item.produto_id === Number(id))?.quantidade || 0; }
function nomeDoModelo(p) {
  if (!p.modelo_id || !p.cor) return p.nome;
  const sufixo = ` - ${p.cor} - ${p.tamanho}`;
  return String(p.nome).endsWith(sufixo) ? String(p.nome).slice(0, -sufixo.length) : String(p.nome).split(' - ')[0];
}
function gruposDaVitrine() {
  const grupos = new Map();
  for (const p of relatorioProdutosState || []) {
    if (!produtoAtivo(p)) continue;
    const chave = p.modelo_id && p.cor ? `m${p.modelo_id}` : `p${p.id}`;
    if (!grupos.has(chave)) grupos.set(chave, { chave, modelo: chave.startsWith('m'), nome: nomeDoModelo(p), categoria: p.categoria || '', pecas: [] });
    grupos.get(chave).pecas.push(p);
  }
  return [...grupos.values()].map((g) => {
    const precos = g.pecas.map((p) => Number(p.preco || 0));
    return {
      ...g,
      foto: g.pecas.find((p) => p.id_foto_efetivo)?.id_foto_efetivo || null,
      precoMin: Math.min(...precos), precoMax: Math.max(...precos),
      saldo: g.pecas.reduce((t, p) => t + Math.max(0, Number(p.estoque || 0)), 0),
      noCarrinho: g.pecas.reduce((t, p) => t + quantidadeNoCarrinho(p.id), 0),
      cores: [...new Set(g.pecas.map((p) => p.cor).filter(Boolean))],
      tamanhos: ordenarTamanhos([...new Set(g.pecas.map((p) => p.tamanho).filter(Boolean))]),
    };
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
function grupoPassaNaBusca(g, termo) {
  if (!termo) return true;
  const partes = termo.split(/\s+/).filter(Boolean);
  const texto = semAcento(`${g.nome} ${g.categoria} ${g.cores.join(' ')} ${g.tamanhos.join(' ')} ${g.pecas.map((p) => p.nome).join(' ')}`);
  return partes.every((parte) => texto.includes(parte));
}
function gruposVisiveis() {
  const termo = semAcento(document.getElementById('venda-produto-busca').value.trim());
  return gruposDaVitrine().filter((g) => (!vitrineCategoria || g.categoria === vitrineCategoria) && grupoPassaNaBusca(g, termo));
}
function precoDoGrupo(g) { return g.precoMin === g.precoMax ? formatarMoeda(g.precoMin) : `${formatarMoeda(g.precoMin)} – ${formatarMoeda(g.precoMax)}`; }
function seloSaldoVitrine(saldo) {
  if (saldo <= 0) return '<span class="vit-saldo esgotado">Esgotado</span>';
  if (saldo <= limiteEstoqueAviso()) return `<span class="vit-saldo baixo">${saldo} un.</span>`;
  return `<span class="vit-saldo">${saldo} un.</span>`;
}
function htmlCartaoVitrine(g) {
  const foto = g.foto ? `<img src="${urlFoto(g.foto)}" alt="" loading="lazy">` : `<span class="vit-sem-foto" aria-hidden="true">${escapeHtml(g.nome.slice(0, 1).toUpperCase())}</span>`;
  const detalhe = g.modelo ? `${g.cores.length} ${g.cores.length === 1 ? 'cor' : 'cores'} · ${g.tamanhos.length > 1 ? `${g.tamanhos[0]}–${g.tamanhos[g.tamanhos.length - 1]}` : g.tamanhos[0] || ''}` : escapeHtml(g.categoria);
  const atributo = g.modelo ? `data-vitrine-modelo="${g.chave}"` : `data-vitrine-produto="${g.pecas[0].id}"`;
  const rotulo = g.modelo ? `Escolher cor e tamanho de ${g.nome}` : `Adicionar ${g.nome} à venda`;
  return `<button type="button" class="vit-cartao${g.saldo <= 0 ? ' sem-estoque' : ''}${g.noCarrinho ? ' no-carrinho' : ''}" ${atributo} aria-label="${escapeHtml(rotulo)}">
      <span class="vit-foto">${foto}${g.noCarrinho ? `<span class="vit-badge">${g.noCarrinho}</span>` : ''}</span>
      <span class="vit-info">
        <strong>${escapeHtml(g.nome)}</strong>
        <small>${detalhe}</small>
        <span class="vit-rodape"><b>${escapeHtml(precoDoGrupo(g))}</b>${seloSaldoVitrine(g.saldo)}</span>
      </span>
      <span class="vit-mais" aria-hidden="true">${g.modelo ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'}</span>
    </button>`;
}
function renderizarVitrine() {
  const grade = document.getElementById('pdv-grade');
  if (!grade) return;
  const todos = gruposDaVitrine();
  // categorias
  const categorias = [...new Set(todos.map((g) => g.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  if (vitrineCategoria && !categorias.includes(vitrineCategoria)) vitrineCategoria = '';
  const chips = ['', ...categorias].map((c) => `<button type="button" class="pdv-chip${c === vitrineCategoria ? ' ativo' : ''}" data-vitrine-categoria="${escapeHtml(c)}" aria-pressed="${c === vitrineCategoria}">${escapeHtml(c || 'Todos')}</button>`).join('');
  const areaChips = document.getElementById('pdv-categorias');
  if (areaChips._html !== chips) { areaChips._html = chips; areaChips.innerHTML = chips; }
  const visiveis = gruposVisiveis();
  let html;
  if (!todos.length) html = '<div class="pdv-grade-vazia"><strong>Nenhum produto cadastrado</strong><span>Cadastre em Produtos &amp; Estoque.</span></div>';
  else if (!visiveis.length) html = '<div class="pdv-grade-vazia"><strong>Nada encontrado</strong><span>Tente outro nome ou outra categoria.</span></div>';
  else {
    html = visiveis.slice(0, vitrineLimite).map(htmlCartaoVitrine).join('');
    if (visiveis.length > vitrineLimite) html += `<button type="button" class="pdv-mostrar-mais" data-vitrine-mais>Mostrar mais ${visiveis.length - vitrineLimite}</button>`;
  }
  if (html !== vitrineHtml) { vitrineHtml = html; grade.innerHTML = html; }
  if (variacoesAbertas) renderizarVariacoes();
}

// Grade cor × tamanho de um modelo
function abrirVariacoes(chave) {
  variacoesAbertas = chave;
  renderizarVariacoes();
  abrirDialogo('pdv-variacoes');
  document.querySelector('#pdv-variacoes-grade .var-botao:not([disabled])')?.focus();
}
function renderizarVariacoes() {
  const g = gruposDaVitrine().find((x) => x.chave === variacoesAbertas);
  const grade = document.getElementById('pdv-variacoes-grade');
  if (!g || !grade) return;
  document.getElementById('pdv-variacoes-titulo').textContent = g.nome;
  document.getElementById('pdv-variacoes-preco').textContent = `${precoDoGrupo(g)} · ${g.saldo} em estoque${g.noCarrinho ? ` · ${g.noCarrinho} na venda` : ''}`;
  const foto = document.getElementById('pdv-variacoes-foto');
  const htmlFoto = g.foto ? `<img src="${urlFoto(g.foto)}" alt="">` : '';
  if (foto._html !== htmlFoto) { foto._html = htmlFoto; foto.innerHTML = htmlFoto; foto.hidden = !g.foto; }
  const negativo = permiteEstoqueNegativo();
  const html = g.cores.map((cor) => `<div class="var-linha"><span class="var-cor">${escapeHtml(cor)}</span><div class="var-tamanhos">${g.tamanhos.map((tam) => {
      const p = g.pecas.find((x) => x.cor === cor && x.tamanho === tam);
      if (!p) return '<span class="var-botao var-vazio" aria-hidden="true"></span>';
      const saldo = Number(p.estoque || 0);
      const na = quantidadeNoCarrinho(p.id);
      const livre = saldo - na;
      const bloqueado = !negativo && livre <= 0;
      return `<button type="button" class="var-botao${saldo <= 0 ? ' zerado' : saldo <= limiteEstoqueAviso() ? ' baixo' : ''}${na ? ' escolhido' : ''}" data-variacao="${p.id}"${bloqueado ? ' disabled' : ''} aria-label="${escapeHtml(`${cor} ${tam}: ${saldo} em estoque${na ? `, ${na} na venda` : ''}`)}">
          <b>${escapeHtml(tam)}</b><small>${saldo <= 0 ? 'esgotado' : `${saldo} un.`}</small>${na ? `<i>${na}</i>` : ''}</button>`;
    }).join('')}</div></div>`).join('');
  if (grade._html !== html) { grade._html = html; grade.innerHTML = html; }
}

// Carrinho
function adicionarAoCarrinho(produtoId, quantidade = 1) {
  const produto = (relatorioProdutosState || []).find((p) => Number(p.id) === Number(produtoId));
  if (!produto) return false;
  if (!cpfVenda || !cpfVenda.respondido) { perguntarCpfNota(); return false; }
  const saldo = Number(produto.estoque || 0);
  const novo = quantidadeNoCarrinho(produto.id) + quantidade;
  if (!permiteEstoqueNegativo() && novo > saldo) {
    showToast(saldo <= 0 ? `${produto.nome} está esgotado.` : `Só há ${plural(saldo, 'unidade', 'unidades')} de ${produto.nome} em estoque.`, 'error');
    return false;
  }
  somarLinhaNoCarrinho(itensVenda, { produto_id: Number(produto.id), nome: produto.nome, preco: Number(produto.preco), quantidade });
  brindeVenda = null;
  ultimoItemCarrinho = { id: Number(produto.id) };
  renderizarItensVenda();
  atualizarResumoVenda();
  atualizarAvisoEstoqueVenda();
  renderizarVitrine();
  pulsarCarrinho();
  return true;
}
function definirQuantidadeItem(produtoId, quantidade) {
  const item = itensVenda.find((i) => i.produto_id === Number(produtoId));
  if (!item) return;
  const qtd = Math.floor(Number(quantidade));
  if (!Number.isFinite(qtd) || qtd < 1) { removerItemVenda(produtoId); return; }
  const saldo = Number((relatorioProdutosState || []).find((p) => Number(p.id) === item.produto_id)?.estoque || 0);
  if (!permiteEstoqueNegativo() && qtd > saldo) {
    showToast(`Só há ${plural(saldo, 'unidade', 'unidades')} de ${item.nome} em estoque.`, 'error');
    item.quantidade = Math.max(1, saldo);
  } else item.quantidade = qtd;
  brindeVenda = null;
  ultimoItemCarrinho = { id: item.produto_id };
  renderizarItensVenda();
  atualizarResumoVenda();
  atualizarAvisoEstoqueVenda();
  renderizarVitrine();
}
function pulsarCarrinho() {
  ['pdv-contador', 'pdv-barra-qtd'].forEach((id) => { const el = document.getElementById(id); if (!el) return; el.classList.remove('pulso'); void el.offsetWidth; el.classList.add('pulso'); });
}
function detalheDoItem(item) {
  const p = (relatorioProdutosState || []).find((x) => Number(x.id) === item.produto_id);
  if (p && p.modelo_id && p.cor) return { titulo: nomeDoModelo(p), sub: `${p.cor} · ${p.tamanho}`, foto: p.id_foto_efetivo };
  return { titulo: item.nome, sub: p?.categoria || '', foto: p?.id_foto_efetivo || null };
}
// Desenha a venda atual (substitui a lista simples de antes).
function renderizarItensVenda() {
  const grupo = document.getElementById('venda-itens-grupo');
  const lista = document.getElementById('venda-itens');
  if (!grupo || !lista) return;
  grupo.classList.toggle('hidden', !itensVenda.length);
  lista.innerHTML = itensVenda.map((item) => {
    const d = detalheDoItem(item);
    return `<div class="venda-item" data-item="${item.produto_id}">
      <span class="venda-item-foto">${d.foto ? `<img src="${urlFoto(d.foto)}" alt="" loading="lazy">` : `<span>${escapeHtml(d.titulo.slice(0, 1).toUpperCase())}</span>`}</span>
      <div class="venda-item-info"><strong>${escapeHtml(d.titulo)}</strong><small>${escapeHtml([d.sub, formatarMoeda(item.preco)].filter(Boolean).join(' · '))}</small></div>
      <div class="pdv-stepper pdv-stepper-item">
        <button type="button" data-item-menos="${item.produto_id}" aria-label="Tirar uma unidade de ${escapeHtml(item.nome)}">−</button>
        <input type="number" min="1" step="1" inputmode="numeric" value="${item.quantidade}" data-item-qtd="${item.produto_id}" aria-label="Quantidade de ${escapeHtml(item.nome)}">
        <button type="button" data-item-mais="${item.produto_id}" aria-label="Somar uma unidade de ${escapeHtml(item.nome)}">+</button>
      </div>
      <span class="venda-item-total">${escapeHtml(formatarMoeda(Math.round(item.preco * item.quantidade * 100) / 100))}</span>
      <button type="button" class="venda-item-remover" data-remover-item="${item.produto_id}" aria-label="Remover ${escapeHtml(item.nome)} da venda"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>`;
  }).join('');
  atualizarPainelVenda();
}
// Totais, contador, botão de finalizar e barra do celular. Chamado por atualizarResumoVenda.
function atualizarPainelVenda() {
  const pecas = totalPecasVenda(itensDaVendaAtual());
  const subtotal = Number(document.getElementById('venda-subtotal')?.value) || 0;
  const desconto = Number(document.getElementById('venda-desconto-valor')?.value) || 0;
  const total = Number(document.getElementById('venda-total')?.value) || 0;
  const texto = (id, valor) => { const el = document.getElementById(id); if (el && el.textContent !== valor) el.textContent = valor; };
  texto('pdv-contador', String(pecas));
  texto('pdv-barra-qtd', String(pecas));
  texto('pdv-subtotal-texto', formatarMoeda(subtotal));
  texto('pdv-desconto-texto', `− ${formatarMoeda(desconto)}`);
  texto('pdv-total-texto', formatarMoeda(total));
  texto('pdv-barra-total', formatarMoeda(total));
  texto('pdv-finalizar-total', pecas ? formatarMoeda(total) : '');
  const linhaDesconto = document.getElementById('pdv-desconto-linha');
  if (linhaDesconto) linhaDesconto.hidden = !(desconto > 0);
  const vazio = !pecas;
  document.getElementById('pdv-vazio')?.toggleAttribute('hidden', !vazio);
  document.getElementById('pdv-limpar-venda')?.toggleAttribute('hidden', vazio);
  const finalizar = document.getElementById('pdv-finalizar');
  if (finalizar) finalizar.disabled = vazio;
  const barra = document.getElementById('pdv-abrir-carrinho');
  if (barra) barra.hidden = vazio;
  if (vazio) fecharCarrinhoCelular();
  sincronizarBotoesPagamento();
  if (document.getElementById('venda-pagamento')?.value === 'Diversificado') atualizarDivisao();
  const parcelas = Number(document.getElementById('venda-parcelas')?.value) || 1;
  texto('pdv-parcela-valor', parcelas > 1 && total ? `${parcelas}x de ${formatarMoeda(Math.round(total / parcelas * 100) / 100)}` : 'À vista');
}
function abrirCarrinhoCelular() { document.body.classList.add('pdv-carrinho-aberto'); document.querySelector('#pdv-carrinho .pdv-form')?.scrollTo?.(0, 0); }
function fecharCarrinhoCelular() { document.body.classList.remove('pdv-carrinho-aberto'); }
function sincronizarBotoesPagamento() {
  const valor = document.getElementById('venda-pagamento').value;
  document.querySelectorAll('#pdv-pagamentos [data-forma]').forEach((b) => { const ativo = b.dataset.forma === valor; b.classList.toggle('ativo', ativo); b.setAttribute('aria-checked', String(ativo)); b.tabIndex = ativo ? 0 : -1; });
}

function configurarPdv() {
  const grade = document.getElementById('pdv-grade');
  const busca = document.getElementById('venda-produto-busca');
  grade.addEventListener('click', (e) => {
    const modelo = e.target.closest('[data-vitrine-modelo]');
    const produto = e.target.closest('[data-vitrine-produto]');
    if (e.target.closest('[data-vitrine-mais]')) { vitrineLimite += 60; renderizarVitrine(); return; }
    if (modelo) {
      if (!cpfVenda || !cpfVenda.respondido) { perguntarCpfNota(); return; }
      abrirVariacoes(modelo.dataset.vitrineModelo);
    } else if (produto) adicionarAoCarrinho(produto.dataset.vitrineProduto, 1);
  });
  document.getElementById('pdv-categorias').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-vitrine-categoria]');
    if (!chip) return;
    vitrineCategoria = chip.dataset.vitrineCategoria;
    vitrineLimite = 60;
    renderizarVitrine();
  });
  busca.addEventListener('input', () => { vitrineLimite = 60; renderizarVitrine(); });
  busca.addEventListener('keydown', (e) => {
    // Enter com um resultado só: adiciona (peça única) ou abre a grade (modelo).
    if (e.key === 'Escape' && busca.value) { e.preventDefault(); busca.value = ''; renderizarVitrine(); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const visiveis = gruposVisiveis();
    if (visiveis.length !== 1) { if (visiveis.length > 1) showToast('Mais de um produto encontrado: toque no que quer vender.', 'warning'); return; }
    const g = visiveis[0];
    if (g.modelo) { if (cpfVenda?.respondido) abrirVariacoes(g.chave); else perguntarCpfNota(); }
    else if (adicionarAoCarrinho(g.pecas[0].id, 1)) { busca.value = ''; renderizarVitrine(); }
  });
  // Atalho "/" (ou F2) leva para a busca quando a tela de venda está aberta.
  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('tab-vendas')?.classList.contains('active') || document.querySelector('.dialogo:not(.hidden)')) return;
    const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    if ((e.key === '/' && !digitando) || e.key === 'F2') { e.preventDefault(); busca.focus(); busca.select(); }
  });
  document.getElementById('pdv-variacoes-grade').addEventListener('click', (e) => {
    const botao = e.target.closest('[data-variacao]');
    if (!botao || botao.disabled) return;
    if (adicionarAoCarrinho(botao.dataset.variacao, 1)) {
      renderizarVariacoes();
      document.querySelector(`#pdv-variacoes-grade [data-variacao="${botao.dataset.variacao}"]`)?.classList.add('acabou-de-entrar');
    }
  });
  const itens = document.getElementById('venda-itens');
  itens.addEventListener('click', (e) => {
    const menos = e.target.closest('[data-item-menos]');
    const mais = e.target.closest('[data-item-mais]');
    if (menos) definirQuantidadeItem(menos.dataset.itemMenos, quantidadeNoCarrinho(menos.dataset.itemMenos) - 1);
    if (mais) definirQuantidadeItem(mais.dataset.itemMais, quantidadeNoCarrinho(mais.dataset.itemMais) + 1);
  });
  itens.addEventListener('change', (e) => { const campo = e.target.closest('[data-item-qtd]'); if (campo) definirQuantidadeItem(campo.dataset.itemQtd, campo.value); });
  itens.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-item-qtd]')) { e.preventDefault(); e.target.blur(); } });
  document.getElementById('pdv-limpar-venda').addEventListener('click', () => {
    if (!itensVenda.length) return;
    limparVendaEmAndamento();
    ultimoItemCarrinho = null;
    atualizarResumoVenda();
    atualizarAvisoEstoqueVenda();
    renderizarVitrine();
    showToast('Venda limpa. Os itens voltaram para a vitrine.');
  });
  // Pagamento em botões (o select continua sendo a fonte do valor)
  const select = document.getElementById('venda-pagamento');
  document.getElementById('pdv-pagamentos').addEventListener('click', (e) => {
    const botao = e.target.closest('[data-forma]');
    if (!botao) return;
    select.value = botao.dataset.forma;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  document.getElementById('pdv-pagamentos').addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const botoes = [...document.querySelectorAll('#pdv-pagamentos [data-forma]')];
    const atual = botoes.findIndex((b) => b.dataset.forma === select.value);
    const proximo = botoes[(atual + (['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : botoes.length - 1)) % botoes.length];
    proximo.click(); proximo.focus();
  });
  select.addEventListener('change', () => { sincronizarBotoesPagamento(); atualizarPainelVenda(); });
  sincronizarBotoesPagamento();
  document.querySelectorAll('[data-parcela]').forEach((b) => b.addEventListener('click', () => {
    const campo = document.getElementById('venda-parcelas');
    campo.value = Math.min(12, Math.max(1, (Number(campo.value) || 1) + Number(b.dataset.parcela)));
    atualizarPainelVenda();
  }));
  document.getElementById('venda-parcelas').addEventListener('input', atualizarPainelVenda);
  // Celular
  document.getElementById('pdv-abrir-carrinho').addEventListener('click', abrirCarrinhoCelular);
  document.getElementById('pdv-fechar-carrinho').addEventListener('click', fecharCarrinhoCelular);
  renderizarItensVenda();
  atualizarResumoVenda();
}
configurarPdv();

// ================= PREÇO & CUSTO (formação de preço) =================
// A conta é a de precificacao.js, a mesma do servidor: a prévia na tela e o que
// fica gravado sempre batem.
const PREC = window.Precificacao;
let precosState = { produtos: [], padroes: { ...PREC.PADROES } };
let precosAssinatura = '';
const precosVisao = { filtro: 'todos' };
let fichaEditando = null; // { produto, ficha, padroes }
const SITUACAO_PRECO = {
  ok: { rotulo: 'Na meta', classe: 'ok' },
  abaixo: { rotulo: 'Abaixo da meta', classe: 'abaixo' },
  prejuizo: { rotulo: 'Prejuízo', classe: 'prejuizo' },
  sem_custo: { rotulo: 'Sem custo lançado', classe: 'neutro' },
  erro: { rotulo: 'Percentuais acima de 100%', classe: 'prejuizo' }
};
const pctBR = (v, casas = 1) => `${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas })}%`;
const numBR = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 4 });
const lerNumeroBR = (v) => {
  const t = String(v ?? '').trim();
  if (!t) return null;
  const n = Number(t.replace(/\s|R\$/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};
const situacaoDe = (p) => (!p.ficha ? 'sem_ficha' : p.resumo?.situacao || 'sem_custo');

async function carregarPrecos(forcar = false) {
  if (!pode('precos') || !document.getElementById('lista-precos')) return;
  try {
    const r = await fetch(`${API_URL}/precificacao`, { headers: getHeadersComUsuario() });
    if (!r.ok) return;
    const dados = await r.json();
    const assinatura = JSON.stringify(dados);
    if (!forcar && assinatura === precosAssinatura) return;
    precosAssinatura = assinatura;
    precosState = dados;
    renderizarPrecos(true);
  } catch (_) { /* tenta de novo no próximo ciclo */ }
}

let precosRenderAssinatura = '';
function renderizarPrecos(forcar = false) {
  const lista = document.getElementById('lista-precos');
  if (!lista) return;
  const busca = document.getElementById('preco-busca').value.trim().toLowerCase();
  const catSel = document.getElementById('preco-categoria');
  const categorias = [...new Set(precosState.produtos.map((p) => p.categoria))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const opcoes = `<option value="">Todas as categorias</option>${categorias.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}`;
  if (catSel.dataset.opcoes !== opcoes) { const atual = catSel.value; catSel.innerHTML = opcoes; catSel.dataset.opcoes = opcoes; catSel.value = categorias.includes(atual) ? atual : ''; }
  const categoria = catSel.value;
  const assinatura = JSON.stringify([precosAssinatura, busca, categoria, precosVisao.filtro, pode('precos', 'editar')]);
  if (!forcar && assinatura === precosRenderAssinatura) return;
  precosRenderAssinatura = assinatura;

  const todos = precosState.produtos;
  const comFicha = todos.filter((p) => p.ficha);
  const comMargem = comFicha.filter((p) => p.resumo && p.resumo.margem_pct !== null && p.resumo.custo > 0);
  const media = comMargem.length ? comMargem.reduce((s, p) => s + p.resumo.margem_pct, 0) / comMargem.length : null;
  const conta = (sit) => todos.filter((p) => situacaoDe(p) === sit).length;
  const prejuizo = conta('prejuizo') + conta('erro'), abaixo = conta('abaixo');
  document.getElementById('preco-resumo').innerHTML = [
    tileResumo({ rotulo: 'Com ficha de custo', valor: `${comFicha.length}<small class="tile-de"> de ${todos.length}</small>`, detalhe: comFicha.length === todos.length ? 'todos calculados' : `${todos.length - comFicha.length} sem ficha`, filtro: 'sem_ficha', painel: 'preco' }),
    tileResumo({ rotulo: 'Margem média', valor: media === null ? '—' : pctBR(media), detalhe: `meta da loja: ${pctBR(precosState.padroes.margem_pct)}`, tom: media === null ? 'zerado' : media < precosState.padroes.margem_pct - 0.5 ? 'resumo-alerta' : 'resumo-ok' }),
    tileResumo({ rotulo: 'No prejuízo', valor: String(prejuizo), detalhe: prejuizo ? 'preço não cobre os custos' : 'nenhum produto', tom: prejuizo ? 'resumo-perigo' : 'zerado', filtro: 'prejuizo', painel: 'preco' }),
    tileResumo({ rotulo: 'Abaixo da meta', valor: String(abaixo), detalhe: abaixo ? 'lucro menor que o desejado' : 'nenhum produto', tom: abaixo ? 'resumo-alerta' : 'zerado', filtro: 'abaixo', painel: 'preco' })
  ].join('');

  const base = todos.filter((p) => (!categoria || p.categoria === categoria) && (!busca || `${p.nome} ${p.categoria}`.toLowerCase().includes(busca)));
  const filtros = { todos: () => true, sem_ficha: (p) => !p.ficha, prejuizo: (p) => ['prejuizo', 'erro'].includes(situacaoDe(p)), abaixo: (p) => situacaoDe(p) === 'abaixo', ok: (p) => situacaoDe(p) === 'ok' };
  document.querySelectorAll('[data-preco-filtro]').forEach((b) => {
    b.classList.toggle('ativo', b.dataset.precoFiltro === precosVisao.filtro);
    b.querySelector('span').textContent = base.filter(filtros[b.dataset.precoFiltro]).length;
  });
  // Primeiro o que pede atenção: prejuízo, abaixo da meta, sem ficha, na meta.
  const ordem = { erro: 0, prejuizo: 0, abaixo: 1, sem_custo: 2, sem_ficha: 3, ok: 4 };
  const itens = base.filter(filtros[precosVisao.filtro]).sort((a, b) => (ordem[situacaoDe(a)] - ordem[situacaoDe(b)]) || (Number(b.ativo) - Number(a.ativo)) || a.nome.localeCompare(b.nome, 'pt-BR'));
  if (!itens.length) {
    const vazio = { todos: 'Nenhum produto encontrado.', sem_ficha: 'Todos os produtos já têm ficha de custo. 🎉', prejuizo: 'Nenhum produto no prejuízo. 🎉', abaixo: 'Nenhum produto abaixo da meta.', ok: 'Nenhum produto na meta ainda.' }[precosVisao.filtro];
    lista.innerHTML = `<div class="fin-vazio"><strong>${vazio}</strong>${!todos.length ? '<span>Cadastre produtos em <b>Produtos &amp; Estoque</b> para calcular o preço.</span>' : ''}</div>`;
    return;
  }
  const editar = pode('precos', 'editar');
  lista.innerHTML = itens.map((p) => {
    const sit = situacaoDe(p);
    const tipo = p.tipo === 'modelo' ? `Modelo${p.variacoes ? ` · ${p.variacoes} ${p.variacoes === 1 ? 'variação' : 'variações'}` : ''}` : 'Peça única';
    const tags = `<span class="etq">${escapeHtml(p.categoria)}</span><span class="etq">${tipo}</span>${p.ativo ? '' : '<span class="etq etq-off">Inativo</span>'}`;
    const botao = `<button type="button" class="btn btn-sm ${p.ficha ? 'btn-secondary' : 'btn-accent'}" data-abrir-ficha="${p.tipo}:${p.id}">${p.ficha ? 'Abrir ficha' : editar ? 'Montar ficha' : 'Ver'}</button>`;
    if (!p.ficha) {
      return `<article class="preco-item sem-ficha"><div class="preco-sit neutro" aria-hidden="true">?</div>
        <div class="fin-info"><strong>${escapeHtml(p.nome)}</strong><div class="fin-tags">${tags}</div></div>
        <div class="preco-num"><small>Preço atual</small><strong>${formatarMoeda(p.preco)}</strong></div>
        <p class="preco-semficha">Sem ficha de custo: não dá para saber se este preço dá lucro.</p>
        <div class="fin-acoes">${botao}</div></article>`;
    }
    const r = p.resumo, s = SITUACAO_PRECO[sit] || SITUACAO_PRECO.sem_custo;
    const diferenca = r.preco_sugerido !== null ? Math.round((r.preco_sugerido - p.preco) * 100) / 100 : null;
    return `<article class="preco-item ${s.classe}">
      <div class="preco-sit ${s.classe}" title="${s.rotulo}" aria-hidden="true">${sit === 'ok' ? '✓' : sit === 'abaixo' ? '!' : sit === 'sem_custo' ? '?' : '×'}</div>
      <div class="fin-info"><strong>${escapeHtml(p.nome)}</strong><div class="fin-tags">${tags}<span class="etq etq-sit-${s.classe}">${s.rotulo}</span></div></div>
      <div class="preco-num"><small>Custo</small><strong>${formatarMoeda(r.custo)}</strong></div>
      <div class="preco-num"><small>Preço atual</small><strong>${formatarMoeda(p.preco)}</strong></div>
      <div class="preco-num preco-lucro ${s.classe}"><small>Lucro por peça</small><strong>${r.lucro === null ? '—' : formatarMoeda(r.lucro)}</strong><em>${r.margem_pct === null ? '' : pctBR(r.margem_pct)}</em></div>
      <div class="preco-num"><small>Sugerido</small><strong>${r.preco_sugerido === null ? '—' : formatarMoeda(r.preco_sugerido)}</strong><em>${diferenca ? `${diferenca > 0 ? '+' : '−'} ${formatarMoeda(Math.abs(diferenca))}` : diferenca === 0 ? 'igual ao atual' : ''}</em></div>
      <div class="fin-acoes">${botao}</div>
    </article>`;
  }).join('');
}

// ---------- Padrões da loja ----------
function htmlCamposPct(prefixo, valores, padroes) {
  return PREC.PERCENTUAIS.map(({ chave, nome, ajuda }) => {
    const v = valores?.[chave];
    const marcador = padroes ? `padrão ${pctBR(padroes[chave], 2)}` : '';
    return `<label class="preco-pct${chave === 'margem_pct' ? ' preco-pct-lucro' : ''}"><span>${nome}</span>
      <span class="preco-pct-campo"><input type="text" inputmode="decimal" data-${prefixo}-pct="${chave}" value="${v === null || v === undefined ? '' : String(v).replace('.', ',')}" placeholder="${marcador || '0'}" autocomplete="off" aria-label="${nome} em %"><b>%</b></span>
      <small>${ajuda}</small></label>`;
  }).join('');
}
const opcoesArred = (comPadrao, padrao) => `${comPadrao ? `<option value="">Padrão da loja (${PREC.ARREDONDAMENTOS[padrao] || ''})</option>` : ''}${Object.entries(PREC.ARREDONDAMENTOS).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}`;
function lerPadroesForm() {
  const saida = {};
  document.querySelectorAll('[data-padrao-pct]').forEach((c) => { saida[c.dataset.padraoPct] = lerNumeroBR(c.value); });
  saida.arredondamento = document.getElementById('preco-padroes-arred').value;
  return saida;
}
function atualizarSobraPadroes() {
  const v = lerPadroesForm();
  const soma = PREC.PERCENTUAIS.reduce((s, { chave }) => s + (Number(v[chave]) || 0), 0);
  const sobra = 100 - soma;
  document.getElementById('preco-padroes-sobra').innerHTML = sobra <= 0
    ? '<strong class="txt-perigo">A soma passou de 100%: não sobra nada para pagar o custo.</strong>'
    : `Somando tudo dá <b>${pctBR(soma, 2)}</b>; sobram <b>${pctBR(sobra, 2)}</b> do preço para o custo. Na prática, o preço fica o custo × <b>${(100 / sobra).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</b>.`;
}
function abrirPadroesPreco() {
  const p = precosState.padroes;
  document.getElementById('preco-padroes-campos').innerHTML = htmlCamposPct('padrao', p, null);
  document.getElementById('preco-padroes-arred').innerHTML = opcoesArred(false);
  document.getElementById('preco-padroes-arred').value = p.arredondamento || '90';
  const editar = pode('precos', 'editar');
  document.querySelectorAll('#form-preco-padroes input, #form-preco-padroes select').forEach((c) => { c.disabled = !editar; });
  document.querySelector('#form-preco-padroes button[type="submit"]').hidden = !editar;
  atualizarSobraPadroes();
  abrirDialogo('modal-preco-padroes');
}
document.getElementById('preco-padroes-abrir').addEventListener('click', abrirPadroesPreco);
document.getElementById('form-preco-padroes').addEventListener('input', atualizarSobraPadroes);
document.getElementById('form-preco-padroes').addEventListener('submit', async (e) => {
  e.preventDefault();
  const corpo = lerPadroesForm();
  for (const { chave, nome } of PREC.PERCENTUAIS) if (corpo[chave] === null) corpo[chave] = 0; else if (Number.isNaN(corpo[chave])) return showToast(`${nome}: número inválido.`, 'error');
  const r = await fetch(`${API_URL}/precificacao/padroes`, { method: 'PUT', headers: getHeadersComUsuario(), body: JSON.stringify(corpo) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return showToast(d.error || 'Não foi possível salvar.', 'error');
  showToast(d.mensagem);
  fecharDialogo('modal-preco-padroes');
  await carregarPrecos(true);
});

// ---------- Ficha de custo ----------
const UNIDADE_PADRAO = { Tecido: 'm', Aviamentos: 'un', Corte: 'peça', Costura: 'peça', Estampa: 'peça', Acabamento: 'peça', 'Etiqueta e embalagem': 'un', Frete: 'un', 'Mão de obra': 'hora', Outro: 'un' };
const DICA_ETAPA = { Tecido: 'Ex.: malha 30.1 penteada', Aviamentos: 'Ex.: zíper, botão, cordão', Corte: 'Ex.: corte terceirizado', Costura: 'Ex.: oficina de costura', Estampa: 'Ex.: silk 2 cores, DTF', Acabamento: 'Ex.: lavagem, passadoria', 'Etiqueta e embalagem': 'Ex.: tag, saquinho', Frete: 'Ex.: frete do tecido rateado', 'Mão de obra': 'Ex.: horas de produção', Outro: '' };
function htmlLinhaFicha(item = {}) {
  const etapa = item.etapa || 'Tecido';
  const unidade = item.unidade || UNIDADE_PADRAO[etapa] || 'un';
  const v = (x) => (x === null || x === undefined || x === '' ? '' : String(x).replace('.', ','));
  return `<div class="ficha-linha">
    <select data-campo="etapa" aria-label="Etapa">${PREC.ETAPAS.map((e) => `<option${e === etapa ? ' selected' : ''}>${e}</option>`).join('')}</select>
    <input type="text" data-campo="descricao" maxlength="80" value="${escapeHtml(item.descricao || '')}" placeholder="${DICA_ETAPA[etapa] || 'Descrição'}" aria-label="Descrição">
    <span class="ficha-qtd"><input type="text" inputmode="decimal" data-campo="quantidade" value="${v(item.quantidade ?? 1)}" aria-label="Quantidade"><select data-campo="unidade" aria-label="Unidade">${PREC.UNIDADES.map((u) => `<option${u === unidade ? ' selected' : ''}>${u}</option>`).join('')}</select></span>
    <span class="ficha-rs"><b>R$</b><input type="text" inputmode="decimal" data-campo="valor_unitario" value="${v(item.valor_unitario)}" placeholder="0,00" aria-label="Valor unitário"></span>
    <span class="ficha-rende"><input type="text" inputmode="decimal" data-campo="rendimento" value="${v(item.rendimento ?? 1)}" aria-label="Rende quantas peças" title="Quantas peças saem dessa quantidade. Ex.: 1 kg de malha rende 3 camisetas."><small>pç</small></span>
    <output class="ficha-sub-valor" data-subtotal>—</output>
    <button type="button" class="fin-icone perigo so-ficha-edicao" data-remover-linha title="Remover" aria-label="Remover custo">${svgIcone('x')}</button>
  </div>`;
}
function lerFichaDoForm() {
  const itens = [];
  document.querySelectorAll('#ficha-itens .ficha-linha').forEach((linha) => {
    const campo = (n) => linha.querySelector(`[data-campo="${n}"]`).value;
    const valor = lerNumeroBR(campo('valor_unitario'));
    itens.push({ linha, etapa: campo('etapa'), descricao: campo('descricao').trim(), quantidade: lerNumeroBR(campo('quantidade')), unidade: campo('unidade'), valor_unitario: valor, rendimento: lerNumeroBR(campo('rendimento')) ?? 1 });
  });
  const ficha = { itens: itens.filter((i) => i.valor_unitario !== null), todasLinhas: itens };
  document.querySelectorAll('[data-ficha-pct]').forEach((c) => { ficha[c.dataset.fichaPct] = lerNumeroBR(c.value); });
  ficha.arredondamento = document.getElementById('ficha-arred').value || null;
  ficha.observacoes = document.getElementById('ficha-obs').value;
  return ficha;
}
function htmlBarraComposicao(a) {
  const partes = [['custo', 'Custo', a.custo], ['imposto', 'Impostos', a.imposto], ['taxa', 'Taxa', a.taxa], ['comissao', 'Comissão', a.comissao], ['despesas', 'Despesas', a.despesas], ['lucro', a.lucro < 0 ? 'Prejuízo' : 'Lucro', a.lucro]];
  const total = a.preco > 0 ? a.preco : 1;
  const visiveis = partes.filter(([, , v]) => v > 0);
  return `<div class="ficha-barra" role="img" aria-label="Para onde vai o dinheiro do preço">${visiveis.map(([k, , v]) => `<i class="cp-${k}" style="width:${Math.max(1.5, (v / total) * 100)}%"></i>`).join('')}</div>
    <ul class="ficha-legenda">${partes.filter(([k, , v]) => v !== 0 || k === 'lucro').map(([k, n, v]) => `<li class="cp-${k}${k === 'lucro' && v < 0 ? ' negativo' : ''}"><i></i>${n}<b>${formatarMoeda(v)}</b><small>${pctBR(a.preco > 0 ? (v / a.preco) * 100 : 0)}</small></li>`).join('')}</ul>`;
}
function atualizarPreviaFicha() {
  if (!fichaEditando) return;
  const lida = lerFichaDoForm();
  const valida = lida.itens.filter((i) => i.quantidade > 0 && !Number.isNaN(i.valor_unitario) && i.rendimento > 0);
  lida.todasLinhas.forEach((i) => {
    const ok = i.valor_unitario !== null && !Number.isNaN(i.valor_unitario) && i.quantidade > 0 && i.rendimento > 0;
    i.linha.querySelector('[data-subtotal]').textContent = ok ? formatarMoeda(PREC.subtotalItem(i)) : '—';
  });
  const pcts = {};
  for (const { chave } of PREC.PERCENTUAIS) pcts[chave] = Number.isNaN(lida[chave]) ? null : lida[chave];
  const c = PREC.calcular({ ...pcts, arredondamento: lida.arredondamento, itens: valida }, fichaEditando.padroes, fichaEditando.produto.preco);
  fichaEditando.calculo = c;
  const editar = pode('precos', 'editar');
  const etapas = Object.entries(c.por_etapa).sort((a, b) => b[1] - a[1]);
  const p = c.percentuais;
  const atual = c.atual, sit = atual ? SITUACAO_PRECO[atual.situacao] : null;
  const simulado = lerNumeroBR(document.querySelector('#ficha-simular')?.value);
  const sim = simulado > 0 ? PREC.analisarPreco(simulado, c.custo, p) : null;
  const precoSugeridoIgual = c.preco_sugerido !== null && Math.abs(c.preco_sugerido - fichaEditando.produto.preco) < 0.005;
  document.getElementById('ficha-resultado').innerHTML = `
    <div class="ficha-res-custo"><span>Custo de uma peça</span><strong>${formatarMoeda(c.custo)}</strong>
      ${etapas.length ? `<ul class="ficha-etapas">${etapas.map(([e, v]) => `<li><span>${escapeHtml(e)}</span><i style="--p:${c.custo ? (v / c.custo) * 100 : 0}%"></i><b>${formatarMoeda(v)}</b></li>`).join('')}</ul>` : '<small>Lance o valor do tecido, do corte, da costura...</small>'}
    </div>
    ${c.erro ? `<div class="ficha-alerta perigo">${escapeHtml(c.erro)}</div>` : c.custo > 0 ? `
    <div class="ficha-res-sugerido">
      <span>Preço sugerido</span><strong>${formatarMoeda(c.preco_sugerido)}</strong>
      <small>Conta: ${formatarMoeda(c.custo)} ÷ ${String(c.divisor).replace('.', ',')} = ${formatarMoeda(c.preco_calculado)}${c.preco_sugerido !== c.preco_calculado ? ` · ${PREC.ARREDONDAMENTOS[p.arredondamento].toLowerCase()}` : ''}</small>
      ${editar ? (precoSugeridoIgual ? '<em class="ficha-ja-aplicado">✓ Já é o preço de venda</em>' : `<button type="button" class="btn btn-accent btn-sm" data-aplicar-preco="${c.preco_sugerido}">Usar ${formatarMoeda(c.preco_sugerido)} como preço de venda</button>`) : ''}
    </div>
    <div class="ficha-res-bloco"><h5>Para onde vai o dinheiro de cada venda</h5>${htmlBarraComposicao(c.sugerido)}</div>
    <dl class="ficha-dl">
      <div><dt>Preço mínimo <small>(lucro zero)</small></dt><dd>${formatarMoeda(c.preco_minimo)}</dd></div>
      <div><dt>Markup <small>(preço ÷ custo)</small></dt><dd>× ${String(c.markup).replace('.', ',')}</dd></div>
      <div><dt>Percentuais</dt><dd>${pctBR(c.soma_percentuais, 2)}</dd></div>
    </dl>
    <div class="ficha-res-bloco ficha-atual ${sit ? sit.classe : ''}">
      <h5>Preço de venda hoje: ${formatarMoeda(fichaEditando.produto.preco)}</h5>
      ${atual ? `<p><span class="etq etq-sit-${sit.classe}">${sit.rotulo}</span> ${atual.lucro < 0 ? `Cada peça vendida <b>perde ${formatarMoeda(-atual.lucro)}</b>.` : `Sobra <b>${formatarMoeda(atual.lucro)}</b> por peça (${pctBR(atual.margem_pct)}; meta ${pctBR(p.margem_pct)}).`}</p>` : ''}
    </div>` : '<div class="ficha-alerta">Preencha pelo menos um custo para ver o preço sugerido.</div>'}
    <div class="ficha-res-bloco ficha-simular">
      <label for="ficha-simular"><h5>E se eu vender por…</h5></label>
      <span class="ficha-rs"><b>R$</b><input type="text" inputmode="decimal" id="ficha-simular" value="${escapeHtml(document.querySelector('#ficha-simular')?.value || '')}" placeholder="${c.preco_sugerido ? c.preco_sugerido.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}" autocomplete="off"></span>
      ${sim && c.custo > 0 ? `<p class="${SITUACAO_PRECO[sim.situacao].classe}">${sim.lucro < 0 ? `Prejuízo de <b>${formatarMoeda(-sim.lucro)}</b> por peça.` : `Lucro de <b>${formatarMoeda(sim.lucro)}</b> por peça (${pctBR(sim.margem_pct)}).`}</p>${editar && sim.preco !== fichaEditando.produto.preco ? `<button type="button" class="btn btn-secondary btn-sm" data-aplicar-preco="${sim.preco}">Usar ${formatarMoeda(sim.preco)}</button>` : ''}` : ''}
    </div>`;
  const foco = document.activeElement?.id === 'ficha-simular';
  if (foco) { const s = document.querySelector('#ficha-simular'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
}
async function abrirFichaCusto(tipo, id) {
  const r = await fetch(`${API_URL}/precificacao/${tipo}/${id}`, { headers: getHeadersComUsuario() });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return showToast(d.error || 'Não foi possível abrir a ficha.', 'error');
  fichaEditando = { produto: d.produto, ficha: d.ficha, padroes: d.padroes };
  const p = d.produto;
  document.getElementById('ficha-titulo').textContent = d.ficha ? 'Ficha de custo' : 'Nova ficha de custo';
  document.getElementById('ficha-sub').innerHTML = `<b>${escapeHtml(p.nome)}</b> · ${escapeHtml(p.categoria)} · ${p.tipo === 'modelo' ? `modelo${p.variacoes ? ` (o preço vale para as ${p.variacoes} variações)` : ''}` : 'peça única'} · vende hoje por <b>${formatarMoeda(p.preco)}</b>`;
  const itens = d.ficha?.itens?.length ? d.ficha.itens : [{ etapa: 'Tecido', unidade: 'm' }, { etapa: 'Corte', unidade: 'peça' }, { etapa: 'Costura', unidade: 'peça' }, { etapa: 'Estampa', unidade: 'peça' }, { etapa: 'Etiqueta e embalagem', unidade: 'un' }];
  document.getElementById('ficha-itens').innerHTML = itens.map(htmlLinhaFicha).join('');
  document.getElementById('ficha-atalhos').innerHTML = `<span>Adicionar:</span>${PREC.ETAPAS.map((e) => `<button type="button" class="ficha-atalho" data-add-etapa="${e}">+ ${e}</button>`).join('')}`;
  document.getElementById('ficha-pcts').innerHTML = htmlCamposPct('ficha', d.ficha || {}, d.padroes);
  document.getElementById('ficha-arred').innerHTML = opcoesArred(true, d.padroes.arredondamento);
  document.getElementById('ficha-arred').value = d.ficha?.arredondamento || '';
  document.getElementById('ficha-obs').value = d.ficha?.observacoes || '';
  const editar = pode('precos', 'editar');
  const caixa = document.getElementById('modal-ficha-custo');
  caixa.classList.toggle('ficha-leitura', !editar);
  caixa.querySelectorAll('.ficha-esq input, .ficha-esq select, .ficha-esq textarea').forEach((c) => { c.disabled = !editar; });
  document.getElementById('ficha-apagar').hidden = !d.ficha || !editar;
  atualizarPreviaFicha();
  abrirDialogo('modal-ficha-custo');
  if (editar && !d.ficha) setTimeout(() => document.querySelector('#ficha-itens [data-campo="valor_unitario"]')?.focus(), 50);
}
// Valida e grava; devolve true se deu certo.
async function salvarFicha({ silencioso = false } = {}) {
  const lida = lerFichaDoForm();
  for (const [n, i] of lida.todasLinhas.entries()) {
    if (i.valor_unitario === null) continue;
    if (Number.isNaN(i.valor_unitario)) { i.linha.querySelector('[data-campo="valor_unitario"]').focus(); showToast(`Linha ${n + 1}: valor inválido.`, 'error'); return false; }
    if (!(i.quantidade > 0)) { i.linha.querySelector('[data-campo="quantidade"]').focus(); showToast(`Linha ${n + 1}: informe a quantidade.`, 'error'); return false; }
    if (!(i.rendimento > 0)) { i.linha.querySelector('[data-campo="rendimento"]').focus(); showToast(`Linha ${n + 1}: o rendimento precisa ser maior que zero.`, 'error'); return false; }
  }
  for (const { chave, nome } of PREC.PERCENTUAIS) if (Number.isNaN(lida[chave])) { showToast(`${nome}: número inválido.`, 'error'); return false; }
  const corpo = { ...lida, itens: lida.itens.map(({ linha, ...i }) => i) };
  delete corpo.todasLinhas;
  const { tipo, id } = fichaEditando.produto;
  const r = await fetch(`${API_URL}/precificacao/${tipo}/${id}`, { method: 'PUT', headers: getHeadersComUsuario(), body: JSON.stringify(corpo) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { showToast(d.error || 'Não foi possível salvar.', 'error'); return false; }
  fichaEditando.ficha = d.ficha;
  document.getElementById('ficha-apagar').hidden = false;
  document.getElementById('ficha-titulo').textContent = 'Ficha de custo';
  if (!silencioso) showToast(d.mensagem);
  carregarPrecos(true);
  return true;
}
async function aplicarPrecoFicha(preco) {
  const { produto } = fichaEditando;
  const alvo = produto.tipo === 'modelo' && produto.variacoes ? `o modelo e as ${produto.variacoes} variações` : 'o produto';
  if (!confirm(`Mudar o preço de venda de "${produto.nome}" de ${formatarMoeda(produto.preco)} para ${formatarMoeda(preco)}?\n\nVale para ${alvo}, no PDV e na vitrine. As vendas já feitas não mudam.`)) return;
  if (!(await salvarFicha({ silencioso: true }))) return;
  const r = await fetch(`${API_URL}/precificacao/${produto.tipo}/${produto.id}/aplicar-preco`, { method: 'POST', headers: getHeadersComUsuario(), body: JSON.stringify({ preco }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return showToast(d.error || 'Não foi possível mudar o preço.', 'error');
  showToast(d.mensagem);
  fichaEditando.produto.preco = d.preco;
  document.getElementById('ficha-sub').innerHTML = document.getElementById('ficha-sub').innerHTML.replace(/vende hoje por <b>[^<]*<\/b>/, `vende hoje por <b>${formatarMoeda(d.preco)}</b>`);
  const sim = document.querySelector('#ficha-simular'); if (sim) sim.value = '';
  atualizarPreviaFicha();
  carregarPrecos(true);
  if (typeof carregarProdutos === 'function') carregarProdutos();
  if (typeof carregarModelos === 'function') carregarModelos();
}
const formFicha = document.getElementById('form-ficha-custo');
formFicha.addEventListener('input', atualizarPreviaFicha);
formFicha.addEventListener('change', (e) => {
  // Trocou a etapa: sugere a unidade de costume e a dica da descrição.
  if (e.target.matches('[data-campo="etapa"]')) {
    const linha = e.target.closest('.ficha-linha');
    linha.querySelector('[data-campo="unidade"]').value = UNIDADE_PADRAO[e.target.value] || 'un';
    linha.querySelector('[data-campo="descricao"]').placeholder = DICA_ETAPA[e.target.value] || 'Descrição';
  }
  atualizarPreviaFicha();
});
formFicha.addEventListener('click', (e) => {
  const add = e.target.closest('[data-add-etapa]');
  if (add) {
    const etapa = add.dataset.addEtapa;
    document.getElementById('ficha-itens').insertAdjacentHTML('beforeend', htmlLinhaFicha({ etapa, unidade: UNIDADE_PADRAO[etapa] }));
    document.querySelector('#ficha-itens .ficha-linha:last-child [data-campo="valor_unitario"]').focus();
    atualizarPreviaFicha();
  }
  const remover = e.target.closest('[data-remover-linha]');
  if (remover) { remover.closest('.ficha-linha').remove(); atualizarPreviaFicha(); }
  const aplicar = e.target.closest('[data-aplicar-preco]');
  if (aplicar) aplicarPrecoFicha(Number(aplicar.dataset.aplicarPreco));
});
formFicha.addEventListener('focusin', (e) => { if (e.target.matches('input[inputmode="decimal"]')) e.target.select(); });
formFicha.addEventListener('submit', async (e) => { e.preventDefault(); if (pode('precos', 'editar')) await salvarFicha(); });
document.getElementById('ficha-apagar').addEventListener('click', async () => {
  const { produto } = fichaEditando;
  if (!confirm(`Apagar a ficha de custo de "${produto.nome}"? O preço de venda não muda.`)) return;
  const r = await fetch(`${API_URL}/precificacao/${produto.tipo}/${produto.id}`, { method: 'DELETE', headers: getHeadersComUsuario() });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return showToast(d.error || 'Não foi possível apagar.', 'error');
  showToast(d.mensagem);
  fecharDialogo('modal-ficha-custo');
  carregarPrecos(true);
});
document.getElementById('lista-precos').addEventListener('click', (e) => {
  const b = e.target.closest('[data-abrir-ficha]');
  if (b) { const [tipo, id] = b.dataset.abrirFicha.split(':'); abrirFichaCusto(tipo, id); }
});
document.querySelectorAll('[data-preco-filtro]').forEach((b) => b.addEventListener('click', () => { precosVisao.filtro = b.dataset.precoFiltro; renderizarPrecos(true); }));
document.getElementById('preco-resumo').addEventListener('click', (e) => {
  const b = e.target.closest('[data-preco-ir]');
  if (b) { precosVisao.filtro = b.dataset.precoIr; renderizarPrecos(true); }
});
document.getElementById('preco-busca').addEventListener('input', () => renderizarPrecos());
document.getElementById('preco-categoria').addEventListener('change', () => renderizarPrecos());
