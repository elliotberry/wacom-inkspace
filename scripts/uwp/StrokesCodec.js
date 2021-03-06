let StrokesCodec = {
	brush: null,

	encode(strokes) {
		return {
			strokes: Buffer.from(Module.InkEncoder.encode(strokes).buffer).toString("base64"),
			meta: strokes.map(stroke => ({creationDate: stroke.timestamp || 0, pointsRate: stroke.pointsRate || 0, autoGeneratedPointsRate: !!stroke.autoGeneratedPointsRate}))
		};
	},

	decode(brush, strokes) {
		this.brush = brush;

		return strokes.map(data => {
			let stroke = Module.Stroke.fromJSON(brush, data);

			if (data.creationDate) stroke.timestamp = data.creationDate;
			if (data.pointsRate) stroke.pointsRate = data.pointsRate;
			if (data.autoGeneratedPointsRate) stroke.autoGeneratedPointsRate = data.autoGeneratedPointsRate;

			return stroke;
		});
	},

	decodePathPart(brush, data) {
		this.brush = brush;
		return Module.InkDecoder.decode(new Uint8Array(Buffer.from(data, "base64")));
	}
};

Module.addPostScript(() => Module.InkDecoder.getStrokeBrush = (paint) => StrokesCodec.brush);

module.exports = StrokesCodec;
