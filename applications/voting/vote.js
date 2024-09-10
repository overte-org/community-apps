//
//  vote.js
//
//  App to simplify the tallying of votes for Community Meetings
//
//  Created by Armored Dragon, 2024.
//  Copyright 2024 Overte e.V.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html

/* global Script Tablet Messages MyAvatar Uuid*/

// TODO: Documentation
// TODO: Allow more than 9 candidates
// TODO: Allow host voting
// TODO: Sound for new vote
// TODO: Clear poll host view on creating new poll
// TODO: Confirm before closing poll
// TODO: Debug mode?
// FIXME: Handle ties
// FIXME: Joining poll resets everyones vote
// FIXME: Running election without votes causes max stack error

(() => {
	"use strict";
	var tablet;
	var appButton;
	var active = false;
	const debug = false;

	var poll = {id: '', title: '', description: '', host: '', question: '', options: []}; // The current poll
	var responses = {}; // All ballots received and to be used by the election function.
	let electionIterations = 0; // How many times the election function has been called to narrow down a candidate.

	const url = Script.resolvePath("./vote.qml");
	const myUuid = generateUUID(MyAvatar.sessionUUID);
	Messages.messageReceived.connect(receivedMessage);
	Messages.subscribe('ga-polls');

	tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
	appButton = tablet.addButton({
		icon: Script.resolvePath("./img/icon_white.png"),
		activeIcon: Script.resolvePath("./img/icon_black.png"),
		text: "VOTE",
		isActive: active,
	});

	// When script ends, remove itself from tablet
	Script.scriptEnding.connect(function () {
		console.log("Shutting Down");
		tablet.removeButton(appButton);
		deletePoll();
	});

	// Overlay button toggle
	appButton.clicked.connect(toolbarButtonClicked);
	tablet.fromQml.connect(fromQML);
	tablet.screenChanged.connect(onTabletScreenChanged);

	function toolbarButtonClicked() {
		if (active) tablet.gotoHomeScreen();
		else tablet.loadQMLSource(url);

		active = !active;
		appButton.editProperties({
			isActive: active,
		});
	}

	function onTabletScreenChanged(type, newUrl) {
		if (url == newUrl) {
			active = true;

			// If we are connected to a poll already, repopulate the screen
			if (poll.id != '' && poll.host != myUuid) return joinPoll({id: poll.id});

			// If we are hosting a poll, switch the screen
			if (poll.id != '' && poll.host == myUuid) {
				return _emitEvent({type: "rehost", prompt: {question: poll.question, options: poll.options}});
			}

			// Request a list of active polls if we are not already in one
			if (poll.id == '') return getActivePolls();
		}
		else active = false;

		appButton.editProperties({
			isActive: active,
		});
	}

	// Functions

	// Get a list of active polls
	function getActivePolls() {
		// Sends a message to all hosts to send a list of their polls
		Messages.sendMessage('ga-polls', JSON.stringify({type: "populate"}));
	}

	// Create a new poll for others to join
	function createPoll(pollInformation) { 
		console.log("Creating a new poll");
		// Check if we are already hosting a poll
		if (poll.id != '') return;

		// Set our active poll data
		poll.id = generateUUID();
		poll.host = myUuid;
		poll.title = pollInformation.title;
		poll.description = pollInformation.description;
		console.log(`Active poll set as:\nid:${poll.id}\ntitle:${poll.title}\ndescription:${poll.description}`);
		responses = {}; // Clear any lingering responses

		// Send message to all clients
		Messages.sendMessage("ga-polls", JSON.stringify({type: "active_poll", poll: poll}));
		console.log("Broadcasted poll to server");

		// Subscribe to our own messages
		Messages.subscribe(poll.id);

		// Update the UI screen
		_emitEvent({type: "create_poll"});

		// Debug: Create a lot of fake ballots
		if (!debug) return;

		for (let i = 0; i < 25; ++i) {
			_debugDummyBallot();
		}
	}

	// Closes the poll and return to the main menu
	function deletePoll(){
		// Check to see if we are hosting the poll
		if (poll.host != myUuid) return; // We are not the host of this poll

		// We are in a poll
		if (poll.id == '') return;

		console.log("Closing active poll");

		// Submit the termination message to all clients
		Messages.sendMessage("ga-polls", JSON.stringify({type: "close_poll", poll: {id: poll.id}}));

		// Update the UI screen
		_emitEvent({type: "close_poll", poll: {id: poll.id}});

		// Clear our active poll data
		poll = { host: '', title: '', description: '', id: '', question: '', options: []};
	}

	// Join an existing poll hosted by another user
	function joinPoll(pollToJoin){
		// TODO: Check if poll even exists

		// Leave poll if already connected to one
		leavePoll(); 

		// Save the poll information
		poll = pollToJoin;

		// Subscribe to message mixer for poll information
		Messages.subscribe(pollToJoin.id);

		// Send join notice to server. This will cause the host to (re)emit the current poll to the server 
		Messages.sendMessage(pollToJoin.id, JSON.stringify({type: "join"}));

		// Log the successful join
		console.log(`Successfully joined ${poll.id}`);
	}

	// Leave a poll hosted by another user
	function leavePoll() { 
		let pollToLeave = poll.id;

		// Unsubscribe from message mixer for poll information
		Messages.unsubscribe(poll.id);

		// Clear poll
		poll = {id: '', host: ''}; 

		console.log(`Successfully left ${pollToLeave}`);
	}

	// Cast a vote on a poll
	function castVote(event) {
		console.log(`Casting vote to ${poll.id}`);

		// Check if poll is valid
		if (poll == undefined || poll.id == '') return;

		// Send vote to users in poll
		Messages.sendMessage(poll.id, JSON.stringify({type: "vote", ballot: event.ballot, uuid: myUuid}));
	}

	// Emit the prompt question and options to the server
	function emitPrompt(){
		if (poll.host != myUuid) return; // We are not the host of this poll

		console.log(`Clearing responses`)
		responses = {}

		console.log(`Emitting prompt`);
		Messages.sendMessage(poll.id, JSON.stringify({type: "poll_prompt", prompt: {question: poll.question, options: poll.options}}));
	}

	// Take the gathered responses and preform the election
	// TODO: Simplify logging of critical information
	// FIXME: Recursive function call
	function preformElection(){
		let firstVotes = [];
		let voteObject = {}; 

		// TODO: Debug total votes at beginning of election vs ending

		Object.keys(responses).forEach((key) => {
			let uuid = key;
			let vote = responses[uuid];

			// Assign first vote to new array
			firstVotes.push(vote[0]);
		});

		for (let i = 0; i < firstVotes.length; i++) {
			// Check if firstVotes index exists
			if (!firstVotes[i]) firstVotes[i] = -1; // FIXME: We need a special case for "Non-vote" or "Vacant?"

			// Create voteObject index if it does not exist
			if (!voteObject[firstVotes[i]]) voteObject[firstVotes[i]] = 0;

			// Increment value for each vote
			voteObject[firstVotes[i]]++
		}

		console.log(`Votes: ${JSON.stringify(voteObject, null, 4)}`);

		// Check to see if there is a majority vote
		let totalVotes = Object.keys(responses).length; // TODO: Check to make sure this value never changes.
		let majority = Math.floor(totalVotes / 2); 

		// Sort the voteObject by value in descending order
		const sortedArray = Object.entries(voteObject).sort(([, a], [, b]) => b - a); // FIXME: This works but looks ugly
		const sortedObject = Object.fromEntries(sortedArray);

		// Check the most voted for option to see if it makes up over 50% of votes
		// NOTE: Has to be *over* 50%.
		if (sortedObject[Object.keys(sortedObject)[0]] > majority) {
			// Show dialog of election statistics
			console.log(`\nWinner: ${Object.keys(sortedObject)[0]}\nElection rounds: ${electionIterations}\nVotes counted: ${totalVotes}`);
			return; // Winner was selected. We are done!
		}; 

		// If there is not a majority vote, remove the least popular candidate and call preformElection() again
		let leastPopularIndex = Object.keys(sortedObject).length - 1;
		let leastPopular = Object.keys(sortedObject)[leastPopularIndex];

		console.log(`Removing least popular: ${JSON.stringify(leastPopular, null, 4)}`);

		// Go into each vote and delete the selected least popular candidate
		Object.keys(responses).forEach((key) => {
			let uuid = key;
			// Remove the least popular candidate from each vote.
			responses[uuid].splice(responses[uuid].indexOf(leastPopular), 1);
			console.log(responses[uuid]);
		});

		// Update statistics
		electionIterations++; 

		// Run again
		preformElection();
	}

	// Create a UUID or turn an existing UUID into a string
	function generateUUID(existingUuid){
		if (!existingUuid) existingUuid = Uuid.generate(); // Generate standard UUID

		existingUuid = Uuid.toString(existingUuid); // Scripts way to turn it into a string
		return existingUuid.replace(/[{}]/g, ''); // Remove '{' and '}' from UUID string >:(
	}

	function _debugDummyBallot() {
		if (!debug) return; // Just incase...
		let ballot = getRandomOrder('C1', 'C2', 'C3', 'C4', 'C5', 'C6');

		responses[Object.keys(responses).length.toString()] = ballot;

		function getRandomOrder(...words) {
			for (let i = words.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[words[i], words[j]] = [words[j], words[i]];
			}
			return words;
		}
	}

	// Communication
	function fromQML(event) {
		console.log(`New QML event:\n${JSON.stringify(event)}`);
		
		switch (event.type) {
		case "create_poll":
			createPoll(event.poll);
			break;
		case "join_poll":
			joinPoll(event.poll);
			break;
		case "cast_vote":
			castVote(event);
			break;
		case "close_poll":
			deletePoll();
			break;
		case "prompt":
			poll.question = event.prompt.question;
			poll.options = event.prompt.options;
			emitPrompt();
			break;
		case "run_election":
			preformElection();
			break;
		}
	}
	/**
	 * Emit a packet to the HTML front end. Easy communication!
	 * @param {Object} packet - The Object packet to emit to the HTML
	 * @param {("create_poll"|"initial_settings")} packet.type - The type of packet it is
	 */
	function _emitEvent(packet = { type: "" }) {
		tablet.sendToQml(packet);
	}

	function receivedMessage(channel, message){
		// Not for us, ignore!
		if (channel !== 'ga-polls' && channel !== poll.id) return;

		console.log(`Received message on ${channel} from server:\n${JSON.stringify(message)}\n`);

		message = JSON.parse(message);

		switch (channel) {
		case "ga-polls":
			// Received a request to see our poll
			if (message.type == "populate") {
				// Send our poll information to the server if we are hosting it
				if (poll.host == myUuid) {
					Messages.sendMessage("ga-polls", JSON.stringify({type: "active_poll", poll: poll}));
				}
			}

			// Received an active poll 
			if (message.type == "active_poll") {
				// If we are not connected to a poll, list polls in the UI
				if (poll.id == '') {
					_emitEvent({type: "new_poll", poll: message.poll});
				}
			}

			// Polls closed :)
			if (message.type == "close_poll") { 
				var isOurPoll = poll.id == message.poll.id;

				// Tell UI to close poll
				_emitEvent({type: "close_poll", change_page: isOurPoll, poll: {id: message.poll.id}});

				// Unregister self from poll
				if (isOurPoll) leavePoll();
			}

			break;
		case poll.id:
			// Received poll request
			if (message.type == "join") {
				// FIXME: Does not work!
				emitPrompt();
			}

			// Received poll information
			if (message.type == "poll_prompt") {
				if (poll.host == myUuid) return; // We are the host of this poll
				console.log(`Prompt:\n ${JSON.stringify(message.prompt)}`);
				_emitEvent({type: "poll_prompt", prompt: message.prompt});
			}

			// Received a ballot 
			if (message.type == "vote") {
				// Check if we are the host
				if (poll.host != myUuid) return;

				// Record the ballot
				responses[message.uuid] = message.ballot;

				// Emit a echo so the voter knows we have received it
				// TODO:

				// console.log(JSON.stringify(responses));
			}

		}

	}
})();