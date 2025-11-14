// Avatar Grab
// Created by Ada <ada@thingvellir.net> on 2025-04-06
// SPDX-License-Identifier: CC0-1.0
"use strict";

const ContextMenu = Script.require("contextMenu");

const DEBUG = false;
const msgChannel = "AvatarGrab";
const leave_action = Controller.findAction("TranslateY");

let grabActiveEnabled = true, grabTargetEnabled = true;
let footGrabEnabled = false, headGrabEnabled = false;
let desktopGrabToggled = false, grabbedWithHead = false;

const contextActionSet = {
	toggleActive: {
		text: "[X] Can grab avatars",
		localClickFunc: "avatarGrabSettings.toggleActive",
		textColor: [255, 240, 64],
	},
	toggleTarget: {
		text: "[X] Can be grabbed",
		localClickFunc: "avatarGrabSettings.toggleTarget",
		textColor: [255, 240, 64],
	},
	toggleFeetGrab: {
		text: "[  ] Grab with feet (VR grips)",
		localClickFunc: "avatarGrabSettings.toggleFeetGrab",
	},
	toggleHeadGrab: {
		text: "[  ] Grab with head (Right VR grip or G)",
		localClickFunc: "avatarGrabSettings.toggleHeadGrab",
	},
};

let lastPositions = [];
let currentGrabHostID;
let currentGrabJoint;

let S_Dbg = DEBUG ? ((msg) => print(msg)) : ((_msg) => {});

function S_Leave() {
	// FIXME: This doesn't always set the avatar's rotation to Quat.IDENTITY.
	// There's some engine weirdness with the camera that rotates the avatar
	// to wonky angles sometimes.
	MyAvatar.endSit(MyAvatar.position, Quat.IDENTITY);
	MyAvatar.setParentID(Uuid.NULL);
	MyAvatar.setOtherAvatarsCollisionsEnabled(true);
	MyAvatar.setCollisionsEnabled(true);
	Controller.actionEvent.disconnect(S_LeaveEvent);

	let avgPosition = Vec3.ZERO;
	for (const pos of lastPositions) {
		avgPosition = Vec3.sum(avgPosition, pos);
	}
	avgPosition = Vec3.multiply(1.0 / lastPositions.length, avgPosition);
	MyAvatar.velocity = Vec3.subtract(MyAvatar.position, avgPosition);

	S_Dbg(`S_Leave: ${JSON.stringify(MyAvatar.velocity)}`);

	currentGrabHostID = undefined;
	currentGrabJoint = undefined;
	lastPositions = [];
	Script.update.disconnect(S_Update);
}

function S_LeaveEvent(action, value) {
	if (action != leave_action || value < 0.1) { return; }

	S_Dbg(`S_LeaveEvent(${action}, ${value})`);

	S_Leave();
}

function S_Update(_delta) {
	if (lastPositions.length > 4) { lastPositions.splice(0); }
	lastPositions.push(MyAvatar.position);
}

function S_SphereCapsuleTest(org, handRadius) {
	const radius = MyAvatar.getCollisionCapsule().radius + handRadius;
	const cap_top = Vec3.sum(MyAvatar.position, {x: 0, y: MyAvatar.getHeight() / 2, z: 0});
	const cap_bottom = Vec3.sum(MyAvatar.position, {x: 0, y: -MyAvatar.getHeight() / 2, z: 0});
	const center_top = Vec3.mix(cap_top, cap_bottom, 0.25);
	const center = Vec3.mix(cap_top, cap_bottom, 0.5);
	const center_bottom = Vec3.mix(cap_top, cap_bottom, 0.75);

	S_Dbg(`S_PointCapsuleTest((${org.x}, ${org.y}, ${org.z}), ${radius}}`);

	if (DEBUG) {
		Entities.addEntity({
			type: "Sphere",
			lifetime: 2,
			position: cap_top,
			dimensions: {x: radius * 2, y: radius * 2, z: radius * 2},
			alpha: 0.3,
			color: {r: 0, g: 255, b: 255},
			collisionless: true,
			unlit: true,
			ignorePickIntersection: true,
			grab: {grabbable: false},
		}, "local");
		Entities.addEntity({
			type: "Sphere",
			lifetime: 2,
			position: cap_bottom,
			dimensions: {x: radius * 2, y: radius * 2, z: radius * 2},
			alpha: 0.3,
			color: {r: 0, g: 255, b: 255},
			collisionless: true,
			unlit: true,
			ignorePickIntersection: true,
			grab: {grabbable: false},
		}, "local");
		Entities.addEntity({
			type: "Sphere",
			lifetime: 2,
			position: center,
			dimensions: {x: radius * 2, y: radius * 2, z: radius * 2},
			alpha: 0.3,
			color: {r: 0, g: 255, b: 255},
			collisionless: true,
			unlit: true,
			ignorePickIntersection: true,
			grab: {grabbable: false},
		}, "local");
		Entities.addEntity({
			type: "Sphere",
			lifetime: 2,
			position: center_top,
			dimensions: {x: radius * 2, y: radius * 2, z: radius * 2},
			alpha: 0.3,
			color: {r: 0, g: 255, b: 255},
			collisionless: true,
			unlit: true,
			ignorePickIntersection: true,
			grab: {grabbable: false},
		}, "local");
		Entities.addEntity({
			type: "Sphere",
			lifetime: 2,
			position: center_bottom,
			dimensions: {x: radius * 2, y: radius * 2, z: radius * 2},
			alpha: 0.3,
			color: {r: 0, g: 255, b: 255},
			collisionless: true,
			unlit: true,
			ignorePickIntersection: true,
			grab: {grabbable: false},
		}, "local");
	}

	if (Vec3.distance(org, cap_top) < radius) { return true; }
	if (Vec3.distance(org, cap_bottom) < radius) { return true; }
	if (Vec3.distance(org, center) < radius) { return true; }
	if (Vec3.distance(org, center_top) < radius) { return true; }
	if (Vec3.distance(org, center_bottom) < radius) { return true; }

	return false;
}

