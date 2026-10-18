<h1 align="center">git-tarab <span lang="ar">طَرَب</span></h1>

<p align="center"><b>Hear your git history as Arabic maqam music.</b><br>
Every commit is a note. Every author plays an instrument. Your repo gets its own maqam, and a reason why.</p>

<p align="center">
  <a href="https://mo7ammd88.github.io/git-tarab/demos/expressjs-express.html"><img src="https://mo7ammd88.github.io/git-tarab/posters/expressjs-express.svg" width="31%" alt="expressjs/express in maqam Kurd"></a>
  <a href="https://mo7ammd88.github.io/git-tarab/demos/junegunn-fzf.html"><img src="https://mo7ammd88.github.io/git-tarab/posters/junegunn-fzf.svg" width="31%" alt="junegunn/fzf in maqam Hijaz"></a>
  <a href="https://mo7ammd88.github.io/git-tarab/demos/antirez-linenoise.html"><img src="https://mo7ammd88.github.io/git-tarab/posters/antirez-linenoise.svg" width="31%" alt="antirez/linenoise in maqam Rast"></a>
</p>

<p align="center"><a href="https://mo7ammd88.github.io/git-tarab/"><b>▶ Listen to the gallery</b></a> · <a href="README.ar.md">بالعربية</a></p>

```sh
cd your-repo
npx github:mo7ammd88/git-tarab --open
```

No install, no dependencies, no account. It reads `git log`, composes a piece, and writes one HTML file you open in a browser and press play.

## What famous repos sound like

| Repo | Maqam | Because |
|---|---|---|
| [expressjs/express](https://mo7ammd88.github.io/git-tarab/demos/expressjs-express.html) | Kurd كرد, introspection | it deletes 80% as many lines as it adds |
| [junegunn/fzf](https://mo7ammd88.github.io/git-tarab/demos/junegunn-fzf.html) | Hijaz حجاز, longing and distance | 25% of commits landed between midnight and 5 a.m. |
| [antirez/linenoise](https://mo7ammd88.github.io/git-tarab/demos/antirez-linenoise.html) | Rast راست, pride and foundation | one person wrote 87% of it |
| [antirez/kilo](https://mo7ammd88.github.io/git-tarab/demos/antirez-kilo.html) | Saba صبا, sorrow | 31% of commits are fixes |
| [stevemao/left-pad](https://mo7ammd88.github.io/git-tarab/demos/stevemao-left-pad.html) | Bayati بياتي, earthy joy | it is steady: 11% fixes, 18 authors |
| [kelseyhightower/nocode](https://mo7ammd88.github.io/git-tarab/demos/kelseyhightower-nocode.html) | Sikah سيكاه, delicacy | only 4 commits so far. Sikah never quite lands either |

What does yours say about you?

## How your history becomes music

| In your repo | In the music |
|---|---|
| a commit | one note |
| its author | the instrument: the top four contributors get the **oud**, **qanun**, **ney** and **kamanja**; everyone else joins the oud |
| lines added / removed | the melody steps up / down |
| a big commit | a longer note with an ornament (*zakhrafa*) |
| a quiet stretch | a rest |
| a fix | the rim of the darbuka (*tak*) |
| a merge | the centre of the darbuka (*doum*) |
| a revert | a shake of the riq, and the melody takes back its last step |
| your first commits | a free-rhythm opening on the oud (*taqsim*) |
| the last commit | a cadence home to the tonic (*qafla*) |
| how busy the repo is | the tempo |

Phrases come home to the tonic or the *ghammaz* every eight notes, the way a maqam melody does. Then a rhythm cycle (*iqa'*) carries the rest: Maqsum by default, or Baladi, Sa'idi, Malfuf and Wahda.

While it plays, the commit messages scroll by as lyrics, and every note is drawn sixteen times around a *khatam*, the eight-pointed star of Islamic tiling. When the piece ends you have a rosette that no other repo can make.

### Real quarter tones

Arabic music lives between the piano keys. Bayati's second note sits 150 cents above the tonic, Rast's third at 350. git-tarab synthesizes those pitches exactly with the Web Audio API (the oud and qanun are Karplus-Strong plucked strings), and keeps them in the MIDI export with per-note pitch bend, so your DAW hears them too.

## Which maqam is yours

The first rule that matches wins.

| Maqam | Mood | When |
|---|---|---|
| Sikah سيكاه | delicacy, devotion | fewer than 12 commits |
| Saba صبا | sorrow | 30% or more of commits are fixes |
| Hijaz حجاز | longing, distance | 20% or more commits between midnight and 5 a.m. (author's local time) |
| Kurd كرد | introspection | 50+ commits and it deletes at least 75% as much as it adds |
| Nahawand نهاوند | tenderness | 35% or more commits on weekends |
| Rast راست | pride, foundation | one person wrote 75% or more |
| Bayati بياتي | earthy joy | six or more regular contributors |
| Ajam عجم | brightness, triumph | it grows 3× faster than it shrinks, with few fixes |
| Bayati بياتي | earthy joy | none of the above |

Bayati is the fallback on purpose: it is the most common maqam in Arabic music, too. You can switch maqam, rhythm and tempo in the player and hear the same history performed differently.

## Options

```
npx github:mo7ammd88/git-tarab [repo-path] [options]

  -o, --out <file>      where to write the player   (default: tarab.html)
  -m, --maqam <name>    rast, bayati, hijaz, saba, kurd, nahawand, ajam, sikah
  -i, --iqa <name>      maqsum, baladi, saidi, malfuf, wahda
  -t, --tempo <bpm>     tempo (default: faster for busier repos)
  -n, --limit <n>       max commits to perform, sampled evenly (default: 320)
      --since <date>    only commits after this date, e.g. "1 year ago"
      --midi <file>     also write a .mid file
      --svg <file>      also write the rosette poster as .svg
      --anonymous       replace author names with "Voice 1", "Voice 2", ...
      --json            print the analysis as JSON
      --open            open the player in your browser
```

From the player you can also save the piece as **WAV**, **MIDI**, or a **poster** PNG.

## Put your rosette in your README

```sh
npx github:mo7ammd88/git-tarab --svg tarab.svg --out tarab.html
```

```markdown
![This repo in maqam Hijaz](tarab.svg)
```

GitHub shows `.html` files as source code, so to make the rosette playable, publish `tarab.html` with GitHub Pages and link the image to that page.

## Privacy

Everything runs on your machine. Nothing is uploaded. The HTML file contains short commit hashes, author names, commit times, line counts and commit subjects, because those are the score and the lyrics. It never contains emails, file paths or code. Use `--anonymous` before sharing a private repo's page, and check the subjects you are comfortable showing.

## Notes for musicians

Intervals are 24-tone equal-tempered approximations. Real performers inflect quarter tones differently from maqam to maqam and city to city, and Saba in particular doesn't close at the octave the way it does here. The "moods" are the traditional associations, offered with a smile. Corrections from people who play are very welcome.

## Development

```sh
npm test                 # node's built-in test runner, no dependencies
npm run gallery -- ../express ../fzf   # build the gallery into docs/ from local clones
```

The composer (`src/compose.js`), MIDI writer and poster are plain JavaScript that run unchanged in Node and in the browser, so the player can recompose live when you switch maqam.

Ideas that would be lovely: more maqamat (Huzam, Nawa Athar, Saba Zamzam), more iqa'at (Samai Thaqil, Masmoudi), a modulation when the repo changes hands, and a GitHub Action that keeps `tarab.svg` fresh.

## License

MIT
