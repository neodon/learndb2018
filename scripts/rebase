#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
IFS=$'\t\n'

git rebase --rerere-autoupdate -X ours "$@"
