/* globals Vec3, Quat, Uuid, Camera, MyAvatar, Entities, Overlays, Script, Tablet, AvatarList, AvatarManager, Picks, PickType require ScriptDiscoveryService */
//
//  refreshApp.js
//
//  Created by KasenVR on 30 May 2020.
//  Copyright 2020 Vircadia contributors.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

    var APP_NAME = "Refresh App";
    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
      
    var accountConvertIcon = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="white" d="M12 0L11.34 .03L15.15 3.84L16.5 2.5C19.75 4.07 22.09 7.24 22.45 11H23.95C23.44 4.84 18.29 0 12 0M12 4C10.07 4 8.5 5.57 8.5 7.5C8.5 9.43 10.07 11 12 11C13.93 11 15.5 9.43 15.5 7.5C15.5 5.57 13.93 4 12 4M.05 13C.56 19.16 5.71 24 12 24L12.66 23.97L8.85 20.16L7.5 21.5C4.25 19.94 1.91 16.76 1.55 13H.05M12 13C8.13 13 5 14.57 5 16.5V18H19V16.5C19 14.57 15.87 13 12 13Z" /></svg>';
    
    var refreshIcon = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="white" d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" /></svg>';
      
    var button = tablet.addButton({
        text: "REFRESH<br/>AVATAR",
        icon: accountConvertIcon,
    });

    var button1 = tablet.addButton({
        text: "REFRESH<br/>ATTACH",
        icon: refreshIcon,
    });  

    Script.scriptEnding.connect(function(){
        tablet.removeButton(button);
        tablet.removeButton(button1);
        button = null;
        button1 = null;
    });

    // 
    button.clicked.connect(refreshAvatar);
    function refreshAvatar() {
        var modelURL = MyAvatar.getFullAvatarURLFromPreferences();
        modelURL = modelURL.split("?")[0] + "?" + new Date().getTime();
        MyAvatar.useFullAvatarURL(modelURL);
        console.info('Avatar refreshed!', modelURL);
    }

    button1.clicked.connect(refreshAttachments);
    function refreshAttachments() {
        var data = MyAvatar.getAvatarEntityData(); // everything, including boxes which have no modelURL
        
        for (var id in data) {
            var attachment = data[id];
            if (attachment.type.toString() === 'Model') {
                attachment.modelURL = attachment.modelURL.toString().split('?')[0] + '?' + Date.now();  
                // console.info('Attachment refreshed!', attachment.modelURL);
            }
        }
      
        MyAvatar.setAvatarEntityData(data);
    }
    