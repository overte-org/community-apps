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

var webWindow;

(function () {
    var jsMainFileName = "emocam1.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    var channel = "org.overte.application.emocam";
    var avatarList = {};
    var button;
    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
    var EMOTE_APP_QML_BASE = "view.qml";
    var EMOTE_APP_URL = Script.resolvePath(EMOTE_APP_QML_BASE);
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
    var headTransform = null;
    var lastDataArrived = 0;
    const POSE_TIMEOUT_MS = 2000;
    var proceduralBlinkingPreviousState = MyAvatar.hasProceduralBlinkFaceMovement;
    // Caching this value is a good idea because API calls are expensive
    var isProceduralBlinkingAllowed = true;

    button = tablet.addButton({
        icon: ROOT + "images/face.png",
        activeIcon: ROOT + "images/facei.png",
        text: EMOTE_LABEL,
        sortOrder: EMOTE_APP_SORT_ORDER
    });

    function onClicked() {
        if (!webWindow) {
            webWindow = Desktop.createWindow(EMOTE_APP_URL, {
                title: "Face tracking",
                presentationMode: Desktop.PresentationMode.NATIVE,
                size: { x: 500, y: 400 }
            });
            if (webWindow) {
                webWindow.webEventReceived.connect(onWebEventReceived);
                webWindow.closed.connect(onWindowClosed);
                button.editProperties({isActive: true});
            } else {
                print("Failed to create web window");
            }
        } else {
            if (webWindow.visible) {
                webWindow.visible = false;
            } else {
                webWindow.visible = true;
            }
            button.editProperties({isActive: webWindow.visible});
        }
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

    var propList = ["headRotation", "headType"];
    handlerId = MyAvatar.addAnimationStateHandler(function (props) {
        // Just pass through the animation state without modifying it when pose times out
        if (Date.now() - lastDataArrived < POSE_TIMEOUT_MS) {
            if (isProceduralBlinkingAllowed) {
                MyAvatar.hasProceduralBlinkFaceMovement = false;
                isProceduralBlinkingAllowed = false;
            }
            return {
                headRotation: headTransform,
                headType: 4
            };
        } else {
            if (!isProceduralBlinkingAllowed) {
                MyAvatar.hasProceduralBlinkFaceMovement = proceduralBlinkingPreviousState;
                isProceduralBlinkingAllowed = true;
            }
            return props;
        }
    }, propList);

    function onWebEventReceived(event) {
        if (parsed.channel === channel) {
                  //TODO: This should work?
            if (parsed.type === "preset"){
                Settings.setValue(parsed.name, parsed.data);
            }
                  ////TODO: This should work?
            if (parsed.type === "preset_list"){             
                Settings.setValue(parsed.name, parsed.data);
            }  
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
                    "EyeSquint_L": emotion["eyeSquintLeft"],
                    "EyeSquint_R": emotion["eyeSquintRight"],
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

                pitch = parsed.pitch;
                yaw = parsed.yaw;
                roll = parsed.roll;
                let trackingOrientation = Quat.fromPitchYawRollDegrees(pitch, -yaw, roll);
                let cameraMode = Camera.mode;
                if (cameraMode === "first person" || cameraMode === "first person look at"
                    || cameraMode === "third person" || cameraMode === "look at") {
                    let cameraRotation = Quat.multiply(Quat.inverse(MyAvatar.orientation), Camera.orientation);
                    let cameraRotationYawOnly = Quat.cancelOutRollAndPitch(cameraRotation);
                    let cameraRotationAdjusted = Quat.slerp(cameraRotationYawOnly, Quat.IDENTITY, 0.5);
                    headTransform = Quat.multiply(cameraRotationAdjusted, trackingOrientation);
                } else {
                    headTransform = trackingOrientation;
                }
                for (var blendshape in bend) {
                    MyAvatar.setBlendshape(blendshape, bend[blendshape]);
                }
                lastDataArrived = Date.now();
            }
        }
    }

    function onWindowClosed() {
        webWindow = null;
        button.editProperties({isActive: false});
    }

    button.clicked.connect(onClicked);
    
    Script.scriptEnding.connect(function () {

        MyAvatar.removeAnimationStateHandler(handlerId);
        if (webWindow) {
            webWindow.close();
        }
        button.clicked.disconnect(onClicked);
         if (tablet) {
            tablet.removeButton(button);
        }

        MyAvatar.hasProceduralBlinkFaceMovement = proceduralBlinkingPreviousState;
        MyAvatar.restoreAnimation();
        mapping.disable();
    });
}());
