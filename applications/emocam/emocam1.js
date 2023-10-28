//
//  emocam1.js
//
//  Created by George Deac, October 21st, 2023.
//  Copyright 2023 George Deac.
//  Copyright 2023, Overte e.V.
//
//  Overte Application for Mediapipe face tracking in Desktop mode.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//


(function () {
    var jsMainFileName = "emocam1.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    var channel = "org.overte.application.emocam";

    var TABLET_BUTTON_NAME = "EMOTIONS";
    var TRANSITION_TIME_SECONDS = 0.25;
    var onEmoteScreen = false;
    var button;
    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
    var icon = "face.png";
    var activeIcon = "face.png";
    var isActive = true;
    var EMOTE_APP_BASE = "index.html?" + Date.now();
    var EMOTE_APP_URL = Script.resolvePath(EMOTE_APP_BASE);
    var EMOTE_APP_SORT_ORDER = 12;
    var EMOTE_LABEL = "FACE";
    var pitchValue = 0;
    var yawValue = 0;
    var forwardValue = 0;
    var sideValue = 0;
    var handlerId = 0;
    var pitch = 0;
    var yaw = 0;
    var roll = 0;
    var lastDataArrived = Date.now();

    var isLeftHandTracked = false;
    var leftHandRotation = null;
    var leftHandPosition = null;

    var isRightHandTracked = false;
    var rightHandRotation = null;
    var rightHandPosition = null;

    button = tablet.addButton({
        icon: ROOT + "images/face.png",
        activeIcon: ROOT + "images/facei.png",
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
        button.editProperties({isActive: onEmoteScreen});
    }

    var mapping = Controller.newMapping();
    var yawBinding = mapping.from(function () {
        return yawValue;
    }).to(Controller.Actions.DeltaYaw);
    var pitchBinding = mapping.from(function () {
        return pitchValue;
    }).to(Controller.Actions.DeltaPitch);
    var forwardBinding = mapping.from(function () {
        return forwardValue;
    }).to(Controller.Actions.TranslateZ);
    var sideBinding = mapping.from(function () {
        return sideValue;
    }).to(Controller.Actions.TranslateX);
    mapping.enable();

    var propList = ["headRotation", "headType",
        "rightHandPosition", "rightHandRotation", "rightHandType",
        "leftHandPosition", "leftHandRotation", "leftHandType"];
    handlerId = MyAvatar.addAnimationStateHandler(function (props) {
        if (Date.now() - lastDataArrived < 2000) {
            let returnProps = props;
            if (isLeftHandTracked) {
                returnProps.leftHandType = 0;
                returnProps.leftHandRotation = leftHandRotation;
                returnProps.leftHandPosition = leftHandPosition;
            }
            if (isRightHandTracked) {
                returnProps.rightHandType = 0;
                returnProps.rightHandRotation = rightHandRotation;
                returnProps.rightHandPosition = rightHandPosition;
            }
            returnProps.headRotation = Quat.fromPitchYawRollDegrees(pitch, -yaw, roll);
            returnProps.headType = 4;
            return returnProps;
        } else {
            return props;
        }
    }, propList);

    function onWebEventReceived(event) {

        var parsed = JSON.parse(event);
        if (parsed.channel === channel) {
            if (parsed.type === "tracking" || parsed.type === "trackingmotion") {
                var emotion = parsed.data;
                MyAvatar.hasScriptedBlendshapes = true;
                var bend = {
                    "EyeOpen_L": emotion["eyeWideLeft"] * 4,
                    "EyeOpen_R": emotion["eyeWideRight"] * 4,
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
                    "MouthSmile_L": emotion["mouthSmileLeft"] * 0.8,
                    "MouthSmile_R": emotion["mouthSmileRight"] * 0.8,
                    "MouthDimple_L": emotion["mouthStretchLeft"],
                    "MouthDimple_R": emotion["mouthStretchRight"],
                    "NoseSneer_L": emotion["noseSneerLeft"],
                    "NoseSneer_R": emotion["noseSneerRight"],
                    "Puff": emotion["cheekPuff"] * 1.3,
                    "CheekSquint_L": emotion["cheekSquintLeft"],
                    "CheekSquint_R": emotion["cheekSquintRight"],
                    "EyeDown_L": emotion["eyeLookDownLeft"] * 1.2,
                    "EyeDown_R": emotion["eyeLookDownRight"] * 1.2,
                    "EyeIn_L": emotion["eyeLookInLeft"],
                    "EyeIn_R": emotion["eyeLookInRight"],
                    "EyeOut_L": emotion["eyeLookOutLeft"],
                    "EyeOut_R": emotion["eyeLookOutRight"],
                    "EyeUp_L": emotion["eyeLookUpLeft"],
                    "EyeUp_R": emotion["eyeLookUpRight"],
                    "TongueOut": emotion["jawForward"],
                    "JawLeft": emotion["jawLeft"] * 3,
                    "JawRight": emotion["jawRight"] * 3,
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
                if (parsed.type === "trackingmotion") {
                    print("pitch: " + parsed.pitch + "yaw: " + parsed.yaw);
                    if (parsed.pitch <= -15 || parsed.pitch >= 5) {
                        forwardValue = 0;
                        yawValue = 0;
                        if (parsed.pitch > 5) {
                            pitchValue = 0.3;
                        }
                        if (parsed.pitch < -15) {
                            pitchValue = -0.3;
                        }
                        if (parsed.pitch >= -15 && parsed.pitch <= 5) {
                            pitchValue = 0;
                        }
                    } else {
                        pitchValue = 0;
                        if (parsed.yaw <= -10 || parsed.yaw >= 10) {
                            forwardValue = 0;

                            if (parsed.yaw > 10) {
                                yawValue = parsed.yaw / 20;
                            }
                            if (parsed.yaw < -10) {
                                yawValue = parsed.yaw / 20;
                            }
                            if (parsed.yaw >= -10 && parsed.yaw <= 10) {
                                yawValue = 0;
                            }
                        } else {
                            yawValue = 0;
                            if (emotion["browInnerUp"] > 0.1) {
                                forwardValue = -1;
                            }
                            if (emotion["browDownLeft"] > 0.4) {
                                forwardValue = 1;
                            }
                            if (emotion["browInnerUp"] <= 0.1 && emotion["browDownLeft"] <= 0.4) {
                                forwardValue = 0;
                            }
                        }
                    }
                }

                let headLM = parsed.poselm3D[0]; // Nose landmark
                let headPosition = {x: headLM.x, y: -headLM.y, z: -headLM.z};
                let offset = { x: 0, y: 0.4, z: 0};
                let scale = 2.0;

                //print(JSON.stringify(parsed));
                if (parsed.rightHandRig) {
                    isRightHandTracked = true;
                    rightHandPosition = {
                        //x: parsed.poselm3D[16].x,
                        //y: parsed.poselm3D[16].y,
                        //z: parsed.poselm3D[16].z}; // Left wrist
                        x: (parsed.poselm3D[16].x - headPosition.x) * scale + offset.x,
                        y: (-parsed.poselm3D[16].y - headPosition.y) * scale + offset.y,
                        z: (-parsed.poselm3D[16].z - headPosition.z) * scale + offset.z}; // Left wrist
                    //rightHandRotation = Quat.fromPitchYawRollRadians(parsed.rightHandRig.RightWrist.x,
                    //    parsed.rightHandRig.RightWrist.y,
                    //    parsed.rightHandRig.RightWrist.z);
                    print("RightHand: " + JSON.stringify(rightHandPosition) +" Head: " + JSON.stringify(headPosition));
                } else {
                    isRightHandTracked = false;
                }

                yaw = parsed.yaw;
                pitch = parsed.pitch;
                roll = parsed.roll;
                for (var blendshape in bend) {
                    MyAvatar.setBlendshape(blendshape, bend[blendshape]);
                }
                print("FPS: " + (1000 / (Date.now() - lastDataArrived)));
                lastDataArrived = Date.now();
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

        MyAvatar.removeAnimationStateHandler(handlerId);

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
