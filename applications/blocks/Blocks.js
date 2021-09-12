//
//  Blocks.js
//
//  created by Basinsky on 09/12/21
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

var isShiftPressed = false;
var isControlPressed = false;
var isAltPressed = false;
var newPosition;
var newDirection;
var hoverID;
var webPageID;
var hoverProps = {};
var originalPosition;
var objectSize;
var STEP_SIZE = 0.01;
var reset = false;
var RESET_TIME = 100;
var SEARCH_RADIUS = 100;
var LOCATION_ROOT_URL = Script.resolvePath(".");
var ICON_LIBRARY_URL = LOCATION_ROOT_URL + "Icons/Blocks-icons.json";
var ICON_URL = LOCATION_ROOT_URL + "Icons/";
var allOverlays = [];
var iconLibrary = Script.require(ICON_LIBRARY_URL + "?" + Date.now());
var ICON_SIZE = 40;
var iconSelection = 0;
var icon;
var ICON_HORIZONTAL_ANCHOR = 50;
var ICON_VERTICAL_ANCHOR = 70;
var ICON_SHOW_TIME = 500;// ms
var UPDATE_TIME = 50; // ms
var isRunning = false;
var colorsIDs = [];
var isXPressed = false;
var isYPressed = false;
var isZPressed = false;
var currentDirection = "Y";
var directionID;
var mainLoop;
var keys = [];
var UIkeys = ["x","X","y","Y","z","Z","ALT","SHIFT","CONTROL","DELETE"];

var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
var button;

button = tablet.addButton({
    icon: LOCATION_ROOT_URL + "blocks-inactive.svg?" + Date.now(),
    activeIcon: LOCATION_ROOT_URL + "blocks-active.svg?" + Date.now(),
    text: "BLOCKS",
    sortOrder: 12
});

var screenSize = Controller.getViewportDimensions();

Script.include("/~/system/libraries/toolBars.js");

var colorToolBar = new ToolBar(ICON_HORIZONTAL_ANCHOR,ICON_VERTICAL_ANCHOR, ToolBar.VERTICAL, "placeBlocks-colorToolbar");

var LIST_NAME = "SelectionExample",
    ITEM_TYPE = "entity",
    HIGHLIGHT_STYLE = {
        outlineUnoccludedColor: { red: 0, green: 255, blue: 255 },
        outlineUnoccludedAlpha: 0.8,
        outlineOccludedColor: { red: 0, green: 255, blue: 255 },
        outlineOccludedAlpha: 0.8,
        outlineWidth: 2
    };

Selection.enableListHighlight(LIST_NAME, HIGHLIGHT_STYLE);

Script.setInterval(function () {
    reset = true;    
}, RESET_TIME);

// functions
function prefetchIcons() {
    for (var t = 0; t < iconLibrary.iconData.length; t++) {    
        if (iconLibrary.iconData[t].inactive !== null) {
            TextureCache.prefetch(iconLibrary.iconData[t].inactive);
            TextureCache.prefetch(iconLibrary.iconData[t].active);
        }
    }
}

function createMainloop() {
    mainLoop = Script.setInterval(function () {
        if (isRunning) {
            if (hoverID) {            
                if (isControlPressed) {
                    HIGHLIGHT_STYLE = {
                        outlineUnoccludedColor: { red: 0, green: 255, blue: 255 },
                        outlineUnoccludedAlpha: 0.8,
                        outlineOccludedColor: { red: 0, green: 255, blue: 255 },
                        outlineOccludedAlpha: 0.8,
                        outlineWidth: 2
                    };
                }
                if (isAltPressed) {
                    HIGHLIGHT_STYLE = {
                        outlineUnoccludedColor: { red: 255, green: 255, blue: 0 },
                        outlineUnoccludedAlpha: 0.8,
                        outlineOccludedColor: { red: 255, green: 255, blue: 0 },
                        outlineOccludedAlpha: 0.8,
                        outlineWidth: 2
                    };
                }
                if (isShiftPressed) {
                    HIGHLIGHT_STYLE = {
                        outlineUnoccludedColor: { red: 255, green: 0, blue: 255 },
                        outlineUnoccludedAlpha: 0.8,
                        outlineOccludedColor: { red: 255, green: 0, blue: 255 },
                        outlineOccludedAlpha: 0.8,
                        outlineWidth: 2
                    };
                }
                Selection.enableListHighlight(LIST_NAME, HIGHLIGHT_STYLE);
                if (isShiftPressed || isAltPressed || isControlPressed) {
                    Selection.clearSelectedItemsList(LIST_NAME);      
                    Selection.addToSelectedItemsList(LIST_NAME, ITEM_TYPE, hoverID);
                    if (currentDirection === "X") {
                        addDirection(hoverID,"X");
                    }
                    if (currentDirection === "Y") {
                        addDirection(hoverID,"Y");
                    }
                    if (currentDirection === "Z") {
                        addDirection(hoverID,"Z");
                    }   
                } else {
                    if (directionID) {
                        Entities.deleteEntity(directionID);
                    }                 
                    Selection.clearSelectedItemsList(LIST_NAME);
                } 
            }
        }  
    }, UPDATE_TIME);
}

