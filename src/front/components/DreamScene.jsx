// Escena 3D del login: tu universo 2027. Una estrella al centro (tú) y ocho mundos que orbitan,
// uno por cada área de la Rueda de la Vida. Sigue al mouse y, al entrar, la cámara vuela hacia la estrella.
import { useEffect, useRef } from "react";
import * as THREE from "three";

const WORLDS = ["#F0A64A", "#E6CF52", "#86C55F", "#62CDB0", "#62B4E8", "#8C93F2", "#D48BF0", "#F08E7E"];

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
    system.rotation.set(-0.42, 0, 0.16);
    scene.add(system);
    const trash = [];
    const keep = (x) => { trash.push(x); return x; };

    // La estrella: tú
    const star = new THREE.Mesh(keep(new THREE.IcosahedronGeometry(2.1, 3)), keep(new THREE.MeshBasicMaterial({ color: 0xffe2a6 })));
    system.add(star);
    const halo = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: keep(glowTexture("rgba(255,226,160,.95)", "rgba(245,160,110,.34)")), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    halo.scale.set(21, 21, 1);
    system.add(halo);
    system.add(new THREE.PointLight(0xffd9a0, 420, 0, 1.7), new THREE.AmbientLight(0x8fa6d8, 0.55));

    // Ocho mundos con su órbita
    const worlds = WORLDS.map((hex, i) => {
      const radius = 5.2 + i * 2.15, size = 0.5 + ((i * 7) % 5) * 0.14;
      const pivot = new THREE.Group();
      pivot.rotation.set(Math.sin(i * 2.1) * 0.16, 0, Math.cos(i * 1.7) * 0.12);
      const ring = new THREE.Mesh(keep(new THREE.RingGeometry(radius - 0.018, radius + 0.018, 160)), keep(new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })));
      ring.rotation.x = Math.PI / 2;
      const ball = new THREE.Mesh(keep(new THREE.IcosahedronGeometry(size, 2)), keep(new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.32, roughness: 0.5, flatShading: true })));
      const aura = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: keep(glowTexture(hex, "rgba(255,255,255,.07)")), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })));
      aura.scale.setScalar(size * 5.5);
      ball.add(aura);
      if (i === 2 || i === 5) { // dos mundos llevan anillo propio
        const belt = new THREE.Mesh(keep(new THREE.RingGeometry(size * 1.5, size * 2.1, 48)), keep(new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.55, side: THREE.DoubleSide })));
        belt.rotation.x = 1.25; ball.add(belt);
      }
      pivot.add(ring, ball);
      system.add(pivot);
      return { ball, radius, speed: 0.34 / Math.sqrt(radius / 5), phase: i * 2.4 };
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
    const far = dust(900, 170, 0.5, 0.8), near = dust(160, 46, 0.16, 0.6);

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e) => { mouse.tx = e.clientX / window.innerWidth - 0.5; mouse.ty = e.clientY / window.innerHeight - 0.5; };
    let narrow = false;
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      narrow = w < 820;
      renderer.setSize(w, h); camera.aspect = w / h; camera.fov = narrow ? 64 : 46; camera.updateProjectionMatrix();
      system.position.set(narrow ? 0 : -4.5, narrow ? 7 : 0.5, 0); // en escritorio el sistema vive a la izquierda, detrás del 2027
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
      });
      star.rotation.y = t * 0.2; star.scale.setScalar(1 + Math.sin(t * 1.4) * 0.03);
      halo.material.rotation = t * 0.04;
      system.rotation.y = t * 0.03 + mouse.x * 0.7;
      system.rotation.x = -0.42 + mouse.y * 0.36;
      far.rotation.y = t * 0.006 + mouse.x * 0.1; near.rotation.y = -t * 0.02 + mouse.x * 0.3;

      let z = 40, px = mouse.x * -3, py = 3 + mouse.y * -2;
      if (launchAt.current) { // despegue: directo a la estrella
        const k = Math.min(1, (nowT - launchAt.current) / 1500), e = k * k * k;
        z = 40 - e * 37; px += (system.position.x - px) * e; py += (system.position.y - py) * e;
        halo.scale.setScalar(21 + e * 60);
      }
      camera.position.set(px, py, z);
      camera.lookAt(launchAt.current ? system.position.x : 0, launchAt.current ? system.position.y : 1.5, 0);
      renderer.render(scene, camera);
      if (!still || launchAt.current) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      trash.forEach((x) => x.dispose());
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mount} className="scene3d" aria-hidden="true" />;
}
