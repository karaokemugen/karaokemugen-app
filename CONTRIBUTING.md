# How to contribute

Every good will is welcome.

To see how you can help, check :

-   [Documentation](https://docs.karaokes.moe)
-   [Create an issue or try to resolve one!](https://gitlab.com/karaokemugen/karaokemugen-app/issues)
-   [Come to our Discord!](https://karaokes.moe/discord)
-   [Post a message on our forum](https://discourse.karaokes.moe)

Please read the following before contributing :

## Branches

When trying to work on a new feature or issue, remember there are two main branches to base your new branch/work off :

-   `master` should be used when fixing bugs in the currently running version of Karaoke Mugen. Your fix will be included in the next "bugfix" release.
-   `next` should be used when adding new features or fixing non-urgent bugs.

Bugfixes should happen on `next` first, unless it only affects `master` versions. `master` is regularly merged within `next` when we make bugfixes on it. `next` is merged back on `master` only when doing major release versions.

So if you want to work on a new feature for example, create a branch or merge request from `next`.

## Coding

Please respect coding conventions already in place as much as possible.

-   Use of async/await instead of .then/.catch and callbacks
-   Use `for..of` loops instead of `.forEach` unless :
    -   Your `.forEach` is not using async functions
    -   You're writing a oneliner function
    -   You need to work on index instead of the array contents themselves
-   Use TypeScript
-   Use ES Modules syntax.
-   Before adding a dependancy, ask on Discord if it should really be added. Who knows, someone might have an idea on how to avoid using it, or a better alternative.

## Workflow

### Issues approval

If an issue needs to be fixed, a milestone will be added to it by a maintainer. At this point anyone can take the issue and work on it.

If an issue is closed but has not been fixed and could be reopened, please add a comment to it and wait for a maintainer to reopen it.

### Working on an issue

Use the `Create merge request` button on the issue page.

### Merging

Once your work is ready, mark the MR as "Ready" and add a comment to tell maintainers this is ready to merge. (or tell us on Discord)

Maintainers will usually merge by squashing the commits inside the branch unless explicitely stated otherwise.
