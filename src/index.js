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
        collections: ['Cars', 'Restaurants', 'Users'],
        uri: 'mongodb://user:123456@localhost:27017/streamableDb'
    }
 */

let config = {
    address: 'localhost',
    port: 27017,
    username: 'user',
    password: '123456',
    database: 'streamableDb',
    batchSize: 5,
    collections: ['Cars', 'Restaurants', 'Users'],
    uri: 'mongodb://user:123456@localhost:27017/streamableDb'
};

// Describes the current stream variables
const state = {
    db: null,
    currCollection: null,
    currCollectionIndex: 0,
    batch: []
};

// Connect to MongoDB using Bluebird promise
const connect = () => {
    return new Promise((resolve, reject) => {
        console.log('connecting...');
        try {
            MongoDB.MongoClient.connect(config.uri)
                .then((db) => {
                    console.log('connected');
                    state.db = db;
                    state.currCollection =
                        state.db.collection(config.collections[state.currCollectionIndex]);
                    resolve();
                });
        } catch (error) {
            reject(error);
        }
    });
};

// Read (find) with limited batch size defined in config
const readFromMongo = () => {
    return new Promise((resolve, reject) => {
        try {
            if (!state.batch.length && state.currCollection) {
                state.currCollection.find({}, { limit: config.batchSize })
                    .then((results) => {
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
    state.currCollection = config.collections[state.currCollectionIndex];
    return state.currCollection;
};

const streamData = () => {
    if (state.batch.length) {
        this.push(state.batch);
    } else if (nextCollection() == null) {
        this.push(null);
        state.db.close();
        state.db = null;
        state.currCollection = null;
        state.currCollectionIndex = 0;
    }
};

// This is the object that would be exported
const PanoStream = (options) => {
    config = options;
    config.uri = 'mongodb://' + options.username + ':' + options.password + '@' + options.address + ':' + options.port + '/' + options.database;

    console.log('started object');
    // Implementing stream based on NodeJS Readable Stream
    return new Readable({
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

export default PanoStream;
