import * as T from "three";
import { type SceneContext } from "../core/context";

interface Particle {
  position: T.Vector3;
  velocity: T.Vector3;
  rotation: T.Euler;
  rotationSpeed: T.Vector3;
  life: number;
  maxLife: number;
  scale: number;
}

/** 樱花花瓣飘落系统 */
export function createFallingPetals(ctx: SceneContext) {
  const { world, U } = ctx;
  const group = new T.Group();
  group.name = "falling-petals";
  world.add(group);

  const petalGeometry = new T.PlaneGeometry(0.08, 0.05);
  const petalMaterial = new T.MeshStandardMaterial({
    color: "#f5c5d5",
    side: T.DoubleSide,
    transparent: true,
    opacity: 0.85,
    roughness: 0.9,
  });

  const particles: Particle[] = [];
  const meshes: T.Mesh[] = [];
  const maxPetals = 60;

  // 创建花瓣池
  for (let i = 0; i < maxPetals; i++) {
    const mesh = new T.Mesh(petalGeometry, petalMaterial.clone());
    mesh.castShadow = true;
    mesh.visible = false;
    group.add(mesh);
    meshes.push(mesh);
  }

  let spawnTimer = 0;
  const spawnInterval = 0.18; // 每0.18秒生成一片花瓣

  function spawnPetal() {
    const inactive = particles.findIndex((p) => p.life <= 0);
    const index = inactive >= 0 ? inactive : particles.length;
    if (index >= maxPetals) return;

    // 从樱花树位置生成 (-1.8, y, -0.7)
    const x = -1.8 + (Math.random() - 0.5) * 2.2;
    const y = 2.8 + Math.random() * 0.8;
    const z = -0.7 + (Math.random() - 0.5) * 2.0;

    const particle: Particle = {
      position: new T.Vector3(x, y, z),
      velocity: new T.Vector3(
        (Math.random() - 0.5) * 0.08,
        -0.12 - Math.random() * 0.05,
        (Math.random() - 0.5) * 0.08,
      ),
      rotation: new T.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      ),
      rotationSpeed: new T.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 2,
      ),
      life: 1,
      maxLife: 12 + Math.random() * 8,
      scale: 0.8 + Math.random() * 0.4,
    };

    if (inactive >= 0) {
      particles[inactive] = particle;
    } else {
      particles.push(particle);
    }
  }

  function update(delta: number) {
    spawnTimer += delta;
    if (spawnTimer >= spawnInterval) {
      spawnPetal();
      spawnTimer = 0;
    }

    const wind = Math.sin(U.uTime.value * 0.5) * 0.06;

    particles.forEach((particle, i) => {
      if (particle.life <= 0) {
        meshes[i].visible = false;
        return;
      }

      particle.life -= delta;

      // 风力影响
      particle.velocity.x += wind * delta * 2;
      particle.velocity.x *= 0.98; // 阻尼

      // 重力和飘动
      particle.velocity.y += Math.sin(U.uTime.value * 2 + i) * 0.002;
      particle.position.add(
        particle.velocity.clone().multiplyScalar(delta * 10),
      );

      // 旋转
      particle.rotation.x += particle.rotationSpeed.x * delta;
      particle.rotation.y += particle.rotationSpeed.y * delta;
      particle.rotation.z += particle.rotationSpeed.z * delta;

      // 更新mesh
      const mesh = meshes[i];
      mesh.visible = true;
      mesh.position.copy(particle.position);
      mesh.rotation.copy(particle.rotation);
      mesh.scale.setScalar(particle.scale);

      // 淡出效果
      const lifeRatio = particle.life / particle.maxLife;
      (mesh.material as T.MeshStandardMaterial).opacity = Math.min(
        0.85,
        lifeRatio * 2,
      );

      // 落地检测
      if (particle.position.y < 0.15) {
        particle.life = 0;
      }
    });
  }

  return { group, update };
}