function loadColors() {    
    for (var i = 0; i < iconLibrary.iconData.length; i++) {  
        if (iconLibrary.iconData[i].type === "color") {      
            icon = JSON.parse(iconLibrary.iconData[i].color); 
        }           
    }
}

function addIcons() {    
    if (colorToolBar === undefined) {
        colorToolBar = new ToolBar(ICON_HORIZONTAL_ANCHOR,
            ICON_VERTICAL_ANCHOR,
            ToolBar.VERTICAL,
            "placeBlocks-colorToolbar");              
    }
    var overlayID;    
    for (var t = 0; t < iconLibrary.iconData.length; t++) {    
        if (iconLibrary.iconData[t].inactive !== null) {
            if (iconLibrary.iconData[t].type === "color") {                   
                overlayID = colorToolBar.addTool({
                    x: 0,                
                    y: 0,
                    width: ICON_SIZE,
                    height: ICON_SIZE,
                    imageURL: LOCATION_ROOT_URL + "Icons/" + iconLibrary.iconData[t].inactive,
                    alpha: 1,
                    visible: true                   
                });                     
                colorsIDs.push(overlayID);            
            }
            if (iconLibrary.iconData[t].type === "action") {    
                overlayID = colorToolBar.addTool({
                    x: 0,                
                    y: 0,
                    width: ICON_SIZE,
                    height: ICON_SIZE,
                    imageURL: LOCATION_ROOT_URL + "Icons/" + iconLibrary.iconData[t].inactive,
                    alpha: 1,
                    visible: true                   
                });                     
                colorsIDs.push(overlayID);            
            }            
        }
    }
}

function deleteAll() {
    var allEnts = Entities.findEntities(MyAvatar.position,SEARCH_RADIUS);
    for (var k in allEnts) {
        var deleteProps = Entities.getEntityProperties(allEnts[k]);
        if (deleteProps.name === "buildSystem" && deleteProps.description === MyAvatar.displayName) {
            if (MyAvatar.displayName !== "anonymous") {
                Entities.deleteEntity(deleteProps.id);
            }
        }
    }
}

function addDirection(currentBlockID,dir) {
    var directionRotation;
    var directionColor;
    var directionDimensions;

    if (directionID) {
        Entities.deleteEntity(directionID);
    }    
    if (dir === "X") {
        directionRotation = Quat.fromPitchYawRollRadians(0,0,Math.PI/2);  
        directionColor = {r: 255,g: 0,b: 0};
        directionDimensions = {x: 0.003,y: 100,z: 0.003};
    }
    if (dir === "Y") {
        directionRotation = Quat.fromPitchYawRollRadians(0,0,0);  
        directionColor = {r: 0,g: 255,b: 0};
        directionDimensions = {x: 0.003,y: 100,z: 0.003};
    }
    if (dir === "Z") {
        directionRotation = Quat.fromPitchYawRollRadians(Math.PI/2,0,0);   
        directionColor = {r: 0,g: 0,b: 255};
        directionDimensions = {x: 0.003,y: 100,z: 0.003};
    }
    
    directionID = Entities.addEntity({
        type: "Shape",        
        shape: "Cylinder",                       
        name: "y-axis",
        parentID: currentBlockID,                   
        localPosition: {x: 0,y: 0,z: 0},
        localRotation: directionRotation,   
        lifetime: 3,
        color: directionColor,
        alpha: 1,
        dimensions: directionDimensions,
        ignoreForCollisions: true,
        userData: "{ \"grabbableKey\": { \"grabbable\": false, \"triggerable\": false}}"    
    },"local");
}

function newBlock() {    
    var cubePos = Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0.7, z: -2 }));
    Entities.addEntity({                
        type: "Box",
        name: "buildSystem",
        description: MyAvatar.displayName,                                  
        position: cubePos,
        color: { r: 50, g: 50, b: 50 },
        rotation: MyAvatar.orientation,
        dimensions: { x: 0.1, y: 0.1, z: 0.1 },
        grab: {triggerable: true,grabbable: false},
        lifetime: -1
    });           
}

