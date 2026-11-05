/**
 * MATRIX FINANCE - "WHAT-IF" SCENARIO SIMULATOR (PROJEÇÕES FUTURAS)
 * O laboratório de projeção: teste despesas hipotéticas (ex: seguro de vida da Scarlet R$ 100~150)
 * em cascata pelos próximos 12 a 24 meses e veja o impacto instantâneo na folga de caixa.
 */

const ScenarioSimulator = (function () {
  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  function getMonthChronologicalList(startYear = 2026, startMonthIndex = 11, totalMonths = 14) {
    // Retorna a sequência cronológica de meses a partir de startMonthIndex (1 a 12)
    const list = [];
    let curY = startYear;
    let curM = startMonthIndex;

    for (let i = 0; i < totalMonths; i++) {
      list.push({
        year: curY,
        monthIndex: curM,
        monthName: MONTH_NAMES[curM - 1],
        key: `${curY}-${String(curM).padStart(2, '0')}`,
        label: `${MONTH_NAMES[curM - 1]} / ${curY}`
      });

      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }
    return list;
  }

  function runSimulation(state, activeScenarios = null, totalMonths = 14) {
    const scenarios = activeScenarios || (state.simulacoesAtivas || []).filter(s => s.ativo !== false);
    const timeline = getMonthChronologicalList(2026, 10, totalMonths); // Começa em Out/2026

    const results = [];

    timeline.forEach(m => {
      const yearStr = String(m.year);
      const monthData = (state.anos[yearStr] && state.anos[yearStr][m.monthName]) || { fixos: [], outros: [], totais: {} };

      // Ganhos Base em Pecúnia (Dinheiro Líquido - Exclui VA e VR)
      let ganhosBase = 0;
      if (monthData.receitas && monthData.receitas.length > 0) {
        ganhosBase = monthData.receitas
          .filter(r => !(typeof MatrixDB !== 'undefined' && MatrixDB.isBeneficioNaoPecunia ? MatrixDB.isBeneficioNaoPecunia(r) : /vale\s*(aliment|refei)|\bva\b|\bvr\b/i.test(r.nome)))
          .reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
      } else if (monthData.totais && monthData.totais['Subtotal Ganhos']) {
        ganhosBase = parseFloat(monthData.totais['Subtotal Ganhos']) || 0;
      } else if (monthData.totais && monthData.totais['Salário Mensal']) {
        ganhosBase = parseFloat(monthData.totais['Salário Mensal']) || 0;
        if (monthData.totais['Estúdio']) ganhosBase += parseFloat(monthData.totais['Estúdio']) || 0;
        if (monthData.totais['13º']) ganhosBase += parseFloat(monthData.totais['13º']) || 0;
      } else {
        // Fallback salário base USP
        ganhosBase = (state.perfil && (state.perfil.salarioBase + (state.perfil.auxilioSaude || 0))) || 5788.19;
      }

      // Gastos Fixos Base
      let fixosTotal = 0;
      if (monthData.totais && monthData.totais['Total Gastos Fixos']) {
        fixosTotal = parseFloat(monthData.totais['Total Gastos Fixos']) || 0;
      } else if (Array.isArray(monthData.fixos)) {
        fixosTotal = monthData.fixos.reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
      }

      // Gastos Outros/Variáveis Base
      let outrosTotal = 0;
      if (monthData.totais && monthData.totais['Total Outros Gastos']) {
        outrosTotal = parseFloat(monthData.totais['Total Outros Gastos']) || 0;
      } else if (Array.isArray(monthData.outros)) {
        outrosTotal = monthData.outros.reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
      }

      // Contas de Início de Ano (em Janeiro)
      let contasInicioAnoTotal = 0;
      if (m.monthIndex === 1 && monthData.totais && monthData.totais['Contas Inicio Ano']) {
        contasInicioAnoTotal = parseFloat(monthData.totais['Contas Inicio Ano']) || 0;
      }

      const totalGastosBase = fixosTotal + outrosTotal + contasInicioAnoTotal;
      const saldoBase = ganhosBase - totalGastosBase;

      // Calcular Despesas Hipotéticas dos Cenários Ativos
      let custoCenarios = 0;
      const cenariosAplicados = [];

      scenarios.forEach(scen => {
        let applies = false;
        const inicioStr = scen.inicio || '2026-11';
        const [scenY, scenM] = inicioStr.split('-').map(Number);
        const tipo = scen.tipo || (scen.recorrente === false ? 'pontual' : 'recorrente');

        if (tipo === 'pontual') {
          // Ocorre apenas no mês específico de início
          if (m.year === scenY && m.monthIndex === scenM) {
            applies = true;
          }
        } else if (tipo === 'parcelado') {
          // Ocorre por N meses a partir do mês de início
          const parcelas = parseInt(scen.parcelas || 1, 10);
          const monthDiff = (m.year - scenY) * 12 + (m.monthIndex - scenM);
          if (monthDiff >= 0 && monthDiff < parcelas) {
            applies = true;
          }
        } else {
          // Recorrente contínuo
          if (m.year > scenY || (m.year === scenY && m.monthIndex >= scenM)) {
            applies = true;
            if (scen.fim) {
              const [endY, endM] = scen.fim.split('-').map(Number);
              if (m.year > endY || (m.year === endY && m.monthIndex > endM)) {
                applies = false;
              }
            }
          }
        }

        if (applies) {
          const val = parseFloat(scen.valorAdotado || scen.valor || 0);
          custoCenarios += val;
          cenariosAplicados.push({
            id: scen.id,
            titulo: scen.titulo,
            valor: val,
            tipo: tipo,
            conta: scen.conta || 'bb',
            renda: scen.renda || 'salario_usp'
          });
        }
      });

      const totalGastosSimulado = totalGastosBase + custoCenarios;
      const saldoSimulado = ganhosBase - totalGastosSimulado;
      const diferenca = saldoSimulado - saldoBase;

      // Classificação do status de folga financeira
      let statusAlerta = 'seguro'; // verde
      if (saldoSimulado < 0) {
        statusAlerta = 'deficit'; // vermelho (estourou orçamento)
      } else if (saldoSimulado < 200) {
        statusAlerta = 'atencao'; // amarelo (margem apertada)
      }

      results.push({
        ...m,
        ganhosBase,
        fixosTotal,
        outrosTotal,
        contasInicioAnoTotal,
        totalGastosBase,
        saldoBase,
        custoCenarios,
        cenariosAplicados,
        totalGastosSimulado,
        saldoSimulado,
        diferenca,
        statusAlerta
      });
    });

    // Cálculo de correlação com fontes de renda
    const correlacaoRendas = {
      salario_usp: { id: 'salario_usp', nome: 'Salário Líquido USP (Matheus)', totalMensal: 0, count: 0 },
      ganhos_scarlet: { id: 'ganhos_scarlet', nome: 'Ganhos da Scarlet (FisioFlow)', totalMensal: 0, count: 0 },
      va_mercado: { id: 'va_mercado', nome: 'Vale Alimentação (VA Maracaju 88)', totalMensal: 0, count: 0 },
      vr_almoco: { id: 'vr_almoco', nome: 'Vale Refeição (VR Presencial)', totalMensal: 0, count: 0 },
      estudio_extra: { id: 'estudio_extra', nome: 'Estúdio / Renda Extra', totalMensal: 0, count: 0 },
      reserva_aportes: { id: 'reserva_aportes', nome: 'Reserva de Emergência / Aportes', totalMensal: 0, count: 0 },
      orcamento_geral: { id: 'orcamento_geral', nome: 'Orçamento Familiar Geral', totalMensal: 0, count: 0 }
    };

    scenarios.forEach(scen => {
      const rKey = scen.renda || 'salario_usp';
      if (!correlacaoRendas[rKey]) {
        correlacaoRendas[rKey] = { id: rKey, nome: rKey, totalMensal: 0, count: 0 };
      }
      const val = parseFloat(scen.valorAdotado || scen.valor || 0);
      correlacaoRendas[rKey].totalMensal += val;
      correlacaoRendas[rKey].count++;
    });

    return {
      scenarios,
      totalMeses: results.length,
      mesesDeficit: results.filter(r => r.saldoSimulado < 0).length,
      impactoTotalCenarios: results.reduce((acc, r) => acc + r.custoCenarios, 0),
      correlacaoRendas,
      timeline: results
    };
  }

  return {
    MONTH_NAMES,
    getMonthChronologicalList,
    runSimulation
  };
})();

if (typeof window !== 'undefined') {
  window.ScenarioSimulator = ScenarioSimulator;
}
