/* ==========================================================================
   Monte sua gondola ideal | fluxo da experiencia
   ========================================================================== */
(function () {
  const CFG = window.SEARA_CONFIG;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const estado = {
    participante: null,
    cenario: null,
    slots: [],
    filtro: "todos",
    marca: "todas",
    busca: "",
    tempoRestante: CFG.tempoJogo,
    cronometro: null,
    resultado: null
  };

  /* ---------------- cursor de dois tons ---------------- */
  (function cursor() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const bola = $(".bola"), eco = $(".bola-eco");
    let x = 0, y = 0, ex = 0, ey = 0;
    document.addEventListener("mousemove", e => {
      x = e.clientX; y = e.clientY;
      bola.style.transform = `translate(${x}px, ${y}px)`;
    });
    document.addEventListener("mouseover", e => {
      const alvo = e.target.closest("button, .sku, .loja, .vao.cheio, a, input, select, label");
      eco.classList.toggle("ativa", !!alvo);
    });
    (function anima() {
      ex += (x - ex) * 0.18; ey += (y - ey) * 0.18;
      eco.style.transform = `translate(${ex}px, ${ey}px)` + (eco.classList.contains("ativa") ? " scale(1.5)" : "");
      requestAnimationFrame(anima);
    })();
  })();

  /* ---------------- utilidades ---------------- */
  function irPara(id) {
    $$(".tela").forEach(t => t.classList.remove("ativa"));
    $("#" + id).classList.add("ativa");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }
  let avisoTimer = null;
  function aviso(txt) {
    const el = $("#aviso");
    el.textContent = txt;
    el.classList.add("aparece");
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => el.classList.remove("aparece"), 2400);
  }
  const reais = v => "R$ " + (v || 0).toLocaleString("pt-BR");
  const pct = v => Math.round((v || 0) * 100) + "%";

  /* ---------------- abertura ---------------- */
  $("#nome-evento").textContent = CFG.evento;
  $("#texto-lgpd").textContent = CFG.lgpd;
  $("#btn-comecar").addEventListener("click", () => irPara("tela-cadastro"));

  STORE.listar().then(l => {
    if (l.length) $("#contador-participantes").textContent =
      l.length === 1 ? "1 pessoa já montou a gôndola dela" : l.length + " pessoas já montaram a gôndola delas";
  });

  /* ---------------- cadastro ---------------- */
  const fone = $("#f-telefone");
  fone.addEventListener("input", () => {
    let v = fone.value.replace(/\D/g, "").slice(0, 11);
    if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2, v.length > 10 ? 7 : 6)}-${v.slice(v.length > 10 ? 7 : 6)}`;
    else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
    else if (v.length) v = `(${v}`;
    fone.value = v;
  });

  function erro(campo, msg) {
    const alvo = document.querySelector(`[data-erro="${campo}"]`);
    if (alvo) alvo.textContent = msg || "";
    const input = $("#" + campo);
    if (input) input.classList.toggle("invalido", !!msg);
    return !msg;
  }

  $("#form-cadastro").addEventListener("submit", async e => {
    e.preventDefault();
    const nome = $("#f-nome").value.trim();
    const tel = $("#f-telefone").value.trim();
    const email = $("#f-email").value.trim();
    const empresa = $("#f-empresa").value.trim();
    const area = $("#f-area").value;
    const lgpd = $("#f-lgpd").checked;

    let ok = true;
    ok = erro("f-nome", nome.split(" ").filter(Boolean).length >= 2 ? "" : "Escreva nome e sobrenome") && ok;
    ok = erro("f-telefone", tel.replace(/\D/g, "").length >= 10 ? "" : "Telefone com DDD, por favor") && ok;
    ok = erro("f-email", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? "" : "E-mail inválido") && ok;
    ok = erro("f-empresa", empresa.length >= 2 ? "" : "Informe a empresa ou rede") && ok;
    ok = erro("f-area", area ? "" : "Escolha sua área") && ok;
    ok = erro("f-lgpd", lgpd ? "" : "Precisamos do seu aceite para continuar") && ok;
    if (!ok) return;

    const btn = $("#btn-cadastro");
    btn.disabled = true; btn.textContent = "Salvando...";

    estado.participante = {
      nome, telefone: tel, email, empresa, area,
      consentimento: true,
      dispositivo: navigator.userAgent.includes("Mobi") ? "celular" : "computador",
      iniciouEm: new Date().toISOString(),
      status: "cadastrado"
    };
    estado.participante = await STORE.salvar(estado.participante);

    btn.disabled = false; btn.textContent = "Continuar";
    $("#ola-participante").textContent = "Olá, " + nome.split(" ")[0];
    irPara("tela-briefing");
  });

  /* ---------------- escolha da loja ---------------- */
  function montarLojas() {
    $("#lista-lojas").innerHTML = CENARIOS.map(c => `
      <button type="button" class="loja" data-cenario="${c.id}">
        <span class="selo">${c.resumo}</span>
        <h3>${c.nome}</h3>
        <p class="resumo">${c.shopper}</p>
        <ul>${c.detalhe.map(d => `<li>${d}</li>`).join("")}</ul>
        <div class="espaco">
          <span>${c.prateleiras} prateleiras</span>
          <span>${c.prateleiras * c.colunas} espaços</span>
        </div>
      </button>`).join("");

    $$("#lista-lojas .loja").forEach(el => el.addEventListener("click", () => {
      $$("#lista-lojas .loja").forEach(o => o.classList.remove("marcada"));
      el.classList.add("marcada");
      estado.cenario = CENARIOS.find(c => c.id === el.dataset.cenario);
      $("#btn-iniciar-jogo").disabled = false;
    }));
  }
  montarLojas();

  $("#btn-iniciar-jogo").addEventListener("click", () => {
    if (!estado.cenario) return;
    iniciarJogo();
    irPara("tela-jogo");
  });

  /* ---------------- jogo ---------------- */
  function capacidade() { return estado.cenario.prateleiras * estado.cenario.colunas; }
  function mapaEscolha() {
    const m = new Map();
    estado.slots.forEach(id => { if (id) m.set(id, (m.get(id) || 0) + 1); });
    return m;
  }

  function iniciarJogo() {
    estado.slots = new Array(capacidade()).fill(null);
    estado.filtro = "todos";
    estado.marca = "todas";
    estado.busca = "";
    $("#busca-sku").value = "";
    $("#jogo-loja").textContent = estado.cenario.nome;
    $("#titulo-gondola").textContent = (window.NOME_GONDOLA || "Gôndola") + " | " + estado.cenario.nome;
    $("#aviso-formato").textContent = estado.cenario.aviso;
    $("#total-catalogo").textContent = SKUS.length;
    montarFiltros();
    desenharGondola();
    desenharCatalogo();
    atualizarMedidor();
    iniciarCronometro();
  }

  function iniciarCronometro() {
    clearInterval(estado.cronometro);
    if (!CFG.tempoJogo) { $("#caixa-tempo").style.display = "none"; return; }
    estado.tempoRestante = CFG.tempoJogo;
    const mostra = () => {
      const m = String(Math.floor(estado.tempoRestante / 60)).padStart(2, "0");
      const s = String(estado.tempoRestante % 60).padStart(2, "0");
      $("#jogo-tempo").textContent = m + ":" + s;
      $("#caixa-tempo").classList.toggle("alerta", estado.tempoRestante <= 60);
    };
    mostra();
    estado.cronometro = setInterval(() => {
      estado.tempoRestante--;
      mostra();
      if (estado.tempoRestante <= 0) { clearInterval(estado.cronometro); finalizar(true); }
    }, 1000);
  }

  function desenharGondola() {
    const c = estado.cenario;
    const html = [];
    for (let p = 0; p < c.prateleiras; p++) {
      const vaos = [];
      for (let i = 0; i < c.colunas; i++) {
        const idx = p * c.colunas + i;
        vaos.push(`<div class="vao" data-slot="${idx}"><span class="numero">${idx + 1}</span></div>`);
      }
      html.push(`<div class="prateleira">
        <div class="vaos" style="grid-template-columns:repeat(${c.colunas},minmax(0,1fr))">${vaos.join("")}</div>
        <div class="base"></div>
      </div>`);
    }
    $("#prateleiras").innerHTML = html.join("");
    $$("#prateleiras .vao").forEach(v => prepararArraste(v, { tipo: "slot", index: Number(v.dataset.slot) }));
  }

  function pintarSlots() {
    $$("#prateleiras .vao").forEach(v => {
      const i = Number(v.dataset.slot);
      const id = estado.slots[i];
      if (!id) {
        v.className = "vao";
        v.innerHTML = `<span class="numero">${i + 1}</span>`;
        return;
      }
      const s = SKUS.find(x => x.id === id);
      v.className = "vao cheio";
      v.innerHTML = `<span class="marca-cat" style="background:${CATEGORIAS[s.cat].cor}"></span>
        <img src="${s.arquivo}" alt="${s.nome}" loading="lazy">
        <span class="nome-mini">${s.nome}</span>`;
    });
  }

  function montarFiltros() {
    const marcas = [...new Set(SKUS.map(s => s.marca).filter(Boolean))];
    const caixaMarca = $("#filtros-marca");
    if (caixaMarca) {
      if (marcas.length > 1) {
        caixaMarca.innerHTML = [`<button data-marca="todas" class="ativo">Todas as marcas</button>`]
          .concat(marcas.map(m => `<button data-marca="${m}">${m}</button>`)).join("");
        $$("#filtros-marca button").forEach(b => b.addEventListener("click", () => {
          $$("#filtros-marca button").forEach(o => o.classList.remove("ativo"));
          b.classList.add("ativo");
          estado.marca = b.dataset.marca;
          desenharCatalogo();
        }));
      } else {
        caixaMarca.style.display = "none";
      }
    }
    const usadas = [...new Set(SKUS.map(s => s.cat))];
    const botoes = [`<button data-cat="todos" class="ativo">Tudo</button>`]
      .concat(usadas.map(c => `<button data-cat="${c}">${CATEGORIAS[c].icone} ${CATEGORIAS[c].nome}</button>`));
    $("#filtros-cat").innerHTML = botoes.join("");
    $$("#filtros-cat button").forEach(b => b.addEventListener("click", () => {
      $$("#filtros-cat button").forEach(o => o.classList.remove("ativo"));
      b.classList.add("ativo");
      estado.filtro = b.dataset.cat;
      desenharCatalogo();
    }));
  }

  function normal(t) { return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }

  function desenharCatalogo() {
    const m = mapaEscolha();
    const busca = normal(estado.busca);
    const lista = SKUS.filter(s => {
      const okCat = estado.filtro === "todos" || s.cat === estado.filtro;
      const okMarca = estado.marca === "todas" || s.marca === estado.marca;
      const okBusca = !busca || normal(s.nome).includes(busca) ||
        (s.marca && normal(s.marca).includes(busca)) || (s.ean || "").includes(busca);
      return okCat && okMarca && okBusca;
    });
    if (!lista.length) {
      $("#lista-skus").innerHTML = `<p style="font-size:13px;color:var(--cinza)">Nenhum produto encontrado.</p>`;
      return;
    }
    const variasMarcas = new Set(SKUS.map(x => x.marca).filter(Boolean)).size > 1;
    $("#lista-skus").innerHTML = lista.map(s => {
      const q = m.get(s.id) || 0;
      const etiqueta = variasMarcas && s.marca ? s.marca : CATEGORIAS[s.cat].nome;
      const apoio = s.ean ? "EAN " + s.ean : (s.linhaSite || (variasMarcas ? CATEGORIAS[s.cat].nome : s.marca || ""));
      return `<div class="sku ${q ? "dentro" : ""}" data-sku="${s.id}">
        <img src="${s.arquivo}" alt="${s.nome}" draggable="false" loading="lazy">
        <div class="txt">
          <b>${s.nome}</b>
          <small>${apoio}</small>
          <span class="marca ${s.lancamento ? "novo" : ""}">${s.lancamento ? "Lançamento" : etiqueta}</span>
        </div>
        <div class="qtd">${q ? q + "x" : "+"}</div>
      </div>`;
    }).join("");
    $$("#lista-skus .sku").forEach(el => prepararArraste(el, { tipo: "catalogo", id: el.dataset.sku }));
  }

  /* ---------------- arrastar e soltar ---------------- */
  let rolagem = null;
  let ultimoPonteiro = 0;

  function criarFantasma(sku, x, y) {
    const f = document.createElement("div");
    f.className = "fantasma";
    f.innerHTML = `<img src="${sku.arquivo}" alt=""><span>${sku.nome}</span>`;
    document.body.appendChild(f);
    moverFantasma(f, x, y);
    return f;
  }
  function moverFantasma(f, x, y) {
    f.style.transform = `translate(${x}px, ${y}px)`;
  }
  function vaoSob(x, y) {
    const el = document.elementFromPoint(x, y);
    return el ? el.closest(".vao") : null;
  }
  function marcarAlvo(vao) {
    $$("#prateleiras .vao").forEach(v => v.classList.toggle("sobre", v === vao));
  }
  function rolarSeNaBorda(y) {
    cancelAnimationFrame(rolagem);
    const margem = 110;
    let passo = 0;
    if (y < margem) passo = -Math.ceil((margem - y) / 6);
    else if (y > window.innerHeight - margem) passo = Math.ceil((y - (window.innerHeight - margem)) / 6);
    if (!passo) return;
    const anda = () => { window.scrollBy(0, passo); rolagem = requestAnimationFrame(anda); };
    rolagem = requestAnimationFrame(anda);
  }

  function colocarNoSlot(id, destino) {
    const anterior = estado.slots[destino];
    estado.slots[destino] = id;
    const s = SKUS.find(x => x.id === id);
    if (anterior && anterior !== id) {
      const a = SKUS.find(x => x.id === anterior);
      aviso(s.nome + " entrou no lugar de " + (a ? a.nome : "outro item"));
    }
    pintarSlots(); desenharCatalogo(); atualizarMedidor();
  }

  function trocarSlots(origem, destino) {
    const t = estado.slots[destino];
    estado.slots[destino] = estado.slots[origem];
    estado.slots[origem] = t;
    pintarSlots(); desenharCatalogo(); atualizarMedidor();
  }

  function removerSlot(i) {
    if (!estado.slots[i]) return;
    estado.slots[i] = null;
    pintarSlots(); desenharCatalogo(); atualizarMedidor();
  }

  function prepararArraste(el, origem) {
    el.addEventListener("pointerdown", ev => {
      if (ev.button > 0) return;
      const id = origem.tipo === "slot" ? estado.slots[origem.index] : origem.id;
      if (!id) return;
      const sku = SKUS.find(x => x.id === id);
      if (!sku) return;

      const inicio = { x: ev.clientX, y: ev.clientY };
      let ativo = false, fantasma = null;

      const mover = e => {
        const dx = e.clientX - inicio.x, dy = e.clientY - inicio.y;
        if (!ativo && Math.hypot(dx, dy) < 9) return;
        if (!ativo) {
          ativo = true;
          fantasma = criarFantasma(sku, e.clientX, e.clientY);
          document.body.classList.add("arrastando");
          const sel = window.getSelection();
          if (sel && sel.removeAllRanges) sel.removeAllRanges();
          if (origem.tipo === "slot") el.classList.add("saindo");
        }
        moverFantasma(fantasma, e.clientX, e.clientY);
        if (fantasma) fantasma.style.visibility = "hidden";
        const alvo = vaoSob(e.clientX, e.clientY);
        if (fantasma) fantasma.style.visibility = "visible";
        marcarAlvo(alvo);
        rolarSeNaBorda(e.clientY);
        e.preventDefault();
      };

      const soltar = e => {
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerup", soltar);
        window.removeEventListener("pointercancel", soltar);
        cancelAnimationFrame(rolagem);
        document.body.classList.remove("arrastando");
        el.classList.remove("saindo");
        marcarAlvo(null);
        if (fantasma) { fantasma.style.visibility = "hidden"; }

        if (!ativo) {
          if (origem.tipo === "catalogo") adicionar(id); else removerSlot(origem.index);
        } else {
          const alvo = vaoSob(e.clientX, e.clientY);
          if (alvo) {
            const destino = Number(alvo.dataset.slot);
            if (origem.tipo === "catalogo") colocarNoSlot(id, destino);
            else if (destino !== origem.index) trocarSlots(origem.index, destino);
          } else if (origem.tipo === "slot") {
            removerSlot(origem.index);
            aviso(sku.nome + " saiu da gôndola");
          }
        }
        if (fantasma) fantasma.remove();
        ultimoPonteiro = Date.now();
      };

      window.addEventListener("pointermove", mover, { passive: false });
      window.addEventListener("pointerup", soltar);
      window.addEventListener("pointercancel", soltar);
    });
    /* Teclado e navegadores sem evento de ponteiro continuam funcionando no clique. */
    el.addEventListener("click", ev => {
      if (Date.now() - ultimoPonteiro < 700) return;
      const id = origem.tipo === "slot" ? estado.slots[origem.index] : origem.id;
      if (!id) return;
      if (origem.tipo === "catalogo") adicionar(id); else removerSlot(origem.index);
    });
    el.addEventListener("dragstart", e => e.preventDefault());
  }

  function adicionar(id) {
    const vazio = estado.slots.indexOf(null);
    if (vazio === -1) { aviso("A gôndola está cheia. Tire um produto para colocar outro."); return; }
    estado.slots[vazio] = id;
    pintarSlots(); desenharCatalogo(); atualizarMedidor();
    const s = SKUS.find(x => x.id === id);
    const q = mapaEscolha().get(id);
    if (q > 1) aviso(s.nome + " agora com " + q + " espaços");
  }

  function atualizarMedidor() {
    const usados = estado.slots.filter(Boolean).length;
    const cap = capacidade();
    $("#jogo-espacos").textContent = usados + " / " + cap;
    $("#jogo-skus").textContent = mapaEscolha().size;
    $("#jogo-progresso").style.width = (usados / cap * 100) + "%";
  }

  $("#busca-sku").addEventListener("input", e => { estado.busca = e.target.value; desenharCatalogo(); });

  $("#btn-finalizar").addEventListener("click", () => {
    const usados = estado.slots.filter(Boolean).length;
    if (usados === 0) { aviso("Coloque pelo menos um produto na gôndola."); return; }
    if (usados < capacidade() && !confirm("Ainda sobraram " + (capacidade() - usados) + " espaços vazios. Quer finalizar assim mesmo?")) return;
    finalizar(false);
  });

  /* ---------------- resultado ---------------- */
  async function finalizar(porTempo) {
    clearInterval(estado.cronometro);
    const escolha = mapaEscolha();
    const r = MOTOR.avaliar(estado.cenario, escolha);
    estado.resultado = r;

    const registro = Object.assign({}, estado.participante, {
      status: "concluido",
      finalizouEm: new Date().toISOString(),
      formatoLoja: estado.cenario.nome,
      formatoId: estado.cenario.id,
      pontuacao: r.total,
      nivel: r.nivel,
      encerradoPeloTempo: !!porTempo,
      tempoUsado: CFG.tempoJogo ? CFG.tempoJogo - estado.tempoRestante : null,
      skusEscolhidos: [...escolha.entries()].map(([id, fac]) => {
        const s = SKUS.find(x => x.id === id);
        return { ean: s.ean, nome: s.nome, categoria: s.cat, facings: fac };
      }),
      gaps: r.gaps.map(g => ({ ean: g.sku.ean, nome: g.sku.nome })),
      blocos: r.blocos.reduce((o, b) => (o[b.chave] = b.pontos, o), {}),
      perdaEstimada: r.perdaTotal
    });
    estado.participante = await STORE.salvar(registro);

    montarResultado(r, porTempo);
    irPara("tela-resultado");
  }

  function miniGondola(slots, cols) {
    const linhas = [];
    for (let i = 0; i < slots.length; i += cols) {
      const parte = slots.slice(i, i + cols).map(id => {
        if (!id) return `<div class="mini-vao vazio"></div>`;
        const s = SKUS.find(x => x.id === id);
        return `<div class="mini-vao" title="${s.nome}"><img src="${s.arquivo}" alt=""></div>`;
      }).join("");
      linhas.push(`<div class="mini-prateleira" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${parte}</div>`);
    }
    return linhas.join("");
  }

  function montarResultado(r, porTempo) {
    const c = estado.cenario;
    $("#res-nome").textContent = estado.participante.nome + " | " + c.nome;
    $("#res-pontos").innerHTML = r.total + "<small>/1000</small>";
    $("#res-nivel").textContent = r.nivel;
    const frases = {
      "Ouro": "Execução de referência. Seu sortimento cobre o obrigatório e distribui espaço na medida da venda.",
      "Prata": "Boa leitura da loja. Ajustando alguns gaps você chega no planograma de referência.",
      "Bronze": "A base está de pé, mas itens de alto giro ficaram fora da gôndola.",
      "Em treino": "A gôndola perdeu venda: faltou obrigatório e o espaço não seguiu o giro."
    };
    $("#res-frase").textContent = (porTempo ? "O tempo acabou. " : "") + frases[r.nivel];

    $("#res-blocos").innerHTML = r.blocos.map(b => `
      <div class="bloco-nota">
        <b>${b.pontos}<i> / ${b.max}</i></b>
        <h4>${b.nome}</h4>
        <p>${b.detalhe}</p>
        <div class="barra"><i style="width:${(b.pontos / b.max * 100).toFixed(0)}%"></i></div>
      </div>`).join("");

    const escolha = mapaEscolha();
    $("#res-resumo-escolha").textContent =
      escolha.size + " SKUs em " + estado.slots.filter(Boolean).length + " espaços, " +
      Object.keys(r.meuShare).length + " categorias representadas.";
    $("#res-minha-gondola").innerHTML = miniGondola(estado.slots, c.colunas);

    const slotsIdeais = [];
    r.ideal.forEach((fac, id) => { for (let i = 0; i < fac; i++) slotsIdeais.push(id); });
    while (slotsIdeais.length < r.capacidade) slotsIdeais.push(null);
    $("#res-gondola-ideal").innerHTML = miniGondola(slotsIdeais.slice(0, r.capacidade), c.colunas);

    if (r.gaps.length) {
      $("#res-resumo-gaps").textContent =
        r.gaps.length + " itens obrigatórios deste formato ficaram fora. Venda estimada que a loja deixa na mesa: " +
        reais(r.perdaTotal) + " por mês.";
      $("#res-gaps").innerHTML = r.gaps.map(g => `
        <div class="item-gap">
          <img src="${g.sku.arquivo}" alt="">
          <div>
            <b>${g.sku.nome}</b>
            <small>${CATEGORIAS[g.sku.cat].nome} | EAN ${g.sku.ean} | presente em ${g.cobertura}% das lojas da base</small>
          </div>
          <div class="valor">${reais(g.perda)}<br><small style="font-weight:600;color:var(--cinza)">por mês</small></div>
        </div>`).join("");
    } else {
      $("#res-resumo-gaps").textContent = "Nenhum gap de obrigatório. Todos os itens que não podem faltar estão na sua gôndola.";
      $("#res-gaps").innerHTML = `<div class="item-gap positivo"><div style="grid-column:1 / -1"><b>Positivação completa</b><small>Os itens obrigatórios do formato estão todos expostos.</small></div></div>`;
    }

    $("#res-sugestoes").innerHTML = r.sugestoes.slice(0, 6).map(s => `
      <div class="item-gap">
        <img src="${s.sku.arquivo}" alt="">
        <div>
          <b>${s.sku.nome}</b>
          <small>${CATEGORIAS[s.sku.cat].nome} | índice de giro ${s.sku.giro}</small>
        </div>
        <div class="valor" style="color:var(--marrom)">${s.facings} esp.</div>
      </div>`).join("") || `<p style="font-size:13px;color:var(--cinza)">Seu mix já cobre os itens de maior giro do formato.</p>`;

    const excessos = r.excesso.slice(0, 4).map(e => `
      <div class="item-gap">
        <img src="${e.sku.arquivo}" alt="">
        <div><b>${e.sku.nome}</b><small>${e.ideal ? "Você deu " + e.facings + " espaços, o planograma de referência usa " + e.ideal : "Você deu " + e.facings + " espaços para um item de cauda longa neste formato"}</small></div>
        <div class="valor">-${e.facings - e.ideal}</div>
      </div>`).join("");
    const fora = r.foraFormato.slice(0, 4).map(f => `
      <div class="item-gap">
        <img src="${f.sku.arquivo}" alt="">
        <div><b>${f.sku.nome}</b><small>Fora do perfil de ${c.nome.toLowerCase()}: ${c.aviso.toLowerCase()}</small></div>
        <div class="valor">fora</div>
      </div>`).join("");
    $("#res-excessos").innerHTML = (fora + excessos) ||
      `<p style="font-size:13px;color:var(--cinza)">Nenhum excesso relevante. O espaço por item ficou coerente com o giro.</p>`;

    const estilo = getComputedStyle(document.documentElement);
    const corMinha = estilo.getPropertyValue("--vermelho").trim() || "#E30613";
    const corBase = estilo.getPropertyValue("--carvao").trim() || "#1B1512";
    const cats = [...new Set([...Object.keys(r.benchShare), ...Object.keys(r.meuShare)])]
      .sort((a, b) => (r.benchShare[b] || 0) - (r.benchShare[a] || 0));
    const maxv = Math.max(...cats.map(x => Math.max(r.meuShare[x] || 0, r.benchShare[x] || 0)), .01);
    $("#res-share").innerHTML = cats.map(cat => `
      <div class="linha-share">
        <span>${CATEGORIAS[cat].nome}</span>
        <div class="barras-share">
          <div class="barra-share"><div class="trilho"><i style="width:${(r.meuShare[cat] || 0) / maxv * 100}%;background:${corMinha}"></i></div><em>${pct(r.meuShare[cat])}</em></div>
          <div class="barra-share"><div class="trilho"><i style="width:${(r.benchShare[cat] || 0) / maxv * 100}%;background:${corBase}"></i></div><em>${pct(r.benchShare[cat])}</em></div>
        </div>
      </div>`).join("");

    STORE.ranking(10).then(top => {
      const eu = estado.participante.id;
      $("#res-resumo-ranking").textContent = top.length > 1
        ? "Melhores execuções registradas até agora neste evento."
        : "Você é a primeira pessoa a registrar uma execução.";
      $("#res-ranking").innerHTML = `
        <thead><tr><th>#</th><th>Participante</th><th>Empresa</th><th>Loja</th><th>Pontos</th></tr></thead>
        <tbody>${top.map((t, i) => `
          <tr style="${t.id === eu ? "background:#FFF7D6;font-weight:700" : ""}">
            <td class="pos">${i + 1}</td>
            <td>${(t.nome || "").split(" ").slice(0, 2).join(" ")}</td>
            <td>${t.empresa || ""}</td>
            <td>${t.formatoLoja || ""}</td>
            <td><b>${t.pontuacao}</b></td>
          </tr>`).join("")}</tbody>`;
    });
  }

  $("#btn-jogar-de-novo").addEventListener("click", () => {
    estado.cenario = null;
    $$("#lista-lojas .loja").forEach(o => o.classList.remove("marcada"));
    $("#btn-iniciar-jogo").disabled = true;
    estado.participante = Object.assign({}, estado.participante);
    delete estado.participante.id;
    delete estado.participante.pontuacao;
    estado.participante.status = "cadastrado";
    irPara("tela-briefing");
  });
})();
