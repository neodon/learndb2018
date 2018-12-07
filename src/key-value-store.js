import path from 'path'
import fs from 'fs'
import shell from 'shelljs'
import stringHash from 'string-hash'

const VALUE_INDEX = 0
const KEY_INDEX = 1

export class KeyValueStore {
  constructor({ dbPath }) {
    this.dbPath = dbPath
  }

  init() {
    shell.mkdir('-p', this.dbPath)
  }

  set(key, value) {
    const keyHash = stringHash(key)
    const fileName = `${keyHash}.json`
    // Creates the file if it does not exist or overwrites it if it does exist.
    // Sets the file content to the JSON for the entry.
    fs.writeFileSync(
      path.resolve(this.dbPath, fileName),
      JSON.stringify([value, key])
    )
  }

  get(key) {
    const keyHash = stringHash(key)
    const fileName = `${keyHash}.json`

    if (!fs.existsSync(path.resolve(this.dbPath, fileName))) {
      return undefined // If the file doesn't exist, there's no value set for the key.
    }

    // readFileSync returns a Buffer object that represents binary data.
    const buffer = fs.readFileSync(path.resolve(this.dbPath, fileName))

    // Stringify the buffer so we can parse it as JSON.
    const bufferString = buffer.toString()

    // Parse the JSON into an array representing an entry.
    const entry = JSON.parse(bufferString)

    // Verify the key matches
    if (entry[KEY_INDEX] !== key) {
      throw new Error(
        `Keys do not match: '${
          entry[KEY_INDEX]
        }' !== '${key}' -- probably a hash collision.`
      )
    }

    // Return the value for the key.
    return entry[VALUE_INDEX]
  }

  delete(key) {
    const keyHash = stringHash(key)
    const fileName = `${keyHash}.json`
    if (fs.existsSync(path.resolve(this.dbPath, fileName))) {
      fs.unlinkSync(path.resolve(this.dbPath, fileName))
    }
  }

  checkAndSet({ key, expectedValue, newValue }) {
    if (this.get(key) === expectedValue) {
      this.set(key, newValue)
      return true
    }

    return false
  }
}
