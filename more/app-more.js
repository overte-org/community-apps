//  app-more.js
//  VERSION 1.0
//
//  Created by Keb Helion, February 2020.
//  Copyright "Project Athena" 2020. 
//
//  This script adds a "More Apps" selector to "Project Athena" to allow the user to add optional functionalities to the tablet.
//  This application has been designed to work directly from the Github repository.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//	
(function() {
	var ROOT = Script.resolvePath('').split("app-more.js")[0];
	var APP_NAME = "MORE...";
	var APP_URL = ROOT + "more.html";
	var APP_ICON_INACTIVE = ROOT + "appicon_i.png";
	var APP_ICON_ACTIVE = ROOT + "appicon_a.png";
	var Appstatus = false;

	
	var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
	var button = tablet.addButton({
		text: APP_NAME,
		icon: APP_ICON_INACTIVE,
        activeIcon: APP_ICON_ACTIVE
	});
	
	
	function clicked(){
		if (Appstatus == true){
			//print("turn off");			
			tablet.webEventReceived.disconnect(onMoreAppWebEventReceived);
			tablet.gotoHomeScreen();
			tablet.screenChanged.disconnect(onMoreAppScreenChanged);
		}else{
			//print("turn on");

			
			tablet.gotoWebScreen(APP_URL); //+ "?version=" + Math.floor(Math.random()*50000));
			
			tablet.webEventReceived.connect(onMoreAppWebEventReceived);
			tablet.screenChanged.connect(onMoreAppScreenChanged);
			/*	
			Script.setTimeout(function() {
				sendRunningScriptList();
			}, 2000);
			*/
			
			
			
			
		}
			
		Appstatus = !Appstatus;
		button.editProperties({
			isActive: Appstatus
		});

	}
	
	button.clicked.connect(clicked);

	function sendRunningScriptList(){
		var currentlyRunningScripts = ScriptDiscoveryService.getRunning();
		tablet.emitScriptEvent(currentlyRunningScripts);
	}

	
	function onMoreAppWebEventReceived(eventz){
		
		if(typeof eventz === "string"){
			eventzget = JSON.parse(eventz);
			
			print("EVENT ACTION: " + eventzget.action);
			print("EVENT SCRIPT: " + eventzget.script);
			
			if(eventzget.action === "installScript"){
				ScriptDiscoveryService.loadOneScript(eventzget.script);
				sendRunningScriptList();
			}

			if(eventzget.action === "uninstallScript"){
				ScriptDiscoveryService.stopScript(eventzget.script, false);
				sendRunningScriptList();
			}			

			if(eventzget.action === "requestRunningScriptData"){
				sendRunningScriptList();
			}	

		}
		
	}


	function onMoreAppScreenChanged(type, url) {
        if ((type === "Web")) {
			Appstatus = true;
        }else{ 
			Appstatus = false;
			button.editProperties({
				isActive: Appstatus
			});
			tablet.webEventReceived.disconnect(onMoreAppWebEventReceived);
			tablet.screenChanged.disconnect(onMoreAppScreenChanged);
        }
    }

	
	tablet.webEventReceived.connect(onMoreAppWebEventReceived);
	
	
	function cleanup() {
		tablet.webEventReceived.disconnect(onMoreAppWebEventReceived);
		tablet.removeButton(button);
	}
	
	Script.scriptEnding.connect(cleanup);
}());