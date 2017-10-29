# PanoStream

A npm module that queries MongoDB and returns a stream.
This module implements Node.js [Readable Stream](https://nodejs.org/api/stream.html) and queries specified collections from MongoDB.
The data is streamed with a specified fixed-size batch and stops reading from Mongo when all collection's data is read.

## Installation

```
git clone https://github.com/idocal/panostream.git
npm install
```

## Usage

Create a new PanoStream object:
```
const options = {
    address: 'localhost',
    port: 27017,
    username: 'user',
    password: '123456',
    database: 'streamableDb',
    collections: ['cars', 'restaurants', 'users']
};

const MyStream = new PanoStream(options);
```

When streaming data, the `ondata` event emits and data is streamed as [Buffer](https://nodejs.org/api/buffer.html):
```
stream.on('data', (chunk) => {
    console.log(chunk.toString());
});
```

When stream ends, the `onend` event emits:
```
stream.on('end', () => {
    console.log('Ended stream.');
});
```

## Acknowledgements

The module is based on [node-module-boilerplate](https://www.npmjs.com/package/node-module-boilerplate)'s boilerplate.