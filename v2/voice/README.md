# Your own voice in Little Star Witch

The game can read every word and sentence aloud. Out of the box it uses the
computer's voice, which can sound robotic. If you record your own voice, the
game plays your recording instead, and only uses the computer's voice for
anything you haven't recorded yet.

In **For grown-ups** you can choose:

- **Read aloud** – your recordings, and the computer's voice for the rest
- **Only my recordings** – your recordings, and quiet for the rest
- **Off — my child reads** – nothing is read aloud

(Children can also tap the 🗣️ button to turn reading aloud off and on.)

## The easy way: the Voice studio

Open **For grown-ups → Record your own voice** in the game (or open `record.html`
in the `v2` folder) and record straight into the browser. It shows each word
and sentence in turn, trims the silence for you, saves every clip as you go
and uses it in the game on that device at once. You can download all your
recordings as a `.zip` and unzip it into this folder to share them with every device.

For recordings meant to be shared to every device, record in Safari
(iPhone, iPad or Mac) or any browser that offers `audio/mp4`: those files play
everywhere, whereas `.webm` clips may not play on older iPhones and iPads.

The rest of this page is the manual way, if you would rather record with your
own tools.

## What to record

Open `RECORDING-LIST.md` in this folder. It lists every word and sentence the
game says, with the file name each one needs. You don't have to do them all –
start with the words from the first place and add more whenever you like.

## Tips

- Use a quiet room, and hold the phone or microphone a hand's width from your mouth.
- Speak warmly and a little slowly, like reading a bedtime story.
- One file per word or sentence. Leave a tiny pause at the start and end;
  you can trim the silence afterwards.
- Say a word on its own ("ship"), without a sentence around it.
- Keep each file short. Sentences are a few seconds, words about a second.

## File format and names

mp3, m4a, ogg, wav or webm all work. Phone voice-memo apps usually make m4a,
which is fine.

The file name is the text in lower case, with everything that isn't a letter or
number turned into a dash, plus the extension:

| The game says | File name |
| --- | --- |
| ship | `ship.mp3` |
| Time to brew! | `time-to-brew.mp3` |

Very long sentences get a short code on the end – `RECORDING-LIST.md` always
shows the exact name, so copy it from there.

## Where to put the files

- single words: `v2/voice/words/`
- sentences and story lines: `v2/voice/lines/`

(The game finds files by name, so a different sub-folder under `v2/voice/` works too.)

## Then, once

Run this in the project folder so the game learns about the new files:

```
node v2/voice/build-manifest.js
```

It needs Node.js but nothing else. It also refreshes `RECORDING-LIST.md`, ticking
off what you've recorded so far. Reload the game and it will use your clips.
