const NODE_ENV = process.env.NODE_ENV || "development"

let config = {
	/** The environment to use when building the project */
	env: NODE_ENV,

	// PRODUCTION, STAGING, LOCAL
	target_env: "PRODUCTION",

	// ELECTRON, UWP
	target: "ELECTRON",

	/** The full path to the project's root directory */
	basePath: __dirname,

	/** The name of the directory containing the application source code */
	srcDir: "src",

	/** The name of the directory in which to emit compiled assets */
	outDir: "dist",

	/** The base path for all projects assets (relative to the website root) */
	publicPath: "/",

	/** A hash map of variables and their values to expose globally */
	globals: {},

	/** A hash map of keys that the compiler should treat as external to the project */
	externals: [
		"ajv", "bindings", "threads", "leveldown",
		"usb", "noble", "noble-mac",
		"serialport", "bluetooth-serial-port", "node-bluetooth",
		"@nodert-win10/windows.devices.radios",
		"@nodert-win10/windows.storage.streams",
		"@nodert-win10/windows.devices.enumeration",
		"@nodert-win10/windows.devices.bluetooth",
		"@nodert-win10/windows.devices.bluetooth.advertisement",
		"@nodert-win10/windows.devices.bluetooth.genericattributeprofile",
		"@nodert-win10/windows.system",
		"@nodert-win10/windows.foundation"
	],

	debug: false,
	debugDevice: false,
	debugCloud: false,

	// CONSOLE, FILE, BOTH
	loggerType: "CONSOLE",

	BTCL: true,
	BTLE: true,

	updateSelect: {
		LOCAL: {
			url: "http://10.185.3.114/update/"
		},

		STAGING: {},

		PRODUCTION: {
			url: "https://app-inkspace.wacom.com/update/"
		}
	},

	syncSelect: {
		LOCAL: {
			syncUrl: "ws://127.0.0.1:5000/sync"
		},

		STAGING: {
			syncUrl: "wss://stage-api-inkspace.wacom.com/sync"
		},

		PRODUCTION: {
			syncUrl: "wss://api-inkspace.wacom.com/sync"
		}
	},

	hwrSelect: {
		LOCAL: {
			searchURL: "https://stage-inkspace.wacom.com/api/export/textsearch",
			export: {
				txt: "https://stage-inkspace.wacom.com/api/export/text",
				doc: "https://stage-inkspace.wacom.com/api/export/doc",
				videoRequest: "https://stage-inkspace.wacom.com/api/export/request-video",
				video: "https://stage-inkspace.wacom.com/video/{TaskID}"
			}
		},

		STAGING: {
			searchURL: "https://stage-inkspace.wacom.com/api/export/textsearch",
			export: {
				txt: "https://stage-inkspace.wacom.com/api/export/text",
				doc: "https://stage-inkspace.wacom.com/api/export/doc",
				videoRequest: "https://stage-inkspace.wacom.com/api/export/request-video",
				video: "https://stage-inkspace.wacom.com/video/{TaskID}"
			}
		},

		PRODUCTION: {
			searchURL: "https://inkspace.wacom.com/api/export/textsearch",
			export: {
				txt: "https://inkspace.wacom.com/api/export/text",
				// txt: "http://10.185.6.22:5000/export/text",
				doc: "https://inkspace.wacom.com/api/export/doc",
				videoRequest: "https://inkspace.wacom.com/api/export/request-video",
				video: "https://inkspace.wacom.com/video/{TaskID}"
			},
		}
	},

	uaTrackingID: "UA-41423377-7",
	crashReportURL: "http://40.117.159.88:3389/crashreports",

	btInstructionsUrl: {
		VIPER: "http://www.wacom.com/start/intuos-pro-paper",
		COLUMBIA_CREATIVE: "http://www.wacom.com/start/sketchpad-pro",
		COLUMBIA_CONSUMER: "http://www.wacom.com/start/sketchpad-pro"
	},

	authenticationSelect: {
		LOCAL: {
			secret: "pChcbN*}y*T(QLqGIF|mhtROvdCzVrQV",
			requestSessionUrl: "https://stage-accounts-inkspace.wacom.com/wacom-id-ui/api/request-session",
			loginUrl: "https://stage-accounts-inkspace.wacom.com/wacom-id-ui/",
			queryAccessTokenUrl: "https://stage-accounts-inkspace.wacom.com/wacom-id-ui/api/get-access-token",
			createAssetUrl: "https://stage-accounts-inkspace.wacom.com/wacom-id-ui/api/create-asset",
			refreshAccessTokenUrl: "https://stage-inkspace.wacom.com/api/refreshserver/refresh-access-token",
			accountUrl: "https://account.wacom.com"
		},

		STAGING: {
			secret: "pChcbN*}y*T(QLqGIF|mhtROvdCzVrQV",
			requestSessionUrl: "https://stage-accounts-inkspace.wacom.com/wacom-id-ui/api/request-session",
			loginUrl: "https://stage-accounts-inkspace.wacom.com/wacom-id-ui/",
			queryAccessTokenUrl: "https://stage-accounts-inkspace.wacom.com/wacom-id-ui/api/get-access-token",
			createAssetUrl: "https://stage-accounts-inkspace.wacom.com/wacom-id-ui/api/create-asset",
			refreshAccessTokenUrl: "https://stage-inkspace.wacom.com/api/refreshserver/refresh-access-token",
			accountUrl: "https://account.wacom.com"
		},

		PRODUCTION: {
			secret: "pChcbN*}y*T(QLqGIF|mhtROvdCzVrQV",
			requestSessionUrl: "https://accounts-inkspace.wacom.com/wacom-id-ui/api/request-session",
			loginUrl: "https://accounts-inkspace.wacom.com/wacom-id-ui/",
			queryAccessTokenUrl: "https://accounts-inkspace.wacom.com/wacom-id-ui/api/get-access-token",
			createAssetUrl: "https://accounts-inkspace.wacom.com/wacom-id-ui/api/create-asset",
			refreshAccessTokenUrl: "https://inkspace.wacom.com/api/refreshserver/refresh-access-token",
			accountUrl: "https://account.wacom.com"
		}
	},

	locales: {
		"da-DK": "Dansk (Danmark)",
		"de-DE": "Deutsch (Deutschland)",
		"en-US": "English (United States)",
		"es-ES": "Español (España)",
		"fi-FI": "Suomi (Suomi)",
		"fr-FR": "Français (France)",
		"it-IT": "Italiano (Italia)",
		"ja-JP": "日本語 (日本)",
		"ko-KR": "한국어 (대한민국)",
		// "nb-NO": "Norsk Bokmål (Norge)",
		"no-NO": "Norsk Bokmål (Norge)",
		"nl-NL": "Nederlands (Nederland)",
		"pl-PL": "Polski (Polska)",
		"pt-BR": "Português (Brasil)",
		"pt-PT": "Português (Portugal)",
		"ru-RU": "Русский (Россия)",
		"sv-SE": "Svenska (Sverige)",
		// Simplified Chinese
		"zh-CN": "中文 (简体中文)",
		// Traditional Chinese
		"zh-TW": "中文 (繁體中文)"
	},

	displayLocales: [
		"de-DE",
		"en-US",
		"es-ES",
		"fr-FR",
		"it-IT",
		"pl-PL",
		"pt-PT",
		"pt-BR",
		"ru-RU",
		"ko-KR",
		"ja-JP",
		"zh-CN",
		"zh-TW"
	],

	noteLocales: [
		"da_DK",
		"de_DE",
		"en_US",
		"es_ES",
		"fi_FI",
		"fr_FR",
		"it_IT",
		// "nb_NO",
		"no_NO",
		"nl_NL",
		"pl_PL",
		"pt_BR",
		"pt_PT",
		"ru_RU",
		"sv_SE",
		"ko_KR",
		"ja_JP",
		"zh_CN",
		"zh_TW"
	],

	langToLocale: {
		da: "da_DK",
		de: "de_DE",
		en: "en_US",
		es: "es_ES",
		fi: "fi_FI",
		fr: "fr_FR",
		it: "it_IT",
		ja: "ja_JP",
		ko: "ko_KR",
		nb_NO: "no_NO",
		no_NO: "no_NO",
		nl: "nl_NL",
		pl_PL: "pl_PL",
		pt_PT: "pt_PT",
		pt: "pt_BR",
		ru: "ru_RU",
		sv: "sv_SE",
		zh_CN: "zh_CN",
		zh_TW: "zh_TW"
	}
};

Object.defineProperty(config, "update", {value: config.updateSelect[config.target_env]});
Object.defineProperty(config, "sync", {value: config.syncSelect[config.target_env]});
Object.defineProperty(config, "hwr", {value: config.hwrSelect[config.target_env]});
Object.defineProperty(config, "authentication", {value: config.authenticationSelect[config.target_env]});

module.exports = config;
