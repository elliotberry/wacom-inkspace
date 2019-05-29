let TEXTURES_PATH = "";

class DrawingTool {
	constructor(name, type, id) {
		if (id) this.id = id;
		this.name = name;
		this.type = type || DrawingTool.Type.STROKE;
		this.width = (this.type == DrawingTool.Type.SELECTOR)?1.25:NaN;
		this.pathBuilders = new Object();
		this.pathBuilderType = DrawingTool.PathBuilderType.SPEED;
		this.strokeLayerBlendMode = Module.BlendMode.NORMAL;
	}

	createBrush(type, blendMode) {
		if (type == DrawingTool.BrushType.DIRECT)
			this.brush = new Module.DirectBrush();
		else if (type == DrawingTool.BrushType.SOLID_COLOR)
			this.brush = new Module.SolidColorBrush();
		else
			this.brush = new Module.ParticleBrush(false);

		if (blendMode && type != DrawingTool.BrushType.SOLID_COLOR)
			this.brush.blendMode = blendMode;

		if (this.id)
			this.brush.id = this.id;
	}

	configureParticleBrush(randomizeFill, spacing, scattering, rotationMode, shape, fill) {
		this.brush.configure(randomizeFill, {x: 0, y: 0}, spacing, scattering, rotationMode);
		this.brush.configureShape(this.getImageSRC(shape));
		this.brush.configureFill(this.getImageSRC(fill));
	}

	getImageSRC(imageName) {
		var result;
		var src = TEXTURES_PATH + "/" + imageName;

		if (imageName.indexOf(".") == -1) {
			result = new Array();
			// var sizes = [128, 64, 32, 16, 8, 4, 2, 1];
			var sizes = [128, 64, 32, 16, 8];

			sizes.forEach(function(size) {
				result.push(src + "_" + size + "x" + size + ".png");
			}, this);
		}
		else
			result = src;

		return result;
	}

	createPathBuilder(pathBuilderType, movementThreshold) {
		var className = DrawingTool.PathBuilderClassNames[pathBuilderType.name];
		var pathBuilder = new Module[className];
		if (movementThreshold) pathBuilder.setMovementThreshold(movementThreshold);

		this.pathBuilders[pathBuilderType.name] = pathBuilder;
		this.pathBuilder = pathBuilder;
	}

	configureNormalization(minValue, maxValue) {
		this.pathBuilder.setNormalizationConfig(minValue, maxValue);
	}

	configureWidthChanel(minValue, maxValue, initialValue, finalValue, propertyFunction, functionParameter, flip) {
		this.pathBuilder.setPropertyConfig(Module.PropertyName.Width, minValue, maxValue, initialValue, finalValue, propertyFunction, functionParameter, flip);
	}

	configureAlphaChanel(minValue, maxValue, initialValue, finalValue, propertyFunction, functionParameter, flip) {
		this.pathBuilder.setPropertyConfig(Module.PropertyName.Alpha, minValue, maxValue, initialValue, finalValue, propertyFunction, functionParameter, flip);
	}

	createSmoothener() {
		this.pathBuilder.smoothener = new Module.MultiChannelSmoothener(this.pathBuilder.stride);
		this.smoothener = this.pathBuilder.smoothener;
	}

	activatePathBuilder(pathBuilderType) {
		this.pathBuilderType = pathBuilderType;
		this.pathBuilder = this.pathBuilders[pathBuilderType.name];
		this.smoothener = this.pathBuilder.smoothener;

		this.variableWidth = this.pathBuilder.stride == 4 || (this.pathBuilder.stride == 3 && isNaN(this.width));
		this.variableAlpha = this.pathBuilder.stride == 4 || (this.pathBuilder.stride == 3 && !isNaN(this.width));
	}

	preparePathBuilder(e, inputPhase) {
		if (inputPhase == Module.InputPhase.Begin) {
			delete this.pathBuilderType;

			if (this.pathBuilders["PRESSURE"] && !isNaN(this.getPressure(e)))
				this.activatePathBuilder(DrawingTool.PathBuilderType.PRESSURE);
			else
				this.activatePathBuilder(DrawingTool.PathBuilderType.SPEED);
		}

		if (this.pathBuilderType == DrawingTool.PathBuilderType.PRESSURE)
			this.pathBuilderValue = this.getPressure(e);
		else
			this.pathBuilderValue = Date.now()/1000;
	}

	getPressure(e) {
		var pressure = NaN;

		if (window.PointerEvent && e instanceof PointerEvent) {
			// if (e.pointerType == "pen")
			if (this.pathBuilderType == DrawingTool.PathBuilderType.PRESSURE || e.pressure !== 0.5)
				pressure = e.pressure;
		}

		return pressure;
	}

	delete() {
		if (this.brush)
			this.brush.delete();

		for (let name in this.pathBuilders) {
			this.pathBuilders[name].smoothener.delete();
			this.pathBuilders[name].delete();
		}
	}
}

DrawingTool.createEnum("Type", ["STROKE", "ERASER", "SELECTOR"]);
DrawingTool.createEnum("BrushType", ["DIRECT", "SOLID_COLOR", "PARTICLE"]);
DrawingTool.createEnum("PathBuilderType", ["SPEED", "PRESSURE"]);

DrawingTool.PathBuilderClassNames = {
	"SPEED": "SpeedPathBuilder",
	"PRESSURE": "PressurePathBuilder"
};

