import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const cache = new Map();
let queue = Promise.resolve();
async function materialMaps(kind) {
  if (!["marble", "rock", "metal"].includes(kind))
    throw new Error("Unknown material");
  const loaded = [];
  try {
    for (const role of ["color", "normal", "arm"]) {
      const response = await fetch(
        new URL(
          "/materials/" + kind + "-" + role + ".webp",
          globalThis.location.href,
        ),
        { signal: AbortSignal.timeout(15000) },
      );
      if (!response.ok) throw new Error("Material map unavailable");
      const blob = await response.blob();
      if (blob.size > 1500000) throw new Error("Material map too large");
      const bitmap = await createImageBitmap(blob, {
        imageOrientation: "flipY",
        premultiplyAlpha: "none",
        colorSpaceConversion: "none",
      });
      const texture = new THREE.Texture(bitmap);
      texture.colorSpace =
        role === "color" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.needsUpdate = true;
      loaded.push(texture);
    }
    return {
      color: loaded[0],
      normal: loaded[1],
      arm: loaded[2],
      dispose() {
        loaded.forEach((texture) => {
          texture.dispose();
          texture.image.close();
        });
      },
    };
  } catch (error) {
    loaded.forEach((texture) => {
      texture.dispose();
      texture.image.close();
    });
    throw error;
  }
}

export function renderMaterialScene(rows, kind, dark, width, height, edges = "rounded") {
  const key = JSON.stringify([
    rows.map((r) => [r.id, r.value, r.color]),
    kind,
    dark,
    width,
    height,
    edges,
  ]);
  if (cache.has(key)) return cache.get(key);
  const promise = queue
    .catch(() => {})
    .then(() => render(rows, kind, dark, width, height, edges));
  queue = promise;
  cache.set(key, promise);
  promise.catch(() => cache.delete(key));
  if (cache.size > 12) cache.delete(cache.keys().next().value);
  return promise;
}
async function render(rows, kind, dark, width, height, edges) {
  const maps = await materialMaps(kind);
  const canvas =
    typeof document === "undefined"
      ? new OffscreenCanvas(Math.round(width * 2), Math.round(height * 2))
      : document.createElement("canvas");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
  } catch (error) {
    maps.dispose();
    throw error;
  }
  renderer.setSize(Math.round(width * 2), Math.round(height * 2), false);
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(dark ? "#101d2c" : "#ffffff");
  const aspect = width / height,
    worldWidth = 13.8,
    worldHeight = worldWidth / aspect;
  const camera = new THREE.OrthographicCamera(
    -worldWidth / 2,
    worldWidth / 2,
    worldHeight / 2,
    -worldHeight / 2,
    0.1,
    100,
  );
  const maxHeight = worldHeight * 0.67;
  camera.position.set(0, 8, 24);
  camera.lookAt(0, maxHeight * 0.5, 0);
  const pmrem = new THREE.PMREMGenerator(renderer),
    room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.8;
  const keyLight = new THREE.DirectionalLight("#fff5e8", 2.2);
  keyLight.position.set(-4, 9, 7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.radius = 4;
  keyLight.shadow.blurSamples = 8;
  Object.assign(keyLight.shadow.camera, {
    left: -9,
    right: 9,
    top: 10,
    bottom: -8,
    near: 0.5,
    far: 35,
  });
  keyLight.shadow.bias = -0.0003;
  keyLight.shadow.normalBias = 0.025;
  scene.add(keyLight);
  const fill = new THREE.DirectionalLight("#dbeaff", 1);
  fill.position.set(7, 5, -3);
  scene.add(fill);
  scene.add(new THREE.HemisphereLight("#ffffff", "#b0a8a0", 0.8));
  const floorMaterial = new THREE.ShadowMaterial({
    color: dark ? "#000000" : "#243343",
    opacity: dark ? 0.35 : 0.17,
  });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    floorMaterial,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const max = Math.max(...rows.map((row) => row.value), 1),
    slot = 11.6 / Math.max(rows.length, 1),
    blockWidth = Math.min(1.35, slot * 0.62);
  const objects = [],
    points = [];
  const project = (x, y, z) => {
    const p = new THREE.Vector3(x, y, z).project(camera);
    return { x: ((p.x + 1) * width) / 2, y: ((1 - p.y) * height) / 2 };
  };
  camera.updateMatrixWorld();
  try {
    rows.forEach((row, i) => {
      const h = (row.value / max) * maxHeight,
        x = -5.8 + slot * (i + 0.5);
      if (h > 0) {
        const geometry = edges === "sharp" ? new THREE.BoxGeometry(blockWidth, h, blockWidth * 0.72).toNonIndexed() : new RoundedBoxGeometry(
          blockWidth,
          h,
          blockWidth * 0.72,
          4,
          Math.min(0.12, blockWidth * 0.14, h / 6),
        );
        // Consistent texture density: taller polling bars must not stretch the
        // photographed grain/normal pattern. RoundedBoxGeometry is non-indexed.
        const uv = geometry.attributes.uv;
        for (const group of geometry.groups) {
          const horizontal =
            group.materialIndex === 2 || group.materialIndex === 3;
          const side = group.materialIndex === 0 || group.materialIndex === 1;
          for (
            let vertex = group.start;
            vertex < group.start + group.count;
            vertex++
          )
            uv.setXY(
              vertex,
              (uv.getX(vertex) * (side ? blockWidth * 0.72 : blockWidth)) / 2,
              (uv.getY(vertex) * (horizontal ? blockWidth * 0.72 : h)) / 2,
            );
        }
        const material = new THREE.MeshPhysicalMaterial({
          color: row.color,
          map: maps.color,
          normalMap: maps.normal,
          normalScale: new THREE.Vector2(
            kind === "rock" ? 0.65 : 0.3,
            kind === "rock" ? 0.65 : 0.3,
          ),
          roughnessMap: maps.arm,
          metalnessMap: maps.arm,
          aoMap: maps.arm,
          aoMapIntensity: 0.5,
          metalness: kind === "metal" ? 1 : 0,
          roughness: kind === "metal" ? 0.65 : kind === "marble" ? 0.45 : 1,
          clearcoat: kind === "marble" ? 0.8 : kind === "metal" ? 0.25 : 0,
          clearcoatRoughness: kind === "marble" ? 0.13 : 0.3,
          envMapIntensity: kind === "metal" ? 1.6 : 1,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, h / 2, 0);
        mesh.rotation.y = -0.25;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        objects.push(mesh);
      }
      points.push({
        id: row.id,
        top: project(x, h + 0.25, 0),
        base: project(x, -0.22, 0.1),
      });
    });
    renderer.render(scene, camera);
    // Bake once; the export embeds this exact image. No animation loop, extra
    // per-thumbnail WebGL context, third-party texture request, or screenshot renderer.
    const url = canvas.convertToBlob
      ? new FileReaderSync().readAsDataURL(
          await canvas.convertToBlob({ type: "image/png" }),
        )
      : canvas.toDataURL("image/png");
    return { url, points };
  } finally {
    objects.forEach((mesh) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    maps.dispose();
    floor.geometry.dispose();
    floorMaterial.dispose();
    environment.dispose();
    room.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }
}
