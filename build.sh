#!/bin/sh

cd `dirname $0`

buildReact() {
  cd client
  yarn build
  cd ..
}

startReact() {
  cd client
  yarn start
  cd ..
}

buildNode() {
  yarn build
}

startNode() {
  yarn start
}

debugNode() {
  yarn debug
}

package() {
  pkg .
}

case "$1" in
  react)
    buildReact
    ;;
  node)
    buildNode
    ;;
  start)
    buildReact
    startNode
  	;;
  debug)
    buildReact
    debugNode
    ;;
  pkg)
    buildReact
    buildNode
    package
    ;;
  *)
    # By default, build complete app, but without native packaging.
    buildReact
    buildNode
  ;;
esac