function S_GrabRecv(grabberID, jointName, radius, origin) {
	if (!grabTargetEnabled) { return; }

	S_Dbg(`S_GrabRecv(${grabberID}, ${jointName}, ${radius}, ${JSON.stringify(origin)})`);

	if (Uuid.isNull(grabberID) || Uuid.isEqual(MyAvatar.sessionUUID, grabberID)) { return; }

	const target_id = grabberID;
	const targ_joint_name = jointName;
	const target = AvatarList.getAvatar(target_id);
	const targ_joint = target.getJointIndex(targ_joint_name);

	if (!S_SphereCapsuleTest(origin, radius)) { return; }

	// FIXME: This can trigger parenting loops. The engine is *supposed*
	// to prevent that, but it somehow gets through and crashes the grabbed target.
	MyAvatar.setParentID(target_id);
	MyAvatar.setParentJointIndex(targ_joint);
	MyAvatar.beginSit(MyAvatar.position, MyAvatar.orientation);
	MyAvatar.setOtherAvatarsCollisionsEnabled(false);
	MyAvatar.setCollisionsEnabled(false);
	currentGrabHostID = grabberID;
	currentGrabJoint = jointName;

	Controller.actionEvent.connect(S_LeaveEvent);
	Script.update.connect(S_Update);
}

function S_ReleaseRecv(grabberID, jointName) {
	S_Dbg(`S_ReleaseRecv(${grabberID}, ${jointName})`);
	if (!Uuid.isEqual(grabberID, currentGrabHostID) || jointName !== currentGrabJoint) { return; }
	S_Leave();
}

function S_GrabSend(joint = "RightHand") {
	if (!grabActiveEnabled) { return; }

	S_Dbg(`S_GrabSend(${joint})`);

	const jointIndex = MyAvatar.getJointIndex(joint);
	const handOrigin = Vec3.sum(
		MyAvatar.position,
		Vec3.multiplyQbyV(
			MyAvatar.orientation,
			MyAvatar.getAbsoluteJointTranslationInObjectFrame(jointIndex)
		)
	);

	if (DEBUG) {
		Entities.addEntity({
			type: "Sphere",
			lifetime: 2,
			position: handOrigin,
			dimensions: {x: 0.3, y: 0.3, z: 0.3},
			alpha: 0.3,
			color: {r: 0, g: 255, b: 0},
			collisionless: true,
			unlit: true,
			ignorePickIntersection: true,
			grab: {grabbable: false},
		}, "local");
	}

	const data = {
		type: "grab",
		grabberID: MyAvatar.sessionUUID,
		jointName: joint,
		origin: handOrigin,
		radius: 0.3 * MyAvatar.sensorToWorldScale,
	};
	Messages.sendMessage(msgChannel, JSON.stringify(data));
}

function S_ReleaseSend(jointName) {
	S_Dbg(`S_ReleaseSend(${jointName})`);

	if (DEBUG) {
		const jointIndex = MyAvatar.getJointIndex(jointName);
		const handOrigin = Vec3.sum(
			MyAvatar.position,
			Vec3.multiplyQbyV(
				MyAvatar.orientation,
				MyAvatar.getAbsoluteJointTranslationInObjectFrame(jointIndex)
			)
		);

		Entities.addEntity({
			type: "Sphere",
			lifetime: 2,
			position: handOrigin,
			dimensions: {x: 0.3, y: 0.3, z: 0.3},
			alpha: 0.3,
			color: {r: 255, g: 0, b: 0},
			collisionless: true,
			unlit: true,
			ignorePickIntersection: true,
			grab: {grabbable: false},
		}, "local");
	}

	const data = {type: "release", grabberID: MyAvatar.sessionUUID, jointName: jointName};
	Messages.sendMessage(msgChannel, JSON.stringify(data));
}

let leftGrabAlreadySent = false;
let rightGrabAlreadySent = false;
let leftReleaseAlreadySent = false;
let rightReleaseAlreadySent = false;

