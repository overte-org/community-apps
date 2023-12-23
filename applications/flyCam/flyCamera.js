"use strict";
/*jslint vars:true, plusplus:true, forin:true*/
/*global Tablet, Script,  */
/* eslint indent: ["error", 4, { "outerIIFEBody": 0 }] */
//
// flyCamera.js
//
//  Created by Alezia Kurdis, December 10th, 2023. (based on "Spectator Camera" by by Zach Fox on June 5th, 2017)
//  Copyright 2023, Overte e.V.
//
// Distributed under the Apache License, Version 2.0
// See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

(function () { // BEGIN LOCAL_SCOPE

    var ROOT = Script.resolvePath('').split("flyCamera.js")[0];

    // FUNCTION VAR DECLARATIONS
    var sendToQml, addOrRemoveButton, onTabletScreenChanged, fromQml,
        onTabletButtonClicked, wireEventBridge, startup, shutdown, registerButtonMappings;

    // Function Name: flyCameraOn()
    //
    // Description:
    //   -Call this function to set up the fly camera and spawn the camera entity.

    var flyCameraConfig = Render.getConfig("SecondaryCamera");
    var camera = false;
    var cameraRotation;
    var cameraPosition;
    
    var cameraDistance = 3; //meters
    var cameraHeight = 0; //meters
    var cameraHorizontalAngle = 180; //degree
    var cameraVerticalAngle = 0; //degree
    var cameraTarget = "AVATAR"; //AVATAR | FORWARD | BACKWARD | OUTSIDE

    var cameraViewWidth = 0.25;
    var cameraViewAspect = 16/9;
    var toneCurve = 1;
    var cameraName = "Action Camera";

    function flyCameraPositioningUpdate() {
        if (camera) {
            computeCamPosition();
            Entities.editEntity(camera, {
                "localRotation": cameraRotation,
                "localPosition": cameraPosition
            });
        }
    }
    
    function computeCamPosition() {
        var antiHorizontalAngle = cameraHorizontalAngle - 180;
        if (antiHorizontalAngle < 0) {antiHorizontalAngle = antiHorizontalAngle + 360;}
        switch(cameraTarget) {
            case "AVATAR":
                cameraRotation = Quat.fromVec3Degrees({ "x": -cameraVerticalAngle, "y": antiHorizontalAngle, "z": 0 });
                break;
            case "FORWARD":
                cameraRotation = Quat.fromVec3Degrees({ "x": 0, "y": 0, "z": 0 });
                break;
            case "BACKWARD":
                cameraRotation = Quat.fromVec3Degrees({ "x": 0, "y": 180, "z": 0 });
                break;
            case "OUTSIDE":
                cameraRotation = Quat.fromVec3Degrees({ "x": cameraVerticalAngle, "y": cameraHorizontalAngle, "z": 0 });
                break;
        } 
        cameraPosition =  Vec3.multiplyQbyV(Quat.fromVec3Degrees({ "x": cameraVerticalAngle, "y": cameraHorizontalAngle, "z": 0 }), { "x": 0, "y": cameraHeight, "z": -cameraDistance });
    }
    
    function flyCameraOn() {
        cameraDistance = Settings.getValue('flyCamera/cameraDistance', 3); //meters
        cameraHeight = Settings.getValue('flyCamera/cameraHeight', 0); //meters
        cameraHorizontalAngle = Settings.getValue('flyCamera/cameraHorizontalAngle', 180); //degree
        cameraVerticalAngle = Settings.getValue('flyCamera/cameraVerticalAngle', 0); //degree
        cameraTarget = Settings.getValue('flyCamera/cameraTarget', "AVATAR"); //AVATAR | FORWARD | BACKWARD | OUTSIDE
        
        Render.getConfig("SecondaryCameraJob.ToneMapping").curve = toneCurve;

        // Sets the special texture size based on the window it is displayed in, which doesn't include the menu bar
        flyCameraConfig.enableSecondaryCameraRenderConfigs(true);
        flyCameraConfig.resetSizeSpectatorCamera(Window.innerWidth, Window.innerHeight);
        computeCamPosition();
        camera = Entities.addEntity({
            "name": cameraName,
            "dimensions": {
                "x": 0.03,
                "y": 0.03,
                "z": 0.03
            },
            "color": {
                "red": 0,
                "green": 0,
                "blue": 0
            },
            "canCastShadow": false,
            "parentID": MyAvatar.SELF_ID,
            "localRotation": cameraRotation,
            "localPosition": cameraPosition,
            "type": "Shape",
            "shape": "Cube",
            "grab": {
                "grabbable": false
            },
            "isVisibleInSecondaryCamera": false,
            "visible": false
        }, "local");
        flyCameraConfig.attachedEntityId = camera;
        if (!HMD.active) {
            setMonitorShowsCameraView(false);
        } else {
            setDisplay(monitorShowsCameraView);
        }
        // Change button to active when window is first opened OR if the camera is on, false otherwise.
        if (button) {
            button.editProperties({ isActive: onFlyCameraScreen || camera });
        }
        Audio.playSound(SOUND_CAMERA_ON, {
            volume: 0.25,
            position: cameraPosition,
            localOnly: true
        });
        
        setSwitchViewControllerMappingStatus(true);
        setTakeSnapshotControllerMappingStatus(true);
    }

    // Function Name: flyCameraOff()
    //
    // Description:
    //   -Call this function to shut down the fly camera and
    //    destroy the camera entity. "isChangingDomains" is true when this function is called
    //    from the "Window.domainChanged()" signal.
    var WAIT_AFTER_DOMAIN_SWITCH_BEFORE_CAMERA_DELETE_MS = 1 * 1000;
    function flyCameraOff(isChangingDomains) {
        function deleteCamera() {
            if (flash) {
                Entities.deleteEntity(flash);
                flash = false;
            }
            if (camera) {
                Entities.deleteEntity(camera);
                camera = false;
            }
            setSwitchViewControllerMappingStatus(false);
            setTakeSnapshotControllerMappingStatus(false);
            
            if (button) {
                // Change button to active when window is first openend OR if the camera is on, false otherwise.
                button.editProperties({ isActive: onFlyCameraScreen || camera });
            }
        }

        flyCameraConfig.attachedEntityId = false;
        flyCameraConfig.enableSecondaryCameraRenderConfigs(false);
        if (camera) {
            if (isChangingDomains) {
                Script.setTimeout(function () {
                    deleteCamera();
                    flyCameraOn();
                }, WAIT_AFTER_DOMAIN_SWITCH_BEFORE_CAMERA_DELETE_MS);
            } else {
                deleteCamera();
            }
        }
        setDisplay(monitorShowsCameraView);
    }

    // Function Name: addOrRemoveButton()
    //
    // Description:
    //   -Used to add or remove the "FLY-CAM" app button from the HUD/tablet. Set the "isShuttingDown" argument
    //    to true if you're calling this function upon script shutdown. Set the "isHMDmode" to true if the user is
    //    in HMD; otherwise set to false.

    var button = false;
    var buttonName = "FLY-CAM";
    function addOrRemoveButton(isShuttingDown) {
        if (!tablet) {
            print("Warning in addOrRemoveButton(): 'tablet' undefined!");
            return;
        }
        if (!button) {
            if (!isShuttingDown) {
                button = tablet.addButton({
                    text: buttonName,
                    icon: ROOT + "flyCam-i.png",
                    activeIcon: ROOT + "flyCam-a.png"
                });
                button.clicked.connect(onTabletButtonClicked);
            }
        } else if (button) {
            if (isShuttingDown) {
                button.clicked.disconnect(onTabletButtonClicked);
                tablet.removeButton(button);
                button = false;
            }
        } else {
            print("ERROR adding/removing FLY-CAM button!");
        }
    }

    // Function Name: startup()
    //
    // Description:
    //   -startup() will be called when the script is loaded.

    var tablet = null;
    function startup() {
        tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
        addOrRemoveButton(false);
        tablet.screenChanged.connect(onTabletScreenChanged);
        Window.domainChanged.connect(onDomainChanged);
        Controller.keyPressEvent.connect(keyPressEvent);
        HMD.displayModeChanged.connect(onHMDChanged);
        camera = false;
        registerButtonMappings();
    }

    // Function Name: wireEventBridge()
    //
    // Description:
    //   -Used to connect/disconnect the script's response to the tablet's "fromQml" signal. Set the "on" argument to enable or
    //    disable to event bridge.

    var hasEventBridge = false;
    function wireEventBridge(on) {
        if (!tablet) {
            print("Warning in wireEventBridge(): 'tablet' undefined!");
            return;
        }
        if (on) {
            if (!hasEventBridge) {
                tablet.fromQml.connect(fromQml);
                hasEventBridge = true;
            }
        } else {
            if (hasEventBridge) {
                tablet.fromQml.disconnect(fromQml);
                hasEventBridge = false;
            }
        }
    }

    // Function Name: setDisplay()
    //
    // Description:
    //   -There are two bool variables that determine what the "url" argument to "setDisplayTexture(url)" should be:
    //     Camera on/off switch, and the "Monitor Shows" on/off switch.
    //     This results in four possible cases for the argument. Those four cases are:
    //     1. Camera is off; "Monitor Shows" is "HMD Preview": "url" is ""
    //     2. Camera is off; "Monitor Shows" is "Camera View": "url" is ""
    //     3. Camera is on; "Monitor Shows" is "HMD Preview":  "url" is ""
    //     4. Camera is on; "Monitor Shows" is "Camera View":  "url" is "resource://spectatorCameraFrame"
    function setDisplay(showCameraView) {
        var url = (camera) ? (showCameraView ? "resource://spectatorCameraFrame" : "resource://hmdPreviewFrame") : "";

        // FIXME: temporary hack to avoid setting the display texture to hmdPreviewFrame
        // until it is the correct mono.
        if (url === "resource://hmdPreviewFrame") {
            Window.setDisplayTexture("");
        } else {
            Window.setDisplayTexture(url);
        }
    }
    const MONITOR_SHOWS_CAMERA_VIEW_DEFAULT = false;
    var monitorShowsCameraView = !!Settings.getValue('flyCamera/monitorShowsCameraView', MONITOR_SHOWS_CAMERA_VIEW_DEFAULT);
    function setMonitorShowsCameraView(showCameraView) {
        setDisplay(showCameraView);
        monitorShowsCameraView = showCameraView;
        Settings.setValue('flyCamera/monitorShowsCameraView', showCameraView);
    }
    function setMonitorShowsCameraViewAndSendToQml(showCameraView) {
        setMonitorShowsCameraView(showCameraView);
        sendToQml({ method: 'updateMonitorShowsSwitch', params: showCameraView });
    }
    function keyPressEvent(event) {
        if ((event.text === "0") && !event.isAutoRepeat && !event.isShifted && !event.isMeta && event.isControl && !event.isAlt) {
            setMonitorShowsCameraViewAndSendToQml(!monitorShowsCameraView);
        }
    }

    function setSwitchViewControllerMappingStatus(status) {
        if (!switchViewControllerMapping) {
            return;
        }
        if (status) {
            switchViewControllerMapping.enable();
        } else {
            switchViewControllerMapping.disable();
        }
    }

    function setTakeSnapshotControllerMappingStatus(status) {
        if (!takeSnapshotControllerMapping) {
            return;
        }
        if (status) {
            takeSnapshotControllerMapping.enable();
        } else {
            takeSnapshotControllerMapping.disable();
        }
    }

    // Function Name: registerButtonMappings()
    //
    // Description:
    //   -Updates controller button mappings for fly Camera.

    var switchViewControllerMapping;
    var switchViewControllerMappingName = 'Hifi-flyCamera-Mapping-SwitchView';
    function registerSwitchViewControllerMapping() {
        switchViewControllerMapping = Controller.newMapping(switchViewControllerMappingName);
        if (controllerType === "OculusTouch") {
            switchViewControllerMapping.from(Controller.Standard.LS).to(function (value) {
                if (value === 1.0) {
                    setMonitorShowsCameraViewAndSendToQml(!monitorShowsCameraView);
                }
                return;
            });
        } else if (controllerType === "Vive") {
            switchViewControllerMapping.from(Controller.Standard.LeftPrimaryThumb).to(function (value) {
                if (value === 1.0) {
                    setMonitorShowsCameraViewAndSendToQml(!monitorShowsCameraView);
                }
                return;
            });
        }
    }
    var takeSnapshotControllerMapping;
    var takeSnapshotControllerMappingName = 'Hifi-flyCamera-Mapping-TakeSnapshot';

    var flash = false;
    function setFlashStatus(enabled) {
        var cameraPosition = Entities.getEntityProperties(camera, ["positon"]).position;
        if (enabled) {
            if (camera) {
                Audio.playSound(SOUND_FLASH_ON, {
                    position: cameraPosition,
                    localOnly: true,
                    volume: 0.8
                });
                flash = Entities.addEntity({
                    "collidesWith": "",
                    "collisionMask": 0,
                    "color": {
                        "blue": 173,
                        "green": 252,
                        "red": 255
                    },
                    "cutoff": 90,
                    "dimensions": {
                        "x": 4,
                        "y": 4,
                        "z": 4
                    },
                    "dynamic": false,
                    "falloffRadius": 0.20000000298023224,
                    "intensity": 37,
                    "isSpotlight": true,
                    "localRotation": { w: 1, x: 0, y: 0, z: 0 },
                    "localPosition": { x: 0, y: -0.005, z: -0.08 },
                    "name": "Camera Flash",
                    "type": "Light",
                    "parentID": camera,
                }, true);
            }
        } else {
            if (flash) {
                Audio.playSound(SOUND_FLASH_OFF, {
                    position: cameraPosition,
                    localOnly: true,
                    volume: 0.8
                });
                Entities.deleteEntity(flash);
                flash = false;
            }
        }
    }

    function onStillSnapshotTaken() {
        Render.getConfig("SecondaryCameraJob.ToneMapping").curve = toneCurve;
        sendToQml({
            method: 'finishedProcessingStillSnapshot'
        });
    }
    function maybeTakeSnapshot() {
        if (camera) {
            sendToQml({
                method: 'startedProcessingStillSnapshot'
            });

            // Wait a moment before taking the snapshot for the tonemapping curve to update
            Script.setTimeout(function () {
                Audio.playSound(SOUND_SNAPSHOT, {
                    position: { x: MyAvatar.position.x, y: MyAvatar.position.y, z: MyAvatar.position.z },
                    localOnly: true,
                    volume: 1.0
                });
                Window.takeSecondaryCameraSnapshot();
            }, 250);
        } else {
            sendToQml({
                method: 'finishedProcessingStillSnapshot'
            });
        }
    }
    function on360SnapshotTaken() {
        if (monitorShowsCameraView) {
            setDisplay(true);
        }
        sendToQml({
            method: 'finishedProcessing360Snapshot'
        });
    }
    function maybeTake360Snapshot() {
        if (camera) {
            Audio.playSound(SOUND_SNAPSHOT, {
                position: { x: MyAvatar.position.x, y: MyAvatar.position.y, z: MyAvatar.position.z },
                localOnly: true,
                volume: 1.0
            });
            if (HMD.active && monitorShowsCameraView) {
                setDisplay(false);
            }
            Window.takeSecondaryCamera360Snapshot(Entities.getEntityProperties(camera, ["positon"]).position);
        }
    }
    function registerTakeSnapshotControllerMapping() {
        takeSnapshotControllerMapping = Controller.newMapping(takeSnapshotControllerMappingName);
        if (controllerType === "OculusTouch") {
            takeSnapshotControllerMapping.from(Controller.Standard.RS).to(function (value) {
                if (value === 1.0) {
                    maybeTakeSnapshot();
                }
                return;
            });
        } else if (controllerType === "Vive") {
            takeSnapshotControllerMapping.from(Controller.Standard.RightPrimaryThumb).to(function (value) {
                if (value === 1.0) {
                    maybeTakeSnapshot();
                }
                return;
            });
        }
    }
    var controllerType = "Other";
    function registerButtonMappings() {
        var VRDevices = Controller.getDeviceNames().toString();
        if (VRDevices) {
            if (VRDevices.indexOf("Vive") !== -1) {
                controllerType = "Vive";
            } else if (VRDevices.indexOf("OculusTouch") !== -1) {
                controllerType = "OculusTouch";
            } else {
                sendToQml({
                    method: 'updateControllerMappingCheckbox',
                    controller: controllerType
                });
                return; // Neither Vive nor Touch detected
            }
        }

        if (!switchViewControllerMapping) {
            registerSwitchViewControllerMapping();
        }
        setSwitchViewControllerMappingStatus(true);

        if (!takeSnapshotControllerMapping) {
            registerTakeSnapshotControllerMapping();
        }
        setTakeSnapshotControllerMappingStatus(true);

        sendToQml({
            method: 'updateControllerMappingCheckbox',
            controller: controllerType
        });
    }

    // Function Name: onTabletButtonClicked()
    //
    // Description:
    //   -Fired when the fly Camera app button is pressed.
    //
    // Relevant Variables:
    //   -FLY_CAMERA_QML_SOURCE: The path to the flyCamera QML
    //   -onFlyCameraScreen: true/false depending on whether we're looking at the fly camera app.
    var FLY_CAMERA_QML_SOURCE = Script.resolvePath("flyCamera.qml");
    var onFlyCameraScreen = false;
    function onTabletButtonClicked() {
        if (!tablet) {
            print("Warning in onTabletButtonClicked(): 'tablet' undefined!");
            return;
        }
        if (onFlyCameraScreen) {
            // for toolbar-mode: go back to home screen, this will close the window.
            tablet.gotoHomeScreen();
        } else {
            tablet.loadQMLSource(FLY_CAMERA_QML_SOURCE);
        }
    }

    function updateFlyCameraQML() {
        var messageToQML = { 
            "method": 'initializeUI', 
            "masterSwitchOn": !!camera, 
            "flashCheckboxChecked": !!flash, 
            "monitorShowsCamView": monitorShowsCameraView,
            "cameraDistance": cameraDistance,
            "cameraTarget": cameraTarget,
            "cameraHorizontalAngle": cameraHorizontalAngle,
            "cameraVerticalAngle": cameraVerticalAngle
        };
        sendToQml(messageToQML);
        registerButtonMappings();
        Menu.setIsOptionChecked("Disable Preview", false);
        Menu.setIsOptionChecked("Mono Preview", true);
    }

    var signalsWired = false;
    function wireSignals(shouldWire) {
        if (signalsWired === shouldWire) {
            return;
        }
        
        signalsWired = shouldWire;
    
        if (shouldWire) {
            Window.stillSnapshotTaken.connect(onStillSnapshotTaken);
            Window.snapshot360Taken.connect(on360SnapshotTaken);
        } else {
            Window.stillSnapshotTaken.disconnect(onStillSnapshotTaken);
            Window.snapshot360Taken.disconnect(on360SnapshotTaken);
        }
    }

    // Function Name: onTabletScreenChanged()
    //
    // Description:
    //   -Called when the TabletScriptingInterface::screenChanged() signal is emitted. The "type" argument can be either the string
    //    value of "Home", "Web", "Menu", "QML", or "Closed". The "url" argument is only valid for Web and QML.
    function onTabletScreenChanged(type, url) {
        onFlyCameraScreen = (type === "QML" && url === FLY_CAMERA_QML_SOURCE);
        wireEventBridge(onFlyCameraScreen);
        // Change button to active when window is first openend OR if the camera is on, false otherwise.
        if (button) {
            button.editProperties({ isActive: onFlyCameraScreen || camera });
        }

        // In the case of a remote QML app, it takes a bit of time
        // for the event bridge to actually connect, so we have to wait...
        Script.setTimeout(function () {
            if (onFlyCameraScreen) {
                updateFlyCameraQML();
            }
        }, 700);

        wireSignals(onFlyCameraScreen);
    }

    // Function Name: sendToQml()
    //
    // Description:
    //   -Use this function to send a message to the QML (i.e. to change appearances). The "message" argument is what is sent to
    //    flyCamera QML in the format "{method, params}", like json-rpc. See also fromQml().
    function sendToQml(message) {
        if (onFlyCameraScreen) {
            tablet.sendToQml(message);
        }
    }

    // Function Name: fromQml()
    //
    // Description:
    //   -Called when a message is received from flyCamera.qml. The "message" argument is what is sent from the flyCamera QML
    //    in the format "{method, params}", like json-rpc. See also sendToQml().
    function fromQml(message) {
        switch (message.method) {
            case 'flyCameraOn':
                flyCameraOn();
                break;
            case 'flyCameraOff':
                flyCameraOff();
                break;
            case 'setMonitorShowsCameraView':
                setMonitorShowsCameraView(message.params);
                break;
            case 'updateCameravFoV':
                flyCameraConfig.vFoV = message.vFoV;
                break;
            case 'updateToneMap':
                toneCurve = message.toneCurve;
                Render.getConfig("SecondaryCameraJob.ToneMapping").curve = toneCurve;
                 break;               
            case 'setFlashStatus':
                setFlashStatus(message.enabled);
                break;
            case 'updateCameraHorAngle':
                cameraHorizontalAngle = message.horAngle;
                Settings.setValue('flyCamera/cameraHorizontalAngle', cameraHorizontalAngle);
                flyCameraPositioningUpdate();
                break;
            case 'updateCameraVertAngle':
                cameraVerticalAngle = message.vertAngle;
                Settings.setValue('flyCamera/cameraVerticalAngle', cameraVerticalAngle);
                flyCameraPositioningUpdate();
                break;
            case 'updateCameraDist':
                cameraDistance = Math.floor(message.distance*10)/10;
                Settings.setValue('flyCamera/cameraDistance', cameraDistance);
                flyCameraPositioningUpdate();
                break;
            case 'updateCameraTarget':
                cameraTarget = message.target;
                Settings.setValue('flyCamera/cameraTarget', cameraTarget);
                flyCameraPositioningUpdate();
                break;
            case 'updateCameraHeight':
                cameraHeight = Math.floor(message.height*100)/100;
                Settings.setValue('flyCamera/cameraHeight', cameraHeight);
                flyCameraPositioningUpdate();
                break;
            case 'takeSecondaryCameraSnapshot':
                maybeTakeSnapshot();
                break;
            case 'takeSecondaryCamera360Snapshot':
                maybeTake360Snapshot();
                break;
            case 'openSettings':
                if ((HMD.active && Settings.getValue("hmdTabletBecomesToolbar", false))
                    || (!HMD.active && Settings.getValue("desktopTabletBecomesToolbar", true))) {
                    Desktop.show("hifi/dialogs/GeneralPreferencesDialog.qml", "GeneralPreferencesDialog");
                } else {
                    tablet.pushOntoStack("hifi/tablet/TabletGeneralPreferences.qml");
                }
                break;
            default:
                print('Unrecognized message from flyCamera.qml:', JSON.stringify(message));
        }
    }

    // Function Name: onHMDChanged()
    //
    // Description:
    //   -Called from C++ when HMD mode is changed. The argument "isHMDMode" is true if HMD is on; false otherwise.
    function onHMDChanged(isHMDMode) {
        registerButtonMappings();
        if (!isHMDMode) {
            setMonitorShowsCameraView(false);
        } else {
            setDisplay(monitorShowsCameraView);
        }
    }

    // Function Name: shutdown()
    //
    // Description:
    //   -shutdown() will be called when the script ends (i.e. is stopped).
    function shutdown() {
        flyCameraOff();
        Window.domainChanged.disconnect(onDomainChanged);
        wireSignals(false);
        if (tablet) {
            tablet.screenChanged.disconnect(onTabletScreenChanged);
            if (onFlyCameraScreen) {
                tablet.gotoHomeScreen();
            }
        }
        addOrRemoveButton(true);
        HMD.displayModeChanged.disconnect(onHMDChanged);
        Controller.keyPressEvent.disconnect(keyPressEvent);
        if (switchViewControllerMapping) {
            switchViewControllerMapping.disable();
        }
        if (takeSnapshotControllerMapping) {
            takeSnapshotControllerMapping.disable();
        }
        Script.scriptEnding.disconnect(shutdown);
    }

    // Function Name: onDomainChanged()
    //
    // Description:
    //   -A small utility function used when the Window.domainChanged() signal is fired.
    function onDomainChanged() {
        flyCameraOff(true);
    }
    

    
    // These functions will be called when the script is loaded.
    var SOUND_CAMERA_ON = SoundCache.getSound(Script.resolvePath("cameraOn.wav"));
    var SOUND_SNAPSHOT = SoundCache.getSound(Script.resolvePath("snap.wav"));
    var SOUND_FLASH_ON = SoundCache.getSound(Script.resolvePath("flashOn.wav"));
    var SOUND_FLASH_OFF = SoundCache.getSound(Script.resolvePath("flashOff.wav"));
    startup();
    Script.scriptEnding.connect(shutdown);

}());
