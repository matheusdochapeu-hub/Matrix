/**
 * MATRIX FINANCE - AMORTIZATION & CAIXA FINANCING ENGINE
 * Cálculo exato da Tabela Price/SAC, abatimento de FGTS bianual (R$ 501,12/mês USP),
 * e simulações de antecipação com redução de prazo ou parcela.
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

  function getTaxaMensal(taxaAnual) {
    // Taxa equivalente mensal: i_m = (1 + i_a)^(1/12) - 1
    return Math.pow(1 + (taxaAnual / 100), 1 / 12) - 1;
  }

  function calcularParcelaPrice(saldo, prazo, taxaMensal) {
    if (taxaMensal <= 0) return saldo / prazo;
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

      // Verifica se há amortização extra neste mês
      const extra = amortizacoesExtras.find(e => e.mes === mes);
      let valorExtra = 0;
      let tipoExtra = 'prazo'; // 'prazo' ou 'parcela'

      if (extra && extra.valor > 0) {
        valorExtra = Math.min(extra.valor, saldo);
        saldo -= valorExtra;
        tipoExtra = extra.tipo || 'prazo';

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
      cronograma
    };
  }

  function simularAbatimentoFgts(saldoAtual, prazoAtual, taxaAnual, saldoFgtsDisponivel, modalidade = 'prazo') {
    // Cenário Baseline (sem extra)
    const base = gerarTabelaPrice(saldoAtual, prazoAtual, taxaAnual, []);
    
    // Cenário com Abatimento no mês 1
    const simulado = gerarTabelaPrice(saldoAtual, prazoAtual, taxaAnual, [
      { mes: 1, valor: saldoFgtsDisponivel, tipo: modalidade }
    ]);

    const economiaJuros = base.totalJuros - simulado.totalJuros;
    const mesesPoupados = base.mesesReais - simulado.mesesReais;
    const novaParcela = modalidade === 'parcela' && simulado.cronograma[1] ? simulado.cronograma[1].parcela : base.cronograma[0].parcela;

    return {
      modalidade,
      valorAmortizado: saldoFgtsDisponivel,
      base: {
        totalJuros: base.totalJuros,
        totalPago: base.totalPago,
        meses: base.mesesReais
      },
      simulado: {
        totalJuros: simulado.totalJuros,
        totalPago: simulado.totalPago,
        meses: simulado.mesesReais,
        novaParcela
      },
      economiaJuros,
      mesesPoupados
    };
  }

  return {
    DEFAULT_CONFIG,
    getTaxaMensal,
    calcularParcelaPrice,
    gerarTabelaPrice,
    simularAbatimentoFgts
  };
})();

if (typeof window !== 'undefined') {
  window.AmortizationEngine = AmortizationEngine;
}
