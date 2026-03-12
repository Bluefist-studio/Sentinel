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
			console.log(`[TimelineEditor] Using working copy for wave ${waveNum}`);
			return window._timelineWorkingCopy.data;
		}
		
		console.log(`[TimelineEditor] Loading fresh timeline for wave ${waveNum}`);
		
		// Different wave - discard old working copy and create new one
		// Priority: localStorage overrides > session overrides (from code waves) > local storage
		let sourceData = null;
		
		// Check for localStorage override first (applied edits from editor UI)
		if (typeof window.waveEditorOverrides !== "undefined" && window.waveEditorOverrides[waveNum]) {
			const override = window.waveEditorOverrides[waveNum];
			// Extract timeline data from override structure
			sourceData = override.timeline || override;
			console.log(`[TimelineEditor] Loading wave ${waveNum} from localStorage override:`, sourceData);
		}
		// Fallback: Check session override (from detected code waves in waveControl.js)
		else if (typeof window._editorWaveOverride !== "undefined" && window._editorWaveOverride[waveNum]) {
			const override = window._editorWaveOverride[waveNum];
			sourceData = override.timeline || override;
			console.log(`[TimelineEditor] Loading wave ${waveNum} from session override (code wave):`, sourceData);
		}
		// Final fallback: Use local timeline storage
		else {
			console.log(`[TimelineEditor] No overrides found for wave ${waveNum}, using local storage`);
			// Fall back to persistent storage
			if (!waveTimelines[waveNum]) {
				waveTimelines[waveNum] = { duration: 30, endCondition: 'duration', mobs: {} };
				MOB_TYPES.forEach(mob => waveTimelines[waveNum].mobs[mob] = []);
				
				// Try to auto-load from code wave if available
				tryLoadCodeWaveAsTimeline(waveNum);
			}
			sourceData = waveTimelines[waveNum];
		}
		
		console.log(`[TimelineEditor] Source data for wave ${waveNum}:`, sourceData);
		
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
		console.log(`[TimelineEditor] Created working copy:`, window._timelineWorkingCopy.data);
		return window._timelineWorkingCopy.data;
	}

	function tryLoadCodeWaveAsTimeline(waveNum) {
		// Check if SentinelEditor has a code for this wave
		if (!window.SentinelEditor || typeof window.SentinelEditor.getWaveConfigFromCode !== "function") {
			return;
		}

		// Get the wave code
		let code = null;
		if (window.SentinelWaveEditorCodes && window.SentinelWaveEditorCodes[waveNum]) {
			code = window.SentinelWaveEditorCodes[waveNum];
		}

		if (!code) return;

		try {
			// Decode the code wave
			const config = window.SentinelEditor.getWaveConfigFromCode(code, waveNum);
			if (!config) return;

			// IMPORTANT: Check if code wave is ALREADY timeline-based (not a burst config)
			if (config.timelineMode && config.timeline) {
				console.log(`[TimelineEditor] Code wave ${waveNum} is already timeline-based. Loading directly from code.`);
				const timeline = waveTimelines[waveNum];
				timeline.duration = config.timeline.duration || 30;
				timeline.endCondition = config.timeline.endCondition || 'duration';
				timeline.mobs = deepCopyTimeline(config.timeline).mobs;
				return;
			}

			// Otherwise, convert burst-based config to timeline format
			console.log(`[TimelineEditor] Converting burst-based code wave ${waveNum} to timeline format...`, config);

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

			console.log(`[TimelineEditor] Wave ${waveNum} converted from code. Events:`, timeline.mobs);
		} catch (err) {
			console.error(`[TimelineEditor] Failed to convert code wave ${waveNum}:`, err);
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

	function renderTimeScale(duration) {
		timeScaleDiv.innerHTML = '';
		timeScaleDiv.style.width = (112 + TRACK_WIDTH + 50) + "px";
		
		// Render grid lines with marks at each 0.5 second
		// Major marks every 5 seconds, medium marks every 1 second, minor marks every 0.5 second
		for (let i = 0; i <= duration; i += 0.5) {
			const time = i;
			const pixelPos = (time / duration) * TRACK_WIDTH;
			
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
			
			// DEBUG: Log scale positions for first few marks
			if (i <= 10) {
				console.log(`[Scale] Time ${i}s: pixelPos=${pixelPos}, absolute left=${106 + pixelPos}px`);
			}
			
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
	}

	// Timeline tracks container (inside editor container)
	const timelineTracksDiv = document.createElement("div");
	timelineTracksDiv.style.marginTop = "0";
	timelineTracksDiv.style.background = "transparent";
	timelineTracksDiv.style.borderRadius = "0";
	timelineTracksDiv.style.padding = "0";
	timelineEditorContainer.appendChild(timelineTracksDiv);

	function renderTimelineTrack(waveNum) {
		timelineTracksDiv.innerHTML = '';
		const timeline = loadTimelineData(waveNum);
		durationInput.value = timeline.duration;
		endConditionSelect.value = timeline.endCondition || 'duration';
		renderTimeScale(timeline.duration);

		let isDragging = false;  // Track if currently dragging a dot
		let dragStartX = 0;
		let dragStartY = 0;

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

			timeline.mobs[mob].forEach((evt, idx) => {
				const pixelX = (evt.time / timeline.duration) * TRACK_WIDTH;
				const dot = document.createElement("div");
					dot.style.position = "absolute";
					dot.style.left = (pixelX - 14) + "px";  // Dot is 24px wide, center at pixelX
				dot.style.top = "4px";
				dot.style.width = "24px";
				dot.style.height = "24px";
				dot.style.background = "#00ffdd";
				dot.style.color = "#0a1a22";
				dot.style.borderRadius = "50%";
				dot.style.textAlign = "center";
				dot.style.lineHeight = "24px";
			dot.style.cursor = "grab";
				dot.style.fontSize = "0.8rem";
				dot.style.fontWeight = "bold";
				dot.style.userSelect = "none";
				dot.style.zIndex = "5";
				dot.textContent = evt.amount;
				const eventMode = evt.mode || 'event';
				dot.title = `Time: ${evt.time.toFixed(2)}s, Amount: ${evt.amount}, Mode: ${eventMode}\nDrag left/right to move\nDrag up/down to adjust amount\nRight-click to delete`;
			
				// DEBUG: Log exact positioning
				console.log(`[Dot Position] Wave ${waveNum}, ${mob}: time=${evt.time}s, duration=${timeline.duration}s, pixelX=${pixelX}`);
				
				let startTime = evt.time;
				let startAmount = evt.amount;
				let dragMode = null;  // 'horizontal' or 'vertical'

				dot.addEventListener("mousedown", (e) => {
					if (e.button !== 0) return;  // Only left mouse button
					e.preventDefault();
					
					isDragging = true;
					dragStartX = e.clientX;
					dragStartY = e.clientY;
					startTime = evt.time;  // Always track the base event time
					startAmount = evt.amount;
					dragMode = null;
					dot.style.cursor = "grabbing";
					dot.style.zIndex = "20";

				// Create tooltip for time display during drag (but don't add to DOM yet)
				const tooltip = document.createElement("div");
				tooltip.style.position = "absolute";
				tooltip.style.background = "rgba(0, 0, 0, 0.9)";
				tooltip.style.color = "#00ffdd";
				tooltip.style.padding = "4px 8px";
				tooltip.style.borderRadius = "3px";
				tooltip.style.fontSize = "0.7rem";
				tooltip.style.whiteSpace = "nowrap";
				tooltip.style.pointerEvents = "none";
				tooltip.style.zIndex = "30";
				tooltip.style.border = "1px solid #00ffdd";
				tooltip.textContent = `${(Math.round(startTime * 2) / 2).toFixed(1)}s`;
				let tooltipAdded = false;

				const handleMouseMove = (moveEvent) => {
					if (!isDragging) return;
					
					const deltaX = moveEvent.clientX - dragStartX;
					const deltaY = moveEvent.clientY - dragStartY;
					const absDeltaX = Math.abs(deltaX);
					const absDeltaY = Math.abs(deltaY);
					
					// Determine drag mode based on initial movement direction
					if (dragMode === null) {
						if (absDeltaX > absDeltaY && absDeltaX > 5) {
							dragMode = 'horizontal';
						} else if (absDeltaY > absDeltaX && absDeltaY > 5) {
							dragMode = 'vertical';
						}
					}
					
					if (dragMode === 'horizontal') {
						// Add tooltip on first horizontal drag
						if (!tooltipAdded) {
							eventsDiv.appendChild(tooltip);
							tooltipAdded = true;
						}
						
						// Move dot horizontally
						const deltaTime = (deltaX / TRACK_WIDTH) * timeline.duration;
						let newTime = startTime + deltaTime;
						newTime = Math.max(0, Math.min(timeline.duration - 0.01, newTime));
						const newPixelX = (newTime / timeline.duration) * TRACK_WIDTH;
						dot.style.left = (newPixelX - 12) + "px";
						
						// Update tooltip with current time
					tooltip.textContent = `${(Math.round(newTime * 2) / 2).toFixed(1)}s`;
						tooltip.style.left = (newPixelX - 20) + "px";
						tooltip.style.top = "-28px";
					} else if (dragMode === 'vertical') {
						// Adjust amount vertically (every 20px = 1 mob)
						const amountDelta = Math.round(deltaY / -20);
						let newAmount = startAmount + amountDelta;
						newAmount = Math.max(1, Math.min(100, newAmount));
						evt.amount = newAmount;
						dot.textContent = newAmount;
						dot.title = `Time: ${evt.time.toFixed(2)}s, Amount: ${evt.amount}\nDrag right/left to move\nDrag up/down to adjust amount\nRight-click to delete`;
					}
				};

				const handleMouseUp = (upEvent) => {
					if (!isDragging) return;
					isDragging = false;
					dot.style.cursor = "grab";
					dot.style.zIndex = "5";

					// Remove tooltip
					if (tooltip.parentNode) {
						tooltip.parentNode.removeChild(tooltip);
					}

					if (dragMode === 'horizontal') {
						// Finalize horizontal drag (snap to grid, re-render)
						const deltaX = upEvent.clientX - dragStartX;
						const deltaTime = (deltaX / TRACK_WIDTH) * timeline.duration;
						let newTime = startTime + deltaTime;
						newTime = Math.max(0, Math.min(timeline.duration - 0.01, newTime));
						newTime = snapToGrid(newTime);
						evt.time = newTime;
						dot.title = `Time: ${evt.time.toFixed(2)}s, Amount: ${evt.amount}\nDrag right/left to move\nDrag up/down to adjust amount\nRight-click to delete`;
						renderTimelineTrack(waveNum);
					}
					// Vertical drag changes are already applied during move
					
					dragMode = null;
					document.removeEventListener("mousemove", handleMouseMove);
					document.removeEventListener("mouseup", handleMouseUp);
				};

				document.addEventListener("mousemove", handleMouseMove);
				document.addEventListener("mouseup", handleMouseUp);
			});

				// Right-click to remove
				dot.addEventListener("contextmenu", (e) => {
					e.preventDefault();
					timeline.mobs[mob].splice(idx, 1);
					renderTimelineTrack(waveNum);
				});

				eventsDiv.appendChild(dot);
			});

			track.appendChild(eventsDiv);

			// Click on slider to add dot at clicked position
			eventsDiv.addEventListener("click", (clickEvent) => {
				// Only create event if not dragging (left button released click)
				if (isDragging) return;
				
				const rect = eventsDiv.getBoundingClientRect();
				const clickX = clickEvent.clientX - rect.left;
				
				// Calculate time from click position
				let clickedTime = (clickX / TRACK_WIDTH) * timeline.duration;
				clickedTime = snapToGrid(clickedTime);
				clickedTime = Math.max(0, Math.min(timeline.duration - 0.01, clickedTime));
				
				// Check for collision with existing events (within 0.5s tolerance)
				const collision = timeline.mobs[mob].some(evt => Math.abs(evt.time - clickedTime) < 0.5);
				if (collision) {
					console.log(`[TimelineEditor] Cannot add: dot already exists near ${clickedTime}s`);
					return;
				}
				
				// Add new event with default amount of 1 and event mode
				timeline.mobs[mob].push({ time: clickedTime, amount: 1, mode: 'event' });
				console.log(`[TimelineEditor] Added event by click: wave ${waveNum}, mob ${mob}, time=${clickedTime}s, amount=1, mode=event`);
				
				renderTimelineTrack(waveNum);
			});

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
					console.log(`[TimelineEditor] Cannot add: dot already exists near ${newTime}s`);
					return;
				}
				
				// Add events - if interval mode, create individual events for each spawn time
				const eventMode = modeSelect.value || 'event';
				if (eventMode === 'interval') {
					// Expand interval into individual events
					let currentTime = newTime;
					let addedCount = 0;
					while (currentTime <= timeline.duration) {
						timeline.mobs[mob].push({ time: currentTime, amount: newAmount, mode: 'event' });
						addedCount++;
						currentTime += newTime;  // newTime is the interval duration
					}
					console.log(`[TimelineEditor] Added ${addedCount} dots from interval: wave ${currentWaveNum}, mob ${mob}, start=${newTime}s, interval=${newTime}s, amount=${newAmount}`);
				} else {
					timeline.mobs[mob].push({ time: newTime, amount: newAmount, mode: 'event' });
					console.log(`[TimelineEditor] Added event: wave ${currentWaveNum}, mob ${mob}, time=${newTime}s, amount=${newAmount}, mode=event`);
				}
				console.log(`[TimelineEditor] Timeline data now:`, JSON.stringify(timeline));
				
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
				console.log(`[TimelineEditor] Cleared all events for ${mob} on wave ${currentWaveNum}`);
				renderTimelineTrack(currentWaveNum);
			};
			inputWrap.appendChild(clearBtn);

			track.appendChild(inputWrap);

			timelineTracksDiv.appendChild(track);
		});
	}

	const waveNumValue = Math.max(1, selectedWaveState.value || 1);
	renderTimelineTrack(waveNumValue);

	durationInput.addEventListener("change", () => {
		const currentWaveNum = Math.max(1, selectedWaveState.value || 1);
		const timeline = loadTimelineData(currentWaveNum);
		timeline.duration = Math.max(1, Number(durationInput.value) || 30);
		renderTimelineTrack(currentWaveNum);
	});

	endConditionSelect.addEventListener("change", () => {
		const currentWaveNum = Math.max(1, selectedWaveState.value || 1);
		const timeline = loadTimelineData(currentWaveNum);
		timeline.endCondition = endConditionSelect.value || 'duration';
		console.log(`[TimelineEditor] Wave ${currentWaveNum} end condition set to: ${timeline.endCondition}`);
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
				console.log(`[TimelineEditor] Working copy saved to wave ${targetWaveNum}`);
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
