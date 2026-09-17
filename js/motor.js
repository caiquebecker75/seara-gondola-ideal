/* ==========================================================================
   Motor do jogo: planograma de referencia, share de venda e pontuacao.
   Todos os indices sao premissas editaveis. Para usar sell out real,
   troque os campos giro, preco e tier em js/data.js. Ver README.
   ========================================================================== */
(function () {
  const RANK = { must: 0, core: 1, plus: 2, fora: 9 };

  function skusDoCenario(cenario) {
    return SKUS.filter(s => s.tier[cenario.id] !== "fora");
  }

  /* Cobertura de referencia: percentual de lojas que hoje positivam o SKU.
     Derivado do indice de giro enquanto o dado real de auditoria nao entra. */
  function cobertura(sku, cenario) {
    const base = { must: 30, core: 14, plus: 4 }[sku.tier[cenario.id]] || 0;
    return Math.max(4, Math.min(97, Math.round(base + sku.giro * 0.62)));
  }

  /* Share de venda de referencia por categoria, dentro do formato. */
  function shareBenchmark(cenario) {
    const soma = {};
    let total = 0;
    skusDoCenario(cenario).forEach(s => {
      const v = s.giro * PESO_TIER[s.tier[cenario.id]];
      soma[s.cat] = (soma[s.cat] || 0) + v;
      total += v;
    });
    const out = {};
    Object.keys(soma).forEach(c => { out[c] = soma[c] / total; });
    return out;
  }

  /* Planograma de referencia: preenche o espaco por tier e depois distribui
     os facings restantes proporcionalmente ao giro. Maximo de 4 facings por SKU. */
  function planogramaIdeal(cenario) {
    const capacidade = cenario.prateleiras * cenario.colunas;
    const lista = skusDoCenario(cenario).slice().sort((a, b) => {
      const r = RANK[a.tier[cenario.id]] - RANK[b.tier[cenario.id]];
      return r !== 0 ? r : b.giro - a.giro;
    });
    const plano = new Map();
    let usados = 0;
    for (const s of lista) {
      if (usados >= capacidade) break;
      if (s.tier[cenario.id] === "plus" && usados > capacidade * 0.8) continue;
      plano.set(s.id, 1);
      usados++;
    }
    let sobra = capacidade - usados;
    const elegiveis = [...plano.keys()]
      .map(id => SKUS.find(s => s.id === id))
      .filter(s => s.tier[cenario.id] !== "plus")
      .sort((a, b) => b.giro - a.giro);
    let i = 0;
    while (sobra > 0 && elegiveis.length) {
      const s = elegiveis[i % elegiveis.length];
      const atual = plano.get(s.id);
      if (atual < 4) { plano.set(s.id, atual + 1); sobra--; }
      i++;
      if (i > 4000) break;
    }
    return plano; // Map id -> facings
  }

  function distribuicaoPorCategoria(mapa) {
    const out = {};
    let total = 0;
    mapa.forEach((fac, id) => {
      const s = SKUS.find(x => x.id === id);
      if (!s) return;
      out[s.cat] = (out[s.cat] || 0) + fac;
      total += fac;
    });
    Object.keys(out).forEach(c => { out[c] = total ? out[c] / total : 0; });
    return out;
  }

  /* Venda mensal estimada por loja de um SKU, em reais. Premissa de referencia. */
  function vendaEstimada(sku) {
    return Math.round((sku.giro / 100) * sku.preco * 46);
  }

  function avaliar(cenario, escolha) {
    const capacidade = cenario.prateleiras * cenario.colunas;
    const bench = shareBenchmark(cenario);
    const ideal = planogramaIdeal(cenario);
    const meu = distribuicaoPorCategoria(escolha);
    const idealCat = distribuicaoPorCategoria(ideal);

    const musts = SKUS.filter(s => s.tier[cenario.id] === "must");
    const mustPresentes = musts.filter(s => escolha.has(s.id));
    const gaps = musts.filter(s => !escolha.has(s.id))
      .map(s => ({ sku: s, perda: vendaEstimada(s), cobertura: cobertura(s, cenario) }))
      .sort((a, b) => b.perda - a.perda);

    /* A. Positivacao obrigatoria */
    const pA = musts.length ? (mustPresentes.length / musts.length) * 400 : 400;

    /* B. Cobertura das necessidades do shopper */
    const catsCobertas = cenario.catsEsperadas.filter(c => (meu[c] || 0) > 0);
    const pB = (catsCobertas.length / cenario.catsEsperadas.length) * 150;

    /* C. Share de espaco contra share de venda de referencia */
    const cats = new Set([...Object.keys(bench), ...Object.keys(meu)]);
    let desvio = 0;
    cats.forEach(c => { desvio += Math.abs((meu[c] || 0) - (bench[c] || 0)); });
    desvio = desvio / 2;
    const pC = Math.max(0, 1 - desvio) * 250;

    /* D. Qualidade do mix */
    const foraFormato = [];
    const overfacing = [];
    let lancamentos = 0, premium = 0, facingsTotais = 0;
    escolha.forEach((fac, id) => {
      const s = SKUS.find(x => x.id === id);
      if (!s) return;
      facingsTotais += fac;
      if (s.tier[cenario.id] === "fora") foraFormato.push({ sku: s, facings: fac });
      if (fac > 3) overfacing.push({ sku: s, facings: fac });
      if (s.lancamento) lancamentos++;
      if (s.papel === "rentabilidade") premium++;
    });
    let pD = 200;
    pD -= foraFormato.reduce((t, f) => t + 25 * f.facings, 0);
    pD -= overfacing.reduce((t, f) => t + 10 * (f.facings - 3), 0);
    if (lancamentos === 0) pD -= 25;
    if (premium === 0) pD -= 20;
    const vazios = capacidade - facingsTotais;
    pD -= vazios * 6;
    pD = Math.max(0, Math.min(200, pD));

    const total = Math.round(pA + pB + pC + pD);
    const nivel = total >= 850 ? "Ouro" : total >= 700 ? "Prata" : total >= 550 ? "Bronze" : "Em treino";

    const sugestoes = [];
    ideal.forEach((fac, id) => {
      if (!escolha.has(id)) {
        const s = SKUS.find(x => x.id === id);
        if (s && s.tier[cenario.id] !== "must") sugestoes.push({ sku: s, facings: fac });
      }
    });
    sugestoes.sort((a, b) => b.sku.giro - a.sku.giro);

    const excesso = [];
    escolha.forEach((fac, id) => {
      const s = SKUS.find(x => x.id === id);
      if (!s) return;
      if (s.tier[cenario.id] === "fora") return;
      const alvo = ideal.get(id) || 0;
      if (fac - alvo >= 2) excesso.push({ sku: s, facings: fac, ideal: alvo });
    });
    excesso.sort((a, b) => (b.facings - b.ideal) - (a.facings - a.ideal));

    return {
      total, nivel,
      blocos: [
        { chave: "positivacao", nome: "Positivação do obrigatório", pontos: Math.round(pA), max: 400,
          detalhe: mustPresentes.length + " de " + musts.length + " itens obrigatórios na gôndola" },
        { chave: "cobertura", nome: "Cobertura das necessidades", pontos: Math.round(pB), max: 150,
          detalhe: catsCobertas.length + " de " + cenario.catsEsperadas.length + " categorias atendidas" },
        { chave: "share", nome: "Espaço proporcional à venda", pontos: Math.round(pC), max: 250,
          detalhe: "Desvio de " + Math.round(desvio * 100) + "% contra a base de referência" },
        { chave: "mix", nome: "Qualidade do mix", pontos: Math.round(pD), max: 200,
          detalhe: vazios > 0 ? vazios + " espaços ficaram vazios" : "Gôndola totalmente ocupada" }
      ],
      gaps, sugestoes, excesso, foraFormato, overfacing, vazios,
      meuShare: meu, benchShare: bench, idealShare: idealCat,
      ideal, capacidade,
      perdaTotal: gaps.reduce((t, g) => t + g.perda, 0)
    };
  }

  window.MOTOR = { avaliar, planogramaIdeal, shareBenchmark, cobertura, vendaEstimada, distribuicaoPorCategoria };
})();