/** 萤火虫光点系统 */
export function createFireflies(ctx: SceneContext) {
  const { world, U } = ctx;
  const group = new T.Group();
  group.name = "fireflies";
  world.add(group);

  const fireflyGeometry = new T.SphereGeometry(0.025, 8, 6);
  const fireflyMaterial = new T.MeshStandardMaterial({
    color: "#ffd580",
    emissive: "#ffb347",
    emissiveIntensity: 1.5,
    transparent: true,
    opacity: 0.9,
  });

  interface Firefly extends Particle {
    basePosition: T.Vector3;
    phase: number;
    pulseSpeed: number;
  }

  const fireflies: Firefly[] = [];
  const meshes: T.Mesh[] = [];
  const pointLights: T.PointLight[] = [];
  const maxFireflies = 35;

  // 萤火虫出现区域（花丛和树周围）
  const zones = [
    { x: -1.8, z: -0.7, radius: 1.5 }, // 樱花树
    { x: -3.5, z: 0.4, radius: 0.8 }, // 花床
    { x: -2.8, z: -1.6, radius: 0.8 },
    { x: 0.25, z: 2.1, radius: 0.8 },
    { x: 2.5, z: 1.9, radius: 0.8 },
  ];

  for (let i = 0; i < maxFireflies; i++) {
    const zone = zones[i % zones.length];
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * zone.radius;
    const baseX = zone.x + Math.cos(angle) * radius;
    const baseZ = zone.z + Math.sin(angle) * radius;
    const baseY = 0.3 + Math.random() * 1.2;

    const firefly: Firefly = {
      position: new T.Vector3(baseX, baseY, baseZ),
      basePosition: new T.Vector3(baseX, baseY, baseZ),
      velocity: new T.Vector3(0, 0, 0),
      rotation: new T.Euler(0, 0, 0),
      rotationSpeed: new T.Vector3(0, 0, 0),
      life: 1,
      maxLife: 1,
      scale: 1,
      phase: Math.random() * Math.PI * 2,
      pulseSpeed: 2 + Math.random() * 1.5,
    };

    fireflies.push(firefly);

    const mesh = new T.Mesh(fireflyGeometry, fireflyMaterial.clone());
    mesh.position.copy(firefly.position);
    group.add(mesh);
    meshes.push(mesh);

    // 为每个萤火虫添加点光源
    const light = new T.PointLight("#ffb347", 0.3, 0.5);
    light.position.copy(firefly.position);
    group.add(light);
    pointLights.push(light);
  }

  function update(_delta: number) {
    const time = U.uTime.value;
    const nightBlend = U.uNight.value; // 夜间才显示

    fireflies.forEach((firefly, i) => {
      // 漫游运动
      const wanderX = Math.sin(time * 0.3 + firefly.phase) * 0.15;
      const wanderY = Math.sin(time * 0.5 + firefly.phase * 1.3) * 0.2;
      const wanderZ = Math.cos(time * 0.35 + firefly.phase) * 0.15;

      firefly.position.set(
        firefly.basePosition.x + wanderX,
        firefly.basePosition.y + wanderY,
        firefly.basePosition.z + wanderZ,
      );

      // 呼吸闪烁
      const pulse =
        0.5 + 0.5 * Math.sin(time * firefly.pulseSpeed + firefly.phase);
      const brightness = pulse * nightBlend * U.uFirefly.value;

      // 更新mesh
      meshes[i].position.copy(firefly.position);
      meshes[i].visible = nightBlend > 0.1;
      (meshes[i].material as T.MeshStandardMaterial).emissiveIntensity =
        brightness * 2;
      (meshes[i].material as T.MeshStandardMaterial).opacity =
        0.6 + brightness * 0.4;

      // 更新光源
      pointLights[i].position.copy(firefly.position);
      pointLights[i].intensity = brightness * 0.4;
      pointLights[i].visible = nightBlend > 0.1;
    });
  }

  return { group, update };
}