function S_InputEvent(action, value) {
	if (action === Controller.Standard.LeftGrip) {
		if (value > 0.3 && !leftGrabAlreadySent) {
			S_GrabSend("LeftHand");
			leftGrabAlreadySent = true;
			leftReleaseAlreadySent = false;
		} else if (value < 0.1 && !leftReleaseAlreadySent) {
			S_ReleaseSend("LeftHand");
			leftGrabAlreadySent = false;
			leftReleaseAlreadySent = true;
		}
	} else if (action === Controller.Standard.RightGrip) {
		if (value > 0.3 && !rightGrabAlreadySent) {
			S_GrabSend("RightHand");
			rightGrabAlreadySent = true;
			rightReleaseAlreadySent = false;

			if (headGrabEnabled) {
				S_GrabSend("Head");
				grabbedWithHead = true;
			}
		} else if (value < 0.1 && !rightReleaseAlreadySent) {
			S_ReleaseSend("RightHand");
			rightGrabAlreadySent = false;
			rightReleaseAlreadySent = true;

			if (headGrabEnabled || grabbedWithHead) {
				S_ReleaseSend("Head");
				grabbedWithHead = false;
			}
		}
	}
}

function S_KeyPressEvent(event) {
	if (event.text !== "g" || event.isAutoRepeat) { return; }
	S_Dbg(`S_KeyPressEvent(${JSON.stringify(event)})`);

	if (desktopGrabToggled) {
		S_ReleaseSend("RightHand");
		if (headGrabEnabled || grabbedWithHead) {
			S_ReleaseSend("Head");
			grabbedWithHead = false;
		}
		Window.displayAnnouncement("Letting go");
		desktopGrabToggled = false;
	} else {
		S_GrabSend("RightHand");
		if (headGrabEnabled) {
			S_GrabSend("Head");
			grabbedWithHead = true;
		}
		Window.displayAnnouncement("Grabbing");
		desktopGrabToggled = true;
	}
}

function S_MsgRecv(channel, rawdata, senderID, localOnly) {
	if (ContextMenu && channel === ContextMenu.CLICK_FUNC_CHANNEL) {
		if (senderID !== MyAvatar.sessionUUID) { return; }

		const data = JSON.parse(rawdata);

		switch (data.func) {
			case "avatarGrabSettings.toggleActive":
				grabActiveEnabled = !grabActiveEnabled;
				contextActionSet.toggleActive.text = (grabActiveEnabled ? "[X]" : "[   ]") + " Can grab avatars";
				ContextMenu.editActionSet("avatarGrab.settings", contextActionSet);
				break;

			case "avatarGrabSettings.toggleTarget":
				grabTargetEnabled = !grabTargetEnabled;
				contextActionSet.toggleTarget.text = (grabTargetEnabled ? "[X]" : "[   ]") + " Can be grabbed";
				ContextMenu.editActionSet("avatarGrab.settings", contextActionSet);
				break;

			case "avatarGrabSettings.toggleFeetGrab":
				footGrabEnabled = !footGrabEnabled;
				contextActionSet.toggleFeetGrab.text = (footGrabEnabled ? "[X]" : "[   ]") + " Grab with feet (VR grips)";
				ContextMenu.editActionSet("avatarGrab.settings", contextActionSet);
				break;

			case "avatarGrabSettings.toggleHeadGrab":
				headGrabEnabled = !headGrabEnabled;
				contextActionSet.toggleHeadGrab.text = (headGrabEnabled ? "[X]" : "[   ]") + " Grab with head (Right VR grip or G)";
				ContextMenu.editActionSet("avatarGrab.settings", contextActionSet);
				break;
		}

		return;
	}

	if (channel !== msgChannel) { return; }

	S_Dbg(`S_MsgRecv(${channel}, ${rawdata}, ${senderID}, ${localOnly})`);

	const data = JSON.parse(rawdata);

	if (data.type === "grab") {
		S_GrabRecv(data.grabberID, data.jointName, data.radius, data.origin);
	} else if (data.type === "release") {
		S_ReleaseRecv(data.grabberID, data.jointName);
	}
}

Messages.subscribe(msgChannel);
Messages.messageReceived.connect(S_MsgRecv);
Controller.inputEvent.connect(S_InputEvent);
Controller.keyPressEvent.connect(S_KeyPressEvent);

if (ContextMenu) {
	ContextMenu.registerActionSet("avatarGrab", [{
		text: "> Avatar Grab",
		submenu: "avatarGrab.settings",
	}], "_SELF");
	ContextMenu.registerActionSet("avatarGrab.settings", contextActionSet, undefined, "Avatar Grab");
}

Script.scriptEnding.connect(() => {
	S_Leave();
	Controller.inputEvent.disconnect(S_InputEvent);
	Controller.actionEvent.disconnect(S_LeaveEvent);
	Controller.keyPressEvent.disconnect(S_KeyPressEvent);
	Messages.messageReceived.disconnect(S_MsgRecv);
	Messages.unsubscribe(msgChannel);

	if (desktopGrabToggled) {
		S_ReleaseSend("RightHand");
		S_ReleaseSend("Head");
	}

	if (ContextMenu) {
		ContextMenu.unregisterActionSet("avatarGrab");
		ContextMenu.unregisterActionSet("avatarGrab.settings");
	}
});
