// Body poser
// Created by Ada <ada@thingvellir.net> on 2025-06-02
// SPDX-License-Identifier: CC0-1.0
"use strict";

const ContextMenu = Script.require("contextMenu");

let settings = Settings.getValue("Body Poser", {
	upperBodyHandles: true,
	lowerBodyHandles: true,
	hipsHandle: true,
	spine2Handle: true,
	headHandle: true,
	public: false,
});
//let presets = Settings.getValue("Body Poser/Presets", {});

let hasHandles = false;
let enabled = false;
let handlesVisible = true;
let frozenAnimation = false;

let animHandler;
const jointHandleEntities = {};
const jointHandleVisuals = {};

function LP_AnimHandlerFunc(_dummy) {
	const data = {};
	for (const [name, handle] of Object.entries(jointHandleEntities)) {
		let { localPosition, localRotation } = Entities.getEntityProperties(handle, ["localPosition", "localRotation"]);
		const Y_180 = Quat.fromPitchYawRollDegrees(0, 180, 0);
		localRotation = Quat.multiply(Y_180, localRotation);
		localRotation = Quat.multiply(localRotation, Y_180);
		if (name.includes("Foot")) {
			localRotation = Quat.multiply(localRotation, Quat.fromPitchYawRollDegrees(45, 0, 180));
		} else if (name.includes("Hand")) {
			localRotation = Quat.multiply(localRotation, Quat.fromPitchYawRollDegrees(90, name.includes("Left") ? 90 : -90, 0));
		}
		localPosition = { x: -localPosition.x, y: localPosition.y, z: -localPosition.z };
		data[name] = { position: localPosition, rotation: localRotation };
	}

	const lowerBody = !settings.lowerBodyHandles ? {} : {
		leftFootIKEnabled: true,
		leftFootIKPositionVar: "leftFootPosition",
		leftFootIKRotationVar: "leftFootRotation",
		leftFootPosition: data["LeftFoot"]["position"],
		leftFootRotation: data["LeftFoot"]["rotation"],

		rightFootIKEnabled: true,
		rightFootIKPositionVar: "rightFootPosition",
		rightFootIKRotationVar: "rightFootRotation",
		rightFootPosition: data["RightFoot"]["position"],
		rightFootRotation: data["RightFoot"]["rotation"],

		leftFootPoleVectorEnabled: true,
		leftFootPoleVector: Vec3.multiply(-1, Quat.getForward(data["LeftFoot"]["rotation"])),

		rightFootPoleVectorEnabled: true,
		rightFootPoleVector: Vec3.multiply(-1, Quat.getForward(data["RightFoot"]["rotation"])),
	};

	const hips = !settings.lowerBodyHandles || !settings.hipsHandle ? {} : {
		hipsType: 0,
		hipsPosition: data["Hips"]["position"],
		hipsRotation: data["Hips"]["rotation"],
	};

	const head = HMD.active || !settings.upperBodyHandles || !settings.headHandle ? {} : {
		headType: 0,
		headPosition: data["Head"]["position"],
		headRotation: data["Head"]["rotation"],
	};

	const chest = HMD.active || !settings.upperBodyHandles || !settings.spine2Handle ? {} : {
		spine2Type: 0,
		spine2Position: data["Spine2"]["position"],
		spine2Rotation: data["Spine2"]["rotation"],
	};

	const upperBody = HMD.active || !settings.upperBodyHandles ? {} : {
		leftHandType: 0,
		leftHandIKPositionVar: "leftHandPosition",
		leftHandIKRotationVar: "leftHandRotation",
		leftHandPosition: data["LeftHand"]["position"],
		leftHandRotation: data["LeftHand"]["rotation"],

		rightHandType: 0,
		rightHandIKPositionVar: "rightHandPosition",
		rightHandIKRotationVar: "rightHandRotation",
		rightHandPosition: data["RightHand"]["position"],
		rightHandRotation: data["RightHand"]["rotation"],

		// mapping the elbows to the hand rotation looks janky
		// see https://github.com/overte-org/overte/issues/1865
		/*leftHandPoleVectorEnabled: true,
		leftHandPoleVector: Vec3.multiply(-1, Quat.getForward(data["LeftHand"]["rotation"])),

		rightHandPoleVectorEnabled: true,
		rightHandPoleVector: Vec3.multiply(-1, Quat.getForward(data["RightHand"]["rotation"])),*/
	};

	return { ...lowerBody, ...hips, ...chest, ...upperBody, ...head };
}

