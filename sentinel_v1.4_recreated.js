  // Expose byte reset and set to console
  window.resetBytes = function() {
    window.totalCollectedBytes = 0;
    localStorage.setItem('sentinel.collectedBytes.v1', '0');
    console.log('✓ Bytes reset to 0');
  };

  window.giveBytes100 = function() {
    window.totalCollectedBytes = 100;
    localStorage.setItem('sentinel.collectedBytes.v1', '100');
    console.log('✓ 100 Bytes granted');
  };
  // Fade out and stop menu ambience audio
  function fadeOutMenuAmbience(duration = 1000) {
    const ambience = window._menuAmbienceAudio;
    if (!ambience) return;
    const startVol = ambience.volume;
    const start = Date.now();
    function step() {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      ambience.volume = startVol * (1 - t);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        ambience.pause();
        ambience.volume = startVol;
        window._menuAmbienceAudio = null;
      }
    }
    step();
  }
  // Play menu ambience audio (scifi2.wav) once
  function playMenuAmbience() {
    try {
      if (window._menuAmbienceAudio) {
        window._menuAmbienceAudio.pause();
        window._menuAmbienceAudio.currentTime = 0;
        window._menuAmbienceAudio = null;
      }
      let ambience = new Audio('ambience scifi2.wav');
      ambience.volume = 0.1;
      ambience.loop = false;
      let playPromise = ambience.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('Audio play failed:', error);
        });
      }
      window._menuAmbienceAudio = ambience;
    } catch (e) {}
  }
  // Speed multiplier for game timing (higher = faster, lower = slower)
  const SPEED_MULTIPLIER = 120;

  
  // Mine sprite
  const mineImg = new window.Image();
  mineImg.src = "mine.png";
  // Grunt Boss sprite
  const gruntBossImg = new window.Image();
  gruntBossImg.src = "grunt boss.png";
  // Grunt Heavy sprite
  const gruntHeavyImg = new window.Image();
  gruntHeavyImg.src = "grunt heavy.png";
  // Slinger Boss sprite
  const slingerBossImg = new window.Image();
  slingerBossImg.src = "slinger boss.png";
// Sentinel v1.4 Recreated - Core game logic

// Expose protocol reset to console
window.resetAllProtocolDiscovery = function() {
  if (window.ProtocolSystem && typeof window.ProtocolSystem.resetDiscovery === 'function') {
    window.ProtocolSystem.resetDiscovery();
  } else if (typeof ProtocolSystem !== 'undefined' && typeof ProtocolSystem.resetDiscovery === 'function') {
    ProtocolSystem.resetDiscovery();
  } else {
    console.warn('ProtocolSystem.resetDiscovery not found');
  }
};

window.debugFramerateEnabled = false;
window._debugKeyDown = false;
window.addEventListener('keydown', function(e) {
  // Toggle framerate debug with 'P' (only on initial press, not repeat)
  if ((e.key === 'p' || e.key === 'P') && !window._debugKeyDown) {
    window.debugFramerateEnabled = !window.debugFramerateEnabled;
    window._debugKeyDown = true;
    if (window.debugFramerateEnabled) {
      console.log('[DEBUG] Framerate debug ENABLED');
    } else {
      console.log('[DEBUG] Framerate debug DISABLED');
    }
    e.preventDefault();
  }
});
window.addEventListener('keyup', function(e) {
  if (e.key === 'p' || e.key === 'P') {
    window._debugKeyDown = false;
    e.preventDefault();
  }
});

