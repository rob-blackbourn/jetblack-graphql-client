import GraphQLError from './GraphQLError'

const GQL = {
  CONNECTION_INIT: 'connection_init',
  CONNECTION_ACK: 'connection_ack',
  CONNECTION_ERROR: 'connection_error',
  CONNECTION_KEEP_ALIVE: 'ka',
  START: 'start',
  STOP: 'stop',
  CONNECTION_TERMINATE: 'connection_terminate',
  DATA: 'data',
  ERROR: 'error',
  COMPLETE: 'complete'
}

export default class Subscriber {
  constructor (url, options, callback) {
    this.options = options
    this.callback = callback

    this.nextId = 1
    this.subscriptions = new Map()
    this.webSocket = new WebSocket(url, 'graphql-ws') // graphql-subscriptions

    this.webSocket.onopen = event => {
      // Initiate the connection
      const message = {
        type: GQL.CONNECTION_INIT,
        payload: this.options
      }

      this.webSocket.send(JSON.stringify(message))
    }

    this.webSocket.onclose = event => {
      this.notifyAndClear(new GraphQLError(event), undefined)
    }

    this.webSocket.onerror = event => {
      this.notifyAndClear(new GraphQLError(event), undefined)
    }

    this.webSocket.onmessage = this.onMessage.bind(this)
  }

  subscribe (query, variables, operationName, callback) {
    const id = (this.nextId++).toString()

    const message = {
      type: GQL.START,
      id,
      payload: { query, variables, operationName }
    }

    this.subscriptions.set(id, callback)

    this.webSocket.send(JSON.stringify(message))

    // Return the unsubscriber.
    return () => {
      this.subscriptions.delete(id)

      const message = {
        type: GQL.STOP,
        id
      }

      this.webSocket.send(JSON.stringify(message))
    }
  }

  shutdown () {
    const message = {
      type: GQL.CONNECTION_TERMINATE
    }
    this.webSocket.send(JSON.stringify(message))
    this.webSocket.close()
  }

  onKeepAlive () {
    // Stub for inheriting classes to override.
  }

  onMessage (event) {
    const data = JSON.parse(event.data)

    switch (data.type) {
      case GQL.CONNECTION_ACK: {
        // This is the successful response to GQL.CONNECTION_INIT
        if (this.callback) {
          this.callback(undefined, this.subscribe.bind(this))
        }
        break
      }
      case GQL.CONNECTION_ERROR: {
        // This may occur:
        // 1. In response to GQL.CONNECTION_INIT
        // 2. In case of parsing errors in the client which will not disconnect.
        if (this.callback) {
          this.callback(new GraphQLError(data.payload), this)
        }
        break
      }
      case GQL.CONNECTION_KEEP_ALIVE: {
        // THis will occur:
        // 1. After GQL.CONNECTION_ACK
        // 2. Periodically to keep the connection alive.
        this.onKeepAlive()
        break
      }
      case GQL.DATA: {
        // This message is sent after GQL.START to transfer the result of the GraphQL subscription.
        const callback = this.subscriptions.get(data.id)
        if (callback) {
          const error = data.payload.errors ? new GraphQLError(data.payload.errors) : undefined
          callback(error, data.payload.data)
        }
        break
      }
      case GQL.COMPLETE: {
        // This is sent when the operation is done and no more dta will be sent.
        const callback = this.subscriptions.get(data.id)
        if (callback) {
          this.subscriptions.delete(data.id)
          callback(new GraphQLError('complete'), undefined)
        }
        break
      }
    }
  }

  notifyAndClear (error, response) {
    const callbacks = this.subscriptions.values()
    this.subscriptions.clear()
    for (const callback of callbacks) {
      callback(error, response)
    }
  }
}
