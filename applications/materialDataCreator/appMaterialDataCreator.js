"use strict";
//
//  appMaterialDataCreator.js
//
//  Created by Alezia Kurdis, April 12th, 2020.
//  Copyright 2020 Vircadia and contributors.
//  Copyright 2022 Overte e.V.
//
//  A tool to generate materialData.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var jsMainFileName = "appMaterialDataCreator.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    
    var APP_NAME = "MAT-GEN"; 
    var APP_URL = ROOT + "materialDataCreator.html"; 
    var APP_ICON_INACTIVE = ROOT + "images/icon_materialDate_inactive.png";
    var APP_ICON_ACTIVE = ROOT + "images/icon_materialDate_active.png"; 
    var appStatus = false;
    var channel = "materialDataCreator.ak.overte";
    var nightmode = false;
    var demoID, materialID;
    var currentMaterialRecord;
    var currentMaterialData;
    var currentDemoShape = "cube";

    Script.include(["audioFeedback.js"]);

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
            deleteDemo();
        }else{
            tablet.gotoWebScreen(APP_URL);
            tablet.webEventReceived.connect(onMoreAppWebEventReceived);
            appStatus = true;
            createDemo();
        }

        button.editProperties({
            isActive: appStatus
        });
    }

    button.clicked.connect(clicked);
    
    function createDemo() {
        demoID = Entities.addEntity({
                    type: "Box",
                    name: "MATERIAL DEMO",
                    dimensions: {
                        x: 1,
                        y: 1,
                        z: 1
                    },
                    grab: {
                        grabbable: true
                    },
                    shape: "Cube",
                    position: Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0.25, z: -5 }))
                },"local");
        
        
        
        materialID = Entities.addEntity({
                    parentID: demoID,
                    parentMaterialName: "0",
                    type: "Material",
                    name: "untitled",
                    materialURL: "materialData",
                    priority: 1,
                    materialData: "{\"materials\":{}}",
                    position: Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0.25, z: -3 }))
                },"local");
    }

    function updateDemo(matData) {
        var data = JSON.parse(matData);
        var materialName = data.materials[0].name;
        Entities.editEntity(materialID, {
                name: materialName,
                materialData: matData
            });
    }

    function deleteDemo() {
        Entities.deleteEntity(materialID);
        Entities.deleteEntity(demoID);
    }

    function onMoreAppWebEventReceived(message) {
        eventObj = JSON.parse(message);
        if ( eventObj.channel === channel) {
            if ( eventObj.action === "updateMaterialData") {
                currentMaterialRecord = eventObj.materialRecord;
                currentMaterialData = eventObj.materialData;
                updateDemo(eventObj.materialData);
            }
            if ( eventObj.action === "changeDemoShape") {
                changeDemoShape(eventObj.shape);
            }
            if ( eventObj.action === "createMaterialEntity") {
                var newMaterialEntityId = Entities.addEntity({
                    parentMaterialName: "0",
                    type: "Material",
                    name: currentMaterialRecord.name,
                    materialURL: "materialData",
                    priority: 1,
                    materialData: currentMaterialData,
                    position: Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0.25, z: -2 }))
                },"domain");
                if (newMaterialEntityId !== Uuid.NULL) {
                    audioFeedback.confirmation();
                }
            }
            if ( eventObj.action === "exportMaterialAsJson") {
                Window.saveFileChanged.connect(onFileSaveChanged);
                Window.saveAsync("Select where to save", "", "*.json");
            }            
            if ( eventObj.action === "teleportToServerless") {
                deleteDemo();
                nightmode = false;
                Window.location = ROOT + "serverless.json?version=" + Math.floor(Math.random() * 32000);
                Window.domainChanged.connect(onDomainChanged);
            }
            if ( eventObj.action === "toggleDayNight") {
                var nightZoneID = Entities.findEntitiesByName("NIGHT_ZONE_MAT-GEN", MyAvatar.position, 200, true);
                var dayZoneID = Entities.findEntitiesByName("DAY_ZONE_MAT-GEN", MyAvatar.position, 200, true);
                var blueSpotID = Entities.findEntitiesByName("BLUE_NIGHT_SPOT", MyAvatar.position, 200, true);
                if (nightmode === false) {
                    //Set Night
                    Entities.editEntity(nightZoneID[0],{"visible": true});
                    Entities.editEntity(blueSpotID[0],{"visible": true});                    
                    Entities.editEntity(dayZoneID[0],{"visible": false});
                    nightmode = true;
                } else {
                    //Set Day
                    Entities.editEntity(nightZoneID[0],{"visible": false});
                    Entities.editEntity(blueSpotID[0],{"visible": false});                     
                    Entities.editEntity(dayZoneID[0],{"visible": true});                    
                    nightmode = false;
                }
            }            
        }
    }

    function onFileSaveChanged(filename) {
        Window.saveFileChanged.disconnect(onFileSaveChanged);
        if (filename !== "") {
            var success = Clipboard.exportEntities(filename, [materialID]);
            if (!success) {
                Window.notifyEditError("Export failed.");
            }
        }
    }

    function onDomainChanged(domain) {
        if (appStatus) {
            tablet.gotoHomeScreen();
            tablet.webEventReceived.disconnect(onMoreAppWebEventReceived);
            deleteDemo();
        }
        Window.domainChanged.disconnect(onDomainChanged);
    }

    function onScreenChanged(type, url) {
        if (type == "Web" && url.indexOf(APP_URL) != -1) {
            appStatus = true;

            var message = {
                "channel": channel,
                "action": "initializeMaterial",
                "material": currentMaterialRecord
            };
            Script.setTimeout(function () {
                tablet.emitScriptEvent(JSON.stringify(message));
            }, 1000);
            changeDemoShape(currentDemoShape);
        } else {
            appStatus = false;
            deleteDemo();
        }
        button.editProperties({
            isActive: appStatus
        });
    }

    function changeDemoShape(shape) {
        audioFeedback.action();
        currentDemoShape = shape;
        var prop = Entities.getEntityProperties(demoID, ["position"]);
        Entities.editEntity(materialID,{ parentID: "{00000000-0000-0000-0000-000000000000}",});
        Entities.deleteEntity(demoID);
        var newDemoDefinition;
        if (shape === "cube"){
            newDemoDefinition = {
                type: "Shape",
                name: "MATERIAL DEMO",
                dimensions: {
                    x: 1,
                    y: 1,
                    z: 1
                },
                grab: {
                    grabbable: true
                },
                shape: "Cube",
                position: prop.position
            };
        }
        if (shape === "sphere"){
            newDemoDefinition = {
                type: "Shape",
                name: "MATERIAL DEMO",
                dimensions: {
                    x: 1,
                    y: 1,
                    z: 1
                },
                grab: {
                    grabbable: true
                },
                shape: "Sphere",
                position: prop.position
            };           
        }
        if (shape === "teapot"){
            newDemoDefinition = {
                type: "Model", 
                modelURL: ROOT + "models/Teapot_hifi.fbx",
                name: "MATERIAL DEMO",
                grab: {
                    grabbable: true
                },
                position: prop.position
            };
        }         
        if (shape === "brand"){
            newDemoDefinition = {
                type: "Model", 
                modelURL: ROOT + "models/brand.fbx",
                name: "MATERIAL DEMO",
                grab: {
                    grabbable: true
                },
                position: prop.position
            };
        }


        demoID = Entities.addEntity(newDemoDefinition, "local");
        Entities.editEntity(materialID,{ parentID: demoID, parentMaterialName: "0",});
    }

    function cleanup() {
        if (appStatus) {
            tablet.gotoHomeScreen();
            tablet.webEventReceived.disconnect(onMoreAppWebEventReceived);
            deleteDemo();
        }
        tablet.screenChanged.disconnect(onScreenChanged);
        tablet.removeButton(button);
    }
    Script.scriptEnding.connect(cleanup);
}());
