//
//  app-domainMapper.js
//
//  Created by Alezia Kurdis, March 4th 2024.
//  Copyright 2024, Overte e.V.
//
//  Overte Application to generate a map of the occupied area in a domain by generating a 3d representation.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var jsMainFileName = "app-domainMapper.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    
    var APP_ICON_INACTIVE = ROOT + "icon_inactive_white.png";
    var ICON_CAPTION_COLOR = "#FFFFFF";
    if (ROOT.substr(0, 4) !== "http") {
        APP_ICON_INACTIVE = ROOT + "icon_inactive_green.png";
        ICON_CAPTION_COLOR = "#00FF00";
    }
    var APP_ICON_ACTIVE = ROOT + "icon_active.png";
    var APP_NAME = "DOMAP";
    var appStatus = false;

    var UPDATE_TIMER_INTERVAL = 5000; // 5 sec 
    var processTimer = 0;

    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");

    var domainMapID = Uuid.NULL;
    var displayPosition = null;
    var FULL_DOMAIN_SCAN_RADIUS = 27713;
    var DOMAIN_SIZE = 32768;
    var DOMAIN_MAP_SIZE = 4; //in meters

    var button = tablet.addButton({
        text: APP_NAME,
        icon: APP_ICON_INACTIVE,
        activeIcon: APP_ICON_ACTIVE,
        captionColor: ICON_CAPTION_COLOR
    });

    function clicked(){
        var colorCaption;
        if (appStatus === true) {
            clearDomainMap();
            colorCaption = ICON_CAPTION_COLOR;
            appStatus = false;
            Script.update.disconnect(myTimer);
            displayPosition = null;
        }else{
            drawDomainMap();
            colorCaption = "#000000";
            appStatus = true;
            Script.update.connect(myTimer);
        }

        button.editProperties({
            isActive: appStatus,
            captionColor: colorCaption
        });
    }

    function myTimer(deltaTime) {
        var today = new Date();
        if ((today.getTime() - processTimer) > UPDATE_TIMER_INTERVAL ) {
            
            drawDomainMap();
            
            today = new Date();
            processTimer = today.getTime();
        }  
    }

    function makeUnlit(id) {
        var materialData = "{\n  \"materialVersion\": 1,\n  \"materials\": [\n    {\n      \"name\": \"0\",\n      \"defaultFallthrough\": true,\n      \"unlit\": true,\n      \"model\": \"hifi_pbr\"\n    }\n  ]\n}";
        var materialEntityID = Entities.addEntity({
            "type": "Material",
            "parentID": id,
            "localPosition": {"x": 0, "y": 0, "z": 0},
            "name": "Unlit-material",
            "parentMaterialName": "0",
            "materialURL": "materialData",
            "priority": 1,
            "materialMappingMode": "uv",
            "ignorePickIntersection": true,
            "materialData": materialData
        }, "local");
    }

    function drawDomainMap() {
        var i, id, properties;
        var domainName = location.hostname;
        if (domainName === "") {
            domainName = "SERVERLESS";
        }
        
        var zones = Entities.findEntitiesByType("Zone", {"x": 0, "y": 0, "z": 0}, FULL_DOMAIN_SCAN_RADIUS);
        if (displayPosition === null) {
            displayPosition = Vec3.sum(MyAvatar.feetPosition, Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: DOMAIN_MAP_SIZE/2, z: - DOMAIN_MAP_SIZE }));
        }
        clearDomainMap();
        domainMapID = Entities.addEntity({
            "name": "DOMAIN MAP - " + domainName,
            "type": "Shape",
            "shape": "Cube",
            "grab": {"grabbable": false },
            "dimensions": {"x": DOMAIN_MAP_SIZE, "y": DOMAIN_MAP_SIZE, "z": DOMAIN_MAP_SIZE},
            "position": displayPosition,
            "color": {"red": 255, "green": 255, "blue": 255},
            "alpha": 0.05,
            "canCastShadow": false,
            "collisionless": true,
            "primitiveMode": "solid"
        }, "local");
        makeUnlit(domainMapID);
        
        id = Entities.addEntity({
            "name": "DOMAIN MAP FRAME - " + domainName,
            "type": "Shape",
            "parentID": domainMapID,
            "shape": "Cube",
            "grab": {"grabbable": false },
            "dimensions": {"x": DOMAIN_MAP_SIZE, "y": DOMAIN_MAP_SIZE, "z": DOMAIN_MAP_SIZE},
            "localPosition": {"x": 0, "y": 0, "z": 0},
            "color": {"red": 255, "green": 255, "blue": 255},
            "alpha": 1,
            "canCastShadow": false,
            "collisionless": true,
            "primitiveMode": "lines"
        }, "local");
        makeUnlit(id);
        
        id = Entities.addEntity({
            "name": "DOMAINE NAME",
            "type": "Text",
            "parentID": domainMapID,
            "grab": {"grabbable": false },
            "dimensions": {"x": 4, "y": 0.5, "z": 0.01},
            "localPosition": {"x": 0, "y": (DOMAIN_MAP_SIZE/2) + 0.7, "z": 0},
            "text": domainName,
            "lineHeight": 0.25,
            "textColor": {"red": 255, "green": 255, "blue": 255},
            "textAlpha": 0.8,
            "backgroundAlpha": 0,
            "unlit": true,
            "alignment": "center",
            "billboardMode": "full",
            "canCastShadow": false,
            "collisionless": true
        }, "local");
        
        id = Entities.addEntity({
            "name": "X AXIS",
            "type": "Shape",
            "shape": "Cylinder",
            "parentID": domainMapID,
            "grab": {"grabbable": false },
            "dimensions": {"x": 0.02, "y": DOMAIN_MAP_SIZE, "z": 0.02},
            "localPosition": {"x": 0, "y": 0, "z": 0},
            "localRotation": Quat.fromVec3Degrees({"x": 0, "y": 0, "z": 90}),
            "color": {"red": 255, "green": 0, "blue": 0},
            "alpha": 0.8,
            "canCastShadow": false,
            "collisionless": true
        }, "local");
        makeUnlit(id);
        
        id = Entities.addEntity({
            "name": "Y AXIS",
            "type": "Shape",
            "shape": "Cylinder",
            "parentID": domainMapID,
            "grab": {"grabbable": false },
            "dimensions": {"x": 0.02, "y": DOMAIN_MAP_SIZE, "z": 0.02},
            "localPosition": {"x": 0, "y": 0, "z": 0},
            "localRotation": Quat.fromVec3Degrees({"x": 0, "y": 0, "z": 0}),
            "color": {"red": 0, "green": 255, "blue": 0},
            "alpha": 0.8,
            "canCastShadow": false,
            "collisionless": true
        }, "local");
        makeUnlit(id);
        
        id = Entities.addEntity({
            "name": "Z AXIS",
            "type": "Shape",
            "shape": "Cylinder",
            "parentID": domainMapID,
            "grab": {"grabbable": false },
            "dimensions": {"x": 0.02, "y": DOMAIN_MAP_SIZE, "z": 0.02},
            "localPosition": {"x": 0, "y": 0, "z": 0},
            "localRotation": Quat.fromVec3Degrees({"x": 90, "y": 0, "z": 0}),
            "color": {"red": 0, "green": 0, "blue": 255},
            "alpha": 0.8,
            "canCastShadow": false,
            "collisionless": true
        }, "local");
        makeUnlit(id);
        
        id = Entities.addEntity({
            "name": "+X",
            "type": "Text",
            "parentID": domainMapID,
            "grab": {"grabbable": false },
            "dimensions": {"x": 0.3, "y": 0.2, "z": 0.01},
            "localPosition": {"x": (DOMAIN_MAP_SIZE/2) + 0.3, "y": 0, "z": 0},
            "text": "+X",
            "lineHeight": 0.15,
            "textColor": {"red": 255, "green": 0, "blue": 0},
            "textAlpha": 0.8,
            "backgroundAlpha": 0,
            "unlit": true,
            "alignment": "center",
            "billboardMode": "full",
            "canCastShadow": false,
            "collisionless": true
        }, "local");
        
        id = Entities.addEntity({
            "name": "-X",
            "type": "Text",
            "parentID": domainMapID,
            "grab": {"grabbable": false },
            "dimensions": {"x": 0.3, "y": 0.2, "z": 0.01},
            "localPosition": {"x": (-DOMAIN_MAP_SIZE/2) - 0.3, "y": 0, "z": 0},
            "text": "-X",
            "lineHeight": 0.15,
            "textColor": {"red": 255, "green": 0, "blue": 0},
            "textAlpha": 0.8,
            "backgroundAlpha": 0,
            "unlit": true,
            "alignment": "center",
            "billboardMode": "full",
            "canCastShadow": false,
            "collisionless": true
        }, "local");

        id = Entities.addEntity({
            "name": "+Y",
            "type": "Text",
            "parentID": domainMapID,
            "grab": {"grabbable": false },
            "dimensions": {"x": 0.3, "y": 0.2, "z": 0.01},
            "localPosition": {"x": 0, "y": (DOMAIN_MAP_SIZE/2) + 0.3, "z": 0},
            "text": "+Y",
            "lineHeight": 0.15,
            "textColor": {"red": 0, "green": 255, "blue": 0},
            "textAlpha": 0.8,
            "backgroundAlpha": 0,
            "unlit": true,
            "alignment": "center",
            "billboardMode": "full",
            "canCastShadow": false,
            "collisionless": true
        }, "local");

        id = Entities.addEntity({
            "name": "-Y",
            "type": "Text",
            "parentID": domainMapID,
            "grab": {"grabbable": false },
            "dimensions": {"x": 0.3, "y": 0.2, "z": 0.01},
            "localPosition": {"x": 0, "y": (-DOMAIN_MAP_SIZE/2) - 0.3, "z": 0},
            "text": "-Y",
            "lineHeight": 0.15,
            "textColor": {"red": 0, "green": 255, "blue": 0},
            "textAlpha": 0.8,
            "backgroundAlpha": 0,
            "unlit": true,
            "alignment": "center",
            "billboardMode": "full",
            "canCastShadow": false,
            "collisionless": true
        }, "local");

        id = Entities.addEntity({
            "name": "+Z",
            "type": "Text",
            "parentID": domainMapID,
            "grab": {"grabbable": false },
            "dimensions": {"x": 0.3, "y": 0.2, "z": 0.01},
            "localPosition": {"x": 0, "y": 0, "z": (DOMAIN_MAP_SIZE/2) + 0.3},
            "text": "+Z",
            "lineHeight": 0.15,
            "textColor": {"red": 0, "green": 0, "blue": 255},
            "textAlpha": 0.8,
            "backgroundAlpha": 0,
            "unlit": true,
            "alignment": "center",
            "billboardMode": "full",
            "canCastShadow": false,
            "collisionless": true
        }, "local");

        id = Entities.addEntity({
            "name": "-Z",
            "type": "Text",
            "parentID": domainMapID,
            "grab": {"grabbable": false },
            "dimensions": {"x": 0.3, "y": 0.2, "z": 0.01},
            "localPosition": {"x": 0, "y": 0, "z": (-DOMAIN_MAP_SIZE/2) - 0.3},
            "text": "-Z",
            "lineHeight": 0.15,
            "textColor": {"red": 0, "green": 0, "blue": 255},
            "textAlpha": 0.8,
            "backgroundAlpha": 0,
            "unlit": true,
            "alignment": "center",
            "billboardMode": "full",
            "canCastShadow": false,
            "collisionless": true
        }, "local");

        if (zones.length > 0) {
            var margins = 0;
            var color;
            for (i = 0; i < zones.length; i++) {
                properties = Entities.getEntityProperties(zones[i], ["position", "dimensions", "name", "rotation"]);
                color = getColorFromID(zones[i]);
                id = Entities.addEntity({
                    "name": "Zone - " + properties.name,
                    "type": "Shape",
                    "shape": "Cube",
                    "parentID": domainMapID,
                    "grab": {"grabbable": false },
                    "dimensions": {
                        "x": DOMAIN_MAP_SIZE * (properties.dimensions.x/DOMAIN_SIZE),
                        "y": DOMAIN_MAP_SIZE * (properties.dimensions.y/DOMAIN_SIZE),
                        "z": DOMAIN_MAP_SIZE * (properties.dimensions.z/DOMAIN_SIZE)
                    },
                    "localPosition": {
                        "x": (DOMAIN_MAP_SIZE/2) * (properties.position.x/(DOMAIN_SIZE/2)),
                        "y": (DOMAIN_MAP_SIZE/2) * (properties.position.y/(DOMAIN_SIZE/2)),
                        "z": (DOMAIN_MAP_SIZE/2) * (properties.position.z/(DOMAIN_SIZE/2))
                    },
                    "localRotation": properties.rotation,
                    "color": color,
                    "alpha": 0.1,
                    "canCastShadow": false,
                    "collisionless": true
                }, "local");
                makeUnlit(id);

                id = Entities.addEntity({
                    "name": "Zone Frame - " + properties.name,
                    "type": "Shape",
                    "shape": "Cube",
                    "parentID": domainMapID,
                    "grab": {"grabbable": false },
                    "dimensions": {
                        "x": DOMAIN_MAP_SIZE * (properties.dimensions.x/DOMAIN_SIZE),
                        "y": DOMAIN_MAP_SIZE * (properties.dimensions.y/DOMAIN_SIZE),
                        "z": DOMAIN_MAP_SIZE * (properties.dimensions.z/DOMAIN_SIZE)
                    },
                    "localPosition": {
                        "x": (DOMAIN_MAP_SIZE/2) * (properties.position.x/(DOMAIN_SIZE/2)),
                        "y": (DOMAIN_MAP_SIZE/2) * (properties.position.y/(DOMAIN_SIZE/2)),
                        "z": (DOMAIN_MAP_SIZE/2) * (properties.position.z/(DOMAIN_SIZE/2))
                    },
                    "localRotation": properties.rotation,
                    "color": color,
                    "alpha": 1,
                    "canCastShadow": false,
                    "collisionless": true,
                    "primitiveMode": "lines"
                }, "local");
                makeUnlit(id);

                var lineHight = DOMAIN_MAP_SIZE * (getTheLargestAxisDimension(properties.dimensions)/DOMAIN_SIZE) * 0.2;
                if (lineHight > 0.08) {
                    lineHight = 0.08;
                }
                if (lineHight < 0.01) {
                    lineHight = 0.01;
                }
                
                margins = (0.09 - lineHight)/2;
                id = Entities.addEntity({
                    "name": "Zone Name - " + properties.name,
                    "type": "Text",
                    "parentID": domainMapID,
                    "grab": {"grabbable": false },
                    "dimensions": {"x": 4, "y": 0.1, "z": 0.01},
                    "localPosition": {
                        "x": (DOMAIN_MAP_SIZE/2) * (properties.position.x/(DOMAIN_SIZE/2)),
                        "y": ((DOMAIN_MAP_SIZE/2) * (properties.position.y/(DOMAIN_SIZE/2))) + ((DOMAIN_MAP_SIZE * (properties.dimensions.y/DOMAIN_SIZE))/2) + lineHight,
                        "z": (DOMAIN_MAP_SIZE/2) * (properties.position.z/(DOMAIN_SIZE/2))
                    },
                    "text": properties.name,
                    "lineHeight": lineHight,
                    "textColor": color,
                    "textAlpha": 0.8,
                    "backgroundAlpha": 0,
                    "topMargin": margins,
                    "bottomMargin": margins,
                    "unlit": true,
                    "alignment": "center",
                    "billboardMode": "full",
                    "canCastShadow": false,
                    "collisionless": true
                }, "local");
            }
        }

        var avatarIDs = AvatarManager.getAvatarsInRange({"x": 0, "y": 0, "z": 0}, FULL_DOMAIN_SCAN_RADIUS);
        if (avatarIDs.length > 0) {
            var avatarColor, avatarName;
            for (i = 0; i < avatarIDs.length; i++) {
                properties = AvatarManager.getAvatar(avatarIDs[i]);
                avatarColor = {"red": 0, "green": 128, "blue": 255};
                avatarName = properties.sessionDisplayName;
                if (properties.sessionUUID === MyAvatar.sessionUUID) {
                    avatarName = "YOU";
                    avatarColor = {"red": 255, "green": 32, "blue": 0};
                }
                
                id = Entities.addEntity({
                    "name": "AVATAR - " + avatarName,
                    "type": "Shape",
                    "parentID": domainMapID,
                    "shape": "Sphere",
                    "grab": {"grabbable": false },
                    "dimensions": {"x": 0.003, "y": 0.003, "z": 0.003},
                    "localPosition": {
                        "x": (DOMAIN_MAP_SIZE/2) * (properties.position.x/(DOMAIN_SIZE/2)),
                        "y": (DOMAIN_MAP_SIZE/2) * (properties.position.y/(DOMAIN_SIZE/2)),
                        "z": (DOMAIN_MAP_SIZE/2) * (properties.position.z/(DOMAIN_SIZE/2))
                    },
                    "color": avatarColor,
                    "alpha": 0.8,
                    "canCastShadow": false,
                    "collisionless": true,
                    "primitiveMode": "solid"
                }, "local");
                makeUnlit(id);
                
                lineHight = 0.006;
                margins = 0;
                id = Entities.addEntity({
                    "name": "Avatar Name - " + avatarName,
                    "type": "Text",
                    "parentID": domainMapID,
                    "grab": {"grabbable": false },
                    "dimensions": {"x": 4, "y": 0.01, "z": 0.01},
                    "localPosition": {
                        "x": (DOMAIN_MAP_SIZE/2) * (properties.position.x/(DOMAIN_SIZE/2)), 
                        "y": ((DOMAIN_MAP_SIZE/2) * (properties.position.y/(DOMAIN_SIZE/2))) + lineHight, 
                        "z": (DOMAIN_MAP_SIZE/2) * (properties.position.z/(DOMAIN_SIZE/2)) 
                    },
                    "text": avatarName,
                    "lineHeight": lineHight,
                    "textColor": avatarColor,
                    "textAlpha": 0.8,
                    "backgroundAlpha": 0,
                    "topMargin": margins,
                    "bottomMargin": margins,
                    "unlit": true,
                    "alignment": "center",
                    "billboardMode": "full",
                    "canCastShadow": false,
                    "collisionless": true
                }, "local");
                
            }
        }
    }

    function getTheLargestAxisDimension(dimensions) {
        var largest = dimensions.x;
        if (dimensions.y > largest) { largest = dimensions.y; }
        if (dimensions.z > largest) { largest = dimensions.z; }
        return largest;
    }

    function getColorFromID(id) {
        var score = getStringScore(id);
        var hue = (score % 360) / 360;
        var coloration = hslToRgb(hue, 1, 0.6);
        return {"red": coloration[0], "green": coloration[1], "blue": coloration[2]};
    }

    function getStringScore(str) {
        var score = 0;
        for (var j = 0; j < str.length; j++){
            score += str.charCodeAt(j);
        }
        return score;
    }

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

    function clearDomainMap() {
        if (domainMapID !== Uuid.NULL) {
            Entities.deleteEntity(domainMapID);
            domainMapID = Uuid.NULL;
        }
    }

    button.clicked.connect(clicked);

    function cleanup() {

        if (appStatus) {
            clearDomainMap();
            Script.update.disconnect(myTimer);
        }
        
        tablet.removeButton(button);
    }

    Script.scriptEnding.connect(cleanup);
}());
