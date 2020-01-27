import crypto from 'crypto';

import JWT from 'jwt-js';

import * as WizardSteps from '../constants/WizardSteps'
import * as Modals from '../constants/Modals'

const authConfig = require("../../project.config.js")['authentication'];

const REQUEST_SESSION_URL = authConfig.requestSessionUrl;
const LOGIN_URL = authConfig.loginUrl;
const QUERY_ACCESS_TOKEN_URL = authConfig.queryAccessTokenUrl;
const CREATE_ASSET_URL = authConfig.createAssetUrl;
const REFRESH_ACCESS_TOKEN_URL = authConfig.refreshAccessTokenUrl;
const ACCOUNT_URL = authConfig.accountUrl;

function formatDate(timestamp) {
	let d = new Date(timestamp);
	// return d.getDate().pad(2) + "." +(d.getMonth()+1).pad(2) + "." + d.getFullYear() + " " + d.getHours().pad(2) + ":" + d.getMinutes().pad(2) + ":" + d.getSeconds().pad(2);
	return d.getHours().pad(2) + ":" + d.getMinutes().pad(2) + ":" + d.getSeconds().pad(2);
}

let AuthenticationManager = {
	SECRET: authConfig.secret,

	SUPPRESS_SYNC: false,

	SYNC_INTERVAL: 15 * 1000,
	REFRESH_TIMEOUT_BEFORE_EXP: 10 * 60 * 1000,
	CONNECTIVITY_CHECK_REFRESH_RATE: 5 * 60 * 1000,

	onlineCallbacks: [],
	afterSync: [],

DEBUG: false,

	init() {
		let profile;
		let syncing = false;

		Object.defineProperty(this, "profile", {
			set: value => {
				profile = value;

				this.setProfile(profile);
				UAManager.update();

				if (!value) {
					DBManager.remove(DBManager.entities.PROFILE);
					DBManager.remove(DBManager.entities.QUEUE);
				}
				else
					DBManager.edit(DBManager.entities.PROFILE, profile);
			},
			get: () => {
				return profile || {};
			}
		});

		Object.defineProperty(this, "syncing", {
			set: value => {
				syncing = value;

				if (!value) {
					let callback;

					while (callback = this.afterSync.shift())
						callback();
				}
			},
			get: () => {
				return syncing;
			}
		});

		addEventListener("online", (e) => {
			let callback;

			while (callback = this.onlineCallbacks.shift())
				callback();
		});

		addEventListener("offline", (e) => {
			if (syncing)
				NativeLinker.disconnectCloud();
		});

		return DBManager.get(DBManager.entities.PROFILE).then(value => {
			profile = value;
			return profile;
		});
	},

	linkUI(layoutBridge) {
		Object.keys(layoutBridge).forEach(key => this[key] = layoutBridge[key]);

		this.linkedWithUI = true;

		if (this.sessionExpired) {
			delete this.sessionExpired;
			this.openDialog(Modals.SESSION_EXPIRED);
		}
	},

	openAccount() {
		this.openDialog(Modals.ACCOUNT, null, {iFrameSRC: ACCOUNT_URL});
	},

	login(form) {
		if (!navigator.onLine || this.open) return;

		if (!form) {
			this.openDialog(Modals.WACOM_ID_BENEFITS);
			return;
		}

		this.open = true;

		this.requestSession().then(sid => {
			this.sessionID = sid;

			let utmSource = "inkspace app - " + ((process.platform == "darwin")?"mac":"windows");
			let queryString = "utm_source=" + encodeURIComponent(utmSource) + "&utm_medium=application&utm_content=FTE&sid=" + this.sessionID;

			this.openDialog(Modals.LOGIN, null, {iFrameSRC: LOGIN_URL + "?" + queryString});
		}).catch(error => console.warn(error.message));
	},

	closeLogin() {
		delete this.open;
		if (!this.sessionID) return;

		fetch(QUERY_ACCESS_TOKEN_URL + "?" + this.getSignedQueryString({sid: this.sessionID, timestamp: Date.now()})).then((response) => {
			if (response.status == 200)
				return response.text();
			else {
				switch (response.status) {
					case 401: throw new Error("No access token for this session identifier");
					case 402: throw new Error("Request validation failed");
					default: throw new Error(`login: Unknown status - ${response.status}`);
				}
			}
		}).then((accessToken) => {
			if (!accessToken) throw new Error("No access token for this session identifier");
			UAManager.screen("Modal", "LoginSuccessful");

			if (DeviceManager.context == DeviceManager.Context.SETUP)
				this.moveWizardTo(WizardSteps.COMPLETE);

			this.processAccessToken(accessToken);

			DBManager.get("device").then(device => {
				if (this.canCreateAsset(device))
					this.createAsset(device, () => this.syncWithCloud());
				else {
					clearTimeout(this.refreshTimeoutID);
					setTimeout(() => this.refreshAccessToken(() => this.syncWithCloud()), 4000);
				}
			});
		}).catch(console.error);

		delete this.sessionID;
	},

	logout() {
		clearTimeout(this.refreshTimeoutID);

		this.profile = null;

		NativeLinker.syncWithCloud();
	},

	requestSession() {
		return new Promise((resolve, reject) => {
			fetch(REQUEST_SESSION_URL).then((response) => {
				return response.text();
			}).then((sessionID) => {
				resolve(sessionID);
			}).catch(e => reject(e));
		});
	},

	hasAccess() {
if (AuthenticationManager.DEBUG) {
	if (this.profile.access && this.profile.access.refreshExpiration <= Date.now()) {
		console.info("%c =================================", "background: yellow; color: red")
		console.info("%c now, refreshExpiration, expiration", "background: yellow; color: red")
		// console.warn(Date.now(), this.profile.access.refreshExpiration, this.profile.access.expiration)
		console.info("%c " + Date.now() + " " + this.profile.access.refreshExpiration, "background: yellow; color: red")
		console.info("%c " + formatDate(Date.now()) + " " + formatDate(this.profile.access.refreshExpiration), "background: orange; color: blue")
	}
}
		return !!this.getAccess();
	},

	getAccess(refresh) {
		if (this.profile.access && this.profile.access[refresh?"expiration":"refreshExpiration"] > Date.now())
			return this.profile.access;
		else
			return null;
	},

	refreshAccessToken(callback) {
		if (debug && this.profile && this.profile.access)
			console.log("[AUTHENTICATION_MANAGER] last refreshExpiration", new Date(this.profile.access.refreshExpiration))

		let access = this.getAccess(true);

		if (!access) {
			if (this.profile.access) {
				if (this.linkedWithUI)
					this.openDialog(Modals.SESSION_EXPIRED);
				else
					this.sessionExpired = true;
			}

			return;
		}

		if (debug) console.log("[AUTHENTICATION_MANAGER] refresh access token");

		let responseStatus;

		var options = {
			method: "GET",
			headers: new Headers({'Authorization': `Bearer ${access.token}`})
		};

		fetch(REFRESH_ACCESS_TOKEN_URL, options).then(response => {
			responseStatus = response.status;

			if (response.status == 200)
				return response.text();
			else {
				switch (response.status) {
					case 401: throw new Error("Invalid or Expired access token");
					case 404: throw new Error("UUID not found");
					default: throw new Error(`refreshAccessToken: Unknown status - ${response.status}`);
				}
			}
		}).then(accessToken => {
			global.updateState({online: true});
			this.processAccessToken(accessToken, callback);
		}).catch(error => {
			console.warn(error);

			if (!navigator.onLine) {
				global.updateState({online: false});
				this.onlineCallbacks.push(() => this.refreshAccessToken(callback));
			}
			else if (![401, 404].includes(responseStatus)) {
				clearTimeout(this.refreshTimeoutID);
				this.refreshTimeoutID = setTimeout(() => this.refreshAccessToken(callback), AuthenticationManager.CONNECTIVITY_CHECK_REFRESH_RATE);
			}
		});
	},

	processAccessToken(token, callback) {
		let profile = {};
		let payload = JWT.decodeToken(token).payload;
		let lastLogin = Date.now();

		profile.uuid = payload.sub;
		profile.firstName = payload.given_name;
		profile.lastName = payload.family_name;
		profile.email = payload.email;
		profile.access = {token: token, expiration: payload.exp * 1000, refreshExpiration: payload.refreshexp * 1000, rights: payload.rights};

		if (debug)
			console.log("[AUTHENTICATION_MANAGER] refreshExpiration", new Date(profile.access.refreshExpiration))

		if (this.profile.uuid && profile.uuid != this.profile.uuid)
			NativeLinker.syncWithCloud();

		//////////
		profile.contentUsage = 20000000;
		profile.contentQuota = 500000000; // rights (STORAGE-50GB)
		//////////

		if (this.profile) {
			profile.asset = !!this.profile.asset;
			profile.linkedWithCloud = !!this.profile.linkedWithCloud;
		}

		this.profile = profile;
		if (callback) callback();

		DBManager.edit(DBManager.entities.SETTINGS, {lastLogin});
		global.updateState({lastLogin});

		let nextRefresh = profile.access.refreshExpiration - Date.now() - AuthenticationManager.REFRESH_TIMEOUT_BEFORE_EXP;
if (AuthenticationManager.DEBUG) console.info("%c nextRefresh " + nextRefresh + " " + formatDate(profile.access.refreshExpiration - AuthenticationManager.REFRESH_TIMEOUT_BEFORE_EXP), "background: yellow; color: green")
		if (nextRefresh > 0) {
			if (debug)
				console.log("[AUTHENTICATION_MANAGER] next", profile.access.refreshExpiration - Date.now() - AuthenticationManager.REFRESH_TIMEOUT_BEFORE_EXP)

			clearTimeout(this.refreshTimeoutID);
			this.refreshTimeoutID = setTimeout(() => this.refreshAccessToken(), nextRefresh);
		}
	},

	canCreateAsset(device) {
		return this.profile.uuid && !this.profile.asset && device;
	},

	createAsset(device, callback) {
		if (!this.canCreateAsset(device)) return;

		var headers = new Headers();
		headers.append("Content-Type", "application/json");

		var options = {
			method: "POST",
			headers: headers,
			body: JSON.stringify({
				"subject": {
					"uuid": this.profile.uuid
				},
				payload: {
					"asset_id": "smartpad." + device.type.toLowerCase().replace("_consumer", ""),
					"asset_type": "smartpad",
					"issuer": "inkspace_app",
					"creation_date": Math.floor(Date.now() / 1000)
				}
			})
		};

		this.requestSession().then(sessionID => {
			return fetch(CREATE_ASSET_URL + "?" + this.getSignedQueryString({sid: sessionID, timestamp: Date.now()}), options);
		}).then((response) => {
			if (response.status == 204) {
				this.profile.asset = true;

				DBManager.edit(DBManager.entities.PROFILE, {asset: true}).then(() => {
					clearTimeout(this.refreshTimeoutID);
					setTimeout(() => this.refreshAccessToken(callback), 3000);
				});
			}
			else {
				switch (response.status) {
					case 400: throw new Error("Invalid receipt or asset or user identity information");
					case 401: throw new Error("Request validation failed");
					default: throw new Error(`createAsset: Unknown status - ${response.status}`);
				}
			}
		}).catch(console.error);
	},

	getSignedQueryString(data) {
		let result = "";
		let message = "";

		Object.keys(data).forEach((key) => {
			result += "&" + key + "=" + data[key];
			message += "&" + data[key];
		});

		const hmac = crypto.createHmac("sha256", AuthenticationManager.SECRET);
		hmac.update(message.substring(1));

		result += "&signature=" + hmac.digest("base64");

		return result.substring(1);
	},

	onSyncComplete(callback) {
		if (this.syncing)
			this.afterSync.push(callback);
		else
			callback();
	},

	syncWithCloud() {
		if (AuthenticationManager.SUPPRESS_SYNC) return;

		clearTimeout(this.syncTimeoutID);

		if (navigator.onLine && !this.syncing) {
			let access = this.getAccess();

			if (access && DeviceManager.context == DeviceManager.Context.LIBRARY)
				NativeLinker.syncWithCloud({accessToken: access.token});
		}

		this.syncTimeoutID = setTimeout(() => {
			delete this.syncTimeoutID;
			this.syncWithCloud();
		}, AuthenticationManager.SYNC_INTERVAL);
	}
}

export default AuthenticationManager
