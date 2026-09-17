/* ==========================================================================
   Configuracao do jogo "Monte sua gondola ideal"
   Edite este arquivo para ligar o jogo a um banco de dados e mudar o evento.
   ========================================================================== */
window.SEARA_CONFIG = {

  /* Nome do evento exibido nas telas e gravado em cada registro */
  evento: "Convenção Seara 2026",

  /* Senha do painel de dados (painel.html) */
  senhaPainel: "seara2026",

  /* Tempo de jogo em segundos. Use 0 para desligar o cronometro. */
  tempoJogo: 300,

  /* Onde os dados sao gravados:
     "local"    = no proprio aparelho (localStorage). Funciona sem nenhuma configuracao,
                  ideal para totem unico. O painel le os registros daquele aparelho.
     "firebase" = Firestore. Preencha o objeto firebase abaixo. Varios aparelhos, painel ao vivo.
     "sheets"   = Google Apps Script publicado como app da web. Preencha sheetsUrl.        */
  storage: "local",

  /* Usado quando storage = "firebase" */
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },
  firebaseColecao: "participantes",

  /* Usado quando storage = "sheets" (ver apps-script/Codigo.gs) */
  sheetsUrl: "",

  /* Texto de consentimento exibido no cadastro */
  lgpd: "Autorizo o uso dos meus dados de contato pela Seara e pela 75 LAB para fins deste evento."
};
