#!/bin/bash

SENTRYCLI_VERSION=$(grep @sentry/cli\": package.json | awk -F\" {'print $4'} | sed -e 's/\^//g')

wget --quiet -N https://downloads.sentry-cdn.com/sentry-cli/$SENTRYCLI_VERSION/sentry-cli-Linux-x86_64

wget --quiet -N https://downloads.sentry-cdn.com/sentry-cli/$SENTRYCLI_VERSION/sentry-cli-Linux-aarch64

SENTRYCLI_X64_SHA=$(sha256sum sentry-cli-Linux-x86_64 | awk -F\  {'print $1'})

SENTRYCLI_ARM64_SHA=$(sha256sum sentry-cli-Linux-aarch64 | awk -F\  {'print $1'})

###

SHARP_VERSION=$(grep version\": node_modules/sharp/package.json | awk -F\" {'print $4'} | sed -e 's/\^//g')

wget --quiet -N https://github.com/lovell/sharp/releases/download/v$SHARP_VERSION/sharp-v$SHARP_VERSION-napi-v7-linux-x64.tar.gz

SHARP_SHA=$(sha256sum sharp-v$SHARP_VERSION-napi-v7-linux-x64.tar.gz | awk -F\  {'print $1'})

LIBVIPS_VERSION=$(grep libvips\": node_modules/sharp/package.json | awk -F\" {'print $4'} | sed -e 's/\^//g')

wget --quiet -N https://github.com/lovell/sharp-libvips/releases/download/v$LIBVIPS_VERSION/libvips-$LIBVIPS_VERSION-linux-x64.tar.br

LIBVIPS_SHA=$(sha256sum libvips-$LIBVIPS_VERSION-linux-x64.tar.br | awk -F\  {'print $1'})

node util/updateFlatpak.cjs "$SENTRYCLI_VERSION" "$SENTRYCLI_X64_SHA" "$SENTRYCLI_ARM64_SHA" "$SHARP_VERSION" "$SHARP_SHA" "$LIBVIPS_VERSION" "$LIBVIPS_SHA"
