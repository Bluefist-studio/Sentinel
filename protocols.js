//========= SENTINEL PROTOCOL SYSTEM =========//
// Separate module for all protocol-related logic

const PROTOCOLS = {
  // Targeting Family - Common
  "LongSight Protocol": { family: "Targeting", rarity: "Common", tier: "Lower", structure: "2+/1−", statMods: { Range: 1, Pickup: 1, Movement: -1 }, influence: 2, intent: "Awareness vs survivability" },
  "Peripheral Scan": { family: "Targeting", rarity: "Common", tier: "Lower", structure: "2+/2−", statMods: { Range: 1, Health: 1, Movement: -1, Pickup: -1 }, influence: 1, intent: "Safer spacing" },
  "Narrow Profile": { family: "Targeting", rarity: "Common", tier: "Lower", structure: "2+/2−", statMods: { Range: 1, Movement: 1, Health: -1, Pickup: -1 }, influence: 3, intent: "Agile positioning" },
  "Target Lock": { family: "Targeting", rarity: "Common", tier: "Standard", structure: "2+/1−", statMods: { Range: 1, Power: 1, Movement: -1 }, influence: 5, intent: "Aggressive sniper" },
  "Optical Stabilization": { family: "Targeting", rarity: "Common", tier: "Standard", structure: "2+/1−", statMods: { Range: 1, Intensity: 1, Health: -1 }, influence: 5, intent: "Sustained pressure" },
  "Sensor Calibration": { family: "Targeting", rarity: "Common", tier: "Standard", structure: "2+/1−", statMods: { Range: 1, Movement: 1, Pickup: -1 }, influence: 5, intent: "Mobile targeting" },
  "Sightline Optimization": { family: "Targeting", rarity: "Common", tier: "Standard", structure: "2+/1−", statMods: { Range: 1, Health: 1, Pickup: -1 }, influence: 4, intent: "Defensive spacing" },
  "Precision Alignment": { family: "Targeting", rarity: "Common", tier: "Higher", structure: "2+/0−", statMods: { Range: 1, Power: 1 }, influence: 8, intent: "Pure damage targeting" },
  "Focus Optimization": { family: "Targeting", rarity: "Common", tier: "Higher", structure: "2+/0−", statMods: { Range: 1, Intensity: 1 }, influence: 7, intent: "Tempo ranged combat" },
  
  // Targeting Family - Rare
  "Vector Mapping": { family: "Targeting", rarity: "Rare", tier: "Lower", structure: "3+/2−", statMods: { Range: 1, Movement: 1, Pickup: 1, Power: -1, Health: -1 }, influence: 0, intent: "Control targeting" },
  "Range Analysis": { family: "Targeting", rarity: "Rare", tier: "Lower", structure: "3+/1−", statMods: { Range: 1, Health: 1, Pickup: 1, Power: -1 }, influence: 3, intent: "Defensive targeting" },
  "Threat Analysis": { family: "Targeting", rarity: "Rare", tier: "Standard", structure: "3+/1−", statMods: { Range: 1, Intensity: 1, Pickup: 1, Movement: -1 }, influence: 5, intent: "Stationary control" },
  "Ballistic Prediction": { family: "Targeting", rarity: "Rare", tier: "Standard", structure: "3+/1−", statMods: { Range: 1, Power: 1, Movement: 1, Health: -1 }, influence: 9, intent: "Aggressive sniper" },
  "Tracking Matrix": { family: "Targeting", rarity: "Rare", tier: "Standard", structure: "3+/1−", statMods: { Range: 1, Movement: 1, Intensity: 1, Health: -1 }, influence: 8, intent: "Reposition combat" },
  "Predictive Targeting": { family: "Targeting", rarity: "Rare", tier: "Higher", structure: "3+/0−", statMods: { Range: 1, Power: 1, Intensity: 1 }, influence: 12, intent: "Peak offense targeting" },
  "Focus Tracking": { family: "Targeting", rarity: "Rare", tier: "Higher", structure: "3+/0−", statMods: { Range: 1, Movement: 1, Power: 1 }, influence: 11, intent: "Precision mobility" },
  
  // Overdrive Family - Common
  "Pulse Cycling": { family: "Overdrive", rarity: "Common", tier: "Lower", structure: "2+/2−", statMods: { Intensity: 1, Pickup: 1, Health: -1, Range: -1 }, influence: 0, intent: "Resource tempo" },
  "Combat Flow": { family: "Overdrive", rarity: "Common", tier: "Lower", structure: "2+/2−", statMods: { Intensity: 1, Movement: 1, Health: -1, Pickup: -1 }, influence: 4, intent: "Fragile speed" },
  "Thermal Scaling": { family: "Overdrive", rarity: "Common", tier: "Lower", structure: "2+/2−", statMods: { Intensity: 1, Power: 1, Movement: -1, Health: -1 }, influence: 4, intent: "Aggressive tempo" },
  "Rapid Cycling": { family: "Overdrive", rarity: "Common", tier: "Standard", structure: "2+/1−", statMods: { Intensity: 1, Movement: 1, Health: -1 }, influence: 5, intent: "Constant motion" },
  "Pressure Loop": { family: "Overdrive", rarity: "Common", tier: "Standard", structure: "2+/1−", statMods: { Intensity: 1, Power: 1, Pickup: -1 }, influence: 8, intent: "Tempo damage" },
  "Combat Sync": { family: "Overdrive", rarity: "Common", tier: "Standard", structure: "2+/1−", statMods: { Intensity: 1, Health: 1, Range: -1 }, influence: 3, intent: "Close sustain" },
  "Kinetic Optimization": { family: "Overdrive", rarity: "Common", tier: "Standard", structure: "2+/1−", statMods: { Intensity: 1, Range: 1, Movement: -1 }, influence: 4, intent: "Engagement uptime" },
  "Overclock Protocol": { family: "Overdrive", rarity: "Common", tier: "Higher", structure: "2+/0−", statMods: { Intensity: 1, Power: 1 }, influence: 9, intent: "Pure aggression" },
  "Hyper Cycle": { family: "Overdrive", rarity: "Common", tier: "Higher", structure: "2+/0−", statMods: { Intensity: 1, Movement: 1 }, influence: 7, intent: "Speed dominance" },
  
  // Overdrive Family - Rare
  "Thermal Spike": { family: "Overdrive", rarity: "Rare", tier: "Lower", structure: "3+/2−", statMods: { Intensity: 1, Power: 1, Pickup: 1, Health: -1, Range: -1 }, influence: 5, intent: "Aggro farming" },
  "Combat Cascade": { family: "Overdrive", rarity: "Rare", tier: "Lower", structure: "3+/2−", statMods: { Intensity: 1, Movement: 1, Pickup: 1, Power: -1, Health: -1 }, influence: 1, intent: "Mobility tempo" },
  "Impulse Routine": { family: "Overdrive", rarity: "Rare", tier: "Lower", structure: "3+/2−", statMods: { Intensity: 1, Range: 1, Movement: 1, Health: -1, Pickup: -1 }, influence: 7, intent: "Engagement flow" },
  "Momentum Routine": { family: "Overdrive", rarity: "Rare", tier: "Standard", structure: "3+/1−", statMods: { Intensity: 1, Movement: 1, Power: 1, Health: -1 }, influence: 10, intent: "High-risk aggression" },
  "Relentless Cycle": { family: "Overdrive", rarity: "Rare", tier: "Standard", structure: "3+/1−", statMods: { Intensity: 1, Range: 1, Health: 1, Movement: -1 }, influence: 5, intent: "Pressure firing" },
  "Combat Acceleration": { family: "Overdrive", rarity: "Rare", tier: "Standard", structure: "3+/1−", statMods: { Intensity: 1, Movement: 1, Range: 1, Pickup: -1 }, influence: 9, intent: "Chase combat" },
  "Feedback Loop": { family: "Overdrive", rarity: "Rare", tier: "Standard", structure: "3+/1−", statMods: { Intensity: 1, Power: 1, Health: 1, Range: -1 }, influence: 8, intent: "Bruiser tempo" },
  "Infinite Loop": { family: "Overdrive", rarity: "Rare", tier: "Higher", structure: "3+/0−", statMods: { Intensity: 1, Power: 1, Movement: 1 }, influence: 12, intent: "Maximum aggression" },
  "Overdrive Matrix": { family: "Overdrive", rarity: "Rare", tier: "Higher", structure: "3+/0−", statMods: { Intensity: 1, Range: 1, Movement: 1 }, influence: 10, intent: "Perfect tempo control" },
  
  // Utility Family - Common
  "Recovery Routing": { family: "Utility", rarity: "Common", tier: "Lower", structure: "2+/1−", statMods: { Health: 1, Pickup: 1, Range: -1 }, influence: 0, intent: "Survival tradeoff" },
  "Soft Step Routine": { family: "Utility", rarity: "Common", tier: "Lower", structure: "2+/2−", statMods: { Movement: 1, Pickup: 1, Range: -1 }, influence: 1, intent: "Mobility learning" },
  "Buffer Allocation": { family: "Utility", rarity: "Common", tier: "Lower", structure: "2+/2−", statMods: { Health: 1, Movement: 1, Intensity: -1, Pickup: -1 }, influence: 0, intent: "Safe reposition" },
  "Structural Safeguard": { family: "Utility", rarity: "Common", tier: "Standard", structure: "2+/1−", statMods: { Health: 1, Movement: 1, Power: -1 }, influence: 0, intent: "Durable mobility" },
  "Collection Protocol": { family: "Utility", rarity: "Common", tier: "Standard", structure: "2+/1−", statMods: { Pickup: 1, Movement: 1, Range: -1 }, influence: 1, intent: "Resource efficiency" },
  "Adaptive Shielding": { family: "Utility", rarity: "Common", tier: "Standard", structure: "3+/1−", statMods: { Health: 1, Pickup: 1, Range: 1, Intensity: -1 }, influence: 2, intent: "Sustain focus" },
  "Stability Control": { family: "Utility", rarity: "Common", tier: "Standard", structure: "2+/1−", statMods: { Movement: 1, Health: 1, Pickup: -1 }, influence: 4, intent: "Reliable control" },
  "Mobility Protocol": { family: "Utility", rarity: "Common", tier: "Higher", structure: "2+/0−", statMods: { Movement: 1, Health: 1 }, influence: 5, intent: "Safe reposition" },
  "Logistics Manager": { family: "Utility", rarity: "Common", tier: "Higher", structure: "2+/0−", statMods: { Health: 1, Pickup: 1 }, influence: 3, intent: "Sustain economy" },
  
  // Utility Family - Rare
  "Sustainment Protocol": { family: "Utility", rarity: "Rare", tier: "Lower", structure: "3+/1−", statMods: { Health: 1, Pickup: 1, Movement: 1, Range: -1 }, influence: 3, intent: "Survival specialist" },
  "Salvage Operations": { family: "Utility", rarity: "Rare", tier: "Lower", structure: "3+/1−", statMods: { Pickup: 1, Movement: 1, Range: 1, Power: -1 }, influence: 2, intent: "Resource mobility" },
  "Defensive Cycling": { family: "Utility", rarity: "Rare", tier: "Lower", structure: "3+/2−", statMods: { Health: 1, Movement: 1, Intensity: 1, Power: -1, Pickup: -1 }, influence: 3, intent: "Stable tempo" },
  "Autonomous Repair": { family: "Utility", rarity: "Rare", tier: "Standard", structure: "3+/1−", statMods: { Health: 1, Pickup: 1, Movement: 1, Power: -1 }, influence: 1, intent: "Survival engine" },
  "Operational Efficiency": { family: "Utility", rarity: "Rare", tier: "Standard", structure: "3+/1−", statMods: { Movement: 1, Pickup: 1, Range: 1, Intensity: -1 }, influence: 3, intent: "Safe positioning" },
  "Stabilization Matrix": { family: "Utility", rarity: "Rare", tier: "Standard", structure: "3+/1−", statMods: { Health: 1, Movement: 1, Range: 1, Pickup: -1 }, influence: 7, intent: "Defensive control" },
  "Resource Convergence": { family: "Utility", rarity: "Rare", tier: "Standard", structure: "3+/1−", statMods: { Pickup: 1, Health: 1, Intensity: 1, Range: -1 }, influence: 4, intent: "Sustain combat" },
  "Guardian Protocol": { family: "Utility", rarity: "Rare", tier: "Higher", structure: "3+/0−", statMods: { Health: 1, Movement: 1, Pickup: 1 }, influence: 6, intent: "Maximum stability" },
  "Adaptive Systems": { family: "Utility", rarity: "Rare", tier: "Higher", structure: "3+/0−", statMods: { Health: 1, Movement: 1, Range: 1 }, influence: 8, intent: "Defensive mastery" }
};

