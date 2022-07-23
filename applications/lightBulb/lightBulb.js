"use strict";
//
//  lightBulb.js
//
//  Created by Alezia Kurdis, July 14th, 2021.
//  Copyright 2022 Overte e.V.
//
//  Turn a shape to a light bulb.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function(){ 

    var ROOT = Script.resolvePath('').split("lightBulb.js")[0];
    var DEG_TO_RAD = Math.PI/180;
    var lightID = Uuid.NULL;
    var materialID = Uuid.NULL;
    
    this.preload = function(entityID) {

        var properties = Entities.getEntityProperties(entityID, ["renderWithZones", "color", "userData"]);
        var renderWithZones = properties.renderWithZones;
        var color = properties.color;
        var userData = JSON.parse(properties.userData);
        
        var lightIntensity = userData.lightIntensity ? userData.lightIntensity : 5;
        var lightSpotCutOff = userData.lightSpotCutOff ? userData.lightSpotCutOff : 30;
        var lightRange = userData.lightRange ? userData.lightRange : 10;
        

        
        lightID = Entities.addEntity({
            "parentID": entityID,
            "renderWithZones": renderWithZones,
            "locked": false,
            "localPosition": {"x": 0.0, "y": 0.0, "z": 0.0},
            "localRotation": {
                "x": -0.7071,
                "y": 0.0,
                "z": 0.0,
                "w": 0.7071
            },
            "name": "bulb-light",
            "grab": {
                "grabbable": false
            },
            "type": "Light",
            "dimensions": {
                "x": lightRange * 2,
                "y": lightRange * 2,
                "z": lightRange * 2
            },
            "color": color,
            "intensity": lightIntensity,
            "falloffRadius": 1,
            "isSpotlight": true,
            "visible": true,
            "exponent": 1,
            "cutoff": lightSpotCutOff
        },"local");

        var sumColorCompnent = (color.red/255) +(color.green/255) +(color.blue/255);
        if (sumColorCompnent === 0) { 
            sumColorCompnent = 0.001; 
        }
        var bloomFactor = 9 / sumColorCompnent;

        var materialContent = {
            "materialVersion": 1,
            "materials": [
                    {
                        "name": "bulb",
                        "albedo": [1, 1, 1],
                        "metallic": 1,
                        "roughness": 1,
                        "opacity": 1,
                        "emissive": [(color.red/255) * bloomFactor, (color.green/255) * bloomFactor, (color.blue/255) * bloomFactor],
                        "scattering": 0,
                        "unlit": false,
                        "cullFaceMode": "CULL_NONE",
                        "model": "hifi_pbr"
                    }
                ]
            };
        
        materialID = Entities.addEntity({
            "type": "Material",
            "parentID": entityID,
            "renderWithZones": renderWithZones,
            "locked": false,
            "localPosition": {"x": 0.0, "y": 0.2, "z": 0.0},
            "name": "bulb-material",
            "materialURL": "materialData",
            "priority": 1,
            "materialData": JSON.stringify(materialContent)
        },"local");

    };    

    this.unload = function(entityID) {
        //Termination proces
        if (lightID !== Uuid.NULL) {
            Entities.deleteEntity(lightID);
        }
        if (materialID !== Uuid.NULL) {
            Entities.deleteEntity(materialID);
        }        
    };  

})
