var bridge = require('./bridge');

(function (globals) {
    "use strict";

    Bridge.define('Wacom.SmartPadCommunication.StateNode', {
        m_isFinal: false,
        constructor: function (isFinal) {
            this.m_isFinal = isFinal;
        },
        getIsFinal: function () {
            return this.m_isFinal;
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            return null;
        },
        getCommandPacketsCount: function () {
            return 1;
        },
        getException: function () {
            return null;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.AuthorizeResult', {
        statics: {
            /**
             * Handshake succeeded.
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.AuthorizeResult
             * @constant
             * @default 0
             * @type Wacom.SmartPadCommunication.AuthorizeResult
             */
            Success: 0,
            /**
             * The user did not confirm the connection on time.
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.AuthorizeResult
             * @constant
             * @default 1
             * @type Wacom.SmartPadCommunication.AuthorizeResult
             */
            ConfirmationTimeout: 1
        },
        $enum: true
    });

    Bridge.define('Wacom.SmartPadCommunication.BarcodeScannedEventArgs', {
        m_barcodeData: null,
        constructor: function (barcodeScanRecord) {
            this.m_barcodeData = barcodeScanRecord;
        },
        getBarcodeData: function () {
            return this.m_barcodeData;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.BatteryState', {
        statics: {
            fromUShort: function (packedValue) {
                var bs = new Wacom.SmartPadCommunication.BatteryState();
                bs.m_percent = ((packedValue >> 8)) & 255;
                bs.m_isCharging = ((((packedValue & 255)) & 255) === 1);

                return bs.$clone();
            },
            getDefaultValue: function () { return new Wacom.SmartPadCommunication.BatteryState(); }
        },
        m_percent: 0,
        m_isCharging: false,
        constructor: function () {
        },
        getPercentage: function () {
            return this.m_percent;
        },
        getIsCharging: function () {
            return this.m_isCharging;
        },
        $struct: true,
        getHashCode: function () {
            var hash = 17;
            hash = hash * 23 + -1306806735;
            hash = hash * 23 + (this.m_percent == null ? 0 : Bridge.getHashCode(this.m_percent));
            hash = hash * 23 + (this.m_isCharging == null ? 0 : Bridge.getHashCode(this.m_isCharging));
            return hash;
        },
        equals: function (o) {
            if (!Bridge.is(o, Wacom.SmartPadCommunication.BatteryState)) {
                return false;
            }
            return Bridge.equals(this.m_percent, o.m_percent) && Bridge.equals(this.m_isCharging, o.m_isCharging);
        },
        $clone: function (to) {
            var s = to || new Wacom.SmartPadCommunication.BatteryState();
            s.m_percent = this.m_percent;
            s.m_isCharging = this.m_isCharging;
            return s;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.BatteryStateChangedEventArgs', {
        m_percentage: 0,
        m_chargingState: 0,
        constructor: function (percentage, chargingState) {
            this.m_percentage = percentage;
            this.m_chargingState = chargingState;
        },
        getBatteryPercent: function () {
            return this.m_percentage;
        },
        getIsCharging: function () {
            return (this.m_chargingState === 1);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CheckAuthorizationResult', {
        statics: {
            /**
             *
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.CheckAuthorizationResult
             * @constant
             * @default 0
             * @type Wacom.SmartPadCommunication.CheckAuthorizationResult
             */
            Recognized_DataReady: 0,
            /**
             *
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.CheckAuthorizationResult
             * @constant
             * @default 1
             * @type Wacom.SmartPadCommunication.CheckAuthorizationResult
             */
            Recognized_UserConfirmation: 1,
            /**
             *
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.CheckAuthorizationResult
             * @constant
             * @default 2
             * @type Wacom.SmartPadCommunication.CheckAuthorizationResult
             */
            NotRecognized_DataReady: 2,
            /**
             *
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.CheckAuthorizationResult
             * @constant
             * @default 3
             * @type Wacom.SmartPadCommunication.CheckAuthorizationResult
             */
            NotRecognized_UserConfirmation: 3
        },
        $enum: true
    });

    Bridge.define('Wacom.SmartPadCommunication.CommandChain', {
        m_firstState: null,
        m_currentState: null,
        getFirstState: function () {
            this.m_currentState = this.m_firstState;

            return this.m_currentState;
        },
        getNextState: function (context, response) {
            this.m_currentState = this.m_currentState.getNextState(context, response);

            return this.m_currentState;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CommandNotSupportedException', {
        inherits: [System.Exception],
        constructor: function (commandName) {
            System.Exception.prototype.$constructor.call(this, System.String.format("The device does not support command: {0}", commandName));

        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CRC32', {
        m_Table: null,
        constructor: function () {
            this.m_Table = System.Array.init(256, 0);
            this.init();
        },
        /**
         * Initialize the iTable aplying the polynomial used by PKZIP, WINZIP and Ethernet.
         *
         * @instance
         * @private
         * @this Wacom.SmartPadCommunication.CRC32
         * @memberof Wacom.SmartPadCommunication.CRC32
         * @return  {void}
         */
        init: function () {
            // 0x04C11DB7 is the official polynomial used by PKZip, WinZip and Ethernet.
            var iPolynomial = 79764919;

            // 256 values representing ASCII character codes.
            for (var iAscii = 0; iAscii <= 255; iAscii = (iAscii + 1) | 0) {
                this.m_Table[iAscii] = this.reflect(iAscii, 8) << 24;

                for (var i = 0; i <= 7; i = (i + 1) | 0) {
                    if ((System.Int64(this.m_Table[iAscii]).and(System.Int64([-2147483648,0]))).equals(System.Int64(0))) {
                        this.m_Table[iAscii] = (this.m_Table[iAscii] << 1) ^ 0;
                    }
                    else  {
                        this.m_Table[iAscii] = (this.m_Table[iAscii] << 1) ^ iPolynomial;
                    }
                }

                this.m_Table[iAscii] = this.reflect(this.m_Table[iAscii], 32);
            }
        },
        /**
         * Reflection is a requirement for the official CRC-32 standard. Note that you can create CRC without it,
         but it won't conform to the standard.
         *
         * @instance
         * @private
         * @this Wacom.SmartPadCommunication.CRC32
         * @memberof Wacom.SmartPadCommunication.CRC32
         * @param   {number}    iReflect    value to apply the reflection
         * @param   {number}    iValue
         * @return  {number}                the calculated value
         */
        reflect: function (iReflect, iValue) {
            var iReturned = 0;
            // Swap bit 0 for bit 7, bit 1 For bit 6, etc....
            for (var i = 1; i < (((iValue + 1) | 0)); i = (i + 1) | 0) {
                if ((iReflect & 1) !== 0) {
                    iReturned = iReturned | (1 << (((iValue - i) | 0)));
                }
                iReflect = iReflect >> 1;
            }
            return iReturned;
        },
        /**
         * PartialCRC caculates the CRC32 by looping through each byte in sData
         *
         * @instance
         * @public
         * @this Wacom.SmartPadCommunication.CRC32
         * @memberof Wacom.SmartPadCommunication.CRC32
         * @param   {number}            lCRC           The variable to hold the CRC. It must have been initialize. See fullCRC for an example.
         * @param   {Array.<number>}    sData          Array of byte to calculate the CRC
         * @param   {number}            iDataLength    the length of the data
         * @return  {number}                           the new caculated CRC
         */
        calculateCRC: function (lCRC, sData, iDataLength) {
            for (var i = 0; i < iDataLength; i = (i + 1) | 0) {
                lCRC = (lCRC.shr(8)).xor((System.Int64(this.m_Table[System.Int64.clip32(lCRC.and(System.Int64(255))) ^ (sData[i] & 255)]).and(System.Int64([-1,0]))));
            }
            return lCRC;
        },
        /**
         * Caculates the CRC32 for the given Data
         *
         * @instance
         * @public
         * @this Wacom.SmartPadCommunication.CRC32
         * @memberof Wacom.SmartPadCommunication.CRC32
         * @param   {Array.<number>}    sData          the data to calculate the CRC
         * @param   {number}            iDataLength    then length of the data
         * @return  {number}                           the calculated CRC32
         */
        fullCRC: function (sData, iDataLength) {
            var lCRC = System.Int64([-1,0]);
            lCRC = this.calculateCRC(lCRC, sData, iDataLength);
            return (lCRC.xor(System.Int64([-1,0])));
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.Cryptography', {
        getHasDecryptionKey: function () {
            return false;
        },
        generateRSAKey: function () {
            return null;
        },
        setDecryptionKey: function (rsaEncryptedAESKeyMaterial) {
        },
        decryptBytes: function (encryptedBytes) {
            return null;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.DataSessionEstablishedEventArgs', {
        m_dataSessionEstablished: 0,
        constructor: function (dataSessionEstablished) {
            this.m_dataSessionEstablished = dataSessionEstablished;
        }
    });

    /** @namespace Wacom.SmartPadCommunication */

    /**
     * Specifies the SmartPad device states.
     *
     * @public
     * @class Wacom.SmartPadCommunication.DeviceState
     */
    Bridge.define('Wacom.SmartPadCommunication.DeviceState', {
        statics: {
            /**
             * Real time drawing mode.
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.DeviceState
             * @constant
             * @default 0
             * @type Wacom.SmartPadCommunication.DeviceState
             */
            RealTime: 0,
            /**
             * File transfer mode.
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.DeviceState
             * @constant
             * @default 1
             * @type Wacom.SmartPadCommunication.DeviceState
             */
            FileTransfer: 1,
            /**
             * Ready mode.
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.DeviceState
             * @constant
             * @default 2
             * @type Wacom.SmartPadCommunication.DeviceState
             */
            Ready: 2
        },
        $enum: true
    });

    Bridge.define('Wacom.SmartPadCommunication.DeviceUnreachableException', {
        inherits: [System.Exception],
        constructor: function (methodName) {
            System.Exception.prototype.$constructor.call(this, "The device is unreachable: [" + methodName + "]");

        }
    });

    Bridge.define('Wacom.SmartPadCommunication.DownloadInProgressException', {
        inherits: [System.Exception],
        constructor: function (commandName) {
            System.Exception.prototype.$constructor.call(this, System.String.format("The device cannot execute the command {0} because a file is currently being downloaded.", commandName));

        }
    });

    Bridge.define('Wacom.SmartPadCommunication.FileInfo', {
        statics: {
            getDefaultValue: function () { return new Wacom.SmartPadCommunication.FileInfo(); }
        },
        m_fileSize: 0,
        config: {
            init: function () {
                this.m_dateTime = new Date(-864e13);
            }
        },
        constructor: function () {
        },
        getTimestamp: function () {
            return this.m_dateTime;
        },
        getFileSize: function () {
            return this.m_fileSize;
        },
        $struct: true,
        getHashCode: function () {
            var hash = 17;
            hash = hash * 23 + 1582884289;
            hash = hash * 23 + (this.m_dateTime == null ? 0 : Bridge.getHashCode(this.m_dateTime));
            hash = hash * 23 + (this.m_fileSize == null ? 0 : Bridge.getHashCode(this.m_fileSize));
            return hash;
        },
        equals: function (o) {
            if (!Bridge.is(o, Wacom.SmartPadCommunication.FileInfo)) {
                return false;
            }
            return Bridge.equals(this.m_dateTime, o.m_dateTime) && Bridge.equals(this.m_fileSize, o.m_fileSize);
        },
        $clone: function (to) {
            var s = to || new Wacom.SmartPadCommunication.FileInfo();
            s.m_dateTime = this.m_dateTime;
            s.m_fileSize = this.m_fileSize;
            return s;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.FileTransferException', {
        inherits: [System.Exception],
        constructor: function (message) {
            System.Exception.prototype.$constructor.call(this, message);

        }
    });

    Bridge.define('Wacom.SmartPadCommunication.FirmwareVersion', {
        statics: {
            s_charMap: "0123456789abcdef",
            getDefaultValue: function () { return new Wacom.SmartPadCommunication.FirmwareVersion(); }
        },
        m_firmwareType: 0,
        m_version: null,
        m_decodeWithCharMap: false,
        constructor: function () {
        },
        getFirmwareType: function () {
            return this.m_firmwareType;
        },
        getVersionString: function () {
            return this.convertVersionToString();
        },
        init: function (firmwareType, version, decodeWithCharMap) {
            this.m_firmwareType = firmwareType;
            this.m_version = version;
            this.m_decodeWithCharMap = decodeWithCharMap;
        },
        convertVersionToString: function () {
            if ((this.m_version == null) || (this.m_version.length === 0)) {
                return "";
            }

            var sb = new System.Text.StringBuilder();

            if (this.m_decodeWithCharMap) {
                for (var i = 0; i < this.m_version.length; i = (i + 1) | 0) {
                    var charIndex = this.m_version[i];

                    sb.append(String.fromCharCode(Wacom.SmartPadCommunication.FirmwareVersion.s_charMap.charCodeAt(charIndex)));
                }
            }
            else  {
                // Something like ASCII
                for (var i1 = 0; i1 < this.m_version.length; i1 = (i1 + 1) | 0) {
                    sb.append(String.fromCharCode(this.m_version[i1]));
                }
            }

            return sb.toString();
        },
        $struct: true,
        getHashCode: function () {
            var hash = 17;
            hash = hash * 23 + -1559643087;
            hash = hash * 23 + (this.m_firmwareType == null ? 0 : Bridge.getHashCode(this.m_firmwareType));
            hash = hash * 23 + (this.m_version == null ? 0 : Bridge.getHashCode(this.m_version));
            hash = hash * 23 + (this.m_decodeWithCharMap == null ? 0 : Bridge.getHashCode(this.m_decodeWithCharMap));
            return hash;
        },
        equals: function (o) {
            if (!Bridge.is(o, Wacom.SmartPadCommunication.FirmwareVersion)) {
                return false;
            }
            return Bridge.equals(this.m_firmwareType, o.m_firmwareType) && Bridge.equals(this.m_version, o.m_version) && Bridge.equals(this.m_decodeWithCharMap, o.m_decodeWithCharMap);
        },
        $clone: function (to) {
            var s = to || new Wacom.SmartPadCommunication.FirmwareVersion();
            s.m_firmwareType = this.m_firmwareType;
            s.m_version = this.m_version;
            s.m_decodeWithCharMap = this.m_decodeWithCharMap;
            return s;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.Head', {
        statics: {
            getDefaultValue: function () { return new Wacom.SmartPadCommunication.Head(); }
        },
        m_tag: 0,
        m_length: 0,
        constructor: function () {
        },
        $struct: true,
        getHashCode: function () {
            var hash = 17;
            hash = hash * 23 + 431746829;
            hash = hash * 23 + (this.m_tag == null ? 0 : Bridge.getHashCode(this.m_tag));
            hash = hash * 23 + (this.m_length == null ? 0 : Bridge.getHashCode(this.m_length));
            return hash;
        },
        equals: function (o) {
            if (!Bridge.is(o, Wacom.SmartPadCommunication.Head)) {
                return false;
            }
            return Bridge.equals(this.m_tag, o.m_tag) && Bridge.equals(this.m_length, o.m_length);
        },
        $clone: function (to) {
            var s = to || new Wacom.SmartPadCommunication.Head();
            s.m_tag = this.m_tag;
            s.m_length = this.m_length;
            return s;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.HeadTypeA', {
        statics: {
            getDefaultValue: function () { return new Wacom.SmartPadCommunication.HeadTypeA(); }
        },
        m_tag: 0,
        m_length: 0,
        constructor: function () {
        },
        $struct: true,
        getHashCode: function () {
            var hash = 17;
            hash = hash * 23 + -956967749;
            hash = hash * 23 + (this.m_tag == null ? 0 : Bridge.getHashCode(this.m_tag));
            hash = hash * 23 + (this.m_length == null ? 0 : Bridge.getHashCode(this.m_length));
            return hash;
        },
        equals: function (o) {
            if (!Bridge.is(o, Wacom.SmartPadCommunication.HeadTypeA)) {
                return false;
            }
            return Bridge.equals(this.m_tag, o.m_tag) && Bridge.equals(this.m_length, o.m_length);
        },
        $clone: function (to) {
            var s = to || new Wacom.SmartPadCommunication.HeadTypeA();
            s.m_tag = this.m_tag;
            s.m_length = this.m_length;
            return s;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.InvalidFileFormatException', {
        inherits: [System.Exception],
        constructor: function (reason) {
            System.Exception.prototype.$constructor.call(this, "Invalid file format: " + reason);

        }
    });

    Bridge.define('Wacom.SmartPadCommunication.InvalidStateException', {
        inherits: [System.Exception],
        constructor: function (commandName) {
            System.Exception.prototype.$constructor.call(this, System.String.format("The device cannot execute the command {0} in its current state.", commandName));

        }
    });

    Bridge.define('Wacom.SmartPadCommunication.MessageReader', {
        m_bytes: null,
        m_index: 0,
        constructor: function (bytes, offset) {
            this.m_bytes = bytes;
            this.m_index = offset;
        },
        init: function (bytes, offset) {
            this.m_bytes = bytes;
            this.m_index = offset;
        },
        readByte: function () {
            return this.m_bytes[Bridge.identity(this.m_index, (this.m_index = (this.m_index + 1) | 0))];
        },
        readBytes: function (count) {
            var bytes = System.Array.init(count, 0);

            System.Array.copy(this.m_bytes, this.m_index, bytes, 0, count);

            this.m_index = (this.m_index + count) | 0;

            return bytes;
        },
        peekUShort: function () {
            return Wacom.SmartPadCommunication.Utils.readUShortLE(this.m_bytes, this.m_index);
        },
        skipBytes: function (bytesCount) {
            this.m_index = (this.m_index + bytesCount) | 0;
        },
        readUShort: function () {
            var value = Wacom.SmartPadCommunication.Utils.readUShortLE(this.m_bytes, this.m_index);

            this.m_index = (this.m_index + 2) | 0;

            return value;
        },
        readUInt: function () {
            var value = Wacom.SmartPadCommunication.Utils.readUIntLE(this.m_bytes, this.m_index);

            this.m_index = (this.m_index + 4) | 0;

            return value;
        },
        readULong: function () {
            var value = Wacom.SmartPadCommunication.Utils.readULongLE(this.m_bytes, this.m_index);

            this.m_index = (this.m_index + 8) | 0;

            return value;
        },
        readHeadTypeA: function () {
            var head = new Wacom.SmartPadCommunication.HeadTypeA();

            head.m_tag = this.readByte();
            head.m_length = this.readByte();

            return head.$clone();
        },
        readHead: function () {
            var head = new Wacom.SmartPadCommunication.Head();

            head.m_tag = this.readByte();

            // Tags below 0x10 are "Type C" (payload length is stored in 2 bytes)
            if (head.m_tag < 16) {
                head.m_length = this.readUShort();
            }
            else  {
                head.m_length = this.readByte();
            }

            return head.$clone();
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.MessageTransferEventArgs', {
        m_isOutgoing: false,
        m_interfaceName: null,
        m_strBytes: null,
        m_humanReadable: null,
        constructor: function (isOutgoing, interfaceName, strBytes, humanReadable) {
            this.m_isOutgoing = isOutgoing;
            this.m_interfaceName = interfaceName;
            this.m_strBytes = strBytes;
            this.m_humanReadable = humanReadable;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.MessageWriter', {
        m_bytes: null,
        m_index: 0,
        constructor: function (bufferSize) {
            this.m_bytes = System.Array.init(bufferSize, 0);
        },
        getBytes: function () {
            return this.m_bytes;
        },
        writeByte: function (value) {
            this.m_bytes[Bridge.identity(this.m_index, (this.m_index = (this.m_index + 1) | 0))] = value;
        },
        writeUShort: function (value) {
            Wacom.SmartPadCommunication.Utils.writeUShortLE(this.m_bytes, this.m_index, value);

            this.m_index = (this.m_index + 2) | 0;
        },
        writeUInt: function (value) {
            Wacom.SmartPadCommunication.Utils.writeUIntLE(this.m_bytes, this.m_index, value);

            this.m_index = (this.m_index + 4) | 0;
        },
        writeULong: function (value) {
            Wacom.SmartPadCommunication.Utils.writeULongLE(this.m_bytes, this.m_index, value);

            this.m_index = (this.m_index + 8) | 0;
        },
        writeByteArray: function (value) {
            System.Array.copy(value, 0, this.m_bytes, this.m_index, value.length);

            this.m_index = (this.m_index + value.length) | 0;
        },
        writeHeadTypeA: function (tag, length) {
            this.writeByte(tag);
            this.writeByte(length);
        },
        writeHeadTypeC: function (tag, length) {
            this.writeByte(tag);
            this.writeUShort(length);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.ParameterNotSupportedException', {
        inherits: [System.Exception],
        constructor: function (paramId) {
            System.Exception.prototype.$constructor.call(this, System.String.format("The device does not support parameter: {0}", paramId));

        }
    });

    Bridge.define('Wacom.SmartPadCommunication.ParamValuePair', {
        statics: {
            getDefaultValue: function () { return new Wacom.SmartPadCommunication.ParamValuePair(); }
        },
        m_id: 0,
        m_value: 0,
        constructor: function () {
        },
        getId: function () {
            return this.m_id;
        },
        getValue: function () {
            return this.m_value;
        },
        $struct: true,
        getHashCode: function () {
            var hash = 17;
            hash = hash * 23 + -203716533;
            hash = hash * 23 + (this.m_id == null ? 0 : Bridge.getHashCode(this.m_id));
            hash = hash * 23 + (this.m_value == null ? 0 : Bridge.getHashCode(this.m_value));
            return hash;
        },
        equals: function (o) {
            if (!Bridge.is(o, Wacom.SmartPadCommunication.ParamValuePair)) {
                return false;
            }
            return Bridge.equals(this.m_id, o.m_id) && Bridge.equals(this.m_value, o.m_value);
        },
        $clone: function (to) {
            var s = to || new Wacom.SmartPadCommunication.ParamValuePair();
            s.m_id = this.m_id;
            s.m_value = this.m_value;
            return s;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.ParserState', {
        statics: {
            Idle: 0,
            Begin: 1,
            Move: 2
        },
        $enum: true
    });

    Bridge.define('Wacom.SmartPadCommunication.PenType', {
        statics: {
            UnknownPen: 0,
            BallPen: 1,
            Pencil: 2,
            GelPen: 3
        },
        $enum: true
    });

    Bridge.define('Wacom.SmartPadCommunication.PointReceivedEventArgs', {
        m_x: 0,
        m_y: 0,
        m_pressure: 0,
        m_phase: 0,
        constructor: function (x, y, pressure, phase) {
            this.m_x = x;
            this.m_y = y;
            this.m_pressure = pressure;
            this.m_phase = phase;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.PointsLostEventArgs', {
        m_pointsLostCount: 0,
        constructor: function (pointsLostCount) {
            this.m_pointsLostCount = pointsLostCount;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.ProtocolContext', {
        m_eventReader: null,
        m_tagProvider: null,
        m_maxMessageLength: 0,
        m_encodeFirmwareVersionWithCharMap: false,
        m_transportProtocol: 0,
        m_cryptography: null,
        config: {
            init: function () {
                this.m_tagProvider = new Wacom.SmartPadCommunication.Tag();
            }
        },
        getTag: function () {
            return this.m_tagProvider;
        },
        getTransportProtocol: function () {
            return this.m_transportProtocol;
        },
        getProtocolLevel: function () {
            return this.m_tagProvider.getProtocolLevel();
        },
        getMaxMessageLength: function () {
            return this.m_maxMessageLength;
        },
        getEncodeFirmwareVersionWithCharMap: function () {
            return this.m_encodeFirmwareVersionWithCharMap;
        },
        getEventReader: function () {
            return this.m_eventReader;
        },
        getCryptography: function () {
            if (this.m_cryptography == null) {
                this.m_cryptography = new Wacom.SmartPadCommunication.Cryptography();
            }

            return this.m_cryptography;
        },
        init: function (transportProtocol, smartPadProtocolLevel) {
            this.m_transportProtocol = transportProtocol;

            switch (transportProtocol) {
                case Wacom.SmartPadCommunication.TransportProtocol.BLE:
                    this.m_maxMessageLength = 20;
                    break;
                case Wacom.SmartPadCommunication.TransportProtocol.USB:
                case Wacom.SmartPadCommunication.TransportProtocol.BTC:
                    this.m_maxMessageLength = 2147483647;
                    break;
                default:
                    System.Diagnostics.Debug.assert(false);
                    break;
            }

            this.m_tagProvider.init(smartPadProtocolLevel);

            this.m_encodeFirmwareVersionWithCharMap = (smartPadProtocolLevel < Wacom.SmartPadCommunication.SppLevel.L_2_1_2);

            this.m_eventReader = this.createMessageReader(null);
        },
        isSystemEvent: function (bytes) {
            if (bytes.length === 0) {
                return false;
            }

            switch (bytes[0]) {
                case Wacom.SmartPadCommunication.Tag.E_DataSessionEstablished:
                case Wacom.SmartPadCommunication.Tag.E_UserConfirmationInProgress:
                case Wacom.SmartPadCommunication.Tag.E_BatteryState:
                case Wacom.SmartPadCommunication.Tag.E_ResetRealtimeDataBuffer:
                case Wacom.SmartPadCommunication.Tag.E_PenDetected:
                case Wacom.SmartPadCommunication.Tag.E_DataSessionTerminated:
                case Wacom.SmartPadCommunication.Tag.E_BarcodeScanRecord:
                case Wacom.SmartPadCommunication.Tag.E_EncryptedBarcodeScanRecord:
                    return true;
                default:
                    return false;
            }
        },
        isRealtimeEvent: function (bytes) {
            if (bytes.length === 0) {
                return false;
            }

            return this.isRealtimeEventTag(bytes[0]);
        },
        isRealtimeEventTag: function (tag) {
            switch (tag) {
                case Wacom.SmartPadCommunication.Tag.E_StrokeChunk:
                case Wacom.SmartPadCommunication.Tag.E_StrokeStart:
                case Wacom.SmartPadCommunication.Tag.E_PointsLost:
                case Wacom.SmartPadCommunication.Tag.E_NewLayer:
                case Wacom.SmartPadCommunication.Tag.E_EncryptedStrokeStart:
                case Wacom.SmartPadCommunication.Tag.E_EncryptedStrokeChunk:
                    return true;
            }

            return false;
        },
        createMessageReader: function (data) {
            if (this.getProtocolLevel() >= Wacom.SmartPadCommunication.SppLevel.L_2_1_2) {
                return new Wacom.SmartPadCommunication.MessageReader_2_1_2(data, 0);
            }

            return new Wacom.SmartPadCommunication.MessageReader_1_2_2(data, 0);
        },
        createMessageWriter: function (bufferSize) {
            if (this.getProtocolLevel() >= Wacom.SmartPadCommunication.SppLevel.L_2_1_2) {
                return new Wacom.SmartPadCommunication.MessageWriter_2_1_2(bufferSize);
            }

            return new Wacom.SmartPadCommunication.MessageWriter_1_2_2(bufferSize);
        },
        createMessageWriterFromHeadTypeA: function (tag, payloadLength) {
            var headLength = 2;

            var writer = this.createMessageWriter(((headLength + payloadLength) | 0));

            writer.writeHeadTypeA(tag, payloadLength);

            return writer;
        },
        createMessageWriterFromHeadTypeC: function (tag, payloadLength) {
            var headLength = 3;

            var writer = this.createMessageWriter(((headLength + payloadLength) | 0));

            writer.writeHeadTypeC(tag, payloadLength);

            return writer;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.SevenBitEncoder', {
        statics: {
            mask1: null,
            mask2: null,
            config: {
                init: function () {
                    this.mask1 = [127, 63, 31, 15, 7, 3, 1];
                    this.mask2 = [64, 96, 112, 120, 124, 126, 127];
                }
            },
            /**
             * Converts messages from normal (8bit) to 7bit encoded.
             *
             * @static
             * @public
             * @this Wacom.SmartPadCommunication.SevenBitEncoder
             * @memberof Wacom.SmartPadCommunication.SevenBitEncoder
             * @param   {Array.<number>}    src
             * @return  {Array.<number>}
             */
            encode: function (src) {
                var indx = 0;

                var srcBytesCount = src.length;
                var bitCount = (((srcBytesCount * 8) | 0));
                var destBytesCount = (((((Bridge.Int.div(bitCount, 7)) | 0) + (((bitCount % 7) !== 0) ? 1 : 0)) | 0));

                var dest = System.Array.init(((destBytesCount + 2) | 0), 0);

                var ch = ((128 | (((destBytesCount >> 7)) & 255))) & 255;
                dest[Bridge.identity(indx, (indx = Bridge.Int.sxs((indx + 1) & 65535)))] = ch;

                ch = ((127 & (destBytesCount & 255))) & 255;
                dest[Bridge.identity(indx, (indx = Bridge.Int.sxs((indx + 1) & 65535)))] = ch;

                ch = 0;

                for (var i = 0; i < srcBytesCount; i = (i + 1) | 0) {
                    var b = src[i];

                    var shift = (i % 7);

                    ch = (ch | ((((((b >> (((shift + 1) | 0))) & Wacom.SmartPadCommunication.SevenBitEncoder.mask1[shift])) & 255)) & 255)) & 255;
                    dest[Bridge.identity(indx, (indx = Bridge.Int.sxs((indx + 1) & 65535)))] = ch;
                    ch = (((b << (((6 - shift) | 0))) & Wacom.SmartPadCommunication.SevenBitEncoder.mask2[shift])) & 255;

                    if (shift === 6) {
                        dest[Bridge.identity(indx, (indx = Bridge.Int.sxs((indx + 1) & 65535)))] = ch;
                        ch = 0;
                    }
                    else  {
                        if (i === (((srcBytesCount - 1) | 0))) {
                            dest[Bridge.identity(indx, (indx = Bridge.Int.sxs((indx + 1) & 65535)))] = ch;
                        }
                    }
                }

                return dest;
            }
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.SmartPad', {
        statics: {
            byteArrayAsHexString: function (bytes) {
                var sb = new System.Text.StringBuilder();

                for (var i = 0; i < bytes.length; i = (i + 1) | 0) {
                    sb.appendFormat("|{0:X2}", bytes[i]);
                }

                if (bytes.length > 0) {
                    sb.append("|");
                }

                return sb.toString();
            },
            translateCommandToHumanReadable: function (cmdArray, context) {
                var returnHumanReadableValue = "";
                var firstByte = cmdArray[0];
                var secondByte = 0;
                var thirdByte = 0;

                if (context.getProtocolLevel() >= Wacom.SmartPadCommunication.SppLevel.L_2_1_2) {
                    if (firstByte === Wacom.SmartPadCommunication.Tag.C_SetDateTime) {
                        return "C_SetDateTime (2.1.2)";
                    }
                    else  {
                        if (firstByte === context.getTag().getC_GetDateTime()) {
                            return "C_GetDateTime";
                        }
                        else  {
                            if (firstByte === Wacom.SmartPadCommunication.Tag.C_SetDeviceName) {
                                return "C_SetDeviceName (2.1.2)";
                            }
                            else  {
                                if (firstByte === context.getTag().getC_GetDeviceName()) {
                                    return "C_GetDeviceName";
                                }
                            }
                        }
                    }
                }
                else  {
                    if (firstByte === Wacom.SmartPadCommunication.Tag.C_SetDeviceName) {
                        secondByte = cmdArray[1];

                        if (secondByte === 1) {
                            thirdByte = cmdArray[2];

                            if (thirdByte === 0) {
                                return "C_GetDeviceName (1.2.2)";
                            }
                        }
                        else  {
                            return "C_SetDeviceName (1.2.2)";
                        }

                    }
                    else  {
                        if (firstByte === Wacom.SmartPadCommunication.Tag.C_SetDateTime) {
                            secondByte = cmdArray[1];

                            if (secondByte === 1) {
                                return "C_GetDateTime (1.2.2)";
                            }
                            else  {
                                if (secondByte === 6) {
                                    return "C_SetDateTime (1.2.2)";
                                }
                            }
                        }
                    }
                }

                switch (firstByte) {
                    case Wacom.SmartPadCommunication.Tag.C_CheckAuthorization:
                        returnHumanReadableValue = "C_CheckAuthorization";
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_Authorize:
                        returnHumanReadableValue = "C_Authorize";
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_UserConfirmationStatus:
                        secondByte = cmdArray[1];
                        if (secondByte === 1) {
                            thirdByte = cmdArray[2];

                            if (thirdByte === 0) {
                                returnHumanReadableValue = "R_UserConfirmationAcknowledged";
                            }
                            else  {
                                if (thirdByte === 1) {
                                    returnHumanReadableValue = "R_UserConfirmationTimedOut";
                                }
                            }
                        }
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_Status:
                        secondByte = cmdArray[1];
                        if (secondByte === 1) {
                            thirdByte = cmdArray[2];

                            switch (thirdByte) {
                                case Wacom.SmartPadCommunication.StatusCode.ACK:
                                    returnHumanReadableValue = "R_Ack";
                                    break;
                                case Wacom.SmartPadCommunication.StatusCode.GENERAL_ERROR:
                                    returnHumanReadableValue = "R_Nack";
                                    break;
                                case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                                    returnHumanReadableValue = "ERROR_INVALID_STATE";
                                    break;
                                case Wacom.SmartPadCommunication.StatusCode.READONLY_PARAM:
                                    returnHumanReadableValue = "ERROR_READONLY_PARAM";
                                    break;
                                case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                                    returnHumanReadableValue = "ERROR_UNRECOGNIZED_COMMAND";
                                    break;
                                case Wacom.SmartPadCommunication.StatusCode.UC_IN_PROGRESS:
                                    returnHumanReadableValue = "ERROR_UC_IN_PROGRESS";
                                    break;
                                case Wacom.SmartPadCommunication.StatusCode.NOT_AUTH_FOR_DSR:
                                    returnHumanReadableValue = "ERROR_NOT_AUTH_FOR_DSR";
                                    break;
                                default:
                                    returnHumanReadableValue = "Unspecified Error";
                                    break;
                            }
                        }
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_GetDeviceID:
                        returnHumanReadableValue = "C_GetDeviceID";
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_DeviceID:
                        returnHumanReadableValue = "R_DeviceID";
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_DeviceName:
                        returnHumanReadableValue = "R_DeviceName";
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_DateTime:
                        returnHumanReadableValue = "R_DateTime";
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_GetFirmwareVersion:
                        returnHumanReadableValue = "C_GetFirmwareVersion";
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_FirmwareVersion:
                        returnHumanReadableValue = "R_FirmwareVersion";
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_GetBatteryState:
                        returnHumanReadableValue = "C_GetBatteryState";
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_BatteryState:
                        returnHumanReadableValue = "R_BatteryState";
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_SetState:
                        returnHumanReadableValue = "C_SetState";
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_GetState:
                        returnHumanReadableValue = "C_GetState";
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_DeviceState:
                        returnHumanReadableValue = "R_DeviceState";
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_DeleteAllFiles:
                        returnHumanReadableValue = "C_DeleteAllFiles";
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_ResetToDefaults:
                        returnHumanReadableValue = "C_ResetToDefaults";
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_GetParam:
                        returnHumanReadableValue = "C_GetParam";
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_ParamValue:
                        returnHumanReadableValue = "R_ParamValue";
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_ParamsList:
                        returnHumanReadableValue = "R_ParamsList";
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_SetParam:
                        returnHumanReadableValue = "C_SetParam";
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_ESN:
                        returnHumanReadableValue = "R_ESN";
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_GetFilesCount:
                        returnHumanReadableValue = "C_GetFilesCount";
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_FilesCount:
                        returnHumanReadableValue = "R_FilesCount";
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_GetFileInfo:
                        returnHumanReadableValue = "C_GetFileInfo";
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_GetESerialNumber:
                        returnHumanReadableValue = "C_GetESerialNumber";
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_FileInfo:
                        returnHumanReadableValue = "R_FileInfo";
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_DownloadOldestFile:
                        returnHumanReadableValue = "C_DownloadOldestFile";
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_FileUploadStarted:
                        secondByte = cmdArray[1];
                        thirdByte = cmdArray[2];
                        if (thirdByte === 190) {
                            returnHumanReadableValue = "R_FileUploadStarted";
                        }
                        else  {
                            if (thirdByte === 237) {
                                returnHumanReadableValue = "R_FileUploadEnded";
                            }
                        }
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_DeleteOldestFile:
                        returnHumanReadableValue = "C_DeleteOldestFile";
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_PerformFirmwareUpdate:
                        returnHumanReadableValue = "C_PerformFirmwareUpdate";
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_FirmwareUpdateStart:
                        secondByte = cmdArray[1];
                        if (secondByte === 1) {
                            thirdByte = cmdArray[2];

                            if (thirdByte === 190) {
                                returnHumanReadableValue = "C_FirmwareUpdateStart";
                            }
                        }
                        else  {
                            if (secondByte === 5) {
                                if (thirdByte === 237) {
                                    returnHumanReadableValue = "C_FirmwareUpdateEnd";
                                }
                            }
                        }
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_GetSupportedParams:
                        returnHumanReadableValue = "C_GetSupportedParams";
                        break;
                    case Wacom.SmartPadCommunication.Tag.C_ForceDisconnect:
                        returnHumanReadableValue = "C_ForceDisconnect";
                        break;
                    case Wacom.SmartPadCommunication.Tag.E_PointsLost:
                        returnHumanReadableValue = "E_PointsLost";
                        break;
                    case Wacom.SmartPadCommunication.Tag.E_StrokeStart:
                        returnHumanReadableValue = "E_StrokeStart";
                        break;
                    case Wacom.SmartPadCommunication.Tag.E_StrokeChunk:
                        returnHumanReadableValue = "E_StrokeChunk";
                        break;
                    case Wacom.SmartPadCommunication.Tag.E_DataSessionEstablished:
                        returnHumanReadableValue = "E_DataSessionEstablished";
                        break;
                    case Wacom.SmartPadCommunication.Tag.E_BatteryState:
                        returnHumanReadableValue = "E_BatteryState";
                        break;
                    case Wacom.SmartPadCommunication.Tag.E_UserConfirmationInProgress:
                        returnHumanReadableValue = "E_UserConfirmationInProgress";
                        break;
                    case Wacom.SmartPadCommunication.Tag.E_ResetRealtimeDataBuffer:
                        returnHumanReadableValue = "E_ResetRealtimeDataBuffer";
                        break;
                    case Wacom.SmartPadCommunication.Tag.E_NewLayer:
                        returnHumanReadableValue = "E_NewLayer";
                        break;
                    case Wacom.SmartPadCommunication.Tag.E_DataSessionTerminated:
                        returnHumanReadableValue = "E_DataSessionTerminated";
                        break;
                    case Wacom.SmartPadCommunication.Tag.E_PenDetected:
                        returnHumanReadableValue = "E_PenDetected";
                        break;
                    case Wacom.SmartPadCommunication.Tag.E_BarcodeScanRecord:
                        returnHumanReadableValue = "E_BarcodeScanRecord";
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_CheckAuthorizationSuccess:
                        returnHumanReadableValue = "R_CheckAuthorizationSuccess";
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_CheckAuthorizationFailure:
                        returnHumanReadableValue = "R_CheckAuthorizationFailure";
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_UserConfirmationSuccess:
                        returnHumanReadableValue = "R_UserConfirmationSuccess";
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_UserConfirmationTimedOut:
                        returnHumanReadableValue = "R_UserConfirmationTimedOut";
                        break;
                    case Wacom.SmartPadCommunication.Tag.R_UserConfirmationFailure:
                        returnHumanReadableValue = "R_UserConfirmationFailure";
                        break;
                    default:
                        returnHumanReadableValue = "Unknown Message Tag!";
                        break;
                }

                return returnHumanReadableValue;
            }
        },
        m_realTimeParser: null,
        m_protocolContext: null,
        m_ccCheckAuthorization_1_2_2: null,
        m_ccCheckAuthorization_2_1_2: null,
        m_ccAuthorize_1_2_2: null,
        m_ccAuthorize_2_1_2: null,
        m_ccGetOldestFile: null,
        m_ccDeleteAllFiles: null,
        m_ccDeleteOldestFile: null,
        m_ccGetFileInfo: null,
        m_ccResetToDefaults: null,
        m_ccForceDisconnect: null,
        m_ccGetFilesCount: null,
        m_ccGetBatteryState: null,
        m_ccGetDeviceId: null,
        m_ccGetFirmwareVersion_1_2_2: null,
        m_ccGetFirmwareVersion_2_1_3: null,
        m_ccGetSerialNumber: null,
        m_ccGetGetSupportedParams: null,
        m_ccGetState: null,
        m_ccSetState: null,
        m_ccSetParam: null,
        m_ccGetParam: null,
        m_ccGetDeviceName: null,
        m_ccSetDeviceName_1_2_2: null,
        m_ccSetDeviceName_2_1_2: null,
        m_ccGetDateTime: null,
        m_ccSetDateTime: null,
        m_ccGetDecryptionKey: null,
        config: {
            events: {
                MessageTransfer: null,
                UserConfirmationInProgress: null,
                DataSessionEstablished: null,
                DataSessionTerminated: null,
                BatteryStateChanged: null,
                StrokeStart: null,
                PointReceived: null,
                PointsLost: null,
                BarcodeScanned: null,
                PenDetected: null,
                ResetRealtimeDataBuffer: null,
                NewLayer: null
            },
            init: function () {
                this.m_realTimeModeStartTime = new Date(-864e13);
            }
        },
        constructor: function () {
            this.m_realTimeParser = new Wacom.SmartPadCommunication.SmartPadRealTimeParser(this);

            this.m_protocolContext = new Wacom.SmartPadCommunication.ProtocolContext();
        },
        getScaleFactor: function () {
            return (0.04);
        },
        firePointReceived: function (x, y, pressure, phase) {
            // Keep this syntax because of Bridge.NET
            var handler = this.PointReceived;

            if (!Bridge.staticEquals(handler, null)) {
                var ea = new Wacom.SmartPadCommunication.PointReceivedEventArgs(x, y, pressure, phase);
                handler(this, ea);
            }
        },
        fireEvent$1: function (TEventArgs, handler, args) {
            if (!Bridge.staticEquals(handler, null)) {
                handler(this, args);
            }
        },
        fireEvent: function (handler) {
            if (!Bridge.staticEquals(handler, null)) {
                handler(this, new Object());
            }
        },
        fireAndForgetEvent: function (handler) {
            if (Bridge.staticEquals(handler, null)) {
                return;
            }
        },
        tryProcessEvent: function (bytes) {
            try {
                this.processEvent(bytes);
            }
            catch (ex) {
                ex = System.Exception.create(ex);
                System.Diagnostics.Debug.writeln();
                return false;
            }

            return true;
        },
        processEvent: function (bytes) {
            if (bytes.length === 0) {
                return;
            }

            var reader = this.m_protocolContext.getEventReader();

            if (reader == null) {
                // The reader is not initialized -> the Setup function has not completed yet, ignore events
                return;
            }

            reader.init(bytes, 0);

            var head = reader.readHead().$clone();

            switch (head.m_tag) {
                case Wacom.SmartPadCommunication.Tag.E_StrokeChunk:
                    this.process_E_StrokeChunk(reader, head.$clone());
                    break;
                case Wacom.SmartPadCommunication.Tag.E_EncryptedStrokeChunk:
                    this.process_E_EncryptedStrokeChunk(reader, head.$clone());
                    break;
                case Wacom.SmartPadCommunication.Tag.E_StrokeStart:
                    this.process_E_StrokeStart(reader);
                    break;
                case Wacom.SmartPadCommunication.Tag.E_EncryptedStrokeStart:
                    this.process_E_EncryptedStrokeStart(reader, head.$clone());
                    break;
                case Wacom.SmartPadCommunication.Tag.E_PointsLost:
                    this.process_E_PointsLost(reader);
                    break;
                case Wacom.SmartPadCommunication.Tag.E_BarcodeScanRecord:
                    this.process_E_BarcodeScanRecord(reader, head.$clone());
                    break;
                case Wacom.SmartPadCommunication.Tag.E_EncryptedBarcodeScanRecord:
                    this.process_E_EncryptedBarcodeScanRecord(reader, head.$clone());
                    break;
                case Wacom.SmartPadCommunication.Tag.E_NewLayer:
                    this.fireEvent(this.NewLayer);
                    break;
                case Wacom.SmartPadCommunication.Tag.E_ResetRealtimeDataBuffer:
                    this.fireEvent(this.ResetRealtimeDataBuffer);
                    break;
                case Wacom.SmartPadCommunication.Tag.E_PenDetected:
                    this.fireEvent(this.PenDetected);
                    break;
                case Wacom.SmartPadCommunication.Tag.E_BatteryState:
                    this.process_E_BatteryState(reader);
                    break;
                case Wacom.SmartPadCommunication.Tag.E_DataSessionEstablished:
                    this.process_E_DataSessionEstablished(reader);
                    break;
                case Wacom.SmartPadCommunication.Tag.E_UserConfirmationInProgress:
                    this.process_E_UserConfirmationInProgress(reader);
                    break;
                case Wacom.SmartPadCommunication.Tag.E_DataSessionTerminated:
                    this.fireEvent(this.DataSessionTerminated);
                    break;
                default:
                    throw new System.Exception("Unrecognized event: " + head.m_tag);
            }
        },
        process_E_DataSessionEstablished: function (reader) {
            var handler = this.DataSessionEstablished;

            if (!Bridge.staticEquals(handler, null)) {
                var cnst = reader.readByte();
                handler(this, new Wacom.SmartPadCommunication.DataSessionEstablishedEventArgs(cnst));
            }
        },
        process_E_UserConfirmationInProgress: function (reader) {
            var handler = this.UserConfirmationInProgress;

            if (!Bridge.staticEquals(handler, null)) {
                var cnst = reader.readByte();
                handler(this, new Wacom.SmartPadCommunication.UserConfirmationInProgressEventArgs(cnst));
            }
        },
        process_E_BatteryState: function (reader) {
            var handler = this.BatteryStateChanged;

            if (!Bridge.staticEquals(handler, null)) {
                var percenatage = reader.readByte();
                var chargingState = reader.readByte();
                handler(this, new Wacom.SmartPadCommunication.BatteryStateChangedEventArgs(percenatage, chargingState));
            }
        },
        process_E_PointsLost: function (reader) {
            var handler = this.PointsLost;

            if (!Bridge.staticEquals(handler, null)) {
                var pointsLostCount = reader.readUShort();

                handler(this, new Wacom.SmartPadCommunication.PointsLostEventArgs(pointsLostCount));
            }
        },
        process_E_StrokeStart: function (reader) {
            var handler = this.StrokeStart;

            if (!Bridge.staticEquals(handler, null)) {
                if (this.m_protocolContext.getProtocolLevel() >= Wacom.SmartPadCommunication.SppLevel.L_2_1_2) {
                    var timestamp = reader.readDateTime();
                    var penType = reader.readByte();
                    var penId = reader.readULong();

                    handler(this, new Wacom.SmartPadCommunication.StrokeStartEventArgs(timestamp, penType, (System.Nullable.lifteq("equals", penId, System.UInt64(0))) ? System.UInt64.lift(null) : penId));
                }
                else  {
                    // Read the time offset from the start of the real time mode.
                    // After the message head there is a constant 0xEEEE (two bytes) that we skip.
                    var offsetFromRealtimeModeStart = reader.readUInt(); // Utils.ReadUIntLE(bytes, offset + 2);

                    // The offset is specified in 5 millisecond units.
                    var millisecondsFromRealTimeModeStart = offsetFromRealtimeModeStart * 5.0;

                    var timestamp1 = new Date(this.m_realTimeModeStartTime.valueOf() + Math.round(millisecondsFromRealTimeModeStart));

                    handler(this, new Wacom.SmartPadCommunication.StrokeStartEventArgs(timestamp1, Wacom.SmartPadCommunication.PenType.UnknownPen, System.UInt64.lift(null)));
                }
            }
        },
        process_E_StrokeChunk: function (reader, head) {
            this.readRealTimeChunkPoints(reader, head.m_length);
        },
        process_E_BarcodeScanRecord: function (reader, head) {
            var handler = this.BarcodeScanned;

            if (!Bridge.staticEquals(handler, null)) {
                var barcodeScanRecordLenght = head.m_length;

                var barcodeScanRecord = null;

                if (barcodeScanRecordLenght > 0) {
                    barcodeScanRecord = reader.readBytes(barcodeScanRecordLenght);
                }

                handler(this, new Wacom.SmartPadCommunication.BarcodeScannedEventArgs(barcodeScanRecord));
            }
        },
        process_E_EncryptedStrokeStart: function (reader, head) {
            var handler = this.StrokeStart;

            if (!Bridge.staticEquals(handler, null)) {
                var encryptedDataLenght = head.m_length;

                var encryptedBytes = reader.readBytes(encryptedDataLenght);

                var decryptedPayload = this.m_protocolContext.getCryptography().decryptBytes(encryptedBytes);

                // Reuse the event reader to avoid new
                reader.init(decryptedPayload, 0);

                var timestamp = reader.readDateTime();
                var penType = reader.readByte();
                var penId = reader.readULong();

                handler(this, new Wacom.SmartPadCommunication.StrokeStartEventArgs(timestamp, penType, (System.Nullable.lifteq("equals", penId, System.UInt64(0))) ? System.UInt64.lift(null) : penId));
            }
        },
        process_E_EncryptedStrokeChunk: function (reader, head) {
            var encryptedDataLenght = head.m_length;

            var encryptedBytes = reader.readBytes(encryptedDataLenght);

            var decryptedPayload = this.m_protocolContext.getCryptography().decryptBytes(encryptedBytes);

            reader.init(decryptedPayload, 0);

            this.readRealTimeChunkPoints(reader, decryptedPayload.length);
        },
        process_E_EncryptedBarcodeScanRecord: function (reader, head) {
            var handler = this.BarcodeScanned;

            if (!Bridge.staticEquals(handler, null)) {
                var encryptedDataLenght = head.m_length;

                var barcodeScanRecord = null;

                if (encryptedDataLenght > 0) {
                    var encryptedBytes = reader.readBytes(encryptedDataLenght);

                    barcodeScanRecord = this.m_protocolContext.getCryptography().decryptBytes(encryptedBytes);
                }

                handler(this, new Wacom.SmartPadCommunication.BarcodeScannedEventArgs(barcodeScanRecord));
            }
        },
        readRealTimeChunkPoints: function (reader, dataSize) {
            var pointDataSize = 6;
            var pointsCount = (Bridge.Int.div(dataSize, pointDataSize)) | 0;

            var pp = new Wacom.SmartPadCommunication.SpPoint();
            pp.m_isValid = true;

            for (var i = 0; i < pointsCount; i = (i + 1) | 0) {
                pp.m_x = reader.readUShort();
                pp.m_y = reader.readUShort();
                pp.m_pressure = reader.readUShort();

                this.m_realTimeParser.processInputPoint(pp.$clone());
            }
        },
        cmdChainAuthorize: function (reset, appId) {
            if (this.m_protocolContext.getProtocolLevel() >= Wacom.SmartPadCommunication.SppLevel.L_2_1_2) {
                if (this.m_ccAuthorize_2_1_2 == null) {
                    this.m_ccAuthorize_2_1_2 = new Wacom.SmartPadCommunication.CmdChainAuthorize_2_1_2();
                }

                if (reset) {
                    this.m_ccAuthorize_2_1_2.reset(this.m_protocolContext, appId);
                }

                return this.m_ccAuthorize_2_1_2;
            }
            else  {
                if (this.m_ccAuthorize_1_2_2 == null) {
                    this.m_ccAuthorize_1_2_2 = new Wacom.SmartPadCommunication.CmdChainAuthorize_1_2_2();
                }

                if (reset) {
                    this.m_ccAuthorize_1_2_2.reset(this.m_protocolContext, appId);
                }

                return this.m_ccAuthorize_1_2_2;
            }
        },
        cmdChainCheckAuthorization: function (reset, appId) {
            if (this.m_protocolContext.getProtocolLevel() >= Wacom.SmartPadCommunication.SppLevel.L_2_1_2) {
                if (this.m_ccCheckAuthorization_2_1_2 == null) {
                    this.m_ccCheckAuthorization_2_1_2 = new Wacom.SmartPadCommunication.CmdChainCheckAuthorization_2_1_2();
                }

                if (reset) {
                    this.m_ccCheckAuthorization_2_1_2.reset(this.m_protocolContext, appId);
                }

                return this.m_ccCheckAuthorization_2_1_2;
            }
            else  {
                if (this.m_ccCheckAuthorization_1_2_2 == null) {
                    this.m_ccCheckAuthorization_1_2_2 = new Wacom.SmartPadCommunication.CmdChainCheckAuthorization_1_2_2();
                }

                if (reset) {
                    this.m_ccCheckAuthorization_1_2_2.reset(this.m_protocolContext, appId);
                }

                return this.m_ccCheckAuthorization_1_2_2;
            }
        },
        cmdChainDeleteAllFiles: function (reset) {
            if (this.m_ccDeleteAllFiles == null) {
                this.m_ccDeleteAllFiles = new Wacom.SmartPadCommunication.CmdChainDeleteAllFiles();
            }

            if (reset) {
                this.m_ccDeleteAllFiles.reset();
            }

            return this.m_ccDeleteAllFiles;
        },
        cmdChainDeleteOldestFile: function (reset) {
            if (this.m_ccDeleteOldestFile == null) {
                this.m_ccDeleteOldestFile = new Wacom.SmartPadCommunication.CmdChainDeleteOldestFile();
            }

            if (reset) {
                this.m_ccDeleteOldestFile.reset();
            }

            return this.m_ccDeleteOldestFile;
        },
        cmdChainForceDisconnect: function (reset, keepCurrentConnectionState) {
            if (this.m_ccForceDisconnect == null) {
                this.m_ccForceDisconnect = new Wacom.SmartPadCommunication.CmdChainForceDisconnect();
            }

            if (reset) {
                this.m_ccForceDisconnect.reset(keepCurrentConnectionState);
            }

            return this.m_ccForceDisconnect;
        },
        cmdChainGetBatteryState: function (reset) {
            if (this.m_ccGetBatteryState == null) {
                this.m_ccGetBatteryState = new Wacom.SmartPadCommunication.CmdChainGetBatteryState();
            }

            if (reset) {
                this.m_ccGetBatteryState.reset();
            }

            return this.m_ccGetBatteryState;
        },
        cmdChainGetDateTime: function (reset) {
            if (this.m_ccGetDateTime == null) {
                this.m_ccGetDateTime = new Wacom.SmartPadCommunication.CmdChainGetDateTime();
            }

            if (reset) {
                this.m_ccGetDateTime.reset();
            }

            return this.m_ccGetDateTime;
        },
        cmdChainGetDeviceID: function (reset) {
            if (this.m_ccGetDeviceId == null) {
                this.m_ccGetDeviceId = new Wacom.SmartPadCommunication.CmdChainGetDeviceID();
            }

            if (reset) {
                this.m_ccGetDeviceId.reset();
            }

            return this.m_ccGetDeviceId;
        },
        cmdChainGetDeviceName: function (reset) {
            if (this.m_ccGetDeviceName == null) {
                this.m_ccGetDeviceName = new Wacom.SmartPadCommunication.CmdChainGetDeviceName();
            }

            if (reset) {
                this.m_ccGetDeviceName.reset();
            }

            return this.m_ccGetDeviceName;
        },
        cmdChainGetFileInfo: function (reset) {
            if (this.m_ccGetFileInfo == null) {
                this.m_ccGetFileInfo = new Wacom.SmartPadCommunication.CmdChainGetFileInfo();
            }

            if (reset) {
                this.m_ccGetFileInfo.reset();
            }

            return this.m_ccGetFileInfo;
        },
        cmdChainGetFilesCount: function (reset) {
            if (this.m_ccGetFilesCount == null) {
                this.m_ccGetFilesCount = new Wacom.SmartPadCommunication.CmdChainGetFilesCount();
            }

            if (reset) {
                this.m_ccGetFilesCount.reset();
            }

            return this.m_ccGetFilesCount;
        },
        cmdChainGetFirmwareVersion: function (reset) {
            if (this.m_protocolContext.getProtocolLevel() >= Wacom.SmartPadCommunication.SppLevel.L_2_1_3) {
                if (this.m_ccGetFirmwareVersion_2_1_3 == null) {
                    this.m_ccGetFirmwareVersion_2_1_3 = new Wacom.SmartPadCommunication.CmdChainGetFirmwareVersion_2_1_3();
                }

                if (reset) {
                    this.m_ccGetFirmwareVersion_2_1_3.reset();
                }

                return this.m_ccGetFirmwareVersion_2_1_3;
            }
            else  {
                if (this.m_ccGetFirmwareVersion_1_2_2 == null) {
                    this.m_ccGetFirmwareVersion_1_2_2 = new Wacom.SmartPadCommunication.CmdChainGetFirmwareVersion_1_2_2();
                }

                if (reset) {
                    this.m_ccGetFirmwareVersion_1_2_2.reset();
                }

                return this.m_ccGetFirmwareVersion_1_2_2;
            }
        },
        cmdChainGetOldestFile: function (reset) {
            if (this.m_ccGetOldestFile == null) {
                this.m_ccGetOldestFile = new Wacom.SmartPadCommunication.CmdChainGetOldestFile();
            }

            if (reset) {
                this.m_ccGetOldestFile.reset();
            }

            return this.m_ccGetOldestFile;
        },
        cmdChainGetParam: function (reset, parameter) {
            if (this.m_ccGetParam == null) {
                this.m_ccGetParam = new Wacom.SmartPadCommunication.CmdChainGetParam();
            }

            if (reset) {
                this.m_ccGetParam.reset(parameter);
            }

            return this.m_ccGetParam;
        },
        cmdChainGetSerialNumber: function (reset) {
            if (this.m_ccGetSerialNumber == null) {
                this.m_ccGetSerialNumber = new Wacom.SmartPadCommunication.CmdChainGetSerialNumber();
            }

            if (reset) {
                this.m_ccGetSerialNumber.reset();
            }

            return this.m_ccGetSerialNumber;
        },
        cmdChainGetState: function (reset) {
            if (this.m_ccGetState == null) {
                this.m_ccGetState = new Wacom.SmartPadCommunication.CmdChainGetState();
            }

            if (reset) {
                this.m_ccGetState.reset();
            }

            return this.m_ccGetState;
        },
        cmdChainGetSupportedParams: function (reset) {
            if (this.m_ccGetGetSupportedParams == null) {
                this.m_ccGetGetSupportedParams = new Wacom.SmartPadCommunication.CmdChainGetSupportedParams();
            }

            if (reset) {
                this.m_ccGetGetSupportedParams.reset();
            }

            return this.m_ccGetGetSupportedParams;
        },
        cmdChainResetToDefaults: function (reset) {
            if (this.m_ccResetToDefaults == null) {
                this.m_ccResetToDefaults = new Wacom.SmartPadCommunication.CmdChainResetToDefaults();
            }

            if (reset) {
                this.m_ccResetToDefaults.reset();
            }

            return this.m_ccResetToDefaults;
        },
        cmdChainSetDateTime: function (reset, dt) {
            if (this.m_ccSetDateTime == null) {
                this.m_ccSetDateTime = new Wacom.SmartPadCommunication.CmdChainSetDateTime();
            }

            if (reset) {
                this.m_ccSetDateTime.reset(dt);
            }

            return this.m_ccSetDateTime;
        },
        cmdChainSetDeviceName: function (reset, deviceNameUTF8) {
            if (this.m_protocolContext.getProtocolLevel() >= Wacom.SmartPadCommunication.SppLevel.L_2_1_2) {
                if (this.m_ccSetDeviceName_2_1_2 == null) {
                    this.m_ccSetDeviceName_2_1_2 = new Wacom.SmartPadCommunication.CmdChainSetDeviceName_2_1_2();
                }

                if (reset) {
                    this.m_ccSetDeviceName_2_1_2.reset(this.m_protocolContext, deviceNameUTF8);
                }

                return this.m_ccSetDeviceName_2_1_2;
            }
            else  {
                if (this.m_ccSetDeviceName_1_2_2 == null) {
                    this.m_ccSetDeviceName_1_2_2 = new Wacom.SmartPadCommunication.CmdChainSetDeviceName_1_2_2();
                }

                if (reset) {
                    this.m_ccSetDeviceName_1_2_2.reset(this.m_protocolContext, deviceNameUTF8);
                }

                return this.m_ccSetDeviceName_1_2_2;
            }
        },
        cmdChainSetParam: function (reset, parameter, value) {
            if (this.m_ccSetParam == null) {
                this.m_ccSetParam = new Wacom.SmartPadCommunication.CmdChainSetParam();
            }

            if (reset) {
                this.m_ccSetParam.reset(parameter, value);
            }

            return this.m_ccSetParam;
        },
        cmdChainSetState: function (reset, state) {
            if (this.m_ccSetState == null) {
                this.m_ccSetState = new Wacom.SmartPadCommunication.CmdChainSetState();
            }

            if (reset) {
                this.m_ccSetState.reset(state);
            }

            return this.m_ccSetState;
        },
        cmdChainGetDecryptionKey: function (reset) {
            if (this.m_ccGetDecryptionKey == null) {
                this.m_ccGetDecryptionKey = new Wacom.SmartPadCommunication.CmdChainGetDecryptionKey();
            }

            if (reset) {
                this.m_ccGetDecryptionKey.reset();
            }

            return this.m_ccGetDecryptionKey;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.SmartPadClientId', {
        m_bytes: null,
        constructor: function (b0, b1, b2, b3, b4, b5) {
            this.m_bytes = [b0, b1, b2, b3, b4, b5];
        },
        getItem: function (index) {
            return this.m_bytes[index];
        },
        getLength: function () {
            return this.m_bytes.length;
        },
        asArray: function () {
            var result = System.Array.init(this.m_bytes.length, 0);
            System.Array.copy(this.m_bytes, 0, result, 0, this.m_bytes.length);
            return result;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.SmartPadDataParser', {
        m_state: 0,
        config: {
            init: function () {
                this.m_prevPoint = new Wacom.SmartPadCommunication.SpPoint();
            }
        },
        processInputPoint: function (cur) {
            cur = {v:cur};
            switch (this.m_state) {
                case Wacom.SmartPadCommunication.ParserState.Idle:
                    this.onParserState_Idle(cur);
                    break;
                case Wacom.SmartPadCommunication.ParserState.Begin:
                    this.onParserState_Begin(cur);
                    break;
                case Wacom.SmartPadCommunication.ParserState.Move:
                    this.onParserState_Move(cur);
                    break;
            }
        },
        onParserState_Idle: function (cur) {
            if (cur.v.isRealtimeStrokeEnd()) {
                // Ignore cur
            }
            else  {
                this.beginStroke(cur.v.$clone());
                this.m_prevPoint = cur.v.$clone();
                this.m_state = Wacom.SmartPadCommunication.ParserState.Begin;
            }
        },
        onParserState_Begin: function (cur) {
            if (cur.v.isRealtimeStrokeEnd()) {
                this.endStroke(this.m_prevPoint.$clone());
                this.m_state = Wacom.SmartPadCommunication.ParserState.Idle;
            }
            else  {
                this.moveStroke(cur.v.$clone());
                this.m_prevPoint = cur.v.$clone();
                this.m_state = Wacom.SmartPadCommunication.ParserState.Move;
            }
        },
        onParserState_Move: function (cur) {
            if (cur.v.isRealtimeStrokeEnd()) {
                this.endStroke(this.m_prevPoint.$clone());
                this.m_state = Wacom.SmartPadCommunication.ParserState.Idle;
            }
            else  {
                this.moveStroke(cur.v.$clone());
                this.m_prevPoint = cur.v.$clone();
            }
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.SmartPadDecompressor', {
        statics: {
            len: 4,
            decompress: function (compressedData, offset) {
                try {
                    var decompressor = new Wacom.SmartPadCommunication.SmartPadDecompressor(compressedData);

                    return decompressor.decompressData(offset);
                }
                catch (ex) {
                    ex = System.Exception.create(ex);
                    throw new System.Exception("Unable to decompress data", ex);
                }
            }
        },
        m_compressedData: null,
        m_decompressedData: null,
        m_workBuffer: null,
        m_predict: null,
        m_diff: null,
        m_bits: null,
        constructor: function (compressedData) {
            this.m_compressedData = compressedData;

            // Initial capacity estimation
            this.m_decompressedData = new System.Collections.Generic.List$1(System.Byte)(((compressedData.length * 5) | 0));

            this.m_workBuffer = System.Array.init(12, 0);
            this.m_predict = System.Array.init(Wacom.SmartPadCommunication.SmartPadDecompressor.len, 0);
            this.m_diff = System.Array.init(Wacom.SmartPadCommunication.SmartPadDecompressor.len, 0);
            this.m_bits = System.Array.init(Wacom.SmartPadCommunication.SmartPadDecompressor.len, 0);
        },
        decompressData: function (readIndex) {
            var $t;
            this.m_decompressedData.clear();

            var t0 = 0;
            var t1 = 4;
            var t2 = 8;
            var shData;

            while (readIndex < this.m_compressedData.length) {
                var data_tag = this.m_compressedData[Bridge.identity(readIndex, (readIndex = (readIndex + 1) | 0))];
                this.m_bits[0] = data_tag & 3;
                this.m_bits[1] = (data_tag >> 2) & 3;
                this.m_bits[2] = (data_tag >> 4) & 3;
                this.m_bits[3] = (data_tag >> 6) & 3;

                for (var i = 0; i < 4; i = (i + 1) | 0) {
                    var tmp = this.m_workBuffer[((t1 + i) | 0)] & 65535;
                    tmp = (((tmp * 2) | 0) - (this.m_workBuffer[((t2 + i) | 0)] & 65535)) | 0;
                    this.m_predict[i] = tmp;
                }

                for (var i1 = 0; i1 < 4; i1 = (i1 + 1) | 0) {
                    this.m_diff[i1] = 0;

                    switch (this.m_bits[i1]) {
                        case 0:  // no data
                            this.m_diff[i1] = 0;
                            this.m_workBuffer[((t0 + i1) | 0)] = Bridge.Int.sxs((this.m_predict[i1]) & 65535);
                            break;
                        case 1:  // 4 bits, not implemented
                            this.m_diff[i1] = 0;
                            this.m_workBuffer[((t0 + i1) | 0)] = Bridge.Int.sxs((this.m_predict[i1]) & 65535);
                            break;
                        case 2:  // 8 bits
                            this.m_diff[i1] = Bridge.Int.sxb((this.m_compressedData[Bridge.identity(readIndex, (readIndex = (readIndex + 1) | 0))]) & 255); // sign extended !!!
                            this.m_workBuffer[((t0 + i1) | 0)] = Bridge.Int.sxs(((((this.m_predict[i1] + this.m_diff[i1]) | 0))) & 65535);
                            break;
                        case 3:
                            shData = this.readShort(readIndex);
                            readIndex = (readIndex + 2) | 0;
                            this.m_diff[i1] = shData;
                            this.m_workBuffer[((t0 + i1) | 0)] = ($t = (this.m_workBuffer[((t2 + i1) | 0)] = shData, shData), this.m_workBuffer[((t1 + i1) | 0)] = $t, $t);
                            break;
                    }
                }

                for (var i2 = 0; i2 < 4; i2 = (i2 + 1) | 0) {
                    this.m_decompressedData.add(((this.m_workBuffer[((t0 + i2) | 0)]) & 255));
                    this.m_decompressedData.add((((this.m_workBuffer[((t0 + i2) | 0)] >> 8)) & 255));
                }

                // shift buffer
                var t_temp;
                t_temp = t2;
                t2 = t1;
                t1 = t0;
                t0 = t_temp;
            }

            return (this.m_decompressedData != null) ? this.m_decompressedData.toArray() : null;
        },
        readShort: function (readIndex) {
            var LSB = this.m_compressedData[((readIndex + 0) | 0)];
            var MSB = this.m_compressedData[((readIndex + 1) | 0)];

            return Bridge.Int.sxs(((MSB << 8 | (255 & LSB))) & 65535);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.SmartPadFileParser_020102', {
        statics: {
            parseData: function (context, data, fileTimestamp) {
                var chunkSize = 8;
                var penIdMask = 128;
                var newLayerMask = 64;
                var penTypeMask = 63;

                var currentPenId = System.UInt64.lift(null);

                if ((data.length % chunkSize) !== 0) {
                    throw new System.ArgumentException("Unexpected data length!!");
                }

                var chunksCount = (Bridge.Int.div(data.length, chunkSize)) | 0;
                var reader = context.createMessageReader(data);

                var paths = new System.Collections.Generic.List$1(Wacom.SmartPadCommunication.SpStroke)();
                var curPath = null;

                for (; chunksCount > 0; chunksCount = (chunksCount - 1) | 0) {
                    var tag = reader.readByte();

                    if (tag === 255) {
                        var tag2 = reader.readByte();
                        if (tag2 !== 255) {
                            throw new Wacom.SmartPadCommunication.InvalidFileFormatException("Stroke point marker:" + System.Byte.format(tag2, "X2"));
                        }

                        var x = reader.readUShort();
                        var y = reader.readUShort();
                        var p = reader.readUShort();

                        if ((x === 65535) && (y === 65535) && (p === 65535)) {
                            // This is a marker for end of file (must be the last record in the file)
                        }
                        else  {
                            if (curPath == null) {
                                throw new Wacom.SmartPadCommunication.InvalidFileFormatException("Missing stroke head");
                            }

                            curPath.addPoint(x, y, p);
                        }
                    }
                    else  {
                        if (tag === 250) {
                            // Read flags and date-time
                            var flags = reader.readByte();
                            var timestamp = reader.readDateTime();

                            if ((flags & penIdMask) !== 0) {
                                currentPenId = reader.readULong();

                                chunksCount = (chunksCount - 1) | 0;
                            }

                            curPath = new Wacom.SmartPadCommunication.SpStroke(timestamp, currentPenId, (flags & penTypeMask), ((flags & newLayerMask) !== 0));
                            paths.add(curPath);
                        }
                        else  {
                            if (tag === 221) {
                                var tag21 = reader.readByte();

                                if (tag21 !== 221) {
                                    throw new Wacom.SmartPadCommunication.InvalidFileFormatException("Lost points marker:" + System.Byte.format(tag21, "X2"));
                                }

                                // Read the lost points count
                                var numberOfLostPoints = reader.readUShort();

                                // Skip 4 bytes
                                reader.skipBytes(4);

                                if (curPath == null) {
                                    throw new Wacom.SmartPadCommunication.InvalidFileFormatException("Missing stroke head");
                                }

                                // Add invalid points to the stroke
                                curPath.addInvalidPoints(numberOfLostPoints);
                            }
                            else  {
                                throw new Wacom.SmartPadCommunication.InvalidFileFormatException("Unknown marker:" + System.Byte.format(tag, "X2"));
                            }
                        }
                    }
                }

                return paths;
            }
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.SmartPadFileParser_Columbia', {
        statics: {
            parseData: function (context, data, fileTimestamp) {
                var chunkSize = 8;
                var STROKE_HEAD = 61183;
                var STROKE_POINT = 65535;
                var LOST_POINTS_MARKER = 56831;
                var POINT_REPORT_RATE = 5;

                if ((data.length % chunkSize) !== 0) {
                    throw new System.ArgumentException("Unexpected data length!!");
                }

                var chunksCount = (Bridge.Int.div(data.length, chunkSize)) | 0;
                var reader = context.createMessageReader(data);

                var paths = new System.Collections.Generic.List$1(Wacom.SmartPadCommunication.SpStroke)();
                var curPath = null;

                for (; chunksCount > 0; chunksCount = (chunksCount - 1) | 0) {
                    var value = reader.readUShort();

                    if (value === STROKE_POINT) {
                        var x = reader.readUShort();
                        var y = reader.readUShort();
                        var p = reader.readUShort();

                        if ((x === 65535) && (y === 65535) && (p === 65535)) {
                            // This is a marker for end of stroke - skip it
                        }
                        else  {
                            if (curPath == null) {
                                // Workaround for Columbia bug
                                curPath = Wacom.SmartPadCommunication.SmartPadFileParser_Columbia.createStrokeForMissingStrokeHead(paths);
                            }

                            curPath.addPoint(x, y, p);
                        }
                    }
                    else  {
                        if (value === STROKE_HEAD) {
                            // Skip 2 bytes
                            reader.skipBytes(2);

                            // Read the time offset from the file timestamp
                            var offsetFromFileTimestamp = reader.readUInt();

                            var strokeTimestamp = new Date(fileTimestamp.valueOf() + Math.round(((offsetFromFileTimestamp * POINT_REPORT_RATE) >>> 0)));

                            curPath = new Wacom.SmartPadCommunication.SpStroke(strokeTimestamp, System.UInt64.lift(null), Wacom.SmartPadCommunication.PenType.UnknownPen, false);
                            paths.add(curPath);
                        }
                        else  {
                            if (value === LOST_POINTS_MARKER) {
                                if (curPath == null) {
                                    // Workaround for Columbia bug
                                    curPath = Wacom.SmartPadCommunication.SmartPadFileParser_Columbia.createStrokeForMissingStrokeHead(paths);
                                }

                                // Skip 4 bytes
                                reader.skipBytes(4);

                                // Read the lost points count
                                var numberOfLostPoints = reader.readUShort();

                                // Add invalid points to the stroke
                                curPath.addInvalidPoints(numberOfLostPoints);
                            }
                            else  {
                                throw new Wacom.SmartPadCommunication.InvalidFileFormatException("Unknown marker:" + System.UInt16.format(value, "X4"));
                            }
                        }
                    }
                }

                return paths;
            },
            createStrokeForMissingStrokeHead: function (paths) {
                // Note: Sometimes Columbia does not insert stroke headers (which is a violation of the format).
                // We still treat the file as valid and don't throw exception - this way the user will not loose data.

                // Workaround for Columbia bug
                var curPath = new Wacom.SmartPadCommunication.SpStroke(new Date(-864e13), System.UInt64.lift(null), Wacom.SmartPadCommunication.PenType.UnknownPen, false);
                paths.add(curPath);
                return curPath;
            }
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.SmartPadFileReader', {
        statics: {
            MAGIC_ID_OLD: 1952594018,
            MAGIC_ID_NEW: 1701413479,
            getStrokes: function (context, fileData, fileTimestamp) {
                var fileFormatID = Wacom.SmartPadCommunication.Utils.readUIntLE(fileData, 0);

                if (fileFormatID === Wacom.SmartPadCommunication.SmartPadFileReader.MAGIC_ID_OLD) {
                    var decompressedData = Wacom.SmartPadCommunication.SmartPadDecompressor.decompress(fileData, 4);

                    return Wacom.SmartPadCommunication.SmartPadFileParser_Columbia.parseData(context, decompressedData, fileTimestamp);
                }
                else  {
                    if (fileFormatID === Wacom.SmartPadCommunication.SmartPadFileReader.MAGIC_ID_NEW) {
                        var fileTimeStamp = Wacom.SmartPadCommunication.Utils.readUnixTimeStamp(fileData, 4);
                        var strokesCount = Wacom.SmartPadCommunication.Utils.readUIntLE(fileData, 10);

                        var decompressedData1 = Wacom.SmartPadCommunication.SmartPadDecompressor.decompress(fileData, 16);

                        try {
                            return Wacom.SmartPadCommunication.SmartPadFileParser_020102.parseData(context, decompressedData1, fileTimestamp);
                        }
                        catch(e) {
                            if (global.debug) {
                                console.log("%c ---------- DECOMPRESSED FILE DATA ----------", "color: #0E74E8");
                                console.info("%c" + Wacom.SmartPadCommunication.SmartPad.byteArrayAsHexString(decompressedData1), "background: #FFFBD5; color: #735200;");
                            }

                            throw e;
                        }
                    }
                }

                throw new System.Exception(System.String.format("File format with ID:{0} is not supported", fileFormatID));
            }
        }
    });

    /**
     * Specifies the parameters of the SmartPad device.
     *
     * @public
     * @class Wacom.SmartPadCommunication.SmartPadParameter
     */
    Bridge.define('Wacom.SmartPadCommunication.SmartPadParameter', {
        statics: {
            /**
             * The connection interval is the amount of time in seconds between two data sessions.
             DEFAULT VALUE(dec): 60
             ACCESS LEVEL: Writable
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SmartPadParameter
             * @constant
             * @default 1
             * @type Wacom.SmartPadCommunication.SmartPadParameter
             */
            CONNECTION_INTERVAL: 1,
            /**
             * The amount of time (in seconds) the peripheral should be ready to accept incoming connections.
             DEFAULT VALUE(dec): 5
             ACCESS LEVEL: Writable
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SmartPadParameter
             * @constant
             * @default 2
             * @type Wacom.SmartPadCommunication.SmartPadParameter
             */
            DATA_SESSION_ACCEPT_DURATION: 2,
            /**
             * The width of the note taking area in m^-5 units (meters to the power of minus 5).
             (read-only)
             (depending on the peripheral)
             DEFAULT VALUE(dec): Depends on the SmartPad
             ACCESS LEVEL: Read-only
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SmartPadParameter
             * @constant
             * @default 3
             * @type Wacom.SmartPadCommunication.SmartPadParameter
             */
            NOTE_WIDTH: 3,
            /**
             * The height of the note taking area in m^-5 units (meters to the power of minus 5).
             (read-only)
             (depending on the peripheral)
             DEFAULT VALUE(dec): Depends on the SmartPad
             ACCESS LEVEL: Read-only
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SmartPadParameter
             * @constant
             * @default 4
             * @type Wacom.SmartPadCommunication.SmartPadParameter
             */
            NOTE_HEIGHT: 4,
            /**
             * Specifies the minimal change of the battery level in percentages, which the peripheral should report.
             If the battery level has changed with PARAM_BATTERY_LEVEL_REPORT_CHANGE percent since the last data session, the peripheral is considered to have new data to report.
             DEFAULT VALUE(dec): 1
             ACCESS LEVEL: Writable
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SmartPadParameter
             * @constant
             * @default 5
             * @type Wacom.SmartPadCommunication.SmartPadParameter
             */
            BATTERY_LEVEL_REPORT_CHANGE: 5,
            /**
             * The value can be one of the following:
             * 0x00 – Responses of type R_FileChunk should be reported via the CHARACTERISTIC_FILE_TRANSFER_NOTIFY characteristic.
             * 0x01 – Responses of type R_FileChunk should be reported via the CHARACTERISTIC_FILE_TRANSFER_INDICATE characteristic.
             Note: BLE Only
             DEFAULT VALUE(dec): 0
             ACCESS LEVEL: Writable
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SmartPadParameter
             * @constant
             * @default 6
             * @type Wacom.SmartPadCommunication.SmartPadParameter
             */
            FILE_TRANSFER_SERVICE_REPORTING_TYPE: 6,
            /**
             * The value can be one of the following:
             * 0x00 – Responses of type R_StrokeStart and R_StrokeChunk should be reported via the CHARACTERISTIC_REAL_TIME_NOTIFY characteristic.
             * 0x01 – Responses of type R_StrokeStart and R_StrokeChunk should be reported via the CHARACTERISTIC_REAL_TIME_INDICATE characteristic.
             Note: BLE Only
             DEFAULT VALUE(dec): 0
             ACCESS LEVEL: Writable
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SmartPadParameter
             * @constant
             * @default 7
             * @type Wacom.SmartPadCommunication.SmartPadParameter
             */
            REAL_TIME_SERVICE_REPORTING_TYPE: 7,
            /**
             * The maximum user confirmation duration in seconds.
             DEFAULT VALUE(dec): 30
             ACCESS LEVEL: Writable
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SmartPadParameter
             * @constant
             * @default 8
             * @type Wacom.SmartPadCommunication.SmartPadParameter
             */
            USER_CONFIRMATION_TIMEOUT: 8,
            /**
             * This parameter specifies the number of milliseconds the peripheral should wait between sending an E_UserConfirmationInProgress
             event and disconnecting the currently connected central, when a user confirmation process is initiated during a data session.
             DEFAULT VALUE(dec): 500
             ACCESS LEVEL: Writable
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SmartPadParameter
             * @constant
             * @default 9
             * @type Wacom.SmartPadCommunication.SmartPadParameter
             */
            USER_CONFIRMATION_START_ACK_DURATION: 9,
            /**
             * DEFAULT VALUE(dec): 0
             ACCESS LEVEL: Writable
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SmartPadParameter
             * @constant
             * @default 10
             * @type Wacom.SmartPadCommunication.SmartPadParameter
             */
            REPORT_DATA_SESSION_EVENTS: 10,
            /**
             * DEFAULT VALUE(dec): Depends on the SmartPad
             ACCESS LEVEL: Read-only
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SmartPadParameter
             * @constant
             * @default 11
             * @type Wacom.SmartPadCommunication.SmartPadParameter
             */
            SMARTPAD_FW_PROTOCOL_LEVEL: 11,
            /**
             * DEFAULT VALUE(dec): 0
             ACCESS LEVEL: Writable
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SmartPadParameter
             * @constant
             * @default 12
             * @type Wacom.SmartPadCommunication.SmartPadParameter
             */
            PEN_DETECTED_NOTIFICATION_FLAG: 12,
            /**
             * DEFAULT VALUE(dec): 0
             ACCESS LEVEL: Writable
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SmartPadParameter
             * @constant
             * @default 14
             * @type Wacom.SmartPadCommunication.SmartPadParameter
             */
            PEN_DETECTED_INDICATION_LED_MODE: 14,
            /**
             * DEFAULT VALUE(dec): 0
             ACCESS LEVEL: Writable
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SmartPadParameter
             * @constant
             * @default 15
             * @type Wacom.SmartPadCommunication.SmartPadParameter
             */
            PEN_DETECTED_INDICATION_SOUND_EFFECT: 15,
            /**
             * DEFAULT VALUE(dec): 0
             ACCESS LEVEL: Writable
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SmartPadParameter
             * @constant
             * @default 16
             * @type Wacom.SmartPadCommunication.SmartPadParameter
             */
            PEN_DETECTED_INDICATION_SOUND_VOL: 16,
            /**
             * DEFAULT VALUE(dec): Depends on the SmartPad
             ACCESS LEVEL: Read-only
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SmartPadParameter
             * @constant
             * @default 19
             * @type Wacom.SmartPadCommunication.SmartPadParameter
             */
            REALTIME_POINTS_RATE: 19,
            /**
             * DEFAULT VALUE(dec): Depends on the SmartPad
             ACCESS LEVEL: Read-only
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SmartPadParameter
             * @constant
             * @default 20
             * @type Wacom.SmartPadCommunication.SmartPadParameter
             */
            POINT_SIZE: 20,
            /**
             * Specifies whether real-time data encryption is enabled. The value can be one of the following:
             0 – Encryption disabled
             1 – Encryption enabled
             DEFAULT VALUE(dec): 0
             ACCESS LEVEL: Writable
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SmartPadParameter
             * @constant
             * @default 21
             * @type Wacom.SmartPadCommunication.SmartPadParameter
             */
            ENABLE_DATA_ENCRYPTION: 21
        },
        $enum: true
    });

    Bridge.define('Wacom.SmartPadCommunication.SppLevel', {
        statics: {
            /**
             * Columbia
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SppLevel
             * @constant
             * @default 66050
             * @type Wacom.SmartPadCommunication.SppLevel
             */
            L_1_2_2: 66050,
            /**
             * Columbia
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SppLevel
             * @constant
             * @default 131328
             * @type Wacom.SmartPadCommunication.SppLevel
             */
            L_2_1_0: 131328,
            /**
             * Viper
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SppLevel
             * @constant
             * @default 131330
             * @type Wacom.SmartPadCommunication.SppLevel
             */
            L_2_1_2: 131330,
            /**
             * Columbia Creative
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SppLevel
             * @constant
             * @default 131331
             * @type Wacom.SmartPadCommunication.SppLevel
             */
            L_2_1_3: 131331,
            /**
             * Barbera
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.SppLevel
             * @constant
             * @default 131584
             * @type Wacom.SmartPadCommunication.SppLevel
             */
            L_2_2_0: 131584
        },
        $enum: true
    });

    Bridge.define('Wacom.SmartPadCommunication.SpPoint', {
        statics: {
            getDefaultValue: function () { return new Wacom.SmartPadCommunication.SpPoint(); }
        },
        m_x: 0,
        m_y: 0,
        m_pressure: 0,
        m_isValid: false,
        constructor: function () {
        },
        isRealtimeStrokeEnd: function () {
            return (this.m_pressure === 0) || ((this.m_x === 65535) && (this.m_y === 65535) && (this.m_pressure === 65535));
        },
        $struct: true,
        getHashCode: function () {
            var hash = 17;
            hash = hash * 23 + -675154944;
            hash = hash * 23 + (this.m_x == null ? 0 : Bridge.getHashCode(this.m_x));
            hash = hash * 23 + (this.m_y == null ? 0 : Bridge.getHashCode(this.m_y));
            hash = hash * 23 + (this.m_pressure == null ? 0 : Bridge.getHashCode(this.m_pressure));
            hash = hash * 23 + (this.m_isValid == null ? 0 : Bridge.getHashCode(this.m_isValid));
            return hash;
        },
        equals: function (o) {
            if (!Bridge.is(o, Wacom.SmartPadCommunication.SpPoint)) {
                return false;
            }
            return Bridge.equals(this.m_x, o.m_x) && Bridge.equals(this.m_y, o.m_y) && Bridge.equals(this.m_pressure, o.m_pressure) && Bridge.equals(this.m_isValid, o.m_isValid);
        },
        $clone: function (to) {
            var s = to || new Wacom.SmartPadCommunication.SpPoint();
            s.m_x = this.m_x;
            s.m_y = this.m_y;
            s.m_pressure = this.m_pressure;
            s.m_isValid = this.m_isValid;
            return s;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.SpStroke', {
        m_points: null,
        m_penId: null,
        m_penType: 0,
        m_newLayer: false,
        config: {
            init: function () {
                this.m_timestamp = new Date(-864e13);
            }
        },
        constructor: function (timestamp, penId, penType, newLayer) {
            this.m_points = new System.Collections.Generic.List$1(Wacom.SmartPadCommunication.SpPoint)();

            this.m_timestamp = timestamp;
            this.m_penId = penId;
            this.m_penType = penType;
            this.m_newLayer = newLayer;
        },
        addPoint: function (x, y, pressure) {
            var pt = new Wacom.SmartPadCommunication.SpPoint();
            pt.m_x = x;
            pt.m_y = y;
            pt.m_pressure = pressure;
            pt.m_isValid = true;

            this.m_points.add(pt.$clone());
        },
        addInvalidPoints: function (count) {
            for (var i = 0; i < count; i = (i + 1) | 0) {
                var pt = new Wacom.SmartPadCommunication.SpPoint();
                pt.m_x = 65535;
                pt.m_y = 65535;
                pt.m_pressure = 65535;
                pt.m_isValid = false;

                this.m_points.add(pt.$clone());
            }
        }
    });

    /**
     * Specifies the possible status codes returned by the SmartPad device.
     *
     * @public
     * @class Wacom.SmartPadCommunication.StatusCode
     * @augments number
     */
    Bridge.define('Wacom.SmartPadCommunication.StatusCode', {
        statics: {
            /**
             * No error.
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.StatusCode
             * @constant
             * @default 0
             * @type Wacom.SmartPadCommunication.StatusCode
             */
            ACK: 0,
            /**
             * The general error code value.
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.StatusCode
             * @constant
             * @default 1
             * @type Wacom.SmartPadCommunication.StatusCode
             */
            GENERAL_ERROR: 1,
            /**
             * The requested operation is not supported in the peripheral’s current state.
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.StatusCode
             * @constant
             * @default 2
             * @type Wacom.SmartPadCommunication.StatusCode
             */
            INVALID_STATE: 2,
            /**
             * The specified parameter is read-only and cannot be modified.
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.StatusCode
             * @constant
             * @default 3
             * @type Wacom.SmartPadCommunication.StatusCode
             */
            READONLY_PARAM: 3,
            /**
             * The command is not supported by the device.
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.StatusCode
             * @constant
             * @default 5
             * @type Wacom.SmartPadCommunication.StatusCode
             */
            UNRECOGNIZED_COMMAND: 5,
            /**
             * The peripheral recognizes the central, but temporally doesn’t authorize the central, because user confirmation is expected (the peripheral is in UserConfirmation mode).
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.StatusCode
             * @constant
             * @default 6
             * @type Wacom.SmartPadCommunication.StatusCode
             */
            UC_IN_PROGRESS: 6,
            /**
             * The peripheral is in DataSessionReady mode, but doesn’t recognize the central and denies access.
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.StatusCode
             * @constant
             * @default 7
             * @type Wacom.SmartPadCommunication.StatusCode
             */
            NOT_AUTH_FOR_DSR: 7,
            /**
             * The command cannot be executed, because a file download is currently in progress.
             *
             * @static
             * @public
             * @memberof Wacom.SmartPadCommunication.StatusCode
             * @constant
             * @default 8
             * @type Wacom.SmartPadCommunication.StatusCode
             */
            ERROR_FILE_DOWNLOADING: 8
        },
        $enum: true
    });

    Bridge.define('Wacom.SmartPadCommunication.StrokeStartEventArgs', {
        m_penType: 0,
        m_penId: null,
        config: {
            init: function () {
                this.m_timestamp = new Date(-864e13);
            }
        },
        constructor: function (timestamp, penType, penId) {
            this.m_timestamp = timestamp;
            this.m_penType = penType;
            this.m_penId = penId;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.Tag', {
        statics: {
            C_CheckAuthorization: 230,
            C_Authorize: 231,
            C_ForceDisconnect: 240,
            C_GetDeviceID: 190,
            C_GetFirmwareVersion: 183,
            C_GetBatteryState: 185,
            C_SetState: 177,
            C_GetState: 232,
            C_SetDeviceName: 187,
            C_SetDateTime: 182,
            C_ResetToDefaults: 225,
            C_GetParam: 234,
            C_GetSupportedParams: 64,
            C_SetParam: 236,
            C_GetESerialNumber: 237,
            C_SetESerialNumber: 243,
            C_GetFilesCount: 193,
            C_GetFileInfo: 204,
            C_DownloadOldestFile: 195,
            C_DeleteOldestFile: 202,
            C_DeleteAllFiles: 226,
            C_PerformFirmwareUpdate: 178,
            C_FirmwareUpdateStart: 209,
            C_FirmwareUpdateEnd: 209,
            C_GetDecryptionKey: 7,
            R_Status: 179,
            R_UserConfirmationStatus: 228,
            R_CheckAuthorizationSuccess: 80,
            R_CheckAuthorizationFailure: 81,
            R_UserConfirmationSuccess: 83,
            R_UserConfirmationTimedOut: 84,
            R_UserConfirmationFailure: 82,
            R_DeviceID: 191,
            R_DeviceName: 188,
            R_DateTime: 189,
            R_FirmwareVersion: 184,
            R_BatteryState: 186,
            R_DeviceState: 233,
            R_ParamValue: 235,
            R_ParamsList: 227,
            R_ESN: 242,
            R_FilesCount: 194,
            R_FileInfo: 207,
            R_FileUploadStarted: 200,
            R_FileUploadEnded: 200,
            R_DecryptionKey: 8,
            E_StrokeStart: 162,
            E_StrokeChunk: 161,
            E_BarcodeScanRecord: 34,
            E_EncryptedStrokeStart: 16,
            E_EncryptedStrokeChunk: 17,
            E_EncryptedBarcodeScanRecord: 18,
            E_ResetRealtimeDataBuffer: 203,
            E_PointsLost: 163,
            E_NewLayer: 166,
            E_DataSessionEstablished: 238,
            E_DataSessionTerminated: 35,
            E_UserConfirmationInProgress: 239,
            E_BatteryState: 241,
            E_PenDetected: 33
        },
        m_protocolLevel: 131328,
        getProtocolLevel: function () {
            return this.m_protocolLevel;
        },
        getC_GetDeviceName: function () {
            if (this.m_protocolLevel >= Wacom.SmartPadCommunication.SppLevel.L_2_1_2) {
                return 219;
            }

            // Columbia
            return 187;
        },
        getC_GetDateTime: function () {
            if (this.m_protocolLevel >= Wacom.SmartPadCommunication.SppLevel.L_2_1_2) {
                return 214;
            }

            // Columbia
            return 182;
        },
        init: function (protocolLevel) {
            this.m_protocolLevel = protocolLevel;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.TransportProtocol', {
        statics: {
            BLE: 0,
            BTC: 1,
            USB: 2
        },
        $enum: true
    });

    Bridge.define('Wacom.SmartPadCommunication.UnexpectedResponseException', {
        inherits: [System.Exception],
        m_responseBytes: null,
        constructor: function (responseBytes, commandName) {
            System.Exception.prototype.$constructor.call(this, System.String.format("The device returned unexpected response for command: {0}", commandName));

            this.m_responseBytes = System.Array.init(responseBytes.length, 0);

            System.Array.copy(responseBytes, 0, this.m_responseBytes, 0, responseBytes.length);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.UnexpectedStatusException', {
        inherits: [System.Exception],
        constructor: function (status, commandName) {
            System.Exception.prototype.$constructor.call(this, System.String.format("The device returned unexpected status [{0}] for command: {1}", status, commandName));

        }
    });

    Bridge.define('Wacom.SmartPadCommunication.UserConfirmationInProgressEventArgs', {
        m_userConfirmationInProgress: 0,
        constructor: function (userConfirmationInProgress) {
            this.m_userConfirmationInProgress = userConfirmationInProgress;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.Utils', {
        statics: {
            usiBaseYear: 2000,
            headTypeALength: 2,
            readUShortLE: function (bytes, offset) {
                var b0 = bytes[((offset + 0) | 0)];
                var b1 = bytes[((offset + 1) | 0)];

                return ((((b1 << 8) | b0)) & 65535);
            },
            readUIntLE: function (bytes, offset) {
                var b0 = bytes[((offset + 0) | 0)];
                var b1 = bytes[((offset + 1) | 0)];
                var b2 = bytes[((offset + 2) | 0)];
                var b3 = bytes[((offset + 3) | 0)];

                return (((((((((b3 << 24) >>> 0)) | (((b2 << 16) >>> 0))) >>> 0) | (((b1 << 8) >>> 0))) >>> 0) | (b0)) >>> 0);
            },
            readULongLE: function (bytes, offset) {
                var b0 = System.UInt64(bytes[((offset + 0) | 0)]);
                var b1 = System.UInt64(bytes[((offset + 1) | 0)]);
                var b2 = System.UInt64(bytes[((offset + 2) | 0)]);
                var b3 = System.UInt64(bytes[((offset + 3) | 0)]);
                var b4 = System.UInt64(bytes[((offset + 4) | 0)]);
                var b5 = System.UInt64(bytes[((offset + 5) | 0)]);
                var b6 = System.UInt64(bytes[((offset + 6) | 0)]);
                var b7 = System.UInt64(bytes[((offset + 7) | 0)]);

                return ((b7.shl(56)).or((b6.shl(48))).or((b5.shl(40))).or((b4.shl(32))).or((b3.shl(24))).or((b2.shl(16))).or((b1.shl(8))).or((b0)));
            },
            readUSIDateTime: function (bytes, offset) {
                var year = (Wacom.SmartPadCommunication.Utils.hex2Decimal(bytes[offset]) + Wacom.SmartPadCommunication.Utils.usiBaseYear) | 0;
                var month = Wacom.SmartPadCommunication.Utils.hex2Decimal(bytes[((offset + 1) | 0)]);
                var day = Wacom.SmartPadCommunication.Utils.hex2Decimal(bytes[((offset + 2) | 0)]);
                var hour = Wacom.SmartPadCommunication.Utils.hex2Decimal(bytes[((offset + 3) | 0)]);
                var minute = Wacom.SmartPadCommunication.Utils.hex2Decimal(bytes[((offset + 4) | 0)]);
                var second = Wacom.SmartPadCommunication.Utils.hex2Decimal(bytes[((offset + 5) | 0)]);

                return new Date(System.Int64(Date.UTC(year, month - 1, day, hour, minute, second)).toNumber());
            },
            readUnixTimeStamp: function (bytes, offset) {
                var seconds = Wacom.SmartPadCommunication.Utils.readUIntLE(bytes, offset);
                var subSecondUnits = Wacom.SmartPadCommunication.Utils.readUShortLE(bytes, ((offset + 4) | 0));

                var milliseconds = System.Int64(seconds * 1000).add(System.Int64(Bridge.Int.div(subSecondUnits, 10)));
                return new Date(milliseconds.toNumber());
            },
            writeUShortLE: function (outputBytes, offset, value) {
                outputBytes[((offset + 0) | 0)] = ((value >> 0)) & 255;
                outputBytes[((offset + 1) | 0)] = ((value >> 8)) & 255;
            },
            writeUIntLE: function (outputBytes, offset, value) {
                outputBytes[((offset + 0) | 0)] = ((value >>> 0)) & 255;
                outputBytes[((offset + 1) | 0)] = ((value >>> 8)) & 255;
                outputBytes[((offset + 2) | 0)] = ((value >>> 16)) & 255;
                outputBytes[((offset + 3) | 0)] = ((value >>> 24)) & 255;
            },
            writeULongLE: function (outputBytes, offset, value) {
                outputBytes[((offset + 0) | 0)] = System.Int64.clipu8(value.shru(0));
                outputBytes[((offset + 1) | 0)] = System.Int64.clipu8(value.shru(8));
                outputBytes[((offset + 2) | 0)] = System.Int64.clipu8(value.shru(16));
                outputBytes[((offset + 3) | 0)] = System.Int64.clipu8(value.shru(24));
                outputBytes[((offset + 4) | 0)] = System.Int64.clipu8(value.shru(32));
                outputBytes[((offset + 5) | 0)] = System.Int64.clipu8(value.shru(40));
                outputBytes[((offset + 6) | 0)] = System.Int64.clipu8(value.shru(48));
                outputBytes[((offset + 7) | 0)] = System.Int64.clipu8(value.shru(56));
            },
            writeUSIDateTime: function (outputBytes, offset, dt) {
                dt = Wacom.SmartPadCommunication.Utils.toUTC(dt);

                outputBytes[((offset + 0) | 0)] = Wacom.SmartPadCommunication.Utils.decimal2Hex(((dt.getFullYear() - Wacom.SmartPadCommunication.Utils.usiBaseYear) | 0));
                outputBytes[((offset + 1) | 0)] = Wacom.SmartPadCommunication.Utils.decimal2Hex((dt.getMonth() + 1));
                outputBytes[((offset + 2) | 0)] = Wacom.SmartPadCommunication.Utils.decimal2Hex(dt.getDate());
                outputBytes[((offset + 3) | 0)] = Wacom.SmartPadCommunication.Utils.decimal2Hex(dt.getHours());
                outputBytes[((offset + 4) | 0)] = Wacom.SmartPadCommunication.Utils.decimal2Hex(dt.getMinutes());
                outputBytes[((offset + 5) | 0)] = Wacom.SmartPadCommunication.Utils.decimal2Hex(dt.getSeconds());
            },
            writeUnixTimeStamp: function (outputBytes, offset, dt) {
                var seconds = 0;
                var subSecondUnits = 0;

                var milliseconds = System.Int64((dt).getTime());
                seconds = System.Int64.clipu32(milliseconds.div(System.Int64(1000)));
                subSecondUnits = System.Int64.clipu16((milliseconds.mod(System.Int64(1000))).mul(System.Int64(10)));

                Wacom.SmartPadCommunication.Utils.writeUIntLE(outputBytes, offset, seconds);
                Wacom.SmartPadCommunication.Utils.writeUShortLE(outputBytes, ((offset + 4) | 0), subSecondUnits);
            },
            hex2Decimal: function (hex) {
                var ret = (Bridge.Int.div(hex, 16)) | 0;
                ret = (ret * 10) | 0;
                ret = (ret + (hex % 16)) | 0;
                return ret;
            },
            decimal2Hex: function (number) {
                return (((((((((Bridge.Int.div(number, 10)) | 0) * 16) | 0) + number % 10) | 0))) & 255);
            },
            combineDataFromMessages: function (messages) {
                var dataSize = 0;

                for (var i = 0; i < messages.getCount(); i = (i + 1) | 0) {
                    dataSize = (dataSize + (((messages.getItem(i).length - Wacom.SmartPadCommunication.Utils.headTypeALength) | 0))) | 0;
                }

                var combinedData = System.Array.init(dataSize, 0);

                var destOffset = 0;

                for (var i1 = 0; i1 < messages.getCount(); i1 = (i1 + 1) | 0) {
                    var messageDataLength = (((messages.getItem(i1).length - Wacom.SmartPadCommunication.Utils.headTypeALength) | 0));

                    if (messageDataLength > 0) {
                        System.Array.copy(messages.getItem(i1), Wacom.SmartPadCommunication.Utils.headTypeALength, combinedData, destOffset, messageDataLength);

                        destOffset = (destOffset + messageDataLength) | 0;
                    }
                }

                return combinedData;
            },
            splitDataToMessages: function (headTag, srcBytes, srcStartIndex, srcBytesCount, maxMessageLength) {
                var messages = new System.Collections.Generic.List$1(Array)();

                var maxDataLengthForChunk = (maxMessageLength - Wacom.SmartPadCommunication.Utils.headTypeALength) | 0;
                var remainingBytes = srcBytesCount;
                var msgDataLength = 0;

                while (remainingBytes > 0) {
                    msgDataLength = Math.min(maxDataLengthForChunk, remainingBytes);

                    var msg = System.Array.init(((Wacom.SmartPadCommunication.Utils.headTypeALength + msgDataLength) | 0), 0);
                    msg[0] = headTag;
                    msg[1] = msgDataLength & 255;

                    System.Array.copy(srcBytes, srcStartIndex, msg, Wacom.SmartPadCommunication.Utils.headTypeALength, msgDataLength);

                    remainingBytes = (remainingBytes - msgDataLength) | 0;
                    srcStartIndex = (srcStartIndex + msgDataLength) | 0;

                    messages.add(msg);
                }

                if (msgDataLength === maxDataLengthForChunk) {
                    var msg1 = System.Array.init(Wacom.SmartPadCommunication.Utils.headTypeALength, 0);
                    msg1[0] = headTag;
                    msg1[1] = 0;
                    messages.add(msg1);
                }

                return messages;
            },
            isLastPacket: function (context, head) {
                return head.m_length < (((context.getMaxMessageLength() - Wacom.SmartPadCommunication.Utils.headTypeALength) | 0));
            },
            toUTC: function (dt) {
                return Bridge.Date.toUTC(dt);
            }
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.Command', {
        inherits: [Wacom.SmartPadCommunication.StateNode],
        constructor: function () {
            Wacom.SmartPadCommunication.StateNode.prototype.$constructor.call(this, false);

        },
        getCommandName: function () {
            return Bridge.getTypeName(Bridge.getType(this));
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.FinalState', {
        inherits: [Wacom.SmartPadCommunication.StateNode],
        constructor: function () {
            Wacom.SmartPadCommunication.StateNode.prototype.$constructor.call(this, true);

        },
        getNextState: function (context, responseBytes) {
            return this;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainAuthorize', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_authorize: null,
        createChain: function () {
            var connected = new Wacom.SmartPadCommunication.OnResult(0);
            var timeout = new Wacom.SmartPadCommunication.OnResult(1);
            var generalError = new Wacom.SmartPadCommunication.OnException("constructor$1", "Authorize failed: the SmartPad is not in UserConfirmation connection state and cannot process C_Authorize requests in this state");

            this.m_authorize.continueWith(connected, timeout, generalError);

            return this.m_authorize;
        },
        onComplete: function (smartPad, exception) {
            var result = 0;

            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            if (exception == null) {
                var state = Bridge.as(this.m_currentState, Wacom.SmartPadCommunication.OnResult);

                if (state != null) {
                    result = state.m_value;
                }
                else  {
                    exception = new System.Exception("Cannot obtain result from current state");
                }
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultUInt(result, exception);
        },
        reset: function (context, appId) {
            this.m_authorize.reset(context, appId);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainCheckAuthorization', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_checkAuthorization: null,
        createChain: function () {
            var onRecognizedDR = new Wacom.SmartPadCommunication.OnResult(0);
            var onRecognizedUC = new Wacom.SmartPadCommunication.OnResult(1);
            var onNotRecognizedDR = new Wacom.SmartPadCommunication.OnResult(2);
            var onNotRecognizedUC = new Wacom.SmartPadCommunication.OnResult(3);

            this.m_checkAuthorization.continueWith(onRecognizedDR, onRecognizedUC, onNotRecognizedDR, onNotRecognizedUC);

            return this.m_checkAuthorization;
        },
        onComplete: function (smartPad, exception) {
            var result = 0;

            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            if (exception == null) {
                var state = Bridge.as(this.m_currentState, Wacom.SmartPadCommunication.OnResult);

                if (state != null) {
                    result = state.m_value;
                }
                else  {
                    exception = new System.Exception("Cannot obtain result from current state");
                }
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultUInt(result, exception);
        },
        reset: function (context, appId) {
            this.m_checkAuthorization.reset(context, appId);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainDeleteAllFiles', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_deleteAllFiles: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_deleteAllFiles = new Wacom.SmartPadCommunication.DeleteAllFiles();
            var success = new Wacom.SmartPadCommunication.OnSuccess();

            this.m_deleteAllFiles.continueWith(success);

            return this.m_deleteAllFiles;
        },
        reset: function () {
            this.m_deleteAllFiles.reset();
        },
        onComplete: function (smartPad, exception) {
            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultUInt(0, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainDeleteOldestFile', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_deleteOldestFile: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_deleteOldestFile = new Wacom.SmartPadCommunication.DeleteOldestFile();

            var success = new Wacom.SmartPadCommunication.OnSuccess();
            var onGeneralError = new Wacom.SmartPadCommunication.OnException("constructor$1", "There are currently no files in the SmartPad’s memory!");

            this.m_deleteOldestFile.continueWith(success, onGeneralError);

            return this.m_deleteOldestFile;
        },
        reset: function () {
            this.m_deleteOldestFile.reset();
        },
        onComplete: function (smartPad, exception) {
            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultUInt(0, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainForceDisconnect', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_cmdForceDisconnect: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_cmdForceDisconnect = new Wacom.SmartPadCommunication.ForceDisconnect();
            var success = new Wacom.SmartPadCommunication.OnSuccess();
            var onGeneralError = new Wacom.SmartPadCommunication.OnException("constructor$1", "The command ForceDisconnect could not be executed!");

            this.m_cmdForceDisconnect.continueWith(success, onGeneralError);

            return this.m_cmdForceDisconnect;
        },
        reset: function (keepCurrentConntectionState) {
            this.m_cmdForceDisconnect.reset(keepCurrentConntectionState);
        },
        onComplete: function (smartPad, exception) {
            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultUInt(0, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainGetBatteryState', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_getBatteryState: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_getBatteryState = new Wacom.SmartPadCommunication.GetBatteryState();
            var success = new Wacom.SmartPadCommunication.OnSuccess();

            this.m_getBatteryState.continueWith(success);

            return this.m_getBatteryState;
        },
        reset: function () {
            this.m_getBatteryState.reset();
        },
        onComplete: function (smartPad, exception) {
            var result = 0;

            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            if ((exception == null) && (Bridge.is(this.m_currentState, Wacom.SmartPadCommunication.OnSuccess))) {
                var percent = this.m_getBatteryState.getBatteryPercent();
                var charging = this.m_getBatteryState.getBatteryChargingState();

                result = (((((((percent << 8) >>> 0)) | charging) >>> 0))) & 65535;
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultUInt(result, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainGetDateTime', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_getDateTime: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_getDateTime = new Wacom.SmartPadCommunication.GetDateTime();
            var success = new Wacom.SmartPadCommunication.OnSuccess();

            this.m_getDateTime.continueWith(success);

            return this.m_getDateTime;
        },
        reset: function () {
            this.m_getDateTime.reset();
        },
        onComplete: function (smartPad, exception) {
            var result = new Date(-864e13);

            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            if ((exception == null) && (Bridge.is(this.m_currentState, Wacom.SmartPadCommunication.OnSuccess))) {
                result = this.m_getDateTime.getModeValue();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultDateTime(result, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainGetDecryptionKey', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_getDecryptionKey: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_getDecryptionKey = new Wacom.SmartPadCommunication.GetDecryptionKey();
            var success = new Wacom.SmartPadCommunication.OnSuccess();

            this.m_getDecryptionKey.continueWith(success);

            return this.m_getDecryptionKey;
        },
        reset: function () {
            this.m_getDecryptionKey.reset();
        },
        onComplete: function (smartPad, exception) {
            var result = 0;

            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            if ((exception == null) && (Bridge.is(this.m_currentState, Wacom.SmartPadCommunication.OnSuccess))) {
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultUInt(result, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainGetDeviceID', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_getDeviceId: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_getDeviceId = new Wacom.SmartPadCommunication.GetDeviceId();
            var success = new Wacom.SmartPadCommunication.OnSuccess();

            this.m_getDeviceId.continueWith(success);

            return this.m_getDeviceId;
        },
        reset: function () {
            this.m_getDeviceId.reset();
        },
        onComplete: function (smartPad, exception) {
            var result = System.UInt64(0);

            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            if ((exception == null) && (Bridge.is(this.m_currentState, Wacom.SmartPadCommunication.OnSuccess))) {
                result = this.m_getDeviceId.getDeviceIdValue();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultULong(result, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainGetDeviceName', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_getDeviceName: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_getDeviceName = new Wacom.SmartPadCommunication.GetDeviceName();
            var success = new Wacom.SmartPadCommunication.OnSuccess();

            this.m_getDeviceName.continueWith(success);

            return this.m_getDeviceName;
        },
        reset: function () {
            this.m_getDeviceName.reset();
        },
        onComplete: function (smartPad, exception) {
            var result = null;

            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            if ((exception == null) && (Bridge.is(this.m_currentState, Wacom.SmartPadCommunication.OnSuccess))) {
                result = this.m_getDeviceName.getDeviceNameUTF8();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultObject(result, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainGetFileInfo', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_getFileInfo: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_getFileInfo = new Wacom.SmartPadCommunication.GetFileInfo();
            var success = new Wacom.SmartPadCommunication.OnSuccess();
            var onGeneral = new Wacom.SmartPadCommunication.OnException("constructor$1", "There are currently no files in the SmartPad’s memory!");

            this.m_getFileInfo.continueWith(success, onGeneral);

            return this.m_getFileInfo;
        },
        reset: function () {
            this.m_getFileInfo.reset();
        },
        onComplete: function (smartPad, exception) {
            var result = null;

            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            if ((exception == null) && (Bridge.is(this.m_currentState, Wacom.SmartPadCommunication.OnSuccess))) {
                result = this.m_getFileInfo.getResult().$clone();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultObject(result, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainGetFilesCount', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_getFilesCount: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_getFilesCount = new Wacom.SmartPadCommunication.GetFilesCount();
            var success = new Wacom.SmartPadCommunication.OnSuccess();

            this.m_getFilesCount.continueWith(success);

            return this.m_getFilesCount;
        },
        reset: function () {
            this.m_getFilesCount.reset();
        },
        onComplete: function (smartPad, exception) {
            var result = 0;

            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            if ((exception == null) && (Bridge.is(this.m_currentState, Wacom.SmartPadCommunication.OnSuccess))) {
                result = this.m_getFilesCount.getFilesCountValue();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultUInt(result, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainGetFirmwareVersion_1_2_2', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_getFirmwareVersion0: null,
        m_getFirmwareVersion1: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_getFirmwareVersion0 = new Wacom.SmartPadCommunication.GetFirmwareVersion_1_2_2();
            this.m_getFirmwareVersion1 = new Wacom.SmartPadCommunication.GetFirmwareVersion_1_2_2();

            var success = new Wacom.SmartPadCommunication.OnSuccess();
            var onGeneral = new Wacom.SmartPadCommunication.OnException("constructor$1", "The requested firmware identifier is invalid or not supported!");

            this.m_getFirmwareVersion0.continueWith(this.m_getFirmwareVersion1, onGeneral);
            this.m_getFirmwareVersion1.continueWith(success, onGeneral);

            return this.m_getFirmwareVersion0;
        },
        reset: function () {
            this.m_getFirmwareVersion0.reset(0);
            this.m_getFirmwareVersion1.reset(1);
        },
        onComplete: function (smartPad, exception) {
            var result = null;

            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            if ((exception == null) && (Bridge.is(this.m_currentState, Wacom.SmartPadCommunication.OnSuccess))) {
                result = System.Array.init(2, function (){
                    return new Wacom.SmartPadCommunication.FirmwareVersion();
                });
                result[0] = this.m_getFirmwareVersion0.getFirmwareVersionValue().$clone();
                result[1] = this.m_getFirmwareVersion1.getFirmwareVersionValue().$clone();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultObject(result, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainGetFirmwareVersion_2_1_3', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_getFirmwareVersion: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_getFirmwareVersion = new Wacom.SmartPadCommunication.GetFirmwareVersion_2_1_3();

            var success = new Wacom.SmartPadCommunication.OnSuccess();
            var onGeneral = new Wacom.SmartPadCommunication.OnException("constructor$1", "The requested firmware identifier is invalid or not supported!");

            this.m_getFirmwareVersion.continueWith(success, onGeneral);

            return this.m_getFirmwareVersion;
        },
        reset: function () {
            this.m_getFirmwareVersion.reset();
        },
        onComplete: function (smartPad, exception) {
            var result = null;

            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            if ((exception == null) && (Bridge.is(this.m_currentState, Wacom.SmartPadCommunication.OnSuccess))) {
                result = this.m_getFirmwareVersion.getFirmwareVersions();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultObject(result, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainGetOldestFile', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_fileData: null,
        m_receivedBytesCount: 0,
        m_crcCalculator: null,
        m_getFileInfo: null,
        m_downloadOldestFile: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_getFileInfo = new Wacom.SmartPadCommunication.GetFileInfo();
            this.m_downloadOldestFile = new Wacom.SmartPadCommunication.DownloadOldestFile();

            var onErrorNoFiles = new Wacom.SmartPadCommunication.OnException("constructor$1", "There are currently no files in the SmartPad’s memory!");
            var fileReceived = new Wacom.SmartPadCommunication.OnSuccess();

            this.m_getFileInfo.continueWith(this.m_downloadOldestFile, onErrorNoFiles);
            this.m_downloadOldestFile.continueWith(fileReceived, onErrorNoFiles);

            return this.m_getFileInfo;
        },
        onComplete: function (smartPad, exception) {
            var result = null;

            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            if ((exception == null) && (Bridge.is(this.m_currentState, Wacom.SmartPadCommunication.OnSuccess))) {
                try {
                    if (this.m_fileData == null) {
                        throw new Wacom.SmartPadCommunication.FileTransferException("File transfer could not start!");
                    }

                    var crc = this.m_downloadOldestFile.getCRC();

                    if (!System.Nullable.hasValue(crc)) {
                        throw new Wacom.SmartPadCommunication.FileTransferException("File transfer is incomplete!");
                    }

                    if (!this.checkCRC(System.Nullable.getValue(crc))) {
                        throw new Wacom.SmartPadCommunication.FileTransferException("CRC check failed");
                    }

                    result = Wacom.SmartPadCommunication.SmartPadFileReader.getStrokes(smartPad.m_protocolContext, this.m_fileData, this.m_getFileInfo.getResult().m_dateTime);
                }
                catch (ex) {
                    ex = System.Exception.create(ex);
                    exception = ex;
                }
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultObject(result, exception);
        },
        reset: function () {
            this.m_getFileInfo.reset();
            this.m_downloadOldestFile.reset();

            this.m_fileData = null;
            this.m_receivedBytesCount = 0;
        },
        receiveBuffer: function (buffer) {
            if (this.m_fileData == null) {
                // This is the first packet - allocate buffer for the data to be received
                var fileInfo = this.m_getFileInfo.getResult().$clone();

                this.m_fileData = System.Array.init(fileInfo.m_fileSize, 0);
                this.m_receivedBytesCount = 0;
            }
            else  {
                if (((this.m_receivedBytesCount + buffer.length) | 0) > this.m_fileData.length) {
                    throw new System.Exception("Insufficient size of file buffer!");
                }
            }

            System.Array.copy(buffer, 0, this.m_fileData, this.m_receivedBytesCount, buffer.length);

            this.m_receivedBytesCount = (this.m_receivedBytesCount + buffer.length) | 0;
        },
        checkCRC: function (crc) {
            if (this.m_crcCalculator == null) {
                this.m_crcCalculator = new Wacom.SmartPadCommunication.CRC32();
            }

            var calculatedCRC = this.m_crcCalculator.fullCRC(this.m_fileData, this.m_fileData.length);

            return (calculatedCRC.equals(System.Int64(crc)));
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainGetParam', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_getParam: null,
        m_onParamNotSupported: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_getParam = new Wacom.SmartPadCommunication.GetParam();
            this.m_onParamNotSupported = new Wacom.SmartPadCommunication.OnParamNotSupported();

            var success = new Wacom.SmartPadCommunication.OnSuccess();

            this.m_getParam.continueWith(success, this.m_onParamNotSupported);

            return this.m_getParam;
        },
        reset: function (param) {
            this.m_getParam.reset(param);
            this.m_onParamNotSupported.reset(param);
        },
        onComplete: function (smartPad, exception) {
            var result = 0;

            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            if ((exception == null) && (Bridge.is(this.m_currentState, Wacom.SmartPadCommunication.OnSuccess))) {
                result = this.m_getParam.getParamValue();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultUInt(result, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainGetSerialNumber', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_getESN: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_getESN = new Wacom.SmartPadCommunication.GetSerialNumber();
            var success = new Wacom.SmartPadCommunication.OnSuccess();

            this.m_getESN.continueWith(success);

            return this.m_getESN;
        },
        reset: function () {
            this.m_getESN.reset();
        },
        onComplete: function (smartPad, exception) {
            var result = null;

            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            if ((exception == null) && (Bridge.is(this.m_currentState, Wacom.SmartPadCommunication.OnSuccess))) {
                result = this.m_getESN.getSeriaNumberASCII();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultObject(result, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainGetState', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_getState: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_getState = new Wacom.SmartPadCommunication.GetState();
            var success = new Wacom.SmartPadCommunication.OnSuccess();

            this.m_getState.continueWith(success);

            return this.m_getState;
        },
        reset: function () {
            this.m_getState.reset();
        },
        onComplete: function (smartPad, exception) {
            var result = 0;

            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            if ((exception == null) && (Bridge.is(this.m_currentState, Wacom.SmartPadCommunication.OnSuccess))) {
                result = this.m_getState.getModeValue();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultUInt(result, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainGetSupportedParams', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_getSupportedParams: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_getSupportedParams = new Wacom.SmartPadCommunication.GetSupportedParams();
            var success = new Wacom.SmartPadCommunication.OnSuccess();

            this.m_getSupportedParams.continueWith(success);

            return this.m_getSupportedParams;
        },
        reset: function () {
            this.m_getSupportedParams.reset();
        },
        onComplete: function (smartPad, exception) {
            var result = null;

            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            if ((exception == null) && (Bridge.is(this.m_currentState, Wacom.SmartPadCommunication.OnSuccess))) {
                result = this.m_getSupportedParams.getParams();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultObject(result, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainResetToDefaults', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_resetToDefaults: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_resetToDefaults = new Wacom.SmartPadCommunication.ResetToDefaults();
            var success = new Wacom.SmartPadCommunication.OnSuccess();

            this.m_resetToDefaults.continueWith(success);

            return this.m_resetToDefaults;
        },
        reset: function () {
            this.m_resetToDefaults.reset();
        },
        onComplete: function (smartPad, exception) {
            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultUInt(0, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainSetDateTime', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_setDateTime: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_setDateTime = new Wacom.SmartPadCommunication.SetDateTime();
            var success = new Wacom.SmartPadCommunication.OnSuccess();
            var onGeneral = new Wacom.SmartPadCommunication.OnException("constructor$1", "The SmartPad Client has sent invalid date!");

            this.m_setDateTime.continueWith(success, onGeneral);

            return this.m_setDateTime;
        },
        reset: function (dateTime) {
            this.m_setDateTime.reset(dateTime);
        },
        onComplete: function (smartPad, exception) {
            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultUInt(0, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainSetDeviceName', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_setDeviceName: null,
        createChain: function () {
            var success = new Wacom.SmartPadCommunication.OnSuccess();
            var onGeneral = new Wacom.SmartPadCommunication.OnException("constructor$1", "The SmartPad Client has sent invalid name data!");

            this.m_setDeviceName.continueWith(success, onGeneral);

            return this.m_setDeviceName;
        },
        reset: function (context, deviceNameUTF8) {
            this.m_setDeviceName.reset(context, deviceNameUTF8);
        },
        onComplete: function (smartPad, exception) {
            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultUInt(0, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainSetParam', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_setParam: null,
        m_onParamNotSupported: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_setParam = new Wacom.SmartPadCommunication.SetParam();
            this.m_onParamNotSupported = new Wacom.SmartPadCommunication.OnParamNotSupported();

            var success = new Wacom.SmartPadCommunication.OnSuccess();
            var onReadonlyParam = new Wacom.SmartPadCommunication.OnException("constructor$1", "The requested parameter’s value cannot be changed, because it is read-only!");

            this.m_setParam.continueWith(success, this.m_onParamNotSupported, onReadonlyParam);

            return this.m_setParam;
        },
        reset: function (param, value) {
            this.m_setParam.reset(param, value);
            this.m_onParamNotSupported.reset(param);
        },
        onComplete: function (smartPad, exception) {
            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultUInt(0, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainSetState', {
        inherits: [Wacom.SmartPadCommunication.CommandChain],
        m_cmdSetState: null,
        constructor: function () {
            Wacom.SmartPadCommunication.CommandChain.prototype.$constructor.call(this);

            this.m_firstState = this.createChain();
        },
        createChain: function () {
            this.m_cmdSetState = new Wacom.SmartPadCommunication.SetState();
            var success = new Wacom.SmartPadCommunication.OnSuccess();
            var onGeneral = new Wacom.SmartPadCommunication.OnException("constructor$1", "The requested data session state is invalid or unsupported!");

            this.m_cmdSetState.continueWith(success, onGeneral);

            return this.m_cmdSetState;
        },
        reset: function (stateValue) {
            this.m_cmdSetState.reset(stateValue);
        },
        onComplete: function (smartPad, exception) {
            if (exception == null) {
                exception = this.m_currentState.getException();
            }

            this.m_currentState = Wacom.SmartPadCommunication.ChainComplete.instance;

            smartPad.setResultUInt(0, exception);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.MessageReader_1_2_2', {
        inherits: [Wacom.SmartPadCommunication.MessageReader],
        constructor: function (bytes, offset) {
            Wacom.SmartPadCommunication.MessageReader.prototype.$constructor.call(this, bytes, offset);

        },
        readDateTime: function () {
            var value = Wacom.SmartPadCommunication.Utils.readUSIDateTime(this.m_bytes, this.m_index);

            this.m_index = (this.m_index + 6) | 0;

            return value;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.MessageReader_2_1_2', {
        inherits: [Wacom.SmartPadCommunication.MessageReader],
        constructor: function (bytes, offset) {
            Wacom.SmartPadCommunication.MessageReader.prototype.$constructor.call(this, bytes, offset);

        },
        readDateTime: function () {
            var value = Wacom.SmartPadCommunication.Utils.readUnixTimeStamp(this.m_bytes, this.m_index);

            this.m_index = (this.m_index + 6) | 0;

            return value;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.MessageWriter_1_2_2', {
        inherits: [Wacom.SmartPadCommunication.MessageWriter],
        constructor: function (bufferSize) {
            Wacom.SmartPadCommunication.MessageWriter.prototype.$constructor.call(this, bufferSize);

        },
        writeDateTime: function (value) {
            Wacom.SmartPadCommunication.Utils.writeUSIDateTime(this.m_bytes, this.m_index, value);

            this.m_index = (this.m_index + 6) | 0;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.MessageWriter_2_1_2', {
        inherits: [Wacom.SmartPadCommunication.MessageWriter],
        constructor: function (bufferSize) {
            Wacom.SmartPadCommunication.MessageWriter.prototype.$constructor.call(this, bufferSize);

        },
        writeDateTime: function (value) {
            Wacom.SmartPadCommunication.Utils.writeUnixTimeStamp(this.m_bytes, this.m_index, value);

            this.m_index = (this.m_index + 6) | 0;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.SmartPadRealTimeParser', {
        inherits: [Wacom.SmartPadCommunication.SmartPadDataParser],
        m_smartPad: null,
        constructor: function (smartPad) {
            Wacom.SmartPadCommunication.SmartPadDataParser.prototype.$constructor.call(this);

            this.m_smartPad = smartPad;
        },
        beginStroke: function (point) {
            this.m_smartPad.firePointReceived(point.m_x, point.m_y, point.m_pressure, 0);
        },
        moveStroke: function (point) {
            this.m_smartPad.firePointReceived(point.m_x, point.m_y, point.m_pressure, 1);
        },
        endStroke: function (point) {
            this.m_smartPad.firePointReceived(point.m_x, point.m_y, point.m_pressure, 2);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.Authorize', {
        inherits: [Wacom.SmartPadCommunication.Command],
        m_cmdBytes: null,
        m_onUserConfirmationSuccess: null,
        m_onUserConfirmationTimedOut: null,
        m_onGeneral: null,
        getCommandBytes: function (context, cmdPacketIndex) {
            return this.m_cmdBytes;
        },
        continueWith: function (onUserConfirmationSuccess, onUserConfirmationTimedOut, onGeneral) {
            this.m_onUserConfirmationSuccess = onUserConfirmationSuccess;
            this.m_onUserConfirmationTimedOut = onUserConfirmationTimedOut;
            this.m_onGeneral = onGeneral;
        },
        reset: function (context, appId) {
            var writer = context.createMessageWriterFromHeadTypeA(Wacom.SmartPadCommunication.Tag.C_Authorize, ((appId.getLength()) & 255));
            writer.writeByteArray(appId.m_bytes);

            this.m_cmdBytes = writer.getBytes();
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.ChainComplete', {
        inherits: [Wacom.SmartPadCommunication.FinalState],
        statics: {
            instance: null,
            config: {
                init: function () {
                    this.instance = new Wacom.SmartPadCommunication.ChainComplete();
                }
            }
        },
        constructor: function () {
            Wacom.SmartPadCommunication.FinalState.prototype.$constructor.call(this);

        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CheckAuthorization', {
        inherits: [Wacom.SmartPadCommunication.Command],
        m_onDR_Recognized: null,
        m_onUC_Recognized: null,
        m_onDR_NotRecognized: null,
        m_onUC_NotRecognized: null,
        m_cmdBytes: null,
        getCommandBytes: function (context, cmdPacketIndex) {
            return this.m_cmdBytes;
        },
        continueWith: function (onDR_Recognized, onUC_Recognized, onDR_NotRecognized, onUC_NotRecognized) {
            this.m_onDR_Recognized = onDR_Recognized;
            this.m_onUC_Recognized = onUC_Recognized;
            this.m_onDR_NotRecognized = onDR_NotRecognized;
            this.m_onUC_NotRecognized = onUC_NotRecognized;
        },
        reset: function (context, appId) {
            var writer = context.createMessageWriterFromHeadTypeA(Wacom.SmartPadCommunication.Tag.C_CheckAuthorization, ((appId.getLength()) & 255));
            writer.writeByteArray(appId.m_bytes);

            this.m_cmdBytes = writer.getBytes();
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainAuthorize_1_2_2', {
        inherits: [Wacom.SmartPadCommunication.CmdChainAuthorize],
        constructor: function () {
            Wacom.SmartPadCommunication.CmdChainAuthorize.prototype.$constructor.call(this);

            this.m_authorize = new Wacom.SmartPadCommunication.Authorize_1_2_2();

            this.m_firstState = this.createChain();
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainAuthorize_2_1_2', {
        inherits: [Wacom.SmartPadCommunication.CmdChainAuthorize],
        constructor: function () {
            Wacom.SmartPadCommunication.CmdChainAuthorize.prototype.$constructor.call(this);

            this.m_authorize = new Wacom.SmartPadCommunication.Authorize_2_1_2();

            this.m_firstState = this.createChain();
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainCheckAuthorization_1_2_2', {
        inherits: [Wacom.SmartPadCommunication.CmdChainCheckAuthorization],
        constructor: function () {
            Wacom.SmartPadCommunication.CmdChainCheckAuthorization.prototype.$constructor.call(this);

            this.m_checkAuthorization = new Wacom.SmartPadCommunication.CheckAuthorization_1_2_2();

            this.m_firstState = this.createChain();
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainCheckAuthorization_2_1_2', {
        inherits: [Wacom.SmartPadCommunication.CmdChainCheckAuthorization],
        constructor: function () {
            Wacom.SmartPadCommunication.CmdChainCheckAuthorization.prototype.$constructor.call(this);

            this.m_checkAuthorization = new Wacom.SmartPadCommunication.CheckAuthorization_2_1_2();

            this.m_firstState = this.createChain();
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainSetDeviceName_1_2_2', {
        inherits: [Wacom.SmartPadCommunication.CmdChainSetDeviceName],
        constructor: function () {
            Wacom.SmartPadCommunication.CmdChainSetDeviceName.prototype.$constructor.call(this);

            this.m_setDeviceName = new Wacom.SmartPadCommunication.SetDeviceName_1_2_2();

            this.m_firstState = this.createChain();
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CmdChainSetDeviceName_2_1_2', {
        inherits: [Wacom.SmartPadCommunication.CmdChainSetDeviceName],
        constructor: function () {
            Wacom.SmartPadCommunication.CmdChainSetDeviceName.prototype.$constructor.call(this);

            this.m_setDeviceName = new Wacom.SmartPadCommunication.SetDeviceName_2_1_2();

            this.m_firstState = this.createChain();
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.DeleteAllFiles', {
        inherits: [Wacom.SmartPadCommunication.Command],
        statics: {
            s_cmdBytes: null,
            config: {
                init: function () {
                    this.s_cmdBytes = [Wacom.SmartPadCommunication.Tag.C_DeleteAllFiles, 1, 0];
                }
            }
        },
        m_onAck: null,
        continueWith: function (onACK) {
            this.m_onAck = onACK;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            if (head.m_tag === Wacom.SmartPadCommunication.Tag.R_Status) {
                var status = reader.readByte();

                switch (status) {
                    case Wacom.SmartPadCommunication.StatusCode.ACK:
                        return this.m_onAck;
                    case Wacom.SmartPadCommunication.StatusCode.ERROR_FILE_DOWNLOADING:
                        throw new Wacom.SmartPadCommunication.DownloadInProgressException(this.getCommandName());
                    case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                        throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                    case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                        throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                    default:
                        throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            return Wacom.SmartPadCommunication.DeleteAllFiles.s_cmdBytes;
        },
        reset: function () {
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.DeleteOldestFile', {
        inherits: [Wacom.SmartPadCommunication.Command],
        m_cmdBytes: null,
        m_onAck: null,
        m_onGeneral: null,
        config: {
            init: function () {
                this.m_cmdBytes = [Wacom.SmartPadCommunication.Tag.C_DeleteOldestFile, 1, 0];
            }
        },
        continueWith: function (onAck, onGeneral) {
            this.m_onAck = onAck;
            this.m_onGeneral = onGeneral;
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            return this.m_cmdBytes;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            if (head.m_tag === Wacom.SmartPadCommunication.Tag.R_Status) {
                var status = reader.readByte();

                switch (status) {
                    case Wacom.SmartPadCommunication.StatusCode.ACK:
                        return this.m_onAck;
                    case Wacom.SmartPadCommunication.StatusCode.GENERAL_ERROR:
                        return this.m_onGeneral;
                    case Wacom.SmartPadCommunication.StatusCode.ERROR_FILE_DOWNLOADING:
                        throw new Wacom.SmartPadCommunication.DownloadInProgressException(this.getCommandName());
                    case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                        throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                    case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                        throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                    default:
                        throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        reset: function () {
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.DownloadOldestFile', {
        inherits: [Wacom.SmartPadCommunication.Command],
        statics: {
            s_cmdBytes: null,
            config: {
                init: function () {
                    this.s_cmdBytes = [Wacom.SmartPadCommunication.Tag.C_DownloadOldestFile, 1, 0];
                }
            }
        },
        m_onFileReceived: null,
        m_onGeneralError: null,
        m_crcValue: null,
        m_isFileTransferStarted: false,
        continueWith: function (onFileReceived, onGeneralError) {
            this.m_onFileReceived = onFileReceived;
            this.m_onGeneralError = onGeneralError;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            switch (head.m_tag) {
                case Wacom.SmartPadCommunication.Tag.R_FileUploadStarted:
                    var constant = reader.readByte();
                    switch (constant) {
                        case 190:
                            this.m_isFileTransferStarted = true;
                            // TODO: In protocol 0x00020102 the SmartPad returns File Size and DateTime.
                            return this;
                        case 237:
                            this.m_crcValue = reader.readUInt();
                            return this.m_onFileReceived;
                    }
                    break;
                case Wacom.SmartPadCommunication.Tag.R_Status:
                    var status = reader.readByte();
                    switch (status) {
                        case Wacom.SmartPadCommunication.StatusCode.GENERAL_ERROR:  // there are currently no files in the SmartPad’s memory
                            return this.m_onGeneralError;
                        case Wacom.SmartPadCommunication.StatusCode.ERROR_FILE_DOWNLOADING:
                            throw new Wacom.SmartPadCommunication.DownloadInProgressException(this.getCommandName());
                        case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                            throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                        case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                            throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                        default:
                            throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                    }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            return (this.m_isFileTransferStarted) ? null : Wacom.SmartPadCommunication.DownloadOldestFile.s_cmdBytes;
        },
        reset: function () {
            this.m_isFileTransferStarted = false;
            this.m_crcValue = null;
        },
        getCRC: function () {
            return this.m_crcValue;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.ForceDisconnect', {
        inherits: [Wacom.SmartPadCommunication.Command],
        m_onAck: null,
        m_onGeneralError: null,
        m_keepCurrentConnectionState: 0,
        continueWith: function (onAck, onGeneralError) {
            this.m_onAck = onAck;
            this.m_onGeneralError = onGeneralError;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            if (head.m_tag === Wacom.SmartPadCommunication.Tag.R_Status) {
                var status = reader.readByte();

                switch (status) {
                    case Wacom.SmartPadCommunication.StatusCode.ACK:
                        return this.m_onAck;
                    case Wacom.SmartPadCommunication.StatusCode.GENERAL_ERROR:
                        return this.m_onGeneralError;
                    case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                        throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                    default:
                        throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            var writer = context.createMessageWriterFromHeadTypeA(Wacom.SmartPadCommunication.Tag.C_ForceDisconnect, 1);

            writer.writeByte(this.m_keepCurrentConnectionState);

            return writer.getBytes();
        },
        reset: function (keepCurrentConnectionState) {
            this.m_keepCurrentConnectionState = keepCurrentConnectionState ? 1 : 0;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.GetBatteryState', {
        inherits: [Wacom.SmartPadCommunication.Command],
        m_cmdBytes: null,
        m_onBatteryState: null,
        m_batteryPercent: 0,
        m_batteryChargingState: 0,
        config: {
            init: function () {
                this.m_cmdBytes = [Wacom.SmartPadCommunication.Tag.C_GetBatteryState, 1, 0];
            }
        },
        continueWith: function (onBatteryState) {
            this.m_onBatteryState = onBatteryState;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            switch (head.m_tag) {
                case Wacom.SmartPadCommunication.Tag.R_BatteryState:
                    this.m_batteryPercent = reader.readByte();
                    this.m_batteryChargingState = reader.readByte();
                    return this.m_onBatteryState;
                case Wacom.SmartPadCommunication.Tag.R_Status:
                    var status = reader.readByte();
                    switch (status) {
                        case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                            throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                        case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                            throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                        default:
                            throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                    }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            return this.m_cmdBytes;
        },
        getBatteryPercent: function () {
            return this.m_batteryPercent;
        },
        getBatteryChargingState: function () {
            return this.m_batteryChargingState;
        },
        reset: function () {
            this.m_batteryPercent = 0;
            this.m_batteryChargingState = 0;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.GetDateTime', {
        inherits: [Wacom.SmartPadCommunication.Command],
        m_onDateTime: null,
        config: {
            init: function () {
                this.m_dateTime = new Date(-864e13);
            }
        },
        continueWith: function (onDateTime) {
            this.m_onDateTime = onDateTime;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            switch (head.m_tag) {
                case Wacom.SmartPadCommunication.Tag.R_DateTime:
                    this.m_dateTime = reader.readDateTime();
                    return this.m_onDateTime;
                case Wacom.SmartPadCommunication.Tag.R_Status:
                    var status = reader.readByte();
                    switch (status) {
                        case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                            throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                        case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                            throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                        default:
                            throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                    }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            var writer = context.createMessageWriterFromHeadTypeA(context.getTag().getC_GetDateTime(), 1);
            writer.writeByte(0);

            return writer.getBytes();
        },
        getModeValue: function () {
            return this.m_dateTime;
        },
        reset: function () {
            this.m_dateTime = new Date();
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.GetDecryptionKey', {
        inherits: [Wacom.SmartPadCommunication.Command],
        m_onSuccess: null,
        continueWith: function (onSuccess) {
            this.m_onSuccess = onSuccess;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHead().$clone();

            switch (head.m_tag) {
                case Wacom.SmartPadCommunication.Tag.R_DecryptionKey:
                    var rsaEncryptedAESKey = reader.readBytes(head.m_length);
                    // Decrypt the AES key and store it in the context
                    context.getCryptography().setDecryptionKey(rsaEncryptedAESKey);
                    return this.m_onSuccess;
                case Wacom.SmartPadCommunication.Tag.R_Status:
                    var status = reader.readByte();
                    switch (status) {
                        case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                            throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                        case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                            throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                        default:
                            throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                    }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            var derFormattedKey = context.getCryptography().generateRSAKey();

            var payloadLength = ((((1 + derFormattedKey.length) | 0))) & 65535;

            var writer = context.createMessageWriterFromHeadTypeC(Wacom.SmartPadCommunication.Tag.C_GetDecryptionKey, payloadLength);

            writer.writeByte(0); // PKCS1 padding
            writer.writeByteArray(derFormattedKey);

            return writer.getBytes();
        },
        reset: function () {
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.GetDeviceId', {
        inherits: [Wacom.SmartPadCommunication.Command],
        statics: {
            s_cmdBytes: null,
            config: {
                init: function () {
                    this.s_cmdBytes = [Wacom.SmartPadCommunication.Tag.C_GetDeviceID, 1, 0];
                }
            }
        },
        m_onDeviceID: null,
        m_deviceId: System.UInt64(0),
        continueWith: function (onDeviceId) {
            this.m_onDeviceID = onDeviceId;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            switch (head.m_tag) {
                case Wacom.SmartPadCommunication.Tag.R_DeviceID:
                    this.m_deviceId = reader.readULong();
                    return this.m_onDeviceID;
                case Wacom.SmartPadCommunication.Tag.R_Status:
                    var status = reader.readByte();
                    switch (status) {
                        case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                            throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                        case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                            throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                        default:
                            throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                    }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            return Wacom.SmartPadCommunication.GetDeviceId.s_cmdBytes;
        },
        getDeviceIdValue: function () {
            return this.m_deviceId;
        },
        reset: function () {
            this.m_deviceId = System.UInt64(0);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.GetDeviceName', {
        inherits: [Wacom.SmartPadCommunication.Command],
        statics: {
            combineTerminatedStringFromMessages: function (messages) {
                var dataSize = 0;

                for (var i = 0; i < messages.getCount(); i = (i + 1) | 0) {
                    dataSize = (dataSize + (((messages.getItem(i).length - 2) | 0))) | 0;
                }

                if (dataSize > 0) {
                    // Exclude the terminating byte
                    dataSize = (dataSize - 1) | 0;
                }

                var combinedData = System.Array.init(dataSize, 0);

                var destOffset = 0;
                var lastIndex = (messages.getCount() - 1) | 0;

                for (var i1 = 0; i1 < messages.getCount(); i1 = (i1 + 1) | 0) {
                    var messageDataLength = (((messages.getItem(i1).length - 2) | 0));

                    if (i1 === lastIndex) {
                        // Exclude the terminating byte
                        messageDataLength = (messageDataLength - 1) | 0;
                    }

                    System.Array.copy(messages.getItem(i1), 2, combinedData, destOffset, messageDataLength);

                    destOffset = (destOffset + messageDataLength) | 0;
                }

                return combinedData;
            }
        },
        m_onDeviceName: null,
        m_responses: null,
        m_deviceNameUTF8: null,
        constructor: function () {
            Wacom.SmartPadCommunication.Command.prototype.$constructor.call(this);

            this.m_responses = new System.Collections.Generic.List$1(Array)();
        },
        continueWith: function (onDeviceName) {
            this.m_onDeviceName = onDeviceName;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            switch (head.m_tag) {
                case Wacom.SmartPadCommunication.Tag.R_DeviceName:
                    this.m_responses.add(responseBytes);
                    if (!this.isLastPacket(context, head.$clone(), responseBytes)) {
                        // Expecting more packets -> we remain in the same state
                        return this;
                    }
                    this.m_deviceNameUTF8 = this.combineName(context);
                    this.m_responses.clear();
                    return this.m_onDeviceName;
                case Wacom.SmartPadCommunication.Tag.R_Status:
                    var status = reader.readByte();
                    switch (status) {
                        case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                            throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                        case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                            throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                        default:
                            throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                    }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            if (this.m_responses.getCount() > 0) {
                return null;
            }
            else  {
                var writer = context.createMessageWriterFromHeadTypeA(context.getTag().getC_GetDeviceName(), 1);
                writer.writeByte(0);

                return writer.getBytes();
            }
        },
        getDeviceNameUTF8: function () {
            return this.m_deviceNameUTF8;
        },
        reset: function () {
            this.m_responses.clear();
            this.m_deviceNameUTF8 = null;
        },
        isLastPacket: function (context, head, responseBytes) {
            if (context.getProtocolLevel() >= Wacom.SmartPadCommunication.SppLevel.L_2_1_2) {
                return head.m_length < (((context.getMaxMessageLength() - 2) | 0));
            }
            else  {
                var last = (responseBytes.length - 1) | 0;

                return (responseBytes[last] === 10);
            }
        },
        combineName: function (context) {
            if (context.getProtocolLevel() >= Wacom.SmartPadCommunication.SppLevel.L_2_1_2) {
                return Wacom.SmartPadCommunication.Utils.combineDataFromMessages(this.m_responses);
            }

            return Wacom.SmartPadCommunication.GetDeviceName.combineTerminatedStringFromMessages(this.m_responses);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.GetFileInfo', {
        inherits: [Wacom.SmartPadCommunication.Command],
        statics: {
            s_cmdBytes: null,
            config: {
                init: function () {
                    this.s_cmdBytes = [Wacom.SmartPadCommunication.Tag.C_GetFileInfo, 1, 0];
                }
            }
        },
        m_onFileInfo: null,
        m_onGeneral: null,
        config: {
            init: function () {
                this.m_fileInfo = new Wacom.SmartPadCommunication.FileInfo();
            }
        },
        continueWith: function (onFileInfo, onGeneral) {
            this.m_onFileInfo = onFileInfo;
            this.m_onGeneral = onGeneral;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            switch (head.m_tag) {
                case Wacom.SmartPadCommunication.Tag.R_FileInfo:
                    this.m_fileInfo.m_fileSize = reader.readUInt();
                    this.m_fileInfo.m_dateTime = reader.readDateTime();
                    return this.m_onFileInfo;
                case Wacom.SmartPadCommunication.Tag.R_Status:
                    var status = reader.readByte();
                    switch (status) {
                        case Wacom.SmartPadCommunication.StatusCode.GENERAL_ERROR:
                            return this.m_onGeneral;
                        case Wacom.SmartPadCommunication.StatusCode.ERROR_FILE_DOWNLOADING:
                            throw new Wacom.SmartPadCommunication.DownloadInProgressException(this.getCommandName());
                        case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                            throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                        case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                            throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                        default:
                            throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                    }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            return Wacom.SmartPadCommunication.GetFileInfo.s_cmdBytes;
        },
        getResult: function () {
            return this.m_fileInfo.$clone();
        },
        reset: function () {
            this.m_fileInfo.m_dateTime = new Date(-864e13);
            this.m_fileInfo.m_fileSize = 0;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.GetFilesCount', {
        inherits: [Wacom.SmartPadCommunication.Command],
        statics: {
            s_cmdBytes: null,
            config: {
                init: function () {
                    this.s_cmdBytes = [Wacom.SmartPadCommunication.Tag.C_GetFilesCount, 1, 0];
                }
            }
        },
        m_filesCount: 0,
        m_onFilesCount: null,
        continueWith: function (onFilesExist) {
            this.m_onFilesCount = onFilesExist;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            switch (head.m_tag) {
                case Wacom.SmartPadCommunication.Tag.R_FilesCount:
                    this.m_filesCount = reader.readUShort();
                    return this.m_onFilesCount;
                case Wacom.SmartPadCommunication.Tag.R_Status:
                    var status = reader.readByte();
                    switch (status) {
                        case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                            throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                        case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                            throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                        default:
                            throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                    }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            return Wacom.SmartPadCommunication.GetFilesCount.s_cmdBytes;
        },
        getFilesCountValue: function () {
            return this.m_filesCount;
        },
        reset: function () {
            this.m_filesCount = 0;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.GetFirmwareVersion', {
        inherits: [Wacom.SmartPadCommunication.Command],
        statics: {
            c_firmwareVersionLength: 8
        },
        m_onFirmwareVersion: null,
        m_onGeneral: null,
        continueWith: function (onFirmwareVersion, onGeneral) {
            this.m_onFirmwareVersion = onFirmwareVersion;
            this.m_onGeneral = onGeneral;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.GetParam', {
        inherits: [Wacom.SmartPadCommunication.Command],
        m_onParamValue: null,
        m_onGeneral: null,
        m_paramId: 0,
        m_paramValue: 0,
        continueWith: function (onParamValue, onGeneral) {
            this.m_onParamValue = onParamValue;
            this.m_onGeneral = onGeneral;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            switch (head.m_tag) {
                case Wacom.SmartPadCommunication.Tag.R_ParamValue:
                    reader.skipBytes(2); // Go to result bytes
                    this.m_paramValue = reader.readUInt();
                    return this.m_onParamValue;
                case Wacom.SmartPadCommunication.Tag.R_Status:
                    var status = reader.readByte();
                    switch (status) {
                        case Wacom.SmartPadCommunication.StatusCode.GENERAL_ERROR:
                            return this.m_onGeneral;
                        case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                            throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                        case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                            throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                        default:
                            throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                    }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            var writer = context.createMessageWriterFromHeadTypeA(Wacom.SmartPadCommunication.Tag.C_GetParam, 2);

            writer.writeUShort(this.m_paramId);

            return writer.getBytes();
        },
        reset: function (param) {
            this.m_paramId = Bridge.cast(param, System.UInt16);
            this.m_paramValue = 0;
        },
        getParamValue: function () {
            return this.m_paramValue;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.GetSerialNumber', {
        inherits: [Wacom.SmartPadCommunication.Command],
        statics: {
            s_cmdBytes: null,
            ESerialNumberLength: 13,
            config: {
                init: function () {
                    this.s_cmdBytes = [Wacom.SmartPadCommunication.Tag.C_GetESerialNumber, 1, 0];
                }
            }
        },
        m_onParamValue: null,
        m_serialNumberASCII: null,
        continueWith: function (onParamValue) {
            this.m_onParamValue = onParamValue;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            switch (head.m_tag) {
                case Wacom.SmartPadCommunication.Tag.R_ESN:
                    System.Array.copy(responseBytes, 2, this.m_serialNumberASCII, 0, Wacom.SmartPadCommunication.GetSerialNumber.ESerialNumberLength);
                    return this.m_onParamValue;
                case Wacom.SmartPadCommunication.Tag.R_Status:
                    var status = reader.readByte();
                    switch (status) {
                        case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                            throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                        case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                            throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                        default:
                            throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                    }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            return Wacom.SmartPadCommunication.GetSerialNumber.s_cmdBytes;
        },
        getSeriaNumberASCII: function () {
            return this.m_serialNumberASCII;
        },
        reset: function () {
            this.m_serialNumberASCII = System.Array.init(Wacom.SmartPadCommunication.GetSerialNumber.ESerialNumberLength, 0);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.GetState', {
        inherits: [Wacom.SmartPadCommunication.Command],
        statics: {
            s_cmdBytes: null,
            config: {
                init: function () {
                    this.s_cmdBytes = [Wacom.SmartPadCommunication.Tag.C_GetState, 1, 0];
                }
            }
        },
        m_onRDeviceMode: null,
        m_mode: 0,
        continueWith: function (onDeviceMode) {
            this.m_onRDeviceMode = onDeviceMode;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            switch (head.m_tag) {
                case Wacom.SmartPadCommunication.Tag.R_DeviceState:
                    this.m_mode = reader.readByte();
                    return this.m_onRDeviceMode;
                case Wacom.SmartPadCommunication.Tag.R_Status:
                    var status = reader.readByte();
                    switch (status) {
                        case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                            throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                        case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                            throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                        default:
                            throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                    }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            return Wacom.SmartPadCommunication.GetState.s_cmdBytes;
        },
        getModeValue: function () {
            return this.m_mode;
        },
        reset: function () {
            this.m_mode = 0;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.GetSupportedParams', {
        inherits: [Wacom.SmartPadCommunication.Command],
        m_onSupportedParams: null,
        m_responses: null,
        m_params: null,
        constructor: function () {
            Wacom.SmartPadCommunication.Command.prototype.$constructor.call(this);

            this.m_responses = new System.Collections.Generic.List$1(Array)();
        },
        continueWith: function (onSupportedParams) {
            this.m_onSupportedParams = onSupportedParams;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            switch (head.m_tag) {
                case Wacom.SmartPadCommunication.Tag.R_ParamsList:
                    this.m_responses.add(responseBytes);
                    if (!Wacom.SmartPadCommunication.Utils.isLastPacket(context, head.$clone())) {
                        // Expecting more packets -> we remain in the same state
                        return this;
                    }
                    var data = Wacom.SmartPadCommunication.Utils.combineDataFromMessages(this.m_responses);
                    this.m_responses.clear();
                    this.m_params = this.parseParams(data);
                    return this.m_onSupportedParams;
                case Wacom.SmartPadCommunication.Tag.R_Status:
                    var status = reader.readByte();
                    switch (status) {
                        case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                            throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                        case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                            throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                        default:
                            throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                    }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            if (this.m_responses.getCount() > 0) {
                return null;
            }
            else  {
                var writer = context.createMessageWriterFromHeadTypeA(Wacom.SmartPadCommunication.Tag.C_GetSupportedParams, 0);
                return writer.getBytes();
            }
        },
        parseParams: function (data) {
            // 6 bytes per parameter (2 bytes param id + 4 bytes param value)
            var paramsCount = (Bridge.Int.div(data.length, 6)) | 0;
            var srcIndex = 0;

            var p = System.Array.init(paramsCount, function (){
                return new Wacom.SmartPadCommunication.ParamValuePair();
            });

            for (var i = 0; i < paramsCount; i = (i + 1) | 0) {
                p[i].m_id = Wacom.SmartPadCommunication.Utils.readUShortLE(data, srcIndex);
                srcIndex = (srcIndex + 2) | 0;

                p[i].m_value = Wacom.SmartPadCommunication.Utils.readUIntLE(data, srcIndex);
                srcIndex = (srcIndex + 4) | 0;
            }

            return p;
        },
        getParams: function () {
            return this.m_params;
        },
        reset: function () {
            this.m_params = null;

            this.m_responses.clear();
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.OnException', {
        inherits: [Wacom.SmartPadCommunication.FinalState],
        m_message: null,
        constructor: function () {
            Wacom.SmartPadCommunication.FinalState.prototype.$constructor.call(this);

            this.m_message = "";
        },
        constructor$1: function (message) {
            Wacom.SmartPadCommunication.FinalState.prototype.$constructor.call(this);

            this.m_message = message;
        },
        getException: function () {
            return new System.Exception(this.m_message);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.OnResult', {
        inherits: [Wacom.SmartPadCommunication.FinalState],
        m_value: 0,
        constructor: function (value) {
            Wacom.SmartPadCommunication.FinalState.prototype.$constructor.call(this);

            this.m_value = value;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.OnSuccess', {
        inherits: [Wacom.SmartPadCommunication.FinalState]
    });

    Bridge.define('Wacom.SmartPadCommunication.ResetToDefaults', {
        inherits: [Wacom.SmartPadCommunication.Command],
        statics: {
            s_cmdBytes: null,
            config: {
                init: function () {
                    this.s_cmdBytes = [Wacom.SmartPadCommunication.Tag.C_ResetToDefaults, 1, 0];
                }
            }
        },
        m_onAck: null,
        continueWith: function (onACK) {
            this.m_onAck = onACK;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            if (head.m_tag === Wacom.SmartPadCommunication.Tag.R_Status) {
                var status = reader.readByte();

                switch (status) {
                    case Wacom.SmartPadCommunication.StatusCode.ACK:
                        return this.m_onAck;
                    case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                        throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                    case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                        throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                    default:
                        throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            return Wacom.SmartPadCommunication.ResetToDefaults.s_cmdBytes;
        },
        reset: function () {
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.SetDateTime', {
        inherits: [Wacom.SmartPadCommunication.Command],
        m_onAck: null,
        m_onGeneral: null,
        config: {
            init: function () {
                this.m_date = new Date(-864e13);
            }
        },
        continueWith: function (onACK, onGeneral) {
            this.m_onAck = onACK;
            this.m_onGeneral = onGeneral;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            if (head.m_tag === Wacom.SmartPadCommunication.Tag.R_Status) {
                var status = reader.readByte();

                switch (status) {
                    case Wacom.SmartPadCommunication.StatusCode.ACK:
                        return this.m_onAck;
                    case Wacom.SmartPadCommunication.StatusCode.GENERAL_ERROR:
                        return this.m_onGeneral;
                    case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                        throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                    case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                        throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                    default:
                        throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            var writer = context.createMessageWriterFromHeadTypeA(Wacom.SmartPadCommunication.Tag.C_SetDateTime, 6);

            writer.writeDateTime(this.m_date);

            return writer.getBytes();
        },
        reset: function (dateTime) {
            this.m_date = dateTime;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.SetDeviceName', {
        inherits: [Wacom.SmartPadCommunication.Command],
        m_onAck: null,
        m_onGeneral: null,
        m_deviceNamePackets: null,
        continueWith: function (onACK, onGeneral) {
            this.m_onAck = onACK;
            this.m_onGeneral = onGeneral;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.SetParam', {
        inherits: [Wacom.SmartPadCommunication.Command],
        m_paramId: 0,
        m_paramValue: 0,
        m_onAck: null,
        m_onGeneral: null,
        m_onReadonlyParam: null,
        continueWith: function (onACK, onGeneral, onReadonlyParam) {
            this.m_onAck = onACK;
            this.m_onGeneral = onGeneral;
            this.m_onReadonlyParam = onReadonlyParam;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            if (head.m_tag === Wacom.SmartPadCommunication.Tag.R_Status) {
                var status = reader.readByte();

                switch (status) {
                    case Wacom.SmartPadCommunication.StatusCode.ACK:
                        return this.m_onAck;
                    case Wacom.SmartPadCommunication.StatusCode.GENERAL_ERROR:
                        return this.m_onGeneral;
                    case Wacom.SmartPadCommunication.StatusCode.READONLY_PARAM:
                        return this.m_onReadonlyParam;
                    case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                        throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                    case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                        throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                    default:
                        throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            var writer = context.createMessageWriterFromHeadTypeA(Wacom.SmartPadCommunication.Tag.C_SetParam, 6);

            writer.writeUShort(this.m_paramId);
            writer.writeUInt(this.m_paramValue);

            return writer.getBytes();
        },
        reset: function (param, value) {
            this.m_paramId = Bridge.cast(param, System.UInt16);
            this.m_paramValue = value;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.SetState', {
        inherits: [Wacom.SmartPadCommunication.Command],
        m_onAck: null,
        m_onGeneral: null,
        m_stateValue: 0,
        reset: function (stateValue) {
            this.m_stateValue = stateValue;
        },
        continueWith: function (onACK, onGeneral) {
            this.m_onAck = onACK;
            this.m_onGeneral = onGeneral;
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            if (head.m_tag === Wacom.SmartPadCommunication.Tag.R_Status) {
                var status = reader.readByte();

                switch (status) {
                    case Wacom.SmartPadCommunication.StatusCode.ACK:
                        return this.m_onAck;
                    case Wacom.SmartPadCommunication.StatusCode.GENERAL_ERROR:
                        return this.m_onGeneral;
                    case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                        throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                    case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                        throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                    default:
                        throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            var writer = context.createMessageWriterFromHeadTypeA(Wacom.SmartPadCommunication.Tag.C_SetState, 1);

            writer.writeByte(this.m_stateValue);

            return writer.getBytes();
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.Authorize_1_2_2', {
        inherits: [Wacom.SmartPadCommunication.Authorize],
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            switch (head.m_tag) {
                case Wacom.SmartPadCommunication.Tag.R_UserConfirmationStatus:
                    var userConfirmationStatus = reader.readByte();
                    switch (userConfirmationStatus) {
                        case 0:
                            return this.m_onUserConfirmationSuccess;
                        case 1:
                            return this.m_onUserConfirmationTimedOut;
                    }
                    break;
                case Wacom.SmartPadCommunication.Tag.R_Status:
                    var status = reader.readByte();
                    switch (status) {
                        case Wacom.SmartPadCommunication.StatusCode.GENERAL_ERROR:
                            return this.m_onGeneral;
                        case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                            throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                        case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                            throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                        default:
                            throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                    }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.Authorize_2_1_2', {
        inherits: [Wacom.SmartPadCommunication.Authorize],
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            switch (head.m_tag) {
                case Wacom.SmartPadCommunication.Tag.R_UserConfirmationSuccess:
                    return this.m_onUserConfirmationSuccess;
                case Wacom.SmartPadCommunication.Tag.R_UserConfirmationTimedOut:
                    return this.m_onUserConfirmationTimedOut;
                case Wacom.SmartPadCommunication.Tag.R_UserConfirmationFailure:
                    // Skip the client ID
                    reader.skipBytes(6);
                    var reason = reader.readByte();
                    switch (reason) {
                        case 0:
                            // the SmartPad is not in UserConfirmation connection state and can’t process C_Authorize requests in this state
                            return this.m_onGeneral;
                        case 1:
                            // the request has been made in an incorrect data session state(C_Authorize can be called only in the Unauthorized data session state).
                            throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                        case 2:
                            // another call of C_Authorize is already in progress
                            throw new System.Exception("Another call of C_Authorize is already in progress");
                    }
                    break;
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CheckAuthorization_1_2_2', {
        inherits: [Wacom.SmartPadCommunication.CheckAuthorization],
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            if (head.m_tag === Wacom.SmartPadCommunication.Tag.R_Status) {
                var status = reader.readByte();

                switch (status) {
                    case Wacom.SmartPadCommunication.StatusCode.ACK:
                        return this.m_onDR_Recognized;
                    case Wacom.SmartPadCommunication.StatusCode.GENERAL_ERROR:
                        return this.m_onUC_NotRecognized;
                    case Wacom.SmartPadCommunication.StatusCode.UC_IN_PROGRESS:
                        return this.m_onUC_Recognized;
                    case Wacom.SmartPadCommunication.StatusCode.NOT_AUTH_FOR_DSR:
                        return this.m_onDR_NotRecognized;
                    case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                        throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                    case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                        throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                    default:
                        throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.CheckAuthorization_2_1_2', {
        inherits: [Wacom.SmartPadCommunication.CheckAuthorization],
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            switch (head.m_tag) {
                case Wacom.SmartPadCommunication.Tag.R_CheckAuthorizationSuccess:
                    // Skip the client ID
                    reader.skipBytes(6);
                    return this.m_onDR_Recognized;
                case Wacom.SmartPadCommunication.Tag.R_CheckAuthorizationFailure:
                    // Skip the client ID
                    reader.skipBytes(6);
                    var reason = reader.readByte();
                    switch (reason) {
                        case 0:
                            return this.m_onUC_Recognized;
                        case 1:
                            return this.m_onUC_NotRecognized;
                        case 2:
                            return this.m_onDR_NotRecognized;
                        case 3:
                            throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                    }
                    break;
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.GetFirmwareVersion_1_2_2', {
        inherits: [Wacom.SmartPadCommunication.GetFirmwareVersion],
        config: {
            init: function () {
                this.m_firmwareVersion = new Wacom.SmartPadCommunication.FirmwareVersion();
            }
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            switch (head.m_tag) {
                case Wacom.SmartPadCommunication.Tag.R_FirmwareVersion:
                    var firmwareType = reader.readByte();
                    var firmwareVersion = reader.readBytes(Wacom.SmartPadCommunication.GetFirmwareVersion.c_firmwareVersionLength);
                    this.m_firmwareVersion.init(firmwareType, firmwareVersion, context.getEncodeFirmwareVersionWithCharMap());
                    return this.m_onFirmwareVersion;
                case Wacom.SmartPadCommunication.Tag.R_Status:
                    var status = reader.readByte();
                    switch (status) {
                        case Wacom.SmartPadCommunication.StatusCode.GENERAL_ERROR:
                            return this.m_onGeneral;
                        case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                            throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                        case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                            throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                        default:
                            throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                    }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            var writer = context.createMessageWriterFromHeadTypeA(Wacom.SmartPadCommunication.Tag.C_GetFirmwareVersion, 1);

            writer.writeByte(this.m_firmwareVersion.m_firmwareType);

            return writer.getBytes();
        },
        getFirmwareVersionValue: function () {
            return this.m_firmwareVersion.$clone();
        },
        reset: function (firmwareType) {
            this.m_firmwareVersion.m_firmwareType = firmwareType;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.GetFirmwareVersion_2_1_3', {
        inherits: [Wacom.SmartPadCommunication.GetFirmwareVersion],
        m_responses: null,
        m_firmwareVersions: null,
        constructor: function () {
            Wacom.SmartPadCommunication.GetFirmwareVersion.prototype.$constructor.call(this);

            this.m_responses = new System.Collections.Generic.List$1(Array)();
        },
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            switch (head.m_tag) {
                case Wacom.SmartPadCommunication.Tag.R_FirmwareVersion:
                    this.m_responses.add(responseBytes);
                    if (!Wacom.SmartPadCommunication.Utils.isLastPacket(context, head.$clone())) {
                        // Expecting more packets -> we remain in the same state
                        return this;
                    }
                    var data = Wacom.SmartPadCommunication.Utils.combineDataFromMessages(this.m_responses);
                    this.m_responses.clear();
                    this.m_firmwareVersions = this.parseFirmwareVersions(context, data);
                    return this.m_onFirmwareVersion;
                case Wacom.SmartPadCommunication.Tag.R_Status:
                    var status = reader.readByte();
                    switch (status) {
                        case Wacom.SmartPadCommunication.StatusCode.GENERAL_ERROR:
                            return this.m_onGeneral;
                        case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                            throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                        case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                            throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                        default:
                            throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                    }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            if (this.m_responses.getCount() > 0) {
                return null;
            }
            else  {
                return context.createMessageWriterFromHeadTypeA(Wacom.SmartPadCommunication.Tag.C_GetFirmwareVersion, 0).getBytes();
            }
        },
        getFirmwareVersions: function () {
            return this.m_firmwareVersions;
        },
        reset: function () {
            this.m_firmwareVersions = null;

            this.m_responses.clear();
        },
        parseFirmwareVersions: function (context, data) {
            // 9 bytes per firmware (1 byte type + 8 bytes FW version)
            var firmwaresCount = (Bridge.Int.div(data.length, 9)) | 0;

            var fwv = System.Array.init(firmwaresCount, function (){
                return new Wacom.SmartPadCommunication.FirmwareVersion();
            });
            var reader = context.createMessageReader(data);

            for (var i = 0; i < firmwaresCount; i = (i + 1) | 0) {
                var firmwareType = reader.readByte();
                var firmwareVersion = reader.readBytes(Wacom.SmartPadCommunication.GetFirmwareVersion.c_firmwareVersionLength);

                fwv[i].init(firmwareType, firmwareVersion, context.getEncodeFirmwareVersionWithCharMap());
            }

            return fwv;
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.OnParamNotSupported', {
        inherits: [Wacom.SmartPadCommunication.OnException],
        m_paramId: 0,
        constructor: function () {
            Wacom.SmartPadCommunication.OnException.prototype.$constructor.call(this);

        },
        reset: function (paramId) {
            this.m_paramId = paramId;
        },
        getException: function () {
            return new Wacom.SmartPadCommunication.ParameterNotSupportedException(this.m_paramId);
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.SetDeviceName_1_2_2', {
        inherits: [Wacom.SmartPadCommunication.SetDeviceName],
        statics: {
            splitStringToMessages_1_2_2: function (headTag, deviceNameUTF8, maxMessageLength) {
                var srcBytes = Wacom.SmartPadCommunication.SetDeviceName_1_2_2.appendStringTerminator(deviceNameUTF8);

                var messages = new System.Collections.Generic.List$1(Array)();

                var headTypeALength = 2;
                var maxDataLengthForChunk = (maxMessageLength - headTypeALength) | 0;
                var remainingBytes = srcBytes.length;
                var srcStartIndex = 0;

                while (remainingBytes > 0) {
                    var msgDataLength = Math.min(maxDataLengthForChunk, remainingBytes);

                    var msg = System.Array.init(((headTypeALength + msgDataLength) | 0), 0);
                    msg[0] = headTag;
                    msg[1] = msgDataLength & 255;

                    System.Array.copy(srcBytes, srcStartIndex, msg, headTypeALength, msgDataLength);

                    remainingBytes = (remainingBytes - msgDataLength) | 0;
                    srcStartIndex = (srcStartIndex + msgDataLength) | 0;

                    messages.add(msg);
                }

                return messages;
            },
            appendStringTerminator: function (srcStringBytes) {
                var length = srcStringBytes.length;

                var terminatedStringBytes = System.Array.init(((length + 1) | 0), 0);

                System.Array.copy(srcStringBytes, 0, terminatedStringBytes, 0, length);

                // Write the terminating byte
                terminatedStringBytes[length] = 10;

                return terminatedStringBytes;
            }
        },
        m_messageIndex: 0,
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            if (head.m_tag === Wacom.SmartPadCommunication.Tag.R_Status) {
                var status = reader.readByte();

                switch (status) {
                    case Wacom.SmartPadCommunication.StatusCode.ACK:
                        if (this.m_messageIndex !== this.m_deviceNamePackets.getCount()) {
                            return this;
                        }
                        else  {
                            return this.m_onAck;
                        }
                    case Wacom.SmartPadCommunication.StatusCode.GENERAL_ERROR:
                        return this.m_onGeneral;
                    case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                        throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                    case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                        throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                    default:
                        throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            return this.m_deviceNamePackets.getItem(Bridge.identity(this.m_messageIndex, (this.m_messageIndex = (this.m_messageIndex + 1) | 0)));
        },
        reset: function (context, deviceNameUTF8) {
            this.m_deviceNamePackets = null;
            this.m_messageIndex = 0;

            if (deviceNameUTF8 == null) {
                throw new System.ArgumentNullException("deviceNameUTF8");
            }

            var deviceNameLength = deviceNameUTF8.length;

            if (deviceNameLength < 1) {
                throw new System.ArgumentException("Device name is empty.");
            }

            // Max allowed device name length is 26 bytes (Columbia).
            if (deviceNameLength > 26) {
                throw new System.ArgumentException("Device name is too long.");
            }

            this.m_deviceNamePackets = Wacom.SmartPadCommunication.SetDeviceName_1_2_2.splitStringToMessages_1_2_2(Wacom.SmartPadCommunication.Tag.C_SetDeviceName, deviceNameUTF8, context.getMaxMessageLength());
        }
    });

    Bridge.define('Wacom.SmartPadCommunication.SetDeviceName_2_1_2', {
        inherits: [Wacom.SmartPadCommunication.SetDeviceName],
        getNextState: function (context, responseBytes) {
            var reader = context.createMessageReader(responseBytes);

            var head = reader.readHeadTypeA().$clone();

            if (head.m_tag === Wacom.SmartPadCommunication.Tag.R_Status) {
                var status = reader.readByte();

                switch (status) {
                    case Wacom.SmartPadCommunication.StatusCode.ACK:
                        return this.m_onAck;
                    case Wacom.SmartPadCommunication.StatusCode.GENERAL_ERROR:
                        return this.m_onGeneral;
                    case Wacom.SmartPadCommunication.StatusCode.INVALID_STATE:
                        throw new Wacom.SmartPadCommunication.InvalidStateException(this.getCommandName());
                    case Wacom.SmartPadCommunication.StatusCode.UNRECOGNIZED_COMMAND:
                        throw new Wacom.SmartPadCommunication.CommandNotSupportedException(this.getCommandName());
                    default:
                        throw new Wacom.SmartPadCommunication.UnexpectedStatusException(status, this.getCommandName());
                }
            }

            throw new Wacom.SmartPadCommunication.UnexpectedResponseException(responseBytes, this.getCommandName());
        },
        getCommandPacketsCount: function () {
            return this.m_deviceNamePackets.getCount();
        },
        getCommandBytes: function (context, cmdPacketIndex) {
            return this.m_deviceNamePackets.getItem(cmdPacketIndex);
        },
        reset: function (context, deviceNameUTF8) {
            this.m_deviceNamePackets = null;

            if (deviceNameUTF8 == null) {
                throw new System.ArgumentNullException("deviceNameUTF8");
            }

            var deviceNameLength = deviceNameUTF8.length;

            if (deviceNameLength < 1) {
                throw new System.ArgumentException("Device name is empty.");
            }

            this.m_deviceNamePackets = Wacom.SmartPadCommunication.Utils.splitDataToMessages(Wacom.SmartPadCommunication.Tag.C_SetDeviceName, deviceNameUTF8, 0, deviceNameLength, context.getMaxMessageLength());
        }
    });

    Bridge.init();

    module.exports = bridge.global.Wacom.SmartPadCommunication;
})(global);
