"use strict";
//
//  cam360.js
//
//  Created by Zach Fox on 2018-10-26
//  Copyright 2018 High Fidelity, Inc.
//  Copyright 2022, Overte e.V.
//
//  Application to take 360 degrees photo by throwing a camera in the air (as in Ready Player One (RPO)) or as a standard positionned camera.
//  version 2.0
//
//  Distributed under the Apache License, Version 2.0
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

(function () { // BEGIN LOCAL_SCOPE

    // Function Name: inFrontOf()
    // Description:
    //   - Returns the position in front of the given "position" argument, where the forward vector is based off
    //    the "orientation" argument and the amount in front is based off the "distance" argument.
    function inFrontOf(distance, position, orientation) {
        return Vec3.sum(position || MyAvatar.position,
            Vec3.multiply(distance, Quat.getForward(orientation || MyAvatar.orientation)));
    }

    // Function Name: rpo360On()
    var CAMERA_NAME = "CAM360 Camera";
    var SETTING_LAST_360_CAPTURE = "overte_app_cam360_last_capture";
    var secondaryCameraConfig = Render.getConfig("SecondaryCamera");
    var camera = false;
    var cameraRotation;
    var cameraPosition;
    var cameraGravity = {x: 0, y: -5, z: 0};
    var velocityLoopInterval = false;
    var isThrowMode = true;

    function rpo360On() {
        // Rez the camera model, and attach
        // the secondary camera to the rezzed model.
        cameraRotation = MyAvatar.orientation;
        cameraPosition = inFrontOf(1.0, Vec3.sum(MyAvatar.position, { x: 0, y: 0.3, z: 0 }));
        var properties;
        var hostType = "";
        if (isThrowMode) {
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
            hostType = "avatar";
        }
        
        camera = Entities.addEntity(properties, hostType);
        secondaryCameraConfig.attachedEntityId = camera;

        // Play a little sound to let the user know we've rezzed the camera
        Audio.playSound(SOUND_CAMERA_ON, {
            "volume": 0.15,
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
            velocityLoopInterval = Script.setInterval(velocityLoop, 70);
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
        var properties = Entities.getEntityProperties(camera, ["velocity", "angularVelocity", "userData"]);
        var velocity = properties.velocity;
        var angularVelocity = properties.angularVelocity;
        var releasedState = properties.userData;

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
                    "userData": ""
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
                "userData": ""
            });
            // Add a "flash" to the camera that illuminates the ground below the camera
            if (useFlash) {
                flash = Entities.addEntity({
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
                    "parentID": camera
                }, "avatar");
            }
            // Take the snapshot!
            maybeTake360Snapshot();
        }
    }

    function capture() {
        if (!isThrowMode) {
            if (useFlash) {
                flash = Entities.addEntity({
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
                    "parentID": camera
                }, "avatar");
            }
            // Take the snapshot!
            maybeTake360Snapshot();
        }
    }

    // Function Name: rpo360Off()
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
            //buttonActive(ui.isOpen);
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
        //console.log('360 Snapshot taken. Path: ' + path);

        //update UI
        tablet.emitScriptEvent(JSON.stringify({
            "channel": channel,
            "method": "last360ThumbnailURL",
            "last360ThumbnailURL": path
        }));
        last360ThumbnailURL = path;
        Settings.setValue(SETTING_LAST_360_CAPTURE, last360ThumbnailURL);
        processing360Snapshot = false;
        tablet.emitScriptEvent(JSON.stringify({
            "channel": channel,
            "method": "finishedProcessing360Snapshot"
        }));
    }


    var last360ThumbnailURL = Settings.getValue(SETTING_LAST_360_CAPTURE, "");
    var used360AppToTakeThisSnapshot = false;

    function onDomainChanged() {
        rpo360Off(true);
    }

    // These functions will be called when the script is loaded.
    var SOUND_CAMERA_ON = SoundCache.getSound(Script.resolvePath("resources/sounds/cameraOn.wav"));
    var SOUND_SNAPSHOT = SoundCache.getSound(Script.resolvePath("resources/sounds/snap.wav"));


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
        }else{
            tablet.gotoWebScreen(APP_URL);
            tablet.webEventReceived.connect(onAppWebEventReceived);
            appStatus = true;
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
                    "last360ThumbnailURL": last360ThumbnailURL,
                    "processing360Snapshot": processing360Snapshot,
                    "useFlash": useFlash,
                    "isThrowMode": isThrowMode
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
            } 
            
        }
    }
    var udateSignateDisconnected = true;
    function onScreenChanged(type, url) {
        if (type === "Web" && url.indexOf(APP_URL) !== -1) {
            appStatus = true;
            Script.update.connect(myTimer);
            udateSignateDisconnected = false;
        } else {
            appStatus = false;
            if (!udateSignateDisconnected) {
                Script.update.disconnect(myTimer);
                udateSignateDisconnected = true;
            }
        }
        
        button.editProperties({
            isActive: appStatus || camera
        });
    }

    function myTimer(deltaTime) {
        var yaw = 0.0;
        var pitch = 0.0;
        var roll = 0.0;
        var euler;
        if (!HMD.active) { 
            //Use cuser camera for destop
            euler = Quat.safeEulerAngles(Camera.orientation);
            yaw = -euler.y;
            pitch = -euler.x;
            roll = -euler.z;
        } else {
            //Use Tablet orientation for HMD
            var tabletRotation = Entities.getEntityProperties(HMD.tabletID, ["rotation"]).rotation;
            var noRoll = Quat.cancelOutRoll(tabletRotation); //Pushing the roll is getting quite complexe
            euler = Quat.safeEulerAngles(noRoll);
            yaw = euler.y - 180;
            if (yaw < -180) { yaw = yaw + 360;}
            yaw = -yaw;
            pitch = euler.x;
            roll = 0;
        }

        tablet.emitScriptEvent(JSON.stringify({
            "channel": channel,
            "method": "yawPitchRoll",
            "yaw": yaw,
            "pitch": pitch,
            "roll": roll
        })); 
        
    }

    function cleanup() {

        if (appStatus) {
            tablet.gotoHomeScreen();
            tablet.webEventReceived.disconnect(onAppWebEventReceived);
            if (!udateSignateDisconnected) {
                Script.update.disconnect(myTimer);
                udateSignateDisconnected = true;
            }
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
        if (controllerType === "OculusTouch") {
            takePhotoControllerMapping.from(Controller.Standard.RS).to(function (value) {
                if (value === 1.0) {
                    if (camera) {
                        capture();
                    }
                }
                return;
            });
        } else if (controllerType === "Vive") {
            takePhotoControllerMapping.from(Controller.Standard.RightPrimaryThumb).to(function (value) {
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
            } else {
                return; // Neither Vive nor Touch detected
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
