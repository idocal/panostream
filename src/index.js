import Promise from 'bluebird';
import MongoDB from 'mongodb';
import { Readable } from 'stream';

// Promisify MongoDB requests using Bluebird
Promise.promisifyAll(MongoDB.MongoClient);
Promise.promisifyAll(MongoDB.Collection.prototype);

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

class PanoStream extends Readable {
    constructor(options) {
        super(options);
        this._config = options;
        this._config.uri = 'mongodb://' + options.username + ':' + options.password +
            '@' + options.address + ':' + options.port + '/' + options.database;
        if (!this._config.batchSize) this._config.batchSize = 5;

        this._state = {
            db: null,
            currCollection: null,
            currCollectionIndex: 0,
            skip: 0,
            batch: ''
        };

        this.objectMode = true;
    }
    read(size) {
        console.log('strarting to read...');
        this._config.size = size;
        this._state.batch = '';

        // If connection is established, read batch data from MongoDB
        if (this._state.db) {
            this._readFromMongo().then(() => {
                console.log('reading data after connection');
                this._streamData(this._state.batch);
            });
        } else {
            // Otherwise connect first and then read the batch data
            this._connect().then(() => {
                this._readFromMongo().then(() => {
                    console.log(this._state.batch);
                    this._streamData(this._state.batch);
                });
            });
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
        console.log('Reading from Mongo...');
        return new Promise((resolve, reject) => {
            try {
                if (!this._state.batch.length) {
                    this._state.currCollection.find({}, (err, cursor) => {
                        cursor.limit(this._config.batchSize).skip(this._state.skip)
                            .toArray((err, results) => {
                                if (err) reject(err);
                                else {
                                    console.log('reading...');
                                    // Chunks must be strings
                                    this._state.batch = JSON.stringify(results);
                                    this._state.skip += this._config.batchSize;
                                    resolve();
                                }
                        });
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
        this._state.currCollection =
            this._state.db.collection(this._config.collections[this._state.currCollectionIndex]);
        return this._state.currCollection;
    }
    _streamData(chunk) {
        console.log('streaming now: ', chunk);
        if (chunk) {
            this.push(chunk);
        } else if (this._nextCollection() == null) {
            this.push(null);
            this._state.db.close();
            this._state.db = null;
            this._state.currCollection = null;
            this._state.currCollectionIndex = 0;
        }
    }
}

// const options = {
//     address: 'localhost',
//     port: 27017,
//     username: 'user',
//     password: '123456',
//     database: 'streamableDb',
//     batchSize: 10,
//     collections: ['cars', 'restaurants', 'users']
// };
//
// const stream = new PanoStream(options);
//
// setTimeout(function() {
//     stream.read();
// }, 1000);

export default PanoStream;
