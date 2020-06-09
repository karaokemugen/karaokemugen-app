source util/electronBuilderGetVersion.sh

yarn electron-builder $1 --publish always -c.extraMetadata.version=$BUILDVERSION