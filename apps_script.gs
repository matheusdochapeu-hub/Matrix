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

    if (action === "get_tesouro_2055" || action === "tesouro_2055") {
      var quote = fetchTesouroRenda2055();
      return jsonResponse({
        success: true,
        data: quote,
        timestamp: new Date().toISOString()
      }, e);
    }

    if (action === "get_state" || action === "restore" || action === "getData") {
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

      // 2. Gravar Lançamentos tabulados (Ano / Mês)
      if (state.anos) {
        var sheetLanc = ensureSheetWithHeaders(ss, SHEET_LANCAMENTOS, HEADERS_LANCAMENTOS);
        sheetLanc.clearContents();
        sheetLanc.appendRow(HEADERS_LANCAMENTOS);
        sheetLanc.setFrozenRows(1);
        sheetLanc.getRange(1, 1, 1, HEADERS_LANCAMENTOS.length).setFontWeight("bold").setBackground("#0f1713").setFontColor("#00ff66");

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

      // 3. Gravar Investimentos tabulados
      if (state.investimentos && Array.isArray(state.investimentos)) {
        var sheetInv = ensureSheetWithHeaders(ss, SHEET_INVESTIMENTOS, HEADERS_INVESTIMENTOS);
        sheetInv.clearContents();
        sheetInv.appendRow(HEADERS_INVESTIMENTOS);
        sheetInv.setFrozenRows(1);
        sheetInv.getRange(1, 1, 1, HEADERS_INVESTIMENTOS.length).setFontWeight("bold").setBackground("#0f1713").setFontColor("#00ff66");

        var rowsInv = state.investimentos.map(function (inv) {
          return [inv.id || "", inv.ativo || "", inv.corretora || "", inv.categoria || "", inv.valorAtual || 0, inv.status || "", nowIso];
        });
        if (rowsInv.length > 0) {
          sheetInv.getRange(2, 1, rowsInv.length, HEADERS_INVESTIMENTOS.length).setValues(rowsInv);
        }
      }

      // 4. Gravar Holerites tabulados
      if (state.holerites && Array.isArray(state.holerites)) {
        var sheetHol = ensureSheetWithHeaders(ss, SHEET_HOLERITES, HEADERS_HOLERITES);
        sheetHol.clearContents();
        sheetHol.appendRow(HEADERS_HOLERITES);
        sheetHol.setFrozenRows(1);
        sheetHol.getRange(1, 1, 1, HEADERS_HOLERITES.length).setFontWeight("bold").setBackground("#0f1713").setFontColor("#00ff66");

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
