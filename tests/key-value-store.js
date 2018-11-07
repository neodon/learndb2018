import chai, { assert } from 'chai'
import chaiString from 'chai-string'
import path from 'path'
import shell from 'shelljs'
import { KeyValueStore } from '../src/key-value-store'

chai.use(chaiString)

describe('KeyValueStore', () => {
  // Test keys and values we'll use in the new tests
  const testKey1 = 'test-key-1'
  const testValue1 = 'test-value-1'
  const testValue2 = 'test-value-2'

  // The path where temporary db files will be written, in the project root.
  const dbTempPath = path.resolve(__dirname, '../db_temp')

  // Contains a fresh instance of the key-value store for each test.
  let keyValueStore = null

  // Contains the path for the db files for the currently executing test.
  let dbPath = null

  // Allows us to give each test a unique directory.
  let testId = 1

  // Functions passed to before() run only once, before any of the tests run.
  before(() => {
    // Safety check so we don't delete the wrong files
    assert.endsWith(dbTempPath, 'db_temp')
    shell.rm('-rf', dbTempPath)
  })

  // Functions passed to beforeEach will run before every test.
  beforeEach(() => {
    // Generate a unique path in the project root to hold the db files for this test.
    dbPath = path.resolve(dbTempPath, process.pid.toString() + '_' + (testId++).toString())
    shell.mkdir('-p', dbPath)

    // Before each test, create a new instance of the key-value store.
    keyValueStore = new KeyValueStore({ dbPath })
    keyValueStore.init()
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
