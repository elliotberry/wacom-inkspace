class SmartPadNS {}

SmartPadNS.createEnum("TransportProtocol", ["USB", "BTC", "BLE"]);
SmartPadNS.createEnum("Status", ["DISCONNECTED", "SCAN", "SCAN_COMPLETE", "CONNECTING", "CONNECTED", "AUTHORIZE_EXPECT", "AUTHORIZE_SUCCESS", "AUTHORIZE_FAILED", "READY", "CLOSING", "DISCONNECTING", "CLOSED"]);
SmartPadNS.createEnum("AuthorizeFailType", ["FOREIGN_DEVICE", "CONFIRMATION_TIMEOUT"]);
SmartPadNS.createEnum("State", ["REAL_TIME", "FILE_TRANSFER", "READY"]);

module.exports = SmartPadNS;
