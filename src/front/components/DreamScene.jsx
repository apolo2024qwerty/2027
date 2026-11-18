// Escena 3D del login: tu universo 2027. Una estrella al centro (tú) y ocho mundos que orbitan,
// uno por cada área de la Rueda de la Vida. Sigue al mouse y, al entrar, la cámara vuela hacia la estrella.
import { useEffect, useRef } from "react";
import * as THREE from "three";

const WORLDS = [["Salud", "#F0A64A"], ["Dinero", "#E6CF52"], ["Amor", "#86C55F"], ["Familia", "#62CDB0"],
  ["Profesión", "#62B4E8"], ["Crecimiento", "#8C93F2"], ["Ocio", "#D48BF0"], ["Amigos", "#F08E7E"]];
const SIZES = [0.8, 0.7, 1.1, 0.95, 1.05, 1.15, 0.85, 0.95];
const TILT = -0.66; // qué tan abiertas se ven las órbitas

const glowTexture = (inner, outer) => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 256;
  const g = cv.getContext("2d"), grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, inner); grad.addColorStop(0.28, outer); grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(cv);
};

export function DreamScene({ launch }) {
  const mount = useRef(null);
  const launchAt = useRef(0);
  useEffect(() => { if (launch) launchAt.current = performance.now(); }, [launch]);

  useEffect(() => {
    const el = mount.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }); } catch { return; } // sin WebGL queda el cielo CSS
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 400);
    const system = new THREE.Group(); // todo el sistema, inclinado para que las órbitas se vean en perspectiva
    system.rotation.set(TILT, 0, 0.1);
    scene.add(system);
    const trash = [];
    const keep = (x) => { trash.push(x); return x; };

    // La estrella: tú
    const star = new THREE.Mesh(keep(new THREE.IcosahedronGeometry(2.3, 4)), keep(new THREE.MeshBasicMaterial({ color: 0xffe2a6 })));
    system.add(star);
    const halo = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: keep(glowTexture("rgba(255,226,160,.95)", "rgba(245,160,110,.34)")), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    halo.scale.set(26, 26, 1);
    system.add(halo);
    // Rayos suaves que giran despacio alrededor de la estrella
    const rc = document.createElement("canvas"); rc.width = rc.height = 512;
    const rg = rc.getContext("2d"); rg.translate(256, 256);
    for (let i = 0; i < 14; i++) {
      rg.rotate((Math.PI * 2) / 14);
      const len = 150 + (i % 3) * 50, lg = rg.createLinearGradient(0, 0, len, 0);
      lg.addColorStop(0, "rgba(255,225,165,.5)"); lg.addColorStop(1, "rgba(255,225,165,0)");
      rg.fillStyle = lg; rg.beginPath(); rg.moveTo(0, -7); rg.lineTo(len, 0); rg.lineTo(0, 7); rg.fill();
    }
    const rays = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: keep(new THREE.CanvasTexture(rc)), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })));
    rays.scale.set(22, 22, 1);
    system.add(rays);
    system.add(new THREE.PointLight(0xffd9a0, 420, 0, 1.7), new THREE.AmbientLight(0x8fa6d8, 0.55));

    // Ocho mundos, uno por área de la vida: órbita, estela y nombre
    const labels = document.createElement("div"); labels.className = "scene-labels"; el.appendChild(labels);
    const worlds = WORLDS.map(([name, hex], i) => {
      const radius = 6.6 + i * 2.75, size = SIZES[i];
      const ring = new THREE.Mesh(keep(new THREE.RingGeometry(radius - 0.035, radius + 0.035, 200)), keep(new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false })));
      ring.rotation.x = Math.PI / 2;
      const ball = new THREE.Mesh(keep(new THREE.IcosahedronGeometry(size, 3)), keep(new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.38, roughness: 0.45, flatShading: true })));
      const aura = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: keep(glowTexture(hex, "rgba(255,255,255,.06)")), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })));
      aura.scale.setScalar(size * 5);
      ball.add(aura);
      if (i === 2 || i === 5) { // dos mundos llevan anillo propio
        const belt = new THREE.Mesh(keep(new THREE.RingGeometry(size * 1.4, size * 1.8, 64)), keep(new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false })));
        belt.rotation.x = 1.2; ball.add(belt);
      }
      // Estela: un arco que se apaga detrás del mundo
      const N = 48, arc = 1.5, tp = new Float32Array(N * 3), tc = new Float32Array(N * 3), col = new THREE.Color(hex);
      for (let k = 0; k < N; k++) {
        const a = -(k / (N - 1)) * arc, f = (1 - k / (N - 1)) ** 2;
        tp.set([Math.cos(a) * radius, 0, Math.sin(a) * radius], k * 3);
        tc.set([col.r * f, col.g * f, col.b * f], k * 3);
      }
      const tg = keep(new THREE.BufferGeometry());
      tg.setAttribute("position", new THREE.BufferAttribute(tp, 3)); tg.setAttribute("color", new THREE.BufferAttribute(tc, 3));
      const trail = new THREE.Line(tg, keep(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
      system.add(ring, trail, ball);
      const tag = document.createElement("span"); tag.textContent = name; tag.style.setProperty("--c", hex); labels.appendChild(tag);
      return { ball, trail, tag, radius, size, speed: 0.3 / Math.sqrt(radius / 6), phase: i * 2.399 + 0.6 };
    });

    // Polvo de estrellas: lejanas y un cinturón cercano que da profundidad
    const dust = (n, spread, sizePx, opacity) => {
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.5) * Math.PI, r = spread * (0.35 + Math.random() * 0.65);
        arr.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r * 0.7, Math.sin(a) * Math.cos(e) * r], i * 3);
      }
      const geo = keep(new THREE.BufferGeometry()); geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      const pts = new THREE.Points(geo, keep(new THREE.PointsMaterial({ color: 0xffffff, size: sizePx, transparent: true, opacity, depthWrite: false, sizeAttenuation: true })));
      scene.add(pts);
      return pts;
    };
    const far = dust(1100, 170, 0.5, 0.85), near = dust(220, 52, 0.17, 0.65);

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e) => { mouse.tx = e.clientX / window.innerWidth - 0.5; mouse.ty = e.clientY / window.innerHeight - 0.5; };
    let narrow = false;
    const size = { w: 1, h: 1 }, v = new THREE.Vector3();
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      narrow = w < 900;
      size.w = w; size.h = h;
      renderer.setSize(w, h); camera.aspect = w / h; camera.fov = narrow ? 66 : 46; camera.updateProjectionMatrix();
      // En escritorio el sistema vive abajo y a la izquierda: el texto queda arriba y los mundos tienen aire
      system.position.set(narrow ? 0 : -9, narrow ? 9.5 : -6.5, 0);
      system.scale.setScalar(narrow ? 0.5 : 1);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("resize", resize);
    resize();

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let raf, last = t0;
    const frame = (nowT) => {
      const t = still ? 8 : (nowT - t0) / 1000 + 8;
      const dt = Math.min(0.05, (nowT - last) / 1000), ease = 1 - Math.exp(-dt * 5); last = nowT;
      mouse.x += (mouse.tx - mouse.x) * ease; mouse.y += (mouse.ty - mouse.y) * ease;

      worlds.forEach((w) => {
        const a = w.phase + t * w.speed;
        w.ball.position.set(Math.cos(a) * w.radius, 0, Math.sin(a) * w.radius);
        w.ball.rotation.y = t * 0.6;
        w.trail.rotation.y = -a;
      });
      star.rotation.y = t * 0.2; star.scale.setScalar(1 + Math.sin(t * 1.4) * 0.03);
      halo.material.rotation = t * 0.04; rays.material.rotation = -t * 0.05; rays.scale.setScalar(22 + Math.sin(t * 0.9) * 1.6);
      system.rotation.y = t * 0.03 + mouse.x * 0.7;
      system.rotation.x = TILT + mouse.y * 0.3;
      far.rotation.y = t * 0.006 + mouse.x * 0.1; near.rotation.y = -t * 0.02 + mouse.x * 0.3;

      let z = 44, px = mouse.x * -3, py = 1 + mouse.y * -2;
      if (launchAt.current) { // despegue: directo a la estrella
        const k = Math.min(1, (nowT - launchAt.current) / 1500), e = k * k * k;
        z = 44 - e * 41; px += (system.position.x - px) * e; py += (system.position.y - py) * e;
        halo.scale.setScalar(26 + e * 70);
      }
      camera.position.set(px, py, z);
      camera.lookAt(launchAt.current ? system.position.x : 0, launchAt.current ? system.position.y : 0, 0);
      renderer.render(scene, camera);
      // Nombres de las áreas, pegados a su mundo
      worlds.forEach((w) => {
        w.ball.getWorldPosition(v); v.project(camera);
        const x = (v.x * 0.5 + 0.5) * size.w, y = (-v.y * 0.5 + 0.5) * size.h;
        w.tag.style.transform = `translate(${x.toFixed(1)}px, ${(y + w.size * (narrow ? 9 : 15) + 10).toFixed(1)}px) translateX(-50%)`;
        w.tag.style.opacity = launchAt.current || v.z > 1 ? 0 : 1;
      });
      if (!still || launchAt.current) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      trash.forEach((x) => x.dispose());
      renderer.dispose();
      el.removeChild(renderer.domElement); el.removeChild(labels);
    };
  }, []);

  return <div ref={mount} className="scene3d" aria-hidden="true" />;
}