DrawingTool.createEnum("PenType", ["DEFAULT", "BALL", "PENCIL", "GEL"]);

// setNormalizationConfig(minValue, maxValue);
// setPropertyConfig(propertyName, minValue, maxValue, initialValue, finalValue, propertyFunction, functionParameter, flip);
module.exports = {
	Type: DrawingTool.Type,
	PenType: DrawingTool.PenType,
	PathBuilderType: DrawingTool.PathBuilderType,

	createBallPen(inputType) {
		let tool = new DrawingTool("BallPen", DrawingTool.Type.STROKE);
		tool.createBrush(DrawingTool.BrushType.SOLID_COLOR);

		tool.createPathBuilder(DrawingTool.PathBuilderType.SPEED);
		tool.configureNormalization(100, 4000);
		tool.configureWidthChanel(1, 2, NaN, NaN, Module.PropertyFunction.Power, 1, false);
		tool.createSmoothener();

		tool.createPathBuilder(DrawingTool.PathBuilderType.PRESSURE);

		if (inputType == "VIPER")
			tool.configureNormalization(150, 8192);
		else if (inputType == "COLUMBIA")
			tool.configureNormalization(334, 2047);
		else if (inputType == "BROWSER")
			tool.configureNormalization(0, 1);
		else
			throw new Error("createBallPen - unknown inputType " + inputType);

		tool.configureWidthChanel(1, 2, NaN, NaN, Module.PropertyFunction.Power, 1, false);

		tool.createSmoothener();

		return tool;
	},

	createPencil() {
		let tool = new DrawingTool("Pencil", DrawingTool.Type.STROKE, 2);
		tool.createBrush(DrawingTool.BrushType.SOLID_COLOR);

		tool.createPathBuilder(DrawingTool.PathBuilderType.SPEED);
		tool.configureNormalization(5, 1004);
		tool.configureWidthChanel(0.75, 1, NaN, NaN, Module.PropertyFunction.Power, 0.5, false);
		tool.createSmoothener();

		tool.createPathBuilder(DrawingTool.PathBuilderType.PRESSURE);
		tool.configureNormalization(5, 1004);
		tool.configureWidthChanel(0.75, 1, NaN, NaN, Module.PropertyFunction.Power, 0.5, false);
		tool.createSmoothener();

		/*
		let tool = new DrawingTool("Pencil", DrawingTool.Type.STROKE, 2);
		tool.createBrush(DrawingTool.BrushType.PARTICLE);
		tool.configureParticleBrush(true, 0.15, 0.15, Module.RotationMode.RANDOM, "essential_shape_11.png", "essential_fill_11.png");

		tool.createPathBuilder(DrawingTool.PathBuilderType.SPEED);
		tool.configureNormalization(80, 1400);
		tool.configureWidthChanel(2*2, 2.5*2, NaN, NaN, Module.PropertyFunction.Power, 1, true);
		tool.configureAlphaChanel(0.05, 0.2, NaN, NaN, Module.PropertyFunction.Power, 1, true);
		tool.createSmoothener();

		tool.createPathBuilder(DrawingTool.PathBuilderType.PRESSURE);
		tool.configureNormalization(0.195, 0.88);
		tool.configureWidthChanel(2*2, 2.5*2, NaN, NaN, Module.PropertyFunction.Power, 1, false);
		tool.configureAlphaChanel(0.05, 0.2, NaN, NaN, Module.PropertyFunction.Power, 1, false);
		tool.createSmoothener();
		*/

		return tool;
	},

	createGelPen(inputType) {
		let tool = new DrawingTool("GelPen", DrawingTool.Type.STROKE);
		tool.createBrush(DrawingTool.BrushType.SOLID_COLOR);

		tool.createPathBuilder(DrawingTool.PathBuilderType.SPEED);
		tool.configureNormalization(5, 1004);
		tool.configureWidthChanel(0.5, 1, NaN, NaN, Module.PropertyFunction.Power, 0.5, false);
		tool.createSmoothener();

		tool.createPathBuilder(DrawingTool.PathBuilderType.PRESSURE);

		if (inputType == "VIPER")
			tool.configureNormalization(150, 8192);
		else if (inputType == "COLUMBIA")
			tool.configureNormalization(334, 2047);
		else
			throw new Error("createGelPen - unknown inputType " + inputType);

		tool.configureWidthChanel(0.5, 1, NaN, NaN, Module.PropertyFunction.Power, 0.5, false);
		tool.createSmoothener();

		return tool;
	},

	createEraser() {
		let tool = new DrawingTool("Eraser", DrawingTool.Type.ERASER);

		tool.createPathBuilder(DrawingTool.PathBuilderType.SPEED);
		tool.configureNormalization(720, 3900);
		tool.configureWidthChanel(8, 112, 4, 4, Module.PropertyFunction.Power, 1, false);
		tool.createSmoothener();

		return tool;
	},

	createSelector() {
		let tool = new DrawingTool("Selector", DrawingTool.Type.SELECTOR);
		tool.createBrush(DrawingTool.BrushType.DIRECT);

		tool.createPathBuilder(DrawingTool.PathBuilderType.SPEED);
		tool.createSmoothener();

		tool.color = Module.Color.from(0, 151, 212);
		// tool.color = Module.Color.from(134, 134, 134);

		return tool;
	}
};
