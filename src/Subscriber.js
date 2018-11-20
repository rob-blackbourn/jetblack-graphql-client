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
    this.callback = callback

    this.nextId = 1
    this.subscriptions = new Map()
    this.webSocket = new WebSocket(url, 'graphql-ws')

    this.webSocket.onopen = event => {
      // Initiate the connection
      this.webSocket.send(JSON.stringify({
        type: GQL.CONNECTION_INIT,
        payload: options
      }))
    }

    this.webSocket.onclose = event => {
      const error = new GraphQLError(event)
      // Notify the subscriber.
      this.callback(error)
      // Notify the subscriptions.
      const callbacks = Array.from(this.subscriptions.values())
      this.subscriptions.clear()
      for (const callback of callbacks) {
        callback(error, undefined)
      }
    }

    this.webSocket.onmessage = this.onMessage.bind(this)
  }

  subscribe (query, variables, operationName, callback) {
    const id = (this.nextId++).toString()
    this.subscriptions.set(id, callback)

    // Start the subscription.
    this.webSocket.send(JSON.stringify({
      type: GQL.START,
      id,
      payload: { query, variables, operationName }
    }))

    // Return the unsubscriber.
    return () => {
      this.subscriptions.delete(id)

      // Stop the subscription.
      this.webSocket.send(JSON.stringify({
        type: GQL.STOP,
        id
      }))
    }
  }

  shutdown () {
    this.webSocket.send(JSON.stringify({
      type: GQL.CONNECTION_TERMINATE
    }))
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
        // The payload contains the error.
        if (this.callback) {
          this.callback(new GraphQLError(data.payload), this)
        }
        break
      }
      case GQL.CONNECTION_KEEP_ALIVE: {
        // This will occur:
        // 1. After GQL.CONNECTION_ACK
        // 2. Periodically to keep the connection alive.
        this.onKeepAlive()
        break
      }
      case GQL.DATA: {
        // These messages are sent after GQL.START to transfer the results of the GraphQL subscription.
        const callback = this.subscriptions.get(data.id)
        if (callback) {
          const error = data.payload.errors ? new GraphQLError(data.payload.errors) : undefined
          callback(error, data.payload.data)
        }
        break
      }
      case GQL.COMPLETE: {
        // This is sent when an operation is done and no more data will be sent.
        const callback = this.subscriptions.get(data.id)
        if (callback) {
          this.subscriptions.delete(data.id)
          callback(new GraphQLError('complete'), undefined)
        }
        break
      }
    }
  }
}
