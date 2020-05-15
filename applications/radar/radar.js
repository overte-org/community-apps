/*!
radar.js

Created by David Rowe on 16 Nov 2017.
Copyright 2017-2020 David Rowe.

Information: http://ctrlaltstudio.com/vircadia/radar

Disclaimers:
1. The user identification provided by this app is not guaranteed: users can set their display name to whatever they like.
2. The content of the display names displayed by this app is not moderated by this app.

Distributed under the Apache License, Version 2.0.
See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
*/

/* global AvatarManager, Camera, HMD, MyAvatar, Overlays, Quat, Settings, Vec3, Window, location */

(function () {

    "use strict";

    var APP_NAME = "Radar",
        APP_VERSION = "2.3.0",  // Version number also needs to be set in web page HTML and JavaScript files.

        SIMULATE = false,
        INSTRUMENT = false,

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
        Preferences,
        Communications,
        Updates,
        App,

        // Global objects.
        tablet = null,

        INFO = "INFO:",
        //WARN = "WARN:",
        ERROR = "ERROR:",
        ERROR_MISSING_CASE = "Missing case:";

    if (SIMULATE) {
        Script.include("simulate.js");
    }

    function log() {
        var i, length, strings = [];

        for (i = 0, length = arguments.length; i < length; i++) {
            strings.push(arguments[i]);
        }

        print("[CtrlAltStudio radar.js] " + strings.join(" "));
    }

    //#region Preferences ======================================================================================================

    Preferences = (function () {
        // Manages the application preferences - "controls" and "settings" in the dialog.

        var PREFERENCES_ROOT = "com.ctrlaltstudio.radar.",
            RADAR_RANGE_SETTING = PREFERENCES_ROOT + "range",  // Must be different name to variable for obfuscation.
            radarRange = RADAR_RANGE_DEFAULT,
            SHOW_OWN_SETTING = PREFERENCES_ROOT + "ownAvatar",  // Must be different name to variable for obfuscation.
            SHOW_OWN_NEVER = 0,
            SHOW_OWN_THIRD = 1,
            SHOW_OWN_ALWAYS = 2,
            SHOW_OWN_DEFAULT = SHOW_OWN_THIRD,
            showOwn = SHOW_OWN_DEFAULT,
            REFRESH_RATE_SETTING = PREFERENCES_ROOT + "updateRate",  // Must be different name to variable for obfuscation.
            REFRESH_RATE_FASTEST = 4,
            REFRESH_RATE_FASTER = 3,
            REFRESH_RATE_MEDIUM = 2,
            REFRESH_RATE_SLOWER = 1,
            REFRESH_RATE_SLOWEST = 0,
            REFRESH_RATE_DEFAULT = REFRESH_RATE_MEDIUM,
            refreshRate = REFRESH_RATE_DEFAULT,
            preferencesChangedCallback = null;

        function getPreferences() {
            return {
                radarRange: radarRange,
                showOwn: showOwn,
                refreshRate: refreshRate
            };
        }

        function getRadarRange() {
            return radarRange;
        }

        function setRadarRange(range) {
            radarRange = range;
            Settings.setValue(RADAR_RANGE_SETTING, radarRange);
            preferencesChangedCallback(getPreferences());
        }

        function getShowOwn() {
            return showOwn;
        }

        function setShowOwn(show) {
            showOwn = show;
            Settings.setValue(SHOW_OWN_SETTING, showOwn);
            preferencesChangedCallback(getPreferences());
        }

        function getRefreshRate() {
            return refreshRate;
        }

        function setRefreshRate(rate) {
            refreshRate = rate;
            Settings.setValue(REFRESH_RATE_SETTING, refreshRate);
            preferencesChangedCallback(getPreferences());
        }

        function setPreferencesChangedCallback(callback) {
            preferencesChangedCallback = callback;
        }

        function setUp() {
            radarRange = Settings.getValue(RADAR_RANGE_SETTING, RADAR_RANGE_DEFAULT);
            showOwn = Settings.getValue(SHOW_OWN_SETTING, SHOW_OWN_DEFAULT);
            refreshRate = Settings.getValue(REFRESH_RATE_SETTING, REFRESH_RATE_DEFAULT);
        }

        function tearDown() {
            // Nothing to do.
        }

        return {
            getRadarRange: getRadarRange,
            setRadarRange: setRadarRange,
            SHOW_OWN_NEVER: SHOW_OWN_NEVER,
            SHOW_OWN_THIRD: SHOW_OWN_THIRD,
            SHOW_OWN_ALWAYS: SHOW_OWN_ALWAYS,
            getShowOwn: getShowOwn,
            setShowOwn: setShowOwn,
            REFRESH_RATE_SLOWEST: REFRESH_RATE_SLOWEST,
            REFRESH_RATE_SLOWER: REFRESH_RATE_SLOWER,
            REFRESH_RATE_MEDIUM: REFRESH_RATE_MEDIUM,
            REFRESH_RATE_FASTER: REFRESH_RATE_FASTER,
            REFRESH_RATE_FASTEST: REFRESH_RATE_FASTEST,
            getRefreshRate: getRefreshRate,
            setRefreshRate: setRefreshRate,
            getPreferences: getPreferences,
            preferencesChanged: {
                connect: setPreferencesChangedCallback
            },
            setUp: setUp,
            tearDown: tearDown
        };

    }());

    //#endregion

    //#region Communications ===================================================================================================

    Communications = (function () {
        // Manages the communications with the Web page script.

        var
            isVersionsChecked = false,
            readyCallback = null;

        function onWebEventReceived(data) {
            var message,
                avatarPosition,
                cameraVector,
                ERROR_FILE_VERSIONS_DONT_MATCH = APP_NAME + " script file version numbers don't match",
                ERROR_PLEASE_RELOAD_SCRIPT = "Please reload " + APP_NAME + " script.";

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
                    if (readyCallback) {
                        readyCallback();
                    }
                    tablet.emitScriptEvent(JSON.stringify({
                        id: SCRIPT_ID,
                        type: READY_MESSAGE,
                        hmd: HMD.active
                    }));
                    break;
                case GET_CONTROLS_MESSAGE:
                    tablet.emitScriptEvent(JSON.stringify({
                        id: SCRIPT_ID,
                        type: SET_CONTROLS_MESSAGE,
                        controls: {
                            range: Preferences.getRadarRange()
                        }
                    }));
                    break;
                case SET_CONTROLS_MESSAGE:
                    Preferences.setRadarRange(message.controls.range);
                    break;
                case GET_SETTINGS_MESSAGE:
                    tablet.emitScriptEvent(JSON.stringify({
                        id: SCRIPT_ID,
                        type: SET_SETTINGS_MESSAGE,
                        settings: {
                            showOwn: Preferences.getShowOwn(),
                            refreshRate: Preferences.getRefreshRate()
                        }
                    }));
                    break;
                case SET_SETTINGS_MESSAGE:
                    Preferences.setShowOwn(message.settings.showOwn);
                    Preferences.setRefreshRate(message.settings.refreshRate);
                    break;
                case AVATARS_MESSAGE:
                    Updates.avatarsDisplayed();
                    break;
                case TELEPORT_MESSAGE:
                    avatarPosition = MyAvatar.position;
                    cameraVector = Vec3.subtract(Camera.position, avatarPosition);
                    if (message.vector.y === null) {
                        message.vector.y = -cameraVector.y;
                    }
                    MyAvatar.goToLocation(Vec3.sum(Vec3.sum(avatarPosition, message.vector), cameraVector),
                        false, undefined, message.isAvatar, true);
                    break;
                case OPEN_URL_MESSAGE:
                    Window.openUrl(message.url);
                    break;
                case VERSIONS_MESSAGE:
                    if (!isVersionsChecked) {
                        if (message.scriptVersion !== APP_VERSION || message.htmlVersion !== APP_VERSION) {
                            log(ERROR, ERROR_FILE_VERSIONS_DONT_MATCH + ": " + APP_VERSION + ", " + message.scriptVersion
                                + " (script), " + message.htmlVersion + " (HTML)");
                            Window.alert(ERROR_FILE_VERSIONS_DONT_MATCH + "!\n" + ERROR_PLEASE_RELOAD_SCRIPT);
                        }
                        isVersionsChecked = true;
                    }
                    break;
                case LOG_MESSAGE:
                    log(message.message);
                    break;
                default:
                    log(ERROR, ERROR_MISSING_CASE, 0, data);
            }
        }

        function sendAvatarData(radarRange, avatarData) {
            tablet.emitScriptEvent(JSON.stringify({
                id: SCRIPT_ID,
                type: AVATARS_MESSAGE,
                range: radarRange,
                data: avatarData
            }));
        }

        function clearAvatarData() {
            tablet.emitScriptEvent(JSON.stringify({
                id: SCRIPT_ID,
                type: CLEAR_MESSAGE
            }));
        }

        function sendRotation(rotation) {
            tablet.emitScriptEvent(JSON.stringify({
                id: SCRIPT_ID,
                type: ROTATION_MESSAGE,
                rotation: rotation
            }));
        }

        function connectReadyCallback(callback) {
            readyCallback = callback;
        }

        function disconnectReadyCallback(callback) {
            if (readyCallback === callback) {
                readyCallback = null;
            }
        }

        return {
            onWebEventReceived: onWebEventReceived,
            ready: {
                connect: connectReadyCallback,
                disconnect: disconnectReadyCallback
            },
            sendAvatarData: sendAvatarData,
            clearAvatarData: clearAvatarData,
            sendRotation: sendRotation
        };

    }());

    //#endregion

    //#region Updates ==========================================================================================================

    Updates = (function () {
        // Main update loop.

        var radarRange,
            RADAR_SEARCH_MULTIPLIER = Math.sqrt(2),  // Encompass search cylinder.
            radarSearchRange,
            cameraMode,
            showOwn,
            isShowOwn,
            FIRST_PERSON_CAMERA_MODES = ["first person", "first person look at"],
            refreshRate,

            ROTATION_INTERVALS = [
                200,  // Slow
                150,
                100,  // Medium
                50,
                25   // Fast
            ],
            rotationInterval = ROTATION_INTERVALS[Preferences.REFRESH_RATE_MEDIUM],
            rotationTimer = null,

            AVATAR_INTERVALS = [
                2000,  // Slow
                1000,
                750,  // Medium
                350,
                100   // Fast
            ],
            avatarsInterval = AVATAR_INTERVALS[Preferences.REFRESH_RATE_MEDIUM],
            avatarsUpdateTimer = null,
            timeToPrepareDataStart,
            timeToPrepareData = 0,
            timeToDisplayDataStart,
            timeToDisplayData = 0,
            targetSendTime = 0,
            avatarsSendTimer = null,
            isDisplayingData = false,

            MAX_DISPLAY_NAME_LENGTH = 30,

            mySessionUUID,

            isRunning = false;

        function calculateIsShowOwn() {
            isShowOwn = showOwn === Preferences.SHOW_OWN_ALWAYS
                || showOwn === Preferences.SHOW_OWN_THIRD && FIRST_PERSON_CAMERA_MODES.indexOf(cameraMode) === -1;
        }

        function calculateIntervals() {
            rotationInterval = ROTATION_INTERVALS[refreshRate];
            avatarsInterval = AVATAR_INTERVALS[refreshRate];
        }

        function setCameraMode(mode) {
            cameraMode = mode;
            calculateIsShowOwn();
        }

        function setPreferences(preferences) {
            showOwn = preferences.showOwn;
            calculateIsShowOwn();
            radarRange = preferences.radarRange;
            radarSearchRange = RADAR_SEARCH_MULTIPLIER * radarRange;
            refreshRate = preferences.refreshRate;
            calculateIntervals();
        }

        function updateRotation() {
            var tabletOrientation,
                tabletDirection,
                tabletHorizontalDirection,
                rotation;

            if (App.isHMDMode()) {
                tabletOrientation = Overlays.getProperty(HMD.tabletID, "orientation");
                tabletDirection = Quat.getUp(tabletOrientation);  // Out the top of the tablet.
                if (Vec3.dot(tabletDirection, Vec3.UNIT_Y) > 0.5) {
                    tabletDirection = Vec3.multiply(-1, Quat.getForward(tabletOrientation));  // Out the back of the tablet.
                }
                tabletHorizontalDirection = Vec3.cross(tabletDirection, Vec3.UNIT_Y);

                rotation = Vec3.orientedAngle(Vec3.UNIT_X, tabletHorizontalDirection, Vec3.UNIT_Y);
            } else {
                rotation = Quat.safeEulerAngles(Camera.orientation).y;
            }

            Communications.sendRotation(rotation);

            rotationTimer = Script.setTimeout(updateRotation, rotationInterval);
        }

        /*
        // Code for displaying avatar dots at positions and elevations for screen snap or testing elevation colours.
        var sessionIDs = [Uuid.generate(), Uuid.generate(), Uuid.generate(), Uuid.generate(), Uuid.generate(), Uuid.generate(),
            Uuid.generate(), Uuid.generate(), Uuid.generate(), Uuid.generate(), Uuid.generate(), Uuid.generate()];

        function updateAvatars() {
            var avatarPositions,
                avatarNames,
                avatarDataRange = 10.0,
                avatarData = [],
                i;

            avatarPositions = [
                { x: 0, y: 0, z: 0 },
                { x: -2.5, y: 0, z: -1 },
                { x: -2.8, y: 0, z: -1.3 },
                { x: -3, y: 0, z: -7 },
                { x: -4, y: 0, z: -7.7 },
                { x: -4.3, y: 0, z: -7.3 },
                { x: -4.3, y: 0, z: -7.8 },
                { x: -3.24, y: 0, z: -8.4 },
                { x: 1, y: -7, z: 6 },
                { x: 5, y: 8, z: -3 }
            ];
            avatarNames = ["ctrlaltdavid", "", "", "", "", "", "", "", "", "wade", "", ""];

            for (i = 0; i < avatarPositions.length; i += 1) {
                avatarData.push({
                    uuid: sessionIDs[i],
                    vector: avatarPositions[i],
                    name: avatarNames[i]
                });
            }
            avatarData[0].isMyAvatar = true;

            Communications.sendAvatarData(avatarDataRange, avatarData);
            avatarsUpdateTimer = Script.setTimeout(updateAvatars, avatarsInterval);
        }
        */

        function limitDisplayName(name) {
            // Limit display name here so that extraneous data is not sent in message to HTML code.
            if (name.length > MAX_DISPLAY_NAME_LENGTH) {
                return name.slice(0, MAX_DISPLAY_NAME_LENGTH) + "&hellip;";
            }
            return name;
        }

        function updateAvatars() {
            // Finds avatars in cylinder, not sphere.
            // Avatar data update loop:
            // - The desired update loop time is avatarsInterval.
            // - The update loop time is extended if the HTML script takes longer to display the data.
            // - The update loop comprises:
            //   - Preparing the avatar data.
            //   - Sending the avatar data at the target interval or as soon as the previous data has been displayed.
            //   - Scheduling preparing the next avatar data so that it is ready at the anticipated send time.
            //   - Displaying the avatar data in the HTML script. (Includes teleport elevation searching.)

            var cameraPosition,
                avatarIDs,
                myAvatarIndex,
                palData,
                vector,
                sessionUUID,
                avatarDatum,
                avatarData = [],
                avatarDataRange,  // The radar range that avatarData is for.
                i, length,
                MINIMUM_UPDATE_DELAY = 2,
                sendDelay,
                MINIMUM_SEND_DELAY = 2,
                SEND_RETRY_INTERVAL = 25;

            timeToPrepareDataStart = Date.now();

            // Timer has fired.
            avatarsUpdateTimer = null;

            // Get avatar data.
            cameraPosition = Camera.position;
            avatarIDs = AvatarManager.getAvatarsInRange(cameraPosition, radarSearchRange);
            avatarDataRange = radarRange;

            // Remove own avatar if necessary.
            myAvatarIndex = avatarIDs.indexOf(mySessionUUID);
            if (myAvatarIndex !== -1 && !isShowOwn) {
                avatarIDs.splice(myAvatarIndex, 1);
            }

            // Collect avatar data.
            palData = AvatarManager.getPalData(avatarIDs)["data"];  // Property name as string to avoid obfuscation.
            for (i = 0, length = palData.length; i < length; i++) {
                // If session display name is undefined then the data is messed up (e.g., spheres problem).
                // The pal.js script also ignores items with empty name fields.
                if (!palData[i].sessionDisplayName) {
                    continue;
                }

                sessionUUID = palData[i].sessionUUID;

                // FIXME: AvatarManager.getPalData() returns with sessionUUID === "" for own avatar.
                // Manuscript case 19693.
                if (sessionUUID === "") {
                    if (isShowOwn) {
                        sessionUUID = mySessionUUID;
                    } else {
                        continue;
                    }
                }

                vector = Vec3.subtract(palData[i].position, cameraPosition);
                if (Math.abs(vector.y) <= radarRange) {
                    if (Vec3.length({ x: vector.x, y: 0, z: vector.z }) <= radarRange) {
                        avatarDatum = {
                            uuid: sessionUUID,
                            vector: vector,
                            name: limitDisplayName(palData[i].sessionDisplayName)
                        };
                        if (sessionUUID === mySessionUUID) {
                            // Don't set value for each avatar so as to reduce EventBridge message size.
                            avatarDatum.isMyAvatar = true;
                        }
                        avatarData.push(avatarDatum);
                    }
                }
            }

            timeToPrepareData = Date.now() - timeToPrepareDataStart;
            if (INSTRUMENT) {
                log("Main script : prepare : " + timeToPrepareData);
                // 2019 01 07
                // Simulation:
                // - 100 avatars: 3ms
                // - 1000 avatars: 48ms
            }

            // Send avatar data at target time, if can.
            sendDelay = targetSendTime - Date.now();  // Should hover around 0 for a reasonably loaded radar.
            if (INSTRUMENT) {
                log("Main script :             delay : " + sendDelay);
            }

            // Schedule preparing next data set so that it is ready to send at later of target interval or display update from
            // previous data set.
            avatarsUpdateTimer = Script.setTimeout(updateAvatars,
                Math.max(Math.max(avatarsInterval, timeToDisplayData) - timeToPrepareData + sendDelay, MINIMUM_UPDATE_DELAY));

            function sendData() {
                var instrumentTimestamp;

                if (!isRunning) {
                    return;
                }

                // Delay sending data until after previous lot has been processed.
                if (isDisplayingData) {
                    if (INSTRUMENT) {
                        log("Main script : reschedule send");
                    }
                    avatarsSendTimer = Script.setTimeout(sendData, SEND_RETRY_INTERVAL);
                    return;
                }
                avatarsSendTimer = null;

                if (INSTRUMENT) {
                    instrumentTimestamp = Date.now();
                }

                // Set target for sending next lot of data.
                targetSendTime = Date.now() + avatarsInterval;

                // Send current lost of data.
                isDisplayingData = true;
                timeToDisplayDataStart = Date.now();
                Communications.sendAvatarData(avatarDataRange, avatarData);

                if (INSTRUMENT) {
                    log("Main script : send : " + (Date.now() - instrumentTimestamp));
                    // 2019 01 07
                    // Simulation:
                    // - 100 avatars: 1ms
                    // - 1000 avatars: 5ms
                }
            }

            avatarsSendTimer = Script.setTimeout(sendData,
                Math.max(sendDelay, MINIMUM_SEND_DELAY));  // Caters for negative sendDelay values.
        }

        function onSessionUUIDChanged() {
            mySessionUUID = MyAvatar.sessionUUID;
        }

        function start() {
            isRunning = true;
            mySessionUUID = MyAvatar.sessionUUID;
            MyAvatar.sessionUUIDChanged.connect(onSessionUUIDChanged);
            if (avatarsUpdateTimer === null) {
                targetSendTime = Date.now() + avatarsInterval;
                avatarsUpdateTimer = Script.setTimeout(updateAvatars, avatarsInterval);
            }
            if (rotationTimer === null) {
                rotationTimer = Script.setTimeout(updateRotation, rotationInterval);
            }
        }

        function avatarsDisplayed() {
            isDisplayingData = false;
            timeToDisplayData = Date.now() - timeToDisplayDataStart;

            if (INSTRUMENT) {
                log("Main script : display : " + timeToDisplayData);
                // 2019 01 07
                // Simulation:
                // - 100 avatars: 16ms
                // - 1000 avatars: 25ms
            }
        }

        function stop() {
            isRunning = false;
            isDisplayingData = false;
            if (avatarsSendTimer !== null) {
                Script.clearTimeout(avatarsSendTimer);
                avatarsSendTimer = null;
            }
            if (avatarsUpdateTimer !== null) {
                Script.clearTimeout(avatarsUpdateTimer);
                avatarsUpdateTimer = null;
            }
            if (rotationTimer !== null) {
                Script.clearTimeout(rotationTimer);
                rotationTimer = null;
            }
            MyAvatar.sessionUUIDChanged.disconnect(onSessionUUIDChanged);
        }

        function setUp() {
            setPreferences(Preferences.getPreferences());
            Preferences.preferencesChanged.connect(setPreferences);
        }

        function tearDown() {
            // Nothing to do.
        }

        return {
            setPreferences: setPreferences,
            setCameraMode: setCameraMode,
            start: start,
            avatarsDisplayed: avatarsDisplayed,
            stop: stop,
            setUp: setUp,
            tearDown: tearDown
        };

    }());

    //#endregion

    //#region App ==============================================================================================================

    App = (function () {
        // Manages the interactions with the Interface app environment.

        var APP_ICON_ACTIVE = Script.resolvePath("./assets/radar-a.svg"),
            APP_ICON_INACTIVE = Script.resolvePath("./assets/radar-i.svg"),
            APP_HTML_PAGE = Script.resolvePath("./html/radar.html"),
            APP_BUTTON_TEXT = "RADAR",

            button = null,
            isAppActive = false,

            HMD_TABLET_BECOMES_TOOLBAR_SETTING = "hmdTabletBecomesToolbar",
            isHMDTabletBecomesToolbar = false,
            isHMDActive = false;


        function onDisplayModeChanged(isHMDMode) {
            // Close app if have switched between desktop and HMD modes, else tablet can't be used or toolbar button stays on.
            if (isAppActive && isHMDMode !== isHMDActive) {
                isHMDTabletBecomesToolbar = Settings.getValue(HMD_TABLET_BECOMES_TOOLBAR_SETTING, false);
                isHMDActive = isHMDMode;
                tablet.gotoHomeScreen();
            }
        }

        function onPossibleDomainChangeRequired() {
            // Clear radar display so that out-of-date display doesn't unexpectedly jump before updating to new location.
            Communications.clearAvatarData();
        }

        function startApp() {

            isHMDTabletBecomesToolbar = Settings.getValue(HMD_TABLET_BECOMES_TOOLBAR_SETTING, false);
            isHMDActive = HMD.active;

            HMD.displayModeChanged.connect(onDisplayModeChanged);
            location.possibleDomainChangeRequired.connect(onPossibleDomainChangeRequired);
            location.possibleDomainChangeRequiredViaICEForID.connect(onPossibleDomainChangeRequired);

            Camera.modeUpdated.connect(Updates.setCameraMode);
            Updates.setCameraMode(Camera.mode);

            Communications.ready.connect(Updates.start);
            tablet.webEventReceived.connect(Communications.onWebEventReceived);
        }

        function stopApp() {
            Updates.stop();

            tablet.webEventReceived.disconnect(Communications.onWebEventReceived);
            Communications.ready.disconnect(Updates.start);

            Camera.modeUpdated.disconnect(Updates.setCameraMode);

            location.possibleDomainChangeRequiredViaICEForID.disconnect(onPossibleDomainChangeRequired);
            location.possibleDomainChangeRequired.disconnect(onPossibleDomainChangeRequired);
            HMD.displayModeChanged.disconnect(onDisplayModeChanged);
        }

        function onButtonClicked() {
            if (!isAppActive) {
                tablet.gotoWebScreen(APP_HTML_PAGE);
            } else {
                tablet.gotoHomeScreen();
            }
        }

        function onTabletScreenChanged(type, url) {
            var active;

            active = url.slice(0, APP_HTML_PAGE.length) === APP_HTML_PAGE;
            if (active === isAppActive) {
                return;
            }

            isAppActive = active;
            button.editProperties({ isActive: isAppActive });
            if (isAppActive) {
                startApp();
            } else {
                stopApp();
            }
        }

        function isHMDMode() {
            return isHMDActive && !isHMDTabletBecomesToolbar;
        }

        function setUp() {
            tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
            if (!tablet) {
                log(ERROR, "Tablet not found!");
                return;
            }

            button = tablet.addButton({
                icon: APP_ICON_INACTIVE,
                activeIcon: APP_ICON_ACTIVE,
                text: APP_BUTTON_TEXT,
                isActive: false
            });

            if (!button) {
                log(ERROR, "Tablet button not created!");
                tablet = null;
                return;
            }

            tablet.screenChanged.connect(onTabletScreenChanged);
            button.clicked.connect(onButtonClicked);
        }

        function tearDown() {
            if (isAppActive) {
                stopApp();
                tablet.gotoHomeScreen();  // Close desktop window.
            }

            if (button) {
                button.clicked.disconnect(onButtonClicked);
                tablet.removeButton(button);
                button = null;
            }

            if (tablet) {
                tablet.screenChanged.disconnect(onTabletScreenChanged);
                tablet = null;
            }
        }

        return {
            isHMDMode: isHMDMode,
            setUp: setUp,
            tearDown: tearDown
        };

    }());

    //#endregion

    //#region Set up and tear down =============================================================================================

    function setUp() {
        log(INFO, APP_NAME, APP_VERSION);
        App.setUp();
        Preferences.setUp();
        Updates.setUp();
    }

    function tearDown() {
        Script.scriptEnding.disconnect(tearDown);
        App.tearDown();
        Preferences.tearDown();
        Updates.tearDown();
    }

    setUp();
    Script.scriptEnding.connect(tearDown);

    //#endregion

}());
