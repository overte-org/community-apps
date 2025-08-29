"use strict";
//
//  cam360.js
//
//  Created by Zach Fox on October 26th, 2018.
//  Copyright 2018 High Fidelity, Inc.
//  Copyright 2022-2025, Overte e.V.
//
//  Application to take 360 degrees photo by throwing a camera in the air (as in Ready Player One (RPO)) or as a standard positionned camera.
//  version 2.0
//
//  Distributed under the Apache License, Version 2.0
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

(function () { // BEGIN LOCAL_SCOPE
    var controllerStandard = Controller.Standard;
    
    // Function Name: inFrontOf()
    // Description:
    //   - Returns the position in front of the given "position" argument, where the forward vector is based off
    //    the "orientation" argument and the amount in front is based off the "distance" argument.
    function inFrontOf(distance, position, orientation) {
        return Vec3.sum(position || MyAvatar.position,
            Vec3.multiply(distance, Quat.getForward(orientation || MyAvatar.orientation)));
    }

    // Function Name: rpo360On()
    const CAMERA_NAME = "CAM360 Camera";
    const SETTING_LAST_360_CAPTURE = "overte_app_cam360_last_capture";
    const SETTING_POST_SHOT_BAHAVIOR = "overte_app_cam360_post_shot_behavior";
    const SETTING_VISUALIZER_ALPHA = "overte_app_cam360_visualizer_alpha";
    var secondaryCameraConfig = Render.getConfig("SecondaryCamera");
    var camera = false;
    var cameraRotation;
    var cameraPosition;
    var cameraGravity = {x: 0, y: -5, z: 0};
    var velocityLoopInterval = false;
    var isThrowMode = true;
    var visualizerID = Uuid.NONE;
    var visualizerMaterialID = Uuid.NONE;
    const HISTORY_LENGTH = 20;
    let currentPreviewIndex = 0;
    let visualizerAlpha = Settings.getValue(SETTING_VISUALIZER_ALPHA, 1.0);
    let postShotBehavior = Settings.getValue(SETTING_POST_SHOT_BAHAVIOR, "HOME");
    
    function rpo360On() {
        // Rez the camera model, and attach
        // the secondary camera to the rezzed model.
        cameraRotation = MyAvatar.orientation;
        cameraPosition = inFrontOf(1.0, Vec3.sum(MyAvatar.position, { x: 0, y: 0.3, z: 0 }));
        var properties;
        var hostType = "";
        if (isThrowMode) {
            if ( Entities.canRezAvatarEntities() ) {
                properties = {
                    "angularDamping": 0.08,
                    "canCastShadow": false,
                    "damping": 0.01,
                    "collisionMask": 7,
                    "modelURL": Script.resolvePath("resources/models/cam360white.fst"),
                    "name": CAMERA_NAME,
                    "rotation": cameraRotation,
                    "position": cameraPosition,
                    "shapeType": "simple-compound",
                    "type": "Model",
                    "grab": {
                        "grabbable": true
                    },
                    "script": Script.resolvePath("grabDetection.js"),
                    "userData": "",
                    "isVisibleInSecondaryCamera": false,
                    "gravity": cameraGravity,
                    "dynamic": true
                };
                hostType = "avatar";
            } else {
                Window.displayAnnouncement("Sorry. The Throwing Camera can't be created in this domain.");
            }
        } else {
            properties = {
                "canCastShadow": false,
                "collisionMask": 7,
                "modelURL": Script.resolvePath("resources/models/cam360black.fst"),
                "name": CAMERA_NAME,
                "rotation": cameraRotation,
                "position": cameraPosition,
                "shapeType": "sphere",
                "type": "Model",
                "grab": {
                    "grabbable": true
                },
                "userData": "",
                "isVisibleInSecondaryCamera": false
            };
            hostType = Entities.canRezAvatarEntities() ? "avatar" : "local";
        }
        
        camera = Entities.addEntity(properties, hostType);
        secondaryCameraConfig.attachedEntityId = camera;

        // Play a little sound to let the user know we've rezzed the camera
        Audio.playSound(SOUND_CAMERA_ON, {
            "volume": 0.2,
            "position": cameraPosition,
            "localOnly": true
        });

        // Remove the existing camera model from the domain if one exists.
        // It's easy for this to happen if the user crashes while the RPO360 Camera is on.
        // We do this down here (after the new one is rezzed) so that we don't accidentally delete
        // the newly-rezzed model.
        var entityIDs = Entities.findEntitiesByName(CAMERA_NAME, MyAvatar.position, 100, false);
        entityIDs.forEach(function (currentEntityID) {
            var currentEntityOwner = Entities.getEntityProperties(currentEntityID, ['owningAvatarID']).owningAvatarID;
            if (currentEntityOwner === MyAvatar.sessionUUID && currentEntityID !== camera) {
                Entities.deleteEntity(currentEntityID);
            }
        });
        
        setTakePhotoControllerMappingStatus();
        
        // Start the velocity loop interval at 70ms
        // This is used to determine when the 360 photo should be snapped
        if (isThrowMode) {
            velocityLoopInterval = Script.setInterval(function () {
                velocityLoop();
            }, 70);
        }
    }

    // Function Name: velocityLoop()
    var hasBeenThrown = false;
    var snapshotVelocity = false;
    var snapshotAngularVelocity = false;
    var velocityWasPositive = false;
    var cameraReleaseTime = false;
    var MIN_AIRTIME_MS = 500;
    var flash = false;
    var useFlash = false;
    function velocityLoop() {
        // Get the velocity and angular velocity of the camera model
        var properties = Entities.getEntityProperties(camera, ["velocity", "angularVelocity", "description"]);
        var velocity = properties.velocity;
        var angularVelocity = properties.angularVelocity;
        var releasedState = properties.description;

        if (releasedState === "RELEASED" && !hasBeenThrown) {
            hasBeenThrown = true;
            // Record the time at which a user has thrown the camera
            cameraReleaseTime = Date.now();
        }

        // If we've been thrown UP...
        if (hasBeenThrown && velocity.y > 0) {
            // Set this flag to true
            velocityWasPositive = true;
        }

        // If we've been thrown UP in the past, but now we're coming DOWN...
        if (hasBeenThrown && velocityWasPositive && velocity.y < 0) {
            // Reset the state machine
            hasBeenThrown = false;
            velocityWasPositive = false;
            // Don't take a snapshot if the camera hasn't been in the air for very long
            if (Date.now() - cameraReleaseTime <= MIN_AIRTIME_MS) {
                Entities.editEntity(camera, {
                    "description": ""
                });
                return;
            }
            // Save these properties so that the camera falls realistically
            // after it's taken the 360 snapshot
            snapshotVelocity = velocity;
            snapshotAngularVelocity = angularVelocity;
            // Freeze the camera model and make it not grabbable
            Entities.editEntity(camera, {
                "velocity": {"x": 0, "y": 0, "z": 0},
                "angularVelocity": {"x": 0, "y": 0, "z": 0},
                "gravity": {"x": 0, "y": 0, "z": 0},
                "grab": {
                    "grabbable": false
                },
                "description": ""
            });
            // Add a "flash" to the camera that illuminates the ground below the camera
            if (useFlash) {
                flash = genFlash(camera);
            }
            // Take the snapshot!
            maybeTake360Snapshot();
        }
    }

    function genFlash(parentID) {
        return Entities.addEntity({
            "collidesWith": "",
            "collisionMask": 0,
            "color": {
                "blue": 173,
                "green": 252,
                "red": 255
            },
            "dimensions": {
                "x": 100,
                "y": 100,
                "z": 100
            },
            "dynamic": false,
            "falloffRadius": 10,
            "intensity": 1,
            "isSpotlight": false,
            "localRotation": { w: 1, x: 0, y: 0, z: 0 },
            "name": CAMERA_NAME + "_Flash",
            "type": "Light",
            "parentID": parentID
        }, "local");
    }

    function capture() {
        if (!isThrowMode) {
            if (useFlash) {
                flash = genFlash(camera);
            }
            // Take the snapshot!
            maybeTake360Snapshot();
        }
    }

    var WAIT_AFTER_DOMAIN_SWITCH_BEFORE_CAMERA_DELETE_MS = 1 * 1000;
    function rpo360Off(isChangingDomains) {
        if (velocityLoopInterval) {
            Script.clearInterval(velocityLoopInterval);
            velocityLoopInterval = false;
        }

        function deleteCamera() {
            if (flash) {
                Entities.deleteEntity(flash);
                flash = false;
            }
            if (camera) {
                Entities.deleteEntity(camera);
                camera = false;
            }
        }

        secondaryCameraConfig.attachedEntityId = false;
        if (camera) {
            // Workaround for Avatar Entities not immediately having properties after
            // the "Window.domainChanged()" signal is emitted.
            // May no longer be necessary; untested...
            if (isChangingDomains) {
                Script.setTimeout(function () {
                    deleteCamera();
                    rpo360On();
                }, WAIT_AFTER_DOMAIN_SWITCH_BEFORE_CAMERA_DELETE_MS);
            } else {
                deleteCamera();
            }
        }
        setTakePhotoControllerMappingStatus();
    }

    var isCurrentlyTaking360Snapshot = false;
    var processing360Snapshot = false;
    function maybeTake360Snapshot() {
        // Don't take a snapshot if we're currently in the middle of taking one
        // or if the camera entity doesn't exist
        if (!isCurrentlyTaking360Snapshot && camera) {
            isCurrentlyTaking360Snapshot = true;
            var currentCameraPosition = Entities.getEntityProperties(camera, ["position"]).position;
            // Play a sound at the current camera position
            Audio.playSound(SOUND_SNAPSHOT, {
                "position": { "x": currentCameraPosition.x, "y": currentCameraPosition.y, "z": currentCameraPosition.z },
                "localOnly": false,
                "volume": 0.8
            });
            Window.takeSecondaryCamera360Snapshot(currentCameraPosition);
            used360AppToTakeThisSnapshot = true;
            processing360Snapshot = true;

            // Let the UI know we're processing a 360 snapshot now
            tablet.emitScriptEvent(JSON.stringify({
                "channel": channel,
                "method": "startedProcessing360Snapshot"
            }));
        }
    }

    function on360SnapshotTaken(path) {
        isCurrentlyTaking360Snapshot = false;
        // Make the camera fall back to the ground with the same
        // physical properties as when it froze in the air
        if (isThrowMode) {
            Entities.editEntity(camera, {
                "velocity": snapshotVelocity,
                "angularVelocity": snapshotAngularVelocity,
                "gravity": cameraGravity,
                "grab": {
                    "grabbable": true
                }
            });
        }
        // Delete the flash entity
        if (flash) {
            Entities.deleteEntity(flash);
            flash = false;
        }

        updateSnapshot360HistorySetting(path);

        updateVisualizer();
        
        processing360Snapshot = false;
        tablet.emitScriptEvent(JSON.stringify({
            "channel": channel,
            "method": "finishedProcessing360Snapshot"
        }));
        
        if (isThrowMode) {
            if (postShotBehavior === "TURNOFF") {
                rpo360Off();
                tablet.emitScriptEvent(JSON.stringify({
                    "channel": channel,
                    "method": "initializeUI",
                    "masterSwitchOn": !!camera,
                    "processing360Snapshot": processing360Snapshot,
                    "useFlash": useFlash,
                    "isThrowMode": isThrowMode,
                    "postShotBehavior": postShotBehavior,
                    "visualizerAlpha": visualizerAlpha
                }));
            } else if (postShotBehavior === "HOME") {
                rpo360Off(false);
                rpo360On();
            }
        }
    }
    
    function updateSnapshot360HistorySetting(url) {
        let updatedHistory = ["file:///" + url];
        for (let i = 0; i < HISTORY_LENGTH - 1; i++ ) {
            if (i >= last360ThumbnailURL.length) {
                break;
            }
            updatedHistory.push(last360ThumbnailURL[i]);
        }
        last360ThumbnailURL = updatedHistory.slice(0, HISTORY_LENGTH);
        Settings.setValue(SETTING_LAST_360_CAPTURE, last360ThumbnailURL);
    }

    var last360ThumbnailURL = Settings.getValue(SETTING_LAST_360_CAPTURE, [Script.resolvePath("resources/images/default.jpg")]);
    var used360AppToTakeThisSnapshot = false;

    function onDomainChanged() {
        rpo360Off(true);
    }

    // These functions will be called when the script is loaded.
    var SOUND_CAMERA_ON = SoundCache.getSound(Script.resolvePath("resources/sounds/cameraOn.wav"));
    var SOUND_SNAPSHOT = SoundCache.getSound(Script.resolvePath("resources/sounds/snap.wav"));
    var SOUND_WHOOSH = SoundCache.getSound(Script.resolvePath("resources/sounds/whoosh.mp3"));

    var jsMainFileName = "cam360.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    
    var APP_NAME = "CAM360";
    var APP_URL = ROOT + "cam360.html";
    var APP_ICON_INACTIVE = ROOT + "resources/images/icons/cam360-i.svg";
    var APP_ICON_ACTIVE = ROOT + "resources/images/icons/cam360-a.svg";
    var appStatus = false;
    var channel = "org.overte.applications.cam360";

    var timestamp = 0;
    var INTERCALL_DELAY = 200; //0.3 sec
    var DEG_TO_RAD = Math.PI/180;
    
    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");

    Window.domainChanged.connect(onDomainChanged);
    Window.snapshot360Taken.connect(on360SnapshotTaken);
    HMD.displayModeChanged.connect(onHMDChanged);
    
    camera = false;

    tablet.screenChanged.connect(onScreenChanged);

    var button = tablet.addButton({
        text: APP_NAME,
        icon: APP_ICON_INACTIVE,
        activeIcon: APP_ICON_ACTIVE
    });


    function clicked(){
        if (appStatus === true) {
            tablet.webEventReceived.disconnect(onAppWebEventReceived);
            tablet.gotoHomeScreen();
            appStatus = false;
            if (visualizerID !== Uuid.NONE) {
                Entities.deleteEntity(visualizerID);
                visualizerID = Uuid.NONE;
                Script.update.disconnect(whooshTimer);
            }
        }else{
            tablet.gotoWebScreen(APP_URL);
            tablet.webEventReceived.connect(onAppWebEventReceived);
            appStatus = true;
            registerButtonMappings();
        }

        button.editProperties({
            isActive: appStatus || camera
        });
    }

    button.clicked.connect(clicked);


    function onAppWebEventReceived(message){
        var d = new Date();
        var n = d.getTime();
        var messageObj = JSON.parse(message);
        if (messageObj.channel === channel) {
            if (messageObj.method === "rpo360On" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                rpo360On();
                
            } else if (messageObj.method === "rpo360Off" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                rpo360Off();
                
            } else if (messageObj.method === "openSettings" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                if ((HMD.active && Settings.getValue("hmdTabletBecomesToolbar", false)) || (!HMD.active && Settings.getValue("desktopTabletBecomesToolbar", true))) {
                    Desktop.show("hifi/dialogs/GeneralPreferencesDialog.qml", "GeneralPreferencesDialog");
                } else {
                    tablet.pushOntoStack("hifi/tablet/TabletGeneralPreferences.qml");
                }
                
            } else if (messageObj.method === "disableFlash" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                useFlash = false;
                
            } else if (messageObj.method === "enableFlash" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                useFlash = true;
                
            } else if (messageObj.method === "uiReady" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                tablet.emitScriptEvent(JSON.stringify({
                    "channel": channel,
                    "method": "initializeUI",
                    "masterSwitchOn": !!camera,
                    "processing360Snapshot": processing360Snapshot,
                    "useFlash": useFlash,
                    "isThrowMode": isThrowMode,
                    "postShotBehavior": postShotBehavior,
                    "visualizerAlpha": visualizerAlpha
                }));
                
            } else if (messageObj.method === "ThrowMode" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                isThrowMode = true;
                if (camera) {
                    rpo360Off();
                    rpo360On();
                }
            }  else if (messageObj.method === "PositionMode" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                isThrowMode = false;
                if (camera) {
                    rpo360Off();
                    rpo360On();
                }
            } else if (messageObj.method === "Capture" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                if (camera) {
                    capture();
                }
            } else if (messageObj.method === "showLastCapture" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                currentPreviewIndex = 0;
                showVisualizer();
            } else if (messageObj.method === "showPreviousCapture" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                currentPreviewIndex = currentPreviewIndex + 1;
                if (currentPreviewIndex === last360ThumbnailURL.length) {
                    currentPreviewIndex = 0;
                }
                updateVisualizer();
            } else if (messageObj.method === "showNextCapture" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                currentPreviewIndex = currentPreviewIndex - 1;
                if (currentPreviewIndex < 0) {
                    currentPreviewIndex = last360ThumbnailURL.length - 1;
                }
                updateVisualizer();
            } else if (messageObj.method === "setVisualizerAlpha" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                visualizerAlpha = messageObj.alpha;
                if (visualizerAlpha < 0.01 || visualizerAlpha > 1.0) {
                    visualizerAlpha = 1.0;
                }
                Settings.setValue(SETTING_VISUALIZER_ALPHA, visualizerAlpha);
                updateVisualizer();
            } else if (messageObj.method === "setPostBehavior" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                postShotBehavior = messageObj.postShotBehavior;
                Settings.setValue(SETTING_POST_SHOT_BAHAVIOR, postShotBehavior);
            } else if (messageObj.method === "SELF_UNINSTALL" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                ScriptDiscoveryService.stopScript(Script.resolvePath(''), false);
            }
        }
    }

    function showVisualizer() {
        if (visualizerID === Uuid.NONE) {
            visualizerID = Entities.addEntity({
                "type": "Model",
                "shapeType": "none",
                "name": "Lastest 360 capture",
                "dimensions": Vec3.multiply({ "x": 3.0, "y": 3.0, "z": 3.0 }, MyAvatar.scale),
                "modelURL": Script.resolvePath("resources/models/invertedSphere.glb"),
                "position": MyAvatar.getEyePosition(),
                "grab": {
                    "grabbable": false
                },
                "useOriginalPivot": true,
                "canCastShadow": false,
                "isVisibleInSecondaryCamera": false,
                "ignorePickIntersection": true
            }, "local");
            
            visualizerMaterialID = Entities.addEntity({
                "type": "Material",
                "parentID": visualizerID,
                "materialURL": "materialData",
                "priority": 2,
                "materialData": JSON.stringify({
                    "materialVersion": 1,
                    "materials": {
                        "albedo": [1.0, 1.0, 1.0],
                        "albedoMap": last360ThumbnailURL[currentPreviewIndex],
                        "unlit": true,
                        "metallic": 0.01,
                        "roughness": 0.5,
                        "opacity": visualizerAlpha,
                        "cullFaceMode": "CULL_BACK"
                    }
                })
                
            }, "local");

            tablet.emitScriptEvent(JSON.stringify({
                "channel": channel,
                "method": "visualizator_is_active"
            }));
            Script.update.connect(whooshTimer);
        } else {
            Entities.deleteEntity(visualizerID);
            visualizerID = Uuid.NONE;
            tablet.emitScriptEvent(JSON.stringify({
                "channel": channel,
                "method": "visualizator_is_inactive"
            }));
            Script.update.disconnect(whooshTimer);
        }
        
    }
    
    function updateVisualizer() {
        if (visualizerID !== Uuid.NONE) {
            Entities.editEntity(visualizerID, {"position": MyAvatar.getEyePosition()});
            Entities.editEntity(visualizerMaterialID, {
                "materialData": JSON.stringify({
                    "materialVersion": 1,
                    "materials": {
                        "albedo": [1.0, 1.0, 1.0],
                        "albedoMap": last360ThumbnailURL[currentPreviewIndex],
                        "unlit": true,
                        "metallic": 0.01,
                        "roughness": 0.5,
                        "opacity": visualizerAlpha,
                        "cullFaceMode": "CULL_BACK"
                    }
                })
            });
        }
    }
    
    function onScreenChanged(type, url) {
        if (type === "Web" && url.indexOf(APP_URL) !== -1) {
            appStatus = true;
        } else {
            appStatus = false;
            if (visualizerID !== Uuid.NONE) {
                Entities.deleteEntity(visualizerID);
                visualizerID = Uuid.NONE;
                Script.update.disconnect(whooshTimer);
            }
        }
        
        button.editProperties({
            isActive: appStatus || camera
        });
    }

    function cleanup() {

        if (appStatus) {
            tablet.gotoHomeScreen();
            tablet.webEventReceived.disconnect(onAppWebEventReceived);
        }
        
        if (visualizerID !== Uuid.NONE) {
            Entities.deleteEntity(visualizerID);
            visualizerID = Uuid.NONE;
            Script.update.disconnect(whooshTimer);
        }
        
        tablet.screenChanged.disconnect(onScreenChanged);
        tablet.removeButton(button);
        
        rpo360Off();
        
        if (takePhotoControllerMapping) {
            takePhotoControllerMapping.disable();
        }
        
        Window.domainChanged.disconnect(onDomainChanged);
        Window.snapshot360Taken.disconnect(on360SnapshotTaken);
        HMD.displayModeChanged.disconnect(onHMDChanged);
    }

    Script.scriptEnding.connect(cleanup);

    //Whoosh viewer
    function whooshTimer(deltaTime) {
        if (HMD.active) {
            checkHands();
        }
    }
    
    function checkHands() {
        var myLeftHand = Controller.getPoseValue(controllerStandard.LeftHand);
        var myRightHand = Controller.getPoseValue(controllerStandard.RightHand);
        var eyesPosition = MyAvatar.getEyePosition();
        var hipsPosition = MyAvatar.getJointPosition("Hips");
        var eyesRelativeHeight = eyesPosition.y - hipsPosition.y;
        if (myLeftHand.translation.y > eyesRelativeHeight || myRightHand.translation.y > eyesRelativeHeight) {
            Audio.playSound(SOUND_WHOOSH, {
                "position": MyAvatar.position,
                "localOnly": true,
                "volume": 1.0
            });
            if (visualizerID !== Uuid.NONE) {
                showVisualizer();
            }
        }
    }
 
    //controller 
    function setTakePhotoControllerMappingStatus() {
        if (!takePhotoControllerMapping) {
            return;
        }
        if (!isThrowMode) {
            takePhotoControllerMapping.enable();
        } else {
            takePhotoControllerMapping.disable();
        }
    }

    var takePhotoControllerMapping;
    var takePhotoControllerMappingName = 'Overte-cam360-Mapping-Capture';
    function registerTakePhotoControllerMapping() {
        takePhotoControllerMapping = Controller.newMapping(takePhotoControllerMappingName);
        if (controllerType === "OculusTouch" || controllerType === "OpenXR") {
            takePhotoControllerMapping.from(Controller.Standard.LS).to(function (value) {
                if (value === 1.0) {
                    if (camera) {
                        capture();
                    }
                }
                return;
            });
        } else if (controllerType === "Vive") {
            takePhotoControllerMapping.from(Controller.Standard.LeftPrimaryThumb).to(function (value) {
                if (value === 1.0) {
                    if (camera) {
                        capture();
                    }
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
            } else if (VRDevices.indexOf("OpenXR") !== -1) {
                controllerType = "OpenXR";
            } else {
                return;
            }
        }

        if (!takePhotoControllerMapping) {
            registerTakePhotoControllerMapping();
        }
    }

    function onHMDChanged(isHMDMode) {
        registerButtonMappings();
    }

}());
