import chai, { assert } from 'chai'
import chaiString from 'chai-string'
import path from 'path'
import shell from 'shelljs'
import { KeyValueStore } from '../../src/key-value-store'

chai.use(chaiString)

const tests = () => {
  describe('Challenge', () => {
    // Test keys and values we'll use in the new tests
    const testKey1 = 'test-key-1'
    const testValue1 = 'test-value-1'
    const testValue2 = 'test-value-2'

    // The path where temporary db files will be written, in the project root.
    const dbTempPath = path.resolve(__dirname, '../../db_temp')

    // Contains a fresh instance of the key-value store for each test.
    let keyValueStore = null

    // Contains the path for the db files for the currently executing test.
    let dbPath = null

    // Allows us to give each test a unique directory.
    let testId = 1

    before(() => {
      // Safety check so we don't delete the wrong files
      assert.endsWith(dbTempPath, 'db_temp')
      shell.rm('-rf', dbTempPath)
    })

    beforeEach(() => {
      // Generate a unique path in the project root to hold the db files for this test.
      dbPath = path.resolve(
        dbTempPath,
        process.pid.toString() + '_' + (testId++).toString()
      )
      shell.mkdir('-p', dbPath)

      // Before each test, create a new instance of the key-value store.
      keyValueStore = new KeyValueStore({ dbPath })
      keyValueStore.init()
    })

    // The point of checkAndSet() is to let us avoid accidentally clobbering data
    // from another client.  Let's say client1 needs to add to a balance and client2
    // needs to substract from the balance.  We don't want a race condition where
    // client1 retrieves the current balance, then client 2 retrieves the current balance,
    // then they both change the balance and write it back.  Only the latest write
    // will "win" and the value of balance will be wrong.

    it('checkAndSet() returns true when expectedValue matches and value was set', () => {
      let newValueWasSet = keyValueStore.checkAndSet({
        key: testKey1,
        expectedValue: undefined,
        newValue: testValue1,
      })
      assert.isTrue(newValueWasSet)
      assert.equal(keyValueStore.get(testKey1), testValue1)

      newValueWasSet = keyValueStore.checkAndSet({
        key: testKey1,
        expectedValue: testValue1,
        newValue: testValue2,
      })
      assert.isTrue(newValueWasSet)
      assert.equal(keyValueStore.get(testKey1), testValue2)
    })

    it('checkAndSet() returns false when expectedValue does not match and value was not set', () => {
      keyValueStore.set(testKey1, testValue1)

      let newValueWasSet = keyValueStore.checkAndSet({
        key: testKey1,
        expectedValue: undefined,
        newValue: testValue2,
      })
      assert.isFalse(newValueWasSet)
      assert.equal(keyValueStore.get(testKey1), testValue1)

      newValueWasSet = keyValueStore.checkAndSet({ key: testKey1, expectedValue: testValue2, newValue: 'foo' })
      assert.isFalse(newValueWasSet)
      assert.equal(keyValueStore.get(testKey1), testValue1)
    })

    // NOTE: If you get the 2 tests above passing, the test below should also pass.
    // It's not necessary to understand all of how it works right now.

    const expectedCounterValue = 10

    // This function attempts to increment a counter using checkAndSet(). It adds
    // a delay between reading and writing the counter in order to expose issues
    // with concurrency where another operation might try to increment the counter
    // at the same time.
    async function atomicIncrement() {
      let newValueWasSet = false
      do {
        const counterValue = keyValueStore.get('counter')
        const newCounterValue = counterValue + 1
        await new Promise(resolve => {
          setTimeout(() => {
            newValueWasSet = keyValueStore.checkAndSet({
              key: 'counter',
              expectedValue: counterValue,
              newValue: newCounterValue,
            })
            resolve()
          }, Math.random() * 100)
        })
      } while (!newValueWasSet)
    }

    it('checkAndSet() enables concurrent atomic increment', async () => {
      keyValueStore.set('counter', 0)

      // Run expectedCounterValue (10) atomicIncrement() operations concurrently
      await Promise.all([...Array(expectedCounterValue)].map(atomicIncrement))
      assert.equal(
        keyValueStore.get('counter'),
        expectedCounterValue,
        `expected counter value to reflect ${expectedCounterValue} atomic increments`
      )
    })
  })
}

describe('KeyValueStore', process.env.CHALLENGES ? tests : () => {})
