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
    this.buffer.push([key, value, isDeleted])

    if (this.buffer.length < this.maxBufferLength) {
      // The buffer isn't full yet, so we're done.
      return
    }

    this.flush()
  }

  flush() {
    if (this.buffer.length === 0) {
      return
    }

    // De-duplicate buffer entries for the same key, preserving only the last entry.
    const bufferObject = {}
    for (const entry of this.buffer) {
      bufferObject[entry[KEY_INDEX]] = entry
    }

    const sstFileName = this._generateNextSstFileName()

    // Flush the buffer to disk.
    fs.writeFileSync(
      path.resolve(this.dbPath, sstFileName),
      // Stringify the buffer entries, reverse sort them, and then join them into one string separated by newlines.
      Object.keys(bufferObject)
        .map(key => JSON.stringify(bufferObject[key]))
        .sort()
        .join('\n')
    )

    this.buffer = []
  }

  get(key) {
    // First, check the buffer for the newest entry with the key.
    const latestBufferEntryValue = this._findLatestBufferEntryValue(key)

    if (latestBufferEntryValue !== undefined) {
      // It was found in the buffer, so we're done.
      return latestBufferEntryValue
    }

    // The key wasn't found in the buffer, so now we search the SST files.
    const sstFileNames = shell.ls(this.dbPath).filter(fileName => SST_FILE_NAME_REGEXP.test(fileName))

    if (sstFileNames.length === 0) {
      // If there are no SST files, the key can't exist.
      return undefined
    }

    // We want to search the newest SSTs first so that we get the newest entry for the key.
    sstFileNames.reverse()

    // Search through the SST files, newest to oldest.
    for (const sstFileName of sstFileNames) {
      // Parse the SST file into an array of entries.  It's the same structure as the buffer, but it's sorted.
      const entries = this._loadEntriesFromSstFile(sstFileName)
      const entryValue = this._findEntryValue(key, entries)

      if (entryValue !== undefined) {
        return entryValue
      }
    }

    // The key was not found.
    return undefined
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

    // By default, ls returns a file list sorted by name.  So we can use pop() to get the filename for the newest SST
    // file, which will also have the highest index.
    const lastSstFileName = existingSstFileNames.pop()

    // The regex matches the format of SST file names and extracts the index.
    const lastSstIndexString = SST_FILE_NAME_REGEXP.exec(lastSstFileName)[1]

    // We need to explicitly parse it to an Int before we can increment it.
    const lastSstIndex = parseInt(lastSstIndexString)
    const nextSstIndex = lastSstIndex + 1

    // E.g. 1 becomes '0001' and 123 becomes '0123'.
    const nextSstIndexPaddedString = nextSstIndex.toString().padStart(4, '0')

    const nextSstFileName = `sorted_string_table_${nextSstIndexPaddedString}.json`
    return nextSstFileName
  }

  _findLatestBufferEntryValue(key) {
    // Search the entries from most recent to oldest.
    for (let i = this.buffer.length - 1; i >= 0; i--) {
      if (this.buffer[i][KEY_INDEX] === key) {
        // We found the entry with the key in the buffer, so we're done.
        return this.buffer[i][IS_DELETED_INDEX]
          ? undefined // The isDeleted flag is set to true.
          : this.buffer[i][VALUE_INDEX] // Return the value for the key.
      }
    }

    // The key was not found in the buffer.
    return undefined
  }

  _loadEntriesFromSstFile(sstFileName) {
    // readFileSync returns a Buffer object that represents binary data.
    const buffer = fs.readFileSync(path.resolve(this.dbPath, sstFileName))

    // Stringify the buffer so we can split it into lines.
    const bufferString = buffer.toString()

    // Split the buffer into lines, each representing an entry in JSON format.
    const lines = bufferString.trim().split('\n')

    // Parse the JSON in each line into an array representing an entry.
    const entries = lines.map(jsonLine => JSON.parse(jsonLine))
    return entries
  }

  _findEntryValue(key, entries) {
    let entry = undefined
    let first = 0
    let last = entries.length - 1

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const mid = first + Math.floor((last - first) / 2)

      // We found the key.
      if (entries[mid][KEY_INDEX] === key) {
        entry = entries[mid]
        break
      }

      // The search range has closed.
      if (first >= last) {
        break
      }

      if (entries[mid][KEY_INDEX] > key) {
        // The key might exist in an entry before this entry.
        last = mid - 1
      } else {
        // The key might exist in an entry after this entry.
        first = mid + 1
      }
    }

    if (entry) {
      // We found the entry with the key in the sst file, so we're done.
      return entry[IS_DELETED_INDEX]
        ? undefined // The isDeleted flag is set to true.
        : entry[VALUE_INDEX] // Return the value for the key.
    }

    // The key was not found in the given entries.
    return undefined
  }
}
