// ================= FORMAÇÃO DE PREÇO (ficha de custo) =================
// Usado pelo servidor (require) e pela tela (window.Precificacao), para a prévia
// ao vivo e o valor gravado darem sempre o mesmo resultado.
//
// Custo da peça = soma dos itens (tecido, corte, costura, estampa...).
//   Cada item: quantidade × valor unitário ÷ rendimento (quantas peças saem).
//   Ex.: 1 kg de malha a R$ 60 que rende 3 camisetas = R$ 20 por camiseta.
// Os percentuais (imposto, taxa do cartão, comissão, despesas fixas e lucro)
// incidem sobre o PREÇO DE VENDA, não sobre o custo. Por isso o preço é:
//   preço = custo ÷ (1 − soma dos percentuais ÷ 100)   ("markup divisor")
// Somar a porcentagem ao custo (custo × 1,40) daria um lucro menor que o pedido.
(function (raiz, fabrica) {
  const modulo = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = modulo;
  else raiz.Precificacao = modulo;
})(typeof self !== 'undefined' ? self : this, function () {
  const ETAPAS = ['Tecido', 'Aviamentos', 'Corte', 'Costura', 'Estampa', 'Acabamento', 'Etiqueta e embalagem', 'Frete', 'Mão de obra', 'Outro'];
  const UNIDADES = ['m', 'kg', 'un', 'peça', 'hora'];
  const PERCENTUAIS = [
    { chave: 'imposto_pct', nome: 'Impostos', ajuda: 'Simples Nacional, ICMS... sobre a venda' },
    { chave: 'taxa_pct', nome: 'Taxa do cartão / marketplace', ajuda: 'O que a maquininha ou o site descontam' },
    { chave: 'comissao_pct', nome: 'Comissão', ajuda: 'Vendedor, influencer, representante' },
    { chave: 'despesas_pct', nome: 'Despesas fixas da loja', ajuda: 'Aluguel, internet, salários... em % do faturamento' },
    { chave: 'margem_pct', nome: 'Lucro desejado', ajuda: 'O que sobra limpo para você' }
  ];
  const ARREDONDAMENTOS = { 90: 'Terminar em ,90', inteiro: 'Valor redondo (R$ inteiro)', centavo: 'Sem arredondar' };
  const PADROES = { imposto_pct: 6, taxa_pct: 4, comissao_pct: 0, despesas_pct: 10, margem_pct: 30, arredondamento: '90' };
  const LIMITES = { itens: 40, descricao: 80, quantidade: 100000, valor: 1000000, rendimento: 10000 };

  const centavos = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
  const numero = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).trim().replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  };

  // Arredonda sempre PARA CIMA: nunca entrega margem menor que a pedida.
  function arredondar(preco, modo) {
    if (!(preco > 0)) return centavos(preco || 0);
    if (modo === 'inteiro') return Math.ceil(preco - 1e-9);
    if (modo === '90') return centavos(Math.ceil(preco - 0.9 - 1e-9) + 0.9);
    return Math.ceil(preco * 100 - 1e-6) / 100;
  }

  function subtotalItem(item) {
    const q = Number(item.quantidade) || 0, v = Number(item.valor_unitario) || 0, r = Number(item.rendimento) || 1;
    return centavos((q * v) / r);
  }

  // Percentual vazio (null) na ficha = usa o padrão da loja.
  function percentuaisEfetivos(ficha, padroes) {
    const base = { ...PADROES, ...(padroes || {}) };
    const saida = {};
    for (const { chave } of PERCENTUAIS) {
      const proprio = ficha ? ficha[chave] : null;
      saida[chave] = proprio === null || proprio === undefined || proprio === '' ? Number(base[chave]) || 0 : Number(proprio) || 0;
    }
    saida.arredondamento = (ficha && ficha.arredondamento) || base.arredondamento || '90';
    return saida;
  }

  function analisarPreco(preco, custo, p) {
    preco = centavos(preco);
    const imposto = centavos(preco * p.imposto_pct / 100);
    const taxa = centavos(preco * p.taxa_pct / 100);
    const comissao = centavos(preco * p.comissao_pct / 100);
    const despesas = centavos(preco * p.despesas_pct / 100);
    const lucro = centavos(preco - custo - imposto - taxa - comissao - despesas);
    const margem = preco > 0 ? Math.round((lucro / preco) * 1000) / 10 : 0;
    let situacao = 'ok';
    if (!(custo > 0)) situacao = 'sem_custo';
    else if (lucro < 0) situacao = 'prejuizo';
    else if (margem < p.margem_pct - 0.5) situacao = 'abaixo';
    return { preco, custo, imposto, taxa, comissao, despesas, lucro, margem_pct: margem, markup: custo > 0 ? Math.round((preco / custo) * 100) / 100 : null, situacao };
  }

  // ficha: { itens:[{etapa,descricao,quantidade,unidade,valor_unitario,rendimento}], imposto_pct..margem_pct (ou null), arredondamento }
  function calcular(ficha, padroes, precoAtual) {
    const itens = ((ficha && ficha.itens) || []).map((item) => ({ ...item, subtotal: subtotalItem(item) }));
    const custo = centavos(itens.reduce((s, i) => s + i.subtotal, 0));
    const p = percentuaisEfetivos(ficha, padroes);
    const variaveis = Math.round((p.imposto_pct + p.taxa_pct + p.comissao_pct + p.despesas_pct) * 100) / 100;
    const total = Math.round((variaveis + p.margem_pct) * 100) / 100;
    const porEtapa = {};
    for (const i of itens) porEtapa[i.etapa] = centavos((porEtapa[i.etapa] || 0) + i.subtotal);
    const base = { itens, custo, percentuais: p, soma_variaveis: variaveis, soma_percentuais: total, por_etapa: porEtapa };
    const atual = precoAtual === null || precoAtual === undefined || precoAtual === '' ? null : analisarPreco(Number(precoAtual), custo, p);
    if (total >= 100) {
      return { ...base, erro: `Os percentuais somam ${String(total).replace('.', ',')}%: não sobra nada para pagar o custo. Diminua o lucro ou as despesas.`, preco_calculado: null, preco_sugerido: null, preco_minimo: null, sugerido: null, atual };
    }
    const divisor = 1 - total / 100;
    const precoCalculado = custo / divisor;
    const precoSugerido = arredondar(precoCalculado, p.arredondamento);
    const precoMinimo = variaveis < 100 ? arredondar(custo / (1 - variaveis / 100), 'centavo') : null;
    return {
      ...base, erro: null, divisor: Math.round(divisor * 10000) / 10000,
      preco_calculado: centavos(precoCalculado), preco_sugerido: precoSugerido, preco_minimo: precoMinimo,
      markup: custo > 0 ? Math.round((precoSugerido / custo) * 100) / 100 : null,
      sugerido: analisarPreco(precoSugerido, custo, p), atual
    };
  }

  // Valida o que vem do formulário. Devolve { erro } ou { ficha } normalizada.
  function validarFicha(bruto) {
    if (!bruto || typeof bruto !== 'object') return { erro: 'Dados da ficha inválidos.' };
    const lista = Array.isArray(bruto.itens) ? bruto.itens : [];
    if (lista.length > LIMITES.itens) return { erro: `No máximo ${LIMITES.itens} itens por ficha.` };
    const itens = [];
    for (const [indice, item] of lista.entries()) {
      const linha = `Item ${indice + 1}`;
      const etapa = String(item?.etapa || '').trim();
      if (!ETAPAS.includes(etapa)) return { erro: `${linha}: escolha a etapa (tecido, corte, costura...).` };
      const descricao = String(item.descricao || '').trim();
      if (descricao.length > LIMITES.descricao) return { erro: `${linha}: descrição até ${LIMITES.descricao} caracteres.` };
      const quantidade = numero(item.quantidade);
      if (!(quantidade > 0) || quantidade > LIMITES.quantidade) return { erro: `${linha}: informe uma quantidade maior que zero.` };
      const unidade = String(item.unidade || '').trim();
      if (!UNIDADES.includes(unidade)) return { erro: `${linha}: unidade inválida.` };
      const valor = numero(item.valor_unitario);
      if (valor === null || Number.isNaN(valor) || valor < 0 || valor > LIMITES.valor) return { erro: `${linha}: informe o valor (zero ou mais).` };
      const rend = numero(item.rendimento);
      const rendimento = rend === null ? 1 : rend;
      if (!(rendimento > 0) || rendimento > LIMITES.rendimento) return { erro: `${linha}: o rendimento (quantas peças saem) precisa ser maior que zero.` };
      itens.push({ etapa, descricao, quantidade: Math.round(quantidade * 10000) / 10000, unidade, valor_unitario: Math.round(valor * 10000) / 10000, rendimento: Math.round(rendimento * 10000) / 10000 });
    }
    const ficha = { itens };
    for (const { chave, nome } of PERCENTUAIS) {
      const v = numero(bruto[chave]);
      if (v === null) { ficha[chave] = null; continue; }
      if (Number.isNaN(v) || v < 0 || v >= 100) return { erro: `${nome}: informe de 0 a 99,99%.` };
      ficha[chave] = Math.round(v * 100) / 100;
    }
    const arred = bruto.arredondamento === '' || bruto.arredondamento == null ? null : String(bruto.arredondamento);
    if (arred !== null && !ARREDONDAMENTOS[arred]) return { erro: 'Arredondamento inválido.' };
    ficha.arredondamento = arred;
    ficha.observacoes = String(bruto.observacoes || '').trim().slice(0, 500);
    return { ficha };
  }

  function validarPadroes(bruto) {
    const saida = {};
    for (const { chave, nome } of PERCENTUAIS) {
      const v = numero(bruto?.[chave]);
      if (v === null || Number.isNaN(v) || v < 0 || v >= 100) return { erro: `${nome}: informe de 0 a 99,99%.` };
      saida[chave] = Math.round(v * 100) / 100;
    }
    const total = PERCENTUAIS.reduce((s, { chave }) => s + saida[chave], 0);
    if (total >= 100) return { erro: 'A soma dos percentuais precisa ficar abaixo de 100%.' };
    const arred = String(bruto?.arredondamento ?? '90');
    if (!ARREDONDAMENTOS[arred]) return { erro: 'Arredondamento inválido.' };
    saida.arredondamento = arred;
    return { padroes: saida };
  }

  return { ETAPAS, UNIDADES, PERCENTUAIS, ARREDONDAMENTOS, PADROES, LIMITES, arredondar, subtotalItem, percentuaisEfetivos, analisarPreco, calcular, validarFicha, validarPadroes };
});
