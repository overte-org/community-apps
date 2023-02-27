//
//  CameraPositions.js
//  
//  Created by Basinsky on 5 Mar 2021
//  
//  script to setup camera's for an event 
//  press shift + F1 to F12 on the keyboard to create a camera at the position of the current Overte Camera
//  press F1 to F12 to switch between camera points if they exist
//  press c to change audi mode (Avatar-Camera)
//  press n to quit camera mode
//  press l to hide/unhide the camera's
//  press m to update the camera list if you crashed or left the domain and come back
//  stopping the script will remove the camera's
//  using numbers on the keypad (4,6) for the y axis and (8,5) for the x axis you can rotate the camera to adjust it
//  for events make sure to put the view on fullscreen from the pulldown menu and disable your audio level meter.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var LOCATION_ROOT_URL = Script.resolvePath(".");
    var FORM_URL = LOCATION_ROOT_URL + "CameraPos.html?" + Date.now(); 
    var onForm = false;
    var button;
    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");  
    var allEntities;
    var TOTAL_CAMERAS = 12;
    var cameraIDs = [];
    var reset = true;
    var RESET_TIME = 20; 
    var cameraCounter = 0;    
    var isVisible = true;
    var isFullscreen = false;
    var isOverlays = true;     
    var isRunning = false;
    var isCameraListeningPosition = false;    
    var HALF_CIRCLE_DEGREE = 180;

    // Fill array
    for (var i = 0; i < TOTAL_CAMERAS+1; i++) {
        cameraIDs[i] = "X";
    }

    button = tablet.addButton({
        icon: LOCATION_ROOT_URL + "CameraPos-inactive.svg",
        activeIcon: LOCATION_ROOT_URL + "CameraPos-active.svg",
        text: "CAMERAS"   
    });

    function onClicked() {
        if (onForm) {
            tablet.gotoHomeScreen();       
        } else {
            onForm = true;
            tablet.gotoWebScreen(FORM_URL);        
        }
    }

    function onScreenChanged(type, url) {
        print(JSON.stringify(url));
        if (type === "Web" && url.indexOf(FORM_URL) !== -1) {        
            button.editProperties({ isActive: true });
        } else {        
            button.editProperties({ isActive: false });
            onForm = false;
        }
    }

    function generateQuatFromDegreesViaRadians(rotxdeg,rotydeg,rotzdeg) {
        var rotxrad = (rotxdeg/HALF_CIRCLE_DEGREE)*Math.PI;
        var rotyrad = (rotydeg/HALF_CIRCLE_DEGREE)*Math.PI;
        var rotzrad = (rotzdeg/HALF_CIRCLE_DEGREE)*Math.PI;          
        var newRotation = Quat.fromPitchYawRollRadians(rotxrad,rotyrad,rotzrad); 
        return newRotation;
    }

    function getCameras() {        
        for (var i = 0; i < TOTAL_CAMERAS; i++) {
            cameraIDs[i] = "X";
        }
        allEntities = Entities.findEntities(MyAvatar.position, 10000);
        for (var j in allEntities) {
            var props = Entities.getEntityProperties(allEntities[j]);            
            if (props.name.slice(0,6) === "Camera") {
                print(props.name);
                var cameraNumber = parseInt(props.name.slice(6));
                cameraIDs[cameraNumber] = props.id;           
            }
        }
    }

    function addCamera(counter) {    
        var currentCameraRotation = Camera.orientation;
        var currentCameraPosition = Camera.position;
        var cameraID = Entities.addEntity({   
            type: "Model",
            name: "Camera" + counter,        
            position: currentCameraPosition,
            rotation: currentCameraRotation,
            collisionless: true,
            visible: true,
            modelURL: LOCATION_ROOT_URL + "Camera.fbx?" + Date.now(),
            userData: "{ \"grabbableKey\": { \"grabbable\": true, \"triggerable\": false}}" 
        });
        Entities.addEntity({
            type: "Text",
            name: "TextCamera" + counter,  
            parentID: cameraID,
            collisionless: true,
            localPosition: {x: 0,y: 0.16 ,z: 0.32},
            localRotation: generateQuatFromDegreesViaRadians(0,0,0),
            text: "F" + counter,
            lineHeight: 0.18,
            localDimensions: {x: 0.2763 ,y: 0.1817 ,z: 0.01}

        });
        cameraIDs[counter] = cameraID;    
    }

    function removeCamera(counter) {
        Entities.deleteEntity(cameraIDs[counter]);
        cameraIDs[counter] = "X";
    }

    function showCameraView(counter) {   
        isRunning = true;     
        var isFullscreen = Menu.isOptionChecked("Fullscreen");
        if (!isFullscreen) {
            Menu.triggerOption('Fullscreen');
        }
        var isOverlays = Menu.isOptionChecked("Show Overlays");
        if (isOverlays) {
            Menu.triggerOption('Show Overlays');
        }    
        Camera.captureMouse = true;         
        Camera.mode = "entity";
        Camera.cameraEntity = cameraIDs[counter];
        // set listener position to camera position
        Script.setTimeout(function () {
            MyAvatar.audioListenerMode = MyAvatar.audioListenerModeCustom; 
            MyAvatar.customListenPosition = Camera.position;
            MyAvatar.customListenOrientation = Camera.orientation;
            isCameraListeningPosition = true;            
        }, 100);        

        if (isVisible) {
            showMessage("F" + counter, 150 , 200);         
        }    
    }

    function rotateCamera(xAxis,yAxis) {    
        var cameraProps = Entities.getEntityProperties(cameraIDs[cameraCounter]);
        print(cameraProps.name);
        var eulerAngles = Quat.safeEulerAngles(cameraProps.rotation);
        eulerAngles.y = eulerAngles.y + yAxis * 0.2;
        eulerAngles.x = eulerAngles.x + xAxis * 0.2;
        print(JSON.stringify({x: eulerAngles.x,y: eulerAngles.y,z: eulerAngles.z}));
        var newRotation = Quat.fromPitchYawRollDegrees(eulerAngles.x, eulerAngles.y, eulerAngles.z );
        Entities.editEntity(cameraIDs[cameraCounter],{rotation: newRotation});   
    }

    function toggleVisibility() {    
        isVisible = !isVisible;
        for (var i in cameraIDs) {      
            if (cameraIDs[i] !== "X") {  
                Entities.editEntity(cameraIDs[i], {visible: isVisible });
                var childEntities = Entities.getChildrenIDs(cameraIDs[i]);
                for (var j in childEntities) {
                    Entities.editEntity(childEntities[j], {visible: isVisible });
                }
            }                    
        }       
    }
    function toggleListeningMethod() {
        isCameraListeningPosition = !isCameraListeningPosition;
        var modeMessage;
        if (isCameraListeningPosition) {
            modeMessage = "audio mode:\n\n Camera";
            Script.setTimeout(function () {                
                MyAvatar.audioListenerMode = MyAvatar.audioListenerModeCustom; 
                MyAvatar.customListenPosition = Camera.position;
                MyAvatar.customListenOrientation = Camera.orientation;
                isCameraListeningPosition = true;            
            }, 100);           
        } else {
            modeMessage = "audio mode:\n\n Avatar";
            Script.setTimeout(function () {
                MyAvatar.audioListenerMode = MyAvatar.audioListenerModeHead;                 
                isCameraListeningPosition = false;            
            }, 100);
           
        }
        showMessage(modeMessage, 30 ,200);
    }

    function showMessage(messageText, fontHeight, size) {        
        var xposition = Window.innerWidth/2;
        var yposition = Window.innerHeight/2;
        var overlayID = Overlays.addOverlay("text", {
            x: xposition - size/2,
            y: yposition - size/2,
            width: size,
            height: size,
            leftMargin: 20,
            topMargin: 20,
            text: messageText,
            font: {size: fontHeight},
            backgroundColor: {r: 100,g: 100,b: 100}
        });
        Script.setTimeout(function () {            
            Overlays.deleteOverlay(overlayID);    
        }, 1000);
    }

    Script.setInterval(function () {
        reset = true;      
    }, RESET_TIME);

    function keyPressEvent(event) { 
        if (reset) {            
            if (event.text.toLowerCase() === "k" ) {
                isFullscreen = Menu.isOptionChecked("Fullscreen");
                if (!isFullscreen) {
                    Menu.triggerOption('Fullscreen');
                }
                isOverlays = Menu.isOptionChecked("Show Overlays");
                if (!isOverlays) {
                    Menu.triggerOption('Show Overlays');
                }
            }

            if (event.text.toLowerCase() === "m" ) {
                print("m pressed");
                getCameras();
            }

            if (event.text.toLowerCase() === "n" ) {
                isFullscreen = Menu.isOptionChecked("Fullscreen");
                if (isFullscreen) {
                    Menu.triggerOption('Fullscreen');
                }
                isOverlays = Menu.isOptionChecked("Show Overlays");
                if (!isOverlays) {
                    Menu.triggerOption('Show Overlays');
                }
                Camera.mode = "first person";
                Camera.captureMouse = false;
                MyAvatar.audioListenerMode = MyAvatar.audioListenerModeHead;
                isCameraListeningPosition = false; 
                isRunning = false;          	    
            }
            if (event.text.toLowerCase() === "l" ) {
                toggleVisibility();  
            }
            if (event.text === "4" ) {
                // left
                rotateCamera(0,-1);  
            }          
            if (event.text === "5" ) {
                // down
                rotateCamera(-1,0);  
            }          
            if (event.text === "6" ) {   
                // right         
                rotateCamera(0,1); 
            }            
            if (event.text === "8" ) {
                // up
                rotateCamera(1,0);  
            }
            if (event.text.toLowerCase() === "c" ) {                
                if (isRunning) {
                    toggleListeningMethod();
                }
            }                

            if (event.text.slice(0,1) === "F" && event.text.length > 1 && event.isShifted) {
                cameraCounter = (parseInt(event.text.slice(1)));
                print("de cameracounter = " + (parseInt(event.text.slice(1))));
                if (cameraIDs[cameraCounter] === "X") {
                    print("adding camera " + cameraCounter);
                    addCamera(cameraCounter);
                } else {            
                    removeCamera(cameraCounter);
                    print("removing camera " + cameraCounter);
                }
                print(JSON.stringify(cameraIDs));
            }
            
            if (event.text.slice(0,1) === "F" && event.text.length > 1 && !event.isShifted) {
                cameraCounter = parseInt(event.text.slice(1));
                if (cameraIDs[cameraCounter] !== "X") {
                    print("showing camera " + cameraCounter);
                    showCameraView(cameraCounter);
                }
            }
            reset = false;
        }
    }

    Script.scriptEnding.connect(function () {
        if (onForm) {
            tablet.gotoHomeScreen();
        }
        button.clicked.disconnect(onClicked);
        tablet.screenChanged.disconnect(onScreenChanged);
        if (tablet) {
            tablet.removeButton(button);
        }        
        Controller.keyPressEvent.disconnect(keyPressEvent);
        for (var j in cameraIDs) {
            // Entities.deleteEntity(cameraIDs[j]);
        }
        Camera.mode = "first person";
        Camera.captureMouse = false;
        MyAvatar.audioListenerMode = MyAvatar.audioListenerModeHead;
        isCameraListeningPosition = false;                           
    });

    button.clicked.connect(onClicked);
    tablet.screenChanged.connect(onScreenChanged);    
    Controller.keyPressEvent.connect(keyPressEvent);
}());