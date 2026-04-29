
//========= SENTINEL PROTOCOL SYSTEM =========//
// Separate module for all protocol-related logic

const PROTOCOLS = {
  // ── Targeting Common ─── Lower: R@1+X@1 | Standard: R@2+X@1 | Higher: R@2+X@2
  "LongSight Protocol":       { family: "Targeting", rarity: "Common", tier: "Lower",    structure: "2+", statMods: { Range: 1, Pickup: 1 },            influence: 4,  intent: "Awareness and collection" },
  "Peripheral Scan":          { family: "Targeting", rarity: "Common", tier: "Lower",    structure: "2+", statMods: { Range: 1, Health: 1 },             influence: 5,  intent: "Safer spacing" },
  "Narrow Profile":           { family: "Targeting", rarity: "Common", tier: "Lower",    structure: "2+", statMods: { Range: 1, Movement: 1 },           influence: 6,  intent: "Agile positioning" },
  "Target Lock":              { family: "Targeting", rarity: "Common", tier: "Standard", structure: "2+", statMods: { Range: 2, Power: 1 },              influence: 11, intent: "Aggressive sniper" },
  "Optical Stabilization":    { family: "Targeting", rarity: "Common", tier: "Standard", structure: "2+", statMods: { Range: 2, Intensity: 1 },          influence: 10, intent: "Sustained pressure" },
  "Sensor Calibration":       { family: "Targeting", rarity: "Common", tier: "Standard", structure: "2+", statMods: { Range: 2, Movement: 1 },           influence: 9,  intent: "Mobile targeting" },
  "Sightline Optimization":   { family: "Targeting", rarity: "Common", tier: "Standard", structure: "2+", statMods: { Range: 2, Health: 1 },             influence: 8,  intent: "Defensive spacing" },
  "Precision Alignment":      { family: "Targeting", rarity: "Common", tier: "Higher",   structure: "2+", statMods: { Range: 2, Power: 2 },              influence: 16, intent: "Pure damage targeting" },
  "Focus Optimization":       { family: "Targeting", rarity: "Common", tier: "Higher",   structure: "2+", statMods: { Range: 2, Intensity: 2 },          influence: 14, intent: "Tempo ranged combat" },
  // ── Targeting Rare ─── Lower: R@1+X@1+Y@1 | Standard: R@2+X@1+Y@1 | Higher: R@2+X@2+Y@2
  "Vector Mapping":           { family: "Targeting", rarity: "Rare",   tier: "Lower",    structure: "3+", statMods: { Intensity: 1, Health: 1, Pickup: 1 },             influence: 7,  intent: "Control targeting" },
  "Range Analysis":           { family: "Targeting", rarity: "Rare",   tier: "Lower",    structure: "3+", statMods: { Range: 1, Health: 1, Pickup: 1 },                influence: 6,  intent: "Defensive targeting" },
  "Threat Analysis":          { family: "Targeting", rarity: "Rare",   tier: "Standard", structure: "3+", statMods: { Range: 2, Intensity: 1, Pickup: 1 },             influence: 11, intent: "Stationary control" },
  "Ballistic Prediction":     { family: "Targeting", rarity: "Rare",   tier: "Standard", structure: "3+", statMods: { Range: 2, Power: 1, Movement: 1 },               influence: 14, intent: "Aggressive sniper" },
  "Tracking Matrix":          { family: "Targeting", rarity: "Rare",   tier: "Standard", structure: "3+", statMods: { Range: 2, Movement: 1, Intensity: 1 },           influence: 13, intent: "Reposition combat" },
  "Predictive Targeting":     { family: "Targeting", rarity: "Rare",   tier: "Higher",   structure: "3+", statMods: { Range: 2, Power: 2, Intensity: 2 },              influence: 24, intent: "Peak offense targeting" },
  "Focus Tracking":           { family: "Targeting", rarity: "Rare",   tier: "Higher",   structure: "3+", statMods: { Range: 2, Movement: 2, Power: 2 },               influence: 22, intent: "Precision mobility" },

  // ── Overdrive Common ─── Lower: I@1+X@1 | Standard: I@2+X@1 | Higher: I@2+X@2
  "Pulse Cycling":            { family: "Overdrive", rarity: "Common", tier: "Lower",    structure: "2+", statMods: { Intensity: 1, Pickup: 1 },         influence: 5,  intent: "Resource tempo" },
  "Combat Flow":              { family: "Overdrive", rarity: "Common", tier: "Lower",    structure: "2+", statMods: { Intensity: 1, Movement: 1 },        influence: 7,  intent: "Fragile speed" },
  "Thermal Scaling":          { family: "Overdrive", rarity: "Common", tier: "Lower",    structure: "2+", statMods: { Intensity: 1, Power: 1 },           influence: 9,  intent: "Aggressive tempo" },
  "Rapid Cycling":            { family: "Overdrive", rarity: "Common", tier: "Standard", structure: "2+", statMods: { Intensity: 2, Movement: 1 },        influence: 11, intent: "Constant motion" },
  "Pressure Loop":            { family: "Overdrive", rarity: "Common", tier: "Standard", structure: "2+", statMods: { Intensity: 2, Power: 1 },           influence: 13, intent: "Tempo damage" },
  "Combat Sync":              { family: "Overdrive", rarity: "Common", tier: "Standard", structure: "2+", statMods: { Intensity: 2, Health: 1 },          influence: 10, intent: "Close sustain" },
  "Kinetic Optimization":     { family: "Overdrive", rarity: "Common", tier: "Standard", structure: "2+", statMods: { Intensity: 2, Range: 1 },           influence: 11, intent: "Engagement uptime" },
  "Overclock Protocol":       { family: "Overdrive", rarity: "Common", tier: "Higher",   structure: "2+", statMods: { Intensity: 2, Power: 2 },           influence: 18, intent: "Pure aggression" },
  "Hyper Cycle":              { family: "Overdrive", rarity: "Common", tier: "Higher",   structure: "2+", statMods: { Intensity: 2, Movement: 2 },        influence: 14, intent: "Speed dominance" },
  // ── Overdrive Rare ─── Lower: I@1+X@1+Y@1 | Standard: I@2+X@1+Y@1 | Higher: I@2+X@2+Y@2
  "Thermal Spike":            { family: "Overdrive", rarity: "Rare",   tier: "Lower",    structure: "3+", statMods: { Intensity: 1, Power: 1, Pickup: 1 },             influence: 10, intent: "Aggro farming" },
  "Combat Cascade":           { family: "Overdrive", rarity: "Rare",   tier: "Lower",    structure: "3+", statMods: { Intensity: 1, Movement: 1, Pickup: 1 },           influence: 8,  intent: "Mobility tempo" },
  "Impulse Routine":          { family: "Overdrive", rarity: "Rare",   tier: "Lower",    structure: "3+", statMods: { Intensity: 1, Range: 1, Movement: 1 },            influence: 10, intent: "Engagement flow" },
  "Momentum Routine":         { family: "Overdrive", rarity: "Rare",   tier: "Standard", structure: "3+", statMods: { Intensity: 2, Movement: 1, Power: 1 },            influence: 16, intent: "High-risk aggression" },
  "Relentless Cycle":         { family: "Overdrive", rarity: "Rare",   tier: "Standard", structure: "3+", statMods: { Intensity: 2, Range: 1, Health: 1 },              influence: 13, intent: "Pressure firing" },
  "Combat Acceleration":      { family: "Overdrive", rarity: "Rare",   tier: "Standard", structure: "3+", statMods: { Intensity: 2, Movement: 1, Range: 1 },            influence: 14, intent: "Chase combat" },
  "Feedback Loop":            { family: "Overdrive", rarity: "Rare",   tier: "Standard", structure: "3+", statMods: { Intensity: 2, Power: 1, Health: 1 },              influence: 15, intent: "Bruiser tempo" },
  "Infinite Loop":            { family: "Overdrive", rarity: "Rare",   tier: "Higher",   structure: "3+", statMods: { Intensity: 2, Power: 2, Movement: 2 },            influence: 24, intent: "Maximum aggression" },
  "Overdrive Matrix":         { family: "Overdrive", rarity: "Rare",   tier: "Higher",   structure: "3+", statMods: { Intensity: 2, Range: 2, Movement: 2 },            influence: 20, intent: "Perfect tempo control" },

  // ── Utility Common ─── Lower: X@1+Y@1 | Standard: primary@2+X@1 | Higher: both@2
  "Recovery Routing":         { family: "Utility",   rarity: "Common", tier: "Lower",    structure: "2+", statMods: { Health: 1, Pickup: 1 },            influence: 3,  intent: "Survival" },
  "Soft Step Routine":        { family: "Utility",   rarity: "Common", tier: "Lower",    structure: "2+", statMods: { Movement: 1, Pickup: 1 },           influence: 4,  intent: "Mobility learning" },
  "Buffer Allocation":        { family: "Utility",   rarity: "Common", tier: "Lower",    structure: "2+", statMods: { Health: 1, Movement: 1 },            influence: 5,  intent: "Safe reposition" },
  "Structural Safeguard":     { family: "Utility",   rarity: "Common", tier: "Standard", structure: "2+", statMods: { Movement: 2, Health: 1 },            influence: 8,  intent: "Durable mobility" },
  "Collection Protocol":      { family: "Utility",   rarity: "Common", tier: "Standard", structure: "2+", statMods: { Movement: 2, Pickup: 1 },            influence: 7,  intent: "Resource efficiency" },
  "Adaptive Shielding":       { family: "Utility",   rarity: "Common", tier: "Standard", structure: "2+", statMods: { Health: 2, Pickup: 1 },              influence: 5,  intent: "Sustain focus" },
  "Stability Control":        { family: "Utility",   rarity: "Common", tier: "Standard", structure: "2+", statMods: { Health: 2, Movement: 1 },            influence: 7,  intent: "Reliable control" },
  "Mobility Protocol":        { family: "Utility",   rarity: "Common", tier: "Higher",   structure: "2+", statMods: { Movement: 2, Health: 2 },            influence: 10, intent: "Safe reposition" },
  "Logistics Manager":        { family: "Utility",   rarity: "Common", tier: "Higher",   structure: "2+", statMods: { Health: 2, Pickup: 2 },              influence: 6,  intent: "Sustain economy" },
  // ── Utility Rare ─── Lower: X@1+Y@1+Z@1 | Standard: primary@2+X@1+Y@1 | Higher: all@2
  "Sustainment Protocol":     { family: "Utility",   rarity: "Rare",   tier: "Lower",    structure: "3+", statMods: { Health: 1, Pickup: 1, Movement: 1 },              influence: 6,  intent: "Survival specialist" },
  "Salvage Operations":       { family: "Utility",   rarity: "Rare",   tier: "Lower",    structure: "3+", statMods: { Range: 1, Movement: 1, Pickup: 1 },               influence: 7,  intent: "Resource mobility" },
  "Defensive Cycling":        { family: "Utility",   rarity: "Rare",   tier: "Lower",    structure: "3+", statMods: { Health: 1, Movement: 1, Intensity: 1 },           influence: 9,  intent: "Stable tempo" },
  "Autonomous Repair":        { family: "Utility",   rarity: "Rare",   tier: "Standard", structure: "3+", statMods: { Health: 2, Pickup: 1, Movement: 1 },              influence: 8,  intent: "Survival engine" },
  "Operational Efficiency":   { family: "Utility",   rarity: "Rare",   tier: "Standard", structure: "3+", statMods: { Movement: 2, Pickup: 1, Range: 1 },               influence: 10, intent: "Safe positioning" },
  "Stabilization Matrix":     { family: "Utility",   rarity: "Rare",   tier: "Standard", structure: "3+", statMods: { Health: 2, Movement: 1, Range: 1 },               influence: 10, intent: "Defensive control" },
  "Resource Convergence":     { family: "Utility",   rarity: "Rare",   tier: "Standard", structure: "3+", statMods: { Health: 2, Pickup: 1, Intensity: 1 },             influence: 9,  intent: "Sustain combat" },
  "Guardian Protocol":        { family: "Utility",   rarity: "Rare",   tier: "Higher",   structure: "3+", statMods: { Health: 2, Movement: 2, Pickup: 2 },              influence: 12, intent: "Maximum stability" },
  "Adaptive Systems":         { family: "Utility",   rarity: "Rare",   tier: "Higher",   structure: "3+", statMods: { Health: 2, Movement: 2, Range: 2 },               influence: 16, intent: "Defensive mastery" }
};


