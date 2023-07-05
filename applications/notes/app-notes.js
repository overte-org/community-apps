"use strict";
//
//  app-notes.js
//
//  Created by Alezia Kurdis, May 27th 2022.
//  Copyright 2022 Overte e.V.
//
//  Simple application to take notes online, mainly for when we are in HMD mode.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var jsMainFileName = "app-notes.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    
    var APP_NAME = "NOTES";
    var APP_URL = ROOT + "notes.html";
    var APP_ICON_INACTIVE = ROOT + "icon_inactive.png";
    var APP_ICON_ACTIVE = ROOT + "icon_active.png";
    var appStatus = false;

    var mode = "light";
    var notes = "";
    var channel = "overte.application.ak.notes";
    var timestamp = 0;
    var INTERCALL_DELAY = 200; //0.3 sec
    var SETTING_NOTES = "application_ak_notes";
    
    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");

    tablet.screenChanged.connect(onScreenChanged);

    var button = tablet.addButton({
        text: APP_NAME,
        icon: APP_ICON_INACTIVE,
        activeIcon: APP_ICON_ACTIVE
    });


    function clicked(){
        if (appStatus === true) {
            tablet.webEventReceived.disconnect(onMoreAppWebEventReceived);
            tablet.gotoHomeScreen();
            appStatus = false;
        }else{
            loadDataFromSettings();
            tablet.gotoWebScreen(APP_URL + "?mode=" + mode);
            tablet.webEventReceived.connect(onMoreAppWebEventReceived);
            appStatus = true;
        }

        button.editProperties({
            isActive: appStatus
        });
    }

    button.clicked.connect(clicked);


    function onMoreAppWebEventReceived(message) {
        var d = new Date();
        var n = d.getTime();
        
        if (typeof message === "string") {
            var eventObj = JSON.parse(message);
            if (eventObj.channel === channel) {
                if (eventObj.action === "saveText" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    notes = eventObj.data;
                    saveDataToSetting();  
                    clicked(); // this closes the app.
                } else if (eventObj.action === "saveMode" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    mode = eventObj.data;
                    saveDataToSetting();
                } else if (eventObj.action === "requestData" && (n - timestamp) > INTERCALL_DELAY) {
                    var message = {
                        "channel": channel,
                        "action": "loadText",
                        "notes": notes
                    };
                    tablet.emitScriptEvent(JSON.stringify(message));
                }   
            }
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

    function loadDataFromSettings() {
        var settings = Settings.getValue(SETTING_NOTES, {"mode": "light", "notes": ""});
        mode = settings.mode;
        notes = settings.notes;
    }

    function saveDataToSetting() {
        var data = {
            "mode": mode,
            "notes": notes
        };
        Settings.setValue(SETTING_NOTES, data);
    }
    
    Script.scriptEnding.connect(cleanup);
}());
