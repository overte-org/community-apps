// SPDX-License-Identifier: CC0-1.0
// Blendshape Buddy, written by Ada <ada@thingvellir.net> 2025
(() => {
	"use strict";

	const AppUi = Script.require("appUi");
	let tablet;
	let ui;

	function A_Init() {
		tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
		ui = new AppUi({
			buttonName: "FLEX",
			home: Script.resolvePath("blendshape_buddy.html"),
			graphicsDirectory: Script.resolvePath("./"),
		});

		MyAvatar.hasScriptedBlendshapes = true;
	}

	function A_UIEvent(event) {
		event = JSON.parse(event);
		
		switch (event.flex) {
			case "Smile":
				MyAvatar.setBlendshape("MouthSmile_L", event.value);
				MyAvatar.setBlendshape("MouthSmile_R", event.value);
				break;
			
			case "Frown":
				MyAvatar.setBlendshape("MouthFrown_L", event.value);
				MyAvatar.setBlendshape("MouthFrown_R", event.value);
				break;
			
			case "Blink":
				MyAvatar.setBlendshape("EyeBlink_L", event.value);
				MyAvatar.setBlendshape("EyeBlink_R", event.value);
				MyAvatar.hasProceduralBlinkFaceMovement = !(event.value > 0.01);
				break;

			default:
				MyAvatar.setBlendshape(event.flex, event.value);
				break;
		}
	}

	A_Init();
	tablet.webEventReceived.connect(A_UIEvent);
})();
