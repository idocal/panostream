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
     collections: ['cars', 'restaurants', 'users'],
     uri: 'mongodb://user:123456@localhost:27017/streamableDb'
 }
 */

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
            skip: 0,
            batch: '',
            cursor: null
        };
    }

    _read(size) {
        this._state.size = size;

        // If connection is established, read batch data from MongoDB
        if (this._state.db) {
            this._readFromMongo();
        } else {
            // Otherwise connect first and then read the batch data
            this._connect().then(() => {
                this._readFromMongo();
            });
        }
    }

    _connect() {
        return new _bluebird2.default((resolve, reject) => {
            try {
                _mongodb2.default.MongoClient.connect(this._config.uri).then(db => {
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
        const stream = this;
        try {
            if (!stream._state.cursor) {
                stream._state.cursor = stream._state.currCollection.find({ id: { $lte: 3 } });

                stream._state.cursor.on('data', chunk => {
                    if (!stream.push(Buffer.from(JSON.stringify(chunk)))) {
                        stream._state.cursor.pause();
                    }
                });

                stream._state.cursor.on('end', () => {
                    console.log('ended collection: ', stream._state.currCollection.s.name);
                    stream._state.cursor = null;
                    if (stream._nextCollection() === null) {
                        stream.push(null);
                        stream._resetState();
                    } else {
                        stream._readFromMongo();
                    }
                    console.log('read documents: ', stream._state.clread);
                });
            } else {
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
        this._state.currCollection = this._state.db.collection(this._config.collections[this._state.currCollectionIndex]);
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

// const options = {
//     address: 'localhost',
//     port: 27017,
//     username: 'user',
//     password: '123456',
//     database: 'streamableDb',
//     collections: ['cars', 'restaurants', 'users'],
//     batchSize: 5
// };
//
// const stream = new PanoStream(options);
//
// stream.on('data', function(chunk) {
//     console.log('REAL STREAM: \n', chunk.toString(), '\n\n');
// });
//
// stream.on('end', function() {
//     console.log('REAL STREAM ENDED!');
// });

exports.default = PanoStream;
module.exports = exports['default'];