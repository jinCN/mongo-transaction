# koa-mongo-transaction
koa middleware to provide declarative transaction for mongodb.
## Example
For koa:
```javascript
var Koa = require('koa');
var koaMongoTransaction = require('koa-mongo-transaction');
 
var app = new Koa();
app.use(koaMongoTransaction());
 
app.use(async ctx => {
  await dbOp();
});
```
### options

### `patchMongo`
Whether monkey patch the `mongodb` package so that you don't have to specify session option for every command. 
Defaults to `true`.

### `mongoClient`
MongoClient instance to use. If not set, an attempt to require('mongoose') to retrieve MongoClient instance will be 
made.
