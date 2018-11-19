# jetblack-graphql-client

This is work in progress.

## Overview

A simple non-caching GraphQL client for query, mutation and subscription.

I wanted a simple non-caching GraphQL subscription client written in ES6
javascript with no external dependencies.

The protocol can be found [here](https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md).

The implementation is deliberately explicit and low on features as I wanted to keep
the algorithm clear. Features like observables and caching should be implmented in
other libraries.

## Usage

There are two main classes:

 * `Subscriber(url, options, callback)`
 * `Fetcher(url, headers = {}, method = null)`

The `Subscriber` implements the `WebSocket` protocol. The constructor takes the
`url` for the `WebSocket`, an `options` object which is passed by JSON to the
server, and a `callback` with the prototype `(error, subscribe)`. The `subscribe`
argument is a function with the prototype `subscribe(query, variables, operationName, callback)`.
The `callback` to the `subscribe` function has the prototype `callback(error, data)`.

The `Fetcher` is a simple `fetch` implmentation for `query` and `mutation` operations.
There are numerous implementaions of this available, and it is given here for convenience.
A single method `fetch (query, variables = {}, operationName = null, headers = {}, method = null)`
is exposed.

There are two helper classes which provide reconnection/retry functionality:

 * `ReconnectingSubscriber(url, options, callback, delay = 1000, maxRetries = 0)`
 * `RetryFetcher(url, headers = {}, method = null, delay = 1000, maxRetries = 0, retryOn = [503])`

 As the name suggests the `ReconnectingSubscriber` will try to reconnect should
 the connection be dropped. The `delay` is specified in milliseconds. The `maxRetries`
 will limit the number of retries unless set to 0.

 The `RetryFetcher` has an extra `retryOn` argument to limit the response status codes
 for which it will attempt to retry.

I use it as follows:

```js
import { Subscriber } from '@jetblack/subscriber'

const url = 'ws://localhost/subscriptions'
const serverSpecificOptions = {}

const query = `
subscription {
    mySubscription {
        someData
    }
}
`
variables = {}
operationName = null

const subscriber = new Subscriber(
    url,
    serverSpecificOptions,
    (error, subscribe) => {
        if (error) {
            console.error(error)
            throw error
        }
        const unsubscribe = subscribe(
            query,
            variables,
            operationName,
            (error, data) => {
                if (error) {
                    console.error(error)
                    throw error
                }
                console.log(data)
            })
        
        // Some time later ...
        unsubscribe()
    })

// Some time later ...
subscriber.shutdown()
```