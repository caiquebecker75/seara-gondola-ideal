/* Formatos de loja do jogo e metadados das categorias da gondola. */

/* Como o movel da loja e chamado nas telas do jogo. */
window.NOME_GONDOLA = "Freezer";

window.CATEGORIAS = {
  aves:       { nome: "Aves congeladas",        cor: "#E30613", icone: "🍗" },
  suinos:     { nome: "Suínos",                 cor: "#B00510", icone: "🥩" },
  empanados:  { nome: "Empanados",              cor: "#FF6720", icone: "🍤" },
  hamburguer: { nome: "Hambúrgueres",           cor: "#FA4616", icone: "🍔" },
  linguica:   { nome: "Linguiças",              cor: "#C81622", icone: "🌭" },
  salsicha:   { nome: "Salsichas",              cor: "#FF8F1C", icone: "🥖" },
  frios:      { nome: "Frios fatiados",         cor: "#B8913F", icone: "🥪" },
  pizza:      { nome: "Pizzas",                 cor: "#FF5300", icone: "🍕" },
  massas:     { nome: "Lasanhas e massas",      cor: "#A8480F", icone: "🍝" },
  prontos:    { nome: "Pratos prontos",         cor: "#7A3B12", icone: "🍱" },
  lanches:    { nome: "Lanches e snacks",       cor: "#D6B800", icone: "🥐" },
  nature:     { nome: "Legumes Nature",         cor: "#2E7D32", icone: "🥦" },
  peixes:     { nome: "Peixes e frutos do mar", cor: "#1565A6", icone: "🐟" }
};

window.CENARIOS = [
  {
    id: "viz",
    nome: "Loja de vizinhança",
    resumo: "Até 4 checkouts, bairro residencial",
    shopper: "Compra de reposição, ticket baixo, alta frequência semanal",
    detalhe: [
      "Público das classes C e D, vai a pé até a loja",
      "Freezer curto, sem espaço para pack grande",
      "Consumo imediato e refeição rápida pesam mais que estoque"
    ],
    prateleiras: 4,
    colunas: 6,
    catsEsperadas: ["aves", "empanados", "linguica", "salsicha", "frios", "pizza", "prontos", "hamburguer"],
    aviso: "Pack de atacado não gira neste formato"
  },
  {
    id: "sup",
    nome: "Supermercado de bairro",
    resumo: "De 5 a 19 checkouts, praça competitiva",
    shopper: "Compra de abastecimento quinzenal mais reposição semanal",
    detalhe: [
      "Público das classes B e C, vai de carro",
      "Freezer completo, espaço para sortimento longo",
      "Espera encontrar a categoria inteira resolvida na loja"
    ],
    prateleiras: 4,
    colunas: 8,
    catsEsperadas: ["aves", "suinos", "empanados", "hamburguer", "linguica", "salsicha", "frios", "pizza", "massas", "prontos", "nature"],
    aviso: "Sortimento longo exige cobrir todas as necessidades do shopper"
  },
  {
    id: "ata",
    nome: "Atacarejo",
    resumo: "Cash and carry, transformador e família grande",
    shopper: "Compra de volume, foco em custo por quilo",
    detalhe: [
      "Mistura consumidor final, bar, padaria e pequeno mercado",
      "Pallet e pack grande dominam o espaço",
      "Preço por quilo decide a compra, embalagem individual gira pouco"
    ],
    prateleiras: 4,
    colunas: 8,
    catsEsperadas: ["aves", "suinos", "empanados", "hamburguer", "linguica", "salsicha", "frios", "pizza", "massas"],
    aviso: "Embalagem de consumo individual perde espaço para o pack"
  }
];

/* Peso de cada tier no calculo do share de venda de referencia por categoria. */
window.PESO_TIER = { must: 1.0, core: 0.6, plus: 0.25, fora: 0 };