function deleteBlock() {
    if (hoverID) {
        var deleteProps = Entities.getEntityProperties(hoverID);
        if (deleteProps.name === "buildSystem" && deleteProps.description === MyAvatar.displayName) {
            Entities.deleteEntity(hoverID);
        }
    }
}

function showHelpPage() {
    var METERS_TO_INCHES = 39.3701;
    webPageID = Entities.addEntity({
        type: "Web",
        name: "blocks-help",
        sourceUrl: LOCATION_ROOT_URL + "Blocks-help.html",
        position: Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0.8, z: -1.4 })),
        rotation: MyAvatar.orientation,
        dimensions: {
            x: 0.7,
            y: 1,
            z: 0.01
        },
        dpi: 1920 / (3 * METERS_TO_INCHES),
        lifetime: 60 // Delete after 5 minutes.
    });
}

// events

function wheelEvent(event) {
    if (isRunning) {   
        if (hoverID) {       
            var currentProps = Entities.getEntityProperties(hoverID);
            var newDir;
            var newDim;
            var newPos;
            var newRot;
            var direction = 1;

            if (event.delta > 0) {
                direction = 1;            
            } else {
                direction = -1;          
            }

            if (isShiftPressed) {                 
                if (currentDirection === "X") {
                    if (direction > 0) {
                        newDim =
                        {
                            x: currentProps.dimensions.x + STEP_SIZE,
                            y: currentProps.dimensions.y,
                            z: currentProps.dimensions.z
                        }; 
                    } else {
                        newDim =
                        {
                            x: currentProps.dimensions.x - STEP_SIZE,
                            y: currentProps.dimensions.y,
                            z: currentProps.dimensions.z
                        }; 
                    }
                }
                if (currentDirection === "Y") {
                    if (direction > 0) {
                        newDim =
                        {
                            x: currentProps.dimensions.x,
                            y: currentProps.dimensions.y + STEP_SIZE,
                            z: currentProps.dimensions.z
                        }; 
                    } else {
                        newDim =
                        {
                            x: currentProps.dimensions.x,
                            y: currentProps.dimensions.y - STEP_SIZE,
                            z: currentProps.dimensions.z
                        }; 
                    }
                }
                if (currentDirection === "Z") {
                    if (direction > 0) {
                        newDim =
                        {
                            x: currentProps.dimensions.x,
                            y: currentProps.dimensions.y,
                            z: currentProps.dimensions.z + STEP_SIZE
                        }; 
                    } else {
                        newDim =
                        {
                            x: currentProps.dimensions.x,
                            y: currentProps.dimensions.y,
                            z: currentProps.dimensions.z - STEP_SIZE
                        }; 
                    }
                }                            
                Entities.editEntity(hoverID,{           
                    dimensions: newDim               
                });
            }
            
            if (isControlPressed) {                
                if (currentDirection === "X") {
                    newRot = Quat.multiply(currentProps.rotation, Quat.fromPitchYawRollDegrees(5 * direction,0,0));  
                }
                if (currentDirection === "Y") {
                    newRot = Quat.multiply(currentProps.rotation, Quat.fromPitchYawRollDegrees(0,5 * direction,0));  
                }
                if (currentDirection === "Z") {
                    newRot = Quat.multiply(currentProps.rotation, Quat.fromPitchYawRollDegrees(0,0,5 * direction));  
                }                            
                Entities.editEntity(hoverID,{           
                    rotation: newRot                
                });
            }

            if (isAltPressed) {            
                if (currentDirection === "X") {
                    newDir = {
                        x: direction * STEP_SIZE ,
                        y: 0 ,
                        z: 0 };
                    newPos = Vec3.sum(currentProps.position, Vec3.multiplyQbyV(currentProps.rotation, newDir));
                }
                if (currentDirection === "Y") {
                    newDir = {
                        x: 0 ,
                        y: direction * STEP_SIZE ,
                        z: 0 };
                    newPos = Vec3.sum(currentProps.position, Vec3.multiplyQbyV(currentProps.rotation, newDir));
                }
                if (currentDirection === "Z") {
                    newDir = {
                        x: 0,
                        y: 0,
                        z: direction * STEP_SIZE };
                    newPos = Vec3.sum(currentProps.position, Vec3.multiplyQbyV(currentProps.rotation, newDir));
                }
                Entities.editEntity(hoverID,{           
                    position: newPos              
                });
            } 
        }  
    }
}

