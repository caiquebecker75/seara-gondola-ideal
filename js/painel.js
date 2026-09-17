/* ==========================================================================
   Painel de dados: leads, execucao e exportacao
   ========================================================================== */
(function () {
  const CFG = window.SEARA_CONFIG;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  let registros = [];

  /* cursor */
  (function () {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const bola = $(".bola"), eco = $(".bola-eco");
    let x = 0, y = 0, ex = 0, ey = 0;
    document.addEventListener("mousemove", e => {
      x = e.clientX; y = e.clientY; bola.style.transform = `translate(${x}px,${y}px)`;
    });
    document.addEventListener("mouseover", e => {
      eco.classList.toggle("ativa", !!e.target.closest("button, a, input, .sku"));
    });
    (function anima() {
      ex += (x - ex) * .18; ey += (y - ey) * .18;
      eco.style.transform = `translate(${ex}px,${ey}px)` + (eco.classList.contains("ativa") ? " scale(1.5)" : "");
      requestAnimationFrame(anima);
    })();
  })();

  function aviso(t) {
    const el = $("#aviso"); el.textContent = t; el.classList.add("aparece");
    setTimeout(() => el.classList.remove("aparece"), 2400);
  }

  $("#form-senha").addEventListener("submit", e => {
    e.preventDefault();
    if ($("#f-senha").value === CFG.senhaPainel) {
      sessionStorage.setItem("seara_painel_ok", "1");
      abrir();
    } else {
      document.querySelector('[data-erro="f-senha"]').textContent = "Senha incorreta";
      $("#f-senha").classList.add("invalido");
    }
  });

  function abrir() {
    $("#tela-senha").classList.remove("ativa");
    $("#tela-painel").classList.add("ativa");
    $("#tarja-evento").textContent = CFG.evento;
    const modos = {
      local: "Os registros ficam gravados neste aparelho. Para juntar os dados de vários celulares, ligue o Firebase ou a planilha do Google em config.js.",
      firebase: "Conectado ao Firestore. Os registros de todos os aparelhos aparecem aqui.",
      sheets: "Conectado a uma planilha do Google via Apps Script."
    };
    $("#descricao-modo").textContent = "Modo de armazenamento: " + CFG.storage + ".";
    $("#aviso-modo").textContent = modos[CFG.storage] || modos.local;
    carregar();
  }
  if (sessionStorage.getItem("seara_painel_ok") === "1") abrir();

  async function carregar() {
    registros = await STORE.listar();
    render();
  }
  $("#btn-atualizar").addEventListener("click", () => { carregar(); aviso("Dados atualizados"); });

  const fmtData = iso => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  function barras(alvo, itens, total) {
    if (!itens.length) { $(alvo).innerHTML = `<p style="font-size:13px;color:var(--cinza)">Sem dados ainda.</p>`; return; }
    const max = Math.max(...itens.map(i => i.valor), 1);
    $(alvo).innerHTML = itens.map(i => `
      <div class="barra-linha">
        <div>
          <div class="nome">${i.nome}</div>
          <div class="trilho"><i style="width:${i.valor / max * 100}%"></i></div>
        </div>
        <div class="num">${i.rotulo || i.valor}</div>
      </div>`).join("");
  }

  function render() {
    const concluidos = registros.filter(r => r.status === "concluido");
    const media = concluidos.length
      ? Math.round(concluidos.reduce((t, r) => t + (r.pontuacao || 0), 0) / concluidos.length) : 0;
    const perda = concluidos.length
      ? Math.round(concluidos.reduce((t, r) => t + (r.perdaEstimada || 0), 0) / concluidos.length) : 0;
    const tempos = concluidos.filter(r => r.tempoUsado).map(r => r.tempoUsado);
    const tempoMedio = tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : 0;

    $("#kpis").innerHTML = `
      <div class="kpi"><b>${registros.length}</b><span>Cadastros</span></div>
      <div class="kpi"><b>${concluidos.length}</b><span>Gôndolas montadas</span></div>
      <div class="kpi"><b>${media}</b><span>Pontuação média</span></div>
      <div class="kpi"><b>R$ ${perda.toLocaleString("pt-BR")}</b><span>Gap médio por loja</span></div>
      <div class="kpi"><b>${Math.floor(tempoMedio / 60)}m ${tempoMedio % 60}s</b><span>Tempo médio de jogo</span></div>`;

    /* gaps mais comuns */
    const cont = {};
    concluidos.forEach(r => (r.gaps || []).forEach(g => { cont[g.nome] = (cont[g.nome] || 0) + 1; }));
    barras("#gaps-comuns", Object.entries(cont)
      .map(([nome, valor]) => ({ nome, valor, rotulo: valor + "x" }))
      .sort((a, b) => b.valor - a.valor).slice(0, 8));

    /* skus mais escolhidos */
    const esc = {};
    concluidos.forEach(r => (r.skusEscolhidos || []).forEach(s => { esc[s.nome] = (esc[s.nome] || 0) + s.facings; }));
    barras("#skus-top", Object.entries(esc)
      .map(([nome, valor]) => ({ nome, valor, rotulo: valor }))
      .sort((a, b) => b.valor - a.valor).slice(0, 8));

    /* desempenho por formato */
    const porF = {};
    concluidos.forEach(r => {
      const k = r.formatoLoja || "Sem formato";
      porF[k] = porF[k] || { soma: 0, n: 0 };
      porF[k].soma += r.pontuacao || 0; porF[k].n++;
    });
    barras("#por-formato", Object.entries(porF)
      .map(([nome, v]) => ({ nome: nome + " (" + v.n + ")", valor: Math.round(v.soma / v.n), rotulo: Math.round(v.soma / v.n) }))
      .sort((a, b) => b.valor - a.valor));

    /* ranking */
    const top = concluidos.slice().sort((a, b) => (b.pontuacao || 0) - (a.pontuacao || 0)).slice(0, 10);
    $("#tabela-ranking").innerHTML = `
      <thead><tr><th>#</th><th>Nome</th><th>Empresa</th><th>Pontos</th><th>Nível</th></tr></thead>
      <tbody>${top.map((r, i) => `<tr>
        <td class="pos">${i + 1}</td><td>${r.nome || ""}</td><td>${r.empresa || ""}</td>
        <td class="mono"><b>${r.pontuacao}</b></td><td>${r.nivel || ""}</td></tr>`).join("")}</tbody>`;

    /* base de leads */
    $("#resumo-base").textContent = registros.length + " registros coletados no evento " + CFG.evento + ".";
    $("#tabela-leads").innerHTML = `
      <thead><tr>
        <th>Nome</th><th>Telefone</th><th>E-mail</th><th>Empresa</th><th>Área</th>
        <th>Loja</th><th>Pontos</th><th>Status</th><th>Quando</th>
      </tr></thead>
      <tbody>${registros.map(r => `<tr>
        <td>${r.nome || ""}</td>
        <td class="mono">${r.telefone || ""}</td>
        <td>${r.email || ""}</td>
        <td>${r.empresa || ""}</td>
        <td>${r.area || ""}</td>
        <td>${r.formatoLoja || ""}</td>
        <td class="mono">${r.pontuacao != null ? r.pontuacao : ""}</td>
        <td>${r.status === "concluido" ? "Concluiu" : "Só cadastro"}</td>
        <td class="mono">${fmtData(r.criadoEm)}</td>
      </tr>`).join("")}</tbody>`;
  }

  function baixar(nome, conteudo, tipo) {
    const b = new Blob([conteudo], { type: tipo });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = nome;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  $("#btn-csv").addEventListener("click", () => {
    const cols = ["nome", "telefone", "email", "empresa", "area", "formatoLoja", "pontuacao", "nivel", "perdaEstimada", "tempoUsado", "status", "criadoEm", "evento"];
    const linhas = [cols.join(";")].concat(registros.map(r => cols.map(c => {
      const v = r[c] == null ? "" : String(r[c]).replace(/[;\n\r]/g, " ");
      return v;
    }).join(";")));
    const gapsCol = registros.map(r => (r.gaps || []).map(g => g.nome).join(" | "));
    const comGaps = linhas.map((l, i) => i === 0 ? l + ";gaps" : l + ";" + gapsCol[i - 1]);
    baixar("participantes-seara-gondola.csv", "﻿" + comGaps.join("\n"), "text/csv;charset=utf-8");
  });

  $("#btn-json").addEventListener("click", () => {
    baixar("participantes-seara-gondola.json", JSON.stringify(registros, null, 2), "application/json");
  });

  $("#btn-limpar").addEventListener("click", () => {
    if (!confirm("Isso apaga os registros gravados neste aparelho. Baixe o CSV antes. Continuar?")) return;
    STORE.limparLocal();
    carregar();
    aviso("Registros locais apagados");
  });
})();
