"use strict";
//
//  app-lightBulb.js
//
//  Created by Alezia Kurdis, April 23rd 2022.
//  Copyright 2022 Overte e.V.
//
//  Application to generate light bulbs.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var jsMainFileName = "app-lightBulb.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    
    var intensity = 5;
    var angle = 30;
    var range = 10;
    var wOrH = "white";
    var hue = 30;
    
    var APP_NAME = "BULB";
    var APP_URL = ROOT + "lightBulb.html";
    var APP_ICON_INACTIVE = ROOT + "icon_inactive.png";
    var APP_ICON_ACTIVE = ROOT + "icon_active.png";
    var LIGHT_BULB_SCRIPT = ROOT + "lightBulb.js";
    var appStatus = false;

    var channel = "com.overte.app.lightBulb";
    var timestamp = 0;
    var INTERCALL_DELAY = 200; //0.3 sec

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
            tablet.gotoWebScreen(APP_URL + "?woh=" + wOrH + "&hue=" + hue + "&int=" + intensity + "&ang=" + angle + "&ran=" + range);
            tablet.webEventReceived.connect(onAppWebEventReceived);
            appStatus = true;
        }

        button.editProperties({
            isActive: appStatus
        });
    }

    button.clicked.connect(clicked);


    function onAppWebEventReceived(message) {
        var d = new Date();
        var n = d.getTime();
        
        var messageObj = JSON.parse(message);
        if (messageObj.channel === channel) {
            if (messageObj.action === "GEN_LIGHT_BULB" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                
                intensity = messageObj.lightIntensity;
                angle = messageObj.lightSpotCutOff;
                range = messageObj.lightRange;
                wOrH = messageObj.colorMode;
                hue = messageObj.hue;                

                generatelightBulb(messageObj);
            }
        }
    }

    function onScreenChanged(type, url) {
        if (type == "Web" && url.indexOf(APP_URL) != -1) {
            appStatus = true;
        } else {
            appStatus = false;
        }
        
        button.editProperties({
            isActive: appStatus
        });
    }

    function cleanup() {

        if (appStatus) {
            tablet.gotoHomeScreen();
            tablet.webEventReceived.disconnect(onMoreAppWebEventReceived);
        }

        tablet.screenChanged.disconnect(onScreenChanged);
        tablet.removeButton(button);
    }

    function generatelightBulb(data) {

        var id = Entities.addEntity({
            "type": "Sphere",
            "name": "LIGHT_BULB",
            "locked": false,
            "dimensions": {
                "x": 0.06,
                "y": 0.06,
                "z": 0.06
            },
            "rotation": {
                "x": 0,
                "y": 0,
                "z": 0,
                "w": 1
            },
            "position": Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0, z: -2 })),
            "grab": {
                "grabbable": false
            },
            "color": {
                "red": data.color.red,
                "green": data.color.green,
                "blue": data.color.blue
            },
            "userData": "{\"lightIntensity\":" + data.lightIntensity + ",\"lightSpotCutOff\": " + data.lightSpotCutOff + ",\"lightRange\": " + data.lightRange + "}",
            "script": LIGHT_BULB_SCRIPT
        }, "domain");
        
    }



    Script.scriptEnding.connect(cleanup);
}());
