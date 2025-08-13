"use strict";
//
//  app-survivalKit.js
//
//  Created by Alezia Kurdis, December 29th 2022.
//  Copyright 2022-2025 Overte e.V.
//
//  Survival kit for virtual worlds exploration in Overte.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var jsMainFileName = "app-survivalKit.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    
    var APP_NAME = "SURVIVAL";
    var APP_URL = ROOT + "survivalKit.html";
    var APP_ICON_INACTIVE = ROOT + "icon_inactive.png";
    var APP_ICON_ACTIVE = ROOT + "icon_active.png";
    var appStatus = false;
    
    var channel = "org.overte.app.survivalKit";
    
    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
    
    var UPDATE_TIMER_INTERVAL = 100; // 0.1 sec
    var processTimer = 0;
    
    var flashLightID = Uuid.NONE;
    var flashLightLightID = Uuid.NONE;
    var filter = "WHITE";

    var timestamp = 0;
    var INTERCALL_DELAY = 200; //0.3 sec
    
    var FLASHLIGHT_NAME = "%%!!Survival.Kit.vr.flashlight!!%%";
    
    tablet.screenChanged.connect(onScreenChanged);

    var button = tablet.addButton({
        text: APP_NAME,
        icon: APP_ICON_INACTIVE,
        activeIcon: APP_ICON_ACTIVE
    });

    var lightColor = {
        "WHITE": {"red": 255, "green": 250, "blue": 230},
        "AMBER": {"red": 255, "green": 145, "blue": 0},
        "RED": {"red": 255, "green": 0, "blue": 0},
        "BLUE": {"red": 0, "green": 119, "blue": 255}
    };

    function clicked(){
        if (appStatus === true) {
            tablet.webEventReceived.disconnect(onMoreAppWebEventReceived);
            tablet.gotoHomeScreen();
            Script.update.disconnect(myTimer);
            appStatus = false;
        }else{
            Script.update.connect(myTimer);
            var isFlashlightActive = "OFF";
            if (flashLightID !== Uuid.NONE) {
                isFlashlightActive = "ON";
            }
            var url = APP_URL + "?flashlight=" + isFlashlightActive + "&filter=" + filter;
            tablet.gotoWebScreen(url);
            tablet.webEventReceived.connect(onMoreAppWebEventReceived);
            appStatus = true;
        }
        
        if (flashLightID === Uuid.NONE) {
            button.editProperties({
                isActive: appStatus
            });
        } else {
            button.editProperties({
                isActive: true
            });            
        }
    }

    button.clicked.connect(clicked);


    function onMoreAppWebEventReceived(message) {
        var d = new Date();
        var n = d.getTime();
        
        if (typeof message === "string") {
            var eventObj = JSON.parse(message);
            if (eventObj.channel === channel) {
                if (eventObj.action === "UPDATE_FLASHLIGHT_ACTIVATION" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    if (eventObj.isActive === true) {
                        createFlashLight();
                    } else {
                        clearFlashLight();
                    }
                } else if (eventObj.action === "UPDATE_FLASHLIGHT_FILTER" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    filter = eventObj.filter;
                    updateFlashLightFilter();
                }  
            }
        }
    }

    function onScreenChanged(type, url) {
        if (type === "Web" && url.indexOf(APP_URL) !== -1) {
            appStatus = true;
            Script.update.connect(myTimer);
        } else {
            appStatus = false;
            if (url.indexOf(APP_URL) !== -1) {
                Script.update.disconnect(myTimer);
            }
        }
        
        if (flashLightID === Uuid.NONE) {
            button.editProperties({
                isActive: appStatus
            });
        } else {
            button.editProperties({
                isActive: true
            });            
        }
    }

    function myTimer(deltaTime) {
        var today = new Date();
        if ((today.getTime() - processTimer) > UPDATE_TIMER_INTERVAL ) {
            var azimuth = "" + (2000 - Math.floor(2000 * ((Quat.safeEulerAngles(MyAvatar.orientation).y + 180) / 360)));
            var dataToUi = {
                "channel": channel,
                "action": "UPDATE_AZIMUTH",
                "azimuth": azimuth
            };
            tablet.emitScriptEvent(JSON.stringify(dataToUi));

            today = new Date();
            processTimer = today.getTime();
        }  
    }

    function createFlashLight() {
        var entityIDs = Entities.findEntitiesByName(FLASHLIGHT_NAME, MyAvatar.position, 100, false);
        entityIDs.forEach(function (currentEntityID) {
            var currentEntityOwner = Entities.getEntityProperties(currentEntityID, ['owningAvatarID']).owningAvatarID;
            if (currentEntityOwner === MyAvatar.sessionUUID && currentEntityID !== flashLightID) {
                Entities.deleteEntity(currentEntityID);
            }
        });
        
        if (flashLightID === Uuid.NONE) {
            flashLightID = Entities.addEntity({
                "type": "Model",
                "modelURL": ROOT + "vrFlashLight_" + filter + ".fst",
                "name": FLASHLIGHT_NAME,
                "lifetime": 28800,
                "position": Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0, z: -1 })),
                "shapeType": "cylinder-z",
				"grab": {
					"grabbable": true
				},
                "rotation": MyAvatar.orientation
            }, "avatar");

            flashLightLightID = Entities.addEntity({
                "parentID": flashLightID,
                "type": "Light",
                "name": "Flashlight-Light",
                "dimensions": {"x": 192.8363, "y": 192.8363, "z": 300},
                "color": lightColor[filter],
                "intensity": 15,
                "falloffRadius": 1,
                "isSpotlight": true,
                "exponent": 1,
                "cutoff": 40,
                "localPosition":  {"x": 0, "y": 0, "z": -0.18}
            }, "avatar");
        }
    }
    
    function updateFlashLightFilter() {
        if (flashLightID !== Uuid.NONE) {
            Entities.editEntity(flashLightID, {"modelURL": ROOT + "vrFlashLight_" + filter + ".fst"});
            Entities.editEntity(flashLightLightID, {"color": lightColor[filter]});
        }
    }
    
    function clearFlashLight() {
        if (flashLightID !== Uuid.NONE) {
            Entities.deleteEntity(flashLightID);
            flashLightID = Uuid.NONE;
            flashLightLightID = Uuid.NONE;
        }
    }

    function cleanup() {

        if (appStatus) {
            tablet.gotoHomeScreen();
            tablet.webEventReceived.disconnect(onMoreAppWebEventReceived);
        }
        clearFlashLight();
        tablet.screenChanged.disconnect(onScreenChanged);
        tablet.removeButton(button);
        Script.update.disconnect(myTimer);
    }

    Script.scriptEnding.connect(cleanup);
}());
