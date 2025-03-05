//
// Copyright 2025 Overte e.V.
//
// Written by Armored Dragon
// Distributed under the Apache License, Version 2.0.
// See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html

"use strict";
let nameTags = {};
let visible = Settings.getValue("adragon.nametags.enable", true);
let maximumNameLength = 50;
let last_camera_mode = Camera.mode;

_updateList();

AvatarManager.avatarAddedEvent.connect(_addUser); // New user connected
AvatarManager.avatarRemovedEvent.connect(_removeUser); // User disconnected
Script.update.connect(_adjustNametags); // Delta time
Script.scriptEnding.connect(_scriptEnding); // Script was uninstalled
Menu.menuItemEvent.connect(_toggleState); // Toggle the nametag

// Toolbar icon
let tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
let tabletButton = tablet.addButton({
    icon: Script.resolvePath("./assets/nametags-i.svg"),
    activeIcon: Script.resolvePath("./assets/nametags-a.svg"),
    text: "NAMETAGS",
    isActive: visible,
});
tabletButton.clicked.connect(_toggleState);

// This is a web overlay we will be using to generate a HTML canvas for which we will use to create our nametag base64 image
// See canvas.js
let canvasPuppet = new OverlayWebWindow({
    source: Script.resolvePath("./canvas.html"),
    visible: false
});
canvasPuppet.webEventReceived.connect(onWebEventReceived);

// Menu item
Menu.addMenuItem({
    menuName: "View",
    menuItemName: "Nametags",
    shortcutKey: "CTRL+N",
    isCheckable: true,
    isChecked: visible,
});

function _updateList() {
    const includeSelf = !HMD.active && !Camera.mode.includes("first person");
    var userList = AvatarList.getAvatarIdentifiers();
    if (includeSelf) userList.push(MyAvatar.sessionUUID);

    // Filter undefined values out
    userList = userList.filter((uuid) => uuid);

    userList.forEach(_addUser);
}

// Add a user to the user list
async function _addUser(userUUID) {
    if (!visible) return;
    const user = AvatarList.getAvatar(userUUID);
    const displayName = user.displayName.substring(0, maximumNameLength) ?? "Anonymous";

    console.log(`Registering ${displayName} (${userUUID})`);

    canvasPuppet.emitScriptEvent(JSON.stringify({
        action: "generateNameplate",
        data: {
            name: displayName,
            userUUID: uuidToString(userUUID),
            hasGroup: false                     // FIXME: Groups are hard-coded false until group features are ready 
        }
    }));
}

// Remove a user from the user list
function _removeUser(userUUID) {
    console.log(`Deleting ${userUUID}`);
    Entities.deleteEntity(nameTags[userUUID]);
    delete nameTags[userUUID];
}

// Updates positions of existing nametags
function _adjustNametags() {
    if (last_camera_mode !== Camera.mode) {
        if (Camera.mode.includes("first person")) _removeUser(MyAvatar.sessionUUID);
        else _addUser(MyAvatar.sessionUUID);
        last_camera_mode = Camera.mode;
    }
}

// Enable or disable nametags
function _toggleState() {
    visible = !visible;
    tabletButton.editProperties({ isActive: visible });
    Settings.setValue("Nametags_toggle", visible);

    if (!visible) Object.keys(nameTags).forEach(_removeUser);
    if (visible) _updateList();
}

function _scriptEnding() {
    tablet.removeButton(tabletButton);
    Menu.removeMenuItem("View", "Nametags");

    Object.keys(nameTags).forEach(_removeUser);
    nameTags = {};
}

function onWebEventReceived(event) {
    let eventPacket = {};
    try {
        eventPacket = JSON.parse(event);
    } catch {
        return;
    }

    if (eventPacket.action === 'nameplateReady') {
        let userUUID = Uuid.fromString(eventPacket.data.userUUID);

        const user = AvatarList.getAvatar(userUUID);
        const headJointIndex = user.getJointIndex("Head");
        const jointPosition = Vec3.sum(user.getJointPosition(headJointIndex), { x: 0, y: 0.5, z: 0 });

        nameTags[userUUID] = Entities.addEntity(
            {
                type: "Image",
                dimensions: { x: 1, y: 1, z: 0.1 },
                emissive: true,
                alpha: 1,
                keepAspectRatio: true,
                position: jointPosition,
                parentID: userUUID,
                billboardMode: "full",
                imageURL: eventPacket.data.imageBase64,
                canCastShadow: false,
                grab: {
                    grabbable: false
                }
            },
            "local"
        );
    }
}

function uuidToString(existingUuid) {
    existingUuid = Uuid.toString(existingUuid); // Scripts way to turn it into a string
    return existingUuid.replace(/[{}]/g, ''); // Remove '{' and '}' from UUID string >:(
}