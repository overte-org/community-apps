//
//  app-expozer.js
//
//  Created by Alezia Kurdis, June 17th 2023.
//  Copyright 2023 Overte e.V.
//
//  Overte Application to read the data of the entities around you.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var jsMainFileName = "app-expozer.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    
    var APP_NAME = "EXPOZER";
    var APP_URL = ROOT + "expozer.html";
    var APP_ICON_INACTIVE = ROOT + "images/appicon_i.png";
    var APP_ICON_ACTIVE = ROOT + "images/appicon_a.png";
    var appStatus = false;
    var channel = "overte.application.ak.expozer";
    var timestamp = 0;
    var INTERCALL_DELAY = 200; //0.3 sec
    var REQUEST_TIMEOUT = 10000; //10 seconds
    var showSelectedID = Uuid.NULL;
    
    var radius = Settings.getValue("entityListDefaultRadius", 300);
    
    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");

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
            //Launching the Application UI.
            tablet.gotoWebScreen(APP_URL + "?radius=" + radius);
            tablet.webEventReceived.connect(onAppWebEventReceived);
            appStatus = true;
        }

        button.editProperties({
            isActive: appStatus
        });
    }

    button.clicked.connect(clicked);

    //This recieved the message from the UI(html) for a specific actions
    function onAppWebEventReceived(message) {
        if (typeof message === "string") {
            var d = new Date();
            var n = d.getTime();
            var instruction = JSON.parse(message);
            if (instruction.channel === channel) {
                if (instruction.action === "REFRESH") {
                    d = new Date();
                    timestamp = d.getTime();
                    radius = instruction.radius;
                    refresh();
                } else if (instruction.action === "GET_FILE" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    readAndReturnFile(instruction.url);
                } else if (instruction.action === "SHOW_ENTITY") {
                    d = new Date();
                    timestamp = d.getTime();
                    setShowEntity(instruction.position, instruction.rotation, instruction.dimensions);
                } else if (instruction.action === "REMOVE_SHOW_ENTITY") {
                    removeShowEntity();
                } else if (instruction.action === "SELF_UNINSTALL" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    ScriptDiscoveryService.stopScript(Script.resolvePath(''), false);
                }
            }
        }
    }

    function setShowEntity(position, rotation, dimensions) {
        removeShowEntity();
        showSelectedID = Entities.addEntity({
            "type": "Shape",
            "shape": "Cube",
            "name": "ShowEntity(Expozer Tool)",
            "position": position,
            "dimensions": dimensions,
            "rotation": rotation,
            "color": {"red": 255, "green": 196, "blue": 0},
            "grab": {
                "grabbable": false
            },
            "renderLayer": "front",
            "primitiveMode": "lines"
        }, "local");
        
        var toolEntitiesMaterialData = "{\n  \"materialVersion\": 1,\n  \"materials\": [\n    {\n      \"name\": \"0\",\n      \"defaultFallthrough\": true,\n      \"unlit\": true,\n      \"model\": \"hifi_pbr\"\n    }\n  ]\n}";
        var materialEntityID = Entities.addEntity({
            "type": "Material",
            "parentID": showSelectedID,
            "name": "ShowEntity(Expozer Tool) unlit material",
            "parentMaterialName": "0",
            "materialURL": "materialData",
            "priority": 1,
            "materialMappingMode": "uv",
            "ignorePickIntersection": true,
            "materialData": toolEntitiesMaterialData
        }, "local");
    }

    function removeShowEntity() {
        if (showSelectedID !== Uuid.NULL) {
            Entities.deleteEntity(showSelectedID);
            showSelectedID = Uuid.NULL;
        }
    }

    function readAndReturnFile(url) {
        var data = getContent(url);
        var message = {
            "channel": channel,
            "action": "SHOW_FILE",
            "data": data,
            "url": url
        };

        tablet.emitScriptEvent(JSON.stringify(message));
    }

    function getContent(url) {
        httpRequest = new XMLHttpRequest();
        httpRequest.open("GET", url, false); // false for synchronous request
        httpRequest.setRequestHeader("Cache-Control", "no-cache");
        httpRequest.timeout = REQUEST_TIMEOUT;
        httpRequest.ontimeout=function(){ 
            return ""; 
        };        
        httpRequest.send( null );
        return httpRequest.responseText;
    }

    function refresh() {
        var datalist = [];

        //Domain & Avatar entities
        var domAvListOfIDs = Entities.findEntities(MyAvatar.position, radius);
        for (var i=0; i < domAvListOfIDs.length; i++) {
            datalist.push(Entities.getEntityProperties(domAvListOfIDs[i]));
        }
        //Local entities
        var locListOfIDs = Overlays.findOverlays(MyAvatar.position, radius);
        for (var i=0; i < locListOfIDs.length; i++) {
            datalist.push(Entities.getEntityProperties(locListOfIDs[i]));
        }
        
        var message = {
            "channel": channel,
            "action": "DATA_REFRESH",
            "data": datalist
        };

        tablet.emitScriptEvent(JSON.stringify(message));
    }

    function onScreenChanged(type, url) {
        if (type === "Web" && url.indexOf(APP_URL) !== -1) {
            appStatus = true;
        } else {
            appStatus = false;
            removeShowEntity();
        }
        
        button.editProperties({
            isActive: appStatus
        });
    }

    function cleanup() {
        removeShowEntity();
        if (appStatus) {
            tablet.gotoHomeScreen();
            tablet.webEventReceived.disconnect(onAppWebEventReceived);
        }

        tablet.screenChanged.disconnect(onScreenChanged);
        tablet.removeButton(button);
    }

    Script.scriptEnding.connect(cleanup);
    refresh();
}());
