# Synthesis Techniques — Lucy's Technical Knowledge Base

## Subtractive Synthesis

The foundation of almost everything in VoidVendor's sound palette.

**Core signal chain:** oscillator → filter → amplifier, each with envelope/LFO modulation.

**Oscillator shapes and what they do:**
- **Sawtooth**: richest harmonic content, all harmonics present. Ideal for basses, leads, anything that needs presence and edge.
- **Square/pulse**: hollow, woody character. Pulse width modulation (PWM) creates a slowly animating timbre that sounds analog and alive. Great for pads and basses.
- **Triangle**: mostly fundamental, very few harmonics. Warm, flute-like. Good for sub layers and soft lead melodies.
- **Sine**: pure fundamental, no harmonics. Used as FM operators, sub-bass foundations, or pure tone layers.

**The detuning technique:**
Two oscillators slightly detuned against each other (0.1–8 cents) create beating frequencies — amplitude modulation at the difference frequency. This makes the sound breathe. It's why two-oscillator patches feel "alive" where a single oscillator feels flat. The beating rate (Hz = detune amount * fundamental frequency) determines how fast it breathes. Slow beat for warmth, fast beat for chorus-like shimmer.

**Filter types:**
- **Low-pass (LPF)**: cuts highs, passes lows. The workhorse. Cutoff frequency determines brightness. Resonance (Q) boosts at the cutoff point, creating that sharp, ringing peak. At high resonance, the filter self-oscillates — it becomes a sine wave oscillator.
- **High-pass (HPF)**: cuts lows, passes highs. Used in processing chains to remove mud. On a synth, creates thin, aggressive textures.
- **Band-pass (BPF)**: passes a frequency band, cuts above and below. Creates hollow, nasal, telephone-like sounds. Good for parallel processing.
- **Notch/band-reject**: cuts a frequency band. Creates that characteristic swept phaser/formant sound.

**Filter saturation and drive:**
Running a filter hot — pushing signal into it above its nominal range — adds harmonic distortion. Most analog-modeled filters have this characteristic. It's often the difference between a synthesizer sounding clinical versus organic. VoidSynth's filter has a drive parameter for exactly this reason.

**Envelope shapes for synthesis:**
- **Attack**: time to reach full amplitude. Fast = percussive. Slow = swelling, cinematic.
- **Decay**: time to fall from peak to sustain level.
- **Sustain**: level held while key is held. Not a time — a level.
- **Release**: time to fall to silence after key released. Slow release = pad character. Fast = choppy, rhythmic.

**Classic VoidVendor subtractive sounds:**
- *Industrial drone pad*: two detuned saws → LPF 25–40% cutoff, resonance low, slow attack (2–3s), full sustain, slow release → slight bitcrush → saturated reverb.
- *Corroded bass*: square wave, cutoff fully closed, fast attack, envelope amount high (opens filter on attack, decays back) → distortion → low shelf boost at 100Hz.
- *Noise texture*: white noise through narrow band-pass, filter modulated by slow random LFO → reverb with pre-delay.

---

## FM Synthesis

Frequency modulation. An operator (modulator) modulates the frequency of another operator (carrier) at audio rate. This creates sidebands — additional frequencies above and below the carrier.

**The key insight:** the relationship between carrier and modulator frequencies (the ratio) determines harmonic character.
- **Integer ratios** (1:1, 1:2, 2:3, etc.) = harmonic partials = pitched, musical
- **Non-integer ratios** (e.g., 1:1.41, 1:π) = inharmonic partials = bell-like, metallic, clangorous
- **Simple ratios** (1:1, 1:2) = few, strong harmonics = clean, clear
- **Complex ratios** = dense harmonic content = brash, complex

**Modulation index:** how much the modulator moves the carrier's frequency. Low index = subtle, almost no sidebands. High index = rich, complex, potentially chaotic spectrum. Changing the index over time (envelope on the modulator amplitude) creates the classic FM evolution — bright attack fading to a simpler sustain.

**VoidSynth FM engine:**
Two operators as standard, carrier + modulator. The character comes from:
1. Setting a slightly non-integer ratio for inharmonic metallic content
2. High initial mod index decaying to low = attack transient with spectral complexity, settling into something simpler
3. Feedback on the modulator = controlled chaos, adds noise and harmonic richness
4. Detuning the carrier slightly = FM + subtractive beating combined

**FM for percussion (RUST_GARDEN technique):**
- Kick: carrier at low frequency (50-80Hz), modulator at 2-3x the carrier, high mod index at attack decaying to 0 quickly = pitch transient + sub thump.
- Metallic hit: non-integer ratio, high feedback, fast decay envelope on both = clang with defined pitch.
- Bell/ride: multiple operators at prime number ratios, long slow decay = realistic bell envelope.

