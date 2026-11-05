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

      // Verifica feriado fixo
      const fix = FIXED_HOLIDAYS.find(h => h.month === monthIndex && h.day === d);
      if (fix) {
        isHoliday = true;
        holidayDesc = fix.desc;
      }

      // Verifica feriado móvel
      if (!isHoliday) {
        const mov = movables.find(m => m.date.getMonth() === (monthIndex - 1) && m.date.getDate() === d);
        if (mov) {
          isHoliday = true;
          holidayDesc = mov.desc;
        }
      }

      // Verifica recesso USP
      const inRecess = isUspRecess(year, monthIndex, d);
      if (inRecess && !holidayDesc) {
        holidayDesc = 'Recesso USP de Final de Ano';
      }

      // Verifica folgas/férias customizadas
      const dateStr = `${year}-${String(monthIndex).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const custom = customLeaves.find(cl => cl.data === dateStr);
      let isCustomLeave = false;
      let customLeaveDesc = '';
      if (custom) {
        isCustomLeave = true;
        customLeaveDesc = custom.motivo || 'Folga / Férias';
        customLeavesCount++;
      }

      if (isHoliday || inRecess) {
        holidaysCount++;
      }

      const isWorkDay = !isWk && !isHoliday && !inRecess && !isCustomLeave;
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
        isWorkDay
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

  function calculateCommuteAndVR(year, monthIndex, customLeaves = []) {
    const info = getMonthDaysInfo(year, monthIndex, customLeaves);
    const caronaUnit = 60.0;
    const vrUnit = 65.0;
    const vaMensal = 2050.0;

    const totalCaronas = info.workingDaysCount * caronaUnit;
    const totalVR = info.workingDaysCount * vrUnit;

    return {
      ...info,
      caronaUnit,
      vrUnit,
      vaMensal,
      totalCaronas,
      totalVR
    };
  }

  return {
    MONTH_NAMES,
    FIXED_HOLIDAYS,
    getMonthDaysInfo,
    calculateCommuteAndVR
  };
})();

if (typeof window !== 'undefined') {
  window.CalendarEngine = CalendarEngine;
}
