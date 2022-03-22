"use strict";
//
//  odometer.js
//
//  Created by Alezia Kurdis, October 11th, 2021.
//  Copyright 2021 Alezia Kurdis.
//  Copyright 2022 Overte e.V.
//
//  Tool to record the distance traveled by the avatar.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() { 


    var jsMainFileName = "odometer.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    var APP_NAME = "ODOMETER"; 
    var APP_ICON_INACTIVE = ROOT + "appicon_i.png";
    var APP_ICON_ACTIVE = ROOT + "appicon_a.png";

    var isRecording = false;
    var distance = 0;
    var lastPosition = {};
    
    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
    var button = tablet.addButton({
        text: APP_NAME,
        icon: APP_ICON_INACTIVE,
        activeIcon: APP_ICON_ACTIVE
    });  

    function clicked(){
    
        if (isRecording === false) {
            //Start Recoding
            lastPosition = MyAvatar.position;
            distance = 0;
            Script.update.connect(myTimer);

            //button
            button.editProperties({
                "isActive": true,
                "text": APP_NAME
            });

            isRecording = true;
        } else {
            //on Stop Recoding
            Script.update.disconnect(myTimer);
            var computedDistance, distanceInUnit;
            //prepart to display distance in km 2 digit
            if (distance < 1000) {
                if (distance < 100) {
                    distanceInUnit = distance.toFixed(1);
                } else {
                    distanceInUnit = Math.round(distance);
                }
                computedDistance = distanceInUnit + " m";    
            } else {
                distanceInUnit = distance/1000;
                if (distanceInUnit < 100) {
                    distanceInUnit = distanceInUnit.toFixed(1);
                } else {
                    distanceInUnit = Math.round(distanceInUnit);
                }
                computedDistance = distanceInUnit + " km";
            }
            //button
            button.editProperties({
                "isActive": false,
                "text": computedDistance
            });

            isRecording = false;
        }
    }
    
    button.clicked.connect(clicked);
    
    function myTimer(deltaTime) {
        var avatarPos = MyAvatar.position;
        var dist = Vec3.distance(avatarPos, lastPosition );
        distance = distance + dist;
        lastPosition = avatarPos;
    }

    function cleanup() {
        button.clicked.disconnect(clicked);
        tablet.removeButton(button);
        if (isRecording) {
            Script.update.disconnect(myTimer);
        }
        Script.scriptEnding.disconnect(cleanup);
    }

    Script.scriptEnding.connect(cleanup);    

}());