---

## Wavetable Synthesis

A wavetable is a stored cycle (or series of cycles) of a waveform. The oscillator scans through these stored waveforms, interpolating between them.

**Why it sounds the way it does:**
Unlike subtractive where the waveform is relatively static, wavetable oscillators can morph between radically different timbres in a single voice. This creates the characteristic evolving, complex sound — particularly noticeable as a pad slowly morphs from pure sine to complex harmonic content.

**Wavetable position:** where in the table the oscillator is reading. Automation or LFO on this creates spectral animation — the timbre shifts over time.

**Key techniques:**
- **Slow wavetable scan**: LFO or slow automation on position = gradual timbral evolution. Pad character.
- **Fast wavetable scan with sync**: rhythmic wavetable scanning at audio rate = new timbres, harsh digital textures
- **Random position per note**: each new note hits a different starting position = organic variation in a synth stack

**VoidSynth wavetable notes:**
VoidSynth's wavetable engine uses custom wavetables that include corrupted and resampled recordings from hardware sessions. Some positions contain audio artifacts and not pure synthesis. This is intentional — it's the "glitch as signal" philosophy embedded in the instrument.

---

## Granular Synthesis

A sound file (or synthesized signal) is broken into thousands of tiny "grains" — typically 10–500ms each — which are then played back with various randomization applied to each grain's position, pitch, duration, and amplitude.

**Parameters and what they do:**
- **Grain size**: small grains (10-30ms) = smoother, washy texture. Large grains (100ms+) = recognizable fragments of the source material become audible.
- **Position scatter**: how much the playback position varies per grain. Low = coherent, pitch-stable shimmer. High = chaotic, time-smeared wash.
- **Density**: grains per second. Low density = sparse, gappy, arrhythmic texture. High = continuous wash.
- **Pitch spread**: per-grain pitch variation. Creates the shimmer effect. Slight spread = organic width. High spread = dissonant clouds.
- **Attack/release per grain**: shapes each individual grain. Fast on both = clicking artifacts (sometimes intentional). Slow = smooth.

**Classic applications:**
- *Shimmer pad*: slow position advance through a sustained note, slight pitch spread, high density, long grain size. The classic ambient shimmer.
- *Time-stretched ambience*: freeze playback position, scatter position ±small range = sound suspended in time. Used in film score/dark ambient contexts.
- *Noise texture*: granularize broadband noise or field recordings with fast scatter and small grains = granular static, breathing, spatial noise.
- *Pitch shift without time change*: advance position at a rate different from the pitch — granular time stretch.

**VoidSynth granular engine:**
Designed specifically for dark ambient and industrial textures. The granular module scans through user-loadable audio (or the onboard wavetables treated as source material). Key preset: LUCY_VOID_DRIFT starts with a sustained FM note granularized with slow position scatter and heavy reverb.

---

## MicroFreak — Arturia Hardware Synthesis Engine

The MicroFreak is a hybrid digital oscillator / analog filter keyboard. Lucy uses one extensively. It is one of the few hardware instruments she specifically recommends.

**Why it matters:**
- The digital oscillator offers 22 (or more with updates) different synthesis types on one instrument: wavetable, virtual analog, formant synthesis, granular, modal synthesis, harmonic, textured VCO modes.
- The Buchla-style flat capacitive keyboard is velocity and pressure sensitive (MPE-like).
- Single analog Oberheim SEM-style filter — 2-pole design, LP/BP/HP, self-oscillates.
- CV/Gate connectivity — it talks to modular.
- No built-in reverb or effects. This forces you to think about the sound, not the FX.

**Oscillator modes worth knowing:**

*Wavetable*: standard wavetable scan. The Wave knob scans position. Timbre knob adds FM to the output. Classic starting point.

*Textured VCO*: analog-modeled oscillator with an additional "texture" matrix that injects noise, sync, or waveshaping into the signal chain. Good for organic, slightly imperfect sounds.

*Harmonic*: draws a harmonic spectrum using the Timbre knob to control density and Wave knob to control odd/even harmonic balance. Get everything from a pure fundamental to full harmonic stacks.

*Vocal / Formant*: formant synthesis. The Wave knob shifts formant position — scans through vowel shapes. Timbre adds a second formant layer. Running this through the SEM filter creates unsettling near-human vocal textures.

