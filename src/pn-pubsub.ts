import { PubSubEngine } from 'graphql-subscriptions';
import { PubSubAsyncIterator } from './pubsub-async-iterator';

import PubNub from 'pubnub';

/**
 * This is the minimum simple options passed to the JS SDK object
 */
type PNOptions = {
  subscribeKey: String;
  publishKey: String;
  origin?: String;
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
  channel: String;
  actualChannel?: String;
  subscribedChannel: String;
  timetoken: String;
  publisher: String;
  message: any;
};

/**
 * The PubNub specific class that is to be used to translate GraphQL subscriptions
 * to use PubNub's subscribe loop from the JavaScript SDK
 *
 * The PubNub SDK instance is created after instantiating a new "PNPubSub" class
 * The current PubNub message listener is attached to the pubsub-async-iterator class
 * in order to produce an AsyncIterator equivalent for GraphQL to process.
 */
export class PNPubSub implements PubSubEngine {
  private pubnub: PubNub;
  private subscribeId: number;
  private channels: string[];
  private debug: boolean;

  constructor({ debug, client, ...options }: PNOptions) {
    this.subscribeId = 0; // this is needed for promise tracking
    this.channels = []; // list of channels we're subscribed to
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
    onMessage: Function,
    options: Object
  ): Promise<number> {
    const id = this.subscribeId++;

    if (this.debug) {
      // eslint disable-next-line
      console.debug(`Now subscribing to: ${[...this.channels, channel]}`);
    }

    // Add the message listener
    this.pubnub.addListener({ message: onMessage });

    this.pubnub.subscribe({ channels: [...this.channels, channel] });

    return Promise.resolve(id);
  }

  public unsubscribe(subscribeId: number) {
    if (this.debug) {
      // eslint disable-next-line
      console.debug(`Unsubscribing to all`);
    }

    return this.pubnub.unsubscribeAll();
  }

  public asyncIterator<T>(channels: string | string[]): AsyncIterator<T> {
    return new PubSubAsyncIterator<T>(this, channels);
  }
}
