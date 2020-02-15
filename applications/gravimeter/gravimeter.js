"use strict";

//  gravimeter.js
//
//  By Alezia Kurdis, June 2019.
//
//  This application returns the orientation and the position of your avatar. 
// 	This data becomes very helpful when you want to build on a sphere with a radial gravity
//  where it is difficult to evaluate the perpendicularity of the floor.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//	
(function() {
	
	var MainPath = Script.resolvePath('').split("gravimeter.js")[0];
	var APP_NAME = "GRAVITY";
	var APP_URL = MainPath + "gravimeter.html";
	var APP_ICON = MainPath + "gravimeter_icon.png";

	
	var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
	var button = tablet.addButton({
		text: APP_NAME,
		icon: APP_ICON
	});
	
	var ProcessInterval;
	
	function clicked(){
		displayData();
		

		
	}
	button.clicked.connect(clicked);
	
	function displayData(){
		var AvatarPosition = MyAvatar.position;

		var grav = Quat.safeEulerAngles(MyAvatar.orientation);
		
		
		tablet.gotoWebScreen(APP_URL + "?px=" + Math.round(AvatarPosition.x) + "&py=" + Math.round(AvatarPosition.y) + "&pz=" + Math.round(AvatarPosition.z) + "&rx=" + (Math.round(grav.x * 100)/100) + "&ry=" + (Math.round(grav.y * 100)/100) + "&rz=" + (Math.round(grav.z * 100)/100));
		
	}
	

	
	function cleanup() {
		tablet.removeButton(button);
	}
	
	Script.scriptEnding.connect(cleanup);
}());