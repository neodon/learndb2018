#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
IFS=$'\t\n'

function main() {
  for ref in $(git branch -r); do
    if ! [[ "$ref" =~ (kvs-.*) ]]; then
      continue
    fi

    branch="${BASH_REMATCH[1]}"

    echo "branch=$branch"

    git checkout "$branch"
    mkdir -p ../out/"$branch"
    rsync -a ./ ../out/"$branch"/
  done

  git checkout main
}

main "$@"
