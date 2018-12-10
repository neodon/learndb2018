import path from 'path'
import fs from 'fs'
import shell from 'shelljs'

const KEY_INDEX = 0
const VALUE_INDEX = 1
const IS_DELETED_INDEX = 2

const SST_FILE_NAME_REGEXP = /^sorted_string_table_(\d+)[.]json$/

export class KeyValueStore {
  constructor({ dbPath, maxBufferLength }) {
    this.dbPath = dbPath
    this.maxBufferLength = maxBufferLength
    this.buffer = []
  }

  init() {
    shell.mkdir('-p', this.dbPath)
  }

  set(key, value, isDeleted = false) {
    // We put most recent entries first so we can search them first.
    this.buffer.unshift([key, value, isDeleted])

    if (this.buffer.length < this.maxBufferLength) {
      // The buffer isn't full yet, so we're done
      return
    }

    this.flush()
  }

  flush() {
    if (this.buffer.length === 0) {
      return
    }

    const sstFileName = this._generateNextSstFileName()

    // Flush the buffer to disk
    fs.writeFileSync(
      path.resolve(this.dbPath, sstFileName),
      // Stringify the buffer entries, reverse sort them, and then join them
      // into one string separated by newlines.  Still need a final trailing newline.
      this.buffer
        .map(JSON.stringify)
        .sort()
        .reverse()
        .join('\n') + '\n'
    )

    this.buffer = []
  }

  get(key) {
    // First, check the buffer for the most recent entry with the key
    const bufferEntry = this.buffer.find(entry => entry[KEY_INDEX] === key)

    if (bufferEntry) {
      // We found the entry with the key in the buffer, so we're done.
      return bufferEntry[IS_DELETED_INDEX]
        ? undefined // The isDeleted flag is set to true
        : bufferEntry[VALUE_INDEX] // Return the value for the key
    }

    const sstFileNames = shell.ls(this.dbPath).filter(fileName => SST_FILE_NAME_REGEXP.test(fileName))

    if (sstFileNames.length === 0) {
      return undefined // If there are no SST files, the key can't exist
    }

    // We want to search most recent SSTs first so we get the latest entries
    sstFileNames.reverse()

    // Search through the SST files, newest to oldest, top to bottom
    for (const sstFileName of sstFileNames) {
      // readFileSync returns a Buffer object that represents binary data.
      const buffer = fs.readFileSync(path.resolve(this.dbPath, sstFileName))

      // Stringify the buffer so we can split it into lines.
      const bufferString = buffer.toString()

      // Split the buffer into lines.
      const lines = bufferString.split('\n')

      // Filter out empty lines--usually the last one since we always write a
      // newline after each set().  This leaves us with just JSON data.
      const jsonLines = lines.filter(line => line.length > 0)

      // Parse the JSON in each line into an array representing an entry.
      const entries = jsonLines.map(jsonLine => JSON.parse(jsonLine))

      let entry = undefined
      let first = 0
      let last = entries.length - 1

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const mid = first + Math.floor((last - first) / 2)

        if (entries[mid][KEY_INDEX] === key) {
          entry = entries[mid]
          break
        }

        if (first === last) {
          break
        }

        if (entries[mid][KEY_INDEX] > key) {
          last = mid - 1
        } else {
          first = mid + 1
        }
      }

      if (entry) {
        // We found the entry with the key in the sst file, so we're done.
        return entry[IS_DELETED_INDEX]
          ? undefined // The isDeleted flag is set to true
          : entry[VALUE_INDEX] // Return the value for the key
      }
    }

    return undefined // The key was not found
  }

  delete(key) {
    this.set(key, null, true)
  }

  checkAndSet({ key, expectedValue, newValue }) {
    if (this.get(key) === expectedValue) {
      this.set(key, newValue)
      return true
    }

    return false
  }

  _generateNextSstFileName() {
    const existingSstFileNames = shell.ls(this.dbPath).filter(fileName => SST_FILE_NAME_REGEXP.test(fileName))

    if (existingSstFileNames.length === 0) {
      return 'sorted_string_table_0001.json'
    }

    const lastSstFileName = existingSstFileNames.pop()
    const lastSstIndexString = SST_FILE_NAME_REGEXP.exec(lastSstFileName)[1]
    const lastSstIndex = parseInt(lastSstIndexString)
    const nextSstFileName = `sorted_string_table_${(lastSstIndex + 1).toString().padStart(4, '0')}.json`
    return nextSstFileName
  }
}
