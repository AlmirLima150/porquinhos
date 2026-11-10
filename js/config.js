// ============================================================================
// CONFIGURAÇÕES E DEFINIÇÕES DOS PORQUINHOS-DA-ÍNDIA
// ============================================================================
window.Porquinhos = window.Porquinhos || {};

(function (ns) {
  const CORES = {
    BRANCO: '#fff8ef',
    PRETO: '#2e2622',
    MARROM: '#8b4b22',
    CONTORNO: 0x4a3022,
  };

  const ESPESSURA_LINHA = 0.05;
  const STORAGE_KEY = 'porquinhos';
  const THEME_KEY = 'porquinhos_tema';
  const SOUND_KEY = 'porquinhos_som';

  /**
   * Definição procedural de cada porquinho (baseado nas fotos reais):
   * - body(x,y,z): função espacial que define a cor de cada vértice do tronco elipsoidal
   * - head(x,y,z): função espacial que define a cor de cada vértice da cabeça
   * - rough: intensidade da textura senoidal nos vértices (simula pelo liso vs. arrepiado)
   * - topete: cor do tufo de pelo na cabeça (null se não tiver)
   * - tufosCorpo: cor das rosetas/tufos pelo corpo (estilo Abissínio)
   */
  const TIPOS = [
    {
      id: 0,
      nomePadrao: 'Porquinho 1',
      desc: 'Caramelo com branco, pelo liso (Inglês)',
      linha: '#b8682e',
      borda: '#c4752f',
      ear: '#9a5528',
      rough: 0,
      topete: null,
      tufosCorpo: null,
      body: (x, y, z) => (y < -0.35 || (x > 0.55 && y < 0.2) ? CORES.BRANCO : '#c4752f'),
      head: (x, y, z) =>
        (x > 0.86 && y < 0.1) || (Math.abs(z) < 0.16 && x > -0.15 && y > -0.4)
          ? CORES.BRANCO
          : '#c4752f',
    },
    {
      id: 1,
      nomePadrao: 'Porquinho 2',
      desc: 'Tricolor (preto, marrom e branco) com topete',
      linha: '#333333',
      borda: CORES.PRETO,
      ear: CORES.PRETO,
      rough: 0.03,
      topete: CORES.PRETO,
      tufosCorpo: null,
      body: (x, y, z) => {
        if (x > 0.42) return CORES.BRANCO;
        if (x > 0.05 && y > 0.35) return CORES.MARROM;
        if (y > 0.12 || x < -0.55) return CORES.PRETO;
        if (z > 0.55 && x < 0.1) return CORES.MARROM;
        return CORES.BRANCO;
      },
      head: (x, y, z) => {
        if (x > 0.86 && y < 0.1) return CORES.BRANCO;
        if (z > 0.0 && z < 0.32 && x > -0.1 && y > -0.4) return CORES.BRANCO;
        if (y > 0.5 || (z < -0.3 && y > 0.05)) return CORES.PRETO;
        return CORES.MARROM;
      },
    },
    {
      id: 2,
      nomePadrao: 'Porquinho 3',
      desc: 'Ruivo com branco, pelo arrepiado (Abissínio)',
      linha: '#e08a3c',
      borda: '#e0913f',
      ear: '#b9682f',
      rough: 0.06,
      topete: '#e0913f',
      tufosCorpo: '#e0913f',
      body: (x, y, z) => (y < -0.3 || (x > 0.6 && y < 0.3) ? CORES.BRANCO : '#e0913f'),
      head: (x, y, z) =>
        (x > 0.86 && y < 0.1) || (Math.abs(z) < 0.14 && x > -0.1 && y > -0.4)
          ? CORES.BRANCO
          : '#e0913f',
    },
  ];

  Object.assign(ns, { CORES, ESPESSURA_LINHA, STORAGE_KEY, THEME_KEY, SOUND_KEY, TIPOS });
})(window.Porquinhos);
