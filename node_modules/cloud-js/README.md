Convert .proto to .json
---

```bash
./node_modules/protobufjs/bin/pbjs -t json protobuf/diffsync_format.proto -o protobuf/diffsync_format.json
./node_modules/protobufjs/bin/pbjs -t json protobuf/command_format.proto -o protobuf/command_format.json
```

Synchronization example
---

```ecmascript 6
const { CloudStorage, reservedPayloads } = require('./src/cloud-storage');
const { Node, Payload } = require('./src/node');

const levelup = require('levelup');
const leveldown = require('leveldown');

const db = levelup(leveldown('./db'), async function() {

    const cloudStorage = new CloudStorage(db, "wss://stage-api-inkspace.wacom.com/sync");
    await cloudStorage.setAccessToken("__ACCESS_TOKEN__");
    cloudStorage.setDebugMode(true);

    cloudStorage.sync()

    cloudStorage.on('CloudSyncFinished', function() {
        console.log("CloudSyncFinished");
        process.exit();
    })
})
```