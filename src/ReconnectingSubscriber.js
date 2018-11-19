import Subscriber from './Subscriber'

export default class ReconnectingSubscriber {
  constructor (url, options, callback, timeout = 1000, maxRetries = 0) {
    this.url = url
    this.options = options
    this.callback = callback
    this.timeout = timeout
    this.maxRetries = maxRetries
    this.retryCount = 0
    this.subscriber = new Subscriber(
      this.url,
      this.options,
      (error, subscribe) => {
        this.callback(error, (query, variables, operationName, callback) => {
          return this.reconnectableSubscribe(subscribe, query, variables, operationName, callback, {})
        })
      })
  }

  reconnectableSubscribe (subscribe, query, variables, operationName, callback, unsubscribeProxy) {
    unsubscribeProxy.unsubscribe = subscribe(query, variables, operationName, (error, data) => {
      if (error && error.details instanceof CloseEvent) {
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
    }, this.timeout)
  }

  resubscribe (query, variables, operationName, callback, unsubscribeProxy) {
    if (this.maxRetries > 0 && ++this.retryCount > this.maxRetries) {
      this.callback(new Error('Max retries exceeded'), undefined)
      return
    }

    this.subscriber = new Subscriber(
      this.url,
      this.options,
      (error, subscribe) => {
        if (error && error.details instanceof CloseEvent) {
          this.reschedule(query, variables, operationName, callback, unsubscribeProxy)
        } else {
          return this.reconnectableSubscribe(subscribe, query, variables, operationName, callback, unsubscribeProxy)
        }
      })
  }

  shutdown () {
    this.subscriber.shutdown()
  }
}
