//
// Copyright 2024 Overte e.V.
//
// Written by Armored Dragon
// Distributed under the Apache License, Version 2.0.
// See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html

(function () {
	"use strict";
	let user_nametags = {};
	let visible = Settings.getValue("Nametags_toggle", true);
	let maximum_name_length = 50;
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

	// Menu item
	Menu.addMenuItem({
		menuName: "View",
		menuItemName: "Nametags",
		shortcutKey: "CTRL+N",
		isCheckable: true,
		isChecked: visible,
	});

	function _updateList() {
		const include_self = !HMD.active && !Camera.mode.includes("first person");
		var user_list = AvatarList.getAvatarIdentifiers();
		if (include_self) user_list.push(MyAvatar.sessionUUID);

		// Filter undefined values out
		user_list = user_list.filter((uuid) => uuid);

		user_list.forEach(_addUser);
	}

	// Add a user to the user list
	function _addUser(user_uuid) {
		if (!visible) return;
		if (user_nametags[user_uuid]) return;

		const user = AvatarList.getAvatar(user_uuid);
		const display_name = user.displayName ? user.displayName.substring(0, maximum_name_length) : "Anonymous";
		const headJointIndex = user.getJointIndex("Head");
		const jointInObjectFrame = user.getAbsoluteJointTranslationInObjectFrame(headJointIndex);

		console.log(`Registering ${display_name} (${user_uuid}) nametag`);

		user_nametags[user_uuid] = { text: {}, background: {} };

		user_nametags[user_uuid].text = Entities.addEntity(
			{
				type: "Text",
				text: display_name,
				backgroundAlpha: 0.0,
				billboardMode: "full",
				unlit: true,
				parentID: user_uuid,
				position: Vec3.sum(user.position, { x: 0, y: 0.4 + jointInObjectFrame.y, z: 0 }),
				visible: true,
				isSolid: false,
				topMargin: 0.025,
				alignment: "center",
				lineHeight: 0.1,
				canCastShadow: false,
				grab: {
					grabbable: false,
				},
			},
			"local"
		);
		user_nametags[user_uuid].background = Entities.addEntity(
			{
				type: "Image",
				dimensions: { x: 0.8, y: 0.2, z: 0.1 },
				emissive: true,
				alpha: 0.8,
				keepAspectRatio: false,
				position: Vec3.sum(user.position, { x: 0, y: 0.4 + jointInObjectFrame.y, z: 0 }),
				parentID: user_nametags[user_uuid].text,
				billboardMode: "full",
				imageURL: Script.resolvePath("./assets/badge.svg"),
				canCastShadow: false,
				grab: {
					grabbable: false,
				},
			},
			"local"
		);

		// We need to have this on a timeout because "textSize" can not be determined instantly after the entity was created.
		// https://apidocs.overte.org/Entities.html#.textSize
		Script.setTimeout(() => {
			let textSize = Entities.textSize(user_nametags[user_uuid].text, display_name);
			Entities.editEntity(user_nametags[user_uuid].text, { dimensions: { x: textSize.width + 0.25, y: textSize.height - 0.05, z: 0.1 } });
			Entities.editEntity(user_nametags[user_uuid].background, {
				dimensions: { x: Math.max(textSize.width + 0.25, 0.6), y: textSize.height - 0.05, z: 0.1 },
			});
		}, 100);
	}

	// Remove a user from the user list
	function _removeUser(user_uuid) {
		console.log(`Deleting ${user_uuid} nametag`);
		Entities.deleteEntity(user_nametags[user_uuid].text);
		Entities.deleteEntity(user_nametags[user_uuid].background);
		delete user_nametags[user_uuid];
	}

	// Updates positions of existing nametags
	function _adjustNametags() {
		if (last_camera_mode !== Camera.mode) {
			if (Camera.mode.includes("first person")) _removeUser(MyAvatar.sessionUUID);
			else _addUser(MyAvatar.sessionUUID);
			last_camera_mode = Camera.mode;
		}

		Object.keys(user_nametags).forEach((user_uuid) => {
			const user = AvatarList.getAvatar(user_uuid);
			const display_name = user.displayName ? user.displayName.substring(0, maximum_name_length) : "Anonymous";
			const headJointIndex = user.getJointIndex("Head");
			const jointInObjectFrame = user.getAbsoluteJointTranslationInObjectFrame(headJointIndex);
			Entities.editEntity(user_nametags[user_uuid].text, {
				position: Vec3.sum(user.position, { x: 0, y: jointInObjectFrame.y + Math.abs(user.scale - 1) + 0.4, z: 0 }),
				text: display_name,
			});
		});
	}

	// Enable or disable nametags
	function _toggleState() {
		visible = !visible;
		tabletButton.editProperties({ isActive: visible });
		Settings.setValue("Nametags_toggle", visible);

		if (!visible) Object.keys(user_nametags).forEach(_removeUser);
		if (visible) _updateList();
	}

	function _scriptEnding() {
		tablet.removeButton(tabletButton);
		Menu.removeMenuItem("View", "Nametags");

		for (let i = 0; Object.keys(user_nametags).length > i; i++) {
			Entities.deleteEntity(user_nametags[Object.keys(user_nametags)[i]].text);
			Entities.deleteEntity(user_nametags[Object.keys(user_nametags)[i]].background);
		}
		user_nametags = {};
	}
})();
