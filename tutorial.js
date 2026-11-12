/**
 * tutorial.js — First-time player tutorial for Sentinel
 *
 * Guides the player through: Main Menu → Difficulty → Wave Selection → Protocol Database
 * Only runs once; completion is stored in localStorage under a versioned key.
 */
(function () {
  'use strict';

  const TUTORIAL_TEST_MODE = false; // set true to always run tutorial on refresh while testing
  const TUTORIAL_VERSION = 2;
  const TUTORIAL_STORAGE_KEY = `sentinel_tutorialDone_v${TUTORIAL_VERSION}`;

  if (!TUTORIAL_TEST_MODE && localStorage.getItem(TUTORIAL_STORAGE_KEY)) return;

  // ─── Inject tutorial CSS ───────────────────────────────────────────────────
  const styleEl = document.createElement('style');
  styleEl.id = 'tutorial-styles';
  styleEl.textContent = `
    @keyframes tut-btn-pulse {
      0%,  100% { outline-color: rgba(0,217,255,0.35); box-shadow: 0 0 16px 3px rgba(0,217,255,0.3); }
      50%        { outline-color: rgba(0,217,255,1); box-shadow: 0 0 16px 3px rgba(0,217,255,0.85); }
    }
    .tut-pulse {
      animation: tut-btn-pulse 1s ease-in-out infinite !important;
      outline: 2px solid rgba(0,217,255,0.35) !important;
      outline-offset: 3px;
      transform: none !important;
      transition: none !important;
      will-change: auto !important;
    }

    @keyframes tut-card-outline {
      0%,  100% { outline: 2px solid rgba(0,217,255,0.35); outline-offset: 2px; }
      50%        { outline: 2px solid rgba(0,217,255,0.95); outline-offset: 2px; }
    }
    .tut-card {
      animation: tut-card-outline 1.2s ease-in-out infinite !important;
      transform: none !important;
      transition: none !important;
    }

    @keyframes tut-text-glow {
      0%,  100% { color: #aaf6ff; text-shadow: none; }
      50%        { color: #00d9ff; text-shadow: 0 0 10px rgba(0,217,255,0.7); }
    }
    .tut-text {
      animation: tut-text-glow 1.2s ease-in-out infinite !important;
      font-weight: bold !important;
    }
    @keyframes tut-upgrade-pulse {
      0%,  100% { outline: 2px solid rgba(0,217,255,0.35); outline-offset: 2px; }
      50%        { outline: 2px solid rgba(0,217,255,1);    outline-offset: 2px; }
    }
    .tut-upgrade-pulse {
      animation: tut-upgrade-pulse 1s ease-in-out infinite !important;
      transform: none !important;
      transition: none !important;
      will-change: auto !important;
    }
    .tut-banner {
      position: fixed;
      top: 128px;
      left: 50%;
      transform: translateX(-50%);
      background: transparent;
      color: #00d9ff;
      border: 0;
      box-shadow: none;
      text-shadow: 0 0 10px rgba(0,217,255,0.8);
      font-family: sans-serif;
      font-size: 14px;
      font-weight: bold;
      padding: 0 16px;
      height: 24px;
      line-height: 24px;
      border-radius: 0;
      z-index: 10000;
      text-align: center;
      white-space: nowrap;
      pointer-events: none;
    }
    .tut-modal-overlay {
      position: fixed;
      left: 50%;
      top: calc(50% + var(--game-display-offset-y, 0px));
      width: var(--game-display-width, 804px);
      height: var(--game-display-height, 498px);
      transform: translate(-50%, -50%) scale(var(--game-stage-scale, 1));
      transform-origin: center;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow: auto;
      background: transparent;
      z-index: 11000;
    }
    .tut-modal-panel {
      width: min(640px, 100%);
      max-height: 100%;
      overflow-y: auto;
      box-sizing: border-box;
      padding: clamp(16px, 2.4vw, 28px);
      color: #c8ffff;
      font-family: sans-serif;
      background: linear-gradient(145deg, rgba(5, 28, 43, 0.98), rgba(2, 13, 24, 0.98));
      border: 1px solid rgba(0, 217, 255, 0.7);
      border-radius: 6px;
      box-shadow: 0 0 24px rgba(0, 217, 255, 0.22), inset 0 0 20px rgba(0, 217, 255, 0.06);
    }
    .tut-modal-title {
      margin: 0 0 14px;
      color: #eaffff;
      font-size: clamp(1.1rem, 2.2vw, 1.5rem);
      letter-spacing: 0.08em;
      text-align: center;
      text-shadow: 0 0 14px rgba(0, 217, 255, 0.65);
    }
    .tut-modal-message {
      color: #aaf6ff;
      font-size: 1.05rem;
      line-height: 1.5;
      white-space: pre-line;
      text-shadow: 0 1px 5px rgba(0, 0, 0, 0.95), 0 0 8px rgba(0, 217, 255, 0.28);
    }
    .tut-modal-button {
      display: block;
      margin: 20px auto 0;
      padding: 0.6rem 1.2rem;
      color: #8cecff;
      background: linear-gradient(180deg, rgba(0, 42, 56, 0.95), rgba(0, 20, 30, 0.96));
      border: 1px solid rgba(0, 217, 255, 0.72);
      cursor: pointer;
      font: inherit;
      font-weight: bold;
    }
    .tut-modal-button:hover {
      background: rgba(0, 45, 58, 0.94);
    }
    .tut-modal-button:focus-visible {
      outline: 2px solid #00d9ff;
      outline-offset: 3px;
    }
  `;
  document.head.appendChild(styleEl);

  // ─── State ─────────────────────────────────────────────────────────────────
  let stage = 'mainMenu'; // updated whenever a known overlay appears
  let hadFirstRun = false; // true after the first Start Run click — skip step 4 on retries

  // ─── Body MutationObserver ─────────────────────────────────────────────────
  const bodyObserver = new MutationObserver((mutations) => {
    if (stage === 'done') return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        switch (node.id) {
          case 'menuOverlay':
            if (stage === 'step7' || stage === 'step8') {
              applyStep7(node);
            } else if (stage === 'playing') {
              // Run ended — check if both gameplay steps were completed
              if (step5Done && step6Done) {
                stage = 'step7';
                applyStep7(node);
              } else {
                // Steps incomplete — clean up and restart from step 1
                window._tutDrawOnStats = null;
                window._tutDrawOnProtocols = null;
                removeBanner('tut-levelup-banner');
                removeBanner('tut-protocol-banner');
                step5Done = false;
                step6Done = false;
                stage = 'mainMenu';
                applyMainMenu(node);
              }
            } else {
              stage = 'mainMenu';
              applyMainMenu(node);
            }
            break;
          case 'difficultyOverlay':
            stage = 'difficulty';
            applyDifficulty(node);
            break;
          case 'waveSelectionOverlay':
            stage = 'wave';
            applyWave(node);
            break;
          case 'starterProtocolOverlay':
            if (stage === 'step8') {
              applyStep8(node);
            } else if (hadFirstRun) {
              // Already did step 4 once — go straight to playing
              stage = 'playing';
            } else {
              stage = 'protocol';
              applyProtocol(node);
            }
            break;
        }
      }
    }
  });

  bodyObserver.observe(document.body, { childList: true });

  // ─── Helper ────────────────────────────────────────────────────────────────
  function dimBtn(btn) {
    btn.style.opacity = '0.3';
    btn.style.pointerEvents = 'none';
  }

  function showTutorialModal(title, message, pauseGame = false, onClose = null, buttonLabel = 'Continue') {
    const pauseBridge = window.SentinelEditorBridge;
    if (pauseGame && pauseBridge) pauseBridge.setTutorialModalPause(true);

    const overlay = document.createElement('div');
    overlay.className = 'tut-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'tut-modal-title');

    const panel = document.createElement('div');
    panel.className = 'tut-modal-panel';
    overlay.appendChild(panel);

    const titleEl = document.createElement('h2');
    titleEl.className = 'tut-modal-title';
    titleEl.id = 'tut-modal-title';
    titleEl.textContent = title;
    panel.appendChild(titleEl);

    const messageEl = document.createElement('div');
    messageEl.className = 'tut-modal-message';
    messageEl.textContent = message;
    panel.appendChild(messageEl);

    const continueBtn = document.createElement('button');
    continueBtn.type = 'button';
    continueBtn.className = 'tut-modal-button';
    continueBtn.textContent = buttonLabel;
    panel.appendChild(continueBtn);

    const close = () => {
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      if (pauseGame && pauseBridge) pauseBridge.setTutorialModalPause(false);
      if (typeof onClose === 'function') onClose();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };

    continueBtn.addEventListener('click', close, { once: true });
    document.addEventListener('keydown', onKeyDown);
    document.body.appendChild(overlay);
    continueBtn.focus();
  }

  // ─── Stage 1 · Main Menu ───────────────────────────────────────────────────
  function applyMainMenu(overlay) {
    overlay.querySelectorAll('button').forEach((btn) => {
      if (btn.textContent.trim() === 'Play') {
        btn.classList.add('tut-pulse');
      } else {
        dimBtn(btn);
      }
    });
  }

  // ─── Stage 2 · Difficulty ──────────────────────────────────────────────────
  function applyDifficulty(overlay) {
    overlay.querySelectorAll('button').forEach((btn) => {
      const t = btn.textContent.trim();
      if (t === 'Normal') {
        btn.classList.add('tut-pulse');
      } else if (t === 'Hardcore' || t === 'Apocalypse') {
        dimBtn(btn);
      }
      // '← Back' stays interactive
    });
  }

  // ─── Stage 3 · Wave Selection ──────────────────────────────────────────────
  function applyWave(overlay) {
    overlay.querySelectorAll('button').forEach((btn) => {
      const t = btn.textContent.trim();
      if (t === 'Wave 1') {
        btn.classList.add('tut-pulse');
        // Ensure wave 1 is fully clickable regardless of game state
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
        btn.style.cursor = 'pointer';
      } else if (t !== '← Back') {
        dimBtn(btn);
      }
    });
  }

  // ─── Stage 4 · Protocol Database ──────────────────────────────────────────
  function applyProtocol(overlay) {
    showTutorialModal(
      'WHAT ARE PROTOCOLS?',
      'Protocols are upgrades that change your Sentinel’s stats and playstyle. Collect protocol orbs during runs to discover more protocols. Choose 2 discovered protocols here to start each run.'
    );

    // Pulse the subtitle ("Choose up to 2 discovered protocols…")
    for (const el of overlay.querySelectorAll('div')) {
      if (el.children.length === 0 &&
          el.textContent.trim().startsWith('Choose up to 2')) {
        el.classList.add('tut-text');
        break;
      }
    }

    // Highlight selectable protocol cards, not their upgrade controls
    const content = overlay.querySelector('.scrollbar-themed');
    if (content) {
      content.querySelectorAll('.protocol-database-card').forEach((card) => {
        card.classList.add('tut-card');
      });
    }

    // Find the "Selected: X/2" counter and the "Start Run" button
    let selectionCountEl = null;
    for (const el of overlay.querySelectorAll('div')) {
      if (el.children.length === 0 && /^Selected:\s*\d+\/2$/.test(el.textContent.trim())) {
        selectionCountEl = el;
        break;
      }
    }

    let startBtn = null;
    for (const btn of overlay.querySelectorAll('button')) {
      if (btn.textContent.trim() === 'Start Run') {
        startBtn = btn;
        break;
      }
    }

    const setStartButtonState = (enabled) => {
      if (!startBtn) return;
      if (enabled) {
        startBtn.classList.add('tut-pulse');
        startBtn.style.opacity = '1';
        startBtn.style.pointerEvents = 'auto';
        startBtn.style.cursor = 'pointer';
        startBtn.disabled = false;
      } else {
        startBtn.classList.remove('tut-pulse');
        startBtn.style.opacity = '0.3';
        startBtn.style.pointerEvents = 'none';
        startBtn.style.cursor = 'default';
        startBtn.disabled = true;
      }
    };

    // Pulse and enable Start Run only once at least 2 protocols are selected
    if (selectionCountEl && startBtn) {
      const updateStartState = () => {
        const m = selectionCountEl.textContent.match(/Selected:\s*(\d+)/);
        const count = m ? parseInt(m[1], 10) : 0;
        setStartButtonState(count >= 2);
        // Remove card highlights once 2 are selected
        if (content) {
          content.querySelectorAll('.protocol-database-card').forEach((card) => {
            if (count >= 2) card.classList.remove('tut-card');
            else card.classList.add('tut-card');
          });
        }
      };

      updateStartState();
      const countObserver = new MutationObserver(updateStartState);
      countObserver.observe(selectionCountEl, { childList: true, characterData: true, subtree: true });
    }

    // Transition to 'playing' stage when Start Run is clicked (steps 5 & 6 still pending)
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        stage = 'playing';
        hadFirstRun = true;
        // Observer stays connected to catch menu return
      }, { once: true });
    }
  }

  // ─── Completion ────────────────────────────────────────────────────────────
  function completeTutorial() {
    stage = 'done';
    localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
    bodyObserver.disconnect();
    window._tutDrawOnStats = null;
  }

  // ─── Banner helpers — injected into the game's protocolWarnings queue ──────
  function showBanner(message, id) {
    // Remove any existing banner with this id first
    removeBanner(id);
    if (window._tutPersistentBanner === undefined) window._tutPersistentBanner = null;
    // Push into the game's warning queue with Infinity timer (never fades)
    const entry = { text: message, color: '#00d9ff', timer: Infinity, _tutId: id, transparent: true };
    const warnings = window._tutProtocolWarningsRef;
    if (warnings) {
      warnings.push(entry);
      while (warnings.length > 4) warnings.shift();
    }
  }

  function removeBanner(id) {
    const warnings = window._tutProtocolWarningsRef;
    if (!warnings) return;
    for (let i = warnings.length - 1; i >= 0; i--) {
      if (warnings[i]._tutId === id) warnings.splice(i, 1);
    }
  }

  // ─── Stage 5 · Gameplay – Stat panel draw hook ────────────────────────────
  let step5Done = false;
  let step6Done = false;

  function checkBothDone() {
    if (step5Done && step6Done) transitionToStep7();
  }

  function transitionToStep7() {
    stage = 'step7';
    // Observer already connected — no need to re-observe
  }

  function installStatHighlight() {
    window._tutDrawOnStats = function (ctx, boxes, pts, panelX, panelY, panelW) {
      if (pts <= 0) {
        window._tutDrawOnStats = null;
        removeBanner('tut-levelup-banner');
        step5Done = true;
        checkBothDone();
        return;
      }
      const pulse = 0.35 + 0.55 * Math.abs(Math.sin(Date.now() / 400));
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.shadowColor = '#00d9ff';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#00d9ff';
      ctx.lineWidth = 2;
      // Each + button only (no allocation points row)
      for (const box of boxes) {
        ctx.strokeRect(box.x - 4, box.y - 4, box.w + 8, box.h + 8);
      }
      ctx.restore();
    };
  }

  window.addEventListener('tut:firstLevelUp', () => {
    if (stage === 'done') return;
    showBanner('Level up! Release Spacebar or right mouse button to open the Stats menu', 'tut-levelup-banner');
    showTutorialModal(
      'LEVEL UP!',
      'You have Power Allocation Points to spend. Click OK to open the paused Stats menu, then use the highlighted + buttons to upgrade your stats. During play, release Spacebar or the right mouse button to open this menu.',
      true,
      () => window.SentinelEditorBridge.openTutorialStatsMenu(),
      'OK'
    );
    // Wait until stat panel auto-opens (boxes populated), then install highlight
    const poll = setInterval(() => {
      if (window._statPlusButtonBoxes && window._statPlusButtonBoxes.length > 0) {
        clearInterval(poll);
        installStatHighlight();
      }
    }, 150);
  });

  // ─── Stage 6 · Gameplay – Protocol Pickup + Activation ────────────────────
  function installProtocolHighlight(pickedUpName) {
    showBanner('New Protocol discovered! Release Spacebar or right mouse button to open the Stats menu', 'tut-protocol-banner');
    window._tutDrawOnProtocols = function (ctx, boxes, panelX, panelY, panelW, panelH, contentY, contentH) {
      // Stop once the picked-up protocol is activated
      if (ProtocolSystem.activeProtocols && ProtocolSystem.activeProtocols.includes(pickedUpName)) {
        window._tutDrawOnProtocols = null;
        removeBanner('tut-protocol-banner');
        step6Done = true;
        checkBothDone();
        return;
      }
      // Pulse outline around the whole protocol panel
      const pulse = 0.35 + 0.55 * Math.abs(Math.sin(Date.now() / 500));
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.shadowColor = '#00d9ff';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#00d9ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(panelX + 2, panelY + 2, panelW - 4, panelH - 4);
      // Pulse discovered (non-active) card for the picked-up protocol
      for (const box of (boxes || [])) {
        if (box.name === pickedUpName && box.discovered) {
          ctx.lineWidth = 2;
          ctx.strokeRect(box.x - 4, box.y - 4, box.w + 8, box.h + 8);
        }
      }
      ctx.restore();
    };
  }

  window.addEventListener('tut:firstProtocolPickup', () => {
    if (stage === 'done') return;
    const pickedName = window._tutLastPickedProtocol || '';
    // Auto-scroll the protocol list to bring that card into view
    if (pickedName) window._tutScrollToProtocol = pickedName;
    installProtocolHighlight(pickedName);
    showTutorialModal(
      'NEW PROTOCOL ACQUIRED',
      'Select OK to open the Stats menu, then choose the highlighted protocol in Active Protocols to activate it. You can have up to 6 active protocols at once. Protocols discovered during a run are added to your Database and can be selected as starters in future runs.',
      true,
      () => window.SentinelEditorBridge.openTutorialStatsMenu(),
      'OK'
    );
  });

  window.addEventListener('tut:firstProtocolActivated', () => {
    // Fallback: if highlight was never installed (e.g. picked up while panel was closed)
    if (stage === 'done') return;
    if (!step6Done) {
      window._tutDrawOnProtocols = null;
      removeBanner('tut-protocol-banner');
      step6Done = true;
      checkBothDone();
    }
  });

  // ─── Stage 7 · Return to main menu after run ───────────────────────────────
  function applyStep7(overlay) {
    overlay.querySelectorAll('button').forEach((btn) => {
      if (btn.textContent.trim() === 'Protocols') {
        btn.classList.add('tut-pulse');
        // capture:true ensures this fires BEFORE the game's listener creates the overlay
        btn.addEventListener('click', () => { stage = 'step8'; }, { once: true, capture: true });
      } else {
        dimBtn(btn);
      }
    });
  }

  // ─── Stage 8 · Protocol Database upgrade ──────────────────────────────────
  function applyStep8(overlay) {
    showTutorialModal(
      'UPGRADE YOUR PROTOCOLS',
      'Spend collected data to upgrade discovered protocols and improve their effects. You can downgrade an upgraded protocol; this refunds the full KB cost of its most recent upgrade, so you can change your mind without losing data.'
    );
    showBanner('Click an Upgrade button on a discovered protocol to permanently improve it!', 'tut-upgrade-banner');
    window._tutSubtitleForce = true; // keep subtitle visible during step 8
    // Style the subtitle for high visibility
    const subtitleEl = overlay.querySelector('[data-protocol-subtitle]');
    if (subtitleEl) {
      subtitleEl.textContent = 'Upgrade a discovered protocol to permanently improve its power.';
      subtitleEl.style.visibility = 'visible'; // force visible even if refreshCount already hid it
      subtitleEl.style.color = '#00d9ff';
      subtitleEl.style.fontSize = '1rem';
      subtitleEl.style.fontWeight = 'bold';
      subtitleEl.style.textShadow = '0 0 8px rgba(0,217,255,0.7)';
    }
    // Highlight only upgrade buttons using outline (no bleed onto card)
    overlay.querySelectorAll('.upgrade-btn').forEach((btn) => {
      if (btn.disabled || btn.textContent.trim() === 'MAX') return;
      btn.classList.add('tut-upgrade-pulse');
    });
    // Dim Back and Play/Start Run buttons — must upgrade to proceed
    overlay.querySelectorAll('button').forEach((btn) => {
      const t = btn.textContent.trim();
      if (t === 'Back' || t === 'Play' || t === 'Start Run') dimBtn(btn);
    });
  }

  window.addEventListener('tut:protocolUpgraded', () => {
    if (stage !== 'step8') return;
    // Remove upgrade highlights and banner
    removeBanner('tut-upgrade-banner');
    document.querySelectorAll('.tut-upgrade-pulse').forEach(b => b.classList.remove('tut-upgrade-pulse'));
    stage = 'step9';
    window._tutSubtitleForce = false; // release subtitle visibility override
    // Reset subtitle to default
    const subtitleEl = document.querySelector('[data-protocol-subtitle]');
    if (subtitleEl) {
      subtitleEl.textContent = 'Choose up to 2 discovered protocols to start your run with.';
      subtitleEl.style.color = '#aaf6ff';
      subtitleEl.style.fontSize = '0.95rem';
      subtitleEl.style.fontWeight = '';
      subtitleEl.style.textShadow = '';
    }
    // Restore Back and Play buttons to normal, then highlight Play
    const overlay = document.getElementById('starterProtocolOverlay');
    if (overlay) {
      overlay.querySelectorAll('button').forEach(btn => {
        const t = btn.textContent.trim();
        if (t === 'Play' || t === 'Back') {
          btn.style.opacity = '1';
          btn.style.pointerEvents = 'auto';
          btn.style.cursor = 'pointer';
          btn.disabled = false;
        }
      });
      overlay.querySelectorAll('button').forEach(btn => {
        const t = btn.textContent.trim();
        if (t === 'Play') {
          btn.classList.add('tut-pulse');
          btn.addEventListener('click', () => { completeTutorial(); }, { once: true, capture: true });
        } else if (t === 'Back') {
          btn.addEventListener('click', () => { completeTutorial(); }, { once: true, capture: true });
        }
      });
    }
  });

})();
