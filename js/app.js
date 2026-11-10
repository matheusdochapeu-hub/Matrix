/**
 * MATRIX FINANCE - MAIN APPLICATION CONTROLLER
 * Coordenação de fluxo de caixa, projeções "E se?", holerites, calendário de caronas,
 * amortizações da Caixa, investimentos e interface Matrix clean.
 */

const MatrixApp = (function () {
  let currentYear = '2026';
  let currentMonth = 'Novembro';
  let calSelectedYear = '2026';
  let calSelectedMonth = 'Novembro';
  let lastSimulationResult = null;
  let customAmortItens = [];
  let currentInvestFilter = 'todos';
  let investAgrupado = false;
  let investExpandedGroups = {};

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  function formatBRL(val) {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Atualização suave e discreta de texto em elementos de valor (KPIs e cards)
  function smoothSetText(elOrId, newText, newColor = null) {
    const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
    if (!el) return;
    const current = el.textContent ? el.textContent.trim() : '';
    const target = newText != null ? String(newText).trim() : '';

    if (newColor) el.style.color = newColor;

    if (current === target) return;

    if (!current || !el.classList.contains('smooth-val')) {
      el.classList.add('smooth-val');
      el.textContent = target;
      return;
    }

    el.classList.add('smooth-val-out');
    setTimeout(() => {
      el.textContent = target;
      if (newColor) el.style.color = newColor;
      el.classList.remove('smooth-val-out');
      el.classList.add('smooth-val-in');
      setTimeout(() => {
        el.classList.remove('smooth-val-in');
      }, 360);
    }, 60);
  }

  // ==========================================
  // UTILITÁRIOS DE DATAS NO FORMATO BRASILEIRO
  // ==========================================
  function formatMesAnoBR(str) {
    if (!str) return '';
    const clean = String(str).trim();
    if (clean.includes('/')) return clean;
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length >= 2) {
        const yyyy = parts[0];
        const mm = String(parts[1]).padStart(2, '0');
        return `${mm}/${yyyy}`;
      }
    }
    return clean;
  }

  function parseMesAnoBR(str) {
    if (!str) return '';
    const clean = String(str).trim();
    if (clean.includes('/')) {
      const parts = clean.split('/');
      let mm = String(parts[0]).padStart(2, '0');
      let yyyy = parts[1];
      if (yyyy.length === 2) yyyy = '20' + yyyy;
      return `${yyyy}-${mm}`;
    }
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length >= 2) {
        let yyyy = parts[0];
        let mm = String(parts[1]).padStart(2, '0');
        return `${yyyy}-${mm}`;
      }
    }
    return clean;
  }

  function maskMesAno(el) {
    if (!el) return;
    let v = el.value.replace(/\D/g, '');
    if (v.length > 6) v = v.slice(0, 6);
    if (v.length > 2) {
      el.value = v.slice(0, 2) + '/' + v.slice(2);
    } else {
      el.value = v;
    }
  }

  function formatDataBR(str) {
    if (!str) return '';
    const clean = String(str).trim();
    if (clean.includes('T')) {
      const parts = clean.split('T');
      const dataP = parts[0] ? parts[0].split('-').reverse().join('/') : '';
      const horaP = parts[1] ? parts[1].slice(0, 5) : '';
      return `${dataP} ${horaP}`.trim();
    }
    if (clean.includes('-')) {
      return clean.split('-').reverse().join('/');
    }
    return clean;
  }

  function formatarPrazoExtenso(meses) {
    if (typeof AmortizationEngine !== 'undefined' && AmortizationEngine.formatarPrazoExtenso) {
      return AmortizationEngine.formatarPrazoExtenso(meses);
    }
    const mTotal = parseInt(meses, 10);
    if (isNaN(mTotal) || mTotal <= 0) return 'Quitado';
    const anos = Math.floor(mTotal / 12);
    const m = mTotal % 12;
    const pStr = mTotal === 1 ? '1 parcela' : `${mTotal} parcelas`;
    if (anos > 0 && m > 0) {
      const anoStr = anos === 1 ? 'ano' : 'anos';
      const mesStr = m === 1 ? 'mês' : 'meses';
      return `${anos} ${anoStr} e ${m} ${mesStr} (${pStr})`;
    }
    if (anos > 0) {
      const anoStr = anos === 1 ? 'ano' : 'anos';
      return `${anos} ${anoStr} (${pStr})`;
    }
    const mesStr = mTotal === 1 ? 'mês' : 'meses';
    return `${mTotal} ${mesStr} (${pStr})`;
  }

  function formatarTempoPoupado(meses) {
    if (typeof AmortizationEngine !== 'undefined' && AmortizationEngine.formatarTempoPoupado) {
      return AmortizationEngine.formatarTempoPoupado(meses);
    }
    const mTotal = parseInt(meses, 10);
    if (isNaN(mTotal) || mTotal <= 0) return '0 meses';
    const anos = Math.floor(mTotal / 12);
    const m = mTotal % 12;
    const pStr = mTotal === 1 ? '1 parcela' : `${mTotal} parcelas`;
    if (anos > 0 && m > 0) {
      const anoStr = anos === 1 ? 'ano' : 'anos';
      const mesStr = m === 1 ? 'mês' : 'meses';
      return `${anos} ${anoStr} e ${m} ${mesStr} a menos (${pStr})`;
    }
    if (anos > 0) {
      const anoStr = anos === 1 ? 'ano' : 'anos';
      return `${anos} ${anoStr} a menos (${pStr})`;
    }
    const mesStr = mTotal === 1 ? 'mês' : 'meses';
    return `${mTotal} ${mesStr} a menos (${pStr})`;
  }

  // Regra Fundamental de Pecúnia: VA e VR são vales de alimentação, NÃO entram na conta de dinheiro em conta
  function isBeneficioNaoPecunia(itemOuNome) {
    if (typeof MatrixDB !== 'undefined' && typeof MatrixDB.isBeneficioNaoPecunia === 'function') {
      return MatrixDB.isBeneficioNaoPecunia(itemOuNome);
    }
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

  function isItemVR(it) {
    if (!it) return false;
    if (it.conta === 'cartao_vr' || it.renda === 'vr_almoco' || it.id === 'rec_vr_Novembro_2026') return true;
    const n = (it.nome || '').toLowerCase();
    if (/\bvr\b/.test(n) || n.includes('(vr)') || n.includes('refeição') || n.includes('refeicao')) return true;
    return false;
  }

  function isItemVA(it) {
    if (!it) return false;
    if (it.conta === 'cartao_va' || it.renda === 'va_mercado' || it.id === 'rec_va_Novembro_2026') return true;
    const n = (it.nome || '').toLowerCase();
    if (/\bva\b/.test(n) || n.includes('(va') || n.includes('alimentação') || n.includes('alimentacao') || n.includes('maracaju')) {
      if (!isItemVR(it)) return true;
    }
    return false;
  }

  function init() {
    // Garantir que 2026-10-28 (Dia do Servidor) é reconhecido como trabalho presencial normal
    try {
      const state = MatrixDB.getState();
      // Sanitização estrita: eliminar qualquer resíduo legado de 1500 na Scarlet de 2027 em diante
      if (state && state.anos) {
        Object.keys(state.anos).forEach(yr => {
          if (parseInt(yr, 10) >= 2027) {
            const months = state.anos[yr];
            if (months) {
              Object.keys(months).forEach(mn => {
                const mData = months[mn];
                if (mData && mData.scarlet) {
                  if (mData.scarlet.ganhos === 1500) mData.scarlet.ganhos = 0;
                  if (mData.scarlet.ganhosManual === 1500) mData.scarlet.ganhosManual = 0;
                }
              });
            }
          }
        });
      }
      if (!state.calendarioCustom) state.calendarioCustom = { overrides: {}, folgas: [] };
      if (!state.calendarioCustom.overrides) state.calendarioCustom.overrides = {};
      if (!state.calendarioCustom.overrides['2026-10-28']) {
        state.calendarioCustom.overrides['2026-10-28'] = {
          tipo: 'presencial',
          motivo: 'Trabalho Presencial (Dia do Servidor trabalhado)'
        };
        const commute = CalendarEngine.calculateCommuteAndVR(2026, 10, state.calendarioCustom);
        const octData = MatrixDB.getMonth('2026', 'Outubro');
        if (octData) {
          if (!octData.fixos) octData.fixos = [];
          let caronaItem = octData.fixos.find(f => f.nome && f.nome.toLowerCase().includes('carona'));
          if (caronaItem) caronaItem.valor = commute.totalCaronas;
          MatrixDB.saveMonth('2026', 'Outubro', octData, { skipCloudSync: true, reason: 'init_calibration' });
        }
        MatrixDB.saveState(state, 'init_calibration', { skipCloudSync: true });
      }
    } catch (e) {
      console.warn('Erro ao inicializar override do calendário:', e);
    }

    try {
      const state = MatrixDB.getState();
      if (!state.satellites) state.satellites = {};
      const maracajuNaoInicializado = !state.satellites.maracaju ||
        !state.satellites.maracaju.cicloVigente ||
        state.satellites.maracaju.cicloVigente !== '2026-11';
      if (maracajuNaoInicializado) {
        state.satellites.maracaju = {
          origem: 'Maracaju 88',
          atualizadoEm: new Date().toISOString(),
          cicloVigente: '2026-11',
          creditDate: '2026-11-06',
          vaMensal: 2050.00,
          vaRollover: 9.84,
          vaTotal: 2059.84,
          gastoMercadoMesAtual: 71.06,
          saldoVaRestante: 1988.78,
          transbordouVa: 0,
          vrCreditadoNoMes: 1105.00,
          vrRollover: 0.16,
          vrTotal: 1105.16,
          vrDays: 17,
          gastoVrMesAtual: 299.75,
          saldoVrRestante: 805.41,
          transbordouVr: 0,
          totalBeneficios: 3165.00,
          totalDisponivel: 2794.19,
          gastoMercadoCicloAnterior: 390.41,
          gastoVrCicloAnterior: 0.00,
          comprasCicloAtual: [
            { id: 'nfe_1794097840696_r3nk', date: '2026-11-07', establishment: 'Padaria e Mercearia Irmãos Araújo', total: 71.06, paymentMethod: 'va', itemsCount: 4 },
            { id: 'nfe_1794071702244_8wc4', date: '2026-11-07', establishment: 'Padock Bar', total: 102.3, paymentMethod: 'vr', itemsCount: 0 },
            { id: 'nfe_1794011419923_j6m6', date: '2026-11-06', establishment: 'Burgoo', total: 197.45, paymentMethod: 'vr', itemsCount: 0 }
          ],
          comprasCicloAnterior: [],
          reformasAndamento: 0,
          manutencoesCarro: 0
        };
        MatrixDB.saveState(state, 'init_calibration', { skipCloudSync: true });
      }
      if (typeof SatelliteConnectors !== 'undefined' && typeof SatelliteConnectors.syncMaracajuFromLocal === 'function') {
        SatelliteConnectors.syncMaracajuFromLocal(state);
      }

      const novData = MatrixDB.getMonth('2026', 'Novembro');
      if (novData) {
        let changedNov = false;
        if (!novData.totais) novData.totais = {};
        if (novData.vrManual == null && novData.totais['VR'] !== 1105.00) {
          novData.totais['VR'] = 1105.00;
          changedNov = true;
        }
        if (novData.vaManual == null && novData.totais['VA'] !== 2050.00) {
          novData.totais['VA'] = 2050.00;
          changedNov = true;
        }
        if (novData.receitas) {
          let rVr = novData.receitas.find(r => isItemVR(r));
          if (rVr && novData.vrManual == null && rVr.valor !== 1105.00) {
            rVr.valor = 1105.00;
            rVr.naoPecunia = true;
            rVr.categoria = 'Benefício (Não Pecúnia)';
            rVr.conta = 'cartao_vr';
            rVr.renda = 'vr_almoco';
            changedNov = true;
          }
          let rVa = novData.receitas.find(r => isItemVA(r));
          if (rVa && novData.vaManual == null && rVa.valor !== 2050.00) {
            rVa.valor = 2050.00;
            rVa.naoPecunia = true;
            rVa.categoria = 'Benefício (Não Pecúnia)';
            rVa.conta = 'cartao_va';
            rVa.renda = 'va_mercado';
            changedNov = true;
          }
        }
        if (changedNov) MatrixDB.saveMonth('2026', 'Novembro', novData, { skipCloudSync: true, reason: 'init_calibration' });
      }
    } catch (e) {
      console.warn('Erro ao calibrar VA/VR de Novembro:', e);
    }

    try {
      ['Outubro', 'Novembro', 'Dezembro'].forEach(m => syncCaronasWithCalendar('2026', m));
    } catch (e) {
      console.warn('Erro ao sincronizar caronas no init:', e);
    }

    try {
      const state = MatrixDB.getState();
      if (state && state.anos) {
        let changedLegacy = false;
        Object.keys(state.anos).forEach(ano => {
          Object.keys(state.anos[ano]).forEach(mes => {
            const mData = state.anos[ano][mes];
            ['fixos', 'outros', 'diarios'].forEach(col => {
              (mData[col] || []).forEach(it => {
                const n = (it.nome || '').toLowerCase().trim();
                // Regra estrita: MEI é pago pelo salário do Matheus (despesa fixa do Matheus/Casa)
                if (n === 'mei' || n.startsWith('mei ') || n.includes('das mei')) {
                  if (it.titular !== 'matheus' || it.conta !== 'salario_bb' || it.renda !== 'salario_usp' || it.categoria === 'Fisio Scarlet') {
                    it.titular = 'matheus';
                    it.conta = 'salario_bb';
                    it.renda = 'salario_usp';
                    if (it.categoria === 'Fisio Scarlet') it.categoria = 'Contas';
                    changedLegacy = true;
                  }
                }
                if (it.renda === 'orcamento_geral' || it.renda === 'estudio_extra') {
                  it.renda = isGastoDaScarlet(it) ? 'ganhos_scarlet' : 'salario_usp';
                  changedLegacy = true;
                }
              });
            });

            // Restauração de integridade de VA e VR contra contaminação
            // Regra estrita: de Janeiro/2027 em diante, sem invenção de rendas da Scarlet
            if (parseInt(ano, 10) >= 2027) {
              if (mData.scarlet && mData.scarlet.ganhosManual == null && mData.scarlet.ganhos !== 0) {
                mData.scarlet.ganhos = 0;
                changedLegacy = true;
              }
              if (mData.receitas) {
                const initLen = mData.receitas.length;
                mData.receitas = mData.receitas.filter(r => {
                  const n = (r.nome || '').toLowerCase();
                  return !(n.includes('scarlet') || n.includes('fisio')) || !!r.manual;
                });
                if (mData.receitas.length !== initLen) changedLegacy = true;
              }
            }

            if (mData.receitas) {
              mData.receitas.forEach(r => {
                if (isItemVR(r)) {
                  r.naoPecunia = true;
                  r.categoria = 'Benefício (Não Pecúnia)';
                  r.conta = 'cartao_vr';
                  r.renda = 'vr_almoco';
                  if (r.valor === 2059.84 || r.valor === '2059.84' || r.valor === 1105.16 || r.valor === '1105.16') {
                    r.valor = 1105.00;
                    changedLegacy = true;
                  }
                } else if (isItemVA(r)) {
                  r.naoPecunia = true;
                  r.categoria = 'Benefício (Não Pecúnia)';
                  r.conta = 'cartao_va';
                  r.renda = 'va_mercado';
                  if (r.valor === 2059.84 || r.valor === '2059.84' || r.valor == null) {
                    r.valor = 2050.00;
                    changedLegacy = true;
                  }
                }
              });
            }
          });
        });
        if (changedLegacy) {
          MatrixDB.saveState(state, 'migrate_orcamento_geral', { skipCloudSync: true });
        }
      }
    } catch (e) {
      console.warn('Erro ao higienizar orcamento_geral e VR:', e);
    }
            // Auto-upgrade do valor legado da Fatura Nubank de Novembro/2026
    try {
      const curState = MatrixDB.getState();
      if (curState && curState.anos) {
        let changed = false;
        Object.keys(curState.anos).forEach(y => {
          Object.keys(curState.anos[y] || {}).forEach(m => {
            const md = curState.anos[y][m];
            if (md && md.scarlet) {
              if (md.scarlet.faturaNubankManual != null && Math.abs(parseFloat(md.scarlet.faturaNubankManual) - 4568.57) < 0.01) {
                delete md.scarlet.faturaNubankManual;
                changed = true;
              }
              if (y === '2026' && m === 'Novembro' && (md.scarlet.faturaNubank === 4568.57 || !md.scarlet.faturaNubank)) {
                md.scarlet.faturaNubank = 4883.05;
                changed = true;
              }
            }
          });
        });
        if (!curState.satellites) curState.satellites = {};
        if (!curState.satellites.faturas && typeof SatelliteConnectors !== 'undefined' && SatelliteConnectors.getBaselineFaturasData) {
          curState.satellites.faturas = SatelliteConnectors.getBaselineFaturasData();
          changed = true;
        } else if (curState.satellites.faturas) {
          if (curState.satellites.faturas.faturaAtualReal === 4568.57 || curState.satellites.faturas.faturaAtualReal === 1651.04) {
            curState.satellites.faturas.faturaAtualReal = 4883.05;
            curState.satellites.faturas.faturaAtualValor = 4883.05;
            changed = true;
          }
          if (curState.satellites.faturas.faturasPorMes && curState.satellites.faturas.faturasPorMes['2026-Novembro']) {
            if (curState.satellites.faturas.faturasPorMes['2026-Novembro'].total === 4568.57 || curState.satellites.faturas.faturasPorMes['2026-Novembro'].total === 1651.04) {
              curState.satellites.faturas.faturasPorMes['2026-Novembro'].total = 4883.05;
              changed = true;
            }
          }
        }
        if (changed) {
          MatrixDB.saveState(curState, 'upgrade_fatura_legada', { skipCloudSync: true });
        }
      }
    } catch (e) {}
    populateYearSelector();
    setupEventListeners();
    updateInstallButtonVisibility();
    updateMonthDisplay();
    renderAll();
    renderHoleritesHistorico();

    // Inicialização ultra-rápida (instantânea da memória/disco local)
    // As chamadas em nuvem rodam em segundo plano sem bloquear a interface
    setTimeout(() => {
      const cfg = SyncEngine.getConfig();
      const runSatScrape = () => {
        const satCfg = SatelliteConnectors.getSatelliteConfig();
        if (satCfg.autoScrapeOnOpen) {
          executarScrapingSatellites(true);
        }
      };

      if (cfg.cloudUrl) {
        SyncEngine.fetchFromCloud().then(res => {
          if (res.success && res.data) {
            if (typeof SatelliteConnectors !== 'undefined' && typeof SatelliteConnectors.syncMaracajuFromLocal === 'function') {
              SatelliteConnectors.syncMaracajuFromLocal();
            }
                        const cState = MatrixDB.getState();
            if (cState && cState.anos && cState.anos['2026'] && cState.anos['2026']['Novembro']) {
              const novD = cState.anos['2026']['Novembro'];
              if (novD.scarlet && novD.scarlet.faturaNubank === 4568.57 && !novD.scarlet.faturaNubankManual) {
                novD.scarlet.faturaNubank = 4883.05;
                MatrixDB.saveState(cState, 'cloud_restore_fatura_upgrade', { skipCloudSync: true });
              }
            }
            populateYearSelector();
            renderAll();
          } else if (res.success && !res.data) {
            // Planilha conectada porém vazia: grava o primeiro backup automaticamente
            SyncEngine.syncToCloud().then(() => {
              renderBackup();
            });
          }
        }).catch(() => {}).finally(() => {
          runSatScrape();
        });
      } else {
        SyncEngine.updateStatusUI('offline');
        runSatScrape();
      }
    }, 50);

    // Sincronização em tempo real ao alternar abas (Maracaju 88 <-> Matrix no mesmo navegador)
    let lastFocusScrape = 0;
    window.addEventListener('focus', () => {
      const now = Date.now();
      if (now - lastFocusScrape > 12000) {
        lastFocusScrape = now;
        if (typeof SatelliteConnectors !== 'undefined' && typeof SatelliteConnectors.scrapeAll === 'function') {
          SatelliteConnectors.scrapeAll().then(() => renderAll());
        }
      } else if (typeof SatelliteConnectors !== 'undefined' && typeof SatelliteConnectors.syncMaracajuFromLocal === 'function') {
        const updated = SatelliteConnectors.syncMaracajuFromLocal();
        if (updated) renderKPIs();
      }
    });
    window.addEventListener('storage', (e) => {
      if (e && (e.key === 'MARACAJU_STATE_v1' || e.key === 'MARACAJU88_STATE_v1' || e.key === 'pv4_extra' || e.key === 'pv4_over')) {
        if (typeof SatelliteConnectors !== 'undefined' && typeof SatelliteConnectors.syncMaracajuFromLocal === 'function') {
          SatelliteConnectors.syncMaracajuFromLocal();
        }
        renderAll();
      }
    });

    // Monitorar conectividade de rede em tempo real
    window.addEventListener('online', () => {
      SyncEngine.updateStatusUI('synced', 'Conexão restabelecida');
    });
    window.addEventListener('offline', () => {
      SyncEngine.updateStatusUI('offline', 'Sem conexão com a internet');
    });

    // PWA Install Prompt Listener
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPwaPrompt = e;
      window._matrixDeferredPrompt = e;
      if (!isAppDownloadedOrInstalled()) {
        const btn = document.getElementById('btnInstallApp');
        if (btn) btn.style.display = 'inline-flex';
      }
    });

    window.addEventListener('appinstalled', () => {
      try {
        localStorage.setItem('matrix_app_downloaded', 'true');
      } catch (e) {}
      deferredPwaPrompt = null;
      if (typeof window !== 'undefined') window._matrixDeferredPrompt = null;
      const btn = document.getElementById('btnInstallApp');
      if (btn) btn.style.display = 'none';
      console.log('App Matrix instalado/baixado com sucesso.');
    });
  }

  // ==========================================
  // PWA DOWNLOAD & INSTALAÇÃO DIRETA
  // ==========================================
  function isAppDownloadedOrInstalled() {
    try {
      if (localStorage.getItem('matrix_app_downloaded') === 'true') return true;
      if (typeof window !== 'undefined') {
        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
        if (window.navigator && window.navigator.standalone === true) return true;
        if (document.referrer && document.referrer.includes('android-app://')) return true;
      }
    } catch (e) {}
    return false;
  }

  function updateInstallButtonVisibility() {
    const btn = document.getElementById('btnInstallApp');
    if (!btn) return;
    if (isAppDownloadedOrInstalled()) {
      btn.style.display = 'none';
    }
  }
  let deferredPwaPrompt = (typeof window !== 'undefined' && window._matrixDeferredPrompt) ? window._matrixDeferredPrompt : null;
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPwaPrompt = e;
      window._matrixDeferredPrompt = e;
      if (!isAppDownloadedOrInstalled()) {
        const btn = document.getElementById('btnInstallApp');
        if (btn) btn.style.display = 'inline-flex';
      }
    });
  }

  async function baixarAppDireto() {
    const btn = document.getElementById('btnInstallApp');
    const originalHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = '<span class="matrix-btn-icon">⏳</span> <span>Baixando...</span>';
    }

    try {
      const REMOTE_BASE = 'https://matheusdochapeu-hub.github.io/Matrix/';
      const storageSnapshot = {};
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('matrix') || k.startsWith('maracaju') || k.startsWith('fisio') || k.startsWith('faturas'))) {
            storageSnapshot[k] = localStorage.getItem(k);
          }
        }
      } catch (e) {}

      const seedScript = `<script>\n(function(){\n  try {\n    var snap = ${JSON.stringify(storageSnapshot).replace(/<\/script/gi, '<\\/script')};\n    Object.keys(snap).forEach(function(k){\n      if (!localStorage.getItem(k) && snap[k]) localStorage.setItem(k, snap[k]);\n    });\n  } catch(e) {}\n})();\n</script>`;

      const scriptPaths = [
        'js/seed-data.js',
        'js/matrix-rain.js',
        'js/db.js',
        'js/calendar-engine.js',
        'js/amortization-engine.js',
        'js/scenario-simulator.js',
        'js/pdf-reader.js',
        'js/satellite-connectors.js',
        'js/sync-engine.js',
        'js/app.js'
      ];

      let finalHtml = '';
      try {
        const fetchText = async (url) => {
          const r = await fetch(url, { cache: 'no-cache' });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return await r.text();
        };
        const [rawHtml, rawCss, ...rawScripts] = await Promise.all([
          fetchText('index.html'),
          fetchText('css/matrix.css'),
          ...scriptPaths.map(sp => fetchText(sp))
        ]);

        let docHtml = rawHtml;
        if (!docHtml.includes('<base ')) {
          docHtml = docHtml.replace('<head>', `<head>\n  <base href="${REMOTE_BASE}">`);
        }
        docHtml = docHtml.replace(
          /<link\s+rel="stylesheet"\s+href="css\/matrix\.css[^"]*"\s*>/i,
          `<style>\n${rawCss}\n</style>`
        );
        docHtml = docHtml.replace('<!-- SCRIPTS -->', `${seedScript}\n  <!-- SCRIPTS EMBUTIDOS (STANDALONE OFFLINE) -->`);
        scriptPaths.forEach((sp, idx) => {
          const escapedPath = sp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = new RegExp(`<script\\s+src="${escapedPath}[^"]*"><\\/script>`, 'i');
          const safeJs = (rawScripts[idx] || '').replace(/<\/script/gi, '<\\/script');
          docHtml = docHtml.replace(re, () => `<script>\n${safeJs}\n</script>`);
        });
        finalHtml = docHtml;
      } catch (offlineErr) {
        const clone = document.documentElement.cloneNode(true);
        const head = clone.querySelector('head');
        if (head && !head.querySelector('base')) {
          const baseEl = document.createElement('base');
          baseEl.setAttribute('href', REMOTE_BASE);
          head.insertBefore(baseEl, head.firstChild);
        }
        finalHtml = '<!DOCTYPE html>\n<html lang="pt-BR">\n' + clone.innerHTML.replace('<!-- SCRIPTS -->', seedScript + '\n  <!-- SCRIPTS -->') + '\n</html>';
      }

      const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Matrix-Finance-360-App.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);

      try {
        localStorage.setItem('matrix_app_downloaded', 'true');
      } catch (e) {}

      if (btn) {
        btn.innerHTML = '<span class="matrix-btn-icon">✅</span> <span>App Baixado!</span>';
        setTimeout(() => {
          btn.style.display = 'none';
        }, 1500);
      }
    } catch (err) {
      console.error('Erro ao baixar app diretamente:', err);
      if (btn && originalHtml) btn.innerHTML = originalHtml;
    }
  }

  function installPWA() {
    const promptEvent = deferredPwaPrompt || (typeof window !== 'undefined' ? window._matrixDeferredPrompt : null);
    if (promptEvent) {
      promptEvent.prompt();
      promptEvent.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('Usuário aceitou a instalação do PWA Matrix');
          try {
            localStorage.setItem('matrix_app_downloaded', 'true');
          } catch (e) {}
          const btn = document.getElementById('btnInstallApp');
          if (btn) btn.style.display = 'none';
        }
        deferredPwaPrompt = null;
        if (typeof window !== 'undefined') window._matrixDeferredPrompt = null;
      }).catch(() => {});
      return;
    }

    // Dispara o download direto do aplicativo standalone imediatamente ao clicar
    baixarAppDireto();
  }

  // ==========================================
  // CUSTOMIZAÇÃO DO NOME DA RENDA EXTRA
  // ==========================================
  function getNomeEstudio() {
    const state = MatrixDB.getState();
    const configured = state.config && state.config.nomeEstudio;
    return (configured && configured !== 'Estúdio') ? configured : 'Renda Extra';
  }

  function salvarNomeEstudio(novoNome) {
    const state = MatrixDB.getState();
    if (!state.config) state.config = {};
    const n = (novoNome || '').trim() || 'Renda Extra';
    state.config.nomeEstudio = n;
    MatrixDB.saveState(state);
    renderAll();
  }

  function promptAlterarNomeEstudio() {
    const atual = getNomeEstudio();
    const resp = prompt('Defina o nome para sua fonte de renda extra (ex: Consultoria, Aulas, Bicos):', atual);
    if (resp !== null) {
      salvarNomeEstudio(resp);
    }
  }

  // ==========================================
  // SINCRONIZAÇÃO DE DADOS REAIS DOS APPS (FATURAS & FISIOFLOW)
  // Regra de Integridade Absoluta: Não inventar dados onde não houver!
  // ==========================================
  function getFaturaNubankMes(ano, mes) {
    const sAno = String(ano || '');
    const sMes = String(mes || '');
    const state = MatrixDB.getState();
    const monthKey = sAno + '-' + sMes;
    const monthData = MatrixDB.getMonth(sAno, sMes);

    // 1. Override manual explícito definido pelo usuário para este mês (ignora resíduo legado estático 4568.57)
    if (monthData.scarlet && monthData.scarlet.faturaNubankManual != null && monthData.scarlet.faturaNubankManual !== '') {
      const valManual = parseFloat(monthData.scarlet.faturaNubankManual);
      if (!isNaN(valManual) && Math.abs(valManual - 4568.57) > 0.01) {
        return valManual;
      }
    }

    // 2. Dados reais sincronizados dos Satélites (App Faturas / Google Sheets)
    const sat = (state.satellites && state.satellites.faturas) || (typeof SatelliteConnectors !== 'undefined' && SatelliteConnectors.getBaselineFaturasData ? SatelliteConnectors.getBaselineFaturasData() : null);
    if (sat && sat.faturasPorMes && sat.faturasPorMes[monthKey]) {
      const val = parseFloat(sat.faturasPorMes[monthKey].total || sat.faturasPorMes[monthKey].valorReal);
      if (!isNaN(val) && val > 0 && Math.abs(val - 4568.57) > 0.01) return val;
    }
    if (sat && sAno === '2026' && sMes === 'Novembro') {
      const valAtual = sat.faturaAtualReal || sat.faturaAtualValor;
      if (typeof valAtual === 'number' && valAtual > 0 && Math.abs(valAtual - 4568.57) > 0.01) return valAtual;
    }

    // 3. Se houver valor numérico gravado no mês (banco de dados ou edição manual)
    if (monthData.scarlet && typeof monthData.scarlet.faturaNubank === 'number' && monthData.scarlet.faturaNubank > 0) {
      if (Math.abs(monthData.scarlet.faturaNubank - 4568.57) > 0.01) {
        return monthData.scarlet.faturaNubank;
      }
    }

    // 4. Fallback histórico de meses conhecidos
    if (sAno === '2026') {
      if (sMes === 'Outubro') return 3418.03;
      if (sMes === 'Setembro') return 0;
      if (sMes === 'Novembro') return 4883.05;
      if (sMes === 'Dezembro') return 1568.05;
    } else if (sAno === '2027') {
      const stored2027 = monthData.scarlet && typeof monthData.scarlet.faturaNubank === 'number' ? monthData.scarlet.faturaNubank : 0;
      if (sMes === 'Janeiro' && !(stored2027 > 0)) return 1628.89;
    }

    // 5. Transferência explícita para Fatura Nubank da Scarlet nas despesas do mês
    const expScarlet = [...(monthData.fixos || []), ...(monthData.outros || [])].find(it => {
      const n = (it.nome || '').toLowerCase().trim();
      return n === 'scarlet' || n === 'nubank scarlet' || n.includes('fatura nubank');
    });
    if (expScarlet && parseFloat(expScarlet.valor) > 0) {
      return parseFloat(expScarlet.valor);
    }

    return 0;
  }

  // Benefícios Alimentação (VA & VR) - Créditos Contratuais do Mês:
  // Regra Estrita do Usuário:
  // 1. VA é FIXO em R$ 2.050,00 (benefício mensal USP).
  // 2. VR vem do calendário oficial do próprio app Matrix (CalendarEngine), calculando dias úteis civis do mês * R$ 65,00.
  // 3. O saldo restante para compras/refeições continua vindo do app Casa Maracaju e não é afetado por essa alteração.
  function getBeneficiosCreditoMes(ano, mes) {
    const sAno = String(ano || currentYear || '2026');
    const sMes = String(mes || currentMonth || 'Novembro');
    const monthData = MatrixDB.getMonth(sAno, sMes) || {};

    // 1. VA Fixo em 2050.00
    let va = 2050.00;
    if (monthData.vaManual != null && monthData.vaManual !== '') {
      const vMan = parseFloat(monthData.vaManual);
      if (!isNaN(vMan) && vMan > 0) va = vMan;
    }

    // 2. VR vindo do calendário do próprio app Matrix
    let vr = 1105.00;
    try {
      const mIdx = MONTH_NAMES.indexOf(sMes) + 1;
      const anoNum = parseInt(sAno, 10);
      if (anoNum > 0 && mIdx > 0 && typeof CalendarEngine !== 'undefined') {
        const state = MatrixDB.getState();
        const commute = CalendarEngine.calculateCommuteAndVR(anoNum, mIdx, state.calendarioCustom);
        if (commute && typeof commute.totalVR === 'number' && commute.totalVR > 0) {
          vr = commute.totalVR;
        }
      }
    } catch (e) {
      console.warn('Erro ao obter VR via CalendarEngine:', e);
    }
    if (monthData.totais && monthData.totais['VR'] != null) {
      const vTot = parseFloat(monthData.totais['VR']);
      if (!isNaN(vTot) && vTot > 0) vr = vTot;
    }
    if (monthData.vrManual != null && monthData.vrManual !== '') {
      const vMan = parseFloat(monthData.vrManual);
      if (!isNaN(vMan) && vMan > 0) vr = vMan;
    }

    return {
      va,
      vr,
      total: Math.round((va + vr) * 100) / 100
    };
  }

  // Salário líquido do Matheus no mês: holerite > receita "salário" do mês > valor padrão.
  // Fonte única para KPIs, cards mensais, modal de saldos e auditoria da sobra pessoal.
  function getSalarioLiquidoMes(ano, mes) {
    const state = MatrixDB.getState();
    const monthData = MatrixDB.getMonth(ano, mes);
    const hol = (state.holerites || []).find(h => (h.ano === ano && h.mesNome === mes) || h.periodo === `${ano}-${mes}`);
    if (hol && hol.liquido) return hol.liquido;
    const recSal = (monthData.receitas || []).find(r => (r.nome || '').toLowerCase().includes('salário') || (r.id && r.id.startsWith('rec_sal')));
    if (recSal) return parseFloat(recSal.valor) || 5788.19;
    return 5788.19;
  }

  // Transferência enviada pelo Matheus para a Scarlet (item "Scarlet" ou descrição "Transferência ... Scarlet").
  function isTransferenciaParaScarlet(it) {
    if (!it) return false;
    if (it.transferenciaScarlet === true) return true;
    const n = (it.nome || '').toLowerCase().trim();
    const desc = (it.descricao || '').toLowerCase();
    const obs = (it.obs || '').toLowerCase();
    const cat = (it.categoria || '').toLowerCase();

    if (cat.includes('transferência scarlet') || cat.includes('transferencia scarlet') || cat.includes('repasse scarlet')) return true;
    if (n === 'scarlet') return true;
    if (n.includes('transferência') && n.includes('scarlet')) return true;
    if (n.includes('transferencia') && n.includes('scarlet')) return true;
    if (n.includes('transf') && n.includes('scarlet')) return true;
    if (n.includes('pix') && n.includes('scarlet')) return true;
    if (n.includes('repasse') && n.includes('scarlet')) return true;
    if (desc.includes('transferência') && desc.includes('scarlet')) return true;
    if (desc.includes('transferencia') && desc.includes('scarlet')) return true;
    if (obs.includes('transferência') && obs.includes('scarlet')) return true;
    if (obs.includes('transferencia') && obs.includes('scarlet')) return true;
    if (obs.includes('transf') && obs.includes('scarlet')) return true;
    if (obs.includes('pix') && obs.includes('scarlet')) return true;
    return false;
  }

  // Despesas da própria Scarlet (Fatura Nubank, Psicóloga, Investimentos pessoais, etc.):
  // Pagas com a renda dela (FisioFlow/Extras) e nunca entram na sobra pessoal do Matheus.
  function isGastoDaScarlet(it) {
    if (!it) return false;
    const n = (it.nome || '').toLowerCase().trim();
    const tit = (it.titular || '').toLowerCase().trim();
    const ren = (it.renda || '').toLowerCase().trim();
    const cta = (it.conta || '').toLowerCase().trim();
    const cat = (it.categoria || '').toLowerCase().trim();

    // REGRA DE OURO: MEI é pago pelo salário do Matheus (gasto fixo da conta do Matheus)
    if (n === 'mei' || n.startsWith('mei ') || n.includes('das mei')) return false;

    // Se titular for Matheus explicitamente, não é gasto da Scarlet
    if (tit === 'matheus') return false;

    if (tit === 'scarlet') return true;
    if (n === 'nubank scarlet') return true;
    if (ren === 'ganhos_scarlet' || ren === 'outras_rendas_scarlet') return true;
    if (cta.includes('scarlet')) return true;
    if (cat === 'fisio scarlet' || cat === 'outras rendas scarlet' || cat === 'investimentos scarlet' || cat.includes('psicó')) return true;
    if (n.includes('psicologa') || n.includes('psicóloga')) return true;
    return false;
  }

    // Identifica se um item é parcela de empréstimo consignado em folha
  function isConsignadoFolhaItem(it) {
    if (!it) return false;
    if (it.consignadoFolha === true || it.tipoAmortizacao === 'consignado_folha') return true;
    const n = (it.nome || '').toLowerCase();
    const c = (it.categoria || '').toLowerCase();
    if (n.includes('consignado')) return true;
    if (c === 'empréstimo' && (it.conta === 'salario_bb' || it.renda === 'salario_usp')) return true;
    return false;
  }

  // Verifica se o consignado em folha já foi abatido no salário líquido do holerite oficial deste mês.
  // Evita DUPLICIDADE: se o holerite já está lançado, o salário em conta já veio menor,
  // portanto a parcela NÃO deve ser descontada uma segunda vez do caixa/sobra.
  function isConsignadoFolhaJaDescontado(it, ano, mes, state = null) {
    if (!isConsignadoFolhaItem(it)) return false;
    const s = state || MatrixDB.getState();
    const monthNum = String(MONTH_NAMES.indexOf(mes) + 1).padStart(2, '0');
    const periodoKey = `${ano}-${monthNum}`;
    const hol = (s.holerites || []).find(h => (String(h.ano) === String(ano) && h.mesNome === mes) || h.periodo === periodoKey || h.periodo === `${ano}-${mes}`);
    return !!(hol && hol.liquido);
  }

  // Identifica se um item é relacionado a Caronas USP (Previsão de transporte / Carona diária)
  function isCaronaItem(it) {
    if (!it) return false;
    const n = (it.nome || '').toLowerCase().trim();
    const c = (it.categoria || '').toLowerCase().trim();
    if (n.includes('carona') || n.includes('caronas')) return true;
    if (c.includes('transporte') && (n.includes('usp') || n.includes('são carlos') || n.includes('sao carlos'))) return true;
    return false;
  }

  // Motor da Opção 1: Provisão com Consumo Automático de Caronas
  // Calcula a previsão mensal nos fixos, o total já consumido via gastos diários,
  // e o saldo residual pendente da provisão, garantindo ZERO duplicidade no fluxo de caixa.
  function getCaronasProvisionSummary(yearStr, monthName, monthData = null) {
    if (!monthData) monthData = MatrixDB.getMonth(yearStr, monthName);
    if (!monthData) {
      return {
        provision: 0,
        consumed: 0,
        consumedPaid: 0,
        remaining: 0,
        isExceeded: false,
        dailyCount: 0,
        caronasDiarios: [],
        fixoIsPago: false,
        caronaFixo: null
      };
    }

    const fixos = monthData.fixos || [];
    const diarios = monthData.diarios || [];

    const caronaFixo = fixos.find(f => f && isCaronaItem(f));
    const provision = caronaFixo ? (parseFloat(caronaFixo.valor) || 0) : 0;
    const fixoIsPago = !!(caronaFixo && caronaFixo.pago);

    // Gastos diários de carona registrados neste mês
    const caronasDiarios = diarios.filter(d => d && isCaronaItem(d));
    const consumed = caronasDiarios.reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);
    const consumedPaid = caronasDiarios.filter(d => d.pago).reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);

    // Saldo restante pendente da provisão
    let remaining = 0;
    if (!fixoIsPago) {
      remaining = Math.max(0, provision - consumed);
    }

    return {
      caronaFixo,
      provision,
      fixoIsPago,
      consumed,
      consumedPaid,
      remaining,
      isExceeded: consumed > provision && provision > 0,
      dailyCount: caronasDiarios.length,
      caronasDiarios
    };
  }

  // Identifica qualquer receita pertencente à Scarlet (seja FisioFlow ou Outras Rendas/Renda Extra da Scarlet)
  function isReceitaDaScarlet(r) {
    if (!r || isBeneficioNaoPecunia(r)) return false;
    const n = (r.nome || '').toLowerCase().trim();
    const c = (r.categoria || '').toLowerCase().trim();
    const ren = (r.renda || '').toLowerCase().trim();
    const cta = (r.conta || '').toLowerCase().trim();
    const tit = (r.titular || '').toLowerCase().trim();
    const id = (r.id || '').toLowerCase().trim();

    if (tit === 'scarlet') return true;
    if (ren === 'ganhos_scarlet' || ren === 'outras_rendas_scarlet' || ren.includes('scarlet')) return true;
    if (cta === 'scarlet_fisio' || cta === 'scarlet_extra' || cta === 'scarlet' || cta === 'nubank_scarlet' || cta === 'credito_nubank_scarlet' || cta.includes('scarlet')) return true;
    if (c === 'outras rendas scarlet' || c === 'fisio scarlet' || c.includes('scarlet')) return true;
    if (id.startsWith('rec_scarlet') || id.startsWith('rec_fisio') || id === 'sat_fisioflow_view') return true;
    if (n.includes('scarlet') || n.includes('fisio')) return true;
    return false;
  }

  // Identifica se a receita da Scarlet é o lançamento base de atendimentos FisioFlow (para separar de Outras Rendas/Extras da Scarlet)
  function isReceitaFisioFlowBase(r) {
    if (!isReceitaDaScarlet(r)) return false;
    const n = (r.nome || '').toLowerCase().trim();
    const c = (r.categoria || '').toLowerCase().trim();
    const ren = (r.renda || '').toLowerCase().trim();
    const cta = (r.conta || '').toLowerCase().trim();
    const id = (r.id || '').toLowerCase().trim();

    if (id.startsWith('rec_scarlet_extra') || c === 'outras rendas scarlet' || ren === 'outras_rendas_scarlet' || cta === 'scarlet_extra') {
      return false;
    }
    if (id.startsWith('rec_fisio') || id === 'sat_fisioflow_view') return true;
    if (n.includes('fisioflow') || n === 'ganhos scarlet' || n === 'ganhos scarlet (fisio)' || n === 'atendimentos scarlet' || n === 'fisio scarlet') {
      return true;
    }
    return false;
  }

  // Identifica se a receita é uma Renda Extra / Outra Renda da Scarlet (ex: "Pgt sheila", consultoria, aulas, etc.)
  function isOutraRendaDaScarlet(r) {
    return isReceitaDaScarlet(r) && !isReceitaFisioFlowBase(r);
  }

  // Identifica se a receita é 13º Salário do Matheus
  function isReceita13Salario(r) {
    if (!r || isBeneficioNaoPecunia(r) || isReceitaDaScarlet(r)) return false;
    const n = (r.nome || '').toLowerCase().trim();
    return n.includes('13') || n.includes('décimo') || n.includes('decimo');
  }

  // Identifica se a receita é Salário base regular do Matheus
  function isReceitaSalarioMatheus(r) {
    if (!r || isBeneficioNaoPecunia(r) || isReceitaDaScarlet(r) || isReceita13Salario(r)) return false;
    const n = (r.nome || '').toLowerCase().trim();
    const id = (r.id || '').toLowerCase().trim();
    return id.startsWith('rec_sal') || n.includes('salário') || n.includes('salario');
  }

  // Identifica se a receita é Renda Extra / Outros Ganhos exclusivamente do Matheus (Estúdio, Empréstimo Matheus, etc.)
  function isReceitaExtraMatheus(r) {
    if (!r || isBeneficioNaoPecunia(r) || isReceitaDaScarlet(r) || isReceitaSalarioMatheus(r) || isReceita13Salario(r)) return false;
    return true;
  }

  // Sobra pessoal do Matheus = ganhos dele - gastos próprios - transferência para a Scarlet.
  // Usada pelo card do painel executivo e pela auditoria (drilldown), garantindo números idênticos.
  function calcSobraMatheus(ano, mes) {
    const monthData = MatrixDB.getMonth(ano, mes);
    const num = (v) => parseFloat(v) || 0;
    const receitas = monthData.receitas || [];

    // Ganhos pagos (realizados) do Matheus: Salário + 13º + Rendas Extras (exclui VA/VR e exclui 100% das rendas da Scarlet)
    const recSalList = receitas.filter(r => isReceitaSalarioMatheus(r));
    let salMatheusPago = 0;
    let salMatheusTotal = 0;
    if (recSalList.length > 0) {
      recSalList.forEach(r => {
        const v = num(r.valor);
        salMatheusTotal += v;
        if (r.pago === true) salMatheusPago += v;
      });
    } else {
      const v = getSalarioLiquidoMes(ano, mes);
      salMatheusTotal = v;
      salMatheusPago = v;
    }

    let val13Pago = 0;
    let val13Total = 0;
    receitas.filter(r => isReceita13Salario(r)).forEach(r => {
      const v = num(r.valor);
      val13Total += v;
      if (r.pago === true) val13Pago += v;
    });

    let outrosGanhosPago = 0;
    let outrosGanhosTotal = 0;
    receitas.filter(r => isReceitaExtraMatheus(r)).forEach(r => {
      const v = num(r.valor);
      outrosGanhosTotal += v;
      if (r.pago === true) outrosGanhosPago += v;
    });

    // Apenas rendas já recebidas (pago: true) entram nos ganhos em conta!
    const ganhos = salMatheusPago + val13Pago + outrosGanhosPago;
    const ganhosPrevistos = salMatheusTotal + val13Total + outrosGanhosTotal;

    const caronaSumm = getCaronasProvisionSummary(ano, mes, monthData);

    // Contas próprias pagas vs pendentes (exclui gastos da Scarlet e transferências para Scarlet)
    const somaPropriaPaga = (lista) => (lista || [])
      .filter(it => !isGastoDaScarlet(it) && !isTransferenciaParaScarlet(it) && !isConsignadoFolhaJaDescontado(it, ano, mes) && it.pago === true)
      .reduce((acc, it) => acc + num(it.valor), 0);

    const somaPropriaPendente = (lista) => (lista || [])
      .filter(it => !isGastoDaScarlet(it) && !isTransferenciaParaScarlet(it) && !isConsignadoFolhaJaDescontado(it, ano, mes) && it.pago !== true)
      .reduce((acc, it) => {
        if (isCaronaItem(it)) {
          // Opção 1: Provisão com Consumo Automático
          // Abate o que já foi consumido pelos lançamentos diários de carona
          return acc + caronaSumm.remaining;
        }
        return acc + num(it.valor);
      }, 0);

    const fixosPago = somaPropriaPaga(monthData.fixos);
    const fixosPendente = somaPropriaPendente(monthData.fixos);
    const fixosTotal = fixosPago + fixosPendente;

    const outrosPago = somaPropriaPaga(monthData.outros);
    const outrosPendente = somaPropriaPendente(monthData.outros);
    const outrosTotal = outrosPago + outrosPendente;

    const diarios = (monthData.diarios || [])
      .filter(d => {
        if (!d || d.jaAlocadoVariavel) return false;
        const tit = (d.titular || '').toLowerCase();
        const cta = (d.conta || '').toLowerCase();
        if (tit === 'scarlet' || cta === 'credito_nubank_scarlet') return false;
        if (cta === 'cartao_va' || cta === 'va' || cta === 'cartao_vr' || cta === 'vr') return false;
        if (isTransferenciaParaScarlet(d)) return false; // Deduzida separadamente como repasse para Scarlet
        return true;
      })
      .reduce((acc, d) => acc + num(d.valor), 0);
    const contasInicio = (mes === 'Janeiro' && monthData.totais && monthData.totais['Contas Inicio Ano'])
      ? num(monthData.totais['Contas Inicio Ano']) : 0;

    const transfItems = [
      ...(monthData.fixos || []),
      ...(monthData.outros || []),
      ...(monthData.diarios || []).filter(d => !d.jaAlocadoVariavel)
    ].filter(isTransferenciaParaScarlet);
    const transfTotal = transfItems.reduce((acc, it) => acc + num(it.valor), 0);
    const transfPaga = transfItems.filter(it => it.pago === true).reduce((acc, it) => acc + num(it.valor), 0);
    const transfPendente = transfItems.filter(it => it.pago !== true).reduce((acc, it) => acc + num(it.valor), 0);

    const gastosPropriosPago = fixosPago + outrosPago + diarios + contasInicio;
    const gastosPropriosPendente = fixosPendente + outrosPendente;
    const gastosPropriosTotal = fixosTotal + outrosTotal + diarios + contasInicio;

    const totalGastosPago = gastosPropriosPago + transfPaga;
    const totalGastosPendente = gastosPropriosPendente + transfPendente;
    const totalGastosPrevisto = gastosPropriosTotal + transfTotal;

    // Se uma conta própria ou a transferência para Scarlet ainda está pendente, ela NÃO foi debitada do banco:
    // Portanto, NÃO deduz do saldo realizado e SOBRA NA CONTA DO MATHEUS ("sobra na minha")!
    const sobra = ganhos - totalGastosPago;
    const sobraPrevista = ganhosPrevistos - totalGastosPrevisto;

    return {
      ganhos,
      ganhosPrevistos,
      salMatheusPago,
      salMatheusTotal,
      val13Pago,
      val13Total,
      outrosGanhosPago,
      outrosGanhosTotal,
      fixos: fixosTotal,
      fixosPago,
      fixosPendente,
      outros: outrosTotal,
      outrosPago,
      outrosPendente,
      diarios,
      contasInicio,
      gastosProprios: gastosPropriosTotal,
      gastosPropriosPago,
      gastosPropriosPendente,
      transf: transfTotal,
      transfPaga,
      transfPendente,
      totalGastos: totalGastosPrevisto,
      totalGastosPago,
      totalGastosPendente,
      sobra,
      sobraPrevista
    };
  }

  function getGanhosScarletMes(ano, mes) {
    const state = MatrixDB.getState();
    const monthData = MatrixDB.getMonth(ano, mes);
    const curMIdx = MONTH_NAMES.indexOf(mes);
    let prevMIdx = curMIdx - 1;
    let prevYear = parseInt(ano, 10);
    if (prevMIdx < 0) {
      prevMIdx = 11;
      prevYear -= 1;
    }
    const prevYm = `${prevYear}-${String(prevMIdx + 1).padStart(2, '0')}`;

    // 1. Override manual explícito no mês pelo usuário
    if (monthData.scarlet && monthData.scarlet.ganhosManual != null && monthData.scarlet.ganhosManual !== '') {
      const manual = parseFloat(monthData.scarlet.ganhosManual);
      if (!isNaN(manual) && manual > 0) return manual;
    }

    // 2. REGRA M+1 DO FISIOFLOW (Ciclo: faturado no mês M cai no caixa do mês M+1)
    // Outubro/2026 recebe o faturamento de Setembro/2026 (40 sessões) = R$ 3.700,00
    if (ano === '2026' && mes === 'Outubro') {
      return 3700.00;
    }

    // Novembro/2026 recebe o faturamento de Outubro/2026 (13 sessões: R$ 950 + R$ 190) = R$ 1.140,00
    if (ano === '2026' && mes === 'Novembro') {
      return 1140.00;
    }

    // Dezembro/2026 recebe o faturamento de Novembro/2026 (11 sessões) = R$ 995,00
    if (ano === '2026' && mes === 'Dezembro') {
      return 995.00;
    }

    // 3. Consulta ao satélite FisioFlow para competência M-1
    const satFisio = (state.satellites && state.satellites.fisioflow) ||
      (typeof SatelliteConnectors !== 'undefined' && SatelliteConnectors.getBaselineFisioData ? SatelliteConnectors.getBaselineFisioData() : null);

    if (satFisio && satFisio.ganhosPorMes && satFisio.ganhosPorMes[prevYm]) {
      const g = satFisio.ganhosPorMes[prevYm];
      const realFaturado = (parseFloat(g.realizado) || 0) + (parseFloat(g.aReceber) || 0);
      if (realFaturado > 0) return realFaturado;
    }

    // De Janeiro/2027 em diante: estritamente ZERO (0) se não houver faturamento real no app fonte
    return 0;
  }

  // Outras Rendas da Scarlet (além do atendimento fisioterapêutico, ex: "Pgt sheila", consultoria, etc.)
  function getOutrasRendasScarletMes(ano, mes) {
    const monthData = MatrixDB.getMonth(ano, mes);

    let total = 0;
    let foundInReceitas = false;

    // 1. Receitas lançadas como Outras Rendas / Renda Extra da Scarlet
    (monthData.receitas || []).forEach(r => {
      if (isOutraRendaDaScarlet(r)) {
        total += parseFloat(r.valor) || 0;
        foundInReceitas = true;
      }
    });

    if (foundInReceitas) return total;

    // 2. Se não estiver no array de receitas, verificar registro direto no objeto scarlet do mês
    if (monthData.scarlet) {
      if (monthData.scarlet.outrasRendasManual != null && monthData.scarlet.outrasRendasManual !== '') {
        const m = parseFloat(monthData.scarlet.outrasRendasManual);
        if (!isNaN(m)) return m;
      }
      if (typeof monthData.scarlet.outrasRendas === 'number') {
        return monthData.scarlet.outrasRendas;
      }
    }

    // Regra oficial para Novembro/2026: R$ 4.000,00 recebidos referentes a outros trabalhos prestados em Outubro
    if (ano === '2026' && mes === 'Novembro') {
      return 4000.00;
    }

    return 0;
  }

  function getDescOutrasRendasScarletMes(ano, mes) {
    const monthData = MatrixDB.getMonth(ano, mes);
    const recs = (monthData.receitas || []).filter(r => isOutraRendaDaScarlet(r) && (parseFloat(r.valor) || 0) > 0);
    if (recs.length > 0) {
      return recs.map(r => r.nome).join(' + ');
    }
    if (monthData.scarlet && monthData.scarlet.descOutrasRendas) {
      return monthData.scarlet.descOutrasRendas;
    }
    if (ano === '2026' && mes === 'Novembro') {
      return 'Receitas da irmã';
    }
    return 'Outras Rendas Scarlet';
  }

  function populateYearSelector() {
    const yearSelect = document.getElementById('yearSelect');
    if (!yearSelect) return;

    let allYears = MatrixDB.getAllYears().filter(y => parseInt(y, 10) >= 2026);
    if (parseInt(currentYear, 10) < 2026) {
      currentYear = '2026';
    }
    if (currentYear === '2026' && MONTH_NAMES.indexOf(currentMonth) < 9) {
      currentMonth = 'Outubro';
    }
    if (!allYears.includes(String(currentYear))) {
      allYears.push(String(currentYear));
      allYears.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    }

    yearSelect.innerHTML = allYears.map(y => {
      let label = y;
      if (y === '2026') label = '2026 (Vigente)';
      else if (y === '2027') label = '2027 (Projetado)';
      else label = `${y} (Projetado)`;
      return `<option value="${y}" ${String(y) === String(currentYear) ? 'selected' : ''}>${label}</option>`;
    }).join('');

    // Atualiza o select de holerites na aba correspondente
    const hlAnoSelect = document.getElementById('hlAno');
    if (hlAnoSelect) {
      hlAnoSelect.innerHTML = allYears.map(y => `<option value="${y}" ${String(y) === String(currentYear) ? 'selected' : ''}>${y}</option>`).join('');
    }
  }

  function promptAddNewYear() {
    const years = MatrixDB.getAllYears().map(y => parseInt(y, 10)).filter(y => y >= 2026);
    const nextYearSuggestion = String(Math.max(...years, 2027) + 1);
    const novoAno = prompt('Informe o ano que deseja planejar e projetar (ex: 2028, 2029):', nextYearSuggestion);
    if (!novoAno || isNaN(parseInt(novoAno, 10))) return;

    const anoInt = parseInt(novoAno, 10);
    if (anoInt < 2026) {
      alert('O aplicativo opera estritamente com dados a partir de Outubro de 2026.');
      return;
    }
    const anoStr = String(anoInt);
    const allYears = MatrixDB.getAllYears();

    if (!allYears.includes(anoStr)) {
      const clone = confirm(`Deseja clonar a base de gastos fixos, parcelas e receitas recorrentes de 2027 para iniciar ${anoStr} com tudo pronto?`);
      const baseYear = allYears[allYears.length - 1] || '2027';
      MatrixDB.createYear(anoStr, clone ? baseYear : null);
    }

    currentYear = anoStr;
    currentMonth = 'Janeiro';
    populateYearSelector();
    updateMonthDisplay();
    renderAll();
    alert(`Ano ${anoStr} aberto com sucesso! Você já pode adicionar, editar receitas e despesas livremente.`);
  }

  const TAB_ORDER = [
    'tab-fluxo',
    'tab-simulador',
    'tab-holerites',
    'tab-calendario',
    'tab-financiamento',
    'tab-investimentos',
    'tab-backup'
  ];

  let currentActiveTabId = 'tab-fluxo';

  function switchTab(targetId, direction = null) {
    if (!targetId || !TAB_ORDER.includes(targetId)) targetId = 'tab-fluxo';

    const oldIndex = TAB_ORDER.indexOf(currentActiveTabId);
    const newIndex = TAB_ORDER.indexOf(targetId);

    // Determina a direção do carrossel se não especificada
    let animDir = direction;
    if (!animDir && oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      animDir = newIndex > oldIndex ? 'next' : 'prev';
    }

    currentActiveTabId = targetId;

    // 1. Atualizar botões de navegação
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const btnTab = btn.getAttribute('data-tab');
      if (btnTab === targetId) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        try {
          btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        } catch (e) {}
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    // 2. Atualizar dots do indicador de swipe no celular
    const dots = document.querySelectorAll('.swipe-dot');
    dots.forEach((dot, idx) => {
      if (idx === newIndex) dot.classList.add('active');
      else dot.classList.remove('active');
    });

    // 3. Atualizar e animar os containers de conteúdo (Carousel Viewport)
    document.querySelectorAll('.tab-content').forEach(view => {
      view.style.transform = '';
      view.style.transition = '';
      view.classList.remove('swipe-in-right', 'swipe-in-left');

      if (view.id === targetId) {
        view.classList.add('active');
        if (animDir === 'next') {
          view.classList.add('swipe-in-right');
        } else if (animDir === 'prev') {
          view.classList.add('swipe-in-left');
        }
      } else {
        view.classList.remove('active');
      }
    });

    // 4. Re-render específico da aba quando acionada
    if (targetId === 'tab-simulador') renderSimulator();
    if (targetId === 'tab-holerites') renderHoleritesHistorico();
    if (targetId === 'tab-calendario') renderCalendar();
    if (targetId === 'tab-financiamento') renderFinancing();
    if (targetId === 'tab-investimentos') renderInvestments();
    if (targetId === 'tab-backup') renderBackup();
  }

  function initSwipeNavigation() {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let startTime = 0;
    let isTracking = false;
    let isHorizontalDrag = false;
    let activeViewEl = null;

    function getActiveView() {
      return document.getElementById(currentActiveTabId);
    }

    document.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length !== 1) return;

      // Não acionar carrossel se algum modal estiver aberto
      const openModal = document.querySelector('.matrix-modal-backdrop.open');
      if (openModal) return;

      // Não acionar se o toque começou dentro de elementos com scroll horizontal próprio, formulários ou botões
      const target = e.target;
      if (target && target.closest && target.closest('input, textarea, select, button, .monthly-horizon-grid, .data-table, .matrix-tabs, #calDaysScroll, table, .table-scroll-wrapper, .modal')) {
        return;
      }

      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      currentX = startX;
      startTime = Date.now();
      isTracking = true;
      isHorizontalDrag = false;
      activeViewEl = getActiveView();
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!isTracking || !e.touches || e.touches.length !== 1 || !activeViewEl) return;
      currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      // Determina se o gesto é predominantemente horizontal
      if (!isHorizontalDrag) {
        if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
          isHorizontalDrag = true;
        } else if (Math.abs(deltaY) > 10) {
          // Scroll vertical natural: aborta rastreamento para rolagem limpa
          isTracking = false;
          return;
        }
      }

      if (isHorizontalDrag) {
        // Resistência elástica nas extremidades (primeira e última abas)
        const idx = TAB_ORDER.indexOf(currentActiveTabId);
        let factor = 1;
        if ((idx === 0 && deltaX > 0) || (idx === TAB_ORDER.length - 1 && deltaX < 0)) {
          factor = 0.25;
        }
        activeViewEl.style.transition = 'none';
        activeViewEl.style.transform = `translate3d(${deltaX * factor}px, 0, 0)`;
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!isTracking) return;
      isTracking = false;

      const endX = e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientX : currentX;
      const deltaX = endX - startX;
      const duration = Date.now() - startTime;
      const targetView = activeViewEl;
      activeViewEl = null;

      if (isHorizontalDrag && targetView) {
        const isSwipeAction = (Math.abs(deltaX) >= 45 && duration <= 500) || (Math.abs(deltaX) >= 30 && duration <= 250);
        let idx = TAB_ORDER.indexOf(currentActiveTabId);
        if (idx === -1) idx = 0;

        if (isSwipeAction && deltaX < 0 && idx < TAB_ORDER.length - 1) {
          // Desliza para a esquerda -> Próxima aba (next)
          targetView.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
          targetView.style.transform = 'translate3d(-40px, 0, 0)';
          targetView.style.opacity = '0';
          setTimeout(() => {
            switchTab(TAB_ORDER[idx + 1], 'next');
          }, 110);
          return;
        } else if (isSwipeAction && deltaX > 0 && idx > 0) {
          // Desliza para a direita -> Aba anterior (prev)
          targetView.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
          targetView.style.transform = 'translate3d(40px, 0, 0)';
          targetView.style.opacity = '0';
          setTimeout(() => {
            switchTab(TAB_ORDER[idx - 1], 'prev');
          }, 110);
          return;
        }

        // Retorno suave elástico caso não atinja o limiar
        targetView.style.transition = 'transform 0.22s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.22s ease';
        targetView.style.transform = 'translate3d(0, 0, 0)';
        targetView.style.opacity = '1';
        setTimeout(() => {
          if (targetView) {
            targetView.style.transform = '';
            targetView.style.transition = '';
          }
        }, 230);
      }
    }, { passive: true });
  }

  function setupEventListeners() {
    // Escuta digitação na descrição de gastos para lembrar e sugerir categorias automaticamente
    const qeNomeInput = document.getElementById('quickExpenseNome');
    if (qeNomeInput) {
      qeNomeInput.addEventListener('input', (e) => onQuickExpenseNomeInput(e.target.value));
      qeNomeInput.addEventListener('blur', (e) => onQuickExpenseNomeInput(e.target.value));
    }

    const miNomeInput = document.getElementById('modalItemNome');
    if (miNomeInput) {
      miNomeInput.addEventListener('input', (e) => onModalItemNomeInput(e.target.value));
      miNomeInput.addEventListener('blur', (e) => onModalItemNomeInput(e.target.value));
    }
    // Month navigation
    document.getElementById('prevMonthBtn').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonthBtn').addEventListener('click', () => changeMonth(1));

    const todayBtn = document.getElementById('btnCurrentMonth');
    if (todayBtn) {
      todayBtn.addEventListener('click', goToCurrentRealMonth);
    }

    // Year selection
    const yearSelect = document.getElementById('yearSelect');
    if (yearSelect) {
      yearSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (parseInt(val, 10) < 2025) return;
        currentYear = val;
        calSelectedYear = currentYear;
        const allYears = MatrixDB.getAllYears();
        if (!allYears.includes(currentYear)) {
          MatrixDB.createYear(currentYear, allYears[allYears.length - 1] || '2027');
        }
        updateMonthDisplay();
        renderAll();
      });
    }

    // Tab buttons & Carousel switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab');
        switchTab(targetId);
      });
    });

    // Iniciar navegação gestual por Swipe entre abas no mobile
    initSwipeNavigation();

    // Rain toggle
    const rainBtn = document.getElementById('rainToggleBtn');
    if (rainBtn) {
      rainBtn.addEventListener('click', () => {
        if (typeof window.toggleMatrixRain === 'function') {
          window.toggleMatrixRain();
        }
      });
    }

    // Auto-save instantâneo na Aba Backup & Conexões
    ['cfgCloudUrl', 'cfgCloudToken'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => {
          const cloudUrl = (document.getElementById('cfgCloudUrl')?.value || '').trim();
          const cloudToken = (document.getElementById('cfgCloudToken')?.value || 'MatrixReloaded2026!').trim();
          SyncEngine.saveConfig({ cloudUrl, cloudToken });
          if (cloudUrl) SyncEngine.queueSync();
        });
      }
    });

    ['cfgFisioUrl', 'cfgFisioToken', 'cfgFaturasUrl', 'cfgFaturasToken', 'cfgMaracajuUrl', 'cfgMaracajuToken', 'chkAutoScrapeOnOpen'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => {
          const cfg = {
            fisioUrl: (document.getElementById('cfgFisioUrl')?.value || '').trim(),
            fisioToken: (document.getElementById('cfgFisioToken')?.value || '').trim(),
            faturasUrl: (document.getElementById('cfgFaturasUrl')?.value || '').trim(),
            faturasToken: (document.getElementById('cfgFaturasToken')?.value || '').trim(),
            maracajuUrl: (document.getElementById('cfgMaracajuUrl')?.value || '').trim(),
            maracajuToken: (document.getElementById('cfgMaracajuToken')?.value || '').trim(),
            autoScrapeOnOpen: !!document.getElementById('chkAutoScrapeOnOpen')?.checked
          };
          SatelliteConnectors.saveSatelliteConfig(cfg);
          renderSatellitesUI();
        });
      }
    });

    // Modal listeners
    setupModalListeners();
    setupHoleriteDropzone();
  }

  function changeMonth(direction) {
    if (direction < 0 && String(currentYear) === '2026' && currentMonth === 'Outubro') {
      // Limite temporal mínimo estrito: Outubro/2026
      return;
    }
    let idx = MONTH_NAMES.indexOf(currentMonth);
    idx += direction;
    if (idx < 0) {
      const prevYear = parseInt(currentYear, 10) - 1;
      if (prevYear < 2026) {
        return;
      }
      idx = 11;
      currentYear = String(prevYear);
    } else if (idx > 11) {
      idx = 0;
      currentYear = String(parseInt(currentYear, 10) + 1);
    }
    currentMonth = MONTH_NAMES[idx];
    calSelectedMonth = currentMonth;
    calSelectedYear = currentYear;

    // Se o novo ano ainda não estiver criado, cria automaticamente
    const allYears = MatrixDB.getAllYears();
    if (!allYears.includes(currentYear)) {
      MatrixDB.createYear(currentYear, allYears[allYears.length - 1] || '2027');
    }

    populateYearSelector();
    updateMonthDisplay();
    renderAll();
  }

  function goToCurrentRealMonth() {
    const now = new Date();
    const realYear = String(now.getFullYear());
    const realMonth = MONTH_NAMES[now.getMonth()] || 'Novembro';
    const targetY = parseInt(realYear, 10) < 2026 ? '2026' : realYear;

    currentYear = targetY;
    currentMonth = (targetY === '2026' && MONTH_NAMES.indexOf(realMonth) < 9) ? 'Outubro' : realMonth;
    calSelectedYear = currentYear;
    calSelectedMonth = currentMonth;

    const allYears = MatrixDB.getAllYears();
    if (!allYears.includes(currentYear)) {
      MatrixDB.createYear(currentYear, allYears[allYears.length - 1] || '2027');
    }

    populateYearSelector();
    updateMonthDisplay();
    renderAll();
  }

  function updateMonthDisplay() {
    const el = document.getElementById('currentMonthDisplay');
    if (el) el.textContent = `${currentMonth} / ${currentYear}`;

    // Desabilitar navegação regressiva caso estejamos em Outubro / 2026
    const prevBtn = document.getElementById('prevMonthBtn');
    if (prevBtn) {
      const isAtMinTimeline = (String(currentYear) === '2026' && currentMonth === 'Outubro');
      prevBtn.disabled = isAtMinTimeline;
      prevBtn.style.opacity = isAtMinTimeline ? '0.35' : '1';
      prevBtn.style.cursor = isAtMinTimeline ? 'not-allowed' : 'pointer';
      prevBtn.title = isAtMinTimeline ? 'Timeline inicia em Outubro/2026' : 'Mês anterior';
    }

    // Atualizar estado e destaque visual do botão "Mês Atual"
    const todayBtn = document.getElementById('btnCurrentMonth');
    if (todayBtn) {
      const now = new Date();
      const realY = String(now.getFullYear());
      const realM = MONTH_NAMES[now.getMonth()] || 'Novembro';
      const isAlreadyOnCurrent = (String(currentYear) === realY && currentMonth === realM);
      todayBtn.classList.toggle('is-current-month', isAlreadyOnCurrent);
      todayBtn.title = isAlreadyOnCurrent 
        ? 'Você já está no mês atual' 
        : `Voltar diretamente para ${realM} / ${realY}`;
    }
  }

  function renderAll() {
    renderKPIs();
    renderMonthlyHorizonCards();
    renderFluxoCaixa();
    if (typeof renderCalendar === 'function') renderCalendar();
    if (typeof renderFinancing === 'function') renderFinancing();
    if (typeof renderInvestments === 'function') renderInvestments();
    if (typeof renderSimulator === 'function') renderSimulator();
    if (typeof renderHoleritesHistorico === 'function') renderHoleritesHistorico();
    try { renderQuickExpenseButtons(currentYear, currentMonth); } catch (_) {}
  }

  // ==========================================
  // ÁREA INICIAL: CARDS MENSAIS (RENDA CONJUNTA)
  // ==========================================
  function renderMonthlyHorizonCards() {
    const gridEl = document.getElementById('monthlyHorizonCardsGrid');
    if (!gridEl) return;

    const curY = parseInt(currentYear, 10);
    const curMIdx = MONTH_NAMES.indexOf(currentMonth);

    // Gerar sequência de até 6 meses com início estrito em Outubro/2026 em diante
    let monthsSequence = [];
    const isAtMinStart = (curY === 2026 && curMIdx <= 9); // Outubro
    const startOffset = isAtMinStart ? (9 - curMIdx) : -1;
    for (let offset = startOffset; offset <= startOffset + 5; offset++) {
      let targetMIdx = curMIdx + offset;
      let targetY = curY;
      while (targetMIdx < 0) {
        targetMIdx += 12;
        targetY -= 1;
      }
      while (targetMIdx > 11) {
        targetMIdx -= 12;
        targetY += 1;
      }
      if (targetY < 2026 || (targetY === 2026 && targetMIdx < 9)) {
        continue;
      }
      monthsSequence.push({
        ano: String(targetY),
        mes: MONTH_NAMES[targetMIdx],
        mesIdx: targetMIdx
      });
    }

    const state = MatrixDB.getState();

    const cardsHtml = monthsSequence.map(m => {
      const monthData = MatrixDB.getMonth(m.ano, m.mes);
      const isCurrent = (m.ano === currentYear && m.mes === currentMonth);

      // 1. Rendas Matheus (Salário USP/MPSP + Renda Extra / Outros exclusivamente do Matheus)
      const salMatheus = getSalarioLiquidoMes(m.ano, m.mes);
      let outrosGanhosMatheus = 0;
      let labelExtraMatheus = '';
      (monthData.receitas || []).forEach(r => {
        if (isReceitaExtraMatheus(r)) {
          const val = parseFloat(r.valor) || 0;
          outrosGanhosMatheus += val;
          if (val > 0 && !labelExtraMatheus) labelExtraMatheus = r.nome;
        }
      });
      const rendaMatheusTotal = salMatheus + outrosGanhosMatheus;

      // 2. Rendas Scarlet (FisioFlow + Outras Rendas dela)
      const salScarlet = getGanhosScarletMes(m.ano, m.mes);
      const outrasRendasScarlet = getOutrasRendasScarletMes(m.ano, m.mes);
      const labelExtraScarlet = getDescOutrasRendasScarletMes(m.ano, m.mes);
      const rendaScarletTotal = salScarlet + outrasRendasScarlet;

      // 3. Benefícios Alimentação (VA Fixo 2050.00 | VR Calendário Matrix)
      const ben = getBeneficiosCreditoMes(m.ano, m.mes);
      const va = ben.va;
      const vr = ben.vr;
      const totalBeneficios = ben.total;

      // Ganhos Conjuntos Totais = soma de (Salario matheus + renda extra matheus + outras receitas matheus + ganhos Scarlet + outras Rendas Scarlet + VA + VR)
      const ganhosConjuntosTotais = rendaMatheusTotal + rendaScarletTotal + totalBeneficios;

      // 4. Gastos Fixos, Variáveis, Diários e Fatura Nubank (com Provisão de Caronas com Consumo Automático)
      const caronaSummHorizon = getCaronasProvisionSummary(m.ano, m.mes, monthData);
      const fixos = (monthData.fixos || []).reduce((acc, it) => {
        if (isCaronaItem(it) && !it.pago) {
          return acc + caronaSummHorizon.remaining;
        }
        return acc + (parseFloat(it.valor) || 0);
      }, 0);
      const outros = (monthData.outros || []).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
      const diarios = (monthData.diarios || [])
        .filter(d => {
          if (!d || d.jaAlocadoVariavel) return false;
          const cta = (d.conta || '').toLowerCase();
          return cta !== 'cartao_va' && cta !== 'va' && cta !== 'cartao_vr' && cta !== 'vr';
        })
        .reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
      let contasInicio = 0;
      if (m.mes === 'Janeiro' && monthData.totais && monthData.totais['Contas Inicio Ano']) {
        contasInicio = parseFloat(monthData.totais['Contas Inicio Ano']) || 0;
      }
      const totalGastosConta = fixos + outros + diarios + contasInicio;
      const faturaNubank = getFaturaNubankMes(m.ano, m.mes);
      // Os gastos aqui têm que bater com a soma de gastos fixos + variaveis + diarios + nubank
      const totalGastosCasal = totalGastosConta + faturaNubank;

      // 5. Sobra Real = Sobra Casal calculada pelo motor central calcSobraMatheus
      const calcHorizonM = calcSobraMatheus(m.ano, m.mes);
      const sobraMatheus = calcHorizonM.sobra;
      const transfScarlet = calcHorizonM.transfPaga;
      const subtotalScarlet = rendaScarletTotal + transfScarlet;
      const sobraScarlet = subtotalScarlet - faturaNubank;
      const sobraCasalReal = sobraMatheus + sobraScarlet;

      return `
        <div class="month-horizon-card ${isCurrent ? 'active-month' : ''}" onclick="MatrixApp.navegarParaMes('${m.ano}', '${m.mes}')" title="Clique para abrir e gerenciar ${m.mes}/${m.ano}">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <div class="horizon-month-name">📅 ${m.mes} / ${m.ano}</div>
              <button type="button" class="btn-matrix" style="font-size:9.5px;padding:2px 6px;margin-right:${isCurrent ? '75px' : '0'};" onclick="event.stopPropagation();MatrixApp.openEditSaldosModal('${m.ano}', '${m.mes}')" title="Editar saldos e rendas de ${m.mes}/${m.ano}">✏️ Saldos</button>
            </div>
            
            <div style="font-size:9.5px;color:var(--text-muted);text-transform:uppercase;font-family:var(--font-mono);letter-spacing:0.5px;">Ganhos Conjuntos Totais:</div>
            <div class="horizon-total-renda" style="color:var(--matrix-green);font-size:1.35rem;font-weight:800;font-family:var(--font-mono);">${formatBRL(ganhosConjuntosTotais)}</div>
            <div style="font-size:8.5px;color:var(--text-dim);font-family:var(--font-mono);margin-top:-2px;margin-bottom:6px;">(Matheus + Scarlet + Benefícios VA/VR)</div>

            <!-- Grupos de Receitas discriminadas juntas -->
            <div style="display:flex;flex-direction:column;gap:5px;margin-top:4px;">
              <!-- Grupo 1: Rendas Matheus Juntas -->
              <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:6px;padding:5px 7px;">
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:var(--text-main);font-weight:700;margin-bottom:3px;">
                  <span>👨‍💼 <strong>Rendas Matheus:</strong></span>
                  <span style="color:var(--text-main);">${formatBRL(rendaMatheusTotal)}</span>
                </div>
                <div class="horizon-breakdown-row" style="font-size:9px;opacity:0.85;">
                  <span>• Salário USP:</span>
                  <span>${formatBRL(salMatheus)}</span>
                </div>
                ${outrosGanhosMatheus > 0 ? `
                <div class="horizon-breakdown-row" style="font-size:9px;opacity:0.85;color:var(--matrix-green-glow);">
                  <span>• ${labelExtraMatheus || getNomeEstudio() || 'Renda Extra / Outros'}:</span>
                  <span style="color:var(--matrix-green);font-weight:600;">+ ${formatBRL(outrosGanhosMatheus)}</span>
                </div>` : ''}
              </div>

              <!-- Grupo 2: Rendas Scarlet Juntas -->
              <div style="background:rgba(0,229,255,0.03);border:1px solid rgba(0,229,255,0.12);border-radius:6px;padding:5px 7px;">
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:var(--cyan);font-weight:700;margin-bottom:3px;">
                  <span>👩‍⚕️ <strong>Rendas Scarlet:</strong></span>
                  <span style="color:var(--cyan);">${formatBRL(rendaScarletTotal)}</span>
                </div>
                <div class="horizon-breakdown-row" style="font-size:9px;opacity:0.85;">
                  <span>• Ganhos Fisio (FisioFlow):</span>
                  <span>${formatBRL(salScarlet)}</span>
                </div>
                ${outrasRendasScarlet > 0 ? `
                <div class="horizon-breakdown-row" style="font-size:9px;opacity:0.85;">
                  <span>• ${labelExtraScarlet || 'Outras Rendas'}:</span>
                  <span style="color:var(--cyan);font-weight:600;">+ ${formatBRL(outrasRendasScarlet)}</span>
                </div>` : ''}
              </div>

              <!-- Grupo 3: Alimentação VA + VR Juntos -->
              <div style="background:rgba(255,183,77,0.03);border:1px solid rgba(255,183,77,0.12);border-radius:6px;padding:5px 7px;">
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:var(--amber);font-weight:700;margin-bottom:3px;">
                  <span>🛒 <strong>Alimentação (VA + VR):</strong></span>
                  <span style="color:var(--amber);">${formatBRL(totalBeneficios)}</span>
                </div>
                <div class="horizon-breakdown-row" style="font-size:9px;opacity:0.85;">
                  <span>• VA (Maracaju 88):</span>
                  <span style="color:var(--matrix-green);">${formatBRL(va)}</span>
                </div>
                <div class="horizon-breakdown-row" style="font-size:9px;opacity:0.85;">
                  <span>• VR (Almoço USP):</span>
                  <span style="color:var(--cyan);">${formatBRL(vr)}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Rodapé: Gastos e Sobra Real (Igual Sobra do Casal do Card Anterior) -->
          <div class="horizon-bottom-bar" style="margin-top:8px;padding-top:6px;border-top:1px solid var(--border-dim);display:flex;flex-direction:column;gap:3px;">
            <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;margin-bottom:2px;padding-bottom:3px;border-bottom:1px dashed rgba(255,255,255,0.08);" title="Renda Matheus (${formatBRL(rendaMatheusTotal)}) + Renda Scarlet (${formatBRL(rendaScarletTotal)}) + VA/VR (${formatBRL(totalBeneficios)})">
              <span style="color:var(--matrix-green);">💼 Ganhos Totais (+ VA/VR):</span>
              <strong style="color:var(--matrix-green);font-family:var(--font-mono);">${formatBRL(ganhosConjuntosTotais)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:9.5px;">
              <span style="color:var(--text-muted);" title="Fixos (${formatBRL(fixos)}) + Variáveis (${formatBRL(outros)}) + Diários (${formatBRL(diarios)}) + Nubank (${formatBRL(faturaNubank)})">Gastos (Fixos+Var+Diár+Nubank):</span>
              <strong style="color:var(--rose);font-family:var(--font-mono);">${formatBRL(totalGastosCasal)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;" title="Sobra Matheus (${formatBRL(sobraMatheus)}) + Sobra Scarlet (${formatBRL(sobraScarlet)})">
              <span style="color:var(--text-main);">Sobra Real (Casal):</span>
              <strong style="color:${sobraCasalReal >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};font-family:var(--font-mono);">${sobraCasalReal >= 0 ? '+' : ''}${formatBRL(sobraCasalReal)}</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');

    gridEl.innerHTML = cardsHtml;
  }

  // ==========================================
  // 1. KPIS & CARDS DE TOPO (PAINEL UNIFICADO)
  // ==========================================
  function renderKPIs() {
    const state = MatrixDB.getState();
    const monthData = MatrixDB.getMonth(currentYear, currentMonth);

    // Sincroniza instantaneamente os saldos atuais de VA e VR do app Casa Maracaju 88 (localStorage + diários)
    if (typeof SatelliteConnectors !== 'undefined' && typeof SatelliteConnectors.syncMaracajuFromLocal === 'function') {
      SatelliteConnectors.syncMaracajuFromLocal(state);
    }

    // 1. Salário Matheus (USP Líquido do Holerite ou Receitas)
    const recSalList = (monthData.receitas || []).filter(r => isReceitaSalarioMatheus(r));
    let salMatheusTotal = 0;
    let salMatheusPago = 0;
    if (recSalList.length > 0) {
      recSalList.forEach(r => {
        const v = parseFloat(r.valor) || 0;
        salMatheusTotal += v;
        if (r.pago === true) salMatheusPago += v;
      });
    } else {
      const v = getSalarioLiquidoMes(currentYear, currentMonth);
      salMatheusTotal = v;
      salMatheusPago = v;
    }
    const salMatheus = salMatheusPago > 0 ? salMatheusPago : salMatheusTotal;

    // 1.1 13º Salário Matheus
    const rec13List = (monthData.receitas || []).filter(r => isReceita13Salario(r));
    const val13Total = rec13List.reduce((acc, r) => acc + (parseFloat(r.valor) || 0), 0);
    const val13Pago = rec13List.filter(r => r.pago === true).reduce((acc, r) => acc + (parseFloat(r.valor) || 0), 0);
    const val13Pendente = rec13List.filter(r => r.pago !== true).reduce((acc, r) => acc + (parseFloat(r.valor) || 0), 0);

    // 2. Ganhos Scarlet (FisioFlow)
    const ganhosScarlet = getGanhosScarletMes(currentYear, currentMonth);

    // 3. Vale Alimentação - VA (Fixo 2050.00) & 4. Vale Refeição - VR (Calendário Matrix)
    const ben = getBeneficiosCreditoMes(currentYear, currentMonth);
    const va = ben.va;
    const vr = ben.vr;

    // 5. Outros Ganhos em Pecúnia do Matheus (Estúdio, Empréstimo Matheus, etc. — exclui estritamente rendas da Scarlet e 13º)
    let outrosGanhosPago = 0;
    let outrosGanhosTotal = 0;
    let outrosLabel = '';
    (monthData.receitas || []).forEach(r => {
      if (isReceitaExtraMatheus(r)) {
        const val = parseFloat(r.valor) || 0;
        outrosGanhosTotal += val;
        if (r.pago === true) outrosGanhosPago += val;
        if (val > 0 && !outrosLabel) outrosLabel = r.nome;
      }
    });
    const outrosGanhosPendente = Math.max(0, outrosGanhosTotal - outrosGanhosPago);
    const outrosGanhos = outrosGanhosPago; // Apenas o que está pago entra no saldo de recursos disponíveis em conta!

    // Ganhos em Pecúnia (Dinheiro Líquido em Conta - Exclui estritamente VA e VR)
    // Composição rigorosa: Salário USP Matheus + Renda Extra Matheus + FisioFlow Scarlet + Outras Rendas Scarlet
    const outrasRendasScarletMes = getOutrasRendasScarletMes(currentYear, currentMonth);
    const beneficiosNaoPecunia = Math.round((va + vr) * 100) / 100;

    if (monthData.receitas && monthData.receitas.length > 0) {
      monthData.receitas.forEach(it => {
        if (isBeneficioNaoPecunia(it)) {
          if (isItemVR(it)) {
            it.valor = vr;
          } else if (isItemVA(it)) {
            it.valor = va;
          }
        }
      });
    }
    const ganhosPecunia = salMatheus + outrosGanhos + ganhosScarlet + outrasRendasScarletMes;

    // Gastos Fixos (com Opção 1: Provisão de Caronas com Consumo Automático)
    const caronaSummKPI = getCaronasProvisionSummary(currentYear, currentMonth, monthData);
    const fixos = (monthData.fixos || []).reduce((acc, it) => {
      if (isCaronaItem(it) && !it.pago) {
        return acc + caronaSummKPI.remaining;
      }
      return acc + (parseFloat(it.valor) || 0);
    }, 0);
    // Gastos Outros/Variáveis
    const outros = (monthData.outros || []).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
    // Gastos Diários Imediatos (exclui espelhos de cartão de crédito e gastos em cartão VA/VR)
    const diarios = (monthData.diarios || [])
      .filter(d => {
        if (!d || d.jaAlocadoVariavel) return false;
        const cta = (d.conta || '').toLowerCase();
        return cta !== 'cartao_va' && cta !== 'va' && cta !== 'cartao_vr' && cta !== 'vr';
      })
      .reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
    // Contas início de ano
    let contasInicio = 0;
    if (currentMonth === 'Janeiro' && monthData.totais && monthData.totais['Contas Inicio Ano']) {
      contasInicio = parseFloat(monthData.totais['Contas Inicio Ano']) || 0;
    }

    const totalGastos = fixos + outros + diarios + contasInicio;
    const saldoLivre = ganhosPecunia - totalGastos;

    // Fatura Nubank Black e Ganhos da Scarlet do mês
    const faturaNubank = getFaturaNubankMes(currentYear, currentMonth);
    const sobraFatura = Math.max(0, faturaNubank - ganhosScarlet);

    // Dívida Caixa e Prazo dinâmicos para o mês ativo (evolução temporal Price)
    const curMIdxNum = MONTH_NAMES.indexOf(currentMonth) + 1;
    const curYNum = parseInt(currentYear, 10) || 2026;
    const statusCaixaMes = (typeof AmortizationEngine !== 'undefined' && AmortizationEngine.getStatusForMonth)
      ? AmortizationEngine.getStatusForMonth(curYNum, curMIdxNum, state.financiamentoCaixa)
      : { saldo: 157884.49, prazo: 271, parcela: 1395.88 };
    const dividaCaixa = statusCaixaMes.saldo;

    // ==========================================
    // ATUALIZAÇÃO DO PAINEL UNIFICADO DE TOPO
    // ==========================================
    // 1. Badge de Período Ativo
    const badgeEl = document.getElementById('topActivePeriodBadge');
    if (badgeEl) badgeEl.textContent = `${currentMonth} / ${currentYear}`;

    // 2. Pilares Satélites no Topo
    const satFatEl = document.getElementById('topSatFaturaVal');
    if (satFatEl) smoothSetText(satFatEl, formatBRL(faturaNubank));

    const satFisioEl = document.getElementById('topSatFisioVal');
    if (satFisioEl) smoothSetText(satFisioEl, formatBRL(ganhosScarlet));

    // 3. Pilar Satélite: Casa Maracaju 88 (Benefícios VA & VR — SEMPRE mostra o SALDO ATUAL RESTANTE)
    const satMaracaju = (state.satellites && state.satellites.maracaju) || {
      saldoVaRestante: 1988.78,
      saldoVrRestante: 805.41,
      vaTotal: 2059.84,
      vrTotal: 1105.16,
      gastoMercadoMesAtual: 71.06,
      gastoVrMesAtual: 299.75
    };
    const vaAtual = (currentYear === '2026' && currentMonth === 'Novembro')
      ? (satMaracaju.saldoVaRestante != null ? satMaracaju.saldoVaRestante : Math.max(0, (satMaracaju.vaTotal || 2059.84) - (satMaracaju.gastoMercadoMesAtual || 0)))
      : va;
    const vrAtual = (currentYear === '2026' && currentMonth === 'Novembro')
      ? (satMaracaju.saldoVrRestante != null ? satMaracaju.saldoVrRestante : Math.max(0, (satMaracaju.vrTotal || 1105.16) - (satMaracaju.gastoVrMesAtual || 0)))
      : vr;

    const satCasaEl = document.getElementById('topSatCasaVal');
    const satVaEl = document.getElementById('topSatVaVal');
    const satVrEl = document.getElementById('topSatVrVal');
    if (satVaEl && satVrEl) {
      smoothSetText(satVaEl, `VA ${formatBRL(vaAtual)}`);
      smoothSetText(satVrEl, `VR ${formatBRL(vrAtual)}`);
    } else if (satCasaEl) {
      satCasaEl.innerHTML = `<span style="color:var(--matrix-green);">VA ${formatBRL(vaAtual)}</span> <span style="color:var(--cyan);margin-left:4px;">VR ${formatBRL(vrAtual)}</span>`;
    }

    const satCasaChip = (satCasaEl || satVaEl) ? (satCasaEl || satVaEl).closest('.sat-chip') : null;
    if (satCasaChip) {
      satCasaChip.setAttribute('title', `Casa Maracaju: Saldo VA ${formatBRL(vaAtual)} (Gasto Mercado: ${formatBRL(satMaracaju.gastoMercadoMesAtual || 0)}) • Saldo VR ${formatBRL(vrAtual)} (Gasto Refeições: ${formatBRL(satMaracaju.gastoVrMesAtual || 0)})`);
    }

    // 3. Card 1: Ganhos Totais (Dois Cálculos: Sem Benefícios e Com Benefícios)
    const rendaMatheusTotal = salMatheusPago + val13Pago + outrosGanhosPago;
    const ganhosComBeneficiosTotal = rendaMatheusTotal + beneficiosNaoPecunia;
    const totalPendenteMatheus = (salMatheusTotal - salMatheusPago) + val13Pendente + outrosGanhosPendente;

    const eqSalMatheusEl = document.getElementById('topEqSalMatheus');
    if (eqSalMatheusEl) eqSalMatheusEl.textContent = formatBRL(salMatheusPago);

    const eqOutrosGanhosEl = document.getElementById('topEqOutrosGanhos');
    if (eqOutrosGanhosEl) eqOutrosGanhosEl.textContent = formatBRL(outrosGanhosPago + val13Pago);

    // No banner de Ganhos Matheus, exibe os valores iniciais de VA e VR creditados no mês (sem os descontos/gastos correntes)
    const eqVaEl = document.getElementById('topEqVaVal');
    if (eqVaEl) eqVaEl.textContent = formatBRL(va);

    const eqVrEl = document.getElementById('topEqVrVal');
    if (eqVrEl) eqVrEl.textContent = formatBRL(vr);

    const eqTotalGanhosEl = document.getElementById('topEqTotalGanhos');
    if (eqTotalGanhosEl) eqTotalGanhosEl.textContent = formatBRL(rendaMatheusTotal);

    // Cálculo 1: Salário + Renda Extra (Conta Corrente)
    const rConjuntaEl = document.getElementById('topRendaConjuntaVal');
    if (rConjuntaEl) smoothSetText(rConjuntaEl, formatBRL(rendaMatheusTotal));

    // Cálculo 2: Salário + Renda Extra + Benefícios (VA + VR)
    const gComBeneficiosEl = document.getElementById('topGanhosComBeneficiosVal');
    if (gComBeneficiosEl) smoothSetText(gComBeneficiosEl, formatBRL(ganhosComBeneficiosTotal));

    const rConjuntaSubEl = document.getElementById('topRendaConjuntaSub') || document.getElementById('topRendaSub');
    if (rConjuntaSubEl) {
      rConjuntaSubEl.textContent = totalPendenteMatheus > 0
        ? `Líquido em Conta (BB) • ${formatBRL(totalPendenteMatheus)} a receber`
        : `Líquido em Conta (BB)`;
    }

    const salMatheusEl = document.getElementById('topSalMatheusVal');
    if (salMatheusEl) salMatheusEl.textContent = formatBRL(salMatheusPago);

    // 13º Salário Row
    const row13El = document.getElementById('top13SalRow');
    const val13El = document.getElementById('top13SalVal');
    if (row13El && val13El) {
      if (val13Total > 0) {
        row13El.style.display = 'flex';
        if (val13Pago > 0) {
          val13El.innerHTML = `<span style="color:var(--cyan);">+ ${formatBRL(val13Pago)}</span>`;
        } else {
          val13El.innerHTML = `<span style="color:var(--amber);font-size:11px;">R$ 0,00 <span style="font-size:9.5px;color:var(--text-muted);">(⏳ ${formatBRL(val13Pendente)} a receber)</span></span>`;
        }
      } else {
        row13El.style.display = 'none';
      }
    }

    const outrosEl = document.getElementById('topOutrosVal');
    if (outrosEl) {
      if (outrosGanhosPago > 0 && outrosGanhosPendente > 0) {
        outrosEl.innerHTML = `<span style="color:var(--matrix-green);">+ ${formatBRL(outrosGanhosPago)}</span> <span style="font-size:9.5px;color:var(--text-muted);">(⏳ +${formatBRL(outrosGanhosPendente)})</span>`;
      } else if (outrosGanhosPago > 0) {
        outrosEl.innerHTML = `<span style="color:var(--matrix-green);">+ ${formatBRL(outrosGanhosPago)}</span>`;
      } else if (outrosGanhosPendente > 0) {
        outrosEl.innerHTML = `<span style="color:var(--amber);font-size:11px;">R$ 0,00 <span style="font-size:9.5px;color:var(--text-muted);">(⏳ ${formatBRL(outrosGanhosPendente)} a receber)</span></span>`;
      } else {
        outrosEl.textContent = 'R$ 0,00';
      }
    }

    const labelEstudio = document.getElementById('topLabelEstudio') || document.getElementById('topOutrosLabel');
    if (labelEstudio) {
      labelEstudio.textContent = outrosLabel || getNomeEstudio() || 'Outros Ganhos';
    }

    const totalBenEl = document.getElementById('topTotalBeneficiosVal');
    if (totalBenEl) totalBenEl.textContent = formatBRL(beneficiosNaoPecunia);

    const vaEl = document.getElementById('topVaVal');
    if (vaEl) vaEl.textContent = formatBRL(va);

    const vrEl = document.getElementById('topVrVal');
    if (vrEl) vrEl.textContent = formatBRL(vr);

    const ganhosFooterTotalEl = document.getElementById('topGanhosFooterTotalVal');
    if (ganhosFooterTotalEl) ganhosFooterTotalEl.textContent = formatBRL(ganhosComBeneficiosTotal);

    // 4. Card 2: Gastos Totais (Dois Cálculos: Sem Nubank e Com Nubank)
    const eqFixosEl = document.getElementById('topEqFixos');
    if (eqFixosEl) eqFixosEl.textContent = formatBRL(fixos);

    const eqOutrosEl = document.getElementById('topEqOutros');
    if (eqOutrosEl) eqOutrosEl.textContent = formatBRL(outros);

    const eqDiariosEl = document.getElementById('topEqDiarios');
    if (eqDiariosEl) eqDiariosEl.textContent = formatBRL(diarios);

    const eqNubankEl = document.getElementById('topEqNubank');
    if (eqNubankEl) eqNubankEl.textContent = formatBRL(faturaNubank);

    // Obter dados consolidados da sobra e gastos do Matheus
    const calcM = calcSobraMatheus(currentYear, currentMonth);

    // Cálculo 1: Fixos + Variáveis + Diários (+ Início de Ano se houver)
    const gastosTotaisEl = document.getElementById('topGastosTotaisVal');
    if (gastosTotaisEl) smoothSetText(gastosTotaisEl, formatBRL(calcM.totalGastos));

    const gastosContaSub = document.querySelector('.dual-gastos-box.calc1 .dual-gastos-sub');
    if (gastosContaSub) {
      gastosContaSub.textContent = calcM.totalGastosPendente > 0
        ? `Pago: ${formatBRL(calcM.totalGastosPago)} • ⏳ ${formatBRL(calcM.totalGastosPendente)} a pagar`
        : `Sem Cartão Nubank`;
    }

    // Cálculo 2: Fixos + Variáveis + Diários + Nubank
    const totalComNubank = calcM.totalGastos + faturaNubank;
    const gastosComNubankEl = document.getElementById('topGastosComNubankVal');
    if (gastosComNubankEl) smoothSetText(gastosComNubankEl, formatBRL(totalComNubank));

    const gastosFooterTotalEl = document.getElementById('topGastosFooterTotalVal');
    if (gastosFooterTotalEl) gastosFooterTotalEl.textContent = formatBRL(totalComNubank);

    const resumoFixosEl = document.getElementById('topResumoFixosVal');
    if (resumoFixosEl) resumoFixosEl.textContent = formatBRL(calcM.fixos);

    const resumoOutrosEl = document.getElementById('topResumoOutrosVal');
    if (resumoOutrosEl) resumoOutrosEl.textContent = formatBRL(calcM.outros);

    const resumoDiariosEl = document.getElementById('topResumoDiariosVal');
    if (resumoDiariosEl) resumoDiariosEl.textContent = formatBRL(calcM.diarios);

    const resumoNubankEl = document.getElementById('topResumoNubankVal');
    if (resumoNubankEl) resumoNubankEl.textContent = formatBRL(faturaNubank);

    const contasInicioRow = document.getElementById('topContasInicioRow');
    const contasInicioVal = document.getElementById('topContasInicioVal');
    if (contasInicioRow && contasInicioVal) {
      if (contasInicio > 0) {
        contasInicioRow.style.display = 'flex';
        contasInicioVal.textContent = formatBRL(contasInicio);
      } else {
        contasInicioRow.style.display = 'none';
      }
    }

    // 5. Card 3: Sobra pra Mim (Matheus) & Sobra do Casal
    // PARTE 1 (TOPO): SOBRA PRA MIM (MATHEUS)
    // + Meu salario + rendas extras recebidas em conta
    // - Gastos fixos+variaveis+diarios e transferências EFETIVAMENTE PAGOS
    // = Sobra real no caixa do Matheus (se a conta ou repasse ainda não foi pago, sobra na conta dele!)
    const rendaMatheus = calcM.ganhos; // Salário USP + Rendas Extras recebidas
    const gastosTotaisMatheus = calcM.totalGastosPago; // Contas próprias e repasses já debitados/pagos
    const sobraMatheus = calcM.sobra; // O que sobra no caixa hoje!
    const sobraPrevistaMatheus = calcM.sobraPrevista;

    const eqMatheusRendaEl = document.getElementById('topEqMatheusRenda');
    if (eqMatheusRendaEl) eqMatheusRendaEl.textContent = formatBRL(rendaMatheus);

    const eqMatheusContasEl = document.getElementById('topEqMatheusContas');
    if (eqMatheusContasEl) eqMatheusContasEl.textContent = formatBRL(gastosTotaisMatheus);

    const eqMatheusSobraEl = document.getElementById('topEqMatheusSobra');
    if (eqMatheusSobraEl) {
      eqMatheusSobraEl.textContent = `${sobraMatheus >= 0 ? '+' : ''}${formatBRL(sobraMatheus)}`;
      eqMatheusSobraEl.style.color = sobraMatheus >= 0 ? 'var(--matrix-green)' : 'var(--rose)';
    }

    // Valor Principal no topo do Card: Sobra pra Mim
    const topSobraMatheusEl = document.getElementById('topSobraMatheusVal');
    if (topSobraMatheusEl) {
      smoothSetText(topSobraMatheusEl, `${sobraMatheus >= 0 ? "+" : ""}${formatBRL(sobraMatheus)}`, sobraMatheus >= 0 ? "var(--matrix-green)" : "var(--rose)");
      topSobraMatheusEl.style.color = sobraMatheus >= 0 ? 'var(--matrix-green)' : 'var(--rose)';
    }

    const topSobraMatheusSub = document.getElementById('topSobraMatheusSub');
    if (topSobraMatheusSub) {
      topSobraMatheusSub.textContent = calcM.totalGastosPendente > 0
        ? `Líquido em Conta (BB) • ${formatBRL(sobraPrevistaMatheus)} previsto pós-quitação`
        : `Líquido em Conta (BB)`;
    }

    const topMatheusReceitasEl = document.getElementById('topMatheusReceitasVal');
    if (topMatheusReceitasEl) topMatheusReceitasEl.textContent = formatBRL(rendaMatheus);

    const topMatheusGastosEl = document.getElementById('topMatheusGastosVal');
    if (topMatheusGastosEl) {
      if (calcM.totalGastosPendente > 0) {
        topMatheusGastosEl.innerHTML = `<span style="color:var(--rose);">- ${formatBRL(gastosTotaisMatheus)}</span> <span style="font-size:9.5px;color:var(--text-muted);">(⏳ ${formatBRL(calcM.totalGastosPendente)} a pagar)</span>`;
      } else {
        topMatheusGastosEl.textContent = `- ${formatBRL(gastosTotaisMatheus)}`;
      }
    }

    const topMatheusSobraCalcEl = document.getElementById('topMatheusSobraCalcVal');
    if (topMatheusSobraCalcEl) {
      topMatheusSobraCalcEl.textContent = `${sobraMatheus >= 0 ? '+' : ''}${formatBRL(sobraMatheus)}`;
      topMatheusSobraCalcEl.style.color = sobraMatheus >= 0 ? 'var(--matrix-green)' : 'var(--rose)';
    }

    const topMatheusStatusBadge = document.getElementById('topMatheusStatusBadge');
    if (topMatheusStatusBadge) {
      topMatheusStatusBadge.textContent = sobraMatheus >= 0 ? 'Sobra Positiva' : 'Déficit em Conta';
      topMatheusStatusBadge.className = sobraMatheus >= 0 ? 'unified-badge green' : 'unified-badge rose';
    }

    // PARTE 2 (EMBAIXO DISSO): SOBRA DO CASAL = SOBRA SCARLET + SOBRA MATHEUS
    const scarletTransf = calcM.transfPaga;
    const scarletTransfPendente = calcM.transfPendente;
    const scarletFisio = ganhosScarlet;
    const scarletOutras = getOutrasRendasScarletMes(currentYear, currentMonth);
    const descOutrasScarlet = getDescOutrasRendasScarletMes(currentYear, currentMonth);
    const scarletSubtotal = scarletFisio + scarletOutras + scarletTransf;
    const scarletFatura = faturaNubank;

    // Gastos próprios da Scarlet (Psicóloga, Investimentos, etc. que saem da renda dela)
    const scarletGastosItems = [...(monthData.fixos || []), ...(monthData.outros || [])]
      .filter(it => isGastoDaScarlet(it) && !isTransferenciaParaScarlet(it) && it.nome !== 'Nubank Scarlet');
    const scarletGastosPropriosTotal = scarletGastosItems.reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
    const scarletGastosPropriosPago = scarletGastosItems.filter(it => it.pago === true).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
    const scarletGastosPropriosPendente = scarletGastosItems.filter(it => it.pago !== true).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);

    const scarletSobra = scarletSubtotal - scarletFatura - scarletGastosPropriosPago;
    const sobraCasalReal = sobraMatheus + scarletSobra;

    const eqCasalSobraMatheus = document.getElementById('topEqCasalSobraMatheus');
    if (eqCasalSobraMatheus) eqCasalSobraMatheus.textContent = formatBRL(sobraMatheus);

    const eqCasalSobraScarlet = document.getElementById('topEqCasalSobraScarlet');
    if (eqCasalSobraScarlet) eqCasalSobraScarlet.textContent = formatBRL(scarletSobra);

    const eqCasalSobraFinal = document.getElementById('topEqCasalSobraFinal');
    if (eqCasalSobraFinal) {
      eqCasalSobraFinal.textContent = `${sobraCasalReal >= 0 ? '+' : ''}${formatBRL(sobraCasalReal)}`;
      eqCasalSobraFinal.style.color = sobraCasalReal >= 0 ? 'var(--matrix-green)' : 'var(--rose)';
    }

    const sobraValEl = document.getElementById('topSobraNoMesVal');
    if (sobraValEl) {
      smoothSetText(sobraValEl, `${sobraCasalReal >= 0 ? "+" : ""}${formatBRL(sobraCasalReal)}`, sobraCasalReal >= 0 ? "var(--matrix-green)" : "var(--rose)");
      sobraValEl.style.color = sobraCasalReal >= 0 ? 'var(--matrix-green)' : 'var(--rose)';
    }

    const casalSobraMatheusVal = document.getElementById('topCasalSobraMatheusVal');
    if (casalSobraMatheusVal) {
      smoothSetText(casalSobraMatheusVal, `${sobraMatheus >= 0 ? "+" : ""}${formatBRL(sobraMatheus)}`, sobraMatheus >= 0 ? "var(--matrix-green)" : "var(--rose)");
      casalSobraMatheusVal.style.color = sobraMatheus >= 0 ? 'var(--matrix-green)' : 'var(--rose)';
    }

    const casalSobraScarletVal = document.getElementById('topCasalSobraScarletVal');
    if (casalSobraScarletVal) {
      smoothSetText(casalSobraScarletVal, `${scarletSobra >= 0 ? "+" : ""}${formatBRL(scarletSobra)}`, scarletSobra >= 0 ? "var(--purple)" : "var(--rose)");
      casalSobraScarletVal.style.color = scarletSobra >= 0 ? 'var(--purple)' : 'var(--rose)';
    }

    const casalSobraTotalVal = document.getElementById('topCasalSobraTotalVal');
    if (casalSobraTotalVal) {
      smoothSetText(casalSobraTotalVal, `${sobraCasalReal >= 0 ? "+" : ""}${formatBRL(sobraCasalReal)}`, sobraCasalReal >= 0 ? "var(--matrix-green)" : "var(--rose)");
      casalSobraTotalVal.style.color = sobraCasalReal >= 0 ? 'var(--matrix-green)' : 'var(--rose)';
    }

    const sobraFooterMsg = document.getElementById('topSobraFooterMsg');
    if (sobraFooterMsg) {
      sobraFooterMsg.textContent = sobraCasalReal >= 0
        ? 'Caixa Conjunto Positivo'
        : 'Atenção: Déficit Conjunto';
      sobraFooterMsg.style.color = sobraCasalReal >= 0 ? 'var(--matrix-green)' : 'var(--rose)';
    }

    // 6. Card 4: Fluxo & Sobra Scarlet
    // + Ganhos Scarlet Fisio
    // + Outras Rendas Scarlet
    // + Transf. p/ Scarlet
    // = Subtotal
    // - Fatura Nubank
    // = Sobra Scarlet
    const eqScarletFisioEl = document.getElementById('topEqScarletFisio');
    if (eqScarletFisioEl) eqScarletFisioEl.textContent = formatBRL(scarletFisio);

    const eqScarletOutrasEl = document.getElementById('topEqScarletOutras');
    if (eqScarletOutrasEl) eqScarletOutrasEl.textContent = formatBRL(scarletOutras);

    const eqScarletTransfEl = document.getElementById('topEqScarletTransf');
    if (eqScarletTransfEl) eqScarletTransfEl.textContent = formatBRL(scarletTransf);

    const eqScarletFaturaEl = document.getElementById('topEqScarletFatura');
    if (eqScarletFaturaEl) eqScarletFaturaEl.textContent = formatBRL(scarletFatura);

    const eqScarletGastosEl = document.getElementById('topEqScarletGastos');
    if (eqScarletGastosEl) eqScarletGastosEl.textContent = formatBRL(scarletGastosPropriosPago);

    const eqScarletSobraEl = document.getElementById('topEqScarletSobra');
    if (eqScarletSobraEl) {
      eqScarletSobraEl.textContent = `${scarletSobra >= 0 ? '+' : ''}${formatBRL(scarletSobra)}`;
      eqScarletSobraEl.style.color = scarletSobra >= 0 ? 'var(--matrix-green)' : 'var(--rose)';
    }

    const topSobraScarletEl = document.getElementById('topSobraScarletVal');
    if (topSobraScarletEl) {
      topSobraScarletEl.textContent = `${scarletSobra >= 0 ? '+' : ''}${formatBRL(scarletSobra)}`;
      topSobraScarletEl.style.color = scarletSobra >= 0 ? 'var(--purple)' : 'var(--rose)';
    }

    // Dados dinâmicos de atendimentos e agendamentos FisioFlow para o mês selecionado
    const curMIdx = MONTH_NAMES.indexOf(currentMonth);
    const selectedYM = `${currentYear}-${String(curMIdx + 1).padStart(2, '0')}`;

    let prevMIdx = curMIdx - 1;
    let prevYear = parseInt(currentYear, 10);
    if (prevMIdx < 0) {
      prevMIdx = 11;
      prevYear -= 1;
    }
    const prevMesNome = MONTH_NAMES[prevMIdx];
    const prevMesAbbr = prevMesNome ? prevMesNome.slice(0, 3) : '';

    const nextMIdx = (curMIdx + 1) % 12;
    const nextMesNome = MONTH_NAMES[nextMIdx];

    const satFisioFlow = (state.satellites && state.satellites.fisioflow) || (typeof SatelliteConnectors !== 'undefined' && SatelliteConnectors.getBaselineFisioData ? SatelliteConnectors.getBaselineFisioData() : null);

    let fisioRealizadoAtual = 0;
    let fisioPrevistoAtual = 0;
    let fisioSessoesAtual = 0;

    if (satFisioFlow && satFisioFlow.ganhosPorMes && satFisioFlow.ganhosPorMes[selectedYM]) {
      const gMes = satFisioFlow.ganhosPorMes[selectedYM];
      fisioRealizadoAtual = (parseFloat(gMes.total) || parseFloat(gMes.realizado) || 0);
      fisioPrevistoAtual = (parseFloat(gMes.previsto) || 0);
      fisioSessoesAtual = parseInt(gMes.sessoes, 10) || 0;
    } else if (selectedYM === '2026-11' && satFisioFlow) {
      // Fallback exclusivo de Novembro/2026
      fisioRealizadoAtual = parseFloat(satFisioFlow.mesAtualTotal) || 995.00;
      fisioPrevistoAtual = parseFloat(satFisioFlow.mesAtualPrevisto) || 3810.00;
      fisioSessoesAtual = 11;
    }

    const elAtualLabel = document.getElementById('topScarletGanhosAtualLabel');
    if (elAtualLabel) {
      elAtualLabel.textContent = fisioSessoesAtual > 0
        ? `🩺 Realizado no Mês (${fisioSessoesAtual} sessões):`
        : '🩺 Realizado no Mês:';
    }

    const elAtualRow = document.getElementById('topScarletGanhosAtualRow');
    if (elAtualRow) {
      elAtualRow.title = fisioSessoesAtual > 0
        ? `Sessões realizadas em ${currentMonth}. Cairão no caixa de ${nextMesNome} (Regra M+1).`
        : `Nenhuma sessão realizada em ${currentMonth}/${currentYear} no app Atendimentos.`;
    }

    const elAtual = document.getElementById('topScarletGanhosAtualVal');
    if (elAtual) smoothSetText(elAtual, formatBRL(fisioRealizadoAtual));

    const elPrevisto = document.getElementById('topScarletGanhosPrevistoVal');
    if (elPrevisto) smoothSetText(elPrevisto, formatBRL(fisioPrevistoAtual));

    const elFisioLabel = document.getElementById('topScarletGanhosFisioLabel');
    if (elFisioLabel) {
      elFisioLabel.textContent = `🩺 (+) Caixa Fisio do Mês (M+1 • ${prevMesAbbr}):`;
    }

    const elFisioRow = document.getElementById('topScarletGanhosFisioRow');
    if (elFisioRow) {
      elFisioRow.title = `Valor faturado no mês anterior (${prevMesNome}/${prevYear}) e creditado no caixa de ${currentMonth}/${currentYear} (Regra M+1).`;
    }

    const topScarletFisioVal = document.getElementById('topScarletGanhosFisioVal');
    if (topScarletFisioVal) smoothSetText(topScarletFisioVal, formatBRL(scarletFisio));

    const topScarletOutrasVal = document.getElementById('topScarletOutrasRendasVal');
    if (topScarletOutrasVal) smoothSetText(topScarletOutrasVal, formatBRL(scarletOutras));

    const topScarletOutrasRow = document.getElementById('topScarletOutrasRendasRow');
    if (topScarletOutrasRow) {
      const topScarletOutrasLabel = document.getElementById('topScarletOutrasRendasLabel');
      if (topScarletOutrasLabel) {
        topScarletOutrasLabel.textContent = `🎁 (+) ${descOutrasScarlet || 'Outras Rendas Scarlet'}`;
      }
    }

    const topScarletTransfVal = document.getElementById('topScarletTransfVal');
    if (topScarletTransfVal) {
      if (scarletTransf > 0) {
        topScarletTransfVal.innerHTML = `<span style="color:var(--amber);">${formatBRL(scarletTransf)}</span>`;
      } else if (scarletTransfPendente > 0) {
        topScarletTransfVal.innerHTML = `<span style="color:var(--amber);font-size:11px;">R$ 0,00 <span style="font-size:9.5px;color:var(--text-muted);">(⏳ ${formatBRL(scarletTransfPendente)} pendente)</span></span>`;
      } else {
        topScarletTransfVal.textContent = 'R$ 0,00';
      }
    }

    const topScarletSubtotalVal = document.getElementById('topScarletSubtotalVal');
    if (topScarletSubtotalVal) smoothSetText(topScarletSubtotalVal, formatBRL(scarletSubtotal));

    const topScarletFaturaVal = document.getElementById('topScarletFaturaVal');
    if (topScarletFaturaVal) smoothSetText(topScarletFaturaVal, `- ${formatBRL(scarletFatura)}`);

    const topScarletGastosPropriosVal = document.getElementById('topScarletGastosPropriosVal');
    if (topScarletGastosPropriosVal) {
      if (scarletGastosPropriosPago > 0) {
        topScarletGastosPropriosVal.textContent = `- ${formatBRL(scarletGastosPropriosPago)}`;
      } else if (scarletGastosPropriosPendente > 0) {
        topScarletGastosPropriosVal.innerHTML = `<span style="color:var(--rose);font-size:11px;">R$ 0,00 <span style="font-size:9.5px;color:var(--text-muted);">(⏳ ${formatBRL(scarletGastosPropriosPendente)} a pagar)</span></span>`;
      } else {
        topScarletGastosPropriosVal.textContent = '- R$ 0,00';
      }
    }

    const topScarletSobraFinalVal = document.getElementById('topScarletSobraFinalVal');
    if (topScarletSobraFinalVal) {
      smoothSetText(topScarletSobraFinalVal, `${scarletSobra >= 0 ? "+" : ""}${formatBRL(scarletSobra)}`, scarletSobra >= 0 ? "var(--matrix-green)" : "var(--rose)");
      topScarletSobraFinalVal.style.color = scarletSobra >= 0 ? 'var(--matrix-green)' : 'var(--rose)';
    }

    const topScarletBadge = document.getElementById('topScarletStatusBadge');
    if (topScarletBadge) {
      topScarletBadge.textContent = scarletSobra >= 0 ? 'Sobra Positiva' : 'Fatura > Recursos';
      topScarletBadge.className = scarletSobra >= 0 ? 'unified-badge purple' : 'unified-badge rose';
    }

    // 6. Retrocompatibilidade para seletores legados
    const kpiGanhos = document.getElementById('kpiGanhos');
    if (kpiGanhos) kpiGanhos.textContent = formatBRL(ganhosPecunia);

    const kpiGanhosSub = document.getElementById('kpiGanhosSub');
    if (kpiGanhosSub) kpiGanhosSub.textContent = `Líquido em conta (exclui ${formatBRL(beneficiosNaoPecunia)} em VA/VR)`;

    const kpiFixos = document.getElementById('kpiFixos');
    if (kpiFixos) kpiFixos.textContent = formatBRL(fixos);

    const kpiOutros = document.getElementById('kpiOutros');
    if (kpiOutros) kpiOutros.textContent = formatBRL(outros + diarios);

    const saldoEl = document.getElementById('kpiSaldo');
    if (saldoEl) {
      saldoEl.textContent = formatBRL(saldoLivre);
      saldoEl.style.color = saldoLivre >= 0 ? 'var(--matrix-green)' : 'var(--rose)';
    }

    const kpiSaldoSub = document.getElementById('kpiSaldoSub');
    if (kpiSaldoSub) kpiSaldoSub.textContent = `Folga real em conta corrente`;

    const faturaEl = document.getElementById('kpiFatura');
    if (faturaEl) faturaEl.textContent = formatBRL(faturaNubank);

    const faturaSubEl = document.getElementById('kpiFaturaSub');
    if (faturaSubEl) {
      faturaSubEl.textContent = faturaNubank > 0 
        ? `Scarlet recebe ~${formatBRL(ganhosScarlet)} • Sobra ${formatBRL(sobraFatura)}`
        : 'Sem fatura neste período';
    }

    const dividaEl = document.getElementById('kpiDividaCaixa');
    if (dividaEl) dividaEl.textContent = formatBRL(dividaCaixa);
  }

  // ==========================================
  // DRILLDOWN / AUDITORIA DETALHADA DOS CARDS
  // ==========================================
  function abrirDrilldown(tipo) {
    const state = MatrixDB.getState();
    const monthData = MatrixDB.getMonth(currentYear, currentMonth);
    const titleEl = document.getElementById('drilldownModalTitle');
    const contentEl = document.getElementById('drilldownModalContent');
    const backdrop = document.getElementById('drilldownModalBackdrop');

    if (!titleEl || !contentEl || !backdrop) return;

    let html = '';
    const periodLabel = `${currentMonth} de ${currentYear}`;

    if (tipo === 'saldo') {
      titleEl.innerHTML = `💵 Auditoria da Folga de Caixa (${periodLabel})`;

      let va = 2050.00;
      let vr = 1105.00;
      if (currentYear === '2026' && currentMonth === 'Novembro') {
        va = (state.satellites && state.satellites.maracaju && state.satellites.maracaju.saldoVaRestante != null)
          ? state.satellites.maracaju.saldoVaRestante
          : 2059.84;
        vr = (state.satellites && state.satellites.maracaju && state.satellites.maracaju.saldoVrRestante != null)
          ? state.satellites.maracaju.saldoVrRestante
          : 1105.16;
      } else if (monthData.totais) {
        if (monthData.totais['VA'] != null) va = parseFloat(monthData.totais['VA']) || va;
        if (monthData.totais['VR'] != null) vr = parseFloat(monthData.totais['VR']) || vr;
      }
      if (monthData.vaManual != null) va = parseFloat(monthData.vaManual) || va;
      if (monthData.vrManual != null) vr = parseFloat(monthData.vrManual) || vr;
      const beneficiosNaoPecunia = Math.round((va + vr) * 100) / 100;

      let ganhosPecunia = 0;
      if (monthData.receitas && monthData.receitas.length > 0) {
        monthData.receitas.forEach(it => {
          const val = parseFloat(it.valor) || 0;
          if (!isBeneficioNaoPecunia(it)) {
            ganhosPecunia += val;
          }
        });
      } else if (monthData.totais && monthData.totais['Subtotal Ganhos']) {
        ganhosPecunia = parseFloat(monthData.totais['Subtotal Ganhos']) || 0;
      } else if (monthData.totais && monthData.totais['Salário Mensal']) {
        ganhosPecunia = parseFloat(monthData.totais['Salário Mensal']) || 0;
        if (monthData.totais['Estúdio']) ganhosPecunia += parseFloat(monthData.totais['Estúdio']) || 0;
        if (monthData.totais['13º']) ganhosPecunia += parseFloat(monthData.totais['13º']) || 0;
      } else {
        ganhosPecunia = 5788.19;
      }

      const fixos = (monthData.fixos || []).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
      const outros = (monthData.outros || []).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
      const diarios = (monthData.diarios || []).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
      let contasInicio = 0;
      if (currentMonth === 'Janeiro' && monthData.totais && monthData.totais['Contas Inicio Ano']) {
        contasInicio = parseFloat(monthData.totais['Contas Inicio Ano']) || 0;
      }

      const totalGastos = fixos + outros + diarios + contasInicio;
      const saldo = ganhosPecunia - totalGastos;

      html = `
        <div style="font-family:var(--font-mono);font-size:12.5px;line-height:1.9;">
          <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:14px;border-radius:var(--radius-sm);margin-bottom:14px;">
            <div style="color:var(--text-muted);font-size:11px;text-transform:uppercase;margin-bottom:6px;">Fórmula de Fechamento de Caixa:</div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--cyan);">(+) Ganhos (Conta Corrente):</span>
              <strong>${formatBRL(ganhosPecunia)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--amber);">(-) Gastos Fixos:</span>
              <span>- ${formatBRL(fixos)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--rose);">(-) Gastos Variáveis & Aportes:</span>
              <span>- ${formatBRL(outros + diarios)}</span>
            </div>
            ${contasInicio > 0 ? `
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--amber);">(-) Contas Início de Ano (Janeiro):</span>
              <span>- ${formatBRL(contasInicio)}</span>
            </div>` : ''}
            <div style="border-top:1px solid var(--border-dim);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-size:14px;">
              <strong style="color:var(--text-main);">(=) Folga Real de Caixa:</strong>
              <strong style="color:${saldo >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};">${formatBRL(saldo)}</strong>
            </div>
          </div>

          <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.3);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-weight:700;color:var(--amber);font-size:11.5px;">🛒 Benefícios Alimentação (VA + VR):</span>
              <strong style="color:var(--amber);">${formatBRL(beneficiosNaoPecunia)}</strong>
            </div>
            <div style="color:var(--text-dim);font-size:10.5px;line-height:1.5;">
              Vales Alimentação (VA) e Refeição (VR) <strong>NÃO entram neste cálculo</strong> porque são créditos restritos para supermercado e refeições, não constituindo dinheiro líquido em conta bancária para pagar contas, boletos ou financiamentos.
            </div>
          </div>

          <p style="color:var(--text-muted);font-size:11px;line-height:1.6;">
            💡 <strong>Referência:</strong> Este cálculo indica exatamente o montante de dinheiro líquido disponível em conta bancária após honrar todos os pagamentos e aportes planejados para <strong>${periodLabel}</strong>.
          </p>
        </div>
      `;

    } else if (tipo === 'sobra_matheus') {
      titleEl.innerHTML = `👨 Auditoria da Sobra Pessoal • Matheus (${periodLabel})`;
      const calcM = calcSobraMatheus(currentYear, currentMonth);
      const ganhosMatheusTot = calcM.ganhos;
      const fixosMatheusPago = calcM.fixosPago;
      const fixosMatheusPendente = calcM.fixosPendente;
      const outrosMatheusPago = calcM.outrosPago;
      const outrosMatheusPendente = calcM.outrosPendente;
      const diariosMatheusTot = calcM.diarios;
      const contasInicioVal = calcM.contasInicio;
      const transfScarletPago = calcM.transfPaga;
      const transfScarletPendente = calcM.transfPendente;
      const contasPropriasTot = calcM.gastosPropriosPago;
      const sobraFinalMatheus = calcM.sobra;
      const sobraPrevistaMatheus = calcM.sobraPrevista;
      const totalPendente = calcM.totalGastosPendente;

      html = `
        <div style="font-family:var(--font-mono);font-size:12.5px;line-height:1.8;">
          <!-- Equação Visual Principal -->
          <div class="unified-equation-banner green-banner" style="margin-bottom:12px;">
            <div class="eq-part">
              <span class="eq-label">Renda Recebida</span>
              <strong class="eq-val" style="color:var(--cyan);">${formatBRL(ganhosMatheusTot)}</strong>
            </div>
            <span class="eq-op" style="color:var(--cyan);">-</span>
            <div class="eq-part">
              <span class="eq-label">Contas Pagas</span>
              <strong class="eq-val" style="color:var(--rose);">${formatBRL(contasPropriasTot)}</strong>
            </div>
            <span class="eq-op" style="color:var(--cyan);">-</span>
            <div class="eq-part">
              <span class="eq-label">Transf. Paga</span>
              <strong class="eq-val" style="color:var(--amber);">${formatBRL(transfScarletPago)}</strong>
            </div>
            <span class="eq-op" style="color:var(--cyan);">=</span>
            <div class="eq-part">
              <span class="eq-label">Sobra em Conta</span>
              <strong class="eq-val" style="color:${sobraFinalMatheus >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};">${sobraFinalMatheus >= 0 ? '+' : ''}${formatBRL(sobraFinalMatheus)}</strong>
            </div>
          </div>

          <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:14px;border-radius:var(--radius-sm);margin-bottom:14px;">
            <div style="color:var(--text-muted);font-size:11px;text-transform:uppercase;margin-bottom:8px;">Detalhamento das Contas & Repasses em Tempo Real:</div>
            
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--cyan);">(+) Salário USP + Renda Extra Recebida em Conta:</span>
              <strong>${formatBRL(ganhosMatheusTot)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--amber);">(-) Gastos Fixos Pagos (Parcela Caixa, Contas):</span>
              <span>- ${formatBRL(fixosMatheusPago)} ${fixosMatheusPendente > 0 ? `<span style="font-size:10px;color:var(--text-muted);">(⏳ ${formatBRL(fixosMatheusPendente)} pendente)</span>` : ''}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--rose);">(-) Gastos Variáveis & Diários Pagos:</span>
              <span>- ${formatBRL(outrosMatheusPago + diariosMatheusTot)} ${outrosMatheusPendente > 0 ? `<span style="font-size:10px;color:var(--text-muted);">(⏳ ${formatBRL(outrosMatheusPendente)} pendente)</span>` : ''}</span>
            </div>
            ${contasInicioVal > 0 ? `
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--amber);">(-) Contas Início de Ano (Jan):</span>
              <span>- ${formatBRL(contasInicioVal)}</span>
            </div>` : ''}
            <div style="display:flex;justify-content:space-between;border-top:1px dashed rgba(255,255,255,0.08);padding-top:4px;margin-top:4px;">
              <span style="color:#f59e0b;">(-) Transferência para Scarlet (Pix):</span>
              <strong style="color:#f59e0b;">- ${formatBRL(transfScarletPago)} ${transfScarletPendente > 0 ? `<span style="font-size:10px;color:var(--text-muted);">(⏳ ${formatBRL(transfScarletPendente)} pendente - ainda no seu caixa)</span>` : ''}</strong>
            </div>

            <div style="border-top:1px solid var(--border-dim);margin-top:10px;padding-top:8px;display:flex;justify-content:space-between;font-size:14px;">
              <strong style="color:var(--text-main);">(=) Sobra em Conta Hoje (Líquido BB):</strong>
              <strong style="color:${sobraFinalMatheus >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};">${sobraFinalMatheus >= 0 ? '+' : ''}${formatBRL(sobraFinalMatheus)}</strong>
            </div>

            ${totalPendente > 0 ? `
            <div style="border-top:1px dashed rgba(255,255,255,0.08);margin-top:8px;padding-top:6px;display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-muted);">
              <span>⏳ Contas & Repasses Pendentes (A Pagar):</span>
              <span style="color:var(--amber);">- ${formatBRL(totalPendente)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:700;color:var(--matrix-green);margin-top:2px;">
              <span>(=) Sobra Prevista Final do Mês (Pós-Quitação):</span>
              <span style="color:${sobraPrevistaMatheus >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};">${sobraPrevistaMatheus >= 0 ? '+' : ''}${formatBRL(sobraPrevistaMatheus)}</span>
            </div>` : ''}
          </div>

          <div style="background:rgba(0,255,65,0.05);border:1px solid var(--border-glow);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:12px;font-size:11px;color:var(--text-bright);line-height:1.5;">
            💡 <strong>Regra de Caixa em Tempo Real:</strong> Se uma despesa própria ou a transferência para a Scarlet ainda estiver como <code>[PENDENTE]</code>, o valor <strong>não é debitado antecipadamente</strong> e <strong>continua sobrando no seu saldo líquido em conta</strong>. Ao alternar para <code>[PAGO]</code>, o valor é deduzido na hora e repassado aos recursos da Scarlet.
          </div>
        </div>
      `;
    } else if (tipo === 'ganhos') {
      titleEl.innerHTML = `📥 Detalhamento de Ganhos (${periodLabel})`;
      const todasReceitas = (monthData.receitas && monthData.receitas.length > 0)
        ? JSON.parse(JSON.stringify(monthData.receitas))
        : [];
      
      const salUspVal = getSalarioLiquidoMes(currentYear, currentMonth);
      const fisioVal = getGanhosScarletMes(currentYear, currentMonth);
      const outrasRendasScarletVal = getOutrasRendasScarletMes(currentYear, currentMonth);
      const scarletTotalVal = fisioVal + outrasRendasScarletVal;

      // Se atendimentos de Scarlet não estiverem no array de receitas, insere na visualização
      const temFisioNoArray = todasReceitas.some(r => isReceitaFisioFlowBase(r));
      if (!temFisioNoArray && fisioVal > 0) {
        todasReceitas.push({
          id: 'sat_fisioflow_view',
          nome: 'Ganhos Scarlet (FisioFlow)',
          categoria: 'Atendimentos / Scarlet',
          valor: fisioVal,
          pago: true
        });
      }

      const receitasPecunia = todasReceitas.filter(r => !isBeneficioNaoPecunia(r));
      const beneficiosNaoPecunia = todasReceitas.filter(r => isBeneficioNaoPecunia(r));
      const totalPecunia = receitasPecunia.reduce((a, b) => a + (parseFloat(b.valor) || 0), 0);
      const totalNaoPecunia = beneficiosNaoPecunia.reduce((a, b) => a + (parseFloat(b.valor) || 0), 0);
      let rendaExtraVal = 0;
      receitasPecunia.forEach(r => {
        if (isReceitaExtraMatheus(r)) {
          rendaExtraVal += (parseFloat(r.valor) || 0);
        }
      });

      html = `
        <div style="font-family:var(--font-mono);font-size:12px;">
          <!-- Equação Visual de Ganhos -->
          <div class="unified-equation-banner cyan-banner" style="margin-bottom:12px;">
            <div class="eq-part">
              <span class="eq-label">Salário USP</span>
              <strong class="eq-val" style="color:var(--cyan);">${formatBRL(salUspVal)}</strong>
            </div>
            <span class="eq-op" style="color:var(--cyan);">+</span>
            <div class="eq-part">
              <span class="eq-label">Renda Extra</span>
              <strong class="eq-val" style="color:var(--matrix-green);">${formatBRL(rendaExtraVal)}</strong>
            </div>
            <span class="eq-op" style="color:var(--cyan);">+</span>
            <div class="eq-part">
              <span class="eq-label">Scarlet Total</span>
              <strong class="eq-val" style="color:var(--cyan);">${formatBRL(scarletTotalVal)}</strong>
            </div>
            <span class="eq-op" style="color:var(--cyan);">=</span>
            <div class="eq-part">
              <span class="eq-label">Total Pecúnia</span>
              <strong class="eq-val" style="color:var(--text-bright);">${formatBRL(salUspVal + rendaExtraVal + scarletTotalVal)}</strong>
            </div>
          </div>

          <!-- Bloco Receitas em Pecúnia -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-weight:700;color:var(--cyan);font-size:12px;text-transform:uppercase;">💵 Proventos em Pecúnia (Dinheiro em Conta):</span>
            <strong style="color:var(--cyan);font-size:13px;">${formatBRL(totalPecunia)}</strong>
          </div>
          <table class="data-table" style="margin-bottom:16px;">
            <thead>
              <tr>
                <th>Fonte de Receita</th>
                <th>Status</th>
                <th style="text-align:right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${receitasPecunia.length === 0 ? `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">Nenhum provento cadastrado.</td></tr>` : receitasPecunia.map(it => `
                <tr>
                  <td>
                    <strong>${it.nome}</strong>
                    <div style="font-size:10px;color:var(--text-dim);">${it.categoria || 'Salário / Proventos'}</div>
                  </td>
                  <td>
                    <span class="status-badge ${it.pago ? 'pago' : 'pendente'}">
                      ${it.pago ? '✅ Recebido' : '⏳ A Receber'}
                    </span>
                  </td>
                  <td class="val-col" style="color:var(--cyan);font-weight:700;">${formatBRL(it.valor)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Bloco Benefícios Não Pecúnia -->
          <div style="background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.25);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-weight:700;color:var(--amber);font-size:11.5px;text-transform:uppercase;">🛒 Benefícios de Alimentação (Não Pecúnia):</span>
              <strong style="color:var(--amber);font-size:12.5px;">${formatBRL(totalNaoPecunia)}</strong>
            </div>
            <table class="data-table" style="font-size:11.5px;">
              <thead>
                <tr>
                  <th>Benefício</th>
                  <th>Finalidade</th>
                  <th style="text-align:right;">Crédito</th>
                </tr>
              </thead>
              <tbody>
                ${beneficiosNaoPecunia.map(it => `
                  <tr>
                    <td><strong>${it.nome}</strong></td>
                    <td style="color:var(--text-dim);font-size:10.5px;">Alimentação / Refeição</td>
                    <td class="val-col" style="color:var(--amber);font-weight:700;">${formatBRL(it.valor)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div style="margin-top:8px;font-size:10.5px;color:var(--text-muted);line-height:1.4;">
              * Estes vales não são dinheiro em conta corrente para pagamento de despesas gerais e por isso foram excluídos do saldo de folga de caixa.
            </div>
          </div>
        </div>
      `;

    } else if (tipo === 'gastos_totais' || tipo === 'gastos') {
      titleEl.innerHTML = `💸 Detalhamento dos Gastos Totais (${periodLabel})`;
      const fixos = monthData.fixos || [];
      const outros = monthData.outros || [];
      const diarios = monthData.diarios || [];
      const totalFixos = fixos.reduce((a, b) => a + (parseFloat(b.valor) || 0), 0);
      const totalOutros = outros.reduce((a, b) => a + (parseFloat(b.valor) || 0), 0);
      const totalDiarios = diarios.reduce((a, b) => a + (parseFloat(b.valor) || 0), 0);
      let contasInicio = 0;
      if (currentMonth === 'Janeiro' && monthData.totais && monthData.totais['Contas Inicio Ano']) {
        contasInicio = parseFloat(monthData.totais['Contas Inicio Ano']) || 0;
      }
      const totalGastos = totalFixos + totalOutros + totalDiarios + contasInicio;
      const faturaNubank = getFaturaNubankMes(currentYear, currentMonth);
      const totalComNubank = totalGastos + faturaNubank;

      const renderGastosTabs = (activeTab) => `
        <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;border-bottom:1px solid var(--border-dim);padding-bottom:10px;">
          <button type="button" class="btn-matrix ${activeTab === 'todos' ? '' : 'secondary'}" style="font-size:11px;padding:4px 10px;${activeTab === 'todos' ? 'background:var(--matrix-green);color:#050807;font-weight:bold;' : ''}" onclick="MatrixApp.abrirDrilldown('gastos_totais')">📊 Todos (${formatBRL(totalGastos)})</button>
          <button type="button" class="btn-matrix ${activeTab === 'fixos' ? '' : 'secondary'}" style="font-size:11px;padding:4px 10px;${activeTab === 'fixos' ? 'background:var(--amber);color:#050807;font-weight:bold;' : ''}" onclick="MatrixApp.abrirDrilldown('fixos')">🔒 Fixos (${formatBRL(totalFixos)})</button>
          <button type="button" class="btn-matrix ${activeTab === 'outros' ? '' : 'secondary'}" style="font-size:11px;padding:4px 10px;${activeTab === 'outros' ? 'background:var(--rose);color:#fff;font-weight:bold;' : ''}" onclick="MatrixApp.abrirDrilldown('outros')">🛍️ Variáveis (${formatBRL(totalOutros)})</button>
          <button type="button" class="btn-matrix ${activeTab === 'diarios' ? '' : 'secondary'}" style="font-size:11px;padding:4px 10px;${activeTab === 'diarios' ? 'background:var(--cyan);color:#050807;font-weight:bold;' : ''}" onclick="MatrixApp.abrirDrilldown('diarios')">⚡ Diários (${formatBRL(totalDiarios)})</button>
          <button type="button" class="btn-matrix secondary" style="font-size:11px;padding:4px 10px;background:rgba(192,132,252,0.15);color:var(--purple);font-weight:bold;border:1px solid rgba(192,132,252,0.4);" onclick="MatrixApp.abrirDrilldown('fatura')">🟣 Fatura Nubank (${formatBRL(faturaNubank)})</button>
        </div>
      `;

      html = `
        <div style="font-family:var(--font-mono);font-size:12px;">
          ${renderGastosTabs('todos')}

          <!-- Cards Resumo no Topo: 2 Cálculos + Detalhes -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:8px;margin-bottom:16px;">
            <div style="background:var(--bg-card);border:1px solid rgba(234,179,8,0.4);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:10.5px;color:var(--amber);text-transform:uppercase;font-weight:700;">1. Sem Nubank (Conta)</div>
              <div style="font-size:16px;font-weight:bold;color:var(--amber);margin-top:2px;">${formatBRL(totalGastos)}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Fixos + Var. + Diários</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid rgba(244,63,94,0.4);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:10.5px;color:var(--rose);text-transform:uppercase;font-weight:700;">2. Com Nubank (Total)</div>
              <div style="font-size:16px;font-weight:bold;color:var(--rose);margin-top:2px;">${formatBRL(totalComNubank)}</div>
              <div style="font-size:10px;color:var(--purple);margin-top:2px;">Compromisso total c/ cartão</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid rgba(251,191,36,0.3);padding:10px;border-radius:var(--radius-sm);cursor:pointer;" onclick="MatrixApp.abrirDrilldown('fixos')">
              <div style="font-size:10.5px;color:var(--amber);text-transform:uppercase;">🔒 Gastos Fixos</div>
              <div style="font-size:15px;font-weight:bold;color:var(--amber);margin-top:2px;">${formatBRL(totalFixos)}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">${fixos.length} despesas</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid rgba(244,63,94,0.3);padding:10px;border-radius:var(--radius-sm);cursor:pointer;" onclick="MatrixApp.abrirDrilldown('outros')">
              <div style="font-size:10.5px;color:var(--rose);text-transform:uppercase;">🛍️ Gastos Variáveis</div>
              <div style="font-size:15px;font-weight:bold;color:var(--rose);margin-top:2px;">${formatBRL(totalOutros)}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">${outros.length} despesas</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid rgba(6,182,212,0.3);padding:10px;border-radius:var(--radius-sm);cursor:pointer;" onclick="MatrixApp.abrirDrilldown('diarios')">
              <div style="font-size:10.5px;color:var(--cyan);text-transform:uppercase;">⚡ Gastos Diários</div>
              <div style="font-size:15px;font-weight:bold;color:var(--cyan);margin-top:2px;">${formatBRL(totalDiarios)}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">${diarios.length} lançamentos</div>
            </div>
            ${contasInicio > 0 ? `
            <div style="background:var(--bg-card);border:1px solid var(--amber);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:10.5px;color:var(--amber);text-transform:uppercase;">⚠️ Início de Ano</div>
              <div style="font-size:15px;font-weight:bold;color:var(--amber);margin-top:2px;">${formatBRL(contasInicio)}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Janeiro</div>
            </div>` : ''}
          </div>

          <!-- BLOCO 1: GASTOS FIXOS -->
          <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:12px 14px;border-radius:var(--radius-sm);margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <strong style="color:var(--amber);font-size:13px;display:flex;align-items:center;gap:6px;">
                <span>🔒</span> Gastos Fixos (${fixos.length} itens)
              </strong>
              <span style="font-weight:bold;color:var(--amber);font-size:13px;">${formatBRL(totalFixos)}</span>
            </div>
            <div style="max-height:220px;overflow-y:auto;">
              <table class="data-table" style="font-size:11.5px;margin:0;">
                <thead>
                  <tr><th>Despesa Fixa</th><th>Categoria</th><th>Status</th><th style="text-align:right;">Valor</th></tr>
                </thead>
                <tbody>
                  ${fixos.length === 0 ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Nenhum gasto fixo cadastrado.</td></tr>` : fixos.map(f => `
                    <tr class="${f.pago ? 'paid' : ''}">
                      <td><strong>${f.nome}</strong></td>
                      <td><span class="status-badge" style="font-size:9.5px;">${f.categoria || 'Habitação'}</span></td>
                      <td><span class="status-badge ${f.pago ? 'pago' : 'pendente'}" style="font-size:9.5px;">${f.pago ? 'Pago' : 'Pendente'}</span></td>
                      <td class="val-col" style="color:var(--amber);">${formatBRL(f.valor)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- BLOCO 2: GASTOS VARIÁVEIS -->
          <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:12px 14px;border-radius:var(--radius-sm);margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <strong style="color:var(--rose);font-size:13px;display:flex;align-items:center;gap:6px;">
                <span>🛍️</span> Gastos Variáveis & Aportes (${outros.length} itens)
              </strong>
              <span style="font-weight:bold;color:var(--rose);font-size:13px;">${formatBRL(totalOutros)}</span>
            </div>
            <div style="max-height:220px;overflow-y:auto;">
              <table class="data-table" style="font-size:11.5px;margin:0;">
                <thead>
                  <tr><th>Item / Fatura</th><th>Categoria</th><th>Status</th><th style="text-align:right;">Valor</th></tr>
                </thead>
                <tbody>
                  ${outros.length === 0 ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Nenhum gasto variável cadastrado.</td></tr>` : outros.map(o => `
                    <tr class="${o.pago ? 'paid' : ''}">
                      <td><strong>${o.nome}</strong></td>
                      <td><span class="status-badge" style="font-size:9.5px;">${o.categoria || 'Outros'}</span></td>
                      <td><span class="status-badge ${o.pago ? 'pago' : 'pendente'}" style="font-size:9.5px;">${o.pago ? 'Pago' : 'Pendente'}</span></td>
                      <td class="val-col" style="color:var(--rose);">${formatBRL(o.valor)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- BLOCO 3: GASTOS DIÁRIOS -->
          <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:12px 14px;border-radius:var(--radius-sm);margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <strong style="color:var(--cyan);font-size:13px;display:flex;align-items:center;gap:6px;">
                <span>⚡</span> Gastos Diários (${diarios.length} lançamentos)
              </strong>
              <span style="font-weight:bold;color:var(--cyan);font-size:13px;">${formatBRL(totalDiarios)}</span>
            </div>
            ${diarios.length === 0 ? `
              <div style="color:var(--text-muted);font-size:11px;text-align:center;padding:12px;background:rgba(255,255,255,0.02);border:1px dashed var(--border-dim);border-radius:var(--radius-xs);">
                Nenhum gasto diário registrado neste mês. Lançamentos diários rápidos no Débito Inter somam aqui em tempo real.
              </div>
            ` : `
            <div style="max-height:220px;overflow-y:auto;">
              <table class="data-table" style="font-size:11.5px;margin:0;">
                <thead>
                  <tr><th>Descrição</th><th>Data</th><th>Categoria</th><th>Status</th><th style="text-align:right;">Valor</th></tr>
                </thead>
                <tbody>
                  ${diarios.map(d => {
                    let dtFmt = '';
                    if (d.dataHora) {
                      const p = d.dataHora.split('T');
                      const dataP = p[0] ? p[0].split('-').reverse().join('/') : '';
                      const horaP = p[1] ? p[1].slice(0, 5) : '';
                      dtFmt = `${dataP} ${horaP}`.trim();
                    }
                    return `
                      <tr class="${d.pago ? 'paid' : ''}">
                        <td><strong>${d.nome}</strong></td>
                        <td><small style="color:var(--text-dim);">${dtFmt || 'Mês vigente'}</small></td>
                        <td><span class="status-badge" style="font-size:9.5px;">${d.categoria || 'Gasto Diário'}</span></td>
                        <td><span class="status-badge ${d.pago ? 'pago' : 'pendente'}" style="font-size:9.5px;">${d.pago ? 'Pago' : 'Pendente'}</span></td>
                        <td class="val-col" style="color:var(--cyan);font-weight:bold;">${formatBRL(d.valor)}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
            `}
          </div>

          <!-- BLOCO 4: FATURA NUBANK BLACK -->
          <div style="background:var(--bg-card);border:1px solid rgba(192,132,252,0.3);padding:12px 14px;border-radius:var(--radius-sm);margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
              <strong style="color:var(--purple);font-size:13px;display:flex;align-items:center;gap:6px;">
                <span>🟣</span> Fatura Nubank Black (Cartão de Crédito)
              </strong>
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-weight:bold;color:var(--purple);font-size:14px;">${formatBRL(faturaNubank)}</span>
                <button type="button" class="btn-matrix secondary" style="font-size:10.5px;padding:3px 8px;color:var(--purple);border-color:var(--purple);" onclick="MatrixApp.abrirDrilldown('fatura')">Ver Fatura Completa ➔</button>
              </div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:6px;">
              Fatura mensal do cartão de crédito Ultravioleta / Black vinculada ao mês de referência.
            </div>
          </div>

          <!-- Rodapé Consolidado com os 2 Cálculos -->
          <div style="background:rgba(0,0,0,0.4);border:1px solid var(--border-glow);border-radius:var(--radius-sm);padding:10px 14px;display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
              <span style="font-size:12px;color:var(--amber);font-weight:700;">
                1. Fixos + Variáveis + Diários (Conta Corrente):
              </span>
              <strong style="font-size:14px;color:var(--amber);">${formatBRL(totalGastos)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border-top:1px dashed var(--border-dim);padding-top:6px;">
              <span style="font-size:12px;color:var(--rose);font-weight:700;">
                2. Fixos + Variáveis + Diários + Nubank (Compromisso Total):
              </span>
              <strong style="font-size:15px;color:var(--rose);">${formatBRL(totalComNubank)}</strong>
            </div>
          </div>
        </div>
      `;

    } else if (tipo === 'fixos') {
      titleEl.innerHTML = `🔒 Detalhamento dos Gastos Fixos (${periodLabel})`;
      const fixos = monthData.fixos || [];
      const outros = monthData.outros || [];
      const diarios = monthData.diarios || [];
      const totalFixos = fixos.reduce((a, b) => a + (parseFloat(b.valor) || 0), 0);
      const totalOutros = outros.reduce((a, b) => a + (parseFloat(b.valor) || 0), 0);
      const totalDiarios = diarios.reduce((a, b) => a + (parseFloat(b.valor) || 0), 0);
      let contasInicio = 0;
      if (currentMonth === 'Janeiro' && monthData.totais && monthData.totais['Contas Inicio Ano']) {
        contasInicio = parseFloat(monthData.totais['Contas Inicio Ano']) || 0;
      }
      const totalGastos = totalFixos + totalOutros + totalDiarios + contasInicio;

      const renderGastosTabs = (activeTab) => `
        <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;border-bottom:1px solid var(--border-dim);padding-bottom:10px;">
          <button type="button" class="btn-matrix ${activeTab === 'todos' ? '' : 'secondary'}" style="font-size:11px;padding:4px 10px;${activeTab === 'todos' ? 'background:var(--matrix-green);color:#050807;font-weight:bold;' : ''}" onclick="MatrixApp.abrirDrilldown('gastos_totais')">📊 Todos (${formatBRL(totalGastos)})</button>
          <button type="button" class="btn-matrix ${activeTab === 'fixos' ? '' : 'secondary'}" style="font-size:11px;padding:4px 10px;${activeTab === 'fixos' ? 'background:var(--amber);color:#050807;font-weight:bold;' : ''}" onclick="MatrixApp.abrirDrilldown('fixos')">🔒 Fixos (${formatBRL(totalFixos)})</button>
          <button type="button" class="btn-matrix ${activeTab === 'outros' ? '' : 'secondary'}" style="font-size:11px;padding:4px 10px;${activeTab === 'outros' ? 'background:var(--rose);color:#fff;font-weight:bold;' : ''}" onclick="MatrixApp.abrirDrilldown('outros')">🛍️ Variáveis (${formatBRL(totalOutros)})</button>
          <button type="button" class="btn-matrix ${activeTab === 'diarios' ? '' : 'secondary'}" style="font-size:11px;padding:4px 10px;${activeTab === 'diarios' ? 'background:var(--cyan);color:#050807;font-weight:bold;' : ''}" onclick="MatrixApp.abrirDrilldown('diarios')">⚡ Diários (${formatBRL(totalDiarios)})</button>
        </div>
      `;

      html = `
        <div style="font-family:var(--font-mono);font-size:12px;">
          ${renderGastosTabs('fixos')}
          <div style="max-height:360px;overflow-y:auto;">
            <table class="data-table">
              <thead>
                <tr><th>Despesa</th><th>Status</th><th style="text-align:right;">Valor</th></tr>
              </thead>
              <tbody>
                ${fixos.map(f => `
                  <tr class="${f.pago ? 'paid' : ''}">
                    <td><strong>${f.nome}</strong></td>
                    <td><span class="status-badge ${f.pago ? 'pago' : 'pendente'}">${f.pago ? 'Pago' : 'Pendente'}</span></td>
                    <td class="val-col">${formatBRL(f.valor)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div style="border-top:1px solid var(--border-dim);margin-top:10px;padding-top:8px;display:flex;justify-content:space-between;font-size:13px;">
            <strong>Total Gastos Fixos:</strong>
            <strong style="color:var(--amber);">${formatBRL(totalFixos)}</strong>
          </div>
        </div>
      `;

    } else if (tipo === 'outros') {
      titleEl.innerHTML = `🛍️ Detalhamento dos Gastos Variáveis & Aportes (${periodLabel})`;
      const fixos = monthData.fixos || [];
      const outros = monthData.outros || [];
      const diarios = monthData.diarios || [];
      const totalFixos = fixos.reduce((a, b) => a + (parseFloat(b.valor) || 0), 0);
      const totalOutros = outros.reduce((a, b) => a + (parseFloat(b.valor) || 0), 0);
      const totalDiarios = diarios.reduce((a, b) => a + (parseFloat(b.valor) || 0), 0);
      let contasInicio = 0;
      if (currentMonth === 'Janeiro' && monthData.totais && monthData.totais['Contas Inicio Ano']) {
        contasInicio = parseFloat(monthData.totais['Contas Inicio Ano']) || 0;
      }
      const totalGastos = totalFixos + totalOutros + totalDiarios + contasInicio;

      const renderGastosTabs = (activeTab) => `
        <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;border-bottom:1px solid var(--border-dim);padding-bottom:10px;">
          <button type="button" class="btn-matrix ${activeTab === 'todos' ? '' : 'secondary'}" style="font-size:11px;padding:4px 10px;${activeTab === 'todos' ? 'background:var(--matrix-green);color:#050807;font-weight:bold;' : ''}" onclick="MatrixApp.abrirDrilldown('gastos_totais')">📊 Todos (${formatBRL(totalGastos)})</button>
          <button type="button" class="btn-matrix ${activeTab === 'fixos' ? '' : 'secondary'}" style="font-size:11px;padding:4px 10px;${activeTab === 'fixos' ? 'background:var(--amber);color:#050807;font-weight:bold;' : ''}" onclick="MatrixApp.abrirDrilldown('fixos')">🔒 Fixos (${formatBRL(totalFixos)})</button>
          <button type="button" class="btn-matrix ${activeTab === 'outros' ? '' : 'secondary'}" style="font-size:11px;padding:4px 10px;${activeTab === 'outros' ? 'background:var(--rose);color:#fff;font-weight:bold;' : ''}" onclick="MatrixApp.abrirDrilldown('outros')">🛍️ Variáveis (${formatBRL(totalOutros)})</button>
          <button type="button" class="btn-matrix ${activeTab === 'diarios' ? '' : 'secondary'}" style="font-size:11px;padding:4px 10px;${activeTab === 'diarios' ? 'background:var(--cyan);color:#050807;font-weight:bold;' : ''}" onclick="MatrixApp.abrirDrilldown('diarios')">⚡ Diários (${formatBRL(totalDiarios)})</button>
        </div>
      `;

      html = `
        <div style="font-family:var(--font-mono);font-size:12px;">
          ${renderGastosTabs('outros')}
          <div style="max-height:360px;overflow-y:auto;">
            <table class="data-table">
              <thead>
                <tr><th>Item / Destino</th><th>Status</th><th style="text-align:right;">Valor</th></tr>
              </thead>
              <tbody>
                ${outros.map(o => `
                  <tr class="${o.pago ? 'paid' : ''}">
                    <td><strong>${o.nome}</strong></td>
                    <td><span class="status-badge ${o.pago ? 'pago' : 'pendente'}">${o.pago ? 'Pago' : 'Pendente'}</span></td>
                    <td class="val-col">${formatBRL(o.valor)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div style="border-top:1px solid var(--border-dim);margin-top:10px;padding-top:8px;display:flex;justify-content:space-between;font-size:13px;">
            <strong>Total Variáveis & Aportes:</strong>
            <strong style="color:var(--rose);">${formatBRL(totalOutros)}</strong>
          </div>
        </div>
      `;

    } else if (tipo === 'diarios') {
      titleEl.innerHTML = `⚡ Detalhamento dos Gastos Diários (${periodLabel})`;
      const fixos = monthData.fixos || [];
      const outros = monthData.outros || [];
      const diarios = monthData.diarios || [];
      const totalFixos = fixos.reduce((a, b) => a + (parseFloat(b.valor) || 0), 0);
      const totalOutros = outros.reduce((a, b) => a + (parseFloat(b.valor) || 0), 0);
      const totalDiarios = diarios.reduce((a, b) => a + (parseFloat(b.valor) || 0), 0);
      let contasInicio = 0;
      if (currentMonth === 'Janeiro' && monthData.totais && monthData.totais['Contas Inicio Ano']) {
        contasInicio = parseFloat(monthData.totais['Contas Inicio Ano']) || 0;
      }
      const totalGastos = totalFixos + totalOutros + totalDiarios + contasInicio;

      const renderGastosTabs = (activeTab) => `
        <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;border-bottom:1px solid var(--border-dim);padding-bottom:10px;">
          <button type="button" class="btn-matrix ${activeTab === 'todos' ? '' : 'secondary'}" style="font-size:11px;padding:4px 10px;${activeTab === 'todos' ? 'background:var(--matrix-green);color:#050807;font-weight:bold;' : ''}" onclick="MatrixApp.abrirDrilldown('gastos_totais')">📊 Todos (${formatBRL(totalGastos)})</button>
          <button type="button" class="btn-matrix ${activeTab === 'fixos' ? '' : 'secondary'}" style="font-size:11px;padding:4px 10px;${activeTab === 'fixos' ? 'background:var(--amber);color:#050807;font-weight:bold;' : ''}" onclick="MatrixApp.abrirDrilldown('fixos')">🔒 Fixos (${formatBRL(totalFixos)})</button>
          <button type="button" class="btn-matrix ${activeTab === 'outros' ? '' : 'secondary'}" style="font-size:11px;padding:4px 10px;${activeTab === 'outros' ? 'background:var(--rose);color:#fff;font-weight:bold;' : ''}" onclick="MatrixApp.abrirDrilldown('outros')">🛍️ Variáveis (${formatBRL(totalOutros)})</button>
          <button type="button" class="btn-matrix ${activeTab === 'diarios' ? '' : 'secondary'}" style="font-size:11px;padding:4px 10px;${activeTab === 'diarios' ? 'background:var(--cyan);color:#050807;font-weight:bold;' : ''}" onclick="MatrixApp.abrirDrilldown('diarios')">⚡ Diários (${formatBRL(totalDiarios)})</button>
        </div>
      `;

      html = `
        <div style="font-family:var(--font-mono);font-size:12px;">
          ${renderGastosTabs('diarios')}
          ${diarios.length === 0 ? `
            <div style="color:var(--text-muted);font-size:11.5px;text-align:center;padding:20px;background:rgba(255,255,255,0.02);border:1px dashed var(--border-dim);border-radius:var(--radius-sm);margin-bottom:12px;">
              Nenhum gasto diário registrado neste mês.<br>
              <button type="button" class="btn-matrix" style="margin-top:10px;font-size:11px;" onclick="MatrixApp.closeModal('drilldownModalBackdrop'); MatrixApp.openQuickExpenseModal();">+ Fazer Lançamento Rápido</button>
            </div>
          ` : `
          <div style="max-height:360px;overflow-y:auto;">
            <table class="data-table">
              <thead>
                <tr><th>Descrição</th><th>Data</th><th>Categoria</th><th>Status</th><th style="text-align:right;">Valor</th></tr>
              </thead>
              <tbody>
                ${diarios.map(d => {
                  let dtFmt = '';
                  if (d.dataHora) {
                    const p = d.dataHora.split('T');
                    const dataP = p[0] ? p[0].split('-').reverse().join('/') : '';
                    const horaP = p[1] ? p[1].slice(0, 5) : '';
                    dtFmt = `${dataP} ${horaP}`.trim();
                  }
                  return `
                    <tr class="${d.pago ? 'paid' : ''}">
                      <td><strong>${d.nome}</strong></td>
                      <td><small style="color:var(--text-dim);">${dtFmt || 'Mês vigente'}</small></td>
                      <td><span class="status-badge" style="font-size:9.5px;">${d.categoria || 'Gasto Diário'}</span></td>
                      <td><span class="status-badge ${d.pago ? 'pago' : 'pendente'}">${d.pago ? 'Pago' : 'Pendente'}</span></td>
                      <td class="val-col" style="color:var(--cyan);font-weight:bold;">${formatBRL(d.valor)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          `}
          <div style="border-top:1px solid var(--border-dim);margin-top:10px;padding-top:8px;display:flex;justify-content:space-between;align-items:center;font-size:13px;">
            <strong>Total Gastos Diários:</strong>
            <strong style="color:var(--cyan);">${formatBRL(totalDiarios)}</strong>
          </div>
        </div>
      `;

    } else if (tipo === 'scarlet') {
      titleEl.innerHTML = `👩‍⚕️ Fluxo & Caixa Scarlet (${periodLabel})`;
      const faturaNubank = getFaturaNubankMes(currentYear, currentMonth);
      const ganhosScarlet = getGanhosScarletMes(currentYear, currentMonth);
      const outrasRendasScarlet = getOutrasRendasScarletMes(currentYear, currentMonth);
      const descOutrasScarlet = getDescOutrasRendasScarletMes(currentYear, currentMonth);
      const calcM = calcSobraMatheus(currentYear, currentMonth);
      const scarletTransf = calcM.transfPaga;
      const scarletTransfPendente = calcM.transfPendente;
      const scarletSubtotal = ganhosScarlet + outrasRendasScarlet + scarletTransf;

      const scarletGastosItems = [...(monthData.fixos || []), ...(monthData.outros || [])]
        .filter(it => isGastoDaScarlet(it) && !isTransferenciaParaScarlet(it) && it.nome !== 'Nubank Scarlet');
      const scarletGastosPropriosTotal = scarletGastosItems.reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
      const scarletGastosPropriosPago = scarletGastosItems.filter(it => it.pago === true).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
      const scarletSobra = scarletSubtotal - faturaNubank - scarletGastosPropriosPago;

      html = `
        <div style="font-family:var(--font-mono);font-size:12.5px;line-height:1.7;">
          <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(192,132,252,0.1);border:1px solid rgba(192,132,252,0.35);padding:10px 14px;border-radius:var(--radius-sm);margin-bottom:14px;flex-wrap:wrap;gap:8px;">
            <span style="color:var(--purple);display:flex;align-items:center;gap:6px;font-weight:bold;">
              👩‍⚕️ Recursos, Fatura e Gastos da Scarlet (${periodLabel})
            </span>
            <div style="display:flex;gap:8px;align-items:center;">
              <button type="button" class="btn-matrix purple" style="font-size:10.5px;padding:3px 8px;" onclick="MatrixApp.closeModal('drilldownModalBackdrop'); MatrixApp.openNewItemModal('fixo', 'scarlet')">+ Novo Gasto Scarlet</button>
              <button type="button" class="btn-matrix" style="font-size:10.5px;padding:3px 8px;" onclick="MatrixApp.closeModal('drilldownModalBackdrop'); MatrixApp.openEditSaldosModal('${currentYear}','${currentMonth}','scarlet')">✏️ Editar Rendas</button>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin-bottom:16px;">
            <div style="background:var(--bg-card);border:1px solid rgba(6,182,212,0.3);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:11px;color:var(--text-muted);">Atendimentos Fisio</div>
              <div style="font-size:15px;font-weight:bold;color:var(--cyan);margin-top:2px;">${formatBRL(ganhosScarlet)}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">FisioFlow M+1</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid rgba(192,132,252,0.3);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:11px;color:var(--text-muted);">${descOutrasScarlet || 'Outras Rendas'}</div>
              <div style="font-size:15px;font-weight:bold;color:var(--purple);margin-top:2px;">${formatBRL(outrasRendasScarlet)}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Rendas extras</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid rgba(245,158,11,0.3);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:11px;color:var(--text-muted);">Transf. do Matheus</div>
              <div style="font-size:15px;font-weight:bold;color:var(--amber);margin-top:2px;">${formatBRL(scarletTransf)}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">${scarletTransfPendente > 0 ? `(⏳ ${formatBRL(scarletTransfPendente)} pendente)` : 'Recebido'}</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid rgba(244,63,94,0.3);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:11px;color:var(--text-muted);">(-) Fatura Nubank</div>
              <div style="font-size:15px;font-weight:bold;color:var(--rose);margin-top:2px;">- ${formatBRL(faturaNubank)}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Cartão Black</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid rgba(192,132,252,0.4);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:11px;color:var(--text-muted);">(=) Sobra Líquida</div>
              <div style="font-size:15px;font-weight:bold;color:${scarletSobra >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};margin-top:2px;">${formatBRL(scarletSobra)}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Saldo livre da Scarlet</div>
            </div>
          </div>

          <!-- Tabela de Gastos Próprios da Scarlet -->
          <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:12px 14px;border-radius:var(--radius-sm);margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <strong style="color:var(--purple);font-size:12.5px;">🧠 Gastos Próprios da Scarlet (Psicóloga, Investimentos, etc.)</strong>
              <span style="font-size:11px;color:var(--rose);">Total: ${formatBRL(scarletGastosPropriosTotal)}</span>
            </div>
            ${scarletGastosItems.length > 0 ? `
              <table class="data-table" style="font-size:11.5px;margin:0;">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>Status</th>
                    <th style="text-align:right;">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${scarletGastosItems.map(it => `
                    <tr class="${it.pago ? 'paid' : ''}">
                      <td><strong>${it.nome}</strong></td>
                      <td><span class="cat-pill" style="color:var(--purple);border-color:rgba(192,132,252,0.3);">${it.categoria || 'Pessoal'}</span></td>
                      <td><span class="status-badge ${it.pago ? 'pago' : 'pendente'}">${it.pago ? '✅ Pago' : '⏳ Pendente'}</span></td>
                      <td style="text-align:right;color:var(--purple);font-weight:bold;">${formatBRL(it.valor)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div style="text-align:center;color:var(--text-muted);padding:12px;font-size:11px;">
                Nenhum gasto próprio cadastrado ainda neste mês.
              </div>
            `}
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <span style="font-size:11px;color:var(--text-muted);">💡 O dinheiro sai diretamente da receita da Scarlet e não afeta as contas correntes do Matheus.</span>
            <button type="button" class="btn-matrix secondary" style="font-size:11px;" onclick="MatrixApp.abrirDrilldown('fatura')">💳 Ver Detalhes da Fatura Nubank →</button>
          </div>
        </div>
      `;

    } else if (tipo === 'fatura') {
      titleEl.innerHTML = `💳 Fatura Nubank Black & Auditoria de Economia (${periodLabel})`;
      const faturaNubank = getFaturaNubankMes(currentYear, currentMonth);
      const isFaturaPaga = !!(monthData.scarlet && monthData.scarlet.faturaPaga === true);
      const ganhosScarlet = getGanhosScarletMes(currentYear, currentMonth);
      const diferenca = Math.max(0, faturaNubank - ganhosScarlet);

      const sat = (state.satellites && state.satellites.faturas) || 
        (typeof SatelliteConnectors !== 'undefined' ? SatelliteConnectors.processFaturasData({}) : {});

      const monthKey = `${currentYear}-${currentMonth}`;
      const satMonth = sat && sat.faturasPorMes && sat.faturasPorMes[monthKey];
      const faturaAtual = faturaNubank;
      const faturasFuturas = sat.faturasFuturasCompromissadas || 1568.05;
      const metaMensal = sat.limiteMetaMensal || 3000.00;
      const itensDoMes = (satMonth && satMonth.itens) || [];

      // Distribuição por categoria ESTRITAMENTE do mês referente
      let cats = {};
      if (satMonth && satMonth.categorias && Object.keys(satMonth.categorias).length > 0) {
        cats = Object.assign({}, satMonth.categorias);
      } else if (itensDoMes && itensDoMes.length > 0) {
        itensDoMes.forEach(it => {
          const c = it.categoria || 'Geral';
          cats[c] = (cats[c] || 0) + (parseFloat(it.valor) || 0);
        });
      } else {
        // Se o App Faturas não tiver itens isolados para este mês,
        // agrupa os gastos variáveis e diários reais do mês ativo no Matrix
        const mObj = MatrixDB.getMonth(currentYear, currentMonth);
        const cardExpenses = [
          ...(mObj.outros || []),
          ...(mObj.diarios || [])
        ].filter(it => it && it.valor > 0 && !MatrixDB.isSummaryOrTotalItem(it.nome));

        if (cardExpenses.length > 0) {
          cardExpenses.forEach(it => {
            const c = it.categoria || 'Gastos Variados';
            cats[c] = (cats[c] || 0) + (parseFloat(it.valor) || 0);
          });
        }
      }

      // Se ainda estiver vazio, mas há valor de fatura ativo
      if (Object.keys(cats).length === 0 && faturaAtual > 0) {
        cats = { 'Cartão de Crédito Nubank': faturaAtual };
      }

      const totalCats = Object.values(cats).reduce((a, b) => a + (parseFloat(b) || 0), 0) || faturaAtual;
      const catConfig = {
        'Alimentação & Gastronomia': { icon: '🍔', color: '#f59e0b' },
        'Alimentação & Lanches': { icon: '🍔', color: '#f59e0b' },
        'Alimentação': { icon: '🍔', color: '#f59e0b' },
        'Compras & E-commerce': { icon: '🛒', color: '#06b6d4' },
        'Transporte & Tag': { icon: '🚗', color: '#8b5cf6' },
        'Transporte': { icon: '🚗', color: '#8b5cf6' },
        'Vestuário & Moda': { icon: '👕', color: '#10b981' },
        'Serviços & Assinaturas': { icon: '📱', color: '#ec4899' },
        'Saúde & Bem-estar': { icon: '🩺', color: '#3b82f6' },
        'Saúde, Estética & Bem-estar': { icon: '🩺', color: '#3b82f6' },
        'Saúde & Farmácia': { icon: '💊', color: '#10b981' },
        'Saúde': { icon: '🩺', color: '#3b82f6' },
        'Pet & Veterinário': { icon: '🐾', color: '#eab308' },
        'Casa & Utilidades': { icon: '🏠', color: '#22c55e' },
        'Habitação': { icon: '🏠', color: '#10b981' },
        'Educação & Cursos': { icon: '📚', color: '#6366f1' },
        'Compras & Variados': { icon: '🛍️', color: '#f97316' },
        'Lazer': { icon: '🎉', color: '#ec4899' },
        'Outros': { icon: '📦', color: '#94a3b8' }
      };

      const sortedCats = Object.entries(cats).sort((a, b) => b[1] - a[1]);

      html = `
        <div style="font-family:var(--font-mono);font-size:12.5px;line-height:1.7;">
          <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(0,255,65,0.08);border:1px solid var(--border-glow);padding:8px 12px;border-radius:var(--radius-sm);margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <span style="color:var(--matrix-green);display:flex;align-items:center;gap:6px;font-weight:bold;">
              <span class="live-pulse"></span> App Faturas Sincronizado em Tempo Real (${periodLabel})
            </span>
            <div style="display:flex;gap:8px;align-items:center;">
              <button type="button" class="status-btn ${isFaturaPaga ? 'pago' : 'pendente'}" style="font-size:10.5px;padding:3px 8px;" onclick="MatrixApp.toggleFaturaNubankPaga('${currentYear}','${currentMonth}'); MatrixApp.abrirDrilldown('fatura');" title="Alternar status de pagamento da fatura">${isFaturaPaga ? '✅ FATURA PAGA' : '⏳ FATURA PENDENTE'}</button>
              <button type="button" class="btn-matrix" style="font-size:10.5px;padding:2px 8px;" onclick="MatrixApp.closeModal('drilldownModalBackdrop'); MatrixApp.openEditSaldosModal('${currentYear}','${currentMonth}')">✏️ Editar Fatura / Saldos</button>
              <span class="lock-pill" title="Os dados desta fatura foram obtidos do aplicativo Faturas">
                💳 Dados Reais Faturas
              </span>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin-bottom:16px;">
            <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:11px;color:var(--text-muted);">Fatura Mês Atual</div>
              <div style="font-size:15px;font-weight:bold;color:var(--rose);margin-top:2px;">${formatBRL(faturaAtual)}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Vencimento dia 10</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:11px;color:var(--text-muted);">Parcelas Futuras</div>
              <div style="font-size:15px;font-weight:bold;color:var(--amber);margin-top:2px;">${formatBRL(faturasFuturas)}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Comprometimento futuro</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:11px;color:var(--text-muted);">Divisão Scarlet (Fisio)</div>
              <div style="font-size:15px;font-weight:bold;color:var(--cyan);margin-top:2px;">${formatBRL(ganhosScarlet)}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Abatimento direto</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:11px;color:var(--text-muted);">Restante Casa (Matheus)</div>
              <div style="font-size:15px;font-weight:bold;color:var(--matrix-green);margin-top:2px;">${formatBRL(diferenca)}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Coberto via Salário USP</div>
            </div>
          </div>

          <!-- Lançamentos Reais da Fatura Sincronizados -->
          ${itensDoMes.length > 0 ? `
          <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:12px 14px;border-radius:var(--radius-sm);margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <strong style="color:var(--text-main);font-size:13px;">📋 Lançamentos Reais Desta Fatura (${itensDoMes.length} compras)</strong>
              <span style="font-size:11px;color:var(--cyan);">Soma: ${formatBRL(faturaAtual)}</span>
            </div>
            <div style="max-height:220px;overflow-y:auto;">
              <table class="data-table" style="font-size:11px;margin:0;">
                <thead>
                  <tr>
                    <th>Item / Estabelecimento</th>
                    <th>Categoria</th>
                    <th>Tipo</th>
                    <th style="text-align:right;">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${itensDoMes.map(it => `
                    <tr>
                      <td><strong>${it.desc}</strong></td>
                      <td><span class="status-badge" style="font-size:9.5px;">${it.categoria || 'Geral'}</span></td>
                      <td>${it.tag === 'parc' ? '📦 Parcelado' : '⚡ À vista'}</td>
                      <td style="text-align:right;font-weight:bold;color:var(--rose);">${formatBRL(it.valor)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>` : ''}

          <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:14px;border-radius:var(--radius-sm);margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:6px;">
              <strong style="color:var(--text-main);font-size:13px;">📊 Distribuição por Categorias — ${currentMonth}/${currentYear}</strong>
              <span style="font-size:11px;color:var(--matrix-green);background:rgba(0,255,65,0.08);padding:2px 8px;border-radius:10px;border:1px solid var(--border-glow);">Total do Mês: ${formatBRL(totalCats)}</span>
            </div>
            ${sortedCats.length === 0 ? `
              <div style="color:var(--text-muted);font-size:11px;text-align:center;padding:12px 0;">
                Nenhum lançamento categorizado registrado para ${currentMonth}/${currentYear}.
              </div>
            ` : `
            <div style="display:flex;flex-direction:column;gap:10px;">
              ${sortedCats.map(([catName, val]) => {
                const pct = totalCats > 0 ? ((val / totalCats) * 100).toFixed(1) : 0;
                const conf = catConfig[catName] || { icon: '🏷️', color: '#00ff41' };
                return `
                  <div>
                    <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px;">
                      <span>${conf.icon} <strong>${catName}</strong></span>
                      <span><strong>${formatBRL(val)}</strong> <span style="color:var(--text-muted);">(${pct}%)</span></span>
                    </div>
                    <div style="width:100%;height:7px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
                      <div style="width:${pct}%;height:100%;background:${conf.color};border-radius:4px;transition:width 0.4s ease;"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            `}
          </div>

          <div style="background:linear-gradient(180deg, rgba(234,179,8,0.08) 0%, rgba(20,20,20,0.6) 100%);border:1px solid var(--amber);padding:14px;border-radius:var(--radius-sm);margin-bottom:12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:6px;">
              <strong style="color:var(--amber);font-size:13px;">💡 Levantamento Matrix: Onde Você Deve Economizar</strong>
              <span style="font-size:11px;background:rgba(234,179,8,0.2);color:var(--amber);padding:2px 8px;border-radius:10px;font-weight:bold;">Economia Estimada: ~R$ 920,00/mês</span>
            </div>
            
            <div style="display:flex;flex-direction:column;gap:8px;font-size:11.5px;line-height:1.6;">
              <div style="padding:8px;background:rgba(0,0,0,0.4);border-left:3px solid #f59e0b;border-radius:3px;">
                <span style="color:var(--amber);font-weight:bold;">1. Alimentação Supérflua ➔ Canalizar para Cartão VA</span>
                <div style="color:var(--text-muted);margin-top:2px;">
                  Gasto de R$ 1.280,00 no cartão Black em delivery e empórios. Você recebe <strong>R$ 2.050,00/mês no Cartão VA (Maracaju 88)</strong>, com saldo disponível. Concentrar essas compras no VA libera o limite do cartão. <span style="color:var(--matrix-green);font-weight:bold;">Economia no fluxo: ~R$ 500,00/mês</span>.
                </div>
              </div>

              <div style="padding:8px;background:rgba(0,0,0,0.4);border-left:3px solid #ec4899;border-radius:3px;">
                <span style="color:var(--cyan);font-weight:bold;">2. Zero Tarifas Bancárias & Isenção Permanente</span>
                <div style="color:var(--text-muted);margin-top:2px;">
                  Tanto Matheus (Nubank / BB Ourocard) quanto Scarlet operam sem tarifas nem anuidades. Manter isenção total perpétua e evitar juros de rotativo ou parcelamento de fatura. <span style="color:var(--matrix-green);font-weight:bold;">Economia em tarifas: 100% blindado</span>.
                </div>
              </div>

              <div style="padding:8px;background:rgba(0,0,0,0.4);border-left:3px solid #8b5cf6;border-radius:3px;">
                <span style="color:#a78bfa;font-weight:bold;">3. Desconto por Antecipação de Parcelas (Nubank)</span>
                <div style="color:var(--text-muted);margin-top:2px;">
                  Saldo comprometido futuro de ${formatBRL(faturasFuturas)}. O Nubank concede desconto automático ao adiantar compras parceladas sem juros quando houver folga no caixa. <span style="color:var(--matrix-green);font-weight:bold;">Economia financeira direta</span> por antecipação.
                </div>
              </div>

              <div style="padding:8px;background:rgba(0,0,0,0.4);border-left:3px solid #10b981;border-radius:3px;">
                <span style="color:var(--matrix-green);font-weight:bold;">4. Logística de Caronas USP (R$ 60/dia)</span>
                <div style="color:var(--text-muted);margin-top:2px;">
                  Custo de R$ 60,00 por dia presencial (R$ 1.140,00 em 19 dias úteis em Novembro). Otimizar dias remotos e recessos no Calendário USP poupa R$ 60 líquidos por dia. <span style="color:var(--matrix-green);font-weight:bold;">Economia em recessos: ~R$ 420 a R$ 600</span>.
                </div>
              </div>
            </div>
          </div>

          <div style="font-size:11px;color:var(--text-muted);line-height:1.5;">
            🔒 <em>Proteção Ativa:</em> Os lançamentos desta fatura são somente leitura no Matrix e gerenciados no App Faturas para manter a conciliação bancária consistente.
          </div>
        </div>
      `;

    } else if (tipo === 'fisioflow') {
      titleEl.innerHTML = `🩺 Consolidado Financeiro FisioFlow (Scarlet) (${periodLabel})`;
      const sat = (state.satellites && (state.satellites.fisioflow || state.satellites.fisio)) || 
        (typeof SatelliteConnectors !== 'undefined' && SatelliteConnectors.getBaselineFisioData ? SatelliteConnectors.getBaselineFisioData() : {});

      const curMIdx = MONTH_NAMES.indexOf(currentMonth);
      let prevMIdx = curMIdx - 1;
      let prevYear = parseInt(currentYear, 10);
      if (prevMIdx < 0) {
        prevMIdx = 11;
        prevYear -= 1;
      }
      const prevMesNome = MONTH_NAMES[prevMIdx];
      const ganhosMes = getGanhosScarletMes(currentYear, currentMonth);
      const capacidadeBase = sat.capacidadeMensalRecorrente || sat.projecaoMensalRecorrente || 4400.00;
      const ganhoPossivel = sat.ganhoPossivelMes || capacidadeBase;
      const totalHistorico = sat.totalHistoricoRecebido || 10505.00;
      const pacAtivos = sat.pacientesAtivos || 8;
      const ganhosMap = (sat.ganhosPorMes && Object.keys(sat.ganhosPorMes).length > 0) ? sat.ganhosPorMes : {
        '2026-08': { realizado: 4670, aReceber: 0, sessoes: 51, total: 4670, ganhoPossivel: 4670 },
        '2026-09': { realizado: 3700, aReceber: 0, sessoes: 40, total: 3700, ganhoPossivel: 3700 },
        '2026-10': { realizado: 950, aReceber: 190, sessoes: 13, total: 1140, ganhoPossivel: 1140 },
        '2026-11': { realizado: 0, aReceber: 995, previsto: 3810, sessoes: 11, total: 995, ganhoPossivel: 4805 }
      };

      html = `
        <div style="font-family:var(--font-mono);font-size:12.5px;line-height:1.7;">
          <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(6,182,212,0.08);border:1px solid var(--cyan);padding:8px 12px;border-radius:var(--radius-sm);margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <span style="color:var(--cyan);display:flex;align-items:center;gap:6px;font-weight:bold;">
              <span class="live-pulse" style="background:var(--cyan);"></span> Conexão FisioFlow Ativa (Regra +1 Mês)
            </span>
            <span class="lock-pill" style="border-color:var(--cyan);color:var(--cyan);" title="O que é faturado no mês M é utilizado no caixa do mês M+1">
              📅 Ciclo: Fatura em M &rarr; Caixa em M+1
            </span>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin-bottom:16px;">
            <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:11px;color:var(--text-muted);">Disponível no Caixa (${currentMonth})</div>
              <div style="font-size:15px;font-weight:bold;color:var(--cyan);margin-top:2px;">${formatBRL(ganhosMes)}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Faturamento ${prevMesNome}/${prevYear}</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid rgba(0,255,102,0.3);padding:10px;border-radius:var(--radius-sm);box-shadow:0 0 10px rgba(0,255,102,0.06);">
              <div style="font-size:11px;color:var(--matrix-green);font-weight:bold;display:flex;align-items:center;gap:4px;">
                <span>🎯</span> Ganho Possível (FisioFlow)
              </div>
              <div style="font-size:16px;font-weight:bold;color:var(--matrix-green);margin-top:2px;">${formatBRL(ganhoPossivel)}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Capacidade: ${formatBRL(capacidadeBase)}/mês (${pacAtivos} pac.)</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:11px;color:var(--text-muted);">Pacientes Ativos</div>
              <div style="font-size:15px;font-weight:bold;color:var(--text-main);margin-top:2px;">${pacAtivos} em atendimento</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Sem nomes exibidos</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:11px;color:var(--text-muted);">Destino da Renda</div>
              <div style="font-size:15px;font-weight:bold;color:var(--amber);margin-top:2px;">Fatura Nubank</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Compromisso conjunto</div>
            </div>
          </div>

          <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:14px;border-radius:var(--radius-sm);margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px;">
              <strong style="color:var(--text-main);font-size:13px;">📈 Conciliação FisioFlow &rarr; Caixa Matrix</strong>
              <span style="font-size:11px;color:var(--text-muted);">Histórico Total: ${formatBRL(totalHistorico)}</span>
            </div>
            <div style="max-height:220px;overflow-x:auto;-webkit-overflow-scrolling:touch;">
              <table class="data-table" style="width:100%;min-width:320px;border-collapse:collapse;">
                <thead>
                  <tr style="border-bottom:1px solid var(--border-dim);">
                    <th style="padding:6px 8px;font-size:10.5px;text-align:left;white-space:nowrap;">Competência</th>
                    <th style="padding:6px 8px;font-size:10.5px;text-align:left;white-space:nowrap;">Caixa Matrix</th>
                    <th style="padding:6px 8px;font-size:10.5px;text-align:center;white-space:nowrap;">Sessões</th>
                    <th style="padding:6px 8px;font-size:10.5px;text-align:right;white-space:nowrap;">Total Faturado</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(ganhosMap).map(([ym, dados]) => {
                    const parts = ym.split('-');
                    const yN = parseInt(parts[0], 10);
                    const mN = parseInt(parts[1], 10);
                    let destM = mN + 1;
                    let destY = yN;
                    if (destM > 12) {
                      destM = 1;
                      destY += 1;
                    }
                    const destMesNome = MONTH_NAMES[destM - 1];
                    const tot = (dados.realizado || 0) + (dados.aReceber || 0);
                    const isTargetMonth = (String(destY) === String(currentYear) && destMesNome === currentMonth);
                    const possivelTxt = dados.previsto ? ` <span style="font-size:9.5px;color:var(--matrix-green);display:block;font-weight:normal;">(Possível: ${formatBRL(dados.ganhoPossivel || (tot + dados.previsto))})</span>` : '';
                    return `
                      <tr style="${isTargetMonth ? 'background:rgba(6,182,212,0.12);font-weight:bold;' : ''}">
                        <td style="padding:6px 8px;white-space:nowrap;"><strong>${formatMesAnoBR(ym)}</strong></td>
                        <td style="padding:6px 8px;white-space:nowrap;">
                          <span style="color:var(--cyan);font-weight:600;">${destMesNome} / ${destY}</span>
                          ${isTargetMonth ? ' <span style="color:var(--matrix-green);font-size:10px;">● Mês Selecionado</span>' : ''}
                        </td>
                        <td style="padding:6px 8px;text-align:center;white-space:nowrap;">${dados.sessoes || '-'} sessões</td>
                        <td class="val-col" style="padding:6px 8px;color:var(--cyan);font-weight:700;text-align:right;white-space:nowrap;">
                          ${formatBRL(tot)}${possivelTxt}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div style="font-size:11px;color:var(--text-muted);line-height:1.5;">
            💡 <em>Regra de Fluxo de Caixa:</em> Os atendimentos gerados pela Scarlet no mês M são recebidos e utilizados no orçamento familiar no mês M+1. Assim, o faturamento de Outubro (R$ 1.140) financia Novembro, enquanto o faturamento em andamento de Novembro (com ganho possível de até ${formatBRL(ganhoPossivel)} e capacidade de ${formatBRL(capacidadeBase)}/mês com ${pacAtivos} pacientes ativos) financiará Dezembro.
          </div>
        </div>
      `;

    } else if (tipo === 'maracaju') {
      if (typeof SatelliteConnectors !== 'undefined' && typeof SatelliteConnectors.syncMaracajuFromLocal === 'function') {
        SatelliteConnectors.syncMaracajuFromLocal(state);
      }
      titleEl.innerHTML = `🏡 Casa Maracaju 88 • Benefícios VA e VR (${periodLabel})`;
      const sat = (state.satellites && state.satellites.maracaju) || {
        saldoVaRestante: 1988.78,
        saldoVrRestante: 805.41,
        gastoMercadoMesAtual: 71.06,
        gastoVrMesAtual: 299.75,
        vaMensal: 2050.00,
        vaRollover: 9.84,
        vaTotal: 2059.84,
        vrCreditadoNoMes: 1105.00,
        vrRollover: 0.16,
        vrTotal: 1105.16,
        totalBeneficios: 3165.00,
        gastoMercadoCicloAnterior: 390.41,
        comprasCicloAtual: []
      };

      const vaCred = sat.vaMensal || 2050.00;
      const vaRoll = sat.vaRollover != null ? sat.vaRollover : 9.84;
      const vaTot = sat.vaTotal != null ? sat.vaTotal : (vaCred + vaRoll);
      const vaGasto = sat.gastoMercadoMesAtual || 0.00;
      const vaSaldo = sat.saldoVaRestante != null ? sat.saldoVaRestante : Math.max(0, vaTot - vaGasto);

      const vrCred = sat.vrCreditadoNoMes || 1105.00;
      const vrRoll = sat.vrRollover != null ? sat.vrRollover : 0.16;
      const vrTot = sat.vrTotal != null ? sat.vrTotal : (vrCred + vrRoll);
      const vrGasto = sat.gastoVrMesAtual || 0.00;
      const vrSaldo = sat.saldoVrRestante != null ? sat.saldoVrRestante : Math.max(0, vrTot - vrGasto);

      const gastoAnterior = sat.gastoMercadoCicloAnterior || 390.41;
      const comprasAtuais = Array.isArray(sat.comprasCicloAtual) ? sat.comprasCicloAtual : [];

      const notasOutubro = [
        { mercado: 'Carrefour (03/11)', ciclo: 'Ciclo Outubro (Encerrado)', metodo: 'Cartão VA', valor: 280.66 },
        { mercado: 'Padaria N. Sra. Aparecida (03/11)', ciclo: 'Ciclo Outubro (Encerrado)', metodo: 'Cartão VA', valor: 46.96 },
        { mercado: 'Açougue Fumaça (03/11)', ciclo: 'Ciclo Outubro (Encerrado)', metodo: 'Cartão VA', valor: 62.79 }
      ];

      html = `
        <div style="font-family:var(--font-mono);font-size:12.5px;line-height:1.7;">
          <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(0,255,65,0.08);border:1px solid var(--border-glow);padding:8px 12px;border-radius:var(--radius-sm);margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <span style="color:var(--matrix-green);display:flex;align-items:center;gap:6px;font-weight:bold;">
              <span class="live-pulse"></span> App Casa Maracaju 88 Conectado • Ciclo Novembro Vigente
            </span>
            <div style="display:flex;align-items:center;gap:8px;">
              <button class="btn-matrix btn-outline" style="padding:3px 8px;font-size:10px;" onclick="MatrixApp.sincronizarMaracajuAgora()">
                🔄 Sincronizar Maracaju
              </button>
              <span class="lock-pill" style="border-color:var(--matrix-green);color:var(--matrix-green);font-size:10px;">
                🟢 4º Dia Útil (06/11): Crédito Ativo
              </span>
            </div>
          </div>

          <!-- CARDS DE SALDOS ATUAIS DE NOVEMBRO (COM SOBRA DE OUTUBRO E GASTOS DEDUZIDOS) -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin-bottom:16px;">
            <div style="background:var(--bg-card);border:1.5px solid rgba(0,255,102,0.3);padding:10px;border-radius:var(--radius-sm);box-shadow:inset 0 0 10px rgba(0,255,102,0.05);">
              <div style="font-size:11px;color:var(--text-muted);">Saldo Atual VA (Novembro)</div>
              <div style="font-size:16px;font-weight:800;color:var(--matrix-green);margin-top:2px;">${formatBRL(vaSaldo)}</div>
              <div style="font-size:9.5px;color:var(--matrix-green);margin-top:2px;">Crédito ${formatBRL(vaTot)} − Gasto ${formatBRL(vaGasto)}</div>
            </div>
            <div style="background:var(--bg-card);border:1.5px solid rgba(6,182,212,0.3);padding:10px;border-radius:var(--radius-sm);box-shadow:inset 0 0 10px rgba(6,182,212,0.05);">
              <div style="font-size:11px;color:var(--text-muted);">Saldo Atual VR (Novembro)</div>
              <div style="font-size:16px;font-weight:800;color:var(--cyan);margin-top:2px;">${formatBRL(vrSaldo)}</div>
              <div style="font-size:9.5px;color:var(--cyan);margin-top:2px;">Crédito ${formatBRL(vrTot)} − Gasto ${formatBRL(vrGasto)}</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:11px;color:var(--text-muted);">Total Alimentação Disponível</div>
              <div style="font-size:16px;font-weight:800;color:var(--text-bright);margin-top:2px;">${formatBRL(vaSaldo + vrSaldo)}</div>
              <div style="font-size:9.5px;color:var(--text-dim);margin-top:2px;">VA + VR combinados</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:11px;color:var(--text-muted);">Gastos Ciclo Novembro</div>
              <div style="font-size:16px;font-weight:800;color:var(--rose);margin-top:2px;">- ${formatBRL(vaGasto + vrGasto)}</div>
              <div style="font-size:9.5px;color:var(--text-dim);margin-top:2px;">A partir de 06/11 (${comprasAtuais.length} compra${comprasAtuais.length === 1 ? '' : 's'})</div>
            </div>
          </div>

          <!-- AJUSTE RÁPIDO DE SALDO ATUAL / LANÇAMENTO DE GASTO VA & VR -->
          <div style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.28);padding:12px;border-radius:var(--radius-sm);margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
              <strong style="color:var(--cyan);font-size:11.5px;">⚡ Atualizar Saldo Atual ou Lançar Gasto VA / VR</strong>
              <span style="font-size:10px;color:var(--text-muted);">Sincroniza com o topo do Matrix e com o app Casa Maracaju 88</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:8px;align-items:end;">
              <div>
                <label style="display:block;font-size:10px;color:var(--text-muted);margin-bottom:2px;">Saldo Atual VA (R$)</label>
                <input type="number" step="0.01" id="inlineMaracajuVaSaldo" class="matrix-input" style="width:100%;padding:6px 8px;font-size:12px;" value="${vaSaldo.toFixed(2)}" onchange="MatrixApp.salvarSaldoAtualMaracajuInline(true)">
              </div>
              <div>
                <label style="display:block;font-size:10px;color:var(--text-muted);margin-bottom:2px;">Saldo Atual VR (R$)</label>
                <input type="number" step="0.01" id="inlineMaracajuVrSaldo" class="matrix-input" style="width:100%;padding:6px 8px;font-size:12px;" value="${vrSaldo.toFixed(2)}" onchange="MatrixApp.salvarSaldoAtualMaracajuInline(true)">
              </div>
              <div style="display:flex;gap:6px;">
                <button class="btn-matrix" style="padding:6px 10px;font-size:11px;width:100%;" onclick="MatrixApp.salvarSaldoAtualMaracajuInline()">
                  💾 Aplicar Saldo Atual
                </button>
              </div>
            </div>
          </div>

          <!-- COMPRAS DO CICLO VIGENTE (NOVEMBRO — A PARTIR DE 06/11) -->
          <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:14px;border-radius:var(--radius-sm);margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <strong style="color:var(--matrix-green);font-size:12.5px;">🛒 Gastos do Ciclo de Novembro (A partir de 06/11)</strong>
              <span style="font-size:10.5px;color:var(--rose);font-weight:700;">Total Gasto: - ${formatBRL(vaGasto + vrGasto)} (VA: ${formatBRL(vaGasto)} | VR: ${formatBRL(vrGasto)})</span>
            </div>
            ${comprasAtuais.length > 0 ? `
              <div style="max-height:180px;overflow-y:auto;">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Estabelecimento</th>
                      <th>Cartão</th>
                      <th style="text-align:right;">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${comprasAtuais.map(c => `
                      <tr>
                        <td style="font-size:11px;color:var(--text-muted);">${c.date ? c.date.split('-').reverse().join('/') : 'Nov/2026'}</td>
                        <td><strong>${c.establishment || 'Despesa'}</strong></td>
                        <td><span class="status-badge pago" style="font-size:9px;border-color:${c.paymentMethod === 'vr' ? 'var(--cyan)' : 'var(--matrix-green)'};color:${c.paymentMethod === 'vr' ? 'var(--cyan)' : 'var(--matrix-green)'};">${c.paymentMethod === 'vr' ? 'Cartão VR' : 'Cartão VA'}</span></td>
                        <td class="val-col" style="color:var(--rose);font-weight:700;">- ${formatBRL(c.total)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <div style="font-size:11px;color:var(--text-muted);padding:6px 0;">
                Nenhuma nota individual sincronizada na tabela ainda, ou saldo ajustado diretamente acima.
              </div>
            `}
          </div>

          <!-- HISTÓRICO DE COMPRAS ANTERIORES DO CICLO DE OUTUBRO -->
          <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:14px;border-radius:var(--radius-sm);margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <strong style="color:var(--text-main);font-size:12.5px;">🧾 Compras de 03/11 (Debitadas no Ciclo de Outubro)</strong>
              <span style="font-size:10.5px;color:var(--amber);">Total: ${formatBRL(gastoAnterior)}</span>
            </div>
            <div style="max-height:180px;overflow-y:auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Estabelecimento</th>
                    <th>Ciclo Aplicado</th>
                    <th>Forma</th>
                    <th style="text-align:right;">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${notasOutubro.map(n => `
                    <tr>
                      <td><strong>${n.mercado}</strong></td>
                      <td style="color:var(--amber);font-size:10px;">${n.ciclo}</td>
                      <td><span class="status-badge pago" style="font-size:9px;">${n.metodo}</span></td>
                      <td class="val-col" style="color:var(--rose);font-weight:700;">- ${formatBRL(n.valor)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div style="margin-top:8px;font-size:10.5px;color:var(--text-dim);line-height:1.4;">
              💡 <em>Auditoria de Ciclos:</em> Como as compras de 03/11 foram realizadas antes do 4º dia útil (06/11), elas foram abatidas do saldo de Outubro. O ciclo de Outubro fechou com sobra de <strong>R$ 9,84 de VA</strong> e <strong>R$ 0,16 de VR</strong>, que foram somados ao novo depósito de Novembro (${formatBRL(vaTot)} de VA e ${formatBRL(vrTot)} de VR), restando atualmente <strong>${formatBRL(vaSaldo)} de VA</strong> e <strong>${formatBRL(vrSaldo)} de VR</strong> disponíveis.
            </div>
          </div>
        </div>
      `;
    } else if (tipo === 'caixa') {
      const curMIdxNum = MONTH_NAMES.indexOf(currentMonth) + 1;
      const curYNum = parseInt(currentYear, 10) || 2026;
      const cfg = state.financiamentoCaixa || {};
      const statusMes = (typeof AmortizationEngine !== 'undefined' && AmortizationEngine.getStatusForMonth)
        ? AmortizationEngine.getStatusForMonth(curYNum, curMIdxNum, cfg)
        : { saldo: cfg.saldoDevedor || 157884.49, prazo: 271, parcela: 1395.88 };

      titleEl.innerHTML = `🏠 Financiamento Habitacional da Casa (Caixa)`;
      html = `
        <div style="font-family:var(--font-mono);font-size:12.5px;line-height:1.9;">
          <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:14px;border-radius:var(--radius-sm);margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:6px;margin-bottom:6px;">
              <span style="color:var(--text-muted);">Mês de Referência:</span>
              <strong style="color:var(--matrix-green);">${currentMonth} / ${currentYear}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text-muted);">Saldo Devedor neste Mês:</span>
              <strong style="color:var(--rose);">${formatBRL(statusMes.saldo)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text-muted);">Parcela Débito Automático:</span>
              <strong style="color:var(--amber);">${formatBRL(statusMes.parcela)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text-muted);">Prazo Restante:</span>
              <span style="color:var(--matrix-green);font-weight:700;">${formatarPrazoExtenso(statusMes.prazo)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text-muted);">Taxa Efetiva de Juros:</span>
              <span style="color:var(--cyan);">${cfg.taxaJurosAnual || 8.9899}% a.a.</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text-muted);">Sistema Contratual:</span>
              <span>Tabela Price (Caixa Econômica)</span>
            </div>
          </div>
          <div style="background:rgba(0,255,102,0.04);border:1px solid rgba(0,255,102,0.15);padding:10px 12px;border-radius:6px;margin-bottom:12px;font-size:11.5px;line-height:1.6;color:var(--text-bright);">
            📊 <strong>Evolução Temporal:</strong> Em Novembro/2026 são <strong>271 parcelas</strong> (R$ 157.884,49). Conforme o mês avança, 1 parcela é paga e o saldo devedor é abatido.
          </div>
          <p style="font-size:11px;color:var(--text-muted);line-height:1.6;margin:0;">
            💡 <strong>FGTS USP:</strong> R$ 501,12 mensais de FGTS (R$ 12.026,88 a cada 24 meses) para amortização extraordinária.
          </p>
        </div>
      `;
    }

    contentEl.innerHTML = html;
    openModal(backdrop);
  }

  async function sincronizarMaracajuAgora() {
    if (typeof SatelliteConnectors !== 'undefined') {
      if (typeof SatelliteConnectors.syncMaracajuFromLocal === 'function') {
        SatelliteConnectors.syncMaracajuFromLocal();
      }
      if (typeof SatelliteConnectors.scrapeAll === 'function') {
        await SatelliteConnectors.scrapeAll();
      }
    }
    renderAll();
    abrirDrilldown('maracaju');
  }

  function salvarSaldoAtualMaracajuInline(keepFocus = false) {
    const vaInp = document.getElementById('inlineMaracajuVaSaldo');
    const vrInp = document.getElementById('inlineMaracajuVrSaldo');
    const state = MatrixDB.getState();
    if (!state.satellites) state.satellites = {};
    if (!state.satellites.maracaju) state.satellites.maracaju = {};

    const sat = state.satellites.maracaju;
    const vaTot = sat.vaTotal || 2059.84;
    const vrTot = sat.vrTotal || 1105.16;

    const novoVaSaldo = vaInp && vaInp.value !== '' ? Math.max(0, Math.round(parseFloat(String(vaInp.value).replace(',', '.')) * 100) / 100) : (sat.saldoVaRestante != null ? sat.saldoVaRestante : vaTot);
    const novoVrSaldo = vrInp && vrInp.value !== '' ? Math.max(0, Math.round(parseFloat(String(vrInp.value).replace(',', '.')) * 100) / 100) : (sat.saldoVrRestante != null ? sat.saldoVrRestante : vrTot);

    sat.saldoVaRestante = novoVaSaldo;
    sat.saldoVrRestante = novoVrSaldo;
    sat.gastoMercadoMesAtual = Math.max(0, Math.round((vaTot - novoVaSaldo) * 100) / 100);
    sat.gastoVrMesAtual = Math.max(0, Math.round((vrTot - novoVrSaldo) * 100) / 100);
    sat.totalDisponivel = Math.round((novoVaSaldo + novoVrSaldo) * 100) / 100;
    sat.atualizadoEm = new Date().toISOString();

    // Sincroniza também no localStorage compartilhado com o App Casa Maracaju 88 (MARACAJU_STATE_v1)
    try {
      const rawLocal = localStorage.getItem('MARACAJU_STATE_v1');
      const parsedLocal = rawLocal ? JSON.parse(rawLocal) : {};
      if (!parsedLocal.settings) parsedLocal.settings = {};
      if (!parsedLocal.settings.benefits) parsedLocal.settings.benefits = {};
      if (!parsedLocal.settings.benefits.monthlyEndingBalances) parsedLocal.settings.benefits.monthlyEndingBalances = {};
      parsedLocal.settings.benefits.monthlyEndingBalances['2026-11'] = {
        vaEndingBalance: novoVaSaldo,
        vrEndingBalance: novoVrSaldo
      };
      parsedLocal.updatedAt = new Date().toISOString();
      localStorage.setItem('MARACAJU_STATE_v1', JSON.stringify(parsedLocal));
    } catch (e) {}

    MatrixDB.saveState(state, 'maracaju_inline_balance');
    renderAll();
    if (!keepFocus) {
      abrirDrilldown('maracaju');
    }
  }

  // ==========================================
  // 2. FLUXO DE CAIXA MENSAL (TABELA PRINCIPAL)
  // ==========================================
  const BANK_BADGE_MAP = {
    // Nubank
    debito_nubank: { label: 'Débito Nubank', class: 'nubank', icon: '🟣' },
    credito_nubank_matheus: { label: 'Crédito Matheus', class: 'nubank', icon: '🟣💳' },
    credito_nubank_scarlet: { label: 'Crédito Scarlet', class: 'nubank', icon: '🟣💳' },
    pix_nubank: { label: 'Pix Nubank', class: 'nubank', icon: '🟣⚡' },
    nubank: { label: 'Nubank Black', class: 'nubank', icon: '🟣💳' },
    nubank_matheus: { label: 'Crédito Matheus', class: 'nubank', icon: '🟣💳' },
    nubank_scarlet: { label: 'Crédito Scarlet', class: 'nubank', icon: '🟣💳' },

    // Banco do Brasil
    salario_bb: { label: 'Salário BB', class: 'bb', icon: '🟡🏦' },
    debito_bb: { label: 'Débito BB', class: 'bb', icon: '🟡' },
    pix_bb: { label: 'Pix BB', class: 'bb', icon: '🟡⚡' },
    boleto_bb: { label: 'Boleto BB', class: 'bb', icon: '🟡📄' },
    bb: { label: 'Banco do Brasil', class: 'bb', icon: '🟡🏦' },

    // Banco Inter
    debito_inter: { label: 'Débito Inter', class: 'inter', icon: '🟠' },
    pix_inter: { label: 'Pix Inter', class: 'inter', icon: '🟠⚡' },
    cdb_inter: { label: 'CDB Inter', class: 'inter', icon: '🟠📈' },
    inter: { label: 'Banco Inter', class: 'inter', icon: '🟠' },

    // Santander
    debito_santander: { label: 'Débito Santander', class: 'santander', icon: '🔴' },
    pix_santander: { label: 'Pix Santander', class: 'santander', icon: '🔴⚡' },
    santander: { label: 'Santander', class: 'santander', icon: '🔴' },

    // Caixa Econômica
    debito_caixa: { label: 'Débito Caixa', class: 'caixa', icon: '🔵🏠' },
    fgts_caixa: { label: 'FGTS Caixa', class: 'caixa', icon: '🔵🏢' },
    caixa: { label: 'Caixa Casa', class: 'caixa', icon: '🔵🏠' },

    // Benefícios
    cartao_va: { label: 'Cartão VA', class: 'va', icon: '🟢🥗' },
    va: { label: 'Cartão VA', class: 'va', icon: '🟢🥗' },
    cartao_vr: { label: 'Cartão VR', class: 'vr', icon: '🍽️' },
    vr: { label: 'Cartão VR', class: 'vr', icon: '🍽️' },

    // Scarlet / FisioFlow
    scarlet_fisio: { label: 'Fisio Scarlet', class: 'fisio', icon: '🩺' },
    scarlet_extra: { label: 'Renda Extra Scarlet', class: 'fisio', icon: '👩‍⚕️🎁' },
    scarlet: { label: 'Fisio Scarlet', class: 'fisio', icon: '🩺' },

    // Investimentos / Resgates
    resgate_tesouro_reserva: { label: 'Resgate Tesouro', class: 'resgate', icon: '📉' },
    tesouro_renda: { label: 'Tesouro Renda+', class: 'invest', icon: '📈' },
    tesouro_selic: { label: 'Tesouro Selic', class: 'invest', icon: '🏛️' },
    acoes_b3: { label: 'Ações B3', class: 'invest', icon: '📊' },
    investimento_aporte: { label: 'Aporte Investimento', class: 'invest', icon: '📈' },

    // Dinheiro
    dinheiro_vivo: { label: 'Dinheiro Vivo', class: 'dinheiro', icon: '💵' },
    dinheiro: { label: 'Dinheiro Vivo', class: 'dinheiro', icon: '💵' },

    // Empréstimos & Financiamentos
    emprestimo_bancario: { label: 'Empréstimo Bancário', class: 'resgate', icon: '🏦' },
    emprestimo_consignado: { label: 'Consignado USP', class: 'bb', icon: '🏦' },
    emprestimo_familiar: { label: 'Empréstimo Familiar', class: 'invest', icon: '🤝' },
    emprestimo: { label: 'Empréstimo', class: 'resgate', icon: '🏦' }
  };

  function renderOrigemBadge(conta, renda, nome, metodo = null) {
    const c = String(conta || '').toLowerCase();
    const r = String(renda || '').toLowerCase();
    const n = String(nome || '').toLowerCase();

    // 0. Empréstimos
    if (c.includes('emprestimo') || r.includes('emprestimo') || n.includes('empréstimo') || n.includes('emprestimo')) {
      return '<span class="bank-badge resgate" title="Recursos originados de Empréstimo / Financiamento"><span class="bank-icon">🏦</span> <strong>Empréstimo</strong></span>';
    }

    // 0.5 Outras Rendas / Renda Extra da Scarlet explícita
    if (r === 'outras_rendas_scarlet' || c === 'scarlet_extra') {
      return '<span class="bank-badge fisio" title="Outras Rendas / Renda Extra da Scarlet"><span class="bank-icon">👩‍⚕️🎁</span> <strong>Renda Extra Scarlet</strong></span>';
    }

    // 1. Direct match in dictionary
    if (BANK_BADGE_MAP[c]) {
      const b = BANK_BADGE_MAP[c];
      return `<span class="bank-badge ${b.class}" title="Origem: ${b.label}"><span class="bank-icon">${b.icon}</span> <strong>${b.label}</strong></span>`;
    }

    // 2. Fallbacks based on pattern
    if (c.includes('resgate') || r.includes('resgate') || n.includes('resgate')) {
      return '<span class="bank-badge resgate" title="Custeado por resgate do Tesouro Reserva"><span class="bank-icon">📉🏛️</span> <strong>Resgate Tesouro</strong></span>';
    }
    if (c.includes('invest') || c.includes('aporte') || n.includes('renda+') || n.includes('tesouro') || n.includes('cdb') || n.includes('cripto')) {
      return '<span class="bank-badge invest" title="Aporte / Aplicação"><span class="bank-icon">📈🏛️</span> <strong>Investimento</strong></span>';
    }
    if (c.includes('nubank') || n.includes('nubank')) {
      if (c.includes('scarlet') || n.includes('scarlet')) {
        return '<span class="bank-badge nubank" title="Crédito Nubank Scarlet"><span class="bank-icon">🟣💳</span> <strong>Crédito Nubank (Scarlet)</strong></span>';
      }
      return '<span class="bank-badge nubank" title="Nubank Mastercard Black"><span class="bank-icon">🟣💳</span> <strong>Nubank Black</strong></span>';
    }
    if (c.includes('inter') || n.includes('inter')) {
      return '<span class="bank-badge inter" title="Banco Inter"><span class="bank-icon">🟠</span> <strong>Banco Inter</strong></span>';
    }
    if (c.includes('santander') || n.includes('santander') || n.includes('dindin')) {
      return '<span class="bank-badge santander" title="Santander"><span class="bank-icon">🔴</span> <strong>Santander</strong></span>';
    }
    if (c.includes('caixa') || n.includes('caixa') || n.includes('habita')) {
      return '<span class="bank-badge caixa" title="Caixa Habitação"><span class="bank-icon">🔵🏠</span> <strong>Caixa Casa</strong></span>';
    }
    if (c === 'va' || r.includes('va') || n.includes('va maracaju') || n.includes('supermercado')) {
      return '<span class="bank-badge va" title="Cartão Vale Alimentação (Maracaju 88)"><span class="bank-icon">🟢🥗</span> <strong>Cartão VA</strong></span>';
    }
    if (c === 'vr' || r.includes('vr') || n.includes('vr usp') || n.includes('refeição')) {
      return '<span class="bank-badge vr" title="Cartão Vale Refeição (Almoço USP)"><span class="bank-icon">🍽️</span> <strong>Cartão VR</strong></span>';
    }
    if (c.includes('fisio') || r.includes('fisio') || (n.includes('fisio') && !n.includes('fatura'))) {
      return '<span class="bank-badge fisio" title="Ganhos da Scarlet (FisioFlow)"><span class="bank-icon">🩺</span> <strong>FisioFlow (Scarlet)</strong></span>';
    }
    if (c === 'bb' || r.includes('salario') || n.includes('bb') || n.includes('salário') || c === 'salario_bb') {
      return '<span class="bank-badge bb" title="Salário Líquido USP (Conta BB)"><span class="bank-icon">🟡🏦</span> <strong>BB Salário USP</strong></span>';
    }
    if (c.includes('dinheiro') || n.includes('dinheiro')) {
      return '<span class="bank-badge dinheiro" title="Dinheiro em Espécie"><span class="bank-icon">💵</span> <strong>Dinheiro Vivo</strong></span>';
    }

    return `<span class="bank-badge default" title="Conta de Origem"><span class="bank-icon">💳</span> <strong>${conta || 'Conta BB (USP)'}</strong></span>`;
  }

  function renderCashflowTrace(monthData, totalReceitas, fixosList, outrosList, diariosList = []) {
    const origensEl = document.getElementById('traceOrigensList');
    const destinosEl = document.getElementById('traceDestinosList');
    if (!origensEl || !destinosEl) return;

    const allExpenses = [...fixosList, ...outrosList, ...diariosList];
    const state = MatrixDB.getState();
    const faturaNubank = getFaturaNubankMes(currentYear, currentMonth);

    // 1. Receitas e Ganhos
    let salUsp = getSalarioLiquidoMes(currentYear, currentMonth) || 5788.19;
    let outrosGanhos = 0;
    let scarletTotal = getGanhosScarletMes(currentYear, currentMonth) + getOutrasRendasScarletMes(currentYear, currentMonth);

    (monthData.receitas || []).forEach(r => {
      if (isReceitaExtraMatheus(r)) {
        outrosGanhos += parseFloat(r.valor) || 0;
      }
    });

    const totalEntradasConta = salUsp + outrosGanhos + scarletTotal;

    // 2. Despesas em Conta Corrente agrupadas
    let destMoradia = 0;
    let destSaude = 0;
    let destTransporte = 0;
    let destAportes = 0;
    let destCartaoBB = 0;
    let destTransfScarlet = 0;
    let destOutrasContas = 0;

    const caronaSummTrace = getCaronasProvisionSummary(currentYear, currentMonth, monthData);

    allExpenses.forEach(exp => {
      let val = parseFloat(exp.valor) || 0;
      if (fixosList.includes(exp) && isCaronaItem(exp) && !exp.pago) {
        val = caronaSummTrace.remaining;
      }
      const n = (exp.nome || '').toLowerCase();
      const cat = (exp.categoria || '').toLowerCase();

      if (isTransferenciaParaScarlet(exp)) {
        destTransfScarlet += val;
      } else if (cat.includes('habita') || n.includes('casa') || n.includes('água') || n.includes('luz') || n.includes('internet') || n.includes('iptu') || n.includes('parcela')) {
        destMoradia += val;
      } else if (cat.includes('saúde') || cat.includes('saude') || n.includes('unimed') || n.includes('psico') || n.includes('dentista')) {
        destSaude += val;
      } else if (cat.includes('transporte') || n.includes('carona') || n.includes('carro') || n.includes('combustível')) {
        destTransporte += val;
      } else if (cat.includes('aporte') || n.includes('renda+') || n.includes('tesouro') || n.includes('cripto') || n.includes('cdb')) {
        destAportes += val;
      } else if (n.includes('bb') || n.includes('ourocard')) {
        destCartaoBB += val;
      } else {
        destOutrasContas += val;
      }
    });

    const totalSaidasConta = destMoradia + destSaude + destTransporte + destAportes + destCartaoBB + destTransfScarlet + destOutrasContas;
    const saldoConta = totalEntradasConta - totalSaidasConta;

    // 3. Benefícios
    let vaTotal = 2050.00;
    let vrTotal = 1105.00;
    (monthData.receitas || []).forEach(r => {
      const n = (r.nome || '').toLowerCase();
      const val = parseFloat(r.valor) || 0;
      if (isItemVR(r)) vrTotal = val;
      else if (isItemVA(r)) vaTotal = val;
    });

    // Renderizar Bloco de Origens com discriminação Como / Por que / Onde / Quando
    origensEl.innerHTML = `
      <!-- TRILHA 1: FLUXO EM CONTA BANCÁRIA -->
      <div style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.3);border-radius:4px;padding:8px 10px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <strong style="color:var(--cyan);font-size:11px;">🏦 Trilha 1: Dinheiro em Conta Corrente</strong>
          <span style="font-size:10px;color:var(--cyan);font-weight:700;">Entradas: ${formatBRL(totalEntradasConta)}</span>
        </div>
        <div style="font-size:10.5px;display:flex;flex-direction:column;gap:3px;margin-top:6px;">
          <div style="display:flex;justify-content:space-between;"><span>🏛️ Salário USP (BB):</span><strong>${formatBRL(salUsp)}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>🎁 Renda Extra:</span><strong>${formatBRL(outrosGanhos)}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>🩺 Ganhos Scarlet (FisioFlow):</span><strong>${formatBRL(scarletTotal)}</strong></div>
        </div>
      </div>

      <!-- TRILHA 2: BENEFÍCIOS ALIMENTAÇÃO (NÃO PECÚNIA) -->
      <div style="background:rgba(234,179,8,0.06);border:1px solid rgba(234,179,8,0.3);border-radius:4px;padding:8px 10px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <strong style="color:var(--amber);font-size:11px;">🛒 Trilha 2: Benefícios em Cartão Pré-Pago</strong>
          <span style="font-size:10px;color:var(--amber);font-weight:700;">Total: ${formatBRL(vaTotal + vrTotal)}</span>
        </div>
        <div style="font-size:10.5px;display:flex;flex-direction:column;gap:3px;margin-top:6px;">
          <div style="display:flex;justify-content:space-between;"><span>🥗 Vale Alimentação (VA - Mercado):</span><strong>${formatBRL(vaTotal)}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>🍽️ Vale Refeição (VR - Almoço USP):</span><strong>${formatBRL(vrTotal)}</strong></div>
        </div>
      </div>
    `;

    // Renderizar Bloco de Destinos
    destinosEl.innerHTML = `
      <!-- SAÍDAS EM CONTA CORRENTE -->
      <div style="background:rgba(244,63,94,0.06);border:1px solid rgba(244,63,94,0.3);border-radius:4px;padding:8px 10px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <strong style="color:var(--rose);font-size:11px;">📤 Para Onde Foi (Saídas em Conta):</strong>
          <span style="font-size:10px;color:var(--rose);font-weight:700;">Total: ${formatBRL(totalSaidasConta)}</span>
        </div>
        <div style="font-size:10.5px;display:flex;flex-direction:column;gap:3px;margin-top:6px;">
          <div style="display:flex;justify-content:space-between;"><span>🏠 Moradia (Parcela Caixa + Água + Luz):</span><strong>${formatBRL(destMoradia)}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>🩺 Saúde & Bem-Estar (Unimed + Psico):</span><strong>${formatBRL(destSaude)}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>🚗 Transporte (Caronas USP):</span><strong>${formatBRL(destTransporte)}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>📈 Aportes (Renda+ / Tesouro / XP):</span><strong>${formatBRL(destAportes)}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>💳 Cartão BB Ourocard:</span><strong>${formatBRL(destCartaoBB)}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>🤝 Repasse / Transf. para Scarlet:</span><strong>${formatBRL(destTransfScarlet)}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>🛍️ Outras Despesas em Conta:</span><strong>${formatBRL(destOutrasContas)}</strong></div>
        </div>
      </div>

      <!-- TRILHA 3: FATURA CARTÃO NUBANK BLACK -->
      <div style="background:rgba(192,132,252,0.06);border:1px solid rgba(192,132,252,0.3);border-radius:4px;padding:8px 10px;margin-bottom:8px;cursor:pointer;" onclick="MatrixApp.abrirDrilldown('fatura')" title="Clique para ver a Fatura Nubank Black completa">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <strong style="color:var(--purple);font-size:11px;">🟣 Trilha 3: Fatura Cartão Nubank Black</strong>
          <span style="font-size:10px;color:var(--purple);font-weight:700;">Fatura: ${formatBRL(faturaNubank)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;font-size:10.5px;">
          <span style="color:var(--text-dim);">Compromisso Total Cartão:</span>
          <strong style="color:var(--purple);">${formatBRL(faturaNubank)} ➔ Ver detalhes</strong>
        </div>
      </div>
    `;
  }

  function isFaturasItem(item) {
    if (!item) return false;
    const n = (item.nome || '').toLowerCase();
    const c = (item.conta || '').toLowerCase();
    const o = (item.origem || '').toLowerCase();
    return c.includes('nubank') || n.includes('fatura nubank') || n.includes('cartão nubank') || o.includes('fatura') || o.includes('nubank');
  }

  function alertFaturasReadOnly() {
    alert('🔒 Sincronizado do App Faturas (Somente Leitura no Matrix)\n\nOs lançamentos da Fatura Nubank Black e despesas de cartão são sincronizados em tempo real a partir do aplicativo Faturas.\n\nPara alterar valores, compras parceladas ou novas despesas de cartão, utilize o App Faturas. As modificações serão refletidas automaticamente aqui.');
  }

  function syncCaronasWithCalendar(yearStr, monthName) {
    if (!yearStr || !monthName) return null;
    const monthIdx = MONTH_NAMES.indexOf(monthName) + 1;
    if (monthIdx < 1) return null;
    if (typeof CalendarEngine === 'undefined') return null;

    const state = MatrixDB.getState();
    const commute = CalendarEngine.calculateCommuteAndVR(parseInt(yearStr, 10), monthIdx, state.calendarioCustom);
    const monthData = MatrixDB.getMonth(yearStr, monthName);
    if (!monthData) return commute;

    if (!monthData.fixos) monthData.fixos = [];
    let caronaItem = monthData.fixos.find(f => f && isCaronaItem(f));
    let changed = false;

    if (caronaItem) {
      if (caronaItem.valor !== commute.totalCaronas) {
        caronaItem.valor = commute.totalCaronas;
        changed = true;
      }
    } else {
      monthData.fixos.push({
        id: 'fix_carona_' + Date.now(),
        nome: 'Caronas',
        valor: commute.totalCaronas,
        categoria: 'Transporte',
        pago: false,
        conta: 'inter_debito',
        renda: 'usp'
      });
      changed = true;
    }

    if (changed) {
      MatrixDB.saveMonth(yearStr, monthName, monthData, { skipCloudSync: true, reason: 'init_calibration' });
    }
    return commute;
  }

  function abrirCalendarioParaCaronas(yearStr, monthName) {
    calSelectedYear = yearStr || currentYear;
    calSelectedMonth = monthName || currentMonth;
    switchTab('tab-calendario');
    renderCalendar();
  }

  function renderFluxoCaixa() {
    syncCaronasWithCalendar(currentYear, currentMonth);
    const monthData = MatrixDB.getMonth(currentYear, currentMonth);

    // Cálculos de Totais, Pagos e Pendentes
    const fixosList = monthData.fixos || [];
    const outrosList = monthData.outros || [];
    const diariosList = monthData.diarios || [];

    // Gastos Fixos exclusivos de Matheus / Contas Compartilhadas (exclui gastos próprios da Scarlet, pois têm coluna própria)
    const caronaSummary = getCaronasProvisionSummary(currentYear, currentMonth, monthData);
    const fixosListMatheus = fixosList.map((f, i) => ({ f, i })).filter(x => !isGastoDaScarlet(x.f) || isTransferenciaParaScarlet(x.f));
    
    let totalFixos = 0;
    let pagosFixos = 0;
    let pendentesFixos = 0;

    fixosListMatheus.forEach(x => {
      const f = x.f;
      const isCarona = isCaronaItem(f);
      const val = parseFloat(f.valor) || 0;
      if (isCarona) {
        if (f.pago) {
          pagosFixos += val;
          totalFixos += val;
        } else {
          // Opção 1: Provisão com Consumo Automático
          // O saldo pendente da provisão é abatido pelas caronas já lançadas nos diários
          pendentesFixos += caronaSummary.remaining;
          totalFixos += caronaSummary.remaining;
        }
      } else {
        if (f.pago) pagosFixos += val;
        else pendentesFixos += val;
        totalFixos += val;
      }
    });

    // Gastos Variáveis exclusivos de Matheus (exclui gastos da Scarlet)
    const outrosListMatheus = outrosList.map((o, i) => ({ o, i })).filter(x => !isGastoDaScarlet(x.o));
    const totalOutros = outrosListMatheus.reduce((acc, x) => acc + (parseFloat(x.o.valor) || 0), 0);
    const pagosOutros = outrosListMatheus.filter(x => x.o.pago).reduce((acc, x) => acc + (parseFloat(x.o.valor) || 0), 0);
    const pendentesOutros = Math.max(0, totalOutros - pagosOutros);

    // Gastos Diários (Matheus)
    const totalDiarios = diariosList.reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
    const pagosDiarios = diariosList.filter(it => it.pago).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
    const pendentesDiarios = Math.max(0, totalDiarios - pagosDiarios);

    // Gastos Próprios Scarlet (Fixos e Recorrentes que saem da renda dela)
    const scarletGastosMapped = [
      ...fixosList.map((it, idx) => ({ it, originalIdx: idx, tipo: 'fixo' })),
      ...outrosList.map((it, idx) => ({ it, originalIdx: idx, tipo: 'outro' }))
    ].filter(x => isGastoDaScarlet(x.it) && !isTransferenciaParaScarlet(x.it) && x.it.nome !== 'Nubank Scarlet');

    const totalScarletGastos = scarletGastosMapped.reduce((acc, x) => acc + (parseFloat(x.it.valor) || 0), 0);
    const pagosScarletGastos = scarletGastosMapped.filter(x => x.it.pago).reduce((acc, x) => acc + (parseFloat(x.it.valor) || 0), 0);
    const pendentesScarletGastos = Math.max(0, totalScarletGastos - pagosScarletGastos);

    // Atualizar Termômetro dos Gastos da Scarlet
    if (document.getElementById('scarletPagoLabel')) document.getElementById('scarletPagoLabel').textContent = formatBRL(pagosScarletGastos);
    if (document.getElementById('scarletPendenteLabel')) document.getElementById('scarletPendenteLabel').textContent = formatBRL(pendentesScarletGastos);
    if (document.getElementById('scarletTotalLabel')) document.getElementById('scarletTotalLabel').textContent = formatBRL(totalScarletGastos);
    const pctScarlet = totalScarletGastos > 0 ? (pagosScarletGastos / totalScarletGastos) * 100 : 0;
    if (document.getElementById('scarletProgressBar')) document.getElementById('scarletProgressBar').style.width = pctScarlet.toFixed(1) + '%';

    // Dívida Consolidada do Cartão Nubank Black da Scarlet
    const faturaNubank = getFaturaNubankMes(currentYear, currentMonth);
    const isFaturaPaga = !!(monthData.scarlet && monthData.scarlet.faturaPaga === true);
    const faturaPagaVal = isFaturaPaga ? faturaNubank : 0;
    const faturaPendenteVal = isFaturaPaga ? 0 : faturaNubank;

    // Detectar repasse interno do Matheus para a Scarlet (se existir nos fixos ou outros)
    const transfFixos = fixosList.filter(f => isTransferenciaParaScarlet(f)).reduce((acc, f) => acc + (parseFloat(f.valor) || 0), 0);
    const transfOutros = outrosList.filter(o => isTransferenciaParaScarlet(o)).reduce((acc, o) => acc + (parseFloat(o.valor) || 0), 0);
    const totalTransfScarlet = transfFixos + transfOutros;
    const transfFixosPaga = fixosList.filter(f => isTransferenciaParaScarlet(f) && f.pago).reduce((acc, f) => acc + (parseFloat(f.valor) || 0), 0);
    const transfOutrosPaga = outrosList.filter(o => isTransferenciaParaScarlet(o) && o.pago).reduce((acc, o) => acc + (parseFloat(o.valor) || 0), 0);
    const totalTransfPaga = transfFixosPaga + transfOutrosPaga;

    // Despesas externas consolidadas: evita duplicar o repasse interno com a dívida da fatura Nubank
    const fixosExternos = Math.max(0, totalFixos - transfFixos);
    const outrosExternos = Math.max(0, totalOutros - transfOutros);
    const fixosExternosPago = Math.max(0, pagosFixos - transfFixosPaga);
    const outrosExternosPago = Math.max(0, pagosOutros - transfOutrosPaga);

    let contasInicioVal = 0;
    if (currentMonth === 'Janeiro' && monthData.totais && monthData.totais['Contas Inicio Ano']) {
      contasInicioVal = parseFloat(monthData.totais['Contas Inicio Ano']) || 0;
    }

    const totalDespesasConsolidadas = fixosExternos + outrosExternos + totalDiarios + faturaNubank + totalScarletGastos + contasInicioVal;
    const totalDespesasPagasConsolidadas = fixosExternosPago + outrosExternosPago + pagosDiarios + faturaPagaVal + pagosScarletGastos + (currentMonth === 'Janeiro' ? contasInicioVal : 0);
    const totalDespesasPendentesConsolidadas = Math.max(0, totalDespesasConsolidadas - totalDespesasPagasConsolidadas);

    // Atualizar Termômetro dos Fixos
    if (document.getElementById('fixosPagoLabel')) document.getElementById('fixosPagoLabel').textContent = formatBRL(pagosFixos);
    if (document.getElementById('fixosPendenteLabel')) document.getElementById('fixosPendenteLabel').textContent = formatBRL(pendentesFixos);
    const pctFixos = totalFixos > 0 ? (pagosFixos / totalFixos) * 100 : 0;
    if (document.getElementById('fixosProgressBar')) document.getElementById('fixosProgressBar').style.width = pctFixos.toFixed(1) + '%';

    // Atualizar Termômetro dos Variáveis
    if (document.getElementById('outrosPagoLabel')) document.getElementById('outrosPagoLabel').textContent = formatBRL(pagosOutros);
    if (document.getElementById('outrosPendenteLabel')) document.getElementById('outrosPendenteLabel').textContent = formatBRL(pendentesOutros);
    const pctOutros = totalOutros > 0 ? (pagosOutros / totalOutros) * 100 : 0;
    if (document.getElementById('outrosProgressBar')) document.getElementById('outrosProgressBar').style.width = pctOutros.toFixed(1) + '%';

    // Atualizar Termômetro dos Gastos Diários
    if (document.getElementById('diariosPagoLabel')) document.getElementById('diariosPagoLabel').textContent = formatBRL(pagosDiarios);
    if (document.getElementById('diariosPendenteLabel')) document.getElementById('diariosPendenteLabel').textContent = formatBRL(pendentesDiarios);
    if (document.getElementById('diariosTotalLabel')) document.getElementById('diariosTotalLabel').textContent = formatBRL(totalDiarios);
    const pctDiarios = totalDiarios > 0 ? (pagosDiarios / totalDiarios) * 100 : 0;
    if (document.getElementById('diariosProgressBar')) document.getElementById('diariosProgressBar').style.width = pctDiarios.toFixed(1) + '%';

    // Atualizar Termômetro Geral do Mês (Consolidado: Fixos + Variáveis + Diários + Fatura Nubank Scarlet + Gastos Scarlet)
    if (document.getElementById('geralPagoTotal')) document.getElementById('geralPagoTotal').textContent = formatBRL(totalDespesasPagasConsolidadas);
    if (document.getElementById('geralPendenteTotal')) document.getElementById('geralPendenteTotal').textContent = formatBRL(totalDespesasPendentesConsolidadas);
    const pctGeral = totalDespesasConsolidadas > 0 ? (totalDespesasPagasConsolidadas / totalDespesasConsolidadas) * 100 : 0;
    if (document.getElementById('geralProgressBar')) document.getElementById('geralProgressBar').style.width = pctGeral.toFixed(1) + '%';

    // Render Fixos Table Body (Matheus / Casa)
    const fixosTbody = document.getElementById('fixosTableBody');
    if (fixosTbody) {
      if (fixosListMatheus.length === 0) {
        fixosTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:18px;">Nenhum gasto fixo cadastrado em ${currentMonth}.</td></tr>`;
      } else {
        fixosTbody.innerHTML = fixosListMatheus.map(itemObj => {
          const f = itemObj.f;
          const i = itemObj.i;
          const isFatura = isFaturasItem(f);
          const isScarletTransf = (f.nome || '').trim().toLowerCase() === 'scarlet';
          const isCarona = isCaronaItem(f);
          const isConsignado = isConsignadoFolhaItem(f);
          const jaRetidoNoHolerite = isConsignadoFolhaJaDescontado(f, currentYear, currentMonth);
          const curCommute = isCarona ? CalendarEngine.calculateCommuteAndVR(parseInt(currentYear, 10), MONTH_NAMES.indexOf(currentMonth) + 1, MatrixDB.getState().calendarioCustom) : null;
          const cycleInfo = curCommute ? curCommute.salaryCycle : null;
          const isProvisaoConsumida = isCarona && !f.pago && caronaSummary.consumed > 0 && caronaSummary.remaining === 0;

          return `
          <tr class="${(f.pago || jaRetidoNoHolerite || isProvisaoConsumida) ? 'paid' : ''}">
            <td class="desc-col" style="cursor:pointer;" onclick="MatrixApp.editItemByIndex('${currentYear}', '${currentMonth}', 'fixo', ${i})" title="Toque para editar este lançamento">
              <strong>${f.nome}</strong> ${isScarletTransf ? `<span style="font-size:10.5px;color:var(--cyan);font-weight:normal;" title="Transferência da conta USP para pagamento da fatura Nubank da Scarlet">(Fatura Nubank)</span>` : ''}
              <div class="item-meta-row">
                ${renderOrigemBadge(f.conta, f.renda, f.nome)}
                ${(f.categoria || isScarletTransf) ? `<span class="cat-pill" ${isScarletTransf ? 'title="Transferência para pagar fatura Nubank da Scarlet"' : ''}>${isScarletTransf ? '💳 Cartão Nubank' : f.categoria}</span>` : ''}
                ${isFatura ? `<span class="lock-pill" style="font-size:9px;padding:1px 5px;">🔒 Faturas Live</span>` : ''}
                ${isCarona && cycleInfo ? `<span class="lock-pill" style="font-size:9.5px;padding:2px 6px;color:var(--matrix-green);border-color:rgba(0,255,102,0.35);background:rgba(0,255,102,0.07);" title="Previsão USP: ${cycleInfo.cycleWorkingDaysCount} dias x R$ 60 no ciclo (${cycleInfo.cycleRangeLabel})">🚗 Previsão USP: ${formatBRL(caronaSummary.provision)} (${cycleInfo.cycleWorkingDaysCount}d)</span>` : ''}
                ${isCarona && caronaSummary.consumed > 0 ? `<span class="lock-pill" style="font-size:9.5px;padding:2px 6px;color:var(--cyan);border-color:rgba(6,182,212,0.35);background:rgba(6,182,212,0.08);" title="Total já registrado em Gastos Diários neste mês: ${formatBRL(caronaSummary.consumed)} em ${caronaSummary.dailyCount} viagem(ns)">⚡ Consumido: ${formatBRL(caronaSummary.consumed)} (${caronaSummary.dailyCount}x)</span>` : ''}
                ${isCarona && caronaSummary.consumed > 0 && caronaSummary.remaining > 0 ? `<span class="lock-pill" style="font-size:9.5px;padding:2px 6px;color:var(--amber);border-color:rgba(245,158,11,0.35);background:rgba(245,158,11,0.08);" title="Saldo da provisão que ainda resta gastar até o final do ciclo">⏳ Saldo Restante: ${formatBRL(caronaSummary.remaining)}</span>` : ''}
                ${isProvisaoConsumida ? `<span class="lock-pill" style="font-size:9.5px;padding:2px 6px;color:var(--matrix-green);border-color:rgba(0,255,102,0.35);background:rgba(0,255,102,0.08);" title="Provisão orçamentária de caronas 100% consumida pelos gastos diários">✔ 100% Consumido em Diários</span>` : ''}
                ${jaRetidoNoHolerite ? `<span class="lock-pill" style="font-size:9.5px;padding:2px 6px;color:var(--cyan);border-color:rgba(6,182,212,0.35);background:rgba(6,182,212,0.08);" title="Esta parcela já foi descontada na folha de pagamento do holerite oficial deste mês. Não é deduzida novamente da conta corrente para evitar duplicidade.">📋 Retido no Holerite (Sem Duplicidade)</span>` : isConsignado ? `<span class="cat-pill" style="color:var(--amber);border-color:rgba(245,158,11,0.35);" title="Previsão de redução salarial nos meses futuros até a importação do holerite">🏛️ Consignado em Folha</span>` : ''}
              </div>
            </td>
            <td class="status-col">
              ${jaRetidoNoHolerite ? `
                <button type="button" 
                        class="status-btn pago" 
                        style="color:var(--cyan);border-color:rgba(6,182,212,0.4);font-size:10px;padding:3px 6px;"
                        title="Desconto já retido na folha no holerite oficial da USP deste mês (duplicidade prevenida)">
                  ✔ RETIDO EM FOLHA
                </button>
              ` : isProvisaoConsumida ? `
                <button type="button" 
                        class="status-btn pago" 
                        style="color:var(--matrix-green);border-color:rgba(0,255,102,0.4);font-size:10px;padding:3px 6px;"
                        title="Provisão de caronas 100% consumida e paga pelos lançamentos em Gastos Diários">
                  ✔ CONSUMIDO
                </button>
              ` : `
                <button type="button" 
                        class="status-btn ${f.pago ? 'pago' : 'pendente'}" 
                        onclick="MatrixApp.togglePaidByIndex('${currentYear}', '${currentMonth}', 'fixo', ${i})"
                        title="Clique para alternar entre Pago e Pendente">
                  ${f.pago ? '✅ PAGO' : '⏳ PENDENTE'}
                </button>
              `}
            </td>
            <td class="val-col">
              ${isCarona && caronaSummary.consumed > 0 ? `
                <div style="display:flex;flex-direction:column;align-items:flex-end;line-height:1.2;">
                  <span style="font-weight:700;color:${caronaSummary.remaining > 0 ? 'var(--amber)' : 'var(--matrix-green)'};">
                    ${formatBRL(caronaSummary.remaining)}
                  </span>
                  <span style="font-size:9.5px;color:var(--text-dim);" title="Previsão inicial: ${formatBRL(caronaSummary.provision)} | Consumido nos diários: ${formatBRL(caronaSummary.consumed)}">
                    de ${formatBRL(caronaSummary.provision)}
                  </span>
                </div>
              ` : `${formatBRL(f.valor)}`}
            </td>
            <td class="action-col">
              ${isCarona ? `
                <button class="btn-icon" style="font-size:13px;" title="Ver e gerenciar dias no Calendário USP & Caronas" onclick="MatrixApp.abrirCalendarioParaCaronas('${currentYear}', '${currentMonth}')">📅</button>
                <button class="btn-icon" style="font-size:12px;color:var(--cyan);" title="Lançar Carona hoje nos Gastos Diários (+ R$ 30)" onclick="MatrixApp.lancarCaronaRapidaHoje()">⚡</button>
                <button class="btn-icon edit" title="Editar este lançamento" onclick="MatrixApp.editItemByIndex('${currentYear}', '${currentMonth}', 'fixo', ${i})">✏️</button>
                <button class="btn-icon delete" title="Excluir este lançamento" onclick="MatrixApp.removeItemByIndex('${currentYear}', '${currentMonth}', 'fixo', ${i})">🗑️</button>
              ` : isFatura ? `
                <button class="btn-icon lock" title="🔒 Sincronizado do App Faturas (Somente Leitura no Matrix)" onclick="MatrixApp.alertFaturasReadOnly()">🔒</button>
              ` : `
                <button class="btn-icon edit" title="Editar este lançamento" onclick="MatrixApp.editItemByIndex('${currentYear}', '${currentMonth}', 'fixo', ${i})">✏️</button>
                <button class="btn-icon delete" title="Excluir este lançamento" onclick="MatrixApp.removeItemByIndex('${currentYear}', '${currentMonth}', 'fixo', ${i})">🗑️</button>
              `}
            </td>
          </tr>
        `;
        }).join('');
      }
    }

    // Render Outros / Variáveis Table Body (Matheus)
    const outrosTbody = document.getElementById('outrosTableBody');
    if (outrosTbody) {
      if (outrosListMatheus.length === 0) {
        outrosTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:18px;">Nenhum gasto variável cadastrado em ${currentMonth}.</td></tr>`;
      } else {
        outrosTbody.innerHTML = outrosListMatheus.map(itemObj => {
          const o = itemObj.o;
          const i = itemObj.i;
          const isFatura = isFaturasItem(o);
          const isScarletTransf = (o.nome || '').trim().toLowerCase() === 'scarlet';
          return `
          <tr class="${o.pago ? 'paid' : ''}">
            <td class="desc-col" style="cursor:pointer;" onclick="MatrixApp.editItemByIndex('${currentYear}', '${currentMonth}', 'outro', ${i})" title="Toque para editar este lançamento">
              <strong>${o.nome}</strong> ${isScarletTransf ? `<span style="font-size:10.5px;color:var(--cyan);font-weight:normal;" title="Transferência da conta USP para pagamento da fatura Nubank da Scarlet">(Fatura Nubank)</span>` : ''}
              <div class="item-meta-row">
                ${renderOrigemBadge(o.conta, o.renda, o.nome)}
                ${(o.categoria || isScarletTransf) ? `<span class="cat-pill" ${isScarletTransf ? 'title="Transferência para pagar fatura Nubank da Scarlet"' : ''}>${isScarletTransf ? '💳 Cartão Nubank' : o.categoria}</span>` : ''}
                ${isFatura ? `<span class="lock-pill" style="font-size:9px;padding:1px 5px;">🔒 Faturas Live</span>` : ''}
              </div>
            </td>
            <td class="status-col">
              <button type="button" 
                      class="status-btn ${o.pago ? 'pago' : 'pendente'}" 
                      onclick="MatrixApp.togglePaidByIndex('${currentYear}', '${currentMonth}', 'outro', ${i})"
                      title="Clique para alternar entre Pago e Pendente">
                ${o.pago ? '✅ PAGO' : '⏳ PENDENTE'}
              </button>
            </td>
            <td class="val-col">${formatBRL(o.valor)}</td>
            <td class="action-col">
              ${isFatura ? `
                <button class="btn-icon lock" title="🔒 Sincronizado do App Faturas (Somente Leitura no Matrix)" onclick="MatrixApp.alertFaturasReadOnly()">🔒</button>
              ` : `
                <button class="btn-icon edit" title="Editar este lançamento" onclick="MatrixApp.editItemByIndex('${currentYear}', '${currentMonth}', 'outro', ${i})">✏️</button>
                <button class="btn-icon delete" title="Excluir este lançamento" onclick="MatrixApp.removeItemByIndex('${currentYear}', '${currentMonth}', 'outro', ${i})">🗑️</button>
              `}
            </td>
          </tr>
        `;
        }).join('');
      }
    }

    // Render Tabela de Gastos Próprios da Scarlet (Coluna Dedicada da Scarlet)
    const scarletTbody = document.getElementById('scarletGastosTableBody');
    if (scarletTbody) {
      if (scarletGastosMapped.length === 0) {
        scarletTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:18px;">
          Nenhum gasto próprio da Scarlet cadastrado em ${currentMonth}.<br>
          <span style="font-size:11px;color:var(--purple);cursor:pointer;display:inline-block;margin-top:6px;" onclick="MatrixApp.openNewItemModal('fixo', 'scarlet')">+ Adicionar Psicóloga, Investimentos, etc.</span>
        </td></tr>`;
      } else {
        scarletTbody.innerHTML = scarletGastosMapped.map(itemObj => {
          const f = itemObj.it;
          const i = itemObj.originalIdx;
          const t = itemObj.tipo;
          return `
          <tr class="${f.pago ? 'paid' : ''}">
            <td class="desc-col" style="cursor:pointer;" onclick="MatrixApp.editItemByIndex('${currentYear}', '${currentMonth}', '${t}', ${i})" title="Toque para editar este lançamento da Scarlet">
              <strong style="color:var(--text-bright);">${f.nome}</strong>
              <div class="item-meta-row">
                <span class="bank-pill" style="color:var(--purple);border-color:rgba(192,132,252,0.35);background:rgba(192,132,252,0.08);">👩‍⚕️ Ganhos Scarlet</span>
                ${f.categoria ? `<span class="cat-pill" style="color:var(--purple);border-color:rgba(192,132,252,0.3);">${f.categoria}</span>` : ''}
              </div>
            </td>
            <td class="status-col">
              <button type="button" 
                      class="status-btn ${f.pago ? 'pago' : 'pendente'}" 
                      onclick="MatrixApp.togglePaidByIndex('${currentYear}', '${currentMonth}', '${t}', ${i})"
                      title="Clique para alternar entre Pago e Pendente">
                ${f.pago ? '✅ PAGO' : '⏳ PENDENTE'}
              </button>
            </td>
            <td class="val-col" style="color:var(--purple);font-weight:700;">${formatBRL(f.valor)}</td>
            <td class="action-col">
              <button class="btn-icon edit" title="Editar este lançamento" onclick="MatrixApp.editItemByIndex('${currentYear}', '${currentMonth}', '${t}', ${i})">✏️</button>
              <button class="btn-icon delete" title="Excluir este lançamento" onclick="MatrixApp.removeItemByIndex('${currentYear}', '${currentMonth}', '${t}', ${i})">🗑️</button>
            </td>
          </tr>
        `;
        }).join('');
      }
    }

    // Render Diários / Micro-Gastos Table Body
    const diariosTbody = document.getElementById('diariosTableBody');
    if (diariosTbody) {
      if (diariosList.length === 0) {
        diariosTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:14px;">Nenhum gasto diário registrado neste mês. Clique no botão flutuante "+ Gasto Diário" para lançar.</td></tr>`;
      } else {
        diariosTbody.innerHTML = diariosList.map((d, i) => {
          let dtFmt = '';
          if (d.dataHora) {
            const p = d.dataHora.split('T');
            const dataP = p[0] ? p[0].split('-').reverse().join('/') : '';
            const horaP = p[1] ? p[1].slice(0, 5) : '';
            dtFmt = `${dataP} ${horaP}`.trim();
          }
          return `
          <tr class="${d.pago ? 'paid' : ''}">
            <td class="desc-col" style="cursor:pointer;" onclick="MatrixApp.editQuickExpenseByIndex('${currentYear}', '${currentMonth}', ${i})" title="Toque para editar este gasto diário">
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:2px;">
                <strong>${d.nome}</strong>
                ${dtFmt ? `<small style="color:var(--text-dim);font-size:9.5px;">${dtFmt}</small>` : ''}
              </div>
              <div class="item-meta-row">
                ${renderOrigemBadge(d.conta, d.renda, d.nome)}
                <span class="cat-pill">${d.categoria || 'Gasto Diário'}</span>
                ${d.obs ? `<span style="font-size:9.5px;color:var(--text-muted);font-style:italic;">"${d.obs}"</span>` : ''}
              </div>
            </td>
            <td class="status-col">
              <button type="button" 
                      class="status-btn ${d.pago ? 'pago' : 'pendente'}" 
                      onclick="MatrixApp.togglePaidByIndex('${currentYear}', '${currentMonth}', 'diario', ${i})"
                      title="Clique para alternar entre Pago e Pendente">
                ${d.pago ? '✅ PAGO' : '⏳ PENDENTE'}
              </button>
            </td>
            <td class="val-col" style="color:var(--rose);font-weight:700;">${formatBRL(d.valor)}</td>
            <td class="action-col">
              <button class="btn-icon edit" title="Editar este gasto diário" onclick="MatrixApp.editQuickExpenseByIndex('${currentYear}', '${currentMonth}', ${i})">✏️</button>
              <button class="btn-icon delete" title="Excluir este gasto diário" onclick="MatrixApp.removeQuickExpenseByIndex('${currentYear}', '${currentMonth}', ${i})">🗑️</button>
            </td>
          </tr>
        `;
        }).join('');
      }
    }

    // Render Receitas / Ganhos Table Body & Termômetro
    const benAtual = getBeneficiosCreditoMes(currentYear, currentMonth);
    (monthData.receitas || []).forEach(r => {
      if (isItemVR(r) && !r.manual) {
        r.valor = benAtual.vr;
      } else if (isItemVA(r) && !r.manual) {
        r.valor = benAtual.va;
      }
    });
    const receitasList = monthData.receitas || [];

    // Separação Estrita de Pecúnia (Dinheiro Líquido em Conta) e Benefícios Não-Pecúnia (VA/VR Alimentação)
    const receitasPecuniaList = receitasList.filter(r => !isBeneficioNaoPecunia(r));
    const beneficiosNaoPecuniaList = receitasList.filter(r => isBeneficioNaoPecunia(r));

    const totalReceitasPecunia = receitasPecuniaList.reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
    const pagasReceitasPecunia = receitasPecuniaList.filter(it => it.pago).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
    const pendentesReceitasPecunia = Math.max(0, totalReceitasPecunia - pagasReceitasPecunia);

    const totalBeneficiosNaoPecunia = beneficiosNaoPecuniaList.reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);

    // Termômetro de Receitas reflete a pecúnia
    if (document.getElementById('receitasPagoLabel')) document.getElementById('receitasPagoLabel').textContent = formatBRL(pagasReceitasPecunia);
    if (document.getElementById('receitasPendenteLabel')) document.getElementById('receitasPendenteLabel').textContent = formatBRL(pendentesReceitasPecunia);
    const pctReceitas = totalReceitasPecunia > 0 ? (pagasReceitasPecunia / totalReceitasPecunia) * 100 : 0;
    if (document.getElementById('receitasProgressBar')) document.getElementById('receitasProgressBar').style.width = pctReceitas.toFixed(1) + '%';

    const receitasTbody = document.getElementById('receitasTableBody');
    if (receitasTbody) {
      if (receitasList.length === 0) {
        receitasTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:18px;">Nenhuma receita cadastrada em ${currentMonth}.</td></tr>`;
      } else {
        receitasTbody.innerHTML = receitasList.map((r, i) => {
          const naoPecunia = isBeneficioNaoPecunia(r);
          return `
          <tr class="${r.pago ? 'paid' : ''}" style="${naoPecunia ? 'background:rgba(251,191,36,0.035);' : ''}">
            <td class="desc-col" style="cursor:pointer;" onclick="MatrixApp.editItemByIndex('${currentYear}', '${currentMonth}', 'receita', ${i})" title="Toque para editar esta receita">
              <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
                <strong>${r.nome}</strong>
                ${naoPecunia ? `<span class="cat-pill" style="background:rgba(251,191,36,0.15);color:var(--amber);border:1px solid rgba(251,191,36,0.4);font-size:8.5px;" title="Benefício de Alimentação: não é dinheiro em pecúnia para pagar contas bancárias">🛒 NÃO-PECÚNIA</span>` : ''}
              </div>
              <div class="item-meta-row">
                ${renderOrigemBadge(r.conta, r.renda, r.nome)}
                <span class="cat-pill">${r.categoria || (naoPecunia ? 'Benefício' : 'Receita')}</span>
              </div>
            </td>
            <td class="status-col">
              <button type="button" 
                      class="status-btn ${r.pago ? 'pago' : 'pendente'}" 
                      onclick="MatrixApp.togglePaidByIndex('${currentYear}', '${currentMonth}', 'receita', ${i})"
                      title="Clique para alternar entre Recebido e A Receber">
                ${r.pago ? '✅ PAGO' : '⏳ PEND.'}
              </button>
            </td>
            <td class="val-col" style="color:${naoPecunia ? 'var(--amber)' : 'var(--cyan)'};font-weight:700;">
              ${formatBRL(r.valor)}
              ${naoPecunia ? `<div style="font-size:9px;color:var(--text-dim);font-weight:normal;">(Alimentação)</div>` : ''}
            </td>
            <td class="action-col">
              <button class="btn-icon edit" title="Editar esta receita" onclick="MatrixApp.editItemByIndex('${currentYear}', '${currentMonth}', 'receita', ${i})">✏️</button>
              <button class="btn-icon delete" title="Excluir esta receita" onclick="MatrixApp.removeItemByIndex('${currentYear}', '${currentMonth}', 'receita', ${i})">🗑️</button>
            </td>
          </tr>
        `;
        }).join('');
      }
    }

    // Totais de Fixos, Variáveis, Diários, Fatura Nubank e Gastos Scarlet no Fechamento Consolidado
    const saldoFinal = totalReceitasPecunia - totalDespesasConsolidadas;

    const badgeMes = document.getElementById('fechamentoMesBadge');
    if (badgeMes) badgeMes.textContent = `${currentMonth} / ${currentYear}`;

    const totalRecEl = document.getElementById('fechamentoTotalReceitas');
    if (totalRecEl) totalRecEl.textContent = formatBRL(totalReceitasPecunia);
    const recSubEl = document.getElementById('fechamentoReceitasSub');
    if (recSubEl) {
      const pagCount = receitasPecuniaList.filter(r => r.pago).length;
      const pendCount = receitasPecuniaList.length - pagCount;
      recSubEl.innerHTML = `${pagCount} recebidas • ${pendCount} a receber<br><span style="color:var(--amber);font-size:10px;">(Exclui ${formatBRL(totalBeneficiosNaoPecunia)} em VA/VR alimentação)</span>`;
    }

    const totalFixEl = document.getElementById('fechamentoTotalFixos');
    if (totalFixEl) totalFixEl.textContent = formatBRL(totalFixos);
    const fixSubEl = document.getElementById('fechamentoFixosSub');
    if (fixSubEl) {
      const pagCount = fixosList.filter(f => f.pago).length;
      const pendCount = fixosList.length - pagCount;
      fixSubEl.textContent = `${pagCount} pagos • ${pendCount} pendentes`;
    }

    const totalOutEl = document.getElementById('fechamentoTotalOutros');
    if (totalOutEl) totalOutEl.textContent = formatBRL(totalOutros + totalDiarios);
    const outSubEl = document.getElementById('fechamentoOutrosSub');
    if (outSubEl) {
      const pagCount = outrosList.filter(o => o.pago).length + diariosList.filter(d => d.pago).length;
      const pendCount = (outrosList.length + diariosList.length) - pagCount;
      if (totalTransfScarlet > 0) {
        outSubEl.innerHTML = `${pagCount} pagos • ${pendCount} pendentes<br><span style="color:var(--text-dim);font-size:9.5px;">(inclui ${formatBRL(totalTransfScarlet)} repassado à fatura Nubank)</span>`;
      } else {
        outSubEl.textContent = `${pagCount} pagos • ${pendCount} pendentes`;
      }
    }

    // Fatura Cartão Nubank da Scarlet (Dívida Consolidada)
    const totalFatEl = document.getElementById('fechamentoTotalFatura');
    if (totalFatEl) totalFatEl.textContent = formatBRL(faturaNubank);
    const fatSubEl = document.getElementById('fechamentoFaturaSub');
    if (fatSubEl) {
      fatSubEl.innerHTML = `Cartão Nubank Black • ${isFaturaPaga ? '<span style="color:var(--matrix-green);font-weight:700;">Paga</span>' : '<span style="color:var(--amber);font-weight:700;">Pendente</span>'}`;
    }
    const fatBtnEl = document.getElementById('fechamentoFaturaStatusBtn');
    if (fatBtnEl) {
      fatBtnEl.className = `status-btn-mini ${isFaturaPaga ? 'pago' : 'pendente'}`;
      fatBtnEl.textContent = isFaturaPaga ? '✅ PAGO' : '⏳ PEND.';
      fatBtnEl.title = `Clique para alternar Fatura Nubank entre ${isFaturaPaga ? 'Pendente' : 'Paga'}`;
    }

    // Saldo Líquido Consolidado
    const saldoLiqEl = document.getElementById('fechamentoSaldoLiquido');
    if (saldoLiqEl) {
      saldoLiqEl.textContent = formatBRL(saldoFinal);
      saldoLiqEl.style.color = saldoFinal >= 0 ? 'var(--matrix-green)' : 'var(--rose)';
    }

    const saldoSubEl = document.getElementById('fechamentoSaldoSub');
    if (saldoSubEl) {
      saldoSubEl.textContent = saldoFinal >= 0 ? 'Margem consolidada pós-despesas e fatura' : 'Déficit consolidado no mês';
    }

    const saldoBadgeEl = document.getElementById('fechamentoSaldoBadge');
    if (saldoBadgeEl) {
      saldoBadgeEl.className = `status-badge ${saldoFinal >= 0 ? 'pago' : 'pendente'}`;
      saldoBadgeEl.textContent = saldoFinal >= 0 ? 'SUPERÁVIT' : 'DÉFICIT';
    }

    const saldoFinalEl = document.getElementById('fechamentoSaldoFinal');
    if (saldoFinalEl) {
      saldoFinalEl.textContent = formatBRL(saldoFinal);
      saldoFinalEl.style.color = saldoFinal >= 0 ? 'var(--matrix-green)' : 'var(--rose)';
    }

    // Rastreabilidade: De Onde Veio ➔ Para Onde Foi
    renderCashflowTrace(monthData, totalReceitasPecunia, fixosList, outrosList, diariosList);

    // Render Bloco Contas de Início de Ano (se Janeiro)
    const contasInicioBox = document.getElementById('contasInicioAnoBox');
    if (contasInicioBox) {
      if (currentMonth === 'Janeiro') {
        contasInicioBox.style.display = 'block';
        renderContasInicioAno(monthData);
      } else {
        contasInicioBox.style.display = 'none';
      }
    }

    // Render Bloco Revisão Anual de Gastos & Ranking Top 10 (se Dezembro)
    const revisaoDezembroBox = document.getElementById('revisaoAnualDezembroBox');
    if (revisaoDezembroBox) {
      if (currentMonth === 'Dezembro') {
        revisaoDezembroBox.style.display = 'block';
        renderRevisaoAnualDezembro(currentYear);
      } else {
        revisaoDezembroBox.style.display = 'none';
      }
    }
  }

  function renderContasInicioAno(monthData) {
    const tbody = document.getElementById('contasInicioTableBody');
    if (!tbody) return;

    // Buscar lista de contas de início de ano nos totais da planilha
    const itens = [];
    if (monthData.totais) {
      for (const k in monthData.totais) {
        if (['IPTU', 'IPVA CARRO', 'LIC CARRO', 'CREFITO', 'SEG CARRO', 'REVISÃO CARRO'].includes(k)) {
          itens.push({ nome: k, valor: parseFloat(monthData.totais[k]) || 0 });
        }
      }
    }

    if (itens.length === 0) {
      itens.push(
        { nome: 'IPTU', valor: 1035.91 },
        { nome: 'IPVA CARRO', valor: 1017.76 },
        { nome: 'LIC CARRO', valor: 187.00 },
        { nome: 'CREFITO (Scarlet)', valor: 451.00 }
      );
    }

    tbody.innerHTML = itens.map(it => `
      <tr>
        <td><strong>${it.nome}</strong></td>
        <td><span class="status-badge pendente">Janeiro</span></td>
        <td class="val-col">${formatBRL(it.valor)}</td>
      </tr>
    `).join('');
  }

  // ==========================================
  // 2.1 CONTROLE DE GASTOS DIÁRIOS (FAB & MODAL)
  // ==========================================
  
  // ==========================================
  // APRENDIZADO E SUGESTÃO AUTOMÁTICA DE CATEGORIAS
  // ==========================================
  function onQuickExpenseNomeInput(nomeVal) {
    const hintEl = document.getElementById('quickExpenseCatHint');
    const catSelect = document.getElementById('quickExpenseCategoria');
    if (!catSelect) return;

    if (!nomeVal || nomeVal.trim().length < 2) {
      if (hintEl) hintEl.style.display = 'none';
      return;
    }

    if (isCaronaItem({ nome: nomeVal })) {
      const opt = Array.from(catSelect.options).find(o => o.value.toLowerCase().includes('transporte'));
      if (opt) catSelect.value = opt.value;
      if (hintEl) {
        hintEl.innerHTML = '🚗 <span style="color:var(--matrix-green);font-weight:bold;">Abate da Provisão de Caronas USP!</span>';
        hintEl.style.display = 'inline-block';
      }
      return;
    }

    const nvl = nomeVal.toLowerCase();
    if (nvl.includes('mega') || nvl.includes('sena') || nvl.includes('loteria') || nvl.includes('aposta')) {
      const opt = Array.from(catSelect.options).find(o => o.value.toLowerCase().includes('lazer'));
      if (opt) catSelect.value = opt.value;
      if (hintEl) {
        hintEl.innerHTML = '🍀 <span style="color:var(--cyan);font-weight:bold;">Aposta / Lazer memorizado!</span>';
        hintEl.style.display = 'inline-block';
      }
      return;
    }

    if (isTransferenciaParaScarlet({ nome: nomeVal })) {
      const opt = Array.from(catSelect.options).find(o => o.value.toLowerCase().includes('transferência scarlet') || o.value.toLowerCase().includes('transferencia scarlet'));
      if (opt) catSelect.value = opt.value;
      if (hintEl) {
        hintEl.innerHTML = '🤝 <span style="color:var(--amber);font-weight:bold;">Repasse / Transf. para Scarlet!</span>';
        hintEl.style.display = 'inline-block';
      }
      return;
    }

    const predicted = MatrixDB.predictCategory(nomeVal.trim());
    if (predicted) {
      // Verifica se a categoria prevista existe no select
      const opt = Array.from(catSelect.options).find(o => o.value.toLowerCase() === predicted.toLowerCase());
      if (opt) {
        catSelect.value = opt.value;
        if (hintEl) {
          hintEl.textContent = '✨ Lembrado: ' + opt.value;
          hintEl.style.display = 'inline-block';
        }
      }
    } else {
      if (hintEl) hintEl.style.display = 'none';
    }
  }

  // ==========================================
  // SUGESTÕES DINÂMICAS DE GASTOS DIÁRIOS RÁPIDOS (TOP 3)
  // ==========================================
  function getTopQuickExpenses(ano, mes) {
    const sAno = String(ano || currentYear || '2026');
    const sMes = String(mes || currentMonth || 'Novembro');
    const state = MatrixDB.getState();

    const freqMap = {};

    function processItem(it, weight = 1) {
      if (!it || !it.nome) return;
      let rawName = String(it.nome || '').trim();
      if (!rawName || isSummaryOrTotalItem(rawName)) return;

      // Remove marcadores de faturas de cartão/roteamento
      rawName = rawName.replace(/\s*\((Crédito Nubank|Crédito BB|Débito Inter|Pix Inter|Crédito Banco do Brasil)\)/gi, '').trim();
      if (!rawName) return;

      const nl = rawName.toLowerCase();
      const isCarona = isCaronaItem({ nome: rawName, categoria: it.categoria });
      const isMega = nl.includes('mega') || nl.includes('sena') || nl.includes('lotérica') || nl.includes('loterica');

      let normKey = nl;
      let displayName = rawName;
      if (isCarona) {
        normKey = 'carona_usp';
        displayName = 'Carona USP';
      } else if (isMega) {
        normKey = 'mega_sena';
        displayName = 'Mega Sena';
      }

      if (!freqMap[normKey]) {
        freqMap[normKey] = {
          key: normKey,
          isCarona,
          isMegaSena: isMega,
          nome: displayName,
          count: 0,
          valores: [],
          contas: {},
          categorias: {}
        };
      }

      const entry = freqMap[normKey];
      entry.count += weight;

      const val = parseFloat(it.valor);
      if (!isNaN(val) && val > 0) {
        entry.valores.push(val);
      }

      if (it.conta) {
        entry.contas[it.conta] = (entry.contas[it.conta] || 0) + 1;
      }
      if (it.categoria) {
        entry.categorias[it.categoria] = (entry.categorias[it.categoria] || 0) + 1;
      }
    }

    // 1. Prioriza com peso 3 os gastos do mês corrente (diários e variáveis lançados)
    const monthData = (state.anos && state.anos[sAno] && state.anos[sAno][sMes]) || MatrixDB.getMonth(sAno, sMes) || {};
    (monthData.diarios || []).forEach(it => processItem(it, 3));
    (monthData.outros || []).forEach(it => processItem(it, 3));

    // 2. Analisa histórico recente com peso 1 (diários e variáveis)
    if (state.anos) {
      Object.entries(state.anos).forEach(([aKey, meses]) => {
        if (!meses) return;
        Object.entries(meses).forEach(([mKey, md]) => {
          if (aKey === sAno && mKey === sMes) return;
          if (md) {
            if (Array.isArray(md.diarios)) md.diarios.forEach(it => processItem(it, 1));
            if (Array.isArray(md.outros)) md.outros.forEach(it => processItem(it, 1));
          }
        });
      });
    }

    // 3. Consulta memória de categorias aprendidas
    try {
      const catMem = MatrixDB.getCategoryMemory ? MatrixDB.getCategoryMemory() : {};
      if (catMem && typeof catMem === 'object') {
        Object.entries(catMem).forEach(([desc, cat]) => {
          if (!desc) return;
          processItem({ nome: desc, categoria: cat, valor: 5, conta: 'debito_inter' }, 1);
        });
      }
    } catch (_) {}

    // 4. Garante 'Carona USP' fixa com R$ 30 e Pix Inter como Staple #1 incondicional
    if (!freqMap['carona_usp']) {
      freqMap['carona_usp'] = {
        key: 'carona_usp',
        isCarona: true,
        nome: 'Carona USP',
        count: 99999,
        valores: [30],
        contas: { pix_inter: 10 },
        categorias: { Transporte: 10 }
      };
    } else {
      freqMap['carona_usp'].isCarona = true;
      freqMap['carona_usp'].nome = 'Carona USP';
      freqMap['carona_usp'].count = 99999;
      freqMap['carona_usp'].valores = [30];
      freqMap['carona_usp'].contas['pix_inter'] = (freqMap['carona_usp'].contas['pix_inter'] || 0) + 10;
      freqMap['carona_usp'].categorias['Transporte'] = 10;
    }

    // 5. Garante 'Mega Sena' com ícone 🍀 e R$ 5 Débito Inter como Staple #2 incondicional
    if (!freqMap['mega_sena']) {
      freqMap['mega_sena'] = {
        key: 'mega_sena',
        isMegaSena: true,
        nome: 'Mega Sena',
        count: 88888,
        valores: [5],
        contas: { debito_inter: 10 },
        categorias: { Lazer: 10 }
      };
    } else {
      freqMap['mega_sena'].isMegaSena = true;
      freqMap['mega_sena'].nome = 'Mega Sena';
      freqMap['mega_sena'].count = 88888;
      if (!freqMap['mega_sena'].valores.length) freqMap['mega_sena'].valores.push(5);
      if (!Object.keys(freqMap['mega_sena'].contas).length) freqMap['mega_sena'].contas['debito_inter'] = 10;
      if (!Object.keys(freqMap['mega_sena'].categorias).length) freqMap['mega_sena'].categorias['Lazer'] = 10;
    }

    const items = Object.values(freqMap).map(e => {
      if (e.isCarona) {
        return {
          nome: 'Carona USP',
          valor: 30,
          categoria: 'Transporte',
          conta: 'pix_inter',
          icone: '🚗',
          count: e.count
        };
      }

      if (e.isMegaSena) {
        let valMega = 5;
        if (e.valores.length > 0) {
          const valCounts = {};
          let maxVCount = 0;
          e.valores.forEach(v => {
            valCounts[v] = (valCounts[v] || 0) + 1;
            if (valCounts[v] > maxVCount) {
              maxVCount = valCounts[v];
              valMega = v;
            }
          });
        }
        let contaMega = 'debito_inter';
        let maxCCount = 0;
        Object.entries(e.contas).forEach(([cName, cCnt]) => {
          if (cCnt > maxCCount) {
            maxCCount = cCnt;
            contaMega = cName;
          }
        });
        return {
          nome: 'Mega Sena',
          valor: valMega,
          categoria: 'Lazer',
          conta: contaMega,
          icone: '🍀',
          count: e.count
        };
      }

      let valorFinal = 0;
      if (e.valores.length > 0) {
        const valCounts = {};
        let maxVCount = 0;
        e.valores.forEach(v => {
          valCounts[v] = (valCounts[v] || 0) + 1;
          if (valCounts[v] > maxVCount) {
            maxVCount = valCounts[v];
            valorFinal = v;
          }
        });
      }

      let contaFinal = 'debito_inter';
      let maxCCount = 0;
      Object.entries(e.contas).forEach(([cName, cCnt]) => {
        if (cCnt > maxCCount) {
          maxCCount = cCnt;
          contaFinal = cName;
        }
      });

      let catFinal = 'Outros';
      let maxCatCount = 0;
      Object.entries(e.categorias).forEach(([catName, catCnt]) => {
        if (catCnt > maxCatCount) {
          maxCatCount = catCnt;
          catFinal = catName;
        }
      });

      let icone = '⚡';
      const nl = e.nome.toLowerCase();
      const cl = catFinal.toLowerCase();
      if (nl.includes('carona') || cl.includes('transporte') || nl.includes('uber') || nl.includes('combustivel')) icone = '🚗';
      else if (nl.includes('mega') || nl.includes('sena') || nl.includes('loteria') || nl.includes('aposta') || nl.includes('jogo')) icone = '🍀';
      else if (cl.includes('supermercado') || nl.includes('mercado') || nl.includes('padaria') || nl.includes('compra')) icone = '🛒';
      else if (cl.includes('farmácia') || cl.includes('saúde') || nl.includes('droga') || nl.includes('farmacia')) icone = '💊';
      else if (cl.includes('alimentação') || nl.includes('lanche') || nl.includes('restaurante') || nl.includes('almoço')) icone = '🍽️';
      else if (cl.includes('lazer') || nl.includes('cinema')) icone = '🍿';
      else if (cl.includes('transferência') || nl.includes('scarlet')) icone = '🤝';

      return {
        nome: e.nome,
        valor: valorFinal,
        categoria: catFinal,
        conta: contaFinal,
        icone,
        count: e.count
      };
    });

    items.sort((a, b) => {
      if (a.nome === 'Carona USP') return -1;
      if (b.nome === 'Carona USP') return 1;
      if (a.nome === 'Mega Sena') return -1;
      if (b.nome === 'Mega Sena') return 1;
      return b.count - a.count;
    });

    return items.slice(0, 3);
  }

  function renderQuickExpenseButtons(ano, mes) {
    const container = document.getElementById('quickExpenseQuickButtons');
    if (!container) return;

    const topItems = getTopQuickExpenses(ano, mes);
    if (!topItems || topItems.length === 0) {
      container.innerHTML = '';
      return;
    }

    const themeColors = [
      { border: 'rgba(0,255,102,0.4)', color: 'var(--matrix-green)', bg: 'rgba(0,255,102,0.06)' },
      { border: 'rgba(6,182,212,0.4)', color: 'var(--cyan)', bg: 'rgba(6,182,212,0.06)' },
      { border: 'rgba(192,132,252,0.4)', color: 'var(--purple)', bg: 'rgba(192,132,252,0.06)' }
    ];

    container.innerHTML = topItems.map((it, idx) => {
      const theme = themeColors[idx % themeColors.length];
      const valStr = it.valor > 0 ? ` (R$ ${it.valor % 1 === 0 ? it.valor : it.valor.toFixed(2)})` : '';
      const safeNome = it.nome.replace(/'/g, "\\'");
      const safeCat = (it.categoria || '').replace(/'/g, "\\'");
      const safeConta = (it.conta || 'pix_inter').replace(/'/g, "\\'");

      return `<button type="button" class="btn-matrix" style="font-size:10px;padding:3px 8px;border-color:${theme.border};color:${theme.color};background:${theme.bg};" onclick="MatrixApp.preencherGastoRapido('${safeNome}', ${it.valor}, '${safeCat}', '${safeConta}')" title="Preencher gasto rápido: ${it.nome}">${it.icone} ${it.nome}${valStr}</button>`;
    }).join('');
  }

  function preencherGastoRapido(nome, valor, categoria, conta) {
    const nomeInput = document.getElementById('quickExpenseNome');
    const valorInput = document.getElementById('quickExpenseValor');
    const catSelect = document.getElementById('quickExpenseCategoria');
    const contaSelect = document.getElementById('quickExpenseConta');
    const pagoSim = document.getElementById('quickExpensePagoSim');

    if (nomeInput) nomeInput.value = nome;
    if (valorInput) valorInput.value = (valor != null && !isNaN(valor) && valor > 0) ? (Number(valor) % 1 === 0 ? String(Number(valor)) : Number(valor).toFixed(2)) : '';
    if (catSelect && categoria) catSelect.value = categoria;
    if (contaSelect && conta) contaSelect.value = conta;
    if (pagoSim) pagoSim.checked = true;

    onQuickExpenseNomeInput(nome);
  }

  function lancarCaronaRapidaHoje() {
    openQuickExpenseModal();
    preencherGastoRapido('Carona USP', 30, 'Transporte', 'pix_inter');
  }

  function onQuickExpenseCategoriaChange(catVal) {
    const nomeInput = document.getElementById('quickExpenseNome');
    const hintEl = document.getElementById('quickExpenseCatHint');
    if (nomeInput && nomeInput.value.trim().length >= 2) {
      MatrixDB.learnCategoryMapping(nomeInput.value.trim(), catVal);
      if (hintEl) {
        hintEl.textContent = '💾 Classificação salva!';
        hintEl.style.display = 'inline-block';
        setTimeout(() => { if (hintEl) hintEl.style.display = 'none'; }, 2000);
      }
    }
  }

  function onModalItemNomeInput(nomeVal) {
    const hintEl = document.getElementById('modalItemCatHint');
    const catSelect = document.getElementById('modalItemCategoria');
    if (!catSelect) return;

    if (!nomeVal || nomeVal.trim().length < 2) {
      if (hintEl) hintEl.style.display = 'none';
      return;
    }

    const predicted = MatrixDB.predictCategory(nomeVal.trim());
    if (predicted) {
      const opt = Array.from(catSelect.options).find(o => o.value.toLowerCase() === predicted.toLowerCase());
      if (opt) {
        catSelect.value = opt.value;
        if (hintEl) {
          hintEl.textContent = '✨ Lembrado: ' + opt.value;
          hintEl.style.display = 'inline-block';
        }
      }
    } else {
      if (hintEl) hintEl.style.display = 'none';
    }
  }

    // Preenche opções de meses de início da amortização (1ª parcela)
  function populateModalEmprestimoMeses(selectedVal = null) {
    const sel = document.getElementById('modalEmprestimoInicioMes');
    if (!sel) return;

    sel.innerHTML = '';
    const curY = parseInt(currentYear, 10) || 2026;
    const curMIdx = MONTH_NAMES.indexOf(currentMonth) >= 0 ? MONTH_NAMES.indexOf(currentMonth) : 10;

    for (let offset = 1; offset <= 12; offset++) {
      let mIdx = curMIdx + offset;
      let y = curY + Math.floor(mIdx / 12);
      mIdx = mIdx % 12;
      const mesNome = MONTH_NAMES[mIdx];
      const monthNum = String(mIdx + 1).padStart(2, '0');
      const val = `${y}-${monthNum}`;

      let labelDesc = '';
      if (offset === 1) {
        labelDesc = ' (Mês seguinte • Padrão)';
      } else if (offset === 2) {
        labelDesc = ' (Carência de 1 mês)';
      } else if (offset === 3) {
        labelDesc = ' (Carência de 2 meses)';
      } else {
        labelDesc = ` (+${offset} meses)`;
      }

      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = `${monthNum}/${y} • ${mesNome}${labelDesc}`;
      if (selectedVal ? val === selectedVal : offset === 1) {
        opt.selected = true;
      }
      sel.appendChild(opt);
    }
  }

  function onEmprestimoModalidadeChange(modalidade) {
    const box = document.getElementById('modalEmprestimoAntiduplicidadeBox');
    if (!box) return;
    if (modalidade === 'consignado') {
      box.style.display = 'block';
      box.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;color:var(--cyan);font-weight:700;margin-bottom:3px;font-family:var(--font-mono);">
          <span>🛡️ Prevenção Inteligente de Duplicidade no Holerite:</span>
        </div>
        <span>Nos meses futuros (projeção), as parcelas atuarão como Gastos Fixos para simular a redução real do salário. Quando o holerite oficial daquele mês for importado (cujo líquido já vem descontado pela USP), a dedução é conciliada automaticamente para não debitar duas vezes no caixa.</span>
      `;
    } else {
      box.style.display = 'block';
      box.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;color:var(--amber);font-weight:700;margin-bottom:3px;font-family:var(--font-mono);">
          <span>💳 Débito em Conta Corrente:</span>
        </div>
        <span>As parcelas serão debitadas diretamente da sua conta corrente mensalmente. Não há retenção no holerite da USP.</span>
      `;
    }
  }

  function recalcEmprestimoParcelaSugestao() {
    const valorTotal = parseFloat(document.getElementById('modalItemValor')?.value) || 0;
    const numParc = parseInt(document.getElementById('modalEmprestimoNumParcelas')?.value, 10) || 1;
    const hint = document.getElementById('modalEmprestimoSugestaoHint');
    const inputVal = document.getElementById('modalEmprestimoValorParcela');

    if (valorTotal > 0 && numParc > 0) {
      const sugerido = Math.round((valorTotal / numParc) * 100) / 100;
      if (hint) {
        hint.innerHTML = `💡 Sugestão automática: <strong>${formatBRL(sugerido)}/mês</strong> (${formatBRL(valorTotal)} ÷ ${numParc}x)`;
      }
      if (inputVal && !inputVal.value) {
        inputVal.placeholder = sugerido.toFixed(2);
      }
    }
  }

  function recalcularHoleriteManualLiquido() {
    const vencimento = parseFloat(document.getElementById('hlVencimento')?.value) || 0;
    const auxSaude = parseFloat(document.getElementById('hlAuxSaude')?.value) || 0;
    const inss = parseFloat(document.getElementById('hlInss')?.value) || 0;
    const ir = parseFloat(document.getElementById('hlIr')?.value) || 0;
    const sindicato = parseFloat(document.getElementById('hlSindicato')?.value) || 0;
    const descVr = parseFloat(document.getElementById('hlDescontoVr')?.value) || 0;
    const consignado = parseFloat(document.getElementById('hlConsignado')?.value) || 0;

    const liqCalculado = Math.max(0, vencimento + auxSaude - inss - ir - sindicato - descVr - consignado);
    const hlLiq = document.getElementById('hlLiquido');
    if (hlLiq) {
      hlLiq.value = liqCalculado.toFixed(2);
    }
  }

function onModalCategoriaChange(catVal) {
    const nomeInput = document.getElementById('modalItemNome');
    const hintEl = document.getElementById('modalItemCatHint');
    if (nomeInput && nomeInput.value.trim().length >= 2) {
      MatrixDB.learnCategoryMapping(nomeInput.value.trim(), catVal);
      if (hintEl) {
        hintEl.textContent = '💾 Classificação salva!';
        hintEl.style.display = 'inline-block';
        setTimeout(() => { if (hintEl) hintEl.style.display = 'none'; }, 2000);
      }
    }

    const empSection = document.getElementById('modalEmprestimoSection');
    const rendaSel = document.getElementById('modalItemRenda');
    if (catVal === 'Empréstimo') {
      if (empSection) empSection.style.display = 'block';
      if (rendaSel) rendaSel.value = 'emprestimo';
      populateModalEmprestimoMeses();
      recalcEmprestimoParcelaSugestao();
    } else {
      if (empSection) empSection.style.display = 'none';
      if (catVal === 'Outras Rendas Scarlet' && rendaSel) {
        rendaSel.value = 'outras_rendas_scarlet';
      } else if (catVal === 'Fisio Scarlet' && rendaSel) {
        rendaSel.value = 'ganhos_scarlet';
      }
    }
  }

  function openQuickExpenseModal(index = null) {
    try {
      renderQuickExpenseButtons(currentYear, currentMonth);
    } catch (e) {
      console.warn('Erro ao renderizar botões rápidos:', e);
    }
    const titleEl = document.getElementById('quickExpenseModalTitle');
    const idxInput = document.getElementById('quickExpenseEditIndex');
    const nomeInput = document.getElementById('quickExpenseNome');
    const valorInput = document.getElementById('quickExpenseValor');
    const dataHoraInput = document.getElementById('quickExpenseDataHora');
    const catSelect = document.getElementById('quickExpenseCategoria');
    const contaSelect = document.getElementById('quickExpenseConta');
    const pagoSim = document.getElementById('quickExpensePagoSim');
    const pagoNao = document.getElementById('quickExpensePagoNao');
    const obsInput = document.getElementById('quickExpenseObs');

    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    if (index !== null && index !== undefined && index !== '') {
      const month = MatrixDB.getMonth(currentYear, currentMonth);
      const item = (month.diarios || [])[index];
      if (item) {
        if (titleEl) titleEl.textContent = '✏️ Editar Gasto Diário';
        if (idxInput) idxInput.value = String(index);
        if (nomeInput) nomeInput.value = item.nome || '';
        if (valorInput) valorInput.value = item.valor != null ? item.valor : '';
        if (dataHoraInput) dataHoraInput.value = item.dataHora ? item.dataHora.slice(0, 16) : localIso;
        if (catSelect && item.categoria) catSelect.value = item.categoria;
        if (contaSelect && item.conta) contaSelect.value = item.conta;
        if (pagoSim && pagoNao) {
          if (item.pago) pagoSim.checked = true;
          else pagoNao.checked = true;
        }
        if (obsInput) obsInput.value = item.obs || '';
        openModal('quickExpenseModalBackdrop');
        return;
      }
    }

    // Novo lançamento
    if (titleEl) titleEl.textContent = '⚡ Registrar Gasto Diário';
    if (idxInput) idxInput.value = '';
    if (nomeInput) nomeInput.value = '';
    if (valorInput) valorInput.value = '';
    if (dataHoraInput) dataHoraInput.value = localIso;
    if (catSelect) catSelect.value = 'Alimentação';
    if (contaSelect) contaSelect.value = 'debito_inter';
    if (pagoSim) pagoSim.checked = true;
    if (obsInput) obsInput.value = '';

    const qeHint = document.getElementById('quickExpenseCatHint');
    if (qeHint) qeHint.style.display = 'none';

    openModal('quickExpenseModalBackdrop');
  }

  function saveQuickExpense() {
    const idxVal = document.getElementById('quickExpenseEditIndex').value;
    const nome = document.getElementById('quickExpenseNome').value.trim();
    const valor = parseFloat(document.getElementById('quickExpenseValor').value) || 0;
    const dataHora = document.getElementById('quickExpenseDataHora').value;
    const categoria = document.getElementById('quickExpenseCategoria').value;
    const conta = document.getElementById('quickExpenseConta').value;
    const pago = document.getElementById('quickExpensePagoSim').checked;
    const obs = document.getElementById('quickExpenseObs').value.trim();

    if (!nome) {
      alert('Informe a descrição do gasto diário.');
      return;
    }
    if (valor <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    // Regra 1: Cartão da Scarlet é exclusivo do App Faturas (puxado automaticamente)
    if (conta === 'credito_nubank_scarlet') {
      alert('Os gastos no cartão Nubank da Scarlet são gerenciados e lançados exclusivamente no App Faturas, sendo sincronizados automaticamente aqui no Matrix.');
      return;
    }

    // Regra 2: Crédito Nubank (Matheus) ou Crédito Banco do Brasil caem nos Gastos Variáveis do MÊS SEGUINTE
    const isCreditoNubank = (conta === 'credito_nubank' || conta === 'credito_nubank_matheus');
    const isCreditoBB = (conta === 'credito_bb');

    if (isCreditoNubank || isCreditoBB) {
      const curMIdx = MONTH_NAMES.indexOf(currentMonth);
      let targetMIdx = curMIdx + 1;
      let targetYear = parseInt(currentYear, 10);
      if (targetMIdx > 11) {
        targetMIdx = 0;
        targetYear += 1;
      }
      const targetMonthName = MONTH_NAMES[targetMIdx];

      // Inicializa o mês destino no banco de dados se necessário
      const s = MatrixDB.getState();
      if (!s.anos[targetYear]) s.anos[targetYear] = {};
      if (!s.anos[targetYear][targetMonthName]) {
        s.anos[targetYear][targetMonthName] = { fixos: [], outros: [], receitas: [], diarios: [], totais: {} };
      }
      const targetMonthObj = s.anos[targetYear][targetMonthName];
      if (!targetMonthObj.outros) targetMonthObj.outros = [];
      if (!targetMonthObj.diarios) targetMonthObj.diarios = [];

      const targetNomeItem = isCreditoNubank ? 'Nubank' : 'BB';
      const targetCatItem = 'Cartão';

      // Atualiza o item correspondente nos Gastos Variáveis ('outros') do mês seguinte
      let itemVariavel = targetMonthObj.outros.find(it => {
        const n = (it.nome || '').trim().toLowerCase();
        if (isCreditoNubank) {
          return (n === 'nubank' || n.includes('nubank')) && !n.includes('scarlet');
        } else {
          return n === 'bb' || n.includes('banco do brasil') || n.includes('cartão bb');
        }
      });

      if (itemVariavel) {
        itemVariavel.valor = Math.round(((parseFloat(itemVariavel.valor) || 0) + valor) * 100) / 100;
        if (obs) {
          itemVariavel.descricao = (itemVariavel.descricao ? (itemVariavel.descricao + ' | ') : '') + `${nome} (${formatBRL(valor)})`;
        }
      } else {
        targetMonthObj.outros.push({
          id: 'out_' + (isCreditoNubank ? 'nubank_' : 'bb_') + Date.now(),
          nome: targetNomeItem,
          valor: valor,
          categoria: targetCatItem,
          conta: isCreditoNubank ? 'credito_nubank' : 'credito_bb',
          pago: false,
          descricao: `${nome} (${formatBRL(valor)})`
        });
      }

      // Adiciona também aos gastos diários detalhados do mês seguinte para manter o histórico (marcado como jaAlocadoVariavel para não duplicar soma)
      targetMonthObj.diarios.push({
        id: 'diar_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        nome: `${nome} (${isCreditoNubank ? 'Crédito Nubank' : 'Crédito BB'})`,
        valor,
        dataHora: dataHora || new Date().toISOString(),
        categoria,
        conta,
        pago: false,
        jaAlocadoVariavel: true,
        obs: obs ? `${obs} [Fatura ${targetMonthName}/${targetYear}]` : `[Fatura ${targetMonthName}/${targetYear}]`
      });

      MatrixDB.saveState(s);
      closeModal('quickExpenseModalBackdrop');
    renderAll();
    try { renderQuickExpenseButtons(currentYear, currentMonth); } catch (_) {}
      alert(`✅ Gasto de ${formatBRL(valor)} ("${nome}") lançado no Crédito!\nAlocado para o mês seguinte (${targetMonthName}/${targetYear}) nos Gastos Variáveis relativos ao ${targetNomeItem}.`);
      return;
    }

    // Regra 3: Débito Inter, Cartões VA/VR e demais contas à vista vão para o MÊS VIGENTE
    // Grava e memoriza a classificação da categoria escolhida pelo usuário para este gasto
    MatrixDB.learnCategoryMapping(nome, categoria);

    const isTransf = categoria === 'Transferência Scarlet' || isTransferenciaParaScarlet({ nome, categoria, obs });
    const payload = {
      nome,
      valor,
      dataHora,
      categoria,
      conta,
      pago,
      obs,
      transferenciaScarlet: isTransf
    };

    if (idxVal !== '') {
      const index = parseInt(idxVal, 10);
      MatrixDB.updateTransactionByIndex(currentYear, currentMonth, 'diario', index, payload);
    } else {
      MatrixDB.addTransaction(currentYear, currentMonth, 'diario', payload);
    }

    // Se for gasto em Cartão VA ou Cartão VR, sincroniza imediatamente o saldo da Casa Maracaju 88
    if (conta === 'cartao_vr' || conta === 'vr' || conta === 'cartao_va' || conta === 'va') {
      if (typeof SatelliteConnectors !== 'undefined' && typeof SatelliteConnectors.syncMaracajuFromLocal === 'function') {
        SatelliteConnectors.syncMaracajuFromLocal();
      }
    }

    closeModal('quickExpenseModalBackdrop');
    renderAll();
    try { renderQuickExpenseButtons(currentYear, currentMonth); } catch (_) {}
  }

  function editQuickExpenseByIndex(ano, mes, index) {
    openQuickExpenseModal(index);
  }

  function removeQuickExpenseByIndex(ano, mes, index) {
    const month = MatrixDB.getMonth(ano, mes);
    const item = (month.diarios || [])[index];
    const desc = item ? `"${item.nome}" (${formatBRL(item.valor)})` : 'este gasto diário';
    if (confirm(`Deseja realmente excluir ${desc}?`)) {
      MatrixDB.removeTransactionByIndex(ano, mes, 'diario', index);
      renderAll();
    }
  }

  // ==========================================
  // 2.2 REVISÃO ANUAL DE DEZEMBRO & CONSOLIDADO DO CASAL (MATHEUS & SCARLET)
  // ==========================================
  function renderRevisaoAnualDezembro(ano) {
    const container = document.getElementById('revisaoAnualDezembroConteudo');
    const labelAno = document.getElementById('revisaoAnoLabel');
    if (labelAno) labelAno.textContent = ano;
    if (!container) return;

    const state = MatrixDB.getState();
    const yearData = (state.anos && state.anos[ano]) || {};

    // 1. Identificar estritamente os meses lançados no ano vigente (não dividir por 12 se houver menos meses lançados)
    const mesesComLancamento = [];
    MONTH_NAMES.forEach(mes => {
      const m = yearData[mes];
      if (!m) return;
      const recs = m.receitas || [];
      const fix = m.fixos || [];
      const out = m.outros || [];
      const dia = m.diarios || [];
      const temRec = recs.some(r => (parseFloat(r.valor) || 0) > 0);
      const temFix = fix.some(f => (parseFloat(f.valor) || 0) > 0);
      const temOut = out.some(o => (parseFloat(o.valor) || 0) > 0);
      const temDia = dia.some(d => (parseFloat(d.valor) || 0) > 0);
      const temFat = m.fatura && (parseFloat(m.fatura.valor) || 0) > 0;
      const salMatheus = getSalarioLiquidoMes(ano, mes);
      const salScarlet = getGanhosScarletMes(ano, mes);
      if (temRec || temFix || temOut || temDia || temFat || salMatheus > 0 || salScarlet > 0) {
        mesesComLancamento.push(mes);
      }
    });

    const divisorMeses = Math.max(1, mesesComLancamento.length);
    const labelPeriodo = (mesesComLancamento.length === 12)
      ? 'Acumulado de Janeiro a Dezembro (12 meses)'
      : (mesesComLancamento.length > 0
          ? `Acumulado de ${mesesComLancamento[0]} a ${mesesComLancamento[mesesComLancamento.length - 1]} (${divisorMeses} ${divisorMeses === 1 ? 'mês considerado' : 'meses considerados'})`
          : `Ano ${ano}`);

    const expenseAggregation = {};
    let totalAnoMatheus = 0;
    let totalAnoScarlet = 0;
    let totalAnoGastosCasal = 0;

    // 2. Consolidado mês a mês do casal (Ganhos Matheus, Ganhos Scarlet, Renda do Casal, Despesas e Sobra)
    const linhasConsolidado = mesesComLancamento.map(mes => {
      const m = yearData[mes] || {};

      // Ganhos Matheus: Salário Líquido USP + 13º + Rendas Extras do Matheus (exclui VA/VR e receitas da Scarlet)
      const salMatheus = getSalarioLiquidoMes(ano, mes);
      let decimoTerceiro = 0;
      let extrasMatheus = 0;
      (m.receitas || []).forEach(r => {
        if (isReceita13Salario(r)) {
          decimoTerceiro += (parseFloat(r.valor) || 0);
        } else if (isReceitaExtraMatheus(r)) {
          extrasMatheus += (parseFloat(r.valor) || 0);
        }
      });
      const ganhoMatheusMes = salMatheus + decimoTerceiro + extrasMatheus;

      // Ganhos Scarlet: FisioFlow (regra M+1) + Outras Rendas da Scarlet
      const fisioScarlet = getGanhosScarletMes(ano, mes);
      const outrasScarlet = getOutrasRendasScarletMes(ano, mes);
      const ganhoScarletMes = fisioScarlet + outrasScarlet;

      // Renda Total Conjunta do Casal em Conta Corrente
      const rendaCasalMes = ganhoMatheusMes + ganhoScarletMes;

      // Despesas do Casal: Fixos + Variáveis + Diários + Fatura (Opção 1: Provisão de Caronas)
      const caronaSumm = getCaronasProvisionSummary(ano, mes, m);
      let fixosMes = 0;
      (m.fixos || []).forEach(f => {
        let val = parseFloat(f.valor) || 0;
        if (isCaronaItem(f) && !f.pago) {
          val = caronaSumm.remaining;
        }
        fixosMes += val;
        const key = f.nome.trim();
        if (!expenseAggregation[key]) {
          expenseAggregation[key] = {
            nome: key,
            categoria: f.categoria || 'Fixos',
            conta: f.conta || 'bb',
            total: 0,
            ocorrencias: 0
          };
        }
        expenseAggregation[key].total += val;
        expenseAggregation[key].ocorrencias++;
      });

      let outrosMes = 0;
      (m.outros || []).forEach(o => {
        const val = parseFloat(o.valor) || 0;
        outrosMes += val;
        const key = o.nome.trim();
        if (!expenseAggregation[key]) {
          expenseAggregation[key] = {
            nome: key,
            categoria: o.categoria || 'Variáveis',
            conta: o.conta || 'nubank_matheus',
            total: 0,
            ocorrencias: 0
          };
        }
        expenseAggregation[key].total += val;
        expenseAggregation[key].ocorrencias++;
      });

      let diariosMes = 0;
      (m.diarios || []).forEach(d => {
        const val = parseFloat(d.valor) || 0;
        const cta = (d.conta || '').toLowerCase();
        if (cta !== 'cartao_va' && cta !== 'va' && cta !== 'cartao_vr' && cta !== 'vr') {
          diariosMes += val;
        }
        const key = d.nome.trim();
        if (!expenseAggregation[key]) {
          expenseAggregation[key] = {
            nome: key,
            categoria: d.categoria || 'Diário',
            conta: d.conta || 'debito_nubank',
            total: 0,
            ocorrencias: 0
          };
        }
        expenseAggregation[key].total += val;
        expenseAggregation[key].ocorrencias++;
      });

      const faturaMes = getFaturaNubankMes(ano, mes);
      const gastosMes = fixosMes + outrosMes + diariosMes + faturaMes;
      const sobraMes = rendaCasalMes - gastosMes;
      const poupancaPct = rendaCasalMes > 0 ? ((sobraMes / rendaCasalMes) * 100).toFixed(1) : '0';

      totalAnoMatheus += ganhoMatheusMes;
      totalAnoScarlet += ganhoScarletMes;
      totalAnoGastosCasal += gastosMes;

      return {
        mes,
        ganhoMatheusMes,
        salMatheus,
        decimoTerceiro,
        extrasMatheus,
        ganhoScarletMes,
        fisioScarlet,
        outrasScarlet,
        rendaCasalMes,
        gastosMes,
        fixosMes,
        outrosMes,
        diariosMes,
        faturaMes,
        sobraMes,
        poupancaPct
      };
    });

    const totalAnoRendaCasal = totalAnoMatheus + totalAnoScarlet;
    const saldoAnualLivre = totalAnoRendaCasal - totalAnoGastosCasal;
    const taxaPoupancaAnual = totalAnoRendaCasal > 0 ? ((saldoAnualLivre / totalAnoRendaCasal) * 100).toFixed(1) : '0';

    const pctMatheus = totalAnoRendaCasal > 0 ? ((totalAnoMatheus / totalAnoRendaCasal) * 100).toFixed(1) : '0';
    const pctScarlet = totalAnoRendaCasal > 0 ? ((totalAnoScarlet / totalAnoRendaCasal) * 100).toFixed(1) : '0';

    const mediaMatheus = totalAnoMatheus / divisorMeses;
    const mediaScarlet = totalAnoScarlet / divisorMeses;
    const mediaRendaCasal = totalAnoRendaCasal / divisorMeses;
    const mediaGastosCasal = totalAnoGastosCasal / divisorMeses;
    const mediaSobraLivre = saldoAnualLivre / divisorMeses;

    const rankedExpenses = Object.values(expenseAggregation)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    container.innerHTML = `
      <!-- Alerta Informativo de Base de Cálculo Real (Meses Lançados) -->
      <div style="background:rgba(0,255,65,0.06);border:1px solid rgba(0,255,65,0.25);border-radius:var(--radius-sm);padding:9px 12px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <span style="font-size:11.5px;color:var(--text-main);line-height:1.5;">
          ℹ️ <strong>Cálculo Real por Competências Lançadas:</strong> No ano de ${ano}, foram considerados apenas os <strong>${divisorMeses} ${divisorMeses === 1 ? 'mês lançado' : 'meses lançados'}</strong> (${mesesComLancamento.join(', ')}). A média mensal não é diluída artificialmente por 12 meses.
        </span>
        <span style="font-size:11px;font-weight:700;color:var(--matrix-green);background:rgba(0,0,0,0.5);padding:3px 10px;border-radius:6px;border:1px solid rgba(0,255,65,0.3);font-family:var(--font-mono);">
          Base de Divisão: ÷ ${divisorMeses} ${divisorMeses === 1 ? 'mês' : 'meses'}
        </span>
      </div>

      <!-- 4 Cards Executivos do Casal -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(210px, 1fr));gap:10px;margin-bottom:16px;">
        <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:12px;border-radius:var(--radius-sm);">
          <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;">
            <span>👨‍💼 Ganhos Totais Matheus</span>
            <span style="color:var(--cyan);font-weight:700;">${pctMatheus}%</span>
          </div>
          <div style="font-size:18px;font-weight:bold;color:var(--cyan);margin-top:2px;font-family:var(--font-mono);">${formatBRL(totalAnoMatheus)}</div>
          <div style="font-size:10.5px;color:var(--text-muted);margin-top:3px;">
            Média real: <strong style="color:var(--cyan);">${formatBRL(mediaMatheus)}/mês</strong> (${divisorMeses}m)
          </div>
          <div style="font-size:9.5px;color:var(--text-dim);margin-top:2px;">Salário USP + 13º + Rendas Extras</div>
        </div>

        <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:12px;border-radius:var(--radius-sm);">
          <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;">
            <span>👩‍⚕️ Ganhos Totais Scarlet</span>
            <span style="color:#e879f9;font-weight:700;">${pctScarlet}%</span>
          </div>
          <div style="font-size:18px;font-weight:bold;color:#e879f9;margin-top:2px;font-family:var(--font-mono);">${formatBRL(totalAnoScarlet)}</div>
          <div style="font-size:10.5px;color:var(--text-muted);margin-top:3px;">
            Média real: <strong style="color:#e879f9;">${formatBRL(mediaScarlet)}/mês</strong> (${divisorMeses}m)
          </div>
          <div style="font-size:9.5px;color:var(--text-dim);margin-top:2px;">FisioFlow (M+1) + Outras Rendas</div>
        </div>

        <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:12px;border-radius:var(--radius-sm);">
          <div style="font-size:11px;color:var(--text-muted);">💸 Total Despesas do Casal (${ano})</div>
          <div style="font-size:18px;font-weight:bold;color:var(--rose);margin-top:2px;font-family:var(--font-mono);">${formatBRL(totalAnoGastosCasal)}</div>
          <div style="font-size:10.5px;color:var(--text-muted);margin-top:3px;">
            Média real: <strong style="color:var(--rose);">${formatBRL(mediaGastosCasal)}/mês</strong> (${divisorMeses}m)
          </div>
          <div style="font-size:9.5px;color:var(--text-dim);margin-top:2px;">Fixos, variáveis, diários e fatura</div>
        </div>

        <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:12px;border-radius:var(--radius-sm);">
          <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;">
            <span>💰 Sobra Líquida Acumulada</span>
            <span style="color:var(--amber);font-weight:700;">${taxaPoupancaAnual}% poupança</span>
          </div>
          <div style="font-size:18px;font-weight:bold;color:${saldoAnualLivre >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};margin-top:2px;font-family:var(--font-mono);">${formatBRL(saldoAnualLivre)}</div>
          <div style="font-size:10.5px;color:var(--text-muted);margin-top:3px;">
            Média real: <strong style="color:${mediaSobraLivre >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};">${formatBRL(mediaSobraLivre)}/mês</strong>
          </div>
          <div style="font-size:9.5px;color:var(--text-dim);margin-top:2px;">Resultado líquido do casal no período</div>
        </div>
      </div>

      <!-- Consolidado Anual Matheus & Scarlet (Mês a Mês) -->
      <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:14px;border-radius:var(--radius-sm);margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:6px;">
          <div>
            <strong style="color:var(--matrix-green);font-size:13.5px;display:flex;align-items:center;gap:6px;">
              <span>📊 Consolidado do Ano do Casal (Matheus & Scarlet) — ${ano}</span>
            </strong>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">
              Histórico mês a mês detalhado por fontes de receita, desembolsos do casal e taxa de poupança efetiva.
            </div>
          </div>
          <span style="font-size:11px;background:rgba(0,255,65,0.08);color:var(--matrix-green);padding:2px 8px;border-radius:10px;font-weight:bold;border:1px solid rgba(0,255,65,0.25);">
            ${labelPeriodo}
          </span>
        </div>

        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:110px;">Mês</th>
                <th style="text-align:right;">👨‍💼 Ganhos Matheus</th>
                <th style="text-align:right;">👩‍⚕️ Ganhos Scarlet</th>
                <th style="text-align:right;background:rgba(255,255,255,0.02);">👥 Renda Casal</th>
                <th style="text-align:right;">💸 Despesas Casal</th>
                <th style="text-align:right;">💰 Sobra do Mês</th>
                <th style="text-align:right;">📈 Poupança</th>
              </tr>
            </thead>
            <tbody>
              ${linhasConsolidado.map(l => `
                <tr>
                  <td><strong>📅 ${l.mes}</strong></td>
                  <td class="val-col" style="color:var(--cyan);font-weight:600;">
                    ${formatBRL(l.ganhoMatheusMes)}
                    ${l.decimoTerceiro > 0 ? `<span style="font-size:9px;color:var(--text-dim);display:block;">(incl. 13º ${formatBRL(l.decimoTerceiro)})</span>` : ''}
                    ${l.extrasMatheus > 0 ? `<span style="font-size:9px;color:var(--text-dim);display:block;">(extra ${formatBRL(l.extrasMatheus)})</span>` : ''}
                  </td>
                  <td class="val-col" style="color:#e879f9;font-weight:600;">
                    ${formatBRL(l.ganhoScarletMes)}
                    <span style="font-size:9px;color:var(--text-dim);display:block;">FisioFlow: ${formatBRL(l.fisioScarlet)}</span>
                  </td>
                  <td class="val-col" style="color:var(--matrix-green);font-weight:700;background:rgba(255,255,255,0.02);">${formatBRL(l.rendaCasalMes)}</td>
                  <td class="val-col" style="color:var(--rose);font-weight:600;">${formatBRL(l.gastosMes)}</td>
                  <td class="val-col" style="color:${l.sobraMes >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};font-weight:700;">${formatBRL(l.sobraMes)}</td>
                  <td class="val-col" style="color:var(--amber);font-weight:600;">${l.poupancaPct}%</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight:bold;background:rgba(255,255,255,0.05);border-top:2px solid var(--border-dim);">
                <td>TOTAL ACUMULADO (${divisorMeses}m)</td>
                <td class="val-col" style="color:var(--cyan);font-weight:800;">${formatBRL(totalAnoMatheus)}</td>
                <td class="val-col" style="color:#e879f9;font-weight:800;">${formatBRL(totalAnoScarlet)}</td>
                <td class="val-col" style="color:var(--matrix-green);font-weight:800;">${formatBRL(totalAnoRendaCasal)}</td>
                <td class="val-col" style="color:var(--rose);font-weight:800;">${formatBRL(totalAnoGastosCasal)}</td>
                <td class="val-col" style="color:${saldoAnualLivre >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};font-weight:800;">${formatBRL(saldoAnualLivre)}</td>
                <td class="val-col" style="color:var(--amber);font-weight:800;">${taxaPoupancaAnual}%</td>
              </tr>
              <tr style="font-weight:bold;background:rgba(0,255,65,0.04);border-top:1px dashed rgba(0,255,65,0.3);">
                <td style="color:var(--matrix-green);">MÉDIA MENSAL REAL (${divisorMeses}m)</td>
                <td class="val-col" style="color:var(--cyan);">${formatBRL(mediaMatheus)}/mês</td>
                <td class="val-col" style="color:#e879f9;">${formatBRL(mediaScarlet)}/mês</td>
                <td class="val-col" style="color:var(--matrix-green);">${formatBRL(mediaRendaCasal)}/mês</td>
                <td class="val-col" style="color:var(--rose);">${formatBRL(mediaGastosCasal)}/mês</td>
                <td class="val-col" style="color:${mediaSobraLivre >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};">${formatBRL(mediaSobraLivre)}/mês</td>
                <td class="val-col" style="color:var(--amber);">${taxaPoupancaAnual}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Ranking Top 10 Maiores Despesas do Ano -->
      <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:14px;border-radius:var(--radius-sm);margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:6px;">
          <div>
            <strong style="color:var(--matrix-green);font-size:13px;">🏆 Ranking Top 10 Maiores Despesas do Ano (${ano})</strong>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Média mensal calculada com base em ${divisorMeses} ${divisorMeses === 1 ? 'mês considerado' : 'meses considerados'}.</div>
          </div>
          <span style="font-size:11px;color:var(--text-muted);">${labelPeriodo}</span>
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:40px;">Rank</th>
                <th>Despesa</th>
                <th>Origem / Banco</th>
                <th>Média Mensal (${divisorMeses}m)</th>
                <th style="text-align:right;">Total no Ano</th>
                <th style="text-align:right;">% do Total</th>
              </tr>
            </thead>
            <tbody>
              ${rankedExpenses.map((exp, idx) => {
                const pct = totalAnoGastosCasal > 0 ? ((exp.total / totalAnoGastosCasal) * 100).toFixed(1) : 0;
                const media = exp.total / divisorMeses;
                const medal = idx === 0 ? '🥇 1º' : (idx === 1 ? '🥈 2º' : (idx === 2 ? '🥉 3º' : `${idx + 1}º`));
                return `
                  <tr>
                    <td><strong>${medal}</strong></td>
                    <td>
                      <strong>${exp.nome}</strong>
                      <span class="cat-pill" style="margin-left:4px;">${exp.categoria}</span>
                    </td>
                    <td>${renderOrigemBadge(exp.conta, '', exp.nome)}</td>
                    <td class="val-col" style="color:var(--text-muted);">${formatBRL(media)}</td>
                    <td class="val-col" style="color:var(--rose);font-weight:700;">${formatBRL(exp.total)}</td>
                    <td class="val-col" style="color:var(--amber);">${pct}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Diagnóstico Estratégico Realista: Alavancas de Economia Matheus & Scarlet -->
      <div style="background:linear-gradient(180deg, rgba(234,179,8,0.06), rgba(5,8,7,0.7));border:1px solid var(--amber);padding:14px;border-radius:var(--radius-sm);margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
          <strong style="color:var(--amber);font-size:13.5px;display:flex;align-items:center;gap:6px;">
            <span>💡 Diagnóstico Estratégico de Otimização & Alavancas Reais de Economia</span>
          </strong>
          <span style="font-size:11px;background:rgba(234,179,8,0.2);color:var(--amber);padding:2px 8px;border-radius:10px;font-weight:bold;">
            Potencial de Liberação de Fluxo: ~R$ 7.200 a R$ 15.000+/ano
          </span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:12px;">
          <!-- Card 1: Logística de Caronas USP -->
          <div style="background:rgba(0,0,0,0.5);border-left:3px solid #f59e0b;padding:10px 12px;border-radius:var(--radius-xs);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <strong style="color:var(--text-main);font-size:12.5px;">🚗 Logística de Caronas USP (São Carlos)</strong>
              <span style="color:var(--matrix-green);font-size:11px;font-weight:bold;">Economia: ~R$ 420 a R$ 1.200/ano</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);line-height:1.6;">
              • <strong>Situação Real:</strong> Custo presencial de R$ 60,00/dia entre Ribeirão Preto e São Carlos (total de R$ 1.140,00 em 19 dias úteis em Novembro). É o 2º maior gasto fixo do Matheus.<br>
              • <strong>Oportunidade:</strong> Cada dia presencial evitado (folga abonada, compensação, banco de horas ou recessos) poupa R$ 60,00 líquidos. Em meses com férias/recesso (ex: Dezembro a R$ 720,00), a folga gerada é de R$ 420 a R$ 600.<br>
              • <strong>Ação Prática:</strong> Manter o Calendário USP atualizado no Matrix para antecipar os recessos e canalizar a sobra líquida de transporte para os aportes no Tesouro Renda+ 2055.
            </div>
          </div>

          <!-- Card 2: Quitação de Empréstimos Familiares -->
          <div style="background:rgba(0,0,0,0.5);border-left:3px solid #10b981;padding:10px 12px;border-radius:var(--radius-xs);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <strong style="color:var(--text-main);font-size:12.5px;">🤝 Quitação de Empréstimos Familiares</strong>
              <span style="color:var(--matrix-green);font-size:11px;font-weight:bold;">Liberação: R$ 900,00/mês (R$ 10.800/ano)</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);line-height:1.6;">
              • <strong>Situação Real:</strong> O fluxo mensal do casal desembolsa R$ 900,00/mês em parcelas familiares e pessoais (Edna R$ 500, Alberto R$ 250, Cesar R$ 150).<br>
              • <strong>Oportunidade:</strong> À medida que esses compromissos forem sendo quitados, liberam-se até R$ 900,00 líquidos mensais livres na conta corrente.<br>
              • <strong>Ação Prática:</strong> Tratar a conclusão dessas parcelas como aporte automático na Reserva Imediata (100% CDI) e Renda+ 2055, acelerando a blindagem patrimonial.
            </div>
          </div>

          <!-- Card 3: Financiamento Caixa & Fatura Scarlet / FisioFlow -->
          <div style="background:rgba(0,0,0,0.5);border-left:3px solid #8b5cf6;padding:10px 12px;border-radius:var(--radius-xs);grid-column:1/-1;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <strong style="color:var(--text-main);font-size:12.5px;">🏛️ Financiamento Caixa & Consolidação FisioFlow</strong>
              <span style="color:var(--matrix-green);font-size:11px;font-weight:bold;">Economia em Juros: Dezenas de milhares de R$</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);line-height:1.6;">
              • <strong>Amortização Exclusiva de Prazo (Financiamento Caixa):</strong> Saldo devedor de R$ 157.884,49 em 271 prestações (Price, 8,99% a.a., parcela de R$ 1.395,88). Cada aporte extraordinário com foco exclusivo em prazo extingue parcelas do final da dívida com abatimento exponencial de juros futuros. O FGTS mensal USP (R$ 501,12) acumula ~R$ 12.000 a cada 24 meses para abatimento obrigatório por prazo.<br>
              • <strong>Auto-suficiência da Fatura Scarlet (Nubank Black):</strong> Com a capacidade contratada de R$ 4.400/mês (7 pacientes ativos no FisioFlow), a consolidação dos atendimentos particulares dispensa repasses externos do Matheus, gerando excedente para a Previdência da Scarlet (Renda+ 2055).<br>
              • <strong>Blindagem com Benefícios (VA R$ 2.050 + VR R$ 1.105):</strong> Direcionar 100% dos gastos de supermercado e almoço para os cartões de benefício (Casa Maracaju 88), mantendo custo zero de alimentação em conta corrente.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function exportarRelatorioDezembro(anoParam = null) {
    const ano = anoParam || currentYear;
    const state = MatrixDB.getState();
    const yearData = (state.anos && state.anos[ano]) || {};

    // 1. Identificar estritamente os meses lançados no ano vigente
    const mesesComLancamento = [];
    MONTH_NAMES.forEach(mes => {
      const m = yearData[mes];
      if (!m) return;
      const recs = m.receitas || [];
      const fix = m.fixos || [];
      const out = m.outros || [];
      const dia = m.diarios || [];
      const temRec = recs.some(r => (parseFloat(r.valor) || 0) > 0);
      const temFix = fix.some(f => (parseFloat(f.valor) || 0) > 0);
      const temOut = out.some(o => (parseFloat(o.valor) || 0) > 0);
      const temDia = dia.some(d => (parseFloat(d.valor) || 0) > 0);
      const temFat = m.fatura && (parseFloat(m.fatura.valor) || 0) > 0;
      const salMatheus = getSalarioLiquidoMes(ano, mes);
      const salScarlet = getGanhosScarletMes(ano, mes);
      if (temRec || temFix || temOut || temDia || temFat || salMatheus > 0 || salScarlet > 0) {
        mesesComLancamento.push(mes);
      }
    });

    const divisorMeses = Math.max(1, mesesComLancamento.length);
    const labelPeriodo = (mesesComLancamento.length === 12)
      ? `Acumulado de Janeiro a Dezembro (12 meses)`
      : (mesesComLancamento.length > 0
          ? `Acumulado de ${mesesComLancamento[0]} a ${mesesComLancamento[mesesComLancamento.length - 1]} (${divisorMeses} ${divisorMeses === 1 ? 'mês considerado' : 'meses considerados'})`
          : `Ano ${ano}`);

    let totalAnoMatheus = 0;
    let totalAnoScarlet = 0;
    let totalAnoGastosCasal = 0;
    const expenseAggregation = {};

    const linhasConsolidado = mesesComLancamento.map(mes => {
      const m = yearData[mes] || {};
      const salMatheus = getSalarioLiquidoMes(ano, mes);
      let decimoTerceiro = 0;
      let extrasMatheus = 0;
      (m.receitas || []).forEach(r => {
        if (isReceita13Salario(r)) decimoTerceiro += (parseFloat(r.valor) || 0);
        else if (isReceitaExtraMatheus(r)) extrasMatheus += (parseFloat(r.valor) || 0);
      });
      const ganhoMatheusMes = salMatheus + decimoTerceiro + extrasMatheus;

      const fisioScarlet = getGanhosScarletMes(ano, mes);
      const outrasScarlet = getOutrasRendasScarletMes(ano, mes);
      const ganhoScarletMes = fisioScarlet + outrasScarlet;

      const rendaCasalMes = ganhoMatheusMes + ganhoScarletMes;

      const caronaSumm = getCaronasProvisionSummary(ano, mes, m);
      let fixosMes = 0;
      (m.fixos || []).forEach(f => {
        let val = parseFloat(f.valor) || 0;
        if (isCaronaItem(f) && !f.pago) {
          val = caronaSumm.remaining;
        }
        fixosMes += val;
        const k = f.nome.trim();
        expenseAggregation[k] = (expenseAggregation[k] || 0) + val;
      });

      let outrosMes = 0;
      (m.outros || []).forEach(o => {
        const val = parseFloat(o.valor) || 0;
        outrosMes += val;
        const k = o.nome.trim();
        expenseAggregation[k] = (expenseAggregation[k] || 0) + val;
      });

      let diariosMes = 0;
      (m.diarios || []).forEach(d => {
        const val = parseFloat(d.valor) || 0;
        const cta = (d.conta || '').toLowerCase();
        if (cta !== 'cartao_va' && cta !== 'va' && cta !== 'cartao_vr' && cta !== 'vr') {
          diariosMes += val;
        }
        const k = d.nome.trim();
        expenseAggregation[k] = (expenseAggregation[k] || 0) + val;
      });

      const faturaMes = getFaturaNubankMes(ano, mes);
      const gastosMes = fixosMes + outrosMes + diariosMes + faturaMes;
      const sobraMes = rendaCasalMes - gastosMes;
      const poupancaPct = rendaCasalMes > 0 ? ((sobraMes / rendaCasalMes) * 100).toFixed(1) : '0';

      totalAnoMatheus += ganhoMatheusMes;
      totalAnoScarlet += ganhoScarletMes;
      totalAnoGastosCasal += gastosMes;

      return {
        mes,
        ganhoMatheusMes,
        ganhoScarletMes,
        rendaCasalMes,
        gastosMes,
        sobraMes,
        poupancaPct
      };
    });

    const totalAnoRendaCasal = totalAnoMatheus + totalAnoScarlet;
    const saldoAnualLivre = totalAnoRendaCasal - totalAnoGastosCasal;
    const taxaPoupancaAnual = totalAnoRendaCasal > 0 ? ((saldoAnualLivre / totalAnoRendaCasal) * 100).toFixed(1) : '0';

    const ranked = Object.entries(expenseAggregation)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Por favor, autorize pop-ups no seu navegador para gerar e imprimir o relatório em PDF.');
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Financeiro Executivo & Consolidado ${ano} - Matrix</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 35px; color: #111; line-height: 1.5; font-size: 13px; }
          .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          h1 { margin: 0; font-size: 20px; }
          .alert-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 14px; border-radius: 4px; margin-bottom: 20px; font-size: 12px; color: #166534; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .kpi-box { border: 1px solid #ddd; padding: 10px; border-radius: 4px; background: #fafafa; }
          .kpi-title { font-size: 10px; text-transform: uppercase; color: #666; font-weight: bold; }
          .kpi-val { font-size: 16px; font-weight: bold; margin-top: 4px; }
          .kpi-sub { font-size: 10px; color: #777; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th, td { border-bottom: 1px solid #e5e5e5; padding: 8px 6px; text-align: left; }
          th { background: #f4f4f4; font-size: 11px; }
          .val { text-align: right; font-family: monospace; font-size: 13px; }
          .tip-box { border-left: 4px solid #16a34a; background: #f9fbf9; padding: 10px 12px; margin-bottom: 10px; border-radius: 3px; font-size: 12px; }
          .btn-print { background: #16a34a; color: #fff; padding: 10px 18px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; }
          @media print { .no-print { display: none; } body { margin: 15mm; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; display:flex; justify-content:flex-end;">
          <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
        </div>

        <div class="header">
          <div>
            <h1>📊 Relatório Financeiro Executivo & Consolidado ${ano}</h1>
            <div style="font-size:12px;color:#555;margin-top:4px;">Matheus & Scarlet • Gestão Integrada de Patrimônio</div>
          </div>
          <div style="text-align:right;font-size:11px;color:#666;">
            Competência: ${labelPeriodo}<br>
            Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}
          </div>
        </div>

        <div class="alert-box">
          ℹ️ <strong>Base de Cálculo Real:</strong> Foram considerados estritamente os <strong>${divisorMeses} ${divisorMeses === 1 ? 'mês lançado' : 'meses lançados'}</strong> (${mesesComLancamento.join(', ')}). As médias mensais foram calculadas dividindo exatamente por <strong>${divisorMeses}</strong>, sem distorção artificial por 12 meses.
        </div>

        <div class="kpi-grid">
          <div class="kpi-box">
            <div class="kpi-title">Ganhos Matheus</div>
            <div class="kpi-val" style="color:#0284c7;">${formatBRL(totalAnoMatheus)}</div>
            <div class="kpi-sub">Média real: ${formatBRL(totalAnoMatheus / divisorMeses)}/mês</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Ganhos Scarlet</div>
            <div class="kpi-val" style="color:#c026d3;">${formatBRL(totalAnoScarlet)}</div>
            <div class="kpi-sub">Média real: ${formatBRL(totalAnoScarlet / divisorMeses)}/mês</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Total Despesas Casal</div>
            <div class="kpi-val" style="color:#dc2626;">${formatBRL(totalAnoGastosCasal)}</div>
            <div class="kpi-sub">Média real: ${formatBRL(totalAnoGastosCasal / divisorMeses)}/mês</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Sobra Líquida Acumulada</div>
            <div class="kpi-val" style="color:#16a34a;">${formatBRL(saldoAnualLivre)}</div>
            <div class="kpi-sub">Taxa poupança: ${taxaPoupancaAnual}%</div>
          </div>
        </div>

        <h3>📊 Consolidado Mês a Mês do Casal (${ano})</h3>
        <table>
          <thead>
            <tr>
              <th>Mês</th>
              <th style="text-align:right;">Ganhos Matheus</th>
              <th style="text-align:right;">Ganhos Scarlet</th>
              <th style="text-align:right;">Renda do Casal</th>
              <th style="text-align:right;">Despesas Casal</th>
              <th style="text-align:right;">Sobra Líquida</th>
              <th style="text-align:right;">Poupança</th>
            </tr>
          </thead>
          <tbody>
            ${linhasConsolidado.map(l => `
              <tr>
                <td><strong>${l.mes}</strong></td>
                <td class="val">${formatBRL(l.ganhoMatheusMes)}</td>
                <td class="val">${formatBRL(l.ganhoScarletMes)}</td>
                <td class="val" style="font-weight:bold;">${formatBRL(l.rendaCasalMes)}</td>
                <td class="val" style="color:#dc2626;">${formatBRL(l.gastosMes)}</td>
                <td class="val" style="font-weight:bold;color:${l.sobraMes >= 0 ? '#16a34a' : '#dc2626'};">${formatBRL(l.sobraMes)}</td>
                <td class="val">${l.poupancaPct}%</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#f9f9f9;font-weight:bold;border-top:2px solid #ccc;">
              <td>TOTAL ACUMULADO (${divisorMeses}m)</td>
              <td class="val">${formatBRL(totalAnoMatheus)}</td>
              <td class="val">${formatBRL(totalAnoScarlet)}</td>
              <td class="val">${formatBRL(totalAnoRendaCasal)}</td>
              <td class="val" style="color:#dc2626;">${formatBRL(totalAnoGastosCasal)}</td>
              <td class="val" style="color:${saldoAnualLivre >= 0 ? '#16a34a' : '#dc2626'};">${formatBRL(saldoAnualLivre)}</td>
              <td class="val">${taxaPoupancaAnual}%</td>
            </tr>
            <tr style="background:#f0fdf4;font-weight:bold;border-top:1px dashed #16a34a;">
              <td style="color:#166534;">MÉDIA MENSAL REAL (${divisorMeses}m)</td>
              <td class="val">${formatBRL(totalAnoMatheus / divisorMeses)}/mês</td>
              <td class="val">${formatBRL(totalAnoScarlet / divisorMeses)}/mês</td>
              <td class="val">${formatBRL(totalAnoRendaCasal / divisorMeses)}/mês</td>
              <td class="val" style="color:#dc2626;">${formatBRL(totalAnoGastosCasal / divisorMeses)}/mês</td>
              <td class="val" style="color:${saldoAnualLivre >= 0 ? '#16a34a' : '#dc2626'};">${formatBRL(saldoAnualLivre / divisorMeses)}/mês</td>
              <td class="val">${taxaPoupancaAnual}%</td>
            </tr>
          </tfoot>
        </table>

        <h3>🏆 Ranking Top 10 Maiores Despesas do Ano</h3>
        <table>
          <thead>
            <tr>
              <th style="width:40px;">Rank</th>
              <th>Despesa</th>
              <th style="text-align:right;">Média Mensal (${divisorMeses}m)</th>
              <th style="text-align:right;">Total no Ano</th>
              <th style="text-align:right;">% do Total</th>
            </tr>
          </thead>
          <tbody>
            ${ranked.map(([nome, val], i) => `
              <tr>
                <td>${i + 1}º</td>
                <td><strong>${nome}</strong></td>
                <td class="val">${formatBRL(val / divisorMeses)}</td>
                <td class="val" style="font-weight:bold;">${formatBRL(val)}</td>
                <td class="val">${((val / (totalAnoGastosCasal || 1)) * 100).toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h3>💡 Diagnóstico Estratégico de Otimização & Alavancas Reais de Economia</h3>
        <div class="tip-box">
          <strong>1. Logística de Caronas USP (Economia: ~R$ 420 a R$ 1.200/ano)</strong><br>
          Custo de R$ 60,00/dia presencial (R$ 1.140 em 19 dias). Otimizar recessos, compensações e dias remotos no calendário USP poupa R$ 60 líquidos por dia.
        </div>
        <div class="tip-box">
          <strong>2. Quitação de Empréstimos Familiares (Liberação: R$ 900,00/mês • R$ 10.800/ano)</strong><br>
          O término dos empréstimos (Edna R$ 500, Alberto R$ 250, Cesar R$ 150) liberará R$ 900/mês de fluxo livre para canalizar à Reserva Imediata e Renda+ 2055.
        </div>
        <div class="tip-box">
          <strong>3. Amortização Exclusiva de Prazo (Caixa) & FisioFlow</strong><br>
          Foco estrito em redução de prazo no financiamento da Caixa (eliminando juros futuros com FGTS USP bienal) e expansão da capacidade do FisioFlow (R$ 4.400/mês) para auto-suficiência da fatura Scarlet.
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  // ==========================================
  // 3. SIMULADOR "E SE?" (PROJEÇÕES FUTURAS)
  // ==========================================
  let currentSimVisao = 'consolidado'; // 'consolidado' | 'matheus' | 'scarlet' | 'va' | 'vr'

  function setSimuladorVisao(visao) {
    currentSimVisao = visao || 'consolidado';
    renderSimulator();
  }

  function renderSimulator() {
    const state = MatrixDB.getState();
    const result = ScenarioSimulator.runSimulation(state, null, 14);

    const contaLabels = {
      bb: 'Banco do Brasil (Salário USP • Matheus)',
      nubank_scarlet: 'Nubank Scarlet (Mastercard Black)',
      nubank_matheus: 'Nubank Matheus',
      inter: 'Banco Inter (Giro/Pix • Matheus)',
      santander: 'Santander (DinDin • Matheus)',
      va: 'Cartão VA (Alimentação USP)',
      vr: 'Cartão VR (Refeição USP)',
      reserva: 'Reserva de Emergência / Invest.',
      dinheiro: 'Dinheiro Vivo'
    };
    const rendaLabels = {
      salario_usp: 'Salário Líquido USP (Matheus)',
      ganhos_scarlet: 'Ganhos da Scarlet (FisioFlow)',
      va_mercado: 'Vale Alimentação (VA Maracaju 88)',
      vr_almoco: 'Vale Refeição (VR Presencial)',
      reserva_aportes: 'Reserva de Emergência / Investimentos'
    };
    const tipoLabels = {
      recorrente: '🔄 Recorrente Mensal',
      pontual: '🎯 Pontual (Mês Único)',
      parcelado: '📦 Parcelado'
    };

    // 1. Atualizar Abas de Visão do Simulador (Segmented Vision Tabs)
    const visionBtns = document.querySelectorAll('.sim-vision-btn');
    visionBtns.forEach(btn => {
      if (btn.getAttribute('data-vision') === currentSimVisao) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 2. Render Painel de Correlação por Renda (Interativo: clique filtra a visão)
    const correlacaoGridEl = document.getElementById('simCorrelacaoRendaGrid');
    if (correlacaoGridEl && result.correlacaoRendas) {
      correlacaoGridEl.innerHTML = Object.values(result.correlacaoRendas).map(r => {
        const hasImpact = r.totalMensal > 0;
        const isCurrentActive = (currentSimVisao === r.pilar);
        return `
          <div onclick="MatrixApp.setSimuladorVisao('${r.pilar || 'consolidado'}')" title="Toque para filtrar a simulação nesta fonte" style="cursor:pointer;background:rgba(5,8,7,0.5);border:1px solid ${isCurrentActive ? 'var(--matrix-green)' : (hasImpact ? 'var(--cyan)' : 'var(--border-dim)')};border-radius:var(--radius-xs);padding:8px 10px;font-family:var(--font-mono);transition:all 0.15s ease;">
            <div style="font-size:10.5px;color:${isCurrentActive ? 'var(--matrix-green)' : 'var(--text-muted)'};font-weight:${isCurrentActive ? '700' : 'normal'};display:flex;justify-content:space-between;align-items:center;">
              <span>${r.nome}</span>
              ${isCurrentActive ? '<span style="font-size:9px;color:var(--matrix-green);">[ATIVO]</span>' : ''}
            </div>
            <div style="font-size:13.5px;font-weight:700;color:${hasImpact ? 'var(--cyan)' : 'var(--text-dim)'};margin-top:2px;">
              ${hasImpact ? formatBRL(r.totalMensal) + ' /mês' : 'R$ 0,00'}
            </div>
            <div style="font-size:9.5px;color:${hasImpact ? 'var(--matrix-green)' : 'var(--text-dim)'};margin-top:2px;">
              ${r.count > 0 ? `${r.count} cenário(s) correlacionado(s)` : 'Sem impacto direto'}
            </div>
          </div>
        `;
      }).join('');
    }

    // 3. Render lista de hipóteses/cenários com tags de identificação de conta
    const scenContainer = document.getElementById('activeScenariosList');
    if (scenContainer) {
      if (!state.simulacoesAtivas || state.simulacoesAtivas.length === 0) {
        scenContainer.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:14px;font-family:var(--font-mono);font-size:12px;">Nenhum cenário hipotético cadastrado. Clique em "+ Adicionar Hipótese".</div>`;
      } else {
        scenContainer.innerHTML = state.simulacoesAtivas.map(scen => {
          const tipoKey = scen.tipo || (scen.recorrente === false ? 'pontual' : 'recorrente');
          const tipoDesc = tipoKey === 'parcelado' ? `📦 Parcelado (${scen.parcelas || 2}x)` : (tipoLabels[tipoKey] || '🔄 Recorrente Mensal');
          const contaDesc = contaLabels[scen.conta] || scen.conta || 'Nubank Scarlet (Mastercard Black)';
          const scenRendaKey = (scen.renda === 'orcamento_geral' || scen.renda === 'estudio_extra') ? (pilar === 'scarlet' ? 'ganhos_scarlet' : 'salario_usp') : (scen.renda || 'salario_usp');
          const rendaDesc = rendaLabels[scenRendaKey] || (pilar === 'scarlet' ? 'Ganhos da Scarlet (FisioFlow)' : 'Salário Líquido USP (Matheus)');

          const pilar = ScenarioSimulator.getScenarioPilar(scen);
          let pilarBadge = `<span class="status-badge" style="font-size:10px;background:rgba(56,189,248,0.12);color:var(--cyan);border-color:var(--cyan);">👨 Conta Matheus</span>`;
          if (pilar === 'scarlet') {
            pilarBadge = `<span class="status-badge" style="font-size:10px;background:rgba(236,72,153,0.12);color:#f472b6;border-color:#f472b6;">👩 Conta Scarlet</span>`;
          } else if (pilar === 'va') {
            pilarBadge = `<span class="status-badge" style="font-size:10px;background:rgba(245,158,11,0.12);color:var(--amber);border-color:var(--amber);">🛒 Vale Alimentação</span>`;
          } else if (pilar === 'vr') {
            pilarBadge = `<span class="status-badge" style="font-size:10px;background:rgba(168,85,247,0.12);color:#c084fc;border-color:#a855f7;">🍽️ Vale Refeição</span>`;
          }

          return `
            <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:12px 14px;border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:10px;">
              <div style="flex:1;min-width:260px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                  <span style="font-weight:700;color:var(--matrix-green);font-size:13px;">${scen.titulo}</span>
                  ${pilarBadge}
                  <span class="status-badge" style="font-size:10px;background:rgba(0,255,102,0.08);color:var(--matrix-green);border-color:var(--matrix-green-dim);">${tipoDesc}</span>
                </div>
                <div style="font-size:12px;color:var(--text-main);font-family:var(--font-mono);margin-bottom:4px;">
                  <strong>Valor Estimado:</strong> <span style="color:var(--cyan);font-weight:700;">${formatBRL(scen.valorAdotado || scen.valor)}</span>
                  <span style="color:var(--text-muted);"> | Início: ${formatMesAnoBR(scen.inicio || '2026-12')}${scen.fim ? ' até ' + formatMesAnoBR(scen.fim) : ''}</span>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:11px;color:var(--text-muted);font-family:var(--font-mono);">
                  <span>🏦 <strong>Conta:</strong> <span style="color:var(--text-main);">${contaDesc}</span></span>
                  <span>🔗 <strong>Correlação de Renda:</strong> <span style="color:var(--amber);font-weight:600;">${rendaDesc}</span></span>
                </div>
                ${scen.observacao ? `<div style="font-size:11px;color:var(--text-dim);margin-top:4px;font-style:italic;">💬 ${scen.observacao}</div>` : ''}
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <label style="display:flex;align-items:center;gap:5px;font-size:11.5px;cursor:pointer;font-family:var(--font-mono);margin-right:4px;">
                  <input type="checkbox" ${scen.ativo !== false ? 'checked' : ''} onchange="MatrixApp.toggleScenarioActive('${scen.id}', this.checked)">
                  Ativo
                </label>
                <button class="btn-icon" title="Editar este cenário" onclick="MatrixApp.openScenarioModal('${scen.id}')">✏️</button>
                <button class="btn-icon" title="Excluir este cenário" onclick="MatrixApp.removeScenario('${scen.id}')">🗑️</button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 4. Configurar Títulos e Cabeçalhos Dinâmicos da Tabela de acordo com a Visão Ativa
    const thGanhos = document.getElementById('simThGanhos');
    const thGastos = document.getElementById('simThGastos');
    const thSimulado = document.getElementById('simThSimulado');
    const thSaldo = document.getElementById('simThSaldo');

    let labelRenda = 'Renda';
    let labelGastos = 'Gastos';
    let labelSimulado = 'Simulado';
    let labelSaldo = 'Saldo';

    if (currentSimVisao === 'matheus') {
      if (thGanhos) thGanhos.textContent = 'Salário USP + Extras';
      if (thGastos) thGastos.textContent = 'Gastos Próprios + Transf.';
      if (thSimulado) thSimulado.textContent = 'Cenários Matheus';
      if (thSaldo) thSaldo.textContent = 'Sobra pra Mim';
      labelRenda = 'USP / Extras:';
      labelGastos = 'Gastos Próprios:';
      labelSimulado = 'Cenários:';
      labelSaldo = 'Sobra pra Mim:';
    } else if (currentSimVisao === 'scarlet') {
      if (thGanhos) thGanhos.textContent = 'Recursos Scarlet (Fisio+Extras+Transf)';
      if (thGastos) thGastos.textContent = 'Fatura Nubank Scarlet';
      if (thSimulado) thSimulado.textContent = 'Cenários Scarlet';
      if (thSaldo) thSaldo.textContent = 'Sobra Scarlet';
      labelRenda = 'Recursos Scarlet:';
      labelGastos = 'Fatura Nubank:';
      labelSimulado = 'Cenários Scarlet:';
      labelSaldo = 'Sobra Scarlet:';
    } else if (currentSimVisao === 'va') {
      if (thGanhos) thGanhos.textContent = 'Crédito VA USP';
      if (thGastos) thGastos.textContent = 'Supermercado Base';
      if (thSimulado) thSimulado.textContent = 'Cenários em VA';
      if (thSaldo) thSaldo.textContent = 'Saldo VA Restante';
      labelRenda = 'Crédito USP:';
      labelGastos = 'Mercado Base:';
      labelSimulado = 'Cenários VA:';
      labelSaldo = 'Saldo VA:';
    } else if (currentSimVisao === 'vr') {
      if (thGanhos) thGanhos.textContent = 'Crédito VR USP';
      if (thGastos) thGastos.textContent = 'Refeições Base';
      if (thSimulado) thSimulado.textContent = 'Cenários em VR';
      if (thSaldo) thSaldo.textContent = 'Saldo VR Restante';
      labelRenda = 'Crédito USP:';
      labelGastos = 'Refeições Base:';
      labelSimulado = 'Cenários VR:';
      labelSaldo = 'Saldo VR:';
    } else {
      // Consolidado Casal
      if (thGanhos) thGanhos.textContent = 'Ganhos Casal';
      if (thGastos) thGastos.textContent = 'Gastos Casal';
      if (thSimulado) thSimulado.textContent = 'Custo Simulado';
      if (thSaldo) thSaldo.textContent = 'Saldo Conjunto';
      labelRenda = 'Renda Casal:';
      labelGastos = 'Gastos Casal:';
      labelSimulado = 'Simulado Casal:';
      labelSaldo = 'Saldo Conjunto:';
    }

    // 5. Render Tabela Mês a Mês da Simulação
    const simTbody = document.getElementById('simulationTableBody');
    if (simTbody) {
      simTbody.innerHTML = result.timeline.map(row => {
        let viewGanhos = row.ganhosBase;
        let viewGastos = row.totalGastosBase;
        let viewSimulado = row.custoCenarios;
        let viewSaldo = row.saldoSimulado;
        let viewStatus = row.statusAlerta;

        if (currentSimVisao === 'matheus') {
          viewGanhos = row.contas.matheus.ganhos;
          viewGastos = row.contas.matheus.gastos;
          viewSimulado = row.contas.matheus.custoCenarios;
          viewSaldo = row.contas.matheus.saldoSimulado;
          viewStatus = row.contas.matheus.statusAlerta;
        } else if (currentSimVisao === 'scarlet') {
          viewGanhos = row.contas.scarlet.ganhos;
          viewGastos = row.contas.scarlet.gastos;
          viewSimulado = row.contas.scarlet.custoCenarios;
          viewSaldo = row.contas.scarlet.saldoSimulado;
          viewStatus = row.contas.scarlet.statusAlerta;
        } else if (currentSimVisao === 'va') {
          viewGanhos = row.contas.va.ganhos;
          viewGastos = row.contas.va.gastos;
          viewSimulado = row.contas.va.custoCenarios;
          viewSaldo = row.contas.va.saldoSimulado;
          viewStatus = row.contas.va.statusAlerta;
        } else if (currentSimVisao === 'vr') {
          viewGanhos = row.contas.vr.ganhos;
          viewGastos = row.contas.vr.gastos;
          viewSimulado = row.contas.vr.custoCenarios;
          viewSaldo = row.contas.vr.saldoSimulado;
          viewStatus = row.contas.vr.statusAlerta;
        }

        let statusBadge = '<span class="status-badge pago">Folga OK</span>';
        let rowClass = 'class="clickable-row sim-row sim-row-ok"';
        if (viewStatus === 'deficit') {
          statusBadge = '<span class="status-badge danger">Déficit</span>';
          rowClass = 'class="clickable-row sim-row sim-row-deficit"';
        } else if (viewStatus === 'atencao') {
          statusBadge = '<span class="status-badge pendente">Atenção</span>';
          rowClass = 'class="clickable-row sim-row sim-row-atencao"';
        }

        const fullLabel = `${row.monthName} ${row.year}`;

        // Detalhamento individual das contas para a visão consolidada
        const breakdownHtml = (currentSimVisao === 'consolidado') ? `
          <div class="sim-accounts-breakdown">
            <span class="sim-acc-badge matheus" title="Sobra pra Mim (Matheus)">👨 ${formatBRL(row.contas.matheus.saldoSimulado)}</span>
            <span class="sim-acc-badge scarlet" title="Sobra da Scarlet">👩 ${formatBRL(row.contas.scarlet.saldoSimulado)}</span>
            <span class="sim-acc-badge va" title="Saldo VA Alimentação">🛒 ${formatBRL(row.contas.va.saldoSimulado)}</span>
            <span class="sim-acc-badge vr" title="Saldo VR Refeição">🍽️ ${formatBRL(row.contas.vr.saldoSimulado)}</span>
          </div>
        ` : '';

        return `
          <tr ${rowClass} onclick="MatrixApp.abrirRaioXSimulador('${row.year}', '${row.monthName}')" title="Toque para ver o Raio-X & Diagnóstico segregado de ${fullLabel}">
            <td class="sim-cell-header">
              <div class="sim-header-wrap">
                <span class="sim-icon">🔍</span>
                <div>
                  <strong class="sim-month-text">${fullLabel}</strong>
                  ${breakdownHtml}
                </div>
              </div>
              <div class="sim-mobile-actions">
                ${statusBadge}
                <button type="button" class="btn-matrix sim-edit-btn" onclick="event.stopPropagation(); MatrixApp.navegarParaMes('${row.year}', '${row.monthName}')" title="Ir para o Fluxo de Caixa e editar lançamentos">
                  Editar ➔
                </button>
              </div>
            </td>
            <td class="val-col sim-cell-val" data-label="${labelRenda}">
              <span class="sim-label-mobile">${labelRenda}</span>
              <span class="sim-num-val">${formatBRL(viewGanhos)}</span>
            </td>
            <td class="val-col sim-cell-val" data-label="${labelGastos}">
              <span class="sim-label-mobile">${labelGastos}</span>
              <span class="sim-num-val">${formatBRL(viewGastos)}</span>
            </td>
            <td class="val-col sim-cell-val" data-label="${labelSimulado}" style="color:var(--cyan);">
              <span class="sim-label-mobile">${labelSimulado}</span>
              <span class="sim-num-val">${viewSimulado > 0 ? '+ ' + formatBRL(viewSimulado) : '—'}</span>
            </td>
            <td class="val-col sim-cell-val sim-saldo-val" data-label="${labelSaldo}" style="font-weight:700;color:${viewSaldo >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};">
              <span class="sim-label-mobile">${labelSaldo}</span>
              <span class="sim-num-val">${formatBRL(viewSaldo)}</span>
            </td>
            <td class="sim-desktop-actions-col" style="text-align:center;white-space:nowrap;">
              ${statusBadge}
              <button type="button" class="btn-matrix" style="padding:2px 7px;font-size:10px;margin-left:6px;" onclick="event.stopPropagation(); MatrixApp.navegarParaMes('${row.year}', '${row.monthName}')" title="Ir para o Fluxo de Caixa e editar lançamentos">
                Editar ➔
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // 6. Atualizar Indicadores de Impacto (KPIs) de acordo com a conta ativa
    const pilarData = (result.porConta && result.porConta[currentSimVisao]) || result.porConta.consolidado;

    const titleImpactoEl = document.getElementById('simKpiImpactoTitle');
    const simImpactoEl = document.getElementById('simTotalImpacto');
    if (titleImpactoEl && simImpactoEl) {
      if (currentSimVisao === 'matheus') titleImpactoEl.textContent = 'CUSTO CENÁRIOS MATHEUS NO HORIZONTE:';
      else if (currentSimVisao === 'scarlet') titleImpactoEl.textContent = 'CUSTO CENÁRIOS SCARLET NO HORIZONTE:';
      else if (currentSimVisao === 'va') titleImpactoEl.textContent = 'CUSTO EXTRA EM VA NO HORIZONTE:';
      else if (currentSimVisao === 'vr') titleImpactoEl.textContent = 'CUSTO EXTRA EM VR NO HORIZONTE:';
      else titleImpactoEl.textContent = 'CUSTO TOTAL NO HORIZONTE (CASAL):';

      simImpactoEl.textContent = formatBRL(pilarData.impactoTotalCenarios);
    }

    const titleDeficitEl = document.getElementById('simKpiDeficitTitle');
    const simDeficitEl = document.getElementById('simMesesDeficit');
    if (titleDeficitEl && simDeficitEl) {
      if (currentSimVisao === 'matheus') titleDeficitEl.textContent = 'MESES COM DÉFICIT (MATHEUS):';
      else if (currentSimVisao === 'scarlet') titleDeficitEl.textContent = 'MESES COM DÉFICIT (SCARLET):';
      else if (currentSimVisao === 'va') titleDeficitEl.textContent = 'MESES COM DÉFICIT (VA):';
      else if (currentSimVisao === 'vr') titleDeficitEl.textContent = 'MESES COM DÉFICIT (VR):';
      else titleDeficitEl.textContent = 'MESES COM DÉFICIT (CASAL):';

      simDeficitEl.textContent = `${pilarData.mesesDeficit} de ${result.totalMeses} meses`;
      simDeficitEl.style.color = pilarData.mesesDeficit > 0 ? 'var(--rose)' : 'var(--matrix-green)';
    }

    const titleMediaEl = document.getElementById('simKpiMediaTitle');
    const simMediaEl = document.getElementById('simSaldoMedio');
    if (titleMediaEl && simMediaEl) {
      if (currentSimVisao === 'matheus') titleMediaEl.textContent = 'SOBRA MÉDIA PRA MIM (MATHEUS):';
      else if (currentSimVisao === 'scarlet') titleMediaEl.textContent = 'SOBRA MÉDIA SCARLET:';
      else if (currentSimVisao === 'va') titleMediaEl.textContent = 'SALDO MÉDIO DISPONÍVEL (VA):';
      else if (currentSimVisao === 'vr') titleMediaEl.textContent = 'SALDO MÉDIO DISPONÍVEL (VR):';
      else titleMediaEl.textContent = 'SOBRA MÉDIA MENSAL (CASAL):';

      simMediaEl.textContent = formatBRL(pilarData.saldoMedio);
      simMediaEl.style.color = pilarData.saldoMedio >= 0 ? 'var(--matrix-green)' : 'var(--rose)';
    }
  }

  // Navegar diretamente para o mês selecionado no Fluxo de Caixa
  function navegarParaMes(ano, mes) {
    let targetY = String(ano);
    let targetM = String(mes);
    if (targetY < '2026' || (targetY === '2026' && MONTH_NAMES.indexOf(targetM) < 9)) {
      targetY = '2026';
      targetM = 'Outubro';
    }
    currentYear = targetY;
    currentMonth = targetM;
    calSelectedYear = targetY;
    calSelectedMonth = targetM;

    const allYears = MatrixDB.getAllYears();
    if (!allYears.includes(currentYear)) {
      MatrixDB.createYear(currentYear, allYears[allYears.length - 1] || '2027');
    }

    populateYearSelector();
    updateMonthDisplay();
    renderAll();

    closeModal('drilldownModalBackdrop');
    closeModal('scenarioModalBackdrop');

    switchTab('tab-fluxo', 'prev');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Raio-X explicativo do mês no simulador ("Por que esse valor está ficando assim?")
  function abrirRaioXSimulador(ano, mes) {
    const state = MatrixDB.getState();
    const monthData = MatrixDB.getMonth(ano, mes);
    const titleEl = document.getElementById('drilldownModalTitle');
    const contentEl = document.getElementById('drilldownModalContent');
    const backdrop = document.getElementById('drilldownModalBackdrop');
    if (!titleEl || !contentEl || !backdrop) return;

    const periodLabel = `${mes} de ${ano}`;
    titleEl.innerHTML = `🔍 Raio-X Financeiro & Diagnóstico: ${periodLabel}`;

    // 1. Receitas
    const receitasList = monthData.receitas || [];
    const totalReceitas = receitasList.length > 0 
      ? receitasList.reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0)
      : (parseFloat(monthData.totais && monthData.totais['Subtotal Ganhos']) || 5788.19);

    // 2. Gastos Fixos
    const fixosList = monthData.fixos || [];
    const totalFixos = fixosList.reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);

    // 3. Gastos Variáveis
    const outrosList = monthData.outros || [];
    const totalOutros = outrosList.reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);

    // 4. Contas de Início de Ano (se Janeiro)
    let contasInicio = 0;
    if (mes === 'Janeiro' && monthData.totais && monthData.totais['Contas Inicio Ano']) {
      contasInicio = parseFloat(monthData.totais['Contas Inicio Ano']) || 0;
    }

    // 5. Cenários aplicados neste mês
    const simResult = ScenarioSimulator.runSimulation(state, null, 24);
    const monthSimRow = simResult.timeline.find(r => String(r.year) === String(ano) && r.monthName === mes);
    const custoCenarios = monthSimRow ? monthSimRow.custoCenarios : 0;
    const cenariosAplicados = (monthSimRow && monthSimRow.cenariosAplicados) || [];

    const totalGastosReal = totalFixos + totalOutros + contasInicio;
    const totalGastosComCenarios = totalGastosReal + custoCenarios;
    const saldoFinal = totalReceitas - totalGastosComCenarios;

    // Diagnóstico Inteligente
    let diagnosticoHtml = '';
    if (saldoFinal < 0) {
      const deficit = Math.abs(saldoFinal);
      let motivos = [];
      if (mes === 'Janeiro' && contasInicio > 0) {
        motivos.push(`<strong>Contas sazonais de início de ano (${formatBRL(contasInicio)})</strong>: IPTU, IPVA, licenciamento e taxas profissionais acumulam neste mês.`);
      }
      if (totalFixos > totalReceitas * 0.7) {
        motivos.push(`<strong>Comprometimento fixo elevado (${formatBRL(totalFixos)})</strong>: parcela Caixa, Unimed e contas essenciais absorvem grande fatia da renda base.`);
      }
      if (totalOutros > 2500) {
        motivos.push(`<strong>Gastos variáveis e faturas (${formatBRL(totalOutros)})</strong>: faturas de cartão e compras correntes pesam no orçamento.`);
      }
      if (custoCenarios > 0) {
        motivos.push(`<strong>Cenários e despesas hipotéticas ativas (+ ${formatBRL(custoCenarios)})</strong>: reduzem a folga deste período.`);
      }
      if (motivos.length === 0) {
        motivos.push(`Despesas totais (${formatBRL(totalGastosComCenarios)}) excedem a receita prevista (${formatBRL(totalReceitas)}).`);
      }

      diagnosticoHtml = `
        <div style="background:rgba(239,68,68,0.1);border:1px solid var(--rose);border-radius:var(--radius-sm);padding:12px;margin-bottom:14px;">
          <div style="font-weight:700;color:var(--rose);font-size:12.5px;margin-bottom:6px;">⚠️ Por que este mês fecha em Déficit (-${formatBRL(deficit)})?</div>
          <ul style="margin:0;padding-left:18px;font-size:11.5px;color:var(--text-main);line-height:1.6;">
            ${motivos.map(m => `<li>${m}</li>`).join('')}
          </ul>
          <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">
            💡 <em>Dica de Gestão:</em> Em sua rotina financeira, o déficit sazonal de início de ano é tradicionalmente suprido pela poupança do 13º salário na conta BB Investimentos.
          </div>
        </div>
      `;
    } else {
      let motivos = [];
      if (receitasList.some(r => r.nome.includes('13º'))) {
        motivos.push(`<strong>Entrada do 13º Salário USP</strong> alavanca o caixa deste mês.`);
      }
      if (saldoFinal >= 1000) {
        motivos.push(`Folga financeira confortável (+${formatBRL(saldoFinal)}) disponível para poupança ou investimentos.`);
      } else {
        motivos.push(`Caixa equilibrado dentro do teto previsto (+${formatBRL(saldoFinal)}).`);
      }

      diagnosticoHtml = `
        <div style="background:rgba(0,255,102,0.08);border:1px solid var(--matrix-green-dim);border-radius:var(--radius-sm);padding:12px;margin-bottom:14px;">
          <div style="font-weight:700;color:var(--matrix-green);font-size:12.5px;margin-bottom:6px;">✅ Por que este mês fecha com Folga (+${formatBRL(saldoFinal)})?</div>
          <ul style="margin:0;padding-left:18px;font-size:11.5px;color:var(--text-main);line-height:1.6;">
            ${motivos.map(m => `<li>${m}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Top Despesas
    const todasDespesas = [
      ...fixosList.map(f => ({ ...f, grupo: 'Fixo' })),
      ...outrosList.map(o => ({ ...o, grupo: 'Variável' }))
    ].sort((a, b) => (parseFloat(b.valor) || 0) - (parseFloat(a.valor) || 0));

    const topDespesas = todasDespesas.slice(0, 6);

    const rowContas = monthSimRow && monthSimRow.contas ? monthSimRow.contas : {
      matheus: { ganhos: totalReceitas, gastos: totalFixos, custoCenarios: 0, saldoSimulado: saldoFinal },
      scarlet: { ganhos: 0, gastos: 0, custoCenarios: 0, saldoSimulado: 0 },
      va: { ganhos: 2050, gastos: 0, custoCenarios: 0, saldoSimulado: 2050 },
      vr: { ganhos: 1105, gastos: 0, custoCenarios: 0, saldoSimulado: 1105 }
    };

    let html = `
      <div style="font-family:var(--font-mono);font-size:12px;">
        <!-- 1. Grid Segregado por Contas (Matheus, Scarlet, Benefícios VA & VR) -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:10px;margin-bottom:14px;">
          <!-- 👨 Matheus -->
          <div style="background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.3);border-radius:var(--radius-sm);padding:10px 12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-weight:700;color:var(--cyan);font-size:12px;">👨 Eu (Matheus • USP)</span>
              <span class="status-badge ${rowContas.matheus.saldoSimulado >= 0 ? 'pago' : 'danger'}" style="font-size:9.5px;">
                ${rowContas.matheus.saldoSimulado >= 0 ? 'Folga' : 'Déficit'}
              </span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;padding:2px 0;">
              <span>Renda USP + Extras:</span>
              <span style="color:var(--text-main);">${formatBRL(rowContas.matheus.ganhos)}</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;padding:2px 0;">
              <span>Gastos Próprios + Transf.:</span>
              <span style="color:var(--text-main);">- ${formatBRL(rowContas.matheus.gastos)}</span>
            </div>
            ${rowContas.matheus.custoCenarios > 0 ? `
              <div style="font-size:11px;color:var(--cyan);display:flex;justify-content:space-between;padding:2px 0;">
                <span>Cenários Matheus:</span>
                <span>- ${formatBRL(rowContas.matheus.custoCenarios)}</span>
              </div>
            ` : ''}
            <div style="border-top:1px dashed rgba(56,189,248,0.3);margin:5px 0 3px 0;"></div>
            <div style="display:flex;justify-content:space-between;font-weight:700;font-size:12px;">
              <span>Sobra pra Mim:</span>
              <span style="color:${rowContas.matheus.saldoSimulado >= 0 ? 'var(--cyan)' : 'var(--rose)'};">${formatBRL(rowContas.matheus.saldoSimulado)}</span>
            </div>
          </div>

          <!-- 👩 Scarlet -->
          <div style="background:rgba(236,72,153,0.06);border:1px solid rgba(236,72,153,0.3);border-radius:var(--radius-sm);padding:10px 12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-weight:700;color:#f472b6;font-size:12px;">👩 Scarlet (FisioFlow + Nubank)</span>
              <span class="status-badge ${rowContas.scarlet.saldoSimulado >= 0 ? 'pago' : 'danger'}" style="font-size:9.5px;">
                ${rowContas.scarlet.saldoSimulado >= 0 ? 'Folga' : 'Déficit'}
              </span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;padding:2px 0;">
              <span>FisioFlow (M+1):</span>
              <span style="color:var(--text-main);">${formatBRL(rowContas.scarlet.ganhosFisio != null ? rowContas.scarlet.ganhosFisio : rowContas.scarlet.ganhos)}</span>
            </div>
            ${rowContas.scarlet.outrasRendas > 0 ? `
              <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;padding:2px 0;">
                <span>Outras Rendas Scarlet:</span>
                <span style="color:var(--matrix-green);">+ ${formatBRL(rowContas.scarlet.outrasRendas)}</span>
              </div>
            ` : ''}
            ${rowContas.scarlet.transferencia > 0 ? `
              <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;padding:2px 0;">
                <span>Transf. p/ Scarlet:</span>
                <span style="color:var(--amber);">+ ${formatBRL(rowContas.scarlet.transferencia)}</span>
              </div>
            ` : ''}
            <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;padding:2px 0;font-weight:600;">
              <span>Subtotal Recursos Scarlet:</span>
              <span style="color:var(--text-main);">${formatBRL(rowContas.scarlet.ganhos)}</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;padding:2px 0;">
              <span>Fatura Nubank Scarlet:</span>
              <span style="color:var(--rose);">- ${formatBRL(rowContas.scarlet.gastos)}</span>
            </div>
            ${rowContas.scarlet.custoCenarios > 0 ? `
              <div style="font-size:11px;color:#f472b6;display:flex;justify-content:space-between;padding:2px 0;">
                <span>Cenários Scarlet:</span>
                <span>- ${formatBRL(rowContas.scarlet.custoCenarios)}</span>
              </div>
            ` : ''}
            <div style="border-top:1px dashed rgba(236,72,153,0.3);margin:5px 0 3px 0;"></div>
            <div style="display:flex;justify-content:space-between;font-weight:700;font-size:12px;">
              <span>Sobra Scarlet:</span>
              <span style="color:${rowContas.scarlet.saldoSimulado >= 0 ? '#f472b6' : 'var(--rose)'};">${formatBRL(rowContas.scarlet.saldoSimulado)}</span>
            </div>
          </div>

          <!-- 🍽️ Benefícios (VA & VR) -->
          <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.3);border-radius:var(--radius-sm);padding:10px 12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-weight:700;color:var(--amber);font-size:12px;">🍽️ Benefícios (VA & VR)</span>
              <span class="status-badge pago" style="font-size:9.5px;">Ativo USP</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;padding:2px 0;">
              <span>Recarga VA (Supermercado):</span>
              <span style="color:var(--amber);">${formatBRL(rowContas.va.ganhos)}</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;padding:2px 0;">
              <span>Recarga VR (Almoço Presencial):</span>
              <span style="color:#c084fc;">${formatBRL(rowContas.vr.ganhos)}</span>
            </div>
            ${(rowContas.va.custoCenarios > 0 || rowContas.vr.custoCenarios > 0) ? `
              <div style="font-size:11px;color:var(--amber);display:flex;justify-content:space-between;padding:2px 0;">
                <span>Cenários Alimentação:</span>
                <span>- ${formatBRL(rowContas.va.custoCenarios + rowContas.vr.custoCenarios)}</span>
              </div>
            ` : ''}
            <div style="border-top:1px dashed rgba(245,158,11,0.3);margin:5px 0 3px 0;"></div>
            <div style="display:flex;justify-content:space-between;font-weight:700;font-size:12px;">
              <span>Saldo Benefícios:</span>
              <span style="color:var(--amber);">${formatBRL(rowContas.va.saldoSimulado + rowContas.vr.saldoSimulado)}</span>
            </div>
          </div>
        </div>

        <!-- Card Resumo Consolidado Casal -->
        <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:12px 14px;border-radius:var(--radius-sm);margin-bottom:14px;">
          <div style="font-weight:700;color:var(--matrix-green);font-size:12px;margin-bottom:8px;">⚖️ Balanço Consolidado do Casal (Conta Corrente):</div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;">
            <span style="color:var(--cyan);">(+) Rendas Pecuniárias do Casal:</span>
            <strong style="color:var(--cyan);">${formatBRL(totalReceitas)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;">
            <span style="color:var(--amber);">(-) Gastos Fixos e Contas da Casa:</span>
            <span>- ${formatBRL(totalFixos)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;">
            <span style="color:var(--amber);">(-) Gastos Variáveis (Faturas de Cartão):</span>
            <span>- ${formatBRL(totalOutros)}</span>
          </div>
          ${contasInicio > 0 ? `
            <div style="display:flex;justify-content:space-between;padding:3px 0;">
              <span style="color:var(--rose);">(-) Contas Início de Ano (IPTU/IPVA):</span>
              <span style="color:var(--rose);">- ${formatBRL(contasInicio)}</span>
            </div>
          ` : ''}
          ${custoCenarios > 0 ? `
            <div style="display:flex;justify-content:space-between;padding:3px 0;">
              <span style="color:var(--cyan);">(-) Cenários Hipotéticos Ativos:</span>
              <span style="color:var(--cyan);">- ${formatBRL(custoCenarios)}</span>
            </div>
          ` : ''}
          <div style="border-top:1px dashed var(--border-dim);margin:8px 0 6px 0;"></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;">
            <span style="color:var(--text-main);">Saldo Conjunto Simulado:</span>
            <span style="color:${saldoFinal >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};">${formatBRL(saldoFinal)}</span>
          </div>
        </div>

        ${diagnosticoHtml}

        <!-- Botão de Ação Direta para o Fluxo de Caixa -->
        <div style="margin-bottom:16px;">
          <button class="btn-matrix primary" style="width:100%;justify-content:center;padding:10px;font-size:12.5px;font-weight:700;" onclick="MatrixApp.navegarParaMes('${ano}', '${mes}')">
            🚀 Abrir ${mes} / ${ano} no Fluxo de Caixa para Ver & Editar Lançamentos
          </button>
        </div>

        <!-- Tabelas de Detalhamento Rápido -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:14px;">
          <!-- Receitas do Mês -->
          <div>
            <div style="font-weight:700;color:var(--matrix-green);margin-bottom:6px;font-size:11px;text-transform:uppercase;">
              📥 Receitas Previstas (${receitasList.length})
            </div>
            <table class="data-table" style="font-size:11px;">
              <tbody>
                ${receitasList.length === 0 ? '<tr><td style="color:var(--text-muted);">Nenhuma receita listada.</td></tr>' : receitasList.map(r => `
                  <tr>
                    <td><strong>${r.nome}</strong></td>
                    <td class="val-col" style="color:var(--cyan);">${formatBRL(r.valor)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Maiores Gastos do Mês -->
          <div>
            <div style="font-weight:700;color:var(--rose);margin-bottom:6px;font-size:11px;text-transform:uppercase;">
              💳 Maiores Despesas do Mês
            </div>
            <table class="data-table" style="font-size:11px;">
              <tbody>
                ${topDespesas.length === 0 ? '<tr><td style="color:var(--text-muted);">Nenhum gasto listado.</td></tr>' : topDespesas.map(d => `
                  <tr>
                    <td>
                      <strong>${d.nome}</strong>
                      <span style="font-size:9.5px;color:var(--text-dim);"> (${d.grupo})</span>
                    </td>
                    <td class="val-col">${formatBRL(d.valor)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        ${cenariosAplicados.length > 0 ? `
        <div style="margin-top:14px;background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.3);border-radius:var(--radius-sm);padding:10px 12px;">
          <div style="font-size:11px;font-weight:700;color:var(--cyan);margin-bottom:4px;">🔮 Hipóteses Incidindo neste Mês:</div>
          <div style="font-size:11px;color:var(--text-muted);">
            ${cenariosAplicados.map(c => `• <strong>${c.titulo}</strong>: ${formatBRL(c.valor)} (Conta: ${c.conta} | Renda: ${c.renda})`).join('<br>')}
          </div>
        </div>` : ''}
      </div>
    `;

    contentEl.innerHTML = html;
    openModal(backdrop);
  }

  // ==========================================
  // 4. CALENDÁRIO & CARONAS (USP SÃO CARLOS)
  // ==========================================
  function renderCalendar() {
    if (!calSelectedYear) calSelectedYear = currentYear;
    if (!calSelectedMonth) calSelectedMonth = currentMonth;

    const monthIndex = MONTH_NAMES.indexOf(calSelectedMonth) + 1;
    const yearNum = parseInt(calSelectedYear, 10);
    const state = MatrixDB.getState();
    const customData = state.calendarioCustom || { overrides: {}, folgas: [] };

    // Preenche seletor de meses (respeitando o limite temporal mínimo de Outubro/2026)
    const mSelect = document.getElementById('calMonthSelect');
    if (mSelect) {
      const availableMonths = (String(calSelectedYear) === '2026')
        ? MONTH_NAMES.slice(9) // Outubro, Novembro, Dezembro
        : MONTH_NAMES;
      mSelect.innerHTML = availableMonths.map(m => `<option value="${m}">${m}</option>`).join('');
      mSelect.value = calSelectedMonth;
    }

    // Preenche seletor de anos
    const ySelect = document.getElementById('calYearSelect');
    if (ySelect) {
      const allYears = (typeof MatrixDB.getAllYears === 'function') ? MatrixDB.getAllYears() : ['2026', '2027', '2028'];
      if (!allYears.includes(calSelectedYear)) allYears.push(calSelectedYear);
      ySelect.innerHTML = allYears.map(y => `<option value="${y}">${y}</option>`).join('');
      ySelect.value = calSelectedYear;
    }

    // Título do Mês e Banner Informativo
    const titleEl = document.getElementById('calCurrentMonthTitle');
    if (titleEl) titleEl.textContent = `${calSelectedMonth} / ${calSelectedYear}`;

    const bannerText = document.getElementById('calBannerMonthText');
    if (bannerText) bannerText.textContent = `${calSelectedMonth} de ${calSelectedYear}`;

    // Atualiza estado do botão Anterior no Calendário (desabilita em Outubro/2026)
    const prevCalBtn = document.querySelector('.btn-cal-nav[onclick*="-1"]');
    if (prevCalBtn) {
      const isAtMin = (String(calSelectedYear) === '2026' && calSelectedMonth === 'Outubro');
      prevCalBtn.disabled = isAtMin;
      prevCalBtn.style.opacity = isAtMin ? '0.35' : '1';
      prevCalBtn.style.cursor = isAtMin ? 'not-allowed' : 'pointer';
    }

    const commute = CalendarEngine.calculateCommuteAndVR(yearNum, monthIndex, customData);

    // VR: Baseado nos dias úteis do mês civil (01/M a 31/M)
    const diasUteisEl = document.getElementById('calDiasUteis');
    if (diasUteisEl) diasUteisEl.textContent = `${commute.vrWorkingDaysCount} dias`;

    const diasUteisSub = document.getElementById('calDiasUteisSub');
    if (diasUteisSub) diasUteisSub.textContent = `01 a ${commute.totalDays} no mês`;

    const vrEl = document.getElementById('calVRTotal');
    if (vrEl) vrEl.textContent = formatBRL(commute.totalVR);

    const vrSub = document.getElementById('calVRSub');
    if (vrSub) vrSub.textContent = `${commute.vrWorkingDaysCount} dias x R$ 65`;

    // Caronas: Baseado nos dias úteis entre salários (4º dia útil de M a 3º dia útil de M+1)
    const diasCaronaEl = document.getElementById('calDiasCarona');
    if (diasCaronaEl) diasCaronaEl.textContent = `${commute.commuteWorkingDaysCount} dias`;

    const diasCaronaSub = document.getElementById('calDiasCaronaSub');
    if (diasCaronaSub) {
      const cycleLabel = commute.salaryCycle ? commute.salaryCycle.cycleRangeLabel : '';
      diasCaronaSub.textContent = `Ciclo: ${cycleLabel}`;
    }

    const caronasEl = document.getElementById('calCaronasTotal');
    if (caronasEl) caronasEl.textContent = formatBRL(commute.totalCaronas);

    const caronasSub = document.getElementById('calCaronasSub');
    if (caronasSub) caronasSub.textContent = `${commute.commuteWorkingDaysCount} dias x R$ 60`;

    // Render Grid dos Dias em 7 Colunas (Domingo a Sábado)
    const gridEl = document.getElementById('calendarDaysGrid');
    if (!gridEl) return;

    const today = new Date();
    const isCurrentYearNow = today.getFullYear() === yearNum;
    const isCurrentMonthNow = (today.getMonth() + 1) === monthIndex;
    const currentDayNow = today.getDate();

    let gridHtml = '';

    // 1. Células de preenchimento anteriores ao dia 1 (para alinhar com Domingo = 0)
    if (commute.paddingDaysBefore && commute.paddingDaysBefore.length > 0) {
      commute.paddingDaysBefore.forEach(p => {
        gridHtml += `
          <div class="cal-day-cell padding-day" title="Mês anterior">
            <div class="cal-day-top">
              <span class="cal-day-num" style="color:var(--text-dim);opacity:0.5;">${p.day}</span>
            </div>
          </div>
        `;
      });
    }

    // 2. Dias do mês corrente (1 a totalDays)
    commute.days.forEach(d => {
      let cellTypeClass = 'workday';
      let tagShort = '🚗 USP';
      let tagFull = '🚗 Presencial USP';
      let detail = '<span>Carona R$ 60</span><span>VR R$ 65</span>';
      let tooltip = `Dia ${d.day} (${d.dayOfWeekStr}): Presencial na USP São Carlos. Clique para alterar status.`;

      if (d.statusTipo === 'weekend') {
        cellTypeClass = 'weekend';
        tagShort = '💤 Fim Sem';
        tagFull = '💤 Fim de Semana';
        detail = '<span>Descanso</span>';
        tooltip = `Dia ${d.day} (${d.dayOfWeekStr}): Fim de semana. Clique para alterar status.`;
      } else if (d.statusTipo === 'abonada') {
        cellTypeClass = 'custom-abonada';
        tagShort = '📝 Abonada';
        tagFull = `📝 ${d.customLeaveDesc || 'Falta Abonada'}`;
        detail = '<span style="color:var(--cyan);font-weight:600;">Falta Abonada</span>';
        tooltip = `Dia ${d.day} (${d.dayOfWeekStr}): Falta Abonada. Sem Carona/VR. Clique para alterar.`;
      } else if (d.statusTipo === 'folga') {
        cellTypeClass = 'custom-leave';
        tagShort = '🏖️ Folga';
        tagFull = `🏖️ ${d.customLeaveDesc || 'Folga'}`;
        detail = '<span style="color:var(--purple);font-weight:600;">Folga</span>';
        tooltip = `Dia ${d.day} (${d.dayOfWeekStr}): Folga (${d.customLeaveDesc}). Clique para alterar.`;
      } else if (d.statusTipo === 'ferias') {
        cellTypeClass = 'custom-ferias';
        tagShort = '✈️ Férias';
        tagFull = `✈️ ${d.customLeaveDesc || 'Férias'}`;
        detail = '<span style="color:var(--purple);font-weight:600;">Férias</span>';
        tooltip = `Dia ${d.day} (${d.dayOfWeekStr}): Férias (${d.customLeaveDesc}). Clique para alterar.`;
      } else if (d.statusTipo === 'holiday') {
        cellTypeClass = 'holiday';
        tagShort = '🎉 Feriado';
        tagFull = `🎉 ${d.holidayDesc || 'Feriado'}`;
        detail = '<span style="color:var(--amber);">Feriado</span>';
        tooltip = `Dia ${d.day} (${d.dayOfWeekStr}): Feriado (${d.holidayDesc}). Clique para transformar em trabalho presencial.`;
      } else if (d.statusTipo === 'recess') {
        cellTypeClass = 'recess';
        tagShort = '🏛️ Recesso';
        tagFull = '🏛️ Recesso USP';
        detail = '<span style="color:var(--cyan);">Recesso Fim de Ano</span>';
        tooltip = `Dia ${d.day} (${d.dayOfWeekStr}): Recesso oficial USP de fim de ano.`;
      } else if (d.statusTipo === 'workday') {
        cellTypeClass = 'workday';
        tagShort = '🚗 USP';
        tagFull = '🚗 Presencial USP';
        detail = '<span>Carona R$ 60</span><span>VR R$ 65</span>';
        tooltip = `Dia ${d.day} (${d.dayOfWeekStr}): Presencial na USP São Carlos. Clique para transformar em folga, abonada, etc.`;
      }

      const isToday = isCurrentYearNow && isCurrentMonthNow && d.day === currentDayNow;
      const todayClass = isToday ? 'today' : '';
      const todayBadge = isToday ? '<span class="cal-today-badge">HOJE</span>' : '';
      const overrideDot = d.override ? '<span class="cal-override-dot" title="Status alterado manualmente">●</span>' : '';

      gridHtml += `
        <div class="cal-day-cell ${cellTypeClass} ${todayClass} ${d.override ? 'has-override' : ''}" onclick="MatrixApp.abrirModalEditarDia('${d.dateStr}')" title="${tooltip}">
          <div class="cal-day-top">
            <span class="cal-day-num">${d.day}</span>
            <div class="cal-day-badges">
              ${overrideDot}
              ${todayBadge}
            </div>
          </div>
          <div class="cal-day-status">
            <span class="cal-status-short">${tagShort}</span>
            <span class="cal-status-full">${tagFull}</span>
          </div>
          <div class="cal-day-footer">${detail}</div>
        </div>
      `;
    });

    // 3. Células de preenchimento após o último dia para fechar no Sábado
    if (commute.paddingDaysAfter && commute.paddingDaysAfter.length > 0) {
      commute.paddingDaysAfter.forEach(p => {
        gridHtml += `
          <div class="cal-day-cell padding-day" title="Próximo mês">
            <div class="cal-day-top">
              <span class="cal-day-num" style="color:var(--text-dim);opacity:0.5;">${p.day}</span>
            </div>
          </div>
        `;
      });
    }

    gridEl.innerHTML = gridHtml;
  }

  function navCalendarMonth(direction) {
    if (direction < 0 && String(calSelectedYear) === '2026' && calSelectedMonth === 'Outubro') {
      return; // Trava estrita: Outubro/2026 é o início
    }
    let idx = MONTH_NAMES.indexOf(calSelectedMonth);
    idx += direction;
    if (idx < 0) {
      const prevY = parseInt(calSelectedYear, 10) - 1;
      if (prevY < 2026) return;
      idx = 11;
      calSelectedYear = String(prevY);
    } else if (idx > 11) {
      idx = 0;
      calSelectedYear = String(parseInt(calSelectedYear, 10) + 1);
    }
    calSelectedMonth = MONTH_NAMES[idx];
    currentMonth = calSelectedMonth;
    currentYear = calSelectedYear;
    updateMonthDisplay();
    renderAll();
  }

  function onCalMonthChange(m) {
    if (m && MONTH_NAMES.includes(m)) {
      if (String(calSelectedYear) === '2026' && MONTH_NAMES.indexOf(m) < 9) {
        m = 'Outubro';
      }
      calSelectedMonth = m;
      currentMonth = calSelectedMonth;
      updateMonthDisplay();
      renderAll();
    }
  }

  function onCalYearChange(y) {
    if (y) {
      calSelectedYear = String(y);
      currentYear = calSelectedYear;
      if (calSelectedYear === '2026' && MONTH_NAMES.indexOf(calSelectedMonth) < 9) {
        calSelectedMonth = 'Outubro';
        currentMonth = 'Outubro';
      }
      updateMonthDisplay();
      renderAll();
    }
  }

  function resetCalendarToCurrent() {
    const now = new Date();
    const realYear = String(now.getFullYear());
    const realMonth = MONTH_NAMES[now.getMonth()] || 'Novembro';
    const targetY = parseInt(realYear, 10) < 2026 ? '2026' : realYear;

    currentYear = targetY;
    currentMonth = (targetY === '2026' && MONTH_NAMES.indexOf(realMonth) < 9) ? 'Outubro' : realMonth;
    calSelectedYear = currentYear;
    calSelectedMonth = currentMonth;
    updateMonthDisplay();
    renderAll();
  }

  // ==========================================
  // 5. FINANCIAMENTO CAIXA & AMORTIZADOR
  // ==========================================
  function renderFinancing() {
    const state = MatrixDB.getState();
    const cfg = state.financiamentoCaixa || AmortizationEngine.DEFAULT_CONFIG;

    const curMIdxNum = MONTH_NAMES.indexOf(currentMonth) + 1;
    const curYNum = parseInt(currentYear, 10) || 2026;
    const statusCaixa = (typeof AmortizationEngine !== 'undefined' && AmortizationEngine.getStatusForMonth)
      ? AmortizationEngine.getStatusForMonth(curYNum, curMIdxNum, cfg)
      : { saldo: cfg.saldoDevedor || 157884.49, prazo: cfg.prazoMeses || 271, parcela: cfg.parcelaAtual || 1395.88 };

    const mesBadge = document.getElementById('caixaMesAtivoBadge');
    if (mesBadge) {
      mesBadge.textContent = `${currentMonth} / ${currentYear}`;
    }

    const saldoEl = document.getElementById('caixaSaldoDevedor');
    if (saldoEl) saldoEl.textContent = formatBRL(statusCaixa.saldo);

    const prazoEl = document.getElementById('caixaPrazoMeses');
    if (prazoEl) prazoEl.textContent = formatarPrazoExtenso(statusCaixa.prazo);

    const parcelaEl = document.getElementById('caixaParcelaAtual');
    if (parcelaEl) parcelaEl.textContent = formatBRL(statusCaixa.parcela);

    const taxaEl = document.getElementById('caixaTaxaJuros');
    if (taxaEl) taxaEl.textContent = `Taxa: ${cfg.taxaJurosAnual || cfg.taxaAnual || 8.9899}% a.a.`;

    // Simulação FGTS (24 meses de depósitos USP = 24 * 501.12 = R$ 12.026,88)
    const saldoFgts24m = (cfg.fgtsMensalUsp || 501.12) * 24;
    const fgtsEl = document.getElementById('fgtsEstimado24m');
    if (fgtsEl) fgtsEl.textContent = formatBRL(saldoFgts24m);

    renderSimulacoesSalvas();
    onChangeTipoSimulacao();
  }

  function onChangeTipoSimulacao() {
    const tipoSelect = document.getElementById('simTipoEstrategia');
    const tipo = tipoSelect ? tipoSelect.value : 'combinado';

    const panels = {
      'combinado': document.getElementById('simPanelCombinado'),
      'mensal_fixo': document.getElementById('simPanelMensalFixo'),
      'periodico': document.getElementById('simPanelPeriodico'),
      'sazonal': document.getElementById('simPanelSazonal'),
      'unico': document.getElementById('simPanelUnico'),
      'customizado': document.getElementById('simPanelCustomizado')
    };

    Object.keys(panels).forEach(k => {
      if (panels[k]) {
        if (k === tipo) {
          panels[k].style.display = (k === 'sazonal' || k === 'customizado') ? 'block' : 'grid';
        } else {
          panels[k].style.display = 'none';
        }
      }
    });

    if (tipo === 'customizado') {
      renderCustomAmortTable();
    }

    simularAmortizacao();
  }

  function renderCustomAmortTable() {
    const tbody = document.getElementById('simCustomTableBody');
    if (!tbody) return;
    if (customAmortItens.length === 0) {
      for (let m = 1; m <= 36; m++) {
        customAmortItens.push({ mes: m, valor: 0 });
      }
    }

    const refDate = { ano: 2026, mesIndex: 11 };
    tbody.innerHTML = customAmortItens.map(item => {
      const totalM = (refDate.mesIndex - 1) + item.mes;
      const ano = refDate.ano + Math.floor(totalM / 12);
      const mes = MONTH_NAMES[totalM % 12];
      return `
        <tr>
          <td style="font-weight:700;color:var(--text-muted);text-align:center;">Mês ${item.mes}</td>
          <td><span style="color:var(--text-main);font-family:var(--font-mono);">${mes} / ${ano}</span></td>
          <td>
            <input type="number" step="100" class="matrix-input" style="padding:4px 8px;font-size:11px;max-width:140px;" 
                   value="${item.valor || 0}" 
                   oninput="MatrixApp.updateCustomAmortItem(${item.mes}, this.value)">
          </td>
        </tr>
      `;
    }).join('');
  }

  function updateCustomAmortItem(mes, val) {
    const it = customAmortItens.find(x => x.mes === mes);
    if (it) it.valor = parseFloat(val) || 0;
    simularAmortizacao();
  }

  function preencherCustomLote(val) {
    customAmortItens.forEach(it => it.valor = val);
    renderCustomAmortTable();
    simularAmortizacao();
  }

  function limparCustomLote() {
    customAmortItens.forEach(it => it.valor = 0);
    renderCustomAmortTable();
    simularAmortizacao();
  }

  function simularAmortizacao() {
    const state = MatrixDB.getState();
    const cfg = state.financiamentoCaixa || AmortizationEngine.DEFAULT_CONFIG;

    const tipoSelect = document.getElementById('simTipoEstrategia');
    const tipo = tipoSelect ? tipoSelect.value : 'combinado';
    const modSelect = document.getElementById('simModalidadeReducao');
    const modalidade = modSelect ? modSelect.value : 'prazo';

    const config = { tipo, modalidade };

    if (tipo === 'combinado') {
      config.valorMensal = parseFloat(document.getElementById('simCombMensal')?.value) || 0;
      config.valorFgts = parseFloat(document.getElementById('simCombFgts')?.value) || 12026.88;
      config.frequenciaFgts = 24;
    } else if (tipo === 'mensal_fixo') {
      config.valorMensal = parseFloat(document.getElementById('simFixoValor')?.value) || 0;
      config.mesInicio = parseInt(document.getElementById('simFixoInicio')?.value, 10) || 1;
    } else if (tipo === 'periodico') {
      config.valorPeriodico = parseFloat(document.getElementById('simPeriodicoValor')?.value) || 0;
      config.frequenciaMeses = parseInt(document.getElementById('simPeriodicoFreq')?.value, 10) || 12;
    } else if (tipo === 'sazonal') {
      config.valorSazonal = parseFloat(document.getElementById('simSazonalValor')?.value) || 0;
      config.mesesSazonais = [];
      if (document.getElementById('chkSazonalNov')?.checked) config.mesesSazonais.push(11);
      if (document.getElementById('chkSazonalDez')?.checked) config.mesesSazonais.push(12);
      if (document.getElementById('chkSazonalJan')?.checked) config.mesesSazonais.push(1);
      if (document.getElementById('chkSazonalMai')?.checked) config.mesesSazonais.push(5);
    } else if (tipo === 'unico') {
      config.valorUnico = parseFloat(document.getElementById('simUnicoValor')?.value) || 0;
      config.mesUnico = parseInt(document.getElementById('simUnicoMes')?.value, 10) || 1;
    } else if (tipo === 'customizado') {
      config.itensCustomizados = customAmortItens;
    }

    const sim = AmortizationEngine.executarSimulacaoCompleta(
      cfg.saldoDevedor,
      cfg.prazoMeses || cfg.totalPrestacoes || 271,
      cfg.taxaJurosAnual || cfg.taxaAnual || 8.9899,
      config,
      { ano: 2026, mesIndex: 11 }
    );

    lastSimulationResult = sim;

    // Atualiza KPIs da interface (Formatado em linhas duplas sem sobreposição)
    const resNovoPrazo = document.getElementById('resNovoPrazo');
    if (resNovoPrazo) {
      const ext = formatarPrazoExtenso(sim.novoPrazo);
      const mMatch = ext.match(/^(.*?)\s*\((.*?)\)$/);
      if (mMatch) {
        resNovoPrazo.innerHTML = `${mMatch[1]}<span class="sim-result-sub">(${mMatch[2]})</span>`;
      } else {
        resNovoPrazo.textContent = ext;
      }
    }

    const resMesesPoupados = document.getElementById('resMesesPoupados');
    if (resMesesPoupados) {
      const poup = formatarTempoPoupado(sim.mesesPoupados);
      const pMatch = poup.match(/^(.*?)\s*a menos(?:\s*\((.*?)\))?$/);
      if (pMatch) {
        const sub = pMatch[2] ? `(${pMatch[2]} a menos)` : 'a menos no contrato';
        resMesesPoupados.innerHTML = `${pMatch[1]}<span class="sim-result-sub" style="color:var(--matrix-green);opacity:0.85;">${sub}</span>`;
      } else {
        resMesesPoupados.textContent = poup;
      }
    }

    const resNovaData = document.getElementById('resNovaDataQuitacao');
    if (resNovaData) {
      resNovaData.innerHTML = `${sim.dataQuitacaoNova}<span class="sim-result-sub">Previsão de Quitação</span>`;
    }

    const resEconomia = document.getElementById('resEconomiaJuros');
    if (resEconomia) {
      resEconomia.innerHTML = `${formatBRL(sim.economiaJuros)}<span class="sim-result-sub" style="color:var(--matrix-green);opacity:0.85;">Juros economizados</span>`;
    }

    const resNovoTotal = document.getElementById('resNovoTotalPago');
    if (resNovoTotal) {
      resNovoTotal.innerHTML = `${formatBRL(sim.novoTotalPago)}<span class="sim-result-sub">Custo total com aportes</span>`;
    }

    const resTotalAportado = document.getElementById('resTotalAportado');
    if (resTotalAportado) {
      resTotalAportado.innerHTML = `${formatBRL(sim.totalAportadoExtra)}<span class="sim-result-sub" style="color:var(--amber);opacity:0.85;">Aportes do bolso + FGTS</span>`;
    }

    // Atualiza tabela ano a ano
    const tBody = document.getElementById('simTabelaAnualBody');
    if (tBody && sim.resumoAnual) {
      tBody.innerHTML = sim.resumoAnual.map(r => `
        <tr>
          <td><strong>Ano ${r.ano}</strong> (${r.anoCalendario})</td>
          <td style="text-align:right;">${formatBRL(r.saldoInicial)}</td>
          <td style="text-align:right;">${formatBRL(r.parcelasPagas)}</td>
          <td style="text-align:right;color:var(--matrix-green);font-weight:700;">${formatBRL(r.extrasAportados)}</td>
          <td style="text-align:right;color:var(--rose);">${formatBRL(r.jurosPagos)}</td>
          <td style="text-align:right;font-weight:700;">${formatBRL(r.saldoFinal)}</td>
        </tr>
      `).join('');
    }
  }

  function toggleTabelaAnual() {
    const box = document.getElementById('simContainerTabelaAnual');
    if (!box) return;
    box.style.display = (box.style.display === 'none' || !box.style.display) ? 'block' : 'none';
  }

  function salvarSimulacaoAtualPrompt() {
    if (!lastSimulationResult) simularAmortizacao();
    const cfg = lastSimulationResult.config || {};
    let defaultNome = 'Simulação Turbo';
    if (cfg.tipo === 'combinado') defaultNome = 'Aporte Mensal + FGTS USP 24m';
    else if (cfg.tipo === 'mensal_fixo') defaultNome = `Aporte Fixo ${formatBRL(cfg.valorMensal)}/mês`;
    else if (cfg.tipo === 'periodico') defaultNome = `Aporte ${formatBRL(cfg.valorPeriodico)} a cada ${cfg.frequenciaMeses}m`;
    else if (cfg.tipo === 'sazonal') defaultNome = `Aporte 13º Salário (${formatBRL(cfg.valorSazonal)})`;
    else if (cfg.tipo === 'unico') defaultNome = `Aporte Único de ${formatBRL(cfg.valorUnico)}`;
    else if (cfg.tipo === 'customizado') defaultNome = 'Aportes Variáveis Mês a Mês';

    const nome = prompt('Dê um nome para esta simulação de amortização:', defaultNome);
    if (!nome || nome.trim() === '') return;

    const state = MatrixDB.getState();
    if (!state.simulacoesAmortizacao) state.simulacoesAmortizacao = [];

    const itemSalvo = {
      id: 'sim_amort_' + Date.now(),
      nome: nome.trim(),
      data: new Date().toISOString(),
      config: JSON.parse(JSON.stringify(cfg)),
      resultado: {
        novoPrazo: lastSimulationResult.novoPrazo,
        novoPrazoAnos: lastSimulationResult.novoPrazoAnos,
        mesesPoupados: lastSimulationResult.mesesPoupados,
        anosPoupados: lastSimulationResult.anosPoupados,
        economiaJuros: lastSimulationResult.economiaJuros,
        totalAportadoExtra: lastSimulationResult.totalAportadoExtra,
        novoTotalPago: lastSimulationResult.novoTotalPago,
        dataQuitacaoNova: lastSimulationResult.dataQuitacaoNova,
        dataQuitacaoOriginal: lastSimulationResult.dataQuitacaoOriginal
      }
    };

    state.simulacoesAmortizacao.push(itemSalvo);
    MatrixDB.saveState(state);
    renderSimulacoesSalvas();
    alert(`✅ Simulação "${nome.trim()}" salva com sucesso!`);
  }

  function renderSimulacoesSalvas() {
    const state = MatrixDB.getState();
    const lista = state.simulacoesAmortizacao || [];
    const container = document.getElementById('simulacoesSalvasContainer');
    const badge = document.getElementById('simCountBadge');
    if (badge) badge.textContent = `${lista.length} salvas`;
    if (!container) return;

    if (lista.length === 0) {
      container.innerHTML = '<p style="font-size:12px;color:var(--text-muted);font-style:italic;">Nenhuma simulação salva ainda. Configure seus aportes acima e clique em "💾 Salvar Simulação".</p>';
      return;
    }

    container.innerHTML = lista.map((sim) => {
      const res = sim.resultado || {};
      const dt = new Date(sim.data).toLocaleDateString('pt-BR');
      return `
        <div class="sim-saved-card">
          <div>
            <div style="font-weight:700;font-size:14px;color:var(--text-main);">${sim.nome}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">
              Salva em: ${dt} • Novo Prazo: <strong style="color:var(--cyan);">${formatarPrazoExtenso(res.novoPrazo || 0)}</strong> • Poupados: <strong style="color:var(--matrix-green);">${formatarPrazoExtenso(res.mesesPoupados || 0)}</strong>
            </div>
            <div style="font-size:11px;color:var(--matrix-green);font-weight:600;margin-top:2px;">
              Economia em Juros: ${formatBRL(res.economiaJuros || 0)} • Quitação: ${res.dataQuitacaoNova || '--'}
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn-matrix secondary" style="padding:6px 12px;font-size:11px;" onclick="MatrixApp.carregarSimulacao('${sim.id}')" title="Carregar no simulador">📂 Carregar</button>
            <button class="btn-matrix primary" style="padding:6px 12px;font-size:11px;" onclick="MatrixApp.baixarRelatorioPDF('${sim.id}')" title="Baixar relatório em PDF">📄 Baixar PDF</button>
            <button class="btn-icon" style="color:var(--rose);font-size:14px;padding:6px 10px;" onclick="MatrixApp.excluirSimulacao('${sim.id}')" title="Excluir simulação">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function carregarSimulacao(id) {
    const state = MatrixDB.getState();
    const lista = state.simulacoesAmortizacao || [];
    const sim = lista.find(s => s.id === id);
    if (!sim || !sim.config) return;

    const cfg = sim.config;
    const tipoSelect = document.getElementById('simTipoEstrategia');
    if (tipoSelect) tipoSelect.value = cfg.tipo || 'combinado';
    const modSelect = document.getElementById('simModalidadeReducao');
    if (modSelect) modSelect.value = cfg.modalidade || 'prazo';

    if (cfg.tipo === 'combinado') {
      if (document.getElementById('simCombMensal')) document.getElementById('simCombMensal').value = cfg.valorMensal || 800;
      if (document.getElementById('simCombFgts')) document.getElementById('simCombFgts').value = cfg.valorFgts || 12026.88;
    } else if (cfg.tipo === 'mensal_fixo') {
      if (document.getElementById('simFixoValor')) document.getElementById('simFixoValor').value = cfg.valorMensal || 1000;
      if (document.getElementById('simFixoInicio')) document.getElementById('simFixoInicio').value = cfg.mesInicio || 1;
    } else if (cfg.tipo === 'periodico') {
      if (document.getElementById('simPeriodicoValor')) document.getElementById('simPeriodicoValor').value = cfg.valorPeriodico || 5000;
      if (document.getElementById('simPeriodicoFreq')) document.getElementById('simPeriodicoFreq').value = cfg.frequenciaMeses || 12;
    } else if (cfg.tipo === 'sazonal') {
      if (document.getElementById('simSazonalValor')) document.getElementById('simSazonalValor').value = cfg.valorSazonal || 3000;
    } else if (cfg.tipo === 'unico') {
      if (document.getElementById('simUnicoValor')) document.getElementById('simUnicoValor').value = cfg.valorUnico || 12026.88;
      if (document.getElementById('simUnicoMes')) document.getElementById('simUnicoMes').value = cfg.mesUnico || 1;
    } else if (cfg.tipo === 'customizado') {
      customAmortItens = cfg.itensCustomizados || [];
      renderCustomAmortTable();
    }

    onChangeTipoSimulacao();
    alert(`Simulação "${sim.nome}" carregada com sucesso!`);
  }

  function excluirSimulacao(id) {
    const state = MatrixDB.getState();
    if (!state.simulacoesAmortizacao) return;
    const idx = state.simulacoesAmortizacao.findIndex(s => s.id === id);
    if (idx >= 0) {
      const nome = state.simulacoesAmortizacao[idx].nome;
      if (confirm(`Deseja realmente excluir a simulação "${nome}"?`)) {
        state.simulacoesAmortizacao.splice(idx, 1);
        MatrixDB.saveState(state);
        renderSimulacoesSalvas();
      }
    }
  }

  function baixarRelatorioPDF(idOuSim) {
    const state = MatrixDB.getState();
    const cfgFin = state.financiamentoCaixa || AmortizationEngine.DEFAULT_CONFIG;
    let simulacaoCompleta = null;
    let nomeSim = 'Simulação Caixa';

    if (typeof idOuSim === 'string') {
      const lista = state.simulacoesAmortizacao || [];
      const saved = lista.find(s => s.id === idOuSim);
      if (saved) {
        nomeSim = saved.nome;
        simulacaoCompleta = AmortizationEngine.executarSimulacaoCompleta(
          cfgFin.saldoDevedor,
          cfgFin.prazoMeses || cfgFin.totalPrestacoes || 271,
          cfgFin.taxaJurosAnual || cfgFin.taxaAnual || 8.9899,
          saved.config,
          { ano: 2026, mesIndex: 11 }
        );
        simulacaoCompleta.nome = saved.nome;
      }
    } else if (idOuSim && typeof idOuSim === 'object') {
      simulacaoCompleta = idOuSim;
      nomeSim = simulacaoCompleta.nome || 'Simulação Atual';
    }

    if (!simulacaoCompleta) {
      simulacaoCompleta = lastSimulationResult;
      if (!simulacaoCompleta) {
        simularAmortizacao();
        simulacaoCompleta = lastSimulationResult;
      }
    }

    if (!simulacaoCompleta) {
      alert('Erro ao gerar relatório da simulação.');
      return;
    }

    simulacaoCompleta.nome = nomeSim;
    const htmlReport = AmortizationEngine.gerarRelatorioHTML(simulacaoCompleta, cfgFin);

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlReport);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 500);
    } else {
      const blob = new Blob([htmlReport], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laudo_Amortizacao_${nomeSim.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('O relatório foi gerado e baixado! Abra o arquivo e pressione Ctrl+P para salvar em PDF.');
    }
  }

  function baixarRelatorioPDFAtual() {
    if (!lastSimulationResult) simularAmortizacao();
    baixarRelatorioPDF(lastSimulationResult);
  }

  // ==========================================
  // 6. INVESTIMENTOS 360 (MATHEUS & SCARLET)
  // ==========================================
  function renderInvestments() {
    const state = MatrixDB.getState();
    const invList = state.investimentos || [];

    const totalGeral = invList.reduce((acc, it) => acc + (parseFloat(it.valorAtual) || 0), 0);
    const totalMatheus = invList.filter(it => it.titular === 'Matheus').reduce((acc, it) => acc + (parseFloat(it.valorAtual) || 0), 0);
    const totalScarlet = invList.filter(it => it.titular === 'Scarlet').reduce((acc, it) => acc + (parseFloat(it.valorAtual) || 0), 0);

    // Separação rigorosa por horizonte e prazos reais
    let totalLiquidez = 0;
    let totalRenda2055 = 0;
    let totalRendaMatheus2055 = 0;
    let totalRendaScarlet2055 = 0;
    let totalMedioPrazo = 0;
    let totalVariavel = 0;

    invList.forEach(it => {
      const val = parseFloat(it.valorAtual) || 0;
      const cat = (it.categoria || '').toLowerCase();
      const atv = (it.ativo || '').toLowerCase();
      const venc = (it.vencimento || '').toLowerCase();
      const tit = (it.titular || '').toLowerCase();

      if (atv.includes('renda+') || atv.includes('2055') || venc.includes('2055') || cat.includes('previdência') || cat.includes('aposentadoria')) {
        totalRenda2055 += val;
        if (tit.includes('scarlet')) {
          totalRendaScarlet2055 += val;
        } else {
          totalRendaMatheus2055 += val;
        }
      } else if (venc.includes('liquidez') || cat.includes('reserva') || atv.includes('selic')) {
        totalLiquidez += val;
      } else if (cat.includes('ações') || cat.includes('cripto') || atv.includes('btc') || atv.includes('csna') || atv.includes('mglu')) {
        totalVariavel += val;
      } else {
        totalMedioPrazo += val;
      }
    });

    const totEl = document.getElementById('invPatrimonioTotal');
    if (totEl) totEl.textContent = formatBRL(totalGeral);

    const resEl = document.getElementById('invReservaTotal');
    if (resEl) resEl.textContent = formatBRL(totalLiquidez);

    const matheusEl = document.getElementById('invMatheusTotal');
    if (matheusEl) matheusEl.textContent = formatBRL(totalMatheus);

    const scarletEl = document.getElementById('invScarletTotal');
    if (scarletEl) scarletEl.textContent = formatBRL(totalScarlet);

    // Horizontes reais
    const hLiqEl = document.getElementById('invHorizLiquidez');
    if (hLiqEl) hLiqEl.textContent = formatBRL(totalLiquidez);

    // 👨 Aposentadoria Matheus
    const hRendaMatheusEl = document.getElementById('invHorizRendaMatheus2055');
    if (hRendaMatheusEl) hRendaMatheusEl.textContent = formatBRL(totalRendaMatheus2055);

    const hRendaMatheusProjEl = document.getElementById('invHorizRendaMatheus2055Proj');
    if (hRendaMatheusProjEl) {
      const fvM = totalRendaMatheus2055 * Math.pow(1 + 0.065, 29);
      hRendaMatheusProjEl.textContent = `Est. 2055: ${formatBRL(fvM)}`;
    }

    // 👩 Aposentadoria Scarlet
    const hRendaScarletEl = document.getElementById('invHorizRendaScarlet2055');
    if (hRendaScarletEl) hRendaScarletEl.textContent = formatBRL(totalRendaScarlet2055);

    const hRendaScarletProjEl = document.getElementById('invHorizRendaScarlet2055Proj');
    if (hRendaScarletProjEl) {
      const fvS = totalRendaScarlet2055 * Math.pow(1 + 0.065, 29);
      hRendaScarletProjEl.textContent = `Est. 2055: ${formatBRL(fvS)}`;
    }

    // Compatibilidade com seletores legados
    const hRendaEl = document.getElementById('invHorizRenda2055');
    if (hRendaEl) hRendaEl.textContent = formatBRL(totalRenda2055);

    const hRendaProjEl = document.getElementById('invHorizRenda2055Proj');
    if (hRendaProjEl) {
      const fv2055 = totalRenda2055 * Math.pow(1 + 0.065, 29);
      hRendaProjEl.textContent = `Est. 2055: ${formatBRL(fv2055)}`;
    }

    const hMedEl = document.getElementById('invHorizMedio');
    if (hMedEl) hMedEl.textContent = formatBRL(totalMedioPrazo);

    const hVarEl = document.getElementById('invHorizVariavel');
    if (hVarEl) hVarEl.textContent = formatBRL(totalVariavel);

    renderStockCards(invList);
    renderInvestCharts(invList, totalGeral, totalMatheus, totalScarlet, {
      liquidez: totalLiquidez,
      renda2055: totalRenda2055,
      medioPrazo: totalMedioPrazo,
      variavel: totalVariavel
    });
    renderInvestTable(invList);
  }

  function renderStockCards(invList) {
    const container = document.getElementById('stockCardsContainer');
    if (!container) return;

    const csna = invList.find(it => (it.ativo || '').toUpperCase().includes('CSNA3')) || {
      id: 'acoes_csna',
      ativo: 'CSNA3 (Cia Siderúrgica Nacional)',
      quantidade: 40,
      precoMedio: 5.0,
      precoAtual: 4.10,
      valorAtual: 164.0
    };

    const mglu = invList.find(it => (it.ativo || '').toUpperCase().includes('MGLU3')) || {
      id: 'acoes_mglu',
      ativo: 'MGLU3 (Magazine Luiza)',
      quantidade: 137,
      precoMedio: 5.82,
      precoAtual: 5.30,
      valorAtual: 726.10
    };

    function renderCard(item, ticker, cor) {
      const qtd = parseFloat(item.quantidade) || 0;
      const pm = parseFloat(item.precoMedio) || 0;
      const pAtual = parseFloat(item.precoAtual) || (qtd > 0 ? (item.valorAtual / qtd) : pm);
      const totalInvestido = qtd * pm;
      const totalAtual = parseFloat(item.valorAtual) || (qtd * pAtual);
      const plValor = totalAtual - totalInvestido;
      const plPercent = totalInvestido > 0 ? (plValor / totalInvestido) * 100 : 0;
      const plColor = plValor >= 0 ? 'var(--matrix-green)' : 'var(--rose)';
      const plSignal = plValor >= 0 ? '+' : '';

      return `
        <div class="stock-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <div>
              <span class="stock-ticker" style="color:${cor};">${ticker}</span>
              <div style="font-size:11px;color:var(--text-muted);">${item.ativo}</div>
            </div>
            <a href="https://www.google.com/finance/quote/${ticker}:BVMF" target="_blank" style="font-size:10px;color:var(--cyan);text-decoration:none;" title="Ver cotação no Google Finance">Google Finance ↗</a>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-family:var(--font-mono);font-size:11px;margin-bottom:10px;">
            <div>
              <span style="color:var(--text-dim);font-size:9px;">POSIÇÃO ATUAL:</span>
              <div style="font-weight:700;font-size:14px;color:var(--text-main);">${formatBRL(totalAtual)}</div>
            </div>
            <div>
              <span style="color:var(--text-dim);font-size:9px;">P&L (RESULTADO):</span>
              <div style="font-weight:700;font-size:13px;color:${plColor};">${plSignal}${formatBRL(plValor)} (${plSignal}${plPercent.toFixed(1)}%)</div>
            </div>
            <div>
              <span style="color:var(--text-dim);font-size:9px;">QUANTIDADE:</span>
              <div style="color:var(--text-main);">${qtd} cotas</div>
            </div>
            <div>
              <span style="color:var(--text-dim);font-size:9px;">FECHAMENTO B3:</span>
              <div style="color:var(--cyan);font-weight:600;">${formatBRL(pAtual)}</div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border-dim);padding-top:8px;">
            <span style="font-size:9px;color:var(--text-dim);">PM: ${formatBRL(pm)}</span>
            <button class="btn-matrix" style="padding:4px 8px;font-size:10px;" onclick="MatrixApp.openAtualizarCotacaoModal('${item.id}')">✏️ Atualizar Cotação</button>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      ${renderCard(csna, 'CSNA3', 'var(--cyan)')}
      ${renderCard(mglu, 'MGLU3', 'var(--amber)')}
    `;
  }

  function renderInvestCharts(invList, totalGeral, totalMatheus, totalScarlet, horizontes = {}) {
    const cTitular = document.getElementById('chartTitularContainer');
    const cCat = document.getElementById('chartCategoriaContainer');
    const cProj = document.getElementById('chartProjecaoContainer');

    // 1. Gráfico Titularidade
    if (cTitular) {
      if (totalGeral <= 0) {
        cTitular.innerHTML = '<div style="font-size:11px;color:var(--text-muted);">Sem dados.</div>';
      } else {
        const pctM = ((totalMatheus / totalGeral) * 100).toFixed(1);
        const pctS = ((totalScarlet / totalGeral) * 100).toFixed(1);
        cTitular.innerHTML = `
          <div style="display:flex;height:14px;border-radius:4px;overflow:hidden;background:rgba(5,8,7,0.6);margin-bottom:10px;">
            <div style="width:${pctM}%;background:var(--matrix-green);transition:width 0.4s ease;" title="Matheus: ${pctM}%"></div>
            <div style="width:${pctS}%;background:#ec4899;transition:width 0.4s ease;" title="Scarlet: ${pctS}%"></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;font-family:var(--font-mono);font-size:11.5px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="display:flex;align-items:center;gap:6px;color:var(--text-bright);">
                <span style="width:8px;height:8px;background:var(--matrix-green);border-radius:2px;display:inline-block;"></span>
                👨 Matheus
              </span>
              <span style="color:var(--matrix-green);font-weight:700;">
                ${pctM}% <span style="font-weight:400;color:var(--text-muted);margin-left:4px;">(${formatBRL(totalMatheus)})</span>
              </span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="display:flex;align-items:center;gap:6px;color:var(--text-bright);">
                <span style="width:8px;height:8px;background:#ec4899;border-radius:2px;display:inline-block;"></span>
                👩 Scarlet
              </span>
              <span style="color:#ec4899;font-weight:700;">
                ${pctS}% <span style="font-weight:400;color:var(--text-muted);margin-left:4px;">(${formatBRL(totalScarlet)})</span>
              </span>
            </div>
          </div>
        `;
      }
    }

    // 2. Gráfico por Categoria (segregação de Previdência / Aposentadoria entre Matheus e Scarlet)
    if (cCat) {
      const cats = {};
      invList.forEach(it => {
        let catName = it.categoria || 'Outros';
        const tit = (it.titular || '').toLowerCase();
        if (catName.toLowerCase().includes('previdência') || catName.toLowerCase().includes('aposentadoria')) {
          catName = tit.includes('scarlet') ? 'Previdência / Aposentadoria (Scarlet)' : 'Previdência / Aposentadoria (Matheus)';
        }
        cats[catName] = (cats[catName] || 0) + (parseFloat(it.valorAtual) || 0);
      });

      const catColors = ['var(--matrix-green)', 'var(--cyan)', 'var(--amber)', 'var(--purple)', '#ec4899', 'var(--rose)'];
      let colorIdx = 0;
      const rows = Object.keys(cats).sort((a,b) => cats[b] - cats[a]).map(k => {
        const val = cats[k];
        const pct = totalGeral > 0 ? ((val / totalGeral) * 100).toFixed(1) : 0;
        const col = catColors[colorIdx % catColors.length];
        colorIdx++;
        return `
          <div style="margin-bottom:6px;">
            <div style="display:flex;justify-content:space-between;font-size:10px;font-family:var(--font-mono);margin-bottom:2px;">
              <span>${k}</span>
              <span><strong>${formatBRL(val)}</strong> (${pct}%)</span>
            </div>
            <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
              <div style="width:${pct}%;background:${col};height:100%;border-radius:3px;"></div>
            </div>
          </div>
        `;
      }).join('');
      cCat.innerHTML = rows || '<div style="font-size:11px;color:var(--text-muted);">Sem dados.</div>';
    }

    // 3. Previsão Individual Ativo por Ativo (Vencimentos e Juros Reais, Sem somas indevidas)
    if (cProj) {
      if (invList.length === 0) {
        cProj.innerHTML = '<div style="font-size:11px;color:var(--text-muted);">Sem ativos cadastrados.</div>';
      } else {
        cProj.innerHTML = invList.map(it => {
          const val = parseFloat(it.valorAtual) || 0;
          const atv = (it.ativo || '').toLowerCase();
          const venc = (it.vencimento || '').toLowerCase();
          const cat = (it.categoria || '').toLowerCase();
          const taxa = (it.rentabilidadeContratada || '').toLowerCase();

          let prevTexto = '';
          let prevColor = 'var(--cyan)';

          if (atv.includes('renda+') || atv.includes('2055') || venc.includes('2055')) {
            const fv = val * Math.pow(1 + 0.065, 29);
            prevTexto = `Venc. 2055: <strong>${formatBRL(fv)}</strong>`;
            prevColor = 'var(--purple)';
          } else if (venc.includes('liquidez') || cat.includes('reserva') || atv.includes('selic')) {
            const rendMensal = val * (0.1075 / 12);
            prevTexto = `Liquidez Diária (~${formatBRL(rendMensal)}/mês)`;
            prevColor = 'var(--matrix-green)';
          } else if (atv.includes('cdb') || venc.includes('2027')) {
            const fv = val * 1.1075;
            prevTexto = `Venc. 2027: <strong>${formatBRL(fv)}</strong>`;
            prevColor = 'var(--amber)';
          } else if (cat.includes('capitalização') || atv.includes('dindin')) {
            const fv = 3000.00;
            prevTexto = `Resgate final (60m): <strong>${formatBRL(fv)}</strong>`;
            prevColor = 'var(--amber)';
          } else if (cat.includes('ações') || atv.includes('csna') || atv.includes('mglu')) {
            prevTexto = `Renda Variável (Cotação B3)`;
            prevColor = 'var(--cyan)';
          } else if (cat.includes('cripto') || atv.includes('btc')) {
            prevTexto = `Criptoativo (Custódia)`;
            prevColor = '#c084fc';
          } else {
            prevTexto = `Vencimento: ${it.vencimento || 'indeterminado'}`;
            prevColor = 'var(--text-muted)';
          }

          const titularClass = (it.titular || 'matheus').toLowerCase();

          return `
            <div style="background:rgba(5,8,7,0.5);border:1px solid var(--border-dim);padding:8px 10px;border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;gap:8px;">
              <div style="min-width:0;">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                  <span class="titular-badge ${titularClass}" style="font-size:9px;padding:1px 5px;">${it.titular}</span>
                  <strong style="font-size:11.5px;color:var(--text-bright);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${it.ativo}</strong>
                </div>
                <div style="font-size:10px;color:var(--text-muted);margin-top:2px;font-family:var(--font-mono);white-space:nowrap;">
                  ${it.corretora} • ${it.rentabilidadeContratada || it.categoria}
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0;font-family:var(--font-mono);">
                <div style="font-size:12px;font-weight:700;color:var(--matrix-green);white-space:nowrap;">${formatBRL(val)}</div>
                <div style="font-size:10px;color:${prevColor};margin-top:2px;white-space:nowrap;">${prevTexto}</div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  function setInvestFilter(titular) {
    currentInvestFilter = titular;
    ['btnFilterTitularTodos', 'btnFilterTitularMatheus', 'btnFilterTitularScarlet'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.remove('active');
    });

    if (titular === 'Matheus') {
      document.getElementById('btnFilterTitularMatheus')?.classList.add('active');
    } else if (titular === 'Scarlet') {
      document.getElementById('btnFilterTitularScarlet')?.classList.add('active');
    } else {
      document.getElementById('btnFilterTitularTodos')?.classList.add('active');
    }

    renderInvestments();
  }

  function toggleInvestAgrupamento() {
    investAgrupado = !investAgrupado;
    const btn = document.getElementById('btnToggleAgrupamento');
    if (btn) {
      if (investAgrupado) {
        btn.classList.add('active');
        btn.textContent = '📦 Agrupado por Ativo (Ativo)';
      } else {
        btn.classList.remove('active');
        btn.textContent = '📦 Agrupar Ativos Iguais';
      }
    }
    renderInvestments();
  }

  function toggleGroupExpand(nomeAtivo) {
    investExpandedGroups[nomeAtivo] = !investExpandedGroups[nomeAtivo];
    const state = MatrixDB.getState();
    renderInvestTable(state.investimentos || []);
  }

  function renderInvestTable(invList) {
    const container = document.getElementById('investmentsCardsContainer') || document.getElementById('investmentsTableBody');
    const badgeCount = document.getElementById('investCountBadge');
    if (!container) return;

    let filtered = invList;
    if (currentInvestFilter && currentInvestFilter !== 'todos') {
      filtered = invList.filter(it => (it.titular || 'Matheus') === currentInvestFilter);
    }

    if (badgeCount) {
      badgeCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'ativo' : 'ativos'}`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;color:var(--text-muted);padding:30px 14px;background:var(--bg-card);border:1px dashed var(--border-dim);border-radius:var(--radius-sm);">
          Nenhum investimento encontrado para este filtro.
          <div style="margin-top:10px;">
            <button class="btn-matrix primary" style="font-size:11px;" onclick="MatrixApp.openNewInvestmentModal()">+ Cadastrar Novo Investimento</button>
          </div>
        </div>
      `;
      return;
    }

    // Se estiver agrupado por nome de ativo
    if (investAgrupado) {
      const groups = {};
      filtered.forEach(it => {
        const key = it.ativo || 'Outro';
        if (!groups[key]) groups[key] = [];
        groups[key].push(it);
      });

      let html = '';
      Object.keys(groups).forEach(key => {
        const subItems = groups[key];
        const totalGrupo = subItems.reduce((acc, x) => acc + (parseFloat(x.valorAtual) || 0), 0);
        const first = subItems[0];
        const isExpanded = !!investExpandedGroups[key];
        const hasMultiple = subItems.length > 1;

        html += `
          <div class="invest-clean-card" style="background:rgba(18,29,23,0.35);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
              <div style="min-width:0;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap;">
                  <span class="titular-badge ${first.titular.toLowerCase()}">${first.titular}</span>
                  <span class="status-badge simulado">${first.categoria}</span>
                  ${hasMultiple ? `<span class="box-badge" style="font-size:9.5px;color:var(--cyan);border-color:var(--cyan);">${subItems.length} Custódias</span>` : ''}
                </div>
                <div style="font-size:14px;font-weight:700;color:var(--text-bright);">${key}</div>
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <div style="font-size:16px;font-weight:800;color:var(--matrix-green);font-family:var(--font-mono);">${formatBRL(totalGrupo)}</div>
              </div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;font-family:var(--font-mono);color:var(--text-muted);border-top:1px solid rgba(255,255,255,0.05);padding-top:7px;margin-bottom:10px;flex-wrap:wrap;gap:6px;">
              <span>🏛️ ${hasMultiple ? 'Múltiplas Instituições' : first.corretora}</span>
              <span style="color:var(--cyan);">${first.rentabilidadeContratada || 'Renda Variável'}</span>
              <span>📅 Venc: <strong style="color:var(--text-bright);">${first.vencimento || 'Longo Prazo'}</strong></span>
            </div>

            <div style="display:flex;gap:6px;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,0.05);padding-top:8px;flex-wrap:wrap;">
              <div>
                ${hasMultiple ? `
                  <button class="btn-matrix secondary" style="padding:4px 9px;font-size:11px;" onclick="MatrixApp.toggleGroupExpand('${key}')">
                    ${isExpanded ? '▲ Ocultar Custódias' : `▼ Ver ${subItems.length} Custódias`}
                  </button>
                ` : ''}
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button class="btn-matrix" style="padding:4px 10px;font-size:11px;" onclick="MatrixApp.openAporteModal('${first.id}')">+ Aporte</button>
                <button class="btn-matrix secondary" style="padding:4px 10px;font-size:11px;" onclick="MatrixApp.openResgateModal('${first.id}')">💸 Resgatar</button>
                ${!hasMultiple ? `
                  <button class="btn-matrix" style="padding:4px 10px;font-size:11px;color:var(--cyan);border-color:rgba(56,189,248,0.4);" onclick="MatrixApp.openEditInvestmentModal('${first.id}')">✏️ Editar</button>
                  <button class="btn-matrix" style="padding:4px 10px;font-size:11px;color:var(--rose);border-color:rgba(244,63,94,0.4);" onclick="MatrixApp.excluirInvestimento('${first.id}')">🗑️ Excluir</button>
                ` : ''}
              </div>
            </div>

            ${hasMultiple && isExpanded ? `
              <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border-dim);display:flex;flex-direction:column;gap:8px;">
                ${subItems.map(sub => `
                  <div style="background:rgba(5,8,7,0.5);border:1px solid rgba(255,255,255,0.06);padding:8px 10px;border-radius:4px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                    <div>
                      <span style="font-size:11.5px;font-weight:700;color:var(--cyan);">${sub.corretora}</span>
                      <span style="font-size:10px;color:var(--text-muted);margin-left:6px;font-family:var(--font-mono);">${sub.rentabilidadeContratada || sub.status || ''}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <strong style="font-size:13px;color:var(--matrix-green);font-family:var(--font-mono);">${formatBRL(sub.valorAtual)}</strong>
                      <div style="display:flex;gap:4px;">
                        <button class="btn-matrix" style="padding:3px 8px;font-size:10px;color:var(--cyan);border-color:rgba(56,189,248,0.4);" onclick="MatrixApp.openEditInvestmentModal('${sub.id}')">✏️ Editar</button>
                        <button class="btn-matrix" style="padding:3px 8px;font-size:10px;color:var(--rose);border-color:rgba(244,63,94,0.4);" onclick="MatrixApp.excluirInvestimento('${sub.id}')">🗑️ Excluir</button>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      });

      container.innerHTML = html;
      return;
    }

    // Visão Limpa Individual em Cards (Mobile-first, Direto e Fácil de Usar)
    container.innerHTML = filtered.map(inv => {
      const titular = inv.titular || 'Matheus';
      const titularClass = titular.toLowerCase();

      return `
        <div class="invest-clean-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
            <div style="min-width:0;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap;">
                <span class="titular-badge ${titularClass}" style="font-size:9.5px;padding:2px 7px;">${titular}</span>
                <span class="status-badge simulado" style="font-size:9.5px;padding:2px 7px;">${inv.categoria}</span>
              </div>
              <div style="font-size:13.5px;font-weight:700;color:var(--text-bright);line-height:1.3;">${inv.ativo}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div style="font-size:16px;font-weight:800;color:var(--matrix-green);font-family:var(--font-mono);">${formatBRL(inv.valorAtual)}</div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;font-family:var(--font-mono);color:var(--text-muted);border-top:1px solid rgba(255,255,255,0.05);padding-top:7px;margin-bottom:10px;flex-wrap:wrap;gap:6px;">
            <span>🏛️ ${inv.corretora}</span>
            <span style="color:var(--cyan);">${inv.rentabilidadeContratada || 'Renda Variável'}</span>
            <span>📅 Venc: <strong style="color:var(--text-bright);">${inv.vencimento || 'Longo Prazo'}</strong></span>
          </div>

          <div style="display:flex;gap:6px;align-items:center;justify-content:flex-end;border-top:1px solid rgba(255,255,255,0.05);padding-top:8px;flex-wrap:wrap;">
            <button class="btn-matrix" style="padding:4px 10px;font-size:11px;" onclick="MatrixApp.openAporteModal('${inv.id}')" title="Adicionar aporte">+ Aporte</button>
            <button class="btn-matrix secondary" style="padding:4px 10px;font-size:11px;" onclick="MatrixApp.openResgateModal('${inv.id}')" title="Resgatar valor">💸 Resgatar</button>
            <button class="btn-matrix" style="padding:4px 10px;font-size:11px;color:var(--cyan);border-color:rgba(56,189,248,0.4);" onclick="MatrixApp.openEditInvestmentModal('${inv.id}')" title="Editar">✏️ Editar</button>
            <button class="btn-matrix" style="padding:4px 10px;font-size:11px;color:var(--rose);border-color:rgba(244,63,94,0.4);" onclick="MatrixApp.excluirInvestimento('${inv.id}')" title="Excluir">🗑️ Excluir</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function openNewInvestmentModal(defaultTitular) {
    document.getElementById('invModalTitle').textContent = 'Novo Investimento';
    document.getElementById('invModalId').value = '';
    document.getElementById('invModalTitular').value = defaultTitular || (currentInvestFilter !== 'todos' ? currentInvestFilter : 'Matheus');
    document.getElementById('invModalAtivo').value = '';
    document.getElementById('invModalCorretora').value = '';
    document.getElementById('invModalCategoria').value = 'Previdência / Aposentadoria';
    document.getElementById('invModalValor').value = '';
    document.getElementById('invModalVencimento').value = '';
    document.getElementById('invModalRentabilidade').value = '';
    document.getElementById('invModalQtd').value = '';
    document.getElementById('invModalPM').value = '';
    document.getElementById('invModalStatus').value = 'Ativo (Foco de novos aportes)';

    const backdrop = document.getElementById('investModalBackdrop');
    openModal(backdrop);
  }

  function openEditInvestmentModal(id) {
    const state = MatrixDB.getState();
    const inv = (state.investimentos || []).find(it => it.id === id);
    if (!inv) return;

    document.getElementById('invModalTitle').textContent = 'Editar Investimento';
    document.getElementById('invModalId').value = inv.id;
    document.getElementById('invModalTitular').value = inv.titular || 'Matheus';
    document.getElementById('invModalAtivo').value = inv.ativo || '';
    document.getElementById('invModalCorretora').value = inv.corretora || '';
    document.getElementById('invModalCategoria').value = inv.categoria || 'Previdência / Aposentadoria';
    document.getElementById('invModalValor').value = inv.valorAtual || 0;
    document.getElementById('invModalVencimento').value = inv.vencimento || '';
    document.getElementById('invModalRentabilidade').value = inv.rentabilidadeContratada || '';
    document.getElementById('invModalQtd').value = inv.quantidade || '';
    document.getElementById('invModalPM').value = inv.precoMedio || '';
    document.getElementById('invModalStatus').value = inv.status || 'Ativo';

    const backdrop = document.getElementById('investModalBackdrop');
    openModal(backdrop);
  }

  function salvarInvestimentoModal() {
    const id = document.getElementById('invModalId').value;
    const titular = document.getElementById('invModalTitular').value;
    const ativo = document.getElementById('invModalAtivo').value.trim();
    const corretora = document.getElementById('invModalCorretora').value.trim();
    const categoria = document.getElementById('invModalCategoria').value;
    const valorAtual = parseFloat(document.getElementById('invModalValor').value) || 0;
    const vencimento = document.getElementById('invModalVencimento').value.trim();
    const rentabilidadeContratada = document.getElementById('invModalRentabilidade').value.trim();
    const status = document.getElementById('invModalStatus').value.trim() || 'Ativo';
    const quantidade = parseFloat(document.getElementById('invModalQtd').value) || undefined;
    const precoMedio = parseFloat(document.getElementById('invModalPM').value) || undefined;

    if (!ativo) {
      alert('Por favor, informe o nome do ativo.');
      return;
    }

    const state = MatrixDB.getState();
    if (!state.investimentos) state.investimentos = [];

    const item = {
      id: id || ('inv_' + Date.now()),
      ativo,
      corretora: corretora || 'Corretora',
      categoria,
      titular,
      valorAtual,
      vencimento: vencimento || 'Longo Prazo',
      rentabilidadeContratada: rentabilidadeContratada || 'Renda Fixa / CDI',
      status,
      quantidade,
      precoMedio
    };

    if (id) {
      const idx = state.investimentos.findIndex(it => it.id === id);
      if (idx >= 0) state.investimentos[idx] = item;
      else state.investimentos.push(item);
    } else {
      state.investimentos.push(item);
    }

    MatrixDB.saveState(state);
    closeModal('investModalBackdrop');
    renderInvestments();
    alert(`Ativo "${ativo}" salvo com sucesso!`);
  }

  function openAporteModal(id) {
    const state = MatrixDB.getState();
    const inv = (state.investimentos || []).find(it => it.id === id);
    if (!inv) return;

    document.getElementById('invAporteModalTitle').textContent = `Novo Aporte em ${inv.ativo}`;
    document.getElementById('invAporteAtivoId').value = inv.id;
    document.getElementById('invAporteAtivoNome').textContent = `${inv.ativo} (${inv.corretora} • ${inv.titular})`;
    document.getElementById('invAporteSaldoAtual').textContent = formatBRL(inv.valorAtual);
    document.getElementById('invOperacaoTipo').value = 'aporte';
    document.getElementById('invOperacaoValorRow').style.display = 'block';
    document.getElementById('invOperacaoValor').value = '';
    document.getElementById('invOperacaoMes').value = `${currentMonth}/${currentYear}`;
    document.getElementById('invOperacaoObs').value = 'Aporte mensal planejado';

    const backdrop = document.getElementById('investAporteModalBackdrop');
    openModal(backdrop);
  }

  function openResgateModal(id) {
    const state = MatrixDB.getState();
    const inv = (state.investimentos || []).find(it => it.id === id);
    if (!inv) return;

    document.getElementById('invAporteModalTitle').textContent = `Resgatar / Liquidar ${inv.ativo}`;
    document.getElementById('invAporteAtivoId').value = inv.id;
    document.getElementById('invAporteAtivoNome').textContent = `${inv.ativo} (${inv.corretora} • ${inv.titular})`;
    document.getElementById('invAporteSaldoAtual').textContent = formatBRL(inv.valorAtual);
    document.getElementById('invOperacaoTipo').value = 'resgate';
    document.getElementById('invOperacaoValorRow').style.display = 'block';
    document.getElementById('invOperacaoValor').value = '';
    document.getElementById('invOperacaoMes').value = `${currentMonth}/${currentYear}`;
    document.getElementById('invOperacaoObs').value = 'Resgate parcial de investimento';

    const backdrop = document.getElementById('investAporteModalBackdrop');
    openModal(backdrop);
  }

  function onChangeOperacaoTipo(tipo) {
    const valRow = document.getElementById('invOperacaoValorRow');
    if (!valRow) return;
    if (tipo === 'liquidacao') {
      valRow.style.display = 'none';
    } else {
      valRow.style.display = 'block';
    }
  }

  function confirmarOperacaoInvestimento() {
    const id = document.getElementById('invAporteAtivoId').value;
    const tipo = document.getElementById('invOperacaoTipo').value;
    const valor = parseFloat(document.getElementById('invOperacaoValor').value) || 0;
    const mes = document.getElementById('invOperacaoMes').value.trim();
    const obs = document.getElementById('invOperacaoObs').value.trim();

    const state = MatrixDB.getState();
    const inv = (state.investimentos || []).find(it => it.id === id);
    if (!inv) return;

    if (tipo === 'aporte') {
      if (valor <= 0) {
        alert('Informe um valor válido de aporte maior que zero.');
        return;
      }
      inv.valorAtual = (parseFloat(inv.valorAtual) || 0) + valor;
      inv.status = 'Ativo (Aporte recente)';
      alert(`✅ Aporte de ${formatBRL(valor)} adicionado a ${inv.ativo}! Nova posição: ${formatBRL(inv.valorAtual)}.`);
    } else if (tipo === 'resgate') {
      if (valor <= 0 || valor > inv.valorAtual) {
        alert(`Informe um valor de resgate válido (até ${formatBRL(inv.valorAtual)}).`);
        return;
      }
      inv.valorAtual = Math.max(0, (parseFloat(inv.valorAtual) || 0) - valor);
      alert(`💸 Resgate de ${formatBRL(valor)} efetuado em ${inv.ativo}. Saldo restante: ${formatBRL(inv.valorAtual)}.`);
    } else if (tipo === 'liquidacao') {
      const confirmacao = confirm(`Deseja realmente LIQUIDAR TOTALMENTE a posição de ${formatBRL(inv.valorAtual)} em ${inv.ativo}?`);
      if (!confirmacao) return;
      inv.valorAtual = 0;
      inv.status = 'Liquidado / Encerrado';
      alert(`🛑 Investimento ${inv.ativo} liquidado com sucesso!`);
    }

    MatrixDB.saveState(state);
    closeModal('investAporteModalBackdrop');
    renderInvestments();
  }

  function openAtualizarCotacaoModal(id) {
    const state = MatrixDB.getState();
    const inv = (state.investimentos || []).find(it => it.id === id);
    if (!inv) return;

    document.getElementById('invCotacaoAtivoId').value = inv.id;
    document.getElementById('invCotacaoTicker').textContent = inv.ativo;
    document.getElementById('invCotacaoQtd').textContent = inv.quantidade || 0;
    document.getElementById('invCotacaoPM').textContent = formatBRL(inv.precoMedio || 0);
    const pAtual = inv.precoAtual || (inv.quantidade > 0 ? (inv.valorAtual / inv.quantidade) : inv.precoMedio);
    document.getElementById('invCotacaoNovoPreco').value = (parseFloat(pAtual) || 0).toFixed(2);

    const backdrop = document.getElementById('investCotacaoModalBackdrop');
    openModal(backdrop);
  }

  function salvarCotacaoAcaoModal() {
    const id = document.getElementById('invCotacaoAtivoId').value;
    const novoPreco = parseFloat(document.getElementById('invCotacaoNovoPreco').value) || 0;
    if (novoPreco <= 0) {
      alert('Informe um preço de fechamento válido.');
      return;
    }

    const state = MatrixDB.getState();
    const inv = (state.investimentos || []).find(it => it.id === id);
    if (!inv) return;

    inv.precoAtual = novoPreco;
    const qtd = parseFloat(inv.quantidade) || 0;
    inv.valorAtual = qtd > 0 ? (qtd * novoPreco) : inv.valorAtual;

    MatrixDB.saveState(state);
    closeModal('investCotacaoModalBackdrop');
    renderInvestments();
    alert(`Cotação de ${inv.ativo} atualizada para ${formatBRL(novoPreco)}! Posição atualizada para ${formatBRL(inv.valorAtual)}.`);
  }

  function excluirInvestimento(id) {
    const state = MatrixDB.getState();
    if (!state.investimentos) return;
    const idx = state.investimentos.findIndex(it => it.id === id);
    if (idx >= 0) {
      const nome = state.investimentos[idx].ativo;
      if (confirm(`Deseja realmente excluir "${nome}" do seu portfólio?`)) {
        state.investimentos.splice(idx, 1);
        MatrixDB.saveState(state);
        renderInvestments();
      }
    }
  }

  // ==========================================
  // 7. BACKUP & CONEXÕES NUVEM
  // ==========================================
  function renderBackup() {
    const cfg = SyncEngine.getConfig();
    const urlInput = document.getElementById('cfgCloudUrl');
    const tokenInput = document.getElementById('cfgCloudToken');
    if (urlInput) urlInput.value = cfg.cloudUrl;
    if (tokenInput) tokenInput.value = cfg.cloudToken;

    const lastSyncEl = document.getElementById('lastSyncLabel');
    if (lastSyncEl) {
      lastSyncEl.textContent = cfg.lastSync ? new Date(cfg.lastSync).toLocaleString('pt-BR') : 'Nunca sincronizado';
    }

    renderSatellitesUI();
  }

  function renderSatellitesUI() {
    const satCfg = SatelliteConnectors.getSatelliteConfig();
    if (document.getElementById('cfgFisioUrl')) document.getElementById('cfgFisioUrl').value = satCfg.fisioUrl || '';
    if (document.getElementById('cfgFisioToken')) document.getElementById('cfgFisioToken').value = satCfg.fisioToken || '';
    if (document.getElementById('cfgFaturasUrl')) document.getElementById('cfgFaturasUrl').value = satCfg.faturasUrl || '';
    if (document.getElementById('cfgFaturasToken')) document.getElementById('cfgFaturasToken').value = satCfg.faturasToken || '';
    if (document.getElementById('cfgMaracajuUrl')) document.getElementById('cfgMaracajuUrl').value = satCfg.maracajuUrl || '';
    if (document.getElementById('cfgMaracajuToken')) document.getElementById('cfgMaracajuToken').value = satCfg.maracajuToken || '';
    if (document.getElementById('chkAutoScrapeOnOpen')) document.getElementById('chkAutoScrapeOnOpen').checked = satCfg.autoScrapeOnOpen;

    const state = MatrixDB.getState();
    const sat = state.satellites || {};

    // 1. FisioFlow (Scarlet)
    const fisioBadge = document.getElementById('badgeFisioStatus');
    const fisioAtivo = !!(satCfg.fisioUrl && satCfg.fisioUrl.trim()) || !!sat.fisioflow;
    if (fisioBadge) {
      fisioBadge.className = fisioAtivo ? 'status-badge pago' : 'status-badge pendente';
      fisioBadge.textContent = fisioAtivo ? 'ATIVO' : 'PENDENTE';
    }
    if (sat.fisioflow) {
      if (document.getElementById('satFisioMesAtual')) document.getElementById('satFisioMesAtual').textContent = formatBRL(sat.fisioflow.mesAtualTotal);
      if (document.getElementById('satFisioPrevisao')) document.getElementById('satFisioPrevisao').textContent = formatBRL(sat.fisioflow.ganhoPossivelMes || sat.fisioflow.capacidadeMensalRecorrente || sat.fisioflow.projecaoMensalRecorrente || 4400.00);
    }

    // 2. Faturas (Nubank Black)
    const faturasBadge = document.getElementById('badgeFaturasStatus');
    const faturasAtivo = true;
    if (faturasBadge) {
      faturasBadge.className = 'status-badge pago';
      faturasBadge.textContent = 'ATIVO';
    }
    const satFaturasObj = sat.faturas || (typeof SatelliteConnectors !== 'undefined' && SatelliteConnectors.getBaselineFaturasData ? SatelliteConnectors.getBaselineFaturasData() : null);
    if (satFaturasObj) {
      const fatAtual = satFaturasObj.faturaAtualReal ?? satFaturasObj.faturaAtualValor ?? 4883.05;
      const fatFutura = satFaturasObj.faturasFuturasCompromissadas ?? satFaturasObj.faturasFuturasTotal ?? 1568.05;
      if (document.getElementById('satFaturaAtual')) document.getElementById('satFaturaAtual').textContent = formatBRL(fatAtual);
      if (document.getElementById('satFaturasFuturas')) document.getElementById('satFaturasFuturas').textContent = formatBRL(fatFutura);
    }

    // 3. Casa Maracaju 88
    const maracajuBadge = document.getElementById('badgeMaracajuStatus');
    const maracajuAtivo = !!(satCfg.maracajuUrl && satCfg.maracajuUrl.trim()) || !!sat.maracaju;
    if (maracajuBadge) {
      maracajuBadge.className = maracajuAtivo ? 'status-badge pago' : 'status-badge pendente';
      maracajuBadge.textContent = maracajuAtivo ? 'ATIVO' : 'PENDENTE';
    }
    if (sat.maracaju) {
      if (document.getElementById('satMaracajuMercado')) document.getElementById('satMaracajuMercado').textContent = formatBRL(sat.maracaju.gastoMercadoMesAtual);
      if (document.getElementById('satMaracajuSaldoVa')) {
        document.getElementById('satMaracajuSaldoVa').textContent = formatBRL(sat.maracaju.saldoVaRestante);
        document.getElementById('satMaracajuSaldoVa').style.color = sat.maracaju.transbordouVa > 0 ? 'var(--rose)' : 'var(--matrix-green)';
      }
      if (document.getElementById('satMaracajuGastoVr')) document.getElementById('satMaracajuGastoVr').textContent = formatBRL(sat.maracaju.gastoVrMesAtual || 0);
      if (document.getElementById('satMaracajuSaldoVr')) {
        document.getElementById('satMaracajuSaldoVr').textContent = formatBRL(sat.maracaju.saldoVrRestante || 0);
        document.getElementById('satMaracajuSaldoVr').style.color = (sat.maracaju.transbordouVr || 0) > 0 ? 'var(--rose)' : 'var(--cyan)';
      }
    }
  }

  function salvarConfigSatellites() {
    const cfg = {
      fisioUrl: (document.getElementById('cfgFisioUrl').value || '').trim(),
      fisioToken: (document.getElementById('cfgFisioToken').value || '').trim(),
      faturasUrl: (document.getElementById('cfgFaturasUrl').value || '').trim(),
      faturasToken: (document.getElementById('cfgFaturasToken').value || '').trim(),
      maracajuUrl: (document.getElementById('cfgMaracajuUrl').value || '').trim(),
      maracajuToken: (document.getElementById('cfgMaracajuToken').value || '').trim(),
      autoScrapeOnOpen: document.getElementById('chkAutoScrapeOnOpen').checked
    };
    SatelliteConnectors.saveSatelliteConfig(cfg);
    renderSatellitesUI();
    alert('Configurações dos 3 apps salvas com sucesso! Os conectores vinculados agora estão com status ATIVO.');
  }

  async function executarScrapingSatellites(silent = false) {
    if (!silent) {
      const btn = event && event.target;
      if (btn) btn.textContent = '⏳ Coletando dados...';
    }

    try {
      const results = await SatelliteConnectors.scrapeAll();
      renderSatellitesUI();
      renderAll();
      if (!silent) {
        alert('Scraping concluído com sucesso nos apps configurados!');
      }
    } catch (e) {
      if (!silent) alert('Erro no scraping: ' + e.message);
    } finally {
      if (!silent) {
        const btn = document.querySelector('[onclick*="executarScrapingSatellites"]');
        if (btn) btn.textContent = '🔄 Fazer Scraping dos 3 Apps Agora';
      }
    }
  }

  // ==========================================
  // INTERAÇÕES & MÉTODOS PÚBLICOS
  // ==========================================
  function togglePaid(ano, mes, tipo, id) {
    const month = MatrixDB.getMonth(ano, mes);
    const list = tipo === 'fixo' ? month.fixos : month.outros;
    const item = (list || []).find(it => it.id === id || it.nome === id);
    if (item) {
      item.pago = !item.pago;
      MatrixDB.saveMonth(ano, mes, month);
      renderAll();
    }
  }

  function togglePaidByIndex(ano, mes, tipo, index) {
    MatrixDB.togglePaidByIndex(ano, mes, tipo, index);
    renderAll();
  }

  function removeItem(ano, mes, tipo, id) {
    if (confirm(`Remover este item do mês de ${mes}?`)) {
      MatrixDB.removeTransaction(ano, mes, tipo, id);
      renderAll();
    }
  }

  function removeItemByIndex(ano, mes, tipo, index) {
    const month = MatrixDB.getMonth(ano, mes);
    const list = tipo === 'fixo' ? month.fixos : (tipo === 'receita' ? month.receitas : month.outros);
    const item = list && list[index];
    if (item && isFaturasItem(item)) {
      alertFaturasReadOnly();
      return;
    }
    const tipoLabel = tipo === 'receita' ? 'a receita' : 'o lançamento';
    const itemDesc = item ? `"${item.nome}" (${formatBRL(item.valor)})` : 'este item';
    if (confirm(`Deseja realmente excluir ${tipoLabel} ${itemDesc} do mês de ${mes}/${ano}?`)) {
      // Se este item estava vinculado a um investimento, estorna o saldo anterior na carteira
      if (item && item.investLinkedId) {
        const state = MatrixDB.getState();
        const target = (state.investimentos || []).find(i => i.id === item.investLinkedId);
        if (target) {
          const val = parseFloat(item.investLinkedVal != null ? item.investLinkedVal : item.valor) || 0;
          if (item.investLinkedOp === 'resgate') {
            target.valorAtual = (parseFloat(target.valorAtual) || 0) + val;
          } else {
            target.valorAtual = Math.max(0, (parseFloat(target.valorAtual) || 0) - val);
          }
          MatrixDB.saveState(state);
        }
      }
      MatrixDB.removeTransactionByIndex(ano, mes, tipo, index);
      renderAll();
    }
  }

  function getSelectedInvestModo() {
    if (document.getElementById('modalInvestModoExistente')?.checked) return 'existente';
    if (document.getElementById('modalInvestModoNovo')?.checked) return 'novo';
    return 'nenhum';
  }

  function onModalInvestModoChange(modo) {
    const opRow = document.getElementById('modalInvestOpRow');
    const existFields = document.getElementById('modalInvestExistenteFields');
    const novoFields = document.getElementById('modalInvestNovoFields');

    if (modo === 'existente') {
      if (opRow) opRow.style.display = 'block';
      if (existFields) existFields.style.display = 'block';
      if (novoFields) novoFields.style.display = 'none';
      populateModalInvestAtivos();
    } else if (modo === 'novo') {
      if (opRow) opRow.style.display = 'block';
      if (existFields) existFields.style.display = 'none';
      if (novoFields) novoFields.style.display = 'block';
    } else {
      if (opRow) opRow.style.display = 'none';
      if (existFields) existFields.style.display = 'none';
      if (novoFields) novoFields.style.display = 'none';
    }
    updateModalInvestPreview();
  }

  function toggleModalInvestSubFields(checked) {
    const modo = checked ? 'existente' : 'nenhum';
    const rEx = document.getElementById('modalInvestModoExistente');
    const rNen = document.getElementById('modalInvestModoNenhum');
    if (checked && rEx) rEx.checked = true;
    else if (!checked && rNen) rNen.checked = true;
    onModalInvestModoChange(modo);
  }

  function populateModalInvestAtivos(selectedId = null) {
    const state = MatrixDB.getState();
    const invs = state.investimentos || [];
    const select = document.getElementById('modalInvestAtivoSelect');
    if (!select) return;

    if (invs.length === 0) {
      select.innerHTML = '<option value="">Nenhum investimento cadastrado na carteira</option>';
      updateModalInvestPreview();
      return;
    }

    // Ordena os investimentos por titular e depois pelo nome do ativo
    const sorted = [...invs].sort((a, b) => {
      const titA = a.titular || 'Matheus';
      const titB = b.titular || 'Matheus';
      if (titA !== titB) return titA.localeCompare(titB);
      return (a.ativo || '').localeCompare(b.ativo || '');
    });

    select.innerHTML = sorted.map(inv => {
      const tit = inv.titular === 'Scarlet' ? '🩺 Scarlet' : '👤 Matheus';
      const corr = inv.corretora ? ` • ${inv.corretora}` : '';
      const saldo = formatBRL(parseFloat(inv.valorAtual) || 0);
      const isSel = (selectedId && inv.id === selectedId);
      return `<option value="${inv.id}" ${isSel ? 'selected' : ''}>${inv.ativo}${corr} [${tit}] (Saldo Atual: ${saldo})</option>`;
    }).join('');

    if (selectedId) {
      select.value = selectedId;
    }

    updateModalInvestPreview();
  }

  function updateModalInvestPreview() {
    const previewBox = document.getElementById('modalInvestPreviewBox');
    if (!previewBox) return;

    const modo = getSelectedInvestModo();
    if (modo !== 'existente') {
      previewBox.innerHTML = '';
      return;
    }

    const state = MatrixDB.getState();
    const invs = state.investimentos || [];
    const select = document.getElementById('modalInvestAtivoSelect');
    const targetId = select ? select.value : '';
    const asset = invs.find(i => i.id === targetId);

    if (!asset) {
      previewBox.innerHTML = '';
      return;
    }

    const valorInput = parseFloat(document.getElementById('modalItemValor')?.value) || 0;
    const isAporte = document.getElementById('modalInvestOpAporte')?.checked !== false;
    const saldoAtual = parseFloat(asset.valorAtual) || 0;
    const novoSaldo = isAporte ? (saldoAtual + valorInput) : Math.max(0, saldoAtual - valorInput);

    previewBox.innerHTML = `
      <div style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.25);padding:6px 10px;border-radius:4px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">
        <span><strong>${asset.ativo}</strong> (${asset.corretora || 'Corretora'}) • <em>${asset.titular || 'Matheus'}</em></span>
        <span>Saldo: <strong>${formatBRL(saldoAtual)}</strong> ➔ <strong style="color:${isAporte ? 'var(--matrix-green)' : 'var(--amber)'};">${isAporte ? '+' : '-'}${formatBRL(valorInput)} ➔ Novo: ${formatBRL(novoSaldo)}</strong></span>
      </div>
    `;
  }

  function onModalContaChange(val) {
    if (val === 'resgate_tesouro_reserva' || val === 'resgate_outro') {
      const rEx = document.getElementById('modalInvestModoExistente');
      const opRes = document.getElementById('modalInvestOpResgate');
      if (rEx) rEx.checked = true;
      if (opRes) opRes.checked = true;
      onModalInvestModoChange('existente');
      if (val === 'resgate_tesouro_reserva') {
        const state = MatrixDB.getState();
        const res = (state.investimentos || []).find(i => (i.ativo || '').toLowerCase().includes('reserva'));
        if (res) populateModalInvestAtivos(res.id);
      }
    } else if (val === 'investimento_aporte') {
      const rEx = document.getElementById('modalInvestModoExistente');
      const opAp = document.getElementById('modalInvestOpAporte');
      if (rEx) rEx.checked = true;
      if (opAp) opAp.checked = true;
      onModalInvestModoChange('existente');
    }
  }

  function onModalRendaChange(val) {
    if (val === 'investimento_resgate') {
      const rEx = document.getElementById('modalInvestModoExistente');
      const opRes = document.getElementById('modalInvestOpResgate');
      if (rEx) rEx.checked = true;
      if (opRes) opRes.checked = true;
      onModalInvestModoChange('existente');
      const state = MatrixDB.getState();
      const res = (state.investimentos || []).find(i => (i.ativo || '').toLowerCase().includes('reserva'));
      if (res) populateModalInvestAtivos(res.id);
    }
  }

  function onModalTitularChange(val) {
    const rendaSelect = document.getElementById('modalItemRenda');
    const catSelect = document.getElementById('modalItemCategoria');
    const nomeInput = document.getElementById('modalItemNome');
    if (val === 'scarlet') {
      if (rendaSelect) rendaSelect.value = 'ganhos_scarlet';
      if (catSelect && (catSelect.value === 'Habitação' || catSelect.value === 'Salário' || catSelect.value === 'Outros')) {
        catSelect.value = 'Psicóloga & Terapias';
      }
      if (nomeInput && !nomeInput.value) {
        nomeInput.placeholder = 'Ex: Psicóloga da Scarlet, Aporte Renda+ 2055, Unimed...';
      }
    } else {
      if (rendaSelect && (rendaSelect.value === 'ganhos_scarlet' || rendaSelect.value === 'outras_rendas_scarlet')) {
        rendaSelect.value = 'salario_usp';
      }
    }
  }

  function openNewItemModal(tipo, titular = 'matheus') {
    document.getElementById('modalItemTipo').value = tipo;
    document.getElementById('modalItemEditId').value = '';
    document.getElementById('modalItemNome').value = '';
    document.getElementById('modalItemValor').value = '';

    const titularSelect = document.getElementById('modalItemTitular');
    if (titularSelect) titularSelect.value = titular;

    const rNen = document.getElementById('modalInvestModoNenhum');
    if (rNen) rNen.checked = true;
    onModalInvestModoChange('nenhum');
    populateModalInvestAtivos();

    if (document.getElementById('modalItemStatusPendente')) document.getElementById('modalItemStatusPendente').checked = true;
    if (document.getElementById('modalItemStatusPago')) document.getElementById('modalItemStatusPago').checked = false;

    const titleEl = document.getElementById('modalItemTitle');
    const nomeLabel = document.getElementById('modalItemNomeLabel');
    const nomeInput = document.getElementById('modalItemNome');
    const catSelect = document.getElementById('modalItemCategoria');
    const rendaSelect = document.getElementById('modalItemRenda');

    const optEst = document.getElementById('catOptionEstudio');
    if (optEst) optEst.textContent = getNomeEstudio() === 'Renda Extra' ? 'Renda Extra' : getNomeEstudio();

    const empSec = document.getElementById('modalEmprestimoSection');
    if (empSec) empSec.style.display = 'none';

    if (titular === 'scarlet' && tipo === 'receita') {
      if (titleEl) titleEl.textContent = '+ Nova Renda / Receita da Scarlet';
      if (nomeLabel) nomeLabel.textContent = 'Descrição da Renda da Scarlet:';
      if (nomeInput) nomeInput.placeholder = 'Ex: Atendimentos FisioFlow, Consultoria, Aulas, Trabalhos prestados...';
      if (catSelect) catSelect.value = 'Outras Rendas Scarlet';
      if (rendaSelect) rendaSelect.value = 'outras_rendas_scarlet';
    } else if (titular === 'scarlet') {
      if (titleEl) titleEl.textContent = '+ Novo Gasto Scarlet (Psicóloga, Investimentos...)';
      if (nomeLabel) nomeLabel.textContent = 'Descrição do Gasto da Scarlet:';
      if (nomeInput) nomeInput.placeholder = 'Ex: Psicóloga da Scarlet, Aporte Renda+ 2055, Cursos...';
      if (catSelect) catSelect.value = 'Psicóloga & Terapias';
      if (rendaSelect) rendaSelect.value = 'ganhos_scarlet';
    } else if (tipo === 'receita') {
      if (titleEl) titleEl.textContent = '+ Nova Receita';
      if (nomeLabel) nomeLabel.textContent = 'Descrição:';
      if (nomeInput) nomeInput.placeholder = 'Ex: Salário, 13º Salário, Renda Extra, Empréstimo, Fisio Scarlet...';
      if (catSelect) catSelect.value = 'Salário';
      if (rendaSelect) rendaSelect.value = 'salario_usp';
    } else if (tipo === 'fixo') {
      if (titleEl) titleEl.textContent = '+ Novo Gasto Fixo';
      if (nomeLabel) nomeLabel.textContent = 'Descrição:';
      if (nomeInput) nomeInput.placeholder = 'Ex: Parcela Caixa, Água, Luz, Internet...';
      if (catSelect) catSelect.value = 'Habitação';
      if (rendaSelect) rendaSelect.value = 'salario_usp';
    } else {
      if (titleEl) titleEl.textContent = '+ Novo Gasto Variável';
      if (nomeLabel) nomeLabel.textContent = 'Descrição:';
      if (nomeInput) nomeInput.placeholder = 'Ex: Mercado, Farmácia, Lazer...';
      if (catSelect) catSelect.value = 'Outros';
      if (rendaSelect) rendaSelect.value = 'salario_usp';
    }

    const miHint = document.getElementById('modalItemCatHint');
    if (miHint) miHint.style.display = 'none';

    openModal('itemModalBackdrop');
  }

  function editItemModal(ano, mes, tipo, id, nome, valor) {
    document.getElementById('modalItemTipo').value = tipo;
    document.getElementById('modalItemEditId').value = id;
    document.getElementById('modalItemNome').value = nome;
    document.getElementById('modalItemValor').value = valor;
    document.getElementById('modalItemTitle').textContent = 'Editar Lançamento';
    openModal('itemModalBackdrop');
  }

  function editItemByIndex(ano, mes, tipo, index) {
    const month = MatrixDB.getMonth(ano, mes);
    const list = tipo === 'fixo' ? month.fixos : (tipo === 'receita' ? month.receitas : month.outros);
    const item = list && list[index];
    if (!item) return;

    if (isFaturasItem(item)) {
      alertFaturasReadOnly();
      return;
    }

    document.getElementById('modalItemTipo').value = tipo;
    document.getElementById('modalItemEditId').value = `idx_${index}`;
    document.getElementById('modalItemNome').value = item.nome || '';
    document.getElementById('modalItemValor').value = item.valor != null ? item.valor : '';

    const titularSelect = document.getElementById('modalItemTitular');
    if (titularSelect) {
      titularSelect.value = isGastoDaScarlet(item) ? 'scarlet' : 'matheus';
    }

    const catSelect = document.getElementById('modalItemCategoria');
    if (catSelect) {
      if (item.categoria) catSelect.value = item.categoria;
      if (!catSelect.value) {
        const c = (item.categoria || '').toLowerCase();
        const n = (item.nome || '').toLowerCase();
        if (c.includes('salário') || c.includes('salario')) catSelect.value = 'Salário';
        else if (tipo === 'receita' && (c.includes('scarlet') || c.includes('fisio'))) catSelect.value = 'Fisio Scarlet';
        else if (tipo !== 'receita' && (c.includes('scarlet') || n.trim() === 'scarlet' || n.includes('nubank'))) catSelect.value = 'Cartão';
        else if (c.includes('benefício') || c.includes('beneficio')) catSelect.value = 'Benefícios';
        else if (c.includes('estúdio') || c.includes('extra')) catSelect.value = 'Renda Extra';
        else if (c.includes('empréstimo') || c.includes('emprestimo')) catSelect.value = 'Empréstimo';
        else if (c.includes('aporte') || c.includes('invest')) catSelect.value = 'Investimentos';
        else if (c.includes('cartão') || c.includes('cartao')) catSelect.value = 'Cartão';
        else catSelect.value = 'Outros';
      }
    }

    const contaSelect = document.getElementById('modalItemConta');
    if (contaSelect && item.conta) contaSelect.value = item.conta;

    const rendaSelect = document.getElementById('modalItemRenda');
    if (rendaSelect) {
      if (item.renda && item.renda !== 'orcamento_geral' && item.renda !== 'estudio_extra') {
        rendaSelect.value = item.renda;
      } else if (item.conta) {
        const c = String(item.conta).toLowerCase();
        if (c.includes('emprestimo')) rendaSelect.value = 'emprestimo';
        else if (c === 'cartao_va' || c === 'va') rendaSelect.value = 'va_mercado';
        else if (c === 'cartao_vr' || c === 'vr') rendaSelect.value = 'vr_almoco';
        else if (c.includes('scarlet') || c.includes('fisio')) rendaSelect.value = 'ganhos_scarlet';
        else if (c.includes('resgate')) rendaSelect.value = 'investimento_resgate';
        else if (c.includes('salario') || c === 'salario_bb' || c === 'bb') rendaSelect.value = 'salario_usp';
        else rendaSelect.value = isGastoDaScarlet(item) ? 'ganhos_scarlet' : 'salario_usp';
      } else {
        rendaSelect.value = isGastoDaScarlet(item) ? 'ganhos_scarlet' : 'salario_usp';
      }
    }

    // Status Pago / Pendente via radio buttons
    const isPago = !!item.pago;
    if (document.getElementById('modalItemStatusPago')) document.getElementById('modalItemStatusPago').checked = isPago;
    if (document.getElementById('modalItemStatusPendente')) document.getElementById('modalItemStatusPendente').checked = !isPago;

    // Vínculo explícito e transparente com investimentos
    if (item.investLinkedId) {
      const rEx = document.getElementById('modalInvestModoExistente');
      if (rEx) rEx.checked = true;
      if (item.investLinkedOp === 'resgate') {
        const opRes = document.getElementById('modalInvestOpResgate');
        if (opRes) opRes.checked = true;
      } else {
        const opAp = document.getElementById('modalInvestOpAporte');
        if (opAp) opAp.checked = true;
      }
      onModalInvestModoChange('existente');
      populateModalInvestAtivos(item.investLinkedId);
    } else {
      const rNen = document.getElementById('modalInvestModoNenhum');
      if (rNen) rNen.checked = true;
      onModalInvestModoChange('nenhum');
      populateModalInvestAtivos();
    }

    const titleEl = document.getElementById('modalItemTitle');
    const nomeLabel = document.getElementById('modalItemNomeLabel');

    if (tipo === 'receita') {
      if (titleEl) titleEl.textContent = `Editar Receita: ${item.nome}`;
      if (nomeLabel) nomeLabel.textContent = 'Descrição da Receita:';
    } else {
      if (titleEl) titleEl.textContent = `Editar Despesa: ${item.nome}`;
      if (nomeLabel) nomeLabel.textContent = 'Descrição da Despesa:';
    }

    openModal('itemModalBackdrop');
  }

  function saveItemFromModal() {
    const tipo = document.getElementById('modalItemTipo').value;
    const editId = document.getElementById('modalItemEditId').value;
    const nome = document.getElementById('modalItemNome').value.trim();
    const valor = parseFloat(document.getElementById('modalItemValor').value) || 0;
    const cat = document.getElementById('modalItemCategoria').value;
    const renda = document.getElementById('modalItemRenda') ? document.getElementById('modalItemRenda').value : 'salario_usp';
    let conta = 'salario_bb';
    if (renda === 'emprestimo') conta = 'emprestimo_familiar';
    else if (renda === 'va_mercado') conta = 'cartao_va';
    else if (renda === 'vr_almoco') conta = 'cartao_vr';
    else if (renda === 'outras_rendas_scarlet' || cat === 'Outras Rendas Scarlet') conta = 'scarlet_extra';
    else if (renda === 'ganhos_scarlet' || cat === 'Fisio Scarlet') conta = 'scarlet_fisio';
    else if (renda === 'investimento_resgate') conta = 'resgate_tesouro_reserva';
    else if (renda === 'estudio_extra') conta = 'pix_inter';
    else if (renda === 'outros_ganhos') conta = 'outros';
    else conta = 'salario_bb';

    if (document.getElementById('modalItemConta')) {
      conta = document.getElementById('modalItemConta').value;
    }
    const pago = document.getElementById('modalItemStatusPago') ? document.getElementById('modalItemStatusPago').checked : false;

    if (!nome) {
      alert(tipo === 'receita' ? 'Informe a descrição da receita.' : 'Informe a descrição da despesa.');
      return;
    }

    // Grava e memoriza a classificação da categoria escolhida pelo usuário para este gasto
    MatrixDB.learnCategoryMapping(nome, cat);

    const titularSelect = document.getElementById('modalItemTitular');
    let titular = titularSelect ? titularSelect.value : (isGastoDaScarlet({ nome, categoria: cat, renda }) ? 'scarlet' : 'matheus');
    if (cat === 'Outras Rendas Scarlet' || renda === 'outras_rendas_scarlet' || cat === 'Fisio Scarlet' || renda === 'ganhos_scarlet' || cat === 'Investimentos Scarlet' || cat.includes('Psicóloga')) {
      titular = 'scarlet';
    }

    // Regra estrita: MEI é sempre pago pelo salário do Matheus
    const nLower = nome.toLowerCase().trim();
    if (nLower === 'mei' || nLower.startsWith('mei ') || nLower.includes('das mei')) {
      titular = 'matheus';
      if (conta.includes('scarlet')) conta = 'salario_bb';
      if (renda.includes('scarlet')) renda = 'salario_usp';
      if (cat === 'Fisio Scarlet') cat = 'Contas';
    }

    const payload = { nome, valor, categoria: cat, conta, renda, pago, titular };
    if (titular === 'scarlet') {
      if (tipo === 'receita') {
        if (payload.renda !== 'outras_rendas_scarlet') payload.renda = 'ganhos_scarlet';
      } else {
        if (!payload.renda || payload.renda === 'salario_usp') payload.renda = 'ganhos_scarlet';
        if (!payload.conta || payload.conta === 'salario_bb') payload.conta = 'scarlet_fisio';
      }
    }

    // Recupera o item original caso seja edição
    let itemOriginal = null;
    const curMonthData = MatrixDB.getMonth(currentYear, currentMonth);
    const curList = tipo === 'fixo' ? curMonthData?.fixos : (tipo === 'receita' ? curMonthData?.receitas : curMonthData?.outros);
    if (editId && editId.startsWith('idx_')) {
      const idx = parseInt(editId.replace('idx_', ''), 10);
      itemOriginal = curList && curList[idx];
    } else if (editId) {
      itemOriginal = curList && curList.find(it => it.id === editId);
    }

    // ========================================================
    // VÍNCULO TRANSPARENTE E SEGURO COM INVESTIMENTOS 360
    // ========================================================
    const investModo = getSelectedInvestModo(); // 'nenhum' | 'existente' | 'novo'
    const investOp = (document.getElementById('modalInvestOpResgate')?.checked) ? 'resgate' : 'aporte';

    const state = MatrixDB.getState();
    if (!state.investimentos) state.investimentos = [];

    // Se este item já possuía um vínculo anterior (edição), estorna o saldo anterior primeiro
    if (itemOriginal && itemOriginal.investLinkedId) {
      const prevAsset = state.investimentos.find(i => i.id === itemOriginal.investLinkedId);
      if (prevAsset) {
        const prevVal = parseFloat(itemOriginal.investLinkedVal != null ? itemOriginal.investLinkedVal : itemOriginal.valor) || 0;
        if (itemOriginal.investLinkedOp === 'resgate') {
          prevAsset.valorAtual = (parseFloat(prevAsset.valorAtual) || 0) + prevVal;
        } else {
          prevAsset.valorAtual = Math.max(0, (parseFloat(prevAsset.valorAtual) || 0) - prevVal);
        }
      }
    }

    if (investModo === 'existente' && valor > 0) {
      const targetId = document.getElementById('modalInvestAtivoSelect')?.value;
      const targetAsset = state.investimentos.find(i => i.id === targetId);
      if (targetAsset) {
        if (investOp === 'aporte') {
          targetAsset.valorAtual = (parseFloat(targetAsset.valorAtual) || 0) + valor;
          targetAsset.status = `Ativo (Aporte de ${formatBRL(valor)} em ${currentMonth}/${currentYear})`;
        } else {
          targetAsset.valorAtual = Math.max(0, (parseFloat(targetAsset.valorAtual) || 0) - valor);
          targetAsset.status = targetAsset.valorAtual === 0 ? `Liquidado em ${currentMonth}/${currentYear}` : `Ativo (Resgate de ${formatBRL(valor)} em ${currentMonth}/${currentYear})`;
        }
        payload.investLinkedId = targetAsset.id;
        payload.investLinkedOp = investOp;
        payload.investLinkedVal = valor;
      }
    } else if (investModo === 'novo' && valor > 0) {
      const novoNome = (document.getElementById('modalInvestNovoNome')?.value || '').trim();
      if (!novoNome) {
        alert('Por favor, informe o nome do novo investimento a ser criado na carteira.');
        return;
      }
      const novoCorretora = document.getElementById('modalInvestNovoCorretora')?.value || 'XP Investimentos';
      const novoCategoria = document.getElementById('modalInvestNovoCategoria')?.value || 'Renda Fixa / Tesouro';
      const novoTitular = document.getElementById('modalInvestNovoTitular')?.value || 'Matheus';

      const newId = 'inv_' + Date.now();
      const initialVal = investOp === 'aporte' ? valor : 0;
      const newAsset = {
        id: newId,
        ativo: novoNome,
        corretora: novoCorretora,
        categoria: novoCategoria,
        titular: novoTitular,
        valorAtual: initialVal,
        status: `Ativo (Criado via lançamento em ${currentMonth}/${currentYear})`
      };
      state.investimentos.push(newAsset);

      payload.investLinkedId = newId;
      payload.investLinkedOp = investOp;
      payload.investLinkedVal = valor;
    } else {
      payload.investLinkedId = null;
      payload.investLinkedOp = null;
      payload.investLinkedVal = 0;
    }

    MatrixDB.saveState(state);

    if (editId && editId.startsWith('idx_')) {
      const idx = parseInt(editId.replace('idx_', ''), 10);
      MatrixDB.updateTransactionByIndex(currentYear, currentMonth, tipo, idx, payload);
    } else if (editId) {
      MatrixDB.updateTransaction(currentYear, currentMonth, tipo, editId, payload);
    } else {
      MatrixDB.addTransaction(currentYear, currentMonth, tipo, payload);
    }

    if (tipo === 'receita') {
      const curM = MatrixDB.getMonth(currentYear, currentMonth);
      if (curM) {
        if (isItemVR(payload)) {
          curM.vrManual = valor;
          if (!curM.totais) curM.totais = {};
          curM.totais['VR'] = valor;
          const st = MatrixDB.getState();
          if (st && st.satellites && st.satellites.maracaju) {
            st.satellites.maracaju.saldoVrRestante = valor;
            st.satellites.maracaju.vrTotal = Math.max(valor, st.satellites.maracaju.vrTotal || 1105.16);
            st.satellites.maracaju.manualOverride = true;
            MatrixDB.saveState(st, 'manual_vr_override', { skipCloudSync: true });
          }
        } else if (isItemVA(payload)) {
          curM.vaManual = valor;
          if (!curM.totais) curM.totais = {};
          curM.totais['VA'] = valor;
          const st = MatrixDB.getState();
          if (st && st.satellites && st.satellites.maracaju) {
            st.satellites.maracaju.saldoVaRestante = valor;
            st.satellites.maracaju.vaTotal = Math.max(valor, st.satellites.maracaju.vaTotal || 2059.84);
            st.satellites.maracaju.manualOverride = true;
            MatrixDB.saveState(st, 'manual_va_override', { skipCloudSync: true });
          }
        }
      }
    }

    // INTEGRAÇÃO DE EMPRÉSTIMO & AGENDAMENTO DE PARCELAS FUTURAS
    const isEmprestimo = (cat === 'Empréstimo') || (renda === 'emprestimo');
    const chkParcelasEmp = document.getElementById('chkGerarParcelasEmprestimo');
    const deveGerarParcelas = isEmprestimo && chkParcelasEmp && chkParcelasEmp.checked;

    if (deveGerarParcelas && (!editId || !editId.startsWith('idx_'))) {
      const numParc = parseInt(document.getElementById('modalEmprestimoNumParcelas').value, 10) || 12;
      let valParc = parseFloat(document.getElementById('modalEmprestimoValorParcela').value) || 0;
      if (valParc <= 0 && numParc > 0 && valor > 0) {
        valParc = Math.round((valor / numParc) * 100) / 100;
      }

      const modalidadeDesconto = document.getElementById('modalEmprestimoModalidade')?.value || 'consignado';
      const isConsignado = modalidadeDesconto === 'consignado';

      // Mês de início selecionado pelo usuário!
      const inicioSel = document.getElementById('modalEmprestimoInicioMes')?.value;
      let startY = parseInt(currentYear, 10);
      let startMIdx = MONTH_NAMES.indexOf(currentMonth) + 1; // Padrão: mês seguinte

      if (inicioSel && inicioSel.includes('-')) {
        const parts = inicioSel.split('-');
        startY = parseInt(parts[0], 10);
        startMIdx = parseInt(parts[1], 10) - 1;
      }

      if (valParc > 0 && numParc > 0) {
        for (let p = 1; p <= numParc; p++) {
          let targetMIdx = startMIdx + (p - 1);
          let targetY = startY + Math.floor(targetMIdx / 12);
          targetMIdx = targetMIdx % 12;
          const targetMes = MONTH_NAMES[targetMIdx];
          const targetAno = String(targetY);

          MatrixDB.addTransaction(targetAno, targetMes, 'fixo', {
            nome: isConsignado 
              ? `Consignado USP: ${nome} (${p}/${numParc})` 
              : `Parcela Empréstimo: ${nome} (${p}/${numParc})`,
            valor: valParc,
            categoria: isConsignado ? 'Empréstimo' : 'Contas',
            conta: isConsignado ? 'salario_bb' : 'debito_nubank',
            renda: 'salario_usp',
            consignadoFolha: isConsignado,
            tipoAmortizacao: isConsignado ? 'consignado_folha' : 'debito_conta',
            origemEmprestimo: nome,
            pago: false
          });
        }
      }
    }

    closeModal('itemModalBackdrop');
    renderAll();
  }

  

  function toggleEmprestimoParcelas(checked) {
    const fields = document.getElementById('modalEmprestimoParcelasFields');
    if (fields) fields.style.display = checked ? 'grid' : 'none';
  }

  // ==========================================
  // EDIÇÃO DE SALDOS, RENDAS E FATURAS (MODAL)
  // ==========================================
  let saldosModalTargetAno = null;
  let saldosModalTargetMes = null;

  function openEditSaldosModal(anoParam = null, mesParam = null, focusSection = null) {
    if (typeof anoParam === 'string' && (anoParam === 'scarlet' || anoParam === 'matheus' || anoParam === 'beneficios')) {
      focusSection = anoParam;
      anoParam = null;
      mesParam = null;
    }
    saldosModalTargetAno = (anoParam && String(anoParam).length === 4) ? String(anoParam) : currentYear;
    saldosModalTargetMes = (mesParam && MONTH_NAMES.includes(mesParam)) ? mesParam : currentMonth;

    const state = MatrixDB.getState();
    const monthData = MatrixDB.getMonth(saldosModalTargetAno, saldosModalTargetMes);

    const titleEl = document.getElementById('saldosModalPeriodo');
    if (titleEl) titleEl.textContent = `${saldosModalTargetMes} / ${saldosModalTargetAno}`;

    // 1. Salário Matheus
    const salMatheus = getSalarioLiquidoMes(saldosModalTargetAno, saldosModalTargetMes);

    // 2. Ganhos Scarlet (Atendimentos FisioFlow + Outras Rendas)
    const ganhosScarlet = getGanhosScarletMes(saldosModalTargetAno, saldosModalTargetMes);
    const outrasRendasScarlet = getOutrasRendasScarletMes(saldosModalTargetAno, saldosModalTargetMes);
    const descOutrasScarlet = getDescOutrasRendasScarletMes(saldosModalTargetAno, saldosModalTargetMes);

    // 3. VA (Fixo 2050.00) & VR (Calendário Matrix)
    const ben = getBeneficiosCreditoMes(saldosModalTargetAno, saldosModalTargetMes);
    let va = ben.va;
    let vr = ben.vr;

    // 4. Ganho Extra / Estúdio (exclusivamente do Matheus, sem somar Empréstimos nem rendas da Scarlet)
    const nomeEst = getNomeEstudio();
    let valExtra = 0;
    let contaExtra = 'salario_bb';
    (monthData.receitas || []).forEach(r => {
      if (!isReceitaExtraMatheus(r)) return;
      const n = (r.nome || '').toLowerCase();
      const c = (r.categoria || '').toLowerCase();
      if (c === 'empréstimo' || n.includes('empréstimo') || n.includes('emprestimo')) return;
      valExtra += (parseFloat(r.valor) || 0);
      if (r.conta) contaExtra = r.conta;
    });
    if (valExtra === 0 && monthData.totais) {
      valExtra = parseFloat(monthData.totais[nomeEst] || monthData.totais['Estúdio']) || 0;
    }

    // 5. Fatura Nubank
    const fatura = getFaturaNubankMes(saldosModalTargetAno, saldosModalTargetMes);

    // 6. Ajuste
    const ajuste = monthData.ajusteSaldo || 0;

    const setVal = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v != null ? v : '';
    };

    setVal('saldosSalMatheus', salMatheus);
    setVal('saldosGanhosScarlet', ganhosScarlet);
    setVal('saldosOutrasRendasScarlet', outrasRendasScarlet > 0 ? outrasRendasScarlet : '');
    setVal('saldosDescOutrasRendasScarlet', descOutrasScarlet || (saldosModalTargetAno === '2026' && saldosModalTargetMes === 'Novembro' ? 'Receitas da irmã' : 'Outras Rendas Scarlet'));
    setVal('saldosVa', va);
    setVal('saldosVr', vr);
    setVal('saldosNomeEstudio', (nomeEst && nomeEst !== 'Estúdio') ? nomeEst : 'Renda Extra');
    setVal('saldosValorEstudio', valExtra > 0 ? valExtra : '');
    setVal('saldosContaEstudio', contaExtra);
    setVal('saldosFaturaNubank', fatura);
    const chkFaturaPaga = document.getElementById('saldosFaturaPaga');
    if (chkFaturaPaga) {
      chkFaturaPaga.checked = !!(monthData.scarlet && monthData.scarlet.faturaPaga === true);
    }
    setVal('saldosAjusteConciliacao', ajuste !== 0 ? ajuste : '');

    const scarletGastosContainer = document.getElementById('saldosModalScarletGastosList');
    if (scarletGastosContainer) {
      const scarletItems = [...(monthData.fixos || []), ...(monthData.outros || [])]
        .filter(it => isGastoDaScarlet(it) && !isTransferenciaParaScarlet(it) && it.nome !== 'Nubank Scarlet');
      if (scarletItems.length === 0) {
        scarletGastosContainer.innerHTML = '<span style="color:var(--text-muted);font-style:italic;">Nenhum gasto próprio cadastrado neste mês.</span>';
      } else {
        scarletGastosContainer.innerHTML = scarletItems.map(it => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span>${it.nome} <span style="font-size:9.5px;color:var(--text-muted);">(${it.pago ? '✅ Pago' : '⏳ Pendente'})</span></span>
            <strong style="color:var(--purple);">${formatBRL(it.valor)}</strong>
          </div>
        `).join('');
      }
    }

    openModal('saldosEditModalBackdrop');

    if (focusSection === 'scarlet') {
      setTimeout(() => {
        const inp = document.getElementById('saldosOutrasRendasScarlet') || document.getElementById('saldosGanhosScarlet');
        if (inp) {
          inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
          inp.focus();
          inp.select();
        }
      }, 150);
    }
  }

  function salvarSaldosModal() {
    if (!saldosModalTargetAno || !saldosModalTargetMes) return;

    const state = MatrixDB.getState();
    const monthData = MatrixDB.getMonth(saldosModalTargetAno, saldosModalTargetMes);

    const parseVal = (id, def) => {
      const el = document.getElementById(id);
      if (!el || el.value === '' || el.value == null) return def;
      const v = parseFloat(String(el.value).replace(',', '.'));
      return isNaN(v) ? def : v;
    };

    const salMatheus = parseVal('saldosSalMatheus', 5788.19);
    const ganhosScarlet = parseVal('saldosGanhosScarlet', 0);
    const outrasRendasScarlet = parseVal('saldosOutrasRendasScarlet', 0);
    const descOutrasScarlet = (document.getElementById('saldosDescOutrasRendasScarlet')?.value || '').trim() || 'Outras Rendas Scarlet';
    const va = parseVal('saldosVa', 2050.00);
    const vr = parseVal('saldosVr', 1105.00);
    const novoNomeEst = (document.getElementById('saldosNomeEstudio')?.value || '').trim() || 'Renda Extra';
    const valorExtra = parseVal('saldosValorEstudio', 0);
    const contaExtra = document.getElementById('saldosContaEstudio')?.value || 'salario_bb';
    const faturaNubank = parseVal('saldosFaturaNubank', 0);
    const ajuste = parseVal('saldosAjusteConciliacao', 0);

    // Salva configuração do nome de renda extra
    if (!state.config) state.config = {};
    state.config.nomeEstudio = novoNomeEst;

    // Atualiza scarlet no mês
    if (!monthData.scarlet) monthData.scarlet = {};
    monthData.scarlet.ganhos = ganhosScarlet;
    monthData.scarlet.ganhosManual = ganhosScarlet;
    monthData.scarlet.outrasRendas = outrasRendasScarlet;
    monthData.scarlet.outrasRendasManual = outrasRendasScarlet;
    monthData.scarlet.descOutrasRendas = descOutrasScarlet;
    monthData.scarlet.faturaNubank = faturaNubank;
    if (Math.abs(faturaNubank - 4568.57) > 0.01) {
      monthData.scarlet.faturaNubankManual = faturaNubank;
    } else {
      delete monthData.scarlet.faturaNubankManual;
    }
    const sMonthKey = saldosModalTargetAno + '-' + saldosModalTargetMes;
    if (!state.satellites) state.satellites = {};
    if (!state.satellites.faturas) state.satellites.faturas = {};
    if (!state.satellites.faturas.faturasPorMes) state.satellites.faturas.faturasPorMes = {};
    if (!state.satellites.faturas.faturasPorMes[sMonthKey]) state.satellites.faturas.faturasPorMes[sMonthKey] = {};
    state.satellites.faturas.faturasPorMes[sMonthKey].total = faturaNubank;
    state.satellites.faturas.faturasPorMes[sMonthKey].valorReal = faturaNubank;
    if (saldosModalTargetAno === currentYear && saldosModalTargetMes === currentMonth) {
      state.satellites.faturas.faturaAtualReal = faturaNubank;
      state.satellites.faturas.faturaAtualValor = faturaNubank;
    }
    const chkFaturaPaga = document.getElementById('saldosFaturaPaga');
    if (chkFaturaPaga) {
      monthData.scarlet.faturaPaga = chkFaturaPaga.checked;
    }
    monthData.ajusteSaldo = ajuste;

    // Atualiza totais
    if (!monthData.totais) monthData.totais = {};
    monthData.totais['Salário Mensal'] = salMatheus;
    monthData.totais['VA'] = va;
    monthData.totais['VR'] = vr;
    monthData.totais['Renda Extra'] = valorExtra;
    monthData.totais['Outras Rendas Scarlet'] = outrasRendasScarlet;
    if (novoNomeEst !== 'Renda Extra') monthData.totais[novoNomeEst] = valorExtra;

    // Sincroniza satélite Casa Maracaju se for o ciclo vigente (preservando os gastos já abatidos do saldo atual)
    if (saldosModalTargetAno === currentYear && saldosModalTargetMes === currentMonth) {
      if (!state.satellites) state.satellites = {};
      monthData.vaManual = va;
      monthData.vrManual = vr;
      if (!state.satellites.maracaju) {
        state.satellites.maracaju = {
          origem: 'Maracaju 88',
          cicloVigente: '2026-11',
          vaTotal: va,
          saldoVaRestante: va,
          vrTotal: vr,
          saldoVrRestante: vr,
          manualOverride: true
        };
      } else {
        state.satellites.maracaju.vaTotal = va;
        state.satellites.maracaju.vrTotal = vr;
        state.satellites.maracaju.saldoVaRestante = va;
        state.satellites.maracaju.saldoVrRestante = vr;
        state.satellites.maracaju.manualOverride = true;
      }
    }

    // Sincroniza nas receitas do mês
    if (!monthData.receitas) monthData.receitas = [];

    // Salário Matheus
    let recSal = monthData.receitas.find(r => (r.nome || '').toLowerCase().includes('salário') || (r.id && r.id.startsWith('rec_sal')));
    if (recSal) {
      recSal.valor = salMatheus;
    } else {
      monthData.receitas.unshift({
        id: 'rec_sal_' + saldosModalTargetMes + '_' + saldosModalTargetAno,
        nome: 'Salário Líquido USP (Banco do Brasil)',
        valor: salMatheus,
        categoria: 'Salário / Proventos',
        conta: 'salario_bb',
        renda: 'salario_usp',
        pago: true
      });
    }

    // Ganhos Scarlet - Atendimentos Fisioterapia
    let recFisio = monthData.receitas.find(r => {
      const n = (r.nome || '').toLowerCase();
      const c = (r.categoria || '').toLowerCase();
      if (c === 'outras rendas scarlet' || (r.id && r.id.startsWith('rec_scarlet_extra'))) return false;
      if (n.includes('outras') || n.includes('extra')) return false;
      return n.includes('scarlet') || n.includes('fisio') || n.includes('atendimento');
    });
    if (ganhosScarlet > 0) {
      if (recFisio) {
        recFisio.valor = ganhosScarlet;
      } else {
        monthData.receitas.push({
          id: 'rec_fisio_' + saldosModalTargetMes + '_' + saldosModalTargetAno,
          nome: 'Ganhos Scarlet (FisioFlow)',
          valor: ganhosScarlet,
          categoria: 'Fisio Scarlet',
          conta: 'scarlet_fisio',
          renda: 'ganhos_scarlet',
          titular: 'scarlet',
          pago: false
        });
      }
    } else if (recFisio) {
      recFisio.valor = 0;
    }

    // Outras Rendas da Scarlet (ex: "Pgt sheila", Consultoria, Plantão, Cursos, etc.)
    const listaOutrasScarlet = monthData.receitas.filter(r => isOutraRendaDaScarlet(r));
    const somaAtualOutrasScarlet = listaOutrasScarlet.reduce((acc, r) => acc + (parseFloat(r.valor) || 0), 0);
    if (outrasRendasScarlet > 0) {
      if (listaOutrasScarlet.length === 1) {
        const recOutrasScarlet = listaOutrasScarlet[0];
        recOutrasScarlet.nome = descOutrasScarlet;
        recOutrasScarlet.valor = outrasRendasScarlet;
        recOutrasScarlet.renda = 'outras_rendas_scarlet';
        recOutrasScarlet.titular = 'scarlet';
      } else if (listaOutrasScarlet.length === 0) {
        monthData.receitas.push({
          id: 'rec_scarlet_extra_' + saldosModalTargetMes + '_' + saldosModalTargetAno,
          nome: descOutrasScarlet,
          valor: outrasRendasScarlet,
          categoria: 'Outras Rendas Scarlet',
          conta: 'scarlet_extra',
          renda: 'outras_rendas_scarlet',
          titular: 'scarlet',
          pago: true
        });
      } else if (Math.abs(somaAtualOutrasScarlet - outrasRendasScarlet) > 0.01) {
        const recTarget = listaOutrasScarlet.find(r => r.id && r.id.startsWith('rec_scarlet_extra')) || listaOutrasScarlet[0];
        const somaDemais = somaAtualOutrasScarlet - (parseFloat(recTarget.valor) || 0);
        recTarget.valor = Math.max(0, Math.round((outrasRendasScarlet - somaDemais) * 100) / 100);
      }
    } else if (listaOutrasScarlet.length > 0) {
      listaOutrasScarlet.forEach(r => { r.valor = 0; });
    }

    // Vale Alimentação (VA)
    let recVa = monthData.receitas.find(r => isItemVA(r));
    if (recVa) {
      recVa.valor = va;
    } else {
      monthData.receitas.push({
        id: 'rec_va_' + saldosModalTargetMes + '_' + saldosModalTargetAno,
        nome: 'Vale Alimentação (VA - Maracaju 88)',
        valor: va,
        categoria: 'Benefício (Não Pecúnia)',
        naoPecunia: true,
        pago: true
      });
    }

    // Vale Refeição (VR)
    let recVr = monthData.receitas.find(r => isItemVR(r));
    if (recVr) {
      recVr.valor = vr;
    } else {
      monthData.receitas.push({
        id: 'rec_vr_' + saldosModalTargetMes + '_' + saldosModalTargetAno,
        nome: 'Vale Refeição (VR)',
        valor: vr,
        categoria: 'Benefício (Não Pecúnia)',
        naoPecunia: true,
        pago: true
      });
    }

    // Ganho Extra (exclusivo do Matheus)
    let recExtra = monthData.receitas.find(r => {
      if (!isReceitaExtraMatheus(r)) return false;
      const n = (r.nome || '').toLowerCase();
      return n.includes('extra') || n.includes('estúdio') || n.includes(novoNomeEst.toLowerCase());
    });
    if (valorExtra > 0) {
      if (recExtra) {
        recExtra.nome = novoNomeEst;
        recExtra.valor = valorExtra;
        recExtra.conta = contaExtra;
      } else {
        monthData.receitas.push({
          id: 'rec_extra_' + saldosModalTargetMes + '_' + saldosModalTargetAno,
          nome: novoNomeEst,
          valor: valorExtra,
          categoria: 'Renda Extra',
          conta: contaExtra,
          renda: 'estudio_extra',
          pago: true
        });
      }
    } else if (recExtra) {
      recExtra.valor = 0;
    }

    // Salva explicitamente tanto os dados do mês quanto o estado global!
    MatrixDB.saveMonth(saldosModalTargetAno, saldosModalTargetMes, monthData);
    MatrixDB.saveState(state);

    closeModal('saldosEditModalBackdrop');
    renderAll();
    alert('✅ Saldos e rendas de ' + saldosModalTargetMes + '/' + saldosModalTargetAno + ' atualizados com sucesso!');
  }

  function toggleFaturaNubankPaga(ano, mes) {
    const targetAno = ano || currentYear;
    const targetMes = mes || currentMonth;
    const monthData = MatrixDB.getMonth(targetAno, targetMes);
    if (!monthData.scarlet) monthData.scarlet = {};
    monthData.scarlet.faturaPaga = !monthData.scarlet.faturaPaga;
    MatrixDB.saveMonth(targetAno, targetMes, monthData);
    renderAll();
  }

  function toggleScenarioActive(scenId, isActive) {
    const state = MatrixDB.getState();
    const scen = (state.simulacoesAtivas || []).find(s => s.id === scenId);
    if (scen) {
      scen.ativo = isActive;
      MatrixDB.saveState(state);
      renderSimulator();
    }
  }

  function removeScenario(scenId) {
    if (confirm('Excluir esta simulação?')) {
      const state = MatrixDB.getState();
      state.simulacoesAtivas = (state.simulacoesAtivas || []).filter(s => s.id !== scenId);
      MatrixDB.saveState(state);
      renderSimulator();
    }
  }

  function openScenarioModal(id = null) {
    const state = MatrixDB.getState();
    const scen = id ? (state.simulacoesAtivas || []).find(s => s.id === id) : null;

    document.getElementById('scenModalId').value = scen ? scen.id : '';
    document.getElementById('scenModalTitulo').value = scen ? scen.titulo : '';
    document.getElementById('scenModalValor').value = scen ? (scen.valorAdotado || scen.valor || '') : '';
    
    const tipo = scen ? (scen.tipo || (scen.recorrente === false ? 'pontual' : 'recorrente')) : 'recorrente';
    document.getElementById('scenModalTipo').value = tipo;
    toggleScenarioModalParcelas(tipo);
    document.getElementById('scenModalParcelas').value = (scen && scen.parcelas) || 3;

    document.getElementById('scenModalConta').value = (scen && scen.conta) || 'nubank_scarlet';
    document.getElementById('scenModalRenda').value = (scen && scen.renda) || 'ganhos_scarlet';
    document.getElementById('scenModalInicio').value = formatMesAnoBR((scen && scen.inicio) || `${currentYear}-12`);
    document.getElementById('scenModalFim').value = scen && scen.fim ? formatMesAnoBR(scen.fim) : '';
    document.getElementById('scenModalObs').value = (scen && scen.observacao) || '';
    document.getElementById('scenModalAtivo').checked = scen ? (scen.ativo !== false) : true;

    document.getElementById('scenModalHeaderTitle').textContent = scen ? `Editar Hipótese: ${scen.titulo}` : 'Nova Hipótese / Cenário';
    openModal('scenarioModalBackdrop');
  }

  function toggleScenarioModalParcelas(tipo) {
    const row = document.getElementById('scenModalParcelasRow');
    if (row) {
      row.style.display = tipo === 'parcelado' ? 'block' : 'none';
    }
  }

  function saveScenarioFromModal() {
    const id = document.getElementById('scenModalId').value;
    const titulo = document.getElementById('scenModalTitulo').value.trim();
    const valor = parseFloat(document.getElementById('scenModalValor').value) || 0;
    const tipo = document.getElementById('scenModalTipo').value;
    const parcelas = parseInt(document.getElementById('scenModalParcelas').value, 10) || 1;
    const conta = document.getElementById('scenModalConta').value;
    const renda = document.getElementById('scenModalRenda').value;
    const rawInicio = document.getElementById('scenModalInicio').value.trim();
    const rawFim = document.getElementById('scenModalFim').value.trim();
    const inicio = parseMesAnoBR(rawInicio) || `${currentYear}-12`;
    const fim = rawFim ? parseMesAnoBR(rawFim) : '';
    const obs = document.getElementById('scenModalObs').value.trim();
    const ativo = document.getElementById('scenModalAtivo').checked;

    if (!titulo) {
      alert('Informe o título da hipótese ou projeto.');
      return;
    }
    if (valor <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    const state = MatrixDB.getState();
    if (!state.simulacoesAtivas) state.simulacoesAtivas = [];

    const itemData = {
      id: id || ('sim_' + Date.now()),
      titulo,
      valorAdotado: valor,
      valor: valor,
      tipo,
      recorrente: tipo === 'recorrente',
      parcelas: tipo === 'parcelado' ? parcelas : undefined,
      conta,
      renda,
      inicio,
      fim: fim || undefined,
      observacao: obs,
      ativo
    };

    if (id) {
      const idx = state.simulacoesAtivas.findIndex(s => s.id === id);
      if (idx >= 0) {
        state.simulacoesAtivas[idx] = itemData;
      } else {
        state.simulacoesAtivas.push(itemData);
      }
    } else {
      state.simulacoesAtivas.push(itemData);
    }

    MatrixDB.saveState(state);
    closeModal('scenarioModalBackdrop');
    renderSimulator();
  }

  function addNewScenarioPrompt() {
    openScenarioModal();
  }

  function abrirModalEditarDia(dateStr) {
    if (!dateStr) return;
    const parts = dateStr.split('-');
    const yearNum = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10);
    const dayNum = parseInt(parts[2], 10);
    const monthName = MONTH_NAMES[monthIdx - 1];

    const state = MatrixDB.getState();
    const info = CalendarEngine.getMonthDaysInfo(yearNum, monthIdx, state.calendarioCustom);
    const dayObj = (info.days || []).find(d => d.day === dayNum);
    if (!dayObj) return;

    const dateInput = document.getElementById('calModalDateStr');
    if (dateInput) dateInput.value = dateStr;

    const titleEl = document.getElementById('calModalDayTitle');
    if (titleEl) titleEl.textContent = `Dia ${dayNum} de ${monthName} de ${yearNum}`;

    const subtitleEl = document.getElementById('calModalDaySubtitle');
    if (subtitleEl) subtitleEl.textContent = `${dayObj.dayOfWeekStr}-feira • Classificação do Dia`;

    // Status padrão oficial
    let defaultStatusText = '🚗 Trabalho Presencial USP (Normal)';
    if (dayObj.defaultInfo.isHoliday) {
      defaultStatusText = `🎉 Feriado Oficial (${dayObj.defaultInfo.holidayDesc})`;
    } else if (dayObj.defaultInfo.inRecess) {
      defaultStatusText = '🏛️ Recesso Oficial de Fim de Ano da USP';
    } else if (dayObj.defaultInfo.isWeekend) {
      defaultStatusText = '💤 Fim de Semana (Descanso)';
    }

    const defaultStatusEl = document.getElementById('calModalDefaultStatus');
    if (defaultStatusEl) defaultStatusEl.textContent = defaultStatusText;

    // Seleciona o radio button correspondente
    let selectedTipo = 'padrao';
    let motivoTexto = '';

    if (dayObj.override) {
      selectedTipo = dayObj.override.tipo || 'presencial';
      motivoTexto = dayObj.override.motivo || '';
    } else {
      if (dayObj.statusTipo === 'workday') selectedTipo = 'presencial';
      else if (dayObj.statusTipo === 'holiday') selectedTipo = 'feriado';
      else if (dayObj.statusTipo === 'weekend') selectedTipo = 'fim_semana';
      else selectedTipo = 'padrao';
    }

    const radio = document.querySelector(`input[name="calDayStatusRadio"][value="${selectedTipo}"]`);
    if (radio) {
      radio.checked = true;
    } else {
      const padraoRadio = document.querySelector('input[name="calDayStatusRadio"][value="padrao"]');
      if (padraoRadio) padraoRadio.checked = true;
    }

    const motivoInput = document.getElementById('calModalMotivo');
    if (motivoInput) motivoInput.value = motivoTexto;

    // Abre o modal
    const modal = document.getElementById('calDayEditModalBackdrop');
    openModal(modal);
  }

  function salvarStatusDiaCalendario() {
    const dateInput = document.getElementById('calModalDateStr');
    if (!dateInput || !dateInput.value) return;
    const dateStr = dateInput.value;

    const parts = dateStr.split('-');
    const yearStr = parts[0];
    const monthIdx = parseInt(parts[1], 10);
    const monthName = MONTH_NAMES[monthIdx - 1];

    const selectedRadio = document.querySelector('input[name="calDayStatusRadio"]:checked');
    const tipo = selectedRadio ? selectedRadio.value : 'padrao';

    const motivoInput = document.getElementById('calModalMotivo');
    const customMotivo = motivoInput ? motivoInput.value.trim() : '';

    const state = MatrixDB.getState();
    if (!state.calendarioCustom) state.calendarioCustom = { overrides: {}, folgas: [] };
    if (!state.calendarioCustom.overrides) state.calendarioCustom.overrides = {};
    if (!Array.isArray(state.calendarioCustom.folgas)) state.calendarioCustom.folgas = [];

    if (tipo === 'padrao') {
      delete state.calendarioCustom.overrides[dateStr];
      state.calendarioCustom.folgas = state.calendarioCustom.folgas.filter(f => f.data !== dateStr);
    } else {
      let defaultLabel = 'Trabalho Presencial (USP)';
      if (tipo === 'folga') defaultLabel = 'Folga';
      else if (tipo === 'ferias') defaultLabel = 'Férias';
      else if (tipo === 'abonada') defaultLabel = 'Falta Abonada';
      else if (tipo === 'feriado') defaultLabel = 'Feriado / Ponto Facultativo';
      else if (tipo === 'fim_semana') defaultLabel = 'Fim de Semana';

      const finalMotivo = customMotivo || defaultLabel;

      state.calendarioCustom.overrides[dateStr] = {
        tipo: tipo,
        motivo: finalMotivo
      };

      state.calendarioCustom.folgas = state.calendarioCustom.folgas.filter(f => f.data !== dateStr);
      if (tipo === 'folga' || tipo === 'ferias' || tipo === 'abonada') {
        state.calendarioCustom.folgas.push({
          data: dateStr,
          tipo: tipo,
          motivo: finalMotivo
        });
      }
    }

    MatrixDB.saveState(state);

    const commute = CalendarEngine.calculateCommuteAndVR(parseInt(yearStr, 10), monthIdx, state.calendarioCustom);

    const monthData = MatrixDB.getMonth(yearStr, monthName);
    if (!monthData.fixos) monthData.fixos = [];
    let caronaItem = monthData.fixos.find(f => f.nome && f.nome.toLowerCase().includes('carona'));
    if (caronaItem) {
      caronaItem.valor = commute.totalCaronas;
    } else {
      monthData.fixos.push({
        id: 'fix_carona_' + Date.now(),
        nome: 'Caronas',
        valor: commute.totalCaronas,
        categoria: 'Transporte',
        pago: false
      });
    }

    MatrixDB.saveMonth(yearStr, monthName, monthData);

    closeModal('calDayEditModalBackdrop');

    // Sincroniza o mês e possíveis meses de sobreposição do ciclo salarial
    syncCaronasWithCalendar(yearStr, monthName);
    const dayNum = parseInt(parts[2], 10);
    if (dayNum <= 10) {
      const prevDate = new Date(parseInt(yearStr, 10), monthIdx - 2, 1);
      syncCaronasWithCalendar(String(prevDate.getFullYear()), MONTH_NAMES[prevDate.getMonth()]);
    } else if (dayNum >= 25) {
      const nextDate = new Date(parseInt(yearStr, 10), monthIdx, 1);
      syncCaronasWithCalendar(String(nextDate.getFullYear()), MONTH_NAMES[nextDate.getMonth()]);
    }

    renderFluxoCaixa();
    renderKPIs();
    renderMonthlyHorizonCards();

    renderCalendar();

    const banner = document.getElementById('calSaveNotification');
    if (banner) {
      banner.classList.add('saved-flash');
      const cycleTxt = commute.salaryCycle ? commute.salaryCycle.cycleRangeLabel : '';
      banner.innerHTML = `<span class="cal-banner-inline">✅ <strong>${monthName}/${yearStr} ATUALIZADO!</strong> VR: ${formatBRL(commute.totalVR)} (${commute.vrWorkingDaysCount}d) • Caronas: ${formatBRL(commute.totalCaronas)} (${commute.commuteWorkingDaysCount}d no ciclo ${cycleTxt})</span>`;
      setTimeout(() => {
        banner.classList.remove('saved-flash');
        banner.innerHTML = `<span class="cal-banner-inline">📅 <strong id="calBannerMonthText">${calSelectedMonth} de ${calSelectedYear}</strong> • Toque em qualquer dia para alterar (presencial, folga, abonada, feriado).</span>`;
      }, 4000);
    }
  }

  function toggleCalendarDay(dateStr) {
    abrirModalEditarDia(dateStr);
  }

  function aplicarCaronasNoMes() {
    const yearStr = calSelectedYear || currentYear;
    const monthName = calSelectedMonth || currentMonth;
    const monthIndex = MONTH_NAMES.indexOf(monthName) + 1;
    const state = MatrixDB.getState();
    const commute = CalendarEngine.calculateCommuteAndVR(parseInt(yearStr, 10), monthIndex, state.calendarioCustom);

    // Atualiza ou insere o item "Caronas" nos gastos fixos do mês em edição
    const monthData = MatrixDB.getMonth(yearStr, monthName);
    if (!monthData.fixos) monthData.fixos = [];
    let caronaItem = monthData.fixos.find(f => f.nome && f.nome.toLowerCase().includes('carona'));
    if (caronaItem) {
      caronaItem.valor = commute.totalCaronas;
    } else {
      monthData.fixos.push({
        id: 'fix_carona_' + Date.now(),
        nome: 'Caronas',
        valor: commute.totalCaronas,
        categoria: 'Transporte',
        pago: false
      });
    }

    MatrixDB.saveMonth(yearStr, monthName, monthData);

    if (yearStr === currentYear && monthName === currentMonth) {
      renderAll();
    } else {
      renderCalendar();
    }

    const banner = document.getElementById('calSaveNotification');
    if (banner) {
      banner.classList.add('saved-flash');
      const cycleTxt = commute.salaryCycle ? commute.salaryCycle.cycleRangeLabel : '';
      banner.innerHTML = `<span class="cal-banner-inline">✅ <strong>Sincronizado no Fluxo!</strong> VR Mês: ${formatBRL(commute.totalVR)} (${commute.vrWorkingDaysCount}d) • Caronas: ${formatBRL(commute.totalCaronas)} (${commute.commuteWorkingDaysCount}d no ciclo ${cycleTxt})</span>`;
      setTimeout(() => {
        banner.classList.remove('saved-flash');
        banner.innerHTML = `<span class="cal-banner-inline">📅 <strong id="calBannerMonthText">${calSelectedMonth} de ${calSelectedYear}</strong> • Toque em qualquer dia para alterar (presencial, folga, abonada, feriado).</span>`;
      }, 4000);
    } else {
      alert(`Caronas (${formatBRL(commute.totalCaronas)}) e VR (${formatBRL(commute.totalVR)}) sincronizados com sucesso para ${monthName}/${yearStr}!`);
    }
  }

  function saveCloudSettings() {
    const cloudUrl = (document.getElementById('cfgCloudUrl')?.value || '').trim();
    const cloudToken = (document.getElementById('cfgCloudToken')?.value || 'MatrixReloaded2026!').trim();
    SyncEngine.saveConfig({ cloudUrl, cloudToken });
    if (!cloudUrl) {
      SyncEngine.updateStatusUI('offline');
    }
    alert('✅ Configurações de nuvem salvas com sucesso!');
    renderBackup();
  }

  async function copiarCodigoAppsScript() {
    try {
      const res = await fetch('apps_script.gs?v=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const code = await res.text();
      await navigator.clipboard.writeText(code);
      alert(
        '✅ Código do Conector (apps_script.gs v2.0) copiado para a Área de Transferência!\n\n' +
        'COMO ATIVAR NA PLANILHA "Matrix Finance 360":\n' +
        '1. Clique em "📊 Abrir Planilha Matrix Finance 360";\n' +
        '2. No menu superior da planilha, clique em Extensões > Apps Script;\n' +
        '3. Apague o que estiver lá, cole este código (Ctrl+V) e salve (Ctrl+S);\n' +
        '4. Clique em "Implantar > Nova implantação" (Tipo: App da Web, Executar como: Eu, Quem pode acessar: Qualquer pessoa);\n' +
        '5. Copie a URL terminada em /exec gerada pelo Google e cole no campo abaixo!'
      );
    } catch (e) {
      alert('Não foi possível copiar automaticamente: ' + e.message + '\nAbra o arquivo apps_script.gs na pasta do projeto.');
    }
  }

  async function testCloudConnection() {
    const cloudUrl = (document.getElementById('cfgCloudUrl')?.value || '').trim();
    const cloudToken = (document.getElementById('cfgCloudToken')?.value || 'MatrixReloaded2026!').trim();
    SyncEngine.saveConfig({ cloudUrl, cloudToken });
    const res = await SyncEngine.pingCloud();
    if (res.success) {
      alert(`✅ Conexão OK! Planilha vinculada: "${res.title}"`);
      renderBackup();
    } else {
      alert(`Erro na conexão: ${res.error}`);
    }
  }

  async function forceSyncToCloud() {
    const cloudUrl = (document.getElementById('cfgCloudUrl')?.value || '').trim();
    const cloudToken = (document.getElementById('cfgCloudToken')?.value || 'MatrixReloaded2026!').trim();
    SyncEngine.saveConfig({ cloudUrl, cloudToken });
    const res = await SyncEngine.syncToCloud();
    if (res && res.success) {
      const sizeStr = res.chars ? ` (${(res.chars / 1024).toFixed(1)} KB)` : '';
      alert(`✅ Backup enviado com sucesso para o Google Sheets!${sizeStr}`);
    } else {
      alert('Erro ao enviar backup: ' + ((res && res.error) || 'Verifique a URL da planilha.'));
    }
    renderBackup();
  }

  async function forceFetchFromCloud() {
    const cloudUrl = (document.getElementById('cfgCloudUrl')?.value || '').trim();
    const cloudToken = (document.getElementById('cfgCloudToken')?.value || 'MatrixReloaded2026!').trim();
    SyncEngine.saveConfig({ cloudUrl, cloudToken });
    if (confirm('Deseja puxar os dados mais recentes do Google Sheets e substituir a memória local?')) {
      const res = await SyncEngine.fetchFromCloud();
      if (res.success && res.data) {
        alert('✅ Dados restaurados com sucesso do Google Sheets!');
        renderAll();
      } else if (res.success && !res.data) {
        alert('ℹ️ ' + (res.message || 'A planilha está conectada, mas ainda não possui um backup salvo. Clique em "⬆️ Fazer Backup" primeiro.'));
      } else {
        alert('Falha ao restaurar: ' + res.error);
      }
    }
  }

  function downloadBackupFile() {
    const jsonStr = MatrixDB.exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matrix-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copiarBackupClipboard() {
    try {
      const jsonStr = MatrixDB.exportBackupJSON();
      await navigator.clipboard.writeText(jsonStr);
      alert('Backup completo copiado para a Área de Transferência! Você pode colar no WhatsApp, e-mail ou bloco de notas.');
    } catch (e) {
      alert('Não foi possível copiar automaticamente: ' + e.message);
    }
  }

  async function colarBackupClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim().startsWith('{')) {
        const manual = prompt('Cole aqui o texto JSON do backup:');
        if (!manual) return;
        processarImportacaoTexto(manual);
        return;
      }
      processarImportacaoTexto(text);
    } catch (e) {
      const manual = prompt('Cole aqui o texto JSON do backup:');
      if (manual) processarImportacaoTexto(manual);
    }
  }

  function processarImportacaoTexto(text) {
    if (confirm('Deseja restaurar este backup e substituir o estado atual?')) {
      const res = MatrixDB.importBackupJSON(text);
      if (res.success) {
        alert('Backup restaurado com sucesso absoluto!');
        renderAll();
      } else {
        alert('Erro ao processar backup: ' + res.error);
      }
    }
  }

  function importBackupFile(inputEl) {
    const file = inputEl.files && inputEl.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const res = MatrixDB.importBackupJSON(e.target.result);
      if (res.success) {
        alert('Backup importado com sucesso!');
        renderAll();
      } else {
        alert('Erro ao importar: ' + res.error);
      }
    };
    reader.readAsText(file);
  }

  let isHandlingPopstate = false;

  function setupModalListeners() {
    // Empilha um estado guarda inicial para evitar que o botão Voltar feche o app acidentalmente
    if (typeof window !== 'undefined' && window.history && typeof window.history.pushState === 'function') {
      try {
        window.history.replaceState({ matrixRoot: true }, '', window.location.href);
        window.history.pushState({ matrixGuard: true }, '', window.location.href);
      } catch (e) {}
    }

    // Intercepta o botão Voltar do celular (Android/iOS) e do navegador para fechar apenas o modal aberto
    window.addEventListener('popstate', () => {
      if (isHandlingPopstate) {
        isHandlingPopstate = false;
        return;
      }
      // Se o usuário estiver ativamente digitando ou selecionando em um campo de entrada,
      // a dispensa do teclado virtual mobile nunca deve fechar o modal
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return;
      }
      const openModals = Array.from(document.querySelectorAll('.matrix-modal-backdrop.open'));
      if (openModals.length > 0) {
        const topModal = openModals[openModals.length - 1];
        topModal._inHistory = false;
        closeModal(topModal, true);
        return;
      }
    });

    // Tecla ESC fecha apenas o modal aberto no topo
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModals = Array.from(document.querySelectorAll('.matrix-modal-backdrop.open'));
        if (openModals.length > 0) {
          const topModal = openModals[openModals.length - 1];
          closeModal(topModal);
        }
      }
    });

    // Botões explícitos [✕] de fechamento
    document.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const backdrop = e.target.closest('.matrix-modal-backdrop');
        if (backdrop) {
          closeModal(backdrop);
        }
      });
    });

    // Proteção rigorosa contra fechamentos acidentais ao clicar ou editar dentro de qualquer modal:
    // 1. Clicks e eventos de ponteiro dentro da caixa de diálogo (.matrix-modal) NUNCA vazam para o backdrop
    document.querySelectorAll('.matrix-modal').forEach(m => {
      m.addEventListener('click', (e) => e.stopPropagation());
      m.addEventListener('mousedown', (e) => e.stopPropagation());
      m.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    });

    // 2. Rastreamento do elemento de origem do ponteiro (mousedown / touchstart)
    let pointerDownTarget = null;
    window.addEventListener('mousedown', (e) => { pointerDownTarget = e.target; }, true);
    window.addEventListener('touchstart', (e) => { pointerDownTarget = e.target; }, { passive: true, capture: true });

    // 3. O backdrop só fecha se pointerdown E click tiverem ocorrido diretamente no fundo escuro
    // E houver passado pelo menos 400ms desde a abertura do modal (evita cliques residuais/sintéticos do toque mobile)
    window.addEventListener('click', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('matrix-modal-backdrop')) {
        if (pointerDownTarget === e.target) {
          const openedAt = e.target._openedAt || 0;
          if (Date.now() - openedAt > 400) {
            closeModal(e.target);
          }
        }
      }
    });
  }

  function openModal(idOrEl) {
    const el = (typeof idOrEl === 'string') ? document.getElementById(idOrEl) : idOrEl;
    if (el) {
      el._openedAt = Date.now();
      el.style.display = 'flex';
      el.classList.add('open', 'active');
      if (!el._inHistory && window.history && typeof window.history.pushState === 'function') {
        try {
          window.history.pushState({ matrixModalId: el.id }, '', window.location.href);
          el._inHistory = true;
        } catch (_) {}
      }
    }
  }

  function closeModal(idOrEl, fromPopstate = false) {
    const el = (typeof idOrEl === 'string') ? document.getElementById(idOrEl) : idOrEl;
    if (el) {
      el.classList.remove('open', 'active');
      el.style.removeProperty('display');
      if (el._inHistory) {
        el._inHistory = false;
        if (!fromPopstate && window.history && typeof window.history.back === 'function') {
          isHandlingPopstate = true;
          try {
            window.history.back();
          } catch (_) {
            isHandlingPopstate = false;
          }
          setTimeout(() => { isHandlingPopstate = false; }, 180);
        }
      }
    }
  }

  function setupHoleriteDropzone() {
    const dropzone = document.getElementById('holeriteDropzone');
    const fileInput = document.getElementById('holeriteFileInput');
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleHoleriteFile(files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleHoleriteFile(e.target.files[0]);
      }
    });
  }

  async function handleHoleriteFile(file) {
    try {
      const res = await PdfHoleriteReader.processPdfFile(file);
      preencherFormularioHolerite(res);
      const conf = confirm(`Holerite identificado: ${res.orgao} - ${res.competencia || 'Lido com sucesso'}!\n\nSalário Líquido: ${formatBRL(res.liquido || 0)}\n\nDeseja lançar este holerite automaticamente no mês de ${res.mesNome || 'Novembro'}/${res.ano || '2026'} agora?`);
      if (conf) {
        salvarHoleriteManual();
      } else {
        alert('Dados preenchidos no formulário para sua conferência.');
      }
    } catch (e) {
      alert(`Aviso: ${e.message}\nVocê pode conferir ou digitar os campos abaixo.`);
    }
  }

  function preencherFormularioHolerite(h) {
    if (h.vencimentoBruto) document.getElementById('hlVencimento').value = h.vencimentoBruto;
    if (h.auxilioSaude) document.getElementById('hlAuxSaude').value = h.auxilioSaude;
    if (h.descontoVr) document.getElementById('hlDescontoVr').value = h.descontoVr;
    if (h.sindicato) document.getElementById('hlSindicato').value = h.sindicato;
    if (h.inss) document.getElementById('hlInss').value = h.inss;
    if (h.irrf) document.getElementById('hlIr').value = h.irrf;
    if (h.fgts) document.getElementById('hlFgts').value = h.fgts;
    if (h.liquido) document.getElementById('hlLiquido').value = h.liquido;
    if (h.ano) document.getElementById('hlAno').value = h.ano;
    if (h.mesNome) document.getElementById('hlMes').value = h.mesNome;
  }

  function salvarHoleriteManual() {
    const ano = document.getElementById('hlAno').value;
    const mes = document.getElementById('hlMes').value;
    const liquido = parseFloat(document.getElementById('hlLiquido').value) || 0;
    const auxSaude = parseFloat(document.getElementById('hlAuxSaude').value) || 0;
    const vencimentoBruto = parseFloat(document.getElementById('hlVencimento').value) || 6264.04;
    const inss = parseFloat(document.getElementById('hlInss').value) || 0;
    const irrf = parseFloat(document.getElementById('hlIr').value) || 0;
    const sindicato = parseFloat(document.getElementById('hlSindicato').value) || 0;
    const descontoVr = parseFloat(document.getElementById('hlDescontoVr').value) || 0;
    const fgts = parseFloat(document.getElementById('hlFgts').value) || 501.12;

    const orgao = 'Universidade de São Paulo (USP)';
    const cargo = 'Técnico 1 - Nível A';
    const banco = 'Banco do Brasil Ag. 2211 CC 38154-3';

    const monthNum = String(MONTH_NAMES.indexOf(mes) + 1).padStart(2, '0');
    const periodoKey = `${ano}-${monthNum}`;

    const state = MatrixDB.getState();
    if (!state.holerites) state.holerites = [];

    const existingIdx = state.holerites.findIndex(h => h.periodo === periodoKey || h.periodo === `${ano}-${mes}`);
    const holeriteObj = {
      periodo: periodoKey,
      ano: ano,
      mesNome: mes,
      orgao: orgao,
      cargo: cargo,
      banco: banco,
      vencimentos: vencimentoBruto,
      descontos: inss + irrf + sindicato + descontoVr,
      liquido: liquido,
      fgts: fgts,
      auxilioSaude: auxSaude,
      itens: [
        { desc: 'Vencimento Básico', tipo: 'Vencimento', valor: vencimentoBruto },
        ...(auxSaude > 0 ? [{ desc: 'Auxílio-Saúde USP', tipo: 'Vencimento', valor: auxSaude }] : []),
        ...(inss > 0 ? [{ desc: 'INSS', tipo: 'Desconto', valor: inss }] : []),
        ...(irrf > 0 ? [{ desc: 'Imposto de Renda (IRRF)', tipo: 'Desconto', valor: irrf }] : []),
        ...(sindicato > 0 ? [{ desc: 'Sindicato Trabalhadores USP', tipo: 'Desconto', valor: sindicato }] : []),
        ...(descontoVr > 0 ? [{ desc: 'Desconto Vale Refeição', tipo: 'Desconto', valor: descontoVr }] : [])
      ]
    };

    if (existingIdx >= 0) {
      state.holerites[existingIdx] = holeriteObj;
    } else {
      state.holerites.push(holeriteObj);
    }

    // 1. INJEÇÃO DIRETA NO MÊS CORRESPONDENTE DO FLUXO DE CAIXA:
    const month = MatrixDB.getMonth(ano, mes);
    if (!month.receitas) month.receitas = [];
    if (!month.totais) month.totais = {};

    let salItem = month.receitas.find(r => r.nome.toLowerCase().includes('salário') || r.id.startsWith('rec_sal'));
    const salNome = isMpsp ? 'Salário Líquido MPSP (Bradesco)' : 'Salário Líquido USP (Banco do Brasil)';
    if (salItem) {
      salItem.valor = liquido;
      salItem.pago = true;
      salItem.nome = salNome;
    } else {
      month.receitas.unshift({
        id: 'rec_sal_' + mes,
        nome: salNome,
        valor: liquido,
        categoria: 'Salário / Proventos',
        conta: isMpsp ? 'bradesco' : 'bb',
        renda: 'salario_usp',
        pago: true
      });
    }

    // 2. Atualiza totais do mês
    month.totais['Salário Mensal'] = liquido;
    if (auxSaude > 0) month.totais['Auxílio-Saúde USP'] = auxSaude;

    // 3. Atualiza depósito mensal do FGTS na Caixa
    if (fgts > 0 && state.financiamentoCaixa) {
      state.financiamentoCaixa.fgtsMensalUsp = fgts;
    }

    MatrixDB.saveMonth(ano, mes, month);
    MatrixDB.saveState(state);

    renderAll();
    renderHoleritesHistorico();
    alert(`✅ Holerite lançado com sucesso direto no mês de ${mes}/${ano}!\n\n• Salário Líquido: ${formatBRL(liquido)} (creditado como Recebido)\n• FGTS: ${formatBRL(fgts)} atualizado na amortização Caixa`);
  }

  function renderHoleritesHistorico() {
    const listEl = document.getElementById('holeritesHistoricoList');
    const badgeEl = document.getElementById('holeritesCountBadge');
    if (!listEl) return;

    const state = MatrixDB.getState();
    const holerites = (state.holerites || []).slice();

    if (badgeEl) badgeEl.textContent = `${holerites.length} Holerites`;

    if (holerites.length === 0) {
      listEl.innerHTML = `
        <div style="background:var(--bg-card);border:1px dashed var(--border-dim);padding:20px;border-radius:var(--radius-sm);text-align:center;color:var(--text-muted);font-family:var(--font-mono);font-size:12px;">
          Nenhum holerite processado no histórico. Arraste um arquivo PDF ou lance manualmente acima.
        </div>
      `;
      return;
    }

    // Ordenar cronologicamente decrescente (mais recente primeiro)
    holerites.sort((a, b) => {
      const pA = a.periodo || '';
      const pB = b.periodo || '';
      return pB.localeCompare(pA);
    });

    listEl.innerHTML = holerites.map((h, i) => {
      const cardId = `holerite_card_${i}`;
      const orgaoIcon = (h.orgao && h.orgao.includes('MPSP')) ? '⚖️' : '🏛️';
      const itens = h.itens || [];
      const vencimentosItens = itens.filter(it => it.tipo === 'Vencimento');
      const descontosItens = itens.filter(it => it.tipo === 'Desconto');

      let anoLabel = h.ano;
      let mesLabel = h.mesNome;
      if (!anoLabel || !mesLabel) {
        if (h.periodo && h.periodo.includes('-')) {
          const parts = h.periodo.split('-');
          anoLabel = parts[0];
          const mNum = parseInt(parts[1], 10);
          mesLabel = !isNaN(mNum) && mNum >= 1 && mNum <= 12 ? MONTH_NAMES[mNum - 1] : parts[1];
        } else {
          anoLabel = '2026';
          mesLabel = 'Mês';
        }
      }

      return `
        <div id="${cardId}" class="holerite-card">
          <!-- Cabeçalho do Card (Expandir / Recolher) -->
          <div class="holerite-header" onclick="MatrixApp.toggleHoleriteAccordion('${cardId}')" title="Clique para expandir ou recolher o demonstrativo">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
              <span style="font-size:18px;">${orgaoIcon}</span>
              <div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <strong style="color:var(--text-main);font-size:13.5px;font-family:var(--font-mono);">${mesLabel} / ${anoLabel}</strong>
                  <span class="status-badge" style="background:rgba(0,255,102,0.12);color:var(--matrix-green);border-color:var(--matrix-green-dim);font-size:9.5px;">
                    ✅ Lançado no Mês
                  </span>
                </div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">
                  ${h.orgao || 'USP - São Carlos'} • ${h.cargo || 'Técnico 1 - Nível A'}
                </div>
              </div>
            </div>

            <div style="display:flex;align-items:center;gap:16px;">
              <div style="text-align:right;font-family:var(--font-mono);">
                <div style="font-size:10px;color:var(--text-muted);">LÍQUIDO EM CONTA:</div>
                <div style="font-size:14px;font-weight:700;color:var(--matrix-green);">${formatBRL(h.liquido || 0)}</div>
              </div>
              <span class="holerite-chevron">▼</span>
            </div>
          </div>

          <!-- Corpo do Card (Demonstrativo Detalhado) -->
          <div class="holerite-body">
            <!-- Barra de Indicadores do Holerite -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:8px;margin-bottom:14px;background:rgba(5,8,7,0.4);padding:10px;border-radius:var(--radius-xs);border:1px solid var(--border-dim);font-family:var(--font-mono);font-size:11px;">
              <div>
                <span style="color:var(--text-muted);font-size:10px;">VENCIMENTO BRUTO:</span>
                <div style="color:var(--cyan);font-weight:700;font-size:12.5px;">${formatBRL(h.vencimentos || 0)}</div>
              </div>
              <div>
                <span style="color:var(--text-muted);font-size:10px;">TOTAL DESCONTOS:</span>
                <div style="color:var(--rose);font-weight:700;font-size:12.5px;">- ${formatBRL(h.descontos || 0)}</div>
              </div>
              <div>
                <span style="color:var(--text-muted);font-size:10px;">FGTS DEPOSITADO:</span>
                <div style="color:var(--amber);font-weight:700;font-size:12.5px;">${formatBRL(h.fgts || 501.12)}</div>
              </div>
              <div>
                <span style="color:var(--text-muted);font-size:10px;">CONTA BANCÁRIA:</span>
                <div style="color:var(--text-main);font-size:11px;">${h.banco || 'Banco do Brasil Ag. 2211'}</div>
              </div>
            </div>

            <!-- Tabela dos Itens Discriminados (se houver) -->
            ${itens.length > 0 ? `
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:12px;margin-bottom:14px;">
              <!-- Coluna Vencimentos -->
              <div>
                <div style="font-size:11px;font-weight:700;color:var(--cyan);margin-bottom:6px;font-family:var(--font-mono);text-transform:uppercase;">
                  (+) Vencimentos & Vantagens:
                </div>
                <table class="data-table" style="font-size:11px;">
                  <tbody>
                    ${vencimentosItens.map(it => `
                      <tr>
                        <td>
                          ${it.cod ? `<span style="color:var(--text-dim);font-family:var(--font-mono);font-size:10px;">[${it.cod}] </span>` : ''}
                          <strong>${it.desc || it.nome}</strong>
                        </td>
                        <td class="val-col" style="color:var(--cyan);">${formatBRL(it.valor)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              <!-- Coluna Descontos -->
              <div>
                <div style="font-size:11px;font-weight:700;color:var(--rose);margin-bottom:6px;font-family:var(--font-mono);text-transform:uppercase;">
                  (-) Descontos & Retenções:
                </div>
                <table class="data-table" style="font-size:11px;">
                  <tbody>
                    ${descontosItens.map(it => `
                      <tr>
                        <td>
                          ${it.cod ? `<span style="color:var(--text-dim);font-family:var(--font-mono);font-size:10px;">[${it.cod}] </span>` : ''}
                          <strong>${it.desc || it.nome}</strong>
                        </td>
                        <td class="val-col" style="color:var(--rose);">- ${formatBRL(it.valor)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
            ` : `
            <div style="font-size:11.5px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:12px;">
              Holerite consolidado. Valores registrados no fluxo de caixa: Líquido ${formatBRL(h.liquido)}, FGTS ${formatBRL(h.fgts)}.
            </div>
            `}

            <!-- Ações do Holerite -->
            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border-dim);padding-top:10px;margin-top:10px;flex-wrap:wrap;gap:8px;">
              <span style="font-size:11px;color:var(--matrix-green);font-family:var(--font-mono);">
                ● Dados integrados no Fluxo de Caixa de <strong>${mesLabel} / ${anoLabel}</strong>
              </span>
              <div style="display:flex;gap:8px;">
                <button class="btn-matrix" style="font-size:11px;padding:4px 10px;" onclick="MatrixApp.navegarParaMes('${anoLabel}', '${mesLabel}')">
                  🚀 Ver no Fluxo de Caixa (${mesLabel}/${anoLabel})
                </button>
                <button class="btn-icon" title="Excluir este holerite" onclick="MatrixApp.excluirHolerite(${i})">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function toggleHoleriteAccordion(cardId) {
    const card = document.getElementById(cardId);
    if (card) {
      card.classList.toggle('open');
    }
  }

  function excluirHolerite(index) {
    const state = MatrixDB.getState();
    const h = state.holerites && state.holerites[index];
    const desc = h ? `${h.periodo} (${h.orgao})` : 'este holerite';
    if (confirm(`Deseja remover o registro de holerite de ${desc}?`)) {
      state.holerites.splice(index, 1);
      MatrixDB.saveState(state);
      renderHoleritesHistorico();
    }
  }

  // Inicializar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }


  // ========================================================
  // SIMULADOR & ADENDO APOSENTADORIA 2055 (TESOURO RENDA+)
  // ========================================================
  const SIMULADOR_2055_STORAGE_KEY = 'matrix_simulador_2055_params';
  let currentSim2055Meta = 2; // Padrão: 100% Poder de Compra

  const RELATORIO_APOSENTADORIA_2055_BASE = `# 📊 Relatório & Adendo de Aposentadoria 2055 (Tesouro Renda+)

> **Titular:** Matheus (USP - Técnico 1)  
> **Horizonte Temporal:** 2026 a 2055 (29 anos = 348 meses de acumulação)  
> **Período de Aposentadoria/Usufruto:** 240 meses (20 anos: 2055 a 2074)  
> **Idade em 2055:** 65 anos completos  

---

## 1. Premissas Macroeconômicas (2026 a 2055)

Para projetar 2055 (daqui a 29 anos), consideramos a mecânica oficial brasileira de reajuste do Salário Mínimo (inflação IPCA + ganho real do PIB):

* **Salário Mínimo Vigente (2026):** R\\$ 1.621,00
* **Salário Base USP Atual:** R\\$ 6.264,00 (equivalente a **3,864 salários mínimos**)
* **Saldo já existente em Tesouro Renda+ 2055:** R\\$ 1.318,89 (XP + Banco Inter)

---

## 2. Estimativa do Salário Mínimo em 2055

| Cenário | Inflação Média (IPCA) | Ganho Real Mínimo | Taxa Nominal Anual | Salário Mínimo 2055 (Nominal) | Salário Mínimo em Poder de Compra 2026 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| 🛡️ **Conservador** | 4,00% a.a. | 1,00% a.a. | **5,04% a.a.** | **R\\$ 6.746,36** | R\\$ 2.164,00 |
| 🚀 **Otimista** | 3,50% a.a. | 2,50% a.a. | **6,09% a.a.** | **R\\$ 8.995,91** | R\\$ 3.298,00 |
| ⚖️ **Mediano (Média)** | 3,75% a.a. | 1,75% a.a. | **5,57% a.a.** | **R\\$ 7.871,14** | **R\\$ 2.731,00** |

---

## 3. Estimativa da Evolução Salarial USP (Base R\\$ 6.264,00)

Mantendo a paridade de qualificação e carreira técnica da USP (3,864 vezes o salário mínimo nacional):

| Cenário | Salário Bruto USP 2055 (Nominal) | Poder de Compra em Reais de 2026 | Ganho Real Efetivo |
| :--- | :---: | :---: | :---: |
| 🛡️ **Conservador** | **R\\$ 26.069,84** | R\\$ 8.361,00 | +33% real |
| 🚀 **Otimista** | **R\\$ 34.762,74** | R\\$ 12.744,00 | +103% real |
| ⚖️ **Mediano** | **R\\$ 30.416,29** | **R\\$ 10.552,00** | **+68% real** |

---

## 4. O Raio-X das Perdas Salariais na Aposentadoria aos 65 Anos

> [!WARNING] O Efeito "Ilusão do Holerite": Na ativa, grande parte da sua renda mensal está em benefícios isentos e subsídios que desaparecem na inatividade.

Para permitir clareza absoluta de planejamento, calculamos o impacto em **valores reais de hoje (poder de compra de 2026)**:

### A. Provento Líquido de Partida na Aposentadoria (R$ 6.264,00 bruto):
* **Contribuição Previdenciária (INSS):** **R\\$ 0,00** (aposentados pelo INSS não sofrem desconto de previdência).
* **IRRF aos 65+ anos:** Pela Lei Federal nº 7.713/88, maiores de 65 anos têm direito a uma **parcela isenta adicional** mensal. Com deduções legais, o IRRF efetivo cai para cerca de **-R\\$ 220,00**.
* **Provento Inicial Líquido:** **R\\$ 6.044,00**.

### B. As 4 Grandes Perdas que ocorrem ao se Aposentar:
1. **Extinção do Auxílio-Saúde USP:** Perda direta de **-R\\$ 759,01/mês**.
2. **Explosão do Plano de Saúde Unimed aos 65 anos:**
   * Hoje (~36 anos), a mensalidade é de R\\$ 867,72 e custa líquido apenas R\\$ 108,71 (pois o auxílio de R\\$ 759 cobria a maior parte).
   * Pela regulação da ANS, a faixa etária de 59 anos ou mais multiplica o custo do plano por aproximadamente **3,2x** em relação à faixa de 35 anos.
   * Aos 65 anos, a Unimed custará cerca de **R\\$ 2.776,70/mês** (em poder de compra de hoje) e sairá **100% do seu bolso**.
   * **Aumento real do custo de saúde:** R\\$ 2.776,70 - R\\$ 108,71 = **-R\\$ 2.667,99/mês**.
3. **Perda Integral do VA e VR:**
   * VA (Maracaju 88): R\\$ 2.050,00
   * VR (Refeições de trabalho): ~R\\$ 1.300,00
   * **Total de Vales Perdidos:** **-R\\$ 3.350,00/mês** (alimentação do casal passa a sair integralmente do dinheiro em conta).
4. **Cessação do Depósito do FGTS:** Perda de **-R\\$ 501,12/mês** (8% que a USP depositava mensalmente na conta vinculada).

### 📉 Resultado Líquido Real na Aposentadoria:
* **Total de Perdas Mensais Reais:** **R\\$ 6.519,11/mês**
* **Sobra do Salário após pagar Unimed e Alimentação básica:**
  $$\\text{Provento Líquido (R\\$ 6.044)} - \\text{Unimed 65+ (R\\$ 2.777)} - \\text{Alimentação antes coberta por VA/VR (R\\$ 3.350)} = -\\mathbf{R\\$\\ 83,00}$$
> Sem previdência complementar ou investimentos, **o salário da aposentadoria não é suficiente sequer para pagar o plano de saúde e as compras de mercado habituais**.

---

## 5. Simulação Tesouro Direto Renda+ 2055

O **Tesouro Renda+ 2055** é o instrumento ideal porque:
1. É 100% corrigido pela inflação oficial (**IPCA**), mantendo o poder de compra real.
2. Acumula juros compostos por **29 anos** (348 meses).
3. Paga **240 parcelas mensais** (20 anos: de jan/2055 a dez/2074).
4. Taxa de custódia B3 zerada (para renda até 6 SMs).
5. Descontamos a alíquota mínima de 15% de IR sobre a rentabilidade real na saída.

Considerando as taxas de mercado atuais (**IPCA + 6,0% a.a.** e **IPCA + 6,5% a.a.**):

### 🎯 Cenário 1: Receber Mais um Salário Líquido Completo
* **Objetivo:** Renda mensal extra de **R\\$ 6.044,00/mês** (em poder de compra de hoje) por 20 anos.
* **Patrimônio acumulado necessário em 2055:** R\\$ 976.600,00
* **Aporte mensal necessário (a IPCA + 6,0% a.a.):** **R\\$ 1.068,01/mês**
* **Aporte mensal necessário (a IPCA + 6,5% a.a.):** **R\\$ 941,15/mês**

---

### 🛡️ Cenário 2: Recompor 100% do Poder de Compra
* **Objetivo:** Anular todas as perdas (cobrir a Unimed aos 65 anos, a perda do auxílio-saúde, do VA/VR e do FGTS), garantindo **R\\$ 6.519,11/mês** extras por 20 anos.
* **Patrimônio acumulado necessário em 2055:** R\\$ 1.053.370,00
* **Aporte mensal necessário (a IPCA + 6,0% a.a.):** **R\\$ 1.152,58/mês**
* **Aporte mensal necessário (a IPCA + 6,5% a.a.):** **R\\$ 1.015,78/mês**

---

### 🚀 Cenário 3: Recompor Poder de Compra + Ter o DOBRO de Dinheiro Disponível
* **Objetivo:** Cobrir todas as perdas anteriores (R\\$ 6.519,11) e ainda ter **R\\$ 4.960,00 a mais** de dinheiro 100% livre em conta todo mês (totalizando **R\\$ 11.479,11/mês** líquidos de renda extra no Renda+).
* **Patrimônio acumulado necessário em 2055:** R\\$ 1.854.820,00
* **Aporte mensal necessário (a IPCA + 6,0% a.a.):** **R\\$ 2.035,50/mês**
* **Aporte mensal necessário (a IPCA + 6,5% a.a.):** **R\\$ 1.794,92/mês**

---

## 6. Quadro Comparativo Consolidado

| Meta de Aposentadoria | Renda Mensal Renda+ (Poder de Compra Hoje) | Patrimônio em 2055 | Aporte Mensal (IPCA + 6,0%) | Aporte Mensal (IPCA + 6,5%) |
| :--- | :---: | :---: | :---: | :---: |
| 1️⃣ **+1 Salário Líquido USP** | R\\$ 6.044,00 | R\\$ 976,6 mil | **R\\$ 1.068,01** | **R\\$ 941,15** |
| 2️⃣ **Manter 100% do Poder de Compra** | R\\$ 6.519,11 | R\\$ 1,05 milhão | **R\\$ 1.152,58** | **R\\$ 1.015,78** |
| 3️⃣ **Manter P.C. + Dobro de Dinheiro Livre** | R\\$ 11.479,11 | R\\$ 1,85 milhão | **R\\$ 2.035,50** | **R\\$ 1.794,92** |

> [!TIP] Estratégia de Transição: Atualmente você já tem aportes de R\\$ 103/mês a R\\$ 260/mês no Renda+. Ao quitar parcelas e consignados no futuro, reencaminhe essas folgas para aproximar seu aporte da faixa de **R\\$ 1.015 a R\\$ 1.150/mês**, blindando sua aposentadoria contra o choque de saúde e perda de vales.
`;

  function abrirSimuladorAposentadoria2055(metaIdx = null) {
    const backdrop = document.getElementById('simulador2055ModalBackdrop');
    if (!backdrop) return;

    // Carregar preferências salvas se houver
    try {
      const saved = localStorage.getItem(SIMULADOR_2055_STORAGE_KEY);
      if (saved) {
        const params = JSON.parse(saved);
        if (params.puTitulo != null && document.getElementById('sim2055ValorTitulo')) {
          document.getElementById('sim2055ValorTitulo').value = params.puTitulo;
        }
        if (params.taxaReal != null && document.getElementById('sim2055TaxaReal')) {
          document.getElementById('sim2055TaxaReal').value = params.taxaReal;
        }
        if (params.rendaDesejada != null && document.getElementById('sim2055RendaDesejada')) {
          document.getElementById('sim2055RendaDesejada').value = params.rendaDesejada;
        }
        if (params.planoSaude != null && document.getElementById('sim2055PlanoSaude')) {
          document.getElementById('sim2055PlanoSaude').value = params.planoSaude;
        }
        if (params.vales != null && document.getElementById('sim2055Vales')) {
          document.getElementById('sim2055Vales').value = params.vales;
        }
        if (params.saldoAtual != null && document.getElementById('sim2055SaldoAtual')) {
          document.getElementById('sim2055SaldoAtual').value = params.saldoAtual;
        }
        if (params.meta != null) {
          currentSim2055Meta = params.meta;
        }
      }
    } catch (e) {}

    if (metaIdx != null) {
      setSim2055Meta(metaIdx);
    } else {
      setSim2055Meta(currentSim2055Meta);
    }

    openModal(backdrop);
    recalcularSimulador2055();
    atualizarCotacaoTesouro2055(false);
  }

  const TESOURO_2055_QUOTE_KEY = 'matrix_tesouro_2055_quote';

  async function atualizarCotacaoTesouro2055(force = false) {
    const lbl = document.getElementById('sim2055QuoteLabel');
    if (!force) {
      try {
        const cached = localStorage.getItem(TESOURO_2055_QUOTE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          const ageHours = (Date.now() - (parsed.timestamp || 0)) / (1000 * 60 * 60);
          if (ageHours < 24 && parsed.pu && parsed.taxa) {
            aplicarCotacaoTesouroNoSimulador(parsed);
            return parsed;
          }
        }
      } catch (e) {}
    }

    if (lbl) lbl.textContent = 'Consultando Tesouro Direto... ⏳';

    let quote = null;
    try {
      const cfg = typeof SyncEngine !== 'undefined' ? SyncEngine.getConfig() : null;
      if (cfg && cfg.cloudUrl) {
        const sep = cfg.cloudUrl.includes('?') ? '&' : '?';
        const target = `${cfg.cloudUrl}${sep}action=get_tesouro_2055&token=${encodeURIComponent(cfg.cloudToken)}&_t=${Date.now()}`;
        const res = await fetch(target, { method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json && json.success && json.data) {
            quote = json.data;
          }
        }
      }
    } catch (err) {}

    if (!quote || !quote.pu) {
      quote = {
        pu: 466.07,
        taxa: 6.50,
        fonte: 'Tesouro Direto (Oficial)',
        timestamp: Date.now(),
        dataStr: new Date().toLocaleDateString('pt-BR')
      };
    } else {
      quote.timestamp = Date.now();
      quote.dataStr = new Date().toLocaleDateString('pt-BR');
    }

    try {
      localStorage.setItem(TESOURO_2055_QUOTE_KEY, JSON.stringify(quote));
    } catch (e) {}

    aplicarCotacaoTesouroNoSimulador(quote);
    return quote;
  }

  function aplicarCotacaoTesouroNoSimulador(quote) {
    const lbl = document.getElementById('sim2055QuoteLabel');
    if (lbl) {
      lbl.textContent = `PU ${formatBRL(quote.pu)} • Taxa: IPCA + ${quote.taxa.toString().replace('.', ',')}% a.a. (${quote.dataStr || 'Hoje'})`;
    }
    const inpPu = document.getElementById('sim2055ValorTitulo');
    if (inpPu && (!inpPu.value || inpPu.value === '466.07' || inpPu.value === '465.67')) {
      inpPu.value = quote.pu;
    }
    const inpTaxa = document.getElementById('sim2055TaxaReal');
    if (inpTaxa && (!inpTaxa.value || inpTaxa.value === '6.5' || inpTaxa.value === '6.45')) {
      inpTaxa.value = quote.taxa;
    }
    recalcularSimulador2055();
  }

  function setSim2055Meta(metaIdx) {
    currentSim2055Meta = metaIdx;
    [1, 2, 3, 4].forEach(idx => {
      const btn = document.getElementById('btnSimMeta' + idx);
      if (btn) {
        if (idx === metaIdx) {
          btn.className = 'btn-matrix primary';
        } else {
          btn.className = 'btn-matrix';
        }
      }
    });

    const rendaInp = document.getElementById('sim2055RendaDesejada');
    const labelMeta = document.getElementById('sim2055LabelMeta');

    if (metaIdx === 1) {
      if (rendaInp) rendaInp.value = 6044;
      if (labelMeta) labelMeta.textContent = 'Meta 1: +1 Salário Líquido USP (R$ 6.044,00)';
    } else if (metaIdx === 2) {
      if (rendaInp) rendaInp.value = 6519;
      if (labelMeta) labelMeta.textContent = 'Meta 2: Recompor 100% Poder de Compra (R$ 6.519,11)';
    } else if (metaIdx === 3) {
      if (rendaInp) rendaInp.value = 11479;
      if (labelMeta) labelMeta.textContent = 'Meta 3: Poder de Compra + Dobro de Dinheiro Livre (R$ 11.479,11)';
    } else if (metaIdx === 4) {
      if (labelMeta) labelMeta.textContent = 'Meta 4: Renda Personalizada';
    }

    recalcularSimulador2055();
  }

  function onSim2055CustomRendaInput() {
    currentSim2055Meta = 4;
    [1, 2, 3].forEach(idx => {
      const btn = document.getElementById('btnSimMeta' + idx);
      if (btn) btn.className = 'btn-matrix';
    });
    const btn4 = document.getElementById('btnSimMeta4');
    if (btn4) btn4.className = 'btn-matrix primary';
    const labelMeta = document.getElementById('sim2055LabelMeta');
    if (labelMeta) labelMeta.textContent = 'Meta 4: Renda Personalizada';
    recalcularSimulador2055();
  }

  function fecharSimuladorAposentadoria2055() {
    closeModal('simulador2055ModalBackdrop');
  }

  function recalcularSimulador2055() {
    const puTitulo = parseFloat(document.getElementById('sim2055ValorTitulo')?.value) || 466.07;
    const taxaRealAnual = (parseFloat(document.getElementById('sim2055TaxaReal')?.value) || 6.5) / 100;
    const rendaDesejada = parseFloat(document.getElementById('sim2055RendaDesejada')?.value) || 6519.11;
    const saldoAtualRenda = parseFloat(document.getElementById('sim2055SaldoAtual')?.value) || 1318.89;

    const mesesAcumulacao = 348; // 29 anos (2026 a dez/2054)
    const mesesUsufruto = 240;   // 20 anos (jan/2055 a dez/2074)

    // Taxa mensal real
    const rMes = Math.pow(1 + taxaRealAnual, 1 / 12) - 1;

    // Fator de IR (15% sobre os ganhos de capital reais no resgate)
    const fatorIr = 0.875;
    const rendaBrutaNecessaria = rendaDesejada / fatorIr;

    // Valor presente dos 240 saques mensais (patrimônio em jan/2055)
    const vpSaques = rendaBrutaNecessaria * (1 - Math.pow(1 + rMes, -mesesUsufruto)) / rMes;

    // Saldo já existente renderá pelos 348 meses
    const fvSaldoAtual = saldoAtualRenda * Math.pow(1 + rMes, mesesAcumulacao);
    const saldoLiquidoAcumular = Math.max(0, vpSaques - fvSaldoAtual);

    // Fator de acumulação para aportes mensais
    const fatorAcum = (Math.pow(1 + rMes, mesesAcumulacao) - 1) / rMes;
    const aporteMensal = saldoLiquidoAcumular / fatorAcum;

    // Quantidade de Títulos / Cotas calculada pelo Preço Unitário (PU)
    const titulosPorMes = puTitulo > 0 ? (aporteMensal / puTitulo) : 0;
    const totalTitulosAcumulados = puTitulo > 0 ? (vpSaques / puTitulo) : 0;

    // Atualiza KPIs visuais
    const elAporte = document.getElementById('simResAporteMensal');
    const elTitulosMes = document.getElementById('simResTitulosMes');
    const elTotalTitulos = document.getElementById('simResTotalTitulos');
    const elMontanteFinal = document.getElementById('simResMontanteFinal');

    if (elAporte) elAporte.textContent = formatBRL(aporteMensal);
    if (elTitulosMes) elTitulosMes.textContent = (titulosPorMes).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' títulos';
    if (elTotalTitulos) elTotalTitulos.textContent = (totalTitulosAcumulados).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' cotas';
    if (elMontanteFinal) elMontanteFinal.textContent = formatBRL(vpSaques);

    // Auto-save imediato dos parâmetros da simulação 2055
    try {
      const params = {
        puTitulo,
        taxaReal: parseFloat(document.getElementById('sim2055TaxaReal')?.value) || 6.5,
        rendaDesejada,
        planoSaude: parseFloat(document.getElementById('sim2055PlanoSaude')?.value) || 2776.70,
        vales: parseFloat(document.getElementById('sim2055Vales')?.value) || 3350.00,
        saldoAtual: saldoAtualRenda,
        meta: currentSim2055Meta,
        salvoEm: new Date().toISOString()
      };
      localStorage.setItem(SIMULADOR_2055_STORAGE_KEY, JSON.stringify(params));
    } catch (e) {}
  }

  function salvarParametrosSimulador2055() {
    const params = {
      puTitulo: parseFloat(document.getElementById('sim2055ValorTitulo')?.value) || 466.07,
      taxaReal: parseFloat(document.getElementById('sim2055TaxaReal')?.value) || 6.5,
      rendaDesejada: parseFloat(document.getElementById('sim2055RendaDesejada')?.value) || 6519.11,
      planoSaude: parseFloat(document.getElementById('sim2055PlanoSaude')?.value) || 2776.70,
      vales: parseFloat(document.getElementById('sim2055Vales')?.value) || 3350.00,
      saldoAtual: parseFloat(document.getElementById('sim2055SaldoAtual')?.value) || 1318.89,
      meta: currentSim2055Meta,
      salvoEm: new Date().toISOString()
    };

    try {
      localStorage.setItem(SIMULADOR_2055_STORAGE_KEY, JSON.stringify(params));
      alert('Parâmetros da simulação salvos com sucesso! O simulador manterá suas preferências sempre que for aberto.');
    } catch (e) {
      alert('Erro ao salvar no dispositivo: ' + e.message);
    }
  }

  function baixarRelatorioAposentadoria2055() {
    const puTitulo = document.getElementById('sim2055ValorTitulo')?.value || '466,07';
    const taxaReal = document.getElementById('sim2055TaxaReal')?.value || '6,5';
    const renda = document.getElementById('sim2055RendaDesejada')?.value || '6.519,11';
    const aporte = document.getElementById('simResAporteMensal')?.textContent || 'R$ 1.015,78';
    const montante = document.getElementById('simResMontanteFinal')?.textContent || 'R$ 1.053.372,00';
    const dataHora = new Date().toLocaleString('pt-BR');

    let customHeader = '<!-- \n' +
      '  RELATÓRIO & ADENDO APOSENTADORIA 2055 (TESOURO RENDA+)\n' +
      '  Exportado diretamente do App Matrix Finance\n' +
      '  Data da Exportação: ' + dataHora + '\n' +
      '  Preço Unitário (PU) Considerado: R$ ' + puTitulo + '\n' +
      '  Taxa Real Contratada: IPCA + ' + taxaReal + '% a.a.\n' +
      '  Renda Mensal Desejada: R$ ' + renda + '/mês por 20 anos\n' +
      '  Aporte Mensal Calculado: ' + aporte + '/mês\n' +
      '  Patrimônio Projetado em 2055: ' + montante + '\n' +
      '-->\n\n';

    const fullContent = customHeader + RELATORIO_APOSENTADORIA_2055_BASE;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/markdown;charset=utf-8,' + encodeURIComponent(fullContent));
    element.setAttribute('download', 'adendo-investimentos-aposentadoria-2055-' + new Date().toISOString().slice(0, 10) + '.md');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  function imprimirRelatorioAposentadoria2055() {
    const puTitulo = document.getElementById('sim2055ValorTitulo')?.value || '466,07';
    const taxaReal = document.getElementById('sim2055TaxaReal')?.value || '6,5';
    const renda = document.getElementById('sim2055RendaDesejada')?.value || '6.519,11';
    const aporte = document.getElementById('simResAporteMensal')?.textContent || 'R$ 1.015,78';
    const montante = document.getElementById('simResMontanteFinal')?.textContent || 'R$ 1.053.372,00';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir o relatório.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Aposentadoria 2055 - Tesouro Renda+</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; color: #111; line-height: 1.6; padding: 25px; max-width: 800px; margin: 0 auto; }
          h1, h2, h3 { color: #059669; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px; }
          th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
          th { background: #f0fdf4; color: #047857; font-weight: bold; }
          .highlight { background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px; margin: 15px 0; border-radius: 4px; }
          .kpi-box { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 15px 0; }
          .kpi { border: 1px solid #10b981; border-radius: 6px; padding: 10px; background: #f0fdf4; }
          .kpi-title { font-size: 11px; color: #6b7280; font-weight: bold; text-transform: uppercase; }
          .kpi-val { font-size: 18px; color: #047857; font-weight: 800; margin-top: 4px; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; display: flex; gap: 10px;">
          <button onclick="window.print()" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:4px;font-weight:bold;cursor:pointer;">🖨️ Imprimir / Salvar como PDF</button>
          <button onclick="window.close()" style="background:#e5e7eb;color:#374151;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;">Fechar</button>
        </div>
        <h1>📊 Relatório & Adendo de Aposentadoria 2055</h1>
        <p><strong>Titular:</strong> Matheus • USP São Carlos | <strong>Horizonte:</strong> 2026 a 2055 (29 anos de acumulação) | <strong>Fase de Usufruto:</strong> 2055 a 2074 (20 anos)</p>
        
        <div class="kpi-box">
          <div class="kpi">
            <div class="kpi-title">Renda Mensal Real (20 anos)</div>
            <div class="kpi-val">R$ ${renda}</div>
          </div>
          <div class="kpi">
            <div class="kpi-title">Aporte Mensal Necessário</div>
            <div class="kpi-val">${aporte}</div>
          </div>
          <div class="kpi">
            <div class="kpi-title">Patrimônio Acumulado</div>
            <div class="kpi-val">${montante}</div>
          </div>
        </div>

        <div class="highlight">
          <strong>Parâmetros Considerados:</strong> Preço Unitário (PU) do Título: R$ ${puTitulo} | Taxa Real: IPCA + ${taxaReal}% a.a. | Salário Base USP: R$ 6.264,00 | Perdas na Aposentadoria (Unimed 65+ R$ 2.776,70 + Vales R$ 3.350,00 + Aux. Saúde R$ 759,01 + FGTS R$ 501,12).
        </div>

        <h3>1. Projeção Salário Mínimo e Carreira USP (2055)</h3>
        <table>
          <tr><th>Cenário</th><th>Salário Mínimo 2055</th><th>Salário Bruto USP 2055</th><th>Poder de Compra Real</th></tr>
          <tr><td>🛡️ Conservador</td><td>R$ 6.746,36</td><td>R$ 26.069,84</td><td>R$ 8.361,00 (+33%)</td></tr>
          <tr><td>🚀 Otimista</td><td>R$ 8.995,91</td><td>R$ 34.762,74</td><td>R$ 12.744,00 (+103%)</td></tr>
          <tr><td>⚖️ Mediano</td><td>R$ 7.871,14</td><td>R$ 30.416,29</td><td>R$ 10.552,00 (+68%)</td></tr>
        </table>

        <h3>2. Quadro Comparativo das Metas do Tesouro Renda+ 2055</h3>
        <table>
          <tr><th>Meta de Aposentadoria</th><th>Renda Mensal Real</th><th>Aporte Mensal (IPCA + 6,0%)</th><th>Aporte Mensal (IPCA + 6,5%)</th></tr>
          <tr><td>1️⃣ +1 Salário Líquido USP</td><td>R$ 6.044,00</td><td>R$ 1.068,01</td><td>R$ 941,15</td></tr>
          <tr><td>2️⃣ Manter 100% Poder de Compra</td><td>R$ 6.519,11</td><td>R$ 1.152,58</td><td>R$ 1.015,78</td></tr>
          <tr><td>3️⃣ P.C. + Dobro de Dinheiro Livre</td><td>R$ 11.479,11</td><td>R$ 2.035,50</td><td>R$ 1.794,92</td></tr>
        </table>
        
        <p style="font-size:11px;color:#6b7280;margin-top:20px;">Relatório emitido automaticamente pelo Matrix Finance 360.</p>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  return {
    init,
    changeMonth,
    goToCurrentRealMonth,
    promptAddNewYear,
    populateYearSelector,
    togglePaid,
    togglePaidByIndex,
    removeItem,
    removeItemByIndex,
    openNewItemModal,
    editItemModal,
    editItemByIndex,
    saveItemFromModal,
    openModal,
    closeModal,
    toggleScenarioActive,
    removeScenario,
    openScenarioModal,
    saveScenarioFromModal,
    maskMesAno,
    formatMesAnoBR,
    parseMesAnoBR,
    formatDataBR,
    toggleScenarioModalParcelas,
    addNewScenarioPrompt,
    toggleCalendarDay,
    aplicarCaronasNoMes,
    navCalendarMonth,
    onCalMonthChange,
    onCalYearChange,
    resetCalendarToCurrent,
    renderCalendar,
    simularAmortizacao,
    onChangeTipoSimulacao,
    updateCustomAmortItem,
    preencherCustomLote,
    limparCustomLote,
    toggleTabelaAnual,
    salvarSimulacaoAtualPrompt,
    renderSimulacoesSalvas,
    carregarSimulacao,
    excluirSimulacao,
    baixarRelatorioPDF,
    baixarRelatorioPDFAtual,
    renderFinancing,
    renderInvestments,
    setInvestFilter,
    toggleInvestAgrupamento,
    toggleGroupExpand,
    openNewInvestmentModal,
    openEditInvestmentModal,
    salvarInvestimentoModal,
    openAporteModal,
    openResgateModal,
    onChangeOperacaoTipo,
    confirmarOperacaoInvestimento,
    openAtualizarCotacaoModal,
    salvarCotacaoAcaoModal,
    excluirInvestimento,
    saveCloudSettings,
    copiarCodigoAppsScript,
    testCloudConnection,
    forceSyncToCloud,
    forceFetchFromCloud,
    downloadBackupFile,
    importBackupFile,
    copiarBackupClipboard,
    colarBackupClipboard,
    salvarHoleriteManual,
    salvarConfigSatellites,
    executarScrapingSatellites,
    abrirDrilldown,
    abrirRaioXSimulador,
    navegarParaMes,
    renderMonthlyHorizonCards,
    renderHoleritesHistorico,
    toggleHoleriteAccordion,
    excluirHolerite,
    onModalContaChange,
    onModalRendaChange,
    onModalTitularChange,
    toggleModalInvestSubFields,
    onModalInvestModoChange,
    updateModalInvestPreview,
    isFaturasItem,
    alertFaturasReadOnly,
    openQuickExpenseModal,
    saveQuickExpense,
    onQuickExpenseCategoriaChange,
    onModalCategoriaChange,
    editQuickExpenseByIndex,
    removeQuickExpenseByIndex,
    renderRevisaoAnualDezembro,
    exportarRelatorioDezembro,
    installPWA,
    baixarAppDireto,
    getNomeEstudio,
    salvarNomeEstudio,
    promptAlterarNomeEstudio,
    getFaturaNubankMes,
    getBeneficiosCreditoMes,
    getGanhosScarletMes,
    getOutrasRendasScarletMes,
    getDescOutrasRendasScarletMes,
    isReceitaDaScarlet,
    isOutraRendaDaScarlet,
    isReceitaExtraMatheus,
    calcSobraMatheus,
    isGastoDaScarlet,
    isTransferenciaParaScarlet,
    setSimuladorVisao,
    sincronizarMaracajuAgora,
    salvarSaldoAtualMaracajuInline,
    toggleEmprestimoParcelas,
    openEditSaldosModal,
    salvarSaldosModal,
    toggleFaturaNubankPaga,
    abrirModalEditarDia,
    abrirCalendarioParaCaronas,
    syncCaronasWithCalendar,
    isCaronaItem,
    getCaronasProvisionSummary,
    preencherGastoRapido,
    renderQuickExpenseButtons,
    getTopQuickExpenses,
    lancarCaronaRapidaHoje,
    salvarStatusDiaCalendario,
    switchTab,
    initSwipeNavigation,
    abrirSimuladorAposentadoria2055,
    setSim2055Meta,
    onSim2055CustomRendaInput,
    fecharSimuladorAposentadoria2055,
    populateModalEmprestimoMeses,
    onEmprestimoModalidadeChange,
    recalcEmprestimoParcelaSugestao,
    recalcularHoleriteManualLiquido,
    isConsignadoFolhaJaDescontado,
    isConsignadoFolhaItem,
    recalcularSimulador2055,
    salvarParametrosSimulador2055,
    baixarRelatorioAposentadoria2055,
    imprimirRelatorioAposentadoria2055,
    atualizarCotacaoTesouro2055
  };
})();

if (typeof window !== 'undefined') {
  window.MatrixApp = MatrixApp;
}
