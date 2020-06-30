/*!
nametags.js

Created by David Rowe on 10 Mar 2016.
Copyright 2016 David Rowe.

Information: http://ctrlaltstudio.com/vircadia/nametags

Disclaimers:
1. The user identification provided by this app is not guaranteed: users can set their display name to whatever they like.
2. The content of the display names displayed by this app is not moderated by this app.

Distributed under the Apache License, Version 2.0.
See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
*/

/* global AvatarList Camera Entities Mat4 Menu MyAvatar Quat Settings Vec3 */

(function () {

    "use strict";

    var versionNumber = "1.4.0",

        avatars = {},  // Keys are avatar UUIDs. Values are objects that contain overlay ID and such.
        updateTimer,
        scheduleUpdate,
        textSizeOverlay,                                    // Used to calculate label sizes.
        INITIAL_UPDATE_TIMEOUT = 5,
        REGULAR_UPDATE_TIMEOUT = 500,
        MAX_CHARACTERS = 50,                                // Anti-griefing.
        TEXT_SIZE = 0.018,                                  // At 1.0m.
        TEXT_MARGIN_X = 0.005,                              // ""
        TEXT_MARGIN_X_TIMES_2 = 2 * TEXT_MARGIN_X,          // ""
        TEXT_DIMENSION_Z = 0.005,
        TEXT_COLOR = { red: 240, green: 240, blue: 240 },
        BACKGROUND_COLOR = { red: 32, green: 32, blue: 32 },
        DEFAULT_TEXT_OFFSET = 0.9,
        HEAD_JOINT = "Head",
        HEAD_OFFSET_SCALED = 0.2,
        HEAD_TOP_JOINT = "HeadTop_End",
        HEAD_TOP_OFFSET_SCALED = 0.075,
        TEXT_OFFSET_CONSTANT = 0.05,
        TEXT_REFRESH_INTERVAL = 5000,  // ms
        MIN_DISTANCE = 1.0,
        FADE_START_DISTANCE = 3.0,
        MAX_DISTANCE = 20.0,
        isVisible = false,
        MENU_NAME = "View",
        MENU_ITEM = "Nametags",
        MENU_ITEM_SHORTCUT = "CTRL+N",
        APP_NAME = "NAMETAGS",
        // HTTP locations needed because ToolbarButton.qml tries to find file in C:\Program Files\.
        APP_ICON_INACTIVE = Script.resolvePath("./assets/nametags-i.svg"),
        APP_ICON_ACTIVE = Script.resolvePath("./assets/nametags-a.svg"),
        tablet = null,
        button = null,
        NAMETAGS_VISIBLE_SETTING = "Nametags Visible",
        isTextSizeBug = false,
        isStopping = false;


    function log(message, info) {
        print("[CtrlAltStudio nametags.js] " + message + (info !== undefined ? " " + info : ""));
    }

    //#region Nametags updates -------------------------------------------------------------------------------------------------

    function fadeWithDistance(distance) {
        if (distance <= FADE_START_DISTANCE) {
            return 0.999;  // Work around display bug with value of 1.0.
        }
        if (distance >= MAX_DISTANCE) {
            return 0.0;
        }
        return 1.0 - (distance - FADE_START_DISTANCE) / (MAX_DISTANCE - FADE_START_DISTANCE);
    }

    function update() {
        var avatarUUIDs,
            uuid,
            length,
            i,
            avatar,
            avatarInfo,
            avatarPosition,
            avatarScale,
            displayName,
            cameraPosition,
            vector2d,
            distance,
            labelScale,
            textSize,
            labelDimensions,
            labelPosition,
            labelRotation,
            isLabelVisible,
            labelAlpha,
            headTextOffset,
            headTopTextOffset,
            textOffset;

        // Unset current for all avatars.
        for (uuid in avatars) {
            if (avatars.hasOwnProperty(uuid)) {
                avatars[uuid].current = false;
            }
        }

        // Get list of avatars.
        avatarUUIDs = AvatarList.getAvatarIdentifiers();  // List of session IDs, including a null value in place of own.
        avatarUUIDs.push(MyAvatar.sessionUUID);  // Null value for own avatar may not be at any position, so append own UUID.

        // Update avatars.
        for (i = 0, length = avatarUUIDs.length; i < length; i += 1) {
            uuid = avatarUUIDs[i];
            if (uuid !== null) {
                // Create new avatars entry.
                if (!avatars.hasOwnProperty(uuid)) {
                    avatars[uuid] = {};
                    avatars[uuid].overlay = Entities.addEntity({
                        type: "Text",
                        textColor: TEXT_COLOR,
                        backgroundColor: BACKGROUND_COLOR,
                        unlit: true,
                        position: Vec3.sum(MyAvatar.position, { x: 0, y: 0, z: 0 }),
                        visible: false,
                        isSolid: false,
                        topMargin: 0.0
                    }, "local");
                }

                // Get avatar info.
                avatar = avatars[uuid];
                avatarInfo = AvatarList.getAvatar(uuid);

                displayName = avatarInfo.sessionDisplayName;  // Same string as users dialog. "" in serverless domains.
                if (displayName === "") {
                    displayName = avatarInfo.displayName;
                }
                displayName = displayName.slice(0, MAX_CHARACTERS);

                avatarPosition = avatarInfo.position;
                avatarScale = Mat4.extractScale(avatarInfo.sensorToWorldMatrix).z;

                // Calculations.
                isLabelVisible = displayName !== "";
                if (isLabelVisible) {
                    cameraPosition = Camera.position;
                    vector2d = { x: cameraPosition.x - avatarPosition.x, y: 0, z: cameraPosition.z - avatarPosition.z };
                    distance = Vec3.length(vector2d);
                    isLabelVisible = avatarScale * MIN_DISTANCE <= distance && distance <= MAX_DISTANCE;
                }
                if (isLabelVisible) {
                    labelRotation = Quat.rotationBetween(Vec3.UNIT_Z, vector2d);
                    textSize = Entities.textSize(textSizeOverlay, displayName);

                    // Work around Entities.textSize() reporting height value ~2 x the proper value.
                    if (isTextSizeBug) {
                        textSize.height = textSize.height / 1.95;  // 2.0 causes text to not display for some reason.
                    }

                    // Adjust label size with distance.
                    labelScale = distance * (1.0 - 0.5 * distance / MAX_DISTANCE);
                    labelDimensions = {
                        x: labelScale * (textSize.width + TEXT_MARGIN_X_TIMES_2),
                        y: labelScale * textSize.height,
                        z: TEXT_DIMENSION_Z
                    };

                    // FIXME: When a user changes their avatar the text offset should be recalculated once the avatar model has
                    // been loaded. The API needs to be updated to include information on whether the avatar model has been
                    // loaded. For example, in addition to ScriptAvatar.skeletonModelURL, provide
                    // ScriptAvatar.isSkeletonModelLoaded.
                    // Work-around implemented is to refresh textOffset every so often.

                    // Calculate label position.
                    // Refresh from time to time to cater to changes in avatar model.
                    textOffset = avatar.textOffset;
                    if (textOffset === undefined || Date.now() - avatar.textOffsetTime > TEXT_REFRESH_INTERVAL) {
                        headTextOffset = 0;
                        headTopTextOffset = 0;
                        if (avatarInfo.jointNames.indexOf(HEAD_JOINT) !== -1) {
                            headTextOffset = avatarInfo.getJointPosition(HEAD_JOINT).y - avatarInfo.position.y
                                + avatarScale * HEAD_OFFSET_SCALED;
                        }
                        if (avatarInfo.jointNames.indexOf(HEAD_TOP_JOINT) !== -1) {
                            headTopTextOffset = avatarInfo.getJointPosition(HEAD_TOP_JOINT).y - avatarInfo.position.y
                                + avatarScale * HEAD_TOP_OFFSET_SCALED;
                        }
                        textOffset = Math.max(headTextOffset, headTopTextOffset);
                        if (textOffset === 0) {
                            textOffset = avatarScale * DEFAULT_TEXT_OFFSET;
                        }
                        textOffset = textOffset + TEXT_OFFSET_CONSTANT;
                        avatar.textOffset = textOffset;
                        avatar.textOffsetTime = Date.now();
                    }
                    labelPosition = {
                        x: avatarPosition.x,
                        y: avatarPosition.y + textOffset + labelDimensions.y,
                        z: avatarPosition.z
                    };
                }

                // Update nametag.
                if (isLabelVisible) {
                    labelAlpha = fadeWithDistance(distance);
                    Entities.editEntity(avatar.overlay, {
                        text: displayName,
                        lineHeight: labelScale * TEXT_SIZE,
                        dimensions: labelDimensions,
                        leftMargin: labelScale * TEXT_MARGIN_X,
                        position: labelPosition,
                        rotation: labelRotation,
                        parentID: uuid,
                        textAlpha: labelAlpha,
                        backgroundAlpha: labelAlpha,
                        visible: true
                    });
                } else if (avatar.isLabelVisible) {
                    // Only set visible false once.
                    Entities.editEntity(avatar.overlay, { visible: false });
                }

                // Update avatar properties.
                avatar.displayName = displayName;
                avatar.isLabelVisible = isLabelVisible;
                avatar.current = true;
            }
        }

        // Delete non-current avatars and their overlays.
        for (uuid in avatars) {
            if (avatars.hasOwnProperty(uuid)) {
                if (!avatars[uuid].current) {
                    Entities.deleteEntity(avatars[uuid].overlay);
                    delete avatars[uuid];
                }
            }
        }

        scheduleUpdate();
    }

    scheduleUpdate = function () {
        // Use timeout rather than timer so that script adjusts to load.
        updateTimer = Script.setTimeout(update, REGULAR_UPDATE_TIMEOUT);
    };

    function startUpdating() {
        updateTimer = Script.setTimeout(update, INITIAL_UPDATE_TIMEOUT);
    }

    function stopUpdating() {
        var uuid;

        if (!isStopping) {
            // clearTimeout() isn't a valid call when Interface is quitting.
            Script.clearTimeout(updateTimer);
        }
        for (uuid in avatars) {
            if (avatars.hasOwnProperty(uuid)) {
                Entities.deleteEntity(avatars[uuid].overlay);
            }
        }
        avatars = {};
    }

    //#endregion

    //#region Menu and app item ------------------------------------------------------------------------------------------------

    function setVisible(visible) {
        if (visible !== isVisible) {
            isVisible = visible;
            if (isVisible) {
                startUpdating();
            } else {
                stopUpdating();
            }
            if (button) {
                button.editProperties({ isActive: isVisible });
            }
            Settings.setValue(NAMETAGS_VISIBLE_SETTING, isVisible);
        }
    }

    function onMenuItemEvent(event) {
        var visible;

        if (event === MENU_ITEM) {
            visible = Menu.isOptionChecked(MENU_ITEM);
            if (visible !== isVisible) {
                setVisible(visible);
            }
        }
    }

    function onButtonClicked() {
        Menu.setIsOptionChecked(MENU_ITEM, !isVisible);  // Triggers onMenuItemEvent().
    }

    //#endregion

    //#region Set-up and tear-down ---------------------------------------------------------------------------------------------

    function setUp() {
        var visible;

        log("Version " + versionNumber);

        visible = Settings.getValue(NAMETAGS_VISIBLE_SETTING) === true;

        textSizeOverlay = Entities.addEntity({
            type: "Text",
            lineHeight: TEXT_SIZE,
            visible: false
        }, "local");

        // Work around Entities.textSize() reporting height value ~2 x the proper value.
        // This problem started circa version 80.
        Script.setTimeout(function () {
            // Entities.textSize() doesn't work straight after overlay is created.
            var charSize = Entities.textSize(textSizeOverlay, "@");
            isTextSizeBug = charSize.height / charSize.width > 1.5;
        }, 500);

        Menu.addMenuItem({
            menuName: MENU_NAME,
            menuItemName: MENU_ITEM,
            shortcutKey: MENU_ITEM_SHORTCUT,
            isCheckable: true,
            isChecked: visible
        });
        Menu.menuItemEvent.connect(onMenuItemEvent);

        Script.setTimeout(function () {
            // Wait for other scripts to set themselves up on the tablet so as to avoid contention.
            tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
            if (tablet) {
                button = tablet.addButton({
                    icon: APP_ICON_INACTIVE,
                    activeIcon: APP_ICON_ACTIVE,
                    text: APP_NAME,
                    isActive: visible
                });
            }
            if (button) {
                button.clicked.connect(onButtonClicked);
            }
        }, 2500);

        setVisible(visible);  // Starts updating if visible.
    }

    function tearDown() {
        isStopping = true;

        stopUpdating();

        if (button) {
            button.clicked.disconnect(onButtonClicked);
            if (tablet) {
                tablet.removeButton(button);
                tablet = null;
            }
            button = null;
        }

        Menu.menuItemEvent.disconnect(onMenuItemEvent);
        Menu.removeMenuItem(MENU_NAME, MENU_ITEM);

        Entities.deleteEntity(textSizeOverlay);
    }

    //#endregion

    setUp();
    Script.scriptEnding.connect(tearDown);
}());
