import path from 'path'
import fs from 'fs'
import shell from 'shelljs'

const KEY_INDEX = 0
const VALUE_INDEX = 1
const IS_DELETED_INDEX = 2

export class KeyValueStore {
  constructor({ dbPath }) {
    this.dbPath = dbPath
  }

  init() {
    shell.mkdir('-p', this.dbPath)
  }

  set(key, value, isDeleted = false) {
    // Creates the file if it does not exist, and appends a new line to the end
    // containing the JSON for the entry.
    fs.appendFileSync(
      path.resolve(this.dbPath, 'store.json'),
      JSON.stringify([key, value, isDeleted]) + '\n'
    )
  }

  get(key) {
    if (!fs.existsSync(path.resolve(this.dbPath, 'store.json'))) {
      return undefined // If the store doesn't exist, it can't contain the key.
    }

    // readFileSync returns a Buffer object that represents binary data.
    const buffer = fs.readFileSync(path.resolve(this.dbPath, 'store.json'))

    // Stringify the buffer so we can split it into lines.
    const bufferString = buffer.toString()

    // Split the buffer into lines.
    const lines = bufferString.split('\n')

    // Filter out empty lines--usually the last one since we always write a
    // newline after each set().  This leaves us with just JSON data.
    const jsonLines = lines.filter(line => line.length > 0)

    // Parse the JSON in each line into an array representing an entry.
    const entries = jsonLines.map(jsonLine => JSON.parse(jsonLine))

    // We want to search most recent entries first.  In JavaScript, .sort() and
    // .reverse() modify the array in-place.
    entries.reverse()

    for (const entry of entries) {
      if (entry[KEY_INDEX] === key) {
        return entry[IS_DELETED_INDEX]
          ? undefined // The isDeleted flag is set to true
          : entry[VALUE_INDEX] // Return the value for the key
      )
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
}
