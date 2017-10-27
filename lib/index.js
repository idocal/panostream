'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _mongodb = require('mongodb');

var _mongodb2 = _interopRequireDefault(_mongodb);

var _stream = require('stream');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Promisify MongoDB requests using Bluebird
_bluebird2.default.promisifyAll(_mongodb2.default.MongoClient);
_bluebird2.default.promisifyAll(_mongodb2.default.Collection.prototype);

/** The config should be determined by user via options
    Example:
    {
        address: 'localhost',
        port: 27017,
        username: 'user',
        password: '123456',
        database: 'streamableDb',
        batchSize: 5,
        collections: ['Cars', 'Restaurants', 'Users'],
        uri: 'mongodb://user:123456@localhost:27017/streamableDb'
    }
 */

let config = {};

// Describes the current stream variables
const state = {
    db: null,
    currCollection: null,
    currCollectionIndex: 0,
    batch: []
};

// Connect to MongoDB using Bluebird promise
const connect = () => {
    return new _bluebird2.default((resolve, reject) => {
        try {
            _mongodb2.default.MongoClient.connect(config.uri).then(db => {
                state.db = db;
                state.currCollection = state.db.collection(config.collections[state.currCollectionIndex]);
                resolve();
            });
        } catch (error) {
            reject(error);
        }
    });
};

// Read (find) with limited batch size defined in config
const readFromMongo = () => {
    return new _bluebird2.default((resolve, reject) => {
        try {
            if (!state.batch.length && state.currCollection) {
                state.currCollection.find({}, { limit: config.batchSize }).then(results => {
                    state.batch = results;
                    resolve();
                });
            } else {
                resolve();
            }
        } catch (error) {
            reject(error);
        }
    });
};

const nextCollection = () => {
    if (state.currCollectionIndex + 1 === config.collections.length) {
        return null;
    }
    state.currCollectionIndex += 1;
    state.currCollection = state.db.collection(config.collections[state.currCollectionIndex]);
    return state.currCollection;
};

const streamData = () => {
    if (state.batch.length) {
        undefined.push(state.batch);
    } else if (nextCollection() == null) {
        undefined.push(null);
        state.db.close();
        state.db = null;
        state.currCollection = null;
        state.currCollectionIndex = 0;
    }
};

// This is the object that would be exported
const stream = options => {
    config = options;
    config.uri = 'mongodb://' + options.username + ':' + options.password + '@' + options.address + ':' + options.port + '/' + options.database;
    if (!config.batchSize) config.batchSize = 5;

    // Implementing stream based on NodeJS Readable Stream
    return new _stream.Readable({
        objectMode: true,
        read: () => {
            state.batch = [];

            // If connection is established, read batch data from MongoDB
            if (state.db) {
                readFromMongo().then(() => {
                    console.log('NEW DATA: ', state.batch);
                    streamData();
                });
            } else {
                // Otherwise connect first and then read the batch data
                connect().then(() => {
                    readFromMongo().then(() => {
                        console.log('NEW DATA: ', state.batch);
                        streamData();
                    });
                });
            }
        }
    });
};

console.log(stream);

class PanoStream extends _stream.Readable {
    constructor(options) {
        super(options);
        this._config = options;
        this._config.uri = 'mongodb://' + options.username + ':' + options.password + '@' + options.address + ':' + options.port + '/' + options.database;
        if (!this._config.batchSize) this._config.batchSize = 5;

        this._state = {
            db: null,
            currCollection: null,
            currCollectionIndex: 0,
            batch: []
        };
    }
    read(size) {
        this._config.size = size;
        this._state.batch = [];

        // If connection is established, read batch data from MongoDB
        if (this._state.db) {
            this._readFromMongo().then(() => {
                console.log('NEW DATA: ', this._state.batch);
                this._streamData();
            });
        } else {
            // Otherwise connect first and then read the batch data
            this._connect().then(() => {
                this._readFromMongo().then(() => {
                    console.log('NEW DATA: ', this._state.batch);
                    this._streamData();
                });
            });
        }
    }
    _connect() {
        return new _bluebird2.default((resolve, reject) => {
            try {
                _mongodb2.default.MongoClient.connect(config.uri).then(db => {
                    this._state.db = db;
                    this._state.currCollection = this._state.db.collection(this._config.collections[this._state.currCollectionIndex]);
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    }
    _readFromMongo() {
        return new _bluebird2.default((resolve, reject) => {
            try {
                if (!this._state.batch.length && this._state.currCollection) {
                    this._state.currCollection.find({}, { limit: config.batchSize }).then(results => {
                        this._state.batch = results;
                        resolve();
                    });
                } else {
                    resolve();
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    _nextCollection() {
        if (this._state.currCollectionIndex + 1 === this._config.collections.length) {
            return null;
        }
        this._state.currCollectionIndex += 1;
        this._state.currCollection = this._state.db.collection(this._config.collections[this._state.currCollectionIndex]);
        return this._state.currCollection;
    }
    _streamData() {
        if (this._state.batch.length) {
            this.push(this._state.batch);
        } else if (this._nextCollection() == null) {
            this.push(null);
            this._state.db.close();
            this._state.db = null;
            this._state.currCollection = null;
            this._state.currCollectionIndex = 0;
        }
    }
}

exports.default = PanoStream;
module.exports = exports['default'];