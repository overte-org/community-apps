import QtQuick 2.7
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.3
import controlsUit 1.0 as HifiControlsUit

Rectangle {
    color: Qt.rgba(0.1,0.1,0.1,1)
    signal sendToScript(var message);
    height: 700
    id: root

    property string current_page: "poll_list"
    property var poll: {} 
    property var pollStats: { winnerSelected: false } 
    property bool canHostVote: false
    property bool isHost: false 
    property bool votesTallied: false

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
                        _changePage("poll_create");
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
            text: MyAvatar.displayName + "'s Poll"
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

        // Options
        RowLayout {
            width: parent.width

            Text {
                text: "Allow host voting"
                color:"white"
                font.pointSize: 12
                Layout.fillWidth: true
            }

            CheckBox {
                id: poll_to_create_host_can_vote
                width: 30
                height: 25
                checked: false
                onToggled: {
                    canHostVote = checked
                }
            }
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
                        _changePage("poll_list");
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
                        _clearHostCreate();
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
                text: ""
                color: "white"
                font.pointSize: 20
                wrapMode: Text.NoWrap
                anchors.top: parent.children[1].bottom
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            Text {
                visible: poll_to_respond_title.text == ""
                color: "gray"
                font.pointSize: 20
                anchors.fill: poll_to_respond_title
                text: "Enter a prompt"
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                font.italic: true
            }
        }

        // Options
        Item {
            width: parent.width
            Layout.fillHeight: true

            // TODO: Pleaseholder text
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
                    width: parent.width

                    sourceComponent: poll_option_template_host
                }
            }
            
            ListModel {
                id: poll_option_model_host

                ListElement {
                    option: "Prefill"
                }
            }
        }

        // Host actions
        ColumnLayout {
            Layout.alignment: Qt.AlignHCenter
            width: parent.width
            height: 40

            RowLayout {
                width: parent.width
                Layout.alignment: Qt.AlignHCenter

                // Close poll
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
                        }
                    }
                }

                // Add poll option
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

                // Submit the poll to the users
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

                            // Send the prompt to the server
                            toScript({type: "prompt", prompt: {question: poll_to_respond_title.text, options: options}, canHostVote: canHostVote});
                            
                            // If the host can vote, change the screen to the client view to allow the vote
                            if (canHostVote) _changePage("poll_client_view"); 
                            else _changePage("poll_results");
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
            Layout.alignment: Qt.AlignHCenter

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
                        // TODO: Validate responses
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

                            // Change screen to results screen
                            _changePage("poll_results");
                        }
                    }
                }

                // Leave
                Rectangle {
                    width: 150
                    height: 40
                    color: "#c0bfbc"
                    visible: !isHost

                    Text {
                        anchors.centerIn: parent
                        text:"Leave"
                        color: "black"
                        font.pointSize:18
                    }

                    MouseArea {
                        anchors.fill: parent

                        onClicked: {
                            _clearClient();
                            toScript({type: "leave"});
                            _changePage("poll_list");
                        }
                    }
                }
            }
        }
    }

    // Poll results
    ColumnLayout {
        width: parent.width
        height: parent.height - 40
        visible: current_page == "poll_results"

        // Header
        Item {
            height: 100
            Layout.fillWidth: true

            Rectangle {
                color: "black"
                anchors.fill: parent
            }

            Text {
                width: parent.width
                text: "Winner"
                color: "gray"
                font.pointSize: 12
                wrapMode: Text.NoWrap
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                y: 20
            }
            Text {
                id: poll_winner
                width: parent.width
                text: "---"
                color: "white"
                font.pointSize: 20
                wrapMode: Text.NoWrap
                anchors.top: parent.children[1].bottom
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }

        Item {
            Layout.fillHeight: true
            Layout.fillWidth: true

            ColumnLayout {
                Layout.fillHeight: true
                width: parent.width - 40
                anchors.horizontalCenter: parent.horizontalCenter

                RowLayout {
                    width: parent.width

                    Text {
                        text: "Votes recived:"
                        color: "gray"
                        Layout.fillWidth: true
                        font.pointSize: 12
                    }
                    Text {
                        id: tally_votes_received
                        text: "0"
                        color: "white"
                        font.pointSize: 14
                    }
                }

                RowLayout {
                    width: parent.width

                    Text {
                        text: "Votes counted:"
                        color: "gray"
                        Layout.fillWidth: true
                        font.pointSize: 12
                    }
                    Text {
                        id: tally_votes_counted
                        text: "-"
                        color: "white"
                        font.pointSize: 14
                    }
                }

                RowLayout {
                    width: parent.width

                    Text {
                        text: "Iterations:"
                        color: "gray"
                        Layout.fillWidth: true
                        font.pointSize: 12
                    }
                    Text {
                        id: tally_votes_itterations
                        text: "-"
                        color: "white"
                        font.pointSize: 14
                    }
                }
            }
        }

        // Client actions
        RowLayout {
            width: parent.width
            Layout.alignment: Qt.AlignHCenter

            // Recast vote
            Rectangle {
                width: 150
                height: 40
                color: "#c0bfbc"
                visible: ((isHost && canHostVote) || !isHost) && !pollStats.winnerSelected && !votesTallied

                Text {
                    anchors.centerIn: parent
                    text:"Recast Vote"
                    color: "black"
                    font.pointSize:18
                }

                MouseArea {
                    anchors.fill: parent
                    onClicked: {
                        _changePage("poll_client_view");
                    }
                }
            }
            
            // Leave
            Rectangle {
                width: 150
                height: 40
                color: "#c0bfbc"
                visible: !isHost

                Text {
                    anchors.centerIn: parent
                    text:"Leave"
                    color: "black"
                    font.pointSize:18
                }

                MouseArea {
                    anchors.fill: parent

                    onClicked: {
                        _clearClient();
                        toScript({type: "leave"});
                        _changePage("poll_list");
                    }
                }
            }
        }

        // Host actions
        RowLayout {
            visible: isHost
            width: parent.width
            Layout.alignment: Qt.AlignHCenter

            // Preform Election
            Rectangle {
                visible: !votesTallied
                width: 150
                height: 40
                color: "#c0bfbc"

                Text {
                    anchors.centerIn: parent
                    text:"Tally Votes"
                    color: "black"
                    font.pointSize:18
                }

                MouseArea {
                    anchors.fill: parent
                    onClicked: {
                        toScript({type: "run_election"});
                        votesTallied = true;
                    }
                }
            }

            // Return to poll settings
            Rectangle {
                visible: !votesTallied
                width: 150
                height: 40
                color: "#c0bfbc"

                Text {
                    anchors.centerIn: parent
                    text:"Poll Settings"
                    color: "black"
                    font.pointSize:18
                }

                MouseArea {
                    anchors.fill: parent
                    onClicked: {
                        _changePage("poll_host_view");
                    }
                }
            }

            // Make a new question
            Rectangle {
                visible: isHost && votesTallied
                width: 150
                height: 40
                color: "#c0bfbc"

                Text {
                    anchors.centerIn: parent
                    text:"Next poll"
                    color: "black"
                    font.pointSize:18
                }

                MouseArea {
                    anchors.fill: parent
                    onClicked: {
                        _clearHost();
                        _changePage("poll_host_view");
                        votesTallied = false;
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
                Layout.alignment: Qt.AlignHCenter
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
                    anchors.centerIn: parent // FIXME: QML Does not like this for some reason...
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
            width: parent.width 

            TextField {
                text: option
                color: "black"
                font.pointSize: 14
                width: parent.width - 50

                // Update the option property
                onTextChanged: {
                    poll_option_model_host.setProperty(index, "option", text)
                }
                Text {
                    visible: parent.text == ""
                    color: "gray"
                    font.pointSize: 12
                    anchors.fill: parent
                    text: "Response..."
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                    font.italic: true
                    Layout.preferredWidth: 0
                }
            }

            Item {
                width: 50
                anchors.right: parent.right
                height: 40

                Image {
                    anchors.right: parent.right
                    width: 40
                    height: 40
                    source: "img/trash.png"
                }

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

    function _clearHost(){
        poll_to_respond_title.text = ""
        poll_option_model_host.clear();
    }

    function _clearHostCreate() {
        poll_to_create_title.text = MyAvatar.displayName + "'s Poll";
        poll_to_create_description.text = "Vote on things!";
    }

    function _clearClient(){
        prompt_question.text = "---";
        poll_option_model.clear();
    }

    function _changePage(pageName){
        current_page = pageName;
        toScript({type: "page_name", page: pageName});
    }

    function _populateHost(){
        poll_to_respond_title.text = poll.title;

        for (var option of poll.options){
            poll_option_model_host.append({option: option});
        }
    }
    function _populateClient() {
        _clearClient();
        prompt_question.text = poll.question;
        for (var option of poll.options){
            console.log("adding option "+ option);
            poll_option_model.append({option: option, rank: 0}) 
        }
    }
    function _populateResults(){
        tally_votes_received.text = pollStats.votesReceived;
        poll_winner.text = pollStats.winnerSelected ? pollStats.winnerName : "---";
        tally_votes_itterations.text = pollStats.winnerSelected ? pollStats.iterations : "-";
        tally_votes_counted.text = pollStats.winnerSelected ? pollStats.votesCounted : "-";
    }

    // Messages from script
    function fromScript(message) {
        switch (message.type){
        // Switch view to the create poll view
        case "create_poll":
            _clearHost()

            // Show host page
            _changePage("poll_host_view");

            // Set variables
            isHost = true
            
            break;

        // Add poll info to the list of active polls
        case "new_poll":
            active_polls.append(message.poll);
            break;
        
        // Populate the client view of the current question and options
        case "poll_prompt":
            active_polls_list.index_selected = -1; // Unselect whatever poll was selected (If one was selected)

            // Clear options
            _clearClient();

            poll = message.poll;
            pollStats = message.pollStats;

            // Set values
            _populateClient()

            if (isHost) return; 

            _changePage("poll_client_view");

            // Clear the results page
            _populateResults();

            // Set the options
            break;

        // Close the poll and remove it from the list of active polls
        case "close_poll":
            if (message.changePage == true) _changePage("poll_list");

            // Find the poll with the matching ID and remove it from active polls
            for (var i = 0; i < active_polls.count; i++) {
                var element = active_polls.get(i);
                if (element.id == message.poll.id) {
                    active_polls.remove(i);
                }
            }

            // Set variables
            isHost = false
            poll_to_create_host_can_vote.checked = false;

            break;
        case "poll_winner":
            pollStats = message.pollStats;
            _populateResults();
            votesTallied = true;
            break;
        case "received_vote":
            pollStats = message.pollStats;
            _populateResults();
            break;
        case "switch_page":
            current_page = message.page;
            if (message.poll) poll = message.poll;
            if (message.pollStats) pollStats = message.pollStats;
            if (message.isHost) isHost = true;

            if (message.page == "poll_client_view") {
                _populateClient();
                if (isHost) _populateHost();
            }
            if (message.page == "poll_results") {
                _populateClient();
                _populateResults();
                if (isHost) _populateHost();
            };
            if (message.page == "poll_host_view"){
                if (isHost) _populateHost();
            }
            break;
        }
    }

    // Send message to script
    function toScript(packet){
        sendToScript(packet)
    }
}