function LP_CreateHandles(jointNames) {
	const avatarScale = MyAvatar.scale;

	for (const joint of jointNames) {
		const jointIndex = MyAvatar.getJointIndex(joint);

		let color = [255, 255, 255];

		if (joint.includes("Left")) {
			color = [255, 0, 0];
		} else if (joint.includes("Right")) {
			color = [0, 0, 255];
		}

		const handleSize = Vec3.multiply(HMD.active ? [0.05, 0.05, 0.8] : [0.15, 0.15, 0.15], avatarScale);

		jointHandleEntities[joint] = Entities.addEntity({
			type: "Box",
			name: `Body poser handle (${joint})`,
			parentID: MyAvatar.sessionUUID,
			localPosition: MyAvatar.getAbsoluteDefaultJointTranslationInObjectFrame(jointIndex),
			localDimensions: handleSize,
			collisionless: true,
			alpha: 0.5,
			color: color,
			unlit: true,
			visible: handlesVisible,
			grab: {grabbable: handlesVisible},
			renderLayer: "front",
		}, settings.public ? "avatar" : "local");
	}

	if (!HMD.active && settings.upperBodyHandles && settings.lowerBodyHandles) {
		frozenAnimation = true;

		for (const role of MyAvatar.getAnimationRoles()) {
			MyAvatar.overrideRoleAnimation(role, "qrc:/avatar/animations/idle.fbx", 1, true, 1, 1);
		}
	}

	animHandler = MyAvatar.addAnimationStateHandler(LP_AnimHandlerFunc, null);
	hasHandles = true;
}

function LP_DeleteHandles() {
	hasHandles = false;
	MyAvatar.removeAnimationStateHandler(animHandler);

	if (frozenAnimation) {
		frozenAnimation = false;

		for (const role of MyAvatar.getAnimationRoles()) {
			MyAvatar.restoreRoleAnimation(role);
		}
	}

	for (const joint in jointHandleEntities) {
		Entities.deleteEntity(jointHandleEntities[joint]);
		delete jointHandleEntities[joint];
	}

	for (const joint in jointHandleVisuals) {
		Entities.deleteEntity(jointHandleVisuals[joint]);
		delete jointHandleVisuals[joint];
	}
}

function LP_HideHandles() {
	if (!hasHandles) { return; }

	for (const handle of Object.values(jointHandleEntities)) {
		Entities.editEntity(handle, {visible: false, grab: {grabbable:false}});
	}

	for (const handle of Object.values(jointHandleVisuals)) {
		Entities.editEntity(handle, {visible: false});
	}
}

function LP_ShowHandles() {
	if (!hasHandles) { return; }

	for (const handle of Object.values(jointHandleEntities)) {
		Entities.editEntity(handle, {visible: true, grab: {grabbable:true}});
	}

	for (const handle of Object.values(jointHandleVisuals)) {
		Entities.editEntity(handle, {visible: true});
	}
}

Script.scriptEnding.connect(() => {
	LP_DeleteHandles();
	ContextMenu.unregisterActionSet("bodyPoser");
	ContextMenu.unregisterActionSet("bodyPoser.menu");
	ContextMenu.unregisterActionSet("bodyPoser.settings");
	//ContextMenu.unregisterActionSet("bodyPoser.presets");
	Settings.setValue("Body Poser", settings);
	//Settings.setValue("Body Poser/Presets", presets);
});

const actionSet = [
	{
		text: "[  ] Enabled",
		localClickFunc: "bodyPoser.toggle",
		priority: -5,
	},
	{
		text: "[X] Show handles",
		localClickFunc: "bodyPoser.toggleHandles",
		textColor: [128, 128, 128],
		priority: -4.9,
	},
	// TODO
	/*{
		text: "> Presets",
		submenu: "bodyPoser.presets",
		priority: -4.8,
	},*/
	{
		text: "> Settings",
		submenu: "bodyPoser.settings",
		priority: -4.8,
	},
];

