import Promise from 'bluebird';
import MongoDB from 'mongodb';
import { Readable } from 'stream';

// Promisify MongoDB requests using Bluebird
Promise.promisifyAll(MongoDB.MongoClient);
Promise.promisifyAll(MongoDB.Collection.prototype);

/**
 * The config should be determined by user via options
 * Example:
 {
     address: 'localhost',
     port: 27017,
     username: 'user',
     password: '123456',
     database: 'streamableDb',
     batchSize: 5,
     collections: ['cars', 'restaurants', 'users'],
     uri: 'mongodb://user:123456@localhost:27017/streamableDb' <-- this is not an input option
 }
 */

class PanoStream extends Readable {
    constructor(options) {
        super(options);
        this._config = options;
        this._config.uri = 'mongodb://' + options.username + ':' + options.password +
            '@' + options.address + ':' + options.port + '/' + options.database;
        if (!this._config.batchSize) this._config.batchSize = 27; // Arbitrary constant

        this._state = {
            db: null,
            currCollection: null,
            currCollectionIndex: 0,
            cursor: null,
        };
    }

    _read(size) {
        this._config.size = size;

        // If connection is established, read batch data from MongoDB
        if (this._state.db) {
            this._readFromMongo();
        } else {
            // Otherwise connect first and then read the batch data
            this._connect().then(() => { this._readFromMongo(); });
        }
    }

    _connect() {
        return new Promise((resolve, reject) => {
            try {
                MongoDB.MongoClient.connect(this._config.uri)
                    .then((db) => {
                        this._state.db = db;
                        this._state.currCollection =
                            this._state.db.collection(this._config.collections[
                                this._state.currCollectionIndex]);
                        resolve();
                    });
            } catch (error) {
                reject(error);
            }
        });
    }

    _readFromMongo() {
        // Save pointer to stream object
        const stream = this;
        try {
            // Query state's cursor if exists
            if (!stream._state.cursor) {
                // If cursor does not exist, create one using Collection.find()
                stream._state.cursor = stream._state.currCollection.find({});
                let batch = [];

                /**
                 * Cursor is a Readable stream, when data is being streamed,
                 * stream it using stream.push()
                 * We will handle the batched data "event-by-event"
                 */
                stream._state.cursor.on('data', (chunk) => {
                    // Add received data to batch
                    batch.push(JSON.stringify(chunk));

                    /**
                     * Note: batchSize is constant and declared in stream._config
                     * When batch size exceeds the declaration,
                     * push it as stream data using stream.push()
                     */
                    if (batch.length === stream._config.batchSize) {
                        if (!stream.push(Buffer.from(JSON.stringify(batch)))) {
                            // If stream push failed, pause the cursor
                            stream._state.cursor.pause();
                        }
                        // Reset the batch for next iteration (data may be lost)
                        batch = [];
                    }
                });

                stream._state.cursor.on('end', () => {
                    // Stream remainders of the batch
                    if (batch.length > 0) {
                        stream.push(Buffer.from(JSON.stringify(batch)));
                    }

                    // Reset cursor to start new collection
                    stream._state.cursor = null;

                    // _nextCollection() returns null when no more collections remain
                    if (stream._nextCollection() === null) {
                        stream.push(null); // emits 'onend' event
                        stream._resetState();
                    } else {
                        // There still remains a collection to query
                        stream._readFromMongo();
                    }
                });
            } else {
                // Cursor exists, resume if paused
                stream._state.cursor.resume();
            }
        } catch (error) {
            console.log(error);
        }
    }

    _nextCollection() {
        if (this._state.currCollectionIndex + 1 === this._config.collections.length) {
            return null;
        }
        this._state.currCollectionIndex += 1;
        this._state.currCollection =
            this._state.db.collection(this._config.collections[this._state.currCollectionIndex]);
        return this._state.currCollection;
    }

    _resetState() {
        this._state.db.close();
        this._state.db = null;
        this._state.currCollection = null;
        this._state.currCollectionIndex = 0;
        this._state.cursor = null;
    }
}

export default PanoStream;
