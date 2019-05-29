const DrawingTool = require("./DrawingTool");

let DrawingToolsBox = {
	init() {
		this.pens = {
			VIPER: {
				DEFAULT: DrawingTool.createBallPen("VIPER"),
				BALL: DrawingTool.createBallPen("VIPER"),
				GEL: DrawingTool.createGelPen("VIPER")
			},

			COLUMBIA: {
				DEFAULT: DrawingTool.createBallPen("COLUMBIA"),
				BALL: DrawingTool.createBallPen("COLUMBIA"),
				GEL: DrawingTool.createGelPen("COLUMBIA")
			},

			BROWSER: {
				DEFAULT: DrawingTool.createBallPen("BROWSER")
			}
		};

		this.pen = this.pens["BROWSER"]["DEFAULT"];
		this.eraser = DrawingTool.createEraser();
	},

	getPen(deviceType, penType) {
		let pens = this.pens[deviceType.split("_")[0]];

		if (!pens) {
			console.warn(`Unknown device detected: ${deviceType[0]}`);
			pens = this.pens["VIPER"];
		}

		let pen = pens[DrawingTool.PenType[penType].name];

		if (!pen) {
			console.warn(`Unknown pen detected (DeviceType / PenType / Pen): ${deviceType.split("_")[0]} / ${penType} / ${DrawingTool.PenType[penType] ? DrawingTool.PenType[penType].name : "unknown"}`);
			pen = pens["DEFAULT"];
		}

		return pen;
	}
};

Module.addPostScript(() => DrawingToolsBox.init());

module.exports = DrawingToolsBox;
