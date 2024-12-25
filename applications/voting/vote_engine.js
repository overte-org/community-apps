/* 
[
	["<NAME>", "<NAME>", "<NAME>", "<NAME>", "<NAME>"], // Each entry in the array is an array of strings.
	["<NAME>", "<NAME>", "<NAME>", "<NAME>", "<NAME>"], // Each entry is a separate vote received from a participant.
	["<NAME>", "<NAME>", "<NAME>", "<NAME>" ],			// There may be entries missing as a form of "non-vote"
	[ ] 												// There may just be an empty array.		
]
*/

let ballotsStorage = [];
let iterations = 0;

function preformVote(arrayOfBallots) {
	if (ballotsStorage.length === 0) {
		ballotsStorage = arrayOfBallots
		print(JSON.stringify(ballotsStorage, null, 4));
	};

	const totalAmountOfVotes = ballotsStorage.length;
	let firstChoices = {};

	if (totalAmountOfVotes === 0) return null; // No votes, no results.
	iterations++;

	// Go though each ballot and count the first choice for each
	for (let ballotIndex = 0; ballotIndex < totalAmountOfVotes; ballotIndex++) {
		const firstChoice = ballotsStorage[ballotIndex][0];

		// Convert "undefined" to "-1" as a non vote.
		if (!firstChoice) {
			if (!firstChoices["-1"]) firstChoices["-1"] = 0;
			firstChoices["-1"]++; 
			continue;
		}

		// Keep track of the most preferred candidate.
		if (!firstChoices[firstChoice]) firstChoices[firstChoice] = 0;
		firstChoices[firstChoice]++;
	}

	// At this point we have a map of the first choices.
	// Now we need to find the candidates that have the lowest amount of votes.
	// Exclude candidates that have a name of "-1". This is considered a non vote.
	// We look for the lowest voted for candidate, take their amount of votes, and look for other candidates that share this value.
	let lowestVoteAmount = Infinity;
	let highestVoteAmount = -Infinity;
	let highestVoteCandidate = "";
	let candidatesWithSameHighestVote = []; // Array of the highest voted for candidates

	// Find the lowest amount of votes for a candidate
	Object.keys(firstChoices).forEach((candidate) => { 
		if (firstChoices[candidate] > highestVoteAmount) {
			highestVoteAmount = firstChoices[candidate];
			highestVoteCandidate = candidate;
		};

		if (candidate === "-1") return; // Never eliminate -1
		if (firstChoices[candidate] < lowestVoteAmount) lowestVoteAmount = firstChoices[candidate];
	});

	// print(JSON.stringify(firstChoices, null, 4));
	// Check to see if there are multiple candidates with the highest amount of votes
	Object.keys(firstChoices).forEach((candidate) => { 
		// print(`Is ${firstChoices[candidate]} == ${highestVoteAmount}?`);
		if (firstChoices[candidate] == highestVoteAmount) {
			candidatesWithSameHighestVote.push(candidate);
			// print(`Pushing ${candidate}`);
		}
	});

	// Check to see if we have a winner.
	// A winner is chosen when they have a total vote amount that is more than half of the total votes.
	// print(`Is ${highestVoteAmount} > ${Math.floor(ballotsStorage.length / 2)}`);
	// Simple check for a winner.
	if (highestVoteAmount > Math.floor(ballotsStorage.length / 2) && candidatesWithSameHighestVote.length == 1) {
		const returnValue = {name: highestVoteCandidate, iterations: iterations};
		iterations = 0; // Reset iterations.
		ballotsStorage = []; // Reset the ballots array.
		print("Normal exit");
		return returnValue;
	}

	/* 
	[ "Hello", "World", "Goodbye", "-1" ],
	[ "World", "Hello", "Goodbye", "-1" ],
	[ "Hello", "World", "Goodbye"      	],
	[ "World", 							],	
	[ 		 							],	
	*/

	// TODO: Check to see if this tie handling works. 
	if(candidatesWithSameHighestVote.length > 1 && candidatesWithSameHighestVote.length == Object.keys(firstChoices).length){
		// We have a tie, show the tie
		const returnValue = {name: candidatesWithSameHighestVote, iterations: iterations, tie: true};
		iterations = 0; // Reset iterations.
		ballotsStorage = []; // Reset the ballots array.
		print("Tie exit");
		return returnValue;
	}

	// Make a list of candidates that share the lowest vote
	// These will be the candidates that will be removed before the next "round/iteration" of elimination
	let candidatesWithSameLowestVote = [];

	Object.keys(firstChoices).forEach((candidate) => { 
		if (candidate === "-1") return;
		
		if (firstChoices[candidate] == lowestVoteAmount) candidatesWithSameLowestVote.push(candidate);
	});

	print(`Lowest amount of votes: ${lowestVoteAmount}`);
	print(`Removing candidates: ${candidatesWithSameLowestVote}`);

	// Remove all candidates with the lowest vote amount from the first choices
	for (let ballotIndex = 0; ballotIndex < totalAmountOfVotes; ballotIndex++) {
		const firstChoice = ballotsStorage[ballotIndex][0];

		if (candidatesWithSameLowestVote.includes(firstChoice)) { 
			ballotsStorage[ballotIndex].shift(); // Remove the first choice from this ballot
		}
	}

	return preformVote(ballotsStorage);
}

module.exports = { preformVote };
