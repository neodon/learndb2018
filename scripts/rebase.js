/*
This is a maintenance script that I use to automatically rebase all branches
when I need to make a change somewhere that should propagate.

For example, I recently upgraded all npm packages in the master branch, and I
wanted that change to propagate to the branches for every lesson.  I had to
manually perform the following rebases:

* key-value-store-simple_before on master
* key-value-store-simple_after on key-value-store-simple_before
* key-value-store-fsdb_before on key-value-store-simple_after
* key-value-store-fsdb_after on key-value-store-fsdb_before

It's quite tedious, so I made this script to automate it.
*/

import shell from 'shelljs'

const rebaseEntries = [
  { branch: 'key-value-store-simple_before', rebaseTarget: 'master' },
  { branch: 'key-value-store-simple_after', rebaseTarget: 'key-value-store-simple_before' },
  { branch: 'key-value-store-fsdb_before', rebaseTarget: 'key-value-store-simple_after' },
  { branch: 'key-value-store-fsdb_after', rebaseTarget: 'key-value-store-fsdb_before' },
]

let startIndex = 0

if (process.argv[2] === 'continue') {
  console.log('Continuing previous rebase run.')
  const currentBranch = shell.exec('git rev-parse --abbrev-ref HEAD').trim()
  const rebaseEntry = rebaseEntries.find(rebaseEntry => rebaseEntry.branch === currentBranch)
  if (!rebaseEntry) {
    throw new Error(`Unrecognized branch: ${currentBranch}`)
  }
  startIndex = rebaseEntries.indexOf(rebaseEntry)
}

function execMustSucceed(command) {
  const result = shell.exec(command)
  if (result.code !== 0) {
    throw new Error(`Command '${command}' failed`)
  }
}

for (const { branch, rebaseTarget } of rebaseEntries.slice(startIndex)) {
  execMustSucceed(`git co ${branch}`)
  execMustSucceed(`git fetch`)
  execMustSucceed(`git status`)
  execMustSucceed(`git rebase --onto ${rebaseTarget} ${rebaseTarget}`)
  execMustSucceed(`git status`)
}
