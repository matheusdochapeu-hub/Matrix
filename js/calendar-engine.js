/**
 * MATRIX FINANCE - CALENDAR & COMMUTE ENGINE (USP SÃO CARLOS)
 * Inteligência de dias úteis, caronas (R$ 60/dia), Vale Refeição (R$ 65/dia),
 * recesso USP (18/12 a 04/01) e gestão de folgas/férias.
 */

const CalendarEngine = (function () {
  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Feriados fixos anuais no estado de SP e São Carlos/Ribeirão
  const FIXED_HOLIDAYS = [
    { month: 1, day: 1, desc: 'Ano Novo / Confraternização Universal' },
    { month: 1, day: 20, desc: 'São Sebastião (Padroeiro Ribeirão Preto)' },
    { month: 4, day: 21, desc: 'Tiradentes' },
    { month: 5, day: 1, desc: 'Dia do Trabalho' },
    { month: 6, day: 19, desc: 'Aniversário de Ribeirão Preto' },
    { month: 7, day: 9, desc: 'Revolução Constitucionalista de 1932 (SP)' },
    { month: 8, day: 15, desc: 'N. Sra. da Babilônia (São Carlos)' },
    { month: 9, day: 7, desc: 'Independência do Brasil' },
    { month: 10, day: 12, desc: 'Nossa Senhora Aparecida' },
    { month: 10, day: 28, desc: 'Dia do Servidor Público (Geralmente Facultativo)' },
    { month: 11, day: 2, desc: 'Finados' },
    { month: 11, day: 4, desc: 'Aniversário de São Carlos' },
    { month: 11, day: 15, desc: 'Proclamação da República' },
    { month: 11, day: 20, desc: 'Dia da Consciência Negra' },
    { month: 12, day: 25, desc: 'Natal' }
  ];

  // Cálculo da Páscoa (algoritmo de Meeus/Jones/Butcher)
  function getEaster(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  function getMovableHolidays(year) {
    const easter = getEaster(year);
    function addDays(date, days) {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d;
    }
    const carnaval = addDays(easter, -47);
    const sextaSanta = addDays(easter, -2);
    const corpusChristi = addDays(easter, 60);

    return [
      { date: carnaval, desc: 'Carnaval' },
      { date: sextaSanta, desc: 'Sexta-feira Santa' },
      { date: corpusChristi, desc: 'Corpus Christi' }
    ];
  }

  // Verifica se uma data específica cai em recesso de fim de ano da USP
  function isUspRecess(year, month, day) {
    // Recesso oficial: 18 de dezembro a 04 de janeiro
    if (month === 12 && day >= 18) return true;
    if (month === 1 && day <= 4) return true;
    return false;
  }

  function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
  }

  // Localiza override customizado por data (suporta objeto .overrides ou array .folgas)
  function getOverrideForDate(customData, dateStr) {
    if (!customData) return null;
    if (customData.overrides && customData.overrides[dateStr]) {
      return customData.overrides[dateStr];
    }
    const list = Array.isArray(customData) ? customData : (Array.isArray(customData.folgas) ? customData.folgas : []);
    const found = list.find(item => item && (item.data === dateStr || item.date === dateStr));
    if (found) {
      return {
        tipo: found.tipo || 'folga',
        motivo: found.motivo || 'Folga / Férias'
      };
    }
    return null;
  }

  function getMonthDaysInfo(year, monthIndex, customLeaves = []) {
    // monthIndex: 1 to 12
    const totalDays = new Date(year, monthIndex, 0).getDate();
    const firstDayOfWeek = new Date(year, monthIndex - 1, 1).getDay(); // 0 = Dom, 1 = Seg, ..., 6 = Sáb
    const lastDayOfWeek = new Date(year, monthIndex - 1, totalDays).getDay();
    const prevMonthDays = new Date(year, monthIndex - 1, 0).getDate();
    const movables = getMovableHolidays(year);
    const days = [];
    let workingDaysCount = 0;
    let customLeavesCount = 0;
    let holidaysCount = 0;

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, monthIndex - 1, d);
      const isWk = isWeekend(dateObj);
      let isHoliday = false;
      let holidayDesc = '';

      // 1. Verifica feriado fixo oficial
      const fix = FIXED_HOLIDAYS.find(h => h.month === monthIndex && h.day === d);
      if (fix) {
        isHoliday = true;
        holidayDesc = fix.desc;
      }

      // 2. Verifica feriado móvel
      if (!isHoliday) {
        const mov = movables.find(m => m.date.getMonth() === (monthIndex - 1) && m.date.getDate() === d);
        if (mov) {
          isHoliday = true;
          holidayDesc = mov.desc;
        }
      }

      // 3. Verifica recesso USP
      let inRecess = isUspRecess(year, monthIndex, d);
      if (inRecess && !holidayDesc) {
        holidayDesc = 'Recesso USP de Final de Ano';
      }

      // Snapshot dos atributos padrão oficiais USP
      const defaultIsHoliday = isHoliday;
      const defaultHolidayDesc = holidayDesc;
      const defaultInRecess = inRecess;
      const defaultIsWeekend = isWk;
      const defaultIsWorkDay = !isWk && !isHoliday && !inRecess;

      // 4. Verifica override customizado do usuário
      const dateStr = `${year}-${String(monthIndex).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const override = getOverrideForDate(customLeaves, dateStr);

      let isCustomLeave = false;
      let customLeaveDesc = '';
      let isWorkDay = defaultIsWorkDay;
      let statusTipo = 'workday';

      if (override) {
        const tipo = (override.tipo || '').toLowerCase();
        if (tipo === 'presencial' || tipo === 'trabalho' || tipo === 'trabalho_presencial') {
          // Usuário trabalhou presencialmente (mesmo sendo feriado ou fim de semana)
          isWorkDay = true;
          isHoliday = false;
          holidayDesc = '';
          inRecess = false;
          isCustomLeave = false;
          statusTipo = 'workday';
        } else if (tipo === 'abonada') {
          isWorkDay = false;
          isHoliday = false;
          inRecess = false;
          isCustomLeave = true;
          customLeaveDesc = override.motivo || 'Falta Abonada';
          statusTipo = 'abonada';
          customLeavesCount++;
        } else if (tipo === 'folga') {
          isWorkDay = false;
          isHoliday = false;
          inRecess = false;
          isCustomLeave = true;
          customLeaveDesc = override.motivo || 'Folga';
          statusTipo = 'folga';
          customLeavesCount++;
        } else if (tipo === 'ferias') {
          isWorkDay = false;
          isHoliday = false;
          inRecess = false;
          isCustomLeave = true;
          customLeaveDesc = override.motivo || 'Férias';
          statusTipo = 'ferias';
          customLeavesCount++;
        } else if (tipo === 'feriado') {
          isWorkDay = false;
          isHoliday = true;
          inRecess = false;
          isCustomLeave = false;
          holidayDesc = override.motivo || 'Feriado';
          statusTipo = 'holiday';
          holidaysCount++;
        } else if (tipo === 'fim_semana') {
          isWorkDay = false;
          isHoliday = false;
          inRecess = false;
          isCustomLeave = false;
          statusTipo = 'weekend';
        } else {
          // Fallback para regra padrão
          if (isWk) {
            statusTipo = 'weekend';
          } else if (isHoliday) {
            statusTipo = 'holiday';
            holidaysCount++;
          } else if (inRecess) {
            statusTipo = 'recess';
            holidaysCount++;
          } else {
            statusTipo = 'workday';
          }
        }
      } else {
        // Sem override: segue regra padrão oficial USP
        if (isWk) {
          statusTipo = 'weekend';
        } else if (isHoliday) {
          statusTipo = 'holiday';
          holidaysCount++;
        } else if (inRecess) {
          statusTipo = 'recess';
          holidaysCount++;
        } else {
          statusTipo = 'workday';
        }
      }

      if (isWorkDay) {
        workingDaysCount++;
      }

      days.push({
        day: d,
        dateStr,
        dayOfWeek: dateObj.getDay(),
        dayOfWeekStr: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dateObj.getDay()],
        isWeekend: isWk,
        isHoliday,
        holidayDesc,
        inRecess,
        isCustomLeave,
        customLeaveDesc,
        isWorkDay,
        statusTipo,
        override,
        defaultInfo: {
          isWorkDay: defaultIsWorkDay,
          isHoliday: defaultIsHoliday,
          holidayDesc: defaultHolidayDesc,
          inRecess: defaultInRecess,
          isWeekend: defaultIsWeekend
        }
      });
    }

    // Dias de preenchimento antes do dia 1 (para começar domingo = índice 0)
    const paddingDaysBefore = [];
    for (let p = firstDayOfWeek - 1; p >= 0; p--) {
      paddingDaysBefore.push({
        day: prevMonthDays - p,
        isPadding: true,
        type: 'prev'
      });
    }

    // Dias de preenchimento após o último dia do mês (para fechar sábado = índice 6)
    const paddingDaysAfter = [];
    const trailingCount = 6 - lastDayOfWeek;
    for (let t = 1; t <= trailingCount; t++) {
      paddingDaysAfter.push({
        day: t,
        isPadding: true,
        type: 'next'
      });
    }

    return {
      year,
      monthIndex,
      monthName: MONTH_NAMES[monthIndex - 1],
      totalDays,
      firstDayOfWeek,
      lastDayOfWeek,
      paddingDaysBefore,
      paddingDaysAfter,
      workingDaysCount,
      customLeavesCount,
      holidaysCount,
      days
    };
  }

  function getSalaryCycleInfo(year, monthIndex, customLeaves = []) {
    // 1. Mês corrente
    const currentMonthInfo = getMonthDaysInfo(year, monthIndex, customLeaves);
    const currentWorkingDays = currentMonthInfo.days.filter(d => d.isWorkDay);

    // O 4º dia útil do mês corrente (dia do pagamento do salário)
    const paydayIndex = 3; // 4º dia útil (0-indexed)
    const startDayObj = (currentWorkingDays.length >= 4) ? currentWorkingDays[paydayIndex] : (currentWorkingDays[0] || { day: 1, dateStr: `${year}-${String(monthIndex).padStart(2, '0')}-01` });

    // 2. Mês subsequente
    const nextYear = monthIndex === 12 ? year + 1 : year;
    const nextMonthIndex = monthIndex === 12 ? 1 : monthIndex + 1;
    const nextMonthInfo = getMonthDaysInfo(nextYear, nextMonthIndex, customLeaves);
    const nextWorkingDays = nextMonthInfo.days.filter(d => d.isWorkDay);

    // O 3º dia útil do mês subsequente (um dia antes do 4º dia útil / pagamento)
    const endDayObj = (nextWorkingDays.length >= 3) ? nextWorkingDays[paydayIndex - 1] : (nextWorkingDays[0] || { day: 1, dateStr: `${nextYear}-${String(nextMonthIndex).padStart(2, '0')}-01` });

    // 3. Dias úteis no ciclo salarial:
    // Parte A: Dias do mês corrente a partir do startDayObj.day (inclusive) até o fim do mês
    const daysInCurrentMonth = currentMonthInfo.days.filter(d => d.day >= startDayObj.day && d.isWorkDay);

    // Parte B: Dias do mês subsequente a partir do dia 1 até endDayObj.day (inclusive)
    const daysInNextMonth = nextMonthInfo.days.filter(d => d.day <= endDayObj.day && d.isWorkDay);

    const cycleWorkingDaysCount = daysInCurrentMonth.length + daysInNextMonth.length;
    const caronaUnit = 60.0;
    const totalCaronas = cycleWorkingDaysCount * caronaUnit;

    const startFormatted = `${String(startDayObj.day).padStart(2, '0')}/${String(monthIndex).padStart(2, '0')}`;
    const endFormatted = `${String(endDayObj.day).padStart(2, '0')}/${String(nextMonthIndex).padStart(2, '0')}`;
    const cycleRangeLabel = `${startFormatted} a ${endFormatted}`;

    return {
      startDay: startDayObj.day,
      startDateStr: startDayObj.dateStr,
      startFormatted,
      endDay: endDayObj.day,
      endDateStr: endDayObj.dateStr,
      endFormatted,
      cycleRangeLabel,
      cycleWorkingDaysCount,
      daysInCurrentMonthCount: daysInCurrentMonth.length,
      daysInNextMonthCount: daysInNextMonth.length,
      caronaUnit,
      totalCaronas
    };
  }

  function calculateCommuteAndVR(year, monthIndex, customLeaves = []) {
    const info = getMonthDaysInfo(year, monthIndex, customLeaves);
    const cycle = getSalaryCycleInfo(year, monthIndex, customLeaves);

    const caronaUnit = 60.0;
    const vrUnit = 65.0;
    const vaMensal = 2050.0;

    // VR: conta dias úteis trabalhados no Mês Civil (01/M a 31/M)
    const vrWorkingDaysCount = info.workingDaysCount;
    const totalVR = vrWorkingDaysCount * vrUnit;

    // Caronas: conta dias úteis entre salários (4º dia útil de M até 3º dia útil de M+1)
    const commuteWorkingDaysCount = cycle.cycleWorkingDaysCount;
    const totalCaronas = cycle.totalCaronas;

    return {
      ...info,
      vrUnit,
      vrWorkingDaysCount,
      totalVR,
      vaMensal,
      caronaUnit,
      commuteWorkingDaysCount,
      totalCaronas,
      salaryCycle: cycle
    };
  }

  return {
    MONTH_NAMES,
    FIXED_HOLIDAYS,
    getMonthDaysInfo,
    getSalaryCycleInfo,
    calculateCommuteAndVR
  };
})();

if (typeof window !== 'undefined') {
  window.CalendarEngine = CalendarEngine;
}
