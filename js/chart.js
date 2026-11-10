// ============================================================================
// GRÁFICO INTERATIVO DE CRESCIMENTO (Canvas 2D com Tooltip e Filtros)
// ============================================================================
window.Porquinhos = window.Porquinhos || {};

(function (ns) {
  let pontosRenderizados = [];
  const ocultos = new Set();
  let diasFiltro = 0;
  let eventosRegistrados = false;

  function alternarVisibilidadePorquinho(i) {
    if (ocultos.has(i)) ocultos.delete(i);
    else ocultos.add(i);
  }

  function isPorquinhoOculto(i) {
    return ocultos.has(i);
  }

  function setDiasFiltro(dias) {
    diasFiltro = dias;
  }

  function getDiasFiltro() {
    return diasFiltro;
  }

  function desenharGrafico(dados) {
    const cv = document.getElementById('graf');
    if (!cv) return;

    if (!eventosRegistrados) {
      configurarInteracaoTooltip(cv);
      eventosRegistrados = true;
    }

    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth || 600;
    const h = 220;
    cv.width = w * dpr;
    cv.height = h * dpr;

    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const isNight = document.documentElement.getAttribute('data-theme') === 'night';
    const corTexto = isNight ? '#b09b8c' : '#8a7464';
    const corGrade = isNight ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

    ctx.font = '13px Fredoka, system-ui, sans-serif';
    ctx.fillStyle = corTexto;

    const tMs = (d) => new Date(d + 'T12:00:00').getTime();
    const agora = Date.now();
    const limiteMin = diasFiltro > 0 ? agora - diasFiltro * 86400000 : 0;

    const series = dados.map((p, i) => {
      if (ocultos.has(i)) return [];
      return p.pesos.filter((r) => tMs(r.data) >= limiteMin);
    });

    const todos = series.flat();
    pontosRenderizados = [];

    if (todos.length < 2) {
      ctx.textAlign = 'center';
      ctx.fillText(
        'Registre pelo menos 2 pesagens para ver a curva de crescimento',
        w / 2,
        h / 2
      );
      ctx.textAlign = 'left';
      return;
    }

    let t0 = Math.min(...todos.map((r) => tMs(r.data)));
    let t1 = Math.max(...todos.map((r) => tMs(r.data)));
    if (t1 === t0) t1 = t0 + 86400000;

    let g0 = Math.min(...todos.map((r) => r.g));
    let g1 = Math.max(...todos.map((r) => r.g));
    const pad = (g1 - g0) * 0.14 || 25;
    g0 = Math.max(0, g0 - pad);
    g1 += pad;

    const L = 52;
    const R = 14;
    const T = 14;
    const B = 26;

    const X = (d) => L + ((tMs(d) - t0) / (t1 - t0)) * (w - L - R);
    const Y = (g) => T + (1 - (g - g0) / (g1 - g0)) * (h - T - B);

    ctx.strokeStyle = corGrade;
    ctx.lineWidth = 1;
    for (let k = 0; k <= 4; k++) {
      const g = g0 + ((g1 - g0) * k) / 4;
      const y = Y(g);
      ctx.beginPath();
      ctx.moveTo(L, y);
      ctx.lineTo(w - R, y);
      ctx.stroke();
      ctx.fillText(Math.round(g) + ' g', 4, y + 4);
    }

    const fmt = (ms) => {
      const d = new Date(ms);
      return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
    };

    ctx.fillText(fmt(t0), L, h - 6);
    const sMeio = fmt((t0 + t1) / 2);
    ctx.fillText(sMeio, (L + w - R - ctx.measureText(sMeio).width) / 2, h - 6);
    const sFim = fmt(t1);
    ctx.fillText(sFim, w - R - ctx.measureText(sFim).width, h - 6);

    series.forEach((pesos, i) => {
      if (!pesos.length) return;
      const cor = isNight && i === 1 ? '#a8a29e' : ns.TIPOS[i].linha;
      ctx.strokeStyle = cor;
      ctx.fillStyle = cor;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();
      pesos.forEach((r, k) => {
        const px = X(r.data);
        const py = Y(r.g);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      pesos.forEach((r) => {
        const px = X(r.data);
        const py = Y(r.g);
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();

        pontosRenderizados.push({
          x: px,
          y: py,
          nome: dados[i].nome,
          cor,
          data: ns.formatarDataBR(r.data),
          g: r.g,
          nota: r.nota || '',
        });
      });
    });
  }

  function configurarInteracaoTooltip(cv) {
    const tooltip = document.getElementById('graf-tooltip');
    if (!tooltip) return;

    cv.addEventListener('pointermove', (e) => {
      if (!pontosRenderizados.length) {
        tooltip.style.opacity = '0';
        return;
      }
      const rect = cv.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let maisProximo = null;
      let menorDist = 22;

      for (const pt of pontosRenderizados) {
        const d = Math.hypot(pt.x - mx, pt.y - my);
        if (d < menorDist) {
          menorDist = d;
          maisProximo = pt;
        }
      }

      if (maisProximo) {
        tooltip.innerHTML = `<strong>${maisProximo.nome}</strong> · ${maisProximo.g} g<br><small>${maisProximo.data}${maisProximo.nota ? ' — ' + maisProximo.nota : ''}</small>`;
        tooltip.style.opacity = '1';
        const left = Math.min(Math.max(12, maisProximo.x), rect.width - 140);
        tooltip.style.left = left + 'px';
        tooltip.style.top = Math.max(8, maisProximo.y - 36) + 'px';
      } else {
        tooltip.style.opacity = '0';
      }
    });

    cv.addEventListener('pointerleave', () => {
      tooltip.style.opacity = '0';
    });
  }

  Object.assign(ns, {
    alternarVisibilidadePorquinho,
    isPorquinhoOculto,
    setDiasFiltro,
    getDiasFiltro,
    desenharGrafico,
  });
})(window.Porquinhos);
