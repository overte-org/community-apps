"use strict";
//
//  app_home.js
//
//  Created by Alezia Kurdis, February 12th, 2022.
//  Copyright 2022 Overte e.V.
//
//  Fast go home button.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var jsMainFileName = "app_home.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    var teleporterSoundFileUrl = ROOT + "tpsound.mp3";
    var teleportSound = SoundCache.getSound(teleporterSoundFileUrl);
    var APP_NAME = "HOME"; 
    var APP_ICON_INACTIVE = ROOT + "appicon_i.png";
    var APP_ICON_ACTIVE = ROOT + "appicon_a.png";
    
    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");

    var button = tablet.addButton({
        text: APP_NAME,
        icon: APP_ICON_INACTIVE,
        activeIcon: APP_ICON_ACTIVE,
        sortOrder: 3
    });


    function clicked(){
        button.editProperties({
            isActive: true
        });
        playSound();
        var timer = Script.setTimeout(function () {
            if (LocationBookmarks.getHomeLocationAddress()) {
                location.handleLookupString(LocationBookmarks.getHomeLocationAddress());
            } else {
                location.goToLocalSandbox();
            }
            button.editProperties({
                isActive: false
            });
        }, 3000);
    }

    button.clicked.connect(clicked);

    function cleanup() {
        Script.scriptEnding.disconnect(cleanup);
        tablet.removeButton(button);
    }
    
    function playSound() {
        Audio.playSound(teleportSound, { volume: 0.3, localOnly: true });
    };    
    
    Script.scriptEnding.connect(cleanup);
}());
