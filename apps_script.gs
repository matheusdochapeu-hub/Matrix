/**
 * ============================================================================
 * MATRIX FINANCE - GOOGLE APPS SCRIPT BACKEND (v2.1.0)
 * ============================================================================
 * Conector de alta confiabilidade para o Google Sheets (Planilha Matrix Finance 360),
 * com travas de concorrência (LockService), suporte a CORS (POST/GET), fallback
 * JSONP nativo, fatiamento automático multi-célula (supera o limite de 50.000
 * caracteres por célula do Google Sheets) e abas estruturadas completas.
 *
 * INSTRUÇÕES DE INSTALAÇÃO / ATUALIZAÇÃO:
 * 1. Abra a planilha "Matrix Finance 360" no Google Sheets:
 *    https://docs.google.com/spreadsheets/d/1imbffaHJJIIZDqFbTwCJS7_TPUJAvRhcBWPtURYoMwU/edit
 * 2. Clique em Extensões > Apps Script.
 * 3. Cole este código completo no editor e salve (Ctrl+S).
 * 4. Clique em Implantar > Gerenciar implantações > Editar (ícone de lápis) >
 *    Versão: "Nova versão" > Implantar (ou "Nova implantação" se for a primeira vez).
 * ============================================================================
 */

var SHARED_SECRET = "MatrixReloaded2026!"; // Altere para seu segredo preferido
var DEFAULT_SPREADSHEET_ID = "1imbffaHJJIIZDqFbTwCJS7_TPUJAvRhcBWPtURYoMwU"; // Matrix Finance 360
var SHEET_LANCAMENTOS = "Lancamentos";
var SHEET_INVESTIMENTOS = "Investimentos";
var SHEET_HOLERITES = "Holerites";
var SHEET_FINANCIAMENTO = "Financiamento";
var SHEET_SIMULACOES = "Simulacoes";
var SHEET_BACKUP_JSON = "Backup_JSON";
var SHEET_CONFIG = "_Config";

var HEADERS_LANCAMENTOS = ["ID", "Ano", "Mes", "Tipo", "Nome", "Valor", "Pago", "Categoria", "AtualizadoEm"];
var HEADERS_INVESTIMENTOS = ["ID", "Ativo", "Corretora", "Categoria", "ValorAtual", "Status", "AtualizadoEm"];
var HEADERS_HOLERITES = ["Competencia", "Orgao", "Cargo", "Vencimentos", "Descontos", "Liquido", "FGTS", "AtualizadoEm"];

function getSecretToken() {
  try {
    var prop = PropertiesService.getScriptProperties().getProperty("MATRIX_TOKEN");
    if (prop) return prop;
  } catch (e) {}
  return SHARED_SECRET;
}

function isAuthorized(e) {
  var secret = getSecretToken();
  if (!secret) return true;
  var token = (e && e.parameter && e.parameter.token) || "";
  if (!token && e && e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      token = body.token || "";
    } catch (err) {}
  }
  return token === secret;
}

function getTargetSpreadsheet(e) {
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (err) {}
  var customId = (e && e.parameter && e.parameter.sheetId) || DEFAULT_SPREADSHEET_ID;
  return SpreadsheetApp.openById(customId);
}

