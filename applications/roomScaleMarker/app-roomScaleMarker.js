//
//  app-roomScaleMarker.js
//
//  Created by Alezia Kurdis, December 18th 2023.
//  Copyright 2023 Overte e.V.
//
//  Put a Marker on the floor to indicate the center of the room as you are doing full body tracking.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var jsMainFileName = "app-roomScaleMarker.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    
    var APP_NAME = "RS-MARKER";
    var ICON_CAPTION_COLOR = "#FFFFFF";
    var APP_ICON_INACTIVE = ROOT + "icon_inactive.png";
    var APP_ICON_ACTIVE = ROOT + "icon_active.png"; 
    var appStatus = false;
    var channel = "overte.application.ak.roomScaleMarker";
    var markerID = Uuid.NULL;
    
    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");

    var button = tablet.addButton({
        "text": APP_NAME,
        "icon": APP_ICON_INACTIVE,
        "activeIcon": APP_ICON_ACTIVE,
        "sortOrder": 4,
        "captionColor": ICON_CAPTION_COLOR
    });

    function clicked(){
        var colorCaption;
        if (appStatus === true) {
            clearMarker();
            colorCaption = ICON_CAPTION_COLOR;
            appStatus = false;
        }else{
            drawMarker();
            colorCaption = "#000000";
            appStatus = true;
        }

        button.editProperties({
            "isActive": appStatus,
            "captionColor": colorCaption
        });
    }
    
    button.clicked.connect(clicked);

    function drawMarker() {
        if (markerID !== Uuid.NULL) {
            clearMarker();
        }
        markerID = Entities.addEntity({ 
            "name": "ROOM SCALE MARKER",
            "type": "Image",
            "dimensions": {"x": 2, "y": 2, "z": 0.01},
            "position": Vec3.sum(MyAvatar.feetPosition,{"x": 0, "y": 0.01, "z": 0}),
            "rotation": Quat.multiply(MyAvatar.orientation, Quat.fromVec3Degrees({"x": -90, "y": 0, "z": 0})),
            "imageURL": ROOT +  "marker.svg",
            "emissive": true,
            "keepAspectRatio": false,
            "canCastShadow": false,
            "isVisibleInSecondaryCamera": false,
            "grab": {
                "grabbable": false
            }
        },"local");
        Controller.actionEvent.connect(onActionEvent);
    }

    //all except 23 24
    function onActionEvent(action, value) {
        if (action !== 23 && action !== 24) {
            appStatus = true;
            clicked();
        }
    }

    function clearMarker() {
        if (markerID !== Uuid.NULL) {
            Entities.deleteEntity(markerID);
            markerID = Uuid.NULL;
        }
        Controller.actionEvent.disconnect(onActionEvent);
    }

    function cleanup() {

        if (appStatus) {
            clearMarker();
            colorCaption = ICON_CAPTION_COLOR;
            appStatus = false;
        }

        tablet.removeButton(button);
    }

    Script.scriptEnding.connect(cleanup);
}());
