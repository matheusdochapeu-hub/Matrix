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

  function init() {
    populateYearSelector();
    setupEventListeners();
    updateMonthDisplay();
    renderAll();
    renderHoleritesHistorico();

    // Inicialização ultra-rápida (instantânea da memória/disco local)
    // As chamadas em nuvem rodam em segundo plano sem bloquear a interface
    setTimeout(() => {
      const cfg = SyncEngine.getConfig();
      if (cfg.cloudUrl) {
        SyncEngine.fetchFromCloud().then(res => {
          if (res.success && res.data) {
            populateYearSelector();
            renderAll();
          }
        });
      }

      // Scraping dos satélites em segundo plano
      const satCfg = SatelliteConnectors.getSatelliteConfig();
      if (satCfg.autoScrapeOnOpen) {
        executarScrapingSatellites(true);
      }
    }, 50);

    // Monitorar conectividade de rede em tempo real
    window.addEventListener('online', () => {
      SyncEngine.updateStatusUI('synced', 'Conexão restabelecida');
    });
    window.addEventListener('offline', () => {
      SyncEngine.updateStatusUI('offline', 'Sem conexão com a internet');
    });
  }

  function populateYearSelector() {
    const yearSelect = document.getElementById('yearSelect');
    if (!yearSelect) return;

    const allYears = MatrixDB.getAllYears();
    if (!allYears.includes(String(currentYear))) {
      allYears.push(String(currentYear));
      allYears.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    }

    yearSelect.innerHTML = allYears.map(y => {
      let label = y;
      if (y === '2025') label = '2025 (Histórico)';
      else if (y === '2026') label = '2026 (Atual)';
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
    const years = MatrixDB.getAllYears().map(y => parseInt(y, 10));
    const nextYearSuggestion = String(Math.max(...years) + 1);
    const novoAno = prompt('Informe o ano que deseja planejar e projetar (ex: 2028, 2029):', nextYearSuggestion);
    if (!novoAno || isNaN(parseInt(novoAno, 10))) return;

    const anoStr = String(parseInt(novoAno, 10));
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
    // Month navigation
    document.getElementById('prevMonthBtn').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonthBtn').addEventListener('click', () => changeMonth(1));

    // Year selection
    const yearSelect = document.getElementById('yearSelect');
    if (yearSelect) {
      yearSelect.addEventListener('change', (e) => {
        currentYear = e.target.value;
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

    // Modal listeners
    setupModalListeners();
    setupHoleriteDropzone();
  }

  function changeMonth(direction) {
    let idx = MONTH_NAMES.indexOf(currentMonth);
    idx += direction;
    if (idx < 0) {
      idx = 11;
      currentYear = String(parseInt(currentYear, 10) - 1);
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

  function updateMonthDisplay() {
    const el = document.getElementById('currentMonthDisplay');
    if (el) el.textContent = `${currentMonth} / ${currentYear}`;
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
  }

  // ==========================================
  // ÁREA INICIAL: CARDS MENSAIS (RENDA CONJUNTA)
  // ==========================================
  function renderMonthlyHorizonCards() {
    const gridEl = document.getElementById('monthlyHorizonCardsGrid');
    if (!gridEl) return;

    const curY = parseInt(currentYear, 10);
    const curMIdx = MONTH_NAMES.indexOf(currentMonth);

    // Gerar sequência de 6 meses (do mês anterior até 4 meses adiante)
    const monthsSequence = [];
    for (let offset = -1; offset <= 4; offset++) {
      let targetMIdx = curMIdx + offset;
      let targetY = curY;
      if (targetMIdx < 0) {
        targetMIdx += 12;
        targetY -= 1;
      } else if (targetMIdx > 11) {
        targetMIdx -= 12;
        targetY += 1;
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

      // 1. Salário Matheus (USP Líquido)
      let salMatheus = 5788.19;
      const hol = (state.holerites || []).find(h => (h.ano === m.ano && h.mesNome === m.mes) || h.periodo === `${m.ano}-${m.mes}`);
      if (hol && hol.liquido) {
        salMatheus = hol.liquido;
      } else {
        const recSal = (monthData.receitas || []).find(r => (r.nome || '').toLowerCase().includes('salário') || (r.id && r.id.startsWith('rec_sal')));
        if (recSal) salMatheus = parseFloat(recSal.valor) || salMatheus;
      }

      // 2. Ganhos Scarlet (FisioFlow)
      let salScarlet = 1100.00;
      if (monthData.scarlet && monthData.scarlet.ganhos) {
        salScarlet = parseFloat(monthData.scarlet.ganhos) || salScarlet;
      } else {
        const recFisio = (monthData.receitas || []).find(r => (r.nome || '').toLowerCase().includes('scarlet') || (r.nome || '').toLowerCase().includes('fisio'));
        if (recFisio) salScarlet = parseFloat(recFisio.valor) || salScarlet;
      }

      // 3. Vale Alimentação - VA (Maracaju 88)
      const va = 2050.00;

      // 4. Vale Refeição - VR (calculado pelo calendário USP ou R$ 1.235)
      let vr = 1235.00;
      try {
        const customLeaves = (state.calendarioCustom && state.calendarioCustom.folgas) || [];
        const commute = CalendarEngine.calculateCommuteAndVR(parseInt(m.ano, 10), m.mesIdx + 1, customLeaves);
        if (commute && commute.totalVR) vr = commute.totalVR;
      } catch (e) {}

      // 5. Outros Ganhos (13º Salário, Estúdio, etc.)
      let outrosGanhos = 0;
      let outrosLabel = '';
      (monthData.receitas || []).forEach(r => {
        const n = (r.nome || '').toLowerCase();
        if (!n.includes('salário') && !n.includes('scarlet') && !n.includes('fisio') && !n.includes('va') && !n.includes('alimentação') && !n.includes('vr') && !n.includes('refeição')) {
          const val = parseFloat(r.valor) || 0;
          outrosGanhos += val;
          if (val > 0 && !outrosLabel) outrosLabel = r.nome;
        }
      });

      // Renda Total Conjunta do Casal
      const rendaTotalConjunta = salMatheus + salScarlet + va + vr + outrosGanhos;

      // Gastos Fixos e Variáveis do mês
      const fixos = (monthData.fixos || []).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
      const outros = (monthData.outros || []).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
      const totalGastos = fixos + outros;
      const sobraConjunta = rendaTotalConjunta - totalGastos;

      return `
        <div class="month-horizon-card ${isCurrent ? 'active-month' : ''}" onclick="MatrixApp.navegarParaMes('${m.ano}', '${m.mes}')" title="Clique para abrir e gerenciar ${m.mes}/${m.ano}">
          <div>
            <div class="horizon-month-name">📅 ${m.mes} / ${m.ano}</div>
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;font-family:var(--font-mono);">Renda Conjunta do Casal:</div>
            <div class="horizon-total-renda">${formatBRL(rendaTotalConjunta)}</div>

            <!-- Diferenciação das Fontes de Renda -->
            <div style="margin-top:6px;">
              <div class="horizon-breakdown-row">
                <span>👨‍💼 <strong>Salário Matheus (USP)</strong></span>
                <span style="color:var(--text-main);font-weight:600;">${formatBRL(salMatheus)}</span>
              </div>
              <div class="horizon-breakdown-row">
                <span>👩‍⚕️ <strong>Ganhos Scarlet (Fisio)</strong></span>
                <span style="color:var(--cyan);font-weight:600;">${formatBRL(salScarlet)}</span>
              </div>
              <div class="horizon-breakdown-row">
                <span>🥗 <strong>Vale Alimentação (VA)</strong></span>
                <span style="color:var(--matrix-green);">${formatBRL(va)}</span>
              </div>
              <div class="horizon-breakdown-row">
                <span>🍽️ <strong>Vale Refeição (VR USP)</strong></span>
                <span style="color:var(--cyan);">${formatBRL(vr)}</span>
              </div>
              ${outrosGanhos > 0 ? `
              <div class="horizon-breakdown-row" style="color:var(--matrix-green-glow);">
                <span>🎁 <strong>${outrosLabel || 'Outros (13º/Estúdio)'}</strong></span>
                <span style="color:var(--matrix-green);font-weight:700;">+ ${formatBRL(outrosGanhos)}</span>
              </div>` : ''}
            </div>
          </div>

          <div class="horizon-bottom-bar">
            <span>Gastos: <strong style="color:var(--rose);">${formatBRL(totalGastos)}</strong></span>
            <span>Sobra: <strong style="color:${sobraConjunta >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};">${formatBRL(sobraConjunta)}</strong></span>
          </div>
        </div>
      `;
    }).join('');

    gridEl.innerHTML = cardsHtml;
  }

  // ==========================================
  // 1. KPIS & CARDS DE TOPO
  // ==========================================
  function renderKPIs() {
    const state = MatrixDB.getState();
    const monthData = MatrixDB.getMonth(currentYear, currentMonth);

    // Ganhos
    let ganhos = 0;
    if (monthData.receitas && monthData.receitas.length > 0) {
      ganhos = monthData.receitas.reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
    } else if (monthData.totais && monthData.totais['Subtotal Ganhos']) {
      ganhos = parseFloat(monthData.totais['Subtotal Ganhos']) || 0;
    } else if (monthData.totais && monthData.totais['Salário Mensal']) {
      ganhos = parseFloat(monthData.totais['Salário Mensal']) || 0;
      if (monthData.totais['Estúdio']) ganhos += parseFloat(monthData.totais['Estúdio']) || 0;
      if (monthData.totais['13º']) ganhos += parseFloat(monthData.totais['13º']) || 0;
    } else {
      ganhos = 5788.19;
    }

    // Gastos Fixos
    const fixos = (monthData.fixos || []).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
    // Gastos Outros/Variáveis
    const outros = (monthData.outros || []).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
    // Contas início de ano
    let contasInicio = 0;
    if (currentMonth === 'Janeiro' && monthData.totais && monthData.totais['Contas Inicio Ano']) {
      contasInicio = parseFloat(monthData.totais['Contas Inicio Ano']) || 0;
    }

    const totalGastos = fixos + outros + contasInicio;
    const saldoLivre = ganhos - totalGastos;

    // Fatura Nubank Black e Ganhos da Scarlet do mês
    const faturaNubank = (monthData.scarlet && monthData.scarlet.faturaNubank) || 4500.00;
    const ganhosScarlet = (monthData.scarlet && monthData.scarlet.ganhos) || 1100.00;
    const sobraFatura = Math.max(0, faturaNubank - ganhosScarlet);

    const faturaEl = document.getElementById('kpiFatura');
    if (faturaEl) faturaEl.textContent = formatBRL(faturaNubank);

    const faturaSubEl = document.getElementById('kpiFaturaSub');
    if (faturaSubEl) {
      faturaSubEl.textContent = `Scarlet recebe ~${formatBRL(ganhosScarlet)} • Sobra ${formatBRL(sobraFatura)}`;
    }

    // Dívida Caixa
    const dividaCaixa = (state.financiamentoCaixa && state.financiamentoCaixa.saldoDevedor) || 157884.49;

    document.getElementById('kpiGanhos').textContent = formatBRL(ganhos);
    document.getElementById('kpiFixos').textContent = formatBRL(fixos);
    document.getElementById('kpiOutros').textContent = formatBRL(outros);
    
    const saldoEl = document.getElementById('kpiSaldo');
    saldoEl.textContent = formatBRL(saldoLivre);
    saldoEl.style.color = saldoLivre >= 0 ? 'var(--matrix-green)' : 'var(--rose)';

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

      let ganhos = 0;
      if (monthData.receitas && monthData.receitas.length > 0) {
        ganhos = monthData.receitas.reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
      } else if (monthData.totais && monthData.totais['Subtotal Ganhos']) {
        ganhos = parseFloat(monthData.totais['Subtotal Ganhos']) || 0;
      } else if (monthData.totais && monthData.totais['Salário Mensal']) {
        ganhos = parseFloat(monthData.totais['Salário Mensal']) || 0;
        if (monthData.totais['Estúdio']) ganhos += parseFloat(monthData.totais['Estúdio']) || 0;
        if (monthData.totais['13º']) ganhos += parseFloat(monthData.totais['13º']) || 0;
      } else {
        ganhos = 5788.19;
      }

      const fixos = (monthData.fixos || []).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
      const outros = (monthData.outros || []).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
      let contasInicio = 0;
      if (currentMonth === 'Janeiro' && monthData.totais && monthData.totais['Contas Inicio Ano']) {
        contasInicio = parseFloat(monthData.totais['Contas Inicio Ano']) || 0;
      }

      const totalGastos = fixos + outros + contasInicio;
      const saldo = ganhos - totalGastos;

      html = `
        <div style="font-family:var(--font-mono);font-size:12.5px;line-height:1.9;">
          <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:14px;border-radius:var(--radius-sm);margin-bottom:14px;">
            <div style="color:var(--text-muted);font-size:11px;text-transform:uppercase;margin-bottom:6px;">Fórmula de Fechamento do Mês:</div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--cyan);">(+) Total de Ganhos:</span>
              <strong>${formatBRL(ganhos)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--amber);">(-) Gastos Fixos:</span>
              <span>- ${formatBRL(fixos)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--rose);">(-) Gastos Variáveis & Aportes:</span>
              <span>- ${formatBRL(outros)}</span>
            </div>
            ${contasInicio > 0 ? `
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--amber);">(-) Contas Início de Ano (Janeiro):</span>
              <span>- ${formatBRL(contasInicio)}</span>
            </div>` : ''}
            <div style="border-top:1px solid var(--border-dim);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-size:14px;">
              <strong style="color:var(--text-main);">(=) Saldo Livre / Folga:</strong>
              <strong style="color:${saldo >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};">${formatBRL(saldo)}</strong>
            </div>
          </div>
          <p style="color:var(--text-muted);font-size:11px;line-height:1.6;">
            💡 <strong>Referência:</strong> Este cálculo é <strong>exclusivo do mês de ${periodLabel}</strong> da sua planilha real. 
            Ele indica exatamente a margem líquida que você tem para manobrar no mês após honrar todos os compromissos fixos e aportes planejados.
          </p>
        </div>
      `;

    } else if (tipo === 'ganhos') {
      titleEl.innerHTML = `📥 Detalhamento de Ganhos (${periodLabel})`;
      const itens = (monthData.receitas && monthData.receitas.length > 0)
        ? monthData.receitas
        : [];

      html = `
        <div style="font-family:var(--font-mono);font-size:12px;">
          <table class="data-table" style="margin-bottom:14px;">
            <thead>
              <tr>
                <th>Fonte de Receita</th>
                <th>Status</th>
                <th style="text-align:right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${itens.map(it => `
                <tr>
                  <td>
                    <strong>${it.nome}</strong>
                    <div style="font-size:10px;color:var(--text-dim);">${it.categoria || 'Receita'}</div>
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
          <div style="font-size:11px;color:var(--text-muted);">
            Valores computados conforme lançamentos e receitas cadastradas para o mês de ${periodLabel}.
          </div>
        </div>
      `;

    } else if (tipo === 'fixos') {
      titleEl.innerHTML = `🔒 Detalhamento dos Gastos Fixos (${periodLabel})`;
      const fixos = monthData.fixos || [];
      const total = fixos.reduce((a, b) => a + (parseFloat(b.valor) || 0), 0);

      html = `
        <div style="font-family:var(--font-mono);font-size:12px;">
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
            <strong style="color:var(--amber);">${formatBRL(total)}</strong>
          </div>
        </div>
      `;

    } else if (tipo === 'outros') {
      titleEl.innerHTML = `🛍️ Detalhamento dos Gastos Variáveis & Aportes (${periodLabel})`;
      const outros = monthData.outros || [];
      const total = outros.reduce((a, b) => a + (parseFloat(b.valor) || 0), 0);

      html = `
        <div style="font-family:var(--font-mono);font-size:12px;">
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
            <strong style="color:var(--rose);">${formatBRL(total)}</strong>
          </div>
        </div>
      `;

    } else if (tipo === 'fatura') {
      titleEl.innerHTML = `💳 Fatura Nubank Black & Auditoria de Economia (${periodLabel})`;
      const faturaNubank = (monthData.scarlet && monthData.scarlet.faturaNubank) || 4500.00;
      const ganhosScarlet = (monthData.scarlet && monthData.scarlet.ganhos) || 1100.00;
      const diferenca = Math.max(0, faturaNubank - ganhosScarlet);

      const sat = (state.satellites && state.satellites.faturas) || 
        (typeof SatelliteConnectors !== 'undefined' ? SatelliteConnectors.processFaturasData({}) : {});

      const faturaAtual = sat.faturaAtualReal || faturaNubank;
      const faturasFuturas = sat.faturasFuturasCompromissadas || 6280.00;
      const metaMensal = sat.limiteMetaMensal || 4000.00;
      const cats = sat.categoriasTotais || {
        'Alimentação & Gastronomia': 1280.00,
        'Compras & E-commerce': 1150.00,
        'Casa & Utilidades': 680.00,
        'Serviços & Assinaturas': 420.00,
        'Transporte & Viagem': 380.00,
        'Vestuário & Moda': 310.00,
        'Saúde & Farmácia': 190.00,
        'Outros': 90.00
      };

      const totalCats = Object.values(cats).reduce((a, b) => a + (parseFloat(b) || 0), 0) || faturaAtual;
      const catConfig = {
        'Alimentação & Gastronomia': { icon: '🍔', color: '#f59e0b' },
        'Compras & E-commerce': { icon: '🛒', color: '#06b6d4' },
        'Casa & Utilidades': { icon: '🏠', color: '#3b82f6' },
        'Serviços & Assinaturas': { icon: '📱', color: '#ec4899' },
        'Transporte & Viagem': { icon: '🚗', color: '#8b5cf6' },
        'Vestuário & Moda': { icon: '👕', color: '#10b981' },
        'Saúde & Farmácia': { icon: '💊', color: '#ef4444' },
        'Outros': { icon: '📦', color: '#94a3b8' }
      };

      const sortedCats = Object.entries(cats).sort((a, b) => b[1] - a[1]);

      html = `
        <div style="font-family:var(--font-mono);font-size:12.5px;line-height:1.7;">
          <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(0,255,65,0.08);border:1px solid var(--border-glow);padding:8px 12px;border-radius:var(--radius-sm);margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <span style="color:var(--matrix-green);display:flex;align-items:center;gap:6px;font-weight:bold;">
              <span class="live-pulse"></span> App Faturas Sincronizado em Tempo Real
            </span>
            <span class="lock-pill" title="Os lançamentos são gerenciados no app Faturas e refletidos aqui">
              🔒 Somente Leitura no Matrix
            </span>
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

          <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:14px;border-radius:var(--radius-sm);margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <strong style="color:var(--text-main);font-size:13px;">📊 Distribuição por Categorias (App Faturas)</strong>
              <span style="font-size:11px;color:var(--text-muted);">Total Mapeado: ${formatBRL(totalCats)}</span>
            </div>
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
                <span style="color:var(--cyan);font-weight:bold;">2. Auditoria de Assinaturas & Isenção Ultravioleta</span>
                <div style="color:var(--text-muted);margin-top:2px;">
                  Gasto de R$ 420,00 em assinaturas recorrentes + R$ 89,00 da mensalidade Ultravioleta. Desativando serviços duplicados poupa-se R$ 150,00. Mantendo R$ 50k em investimentos ou média de gastos da fatura, a mensalidade de R$ 89,00 fica 100% gratuita. <span style="color:var(--matrix-green);font-weight:bold;">Economia: ~R$ 239,00/mês</span>.
                </div>
              </div>

              <div style="padding:8px;background:rgba(0,0,0,0.4);border-left:3px solid #8b5cf6;border-radius:3px;">
                <span style="color:#a78bfa;font-weight:bold;">3. Desconto por Antecipação de Parcelas (Nubank Black)</span>
                <div style="color:var(--text-muted);margin-top:2px;">
                  Saldo comprometido futuro de ${formatBRL(faturasFuturas)}. O Nubank oferece desconto imediato ao antecipar parcelas sem juros. Aproveitar a folga do fechamento mensal para amortizar compras parceladas gera ganho financeiro direto. <span style="color:var(--matrix-green);font-weight:bold;">Economia: ~R$ 60,00 a R$ 90,00</span> por lote.
                </div>
              </div>

              <div style="padding:8px;background:rgba(0,0,0,0.4);border-left:3px solid #10b981;border-radius:3px;">
                <span style="color:var(--matrix-green);font-weight:bold;">4. Deslocamento USP x VR / Combustível</span>
                <div style="color:var(--text-muted);margin-top:2px;">
                  R$ 380,00 em transportes. Com o regime híbrido de 2 dias presenciais na USP, otimize abastecimento via cashback e concilie caronas no departamento. <span style="color:var(--matrix-green);font-weight:bold;">Economia: ~R$ 120,00/mês</span>.
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
      const sat = (state.satellites && state.satellites.fisioflow) || 
        (typeof SatelliteConnectors !== 'undefined' ? SatelliteConnectors.processFisioData({}) : {});

      const ganhosMes = (monthData.scarlet && monthData.scarlet.ganhos) || sat.mesAtualTotal || 1100.00;
      const projecao = sat.projecaoMensalRecorrente || 1500.00;
      const totalHistorico = sat.totalHistoricoRecebido || 14500.00;
      const pacAtivos = sat.pacientesAtivos || 8;
      const ganhosMap = sat.ganhosPorMes || {
        '2026-07': { realizado: 1050, aReceber: 0, sessoes: 10 },
        '2026-08': { realizado: 1100, aReceber: 0, sessoes: 11 },
        '2026-09': { realizado: 1250, aReceber: 0, sessoes: 12 },
        '2026-10': { realizado: 1100, aReceber: 240, sessoes: 12 },
        '2026-11': { realizado: 1100, aReceber: 360, sessoes: 13 }
      };

      html = `
        <div style="font-family:var(--font-mono);font-size:12.5px;line-height:1.7;">
          <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(6,182,212,0.08);border:1px solid var(--cyan);padding:8px 12px;border-radius:var(--radius-sm);margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <span style="color:var(--cyan);display:flex;align-items:center;gap:6px;font-weight:bold;">
              <span class="live-pulse" style="background:var(--cyan);"></span> Conexão FisioFlow Ativa (Apenas Financeiro)
            </span>
            <span class="lock-pill" style="border-color:var(--cyan);color:var(--cyan);" title="Prontuários e atendimentos clínicos não são expostos no Matrix">
              🛡️ Sigilo Clínico Preservado
            </span>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin-bottom:16px;">
            <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:11px;color:var(--text-muted);">Faturamento Mês</div>
              <div style="font-size:15px;font-weight:bold;color:var(--cyan);margin-top:2px;">${formatBRL(ganhosMes)}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Entrada no orçamento</div>
            </div>
            <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:10px;border-radius:var(--radius-sm);">
              <div style="font-size:11px;color:var(--text-muted);">Projeção Recorrente</div>
              <div style="font-size:15px;font-weight:bold;color:var(--matrix-green);margin-top:2px;">${formatBRL(projecao)}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Capacidade atual</div>
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
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <strong style="color:var(--text-main);font-size:13px;">📈 Faturamento Mensal Consolidado</strong>
              <span style="font-size:11px;color:var(--text-muted);">Histórico Total: ${formatBRL(totalHistorico)}</span>
            </div>
            <div style="max-height:220px;overflow-y:auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Competência</th>
                    <th>Volume de Sessões</th>
                    <th style="text-align:right;">Faturamento Realizado</th>
                    <th style="text-align:right;">A Receber</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(ganhosMap).map(([ym, dados]) => `
                    <tr>
                      <td><strong>${ym}</strong></td>
                      <td>${dados.sessoes || '-'} sessões concluídas</td>
                      <td class="val-col" style="color:var(--cyan);font-weight:700;">${formatBRL(dados.realizado || 0)}</td>
                      <td class="val-col" style="color:var(--amber);">${formatBRL(dados.aReceber || 0)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div style="font-size:11px;color:var(--text-muted);line-height:1.5;">
            🔒 <em>Privacidade médica e sigilo profissional:</em> Conforme estabelecido, atendimentos clínicos individuais, prontuários e nomes de pacientes permanecem restritos ao FisioFlow, mantendo apenas a conciliação financeira consolidada no Matrix.
          </div>
        </div>
      `;

    } else if (tipo === 'caixa') {
      titleEl.innerHTML = `🏠 Financiamento Habitacional da Casa (Caixa)`;
      const cfg = state.financiamentoCaixa || {};
      html = `
        <div style="font-family:var(--font-mono);font-size:12.5px;line-height:1.9;">
          <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:14px;border-radius:var(--radius-sm);margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text-muted);">Saldo Devedor Atual:</span>
              <strong style="color:var(--rose);">${formatBRL(cfg.saldoDevedor || 157884.49)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text-muted);">Parcela Atual Débito Automático:</span>
              <strong style="color:var(--amber);">${formatBRL(cfg.parcelaAtual || 1395.88)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text-muted);">Prazo Restante:</span>
              <span>${cfg.prazoMeses || cfg.totalPrestacoes || 271} meses (~22,5 anos)</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text-muted);">Taxa Efetiva de Juros:</span>
              <span style="color:var(--cyan);">${cfg.taxaJurosAnual || 8.9899}% a.a.</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text-muted);">Sistema de Amortização:</span>
              <span>Tabela Price</span>
            </div>
          </div>
          <p style="font-size:11px;color:var(--text-muted);line-height:1.6;">
            💡 <strong>FGTS USP:</strong> Você acumula ~R$ 501,12 mensais de FGTS no cargo celetista USP (~R$ 12.026,88 a cada 2 anos) para amortização extraordinária.
          </p>
        </div>
      `;
    }

    contentEl.innerHTML = html;
    backdrop.classList.add('open');
  }

  // ==========================================
  // 2. FLUXO DE CAIXA MENSAL (TABELA PRINCIPAL)
  // ==========================================
  function renderOrigemBadge(conta, renda, nome) {
    const c = String(conta || '').toLowerCase();
    const r = String(renda || '').toLowerCase();
    const n = String(nome || '').toLowerCase();

    if (c === 'resgate_tesouro_reserva' || (n.includes('tesouro reserva') && (c.includes('resgate') || r.includes('resgate')))) {
      return '<span class="origem-badge resgate" title="Custeado por resgate do Tesouro Reserva">📉 Resgate Tesouro</span>';
    }
    if (c.includes('resgate') || r.includes('resgate') || n.includes('resgate')) {
      return '<span class="origem-badge resgate" title="Custeado por resgate de investimento">📉 Resgate Invest</span>';
    }
    if (c === 'investimento_aporte' || n.includes('renda+') || n.includes('tesouro') || n.includes('cripto') || n.includes('cdb')) {
      return '<span class="origem-badge invest" title="Aporte / Aplicação em Investimentos">📈 Investimento</span>';
    }
    if (c === 'va' || r === 'va_mercado' || n.includes('alimentação') || n.includes('mercado')) {
      return '<span class="origem-badge va" title="Recurso oriundo do Vale Alimentação (Maracaju 88)">🥗 VA Maracaju</span>';
    }
    if (c === 'vr' || r === 'vr_almoco' || n.includes('refeição') || n.includes('almoço') || n.includes('restaurante')) {
      return '<span class="origem-badge vr" title="Recurso oriundo do Vale Refeição (USP)">🍽️ VR USP</span>';
    }
    if (c === 'nubank_scarlet' || c === 'nubank_matheus' || n.includes('nubank')) {
      return '<span class="origem-badge nubank" title="Cartão de Crédito Nubank Black">💳 Nubank Black</span>';
    }
    if (c === 'scarlet' || r === 'ganhos_scarlet' || n.includes('scarlet')) {
      return '<span class="origem-badge scarlet" title="Ganhos da Scarlet (FisioFlow)">🩺 Scarlet</span>';
    }
    if (c === 'caixa' || n.includes('caixa') || n.includes('parcela casa')) {
      return '<span class="origem-badge caixa" title="Débito em Conta / Financiamento Caixa">🏠 Caixa</span>';
    }
    if (c === 'bb' || r === 'salario_usp' || n.includes('salário') || n.includes('bb')) {
      return '<span class="origem-badge bb" title="Recurso oriundo do Salário Líquido USP (Conta BB)">🏦 BB Salário</span>';
    }
    return `<span class="origem-badge default" title="Conta de Origem">${conta || 'Orçamento'}</span>`;
  }

  function renderCashflowTrace(monthData, totalReceitas, fixosList, outrosList) {
    const origensEl = document.getElementById('traceOrigensList');
    const destinosEl = document.getElementById('traceDestinosList');
    if (!origensEl || !destinosEl) return;

    const allExpenses = [...fixosList, ...outrosList];

    // 1. Fontes de Recurso (De Onde Veio)
    const receitas = monthData.receitas || [];
    let salUsp = 0;
    let vaTotal = 2050.00;
    let vrTotal = 1235.00;
    let scarletTotal = 1100.00;

    receitas.forEach(r => {
      const n = (r.nome || '').toLowerCase();
      const val = parseFloat(r.valor) || 0;
      if (n.includes('salário') || n.includes('salario') || (r.id && r.id.startsWith('rec_sal'))) {
        salUsp += val;
      } else if (n.includes('va') || n.includes('alimentação')) {
        vaTotal = val;
      } else if (n.includes('vr') || n.includes('refeição')) {
        vrTotal = val;
      } else if (n.includes('scarlet') || n.includes('fisio')) {
        scarletTotal = val;
      }
    });

    if (salUsp === 0) salUsp = 5788.19;

    let salUsado = 0;
    let vaUsado = 0;
    let vrUsado = 0;
    let scarletUsado = 0;
    let nubankUsado = 0;
    let resgateInvestUsado = 0;

    allExpenses.forEach(exp => {
      const val = parseFloat(exp.valor) || 0;
      const c = String(exp.conta || '').toLowerCase();
      const r = String(exp.renda || '').toLowerCase();
      const n = String(exp.nome || '').toLowerCase();

      if (c === 'resgate_tesouro_reserva' || c.includes('resgate') || r.includes('resgate') || (n.includes('tesouro reserva') && val > 0 && exp.pago)) {
        resgateInvestUsado += val;
      } else if (c === 'va' || r === 'va_mercado' || n.includes('mercado') || n.includes('alimentação')) {
        vaUsado += val;
      } else if (c === 'vr' || r === 'vr_almoco' || n.includes('refeição') || n.includes('almoço')) {
        vrUsado += val;
      } else if (c === 'nubank_scarlet' || c === 'nubank_matheus' || n.includes('nubank')) {
        nubankUsado += val;
      } else if (c === 'scarlet' || r === 'ganhos_scarlet' || n.includes('scarlet')) {
        scarletUsado += val;
      } else if (c === 'bb' || r === 'salario_usp' || c === 'caixa') {
        salUsado += val;
      }
    });

    const state = MatrixDB.getState();
    const sat = state.satellites || {};
    if (sat.maracaju && sat.maracaju.gastoMercadoMesAtual && vaUsado === 0) {
      vaUsado = sat.maracaju.gastoMercadoMesAtual;
    }
    if (sat.maracaju && sat.maracaju.gastoVrMesAtual && vrUsado === 0) {
      vrUsado = sat.maracaju.gastoVrMesAtual;
    }
    if (sat.faturas && sat.faturas.faturaAtualValor && nubankUsado === 0) {
      nubankUsado = sat.faturas.faturaAtualValor;
    }

    const salRestante = salUsp - salUsado;
    const vaRestante = vaTotal - vaUsado;
    const vrRestante = vrTotal - vrUsado;

    origensEl.innerHTML = `
      <div class="trace-item-row">
        <span>🏦 <strong>Salário USP (BB)</strong></span>
        <span>${formatBRL(salUsp)} <small style="color:${salRestante >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};">(${formatBRL(salRestante)} livre)</small></span>
      </div>
      <div class="trace-item-row">
        <span>🥗 <strong>Vale Alimentação (VA)</strong></span>
        <span>${formatBRL(vaTotal)} <small style="color:${vaRestante >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};">(${formatBRL(vaRestante)} saldo)</small></span>
      </div>
      <div class="trace-item-row">
        <span>🍽️ <strong>Vale Refeição (VR)</strong></span>
        <span>${formatBRL(vrTotal)} <small style="color:${vrRestante >= 0 ? 'var(--cyan)' : 'var(--rose)'};">(${formatBRL(vrRestante)} saldo)</small></span>
      </div>
      <div class="trace-item-row">
        <span>🩺 <strong>Ganhos Scarlet (FisioFlow)</strong></span>
        <span>${formatBRL(scarletTotal)} <small style="color:var(--text-dim);">(Compromissos: ${formatBRL(scarletUsado)})</small></span>
      </div>
      <div class="trace-item-row">
        <span>💳 <strong>Crédito Nubank Black</strong></span>
        <span style="color:var(--rose);">${formatBRL(nubankUsado)} <small style="color:var(--text-dim);">(Fatura cartão)</small></span>
      </div>
      ${resgateInvestUsado > 0 ? `
      <div class="trace-item-row" style="background:rgba(248,113,113,0.08);border-radius:4px;padding:3px 6px;">
        <span style="color:var(--rose);">📉 <strong>Resgate Tesouro Reserva</strong></span>
        <strong style="color:var(--rose);">${formatBRL(resgateInvestUsado)} (Aplicado em despesas)</strong>
      </div>` : ''}
    `;

    // 2. Destinos do Dinheiro (Pra Onde Foi)
    let destMoradia = 0;
    let destMercado = 0;
    let destAlmoco = 0;
    let destSaude = 0;
    let destTransporte = 0;
    let destInvestimentos = 0;
    let destFaturasOutros = 0;

    allExpenses.forEach(exp => {
      const val = parseFloat(exp.valor) || 0;
      const n = (exp.nome || '').toLowerCase();
      const cat = (exp.categoria || '').toLowerCase();

      if (cat.includes('habita') || n.includes('casa') || n.includes('água') || n.includes('luz') || n.includes('internet') || n.includes('iptu')) {
        destMoradia += val;
      } else if (cat.includes('alimen') || n.includes('mercado') || exp.conta === 'va') {
        destMercado += val;
      } else if (n.includes('refeição') || n.includes('almoço') || exp.conta === 'vr') {
        destAlmoco += val;
      } else if (cat.includes('saúde') || cat.includes('saude') || n.includes('unimed') || n.includes('psico') || n.includes('dentista')) {
        destSaude += val;
      } else if (cat.includes('transporte') || n.includes('carona') || n.includes('carro') || n.includes('combustível')) {
        destTransporte += val;
      } else if (cat.includes('aporte') || n.includes('renda+') || n.includes('tesouro') || n.includes('cripto') || n.includes('cdb')) {
        destInvestimentos += val;
      } else {
        destFaturasOutros += val;
      }
    });

    destinosEl.innerHTML = `
      <div class="trace-item-row">
        <span>🏠 <strong>Moradia & Casa Caixa</strong></span>
        <strong style="color:var(--text-main);">${formatBRL(destMoradia)}</strong>
      </div>
      <div class="trace-item-row">
        <span>🥗 <strong>Supermercado (via VA)</strong></span>
        <strong style="color:var(--matrix-green);">${formatBRL(destMercado)}</strong>
      </div>
      <div class="trace-item-row">
        <span>🍽️ <strong>Almoço USP (via VR)</strong></span>
        <strong style="color:var(--cyan);">${formatBRL(destAlmoco)}</strong>
      </div>
      <div class="trace-item-row">
        <span>🩺 <strong>Saúde & Bem-Estar</strong></span>
        <strong style="color:var(--text-main);">${formatBRL(destSaude)}</strong>
      </div>
      <div class="trace-item-row">
        <span>🚗 <strong>Transporte & Caronas USP</strong></span>
        <strong style="color:var(--text-main);">${formatBRL(destTransporte)}</strong>
      </div>
      <div class="trace-item-row">
        <span>📈 <strong>Aportes Investimentos (Tesouro/XP)</strong></span>
        <strong style="color:var(--cyan);">${formatBRL(destInvestimentos)}</strong>
      </div>
      <div class="trace-item-row">
        <span>💳 <strong>Cartão Nubank & Despesas Pessoais</strong></span>
        <strong style="color:var(--amber);">${formatBRL(destFaturasOutros)}</strong>
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

  function renderFluxoCaixa() {
    const monthData = MatrixDB.getMonth(currentYear, currentMonth);

    // Cálculos de Totais, Pagos e Pendentes
    const fixosList = monthData.fixos || [];
    const totalFixos = fixosList.reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
    const pagosFixos = fixosList.filter(it => it.pago).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
    const pendentesFixos = Math.max(0, totalFixos - pagosFixos);

    const outrosList = monthData.outros || [];
    const totalOutros = outrosList.reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
    const pagosOutros = outrosList.filter(it => it.pago).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
    const pendentesOutros = Math.max(0, totalOutros - pagosOutros);

    const totalGeralPago = pagosFixos + pagosOutros;
    const totalGeralPendente = pendentesFixos + pendentesOutros;

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

    // Atualizar Termômetro Geral do Mês
    if (document.getElementById('geralPagoTotal')) document.getElementById('geralPagoTotal').textContent = formatBRL(totalGeralPago);
    if (document.getElementById('geralPendenteTotal')) document.getElementById('geralPendenteTotal').textContent = formatBRL(totalGeralPendente);
    const pctGeral = (totalFixos + totalOutros) > 0 ? (totalGeralPago / (totalFixos + totalOutros)) * 100 : 0;
    if (document.getElementById('geralProgressBar')) document.getElementById('geralProgressBar').style.width = pctGeral.toFixed(1) + '%';

    // Render Fixos Table Body
    const fixosTbody = document.getElementById('fixosTableBody');
    if (fixosTbody) {
      if (fixosList.length === 0) {
        fixosTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:18px;">Nenhum gasto fixo cadastrado em ${currentMonth}.</td></tr>`;
      } else {
        fixosTbody.innerHTML = fixosList.map((f, i) => {
          const isFatura = isFaturasItem(f);
          return `
          <tr class="${f.pago ? 'paid' : ''}">
            <td>
              <strong>${f.nome}</strong>
              <div style="display:flex;gap:4px;align-items:center;margin-top:3px;flex-wrap:wrap;">
                ${renderOrigemBadge(f.conta, f.renda, f.nome)}
                ${f.categoria ? `<span class="cat-pill">${f.categoria}</span>` : ''}
                ${isFatura ? `<span class="lock-pill" style="font-size:10px;padding:1px 6px;">🔒 Faturas Live</span>` : ''}
              </div>
            </td>
            <td>
              <button type="button" 
                      class="status-btn ${f.pago ? 'pago' : 'pendente'}" 
                      onclick="MatrixApp.togglePaidByIndex('${currentYear}', '${currentMonth}', 'fixo', ${i})"
                      title="Clique para alternar entre Pago e Pendente">
                ${f.pago ? '✅ PAGO' : '⏳ PENDENTE'}
              </button>
            </td>
            <td class="val-col">${formatBRL(f.valor)}</td>
            <td class="action-col">
              ${isFatura ? `
                <button class="btn-icon" title="🔒 Sincronizado do App Faturas (Somente Leitura no Matrix)" onclick="MatrixApp.alertFaturasReadOnly()">🔒</button>
              ` : `
                <button class="btn-icon" title="Editar este lançamento" onclick="MatrixApp.editItemByIndex('${currentYear}', '${currentMonth}', 'fixo', ${i})">✏️</button>
                <button class="btn-icon" title="Excluir este lançamento" onclick="MatrixApp.removeItemByIndex('${currentYear}', '${currentMonth}', 'fixo', ${i})">🗑️</button>
              `}
            </td>
          </tr>
        `;
        }).join('');
      }
    }

    // Render Outros / Variáveis Table Body
    const outrosTbody = document.getElementById('outrosTableBody');
    if (outrosTbody) {
      if (outrosList.length === 0) {
        outrosTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:18px;">Nenhum gasto variável cadastrado em ${currentMonth}.</td></tr>`;
      } else {
        outrosTbody.innerHTML = outrosList.map((o, i) => {
          const isFatura = isFaturasItem(o);
          return `
          <tr class="${o.pago ? 'paid' : ''}">
            <td>
              <strong>${o.nome}</strong>
              <div style="display:flex;gap:4px;align-items:center;margin-top:3px;flex-wrap:wrap;">
                ${renderOrigemBadge(o.conta, o.renda, o.nome)}
                ${o.categoria ? `<span class="cat-pill">${o.categoria}</span>` : ''}
                ${isFatura ? `<span class="lock-pill" style="font-size:10px;padding:1px 6px;">🔒 Faturas Live</span>` : ''}
              </div>
            </td>
            <td>
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
                <button class="btn-icon" title="🔒 Sincronizado do App Faturas (Somente Leitura no Matrix)" onclick="MatrixApp.alertFaturasReadOnly()">🔒</button>
              ` : `
                <button class="btn-icon" title="Editar este lançamento" onclick="MatrixApp.editItemByIndex('${currentYear}', '${currentMonth}', 'outro', ${i})">✏️</button>
                <button class="btn-icon" title="Excluir este lançamento" onclick="MatrixApp.removeItemByIndex('${currentYear}', '${currentMonth}', 'outro', ${i})">🗑️</button>
              `}
            </td>
          </tr>
        `;
        }).join('');
      }
    }

    // Render Receitas / Ganhos Table Body & Termômetro
    const receitasList = monthData.receitas || [];
    const totalReceitas = receitasList.reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
    const pagasReceitas = receitasList.filter(it => it.pago).reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);
    const pendentesReceitas = Math.max(0, totalReceitas - pagasReceitas);

    if (document.getElementById('receitasPagoLabel')) document.getElementById('receitasPagoLabel').textContent = formatBRL(pagasReceitas);
    if (document.getElementById('receitasPendenteLabel')) document.getElementById('receitasPendenteLabel').textContent = formatBRL(pendentesReceitas);
    const pctReceitas = totalReceitas > 0 ? (pagasReceitas / totalReceitas) * 100 : 0;
    if (document.getElementById('receitasProgressBar')) document.getElementById('receitasProgressBar').style.width = pctReceitas.toFixed(1) + '%';

    const receitasTbody = document.getElementById('receitasTableBody');
    if (receitasTbody) {
      if (receitasList.length === 0) {
        receitasTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:18px;">Nenhuma receita cadastrada em ${currentMonth}.</td></tr>`;
      } else {
        receitasTbody.innerHTML = receitasList.map((r, i) => `
          <tr class="${r.pago ? 'paid' : ''}">
            <td>
              <strong>${r.nome}</strong>
              <div style="display:flex;gap:4px;align-items:center;margin-top:3px;flex-wrap:wrap;">
                ${renderOrigemBadge(r.conta, r.renda, r.nome)}
                <span class="cat-pill">${r.categoria || 'Receita'}</span>
              </div>
            </td>
            <td>
              <button type="button" 
                      class="status-btn ${r.pago ? 'pago' : 'pendente'}" 
                      onclick="MatrixApp.togglePaidByIndex('${currentYear}', '${currentMonth}', 'receita', ${i})"
                      title="Clique para alternar entre Recebido e A Receber">
                ${r.pago ? '✅ RECEBIDO' : '⏳ A RECEBER'}
              </button>
            </td>
            <td class="val-col" style="color:var(--cyan);font-weight:700;">${formatBRL(r.valor)}</td>
            <td class="action-col">
              <button class="btn-icon" title="Editar esta receita" onclick="MatrixApp.editItemByIndex('${currentYear}', '${currentMonth}', 'receita', ${i})">✏️</button>
              <button class="btn-icon" title="Excluir esta receita" onclick="MatrixApp.removeItemByIndex('${currentYear}', '${currentMonth}', 'receita', ${i})">🗑️</button>
            </td>
          </tr>
        `).join('');
      }
    }

    // Totais de Fixos e Variáveis abaixo de Receitas e Fechamento
    const saldoFinal = totalReceitas - (totalFixos + totalOutros);

    const badgeMes = document.getElementById('fechamentoMesBadge');
    if (badgeMes) badgeMes.textContent = `${currentMonth} / ${currentYear}`;

    const totalRecEl = document.getElementById('fechamentoTotalReceitas');
    if (totalRecEl) totalRecEl.textContent = formatBRL(totalReceitas);
    const recSubEl = document.getElementById('fechamentoReceitasSub');
    if (recSubEl) {
      const pagCount = receitasList.filter(r => r.pago).length;
      const pendCount = receitasList.length - pagCount;
      recSubEl.textContent = `${pagCount} recebidas • ${pendCount} a receber`;
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
    if (totalOutEl) totalOutEl.textContent = formatBRL(totalOutros);
    const outSubEl = document.getElementById('fechamentoOutrosSub');
    if (outSubEl) {
      const pagCount = outrosList.filter(o => o.pago).length;
      const pendCount = outrosList.length - pagCount;
      outSubEl.textContent = `${pagCount} pagos • ${pendCount} pendentes`;
    }

    const saldoLiqEl = document.getElementById('fechamentoSaldoLiquido');
    if (saldoLiqEl) {
      saldoLiqEl.textContent = formatBRL(saldoFinal);
      saldoLiqEl.style.color = saldoFinal >= 0 ? 'var(--matrix-green)' : 'var(--rose)';
    }

    const saldoFinalEl = document.getElementById('fechamentoSaldoFinal');
    if (saldoFinalEl) {
      saldoFinalEl.textContent = formatBRL(saldoFinal);
      saldoFinalEl.style.color = saldoFinal >= 0 ? 'var(--matrix-green)' : 'var(--rose)';
    }

    // Rastreabilidade: De Onde Veio ➔ Para Onde Foi
    renderCashflowTrace(monthData, totalReceitas, fixosList, outrosList);

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

  function renderResumoTotais(monthData) {
    const listEl = document.getElementById('resumoTotaisList');
    if (!listEl) return;

    const t = monthData.totais || {};
    const salario = parseFloat(t['Salário Mensal']) || 5788.19;
    const va = parseFloat(t['VA']) || 2050.00;
    const vr = parseFloat(t['VR']) || 1235.00;
    const decimo = parseFloat(t['13º']) || (currentMonth === 'Novembro' ? 1566.00 : 0);
    const estudio = parseFloat(t['Estúdio']) || 0;

    listEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;padding:4px 0;">
        <span style="color:var(--text-muted);">Salário Líquido USP:</span>
        <strong>${formatBRL(salario)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;">
        <span style="color:var(--text-muted);">Vale Refeição (VR):</span>
        <span>${formatBRL(vr)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;">
        <span style="color:var(--text-muted);">Vale Alimentação (VA):</span>
        <span>${formatBRL(va)} (Maracaju 88)</span>
      </div>
      ${decimo > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:4px 0;color:var(--matrix-green);">
        <span>13º Salário USP:</span>
        <strong>${formatBRL(decimo)}</strong>
      </div>` : ''}
      ${estudio > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:4px 0;">
        <span style="color:var(--text-muted);">Estúdio:</span>
        <span>${formatBRL(estudio)}</span>
      </div>` : ''}
    `;
  }

  // ==========================================
  // 3. SIMULADOR "E SE?" (PROJEÇÕES FUTURAS)
  // ==========================================
  function renderSimulator() {
    const state = MatrixDB.getState();
    const result = ScenarioSimulator.runSimulation(state, null, 14);

    const contaLabels = {
      bb: 'Banco do Brasil (Salário USP)',
      nubank_scarlet: 'Nubank Scarlet (Mastercard Black)',
      nubank_matheus: 'Nubank Matheus',
      inter: 'Banco Inter (Giro/Pix)',
      santander: 'Santander (DinDin)',
      va: 'Cartão VA (Alimentação)',
      vr: 'Cartão VR (Refeição)',
      reserva: 'Reserva de Emergência / Invest.',
      dinheiro: 'Dinheiro Vivo'
    };
    const rendaLabels = {
      salario_usp: 'Salário Líquido USP (Matheus)',
      ganhos_scarlet: 'Ganhos da Scarlet (FisioFlow)',
      va_mercado: 'Vale Alimentação (VA Maracaju 88)',
      vr_almoco: 'Vale Refeição (VR Presencial)',
      estudio_extra: 'Estúdio / Renda Extra',
      reserva_aportes: 'Reserva de Emergência',
      orcamento_geral: 'Orçamento Geral Conjunto'
    };
    const tipoLabels = {
      recorrente: '🔄 Recorrente Mensal',
      pontual: '🎯 Pontual (Mês Único)',
      parcelado: '📦 Parcelado'
    };

    // Render Painel de Correlação por Renda
    const correlacaoGridEl = document.getElementById('simCorrelacaoRendaGrid');
    if (correlacaoGridEl && result.correlacaoRendas) {
      correlacaoGridEl.innerHTML = Object.values(result.correlacaoRendas).map(r => {
        const hasImpact = r.totalMensal > 0;
        return `
          <div style="background:rgba(5,8,7,0.5);border:1px solid ${hasImpact ? 'var(--cyan)' : 'var(--border-dim)'};border-radius:var(--radius-xs);padding:8px 10px;font-family:var(--font-mono);">
            <div style="font-size:10.5px;color:var(--text-muted);">${r.nome}</div>
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

    // Render lista de hipóteses/cenários com suporte a edição, recorrência, conta e correlação de renda
    const scenContainer = document.getElementById('activeScenariosList');
    if (scenContainer) {
      if (!state.simulacoesAtivas || state.simulacoesAtivas.length === 0) {
        scenContainer.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:14px;font-family:var(--font-mono);font-size:12px;">Nenhum cenário hipotético cadastrado. Clique em "+ Adicionar Hipótese".</div>`;
      } else {
        scenContainer.innerHTML = state.simulacoesAtivas.map(scen => {
          const tipoKey = scen.tipo || (scen.recorrente === false ? 'pontual' : 'recorrente');
          const tipoDesc = tipoKey === 'parcelado' ? `📦 Parcelado (${scen.parcelas || 2}x)` : (tipoLabels[tipoKey] || '🔄 Recorrente Mensal');
          const contaDesc = contaLabels[scen.conta] || scen.conta || 'Nubank Scarlet (Mastercard Black)';
          const rendaDesc = rendaLabels[scen.renda] || scen.renda || 'Ganhos da Scarlet (FisioFlow)';

          return `
            <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:12px 14px;border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:10px;">
              <div style="flex:1;min-width:260px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                  <span style="font-weight:700;color:var(--matrix-green);font-size:13px;">${scen.titulo}</span>
                  <span class="status-badge" style="font-size:10px;background:rgba(56,189,248,0.12);color:var(--cyan);border-color:var(--cyan);">${tipoDesc}</span>
                </div>
                <div style="font-size:12px;color:var(--text-main);font-family:var(--font-mono);margin-bottom:4px;">
                  <strong>Valor Estimado:</strong> <span style="color:var(--cyan);font-weight:700;">${formatBRL(scen.valorAdotado || scen.valor)}</span>
                  <span style="color:var(--text-muted);"> | Início: ${scen.inicio || '2026-12'}${scen.fim ? ' até ' + scen.fim : ''}</span>
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

    // Render tabela mês a mês da simulação (linhas clicáveis para raio-x e diagnóstico)
    const simTbody = document.getElementById('simulationTableBody');
    if (simTbody) {
      simTbody.innerHTML = result.timeline.map(row => {
        let statusBadge = '<span class="status-badge pago">Folga OK</span>';
        let rowClass = '';
        if (row.statusAlerta === 'deficit') {
          statusBadge = '<span class="status-badge danger">Déficit</span>';
          rowClass = 'style="background:rgba(239,68,68,0.06);"';
        } else if (row.statusAlerta === 'atencao') {
          statusBadge = '<span class="status-badge pendente">Atenção</span>';
        }

        return `
          <tr ${rowClass} class="clickable-row" onclick="MatrixApp.abrirRaioXSimulador('${row.year}', '${row.monthName}')" title="Clique para ver o raio-x e diagnóstico de ${row.label}">
            <td>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="color:var(--matrix-green);font-size:11px;">🔍</span>
                <strong>${row.label}</strong>
              </div>
            </td>
            <td class="val-col">${formatBRL(row.ganhosBase)}</td>
            <td class="val-col">${formatBRL(row.totalGastosBase)}</td>
            <td class="val-col" style="color:var(--cyan);">${row.custoCenarios > 0 ? '+ ' + formatBRL(row.custoCenarios) : '—'}</td>
            <td class="val-col" style="font-weight:700;color:${row.saldoSimulado >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};">
              ${formatBRL(row.saldoSimulado)}
            </td>
            <td style="text-align:center;white-space:nowrap;">
              ${statusBadge}
              <button type="button" class="btn-matrix" style="padding:2px 7px;font-size:10px;margin-left:6px;" onclick="event.stopPropagation(); MatrixApp.navegarParaMes('${row.year}', '${row.monthName}')" title="Ir para o Fluxo de Caixa e editar lançamentos">
                Editar ➔
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // KPI do simulador
    const simImpactoEl = document.getElementById('simTotalImpacto');
    if (simImpactoEl) simImpactoEl.textContent = formatBRL(result.impactoTotalCenarios);

    const simDeficitEl = document.getElementById('simMesesDeficit');
    if (simDeficitEl) {
      simDeficitEl.textContent = `${result.mesesDeficit} de ${result.totalMeses} meses`;
      simDeficitEl.style.color = result.mesesDeficit > 0 ? 'var(--rose)' : 'var(--matrix-green)';
    }
  }

  // Navegar diretamente para o mês selecionado no Fluxo de Caixa
  function navegarParaMes(ano, mes) {
    currentYear = String(ano);
    currentMonth = String(mes);
    calSelectedYear = String(ano);
    calSelectedMonth = String(mes);

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

    let html = `
      <div style="font-family:var(--font-mono);font-size:12px;">
        <!-- Card Resumo de Fechamento -->
        <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:12px 14px;border-radius:var(--radius-sm);margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;padding:3px 0;">
            <span style="color:var(--cyan);">(+) Rendas e Receitas Totais:</span>
            <strong style="color:var(--cyan);">${formatBRL(totalReceitas)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;">
            <span style="color:var(--amber);">(-) Gastos Fixos da Casa:</span>
            <span>- ${formatBRL(totalFixos)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;">
            <span style="color:var(--rose);">(-) Gastos Variáveis & Outros:</span>
            <span>- ${formatBRL(totalOutros)}</span>
          </div>
          ${contasInicio > 0 ? `
          <div style="display:flex;justify-content:space-between;padding:3px 0;">
            <span style="color:var(--amber);">(-) Contas Início de Ano (Sazonal):</span>
            <span>- ${formatBRL(contasInicio)}</span>
          </div>` : ''}
          ${custoCenarios > 0 ? `
          <div style="display:flex;justify-content:space-between;padding:3px 0;color:var(--cyan);">
            <span>(-) Hipóteses / Cenários Simulados:</span>
            <span>- ${formatBRL(custoCenarios)}</span>
          </div>` : ''}
          <div style="border-top:1px solid var(--border-dim);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-size:13.5px;">
            <strong style="color:var(--text-main);">(=) Saldo Líquido Previsto:</strong>
            <strong style="color:${saldoFinal >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};">${formatBRL(saldoFinal)}</strong>
          </div>
        </div>

        <!-- Diagnóstico -->
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
    backdrop.classList.add('open');
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
    const customLeaves = (state.calendarioCustom && state.calendarioCustom.folgas) || [];

    // Preenche seletor de meses
    const mSelect = document.getElementById('calMonthSelect');
    if (mSelect) {
      if (mSelect.options.length === 0) {
        mSelect.innerHTML = MONTH_NAMES.map(m => `<option value="${m}">${m}</option>`).join('');
      }
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

    const commute = CalendarEngine.calculateCommuteAndVR(yearNum, monthIndex, customLeaves);

    const diasUteisEl = document.getElementById('calDiasUteis');
    if (diasUteisEl) diasUteisEl.textContent = `${commute.workingDaysCount} dias`;

    const caronasEl = document.getElementById('calCaronasTotal');
    if (caronasEl) caronasEl.textContent = formatBRL(commute.totalCaronas);

    const vrEl = document.getElementById('calVRTotal');
    if (vrEl) vrEl.textContent = formatBRL(commute.totalVR);

    const folgasEl = document.getElementById('calFolgasTotal');
    if (folgasEl) {
      const naoUteis = commute.totalDays - commute.workingDaysCount;
      const countFolgas = commute.customLeavesCount || 0;
      folgasEl.textContent = `${naoUteis} dias (${countFolgas} folgas)`;
    }

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
      let tag = '🚗 Presencial USP';
      let detail = '<span>Carona R$ 60</span><span>VR R$ 65</span>';
      let tooltip = `Dia ${d.day} (${d.dayOfWeekStr}): Presencial na USP São Carlos. Clique para marcar folga/férias.`;

      if (d.isWeekend) {
        cellTypeClass = 'weekend';
        tag = '💤 Fim de Semana';
        detail = '<span>Descanso</span>';
        tooltip = `Dia ${d.day} (${d.dayOfWeekStr}): Fim de semana. Clique para marcar evento ou folga.`;
      } else if (d.isCustomLeave) {
        cellTypeClass = 'custom-leave';
        tag = `🏖️ ${d.customLeaveDesc}`;
        detail = '<span style="color:var(--purple);font-weight:600;">Folga / Férias</span>';
        tooltip = `Dia ${d.day} (${d.dayOfWeekStr}): ${d.customLeaveDesc}. Clique para remover ou alterar.`;
      } else if (d.isHoliday) {
        cellTypeClass = 'holiday';
        tag = `🎉 ${d.holidayDesc}`;
        detail = '<span style="color:var(--amber);">Feriado</span>';
        tooltip = `Dia ${d.day} (${d.dayOfWeekStr}): Feriado (${d.holidayDesc}). Sem expediente.`;
      } else if (d.inRecess) {
        cellTypeClass = 'recess';
        tag = '🏛️ Recesso USP';
        detail = '<span style="color:var(--cyan);">Recesso Fim de Ano</span>';
        tooltip = `Dia ${d.day} (${d.dayOfWeekStr}): Recesso oficial USP de fim de ano.`;
      }

      const isToday = isCurrentYearNow && isCurrentMonthNow && d.day === currentDayNow;
      const todayClass = isToday ? 'today' : '';
      const todayBadge = isToday ? '<span style="font-size:9px;background:var(--matrix-green);color:#050807;padding:1px 5px;border-radius:3px;font-weight:700;">HOJE</span>' : '';

      gridHtml += `
        <div class="cal-day-cell ${cellTypeClass} ${todayClass}" onclick="MatrixApp.toggleCalendarDay('${d.dateStr}')" title="${tooltip}">
          <div class="cal-day-top">
            <span class="cal-day-num">${d.day}</span>
            ${todayBadge}
          </div>
          <div class="cal-day-status">${tag}</div>
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
    let idx = MONTH_NAMES.indexOf(calSelectedMonth);
    idx += direction;
    if (idx < 0) {
      idx = 11;
      calSelectedYear = String(parseInt(calSelectedYear, 10) - 1);
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
      updateMonthDisplay();
      renderAll();
    }
  }

  function resetCalendarToCurrent() {
    calSelectedYear = currentYear;
    calSelectedMonth = currentMonth;
    renderCalendar();
  }

  // ==========================================
  // 5. FINANCIAMENTO CAIXA & AMORTIZADOR
  // ==========================================
  function renderFinancing() {
    const state = MatrixDB.getState();
    const cfg = state.financiamentoCaixa || AmortizationEngine.DEFAULT_CONFIG;

    const saldoEl = document.getElementById('caixaSaldoDevedor');
    if (saldoEl) saldoEl.textContent = formatBRL(cfg.saldoDevedor);

    const prazoEl = document.getElementById('caixaPrazoMeses');
    if (prazoEl) prazoEl.textContent = `${cfg.prazoMeses || cfg.totalPrestacoes || 271} meses (~${Math.round((cfg.prazoMeses || cfg.totalPrestacoes || 271) / 12)} anos)`;

    const parcelaEl = document.getElementById('caixaParcelaAtual');
    if (parcelaEl) parcelaEl.textContent = formatBRL(cfg.parcelaAtual);

    const taxaEl = document.getElementById('caixaTaxaJuros');
    if (taxaEl) taxaEl.textContent = `${cfg.taxaJurosAnual || cfg.taxaAnual || 8.9899}% a.a.`;

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

    // Atualiza KPIs da interface
    const resNovoPrazo = document.getElementById('resNovoPrazo');
    if (resNovoPrazo) resNovoPrazo.textContent = `${sim.novoPrazo} meses (~${sim.novoPrazoAnos} anos)`;

    const resMesesPoupados = document.getElementById('resMesesPoupados');
    if (resMesesPoupados) resMesesPoupados.textContent = `${sim.mesesPoupados} meses (~${sim.anosPoupados} anos)`;

    const resNovaData = document.getElementById('resNovaDataQuitacao');
    if (resNovaData) resNovaData.textContent = sim.dataQuitacaoNova;

    const resEconomia = document.getElementById('resEconomiaJuros');
    if (resEconomia) resEconomia.textContent = formatBRL(sim.economiaJuros);

    const resNovoTotal = document.getElementById('resNovoTotalPago');
    if (resNovoTotal) resNovoTotal.textContent = formatBRL(sim.novoTotalPago);

    const resTotalAportado = document.getElementById('resTotalAportado');
    if (resTotalAportado) resTotalAportado.textContent = formatBRL(sim.totalAportadoExtra);

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
              Salva em: ${dt} • Novo Prazo: <strong style="color:var(--cyan);">${res.novoPrazo || 0} meses</strong> (~${res.novoPrazoAnos || 0} anos) • Poupados: <strong style="color:var(--matrix-green);">${res.mesesPoupados || 0} meses</strong>
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
  function estimarValorVencimento(inv) {
    const val = parseFloat(inv.valorAtual) || 0;
    const cat = (inv.categoria || '').toLowerCase();
    const ativo = (inv.ativo || '').toLowerCase();

    if (ativo.includes('renda+') || ativo.includes('2055')) {
      const fv = val * Math.pow(1 + 0.065, 29);
      const rendaMensal20Anos = fv / 148;
      return {
        valorFuturo: fv,
        texto: `${formatBRL(fv)} (Renda est. ~${formatBRL(rendaMensal20Anos)}/mês por 20 anos a partir de 2055)`
      };
    } else if (cat.includes('reserva') || cat.includes('renda fixa') || ativo.includes('cdb') || ativo.includes('selic')) {
      const fv = val * Math.pow(1 + 0.1075, 2);
      return {
        valorFuturo: fv,
        texto: `${formatBRL(fv)} em 2 anos (a ~10,75% a.a.)`
      };
    } else if (cat.includes('capitalização') || ativo.includes('dindin')) {
      const fv = val + (36 * 50) + 120;
      return {
        valorFuturo: fv,
        texto: `${formatBRL(fv)} no resgate final (36 meses)`
      };
    } else if (cat.includes('ações') || ativo.includes('csna') || ativo.includes('mglu')) {
      const fv = val * 1.35;
      return {
        valorFuturo: fv,
        texto: `${formatBRL(fv)} (Projeção analistas + proventos)`
      };
    } else if (cat.includes('cripto') || ativo.includes('btc')) {
      const fv = val * 2.5;
      return {
        valorFuturo: fv,
        texto: `${formatBRL(fv)} (Ciclo de alta Halving)`
      };
    } else {
      const fv = val * 1.15;
      return {
        valorFuturo: fv,
        texto: `${formatBRL(fv)} (Projeção conservadora)`
      };
    }
  }

  function renderInvestments() {
    const state = MatrixDB.getState();
    const invList = state.investimentos || [];

    const totalGeral = invList.reduce((acc, it) => acc + (parseFloat(it.valorAtual) || 0), 0);
    const totalMatheus = invList.filter(it => it.titular === 'Matheus').reduce((acc, it) => acc + (parseFloat(it.valorAtual) || 0), 0);
    const totalScarlet = invList.filter(it => it.titular === 'Scarlet').reduce((acc, it) => acc + (parseFloat(it.valorAtual) || 0), 0);
    
    let totalProjetado = 0;
    invList.forEach(it => {
      const est = estimarValorVencimento(it);
      totalProjetado += est.valorFuturo;
    });

    const totEl = document.getElementById('invPatrimonioTotal');
    if (totEl) totEl.textContent = formatBRL(totalGeral);

    const matheusEl = document.getElementById('invMatheusTotal');
    if (matheusEl) matheusEl.textContent = formatBRL(totalMatheus);

    const scarletEl = document.getElementById('invScarletTotal');
    if (scarletEl) scarletEl.textContent = formatBRL(totalScarlet);

    const projEl = document.getElementById('invProjecaoTotal');
    if (projEl) projEl.textContent = formatBRL(totalProjetado);

    renderStockCards(invList);
    renderInvestCharts(invList, totalGeral, totalMatheus, totalScarlet);
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

  function renderInvestCharts(invList, totalGeral, totalMatheus, totalScarlet) {
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
          <div style="display:flex;height:14px;border-radius:4px;overflow:hidden;background:rgba(5,8,7,0.6);margin-bottom:8px;">
            <div style="width:${pctM}%;background:var(--matrix-green);transition:width 0.4s ease;" title="Matheus: ${pctM}%"></div>
            <div style="width:${pctS}%;background:#ec4899;transition:width 0.4s ease;" title="Scarlet: ${pctS}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:11px;">
            <span style="display:flex;align-items:center;gap:4px;">
              <span style="width:8px;height:8px;background:var(--matrix-green);border-radius:2px;display:inline-block;"></span>
              👨 Matheus: <strong>${pctM}%</strong> (${formatBRL(totalMatheus)})
            </span>
            <span style="display:flex;align-items:center;gap:4px;">
              <span style="width:8px;height:8px;background:#ec4899;border-radius:2px;display:inline-block;"></span>
              👩 Scarlet: <strong>${pctS}%</strong> (${formatBRL(totalScarlet)})
            </span>
          </div>
        `;
      }
    }

    // 2. Gráfico por Categoria
    if (cCat) {
      const cats = {};
      invList.forEach(it => {
        const c = it.categoria || 'Outros';
        cats[c] = (cats[c] || 0) + (parseFloat(it.valorAtual) || 0);
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

    // 3. Gráfico Projeção de Crescimento Patrimonial
    if (cProj) {
      const hoje = totalGeral;
      const em1Ano = totalGeral * 1.1075; // +10.75%
      const em3Anos = totalGeral * 1.358; // +35.8%
      const em5Anos = totalGeral * 1.666; // +66.6%
      let aposentadoria2055 = 0;
      invList.forEach(it => {
        const est = estimarValorVencimento(it);
        aposentadoria2055 += est.valorFuturo;
      });

      const marcos = [
        { label: 'Hoje', val: hoje, color: 'var(--text-muted)' },
        { label: '+1 Ano', val: em1Ano, color: 'var(--cyan)' },
        { label: '+3 Anos', val: em3Anos, color: 'var(--amber)' },
        { label: '+5 Anos', val: em5Anos, color: 'var(--matrix-green)' },
        { label: '2055 (Aposentadoria)', val: aposentadoria2055, color: 'var(--purple)' }
      ];

      const maxVal = Math.max(...marcos.map(m => m.val), 1);
      cProj.innerHTML = marcos.map(m => {
        const pct = ((m.val / maxVal) * 100).toFixed(0);
        return `
          <div style="margin-bottom:5px;">
            <div style="display:flex;justify-content:space-between;font-size:10px;font-family:var(--font-mono);margin-bottom:2px;">
              <span style="color:${m.color};font-weight:600;">${m.label}</span>
              <span><strong>${formatBRL(m.val)}</strong></span>
            </div>
            <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
              <div style="width:${pct}%;background:${m.color};height:100%;border-radius:3px;"></div>
            </div>
          </div>
        `;
      }).join('');
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
    const tbody = document.getElementById('investmentsTableBody');
    if (!tbody) return;

    let filtered = invList;
    if (currentInvestFilter && currentInvestFilter !== 'todos') {
      filtered = invList.filter(it => (it.titular || 'Matheus') === currentInvestFilter);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">Nenhum investimento encontrado para o filtro selecionado.</td></tr>`;
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
        const est = estimarValorVencimento(first);
        const isExpanded = !!investExpandedGroups[key];
        const hasMultiple = subItems.length > 1;

        html += `
          <tr style="background:rgba(18,29,23,0.3);font-weight:600;">
            <td>
              <span class="titular-badge ${first.titular.toLowerCase()}">${first.titular}</span>
            </td>
            <td>
              <div style="display:flex;align-items:center;gap:6px;">
                ${hasMultiple ? `<button class="btn-icon" style="font-size:10px;padding:2px 4px;" onclick="MatrixApp.toggleGroupExpand('${key}')">${isExpanded ? '▼' : '▶'}</button>` : ''}
                <strong style="color:var(--text-main);">${key}</strong>
                ${hasMultiple ? `<span class="box-badge" style="font-size:9px;color:var(--cyan);border-color:var(--cyan);">${subItems.length} Custódias</span>` : ''}
              </div>
            </td>
            <td>${hasMultiple ? 'Múltiplas Corretoras' : first.corretora}</td>
            <td><span class="status-badge simulado">${first.categoria}</span></td>
            <td class="val-col" style="font-size:13px;font-weight:700;color:var(--matrix-green);">${formatBRL(totalGrupo)}</td>
            <td><div style="font-size:10px;color:var(--text-muted);">${est.texto}</div></td>
            <td><span style="font-size:10px;color:var(--text-muted);">${first.rentabilidadeContratada || first.status}</span></td>
            <td style="text-align:center;">
              <div style="display:flex;gap:4px;justify-content:center;">
                <button class="btn-matrix" style="padding:2px 6px;font-size:10px;" onclick="MatrixApp.openAporteModal('${first.id}')">+ Aporte</button>
                <button class="btn-matrix secondary" style="padding:2px 6px;font-size:10px;" onclick="MatrixApp.openResgateModal('${first.id}')">💸 Resgatar</button>
              </div>
            </td>
          </tr>
        `;

        // Se estiver expandido e tiver mais de 1 custódia, mostra as sublinhas detalhadas
        if (hasMultiple && isExpanded) {
          subItems.forEach(sub => {
            html += `
              <tr class="grouped-subrow">
                <td><span style="font-size:9px;color:var(--text-dim);">${sub.titular}</span></td>
                <td>↳ <span style="font-size:10px;color:var(--text-muted);">${sub.ativo}</span></td>
                <td><strong style="color:var(--cyan);font-size:10px;">${sub.corretora}</strong></td>
                <td><span style="font-size:9px;color:var(--text-dim);">${sub.categoria}</span></td>
                <td class="val-col" style="font-size:11px;">${formatBRL(sub.valorAtual)}</td>
                <td><span style="font-size:9px;color:var(--text-dim);">${sub.vencimento || '--'}</span></td>
                <td><span style="font-size:9px;color:var(--text-dim);">${sub.status || '--'}</span></td>
                <td style="text-align:center;">
                  <button class="btn-icon" style="font-size:11px;" onclick="MatrixApp.openEditInvestmentModal('${sub.id}')" title="Editar">✏️</button>
                  <button class="btn-icon" style="color:var(--rose);font-size:11px;" onclick="MatrixApp.excluirInvestimento('${sub.id}')" title="Excluir">🗑️</button>
                </td>
              </tr>
            `;
          });
        }
      });

      tbody.innerHTML = html;
      return;
    }

    // Visão Detalhada Tradicional
    tbody.innerHTML = filtered.map(inv => {
      const est = estimarValorVencimento(inv);
      const titular = inv.titular || 'Matheus';
      const titularClass = titular.toLowerCase();

      return `
        <tr>
          <td><span class="titular-badge ${titularClass}">${titular}</span></td>
          <td><strong>${inv.ativo}</strong></td>
          <td>${inv.corretora}</td>
          <td><span class="status-badge simulado">${inv.categoria}</span></td>
          <td class="val-col" style="font-weight:700;color:var(--matrix-green);">${formatBRL(inv.valorAtual)}</td>
          <td>
            <div style="font-weight:600;color:var(--text-main);">${inv.vencimento || 'Longo Prazo'}</div>
            <div style="font-size:10px;color:var(--text-muted);">${est.texto}</div>
          </td>
          <td>
            <div style="font-size:11px;color:var(--cyan);">${inv.rentabilidadeContratada || ''}</div>
            <span class="status-badge ${inv.status && inv.status.includes('Ativo') ? 'pago' : 'pendente'}" style="font-size:9px;padding:1px 6px;">${inv.status}</span>
          </td>
          <td style="text-align:center;">
            <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">
              <button class="btn-matrix" style="padding:3px 7px;font-size:10px;" onclick="MatrixApp.openAporteModal('${inv.id}')" title="Adicionar aporte futuro ou presente">+ Aporte</button>
              <button class="btn-matrix secondary" style="padding:3px 7px;font-size:10px;" onclick="MatrixApp.openResgateModal('${inv.id}')" title="Resgatar ou liquidar">💸 Resgatar</button>
              <button class="btn-icon" onclick="MatrixApp.openEditInvestmentModal('${inv.id}')" title="Editar este ativo">✏️</button>
              <button class="btn-icon" style="color:var(--rose);" onclick="MatrixApp.excluirInvestimento('${inv.id}')" title="Excluir do portfólio">🗑️</button>
            </div>
          </td>
        </tr>
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
    if (backdrop) backdrop.classList.add('open');
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
    if (backdrop) backdrop.classList.add('open');
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
    if (backdrop) backdrop.classList.add('open');
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
    if (backdrop) backdrop.classList.add('open');
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
    if (backdrop) backdrop.classList.add('open');
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
      if (document.getElementById('satFisioPrevisao')) document.getElementById('satFisioPrevisao').textContent = formatBRL(sat.fisioflow.projecaoMensalRecorrente);
    }

    // 2. Faturas (Nubank Black)
    const faturasBadge = document.getElementById('badgeFaturasStatus');
    const faturasAtivo = !!(satCfg.faturasUrl && satCfg.faturasUrl.trim()) || !!sat.faturas;
    if (faturasBadge) {
      faturasBadge.className = faturasAtivo ? 'status-badge pago' : 'status-badge pendente';
      faturasBadge.textContent = faturasAtivo ? 'ATIVO' : 'PENDENTE';
    }
    if (sat.faturas) {
      if (document.getElementById('satFaturaAtual')) document.getElementById('satFaturaAtual').textContent = formatBRL(sat.faturas.faturaAtualValor);
      if (document.getElementById('satFaturasFuturas')) document.getElementById('satFaturasFuturas').textContent = formatBRL(sat.faturas.faturasFuturasTotal);
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
    renderFluxoCaixa();
    renderKpis();
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
      MatrixDB.removeTransactionByIndex(ano, mes, tipo, index);
      renderAll();
    }
  }

  function populateModalInvestAtivos() {
    const state = MatrixDB.getState();
    const invs = state.investimentos || [];
    const select = document.getElementById('modalInvestAtivoSelect');
    if (!select) return;

    const names = new Set();
    names.add('Tesouro Renda+ 2055');
    names.add('Tesouro Reserva');
    names.add('Tesouro Selic');
    names.add('CSNA3 (Cia Siderúrgica Nacional)');
    names.add('MGLU3 (Magazine Luiza)');
    names.add('Cripto Bitcoin');
    names.add('CDB Inter 100% CDI');

    invs.forEach(i => {
      if (i.ativo) names.add(i.ativo);
    });

    select.innerHTML = Array.from(names).map(n => `<option value="${n}">${n}</option>`).join('');
  }

  function onModalContaChange(val) {
    const chk = document.getElementById('chkModalInvestLink');
    const sub = document.getElementById('modalInvestSubFields');
    const op = document.getElementById('modalInvestOperacao');
    const at = document.getElementById('modalInvestAtivoSelect');

    if (val === 'resgate_tesouro_reserva') {
      if (chk) chk.checked = true;
      if (sub) sub.style.display = 'block';
      if (op) op.value = 'resgate';
      if (at) at.value = 'Tesouro Reserva';
    } else if (val === 'resgate_outro') {
      if (chk) chk.checked = true;
      if (sub) sub.style.display = 'block';
      if (op) op.value = 'resgate';
    } else if (val === 'investimento_aporte') {
      if (chk) chk.checked = true;
      if (sub) sub.style.display = 'block';
      if (op) op.value = 'aporte';
    }
  }

  function toggleModalInvestSubFields(checked) {
    const sub = document.getElementById('modalInvestSubFields');
    if (sub) sub.style.display = checked ? 'block' : 'none';
  }

  function openNewItemModal(tipo) {
    document.getElementById('modalItemTipo').value = tipo;
    document.getElementById('modalItemEditId').value = '';
    document.getElementById('modalItemNome').value = '';
    document.getElementById('modalItemValor').value = '';

    populateModalInvestAtivos();

    const chkInv = document.getElementById('chkModalInvestLink');
    if (chkInv) chkInv.checked = false;
    toggleModalInvestSubFields(false);

    if (document.getElementById('modalItemStatusPendente')) document.getElementById('modalItemStatusPendente').checked = true;
    if (document.getElementById('modalItemStatusPago')) document.getElementById('modalItemStatusPago').checked = false;

    const titleEl = document.getElementById('modalItemTitle');
    const nomeLabel = document.getElementById('modalItemNomeLabel');
    const nomeInput = document.getElementById('modalItemNome');
    const catSelect = document.getElementById('modalItemCategoria');

    if (tipo === 'receita') {
      if (titleEl) titleEl.textContent = '+ Nova Receita / Ganho';
      if (nomeLabel) nomeLabel.textContent = 'Descrição da Receita:';
      if (nomeInput) nomeInput.placeholder = 'Ex: Salário USP, 13º Salário, Estúdio, Fisio Scarlet...';
      if (catSelect) catSelect.value = 'Salário / Proventos';
    } else if (tipo === 'fixo') {
      if (titleEl) titleEl.textContent = '+ Novo Gasto Fixo';
      if (nomeLabel) nomeLabel.textContent = 'Descrição da Despesa Fixa:';
      if (nomeInput) nomeInput.placeholder = 'Ex: Parcela Caixa, Água, Luz, Internet...';
      if (catSelect) catSelect.value = 'Habitação';
    } else {
      if (titleEl) titleEl.textContent = '+ Novo Gasto Variável';
      if (nomeLabel) nomeLabel.textContent = 'Descrição do Gasto Variável:';
      if (nomeInput) nomeInput.placeholder = 'Ex: Mercado Extra, Farmácia, Lazer, Renda+ 2055...';
      if (catSelect) catSelect.value = 'Outros';
    }

    document.getElementById('itemModalBackdrop').classList.add('open');
  }

  function editItemModal(ano, mes, tipo, id, nome, valor) {
    document.getElementById('modalItemTipo').value = tipo;
    document.getElementById('modalItemEditId').value = id;
    document.getElementById('modalItemNome').value = nome;
    document.getElementById('modalItemValor').value = valor;
    document.getElementById('modalItemTitle').textContent = 'Editar Lançamento';
    document.getElementById('itemModalBackdrop').classList.add('open');
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

    populateModalInvestAtivos();

    document.getElementById('modalItemTipo').value = tipo;
    document.getElementById('modalItemEditId').value = `idx_${index}`;
    document.getElementById('modalItemNome').value = item.nome || '';
    document.getElementById('modalItemValor').value = item.valor != null ? item.valor : '';

    const catSelect = document.getElementById('modalItemCategoria');
    if (catSelect && item.categoria) catSelect.value = item.categoria;

    const contaSelect = document.getElementById('modalItemConta');
    if (contaSelect && item.conta) contaSelect.value = item.conta;

    const rendaSelect = document.getElementById('modalItemRenda');
    if (rendaSelect && item.renda) rendaSelect.value = item.renda;

    // Status Pago / Pendente via radio buttons
    const isPago = !!item.pago;
    if (document.getElementById('modalItemStatusPago')) document.getElementById('modalItemStatusPago').checked = isPago;
    if (document.getElementById('modalItemStatusPendente')) document.getElementById('modalItemStatusPendente').checked = !isPago;

    // Detectar vínculo com investimentos
    const n = (item.nome || '').toLowerCase();
    const isInvest = (item.categoria === 'Aportes') ||
      (item.conta === 'investimento_aporte' || item.conta === 'resgate_tesouro_reserva' || (item.conta && item.conta.includes('resgate'))) ||
      n.includes('renda+') || n.includes('tesouro');

    const chkInv = document.getElementById('chkModalInvestLink');
    if (chkInv) {
      chkInv.checked = isInvest;
      toggleModalInvestSubFields(isInvest);
      if (isInvest) {
        const opSelect = document.getElementById('modalInvestOperacao');
        if (opSelect) {
          opSelect.value = (item.conta && item.conta.includes('resgate')) || n.includes('resgate') ? 'resgate' : 'aporte';
        }
        const atSelect = document.getElementById('modalInvestAtivoSelect');
        if (atSelect) {
          const match = Array.from(atSelect.options).find(opt => n.includes(opt.value.toLowerCase()));
          if (match) atSelect.value = match.value;
        }
      }
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

    document.getElementById('itemModalBackdrop').classList.add('open');
  }

  function saveItemFromModal() {
    const tipo = document.getElementById('modalItemTipo').value;
    const editId = document.getElementById('modalItemEditId').value;
    const nome = document.getElementById('modalItemNome').value.trim();
    const valor = parseFloat(document.getElementById('modalItemValor').value) || 0;
    const cat = document.getElementById('modalItemCategoria').value;
    const conta = document.getElementById('modalItemConta') ? document.getElementById('modalItemConta').value : 'bb';
    const renda = document.getElementById('modalItemRenda') ? document.getElementById('modalItemRenda').value : 'salario_usp';
    const pago = document.getElementById('modalItemStatusPago') ? document.getElementById('modalItemStatusPago').checked : false;

    if (!nome) {
      alert(tipo === 'receita' ? 'Informe a descrição da receita.' : 'Informe a descrição da despesa.');
      return;
    }

    const payload = { nome, valor, categoria: cat, conta, renda, pago };

    if (editId && editId.startsWith('idx_')) {
      const idx = parseInt(editId.replace('idx_', ''), 10);
      MatrixDB.updateTransactionByIndex(currentYear, currentMonth, tipo, idx, payload);
    } else if (editId) {
      MatrixDB.updateTransaction(currentYear, currentMonth, tipo, editId, payload);
    } else {
      MatrixDB.addTransaction(currentYear, currentMonth, tipo, payload);
    }

    // VÍNCULO BIDIRECIONAL COM INVESTIMENTOS 360 (Aportes & Resgates)
    const isInvest = document.getElementById('chkModalInvestLink') ? document.getElementById('chkModalInvestLink').checked : false;
    const n = nome.toLowerCase();
    const isAutoInvest = isInvest || (cat === 'Aportes') || (conta === 'investimento_aporte') || (conta === 'resgate_tesouro_reserva') ||
      n.includes('renda+ 2055') || n.includes('renda+2055') || n.includes('tesouro reserva');

    if (isAutoInvest && valor > 0) {
      const op = document.getElementById('modalInvestOperacao') ? document.getElementById('modalInvestOperacao').value :
        (conta.includes('resgate') || n.includes('resgate') ? 'resgate' : 'aporte');
      
      let ativoNome = document.getElementById('modalInvestAtivoSelect') ? document.getElementById('modalInvestAtivoSelect').value : '';
      if (!ativoNome) {
        if (n.includes('2055')) ativoNome = 'Tesouro Renda+ 2055';
        else if (n.includes('reserva')) ativoNome = 'Tesouro Reserva';
        else ativoNome = nome;
      }

      const corretora = document.getElementById('modalInvestCorretoraSelect') ? document.getElementById('modalInvestCorretoraSelect').value : 'XP Investimentos';
      const titular = document.getElementById('modalInvestTitularSelect') ? document.getElementById('modalInvestTitularSelect').value : 'Matheus';

      const state = MatrixDB.getState();
      if (!state.investimentos) state.investimentos = [];

      let targetAsset = state.investimentos.find(inv =>
        inv.ativo && inv.ativo.toLowerCase().trim() === ativoNome.toLowerCase().trim() &&
        (!corretora || (inv.corretora || '').toLowerCase().includes(corretora.toLowerCase().slice(0, 4)))
      );

      if (!targetAsset) {
        targetAsset = state.investimentos.find(inv =>
          inv.ativo && (inv.ativo.toLowerCase().includes(ativoNome.toLowerCase()) || ativoNome.toLowerCase().includes(inv.ativo.toLowerCase()))
        );
      }

      if (op === 'aporte') {
        if (targetAsset) {
          targetAsset.valorAtual = (parseFloat(targetAsset.valorAtual) || 0) + valor;
          targetAsset.status = `Ativo (Aporte em ${currentMonth}/${currentYear})`;
          if (corretora) targetAsset.corretora = corretora;
        } else {
          state.investimentos.push({
            id: 'inv_' + Date.now(),
            ativo: ativoNome,
            corretora: corretora,
            titular: titular,
            categoria: 'Renda Fixa / Tesouro',
            valorAtual: valor,
            status: `Ativo (Criado via lançamento em ${currentMonth}/${currentYear})`
          });
        }
      } else if (op === 'resgate') {
        if (targetAsset) {
          targetAsset.valorAtual = Math.max(0, (parseFloat(targetAsset.valorAtual) || 0) - valor);
          if (targetAsset.valorAtual === 0) {
            targetAsset.status = `Liquidado / Totalmente utilizado em ${currentMonth}/${currentYear}`;
          } else {
            targetAsset.status = `Ativo (Resgate parcial em ${currentMonth}/${currentYear})`;
          }
        }
      }

      MatrixDB.saveState(state);
    }

    closeModal('itemModalBackdrop');
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
    document.getElementById('scenModalInicio').value = (scen && scen.inicio) || `${currentYear}-12`;
    document.getElementById('scenModalFim').value = (scen && scen.fim) || '';
    document.getElementById('scenModalObs').value = (scen && scen.observacao) || '';
    document.getElementById('scenModalAtivo').checked = scen ? (scen.ativo !== false) : true;

    document.getElementById('scenModalHeaderTitle').textContent = scen ? `Editar Hipótese: ${scen.titulo}` : 'Nova Hipótese / Cenário';
    document.getElementById('scenarioModalBackdrop').classList.add('open');
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
    const inicio = document.getElementById('scenModalInicio').value.trim() || `${currentYear}-12`;
    const fim = document.getElementById('scenModalFim').value.trim();
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

  function toggleCalendarDay(dateStr) {
    if (!dateStr) return;
    const parts = dateStr.split('-');
    const yearStr = parts[0];
    const monthIdx = parseInt(parts[1], 10);
    const monthName = MONTH_NAMES[monthIdx - 1];
    const dayNum = parseInt(parts[2], 10);

    const state = MatrixDB.getState();
    if (!state.calendarioCustom) state.calendarioCustom = { folgas: [] };
    const folgas = state.calendarioCustom.folgas;

    const existingIdx = folgas.findIndex(f => f.data === dateStr);
    let folgaAlterada = false;

    if (existingIdx >= 0) {
      const currentMotivo = folgas[existingIdx].motivo || 'Folga / Férias';
      const action = confirm(`O dia ${dayNum}/${monthIdx}/${yearStr} está registrado como "${currentMotivo}".\n\nDeseja REMOVER esta folga e restaurar como dia normal?`);
      if (action) {
        folgas.splice(existingIdx, 1);
        folgaAlterada = true;
      }
    } else {
      const motivo = prompt(`Marcar Ausência / Folga / Férias no dia ${dayNum}/${monthIdx}/${yearStr}:\nInforme o motivo:`, 'Folga / Férias');
      if (motivo !== null && motivo.trim() !== '') {
        folgas.push({ data: dateStr, motivo: motivo.trim() });
        folgaAlterada = true;
      }
    }

    if (!folgaAlterada) return;

    // 1. Salva folgas no estado global do MatrixDB
    MatrixDB.saveState(state);

    // 2. Recalcula Caronas e VR para o mês específico alterado (Ex: Outubro salva Outubro, Novembro salva Novembro)
    const commute = CalendarEngine.calculateCommuteAndVR(parseInt(yearStr, 10), monthIdx, folgas);

    // 3. Atualiza os gastos fixos (Caronas) e totais (VR) desse mês específico no MatrixDB
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

    if (!monthData.totais) monthData.totais = {};
    monthData.totais['VR'] = commute.totalVR;

    MatrixDB.saveMonth(yearStr, monthName, monthData);

    // 4. Se estiver visualizando o mesmo mês no fluxo de caixa geral, sincroniza os cards e tabelas
    if (yearStr === currentYear && monthName === currentMonth) {
      renderFluxoCaixa();
      renderKpiCards();
    }

    // 5. Re-renderiza o calendário
    renderCalendar();

    // 6. Feedback visual elegante de confirmação na interface
    const banner = document.getElementById('calSaveNotification');
    if (banner) {
      banner.classList.add('saved-flash');
      banner.innerHTML = `<span>✅ <strong>${monthName} de ${yearStr} SALVO E RECALCULADO!</strong> ${commute.workingDaysCount} dias úteis • Caronas: ${formatBRL(commute.totalCaronas)} • VR: ${formatBRL(commute.totalVR)}</span>`;
      setTimeout(() => {
        banner.classList.remove('saved-flash');
        banner.innerHTML = `<span>📅 Editando: <strong id="calBannerMonthText">${calSelectedMonth} de ${calSelectedYear}</strong>. Clique em qualquer dia para marcar ou remover folgas/férias. As alterações deste mês salvam e recalculam automaticamente.</span>`;
      }, 4000);
    }
  }

  function aplicarCaronasNoMes() {
    const yearStr = calSelectedYear || currentYear;
    const monthName = calSelectedMonth || currentMonth;
    const monthIndex = MONTH_NAMES.indexOf(monthName) + 1;
    const state = MatrixDB.getState();
    const customLeaves = (state.calendarioCustom && state.calendarioCustom.folgas) || [];
    const commute = CalendarEngine.calculateCommuteAndVR(parseInt(yearStr, 10), monthIndex, customLeaves);

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

    // Atualiza VR nos totais
    if (!monthData.totais) monthData.totais = {};
    monthData.totais['VR'] = commute.totalVR;

    MatrixDB.saveMonth(yearStr, monthName, monthData);

    if (yearStr === currentYear && monthName === currentMonth) {
      renderAll();
    } else {
      renderCalendar();
    }

    const banner = document.getElementById('calSaveNotification');
    if (banner) {
      banner.classList.add('saved-flash');
      banner.innerHTML = `<span>✅ <strong>Caronas e VR de ${monthName}/${yearStr} sincronizados no Fluxo de Caixa!</strong> (${commute.workingDaysCount} dias úteis | Caronas: ${formatBRL(commute.totalCaronas)} | VR: ${formatBRL(commute.totalVR)})</span>`;
      setTimeout(() => {
        banner.classList.remove('saved-flash');
        banner.innerHTML = `<span>📅 Editando: <strong id="calBannerMonthText">${calSelectedMonth} de ${calSelectedYear}</strong>. Clique em qualquer dia para marcar ou remover folgas/férias. As alterações deste mês salvam e recalculam automaticamente.</span>`;
      }, 4000);
    } else {
      alert(`Caronas (${formatBRL(commute.totalCaronas)}) e VR (${formatBRL(commute.totalVR)}) sincronizados com sucesso para ${monthName}/${yearStr}!`);
    }
  }

  function saveCloudSettings() {
    const cloudUrl = document.getElementById('cfgCloudUrl').value;
    const cloudToken = document.getElementById('cfgCloudToken').value;
    SyncEngine.saveConfig({ cloudUrl, cloudToken });
    alert('Configurações salvas!');
    renderBackup();
  }

  async function testCloudConnection() {
    const res = await SyncEngine.pingCloud();
    if (res.success) {
      alert(`Conexão OK! Planilha vinculada: "${res.title}"`);
    } else {
      alert(`Erro na conexão: ${res.error}`);
    }
  }

  async function forceSyncToCloud() {
    await SyncEngine.syncToCloud();
    alert('Backup enviado para o Google Sheets!');
    renderBackup();
  }

  async function forceFetchFromCloud() {
    if (confirm('Deseja puxar os dados mais recentes do Google Sheets e substituir a memória local?')) {
      const res = await SyncEngine.fetchFromCloud();
      if (res.success) {
        alert('Dados restaurados com sucesso do Google Sheets!');
        renderAll();
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

  function setupModalListeners() {
    document.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const backdrop = e.target.closest('.matrix-modal-backdrop');
        if (backdrop) backdrop.classList.remove('open');
      });
    });

    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('matrix-modal-backdrop')) {
        e.target.classList.remove('open');
      }
    });
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
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

    const isMpsp = (ano === '2025' || (ano === '2026' && ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho'].includes(mes)));
    const orgao = isMpsp ? 'Ministério Público de São Paulo (MPSP)' : 'Universidade de São Paulo (USP)';
    const cargo = isMpsp ? 'Oficial de Promotoria I' : 'Técnico 1 - Nível A';
    const banco = isMpsp ? 'Bradesco Ag. 00443' : 'Banco do Brasil Ag. 2211 CC 38154-3';

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

  return {
    init,
    changeMonth,
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
    closeModal,
    toggleScenarioActive,
    removeScenario,
    openScenarioModal,
    saveScenarioFromModal,
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
    toggleModalInvestSubFields,
    isFaturasItem,
    alertFaturasReadOnly,
    switchTab,
    initSwipeNavigation
  };
})();

if (typeof window !== 'undefined') {
  window.MatrixApp = MatrixApp;
}
