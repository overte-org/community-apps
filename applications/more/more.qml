import QtQuick 2.7
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.3

Rectangle {
    color: Qt.rgba(0.1,0.1,0.1,1)
    signal sendToScript(var message);
    width: 200
    height: 700
    id: root

    property string current_page: "app_list"

    Timer {
        interval: 10
        running: true
        repeat: false
        onTriggered: {
            toScript({type: "initialized"});
        }
    }

    // User view
    Item {
        anchors.fill: parent

        // Navigation Bar
        Rectangle {
            id: navigation_bar
            width: parent.width
            height: 60
            color: Qt.rgba(0,0,0,1)
            visible: current_page == "app_list"

            Item {
                anchors.centerIn: parent
                width: parent.width - 20
                height: parent.height - 25

                Rectangle {
                    color: "white"
                    width: parent.width - 100
                    anchors.verticalCenter: parent.verticalCenter
                    height: parent.height
                    radius: 5

                    TextInput {
                        width: parent.width - 10
                        color: "black"
                        font.pointSize: 12
                        anchors.centerIn: parent
                        id: search_query
                        onAccepted: {
                            if (current_page == "app_list"){
                                searchList(search_query.text, app_listings);
                                return;
                            }
                            // if (current_page == "repos"){
                            //     searchList(search_query.text, repo_list);
                            //     return;
                            // }
                        }
                        MouseArea {
                            anchors.fill: parent
                            hoverEnabled: true
                            onEntered: parent.parent.children[1].x = 15
                            onExited: parent.parent.children[1].x = 5

                            onClicked: (mouse) => {
                                parent.forceActiveFocus() // Hack? Maybe see if this can be better done another way
                            }
                        }
                    }

                    Text {
                        color: "Gray"
                        font.pointSize: 10
                        anchors.verticalCenter: parent.verticalCenter
                        x: 5
                        text: "Search..."
                        font.italic: true
                        visible: parent.children[0].text == ""

                        Behavior on x {
                            NumberAnimation {
                                duration: 100
                            }
                        }

                    }

                }

                Rectangle {
                    color: "#296992"
                    width: parent.width - parent.children[0].width - 10
                    anchors.verticalCenter: parent.verticalCenter
                    height: parent.height
                    radius: 5
                    anchors.right: parent.right

                    Image {
                        source: "menu.svg"
                        anchors.centerIn: parent
                        sourceSize.width: 20
                        sourceSize.height: 20
                    }

                    MouseArea {
                        anchors.fill: parent
                        hoverEnabled: true
                        onEntered: parent.color = "#122F41"
                        onExited: parent.color = "#296992"

                        onClicked: {
                            root.current_page = "page_selection"
                        }
                    }
                }
            }
        }

        // Go back button from app details
        Rectangle {
            id: go_back_button
            width: parent.width
            height: 60
            color: Qt.rgba(0,0,0,1)
            visible: current_page != "app_list"

            Rectangle {
                width: parent.width - 20
                anchors.verticalCenter: parent.verticalCenter
                anchors.horizontalCenter: parent.horizontalCenter
                height: 35
                radius: 5
                color: "#771d1d"

                Text {
                    color: "white"
                    font.pointSize: 12
                    anchors.centerIn: parent
                    text: "Back"
                }

                MouseArea {
                    anchors.fill: parent

                    hoverEnabled: true
                    onEntered: parent.color = "#471111"
                    onExited: parent.color = "#771d1d"
                    
                    onClicked: {
                        if (current_page == "page_selection") return current_page = "app_list";
                        if (current_page == "details") return current_page = "app_list";
                        current_page = "page_selection"
                    }
                }
            }
        }

        // Pages ----

        // Apps Listing
        Item {
            width: parent.width
            height: parent.height
            anchors.top: navigation_bar.bottom
            visible: current_page == "app_list"

          	// Installed Apps
            ListView {
                property int index_selected: -1
                width: parent.width
                height: parent.height - 60
                clip: true
                interactive: true
                id: app_listing_list
                model: app_listings

                delegate: Loader {
                    property int delegateIndex: index
                    property string delegateTitle: model.title
                    property string delegateRepository: model.repository
                    property string delegateDescription: model.description
                    property string delegateIcon: model.icon
                    property string delegateURL: model.url
                    property bool delegateInstalled: model.installed
                    property bool delegateIsVisible: model.is_visible
                    width: app_listing_list.width

                    sourceComponent: app_listing
                }
            }
            
            ListModel {
                id: app_listings
            }
        }

        // Installed Apps
        Item {
            width: parent.width
            height: parent.height - 40
            anchors.top: navigation_bar.bottom
            visible: current_page == "installed_app_list"

          	// Installed Apps
            ListView {
                property int index_selected: -1
                width: parent.width
                height: parent.height - 60
                clip: true
                interactive: true
                id: installed_apps_list
                model: installed_apps

                delegate: Loader {
                    property int delegateIndex: index
                    property string delegateTitle: model.title
                    property string delegateRepository: model.repository
                    property string delegateDescription: model.description
                    property string delegateIcon: model.icon
                    property string delegateURL: model.url
                    property bool delegateInstalled: model.installed
                    property bool delegateIsVisible: model.is_visible
                    width: installed_apps_list.width

                    sourceComponent: app_listing
                }
            }
            
            ListModel {
                id: installed_apps
            }
        }

        // Page selection
        Item {
            width: parent.width
            height: parent.height - 40
            anchors.top: navigation_bar.bottom
            visible: current_page == "page_selection"

          	// Installed Apps
            ListView {
                property int index_selected: -1
                width: parent.width
                height: parent.height - 60
                clip: true
                interactive: true
                model:  ListModel {

                    // TODO:
                    ListElement {
                        name: "Installed Apps"
                        description: "View a list of applications installed"
                        page_name: "installed_app_list"
                    }
                    ListElement {
                        name: "Repository Manager"
                        description: "Manage your list of repositories"
                        page_name: "repos"
                    }

                    
                }

                delegate: Component {
                    Rectangle {
                        width: parent.width
                        height: 60
                        color: index % 2 === 0 ? "transparent" : Qt.rgba(0.15,0.15,0.15,1)

                        Item {
                            height: parent.height
                            width: parent.width - 40

                            Behavior on x {
                                NumberAnimation {
                                    duration: 150
                                }
                            }

                            Text {
                                width: parent.width - 50
                                y: 5
                                height: 30
                                text: name
                                font.pixelSize: 16
                                color: "white"
                                anchors.horizontalCenter: parent.horizontalCenter
                                font.italic: true
                            }
                            Text {
                                width: parent.width - 50
                                height: 15
                                anchors.top: parent.children[0].bottom
                                text: description
                                font.pixelSize: 12
                                color: "white"
                                anchors.horizontalCenter: parent.horizontalCenter
                                font.italic: true
                            }
                        }

                        Text {
                            width: 50
                            height: parent.height
                            text: ">"
                            color: "transparent"
                            x: parent.width - 150
                            font.pixelSize: 40
                            anchors.verticalCenter: parent.verticalCenter

                            Behavior on x {
                                NumberAnimation {
                                    duration: 150
                                }
                            }
                            Behavior on color {
                                ColorAnimation {
                                    duration: 150
                                }
                            }
                        }

                        MouseArea {
                            anchors.fill: parent
                            hoverEnabled: true

                            onEntered: {
                                parent.color = "#111111"

                                parent.children[0].x = parent.children[0].x + 20

                                // Arrow
                                parent.children[1].x = parent.width - 50
                                parent.children[1].color = "white"
                            }
                            onExited: {
                                parent.color = index % 2 === 0 ? "transparent" : Qt.rgba(0.15,0.15,0.15,1)

                                parent.children[0].x = 0

                                // Arrow
                                parent.children[1].x = parent.width - 150
                                parent.children[1].color = "transparent"
                            }

                            onClicked: (mouse) => {
                                current_page = page_name
                            }
                        }
                    }
                }
            }
        }

        // Repository Manager
        Item {
            width: parent.width
            height: parent.height - 40
            anchors.top: navigation_bar.bottom
            visible: current_page == "repos"

            Rectangle {
                height: 70
                width: parent.width
                color: "#111111"

                Item {
                    width: parent.width - 10
                    height: parent.height
                    anchors.horizontalCenter: parent.horizontalCenter


                    Text{
                        text: "Add a new repository"
                        color: "White"
                        font.pointSize: 12
                        wrapMode: Text.WordWrap
                        height: 30
                    }

                    Rectangle{
                        width: parent.width - 70
                        height: 30
                        radius: 5
                        anchors.top: parent.children[0].bottom

                        TextInput {
                            width: parent.width - 10
                            color: "black"
                            font.pointSize: 12
                            anchors.centerIn: parent
                            id: repo_url

                            MouseArea {
                                anchors.fill: parent
                                hoverEnabled: true
                                onEntered: parent.parent.children[1].x = 15
                                onExited: parent.parent.children[1].x = 5

                                onClicked: (mouse) => {
                                    parent.forceActiveFocus() // Hack? Maybe see if this can be better done another way
                                }
                            }
                        }

                        Text {
                            color: "Gray"
                            font.pointSize: 10
                            anchors.verticalCenter: parent.verticalCenter
                            x: 5
                            text: "Add a manifest.json url"
                            font.italic: true
                            visible: parent.children[0].text == ""
                            Behavior on x {
                                NumberAnimation {
                                    duration: 100
                                }
                            }
                        }
                    }

                    Rectangle {
                        anchors.top: parent.children[0].bottom
                        width: parent.width - parent.children[1].width - 10
                        anchors.right: parent.right
                        height: 30
                        color: "green"
                        radius: 5

                        Text {
                            text: "+"
                            color: "White"
                            font.pointSize: 14
                            anchors.centerIn: parent
                        }

                        MouseArea {
                            anchors.fill: parent
                            hoverEnabled: true
                            onEntered:  parent.color = "#004D00"
                            onExited: parent.color = "green"
                            
                            onClicked: {
                                installNewRepository(repo_url.text);
                                repo_url.text = "";
                            }
                        }
                    }
                }

            }

            ListView {
                property int index_selected: -1
                width: parent.width
                height: parent.height - 60
                clip: true
                interactive: true
                spacing: 5
                id: registered_repo_list
                model: repo_list
                anchors.top: parent.children[0].bottom
                delegate: Loader {
                    property int delegateIndex: index
                    property string delegateTitle: model.title
                    property string delegateURL: model.url
                    property bool selected: false
                    property bool delegateIsVisible: model.is_visible

                    width: registered_repo_list.width

                    sourceComponent: repo_listing
                }
            }
            ListModel {
                id: repo_list
            }
        }

        // App Details
        Item {
            width: parent.width - 20
            height: parent.height - 40
            anchors.top: navigation_bar.bottom
            visible: current_page == "details"
            anchors.horizontalCenter: parent.horizontalCenter

            Item {
                width: parent.width
                height: 100
                y: 10


                Rectangle{
                    width: 100
                    height: 100
                    radius: 5

                    Rectangle {
                        color: "black"
                        width: 96
                        height: 96
                        radius: 5
                        anchors.centerIn: parent

                        Image {
                            id: details_icon
                            width: 90
                            height: 90
                            anchors.centerIn: parent
                        }
                    }
                }

                Text {
                    x: parent.children[0].width + 10
                    text: ""
                    color:"white";
                    font.pointSize: 14
                    id: details_title
                }

                Text {
                    x: parent.children[0].width + 10
                    y: parent.children[1].height + 5
                    text: ""
                    color: "gray";
                    font.pointSize: 10
                    id: details_repo_url
                }
            }

            Item {
                width: parent.width
                anchors.top: parent.children[0].bottom

                Text{
                    text: ""
                    color: "white";
					wrapMode: Text.WordWrap
					width: parent.width
                    font.pointSize: 12
                    y: 20
                    id: details_description
                }
            }

        }
    }

    // Templates
    Component {
        id: app_listing

        Rectangle {
            property int index: delegateIndex
            property string title: delegateTitle
            property string repo: delegateRepository
            property string description: delegateDescription
            property string icon: delegateIcon
            property string url: delegateURL
            property bool installed: delegateInstalled
            property bool is_visible: delegateIsVisible

            property bool selected: (app_listing_list.index_selected == index)

            visible: is_visible
            height: is_visible ? selected ? 100 : 60 : 0
          	width: parent.width

            color: index % 2 === 0 ? "transparent" : Qt.rgba(0.15,0.15,0.15,1)

            Behavior on height {
                NumberAnimation {
                    duration: 100
                }
            }

            Item {
                width: parent.width - 10
                anchors.horizontalCenter: parent.horizontalCenter
                height: parent.height
                clip: true

                // Icon
                Rectangle {
                    width: 50
                    height: 50
                    radius: 5
                    color: installed ? "#505186" : "white"
                    y: 5

                    Rectangle{
                        anchors.centerIn: parent
                        width: 46
                        height: 46
                        radius: 5
                        color: "black"

                        Image {
                            source: icon
                            anchors.centerIn: parent
                            sourceSize.width: 40
                            sourceSize.height: 40
                        }
                    }
                }

                // App info
                Item {
                    width: parent.width - parent.children[0].width - 50
                    x: parent.children[0].width + 10
                    height: 20

                    Text {
                        width: parent.width
                        height: 20
                        text: title
                        color: "white"
                        font.pointSize: 12
                        wrapMode: Text.NoWrap
                        elide: Text.ElideRight
                    }
                    Text {
                        width: parent.width
                        height: 20
                        text: repo
                        color: "gray"
                        font.pointSize: 10
                        anchors.top: parent.children[0].bottom
                    }
                }

                // Action Buttons
                Item {
                    width: parent.width
                    height: 30

                    y: 65
                    visible: selected ? true : false


                    Rectangle {
                        width: 120
                        height: parent.height
                        radius: 5
                        color: "#771d1d"
                        visible: installed

                        Text{
                            text: "Uninstall"
                            anchors.centerIn: parent
                            color:"white"
                        }

                        MouseArea {
                            anchors.fill: parent

                            hoverEnabled: true
                            onEntered: parent.color = "#471111"
                            onExited: parent.color = "#771d1d"

                            onClicked: {
                                removeApp(url);
                            }
                        }

                    }

                    Rectangle {
                        width: 120
                        height: parent.height
                        radius: 5
                        color: "#00930f"
                        visible: !installed

                        Text{
                            text: "Install"
                            anchors.centerIn: parent
                            color:"white"
                        }

                        MouseArea {
                            anchors.fill: parent

                            hoverEnabled: true
                            onEntered: parent.color = "#005809"
                            onExited: parent.color = "#00930f"

                            onClicked: {
                                installNewApp(title, url, repo, description, icon);
                            }
                        }
                    }

                    Rectangle {
                        width: 120
                        height: parent.height
                        radius: 5
                        color: "#505186"
                        x: parent.children[0].width + 5

                        Text {
                            text: "Details"
                            anchors.centerIn: parent
                            color:"white"
                        }

                        MouseArea {
                            anchors.fill: parent

                            hoverEnabled: true
                            onEntered: parent.color = "#303150"
                            onExited: parent.color = "#505186"

                            onClicked: {
                                openAppDetails(title, url, repo, description, icon);
                            }
                        }
                    }
                }

                MouseArea {
                    width: parent.width
                    height: 60

                    hoverEnabled: true
                    onEntered: {
                        parent.parent.color = "#111111"
                    }
                    onExited: {
                        parent.parent.color = parent.parent.index % 2 === 0 ? "transparent" : Qt.rgba(0.15,0.15,0.15,1)
                    }

                    onClicked: {
                        if (app_listing_list.index_selected == index){
                            app_listing_list.index_selected = -1;
                            return;
                        }

                        app_listing_list.index_selected = index
                    }
                }

            }
        }
    }

    Component {
        id: repo_listing

        Rectangle {
            property int index: delegateIndex
            property string title: delegateTitle
            property string url: delegateURL            
            property bool is_visible: delegateIsVisible

            property bool selected: (registered_repo_list.index_selected == index)

            height: selected ? 70 : 40
          	width: parent.width
            visible: is_visible
            color: index % 2 === 0 ? "transparent" : Qt.rgba(0.15,0.15,0.15,1)
            clip: true

            Behavior on height {
                NumberAnimation {
                    duration: 100
                    easing.type: Easing.OutQuad
                }
            }

            Item {
                width: parent.width - 10
                anchors.horizontalCenter: parent.horizontalCenter
                height: parent.height

                // Repo Info
                Text {
                    width: parent.width
                    height: 20
                    text: title
                    color: "white"
                    font.pointSize: 12
                    wrapMode: Text.NoWrap
                    elide: Text.ElideRight
                }
                Text {
                    width: parent.width
                    height: 20
                    anchors.top: parent.children[0].bottom
                    text: url
                    color: "gray"
                    font.pointSize: 10
                    wrapMode: Text.NoWrap
                    elide: Text.ElideRight
                }

                // Action Buttons
                Item {
                    height: selected ? 30 : 0
                    width: parent.width
                    anchors.top: parent.children[1].bottom
                    visible: selected ? true : false

                    Rectangle {
                        width: 120
                        height: parent.height
                        radius: 5
                        color: "#771d1d"

                        Text {
                            text: "Remove"
                            anchors.centerIn: parent
                            color:"white"
                        }

                        MouseArea {
                            anchors.fill: parent

                            hoverEnabled: true
                            onEntered: parent.color = "#471111"
                            onExited: parent.color = "#771d1d"

                            onClicked: {
                                removeRepository(url);
                            }
                        }
                    }
                }

            }

            MouseArea {
                width: parent.width
                height: 40

                hoverEnabled: true
                onEntered: {
                    parent.color = "#111111"
                }
                onExited: {
                    parent.color = parent.index % 2 === 0 ? "transparent" : Qt.rgba(0.15,0.15,0.15,1)
                }

                onClicked: {
                    if (registered_repo_list.index_selected == index){
                        registered_repo_list.index_selected = -1;
                        return;
                    }

                    registered_repo_list.index_selected = index;
                }
            }

        }
    }

    // List population and management
    function addApplicationsToList(message){
        message.app_list.forEach((app) => {
            app_listings.append({title: app.title, repository: app.repository, description: app.description, icon: app.icon, url: app.url, installed: app.installed || false, is_visible: true });

            if (app.installed){
                installed_apps.append({title: app.title, repository: app.repository, description: app.description, icon: app.icon, url: app.url, installed: true, is_visible: true });
            }
        })
    }
    function clearApplicationList(){
        app_listings.clear()
        installed_apps.clear()
        app_listing_list.index_selected = -1;
    }
    function addRepositoriesToList(message){
        message.repository_list.forEach((repo) => repo_list.append({ title: repo.title, url: repo.url, is_visible: true }))
    }
    function clearRepositoryList(){
        repo_list.clear()
        registered_repo_list.index_selected = -1;
    }

    // Funcionality
    function installNewRepository(url){
        toScript({type: "install_repo", url: url});
    }
    function removeRepository(url){
        toScript({type: "remove_repo", url: url});
    }
    function installNewApp(title, url, repository, description, icon){
        toScript({type: "install_application", title: title, url: url, repository: repository, description: description, icon: icon});
    }    
    function removeApp(url){
        toScript({type: "remove_application", url: url});
    }

    // Searching
    function searchList(text, element){

        for (var i = 0; i < element.count; i++) {
            var app = element.get(i);

            var is_found = app.title.toLowerCase().includes(text.toLowerCase()) || app.description.toLowerCase().includes(text.toLowerCase()) || app.url.toLowerCase().includes(text.toLowerCase())

            if (!app.title.toLowerCase().includes(text.toLowerCase())){
                app.is_visible = false;
            }
            else {
                app.is_visible = true
            }

        }
    }

    // App Details page
    function openAppDetails(title, url, repo, description, icon){
        current_page = "details";
        details_title.text = title;
        details_repo_url.text = repo;
        details_description.text = description;
        details_icon.source = icon;
    }

    // Messages from script
    function fromScript(message) {
        switch (message.type){
            case "installed_apps":
                clearApplicationList();
                addApplicationsToList(message);
                break;
            case "installed_repositories":
                clearRepositoryList();
                addRepositoriesToList(message)
                break;
            case "clear_messages":
                break;
            case "initial_settings":
                break;
        }
    }

    // Send message to script
    function toScript(packet){
        sendToScript(packet)
    }
}
