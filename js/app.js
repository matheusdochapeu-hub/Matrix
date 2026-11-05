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
    populateYearSelector();
    setupEventListeners();
    updateMonthDisplay();
    renderAll();

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

  function setupEventListeners() {
    // Month navigation
    document.getElementById('prevMonthBtn').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonthBtn').addEventListener('click', () => changeMonth(1));

    // Year selection
    const yearSelect = document.getElementById('yearSelect');
    if (yearSelect) {
      yearSelect.addEventListener('change', (e) => {
        currentYear = e.target.value;
        const allYears = MatrixDB.getAllYears();
        if (!allYears.includes(currentYear)) {
          MatrixDB.createYear(currentYear, allYears[allYears.length - 1] || '2027');
        }
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
      titleEl.innerHTML = `💳 Fatura Nubank Black & Divisão com Scarlet (${periodLabel})`;
      const faturaNubank = (monthData.scarlet && monthData.scarlet.faturaNubank) || 4500.00;
      const ganhosScarlet = (monthData.scarlet && monthData.scarlet.ganhos) || 1100.00;
      const diferenca = Math.max(0, faturaNubank - ganhosScarlet);

      html = `
        <div style="font-family:var(--font-mono);font-size:12.5px;line-height:1.9;">
          <div style="background:var(--bg-card);border:1px solid var(--border-dim);padding:14px;border-radius:var(--radius-sm);margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
              <span style="color:var(--rose);">Fatura Nubank Black (Mastercard):</span>
              <strong style="font-size:14px;">${formatBRL(faturaNubank)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
              <span style="color:var(--cyan);">(-) Ganhos Previstos da Scarlet (FisioFlow):</span>
              <span style="color:var(--cyan);">- ${formatBRL(ganhosScarlet)}</span>
            </div>
            <div style="border-top:1px solid var(--border-dim);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-size:13.5px;">
              <strong>(=) Valor da Fatura Coberto pela Casa:</strong>
              <strong style="color:var(--amber);">${formatBRL(diferenca)}</strong>
            </div>
          </div>
          <div style="font-size:11px;color:var(--text-muted);line-height:1.6;">
            • <strong>Mensalidade Ultravioleta:</strong> R$ 89,00 inclusa.<br>
            • <strong>Origem dos Dados:</strong> Sincronizado diretamente com a fatura do mês de ${periodLabel} e cruzado com os atendimentos domiciliares da Scarlet.
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
        fixosTbody.innerHTML = fixosList.map((f, i) => `
          <tr class="${f.pago ? 'paid' : ''}">
            <td>
              <strong>${f.nome}</strong>
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
              <button class="btn-icon" title="Editar este lançamento" onclick="MatrixApp.editItemByIndex('${currentYear}', '${currentMonth}', 'fixo', ${i})">✏️</button>
              <button class="btn-icon" title="Excluir este lançamento" onclick="MatrixApp.removeItemByIndex('${currentYear}', '${currentMonth}', 'fixo', ${i})">🗑️</button>
            </td>
          </tr>
        `).join('');
      }
    }

    // Render Outros / Variáveis Table Body
    const outrosTbody = document.getElementById('outrosTableBody');
    if (outrosTbody) {
      if (outrosList.length === 0) {
        outrosTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:18px;">Nenhum gasto variável cadastrado em ${currentMonth}.</td></tr>`;
      } else {
        outrosTbody.innerHTML = outrosList.map((o, i) => `
          <tr class="${o.pago ? 'paid' : ''}">
            <td>
              <strong>${o.nome}</strong>
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
              <button class="btn-icon" title="Editar este lançamento" onclick="MatrixApp.editItemByIndex('${currentYear}', '${currentMonth}', 'outro', ${i})">✏️</button>
              <button class="btn-icon" title="Excluir este lançamento" onclick="MatrixApp.removeItemByIndex('${currentYear}', '${currentMonth}', 'outro', ${i})">🗑️</button>
            </td>
          </tr>
        `).join('');
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
              <div style="font-size:10px;color:var(--text-dim);">${r.categoria || 'Receita'}</div>
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

    // Saldo Final do Mês no Fechamento
    const saldoFinal = totalReceitas - (totalFixos + totalOutros);
    const saldoFinalEl = document.getElementById('fechamentoSaldoFinal');
    if (saldoFinalEl) {
      saldoFinalEl.textContent = formatBRL(saldoFinal);
      saldoFinalEl.style.color = saldoFinal >= 0 ? 'var(--matrix-green)' : 'var(--rose)';
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

    const allYears = MatrixDB.getAllYears();
    if (!allYears.includes(currentYear)) {
      MatrixDB.createYear(currentYear, allYears[allYears.length - 1] || '2027');
    }

    populateYearSelector();
    updateMonthDisplay();
    renderAll();

    closeModal('drilldownModalBackdrop');
    closeModal('scenarioModalBackdrop');

    const fluxoTabBtn = document.querySelector('[data-tab="tab-fluxo"]');
    if (fluxoTabBtn) fluxoTabBtn.click();

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
      if (document.getElementById('satMaracajuGastoVr')) document.getElementById('satMaracajuGastoVr').textContent = formatBRL(sat.maracaju.gastoVrMesAtual || 0);
      if (document.getElementById('satMaracajuSaldoVr')) {
        document.getElementById('satMaracajuSaldoVr').textContent = formatBRL(sat.maracaju.saldoVrRestante || 0);
        document.getElementById('satMaracajuSaldoVr').style.color = (sat.maracaju.transbordouVr || 0) > 0 ? 'var(--rose)' : 'var(--cyan)';
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
    const tipoLabel = tipo === 'receita' ? 'a receita' : 'o lançamento';
    const itemDesc = item ? `"${item.nome}" (${formatBRL(item.valor)})` : 'este item';
    if (confirm(`Deseja realmente excluir ${tipoLabel} ${itemDesc} do mês de ${mes}/${ano}?`)) {
      MatrixDB.removeTransactionByIndex(ano, mes, tipo, index);
      renderAll();
    }
  }

  function openNewItemModal(tipo) {
    document.getElementById('modalItemTipo').value = tipo;
    document.getElementById('modalItemEditId').value = '';
    document.getElementById('modalItemNome').value = '';
    document.getElementById('modalItemValor').value = '';

    const chkPago = document.getElementById('modalItemPago');
    if (chkPago) chkPago.checked = false;

    const titleEl = document.getElementById('modalItemTitle');
    const nomeLabel = document.getElementById('modalItemNomeLabel');
    const nomeInput = document.getElementById('modalItemNome');
    const pagoLabel = document.getElementById('modalItemPagoLabel');
    const catSelect = document.getElementById('modalItemCategoria');

    if (tipo === 'receita') {
      if (titleEl) titleEl.textContent = '+ Nova Receita / Ganho';
      if (nomeLabel) nomeLabel.textContent = 'Descrição da Receita:';
      if (nomeInput) nomeInput.placeholder = 'Ex: Salário USP, 13º Salário, Estúdio, Fisio Scarlet...';
      if (pagoLabel) pagoLabel.textContent = 'Marcar como Já Recebido neste Mês';
      if (catSelect) catSelect.value = 'Salário / Proventos';
    } else if (tipo === 'fixo') {
      if (titleEl) titleEl.textContent = '+ Novo Gasto Fixo';
      if (nomeLabel) nomeLabel.textContent = 'Descrição da Despesa Fixa:';
      if (nomeInput) nomeInput.placeholder = 'Ex: Parcela Caixa, Água, Luz, Internet...';
      if (pagoLabel) pagoLabel.textContent = 'Marcar como Já Pago neste Mês';
      if (catSelect) catSelect.value = 'Habitação';
    } else {
      if (titleEl) titleEl.textContent = '+ Novo Gasto Variável';
      if (nomeLabel) nomeLabel.textContent = 'Descrição do Gasto Variável:';
      if (nomeInput) nomeInput.placeholder = 'Ex: Mercado Extra, Farmácia, Lazer...';
      if (pagoLabel) pagoLabel.textContent = 'Marcar como Já Pago neste Mês';
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

    const chkPago = document.getElementById('modalItemPago');
    if (chkPago) chkPago.checked = !!item.pago;

    const titleEl = document.getElementById('modalItemTitle');
    const nomeLabel = document.getElementById('modalItemNomeLabel');
    const pagoLabel = document.getElementById('modalItemPagoLabel');

    if (tipo === 'receita') {
      if (titleEl) titleEl.textContent = `Editar Receita: ${item.nome}`;
      if (nomeLabel) nomeLabel.textContent = 'Descrição da Receita:';
      if (pagoLabel) pagoLabel.textContent = 'Marcar como Já Recebido neste Mês';
    } else {
      if (titleEl) titleEl.textContent = `Editar Despesa: ${item.nome}`;
      if (nomeLabel) nomeLabel.textContent = 'Descrição da Despesa:';
      if (pagoLabel) pagoLabel.textContent = 'Marcar como Já Pago neste Mês';
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
    const pago = document.getElementById('modalItemPago') ? document.getElementById('modalItemPago').checked : false;

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
    if (auxSaude > 0) month.totais['Auxílio-Saúde USP'] = auxSaude;

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
    simularAmortizacao,
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
    navegarParaMes
  };
})();

if (typeof window !== 'undefined') {
  window.MatrixApp = MatrixApp;
}
