## v5.0.x - Poppy Partagée

5.0 introduces a brand new public interface, making it easier to add songs and browse the library.

### New features

#### New public interface (#804, #739, #551)

- The current song lyrics is available on the home page
  - The current line is highlighted in yellow<br/>
  ![Lyrics Box](https://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/f27fac0dc7cea1d728a9ff68c9385506/Peek_11-11-2020_21-54.gif)
- The top progress bar has been replaced by a new bottom bar<br/>
![Bottom bar](https://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/175acebc1b176e7902930e45f946dc7a/image.png)
- Homepage is now featuring a "now playing" box<br/>
![Player Box](https://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/8cc3b9e6d90d1bb9c6b2b16468c2962f/Capture_d_écran_2020-11-11_à_22.00.58.png)
- You can now explore tags by category<br/>
![Tags List](https://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/e9696536c20526808ada84b13520c085/Capture_d_écran_2020-11-11_à_21.57.50.png)

### Breaking changes

- API is now **using a socket.io** interface, however `POST /api/command` with `{cmd: 'GetKaras', body: {body: {from: 0, size: 400}}}`
can be used to send commands without establishing a socket.io command (#666).
  - This new API will be documented later, we lack workforce to do so.
- database.json config file is now merged with config.yml in `System.Database` object, see config sample (#746)

### Improvements

- Users now receives notification when they can add songs again (when their quota became > 0, #764).
- Upgrade from 3.2 works again (#798)
- When users upvotes a song, it cannot be deleted by the original requester (#803)
- Thumbnails are generated for each karaoke by now (for the public interface, #800)

### Fixes

- Editing a kara repository was creating errors (#780)
  - Copying a karaoke to a new repo updates correctly the database (#778)
- In French, "Genres" are now "Thèmes" (#802)
- The "next" button was greyed out if you added a song when the last song was playing (#806)
- Karaokes with missing tags are now not included in generation (#797)
- In karaoke creation form, hitting "Enter" in a tag input is no longer writing a karaoke into database (#789)
- Karaoke tags are always in the same order now (#786)

### Notes, misc

- Upgraded to Typescript 4.0 (#784)
- Karaoke Mugen 5.0 isn't generating Karaoke Mugen <3.x series files (#738)
- appPath detection has been reworked (#747)
- CLI toolset is now commander (#748)
- Bootstrap dependency was deleted (#739)
