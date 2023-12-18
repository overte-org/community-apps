//
//  app-calibration.js
//
//  Created by Alezia Kurdis, December 16th 2023.
//  Copyright 2023 Overte e.V.
//
//  Shortcut for Mocap Calibration.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var jsMainFileName = "app-calibration.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    
    var APP_NAME = "CALIBRATE";
    var ICON_CAPTION_COLOR = "#FFFFFF";
    var APP_ICON_INACTIVE = ROOT + "icon_inactive.png"; 
    var APP_ICON_ACTIVE = ROOT + "icon_active.png"; 
    
    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");

    var button = tablet.addButton({
        "text": APP_NAME,
        "icon": APP_ICON_INACTIVE,
        "activeIcon": APP_ICON_ACTIVE,
        "sortOrder": 3,
        "captionColor": ICON_CAPTION_COLOR
    });

    function clicked(){
        button.editProperties({
            "isActive": true,
            "captionColor": "#000000"
        });
        calibration();
    }
    
    button.clicked.connect(clicked);

    function calibration() {
        Menu.triggerOption("Controls...");
        Script.setTimeout(function () {
            button.editProperties({
                "isActive": false,
                "captionColor": ICON_CAPTION_COLOR
            });
        }, 3000);
    }



    function cleanup() {
        tablet.removeButton(button);
    }

    Script.scriptEnding.connect(cleanup);
}());
