// Timeline-based Wave Editor Integration
// Provides an integrated timeline editor for per-mob spawn control

function createNewTimelineWaveEditor(waveSection, selectedWaveState) {
	const MOB_TYPES = [
		"grunts", "brutes", "slingers", "shielders", "beamers", "kamikazes", "stalkers", "gruntbossminor", "gruntboss", "slingerboss", "bruteboss", "stalkerBoss"
	];
	const MOB_LABELS = {
		"grunts": "Grunts", "brutes": "Brutes", "slingers": "Slingers", "shielders": "Shielders",
		"beamers": "Beamers", "kamikazes": "Kamikazes", "stalkers": "Stalkers",
		"gruntbossminor": "Grunt Heavy", "gruntboss": "Grunt Boss", "slingerboss": "Slinger Boss", "bruteboss": "Brute Boss", "stalkerBoss": "Stalker Boss"
	};

	// Timeline data: waveNum -> { duration, mobs: { mobType: [{time, amount}, ...] } }
	// Store globally so data persists across editor sessions
	if (!window._timelineWaveData) {
		window._timelineWaveData = {};
	}
	const waveTimelines = window._timelineWaveData;
	
	// Working copy for current editing session - discarded if user switches waves without applying
	if (!window._timelineWorkingCopy) {
		window._timelineWorkingCopy = { waveNum: null, data: null };
	}
	
	const SNAP_INTERVAL = 0.5;  // Snap to 0.5 second intervals
	const TRACK_WIDTH = 500;     // Fixed pixel width for dragging (increased from 400)

	function snapToGrid(time) {
		return Math.round(time / SNAP_INTERVAL) * SNAP_INTERVAL;
	}
	
	function deepCopyTimeline(timeline) {
		return JSON.parse(JSON.stringify(timeline));
	}

	function loadTimelineData(waveNum) {
		// If we're still editing the same wave, use the working copy
		if (window._timelineWorkingCopy.waveNum === waveNum && window._timelineWorkingCopy.data) {
			return window._timelineWorkingCopy.data;
		}
		let sourceData = null;
		
		// PRIORITY 1: Check for localStorage override (edits saved by user)
		// STRICT validation: must have timelineMode, timeline, AND actual mob data
		if (typeof window.waveEditorOverrides !== "undefined" && window.waveEditorOverrides[waveNum]) {
			const override = window.waveEditorOverrides[waveNum];
			// Must be explicitly marked as timelineMode and have valid timeline data with mobs
			if (override.timelineMode === true && override.timeline && typeof override.timeline === "object") {
				const timeline = override.timeline;
				const hasMobs = timeline.mobs && typeof timeline.mobs === "object";
				const hasAnyMobs = hasMobs && Object.values(timeline.mobs).some(mobArray => Array.isArray(mobArray) && mobArray.length > 0);
				
				if (hasAnyMobs) {
					sourceData = timeline;
				} else {
				}
			} else {
			}
		}
		
		// PRIORITY 2: Check session override (from spawnWave in game)
		if (!sourceData && typeof window._editorWaveOverride !== "undefined" && window._editorWaveOverride[waveNum]) {
			const override = window._editorWaveOverride[waveNum];
			if (override.timelineMode === true && override.timeline && typeof override.timeline === "object") {
				sourceData = override.timeline;
			}
		}
		
		// PRIORITY 3: Directly decode the DEFAULT wave code from waveControl.js
		if (!sourceData) {
			const code = window.SentinelWaveEditorCodes && window.SentinelWaveEditorCodes[waveNum];
			if (code) {
				try {
					// Directly decode the SWC3 code
					if (window.SentinelEditor && typeof window.SentinelEditor.decodeWaveCode === "function") {
						const decoded = window.SentinelEditor.decodeWaveCode(code);
						const waveCfg = decoded[waveNum];
						if (waveCfg && waveCfg.timelineMode && waveCfg.timeline) {
							sourceData = waveCfg.timeline;
						} else {
						}
					} else {
					}
				} catch (err) {
				}
			} else {
			}
		}
		
		// FALLBACK: Use or create local timeline storage
		if (!sourceData) {
			if (!waveTimelines[waveNum]) {
				waveTimelines[waveNum] = { duration: 30, endCondition: 'duration', mobs: {} };
				MOB_TYPES.forEach(mob => waveTimelines[waveNum].mobs[mob] = []);
			}
			sourceData = waveTimelines[waveNum];
		}
		// Ensure all required properties are initialized with safe defaults
		if (!sourceData || typeof sourceData !== "object") {
			sourceData = {};
		}
		
		// Ensure duration is a valid number
		if (!Number.isFinite(sourceData.duration) || sourceData.duration < 1) {
			sourceData.duration = 30;
		}
		
		// Ensure endCondition is valid
		if (!sourceData.endCondition || typeof sourceData.endCondition !== "string") {
			sourceData.endCondition = "duration";
		}
		
		// Ensure all required mob types are initialized
		if (!sourceData.mobs || typeof sourceData.mobs !== "object") {
			sourceData.mobs = {};
		}
		MOB_TYPES.forEach(mob => {
			if (!Array.isArray(sourceData.mobs[mob])) {
				sourceData.mobs[mob] = [];
			}
		});
		
		// Create a working copy for this wave
		window._timelineWorkingCopy.waveNum = waveNum;
		window._timelineWorkingCopy.data = deepCopyTimeline(sourceData);
		return window._timelineWorkingCopy.data;
	}

	function tryLoadCodeWaveAsTimeline(waveNum) {
		// Get the wave code
		let code = null;
		if (window.SentinelWaveEditorCodes && window.SentinelWaveEditorCodes[waveNum]) {
			code = window.SentinelWaveEditorCodes[waveNum];
		}

		if (!code) return;

		try {
			// FIRST: Try to decode as SWC3 timeline-based code
			if (window.SentinelEditor && typeof window.SentinelEditor.decodeWaveCode === "function") {
				const decoded = window.SentinelEditor.decodeWaveCode(code);
				const waveCfg = decoded[waveNum];
				
				if (waveCfg && waveCfg.timelineMode && waveCfg.timeline) {
					const timeline = waveTimelines[waveNum];
					timeline.duration = waveCfg.timeline.duration || 30;
					timeline.endCondition = waveCfg.timeline.endCondition || 'duration';
					timeline.mobs = deepCopyTimeline(waveCfg.timeline).mobs;
					return;
				}
			}

			// FALLBACK: Try burst config approach (for legacy burst-mode codes)
			if (!window.SentinelEditor || typeof window.SentinelEditor.getWaveConfigFromCode !== "function") {
				return;
			}

			const config = window.SentinelEditor.getWaveConfigFromCode(code, waveNum);
			if (!config) return;

			// IMPORTANT: Check if code wave is ALREADY timeline-based (not a burst config)
			if (config.timelineMode && config.timeline) {
				const timeline = waveTimelines[waveNum];
				timeline.duration = config.timeline.duration || 30;
				timeline.endCondition = config.timeline.endCondition || 'duration';
				timeline.mobs = deepCopyTimeline(config.timeline).mobs;
				return;
			}

			// Otherwise, convert burst-based config to timeline format
			// Map old burst interval (ms) to seconds
			const burstIntervalSeconds = config.burstIntervalSeconds || (config.burstInterval ? config.burstInterval / 100 : 0.3);
			const burstCount = config.burstCount || 30;
			const duration = (burstCount * burstIntervalSeconds) + 2;  // Add 2 second buffer

			// Update the timeline
			const timeline = waveTimelines[waveNum];
			timeline.duration = duration;
			timeline.endCondition = 'duration';  // Code waves end by duration

			// Map mob types from config to timeline events
			const mobTypeMap = {
				"customBursts": "grunts",
				"customBrutes": "brutes",
				"customSlingers": "slingers",
				"customShielders": "shielders",
				"customBeamers": "beamers",
				"customKamikazes": "kamikazes",
				"customStalkers": "stalkers",
				"customBossMinors": "gruntbossminor",
				"customBosses": "gruntboss",
				"customSlingerBosses": "slingerboss",
				"customBruteBosses": "bruteboss"
			};

			// Convert each mob type array to timeline events
			for (const [configKey, mobType] of Object.entries(mobTypeMap)) {
				const burstArray = config[configKey];
				if (!Array.isArray(burstArray) || burstArray.length === 0) continue;

				timeline.mobs[mobType] = [];
				for (let burstIdx = 0; burstIdx < burstArray.length; burstIdx++) {
					const amount = burstArray[burstIdx];
					if (amount > 0) {
						const time = snapToGrid(burstIdx * burstIntervalSeconds);
						timeline.mobs[mobType].push({ time, amount, mode: 'event' });
					}
				}
			}
		} catch (err) {
		}
	}

	// Duration control
	const durationLabel = document.createElement("label");
	durationLabel.style.display = "flex";
	durationLabel.style.alignItems = "center";
	durationLabel.style.gap = "8px";
	durationLabel.style.marginBottom = "10px";
	durationLabel.style.fontSize = "0.9rem";
	durationLabel.style.color = "#7ff9ff";
	durationLabel.textContent = "Wave Duration (seconds): ";
	const durationInput = document.createElement("input");
	durationInput.type = "number";
	durationInput.value = "30";
	durationInput.min = "1";
	durationInput.max = "300";
	durationInput.step = "0.5";
	durationInput.style.width = "80px";
	durationInput.style.padding = "6px";
	durationInput.style.borderRadius = "4px";
	durationInput.style.border = "1px solid rgba(0,255,221,0.4)";
	durationInput.style.background = "rgba(0,0,0,0.45)";
	durationInput.style.color = "#d8ffff";
	durationLabel.appendChild(durationInput);
	waveSection.appendChild(durationLabel);

	// Wave end condition toggle
	const endConditionDiv = document.createElement("div");
	endConditionDiv.style.marginTop = "10px";
	endConditionDiv.style.marginBottom = "10px";
	endConditionDiv.style.fontSize = "0.9rem";
	endConditionDiv.style.color = "#7ff9ff";
	endConditionDiv.style.display = "flex";
	endConditionDiv.style.alignItems = "center";
	endConditionDiv.style.gap = "8px";

	const endConditionLabel = document.createElement("label");
	endConditionLabel.textContent = "Wave Ends:";
	endConditionLabel.style.minWidth = "80px";
	endConditionDiv.appendChild(endConditionLabel);

	const endConditionSelect = document.createElement("select");
	endConditionSelect.style.padding = "4px 8px";
	endConditionSelect.style.borderRadius = "3px";
	endConditionSelect.style.border = "1px solid rgba(0,255,221,0.4)";
	endConditionSelect.style.background = "rgba(0,0,0,0.45)";
	endConditionSelect.style.color = "#d8ffff";
	endConditionSelect.style.cursor = "pointer";

	const durationOpt = document.createElement("option");
	durationOpt.value = "duration";
	durationOpt.textContent = "After Duration";
	endConditionSelect.appendChild(durationOpt);

	const allEliminatedOpt = document.createElement("option");
	allEliminatedOpt.value = "allEliminated";
	allEliminatedOpt.textContent = "All Mobs Eliminated";
	endConditionSelect.appendChild(allEliminatedOpt);

	const bossOpt = document.createElement("option");
	bossOpt.value = "boss";
	bossOpt.textContent = "Boss Eliminated (No XP)";
	endConditionSelect.appendChild(bossOpt);

	endConditionDiv.appendChild(endConditionSelect);
	waveSection.appendChild(endConditionDiv);
	
	// Create a wrapper container for scale and tracks
	const timelineEditorContainer = document.createElement("div");
	timelineEditorContainer.style.marginTop = "10px";
	timelineEditorContainer.style.background = "#010c14";
	timelineEditorContainer.style.borderRadius = "6px";
	timelineEditorContainer.style.padding = "8px";
	waveSection.appendChild(timelineEditorContainer);
	
	// Scale div (inside editor container)
	const timeScaleDiv = document.createElement("div");
	timeScaleDiv.style.marginTop = "0";
	timeScaleDiv.style.marginBottom = "5px";
	timeScaleDiv.style.display = "block";
	timeScaleDiv.style.height = "30px";
	timeScaleDiv.style.paddingLeft = "112px";
	timeScaleDiv.style.fontSize = "0.75rem";
	timeScaleDiv.style.color = "#7ff9ff";
	timeScaleDiv.style.position = "relative";
	timeScaleDiv.className = "timeline-scale-div";  // Add class for easy reference
	timelineEditorContainer.appendChild(timeScaleDiv);

	// Timeline viewport offset for long waves (> 60 seconds)
	let timelineOffset = 0;  // Time offset in seconds for viewport
	let isDraggingTimeline = false;
	let dragStartX = 0;

	function renderTimeScale(duration) {
		timeScaleDiv.innerHTML = '';
		timeScaleDiv.style.width = (112 + TRACK_WIDTH + 50) + "px";
		
		const isLongWave = duration > 60;
		const viewportDuration = Math.min(duration, 60);  // Show max 60 seconds at a time
		
		// Clamp offset to valid range
		if (isLongWave) {
			timelineOffset = Math.max(0, Math.min(timelineOffset, duration - viewportDuration));
		} else {
			timelineOffset = 0;
		}
		
		// Update cursor and styling based on whether draggable
		if (isLongWave) {
			timeScaleDiv.style.cursor = "grab";
			timeScaleDiv.style.background = "rgba(0, 255, 221, 0.05)";
		} else {
			timeScaleDiv.style.cursor = "default";
			timeScaleDiv.style.background = "transparent";
		}
		
		// Render grid lines with marks at each 0.5 second
		// Major marks every 5 seconds, medium marks every 1 second, minor marks every 0.5 second
		const startTime = isLongWave ? timelineOffset : 0;
		const endTime = isLongWave ? timelineOffset + viewportDuration : duration;
		
		for (let i = Math.floor(startTime * 2) / 2; i <= endTime; i += 0.5) {
			const time = i;
			// For long waves, calculate position within viewport
			const relativeTime = time - timelineOffset;
			const pixelPos = (relativeTime / viewportDuration) * TRACK_WIDTH;
			
			// Skip if outside visible range
			if (pixelPos < -5 || pixelPos > TRACK_WIDTH + 5) continue;
			
			// Determine mark size: 5s (biggest), 1s (medium), 0.5s (smallest)
			let markHeight;
			const is5SecMark = Math.abs(i % 5) < 0.01;
			const is1SecMark = Math.abs(i % 1) < 0.01;
			
			if (is5SecMark) {
				markHeight = "16px";  // Biggest: 5 second marks
			} else if (is1SecMark) {
				markHeight = "10px";  // Medium: 1 second marks
			} else {
				markHeight = "4px";   // Smallest: 0.5 second marks
			}
			
			const mark = document.createElement("div");
			mark.style.position = "absolute";
			mark.style.left = (104 + pixelPos) + "px";
			mark.style.height = markHeight;
			mark.style.width = "1px";
			mark.style.background = "#7ff9ff";
			mark.style.marginLeft = "-0.5px";
			mark.style.marginTop = "0px";
			timeScaleDiv.appendChild(mark);
			
			// Add labels at 5-second intervals
			if (is5SecMark) {
				const label = document.createElement("span");
				label.textContent = i + "s";
				label.style.position = "absolute";
				label.style.left = (104 + pixelPos - 8) + "px";
				label.style.top = "16px";
				label.style.fontSize = "0.7rem";
				label.style.whiteSpace = "nowrap";
				label.style.marginLeft = "-0.5px";
				timeScaleDiv.appendChild(label);
			}
		}

		// Add drag-to-scroll hint for long waves
		if (isLongWave) {
			const hint = document.createElement("div");
			hint.style.position = "absolute";
			hint.style.right = "8px";
			hint.style.top = "2px";
			hint.style.fontSize = "0.6rem";
			hint.style.color = "rgba(0, 255, 221, 0.5)";
			hint.style.pointerEvents = "none";
			hint.textContent = "← Drag to scroll →";
			timeScaleDiv.appendChild(hint);
		}
	}

	// Add drag handler to timeScaleDiv for horizontal scrolling on long waves
	timeScaleDiv.addEventListener("mousedown", (e) => {
		const timeline = loadTimelineData(Math.max(1, selectedWaveState.value || 1));
		if (timeline.duration <= 60) return;  // Only allow drag on long waves
		
		isDraggingTimeline = true;
		dragStartX = e.clientX;
		const startOffset = timelineOffset;
		timeScaleDiv.style.cursor = "grabbing";
		
		const handleDragScale = (moveEvent) => {
			if (!isDraggingTimeline) return;
			
			const deltaX = moveEvent.clientX - dragStartX;
			const viewportDuration = 60;  // Max visible at once
			const deltaTime = -(deltaX / TRACK_WIDTH) * viewportDuration;
			
			timelineOffset = startOffset + deltaTime;
			timelineOffset = Math.max(0, Math.min(timelineOffset, timeline.duration - viewportDuration));
			
			renderTimeScale(timeline.duration);
			
			// Update all track dots to reflect new scroll position
			MOB_TYPES.forEach(mob => {
				if (renderAllDots[mob]) renderAllDots[mob]();
			});
		};
		
		const handleDragEnd = () => {
			isDraggingTimeline = false;
			timeScaleDiv.style.cursor = "grab";
			document.removeEventListener("mousemove", handleDragScale);
			document.removeEventListener("mouseup", handleDragEnd);
		};
		
		document.addEventListener("mousemove", handleDragScale);
		document.addEventListener("mouseup", handleDragEnd);
	});

	// Timeline tracks container (inside editor container)
	const timelineTracksDiv = document.createElement("div");
	timelineTracksDiv.style.marginTop = "0";
	timelineTracksDiv.style.background = "transparent";
	timelineTracksDiv.style.borderRadius = "0";
	timelineTracksDiv.style.padding = "0";
	timelineEditorContainer.appendChild(timelineTracksDiv);

	// Selection system: track which events are selected per mob type (persistent across re-renders)
	const selectedEvents = {};  // { mobType: Set of event indices }
	MOB_TYPES.forEach(mob => selectedEvents[mob] = new Set());

	// Store render functions so we can update all tracks (persistent across re-renders)
	const renderAllDots = {};

	function renderTimelineTrack(waveNum) {
		timelineTracksDiv.innerHTML = '';
		timelineOffset = 0;  // Reset viewport scroll when switching waves
		const timeline = loadTimelineData(waveNum);
		durationInput.value = timeline.duration;
		endConditionSelect.value = timeline.endCondition || 'duration';
		renderTimeScale(timeline.duration);

		MOB_TYPES.forEach(mob => {
			const track = document.createElement("div");
			track.style.display = "flex";
			track.style.alignItems = "center";
			track.style.marginBottom = "8px";
			track.style.fontSize = "0.85rem";

			const mobLabel = document.createElement("span");
			mobLabel.textContent = MOB_LABELS[mob];
			mobLabel.style.width = "100px";
			mobLabel.style.color = "#7ff9ff";
			mobLabel.style.flexShrink = "0";
			track.appendChild(mobLabel);

			const eventsDiv = document.createElement("div");
			eventsDiv.style.flex = "0 0 " + TRACK_WIDTH + "px";
			eventsDiv.style.position = "relative";
			eventsDiv.style.height = "32px";
			eventsDiv.style.background = "#0a1a22";
			eventsDiv.style.borderRadius = "4px";
			eventsDiv.style.marginLeft = "6px";
			eventsDiv.style.border = "1px solid rgba(0, 255, 221, 0.2)";
			eventsDiv.style.overflow = "visible";
			eventsDiv.style.cursor = "default";

			// Drag-select box
			const selectionBox = document.createElement("div");
			selectionBox.style.position = "absolute";
			selectionBox.style.background = "rgba(0, 255, 221, 0.15)";
			selectionBox.style.border = "2px dashed rgba(0, 255, 221, 0.5)";
			selectionBox.style.display = "none";
			selectionBox.style.zIndex = "2";
			eventsDiv.appendChild(selectionBox);

			// Track drag state for this track
			let selectStartX = null;
			let isSelectDragging = false;
			let isDotDragging = false;
			let dragDistance = 0;

			// Create dots for all events
			const dotsMap = new Map();  // event index -> dot element
			
			const renderDots = () => {
				// Clear existing dots
				const existingDots = eventsDiv.querySelectorAll('div[data-event-dot="true"]');
				existingDots.forEach(dot => dot.remove());
				dotsMap.clear();
				const isLongWave = timeline.duration > 60;
				const viewportDuration = isLongWave ? 60 : timeline.duration;

				timeline.mobs[mob].forEach((evt, idx) => {
					// For long waves, calculate position relative to viewport
					const relativeTime = evt.time - timelineOffset;
					const pixelX = (relativeTime / viewportDuration) * TRACK_WIDTH;
					
					// Skip rendering if outside viewport
					if (isLongWave && (evt.time < timelineOffset || evt.time > timelineOffset + viewportDuration)) {
						return;  // Don't render dots outside viewport
					}
					const dot = document.createElement("div");
					dot.setAttribute("data-event-dot", "true");
					dot.style.position = "absolute";
					dot.style.left = (pixelX - 12) + "px";
					dot.style.top = "4px";
					dot.style.width = "24px";
					dot.style.height = "24px";
					dot.style.borderRadius = "50%";
					dot.style.textAlign = "center";
					dot.style.lineHeight = "24px";
					dot.style.cursor = "grab";
					dot.style.fontSize = "0.8rem";
					dot.style.fontWeight = "bold";
					dot.style.userSelect = "none";
					dot.style.zIndex = "5";
					dot.style.transition = "all 0.1s";
					dot.textContent = evt.amount;

					// Highlight if selected
					const isSelected = selectedEvents[mob].has(idx);
					if (isSelected) {
						dot.style.background = "#ffff00";
						dot.style.color = "#000";
						dot.style.boxShadow = "0 0 8px rgba(255, 255, 0, 0.8)";
					} else {
						dot.style.background = "#00ffdd";
						dot.style.color = "#0a1a22";
					}

					const eventMode = evt.mode || 'event';
					dot.title = `Time: ${evt.time.toFixed(2)}s, Amount: ${evt.amount}, Mode: ${eventMode}\nClick: select | Shift+Click: toggle | Drag: move\nRight-click to delete`;

					// Individual dot drag handling
					dot.addEventListener("mousedown", (e) => {
						if (e.button !== 0) return;
						e.preventDefault();
						e.stopPropagation();

						// If clicking unselected, select just this one
						if (!selectedEvents[mob].has(idx)) {
							selectedEvents[mob].clear();
							selectedEvents[mob].add(idx);
							renderDots();
							return;
						}

						isDotDragging = true;
						dragDistance = 0;
						let dragStartX = e.clientX;
						let dragStartY = e.clientY;
						let dragMode = null;

						// Store initial state for all selected events
						const startStates = Array.from(selectedEvents[mob]).map(eventIdx => ({
							idx: eventIdx,
							time: timeline.mobs[mob][eventIdx].time,
							amount: timeline.mobs[mob][eventIdx].amount
						}));

						const tooltip = document.createElement("div");
						tooltip.style.position = "fixed";
						tooltip.style.background = "rgba(0, 0, 0, 0.9)";
						tooltip.style.color = "#00ffdd";
						tooltip.style.padding = "4px 8px";
						tooltip.style.borderRadius = "3px";
						tooltip.style.fontSize = "0.7rem";
						tooltip.style.whiteSpace = "nowrap";
						tooltip.style.pointerEvents = "none";
						tooltip.style.zIndex = "9999";
						tooltip.style.border = "1px solid #00ffdd";
						tooltip.style.display = "none";
						document.body.appendChild(tooltip);

						const handleMouseMove = (moveEvent) => {
							if (!isDotDragging) return;

							const deltaX = moveEvent.clientX - dragStartX;
							const deltaY = moveEvent.clientY - dragStartY;
							const absDeltaX = Math.abs(deltaX);
							const absDeltaY = Math.abs(deltaY);
							dragDistance = Math.max(dragDistance, Math.sqrt(absDeltaX * absDeltaX + absDeltaY * absDeltaY));

							// Determine drag mode
							if (dragMode === null) {
								if (absDeltaX > absDeltaY && absDeltaX > 5) {
									dragMode = 'horizontal';
								} else if (absDeltaY > absDeltaX && absDeltaY > 5) {
									dragMode = 'vertical';
								}
							}

							if (dragMode === 'horizontal') {
								// Move all selected events
								const isLongWave = timeline.duration > 60;
								const viewportDuration = isLongWave ? 60 : timeline.duration;
								const deltaTime = (deltaX / TRACK_WIDTH) * viewportDuration;

								startStates.forEach(({idx: eventIdx, time: origTime}) => {
									let newTime = origTime + deltaTime;
									newTime = Math.max(0, Math.min(timeline.duration - 0.01, newTime));
									timeline.mobs[mob][eventIdx].time = newTime;
								});

								// Show tooltip
								const firstTime = timeline.mobs[mob][startStates[0].idx].time;
								tooltip.textContent = `${startStates.length} event(s): ${(Math.round(firstTime * 2) / 2).toFixed(1)}s`;
								tooltip.style.display = "block";
								tooltip.style.left = (moveEvent.clientX + 10) + "px";
								tooltip.style.top = (moveEvent.clientY + 10) + "px";

								renderDots();
							} else if (dragMode === 'vertical' && selectedEvents[mob].size === 1) {
								// Adjust single event amount
								const amountDelta = Math.round(deltaY / -20);
								let newAmount = startStates[0].amount + amountDelta;
								newAmount = Math.max(1, Math.min(100, newAmount));
								timeline.mobs[mob][startStates[0].idx].amount = newAmount;
								renderDots();
							}
						};

					const handleMouseUp = (upEvent) => {
						if (!isDotDragging) return;
						isDotDragging = false;
						tooltip.remove();

						if (dragMode === 'horizontal') {
							// Snap to grid
							selectedEvents[mob].forEach(eventIdx => {
								timeline.mobs[mob][eventIdx].time = snapToGrid(timeline.mobs[mob][eventIdx].time);
							});
						}

						dragMode = null;
						document.removeEventListener("mousemove", handleMouseMove);
						document.removeEventListener("mouseup", handleMouseUp);
						renderDots();
					};

					document.addEventListener("mousemove", handleMouseMove);
					document.addEventListener("mouseup", handleMouseUp);
					});

					// Selection handling
					dot.addEventListener("click", (e) => {
						if (isDotDragging) return;
						e.stopPropagation();
						// ALWAYS clear selections in OTHER mobs (even with Ctrl)
						let hasOtherSelections = false;
						MOB_TYPES.forEach(m => {
							if (m !== mob && selectedEvents[m].size > 0) {
								hasOtherSelections = true;
								selectedEvents[m].clear();
							}
						});
						
						// If we cleared other mobs, render them
						if (hasOtherSelections) {
							MOB_TYPES.forEach(m => {
								if (m !== mob && renderAllDots[m]) renderAllDots[m]();
							});
						}

						if (e.shiftKey) {
							// Shift+click: toggle
							if (selectedEvents[mob].has(idx)) {
								selectedEvents[mob].delete(idx);
							} else {
								selectedEvents[mob].add(idx);
							}
							renderDots();
						} else if (e.ctrlKey || e.metaKey) {
							// Ctrl/Cmd+click: add to selection in SAME slider
							selectedEvents[mob].add(idx);
							renderDots();
						} else {
							// Single select - clear this slider, select just this one
							selectedEvents[mob].clear();
							selectedEvents[mob].add(idx);
							renderDots();
						}
					});

					// Right-click to delete
					dot.addEventListener("contextmenu", (e) => {
						e.preventDefault();
						e.stopPropagation();

						// Delete all selected events
						const indicesToDelete = Array.from(selectedEvents[mob]).sort((a, b) => b - a);
						indicesToDelete.forEach(idxToDelete => {
							timeline.mobs[mob].splice(idxToDelete, 1);
						});
						selectedEvents[mob].clear();
						renderDots();
					});

				eventsDiv.appendChild(dot);
				dotsMap.set(idx, dot);
			});
		};

		// Store render function for global updates
		renderAllDots[mob] = renderDots;
			// Initial dot render
			renderDots();

			// Drag-select on background
			eventsDiv.addEventListener("mousedown", (e) => {
				if (e.button !== 0) return;
				
				// Don't start drag-select if clicking on a dot
				if (e.target.getAttribute("data-event-dot") === "true") return;
				if (isDotDragging) return;

				isSelectDragging = true;
				dragDistance = 0;  // Reset distance tracker for this drag-select
				selectStartX = e.clientX - eventsDiv.getBoundingClientRect().left;
				const isCtrlHeld = e.ctrlKey || e.metaKey;  // Remember if Ctrl is held
				selectionBox.style.left = selectStartX + "px";
				selectionBox.style.top = "0px";
				selectionBox.style.width = "0px";
				selectionBox.style.height = "32px";
				selectionBox.style.display = "block";

				const handleSelectMove = (moveEvent) => {
					if (!isSelectDragging) return;

					const currentX = moveEvent.clientX - eventsDiv.getBoundingClientRect().left;
					const startX = Math.min(selectStartX, currentX);
					const endX = Math.max(selectStartX, currentX);
					const width = endX - startX;

					selectionBox.style.left = startX + "px";
					selectionBox.style.width = width + "px";
				};

				const handleSelectEnd = (upEvent) => {
					if (!isSelectDragging) return;
					isSelectDragging = false;
					selectionBox.style.display = "none";

					const currentX = upEvent.clientX - eventsDiv.getBoundingClientRect().left;
					const startX = Math.min(selectStartX, currentX);
					const endX = Math.max(selectStartX, currentX);
					dragDistance = Math.abs(endX - startX);  // Track the drag distance
					
					// Calculate time accounting for viewport offset on long waves
					const isLongWave = timeline.duration > 60;
					const viewportDuration = isLongWave ? 60 : timeline.duration;
					const startTime = (startX / TRACK_WIDTH) * viewportDuration + timelineOffset;
					const endTime = (endX / TRACK_WIDTH) * viewportDuration + timelineOffset;

					// If NOT Ctrl+drag: clear ALL selections first
					if (!isCtrlHeld) {
						MOB_TYPES.forEach(m => selectedEvents[m].clear());
					}

					// Select ONLY events in the drag range
					timeline.mobs[mob].forEach((evt, eventIdx) => {
						if (evt.time >= startTime && evt.time <= endTime) {
							selectedEvents[mob].add(eventIdx);
						}
					});

					// Render all tracks to show updated selections
					MOB_TYPES.forEach(m => {
						if (renderAllDots[m]) renderAllDots[m]();
					});

					document.removeEventListener("mousemove", handleSelectMove);
					document.removeEventListener("mouseup", handleSelectEnd);
				};

				document.addEventListener("mousemove", handleSelectMove);
				document.addEventListener("mouseup", handleSelectEnd);
			});

			// Click on empty track to create event or deselect
			eventsDiv.addEventListener("click", (e) => {
				// Don't react if we just had significant drag
				if (isDotDragging || isSelectDragging) return;
				if (dragDistance > 3) return;  // Simple drag threshold
				if (e.target.getAttribute("data-event-dot") === "true") return;

				e.stopPropagation();  // Stop propagation to prevent global deselect handler

				const rect = eventsDiv.getBoundingClientRect();
				const clickX = e.clientX - rect.left;
				
				// Calculate clicked time accounting for viewport offset
				const isLongWave = timeline.duration > 60;
				const viewportDuration = isLongWave ? 60 : timeline.duration;
				let clickedTime = (clickX / TRACK_WIDTH) * viewportDuration + timelineOffset;
				clickedTime = snapToGrid(clickedTime);
				clickedTime = Math.max(0, Math.min(timeline.duration - 0.01, clickedTime));

				// Check collision
				const collision = timeline.mobs[mob].some(evt => Math.abs(evt.time - clickedTime) < 0.5);
				if (collision) {
					return;
				}

				// Deselect all events in all mobs
				MOB_TYPES.forEach(m => selectedEvents[m].clear());

				// Add new event and select it
				timeline.mobs[mob].push({ time: clickedTime, amount: 1, mode: 'event' });
				const newEventIndex = timeline.mobs[mob].length - 1;  // Index of newly created event
				selectedEvents[mob].add(newEventIndex);  // Select the new event
				// Render all tracks to deselect others and show new event selected
				MOB_TYPES.forEach(m => {
					if (renderAllDots[m]) renderAllDots[m]();
				});
			});

			// Suppress context menu on empty track, only allow on events
			eventsDiv.addEventListener("contextmenu", (e) => {
				if (e.target.getAttribute("data-event-dot") !== "true") {
					e.preventDefault();
				}
			});

			track.appendChild(eventsDiv);

			// Input controls for adding new events
			const inputWrap = document.createElement("div");
			inputWrap.style.display = "flex";
			inputWrap.style.gap = "8px";
			inputWrap.style.alignItems = "center";
			inputWrap.style.marginLeft = "6px";

			const timeInput = document.createElement("input");
			timeInput.type = "number";
			timeInput.placeholder = "Time (s)";
			timeInput.min = "0";
			timeInput.step = "1";
			timeInput.style.width = "60px";
			timeInput.style.padding = "4px";
			timeInput.style.borderRadius = "3px";
			timeInput.style.border = "1px solid rgba(0,255,221,0.4)";
			timeInput.style.background = "rgba(0,0,0,0.45)";
			timeInput.style.color = "#d8ffff";
			timeInput.style.fontSize = "0.75rem";
			inputWrap.appendChild(timeInput);

			const modeSelect = document.createElement("select");
			modeSelect.style.width = "70px";
			modeSelect.style.padding = "4px";
			modeSelect.style.borderRadius = "3px";
			modeSelect.style.border = "1px solid rgba(0,255,221,0.4)";
			modeSelect.style.background = "rgba(0,0,0,0.45)";
			modeSelect.style.color = "#d8ffff";
			modeSelect.style.fontSize = "0.75rem";
			
			const eventOption = document.createElement("option");
			eventOption.value = "event";
			eventOption.textContent = "Event";
			modeSelect.appendChild(eventOption);
			
			const intervalOption = document.createElement("option");
			intervalOption.value = "interval";
			intervalOption.textContent = "Interval";
			modeSelect.appendChild(intervalOption);
			
			modeSelect.value = "event";
			inputWrap.appendChild(modeSelect);

			const amountInput = document.createElement("input");
			amountInput.type = "number";
			amountInput.placeholder = "#";
			amountInput.min = "1";
			amountInput.max = "100";
			amountInput.step = "1";
			amountInput.style.width = "50px";
			amountInput.style.padding = "4px";
			amountInput.style.borderRadius = "3px";
			amountInput.style.border = "1px solid rgba(0,255,221,0.4)";
			amountInput.style.background = "rgba(0,0,0,0.45)";
			amountInput.style.color = "#d8ffff";
			amountInput.style.fontSize = "0.75rem";
			inputWrap.appendChild(amountInput);

			const addBtn = document.createElement("button");
			addBtn.textContent = "+";
			addBtn.type = "button";
			addBtn.style.padding = "4px 8px";
			addBtn.style.cursor = "pointer";
			addBtn.style.background = "#00ffdd";
			addBtn.style.color = "#0a1a22";
			addBtn.style.border = "none";
			addBtn.style.borderRadius = "4px";
			addBtn.style.fontWeight = "bold";
			addBtn.style.flexShrink = "0";
			addBtn.onclick = () => {
				const currentWaveNum = Math.max(1, selectedWaveState.value || 1);
				const timeline = loadTimelineData(currentWaveNum);
				
				// Get input values or generate random
				let newTime = timeInput.value ? parseFloat(timeInput.value) : Math.random() * (timeline.duration - 1);
				let newAmount = amountInput.value ? parseInt(amountInput.value) : 1;
				
				// Snap time to grid
				newTime = snapToGrid(newTime);
				
				// Clamp values
				newTime = Math.max(0, Math.min(timeline.duration - 0.01, newTime));
				newAmount = Math.max(1, Math.min(100, newAmount));
				
				// Check for collision with existing events at this time (within 0.5s tolerance)
				const collision = timeline.mobs[mob].some(evt => Math.abs(evt.time - newTime) < 0.5);
				if (collision) {
					return;
				}
				
				// Deselect all events in all mobs
				MOB_TYPES.forEach(m => selectedEvents[m].clear());

				// Add events - if interval mode, create individual events for each spawn time
				const eventMode = modeSelect.value || 'event';
				if (eventMode === 'interval') {
					// Expand interval into individual events
					let currentTime = newTime;
					let addedCount = 0;
					const startIndex = timeline.mobs[mob].length;
					while (currentTime <= timeline.duration) {
						timeline.mobs[mob].push({ time: currentTime, amount: newAmount, mode: 'event' });
						selectedEvents[mob].add(timeline.mobs[mob].length - 1);  // Select each new event
						addedCount++;
						currentTime += newTime;  // newTime is the interval duration
					}
				} else {
					timeline.mobs[mob].push({ time: newTime, amount: newAmount, mode: 'event' });
					selectedEvents[mob].add(timeline.mobs[mob].length - 1);  // Select the new event
				}
				// Clear inputs
				timeInput.value = '';
				amountInput.value = '';
				modeSelect.value = 'event';
				
				renderTimelineTrack(currentWaveNum);
			};
			inputWrap.appendChild(addBtn);

			const clearBtn = document.createElement("button");
			clearBtn.textContent = "X";
			clearBtn.type = "button";
			clearBtn.style.padding = "4px 8px";
			clearBtn.style.cursor = "pointer";
			clearBtn.style.background = "#ff4444";
			clearBtn.style.color = "#fff";
			clearBtn.style.border = "none";
			clearBtn.style.borderRadius = "4px";
			clearBtn.style.fontWeight = "bold";
			clearBtn.style.flexShrink = "0";
			clearBtn.style.marginLeft = "4px";
			clearBtn.onclick = () => {
				const currentWaveNum = Math.max(1, selectedWaveState.value || 1);
				const timeline = loadTimelineData(currentWaveNum);
				timeline.mobs[mob] = [];
				renderTimelineTrack(currentWaveNum);
			};
			inputWrap.appendChild(clearBtn);

			track.appendChild(inputWrap);

			timelineTracksDiv.appendChild(track);
		});
	}

	// Global click handler to deselect when clicking outside tracks
	document.addEventListener("click", (e) => {
		// Only deselect if not clicking on an event dot
		if (e.target.getAttribute("data-event-dot") === "true") return;
		// Only deselect if not inside any track
		if (timelineTracksDiv.contains(e.target)) return;
		
		// Clear selection on all mobs
		MOB_TYPES.forEach(m => selectedEvents[m].clear());
		// Render all tracks to deselect
		MOB_TYPES.forEach(m => {
			if (renderAllDots[m]) renderAllDots[m]();
		});
	});

	const waveNumValue = Math.max(1, selectedWaveState.value || 1);
	renderTimelineTrack(waveNumValue);

	durationInput.addEventListener("change", () => {
		const currentWaveNum = Math.max(1, selectedWaveState.value || 1);
		const timeline = loadTimelineData(currentWaveNum);
		timeline.duration = Math.max(1, Number(durationInput.value) || 30);
		timelineOffset = 0;  // Reset viewport scroll when duration changes
		renderTimelineTrack(currentWaveNum);
	});

	endConditionSelect.addEventListener("change", () => {
		const currentWaveNum = Math.max(1, selectedWaveState.value || 1);
		const timeline = loadTimelineData(currentWaveNum);
		timeline.endCondition = endConditionSelect.value || 'duration';
	});

	return {
		getTimelineData: (waveNum) => loadTimelineData(waveNum),
		renderTimeline: renderTimelineTrack,
		refresh: () => {
			const currentWaveNum = Math.max(1, selectedWaveState.value || 1);
			const timeline = loadTimelineData(currentWaveNum);
			durationInput.value = timeline.duration;
			renderTimelineTrack(currentWaveNum);
		},
		// Save working copy to persistent storage (called when Apply Wave is clicked)
		saveWorkingCopy: (targetWaveNum) => {
			if (window._timelineWorkingCopy.data) {
				waveTimelines[targetWaveNum] = deepCopyTimeline(window._timelineWorkingCopy.data);
			}
		},
		// Discard working copy (called when user loads a different wave or clears)
		discardWorkingCopy: () => {
			window._timelineWorkingCopy = { waveNum: null, data: null };
		}
	};
}

window.SentinelTimelineEditorHelper = {
	createNewTimelineWaveEditor
};
