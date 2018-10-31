#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
IFS=$'\t\n'

function main() {
  last_branch='setup'

  for branch in $(scripts/branches); do
    git switch -q "$branch"
    echo "$branch"
    eval "$*"
    echo
    # shellcheck disable=2034
    last_branch="$branch"
  done
}

main "$@"
