import graphQLSubscriber from './Subscriber'
import EventError from './EventError'

class ReconnectingSubscriber {
  constructor (url, options, callback, delay = 1000, maxRetries = 0, protocols) {
    this.url = url
    this.options = options
    this.callback = callback
    this.delay = delay
    this.maxRetries = maxRetries
    this.retryCount = 0
    this.shutdown = graphQLSubscriber(
      this.url,
      this.options,
      (error, subscribe) => {
        if (!(error || subscribe)) {
          // Normal closure.
          callback(null, null)
        } else {
          this.callback(error, (query, variables, operationName, callback) => {
            return this.reconnectableSubscribe(subscribe, query, variables, operationName, callback, {})
          })
        }
      },
      protocols)
  }

  reconnectableSubscribe (subscribe, query, variables, operationName, callback, unsubscribeProxy) {
    unsubscribeProxy.unsubscribe = subscribe(query, variables, operationName, (error, data) => {
      if (error instanceof EventError && error.event instanceof CloseEvent && error.event.code !== 1000) {
        this.reschedule(query, variables, operationName, callback, unsubscribeProxy)
      } else {
        this.retryCount = 0
        callback(error, data)
      }
    })
    return () => unsubscribeProxy.unsubscribe()
  }

  reschedule (query, variables, operationName, callback, unsubscribeProxy) {
    setTimeout(() => {
      this.resubscribe(query, variables, operationName, callback, unsubscribeProxy)
    }, this.delay)
  }

  resubscribe (query, variables, operationName, callback, unsubscribeProxy) {
    if (this.maxRetries > 0 && ++this.retryCount > this.maxRetries) {
      this.callback(new Error('Max retries exceeded'), null)
      return
    }

    this.shutdown = graphQLSubscriber(
      this.url,
      this.options,
      (error, subscribe) => {
        if (!(error || subscribe)) {
          // Normal closure
          callback(null, null)
        } else if (error instanceof EventError && error.event instanceof CloseEvent && error.event.code !== 1000) {
          this.reschedule(query, variables, operationName, callback, unsubscribeProxy)
        } else {
          return this.reconnectableSubscribe(subscribe, query, variables, operationName, callback, unsubscribeProxy)
        }
      })
  }
}

export default function graphQLReconnectingSubscriber (url, options, callback, delay = 1000, maxRetries = 0, protocols = 'graphql-ws') {
  const subscriber = new ReconnectingSubscriber(url, options, callback, delay, maxRetries, protocols)
  return subscriber.shutdown
}
