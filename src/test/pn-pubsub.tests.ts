import { expect, use } from 'chai';
import { restore, mock } from 'simple-mock';
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
    mock(mockPubNub, 'unsubscribe');

    pubsub = new PNPubSub({ subscribeKey, publishKey, client: mockPubNub });
  });

  afterEach(() => {
    restore();
    pubsub = null;
  });

  it('should attach an event listener when the PNPubSub is instantiated', () => {
    new PNPubSub({ subscribeKey, publishKey, client: mockPubNub })
    expect(mockPubNub.addListener.called).to.be.true;
  })

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

  it('should subscribe to a channel', async () => {

    const result = await pubsub.subscribe('test-channel', () => {})

    expect(mockPubNub.subscribe.callCount).to.equal(1);
    expect(result).to.be.a('number');
    expect(result).to.equal(0);
  });

  it('should subscribe to a channel once for multiple channel subscriptions', async () => {

    const firstSubId = await pubsub.subscribe('test-channel', () => {})
    const secondSubId = await pubsub.subscribe('test-channel', () => {})

    expect(mockPubNub.subscribe.callCount).to.equal(1);
    expect(firstSubId).to.equal(0);
    expect(secondSubId).to.equal(1);

  });

  it('should subscribe to a different channels', async () => {

    const firstSubId = await pubsub.subscribe('test-channel', () => {})
    const secondSubId = await pubsub.subscribe('test-channel', () => {})
    const thirdSubId = await pubsub.subscribe('test-channel-2', () => {})

    expect(mockPubNub.subscribe.callCount).to.equal(2);
    expect(firstSubId).to.equal(0);
    expect(secondSubId).to.equal(1);
    expect(thirdSubId).to.equal(2);
  });


  it('should call pubnub.unsubscribe()', async () => {
    await pubsub.subscribe('test-channel', () => {});
    pubsub.unsubscribe(0);
    expect(mockPubNub.unsubscribe.called).to.be.true;
  });

  it('should not call pubnub.unsubscribe() if there are multiple subscribers', async () => {
    const firstSubId = await pubsub.subscribe('test-channel', () => {});
    const secondSubId = await pubsub.subscribe('test-channel', () => {});
    pubsub.unsubscribe(firstSubId);
    expect(mockPubNub.unsubscribe.called).to.be.false;
    pubsub.unsubscribe(secondSubId);
    expect(mockPubNub.unsubscribe.called).to.be.true;
  });
});
