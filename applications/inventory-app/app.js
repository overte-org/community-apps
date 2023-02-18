"use strict";

function sendEvent(command, data) {
    EventBridge.emitWebEvent(JSON.stringify({app:"inventory",command:command,data:data}));
}

function folderSorter(a, b) {
    var aIsFolder = ("items" in a);
    var bIsFolder = ("items" in b);
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    return a["name"].localeCompare(b["name"]);
}

var inventory = [];
var inbox = [];

function newItem(folder, name, type, url) {
    folder.push({name:name,type:type,url:url});
    folder.sort(folderSorter);
    sendEvent("web-to-script-inventory", inventory);
    refreshInventoryView();
}

function newFolder(folder, name) {
    folder.push({name:name,items:[]});
    folder.sort(folderSorter);
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

function hideAlert() {
    document.getElementById("alert-overlay").style.display = "none";
    document.getElementById("alert-message").innerHTML = "";
}

function showAlert(text) {
    document.getElementById("alert-message").appendChild(document.createTextNode(text));
    document.getElementById("alert-overlay").style.display = "block";
}

function hideConfirm() {
    document.getElementById("confirm-overlay").style.display = "none";
    document.getElementById("confirm-button").onclick = function(){};
}

function showConfirm(text, func) {
    document.getElementById("confirm-prompt").innerHTML = text;
    document.getElementById("confirm-button").onclick = func;
    document.getElementById("confirm-overlay").style.display = "block";
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
                    showAlert("Item or folder with name " + name + " already exists!");
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
    document.getElementById("new-item-prompt").innerHTML = "Create new item";
    document.getElementById("new-item-button").innerHTML = "Create";
    document.getElementById("new-item-button").onclick = function() {
        const name = document.getElementById("new-item-name").value;
        if (name !== "") {
            for (var item = 0; item < currentFolder.length; item++) {
                if (currentFolder[item]["name"] === name) {
                    showAlert("Item or folder with name " + name + " already exists!");
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

function showEditItem(currentFolder, item) {
    document.getElementById("new-item-prompt").innerHTML = "Edit item";
    document.getElementById("new-item-button").innerHTML = "Save";
    document.getElementById("new-item-name").value = item["name"];
    document.getElementById("new-item-url").value = item["url"];
    const typeList = document.getElementById("new-item-type");
    typeList.selectedIndex = typeList.options.length - 1;
    for (var type = 0; type < typeList.options.length; type++) {
        if (item["type"] === typeList.options[type].text) {
            typeList.selectedIndex = type;
            break;
        }
    }
    document.getElementById("new-item-button").onclick = function() {
        const name = document.getElementById("new-item-name").value;
        if (name !== "") {
            if (name !== item["name"]) {
                for (var i = 0; i < currentFolder.length; i++) {
                    if (currentFolder[i]["name"] === name) {
                        showAlert("Item or folder with name " + name + " already exists!");
                        return;
                    }
                }
            }
            const type = typeList.options[typeList.selectedIndex].text;
            const url = document.getElementById("new-item-url").value
            hideNewItem();
            removeItemOrFolder(currentFolder, item["name"]);
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
    child.appendChild(document.createTextNode(itemData["name"]));
    div.appendChild(child);
    child = document.createElement("p");
    child.appendChild(document.createTextNode(itemData["type"]));
    div.appendChild(child);
    child = document.createElement("p");
    child.appendChild(document.createTextNode(itemData["url"]));
    div.appendChild(child);
    child = document.createElement("button");
    child.appendChild(document.createTextNode("use"));
    child.onclick = function() {sendEvent("use-item", itemData);};
    div.appendChild(child);
    child = document.createElement("button");
    child.appendChild(document.createTextNode("edit"));
    child.onclick = function() {showEditItem(folder, itemData);};
    div.appendChild(child);
    child = document.createElement("button");
    child.appendChild(document.createTextNode("delete"));
    child.onclick = function() {
        showConfirm("Delete item " + itemData["name"] + "?", function() {
            removeItemOrFolder(folder, itemData["name"]);
            hideConfirm();
        });
    };
    div.appendChild(child);
    return div;
}

function createFolderDiv(name, itemList, parentFolder) {
    const div = document.createElement("div");
    div.className = "folder";
    const contents = document.createElement("div");
    contents.style.display = "none";
    const p = document.createElement("p");
    p.appendChild(document.createTextNode(name));
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

function deleteInboxItem(index) {
    for (var itemToShift = index + 1; itemToShift < inbox.length; itemToShift++) {
        inbox[itemToShift - 1] = inbox[itemToShift];
    }
    inbox.pop();
    sendEvent("web-to-script-update-receiving-item-queue", inbox);
    refreshInboxView();
    return;
}

function createInboxItem(index) {
    const item = inbox[index];
    const data = item["data"];
    const div = document.createElement("div");
    div.className = "item";
    child = document.createElement("p");
    child.appendChild(document.createTextNode("from " + item["senderName"] + " " + item["senderUUID"]));
    div.appendChild(child);
    var child = document.createElement("p");
    child.appendChild(document.createTextNode(data["name"]));
    div.appendChild(child);
    child = document.createElement("p");
    child.appendChild(document.createTextNode(data["type"]));
    div.appendChild(child);
    child = document.createElement("p");
    child.appendChild(document.createTextNode(data["url"]));
    div.appendChild(child);
    child = document.createElement("button");
    child.appendChild(document.createTextNode("accept"));
    child.onclick = function() {showAlert("TODO");};
    div.appendChild(child);
    child = document.createElement("button");
    child.appendChild(document.createTextNode("delete"));
    child.onclick = function() {
        showConfirm("delete inbox item " + data["name"] + "?", function() {
            deleteInboxItem(index);
            hideConfirm();
        });
    };
    div.appendChild(child);
    return div;
}

function refreshInboxView() {
    const inboxDiv = document.getElementById("inbox");
    inboxDiv.innerHTML = "";
    if (inbox.length > 0) {
        const contents = document.createElement("div");
        contents.style.display = "none";
        var child = document.createElement("p");
        child.appendChild(document.createTextNode(inbox.length + " item(s) in inbox"));
        inboxDiv.appendChild(child);
        child = document.createElement("button");
        child.appendChild(document.createTextNode("show/hide"));
        child.onclick = function() {
            contents.style.display = contents.style.display === "block" ? "none" : "block";
        };
        inboxDiv.appendChild(child);
        for (var index = 0; index < inbox.length; index++) {
            contents.appendChild(createInboxItem(index));
        }
        inboxDiv.appendChild(contents);
    }
}

EventBridge.scriptEventReceived.connect(function(message) {
    const parsed_message = JSON.parse(message);
    if (parsed_message["app"] === "inventory") {
        switch (parsed_message["command"]) {
            case "script-to-web-inventory":
                inventory = parsed_message["data"];
                refreshInventoryView();
                break;
            case "script-to-web-receiving-item-queue":
                inbox = parsed_message["data"];
                refreshInboxView();
                break;
            //default:
                //alert(message);
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