window.onload = function () {
  const uiSelectionStyle = document.createElement("style");
  uiSelectionStyle.textContent = `
    body, body * {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    input, textarea, [contenteditable="true"] {
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
    }
    button {
      transition: transform 0.08s ease, filter 0.12s ease, box-shadow 0.12s ease;
      will-change: transform;
    }
    button:hover {
      filter: brightness(1.08);
    }
    button:active {
      transform: translateY(1px) scale(0.98);
      filter: brightness(0.94);
    }
    button:focus-visible {
      outline: 2px solid #00ffdd;
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(uiSelectionStyle);

  // Loading/Menu screen state
  let showLoadingScreen = true;
  let showMenuScreen = false;
  const titleImg = new window.Image();
  titleImg.src = "titlescreen.png";
  // Create loading overlay elements
  const loadingOverlay = document.createElement("div");
  loadingOverlay.id = "loadingOverlay";
  loadingOverlay.style.position = "fixed";
  loadingOverlay.style.left = 0;
  loadingOverlay.style.top = 0;
  loadingOverlay.style.width = "100vw";
  loadingOverlay.style.height = "100vh";
  loadingOverlay.style.background = "#000";
  loadingOverlay.style.display = "flex";
  loadingOverlay.style.flexDirection = "column";
  loadingOverlay.style.justifyContent = "center";
  loadingOverlay.style.alignItems = "center";
  loadingOverlay.style.zIndex = 1000;
  // Loading background image
  const loadingBg = document.createElement("img");
  loadingBg.src = "titlescreen.png";
  loadingBg.style.position = "absolute";
  loadingBg.style.left = "50%";
  loadingBg.style.top = "50%";
  loadingBg.style.transform = "translate(-50%, -50%)";
  loadingBg.style.width = "1024px";
  loadingBg.style.height = "768px";
  loadingBg.style.objectFit = "fill";

  // Gradient overlay for bottom fade effect
  const loadingGradient = document.createElement("div");
  loadingGradient.style.position = "absolute";
  loadingGradient.style.left = "0";
  loadingGradient.style.bottom = "0";
  loadingGradient.style.width = "1024px";
  loadingGradient.style.height = "180px";
  loadingGradient.style.background = "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 100%)";
  loadingGradient.style.pointerEvents = "none";
  loadingGradient.style.zIndex = 1;
  loadingOverlay.appendChild(loadingGradient);
  loadingBg.style.zIndex = 0;
  loadingOverlay.appendChild(loadingBg);
  // Continue button (bottom, subtle)
  const continueBtn = document.createElement("div");
  continueBtn.textContent = "Click to continue";
  continueBtn.style.position = "absolute";
  continueBtn.style.bottom = "40px";
  continueBtn.style.left = "50%";
  continueBtn.style.transform = "translateX(-50%)";
  continueBtn.style.fontSize = "1.2rem";
  continueBtn.style.padding = "0.5rem 1.5rem";
  continueBtn.style.background = "rgba(0,0,0,0.35)";
  continueBtn.style.color = "#fff";
  continueBtn.style.borderRadius = "8px";
  continueBtn.style.opacity = "0.7";
  continueBtn.style.zIndex = 2;
  continueBtn.style.pointerEvents = "none";
  loadingOverlay.appendChild(continueBtn);
  document.body.appendChild(loadingOverlay);
  playMenuAmbience();
  // Continue on any click
  loadingOverlay.addEventListener("click", function() {
    loadingOverlay.style.display = "none";
    showLoadingScreen = false;
    showMenuScreen = true;
    showMenu();
  });
  // Menu screen
  function showMenu() {
    const ENEMY_GLOSSARY = {
      factionName: "UNCLASSIFIED HOSTILES",
      factionDescription: "Faction designation pending. This index summarizes observed hostile combat roles and behavior patterns.",
      entries: [
        { name: "Shard", role: "Frontline", image: "grunt.png", description: "Basic close-range attacker that pushes directly toward the player." },
        { name: "Kamikaze", role: "Suicide Diver", image: "kamikaze.png", description: "Fast suicide unit that pressures with explosives and mine drops." },
        { name: "Slinger", role: "Ranged Harasser", image: "slinger.png", description: "Maintains distance and fires projectile shots at medium-to-long range." },
        { name: "Shielder", role: "Support", image: "shielder.png", description: "Defensive support unit that protects nearby enemies with shielding links." },
        { name: "Beamer", role: "Artillery", image: "beamer.png", description: "Charges and fires sweeping beam attacks while holding preferred spacing." },
        { name: "Stalker", role: "Skirmisher", image: "stalker.png", description: "Disruptive mobile attacker that repositions aggressively around the player." },
        { name: "Brute", role: "Heavy", image: "brute.png", description: "Durable close-range unit with high pressure in short-to-mid range fights." },
        { name: "Shard Heavy", role: "Mini-Boss", image: "grunt heavy.png", description: "Minor boss variant with elevated durability and elite pressure patterns." },
        { name: "Shard Major", role: "Boss", image: "grunt boss.png", description: "Elite grunt leader with shard-based attacks and advanced threat patterns." },
        { name: "Slinger Major", role: "Boss", image: "slinger boss.png", description: "Advanced ranged boss with burst projectile patterns and fragmentation fire." },
        { name: "Brute Major", role: "Boss", image: "brute boss.png", description: "Heavy boss focused on area denial, nova pressure, and close-range punishment." }
      ]
    };

    function showEnemyGlossary() {
      const glossaryOverlay = document.createElement("div");
      glossaryOverlay.id = "enemyGlossaryOverlay";
      glossaryOverlay.style.position = "fixed";
      glossaryOverlay.style.left = 0;
      glossaryOverlay.style.top = 0;
      glossaryOverlay.style.width = "100vw";
      glossaryOverlay.style.height = "100vh";
      glossaryOverlay.style.background = "#000";
      glossaryOverlay.style.display = "flex";
      glossaryOverlay.style.flexDirection = "column";
      glossaryOverlay.style.justifyContent = "center";
      glossaryOverlay.style.alignItems = "center";
      glossaryOverlay.style.zIndex = 1001;

      const glossaryBg = document.createElement("img");
      glossaryBg.src = "titlescreen.png";
      glossaryBg.style.position = "absolute";
      glossaryBg.style.left = "50%";
      glossaryBg.style.top = "50%";
      glossaryBg.style.transform = "translate(-50%, -50%)";
      glossaryBg.style.width = "1024px";
      glossaryBg.style.height = "768px";
      glossaryBg.style.objectFit = "fill";
      glossaryBg.style.zIndex = 0;
      glossaryOverlay.appendChild(glossaryBg);

      const panel = document.createElement("div");
      panel.style.position = "relative";
      panel.style.zIndex = 2;
      panel.style.width = "940px";
      panel.style.maxHeight = "720px";
      panel.style.background = "rgba(0, 20, 30, 0.96)";
      panel.style.border = "2px solid #00ffdd";
      panel.style.borderRadius = "10px";
      panel.style.boxShadow = "0 0 28px rgba(0, 255, 221, 0.35)";
      panel.style.padding = "16px";
      panel.style.display = "flex";
      panel.style.flexDirection = "column";
      glossaryOverlay.appendChild(panel);

      const topRow = document.createElement("div");
      topRow.style.display = "flex";
      topRow.style.alignItems = "center";
      topRow.style.justifyContent = "space-between";
      topRow.style.marginBottom = "10px";
      panel.appendChild(topRow);

      const title = document.createElement("h2");
      title.textContent = "ENEMY GLOSSARY";
      title.style.color = "#00ffdd";
      title.style.margin = "0";
      title.style.fontSize = "2rem";
      title.style.textShadow = "0 0 14px rgba(0,255,221,0.7)";
      topRow.appendChild(title);

      const backBtn = document.createElement("button");
      backBtn.textContent = "← Back to Menu";
      backBtn.style.fontSize = "0.95rem";
      backBtn.style.padding = "0.45rem 0.95rem";
      backBtn.style.background = "rgba(0,0,0,0.7)";
      backBtn.style.color = "#00ffdd";
      backBtn.style.border = "2px solid #00ffdd";
      backBtn.style.borderRadius = "6px";
      backBtn.style.cursor = "pointer";
      backBtn.addEventListener("mouseover", () => backBtn.style.background = "rgba(0,0,0,0.9)");
      backBtn.addEventListener("mouseout", () => backBtn.style.background = "rgba(0,0,0,0.7)");
      topRow.appendChild(backBtn);

      const factionBlock = document.createElement("div");
      factionBlock.style.border = "1px solid rgba(0,255,221,0.45)";
      factionBlock.style.borderRadius = "8px";
      factionBlock.style.padding = "10px 12px";
      factionBlock.style.marginBottom = "12px";
      factionBlock.style.background = "rgba(0, 35, 45, 0.52)";
      panel.appendChild(factionBlock);

      const factionName = document.createElement("div");
      factionName.textContent = `Faction: ${ENEMY_GLOSSARY.factionName}`;
      factionName.style.color = "#7ff9ff";
      factionName.style.fontWeight = "bold";
      factionName.style.marginBottom = "4px";
      factionBlock.appendChild(factionName);

      const factionDesc = document.createElement("div");
      factionDesc.textContent = ENEMY_GLOSSARY.factionDescription;
      factionDesc.style.color = "#c9feff";
      factionDesc.style.fontSize = "0.92rem";
      factionBlock.appendChild(factionDesc);

      const listWrap = document.createElement("div");
      listWrap.style.flex = "1";
      listWrap.style.overflowY = "auto";
      listWrap.style.border = "1px solid rgba(0,255,221,0.28)";
      listWrap.style.borderRadius = "8px";
      listWrap.style.padding = "10px";
      panel.appendChild(listWrap);

      ENEMY_GLOSSARY.entries.forEach((entry) => {
        const card = document.createElement("div");
        card.style.display = "grid";
        card.style.gridTemplateColumns = "64px 1fr";
        card.style.columnGap = "12px";
        card.style.alignItems = "center";
        card.style.border = "1px solid rgba(0,255,221,0.28)";
        card.style.borderRadius = "8px";
        card.style.padding = "10px";
        card.style.marginBottom = "8px";
        card.style.background = "rgba(0, 50, 64, 0.44)";
        listWrap.appendChild(card);

        const spriteWrap = document.createElement("div");
        spriteWrap.style.width = "64px";
        spriteWrap.style.height = "64px";
        spriteWrap.style.border = "1px solid rgba(0,255,221,0.45)";
        spriteWrap.style.borderRadius = "6px";
        spriteWrap.style.background = "rgba(0, 20, 30, 0.8)";
        spriteWrap.style.display = "flex";
        spriteWrap.style.alignItems = "center";
        spriteWrap.style.justifyContent = "center";
        spriteWrap.style.overflow = "hidden";
        card.appendChild(spriteWrap);

        const sprite = document.createElement("img");
        sprite.src = entry.image || "";
        sprite.alt = entry.name;
        sprite.style.maxWidth = "56px";
        sprite.style.maxHeight = "56px";
        sprite.style.objectFit = "contain";
        sprite.addEventListener("error", () => {
          sprite.remove();
          const fallback = document.createElement("div");
          fallback.textContent = entry.name.slice(0, 2).toUpperCase();
          fallback.style.color = "#8ffaff";
          fallback.style.fontSize = "0.82rem";
          fallback.style.fontWeight = "bold";
          spriteWrap.appendChild(fallback);
        });
        spriteWrap.appendChild(sprite);

        const textCol = document.createElement("div");
        textCol.style.display = "flex";
        textCol.style.flexDirection = "column";
        card.appendChild(textCol);

        const name = document.createElement("div");
        name.textContent = entry.name;
        name.style.color = "#00ffdd";
        name.style.fontWeight = "bold";
        name.style.fontSize = "1rem";
        textCol.appendChild(name);

        const role = document.createElement("div");
        role.textContent = `Role: ${entry.role}`;
        role.style.color = "#8ffaff";
        role.style.fontSize = "0.88rem";
        role.style.marginTop = "2px";
        textCol.appendChild(role);

        const desc = document.createElement("div");
        desc.textContent = entry.description;
        desc.style.color = "#d4fcff";
        desc.style.fontSize = "0.9rem";
        desc.style.marginTop = "5px";
        textCol.appendChild(desc);
      });

      backBtn.addEventListener("click", () => {
        glossaryOverlay.remove();
        showMenu();
      });

      document.body.appendChild(glossaryOverlay);
    }

    const menuOverlay = document.createElement("div");
    menuOverlay.id = "menuOverlay";
    menuOverlay.style.position = "fixed";
    menuOverlay.style.left = 0;
    menuOverlay.style.top = 0;
    menuOverlay.style.width = "100vw";
    menuOverlay.style.height = "100vh";
    menuOverlay.style.background = "#000";
    menuOverlay.style.display = "flex";
    menuOverlay.style.flexDirection = "column";
    menuOverlay.style.justifyContent = "center";
    menuOverlay.style.alignItems = "center";
    menuOverlay.style.zIndex = 1000;
    // Menu background image
    const menuBg = document.createElement("img");
    menuBg.src = "titlescreen.png";
    menuBg.style.position = "absolute";
    menuBg.style.left = "50%";
    menuBg.style.top = "50%";
    menuBg.style.transform = "translate(-50%, -50%)";
    menuBg.style.width = "1024px";
    menuBg.style.height = "768px";
    menuBg.style.objectFit = "fill";

    // Gradient overlay for bottom fade effect
    const menuGradient = document.createElement("div");
    menuGradient.style.position = "absolute";
    menuGradient.style.left = "0";
    menuGradient.style.bottom = "0";
    menuGradient.style.width = "1024px";
    menuGradient.style.height = "180px";
    menuGradient.style.background = "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 100%)";
    menuGradient.style.pointerEvents = "none";
    menuGradient.style.zIndex = 1;
    menuOverlay.appendChild(menuGradient);
    menuBg.style.zIndex = 0;
    menuOverlay.appendChild(menuBg);
    // Game title
    const title = document.createElement("h1");
    title.textContent = "";
    title.style.color = "#fff";
    title.style.fontSize = "4rem";
    title.style.textShadow = "0 0 24px #00ffdd, 0 0 8px #000";
    title.style.position = "relative";
    title.style.zIndex = 1;
    menuOverlay.appendChild(title);
    // Main menu buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.flexDirection = "column";
    buttonContainer.style.gap = "1.2rem";
    buttonContainer.style.marginTop = "2.5rem";
    buttonContainer.style.position = "relative";
    buttonContainer.style.zIndex = 1;

    function makeMenuButton(label, color) {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.style.fontSize = "2rem";
      btn.style.padding = "1rem 2.5rem";
      btn.style.background = "rgba(0,0,0,0.7)";
      btn.style.color = color;
      btn.style.border = `2px solid ${color}`;
      btn.style.borderRadius = "12px";
      btn.style.cursor = "pointer";
      btn.style.boxShadow = "0 0 24px #000";
      btn.style.transition = "background 0.2s, color 0.2s";
      btn.addEventListener("mouseover",()=>{btn.style.background="rgba(0,0,0,0.9)";});
      btn.addEventListener("mouseout",()=>{btn.style.background="rgba(0,0,0,0.7)";});
      return btn;
    }

    // Add main menu buttons (Play and Protocols)
    const playBtn = makeMenuButton("Play", "#fff");
    const protocolBtn = makeMenuButton("Protocols", "#00ffdd");
    const waveEditorBtn = makeMenuButton("Wave Editor", "#6cf0ff");
    const enemyGlossaryBtn = makeMenuButton("Enemy Glossary", "#8de7ff");
    buttonContainer.appendChild(playBtn);
    buttonContainer.appendChild(protocolBtn);
    buttonContainer.appendChild(enemyGlossaryBtn);
    buttonContainer.appendChild(waveEditorBtn);
    menuOverlay.appendChild(buttonContainer);
    document.body.appendChild(menuOverlay);
    if (window._playMenuAmbienceOnShowMenu) playMenuAmbience();

    // Store reference to main menu for back button
    window._showMainMenu = () => {
      menuOverlay.style.display = "block";
    };

    // Play button: show difficulty selection
    playBtn.addEventListener("click", function() {
      menuOverlay.style.display = "none";
      showDifficultyMenu();
    });

    // Protocols button: show protocol menu
    protocolBtn.addEventListener("click", function() {
      menuOverlay.remove();
      showProtocolMenu();
      window._showMainMenu = () => {
        showMenu();
      };
    });

    waveEditorBtn.addEventListener("click", function() {
      menuOverlay.remove();
      if (window.SentinelEditor && typeof window.SentinelEditor.showWaveEditor === "function") {
        window.SentinelEditor.showWaveEditor();
      }
      window._showMainMenu = () => {
        showMenu();
      };
    });

    enemyGlossaryBtn.addEventListener("click", function() {
      menuOverlay.remove();
      showEnemyGlossary();
      window._showMainMenu = () => {
        showMenu();
      };
    });
  }

  // Difficulty selection menu
  function showDifficultyMenu() {
    const diffOverlay = document.createElement("div");
    diffOverlay.id = "difficultyOverlay";
    diffOverlay.style.position = "fixed";
    diffOverlay.style.left = 0;
    diffOverlay.style.top = 0;
    diffOverlay.style.width = "100vw";
    diffOverlay.style.height = "100vh";
    diffOverlay.style.background = "#000";
    diffOverlay.style.display = "flex";
    diffOverlay.style.flexDirection = "column";
    diffOverlay.style.justifyContent = "center";
    diffOverlay.style.alignItems = "center";
    diffOverlay.style.zIndex = 1000;
    // Background image
    const diffBg = document.createElement("img");
    diffBg.src = "titlescreen.png";
    diffBg.style.position = "absolute";
    diffBg.style.left = "50%";
    diffBg.style.top = "50%";
    diffBg.style.transform = "translate(-50%, -50%)";
    diffBg.style.width = "1024px";
    diffBg.style.height = "768px";
    diffBg.style.objectFit = "fill";

    // Gradient overlay
    const diffGradient = document.createElement("div");
    diffGradient.style.position = "absolute";
    diffGradient.style.left = "0";
    diffGradient.style.bottom = "0";
    diffGradient.style.width = "1024px";
    diffGradient.style.height = "180px";
    diffGradient.style.background = "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 100%)";
    diffGradient.style.pointerEvents = "none";
    diffGradient.style.zIndex = 1;
    diffOverlay.appendChild(diffGradient);
    diffBg.style.zIndex = 0;
    diffOverlay.appendChild(diffBg);

    // Back button - positioned absolutely inside the menu area
    const backBtn = document.createElement("button");
    backBtn.textContent = "← Back";
    backBtn.style.position = "absolute";
    backBtn.style.top = "120px";
    backBtn.style.left = "calc(50% - 512px + 16px)";
    backBtn.style.transform = "none";
    backBtn.style.fontSize = "1.2rem";
    backBtn.style.padding = "0.5rem 1.5rem";
    backBtn.style.background = "rgba(0,0,0,0.7)";
    backBtn.style.color = "#fff";
    backBtn.style.border = "2px solid #fff";
    backBtn.style.borderRadius = "8px";
    backBtn.style.cursor = "pointer";
    backBtn.style.zIndex = 2;
    backBtn.style.transition = "background 0.2s";
    backBtn.addEventListener("mouseover", () => backBtn.style.background = "rgba(0,0,0,0.9)");
    backBtn.addEventListener("mouseout", () => backBtn.style.background = "rgba(0,0,0,0.7)");
    diffOverlay.appendChild(backBtn);

    // Title
    const title = document.createElement("h2");
    title.textContent = "SELECT DIFFICULTY";
    title.style.color = "#fff";
    title.style.fontSize = "3rem";
    title.style.textShadow = "0 0 24px #00ffdd, 0 0 8px #000";
    title.style.position = "relative";
    title.style.zIndex = 1;
    title.style.marginBottom = "2rem";
    diffOverlay.appendChild(title);

    // Difficulty buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.flexDirection = "column";
    buttonContainer.style.gap = "1.2rem";
    buttonContainer.style.position = "relative";
    buttonContainer.style.zIndex = 1;

    function makeButton(label, color) {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.style.fontSize = "2rem";
      btn.style.padding = "1rem 2.5rem";
      btn.style.background = "rgba(0,0,0,0.7)";
      btn.style.color = color;
      btn.style.border = `2px solid ${color}`;
      btn.style.borderRadius = "12px";
      btn.style.cursor = "pointer";
      btn.style.boxShadow = "0 0 24px #000";
      btn.style.transition = "background 0.2s";
      btn.addEventListener("mouseover",()=>{btn.style.background="rgba(0,0,0,0.9)";});
      btn.addEventListener("mouseout",()=>{btn.style.background="rgba(0,0,0,0.7)";});
      return btn;
    }

    const normalBtn = makeButton("Normal", "#fff");
    const hardcoreBtn = makeButton("Hardcore", "#ffb300");
    const apocalypseBtn = makeButton("Apocalypse", "#ff3c3c");
    buttonContainer.appendChild(normalBtn);
    buttonContainer.appendChild(hardcoreBtn);
    buttonContainer.appendChild(apocalypseBtn);
    diffOverlay.appendChild(buttonContainer);
    document.body.appendChild(diffOverlay);

    function startGame(difficulty, startStatPoints, startHealth) {
      window.sentinelDifficulty = difficulty;
      ProtocolSystem.setStarters(window._pendingStarterProtocols || []);
      showMenuScreen = false;
      fadeOutMenuAmbience();
      restartGame();
      statPoints = startStatPoints;
      player.health = player.maxHealth = startHealth;
      spawnWave();
      gameStarted = true;
    }

    function showStarterProtocolModal(difficulty, startStatPoints, startHealth) {
      const discoveredProtocols = ProtocolSystem.getDiscovered();
      const starterOverlay = document.createElement("div");
      starterOverlay.id = "starterProtocolOverlay";
      starterOverlay.style.position = "fixed";
      starterOverlay.style.left = 0;
      starterOverlay.style.top = 0;
      starterOverlay.style.width = "100vw";
      starterOverlay.style.height = "100vh";
      starterOverlay.style.background = "rgba(0,0,0,0.95)";
      starterOverlay.style.display = "flex";
      starterOverlay.style.flexDirection = "column";
      starterOverlay.style.justifyContent = "center";
      starterOverlay.style.alignItems = "center";
      starterOverlay.style.zIndex = 1002;

      const panel = document.createElement("div");
      panel.style.width = "860px";
      panel.style.maxHeight = "680px";
      panel.style.background = "rgba(0, 20, 30, 0.98)";
      panel.style.border = "2px solid #00ffdd";
      panel.style.borderRadius = "10px";
      panel.style.boxShadow = "0 0 28px rgba(0, 255, 221, 0.35)";
      panel.style.display = "flex";
      panel.style.flexDirection = "column";
      panel.style.padding = "20px";
      starterOverlay.appendChild(panel);

      const title = document.createElement("h2");
      title.textContent = "SELECT STARTER PROTOCOLS";
      title.style.color = "#00ffdd";
      title.style.margin = "0 0 8px 0";
      title.style.textAlign = "center";
      panel.appendChild(title);

      const subtitle = document.createElement("div");
      subtitle.textContent = "Choose up to 2 permanently discovered protocols to start this run.";
      subtitle.style.color = "#aaf6ff";
      subtitle.style.fontSize = "0.95rem";
      subtitle.style.textAlign = "center";
      subtitle.style.marginBottom = "14px";
      panel.appendChild(subtitle);

      const selectionCount = document.createElement("div");
      selectionCount.style.color = "#00ffdd";
      selectionCount.style.textAlign = "center";
      selectionCount.style.marginBottom = "10px";
      panel.appendChild(selectionCount);

      // Add total stat change display
      const totalStatDiv = document.createElement("div");
      totalStatDiv.style.color = "#aaf6ff";
      totalStatDiv.style.textAlign = "center";
      totalStatDiv.style.marginBottom = "10px";
      panel.appendChild(totalStatDiv);

      const content = document.createElement("div");
      content.style.flex = "1";
      content.style.overflowY = "auto";
      content.style.border = "1px solid rgba(0,255,221,0.25)";
      content.style.borderRadius = "8px";
      content.style.padding = "12px";
      panel.appendChild(content);

      let selected = Array.isArray(ProtocolSystem.starterProtocols)
        ? ProtocolSystem.starterProtocols.filter(name => discoveredProtocols.includes(name)).slice(0, 2)
        : [];
      const refreshCount = () => {
        selectionCount.textContent = `Selected: ${selected.length}/2`;
        // Calculate and display total stat change for selected starters, with color
        const statTotals = { Range: 0, Power: 0, Intensity: 0, Movement: 0, Health: 0, Pickup: 0 };
        selected.forEach(protocolName => {
          const mods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
            ? ProtocolSystem.getProtocolEffectiveMods(protocolName)
            : (PROTOCOLS[protocolName]?.statMods || {});
          Object.entries(mods).forEach(([stat, value]) => {
            if (statTotals.hasOwnProperty(stat)) statTotals[stat] += value;
          });
        });
        // Format the stat totals for display with color
        const statOrder = ["Range", "Power", "Intensity", "Movement", "Health", "Pickup"];
        const statStrings = statOrder.map(stat => {
          const v = statTotals[stat];
          let color = v > 0 ? "#00ff88" : v < 0 ? "#ff4444" : "#bbbbbb";
          let sign = v > 0 ? "+" : (v < 0 ? "" : "");
          return `<span style='color:${color}; font-weight:bold;'>${sign}${v} ${stat}</span>`;
        });
        totalStatDiv.innerHTML = `${statStrings.join(", ")}`;
      };

      if (discoveredProtocols.length === 0) {
        const noneMsg = document.createElement("div");
        noneMsg.textContent = "No protocols discovered yet. Start run with 0 starter protocols.";
        noneMsg.style.color = "#ffcc88";
        noneMsg.style.textAlign = "center";
        noneMsg.style.padding = "24px";
        content.appendChild(noneMsg);
      } else {
        const familyGroups = { "Targeting": [], "Overdrive": [], "Utility": [] };
        discoveredProtocols.forEach(protocolName => {
          const family = PROTOCOLS[protocolName]?.family;
          if (familyGroups[family]) {
            familyGroups[family].push(protocolName);
          }
        });

        Object.entries(familyGroups).forEach(([familyName, protocols]) => {
          if (protocols.length === 0) return;

          const familyHeader = document.createElement("div");
          familyHeader.textContent = familyName;
          familyHeader.style.color = "#00ffdd";
          familyHeader.style.fontSize = "1rem";
          familyHeader.style.fontWeight = "bold";
          familyHeader.style.margin = "8px 4px 8px 4px";
          familyHeader.style.borderBottom = "1px solid rgba(0,255,221,0.45)";
          familyHeader.style.paddingBottom = "4px";
          content.appendChild(familyHeader);

          const grid = document.createElement("div");
          grid.style.display = "grid";
          grid.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
          grid.style.gap = "10px";
          grid.style.marginBottom = "12px";
          content.appendChild(grid);

          protocols.forEach(protocolName => {

            const proto = PROTOCOLS[protocolName];
            const rawUpgradeTier = ProtocolSystem.protocolBoard[protocolName]?.upgradeTier;
            const upgradeTier = (typeof ProtocolSystem.normalizeUpgradeTier === "function")
              ? ProtocolSystem.normalizeUpgradeTier(rawUpgradeTier)
              : (rawUpgradeTier || (ProtocolSystem.upgradeTiers?.[0] || "Trivial"));
            const effectiveStarterMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
              ? ProtocolSystem.getProtocolEffectiveMods(protocolName)
              : proto.statMods;
            const card = document.createElement("button");
            card.type = "button";
            card.style.position = "relative";
            card.style.textAlign = "left";
            card.style.padding = "10px";
            card.style.borderRadius = "8px";
            card.style.border = "2px solid #00ffdd";
            card.style.background = "rgba(0, 77, 92, 0.7)";
            card.style.color = "#00ffdd";
            card.style.cursor = "pointer";
            card.style.transition = "all 0.15s";

            const mods = Object.entries(effectiveStarterMods)
              .filter(([_, v]) => v !== 0)
              .map(([k, v]) => `${v > 0 ? "+" : ""}${v} ${k}`)
              .join(", ");

            card.innerHTML = `<div style="font-weight:bold; margin-bottom:4px;">${protocolName}</div>
                              <div style="font-size:0.8rem; color:#c8ffff; margin-top:3px;">${upgradeTier}</div>            
                              <div style="font-size:0.85rem; color:#aaf6ff; margin-top:3px;">${proto.rarity} • ${proto.tier}</div>
                              <div style="font-size:0.8rem; color:#aaf6ff; margin-top:4px;">${mods || "No mods"}</div>`;

            // Tooltip: compare stat change if selected vs unselected
            card.addEventListener("mouseenter", () => {
              // Show stat difference using: (x - a) + y and (x - b) + y
              const statOrder = ["Range", "Power", "Intensity", "Movement", "Health", "Pickup"];
              const statShort = { Range: "Rng:", Power: "Pwr:", Intensity: "Int:", Movement: "Mov:", Health: "HP:", Pickup: "Pick:" };
              const hoveredMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
                ? ProtocolSystem.getProtocolEffectiveMods(protocolName)
                : (PROTOCOLS[protocolName]?.statMods || {});
              let html = `<div style='min-width:220px; max-width:340px; font-family:sans-serif; font-size:1em; background:rgba(0,20,30,0.98); border-radius:10px; border:2px solid #00ffdd; box-shadow:0 0 18px #00ffdd44; padding:12px 14px;'>`;
              if (selected.length === 0) {
                html += `<div style='color:#00ffdd; font-size:1.01em; font-weight:bold; margin-bottom:4px;'>No protocol selected</div>`;
              } else if (selected.length === 1) {
                // Only one selected: show (x - a) + y, where x = a
                const aName = selected[0];
                const aMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
                  ? ProtocolSystem.getProtocolEffectiveMods(aName)
                  : (PROTOCOLS[aName]?.statMods || {});
                // x = a
                // (x - a) + y = y
                html += `<div style='color:#00ffdd; font-size:1.01em; font-weight:bold; margin-bottom:2px;'>If replacing: ${aName}</div>`;
                html += `<div style='font-size:0.97em; margin-bottom:6px;'>`;
                html += `<div style='display:flex; flex-direction:column; gap:2px;'>`;
                html += statOrder.map(stat => {
                  const x = Number(aMods[stat]) || 0;
                  const c = Number(hoveredMods[stat]) || 0;
                  let color = c > x ? "#00ff88" : c < x ? "#ff4444" : "#bbbbbb";
                  let cStr = c < 0 ? c.toString() : c.toString();
                  return `<div style='display:flex; align-items:center;'><span style='width:70px; display:inline-block;'>${statShort[stat]}</span> <span style='color:#bbbbbb; min-width:18px; display:inline-block; text-align:right;'>${x}</span> <span style='margin:0 4px;'>→</span> <span style='color:${color}; min-width:18px; display:inline-block; text-align:right;'>${cStr}</span></div>`;
                }).join("");
                html += `</div>`;
                html += `</div>`;
              } else if (selected.length === 2) {
                // Two selected: show (x - a) + y and (x - b) + y
                const aName = selected[0];
                const bName = selected[1];
                const aMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
                  ? ProtocolSystem.getProtocolEffectiveMods(aName)
                  : (PROTOCOLS[aName]?.statMods || {});
                const bMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
                  ? ProtocolSystem.getProtocolEffectiveMods(bName)
                  : (PROTOCOLS[bName]?.statMods || {});
                // x = a + b
                // (x - a) + y = c
                html += `<div style='color:#00ffdd; font-size:1.01em; font-weight:bold; margin-bottom:2px;'>If replaced: ${aName}</div>`;
                html += `<div style='font-size:0.97em; margin-bottom:6px;'>`;
                html += `<div style='display:flex; flex-direction:column; gap:2px;'>`;
                html += statOrder.map(stat => {
                  const a = Number(aMods[stat]) || 0;
                  const b = Number(bMods[stat]) || 0;
                  const y = Number(hoveredMods[stat]) || 0;
                  const x = a + b;
                  const c = b + y;
                  let color = c > x ? "#00ff88" : c < x ? "#ff4444" : "#bbbbbb";
                  let cStr = c < 0 ? c.toString() : c.toString();
                  return `<div style='display:flex; align-items:center;'><span style='width:70px; display:inline-block;'>${statShort[stat]}</span> <span style='color:#bbbbbb; min-width:18px; display:inline-block; text-align:right;'>${x}</span> <span style='margin:0 4px;'>→</span> <span style='color:${color}; min-width:18px; display:inline-block; text-align:right;'>${cStr}</span></div>`;
                }).join("");
                html += `</div>`;
                html += `</div>`;
                // (x - b) + y = d
                html += `<div style='color:#00ffdd; font-size:1.01em; font-weight:bold; margin-bottom:2px;'>If replaced: ${bName}</div>`;
                html += `<div style='font-size:0.97em; margin-bottom:6px;'>`;
                html += `<div style='display:flex; flex-direction:column; gap:2px;'>`;
                html += statOrder.map(stat => {
                  const a = Number(aMods[stat]) || 0;
                  const b = Number(bMods[stat]) || 0;
                  const y = Number(hoveredMods[stat]) || 0;
                  const x = a + b;
                  const d = a + y;
                  let color = d > x ? "#00ff88" : d < x ? "#ff4444" : "#bbbbbb";
                  let dStr = d < 0 ? d.toString() : d.toString();
                  return `<div style='display:flex; align-items:center;'><span style='width:70px; display:inline-block;'>${statShort[stat]}</span> <span style='color:#bbbbbb; min-width:18px; display:inline-block; text-align:right;'>${x}</span> <span style='margin:0 4px;'>→</span> <span style='color:${color}; min-width:18px; display:inline-block; text-align:right;'>${dStr}</span></div>`;
                }).join("");
                html += `</div>`;
                html += `</div>`;
              }
              html += `</div>`;
              let tooltip = document.createElement("div");
              tooltip.innerHTML = html;
              tooltip.style.position = "fixed";
              tooltip.style.zIndex = 9999;
              tooltip.style.pointerEvents = "none";
              document.body.appendChild(tooltip);
              function moveTooltip(e) {
                tooltip.style.left = (e.clientX + 18) + "px";
                tooltip.style.top = (e.clientY + 8) + "px";
              }
              moveTooltip(window.event || {});
              card._tooltip = tooltip;
              card.addEventListener("mousemove", moveTooltip);
            });
            card.addEventListener("mouseleave", () => {
              if (card._tooltip) {
                document.body.removeChild(card._tooltip);
                card._tooltip = null;
              }
              card.removeEventListener("mousemove", () => {});
            });

            const favoriteBadge = document.createElement("div");
            favoriteBadge.textContent = "✶";
            favoriteBadge.title = "Toggle favorite";
            favoriteBadge.style.position = "absolute";
            favoriteBadge.style.top = "8px";
            favoriteBadge.style.right = "8px";
            favoriteBadge.style.width = "20px";
            favoriteBadge.style.height = "20px";
            favoriteBadge.style.boxSizing = "border-box";
            favoriteBadge.style.borderRadius = "50%";
            favoriteBadge.style.border = "1px solid #00ffdd";
            favoriteBadge.style.background = "rgba(0, 35, 40, 0.92)";
            favoriteBadge.style.fontWeight = "bold";
            favoriteBadge.style.fontSize = "1.1rem";
            favoriteBadge.style.lineHeight = "1";
            favoriteBadge.style.display = "flex";
            favoriteBadge.style.alignItems = "center";
            favoriteBadge.style.justifyContent = "center";
            favoriteBadge.style.boxShadow = "0 0 8px rgba(0,255,221,0.4)";
            favoriteBadge.style.cursor = "pointer";
            card.appendChild(favoriteBadge);

            const selectedBadge = document.createElement("div");
            selectedBadge.textContent = "✓";
            selectedBadge.title = "Starter protocol selected";
            selectedBadge.style.position = "absolute";
            selectedBadge.style.top = "8px";
            selectedBadge.style.right = "32px";
            selectedBadge.style.width = "18px";
            selectedBadge.style.height = "18px";
            selectedBadge.style.borderRadius = "50%";
            selectedBadge.style.border = "1px solid #00ffdd";
            selectedBadge.style.background = "rgba(0, 35, 40, 0.92)";
            selectedBadge.style.color = "#00ffdd";
            selectedBadge.style.fontWeight = "bold";
            selectedBadge.style.fontSize = "0.85rem";
            selectedBadge.style.lineHeight = "1";
            selectedBadge.style.display = "none";
            selectedBadge.style.alignItems = "center";
            selectedBadge.style.justifyContent = "center";
            selectedBadge.style.boxShadow = "0 0 8px rgba(0,255,221,0.4)";
            selectedBadge.style.pointerEvents = "none";
            card.appendChild(selectedBadge);

            const applyFavoriteBadgeState = () => {
              const isFavorite = typeof ProtocolSystem.isFavorite === "function"
                ? ProtocolSystem.isFavorite(protocolName)
                : false;
              favoriteBadge.style.color = isFavorite ? "#ffd84d" : "#4e696f";
              favoriteBadge.style.textShadow = isFavorite ? "0 0 8px rgba(255,216,77,0.85)" : "none";
            };
            applyFavoriteBadgeState();

            favoriteBadge.addEventListener("click", (evt) => {
              evt.stopPropagation();
              if (typeof ProtocolSystem.toggleFavorite === "function") {
                ProtocolSystem.toggleFavorite(protocolName);
                applyFavoriteBadgeState();
              }
            });

            const renderCardState = () => {
              const isSelected = selected.includes(protocolName);
              card.style.background = isSelected ? "rgba(0, 255, 221, 0.22)" : "rgba(0, 77, 92, 0.7)";
              card.style.borderColor = isSelected ? "#ffffff" : "#00ffdd";
              card.style.boxShadow = isSelected ? "0 0 14px rgba(255,255,255,0.35)" : "none";
              selectedBadge.style.display = isSelected ? "flex" : "none";
            };
            renderCardState();

            card.addEventListener("click", () => {

              const idx = selected.indexOf(protocolName);
              if (idx >= 0) {
                // Deselect if already selected
                selected.splice(idx, 1);
                if (typeof ProtocolSystem.setStarters === "function") {
                  ProtocolSystem.setStarters([...selected]);
                } else {
                  ProtocolSystem.starterProtocols = [...selected];
                }
                renderCardState();
                refreshCount();
                return;
              }
              if (selected.length < 2) {
                // Add if under limit
                selected.push(protocolName);
                if (typeof ProtocolSystem.setStarters === "function") {
                  ProtocolSystem.setStarters([...selected]);
                } else {
                  ProtocolSystem.starterProtocols = [...selected];
                }
                renderCardState();
                refreshCount();
                return;
              }
              // If already 2 selected, prompt to replace
              const modal = document.createElement("div");
              modal.style.position = "fixed";
              modal.style.left = 0;
              modal.style.top = 0;
              modal.style.width = "100vw";
              modal.style.height = "100vh";
              modal.style.background = "rgba(0,0,0,0.7)";
              modal.style.display = "flex";
              modal.style.alignItems = "center";
              modal.style.justifyContent = "center";
              modal.style.zIndex = 2000;
              const box = document.createElement("div");
              box.style.background = "#01222b";
              box.style.border = "2px solid #00ffdd";
              box.style.borderRadius = "10px";
              box.style.padding = "28px 32px";
              box.style.display = "flex";
              box.style.flexDirection = "column";
              box.style.alignItems = "center";
              box.style.boxShadow = "0 0 18px #00ffdd55";
              const msg = document.createElement("div");
              msg.textContent = "Starter limit reached. Replace which starter?";
              msg.style.color = "#00ffdd";
              msg.style.fontWeight = "bold";
              msg.style.fontSize = "1.1rem";
              msg.style.marginBottom = "18px";
              box.appendChild(msg);
              const btnRow = document.createElement("div");
              btnRow.style.display = "flex";
              btnRow.style.gap = "18px";
              btnRow.style.marginBottom = "10px";
              selected.forEach(selName => {
                // Button container for name and stat change
                const btnContainer = document.createElement("div");
                btnContainer.style.display = "flex";
                btnContainer.style.flexDirection = "column";
                btnContainer.style.alignItems = "center";
                btnContainer.style.minWidth = "160px";
                btnContainer.style.maxWidth = "220px";
                btnContainer.style.margin = "0 2px";

                // Protocol name button
                const btn = document.createElement("button");
                btn.textContent = selName;
                btn.style.padding = "0.6rem 1.2rem";
                btn.style.background = "rgba(0,0,0,0.7)";
                btn.style.color = "#00ffdd";
                btn.style.border = "2px solid #00ffdd";
                btn.style.borderRadius = "8px";
                btn.style.fontSize = "1rem";
                btn.style.cursor = "pointer";
                btn.style.marginBottom = "6px";
                btn.addEventListener("click", () => {
                  // Replace selected starter in-place and update UI
                  const idxToReplace = selected.indexOf(selName);
                  if (idxToReplace !== -1) {
                    selected.splice(idxToReplace, 1, protocolName);
                    if (typeof ProtocolSystem.setStarters === "function") {
                      ProtocolSystem.setStarters([...selected]);
                    } else {
                      ProtocolSystem.starterProtocols = [...selected];
                    }
                    document.body.removeChild(modal);
                    // Re-render all protocol cards' state and selection count
                    const allCards = content.querySelectorAll('button');
                    allCards.forEach(cardBtn => {
                      if (typeof cardBtn.renderCardState === 'function') cardBtn.renderCardState();
                    });
                    refreshCount();
                  }
                });

                // --- Stat comparison below protocol name, 2-column layout ---
                const statOrder = ["Range", "Power", "Intensity", "Movement", "Health", "Pickup"];
                const statShort = { Range: "Rng:", Power: "Pwr:", Intensity: "Int:", Movement: "Mov:", Health: "HP:", Pickup: "Pick:" };
                const aName = selName;
                const bName = selected.find(n => n !== selName);
                const aMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
                  ? ProtocolSystem.getProtocolEffectiveMods(aName)
                  : (PROTOCOLS[aName]?.statMods || {});
                const bMods = bName && ((typeof ProtocolSystem.getProtocolEffectiveMods === "function")
                  ? ProtocolSystem.getProtocolEffectiveMods(bName)
                  : (PROTOCOLS[bName]?.statMods || {}));
                const hoveredMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
                  ? ProtocolSystem.getProtocolEffectiveMods(protocolName)
                  : (PROTOCOLS[protocolName]?.statMods || {});
                // x = a + b
                // (x - a) + y = c
                let statHtml = `<div style='margin-bottom:2px; font-size:0.97em; background:rgba(0,20,30,0.92); border-radius:8px; border:1.5px solid #00ffdd; box-shadow:0 0 8px #00ffdd33; padding:7px 10px; width:100%;'>`;
                statHtml += `<div style='color:#00ffdd; font-weight:bold; margin-bottom:2px; text-align:center;'>Result if replaced:</div>`;
                statHtml += `<div style='display:flex; flex-direction:column; gap:2px;'>`;
                statOrder.forEach((stat, i) => {
                  const a = Number(aMods[stat]) || 0;
                  const b = bMods ? (Number(bMods[stat]) || 0) : 0;
                  const y = Number(hoveredMods[stat]) || 0;
                  const x = a + b;
                  const c = b + y;
                  let color = c > x ? "#00ff88" : c < x ? "#ff4444" : "#bbbbbb";
                  let cStr = c < 0 ? c.toString() : c.toString();
                  statHtml += `<div style='display:flex; align-items:center;'><span style='width:54px; display:inline-block;'>${statShort[stat]}</span> <span style='color:#bbbbbb; min-width:16px; display:inline-block; text-align:right;'>${x}</span> <span style='margin:0 3px;'>→</span> <span style='color:${color}; min-width:16px; display:inline-block; text-align:right;'>${cStr}</span></div>`;
                });
                statHtml += `</div></div>`;
                btnContainer.appendChild(btn);
                btnContainer.insertAdjacentHTML('beforeend', statHtml);
                btnRow.appendChild(btnContainer);
              });
              box.appendChild(btnRow);
              const cancelBtn = document.createElement("button");
              cancelBtn.textContent = "Cancel";
              cancelBtn.style.padding = "0.5rem 1.1rem";
              cancelBtn.style.background = "rgba(0,0,0,0.5)";
              cancelBtn.style.color = "#fff";
              cancelBtn.style.border = "1.5px solid #aaa";
              cancelBtn.style.borderRadius = "8px";
              cancelBtn.style.fontSize = "1rem";
              cancelBtn.style.marginTop = "8px";
              cancelBtn.style.cursor = "pointer";
              cancelBtn.addEventListener("click", () => {
                document.body.removeChild(modal);
              });
              box.appendChild(cancelBtn);
              modal.appendChild(box);
              document.body.appendChild(modal);
            });

            // Attach renderCardState to card for external refresh
            card.renderCardState = renderCardState;
            grid.appendChild(card);
          });
        });
      }

      refreshCount();

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.justifyContent = "center";
      actions.style.alignItems = "center";
      actions.style.gap = "18px";
      actions.style.marginTop = "18px";
      panel.appendChild(actions);

      const backBtn2 = document.createElement("button");
      backBtn2.textContent = "← Back";
      backBtn2.style.fontSize = "1rem";
      backBtn2.style.padding = "0.7rem 1.2rem";
      backBtn2.style.background = "rgba(0,0,0,0.7)";
      backBtn2.style.color = "#fff";
      backBtn2.style.border = "2px solid #fff";
      backBtn2.style.borderRadius = "8px";
      backBtn2.style.cursor = "pointer";
      actions.appendChild(backBtn2);

      // Protocol Database button
      const dbBtn = document.createElement("button");
      dbBtn.textContent = "Protocol Database";
      dbBtn.style.fontSize = "1rem";
      dbBtn.style.padding = "0.7rem 1.2rem";
      dbBtn.style.background = "rgba(0,0,0,0.7)";
      dbBtn.style.color = "#00ffdd";
      dbBtn.style.border = "2px solid #00ffdd";
      dbBtn.style.borderRadius = "8px";
      dbBtn.style.cursor = "pointer";
      dbBtn.style.margin = "0 18px";
      actions.appendChild(dbBtn);

      const startBtn = document.createElement("button");
      startBtn.textContent = "Start Run";
      startBtn.style.fontSize = "1rem";
      startBtn.style.padding = "0.7rem 1.2rem";
      startBtn.style.background = "rgba(0,0,0,0.7)";
      startBtn.style.color = "#00ffdd";
      startBtn.style.border = "2px solid #00ffdd";
      startBtn.style.borderRadius = "8px";
      startBtn.style.cursor = "pointer";
      actions.appendChild(startBtn);

      backBtn2.addEventListener("click", () => {
        starterOverlay.remove();
        showDifficultyMenu();
      });

      dbBtn.addEventListener("click", () => {
        starterOverlay.remove();
        showProtocolMenu();
      });

      startBtn.addEventListener("click", () => {
        window._pendingStarterProtocols = [...selected];
        starterOverlay.remove();
        startGame(difficulty, startStatPoints, startHealth);
      });

      document.body.appendChild(starterOverlay);
    }

    normalBtn.addEventListener("click", () => {
      diffOverlay.remove();
      showStarterProtocolModal("Normal", 5, 10);
    });
    hardcoreBtn.addEventListener("click", () => {
      diffOverlay.remove();
      showStarterProtocolModal("Hardcore", 0, 5);
    });
    apocalypseBtn.addEventListener("click", () => {
      diffOverlay.remove();
      showStarterProtocolModal("Apocalypse", 5, 5);
    });

    // Back button
    backBtn.addEventListener("click", () => {
      diffOverlay.remove();
      showMenu();
    });
  }

  // Protocol menu
  function showProtocolMenu(initialScrollTop = null) {
    const menuOverlay = document.createElement("div");
    const canvasRect = canvas.getBoundingClientRect();
    menuOverlay.id = "protocolMenuOverlay";
    menuOverlay.style.position = "fixed";
    menuOverlay.style.left = `${canvasRect.left}px`;
    menuOverlay.style.top = `${canvasRect.top}px`;
    menuOverlay.style.transform = "none";
    menuOverlay.style.width = `${canvasRect.width}px`;
    menuOverlay.style.height = `${canvasRect.height}px`;
    menuOverlay.style.background = "rgba(0, 20, 30, 0.98)";
    menuOverlay.style.border = "2px solid #00ffdd";
    menuOverlay.style.borderRadius = "8px";
    menuOverlay.style.display = "flex";
    menuOverlay.style.flexDirection = "column";
    menuOverlay.style.justifyContent = "flex-start";
    menuOverlay.style.alignItems = "center";
    menuOverlay.style.zIndex = 1001;
    menuOverlay.style.boxShadow = "0 0 30px rgba(0, 255, 221, 0.3)";
    menuOverlay.style.fontFamily = "sans-serif";
    menuOverlay.style.overflow = "visible";

    // Hide scrollbar CSS for webkit browsers
    const style = document.createElement("style");
    style.textContent = ".protocol-scroll::-webkit-scrollbar { display: none; }";
    menuOverlay.appendChild(style);

    // Back button header section
    const headerSection = document.createElement("div");
    headerSection.style.width = "100%";
    headerSection.style.height = "auto";
    headerSection.style.padding = "10px 15px";
    headerSection.style.display = "flex";
    headerSection.style.alignItems = "center";
    headerSection.style.justifyContent = "flex-start";
    headerSection.style.position = "relative";
    headerSection.style.zIndex = 10;

    // Back button
    const backBtn = document.createElement("button");
    backBtn.textContent = "← Back to Menu";
    backBtn.style.fontSize = "0.9rem";
    backBtn.style.marginLeft = "12px";
    backBtn.style.padding = "0.4rem 1rem";
    backBtn.style.background = "rgba(0,0,0,0.7)";
    backBtn.style.color = "#00ffdd";
    backBtn.style.border = "2px solid #00ffdd";
    backBtn.style.borderRadius = "6px";
    backBtn.style.cursor = "pointer";
    backBtn.style.transition = "background 0.2s";
    backBtn.addEventListener("mouseover", () => backBtn.style.background = "rgba(0,0,0,0.9)");
    backBtn.addEventListener("mouseout", () => backBtn.style.background = "rgba(0,0,0,0.7)");
    headerSection.appendChild(backBtn);

    const bytesBadge = document.createElement("div");
    const bytesValue = Math.max(0, Math.floor(typeof totalCollectedBytes === "number" ? totalCollectedBytes : loadCollectedBytes()));
    bytesBadge.textContent = `Bytes: ${bytesValue}`;
    bytesBadge.style.position = "absolute";
    bytesBadge.style.right = "18px";
    bytesBadge.style.top = "10px";
    bytesBadge.style.color = "#00ffdd";
    bytesBadge.style.fontWeight = "bold";
    bytesBadge.style.fontSize = "1rem";
    bytesBadge.style.background = "rgba(0, 0, 0, 0)";
    bytesBadge.style.borderRadius = "6px";
    bytesBadge.style.padding = "6px 20px";
    headerSection.appendChild(bytesBadge);

    menuOverlay.appendChild(headerSection);

    function showUpgradeConfirmModal(message, onConfirm) {
      const confirmOverlay = document.createElement("div");
      confirmOverlay.style.position = "fixed";
      confirmOverlay.style.left = "0";
      confirmOverlay.style.top = "0";
      confirmOverlay.style.width = "100vw";
      confirmOverlay.style.height = "100vh";
      confirmOverlay.style.background = "rgba(0, 0, 0, 0.74)";
      confirmOverlay.style.display = "flex";
      confirmOverlay.style.alignItems = "center";
      confirmOverlay.style.justifyContent = "center";
      confirmOverlay.style.zIndex = "1105";

      const confirmPanel = document.createElement("div");
      confirmPanel.style.width = "min(460px, 90vw)";
      confirmPanel.style.background = "rgba(0, 20, 30, 0.98)";
      confirmPanel.style.border = "2px solid #00ffdd";
      confirmPanel.style.borderRadius = "10px";
      confirmPanel.style.boxShadow = "0 0 28px rgba(0, 255, 221, 0.35)";
      confirmPanel.style.padding = "16px";
      confirmPanel.style.color = "#c8ffff";
      confirmPanel.style.fontFamily = "sans-serif";
      confirmOverlay.appendChild(confirmPanel);

      // Allow customizing modal for downgrade
      const isDowngrade = arguments.length > 2 && arguments[2] === true;
      const confirmTitle = document.createElement("div");
      confirmTitle.textContent = isDowngrade ? "CONFIRM DOWNGRADE" : "CONFIRM UPGRADE";
      confirmTitle.style.color = isDowngrade ? "#ff6666" : "#00ffdd";
      confirmTitle.style.fontWeight = "bold";
      confirmTitle.style.fontSize = "1.05rem";
      confirmTitle.style.marginBottom = "10px";
      confirmPanel.appendChild(confirmTitle);

      const confirmMessage = document.createElement("div");
      confirmMessage.textContent = message;
      confirmMessage.style.color = isDowngrade ? "#ffb3b3" : "#aaf6ff";
      confirmMessage.style.fontSize = "0.95rem";
      confirmMessage.style.lineHeight = "1.4";
      confirmMessage.style.marginBottom = "14px";
      confirmPanel.appendChild(confirmMessage);

      const actionRow = document.createElement("div");
      actionRow.style.display = "flex";
      actionRow.style.justifyContent = "flex-end";
      actionRow.style.gap = "8px";
      confirmPanel.appendChild(actionRow);

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.padding = "0.5rem 0.85rem";
      cancelBtn.style.borderRadius = "6px";
      cancelBtn.style.border = "1px solid #ffffff";
      cancelBtn.style.background = "rgba(0,0,0,0.55)";
      cancelBtn.style.color = "#ffffff";
      cancelBtn.style.cursor = "pointer";
      actionRow.appendChild(cancelBtn);

      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.textContent = isDowngrade ? "Downgrade" : "Upgrade";
      confirmBtn.style.padding = "0.5rem 0.85rem";
      confirmBtn.style.borderRadius = "6px";
      confirmBtn.style.border = isDowngrade ? "1px solid #ff6666" : "1px solid #00ffdd";
      confirmBtn.style.background = "rgba(0,0,0,0.55)";
      confirmBtn.style.color = isDowngrade ? "#ff6666" : "#00ffdd";
      confirmBtn.style.cursor = "pointer";
      actionRow.appendChild(confirmBtn);

      let resolved = false;
      const closeModal = (confirmed) => {
        if (resolved) return;
        resolved = true;
        document.removeEventListener("keydown", onKeyDown);
        confirmOverlay.remove();
        if (confirmed && typeof onConfirm === "function") {
          onConfirm();
        }
      };

      const onKeyDown = (evt) => {
        if (evt.key === "Escape") {
          closeModal(false);
        }
      };

      cancelBtn.addEventListener("click", () => closeModal(false));
      confirmBtn.addEventListener("click", () => closeModal(true));
      confirmOverlay.addEventListener("click", (evt) => {
        if (evt.target === confirmOverlay) {
          closeModal(false);
        }
      });
      document.addEventListener("keydown", onKeyDown);
      document.body.appendChild(confirmOverlay);
    }

    function showUpgradeInfoModal(titleText, message) {
      const infoOverlay = document.createElement("div");
      infoOverlay.style.position = "fixed";
      infoOverlay.style.left = "0";
      infoOverlay.style.top = "0";
      infoOverlay.style.width = "100vw";
      infoOverlay.style.height = "100vh";
      infoOverlay.style.background = "rgba(0, 0, 0, 0.74)";
      infoOverlay.style.display = "flex";
      infoOverlay.style.alignItems = "center";
      infoOverlay.style.justifyContent = "center";
      infoOverlay.style.zIndex = "1105";

      const infoPanel = document.createElement("div");
      infoPanel.style.width = "min(460px, 90vw)";
      infoPanel.style.background = "rgba(0, 20, 30, 0.98)";
      infoPanel.style.border = "2px solid #00ffdd";
      infoPanel.style.borderRadius = "10px";
      infoPanel.style.boxShadow = "0 0 28px rgba(0, 255, 221, 0.35)";
      infoPanel.style.padding = "16px";
      infoPanel.style.color = "#c8ffff";
      infoPanel.style.fontFamily = "sans-serif";
      infoOverlay.appendChild(infoPanel);

      const infoTitle = document.createElement("div");
      infoTitle.textContent = titleText;
      infoTitle.style.color = "#00ffdd";
      infoTitle.style.fontWeight = "bold";
      infoTitle.style.fontSize = "1.05rem";
      infoTitle.style.marginBottom = "10px";
      infoPanel.appendChild(infoTitle);

      const infoMessage = document.createElement("div");
      infoMessage.textContent = message;
      infoMessage.style.color = "#aaf6ff";
      infoMessage.style.fontSize = "0.95rem";
      infoMessage.style.lineHeight = "1.4";
      infoMessage.style.marginBottom = "14px";
      infoPanel.appendChild(infoMessage);

      const actionRow = document.createElement("div");
      actionRow.style.display = "flex";
      actionRow.style.justifyContent = "flex-end";
      actionRow.style.gap = "8px";
      infoPanel.appendChild(actionRow);

      const okBtn = document.createElement("button");
      okBtn.type = "button";
      okBtn.textContent = "OK";
      okBtn.style.padding = "0.5rem 0.85rem";
      okBtn.style.borderRadius = "6px";
      okBtn.style.border = "1px solid #00ffdd";
      okBtn.style.background = "rgba(0,0,0,0.55)";
      okBtn.style.color = "#00ffdd";
      okBtn.style.cursor = "pointer";
      actionRow.appendChild(okBtn);

      let resolved = false;
      const closeModal = () => {
        if (resolved) return;
        resolved = true;
        document.removeEventListener("keydown", onKeyDown);
        infoOverlay.remove();
      };

      const onKeyDown = (evt) => {
        if (evt.key === "Escape" || evt.key === "Enter") {
          closeModal();
        }
      };

      okBtn.addEventListener("click", closeModal);
      infoOverlay.addEventListener("click", (evt) => {
        if (evt.target === infoOverlay) {
          closeModal();
        }
      });
      document.addEventListener("keydown", onKeyDown);
      document.body.appendChild(infoOverlay);
    }

    // Title
    const title = document.createElement("h2");
    title.textContent = "PROTOCOL DATABASE";
    title.style.color = "#00ffdd";
    title.style.fontSize = "1.8rem";
    title.style.margin = "30px 0 15px 0";
    title.style.textShadow = "0 0 12px #00ffdd";
    menuOverlay.appendChild(title);

    // Scrollable content container
    const scrollContent = document.createElement("div");
    scrollContent.style.width = "100%";
    scrollContent.style.overflowY = "auto";
    scrollContent.style.flex = "1";
    scrollContent.style.paddingRight = "10px";
    scrollContent.style.paddingLeft = "15px";
    scrollContent.style.paddingRight = "10px";
    scrollContent.style.scrollbarWidth = "none"; // Firefox
    scrollContent.style.msOverflowStyle = "none"; // IE/Edge
    // Add webkit scrollbar hiding via CSS class
    scrollContent.className = "protocol-scroll";

    // Group protocols by family
    const allProtocols = Object.keys(PROTOCOLS);
    const starterProtocolSet = new Set(
      Array.isArray(ProtocolSystem.starterProtocols)
        ? ProtocolSystem.starterProtocols.slice(0, 2)
        : []
    );
    const favoriteProtocolSet = new Set(
      typeof ProtocolSystem.getFavorites === "function"
        ? ProtocolSystem.getFavorites()
        : []
    );
    const familyGroups = { "Targeting": [], "Overdrive": [], "Utility": [] };
    
    allProtocols.forEach(protocolName => {
      const protocol = PROTOCOLS[protocolName];
      if (familyGroups[protocol.family]) {
        familyGroups[protocol.family].push(protocolName);
      }
    });

    // Create family sections
    Object.entries(familyGroups).forEach(([family, protocols]) => {
      // Family header
      const familyHeader = document.createElement("div");
      familyHeader.style.color = "#00ffdd";
      familyHeader.style.fontSize = "1.1rem";
      familyHeader.style.fontWeight = "bold";
      familyHeader.style.marginTop = "15px";
      familyHeader.style.marginLeft = "15px";
      familyHeader.style.marginBottom = "10px";
      familyHeader.style.marginRight = "15px";
      familyHeader.style.borderBottom = "2px solid #00ffdd";
      familyHeader.style.paddingBottom = "5px";
      familyHeader.textContent = family;
      scrollContent.appendChild(familyHeader);

      // Grid for this family
      const gridContainer = document.createElement("div");
      gridContainer.style.display = "grid";
      gridContainer.style.gridTemplateColumns = "repeat(3, 1fr)";
      gridContainer.style.gap = "12px";
      gridContainer.style.width = "95%";
      gridContainer.style.margin = "24px";
      gridContainer.style.padding = "0";

      protocols.forEach(protocolName => {
        const protocol = PROTOCOLS[protocolName];
        const state = ProtocolSystem.protocolBoard[protocolName] || { discovered: false, isNew: false };

        const card = document.createElement("div");
        card.style.borderRadius = "6px";
        card.style.padding = "20px";
        card.style.minHeight = "190px";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.justifyContent = "center";
        card.style.position = "relative";
        card.style.cursor = "pointer";
        card.style.transition = "all 0.2s";

        const applyCardStyle = (isHovered) => {
          const protocolState = ProtocolSystem.protocolBoard[protocolName] || { discovered: false, isNew: false };
          const discovered = (typeof ProtocolSystem.isDiscovered === "function")
            ? ProtocolSystem.isDiscovered(protocolName, false)
            : protocolState.discovered;
          const isNew = protocolState.isNew;
          if (discovered) {
            card.style.background = isHovered ? "rgba(0, 100, 120, 0.9)" : "rgba(0, 77, 92, 0.8)";
            card.style.border = isNew ? "2px solid #fff06a" : "2px solid #00ffdd";
            card.style.boxShadow = isNew ? "0 0 14px rgba(255, 240, 106, 0.65)" : "0 0 10px rgba(0, 255, 221, 0.3)";
          } else {
            card.style.background = isHovered ? "rgba(50, 50, 50, 0.9)" : "rgba(30, 30, 30, 0.8)";
            card.style.border = "2px solid #444";
            card.style.boxShadow = "none";
          }
        };
        applyCardStyle(false);

        card.addEventListener("mouseover", () => {
          if (ProtocolSystem.protocolBoard[protocolName]?.isNew) {
            ProtocolSystem.markSeen(protocolName);
          }
          applyCardStyle(true);
          card.style.transform = "scale(1.05)";
        });
        card.addEventListener("mouseout", () => {
          applyCardStyle(false);
          card.style.transform = "scale(1)";
        });

        const favoriteBtn = document.createElement("div");
        favoriteBtn.textContent = "✶";
        favoriteBtn.title = "Toggle favorite";
        favoriteBtn.style.position = "absolute";
        favoriteBtn.style.top = "8px";
        favoriteBtn.style.right = "8px";
        favoriteBtn.style.width = "20px";
        favoriteBtn.style.height = "20px";
        favoriteBtn.style.boxSizing = "border-box";
        favoriteBtn.style.borderRadius = "50%";
        favoriteBtn.style.border = "1px solid #00ffdd";
        favoriteBtn.style.background = "rgba(0, 35, 40, 0.92)";
        favoriteBtn.style.fontWeight = "bold";
        favoriteBtn.style.fontSize = "1.1rem";
        favoriteBtn.style.lineHeight = "1";
        favoriteBtn.style.display = "flex";
        favoriteBtn.style.alignItems = "center";
        favoriteBtn.style.justifyContent = "center";
        favoriteBtn.style.boxShadow = "0 0 8px rgba(0,255,221,0.4)";
        favoriteBtn.style.cursor = "pointer";
        const applyFavoriteBtnState = () => {
          const isFavorite = typeof ProtocolSystem.isFavorite === "function"
            ? ProtocolSystem.isFavorite(protocolName)
            : favoriteProtocolSet.has(protocolName);
          favoriteBtn.style.color = isFavorite ? "#ffd84d" : "#4e696f";
          favoriteBtn.style.textShadow = isFavorite ? "0 0 8px rgba(255,216,77,0.85)" : "none";
        };
        applyFavoriteBtnState();
        favoriteBtn.addEventListener("click", (evt) => {
          evt.stopPropagation();
          if (typeof ProtocolSystem.toggleFavorite === "function") {
            ProtocolSystem.toggleFavorite(protocolName);
            applyFavoriteBtnState();
          }
        });
        card.appendChild(favoriteBtn);

        // Protocol name
        const nameEl = document.createElement("div");
        nameEl.textContent = protocolName;
        const discovered = (typeof ProtocolSystem.isDiscovered === "function")
          ? ProtocolSystem.isDiscovered(protocolName, false)
          : state.discovered;
        nameEl.style.color = discovered ? "#00ffdd" : "#888";
        nameEl.style.fontWeight = "bold";
        nameEl.style.fontSize = "1rem";
        nameEl.style.marginBottom = "5px";
        card.appendChild(nameEl);

        if (state.isNew && discovered) {
          const newEl = document.createElement("div");
          newEl.textContent = "NEW";
          newEl.style.color = "#fff06a";
          newEl.style.fontWeight = "bold";
          newEl.style.fontSize = "0.75rem";
          newEl.style.marginBottom = "4px";
          card.appendChild(newEl);
        }

        const isStarterSelected = discovered && starterProtocolSet.has(protocolName);
        if (isStarterSelected) {
          const starterBadge = document.createElement("div");
          starterBadge.textContent = "✓";
          starterBadge.title = "Starter protocol selected";
          starterBadge.style.position = "absolute";
          starterBadge.style.top = "8px";
          starterBadge.style.right = "32px";
          starterBadge.style.width = "18px";
          starterBadge.style.height = "18px";
          starterBadge.style.borderRadius = "50%";
          starterBadge.style.border = "1px solid #00ffdd";
          starterBadge.style.background = "rgba(0, 35, 40, 0.92)";
          starterBadge.style.color = "#00ffdd";
          starterBadge.style.fontWeight = "bold";
          starterBadge.style.fontSize = "0.85rem";
          starterBadge.style.lineHeight = "1";
          starterBadge.style.display = "flex";
          starterBadge.style.alignItems = "center";
          starterBadge.style.justifyContent = "center";
          starterBadge.style.boxShadow = "0 0 8px rgba(0,255,221,0.4)";
          starterBadge.style.pointerEvents = "none";
          card.appendChild(starterBadge);
        }

        if (discovered) {
          card.addEventListener("click", () => {
            const currentStarters = Array.isArray(ProtocolSystem.starterProtocols)
              ? ProtocolSystem.starterProtocols
                  .filter(name => (typeof ProtocolSystem.isDiscovered === "function")
                    ? ProtocolSystem.isDiscovered(name, false)
                    : !!ProtocolSystem.protocolBoard[name]?.discovered)
                  .slice(0, 2)
              : [];
            const existingIndex = currentStarters.indexOf(protocolName);
            let nextStarters;

            if (existingIndex >= 0) {
              nextStarters = currentStarters.filter(name => name !== protocolName);
              const applied = (typeof ProtocolSystem.setStarters === "function")
                ? ProtocolSystem.setStarters(nextStarters)
                : false;
              if (!applied) return;
              const restoreScrollTop = scrollContent.scrollTop;
              menuOverlay.remove();
              showProtocolMenu(restoreScrollTop);
              return;
            }
            if (currentStarters.length < 2) {
              nextStarters = [...currentStarters, protocolName];
              const applied = (typeof ProtocolSystem.setStarters === "function")
                ? ProtocolSystem.setStarters(nextStarters)
                : false;
              if (!applied) return;
              const restoreScrollTop = scrollContent.scrollTop;
              menuOverlay.remove();
              showProtocolMenu(restoreScrollTop);
              return;
            }
            // If already 2 selected, prompt to replace
            const modal = document.createElement("div");
            modal.style.position = "fixed";
            modal.style.left = 0;
            modal.style.top = 0;
            modal.style.width = "100vw";
            modal.style.height = "100vh";
            modal.style.background = "rgba(0,0,0,0.7)";
            modal.style.display = "flex";
            modal.style.alignItems = "center";
            modal.style.justifyContent = "center";
            modal.style.zIndex = 2000;
            const box = document.createElement("div");
            box.style.background = "#01222b";
            box.style.border = "2px solid #00ffdd";
            box.style.borderRadius = "10px";
            box.style.padding = "28px 32px";
            box.style.display = "flex";
            box.style.flexDirection = "column";
            box.style.alignItems = "center";
            box.style.boxShadow = "0 0 18px #00ffdd55";
            const msg = document.createElement("div");
            msg.textContent = "Starter limit reached. Replace which starter?";
            msg.style.color = "#00ffdd";
            msg.style.fontWeight = "bold";
            msg.style.fontSize = "1.1rem";
            msg.style.marginBottom = "18px";
            box.appendChild(msg);
            const btnRow = document.createElement("div");
            btnRow.style.display = "flex";
            btnRow.style.gap = "18px";
            btnRow.style.marginBottom = "10px";
            currentStarters.forEach(selName => {
              // Button container for name and stat change
              const btnContainer = document.createElement("div");
              btnContainer.style.display = "flex";
              btnContainer.style.flexDirection = "column";
              btnContainer.style.alignItems = "center";
              btnContainer.style.minWidth = "160px";
              btnContainer.style.maxWidth = "220px";
              btnContainer.style.margin = "0 2px";

              // Protocol name button
              const btn = document.createElement("button");
              btn.textContent = selName;
              btn.style.padding = "0.6rem 1.2rem";
              btn.style.background = "rgba(0,0,0,0.7)";
              btn.style.color = "#00ffdd";
              btn.style.border = "2px solid #00ffdd";
              btn.style.borderRadius = "8px";
              btn.style.fontSize = "1rem";
              btn.style.cursor = "pointer";
              btn.style.marginBottom = "6px";
              btn.addEventListener("click", () => {
                // Replace selected starter
                const idxToReplace = currentStarters.indexOf(selName);
                if (idxToReplace !== -1) {
                  nextStarters = [...currentStarters];
                  const replacedName = nextStarters[idxToReplace];
                  nextStarters.splice(idxToReplace, 1, protocolName);
                  const applied = (typeof ProtocolSystem.setStarters === "function")
                    ? ProtocolSystem.setStarters(nextStarters)
                    : false;
                  if (!applied) return;
                  document.body.removeChild(modal);
                  // Re-render the protocol menu to reflect new selection state
                  const restoreScrollTop = scrollContent.scrollTop;
                  menuOverlay.remove();
                  showProtocolMenu(restoreScrollTop);
                }
              });

              // --- Stat comparison below protocol name, single column layout ---
              const statOrder = ["Range", "Power", "Intensity", "Movement", "Health", "Pickup"];
              const statShort = { Range: "Rng:", Power: "Pwr:", Intensity: "Int:", Movement: "Mov:", Health: "HP:", Pickup: "Pick:" };
              const aName = selName;
              const bName = currentStarters.find(n => n !== selName);
              const aMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
                ? ProtocolSystem.getProtocolEffectiveMods(aName)
                : (PROTOCOLS[aName]?.statMods || {});
              const bMods = bName && ((typeof ProtocolSystem.getProtocolEffectiveMods === "function")
                ? ProtocolSystem.getProtocolEffectiveMods(bName)
                : (PROTOCOLS[bName]?.statMods || {}));
              const hoveredMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
                ? ProtocolSystem.getProtocolEffectiveMods(protocolName)
                : (PROTOCOLS[protocolName]?.statMods || {});
              // x = a + b
              // (x - a) + y = c
              let statHtml = `<div style='margin-bottom:2px; font-size:0.97em; background:rgba(0,20,30,0.92); border-radius:8px; border:1.5px solid #00ffdd; box-shadow:0 0 8px #00ffdd33; padding:7px 10px; width:100%;'>`;
              statHtml += `<div style='color:#00ffdd; font-weight:bold; margin-bottom:2px; text-align:center;'>Result if replaced:</div>`;
              statHtml += `<div style='display:flex; flex-direction:column; gap:2px;'>`;
              statOrder.forEach((stat, i) => {
                const a = Number(aMods[stat]) || 0;
                const b = bMods ? (Number(bMods[stat]) || 0) : 0;
                const y = Number(hoveredMods[stat]) || 0;
                const x = a + b;
                const c = b + y;
                let color = c > x ? "#00ff88" : c < x ? "#ff4444" : "#bbbbbb";
                let cStr = c < 0 ? c.toString() : c.toString();
                statHtml += `<div style='display:flex; align-items:center;'><span style='width:54px; display:inline-block;'>${statShort[stat]}</span> <span style='color:#bbbbbb; min-width:16px; display:inline-block; text-align:right;'>${x}</span> <span style='margin:0 3px;'>→</span> <span style='color:${color}; min-width:16px; display:inline-block; text-align:right;'>${cStr}</span></div>`;
              });
              statHtml += `</div></div>`;
              btnContainer.appendChild(btn);
              btnContainer.insertAdjacentHTML('beforeend', statHtml);
              btnRow.appendChild(btnContainer);
            });
            box.appendChild(btnRow);
            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = "Cancel";
            cancelBtn.style.padding = "0.5rem 1.1rem";
            cancelBtn.style.background = "rgba(0,0,0,0.5)";
            cancelBtn.style.color = "#fff";
            cancelBtn.style.border = "1.5px solid #aaa";
            cancelBtn.style.borderRadius = "8px";
            cancelBtn.style.fontSize = "1rem";
            cancelBtn.style.marginTop = "8px";
            cancelBtn.style.cursor = "pointer";
            cancelBtn.addEventListener("click", () => {
              document.body.removeChild(modal);
            });
            box.appendChild(cancelBtn);
            modal.appendChild(box);
            document.body.appendChild(modal);
          });
        }

        // Rarity
        const rarityEl = document.createElement("div");
        rarityEl.textContent = protocol.rarity;
        rarityEl.style.color = discovered ? "#aaf6ff" : "#666";
        rarityEl.style.fontSize = "0.85rem";
        rarityEl.style.marginBottom = "5px";
        card.appendChild(rarityEl);

        const currentUpgradeLevel = (typeof ProtocolSystem.normalizeUpgradeTier === "function")
          ? ProtocolSystem.normalizeUpgradeTier(state.upgradeTier)
          : (state.upgradeTier || (ProtocolSystem.upgradeTiers?.[0] || "Trivial"));
        const currentTierIndex = (typeof ProtocolSystem.getUpgradeTierIndex === "function")
          ? ProtocolSystem.getUpgradeTierIndex(currentUpgradeLevel)
          : 0;
        const totalTierCount = (Array.isArray(ProtocolSystem.upgradeTiers) && ProtocolSystem.upgradeTiers.length > 0)
          ? ProtocolSystem.upgradeTiers.length
          : 5;
        const nextUpgradeCost = (typeof ProtocolSystem.getNextUpgradeCost === "function")
          ? ProtocolSystem.getNextUpgradeCost(protocolName)
          : null;

        const upgradeLevelEl = document.createElement("div");
        upgradeLevelEl.textContent = `Upgrade Level: ${currentUpgradeLevel} (${currentTierIndex + 1}/${totalTierCount})`;
        upgradeLevelEl.style.color = discovered ? "#c8ffff" : "#666";
        upgradeLevelEl.style.fontSize = "0.8rem";
        upgradeLevelEl.style.marginBottom = "3px";
        card.appendChild(upgradeLevelEl);

        const nextCostEl = document.createElement("div");
        nextCostEl.textContent = `Upgrade Cost: ${nextUpgradeCost === null ? "MAX" : `${nextUpgradeCost} Bytes`}`;
        nextCostEl.style.color = discovered ? "#aaf6ff" : "#666";
        nextCostEl.style.fontSize = "0.8rem";
        nextCostEl.style.marginBottom = "4px";
        card.appendChild(nextCostEl);

        const intentEl = document.createElement("div");
        intentEl.textContent = protocol.intent || "Unknown";
        intentEl.style.color = discovered ? "#aaf6ff" : "#666";
        intentEl.style.fontSize = "0.8rem";
        intentEl.style.marginBottom = "12px";
        card.appendChild(intentEl);

        const effectiveMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
          ? ProtocolSystem.getProtocolEffectiveMods(protocolName)
          : protocol.statMods;
        const nextUpgradeEffects = (typeof ProtocolSystem.getProtocolNextUpgradeEffects === "function")
          ? ProtocolSystem.getProtocolNextUpgradeEffects(protocolName)
          : {};
        const formatSigned = (num) => `${num > 0 ? "+" : ""}${num}`;
        const statTexts = [];
        Object.keys(protocol.statMods).forEach(stat => {
          const effectiveValue = effectiveMods[stat] || 0;
          if (effectiveValue === 0) return;
          const nextEffect = nextUpgradeCost === null ? null : (nextUpgradeEffects[stat] || 0);
          const nextTotalValue = nextEffect === null ? null : (effectiveValue + nextEffect);
          const nextTotalText = nextTotalValue === null ? "MAX" : formatSigned(nextTotalValue);
          statTexts.push(`${formatSigned(effectiveValue)} ${stat} (next ${nextTotalText})`);
        });

        const powerModifierLabelEl = document.createElement("div");
        powerModifierLabelEl.textContent = "Power Modifier:";
        powerModifierLabelEl.style.color = discovered ? "#00ff88" : "#555";
        powerModifierLabelEl.style.fontSize = "0.8rem";
        powerModifierLabelEl.style.fontWeight = "bold";
        powerModifierLabelEl.style.marginTop = "0";
        card.appendChild(powerModifierLabelEl);

        const powerModifierListEl = document.createElement("div");
        powerModifierListEl.textContent = statTexts.length > 0 ? statTexts.join("\n") : "No modifiers";
        powerModifierListEl.style.color = discovered ? "#00ff88" : "#555";
        powerModifierListEl.style.fontSize = "0.8rem";
        powerModifierListEl.style.whiteSpace = "pre-line";
        powerModifierListEl.style.lineHeight = "1.25";
        card.appendChild(powerModifierListEl);

        if (discovered) {
          // Button container
          const btnContainer = document.createElement("div");
          btnContainer.style.display = "flex";
          btnContainer.style.gap = "8px";
          btnContainer.style.marginTop = "8px";

          // Upgrade button
          const upgradeBtn = document.createElement("button");
          upgradeBtn.type = "button";
          upgradeBtn.textContent = nextUpgradeCost === null ? "MAX" : "Upgrade";
          upgradeBtn.style.padding = "0.35rem 0.6rem";
          upgradeBtn.style.borderRadius = "6px";
          upgradeBtn.style.border = "1px solid #00ffdd";
          upgradeBtn.style.background = "rgba(0,0,0,0.4)";
          upgradeBtn.style.color = "#00ffdd";
          upgradeBtn.style.fontSize = "0.78rem";
          upgradeBtn.style.cursor = nextUpgradeCost === null ? "default" : "pointer";
          if (nextUpgradeCost === null) {
            upgradeBtn.disabled = true;
            upgradeBtn.style.opacity = "0.65";
          }
          upgradeBtn.addEventListener("click", (evt) => {
            evt.stopPropagation();
            if (nextUpgradeCost === null) return;
            if (totalCollectedBytes < nextUpgradeCost) {
              showUpgradeInfoModal(
                "INSUFFICIENT BYTES",
                `Not enough Bytes. Need ${nextUpgradeCost}, have ${totalCollectedBytes}.`
              );
              return;
            }
            const nextTierName = (typeof ProtocolSystem.getNextUpgradeTierName === "function")
              ? ProtocolSystem.getNextUpgradeTierName(protocolName)
              : "Next";
            showUpgradeConfirmModal(
              `Upgrade ${protocolName} to ${nextTierName} for ${nextUpgradeCost} Bytes?`,
              () => {
                const result = (typeof ProtocolSystem.upgradeProtocol === "function")
                  ? ProtocolSystem.upgradeProtocol(protocolName, totalCollectedBytes)
                  : { success: false };
                if (!result.success) {
                  if (result.reason === "insufficient") {
                    showUpgradeInfoModal(
                      "INSUFFICIENT BYTES",
                      `Not enough Bytes. Need ${result.cost}, have ${totalCollectedBytes}.`
                    );
                  }
                  return;
                }
                totalCollectedBytes = Math.max(0, totalCollectedBytes - result.cost);
                saveCollectedBytes();
                const restoreScrollTop = scrollContent.scrollTop;
                menuOverlay.remove();
                showProtocolMenu(restoreScrollTop);
              }
            );
          });
          btnContainer.appendChild(upgradeBtn);

          // Downgrade button
          const canDowngrade = currentTierIndex > 0;
          const downgradeBtn = document.createElement("button");
          downgradeBtn.type = "button";
          downgradeBtn.textContent = "Downgrade";
          downgradeBtn.style.padding = "0.35rem 0.6rem";
          downgradeBtn.style.borderRadius = "6px";
          downgradeBtn.style.border = "1px solid #ff6666";
          downgradeBtn.style.background = "rgba(0,0,0,0.4)";
          downgradeBtn.style.color = canDowngrade ? "#ff6666" : "#555";
          downgradeBtn.style.fontSize = "0.78rem";
          downgradeBtn.style.cursor = canDowngrade ? "pointer" : "default";
          if (!canDowngrade) {
            downgradeBtn.disabled = true;
            downgradeBtn.style.opacity = "0.65";
          }
          downgradeBtn.addEventListener("click", (evt) => {
            evt.stopPropagation();
            if (!canDowngrade) return;
            // Confirm downgrade
            showUpgradeConfirmModal(
              `Downgrade ${protocolName} to ${ProtocolSystem.upgradeTiers[currentTierIndex - 1]} and refund last upgrade cost?`,
              () => {
                const result = (typeof ProtocolSystem.downgradeProtocol === "function")
                  ? ProtocolSystem.downgradeProtocol(protocolName)
                  : { success: false };
                if (!result.success) {
                  showUpgradeInfoModal(
                    "CANNOT DOWNGRADE",
                    result.reason === "min-tier"
                      ? "Already at minimum tier."
                      : "Unable to downgrade."
                  );
                  return;
                }
                totalCollectedBytes += result.refund || 0;
                saveCollectedBytes();
                const restoreScrollTop = scrollContent.scrollTop;
                menuOverlay.remove();
                showProtocolMenu(restoreScrollTop);
              },
              true // isDowngrade
            );
          });
          btnContainer.appendChild(downgradeBtn);

          card.appendChild(btnContainer);
        }

        // Lock badge
        if (!discovered) {
          const lockEl = document.createElement("div");
          lockEl.textContent = "🔒 Locked";
          lockEl.style.color = "#ff6666";
          lockEl.style.fontWeight = "bold";
          lockEl.style.fontSize = "0.8rem";
          lockEl.style.marginTop = "5px";
          card.appendChild(lockEl);
        }

        gridContainer.appendChild(card);
      });

      scrollContent.appendChild(gridContainer);
    });
    menuOverlay.appendChild(scrollContent);
    document.body.appendChild(menuOverlay);

    if (Number.isFinite(initialScrollTop) && initialScrollTop > 0) {
      requestAnimationFrame(() => {
        scrollContent.scrollTop = initialScrollTop;
      });
    }

    // Back button functionality
    backBtn.addEventListener("click", () => {
      menuOverlay.remove();
      showMenu();
    });

    return menuOverlay;
  }

              // Draw jagged lightning bolt between two points
              function drawLightningBolt(x1, y1, x2, y2, color, segments = 8, jaggedness = 16) {
                ctx.save();
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                // Removed shadowColor and shadowBlur for mobs
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                for (let i = 1; i < segments; i++) {
                  const t = i / segments;
                  // Linear interpolation
                  let nx = x1 + (x2 - x1) * t;
                  let ny = y1 + (y2 - y1) * t;
                  // Add random jaggedness perpendicular to the main direction
                  const dx = y2 - y1;
                  const dy = x1 - x2;
                  const mag = Math.sqrt(dx * dx + dy * dy);
                  if (mag > 0) {
                    nx += (dx / mag) * (Math.random() - 0.5) * jaggedness;
                    ny += (dy / mag) * (Math.random() - 0.5) * jaggedness;
                  }
                  ctx.lineTo(nx, ny);
                }
                ctx.lineTo(x2, y2);
                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.restore();
              }
            // Draw wave announcement with fade animation
            function drawWaveAnnouncement() {
              if (waveAnnouncementTimer > 0) {
                ctx.save();
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = "bold 44px sans-serif";
                ctx.fillStyle = "#00ffdd";
                // Removed shadowColor and shadowBlur for mobs
                // Animation: quick fade-in (first 20 frames), slower fade-out (last 40 frames)
                let alpha = 1;
                if (waveAnnouncementTimer > WAVE_ANNOUNCE_DURATION - 20) {
                  alpha = 1 - ((WAVE_ANNOUNCE_DURATION - waveAnnouncementTimer) / 20);
                } else {
                  alpha = waveAnnouncementTimer / (WAVE_ANNOUNCE_DURATION - 20);
                }
                ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
                ctx.fillText("Wave " + wave, canvas.width / 2, canvas.height / 2 - 22);
                ctx.restore();
                if (!paused) waveAnnouncementTimer--;
              }
            }
          let waveAnnouncementTimer = 60; // Show announcement at game start
          const WAVE_ANNOUNCE_DURATION = 660; // Duration for wave announcement
        // HUD overlay image
        const hudImg = new window.Image();
        hudImg.src = "liphud_slim2.png";
      // Game background image
      const backgroundImg = new window.Image();
      backgroundImg.src = "background4.png";
    // For smooth player rotation
    let playerVisualAngle = Math.PI / 2; // Start facing down
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  let keys = {}, paused = false, gameOver = false;
  // Player sprite
  const playerImg = new window.Image();
  playerImg.src = "player_drone.png";
  // Enemy sprites
  const gruntImg = new window.Image();
  gruntImg.src = "grunt.png";
  const bruteImg = new window.Image();
  bruteImg.src = "brute.png";
  const bruteBossImg = new window.Image();
  bruteBossImg.src = "brute boss.png";
  const slingerImg = new window.Image();
  slingerImg.src = "slinger.png";
  const kamikazeImg = new window.Image();
  kamikazeImg.src = "kamikaze.png";
  const stalkerImg = new window.Image();
  stalkerImg.src = "stalker.png";
  const beamerImg = new window.Image();
  beamerImg.src = "beamer.png";
  const shielderImg = new window.Image();
  shielderImg.src = "shielder.png";






  //========= GAME STATE =========//
  let wave = 1, xp = 0, xpToLevel = 10, level = 1, statPoints = 5; // Start at wave 1
  const COLLECTED_BYTES_STORAGE_KEY = "sentinel.collectedBytes.v1";
  let runCollectedBytes = 0;
  let totalCollectedBytes = 0;
  let runBytesFinalized = false;
  const bytePickupNotifications = [];

  function loadCollectedBytes() {
    try {
      const raw = localStorage.getItem(COLLECTED_BYTES_STORAGE_KEY);
      const parsed = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch (err) {
      return 0;
    }
  }

  function saveCollectedBytes() {
    try {
      localStorage.setItem(COLLECTED_BYTES_STORAGE_KEY, String(Math.max(0, Math.floor(totalCollectedBytes))));
    } catch (err) {}
  }

  function collectRunBytes(amount) {
    const value = Math.max(0, Math.floor(amount || 0));
    if (value <= 0) return;
    runCollectedBytes += value;
    bytePickupNotifications.push({
      amount: value,
      timer: 80,
      maxTimer: 80
    });
    while (bytePickupNotifications.length > 6) {
      bytePickupNotifications.shift();
    }
  }

  function finalizeRunBytes() {
    if (runBytesFinalized) return;
    runBytesFinalized = true;
    if (runCollectedBytes > 0) {
      totalCollectedBytes += runCollectedBytes;
      saveCollectedBytes();
    }
  }

  function returnToMainMenu() {
    finalizeRunBytes();
    showMenuScreen = true;
    window._playMenuAmbienceOnShowMenu = true;
    showMenu();
    window._playMenuAmbienceOnShowMenu = false;
    gameOver = false;
    window._gameOverTime = undefined;
    window._playerUsedContinue = false;
    followMouse = false;
    paused = false;
    showStats = false;
  }

  totalCollectedBytes = loadCollectedBytes();
  let playerLevelUpTimer = 0;
  let showStats = false, gameStarted = false;
  let returnToMenuModalOpen = false;
  window._editorSessionActive = false;
  const protocolWarnings = [];
  let selectedProtocol = -1;
  let hoveredProtocol = -1;
  // Block game loop if loading/menu is active
  function isGameBlocked() {
    return showLoadingScreen || showMenuScreen;
  }
  let startTime = Date.now();
  let mouseX = 512, mouseY = 425;
  let followMouse = false;

  function showReturnToMenuModal() {
    if (returnToMenuModalOpen || !gameStarted || showMenuScreen) return;
    returnToMenuModalOpen = true;

    const previousFollowMouse = followMouse;
    const previousPaused = paused;
    const previousShowStats = showStats;

    followMouse = false;
    paused = true;
    showStats = true;

    const confirmOverlay = document.createElement("div");
    confirmOverlay.style.position = "fixed";
    confirmOverlay.style.left = "0";
    confirmOverlay.style.top = "0";
    confirmOverlay.style.width = "100vw";
    confirmOverlay.style.height = "100vh";
    confirmOverlay.style.background = "rgba(0, 0, 0, 0.74)";
    confirmOverlay.style.display = "flex";
    confirmOverlay.style.alignItems = "center";
    confirmOverlay.style.justifyContent = "center";
    confirmOverlay.style.zIndex = "1200";

    const confirmPanel = document.createElement("div");
    confirmPanel.style.width = "min(460px, 90vw)";
    confirmPanel.style.background = "rgba(0, 20, 30, 0.98)";
    confirmPanel.style.border = "2px solid #00ffdd";
    confirmPanel.style.borderRadius = "10px";
    confirmPanel.style.boxShadow = "0 0 28px rgba(0, 255, 221, 0.35)";
    confirmPanel.style.padding = "16px";
    confirmPanel.style.color = "#c8ffff";
    confirmPanel.style.fontFamily = "sans-serif";
    confirmOverlay.appendChild(confirmPanel);

    const confirmTitle = document.createElement("div");
    confirmTitle.textContent = "RETURN TO MAIN MENU";
    confirmTitle.style.color = "#00ffdd";
    confirmTitle.style.fontWeight = "bold";
    confirmTitle.style.fontSize = "1.05rem";
    confirmTitle.style.marginBottom = "10px";
    confirmPanel.appendChild(confirmTitle);

    const confirmMessage = document.createElement("div");
    confirmMessage.textContent = "Do you want to go back to the main menu?";
    confirmMessage.style.color = "#aaf6ff";
    confirmMessage.style.fontSize = "0.95rem";
    confirmMessage.style.lineHeight = "1.4";
    confirmMessage.style.marginBottom = "14px";
    confirmPanel.appendChild(confirmMessage);

    const actionRow = document.createElement("div");
    actionRow.style.display = "flex";
    actionRow.style.justifyContent = "flex-end";
    actionRow.style.gap = "8px";
    confirmPanel.appendChild(actionRow);

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.padding = "0.5rem 0.85rem";
    cancelBtn.style.borderRadius = "6px";
    cancelBtn.style.border = "1px solid #2f9cad";
    cancelBtn.style.background = "rgba(0,0,0,0.45)";
    cancelBtn.style.color = "#c8ffff";
    cancelBtn.style.cursor = "pointer";
    actionRow.appendChild(cancelBtn);

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.textContent = "Main Menu";
    confirmBtn.style.padding = "0.5rem 0.85rem";
    confirmBtn.style.borderRadius = "6px";
    confirmBtn.style.border = "1px solid #00ffdd";
    confirmBtn.style.background = "rgba(0,0,0,0.55)";
    confirmBtn.style.color = "#00ffdd";
    confirmBtn.style.cursor = "pointer";
    actionRow.appendChild(confirmBtn);

    const closeModal = (confirmed) => {
      if (!returnToMenuModalOpen) return;
      returnToMenuModalOpen = false;
      document.removeEventListener("keydown", onModalKeyDown);
      confirmOverlay.remove();
      if (confirmed) {
        returnToMainMenu();
      } else {
        followMouse = previousFollowMouse;
        paused = previousPaused;
        showStats = previousShowStats;
      }
    };

    const onModalKeyDown = (evt) => {
      if (evt.key === "Escape") {
        evt.preventDefault();
        closeModal(false);
      } else if (evt.key === "Enter") {
        evt.preventDefault();
        closeModal(true);
      }
    };

    cancelBtn.addEventListener("click", () => closeModal(false));
    confirmBtn.addEventListener("click", () => closeModal(true));
    confirmOverlay.addEventListener("click", (evt) => {
      if (evt.target === confirmOverlay) {
        closeModal(false);
      }
    });

    document.addEventListener("keydown", onModalKeyDown);
    document.body.appendChild(confirmOverlay);
  }

  let burstCount = 3, burstIndex = 0, burstTimer = 0;
  // Burst interval in frames (higher = longer pause between bursts)
  let burstInterval = 120; // Increased for bigger cooldown
  const INTER_WAVE_DELAY_SECONDS = 8;
  let interWaveDelayTimer = 0;
  let interWavePending = false;
  // For future: burstInterval can be scaled for difficulty
  let enemiesToSpawn = 0;
  const KAMIKAZE_MINE_PARTICLE_COUNT = 12;
  const KAMIKAZE_DEATH_PARTICLE_COUNT = 8;
  const MAX_PARTICLES = 400;
  const MAX_XPDROP_PARTICLES = 80;

  if (typeof window.SentinelWaveEnemyHealthModifier !== "number") {
    window.SentinelWaveEnemyHealthModifier = 1.3;
  }
  if (typeof window.SentinelWaveEnemyDamageModifier !== "number") {
    window.SentinelWaveEnemyDamageModifier = 3;
  }

  function applyWaveEnemyModifiers(enemy) {
    if (!enemy) return enemy;
    const healthMod = Number(window.SentinelWaveEnemyHealthModifier);
    const damageMod = Number(window.SentinelWaveEnemyDamageModifier);
    const resolvedHealthMod = Number.isFinite(healthMod) ? healthMod : 1;
    const resolvedDamageMod = Number.isFinite(damageMod) ? damageMod : 1;

    if (typeof enemy.health === "number") {
      enemy.health = Math.max(0, enemy.health * resolvedHealthMod);
    }
    if (typeof enemy.damage === "number") {
      enemy.damage = Math.max(0, enemy.damage * resolvedDamageMod);
    }
    return enemy;
  }

  const player = {
    x: 512, y: 425, radius: 20,
    baseSpeed: 2, speed: 2,
    health: 10, maxHealth: 10,
    damage: 1,
    attackCooldown: 0, cooldownBase: 20,
    range: 80,
    stats: { Range: 0, Power: 0, AttackSpeed: 0, Movement: 0, Vitality: 0, Pickup: 0 },
    pickupRadius: 48
  };

  const enemies = [], projectiles = [], healthDrops = [], xpDrops = [], slingerDrops = [], bruteDrops = [], protocolOrbs = [], particles = [], mines = [];
  const enemyPool = [], projectilePool = [], particlePool = [];

  function clearPooledObject(obj) {
    for (const key in obj) delete obj[key];
    return obj;
  }

  function removeAtSwap(array, index) {
    const lastIndex = array.length - 1;
    const item = array[index];
    if (index !== lastIndex) array[index] = array[lastIndex];
    array.pop();
    return item;
  }

  function spawnEnemy() {
    const enemy = enemyPool.length ? clearPooledObject(enemyPool.pop()) : {};
    enemies.push(enemy);
    return enemy;
  }

  function releaseEnemyAt(index) {
    const enemy = removeAtSwap(enemies, index);
    enemyPool.push(clearPooledObject(enemy));
  }

  function spawnProjectile(x, y, dx, dy, damage, radius, color, type) {
    const projectile = projectilePool.length ? projectilePool.pop() : { trail: [] };
    clearPooledObject(projectile);
    projectile.x = x;
    projectile.y = y;
    projectile.dx = dx;
    projectile.dy = dy;
    projectile.damage = damage;
    projectile.radius = typeof radius === "number" ? radius : 4;
    projectile.color = color || "#ff8844";
    projectile.type = type || "enemyProjectile";
    if (!projectile.trail) projectile.trail = [];
    projectile.trail.length = 0;
    projectiles.push(projectile);
    return projectile;
  }

  function releaseProjectileAt(index) {
    const projectile = removeAtSwap(projectiles, index);
    if (projectile.trail) projectile.trail.length = 0;
    projectilePool.push(clearPooledObject(projectile));
  }

  function spawnBurningArea(x, y, options = {}) {
    const radius = typeof options.radius === "number" ? options.radius : 72;
    const duration = typeof options.duration === "number" ? options.duration : 360;
    const tickInterval = typeof options.tickInterval === "number" ? options.tickInterval : 36;
    const damagePerTick = typeof options.damage === "number" ? options.damage : 1;
    const overlapDistance = radius * 0.8;
    const nearbyBurnZones = [];

    for (let mineIndex = 0; mineIndex < mines.length; mineIndex++) {
      const mine = mines[mineIndex];
      if (!mine || mine.type !== "burn") continue;
      const dist = Math.hypot(x - mine.x, y - mine.y);
      if (dist <= overlapDistance) {
        nearbyBurnZones.push(mine);
      }
    }

    if (nearbyBurnZones.length >= 2) {
      let strongestZone = nearbyBurnZones[0];
      for (let zoneIndex = 1; zoneIndex < nearbyBurnZones.length; zoneIndex++) {
        if ((nearbyBurnZones[zoneIndex].timer || 0) > (strongestZone.timer || 0)) {
          strongestZone = nearbyBurnZones[zoneIndex];
        }
      }
      strongestZone.timer = Math.max(strongestZone.timer || 0, duration);
      strongestZone.radius = Math.max(strongestZone.radius || 0, radius);
      strongestZone.tickInterval = Math.min(strongestZone.tickInterval || tickInterval, tickInterval);
      strongestZone.damagePerTick = Math.max(strongestZone.damagePerTick || 0, damagePerTick);
      return;
    }

    mines.push({
      type: "burn",
      x,
      y,
      radius,
      timer: duration,
      tickInterval,
      tickTimer: 0,
      damagePerTick,
      active: true
    });
  }

  function spawnParticle(x, y, dx, dy, life, color, decay, size, type) {
    const particle = particlePool.length ? particlePool.pop() : {};
    particle.x = x;
    particle.y = y;
    particle.dx = dx;
    particle.dy = dy;
    particle.life = life;
    particle.color = color;
    particle.decay = typeof decay === "number" ? decay : 1;
    particle.size = typeof size === "number" ? size : 2;
    particle.type = type || "generic";
    particles.push(particle);
    return particle;
  }

  function releaseParticleAt(index) {
    const particle = removeAtSwap(particles, index);
    particlePool.push(particle);
  }
  // Update mines: explode when player enters zone, remove after explosion
  function updateMines(delta) {
    for (let i = mines.length - 1; i >= 0; i--) {
      const m = mines[i];
      if (m.type === "burn") {
        m.timer -= delta * SPEED_MULTIPLIER;
        m.tickTimer = (m.tickTimer || 0) - delta * SPEED_MULTIPLIER;
        m.particleTimer = (m.particleTimer || 0) - delta * SPEED_MULTIPLIER;
        const burnRadius = typeof m.radius === "number" ? m.radius : 72;
        const tickInterval = typeof m.tickInterval === "number" ? m.tickInterval : 36;
        const burnDamage = typeof m.damagePerTick === "number" ? m.damagePerTick : 1;
        const distToPlayer = Math.hypot(player.x - m.x, player.y - m.y);
        if (distToPlayer < burnRadius + player.radius && m.tickTimer <= 0) {
          player.health -= burnDamage;
          m.tickTimer = tickInterval;
        }
        if (m.particleTimer <= 0) {
          m.particleTimer = 10;
          const particleCount = 4;
          for (let particleIndex = 0; particleIndex < particleCount; particleIndex++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * burnRadius * 0.9;
            const px = m.x + Math.cos(angle) * radius;
            const py = m.y + Math.sin(angle) * radius;
            const driftAngle = Math.random() * Math.PI * 2;
            const driftSpeed = 0.25 + Math.random() * 0.45;
            spawnParticle(
              px,
              py,
              Math.cos(driftAngle) * driftSpeed,
              Math.sin(driftAngle) * driftSpeed,
              10 + Math.floor(Math.random() * 12),
              ["#ff5a00", "#ff9a2f", "#ffd26a", "#ff3f00"][Math.floor(Math.random() * 4)],
              0.93 + Math.random() * 0.03,
              1.8 + Math.random() * 1.8,
              "burnZone"
            );
          }
        }
        if (m.timer <= 0) {
          mines.splice(i, 1);
        }
        continue;
      }
      // Check if player is in explosion zone
      const distToPlayer = Math.hypot(player.x - m.x, player.y - m.y);
      if (!m.exploded && distToPlayer < 52 + player.radius) {
        m.exploded = true;
        // Damage player
        player.health -= 2;
        // Draw explosion ring
        ctx.save();
        ctx.beginPath();
        ctx.arc(m.x, m.y, 52, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 187, 0, 0.55)";
        ctx.lineWidth = 8;
        // Removed shadowColor and shadowBlur for mobs
        ctx.stroke();
        ctx.restore();
        // Dramatic explosion particles (like kamikaze)
        for (let j = 0; j < KAMIKAZE_MINE_PARTICLE_COUNT; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.1 + Math.random() * 1.5;
          const color = ["#ffbb00","#fff200","#ff4444"][Math.floor(Math.random()*3)];
          const size = 2 + Math.random() * 2.5;
          const life = 20 + Math.random() * 14;
          const decay = 0.89 + Math.random() * 0.04;
          spawnParticle(
            m.x,
            m.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            life,
            color,
            decay,
            size,
            "enemyDeath"
          );
        }
        mines.splice(i, 1);
        continue;
      }
      // Remove mine after timer expires
      m.timer -= delta * SPEED_MULTIPLIER;
      if (m.timer <= 0) {
        // Mine explodes visually and damages player if in range
        const distToPlayer = Math.hypot(player.x - m.x, player.y - m.y);
        if (distToPlayer < 52 + player.radius) {
          player.health -= 2;
        }
        // Draw explosion ring
        ctx.save();
        ctx.beginPath();
        ctx.arc(m.x, m.y, 52, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 187, 0, 0.55)";
        ctx.lineWidth = 8;
        ctx.shadowColor = "#ffbb00";
        ctx.shadowBlur = 32;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
        // Dramatic explosion particles (like kamikaze)
        for (let j = 0; j < KAMIKAZE_MINE_PARTICLE_COUNT; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.1 + Math.random() * 1.5;
          const color = ["#ffbb00","#fff200","#ff4444"][Math.floor(Math.random()*3)];
          const size = 2 + Math.random() * 2.5;
          const life = 20 + Math.random() * 14;
          const decay = 0.89 + Math.random() * 0.04;
          spawnParticle(
            m.x,
            m.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            life,
            color,
            decay,
            size,
            "enemyDeath"
          );
        }
        mines.splice(i, 1);
      }
    }
  }

  // Draw mines with visible trigger zone
  function drawMines() {
    for (let m of mines) {
      if (m.type === "burn") {
        const burnRadius = typeof m.radius === "number" ? m.radius : 72;
        const burnLifeRatio = Math.max(0, Math.min(1, (m.timer || 0) / 360));
        ctx.save();
        // Cache the gradient per mine, update if position or radius changes
        if (!m._scorchGradient || m._scorchGradientParams === undefined ||
            m._scorchGradientParams.x !== m.x ||
            m._scorchGradientParams.y !== m.y ||
            m._scorchGradientParams.radius !== burnRadius) {
          m._scorchGradient = ctx.createRadialGradient(m.x, m.y, burnRadius * 0.2, m.x, m.y, burnRadius);
          m._scorchGradient.addColorStop(0, "rgba(35, 20, 15, 0.45)");
          m._scorchGradient.addColorStop(0.7, "rgba(22, 14, 12, 0.28)");
          m._scorchGradient.addColorStop(1, "rgba(8, 6, 6, 0.08)");
          m._scorchGradientParams = { x: m.x, y: m.y, radius: burnRadius };
        }
        ctx.globalAlpha = 0.65 * burnLifeRatio;
        ctx.fillStyle = m._scorchGradient;
        ctx.beginPath();
        ctx.arc(m.x, m.y, burnRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.58 * burnLifeRatio;
        ctx.strokeStyle = "#ff8a00";
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(m.x, m.y, burnRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        continue;
      }
      ctx.save();
      // Draw trigger zone ring
      ctx.beginPath();
      ctx.arc(m.x, m.y, 52, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 187, 0, 0.28)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      // Removed shadowColor and shadowBlur for mobs
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw soft shadow under mine
      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y + m.radius * 0.55, m.radius * 1.05, m.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(40, 40, 40, 1)';
      ctx.filter = 'blur(2.5px)';
      ctx.fill();
      ctx.filter = 'none';
      ctx.restore();

      // Draw mine image core (larger)
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.translate(m.x, m.y);
      ctx.drawImage(mineImg, -m.radius * 1.50, -m.radius * 1.50, m.radius * 3, m.radius * 3);
      ctx.restore();

      ctx.restore();
    }
  }

  document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if ((k === "escape" || k === "r") && gameStarted && !showMenuScreen) {
      e.preventDefault();
      showReturnToMenuModal();
      return;
    }
    if (k === "e") { showStats = !showStats; paused = showStats; }
    if (k === "o") {
      if (window._editorSessionActive && window.SentinelEditor && typeof window.SentinelEditor.showWaveEditor === "function") {
        window.SentinelEditor.showWaveEditor();
      }
    }
    if (statPoints > 0 && ["1", "2", "3", "4", "5", "6"].includes(k)) applyStatPoint(k);
  });

  document.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });
  let firstRightClickDone = false;
  // Freeze logic: 2s freeze on right click press (not hold)
  let freezeActive = false;
  let freezeTimer = 0;
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 2) {
      if (!freezeActive) {
        freezeActive = true;
        freezeTimer = 0.5;
      }
      followMouse = true;
      if (!firstRightClickDone && wave === 1 && gameStarted) {
        firstRightClickDone = true;
        try {
          let warnAudio = new Audio('warning.wav');
          warnAudio.volume = window.sentinelVolume && window.sentinelVolume.warning !== undefined ? window.sentinelVolume.warning : 1.0;
          warnAudio.playbackRate = 0.7;
          warnAudio.play();
        } catch (e) {}
      }
    }
  });
  canvas.addEventListener("mouseup", (e) => {
    if (e.button === 2) {
      // If freeze is active, reset timer to full duration
      if (freezeActive) {
        freezeTimer = 0.5;
        freezeActive = false;
      }
      followMouse = false;
      if (window.laserAudio && !window.laserAudio.paused) {
        window.laserAudio.pause();
        window.laserAudio.currentTime = 0;
      }
    }
  });

  // Hide cursor when holding right-click, show when released
  let crosshairImg = new window.Image();
  crosshairImg.src = "crosshair4m.png";
  let crosshairCursorUrl = null;
  crosshairImg.onload = function() {
    // Dynamically set hotspot to center of image
    const w = crosshairImg.width;
    const h = crosshairImg.height;
    crosshairCursorUrl = `url('crosshair4m.png') ${Math.floor(w/2)} ${Math.floor(h/2)}, crosshair`;
  };

  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 2) {
      // Use custom crosshair image as cursor, centered
      if (crosshairCursorUrl) {
        canvas.style.cursor = crosshairCursorUrl;
      } else {
        // fallback if image not loaded yet
        canvas.style.cursor = "crosshair";
      }
    }
  });
  canvas.addEventListener("mouseup", (e) => {
    if (e.button === 2) {
      canvas.style.cursor = "default";
    }
  });
  // Reset cursor if context menu is triggered (failsafe)
  canvas.addEventListener("contextmenu", (e) => {
    canvas.style.cursor = "default";
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // Game Over click handler
  canvas.addEventListener("click", (e) => {
    if (gameOver && window._gameOverTime !== undefined) {
      const elapsedSeconds = (Date.now() - window._gameOverTime) / 1000;
      
      // Second death - always return to menu on click
      if (window._playerUsedContinue) {
        if (window._editorSessionActive) {
          return;
        }
        finalizeRunBytes();
        showMenuScreen = true;
        window._playMenuAmbienceOnShowMenu = true;
        playMenuAmbience();
        showMenu();
        gameOver = false;
        window._gameOverTime = undefined;
        window._playerUsedContinue = false;
        followMouse = false;
      }
      // First death - continue with full health if clicked before 5 seconds
      else if (elapsedSeconds < 5) {
        player.health = player.maxHealth;
        gameOver = false;
        window._gameOverTime = undefined;
        window._playerUsedContinue = true;
        followMouse = true;
      }
    }
  });

  function applyStatPoint(k) {
    const statKeys = ["Range", "Power", "AttackSpeed", "Movement", "Vitality", "Pickup"];
    const stat = statKeys[parseInt(k) - 1];
    if (stat) {
      // Enforce max stat value per stat (max = current level + 1)
      if (player.stats[stat] < level+1) {
        const oldMaxHealth = player.maxHealth;
        const oldHealth = player.health;
        player.stats[stat]++;
        statPoints--;
        applyStats();
        if (stat === "Vitality") {
          const maxHealthDelta = player.maxHealth - oldMaxHealth;
          player.health = Math.max(0, Math.min(player.maxHealth, oldHealth + maxHealthDelta));
        }
      }
    }
  }

  function applyStats() {
    const previousMaxHealth = player.maxHealth;
    const wasFullHealth = player.health >= previousMaxHealth;
    const previousHealthRatio = previousMaxHealth > 0 ? (player.health / previousMaxHealth) : 1;

    // Get protocol stat modifiers from ProtocolSystem
    const protocolMods = ProtocolSystem.getStatMods();
    
    // Update player stats based on level upgrades + protocols
    // Range: +5 per level point, +protocol mod
    player.range = 80 + (player.stats.Range + protocolMods.Range) * 5;
    
    // Power (Attack Power): +1 per level point, +protocol mod
    player.damage = 1 + (player.stats.Power + protocolMods.Power);
    
    // Movement: +0.2 per level point, +protocol mod
    player.speed = player.baseSpeed + (player.stats.Movement + protocolMods.Movement) * 0.25;
    
    // AttackSpeed (Intensity): base 20 - level points - protocol mod
    player.cooldownBase = 20 - (player.stats.AttackSpeed + protocolMods.Intensity);
    
    // Vitality (Health): +2 per level point, +protocol mod
    player.maxHealth = 10 + (player.stats.Vitality + protocolMods.Health) * 2;

    if (player.maxHealth !== previousMaxHealth) {
      if (wasFullHealth) {
        player.health = player.maxHealth;
      } else {
        player.health = previousHealthRatio * player.maxHealth;
      }
    }
    
    // Pickup: +8 per level point, +protocol mod
    player.pickupRadius = 48 + (player.stats.Pickup + protocolMods.Pickup) * 8;
    
    if (player.health > player.maxHealth) player.health = player.maxHealth;
  }

  window.SentinelEditorBridge = {
    getPaused: () => paused,
    setPaused: (value) => {
      paused = !!value;
    },
    getEditorSessionActive: () => !!window._editorSessionActive,
    setEditorSessionActive: (value) => {
      window._editorSessionActive = !!value;
    },
    getEditorDiscoverAllProtocols: () => {
      if (typeof ProtocolSystem.isEditorDiscoverAllEnabled === "function") {
        return !!ProtocolSystem.isEditorDiscoverAllEnabled();
      }
      return false;
    },
    setEditorDiscoverAllProtocols: (value) => {
      if (typeof ProtocolSystem.setEditorDiscoverAllEnabled === "function") {
        ProtocolSystem.setEditorDiscoverAllEnabled(!!value);
      }
    },
    getWaveEditorState: () => ({
      wave,
      burstCount,
      burstInterval,
      customBursts: window._customBursts,
      customBrutes: window._customBrutes,
      customSlingers: window._customSlingers,
      customShielders: window._customShielders,
      customBeamers: window._customBeamers,
      customKamikazes: window._customKamikazes,
      customStalkers: window._customStalkers,
      customBossMinors: window._customBossMinors,
      customBosses: window._customBosses,
      customSlingerBosses: window._customSlingerBosses,
      customBruteBosses: window._customBruteBosses,
      mobIntervals: window._customMobBurstIntervals
    }),
    getWavePresetConfig: (targetWave) => {
      const waveNumber = parseInt(targetWave, 10);
      if (!Number.isFinite(waveNumber) || waveNumber < 1) return null;

      const savedState = {
        wave,
        burstCount,
        burstInterval,
        burstIndex,
        burstTimer,
        waveAnnouncementTimer,
        customBursts: Array.isArray(window._customBursts) ? window._customBursts.slice() : window._customBursts,
        customBrutes: Array.isArray(window._customBrutes) ? window._customBrutes.slice() : window._customBrutes,
        customSlingers: Array.isArray(window._customSlingers) ? window._customSlingers.slice() : window._customSlingers,
        customShielders: Array.isArray(window._customShielders) ? window._customShielders.slice() : window._customShielders,
        customBeamers: Array.isArray(window._customBeamers) ? window._customBeamers.slice() : window._customBeamers,
        customKamikazes: Array.isArray(window._customKamikazes) ? window._customKamikazes.slice() : window._customKamikazes,
        customStalkers: Array.isArray(window._customStalkers) ? window._customStalkers.slice() : window._customStalkers,
        customBossMinors: Array.isArray(window._customBossMinors) ? window._customBossMinors.slice() : window._customBossMinors,
        customBosses: Array.isArray(window._customBosses) ? window._customBosses.slice() : window._customBosses,
        customSlingerBosses: Array.isArray(window._customSlingerBosses) ? window._customSlingerBosses.slice() : window._customSlingerBosses,
        customBruteBosses: Array.isArray(window._customBruteBosses) ? window._customBruteBosses.slice() : window._customBruteBosses,
        customMobBurstIntervals: window._customMobBurstIntervals ? { ...window._customMobBurstIntervals } : null,
        bossMinorBursts: Array.isArray(window._bossMinorBursts) ? window._bossMinorBursts.slice() : window._bossMinorBursts,
        bossMinorCount: window._bossMinorCount,
        wave10MinorsSpawned: window._wave10MinorsSpawned,
        editorPreviewWave: window._editorPreviewWave,
        editorPreviewOverride: window._editorPreviewOverride,
        enemies: enemies.slice(),
        mines: mines.slice()
      };

      const originalSetTimeout = window.setTimeout;
      window.setTimeout = function () { return 0; };

      try {
        wave = waveNumber;
        enemies.length = 0;
        mines.length = 0;
        spawnWave();

        return {
          burstCount,
          burstInterval,
          customBursts: Array.isArray(window._customBursts) ? window._customBursts.slice() : window._customBursts,
          customBrutes: Array.isArray(window._customBrutes) ? window._customBrutes.slice() : window._customBrutes,
          customSlingers: Array.isArray(window._customSlingers) ? window._customSlingers.slice() : window._customSlingers,
          customShielders: Array.isArray(window._customShielders) ? window._customShielders.slice() : window._customShielders,
          customBeamers: Array.isArray(window._customBeamers) ? window._customBeamers.slice() : window._customBeamers,
          customKamikazes: Array.isArray(window._customKamikazes) ? window._customKamikazes.slice() : window._customKamikazes,
          customStalkers: Array.isArray(window._customStalkers) ? window._customStalkers.slice() : window._customStalkers,
          customBossMinors: Array.isArray(window._customBossMinors) ? window._customBossMinors.slice() : window._customBossMinors,
          customBosses: Array.isArray(window._customBosses) ? window._customBosses.slice() : window._customBosses,
          customSlingerBosses: Array.isArray(window._customSlingerBosses) ? window._customSlingerBosses.slice() : window._customSlingerBosses,
          customBruteBosses: Array.isArray(window._customBruteBosses) ? window._customBruteBosses.slice() : window._customBruteBosses,
          mobIntervals: window._customMobBurstIntervals ? { ...window._customMobBurstIntervals } : undefined
        };
      } catch (_) {
        return null;
      } finally {
        window.setTimeout = originalSetTimeout;

        wave = savedState.wave;
        burstCount = savedState.burstCount;
        burstInterval = savedState.burstInterval;
        burstIndex = savedState.burstIndex;
        burstTimer = savedState.burstTimer;
        waveAnnouncementTimer = savedState.waveAnnouncementTimer;
        window._customBursts = savedState.customBursts;
        window._customBrutes = savedState.customBrutes;
        window._customSlingers = savedState.customSlingers;
        window._customShielders = savedState.customShielders;
        window._customBeamers = savedState.customBeamers;
        window._customKamikazes = savedState.customKamikazes;
        window._customStalkers = savedState.customStalkers;
        window._customBossMinors = savedState.customBossMinors;
        window._customBosses = savedState.customBosses;
        window._customSlingerBosses = savedState.customSlingerBosses;
        window._customBruteBosses = savedState.customBruteBosses;
        window._customMobBurstIntervals = savedState.customMobBurstIntervals;
        window._bossMinorBursts = savedState.bossMinorBursts;
        window._bossMinorCount = savedState.bossMinorCount;
        window._wave10MinorsSpawned = savedState.wave10MinorsSpawned;
        window._editorPreviewWave = savedState.editorPreviewWave;
        window._editorPreviewOverride = savedState.editorPreviewOverride;
        enemies.length = 0;
        enemies.push(...savedState.enemies);
        mines.length = 0;
        mines.push(...savedState.mines);
      }
    },
    getPlayer: () => player,
    getLevel: () => level,
    setLevel: (value) => {
      const maxLevel = Number.isFinite(MAX_LEVEL) ? MAX_LEVEL : 50;
      const parsed = parseInt(value, 10);
      if (!Number.isFinite(parsed)) return;
      level = Math.max(1, Math.min(maxLevel, parsed));
      xp = 0;
      xpToLevel = level >= maxLevel ? Infinity : Math.floor(10 + Math.pow(level, 1.8));
    },
    getStatPoints: () => statPoints,
    setStatPoints: (value) => {
      statPoints = value;
    },
    clearLoots: () => {
      xpDrops.length = 0;
      slingerDrops.length = 0;
      bruteDrops.length = 0;
      healthDrops.length = 0;
      protocolOrbs.length = 0;
    },
    applyStats,
    spawnWaveNow: (targetWave, previewOverride) => {
      if (!gameStarted || showMenuScreen || showLoadingScreen) {
        if (typeof window.sentinelDifficulty !== "string") {
          window.sentinelDifficulty = "Normal";
        }
        showLoadingScreen = false;
        showMenuScreen = false;
        restartGame();
        gameStarted = true;
      }

      gameOver = false;
      window._gameOverTime = undefined;
      window._playerUsedContinue = false;
      followMouse = false;
      paused = false;
      showStats = false;
      player.health = player.maxHealth;

      wave = targetWave;
      enemies.length = 0;
      mines.length = 0;
      spawnWave();

      if (previewOverride && typeof previewOverride === "object") {
        window._editorSessionActive = true;
        window._editorPreviewWave = targetWave;
        window._editorPreviewOverride = {
          burstCount: previewOverride.burstCount,
          burstInterval: previewOverride.burstInterval,
          customBursts: Array.isArray(previewOverride.customBursts) ? previewOverride.customBursts.slice() : undefined,
          customBrutes: Array.isArray(previewOverride.customBrutes) ? previewOverride.customBrutes.slice() : undefined,
          customSlingers: Array.isArray(previewOverride.customSlingers) ? previewOverride.customSlingers.slice() : undefined,
          customShielders: Array.isArray(previewOverride.customShielders) ? previewOverride.customShielders.slice() : undefined,
          customBeamers: Array.isArray(previewOverride.customBeamers) ? previewOverride.customBeamers.slice() : undefined,
          customKamikazes: Array.isArray(previewOverride.customKamikazes) ? previewOverride.customKamikazes.slice() : undefined,
          customStalkers: Array.isArray(previewOverride.customStalkers) ? previewOverride.customStalkers.slice() : undefined,
          customBossMinors: Array.isArray(previewOverride.customBossMinors) ? previewOverride.customBossMinors.slice() : undefined,
          customBosses: Array.isArray(previewOverride.customBosses) ? previewOverride.customBosses.slice() : undefined,
          customSlingerBosses: Array.isArray(previewOverride.customSlingerBosses) ? previewOverride.customSlingerBosses.slice() : undefined,
          customBruteBosses: Array.isArray(previewOverride.customBruteBosses) ? previewOverride.customBruteBosses.slice() : undefined
        };
        burstCount = previewOverride.burstCount;
        burstInterval = previewOverride.burstInterval;
      }
    }
  };

  function tryDiscoverProtocolFromEnemy(enemyType, x, y, options = {}) {
    const forceDrop = !!(options && options.forceDrop);
    const forcedRarity = options && typeof options.rarity === "string" ? options.rarity : null;
    const dropRules = {
      grunt: { chance: 0.08 },
      kamikaze: { chance: 0.1 },
      stalker: { chance: 0.2 },
      shielder: { chance: 0.18 },
      beamer: { chance: 0.22 },
      slinger: { chance: 0.18 },
      brute: { chance: 0.22 },
      bruteBoss: { chance: 1.0 },
      gruntBossMinor: { chance: 0.35 },
      gruntBoss: { chance: 1.0 }
    };

    const rule = dropRules[enemyType] || { chance: 0.1 };
    if (!forceDrop && Math.random() > rule.chance) return;

    const activeOrbProtocols = new Set(protocolOrbs.map(orb => orb.protocolName));
    const droppableProtocols = Object.keys(PROTOCOLS)
      .filter(name => !activeOrbProtocols.has(name));
    if (droppableProtocols.length === 0) return;

    const getPool = (rarity, tiers = null) => {
      return droppableProtocols.filter(name => {
        const proto = PROTOCOLS[name];
        if (proto.rarity !== rarity) return false;
        if (!tiers || tiers.length === 0) return true;
        return tiers.includes(proto.tier);
      });
    };

    const chooseRandom = (pool) => pool[Math.floor(Math.random() * pool.length)];

    let pool = [];
    if (forcedRarity === "Rare" || forcedRarity === "Common") {
      pool = getPool(forcedRarity);
    } else if (enemyType === "grunt") {
      // Common lower only
      pool = getPool("Common", ["Lower"]);
      if (pool.length === 0) pool = getPool("Common");
    } else if (enemyType === "kamikaze") {
      // Common lower only
      pool = getPool("Common", ["Lower"]);
      if (pool.length === 0) pool = getPool("Common");
    } else if (enemyType === "slinger") {
      // Any common
      pool = getPool("Common");
    } else if (enemyType === "stalker") {
      // Common standard/higher, fallback to any common
      pool = getPool("Common", ["Standard", "Higher"]);
      if (pool.length === 0) pool = getPool("Common");
    } else if (enemyType === "beamer") {
      // Common higher, small chance for rare lower
      if (Math.random() < 0.15) {
        pool = getPool("Rare", ["Lower"]);
      }
      if (pool.length === 0) pool = getPool("Common", ["Higher"]);
      if (pool.length === 0) pool = getPool("Common", ["Standard", "Higher"]);
      if (pool.length === 0) pool = getPool("Common");
    } else if (enemyType === "shielder") {
      pool = getPool("Common", ["Standard", "Higher"]);
      if (pool.length === 0) pool = getPool("Common");
    } else if (enemyType === "brute") {
      // Any common
      pool = getPool("Common");
    } else if (enemyType === "bruteBoss") {
      // Guaranteed rare from any tier
      pool = getPool("Rare");
    } else if (enemyType === "gruntBossMinor") {
      // Common standard / higher, low chance rare lower
      if (Math.random() < 0.2) {
        pool = getPool("Rare", ["Lower"]);
      }
      if (pool.length === 0) pool = getPool("Common", ["Standard", "Higher"]);
      if (pool.length === 0) pool = getPool("Common");
    } else if (enemyType === "gruntBoss") {
      // Guaranteed rare
      pool = getPool("Rare");
    }

    if (pool.length === 0) pool = droppableProtocols;

    const droppedProtocol = chooseRandom(pool);
    if (!droppedProtocol) return;

    const rarity = PROTOCOLS[droppedProtocol].rarity;
    const requiredSeconds = rarity === "Rare" ? 4 : 3;
    protocolOrbs.push({
      x,
      y,
      radius: rarity === "Rare" ? 12 : 10,
      type: "protocolOrb",
      protocolName: droppedProtocol,
      rarity,
      requiredFrames: requiredSeconds * 60,
      progressFrames: 0
    });
    console.log(`✓ Protocol orb dropped from ${enemyType}: ${droppedProtocol} (${rarity})`);
  }

  function completeProtocolOrb(orb) {
    if (!orb) return;
    const useRunOnlyDiscovery = !!window._editorSessionActive;
    const wasPermanentlyDiscovered = !!(ProtocolSystem.protocolBoard && ProtocolSystem.protocolBoard[orb.protocolName] && ProtocolSystem.protocolBoard[orb.protocolName].discovered);
    const wasRunDiscovered = typeof ProtocolSystem.isRunDiscovered === "function"
      ? ProtocolSystem.isRunDiscovered(orb.protocolName)
      : Array.isArray(ProtocolSystem.runDiscoveredProtocols) && ProtocolSystem.runDiscoveredProtocols.includes(orb.protocolName);
    const isFavoriteProtocol = typeof ProtocolSystem.isFavorite === "function"
      ? ProtocolSystem.isFavorite(orb.protocolName)
      : false;
    const favoriteWarningColor = "#ffd84d";
    const protocolInfluence = Math.max(0, Math.floor((PROTOCOLS[orb.protocolName]?.influence) || 0));
    if (!useRunOnlyDiscovery && protocolInfluence > 0) {
      collectRunBytes(protocolInfluence);
    }
    const discovered = useRunOnlyDiscovery && typeof ProtocolSystem.discoverRunOnly === "function"
      ? ProtocolSystem.discoverRunOnly(orb.protocolName)
      : ProtocolSystem.discover(orb.protocolName);
    if (discovered) {
      for (let i = 0; i < 18; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 2;
        spawnParticle(
          orb.x,
          orb.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          35 + Math.floor(Math.random() * 35),
          orb.rarity === "Rare" ? "#d896ff" : "#7bf4ff",
          0.9 + Math.random() * 0.05,
          2 + Math.random() * 2,
          "enemyDeath"
        );
      }
      if (useRunOnlyDiscovery) {
        console.log(`✓ Protocol discovered from orb (run-only editor): ${orb.protocolName}`);
      } else {
        console.log(`✓ Protocol discovered from orb: ${orb.protocolName}`);
      }
      if (!wasRunDiscovered) {
        protocolWarnings.push({
          text: `NEW PROTOCOL ACQUIRED: ${orb.protocolName}`,
          favorite: isFavoriteProtocol,
          color: isFavoriteProtocol ? favoriteWarningColor : "#7bf4ff",
          timer: 210
        });
      }
      if (!useRunOnlyDiscovery && !wasPermanentlyDiscovered) {
        protocolWarnings.push({
          text: `NEW PROTOCOL UNLOCKED (DISCOVERED): ${orb.protocolName}`,
          favorite: isFavoriteProtocol,
          color: isFavoriteProtocol ? favoriteWarningColor : "#00ff88",
          timer: 230
        });
      }
      while (protocolWarnings.length > 4) {
        protocolWarnings.shift();
      }
      if (!useRunOnlyDiscovery) {
        console.log(`+${protocolInfluence} Bytes (Influence)`);
      }
    }
  }

  function drawProtocolWarnings() {
    if (!protocolWarnings.length) return;

    for (let i = protocolWarnings.length - 1; i >= 0; i--) {
      const warning = protocolWarnings[i];
      if (!paused) warning.timer -= 1;
      if (warning.timer <= 0) {
        protocolWarnings.splice(i, 1);
      }
    }

    if (!protocolWarnings.length) return;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < protocolWarnings.length; i++) {
      const warning = protocolWarnings[i];
      const alpha = Math.max(0, Math.min(1, warning.timer / 40));
      const y = 128 + (i * 30);

      ctx.globalAlpha = 0.62 * alpha;
      ctx.fillStyle = "#00161d";
      ctx.fillRect(canvas.width / 2 - 305, y - 12, 610, 24);

      ctx.globalAlpha = 0.95 * alpha;
      ctx.strokeStyle = warning.color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(canvas.width / 2 - 305, y - 12, 610, 24);

      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = warning.color;
      ctx.shadowColor = warning.color;
      ctx.shadowBlur = 10;
      ctx.fillText(warning.text, canvas.width / 2, y);

      if (warning.favorite) {
        const textWidth = ctx.measureText(warning.text).width;
        const rightLimit = (canvas.width / 2 + 305) - 16;
        const starX = Math.min(rightLimit, (canvas.width / 2) + (textWidth / 2) + 12);
        ctx.fillStyle = "#ffd84d";
        ctx.shadowColor = "#ffd84d";
        ctx.shadowBlur = 12;
        ctx.fillText("✶", starX, y);
      }
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }



  function constrainPlayer() {
    // Keep player within canvas bounds
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
  }

  function createParticles(x, y, color) {
    // Create generic particles at (x, y)
    for (let i = 0; i < 10; i++) {
      spawnParticle(
        x,
        y,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        18 + Math.floor(Math.random() * 72),
        color,
        1,
        2,
        "generic"
      );
    }
  }

  function drawParticles() {
    // Draw all particles
    for (let p of particles) {
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.color;
      const s = p.size || 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Draw only particles of a specific type
  function drawParticlesOfType(type) {
    for (let p of particles) {
      if (p.type === type) {
        ctx.save();
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = p.color;
        const s = p.size || 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function updatePlayer(delta) {
    if (typeof player._prevX === 'undefined') player._prevX = player.x;
    if (typeof player._prevY === 'undefined') player._prevY = player.y;
    if (typeof player._followVX !== 'number') player._followVX = 0;
    if (typeof player._followVY !== 'number') player._followVY = 0;
    if (typeof player._hoverPhase !== 'number') player._hoverPhase = Math.random() * Math.PI * 2;
    if (typeof player._cursorStillTime !== 'number') player._cursorStillTime = 0;
    if (typeof player._lastMouseX !== 'number') player._lastMouseX = mouseX;
    if (typeof player._lastMouseY !== 'number') player._lastMouseY = mouseY;

    const frameScale = delta * SPEED_MULTIPLIER;
    const mouseDeltaX = mouseX - player._lastMouseX;
    const mouseDeltaY = mouseY - player._lastMouseY;
    const mouseDelta = Math.hypot(mouseDeltaX, mouseDeltaY);
    if (mouseDelta < 0.25) player._cursorStillTime += frameScale;
    else player._cursorStillTime = 0;
    player._lastMouseX = mouseX;
    player._lastMouseY = mouseY;

    if (followMouse) {
      let targetX = mouseX;
      let targetY = mouseY;
      if (player._cursorStillTime > 4) {
        player._hoverPhase += 0.07 * frameScale;
        const hoverRadius = Math.min(6, Math.max(2.2, player.speed * 0.95));
        targetX += Math.cos(player._hoverPhase) * hoverRadius;
        targetY += Math.sin(player._hoverPhase * 0.93) * (hoverRadius * 0.58);
      }

      const dx = targetX - player.x;
      const dy = targetY - player.y;
      const dist = Math.hypot(dx, dy);

      let desiredVX = 0;
      let desiredVY = 0;
      if (dist > 0.001) {
        const arriveRadius = 26;
        const speedScale = dist < arriveRadius ? (dist / arriveRadius) : 1;
        const desiredSpeed = player.speed * speedScale;
        desiredVX = (dx / dist) * desiredSpeed;
        desiredVY = (dy / dist) * desiredSpeed;
      }

      const smoothing = Math.min(0.28, 0.12 + frameScale * 0.018);
      player._followVX += (desiredVX - player._followVX) * smoothing;
      player._followVY += (desiredVY - player._followVY) * smoothing;

      if (dist < 0.85 && player._cursorStillTime > 4) {
        player._followVX *= 0.78;
        player._followVY *= 0.78;
      }

      player.x += player._followVX * frameScale;
      player.y += player._followVY * frameScale;
    } else {
      player._followVX *= 0.78;
      player._followVY *= 0.78;
      player._cursorStillTime = 0;
    }

    player._prevX = player.x;
    player._prevY = player.y;
    constrainPlayer();
    if (player.attackCooldown > 0) player.attackCooldown -= delta * SPEED_MULTIPLIER;
    if (playerLevelUpTimer > 0) playerLevelUpTimer -= delta * SPEED_MULTIPLIER;
  }

  // Persistent laser sound for player attack
  let laserAudio = null;
  window.laserAudio = null;

  // Volume mixer variables (edit outside game to adjust)
  window.sentinelVolume = {
    laser: 0.05, // sparky_laser.wav
    click: 1.0, // click.wav (max for HTMLAudioElement)
    clickBoost: 1.5, // Extra gain for click.wav (Web Audio API)
    warning: 0, // warning.wav volume
    enemyProjectile: 0.1 // laser.wav volume (lowered)
    // Add more as needed
  };
  function autoAttack() {
    let nearest = null, minDist = Infinity;
    for (let e of enemies) {
      if (e.health <= 0) continue;
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    }

    window._nearestEnemy = nearest;
    let targetAngle = playerVisualAngle;
    if (nearest) {
      targetAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
      player._scanSnapCooldown = 0;
      player._scanTargetAngle = targetAngle;
    } else {
      if (typeof player._scanTargetAngle !== "number") player._scanTargetAngle = playerVisualAngle;
      if (typeof player._scanSnapCooldown !== "number") player._scanSnapCooldown = 0;
      player._scanSnapCooldown--;
      if (player._scanSnapCooldown <= 0) {
        player._scanTargetAngle = Math.random() * Math.PI * 2;
        player._scanSnapCooldown = 28 + Math.floor(Math.random() * 53);
      }
      targetAngle = player._scanTargetAngle;
    }
    const angleDiff = ((targetAngle - playerVisualAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    playerVisualAngle += angleDiff * (nearest ? 0.15 : 0.32);
    window._playerToEnemyAngle = playerVisualAngle;

    let isAttacking = nearest && minDist < player.range + nearest.radius && player.attackCooldown > 0 && followMouse;
    if (isAttacking) {
      if (!laserAudio) {
        laserAudio = new Audio('micro_crackle_sparkling_background.wav');
        laserAudio.loop = true;
        laserAudio.volume = window.sentinelVolume.laser;
        window.laserAudio = laserAudio;
      }
      laserAudio.volume = window.sentinelVolume.laser;
      if (laserAudio.paused) {
        laserAudio.currentTime = 0;
        laserAudio.play();
      }

      const laserColors = ["#00bfff", "#00e6ff", "#aaf6ff"];
      const offsets = [-1, 0, 1];
      const colorShift = Math.floor(Date.now() / 60) % 3;
      const dx = nearest.x - player.x;
      const dy = nearest.y - player.y;
      const dist = Math.hypot(dx, dy);
      const dirX = dx / dist;
      const dirY = dy / dist;
      const edgeX = nearest.x - dirX * nearest.radius;
      const edgeY = nearest.y - dirY * nearest.radius;

      for (let l = 0; l < 3; l++) {
        const color = laserColors[(l + colorShift) % 3];
        const offX = -offsets[l] * (nearest.y - player.y) / Math.hypot(dx, dy);
        const offY = offsets[l] * (nearest.x - player.x) / Math.hypot(dx, dy);
        ctx.save();
        ctx.lineWidth = 2;
        drawLine(player.x + offX, player.y + offY, edgeX + offX, edgeY + offY, color);
        ctx.restore();
      }

      const sparkCount = 3 + Math.floor(Math.random() * 2);
      for (let s = 0; s < sparkCount; s++) {
        const t = 0.2 + Math.random() * 0.6;
        const baseX = player.x + (edgeX - player.x) * t;
        const baseY = player.y + (edgeY - player.y) * t;
        const angle = Math.atan2(edgeY - player.y, edgeX - player.x) + (Math.random() - 0.5) * 1.2;
        const length = 12 + Math.random() * 20;
        const endX = baseX + Math.cos(angle) * length;
        const endY = baseY + Math.sin(angle) * length;
        const sparkColor = ["#aaf6ff", "#e0f7ff", "#00e6ff", "#ffffff"][Math.floor(Math.random() * 4)];
        drawLightningBolt(baseX, baseY, endX, endY, sparkColor, 6 + Math.floor(Math.random() * 3), 10 + Math.random() * 10);
      }

      ctx.save();
      // Removed custom shadow ellipse for mobs

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glowSteps = Math.max(8, Math.floor(dist / 18));
      for (let i = 0; i <= glowSteps; i++) {
        const t = i / glowSteps;
        const px = player.x + (edgeX - player.x) * t;
        const py = player.y + (edgeY - player.y) * t;
        const glowRadius = 22 + 18 * (1 - Math.abs(t - 0.5) * 1.5);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, glowRadius);
        grad.addColorStop(0, 'rgba(0, 180, 255, 0.08)');
        grad.addColorStop(0.4, 'rgba(0, 230, 255, 0.10)');
        grad.addColorStop(1, 'rgba(0, 120, 255, 0.0)');
        ctx.beginPath();
        ctx.arc(px, py, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      const steps = Math.floor(Math.hypot(edgeX - player.x, edgeY - player.y) / 65);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = player.x + (edgeX - player.x) * t;
        const py = player.y + (edgeY - player.y) * t;
        const palette = [
          "rgba(0, 191, 255, 0.7)",
          "rgba(173, 216, 230, 0.6)",
          "rgba(0, 255, 255, 0.65)"
        ];
        const color = palette[Math.floor(Math.random() * palette.length)];
        const speed = 1.2 + Math.random() * .5;
        spawnParticle(
          px,
          py,
          dirX * speed + (Math.random() - 0.2) * 1,
          dirY * speed + (Math.random() - 0.2) * 1,
          4 + Math.floor(Math.random() * 8),
          color,
          0.92 + Math.random() * 0.04,
          2.2 + Math.random() * 2,
          "laser"
        );
      }
    }

    let isAttackFrame = nearest && minDist < player.range + nearest.radius && player.attackCooldown <= 0 && followMouse;
    if (isAttackFrame) {
      drawLine(player.x, player.y, nearest.x, nearest.y, "LightBlue");
      const shieldReduction = Math.max(0, Math.min(0.8, Number(nearest.shieldReduction) || 0));
      nearest.health -= player.damage * (1 - shieldReduction);
      if (!isAttacking && laserAudio && !laserAudio.paused) {
        laserAudio.pause();
        laserAudio.currentTime = 0;
      }

      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 5;
        const speed = 2.2 + Math.random() * 2.2;
        const color = [
          "rgba(255,42,0,0.85)",
          "rgba(255,120,0,0.7)",
          "rgba(255,220,0,0.6)",
          "rgb(248, 144, 144)"
        ][Math.floor(Math.random() * 4)];
        spawnParticle(
          nearest.x,
          nearest.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          18 + Math.floor(Math.random() * 32),
          color,
          0.92 + Math.random() * 0.04,
          2.2 + Math.random() * 2.2,
          "enemyHit"
        );
      }

      player.attackCooldown = player.cooldownBase;
      if (nearest.health <= 0) {
        const noLootDrop = !!(nearest.noLoot || nearest.noXP);
        if (nearest.type === "gruntBoss") {
          gainXP(xpToLevel);
        }
        if (!noLootDrop && nearest.type === "grunt" && wave !== 5) {
          if (!nearest.noXP) {
            xpDrops.push({ x: nearest.x, y: nearest.y + 2 });
          }
        }
        if (!noLootDrop && nearest.type === "slinger") {
          slingerDrops.push({ x: nearest.x, y: nearest.y + 2 });
        }
        if (!noLootDrop && nearest.type === "stalker") {
          slingerDrops.push({ x: nearest.x, y: nearest.y + 2 });
        }
        if (!noLootDrop && nearest.type === "beamer") {
          slingerDrops.push({ x: nearest.x, y: nearest.y + 2 });
        }
        if (!noLootDrop && nearest.type === "shielder") {
          slingerDrops.push({ x: nearest.x, y: nearest.y + 2 });
        }
        if (!noLootDrop && nearest.type === "kamikaze") {
          slingerDrops.push({ x: nearest.x, y: nearest.y + 2 });
        }
        if (!noLootDrop && (nearest.type === "brute" || nearest.type === "bruteBoss")) {
          bruteDrops.push({ x: nearest.x + 3, y: nearest.y + 5 });
        }
        if (!noLootDrop && Math.random() < 0.15) {
          healthDrops.push({ x: nearest.x + 4, y: nearest.y + 6 });
        }
      }
    }
  }

  const MAX_LEVEL = 50;
  function gainXP(amount) {
    if (level >= MAX_LEVEL) return;
    xp += amount;
    while (xp >= xpToLevel && level < MAX_LEVEL) {
      xp -= xpToLevel;
      level++;
      statPoints += 2;
      // Restore health to max on level up
      player.health = player.maxHealth;
      // XP curve: fast early, slow late (quadratic scaling)
      xpToLevel = Math.floor(10 + Math.pow(level, 1.8));
      playerLevelUpTimer = 24; // 24 frames of level up flash
      // Level up particles: denser close, looser far, more total
      const total = 68;
      for (let i = 0; i < total; i++) {
        // Cluster more particles near player, fewer far out
        const angle = Math.random() * Math.PI * 2;
        // Use squared random for radius: more close, fewer far
        const t = Math.random();
        const speed = 1.5 + 8.5 * Math.pow(t, 2); // 1.5 to ~7.0, denser close, further spread
        spawnParticle(
          player.x,
          player.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          60 + Math.floor(Math.random() * 240),
          ["#FFA500", "#ffb84d", "#ff9900", "#ffcc80", "#8b5b00"][Math.floor(Math.random() * 5)],
          0.88 + Math.random() * 0.04,
          2,
          "levelUp"
        );
      }
    }
    // Cap at max level
    if (level >= MAX_LEVEL) {
      xp = 0;
      xpToLevel = Infinity;
    }
  }
const droplifelenght = 280;

  function updateXPDrops() {
    for (let i = xpDrops.length - 1; i >= 0; i--) {
      const d = xpDrops[i];
      if (Math.hypot(player.x - d.x, player.y - d.y) < player.pickupRadius) {
        try {
          let clickAudio = new Audio('click.wav');
          clickAudio.volume = window.sentinelVolume.click;
          if (window.AudioContext || window.webkitAudioContext) {
            let ctx = window._clickAudioCtx || (window._clickAudioCtx = new (window.AudioContext || window.webkitAudioContext)());
            let src = ctx.createMediaElementSource(clickAudio);
            let gain = ctx.createGain();
            gain.gain.value = window.sentinelVolume.clickBoost || 1.0;
            src.connect(gain).connect(ctx.destination);
          }
          clickAudio.play();
        } catch (e) {}
        gainXP(1);
        // XP pickup feedback: explode into persistent blue pieces
        // Grunt tones
        const palette = ["#FF00FF", "#910091", "#d900ff", "#c800b0", "#b800e0"];
        for (let j = 0; j < 18; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.5 + Math.random() * 1.8;
          let size = 2;
          if (j < 4) size = 4;
          if (j < 2) size = 7;
          const color = palette[Math.floor(Math.random() * palette.length)];
          spawnParticle(
            d.x,
            d.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            60 + Math.floor(Math.random() * 240),
            color,
            0.88 + Math.random() * 0.04,
            size,
            "xpDrop"
          );
        }
        xpDrops.splice(i, 1);
      }
    }
    
  }
    function updateslingerDrops() {
    for (let i = slingerDrops.length - 1; i >= 0; i--) {
      const d = slingerDrops[i];
      if (Math.hypot(player.x - d.x, player.y - d.y) < player.pickupRadius) {
        try {
          let clickAudio = new Audio('click.wav');
          clickAudio.volume = window.sentinelVolume.click;
          if (window.AudioContext || window.webkitAudioContext) {
            let ctx = window._clickAudioCtx || (window._clickAudioCtx = new (window.AudioContext || window.webkitAudioContext)());
            let src = ctx.createMediaElementSource(clickAudio);
            let gain = ctx.createGain();
            gain.gain.value = window.sentinelVolume.clickBoost || 1.0;
            src.connect(gain).connect(ctx.destination);
          }
          clickAudio.play();
        } catch (e) {}
        gainXP(2);
        // XP pickup feedback: explode into persistent blue pieces
        // Slinger drop tones
        const palette = ["#FFA500", "#ffb84d", "#ff9900", "#ffcc80", "#8b5b00"];
        for (let j = 0; j < 18; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.5 + Math.random() * 1.8;
          let size = 2;
          if (j < 4) size = 4;
          if (j < 2) size = 7;
          const color = palette[Math.floor(Math.random() * palette.length)];
          spawnParticle(
            d.x,
            d.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            60 + Math.floor(Math.random() * 240),
            color,
            0.88 + Math.random() * 0.04,
            size,
            "slingerDrop"
          );
        }
        slingerDrops.splice(i, 1);
      }
    }
  }

  function updateBruteDrops() {
    for (let i = bruteDrops.length - 1; i >= 0; i--) {
      const d = bruteDrops[i];
      if (Math.hypot(player.x - d.x, player.y - d.y) < player.pickupRadius) {
        try {
          let clickAudio = new Audio('click.wav');
          clickAudio.volume = window.sentinelVolume.click;
          if (window.AudioContext || window.webkitAudioContext) {
            let ctx = window._clickAudioCtx || (window._clickAudioCtx = new (window.AudioContext || window.webkitAudioContext)());
            let src = ctx.createMediaElementSource(clickAudio);
            let gain = ctx.createGain();
            gain.gain.value = window.sentinelVolume.clickBoost || 1.0;
            src.connect(gain).connect(ctx.destination);
          }
          clickAudio.play();
        } catch (e) {}
        gainXP(1);
        player.health = Math.min(player.maxHealth, player.health + 1);
        // XP pickup feedback: explode into persistent red pieces
        // Brute drop tones
        const palette = ["#8B0000", "#b22222", "#a52a2a", "#d11717", "#c80000"];
        for (let j = 0; j < 18; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.5 + Math.random() * 1.8;
          let size = 2;
          if (j < 4) size = 4;
          if (j < 2) size = 7;
          const color = palette[Math.floor(Math.random() * palette.length)];
          spawnParticle(
            d.x,
            d.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            60 + Math.floor(Math.random() * 240),
            color,
            0.88 + Math.random() * 0.04,
            size,
            "bruteDrop"
          );
        }
        bruteDrops.splice(i, 1);
      }
    }
  }

  function updateHealthDrops() {
    for (let i = healthDrops.length - 1; i >= 0; i--) {
      const d = healthDrops[i];
      if (Math.hypot(player.x - d.x, player.y - d.y) < player.pickupRadius) {
        try {
          let clickAudio = new Audio('click.wav');
          clickAudio.volume = window.sentinelVolume.click;
          if (window.AudioContext || window.webkitAudioContext) {
            let ctx = window._clickAudioCtx || (window._clickAudioCtx = new (window.AudioContext || window.webkitAudioContext)());
            let src = ctx.createMediaElementSource(clickAudio);
            let gain = ctx.createGain();
            gain.gain.value = window.sentinelVolume.clickBoost || 1.0;
            src.connect(gain).connect(ctx.destination);
          }
          clickAudio.play();
        } catch (e) {}
        player.health = Math.min(player.maxHealth, player.health + 1);
        // Health pickup feedback: explode into persistent green pieces
        for (let j = 0; j < 18; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.5 + Math.random() * 1.8; // fast start
          spawnParticle(
            d.x,
            d.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            60 + Math.floor(Math.random() * 240),
            Math.random() < 0.5 ? "#b11717" : "#d43636",
            0.88 + Math.random() * 0.04,
            2,
            "healthDrop"
          );
        }
        healthDrops.splice(i, 1);
      }
    }
  }

  function updateProtocolOrbs(delta) {
    const regressRate = 0.35;
    const pickupMod = (typeof ProtocolSystem !== "undefined" && ProtocolSystem.getStatMods)
      ? (ProtocolSystem.getStatMods().Pickup || 0)
      : 0;
    const effectivePickupStat = player.stats.Pickup + pickupMod;
    const pickupCaptureRate = Math.max(0.25, 1 + (effectivePickupStat * 0.12));

    for (let i = protocolOrbs.length - 1; i >= 0; i--) {
      const orb = protocolOrbs[i];
      const distToPlayer = Math.hypot(player.x - orb.x, player.y - orb.y);
      if (distToPlayer <= player.pickupRadius) {
        orb.progressFrames = Math.min(orb.requiredFrames, orb.progressFrames + (delta * SPEED_MULTIPLIER * pickupCaptureRate));
        if (orb.progressFrames >= orb.requiredFrames) {
          completeProtocolOrb(orb);
          protocolOrbs.splice(i, 1);
        }
      } else {
        orb.progressFrames = Math.max(0, orb.progressFrames - (delta * SPEED_MULTIPLIER * regressRate));
      }
    }
  }










//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-  
//-==-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=     WAVE     =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-  

  function getWaveControlContext() {
    return {
      getWave: () => wave,
      getBurstCount: () => burstCount,
      setBurstCount: (value) => {
        burstCount = value;
      },
      getBurstInterval: () => burstInterval,
      setBurstInterval: (value) => {
        burstInterval = value;
      },
      getBurstIndex: () => burstIndex,
      setBurstIndex: (value) => {
        burstIndex = value;
      },
      getBurstTimer: () => burstTimer,
      setBurstTimer: (value) => {
        burstTimer = value;
      },
      getEnemies: () => enemies,
      spawnEnemy: () => spawnEnemy(),
      applyWaveEnemyModifiers,
      getCanvasWidth: () => canvas.width,
      getCanvasHeight: () => canvas.height,
      getSpeedMultiplier: () => SPEED_MULTIPLIER,
      setWaveAnnouncementTimer: () => {
        waveAnnouncementTimer = WAVE_ANNOUNCE_DURATION;
      },
      getGruntSprite: () => gruntImg,
      getSlingerSprite: () => slingerImg,
      resetBurstProgress: () => {
        burstIndex = 0;
        burstTimer = 0;
      }
    };
  }

  // Main function to spawn waves based on the current wave number, with custom logic for each wave
  function spawnWave() {
    if (!window.SentinelWaveControl || typeof window.SentinelWaveControl.spawnWave !== "function") {
      console.warn("SentinelWaveControl.spawnWave is unavailable.");
      return;
    }
    window.SentinelWaveControl.spawnWave(getWaveControlContext());

  }
  


  function handleWaveSpawning(delta) {
    if (!window.SentinelWaveControl || typeof window.SentinelWaveControl.handleWaveSpawning !== "function") {
      return;
    }
    window.SentinelWaveControl.handleWaveSpawning(getWaveControlContext(), delta);

    
  }




//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-  
//-==-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=MISC FUNCTIONS=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-  

  function drawLine(x1, y1, x2, y2, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawHUD() {
    // ...existing code...
    if (window._editorSessionActive && gameStarted && !gameOver) {
      ctx.save();
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#ffe26c";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 10;
      ctx.fillText("Press O to open editor", canvas.width / 2, 65);
      ctx.restore();
    }
    if (showStats) {
      // ...existing code for stats panel...
      const statsPanelWidth = 320;
      const statsPanelHeight = 370;
      const statsPanelX = 10;
      const statsPanelY = 190;
      const statsPanelCenterX = statsPanelX + statsPanelWidth / 2;

      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = '#152c16';
      ctx.fillRect(statsPanelX, statsPanelY, statsPanelWidth, statsPanelHeight);
      // Green glowing border
      ctx.globalAlpha = 1.0;
      ctx.shadowColor = '#00ffdd';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#00ffdd';
      ctx.lineWidth = 3;
      ctx.strokeRect(statsPanelX, statsPanelY, statsPanelWidth, statsPanelHeight);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.restore();
      ctx.fillStyle = "#00ffdd";
      ctx.textAlign = "left";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Level: " + level + " (" + xp + "/" + xpToLevel + ")", statsPanelCenterX, 220);
      ctx.fillText("Hit Points: " + Math.round(player.health) + "/" + Math.round(player.maxHealth), statsPanelCenterX, 240);
      ctx.fillText("Power Allocation Points: " + statPoints, statsPanelCenterX, 260);
      ctx.fillText("Base Power Allocation Max: " + (level+1), statsPanelCenterX, 280);
      ctx.textAlign = "left";
      // Draw clickable stat labels with -/+ buttons and store their bounding boxes
      window._statButtonBoxes = [];
      window._statMinusButtonBoxes = [];
      window._statPlusButtonBoxes = [];
      const protocolModsForDisplay = ProtocolSystem.getStatMods();
      const statLabels = [
        { label: "Range", base: player.stats.Range, protocol: protocolModsForDisplay.Range, stat: 1 },
        { label: "Atk Power", base: player.stats.Power, protocol: protocolModsForDisplay.Power, stat: 2 },
        { label: "Atk Intensity", base: player.stats.AttackSpeed, protocol: protocolModsForDisplay.Intensity, stat: 3 },
        { label: "Movement", base: player.stats.Movement, protocol: protocolModsForDisplay.Movement, stat: 4 },
        { label: "Health", base: player.stats.Vitality, protocol: protocolModsForDisplay.Health, stat: 5 },
        { label: "Pickup Range", base: player.stats.Pickup, protocol: protocolModsForDisplay.Pickup, stat: 6 }
      ];
      for (let i = 0; i < statLabels.length; i++) {
        const stat = statLabels[i];
        const totalValue = stat.base + stat.protocol;
        const protocolValue = stat.protocol >= 0 ? `+${stat.protocol}` : `${stat.protocol}`;
        const bpValue = `B:${stat.base} P:${protocolValue}`;
        const totalText = `${totalValue}`;

        const col = i % 2;
        const row = Math.floor(i / 2);
        const panelCenter = col === 0
          ? statsPanelX + statsPanelWidth * 0.27
          : statsPanelX + statsPanelWidth * 0.73;
        const y = 320 + row * 74;

        ctx.font = "bold 16px sans-serif";
        ctx.font = "16px sans-serif";
        const totalTextWidth = ctx.measureText(totalText).width;
        const groupWidth = 18 + 8 + totalTextWidth + 8 + 18;
        // Stat name centered
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#00ffdd";
        ctx.fillText(stat.label, panelCenter, y);
        // Base / Protocol line
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#aaf6ff";
        ctx.fillText(bpValue, panelCenter, y + 12);
        // - button
        const minusX = panelCenter - (groupWidth / 2);
        ctx.fillStyle = stat.base > 0 ? "#00ffdd" : "#555";
        ctx.fillRect(minusX, y + 18, 18, 16);
        ctx.fillStyle = "#152c16";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("-", minusX + 9, y + 31);
        window._statMinusButtonBoxes.push({
          x: minusX,
          y: y + 18,
          w: 18,
          h: 16,
          stat: stat.stat
        });
        // Total value centered between buttons
        ctx.font = "16px sans-serif";
        ctx.fillStyle = "#00ffdd";
        ctx.textAlign = "center";
        const valueX = panelCenter;
        ctx.fillText(totalText, valueX, y + 31);
        window._statButtonBoxes.push({
          x: valueX - (totalTextWidth / 2),
          y: y + 18,
          w: totalTextWidth,
          h: 16,
          stat: stat.stat
        });
        // + button
        const plusX = panelCenter + (groupWidth / 2) - 18;
        ctx.fillStyle = statPoints > 0 && stat.base < (level+1) ? "#00ffdd" : "#555";
        ctx.fillRect(plusX, y + 18, 18, 16);
        ctx.fillStyle = "#152c16";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("+", plusX + 9, y + 31);
        window._statPlusButtonBoxes.push({
          x: plusX,
          y: y + 18,
          w: 18,
          h: 16,
          stat: stat.stat
        });
      }
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#aaf6ff";
      ctx.textAlign = "center";
      ctx.fillText("B: Base   P: Protocol   T: Total", statsPanelCenterX, statsPanelY + statsPanelHeight - 10);
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = '#152c16';
        ctx.fillRect(canvas.width / 2 - 330, canvas.height - 110, 660, 110);
        ctx.globalAlpha = 1.0;
        ctx.shadowColor = '#00ffdd';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = '#00ffdd';
        ctx.lineWidth = 3;
        ctx.strokeRect(canvas.width / 2 - 330, canvas.height - 110, 660, 110);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#00ffdd";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("[1]-> Range  [2]-> Power  [3]-> Atk Speed  [4]-> Movement  [5]-> Vitality  [6]-> Pickup", canvas.width / 2, canvas.height - 85);
        ctx.restore();

    // Protocol Selection Panel (right side, wider with scrolling, organized by families)
    if (showStats) {
      const panelWidth = 320;
      const panelHeight = 370;
      const panelX = canvas.width - panelWidth - 10;
      const panelY = 190;
      const contentY = panelY + 45;
      const contentHeight = panelHeight - 55;
      
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = '#152c16';
      ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
      // Green glowing border
      ctx.globalAlpha = 1.0;
      ctx.shadowColor = '#00ffdd';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#00ffdd';
      ctx.lineWidth = 3;
      ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.restore();
      
      ctx.fillStyle = "#00ffdd";
      ctx.textAlign = "center";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("Active Protocols", panelX + panelWidth / 2, panelY + 20);
      
      // Display active protocol count
      ctx.fillStyle = "#aaf6ff";
      ctx.font = "16px sans-serif";
      const activeCount = ProtocolSystem.activeProtocols.length;
      ctx.fillText(`${activeCount}/6`, panelX + panelWidth / 2, panelY + 42);
      
      // Initialize scroll offset
      if (typeof window._protocolScrollOffset === 'undefined') {
        window._protocolScrollOffset = 0;
      }
      const discoveredSet = new Set(ProtocolSystem.getRunDiscovered());
      
      // Organize ALL protocols by family (discovered and undiscovered)
      const familyGroups = { "Targeting": [], "Overdrive": [], "Utility": [] };
      const globalIndex = {};
      let globalIdx = 0;
      Object.keys(PROTOCOLS).forEach(protocolName => {
        const proto = PROTOCOLS[protocolName];
        if (familyGroups[proto.family]) {
          familyGroups[proto.family].push(protocolName);
          globalIndex[protocolName] = globalIdx++;
        }
      });
      
      // Apply clipping before rendering scrollable content
      ctx.save();
      ctx.beginPath();
      ctx.rect(panelX, contentY, panelWidth, contentHeight);
      ctx.clip();
      
      // Render protocol selector boxes with family headers
      window._protocolSelectorBoxes = [];
      let y = contentY - window._protocolScrollOffset;
      
      Object.entries(familyGroups).forEach(([family, protocols]) => {
        if (protocols.length === 0) return;
        
        // Family header
        ctx.save();
        ctx.fillStyle = "#00ffdd";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(family, panelX + panelWidth / 2, y + 15);
        ctx.restore();
        y += 22;
        
        // Protocol boxes for this family
        protocols.forEach(protocolName => {
          if (y + 26 < contentY || y > contentY + contentHeight) {
            y += 27;
            return;
          }
          
          const cardWidth = 240;
          const cardX = panelX + (panelWidth - cardWidth) / 2;
          const isDiscovered = discoveredSet.has(protocolName);
          const isActive = ProtocolSystem.activeProtocols.includes(protocolName);
          const isFavorite = typeof ProtocolSystem.isFavorite === "function"
            ? ProtocolSystem.isFavorite(protocolName)
            : false;
          ctx.save();
          ctx.globalAlpha = 0.92;
          ctx.fillStyle = isActive ? "#00ffdd" : (isDiscovered ? "#222" : "#1a1a1a");
          ctx.fillRect(cardX, y, cardWidth, 26);
          ctx.strokeStyle = isActive ? "#00ffdd" : (isDiscovered ? "#00ffdd" : "#4a5a56");
          ctx.lineWidth = 2;
          ctx.strokeRect(cardX, y, cardWidth, 26);
          
          ctx.font = "bold 12px sans-serif";
          ctx.fillStyle = isActive ? "#152c16" : (isDiscovered ? "#00ffdd" : "#7f8f8b");
          ctx.textAlign = "center";
          ctx.fillText(protocolName.substr(0, 28), cardX + cardWidth / 2, y + 16);

          const starCenterX = cardX + cardWidth - 11;
          const starCenterY = y + 8;
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = isFavorite ? "#ffd84d" : "#4a5a56";
          ctx.fillText("✶", starCenterX, starCenterY);
          ctx.restore();
          
          window._protocolSelectorBoxes.push({
            x: cardX,
            y: y,
            w: cardWidth,
            h: 26,
            index: globalIndex[protocolName],
            name: protocolName,
            discovered: isDiscovered,
            favoriteX: cardX + cardWidth - 20,
            favoriteY: y,
            favoriteW: 20,
            favoriteH: 14
          });
          y += 27;
        });
        y += 6;
      });
      
      // Restore from clipping
      ctx.restore();
      
      // Scrollbar indicator
      const totalContentHeight = Object.values(familyGroups).reduce((sum, arr) => sum + (arr.length > 0 ? 22 + arr.length * 27 + 6 : 0), 0);
      const maxProtocolScroll = Math.max(0, totalContentHeight - contentHeight);
      window._protocolScrollOffset = Math.max(0, Math.min(window._protocolScrollOffset, maxProtocolScroll));
      if (totalContentHeight > contentHeight) {
        const scrollRatio = contentHeight / totalContentHeight;
        const scrollbarHeight = Math.max(20, contentHeight * scrollRatio);
        const scrollbarY = contentY + (window._protocolScrollOffset / totalContentHeight) * contentHeight;
        
        ctx.fillStyle = "rgba(0, 255, 221, 0.5)";
        ctx.fillRect(panelX + panelWidth - 8, scrollbarY, 6, scrollbarHeight);
      }
      
      // Display hovered protocol details following mouse cursor
      if (hoveredProtocol >= 0) {
        const hoveredBox = (window._protocolSelectorBoxes || []).find(box => box.index === hoveredProtocol);
        if (hoveredBox && hoveredBox.name) {
          const proto = PROTOCOLS[hoveredBox.name];
          const tooltipWidth = 285;
          const contentWidth = tooltipWidth - 16;

          const wrapText = (text, maxWidth, font) => {
            ctx.font = font;
            const words = text.split(" ");
            const lines = [];
            let line = "";
            for (let i = 0; i < words.length; i++) {
              const testLine = line ? line + " " + words[i] : words[i];
              if (ctx.measureText(testLine).width <= maxWidth) {
                line = testLine;
              } else {
                if (line) lines.push(line);
                line = words[i];
              }
            }
            if (line) lines.push(line);
            return lines;
          };

          const positiveColor = "#66ff99";
          const negativeColor = "#ff6b6b";
          const neutralColor = "#b5d2d8";
          const bodyColor = hoveredBox.discovered ? "#d6f8ff" : "#8ea6a0";
          const tokenColor = (value) => value > 0 ? positiveColor : value < 0 ? negativeColor : neutralColor;

          const buildTokenLines = (tokens, maxWidth, font) => {
            if (!tokens || tokens.length === 0) return [];
            ctx.font = font;
            const lines = [];
            let currentItems = [];
            let currentWidth = 0;
            tokens.forEach((token, idx) => {
              const drawText = idx < tokens.length - 1 ? token.text + "  " : token.text;
              const width = ctx.measureText(drawText).width;
              if (currentItems.length > 0 && currentWidth + width > maxWidth) {
                lines.push({ items: currentItems, width: currentWidth });
                currentItems = [];
                currentWidth = 0;
              }
              currentItems.push({ text: drawText, color: token.color, width });
              currentWidth += width;
            });
            if (currentItems.length > 0) {
              lines.push({ items: currentItems, width: currentWidth });
            }
            return lines;
          };

          const estimateTokenLines = (tokens, maxWidth, font) => {
            const lines = buildTokenLines(tokens, maxWidth, font);
            return lines.length || 1;
          };

          const drawTokenLines = (tokens, x, y, maxWidth, font, lineHeight, align = "left", centerX = 0) => {
            const lines = buildTokenLines(tokens, maxWidth, font);
            if (lines.length === 0) return y + lineHeight;
            ctx.font = font;
            const previousAlign = ctx.textAlign;
            ctx.textAlign = "left";
            let cursorY = y;
            lines.forEach(line => {
              let cursorX = align === "center" ? centerX - (line.width / 2) : x;
              line.items.forEach(item => {
                ctx.fillStyle = item.color;
                ctx.fillText(item.text, cursorX, cursorY);
                cursorX += item.width;
              });
              cursorY += lineHeight;
            });
            ctx.textAlign = previousAlign;
            return cursorY;
          };

          const titleLines = wrapText(hoveredBox.name, contentWidth, "900 14px sans-serif");
          const familyLine = proto.family + " • " + proto.rarity + " • " + proto.tier;
          const orderedStats = ["Range", "Power", "Intensity", "Movement", "Health", "Pickup"];
          const statShort = {
            Range: "Rng:",
            Power: "Pwr:",
            Intensity: "Int:",
            Movement: "Mov:",
            Health: "HP:",
            Pickup: "Pick:"
          };
          const formatSignedValue = (num) => `${num > 0 ? "+" : num < 0 ? "-" : " "}${Math.abs(num)}`;
          const hoveredEffectiveMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
            ? ProtocolSystem.getProtocolEffectiveMods(hoveredBox.name)
            : proto.statMods;

          const protocolModTokens = orderedStats.map(stat => {
            const value = hoveredEffectiveMods[stat] || 0;
            return {
              text: `${statShort[stat]}${formatSignedValue(value)}`,
              color: tokenColor(value)
            };
          });

          const formatDiffTokens = (hoveredMods, activeMods) => {
            return orderedStats.map(stat => {
              const diff = (hoveredMods[stat] || 0) - (activeMods[stat] || 0);
              return {
                text: `${statShort[stat]}${formatSignedValue(diff)}`,
                color: tokenColor(diff)
              };
            });
          };

          const hoveredIsActive = ProtocolSystem.activeProtocols.includes(hoveredBox.name);
          const showComparison = !hoveredIsActive;
          const activeProtocolNames = showComparison
            ? ProtocolSystem.activeProtocols.filter(name => name !== hoveredBox.name)
            : [];
          const compareHeaderLines = showComparison
            ? wrapText(
                activeProtocolNames.length ? "1:1 Comparison" : "1:1 Comparison: none",
                contentWidth,
                "bold 11px sans-serif"
              )
            : [];
          const compareRows = [];
          activeProtocolNames.forEach(activeName => {
            const activeProto = PROTOCOLS[activeName];
            if (!activeProto) return;
            const activeEffectiveMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
              ? ProtocolSystem.getProtocolEffectiveMods(activeName)
              : activeProto.statMods;
            const nameLines = wrapText(`${activeName}`, contentWidth, "900 12px sans-serif");
            const diffTokens = formatDiffTokens(hoveredEffectiveMods, activeEffectiveMods);
            compareRows.push({ nameLines, diffTokens });
          });

          const titleLineHeight = 17;
          const bodyLineHeight = 14;
          const sectionGap = 10;
          const protocolTokenLineCount = estimateTokenLines(protocolModTokens, contentWidth, "11px sans-serif");
          let compareTokenLineCount = 0;
          let compareNameLineCount = 0;
          compareRows.forEach(row => {
            compareNameLineCount += row.nameLines.length;
            compareTokenLineCount += estimateTokenLines(row.diffTokens, contentWidth, "11px sans-serif");
          });

          const tooltipHeight =
            12 +
            (titleLines.length * titleLineHeight) +
            bodyLineHeight +
            (protocolTokenLineCount * bodyLineHeight) +
            (showComparison ? sectionGap : 0) +
            (showComparison ? (compareHeaderLines.length * bodyLineHeight) : 0) +
            (showComparison ? (compareNameLineCount * bodyLineHeight) : 0) +
            (showComparison ? (compareTokenLineCount * bodyLineHeight) : 0) +
            10;
          let tooltipX = mouseX - tooltipWidth - 10;
          // Position tooltip above or below cursor based on canvas middle
          let tooltipY;
          tooltipY = mouseY + 10;
          // Keep tooltip within canvas bounds with padding
          const tooltipPadding = 18;
          if (tooltipX < tooltipPadding) {
            tooltipX = tooltipPadding;
          }
          if (tooltipX + tooltipWidth > canvas.width - tooltipPadding) {
            tooltipX = canvas.width - tooltipWidth - tooltipPadding;
          }
          if (tooltipY + tooltipHeight > canvas.height - tooltipPadding) {
            tooltipY = mouseY - tooltipHeight - 10;
            if (tooltipY + tooltipHeight > canvas.height - tooltipPadding) {
              tooltipY = canvas.height - tooltipHeight - tooltipPadding;
            }
          }
          if (tooltipY < tooltipPadding) {
            tooltipY = tooltipPadding;
          }
          
          ctx.save();
          ctx.save();
          ctx.globalAlpha = 0.93;
          ctx.fillStyle = '#152c16';
          ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
          ctx.strokeStyle = hoveredBox.discovered ? "#00ff88" : "#7f8f8b";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
          // Reinforce tooltip z-index by drawing last and using a high overlay
          if (window._protocolTooltipOverlay) {
            window._protocolTooltipOverlay.style.zIndex = 9999;
          }
          
          ctx.font = "900 14px sans-serif";
          ctx.fillStyle = hoveredBox.discovered ? "#00ff88" : "#7f8f8b";
          ctx.textAlign = "center";
          let textY = tooltipY + 18;
          titleLines.forEach(line => {
            ctx.fillText(line, tooltipX + tooltipWidth / 2, textY);
            textY += titleLineHeight;
          });

          ctx.font = "bold 11px sans-serif";
          ctx.fillText(familyLine, tooltipX + tooltipWidth / 2, textY);
          textY += bodyLineHeight;
          
          ctx.font = "11px sans-serif";
          ctx.fillStyle = bodyColor;
          ctx.textAlign = "center";
          const bodyTextX = tooltipX + 8;
          textY = drawTokenLines(protocolModTokens, bodyTextX, textY, contentWidth, "11px sans-serif", bodyLineHeight, "center", tooltipX + tooltipWidth / 2);

          if (showComparison) {
            textY += sectionGap;
            ctx.font = "bold 11px sans-serif";
            ctx.fillStyle = hoveredBox.discovered ? "#c8ffff" : "#90a8a0";
            compareHeaderLines.forEach(line => {
              ctx.fillText(line, tooltipX + tooltipWidth / 2, textY);
              textY += bodyLineHeight;
            });

            compareRows.forEach(row => {
              ctx.font = "900 12px sans-serif";
              ctx.fillStyle = hoveredBox.discovered ? "#9fffe0" : "#8ea6a0";
              row.nameLines.forEach(line => {
                ctx.fillText(line, tooltipX + tooltipWidth / 2, textY);
                textY += bodyLineHeight;
              });
              ctx.font = "11px sans-serif";
              textY = drawTokenLines(row.diffTokens, bodyTextX, textY, contentWidth, "11px sans-serif", bodyLineHeight, "center", tooltipX + tooltipWidth / 2);
            });
          }
          ctx.restore();
        }
      }
    }
    ctx.restore();


    // ...existing code for drawing stat labels and storing bounding boxes...
    // Stat button click-and-release logic (register only once)
    if (!window._statButtonListenersAdded) {
      // Stat button click logic for -/+ buttons
      canvas.addEventListener("mousedown", function(e) {
        if (!showStats || e.button === 2) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        // Check minus buttons
        const minusBoxes = window._statMinusButtonBoxes || [];
        for (let box of minusBoxes) {
          if (
            mx >= box.x &&
            mx <= box.x + box.w &&
            my >= box.y &&
            my <= box.y + box.h
          ) {
            // Decrement stat if possible
            const statKeys = ["Range", "Power", "AttackSpeed", "Movement", "Vitality", "Pickup"];
            const stat = statKeys[box.stat - 1];
            if (player.stats[stat] > 0) {
              const oldMaxHealth = player.maxHealth;
              const oldHealth = player.health;
              player.stats[stat]--;
              statPoints++;
              applyStats();
              if (stat === "Vitality") {
                const maxHealthDelta = player.maxHealth - oldMaxHealth;
                player.health = Math.max(0, Math.min(player.maxHealth, oldHealth + maxHealthDelta));
              }
            }
            return;
          }
        }
        // Check plus buttons
        const plusBoxes = window._statPlusButtonBoxes || [];
        for (let box of plusBoxes) {
          if (
            mx >= box.x &&
            mx <= box.x + box.w &&
            my >= box.y &&
            my <= box.y + box.h
          ) {
            // Increment stat if possible
            if (statPoints > 0) {
              applyStatPoint(String(box.stat));
            }
            return;
          }
        }
      });
      // Protocol selector click handler
      canvas.addEventListener("mousedown", function(e) {
        if (!showStats || e.button === 2) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const boxes = window._protocolSelectorBoxes || [];
        for (let box of boxes) {
          if (
            mx >= box.x &&
            mx <= box.x + box.w &&
            my >= box.y &&
            my <= box.y + box.h
          ) {
            if (
              typeof ProtocolSystem.toggleFavorite === "function" &&
              mx >= box.favoriteX &&
              mx <= box.favoriteX + box.favoriteW &&
              my >= box.favoriteY &&
              my <= box.favoriteY + box.favoriteH
            ) {
              ProtocolSystem.toggleFavorite(box.name);
              return;
            }
            if (box.discovered) {
              if (ProtocolSystem.activeProtocols.includes(box.name)) {
                ProtocolSystem.deactivate(box.name);
                if (selectedProtocol === box.index) selectedProtocol = -1;
                applyStats();
              } else {
                const activated = ProtocolSystem.activate(box.name);
                if (activated) {
                  selectedProtocol = box.index;
                  applyStats();
                }
              }
            }
            return;
          }
        }
      });
      // Protocol scroll wheel handler
      canvas.addEventListener("wheel", function(e) {
        if (!showStats) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        // Check if mouse is over protocol panel (right side)
        if (mx > canvas.width - 340 && my > 190 && my < 560) {
          e.preventDefault();
          const protocolCountsByFamily = { "Targeting": 0, "Overdrive": 0, "Utility": 0 };
          Object.keys(PROTOCOLS).forEach(protocolName => {
            const family = PROTOCOLS[protocolName].family;
            if (protocolCountsByFamily[family] !== undefined) {
              protocolCountsByFamily[family]++;
            }
          });
          const protocolContentHeight = Object.values(protocolCountsByFamily)
            .reduce((sum, count) => sum + (count > 0 ? 22 + count * 27 + 6 : 0), 0);
          const protocolViewportHeight = 370 - 55;
          const maxProtocolScroll = Math.max(0, protocolContentHeight - protocolViewportHeight);
          window._protocolScrollOffset = Math.max(
            0,
            Math.min(maxProtocolScroll, window._protocolScrollOffset + (e.deltaY > 0 ? 30 : -30))
          );
        }
      }, { passive: false });
      window._statButtonListenersAdded = true;
    }
    }
    // Draw HUD overlay image
    if (hudImg.complete && hudImg.naturalWidth > 0) {
      ctx.drawImage(hudImg, 0, 0, canvas.width, canvas.height);
    }
    // Draw wave and stat point H122030UD above HUD overlay
    ctx.save();
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 4;
    const q1 = canvas.width * 0.125;
    const q2 = canvas.width * 0.375;
    const q3 = canvas.width * 0.625;
    const q4 = canvas.width * 0.875;
    ctx.textAlign = "center";


    // Prominent Wave label
    ctx.font = "bold 32px sans-serif";
    ctx.fillStyle = "#00ffdd";
    ctx.shadowColor = '#00ffdd';
    ctx.shadowBlur = 18;
    const wavetext = "Wave " + wave;
    const wavetextWidth = ctx.measureText(wavetext).wi3dth;
    ctx.fillText(wavetext, canvas.width / 2, 45);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }

  

  function restartGame() {
      waveAnnouncementTimer = WAVE_ANNOUNCE_DURATION;
    Object.assign(player, {
      x: 500, y: 430, health: 10, attackCooldown: 0,
      stats: { Range: 0, Power: 0, AttackSpeed: 0, Movement: 0, Vitality: 0, Pickup: 0 }
    });
    player._followVX = 0;
    player._followVY = 0;
    player._hoverPhase = 0;
    player._cursorStillTime = 0;
    player._lastMouseX = mouseX;
    player._lastMouseY = mouseY;
    ProtocolSystem.initializeRun();
    playerVisualAngle = Math.PI / 2; // Start facing down on wave 1
    applyStats();
    xp = 0; xpToLevel = 10; level = 1;
    runCollectedBytes = 0;
    runBytesFinalized = false;
    statPoints = 5; // TEMP: Start with 25 stat points
    selectedProtocol = -1; // Reset selected protocol
    hoveredProtocol = -1; // Reset hovered protocol
    wave = 1;
    enemies.length = 0;
    healthDrops.length = 0;
    xpDrops.length = 0;
    slingerDrops.length = 0;
    bruteDrops.length = 0;
    protocolOrbs.length = 0;
    particles.length = 0;
    projectiles.length = 0;
    mines.length = 0;
    // Reset wave spawn state
    burstCount = 3;
    burstIndex = 0;
    burstTimer = 0;
    interWaveDelayTimer = 0;
    interWavePending = false;
    window._customBursts = null;
    window._customBrutes = null;
    window._customSlingers = null;
    window._customShielders = null;
    window._customBeamers = null;
    window._customKamikazes = null;
    window._customStalkers = null;
    window._customBossMinors = null;
    window._customBosses = null;
    window._bossMinorBursts = null;
    window._wave10MinorsSpawned = false;
    window._editorSessionActive = false;
    gameOver = false;
    showStats = false;
    paused = false;
    gameStarted = false;
    startTime = Date.now();
    window._playerUsedContinue = false;
  }

  function updateEnemies(delta) {
                        for (let e of enemies) {
                          if (typeof e.shieldPersistTimer !== "number") e.shieldPersistTimer = 0;
                          if (e.shieldPersistTimer > 0) {
                            e.shieldPersistTimer -= delta * SPEED_MULTIPLIER;
                            if (e.shieldPersistTimer <= 0) {
                              e.shieldPersistTimer = 0;
                              e.shielded = false;
                              e.shieldReduction = 0;
                            } else {
                              e.shielded = true;
                            }
                          } else {
                            e.shielded = false;
                            e.shieldReduction = 0;
                          }
                          e.shieldedBy = null;
                          if (Array.isArray(e.activeShieldTargets)) e.activeShieldTargets.length = 0;
                        }
                        // Decrease noBossCollision timer for grunts
                        for (let e of enemies) {
                          if (e.type === "grunt" && e.noBossCollision > 0) {
                            e.noBossCollision--;
                          }
                        }
                        // Grunt boss and grunt boss minor spawn grunts at interval
                        for (let e of enemies) {
                          if ((e.type === "gruntBoss" || e.type === "gruntBossMinor") && e.health > 0) {
                            e.gruntSpawnTimer = (e.gruntSpawnTimer || 0) + 1;
                            if (e.gruntSpawnTimer >= e.gruntSpawnInterval) {
                              e.gruntSpawnTimer = 0;
                              // Spawn grunts in a nova (evenly spaced circle) around the boss
                              const count = e.gruntSpawnCount;
                              const baseAngle = Math.random() * Math.PI * 2; // randomize starting angle
                              // Emit novaFlare-style particles from the boss, not each grunt
                              for (let p = 0; p < 42; p++) {
                                const flare = p < 10;
                                const partAngle = Math.random() * Math.PI * 2;
                                const partRadius = e.radius + 8 + Math.random() * 10;
                                const partSpeed = flare ? 2.2 + Math.random() * 1.2 : 1.2 + Math.random() * 0.8;
                                const color = flare ? "#ff66ff" : ["#ff33ff", "#ff00ff", "#e040ff", "#d900ff"][Math.floor(Math.random()*4)];
                                const size = flare ? 7 + Math.random() * 3 : 4 + Math.random() * 2;
                                const life = flare ? 22 + Math.random() * 12 : 16 + Math.random() * 8;
                                const decay = flare ? 0.91 : 0.95;
                                spawnParticle(
                                  e.x + Math.cos(partAngle) * partRadius,
                                  e.y + Math.sin(partAngle) * partRadius,
                                  Math.cos(partAngle) * partSpeed * (flare ? 1.8 : 1),
                                  Math.sin(partAngle) * partSpeed * (flare ? 1.8 : 1),
                                  life,
                                  color,
                                  decay,
                                  size,
                                  "novaFlare"
                                );
                              }
                              for (let i = 0; i < count; i++) {
                                const angle = baseAngle + (Math.PI * 2 / count) * i;
                                const distance = e.radius + 24;
                                const x = e.x + Math.cos(angle) * distance;
                                const y = e.y + Math.sin(angle) * distance;
                                let radius = 14, collisionRadius = 16, speed = .6, health = 6 + (wave*1.5), damage = 1, attackRange = 20, color = "magenta";
                                const spinAngle = angle; // make them spin outward
                                const spinSpeed = (Math.random() - 0.5) * 0.02;
                                // Give each grunt an outward velocity for the nova effect
                                const novaSpeed = 2.2 + Math.random() * 0.8;
                                const spawnedEnemy = spawnEnemy();
                                spawnedEnemy.x = x;
                                spawnedEnemy.y = y;
                                spawnedEnemy.radius = radius;
                                spawnedEnemy.collisionRadius = collisionRadius;
                                spawnedEnemy.speed = speed;
                                spawnedEnemy.health = health;
                                spawnedEnemy.damage = damage;
                                spawnedEnemy.attackCooldown = 0;
                                spawnedEnemy.attackRange = attackRange;
                                spawnedEnemy.color = color;
                                spawnedEnemy.type = "grunt";
                                spawnedEnemy.spinAngle = spinAngle;
                                spawnedEnemy.spinSpeed = spinSpeed;
                                spawnedEnemy.noBossCollision = 120;
                                spawnedEnemy.vx = Math.cos(angle) * novaSpeed;
                                spawnedEnemy.vy = Math.sin(angle) * novaSpeed;
                                spawnedEnemy.novaTimer = 18;
                                spawnedEnemy.noXP = true;
                                spawnedEnemy.noLoot = true;
                                applyWaveEnemyModifiers(spawnedEnemy);
                              }
                              // Optionally randomize next spawn count
                              if (e.type === "gruntBoss") {
                                e.gruntSpawnCount = 2 + Math.floor(Math.random() * 3);
                              } else {
                                e.gruntSpawnCount = 1 + Math.floor(Math.random() * 2);
                              }
                            }
                          }
                          // GruntBoss projectile attack
                          if (e.type === "gruntBoss" && e.health > 0) {
                            // Handle burst logic
                            if (e.burstMode) {
                              // In burst mode, fire 3 shots with short delay
                              if (e.burstShotsLeft > 0) {
                                e.burstTimer = (e.burstTimer || 0) + 1;
                                if (e.burstTimer >= 12) { // 0.2 sec between shots
                                  e.burstTimer = 0;
                                  e.burstShotsLeft--;
                                  // Fire single projectile
                                  const dx = player.x - e.x;
                                  const dy = player.y - e.y;
                                  const dist = Math.hypot(dx, dy);
                                  if (dist > 0) {
                                    const angle = Math.atan2(dy, dx);
                                    const speed = 2.2;
                                    spawnProjectile(
                                      e.x,
                                      e.y,
                                      Math.cos(angle) * speed,
                                      Math.sin(angle) * speed,
                                      2,
                                      e.projectileRadius,
                                      "#ffb347", // Slinger projectile color
                                      "slingerProjectile" // Slinger projectile type
                                    );
                                    // Play laser sound for enemy projectile
                                    try {
                                      let enemyLaserSound = new Audio('laser.wav');
                                      enemyLaserSound.volume = window.sentinelVolume.enemyProjectile;
                                      enemyLaserSound.play();
                                    } catch (e) {}
                                  }
                                }
                              } else {
                                // Burst finished, reset for next interval
                                e.burstMode = false;
                                e.projectileCooldown = 0;
                              }
                            } else {
                              e.projectileCooldown = (e.projectileCooldown || 0) + 1;
                              if (e.projectileCooldown >= e.projectileInterval) {
                                // Always start burst mode (rifle 3-round burst)
                                e.burstMode = true;
                                e.burstShotsLeft = 3;
                                e.burstTimer = 0;
                              }
                            }
                          }

                          if (e.type === "bruteBoss" && e.health > 0) {
                            if (typeof e.fireballCooldown !== "number") e.fireballCooldown = 80;
                            if (typeof e.fireballInterval !== "number") e.fireballInterval = 280;
                            if (typeof e.fireballRadius !== "number") e.fireballRadius = 15;
                            if (typeof e.fireballLifetime !== "number") e.fireballLifetime = 220;
                            if (typeof e.fireballBurnRadius !== "number") e.fireballBurnRadius = 88;
                            if (typeof e.fireballBurnDuration !== "number") e.fireballBurnDuration = 420;
                            if (typeof e.fireballBurnTickInterval !== "number") e.fireballBurnTickInterval = 32;
                            if (typeof e.fireballBurnDamage !== "number") e.fireballBurnDamage = 1;

                            const maxHealth = Math.max(1, typeof e.maxHealth === "number" ? e.maxHealth : e.health);
                            const missingHealthRatio = Math.max(0, Math.min(1, 1 - (e.health / maxHealth)));
                            const phaseProgress = Math.max(0, Math.min(1, missingHealthRatio / 0.68));
                            e.bruteBossPhaseProgress = phaseProgress;
                            const volleyShots = 1 + Math.floor(phaseProgress * 4);

                            if (e.fireballCooldown <= 0) {
                              for (let shotIndex = 0; shotIndex < volleyShots; shotIndex++) {
                                const shotAngle = Math.random() * Math.PI * 2;
                                const projectileSpeed = 1.12;
                                const fireball = spawnProjectile(
                                  e.x,
                                  e.y,
                                  Math.cos(shotAngle) * projectileSpeed,
                                  Math.sin(shotAngle) * projectileSpeed,
                                  e.damage,
                                  e.fireballRadius,
                                  "#ff6a00",
                                  "bruteBossFireball"
                                );
                                fireball.lifeTimer = e.fireballLifetime;
                                fireball.burnRadius = e.fireballBurnRadius;
                                fireball.burnDuration = e.fireballBurnDuration;
                                fireball.burnTickInterval = e.fireballBurnTickInterval;
                                fireball.burnDamage = e.fireballBurnDamage;
                                fireball.particleCooldown = Math.floor(Math.random() * 3);
                              }
                              const acceleratedInterval = Math.max(170, e.fireballInterval - Math.floor(phaseProgress * 90));
                              e.fireballCooldown = acceleratedInterval;
                            } else {
                              e.fireballCooldown -= delta * SPEED_MULTIPLIER;
                            }
                          }
                        }
                // Brute nova visual particles
                for (let e of enemies) {
                  if (e.type === "brute" || e.type === "bruteBoss") {
                    if (typeof e.fxCooldown !== "number") e.fxCooldown = Math.floor(Math.random() * 2);
                    if (e.fxCooldown > 0) {
                      e.fxCooldown--;
                      continue;
                    }
                    const isActiveNova = e.novaState === "growing" || e.novaState === "shrinking";
                    if (!isActiveNova && e.type !== "bruteBoss") continue;
                    e.fxCooldown = 1;
                    let particleCount = isActiveNova ? 2 : 0;
                    if (e.type === "bruteBoss") {
                      particleCount = isActiveNova ? 10 : 4;
                    }
                    for (let p = 0; p < particleCount; p++) {
                      const angle = Math.random() * Math.PI * 2;
                      const minRingRadius = e.radius + 8;
                      const maxRingRadius = Math.max(minRingRadius + 1, (e.novaRadius || (e.radius + 24)) - 6);
                      const isBossInteriorFire = e.type === "bruteBoss";
                      const radius = isBossInteriorFire
                        ? (Math.random() * (maxRingRadius - minRingRadius) + minRingRadius)
                        : (isActiveNova
                          ? (Math.random() * (maxRingRadius - minRingRadius) + minRingRadius)
                          : (maxRingRadius - Math.random() * 10));
                      const flare = radius > e.novaRadius - 12;
                      // Different behavior for growing vs shrinking
                      let speed, color, size, life, decay;
                      if (e.novaState === "growing") {
                        speed = 2.2 + Math.random() * 1.2;
                        color = flare ? "#ffae00" : ["#ff6600","#ffaa00","#ff3300"][Math.floor(Math.random()*3)];
                        size = flare ? 7 + Math.random() * 3 : 4 + Math.random() * 2;
                        life = flare ? 15 + Math.random() * 8 : 10 + Math.random() * 6;
                        decay = flare ? 0.91 : 0.95;
                      } else if (e.novaState === "shrinking") {
                        speed = 0.8 + Math.random() * 0.8;
                        color = flare ? "#ff3300" : ["#ff6600","#ffaa00","#ffbb33"][Math.floor(Math.random()*3)];
                        size = flare ? 5 + Math.random() * 2 : 2 + Math.random() * 2;
                        life = flare ? 10 + Math.random() * 6 : 6 + Math.random() * 4;
                        decay = flare ? 0.97 : 0.98;
                      } else if (e.type === "bruteBoss") {
                        speed = 0.35 + Math.random() * 0.65;
                        color = ["#ff6a00", "#ff9c33", "#ff4000", "#ffd07a"][Math.floor(Math.random() * 4)];
                        size = 2.6 + Math.random() * 2.6;
                        life = 12 + Math.random() * 11;
                        decay = 0.95 + Math.random() * 0.02;
                      } else {
                        continue;
                      }
                      spawnParticle(
                        e.x + Math.cos(angle) * radius,
                        e.y + Math.sin(angle) * radius,
                        Math.cos(angle) * speed * (flare ? 1.8 : 1),
                        Math.sin(angle) * speed * (flare ? 1.8 : 1),
                        life,
                        color,
                        decay,
                        size,
                        "novaFlare"
                      );
                    }
                  }
                }
            // Brute nova visual and collision
            for (let e of enemies) {
              if (e.type === "brute" || e.type === "bruteBoss") {
                // Nova animation states
                const minRadius = typeof e.novaMinRadius === "number" ? e.novaMinRadius : (e.radius + 20); // slightly bigger than brute
                let maxRadius = e.radius * (typeof e.novaMaxMultiplier === "number" ? e.novaMaxMultiplier : 3.2);
                let novaGrowthSpeed = typeof e.novaGrowthSpeed === "number" ? e.novaGrowthSpeed : 2.2;
                const novaShrinkSpeed = typeof e.novaShrinkSpeed === "number" ? e.novaShrinkSpeed : 2.2;
                if (e.type === "bruteBoss") {
                  const phaseProgress = Math.max(0, Math.min(1, typeof e.bruteBossPhaseProgress === "number" ? e.bruteBossPhaseProgress : 0));
                  maxRadius *= (1 + (phaseProgress * 0.18));
                  novaGrowthSpeed *= (1 + (phaseProgress * 0.25));
                }
                if (typeof e.novaRadius === "undefined") e.novaRadius = minRadius;
                if (typeof e.novaState === "undefined") e.novaState = "growing";
                if (typeof e.novaCooldown === "undefined") e.novaCooldown = 0;

                // Animate nova
                    if (e.novaState === "growing") {
                      e.novaRadius += novaGrowthSpeed;
                      if (e.novaRadius >= maxRadius) {
                        e.novaRadius = maxRadius;
                        e.novaState = "maxPause";
                        e.novaCooldown = 120; // 2 sec pause at max
                      }
                    } else if (e.novaState === "maxPause") {
                      e.novaCooldown--;
                      e.novaCue = false;
                      if (e.novaCooldown <= 0) {
                        e.novaState = "shrinking";
                      }
                    } else if (e.novaState === "shrinking") {
                      e.novaRadius -= novaShrinkSpeed;
                      if (e.novaRadius <= minRadius) {
                        e.novaRadius = minRadius;
                        e.novaState = "minPause";
                        e.novaCooldown = 240; // 4 sec pause at min
                      }
                    } else if (e.novaState === "minPause") {
                      e.novaCooldown--;
                      // Visual cue: pulse color as nova is about to attack (growing)
                      e.novaCue = e.novaCooldown < 60 && e.novaCooldown % 8 < 4;
                      if (e.novaCooldown <= 0) {
                        e.novaState = "growing";
                        e.novaCue = false;
                      }
                    }

                // Nova damage: tick on entry, then every 60 frames (1s)
                const dist = Math.hypot(player.x - e.x, player.y - e.y);
                if (typeof e.novaPlayerInside === 'undefined') e.novaPlayerInside = false;
                if (typeof e.novaPlayerTick === 'undefined') e.novaPlayerTick = 0;
                if (dist < e.novaRadius + player.radius) {
                    const novaDamage = typeof e.novaDamage === "number" ? e.novaDamage : 1;
                    if (!e.novaPlayerInside || e.novaPlayerTick <= 0) {
                      player.health -= novaDamage; // Nova damage per tick
                      e.novaPlayerTick = 60; // 1 second cooldown
                    }
                  e.novaPlayerInside = true;
                } else {
                  e.novaPlayerInside = false;
                  e.novaPlayerTick = 0;
                }
                if (e.novaPlayerTick > 0) e.novaPlayerTick -= delta * SPEED_MULTIPLIER;;
              }
            }
            
        // Enhanced dust emission for moving enemies
      // Dust particles disabled for performance
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
          if (e.health <= 0) {
            // Create colored particles on enemy death with different tones
            if (e.type === "gruntBoss" || e.type === "gruntBossMinor") {
              // Boss death nova: emit a ring of magenta particles
              const novaCount = 36;
              // Make gruntBossMinor's nova radius smaller
              const novaRadius = e.type === "gruntBossMinor" ? e.radius + 22 : e.radius + 32;
              for (let j = 0; j < novaCount; j++) {
                const angle = (Math.PI * 2 * j) / novaCount;
                const speed = 3.2 + Math.random() * 1.8;
                const color = ["#b800e0", "#d900ff", "#ff33ff", "#910091"][Math.floor(Math.random()*4)];
                const size = 7 + Math.random() * 3;
                const life = 32 + Math.random() * 24;
                const decay = 0.92 + Math.random() * 0.04;
                spawnParticle(
                  e.x + Math.cos(angle) * novaRadius,
                  e.y + Math.sin(angle) * novaRadius,
                  Math.cos(angle) * speed,
                  Math.sin(angle) * speed,
                  life,
                  color,
                  decay,
                  size,
                  "enemyDeath"
                );
              }
              // Scatter 5 xpDrops around gruntBossMinor's location
              if (e.type === "gruntBossMinor") {
                for (let k = 0; k < 5; k++) {
                  const angle = Math.random() * Math.PI * 2;
                  const dist = 18 + Math.random() * 22;
                  xpDrops.push({
                    x: e.x + Math.cos(angle) * dist,
                    y: e.y + Math.sin(angle) * dist
                  });
                }
              }
              // Boss-gated waves use direct completion; other waves use standard burst progression
              if (e.type === "gruntBoss" && wave === 5) {
                wave++;
                try {
                  let warnAudio = new Audio('warning.wav');
                  warnAudio.volume = window.sentinelVolume && window.sentinelVolume.warning !== undefined ? window.sentinelVolume.warning : 0.5;
                  warnAudio.playbackRate = 0.7;
                  warnAudio.play();
                } catch (e) {}
                spawnWave();
              } else if (e.type === "slingerBoss" && wave === 10) {
                wave++;
                try {
                  let warnAudio = new Audio('warning.wav');
                  warnAudio.volume = window.sentinelVolume && window.sentinelVolume.warning !== undefined ? window.sentinelVolume.warning : 0.5;
                  warnAudio.playbackRate = 0.7;
                  warnAudio.play();
                } catch (e) {}
                spawnWave();
              }
            } else if (e.type === "brute" || e.type === "bruteBoss" || e.type === "slingerBoss") {
              // Brute death burst: mimic nova 'growing' burst
              const burstCount = e.type === "bruteBoss" ? 24 : 12;
              for (let j = 0; j < burstCount; j++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2.2 + Math.random() * 1.2;
                const flare = j < (e.type === "bruteBoss" ? 8 : 4);
                const color = flare ? "#fff200" : ["#ff6600","#ffaa00","#ff3300"][Math.floor(Math.random()*3)];
                const size = flare ? 7 + Math.random() * 3 : 4 + Math.random() * 2;
                const life = flare ? 22 + Math.random() * 12 : 16 + Math.random() * 8;
                const decay = flare ? 0.91 : 0.95;
                spawnParticle(
                  e.x,
                  e.y,
                  Math.cos(angle) * speed * (flare ? 1.8 : 1),
                  Math.sin(angle) * speed * (flare ? 1.8 : 1),
                  life,
                  color,
                  decay,
                  size,
                  "enemyDeath"
                );
              }
              if (e.type === "bruteBoss" && wave === 20) {
                wave++;
                try {
                  let warnAudio = new Audio('warning.wav');
                  warnAudio.volume = window.sentinelVolume && window.sentinelVolume.warning !== undefined ? window.sentinelVolume.warning : 0.5;
                  warnAudio.playbackRate = 0.7;
                  warnAudio.play();
                } catch (e) {}
                spawnWave();
              } else if (e.type === "slingerBoss" && wave === 10) {
                wave++;
                try {
                  let warnAudio = new Audio('warning.wav');
                  warnAudio.volume = window.sentinelVolume && window.sentinelVolume.warning !== undefined ? window.sentinelVolume.warning : 0.5;
                  warnAudio.playbackRate = 0.7;
                  warnAudio.play();
                } catch (e) {}
                spawnWave();
              }
            } else if (e.type === "stalker") {
              const stalkerPalette = ["#57e7ff", "#7fdfff", "#a7f3ff", "#3ec6ff"];
              for (let j = 0; j < 16; j++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 1.4;
                const color = stalkerPalette[Math.floor(Math.random() * stalkerPalette.length)];
                spawnParticle(
                  e.x,
                  e.y,
                  Math.cos(angle) * speed,
                  Math.sin(angle) * speed,
                  45 + Math.floor(Math.random() * 90),
                  color,
                  0.9 + Math.random() * 0.06,
                  2 + Math.random() * 2,
                  "enemyDeath"
                );
              }
            } else {
              let palette;
              if (e.type === "grunt") {
                palette = ["#FF00FF", "#910091", "#d900ff", "#c800b0", "#b800e0"];
              } else if (e.type === "slinger" || e.type === "slingerBoss") {
                palette = ["#FFA500", "#ffb84d", "#ff9900", "#ffcc80", "#8b5b00"];
              } else {
                palette = [e.color];
              }
              const particleCount = e.type === "kamikaze" ? KAMIKAZE_DEATH_PARTICLE_COUNT : 18;
              const lifeBase = e.type === "kamikaze" ? 24 : 60;
              const lifeRange = e.type === "kamikaze" ? 70 : 240;
              for (let j = 0; j < particleCount; j++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = e.type === "kamikaze" ? (1.7 + Math.random() * 1.1) : (2.5 + Math.random() * 1.8);
                let size = 2;
                if (j < 4) size = 4;
                if (j < 2) size = 7;
                const color = palette[Math.floor(Math.random() * palette.length)];
                spawnParticle(
                  e.x,
                  e.y,
                  Math.cos(angle) * speed,
                  Math.sin(angle) * speed,
                  lifeBase + Math.floor(Math.random() * lifeRange),
                  color,
                  0.88 + Math.random() * 0.04,
                  size,
                  "enemyDeath"
                );
              }
            }
            if (!(e.noLoot || e.noXP)) {
              if (e.type === "bruteBoss" || e.type === "slingerBoss") {
                tryDiscoverProtocolFromEnemy(e.type, e.x, e.y, { forceDrop: true, rarity: "Rare" });
                for (let dropIndex = 0; dropIndex < 2; dropIndex++) {
                  const spread = 16;
                  tryDiscoverProtocolFromEnemy(e.type, e.x + (Math.random() * spread - spread / 2), e.y + (Math.random() * spread - spread / 2), {
                    forceDrop: true,
                    rarity: "Common"
                  });
                }
                for (let xpIndex = 0; xpIndex < 25; xpIndex++) {
                  const xpAngle = Math.random() * Math.PI * 2;
                  const xpDist = 14 + Math.random() * 34;
                  xpDrops.push({
                    x: e.x + Math.cos(xpAngle) * xpDist,
                    y: e.y + Math.sin(xpAngle) * xpDist
                  });
                }
              } else {
                tryDiscoverProtocolFromEnemy(e.type, e.x, e.y);
              }
            }
            releaseEnemyAt(i);
            continue;
          }

      // Grunt nova movement: if novaTimer > 0, move outward using vx/vy
      if (e.type === "grunt" && e.novaTimer > 0) {
        e.x += e.vx * delta * SPEED_MULTIPLIER;
        e.y += e.vy * delta * SPEED_MULTIPLIER;
        e.novaTimer -= delta * SPEED_MULTIPLIER;
        // Slow down nova velocity for a smooth stop
        e.vx *= 0.92;
        e.vy *= 0.92;
      } else {
        const dx = player.x - e.x, dy = player.y - e.y;
        const dist = Math.hypot(dx, dy);
        if (e.type === "stalker") {
          if (typeof e.blinkCooldown !== "number") e.blinkCooldown = 120 + Math.floor(Math.random() * 80);
          if (typeof e.blinkCastTimer !== "number") e.blinkCastTimer = 0;
          if (typeof e.blinkCastDuration !== "number") e.blinkCastDuration = 1;
          if (typeof e.blinkRecoverTimer !== "number") e.blinkRecoverTimer = 0;
          if (typeof e.blinkRecoverDuration !== "number") e.blinkRecoverDuration = 1;
          if (typeof e.burstsLeft !== "number") e.burstsLeft = 0;
          if (typeof e.burstTimer !== "number") e.burstTimer = 0;
          if (typeof e.burstShotsLeft !== "number") e.burstShotsLeft = 0;
          if (typeof e.pendingBursts !== "number") e.pendingBursts = 0;
          if (typeof e.stalkerBurstInterval !== "number") e.stalkerBurstInterval = 120;
          if (typeof e.stalkerBurstCooldown !== "number") e.stalkerBurstCooldown = 18 + Math.floor(Math.random() * 22);
          if (typeof e.castFxCooldown !== "number") e.castFxCooldown = 0;
          if (typeof e.stalkerAlpha !== "number") e.stalkerAlpha = 0.9;
          if (typeof e.stalkerRoutineActive !== "boolean") e.stalkerRoutineActive = false;
          if (typeof e.stalkerInitialBurstDone !== "boolean") e.stalkerInitialBurstDone = false;
          if (typeof e.stalkerPreferredDistance !== "number") e.stalkerPreferredDistance = 180 + Math.random() * 120;
          const legacyPadding = typeof e.stalkerEdgePadding === "number" ? e.stalkerEdgePadding : 120;
          if (typeof e.stalkerEdgePaddingX !== "number") e.stalkerEdgePaddingX = legacyPadding;
          if (typeof e.stalkerEdgePaddingY !== "number") e.stalkerEdgePaddingY = Math.max(legacyPadding, 170);

          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const minCenterDist = e.stalkerPreferredDistance;
          const edgePaddingX = Math.max(e.radius + 4, e.stalkerEdgePaddingX);
          const edgePaddingY = Math.max(e.radius + 4, e.stalkerEdgePaddingY);

          const isStalkerInRange = dist < (e.attackRange || 320) + player.radius;
          if (!e.stalkerRoutineActive) {
            if (!isStalkerInRange) {
              if (dist > 0) {
                e.x += (dx / dist) * e.speed * delta * SPEED_MULTIPLIER;
                e.y += (dy / dist) * e.speed * delta * SPEED_MULTIPLIER;
              }
              continue;
            }

            if (!e.stalkerInitialBurstDone) {
              const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
              const spread = 0.12;
              const shotSpeed = 2.25;
              for (let s = -1; s <= 1; s++) {
                const shotAngle = angleToPlayer + (s * spread);
                spawnProjectile(
                  e.x,
                  e.y,
                  Math.cos(shotAngle) * shotSpeed,
                  Math.sin(shotAngle) * shotSpeed,
                  e.damage,
                  4,
                  "#66e8ff",
                  "stalkerProjectile"
                );
              }
              e.stalkerInitialBurstDone = true;
            }

            e.stalkerRoutineActive = true;
            e.x = Math.max(edgePaddingX, Math.min(canvas.width - edgePaddingX, e.x));
            e.y = Math.max(edgePaddingY, Math.min(canvas.height - edgePaddingY, e.y));
            continue;
          }

          if (e.blinkCastTimer > 0) {
            e.blinkCastTimer -= delta * SPEED_MULTIPLIER;
            e.castFxCooldown -= delta * SPEED_MULTIPLIER;
            if (e.castFxCooldown <= 0) {
              e.castFxCooldown = 4;
              for (let p = 0; p < 3; p++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.9 + Math.random() * 0.8;
                spawnParticle(
                  e.x,
                  e.y,
                  Math.cos(angle) * speed,
                  Math.sin(angle) * speed,
                  16 + Math.random() * 10,
                  "#7beeff",
                  0.93,
                  1.6 + Math.random() * 1.2,
                  "enemyHit"
                );
              }
            }

            if (e.blinkCastTimer <= 0) {
              for (let p = 0; p < 10; p++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.6 + Math.random() * 1.1;
                spawnParticle(e.x, e.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 24 + Math.random() * 10, "#66e8ff", 0.93, 2 + Math.random() * 1.6, "enemyHit");
              }

              const minBlinkRadius = Math.min(canvas.width, canvas.height) * 0.28;
              const maxBlinkRadius = Math.min(canvas.width, canvas.height) * 0.45;
              const minBlinkFromPlayer = (typeof player.range === "number" ? player.range : player.radius) + 70;
              let blinkTargetX = e.x;
              let blinkTargetY = e.y;
              for (let attempt = 0; attempt < 14; attempt++) {
                const blinkAngle = Math.random() * Math.PI * 2;
                const blinkRadius = minBlinkRadius + Math.random() * (maxBlinkRadius - minBlinkRadius);
                const candidateX = Math.max(edgePaddingX, Math.min(canvas.width - edgePaddingX, centerX + Math.cos(blinkAngle) * blinkRadius));
                const candidateY = Math.max(edgePaddingY, Math.min(canvas.height - edgePaddingY, centerY + Math.sin(blinkAngle) * blinkRadius));
                const candidateDistToPlayer = Math.hypot(player.x - candidateX, player.y - candidateY);
                blinkTargetX = candidateX;
                blinkTargetY = candidateY;
                if (candidateDistToPlayer >= minBlinkFromPlayer) break;
              }
              e.x = blinkTargetX;
              e.y = blinkTargetY;

              for (let p = 0; p < 10; p++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.6 + Math.random() * 1.1;
                spawnParticle(e.x, e.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 24 + Math.random() * 10, "#66e8ff", 0.93, 2 + Math.random() * 1.6, "enemyHit");
              }

              e.pendingBursts = 1;
              e.burstShotsLeft = 0;
              e.blinkRecoverDuration = 22 + Math.floor(Math.random() * 8);
              e.blinkRecoverTimer = e.blinkRecoverDuration;
              e.blinkCastTimer = 0;
            }
          } else if (e.blinkRecoverTimer > 0) {
            e.blinkRecoverTimer -= delta * SPEED_MULTIPLIER;
            if (e.blinkRecoverTimer <= 0) {
              e.burstsLeft = Math.max(e.burstsLeft, e.pendingBursts || 1);
              e.pendingBursts = 0;
              e.blinkCooldown = 145 + Math.floor(Math.random() * 95);
            }
          } else if (e.burstsLeft > 0) {
            if (e.burstShotsLeft <= 0) {
              const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
              const spread = 0.12;
              const shotSpeed = 2.25;
              for (let s = -1; s <= 1; s++) {
                const shotAngle = angleToPlayer + (s * spread);
                spawnProjectile(
                  e.x,
                  e.y,
                  Math.cos(shotAngle) * shotSpeed,
                  Math.sin(shotAngle) * shotSpeed,
                  e.damage,
                  4,
                  "#66e8ff",
                  "stalkerProjectile"
                );
              }
              e.burstsLeft -= 1;
              e.burstShotsLeft = 26;
              if (e.burstsLeft <= 0) e.stalkerBurstCooldown = e.stalkerBurstInterval;
            } else {
              e.burstShotsLeft -= delta * SPEED_MULTIPLIER;
            }
          } else {
            if (e.stalkerBurstCooldown > 0) {
              e.stalkerBurstCooldown -= delta * SPEED_MULTIPLIER;
              if (e.stalkerBurstCooldown < 0) e.stalkerBurstCooldown = 0;
            }

            if (e.blinkCooldown > 0) {
              e.blinkCooldown -= delta * SPEED_MULTIPLIER;
              if (e.blinkCooldown < 0) e.blinkCooldown = 0;
            }
            const playerBlinkRange = (typeof player.range === "number" ? player.range : player.radius) + 50;
            const shouldBlinkAway = e.blinkCooldown <= 0 && dist <= playerBlinkRange;
            if (shouldBlinkAway) {
              e.blinkCastDuration = 18 + Math.floor(Math.random() * 7);
              e.blinkCastTimer = e.blinkCastDuration;
              e.castFxCooldown = 0;
            } else if (e.stalkerBurstCooldown <= 0) {
              e.burstsLeft = Math.max(e.burstsLeft, 1);
              e.burstShotsLeft = 0;
              e.stalkerBurstCooldown = e.stalkerBurstInterval;
            }
          }

          let targetStalkerAlpha = 0.9;
          if (e.blinkCastTimer > 0) {
            const castProgress = e.blinkCastDuration > 0
              ? Math.max(0, Math.min(1, e.blinkCastTimer / e.blinkCastDuration))
              : 0;
            targetStalkerAlpha = 0.15 + (0.75 * castProgress);
          } else if (e.blinkRecoverTimer > 0) {
            const recoverProgress = e.blinkRecoverDuration > 0
              ? Math.max(0, Math.min(1, 1 - (e.blinkRecoverTimer / e.blinkRecoverDuration)))
              : 1;
            targetStalkerAlpha = 0.2 + (0.7 * recoverProgress);
          }
          const alphaBlend = Math.min(1, 0.22 * delta * SPEED_MULTIPLIER);
          e.stalkerAlpha += (targetStalkerAlpha - e.stalkerAlpha) * alphaBlend;
          e.stalkerAlpha = Math.max(0.08, Math.min(0.95, e.stalkerAlpha));

          const centerDx = e.x - centerX;
          const centerDy = e.y - centerY;
          const centerDist = Math.hypot(centerDx, centerDy);
          if (centerDist < minCenterDist && centerDist > 0) {
            e.x += (centerDx / centerDist) * e.speed * delta * SPEED_MULTIPLIER;
            e.y += (centerDy / centerDist) * e.speed * delta * SPEED_MULTIPLIER;
          }
          e.x = Math.max(edgePaddingX, Math.min(canvas.width - edgePaddingX, e.x));
          e.y = Math.max(edgePaddingY, Math.min(canvas.height - edgePaddingY, e.y));
          continue;
        }
        if (e.type === "shielder") {
          if (typeof e.shielderPreferredDistance !== "number") e.shielderPreferredDistance = 170 + Math.random() * 120;
          if (typeof e.shieldRange !== "number") e.shieldRange = 230;
          if (typeof e.shieldMaxLinks !== "number") e.shieldMaxLinks = 2;
          if (typeof e.shieldReductionAmount !== "number") e.shieldReductionAmount = 0.75;
          if (typeof e.shieldPersistDuration !== "number") e.shieldPersistDuration = 180;
          if (typeof e.shielderAlpha !== "number") e.shielderAlpha = 0;
          if (!Array.isArray(e.activeShieldTargets)) e.activeShieldTargets = [];
          e.activeShieldTargets.length = 0;

          const legacyPadding = typeof e.shielderEdgePadding === "number" ? e.shielderEdgePadding : 72;
          if (typeof e.shielderEdgePaddingX !== "number") e.shielderEdgePaddingX = legacyPadding;
          if (typeof e.shielderEdgePaddingY !== "number") e.shielderEdgePaddingY = Math.max(legacyPadding, 120);

          if (typeof e.zoneLocked !== "boolean") e.zoneLocked = false;
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const maxStopDistance = Math.max(130, Math.min(canvas.width, canvas.height) * 0.5);
          const minStopDistance = Math.max(90, maxStopDistance * 0.68);
          if (typeof e.shielderStopDistance !== "number") {
            e.shielderStopDistance = minStopDistance + Math.random() * (maxStopDistance - minStopDistance);
          }

          if (!e.zoneLocked) {
            const centerDist = Math.hypot(e.x - centerX, e.y - centerY);
            if (centerDist <= e.shielderStopDistance) {
              e.zoneLocked = true;
            } else {
              const zoneDx = centerX - e.x;
              const zoneDy = centerY - e.y;
              const zoneDist = Math.hypot(zoneDx, zoneDy);
              if (zoneDist > 0) {
                e.x += (zoneDx / zoneDist) * e.speed * delta * SPEED_MULTIPLIER;
                e.y += (zoneDy / zoneDist) * e.speed * delta * SPEED_MULTIPLIER;
              }
            }
          }

          const alliesInRange = enemies
            .filter(target => target !== e && target.health > 0 && target.type !== "shielder")
            .map(target => ({ target, dist: Math.hypot(target.x - e.x, target.y - e.y) }))
            .filter(entry => entry.dist <= e.shieldRange)
            .sort((a, b) => a.dist - b.dist)
            .slice(0, Math.max(0, e.shieldMaxLinks));

          for (const entry of alliesInRange) {
            const target = entry.target;
            const reduction = Math.max(0, Math.min(0.8, e.shieldReductionAmount));
            if (!target.shielded || reduction > (target.shieldReduction || 0)) {
              target.shielded = true;
              target.shieldReduction = reduction;
            }
            target.shieldPersistTimer = Math.max(target.shieldPersistTimer || 0, e.shieldPersistDuration);
            target.shieldedBy = e;
            e.activeShieldTargets.push(target);
          }

          e.shielderAlpha = Math.min(1, e.shielderAlpha + (0.035 * delta * SPEED_MULTIPLIER));
          continue;
        }
        if (e.type === "beamer") {
          if (typeof e.beamCooldown !== "number") e.beamCooldown = 110 + Math.floor(Math.random() * 70);
          if (typeof e.beamCastTimer !== "number") e.beamCastTimer = 0;
          if (typeof e.beamCastDuration !== "number") e.beamCastDuration = 0;
          if (typeof e.beamActiveTimer !== "number") e.beamActiveTimer = 0;
          if (typeof e.beamDuration !== "number") e.beamDuration = 0;
          if (typeof e.beamAngle !== "number") e.beamAngle = Math.atan2(player.y - e.y, player.x - e.x);
          if (typeof e.beamLength !== "number") e.beamLength = 460;
          if (typeof e.beamTravelHead !== "number") e.beamTravelHead = 0;
          if (typeof e.beamTravelTail !== "number") e.beamTravelTail = 0;
          if (typeof e.beamTravelSpeed !== "number") e.beamTravelSpeed = 0;
          if (typeof e.beamSegmentLength !== "number") e.beamSegmentLength = Math.max(120, e.beamLength * 0.32);
          if (typeof e.beamTickTimer !== "number") e.beamTickTimer = 0;
          if (typeof e.beamGlow !== "number") e.beamGlow = 0;
          if (typeof e.beamerAlpha !== "number") e.beamerAlpha = 0;
          if (typeof e.beamerFacingAngle !== "number") e.beamerFacingAngle = Math.atan2(player.y - e.y, player.x - e.x);
          if (typeof e.beamerPreferredDistance !== "number") e.beamerPreferredDistance = 190 + Math.random() * 140;
          const legacyPadding = typeof e.beamerEdgePadding === "number" ? e.beamerEdgePadding : 72;
          if (typeof e.beamerEdgePaddingX !== "number") e.beamerEdgePaddingX = legacyPadding;
          if (typeof e.beamerEdgePaddingY !== "number") e.beamerEdgePaddingY = Math.max(legacyPadding, 84);

          const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
          if (e.beamCastTimer <= 0 && e.beamActiveTimer <= 0) {
            e.beamAngle = angleToPlayer;
          }

          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const minCenterDist = e.beamerPreferredDistance;
          const edgePaddingX = Math.max(e.radius + 4, e.beamerEdgePaddingX);
          const edgePaddingY = Math.max(e.radius + 4, e.beamerEdgePaddingY);

          if (e.beamCastTimer > 0) {
            e.beamCastTimer -= delta * SPEED_MULTIPLIER;
            if (e.beamCastTimer <= 0) {
              e.beamDuration = 28 + Math.floor(Math.random() * 12);
              e.beamActiveTimer = e.beamDuration;
              e.beamTravelHead = 0;
              e.beamTravelTail = 0;
              e.beamSegmentLength = Math.max(120, e.beamLength * 0.32);
              e.beamTravelSpeed = e.beamLength / Math.max(1, e.beamDuration * 0.78);
              e.beamTickTimer = 0;
            }
          } else if (e.beamActiveTimer > 0) {
            e.beamActiveTimer -= delta * SPEED_MULTIPLIER;
            e.beamTravelHead += e.beamTravelSpeed * delta * SPEED_MULTIPLIER;
            e.beamTravelTail = Math.max(0, e.beamTravelHead - e.beamSegmentLength);
            e.beamTickTimer -= delta * SPEED_MULTIPLIER;

            if (e.beamTickTimer <= 0) {
              const beamStartX = e.x;
              const beamStartY = e.y;
              const headDist = Math.max(0, Math.min(e.beamLength, e.beamTravelHead));
              const tailDist = Math.max(0, Math.min(headDist, e.beamTravelTail));
              const segStartX = beamStartX + Math.cos(e.beamAngle) * tailDist;
              const segStartY = beamStartY + Math.sin(e.beamAngle) * tailDist;
              const segEndX = beamStartX + Math.cos(e.beamAngle) * headDist;
              const segEndY = beamStartY + Math.sin(e.beamAngle) * headDist;

              const segX = segEndX - segStartX;
              const segY = segEndY - segStartY;
              const segLenSq = segX * segX + segY * segY;
              let distanceToBeam = Infinity;
              if (segLenSq > 0) {
                const t = Math.max(0, Math.min(1, ((player.x - segStartX) * segX + (player.y - segStartY) * segY) / segLenSq));
                const closestX = segStartX + segX * t;
                const closestY = segStartY + segY * t;
                distanceToBeam = Math.hypot(player.x - closestX, player.y - closestY);
              }

              if (distanceToBeam <= player.radius + 9) {
                player.health -= Math.max(1, e.damage);
              }
              e.beamTickTimer = 10;
            }

            if (e.beamActiveTimer <= 0) {
              e.beamCooldown = 135 + Math.floor(Math.random() * 95);
              e.beamTravelHead = 0;
              e.beamTravelTail = 0;
              e.beamTravelSpeed = 0;
              e.beamGlow = 0;
            }
          } else {
            e.beamCooldown -= delta * SPEED_MULTIPLIER;
            if (e.beamCooldown <= 0) {
              e.beamCastDuration = 24 + Math.floor(Math.random() * 10);
              e.beamCastTimer = e.beamCastDuration;
              e.beamLength = Math.max(e.beamLength || 0, Math.hypot(canvas.width, canvas.height) + 120);
              e.beamAngle = Math.atan2(player.y - e.y, player.x - e.x);
              e.beamerFacingAngle = e.beamAngle;
            }
          }

          const desiredFacingAngle = (e.beamCastTimer > 0 || e.beamActiveTimer > 0)
            ? e.beamAngle
            : angleToPlayer;
          let facingDiff = desiredFacingAngle - e.beamerFacingAngle;
          while (facingDiff > Math.PI) facingDiff -= Math.PI * 2;
          while (facingDiff < -Math.PI) facingDiff += Math.PI * 2;
          const maxTurnPerFrame = 0.12 * delta * SPEED_MULTIPLIER;
          if (Math.abs(facingDiff) <= maxTurnPerFrame) {
            e.beamerFacingAngle = desiredFacingAngle;
          } else {
            e.beamerFacingAngle += Math.sign(facingDiff) * maxTurnPerFrame;
          }

          const targetGlow = e.beamActiveTimer > 0 ? 1 : (e.beamCastTimer > 0 ? 0.5 : 0.12);
          e.beamGlow += (targetGlow - e.beamGlow) * Math.min(1, 0.18 * delta * SPEED_MULTIPLIER);
          e.beamGlow = Math.max(0.08, Math.min(1, e.beamGlow));
          e.beamerAlpha = Math.min(1, e.beamerAlpha + (0.045 * delta * SPEED_MULTIPLIER));

          const centerDx = e.x - centerX;
          const centerDy = e.y - centerY;
          const centerDist = Math.hypot(centerDx, centerDy);
          if (e.beamCastTimer <= 0) {
            if (centerDist < minCenterDist && centerDist > 0) {
              e.x += (centerDx / centerDist) * e.speed * delta * SPEED_MULTIPLIER;
              e.y += (centerDy / centerDist) * e.speed * delta * SPEED_MULTIPLIER;
            }
          }
          e.x = Math.max(edgePaddingX, Math.min(canvas.width - edgePaddingX, e.x));
          e.y = Math.max(edgePaddingY, Math.min(canvas.height - edgePaddingY, e.y));
          continue;
        }
        const isSlinger = e.type === "slinger" || e.type === "slingerBoss";
        const isSlingerBossEntering = e.type === "slingerBoss" && e.slingerBossEntering !== false;
        if (e.type === "slingerBoss") {
          const centerX = canvas.width * 0.5;
          const centerY = canvas.height * 0.5;
          const centerDx = centerX - e.x;
          const centerDy = centerY - e.y;
          const centerDist = Math.hypot(centerDx, centerDy);
          const arrivalThreshold = Math.max(10, e.radius * 0.7);
          if (e.slingerBossEntering !== false) {
            const paddingX = typeof e.slingerBossEdgePaddingX === "number" ? e.slingerBossEdgePaddingX : 110;
            const paddingY = typeof e.slingerBossEdgePaddingY === "number" ? e.slingerBossEdgePaddingY : 150;
            const minX = paddingX;
            const maxX = canvas.width - paddingX;
            const minY = paddingY;
            const maxY = canvas.height - paddingY;
            const insidePaddedArea = e.x >= minX && e.x <= maxX && e.y >= minY && e.y <= maxY;
            if (typeof e.slingerBossEntryStage !== "string") e.slingerBossEntryStage = "padding";

            if (e.slingerBossEntryStage === "padding") {
              const entrySpeed = typeof e.slingerBossEntrySpeed === "number" ? e.slingerBossEntrySpeed : (e.speed * 1.9);
              if (centerDist > 0) {
                e.x += (centerDx / centerDist) * entrySpeed * delta * SPEED_MULTIPLIER;
                e.y += (centerDy / centerDist) * entrySpeed * delta * SPEED_MULTIPLIER;
              }
              if (insidePaddedArea) {
                e.slingerBossEntryStage = "center";
              }
            } else {
              if (centerDist > 0) {
                e.x += (centerDx / centerDist) * e.speed * delta * SPEED_MULTIPLIER;
                e.y += (centerDy / centerDist) * e.speed * delta * SPEED_MULTIPLIER;
              }
              if (centerDist <= arrivalThreshold) {
                e.slingerBossEntering = false;
              }
            }
          } else {
            if (centerDist > 0.8) {
              const settleSpeed = Math.min(0.22, e.speed * 0.2);
              e.x += (centerDx / centerDist) * settleSpeed * delta * SPEED_MULTIPLIER;
              e.y += (centerDy / centerDist) * settleSpeed * delta * SPEED_MULTIPLIER;
            }
          }
        }
        if (e.type === "gruntBoss" && e.gruntBossEntering !== false) {
          const centerX = canvas.width * 0.5;
          const centerY = canvas.height * 0.5;
          const centerDx = centerX - e.x;
          const centerDy = centerY - e.y;
          const centerDist = Math.hypot(centerDx, centerDy);
          const paddingX = typeof e.gruntBossEdgePaddingX === "number" ? e.gruntBossEdgePaddingX : 110;
          const paddingY = typeof e.gruntBossEdgePaddingY === "number" ? e.gruntBossEdgePaddingY : 150;
          const minX = paddingX;
          const maxX = canvas.width - paddingX;
          const minY = paddingY;
          const maxY = canvas.height - paddingY;
          const insidePaddedArea = e.x >= minX && e.x <= maxX && e.y >= minY && e.y <= maxY;
          const entrySpeed = typeof e.gruntBossEntrySpeed === "number" ? e.gruntBossEntrySpeed : (e.speed * 1.9);
          if (centerDist > 0) {
            e.x += (centerDx / centerDist) * entrySpeed * delta * SPEED_MULTIPLIER;
            e.y += (centerDy / centerDist) * entrySpeed * delta * SPEED_MULTIPLIER;
          }
          if (insidePaddedArea) {
            e.gruntBossEntering = false;
            if (typeof e.gruntBossNormalSpeed === "number") {
              e.speed = e.gruntBossNormalSpeed;
            }
          }
        }
        const isTouchingPlayer = dist < (e.radius + player.radius);
        const isSlingerInRange = dist < (e.attackRange || 20) + player.radius;
        const canAttackNow = e.type === "slingerBoss"
          ? (e.slingerBossEntryStage !== "padding")
          : (e.type === "gruntBoss" && e.gruntBossEntering !== false)
            ? false
          : (isSlinger ? isSlingerInRange : isTouchingPlayer);
        if (canAttackNow) {
          if (isSlinger && e.type === "slingerBoss") {
            const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
            const maxHealth = Math.max(1, typeof e.maxHealth === "number" ? e.maxHealth : e.health);
            const healthRatio = Math.max(0, Math.min(1, e.health / maxHealth));
            let phase = 1;
            if (healthRatio <= 0.34) phase = 3;
            else if (healthRatio <= 0.67) phase = 2;
            e.slingerBossPhase = phase;

            let firedAny = false;
            const fireShot = (shotAngle, shotSpeed, shotDamage, shotRadius, shotType, shotColor) => {
              firedAny = true;
              return spawnProjectile(
                e.x,
                e.y,
                Math.cos(shotAngle) * shotSpeed,
                Math.sin(shotAngle) * shotSpeed,
                shotDamage,
                shotRadius,
                shotColor,
                shotType
              );
            };

            const cooldownStep = delta * SPEED_MULTIPLIER;
            if (typeof e.slingerBossFragCooldown !== "number") e.slingerBossFragCooldown = 0;
            e.slingerBossFragCooldown -= cooldownStep;
            if (e.slingerBossFragCooldown <= 0) {
              const shell = fireShot(angleToPlayer, 1.28, e.damage + 1, 9.2, "slingerBossFragShell", "#ffd08a");
              shell.fragTargetX = player.x;
              shell.fragTargetY = player.y;
              shell.fragmentCount = 8;
              shell.fragmentDamage = Math.max(0.5, e.damage * 0.45);
              shell.fragmentRadius = 5.2;
              shell.lifeTimer = 170;
              e.slingerBossFragCooldown = phase === 1 ? 240 : (phase === 2 ? 190 : 120);
            }

            if (phase !== 3 && e.attackCooldown <= 0) {
              if (phase === 1) {
                fireShot(angleToPlayer, 1.62, e.damage, 7, "slingerBossProjectile", "#ffb347");
                e.attackCooldown = 34;
              } else if (phase === 2) {
                const hasActiveAutoBurst = typeof e.slingerBossAutoShotsLeft === "number" && e.slingerBossAutoShotsLeft > 0;
                if (!hasActiveAutoBurst) {
                  e.slingerBossAutoShotsLeft = 10;
                  e.slingerBossAutoShotTimer = 0;
                  e.attackCooldown = 1;
                }
              }
            }

            if (phase === 2) {
              if (typeof e.slingerBossAutoShotsLeft !== "number") e.slingerBossAutoShotsLeft = 0;
              if (typeof e.slingerBossAutoShotTimer !== "number") e.slingerBossAutoShotTimer = 0;

              if (e.slingerBossAutoShotsLeft > 0) {
                e.slingerBossAutoShotTimer -= cooldownStep;
                while (e.slingerBossAutoShotsLeft > 0 && e.slingerBossAutoShotTimer <= 0) {
                  const sprayOffset = (Math.random() - 0.5) * 0.09;
                  fireShot(
                    angleToPlayer + sprayOffset,
                    0.35,
                    Math.max(1, e.damage - 0.3),
                    6.3,
                    "slingerBossProjectile",
                    "#ffb347"
                  );
                  e.slingerBossAutoShotsLeft -= 1;
                  e.slingerBossAutoShotTimer += 5;
                }
                if (e.slingerBossAutoShotsLeft <= 0) {
                  e.attackCooldown = Math.max(e.attackCooldown, 84);
                }
              }
            } else {
              e.slingerBossAutoShotsLeft = 0;
              e.slingerBossAutoShotTimer = 0;
            }

            if (firedAny) {
              try {
                let enemyLaserSound = new Audio('laser.wav');
                enemyLaserSound.volume = window.sentinelVolume.enemyProjectile;
                enemyLaserSound.play();
              } catch (e) {}
            }
          } else if (e.attackCooldown <= 0) {
            if (isSlinger) {
              const angle = Math.atan2(player.y - e.y, player.x - e.x);
              const speed = 1.5;
              spawnProjectile(e.x, e.y, Math.cos(angle) * speed, Math.sin(angle) * speed, e.damage);
              // Play laser sound for enemy projectile
              try {
                let enemyLaserSound = new Audio('laser.wav');
                enemyLaserSound.volume = window.sentinelVolume.enemyProjectile;
                enemyLaserSound.play();
              } catch (e) {}
              e.attackCooldown = 60;
            } else {
              player.health -= e.damage;
              e.attackCooldown = 60;
            }
          }
            if (!isSlinger) drawLine(e.x, e.y, player.x, player.y, "gray");
        } else {
            if (e.type === "gruntBoss" && e.gruntBossEntering !== false) {
              // Grunt boss entry movement is handled above until it reaches the padded area.
            } else if (e.type === "bruteBoss") {
              const paddingX = typeof e.bruteBossEdgePaddingX === "number" ? e.bruteBossEdgePaddingX : 90;
              const paddingY = typeof e.bruteBossEdgePaddingY === "number" ? e.bruteBossEdgePaddingY : 135;
              const minX = paddingX;
              const maxX = canvas.width - paddingX;
              const minY = paddingY;
              const maxY = canvas.height - paddingY;
              const isInsidePaddedArea = e.x >= minX && e.x <= maxX && e.y >= minY && e.y <= maxY;

              if (e.bruteBossEntering !== false) {
                const entryTargetX = canvas.width * 0.5;
                const entryTargetY = canvas.height * 0.5;
                const entryDx = entryTargetX - e.x;
                const entryDy = entryTargetY - e.y;
                const entryDist = Math.hypot(entryDx, entryDy);
                const entrySpeed = typeof e.bruteBossEntrySpeed === "number" ? e.bruteBossEntrySpeed : (e.speed * 2);
                if (entryDist > 0) {
                  e.x += (entryDx / entryDist) * entrySpeed * delta * SPEED_MULTIPLIER;
                  e.y += (entryDy / entryDist) * entrySpeed * delta * SPEED_MULTIPLIER;
                }
                if (isInsidePaddedArea) {
                  e.bruteBossEntering = false;
                  if (typeof e.bruteBossNormalSpeed === "number") {
                    e.speed = e.bruteBossNormalSpeed;
                  }
                }
              }

              if (e.bruteBossEntering === false) {
                const currentNovaRadius = typeof e.novaRadius === "number"
                  ? e.novaRadius
                  : (typeof e.novaMinRadius === "number" ? e.novaMinRadius : (e.radius + 24));
                const desiredDistance = Math.max(e.radius + 24, currentNovaRadius * 0.72);
                const distanceTolerance = Math.max(16, currentNovaRadius * 0.1);

                if (dist > desiredDistance + distanceTolerance) {
                  if (dist > 0) {
                    e.x += (dx / dist) * e.speed * delta * SPEED_MULTIPLIER;
                    e.y += (dy / dist) * e.speed * delta * SPEED_MULTIPLIER;
                  }
                } else if (dist < desiredDistance - distanceTolerance) {
                  if (dist > 0) {
                    e.x -= (dx / dist) * e.speed * delta * SPEED_MULTIPLIER;
                    e.y -= (dy / dist) * e.speed * delta * SPEED_MULTIPLIER;
                  }
                } else {
                  const tangentX = -dy;
                  const tangentY = dx;
                  const tangentLength = Math.hypot(tangentX, tangentY);
                  if (tangentLength > 0) {
                    const tangentDirection = (Math.sin((e.spinAngle || 0) * 0.35) >= 0) ? 1 : -1;
                    const strafeSpeed = e.speed * 0.6;
                    e.x += (tangentX / tangentLength) * strafeSpeed * tangentDirection * delta * SPEED_MULTIPLIER;
                    e.y += (tangentY / tangentLength) * strafeSpeed * tangentDirection * delta * SPEED_MULTIPLIER;
                  }
                }

                e.x = Math.max(minX, Math.min(maxX, e.x));
                e.y = Math.max(minY, Math.min(maxY, e.y));
              }
            } else if (e.type === "brute") {
              if (typeof e.zoneLocked !== "boolean") e.zoneLocked = false;
              const centerX = canvas.width / 2;
              const centerY = canvas.height / 2;
              const maxStopDistance = Math.max(90, Math.min(canvas.width, canvas.height) * 0.34);
              const minStopDistance = Math.max(44, maxStopDistance * 0.42);
              if (typeof e.bruteStopDistance !== "number") {
                e.bruteStopDistance = minStopDistance + Math.random() * (maxStopDistance - minStopDistance);
              }

              if (!e.zoneLocked) {
                const centerDist = Math.hypot(e.x - centerX, e.y - centerY);
                if (centerDist <= e.bruteStopDistance) {
                  e.zoneLocked = true;
                } else {
                  const zoneDx = centerX - e.x;
                  const zoneDy = centerY - e.y;
                  const zoneDist = Math.hypot(zoneDx, zoneDy);
                  if (zoneDist > 0) {
                    e.x += (zoneDx / zoneDist) * e.speed * delta * SPEED_MULTIPLIER;
                    e.y += (zoneDy / zoneDist) * e.speed * delta * SPEED_MULTIPLIER;
                  }
                }
              }
            } else
            if (e.type === "kamikaze" && !e.exploded) {
              // Draw visible explosion zone
              ctx.save();
              ctx.beginPath();
              ctx.arc(e.x, e.y, e.radius + 52, 0, Math.PI * 2);
              ctx.strokeStyle = "rgba(255, 68, 68, 0.35)";
              ctx.lineWidth = 3;
              ctx.setLineDash([8, 8]);
              ctx.shadowColor = "#ff4444";
              ctx.shadowBlur = 12;
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.shadowBlur = 0;
              ctx.restore();

              // Move toward player
              e.x += (dx / dist) * e.speed * delta * SPEED_MULTIPLIER;
              e.y += (dy / dist) * e.speed * delta * SPEED_MULTIPLIER;

              // Handle mine placement and explosion timing
              if (typeof e.minesPlaced === 'undefined') e.minesPlaced = 0;
              if (typeof e.mineInterval === 'undefined') e.mineInterval = 60;
              if (typeof e.nextMineTime === 'undefined') e.nextMineTime = 60;
              if (typeof e.timer === 'undefined') e.timer = 60;

              e.timer -= delta * SPEED_MULTIPLIER;
              if (e.minesPlaced < 3) {
                e.nextMineTime -= delta * SPEED_MULTIPLIER;
                if (e.nextMineTime <= 0) {
                  // Place a mine at current position
                  mines.push({ x: e.x, y: e.y, radius: 18, timer: 360, color: '#ffbb00', active: true });
                  e.minesPlaced++;
                  e.nextMineTime = e.mineInterval;
                  e.timer = e.mineInterval; // reset timer for next mine/explosion
                }
              } else if (e.timer <= 0) {
                // Explode!
                e.exploded = true;
                // Damage player if in range
                const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
                if (distToPlayer < e.radius + player.radius + 52) {
                  player.health -= e.damage;
                }
                // Explosion effect
                for (let j = 0; j < 24; j++) {
                  const angle = Math.random() * Math.PI * 2;
                  const speed = 5.2 + Math.random() * 1.8;
                  const color = ["#ff3c00","#fd8700","#fff200"][Math.floor(Math.random()*3)];
                  const size = 3 + Math.random() * 4;
                  const life = 42 + Math.random() * 2;
                  const decay = 0.91 + Math.random() * 0.02;
                  spawnParticle(
                    e.x,
                    e.y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    life,
                    color,
                    decay,
                    size,
                    "enemyDeath"
                  );
                }
                // Do NOT drop slingerDrop here (self-explode)
                releaseEnemyAt(i);
                continue;
              }
            } else {
              e.x += (dx / dist) * e.speed * delta * SPEED_MULTIPLIER;
              e.y += (dy / dist) * e.speed * delta * SPEED_MULTIPLIER;
            }
        }
      }
    }

    // Only decrement attackCooldown for mobs
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (typeof e.attackCooldown === "number") e.attackCooldown--;
    }

    // Prevent enemy overlap and update spin/hover once per enemy per frame
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      for (let j = 0; j < enemies.length; j++) {
        if (i === j) continue;
        const o = enemies[j];
        if (
          (e.type === "grunt" && o.type === "gruntBoss" && e.noBossCollision > 0) ||
          (o.type === "grunt" && e.type === "gruntBoss" && o.noBossCollision > 0)
        ) {
          continue;
        }
        const ox = e.x - o.x;
        const oy = e.y - o.y;
        const d = Math.hypot(ox, oy);
        const r1 = typeof e.collisionRadius === 'number' ? e.collisionRadius : e.radius;
        const r2 = typeof o.collisionRadius === 'number' ? o.collisionRadius : o.radius;
        const minDist = r1 + r2;
        const isBrutePair = (e.type === "brute" || e.type === "bruteBoss") && (o.type === "brute" || o.type === "bruteBoss");
        const isShielderPair = e.type === "shielder" && o.type === "shielder";
        const shouldUseExpandedSpacing = isBrutePair || isShielderPair;
        const targetMinDist = shouldUseExpandedSpacing ? minDist * 3 : minDist;
        if (d < targetMinDist && d > 0) {
          const overlap = (targetMinDist - d) / 2;
          let pushFactorE = 0.25, pushFactorO = 0.25;
          if (e.type === "gruntBoss") pushFactorE = 0.08;
          else if (e.type === "brute" || e.type === "bruteBoss") pushFactorE = 0.18;
          else if (e.type === "stalker") pushFactorE = 0.16;
          else if (e.type === "shielder") pushFactorE = 0.16;
          else if (e.type === "beamer") pushFactorE = 0.16;
          if (o.type === "gruntBoss") pushFactorO = 0.08;
          else if (o.type === "brute" || o.type === "bruteBoss") pushFactorO = 0.18;
          else if (o.type === "stalker") pushFactorO = 0.16;
          else if (o.type === "shielder") pushFactorO = 0.16;
          else if (o.type === "beamer") pushFactorO = 0.16;
          if (shouldUseExpandedSpacing) {
            pushFactorE = 0.3;
            pushFactorO = 0.3;
          }
          e.x += (ox / d) * overlap * pushFactorE * delta * SPEED_MULTIPLIER;
          e.y += (oy / d) * overlap * pushFactorE * delta * SPEED_MULTIPLIER;
          o.x -= (ox / d) * overlap * pushFactorO * delta * SPEED_MULTIPLIER;
          o.y -= (oy / d) * overlap * pushFactorO * delta * SPEED_MULTIPLIER;
        }
      }

      if (typeof e.spinAngle === "undefined") e.spinAngle = Math.random() * Math.PI * 2;
      // Removed spin animation: spinAngle is set only at spawn and not updated
      if (e.type === "slinger" || e.type === "slingerBoss") {
        if (typeof e.baseY === "undefined") e.baseY = e.y;
        if (typeof e.hoverOffset === "undefined") e.hoverOffset = Math.random() * Math.PI * 2;
        e.hoverOffset += 0.8 * delta;
      }
    }
  }

  function updateProjectiles(delta) {
    const frameScale = delta * SPEED_MULTIPLIER;
    const emitBruteFireballNova = (x, y, areaRadius) => {
      const resolvedRadius = Math.max(18, Number.isFinite(areaRadius) ? areaRadius : 72);
      const burstCount = 28;
      for (let burstIndex = 0; burstIndex < burstCount; burstIndex++) {
        const angle = (Math.PI * 2 * burstIndex) / burstCount;
        const speed = (resolvedRadius / 26) + Math.random() * (resolvedRadius / 40);
        const flare = burstIndex < 10;
        const color = flare ? "#fff200" : ["#ff6600", "#ffaa00", "#ff3300"][Math.floor(Math.random() * 3)];
        const size = flare ? 6 + Math.random() * 2.5 : 3.2 + Math.random() * 2;
        const life = flare ? 20 + Math.random() * 12 : 15 + Math.random() * 10;
        const decay = flare ? 0.92 : 0.95;
        spawnParticle(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          life,
          color,
          decay,
          size,
          "novaFlare"
        );
      }
    };

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.x += p.dx * frameScale;
      p.y += p.dy * frameScale;

      if (p.type === "bruteBossFireball") {
        p.lifeTimer = (typeof p.lifeTimer === "number" ? p.lifeTimer : 200) - frameScale;
        p.particleCooldown = (typeof p.particleCooldown === "number" ? p.particleCooldown : 0) - frameScale;
        if (p.particleCooldown <= 0) {
          p.particleCooldown = 8;
          const trailAngle = Math.atan2(-p.dy, -p.dx);
          const spread = (Math.random() - 0.5) * 0.9;
          const particleSpeed = 0.5 + Math.random() * 0.5;
          spawnParticle(
            p.x,
            p.y,
            Math.cos(trailAngle + spread) * particleSpeed,
            Math.sin(trailAngle + spread) * particleSpeed,
            14 + Math.floor(Math.random() * 12),
            ["#ff6a00", "#ffb14d", "#ff4200"][Math.floor(Math.random() * 3)],
            0.91 + Math.random() * 0.04,
            2 + Math.random() * 2,
            "enemyProjectile"
          );
        }
      }

      if (p.type === "slingerBossFragShell") {
        p.lifeTimer = (typeof p.lifeTimer === "number" ? p.lifeTimer : 170) - frameScale;
        const targetX = typeof p.fragTargetX === "number" ? p.fragTargetX : p.x;
        const targetY = typeof p.fragTargetY === "number" ? p.fragTargetY : p.y;
        const shellRadius = typeof p.radius === "number" ? p.radius : 9;
        const distanceToTarget = Math.hypot(targetX - p.x, targetY - p.y);
        if (distanceToTarget <= Math.max(7, shellRadius + 1) || p.lifeTimer <= 0) {
          const fragmentCount = typeof p.fragmentCount === "number" ? p.fragmentCount : 8;
          const fragmentDamage = Math.max(0.5, typeof p.fragmentDamage === "number" ? p.fragmentDamage : (p.damage * 0.45));
          const fragmentRadius = typeof p.fragmentRadius === "number" ? p.fragmentRadius : 5.2;
          for (let fragmentIndex = 0; fragmentIndex < fragmentCount; fragmentIndex++) {
            const fragmentAngle = (Math.PI * 2 * fragmentIndex) / fragmentCount;
            const fragmentSpeed = 1.2 + Math.random() * 0.25;
            spawnProjectile(
              targetX,
              targetY,
              Math.cos(fragmentAngle) * fragmentSpeed,
              Math.sin(fragmentAngle) * fragmentSpeed,
              fragmentDamage,
              fragmentRadius,
              "#ffb347",
              "slingerBossFragment"
            );
          }
          releaseProjectileAt(i);
          continue;
        }
      }

      // Removed projectile trail/tail update

      const projectileRadius = typeof p.radius === "number" ? p.radius : 4;
      const dist = Math.hypot(player.x - p.x, player.y - p.y);
      if (dist < player.radius + projectileRadius) {
        player.health -= p.damage;
        if (p.type === "bruteBossFireball") {
          emitBruteFireballNova(p.x, p.y, p.burnRadius);
          spawnBurningArea(p.x, p.y, {
            radius: p.burnRadius,
            duration: p.burnDuration,
            tickInterval: p.burnTickInterval,
            damage: p.burnDamage
          });
        }
        releaseProjectileAt(i);
        continue;
      }

      if (p.type === "bruteBossFireball" && p.lifeTimer <= 0) {
        emitBruteFireballNova(p.x, p.y, p.burnRadius);
        spawnBurningArea(p.x, p.y, {
          radius: p.burnRadius,
          duration: p.burnDuration,
          tickInterval: p.burnTickInterval,
          damage: p.burnDamage
        });
        releaseProjectileAt(i);
        continue;
      }

      if (p.x < -20 || p.x > canvas.width + 20 || p.y < -20 || p.y > canvas.height + 20) {
        releaseProjectileAt(i);
      }
    }
  }

  function updateParticles() {
    for (let p of particles) {
      p.x += p.dx;
      p.y += p.dy;
      if (p.decay) {
        p.dx *= p.decay;
        p.dy *= p.decay;
      }
      p.life--;
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].life <= 0) releaseParticleAt(i);
    }

    let xpDropParticleCount = 0;
    for (let i = 0; i < particles.length; i++) {
      if (particles[i].type === "xpDrop") xpDropParticleCount++;
    }
    if (xpDropParticleCount > MAX_XPDROP_PARTICLES) {
      let toRemove = xpDropParticleCount - MAX_XPDROP_PARTICLES;
      for (let i = 0; i < particles.length && toRemove > 0; i++) {
        if (particles[i].type === "xpDrop") {
          releaseParticleAt(i);
          i--;
          toRemove--;
        }
      }
    }

    if (particles.length > MAX_PARTICLES) {
      while (particles.length > MAX_PARTICLES) {
        releaseParticleAt(0);
      }
    }
  }

  function drawProjectiles() {
    for (let p of projectiles) {
      // Skip drawing if projectile is completely outside the canvas
      const r = typeof p.radius === "number" ? p.radius : 10;
      if (
        p.x + r < 0 ||
        p.x - r > canvas.width ||
        p.y + r < 0 ||
        p.y - r > canvas.height
      ) {
        continue;
      }
      // Remove tail and pulsing from all enemy projectiles (gruntboss, slinger, slinger boss, stalker)
      if (
        p.type === "bruteBossFireball" ||
        p.type === "slingerBossProjectile" ||
        p.type === "slingerBossFragment" ||
        p.type === "slingerBossFragShell" ||
        p.type === "slingerProjectile" ||
        p.type === "stalkerProjectile" ||
        p.type === "gruntBossProjectile"
      ) {
        ctx.save();
        const radius = typeof p.radius === "number" ? p.radius : 8;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color || "#ffb347";
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 0.62, 0, Math.PI * 2);
        ctx.fillStyle = "#fff2c0";
        ctx.fill();
        ctx.restore();
        continue;
      }

      // Pulsing glow
      ctx.save();

      // Inner core
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5.2, 0, Math.PI * 2);
      ctx.fillStyle = "#fff6b0";
      ctx.fill();
      ctx.restore();
    }
  }











//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-  
//-==-=-=-=-=-=-=-=-=-=-=-=-=main game loop and drawing=-=-=-=-=-=-=-=-=-=-=-=-=-=- 
//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-  


  let lastTimestamp = performance.now();

  let _lastDebugLog = 0;
  function gameLoop(currentTimestamp) {
    if (typeof isGameBlocked === 'function' && isGameBlocked()) {
      requestAnimationFrame(gameLoop);
      return;
    }
    // Calculate delta time in seconds
    const delta = (currentTimestamp - lastTimestamp) / 1000;
    lastTimestamp = currentTimestamp;

    // ...existing code...
        // Draw wave announcement if timer is active
        // (waveAnnouncementTimer update will be made delta-based in next step)
        if (waveAnnouncementTimer > 0) {
          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = "bold 44px sans-serif";
          ctx.fillStyle = "#00eaff";
          ctx.shadowColor = "#222";
          ctx.shadowBlur = 18;
          ctx.globalAlpha = Math.min(1, waveAnnouncementTimer / WAVE_ANNOUNCE_DURATION);
          ctx.fillText("Wave " + wave, canvas.width / 2, canvas.height / 2);
          ctx.restore();
          waveAnnouncementTimer -= delta * 60; // 60 = original FPS
        }
    if (!followMouse && !gameOver) {
      paused = true;
      showStats = true;
    } else if (followMouse) {
      paused = false;
      showStats = false;
    }

    // Draw background image, fallback to clear if not loaded
    if (backgroundImg.complete && backgroundImg.naturalWidth > 0) {
      ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Draw 8 small rectangular lights matching the blue panels
    // Lights configuration: edit each light's properties here
    const lights = [
      // Example: {x, y, w, h, color, intensity, border, beamColor}
      {x: 115, y: 220, w: 8, h: 45, color: "rgba(50, 211, 255, 0)", intensity: 0.28, border: "#00bfff00", beamColor: "rgba(0,200,255,0.28)"},
      {x: 115, y: canvas.height -310, w: 8, h: 45, color: "rgba(0,200,255,0)", intensity: 0.28, border: "#00bfff00", beamColor: "rgba(0,200,255,0.28)"},
      {x: 340, y: canvas.height - 130, w: 45, h: 8, color: "rgba(0,200,255,0)", intensity: 0.28, border: "#00bfff00", beamColor: "rgba(0,200,255,0.28)"},
      {x: canvas.width - 390, y: canvas.height - 130, w: 45, h: 8, color: "rgba(0,200,255,0)", intensity: 0.28, border: "#00bfff00", beamColor: "rgba(0,200,255,0.28)"},
      {x: canvas.width - 120, y: canvas.height -310, w: 8, h: 45, color: "rgba(0,200,255,0)", intensity: 0.28, border: "#00bfff00", beamColor: "rgba(0,200,255,0.28)"},
      {x: canvas.width - 120, y: 220, w: 8, h: 45, color: "rgba(0,200,255,0)", intensity: 0.28, border: "#00bfff00", beamColor: "rgba(0,200,255,0.28)"},
      {x: 340, y: 90, w: 45, h: 8, color: "rgba(0,200,255,0)", intensity: 0.28, border: "#00bfff00", beamColor: "rgba(0,200,255,0.28)"},
      {x: canvas.width - 390, y: 90, w: 45, h: 8, color: "rgba(0,200,255,0)", intensity: 0.28, border: "#00bfff00", beamColor: "rgba(0,200,255,0.28)"}
    ];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    lights.forEach(light => {
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = light.color;
      ctx.fillRect(light.x, light.y, light.w, light.h);
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = 3;
      ctx.strokeStyle = light.border;
      ctx.strokeRect(light.x, light.y, light.w, light.h);
      ctx.restore();

      // Draw a radial glow centered on the light
      ctx.save();
      const lx = light.x + light.w / 2;
      const ly = light.y + light.h / 2;
      const glowRadius = Math.max(light.w, light.h) * 4.2;
      const grad = ctx.createRadialGradient(lx, ly, Math.max(light.w, light.h) * 0.5, lx, ly, glowRadius);
      grad.addColorStop(0, light.beamColor);
      grad.addColorStop(0.3, `rgba(0,200,255,${light.intensity * 0.36})`);
      grad.addColorStop(1, "rgba(0,0,0,0.0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.arc(lx, ly, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    });
    if (gameStarted) {
      // ...existing code...
    }

    if (!gameStarted && Date.now() - startTime < 2000) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "white";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("Sentinel v2.0", canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("Prepare for battle...", canvas.width / 2, canvas.height / 2 + 20);
      drawWaveAnnouncement();
    } else {
      drawWaveAnnouncement();
      if (!gameStarted) {
        spawnWave();
        gameStarted = true;
      }

      if (!paused && !gameOver) {
        updateHealthDrops();
        updateXPDrops();
        updateslingerDrops();
        updateBruteDrops();
        if (!freezeActive) {
          updateProtocolOrbs(delta);
        }
        updateMines(delta);
        updateParticles();
        // Only update movement if not frozen
        if (freezeActive) {
          freezeTimer -= delta;
          if (freezeTimer <= 0) {
            freezeActive = false;
            freezeTimer = 0;
          }
        }
        if (!freezeActive) {
          updatePlayer(delta);
          updateEnemies(delta);
        }
        if (!freezeActive) {
          updateProjectiles(delta);
        }
        autoAttack();
        handleWaveSpawning(delta);
        const waveUsesBossGate = wave === 5 || wave === 10 || wave === 20;
        const finalBurstReached = burstCount !== Infinity && burstIndex >= burstCount;
        const allEnemiesCleared = enemies.length === 0;
        const allowTimedOrClearAdvance = !waveUsesBossGate && finalBurstReached;
        if (allowTimedOrClearAdvance) {
          if (!interWavePending) {
            interWavePending = true;
            interWaveDelayTimer = INTER_WAVE_DELAY_SECONDS;
          } else {
            interWaveDelayTimer -= delta;
          }
          const timerExpired = interWaveDelayTimer <= 0;
          const shouldAdvanceWave = allEnemiesCleared || timerExpired;
          if (shouldAdvanceWave) {
            interWavePending = false;
            interWaveDelayTimer = 0;
            wave++;
            try {
              let warnAudio = new Audio('warning.wav');
              warnAudio.volume = window.sentinelVolume && window.sentinelVolume.warning !== undefined ? window.sentinelVolume.warning : 1.0;
              warnAudio.playbackRate = 0.7;
              warnAudio.play();
            } catch (e) {}
            spawnWave();
            burstTimer = burstInterval;
          }
        } else {
          interWavePending = false;
          interWaveDelayTimer = 0;
        }
      }



      //-======================DROPS, MINES, AND PARTICLES======================-
      // Draw drops with glow (drawn before player/enemies for z-index effect)
      xpDrops.forEach(d => {
        ctx.save();
        ctx.shadowColor = "#ff33ff";
        ctx.shadowBlur = 18;
        const grad = ctx.createRadialGradient(d.x, d.y, 1, d.x, d.y, 5);
        grad.addColorStop(0, "#ff87ff");
        grad.addColorStop(0.4, "#ff31ff");
        grad.addColorStop(1, "#910091");
        ctx.beginPath();
        ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });
      // Slinger drop glow
      slingerDrops.forEach(d => {
        ctx.save();
        ctx.shadowColor = "#ffc250";
        ctx.shadowBlur = 18;
        const grad = ctx.createRadialGradient(d.x, d.y, 1, d.x, d.y, 5);
        grad.addColorStop(0, "#fcea64");
        grad.addColorStop(0.4, "#ffd700");
        grad.addColorStop(1, "#ff9900");
        ctx.beginPath();
        ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });
      // Brute drop glow
      bruteDrops.forEach(d => {
        ctx.save();
        ctx.shadowColor = "#ff4444";
        ctx.shadowBlur = 18;
        const grad = ctx.createRadialGradient(d.x, d.y, 1, d.x, d.y, 5);
        grad.addColorStop(0, "#ff4949");
        grad.addColorStop(0.4, "#ff1717");
        grad.addColorStop(1, "#8B0000");
        ctx.beginPath();
        ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });
      // Health drop glow
      healthDrops.forEach(d => {
        ctx.save();
        ctx.shadowColor = "#ff4444";
        ctx.shadowBlur = 18;
        const grad = ctx.createRadialGradient(d.x, d.y, 1, d.x, d.y, 6);
        grad.addColorStop(0, "#ff4949");
        grad.addColorStop(0.4, "#ff1717");
        grad.addColorStop(1, "#b11717");
        ctx.beginPath();
        ctx.arc(d.x, d.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });

      // Protocol orb glow (attackable discovery drops)
      protocolOrbs.forEach(orb => {
        const pulse = 0.85 + Math.sin(Date.now() * 0.008) * 0.15;
        const progress = orb.requiredFrames > 0 ? Math.min(1, orb.progressFrames / orb.requiredFrames) : 0;
        const coreRadius = orb.radius * pulse;
        const outerRadius = orb.radius * (1.9 + progress * 0.5);
        const coreColor = orb.rarity === "Rare" ? "#c87cff" : "#63f0ff";
        const edgeColor = orb.rarity === "Rare" ? "#7a2bbd" : "#008ea8";

        ctx.save();
        ctx.shadowColor = coreColor;
        ctx.shadowBlur = 20;
        const grad = ctx.createRadialGradient(orb.x, orb.y, 1, orb.x, orb.y, outerRadius);
        grad.addColorStop(0, coreColor);
        grad.addColorStop(0.45, edgeColor);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, outerRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(orb.x, orb.y, coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = coreColor;
        ctx.globalAlpha = 0.75;
        ctx.fill();

        // Progress ring while attacking over time
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#e8ffff";
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius + 4, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
        ctx.stroke();
        ctx.restore();
      });

      // Draw mines before player/enemies for proper z-index
      drawMines();

      //laser, enemyHit, levelUp, xpDrop, slingerDrop, bruteDrop, healthDrop, enemyDeath, 
      drawParticlesOfType("xpDrop")
      drawParticlesOfType("slingerDrop")
      drawParticlesOfType("bruteDrop")
      drawParticlesOfType("healthDrop")
      drawParticlesOfType("enemyDeath")
      drawParticlesOfType("dust")
      drawParticlesOfType("novaFlare")
      drawParticlesOfType("burnZone")
      drawParticlesOfType("gruntNova")






      //-======================PLAYER AND ENEMIES======================-
      // Draw health bar and XP bar above the player (no numbers)
      function drawPlayerBars() {
        // Show freeze countdown if active
        if (typeof freezeActive !== 'undefined' && freezeActive && typeof freezeTimer === 'number' && freezeTimer > 0) {
          ctx.save();
          ctx.font = "bold 12px sans-serif";
          ctx.fillStyle = "#ffe26c";
          ctx.textAlign = "center";
          ctx.shadowColor = "#000";
          ctx.shadowBlur = 6;
          const barWidth = player.radius * 2.2;
          const barX = player.x - barWidth / 2;
          const barY = player.y - player.radius - 10;
          // Centered higher above health bar
          ctx.fillText(freezeTimer.toFixed(1) + "s", barX + barWidth / 2, barY - 18);
          ctx.restore();
        }
          // Draw pickup circle border
          ctx.save();
          ctx.globalAlpha = 0.05;
          ctx.strokeStyle = '#00eaff';
          ctx.fillStyle = 'rgb(1, 133, 145)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(player.x, player.y, player.pickupRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        const barWidth = player.radius * 2.2;
        const barHeight = 4; // Skinnier bars
        const barX = player.x - barWidth / 2;
        let barY = player.y - player.radius - 18;
        const healthBarY = barY;

        // Health bar
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#222";
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.rect(barX, barY, barWidth, barHeight);
        ctx.stroke();
        ctx.fillRect(barX, barY, barWidth * (player.health / player.maxHealth), barHeight);
        ctx.restore();

        // XP bar (drawn above health bar)
        barY -= barHeight + 3; // Slightly less gap for skinnier bars
        const xpBarY = barY;
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#222";
        ctx.fillStyle = "#0cf";
        ctx.beginPath();
        ctx.rect(barX, barY, barWidth, barHeight);
        ctx.stroke();
        ctx.fillRect(barX, barY, barWidth * (xp / xpToLevel), barHeight);
        ctx.restore();

        if (statPoints > 0) {
          const arrowX = barX + barWidth + 10;
          const arrowTopY = xpBarY - 2;
          const arrowBottomY = healthBarY + barHeight + 2;
          const arrowMidY = arrowTopY + 6;
          ctx.save();
          ctx.strokeStyle = "#00ff88";
          ctx.fillStyle = "#00ff88";
          ctx.shadowColor = "#00ff88";
          ctx.shadowBlur = 10;
          ctx.lineWidth = 2;

          ctx.beginPath();
          ctx.moveTo(arrowX, arrowBottomY);
          ctx.lineTo(arrowX, arrowMidY);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(arrowX, arrowTopY);
          ctx.lineTo(arrowX - 4, arrowMidY);
          ctx.lineTo(arrowX + 4, arrowMidY);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        if (bytePickupNotifications.length > 0) {
          for (let notificationIndex = bytePickupNotifications.length - 1; notificationIndex >= 0; notificationIndex--) {
            const notification = bytePickupNotifications[notificationIndex];
            if (!paused) notification.timer -= 1;
            if (notification.timer <= 0) {
              bytePickupNotifications.splice(notificationIndex, 1);
              continue;
            }

            const lifeRatio = Math.max(0, Math.min(1, notification.timer / Math.max(1, notification.maxTimer || 80)));
            const rise = (1 - lifeRatio) * 20;
            const yOffset = notificationIndex * 14;
            // Centered above the health bar
            const textX = barX + barWidth / 2;
            const textY = healthBarY - 18 - yOffset - rise;

            ctx.save();
            ctx.globalAlpha = lifeRatio;
            ctx.font = "bold 12px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#ffd84d";
            ctx.shadowColor = "#ffd84d";
            ctx.shadowBlur = 10;
            ctx.fillText(`+${notification.amount} Bytes`, textX, textY);
            ctx.restore();
          }
        }
      }

      // Player feedback: green flash when level up
      let feedbackColor = null;
      let feedbackAlpha = 0;
      if (playerLevelUpTimer > 0) {
        feedbackColor = "#00ffdd";
        feedbackAlpha = 0.35 * (playerLevelUpTimer / 24);
      }

      if (playerImg.complete && playerImg.naturalWidth > 0) {
        ctx.save();
        ctx.translate(player.x, player.y);
        // Laser shadow behind player when laser is active
        const nearest = window._nearestEnemy;
        const minDist = typeof window._minDist !== 'undefined' ? window._minDist : Infinity;
        if (nearest && minDist < player.range + nearest.radius && player.attackCooldown > 0) {
          // Shadow direction: away from laser
          const dx = nearest.x - player.x;
          const dy = nearest.y - player.y;
          const dist = Math.hypot(dx, dy);
          const dirX = dx / dist;
          const dirY = dy / dist;
          const shadowOffset = player.radius * 1.8;
          const shadowX = -dirX * shadowOffset;
          const shadowY = -dirY * shadowOffset;
          const shadowLength = player.radius * 2.8;
          ctx.save();
          ctx.globalAlpha = 0.38;
          ctx.fillStyle = 'rgba(0,0,0,0.38)';
          ctx.translate(shadowX, shadowY);
          ctx.beginPath();
          ctx.ellipse(0, 0, shadowLength, player.radius * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        // For each light, cast a shadow on the player, fading with distance
        lights.forEach(light => {
          // Calculate direction from light to player
          const lx = light.x + light.w / 2;
          const ly = light.y + light.h / 2;
          const dx = player.x - lx;
          const dy = player.y - ly;
          const dist = Math.hypot(dx, dy);
          // Fade shadow: max opacity when close, fades out as distance increases
          const fadeStart = Math.max(light.w, light.h) * 1.2;
          const fadeEnd = Math.max(light.w, light.h) * 6.5;
          let shadowAlpha = 0;
          if (dist < fadeStart) {
            shadowAlpha = 0.38;
          } else if (dist < fadeEnd) {
            shadowAlpha = 0.38 * (1 - (dist - fadeStart) / (fadeEnd - fadeStart));
          }
          if (shadowAlpha > 0.01) {
            // Normalize direction
            const dirX = dx / dist;
            const dirY = dy / dist;
            // Shadow offset: away from light
            const shadowOffset = player.radius * 1.2;
            const shadowX = dirX * shadowOffset;
            const shadowY = dirY * shadowOffset;
            // Shadow length and angle
            const shadowLength = player.radius * 2.2;
            const shadowAngle = Math.atan2(dirY, dirX);
            ctx.save();
            ctx.globalAlpha = shadowAlpha * 0.98;
            ctx.fillStyle = "rgba(0,0,0,0.38)";
            ctx.translate(shadowX, shadowY);
            ctx.rotate(shadowAngle);
            ctx.beginPath();
            ctx.ellipse(0, 0, shadowLength, player.radius * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });

        // Gold glow if stat points available
        let angle = window._playerToEnemyAngle || 0;
        if (statPoints > 0) {
          ctx.shadowColor = "#00ffdd";
          ctx.shadowBlur = 32;
        } else {
          ctx.shadowColor = "#222";
          ctx.shadowBlur = 12;
        }
        // Rotate so the bottom of the image faces the nearest enemy
        // The image's bottom is at -Math.PI/2 from its default orientation
        ctx.rotate(angle - Math.PI / 2);
        ctx.drawImage(
          playerImg,
          -player.radius * 1.5,
          -player.radius * 1.5,
          player.radius * 3,
          player.radius * 3
        );
        // Overlay feedback color if needed
        if (feedbackColor) {
          ctx.globalAlpha = feedbackAlpha;
          // Create a radial gradient for a blurry, bubble-like shield
          const r = player.radius * 1.5;
          const grad = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r);
          grad.addColorStop(0, feedbackColor + '55'); // more transparent center
          grad.addColorStop(0.7, feedbackColor + '66');
          grad.addColorStop(1, feedbackColor + '00'); // fully transparent edge
          ctx.save();
          ctx.shadowColor = feedbackColor;
          ctx.shadowBlur = 32;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
          ctx.globalAlpha = 1.0;
        }
        ctx.restore();
      } else {
        ctx.save();
        // Gold glow if stat points available
        if (statPoints > 0) {
          ctx.shadowColor = "gold";
          ctx.shadowBlur = 32;
        } else {
          ctx.shadowColor = "#00000071";
          ctx.shadowBlur = 12;
        }
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fill();
        // Overlay feedback color if needed
        if (feedbackColor) {
          ctx.globalAlpha = feedbackAlpha;
          // Create a radial gradient for a blurry, bubble-like shield
          const r = player.radius;
          const grad = ctx.createRadialGradient(player.x, player.y, r * 0.4, player.x, player.y, r);
          grad.addColorStop(0, feedbackColor + '55');
          grad.addColorStop(0.5, feedbackColor + '66');
          grad.addColorStop(1, feedbackColor + '00');
          ctx.save();
          ctx.shadowColor = feedbackColor;
          ctx.shadowBlur = 32;
          ctx.beginPath();
          ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
          ctx.globalAlpha = 1.0;
        }
        ctx.restore();
      }
      drawPlayerBars();
      // (Removed health number on player)

      enemies.forEach(e => {
                // Draw boss health bar above boss
                if (e.type === "gruntBoss" || e.type === "bruteBoss" || e.type === "slingerBoss") {
                  const barWidth = 80;
                  const barHeight = 8;
                  const barX = e.x - barWidth / 2;
                  const barY = e.y - e.radius - 24;
                  if (typeof e.maxHealth !== "number" || e.maxHealth < e.health) {
                    e.maxHealth = Math.max(1, e.health);
                  }
                  const bossHealthRatio = Math.max(0, Math.min(1, e.health / Math.max(1, e.maxHealth)));
                  ctx.save();
                  ctx.globalAlpha = 0.92;
                  ctx.lineWidth = 3;
                  ctx.strokeStyle = "#222";
                  ctx.fillStyle = e.type === "bruteBoss" ? "#ff6a00" : (e.type === "slingerBoss" ? "#ff9f1a" : "#e00000");
                  ctx.beginPath();
                  ctx.rect(barX, barY, barWidth, barHeight);
                  ctx.stroke();
                  ctx.fillRect(barX, barY, barWidth * bossHealthRatio, barHeight);
                  // Draw boss label
                  ctx.font = "bold 13px sans-serif";
                  ctx.fillStyle = "#fff";
                  ctx.textAlign = "center";
                  ctx.textBaseline = "bottom";
                  ctx.fillText(e.type === "bruteBoss" ? "Brute Major" : (e.type === "slingerBoss" ? "Slinger Major" : "Shard Major"), e.x, barY - 2);
                  ctx.restore();
                }
        // Hover effect (visual only) for slinger and stalker
        let hoverX = e.x;
        let hoverY = e.y;
        if (e.type === "slinger" || e.type === "slingerBoss" || e.type === "stalker" || e.type === "beamer" || e.type === "shielder") {
          if (typeof e.hoverOffset === "undefined") e.hoverOffset = Math.random() * Math.PI * 2;
          e.hoverOffset += 0.04;
          const hoverRadius = e.type === "stalker" ? 2.8 : (e.type === "beamer" ? 2.5 : (e.type === "shielder" ? 2.3 : 2.2));
          hoverX = e.x + Math.cos(e.hoverOffset) * hoverRadius;
          hoverY = e.y + Math.sin(e.hoverOffset * 0.93) * (hoverRadius * 0.58);
        }

        // Draw fading shadows from each light
        ctx.save();
        ctx.translate(e.x, e.y);
        lights.forEach(light => {
          const lx = light.x + light.w / 2;
          const ly = light.y + light.h / 2;
          const dx = e.x - lx;
          const dy = e.y - ly;
          const dist = Math.hypot(dx, dy);
          const fadeStart = Math.max(light.w, light.h) * 1.2;
          const fadeEnd = Math.max(light.w, light.h) * 6.5;
          let shadowAlpha = 0;
          if (dist < fadeStart) {
            shadowAlpha = 0.38;
          } else if (dist < fadeEnd) {
            shadowAlpha = 0.38 * (1 - (dist - fadeStart) / (fadeEnd - fadeStart));
          }
          if (shadowAlpha > 0.01) {
            const dirX = dx / dist;
            const dirY = dy / dist;
            const shadowOffset = (e.radius > 20 ? 1.5 : 1.2) * e.radius;
            const shadowX = dirX * shadowOffset;
            const shadowY = dirY * shadowOffset;
            // Make brute shadow larger from lights
            let shadowLength, shadowWidth;
            if (e.type === "brute" || e.type === "bruteBoss") {
              shadowLength = e.radius * 2.7;
              shadowWidth = e.radius * 1.1;
            } else {
              shadowLength = (e.radius > 20 ? 2.8 : 2.2) * e.radius;
              shadowWidth = e.radius * 0.7;
            }
            const shadowAngle = Math.atan2(dirY, dirX);
            ctx.save();
            ctx.globalAlpha = shadowAlpha * 0.58;
            ctx.fillStyle = "rgba(0,0,0,0.38)";
            ctx.translate(shadowX, shadowY);
            ctx.rotate(shadowAngle);
            ctx.beginPath();
            ctx.ellipse(0, 0, shadowLength, shadowWidth, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });
        ctx.restore();

        if (e.shielded) {
          ctx.save();
          const shieldBaseX = hoverX;
          const shieldBaseY = hoverY;
          const shieldRadius = e.radius + 6;
          ctx.globalAlpha = 0.28;
          ctx.fillStyle = "rgba(125, 255, 230, 0.38)";
          ctx.shadowColor = "#7dffe6";
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(shieldBaseX, shieldBaseY, shieldRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.82;
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#d8fff4";
          ctx.beginPath();
          ctx.arc(shieldBaseX, shieldBaseY, shieldRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        // Removed shadowColor and shadowBlur for grunt
        ctx.beginPath();
        ctx.arc(e.x, e.y, (e.radius > 20 ? 40 : 20), 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 80, 80, 0.0)";
        ctx.lineWidth = 1; ctx.stroke();
        // Draw magenta grunt with grunt image
        if (e.type === "grunt" && e.color === "magenta") {
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(e.spinAngle);
          ctx.drawImage(gruntImg, -e.radius * 2, -e.radius * 2, e.radius * 4, e.radius * 4);
          ctx.restore();
        // Draw grunt boss minor (Grunt Heavy) with grunt heavy image
        } else if (e.type === "gruntBossMinor") {
          ctx.save();
          ctx.translate(e.x, e.y);
          // No rotation for grunt heavy
          ctx.drawImage(gruntHeavyImg, -e.radius * 2, -e.radius * 2, e.radius * 4, e.radius * 4);
          ctx.restore();
        } else if (e.type === "gruntBoss") {
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(0); // No rotation for grunt boss
          ctx.drawImage(gruntBossImg, -e.radius * 2, -e.radius * 2, e.radius * 4, e.radius * 4);
          ctx.restore();
        } else if (e.type === "brute" || e.type === "bruteBoss") {
          ctx.save();
          ctx.translate(e.x, e.y);
          const bruteSprite = e.type === "bruteBoss" ? bruteBossImg : bruteImg;
          ctx.drawImage(bruteSprite, -e.radius * 2, -e.radius * 2, e.radius * 4, e.radius * 4);
          ctx.restore();
          // Draw nova circle with cue
          ctx.save();
          ctx.globalAlpha = 0.32;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.novaRadius || (e.radius + 8), 0, Math.PI * 2);
          if (e.type === "bruteBoss") {
            ctx.strokeStyle = e.novaCue ? "#ff8a00" : "#ffaa00";
            ctx.shadowColor = e.novaCue ? "#ff8a00" : "#ffaa00";
            ctx.shadowBlur = e.novaCue ? 22 : 10;
          } else {
            ctx.strokeStyle = e.novaCue ? "#fff200" : "#ff6600";
            ctx.shadowColor = e.novaCue ? "#fff200" : "#ff6600";
            ctx.shadowBlur = e.novaCue ? 24 : 12;
          }
          ctx.stroke();
          ctx.restore();
        } else if (e.type === "slinger" || e.type === "slingerBoss") {
          ctx.save();
          ctx.translate(hoverX, hoverY);
          if (e.type === "slingerBoss") {
            ctx.drawImage(slingerBossImg, -e.radius * 2, -e.radius * 2, e.radius * 4, e.radius * 4);
          } else {
            ctx.drawImage(slingerImg, -e.radius * 2, -e.radius * 2, e.radius * 4, e.radius * 4);
          }
          ctx.restore();
        } else if (e.type === "kamikaze") {
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.drawImage(kamikazeImg, -e.radius * 2, -e.radius * 2, e.radius * 4, e.radius * 4);
          ctx.restore();
        } else if (e.type === "stalker") {
          ctx.save();
          ctx.translate(hoverX, hoverY);
          const stalkerAlpha = typeof e.stalkerAlpha === "number" ? e.stalkerAlpha : 0.9;
          ctx.globalAlpha = stalkerAlpha;
          if (stalkerImg && stalkerImg.complete && stalkerImg.naturalWidth > 0) {
            const drawScale = 4.1;
            ctx.drawImage(stalkerImg, -e.radius * drawScale / 2, -e.radius * drawScale / 2, e.radius * drawScale, e.radius * drawScale);
          } else {
            ctx.fillStyle = "#66e8ff";
            ctx.beginPath();
            ctx.arc(0, 0, e.radius * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = Math.max(0.1, stalkerAlpha * 0.85);
            ctx.strokeStyle = "#b7f6ff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, e.radius + 3, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        } else if (e.type === "beamer") {
          ctx.save();
          ctx.translate(hoverX, hoverY);
          const beamGlow = typeof e.beamGlow === "number" ? e.beamGlow : 0.12;
          const beamerAlpha = typeof e.beamerAlpha === "number" ? e.beamerAlpha : 1;
          const beamerFacingAngle = typeof e.beamerFacingAngle === "number" ? e.beamerFacingAngle : Math.atan2(player.y - hoverY, player.x - hoverX);
          const castAlpha = e.beamCastTimer > 0 ? 0.78 : 1;
          ctx.globalAlpha = castAlpha * beamerAlpha;
          ctx.rotate(beamerFacingAngle);
          if (beamerImg && beamerImg.complete && beamerImg.naturalWidth > 0) {
            const drawScale = 4.2;
            ctx.drawImage(beamerImg, -e.radius * drawScale / 2, -e.radius * drawScale / 2, e.radius * drawScale, e.radius * drawScale);
          } else {
            ctx.fillStyle = "#5ecfff";
            ctx.beginPath();
            ctx.arc(0, 0, e.radius * 0.85, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#d6f3ff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, e.radius + 2, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();

          if ((e.beamCastTimer > 0 || e.beamActiveTimer > 0) && typeof e.beamAngle === "number") {
            const beamStartX = hoverX;
            const beamStartY = hoverY;
            const beamLength = typeof e.beamLength === "number" ? e.beamLength : 460;
            const isActiveBeam = e.beamActiveTimer > 0;
            const beamHeadDist = isActiveBeam
              ? Math.max(0, Math.min(beamLength, typeof e.beamTravelHead === "number" ? e.beamTravelHead : beamLength))
              : beamLength;
            const beamTailDist = isActiveBeam
              ? Math.max(0, Math.min(beamHeadDist, typeof e.beamTravelTail === "number" ? e.beamTravelTail : 0))
              : 0;
            const beamSegStartX = beamStartX + Math.cos(e.beamAngle) * beamTailDist;
            const beamSegStartY = beamStartY + Math.sin(e.beamAngle) * beamTailDist;
            const beamSegEndX = beamStartX + Math.cos(e.beamAngle) * beamHeadDist;
            const beamSegEndY = beamStartY + Math.sin(e.beamAngle) * beamHeadDist;
            const beamAlpha = (isActiveBeam ? 0.75 : 0.5) * (typeof e.beamerAlpha === "number" ? e.beamerAlpha : 1);
            const beamWidth = e.beamActiveTimer > 0 ? 5.5 : 1.6;
            const beamLineColor = isActiveBeam ? "#6ad3ff" : "#ff2222";
            const beamShadowColor = isActiveBeam ? "#4ecbff" : "#ff2c2c";
            const beamCoreColor = isActiveBeam ? "#d4f5ff" : "#ffd0d0";
            const beamTipColor = isActiveBeam ? "#dcf8ff" : "#ffdede";

            ctx.save();
            ctx.globalAlpha = beamAlpha;
            ctx.strokeStyle = beamLineColor;
            ctx.lineWidth = beamWidth;
            ctx.shadowColor = beamShadowColor;
            ctx.shadowBlur = isActiveBeam ? 20 : 14;
            ctx.beginPath();
            ctx.moveTo(beamSegStartX, beamSegStartY);
            ctx.lineTo(beamSegEndX, beamSegEndY);
            ctx.stroke();

            if (isActiveBeam) {
              ctx.globalAlpha = 0.75;
              ctx.lineWidth = 2;
              ctx.strokeStyle = beamCoreColor;
              ctx.beginPath();
              ctx.moveTo(beamSegStartX, beamSegStartY);
              ctx.lineTo(beamSegEndX, beamSegEndY);
              ctx.stroke();

              ctx.globalAlpha = 0.88;
              ctx.fillStyle = beamTipColor;
              ctx.beginPath();
              ctx.arc(beamSegEndX, beamSegEndY, 3.6, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        } else if (e.type === "shielder") {
          ctx.save();
          ctx.translate(hoverX, hoverY);
          const shielderAlpha = typeof e.shielderAlpha === "number" ? e.shielderAlpha : 1;
          ctx.globalAlpha = shielderAlpha;
          if (shielderImg && shielderImg.complete && shielderImg.naturalWidth > 0) {
            const drawScale = 4.0;
            ctx.drawImage(shielderImg, -e.radius * drawScale / 2, -e.radius * drawScale / 2, e.radius * drawScale, e.radius * drawScale);
          } else {
            ctx.shadowColor = "#78ffd6";
            ctx.shadowBlur = 12;
            ctx.fillStyle = "#4be6c3";
            ctx.beginPath();
            ctx.arc(0, 0, e.radius * 0.82, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#d7fff2";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, e.radius + 2.5, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();

          const linkedAllies = Array.isArray(e.activeShieldTargets)
            ? e.activeShieldTargets.filter(other => other && other.health > 0)
            : [];
          if (linkedAllies.length > 0) {
            ctx.save();
            for (const ally of linkedAllies) {
              const allyHoverY = (typeof ally.hoverOffset === "number")
                ? ally.y + Math.sin(ally.hoverOffset * 0.93) * 0.8
                : ally.y;
              const linkAngle = Math.atan2(allyHoverY - hoverY, ally.x - hoverX);
              const linkStartX = hoverX + Math.cos(linkAngle) * (e.radius + 4);
              const linkStartY = hoverY + Math.sin(linkAngle) * (e.radius + 4);
              ctx.globalAlpha = 0.55;
              ctx.strokeStyle = "#7dffe6";
              ctx.lineWidth = 2.2;
              ctx.shadowColor = "#7dffe6";
              ctx.shadowBlur = 10;
              ctx.beginPath();
              ctx.moveTo(linkStartX, linkStartY);
              ctx.lineTo(ally.x, allyHoverY);
              ctx.stroke();
            }
            ctx.restore();
          }
        } else {
          ctx.fillStyle = e.color;
          ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
          // Draw health number for other enemies
          ctx.fillStyle = "white";
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(Math.ceil(e.health), e.x, e.y);
        }
        ctx.restore();
      });

      //laser, enemyHit, levelUp, xpDrop, slingerDrop, bruteDrop, healthDrop, enemyDeath, 
      drawParticlesOfType("laser")
      drawParticlesOfType("enemyHit")
      drawParticlesOfType("levelUp")

      drawProjectiles();




      //-======================HUD AND STAT ALLOCATION======================-
      // Draw HUD overlay image after stat allocation boxes
      if (hudImg.complete && hudImg.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.drawImage(hudImg, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      drawHUD();
      drawProtocolWarnings();
      // Draw debug text on top of HUD and overlays
      if (window.debugFramerateEnabled) {
        if (typeof particles !== 'undefined' && typeof mines !== 'undefined' && typeof enemies !== 'undefined') {
          ctx.save();
          ctx.font = 'bold 15px monospace';
          ctx.fillStyle = '#00eaff';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          const fps = (1 / delta).toFixed(1);
          const debugText =
            'FrameRate (FPS): ' + fps +
            '\nParticles: ' + particles.length +
            ' | Mines: ' + mines.length +
            ' | Enemies: ' + enemies.length;
          const lines = debugText.split('\n');
          lines.forEach((line, i) => {
            ctx.fillText(line, 12, 12 + i * 20);
          });
          ctx.restore();
        }
      }
      
      // Update hovered protocol based on mouse position
      hoveredProtocol = -1;
      if (showStats && window._protocolSelectorBoxes) {
        const boxes = window._protocolSelectorBoxes;
        for (let box of boxes) {
          if (
            mouseX >= box.x &&
            mouseX <= box.x + box.w &&
            mouseY >= box.y &&
            mouseY <= box.y + box.h
          ) {
            hoveredProtocol = box.index;
            break;
          }
        }
      }
      
      if (gameStarted && !gameOver && !followMouse) {
        ctx.save();
        ctx.fillStyle = "white";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Hold RIGHT-CLICK to play", canvas.width / 2, canvas.height / 2 - 80);
        ctx.restore();
      }

      // Draw protocol tooltip last so it is always on top
      if (hoveredProtocol >= 0) {
        const hoveredBox = (window._protocolSelectorBoxes || []).find(box => box.index === hoveredProtocol);
        if (hoveredBox && hoveredBox.name) {
          // ...existing tooltip code (see previous tooltip block)...
          // This ensures tooltip is drawn after all overlays and text
        }
      }
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "white";
      
      
      

      if (player.health <= 0 && !gameOver) {
        gameOver = true;
      }

      if (gameOver) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "red";
        ctx.font = "bold 40px sans-serif";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
        
        // Initialize game over countdown timer on first render
        if (typeof window._gameOverTime === "undefined") {
          window._gameOverTime = Date.now();
        }
        
        // Calculate elapsed time and remaining seconds
        const elapsedSeconds = (Date.now() - window._gameOverTime) / 1000;
        const remainingSeconds = Math.max(0, 5 - Math.floor(elapsedSeconds));
        
        const editorTimerExpired = window._editorSessionActive && !window._playerUsedContinue && elapsedSeconds >= 5;

        // Second death, or editor first-death timer expired
        if (window._playerUsedContinue || editorTimerExpired) {
          // Second death: editor session stays in game-over state
          ctx.font = "bold 20px sans-serif";
          ctx.fillStyle = "white";
          if (window._editorSessionActive) {
            ctx.fillText("Press O to open Editor and spawn a wave", canvas.width / 2, canvas.height / 2 + 60);
          } else {
            ctx.fillText("Click to return to Menu", canvas.width / 2, canvas.height / 2 + 60);
          }
        } else {
          // First death: show continue option with timer
          ctx.font = "bold 20px sans-serif";
          ctx.fillStyle = "white";
          ctx.fillText(`Click to Continue in ${remainingSeconds} seconds`, canvas.width / 2, canvas.height / 2 + 60);
        }

        ctx.font = "bold 22px sans-serif";
        ctx.fillStyle = "#00ffdd";
        ctx.fillText(`Collected Bytes: ${runCollectedBytes}`, canvas.width / 2, canvas.height / 2 + 96);
        
        // Auto-return to menu after 5 seconds (only on first death, outside editor sessions)
        if (!window._editorSessionActive && !window._playerUsedContinue && remainingSeconds === 0 && elapsedSeconds >= 5) {
          finalizeRunBytes();
          showMenuScreen = true;
          window._playMenuAmbienceOnShowMenu = true;
          playMenuAmbience();
          showMenu();
          gameOver = false;
          window._gameOverTime = undefined;
          followMouse = false;
        }
        
        requestAnimationFrame(gameLoop);
        return;
      }
    }

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

}
