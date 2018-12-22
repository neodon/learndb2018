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

  // How many entries the buffer can store before they get flushed to disk
  let maxBufferLength = 3

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
    keyValueStore = new KeyValueStore({ dbPath, maxBufferLength })
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

  it('flush() flushes buffer to disk', () => {
    assert.equal(shell.ls(dbPath).length, 0, 'no SST files should exist in dbPath yet')
    keyValueStore.set('test-key-3', 'test-value-3')

    assert.equal(shell.ls(dbPath).length, 0, 'no SST files should exist in dbPath yet')
    keyValueStore.flush()

    assert.equal(shell.ls(dbPath).length, 1, 'buffer should be flushed to disk as sorted_string_table_0001.json')
    assert.lengthOf(keyValueStore.buffer, 0, 'the buffer should be emptied after flushing to disk')
  })

  it('set() flushes buffer to disk after maxBufferLength (3) entries', () => {
    assert.equal(shell.ls(dbPath).length, 0, 'no SST files should exist in dbPath yet')
    keyValueStore.set('test-key-2', 'test-value-2')

    assert.equal(shell.ls(dbPath).length, 0, 'no SST files should exist in dbPath yet')
    keyValueStore.set('test-key-1', 'test-value-1')

    assert.equal(shell.ls(dbPath).length, 0, 'no SST files should exist in dbPath yet')
    keyValueStore.set('test-key-3', 'test-value-3')

    assert.equal(shell.ls(dbPath).length, 1, 'buffer should be flushed to disk as sorted_string_table_0001.json')
    assert.lengthOf(keyValueStore.buffer, 0, 'the buffer should be emptied after flushing to disk')

    assert.equal(shell.ls(dbPath).length, 1, 'first SST file should exist in dbPath')
    keyValueStore.set('test-key-2', 'test-value-2')

    assert.equal(shell.ls(dbPath).length, 1, 'first SST file should exist in dbPath')
    keyValueStore.set('test-key-1', 'test-value-1')

    assert.equal(shell.ls(dbPath).length, 1, 'first SST file should exist in dbPath')
    keyValueStore.set('test-key-3', 'test-value-3')

    assert.equal(shell.ls(dbPath).length, 2, 'buffer should be flushed to disk as sorted_string_table_0002.json')
    assert.lengthOf(keyValueStore.buffer, 0, 'the buffer should be emptied after flushing to disk')

    const expectedEntries = [
      ['test-key-1', 'test-value-1', false],
      ['test-key-2', 'test-value-2', false],
      ['test-key-3', 'test-value-3', false],
    ]

    const expectedSortedStringTableContent = expectedEntries.map(JSON.stringify).join('\n')

    const actualSortedStringTableContent1 = shell.cat(path.resolve(dbPath, 'sorted_string_table_0001.json')).stdout
    assert.equal(actualSortedStringTableContent1, expectedSortedStringTableContent)

    const actualSortedStringTableContent2 = shell.cat(path.resolve(dbPath, 'sorted_string_table_0002.json')).stdout
    assert.equal(actualSortedStringTableContent2, expectedSortedStringTableContent)
  })
})
