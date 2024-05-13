//
//  app-hmd3rdPerson.js
//
//  Created by Alezia Kurdis, May 8th 2024.
//  Copyright 2024 Overte e.V.
//
//  This application add a button to switch to 3rd Person View in HDM (witout reseting the camera distance)
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var jsMainFileName = "app-hmd3rdPerson.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    
    var APP_ICON_INACTIVE = ROOT + "icon_inactive_white.png";
    var ICON_CAPTION_COLOR = "#FFFFFF";
    if (ROOT.substr(0, 4) !== "http") {
        APP_ICON_INACTIVE = ROOT + "icon_inactive_green.png";
        ICON_CAPTION_COLOR = "#00FF00";
    }
    var APP_ICON_ACTIVE = ROOT + "icon_active.png";
    var APP_SORT_ORDER = 4;
    var APP_NAME = "3rd PERS";
    var appStatus = false;

    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");

    var button = null;

    function clicked(){
        if (HMD.active) {
            var colorCaption;
            if (appStatus === true) {
                setFirstPersonView();
                colorCaption = ICON_CAPTION_COLOR;
                appStatus = false;
            }else{
                setThirdPersonView();
                colorCaption = "#000000";
                appStatus = true;
            }

            button.editProperties({
                "isActive": appStatus,
                "captionColor": colorCaption
            });
        } else {
            Window.displayAnnouncement("This is only effective in HMD.");
        }
    }

    function displayChange(isHMDMode) {
        print("Display mode changed");
        print("isHMD = " + isHMDMode);
        print("HMD.active = " + HMD.active);
        print("HMD.mounted = " + HMD.mounted);
        if (isHMDMode) {
            if (button === null) {
                button = tablet.addButton({
                    "text": APP_NAME,
                    "icon": APP_ICON_INACTIVE,
                    "activeIcon": APP_ICON_ACTIVE,
                    "captionColor": ICON_CAPTION_COLOR,
                    "sortOrder": APP_SORT_ORDER
                });
                button.clicked.connect(clicked);
            }
        } else {
            if (button !== null) {
                button.clicked.disconnect(clicked);
                tablet.removeButton(button);
                button = null;
            }
        }
    }

    function setFirstPersonView() {
        Camera.mode = "first person look at";
    }

    function setThirdPersonView() {
        Camera.mode = "third person";
    }
    
    HMD.displayModeChanged.connect(displayChange);

    function cleanup() {
        if (appStatus) {
            setFirstPersonView();
        }
        if (HMD.active) {
            button.clicked.disconnect(clicked);
            tablet.removeButton(button);
            button = null;
        }
        HMD.displayModeChanged.disconnect(displayChange);
    }

    Script.scriptEnding.connect(cleanup);
    
    if (HMD.active) {
        button = tablet.addButton({
            "text": APP_NAME,
            "icon": APP_ICON_INACTIVE,
            "activeIcon": APP_ICON_ACTIVE,
            "captionColor": ICON_CAPTION_COLOR,
            "sortOrder": APP_SORT_ORDER
        });
        button.clicked.connect(clicked);
    }
}());
