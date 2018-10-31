#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
IFS=$'\t\n'

for ref in $(git branch -r); do
  if ! [[ "$ref" =~ (kvs-.*) ]]; then
    continue
  fi

  branch="${BASH_REMATCH[1]}"

  echo "$branch"
done
