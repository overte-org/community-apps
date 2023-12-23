//======================================
//
//  replica-app.js
//
//  Created by Alezia Kurdis, December 22th, 2023. 
//  (Based on doppleganger-app from Timothy Dedischew, April 21st, 2017)
//  Copyright 2017 High Fidelity, Inc.
//  Copyright 2023, Overte e.V.
//
//  This application generate an instance of a Doppleganger that can be toggled on/off via tablet button,
//  but specifically for 'Full Body Tracking' to follow roomscale moves instead of static position. 
//  The objective is to help the user figuring how the avatar react to his moves.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
var versioncall = Math.floor(Math.random()*50000);
var DopplegangerClass = Script.require('./replica-doppleganger.js?version=' + versioncall);

var tablet = Tablet.getTablet('com.highfidelity.interface.tablet.system'),
    button = tablet.addButton({
        icon: Script.resolvePath('./replica-i.png'),
        activeIcon: Script.resolvePath('./replica-a.png'),
        text: 'REPLICA'
    });

Script.scriptEnding.connect(function() {
    tablet.removeButton(button);
    button = null;
});

var doppleganger = new DopplegangerClass({
    avatar: MyAvatar,
    mirrored: false,
    autoUpdate: true,
});

// hide the doppleganger if this client script is unloaded
Script.scriptEnding.connect(doppleganger, doppleganger.stop);

// hide the doppleganger if the user switches domains (which might place them arbitrarily far away in world space)
function onDomainChanged() {
    if (doppleganger.active) {
        doppleganger.stop('domain_changed');
    }
}
Window.domainChanged.connect(onDomainChanged);
Window.domainConnectionRefused.connect(onDomainChanged);
Script.scriptEnding.connect(function() {
    Window.domainChanged.disconnect(onDomainChanged);
    Window.domainConnectionRefused.disconnect(onDomainChanged);
});

// toggle on/off via tablet button
button.clicked.connect(doppleganger, doppleganger.toggle);

// highlight tablet button based on current doppleganger state
doppleganger.activeChanged.connect(function(active, reason) {
    if (button) {
        button.editProperties({ isActive: active });
        //print('doppleganger.activeChanged', active, reason);
    }
});

// alert the user if there was an error applying their skeletonModelURL
doppleganger.addingEntity.connect(function(error, result) {
    if (doppleganger.active && error) {
        Window.alert('doppleganger | ' + error + '\n' + doppleganger.skeletonModelURL);
    }
});

// add debug indicators, but only if the user has configured the settings value
if (Settings.getValue('debug.doppleganger', false)) {
    DopplegangerClass.addDebugControls(doppleganger);
}

UserActivityLogger.logAction('doppleganger_app_load');
doppleganger.activeChanged.connect(function(active, reason) {
    if (active) {
        UserActivityLogger.logAction('doppleganger_enable');
    } else {
        if (reason === 'stop') {
            // user intentionally toggled the doppleganger
            UserActivityLogger.logAction('doppleganger_disable');
        } else {
            //print('doppleganger stopped:', reason);
            UserActivityLogger.logAction('doppleganger_autodisable', { reason: reason });
        }
    }
});
