/*!
radar.js

Created by David Rowe on 19 Nov 2017.
Copyright 2017-2020 David Rowe.

Information: http://ctrlaltstudio.com/vircadia/radar

Distributed under the Apache License, Version 2.0.
See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
*/

/* global EventBridge */
/* eslint-env browser */

(function () {

    "use strict";

    var APP_VERSION = "2.3.0",

        INSTRUMENT = false,
        teleportSearchTimestamp,
        updateAvatarsTimestamp,

        // Controls.
        RADAR_RANGE_DEFAULT = 20,

        // EventBridge ID.
        SCRIPT_ID = "cas.radar",

        // EventBridge messages.
        READY_MESSAGE = "readyMessage",                     // Engine <=> Dialog
        VERSIONS_MESSAGE = "versionsMessage",               // Engine <== Dialog
        GET_CONTROLS_MESSAGE = "getControlsMessage",        // Engine <== Dialog
        SET_CONTROLS_MESSAGE = "setControlsMessage",        // Engine <=> Dialog
        GET_SETTINGS_MESSAGE = "getSettingsMessage",        // Engine <== Dialog
        SET_SETTINGS_MESSAGE = "setSettingsMessage",        // Engine <=> Dialog
        ROTATION_MESSAGE = "rotationMessage",               // Engine ==> Dialog
        AVATARS_MESSAGE = "avatarsMessage",                 // Engine <=> Dialog - World coordinates relative to camera.
        CLEAR_MESSAGE = "clearMessage",                     // Engine ==> Dialog
        TELEPORT_MESSAGE = "teleportMessage",               // Engine <== Dialog - World coordinates relative to camera.
        OPEN_URL_MESSAGE = "openURLMessage",                // Engine <== Dialog
        LOG_MESSAGE = "logMessage",                         // Engine <== Dialog

        // Application objects.
        Communications,
        Menu,
        Radar,
        Controls,
        SettingsDialog,
        HelpDialog,
        Controller,

        isHMDMode = false,

        //INFO = "INFO:",
        WARNING = "WARNING:",
        ERROR = "ERROR:",
        ERROR_MISSING_CASE = "Missing case:",
        ERROR_REINITIALIZATION = "Reinitialization";

    //#region Utilities ========================================================================================================

    function log() {
        var i, length, strings = [];

        for (i = 0, length = arguments.length; i < length; i++) {
            strings.push(arguments[i]);
        }

        Communications.log(strings.join(" "));
    }

    //#endregion

    //#region Communications ===================================================================================================

    Communications = (function () {
        // Communications with the main script.

        var
            isEventBridgeConnected = false;

        function log(message) {
            EventBridge.emitWebEvent(JSON.stringify({
                id: SCRIPT_ID,
                type: LOG_MESSAGE,
                message: message
            }));
        }

        function sendControls(controls) {
            EventBridge.emitWebEvent(JSON.stringify({
                id: SCRIPT_ID,
                type: SET_CONTROLS_MESSAGE,
                controls: controls
            }));
        }

        function sendSettings(settings) {
            EventBridge.emitWebEvent(JSON.stringify({
                id: SCRIPT_ID,
                type: SET_SETTINGS_MESSAGE,
                settings: settings
            }));
        }

        function teleportBy(vector, isAvatar) {
            EventBridge.emitWebEvent(JSON.stringify({
                id: SCRIPT_ID,
                type: TELEPORT_MESSAGE,
                vector: vector,
                isAvatar: isAvatar
            }));
        }

        function checkVersions() {
            EventBridge.emitWebEvent(JSON.stringify({
                id: SCRIPT_ID,
                type: VERSIONS_MESSAGE,
                scriptVersion: APP_VERSION,
                htmlVersion: document.getElementById("version").innerHTML
            }));
        }

        function requestControls() {
            EventBridge.emitWebEvent(JSON.stringify({
                id: SCRIPT_ID,
                type: GET_CONTROLS_MESSAGE
            }));
        }

        function requestSettings() {
            EventBridge.emitWebEvent(JSON.stringify({
                id: SCRIPT_ID,
                type: GET_SETTINGS_MESSAGE
            }));
        }

        function openURL(url) {
            EventBridge.emitWebEvent(JSON.stringify({
                id: SCRIPT_ID,
                type: OPEN_URL_MESSAGE,
                url: url
            }));
        }

        function refreshAvatars() {
            EventBridge.emitWebEvent(JSON.stringify({
                id: SCRIPT_ID,
                type: AVATARS_MESSAGE
            }));
        }

        function onScriptEventReceived(data) {
            var message;

            try {
                message = JSON.parse(data);
            } catch (e) {
                return;
            }

            if (message.id !== SCRIPT_ID) {
                return;
            }

            switch (message.type) {
                case READY_MESSAGE:
                    isEventBridgeConnected = true;
                    isHMDMode = message.hmd;
                    break;
                case ROTATION_MESSAGE:
                case AVATARS_MESSAGE:
                case CLEAR_MESSAGE:
                case SET_CONTROLS_MESSAGE:
                case SET_SETTINGS_MESSAGE:
                    // Nothing to do.
                    break;
                default:
                    log(ERROR, ERROR_MISSING_CASE, 100, message);
            }

            Controller.onMessageReceived(message);
        }

        function setUp() {
            // Set up even bridge.
            // The EventBridge is not always completely available straight away.
            var SETUP_RETRY_DELAY = 500;

            if (!isEventBridgeConnected) {
                EventBridge.scriptEventReceived.connect(onScriptEventReceived);
                EventBridge.emitWebEvent(JSON.stringify({
                    id: SCRIPT_ID,
                    type: READY_MESSAGE
                }));

                setTimeout(setUp, SETUP_RETRY_DELAY);
            }
        }

        function tearDown() {
            // Disconnect event bridge.
            EventBridge.scriptEventReceived.disconnect(onScriptEventReceived);
        }

        return {
            checkVersions: checkVersions,
            requestControls: requestControls,
            requestSettings: requestSettings,
            sendControls: sendControls,
            refreshAvatars: refreshAvatars,
            sendSettings: sendSettings,
            openURL: openURL,
            teleportBy: teleportBy,
            log: log,
            setUp: setUp,
            tearDown: tearDown
        };

    }());

    //#endregion

    //#region Radar ============================================================================================================

    Radar = (function () {
        // The radar display circle in the main window.

        var radarRange = RADAR_RANGE_DEFAULT,
            RADAR_RANGE_SCALE = 1.02,  // Don't display avatar dots outside circle.
            radarRangeScale = RADAR_RANGE_SCALE * radarRange,

            RADAR_CIRCLE_RADIUS = 210,  // Reflects value in CSS.
            radarCircleDisplay,
            radarCircleRotation,
            DEG_TO_RAD = Math.PI / 180,

            avatarData,
            avatarDataProcessIndex,

            avatarDots = {},
            avatarDotsCounter = 0,  // Lightweight stand-in for a time stamp.
            DOT_RADIUS = 4,  // Reflects value in CSS.
            hoveredDot = null,

            avatarLabel,
            isAvatarLabelVisible = false,
            isPersistingAvatarLabel = false,
            isMouseOverDot = false,
            isMouseOverLabel = false,
            uuidForLabel = null,
            dotForLabel = null,

            radarCircleOverlay,

            isIgnoreCircleAction = true,
            MAX_CLICK_DURATION = 500,
            radarCircleCentre,

            teleportCircle,
            TELEPORT_CIRCLE_RADIUS = 41,  // Reflects value in CSS.
            teleportCircleOffset,
            isTeleporting = false,
            teleportingTimer = null,

            teleportSearchContext = {},
            teleportSearchRadius,
            highlightedAvatarIndexes = [],

            updateAvatarDataTimer = null,
            avatarCount,

            radarScaleLeft,
            radarScaleRight,

            isRunning = false;

        //#region Avatar Label -------------------------------------------------------------------------------------------------

        function showAvatarLabel(avatarDot) {
            uuidForLabel = avatarDot.uuid;
            dotForLabel = avatarDot.dot;
            dotForLabel.appendChild(avatarLabel);
            dotForLabel.classList.add("labeled");
            avatarLabel.innerHTML = avatarDot.name;
            avatarLabel.style.display = "block";
            avatarLabel.style.marginLeft = (-avatarLabel.offsetWidth / 2 + DOT_RADIUS) + "px";
            isAvatarLabelVisible = true;
        }

        function hideAvatarLabel() {
            avatarLabel.style.display = "none";
            uuidForLabel = null;
            if (dotForLabel) {
                dotForLabel.classList.remove("labeled");
            }
            dotForLabel = null;
            isAvatarLabelVisible = false;
        }

        function onMouseEnterDot(event) {
            var uuid;

            if (isMouseOverLabel) {
                // Mouse hasn't entered the actual dot; it has entered the label.
                return;
            }

            isMouseOverDot = true;
            uuid = event.target.getAttribute("uuid");
            hoveredDot = avatarDots[uuid];

            if (!hoveredDot) {
                // Should never happen but handle just in case.
                hideAvatarLabel();
                return;
            }

            if (!isPersistingAvatarLabel) {
                hoveredDot.dot.style.transform = "rotate(" + (-radarCircleRotation) + "deg)";
                showAvatarLabel(hoveredDot);
            }
        }

        function onMouseLeaveDot() {
            if (!isMouseOverDot) {
                // Mouse wasn't over actual dot; it was over label.
                return;
            }

            isMouseOverDot = false;
            hoveredDot = null;

            if (isAvatarLabelVisible && !isPersistingAvatarLabel) {
                hideAvatarLabel();
            }
        }

        function onMouseOverLabel() {
            if (!isPersistingAvatarLabel) {
                // Moved onto the label from the dot.
                hideAvatarLabel();
            } else {
                isMouseOverLabel = true;
            }
        }

        function onMouseOutLabel() {
            isMouseOverLabel = false;
        }

        function doRadarCircleOverlayClick() {
            if (isMouseOverDot) {
                // Clicked dot.
                if (isPersistingAvatarLabel) {
                    if (hoveredDot.uuid === uuidForLabel) {
                        // Hide label for current dot.
                        isPersistingAvatarLabel = false;
                        hideAvatarLabel();
                    } else {
                        // Transfer label to a new dot.
                        hoveredDot.dot.style.transform = "rotate(" + (-radarCircleRotation) + "deg)";
                        showAvatarLabel(hoveredDot);
                    }
                } else {
                    if (!isAvatarLabelVisible) {
                        // Handle label being hidden because just hid for the current dot.
                        hoveredDot.dot.style.transform = "rotate(" + (-radarCircleRotation) + "deg)";
                        showAvatarLabel(hoveredDot);
                    }
                    isPersistingAvatarLabel = true;
                }
            } else {
                // Clicked radar circle background.
                if (isAvatarLabelVisible && isPersistingAvatarLabel) {
                    hideAvatarLabel();
                    isPersistingAvatarLabel = false;
                }
            }
        }

        //#endregion

        //#region Teleport -----------------------------------------------------------------------------------------------------

        function calculateRadarVector(x, y) {
            // Calculate radar-relative x, z coordinates from screen x, y.
            var deltaX = x - radarCircleCentre.x,
                deltaY = radarCircleCentre.y - y,
                distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                angle = Math.atan2(deltaY / distance, deltaX / distance);

            angle = angle + radarCircleRotation * DEG_TO_RAD;
            distance = distance * radarRangeScale / RADAR_CIRCLE_RADIUS;

            return {
                x: distance * Math.cos(angle),
                y: 0,
                z: -distance * Math.sin(angle)
            };
        }

        function setTeleportSearchRadius() {
            // Avatar dots must be wholly within the teleport search circle, not just touching.
            teleportSearchRadius = (TELEPORT_CIRCLE_RADIUS - DOT_RADIUS) / RADAR_CIRCLE_RADIUS * radarRangeScale;
        }

        function highlightAvatarDots(avatarIndexes) {
            var i, length;

            // Remove old highlights.
            for (i = highlightedAvatarIndexes.length - 1; i >= 0; i -= 1) {
                if (avatarIndexes.indexOf(highlightedAvatarIndexes[i]) === -1) {
                    avatarDots[avatarData[highlightedAvatarIndexes[i]].uuid].dot.classList.remove("highlighted");
                    highlightedAvatarIndexes.splice(i, 1);
                }
            }

            // Add new highlights.
            for (i = 0, length = avatarIndexes.length; i < length; i += 1) {
                if (highlightedAvatarIndexes.indexOf(avatarIndexes[i]) === -1) {
                    avatarDots[avatarData[avatarIndexes[i]].uuid].dot.classList.add("highlighted");
                    highlightedAvatarIndexes.push(avatarIndexes[i]);
                }
            }
        }

        function doTeleportSearch() {
            var index,
                finishIndex,
                avatarPosition,
                targetVector,
                deltaVector,
                distanceSquared,
                closestDistanceSquared,
                teleportSearchRadiusSquared,
                closestAvatarIndex = -1,
                avatarsInCircle = [],
                targetElevation,
                MAX_ELEVATION_DIFFERENCE = 1.0,
                avatarsToHighlight = [],
                i, length;

            if (avatarData.length === 0) {
                return;
            }

            if (INSTRUMENT) {
                teleportSearchTimestamp = Date.now();
            }

            index = Math.min(teleportSearchContext.currentIndex, avatarData.length - 1);
            finishIndex = Math.min(teleportSearchContext.finishIndex, avatarData.length - 1);

            // Find horizontally-closest avatar within teleport search circle.
            targetVector =
                calculateRadarVector(teleportSearchContext.targetPosition.x, teleportSearchContext.targetPosition.y);
            teleportSearchRadiusSquared = teleportSearchRadius * teleportSearchRadius;
            closestDistanceSquared = 2 * radarRange * radarRange;
            do {
                index = (index + 1) % avatarData.length;

                avatarPosition = avatarData[index].vector;
                deltaVector = { x: targetVector.x - avatarPosition.x, z: targetVector.z - avatarPosition.z };

                // Use squared distances to save a Math.sqrt() call each loop.
                distanceSquared = deltaVector.x * deltaVector.x + deltaVector.z * deltaVector.z;
                if (distanceSquared < teleportSearchRadiusSquared) {
                    avatarsInCircle.push(index);
                    if (distanceSquared < closestDistanceSquared) {
                        closestDistanceSquared = distanceSquared;
                        closestAvatarIndex = index;
                    }
                }

            } while (index !== finishIndex);

            if (closestAvatarIndex !== -1) {
                teleportSearchContext.closestAvatarData = avatarData[closestAvatarIndex];
                targetElevation = avatarData[closestAvatarIndex].vector.y;
                for (i = 0, length = avatarsInCircle.length; i < length; i += 1) {
                    if (Math.abs(avatarData[avatarsInCircle[i]].vector.y - targetElevation) <= MAX_ELEVATION_DIFFERENCE) {
                        avatarsToHighlight.push(avatarsInCircle[i]);
                    }
                }
            } else {
                teleportSearchContext.closestAvatarData = null;
                targetElevation = null;
            }

            teleportSearchContext.closestAvatarIndex = closestAvatarIndex;
            teleportSearchContext.teleportVector = {
                x: targetVector.x,
                y: targetElevation,
                z: targetVector.z
            };
            teleportSearchContext.currentIndex = index;

            highlightAvatarDots(avatarsToHighlight);

            if (INSTRUMENT) {
                log("HTML script : teleport search : " + (Date.now() - teleportSearchTimestamp));
                // 2019 01 23
                // Simulation:
                // - 100 avatars: 0ms
                // - 1000 avatars: 1ms
                // - 10000 avatars: 3ms
                // Conclusion: Don't need to split into chunks.
            }
        }

        function startTeleportSearch(x, y) {
            // Start searching for elevation of avatar closest to x, y display position.
            // Searches in a circular pass through avatarData starting at the start of avatarData.

            isTeleporting = true;
            teleportCircle.style.display = "block";

            teleportSearchContext = {
                targetPosition: { x: x, y: y },
                closestAvatarIndex: -1,
                closestAvatarData: null,
                teleportVector: { x: 0, y: 0, z: 0 },
                avatarsAtElevation: [],
                currentIndex: -1,
                finishIndex: avatarData.length - 1
            };
            doTeleportSearch();
        }

        function updateTeleportSearch(x, y) {
            // Update x, y display position that search is being done for.
            // Continue searching in a circular pass through avatarData starting at current search index.

            teleportSearchContext.targetPosition = { x: x, y: y };
            teleportSearchContext.finishIndex = Math.min(teleportSearchContext.currentIndex, avatarData.length - 1);
            doTeleportSearch();
        }

        function finishTeleportSearch() {
            // Finish searching for elevation of avatar closest to x, y display position.

            isTeleporting = false;
            teleportCircle.style.display = "none";
            highlightAvatarDots([]);
        }

        function refreshTeleportSearch() {
            // Update search results.
            // Some of the new avatarData may have already been processed but don't worry about that.

            teleportSearchContext.finishIndex = Math.min(teleportSearchContext.currentIndex, avatarData.length - 1);
            doTeleportSearch();
        }

        function doRadarCircleOverlayTeleport() {
            // Teleports to near target position if mouse is over an avatar dot.
            Communications.teleportBy(teleportSearchContext.teleportVector, isMouseOverDot);
        }

        function calcRadarCircleCentre() {
            var radarCircle = document.getElementById("radar-circle");
            radarCircleCentre = {
                x: radarCircle.offsetLeft + RADAR_CIRCLE_RADIUS,
                y: radarCircle.offsetTop + RADAR_CIRCLE_RADIUS
            };
            teleportCircleOffset = {
                x: -radarCircleCentre.x + RADAR_CIRCLE_RADIUS - TELEPORT_CIRCLE_RADIUS,
                y: -radarCircleCentre.y + RADAR_CIRCLE_RADIUS - TELEPORT_CIRCLE_RADIUS
            };
        }

        function isPointInRadarCircle(x, y) {
            var deltaX = x - radarCircleCentre.x,
                deltaY = y - radarCircleCentre.y;
            return Math.sqrt(deltaX * deltaX + deltaY * deltaY) <= RADAR_CIRCLE_RADIUS;
        }

        function updateTeleportCirclePosition(x, y) {
            teleportCircle.style.left = (x + teleportCircleOffset.x).toString() + "px";
            teleportCircle.style.top = (y + teleportCircleOffset.y).toString() + "px";
        }

        function handlePressOnRadarCircleOverlay(x, y) {
            if (!isPointInRadarCircle(x, y)) {
                isIgnoreCircleAction = true;
                return;
            }
            isIgnoreCircleAction = false;

            teleportingTimer = setTimeout(function () {
                teleportingTimer = null;
                startTeleportSearch(x, y);
                updateTeleportCirclePosition(x, y);
            }, MAX_CLICK_DURATION);
        }

        function handleMoveOnRadarCircleOverlay(x, y) {
            if (isIgnoreCircleAction) {
                return;
            }

            if (!isPointInRadarCircle(x, y)) {
                isIgnoreCircleAction = true;
                if (isTeleporting) {
                    finishTeleportSearch();
                }
            }

            if (isTeleporting) {
                updateTeleportSearch(x, y);
                updateTeleportCirclePosition(x, y);
            }
        }

        function handleLeaveOnRadarCircleOverlay() {
            isIgnoreCircleAction = true;
            if (isTeleporting) {
                finishTeleportSearch();
            }
        }

        function handleReleaseOnRadarCircleOverlay() {
            if (isIgnoreCircleAction) {
                return;
            }

            if (isTeleporting) {
                finishTeleportSearch();
                doRadarCircleOverlayTeleport();
            } else {
                clearTimeout(teleportingTimer);
                teleportingTimer = null;
                doRadarCircleOverlayClick();
            }
        }

        function onMouseDownOnRadarCircleOverlay(event) {
            if (!isHMDMode) {
                handlePressOnRadarCircleOverlay(event.x, event.y);
            }
        }

        function onMouseMoveOnRadarCircleOverlay(event) {
            if (!isHMDMode) {
                handleMoveOnRadarCircleOverlay(event.x, event.y);
            }
        }

        function onMouseLeaveOnRadarCircleOverlay() {
            if (!isHMDMode) {
                handleLeaveOnRadarCircleOverlay();
            }
        }

        function onMouseUpRadarOnCircleOverlay() {
            if (!isHMDMode) {
                handleReleaseOnRadarCircleOverlay();
            }
        }

        function onTouchStartOnRadarCircleOverlay(event) {
            if (isHMDMode) {
                handlePressOnRadarCircleOverlay(event.touches[0].clientX, event.touches[0].clientY);
            }
        }

        function onTouchMoveOnRadarCircleOverlay(event) {
            if (isHMDMode) {
                handleMoveOnRadarCircleOverlay(event.touches[0].clientX, event.touches[0].clientY);
            }
        }

        function onTouchCancelOnRadarCircleOverlay() {
            if (isHMDMode) {
                handleLeaveOnRadarCircleOverlay();
            }
        }

        function onTouchEndOnRadarCircleOverlay(event) {
            if (isHMDMode) {
                handleReleaseOnRadarCircleOverlay(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
            }
        }

        //#endregion

        //#region Avatar Dots --------------------------------------------------------------------------------------------------

        function maybeAddDot(uuid, name) {
            var dot,
                avatarDot;
            if (!avatarDots.hasOwnProperty(uuid)) {
                dot = document.createElement("div");
                dot.className = "dot";
                dot.setAttribute("uuid", uuid);
                dot.addEventListener("mouseenter", onMouseEnterDot);
                dot.addEventListener("mouseleave", onMouseLeaveDot);
                radarCircleDisplay.appendChild(dot);
                avatarDots[uuid] = {
                    dot: dot,
                    uuid: uuid
                };
            }
            avatarDot = avatarDots[uuid];
            avatarDot.name = name; // User may have updated their display name so update our copy.
            avatarDot.counter = avatarDotsCounter;
            return avatarDot.dot;
        }

        function removeExtraDots() {
            var uuid;
            for (uuid in avatarDots) {
                if (avatarDots[uuid].counter < avatarDotsCounter) {
                    radarCircleDisplay.removeChild(avatarDots[uuid].dot);
                    delete avatarDots[uuid];
                }
            }
        }

        function elevationColor(scale) {
            if (scale > 0) {
                return "hsl(210,100%," + (100 - scale * 50) + "%)";  // Fade white to sky blue.
            }
            return "hsl(0,100%," + (100 + scale * 50) + "%)";  // Fade white to red.
        }

        function updateAvatarData(range, data) {
            var startTime,
                datum,
                vector,
                dot,
                MAX_LOOP_TIME = 50,
                RECALL_DELAY = 5;

            updateAvatarDataTimer = null;

            if (range) {
                // Start processing run.

                if (INSTRUMENT) {
                    updateAvatarsTimestamp = Date.now();
                }

                avatarData = range === radarRange ? data : [];  // Ignore data if it's for a previous radar range.
                avatarDataProcessIndex = 0;

                avatarCount.innerHTML = avatarData.length.toString();
                avatarDotsCounter += 1;
            }

            if (INSTRUMENT) {
                // 2019 01 09:
                // - Localhost with one avatar recording, no teleport searching, second call seems to happen at ~5000 avatars.
                log("HTML script : avatars to display : " + (avatarData.length - avatarDataProcessIndex));
            }

            // Yielding loop for process run to allow UI to happen while processing lots of avatar data.
            startTime = Date.now();
            while (avatarDataProcessIndex < avatarData.length > 0 && (Date.now() - startTime) < MAX_LOOP_TIME) {
                datum = avatarData[avatarDataProcessIndex];
                vector = datum.vector;
                dot = maybeAddDot(datum.uuid, datum.name);
                dot.style.left = ((1 + vector.x / radarRangeScale) * RADAR_CIRCLE_RADIUS).toString() + "px";
                dot.style.top = ((1 + vector.z / radarRangeScale) * RADAR_CIRCLE_RADIUS).toString() + "px";
                dot.style.backgroundColor = elevationColor(vector.y / radarRangeScale);
                if (datum.isMyAvatar) {
                    dot.classList.add("my-dot");
                }

                // Re-add persisted label if dot has reappeared after going off screen.
                if (isPersistingAvatarLabel && datum.uuid === uuidForLabel) {
                    dot.style.transform = "rotate(" + (-radarCircleRotation) + "deg)";
                    showAvatarLabel(avatarDots[datum.uuid]);
                }

                avatarDataProcessIndex += 1;
            }

            if (avatarDataProcessIndex < avatarData.length && isRunning) {
                // Continue processing run.
                updateAvatarDataTimer = setTimeout(updateAvatarData, RECALL_DELAY);
            } else {
                // Finish processing run.
                removeExtraDots();
                Communications.refreshAvatars();  // Notify main script that have finished displaying.

                if (INSTRUMENT) {
                    log("HTML script : update avatars : " + (Date.now() - updateAvatarsTimestamp));
                    // 2019 01 07
                    // Simulation:
                    // - 100 avatars: 3ms for first call; 1.5ms for subsequent calls.
                    // - 1000 avatars: 20ms for first call; 8ms for subsequent calls.
                }
            }

            if (isTeleporting) {
                // Update teleport search UI whether or not avatar data has finished being processed.
                refreshTeleportSearch();
            }
        }

        function clearAvatarData() {
            avatarData = [];
            avatarDotsCounter += 1;
            removeExtraDots();
        }

        //#endregion

        //#region Circle ------------------------------------------------------------------------------------------------------

        function updateRotation(rotation) {
            radarCircleDisplay.style.transform = "rotate(" + rotation + "deg)";
            if (isPersistingAvatarLabel) {
                dotForLabel.style.transform = "rotate(" + (-rotation) + "deg)";
            } else if (hoveredDot) {
                hoveredDot.dot.style.transform = "rotate(" + (-rotation) + "deg)";
            }
            radarCircleRotation = rotation;
        }

        function setCircleScale() {
            var scale = radarRange + "m";
            scale = scale.replace("000m", ",000m");
            radarScaleLeft.innerHTML = scale;
            radarScaleRight.innerHTML = scale;
        }

        //#endregion

        //#region Controls -----------------------------------------------------------------------------------------------------

        function setRange(range) {
            clearAvatarData();  // Recreates all avatar dots so that they're the right colour and not outside the circle.
            radarRange = range;
            radarRangeScale = RADAR_RANGE_SCALE * radarRange;
            setCircleScale();
            setTeleportSearchRadius();
        }

        //#endregion

        //#region Set up and tear down -----------------------------------------------------------------------------------------

        function setUp() {
            radarCircleDisplay = document.getElementById("radar-circle-display");
            radarScaleLeft = document.getElementById("radar-scale-left");
            radarScaleRight = document.getElementById("radar-scale-right");
            avatarCount = document.getElementById("avatar-count").getElementsByTagName("span")[0];

            avatarLabel = document.getElementById("avatar-label");
            avatarLabel.addEventListener("mouseover", onMouseOverLabel, true);
            avatarLabel.addEventListener("mouseout", onMouseOutLabel, true);

            calcRadarCircleCentre();

            radarCircleOverlay = document.getElementById("radar-circle-display");

            // Touch events don't occur in desktop mode so use mouse events.
            radarCircleOverlay.addEventListener("mousedown", onMouseDownOnRadarCircleOverlay);
            radarCircleOverlay.addEventListener("mousemove", onMouseMoveOnRadarCircleOverlay);
            radarCircleOverlay.addEventListener("mouseleave", onMouseLeaveOnRadarCircleOverlay);
            radarCircleOverlay.addEventListener("mouseup", onMouseUpRadarOnCircleOverlay);

            // Mouse events don't occur the same in HMD mode so use touch events.
            radarCircleDisplay.addEventListener("touchstart", onTouchStartOnRadarCircleOverlay);
            radarCircleDisplay.addEventListener("touchmove", onTouchMoveOnRadarCircleOverlay);
            radarCircleDisplay.addEventListener("touchcancel", onTouchCancelOnRadarCircleOverlay);
            radarCircleDisplay.addEventListener("touchend", onTouchEndOnRadarCircleOverlay);

            teleportCircle = document.getElementById("teleport-circle");

            isRunning = true;
        }

        function tearDown() {
            if (updateAvatarDataTimer !== null) {
                clearTimeout(updateAvatarDataTimer);
                updateAvatarDataTimer = null;
            }
            isRunning = false;
        }

        //#endregion -----------------------------------------------------------------------------------------------------------

        return {
            updateRotation: updateRotation,
            updateAvatarData: updateAvatarData,
            clearAvatarData: clearAvatarData,
            setRange: setRange,
            setUp: setUp,
            tearDown: tearDown
        };

    }());

    //#endregion

    //#region Controls =========================================================================================================

    Controls = (function () {
        // The radar controls in the main window.

        var controlsForm,
            controlsChangedCallback,
            scaleButtons = [],
            i, length;

        function setControls(controls) {
            controlsForm["scale"].value = controls.range.toString();
        }

        function setControlsChangedCallback(callback) {
            controlsChangedCallback = callback;
        }

        function onControlsChanged() {
            controlsChangedCallback({
                range: parseInt(controlsForm["scale"].value)
            });
        }

        controlsForm = document.getElementById("controls");

        scaleButtons = document.getElementsByName("scale");
        for (i = 0, length = scaleButtons.length; i < length; i++) {
            scaleButtons[i].addEventListener("change", onControlsChanged);
        }

        return {
            setControls: setControls,
            controlsChanged: {
                connect: setControlsChangedCallback
            }
        };

    }());

    //#endregion

    //#region Settings Dialog ==================================================================================================

    SettingsDialog = (function () {
        // The settings dialog.
        // - Changes in settings values are communicated immediately they're changed. This enables the user to freely move
        //   between the two dialogs and removed the need for a cancel button.
        // - The dialog is not automatically closed upon the OK button being pressed.

        var settingsDialog,
            settingsChangedCallback,
            okClickedCallback,
            inputs,
            i, length;

        function setSettings(settings) {
            settingsDialog["show-own"].value = settings.showOwn.toString();
            settingsDialog["refresh-rate"].value = settings.refreshRate.toString();
        }

        function setSettingsChangedCallback(callback) {
            settingsChangedCallback = callback;
        }

        function setOKClickedCallback(callback) {
            okClickedCallback = callback;
        }

        function open() {
            settingsDialog.classList.add("visible");
        }

        function close() {
            settingsDialog.classList.remove("visible");
        }

        function onSettingsChanged() {
            settingsChangedCallback({
                showOwn: parseInt(settingsDialog["show-own"].value),
                refreshRate: parseInt(settingsDialog["refresh-rate"].value)
            });
        }

        function onOKClicked() {
            okClickedCallback();
        }

        settingsDialog = document.getElementById("settings");

        inputs = document.getElementsByName("show-own");
        for (i = 0, length = inputs.length; i < length; i++) {
            inputs[i].addEventListener("change", onSettingsChanged);
        }

        inputs = document.getElementsByName("refresh-rate");
        for (i = 0, length = inputs.length; i < length; i++) {
            inputs[i].addEventListener("change", onSettingsChanged);
        }

        document.querySelector("#settings .ok input").addEventListener("click", onOKClicked);

        return {
            setSettings: setSettings,
            settingsChanged: {
                connect: setSettingsChangedCallback
            },
            okClicked: {
                connect: setOKClickedCallback
            },
            open: open,
            close: close
        };

    }());

    //#endregion

    //#region Help Dialog ======================================================================================================

    HelpDialog = (function () {
        // The help dialog.
        // - The dialog is not automatically closed upon the OK button being pressed.

        var helpDialog,
            okClickedCallback,
            linkClickedCallback;

        function open() {
            var links,
                i, length;
            links = document.querySelectorAll("a");
            for (i = 0, length = links.length; i < length; i++) {
                links[i].addEventListener("click", function (event) {
                    linkClickedCallback(event.target.href);
                    event.preventDefault();
                });
            }
            helpDialog.classList.add("visible");
        }

        function close() {
            helpDialog.classList.remove("visible");
        }

        function setOKClickedCallback(callback) {
            okClickedCallback = callback;
        }

        function setLinkClickedCallback(callback) {
            linkClickedCallback = callback;
        }

        helpDialog = document.getElementById("help");
        document.querySelector("#help .ok input").addEventListener("click", function () {
            okClickedCallback();
        });

        return {
            okClicked: {
                connect: setOKClickedCallback
            },
            linkClicked: {
                connect: setLinkClickedCallback
            },
            open: open,
            close: close
        };

    }());

    //#endregion

    //#region Menu =============================================================================================================

    Menu = (function () {
        // The title bar menu (i.e., settings and help buttons).

        var
            settingsChangedCallback,

            NO_DIALOG = 0,
            HELP_DIALOG = 1,
            SETTINGS_DIALOG = 2,
            currentDialog = NO_DIALOG;

        function setSettingsChangedCallback(callback) {
            settingsChangedCallback = callback;
            SettingsDialog.settingsChanged.connect(settingsChangedCallback);
        }

        function onSettingsButtonClick() {
            switch (currentDialog) {
                case SETTINGS_DIALOG:
                    SettingsDialog.close();
                    currentDialog = NO_DIALOG;
                    break;
                case HELP_DIALOG:
                    HelpDialog.close();
                    SettingsDialog.open();
                    currentDialog = SETTINGS_DIALOG;
                    break;
                case NO_DIALOG:
                    SettingsDialog.open();
                    currentDialog = SETTINGS_DIALOG;
                    break;
                default:
                    log(ERROR, ERROR_MISSING_CASE, 200);
            }
        }

        function onHelpButtonClick() {
            switch (currentDialog) {
                case SETTINGS_DIALOG:
                    SettingsDialog.close();
                    HelpDialog.open();
                    currentDialog = HELP_DIALOG;
                    break;
                case HELP_DIALOG:
                    HelpDialog.close();
                    currentDialog = NO_DIALOG;
                    break;
                case NO_DIALOG:
                    HelpDialog.open();
                    currentDialog = HELP_DIALOG;
                    break;
                default:
                    log(ERROR, ERROR_MISSING_CASE, 201);
            }
        }

        function onLinkClick(url) {
            Communications.openURL(url);
        }

        document.getElementById("settings-button").addEventListener("click", onSettingsButtonClick);
        SettingsDialog.okClicked.connect(onSettingsButtonClick);

        document.getElementById("help-button").addEventListener("click", onHelpButtonClick);
        HelpDialog.okClicked.connect(onHelpButtonClick);
        HelpDialog.linkClicked.connect(onLinkClick);

        return {
            settingsChanged: {
                connect: setSettingsChangedCallback
            }
        };

    }());

    //#endregion

    //#region Controller =======================================================================================================

    Controller = (function () {
        // The overall application logic.

        var isControlsInitialized = false,
            isSettingsInitialized = false,
            SETTINGS_DELAY = 50;

        function setControls(controls) {
            if (isControlsInitialized) {
                log(WARNING, ERROR_REINITIALIZATION, "A");
            }
            Controls.setControls(controls);
            Radar.setRange(controls.range);
            isControlsInitialized = true;
        }

        function setSettings(settings) {
            if (isSettingsInitialized) {
                log(WARNING, ERROR_REINITIALIZATION, "B");
            }
            SettingsDialog.setSettings(settings);
            isSettingsInitialized = true;
        }

        function onMessageReceived(message) {
            switch (message.type) {
                case READY_MESSAGE:
                    Communications.checkVersions();
                    if (!isControlsInitialized) {
                        Communications.requestControls();
                    }
                    setTimeout(function () {
                        if (!isSettingsInitialized) {
                            Communications.requestSettings();
                        }
                    }, SETTINGS_DELAY);
                    break;
                case SET_CONTROLS_MESSAGE:
                    setControls(message.controls);
                    break;
                case SET_SETTINGS_MESSAGE:
                    setSettings(message.settings);
                    break;
                case ROTATION_MESSAGE:
                    Radar.updateRotation(message.rotation);
                    break;
                case AVATARS_MESSAGE:
                    Radar.updateAvatarData(message.range, message.data);
                    break;
                case CLEAR_MESSAGE:
                    Radar.clearAvatarData();
                    break;
                default:
                    log(ERROR, ERROR_MISSING_CASE, 300, message);
            }
        }

        function onSettingsChanged(settings) {
            Communications.sendSettings(settings);
        }

        function onControlsChanged(controls) {
            Communications.sendControls(controls);
            Radar.setRange(controls.range);
        }

        function setUp() {
            Controls.controlsChanged.connect(onControlsChanged);
            Menu.settingsChanged.connect(onSettingsChanged);
        }

        function tearDown() {
            // Nothing to do.
        }

        return {
            onMessageReceived: onMessageReceived,
            setUp: setUp,
            tearDown: tearDown
        };

    }());

    //#endregion

    //#region Set up and tear down =============================================================================================

    function onUnload() {
        // Tear down objects.
        Communications.tearDown();
        Controller.tearDown();
        Radar.tearDown();
    }

    function onLoad() {
        var nodes,
            i, length;

        nodes = document.querySelectorAll(".std");
        for (i = 0, length = nodes.length; i < length; i++) {
            nodes[i].parentNode.removeChild(nodes[i]);
        }

        // Set up primary objects.
        Radar.setUp();
        Controller.setUp();
        Communications.setUp();

        // Handle document unload.
        document.body.onunload = function () {
            onUnload();
        };
    }

    onLoad();

    //#endregion

}());
