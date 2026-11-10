# 🐹 Pesagem dos Porquinhos — Engenharia Reversa & Projeto Evoluído

Aplicação web interativa em **3D (Three.js)** e **2D (HTML5 Canvas)** para acompanhamento de peso, saúde e crescimento de **3 porquinhos-da-índia**, onde o tamanho físico de cada porquinho no mundo 3D reflete o seu último peso registrado.

---

## 🔍 1. Engenharia Reversa do `index_1.html`

O arquivo original (`index_1.html`, 418 linhas) é uma *Single-File Application* altamente criativa e compactada que combina **modelagem 3D procedural**, **cel-shading (toon shading)**, **inteligência artificial autônoma (máquina de estados)** e **persistência local**.

### 1.1. Modelagem 3D Procedural & Cel-Shading (`elips` + `MeshToonMaterial`)
Em vez de carregar modelos externos `.gltf` ou `.obj`, o código gera toda a geometria matematicamente:
- **Shader Cartunesco (Toon Shading)**: Cria uma `THREE.DataTexture` de $3 \times 1$ pixels (`[120, 200, 255]`) com filtro `THREE.NearestFilter` usada como `gradientMap` no `MeshToonMaterial`, produzindo sombras em degraus estilo desenho animado.
- **Contorno (Inverted Hull Outline)**: A função `elips(sx, sy, sz, cor, t, rough)` cria uma esfera (`SphereGeometry(1, 40, 28)`), deforma-a em um elipsoide $(s_x, s_y, s_z)$ e constrói uma segunda malha invertida (`THREE.BackSide` na cor `#4a3022`) extrudada ao longo da normal analítica do elipsoide:
  $$\vec{n} = \text{normalize}\left(\frac{u_x}{s_x}, \frac{u_y}{s_y}, \frac{u_z}{s_z}\right)$$
- **Pintura por Vértices & Pelagem (`rough`)**:
  Cada um dos 3 porquinhos possui funções espaciais `body(x,y,z)` e `head(x,y,z)` que colorem vértice a vértice (`vertexColors: true`) para reproduzir manchas reais:
  1. **Porquinho 1 (Inglês Pelo Liso)**: Caramelo (`#c4752f`) com barriga e focinho brancos (`#fff8ef`), `rough: 0`.
  2. **Porquinho 2 (Tricolor com Topete)**: Preto (`#2e2622`), marrom (`#8b4b22`) e branco (`#fff8ef`), leve textura (`rough: 0.03`) e topete na cabeça.
  3. **Porquinho 3 (Abissínio Arrepiado)**: Ruivo (`#e0913f`) com branco, alta rugosidade senoidal nos vértices (`rough: 0.06`), topete e 5 rosetas/tufos espalhados pelo corpo (`tufosCorpo`).

### 1.2. Fotúdio Offscreen para Avatares 2D (`AVATARES`)
Na inicialização, o script instancia um **segundo `WebGLRenderer` offscreen (`252x200`)** com `preserveDrawingBuffer: true`, posiciona cada porquinho num estúdio virtual temporário, tira uma foto com `toDataURL('image/png')` e injeta a imagem `<img>` diretamente no card 2D daquele porquinho.

### 1.3. Máquina de Estados (IA) e Animação Procedural (`passo`, `novoModo`, `separar`)
Cada porquinho possui seu próprio ciclo de comportamento autônomo:
- **`andando`**: Escolhe um ponto aleatório na ilha (ou vai até uma das 4 cenouras no chão com 40% de chance). Gira suavemente na direção do alvo, aplicando *bobbing* vertical e inclinação lateral sincronizados.
- **`comendo`**: Abaixa a cabeça (`nod = -0.32`) e anima o focinho e a boca em alta frequência (`Math.sin(t * 16)`) simulando mastigação.
- **`parado`**: Respira suavemente (expansão senoidal do tronco), pisca os olhos a cada `2–5s` e olha para os lados.
- **`pulo` ("Popcorning")**: Salto de alegria típico de porquinhos-da-índia com giro no ar quando clicado ou ao registrar novo peso.
- **Física & Colisão**: Mantém os porquinhos dentro do raio da ilha (`R = 3.5`), desvia de círculos delimitadores da casinha, feno e tigela (`obst`), e aplica repulsão mútua (`separar`) para não atravessarem uns aos outros.
- **Escala Dinâmica por Peso (`escalaAlvo`)**:
  $$\text{escala} = 0.75 + \frac{\min(\text{peso}, 1100)}{1100} \times 0.55$$
  Conforme o porquinho engorda (até `1100g`), seu modelo 3D cresce proporcionalmente na cena!

