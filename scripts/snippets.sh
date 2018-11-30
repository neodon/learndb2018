#!/bin/sh
# Don't run this script directly.  Instead, copy and paste the snippets into your terminal.
# Otherwise you'll have problems if this file changes while it's running.

sh -c '
  git co master
  for branch in $(git branch | cut -d" " -f3); do
    git co $branch 2>&1 >/dev/null
    echo Resetting $branch to origin/$branch
    git reset --hard origin/$branch
    git status
  done
'

sh -c '
  git co master
  git push --force-with-lease
  for branch in $(git branch | cut -d" " -f3); do
    git co $branch
    echo Force pushing $branch to origin/$branch
    git push --force-with-lease
    git status
  done
'
