import { expect } from 'chai';
import PanoStream from '../src';

const objCommon = require('../src');

/* eslint prefer-arrow-callback: 0, func-names: 0, no-unused-expressions: 0 */

describe('Importing the module', function () {
    it('should be imported with CommonJS', function () {
        expect(objCommon).to.be.a('function');
    });
    it('should read foo property of the exported object.', function () {
        expect(PanoStream).to.be.a('function');
    });
});

const options = {
    address: 'localhost',
    port: 27017,
    username: 'user',
    password: '123456',
    database: 'streamableDb',
    collections: ['cars', 'restaurants', 'users']
};

const stream = new PanoStream(options);

describe('Configuration validity', function () {
    it('should receive user\'s configuration', function () {
        expect(stream._config.uri).to.equal('mongodb://user:123456@localhost:27017/streamableDb');
    });

    const initialState = {
        db: null,
        currCollection: null,
        currCollectionIndex: 0,
        cursor: null,
    };

    it('should initialize state correctly', function () {
       expect(stream._state).to.deep.equal(initialState);
    });
});

describe('Batch data', function () {
    it('should read data as Buffer', function () {
        stream.on('data', function (chunk) {
           expect(chunk).to.be.instanceof(Buffer);
        });
    });
});
