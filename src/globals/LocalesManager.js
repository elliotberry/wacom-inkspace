import {addLocaleData} from 'react-intl';

import messages from '../l10n/messages';

const project = require("../../project.config.js");

const locales = require("../../project.config.js")["locales"];
const displayLocales = require("../../project.config.js")["displayLocales"];
const noteLocales = require("../../project.config.js")["noteLocales"];

let LocalesManager = {
	locales: project.locales,
	displayLocales: project.displayLocales,
	noteLocales: project.noteLocales,

	DEFAULT_LOCALE: "en-US",
	DEFAULT_LANGUAGE: "en",

	locale: undefined,
	lang: undefined,

	defaultNoteLocale: undefined,

	init: function(settings) {
		project.displayLocales.forEach(locale => {
			let lang = locale.split("-")[0];
			addLocaleData(require(`react-intl/locale-data/${lang}`));
		});

		if (settings.locale) {
			this.reset(settings.locale);

			this.defaultNoteLocale = settings.defaultNoteLocale;
			if (!this.defaultNoteLocale) this.updateExportLocale(this.locale);
		}
		else
			this.update(navigator.language);
	},

	reset: function(locale) {
		let lang = locale;
		let msgs = messages[lang];

		if (!msgs) {
			if (locale.contains("-")) {
				lang = locale.substring(0, locale.lastIndexOf("-"));
				msgs = messages[lang];
			}

			if (!msgs) {
				locale = LocalesManager.DEFAULT_LOCALE;
				lang = LocalesManager.DEFAULT_LANGUAGE;
			}
		}

		this.locale = locale;
		this.lang = lang;
		this.dictionary = Object.assign({}, messages[lang]);
	},

	update: function(locale) {
		this.reset(locale);

		DBManager.edit(DBManager.entities.SETTINGS, {locale: this.locale});
		if (!this.defaultNoteLocale) this.updateExportLocale(this.locale);
	},

	updateExportLocale: function(locale) {
		this.defaultNoteLocale = this.getNoteLocale(locale);

		UIManager.setCloudLocale(this.defaultNoteLocale);
		DBManager.edit(DBManager.entities.SETTINGS, {defaultNoteLocale: this.defaultNoteLocale});
	},

	getLang: function(locale) {
		let lang = locale;
		let msgs = messages[lang];

		if (!msgs) {
			if (locale.contains("-")) {
				lang = locale.substring(0, locale.lastIndexOf("-"));
				msgs = messages[lang];
			}

			if (!msgs)
				lang = LocalesManager.DEFAULT_LANGUAGE;
		}

		return lang;
	},

	getLangName: function(locale) {
		let lang;

		if (!locale) {
			locale = this.locale;
			lang = this.lang;
		}
		else {
			locale = locale.replace(/_/g, "-");
			lang = this.getLang(locale);
		}

		let name = project.locales[locale];

		if (!name)
			name = project.locales[lang];

		if (!name) {
			for (let locale in project.locales) {
				if (locale.split("-")[0] == lang) {
					name = project.locales[locale];
					break;
				}
			}
		}

		return name;
	},

	getNoteLocale: function(locale) {
		let result;

		if (locale.contains("_"))
			result = locale;
		else if (locale.contains("-"))
			result = locale.replace(/-/g, "_")

		if (!result)
			result = LocalesManager.DEFAULT_LOCALE.replace(/-/g, "_");

		// TODO: this is temp solution and should be removed
		let tempResult = project.langToLocale[result];
		if (!tempResult) tempResult = project.langToLocale[result.split("_")[0]];
		if (!tempResult) throw new Error(`Unknown note locale detected: ${result}`);

		result = tempResult;

		return result;
	}
}

export default LocalesManager
