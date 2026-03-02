window.SentinelWaveControl = (function () {
  // Paste future editor code strings into these wave slots (17-25).
  const DEFAULT_WAVE_EDITOR_CODES = {
    17: "SWC1:eyJ2ZXJzaW9uIjoyLCJvdmVycmlkZXMiOnsiMSI6eyJidXJzdENvdW50IjoxMCwiYnVyc3RJbnRlcnZhbFNlY29uZHMiOjIsImN1c3RvbUJydXRlcyI6WzEsMCwwLDAsMCwwLDAsMCwwLDAsMF0sImN1c3RvbUthbWlrYXplcyI6WzEsMiwxLDIsMSwyLDEsMiwxLDJdfX19",
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
    for (let waveNumber = 17; waveNumber <= 25; waveNumber++) {
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
    const index = Math.max(0, waveNumber - 17);
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
  }

  function configureCodeWave(ctx, waveNumber) {
    let config = null;
    const waveCode = getEditorWaveCode(waveNumber);

    if (waveCode && window.SentinelEditor && typeof window.SentinelEditor.getWaveConfigFromCode === "function") {
      try {
        config = window.SentinelEditor.getWaveConfigFromCode(waveCode, 1);
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

    enemies.push({
      x,
      y,
      radius,
      collisionRadius,
      speed,
      health,
      damage,
      attackCooldown: 0,
      attackRange,
      color,
      type: "gruntBoss",
      spinAngle,
      spinSpeed,
      sprite: gruntImg,
      projectileCooldown: 0,
      projectileInterval: 120,
      projectileRadius: 22,
      burstMode: false,
      burstShotsLeft: 0,
      burstTimer: 0
    });

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

    enemies.push({
      x,
      y,
      radius,
      collisionRadius,
      speed,
      health,
      damage,
      attackCooldown: 0,
      attackRange,
      color,
      type: "gruntBossMinor",
      spinAngle,
      spinSpeed,
      sprite: gruntImg
    });

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
      enemies.push({ x, y, radius, collisionRadius, speed, health, damage, attackCooldown: 0, attackRange, color, type: "grunt", spinAngle, spinSpeed });
    }
  }

  function spawnKamikazeBurst(ctx, count) {
    const enemies = ctx.getEnemies();
    const wave = ctx.getWave();

    for (let i = 0; i < count; i++) {
      const { x, y } = randomEdgeSpawn();
      let radius = 16, collisionRadius = 18, speed = 2, color = "#ff4444", damage = 3, health = 12 + (wave * 1.2);
      enemies.push({
        x,
        y,
        radius,
        collisionRadius,
        speed,
        color,
        damage,
        health,
        type: "kamikaze",
        timer: 60,
        exploded: false,
        minesPlaced: 0,
        mineInterval: 60,
        nextMineTime: 60
      });
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
      enemies.push({ x, y, radius, collisionRadius, speed, health, damage, attackCooldown: 0, attackRange, color, type: "slinger", spinAngle, spinSpeed, sprite: slingerImg });
    }
  }

  function spawnBruteBurst(ctx, count) {
    const enemies = ctx.getEnemies();
    const wave = ctx.getWave();

    for (let i = 0; i < count; i++) {
      const { x, y } = randomEdgeSpawn();
      let radius = 24, collisionRadius = 26, speed = 0.62, health = 160 + (wave * 1.5), damage = 2, attackRange = 28, color = "#ff7a00";
      enemies.push({
        x,
        y,
        radius,
        collisionRadius,
        speed,
        health,
        damage,
        attackCooldown: 0,
        attackRange,
        color,
        type: "brute",
        novaRadius: radius + 20,
        novaState: "minPause",
        novaCooldown: 120,
        novaCue: false
      });
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
    window._customBosses = null;

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
      window._bossMinorBursts = null;
      if (!window._wave10MinorsSpawned) {
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
      window._customSlingers = [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0];
      window._customKamikazes = [0, 0, 0, 1, 0, 2, 0, 0, 0, 1, 0, 2, 0, 1, 2];
      window._customBossMinors = [2, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0];
    } else if (wave === 13) {
      ctx.setBurstCount(15);
      ctx.setBurstInterval(300);
      window._customBrutes = null;
      window._customSlingers = [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0];
      window._customKamikazes = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
      window._customBossMinors = [2, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0];
    } else if (wave === 14) {
      ctx.setBurstCount(15);
      ctx.setBurstInterval(300);
      window._customBursts = [1, 1, 2, 1, 4, 1, 1, 6, 1, 1, 8, 0, 0, 0, 0];
      window._customBrutes = null;
      window._customSlingers = [0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0];
      window._customKamikazes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      window._customBossMinors = [0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0];
    } else if (wave === 15) {
      ctx.setBurstCount(15);
      ctx.setBurstInterval(300);
      window._customBursts = [1, 1, 2, 1, 1, 4, 1, 1, 6, 1, 1, 8, 2, 2, 2];
      window._customBrutes = null;
      window._customSlingers = [0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0];
      window._customKamikazes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3];
      window._customBossMinors = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0];
    } else if (wave === 16) {
      ctx.setBurstCount(15);
      ctx.setBurstInterval(300);
      window._customBursts = [1, 1, 2, 1, 1, 4, 1, 1, 6, 1, 1, 8, 2, 2, 2];
      window._customBrutes = null;
      window._customSlingers = [0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0];
      window._customKamikazes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3];
      window._customBossMinors = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0];
    } else if (wave >= 17 && wave <= 25) {
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

    const commit = () => {
      ctx.setBurstCount(burstCount);
      ctx.setBurstIndex(burstIndex);
      ctx.setBurstTimer(burstTimer);
    };

    if (wave === 10) {
      burstCount = enemies.filter(en => en.type === "gruntBossMinor").length;
    }

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

        if (grunts > 0) spawnBurst(ctx, grunts);
        if (brutes > 0) spawnBruteBurst(ctx, brutes);
        if (slingers > 0) spawnSlingerBurst(ctx, slingers);
        if (kamikazes > 0) spawnKamikazeBurst(ctx, kamikazes);
        if (bossMinors > 0) spawnBossMinorBurst(ctx, bossMinors);
        if (bosses > 0) spawnBossBurst(ctx, bosses);

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
          grunts = (window._customBursts && window._customBursts[burstIndex]) || 0;
        } else if (wave === 5) {
          grunts = 1 + Math.floor(Math.random() * 2);
        } else if (wave >= 6 && wave <= 9) {
          grunts = 2 + Math.floor(Math.random() * 3);
          if (window._customSlingers) {
            slingers = window._customSlingers[burstIndex] || 0;
          }
          if (window._customBrutes) {
            brutes = window._customBrutes[burstIndex] || 0;
          }
        }

        if (window.sentinelDifficulty === "Apocalypse" && !(wave >= 11 && wave <= 25)) {
          spawnKamikazeBurst(ctx, 1);
        }

        if (wave === 10) {
          const slingerCount = 2 + Math.floor(Math.random() * 3);
          spawnSlingerBurst(ctx, slingerCount);
          const gruntCount = 2 + Math.floor(Math.random() * 3);
          spawnBurst(ctx, gruntCount);
          const bruteCount = window._customBrutes ? (window._customBrutes[burstIndex] || 0) : 0;
          if (bruteCount > 0) spawnBruteBurst(ctx, bruteCount);
        } else {
          if (slingers > 0) spawnSlingerBurst(ctx, slingers);
          if (brutes > 0) spawnBruteBurst(ctx, brutes);
        }

        if (wave === 11) {
          if (window._customKamikazes && window._customKamikazes[burstIndex]) {
            spawnKamikazeBurst(ctx, window._customKamikazes[burstIndex]);
          }
        }

        if (wave === 12 || wave === 13 || wave === 14 || wave === 15 || wave === 16 || (wave >= 17 && wave <= 25)) {
          grunts = (window._customBursts && window._customBursts[burstIndex]) || 0;
          if (window._customSlingers && window._customSlingers[burstIndex]) {
            spawnSlingerBurst(ctx, window._customSlingers[burstIndex]);
          }
          if (window._customBrutes && window._customBrutes[burstIndex]) {
            spawnBruteBurst(ctx, window._customBrutes[burstIndex]);
          }
          let count = 0;
          if (window._customKamikazes && window._customKamikazes[burstIndex]) {
            count = window._customKamikazes[burstIndex];
          }
          if (count > 0) spawnKamikazeBurst(ctx, count);
        }

        if (window._customBossMinors && window._customBossMinors[burstIndex]) {
          for (let i = 0; i < window._customBossMinors[burstIndex]; i++) {
            spawnGruntBossMinor(ctx);
          }
        }
        if (window._customBosses && window._customBosses[burstIndex]) {
          for (let i = 0; i < window._customBosses[burstIndex]; i++) {
            spawnGruntBoss(ctx);
          }
        }
        if (grunts > 0) spawnBurst(ctx, grunts);

        burstIndex++;
      }
    }

    commit();
  }

  return {
    spawnWave,
    handleWaveSpawning,
    setWaveEditorCode: (waveNumber, code) => {
      const parsed = parseInt(waveNumber, 10);
      if (!Number.isFinite(parsed) || parsed < 17 || parsed > 25) return false;
      if (code !== null && typeof code !== "string") return false;
      window.SentinelWaveEditorCodes[parsed] = (typeof code === "string" && code.trim().length > 0) ? code.trim() : null;
      return true;
    },
    getWaveEditorCodes: () => ({ ...window.SentinelWaveEditorCodes })
  };
})();
