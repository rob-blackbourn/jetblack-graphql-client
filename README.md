# jetblack-graphql-client

This is work in progress.

## Overview

A simple non-caching GraphQL client for query, mutation and subscription.

I wanted a simple non-caching GraphQL subscription client written in ES6
javascript with no external dependencies.

The protocol for GraphQL WebSocket subscriptions can be found [here](https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md).

This implementation is deliberately explicit and low on features as I wanted to keep
the algorithm clear. Features like observables and caching should be implmented in
other libraries.

## Installation

Install from npm.

```bash
yarn add @jetblack/graphql-client
```

## Usage

There are two main functions:

 * `graphQLSubscriber (url, options, callback, protocols = 'graphql-ws')`
 * `graphQLFetch (url, query, variables = {}, operationName = null, headers = {}, method = 'post')`

The `graphQLSubscriber` implements the `WebSocket` protocol. The function takes the
`url` for the `WebSocket`, an `options` object which is simply passed as JSON to the
server, and a `callback` with the prototype `(error, subscribe)`. A function is returned
which can be used to shutdown the subscriber.
If both `error` and `subscribe` are `null` the connection has been closed normally.

The `subscribe` argument is a function with the prototype `subscribe(query, variables, operationName, callback)`.
When `subscribe` is called it returns a function that can be called to unsubscribe.
The `callback` to the `subscribe` function has the prototype `callback(error, data)`. If
both `error` and `data` are `null` then connection hs been closed normally.

The `graphQLFetch` function is a simple `fetch` implementation for `query` and `mutation` operations.
There are numerous implementations of this available, and it is provided for convenience.
The `method` defaults to `'post'`, but `'get'` is also valid.
The `protocols` defaults to `"graphql-ws"`. The documentation suggests this can be an array or strings, but the first should be the default.

There are two helper functions which provide reconnection/retry functionality:

 * `graphQLReconnectingSubscriber (url, options, callback, delay = 1000, maxRetries = 0, protocols = 'graphql-ws')`
 * `graphQLRetryFetch (url, query, variables = {}, operationName = null, headers = {}, method = 'post')`

 As the name suggests the `graphQLReconnectingSubscriber` will try to reconnect should
 the connection be dropped. The `delay` is specified in milliseconds. The `maxRetries`
 will limit the number of retries unless set to 0 which means unlimited.

 The `graphQLRetryFetcher` has an extra `retryOn` argument which is an array of status codes
 for which retry will be attempted.

There follows an example of the `graphQLSubscriber`.

```js
import { Subscriber } from '@jetblack/graphql-client'

const url = 'ws://localhost/subscriptions'
const options = {}

const query = `
subscription {
    mySubscription {
        someData
    }
}
`
variables = {}
operationName = null

const shutdown = graphQLSubscriber(
    url,
    options,
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
shutdown()
```

The graphQLFetch function is used as follows.

```js
import { Fetcher } from '@jetblack/graphql-client'

const fetcher = new RetryFetcher('http://localhost/graphql')

// An example mutation.
graphQLFetch(
    `
mutate CreditAccount($account: ID!, $amount: Float!) {
creditAccount(account: $account, amount: $amount) {
    balance
}
}`,
    {
        account: '1234',
        amount: 19.99
    },
    ''
)
.then(respoonse => response.json())
.then(response => {
    console.log(response.data.balance)
})
.catch(error => {
    console.error(error)
})
```