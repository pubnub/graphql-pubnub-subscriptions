import { expect, use } from 'chai';
import { spy, restore, stub, mock } from 'simple-mock';
// import { isAsyncIterable } from 'iterall';

import { PNPubSub } from '../pn-pubsub';
import PubNub from 'pubnub';

use(require('chai-as-promised'));

// -------------- [BEGIN] Mocking PubNub Client ------------------

// let listener;

// const publishSpy = spy(
// (channel, message) => listener && listener(channel, message)
// );
// const subscribeSpy = spy((channel, cb) => cb && cb(null, channel));
// const unsubscribeSpy = spy((channel, cb) => cb && cb(channel));
// const psubscribeSpy = spy((channel, cb) => cb && cb(null, channel));
// const punsubscribeSpy = spy((channel, cb) => cb && cb(channel));

// const quitSpy = spy(cb => cb);
// const mockRedisClient = {
// publish: publishSpy,
// subscribe: subscribeSpy,
// unsubscribe: unsubscribeSpy,
// psubscribe: psubscribeSpy,
// punsubscribe: punsubscribeSpy,
// on: (event, cb) => {
// if (event === 'message') {
// listener = cb;
// }
// },
// quit: quitSpy,
// };
// const mockOptions = {
// publisher: mockRedisClient as any,
// subscriber: mockRedisClient as any,
// };

// -------------- [END] Mocking PubNub Client ------------------

const subscribeKey = 'test-sub-key';
const publishKey = 'test-pub-key';

describe('PNPubSub', () => {
  let pubsub;
  let mockPubNub = new PubNub({ subscribeKey, publishKey });

  beforeEach(() => {
    mock(mockPubNub, 'publish');
    mock(mockPubNub, 'addListener');
    mock(mockPubNub, 'subscribe');
    mock(mockPubNub, 'unsubscribeAll');

    pubsub = new PNPubSub({ subscribeKey, publishKey, client: mockPubNub });
  });

  afterEach(() => {
    restore();
    pubsub = null;
  });

  it('should create a PubNub instance with a valid sub/pub key', () => {
    expect(pubsub.getClientInstance()).to.be.an.instanceOf(PubNub);
  });

  it('should be able to publish a message to a channel', async () => {
    let result;

    mockPubNub.publish.returnWith('test-message');

    try {
      result = await pubsub.publish('test-channel', 'test-message');
    } catch (e) {
      result = null;
    }

    expect(mockPubNub.publish.called).to.be.true;
    expect(result).to.equal('test-message');
  });

  it('should subscribe to a channel and call the onMessage callback', async () => {
    const onMessageSpy = spy(message => {
      expect(message).to.equal('test-message');
    });

    let result;

    try {
      result = await pubsub.subscribe('test-channel', onMessageSpy);
    } catch (e) {
      result = null;
    }

    expect(mockPubNub.addListener.called).to.be.true;
    expect(mockPubNub.subscribe.called).to.be.true;
    expect(result).to.be.a('number');
  });

  it('should call pubnub.unsubscribeAll()', () => {
    pubsub.unsubscribe(1);
    expect(mockPubNub.unsubscribeAll.called).to.be.true;
  });
});
