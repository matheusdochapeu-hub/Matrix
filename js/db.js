/**
 * MATRIX FINANCE - DATABASE & LOCAL STORAGE ADAPTER
 * Persistência ultra-resiliente via localStorage e IndexedDB com pré-carga de seed.
 */

const MatrixDB = (function () {
  const STORAGE_KEY = 'MATRIX_FINANCE_STATE_v2';
  let memoryCache = null;

  async function init() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        memoryCache = JSON.parse(raw);
      } else if (typeof MATRIX_SEED_DATA !== 'undefined') {
        memoryCache = JSON.parse(JSON.stringify(MATRIX_SEED_DATA));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
      } else {
        memoryCache = {
          versao: '1.0.0',
          atualizadoEm: new Date().toISOString(),
          perfil: {},
          financiamentoCaixa: {},
          bancos: [],
          investimentos: [],
          holerites: [],
          simulacoesAtivas: [],
          anos: {}
        };
      }
    } catch (e) {
      console.warn('Erro ao carregar do localStorage:', e);
      if (typeof MATRIX_SEED_DATA !== 'undefined') {
        memoryCache = JSON.parse(JSON.stringify(MATRIX_SEED_DATA));
      }
    }
    recoverDiariosFromLocalBackups(memoryCache);
    return memoryCache;
  }

  function isSummaryOrTotalItem(name) {
    if (!name) return false;
    const n = String(name).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const exactForbidden = [
      'total', 'totais', 'subtotal', 'sub-total', 'sub total', 'gastos',
      'total gastos fixos', 'total gastos variaveis', 'total outros gastos',
      'subtotal gastos', 'subtotal ganhos', 'ganhos - gastos',
      'soma', 'saldo final', 'resumo', 'ideal', 'investimentos'
    ];
    if (exactForbidden.includes(n)) return true;
    if (/^(total|totais|subtotal|sub-total|sub\s+total|gastos)\b/i.test(n)) return true;
    return false;
  }

  // Regra Financeira: VA e VR são benefícios de alimentação e NÃO são dinheiro em pecúnia para pagar contas
  function isBeneficioNaoPecunia(itemOuNome) {
    if (!itemOuNome) return false;
    if (typeof itemOuNome === 'object') {
      if (itemOuNome.naoPecunia === true) return true;
      const cat = (itemOuNome.categoria || '').toLowerCase();
      if (cat.includes('não pecúnia') || cat.includes('nao pecunia')) return true;
    }
    const str = (typeof itemOuNome === 'string' ? itemOuNome : (itemOuNome.nome || '')).toLowerCase();
    if (/vale\s*(alimenta[çc][ãa]o|refei[çc][ãa]o)/i.test(str)) return true;
    if (/\bva\b/i.test(str) && (str.includes('maracaju') || str.includes('alelo') || str.includes('aliment') || str.includes('benef') || str.trim() === 'va')) return true;
    if (/\bvr\b/i.test(str) && (str.includes('usp') || str.includes('refei') || str.includes('benef') || str.trim() === 'vr')) return true;
    if (str.includes('maracaju 88')) return true;
    if (str === 'va' || str === 'vr') return true;
    return false;
  }

  function sanitizeState(state) {
    if (!state || !state.anos) return state;
    let mutated = false;
    for (const ano in state.anos) {
      // Regra Estrita: Anos anteriores a 2026 são totalmente expurgados
      if (parseInt(ano, 10) < 2026) {
        delete state.anos[ano];
        mutated = true;
        continue;
      }
      // Em 2026, expurgar todos os meses anteriores a Outubro (Janeiro a Setembro)
      if (ano === '2026') {
        const preOct = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro'];
        preOct.forEach(m => {
          if (state.anos['2026'][m]) {
            delete state.anos['2026'][m];
            mutated = true;
          }
        });
      }
      for (const mes in state.anos[ano]) {
        const m = state.anos[ano][mes];
        if (!m) continue;
        if (m.fixos && Array.isArray(m.fixos)) {
          const origLen = m.fixos.length;
          m.fixos = m.fixos.filter(it => it && !isSummaryOrTotalItem(it.nome));
          if (m.fixos.length !== origLen) mutated = true;
        }
        if (m.outros && Array.isArray(m.outros)) {
          const origLen = m.outros.length;
          m.outros = m.outros.filter(it => it && !isSummaryOrTotalItem(it.nome));
          if (m.outros.length !== origLen) mutated = true;
        }
        if (m.receitas && Array.isArray(m.receitas)) {
          const origLen = m.receitas.length;
          m.receitas = m.receitas.filter(it => it && !isSummaryOrTotalItem(it.nome));
          if (m.receitas.length !== origLen) mutated = true;
          // Sinalizar VA e VR existentes como não-pecúnia
          m.receitas.forEach(r => {
            if (isBeneficioNaoPecunia(r) && (!r.naoPecunia || r.categoria !== 'Benefício (Não Pecúnia)')) {
              r.naoPecunia = true;
              r.categoria = 'Benefício (Não Pecúnia)';
              mutated = true;
            }
          });
        }
        if (m.diarios && Array.isArray(m.diarios)) {
          const origLen = m.diarios.length;
          m.diarios = m.diarios.filter(it => it && !isSummaryOrTotalItem(it.nome));
          if (m.diarios.length !== origLen) mutated = true;
        }
      }
    }
    if (state.holerites && Array.isArray(state.holerites)) {
      const origHl = state.holerites.length;
      state.holerites = state.holerites.filter(h => (h.periodo || '') >= '2026-10');
      if (state.holerites.length !== origHl) mutated = true;
    }
    if (mutated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {}
    }
    return state;
  }

  function getState() {
    if (!memoryCache) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try { memoryCache = JSON.parse(raw); } catch (e) {}
      }
      if (!memoryCache && typeof MATRIX_SEED_DATA !== 'undefined') {
        memoryCache = JSON.parse(JSON.stringify(MATRIX_SEED_DATA));
      }
    }

    if (memoryCache) {
      sanitizeState(memoryCache);
      if (!memoryCache.config) memoryCache.config = {};
      if (!memoryCache.config.nomeEstudio || memoryCache.config.nomeEstudio === 'Estúdio') memoryCache.config.nomeEstudio = 'Renda Extra';
    }

    // Compatibilidade e enriquecimento automático de titularidade (Matheus & Scarlet)
    if (memoryCache && memoryCache.investimentos) {
      let invMutated = false;
      memoryCache.investimentos.forEach(inv => {
        if (!inv.titular) {
          inv.titular = 'Matheus';
          invMutated = true;
        }

        // Correção DinDin Santander: 60 meses, Resgate final R$ 3.000,00
        const ativoNome = (inv.ativo || '').toLowerCase();
        const catNome = (inv.categoria || '').toLowerCase();
        const corrNome = (inv.corretora || '').toLowerCase();
        if (inv.id === 'dindin_santander' || ativoNome.includes('dindin') || (catNome.includes('capitalização') && corrNome.includes('santander'))) {
          if (inv.vencimento !== '60 meses (Resgate R$ 3.000,00)') {
            inv.vencimento = '60 meses (Resgate R$ 3.000,00)';
            inv.status = 'Aporte automático R$ 50/mês (60 meses)';
            inv.rentabilidadeContratada = 'TR + Sorteios (Resgate R$ 3.000,00)';
            invMutated = true;
          }
        }

        // Correção 1250 da Scarlet: Tesouro Direto Renda+ 2055
        if (inv.titular === 'Scarlet' && (inv.id === 'reserva_scarlet_nu' || (inv.valorAtual === 1250 && !ativoNome.includes('renda+')))) {
          inv.id = 'renda_plus_scarlet';
          inv.ativo = 'Tesouro Direto Renda+ 2055';
          inv.corretora = 'Tesouro Direto';
          inv.categoria = 'Previdência / Aposentadoria';
          inv.vencimento = '2055';
          inv.rentabilidadeContratada = 'IPCA + 6,50% a.a.';
          inv.status = 'Ativo (Aposentadoria 2055)';
          invMutated = true;
        }
      });

      // Se o cache antigo do usuário ainda não possuir os ativos de Scarlet, mescla os seeds
      const temScarlet = memoryCache.investimentos.some(inv => inv.titular === 'Scarlet');
      if (!temScarlet && typeof MATRIX_SEED_DATA !== 'undefined' && MATRIX_SEED_DATA.investimentos) {
        const scarletSeeds = MATRIX_SEED_DATA.investimentos.filter(s => s.titular === 'Scarlet');
        if (scarletSeeds.length > 0) {
          memoryCache.investimentos.push(...JSON.parse(JSON.stringify(scarletSeeds)));
          invMutated = true;
        }
      }

      if (invMutated) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache)); } catch (e) {}
      }
    }

    // Sincronização e calibração de dados dinâmicos do FisioFlow (Novembro/2026: Previsto R$ 3.810,00)
    if (memoryCache && memoryCache.satellites && memoryCache.satellites.fisioflow) {
      const ff = memoryCache.satellites.fisioflow;
      if (ff.mesAtualPrevisto === 3300 || (ff.ganhosPorMes && ff.ganhosPorMes['2026-11'] && ff.ganhosPorMes['2026-11'].previsto === 3300)) {
        ff.mesAtualPrevisto = 3810.00;
        ff.ganhoPossivelMes = (ff.mesAtualTotal || 995.00) + 3810.00;
        if (ff.ganhosPorMes && ff.ganhosPorMes['2026-11']) {
          ff.ganhosPorMes['2026-11'].previsto = 3810;
          ff.ganhosPorMes['2026-11'].ganhoPossivel = (ff.ganhosPorMes['2026-11'].total || 995) + 3810;
        }
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache)); } catch (_) {}
      }
    }

    // Inicialização e vinculação automática dos conectores satélites (Maracaju 88, FisioFlow, Faturas)
    if (memoryCache) {
      if (!memoryCache.satellites) memoryCache.satellites = {};
      const maracajuObsoleto = !memoryCache.satellites.maracaju ||
        memoryCache.satellites.maracaju.vaTotal !== 2059.84 ||
        memoryCache.satellites.maracaju.vrTotal !== 1105.16 ||
        !memoryCache.satellites.maracaju.cicloVigente ||
        memoryCache.satellites.maracaju.cicloVigente !== '2026-11';
      if (maracajuObsoleto) {
        memoryCache.satellites.maracaju = {
          origem: 'Maracaju 88',
          atualizadoEm: new Date().toISOString(),
          cicloVigente: '2026-11',
          creditDate: '2026-11-06',
          vaMensal: 2050.0,
          vaRollover: 9.84,
          vaTotal: 2059.84,
          gastoMercadoMesAtual: 71.06,
          saldoVaRestante: 1988.78,
          transbordouVa: 0,
          vrCreditadoNoMes: 1105.0,
          vrRollover: 0.16,
          vrTotal: 1105.16,
          vrDays: 17,
          gastoVrMesAtual: 299.75,
          saldoVrRestante: 805.41,
          transbordouVr: 0,
          totalBeneficios: 3165.0,
          totalDisponivel: 2794.19,
          gastoMercadoCicloAnterior: 390.41,
          gastoVrCicloAnterior: 0.0,
          comprasCicloAtual: [
            { id: 'nfe_1794097840696_r3nk', date: '2026-11-07', establishment: 'Padaria e Mercearia Irmãos Araújo', total: 71.06, paymentMethod: 'va', itemsCount: 4 },
            { id: 'nfe_1794071702244_8wc4', date: '2026-11-07', establishment: 'Padock Bar', total: 102.3, paymentMethod: 'vr', itemsCount: 0 },
            { id: 'nfe_1794011419923_j6m6', date: '2026-11-06', establishment: 'Burgoo', total: 197.45, paymentMethod: 'vr', itemsCount: 0 }
          ],
          comprasCicloAnterior: [],
          reformasAndamento: 0,
          manutencoesCarro: 0
        };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache)); } catch (e) {}
      }
      if (typeof SatelliteConnectors !== 'undefined' && typeof SatelliteConnectors.syncMaracajuFromLocal === 'function') {
        SatelliteConnectors.syncMaracajuFromLocal(memoryCache);
      }
    }

    // Calibração e higienização estrita de dados persistidos no cache
    if (memoryCache && memoryCache.anos) {
      let cacheMutated = false;

      // 1. Benefícios de Novembro de 2026: VA fixo em 2.050,00 e VR pelo calendário em 1.105,00
      if (memoryCache.anos['2026'] && memoryCache.anos['2026']['Novembro']) {
        const nov = memoryCache.anos['2026']['Novembro'];
        if (!nov.totais) nov.totais = {};
        if (nov.vrManual === 1105.16 || nov.vrManual === 1105 || nov.vrManual === 2059.84 || nov.vrManual === 2050) {
          delete nov.vrManual;
          cacheMutated = true;
        }
        if (nov.vaManual === 2059.84 || nov.vaManual === 2050) {
          delete nov.vaManual;
          cacheMutated = true;
        }
        if (nov.totais['VR'] !== 1105.00 && nov.vrManual == null) {
          nov.totais['VR'] = 1105.00;
          cacheMutated = true;
        }
        if (nov.totais['VA'] !== 2050.00 && nov.vaManual == null) {
          nov.totais['VA'] = 2050.00;
          cacheMutated = true;
        }
        if (nov.receitas) {
          nov.receitas.forEach(r => {
            const n = (r.nome || '').toLowerCase();
            if ((/\bvr\b/.test(n) || n.includes('refeição') || n.includes('refeicao')) && r.valor !== 1105.00 && nov.vrManual == null) {
              r.valor = 1105.00;
              r.naoPecunia = true;
              cacheMutated = true;
            }
            if ((/\bva\b/.test(n) || n.includes('alimentação') || n.includes('alimentacao')) && !(/\bvr\b/.test(n)) && r.valor !== 2050.00 && nov.vaManual == null) {
              r.valor = 2050.00;
              r.naoPecunia = true;
              cacheMutated = true;
            }
          });
        }
      }

      // 2. Regra M+1 para Scarlet em 2026 (Outubro: 3.700, Novembro: 1.140, Dezembro: 995)
      if (memoryCache.anos['2026']) {
        const ano2026 = memoryCache.anos['2026'];
        if (ano2026['Outubro'] && ano2026['Outubro'].scarlet && ano2026['Outubro'].scarlet.ganhosManual == null) {
          if (ano2026['Outubro'].scarlet.ganhos !== 3700) {
            ano2026['Outubro'].scarlet.ganhos = 3700;
            cacheMutated = true;
          }
        }
        if (ano2026['Novembro'] && ano2026['Novembro'].scarlet && ano2026['Novembro'].scarlet.ganhosManual == null) {
          if (ano2026['Novembro'].scarlet.ganhos !== 1140) {
            ano2026['Novembro'].scarlet.ganhos = 1140;
            cacheMutated = true;
          }
        }
        if (ano2026['Dezembro'] && ano2026['Dezembro'].scarlet && ano2026['Dezembro'].scarlet.ganhosManual == null) {
          if (ano2026['Dezembro'].scarlet.ganhos !== 995) {
            ano2026['Dezembro'].scarlet.ganhos = 995;
            cacheMutated = true;
          }
          if (ano2026['Dezembro'].receitas) {
            ano2026['Dezembro'].receitas.forEach(r => {
              if (r.valor === 5200 || r.valor === '5200') {
                r.valor = 995;
                cacheMutated = true;
              }
            });
          }
        }
      }

      // 3. Zerar rendas inventadas de Scarlet de Janeiro/2027 em diante (a menos que tenha ganhosManual)
      Object.keys(memoryCache.anos).forEach(ano => {
        if (parseInt(ano, 10) >= 2027) {
          Object.keys(memoryCache.anos[ano]).forEach(mes => {
            const mData = memoryCache.anos[ano][mes];
            if (mData.scarlet && mData.scarlet.ganhosManual == null && mData.scarlet.ganhos !== 0) {
              mData.scarlet.ganhos = 0;
              cacheMutated = true;
            }
            if (mData.receitas) {
              mData.receitas = mData.receitas.filter(r => {
                const n = (r.nome || '').toLowerCase();
                if ((n.includes('scarlet') || n.includes('fisio')) && !r.manual) {
                  cacheMutated = true;
                  return false;
                }
                return true;
              });
            }
          });
        }
      });

      if (cacheMutated) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache)); } catch (e) {}
      }
    }

    // Mescla holerites do seed ausentes no cache do usuário (especialmente holerites oficiais de 2025)
    if (memoryCache && typeof MATRIX_SEED_DATA !== 'undefined' && Array.isArray(MATRIX_SEED_DATA.holerites)) {
      if (!Array.isArray(memoryCache.holerites)) memoryCache.holerites = [];
      let holMutated = false;
      MATRIX_SEED_DATA.holerites.forEach(seedH => {
        const existingIdx = memoryCache.holerites.findIndex(h => h.periodo === seedH.periodo);
        if (existingIdx === -1) {
          memoryCache.holerites.push(JSON.parse(JSON.stringify(seedH)));
          holMutated = true;
        } else if (!memoryCache.holerites[existingIdx].itens || memoryCache.holerites[existingIdx].itens.length === 0) {
          memoryCache.holerites[existingIdx] = JSON.parse(JSON.stringify(seedH));
          holMutated = true;
        }
      });
      if (holMutated) {
        memoryCache.holerites.sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''));
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache)); } catch (e) {}
      }
    }

    // Expurgar meses anteriores a Outubro de 2026 do cache do usuário
    if (memoryCache && memoryCache.anos) {
      let purged = false;
      if (memoryCache.anos['2025']) {
        delete memoryCache.anos['2025'];
        purged = true;
      }
      if (memoryCache.anos['2026']) {
        const preOct = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro'];
        preOct.forEach(m => {
          if (memoryCache.anos['2026'][m]) {
            delete memoryCache.anos['2026'][m];
            purged = true;
          }
        });
      }
      if (purged) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache)); } catch (e) {}
      }
    }

    // Sincronização dos meses vigentes de 2026 (Outubro a Dezembro) se estiverem sem receitas
    if (memoryCache && memoryCache.anos && memoryCache.anos['2026'] && typeof MATRIX_SEED_DATA !== 'undefined' && MATRIX_SEED_DATA.anos && MATRIX_SEED_DATA.anos['2026']) {
      const seed2026 = MATRIX_SEED_DATA.anos['2026'];
      let ano2026Mutated = false;
      ['Outubro', 'Novembro', 'Dezembro'].forEach(mNome => {
        if (memoryCache.anos['2026'][mNome] && seed2026[mNome]) {
          const curM = memoryCache.anos['2026'][mNome];
          if (!curM.receitas || curM.receitas.length === 0) {
            curM.receitas = JSON.parse(JSON.stringify(seed2026[mNome].receitas || []));
            if (!curM.totais) curM.totais = {};
            Object.assign(curM.totais, seed2026[mNome].totais || {});
            ano2026Mutated = true;
          }
        }
      });

      if (ano2026Mutated) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache)); } catch (e) {}
      }
    }

    // Compatibilidade e enriquecimento das despesas com transferência para Scarlet (Fatura Nubank)
    if (memoryCache && memoryCache.anos) {
      let scarletMutated = false;
      Object.keys(memoryCache.anos).forEach(anoKey => {
        const anoObj = memoryCache.anos[anoKey];
        if (anoObj && typeof anoObj === 'object') {
          Object.keys(anoObj).forEach(mesKey => {
            const mData = anoObj[mesKey];
            if (mData && typeof mData === 'object') {
              ['fixos', 'outros'].forEach(tipo => {
                if (Array.isArray(mData[tipo])) {
                  mData[tipo].forEach(item => {
                    if (item && item.nome && item.nome.trim().toLowerCase() === 'scarlet') {
                      if (!item.categoria || item.categoria === 'Geral') {
                        item.categoria = 'Cartão';
                        scarletMutated = true;
                      }
                      if (!item.conta) {
                        item.conta = 'salario_bb';
                        scarletMutated = true;
                      }
                      if (!item.descricao) {
                        item.descricao = 'Transferência da minha conta para a dela para pagar fatura do Nubank';
                        scarletMutated = true;
                      }
                    }
                  });
                }
              });
            }
          });
        }
      });
      if (scarletMutated) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache)); } catch (e) {}
      }
    }

    return memoryCache;
  }

  const BACKUP_LAST_KEY = 'matrix_backup_auto_last';
  const BACKUP_HISTORY_KEY = 'matrix_backup_history_v1';

  function recoverDiariosFromLocalBackups(state) {
    if (!state || !state.anos || typeof localStorage === 'undefined') return false;
    let recoveredAny = false;
    const candidateSnapshots = [];
    try {
      const lastRaw = localStorage.getItem(BACKUP_LAST_KEY);
      if (lastRaw) {
        const lastParsed = JSON.parse(lastRaw);
        if (lastParsed && lastParsed.state && lastParsed.state.anos) candidateSnapshots.push(lastParsed.state);
      }
    } catch (_) {}
    try {
      const histRaw = localStorage.getItem(BACKUP_HISTORY_KEY);
      if (histRaw) {
        const histParsed = JSON.parse(histRaw);
        if (Array.isArray(histParsed)) {
          histParsed.forEach(snap => {
            if (snap && snap.state && snap.state.anos) candidateSnapshots.push(snap.state);
          });
        }
      }
    } catch (_) {}
    if (candidateSnapshots.length === 0) return false;

    Object.keys(state.anos).forEach(ano => {
      const anoObj = state.anos[ano];
      if (!anoObj || typeof anoObj !== 'object') return;
      Object.keys(anoObj).forEach(mes => {
        const curMonth = anoObj[mes];
        if (!curMonth || typeof curMonth !== 'object') return;
        if (!Array.isArray(curMonth.diarios)) curMonth.diarios = [];

        candidateSnapshots.forEach(cState => {
          if (!cState.anos || !cState.anos[ano] || !cState.anos[ano][mes]) return;
          const snapMonth = cState.anos[ano][mes];
          if (!snapMonth || !Array.isArray(snapMonth.diarios) || snapMonth.diarios.length === 0) return;

          snapMonth.diarios.forEach(snapItem => {
            if (!snapItem || typeof snapItem !== 'object') return;
            const exists = curMonth.diarios.some(curItem => {
              if (curItem.id && snapItem.id && curItem.id === snapItem.id) return true;
              const sameName = (curItem.nome || '').trim().toLowerCase() === (snapItem.nome || '').trim().toLowerCase();
              const sameVal = Math.abs((parseFloat(curItem.valor) || 0) - (parseFloat(snapItem.valor) || 0)) < 0.01;
              const sameDate = curItem.dataHora && snapItem.dataHora && curItem.dataHora === snapItem.dataHora;
              return sameName && sameVal && sameDate;
            });
            if (!exists) {
              curMonth.diarios.push(JSON.parse(JSON.stringify(snapItem)));
              recoveredAny = true;
            }
          });
        });
      });
    });

    if (recoveredAny) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    }
    return recoveredAny;
  }


  function saveState(state, reason = 'alteracao_sistema', options = {}) {
    state.atualizadoEm = new Date().toISOString();
    memoryCache = state;
    const serialized = JSON.stringify(state);
    try {
      // 1. Gravação prioritária no armazenamento ativo
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (quotaErr) {
      try {
        localStorage.removeItem(BACKUP_LAST_KEY);
        localStorage.removeItem(BACKUP_HISTORY_KEY);
        localStorage.setItem(STORAGE_KEY, serialized);
      } catch (e2) {
        console.error('Falha crítica ao gravar estado principal no localStorage:', e2);
      }
    }

    try {
      // 2. Backup Impecável: Snapshot completo imediato
      localStorage.setItem(BACKUP_LAST_KEY, JSON.stringify({
        timestamp: new Date().toISOString(),
        motivo: reason,
        state: state
      }));

      // 3. Histórico de snapshots rotativos (mantém as últimas 20 alterações)
      let hist = [];
      try {
        const histRaw = localStorage.getItem(BACKUP_HISTORY_KEY);
        if (histRaw) hist = JSON.parse(histRaw);
      } catch (_) {}
      if (!Array.isArray(hist)) hist = [];
      hist.unshift({
        id: 'snap_' + Date.now(),
        dataHora: new Date().toISOString(),
        motivo: reason,
        resumo: `Backup automático às ${new Date().toLocaleTimeString('pt-BR')}`
      });
      if (hist.length > 20) hist = hist.slice(0, 20);
      localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(hist));
    } catch (e) {
      // Se exceder a cota de 5MB do navegador com o backup duplicado, preserva o estado principal intacto
      console.warn('Aviso: cota de histórico local atingida, mantendo STORAGE_KEY principal intacto.');
    }

    const skipCloudSync = !!(
      (options && options.skipCloudSync) ||
      reason === 'init_calibration' ||
      reason === 'cloud_restore' ||
      reason === 'satellite_scrape'
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('matrix_data_changed', {
        detail: { state, reason, skipCloudSync }
      }));
    }
    return state;
  }

  function getLastAutoBackup() {
    try {
      const raw = localStorage.getItem(BACKUP_LAST_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function getBackupSnapshots() {
    try {
      const raw = localStorage.getItem(BACKUP_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  function ensureMonthReceitas(month, ano, mes) {
    if (!month) return [];
    const pagoPadrao = parseInt(ano, 10) < 2027; // De 2027 em diante, todo lançamento nasce PENDENTE
    if (month.receitas && month.receitas.length > 0) return month.receitas;
    if (!month.receitas) month.receitas = [];

    const t = month.totais || {};
    // Extrair receitas mapeadas da planilha/seed original
    const salarioVal = parseFloat(t['Salário Mensal']) || 0;
    if (salarioVal > 0) {
      month.receitas.push({
        id: 'rec_sal_' + mes,
        nome: 'Salário Líquido USP (Banco do Brasil)',
        valor: salarioVal,
        categoria: 'Salário / Proventos',
        pago: pagoPadrao
      });
    }

    const vrVal = parseFloat(t['VR']) || 0;
    if (vrVal > 0) {
      month.receitas.push({
        id: 'rec_vr_' + mes,
        nome: 'Vale Refeição (VR)',
        valor: vrVal,
        categoria: 'Benefício (Não Pecúnia)',
        naoPecunia: true,
        pago: pagoPadrao
      });
    }

    const vaVal = parseFloat(t['VA']) || 0;
    if (vaVal > 0) {
      month.receitas.push({
        id: 'rec_va_' + mes,
        nome: 'Vale Alimentação (VA - Maracaju 88)',
        valor: vaVal,
        categoria: 'Benefício (Não Pecúnia)',
        naoPecunia: true,
        pago: pagoPadrao
      });
    }

    const decimoVal = parseFloat(t['13º']) || (ano === '2026' && mes === 'Novembro' ? 1566.00 : (ano === '2026' && mes === 'Dezembro' ? 1280.00 : 0));
    if (decimoVal > 0) {
      month.receitas.push({
        id: 'rec_13_' + mes,
        nome: '13º Salário USP',
        valor: decimoVal,
        categoria: 'Salário / Proventos',
        pago: (ano === '2025' || (ano === '2026' && ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro'].includes(mes)))
      });
    }

    const estudioVal = parseFloat(t['Estúdio']) || 0;
    if (estudioVal > 0) {
      month.receitas.push({
        id: 'rec_extra_' + mes,
        nome: 'Renda Extra',
        valor: estudioVal,
        categoria: 'Renda Extra',
        pago: pagoPadrao
      });
    }

    const feriasMpspVal = parseFloat(t['Férias Proporcionais MPSP'] || t['Rescisão MPSP']) || (ano === '2026' && mes === 'Setembro' ? 8954.13 : 0);
    if (feriasMpspVal > 0) {
      month.receitas.push({
        id: 'rec_ferias_mpsp_' + mes,
        nome: 'Férias Proporcionais MPSP (Indenizadas)',
        valor: feriasMpspVal,
        categoria: 'Outros Ganhos / Rescisão',
        conta: 'bradesco',
        renda: 'rescisao_mpsp',
        pago: pagoPadrao
      });
    }

    // Se ainda estiver vazia e for ano recente/futuro, inicializa base padrão USP
    if (month.receitas.length === 0 && (parseInt(ano, 10) >= 2026)) {
      month.receitas.push(
        { id: 'rec_sal_' + mes, nome: 'Salário Líquido USP (Banco do Brasil)', valor: 5788.19, categoria: 'Salário / Proventos', pago: false },
        { id: 'rec_vr_' + mes, nome: 'Vale Refeição (VR)', valor: 1105.00, categoria: 'Benefício (Não Pecúnia)', naoPecunia: true, pago: false },
        { id: 'rec_va_' + mes, nome: 'Vale Alimentação (VA - Maracaju 88)', valor: 2050.00, categoria: 'Benefício (Não Pecúnia)', naoPecunia: true, pago: false }
      );
    }

    return month.receitas;
  }

  function getMonth(ano, mes) {
    const s = getState();
    if (!s.anos[ano]) s.anos[ano] = {};
    if (!s.anos[ano][mes]) {
      s.anos[ano][mes] = { fixos: [], outros: [], receitas: [], totais: {} };
    }
    const month = s.anos[ano][mes];
    if (!month.fixos) month.fixos = [];
    if (!month.outros) month.outros = [];
    month.fixos = month.fixos.filter(it => it && !isSummaryOrTotalItem(it.nome));
    month.outros = month.outros.filter(it => it && !isSummaryOrTotalItem(it.nome));
    ensureMonthReceitas(month, ano, mes);
    if (month.receitas) {
      month.receitas = month.receitas.filter(it => it && !isSummaryOrTotalItem(it.nome));
    }
    return month;
  }

  function saveMonth(ano, mes, data, options = {}) {
    const s = getState();
    if (!s.anos[ano]) s.anos[ano] = {};
    s.anos[ano][mes] = data;
    const reason = (options && options.reason) || 'alteracao_mes';
    saveState(s, reason, options);
    return data;
  }

  function getListByTipo(month, tipo) {
    if (tipo === 'fixo') return month.fixos || (month.fixos = []);
    if (tipo === 'receita') return month.receitas || (month.receitas = []);
    if (tipo === 'diario' || tipo === 'gasto_diario') return month.diarios || (month.diarios = []);
    return month.outros || (month.outros = []);
  }

  function addTransaction(ano, mes, tipo, item) {
    const s = getState();
    if (!s.anos[ano]) s.anos[ano] = {};
    if (!s.anos[ano][mes]) s.anos[ano][mes] = { fixos: [], outros: [], receitas: [], diarios: [], totais: {} };

    const month = s.anos[ano][mes];
    const list = getListByTipo(month, tipo);
    const prefix = tipo === 'fixo' ? 'fix_' : (tipo === 'receita' ? 'rec_' : (tipo === 'diario' || tipo === 'gasto_diario' ? 'diar_' : 'out_'));

    list.push({
      id: prefix + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      nome: item.nome,
      valor: parseFloat(item.valor) || 0,
      categoria: item.categoria || (tipo === 'receita' ? 'Salário / Proventos' : (tipo === 'fixo' ? 'Habitação' : (tipo === 'diario' ? 'Alimentação & Lanches' : 'Outros'))),
      conta: item.conta || 'debito_nubank',
      renda: item.renda || '',
      metodo: item.metodo || 'debito',
      dataHora: item.dataHora || new Date().toISOString(),
      obs: item.obs || '',
      pago: item.pago !== undefined ? !!item.pago : (parseInt(ano, 10) < 2027)
    });

    saveState(s);
    return month;
  }

  function updateTransaction(ano, mes, tipo, id, updates) {
    const s = getState();
    const month = s.anos[ano] && s.anos[ano][mes];
    if (!month) return false;

    const list = getListByTipo(month, tipo);
    const item = list.find(it => it.id === id || it.nome === id);
    if (item) {
      Object.assign(item, updates);
      saveState(s);
      return true;
    }
    return false;
  }

  function removeTransaction(ano, mes, tipo, id) {
    const s = getState();
    const month = s.anos[ano] && s.anos[ano][mes];
    if (!month) return false;

    if (tipo === 'fixo') {
      month.fixos = (month.fixos || []).filter(it => it.id !== id && it.nome !== id);
    } else if (tipo === 'receita') {
      month.receitas = (month.receitas || []).filter(it => it.id !== id && it.nome !== id);
    } else {
      month.outros = (month.outros || []).filter(it => it.id !== id && it.nome !== id);
    }
    saveState(s);
    return true;
  }

  function togglePaidByIndex(ano, mes, tipo, index) {
    const s = getState();
    const month = s.anos[ano] && s.anos[ano][mes];
    if (!month) return false;
    const list = getListByTipo(month, tipo);
    if (!list || !list[index]) return false;
    list[index].pago = !list[index].pago;
    saveState(s);
    return list[index].pago;
  }

  function removeTransactionByIndex(ano, mes, tipo, index) {
    const s = getState();
    const month = s.anos[ano] && s.anos[ano][mes];
    if (!month) return false;
    const list = getListByTipo(month, tipo);
    if (!list || index < 0 || index >= list.length) return false;
    list.splice(index, 1);
    saveState(s);
    return true;
  }

  function updateTransactionByIndex(ano, mes, tipo, index, updates) {
    const s = getState();
    const month = s.anos[ano] && s.anos[ano][mes];
    if (!month) return false;
    const list = getListByTipo(month, tipo);
    if (!list || !list[index]) return false;
    Object.assign(list[index], updates);
    saveState(s);
    return true;
  }

  function getAllYears() {
    const s = getState();
    const yearsSet = new Set(['2026', '2027']);
    if (s.anos) {
      Object.keys(s.anos).forEach(y => {
        if (parseInt(y, 10) >= 2026) yearsSet.add(String(y));
      });
    }
    return Array.from(yearsSet).filter(y => parseInt(y, 10) >= 2026).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }

  function createYear(targetYear, cloneFromYear = null) {
    if (parseInt(targetYear, 10) < 2026) return;
    const s = getState();
    if (!s.anos) s.anos = {};
    const ty = String(targetYear);
    
    if (!s.anos[ty]) {
      s.anos[ty] = {};
    }

    const sourceYearData = cloneFromYear && s.anos[String(cloneFromYear)];

    MONTH_NAMES.forEach(mes => {
      if (!s.anos[ty][mes]) {
        if (sourceYearData && sourceYearData[mes]) {
          const src = sourceYearData[mes];
          s.anos[ty][mes] = {
            fixos: (src.fixos || []).map(f => ({ ...f, id: 'fix_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4), pago: false })),
            outros: (src.outros || []).map(o => ({ ...o, id: 'out_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4), pago: false })),
            receitas: (src.receitas || []).map(r => ({ ...r, id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4), pago: false })),
            diarios: [],
            totais: { ...(src.totais || {}) }
          };
        } else {
          // Inicialização limpa padrão para meses futuros
          s.anos[ty][mes] = {
            fixos: [],
            outros: [],
            diarios: [],
            receitas: [
              { id: 'rec_sal_' + mes, nome: 'Salário Líquido USP (Banco do Brasil)', valor: 5788.19, categoria: 'Salário / Proventos', pago: false },
              { id: 'rec_vr_' + mes, nome: 'Vale Refeição (VR)', valor: 1105.00, categoria: 'Benefícios', pago: false },
              { id: 'rec_va_' + mes, nome: 'Vale Alimentação (VA - Maracaju 88)', valor: 2050.00, categoria: 'Benefícios', pago: false }
            ],
            totais: {}
          };
        }
      }
    });

    saveState(s);
    return s.anos[ty];
  }

  function exportBackupJSON() {
    return JSON.stringify(getState(), null, 2);
  }

  function importBackupJSON(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || !parsed.anos) {
        throw new Error('Formato de backup inválido: falta a estrutura principal.');
      }
      saveState(parsed);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  function resetToDefault() {
    if (typeof MATRIX_SEED_DATA !== 'undefined') {
      const clone = JSON.parse(JSON.stringify(MATRIX_SEED_DATA));
      saveState(clone);
      return clone;
    }
    return null;
  }

  // Inicializar na carga
  init();


  // ==========================================
  // MEMÓRIA E APRENDIZADO DE CATEGORIAS
  // ==========================================
  const CATEGORY_MEMORY_KEY = 'matrix_category_memory';

  function normalizeCategoryKey(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim();
  }

  function getCategoryMemory() {
    let map = {};
    try {
      const raw = localStorage.getItem(CATEGORY_MEMORY_KEY);
      if (raw) map = JSON.parse(raw);
    } catch (e) {}

    // Se estiver vazio, faz bootstrap automático a partir dos lançamentos existentes
    if (!map || Object.keys(map).length === 0) {
      map = bootstrapCategoryMemory();
    }
    return map;
  }

  function bootstrapCategoryMemory() {
    const map = {};
    const s = getState();
    if (!s || !s.anos) return map;

    for (const ano in s.anos) {
      for (const mes in s.anos[ano]) {
        const m = s.anos[ano][mes];
        if (!m) continue;
        ['fixos', 'outros', 'diarios', 'receitas'].forEach(tipo => {
          if (Array.isArray(m[tipo])) {
            m[tipo].forEach(item => {
              if (item && item.nome && item.categoria && !isSummaryOrTotalItem(item.nome)) {
                const clean = normalizeCategoryKey(item.nome);
                if (clean && clean.length >= 3 && !map[clean]) {
                  map[clean] = item.categoria;
                }
              }
            });
          }
        });
      }
    }

    try {
      localStorage.setItem(CATEGORY_MEMORY_KEY, JSON.stringify(map));
    } catch (e) {}
    return map;
  }

  function learnCategoryMapping(nome, categoria) {
    if (!nome || !categoria) return;
    const clean = normalizeCategoryKey(nome);
    if (!clean || clean.length < 2) return;

    const map = getCategoryMemory();
    map[clean] = categoria;

    // Também indexa palavras-chave significativas (ex: "Savegnago", "Shell", "Unimed")
    const words = clean.split(/\s+/).filter(w => w.length >= 4 && !['para', 'pago', 'conta', 'compras', 'gasto', 'valor'].includes(w));
    words.forEach(w => {
      map[w] = categoria;
    });

    try {
      localStorage.setItem(CATEGORY_MEMORY_KEY, JSON.stringify(map));
      const s = getState();
      if (!s.categoryMemory) s.categoryMemory = {};
      s.categoryMemory[clean] = categoria;
    } catch (e) {}
  }

  function predictCategory(nome) {
    if (!nome) return null;
    const clean = normalizeCategoryKey(nome);
    if (!clean || clean.length < 2) return null;

    const map = getCategoryMemory();

    // 1. Correspondência Exata
    if (map[clean]) return map[clean];

    // 2. Correspondência por palavras-chave
    const words = clean.split(/\s+/).filter(w => w.length >= 3);
    for (const w of words) {
      if (map[w]) return map[w];
    }

    // 3. Correspondência por substring
    for (const key in map) {
      if (key.length >= 4 && (clean.includes(key) || key.includes(clean))) {
        return map[key];
      }
    }

    return null;
  }


  const CUSTOM_QUICK_BUTTONS_KEY = 'matrix_custom_quick_buttons';
  const DEFAULT_QUICK_BUTTONS = [
    { id: 'btn_carona', nome: 'Carona USP', valor: 30, categoria: 'Transporte', conta: 'pix_inter', icone: '🚗' },
    { id: 'btn_megasena', nome: 'Mega Sena', valor: 5, categoria: 'Lazer', conta: 'debito_inter', icone: '🍀' }
  ];

  function getCustomQuickButtons() {
    try {
      const raw = localStorage.getItem(CUSTOM_QUICK_BUTTONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return JSON.parse(JSON.stringify(DEFAULT_QUICK_BUTTONS));
  }

  function saveCustomQuickButtons(buttons) {
    try {
      localStorage.setItem(CUSTOM_QUICK_BUTTONS_KEY, JSON.stringify(buttons));
      const s = getState();
      if (s) s.customQuickButtons = buttons;
    } catch (_) {}
    return buttons;
  }

  return {
    init,
    getState,
    saveState,
    getCategoryMemory,
    learnCategoryMapping,
    predictCategory,
    getMonth,
    saveMonth,
    addTransaction,
    updateTransaction,
    updateTransactionByIndex,
    removeTransaction,
    removeTransactionByIndex,
    togglePaidByIndex,
    ensureMonthReceitas,
    isBeneficioNaoPecunia,
    getAllYears,
    createYear,
    exportBackupJSON,
    importBackupJSON,
    resetToDefault,
    getCustomQuickButtons,
    saveCustomQuickButtons,
    DEFAULT_QUICK_BUTTONS
  };
})();

if (typeof window !== 'undefined') {
  window.MatrixDB = MatrixDB;
}
