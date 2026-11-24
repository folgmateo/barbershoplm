/* BarberShopLM — escena 3D procedural del hero (Three.js) */
// Script clásico (no módulo) para que también funcione abriendo index.html con doble clic (file://)
(async () => {
const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js");
const { RoomEnvironment } = await import("https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/environments/RoomEnvironment.js");

const canvas = document.getElementById("scene");
const state = window.BSLM || { heroProgress: 0, reduced: false, mouseX: 0, mouseY: 0 };
const isSmall = () => window.innerWidth < 860;
const lowPower = window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency || 8) <= 4;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: true, powerPreference: "high-performance" });
} catch (err) {
  // Sin WebGL: el hero sigue funcionando con su fondo CSS
  renderer = null;
  canvas.remove();
}
if (renderer) start();

function start() {
renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.25 : 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 10.5);

// Iluminación de entorno procedural para los reflejos metálicos
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

scene.add(new THREE.AmbientLight(0xffffff, 0.15));
const key = new THREE.DirectionalLight(0xffe2b0, 2.2);
key.position.set(-4, 5, 6);
scene.add(key);
const rim = new THREE.PointLight(0xc9a45c, 30, 20);
rim.position.set(4, -1, -2);
scene.add(rim);

/* ---------- materiales ---------- */
const gold = new THREE.MeshStandardMaterial({ color: 0xc9a45c, metalness: 1, roughness: 0.28 });
const steel = new THREE.MeshStandardMaterial({ color: 0xe9e6df, metalness: 1, roughness: 0.15 });
const ebony = new THREE.MeshStandardMaterial({ color: 0x0c0a08, metalness: 0.2, roughness: 0.35 });

/* ---------- poste de barbero ---------- */
function stripeTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#f4f1ea";
  g.fillRect(0, 0, 256, 256);
  const colors = ["#0a0806", "#c9a45c"];
  // franjas diagonales que se repiten sin costura
  for (let i = -4; i < 8; i++) {
    g.fillStyle = colors[((i % 2) + 2) % 2];
    g.beginPath();
    const x = i * 64;
    g.moveTo(x, 0); g.lineTo(x + 32, 0); g.lineTo(x + 32 + 256, 256); g.lineTo(x + 256, 256);
    g.closePath();
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 3);
  t.anisotropy = 4;
  return t;
}

const stripes = stripeTexture();
const pole = new THREE.Group();
const seg = lowPower ? 32 : 64;
{
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 3.2, seg, 1, false),
    new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.4, metalness: 0.1 })
  );
  pole.add(core);

  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.52, 3.2, seg, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.12, envMapIntensity: 2 })
  );
  pole.add(glass);

  const capGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.22, seg);
  const ringGeo = new THREE.TorusGeometry(0.58, 0.035, 12, seg);
  [1.71, -1.71].forEach((y) => {
    const cap = new THREE.Mesh(capGeo, gold);
    cap.position.y = y;
    pole.add(cap);
    const ring = new THREE.Mesh(ringGeo, gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y + Math.sign(y) * 0.14;
    pole.add(ring);
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.48, seg, seg / 2, 0, Math.PI * 2, 0, Math.PI / 2), gold);
  dome.position.y = 1.82;
  pole.add(dome);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), gold);
  knob.position.y = 2.36;
  pole.add(knob);
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.45, seg), gold);
  finial.rotation.x = Math.PI;
  finial.position.y = -2.05;
  pole.add(finial);
}
scene.add(pole);

// cada pieza del poste guarda su posición base y una dirección de salida para la explosión
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const poleParts = pole.children.map((o) => ({
  o,
  base: o.position.clone(),
  baseRot: o.rotation.clone(),
  dir: new THREE.Vector3(rnd(1.6), o.position.y * 0.9 + rnd(0.6), rnd(1.6)),
  spin: new THREE.Vector3(rnd(3), rnd(3), rnd(3)),
}));
// el cristal (2º hijo) viaja pegado al tubo de franjas (1º hijo)
poleParts[1].dir = poleParts[0].dir;
poleParts[1].spin = poleParts[0].spin;