---

## 📁 2. Estrutura do Projeto Montado

O código monolítico foi organizado em módulos claros (compatíveis tanto com abertura direta via `file://` dando duplo clique no `index.html` quanto via servidor HTTP):

```text
porquinhos/
├── index.html          # Nova aplicação principal evoluída
├── index_1.html        # Arquivo original preservado para referência
├── README.md           # Documentação da engenharia reversa e melhorias
├── css/
│   └── styles.css      # Estilos responsivos, suporte a Tema Dia/Noite e animações
└── js/
    ├── config.js       # Definição dos 3 porquinhos, cores e constantes
    ├── sound.js        # Sintetizador Web Audio API ("wheeks" e sons de cenoura)
    ├── storage.js      # Persistência localStorage, estatísticas, backup JSON/CSV e Demo
    ├── chart.js        # Gráfico Canvas 2D interativo com Tooltip, filtros e legenda clicável
    ├── scene3d.js      # Cena 3D Three.js com zoom, foco de câmera e interação com cenoura
    └── app.js          # Controlador de UI, cards, edição e alertas de saúde
```

---

## 🚀 3. Melhorias Implementadas

1. **Estatísticas de Saúde e Alertas Veterinários**:
   - Cálculo automático de **Ritmo Semanal (`g/sem`)**, **Peso Mínimo/Máximo** e **Média**.
   - **Alerta de Saúde**: Em porquinhos-da-índia, quedas abruptas de peso ($\ge 45\text{g}$) são frequentemente o primeiro sinal clínico de problemas dentários ou gastrointestinais. O card agora exibe um aviso visual caso detecte perda brusca.
2. **Novas Interações na Cena 3D**:
   - **🥕 Jogar Cenoura**: Botão que lança uma cenoura fresquinha na ilha e atrai todos os 3 porquinhos correndo para comer juntos.
   - **🎥 Modo Foco de Câmera**: Botões rápidos (ou clique na tag/avatar do porquinho) para a câmera 3D seguir suavemente um porquinho específico com zoom aproximado.
   - **Zoom com Scroll do Mouse (`wheel`)**: Permite aproximar ou afastar a câmera livremente.
3. **Efeitos Sonoros Sintetizados (Web Audio API)**:
   - Cada porquinho emite um *"wheek!"* fofo sintetizado (com timbres distintos por porquinho) ao pular, com botão de **Som / Mudo** no topo.
4. **Gráfico de Crescimento Interativo**:
   - **Tooltip ao passar o mouse**: Mostra nome, peso exato, data e observação de cada ponto.
   - **Filtros de Período**: Alterne entre *Tudo*, *Últimos 90 dias* e *Últimos 30 dias*.
   - **Legenda Clicável**: Clique no nome de um porquinho na legenda para ocultar/exibir sua linha no gráfico.
5. **Gestão Completa de Registros e Backup**:
   - **Campo de Observação** por pesagem (ex.: *"comeu couve"*, *"retorno veterinário"*).
   - **Edição de Pesagens**: Botão `✏️` na tabela para corrigir qualquer pesagem antiga (e atualização automática caso registre na mesma data).
   - **Histórico Expansível**: Exibe as 5 últimas pesagens por padrão com botão *"Ver histórico completo"* para não deixar a página gigante com o tempo.
   - **Exportar/Importar JSON e Exportar CSV (Excel)**: Nunca perca os dados do `localStorage`.
   - **Botão "✨ Dados Demo"**: Preenche 8 semanas de evolução realista com opção de *Desfazer* imediato para testar gráficos e escalas 3D.
   - **Modo Dia / Noite (`🌙 Noite`)**: Adapta tanto a interface quanto a iluminação da cena 3D.
