/**
 * MATRIX FINANCE - "WHAT-IF" SCENARIO SIMULATOR (PROJEÇÕES FUTURAS)
 * Laboratório de projeções financeiras: teste despesas hipotéticas (ex: seguro de vida da Scarlet R$ 100~150,
 * parcelas de cartão, investimentos futuros) segregando rigorosamente as contas bancárias e fontes de renda:
 * 👨 Eu (Matheus • Salário USP / BB / Inter)
 * 👩 Scarlet (FisioFlow / Cartão Nubank Scarlet)
 * 🛒 Vale Alimentação (VA - Casa Maracaju 88)
 * 🍽️ Vale Refeição (VR Presencial)
 * ⚖️ Consolidado do Casal
 */

const ScenarioSimulator = (function () {
  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const PILAR_CONFIG = {
    matheus: {
      id: 'matheus',
      nome: 'Eu (Matheus • USP)',
      icon: '👨',
      cor: 'var(--cyan)',
      descricao: 'Salário USP, BB, Inter, contas fixas próprias e Sobra pra Mim'
    },
    scarlet: {
      id: 'scarlet',
      nome: 'Scarlet (FisioFlow)',
      icon: '👩',
      cor: '#f472b6',
      descricao: 'Faturamento de Fisioterapia e Fatura Nubank Scarlet'
    },
    va: {
      id: 'va',
      nome: 'Vale Alimentação (VA)',
      icon: '🛒',
      cor: 'var(--amber)',
      descricao: 'Crédito USP R$ 2.050/mês para supermercado e feira'
    },
    vr: {
      id: 'vr',
      nome: 'Vale Refeição (VR)',
      icon: '🍽️',
      cor: '#c084fc',
      descricao: 'Crédito USP R$ 1.105/mês para almoço nos dias presenciais'
    },
    reserva: {
      id: 'reserva',
      nome: 'Reserva & Aportes',
      icon: '🏛️',
      cor: 'var(--matrix-green)',
      descricao: 'Aportes e investimentos na poupança BB / Tesouro'
    }
  };

  /**
   * Determina o pilar/proprietário da conta ou fonte de renda vinculada ao cenário hipotético.
   * Regra estrita: separa Scarlet, Matheus (Eu), VA e VR.
   */
  function getScenarioPilar(scen) {
    if (!scen) return 'matheus';
    const conta = (scen.conta || '').toLowerCase();
    const renda = (scen.renda || '').toLowerCase();
    const tit = (scen.titulo || '').toLowerCase();

    // 1. Scarlet (FisioFlow / Nubank Scarlet)
    if (conta === 'nubank_scarlet' || renda === 'ganhos_scarlet' || tit.includes('scarlet') || tit.includes('fisio')) {
      return 'scarlet';
    }

    // 2. Vale Alimentação (VA)
    if (conta === 'va' || renda === 'va_mercado' || tit.includes(' va') || tit.includes('alimentação') || tit.includes('supermercado')) {
      return 'va';
    }

    // 3. Vale Refeição (VR)
    if (conta === 'vr' || renda === 'vr_almoco' || tit.includes(' vr') || tit.includes('refeição') || tit.includes('almoço')) {
      return 'vr';
    }

    // 4. Reserva / Investimentos
    if (conta === 'reserva' || renda === 'reserva_aportes') {
      return 'reserva';
    }

    // 5. Padrão: Matheus (BB CC Salário USP, Nubank Matheus, Inter, Santander)
    return 'matheus';
  }

  function getMonthChronologicalList(startYear = 2026, startMonthIndex = 11, totalMonths = 14) {
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

  function parseYearMonth(str) {
    if (!str) return [2026, 11];
    if (str.includes('/')) {
      const parts = str.split('/');
      const mm = parseInt(parts[0], 10) || 1;
      let yyyy = parseInt(parts[1], 10) || 2026;
      if (yyyy < 100) yyyy += 2000;
      return [yyyy, mm];
    }
    const parts = str.split('-');
    const yyyy = parseInt(parts[0], 10) || 2026;
    const mm = parseInt(parts[1], 10) || 1;
    return [yyyy, mm];
  }

  function isBeneficioNaoPecunia(r) {
    if (!r) return false;
    if (typeof MatrixDB !== 'undefined' && MatrixDB.isBeneficioNaoPecunia) {
      return MatrixDB.isBeneficioNaoPecunia(r);
    }
    const n = (r.nome || '').toLowerCase();
    return /vale\s*(aliment|refei)|\bva\b|\bvr\b|maracaju/i.test(n);
  }

  function isReceitaDaScarlet(r) {
    if (!r) return false;
    if (typeof window !== 'undefined' && window.MatrixApp && window.MatrixApp.isReceitaDaScarlet) {
      return window.MatrixApp.isReceitaDaScarlet(r);
    }
    const tit = String(r.titular || '').toLowerCase().trim();
    const ren = String(r.renda || '').toLowerCase().trim();
    const cta = String(r.conta || '').toLowerCase().trim();
    const cat = String(r.categoria || '').toLowerCase().trim();
    const n = String(r.nome || '').toLowerCase();
    const id = String(r.id || '').toLowerCase();
    if (tit === 'scarlet') return true;
    if (ren === 'ganhos_scarlet' || ren === 'outras_rendas_scarlet') return true;
    if (cta === 'scarlet_fisio' || cta === 'scarlet_extra') return true;
    if (cat === 'outras rendas scarlet' || cat === 'fisio scarlet') return true;
    if (id.includes('scarlet_extra')) return true;
    if (n.includes('scarlet') || n.includes('fisio')) return true;
    return false;
  }

  function getOutrasRendasScarletCalculadas(ano, mesName, monthData) {
    if (typeof window !== 'undefined' && window.MatrixApp && window.MatrixApp.getOutrasRendasScarletMes) {
      const val = window.MatrixApp.getOutrasRendasScarletMes(ano, mesName);
      if (typeof val === 'number') return val;
    }
    if (!monthData) return 0;
    const items = (monthData.receitas || []).filter(r => {
      if (!isReceitaDaScarlet(r)) return false;
      const n = String(r.nome || '').toLowerCase();
      const id = String(r.id || '').toLowerCase();
      const isFisioBase = id === 'rec_fisio_scarlet' || n.includes('fisioflow') || (n.includes('scarlet') && n.includes('fisio'));
      return !isFisioBase;
    });
    if (items.length > 0) {
      return items.reduce((acc, r) => acc + (parseFloat(r.valor) || 0), 0);
    }
    if (monthData.scarlet && monthData.scarlet.outrasRendas != null && monthData.scarlet.outrasRendas !== '') {
      const val = parseFloat(monthData.scarlet.outrasRendas);
      if (!isNaN(val)) return val;
    }
    return 0;
  }

  function isGastoDaScarlet(it) {
    if (!it) return false;
    const n = (it.nome || '').toLowerCase().trim();
    const tit = (it.titular || '').toLowerCase().trim();
    const ren = (it.renda || '').toLowerCase().trim();
    const cta = (it.conta || '').toLowerCase().trim();
    const cat = (it.categoria || '').toLowerCase().trim();
    if (tit === 'scarlet') return true;
    if (n === 'nubank scarlet') return true;
    if (ren === 'ganhos_scarlet' || ren === 'outras_rendas_scarlet') return true;
    if (cta.includes('scarlet')) return true;
    if (cat === 'fisio scarlet' || cat === 'outras rendas scarlet' || cat === 'investimentos scarlet' || cat.includes('psicó')) return true;
    if (n.includes('psicologa') || n.includes('psicóloga')) return true;
    return false;
  }

  function isTransferenciaParaScarlet(it) {
    if (!it) return false;
    const n = (it.nome || '').toLowerCase().trim();
    const desc = (it.descricao || '').toLowerCase();
    return n === 'scarlet' || (desc.includes('transferência') && desc.includes('scarlet'));
  }

  function getFaturaNubankScarletCalculada(ano, mesName, monthData, state) {
    const sAno = String(ano || '');
    const sMes = String(mesName || '');
    if (typeof window !== 'undefined' && window.MatrixApp && window.MatrixApp.getFaturaNubankMes) {
      const val = window.MatrixApp.getFaturaNubankMes(sAno, sMes);
      if (typeof val === 'number' && val > 0) return val;
    }
    if (monthData && monthData.scarlet && monthData.scarlet.faturaNubankManual != null && monthData.scarlet.faturaNubankManual !== '') {
      return parseFloat(monthData.scarlet.faturaNubankManual) || 0;
    }
    const monthKey = `${sAno}-${sMes}`;
    const sat = state && state.satellites && state.satellites.faturas;
    if (sat && sat.faturasPorMes && sat.faturasPorMes[monthKey]) {
      const val = parseFloat(sat.faturasPorMes[monthKey].total || sat.faturasPorMes[monthKey].valorReal);
      if (!isNaN(val) && val > 0) return val;
    }
    if (monthData && monthData.scarlet && typeof monthData.scarlet.faturaNubank === 'number' && monthData.scarlet.faturaNubank > 0) {
      return monthData.scarlet.faturaNubank;
    }
    if (sAno === '2026') {
      if (sMes === 'Outubro') return 3418.03;
      if (sMes === 'Setembro') return 0;
      if (sMes === 'Novembro') return 4883.05;
      if (sMes === 'Dezembro') return 1568.05;
    } else if (sAno === '2027') {
      const stored2027 = monthData && monthData.scarlet && typeof monthData.scarlet.faturaNubank === 'number' ? monthData.scarlet.faturaNubank : 0;
      if (sMes === 'Janeiro' && !(stored2027 > 0)) return 1628.89;
    }
    return 0;
  }

  function getGanhosScarletCalculados(ano, mesName, monthData, state) {
    const sAno = String(ano || '');
    const sMes = String(mesName || '');
    if (typeof window !== 'undefined' && window.MatrixApp && window.MatrixApp.getGanhosScarletMes) {
      const val = window.MatrixApp.getGanhosScarletMes(sAno, sMes);
      if (typeof val === 'number' && val > 0) return val;
    }
    if (monthData && monthData.scarlet && monthData.scarlet.ganhosManual != null && monthData.scarlet.ganhosManual !== '') {
      const manual = parseFloat(monthData.scarlet.ganhosManual);
      if (!isNaN(manual)) return manual;
    }
    // Regra estrita M+1 do FisioFlow para 2026
    if (ano === '2026' && mesName === 'Outubro') return 3700.00;
    if (ano === '2026' && mesName === 'Novembro') return 1140.00;
    if (ano === '2026' && mesName === 'Dezembro') return 995.00;
    // De Janeiro/2027 em diante: estritamente ZERO (0) se não houver dados no app fonte
    return 0;
  }

  function runSimulation(state, activeScenarios = null, totalMonths = 14) {
    const scenarios = activeScenarios || (state.simulacoesAtivas || []).filter(s => s.ativo !== false);
    const timeline = getMonthChronologicalList(2026, 10, totalMonths); // Inicia em Outubro/2026

    const results = [];

    timeline.forEach(m => {
      const yearStr = String(m.year);
      // Usa a mesma leitura do app (MatrixDB.getMonth) para refletir exatamente os lançamentos editados pelo usuário
      let monthData = null;
      try {
        if (typeof MatrixDB !== 'undefined' && MatrixDB.getMonth && state === MatrixDB.getState()) {
          monthData = MatrixDB.getMonth(yearStr, m.monthName);
        }
      } catch (e) { monthData = null; }
      if (!monthData) {
        monthData = (state.anos[yearStr] && state.anos[yearStr][m.monthName]) || { fixos: [], outros: [], receitas: [], diarios: [], totais: {} };
      }

      // ==========================================
      // 1. CONTA 👨 EU (MATHEUS • USP)
      // ==========================================
      let matheusGanhos = 0;
      if (monthData.receitas && monthData.receitas.length > 0) {
        monthData.receitas.forEach(r => {
          if (isBeneficioNaoPecunia(r)) return;
          if (isReceitaDaScarlet(r)) return;
          matheusGanhos += parseFloat(r.valor) || 0;
        });
      }
      if (!matheusGanhos) {
        matheusGanhos = (state.perfil && (state.perfil.salarioBase + (state.perfil.auxilioSaude || 0))) || 5788.19;
        if (m.monthIndex === 12) matheusGanhos += 1280; // 2ª parcela 13º salário USP
      }

      const fixosPropriosMatheus = (monthData.fixos || [])
        .filter(it => !isGastoDaScarlet(it) && !isTransferenciaParaScarlet(it))
        .reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);

      const outrosPropriosMatheus = (monthData.outros || [])
        .filter(it => !isGastoDaScarlet(it) && !isTransferenciaParaScarlet(it))
        .reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);

      const diariosMatheus = (monthData.diarios || [])
        .filter(d => {
          if (!d || d.jaAlocadoVariavel) return false;
          const tit = (d.titular || '').toLowerCase();
          const cta = (d.conta || '').toLowerCase();
          if (tit === 'scarlet' || cta === 'credito_nubank_scarlet') return false;
          if (cta === 'va' || cta === 'cartao_va' || cta === 'vr' || cta === 'cartao_vr') return false;
          return true;
        })
        .reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);

      const transfParaScarlet = [...(monthData.fixos || []), ...(monthData.outros || [])]
        .filter(isTransferenciaParaScarlet)
        .reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);

      let contasInicioAnoMatheus = 0;
      if (m.monthIndex === 1 && monthData.totais && monthData.totais['Contas Inicio Ano']) {
        contasInicioAnoMatheus = parseFloat(monthData.totais['Contas Inicio Ano']) || 0;
      }

      const matheusGastosBase = fixosPropriosMatheus + outrosPropriosMatheus + diariosMatheus + transfParaScarlet + contasInicioAnoMatheus;
      const matheusSaldoBase = matheusGanhos - matheusGastosBase;

      // ==========================================
      // 2. CONTA 👩 SCARLET (FISIOFLOW / NUBANK)
      // ==========================================
      const scarletFisio = getGanhosScarletCalculados(yearStr, m.monthName, monthData, state);
      const scarletOutras = getOutrasRendasScarletCalculadas(yearStr, m.monthName, monthData);
      const scarletGanhosProprios = scarletFisio + scarletOutras;
      const scarletGanhos = scarletGanhosProprios + transfParaScarlet;

      const faturaNubankMes = getFaturaNubankScarletCalculada(yearStr, m.monthName, monthData, state);
      const scarletGastosPropriosBase = [...(monthData.fixos || []), ...(monthData.outros || [])]
        .filter(it => isGastoDaScarlet(it) && !isTransferenciaParaScarlet(it) && it.nome !== 'Nubank Scarlet')
        .reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
      const scarletFaturaNubank = faturaNubankMes;
      const scarletDiarios = (monthData.diarios || [])
        .filter(d => !d.jaAlocadoVariavel && ((d.titular || '').toLowerCase() === 'scarlet' || (d.conta || '').toLowerCase() === 'credito_nubank_scarlet'))
        .reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);
      const scarletGastosBase = scarletFaturaNubank + scarletGastosPropriosBase + scarletDiarios;
      const scarletSaldoBase = scarletGanhos - scarletGastosBase;

      // ==========================================
      // 3. CONTA 🛒 VALE ALIMENTAÇÃO (VA USP)
      // ==========================================
      const satMaracaju = (state.satellites && state.satellites.maracaju) || {};
      const isNov2026 = (yearStr === '2026' && m.monthName === 'Novembro');
      // Regra do Usuário: VA é fixo em R$ 2.050,00
      // Fonte única do app (VA fixo 2050 | VR do calendário Matrix), com fallback local
      const benApp = (typeof window !== 'undefined' && window.MatrixApp && window.MatrixApp.getBeneficiosCreditoMes)
        ? window.MatrixApp.getBeneficiosCreditoMes(yearStr, m.monthName) : null;
      const vaGanhos = benApp ? benApp.va : 2050.00;
      const vaGastosDiarios = (monthData.diarios || [])
        .filter(d => {
          const cta = (d.conta || '').toLowerCase();
          return cta === 'va' || cta === 'cartao_va';
        })
        .reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);
      const vaGastosBase = isNov2026 ? Math.max(vaGastosDiarios, satMaracaju.gastoMercadoMesAtual || 0) : vaGastosDiarios;
      const vaSaldoBase = isNov2026 && satMaracaju.saldoVaRestante != null ? satMaracaju.saldoVaRestante : (vaGanhos - vaGastosBase);

      // ==========================================
      // 4. CONTA 🍽️ VALE REFEIÇÃO (VR USP)
      // ==========================================
      // Regra do Usuário: VR vem do calendário do próprio app Matrix (CalendarEngine) e não da Casa Maracaju
      let vrGanhos = 1105.00;
      try {
        if (typeof CalendarEngine !== 'undefined') {
          const commute = CalendarEngine.calculateCommuteAndVR(parseInt(yearStr, 10), m.monthIndex, (state && state.calendarioCustom) || []);
          if (commute && typeof commute.totalVR === 'number' && commute.totalVR > 0) {
            vrGanhos = commute.totalVR;
          }
        }
      } catch (e) {}
      if (benApp) vrGanhos = benApp.vr;
      const vrGastosDiarios = (monthData.diarios || [])
        .filter(d => {
          const cta = (d.conta || '').toLowerCase();
          return cta === 'vr' || cta === 'cartao_vr';
        })
        .reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);
      const vrGastosBase = isNov2026 ? Math.max(vrGastosDiarios, satMaracaju.gastoVrMesAtual || 0) : vrGastosDiarios;
      const vrSaldoBase = isNov2026 && satMaracaju.saldoVrRestante != null ? satMaracaju.saldoVrRestante : (vrGanhos - vrGastosBase);

      // ==========================================
      // 5. PROCESSAMENTO DE CENÁRIOS ATIVOS NO MÊS
      // ==========================================
      let matheusCustoCen = 0;
      let scarletCustoCen = 0;
      let vaCustoCen = 0;
      let vrCustoCen = 0;
      let consolidadoCustoCen = 0;
      const cenariosAplicados = [];

      scenarios.forEach(scen => {
        let applies = false;
        const [scenY, scenM] = parseYearMonth(scen.inicio || '2026-11');
        const tipo = scen.tipo || (scen.recorrente === false ? 'pontual' : 'recorrente');

        if (tipo === 'pontual') {
          if (m.year === scenY && m.monthIndex === scenM) applies = true;
        } else if (tipo === 'parcelado') {
          const parcelas = parseInt(scen.parcelas || 1, 10);
          const monthDiff = (m.year - scenY) * 12 + (m.monthIndex - scenM);
          if (monthDiff >= 0 && monthDiff < parcelas) applies = true;
        } else {
          if (m.year > scenY || (m.year === scenY && m.monthIndex >= scenM)) {
            applies = true;
            if (scen.fim) {
              const [endY, endM] = parseYearMonth(scen.fim);
              if (m.year > endY || (m.year === endY && m.monthIndex > endM)) applies = false;
            }
          }
        }

        if (applies) {
          const val = parseFloat(scen.valorAdotado || scen.valor || 0);
          const pilar = getScenarioPilar(scen);

          if (pilar === 'matheus') matheusCustoCen += val;
          else if (pilar === 'scarlet') scarletCustoCen += val;
          else if (pilar === 'va') vaCustoCen += val;
          else if (pilar === 'vr') vrCustoCen += val;

          // Cenários pecuniários entram no consolidado do casal
          if (pilar === 'matheus' || pilar === 'scarlet') {
            consolidadoCustoCen += val;
          }

          cenariosAplicados.push({
            id: scen.id,
            titulo: scen.titulo,
            valor: val,
            tipo,
            pilar,
            conta: scen.conta || 'nubank_scarlet',
            renda: scen.renda || 'ganhos_scarlet'
          });
        }
      });

      // Saldos simulados finais por conta
      const matheusSaldoSim = matheusSaldoBase - matheusCustoCen;
      const matheusStatus = matheusSaldoSim < 0 ? 'deficit' : (matheusSaldoSim < 200 ? 'atencao' : 'seguro');

      const scarletSaldoSim = scarletSaldoBase - scarletCustoCen;
      const scarletStatus = scarletSaldoSim < 0 ? 'deficit' : (scarletSaldoSim < 100 ? 'atencao' : 'seguro');

      const vaSaldoSim = vaSaldoBase - vaCustoCen;
      const vaStatus = vaSaldoSim < 0 ? 'deficit' : (vaSaldoSim < 100 ? 'atencao' : 'seguro');

      const vrSaldoSim = vrSaldoBase - vrCustoCen;
      const vrStatus = vrSaldoSim < 0 ? 'deficit' : (vrSaldoSim < 50 ? 'atencao' : 'seguro');

      // Balanço Consolidado (Casal em Conta Corrente: Sobra Matheus + Sobra Scarlet, sem duplicar transferência interna)
      const casalGanhosBase = matheusGanhos + scarletGanhosProprios;
      const casalGastosBase = (matheusGastosBase - transfParaScarlet) + scarletGastosBase;
      const casalSaldoBase = matheusSaldoBase + scarletSaldoBase;
      const casalSaldoSim = casalSaldoBase - consolidadoCustoCen;
      const casalStatus = casalSaldoSim < 0 ? 'deficit' : (casalSaldoSim < 200 ? 'atencao' : 'seguro');

      results.push({
        ...m,
        // Consolidado do casal (compatibilidade legada)
        ganhosBase: casalGanhosBase,
        totalGastosBase: casalGastosBase,
        custoCenarios: consolidadoCustoCen,
        saldoBase: casalSaldoBase,
        saldoSimulado: casalSaldoSim,
        statusAlerta: casalStatus,
        diferenca: casalSaldoSim - casalSaldoBase,

        // Contas e Pilares Segregados
        contas: {
          matheus: {
            id: 'matheus',
            nome: 'Eu (Matheus • USP)',
            icon: '👨',
            ganhos: matheusGanhos,
            gastos: matheusGastosBase,
            custoCenarios: matheusCustoCen,
            saldoBase: matheusSaldoBase,
            saldoSimulado: matheusSaldoSim,
            statusAlerta: matheusStatus
          },
          scarlet: {
            id: 'scarlet',
            nome: 'Scarlet (FisioFlow)',
            icon: '👩',
            ganhos: scarletGanhos,
            ganhosFisio: scarletFisio,
            outrasRendas: scarletOutras,
            transferencia: transfParaScarlet,
            faturaNubank: scarletFaturaNubank,
            gastos: scarletGastosBase,
            custoCenarios: scarletCustoCen,
            saldoBase: scarletSaldoBase,
            saldoSimulado: scarletSaldoSim,
            statusAlerta: scarletStatus
          },
          va: {
            id: 'va',
            nome: 'Vale Alimentação (VA)',
            icon: '🛒',
            ganhos: vaGanhos,
            gastos: vaGastosBase,
            custoCenarios: vaCustoCen,
            saldoBase: vaSaldoBase,
            saldoSimulado: vaSaldoSim,
            statusAlerta: vaStatus
          },
          vr: {
            id: 'vr',
            nome: 'Vale Refeição (VR)',
            icon: '🍽️',
            ganhos: vrGanhos,
            gastos: vrGastosBase,
            custoCenarios: vrCustoCen,
            saldoBase: vrSaldoBase,
            saldoSimulado: vrSaldoSim,
            statusAlerta: vrStatus
          }
        },
        cenariosAplicados
      });
    });

    // Indicadores Agregados por Conta
    const porConta = {
      consolidado: {
        id: 'consolidado',
        nome: 'Consolidado (Casal)',
        icon: '⚖️',
        cor: 'var(--matrix-green)',
        impactoTotalCenarios: results.reduce((acc, r) => acc + r.custoCenarios, 0),
        mesesDeficit: results.filter(r => r.saldoSimulado < 0).length,
        saldoMedio: results.reduce((acc, r) => acc + r.saldoSimulado, 0) / (results.length || 1),
        countCenarios: scenarios.filter(s => getScenarioPilar(s) === 'matheus' || getScenarioPilar(s) === 'scarlet').length
      },
      matheus: {
        id: 'matheus',
        nome: 'Eu (Matheus • USP)',
        icon: '👨',
        cor: 'var(--cyan)',
        impactoTotalCenarios: results.reduce((acc, r) => acc + r.contas.matheus.custoCenarios, 0),
        mesesDeficit: results.filter(r => r.contas.matheus.saldoSimulado < 0).length,
        saldoMedio: results.reduce((acc, r) => acc + r.contas.matheus.saldoSimulado, 0) / (results.length || 1),
        countCenarios: scenarios.filter(s => getScenarioPilar(s) === 'matheus').length
      },
      scarlet: {
        id: 'scarlet',
        nome: 'Scarlet (FisioFlow)',
        icon: '👩',
        cor: '#f472b6',
        impactoTotalCenarios: results.reduce((acc, r) => acc + r.contas.scarlet.custoCenarios, 0),
        mesesDeficit: results.filter(r => r.contas.scarlet.saldoSimulado < 0).length,
        saldoMedio: results.reduce((acc, r) => acc + r.contas.scarlet.saldoSimulado, 0) / (results.length || 1),
        countCenarios: scenarios.filter(s => getScenarioPilar(s) === 'scarlet').length
      },
      va: {
        id: 'va',
        nome: 'Vale Alimentação (VA)',
        icon: '🛒',
        cor: 'var(--amber)',
        impactoTotalCenarios: results.reduce((acc, r) => acc + r.contas.va.custoCenarios, 0),
        mesesDeficit: results.filter(r => r.contas.va.saldoSimulado < 0).length,
        saldoMedio: results.reduce((acc, r) => acc + r.contas.va.saldoSimulado, 0) / (results.length || 1),
        countCenarios: scenarios.filter(s => getScenarioPilar(s) === 'va').length
      },
      vr: {
        id: 'vr',
        nome: 'Vale Refeição (VR)',
        icon: '🍽️',
        cor: '#c084fc',
        impactoTotalCenarios: results.reduce((acc, r) => acc + r.contas.vr.custoCenarios, 0),
        mesesDeficit: results.filter(r => r.contas.vr.saldoSimulado < 0).length,
        saldoMedio: results.reduce((acc, r) => acc + r.contas.vr.saldoSimulado, 0) / (results.length || 1),
        countCenarios: scenarios.filter(s => getScenarioPilar(s) === 'vr').length
      }
    };

    // Cálculo de correlação com fontes de renda (O dinheiro sai dos ganhos do Matheus ou da Scarlet)
    const correlacaoRendas = {
      salario_usp: { id: 'salario_usp', pilar: 'matheus', nome: 'Salário Líquido USP (Matheus)', totalMensal: 0, count: 0 },
      ganhos_scarlet: { id: 'ganhos_scarlet', pilar: 'scarlet', nome: 'Ganhos Scarlet (FisioFlow)', totalMensal: 0, count: 0 },
      va_mercado: { id: 'va_mercado', pilar: 'va', nome: 'Vale Alimentação (VA)', totalMensal: 0, count: 0 },
      vr_almoco: { id: 'vr_almoco', pilar: 'vr', nome: 'Vale Refeição (VR)', totalMensal: 0, count: 0 },
      reserva_aportes: { id: 'reserva_aportes', pilar: 'reserva', nome: 'Investimentos / Reserva', totalMensal: 0, count: 0 }
    };

    scenarios.forEach(scen => {
      let rKey = scen.renda || 'salario_usp';
      // Mapeia legados ou descartados (orçamento geral / renda extra) para Matheus ou Scarlet
      if (rKey === 'orcamento_geral' || rKey === 'estudio_extra' || !correlacaoRendas[rKey]) {
        rKey = (getScenarioPilar(scen) === 'scarlet') ? 'ganhos_scarlet' : 'salario_usp';
      }
      const val = parseFloat(scen.valorAdotado || scen.valor || 0);
      correlacaoRendas[rKey].totalMensal += val;
      correlacaoRendas[rKey].count++;
    });

    return {
      scenarios,
      totalMeses: results.length,
      mesesDeficit: porConta.consolidado.mesesDeficit,
      impactoTotalCenarios: porConta.consolidado.impactoTotalCenarios,
      saldoMedio: porConta.consolidado.saldoMedio,
      porConta,
      correlacaoRendas,
      timeline: results
    };
  }

  return {
    MONTH_NAMES,
    PILAR_CONFIG,
    getScenarioPilar,
    getMonthChronologicalList,
    runSimulation
  };
})();

if (typeof window !== 'undefined') {
  window.ScenarioSimulator = ScenarioSimulator;
}