/** 情书飞舞系统 */
export function createLoveLetters(ctx: SceneContext) {
  const { world } = ctx;
  const group = new T.Group();
  group.name = "love-letters";
  world.add(group);

  // 信封几何体
  const envelopeGeometry = new T.PlaneGeometry(0.12, 0.08);
  const envelopeMaterial = new T.MeshStandardMaterial({
    color: "#fff5e8",
    side: T.DoubleSide,
    roughness: 0.7,
  });

  // 心形邮票（用小方块模拟）
  const stampGeometry = new T.PlaneGeometry(0.025, 0.025);
  const stampMaterial = new T.MeshStandardMaterial({
    color: "#e88b9a",
    side: T.DoubleSide,
    roughness: 0.6,
  });

  interface Letter extends Particle {
    targetHeight: number;
    spiralPhase: number;
    spiralRadius: number;
  }

  const letters: Letter[] = [];
  const meshes: T.Group[] = [];
  const maxLetters = 15;

  let spawnTimer = 0;
  const spawnInterval = 2.5; // 每2.5秒一封信

  for (let i = 0; i < maxLetters; i++) {
    const letterGroup = new T.Group();
    group.add(letterGroup);

    const envelope = new T.Mesh(envelopeGeometry, envelopeMaterial.clone());
    letterGroup.add(envelope);

    // 添加邮票
    const stamp = new T.Mesh(stampGeometry, stampMaterial.clone());
    stamp.position.set(0.035, 0.025, 0.001);
    letterGroup.add(stamp);

    letterGroup.visible = false;
    meshes.push(letterGroup);
  }

  function spawnLetter() {
    const inactive = letters.findIndex((l) => l.life <= 0);
    const index = inactive >= 0 ? inactive : letters.length;
    if (index >= maxLetters) return;

    // 从邮局门口发射 (1.85, 0.6, 0.8)
    const letter: Letter = {
      position: new T.Vector3(1.85, 0.6, 0.8),
      velocity: new T.Vector3(
        -0.15 + (Math.random() - 0.5) * 0.1,
        0.25 + Math.random() * 0.1,
        (Math.random() - 0.5) * 0.15,
      ),
      rotation: new T.Euler(
        Math.random() * 0.5,
        Math.random() * Math.PI * 2,
        Math.random() * 0.5,
      ),
      rotationSpeed: new T.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 1.5,
      ),
      life: 1,
      maxLife: 15 + Math.random() * 5,
      scale: 1,
      targetHeight: 2.5 + Math.random() * 1.5,
      spiralPhase: Math.random() * Math.PI * 2,
      spiralRadius: 0.8 + Math.random() * 0.6,
    };

    if (inactive >= 0) {
      letters[inactive] = letter;
    } else {
      letters.push(letter);
    }
  }

  function update(delta: number) {
    spawnTimer += delta;
    if (spawnTimer >= spawnInterval) {
      spawnLetter();
      spawnTimer = 0;
    }

    letters.forEach((letter, i) => {
      if (letter.life <= 0) {
        meshes[i].visible = false;
        return;
      }

      letter.life -= delta;
      const lifeRatio = letter.life / letter.maxLife;

      // 螺旋上升运动
      letter.spiralPhase += delta * 0.8;

      letter.velocity.x =
        Math.cos(letter.spiralPhase) * letter.spiralRadius * 0.12;
      letter.velocity.z =
        Math.sin(letter.spiralPhase) * letter.spiralRadius * 0.12;

      // 先上升后缓慢下降
      if (letter.position.y < letter.targetHeight) {
        letter.velocity.y = 0.18;
      } else {
        letter.velocity.y = -0.05;
      }

      letter.position.add(letter.velocity.clone().multiplyScalar(delta * 10));

      // 旋转
      letter.rotation.x += letter.rotationSpeed.x * delta;
      letter.rotation.y += letter.rotationSpeed.y * delta;
      letter.rotation.z += letter.rotationSpeed.z * delta;

      // 更新mesh
      const mesh = meshes[i];
      mesh.visible = true;
      mesh.position.copy(letter.position);
      mesh.rotation.copy(letter.rotation);

      // 淡入淡出
      const opacity = lifeRatio < 0.2 ? lifeRatio * 5 : lifeRatio > 0.8 ? 1 : 1;
      mesh.children.forEach((child) => {
        if (child instanceof T.Mesh) {
          (child.material as T.MeshStandardMaterial).opacity = opacity;
          (child.material as T.MeshStandardMaterial).transparent = true;
        }
      });

      // 超出范围消失
      if (letter.position.y < 0.2 || letter.position.y > 5) {
        letter.life = 0;
      }
    });
  }

  return { group, update };
}

/** 浪漫元素管理器 */
export function createRomanticElements(ctx: SceneContext) {
  const petals = createFallingPetals(ctx);
  const fireflies = createFireflies(ctx);
  const letters = createLoveLetters(ctx);

  function update(delta: number) {
    petals.update(delta);
    fireflies.update(delta);
    letters.update(delta);
  }

  return { update };
}