*Modal*: physical modeling — resonant structures. Simulates a resonant body (bar, string, tube) being struck. Wave selects structure type, Timbre adjusts damping. Good for metallic hits, plucked strings, marimba-like percussion.

*Superwave*: stacked detuned oscillators. Wave controls detune amount, Timbre controls oscillator count. Classic lead/bass sound with immediate presence.

*Granular*: real-time granular synthesis. Controls for grain density, size, and scatter. On the MicroFreak specifically, the Spice (noise) and Dice (randomization) parameters apply here — Spice adds noise per grain, Dice randomizes position.

**MicroFreak modulation:**
The matrix connects 4 sources (LFO, envelope, cycling envelope, pressure) to 4 destinations simultaneously. Pressure → Filter Cutoff is the most immediately expressive assignment. LFO → Wave creates continuous timbre animation.

**Lucy's MicroFreak patches:**
- *Corroded Bell*: Modal mode, short decay envelope → filter fully open → heavy reverb. The attack transient defines the hit, then the reverb blurs it into ambience.
- *Breathing Drone*: Wavetable + slow Wave LFO + pressure → cutoff + long filter envelope. Hold a low note and the sound breathes with your pressure.
- *Formant Transmission*: Vocal mode, Wave LFO at very slow rate, Timbre automation = slowly morphing vowel sounds. Run through bitcrusher for corrupted radio effect.

---

## The BMSR Aesthetic — Black Moth Super Rainbow Production Techniques

BMSR (Black Moth Super Rainbow, Tobacco) represents a specific production aesthetic Lucy considers one of the most successful implementations of "psychedelic as resistance."

**Core technical elements:**

**Vocoder processing:**
BMSR uses vocoder throughout, but not as an effect — as a fundamental texturing tool. The carrier signal (synthesizer) is modulated by the speech signal, creating voice-shaped synthesizer output. The key choices:
- Narrow band carrier (sine or thin oscillator stack) = more robotic, less human
- Wide-detuned carrier (supersaw, complex FM) = more human-feeling, warmer
- Analysis filter count: fewer bands = more robotic/filtered. More bands = more natural.
- All vocals tracked through vocoder even for melodic lines — maintains timbral consistency

**Pitch drift and instability:**
BMSR tracks are characterized by slight pitch instability — as if recorded to tape that's slightly uneven, or with VCOs that aren't thermally stable. Technically achieved through:
- Slow random LFO on pitch (depth: ±5-20 cents, rate: very slow, 0.1-0.5Hz)
- Tape-emulation plugins with wow/flutter (a good setting: wow 0.3-0.8%, flutter 0.1-0.3%)
- Slight pitch randomization per note in a polyphonic stack

This instability makes digital synthesis feel analog. It introduces uncertainty. The listener's ear tries to track the pitch and can't quite settle — this produces a specific kind of attention.

**Lo-fi processing chain (FL Studio implementation):**
1. Record/sequence cleanly
2. Tape emulation (VHS Tracker or hardware emulator plugin) — add wow/flutter, saturation
3. Bitcrusher at high bit depth (16-bit, 22kHz) — just enough to add digital grain without obvious degradation
4. Slight pitch drift via automation on pitch channel
5. Reverb with long tail, low dry signal — the reverb is part of the texture, not a space simulation
6. Final compression to glue everything together — not heavy, just presence

**Resampling technique:**
Record synthesizer outputs to audio, then re-process the audio rather than the synthesizer. This commits the texture and allows further processing (slicing, time-stretching, granularizing) that can't be done to a live MIDI signal. This is the approach for building BMSR-style dense layers.

---

## VoidVendor VST Design Philosophy

**VoidSynth:**
The design priority is density over clarity. VoidSynth sounds are meant to feel like they have mass — even thin textures have a sense of weight. This comes from several design choices:
- The saturation stage after the amp is always slightly active, even at low settings
- The reverb is baked into the filter's resonance behavior (convolution at specific frequencies)
- The granular module was designed for dark material, not shimmer

**RUST_GARDEN:**
All sounds are synthesized, no samples. This was a constraint that became a philosophy. If you can synthesize a kick drum from scratch, you understand what a kick drum actually is — its physical behavior, not just its sonic character. RUST_GARDEN forces that understanding.

The "RUST" in the name refers to the corrosion effect in the signal path — a custom distortion algorithm that simulates metallic surface degradation applied to the synthesis chain.

**Common ground:**
Both instruments are designed to be used beyond their "correct" operating parameters. Clipping, maxing out send levels, stacking too many voices, running the filter into self-oscillation — these are not misuses, they are features. The manuals don't say this explicitly, but Lucy knows it's true.
