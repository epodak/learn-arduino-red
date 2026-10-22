import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const COLORS = {
  pcb: 0x116b73, edge: 0x0b5058, ink: 0x102a30,
  copper: 0xd0ac64, metal: 0x9caeb9, dark: 0x23333b,
  label: 0xf0eed9, led: 0x41d3ae, accent: 0xf3ba61,
};

function material(color, metalness = 0.08, roughness = 0.64) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function block(w, h, d, color, x, y, z, radius = 0.05) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, radius), material(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function circle(r, h, color, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32), material(color, 0.36));
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function inscription(value, width, height, size = 44, color = '#e8f1e9') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, 512, 128);
  context.font = `600 ${size}px monospace`;
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(value, 256, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  mesh.userData.ownedTexture = texture;
  return mesh;
}

function screenPart(group, id) {
  group.userData.partId = id;
  group.traverse((child) => { child.userData.partId = id; });
  return group;
}

function makeHeaders(root) {
  for (const y of [-1.39, 1.4]) {
    root.add(block(3.3, 0.38, 0.28, 0x1d272d, 0.82, y, 0.22));
    for (let i = 0; i < 14; i += 1) {
      const hole = circle(0.058, 0.02, COLORS.copper, -0.68 + i * 0.23, y, 0.383);
      root.add(hole);
      root.add(circle(0.029, 0.023, 0x182427, -0.68 + i * 0.23, y, 0.4));
    }
  }
  const serial = inscription('D0  D1  D2  D3  D4  D5  D6  D7  D8  D9  D10  D11  D12  D13', 3.3, 0.16, 22);
  serial.position.set(0.83, 1.13, 0.23);
  root.add(serial);
  const analog = inscription('POWER  GND   A0   A1   A2   A3   A4   A5', 3, 0.16, 24);
  analog.position.set(0.83, -1.11, 0.23);
  root.add(analog);
}

