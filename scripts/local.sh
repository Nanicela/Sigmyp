#!/usr/bin/env bash
set -euo pipefail
project_dir=$(cd "$(dirname "$0")/.." && pwd)
workspace_dir=$(cd "$project_dir/../.." && pwd)
runtime_dir="$workspace_dir/work/runtime"
if [ -d "$runtime_dir/node-v22.23.3-linux-x64/bin" ]; then
  export PATH="$runtime_dir/node-v22.23.3-linux-x64/bin:$PATH"
fi
if [ -d "$runtime_dir/jdk-21.0.12.1" ]; then
  export JAVA_HOME="$runtime_dir/jdk-21.0.12.1"
  export PATH="$JAVA_HOME/bin:$PATH"
fi
export FIREBASE_EMULATORS_PATH="$workspace_dir/work/firebase-emulators"
export XDG_CONFIG_HOME="$workspace_dir/work/firebase-config"
export npm_config_cache="$workspace_dir/work/npm-cache"
cd "$project_dir"
case "${1:-cloud}" in
  roles) FIREBASE_WEB_CONFIG=web/firebase-config.roles.json npm run build && ./node_modules/.bin/firebase emulators:start --project demo-facturacion --only auth,firestore,hosting ;;
  start) npm run emulators ;;
  cloud) BUILD_DIR=dist-cloud FIREBASE_WEB_CONFIG=web/firebase-config.json npm run build && python3 scripts/serve-local.py ;;
  login) shift; ./node_modules/.bin/firebase login "$@" ;;
  publish) BUILD_DIR=dist-release FIREBASE_WEB_CONFIG=web/firebase-config.json npm run build && ./node_modules/.bin/firebase deploy --config firebase.release.json --only hosting --project facturacion-electronica-a73e3 ;;
  seed) npm run seed:emulator ;;
  test) npm test && npm run test:firebase ;;
  *) echo 'Uso: bash scripts/local.sh start|cloud|login|publish|seed|test'; exit 1 ;;
esac
