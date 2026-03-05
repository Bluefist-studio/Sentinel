window.SentinelWaveControl = (function () {
  const CODE_WAVE_MIN = 16;
  const CODE_WAVE_MAX = 50;
  const MOB_INTERVAL_KEYS = ["grunts", "slingers", "shielders", "beamers", "stalkers", "brutes", "kamikazes", "gruntbossminor", "gruntboss", "slingerboss", "bruteboss"];
  const MOB_INTERVAL_KEY_ALIASES = {
    bossMinors: "gruntbossminor",
    bosses: "gruntboss",
    gruntBossMinor: "gruntbossminor",
    gruntBoss: "gruntboss",
    slingerBoss: "slingerboss",
    bruteBoss: "bruteboss"
  };

  function resolveMobIntervalKey(key) {
    if (typeof key !== "string") return key;
    if (MOB_INTERVAL_KEYS.includes(key)) return key;
    if (MOB_INTERVAL_KEY_ALIASES[key]) return MOB_INTERVAL_KEY_ALIASES[key];
    const lower = key.toLowerCase();
    if (MOB_INTERVAL_KEYS.includes(lower)) return lower;
    return MOB_INTERVAL_KEY_ALIASES[lower] || key;
  }

  function normalizeMobIntervals(intervals) {
    if (!intervals || typeof intervals !== "object") return null;
    const normalized = {};
    for (const [inputKey, inputValue] of Object.entries(intervals)) {
      const key = resolveMobIntervalKey(inputKey);
      if (!MOB_INTERVAL_KEYS.includes(key)) continue;
      const raw = inputValue;
      if (raw === undefined || raw === null) continue;
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        normalized[key] = parsed;
      }
    }
    return Object.keys(normalized).length ? normalized : null;
  }

  function getMobIntervalFor(key, baseInterval) {
    const resolvedKey = resolveMobIntervalKey(key);
    const custom = window._customMobBurstIntervals;
    if (custom && typeof custom === "object") {
      const value = Number(custom[resolvedKey]);
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
        shielders: 0,
        beamers: 0,
        stalkers: 0,
        brutes: 0,
        kamikazes: 0,
        gruntbossminor: 0,
        gruntboss: 0,
        slingerboss: 0,
        bruteboss: 0
      };
    }
    return window._mobBurstElapsed;
  }

  function canSpawnByMobInterval(elapsedState, key, interval) {
    const resolvedKey = resolveMobIntervalKey(key);
    if (!elapsedState || !resolvedKey || !Number.isFinite(interval) || interval <= 0) return true;
    if ((elapsedState[resolvedKey] || 0) < interval) return false;
    elapsedState[resolvedKey] -= interval;
    return true;
  }

  // Paste future editor code strings into these wave slots (16-50).
  const DEFAULT_WAVE_EDITOR_CODES = {
    16: "SWC2:eyJ2IjoxLCJvIjp7IjE2Ijp7ImJjIjoxNiwiYmkiOjEsImciOnsiZiI6WzIsMiwyLDIsMywzLDMsMyw0LDMsNCwzLDIsMiwyLDJdfSwiYnIiOnsibiI6OCwicCI6W1swLDFdLFsyLDFdLFs0LDFdLFs2LDJdXX19fX0=",
    17: "SWC2:eyJ2IjoxLCJvIjp7IjE2Ijp7ImJjIjoxNiwiYmkiOjEsImciOnsiZiI6WzIsMiwyLDIsMywzLDMsMyw0LDMsNCwzLDIsMiwyLDJdfSwiYnIiOnsibiI6OCwicCI6W1swLDFdLFsyLDFdLFs0LDFdLFs2LDJdXX19LCIxNyI6eyJiYyI6MTYsImJpIjoxLCJnIjp7ImYiOlsyLDIsMiwyLDMsMywzLDMsNCwzLDQsMywyLDIsMiwyXX0sImJyIjp7Im4iOjgsInAiOltbMCwxXSxbMiwxXSxbNCwxXSxbNiwyXV19LCJibSI6eyJuIjoxMCwicCI6W1syLDFdLFs1LDFdLFs4LDFdXX19fX0=",
    18: "SWC2:eyJ2IjoxLCJvIjp7IjE3Ijp7ImJjIjoxNiwiYmkiOjEsImciOnsiZiI6WzIsMiwyLDIsMywzLDMsMyw0LDMsNCwzLDIsMiwyLDJdfSwiYnIiOnsibiI6OCwicCI6W1swLDFdLFsyLDFdLFs0LDFdLFs2LDJdXX0sImJtIjp7Im4iOjEwLCJwIjpbWzIsMV0sWzUsMV0sWzgsMV1dfX0sIjE4Ijp7ImJjIjoxNiwiYmkiOjEsImciOnsiZiI6WzIsMiwyLDIsMywzLDMsMyw0LDMsNCwzLDIsMiwyLDJdfSwiYnIiOnsibiI6OCwicCI6W1swLDFdLFsyLDFdLFs0LDFdLFs2LDJdXX0sImsiOnsiZiI6WzEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDFdfSwiYm0iOnsibiI6MTUsInAiOltbMiwxXSxbNywxXSxbMTIsMV1dfX19fQ==",
    19: "SWC2:eyJ2IjoxLCJvIjp7IjE3Ijp7ImJjIjoxNiwiYmkiOjEsImciOnsiZiI6WzIsMiwyLDIsMywzLDMsMyw0LDMsNCwzLDIsMiwyLDJdfSwiYnIiOnsibiI6OCwicCI6W1swLDFdLFsyLDFdLFs0LDFdLFs2LDJdXX0sImJtIjp7Im4iOjEwLCJwIjpbWzIsMV0sWzUsMV0sWzgsMV1dfX0sIjE4Ijp7ImJjIjoxNiwiYmkiOjEsImciOnsiZiI6WzIsMiwyLDIsMywzLDMsMyw0LDMsNCwzLDIsMiwyLDJdfSwiYnIiOnsibiI6OCwicCI6W1swLDFdLFsyLDFdLFs0LDFdLFs2LDJdXX0sImsiOnsiZiI6WzEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDFdfSwiYm0iOnsibiI6MTUsInAiOltbMiwxXSxbNywxXSxbMTIsMV1dfX0sIjE5Ijp7ImJjIjoxNiwiYmkiOjEsImciOnsiZiI6WzIsMiwyLDIsMywzLDMsMywyLDMsMiwzLDIsMiwyLDJdfSwiYnIiOnsibiI6OCwicCI6W1swLDFdLFsyLDFdLFs0LDFdLFs2LDJdXX0sInNsIjp7Im4iOjE1LCJwIjpbWzAsMV0sWzIsMV0sWzUsMV0sWzcsMV0sWzEwLDFdLFsxMiwxXV19LCJrIjp7Im4iOjE1LCJwIjpbWzIsMV0sWzcsMV0sWzEyLDFdXX0sImJtIjp7Im4iOjE1LCJwIjpbWzIsMV0sWzcsMV0sWzEyLDFdXX19fX0=",
    20: null, //Brute boss wave - no preset, must be configured in editor
    21: "SWC2:eyJ2IjoxLCJvIjp7IjIyIjp7ImJjIjo2LCJiaSI6NCwiYmUiOnsiZiI6WzIsMiwyLDIsMiwyXX0sImJtIjp7ImYiOlsxLDEsMSwxLDEsMV19fX19",
    22: null,
    23: null,
    24: null,
    25: null,
    26: null,
    27: null,
    28: null,
    29: null,
    30: null,
    31: null,
    32: null,
    33: null,
    34: null,
    35: null,
    36: null,
    37: null,
    38: null,
    39: null,
    40: null,
    41: null,
    42: null,
    43: null,
    44: null,
    45: null,
    46: null,
    47: null,
    48: null,
    49: null,
    50: null
  };

  if (!window.SentinelWaveEditorCodes || typeof window.SentinelWaveEditorCodes !== "object") {
    window.SentinelWaveEditorCodes = { ...DEFAULT_WAVE_EDITOR_CODES };
  }
  for (let waveNumber = CODE_WAVE_MIN; waveNumber <= CODE_WAVE_MAX; waveNumber++) {
    if (!(waveNumber in window.SentinelWaveEditorCodes)) {
      window.SentinelWaveEditorCodes[waveNumber] = DEFAULT_WAVE_EDITOR_CODES[waveNumber] || null;
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
    const nullWaveIndex = Math.max(0, waveNumber - 22);
    const isRecoveryWave = waveNumber % 5 === 0;

    const burstCount = Math.min(12, 6 + Math.floor(nullWaveIndex * 0.5));
    const burstInterval = Math.max(300, 520 - (nullWaveIndex * 10) - (isRecoveryWave ? -20 : 0));

    const makeRamp = (base, growth, min, max, unlockAt = 0) => {
      if (nullWaveIndex < unlockAt) {
        return Array.from({ length: burstCount }, () => 0);
      }
      const wavePressure = isRecoveryWave ? 0.82 : 1;
      return Array.from({ length: burstCount }, (_, i) => {
        const value = (base + Math.floor(i * growth)) * wavePressure;
        return Math.max(min, Math.min(max, Math.floor(value)));
      });
    };

    return {
      burstCount,
      burstInterval,
      customBursts: makeRamp(2 + Math.floor(nullWaveIndex * 0.18), 0.24, 1, 6),
      customBrutes: makeRamp(nullWaveIndex >= 2 ? 1 : 0, 0.08, 0, 2, 2),
      customSlingers: makeRamp(1 + Math.floor(nullWaveIndex * 0.12), 0.1, 0, 3),
      customShielders: makeRamp(nullWaveIndex >= 6 ? 1 : 0, 0.05, 0, 2, 6),
      customBeamers: makeRamp(nullWaveIndex >= 9 ? 1 : 0, 0.04, 0, 2, 9),
      customKamikazes: makeRamp(Math.floor(nullWaveIndex * 0.16), 0.12, 0, 3),
      customStalkers: makeRamp(nullWaveIndex >= 11 ? 1 : 0, 0.04, 0, 2, 11),
      customBossMinors: makeRamp(nullWaveIndex >= 14 ? 1 : 0, 0.03, 0, 1, 14),
      customBosses: makeRamp(nullWaveIndex >= 24 ? 1 : 0, 0.02, 0, 1, 24),
      customSlingerBosses: makeRamp(0, 0, 0, 0),
      customBruteBosses: makeRamp(0, 0, 0, 0)
    };
  }

  function applyCodeWaveConfig(ctx, config) {
    ctx.setBurstCount(config.burstCount);
    ctx.setBurstInterval(config.burstInterval);
    window._customBursts = Array.isArray(config.customBursts) ? config.customBursts.slice() : null;
    window._customBrutes = Array.isArray(config.customBrutes) ? config.customBrutes.slice() : null;
    window._customSlingers = Array.isArray(config.customSlingers) ? config.customSlingers.slice() : null;
    window._customShielders = Array.isArray(config.customShielders) ? config.customShielders.slice() : null;
    window._customBeamers = Array.isArray(config.customBeamers) ? config.customBeamers.slice() : null;
    window._customKamikazes = Array.isArray(config.customKamikazes) ? config.customKamikazes.slice() : null;
    window._customStalkers = Array.isArray(config.customStalkers) ? config.customStalkers.slice() : null;
    window._customBossMinors = Array.isArray(config.customGruntBossMinors)
      ? config.customGruntBossMinors.slice()
      : (Array.isArray(config.customBossMinors) ? config.customBossMinors.slice() : null);
    window._customBosses = Array.isArray(config.customGruntBosses)
      ? config.customGruntBosses.slice()
      : (Array.isArray(config.customBosses) ? config.customBosses.slice() : null);
    window._customSlingerBosses = Array.isArray(config.customSlingerBosses) ? config.customSlingerBosses.slice() : null;
    window._customBruteBosses = Array.isArray(config.customBruteBosses) ? config.customBruteBosses.slice() : null;
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
    let radius = 26, collisionRadius = 30, speed = 0.4, health = 300 + (wave * 2), damage = 1, attackRange = 20, color = "magenta";
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
    enemy.attackCooldown = 90;
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
    enemy.gruntBossEntering = true;
    enemy.gruntBossEntryStage = "padding";
    enemy.gruntBossEdgePaddingX = 110;
    enemy.gruntBossEdgePaddingY = 150;
    enemy.gruntBossNormalSpeed = enemy.speed;
    enemy.gruntBossEntrySpeed = enemy.speed * 1.9;
    ctx.applyWaveEnemyModifiers(enemy);
    enemy.gruntBossNormalSpeed = enemy.speed;
    enemy.gruntBossEntrySpeed = enemy.speed * 1.9;
    enemy.maxHealth = enemy.health;

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

  function spawnSlingerBoss(ctx) {
    const wave = ctx.getWave();
    const slingerImg = ctx.getSlingerSprite();
    const { x, y } = randomEdgeSpawn();
    const enemy = ctx.spawnEnemy();
    enemy.x = x;
    enemy.y = y;
    enemy.radius = 28;
    enemy.collisionRadius = 30;
    enemy.speed = 0.75;
    enemy.health = 2600 + (wave * 16);
    enemy.damage = 2;
    enemy.attackCooldown = 0;
    enemy.attackRange = 5000;
    enemy.color = "#ff9f1a";
    enemy.type = "slingerBoss";
    enemy.spinAngle = Math.random() * Math.PI * 2;
    enemy.spinSpeed = (Math.random() - 0.5) * 0.02;
    enemy.sprite = slingerImg;
    enemy.slingerBossEntering = true;
    enemy.slingerBossEntryStage = "padding";
    enemy.slingerBossEntrySpeed = enemy.speed * 1.9;
    enemy.slingerBossFragCooldown = 150;
    enemy.slingerBossEdgePaddingX = 110;
    enemy.slingerBossEdgePaddingY = 150;
    ctx.applyWaveEnemyModifiers(enemy);
    enemy.slingerBossEntrySpeed = enemy.speed * 1.9;
    enemy.slingerBossEntryStage = "padding";
    enemy.maxHealth = enemy.health;
  }

  function spawnBruteBurst(ctx, count) {
    const enemies = ctx.getEnemies();
    const wave = ctx.getWave();

    for (let i = 0; i < count; i++) {
      const { x, y } = randomEdgeSpawn();
      let radius = 24, collisionRadius = 26, speed = 0.62, health = 300 + (wave * 2), damage = 2, attackRange = 28, color = "#ff7a00";
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

  function spawnBruteBoss(ctx) {
    const wave = ctx.getWave();
    const canvasWidth = (ctx && typeof ctx.getCanvasWidth === "function") ? ctx.getCanvasWidth() : 1024;
    const canvasHeight = (ctx && typeof ctx.getCanvasHeight === "function") ? ctx.getCanvasHeight() : 768;
    const { x, y } = randomEdgeSpawn(canvasWidth, canvasHeight, 220);
    const enemy = ctx.spawnEnemy();
    enemy.x = x;
    enemy.y = y;
    enemy.radius = 34;
    enemy.collisionRadius = 32;
    enemy.speed = 0.48;
    enemy.health = 3800 + (wave * 16);
    enemy.damage = 4;
    enemy.attackCooldown = 0;
    enemy.attackRange = 34;
    enemy.color = "#ff7a00";
    enemy.type = "bruteBoss";
    enemy.novaMinRadius = enemy.radius + 56;
    enemy.novaRadius = enemy.novaMinRadius;
    enemy.novaState = "minPause";
    enemy.novaCooldown = 100;
    enemy.novaCue = false;
    enemy.novaGrowthSpeed = 2.8;
    enemy.novaShrinkSpeed = 2.8;
    enemy.novaMaxMultiplier = 6.6;
    enemy.novaDamage = 2;
    enemy.bruteBossEdgePaddingX = 90;
    enemy.bruteBossEdgePaddingY = 135;
    enemy.bruteBossEntering = true;
    enemy.bruteBossNormalSpeed = enemy.speed;
    enemy.bruteBossEntrySpeed = enemy.speed * 2.3;
    ctx.applyWaveEnemyModifiers(enemy);
    enemy.bruteBossNormalSpeed = enemy.speed;
    enemy.bruteBossEntrySpeed = enemy.speed * 2.3;
    enemy.maxHealth = enemy.health;
  }

  function spawnStalkerBurst(ctx, count) {
    const wave = ctx.getWave();
    const edgePaddingX = 120;
    const edgePaddingY = 170;

    for (let i = 0; i < count; i++) {
      let radius = 18, collisionRadius = 18, speed = 0.75, health = 75 + (wave * 1.9), damage = 1, attackRange = 320, color = "#000000";
      const stalkerPreferredDistance = 160 + Math.random() * 130;
      const { x, y } = randomEdgeSpawn();

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
      enemy.type = "stalker";
      enemy.blinkCooldown = 120 + Math.floor(Math.random() * 80);
      enemy.blinkCastTimer = 0;
      enemy.blinkRecoverTimer = 0;
      enemy.burstsLeft = 0;
      enemy.burstTimer = 0;
      enemy.burstShotsLeft = 0;
      enemy.pendingBursts = 0;
      enemy.stalkerRoutineActive = false;
      enemy.stalkerInitialBurstDone = false;
      enemy.stalkerPreferredDistance = stalkerPreferredDistance;
      enemy.stalkerEdgePaddingX = edgePaddingX;
      enemy.stalkerEdgePaddingY = edgePaddingY;
      ctx.applyWaveEnemyModifiers(enemy);
    }
  }

  function spawnBeamerBurst(ctx, count) {
    const wave = ctx.getWave();
    const canvasWidth = (ctx && typeof ctx.getCanvasWidth === "function") ? ctx.getCanvasWidth() : 1024;
    const canvasHeight = (ctx && typeof ctx.getCanvasHeight === "function") ? ctx.getCanvasHeight() : 768;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const edgePaddingX = 72;
    const edgePaddingY = 120;

    for (let i = 0; i < count; i++) {
      let radius = 19, collisionRadius = 20, speed = 0.68, health = 52 + (wave * 2.2), damage = 1, attackRange = 420, color = "#4bc7ff";
      const beamerPreferredDistance = 190 + Math.random() * 140;

      let x = edgePaddingX + Math.random() * Math.max(1, canvasWidth - edgePaddingX * 2);
      let y = edgePaddingY + Math.random() * Math.max(1, canvasHeight - edgePaddingY * 2);
      const maxRingRadius = Math.min(canvasWidth * 0.5 - edgePaddingX, canvasHeight * 0.5 - edgePaddingY);
      const minRingRadius = Math.min(beamerPreferredDistance + 12, Math.max(20, maxRingRadius - 14));
      if (maxRingRadius > 16) {
        for (let attempt = 0; attempt < 12; attempt++) {
          const angle = Math.random() * Math.PI * 2;
          const ringRadius = minRingRadius + Math.random() * Math.max(1, maxRingRadius - minRingRadius);
          const candidateX = centerX + Math.cos(angle) * ringRadius;
          const candidateY = centerY + Math.sin(angle) * ringRadius;
          const clampedX = Math.max(edgePaddingX, Math.min(canvasWidth - edgePaddingX, candidateX));
          const clampedY = Math.max(edgePaddingY, Math.min(canvasHeight - edgePaddingY, candidateY));
          const distFromCenter = Math.hypot(clampedX - centerX, clampedY - centerY);
          if (distFromCenter >= beamerPreferredDistance) {
            x = clampedX;
            y = clampedY;
            break;
          }
        }
      }

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
      enemy.type = "beamer";
      enemy.beamerPreferredDistance = beamerPreferredDistance;
      enemy.beamerEdgePaddingX = edgePaddingX;
      enemy.beamerEdgePaddingY = edgePaddingY;
      enemy.beamCooldown = 110 + Math.floor(Math.random() * 70);
      enemy.beamCastTimer = 0;
      enemy.beamCastDuration = 0;
      enemy.beamActiveTimer = 0;
      enemy.beamDuration = 0;
      enemy.beamAngle = 0;
      enemy.beamLength = 460;
      enemy.beamTravelHead = 0;
      enemy.beamTravelTail = 0;
      enemy.beamTravelSpeed = 0;
      enemy.beamSegmentLength = Math.max(120, enemy.beamLength * 0.32);
      enemy.beamTickTimer = 0;
      enemy.beamGlow = 0;
      enemy.beamerAlpha = 0;
      enemy.beamerFacingAngle = 0;
      ctx.applyWaveEnemyModifiers(enemy);
    }
  }

  function spawnShielderBurst(ctx, count) {
    const wave = ctx.getWave();
    const canvasWidth = (ctx && typeof ctx.getCanvasWidth === "function") ? ctx.getCanvasWidth() : 1024;
    const canvasHeight = (ctx && typeof ctx.getCanvasHeight === "function") ? ctx.getCanvasHeight() : 768;
    const edgePaddingX = 72;
    const edgePaddingY = 120;

    for (let i = 0; i < count; i++) {
      let radius = 26, collisionRadius = 17, speed = 0.64, health = 60 + (wave * 1.8), damage = 0, attackRange = 0, color = "#78ffd6";
      const shielderPreferredDistance = 170 + Math.random() * 120;
      const { x, y } = randomEdgeSpawn(canvasWidth, canvasHeight);

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
      enemy.type = "shielder";
      enemy.shielderPreferredDistance = shielderPreferredDistance;
      enemy.shielderEdgePaddingX = edgePaddingX;
      enemy.shielderEdgePaddingY = edgePaddingY;
      enemy.shieldRange = 230;
      enemy.shieldMaxLinks = 2;
      enemy.shieldReductionAmount = 0.75;
      enemy.shieldPersistDuration = 180;
      enemy.shielderAlpha = 0;
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

  function spawnSlingerBossBurst(ctx, count) {
    for (let i = 0; i < count; i++) {
      spawnSlingerBoss(ctx);
    }
  }

  function spawnBruteBossBurst(ctx, count) {
    for (let i = 0; i < count; i++) {
      spawnBruteBoss(ctx);
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
    window._customShielders = null;
    window._customBeamers = null;
    window._customKamikazes = null;
    window._customStalkers = null;
    window._customBossMinors = null;
    window._customBosses = null;
    window._customSlingerBosses = null;
    window._customBruteBosses = null;
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
      ctx.setBurstCount(Infinity);
      ctx.setBurstInterval(300);
      window._customBursts = null;
      window._customBrutes = null;
      window._customSlingers = null;
      window._customShielders = null;
      window._customBeamers = null;
      window._customKamikazes = null;
      window._customStalkers = null;
      window._customBossMinors = null;
      window._customBosses = null;
      window._customSlingerBosses = null;
      window._customBruteBosses = null;
      spawnSlingerBoss(ctx);
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
      ctx.setBurstCount(30);
      ctx.setBurstInterval(120);
      window._customBursts = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];
      window._customBrutes = null;
      window._customSlingers = [0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0];
      window._customKamikazes = [0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1];
      window._customBossMinors = [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0,0,0];
    } else if (wave === 15) {
      ctx.setBurstCount(15);
      ctx.setBurstInterval(300);
      ctx.setBurstCount(30);
      ctx.setBurstInterval(120);
      window._customBursts = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];
      window._customBrutes = null;
      window._customSlingers = [0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0];
      window._customKamikazes = [0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1];
      window._customBossMinors = [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0,0,0];
    } else if (wave === 20) {
      ctx.setBurstCount(Infinity);
      ctx.setBurstInterval(300);
      window._customBursts = null;
      window._customBrutes = null;
      window._customSlingers = null;
      window._customShielders = null;
      window._customBeamers = null;
      window._customKamikazes = null;
      window._customStalkers = null;
      window._customBossMinors = null;
      window._customBosses = null;
      window._customSlingerBosses = null;
      window._customBruteBosses = null;
      spawnBruteBoss(ctx);
    } else if (wave >= 16) {
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
        const shielders = getValue(previewOverride.customShielders, burstIndex);
        const beamers = getValue(previewOverride.customBeamers, burstIndex);
        const kamikazes = getValue(previewOverride.customKamikazes, burstIndex);
        const stalkers = getValue(previewOverride.customStalkers, burstIndex);
        const bossMinors = getValue(previewOverride.customBossMinors, burstIndex);
        const bosses = getValue(previewOverride.customBosses, burstIndex);
        const slingerBosses = getValue(previewOverride.customSlingerBosses, burstIndex);
        const bruteBosses = getValue(previewOverride.customBruteBosses, burstIndex);

        if (grunts > 0 && canSpawnByMobInterval(elapsedState, "grunts", getMobIntervalFor("grunts", burstInterval))) spawnBurst(ctx, grunts);
        if (brutes > 0 && canSpawnByMobInterval(elapsedState, "brutes", getMobIntervalFor("brutes", burstInterval))) spawnBruteBurst(ctx, brutes);
        if (slingers > 0 && canSpawnByMobInterval(elapsedState, "slingers", getMobIntervalFor("slingers", burstInterval))) spawnSlingerBurst(ctx, slingers);
        if (shielders > 0 && canSpawnByMobInterval(elapsedState, "shielders", getMobIntervalFor("shielders", burstInterval))) spawnShielderBurst(ctx, shielders);
        if (beamers > 0 && canSpawnByMobInterval(elapsedState, "beamers", getMobIntervalFor("beamers", burstInterval))) spawnBeamerBurst(ctx, beamers);
        if (kamikazes > 0 && canSpawnByMobInterval(elapsedState, "kamikazes", getMobIntervalFor("kamikazes", burstInterval))) spawnKamikazeBurst(ctx, kamikazes);
        if (stalkers > 0 && canSpawnByMobInterval(elapsedState, "stalkers", getMobIntervalFor("stalkers", burstInterval))) spawnStalkerBurst(ctx, stalkers);
        if (bossMinors > 0 && canSpawnByMobInterval(elapsedState, "gruntbossminor", getMobIntervalFor("gruntbossminor", burstInterval))) spawnBossMinorBurst(ctx, bossMinors);
        if (bosses > 0 && canSpawnByMobInterval(elapsedState, "gruntboss", getMobIntervalFor("gruntboss", burstInterval))) spawnBossBurst(ctx, bosses);
        if (slingerBosses > 0 && canSpawnByMobInterval(elapsedState, "slingerboss", getMobIntervalFor("slingerboss", burstInterval))) spawnSlingerBossBurst(ctx, slingerBosses);
        if (bruteBosses > 0 && canSpawnByMobInterval(elapsedState, "bruteboss", getMobIntervalFor("bruteboss", burstInterval))) spawnBruteBossBurst(ctx, bruteBosses);

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

    if ((wave >= 1 && wave <= 4 && burstIndex < burstCount) || (wave === 5) || (wave >= 6 && wave <= 9 && burstIndex < burstCount) || (wave >= 11 && burstIndex < burstCount)) {
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

        if (window.sentinelDifficulty === "Apocalypse" && !(wave >= 11)) {
          spawnKamikazeBurst(ctx, 1);
        }

        if (slingers > 0 && canSpawnByMobInterval(elapsedState, "slingers", getMobIntervalFor("slingers", burstInterval))) spawnSlingerBurst(ctx, slingers);
        if (brutes > 0 && canSpawnByMobInterval(elapsedState, "brutes", getMobIntervalFor("brutes", burstInterval))) spawnBruteBurst(ctx, brutes);

        if (wave === 11) {
          const wave11KamikazeCount = getBurstValue(window._customKamikazes, burstIndex);
          if (wave11KamikazeCount > 0 && canSpawnByMobInterval(elapsedState, "kamikazes", getMobIntervalFor("kamikazes", burstInterval))) spawnKamikazeBurst(ctx, wave11KamikazeCount);
        }

        if (wave >= 12) {
          grunts = getBurstValue(window._customBursts, burstIndex);
          const waveSlingerCount = getBurstValue(window._customSlingers, burstIndex);
          const waveShielderCount = getBurstValue(window._customShielders, burstIndex);
          const waveBeamerCount = getBurstValue(window._customBeamers, burstIndex);
          const waveBruteCount = getBurstValue(window._customBrutes, burstIndex);
          const waveKamikazeCount = getBurstValue(window._customKamikazes, burstIndex);
          const waveStalkerCount = getBurstValue(window._customStalkers, burstIndex);
          if (waveSlingerCount > 0 && canSpawnByMobInterval(elapsedState, "slingers", getMobIntervalFor("slingers", burstInterval))) spawnSlingerBurst(ctx, waveSlingerCount);
          if (waveShielderCount > 0 && canSpawnByMobInterval(elapsedState, "shielders", getMobIntervalFor("shielders", burstInterval))) spawnShielderBurst(ctx, waveShielderCount);
          if (waveBeamerCount > 0 && canSpawnByMobInterval(elapsedState, "beamers", getMobIntervalFor("beamers", burstInterval))) spawnBeamerBurst(ctx, waveBeamerCount);
          if (waveBruteCount > 0 && canSpawnByMobInterval(elapsedState, "brutes", getMobIntervalFor("brutes", burstInterval))) spawnBruteBurst(ctx, waveBruteCount);
          if (waveKamikazeCount > 0 && canSpawnByMobInterval(elapsedState, "kamikazes", getMobIntervalFor("kamikazes", burstInterval))) spawnKamikazeBurst(ctx, waveKamikazeCount);
          if (waveStalkerCount > 0 && canSpawnByMobInterval(elapsedState, "stalkers", getMobIntervalFor("stalkers", burstInterval))) spawnStalkerBurst(ctx, waveStalkerCount);
        }

        const bossMinorCount = getBurstValue(window._customBossMinors, burstIndex);
        if (bossMinorCount > 0 && canSpawnByMobInterval(elapsedState, "gruntbossminor", getMobIntervalFor("gruntbossminor", burstInterval))) {
          for (let i = 0; i < bossMinorCount; i++) {
            spawnGruntBossMinor(ctx);
          }
        }
        const bossCount = getBurstValue(window._customBosses, burstIndex);
        if (bossCount > 0 && canSpawnByMobInterval(elapsedState, "gruntboss", getMobIntervalFor("gruntboss", burstInterval))) {
          for (let i = 0; i < bossCount; i++) {
            spawnGruntBoss(ctx);
          }
        }
        const slingerBossCount = getBurstValue(window._customSlingerBosses, burstIndex);
        if (slingerBossCount > 0 && canSpawnByMobInterval(elapsedState, "slingerboss", getMobIntervalFor("slingerboss", burstInterval))) {
          for (let i = 0; i < slingerBossCount; i++) {
            spawnSlingerBoss(ctx);
          }
        }
        const bruteBossCount = getBurstValue(window._customBruteBosses, burstIndex);
        if (bruteBossCount > 0 && canSpawnByMobInterval(elapsedState, "bruteboss", getMobIntervalFor("bruteboss", burstInterval))) {
          for (let i = 0; i < bruteBossCount; i++) {
            spawnBruteBoss(ctx);
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
      if (!Number.isFinite(parsed) || parsed < CODE_WAVE_MIN || parsed > CODE_WAVE_MAX) return false;
      if (code !== null && typeof code !== "string") return false;
      window.SentinelWaveEditorCodes[parsed] = (typeof code === "string" && code.trim().length > 0) ? code.trim() : null;
      return true;
    },
    getWaveEditorCodes: () => ({ ...window.SentinelWaveEditorCodes })
  };
})();
