import QtQuick 2.7
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.3
import controlsUit 1.0 as HifiControlsUit

Rectangle {
    color: Qt.rgba(0.1,0.1,0.1,1)
    signal sendToScript(var message);
    width: parent.width
    height: 700
    id: root

    // property string current_page: "poll_host_view"

    property string current_page: "poll_list"

    // Poll List view
    ColumnLayout {
        width: parent.width
        height: parent.height - 40
        visible: current_page == "poll_list"

        Item {
            height: 50
            width: parent.width

            Rectangle {
                color: "green"
                width: parent.width - 40
                height: 40
                y: 10
                anchors.horizontalCenter: parent.horizontalCenter

                Text {
                    anchors.centerIn: parent
                    text: "Create Poll"
                    font.pointSize: 18
                    color: "white"
                }

                MouseArea {
                    anchors.fill: parent

                    onClicked: {
                        current_page = "poll_create";
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
            id: active_polls_list
            model: active_polls

            delegate: Loader {
                property int delegateIndex: index
                property string delegateTitle: model.title
                property string delegateDescription: model.description
                property string delegateId: String(model.id)
                width: active_polls_list.width

                sourceComponent: active_poll_template
            }
        }
        
        ListModel {
            id: active_polls
        }
    }

    // Poll host create poll view
    ColumnLayout {
        width: parent.width - 30
        visible: current_page == "poll_create"
        anchors.centerIn: parent
        spacing: 10

        // Title
        Text {
            text: "Title:"
            Layout.fillWidth: true
            font.pointSize: 18
            color: "white"
        }
        TextField {
            width: 300
            height: 30
            text: "New Poll"
            cursorVisible: false
            font.pointSize: 16
            Layout.fillWidth: true
            id: poll_to_create_title
        }


        // Description
        Text {
            text: "Description:"
            Layout.fillWidth: true
            font.pointSize: 18
            color: "white"
        }

        TextField {
            width: parent.width
            text: "Vote on things!"
            cursorVisible: false
            font.pointSize: 14
            Layout.fillWidth: true
            Layout.minimumHeight: 150
            verticalAlignment: Text.AlignTop
            wrapMode: Text.WordWrap
            id: poll_to_create_description

        }

        // Submit button
        RowLayout {

            Rectangle {
                color: "#999999"
                width: 150
                height: 40
                Layout.fillWidth: true

                Text {
                    text: "Abort"
                    color:"black"
                    anchors.centerIn: parent
                }

                MouseArea {
                    anchors.fill: parent
                    onClicked: {
                        current_page = "poll_list";
                    }
                }
            }

            Rectangle {
                color: "green"
                width: 150
                height: 40

                Text {
                    text: "Create"
                    color:"white"
                    anchors.centerIn: parent
                }

                MouseArea {
                    anchors.fill: parent
                    onClicked: {
                        toScript({type: "create_poll", poll: {title: poll_to_create_title.text, description: poll_to_create_description.text}});
                        current_page = "poll_host_view";
                    }
                }
            }
        }

    }

    // Poll Host display
    ColumnLayout {
        width: parent.width
        height: parent.height - 40
        visible: current_page == "poll_host_view"

        Item {
            height: 100
            width: parent.width

            Rectangle {
                color: "black"
                anchors.fill: parent
            }

            Text {
                width: parent.width
                text: "Respond to:"
                color: "gray"
                font.pointSize: 12
                wrapMode: Text.NoWrap
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                y: 20
            }
            TextEdit {
                id: poll_to_respond_title
                width: parent.width
                text: "<Question>"
                color: "white"
                font.pointSize: 20
                wrapMode: Text.NoWrap
                anchors.top: parent.children[1].bottom
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }

        // Options
        Item {
            width: parent.width
            Layout.fillWidth: true
            Layout.fillHeight: true

            ListView {
                property int index_selected: -1
                width: parent.width - 40
                height: parent.height - 60
                clip: true
                interactive: true
                spacing: 5
                id: poll_options_host
                model: poll_option_model_host
                anchors.centerIn: parent

                delegate: Loader {
                    property int delegateIndex: index
                    property string delegateOption: model.option
                    width: poll_options.width

                    sourceComponent: poll_option_template_host
                }
            }
            
            ListModel {
                id: poll_option_model_host

                // ListElement {
                //     option: "Prefill"
                // }
            }
        }

        // Add Option Button
        ColumnLayout {
            anchors.horizontalCenter: parent.horizontalCenter
            width: parent.width
            height: 40

            RowLayout {
                width: parent.width
                anchors.horizontalCenter: parent.horizontalCenter

                Rectangle {
                    width: 150
                    height: 40
                    color: "#c0bfbc"

                    Text {
                        anchors.centerIn: parent
                        text:"Close poll"
                        color: "black"
                        font.pointSize:18
                    }

                    MouseArea {
                        anchors.fill: parent
                        onClicked: {
                            toScript({type: "close_poll"});
                            current_page = "poll_list";
                        }
                    }
                }

                Rectangle {
                    width: 40
                    height: 40
                    color: "green"

                    Text {
                        anchors.centerIn: parent
                        text:"+"
                        color: "white"
                        font.pointSize:30
                    }

                    MouseArea {
                        anchors.fill: parent
                        onClicked: {
                            poll_option_model_host.append({option: ""})
                        }
                    }
                }

                Rectangle {
                    width: 150
                    height: 40
                    color: "#1c71d8"

                    Text {
                        anchors.centerIn: parent
                        text:"Submit poll"
                        color: "white"
                        font.pointSize:18
                    }

                    MouseArea {
                        anchors.fill: parent
                        onClicked: {
                            // Get a list of all options
                            var options = []
                            for (var i = 0; i < poll_option_model_host.count; i++) {
                                var element = poll_option_model_host.get(i);
                                console.log("added "+ element.option +" to array")
                                options.push(element.option)
                            }

                            toScript({type: "prompt", prompt: {question: poll_to_respond_title.text, options: options}})
                        }
                    }
                }
            }

            RowLayout {
                width: parent.width
                anchors.horizontalCenter: parent.horizontalCenter

                Rectangle {
                    width: 150
                    height: 40
                    color: "#1c71d8"

                    Text {
                        anchors.centerIn: parent
                        text:"Run Election"
                        color: "white"
                        font.pointSize:18
                    }

                    MouseArea {
                        anchors.fill: parent
                        onClicked: {
                            toScript({type: "run_election"})
                        }
                    }
                }
            }
        }
    } 

    // Poll question client display
    ColumnLayout { 
        width: parent.width
        height: parent.height - 40
        visible: current_page == "poll_client_view"

        // Header
        Item {
            height: 100
            width: parent.width

            Rectangle {
                color: "black"
                anchors.fill: parent
            }

            Text {
                width: parent.width
                text: "Respond to:"
                color: "gray"
                font.pointSize: 12
                wrapMode: Text.NoWrap
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                y: 20
            }
            Text {
                id: prompt_question
                width: parent.width
                text: "[No prompt set yet]"
                color: "white"
                font.pointSize: 20
                wrapMode: Text.NoWrap
                anchors.top: parent.children[1].bottom
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }

        // TODO: Keep track of used numbers and blacklist them
        // Options
        Item {
            width: parent.width
            Layout.fillWidth: true
            Layout.fillHeight: true

            ListView {
                property int index_selected: -1
                width: parent.width
                height: parent.height - 60
                clip: true
                interactive: true
                spacing: 5
                id: poll_options
                model: poll_option_model

                delegate: Loader {
                    property int delegateIndex: index
                    property string delegateOption: model.option
                    property int delegateRank: model.rank
                    width: poll_options.width

                    sourceComponent: poll_option_template
                }
            }
            
            ListModel {
                id: poll_option_model
            }
        }

        // Add Option Button
        Item {
            width: parent.width
            height: 40

            RowLayout {
                anchors.centerIn: parent

                Rectangle {
                    width: 150
                    height: 40
                    color: "#c0bfbc"

                    Text {
                        anchors.centerIn: parent
                        text:"Cast ballot"
                        color: "black"
                        font.pointSize:18
                    }

                    MouseArea {
                        anchors.fill: parent


                        // TODO: Turn into function and move to root
                        onClicked: {
                            var votes = {};
                            var orderedArray = [];
                            
                            // Find all options and order then from first to last
                            // poll_option_model.get(i) gets them in order

                            for (var i = 0; i < poll_option_model.count; ++i) {
                                var option = poll_option_model.get(i); //

                                // FIXME: Stringify this or make it JSON safe. Requires cross-verification
                                votes[option.option] = option.rank
                            }

                            // FIXME: This is painful to look at.
                            // Sort the object from lowest to heighest
                            var entries = Object.entries(votes);
                            entries.sort((a, b) => a[1] - b[1]);

                            // Remove entries that have a numerical value of 0
                            // FIXME: Inconsistant with how we are handling non-votes in the script side?
                            // This is our "leave seat empty" or "non-vote"
                            entries = entries.filter((entry) => entry[1]!== 0);

                            // Get names instead of numbers
                            var onlyNames = entries.map((entry) => entry[0]);

                            // Send our ballot to the host (by sending it to everyone in the poll lol)
                            toScript({type: "cast_vote", ballot: onlyNames});
                        }
                    }
                }
            }
        }
    }


    // Templates
    // Active poll listing
    Component {
        id: active_poll_template

        Rectangle {
            property int index: delegateIndex
            property string title: delegateTitle
            property string description: delegateDescription
            property string id: delegateId

            property bool selected: (active_polls_list.index_selected == index)
            height: selected ? 100 : 60 

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

                // App info
                Item {
                    height: 60

                    Text {
                        width: parent.width
                        height: 40
                        text: title
                        color: "white"
                        font.pointSize: 12
                        wrapMode: Text.NoWrap
                    }
                    Text {
                        width: parent.width
                        height: 20
                        text: description
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
                        color: "#00930f"
                        visible: true

                        Text {
                            text: "Join"
                            anchors.centerIn: parent
                            color: "white"
                        }

                        MouseArea {
                            anchors.fill: parent

                            onClicked: {
                                toScript({type: "join_poll", poll: {id: id}})
                            }
                        }
                    }
                }

                MouseArea {
                    width: parent.width
                    height: 60

                    onClicked: {
                        if (active_polls_list.index_selected == index){
                            active_polls_list.index_selected = -1;
                            return;
                        }

                        active_polls_list.index_selected = index
                    }
                }

            }
        }
    }

    // Poll option
    Component {
        id: poll_option_template

        Rectangle {
            property int index: delegateIndex
            property string option: delegateOption
            property int rank: delegateRank
            height: 60 

            color: index % 2 === 0 ? "transparent" : Qt.rgba(0.15,0.15,0.15,1)

            Row {
                width: parent.width - 10
                anchors.horizontalCenter: parent.horizontalCenter
                height: parent.height
                clip: true

                // TODO: Replace cap with total amount of options
                TextField {
                    width: 70
                    height: 50
                    font.pointSize: 20
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter    
                    color: "black"
                    validator: RegExpValidator { regExp: /^[0-9]+$/ } 
                    inputMethodHints: Qt.ImhDigitsOnly 
                    anchors.verticalCenter: parent.verticalCenter
                    text: rank

                    onTextChanged: {
                        poll_option_model.setProperty(index, "rank", Number(text))
                    }
                }

                Text {
                    Layout.fillWidth: true
                    text: option
                    anchors.centerIn: parent
                    color: "white"
                    font.pointSize: 14
                }
            }
        }
    }

    // Poll option Host
    Component {
        id: poll_option_template_host

        Rectangle {
            property string option: delegateOption
            property int index: delegateIndex

            height: 60 
            color: "transparent" 

            Behavior on height {
                NumberAnimation {
                    duration: 100
                }
            }

            RowLayout {
                width: parent.width
                anchors.horizontalCenter: parent.horizontalCenter
                height: parent.height

                TextField {
                    text: option
                    color: "black"
                    font.pointSize: 14
                    Layout.fillWidth: true

                    // Update the option property
                    onTextChanged: {
                        poll_option_model_host.setProperty(index, "option", text)
                    }
                }

                Rectangle {
                    width: 100
                    height: parent.height
                    color: "yellow"

                    MouseArea {
                        anchors.fill: parent
                        onClicked: {
                            // Remove this element from the list
                            poll_option_model_host.remove(index)
                        }
                    }
                }
            }
        }
    }

    // Messages from script
    function fromScript(message) {
        switch (message.type){
        // Switch view to the create poll view
        case "create_poll":
            break;

        // Add poll info to the list of active polls
        case "new_poll":
            active_polls.append(message.poll);
            break;
        
        // Populate the client view of the current question and options
        case "poll_prompt":
            current_page = "poll_client_view";
            active_polls_list.index_selected = -1; // Unselect whatever poll was selected (If one was selected)
            // Clear options
            poll_option_model.clear();

            // Set values
            prompt_question.text = message.prompt.question
            for (var option of message.prompt.options){
                console.log("adding option "+ option);
                poll_option_model.append({option: option, rank: 0}) 
            }
            // Set the options
            break;

        // Close the poll and remove it from the list of active polls
        case "close_poll":
            if (message.change_page == true) current_page = "poll_list"

            // Find the poll with the matching ID and remove it from active polls
            for (var i = 0; i < active_polls.count; i++) {
                var element = active_polls.get(i);
                if (element.id == message.poll.id) {
                    active_polls.remove(i);
                }
            }
            break;

        // Open the host view
        // Only called when the host closes their tablet and reopens it.
        case "rehost":
            current_page = "poll_host_view"

            poll_to_respond_title.text = message.prompt.question

            poll_option_model_host.clear();
            for (var option of message.prompt.options){
                console.log("adding option "+ option);
                poll_option_model_host.append({option: option})
            }
            break;
        }
    }

    // Send message to script
    function toScript(packet){
        sendToScript(packet)
    }
}

