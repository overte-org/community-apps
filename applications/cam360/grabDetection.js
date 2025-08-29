"use strict";
//
//  grabDetection.js
//
//  Created by Alezia Kurdis on August 26th, 2022
//  Copyright 2022-2025 Overte e.V.
//
//  Distributed under the Apache License, Version 2.0
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function(){

    //var _this;

    var DetectGrabbed = function() { 
         //_this = this;
    };

    DetectGrabbed.prototype = {
        setRightHand: function () {
            //print("I am being held in a right hand... entity:" + this.entityID);
        },
        setLeftHand: function () {
            //print("I am being held in a left hand... entity:" + this.entityID);
        },
        startDistantGrab: function () {
            //print("I am being distance held... entity:" + this.entityID);
        },
        continueDistantGrab: function () {
            //print("I continue to be distance held... entity:" + this.entityID);
        },
        startNearGrab: function () {
            //print("I was just grabbed... entity:" + this.entityID);
        },
        continueNearGrab: function () {
            //print("I am still being grabbed... entity:" + this.entityID);
        },

        releaseGrab: function () {
            //print("I was released... entity:" + this.entityID);
            var ownerID = Entities.getEntityProperties( this.entityID, ["owningAvatarID"] ).owningAvatarID;
            if ( ownerID === MyAvatar.sessionUUID) {
                Entities.editEntity(this.entityID, {"description": "RELEASED"});
            }
        },

        preload: function(entityID) {
            this.entityID = entityID;
        },
    };

    return new DetectGrabbed();
})