// Protocol system state object
const ProtocolSystem = {
  protocolBoard: {},
  activeProtocols: [],
  starterProtocols: [],
  runDiscoveredProtocols: [],
  selectedFamily: "Targeting",
  selectedProtocol: null,

  // Initialize protocol board
  init: function() {
    Object.keys(PROTOCOLS).forEach(protocolName => {
      this.protocolBoard[protocolName] = {
        discovered: false,
        isNew: false,
        upgradeTier: "Prototype"
      };
    });
    console.log("✓ Protocol system initialized");
  },

  // Discover a protocol
  discover: function(protocolName) {
    if (PROTOCOLS[protocolName] && !this.protocolBoard[protocolName].discovered) {
      this.protocolBoard[protocolName].discovered = true;
      this.protocolBoard[protocolName].isNew = true;
      if (!this.runDiscoveredProtocols.includes(protocolName)) {
        this.runDiscoveredProtocols.push(protocolName);
      }
      console.log(`✓ Discovered: ${protocolName}`);
      return true;
    }
    return false;
  },

  // Mark protocol as seen in UI (clears NEW highlight)
  markSeen: function(protocolName) {
    if (this.protocolBoard[protocolName]) {
      this.protocolBoard[protocolName].isNew = false;
    }
  },

  // Activate protocol
  activate: function(protocolName) {
    if (!PROTOCOLS[protocolName]) return false;
    if (!this.protocolBoard[protocolName].discovered) return false;
    if (this.activeProtocols.length >= 6) return false;
    if (this.activeProtocols.includes(protocolName)) return false;
    
    this.activeProtocols.push(protocolName);
    console.log(`✓ Activated: ${protocolName} (${this.activeProtocols.length}/6)`);
    return true;
  },

  // Deactivate protocol
  deactivate: function(protocolName) {
    const idx = this.activeProtocols.indexOf(protocolName);
    if (idx !== -1) {
      this.activeProtocols.splice(idx, 1);
      console.log(`✓ Deactivated: ${protocolName}`);
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
    return Object.keys(this.protocolBoard).filter(name => this.protocolBoard[name].discovered);
  },

  // Get available protocols
  getAvailable: function(forCurrentRun = false) {
    if (forCurrentRun) {
      return [...new Set([...this.getDiscovered(), ...this.runDiscoveredProtocols])];
    }
    return this.getDiscovered();
  },

  // Set starter protocols
  setStarters: function(protocols) {
    if (protocols.length === 2) {
      this.starterProtocols = [...protocols];
      console.log(`✓ Starter protocols set: ${protocols.join(", ")}`);
      return true;
    }
    return false;
  },

  // Initialize run with starter protocols
  initializeRun: function() {
    this.activeProtocols = [];
    this.runDiscoveredProtocols = [];
    
    if (this.starterProtocols.length === 2) {
      this.starterProtocols.forEach(p => {
        if (!this.protocolBoard[p].discovered) {
          this.discover(p);
        }
        this.activate(p);
      });
    }
    console.log(`✓ Run initialized with ${this.activeProtocols.length} protocols`);
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
      const protocol = PROTOCOLS[protocolName];
      if (protocol && protocol.statMods) {
        Object.keys(protocol.statMods).forEach(stat => {
          if (mods.hasOwnProperty(stat)) {
            mods[stat] += protocol.statMods[stat];
          }
        });
      }
    });
    
    return mods;
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
              discovered: this.protocolBoard[protocolName].discovered,
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

console.log("✓ Protocols module loaded");
