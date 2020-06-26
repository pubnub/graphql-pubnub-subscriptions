# graphql-pubnub-subscriptions

This package implements the PubSubEngine Interface from the [graphql-subscriptions](https://github.com/apollographql/graphql-subscriptions) package and also the new AsyncIterator interface. It allows you to connect your subscriptions manager to a PubNub PubSub mechanism to support multiple subscription manager instances.

## Installation

`npm install graphql-pubnub-subscriptions` 
or
`yarn add graphql-pubnub-subscriptions`
   
## Using as AsyncIterator

Define your GraphQL schema with a `Subscription` type:

```graphql
schema {
  query: Query
  subscription: Subscription
}

type Subscription {
    messages: Result
}

type Result {
    message: String!
}
```

Now, let's create a simple `PNPubSub` instance:

```javascript
import { PNPubSub } from '@pubnub/graphql-pubnub-subscriptions';
const pubsub = new PNPubSub();
```

Now, implement your Subscriptions type resolver, using the `pubsub.asyncIterator` to map the event you need:

```javascript
const SOME_CHANNEL = 'myChannel';

export const resolvers = {
  Subscription: {
    messages: {
      subscribe: () => pubsub.asyncIterator(SOME_CHANNEL),
    },
  },
}
```

> Subscriptions resolvers are not a function, but an object with `subscribe` method, that returns `AsyncIterable`.

Calling the method `asyncIterator` of the `PNPubSub` instance will subscribe to the topic provided and will return an `AsyncIterator` binded to the PNPubSub instance and listens to any event published on that topic.
Now, the GraphQL engine knows that `messages` is a subscription, and every time a message is published to that channel and subscribe key, the `PNPubSub` will `PUBLISH` the event to all other subscribed instances and those in their turn will emit the event to GraphQL using the `next` callback given by the GraphQL engine.

The channel doesn't get created automatically, it has to be created beforehand.

If you publish non string data it gets stringified and you have to [parse the received message data](#receive-messages).

## Receive Messages

The [received message](https://www.pubnub.com/docs/web-javascript/api-reference-publish-and-subscribe#listeners) from PubNub gets directly passed as payload to the resolve/filter function.


## Dynamically use a channel based on subscription args passed on the query:

Assuming you have a Subscription defined in the schema like this:

```
type Subscription {
  messages(channel: String!): Result
}
```

You can use the passed in channel like so:

```javascript
export const resolvers = {
  Subscription: {
    messages: {
      subscribe: (_, args) => pubsub.asyncIterator(args.channel),
    },
  },
}
```

## Using both arguments and payload to filter events

*NOTE: This is currently not implemented. Feel free to add this capability!*

```javascript
import { withFilter } from 'graphql-subscriptions';

export const resolvers = {
  Subscription: {
    messages: {
      subscribe: withFilter(
        (_, args) => pubsub.asyncIterator(args.channel),
        (payload, variables) => payload, // NOT IMPLEMENTED
      ),
    },
  },
}
```

## Creating the PNPubSub Client

```javascript
import { PNPubSub } from '@pubnub/graphql-pubnub-subscriptions';

const pubSub = new PNPubSub({
  subscribeKey: 'some subscribe key',
  publishKey: 'some publish key',
});
```

### Options

These are the [options](https://www.pubnub.com/docs/web-javascript/api-reference-configuration) which are passed to the internal PubNub JS SDK.
Please Note that not all options are implemented at this time and therefore may not pass through.


#### Subscription Options

There's an additional option to send some console debugs during execution by passing a _debug_ flag.

```javascript
import { PNPubSub } from '@pubnub/graphql-pubnub-subscriptions';

const pubSub = new PNPubSub({
  subscribeKey: 'some subscribe key',
  publishKey: 'some publish key',
  debug: true, // <-- Just add this flag!
});
```

## Authors

[David Lin](https://github.com/pubnub)

## Acknowledgements


