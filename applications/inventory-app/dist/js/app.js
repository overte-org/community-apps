"use strict";

function sanitize(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sendEvent(command, data) {
    EventBridge.emitWebEvent(JSON.stringify({app:"inventory",command:command,data:data}));
}

var inventory = [];

function newItem(folder, name, type, url) {
    folder.push({name:name,type:type,url:url});
    sendEvent("web-to-script-inventory", inventory);
    refreshInventoryView();
}

function newFolder(folder, name) {
    folder.push({name:name,items:[]});
    sendEvent("web-to-script-inventory", inventory);
    refreshInventoryView();
}

function removeItemOrFolder(folder, name) {
    for (var folderItem = 0; folderItem < folder.length; folderItem++) {
        if (folder[folderItem]["name"] === name) {
            for (var itemToShift = folderItem + 1; itemToShift < folder.length; itemToShift++) {
                folder[itemToShift - 1] = folder[itemToShift];
            }
            folder.pop();
            sendEvent("web-to-script-inventory", inventory);
            refreshInventoryView();
            return;
        }
    }
}

function hideDeleteConfirm() {
    document.getElementById("delete-overlay").style.display = "none";
    document.getElementById("delete-button").onclick = function(){};
}

function showDeleteConfirm(folder, name) {
    document.getElementById("delete-button").onclick = function() {
        removeItemOrFolder(folder, name);
        hideDeleteConfirm();
    };
    document.getElementById("delete-overlay").style.display = "block";
}

function hideNewFolder() {
    document.getElementById("new-folder-overlay").style.display = "none";
    document.getElementById("new-folder-button").onclick = function(){};
    document.getElementById("new-folder-name").value = "";
}

function showNewFolder(currentFolder) {
    document.getElementById("new-folder-button").onclick = function() {
        const name = document.getElementById("new-folder-name").value;
        if (name !== "") {
            for (var item = 0; item < currentFolder.length; item++) {
                if (currentFolder[item]["name"] === name) {
                    return;
                }
            }
            hideNewFolder();
            newFolder(currentFolder, name);
        }
    };
    document.getElementById("new-folder-overlay").style.display = "block";
    document.getElementById("new-folder-name").focus();
}

function hideNewItem() {
    document.getElementById("new-item-overlay").style.display = "none";
    document.getElementById("new-item-button").onclick = function(){};
    document.getElementById("new-item-name").value = "";
    document.getElementById("new-item-url").value = "";
    document.getElementById("new-item-type").selectedIndex = 0;
}

function showNewItem(currentFolder) {
    document.getElementById("new-item-button").onclick = function() {
        const name = document.getElementById("new-item-name").value;
        if (name !== "") {
            for (var item = 0; item < currentFolder.length; item++) {
                if (currentFolder[item]["name"] === name) {
                    return;
                }
            }
            const typeList = document.getElementById("new-item-type");
            const type = typeList.options[typeList.selectedIndex].text;
            const url = document.getElementById("new-item-url").value
            hideNewItem();
            newItem(currentFolder, name, type, url);
        }
    };
    document.getElementById("new-item-overlay").style.display = "block";
    document.getElementById("new-item-name").focus();
}

function createItemDiv(itemData, folder) {
    const div = document.createElement("div");
    div.className = "item";
    var child = document.createElement("p");
    child.appendChild(document.createTextNode(sanitize(itemData["name"])));
    div.appendChild(child);
    child = document.createElement("p");
    child.appendChild(document.createTextNode(sanitize(itemData["type"])));
    div.appendChild(child);
    child = document.createElement("p");
    child.appendChild(document.createTextNode(sanitize(itemData["url"])));
    div.appendChild(child);
    child = document.createElement("button");
    child.appendChild(document.createTextNode("use"));
    child.onclick = function() {sendEvent("use-item", itemData);};
    div.appendChild(child);
    child = document.createElement("button");
    child.appendChild(document.createTextNode("delete"));
    child.onclick = function() {showDeleteConfirm(folder, itemData["name"]);};
    div.appendChild(child);
    return div;
}

function createFolderDiv(name, itemList, parentFolder) {
    const div = document.createElement("div");
    div.className = "folder";
    const contents = document.createElement("div");
    contents.style.display = "block";
    const p = document.createElement("p");
    p.appendChild(document.createTextNode(sanitize(name)));
    p.onclick = function() {
        contents.style.display = contents.style.display === "block" ? "none" : "block";
    };
    div.appendChild(p);
    var child = document.createElement("button");
    child.appendChild(document.createTextNode("new folder"));
    child.onclick = function(){showNewFolder(itemList)};
    contents.appendChild(child);
    child = document.createElement("button");
    child.appendChild(document.createTextNode("new item"));
    child.onclick = function(){showNewItem(itemList)};
    contents.appendChild(child);
    child = document.createElement("button");
    child.appendChild(document.createTextNode("delete"));
    child.onclick = function() {showDeleteConfirm(parentFolder, name);};
    contents.appendChild(child);
    for (var i = 0; i < itemList.length; i++) {
        if ("items" in itemList[i]) {
            contents.appendChild(createFolderDiv(itemList[i]["name"], itemList[i]["items"], itemList));
        } else {
            contents.appendChild(createItemDiv(itemList[i], itemList));
        }
    }
    div.appendChild(contents);
    return div;
}

function refreshInventoryView() {
    const view = document.getElementById("view");
    view.innerHTML = "";
    var child = document.createElement("button");
    child.appendChild(document.createTextNode("new folder"));
    child.onclick = function(){showNewFolder(inventory)};
    view.appendChild(child);
    child = document.createElement("button");
    child.appendChild(document.createTextNode("new item"));
    child.onclick = function(){showNewItem(inventory)};
    view.appendChild(child);
    for (var i = 0; i < inventory.length; i++) {
        if ("items" in inventory[i]) {
            view.appendChild(createFolderDiv(inventory[i]["name"], inventory[i]["items"], inventory));
        } else {
            view.appendChild(createItemDiv(inventory[i], inventory));
        }
    }
}

function scriptToWebInventory(data) {
    inventory = data;
    refreshInventoryView();
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

window.onscroll = function() {
    // have the dialog boxes follow the view point instead of staying up top always
    const overlays = document.getElementsByClassName("overlay");
    const scrollAmount = window.pageYOffset + "px";
    for (var i = 0; i < overlays.length; i++) {
        const style = overlays[i].style;
        style.top = scrollAmount;
        style.bottom = "-" + scrollAmount;
    }
};

window.onload = function() {sendEvent("ready", {});}
