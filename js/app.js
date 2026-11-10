// ============================================================================
// CONTROLADOR PRINCIPAL DA INTERFACE (UI, Cards, Ações e Eventos)
// ============================================================================
window.Porquinhos = window.Porquinhos || {};

(function (ns) {
  const $ = (s) => document.querySelector(s);
  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
    );

  let dados = ns.carregarDados();
  let desfazerAcao = null;
  const historicoExpandido = {};

  function aplicarTemaInicial() {
    let temaSalvo = 'day';
    try {
      temaSalvo = localStorage.getItem(ns.THEME_KEY) || 'day';
    } catch (e) {}
    if (temaSalvo === 'night') {
      document.documentElement.setAttribute('data-theme', 'night');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    atualizarBotaoTema();
  }

  function alternarTema() {
    const isNight = document.documentElement.getAttribute('data-theme') === 'night';
    try {
      if (isNight) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem(ns.THEME_KEY, 'day');
      } else {
        document.documentElement.setAttribute('data-theme', 'night');
        localStorage.setItem(ns.THEME_KEY, 'night');
      }
    } catch (e) {}
    atualizarBotaoTema();
    ns.atualizarTema3D(!isNight);
    ns.desenharGrafico(dados);
  }

  function atualizarBotaoTema() {
    const btn = $('#btn-tema');
    if (!btn) return;
    const isNight = document.documentElement.getAttribute('data-theme') === 'night';
    btn.textContent = isNight ? '☀️ Dia' : '🌙 Noite';
  }

  function atualizarBotaoSom() {
    const btn = $('#btn-som');
    if (!btn) return;
    const ativo = ns.isSomAtivo();
    btn.textContent = ativo ? '🔊 Som' : '🔇 Mudo';
    btn.classList.toggle('active', ativo);
  }

  function renderResumoGeral() {
    const container = $('#resumo-geral');
    if (!container) return;

    const totalPesagens = dados.reduce((acc, p) => acc + p.pesos.length, 0);
    let maisPesado = null;
    let ultimaData = null;

    dados.forEach((p) => {
      const u = ns.ultimoPeso(p);
      if (u != null && (!maisPesado || u > maisPesado.g)) {
        maisPesado = { nome: p.nome, g: u };
      }
      if (p.pesos.length) {
        const d = p.pesos[p.pesos.length - 1].data;
        if (!ultimaData || d > ultimaData) ultimaData = d;
      }
    });

    container.innerHTML = `
      <div class="resumo-item">
        <div class="resumo-icone">⚖️</div>
        <div class="resumo-texto">
          <small>Total de registros</small>
          <strong>${totalPesagens} ${totalPesagens === 1 ? 'pesagem' : 'pesagens'}</strong>
        </div>
      </div>
      <div class="resumo-item">
        <div class="resumo-icone">🏆</div>
        <div class="resumo-texto">
          <small>Mais fofinho atual</small>
          <strong>${maisPesado ? `${esc(maisPesado.nome)} (${maisPesado.g} g)` : '—'}</strong>
        </div>
      </div>
      <div class="resumo-item">
        <div class="resumo-icone">📅</div>
        <div class="resumo-texto">
          <small>Última pesagem</small>
          <strong>${ultimaData ? ns.formatarDataBR(ultimaData) : 'Sem registros'}</strong>
        </div>
      </div>
    `;
  }

  function renderBotoesCena() {
    const grupo = $('#cena-foco-grupo');
    if (!grupo) return;

    grupo.innerHTML =
      `<button class="btn-cena" onclick="window.appAcoes.jogarCenoura()">🥕 Jogar Cenoura</button>` +
      dados
        .map(
          (p, i) =>
            `<button class="btn-cena" data-foco-btn="${i}" onclick="window.appAcoes.focar(${i})">🎥 ${esc(p.nome)}</button>`
        )
        .join('');
  }

  function render() {
    ns.salvarDados(dados);
    renderResumoGeral();
    renderBotoesCena();

    const app = $('#app');
    app.innerHTML = '';

    dados.forEach((p, i) => {
      const ps = p.pesos;
      const stats = ns.calcularEstatisticas(p);

      let difHtml = '';
      if (stats.dif != null) {
        const sinal = stats.dif >= 0 ? '+' : '';
        const classe = stats.dif >= 0 ? 'sobe' : 'desce';
        difHtml = `<span class="${classe}">(${sinal}${stats.dif} g)</span>`;
      }

      let taxaHtml = '—';
      if (stats.taxaSemanal != null) {
        const sinal = stats.taxaSemanal >= 0 ? '+' : '';
        taxaHtml = `${sinal}${stats.taxaSemanal} g/sem`;
      }

      let alertaHtml = '';
      if (stats.alertaSaude) {
        const icone = stats.alertaSaude.tipo === 'perigo' ? '⚠️' : '💚';
        alertaHtml = `<div class="badge-alerta ${stats.alertaSaude.tipo}">${icone} ${esc(stats.alertaSaude.msg)}</div>`;
      }

      const expandido = !!historicoExpandido[i];
      const limiteLinhas = 5;
      const linhasExibidas = expandido
        ? [...ps].reverse()
        : [...ps].reverse().slice(0, limiteLinhas);

      const card = document.createElement('div');
      card.className = 'card';
      card.id = 'card' + i;
      card.style.borderLeftColor = ns.TIPOS[i].borda;

      card.innerHTML = `
        <div class="topo">
          ${
            ns.AVATARES[i]
              ? `<img class="av" src="${ns.AVATARES[i]}" alt="${esc(p.nome)}" title="Clique para focar na câmera 3D" onclick="window.appAcoes.focar(${i})">`
              : ''
          }
          <div class="info">
            <h2 title="Toque para renomear">${esc(p.nome)} <small>✏️</small></h2>
            <div class="desc">${esc(ns.TIPOS[i].desc)}</div>
          </div>
          <div class="acoes-card">
            <button class="sec" onclick="window.appAcoes.focar(${i})" title="Focar câmera 3D">🎥 Focar</button>
            <button class="sec" onclick="window.appAcoes.pular(${i})">Pular!</button>
          </div>
        </div>

        <div class="stats-strip">
          <div class="stat-pill">
            <small>Último peso</small>
            <b>${stats.atual != null ? stats.atual + ' g' : '—'} ${difHtml}</b>
          </div>
          <div class="stat-pill">
            <small>Ritmo médio</small>
            <b>${taxaHtml}</b>
          </div>
          <div class="stat-pill">
            <small>Mín / Máx</small>
            <b>${stats.min != null ? `${stats.min}g – ${stats.max}g` : '—'}</b>
          </div>
          <div class="stat-pill">
            <small>Média (${ps.length})</small>
            <b>${stats.media != null ? stats.media + ' g' : '—'}</b>
          </div>
        </div>

        ${alertaHtml}

        <div class="form">
          <input type="date" value="${ns.dataHojeISO()}" id="d${i}" aria-label="Data da pesagem">
          <input type="number" inputmode="decimal" step="1" min="1" max="3000" placeholder="Peso (g)" id="g${i}" aria-label="Peso em gramas">
          <input type="text" class="nota-input" placeholder="Observação opcional (ex: comeu couve)" id="n${i}" maxlength="60">
          <button onclick="window.appAcoes.adicionar(${i})">Registrar</button>
        </div>

        ${
          ps.length
            ? `<div class="tabela-wrapper">
                <table>
                  <thead>
                    <tr><th>Data</th><th>Peso</th><th>Variação</th><th></th></tr>
                  </thead>
                  <tbody>
                    ${linhasExibidas
                      .map((r) => {
                        const idxOriginal = ps.indexOf(r);
                        const ant = idxOriginal > 0 ? ps[idxOriginal - 1].g : null;
                        const delta = ant != null ? Math.round((r.g - ant) * 10) / 10 : null;
                        const deltaStr =
                          delta != null
                            ? `<span class="${delta >= 0 ? 'sobe' : 'desce'}">${delta >= 0 ? '+' : ''}${delta} g</span>`
                            : '<span style="color:var(--muted)">—</span>';
                        const notaStr = r.nota ? `<span class="nota-tag">${esc(r.nota)}</span>` : '';
                        return `<tr>
                          <td>${ns.formatarDataBR(r.data)}</td>
                          <td><b>${r.g} g</b>${notaStr}</td>
                          <td>${deltaStr}</td>
                          <td class="acoes-col">
                            <button class="edit-btn" title="Editar registro" onclick="window.appAcoes.editar(${i},${idxOriginal})">✏️</button>
                            <button class="x" title="Apagar registro" onclick="window.appAcoes.remover(${i},${idxOriginal})">✕</button>
                          </td>
                        </tr>`;
                      })
                      .join('')}
                  </tbody>
                </table>
                ${
                  ps.length > limiteLinhas
                    ? `<button class="btn-mostrar-mais" onclick="window.appAcoes.alternarHistorico(${i})">
                        ${expandido ? 'Mostrar menos ▲' : `Ver histórico completo (${ps.length} registros) ▼`}
                      </button>`
                    : ''
                }
              </div>`
            : ''
        }
      `;

      card.querySelector('h2').onclick = (e) => {
        const h = e.currentTarget;
        const inp = document.createElement('input');
        inp.value = p.nome;
        inp.style.fontSize = '18px';
        inp.style.fontWeight = '600';
        h.replaceWith(inp);
        inp.focus();
        inp.select();
        const ok = () => {
          const n = inp.value.trim();
          if (n) p.nome = n;
          render();
        };
        inp.onblur = ok;
        inp.onkeydown = (k) => {
          if (k.key === 'Enter') inp.blur();
          if (k.key === 'Escape') {
            inp.value = p.nome;
            inp.blur();
          }
        };
      };

      ['#g' + i, '#n' + i].forEach((sel) => {
        const inputEl = card.querySelector(sel);
        if (inputEl) {
          inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') adicionarPesagem(i);
          });
        }
      });

      app.appendChild(card);
    });

    $('#legenda').innerHTML = dados
      .map(
        (p, i) =>
          `<span class="${ns.isPorquinhoOculto(i) ? 'oculto' : ''}" style="--c:${ns.TIPOS[i].linha}" title="Clique para ocultar/exibir no gráfico" onclick="window.appAcoes.toggleSerie(${i})">${esc(p.nome)}</span>`
      )
      .join('');

    ns.desenharGrafico(dados);
    ns.atualizar3D();
  }

  function adicionarPesagem(i) {
    const valorStr = String($('#g' + i).value).replace(',', '.');
    const g = Math.round(parseFloat(valorStr) * 10) / 10;
    const data = $('#d' + i).value;
    const nota = ($('#n' + i)?.value || '').trim();

    if (!g || g <= 0 || g > 3500 || !data) {
      return aviso('Preencha uma data válida e o peso em gramas (ex: 750)');
    }

    const existenteIdx = dados[i].pesos.findIndex((r) => r.data === data);
    if (existenteIdx >= 0) {
      const anterior = { ...dados[i].pesos[existenteIdx] };
      dados[i].pesos[existenteIdx] = { data, g, ...(nota ? { nota } : {}) };
      render();
      ns.pular3D(i);
      desfazerAcao = () => {
        dados[i].pesos[existenteIdx] = anterior;
        render();
      };
      aviso(`Peso de ${ns.formatarDataBR(data)} atualizado para ${g} g`, true);
      return;
    }

    const novo = { data, g };
    if (nota) novo.nota = nota;
    dados[i].pesos.push(novo);
    render();
    ns.pular3D(i);
    aviso(`Pesagem de ${g} g registrada para ${dados[i].nome}!`);
  }

  function editarPesagem(i, j) {
    const reg = dados[i].pesos[j];
    if (!reg) return;
    const inpData = $('#d' + i);
    const inpPeso = $('#g' + i);
    const inpNota = $('#n' + i);
    if (inpData) inpData.value = reg.data;
    if (inpPeso) {
      inpPeso.value = reg.g;
      inpPeso.focus();
      inpPeso.select();
    }
    if (inpNota) inpNota.value = reg.nota || '';
    aviso(
      `Editando pesagem de ${ns.formatarDataBR(reg.data)}. Altere o valor e clique em Registrar.`
    );
  }

  function removerPesagem(i, j) {
    const r = dados[i].pesos.splice(j, 1)[0];
    if (!r) return;
    render();
    desfazerAcao = () => {
      dados[i].pesos.push(r);
      render();
    };
    aviso(`Pesagem de ${r.g} g apagada`, true);
  }

  function aviso(txt, comDesfazer = false) {
    let t = $('#toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      document.body.appendChild(t);
    }
    t.innerHTML = esc(txt) + (comDesfazer ? ' <button id="desf">Desfazer</button>' : '');
    t.className = 'on';
    if (comDesfazer) {
      $('#desf').onclick = () => {
        if (desfazerAcao) desfazerAcao();
        desfazerAcao = null;
        t.className = '';
      };
    }
    clearTimeout(t._h);
    t._h = setTimeout(() => {
      t.className = '';
      desfazerAcao = null;
    }, 5000);
  }

  window.appAcoes = {
    adicionar: adicionarPesagem,
    editar: editarPesagem,
    remover: removerPesagem,
    pular: (i) => ns.pular3D(i),
    focar: (i) => ns.focar3D(i),
    jogarCenoura: () => ns.jogarCenoura3D(),
    alternarHistorico: (i) => {
      historicoExpandido[i] = !historicoExpandido[i];
      render();
    },
    toggleSerie: (i) => {
      ns.alternarVisibilidadePorquinho(i);
      render();
    },
    filtrarPeriodo: (dias) => {
      ns.setDiasFiltro(dias);
      document.querySelectorAll('[data-filtro-dias]').forEach((b) => {
        b.classList.toggle('ativo', Number(b.getAttribute('data-filtro-dias')) === ns.getDiasFiltro());
      });
      ns.desenharGrafico(dados);
    },
  };

  function configurarToolbar() {
    $('#btn-tema')?.addEventListener('click', alternarTema);
    $('#btn-som')?.addEventListener('click', () => {
      ns.toggleSom();
      atualizarBotaoSom();
    });
    $('#btn-export-json')?.addEventListener('click', () => {
      ns.exportarJSON(dados);
      aviso('Backup JSON baixado com sucesso!');
    });
    $('#btn-export-csv')?.addEventListener('click', () => {
      ns.exportarCSV(dados);
      aviso('Planilha CSV exportada com sucesso!');
    });
    $('#btn-import-json')?.addEventListener('click', () => {
      $('#input-import-file')?.click();
    });
    $('#input-import-file')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const importado = JSON.parse(reader.result);
          if (!Array.isArray(importado)) throw new Error('Formato inválido');
          const backupAnterior = JSON.parse(JSON.stringify(dados));
          dados = importado;
          render();
          desfazerAcao = () => {
            dados = backupAnterior;
            render();
          };
          aviso('Backup importado com sucesso!', true);
        } catch (err) {
          aviso('Arquivo JSON inválido. Verifique o arquivo selecionado.');
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    });
    $('#btn-demo')?.addEventListener('click', () => {
      const backupAnterior = JSON.parse(JSON.stringify(dados));
      dados = ns.gerarDadosExemplo(dados);
      render();
      ns.pular3D(0);
      setTimeout(() => ns.pular3D(1), 150);
      setTimeout(() => ns.pular3D(2), 300);
      desfazerAcao = () => {
        dados = backupAnterior;
        render();
      };
      aviso('Dados de demonstração carregados!', true);
    });
  }

  aplicarTemaInicial();
  atualizarBotaoSom();
  configurarToolbar();
  render();

  ns.iniciarCena3D(
    () => dados,
    () => {
      render();
      ns.atualizarTema3D(document.documentElement.getAttribute('data-theme') === 'night');
    },
    (i) => {
      const c = $('#card' + i);
      if (c) {
        c.classList.remove('flash');
        void c.offsetWidth;
        c.classList.add('flash');
      }
    }
  );
})(window.Porquinhos);