// Protocol system state object
const ProtocolSystem = {
    // Downgrade protocol and refund bytes for last upgrade step
    downgradeProtocol: function(protocolName) {
      if (!PROTOCOLS[protocolName]) return { success: false, reason: "invalid" };
      const state = this.protocolBoard[protocolName];
      if (!state || !state.discovered) return { success: false, reason: "locked" };

      const currentIdx = this.getUpgradeTierIndex(state.upgradeTier || this.getDefaultUpgradeTier());
      if (currentIdx <= 0) {
        return { success: false, reason: "min-tier" };
      }

      // Refund the cost of the current tier (the last upgrade made)
      // To do this, temporarily set the tier to the previous one and get the cost for the next upgrade (which is the one just downgraded)
      const prevTier = this.upgradeTiers[currentIdx - 1];
      const originalTier = state.upgradeTier;
      state.upgradeTier = prevTier;
      const refund = this.getNextUpgradeCost(protocolName);
      state.upgradeTier = prevTier; // keep downgraded
      this.savePersistentData();
      return {
        success: true,
        refund,
        newTier: state.upgradeTier,
        previousTier: originalTier
      };
    },
  storageKey: "sentinel.protocolSystem.v1",
  upgradeTiers: ["Trivial", "Simple", "Moderate", "Complex", "Very Complex", "Dangerous"],
  upgradeStepCostMultipliers: [1.0, 1.75, 2.8, 4.1, 5.8],
  upgradeMultipliers: [1, 1.5, 2, 2.5, 3, 3.5],
  protocolBoard: {},
  activeProtocols: [],
  starterProtocols: [],
  favoriteProtocols: [],
  runDiscoveredProtocols: [],
  selectedFamily: "Targeting",
  selectedProtocol: null,
  editorDiscoverAllEnabled: false,

  isEditorDiscoverAllEnabled: function() {
    return !!this.editorDiscoverAllEnabled;
  },

  isEditorDiscoverAllActive: function() {
    return !!this.editorDiscoverAllEnabled && !!window._editorSessionActive;
  },

  isHardcoreRun: function() {
    return typeof window !== 'undefined' && window.sentinelDifficulty === "Hardcore";
  },

  setEditorDiscoverAllEnabled: function(enabled) {
    this.editorDiscoverAllEnabled = !!enabled;
    return this.editorDiscoverAllEnabled;
  },

  isDiscovered: function(protocolName, forCurrentRun = false) {
    if (!PROTOCOLS[protocolName]) return false;
    if (this.isEditorDiscoverAllActive()) return true;
    if (forCurrentRun) {
      return this.runDiscoveredProtocols.includes(protocolName);
    }
    return !!this.protocolBoard[protocolName]?.discovered;
  },

  getDefaultUpgradeTier: function() {
    return this.upgradeTiers[0] || "Trivial";
  },

  normalizeUpgradeTier: function(tierName) {
    if (this.upgradeTiers.includes(tierName)) return tierName;

    const legacyTierMap = {
      Prototype: "Trivial",
      Refined: "Simple",
      Enhanced: "Moderate",
      Ascendant: "Complex",
      Transcendent: "Very Complex",
      Mythic: "Dangerous"
    };

    return legacyTierMap[tierName] || this.getDefaultUpgradeTier();
  },

  // Initialize protocol board
  init: function() {
    Object.keys(PROTOCOLS).forEach(protocolName => {
      this.protocolBoard[protocolName] = {
        discovered: false,
        isNew: false,
        upgradeTier: this.getDefaultUpgradeTier()
      };
    });
    this.loadPersistentData();

    // Auto-discover all Common Lower protocols permanently
    let autoDiscovered = false;
    Object.keys(PROTOCOLS).forEach(name => {
      const p = PROTOCOLS[name];
      if (p.rarity === "Common" && p.tier === "Lower" && !this.protocolBoard[name].discovered) {
        this.protocolBoard[name].discovered = true;
        this.protocolBoard[name].isNew = true;
        autoDiscovered = true;
      }
    });
    if (autoDiscovered) this.savePersistentData();
  },

  // Save permanent data locally
  savePersistentData: function() {
    try {
      const payload = {
        protocolBoard: {},
        starterProtocols: Array.isArray(this.starterProtocols) ? [...this.starterProtocols] : [],
        favoriteProtocols: Array.isArray(this.favoriteProtocols) ? [...this.favoriteProtocols] : []
      };

      Object.keys(this.protocolBoard).forEach(name => {
        payload.protocolBoard[name] = {
          discovered: !!this.protocolBoard[name].discovered,
          isNew: !!this.protocolBoard[name].isNew,
          upgradeTier: this.protocolBoard[name].upgradeTier || this.getDefaultUpgradeTier()
        };
      });

      localStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch (e) {
      // Persistent save failed silently
    }
  },

  // Load permanent data from local storage
  loadPersistentData: function() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      let migrated = false;

      if (saved && saved.protocolBoard) {
        Object.keys(saved.protocolBoard).forEach(name => {
          if (!this.protocolBoard[name]) return;
          this.protocolBoard[name].discovered = !!saved.protocolBoard[name].discovered;
          this.protocolBoard[name].isNew = !!saved.protocolBoard[name].isNew;
          const normalizedTier = this.normalizeUpgradeTier(saved.protocolBoard[name].upgradeTier || this.getDefaultUpgradeTier());
          this.protocolBoard[name].upgradeTier = normalizedTier;
          if (saved.protocolBoard[name].upgradeTier !== normalizedTier) {
            migrated = true;
          }
        });
      }

      if (saved && Array.isArray(saved.starterProtocols)) {
        this.starterProtocols = saved.starterProtocols.filter(name => PROTOCOLS[name] && this.protocolBoard[name]?.discovered).slice(0, 2);
      }

      if (saved && Array.isArray(saved.favoriteProtocols)) {
        this.favoriteProtocols = saved.favoriteProtocols.filter(name => !!PROTOCOLS[name]);
      }

      if (migrated) {
        this.savePersistentData();
      }
    } catch (e) {
      // Persistent load failed silently
    }
  },

  // Discover a protocol
  discover: function(protocolName) {
    if (!PROTOCOLS[protocolName]) return false;

    let newlyUnlockedPermanent = false;
    if (!this.protocolBoard[protocolName].discovered) {
      this.protocolBoard[protocolName].discovered = true;
      this.protocolBoard[protocolName].isNew = true;
      newlyUnlockedPermanent = true;
    }

    let newlyDiscoveredThisRun = false;
    if (!this.runDiscoveredProtocols.includes(protocolName)) {
      this.runDiscoveredProtocols.push(protocolName);
      newlyDiscoveredThisRun = true;
    }

    if (newlyUnlockedPermanent || newlyDiscoveredThisRun) {
      if (newlyUnlockedPermanent) {
        this.savePersistentData();
      }
      return true;
    }

    return false;
  },

  // Discover a protocol for current run only (no permanent unlock/save)
  discoverRunOnly: function(protocolName) {
    if (!PROTOCOLS[protocolName]) return false;
    if (this.runDiscoveredProtocols.includes(protocolName)) return false;
    this.runDiscoveredProtocols.push(protocolName);
    return true;
  },

  // Mark protocol as seen in UI (clears NEW highlight)
  markSeen: function(protocolName) {
    if (this.protocolBoard[protocolName]) {
      this.protocolBoard[protocolName].isNew = false;
      this.savePersistentData();
    }
  },

  // Get tier index for a protocol upgrade tier
  getUpgradeTierIndex: function(tierName) {
    const idx = this.upgradeTiers.indexOf(tierName);
    return idx >= 0 ? idx : 0;
  },

  // Compute effective stat value from base modifier and tier index
  computeEffectiveModForTier: function(baseValue, tierIndex) {
    if (baseValue > 0) {
      return baseValue + tierIndex;
    }
    return 0;
  },

  // Get numeric upgrade multiplier for protocol
  getUpgradeMultiplier: function(protocolName) {
    const state = this.protocolBoard[protocolName];
    const idx = this.isHardcoreRun()
      ? 0
      : this.getUpgradeTierIndex(state?.upgradeTier || this.getDefaultUpgradeTier());
    return this.upgradeMultipliers[idx] || 1;
  },

  // Get effective stat mods with rule-based upgrade scaling
  // Positive mods: +1 per upgrade level
  // Negative mods: -1 every 2 upgrade levels
  getProtocolEffectiveMods: function(protocolName) {
    const protocol = PROTOCOLS[protocolName];
    const result = {};
    if (!protocol || !protocol.statMods) return result;

    const state = this.protocolBoard[protocolName];
    const tierIndex = this.isHardcoreRun()
      ? 0
      : this.getUpgradeTierIndex(state?.upgradeTier || this.getDefaultUpgradeTier());
    Object.keys(protocol.statMods).forEach(stat => {
      const base = protocol.statMods[stat] || 0;
      result[stat] = this.computeEffectiveModForTier(base, tierIndex);
    });

    return result;
  },

  // Get per-stat gain/loss produced by the next upgrade step
  getProtocolNextUpgradeEffects: function(protocolName) {
    const protocol = PROTOCOLS[protocolName];
    const result = {};
    if (!protocol || !protocol.statMods) return result;

    const state = this.protocolBoard[protocolName];
    const currentTierIndex = this.isHardcoreRun()
      ? 0
      : this.getUpgradeTierIndex(state?.upgradeTier || this.getDefaultUpgradeTier());
    const maxTierIndex = this.upgradeTiers.length - 1;
    const nextTierIndex = Math.min(currentTierIndex + 1, maxTierIndex);

    Object.keys(protocol.statMods).forEach(stat => {
      const base = protocol.statMods[stat] || 0;
      const currentValue = this.computeEffectiveModForTier(base, currentTierIndex);
      const nextValue = this.computeEffectiveModForTier(base, nextTierIndex);
      result[stat] = nextValue - currentValue;
    });

    return result;
  },

  // Get next upgrade cost for protocol, or null when maxed
  getNextUpgradeCost: function(protocolName) {
    const state = this.protocolBoard[protocolName];
    if (!state) return null;

    const idx = this.getUpgradeTierIndex(state.upgradeTier || this.getDefaultUpgradeTier());
    if (idx >= this.upgradeStepCostMultipliers.length) return null;

    const protocol = PROTOCOLS[protocolName];
    if (!protocol) return null;

    const influence = Math.max(0, protocol.influence || 0);
    const rarityFactor = protocol.rarity === "Rare" ? 1.45 : 1.0;
    const tierFactor = protocol.tier === "Higher" ? 1.2 : (protocol.tier === "Lower" ? 0.9 : 1.0);

    const baseCost = (10 + (influence * 4)) * rarityFactor * tierFactor;
    const steppedCost = baseCost * this.upgradeStepCostMultipliers[idx];
    const rounded = Math.ceil(steppedCost / 5) * 5;

    return Math.max(10, rounded);
  },

  // Get next upgrade tier name for protocol, or null when maxed
  getNextUpgradeTierName: function(protocolName) {
    const state = this.protocolBoard[protocolName];
    if (!state) return null;
    const idx = this.getUpgradeTierIndex(state.upgradeTier || this.getDefaultUpgradeTier());
    return idx < (this.upgradeTiers.length - 1) ? this.upgradeTiers[idx + 1] : null;
  },

  // Upgrade protocol if enough bytes are available
  upgradeProtocol: function(protocolName, availableBytes) {
    if (!PROTOCOLS[protocolName]) return { success: false, reason: "invalid" };
    const state = this.protocolBoard[protocolName];
    if (!state || !state.discovered) return { success: false, reason: "locked" };

    const currentIdx = this.getUpgradeTierIndex(state.upgradeTier || this.getDefaultUpgradeTier());
    if (currentIdx >= this.upgradeStepCostMultipliers.length) {
      return { success: false, reason: "maxed" };
    }

    const cost = this.getNextUpgradeCost(protocolName);
    if (cost === null) {
      return { success: false, reason: "maxed" };
    }
    if ((availableBytes || 0) < cost) {
      return { success: false, reason: "insufficient", cost };
    }

    state.upgradeTier = this.upgradeTiers[currentIdx + 1];
    this.savePersistentData();
    return {
      success: true,
      cost,
      newTier: state.upgradeTier
    };
  },

  // Activate protocol
  activate: function(protocolName) {
    if (!PROTOCOLS[protocolName]) return false;
    if (!this.isRunDiscovered(protocolName)) return false;
    if (this.activeProtocols.length >= 6) return false;
    if (this.activeProtocols.includes(protocolName)) return false;
    
    this.activeProtocols.push(protocolName);
    return true;
  },

  // Deactivate protocol
  deactivate: function(protocolName) {
    const idx = this.activeProtocols.indexOf(protocolName);
    if (idx !== -1) {
      this.activeProtocols.splice(idx, 1);
      return true;
    }
    return false;
  },

  // Swap protocol
  swap: function(oldProtocolName, newProtocolName) {
    if (this.deactivate(oldProtocolName)) {
      return this.activate(newProtocolName);
    }
    return false;
  },

  // Get discovered protocols
  getDiscovered: function() {
    return Object.keys(PROTOCOLS).filter(name => this.isDiscovered(name, false));
  },

  // Get run-discovered protocols (available for this run)
  getRunDiscovered: function() {
    if (this.isEditorDiscoverAllActive()) {
      return Object.keys(PROTOCOLS);
    }
    return [...this.runDiscoveredProtocols];
  },

  // Check run discovery state
  isRunDiscovered: function(protocolName) {
    return this.isDiscovered(protocolName, true);
  },

  // Get available protocols
  getAvailable: function(forCurrentRun = false) {
    if (forCurrentRun) {
      return this.getRunDiscovered();
    }
    return this.getDiscovered();
  },

  // Set starter protocols
  setStarters: function(protocols) {
    if (
      Array.isArray(protocols) &&
      protocols.length <= 2 &&
      protocols.every(name => PROTOCOLS[name] && this.protocolBoard[name].discovered)
    ) {
      this.starterProtocols = [...protocols];
      this.savePersistentData();
      return true;
    }
    return false;
  },

  // Favorite protocol helpers
  isFavorite: function(protocolName) {
    return this.favoriteProtocols.includes(protocolName);
  },

  toggleFavorite: function(protocolName) {
    if (!PROTOCOLS[protocolName]) return false;
    const idx = this.favoriteProtocols.indexOf(protocolName);
    if (idx >= 0) {
      this.favoriteProtocols.splice(idx, 1);
    } else {
      this.favoriteProtocols.push(protocolName);
    }
    this.savePersistentData();
    return true;
  },

  getFavorites: function() {
    return [...this.favoriteProtocols];
  },

  // Initialize run with starter protocols
  initializeRun: function() {
    this.activeProtocols = [];
    this.runDiscoveredProtocols = [];

    if (this.isEditorDiscoverAllActive()) {
      this.runDiscoveredProtocols = Object.keys(PROTOCOLS);
    }
    
    // Start each run with only the selected starters discovered
    this.starterProtocols.slice(0, 2).forEach(p => {
      if (PROTOCOLS[p] && this.isDiscovered(p, false)) {
        if (!this.runDiscoveredProtocols.includes(p)) {
          this.runDiscoveredProtocols.push(p);
        }
        this.activate(p);
      }
    });
  },

  // Get stat mods from active protocols
  getStatMods: function() {
    let mods = {
      Range: 0,
      Power: 0,
      Intensity: 0,
      Movement: 0,
      Health: 0,
      Pickup: 0
    };
    
    this.activeProtocols.forEach(protocolName => {
      const effectiveMods = this.getProtocolEffectiveMods(protocolName);
      if (effectiveMods) {
        Object.keys(effectiveMods).forEach(stat => {
          if (mods.hasOwnProperty(stat)) {
            mods[stat] += effectiveMods[stat];
          }
        });
      }
    });
    
    return mods;
  },

  // Reset all protocol discovery (permanent and run)
  resetDiscovery: function() {
    Object.keys(this.protocolBoard).forEach(name => {
      this.protocolBoard[name].discovered = false;
      this.protocolBoard[name].isNew = false;
      this.protocolBoard[name].upgradeTier = this.getDefaultUpgradeTier();
    });
    this.starterProtocols = [];
    this.favoriteProtocols = [];
    this.runDiscoveredProtocols = [];
    this.activeProtocols = [];
    this.savePersistentData();
  },
  // Get all protocols by family and rarity
  getByFamilyAndRarity: function() {
    const families = ["Targeting", "Overdrive", "Utility"];
    const rarities = ["Common", "Rare"];
    const result = {};
    
    families.forEach(family => {
      result[family] = {};
      rarities.forEach(rarity => {
        result[family][rarity] = [];
        Object.keys(PROTOCOLS).forEach(protocolName => {
          const p = PROTOCOLS[protocolName];
          if (p.family === family && p.rarity === rarity) {
            result[family][rarity].push({
              name: protocolName,
              ...p,
              discovered: this.isDiscovered(protocolName, false),
              upgrade: this.protocolBoard[protocolName].upgradeTier
            });
          }
        });
      });
    });
    
    return result;
  }
};

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ProtocolSystem.init();
  });
} else {
  ProtocolSystem.init();
}
