/**
 * Monte sua gondola ideal | coletor de dados em planilha do Google
 *
 * Como ligar:
 * 1. Crie uma planilha nova no Google Drive.
 * 2. Extensoes > Apps Script, cole este arquivo e salve.
 * 3. Implantar > Nova implantacao > Tipo: app da web.
 *    Executar como: eu. Quem pode acessar: qualquer pessoa.
 * 4. Copie a URL gerada e cole em config.js:
 *    storage: "sheets", sheetsUrl: "https://script.google.com/..."
 */

var ABA = "participantes";

var COLUNAS = ["id", "criadoEm", "evento", "nome", "telefone", "email", "empresa", "area",
  "formatoLoja", "pontuacao", "nivel", "perdaEstimada", "tempoUsado", "status",
  "skus", "gaps", "dispositivo"];

function planilha() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(ABA);
  if (!aba) {
    aba = ss.insertSheet(ABA);
    aba.appendRow(COLUNAS);
  }
  return aba;
}

function doPost(e) {
  var dados = JSON.parse(e.postData.contents);
  var aba = planilha();
  var valores = aba.getDataRange().getValues();
  var linha = COLUNAS.map(function (c) {
    if (c === "skus") return (dados.skusEscolhidos || []).map(function (s) { return s.nome + " x" + s.facings; }).join(" | ");
    if (c === "gaps") return (dados.gaps || []).map(function (g) { return g.nome; }).join(" | ");
    return dados[c] != null ? dados[c] : "";
  });
  for (var i = 1; i < valores.length; i++) {
    if (valores[i][0] === dados.id) {
      aba.getRange(i + 1, 1, 1, COLUNAS.length).setValues([linha]);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, atualizado: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  aba.appendRow(linha);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var aba = planilha();
  var valores = aba.getDataRange().getValues();
  var cab = valores.shift();
  var saida = valores.map(function (linha) {
    var o = {};
    cab.forEach(function (c, i) { o[c] = linha[i]; });
    o.gaps = String(o.gaps || "").split(" | ").filter(String).map(function (n) { return { nome: n }; });
    o.skusEscolhidos = String(o.skus || "").split(" | ").filter(String).map(function (t) {
      var p = t.split(" x");
      return { nome: p[0], facings: Number(p[1] || 1) };
    });
    return o;
  });
  return ContentService.createTextOutput(JSON.stringify(saida))
    .setMimeType(ContentService.MimeType.JSON);
}
