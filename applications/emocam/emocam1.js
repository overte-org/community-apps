//
//  emocam.js
//
//  Created by George Deac, October 21st 2023.
//  Copyright 2023 George Deac.
//  Copyright 2023 Overte e.V.
//
//  Overte Application for Mediapipe face tracking in Desktop mode.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//



(function() {
var TABLET_BUTTON_NAME = "EMOTIONS";
var TRANSITION_TIME_SECONDS = 0.25;
var onEmoteScreen = false;
var button;
var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
var icon = "face.png";
var activeIcon = "face.png";
var isActive = true;
var EMOTE_APP_BASE = "index.html?"+Date.now();
var EMOTE_APP_URL = Script.resolvePath(EMOTE_APP_BASE);
var EMOTE_APP_SORT_ORDER = 12;
var EMOTE_LABEL = "FACE";
var pitchValue = 0;
var yawValue = 0;
var forwardValue = 0;
var sideValue = 0;

button = tablet.addButton({
    icon: "https://metaverse.8agora.com/facedetection/face.png",
    activeIcon: "https://metaverse.8agora.com/facedetection/facei.png",
    text: EMOTE_LABEL,
    sortOrder: EMOTE_APP_SORT_ORDER
});

function onClicked() {
    if (onEmoteScreen) {
        tablet.gotoHomeScreen();
    } else {
        onEmoteScreen = true;
        tablet.gotoWebScreen(EMOTE_APP_URL);
		//webWindow = new OverlayWebWindow(' ', EMOTE_APP_URL, 480, 810, false);
    }
}

function onScreenChanged(type, url) {
    onEmoteScreen = type === "Web" && (url.indexOf(EMOTE_APP_BASE) === url.length - EMOTE_APP_BASE.length);
    button.editProperties({ isActive: onEmoteScreen });
}

var mapping = Controller.newMapping();
var yawBinding = mapping.from(function() { return yawValue; }).to(Controller.Actions.DeltaYaw);
var pitchBinding = mapping.from(function() { return pitchValue; }).to(Controller.Actions.DeltaPitch);
var forwardBinding = mapping.from(function() { return forwardValue; }).to(Controller.Actions.TranslateZ);
var sideBinding = mapping.from(function() { return sideValue; }).to(Controller.Actions.TranslateX);
mapping.enable();

function onWebEventReceived(event) {

    var parsed = JSON.parse(event);
	
	if (parsed.type === "tracking" || parsed.type === "trackingmotion"){
		var emotion = parsed.data;
		MyAvatar.hasScriptedBlendshapes = true;
		var bend ={	
		"EyeOpen_L": emotion["eyeWideLeft"]*4,
		"EyeOpen_R": emotion["eyeWideRight"]*4,
		"EyeBlink_L": emotion["eyeBlinkLeft"],
		"EyeBlink_R": emotion["eyeBlinkRight"],
		"EyeSquint_L": emotion["eyeSquintLeft"],
		"EyeSquint_R": emotion["eyeSquintRight"],
		"BrowsD_L": emotion["browDownLeft"],
		"BrowsD_R": emotion["browDownRight"],
		"BrowsU_C": emotion["browInnerUp"],
		"BrowsU_L": emotion["browOuterUpLeft"],
		"BrowsU_R": emotion["browOuterUpRight"],
		"JawOpen": emotion["jawOpen"],
		"MouthOpen": emotion["jawOpen"],
		"JawFwd": emotion["jawForward"],
		"MouthFrown_L": emotion["mouthFrownLeft"],
		"MouthFrown_R": emotion["mouthFrownRight"],
		"MouthSmile_L": emotion["mouthSmileLeft"]*0.8,
		"MouthSmile_R": emotion["mouthSmileRight"]*0.8,
		"MouthDimple_L": emotion["mouthStretchLeft"],
		"MouthDimple_R": emotion["mouthStretchRight"],
		"NoseSneer_L": emotion["noseSneerLeft"],
		"NoseSneer_R": emotion["noseSneerRight"],		
		"Puff": emotion["cheekPuff"]*1.3,
		"CheekSquint_L": emotion["cheekSquintLeft"],
		"CheekSquint_R": emotion["cheekSquintRight"],
		"EyeDown_L": emotion["eyeLookDownLeft"]*1.2,
		"EyeDown_R": emotion["eyeLookDownRight"]*1.2,
		"EyeIn_L": emotion["eyeLookInLeft"],
		"EyeIn_R": emotion["eyeLookInRight"],
		"EyeOut_L": emotion["eyeLookOutLeft"],
		"EyeOut_R": emotion["eyeLookOutRight"],
		"EyeUp_L": emotion["eyeLookUpLeft"],
		"EyeUp_R": emotion["eyeLookUpRight"],
		"EyeSquint_L": emotion["eyeSquintLeft"],
		"EyeSquint_R": emotion["eyeSquintRight"],
		"TongueOut": emotion["jawForward"],
		"JawLeft": emotion["jawLeft"]*3,
		"JawRight": emotion["jawRight"]*3,
		"MouthClose": emotion["mouthClose"],
		"MouthDimple_L": emotion["mouthDimpleLeft"],
		"MouthDimple_R": emotion["mouthDimpleRight"],
		"LipsFunnel": emotion["mouthFunnel"],
		"MouthLeft": emotion["mouthLeft"],
		"MouthLowerDown_L": emotion["mouthLowerDownLeft"],
		"MouthLowerDown_R": emotion["mouthLowerDownRight"],
		"MouthPress_L": emotion["mouthPressLeft"],
		"MouthPress_L": emotion["mouthPressRight"],
		"LipsPucker": emotion["mouthPucker"],
		"MouthRight": emotion["mouthRight"],
		"MouthRollLower": emotion["mouthRollLower"],
		"MouthRollUpper": emotion["mouthRollUpper"],
		"MouthShrugLower": emotion["mouthShrugLower"],
		"MouthShrugUpper": emotion["mouthShrugUpper"],
		"MouthUpperUp_L": emotion["mouthUpperUpLeft"],
		"MouthUpperUp_R": emotion["mouthUpperUpRight"]
		};
		if (parsed.type === "trackingmotion"){
			print("pitch: "+ parsed.pitch + "yaw: " +parsed.yaw);
			if (parsed.pitch <= -15 || parsed.pitch >= 5){
				forwardValue = 0;
				yawValue =  0;
				if (parsed.pitch > 5){
					pitchValue = 0.3;
				}
				if (parsed.pitch < -15){
					pitchValue =  -0.3;
				} 
				if (parsed.pitch >= -15 && parsed.pitch <= 5){
					pitchValue = 0;
				}
			} else {
				pitchValue = 0;
				if (parsed.yaw <= - 10 || parsed.yaw >= 10){
					forwardValue = 0;
					
					if (parsed.yaw > 10){
						yawValue = parsed.yaw /20;
					}
					if (parsed.yaw < -10){
						yawValue =  parsed.yaw /20;
					} 
					if (parsed.yaw >= - 10 && parsed.yaw <= 10){
						yawValue = 0;
					}
				} else {
					yawValue =  0;
					if (emotion["browInnerUp"]>0.1){
						forwardValue = -1;
					}
					if (emotion["browDownLeft"]>0.4){
						forwardValue = 1;
					}
					if (emotion["browInnerUp"] <= 0.1 && emotion["browDownLeft"] <= 0.4){
						forwardValue = 0;
					}
				}
			}
		}
		var direction = Vec3.multiplyQbyV(Quat.fromPitchYawRollDegrees(parsed.pitch, parsed.yaw, 0 ), {x: 0, y: 0, z: 100});
		direction = Vec3.multiplyQbyV(MyAvatar.orientation, direction);
		direction = Vec3.sum(direction, MyAvatar.position);
		MyAvatar.setHeadLookAt(direction);
		print("YAW="+MyAvatar.headYaw);
		for (var blendshape in bend) {
			MyAvatar.setBlendshape(blendshape, bend[blendshape]);
		}
	}
}
function setEmotion(currentEmotion) {
	if (emotion !== lastEmotionUsed) {
		lastEmotionUsed = emotion;
	}
	if (currentEmotion !== lastEmotionUsed) {
		changingEmotionPercentage = 0.0;
		emotion = currentEmotion;
		isChangingEmotion = true;
		MyAvatar.hasScriptedBlendshapes = true;
	}
}

button.clicked.connect(onClicked);
tablet.screenChanged.connect(onScreenChanged);
tablet.webEventReceived.connect(onWebEventReceived);

Script.scriptEnding.connect(function () {

    if (onEmoteScreen) {
        tablet.gotoHomeScreen();
    }
    button.clicked.disconnect(onClicked);
    tablet.screenChanged.disconnect(onScreenChanged);
    if (tablet) {
        tablet.removeButton(button);
    }

    MyAvatar.restoreAnimation();
	mapping.disable();	
});
}());