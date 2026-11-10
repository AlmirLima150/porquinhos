// ============================================================================
// CAMADA DE DADOS, API SQLITE, ESTATÍSTICAS E PERSISTÊNCIA
// ============================================================================
window.Porquinhos = window.Porquinhos || {};

(function (ns) {
  let bdOnline = false;

  function isBdOnline() {
    return bdOnline;
  }

  function atualizarBadgeBD(online) {
    bdOnline = online;
    const el = document.getElementById('status-bd');
    if (!el) return;
    if (online) {
      el.textContent = '🗄️ BD SQLite Online';
      el.className = 'bd-badge online';
      el.title = 'Dados sincronizados no banco de dados SQLite do servidor';
    } else {
      el.textContent = '💾 Modo Local';
      el.className = 'bd-badge offline';
      el.title = 'Sem conexão com a API; salvando apenas no navegador (localStorage)';
    }
  }

  function normalizarDados(dados) {
    if (!Array.isArray(dados)) dados = [];
    for (let i = 0; i < ns.TIPOS.length; i++) {
      if (!dados[i] || typeof dados[i] !== 'object') {
        dados[i] = { nome: ns.TIPOS[i].nomePadrao, pesos: [] };
      }
      if (!Array.isArray(dados[i].pesos)) {
        dados[i].pesos = [];
      }
    }
    ordenarPesos(dados);
    return dados;
  }

  function carregarDadosLocais() {
    let dados = null;
    try {
      dados = JSON.parse(localStorage.getItem(ns.STORAGE_KEY));
    } catch (e) {}
    return normalizarDados(dados);
  }

  function salvarDadosLocais(dados) {
    ordenarPesos(dados);
    try {
      localStorage.setItem(ns.STORAGE_KEY, JSON.stringify(dados));
    } catch (e) {}
  }

  /**
   * Sincroniza inicialização com o banco SQLite via API (/api/dados).
   * Se o banco estiver vazio no servidor mas houver dados no localStorage,
   * migra automaticamente os dados locais para o banco!
   */
  async function sincronizarComServidor(dadosAtuais, aoAtualizar) {
    if (window.location.protocol === 'file:') {
      atualizarBadgeBD(false);
      return;
    }
    try {
      const resp = await fetch('/api/dados', { cache: 'no-store' });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const dadosRemotos = normalizarDados(await resp.json());
      atualizarBadgeBD(true);

      const totalRemoto = dadosRemotos.reduce((acc, p) => acc + p.pesos.length, 0);
      const totalLocal = dadosAtuais.reduce((acc, p) => acc + p.pesos.length, 0);
      const nomesLocaisAlterados = dadosAtuais.some(
        (p, i) => p.nome && p.nome !== ns.TIPOS[i].nomePadrao
      );

      // Se o banco SQLite acabou de ser criado (vazio) e o navegador já tinha dados locais, envia para o banco
      if (totalRemoto === 0 && (totalLocal > 0 || nomesLocaisAlterados)) {
        await salvarTodosNoServidor(dadosAtuais);
      } else {
        salvarDadosLocais(dadosRemotos);
        aoAtualizar(dadosRemotos);
      }
    } catch (e) {
      atualizarBadgeBD(false);
    }
  }

  async function salvarTodosNoServidor(dados) {
    salvarDadosLocais(dados);
    if (window.location.protocol === 'file:') return;
    try {
      const resp = await fetch('/api/dados', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      atualizarBadgeBD(resp.ok);
    } catch (e) {
      atualizarBadgeBD(false);
    }
  }

  async function apiRenomearPorquinho(id, nome, dadosFallback) {
    salvarDadosLocais(dadosFallback);
    if (window.location.protocol === 'file:') return;
    try {
      const resp = await fetch(`/api/porquinhos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      });
      atualizarBadgeBD(resp.ok);
    } catch (e) {
      atualizarBadgeBD(false);
    }
  }

  async function apiSalvarPesagem(id, registro, dadosFallback) {
    salvarDadosLocais(dadosFallback);
    if (window.location.protocol === 'file:') return;
    try {
      const resp = await fetch(`/api/porquinhos/${id}/pesos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registro),
      });
      atualizarBadgeBD(resp.ok);
    } catch (e) {
      atualizarBadgeBD(false);
    }
  }

  async function apiDeletarPesagem(id, data, dadosFallback) {
    salvarDadosLocais(dadosFallback);
    if (window.location.protocol === 'file:') return;
    try {
      const resp = await fetch(`/api/porquinhos/${id}/pesos/${encodeURIComponent(data)}`, {
        method: 'DELETE',
      });
      atualizarBadgeBD(resp.ok);
    } catch (e) {
      atualizarBadgeBD(false);
    }
  }

  function ordenarPesos(dados) {
    dados.forEach((p) => {
      p.pesos.sort((a, b) => a.data.localeCompare(b.data));
    });
  }

  function dataHojeISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function formatarDataBR(iso) {
    if (!iso) return '';
    return iso.split('-').reverse().join('/');
  }

  function ultimoPeso(porquinho) {
    const ps = porquinho?.pesos || [];
    return ps.length ? ps[ps.length - 1].g : null;
  }

  function calcularEstatisticas(porquinho) {
    const ps = porquinho.pesos || [];
    if (!ps.length) {
      return {
        atual: null,
        anterior: null,
        dif: null,
        min: null,
        max: null,
        media: null,
        taxaSemanal: null,
        alertaSaude: null,
      };
    }

    const valores = ps.map((r) => r.g);
    const atual = valores[valores.length - 1];
    const anterior = valores.length > 1 ? valores[valores.length - 2] : null;
    const dif = anterior != null ? Math.round((atual - anterior) * 10) / 10 : null;
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const media = Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);

    let taxaSemanal = null;
    if (ps.length >= 2) {
      const primeiro = ps[Math.max(0, ps.length - 6)];
      const ultimo = ps[ps.length - 1];
      const dias =
        (new Date(ultimo.data + 'T12:00:00') - new Date(primeiro.data + 'T12:00:00')) / 86400000;
      if (dias >= 3) {
        taxaSemanal = Math.round(((ultimo.g - primeiro.g) / dias) * 7 * 10) / 10;
      }
    }

    let alertaSaude = null;
    if (dif != null && dif <= -45) {
      alertaSaude = {
        tipo: 'perigo',
        msg: `Atenção: perda de ${Math.abs(dif)} g desde a última pesagem. Monitore apetite e hidratação.`,
      };
    } else if (dif != null && dif > 0) {
      alertaSaude = {
        tipo: 'ok',
        msg: `Ganho saudável de +${dif} g na última pesagem.`,
      };
    }

    return { atual, anterior, dif, min, max, media, taxaSemanal, alertaSaude };
  }

  function exportarJSON(dados) {
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    baixarArquivo(blob, `porquinhos-backup-${dataHojeISO()}.json`);
  }

  function exportarCSV(dados) {
    const linhas = ['Porquinho,Data,Peso (g),Observacao'];
    dados.forEach((p) => {
      p.pesos.forEach((r) => {
        const nome = `"${String(p.nome).replace(/"/g, '""')}"`;
        const nota = `"${String(r.nota || '').replace(/"/g, '""')}"`;
        linhas.push(`${nome},${r.data},${r.g},${nota}`);
      });
    });
    const blob = new Blob(['\uFEFF' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    baixarArquivo(blob, `pesagens-porquinhos-${dataHojeISO()}.csv`);
  }

  function baixarArquivo(blob, nomeArquivo) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function gerarDadosExemplo(dadosAtuais) {
    const hoje = new Date();
    const bases = [620, 740, 580];
    const nomesSugeridos = ['Amendoim', 'Oreo', 'Ferrugem'];

    return ns.TIPOS.map((_, i) => {
      const nome =
        dadosAtuais[i]?.nome && !dadosAtuais[i].nome.startsWith('Porquinho ')
          ? dadosAtuais[i].nome
          : nomesSugeridos[i];
      const pesos = [];
      let peso = bases[i];
      for (let sem = 7; sem >= 0; sem--) {
        const d = new Date(hoje);
        d.setDate(d.getDate() - sem * 7);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        const iso = d.toISOString().slice(0, 10);
        peso += Math.round(18 + Math.sin(sem + i) * 12);
        pesos.push({
          data: iso,
          g: peso,
          nota: sem === 0 ? 'Pesagem da semana' : '',
        });
      }
      return { nome, pesos };
    });
  }

  Object.assign(ns, {
    isBdOnline,
    carregarDados: carregarDadosLocais,
    salvarDados: salvarDadosLocais,
    sincronizarComServidor,
    salvarTodosNoServidor,
    apiRenomearPorquinho,
    apiSalvarPesagem,
    apiDeletarPesagem,
    ordenarPesos,
    dataHojeISO,
    formatarDataBR,
    ultimoPeso,
    calcularEstatisticas,
    exportarJSON,
    exportarCSV,
    gerarDadosExemplo,
  });
})(window.Porquinhos);
