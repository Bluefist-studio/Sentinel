window.SentinelWaveControl = (function () {
  const MOB_INTERVAL_KEYS = ["grunts", "slingers", "brutes", "kamikazes", "bossMinors", "bosses"];

  function normalizeMobIntervals(intervals) {
    if (!intervals || typeof intervals !== "object") return null;
    const normalized = {};
    for (const key of MOB_INTERVAL_KEYS) {
      const raw = intervals[key];
      if (raw === undefined || raw === null) continue;
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        normalized[key] = parsed;
      }
    }
    return Object.keys(normalized).length ? normalized : null;
  }

  function getMobIntervalFor(key, baseInterval) {
    const custom = window._customMobBurstIntervals;
    if (custom && typeof custom === "object") {
      const value = Number(custom[key]);
      if (Number.isFinite(value) && value > 0) return value;
    }
    return baseInterval;
  }

  function ensureMobElapsedState(wave) {
    if (!window._mobBurstElapsed || window._mobBurstElapsedWave !== wave) {
      window._mobBurstElapsedWave = wave;
      window._mobBurstElapsed = {
        grunts: 0,
        slingers: 0,
        brutes: 0,
        kamikazes: 0,
        bossMinors: 0,
        bosses: 0
      };
    }
    return window._mobBurstElapsed;
  }

  function canSpawnByMobInterval(elapsedState, key, interval) {
    if (!elapsedState || !key || !Number.isFinite(interval) || interval <= 0) return true;
    if ((elapsedState[key] || 0) < interval) return false;
    elapsedState[key] -= interval;
    return true;
  }

  // Paste future editor code strings into these wave slots (16-25).
  const DEFAULT_WAVE_EDITOR_CODES = {
    16: "SWC1:eyJ2ZXJzaW9uIjoyLCJvdmVycmlkZXMiOnsiMTYiOnsiYnVyc3RDb3VudCI6MzAsImJ1cnN0SW50ZXJ2YWxTZWNvbmRzIjoxLCJjdXN0b21CdXJzdHMiOlsyLDIsMiwyLDIsMiwyLDIsMiwyLDIsMiwyLDIsMl0sImN1c3RvbVNsaW5nZXJzIjpbMiwyLDIsMiwyLDIsMiwyLDIsMiwyLDIsMiwyLDJdLCJjdXN0b21LYW1pa2F6ZXMiOlsxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMV0sImN1c3RvbUJvc3NNaW5vcnMiOlsxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMV0sIm1vYkludGVydmFsc1NlY29uZHMiOnsiZ3J1bnRzIjowLjUsInNsaW5nZXJzIjozLCJrYW1pa2F6ZXMiOjMsImJvc3NNaW5vcnMiOjh9fX19",
    17: "SWC1:eyJ2ZXJzaW9uIjoyLCJvdmVycmlkZXMiOnsiMTIiOnsiYnVyc3RDb3VudCI6MTUsImJ1cnN0SW50ZXJ2YWxTZWNvbmRzIjoyLjUsImN1c3RvbVNsaW5nZXJzIjpbMCwyLDAsMSwwLDAsMiwwLDEsMCwwLDIsMCwyLDBdLCJjdXN0b21LYW1pa2F6ZXMiOlswLDAsMCwxLDAsMiwwLDEsMCwxLDAsMiwwLDEsMl0sImN1c3RvbUJvc3NNaW5vcnMiOlsyLDAsMSwwLDEsMSwwLDEsMCwxLDEsMSwwLDEsMF19LCIxNyI6eyJidXJzdENvdW50IjozMCwiYnVyc3RJbnRlcnZhbFNlY29uZHMiOjEsImN1c3RvbUJ1cnN0cyI6WzIsMiwyLDIsMiwyLDIsMiwyLDIsMiwyLDIsMiwyLDIsMiwyLDIsMiwyLDIsMiwyLDIsMiwyLDIsMiwyXSwiY3VzdG9tQnJ1dGVzIjpbMSwwLDEsMCwyLDEsMF0sImN1c3RvbUthbWlrYXplcyI6WzEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxXX19fQ==",
    18: null,
    19: null,
    20: null,
    21: null,
    22: null,
    23: null,
    24: null,
    25: null
  };

  if (!window.SentinelWaveEditorCodes || typeof window.SentinelWaveEditorCodes !== "object") {
    window.SentinelWaveEditorCodes = { ...DEFAULT_WAVE_EDITOR_CODES };
  } else {
    for (let waveNumber = 16; waveNumber <= 25; waveNumber++) {
      if (!(waveNumber in window.SentinelWaveEditorCodes)) {
        window.SentinelWaveEditorCodes[waveNumber] = DEFAULT_WAVE_EDITOR_CODES[waveNumber] || null;
      }
    }
  }

  function getEditorWaveCode(waveNumber) {
    if (window.SentinelWaveEditorCodes && typeof window.SentinelWaveEditorCodes[waveNumber] === "string") {
      return window.SentinelWaveEditorCodes[waveNumber];
    }
    return null;
  }

  function getCodeWaveFallbackPreset(waveNumber) {
    const index = Math.max(0, waveNumber - 16);
    const burstCount = Math.min(14, 6 + index);
    const burstInterval = Math.max(220, 460 - (index * 24));
    const makeRamp = (base, growth, min, max) =>
      Array.from({ length: burstCount }, (_, i) => Math.max(min, Math.min(max, base + Math.floor(i * growth))));

    return {
      burstCount,
      burstInterval,
      customBursts: makeRamp(2 + Math.floor(index * 0.4), 0.35, 1, 8),
      customBrutes: makeRamp(Math.floor(index * 0.15), 0.2, 0, 4),
      customSlingers: makeRamp(Math.floor(index * 0.2), 0.2, 0, 4),
      customKamikazes: makeRamp(Math.floor(index * 0.25), 0.25, 0, 5),
      customBossMinors: makeRamp(index >= 2 ? 1 : 0, 0.08, 0, 2),
      customBosses: makeRamp(index >= 6 ? 1 : 0, 0.04, 0, 1)
    };
  }

  function applyCodeWaveConfig(ctx, config) {
    ctx.setBurstCount(config.burstCount);
    ctx.setBurstInterval(config.burstInterval);
    window._customBursts = Array.isArray(config.customBursts) ? config.customBursts.slice() : null;
    window._customBrutes = Array.isArray(config.customBrutes) ? config.customBrutes.slice() : null;
    window._customSlingers = Array.isArray(config.customSlingers) ? config.customSlingers.slice() : null;
    window._customKamikazes = Array.isArray(config.customKamikazes) ? config.customKamikazes.slice() : null;
    window._customBossMinors = Array.isArray(config.customBossMinors) ? config.customBossMinors.slice() : null;
    window._customBosses = Array.isArray(config.customBosses) ? config.customBosses.slice() : null;
    window._customMobBurstIntervals = normalizeMobIntervals(config.mobIntervals);
  }

  function configureCodeWave(ctx, waveNumber) {
    let config = null;
    const waveCode = getEditorWaveCode(waveNumber);

    if (waveCode && window.SentinelEditor && typeof window.SentinelEditor.getWaveConfigFromCode === "function") {
      try {
        config = window.SentinelEditor.getWaveConfigFromCode(waveCode, waveNumber);
      } catch (_) {}
    }

    if (!config) {
      config = getCodeWaveFallbackPreset(waveNumber);
    }

    applyCodeWaveConfig(ctx, config);
  }

  function randomEdgeSpawn(width = 1024, height = 768, pad = 30) {
    const side = Math.floor(Math.random() * 4);
    if (side === 0) return { x: -pad, y: Math.random() * height };
    if (side === 1) return { x: width + pad, y: Math.random() * height };
    if (side === 2) return { x: Math.random() * width, y: -pad };
    return { x: Math.random() * width, y: height + pad };
  }

  function spawnGruntBoss(ctx) {
    const enemies = ctx.getEnemies();
    const wave = ctx.getWave();
    const gruntImg = ctx.getGruntSprite();

    let gruntSpawnTimer = 0;
    let gruntSpawnInterval = 420;
    let gruntSpawnCount = 1 + Math.floor(Math.random() * 2);
    const { x, y } = randomEdgeSpawn();
    let radius = 26, collisionRadius = 30, speed = 0.4, health = 300, damage = 1, attackRange = 20, color = "magenta";
    const spinAngle = Math.random() * Math.PI * 2;
    const spinSpeed = (Math.random() - 0.5) * 0.02;

    const enemy = ctx.spawnEnemy();
    enemy.x = x;
    enemy.y = y;
    enemy.radius = radius;
    enemy.collisionRadius = collisionRadius;
    enemy.speed = speed;
    enemy.health = health;
    enemy.damage = damage;
    enemy.attackCooldown = 0;
    enemy.attackRange = attackRange;
    enemy.color = color;
    enemy.type = "gruntBoss";
    enemy.spinAngle = spinAngle;
    enemy.spinSpeed = spinSpeed;
    enemy.sprite = gruntImg;
    enemy.projectileCooldown = 0;
    enemy.projectileInterval = 120;
    enemy.projectileRadius = 22;
    enemy.burstMode = false;
    enemy.burstShotsLeft = 0;
    enemy.burstTimer = 0;
    ctx.applyWaveEnemyModifiers(enemy);

    enemies[enemies.length - 1].gruntSpawnTimer = gruntSpawnTimer;
    enemies[enemies.length - 1].gruntSpawnInterval = gruntSpawnInterval;
    enemies[enemies.length - 1].gruntSpawnCount = gruntSpawnCount;
  }

  function spawnGruntBossMinor(ctx) {
    const enemies = ctx.getEnemies();
    const wave = ctx.getWave();
    const gruntImg = ctx.getGruntSprite();

    let gruntSpawnTimer = 0;
    let gruntSpawnInterval = 420;
    let gruntSpawnCount = 1 + Math.floor(Math.random() * 2);
    const { x, y } = randomEdgeSpawn();
    let radius = 22, collisionRadius = 24, speed = 0.32, health = 150 + (wave * 1.5), damage = 1, attackRange = 20, color = "magenta";
    const spinAngle = Math.random() * Math.PI * 2;
    const spinSpeed = (Math.random() - 0.5) * 0.02;

    const enemy = ctx.spawnEnemy();
    enemy.x = x;
    enemy.y = y;
    enemy.radius = radius;
    enemy.collisionRadius = collisionRadius;
    enemy.speed = speed;
    enemy.health = health;
    enemy.damage = damage;
    enemy.attackCooldown = 0;
    enemy.attackRange = attackRange;
    enemy.color = color;
    enemy.type = "gruntBossMinor";
    enemy.spinAngle = spinAngle;
    enemy.spinSpeed = spinSpeed;
    enemy.sprite = gruntImg;
    ctx.applyWaveEnemyModifiers(enemy);

    enemies[enemies.length - 1].gruntSpawnTimer = gruntSpawnTimer;
    enemies[enemies.length - 1].gruntSpawnInterval = gruntSpawnInterval;
    enemies[enemies.length - 1].gruntSpawnCount = gruntSpawnCount;
  }

  function spawnBurst(ctx, count) {
    const enemies = ctx.getEnemies();
    const wave = ctx.getWave();

    for (let i = 0; i < count; i++) {
      const { x, y } = randomEdgeSpawn();
      let radius = 14, collisionRadius = 16, speed = 1.5, health = 6 + (wave * 1.3), damage = 1, attackRange = 20, color = "magenta";
      const spinAngle = Math.random() * Math.PI * 2;
      const spinSpeed = (Math.random() - 0.5) * 0.02;
      const enemy = ctx.spawnEnemy();
      enemy.x = x;
      enemy.y = y;
      enemy.radius = radius;
      enemy.collisionRadius = collisionRadius;
      enemy.speed = speed;
      enemy.health = health;
      enemy.damage = damage;
      enemy.attackCooldown = 0;
      enemy.attackRange = attackRange;
      enemy.color = color;
      enemy.type = "grunt";
      enemy.spinAngle = spinAngle;
      enemy.spinSpeed = spinSpeed;
      ctx.applyWaveEnemyModifiers(enemy);
    }
  }

  function spawnKamikazeBurst(ctx, count) {
    const enemies = ctx.getEnemies();
    const wave = ctx.getWave();

    for (let i = 0; i < count; i++) {
      const { x, y } = randomEdgeSpawn();
      let radius = 16, collisionRadius = 18, speed = 2, color = "#ff4444", damage = 3, health = 12 + (wave * 1.2);
      const enemy = ctx.spawnEnemy();
      enemy.x = x;
      enemy.y = y;
      enemy.radius = radius;
      enemy.collisionRadius = collisionRadius;
      enemy.speed = speed;
      enemy.color = color;
      enemy.damage = damage;
      enemy.health = health;
      enemy.type = "kamikaze";
      enemy.timer = 60;
      enemy.exploded = false;
      enemy.minesPlaced = 0;
      enemy.mineInterval = 60;
      enemy.nextMineTime = 60;
      ctx.applyWaveEnemyModifiers(enemy);
    }
  }

  function spawnSlingerBurst(ctx, count) {
    const enemies = ctx.getEnemies();
    const wave = ctx.getWave();
    const slingerImg = ctx.getSlingerSprite();

    for (let i = 0; i < count; i++) {
      const { x, y } = randomEdgeSpawn();
      let radius = 18, collisionRadius = 20, speed = 0.8, health = 18 + (wave * 1.5), damage = 1, attackRange = 240, color = "orange";
      const spinAngle = Math.random() * Math.PI * 2;
      const spinSpeed = (Math.random() - 0.5) * 0.02;
      const enemy = ctx.spawnEnemy();
      enemy.x = x;
      enemy.y = y;
      enemy.radius = radius;
      enemy.collisionRadius = collisionRadius;
      enemy.speed = speed;
      enemy.health = health;
      enemy.damage = damage;
      enemy.attackCooldown = 0;
      enemy.attackRange = attackRange;
      enemy.color = color;
      enemy.type = "slinger";
      enemy.spinAngle = spinAngle;
      enemy.spinSpeed = spinSpeed;
      enemy.sprite = slingerImg;
      ctx.applyWaveEnemyModifiers(enemy);
    }
  }

  function spawnBruteBurst(ctx, count) {
    const enemies = ctx.getEnemies();
    const wave = ctx.getWave();

    for (let i = 0; i < count; i++) {
      const { x, y } = randomEdgeSpawn();
      let radius = 24, collisionRadius = 26, speed = 0.62, health = 300 + (wave * 1.8), damage = 2, attackRange = 28, color = "#ff7a00";
      const enemy = ctx.spawnEnemy();
      enemy.x = x;
      enemy.y = y;
      enemy.radius = radius;
      enemy.collisionRadius = collisionRadius;
      enemy.speed = speed;
      enemy.health = health;
      enemy.damage = damage;
      enemy.attackCooldown = 0;
      enemy.attackRange = attackRange;
      enemy.color = color;
      enemy.type = "brute";
      enemy.novaRadius = radius + 20;
      enemy.novaState = "minPause";
      enemy.novaCooldown = 120;
      enemy.novaCue = false;
      ctx.applyWaveEnemyModifiers(enemy);
    }
  }

  function spawnBossMinorBurst(ctx, count) {
    for (let i = 0; i < count; i++) {
      spawnGruntBossMinor(ctx);
    }
  }

  function spawnBossBurst(ctx, count) {
    for (let i = 0; i < count; i++) {
      spawnGruntBoss(ctx);
    }
  }

  function spawnWave(ctx) {
    if (!ctx) return;

    const wave = ctx.getWave();
    ctx.setWaveAnnouncementTimer();
    window._editorPreviewOverride = null;
    window._editorPreviewWave = null;
    window._customBursts = null;
    window._customBrutes = null;
    window._customSlingers = null;
    window._customKamikazes = null;
    window._customBossMinors = null;
    window._customBosses = null;
    window._customMobBurstIntervals = null;
    window._bossMinorBursts = null;
    window._mobBurstElapsed = null;
    window._mobBurstElapsedWave = null;

    if (wave !== 10) {
      window._wave10MinorsSpawned = false;
    }

    if (wave === 1) {
      ctx.setBurstCount(5);
      ctx.setBurstInterval(330);
      window._customBursts = [1, 2, 3, 4, 5];
      window._customBrutes = null;
    } else if (wave === 2) {
      ctx.setBurstCount(5);
      ctx.setBurstInterval(240);
      window._customBursts = Array.from({ length: 5 }, () => 2 + Math.floor(Math.random() * 3));
      window._customBrutes = null;
    } else if (wave === 3) {
      ctx.setBurstCount(5);
      ctx.setBurstInterval(240);
      window._customBursts = Array.from({ length: 5 }, () => 3 + Math.floor(Math.random() * 3));
      window._customBrutes = null;
    } else if (wave === 4) {
      ctx.setBurstCount(5);
      ctx.setBurstInterval(240);
      window._customBursts = [3, 3, 4, 4, 5, 7].slice(0, 5);
      window._customBrutes = null;
    } else if (wave === 5) {
      ctx.setBurstCount(Infinity);
      ctx.setBurstInterval(400);
      window._customBursts = null;
      window._customBrutes = null;
      spawnGruntBoss(ctx);
    } else if (wave === 6) {
      ctx.setBurstCount(6);
      ctx.setBurstInterval(150);
      window._customBursts = null;
      window._customBrutes = null;
      window._customSlingers = [1, 0, 0, 1, 0, 1];
    } else if (wave === 7) {
      ctx.setBurstCount(7);
      ctx.setBurstInterval(300);
      window._customBursts = null;
      window._customBrutes = null;
      window._customSlingers = [2, 0, 0, 2, 0, 3, 0];
    } else if (wave === 8) {
      ctx.setBurstCount(7);
      ctx.setBurstInterval(300);
      window._customBursts = null;
      window._customBrutes = null;
      window._customSlingers = [3, 0, 0, 2, 0, 3, 0];
      spawnGruntBossMinor(ctx);
    } else if (wave === 9) {
      ctx.setBurstCount(8);
      ctx.setBurstInterval(300);
      window._customBursts = null;
      window._customBrutes = null;
      window._customSlingers = [2, 1, 1, 1, 2, 1, 1, 2];
      spawnGruntBossMinor(ctx);
      setTimeout(() => spawnGruntBossMinor(ctx), 10000);
    } else if (wave === 10) {
      ctx.setBurstCount(3);
      ctx.setBurstInterval(300);
      window._customBursts = null;
      window._customBrutes = null;
      window._customSlingers = null;
      window._bossMinorBursts = null;
      const activeWave10Minors = ctx.getEnemies().filter(en => en.type === "gruntBossMinor" && en.health > 0).length;
      if (!window._wave10MinorsSpawned || activeWave10Minors === 0) {
        spawnBossMinorBurst(ctx, 3);
        window._wave10MinorsSpawned = true;
      }
    } else if (wave === 11) {
      ctx.setBurstCount(15);
      ctx.setBurstInterval(250);
      window._customBursts = null;
      window._customBrutes = null;
      window._customSlingers = null;
      window._customKamikazes = [1, 1, 2, 2, 3, 3, 1, 2, 3, 4, 4, 2, 3, 4, 5];
    } else if (wave === 12) {
      ctx.setBurstCount(15);
      ctx.setBurstInterval(300);
      window._customBrutes = null;
      window._customSlingers = [0, 2, 0, 1, 0, 0, 2, 0, 1, 0, 0, 2, 0, 2, 0];
      window._customKamikazes = [0, 0, 0, 1, 0, 2, 0, 1, 0, 1, 0, 2, 0, 1, 2];
      window._customBossMinors = [2, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0];
    } else if (wave === 13) {
      ctx.setBurstCount(15);
      ctx.setBurstInterval(300);
      window._customBursts = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      window._customBrutes = null;
      window._customSlingers = [0, 2, 0, 1, 0, 0, 2, 0, 1, 0, 0, 2, 0, 2, 0];
      window._customKamikazes = [3,3,3,3,2,1,0,1,0,1,0,3,3,3,3];
      window._customBossMinors = [2, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0];
    } else if (wave === 14) {
      ctx.setBurstCount(15);
      ctx.setBurstInterval(300);
      window._customBursts = [4, 3, 4, 5, 4, 3, 4, 5, 6, 6, 6, 6, 4, 3, 2];
      window._customBrutes = null;
      window._customSlingers = [3,1,1,1,1,1,1,1,1,1,2,2,1,1,1];
      window._customKamikazes = [0,0,0,0,0,0,0,0,0,3,3,3,0,0,0];
      window._customBossMinors = [0,0,1,0,1,0,1,1,1,0,0,0,0,0,0];
    } else if (wave === 15) {
      ctx.setBurstCount(30);
      ctx.setBurstInterval(120);
      window._customBursts = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];
      window._customBrutes = null;
      window._customSlingers = [0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0];
      window._customKamikazes = [0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1];
      window._customBossMinors = [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0,0,0];
    } else if (wave >= 16 && wave <= 25) {
      configureCodeWave(ctx, wave);
    } else {
      ctx.setBurstCount(0);
      ctx.setBurstInterval(300);
      window._customBrutes = null;
    }

    if ((wave === 1 || wave === 2 || wave === 3 || wave === 4) && !Array.isArray(window._customBursts)) {
      window._customBursts = [2, 3, 4, 5];
    }

    ctx.resetBurstProgress();
    window._bossMinorCount = 0;
  }

  function handleWaveSpawning(ctx, delta) {
    if (!ctx) return;

    let wave = ctx.getWave();
    let burstCount = ctx.getBurstCount();
    const burstInterval = ctx.getBurstInterval();
    let burstIndex = ctx.getBurstIndex();
    let burstTimer = ctx.getBurstTimer();
    const enemies = ctx.getEnemies();
    const SPEED_MULTIPLIER = ctx.getSpeedMultiplier();
    const elapsedState = ensureMobElapsedState(wave);
    const elapsedDelta = delta * SPEED_MULTIPLIER;
    for (const key of MOB_INTERVAL_KEYS) {
      elapsedState[key] += elapsedDelta;
    }

    const commit = () => {
      ctx.setBurstCount(burstCount);
      ctx.setBurstIndex(burstIndex);
      ctx.setBurstTimer(burstTimer);
    };

    const getBurstValue = (list, index) => {
      if (!Array.isArray(list) || list.length === 0) return 0;
      if (index < list.length) return list[index] || 0;
      return list[list.length - 1] || 0;
    };

    const previewOverride = (window._editorPreviewOverride && window._editorPreviewWave === wave)
      ? window._editorPreviewOverride
      : null;

    if (previewOverride) {
      burstTimer += delta * SPEED_MULTIPLIER;
      if (burstTimer >= burstInterval) {
        burstTimer = 0;

        const getValue = (list, index) => {
          if (!Array.isArray(list) || list.length === 0) return 0;
          if (index < list.length) return list[index] || 0;
          return list[list.length - 1] || 0;
        };

        const grunts = getValue(previewOverride.customBursts, burstIndex);
        const brutes = getValue(previewOverride.customBrutes, burstIndex);
        const slingers = getValue(previewOverride.customSlingers, burstIndex);
        const kamikazes = getValue(previewOverride.customKamikazes, burstIndex);
        const bossMinors = getValue(previewOverride.customBossMinors, burstIndex);
        const bosses = getValue(previewOverride.customBosses, burstIndex);

        if (grunts > 0 && canSpawnByMobInterval(elapsedState, "grunts", getMobIntervalFor("grunts", burstInterval))) spawnBurst(ctx, grunts);
        if (brutes > 0 && canSpawnByMobInterval(elapsedState, "brutes", getMobIntervalFor("brutes", burstInterval))) spawnBruteBurst(ctx, brutes);
        if (slingers > 0 && canSpawnByMobInterval(elapsedState, "slingers", getMobIntervalFor("slingers", burstInterval))) spawnSlingerBurst(ctx, slingers);
        if (kamikazes > 0 && canSpawnByMobInterval(elapsedState, "kamikazes", getMobIntervalFor("kamikazes", burstInterval))) spawnKamikazeBurst(ctx, kamikazes);
        if (bossMinors > 0 && canSpawnByMobInterval(elapsedState, "bossMinors", getMobIntervalFor("bossMinors", burstInterval))) spawnBossMinorBurst(ctx, bossMinors);
        if (bosses > 0 && canSpawnByMobInterval(elapsedState, "bosses", getMobIntervalFor("bosses", burstInterval))) spawnBossBurst(ctx, bosses);

        if (window.sentinelDifficulty === "Apocalypse") {
          spawnKamikazeBurst(ctx, 1);
        }

        burstIndex++;
        if (burstCount !== Infinity && burstIndex >= burstCount) {
          window._editorPreviewOverride = null;
          window._editorPreviewWave = null;
        }
      }
      commit();
      return;
    }

    if ((wave >= 1 && wave <= 4 && burstIndex < burstCount) || (wave === 5) || (wave >= 6 && wave <= 10 && burstIndex < burstCount) || (wave >= 11 && wave <= 25 && burstIndex < burstCount)) {
      burstTimer += delta * SPEED_MULTIPLIER;
      if (burstTimer >= burstInterval) {
        burstTimer = 0;
        let grunts = 0;
        let brutes = 0;
        let slingers = 0;

        if (wave === 1 || wave === 2 || wave === 3 || wave === 4) {
          grunts = getBurstValue(window._customBursts, burstIndex);
        } else if (wave === 5) {
          grunts = 1 + Math.floor(Math.random() * 2);
        } else if (wave >= 6 && wave <= 9) {
          grunts = 2 + Math.floor(Math.random() * 3);
          slingers = getBurstValue(window._customSlingers, burstIndex);
          brutes = getBurstValue(window._customBrutes, burstIndex);
        }

        if (window.sentinelDifficulty === "Apocalypse" && !(wave >= 11 && wave <= 25)) {
          spawnKamikazeBurst(ctx, 1);
        }

        if (wave === 10) {
          const slingerCount = 2 + Math.floor(Math.random() * 3);
          spawnSlingerBurst(ctx, slingerCount);
          const gruntCount = 2 + Math.floor(Math.random() * 3);
          spawnBurst(ctx, gruntCount);
          const bruteCount = getBurstValue(window._customBrutes, burstIndex);
          if (bruteCount > 0) spawnBruteBurst(ctx, bruteCount);
        } else {
          if (slingers > 0 && canSpawnByMobInterval(elapsedState, "slingers", getMobIntervalFor("slingers", burstInterval))) spawnSlingerBurst(ctx, slingers);
          if (brutes > 0 && canSpawnByMobInterval(elapsedState, "brutes", getMobIntervalFor("brutes", burstInterval))) spawnBruteBurst(ctx, brutes);
        }

        if (wave === 11) {
          const wave11KamikazeCount = getBurstValue(window._customKamikazes, burstIndex);
          if (wave11KamikazeCount > 0 && canSpawnByMobInterval(elapsedState, "kamikazes", getMobIntervalFor("kamikazes", burstInterval))) spawnKamikazeBurst(ctx, wave11KamikazeCount);
        }

        if (wave === 12 || wave === 13 || wave === 14 || wave === 15 || (wave >= 16 && wave <= 25)) {
          grunts = getBurstValue(window._customBursts, burstIndex);
          const waveSlingerCount = getBurstValue(window._customSlingers, burstIndex);
          const waveBruteCount = getBurstValue(window._customBrutes, burstIndex);
          const waveKamikazeCount = getBurstValue(window._customKamikazes, burstIndex);
          if (waveSlingerCount > 0 && canSpawnByMobInterval(elapsedState, "slingers", getMobIntervalFor("slingers", burstInterval))) spawnSlingerBurst(ctx, waveSlingerCount);
          if (waveBruteCount > 0 && canSpawnByMobInterval(elapsedState, "brutes", getMobIntervalFor("brutes", burstInterval))) spawnBruteBurst(ctx, waveBruteCount);
          if (waveKamikazeCount > 0 && canSpawnByMobInterval(elapsedState, "kamikazes", getMobIntervalFor("kamikazes", burstInterval))) spawnKamikazeBurst(ctx, waveKamikazeCount);
        }

        const bossMinorCount = getBurstValue(window._customBossMinors, burstIndex);
        if (bossMinorCount > 0 && canSpawnByMobInterval(elapsedState, "bossMinors", getMobIntervalFor("bossMinors", burstInterval))) {
          for (let i = 0; i < bossMinorCount; i++) {
            spawnGruntBossMinor(ctx);
          }
        }
        const bossCount = getBurstValue(window._customBosses, burstIndex);
        if (bossCount > 0 && canSpawnByMobInterval(elapsedState, "bosses", getMobIntervalFor("bosses", burstInterval))) {
          for (let i = 0; i < bossCount; i++) {
            spawnGruntBoss(ctx);
          }
        }
        if (grunts > 0 && canSpawnByMobInterval(elapsedState, "grunts", getMobIntervalFor("grunts", burstInterval))) spawnBurst(ctx, grunts);

        burstIndex++;
      }
    }

    commit();
  }

  return {
    spawnWave,
    handleWaveSpawning,
    setMobBurstIntervals: (intervals) => {
      window._customMobBurstIntervals = normalizeMobIntervals(intervals);
      return !!window._customMobBurstIntervals;
    },
    clearMobBurstIntervals: () => {
      window._customMobBurstIntervals = null;
      window._mobBurstElapsed = null;
      window._mobBurstElapsedWave = null;
    },
    setWaveEditorCode: (waveNumber, code) => {
      const parsed = parseInt(waveNumber, 10);
      if (!Number.isFinite(parsed) || parsed < 16 || parsed > 25) return false;
      if (code !== null && typeof code !== "string") return false;
      window.SentinelWaveEditorCodes[parsed] = (typeof code === "string" && code.trim().length > 0) ? code.trim() : null;
      return true;
    },
    getWaveEditorCodes: () => ({ ...window.SentinelWaveEditorCodes })
  };
})();
