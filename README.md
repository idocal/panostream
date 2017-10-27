# PanoStream

A npm module that queries MongoDB and returns a stream.
This module implements Node.js [Readable Stream](https://nodejs.org/api/stream.html) and queries specified collections from MongoDB.
The data is streamed with a specified fixed-size batch and stops reading from Mongo when all collection's data is read.

## Installation

'''
git clone https://github.com/idocal/panostream.git
npm install
'''

## Usage



## Acknowledgements

Inspired from [stream-to-mongo-db](https://github.com/AbdullahAli/node-stream-to-mongo-db)

The module is based on [node-module-boilerplate](https://www.npmjs.com/package/node-module-boilerplate)'s boilerplate.