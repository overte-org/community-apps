//
// cam360Html.js
//
// Created by Alezia Kurdis, August 23rd 2022.
// Copyright 2025, Overte e.V.
//
// js for the html UI for an application to take 360 degrees photo by throwing a camera in the air.
//
// Distributed under the Apache License, Version 2.0.
// See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//


//Paths
var thisPageName = "cam360.html";        
var currentPath = window.location.protocol + "//" + window.location.host + window.location.pathname;
var ROOTPATH = currentPath.replace(thisPageName, ""); 
var channel = "org.overte.applications.cam360";

var isCameraActive = false;
var isPhotoProcessing = false;
var useFlash = false;
var isThrowMode = true;
var postShotBehavior = "HOME";
var DEG_TO_RAD = Math.PI/180;

//LISTENER FROM JS FILE:
EventBridge.scriptEventReceived.connect(function (message) {
    var messageObj = JSON.parse(message);
    if (messageObj.channel === channel && messageObj.method === "initializeUI") {
        isCameraActive = messageObj.masterSwitchOn;
        isPhotoProcessing = messageObj.processing360Snapshot;
        useFlash = messageObj.useFlash;
        isThrowMode = messageObj.isThrowMode;
        postShotBehavior = messageObj.postShotBehavior;
        renderCameraStatus();
        initiateAlpha(messageObj.visualizerAlpha);
        initiatePostBehavior();
        setFlashButton();
        renderMode();
        
    } else if (messageObj.channel === channel && messageObj.method === "finishedProcessing360Snapshot") {
        document.getElementById("processing").innerHTML = "";
    } else if (messageObj.channel === channel && messageObj.method === "startedProcessing360Snapshot") {
        document.getElementById("processing").innerHTML = "<img src='resources/images/processing.gif'>";
    } else if (messageObj.channel === channel && messageObj.method === "visualizator_is_active") {
        document.getElementById("showLastCapture").innerHTML = "Hide Viewer";
        document.getElementById("hideVRnotice").innerHTML = "In VR, raise a controller above your head to 'Whoosh' and hide the viewer.";
    } else if (messageObj.channel === channel && messageObj.method === "visualizator_is_inactive") {
        document.getElementById("showLastCapture").innerHTML = "View Last 360&deg; Capture";
        document.getElementById("hideVRnotice").innerHTML = "&nbsp;";
    }
});

function initiatePostBehavior() {
    const radios = document.getElementsByName("postShotBehavior");
    for (let i = 0; i < radios.length; i++) {
        if (radios[i].value === postShotBehavior) {
            radios[i].checked = true;
        } else {
            radios[i].checked = false;
        }
    }
}

function setPostBehavior(str) {
    postShotBehavior = str;
    const messageToSend = {
        "channel": channel,
        "method": "setPostBehavior",
        "postShotBehavior": postShotBehavior
    };
    EventBridge.emitWebEvent(JSON.stringify(messageToSend));
}

function initiateAlpha(alphaValue) {
    document.getElementById("alpha").value = Math.floor(alphaValue * 100);
}

function setAlpha() {
    let alpha = document.getElementById("alpha").value / 100;
    const messageToSend = {
        "channel": channel,
        "method": "setVisualizerAlpha",
        "alpha": alpha
    };
    EventBridge.emitWebEvent(JSON.stringify(messageToSend));
}

function setFlashButton() {
    if (useFlash) {
        document.getElementById("flashOnOff").innerHTML = "<img src='resources/images/flashOn.jpg'>";
    } else {
        document.getElementById("flashOnOff").innerHTML = "<img src='resources/images/flashOff.jpg'>";
    }
}

function toggleFlash() {
    var messageToSend;
    if (useFlash) {
        useFlash = false;
        messageToSend = {
            "channel": channel,
            "method": "disableFlash"
        };                    
    } else {
        useFlash = true;
        messageToSend = {
            "channel": channel,
            "method": "enableFlash"
        };                       
    }
    setFlashButton();
    EventBridge.emitWebEvent(JSON.stringify(messageToSend));
}

function openSetting() {
    var messageToSend = {
            "channel": channel,
            "method": "openSettings"
        };                       
    EventBridge.emitWebEvent(JSON.stringify(messageToSend));
}

function activateRpo360() {
    var messageToSend;
    if (isCameraActive) {
        messageToSend = {
            "channel": channel,
            "method": "rpo360Off"
        };
        isCameraActive = false;
    } else {
        messageToSend = {
            "channel": channel,
            "method": "rpo360On"
        };
        isCameraActive = true;
    }
    EventBridge.emitWebEvent(JSON.stringify(messageToSend));
    renderCameraStatus();
}

function renderCameraStatus() {
    if (isCameraActive) {
        document.getElementById("cameraIndicator").src = "resources/images/on.png";
        document.getElementById("cameraOnOff").innerHTML = "STOP<br>CAMERA";
        if (!isThrowMode) {
            document.getElementById("capture").disabled = false;
        }
    } else {
        document.getElementById("cameraIndicator").src = "resources/images/off.png";
        document.getElementById("cameraOnOff").innerHTML = "START<br>CAMERA";
        if (!isThrowMode) {
            document.getElementById("capture").disabled = true;
        }
    }
}

function setMode(mode) {
    var messageToSend;
    if (isThrowMode) {
        messageToSend = {
            "channel": channel,
            "method": "PositionMode"
        };
        isThrowMode = false;
    } else {
        messageToSend = {
            "channel": channel,
            "method": "ThrowMode"
        };
        isThrowMode = true;
    }
    EventBridge.emitWebEvent(JSON.stringify(messageToSend));
    renderMode();
}

function renderMode() {
    if (isThrowMode) {
        document.getElementById("body").className = "throwMode";
        document.getElementById("cameraOnOff").className = "cameraOnOffthrowMode";
        document.getElementById("modeThrow").className = "modeBtnOn";
        document.getElementById("modePosition").className = "modeBtnOff";
        document.getElementById("throwModeControls").style.display = "block";
        document.getElementById("positionModeControls").style.display = "none";
    } else {
        document.getElementById("body").className = "positionMode";
        document.getElementById("cameraOnOff").className = "cameraOnOffpositionMode";
        document.getElementById("modeThrow").className = "modeBtnOff";
        document.getElementById("modePosition").className = "modeBtnOn";
        document.getElementById("throwModeControls").style.display = "none";
        document.getElementById("positionModeControls").style.display = "block";
    }
}

function capture() {
    var messageToSend= {
        "channel": channel,
        "method": "Capture"
    };
    EventBridge.emitWebEvent(JSON.stringify(messageToSend));
}

function showLastCapture() {
    var messageToSend= {
        "channel": channel,
        "method": "showLastCapture"
    };
    EventBridge.emitWebEvent(JSON.stringify(messageToSend));
}

function showPreviousCapture() {
    var messageToSend= {
        "channel": channel,
        "method": "showPreviousCapture"
    };
    EventBridge.emitWebEvent(JSON.stringify(messageToSend));
}

function showNextCapture() {
    var messageToSend= {
        "channel": channel,
        "method": "showNextCapture"
    };
    EventBridge.emitWebEvent(JSON.stringify(messageToSend));
}

function uninstall() {
    var messageToSend = {
        "channel": channel,
        "method": "SELF_UNINSTALL"
    };
    EventBridge.emitWebEvent(JSON.stringify(messageToSend));
}

EventBridge.emitWebEvent(JSON.stringify({
    "channel": channel,
    "method": "uiReady"
}));
