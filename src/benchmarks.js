import Benchmark from 'benchmark'
import { KeyValueStore } from './key-value-store'

const bytesPerMB = 1024 * 1024
const maxItems = 500

function run() {
  const keyValueStore = new KeyValueStore()
  const suite = new Benchmark.Suite()

  const startingRss = process.memoryUsage().rss
  console.log(`Starting RSS memory usage: ${bytesToMB(startingRss)} MB`)

  keyValueStore.init()

  suite
    .add('KeyValueStore#set', function() {
      keyValueStore.set(Math.floor(Math.random() * maxItems).toString(), Math.random().toString())
    })
    .add('KeyValueStore#get', function() {
      keyValueStore.get(Math.floor(Math.random() * maxItems).toString())
    })
    .add('KeyValueStore#delete', function() {
      keyValueStore.delete(Math.floor(Math.random() * maxItems).toString())
    })
    .on('cycle', function(event) {
      console.log(String(event.target))
    })
    .on('complete', function() {
      const endingRss = process.memoryUsage().rss
      console.log(`Ending RSS memory usage: ${bytesToMB(endingRss)} MB`)
      console.log(`Difference: ${bytesToMB(endingRss - startingRss)} MB`)
    })
    .on('error', function(err) {
      console.error(err)
    })
    .run({ maxTime: 3, async: true })
}

function bytesToMB(bytes) {
  return (bytes / bytesPerMB).toFixed(3)
}

export { run }

if (!module.parent) {
  run()
}
