/* ==========================================================================
   Camada de dados. Grava e le os registros dos participantes.
   Drivers: local (localStorage), firebase (Firestore), sheets (Apps Script).
   ========================================================================== */
(function () {
  const CFG = window.SEARA_CONFIG;
  const CHAVE = "seara_gondola_registros";
  const FILA = "seara_gondola_fila";

  function lerLocal() {
    try { return JSON.parse(localStorage.getItem(CHAVE) || "[]"); } catch (e) { return []; }
  }
  function gravarLocal(lista) {
    try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch (e) {}
  }
  function guardarNaFila(registro) {
    try {
      const f = JSON.parse(localStorage.getItem(FILA) || "[]");
      f.push(registro);
      localStorage.setItem(FILA, JSON.stringify(f));
    } catch (e) {}
  }

  let db = null;
  async function firestore() {
    if (db) return db;
    const app = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    const fs = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const a = app.initializeApp(CFG.firebase);
    db = { fs, ref: fs.getFirestore(a) };
    return db;
  }

  const Store = {
    modo: CFG.storage,

    async salvar(registro) {
      registro.id = registro.id || (Date.now() + "-" + Math.random().toString(36).slice(2, 8));
      registro.criadoEm = registro.criadoEm || new Date().toISOString();
      registro.evento = CFG.evento;

      /* O registro sempre fica tambem no aparelho, para nao se perder queda de rede. */
      const lista = lerLocal();
      const i = lista.findIndex(r => r.id === registro.id);
      if (i >= 0) lista[i] = registro; else lista.push(registro);
      gravarLocal(lista);

      try {
        if (CFG.storage === "firebase" && CFG.firebase.projectId) {
          const { fs, ref } = await firestore();
          await fs.setDoc(fs.doc(ref, CFG.firebaseColecao, registro.id), registro);
        } else if (CFG.storage === "sheets" && CFG.sheetsUrl) {
          await fetch(CFG.sheetsUrl, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(registro)
          });
        }
      } catch (e) {
        guardarNaFila(registro);
        console.warn("Registro guardado apenas no aparelho:", e);
      }
      return registro;
    },

    async listar() {
      if (CFG.storage === "firebase" && CFG.firebase.projectId) {
        try {
          const { fs, ref } = await firestore();
          const snap = await fs.getDocs(fs.collection(ref, CFG.firebaseColecao));
          const out = [];
          snap.forEach(d => out.push(d.data()));
          return out.sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));
        } catch (e) { console.warn(e); }
      }
      if (CFG.storage === "sheets" && CFG.sheetsUrl) {
        try {
          const r = await fetch(CFG.sheetsUrl + "?acao=listar");
          const j = await r.json();
          if (Array.isArray(j)) return j;
        } catch (e) { console.warn(e); }
      }
      return lerLocal().sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));
    },

    async ranking(limite) {
      const l = await this.listar();
      return l.filter(r => typeof r.pontuacao === "number")
              .sort((a, b) => b.pontuacao - a.pontuacao)
              .slice(0, limite || 10);
    },

    limparLocal() { gravarLocal([]); }
  };

  window.STORE = Store;
})();
