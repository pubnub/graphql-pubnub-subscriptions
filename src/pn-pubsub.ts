import { PubSubEngine } from 'graphql-subscriptions';
import { PubSubAsyncIterator } from './pubsub-async-iterator';

import PubNub from 'pubnub';

/**
 * This is the minimum simple options passed to the JS SDK object
 */
type PNOptions = {
  subscribeKey: string;
  publishKey: string;
  origin?: string;
  debug?: boolean;
  client?: PubNub;
};

/**
 * This is a mimicked type from the message Subscribe response from the JS SDK
 * This can be extended to include additional fields but kept the bare bones initially.
 *
 * NOTE: The GraphQL Schema that is used _WITH_ this should match at least a subset of
 * returned fields. Any additional fields used in the GraphQL Schema must be properly
 * resolved either manually or added to this library for resolution.
 */

type PNMessage = {
  channel: string;
  actualChannel?: string;
  subscribedChannel: string;
  timetoken: string;
  publisher: string;
  message: any;
};

type OnMessage = (message: PNMessage) => void;

/**
 * The PubNub specific class that is to be used to translate GraphQL subscriptions
 * to use PubNub's subscribe loop from the JavaScript SDK
 *
 * The PubNub SDK instance is created after instantiating a new "PNPubSub" class
 * The current PubNub message listener is attached to the pubsub-async-iterator class
 * in order to produce an AsyncIterator equivalent for GraphQL to process.
 */


/**
 * A class for the pubnub pubsub engine which is responsible for:
 * 1) Adding a single listener that listens to all subscribed channel and class the appropirate rsolver
 * 2) Subscribing to pubnub channels when a subscriptioin is active
 * 3) Unsubscribing from a pubnub channel when all subscription clients to this channel unsubscribe
 * @class
 *
 * @constructor
 *
 * setsup a single listener to pubnub which chooses the appriporiate handler to call
 *
 * @property pubnub @type {PubNub}
 * The pubnub instance
 *
 * @property subscribeId @type {number}
 * Incremented counter that's used to get a new id for a new subscrption .. needed for promise tracking
 *
 * @property subscriptions @type {{ [subscribeId: number]: string }}
 * An object that keeps refrence of which subscription has which channel. Useful when we try to unsubscribe
 * from a channel to resolve the channel name by id
 *
 *
 * @property subsRefsMap @type {{[channel: string]: [number, OnMessage][]}}
 * An object that is useful to determine which channel has which subscriptions and handlers
 * Userful in multiple places:
 * 1) The event listener callback to pick which resolvers to call
 * 2) subscribe function to see if the channel's already been subscribed to
 * 3) unsubscribe to see if we actually need to unsubscribe from the channel or there are still some
 * clients that need this pubnub subscription going
 *
 * @property debug @type {boolean}
 * A boolean that is set on initialization to determine if the server (preferably on dev environment) needs some useful console logs
 */


export class PNPubSub implements PubSubEngine {
  private pubnub: PubNub;
  private subscribeId: number;
  private subscriptions: { [subscribeId: number]: string };
  private subsRefsMap: {[channel: string]: [number, OnMessage][]};
  private debug: boolean;

  constructor({ debug, client, ...options }: PNOptions) {
    this.subscribeId = 0; // this is needed for promise tracking
    this.subscriptions = {};
    this.subsRefsMap = {};
    this.debug = debug;

    if (this.debug) {
      // eslint disable-next-line
      console.debug(`Using subscribe key: ${options.subscribeKey}`);
      // eslint disable-next-line
      console.debug(`Using publish key: ${options.publishKey}`);
    }

    if (client) {
      this.pubnub = client;
    } else {
      this.pubnub = new PubNub(options);
    }

    this.pubnub.addListener({ message: (message: PNMessage) => {
      this.subsRefsMap[message.channel].forEach(([_, onMessage]) => onMessage(message))
    }
  });

  }

  public getClientInstance(): PubNub {
    return this.pubnub;
  }

  public publish(channel: string, message: any) {
    if (this.debug) {
      // eslint disable-next-line
      console.debug(`Publishing to channel "${channel}" => ${message}`);
    }

    return this.pubnub.publish({
      channel,
      message,
    });
  }

  public subscribe(
    channel: string,
    onMessage: OnMessage,
  ): Promise<number> {

    const id = this.subscribeId++;
    this.subscriptions[id] = channel;

    const refs = this.subsRefsMap[channel]

    if (refs && refs.length > 0) {
      refs.push([id, onMessage])
      if (this.debug) {
        // eslint disable-next-line
        console.debug(`Already Subscribed to: ${channel}`);
      }
      return Promise.resolve(id);
    }

    if (this.debug) {
      // eslint disable-next-line
      console.debug(`Now subscribing to: ${channel}`);
    }

    this.subsRefsMap[channel] = [[id, onMessage]]
    this.pubnub.subscribe({ channels: [channel] });
    return Promise.resolve(id);
  }

  public unsubscribe(subscribeId: number) {
    if (this.debug) {
      // eslint disable-next-line
      console.debug(`Unsubscribing to ${subscribeId}`);
    }

    const channel = this.subscriptions[subscribeId]
    delete this.subscriptions[subscribeId]
    const refs = this.subsRefsMap[channel]

    if (refs?.length === 1) {
      if (this.debug) {
        // eslint disable-next-line
        console.debug(`Unsubscribing to channel ${channel}`);
      }
      delete this.subsRefsMap[channel]
      return this.pubnub.unsubscribe({
        channels: [channel]
      });
    }
    this.subsRefsMap[channel] = refs?.filter(([id]) => id !== subscribeId)
  }

  public asyncIterator<T>(channels: string | string[]): AsyncIterator<T> {
    return new PubSubAsyncIterator<T>(this, channels);
  }
}
