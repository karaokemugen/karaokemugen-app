# How to contribute

Every good will is welcome.

To see how you can help, check :

-   [Documentation](https://docs.karaokes.moe)
-   [Create an issue or try to resolve one!](https://gitlab.com/karaokemugen/code/karaokemugen-app/issues)
-   [Come to our Discord!](https://karaokes.moe/discord)
-   [Post a message on our forum](https://discourse.karaokes.moe)

Please read the following before contributing :

## Branches

When trying to work on a new feature or issue, remember there are two main branches to base your new branch/work off :

-   `next` should be used when adding new features or fixing non-urgent bugs.
-   `master` should be used when fixing bugs in the currently running version of Karaoke Mugen. Your fix will be included in the next "bugfix" release.

As a rule of thumb, all merge requests should be made against `next`, except if your fix only applies to `master`. This can happen when `next` and `master` have a different major version number and the fix doesn't apply on `next` for some reason.

So if you want to work on a new feature for example, create a branch or merge request from `next`.

## Coding

Please respect coding conventions already in place as much as possible.

-   Use of async/await instead of .then/.catch and callbacks
-   Use `for..of` loops instead of `.forEach` unless :
    -   Your `.forEach` is not using async functions
    -   You're writing a oneliner function
    -   You need to work on index instead of the array contents themselves. `for..in` is not safe to use. See [this ESLint rule](https://eslint.org/docs/latest/rules/guard-for-in) for details on hwo to use `for..in` if you need to (like if you're using async/await in the loop).
-   Use TypeScript
-   Use ES Modules syntax
-   Before adding a dependancy, ask on Discord if it should really be added. Who knows, someone might have an idea on how to avoid using it, or a better alternative.

## Workflow

### Issues approval

If an issue needs to be fixed, a milestone will be added to it by a maintainer. At this point anyone can take the issue and work on it.

If an issue is closed but has not been fixed and could be reopened, please add a comment to it and wait for a maintainer to reopen it.

### Working on an issue

Use the `Create merge request` button on the issue page.

### Merging

Once your work is ready, mark the MR as "Ready" and add a comment to tell maintainers this is ready to merge.

Maintainers will usually merge by squashing the commits inside the branch unless explicitely stated otherwise.

## Getting started on development

To start things off, you'll need the right tools. This guide is meant for Windows but this won't change things much if you're using Linux or macOS.

We're listing specific tools, but remember you can also choose your own preferred tools, like for example replacing Fork by Gitkraken (but who would do that.) or git bash by the WSL.

### Install git

-   Get [git](https://git-scm.com/)
-   [gitAhead](https://gitahead.com/) is a good multi-platform git GUI
-   [Fork](https://git-fork.com/) is also a good graphical client for git, but it's not free (as in free beer)

Generally, git bash (bundled with git for Windows) is a good terminal. You can also use Windows Terminal or Tabby on Windows. Other OSes have proper terminals already installed.

### Install Visual Studio Code

-   [Install Visual Studio Code](https://code.visualstudio.com/)

You can use some of these extensions :

-   **ES Lint** (mandatory since it'll show you all the little problems your code as like indentation or the semi-colons to end lines. It'll basically simplify your life immensely.)
-   gitignore
-   GitLens (to easily see commits or who wrote that line of code from VSCode)
-   Gitmoji
-   npm intellisense (auto-completion of modules in imports)
-   SQL Beautify
-   vscode-icons
-   YAML

### Install and prepare PostgreSQL

[The EnterpriseDB Installer](https://www.postgresql.org/download/) will work nicely since it installs PostgreSQL as a service under Windows and an .app on macOS and is bundled with pgAdmin to manage the database.

Once installed, you'll need to create a superadmin user. Launch this command from the `bin` folder inside the PostgreSQL folder (`C:\Program Files\PostgreSQL\13\bin` by default on Windows).

```
createuser -h localhost -P -s postgres
```

If it says the role already exists, that's good. If not enter a password of your choice.

Connect to it via the postgres user with :

```
psql -U postgres
```

It'll either ask for the password we defined above, or it won't ask anything if the user existed already.

Let's create our database user for KM App. Refer to [this section in the README](README.md#database-setup)

### Install NodeJS

[Install NodeJS from its website](https://nodejs.org/)

You should download the latest LTS version. The latest should normally work unless specified otherwise.

### Install Yarn

[Yarn is a launcher and package manager like npm. Install it.](http://yarnpkg.com)

### Clone the Karaoke Mugen repository

Create a folder, for example `C:\dev` under Windows or `~/dev` on macOS.

You _should_ create a fork of Karaoke Mugen App before continuing. The clone URL below refers to our own repository but you should replace it with your own forked version.

Open your favorite terminal and go to that folder and type :

```
git clone --recurse-submodules https://gitlab.com/karaokemugen/code/karaokemugen-app.git
```

You can also clone via SSH if you prefer. Make sure you have a SSH key and add it to your profile on Gitlab.

Then go to the `karaokemugen-app` folder it created.

#### Configuring git

To make your life easier, we preconfigured git for you. To enable this, launch :

```
yarn gitconfig
```

This will enable a few options :

-   Display sub-modules diff
-   Make sure pull/fetch/status and push browse through sub-modules recursively.

If you're not using SSH, you'll need a token when pushing. You can generate this token from your Settings page on Gitlab in the "Access Token" section.

Also `yarn pull` will do a `git pull` and sync submodules for you.

### Install and configure the app

Everything's automatic, you just need to type

```
yarn setup
```

`setup` is actually a command which does a few things :

-   It installs all dependencies for all the parts from the app
-   It transpiles the Typescript/React code into javascript.

Depending on what you modify, use the right commands in the right folder.

-   The backend is built every time you use `yarn start`
-   You can build the backend manually with `yarn build`
-   You can install frontend dependencies with `yarn installkmfrontend`
-   You can build the frontend manually with `yarm buildkmfrontend`

`yarn setup` does all these for you but it can take a while on some machines.

Check `package.json` for a list of script commands you can use.

### Install binary dependencies

Check out [README's required binaries section](README.md#required-binaries) to download them manually (except for postgres since you installed it already earlier)

You can also download one of the "dist" archives we make in [Karaoke Mugen's website's download folder](https://mugen.karaokes.moe/downloads). Pick one for your OS and KM version and untar it in your current folder.

### Configure KM

Create a `config.yml` file in `app` with the following contents :

```YAML
Online:
  Stats: false
  ErrorTracking: false
System:
  Database:
    bundledPostgresBinary: false
    database: karaokemugen_app
    host: localhost
    password: musubi
    port: 5432
    username: karaokemugen_app
```

Stats won't be sent out so not to flood KM with your own tests.

### Launch

_Gundam music plays_

Once everything's ready, launch via

```
yarn start
```

`start` will transpile KM from Typescript to Javascript. It can take a few seconds to do that, but the launched app will always be up to date with your code.

You can also launch from the VS Code's debugger, as we provide a `launch.json` in the `.vscode` folder.

### Other

#### KM's project structure

KM is divided into two parts :

-   A React Frontend :
    -   `kmfrontend` is the mobile and PC interface dedicated to managing your Karaoke session, for you or y our guests.
-   A NodeJS backend in `src`.

For those two parts, we use Typescript to manage type definitions within the app.

There's also a `migrations` folder containing all SQL migrations used to manage the database structure and its updates.

##### The Karaoke Mugen Library

KM also uses a functions library shared with KM Server and subtly called KM Lib. This library can be found in `src/lib` and is a git submodule.

A submodule allows us to version the library and make branches. In other words, get reusable code.

The lib is automatically updated with a `pull` from the KM App, but if you touch any code in it, you'll need to `commit` and `push` inside the `src/lib` folder before adding it to the KM App's `commit`.

The lib contains varions functions, refer to the `README.md` inside for details.

##### Backend structure

Here's a small tour of the backend :

-   Everything starts in `index.ts`, you just need to follow the `main()` function.
-   The `components` folder has the main KM modules, like its engine, the frontend initialization and mpv, it's video player.
-   The `electron` folder contains all the code for the Electron app and its graphical user interface and desktop integration.
-   The `services` folder has all the app and logic code. Handling playlists, songs, and player engine, and all KM sub-systems. Services expose functions to `controllers` and get their data from `dao`
-   The `controllers` folder contains all API routes used by the KM frontend. These routes call `services`.
-   The `dao` folder contains all functions getting data in and out of Karaoke Mugen's database or files.
-   The `types` folder has all object definitions we use in Karaoke Mugen's code for Typescript.
-   The `utils` folder is filled with a lot of utility functions used at some points in the code, like managing configuration, state, constants, downloader tool, etc.

#### Versions

Version numbering follows the classic semver : major.minor.sub-version

-   2.1.0 is a minor version from the 2.x codebase.
-   2.2.1 is a patch version of 2.2.
-   3.0.0 is a whole new major version

Besides, every version has a code name. Major versions are usually a female character from japanse animation, and every minor version has an adjective starting with the same letter. Examples :

-   Akari Amoureuse
-   Belldandy Bolchévique
-   Chitoge Chatoyante
-   Darkness Délirante
-   Emilia Eblouissante
-   Finé Fantastique
-   etc.

We try to find a player background for each version.

#### Git structure

There are two branches :

-   `master` is the stable branch. We usually put fixes there. It's the most stable version before we make a release. We merge `next` on it before major releases.
-   `next` is the dev branch. That's where we develop new things. When we work on an issue, gitlab creates a merge request and branch for us that we merge onto `next` when it's done.

#### Create a new migration

We use the postgrator tool. If it's not correctly installed by yarn :

```sh
npm install -g postgrator
```

You can launch it like this to run migrations without launching KM :

```sh
yarn postgrator
```

To create a migration, you need to create two SQL files in `migrations` which have the same name with `do` and `undo` version of the files. Look at the other files provided already. We usually skip the `undo` files because of laziness and because we never go back on a migration anyway.
