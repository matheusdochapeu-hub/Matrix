/**
 * MATRIX FINANCE - AMORTIZATION & CAIXA FINANCING ENGINE
 * Cálculo exato da Tabela Price/SAC, abatimento de FGTS bianual (R$ 501,12/mês USP),
 * e simulações avançadas de amortização extraordinária (valores iguais, periódicos,
 * sazonais, intercalados, customizados mês a mês, geração de relatório e exportação PDF).
 */

const AmortizationEngine = (function () {
  // Parâmetros base da Caixa do Matheus
  const DEFAULT_CONFIG = {
    banco: 'Caixa Econômica Federal',
    saldoDevedor: 157884.49,
    prazoMeses: 271,
    parcelaAtual: 1395.88,
    taxaAnual: 8.9899, // % a.a. efetiva
    sistema: 'Price',
    fgtsMensal: 501.12,
    mesesEntreFgts: 24
  };

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  function getTaxaMensal(taxaAnual) {
    // Taxa equivalente mensal: i_m = (1 + i_a)^(1/12) - 1
    return Math.pow(1 + (taxaAnual / 100), 1 / 12) - 1;
  }

  function calcularParcelaPrice(saldo, prazo, taxaMensal) {
    if (taxaMensal <= 0 || prazo <= 0) return saldo / Math.max(1, prazo);
    const fator = Math.pow(1 + taxaMensal, prazo);
    return saldo * (taxaMensal * fator) / (fator - 1);
  }

  function gerarTabelaPrice(saldoInicial, prazoMeses, taxaAnual, amortizacoesExtras = []) {
    const taxaMensal = getTaxaMensal(taxaAnual);
    let saldo = saldoInicial;
    const cronograma = [];
    let totalJuros = 0;
    let totalAmortizado = 0;
    let totalPago = 0;
    let totalAportesExtras = 0;

    let pPrice = calcularParcelaPrice(saldo, prazoMeses, taxaMensal);

    for (let mes = 1; mes <= prazoMeses; mes++) {
      if (saldo <= 0.01) break;

      const jurosMes = saldo * taxaMensal;
      let amortizacaoMes = pPrice - jurosMes;
      
      // Ajuste para última parcela
      if (amortizacaoMes > saldo) {
        amortizacaoMes = saldo;
        pPrice = amortizacaoMes + jurosMes;
      }

      saldo -= amortizacaoMes;

      // Soma todos os aportes extras programados para este mês
      const extrasMes = amortizacoesExtras.filter(e => e.mes === mes);
      let valorExtra = 0;
      let tipoExtra = 'prazo'; // 'prazo' ou 'parcela'

      if (extrasMes.length > 0) {
        const somaDesejada = extrasMes.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
        valorExtra = Math.min(somaDesejada, saldo);
        saldo -= valorExtra;
        totalAportesExtras += valorExtra;
        tipoExtra = extrasMes[0].tipo || 'prazo';

        if (tipoExtra === 'parcela' && saldo > 0) {
          const prazoRestante = prazoMeses - mes;
          pPrice = calcularParcelaPrice(saldo, prazoRestante, taxaMensal);
        }
      }

      totalJuros += jurosMes;
      totalAmortizado += (amortizacaoMes + valorExtra);
      totalPago += (pPrice + valorExtra);

      cronograma.push({
        mes,
        saldoAnterior: saldo + amortizacaoMes + valorExtra,
        parcela: pPrice,
        juros: jurosMes,
        amortizacao: amortizacaoMes,
        amortizacaoExtra: valorExtra,
        saldoRestante: Math.max(0, saldo)
      });
    }

    return {
      sistema: 'Price',
      prazoOriginal: prazoMeses,
      mesesReais: cronograma.length,
      mesesEconomizados: prazoMeses - cronograma.length,
      saldoInicial,
      totalJuros,
      totalAmortizado,
      totalPago,
      totalAportesExtras,
      cronograma
    };
  }

  function gerarAmortizacoesExtras(config = {}, prazoTotal = 271) {
    const tipo = config.tipo || 'unico';
    const modalidade = config.modalidade || 'prazo';
    const extras = [];

    if (tipo === 'unico') {
      const mes = parseInt(config.mesUnico, 10) || 1;
      const valor = parseFloat(config.valorUnico) || 0;
      if (valor > 0) extras.push({ mes, valor, tipo: modalidade });
    } else if (tipo === 'mensal_fixo') {
      const valor = parseFloat(config.valorMensal) || 0;
      const mesInicio = parseInt(config.mesInicio, 10) || 1;
      const duracao = parseInt(config.duracaoMeses, 10) || prazoTotal;
      if (valor > 0) {
        for (let m = mesInicio; m <= Math.min(prazoTotal, mesInicio + duracao - 1); m++) {
          extras.push({ mes: m, valor, tipo: modalidade });
        }
      }
    } else if (tipo === 'periodico') {
      const valor = parseFloat(config.valorPeriodico) || 0;
      const freq = parseInt(config.frequenciaMeses, 10) || 12;
      const mesInicio = parseInt(config.mesInicio, 10) || freq;
      if (valor > 0 && freq > 0) {
        for (let m = mesInicio; m <= prazoTotal; m += freq) {
          extras.push({ mes: m, valor, tipo: modalidade });
        }
      }
    } else if (tipo === 'sazonal') {
      const valor = parseFloat(config.valorSazonal) || 0;
      const mesesAno = (config.mesesSazonais && config.mesesSazonais.length > 0) ? config.mesesSazonais : [11, 12];
      if (valor > 0) {
        const refMes = (config.mesReferenciaIndex !== undefined ? config.mesReferenciaIndex : 11);
        for (let m = 1; m <= prazoTotal; m++) {
          const calMonthIndex = ((refMes - 1 + m) % 12) + 1;
          if (mesesAno.includes(calMonthIndex)) {
            extras.push({ mes: m, valor, tipo: modalidade });
          }
        }
      }
    } else if (tipo === 'combinado') {
      const valorMensal = parseFloat(config.valorMensal) || 0;
      const valorFgts = parseFloat(config.valorFgts) || 12026.88;
      const freqFgts = parseInt(config.frequenciaFgts, 10) || 24;

      for (let m = 1; m <= prazoTotal; m++) {
        if (valorMensal > 0) {
          extras.push({ mes: m, valor: valorMensal, tipo: modalidade });
        }
        if (valorFgts > 0 && m % freqFgts === 0) {
          extras.push({ mes: m, valor: valorFgts, tipo: modalidade, label: 'FGTS USP' });
        }
      }
    } else if (tipo === 'customizado') {
      const customList = config.itensCustomizados || [];
      customList.forEach(item => {
        const val = parseFloat(item.valor) || 0;
        const m = parseInt(item.mes, 10);
        if (val > 0 && m >= 1 && m <= prazoTotal) {
          extras.push({ mes: m, valor: val, tipo: modalidade });
        }
      });
    }

    return extras;
  }

  function executarSimulacaoCompleta(saldoAtual, prazoAtual, taxaAnual, config = {}, refDate = { ano: 2026, mesIndex: 11 }) {
    const base = gerarTabelaPrice(saldoAtual, prazoAtual, taxaAnual, []);
    const extras = gerarAmortizacoesExtras(config, prazoAtual);
    const simulado = gerarTabelaPrice(saldoAtual, prazoAtual, taxaAnual, extras);

    const economiaJuros = Math.max(0, base.totalJuros - simulado.totalJuros);
    const mesesPoupados = Math.max(0, base.mesesReais - simulado.mesesReais);
    const novoPrazo = simulado.mesesReais;
    const anosPoupados = (mesesPoupados / 12).toFixed(1);
    const novoPrazoAnos = (novoPrazo / 12).toFixed(1);
    const prazoOriginalAnos = (prazoAtual / 12).toFixed(1);

    function calcDataQuitacao(meses) {
      const totalMeses = (refDate.mesIndex - 1) + meses;
      const anoCalculado = refDate.ano + Math.floor(totalMeses / 12);
      const mesCalculado = totalMeses % 12;
      return `${MONTH_NAMES[mesCalculado]} de ${anoCalculado}`;
    }

    const dataQuitacaoOriginal = calcDataQuitacao(prazoAtual);
    const dataQuitacaoNova = calcDataQuitacao(novoPrazo);

    // Resumo anual para tabela executiva e PDF
    const resumoAnual = [];
    let anoIdx = 1;
    let jurosAno = 0;
    let extraAno = 0;
    let parcelaAno = 0;
    let amortizacaoAno = 0;
    let saldoInicioAno = saldoAtual;

    simulado.cronograma.forEach((item, idx) => {
      jurosAno += item.juros;
      extraAno += item.amortizacaoExtra;
      parcelaAno += item.parcela;
      amortizacaoAno += (item.amortizacao + item.amortizacaoExtra);

      if (idx % 12 === 11 || idx === simulado.cronograma.length - 1) {
        const totalM = (refDate.mesIndex - 1) + item.mes;
        const calAno = refDate.ano + Math.floor(totalM / 12);

        resumoAnual.push({
          ano: anoIdx,
          anoCalendario: calAno,
          saldoInicial: saldoInicioAno,
          parcelasPagas: parcelaAno,
          extrasAportados: extraAno,
          jurosPagos: jurosAno,
          amortizacaoTotal: amortizacaoAno,
          saldoFinal: item.saldoRestante
        });
        anoIdx++;
        jurosAno = 0;
        extraAno = 0;
        parcelaAno = 0;
        amortizacaoAno = 0;
        saldoInicioAno = item.saldoRestante;
      }
    });

    const novaParcela = config.modalidade === 'parcela' && simulado.cronograma[1] ? simulado.cronograma[1].parcela : base.cronograma[0].parcela;

    return {
      config,
      saldoAtual,
      prazoOriginal: prazoAtual,
      prazoOriginalAnos,
      novoPrazo,
      novoPrazoAnos,
      mesesPoupados,
      anosPoupados,
      economiaJuros,
      totalAportadoExtra: simulado.totalAportesExtras,
      totalPagoOriginal: base.totalPago,
      novoTotalPago: simulado.totalPago,
      totalJurosOriginal: base.totalJuros,
      totalJurosNovo: simulado.totalJuros,
      dataQuitacaoOriginal,
      dataQuitacaoNova,
      novaParcela,
      resumoAnual,
      cronograma: simulado.cronograma
    };
  }

  // Compatibilidade com a chamada legado de Abatimento FGTS simples
  function simularAbatimentoFgts(saldoAtual, prazoAtual, taxaAnual, saldoFgtsDisponivel, modalidade = 'prazo') {
    return executarSimulacaoCompleta(saldoAtual, prazoAtual, taxaAnual, {
      tipo: 'unico',
      valorUnico: saldoFgtsDisponivel,
      mesUnico: 1,
      modalidade
    });
  }

  // Gera o HTML executivo para impressão direta e download em PDF
  function gerarRelatorioHTML(simulacao, configBase = DEFAULT_CONFIG) {
    function fmt(num) {
      return (parseFloat(num) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const nomeCenario = simulacao.nome || 'Simulação de Amortização Extraordinária';
    const cfg = simulacao.config || {};

    let descEstrategia = '';
    if (cfg.tipo === 'mensal_fixo') {
      descEstrategia = `Aporte Fixo Recorrente de ${fmt(cfg.valorMensal)} todos os meses.`;
    } else if (cfg.tipo === 'periodico') {
      descEstrategia = `Aporte Periódico de ${fmt(cfg.valorPeriodico)} a cada ${cfg.frequenciaMeses || 12} meses.`;
    } else if (cfg.tipo === 'sazonal') {
      descEstrategia = `Aporte Sazonal de ${fmt(cfg.valorSazonal)} nos meses selecionados (ex: 13º salário).`;
    } else if (cfg.tipo === 'combinado') {
      descEstrategia = `Aporte Mensal Fixo de ${fmt(cfg.valorMensal)} + Abatimento de FGTS USP de ${fmt(cfg.valorFgts || 12026.88)} a cada 24 meses.`;
    } else if (cfg.tipo === 'customizado') {
      descEstrategia = `Aportes Customizados Mês a Mês programados pelo usuário.`;
    } else {
      descEstrategia = `Aporte Único Pontual de ${fmt(cfg.valorUnico)} no mês ${cfg.mesUnico || 1}.`;
    }

    const rowsTabelaAnual = (simulacao.resumoAnual || []).map(r => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">Ano ${r.ano} (${r.anoCalendario})</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;">${fmt(r.saldoInicial)}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;">${fmt(r.parcelasPagas)}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;color:#0b7c3d;font-weight:600;">${fmt(r.extrasAportados)}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;color:#b91c1c;">${fmt(r.jurosPagos)}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;font-weight:700;">${fmt(r.saldoFinal)}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Amortização - ${nomeCenario}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      color: #1f2937;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      line-height: 1.45;
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #008744;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .logo-area h1 { margin: 0; font-size: 20px; color: #008744; letter-spacing: -0.5px; }
    .logo-area p { margin: 2px 0 0; font-size: 11px; color: #6b7280; }
    .date-badge { font-size: 11px; color: #4b5563; text-align: right; }
    .kpi-card-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .kpi-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 10px;
    }
    .kpi-label { font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: 600; margin-bottom: 4px; }
    .kpi-value { font-size: 16px; font-weight: 700; color: #111827; }
    .kpi-value.green { color: #059669; }
    .kpi-value.blue { color: #0284c7; }
    .kpi-value.amber { color: #d97706; }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-left: 3px solid #008744;
      padding-left: 8px;
      margin: 16px 0 10px;
    }
    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-bottom: 18px;
    }
    .comparison-table th {
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      padding: 8px;
      text-align: left;
    }
    .comparison-table td {
      border: 1px solid #e5e7eb;
      padding: 8px;
    }
    .schedule-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 16px;
    }
    .schedule-table th {
      background: #008744;
      color: #ffffff;
      padding: 6px 8px;
      border: 1px solid #007038;
    }
    .schedule-table td {
      border: 1px solid #e5e7eb;
    }
    .print-actions {
      text-align: center;
      margin-bottom: 20px;
    }
    .btn-print {
      background: #008744;
      color: white;
      border: none;
      padding: 10px 24px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    @media print {
      .print-actions { display: none !important; }
      body { padding: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
  </div>

  <div class="report-header">
    <div class="logo-area">
      <h1>MATRIX FINANCE • LAUDO DE AMORTIZAÇÃO</h1>
      <p>Financiamento Imobiliário Caixa Econômica Federal • Tabela Price</p>
    </div>
    <div class="date-badge">
      <div><strong>Emissão:</strong> ${dataHoje}</div>
      <div><strong>Cenário:</strong> ${nomeCenario}</div>
    </div>
  </div>

  <div class="kpi-card-grid">
    <div class="kpi-card">
      <div class="kpi-label">Saldo Devedor Atual</div>
      <div class="kpi-value">${fmt(simulacao.saldoAtual)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Novo Prazo Restante</div>
      <div class="kpi-value blue">${simulacao.novoPrazo} meses (~${simulacao.novoPrazoAnos} anos)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Meses Poupados</div>
      <div class="kpi-value green">${simulacao.mesesPoupados} meses (~${simulacao.anosPoupados} anos)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Economia Estimada em Juros</div>
      <div class="kpi-value green">${fmt(simulacao.economiaJuros)}</div>
    </div>
  </div>

  <div class="section-title">1. Resumo Executivo da Estratégia de Aportes</div>
  <table class="comparison-table">
    <tr>
      <th style="width:25%;">Estratégia Escolhida</th>
      <td><strong>${descEstrategia}</strong> (Redução de Prazo / Eliminação de Juros Futuros)</td>
    </tr>
    <tr>
      <th>Total de Aportes Extras</th>
      <td><strong style="color:#059669;">${fmt(simulacao.totalAportadoExtra)}</strong> aportados diretamente no saldo devedor</td>
    </tr>
    <tr>
      <th>Data de Quitação Original</th>
      <td>${simulacao.dataQuitacaoOriginal} (Prazo original: ${simulacao.prazoOriginal} meses / ~${simulacao.prazoOriginalAnos} anos)</td>
    </tr>
    <tr>
      <th>Nova Data de Quitação</th>
      <td><strong style="color:#0284c7;font-size:12px;">${simulacao.dataQuitacaoNova}</strong> (Antecipação garantida em ${simulacao.anosPoupados} anos!)</td>
    </tr>
  </table>

  <div class="section-title">2. Comparativo Financeiro: Original vs Simulado</div>
  <table class="comparison-table">
    <thead>
      <tr>
        <th>Métrica Financeira</th>
        <th style="text-align:right;">Contrato Original</th>
        <th style="text-align:right;">Com Amortização Extra</th>
        <th style="text-align:right;color:#059669;">Economia Direta</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Prazo até Quitar</strong></td>
        <td style="text-align:right;">${simulacao.prazoOriginal} meses (~${simulacao.prazoOriginalAnos} anos)</td>
        <td style="text-align:right;font-weight:700;color:#0284c7;">${simulacao.novoPrazo} meses (~${simulacao.novoPrazoAnos} anos)</td>
        <td style="text-align:right;font-weight:700;color:#059669;">${simulacao.mesesPoupados} meses (~${simulacao.anosPoupados} anos)</td>
      </tr>
      <tr>
        <td><strong>Juros Totais Pagos</strong></td>
        <td style="text-align:right;">${fmt(simulacao.totalJurosOriginal)}</td>
        <td style="text-align:right;">${fmt(simulacao.totalJurosNovo)}</td>
        <td style="text-align:right;font-weight:700;color:#059669;">${fmt(simulacao.economiaJuros)}</td>
      </tr>
      <tr>
        <td><strong>Custo Total do Contrato</strong></td>
        <td style="text-align:right;">${fmt(simulacao.totalPagoOriginal)}</td>
        <td style="text-align:right;">${fmt(simulacao.novoTotalPago)}</td>
        <td style="text-align:right;font-weight:700;color:#059669;">${fmt(simulacao.totalPagoOriginal - simulacao.novoTotalPago)}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">3. Evolução Anual Consolidada da Dívida</div>
  <table class="schedule-table">
    <thead>
      <tr>
        <th>Período</th>
        <th>Saldo Inicial</th>
        <th>Parcelas Normais</th>
        <th>Aportes Extras</th>
        <th>Juros Pagos</th>
        <th>Saldo Final</th>
      </tr>
    </thead>
    <tbody>
      ${rowsTabelaAnual}
    </tbody>
  </table>

  <div style="font-size:10px;color:#6b7280;margin-top:20px;border-top:1px solid #e5e7eb;padding-top:8px;text-align:center;">
    Documento gerado automaticamente pelo Matrix Finance. Os valores utilizam a metodologia oficial da Tabela Price da Caixa Econômica Federal com amortização direta no saldo devedor.
  </div>
</body>
</html>`;
  }

  /**
   * Calcula a posição dinâmica do financiamento (saldo devedor, prazo restante e parcela)
   * para qualquer mês e ano em relação ao baseline de Novembro/2026.
   * Regra: Novembro/2026 = 271 parcelas (R$ 157.884,49).
   * Mês anterior (Outubro/2026) = 272 parcelas (saldo maior).
   * Mês posterior (Dezembro/2026) = 270 parcelas (saldo amortizado).
   * Janeiro/2027 = 269 parcelas, e assim sucessivamente.
   * Amortizações extraordinárias registradas reduzem adicionalmente o saldo e o prazo.
   */
  function getStatusForMonth(targetYear, targetMonthIndex, userConfig = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...userConfig };
    const baseYear = 2026;
    const baseMonthIndex = 11; // Novembro = 11

    const baseSaldo = cfg.saldoDevedor || 157884.49;
    const basePrazo = cfg.prazoMeses || cfg.totalPrestacoes || 271;
    const baseParcelaTotal = cfg.parcelaAtual || 1395.88;
    const taxaAnual = cfg.taxaJurosAnual || cfg.taxaAnual || 8.9899;
    const taxaMensal = getTaxaMensal(taxaAnual);

    const baseParcelaPura = calcularParcelaPrice(baseSaldo, basePrazo, taxaMensal);
    const custosAcessorios = Math.max(0, baseParcelaTotal - baseParcelaPura);

    // Diferença em meses entre o mês alvo e Novembro/2026
    const deltaM = (targetYear - baseYear) * 12 + (targetMonthIndex - baseMonthIndex);

    if (deltaM === 0) {
      return {
        ano: targetYear,
        mesIdx: targetMonthIndex,
        deltaM: 0,
        saldo: baseSaldo,
        prazo: basePrazo,
        parcela: baseParcelaTotal,
        parcelaPura: baseParcelaPura,
        custosAcessorios,
        taxaAnual,
        taxaMensal
      };
    } else if (deltaM > 0) {
      // Avanço no tempo (Dezembro/2026, 2027, etc.)
      let s = baseSaldo;
      let p = basePrazo;
      let pPura = baseParcelaPura;
      const extras = cfg.amortizacoesExtras || [];

      for (let m = 1; m <= deltaM; m++) {
        if (s <= 0.01) {
          s = 0;
          p = 0;
          break;
        }

        const juros = s * taxaMensal;
        let amort = pPura - juros;
        if (amort > s) amort = s;
        s -= amort;
        p -= 1;

        // Verifica amortização extraordinária neste mês
        const extraAno = baseYear + Math.floor((baseMonthIndex - 1 + m) / 12);
        const extraMes = ((baseMonthIndex - 1 + m) % 12) + 1;
        const extrasDoMes = extras.filter(e => {
          if (e.ano && e.mes) return e.ano === extraAno && e.mes === extraMes;
          return e.mes === m;
        });

        if (extrasDoMes.length > 0) {
          const totalExtra = extrasDoMes.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
          const abatido = Math.min(totalExtra, s);
          s -= abatido;

          const tipoReducao = extrasDoMes[0].tipo || 'prazo';
          if (tipoReducao === 'prazo') {
            if (s > 0 && pPura > 0) {
              const novoPrazo = Math.ceil(
                Math.log(pPura / (pPura - s * taxaMensal)) / Math.log(1 + taxaMensal)
              );
              if (!isNaN(novoPrazo) && isFinite(novoPrazo) && novoPrazo > 0) {
                p = Math.min(p, novoPrazo);
              }
            }
          } else {
            if (s > 0 && p > 0) {
              pPura = calcularParcelaPrice(s, p, taxaMensal);
            }
          }
        }
      }

      return {
        ano: targetYear,
        mesIdx: targetMonthIndex,
        deltaM,
        saldo: Math.max(0, s),
        prazo: Math.max(0, p),
        parcela: s > 0 ? (pPura + custosAcessorios) : 0,
        parcelaPura: pPura,
        custosAcessorios,
        taxaAnual,
        taxaMensal
      };
    } else {
      // Regressão no tempo (Outubro/2026 = 272, Setembro/2026 = 273, 2025...)
      let s = baseSaldo;
      let p = basePrazo;
      const steps = Math.abs(deltaM);

      for (let m = 0; m < steps; m++) {
        // Fórmula de reversão da Tabela Price: Saldo anterior antes da amortização
        s = (s + baseParcelaPura) / (1 + taxaMensal);
        p += 1;
      }

      return {
        ano: targetYear,
        mesIdx: targetMonthIndex,
        deltaM,
        saldo: s,
        prazo: p,
        parcela: baseParcelaTotal,
        parcelaPura: baseParcelaPura,
        custosAcessorios,
        taxaAnual,
        taxaMensal
      };
    }
  }

  return {
    DEFAULT_CONFIG,
    MONTH_NAMES,
    getTaxaMensal,
    calcularParcelaPrice,
    gerarTabelaPrice,
    gerarAmortizacoesExtras,
    executarSimulacaoCompleta,
    simularAbatimentoFgts,
    getStatusForMonth,
    gerarRelatorioHTML
  };
})();

if (typeof window !== 'undefined') {
  window.AmortizationEngine = AmortizationEngine;
}
