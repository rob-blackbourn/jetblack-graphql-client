# jetblack-graphql-client

This is work in progress.

## Overview

A simple non-caching GraphQL client for query, mutation and subscription.

I wanted a simple non-caching GraphQL subscription client written in ES6
javascript with no external dependencies.

The protocol can be found [here](https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md).

## Usage

I use it as follows:

```js
import Subscriber from '@jetblack/subscriber'

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