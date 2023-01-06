(function() {
    "use strict";

    function sanitize(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

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

    function scriptToWebInventory(data) {
        document.getElementById("app").innerHTML = createFolderDiv("Inventory", data);
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

    const ready = JSON.stringify({app:"inventory",command:"ready",data:""});
    EventBridge.emitWebEvent(ready);
}());
