//
//  app-audioZones.js
//
//  Created by Alezia Kurdis based on a concept from Silverfish, February 18th 2023.
//  Copyright 2023 Overte e.V.
//
//  This is a tool to help to create audio zones 
//  and provide the necessary configuration for the Domain Server.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var jsMainFileName = "app-audioZones.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    
    var APP_NAME = "AUDIO-Z";
    var APP_URL = ROOT + "audioZones.html";
    var APP_ICON_INACTIVE = ROOT + "images/icon_audioZone_inactive.png";
    var APP_ICON_ACTIVE = ROOT + "images/icon_audioZone_active.png";
    var appStatus = false;
    var channel = "overte.application.more.audioZones";
    var timestamp = 0;
    var INTERCALL_DELAY = 200; //0.3 sec
    var confirmationSound = SoundCache.getSound(ROOT + "sounds/confirmation.mp3");
    var rejectionSound = SoundCache.getSound(ROOT + "sounds/rejection.mp3");
    var INSUFFICIENT_PERMISSIONS_ERROR_MSG = "Sorry, you don't have the permission to use this application in this domain.";

    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
    
    var radius = Settings.getValue("entityListDefaultRadius", 300);
    
    tablet.screenChanged.connect(onScreenChanged);

    var button = tablet.addButton({
        text: APP_NAME,
        icon: APP_ICON_INACTIVE,
        activeIcon: APP_ICON_ACTIVE
    });


    function clicked(){
        if (appStatus === true) {
            tablet.webEventReceived.disconnect(onAppWebEventReceived);
            location.hostChanged.disconnect(onHostChanged);
            tablet.gotoHomeScreen();
            appStatus = false;
        }else{
            if (Entities.canRez() && Entities.canAdjustLocks()) {
                tablet.gotoWebScreen(APP_URL + "?radius=" + radius);
                tablet.webEventReceived.connect(onAppWebEventReceived);
                location.hostChanged.connect(onHostChanged);
                appStatus = true;
            } else {
                rejection();
                Window.displayAnnouncement(INSUFFICIENT_PERMISSIONS_ERROR_MSG);
            }
        }

        button.editProperties({
            isActive: appStatus
        });
    }

    button.clicked.connect(clicked);


    function onAppWebEventReceived(message) {
        if (typeof message === "string") {
            var d = new Date();
            var n = d.getTime();
            var instruction = JSON.parse(message);
            if (instruction.channel === channel) {
                if (instruction.action === "SHOW_AUDIO_ZONES" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    setAudioZonesVisibility(true);
                } else if (instruction.action === "HIDE_AUDIO_ZONES" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    setAudioZonesVisibility(false);
                } else if (instruction.action === "CREATE_AN_AUDIO_ZONE" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    createAudioZone(instruction.name);
                } else if (instruction.action === "COMPUTE_AUDIO_ZONES" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    computeAudioZones();
                } else if (instruction.action === "SELF_UNINSTALL" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    ScriptDiscoveryService.stopScript(Script.resolvePath(''), false);
                } else if (instruction.action === "SYS_SHOW_AUDIO_ZONES") {
                    setAudioZonesVisibility(true);
                } else if (instruction.action === "SYS_HIDE_AUDIO_ZONES") {
                    setAudioZonesVisibility(false);
                } else if (instruction.action === "SET_RADIUS" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    radius = instruction.radius;
                    computeAudioZones();
                }
            }
        }
    }

    function setAudioZonesVisibility(isVisible) {
        var lock = false;
        if (!isVisible) {
            lock = true;
        }
        var boxUUIDs = Entities.findEntitiesByType("Box", MyAvatar.position, radius);
        var foundBoxDescription = Entities.getMultipleEntityProperties(boxUUIDs, ["description", "locked"]);
        for(var i = 0; i < boxUUIDs.length; i++) {
            if(foundBoxDescription[i].description === "AudiozoneHelperBox_" + channel) {
                if (foundBoxDescription[i].locked) {
                    Entities.editEntity(boxUUIDs[i], {"locked": false});
                    Entities.editEntity(boxUUIDs[i], {"visible": isVisible, "locked": lock, "rotation": Quat.IDENTITY});
                } else {
                    Entities.editEntity(boxUUIDs[i], {"visible": isVisible, "locked": lock, "rotation": Quat.IDENTITY});
                }
            }
        }
    }

    function createAudioZone(name) {
        if(name === "" || name.indexOf(" ") !== -1) {
            rejection();
            Window.displayAnnouncement("Name is missing or contains space characters.");
            return;
        }
        var id = Entities.addEntity({
            "type": "Box",
            "name": name,
            "visible": true,
            "locked": false,
            "description": "AudiozoneHelperBox_" + channel,
            "primitiveMode": "lines",
            "renderLayer": "front",
            "color": {"red": 255, "green": 0, "blue": 0},
            "canCastShadow": false,
            "grab": {
                "grabbable": false
            },
            "collisionless": true,
            "position": Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, { "x": 0, "y": 0, "z": -5 })),
            "rotation": Quat.IDENTITY,
            "dimensions": { "x": 2, "y": 2, "z": 2 }
        }, "domain");
        if(id === Uuid.NULL) {
            rejection();
            Window.displayAnnouncement("Oops! Something went wrong with the creation of the Audio Zone.");
        } else {
            confirmation();
            computeAudioZones();
        }
    }

    function computeAudioZones() {
        var boxUUIDs = Entities.findEntitiesByType("Box", MyAvatar.position, radius);
        var propertySets = Entities.getMultipleEntityProperties(boxUUIDs, ["name", "description", "boundingBox", "rotation"]);
        var boxString = "";
        var outputText = "";
        var rotationIssue = false;
        var dot;
        for(var i = 0; i < propertySets.length; i++) {
            if(propertySets[i].description === "AudiozoneHelperBox_" + channel) {
                dot = Quat.dot(propertySets[i].rotation, Quat.IDENTITY);
                if (Math.abs(dot) < 0.9999) {
                    rotationIssue = true;
                }
                boxString = "Name: " + propertySets[i].name + "\n";
                boxString += "    X start:  " + propertySets[i].boundingBox.brn.x.toFixed(2) + "\n";
                boxString += "    X end  :  " + propertySets[i].boundingBox.tfl.x.toFixed(2) + "\n";
                boxString += "    Y start:  " + propertySets[i].boundingBox.brn.y.toFixed(2) + "\n";
                boxString += "    Y end  :  " + propertySets[i].boundingBox.tfl.y.toFixed(2) + "\n";
                boxString += "    Z start:  " + propertySets[i].boundingBox.brn.z.toFixed(2) + "\n";
                boxString += "    Z end  :  " + propertySets[i].boundingBox.tfl.z.toFixed(2) + "\n";
                boxString += "    \n";
                outputText += boxString;
            }
        };
        var message = {
            "channel": channel,
            "action": "AUDIO_ZONES_DATA",
            "data": outputText,
            "rotationIssue": rotationIssue
        };
        
        tablet.emitScriptEvent(JSON.stringify(message));
    }
    
    function onScreenChanged(type, url) {
        if (type === "Web" && url.indexOf(APP_URL) !== -1) {
            appStatus = true;
        } else {
            appStatus = false;
        }
        
        button.editProperties({
            isActive: appStatus
        });
    }

    function confirmation() { //Play a confirmation sound
        var injector = Audio.playSound(confirmationSound, {
            "volume": 0.3,
            "localOnly": true
        });
    }

    function rejection() { //Play a rejection sound
        var injector = Audio.playSound(rejectionSound, {
            "volume": 0.3,
            "localOnly": true
        });
    }
    
    function onHostChanged(host) {
        if ((!Entities.canRez() || !Entities.canAdjustLocks()) && appStatus) {
            clicked();
            rejection();
            Window.displayAnnouncement(INSUFFICIENT_PERMISSIONS_ERROR_MSG);
        }
    }

    function cleanup() {

        if (appStatus) {
            tablet.gotoHomeScreen();
            tablet.webEventReceived.disconnect(onAppWebEventReceived);
            location.hostChanged.disconnect(onHostChanged);
        }

        tablet.screenChanged.disconnect(onScreenChanged);
        tablet.removeButton(button);
    }

    Script.scriptEnding.connect(cleanup);
}());
