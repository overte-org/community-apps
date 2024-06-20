"use strict";

var inventory = [];
var inbox = [];
var nearbyUsers = [];

var currentFolder = [];

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

function changeFolder(folderPath) {
    currentFolder = inventory;
    // change buttons up top
    const directoryDiv = document.getElementsByClassName("directory")[0];
    directoryDiv.innerHTML = "";
    var folderButton = document.createElement("button");
    folderButton.className = "item";
    folderButton.appendChild(document.createTextNode("ROOT"));
    folderButton.onclick = function() {changeFolder([]);};
    directoryDiv.appendChild(folderButton);
    for (var i = 0; i < folderPath.length; i++) {
        const currentPath = folderPath.slice(0, i+1);
        folderButton = document.createElement("button");
        folderButton.class = "item";
        folderButton.appendChild(document.createTextNode(folderPath[i]));
        folderButton.onclick = function() {changeFolder(currentPath);};
        directoryDiv.appendChild(folderButton);
        // path traversal
        for (var j = 0; j < currentFolder.length; j++) {
            if (currentFolder[j]["name"] === folderPath[i]) {
                currentFolder = currentFolder[j]["items"];
                break;
            }
        }
    }
    // change items down low
    const itemListingsDiv = document.getElementById("item-listings");
    itemListingsDiv.innerHTML = "";
    const itemListingTemplate = document.getElementById("item-listing-template");
    const folderListingTemplate = document.getElementById("folder-listing-template");
    for (var i = 0; i < currentFolder.length; i++) {
        const currentItem = currentFolder[i];
        const itemIsFolder = "items" in currentItem;
        const itemName = currentItem["name"];
        const listing = (itemIsFolder ? folderListingTemplate : itemListingTemplate).getElementsByClassName("item-listing")[0].cloneNode(true);
        const itemNameBar = listing.getElementsByClassName("title")[0];
        if (itemIsFolder) {
            itemNameBar.onclick = function() {changeFolder(folderPath.concat([itemName]));};
        }
        itemNameBar.appendChild(document.createTextNode(itemName));
        itemListingsDiv.appendChild(listing);
    }
}

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

function refreshInventoryView() {
/*    const folderList = document.getElementById("folder-select-list");
    folderList.innerHTML = "";
    var child = document.createElement("option");
    child.appendChild(document.createTextNode("/"));
    folderList.appendChild(child);
    const view = document.getElementById("inventory");
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
    }*/
    changeFolder([]);
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
            contents.appendChild(createInboxDiv(index));
        }
        inboxDiv.appendChild(contents);
    }
}



function refreshNearbyUsers(userList) {
    document.getElementById("share-list").innerHTML = "";
    for (var i = 0; i < userList.length; i++) {
        var child = document.createElement("option");
        child.appendChild(document.createTextNode(userList[i].name));
        document.getElementById("share-list").appendChild(child);
    }
}

EventBridge.scriptEventReceived.connect(function(message) {
    const parsed_message = JSON.parse(message);
    if (parsed_message["app"] === "inventory") {
        switch (parsed_message["command"]) {
            case "script-to-web-inventory":
                inventory = parsed_message["data"];
                if (typeof inventory !== "object") { // if data is empty, then inventory becomes an empty string instead of an array.
                    inventory = [];
                }
                refreshInventoryView();
                break;
            case "script-to-web-receiving-item-queue":
                //inbox = parsed_message["data"];
                //refreshInboxView();
                break;
            case "script-to-web-nearby-users":
                nearbyUsers = parsed_message["data"];
                if (typeof nearbyUsers === "object") {
                    refreshNearbyUsers(parsed_message["data"]);
                }
                break;
            //default:
                //alert(message);
        }
    }
});

window.onload = function() {sendEvent("ready", {});}