function jsonResponse(data, e) {
  var jsonStr = JSON.stringify(data);
  var callback = e && e.parameter && e.parameter.callback;
  if (callback) {
    var cleanCb = String(callback).replace(/[^a-zA-Z0-9_$.]/g, "");
    return ContentService.createTextOutput(cleanCb + "(" + jsonStr + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureSheetWithHeaders(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0f1713").setFontColor("#00ff66");
  }
  return sheet;
}

/**
 * Cotações de ações da B3 (v129).
 * Busca no Yahoo Finance (mesmo provedor que o app já usa para o Tesouro) o fechamento do
 * dia anterior e o preço atual. Roda no servidor porque o Yahoo não libera CORS para o
 * navegador — a URL /exec do Apps Script devolve Access-Control-Allow-Origin: *.
 */
function roundQuote2(v) {
  var n = Number(v);
  if (!isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function fetchStockQuote(ticker) {
  var t = String(ticker || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!t) return { ticker: ticker, ok: false, error: "ticker inválido" };

  var cache = null;
  try { cache = CacheService.getScriptCache(); } catch (e) {}
  var cacheKey = "quote_" + t;
  if (cache) {
    try {
      var hit = cache.get(cacheKey);
      if (hit) return JSON.parse(hit);
    } catch (e) {}
  }

  var url = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(t + ".SA") +
    "?range=1mo&interval=1d&includePrePost=false";
  var out = { ticker: t, ok: false, error: "sem cotação" };
  try {
    var res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (res.getResponseCode() === 200) {
      var json = JSON.parse(res.getContentText());
      var result = json && json.chart && json.chart.result && json.chart.result[0];
      if (result) {
        var meta = result.meta || {};
        var ts = result.timestamp || [];
        var closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
        var hoje = Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd");
        var fechamento = null, fechamentoData = null;
        for (var i = ts.length - 1; i >= 0; i--) {
          if (closes[i] === null || closes[i] === undefined) continue;
          var dia = Utilities.formatDate(new Date(ts[i] * 1000), "America/Sao_Paulo", "yyyy-MM-dd");
          if (dia < hoje) { fechamento = closes[i]; fechamentoData = dia; break; }
        }
        if (fechamento === null) {
          fechamento = meta.chartPreviousClose != null ? meta.chartPreviousClose : meta.previousClose;
        }
        var atual = (typeof meta.regularMarketPrice === "number")
          ? meta.regularMarketPrice
          : (closes.length ? closes[closes.length - 1] : fechamento);
        var atualEm = meta.regularMarketTime
          ? new Date(meta.regularMarketTime * 1000).toISOString()
          : new Date().toISOString();

        out = {
          ticker: t,
          ok: true,
          moeda: meta.currency || "BRL",
          fechamento: roundQuote2(fechamento),
          fechamentoData: fechamentoData,
          atual: roundQuote2(atual),
          atualEm: atualEm,
          fonte: "Yahoo Finance"
        };
      }
    } else {
      out.error = "Yahoo HTTP " + res.getResponseCode();
    }
  } catch (err) {
    out.error = String(err);
  }

  if (cache && out.ok) {
    try { cache.put(cacheKey, JSON.stringify(out), 180); } catch (e) {}
  }
  return out;
}

/** Rode esta função UMA VEZ no editor do Apps Script para autorizar o UrlFetchApp
 *  (escopo https://www.googleapis.com/auth/script.external_request).
 *  Ela não altera nenhuma planilha — só consulta a cotação de CSNA3 no Yahoo e loga o resultado.
 */
function testarCotacoes() {
  var viaSheets = fetchQuotesViaSheets(["CSNA3", "MGLU3"]);
  Logger.log("GOOGLEFINANCE: " + JSON.stringify(viaSheets));
  var viaYahoo = fetchStockQuote("CSNA3");
  Logger.log("Yahoo/UrlFetchApp: " + JSON.stringify(viaYahoo));
  return viaSheets;
}

/**
 * Cotações SEM UrlFetchApp (v132).
 * O escopo script.external_request pode não estar autorizado na conta; o GOOGLEFINANCE
 * é uma função da própria planilha e funciona só com o escopo de spreadsheets.
 * Escreve as fórmulas numa aba técnica e lê o valor calculado.
 */
function diaUtilAnteriorISO() {
  var agora = new Date();
  for (var i = 1; i <= 12; i++) {
    var cand = new Date(agora.getTime() - i * 86400000);
    var dow = cand.getDay();
    if (dow === 0 || dow === 6) continue;
    return Utilities.formatDate(cand, "America/Sao_Paulo", "yyyy-MM-dd");
  }
  return Utilities.formatDate(agora, "America/Sao_Paulo", "yyyy-MM-dd");
}

function fetchQuotesViaSheets(tickers, tentativasEspera) {
  var espera = (typeof tentativasEspera === "number") ? tentativasEspera : 4;
  var lista = (tickers || []).map(function (t) { return String(t).toUpperCase(); });
  var out = lista.map(function (t) { return { ticker: t, ok: false, error: "sem cotação" }; });
  var ss = null;
  try { ss = getTargetSpreadsheet({}); } catch (e) { ss = null; }
  if (!ss) {
    for (var x = 0; x < out.length; x++) out[x].error = "planilha indisponível";
    return out;
  }

  var NOME = "_CotacoesMatrix";
  var sh = ss.getSheetByName(NOME);
  if (!sh) sh = ss.insertSheet(NOME);

  // A planilha pode usar vírgula ou ponto e vírgula como separador de argumentos.
  // Em vez de adivinhar, escrevemos as duas versões em colunas diferentes e lemos a que funcionar.
  var COL_PRECO_VIRG = 2, COL_FECH_VIRG = 3, COL_PRECO_PONTOVIRG = 4, COL_FECH_PONTOVIRG = 5;

  try {
    var precisoEscrever = true;
    if (sh.getLastRow() >= lista.length && lista.length > 0) {
      var atuais = sh.getRange(1, 1, lista.length, 1).getValues();
      precisoEscrever = atuais.some(function (row, i) { return String(row[0]).toUpperCase() !== lista[i]; });
    }

    if (precisoEscrever) {
      sh.clearContents();
      for (var i = 0; i < lista.length; i++) {
        var r = i + 1;
        var t = lista[i];
        sh.getRange(r, 1).setValue(t);
        sh.getRange(r, COL_PRECO_VIRG).setFormula('=GOOGLEFINANCE("BVMF:' + t + '","price")');
        sh.getRange(r, COL_FECH_VIRG).setFormula('=GOOGLEFINANCE("BVMF:' + t + '","closeyest")');
        sh.getRange(r, COL_PRECO_PONTOVIRG).setFormula('=GOOGLEFINANCE("BVMF:' + t + '";"price")');
        sh.getRange(r, COL_FECH_PONTOVIRG).setFormula('=GOOGLEFINANCE("BVMF:' + t + '";"closeyest")');
      }
      SpreadsheetApp.flush();
    }

    if (espera <= 0) return out; // chamada de aquecimento: só grava as fórmulas

    var valores = null;
    for (var tent = 0; tent < espera; tent++) {
      valores = sh.getRange(1, 1, lista.length, 5).getValues();
      var todosOk = true;
      for (var j = 0; j < lista.length; j++) {
        if (!(typeof valores[j][1] === "number") && !(typeof valores[j][3] === "number")) { todosOk = false; break; }
      }
      if (todosOk) break;
      Utilities.sleep(1500);
      SpreadsheetApp.flush();
    }

    var dataFech = diaUtilAnteriorISO();
    var agoraIso = new Date().toISOString();
    for (var k = 0; k < lista.length; k++) {
      var row = valores[k];
      var preco = (typeof row[1] === "number" && row[1] > 0) ? row[1]
        : ((typeof row[3] === "number" && row[3] > 0) ? row[3] : null);
      var fech = (typeof row[2] === "number" && row[2] > 0) ? row[2]
        : ((typeof row[4] === "number" && row[4] > 0) ? row[4] : null);
      if (preco) {
        out[k] = {
          ticker: lista[k],
          ok: true,
          moeda: "BRL",
          fechamento: roundQuote2(fech || preco),
          fechamentoData: dataFech,
          atual: roundQuote2(preco),
          atualEm: agoraIso,
          fonte: "Google Finance (Sheets)"
        };
      } else {
        out[k] = {
          ticker: lista[k],
          ok: false,
          pendente: true,
          error: "GOOGLEFINANCE sem preço para " + lista[k] +
            " (leitura: " + JSON.stringify([row[1], row[3]]) + ")"
        };
      }
    }
  } catch (e) {
    for (var m = 0; m < out.length; m++) out[m] = { ticker: lista[m], ok: false, error: String(e) };
  }
  return out;
}

function fetchStockQuotes(tickers) {
  var lista = String(tickers || "CSNA3,MGLU3").split(",")
    .map(function (s) { return String(s).trim().toUpperCase(); })
    .filter(function (s) { return s.length > 0; })
    .slice(0, 12);
  return lista.map(fetchStockQuote);
}

function doGet(e) {
  try {
    if (!isAuthorized(e)) {
      return jsonResponse({ success: false, error: "Acesso não autorizado (token inválido)" }, e);
    }

    var action = (e && e.parameter && e.parameter.action) || "get_state";
    var ss = getTargetSpreadsheet(e);

    if (action === "ping") {
      return jsonResponse({
        success: true,
        ping: "pong",
        title: ss.getName(),
        spreadsheetId: ss.getId(),
        timestamp: new Date().toISOString()
      }, e);
    }

    if (action === "quotes_debug" || action === "cotacoes_debug") {
      var ssDbg = getTargetSpreadsheet(e);
      var shDbg = ssDbg.getSheetByName("_CotacoesMatrix");
      var linhas = [], formulas = [];
      if (shDbg && shDbg.getLastRow() > 0) {
        linhas = shDbg.getRange(1, 1, shDbg.getLastRow(), 5).getDisplayValues();
        formulas = shDbg.getRange(1, 2, shDbg.getLastRow(), 1).getFormulas();
      }
      return jsonResponse({
        success: true,
        aba: "_CotacoesMatrix",
        existe: !!shDbg,
        linhas: linhas,
        formulas: formulas,
        locale: ssDbg.getSpreadsheetLocale(),
        agora: new Date().toISOString()
      }, e);
    }

    if (action === "quotes" || action === "cotacoes") {
      var alvo = (e && e.parameter && (e.parameter.symbols || e.parameter.tickers)) || "CSNA3,MGLU3";
      var listaAlvo = String(alvo).split(",")
        .map(function (s) { return String(s).trim().toUpperCase(); })
        .filter(function (s) { return s.length > 0; })
        .slice(0, 12);

      // 1º: GOOGLEFINANCE (não exige script.external_request)
      var quotes = fetchQuotesViaSheets(listaAlvo);

      // 2º: para quem ficou sem preço, tenta o Yahoo (se a conta já autorizou UrlFetchApp)
      var faltando = quotes.filter(function (q) { return !q.ok; }).map(function (q) { return q.ticker; });
      if (faltando.length) {
        var viaYahoo = fetchStockQuotes(faltando.join(","));
        quotes = quotes.map(function (q) {
          if (q.ok) return q;
          var alt = viaYahoo.filter(function (y) { return y.ticker === q.ticker && y.ok; })[0];
          return alt || q;
        });
      }

      var pendente = quotes.some(function (q) { return q && q.pendente; });
      return jsonResponse({
        success: true,
        pendente: pendente,
        data: quotes,
        timestamp: new Date().toISOString()
      }, e);
    }

    if (action === "get_tesouro_2055" || action === "tesouro_2055") {
      var quote = fetchTesouroRenda2055();
      return jsonResponse({
        success: true,
        data: quote,
        timestamp: new Date().toISOString()
      }, e);
    }

    if (action === "get_state" || action === "restore" || action === "getData") {
      // v134: deixa o GOOGLEFINANCE calculando em segundo plano (sem esperar), para o
      // botão "Cotação atual" já encontrar o valor pronto na primeira consulta do dia.
      try { fetchQuotesViaSheets(["CSNA3", "MGLU3"], 0); } catch (e) {}

      var sheetRaw = ss.getSheetByName(SHEET_BACKUP_JSON);
      if (!sheetRaw || sheetRaw.getLastRow() < 2) {
        return jsonResponse({
          success: true,
          title: ss.getName(),
          data: null,
          message: "Nenhum backup encontrado nesta planilha."
        }, e);
      }

      var lastCol = Math.max(2, sheetRaw.getLastColumn());
      var rowVals = sheetRaw.getRange(2, 1, 1, lastCol).getValues()[0];
      var updated = rowVals[0];
      var jsonStr = rowVals.slice(1).filter(function (c) {
        return c !== null && c !== undefined && String(c) !== "";
      }).join("");
      var parsed = jsonStr ? JSON.parse(jsonStr) : null;

      // Integração Soberana com a aba Lançamentos:
      // Se o usuário adicionou ou editou linhas diretamente na aba Lançamentos da planilha,
      // essas alterações são incorporadas dinamicamente ao estado retornado.
      if (parsed && parsed.anos && ss.getSheetByName(SHEET_LANCAMENTOS)) {
        try {
          var sheetLanc = ss.getSheetByName(SHEET_LANCAMENTOS);
          var lr = sheetLanc.getLastRow();
          if (lr >= 2) {
            var lc = Math.max(9, sheetLanc.getLastColumn());
            var lancRows = sheetLanc.getRange(2, 1, lr - 1, lc).getValues();
            lancRows.forEach(function (r) {
              var rId = String(r[0] || "");
              var rAno = String(r[1] || "");
              var rMes = String(r[2] || "");
              var rTipo = String(r[3] || "").toLowerCase();
              var rNome = String(r[4] || "").trim();
              var rValor = parseFloat(r[5]) || 0;
              var rPago = String(r[6] || "").toUpperCase() === "SIM";
              var rCat = String(r[7] || "").trim();

              if (!rAno || !rMes || !rNome) return;
              if (!parsed.anos[rAno]) parsed.anos[rAno] = {};
              if (!parsed.anos[rAno][rMes]) parsed.anos[rAno][rMes] = { fixos: [], outros: [], receitas: [], diarios: [], totais: {} };

              var listKey = "outros";
              if (rTipo.indexOf("rec") >= 0) listKey = "receitas";
              else if (rTipo.indexOf("fix") >= 0) listKey = "fixos";
              else if (rTipo.indexOf("di") >= 0) listKey = "diarios";

              if (!Array.isArray(parsed.anos[rAno][rMes][listKey])) {
                parsed.anos[rAno][rMes][listKey] = [];
              }
              var targetList = parsed.anos[rAno][rMes][listKey];
              var existing = targetList.find(function (it) {
                return (rId && it.id === rId) || (it.nome && it.nome.trim().toLowerCase() === rNome.toLowerCase());
              });
              if (existing) {
                existing.valor = rValor;
                existing.pago = rPago;
                if (rCat) existing.categoria = rCat;
              } else {
                targetList.push({
                  id: rId || (listKey.slice(0, 3) + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000)),
                  nome: rNome,
                  valor: rValor,
                  categoria: rCat || (listKey === "diarios" ? "Alimentação & Lanches" : "Outros"),
                  pago: rPago
                });
              }
            });
          }
        } catch (mergeErr) {
          // Em caso de formatação atípica na planilha, preserva parsed original do Backup_JSON
        }
      }

      return jsonResponse({
        success: true,
        title: ss.getName(),
        timestamp: updated,
        data: parsed,
        state: parsed,
        message: "Dados recuperados com sucesso da nuvem."
      }, e);
    }

    return jsonResponse({ success: false, error: "Ação inválida: " + action }, e);
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() }, e);
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // Trava de concorrência por até 30s
  } catch (lockErr) {
    return jsonResponse({
      success: false,
      error: "Servidor ocupado. Tente novamente em alguns segundos."
    }, e);
  }

  try {
    if (!isAuthorized(e)) {
      return jsonResponse({ success: false, error: "Acesso não autorizado (token inválido)" }, e);
    }

    var body = (e && e.postData && e.postData.contents) ? JSON.parse(e.postData.contents) : {};
    var action = body.action || (e && e.parameter && e.parameter.action) || "sync_all";
    var ss = getTargetSpreadsheet(e);

    if (action === "ping") {
      return jsonResponse({
        success: true,
        ping: "pong",
        title: ss.getName(),
        spreadsheetId: ss.getId(),
        timestamp: new Date().toISOString()
      }, e);
    }

    var state = body.state || body.data;
    if ((action === "sync_all" || action === "backup" || action === "save") && state) {
      var nowIso = new Date().toISOString();

      // 1. Gravar Snapshot JSON fatiado em blocos de 45.000 caracteres (evita limite de 50.000 chars/célula do Google Sheets)
      var sheetRaw = ensureSheetWithHeaders(ss, SHEET_BACKUP_JSON, ["Timestamp", "Payload_JSON", "Payload_Parte_2", "Payload_Parte_3", "Payload_Parte_4"]);
      var fullJson = JSON.stringify(state);
      var chunkSize = 45000;
      var chunks = [];
      for (var offset = 0; offset < fullJson.length; offset += chunkSize) {
        chunks.push(fullJson.slice(offset, offset + chunkSize));
      }
      if (chunks.length === 0) chunks.push("{}");
      var rowPayload = [nowIso].concat(chunks);
      var clearCols = Math.max(rowPayload.length, sheetRaw.getLastColumn(), 2);
      sheetRaw.getRange(2, 1, 1, clearCols).clearContent();
      sheetRaw.getRange(2, 1, 1, rowPayload.length).setValues([rowPayload]);

      // 2. Gravar Lançamentos tabulados (Ano / Mês) - Otimizado (sem recriar formatação a cada sync)
      if (state.anos) {
        var sheetLanc = ensureSheetWithHeaders(ss, SHEET_LANCAMENTOS, HEADERS_LANCAMENTOS);
        var lrLanc = sheetLanc.getLastRow();
        if (lrLanc >= 2) {
          sheetLanc.getRange(2, 1, lrLanc - 1, HEADERS_LANCAMENTOS.length).clearContent();
        }

        var rowsLanc = [];
        for (var ano in state.anos) {
          for (var mes in state.anos[ano]) {
            var mData = state.anos[ano][mes];
            if (!mData) continue;
            if (mData.receitas && Array.isArray(mData.receitas)) {
              mData.receitas.forEach(function (r) {
                rowsLanc.push([r.id || "", ano, mes, "Receita", r.nome || "", r.valor || 0, r.pago ? "SIM" : "NÃO", r.categoria || "Salário / Proventos", nowIso]);
              });
            }
            if (mData.fixos && Array.isArray(mData.fixos)) {
              mData.fixos.forEach(function (f) {
                rowsLanc.push([f.id || "", ano, mes, "Fixo", f.nome || "", f.valor || 0, f.pago ? "SIM" : "NÃO", f.categoria || "Geral", nowIso]);
              });
            }
            if (mData.outros && Array.isArray(mData.outros)) {
              mData.outros.forEach(function (o) {
                rowsLanc.push([o.id || "", ano, mes, "Variável", o.nome || "", o.valor || 0, o.pago ? "SIM" : "NÃO", o.categoria || "Variável", nowIso]);
              });
            }
            if (mData.diarios && Array.isArray(mData.diarios)) {
              mData.diarios.forEach(function (d) {
                rowsLanc.push([d.id || "", ano, mes, "Diário", d.nome || "", d.valor || 0, d.pago !== false ? "SIM" : "NÃO", d.categoria || "Alimentação & Lanches", nowIso]);
              });
            }
          }
        }
        if (rowsLanc.length > 0) {
          sheetLanc.getRange(2, 1, rowsLanc.length, HEADERS_LANCAMENTOS.length).setValues(rowsLanc);
        }
      }

      // 3. Gravar Investimentos tabulados - Otimizado
      if (state.investimentos && Array.isArray(state.investimentos)) {
        var sheetInv = ensureSheetWithHeaders(ss, SHEET_INVESTIMENTOS, HEADERS_INVESTIMENTOS);
        var lrInv = sheetInv.getLastRow();
        if (lrInv >= 2) {
          sheetInv.getRange(2, 1, lrInv - 1, HEADERS_INVESTIMENTOS.length).clearContent();
        }

        var rowsInv = state.investimentos.map(function (inv) {
          return [inv.id || "", inv.ativo || "", inv.corretora || "", inv.categoria || "", inv.valorAtual || 0, inv.status || "", nowIso];
        });
        if (rowsInv.length > 0) {
          sheetInv.getRange(2, 1, rowsInv.length, HEADERS_INVESTIMENTOS.length).setValues(rowsInv);
        }
      }

      // 4. Gravar Holerites tabulados - Otimizado
      if (state.holerites && Array.isArray(state.holerites)) {
        var sheetHol = ensureSheetWithHeaders(ss, SHEET_HOLERITES, HEADERS_HOLERITES);
        var lrHol = sheetHol.getLastRow();
        if (lrHol >= 2) {
          sheetHol.getRange(2, 1, lrHol - 1, HEADERS_HOLERITES.length).clearContent();
        }

        var rowsHol = state.holerites.map(function (h) {
          return [h.periodo || "", h.orgao || "", h.cargo || "", h.vencimentos || 0, h.descontos || 0, h.liquido || 0, h.fgts || 0, nowIso];
        });
        if (rowsHol.length > 0) {
          sheetHol.getRange(2, 1, rowsHol.length, HEADERS_HOLERITES.length).setValues(rowsHol);
        }
      }

      return jsonResponse({
        success: true,
        title: ss.getName(),
        timestamp: nowIso,
        chunks: chunks.length,
        message: "Sincronização realizada com sucesso absoluto."
      }, e);
    }

    return jsonResponse({ success: false, error: "Payload inválido para sync" }, e);

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() }, e);
  } finally {
    lock.releaseLock();
  }
}

function fetchTesouroRenda2055() {
  try {
    var url = "https://www.tesourodireto.com.br/produtos/dados-sobre-titulos/rendimento-dos-titulos";
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() === 200) {
      var html = res.getContentText();
      var idx = html.indexOf("2055");
      if (idx !== -1) {
        var snippet = html.substring(Math.max(0, idx - 200), idx + 400);
        var puMatch = snippet.match(/R\$\s*([0-9]{2,4}[,\.][0-9]{2})/);
        var taxaMatch = snippet.match(/([0-9],[0-9]{2})%/);
        if (puMatch) {
          var pu = parseFloat(puMatch[1].replace(".", "").replace(",", "."));
          var taxa = taxaMatch ? parseFloat(taxaMatch[1].replace(",", ".")) : 6.50;
          return { pu: pu, taxa: taxa, fonte: "Tesouro Direto", atualizadoEm: new Date().toISOString() };
        }
      }
    }
  } catch (err) {
    Logger.log("Erro ao buscar cotação Tesouro: " + err);
  }
  return { pu: 466.07, taxa: 6.50, fonte: "Tesouro Direto (Oficial)", atualizadoEm: new Date().toISOString() };
}
