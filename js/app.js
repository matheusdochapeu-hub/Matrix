/**
 * MATRIX FINANCE - MAIN APPLICATION CONTROLLER
 * Coordenação de fluxo de caixa, projeções "E se?", holerites, calendário de caronas,
 * amortizações da Caixa, investimentos e interface Matrix clean.
 */

const MatrixApp = (function () {
  let currentYear = '2026';
  let currentMonth = 'Novembro';

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  function formatBRL(val) {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function init() {
    setupEventListeners();
    updateMonthDisplay();
    renderAll();

    // Tentar sincronização em nuvem se configurada
    setTimeout(() => {
      const cfg = SyncEngine.getConfig();
      if (cfg.cloudUrl) {
        SyncEngine.fetchFromCloud().then(res => {
          if (res.success && res.data) {
            renderAll();
          }
        });
      }

      // Scraping automático dos 3 apps satélites ao abrir se ativado
      const satCfg = SatelliteConnectors.getSatelliteConfig();
      if (satCfg.autoScrapeOnOpen) {
        executarScrapingSatellites(true); // modo silencioso
      }
    }, 800);
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
        updateMonthDisplay();
        renderAll();
      });
    }

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        const targetContent = document.getElementById(targetId);
        if (targetContent) targetContent.classList.add('active');

        // Re-render specifics if needed
        if (targetId === 'tab-simulador') renderSimulator();
        if (targetId === 'tab-calendario') renderCalendar();
        if (targetId === 'tab-financiamento') renderFinancing();
        if (targetId === 'tab-investimentos') renderInvestments();
        if (targetId === 'tab-backup') renderBackup();
      });
    });

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

    const yearSelect = document.getElementById('yearSelect');
    if (yearSelect) yearSelect.value = currentYear;

    updateMonthDisplay();
    renderAll();
  }

  function updateMonthDisplay() {
    const el = document.getElementById('currentMonthDisplay');
    if (el) el.textContent = `${currentMonth} / ${currentYear}`;
  }

  function renderAll() {
    renderKPIs();
    renderFluxoCaixa();
  }

  // ==========================================
  // 1. KPIS & CARDS DE TOPO
  // ==========================================
  function renderKPIs() {
    const state = MatrixDB.getState();
    const monthData = MatrixDB.getMonth(currentYear, currentMonth);

    // Ganhos
    let ganhos = 0;
    if (monthData.totais && monthData.totais['Subtotal Ganhos']) {
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

    // Investimentos totais
    const totalInvest = (state.investimentos || []).reduce((acc, it) => acc + (parseFloat(it.valorAtual) || 0), 0);

    // Dívida Caixa
    const dividaCaixa = (state.financiamentoCaixa && state.financiamentoCaixa.saldoDevedor) || 157884.49;

    document.getElementById('kpiGanhos').textContent = formatBRL(ganhos);
    document.getElementById('kpiFixos').textContent = formatBRL(fixos);
    document.getElementById('kpiOutros').textContent = formatBRL(outros);
    
    const saldoEl = document.getElementById('kpiSaldo');
    saldoEl.textContent = formatBRL(saldoLivre);
    saldoEl.style.color = saldoLivre >= 0 ? 'var(--matrix-green)' : 'var(--rose)';

    document.getElementById('kpiInvestimentos').textContent = formatBRL(totalInvest);
    document.getElementById('kpiDividaCaixa').textContent = formatBRL(dividaCaixa);
  }

  // ==========================================
  // 2. FLUXO DE CAIXA MENSAL (TABELA PRINCIPAL)
  // ==========================================
  function renderFluxoCaixa() {
    const monthData = MatrixDB.getMonth(currentYear, currentMonth);

    // Render Fixos
    const fixosTbody = document.getElementById('fixosTableBody');
    if (fixosTbody) {
      if (!monthData.fixos || monthData.fixos.length === 0) {
        fixosTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:14px;">Nenhum gasto fixo registrado para ${currentMonth}.</td></tr>`;
      } else {
        fixosTbody.innerHTML = monthData.fixos.map((f, i) => `
          <tr class="${f.pago ? 'paid' : ''}">
            <td>
              <span style="cursor:pointer;" onclick="MatrixApp.togglePaid('${currentYear}', '${currentMonth}', 'fixo', '${f.id || f.nome}')">
                ${f.pago ? '✅' : '⏳'}
              </span>
              <strong>${f.nome}</strong>
            </td>
            <td><span class="status-badge ${f.pago ? 'pago' : 'pendente'}">${f.pago ? 'Pago' : 'Pendente'}</span></td>
            <td class="val-col">${formatBRL(f.valor)}</td>
            <td class="action-col">
              <button class="btn-icon" title="Editar" onclick="MatrixApp.editItemModal('${currentYear}', '${currentMonth}', 'fixo', '${f.id || f.nome}', '${f.nome}', ${f.valor})">✏️</button>
              <button class="btn-icon" title="Excluir" onclick="MatrixApp.removeItem('${currentYear}', '${currentMonth}', 'fixo', '${f.id || f.nome}')">🗑️</button>
            </td>
          </tr>
        `).join('');
      }
    }

    // Render Outros / Variáveis
    const outrosTbody = document.getElementById('outrosTableBody');
    if (outrosTbody) {
      if (!monthData.outros || monthData.outros.length === 0) {
        outrosTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:14px;">Nenhum gasto variável registrado para ${currentMonth}.</td></tr>`;
      } else {
        outrosTbody.innerHTML = monthData.outros.map((o, i) => `
          <tr class="${o.pago ? 'paid' : ''}">
            <td>
              <span style="cursor:pointer;" onclick="MatrixApp.togglePaid('${currentYear}', '${currentMonth}', 'outro', '${o.id || o.nome}')">
                ${o.pago ? '✅' : '⏳'}
              </span>
              <strong>${o.nome}</strong>
            </td>
            <td><span class="status-badge ${o.pago ? 'pago' : 'pendente'}">${o.pago ? 'Pago' : 'Pendente'}</span></td>
            <td class="val-col">${formatBRL(o.valor)}</td>
            <td class="action-col">
              <button class="btn-icon" title="Editar" onclick="MatrixApp.editItemModal('${currentYear}', '${currentMonth}', 'outro', '${o.id || o.nome}', '${o.nome}', ${o.valor})">✏️</button>
              <button class="btn-icon" title="Excluir" onclick="MatrixApp.removeItem('${currentYear}', '${currentMonth}', 'outro', '${o.id || o.nome}')">🗑️</button>
            </td>
          </tr>
        `).join('');
      }
    }

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

    // Render Ganhos & Totais resumo
    renderResumoTotais(monthData);
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

    // Render lista de hipóteses/cenários
    const scenContainer = document.getElementById('activeScenariosList');
    if (scenContainer) {
      scenContainer.innerHTML = (state.simulacoesAtivas || []).map(scen => `
        <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:10px 14px;border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div>
            <div style="font-weight:700;color:var(--matrix-green);">${scen.titulo}</div>
            <div style="font-size:11px;color:var(--text-muted);">
              Valor: ${formatBRL(scen.valorAdotado || scen.valor)} / mês | Início: ${scen.inicio || 'Imediato'}
            </div>
            <div style="font-size:11px;color:var(--text-dim);">${scen.observacao || ''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;">
              <input type="checkbox" ${scen.ativo !== false ? 'checked' : ''} onchange="MatrixApp.toggleScenarioActive('${scen.id}', this.checked)">
              Ativo
            </label>
            <button class="btn-icon" title="Excluir" onclick="MatrixApp.removeScenario('${scen.id}')">🗑️</button>
          </div>
        </div>
      `).join('');
    }

    // Render tabela mês a mês da simulação
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
          <tr ${rowClass}>
            <td><strong>${row.label}</strong></td>
            <td class="val-col">${formatBRL(row.ganhosBase)}</td>
            <td class="val-col">${formatBRL(row.totalGastosBase)}</td>
            <td class="val-col" style="color:var(--cyan);">${row.custoCenarios > 0 ? '+ ' + formatBRL(row.custoCenarios) : '—'}</td>
            <td class="val-col" style="font-weight:700;color:${row.saldoSimulado >= 0 ? 'var(--matrix-green)' : 'var(--rose)'};">
              ${formatBRL(row.saldoSimulado)}
            </td>
            <td style="text-align:center;">${statusBadge}</td>
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

  // ==========================================
  // 4. CALENDÁRIO & CARONAS (USP SÃO CARLOS)
  // ==========================================
  function renderCalendar() {
    const monthIndex = MONTH_NAMES.indexOf(currentMonth) + 1;
    const yearNum = parseInt(currentYear, 10);
    const state = MatrixDB.getState();
    const customLeaves = (state.calendarioCustom && state.calendarioCustom.folgas) || [];

    const commute = CalendarEngine.calculateCommuteAndVR(yearNum, monthIndex, customLeaves);

    document.getElementById('calDiasUteis').textContent = `${commute.workingDaysCount} dias`;
    document.getElementById('calCaronasTotal').textContent = formatBRL(commute.totalCaronas);
    document.getElementById('calVRTotal').textContent = formatBRL(commute.totalVR);

    // Render Grid dos Dias
    const gridEl = document.getElementById('calendarDaysGrid');
    if (gridEl) {
      gridEl.innerHTML = commute.days.map(d => {
        let tag = '';
        let bg = 'var(--bg-card)';
        let border = 'var(--border-dim)';

        if (d.isWeekend) {
          tag = 'Fim de Semana';
          bg = 'rgba(5,8,7,0.4)';
        } else if (d.inRecess) {
          tag = 'Recesso USP';
          border = 'var(--cyan)';
          bg = 'rgba(56,189,248,0.1)';
        } else if (d.isHoliday) {
          tag = d.holidayDesc;
          border = 'var(--amber)';
          bg = 'rgba(251,191,36,0.1)';
        } else if (d.isCustomLeave) {
          tag = d.customLeaveDesc;
          border = 'var(--purple)';
        } else {
          tag = 'Presencial USP';
          border = 'var(--matrix-green-dim)';
        }

        return `
          <div style="background:${bg};border:1px solid ${border};border-radius:var(--radius-sm);padding:8px;font-family:var(--font-mono);font-size:11px;min-height:75px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;" onclick="MatrixApp.toggleCalendarDay('${d.dateStr}')">
            <div style="display:flex;justify-content:space-between;">
              <span style="font-weight:700;color:var(--text-main);">${d.day}</span>
              <span style="color:var(--text-muted);font-size:10px;">${d.dayOfWeekStr}</span>
            </div>
            <div style="font-size:10px;color:${d.isWorkDay ? 'var(--matrix-green)' : 'var(--text-muted)'};margin-top:4px;">
              ${tag}
            </div>
            ${d.isWorkDay ? '<div style="font-size:9px;color:var(--text-dim);">Carona R$ 60 • VR R$ 65</div>' : ''}
          </div>
        `;
      }).join('');
    }
  }

  // ==========================================
  // 5. FINANCIAMENTO CAIXA & AMORTIZADOR
  // ==========================================
  function renderFinancing() {
    const state = MatrixDB.getState();
    const cfg = state.financiamentoCaixa || AmortizationEngine.DEFAULT_CONFIG;

    document.getElementById('caixaSaldoDevedor').textContent = formatBRL(cfg.saldoDevedor);
    document.getElementById('caixaPrazoMeses').textContent = `${cfg.prazoMeses || cfg.totalPrestacoes} meses (~${Math.round((cfg.prazoMeses || cfg.totalPrestacoes) / 12)} anos)`;
    document.getElementById('caixaParcelaAtual').textContent = formatBRL(cfg.parcelaAtual);
    document.getElementById('caixaTaxaJuros').textContent = `${cfg.taxaJurosAnual || cfg.taxaAnual}% a.a.`;

    // Simulação FGTS (24 meses de depósitos USP = 24 * 501.12 = R$ 12.026,88)
    const saldoFgts24m = (cfg.fgtsMensalUsp || 501.12) * 24;
    document.getElementById('fgtsEstimado24m').textContent = formatBRL(saldoFgts24m);

    // Calcular simulação inicial
    simularAmortizacao();
  }

  function simularAmortizacao() {
    const state = MatrixDB.getState();
    const cfg = state.financiamentoCaixa || AmortizationEngine.DEFAULT_CONFIG;
    
    const valorExtra = parseFloat(document.getElementById('inputAmortizacaoExtra').value) || 0;
    const modalidade = document.getElementById('selectModalidadeAmortizacao').value || 'prazo';

    const sim = AmortizationEngine.simularAbatimentoFgts(
      cfg.saldoDevedor,
      cfg.prazoMeses || cfg.totalPrestacoes || 271,
      cfg.taxaJurosAnual || cfg.taxaAnual || 8.9899,
      valorExtra,
      modalidade
    );

    document.getElementById('resEconomiaJuros').textContent = formatBRL(sim.economiaJuros);
    document.getElementById('resMesesPoupados').textContent = `${sim.mesesPoupados} meses (${(sim.mesesPoupados / 12).toFixed(1)} anos)`;
    document.getElementById('resNovoTotalPago').textContent = formatBRL(sim.simulado.totalPago);
  }

  // ==========================================
  // 6. INVESTIMENTOS 360
  // ==========================================
  function renderInvestments() {
    const state = MatrixDB.getState();
    const invList = state.investimentos || [];

    const total = invList.reduce((acc, it) => acc + (parseFloat(it.valorAtual) || 0), 0);
    document.getElementById('invPatrimonioTotal').textContent = formatBRL(total);

    const tbody = document.getElementById('investmentsTableBody');
    if (tbody) {
      tbody.innerHTML = invList.map(inv => `
        <tr>
          <td><strong>${inv.ativo}</strong></td>
          <td>${inv.corretora}</td>
          <td><span class="status-badge simulado">${inv.categoria}</span></td>
          <td class="val-col">${formatBRL(inv.valorAtual)}</td>
          <td><span class="status-badge ${inv.status.includes('Ativo') ? 'pago' : 'pendente'}">${inv.status}</span></td>
        </tr>
      `).join('');
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
    if (document.getElementById('cfgFisioUrl')) document.getElementById('cfgFisioUrl').value = satCfg.fisioUrl;
    if (document.getElementById('cfgFisioToken')) document.getElementById('cfgFisioToken').value = satCfg.fisioToken;
    if (document.getElementById('cfgFaturasUrl')) document.getElementById('cfgFaturasUrl').value = satCfg.faturasUrl;
    if (document.getElementById('cfgFaturasToken')) document.getElementById('cfgFaturasToken').value = satCfg.faturasToken;
    if (document.getElementById('cfgMaracajuUrl')) document.getElementById('cfgMaracajuUrl').value = satCfg.maracajuUrl;
    if (document.getElementById('cfgMaracajuToken')) document.getElementById('cfgMaracajuToken').value = satCfg.maracajuToken;
    if (document.getElementById('chkAutoScrapeOnOpen')) document.getElementById('chkAutoScrapeOnOpen').checked = satCfg.autoScrapeOnOpen;

    const state = MatrixDB.getState();
    const sat = state.satellites || {};

    if (sat.fisioflow) {
      if (document.getElementById('satFisioMesAtual')) document.getElementById('satFisioMesAtual').textContent = formatBRL(sat.fisioflow.mesAtualTotal);
      if (document.getElementById('satFisioPrevisao')) document.getElementById('satFisioPrevisao').textContent = formatBRL(sat.fisioflow.projecaoMensalRecorrente);
      if (document.getElementById('badgeFisioStatus')) {
        document.getElementById('badgeFisioStatus').className = 'status-badge pago';
        document.getElementById('badgeFisioStatus').textContent = 'Conectado';
      }
    }

    if (sat.faturas) {
      if (document.getElementById('satFaturaAtual')) document.getElementById('satFaturaAtual').textContent = formatBRL(sat.faturas.faturaAtualValor);
      if (document.getElementById('satFaturasFuturas')) document.getElementById('satFaturasFuturas').textContent = formatBRL(sat.faturas.faturasFuturasTotal);
      if (document.getElementById('badgeFaturasStatus')) {
        document.getElementById('badgeFaturasStatus').className = 'status-badge pago';
        document.getElementById('badgeFaturasStatus').textContent = 'Conectado';
      }
    }

    if (sat.maracaju) {
      if (document.getElementById('satMaracajuMercado')) document.getElementById('satMaracajuMercado').textContent = formatBRL(sat.maracaju.gastoMercadoMesAtual);
      if (document.getElementById('satMaracajuSaldoVa')) {
        document.getElementById('satMaracajuSaldoVa').textContent = formatBRL(sat.maracaju.saldoVaRestante);
        document.getElementById('satMaracajuSaldoVa').style.color = sat.maracaju.transbordouVa > 0 ? 'var(--rose)' : 'var(--matrix-green)';
      }
      if (document.getElementById('badgeMaracajuStatus')) {
        document.getElementById('badgeMaracajuStatus').className = 'status-badge pago';
        document.getElementById('badgeMaracajuStatus').textContent = 'Conectado';
      }
    }
  }

  function salvarConfigSatellites() {
    const cfg = {
      fisioUrl: document.getElementById('cfgFisioUrl').value,
      fisioToken: document.getElementById('cfgFisioToken').value,
      faturasUrl: document.getElementById('cfgFaturasUrl').value,
      faturasToken: document.getElementById('cfgFaturasToken').value,
      maracajuUrl: document.getElementById('cfgMaracajuUrl').value,
      maracajuToken: document.getElementById('cfgMaracajuToken').value,
      autoScrapeOnOpen: document.getElementById('chkAutoScrapeOnOpen').checked
    };
    SatelliteConnectors.saveSatelliteConfig(cfg);
    alert('Configurações dos 3 apps salvas com sucesso!');
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

  function removeItem(ano, mes, tipo, id) {
    if (confirm(`Remover este item do mês de ${mes}?`)) {
      MatrixDB.removeTransaction(ano, mes, tipo, id);
      renderAll();
    }
  }

  function openNewItemModal(tipo) {
    document.getElementById('modalItemTipo').value = tipo;
    document.getElementById('modalItemNome').value = '';
    document.getElementById('modalItemValor').value = '';
    document.getElementById('modalItemCategoria').value = tipo === 'fixo' ? 'Fixos' : 'Variável';
    document.getElementById('modalItemTitle').textContent = tipo === 'fixo' ? 'Novo Gasto Fixo' : 'Novo Gasto Variável';
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

  function saveItemFromModal() {
    const tipo = document.getElementById('modalItemTipo').value;
    const editId = document.getElementById('modalItemEditId').value;
    const nome = document.getElementById('modalItemNome').value.trim();
    const valor = parseFloat(document.getElementById('modalItemValor').value) || 0;
    const cat = document.getElementById('modalItemCategoria').value;

    if (!nome) {
      alert('Informe o nome da despesa.');
      return;
    }

    if (editId) {
      MatrixDB.updateTransaction(currentYear, currentMonth, tipo, editId, { nome, valor, categoria: cat });
    } else {
      MatrixDB.addTransaction(currentYear, currentMonth, tipo, { nome, valor, categoria: cat, pago: false });
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

  function addNewScenarioPrompt() {
    const titulo = prompt('Título do Cenário / Despesa Hipotética (ex: Seguro de Vida Scarlet):');
    if (!titulo) return;
    const valor = parseFloat(prompt('Valor Mensal Estimado em R$ (ex: 125):')) || 0;
    const inicio = prompt('Mês de Início (AAAA-MM, ex: 2026-12):', `${currentYear}-${String(MONTH_NAMES.indexOf(currentMonth) + 1).padStart(2, '0')}`);

    const state = MatrixDB.getState();
    if (!state.simulacoesAtivas) state.simulacoesAtivas = [];
    state.simulacoesAtivas.push({
      id: 'sim_' + Date.now(),
      titulo,
      valorAdotado: valor,
      inicio,
      ativo: true,
      observacao: 'Inserido manualmente'
    });
    MatrixDB.saveState(state);
    renderSimulator();
  }

  function toggleCalendarDay(dateStr) {
    const state = MatrixDB.getState();
    if (!state.calendarioCustom) state.calendarioCustom = { folgas: [] };
    const folgas = state.calendarioCustom.folgas;

    const existingIdx = folgas.findIndex(f => f.data === dateStr);
    if (existingIdx >= 0) {
      folgas.splice(existingIdx, 1);
    } else {
      const motivo = prompt('Motivo da Ausência / Folga / Férias:', 'Férias / Folga');
      if (motivo) {
        folgas.push({ data: dateStr, motivo });
      }
    }
    MatrixDB.saveState(state);
    renderCalendar();
  }

  function aplicarCaronasNoMes() {
    const monthIndex = MONTH_NAMES.indexOf(currentMonth) + 1;
    const state = MatrixDB.getState();
    const customLeaves = (state.calendarioCustom && state.calendarioCustom.folgas) || [];
    const commute = CalendarEngine.calculateCommuteAndVR(parseInt(currentYear, 10), monthIndex, customLeaves);

    // Atualiza ou insere o item "Caronas" nos gastos fixos
    const month = MatrixDB.getMonth(currentYear, currentMonth);
    let caronaItem = (month.fixos || []).find(f => f.nome.toLowerCase().includes('carona'));
    if (caronaItem) {
      caronaItem.valor = commute.totalCaronas;
    } else {
      month.fixos.push({
        id: 'fix_carona_' + Date.now(),
        nome: 'Caronas',
        valor: commute.totalCaronas,
        categoria: 'Transporte',
        pago: false
      });
    }

    // Atualiza VR nos totais
    if (!month.totais) month.totais = {};
    month.totais['VR'] = commute.totalVR;

    MatrixDB.saveMonth(currentYear, currentMonth, month);
    renderAll();
    alert(`Caronas (${formatBRL(commute.totalCaronas)}) e VR (${formatBRL(commute.totalVR)}) atualizados com sucesso para ${currentMonth}!`);
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
      alert(`Holerite identificado: ${res.orgao} - ${res.competencia || 'Lido com sucesso'}!`);
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

    const state = MatrixDB.getState();
    if (!state.holerites) state.holerites = [];

    state.holerites.push({
      periodo: `${ano}-${mes}`,
      orgao: 'USP - PUSP-SC',
      cargo: 'Técnico 1 - Nível A',
      vencimentos: parseFloat(document.getElementById('hlVencimento').value) || 6264.04,
      descontos: (parseFloat(document.getElementById('hlInss').value) || 0) + (parseFloat(document.getElementById('hlIr').value) || 0),
      liquido: liquido,
      fgts: parseFloat(document.getElementById('hlFgts').value) || 501.12
    });

    // Atualiza o mês no Fluxo de Caixa
    const month = MatrixDB.getMonth(ano, mes);
    if (!month.totais) month.totais = {};
    month.totais['Salário Mensal'] = liquido;
    if (auxSaude > 0) month.totais['Auxílio sade'] = auxSaude;

    MatrixDB.saveMonth(ano, mes, month);
    MatrixDB.saveState(state);
    renderAll();
    alert(`Holerite salvo com sucesso e lançado no mês de ${mes}/${ano}!`);
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
    togglePaid,
    removeItem,
    openNewItemModal,
    editItemModal,
    saveItemFromModal,
    closeModal,
    toggleScenarioActive,
    removeScenario,
    addNewScenarioPrompt,
    toggleCalendarDay,
    aplicarCaronasNoMes,
    simularAmortizacao,
    saveCloudSettings,
    testCloudConnection,
    forceSyncToCloud,
    forceFetchFromCloud,
    downloadBackupFile,
    importBackupFile,
    salvarHoleriteManual,
    salvarConfigSatellites,
    executarScrapingSatellites
  };
})();

if (typeof window !== 'undefined') {
  window.MatrixApp = MatrixApp;
}
