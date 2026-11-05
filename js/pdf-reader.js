/**
 * MATRIX FINANCE - PDF HOLERITE PARSER & MANUAL ENTRY ENGINE
 * Processamento client-side de demonstrativos da USP (Marteweb) e MPSP
 * com extração inteligente de rubricas, conferência e lançamento no fluxo de caixa.
 */

const PdfHoleriteReader = (function () {

  // Regex e extratores para formato USP Marteweb
  function parseUspText(fullText) {
    const result = {
      tipo: 'USP',
      orgao: 'Universidade de São Paulo (USP)',
      competencia: '',
      ano: 2026,
      mesNome: '',
      vencimentoBruto: 0,
      auxilioSaude: 0,
      descontoVr: 0,
      sindicato: 0,
      inss: 0,
      irrf: 0,
      fgts: 0,
      totalVantagens: 0,
      totalDescontos: 0,
      liquido: 0,
      itens: []
    };

    // Competência ex: "Demonstrativo de Pagamento de Outubro/2026"
    const compMatch = fullText.match(/Demonstrativo\s+de\s+Pagamento\s+de\s+([A-Za-zçã]+)\/(\d{4})/i);
    if (compMatch) {
      result.mesNome = compMatch[1].charAt(0).toUpperCase() + compMatch[1].slice(1).toLowerCase();
      result.ano = parseInt(compMatch[2], 10);
      result.competencia = `${result.ano}-${result.mesNome}`;
    }

    // Função auxiliar para converter string PT-BR em float
    function toFloat(valStr) {
      if (!valStr) return 0;
      return parseFloat(valStr.replace(/\./g, '').replace(',', '.').trim()) || 0;
    }

    // 220 Vencimento
    const vencMatch = fullText.match(/220\s+Vencimento\s+([\d\.,]+)/i);
    if (vencMatch) {
      result.vencimentoBruto = toFloat(vencMatch[1]);
      result.itens.push({ cod: '220', desc: 'Vencimento', tipo: 'Vencimento', valor: result.vencimentoBruto });
    }

    // 709 Auxílio-Saúde USP
    const auxSaudeMatch = fullText.match(/709\s+Aux[íi]lio-Sa[úu]de\s+USP\s+([\d\.,]+)/i);
    if (auxSaudeMatch) {
      result.auxilioSaude = toFloat(auxSaudeMatch[1]);
      result.itens.push({ cod: '709', desc: 'Auxílio-Saúde USP', tipo: 'Vencimento', valor: result.auxilioSaude });
    }

    // 339 Vale Refeição
    const vrMatch = fullText.match(/339\s+Vale\s+Refei[çc][ãa]o\s+([\d\.,]+)/i);
    if (vrMatch) {
      result.descontoVr = toFloat(vrMatch[1]);
      result.itens.push({ cod: '339', desc: 'Vale Refeição (Desconto)', tipo: 'Desconto', valor: result.descontoVr });
    }

    // 197 Sindicato Trabalhadores da Usp
    const sindMatch = fullText.match(/197\s+Sindicato\s+Trabalhadores\s+da\s+Usp\s+([\d\.,]+)/i);
    if (sindMatch) {
      result.sindicato = toFloat(sindMatch[1]);
      result.itens.push({ cod: '197', desc: 'Sindicato Sintusp', tipo: 'Desconto', valor: result.sindicato });
    }

    // 113 Inss
    const inssMatch = fullText.match(/113\s+Inss\s+([\d\.,]+)/i);
    if (inssMatch) {
      result.inss = toFloat(inssMatch[1]);
      result.itens.push({ cod: '113', desc: 'INSS', tipo: 'Desconto', valor: result.inss });
    }

    // 108 Imposto de Renda
    const irMatch = fullText.match(/108\s+Imposto\s+de\s+Renda\s+([\d\.,]+)/i);
    if (irMatch) {
      result.irrf = toFloat(irMatch[1]);
      result.itens.push({ cod: '108', desc: 'Imposto de Renda (IRRF)', tipo: 'Desconto', valor: result.irrf });
    }

    // F.G.T.S.
    const fgtsMatch = fullText.match(/F\.?G\.?T\.?S\.?\s*[:\s]*([\d\.,]+)/i);
    if (fgtsMatch) {
      result.fgts = toFloat(fgtsMatch[1]);
    }

    // Total de Vantagens e Total de Descontos
    const totVantMatch = fullText.match(/Total\s+de\s+Vantagens\s*[:\s]*([\d\.,]+)/i);
    if (totVantMatch) result.totalVantagens = toFloat(totVantMatch[1]);

    const totDescMatch = fullText.match(/Total\s+de\s+Descontos\s*[:\s]*([\d\.,]+)/i);
    if (totDescMatch) result.totalDescontos = toFloat(totDescMatch[1]);

    // Líquido
    const liqMatch = fullText.match(/L[íi]quido\s*[:\s]*([\d\.,]+)/i);
    if (liqMatch) {
      result.liquido = toFloat(liqMatch[1]);
    } else if (result.totalVantagens && result.totalDescontos) {
      result.liquido = result.totalVantagens - result.totalDescontos;
    }

    return result;
  }

  // Regex para formato MPSP
  function parseMpspText(fullText) {
    const result = {
      tipo: 'MPSP',
      orgao: 'Ministério Público de São Paulo (MPSP)',
      competencia: '',
      ano: 2026,
      mesNome: '',
      vencimentoBruto: 0,
      totalVantagens: 0,
      totalDescontos: 0,
      liquido: 0,
      itens: []
    };

    function toFloat(valStr) {
      if (!valStr) return 0;
      return parseFloat(valStr.replace(/\./g, '').replace(',', '.').trim()) || 0;
    }

    const compMatch = fullText.match(/FOLHA\s+NORMAL\s*-\s*(\d{2})\/(\d{4})/i);
    if (compMatch) {
      const monthNum = parseInt(compMatch[1], 10);
      result.ano = parseInt(compMatch[2], 10);
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      result.mesNome = months[monthNum - 1] || '';
      result.competencia = `${result.ano}-${result.mesNome}`;
    }

    const liqMatch = fullText.match(/L[íi]quido\s+a\s+Receber\s*[:\s]*([\d\.,]+)/i);
    if (liqMatch) result.liquido = toFloat(liqMatch[1]);

    const totVantMatch = fullText.match(/Total\s+Vencimentos\s*[:\s]*([\d\.,]+)/i);
    if (totVantMatch) result.totalVantagens = toFloat(totVantMatch[1]);

    const totDescMatch = fullText.match(/Total\s+Descontos\s*[:\s]*([\d\.,]+)/i);
    if (totDescMatch) result.totalDescontos = toFloat(totDescMatch[1]);

    return result;
  }

  // Leitura usando PDF.js (se disponível globalmente)
  async function extractTextFromPdfData(arrayBuffer) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('Biblioteca PDF.js não carregada. Você pode lançar os valores manualmente abaixo.');
    }
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      fullText += strings.join(' ') + '\n';
    }
    return fullText;
  }

  async function processPdfFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const text = await extractTextFromPdfData(arrayBuffer);

    if (text.includes('UNIVERSIDADE DE SÃO PAULO') || text.includes('Marteweb') || text.includes('USP')) {
      return parseUspText(text);
    } else if (text.includes('MINISTÉRIO PÚBLICO') || text.includes('MPSP')) {
      return parseMpspText(text);
    } else {
      // Tenta parsing genérico USP
      return parseUspText(text);
    }
  }

  return {
    parseUspText,
    parseMpspText,
    processPdfFile
  };
})();

if (typeof window !== 'undefined') {
  window.PdfHoleriteReader = PdfHoleriteReader;
}
