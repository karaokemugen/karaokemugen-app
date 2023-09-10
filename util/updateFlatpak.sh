#!/bin/bash

SENTRYCLI_VERSION=$(grep @sentry/cli\": package.json | awk -F\" {'print $4'} | sed -e 's/\^//g')

wget --quiet -N https://downloads.sentry-cdn.com/sentry-cli/$SENTRYCLI_VERSION/sentry-cli-Linux-x86_64

wget --quiet -N https://downloads.sentry-cdn.com/sentry-cli/$SENTRYCLI_VERSION/sentry-cli-Linux-aarch64

SENTRYCLI_X64_SHA=$(sha256sum sentry-cli-Linux-x86_64 | awk -F\  {'print $1'})

SENTRYCLI_ARM64_SHA=$(sha256sum sentry-cli-Linux-aarch64 | awk -F\  {'print $1'})

node util/updateFlatpak.cjs "$SENTRYCLI_VERSION" "$SENTRYCLI_X64_SHA" "$SENTRYCLI_ARM64_SHA"
