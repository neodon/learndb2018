import chai, { assert } from 'chai'
import chaiString from 'chai-string'
import { KeyValueStore } from '../src/key-value-store'

chai.use(chaiString)

describe('KeyValueStore', () => {
  // Test keys and values we'll use in the new tests
  const testKey1 = 'test-key-1'
  const testValue1 = 'test-value-1'
  const testValue2 = 'test-value-2'

  // Contains a fresh instance of the key-value store for each test.
  let keyValueStore = null

  beforeEach(() => {
    // Before each test, create a new instance of the key-value store.
    keyValueStore = new KeyValueStore()
  })

  it('get() returns value that was set()', () => {
    keyValueStore.set(testKey1, testValue1)
    assert.equal(keyValueStore.get(testKey1), testValue1)
  })

  it('get() returns last value that was set()', () => {
    keyValueStore.set(testKey1, testValue1)
    keyValueStore.set(testKey1, testValue2)
    assert.equal(keyValueStore.get(testKey1), testValue2)
  })

  it('get() for non-existent key returns undefined', () => {
    assert.equal(keyValueStore.get(testKey1), undefined)
  })

  it('set() and get() support null value', () => {
    keyValueStore.set(testKey1, null)
    assert.equal(keyValueStore.get(testKey1), null)
  })

  it('delete() for key causes get() to return undefined', () => {
    keyValueStore.set(testKey1, testValue1)
    keyValueStore.delete(testKey1)
    assert.equal(keyValueStore.get(testKey1), undefined)
  })
})
