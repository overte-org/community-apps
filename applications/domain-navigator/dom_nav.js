//  dom_nav.js
//
//  Created by Alezia Kurdis, July 2018
//
//  This tool is to help teleporting yourself rapidly where you need in a domain in a couple of clicks, 
//  without having to enter numbers in a path. Ideal for those who are working on large landscapes. 
//  Precision: 80 meters.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
(function() {
	var MainPath = Script.resolvePath('').split("dom_nav.js")[0];
	var APP_NAME = "DOM NAV";
	var APP_URL = MainPath + "dom_nav.html";
	var APP_ICON_INACTIVE = MainPath + "dom_nav_icon_i.png";
	var APP_ICON_ACTIVE = MainPath + "dom_nav_icon_a.png";
	var statusApp = false;
	
	var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
	tablet.screenChanged.connect(onScreenChanged);
	var button = tablet.addButton({
		text: APP_NAME,
		icon: APP_ICON_INACTIVE,
		activeIcon: APP_ICON_ACTIVE
	});
	
	
	function clicked(){
		if (statusApp == true){
		
			tablet.webEventReceived.disconnect(onWebEventReceivedz);
			tablet.gotoHomeScreen();
			statusApp = false;
		}else{

			var AvatarPosition = MyAvatar.position;
			tablet.gotoWebScreen(APP_URL + "?x=" + Math.round(AvatarPosition.x) + "&y=" + Math.round(AvatarPosition.y) + "&z=" + Math.round(AvatarPosition.z));		
			tablet.webEventReceived.connect(onWebEventReceivedz);		
			statusApp = true;
		}
			

		button.editProperties({
			isActive: statusApp
		});

	}	
	
	
	button.clicked.connect(clicked);
	
	function onWebEventReceivedz(eventz){

		if(typeof eventz === "string"){
			var eventzget = JSON.parse(eventz);
		
	
			if(eventzget.type === "give_tp_coor"){
				
				var myVec = {
					x: parseFloat(eventzget.x),
					y: parseFloat(eventzget.y),
					z: parseFloat(eventzget.z)
				};
				
				MyAvatar.goToLocation(myVec, false);
				
			}
			
			if(eventzget.type === "look_to_north"){
				//print("Look at North!")
				
				MyAvatar.goToLocation(MyAvatar.position, true,{ x: 0, y: 0, z: 0, w:1 },false);
			}

			if(eventzget.type === "look_to_south"){
				//print("Look at South!")
				MyAvatar.goToLocation(MyAvatar.position, true,{ x: 0, y: 1, z: 0, w:0 },false);
			}
			
			if(eventzget.type === "look_to_west"){
				//print("Look at West!")
				MyAvatar.goToLocation(MyAvatar.position, true,{ x: 0, y: 0.7071068, z: 0, w:0.7071068 },false);
			}

			if(eventzget.type === "look_to_east"){
				//print("Look at East!")
				MyAvatar.goToLocation(MyAvatar.position, true,{ x: 0, y: 0.7071068, z: 0, w:-0.7071068 },false);
			}			
			
		}
		
	}
	
	tablet.webEventReceived.connect(onWebEventReceivedz);
	
	function onScreenChanged(type, url) {
		if (type == "Web" && url.indexOf(APP_URL) != -1){
			statusApp = true;
		}else{
			statusApp = false;
		}
		
		button.editProperties({
			isActive: statusApp
		});
	}
	
	
	function cleanup() {
		tablet.webEventReceived.disconnect(onWebEventReceivedz);
		tablet.screenChanged.disconnect(onScreenChanged);
		tablet.removeButton(button);
	}
	
	Script.scriptEnding.connect(cleanup);
}());