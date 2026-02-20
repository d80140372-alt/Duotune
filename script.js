let ColorOneRGB = [0.85, 0.15, 0.15];
let ColorTwoRGB = [1, 0.94, 0];
let historyStack = [];
let redoStack = [];
let originalImage = null;
let selectedFormat = "png";

const imageElement = document.getElementById("image");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const spinner = document.getElementById("loading-spinner");

function formatTimestamp(date) {
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const year = date.getFullYear().toString().slice(-2);

	let hours = date.getHours();
	const minutes = date.getMinutes().toString().padStart(2, "0");
	const ampm = hours >= 12 ? "pm" : "am";

	hours = hours % 12;
	hours = hours ? hours : 12;

	return `${month}/${day}/${year} ${hours}:${minutes}${ampm}`;
}

function hexToRGB(h) {
	const hex = h.charAt(0) === "#" ? h.substring(1, 7) : h;
	return [
		parseInt(hex.substring(0, 2), 16) / 255,
		parseInt(hex.substring(2, 4), 16) / 255,
		parseInt(hex.substring(4, 6), 16) / 255
	];
}

function rgbToHex(rgb) {
	return (
		"#" +
		rgb
			.map((x) =>
				Math.round(x * 255)
					.toString(16)
					.padStart(2, "0")
			)
			.join("")
	);
}

function setLoading(isLoading) {
	spinner.style.display = isLoading ? "flex" : "none";
	imageElement.style.display = "block";
	if (isLoading) imageElement.classList.add("is-loading");
	else imageElement.classList.remove("is-loading");
}

function applyDuotone() {
	if (!originalImage) return;

	canvas.width = originalImage.width;
	canvas.height = originalImage.height;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(originalImage, 0, 0);

	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const data = imageData.data;

	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

		data[i] = Math.round(
			(ColorOneRGB[0] * (1 - brightness) + ColorTwoRGB[0] * brightness) * 255
		);
		data[i + 1] = Math.round(
			(ColorOneRGB[1] * (1 - brightness) + ColorTwoRGB[1] * brightness) * 255
		);
		data[i + 2] = Math.round(
			(ColorOneRGB[2] * (1 - brightness) + ColorTwoRGB[2] * brightness) * 255
		);
	}

	ctx.putImageData(imageData, 0, 0);
	imageElement.src = canvas.toDataURL();

	setLoading(false);
	updateHistoryPanel();
}

function saveState() {
	const imageSrc = $("#image").attr("src") || "";
	historyStack.push({
		imageSrc,
		ColorOneRGB: [...ColorOneRGB],
		ColorTwoRGB: [...ColorTwoRGB],
		timestamp: formatTimestamp(new Date())
	});
	redoStack = [];
	updateHistoryPanel();
}

function restoreState(state) {
	$("#image").attr("src", state.imageSrc);
	ColorOneRGB = state.ColorOneRGB;
	ColorTwoRGB = state.ColorTwoRGB;

	$("#ColOne").val(rgbToHex(ColorOneRGB));
	$("#ColTwo").val(rgbToHex(ColorTwoRGB));

	updateHistoryPanel();
}

function undo() {
	if (historyStack.length > 1) {
		redoStack.push(historyStack.pop());
		restoreState(historyStack[historyStack.length - 1]);
	}
}

function redo() {
	if (redoStack.length > 0) {
		const nextState = redoStack.pop();
		historyStack.push(nextState);
		restoreState(nextState);
	}
}

function updateHistoryPanel() {
	const historyPanel = $("#historyPanel");
	historyPanel.empty();

	historyStack.forEach((state) => {
		const historyItem = $('<div class="history-item">').text(state.timestamp);
		historyItem.on("click", () => restoreState(state));
		historyPanel.prepend(historyItem);
	});
}

function applyPresetColors(colorOne, colorTwo) {
	$("#ColOne").val(colorOne);
	$("#ColTwo").val(colorTwo);
	ColorOneRGB = hexToRGB(colorOne);
	ColorTwoRGB = hexToRGB(colorTwo);

	saveState();
	if (originalImage) applyDuotone();
}

function getRandomPreset() {
	const presets = $("#presetPanel .dropdown-item[data-colors]");
	const randomIndex = Math.floor(Math.random() * presets.length);
	return presets.eq(randomIndex);
}

function setColorsFromPickersAndApply() {
	ColorOneRGB = hexToRGB($("#ColOne").val());
	ColorTwoRGB = hexToRGB($("#ColTwo").val());
	saveState();
	if (originalImage) applyDuotone();
}

function loadImage(src) {
	setLoading(true);

	originalImage = new Image();
	originalImage.crossOrigin = "Anonymous";
	originalImage.onload = function () {
		applyDuotone();
		saveState();
	};
	originalImage.onerror = function () {
		setLoading(false);
	};
	originalImage.src = src;
}

function loadDefaultImage() {
	const url = "https://picsum.photos/700/500?" + Date.now();
	loadImage(url);
}

function handleImageUpload() {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = "image/*";
	input.onchange = function (event) {
		const file = event.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = function (e) {
			loadImage(e.target.result);
		};
		reader.readAsDataURL(file);
	};
	input.click();
}

$(document).ready(function () {
	setLoading(true);

	ColorOneRGB = hexToRGB($("#ColOne").val());
	ColorTwoRGB = hexToRGB($("#ColTwo").val());

	$("#ColOne, #ColTwo").on("change", setColorsFromPickersAndApply);
	$("#uploadBtn").on("click", handleImageUpload);

	$("#downloadBtn").on("click", function () {
		$("#historyPanel").hide();
		$("#exportFormatDropdown").toggle();
	});

	$("#exportFormatDropdown .dropdown-item[data-format]").on(
		"click",
		function () {
			selectedFormat = $(this).data("format");
			const link = document.createElement("a");
			link.href = canvas.toDataURL(`image/${selectedFormat}`);
			link.download = `duotone-image.${selectedFormat}`;
			link.click();
		}
	);

	$("#undoBtn").on("click", undo);
	$("#redoBtn").on("click", redo);

	$("#historyBtn").on("click", function () {
		$("#exportFormatDropdown").hide();
		$("#historyPanel").toggle();
	});

	$("#presetPanel .dropdown-item[data-colors]").on("click", function () {
		$("#presetPanel .dropdown-item[data-colors]").removeClass("selected");
		$(this).addClass("selected");
		const colors = $(this).data("colors").split(",");
		applyPresetColors(colors[0], colors[1]);
	});

	$("#randomPhotoBtn").on("click", function () {
		const randomPreset = getRandomPreset();
		$("#presetPanel .dropdown-item[data-colors]").removeClass("selected");
		randomPreset.addClass("selected");

		const colors = randomPreset.data("colors").split(",");
		$("#ColOne").val(colors[0]);
		$("#ColTwo").val(colors[1]);
		ColorOneRGB = hexToRGB(colors[0]);
		ColorTwoRGB = hexToRGB(colors[1]);

		saveState();
		loadDefaultImage();
	});

	const randomPreset = getRandomPreset();
	randomPreset.addClass("selected");
	const colors = randomPreset.data("colors").split(",");
	$("#ColOne").val(colors[0]);
	$("#ColTwo").val(colors[1]);
	ColorOneRGB = hexToRGB(colors[0]);
	ColorTwoRGB = hexToRGB(colors[1]);

	loadDefaultImage();
});

$(document).on("click", function (event) {
	const $t = $(event.target);
	if (!$t.closest(".sidebar-item").length) {
		$("#exportFormatDropdown").hide();
		$("#historyPanel").hide();
	}
});
