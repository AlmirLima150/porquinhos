// ============================================================================
// CENA 3D ESTILO DESENHO / CEL-SHADING (Three.js)
// ============================================================================
window.Porquinhos = window.Porquinhos || {};

(function (ns) {
  const AVATARES = [];

  let pigs = [];
  let atualizarTagsCallback = () => {};
  let pularPorquinhoCallback = () => {};
  let focarPorquinhoCallback = () => {};
  let jogarCenouraCallback = () => {};
  let ajustarIluminacaoCallback = () => {};

  function atualizar3D() {
    atualizarTagsCallback();
  }

  function pular3D(i) {
    pularPorquinhoCallback(i);
  }

  function focar3D(i) {
    focarPorquinhoCallback(i);
  }

  function jogarCenoura3D() {
    jogarCenouraCallback();
  }

  function atualizarTema3D(isNight) {
    ajustarIluminacaoCallback(isNight);
  }

  function iniciarCena3D(obterDados, aoRenderizarUI, aoClicarPorquinho) {
    const el = document.getElementById('cena');
    const avisoEl = document.getElementById('aviso3d');

    if (!window.THREE) {
      if (avisoEl) avisoEl.textContent = 'Não foi possível carregar o Three.js. Confira sua conexão.';
      return;
    }
    if (avisoEl) avisoEl.remove();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 200);

    const luzAmb = new THREE.AmbientLight(0xffffff, 0.34);
    const luzDir = new THREE.DirectionalLight(0xffffff, 0.72);
    luzDir.position.set(6, 8, 3);
    scene.add(luzAmb, luzDir);

    ajustarIluminacaoCallback = (isNight) => {
      if (isNight) {
        luzAmb.color.setHex(0x9bb8ff);
        luzAmb.intensity = 0.28;
        luzDir.color.setHex(0xffdfba);
        luzDir.intensity = 0.58;
      } else {
        luzAmb.color.setHex(0xffffff);
        luzAmb.intensity = 0.34;
        luzDir.color.setHex(0xffffff);
        luzDir.intensity = 0.72;
      }
    };

    const grad = new THREE.DataTexture(
      new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]),
      3,
      1,
      THREE.RGBAFormat
    );
    grad.minFilter = grad.magFilter = THREE.NearestFilter;
    grad.generateMipmaps = false;
    grad.needsUpdate = true;

    const matCont = new THREE.MeshBasicMaterial({ color: ns.CORES.CONTORNO, side: THREE.BackSide });
    const toon = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad });
    const contorno = (m, f) => {
      const o = new THREE.Mesh(m.geometry, matCont);
      o.scale.setScalar(f || 1.06);
      m.add(o);
      return m;
    };
    const em = (o, x, y, z) => {
      o.position.set(x, y, z);
      return o;
    };

    function elips(sx, sy, sz, cor, t, rough) {
      t = t === undefined ? ns.ESPESSURA_LINHA : t;
      rough = rough || 0;
      const g = new THREE.SphereGeometry(1, 40, 28);
      const pos = g.attributes.position;
      const n = pos.count;
      const cols = new Float32Array(n * 3);
      const op = new Float32Array(n * 3);
      const c = new THREE.Color();

      for (let i = 0; i < n; i++) {
        const ux = pos.getX(i);
        const uy = pos.getY(i);
        const uz = pos.getZ(i);
        c.set(typeof cor === 'function' ? cor(ux, uy, uz) : cor);
        cols[i * 3] = c.r;
        cols[i * 3 + 1] = c.g;
        cols[i * 3 + 2] = c.b;

        const k = rough
          ? 1 +
            rough *
              (Math.sin(ux * 9 + uz * 7) * Math.cos(uy * 8 - uz * 5) +
                0.5 * Math.sin(ux * 17 - uy * 13 + uz * 11))
          : 1;
        const nx = ux / sx;
        const ny = uy / sy;
        const nz = uz / sz;
        const l = Math.hypot(nx, ny, nz) || 1;
        const px = ux * sx * k;
        const py = uy * sy * k;
        const pz = uz * sz * k;
        pos.setXYZ(i, px, py, pz);

        op[i * 3] = px + (nx / l) * t;
        op[i * 3 + 1] = py + (ny / l) * t;
        op[i * 3 + 2] = pz + (nz / l) * t;
      }

      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      g.computeVertexNormals();
      const m = new THREE.Mesh(
        g,
        new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad })
      );

      if (t > 0) {
        const og = new THREE.BufferGeometry();
        og.setAttribute('position', new THREE.BufferAttribute(op, 3));
        og.setIndex(g.index);
        m.add(new THREE.Mesh(og, matCont));
      }
      return m;
    }

    function tufo(cor) {
      const g = new THREE.Group();
      [-0.55, 0, 0.55].forEach((a) => {
        const f = elips(0.07, 0.2, 0.07, cor, 0.025);
        f.position.set(Math.sin(a) * 0.1, 0.12 + Math.cos(a) * 0.04, 0);
        f.rotation.z = -a;
        g.add(f);
      });
      return g;
    }

    // ---------- Cenário ----------
    const RI = 5.2;
    const ilha = contorno(
      new THREE.Mesh(new THREE.CylinderGeometry(RI, RI - 0.3, 0.6, 64), toon(0x9fd47f)),
      1.012
    );
    ilha.position.y = -0.3;
    scene.add(ilha);

    const terra = contorno(
      new THREE.Mesh(new THREE.CylinderGeometry(RI - 0.3, RI - 1.1, 0.8, 64), toon(0xc99a66)),
      1.02
    );
    terra.position.y = -1;
    scene.add(terra);

    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * 6.28 + Math.random() * 0.2;
      const r = RI - 0.9 + Math.random() * 0.6;
      const t = new THREE.Group();
      for (let k = -1; k <= 1; k++) {
        const f = contorno(
          new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.42, 5), toon(0x6fb851)),
          1.3
        );
        f.position.set(k * 0.08, 0.2, 0);
        f.rotation.z = -k * 0.35;
        t.add(f);
      }
      t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      t.rotation.y = Math.random() * 3;
      scene.add(t);
    }

    for (let i = 0; i < 10; i++) {
      const a = Math.random() * 6.28;
      const r = 1.5 + Math.random() * (RI - 2.2);
      const f = new THREE.Group();
      const caule = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), toon(0x4f9a3a));
      caule.position.y = 0.15;
      f.add(caule);
      for (let k = 0; k < 5; k++) {
        const p = elips(0.06, 0.06, 0.03, '#ffffff', 0.02);
        const b = (k / 5) * 6.28;
        p.position.set(Math.cos(b) * 0.07, 0.32 + Math.sin(b) * 0.07, 0);
        f.add(p);
      }
      f.add(em(elips(0.045, 0.045, 0.04, '#f6c443', 0.02), 0, 0.32, 0.01));
      f.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      f.rotation.y = Math.random() * 6;
      scene.add(f);
    }

    const casa = new THREE.Group();
    const par = contorno(new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.7, 2), toon(0xe6ad70)), 1.04);
    par.position.y = 0.85;
    casa.add(par);
    const teto = contorno(new THREE.Mesh(new THREE.ConeGeometry(2, 1.2, 4), toon(0xe06a52)), 1.05);
    teto.position.y = 2.3;
    teto.rotation.y = Math.PI / 4;
    casa.add(teto);
    const porta = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 24),
      new THREE.MeshBasicMaterial({ color: 0x5a3624 })
    );
    porta.position.set(1.21, 0.62, 0);
    porta.rotation.y = Math.PI / 2;
    casa.add(porta);
    const casaP = { x: -3.1, z: -2.4 };
    casa.position.set(casaP.x, 0, casaP.z);
    casa.rotation.y = -0.65;
    scene.add(casa);

    const fenoP = { x: 3.2, z: -2.3 };
    [
      [0, 0, 0.4],
      [0.9, 0.9, 1.3],
    ].forEach(([dx, dz, r]) => {
      const f = new THREE.Group();
      const c = contorno(
        new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.3, 24), toon(0xf2cf66)),
        1.06
      );
      f.add(c);
      [-0.32, 0.32].forEach((y) => {
        const b = new THREE.Mesh(
          new THREE.CylinderGeometry(0.62, 0.62, 0.12, 24),
          toon(0xc99a3a)
        );
        b.position.y = y;
        f.add(b);
      });
      f.rotation.z = Math.PI / 2;
      f.position.set(fenoP.x + dx, 0.6, fenoP.z + dz);
      f.rotation.y = r;
      scene.add(f);
    });

    const tigP = { x: 2.6, z: 2.3 };
    const tig = contorno(
      new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.55, 0.4, 28), toon(0x6aa7e0)),
      1.06
    );
    tig.position.set(tigP.x, 0.2, tigP.z);
    scene.add(tig);
    for (let k = 0; k < 7; k++) {
      scene.add(
        em(
          elips(0.09, 0.07, 0.09, '#a0703d', 0.02),
          tigP.x + (Math.random() - 0.5) * 0.8,
          0.42,
          tigP.z + (Math.random() - 0.5) * 0.8
        )
      );
    }

    const comidas = [
      [1.2, -0.6],
      [-1.8, 1.6],
      [0.1, 2.7],
      [-0.5, -2.5],
    ];

    function criarModeloCenoura() {
      const g = new THREE.Group();
      g.add(elips(0.5, 0.14, 0.14, '#f58a2a'));
      for (let j = -1; j <= 1; j++) {
        const f = elips(0.16, 0.05, 0.05, '#6dbb4a', 0.025);
        f.position.set(0.58, 0.04, j * 0.07);
        f.rotation.y = j * 0.5;
        f.rotation.z = 0.3;
        g.add(f);
      }
      return g;
    }

    comidas.forEach(([x, z], k) => {
      const g = criarModeloCenoura();
      g.position.set(x, 0.14, z);
      g.rotation.y = k * 1.4;
      scene.add(g);
    });

    let cenouraExtra = null;

    const obst = [
      { ...casaP, r: 1.8 },
      { x: fenoP.x + 0.45, z: fenoP.z + 0.45, r: 1.5 },
      { ...tigP, r: 0.9 },
    ];

    // ---------- Criação dos Porquinhos ----------
    function criarPorquinho(tp) {
      const raiz = new THREE.Group();
      const corpo = new THREE.Group();
      raiz.add(corpo);

      const tronco = elips(1.3, 0.9, 1.0, tp.body, ns.ESPESSURA_LINHA, tp.rough);
      tronco.position.y = 0.9;
      corpo.add(tronco);

      [
        [0.85, 0.5],
        [0.85, -0.5],
        [-0.8, 0.55],
        [-0.8, -0.55],
      ].forEach(([x, z]) => corpo.add(em(elips(0.18, 0.1, 0.16, '#f6d0c4', 0.03), x, 0.1, z)));

      if (tp.tufosCorpo) {
        [
          [-0.75, 0.3],
          [-0.25, -0.35],
          [0.2, 0.3],
          [-0.95, -0.25],
          [-0.4, 0.05],
        ].forEach(([x, z]) => {
          const uy = Math.sqrt(Math.max(0, 1 - (x / 1.3) ** 2 - z * z));
          const p = new THREE.Vector3(x, 0.9 + 0.9 * uy - 0.04, z);
          const n = new THREE.Vector3(x / 1.69, uy / 0.9, z).normalize();
          const t = tufo(tp.tufosCorpo);
          t.position.copy(p);
          t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
          corpo.add(t);
        });
      }

      const cab = new THREE.Group();
      cab.position.set(0.85, 1.05, 0);
      corpo.add(cab);

      const H = { x: 0.3, y: 0.12, sx: 0.8, sy: 0.74, sz: 0.78 };
      cab.add(em(elips(H.sx, H.sy, H.sz, tp.head, ns.ESPESSURA_LINHA, tp.rough * 0.5), H.x, H.y, 0));

      const foc = em(elips(0.32, 0.28, 0.42, ns.CORES.BRANCO, 0.03), 0.88, -0.12, 0);
      cab.add(foc);
      cab.add(em(elips(0.07, 0.06, 0.1, '#e98d88', 0.02), 1.18, -0.02, 0));

      const boca = new THREE.Group();
      boca.position.set(1.19, -0.2, 0);
      boca.rotation.y = Math.PI / 2;
      cab.add(boca);
      [-1, 1].forEach((s) => {
        const t = new THREE.Mesh(
          new THREE.TorusGeometry(0.045, 0.014, 6, 14, Math.PI),
          new THREE.MeshBasicMaterial({ color: ns.CORES.CONTORNO })
        );
        t.rotation.z = Math.PI;
        t.position.x = s * 0.045;
        boca.add(t);
      });

      const naCab = (dx, dy, dz, off) => {
        const l = Math.hypot(dx, dy, dz);
        dx /= l;
        dy /= l;
        dz /= l;
        const n = new THREE.Vector3(dx / H.sx, dy / H.sy, dz / H.sz).normalize();
        return {
          p: new THREE.Vector3(H.x + dx * H.sx, H.y + dy * H.sy, dz * H.sz).addScaledVector(n, off),
          n,
        };
      };

      const Z = new THREE.Vector3(0, 0, 1);
      const olhos = [];
      [1, -1].forEach((s) => {
        const { p, n } = naCab(0.62, 0.3, 0.73 * s, -0.02 + tp.rough * 0.6);
        const g = new THREE.Group();
        g.position.copy(p);
        g.quaternion.setFromUnitVectors(Z, n);
        cab.add(g);
        const b = new THREE.Mesh(
          new THREE.SphereGeometry(0.17, 24, 18),
          new THREE.MeshBasicMaterial({ color: 0x1c1410 })
        );
        b.scale.set(1, 1.12, 0.5);
        g.add(b);
        g.add(
          em(
            new THREE.Mesh(
              new THREE.SphereGeometry(0.055, 12, 10),
              new THREE.MeshBasicMaterial({ color: 0xffffff })
            ),
            0.05 * s,
            0.07,
            0.07
          )
        );
        g.add(
          em(
            new THREE.Mesh(
              new THREE.SphereGeometry(0.025, 10, 8),
              new THREE.MeshBasicMaterial({ color: 0xffffff })
            ),
            -0.05 * s,
            -0.06,
            0.08
          )
        );
        olhos.push(g);
      });

      [1, -1].forEach((s) => {
        const { p, n } = naCab(0.42, -0.05, 0.9 * s, 0.012 + tp.rough * 0.6);
        const b = new THREE.Mesh(
          new THREE.CircleGeometry(0.13, 24),
          new THREE.MeshBasicMaterial({ color: 0xf28c8c, transparent: true, opacity: 0.6 })
        );
        b.position.copy(p);
        b.quaternion.setFromUnitVectors(Z, n);
        b.scale.set(1.2, 0.8, 1);
        cab.add(b);
      });

      const orelhas = [1, -1].map((s) => {
        const g = new THREE.Group();
        g.position.set(0.12, 0.68, 0.42 * s);
        g.rotation.set(0.55 * s, 0, -0.25);
        cab.add(g);
        g.add(elips(0.31, 0.34, 0.08, tp.ear, 0.03));
        const d = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), toon(0xf2a7b0));
        d.scale.set(0.19, 0.22, 0.03);
        d.position.z = 0.06 * s;
        g.add(d);
        return g;
      });

      if (tp.topete) {
        const t = tufo(tp.topete);
        t.position.set(0.42, 0.82, 0);
        t.rotation.z = -0.35;
        t.scale.setScalar(1.3);
        cab.add(t);
      }

      return { raiz, corpo, tronco, cab, foc, boca, olhos, orelhas };
    }

    const R = 3.5;
    const escalaAlvo = (i) => {
      const dados = obterDados();
      const w = ns.ultimoPeso(dados[i]);
      return w ? 0.75 + (Math.min(w, 1100) / 1100) * 0.55 : 0.9;
    };

    const sombraMat = new THREE.MeshBasicMaterial({
      color: 0x3f7a2a,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });

    pigs = ns.TIPOS.map((tp, i) => {
      const p = criarPorquinho(tp);
      const a = 1.9 + i * 1.0;
      p.raiz.position.set(Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6);
      p.raiz.rotation.y = -0.4 + (i - 1) * 0.5;
      scene.add(p.raiz);

      p.sombra = new THREE.Mesh(new THREE.CircleGeometry(1, 32), sombraMat);
      p.sombra.rotation.x = -Math.PI / 2;
      scene.add(p.sombra);

      p.raiz.traverse((o) => {
        if (o.isMesh) o.userData.idx = i;
      });

      Object.assign(p, {
        i,
        modo: 'parado',
        timer: 2 + Math.random() * 2.5,
        alvo: new THREE.Vector2(),
        pulo: 0,
        piscar: 1 + Math.random() * 3,
        olhar: 0,
        t: Math.random() * 10,
        esc: escalaAlvo(i),
      });

      p.raiz.scale.setScalar(p.esc);
      p.tag = document.createElement('div');
      p.tag.className = 'tag';
      p.tag.title = 'Clique para focar a câmera e pular!';
      p.tag.onclick = (e) => {
        e.stopPropagation();
        pular3D(i);
        focar3D(i);
        aoClicarPorquinho(i);
      };
      el.appendChild(p.tag);
      return p;
    });

    // Gerar retratos PNG em WebGL offscreen para os cards
    try {
      const r2 = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
      r2.setSize(252, 200);
      const est = new THREE.Scene();
      const gLuz = new THREE.Group();
      gLuz.add(new THREE.AmbientLight(0xffffff, 0.34));
      const sLuz = new THREE.DirectionalLight(0xffffff, 0.72);
      sLuz.position.set(6, 8, 3);
      gLuz.add(sLuz);
      est.add(gLuz);

      const c2 = new THREE.PerspectiveCamera(30, 252 / 200, 0.1, 50);
      c2.position.set(5.4, 2.5, 3.0);
      c2.lookAt(0.45, 0.95, 0.2);

      pigs.forEach((p) => {
        const pos = p.raiz.position.clone();
        const rot = p.raiz.rotation.y;
        const sc = p.raiz.scale.x;
        est.add(p.raiz);
        p.raiz.position.set(0, 0, 0);
        p.raiz.rotation.y = -0.5;
        p.raiz.scale.setScalar(1);
        r2.render(est, c2);
        AVATARES[p.i] = r2.domElement.toDataURL('image/png');
        scene.add(p.raiz);
        p.raiz.position.copy(pos);
        p.raiz.rotation.y = rot;
        p.raiz.scale.setScalar(sc);
      });
      r2.dispose();
    } catch (e) {}

    let porquinhoFocado = null;

    atualizarTagsCallback = () => {
      const dados = obterDados();
      pigs.forEach((p) => {
        p.esc = escalaAlvo(p.i);
        const w = ns.ultimoPeso(dados[p.i]);
        p.tag.textContent = dados[p.i].nome + (w != null ? ' · ' + w + ' g' : '');
      });
    };

    pularPorquinhoCallback = (i) => {
      const p = pigs[i];
      if (p && p.pulo <= 0) {
        p.pulo = 0.0001;
        ns.tocarPopcorn(i);
      }
    };

    focarPorquinhoCallback = (i) => {
      porquinhoFocado = porquinhoFocado === i ? null : i;
      document.querySelectorAll('[data-foco-btn]').forEach((btn) => {
        const idx = btn.getAttribute('data-foco-btn');
        btn.classList.toggle('foco-ativo', String(porquinhoFocado) === idx);
      });
    };

    jogarCenouraCallback = () => {
      ns.tocarCenoura();
      if (cenouraExtra) scene.remove(cenouraExtra.mesh);
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.random() * 1.4;
      const tx = Math.cos(ang) * rad;
      const tz = Math.sin(ang) * rad;
      const mesh = criarModeloCenoura();
      mesh.position.set(tx, 3.8, tz);
      mesh.rotation.y = Math.random() * 6;
      scene.add(mesh);
      cenouraExtra = { mesh, x: tx, z: tz, vy: 0, tempoVida: 10 };

      pigs.forEach((p, idx) => {
        const offsetAng = (idx / 3) * Math.PI * 2;
        p.alvo.set(tx + Math.cos(offsetAng) * 0.9, tz + Math.sin(offsetAng) * 0.9);
        p.modo = 'andando';
        p.timer = 6;
      });
    };

    aoRenderizarUI();

    const angDif = (a, b) => {
      let d = b - a;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      return d;
    };

    function andar(p) {
      if (Math.random() < 0.4) {
        const c = comidas[Math.floor(Math.random() * comidas.length)];
        p.alvo.set(c[0] - 1.4, c[1] + (Math.random() - 0.5) * 0.6);
      } else {
        const a = Math.random() * 6.28;
        const r = Math.random() * R;
        p.alvo.set(Math.cos(a) * r, Math.sin(a) * r);
      }
      p.modo = 'andando';
      p.timer = 7;
    }

    function novoModo(p) {
      const r = Math.random();
      if (r < 0.45) andar(p);
      else if (r < 0.72) {
        p.modo = 'comendo';
        p.timer = 2 + Math.random() * 3;
      } else if (r < 0.92) {
        p.modo = 'parado';
        p.timer = 2 + Math.random() * 2;
        p.olhar = p.timer;
      } else {
        pular3D(p.i);
        p.modo = 'parado';
        p.timer = 1.2;
      }
    }

    function passo(p, dt) {
      p.t += dt;
      p.timer -= dt;
      p.piscar -= dt;
      p.olhar -= dt;
      const t = p.t;
      const pos = p.raiz.position;
      let bob = 0,
        tilt = 0,
        nod = 0,
        vira = 0,
        mast = 0;

      if (p.modo === 'andando') {
        const dx = p.alvo.x - pos.x;
        const dz = p.alvo.y - pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.12 || p.timer < 0) {
          p.modo = 'comendo';
          p.timer = 2 + Math.random() * 2;
        } else {
          const ang = Math.atan2(-dz, dx);
          p.raiz.rotation.y += angDif(p.raiz.rotation.y, ang) * Math.min(1, dt * 5);
          const f = Math.max(0, Math.cos(angDif(p.raiz.rotation.y, ang)));
          const v = 1.25 * dt * f;
          pos.x += Math.cos(p.raiz.rotation.y) * v;
          pos.z -= Math.sin(p.raiz.rotation.y) * v;
          const fase = (t * 3.4) % 1;
          bob = Math.sin(Math.PI * fase) * 0.14;
          tilt = Math.sin(t * 3.4 * Math.PI * 2) * 0.05;
        }
      } else if (p.modo === 'comendo') {
        nod = -0.32 + Math.sin(t * 3) * 0.04;
        mast = Math.abs(Math.sin(t * 16));
      } else {
        if (p.olhar > 0) vira = Math.sin(t * 1.3) * 0.55;
        nod = Math.sin(t * 0.9) * 0.06;
      }

      if (p.modo !== 'andando' && p.timer < 0) novoModo(p);

      let py = 0,
        giro = 0,
        estica = 0;
      if (p.pulo > 0) {
        p.pulo += dt / 0.7;
        if (p.pulo >= 1) p.pulo = 0;
        else {
          const s = Math.sin(Math.PI * p.pulo);
          py = s * 1.5;
          giro = Math.sin(Math.PI * 2 * p.pulo) * 0.45;
          estica = s;
        }
      }

      p.corpo.position.y = bob + py;
      p.corpo.rotation.x = giro;
      p.corpo.rotation.z = tilt + estica * 0.15;
      p.tronco.scale.set(1 - estica * 0.05, 1 + Math.sin(t * 2.4) * 0.018 + estica * 0.08, 1);
      p.cab.rotation.z += (nod - p.cab.rotation.z) * Math.min(1, dt * 6);
      p.cab.rotation.y += (vira - p.cab.rotation.y) * Math.min(1, dt * 4);
      p.foc.scale.y = 1 - mast * 0.12;
      p.boca.position.y = -0.2 - mast * 0.025;

      const fecha = p.piscar < 0;
      if (p.piscar < -0.14) p.piscar = 2 + Math.random() * 3;
      p.olhos.forEach((o) => (o.scale.y = fecha ? 0.12 : 1));

      const mex = Math.sin(t * 2.1 + p.i) > 0.95 ? Math.sin(t * 38) * 0.25 : 0;
      p.orelhas.forEach((o, k) => {
        o.rotation.y = (k ? 1 : -1) * (mex + estica * 0.5);
      });

      const r = Math.hypot(pos.x, pos.z);
      if (r > R) {
        pos.x *= R / r;
        pos.z *= R / r;
      }

      obst.forEach((o) => {
        const dx = pos.x - o.x;
        const dz = pos.z - o.z;
        const d = Math.hypot(dx, dz);
        const m = o.r + 0.8 * p.esc;
        if (d < m && d > 0.001) {
          pos.x = o.x + (dx / d) * m;
          pos.z = o.z + (dz / d) * m;
        }
      });

      const s = p.raiz.scale.x + (p.esc - p.raiz.scale.x) * Math.min(1, dt * 3);
      p.raiz.scale.setScalar(s);
      const k = 1 / (1 + (bob + py) * 0.6);
      p.sombra.position.set(
        pos.x + Math.cos(p.raiz.rotation.y) * 0.2 * s,
        0.01,
        pos.z - Math.sin(p.raiz.rotation.y) * 0.2 * s
      );
      p.sombra.rotation.z = p.raiz.rotation.y;
      p.sombra.scale.set(1.5 * s * k, 1.0 * s * k, 1);
    }

    function separar() {
      for (let a = 0; a < pigs.length; a++) {
        for (let b = a + 1; b < pigs.length; b++) {
          const A = pigs[a].raiz.position;
          const B = pigs[b].raiz.position;
          const dx = B.x - A.x;
          const dz = B.z - A.z;
          const d = Math.hypot(dx, dz);
          const min = (pigs[a].raiz.scale.x + pigs[b].raiz.scale.x) * 1.4;
          if (d < min && d > 0.001) {
            const k = (min - d) / 2 / d;
            A.x -= dx * k;
            A.z -= dz * k;
            B.x += dx * k;
            B.z += dz * k;
          }
        }
      }
    }

    let th = 1.15,
      th0 = 1.15,
      ph = 1.05,
      distBase = 14,
      zoomFator = 1.0,
      arr = false,
      lx = 0,
      ly = 0,
      ix = 0,
      iy = 0,
      ocioso = 0;

    const alvoCam = new THREE.Vector3(0, 0.4, 0);
    const cv = renderer.domElement;

    cv.addEventListener('pointerdown', (e) => {
      arr = true;
      lx = ix = e.clientX;
      ly = iy = e.clientY;
      ocioso = 0;
    });

    window.addEventListener('pointermove', (e) => {
      if (!arr) return;
      th -= (e.clientX - lx) * 0.008;
      th0 = th;
      ph = Math.min(1.35, Math.max(0.48, ph - (e.clientY - ly) * 0.006));
      lx = e.clientX;
      ly = e.clientY;
      ocioso = 0;
    });

    window.addEventListener('pointerup', (e) => {
      if (!arr) return;
      arr = false;
      if (Math.hypot(e.clientX - ix, e.clientY - iy) < 6) clique(e);
    });

    window.addEventListener('pointercancel', () => (arr = false));

    cv.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        zoomFator = Math.min(1.45, Math.max(0.55, zoomFator + e.deltaY * 0.0008));
      },
      { passive: false }
    );

    const ray = new THREE.Raycaster();
    const mv = new THREE.Vector2();

    function clique(e) {
      const r = cv.getBoundingClientRect();
      mv.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mv, cam);
      const hit = ray.intersectObjects(
        pigs.map((p) => p.raiz),
        true
      )[0];
      if (hit && hit.object.userData.idx != null) {
        const i = hit.object.userData.idx;
        pular3D(i);
        aoClicarPorquinho(i);
      }
    }

    function redimensionar() {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      cam.aspect = w / h;
      distBase = Math.max(13, 4.9 / (Math.tan(THREE.MathUtils.degToRad(17.5)) * cam.aspect));
      cam.updateProjectionMatrix();
    }

    window.addEventListener('resize', () => {
      redimensionar();
      ns.desenharGrafico(obterDados());
    });
    redimensionar();

    const relogio = new THREE.Clock();
    const v = new THREE.Vector3();
    const destinoOlhar = new THREE.Vector3();

    (function loop() {
      requestAnimationFrame(loop);
      const dt = Math.min(relogio.getDelta(), 0.05);

      if (!arr) {
        ocioso += dt;
        if (ocioso > 3) th = th0 + Math.sin((ocioso - 3) * 0.2) * 0.7;
      }

      if (cenouraExtra) {
        if (cenouraExtra.mesh.position.y > 0.15) {
          cenouraExtra.vy += 9.8 * dt;
          cenouraExtra.mesh.position.y = Math.max(
            0.15,
            cenouraExtra.mesh.position.y - cenouraExtra.vy * dt
          );
        } else {
          cenouraExtra.tempoVida -= dt;
          if (cenouraExtra.tempoVida <= 0) {
            scene.remove(cenouraExtra.mesh);
            cenouraExtra = null;
          }
        }
      }

      let distAtual = distBase * zoomFator;
      if (porquinhoFocado != null && pigs[porquinhoFocado]) {
        const pf = pigs[porquinhoFocado].raiz.position;
        destinoOlhar.set(pf.x, 0.75, pf.z);
        distAtual = Math.min(distAtual, 8.8);
      } else {
        destinoOlhar.set(0, 0.4, 0);
      }
      alvoCam.lerp(destinoOlhar, Math.min(1, dt * 5));

      cam.position.set(
        alvoCam.x + distAtual * Math.sin(ph) * Math.sin(th),
        alvoCam.y + distAtual * Math.cos(ph),
        alvoCam.z + distAtual * Math.sin(ph) * Math.cos(th)
      );
      cam.lookAt(alvoCam);

      pigs.forEach((p) => passo(p, dt));
      separar();
      renderer.render(scene, cam);

      const w = el.clientWidth;
      const h = el.clientHeight;
      pigs.forEach((p) => {
        const s = p.raiz.scale.x;
        v.copy(p.raiz.position);
        v.y += (2.35 + p.corpo.position.y) * s;
        v.project(cam);
        p.tag.style.left = (v.x * 0.5 + 0.5) * w + 'px';
        p.tag.style.top = (-v.y * 0.5 + 0.5) * h + 'px';
      });
    })();
  }

  Object.assign(ns, {
    AVATARES,
    atualizar3D,
    pular3D,
    focar3D,
    jogarCenoura3D,
    atualizarTema3D,
    iniciarCena3D,
  });
})(window.Porquinhos);
