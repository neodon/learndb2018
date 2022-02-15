export class KeyValueStore {
  constructor() {
    this.store = {}
  }

  init() {}

  set(key, value) {
    this.store[key] = value
  }

  get(key) {
    return this.store[key]
  }

  delete(key) {
    this.store[key] = undefined
  }
}