function mousePressEvent(event) {   
    if (isRunning) {                          
        var overlay = Overlays.getOverlayAtPoint({ x: event.x, y: event.y });        
        var clickedIcon = colorToolBar.clicked(overlay);        
        if (colorsIDs.indexOf(clickedIcon) !== -1) {
            if (iconLibrary.iconData[iconSelection].type === "color") {                
                colorToolBar.setImageURL(ICON_URL +
                    iconLibrary.iconData[iconSelection].inactive,colorsIDs[iconSelection]);            
                if (colorToolBar.clicked(clickedIcon)) {               
                    iconSelection = clickedIcon;                
                    colorToolBar.setImageURL(ICON_URL +
                        iconLibrary.iconData[clickedIcon].active,clickedIcon);                   
                }
            }
            if (iconLibrary.iconData[iconSelection].type === "action") {
                iconSelection = clickedIcon;                
                if (iconLibrary.iconData[iconSelection].name === "newblock") {
                    newBlock();
                    Script.setTimeout(function () { 
                        colorToolBar.setImageURL(ICON_URL +
                            iconLibrary.iconData[iconSelection].inactive,colorsIDs[iconSelection]);
                        colorToolBar.setImageURL(ICON_URL +
                            iconLibrary.iconData[0].active,colorsIDs[0]); 
                        iconSelection = 0;       
                    }, ICON_SHOW_TIME);

                }
                if (iconLibrary.iconData[iconSelection].name === "deleteall") {
                    deleteAll();
                    Script.setTimeout(function () { 
                        colorToolBar.setImageURL(ICON_URL +
                            iconLibrary.iconData[iconSelection].inactive,colorsIDs[iconSelection]);
                        colorToolBar.setImageURL(ICON_URL +
                            iconLibrary.iconData[0].active,colorsIDs[0]);
                        iconSelection = 0;
                    }, ICON_SHOW_TIME);
                }
                if (iconLibrary.iconData[iconSelection].name === "help") {
                    showHelpPage();                  
                    Script.setTimeout(function () { 
                        colorToolBar.setImageURL(ICON_URL +
                            iconLibrary.iconData[iconSelection].inactive,colorsIDs[iconSelection]);
                        colorToolBar.setImageURL(ICON_URL +
                            iconLibrary.iconData[0].active,colorsIDs[0]);
                        iconSelection = 0;
                    }, ICON_SHOW_TIME);
                }
            }
        }
    }   
}

function hoverOverEntity(entityID) {
    if (isRunning) {        
        if (entityID !== hoverID || hoverID === undefined) {                  
            hoverProps = Entities.getEntityProperties (entityID);
            if (hoverProps.name === "buildSystem") {
                hoverID = entityID;                              
            } else {               
                hoverID = undefined;                
            }            
        }       
    }
}

function mousePressOnEntity(entityID, event) {
    if (isRunning) {        
        var objectProps = {};
        if (event.isPrimaryButton && reset) { 
            reset = false;       
            objectProps = Entities.getEntityProperties(entityID);            
            if (objectProps.type === "Box" && objectProps.name === "buildSystem") {
                var newPosition = objectProps.position;
                originalPosition = objectProps.position;
                objectSize = objectProps.dimensions;
                var objectRot = objectProps.rotation;           
                var surfaceNormal = event.normal;
                var mainAxisFront = Quat.getFront(objectRot);
                var mainAxisRight = Quat.getRight(objectRot);
                var mainAxisUp = Quat.getUp(objectRot);
                var directionz = 0;
                var directiony = 0;
                var directionx = 0;               
                var dotFront = Vec3.dot(surfaceNormal,mainAxisFront);
                var dotRight = Vec3.dot(surfaceNormal,mainAxisRight);
                var dotUp = Vec3.dot(surfaceNormal,mainAxisUp);
                
                if (Math.abs(dotRight) > 0.98) {
                    if (dotRight > 0) {
                        directionx = objectProps.dimensions.x;
                    } else {
                        directionx = -objectProps.dimensions.x;
                    }
                }

                if (Math.abs(dotUp) > 0.98) {
                    if (dotUp > 0) {
                        directiony = objectProps.dimensions.y;
                    } else {
                        directiony = -objectProps.dimensions.y;
                    }
                }    
                
                if (Math.abs(dotFront) > 0.98) {
                    if (dotFront > 0) {
                        directionz = -objectProps.dimensions.z;
                    } else {
                        directionz = objectProps.dimensions.z;
                    }
                }            
                newDirection = { x: directionx, y: directiony, z: directionz };        
                newPosition = Vec3.sum(originalPosition, Vec3.multiplyQbyV(objectRot, newDirection));                
                if (iconLibrary.iconData[iconSelection].type === "color") {
                    var iconColor = JSON.parse(iconLibrary.iconData[iconSelection].color);
                    hoverID = Entities.addEntity({                
                        type: "Box",
                        name: "buildSystem",
                        description: MyAvatar.displayName,                           
                        position: newPosition,
                        color: iconColor,
                        rotation: objectRot,
                        dimensions: objectSize,
                        grab: {triggerable: true,grabbable: false},
                        lifetime: -1
                    });
                }
            }
            if (objectProps.type === "Web" && objectProps.name === "blocks-help") {
                Entities.deleteEntity(objectProps.id);
            }
        }
        if (event.isMiddleButton) {   
            if (hoverID) {
                var deleteProps = Entities.getEntityProperties(hoverID);
                if (deleteProps.name === "buildSystem" && deleteProps.description === MyAvatar.displayName) {
                    Entities.deleteEntity(hoverID);
                }
            }
        }
    }
}

