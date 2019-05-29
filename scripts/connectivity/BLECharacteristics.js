let settings = {
	COMMAND_WRITE: {
		name: "COMMAND_WRITE",
		value: null,
		channel: NaN,
		listener: null
	},

	COMMAND_NOTIFY: {
		name: "COMMAND_NOTIFY",
		value: null,
		channel: 1,
		listener: null
	},

	EVENTS_NOTIFY: {
		name: "EVENTS_NOTIFY",
		value: null,
		channel: 2,
		listener: null
	},

	REAL_TIME_NOTIFY: {
		name: "REAL_TIME_NOTIFY",
		value: null,
		channel: 2,
		listener: null
	},

	REAL_TIME_INDICATE: {
		name: "REAL_TIME_INDICATE",
		value: null,
		channel: 2,
		listener: null
	},

	FILE_TRANSFER_NOTIFY: {
		name: "FILE_TRANSFER_NOTIFY",
		value: null,
		channel: 3,
		listener: null
	},

	FILE_TRANSFER_INDICATE: {
		name: "FILE_TRANSFER_INDICATE",
		value: null,
		channel: 3,
		listener: null
	}
};

class BLECharacteristics {
	constructor() {}

	get(type) {
		return settings[type.name].value;
	}

	set(type, value) {
		if (!value) throw new Error(type.name + " characteristic not found");

		value.name = type.name;
		value.type = this.getKind(type);
		value.channel = settings[type.name].channel;
		Object.defineProperty(value, "listener", {get: () => this.getListener(type)});

		settings[type.name].value = value;
	}

	values(all) {
		let result = [];

		Object.values(settings).forEach(config => {
			if (config.value && (all || config.listener))
				result.push(config.value);
		});

		return result;
	}

	close() {
		Object.values(settings).forEach(config => {
			config.value = null;
		});
	}

	getListener(type) {
		return (...args) => settings[type.name].listener(settings[type.name].value, ...args);
	}

	setListener(type, listener) {
		settings[type.name].listener = listener;
	}

	getKind(type) {
		if (type == BLECharacteristics.CharacteristicType.REAL_TIME_INDICATE || type == BLECharacteristics.CharacteristicType.FILE_TRANSFER_INDICATE)
			return "indicate";
		else
			return "notify";
	}
}

BLECharacteristics.createEnum("CharacteristicType", ["COMMAND_WRITE", "COMMAND_NOTIFY", "EVENTS_NOTIFY", "REAL_TIME_NOTIFY", "REAL_TIME_INDICATE", "FILE_TRANSFER_NOTIFY", "FILE_TRANSFER_INDICATE"]);

module.exports = BLECharacteristics;
