(function() {
    "use strict";

    function sanitize(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function sendEvent(command, data) {
        EventBridge.emitWebEvent(JSON.stringify({app:"inventory",command:command,data:data}));
    }

    var inventory = [];

    function createItemDiv(itemData) {
        return '<div class="item">'
        + "<p>" + sanitize(itemData["name"]) + "</p>"
        + "<p>" + sanitize(itemData["type"]) + "</p>"
        + "<p>" + sanitize(itemData["url"]) + "</p>"
        + "</div>";
    }

    function createFolderDiv(name, itemList) {
        var html = '<div class="folder"><p>' + sanitize(name) + "</p>";
        for (var i = 0; i < itemList.length; i++) {
            if ("items" in itemList[i]) {
                html += createFolderDiv(itemList[i]["name"], itemList[i]["items"]);
            } else {
                html += createItemDiv(itemList[i]);
            }
        }
        html += "</div>";
        return html;
    }

    function refreshInventoryView() {
        document.getElementById("app").innerHTML = createFolderDiv("Inventory", inventory);
    }

    function newItem(name, type, url, folderPath) {
        var currentFolder = inventory;
        depthLoop:
        for (var depth = 0; depth < folderPath.length; depth++) {
            for (var subfolder = 0; subfolder < currentFolder.length; subfolder++) {
                if (currentFolder[subfolder]["name"] === folderPath[depth] && "items" in currentFolder[subfolder]) {
                    currentFolder = currentFolder[subfolder]["items"];
                    continue depthLoop;
                }
            }
            alert("folder not found!");
            return;
        }
        for (var folderItem = 0; folderItem < currentFolder.length; i++) {
            if (currentFolder[folderItem]["name"] === name) {
                alert("item with this name already exists!");
                return;
            }
        }
        currentFolder.push({name:name,type:type,url:url});
        sendEvent("web-to-script-inventory", inventory);
        refreshInventoryView();
    }

    function newFolder(path) {
        var currentFolder = inventory;
        depthLoop:
        for (var depth = 0; depth < path.length; depth++) {
            for (var subfolder = 0; subfolder < currentFolder.length; subfolder++) {
                if (currentFolder[subfolder]["name"] === path[depth]) {
                    if ("items" in currentFolder[subfolder]) {
                        currentFolder = currentFolder[subfolder]["items"];
                        continue depthLoop;
                    } else {
                        alert("item with desired folder name already exists!");
                        return;
                    }
                }
            }
            // folder not found in inner loop, make new one
            currentFolder.push({name:path[depth],items:[]});
            currentFolder = currentFolder[currentFolder.length - 1]["items"];
        }
        sendEvent("web-to-script-inventory", inventory);
        refreshInventoryView();
    }

    function scriptToWebInventory(data) {
        inventory = data;
        refreshInventoryView();
        //newItem("cool test item", "UNKNOWN", "https://example.social/yourface.jpg", ["recursiontest", "recursion2", "recursion3"]);
        //newFolder(["recursiontest", "recursion2", "recursion3.1", "recursion4"]);
        //newFolder(["new folder"]);
    }

    EventBridge.scriptEventReceived.connect(function(message) {
        const parsed_message = JSON.parse(message);
        if (parsed_message["app"] === "inventory") {
            switch (parsed_message["command"]) {
                case "script-to-web-inventory":
                    scriptToWebInventory(parsed_message["data"]);
                    break;
                default:
                    alert(message);
            }
        }
    });

    sendEvent("ready", "");
}());
