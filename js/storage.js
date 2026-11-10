// ============================================================================
// CAMADA DE DADOS, ESTATÍSTICAS E PERSISTÊNCIA (compatível com index_1.html)
// ============================================================================
window.Porquinhos = window.Porquinhos || {};

(function (ns) {
  function carregarDados() {
    let dados = null;
    try {
      dados = JSON.parse(localStorage.getItem(ns.STORAGE_KEY));
    } catch (e) {}

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

  function salvarDados(dados) {
    ordenarPesos(dados);
    try {
      localStorage.setItem(ns.STORAGE_KEY, JSON.stringify(dados));
    } catch (e) {}
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
    carregarDados,
    salvarDados,
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
