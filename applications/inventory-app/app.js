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
var allFolders = [];
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

function removeItemOrFolder(folder, index) {
    for (var itemToShift = index + 1; itemToShift < folder.length; itemToShift++) {
        folder[itemToShift - 1] = folder[itemToShift];
    }
    folder.pop();
    sendEvent("web-to-script-inventory", inventory);
    refreshInventoryView();
    return;
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
    document.getElementById("confirm-prompt").innerHTML = "";
}

function showConfirm(text, func) {
    document.getElementById("confirm-prompt").appendChild(document.createTextNode(text));
    document.getElementById("confirm-button").onclick = func;
    document.getElementById("confirm-overlay").style.display = "block";
}

function hideNewFolder() {
    document.getElementById("new-folder-overlay").style.display = "none";
    document.getElementById("new-folder-button").onclick = function(){};
    document.getElementById("new-folder-name").value = "";
}

function showNewFolder(folder) {
    document.getElementById("new-folder-button").onclick = function() {
        const name = document.getElementById("new-folder-name").value;
        if (name === "") {
            showAlert("Folder requires a name.");
            return;
        }
        if (name.includes("/")) {
            showAlert("Folder name may not include /");
            return;
        }
        for (var item = 0; item < folder.length; item++) {
            if (folder[item]["name"] === name) {
                showAlert("Item or folder with name " + name + " already exists!");
                return;
            }
        }
        hideNewFolder();
        newFolder(folder, name);
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

function showNewItem(folder) {
    document.getElementById("new-item-prompt").innerHTML = "Create new item";
    document.getElementById("new-item-button").innerHTML = "Create";
    document.getElementById("new-item-button").onclick = function() {
        const name = document.getElementById("new-item-name").value;
        if (name === "") {
            showAlert("Item requires a name.");
            return;
        }
        for (var item = 0; item < folder.length; item++) {
            if (folder[item]["name"] === name) {
                showAlert("Item or folder with name " + name + " already exists!");
                return;
            }
        }
        const typeList = document.getElementById("new-item-type");
        const type = typeList.options[typeList.selectedIndex].text;
        const url = document.getElementById("new-item-url").value
        hideNewItem();
        newItem(folder, name, type, url);
    };
    document.getElementById("new-item-overlay").style.display = "block";
    document.getElementById("new-item-name").focus();
}

function showEditItem(folder, index) {
    const item = folder[index];
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
        if (name === "") {
            showAlert("Item requires a name.");
            return;
        }
        if (name !== item["name"]) {
            for (var i = 0; i < folder.length; i++) {
                if (folder[i]["name"] === name) {
                    showAlert("Item or folder with name " + name + " already exists!");
                    return;
                }
            }
        }
        const type = typeList.options[typeList.selectedIndex].text;
        const url = document.getElementById("new-item-url").value
        hideNewItem();
        removeItemOrFolder(folder, index);
        newItem(folder, name, type, url);
    };
    document.getElementById("new-item-overlay").style.display = "block";
    document.getElementById("new-item-name").focus();
}

function hideFolderSelect() {
    document.getElementById("folder-select-overlay").style.display = "none";
    document.getElementById("folder-select-list").selectedIndex = 0;
    document.getElementById("folder-select-prompt").innerHTML = "";
}

function showFolderSelect(text, func) {
    document.getElementById("folder-select-prompt").appendChild(document.createTextNode(text));
    document.getElementById("folder-select-button").onclick = func;
    document.getElementById("folder-select-overlay").style.display = "block";
}

function createItemDiv(folder, index) {
    const item = folder[index];
    const div = document.createElement("div");
    div.className = "item";
    var child = document.createElement("p");
    child.appendChild(document.createTextNode(item["name"]));
    div.appendChild(child);
    child = document.createElement("p");
    child.appendChild(document.createTextNode(item["type"]));
    div.appendChild(child);
    child = document.createElement("p");
    child.appendChild(document.createTextNode(item["url"]));
    div.appendChild(child);
    child = document.createElement("button");
    child.appendChild(document.createTextNode("use"));
    child.onclick = function() {sendEvent("use-item", item);};
    div.appendChild(child);
    child = document.createElement("button");
    child.appendChild(document.createTextNode("edit"));
    child.onclick = function() {showEditItem(folder, index);};
    div.appendChild(child);
    child = document.createElement("button");
    child.appendChild(document.createTextNode("move"));
    child.onclick = function() {showFolderSelect("Move to:", function() {
        const toFolder = allFolders[document.getElementById("folder-select-list").selectedIndex];
        for (var itemIndex = 0; itemIndex < toFolder.length; itemIndex++) {
            if (toFolder[itemIndex]["name"] === item["name"]) {
                showAlert("Folder already has an item named " + item["name"] + ".  Choose a different folder or rename the other item.");
                return;
            }
        }
        hideFolderSelect();
        removeItemOrFolder(folder, index);
        newItem(toFolder, item["name"], item["type"], item["url"]);
    });};
    div.appendChild(child);
    child = document.createElement("button");
    child.appendChild(document.createTextNode("delete"));
    child.onclick = function() {
        showConfirm("Delete item " + item["name"] + "?", function() {
            removeItemOrFolder(folder, index);
            hideConfirm();
        });
    };
    div.appendChild(child);
    return div;
}

function createFolderDiv(parentFolder, index, path) {
    const itemList = parentFolder[index]["items"];
    allFolders.push(itemList);
    const name = parentFolder[index]["name"];
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
    child.onclick = function() {
        showConfirm("Delete folder " + name + "?", function() {
            removeItemOrFolder(parentFolder, index);
            hideConfirm();
        });
    };
    contents.appendChild(child);
    child = document.createElement("option");
    child.appendChild(document.createTextNode(path));
    document.getElementById("folder-select-list").appendChild(child);
    for (var i = 0; i < itemList.length; i++) {
        if ("items" in itemList[i]) {
            contents.appendChild(createFolderDiv(itemList, i, path + itemList[i]["name"] + "/"));
        } else {
            contents.appendChild(createItemDiv(itemList, i));
        }
    }
    div.appendChild(contents);
    return div;
}

function refreshInventoryView() {
    allFolders = [inventory];
    const folderList = document.getElementById("folder-select-list");
    folderList.innerHTML = "";
    var child = document.createElement("option");
    child.appendChild(document.createTextNode("/"));
    folderList.appendChild(child);
    const view = document.getElementById("view");
    view.innerHTML = "";
    child = document.createElement("button");
    child.appendChild(document.createTextNode("new folder"));
    child.onclick = function(){showNewFolder(inventory)};
    view.appendChild(child);
    child = document.createElement("button");
    child.appendChild(document.createTextNode("new item"));
    child.onclick = function(){showNewItem(inventory)};
    view.appendChild(child);
    for (var i = 0; i < inventory.length; i++) {
        if ("items" in inventory[i]) {
            view.appendChild(createFolderDiv(inventory, i, "/" + inventory[i]["name"] + "/"));
        } else {
            view.appendChild(createItemDiv(inventory, i));
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
    child.onclick = function() {showFolderSelect("Put it where?", function() {
        var toFolder = allFolders[document.getElementById("folder-select-list").selectedIndex];
        for (var itemIndex = 0; itemIndex < toFolder.length; itemIndex++) {
            if (toFolder[itemIndex]["name"] === data["name"]) {
                showAlert("Folder already has an item named " + data["name"] + ".  Choose a different folder or rename the other item.");
                return;
            }
        }
        hideFolderSelect();
        deleteInboxItem(index);
        newItem(toFolder, data["name"], data["type"], data["url"]);
    });};
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
