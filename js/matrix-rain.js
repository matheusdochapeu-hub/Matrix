/**
 * MATRIX FINANCE - DIGITAL RAIN CANVAS ENGINE
 * Efeito visual dinâmico com glifos caindo no Desktop e Mobile (Celular).
 * Alta performance, rastro suave, inicialização instantânea e controle liga/desliga.
 */

(function () {
  const canvas = document.getElementById('matrixCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let animationId = null;
  let isRunning = true;

  // Caracteres Matrix: Katakana + Números + Símbolos
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$¥€%#*+-=><';
  let columns = 0;
  let drops = [];
  let lastWidth = 0;
  let lastHeight = 0;

  function getFontSize() {
    return window.innerWidth < 768 ? 12 : 14;
  }

  function resizeCanvas() {
    const w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 360;
    const h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 640;

    // Se apenas a altura variou sutilmente (típico de rolagem móvel com barra de endereços), não reiniciar gotas
    const widthChanged = Math.abs(w - lastWidth) > 10;
    const heightChangedSubstantially = Math.abs(h - lastHeight) > 140;

    if (!widthChanged && !heightChangedSubstantially && drops.length > 0) {
      return;
    }

    lastWidth = w;
    lastHeight = h;
    canvas.width = w;
    canvas.height = h;

    const fontSize = getFontSize();
    const newColumns = Math.floor(w / fontSize);

    if (newColumns !== columns || drops.length === 0) {
      columns = newColumns;
      const oldDrops = drops;
      drops = [];
      const maxRows = Math.floor(h / fontSize);

      for (let i = 0; i < columns; i++) {
        // Distribui imediatamente as gotas ao longo da altura da tela (sem delay inicial no celular)
        if (oldDrops && oldDrops[i] !== undefined && oldDrops[i] <= maxRows) {
          drops[i] = oldDrops[i];
        } else {
          drops[i] = Math.floor(Math.random() * maxRows);
        }
      }
    }
  }

  let lastDrawTime = 0;

  function draw(timestamp) {
    if (!timestamp) timestamp = performance.now();
    const isMobile = window.innerWidth < 768;
    const targetInterval = isMobile ? 38 : 30; // ~26fps mobile, ~33fps desktop (econômico de bateria)
    const elapsed = timestamp - lastDrawTime;

    if (elapsed > targetInterval) {
      lastDrawTime = timestamp - (elapsed % targetInterval);

      const fontSize = getFontSize();

      // Rastro escuro translúcido para efeito Matrix
      ctx.fillStyle = isMobile ? 'rgba(5, 8, 7, 0.12)' : 'rgba(5, 8, 7, 0.09)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = fontSize + "px 'JetBrains Mono', monospace";

      for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));

        // Primeiro caractere é mais brilhante / branco
        if (Math.random() > 0.86) {
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = isMobile ? '#00ff77' : '#00ff66';
        }

        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Quando passa do fim da tela, reinicia aleatoriamente no topo
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.982) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    if (isRunning) {
      animationId = requestAnimationFrame(draw);
    }
  }

  window.toggleMatrixRain = function (forceState) {
    if (typeof forceState === 'boolean') {
      isRunning = forceState;
    } else {
      isRunning = !isRunning;
    }

    if (isRunning) {
      canvas.classList.remove('rain-off');
      draw();
    } else {
      canvas.classList.add('rain-off');
      if (animationId) cancelAnimationFrame(animationId);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    try {
      localStorage.setItem('matrix_rain_enabled', isRunning ? 'true' : 'false');
    } catch(e) {}

    const toggleBtn = document.getElementById('rainToggleBtn');
    if (toggleBtn) {
      toggleBtn.textContent = isRunning ? '⚡ Rain ON' : '💤 Rain OFF';
      toggleBtn.classList.toggle('primary', isRunning);
    }
    return isRunning;
  };

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => {
    lastWidth = 0;
    setTimeout(resizeCanvas, 150);
  });

  resizeCanvas();

  // Restaurar preferência do usuário (padrão é ativado)
  try {
    const saved = localStorage.getItem('matrix_rain_enabled');
    if (saved === 'false') {
      window.toggleMatrixRain(false);
    } else {
      draw();
    }
  } catch (e) {
    draw();
  }
})();
