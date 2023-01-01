#!/bin/bash

wget --silent -N https://mugen.karaokes.moe/downloads/$DIST_LINUX_X64
DIST_X64_SHA=$(sha256sum "$DIST_LINUX_X64" | awk -F\  {'print $1'})

wget --silent -N https://mugen.karaokes.moe/downloads/$DIST_LINUX_ARM64
DIST_ARM64_SHA=$(sha256sum "$DIST_LINUX_ARM64" | awk -F\  {'print $1'})

SENTRYCLI_VERSION=$(grep @sentry/cli\": package.json | awk -F\" {'print $4'} | sed -e 's/\^//g')

wget --silent -N https://downloads.sentry-cdn.com/sentry-cli/$SENTRYCLI_VERSION/sentry-cli-Linux-x86_64

wget --silent -N https://downloads.sentry-cdn.com/sentry-cli/$SENTRYCLI_VERSION/sentry-cli-Linux-aarch64

SENTRYCLI_X64_SHA=$(sha256sum sentry-cli-Linux-x86_64 | awk -F\  {'print $1'})

SENTRYCLI_ARM64_SHA=$(sha256sum sentry-cli-Linux-aarch64 | awk -F\  {'print $1'})

node util/updateFlatpak.cjs "$DIST_LINUX_X64" "$DIST_X64_SHA" "$DIST_LINUX_ARM64" "$DIST_ARM64_SHA" "$SENTRYCLI_VERSION" "$SENTRYCLI_X64_SHA" "$SENTRYCLI_ARM64_SHA"
