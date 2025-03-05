const canvas = document.querySelector('canvas');

function drawNamePlate(name = "", userUUID = "", hasGroup = false, groupBannerURL = "", tagWidth = 3000, groupBannerHeight = 600, nameTagHeight = 500) {
	let ctx = canvas.getContext("2d");

	// Set the canvas size to match tagWidth and a suitable height
	canvas.width = tagWidth;
	canvas.height = groupBannerHeight + nameTagHeight;

	if (hasGroup) {
		console.log("Has group")
		const backgroundImage = new Image();
		backgroundImage.setAttribute('crossorigin', 'anonymous');
		backgroundImage.src = groupBannerURL;

		backgroundImage.onload = function () {
			// Calculate the scale factor to maximize one dimension within the available space
			const scaleFactorX = groupBannerHeight / backgroundImage.height;
			const scaleFactorY = tagWidth / backgroundImage.width;
			const scaleFactor = Math.max(scaleFactorX, scaleFactorY);

			// Calculate new dimensions for the image while maintaining aspect ratio
			const newWidth = backgroundImage.width * scaleFactor;
			const newHeight = backgroundImage.height * scaleFactor;

			// Calculate the vertical offset to center the image vertically within the banner area
			const yPosition = (groupBannerHeight - newHeight) / 2;

			// Save the current state of the canvas
			ctx.save();

			// Set up clipping path for the top part of the canvas
			ctx.beginPath();
			ctx.rect(0, 0, tagWidth, groupBannerHeight);
			ctx.clip();

			// Draw the image starting from (0, yPosition)
			ctx.drawImage(backgroundImage, 0, yPosition, newWidth, newHeight);

			// Restore the previous state of the canvas
			ctx.restore();

			EventBridge.emitWebEvent(JSON.stringify({
				action: "nameplateReady",
				data: {
					imageBase64: getImageBase64(),
					userUUID: userUUID
				}
			}));
		};
	}

	// Nametag background with inset border
	const radius = 30; // Define the radius of the rounded corners

	// Main fill color
	ctx.fillStyle = "#111111ee";
	ctx.strokeStyle = "black";
	drawRoundedRectangle(ctx, 0, groupBannerHeight, tagWidth, nameTagHeight, radius);
	ctx.fill();

	// Inset border color
	ctx.strokeStyle = "#6667ab";
	ctx.lineWidth = 20; // Set the stroke width
	drawRoundedRectangle(ctx, 20, groupBannerHeight + 20, tagWidth - 40, nameTagHeight - 40, radius - 10);
	ctx.stroke();

	ctx.fillStyle = "#111111ee";
	ctx.strokeStyle = "black";

	ctx.font = '256px Arial'; // Set font size and type
	ctx.fillStyle = 'white'; // Set text color

	const nameTag = name;
	const nameTagTextWidth = ctx.measureText(nameTag).width; // Measure the width of the text
	const nameTagXPosition = (tagWidth / 2) - (nameTagTextWidth / 2); // Calculate the center position

	ctx.shadowColor = "black";
	ctx.shadowBlur = 10;
	ctx.lineWidth = 8;

	ctx.strokeText(nameTag, nameTagXPosition - 4, groupBannerHeight + 4 + (nameTagHeight + 150) / 2);
	ctx.fillText(nameTag, nameTagXPosition, groupBannerHeight + (nameTagHeight + 150) / 2); // Draw the text at the calculated position

	if (!hasGroup) {
		EventBridge.emitWebEvent(JSON.stringify({
			action: "nameplateReady",
			data: {
				imageBase64: getImageBase64(),
				userUUID: userUUID
			}
		}));
	}

}

function drawRoundedRectangle(ctx, x, y, width, height, radius) {
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
}

function getImageBase64() {
	return canvas.toDataURL('image/png');
}

EventBridge.scriptEventReceived.connect(function (event) {
	let eventPacket = {};
	try {
		eventPacket = JSON.parse(event);
	} catch {
		return;
	}

	if (eventPacket.action === 'generateNameplate') {
		drawNamePlate(eventPacket.data.name, eventPacket.data.userUUID, eventPacket.data.hasGroup, eventPacket.data.groupBannerURL);
	}
})