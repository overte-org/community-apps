"use strict";
//
//  app-aaSwitcher.js
//
//  Created by Alezia Kurdis, April 7th 2022.
//  Copyright 2022 Overte e.V.
//
//  This application let you setup different Anti-Aliasing setup for HMD and Desktop.
//  And it switches the configuration when the mode changes.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var jsMainFileName = "app-aaSwitcher.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    
    var APP_NAME = "AA-SWITCH";
    var APP_URL = ROOT + "aaSwitcher.html";
    var APP_ICON_INACTIVE = ROOT + "icon_inactive.png";
    var APP_ICON_ACTIVE = ROOT + "icon_active.png";
    var appStatus = false;

    var isActive = "OFF";
    var hmdAA = "1";
    var desktopAA = "1";
    var SETTING_AASWITCHER = "application_aaSwitcher";
    var channel = "com.overte.aaswitcher";
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
            loadSetting();
            var uIurl = APP_URL + "?isActive=" + isActive + "&hmdAA=" + hmdAA + "&desktopAA=" + desktopAA;
            tablet.gotoWebScreen(uIurl);
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
            if (messageObj.action === "HMDAA" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                hmdAA = messageObj.value;
                setAAbasedOnMode();               
                saveSetting();
            } else if (messageObj.action === "DESKTOPAA" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                desktopAA = messageObj.value;
                setAAbasedOnMode();
                saveSetting();
            } else if (messageObj.action === "ACTIVATION" && (n - timestamp) > INTERCALL_DELAY) {
                d = new Date();
                timestamp = d.getTime();
                isActive = messageObj.value;    
                if (isActive === "ON") {
                    setAAbasedOnMode();
                }
                saveSetting();
            }
        }
    }

    HMD.displayModeChanged.connect(function (isHMDMode) {
            setAAbasedOnMode();
    });

    function setAAbasedOnMode() {
        var aaValue = 0;
        if (isActive === "ON") {
            if (HMD.active) {
                aaValue = parseInt(hmdAA);
            } else {
                aaValue = parseInt(desktopAA);
            }
            Render.antialiasingMode = aaValue;
        }
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

    function cleanup() {

        if (appStatus) {
            tablet.gotoHomeScreen();
            tablet.webEventReceived.disconnect(onMoreAppWebEventReceived);
        }

        tablet.screenChanged.disconnect(onScreenChanged);
        tablet.removeButton(button);
    }

    function loadSetting() {
        var settings = Settings.getValue(SETTING_AASWITCHER, []);
        if (JSON.stringify(settings) !== "[]") {
            isActive = settings.isActive;
            hmdAA = settings.hmdAA;
            desktopAA = settings.desktopAA;            
        }
    }

    function saveSetting() {
        var data = {
            "isActive": isActive,
            "hmdAA": hmdAA,
            "desktopAA": desktopAA
        };
        Settings.setValue(SETTING_AASWITCHER, data);
    }

    Script.scriptEnding.connect(cleanup);
    
    loadSetting();
    
}());