export function createBoardStage(container, { onSelect = () => {} } = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
  camera.position.set(0.2, 2.0, 10.8);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', 'Interactive three-dimensional controller board');
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8aa6ad, 2.6));
  const key = new THREE.DirectionalLight(0xffffff, 3.5);
  key.position.set(-4, 8, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x7cd5dd, 1.4);
  fill.position.set(4, -2, 5);
  scene.add(fill);

  const root = new THREE.Group();
  scene.add(root);
  root.add(block(5.9, 3.5, 0.18, COLORS.edge, 0, 0, 0, 0.22));
  root.add(block(5.72, 3.32, 0.06, COLORS.pcb, 0, 0, 0.13, 0.16));
  for (const x of [-2.68, 2.68]) {
    for (const y of [-1.48, 1.48]) {
      root.add(circle(0.14, 0.018, 0xa4c3c1, x, y, 0.182));
      root.add(circle(0.078, 0.02, COLORS.dark, x, y, 0.2));
    }
  }
  makeHeaders(root);

  const interactive = new Map();
  function part(id, ...objects) {
    const group = new THREE.Group();
    group.name = id;
    for (const object of objects) group.add(object);
    screenPart(group, id);
    root.add(group);
    interactive.set(id, group);
    return group;
  }

  part('uno', block(1.54, 1.22, 0.2, 0x143d43, 0.05, 0, 0.23, 0.05));
  const cpu = block(1.35, 0.92, 0.19, 0x171e25, 0.05, 0, 0.42);
  root.add(cpu);
  const cpuText = inscription('ATMEGA328P', 1.2, 0.23, 34, '#b6c7c4');
  cpuText.position.set(0.05, 0, 0.53);
  root.add(cpuText);

  part('usb',
    block(0.81, 0.98, 0.46, COLORS.metal, -2.94, 0.33, 0.32),
    block(0.55, 0.58, 0.02, 0x1c2f37, -2.95, 0.34, 0.572),
  );
  part('reset', block(0.42, 0.42, 0.22, COLORS.dark, -2.01, 0.91, 0.26),
    block(0.16, 0.16, 0.11, COLORS.accent, -2.01, 0.91, 0.44));
  const ledMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.led, emissive: COLORS.led, emissiveIntensity: 0.06,
    roughness: 0.3,
  });
  const ledMesh = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 16), ledMaterial);
  ledMesh.scale.set(1, 0.6, 0.5);
  ledMesh.position.set(1.95, 0.73, 0.31);
  const led = part('led', ledMesh);
  const ledText = inscription('L 13', 0.6, 0.17, 37);
  ledText.position.set(1.94, 0.98, 0.24);
  root.add(ledText);

  part('button', block(0.51, 0.45, 0.16, 0x1c353c, -1.99, -0.55, 0.29),
    block(0.21, 0.2, 0.09, 0xe6b96f, -1.99, -0.55, 0.42));
  const pot = part('pot', circle(0.27, 0.3, COLORS.dark, -1.35, -0.45, 0.39));
  const knobNotch = block(0.045, 0.15, 0.03, 0xf1c569, -1.35, -0.33, 0.57);
  pot.add(knobNotch);
  const rgbMaterial = new THREE.MeshStandardMaterial({ color: 0x45cbd5, emissive: 0x45cbd5, emissiveIntensity: 0.15 });
  const rgbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 20), rgbMaterial);
  rgbMesh.position.set(1.55, -0.55, 0.34);
  part('rgb', rgbMesh);
  part('sensor', block(0.63, 0.46, 0.19, 0x253d46, 2.04, -0.51, 0.28),
    circle(0.095, 0.1, 0x8fd6df, 1.9, -0.51, 0.42),
    circle(0.095, 0.1, 0x8fd6df, 2.17, -0.51, 0.42));
  const buzzer = part('buzzer', circle(0.29, 0.23, 0x273b43, 0.75, 0.7, 0.33));
  buzzer.add(circle(0.08, 0.03, 0x111d23, 0.75, 0.7, 0.47));
  part('motor', block(0.55, 0.42, 0.23, 0x859da5, 0.79, -0.61, 0.32));
  const servo = part('servo', block(0.55, 0.35, 0.25, 0x1e4358, -0.65, 0.78, 0.3));
  const servoArm = block(0.48, 0.06, 0.045, 0xf0d0a0, -0.65, 0.78, 0.47);
  servo.add(servoArm);
  part('stepper', circle(0.24, 0.19, 0x6c7f87, 0.1, -0.73, 0.31));

  const brand = inscription('ARDUINO  /  FIELD LAB', 2.5, 0.25, 35);
  brand.position.set(0, 0.86, 0.235);
  root.add(brand);
  const silkscreen = inscription('3D CIRCUIT EXPLORER  ·  VIRTUAL TEST BOARD', 3.8, 0.18, 22);
  silkscreen.position.set(0.12, -0.99, 0.235);
  root.add(silkscreen);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 6;
  controls.maxDistance = 17;
  controls.maxPolarAngle = Math.PI * 0.78;
  controls.target.set(0, 0, 0);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let selectedPart = 'uno';
  let disposed = false;
  let frame = 0;

  function selectPart(id, notify = false) {
    if (!interactive.has(id)) return;
    selectedPart = id;
    for (const [partId, group] of interactive) {
      group.traverse((mesh) => {
        if (mesh.isMesh && mesh.material?.emissive && mesh !== ledMesh && mesh !== rgbMesh) {
          mesh.material.emissive.setHex(partId === id ? 0x324942 : 0x000000);
          mesh.material.emissiveIntensity = partId === id ? 0.35 : 0;
        }
      });
    }
    if (notify) onSelect(id);
  }

  function handlePointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const matches = raycaster.intersectObjects([...interactive.values()], true);
    const id = matches.find((hit) => hit.object.userData.partId)?.object.userData.partId;
    if (id) selectPart(id, true);
  }
  renderer.domElement.addEventListener('click', handlePointer);

  function setState(state) {
    const lit = Number(state.metrics.level ?? state.pins.D13 ?? 0);
    ledMaterial.emissiveIntensity = 0.03 + lit * 3.2;
    ledMaterial.color.setHex(lit ? 0x65ffd0 : 0x288b8b);
    if (Array.isArray(state.metrics.rgb)) {
      const [r, g, b] = state.metrics.rgb;
      rgbMaterial.color.setRGB(r / 255, g / 255, b / 255);
      rgbMaterial.emissive.copy(rgbMaterial.color);
      rgbMaterial.emissiveIntensity = 0.8;
    } else {
      rgbMaterial.color.setHex(0x45cbd5);
      rgbMaterial.emissive.setHex(0x45cbd5);
      rgbMaterial.emissiveIntensity = 0.08;
    }
    knobNotch.rotation.z = (Number(state.inputs.knob) - 0.5) * 2.2;
    servoArm.rotation.z = ((Number(state.metrics.servoAngle ?? 90) - 90) * Math.PI) / 180;
  }

  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  selectPart(selectedPart);

  function render() {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    controls.update();
    renderer.render(scene, camera);
  }
  render();

  return {
    element: renderer.domElement,
    selectPart,
    setState,
    turnLeft: () => { camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 10); controls.update(); },
    turnRight: () => { camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 10); controls.update(); },
    resetCamera: () => { camera.position.set(0.2, 2, 10.8); controls.target.set(0, 0, 0); controls.update(); },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('click', handlePointer);
      scene.traverse((object) => {
        object.geometry?.dispose?.();
        const mats = Array.isArray(object.material) ? object.material : [object.material];
        for (const mat of mats) {
          mat?.map?.dispose?.();
          mat?.dispose?.();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
