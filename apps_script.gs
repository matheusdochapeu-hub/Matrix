/**
 * ============================================================================
 * MATRIX FINANCE - GOOGLE APPS SCRIPT BACKEND (v1.0.0)
 * ============================================================================
 * Conector de alta confiabilidade para o Google Sheets, inspirado na arquitetura
 * de alta integridade do FisioFlow (com travas de concorrência, abas estruturadas
 * e snapshot JSON para restauração 100% fiel em qualquer dispositivo).
 *
 * INSTRUÇÕES DE INSTALAÇÃO:
 * 1. Abra o Google Sheets onde deseja salvar as finanças do Matrix.
 * 2. Clique em Extensões > Apps Script.
 * 3. Cole este código completo no editor.
 * 4. Altere a constante SHARED_SECRET abaixo (ou defina MATRIX_TOKEN nas Propriedades).
 * 5. Clique em Implantar > Nova implantação > Tipo: "App da Web".
 *    - Executar como: "Eu (seu e-mail)"
 *    - Quem pode acessar: "Qualquer pessoa"
 * 6. Copie a URL do App da Web gerada (termina com /exec).
 * 7. No Matrix App, vá na aba "Backup & Conexões" e cole a URL e o Segredo.
 * ============================================================================
 */

var SHARED_SECRET = "MatrixReloaded2026!"; // Altere para seu segredo preferido
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

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
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
      return jsonResponse({ success: false, error: "Acesso não autorizado" });
    }

    var action = (e && e.parameter && e.parameter.action) || "get_state";
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "ping") {
      return jsonResponse({
        success: true,
        ping: "pong",
        title: ss.getName(),
        timestamp: new Date().toISOString()
      });
    }

    if (action === "get_state") {
      var sheetRaw = ss.getSheetByName(SHEET_BACKUP_JSON);
      if (!sheetRaw || sheetRaw.getLastRow() < 2) {
        return jsonResponse({
          success: true,
          data: null,
          message: "Nenhum backup encontrado nesta planilha."
        });
      }

      var jsonStr = sheetRaw.getRange(2, 2).getValue();
      var parsed = JSON.parse(jsonStr);
      var updated = sheetRaw.getRange(2, 1).getValue();

      return jsonResponse({
        success: true,
        timestamp: updated,
        data: parsed,
        message: "Dados recuperados com sucesso da nuvem."
      });
    }

    return jsonResponse({ success: false, error: "Ação inválida" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
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
    });
  }

  try {
    if (!isAuthorized(e)) {
      return jsonResponse({ success: false, error: "Acesso não autorizado" });
    }

    var body = JSON.parse(e.postData.contents);
    var action = body.action || "sync_all";
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "ping") {
      return jsonResponse({ success: true, ping: "pong" });
    }

    if (action === "sync_all" && body.state) {
      var state = body.state;
      var nowIso = new Date().toISOString();

      // 1. Gravar Snapshot JSON integral no SHEET_BACKUP_JSON
      var sheetRaw = ensureSheetWithHeaders(ss, SHEET_BACKUP_JSON, ["Timestamp", "Payload_JSON"]);
      sheetRaw.getRange("A2:B2").setValues([[nowIso, JSON.stringify(state)]]);

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
        timestamp: nowIso,
        message: "Sincronização realizada com sucesso absoluto."
      });
    }

    return jsonResponse({ success: false, error: "Payload inválido para sync" });

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}
