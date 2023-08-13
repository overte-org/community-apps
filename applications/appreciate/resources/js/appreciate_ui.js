/*
    appreciate_ui.js
    
    Created by Zach Fox on January 30th, 2019
    Copyright 2019 High Fidelity, Inc.
    Copyright 2023, Overte e.V.

    Javascript code for the UI of the "Appreciate" application.

    Distributed under the Apache License, Version 2.0
    See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
*/

/* globals document EventBridge setTimeout */

// Called when the user clicks the switch in the top right of the app.
// Sends an event to the App JS and clears the `firstRun` `div`.
function appreciateSwitchClicked(checkbox) {
    EventBridge.emitWebEvent(JSON.stringify({
        app: "appreciate",
        method: "appreciateSwitchClicked",
        appreciateEnabled: checkbox.checked
    }));
    document.getElementById("firstRun").style.display = "none";
}

// Called when the user checks/unchecks the Never Whistle checkbox.
// Adds the crosshatch div to the UI and sends an event to the App JS.
function neverWhistleCheckboxClicked(checkbox) {
    var crosshatch = document.getElementById("crosshatch");
    if (checkbox.checked) {
        crosshatch.style.display = "inline-block";
    } else {
        crosshatch.style.display = "none";
    }

    EventBridge.emitWebEvent(JSON.stringify({
        app: "appreciate",
        method: "neverWhistleCheckboxClicked",
        neverWhistle: checkbox.checked
    }));
}

// Called when the user checks/unchecks the Show Appreciation Entity checkbox.
// Sends an event to the App JS.
function showAppreciationEntityCheckboxClicked(checkbox) {
    EventBridge.emitWebEvent(JSON.stringify({
        app: "appreciate",
        method: "showAppreciationEntityCheckboxClicked",
        showAppreciationEntity: checkbox.checked
    }));

    if (checkbox.checked) {
        document.getElementById("colorPickerContainer").style.visibility = "visible";
    } else {
        document.getElementById("colorPickerContainer").style.visibility = "hidden";
    }
}

// Called when the user changes the entity's color using the hue selector.
// Modifies the color of the Intensity Meter gradient and sends a message to the App JS.
var START_COLOR_MULTIPLIER = 0.2;
function setEntityColor(colorArray) {
    
    var newEntityColor = {
        "red": colorArray[0],
        "green": colorArray[1],
        "blue": colorArray[2]
    };

    var startColor = {
        "red": Math.floor(newEntityColor.red * START_COLOR_MULTIPLIER),
        "green": Math.floor(newEntityColor.green * START_COLOR_MULTIPLIER),
        "blue": Math.floor(newEntityColor.blue * START_COLOR_MULTIPLIER)
    };

    var currentIntensityDisplayWidth = document.getElementById("currentIntensityDisplay").offsetWidth;
    var bgString = "linear-gradient(to right, rgb(" + startColor.red + ", " +
        startColor.green + ", " + startColor.blue + ") 0, " +
        "rgb(" + newEntityColor.red + ", " + newEntityColor.green + ", " + newEntityColor.blue + ") " +
        currentIntensityDisplayWidth + "px)";
    document.getElementById("currentIntensity").style.backgroundImage = bgString;
    document.getElementById("colorPicker").style.backgroundColor = "rgb(" + newEntityColor.red + ", " + newEntityColor.green + ", " + newEntityColor.blue + ")";

    EventBridge.emitWebEvent(JSON.stringify({
        app: "appreciate",
        method: "setEntityColor",
        entityColor: newEntityColor
    }));
}

var hueSelector = document.getElementById('hueSelector');
hueSelector.addEventListener("click", function(event) {
    var rect = hueSelector.getBoundingClientRect();
    var hue = event.clientX - rect.left;
    if (hue >= 0 || hue <= 360) {
        setEntityColor(hslToRgb(hue/360, 1, 0.65)); //.65 is adding just a bit of white in the saturated color (0.5) to get a brighter glow effect.
    }
});

/*
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function uninstall() {
    var message = {
        "app": "appreciate",
        "method": "uninstall"
    };
    EventBridge.emitWebEvent(JSON.stringify(message));
}

// Handle EventBridge messages from *_app.js.
function onScriptEventReceived(message) {
    try {
        message = JSON.parse(message);
    } catch (error) {
        console.log("Couldn't parse script event message: " + error);
        return;
    }

    // This message gets sent by `entityList.js` when it shouldn't!
    if (message.type === "removeEntities") {
        return;
    }

    switch (message.method) {
        case "updateUI":
            if (message.isFirstRun) {
                document.getElementById("firstRun").style.display = "block";
            }
            document.getElementById("appreciateSwitch").checked = message.appreciateEnabled;
            document.getElementById("neverWhistleCheckbox").checked = message.neverWhistleEnabled;

            var showAppreciationEntityCheckbox = document.getElementById("showAppreciationEntityCheckbox");
            showAppreciationEntityCheckbox.checked = message.showAppreciationEntity;
            if (showAppreciationEntityCheckbox.checked) {
                document.getElementById("colorPickerContainer").style.visibility = "visible";
            } else {
                document.getElementById("colorPickerContainer").style.visibility = "hidden";
            }

            if (message.neverWhistleEnabled) {
                var crosshatch = document.getElementById("crosshatch");
                crosshatch.style.display = "inline-block";
            }

            document.getElementById("loadingContainer").style.display = "none";

            setEntityColor([message.entityColor.red, message.entityColor.green, message.entityColor.blue]);
            
            break;

        case "updateCurrentIntensityUI":
            document.getElementById("currentIntensity").style.width = message.currentIntensity * 100 + "%";
            break;

        default:
            console.log("Unknown message received from appreciate_app.js! " + JSON.stringify(message));
            break;
    }
}

// This function detects a keydown on the document, which enables the app
// to forward these keypress events to the app JS.
function onKeyDown(e) {
    var key = e.key.toUpperCase();
    if (key === "Z") {
        EventBridge.emitWebEvent(JSON.stringify({
            app: "appreciate",
            method: "zKeyDown",
            repeat: e.repeat
        }));
    }
}

// This function detects a keyup on the document, which enables the app
// to forward these keypress events to the app JS.
function onKeyUp(e) {
    var key = e.key.toUpperCase();
    if (key === "Z") {
        EventBridge.emitWebEvent(JSON.stringify({
            app: "appreciate",
            method: "zKeyUp"
        }));
    }
}

// This delay is necessary to allow for the JS EventBridge to become active.
// The delay is still necessary for HTML apps in RC78+.
var EVENTBRIDGE_SETUP_DELAY = 500;
function onLoad() {
    setTimeout(function() {
        EventBridge.scriptEventReceived.connect(onScriptEventReceived);
        EventBridge.emitWebEvent(JSON.stringify({
            app: "appreciate",
            method: "eventBridgeReady"
        }));
    }, EVENTBRIDGE_SETUP_DELAY);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
}

onLoad();