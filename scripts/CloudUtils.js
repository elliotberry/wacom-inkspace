let CloudUtils = {
	init() {
		this.byteToHex = [];

		for (var i = 0; i < 256; ++i)
			this.byteToHex[i] = (i + 0x100).toString(16).substr(1);
	},

	bufferToUuid(content) {
		let result = [];

		for (let i = 0; i < content.length; i++) {
			result.push(this.byteToHex[content[i]]);

			if (i == 3 || i == 5 || i == 7 || i == 9)
				result.push("-");
		}

		return result.join("");
	},

	uuidToBuffer(guid) {
		return Buffer.from(guid.replace(/-/g, ""), "hex");
	}
};

CloudUtils.init();

module.exports = CloudUtils;
