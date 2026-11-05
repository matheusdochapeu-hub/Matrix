/**
 * MATRIX FINANCE - DIGITAL RAIN CANVAS ENGINE
 * Efeito visual sutil com glifos caindo, alta performance e controle liga/desliga.
 */

(function () {
  const canvas = document.getElementById('matrixCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let animationId = null;
  let isRunning = true;

  // Caracteres Matrix: Katakana + Números + Símbolos
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$¥€%#*+-=><';
  const fontSize = 14;
  let columns = 0;
  let drops = [];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.floor(canvas.width / fontSize);
    drops = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.floor(Math.random() * -50);
    }
  }

  let lastDrawTime = 0;
  const isMobile = window.innerWidth < 768;
  const targetInterval = isMobile ? 45 : 30; // ~22fps no mobile (super econômico), ~33fps no desktop

  function draw(timestamp) {
    if (!timestamp) timestamp = performance.now();
    const elapsed = timestamp - lastDrawTime;

    if (elapsed > targetInterval) {
      lastDrawTime = timestamp - (elapsed % targetInterval);

      // Efeito de rastro translúcido escuro
      ctx.fillStyle = 'rgba(5, 8, 7, 0.09)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = fontSize + "px 'JetBrains Mono', monospace";

      for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        
        // Primeiro caractere da gota é mais brilhante
        if (Math.random() > 0.85) {
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = '#00ff66';
        }

        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.985) {
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
  resizeCanvas();

  // Restaurar preferência do usuário
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
