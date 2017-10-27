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

describe('Configuration validity', function () {

});
