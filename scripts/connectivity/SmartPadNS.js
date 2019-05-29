require("./bridge/wacom.smartPadCommunication");

class SmartPadNS {}

SmartPadNS.TransportProtocol = Wacom.SmartPadCommunication.TransportProtocol;

SmartPadNS.createEnum("Status", ["DISCONNECTED", "SCAN", "SCAN_COMPLETE", "CONNECTING", "CONNECTED", "AUTHORIZE_EXPECT", "AUTHORIZE_SUCCESS", "AUTHORIZE_FAILED", "READY", "CLOSING", "DISCONNECTING", "CLOSED"]);
// FOREIGN_DEVICE -> DEVICE_IN_USE_BY_ANOTHER_HOST, UNRECOGNIZED_DEVICE
SmartPadNS.createEnum("AuthorizeFailType", ["FOREIGN_DEVICE", "CONFIRMATION_TIMEOUT"]);
SmartPadNS.createEnum("State", ["REAL_TIME", "FILE_TRANSFER", "READY"]);

module.exports = SmartPadNS;