/* ---------- navaja ---------- */
const razor = new THREE.Group();
const blade = new THREE.Group();
{
  const extrude = { depth: 0.04, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 16 };

  const bs = new THREE.Shape();
  bs.moveTo(0, 0.1);
  bs.lineTo(1.45, 0.12);
  bs.quadraticCurveTo(1.68, 0.1, 1.62, -0.12);
  bs.lineTo(1.5, -0.3);
  bs.quadraticCurveTo(0.7, -0.26, 0.15, -0.16);
  bs.quadraticCurveTo(0, -0.1, 0, 0.1);
  const bladeMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(bs, extrude), steel);
  bladeMesh.position.z = -0.02;
  blade.add(bladeMesh);
  // tang (cola de la hoja)
  const tang = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.05), steel);
  tang.position.set(-0.15, 0.06, 0);
  blade.add(tang);

  const hs = new THREE.Shape();
  hs.moveTo(0.12, 0.09);
  hs.lineTo(-1.6, 0.13);
  hs.quadraticCurveTo(-1.85, 0, -1.6, -0.13);
  hs.lineTo(0.12, -0.09);
  hs.quadraticCurveTo(0.22, 0, 0.12, 0.09);
  const handle = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { ...extrude, depth: 0.06 }), ebony);
  handle.position.z = -0.1;
  razor.add(handle);

  [0, -1.6].forEach((x) => {
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 16), gold);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(x, 0, -0.04);
    razor.add(pin);
  });
  razor.add(blade);
}
scene.add(razor);

/* ---------- tijeras ---------- */
const scissors = new THREE.Group();
const halves = [];
{
  const ext = { depth: 0.035, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 16 };
  const s = new THREE.Shape();
  s.moveTo(-0.1, 0.02);
  s.quadraticCurveTo(0.7, 0.14, 1.45, 0.02);
  s.lineTo(1.45, -0.01);
  s.quadraticCurveTo(0.7, -0.03, -0.1, -0.08);
  s.lineTo(-0.1, 0.02);
  const bladeGeo = new THREE.ExtrudeGeometry(s, ext);
  const ringGeo = new THREE.TorusGeometry(0.2, 0.045, 12, 40);

  // mango: de la base de la hoja (-0.1, -0.03) al anillo (-0.78, -0.34)
  const a0 = new THREE.Vector2(-0.1, -0.03), a1 = new THREE.Vector2(-0.62, -0.27);
  const dirV = a1.clone().sub(a0);
  const shankLen = dirV.length();
  const shankGeo2 = new THREE.CylinderGeometry(0.045, 0.05, shankLen, 12);
  [1, -1].forEach((side) => {
    const h = new THREE.Group();
    const b = new THREE.Mesh(bladeGeo, steel);
    b.position.z = side * 0.025 - 0.0175;
    h.add(b);
    const shank = new THREE.Mesh(shankGeo2, gold);
    shank.position.set((a0.x + a1.x) / 2, (a0.y + a1.y) / 2, side * 0.025);
    shank.rotation.z = Math.atan2(dirV.y, dirV.x) - Math.PI / 2;
    h.add(shank);
    const ring = new THREE.Mesh(ringGeo, gold);
    ring.position.set(-0.78, -0.4, side * 0.025);
    h.add(ring);
    if (side < 0) h.scale.y = -1;
    halves.push(h);
    scissors.add(h);
  });
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 16), gold);
  screw.rotation.x = Math.PI / 2;
  scissors.add(screw);
}
scene.add(scissors);

/* ---------- polvo dorado ---------- */
const dustCount = lowPower ? 140 : 380;
const dustPos = new Float32Array(dustCount * 3);
// polvo en un cilindro alrededor del poste, para que la órbita de 360° se sienta envolvente
for (let i = 0; i < dustCount; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = 2.5 + Math.random() * 9;
  dustPos[i * 3] = Math.sin(a) * r;
  dustPos[i * 3 + 1] = (Math.random() - 0.5) * 10;
  dustPos[i * 3 + 2] = Math.cos(a) * r;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
  color: 0xe8cf8e, size: 0.035, transparent: true, opacity: 0.7, depthWrite: false, sizeAttenuation: true,
}));
scene.add(dust);