const settingsActions = {
	public: {
		localClickFunc: "bodyPoser.setting.public",
		text: settings.public ? "[X] Public handles" : "[  ] Public handles",
		textColor: [255, 128, 255],
	},
	lowerBody: {
		localClickFunc: "bodyPoser.setting.toggleLowerBody",
		text: settings.lowerBodyHandles ? "[X] Lower body" : "[  ] Lower body",
		textColor: [255, 240, 0],
	},
	hips: {
		localClickFunc: "bodyPoser.setting.toggleHips",
		text: settings.hipsHandle ? "[X] Hips handle" : "[  ] Hips handle",
	},
	upperBody: {
		localClickFunc: "bodyPoser.setting.toggleUpperBody",
		text: settings.upperBodyHandles ? "[X] Upper body" : "[  ] Upper body",
		textColor: HMD.active ? [128, 128, 128] : [255, 240, 0],
	},
	chest: {
		localClickFunc: "bodyPoser.setting.toggleSpine2",
		text: settings.spine2Handle ? "[X] Chest handle" : "[  ] Chest handle",
		textColor: HMD.active ? [128, 128, 128] : [255, 255, 255],
	},
	head: {
		localClickFunc: "bodyPoser.setting.toggleHead",
		text: settings.headHandle ? "[X] Head handle" : "[  ] Head handle",
		textColor: HMD.active ? [128, 128, 128] : [255, 255, 255],
	},
};

ContextMenu.registerActionSet("bodyPoser", [{
	text: "> Poser",
	submenu: "bodyPoser.menu",
	backgroundColor: [0, 0, 0],
	textColor: [0, 255, 64],
	priority: -5,
}], "_SELF");

ContextMenu.registerActionSet("bodyPoser.menu", actionSet, undefined, "Body Poser");
ContextMenu.registerActionSet("bodyPoser.settings", settingsActions, undefined, "Body Poser/Settings");
//ContextMenu.registerActionSet("bodyPoser.presets", [], undefined, "Body Poser/Presets");

Messages.messageReceived.connect((channel, msg, senderID, _localOnly) => {
	if (channel !== ContextMenu.CLICK_FUNC_CHANNEL) { return; }
	if (senderID !== MyAvatar.sessionUUID) { return; }

	const data = JSON.parse(msg);

	if (data.func === "bodyPoser.toggleHandles") {
		handlesVisible = !handlesVisible;

		if (handlesVisible) {
			LP_ShowHandles();
		} else {
			LP_HideHandles();
		}
	} else if (data.func === "bodyPoser.toggle") {
		enabled = !enabled;

		if (enabled) {
			let handles = [];
			if (settings.lowerBodyHandles) {
				handles.push("LeftFoot", "RightFoot");

				if (settings.hipsHandle) {
					handles.push("Hips");
				}
			}
			if (settings.upperBodyHandles && !HMD.active) {
				handles.push("LeftHand", "RightHand");

				if (settings.spine2Handle) {
					handles.push("Spine2");
				}

				if (settings.headHandle) {
					handles.push("Head");
				}
			}

			LP_CreateHandles(handles);
		} else {
			LP_DeleteHandles();
		}
	}

	if (data.func.startsWith("bodyPoser.toggle")) {
		actionSet[0].text = enabled ? "[X] Enabled" : "[  ] Enabled";

		actionSet[1].text = handlesVisible ? "[X] Show handles" : "[  ] Show handles";
		actionSet[1].textColor = enabled ? [255, 255, 255] : [128, 128, 128];

		ContextMenu.editActionSet("bodyPoser.menu", actionSet);
	}

	if (data.func.startsWith("bodyPoser.setting")) {
		if (data.func === "bodyPoser.setting.public") {
			settings.public = !settings.public;
		}
		if (data.func === "bodyPoser.setting.toggleUpperBody") {
			settings.upperBodyHandles = !settings.upperBodyHandles;
		}
		if (data.func === "bodyPoser.setting.toggleLowerBody") {
			settings.lowerBodyHandles = !settings.lowerBodyHandles;
		}
		if (data.func === "bodyPoser.setting.toggleHips") {
			settings.hipsHandle = !settings.hipsHandle;
		}
		if (data.func === "bodyPoser.setting.toggleSpine2") {
			settings.spine2Handle = !settings.spine2Handle;
		}
		if (data.func === "bodyPoser.setting.toggleHead") {
			settings.headHandle = !settings.headHandle;
		}

		settingsActions.public.text = settings.public ? "[X] Public handles" : "[  ] Public handles";
		settingsActions.lowerBody.text = settings.lowerBodyHandles ? "[X] Lower body" : "[  ] Lower body";
		settingsActions.hips.text = settings.hipsHandle ? "[X] Hips handle" : "[  ] Hips handle";
		settingsActions.upperBody.text = settings.upperBodyHandles ? "[X] Upper body" : "[  ] Upper body";
		settingsActions.chest.text = settings.spine2Handle ? "[X] Chest handle" : "[  ] Chest handle";
		settingsActions.head.text = settings.headHandle ? "[X] Head handle" : "[  ] Head handle";
		ContextMenu.editActionSet("bodyPoser.settings", settingsActions);

		Settings.setValue("Body Poser", settings);
	}
});
