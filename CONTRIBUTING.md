# How to contribute

Every good will is welcome.

To see how you can help, check :

- [Documentation](http://docs.karaokes.moe)
- [Create an issue or try to resolve one!](https://lab.shelter.moe/karaokemugen/karaokemugen-app/issues)
- [Come to our Discord!](https://karaokes.moe/discord)

## Branches

When trying to work on a new feature or issue, remember there are two main branches to base your new branch/work off :

- `master` should be used when fixing bugs in the currently running version of Karaoke Mugen. Your fix will be included in the next "bugfix" release.
- `next` should be used when adding new features or fixing non-urgent bugs.

`master` is regularly merged within `next` when we make bugfixes on it. `next` is merged back on `master` only when doing major release versions.

So if you want to work  on a new feature for example, create a branch from `next`.

## Coding

Please respect coding conventions already in place as much as possible.

- Use of async/await instead of promises and callbacks
- Use `for` loops instead of `.forEach` unless your forEach is not using async functions or is a oneliner
- Use TypeScript
- Use import module syntax, not the require one
- Before adding a dependency, ask on Discord if it should really be added. Who knows, someone might have an idea on how to avoid using it, or a better alternative.
