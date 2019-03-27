const cls = require('cls-hooked')
const namespace = cls.createNamespace('mongo-transaction')
module.exports = manager

function manager (options = {}) {
  options = {
    patchMongo: true,
    ...options
  }
  if (!options.mongoClient) {
    try {
      let mongoose = require('mongoose')
      options.mongoClient = mongoose.connection.client
      if (!options.mongoClient) {
        throw new Error()
      }
    } catch (e) {
      throw new Error('must provide mongoClient option or have your mongoose connected')
    }
  }
  if (options.patchMongo) {
    patchMongo()
  }
  return handlerForKoa.bind(null, options)
}

Object.defineProperties(manager, {
  mongoClient: {
    get () {
      return namespace.get('mongoClient')
    },
    set (v) {
      namespace.set('mongoClient', v)
    }
  },
  open: {
    get () {
      return namespace.get('open')
    },
    set (v) {
      return namespace.set('open', v)
    }
  },
  session: {
    get () {
      if (!manager.open) return undefined
      let session = namespace.get('session')
      if (!session) {
        session = namespace.get('mongoClient').startSession()
        session.startTransaction()
        namespace.set('session', session)
      }
      return session
    }
  }
})

async function handlerForKoa (options, ctx, next) {
  await namespace.runPromise(async function () {
    manager.mongoClient = options.mongoClient
    manager.open = true
    try {
      await next()
    } catch (err) {
      await abortTransaction()
      manager.open = false
      throw err
    }
    await commitTransaction()
    manager.open = false
  }())
}

async function abortTransaction () {
  let session = namespace.get('session')
  if (session && session.inTransaction()) {
    await session.abortTransaction()
    session.endSession()
  }
}

async function commitTransaction () {
  let session = namespace.get('session')
  if (session && session.inTransaction()) {
    await session.commitTransaction()
    session.endSession()
  }
}

function patchMongo () {
  const utils = require('mongodb/lib/utils')
  let old = utils.executeOperation

  utils.executeOperation = (topology, operation, args, options) => {
    if (manager.open) {
      args[args.length - 2] = args[args.length - 2] || {}
      let opOptions = args[args.length - 2]
      if (opOptions.session == null) {
        opOptions.session = manager.session
      }
    }
    return old(topology, operation, args, options)
  }
  utils.executeOperation.old = old
}