/* ---------- estallido de chispas ---------- */
const sparkCount = lowPower ? 260 : 700;
const sparkDir = new Float32Array(sparkCount * 3);
const sparkPos = new Float32Array(sparkCount * 3);
for (let i = 0; i < sparkCount; i++) {
  const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 6;
  const r = Math.sqrt(1 - u * u);
  sparkDir[i * 3] = r * Math.cos(a) * sp;
  sparkDir[i * 3 + 1] = u * sp * 0.8;
  sparkDir[i * 3 + 2] = r * Math.sin(a) * sp;
}
const sparkGeo = new THREE.BufferGeometry();
sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
  color: 0xffd98a, size: 0.07, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
}));
scene.add(sparks);

/* ---------- anillos dorados de la órbita ---------- */
const halo = new THREE.Mesh(
  new THREE.TorusGeometry(3.3, 0.012, 8, 160),
  new THREE.MeshBasicMaterial({ color: 0xc9a45c, transparent: true, opacity: 0, depthWrite: false })
);
halo.rotation.x = Math.PI / 2;
halo.position.y = 0.05;
scene.add(halo);
const floor = new THREE.Mesh(
  new THREE.RingGeometry(4.1, 4.16, 160, 1),
  new THREE.MeshBasicMaterial({ color: 0xc9a45c, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -2.4;
scene.add(floor);



/* ---------- composición responsive ---------- */
const layout = { poleX: 2.3, poleY: 0, scale: 1 };
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (isSmall()) Object.assign(layout, { poleX: 0.75, poleY: 1.45, scale: 0.62 });
  else Object.assign(layout, { poleX: 2.6 * Math.min(1, camera.aspect / 1.6), poleY: -0.1, scale: 0.85 });
  if (!running) render(performance.now());
}

/* ---------- animación ---------- */
const clock = new THREE.Clock();
let smoothP = 0, mx = 0, my = 0, intro = 0;

const lerp = THREE.MathUtils.lerp;
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const v = new THREE.Vector3();
const TAU = Math.PI * 2;
// Ángulos de la órbita donde la cámara "se detiene" frente a cada herramienta
const SCISSORS_ANGLE = TAU / 3;      // 120°
const RAZOR_ANGLE = (TAU / 3) * 2;   // 240°

function render() {
  const t = state.reduced ? 2 : clock.getElapsedTime();
  intro = state.reduced ? 1 : Math.min(1, t / 2.2);
  const ease = 1 - Math.pow(1 - intro, 4);

  smoothP += (state.heroProgress - smoothP) * 0.07;
  mx += (state.mouseX - mx) * 0.05;
  my += (state.mouseY - my) * 0.05;
  const p = state.reduced ? 0 : smoothP;
  const s = layout.scale;

  // k: el poste pasa al centro · theta: vuelta de 360° · e: explosión (sube y baja)
  const k = smooth(0, 0.12, p);
  const orbit = THREE.MathUtils.clamp((p - 0.06) / 0.88, 0, 1);
  const theta = (1 - Math.pow(1 - orbit, 2)) * TAU; // arranca rápido, frena al final
  const e = Math.pow(Math.sin(Math.PI * THREE.MathUtils.clamp((p - 0.12) / 0.7, 0, 1)), 0.8);
  const burst = THREE.MathUtils.clamp((p - 0.12) / 0.45, 0, 1);
  const so = isSmall() ? 0.7 : 0.82;

  // poste: se centra y explota en piezas
  stripes.offset.y = state.reduced ? 0 : -t * 0.25 - p * 4;
  pole.position.set(lerp(layout.poleX + (1 - ease) * 3, 0, k), lerp(layout.poleY, 0, k), 0);
  pole.rotation.set(lerp(0.08 + my * 0.08, 0, k), t * 0.15 + e * 1.5, lerp(-0.12 + mx * 0.05, 0, k));
  pole.scale.setScalar(lerp(s, so, k));
  for (const part of poleParts) {
    part.o.position.copy(part.base).addScaledVector(part.dir, e * 1.15);
    part.o.rotation.set(part.baseRot.x + part.spin.x * e, part.baseRot.y + part.spin.y * e, part.baseRot.z + part.spin.z * e);
  }

  // tijeras
  const snip = state.reduced ? 0.25 : 0.12 + Math.max(0, Math.sin(t * 2.4)) * 0.28 + e * 0.5;
  halves[0].rotation.z = snip;
  halves[1].rotation.z = -snip;
  const sr = (2.3 + e * 2.4) * so;
  scissors.position.set(
    lerp(layout.poleX - 1.5 * s, Math.sin(SCISSORS_ANGLE) * sr, k),
    lerp(layout.poleY + 1.6 * s, 0.9 + e * 1.2, k) + Math.cos(t * 0.7) * 0.1,
    lerp(0.8, Math.cos(SCISSORS_ANGLE) * sr, k)
  );
  scissors.rotation.set(lerp(0.4 + my * 0.2, 0.2 + e * 4, k), lerp(-0.4 + mx * 0.3, SCISSORS_ANGLE, k) + e * 3, lerp(-0.6, -0.35, k) + e * 2);
  scissors.scale.setScalar(lerp(s * 0.8, so * 1.1, k) * ease);

  // navaja
  blade.rotation.z = Math.PI * 0.97 * (1 - ease) + e * 0.6;
  razor.position.set(
    lerp(layout.poleX + 0.9 * s, Math.sin(RAZOR_ANGLE) * sr, k),
    lerp(layout.poleY - 1.9 * s, -0.8 - e * 1.1, k) + Math.sin(t * 0.8) * 0.08,
    lerp(1.2, Math.cos(RAZOR_ANGLE) * sr, k)
  );
  razor.rotation.set(lerp(-0.3 + my * 0.2, 0.1, k) - e * 3, lerp(0.5 + mx * 0.3, RAZOR_ANGLE, k) + e * 4, lerp(0.5, 0.35, k) + Math.sin(t * 0.6) * 0.05);
  razor.scale.setScalar(lerp(s * 0.75, so * 1.15, k) * ease);

  // chispas: salen disparadas desde el centro y se apagan
  const sp = sparkGeo.attributes.position.array;
  const travel = 1 - Math.pow(1 - burst, 3);
  for (let i = 0; i < sparkCount * 3; i += 3) {
    sp[i] = sparkDir[i] * travel;
    sp[i + 1] = sparkDir[i + 1] * travel - travel * travel * 1.2;
    sp[i + 2] = sparkDir[i + 2] * travel;
  }
  sparkGeo.attributes.position.needsUpdate = true;
  sparks.material.opacity = burst > 0 && burst < 1 ? Math.sin(Math.PI * burst) : 0;

  // onda expansiva y anillos
  halo.rotation.z = t * 0.05;
  halo.scale.setScalar(lerp(0.6, 1, k) + travel * 2.5);
  halo.material.opacity = burst > 0 && burst < 1 ? (1 - burst) * 0.9 : 0.35 * k;
  floor.material.opacity = 0.45 * k;
  dust.rotation.y = t * 0.015 + mx * 0.1 + theta * 0.3;
  rim.intensity = 30 + e * 120;

  // cámara: vuelta de 360° alrededor del poste con un leve temblor en el pico de la explosión
  const radius = lerp(10.5, 9.4 - e * 1.4, k) * (isSmall() ? 1.45 : 1);
  const shake = state.reduced ? 0 : e * 0.06;
  v.set(
    Math.sin(theta) * radius + mx * 0.3 * (1 - k * 0.5) + Math.sin(t * 40) * shake,
    Math.sin(theta) * 1.4 * k + e * 1.2 - my * 0.25 + Math.cos(t * 37) * shake,
    Math.cos(theta) * radius
  );
  camera.position.copy(v);
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

let running = false, visible = true, rafId = 0;
function loop() {
  rafId = requestAnimationFrame(loop);
  render();
}
function updateRunning() {
  const should = visible && !document.hidden && !state.reduced;
  if (should && !running) { running = true; loop(); }
  else if (!should && running) { running = false; cancelAnimationFrame(rafId); }
}

new IntersectionObserver((entries) => {
  visible = entries[0].isIntersecting;
  updateRunning();
}).observe(canvas);
document.addEventListener("visibilitychange", updateRunning);
window.addEventListener("resize", resize);

resize();
if (state.reduced) render();
updateRunning();
}
})().catch(() => { const c = document.getElementById("scene"); if (c) c.remove(); });
