#!/bin/bash
# Check if a script name is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <script-name>"
  echo "Example: $0 template.script.ts"
  exit 1
fi
# Assign the provided script name to a variable
SCRIPT_NAME="$1"
# Run the ts-node command with the provided script name
node --max-old-space-size=16384 -r ts-node/register -r tsconfig-paths/register src/scripts/$SCRIPT_NAME.script.ts
# ts-node -r tsconfig-paths/register src/scripts/$SCRIPT_NAME.script.ts