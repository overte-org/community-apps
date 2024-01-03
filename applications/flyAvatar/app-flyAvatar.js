//
//  app-flyAvatar.js
//
//  Created by Alezia Kurdis, December 16th 2023.
//  Copyright 2023 Overte e.V.
//
//  This automatically replace your avatar by a specific one as soon as you are flying.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var jsMainFileName = "app-flyAvatar.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    
    var APP_NAME = "FLY-AV";
    var APP_URL = ROOT + "flyAvatar.html";
    var APP_ICON_INACTIVE_ON = ROOT + "icon_inactive_on.png";
    var APP_ICON_INACTIVE_OFF = ROOT + "icon_inactive_off.png";
    var inactiveIcon = APP_ICON_INACTIVE_ON;
    var APP_ICON_ACTIVE = ROOT + "icon_active.png"; // BLACK on
    var ICON_CAPTION_COLOR = "#FFFFFF";
    var appStatus = false;
    var channel = "overte.application.more.flyAvatar";
    var timestamp = 0;
    var INTERCALL_DELAY = 200; //0.3 sec
    var FLY_AVATAR_SETTING_KEY = "overte.application.more.flyAvatar.avatarUrl";
    var FLY_AVATAR_SWITCH_SETTING_KEY = "overte.application.more.flyAvatar.switch";
    var flyAvatarSwitch = true;
    var flyAvatarUrl = "";
    var originalAvatarUrl = "";
    var isFlying = false;
    var UPDATE_TIMER_INTERVAL = 500; // 5 sec 
    var processTimer = 0;    
    
    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");

    tablet.screenChanged.connect(onScreenChanged);

    var button = tablet.addButton({
        text: APP_NAME,
        icon: APP_ICON_INACTIVE_ON,
        activeIcon: APP_ICON_ACTIVE,
        captionColor: ICON_CAPTION_COLOR
    });


    function clicked(){
        var colorCaption;
        if (appStatus === true) {
            tablet.webEventReceived.disconnect(onAppWebEventReceived);
            tablet.gotoHomeScreen();
            colorCaption = ICON_CAPTION_COLOR;
            appStatus = false;
        }else{
            //Launching the Application UI.
            tablet.gotoWebScreen(APP_URL);
            tablet.webEventReceived.connect(onAppWebEventReceived);
            colorCaption = "#000000";
            appStatus = true;
        }

        button.editProperties({
            isActive: appStatus,
            captionColor: colorCaption
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
                if (instruction.action === "HUMAN_CALLED_ACTION_NAME" && (n - timestamp) > INTERCALL_DELAY) { //<== Use this for action trigger by a human (button or any ui control). The delay prevent multiple call to destabilize everything. 
                    d = new Date();
                    timestamp = d.getTime();
                    //Call a function to do something here
                } else if (instruction.action === "REQUEST_INITIAL_DATA") {
                    sendCurrentFlyAvatarUrlToUI();
                } else if (instruction.action === "UPDATE_URL") {
                    flyAvatarUrl = instruction.url;
                    flyAvatarSwitch = instruction.mainSwitch;
                    Settings.setValue( FLY_AVATAR_SETTING_KEY, flyAvatarUrl);
                    Settings.setValue( FLY_AVATAR_SWITCH_SETTING_KEY, flyAvatarSwitch);
                    updateAvatar();
                    if (flyAvatarSwitch) {
                        inactiveIcon = APP_ICON_INACTIVE_ON;
                    } else {
                        inactiveIcon = APP_ICON_INACTIVE_OFF;
                    }
                    button.editProperties({icon: inactiveIcon});
                } else if (instruction.action === "SELF_UNINSTALL" && (n - timestamp) > INTERCALL_DELAY) { //<== This is a good practice to add a "Uninstall this app" button for rarely used app. (toolbar has a limit in size) 
                    d = new Date();
                    timestamp = d.getTime();
                    ScriptDiscoveryService.stopScript(Script.resolvePath(''), false);
                }
            }
        }
    }
    
    function updateAvatar() {
        if (MyAvatar.isFlying() && flyAvatarSwitch) {
            MyAvatar.useFullAvatarURL(flyAvatarUrl);
        } else {
            if (MyAvatar.skeletonModelURL === flyAvatarUrl) {
                MyAvatar.useFullAvatarURL(originalAvatarUrl);
            }
        }
    }

    MyAvatar.skeletonModelURLChanged.connect(function () {
        if (!MyAvatar.isFlying() && MyAvatar.skeletonModelURL !== flyAvatarUrl) {
            originalAvatarUrl = MyAvatar.skeletonModelURL;
        }
    });

    function myTimer(deltaTime) {
        var today = new Date();
        if ((today.getTime() - processTimer) > UPDATE_TIMER_INTERVAL ) {

            if (isFlying !== MyAvatar.isFlying()) {
                updateAvatar();
                isFlying = MyAvatar.isFlying();
            }
            
            today = new Date();
            processTimer = today.getTime();
        }  
    }

    function sendCurrentFlyAvatarUrlToUI() {
        var message = {
            "channel": channel,
            "action": "FLY-AVATAR-URL",
            "url": flyAvatarUrl,
            "mainSwitch": flyAvatarSwitch
        };
        tablet.emitScriptEvent(JSON.stringify(message));
    }

    function onScreenChanged(type, url) {
        if (type === "Web" && url.indexOf(APP_URL) !== -1) {
            colorCaption = "#000000";
            appStatus = true;
        } else {
            colorCaption = ICON_CAPTION_COLOR;
            appStatus = false;
        }
        
        button.editProperties({
            isActive: appStatus,
            captionColor: colorCaption
        });
    }

    function cleanup() {

        if (appStatus) {
            tablet.gotoHomeScreen();
            tablet.webEventReceived.disconnect(onAppWebEventReceived);
        }

        tablet.screenChanged.disconnect(onScreenChanged);
        tablet.removeButton(button);
        Script.update.disconnect(myTimer);
    }

    Script.scriptEnding.connect(cleanup);
    originalAvatarUrl = MyAvatar.skeletonModelURL;
    flyAvatarUrl = Settings.getValue( FLY_AVATAR_SETTING_KEY, "" );
    flyAvatarSwitch = Settings.getValue( FLY_AVATAR_SWITCH_SETTING_KEY, true );
    if (flyAvatarSwitch) {
        inactiveIcon = APP_ICON_INACTIVE_ON;
    } else {
        inactiveIcon = APP_ICON_INACTIVE_OFF;
    }
    button.editProperties({icon: inactiveIcon});
    Script.update.connect(myTimer);
}());
