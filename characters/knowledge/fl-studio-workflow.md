# FL Studio Workflow — Lucy's Production Knowledge

## Core Architecture

FL Studio works fundamentally differently from Ableton or Logic. Understanding the architecture prevents hours of confusion.

**The three main windows:**
1. **Channel Rack**: where instruments live. Each channel = one instrument or sample. The step sequencer and piano roll feed into channels.
2. **Playlist**: arranges audio clips, pattern clips, and automation clips in time. This is the song's timeline.
3. **Mixer**: separate from the channel rack. Channels route to mixer tracks via the "Send to mixer" assignment on each channel.

**Critical distinction:** channels ≠ mixer tracks. A channel rack has a drum synth. That drum synth needs to be routed to a specific mixer track if you want individual EQ/compression. Otherwise everything routes to the Master by default. Many beginners never set this up and wonder why they can't process instruments individually.

## Pattern-Based Workflow

FL Studio is pattern-based. A pattern is a container for MIDI notes (from the piano roll) or step sequences. Multiple patterns for the same channel can exist.

**The Pattern clip**: in the Playlist, dragging a pattern block places that pattern at that point in time. The same pattern can be placed multiple times (it's a reference, not a copy). Editing the pattern edits all instances.

**Pattern vs Audio clip**: patterns contain MIDI data and play through live instruments. Audio clips are recorded/rendered audio. You can freeze a channel to convert its MIDI output to an audio clip for CPU savings.

**Building a song structure:**
1. Create a drum pattern in the channel rack
2. Drag it into the Playlist at bar 1
3. Build a second drum pattern (variation) — drag it in at bar 9
4. Build a bass pattern, chord pattern, lead pattern separately
5. Arrange all of them in the Playlist for verse/chorus/bridge

---

## Mixer Architecture and Routing

The FL Studio mixer is a professional mixing console with a quirk: routing is directional and explicit.

**Inserting effects:** each mixer track has 10 effect slots. Effects run in series, top to bottom.

**Sends and returns (parallel processing):**
To set up a reverb send:
1. Create a mixer track, call it "REVERB BUS"
2. On each track you want reverb on: click the send knob to the REVERB BUS track (a green arrow appears)
3. Put your reverb on the REVERB BUS track with 100% wet signal
4. The send amount from each track controls how much of that track goes to reverb

**Sidechain compression:**
To sidechain the bass to the kick:
1. Route kick to a mixer track (e.g., Track 2)
2. Route bass to another mixer track (e.g., Track 3)
3. On Track 2, enable "Send" to Track 3 — but set the level to 0dB and check "Sidechain"
4. On Track 3, add a compressor and set the sidechain input to Track 2
FL's native Parametric EQ 2 or Fruity Peak Controller are often used for this — but third-party compressors with sidechain input (FabFilter Pro-C2, etc.) work straightforwardly.

**Master chain:**
The Master track receives all other tracks. Standard master chain: EQ → multiband compression → limiter. Avoid heavy processing on the master during mixing — use it for gentle glue compression and a limiter for level control.

---

## Piano Roll Deep Cuts

FL's piano roll is one of the strongest in any DAW. Features often missed:

**Velocity painting**: press Shift+V in the piano roll to show velocity bars. Paint velocity in real-time by holding Alt and dragging.

**Scale highlighting**: press Shift+S to highlight a scale. Notes outside the scale are grayed out — makes melodic work faster.

**Strum tool**: Select multiple notes vertically (chord). Right-click → select "Strum" → staggers the note start times by a small amount. Instant humanization of chord hits.

**Ghost notes**: in the piano roll, click View → "Show ghost channels" to see notes from other channels transparently behind your current channel. Essential for writing basslines that lock to chords.

**Glide/portamento**: add a "SLIDE" note — a note with a distinctive green color that tells the instrument to glide from the previous pitch to the slide note's pitch. This is FL's implementation of portamento; most FL-native instruments support it.

**Chord stamp**: press Ctrl+Shift+C to open chord templates. Stamp full chords with a single click in the piano roll. Invertable, with root note selection.

---

## Automation Clips

One of FL's most powerful features and one of the most commonly underused.

**Creating automation:** right-click any knob or fader and select "Create automation clip." This creates an automation clip in the Playlist that controls that parameter.

**Automation clip shapes:**
- Click on the clip to edit it
- Points are placed by left-clicking on the clip's content
- The tension of each curve segment can be adjusted (right-click point → Set tension)
- Shapes range from step (immediate jump) to smooth exponential curves

**LFO automation:** right-click any knob → "Link to controller" → select "Peak Controller" → this creates an LFO that modulates the parameter. More flexible than automation clips for periodic motion.

**Automation templates (patterns):**
An automation clip is itself a pattern — it can be placed multiple times in the Playlist, like any other pattern. Create a filter sweep automation clip once, then drop it at every chorus. Change the automation clip once and every instance updates.

---

## Plugin Management and Performance

**Buffer size and latency:**
Low buffer (64 or 128 samples) = low latency for live playing, but higher CPU load and potential crackles. High buffer (512 or 1024) = more CPU headroom, acceptable for mixing/recording. During mixdown/export FL renders in high-buffer mode regardless.

**CPU optimization:**
- Use "Smart disable" in plugin settings (right-click a plugin slot) — the plugin is bypassed when the channel is silent, freeing CPU cycles.
- Freeze heavy channels: right-click a mixer track → "Freeze" → converts it to an audio clip. Unfreeze to re-edit.
- Render heavy arrangement sections to audio clips.

**VST3 path:**
Default: `C:\Program Files\Common Files\VST3`
FL Studio plugin manager: Options → Manage Plugins → File Settings. Add paths here. After adding a path, click "Find Plugins."

**VoidSynth in FL:**
VoidSynth loads as a Generator plugin (instrument). Insert into a channel rack slot: left-click an empty channel → "More plugins" → search "VoidSynth." The granular engine uses significant CPU at high grain density — use "Smart Disable" to save cycles when the channel is silent.

---

## Mixdown and Export

**Export settings:**
File → Export → WAV. For final deliverable: 32-bit float (preserves headroom), 44100 or 48000Hz depending on the target (streaming = 44.1kHz, video = 48kHz).

**Stem export:**
Mute all tracks except one, export. Repeat for each track. Or use the "Track stems" option in the export dialog (available in Producer Edition+). This exports each mixer track as an individual file.

**Pre-render checklist:**
1. Set the song end point correctly (hold Shift and drag the end marker)
2. Check Master is not clipping (the red clip indicator on Master track)
3. Verify export range is correct
4. Disable any MIDI controllers that might send stray notes during export

---

## FL Studio and VoidVendor Plugins

**VoidSynth FL-specific notes:**
- Works best as a Generator (instrument), not an Effect
- The granular engine's position parameter responds to MIDI CC — map it to a knob/pad for live control
- High resonance on VoidSynth's filter will self-oscillate — this produces a sine wave at the cutoff frequency. Useful as an additional oscillator layer.
- The saturation stage after the amp: at 0% it's still slightly active. At 100% it's designed to clip. Run it past 100% using the mixer track gain for extreme distortion.

**RUST_GARDEN FL-specific notes:**
- RUST_GARDEN is a drum synthesizer — each patch is a drum hit. Load each hit into a separate channel in the channel rack, use the step sequencer for rhythmic programming.
- The step sequencer's pitch lane: right-click the pattern, click "Pitch" at the top of the step area to show pitch per step. This lets RUST_GARDEN hits move in pitch across a pattern — useful for pitched percussion sequences.
- Layering: stack IRON_BLOOM_KICK with VOID_CLAP_7 on adjacent channels, offset the clap by one step for a layered percussive hit.