function keyPressEvent(event) {
    if (isRunning) {        
        if (keys.indexOf(event.text) === -1) {
            if (UIkeys.indexOf(event.text) !== -1) {           
                keys.push(event.text);
            }
        }        
        if (keys.indexOf("DELETE") !== -1) {
            deleteBlock();            
        }
        if (keys.indexOf("SHIFT") !== -1) {
            Controller.captureWheelEvents();               
            isShiftPressed = true;            
        }
        if (keys.indexOf("CONTROL") !== -1) {
            Controller.captureWheelEvents();                
            isControlPressed = true;           
        }    
        if (keys.indexOf("ALT") !== -1) {
            Controller.captureWheelEvents();                
            isAltPressed = true;           
        }
        if (keys.indexOf("x") !== -1 || keys.indexOf("X") !== -1) {
            isXPressed = true;
            currentDirection = "X";            
        }
        if (keys.indexOf("y") !== -1 || keys.indexOf("Y") !== -1) {
            isYPressed = true;
            currentDirection = "Y";            
        }  
        if (keys.indexOf("z") !== -1 || keys.indexOf("Z") !== -1) {
            isZPressed = true;
            currentDirection = "Z";            
        }            
    } 
}

function keyReleaseEvent(event) {
    if (isRunning) {
        keys = [];

        if (event.text === "SHIFT") {
            Controller.releaseWheelEvents();               
            isShiftPressed = false;           
        }
        if (event.text === "CONTROL") {
            Controller.releaseWheelEvents();              
            isControlPressed = false;            
        }    
        if (event.text === "ALT") {
            Controller.releaseWheelEvents();               
            isAltPressed = false;            
        }
    }    
}

function cleanUp() {
    Selection.removeListFromMap(LIST_NAME);
    if (webPageID) {
        Entities.deleteEntity(webPageID);
    }
    webPageID = undefined;
    if (colorToolBar !== undefined) {
        colorToolBar.cleanup();
    }
    colorToolBar = undefined;
    if (mainLoop) {    
        Script.clearInterval(mainLoop);
    }
    if (isRunning) {  
        Controller.keyPressEvent.disconnect(keyPressEvent);
        Controller.keyReleaseEvent.disconnect(keyReleaseEvent);
        Controller.wheelEvent.disconnect(wheelEvent);
        Controller.mousePressEvent.disconnect(mousePressEvent);
        Entities.hoverOverEntity.disconnect(hoverOverEntity);
        Entities.mousePressOnEntity.disconnect(mousePressOnEntity);
    }        
    allOverlays = [];
    colorsIDs = [];       
}

Script.scriptEnding.connect(function () {       
    cleanUp();
    button.clicked.disconnect(onClicked);        
    if (tablet) {
        tablet.removeButton(button);
    }        
});

function onClicked() {
    if (isRunning) {
        tablet.gotoHomeScreen();
        cleanUp();
        isRunning = false;
        button.editProperties({ isActive: false });        
       
    } else {              
        isRunning = true; 
        button.editProperties({ isActive: true });
        loadColors();
        addIcons();        
        createMainloop();        
        Controller.keyPressEvent.connect(keyPressEvent);
        Controller.keyReleaseEvent.connect(keyReleaseEvent);
        Controller.wheelEvent.connect(wheelEvent);
        Controller.mousePressEvent.connect(mousePressEvent);
        Entities.hoverOverEntity.connect(hoverOverEntity);
        Entities.mousePressOnEntity.connect(mousePressOnEntity);        
    }    
}

prefetchIcons(); 
button.clicked.connect(onClicked);
