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
  constructor(url, error, callback) {
    this.nextId = 1
    this.subscriptions = {}
    this.error = error
    this.callback = callback

    this.webSocket = new WebSocket(url, 'graphql-ws') // graphql-subscriptions
    this.webSocket.onopen = this.onOpen.bind(this)
    this.webSocket.onmessage = this.onMessage.bind(this)
    this.webSocket.onclose = this.onClose.bind(this)
    this.webSocket.onerror = this.onError.bind(this)
  }

  subscribe(query, variables, operationName, error, callback) {
    const id = this.nextId++
    const message = {
      type: GQL.START,
      id: id.toString(),
      payload: { query, variables, operationName }
    }

    this.subscriptions[id] = {
      callback,
      error
    }

    this.webSocket.send(JSON.stringify(message))

    return id
  }

  unsubscribe(id) {
    const message = {
      type: GQL.STOP,
      id: id.toString()
    }

    this.webSocket.send(JSON.stringify(message))

    const subscriber = this.subscriptions[id]
    subscriber.callback('unsubscribed')
  }

  close() {
    const message = {
      type: GQL.CONNECTION_TERMINATE
    }

    this.webSocket.send(JSON.stringify(message))

    for (const subscriber of this.subscriptions) {
      subscriber.callback('closed')
    }

    this.subscriptions = {}
  }

  onOpen(event) {
    const message = {
      type: GQL.CONNECTION_INIT
    }

    this.webSocket.send(JSON.stringify(message))
  }

  onMessage(event) {
    const data = JSON.parse(event.data)

    switch (data.type) {
      case GQL.CONNECTION_ACK: {
        this.callback(GQL.CONNECTION_ACK, data)
        break
      }
      case GQL.CONNECTION_ERROR: {
        this.error(GQL.CONNECTION_ERROR, data)
        break
      }
      case GQL.CONNECTION_KEEP_ALIVE: {
        this.callback(GQL.CONNECTION_ACK, data)
        break
      }
      case GQL.DATA: {
        const subscriber = this.subscriptions[data.id]
        if (data.payload.errors) {
          subscriber.error(GQL.DATA, data.payload.errors)
        } else {
          subscriber.callback(GQL.DATA, data.payload.data)
        }
        break
      }
      case GQL.COMPLETE: {
        const subscriber = this.subscriptions[data.id]
        subscriber.callback('complete')
        delete this.subscriptions[data.id]
        break
      }
    }
  }

  onClose(event) {
    console.log('onClose', event)
  }

  onError(event) {
    console.log('onError', event)
  }
}
