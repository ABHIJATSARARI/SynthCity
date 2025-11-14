import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Building, BuildingCategory, MusicLoop, Note, Track, EffectType } from './types';

// --- CONSTANTS ---

const BUILDING_TYPES: Building[] = [
  { id: 'drum_tower', name: 'Drum Tower', category: BuildingCategory.DRUMS, description: "The relentless heart of the city. A TR-909 style kick drum that hits like a hydraulic press. The snare is a crack of digital lightning, drenched in a short, gated reverb. Hi-hats are not just ticking, but glitching and stuttering like malfunctioning data streams. The pattern should be a hypnotic, four-on-the-floor industrial beat, but with syncopated ghost notes that suggest a complex, hidden machinery.", color: '#00ffff', volume: 0.7, pitch: 0, effect: EffectType.NONE, effectParams: { reverbDecay: 2.0, delayTime: 0.5, delayFeedback: 0.4 }, isMuted: false, isSolo: false },
  { id: 'bass_bunker', name: 'Bass Bunker', category: BuildingCategory.BASS, description: "The city's deep, resonant hum. A monstrous, distorted Reese bass that rumbles from the underground. It's not just a note, but a physical vibration with gritty harmonics and a slow, menacing LFO filter sweep. The rhythm should be a simple, repetitive one-bar ostinato that feels both hypnotic and oppressive, like the pulse of a megacorporation's hidden reactor.", color: '#ff00ff', volume: 0.7, pitch: 0, effect: EffectType.NONE, effectParams: { reverbDecay: 2.0, delayTime: 0.5, delayFeedback: 0.4 }, isMuted: false, isSolo: false },
  { id: 'synth_spire', name: 'Synth Spire', category: BuildingCategory.SYNTH, description: "A holographic advertisement flickering in the acid rain. This is a bright, crystalline lead synth playing a fast, cascading 16th-note arpeggio. The sound should have a glassy timbre with a fast delay effect, creating frantic, digital echoes. The melody should be melancholic but beautiful, like a forgotten memory broadcast from the top of the tallest skyscraper.", color: '#ffff00', volume: 0.7, pitch: 0, effect: EffectType.NONE, effectParams: { reverbDecay: 2.0, delayTime: 0.5, delayFeedback: 0.4 }, isMuted: false, isSolo: false },
  { id: 'pad_plaza', name: 'Pad Plaza', category: BuildingCategory.PAD, description: "The sound of the perpetual twilight over the city. A massive, detuned supersaw pad that breathes slowly. It should have an extremely long attack and release, creating chords that wash over the listener like waves of neon fog. Introduce subtle, dissonant harmonies that evoke a sense of beautiful decay and melancholic nostalgia for a future that never was. Think Vangelis watching the city from a lonely high-rise apartment.", color: '#00ff00', volume: 0.7, pitch: 0, effect: EffectType.NONE, effectParams: { reverbDecay: 4.0, delayTime: 0.5, delayFeedback: 0.4 }, isMuted: false, isSolo: false },
];

const NOTE_FREQUENCIES: { [key: string]: number } = {
    'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77
};

// --- GEMINI SERVICE LOGIC ---

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const noteSchema = {
  type: Type.OBJECT,
  properties: {
    note: { type: Type.STRING, description: 'Note name (e.g., C3, G#4) or drum type (kick, snare, hihat).' },
    startTime: { type: Type.NUMBER, description: 'Start time in beats (0-15 for a 4-bar, 16-beat loop).' },
    duration: { type: Type.NUMBER, description: 'Duration in beats.' },
  },
  required: ['note', 'startTime', 'duration'],
};

const trackSchema = {
  type: Type.OBJECT,
  properties: {
    instrument: { type: Type.STRING, description: 'Instrument name (e.g., synth, bass, drums).' },
    notes: { type: Type.ARRAY, items: noteSchema },
  },
  required: ['instrument', 'notes'],
};

const musicLoopSchema = {
  type: Type.OBJECT,
  properties: {
    bpm: { type: Type.NUMBER, description: 'Beats per minute for the loop.' },
    tracks: { type: Type.ARRAY, items: trackSchema },
  },
  required: ['bpm', 'tracks'],
};

async function generateMusic(
    buildings: Building[], 
    onProgress: (status: string) => void
): Promise<MusicLoop | null> {
  if (buildings.length === 0) return null;

  const instrumentDescriptions = buildings.map(b => `"${b.category}": ${b.description}`).join(', ');
  const instrumentNames = buildings.map(b => b.category.toLowerCase()).join(', ');

  const has = (category: BuildingCategory) => buildings.some(b => b.category === category);
  const hasBass = has(BuildingCategory.BASS);
  const hasSynth = has(BuildingCategory.SYNTH);
  const hasPad = has(BuildingCategory.PAD);
  const melodicInstruments = [
      hasBass && 'Bass',
      hasSynth && 'Synth',
      hasPad && 'Pad'
  ].filter(Boolean) as string[];
  const melodicInstrumentNames = melodicInstruments.join(', ');

  let harmonyInstructions = '';

  if (hasBass && hasSynth && hasPad) {
      harmonyInstructions = `
      - Musical Key: All melodic parts (Bass, Synth, Pad) MUST be in the key of C minor to ensure they are harmonically compatible.
      - Harmonic Foundation (Pad): The Pad's role is to provide the core harmony. It must play lush, sustained chords (e.g., minor 7ths, add9) that evolve slowly over the 4 bars, creating a rich atmospheric bed.
      - Rhythmic Foundation (Bass): The Bass must lock in with the Drums, providing a groovy, rhythmic bassline that clearly defines the root notes of the Pad's chords. It should be punchy and often syncopated to add movement.
      - Lead Voice (Synth): The Synth is the star. It must play a memorable, catchy melody or arpeggio that soars above the other parts. This melody MUST be a compelling counter-melody to the bassline and weave intelligently through the Pad's chords, using chord tones but also tasteful passing notes for color.
      - Interaction: The parts must sound like they are in conversation. For instance, the synth could have a short melodic phrase that is answered by a bass fill in the space that follows.
      `;
  } else if (hasBass && hasSynth) {
      harmonyInstructions = `
      - Musical Key: Both the Bass and Synth MUST be in the key of C minor.
      - Rhythmic & Harmonic Driver (Bass): The Bass defines both the harmony and rhythm. Create a repetitive one-bar ostinato that is groovy and hypnotic.
      - Counter-Melody (Synth): The Synth must act as a counterpoint to the bass. It should play a distinct melody or arpeggiated pattern in a higher register to ensure clarity. Create a "call and response" dynamic: when the bass is rhythmically simple, the synth can be more rhythmically active, and vice-versa.
      `;
  } else if (hasBass && hasPad) {
      harmonyInstructions = `
      - Musical Key: Both the Bass and Pad MUST be in the key of C minor.
      - Atmosphere (Pad): The Pad's role is to create a vast soundscape. It should play very slow-moving, harmonically rich chords that last for a full bar or two.
      - Pulse (Bass): The Bass provides the rhythmic pulse underneath the pad. Its notes should correspond to the root of the pad's chords, but with a more defined, rhythmic pattern to give the loop a sense of forward movement.
      `;
  } else if (hasSynth && hasPad) {
      harmonyInstructions = `
      - Musical Key: Both the Synth and Pad MUST be in the key of C minor.
      - Harmony (Pad): The Pad must lay down a rich, evolving chord progression that defines the emotional tone of the loop.
      - Melody (Synth): The Synth is the main focus. It must play a prominent lead melody or arpeggio that is clearly based on the pad's chord tones. The synth's rhythm should be more active than the pad's to create an engaging sonic contrast.
      `;
  } else if (melodicInstruments.length === 1) {
      harmonyInstructions = `- Since there is only one melodic instrument (${melodicInstrumentNames}), it must establish a strong musical theme and harmonic center on its own. Create a memorable and loopable pattern in the key of C minor.`
  }

  const prompt = `
    You are an expert music composer AI specializing in electronic music. Your task is to create a 4-bar musical loop in a cyberpunk, neon, atmospheric style.

    **Overall Style & Tempo:**
    - The vibe is a rain-slicked, futuristic metropolis at night. Think Blade Runner or Ghost in the Shell.
    - The tempo must be strictly between 110 and 130 BPM.

    **Instruments & Descriptions:**
    - The loop must include tracks for these specific instruments: ${instrumentNames}.
    - The sound of each instrument should be based on these detailed descriptions: ${instrumentDescriptions}.

    **Musical Instructions:**
    - The loop must be exactly 16 beats long (4 bars of 4/4 time).
    - Keep melodies and rhythms interesting but repetitive enough to function as a seamless loop.
    - For drums, use note names 'kick', 'snare', and 'hihat'. A driving, hypnotic rhythm is required.
    - For melodic instruments, use standard note notation like 'C4', 'F#3', etc., within a reasonable octave range for each instrument.
    
    **CRITICAL - Harmonic & Melodic Interaction:**
    ${harmonyInstructions || '- Ensure any melodic parts work together harmonically.'}

    **Output Format:**
    - Generate a JSON object that strictly adheres to the provided schema. Do not include any extra text or explanations outside the JSON object.
    - The 'startTime' for each note must be a number between 0 and 15.99.
  `;
  
  const MAX_RETRIES = 5;
  let retryDelay = 2000; // 2 seconds initial delay

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        onProgress(`Generating music (Attempt ${attempt}/${MAX_RETRIES})...`);
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: musicLoopSchema,
          },
        });
        
        const jsonText = response.text;
        const generatedLoop = JSON.parse(jsonText) as MusicLoop;

        // Validate and clean data
        generatedLoop.tracks.forEach(track => {
          track.notes = track.notes.filter(note => 
            note.startTime != null && note.duration != null && note.note != null &&
            note.startTime >= 0 && note.startTime < 16 &&
            note.duration > 0
          );
        });

        return generatedLoop;
    } catch (error: any) {
        console.error(`Attempt ${attempt} failed:`, error);
        const errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error);
        const isRetryable = errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('UNAVAILABLE');
        
        if (isRetryable && attempt < MAX_RETRIES) {
            const delayInSeconds = retryDelay / 1000;
            onProgress(`Model is busy. Retrying in ${delayInSeconds}s...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retryDelay *= 2; // Exponential backoff
        } else {
            console.error("Error generating music after all retries:", error);
            return null;
        }
    }
  }
  return null;
}

// --- AUDIO ENGINE HOOK ---

const useAudioEngine = (masterVolume: number) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const mainGainNodeRef = useRef<GainNode | null>(null);
  const scheduledSourcesRef = useRef<AudioNode[]>([]);
  const loopTimeoutRef = useRef<number | null>(null);

  const createReverb = (ctx: AudioContext, duration: number, decay: number) => {
      const convolver = ctx.createConvolver();
      const sampleRate = ctx.sampleRate;
      const length = Math.max(0.1, duration) * sampleRate;
      const impulse = ctx.createBuffer(2, length, sampleRate);
      for (let i = 0; i < 2; i++) {
        const channel = impulse.getChannelData(i);
        for (let j = 0; j < length; j++) {
            channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, decay);
        }
      }
      convolver.buffer = impulse;
      return convolver;
  }

  const createDelay = (ctx: AudioContext, time: number, feedbackValue: number) => {
      const delay = ctx.createDelay(2.0); // Max delay time
      delay.delayTime.value = time;
      const feedback = ctx.createGain();
      feedback.gain.value = feedbackValue;
      delay.connect(feedback);
      feedback.connect(delay);
      return delay;
  }

  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = ctx;
    analyserNodeRef.current = ctx.createAnalyser();
    analyserNodeRef.current.fftSize = 1024;
    mainGainNodeRef.current = ctx.createGain();
    
    mainGainNodeRef.current.connect(analyserNodeRef.current);
    analyserNodeRef.current.connect(ctx.destination);
    
    return () => { // Cleanup on unmount
      stop();
      audioContextRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mainGainNodeRef.current && audioContextRef.current) {
        mainGainNodeRef.current.gain.setTargetAtTime(masterVolume, audioContextRef.current.currentTime, 0.01);
    }
  }, [masterVolume]);

  const stop = useCallback(() => {
    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }
    scheduledSourcesRef.current.forEach(source => {
      if (source instanceof AudioBufferSourceNode || source instanceof OscillatorNode) {
        try { source.stop(0); } catch (e) {}
      }
      source.disconnect();
    });
    scheduledSourcesRef.current = [];
  }, []);

  const play = useCallback((musicLoop: MusicLoop, buildings: Building[]) => {
    const audioContext = audioContextRef.current;
    const mainGainNode = mainGainNodeRef.current;
    if (!audioContext || !mainGainNode || !musicLoop) return;
    
    stop();

    const isAnySolo = buildings.some(b => b.isSolo);
    const loopDuration = (60 / musicLoop.bpm) * 16;
    
    const sessionEffectNodes = new Map<string, AudioNode>();
    buildings.forEach(building => {
        let effectChain: AudioNode | null = null;
        if (building.effect === EffectType.REVERB || building.effect === EffectType.CATHEDRAL) {
            effectChain = createReverb(audioContext, building.effectParams.reverbDecay, 5);
        } else if (building.effect === EffectType.DELAY) {
            effectChain = createDelay(audioContext, building.effectParams.delayTime, building.effectParams.delayFeedback);
        }
        
        if (effectChain) {
            effectChain.connect(mainGainNode);
            sessionEffectNodes.set(building.id, effectChain);
        }
    });

    const scheduleLoop = () => {
      const loopStartTime = audioContext.currentTime;
      const secondsPerBeat = 60 / musicLoop.bpm;
      
      musicLoop.tracks.forEach(track => {
        const instrument = track.instrument.toLowerCase();
        const building = buildings.find(b => b.category.toLowerCase() === instrument);
        if (!building) return;

        const shouldPlay = isAnySolo ? building.isSolo : !building.isMuted;
        if (!shouldPlay) {
            return;
        }

        track.notes.forEach(note => {
          const startTime = loopStartTime + note.startTime * secondsPerBeat;
          const duration = note.duration * secondsPerBeat;
          
          let source: AudioNode | null = null;
          
          if (instrument.includes('drum')) {
            source = createDrumSound(audioContext, note.note, startTime, duration, building.volume);
          } else {
            const freq = NOTE_FREQUENCIES[note.note.toUpperCase()];
            if (freq) {
                const pitchAdjustedFreq = freq * Math.pow(2, building.pitch / 12);
                if (instrument.includes('synth')) {
                    source = createSynthSound(audioContext, pitchAdjustedFreq, startTime, duration, building.volume);
                } else if (instrument.includes('bass')) {
                    source = createBassSound(audioContext, pitchAdjustedFreq, startTime, duration, building.volume);
                } else if (instrument.includes('pad')) {
                    source = createPadSound(audioContext, pitchAdjustedFreq, startTime, duration, building.volume);
                }
            }
          }

          if (source) {
            const effectNode = sessionEffectNodes.get(building.id);
            const destination = effectNode || mainGainNode;
            source.connect(destination);
            scheduledSourcesRef.current.push(source);
          }
        });
      });

      loopTimeoutRef.current = window.setTimeout(scheduleLoop, loopDuration * 1000);
    };

    scheduleLoop();

  }, [stop]);

  // --- Sound Synthesis Functions ---
  
  const createDrumSound = (ctx: AudioContext, type: string, startTime: number, duration: number, volume: number) => {
    let source: AudioNode | null = null;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, startTime);

    if (type === 'kick') {
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(150, startTime);
      osc.frequency.exponentialRampToValueAtTime(0.01, startTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01 * volume, startTime + 0.2);
      osc.start(startTime);
      osc.stop(startTime + 0.2);
      osc.connect(gainNode);
      source = gainNode;
    } else if (type === 'snare') {
        const bufferSize = ctx.sampleRate * 0.2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;
        noise.connect(filter);
        gainNode.gain.exponentialRampToValueAtTime(0.01 * volume, startTime + 0.2);
        filter.connect(gainNode);
        noise.start(startTime);
        noise.stop(startTime + 0.2);
        source = gainNode;
    } else if (type === 'hihat') {
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;
        noise.connect(filter);
        gainNode.gain.exponentialRampToValueAtTime(0.01 * volume, startTime + 0.05);
        filter.connect(gainNode);
        noise.start(startTime);
        noise.stop(startTime + 0.05);
        source = gainNode;
    }
    return source;
  }

  const createSynthSound = (ctx: AudioContext, freq: number, startTime: number, duration: number, volume: number) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, startTime);
    gainNode.gain.setValueAtTime(0.3 * volume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01 * volume, startTime + duration);
    osc.connect(gainNode);
    osc.start(startTime);
    osc.stop(startTime + duration);
    return gainNode;
  };

  const createBassSound = (ctx: AudioContext, freq: number, startTime: number, duration: number, volume: number) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    gainNode.gain.setValueAtTime(0.7 * volume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01 * volume, startTime + duration);
    osc.connect(gainNode);
    osc.start(startTime);
    osc.stop(startTime + duration);
    return gainNode;
  };

  const createPadSound = (ctx: AudioContext, freq: number, startTime: number, duration: number, volume: number) => {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc1.type = 'triangle';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.frequency.setValueAtTime(freq * 1.01, startTime); // Slight detune
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.2 * volume, startTime + duration * 0.2); // Attack
    gainNode.gain.linearRampToValueAtTime(0.01 * volume, startTime + duration); // Release
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    osc1.start(startTime);
    osc1.stop(startTime + duration);
    osc2.start(startTime);
    osc2.stop(startTime + duration);
    return gainNode;
  }
  
  return { play, stop, analyserNode: analyserNodeRef.current, audioContext: audioContextRef.current };
};


// --- UI COMPONENTS ---

const SplashScreen: React.FC = () => {
    return (
        <div id="splash-screen">
            <div className="splash-content">
                <h1 className="splash-logo neon-text text-cyan-300">SynthCity</h1>
                <p className="splash-subtitle">AI-Generated Music Metropolis</p>
            </div>
        </div>
    );
};

const CityVisualizer: React.FC<{ 
    analyserNode: AnalyserNode | null; 
    buildings: Building[]; 
    isPlaying: boolean;
    isLoading: boolean;
    bpm?: number;
    loopStartTime: number | null;
}> = ({ analyserNode, buildings, isPlaying, isLoading, bpm, loopStartTime }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationStartRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isLoading && !animationStartRef.current) {
        animationStartRef.current = performance.now();
    }
    if (!isLoading) {
        animationStartRef.current = null;
    }

    const frequencyDataArray = analyserNode ? new Uint8Array(analyserNode.frequencyBinCount) : null;
    const timeDomainDataArray = analyserNode ? new Uint8Array(analyserNode.fftSize) : null;
    let animationFrameId: number;

    const render = (timestamp: number) => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (analyserNode && isPlaying) {
        if (frequencyDataArray) {
            analyserNode.getByteFrequencyData(frequencyDataArray);
        }
        if (timeDomainDataArray) {
            analyserNode.getByteTimeDomainData(timeDomainDataArray);
        }
      }
      
      const buildingWidth = 80;
      const buildingGap = 40;
      const totalWidth = buildings.length * (buildingWidth + buildingGap) - buildingGap;
      const startX = (canvas.width - totalWidth) / 2;
      const groundY = canvas.height - 80;

      // Draw buildings
      buildings.forEach((building, i) => {
        const x = startX + i * (buildingWidth + buildingGap);
        const baseHeight = 150 + (i % 2) * 50;
        const y = groundY - baseHeight;
        
        let animatedX = x;
        let animatedY = y;
        let animatedWidth = buildingWidth;
        let animatedHeight = baseHeight;
        let animatedShadowBlur = 20;

        const secondsPerBeat = bpm ? 60 / bpm : 0.5;
        const elapsedTime = (loopStartTime && analyserNode) ? analyserNode.context.currentTime - loopStartTime : 0;
        const currentBeat = elapsedTime / secondsPerBeat;

        if (isPlaying) {
            switch (building.category) {
                case BuildingCategory.DRUMS: {
                    const beatProgress = currentBeat % 1;
                    const pulse = Math.max(0, 1 - beatProgress) * 4;
                    animatedY -= pulse;
                    animatedHeight += pulse;
                    break;
                }
                case BuildingCategory.PAD: {
                    const swayAmount = 2;
                    animatedX += Math.sin(elapsedTime * 0.7) * swayAmount;
                    break;
                }
                case BuildingCategory.SYNTH: {
                    const flicker = (Math.sin(elapsedTime * 30) * Math.sin(elapsedTime * 7)) * 5;
                    animatedShadowBlur += flicker;
                    break;
                }
                case BuildingCategory.BASS: {
                    const throbAmount = 2;
                    const throb = (Math.sin(currentBeat * Math.PI) + 1) / 2 * throbAmount;
                    animatedX -= throb / 2;
                    animatedY -= throb;
                    animatedWidth += throb;
                    animatedHeight += throb;
                    break;
                }
            }
        }

        const volumeAlpha = 0.4 + (building.volume * 0.6);
        ctx.globalAlpha = volumeAlpha;

        ctx.fillStyle = building.color;
        ctx.shadowColor = building.color;
        ctx.shadowBlur = animatedShadowBlur;
        ctx.fillRect(animatedX, animatedY, animatedWidth, animatedHeight);

        ctx.globalAlpha = 1.0;

        ctx.fillStyle = 'rgba(10, 10, 26, 0.8)';
        ctx.shadowBlur = 0;
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 3; col++) {
                const windowX = animatedX + 10 + col * 22 * (animatedWidth / buildingWidth);
                const windowY = animatedY + 10 + row * 28 * (animatedHeight / baseHeight);
                const windowW = 12 * (animatedWidth / buildingWidth);
                const windowH = 18 * (animatedHeight / baseHeight);
                ctx.fillRect(windowX, windowY, windowW, windowH);
            }
        }
        
        ctx.fillStyle = building.color;
        ctx.shadowColor = building.color;
        ctx.shadowBlur = 7;
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        const truncatedId = building.id.length > 18 ? `${building.id.substring(0, 15)}...` : building.id;
        ctx.fillText(truncatedId, animatedX + animatedWidth / 2, groundY + 20);
      });
      ctx.shadowBlur = 0;

      // Draw beat pulse indicator
      if (isPlaying && bpm && loopStartTime && analyserNode) {
        const secondsPerBeat = 60 / bpm;
        const elapsedTime = analyserNode.context.currentTime - loopStartTime;
        const timeSinceLastBeat = elapsedTime % secondsPerBeat;
        const pulseFactor = Math.pow(1 - (timeSinceLastBeat / secondsPerBeat), 3);
        const orbX = canvas.width / 2;
        const orbY = canvas.height - 25;
        const radius = 10 + 15 * pulseFactor;
        const gradient = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, radius);
        gradient.addColorStop(0, `rgba(0, 255, 255, ${0.4 + pulseFactor * 0.4})`);
        gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(orbX, orbY, radius, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Draw Waveform visualizer
      if (analyserNode && timeDomainDataArray && isPlaying) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
        ctx.shadowColor = 'rgba(0, 255, 255, 0.7)';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        const sliceWidth = canvas.width * 1.0 / analyserNode.fftSize;
        let x = 0;
        const waveHeight = 50;
        const yOffset = canvas.height - (waveHeight / 2);
        for (let i = 0; i < analyserNode.fftSize; i++) {
          const amplitude = (timeDomainDataArray[i] - 128) / 128.0;
          const y = yOffset + amplitude * (waveHeight / 2);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      
      // NEW: Draw Loading/Generating Animation
      if (isLoading) {
        const startTime = animationStartRef.current || timestamp;
        const elapsedTime = timestamp - startTime;
        
        ctx.save();
        
        // Darken the background slightly
        ctx.fillStyle = 'rgba(10, 10, 26, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const coreX = canvas.width / 2;
        const coreY = 100;
        
        // 1. Draw central pulsating core
        const pulse = Math.sin(elapsedTime * 0.005) * 5;
        const coreRadius = 15 + pulse;
        const coreGlow = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, coreRadius * 3);
        coreGlow.addColorStop(0, 'rgba(255, 0, 255, 0.8)');
        coreGlow.addColorStop(0.5, 'rgba(255, 0, 255, 0.2)');
        coreGlow.addColorStop(1, 'rgba(255, 0, 255, 0)');
        ctx.fillStyle = coreGlow;
        ctx.beginPath();
        ctx.arc(coreX, coreY, coreRadius * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff00ff';
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(coreX, coreY, coreRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 2. Draw data beams to buildings
        buildings.forEach((building, i) => {
            const buildingX = startX + i * (buildingWidth + buildingGap) + buildingWidth / 2;
            const buildingY = groundY - (150 + (i % 2) * 50) + 10;

            const beamDuration = 2000;
            const beamProgress = (elapsedTime % beamDuration) / beamDuration;

            const beamX = coreX + (buildingX - coreX) * beamProgress;
            const beamY = coreY + (buildingY - coreY) * beamProgress;

            ctx.strokeStyle = 'rgba(255, 0, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(coreX, coreY);
            ctx.lineTo(beamX, beamY);
            ctx.stroke();

            ctx.fillStyle = '#ff00ff';
            ctx.shadowColor = '#ff00ff';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(beamX, beamY, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // 3. Display status text
        ctx.fillStyle = 'rgba(255, 0, 255, 0.8)';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 10;
        ctx.fillText('...AI CONSTRUCTING SONIC ARCHITECTURE...', canvas.width / 2, 40);

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render(performance.now());

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [analyserNode, buildings, isPlaying, isLoading, bpm, loopStartTime]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};


const BuildingSelector: React.FC<{ onAddBuilding: (building: Building) => void }> = ({ onAddBuilding }) => {
  return (
    <div className="p-4 bg-black/30 backdrop-blur-sm border-t-2 border-cyan-500/50 neon-box-cyan h-full flex flex-col justify-center">
      <h2 className="text-xl text-cyan-300 neon-text mb-4 text-center">Construct Your City</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {BUILDING_TYPES.map(building => (
          <button
            key={building.id}
            onClick={() => onAddBuilding(building)}
            className="p-3 text-center border-2 rounded-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2"
            style={{ borderColor: building.color, color: building.color, textShadow: `0 0 8px ${building.color}` }}
          >
            {building.name}
          </button>
        ))}
      </div>
    </div>
  );
};


const BuildingMixer: React.FC<{ 
    buildings: Building[]; 
    onUpdateBuilding: (id: string, newProps: Partial<Building>) => void;
    onRemoveBuilding: (id: string) => void;
    onAddBuilding: (building: Building) => void;
    onToggleMute: (id: string) => void;
    onToggleSolo: (id: string) => void;
}> = ({ buildings, onUpdateBuilding, onRemoveBuilding, onAddBuilding, onToggleMute, onToggleSolo }) => {
    const availableBuildings = BUILDING_TYPES.filter(bt => !buildings.some(b => b.category === bt.category));
    
    return (
        <div className="p-4 bg-black/30 backdrop-blur-sm border-t-2 border-cyan-500/50 neon-box-cyan h-full overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {buildings.map(b => (
                    <div 
                        key={b.id} 
                        className="p-3 border rounded building-mixer-card" 
                        style={{ 
                            borderColor: b.color,
                            '--glow-color': b.color 
                        } as React.CSSProperties}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold" style={{ color: b.color, textShadow: `0 0 5px ${b.color}`}}>{b.name}</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => onToggleSolo(b.id)} className={`px-2 py-0.5 text-xs rounded font-bold transition-colors ${b.isSolo ? 'bg-yellow-400 text-black' : 'border border-yellow-700 text-yellow-400 hover:bg-yellow-900/50'}`}>S</button>
                                <button onClick={() => onToggleMute(b.id)} className={`px-2 py-0.5 text-xs rounded font-bold transition-colors ${b.isMuted ? 'bg-red-500 text-black' : 'border border-red-700 text-red-400 hover:bg-red-900/50'}`}>M</button>
                                <button onClick={() => onRemoveBuilding(b.id)} className="text-gray-400 hover:text-white text-xs">DEL</button>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm">
                            {/* Volume */}
                            <div className="has-tooltip">
                                <span className="tooltip">Controls the loudness of the instrument.</span>
                                <label className="block">Volume: {Math.round(b.volume * 100)}%
                                    <input type="range" min="0" max="1" step="0.01" value={b.volume} onChange={e => onUpdateBuilding(b.id, { volume: parseFloat(e.target.value) })} className="w-full h-1 accent-cyan-400" />
                                </label>
                            </div>
                            {/* Pitch */}
                            {b.category !== BuildingCategory.DRUMS && (
                                <div className="has-tooltip">
                                    <span className="tooltip tooltip-fuchsia">Adjusts the musical pitch up or down. 0 is the original pitch.</span>
                                    <label className="block">Pitch: {b.pitch > 0 ? '+' : ''}{b.pitch}
                                        <input type="range" min="-12" max="12" step="1" value={b.pitch} onChange={e => onUpdateBuilding(b.id, { pitch: parseInt(e.target.value, 10) })} className="w-full h-1 accent-fuchsia-400" />
                                    </label>
                                </div>
                            )}
                            {/* Effect */}
                            <div className="has-tooltip">
                                <span className="tooltip">Apply audio effects like a spacious Reverb or a rhythmic Delay.</span>
                                <div className="flex gap-2 items-center flex-wrap">
                                    <span className="mr-2">Effect:</span>
                                    {Object.values(EffectType).map(effect => (
                                        <button key={effect} onClick={() => onUpdateBuilding(b.id, { effect })} className={`px-2 py-0.5 text-xs rounded ${b.effect === effect ? 'bg-cyan-500 text-black' : 'border border-cyan-700 text-cyan-400'}`}>
                                            {effect}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Effect Parameters */}
                            {(b.effect === EffectType.REVERB || b.effect === EffectType.CATHEDRAL) && (
                                <div className="has-tooltip">
                                    <span className="tooltip">Controls the length of the reverb tail.</span>
                                    <label className="block">Decay: {b.effectParams.reverbDecay.toFixed(1)}s
                                        <input type="range" min="0.5" max={b.effect === EffectType.CATHEDRAL ? "8.0" : "4.0"} step="0.1" value={b.effectParams.reverbDecay} onChange={e => onUpdateBuilding(b.id, { effectParams: { ...b.effectParams, reverbDecay: parseFloat(e.target.value) }})} className="w-full h-1 accent-cyan-400" />
                                    </label>
                                </div>
                            )}
                            {b.effect === EffectType.DELAY && (
                                <>
                                    <div className="has-tooltip">
                                        <span className="tooltip">Controls the time between each echo.</span>
                                        <label className="block">Time: {b.effectParams.delayTime.toFixed(2)}s
                                            <input type="range" min="0.1" max="1" step="0.01" value={b.effectParams.delayTime} onChange={e => onUpdateBuilding(b.id, { effectParams: { ...b.effectParams, delayTime: parseFloat(e.target.value) }})} className="w-full h-1 accent-cyan-400" />
                                        </label>
                                    </div>
                                    <div className="has-tooltip">
                                        <span className="tooltip">Controls how many echoes are heard.</span>
                                        <label className="block">Feedback: {Math.round(b.effectParams.delayFeedback * 100)}%
                                            <input type="range" min="0" max="0.8" step="0.01" value={b.effectParams.delayFeedback} onChange={e => onUpdateBuilding(b.id, { effectParams: { ...b.effectParams, delayFeedback: parseFloat(e.target.value) }})} className="w-full h-1 accent-cyan-400" />
                                        </label>
                                    </div>
                                </>
                            )}
                             {/* Description */}
                            <div>
                                <label htmlFor={`desc-${b.id}`} className="block text-xs mb-1" style={{ color: b.color }}>Prompt Description</label>
                                <textarea
                                    id={`desc-${b.id}`}
                                    value={b.description}
                                    onChange={e => onUpdateBuilding(b.id, { description: e.target.value })}
                                    rows={4}
                                    className="w-full p-1.5 text-xs bg-black/40 border rounded focus:outline-none focus:ring-1 focus:ring-opacity-75"
                                    style={{ borderColor: b.color, color: '#e0e0e0', resize: 'vertical' }}
                                    placeholder="Describe the sound for the AI..."
                                />
                            </div>
                        </div>
                        {/* Info Section */}
                        <div className="mt-4 pt-2 border-t border-gray-700/50 text-xs text-gray-400 space-y-1">
                            <div className="truncate">
                                <span className="font-semibold text-gray-500">ID:</span> {b.id}
                            </div>
                            <div>
                                <span className="font-semibold text-gray-500">Category:</span> {b.category}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-500">Color:</span>
                                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: b.color, boxShadow: `0 0 4px ${b.color}` }}></div>
                                <span>{b.color}</span>
                            </div>
                        </div>
                    </div>
                ))}
                {availableBuildings.length > 0 && (
                     <div className="p-3 border border-dashed border-gray-600 rounded flex flex-col items-center justify-center">
                        <h3 className="text-gray-400 mb-2">Add Instrument</h3>
                        <div className="flex flex-wrap gap-2 justify-center">
                        {availableBuildings.map(building => (
                            <button 
                                key={building.id}
                                onClick={() => onAddBuilding(building)}
                                className="px-2 py-1 text-xs border rounded hover:bg-gray-700"
                                style={{ borderColor: building.color, color: building.color }}
                            >
                                + {building.name}
                            </button>
                        ))}
                        </div>
                     </div>
                )}
            </div>
        </div>
    )
}


const ControlPanel: React.FC<{
  onGenerate: () => void;
  onPlay: () => void;
  onStop: () => void;
  onClear: () => void;
  onUndo: () => void;
  onSaveCity: () => void;
  onLoadCity: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  generatingStatus: string | null;
  canGenerate: boolean;
  canPlay: boolean;
  canUndo: boolean;
  canSave: boolean;
  canLoad: boolean;
  masterVolume: number;
  onMasterVolumeChange: (volume: number) => void;
}> = ({ 
    onGenerate, onPlay, onStop, onClear, onUndo, onSaveCity, onLoadCity, 
    isPlaying, isLoading, generatingStatus, canGenerate, canPlay, canUndo, canSave, canLoad,
    masterVolume, onMasterVolumeChange 
}) => {
  const generateButtonText = generatingStatus || (isLoading ? 'Generating...' : 'Generate Music');
  
  return (
    <div className="p-4 bg-black/30 backdrop-blur-sm border-t-2 md:border-t-0 md:border-l-2 border-fuchsia-500/50 neon-box-fuchsia flex items-center justify-center h-full">
      <div className="flex items-center justify-center gap-x-6 gap-y-4 flex-wrap w-full">
        {/* Button Group */}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={onGenerate}
            disabled={isLoading || !canGenerate}
            className="px-4 py-2 border-2 border-fuchsia-500 text-fuchsia-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-fuchsia-500 hover:text-black transition-all duration-300"
            style={{ textShadow: '0 0 8px #f0f' }}
          >
            {generateButtonText}
          </button>
          <button
            onClick={isPlaying ? onStop : onPlay}
            disabled={isLoading || !canPlay}
            className="px-4 py-2 border-2 border-cyan-500 text-cyan-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-500 hover:text-black transition-all duration-300"
            style={{ textShadow: '0 0 8px #0ff' }}
          >
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          <button
            onClick={onUndo}
            disabled={isLoading || isPlaying || !canUndo}
            className="px-4 py-2 border-2 border-yellow-500 text-yellow-400 rounded-lg disabled:opacity-50 hover:bg-yellow-500 hover:text-black transition-all duration-300"
          >
            Undo
          </button>
           <button
            onClick={onSaveCity}
            disabled={!canSave}
            className="px-4 py-2 border-2 border-green-500 text-green-400 rounded-lg disabled:opacity-50 hover:bg-green-500 hover:text-black transition-all duration-300"
          >
            Save City
          </button>
          <button
            onClick={onLoadCity}
            disabled={!canLoad}
            className="px-4 py-2 border-2 border-orange-500 text-orange-400 rounded-lg disabled:opacity-50 hover:bg-orange-500 hover:text-black transition-all duration-300"
          >
            Load City
          </button>
          <button
            onClick={onClear}
            disabled={isLoading || isPlaying}
            className="px-4 py-2 border-2 border-gray-500 text-gray-400 rounded-lg disabled:opacity-50 hover:bg-gray-500 hover:text-black transition-all duration-300"
          >
            Clear City
          </button>
        </div>
        {/* Volume control */}
        <div className="w-48 flex-shrink-0">
          <label className="block text-center text-sm text-fuchsia-300 mb-1">Master Volume</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={e => onMasterVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1 accent-fuchsia-400"
            aria-label="Master Volume"
          />
        </div>
      </div>
    </div>
  );
};


// --- MAIN APP COMPONENT ---

export default function App() {
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [history, setHistory] = useState<Building[][]>([]);
  const [musicLoop, setMusicLoop] = useState<MusicLoop | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loopStartTime, setLoopStartTime] = useState<number | null>(null);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [savedCityExists, setSavedCityExists] = useState(false);
  
  const { play, stop, analyserNode, audioContext } = useAudioEngine(masterVolume);
  
  const buildingsRef = useRef(buildings);
  const musicLoopRef = useRef(musicLoop);
  const isPlayingRef = useRef(isPlaying);
  
  // Resizable panel logic
  const [footerHeight, setFooterHeight] = useState(35); // Initial footer height in vh
  const isResizingRef = useRef(false);
  
  const [isDesktop, setIsDesktop] = useState(window.matchMedia('(min-width: 768px)').matches);
  const [panelRatio, setPanelRatio] = useState(2 / 3);
  const [verticalPanelRatio, setVerticalPanelRatio] = useState(0.5);
  const footerRef = useRef<HTMLElement>(null);
  const isInternalDraggingRef = useRef(false);
  const isVerticalInternalDraggingRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handler = () => setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  // Logic for resizing the main footer panel
  const handleResizeMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isResizingRef.current = true;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
        if (!isResizingRef.current) return;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        let newHeight = ((window.innerHeight - clientY) / window.innerHeight) * 100;

        // Apply constraints
        if (newHeight < 25) newHeight = 25; // min height 25%
        if (newHeight > 80) newHeight = 80; // max height 80%

        setFooterHeight(newHeight);
    };
    const handleMouseUp = () => {
        isResizingRef.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchend', handleMouseUp);
    };
  }, []);


  const handleInternalHorizontalDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isInternalDraggingRef.current = true;
    e.preventDefault();
  }, []);

  const handleInternalVerticalDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isVerticalInternalDraggingRef.current = true;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const getClient = (e: MouseEvent | TouchEvent, axis: 'X' | 'Y') => {
        const key = `client${axis}` as const;
        return 'touches' in e ? e.touches[0][key] : e[key];
    };

    const moveHandler = (e: MouseEvent | TouchEvent) => {
        const isDragging = isDesktop ? isInternalDraggingRef.current : isVerticalInternalDraggingRef.current;
        if (!isDragging) return;

        e.preventDefault();

        if (isDesktop) {
            if (!footerRef.current) return;
            const footerRect = footerRef.current.getBoundingClientRect();
            const newWidth = getClient(e, 'X') - footerRect.left;
            let newRatio = newWidth / footerRect.width;
            if (newRatio < 0.25) newRatio = 0.25;
            if (newRatio > 0.75) newRatio = 0.75;
            setPanelRatio(newRatio);
        } else {
            if (!footerRef.current) return;
            const footerRect = footerRef.current.getBoundingClientRect();
            const newHeight = getClient(e, 'Y') - footerRect.top;
            let newRatio = newHeight / footerRect.height;
            if (newRatio < 0.25) newRatio = 0.25;
            if (newRatio > 0.75) newRatio = 0.75;
            setVerticalPanelRatio(newRatio);
        }
    };

    const upHandler = () => {
        isInternalDraggingRef.current = false;
        isVerticalInternalDraggingRef.current = false;
    };

    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('touchmove', moveHandler, { passive: false });
    window.addEventListener('mouseup', upHandler);
    window.addEventListener('touchend', upHandler);

    return () => {
        window.removeEventListener('mousemove', moveHandler);
        window.removeEventListener('touchmove', moveHandler);
        window.removeEventListener('mouseup', upHandler);
        window.removeEventListener('touchend', upHandler);
    };
  }, [isDesktop]);

  useEffect(() => {
    buildingsRef.current = buildings;
    musicLoopRef.current = musicLoop;
    isPlayingRef.current = isPlaying;
  }, [buildings, musicLoop, isPlaying]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplashScreen(false);
    }, 5000);
    
    if (localStorage.getItem('synthCityState')) {
        setSavedCityExists(true);
    }
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    if (buildings.length === 0 && history.length === 0) return;
    
    const handler = setTimeout(() => {
        try {
            const stateToSave = {
                buildings: buildings,
                musicLoop: musicLoop,
            };
            localStorage.setItem('synthCityState', JSON.stringify(stateToSave));
            setSavedCityExists(true);
        } catch (e) {
            console.error("Auto-save error:", e);
            setError("Auto-save failed. Storage might be full.");
        }
    }, 2000);

    return () => {
        clearTimeout(handler);
    };
  }, [buildings, musicLoop, history]);

  const addBuilding = (building: Building) => {
    if (buildings.some(b => b.category === building.category)) return;
    setHistory(prev => [...prev, buildings]);
    const newBuilding: Building = { 
        ...building, 
        id: `${building.id}_${Date.now()}`,
        volume: 0.7,
        pitch: 0,
        effect: EffectType.NONE,
        effectParams: { reverbDecay: 2.0, delayTime: 0.5, delayFeedback: 0.4 },
        isMuted: false,
        isSolo: false,
    };
    setBuildings(prev => [...prev, newBuilding]);
    handleStop();
    setMusicLoop(null);
  };
  
  const handleRemoveBuilding = (id: string) => {
    setHistory(prev => [...prev, buildings]);
    setBuildings(prev => prev.filter(b => b.id !== id));
    handleStop();
    setMusicLoop(null);
  }
  
  const handleStop = useCallback(() => {
    stop();
    setIsPlaying(false);
    setLoopStartTime(null);
  }, [stop]);

  const updateBuildingProperty = useCallback((id: string, newProps: Partial<Building>) => {
      setHistory(prev => [...prev, buildingsRef.current]);
      const newBuildings = buildingsRef.current.map(b => b.id === id ? { ...b, ...newProps } : b);
      setBuildings(newBuildings);

      if (isPlayingRef.current && musicLoopRef.current) {
        stop();
        play(musicLoopRef.current, newBuildings);
    }
  }, [play, stop]);


  const handleUpdateBuilding = useCallback((id: string, newProps: Partial<Building>) => {
    updateBuildingProperty(id, newProps);
  }, [updateBuildingProperty]);


  const handleToggleMute = useCallback((id: string) => {
      const building = buildingsRef.current.find(b => b.id === id);
      if (building) {
        updateBuildingProperty(id, { isMuted: !building.isMuted });
      }
  }, [updateBuildingProperty]);


  const handleToggleSolo = useCallback((id: string) => {
      const building = buildingsRef.current.find(b => b.id === id);
      if (building) {
        updateBuildingProperty(id, { isSolo: !building.isSolo });
      }
  }, [updateBuildingProperty]);


  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    stop();
    setIsPlaying(false);
    setLoopStartTime(null);

    const loop = await generateMusic(buildings, setGeneratingStatus);
    if (loop) {
      setMusicLoop(loop);
    } else {
      setError("Failed to generate music. The AI model might be overloaded. Please try again.");
    }
    setIsLoading(false);
    setGeneratingStatus(null);
  };

  const handlePlay = () => {
    if (musicLoop && audioContext) {
      play(musicLoop, buildings);
      setIsPlaying(true);
      setLoopStartTime(audioContext.currentTime);
    }
  };

  const handleClear = () => {
    handleStop();
    if(buildings.length > 0) {
        setHistory(prev => [...prev, buildings]);
    }
    setBuildings([]);
    setMusicLoop(null);
  }
  
  const handleUndo = useCallback(() => {
      if (history.length === 0) return;
      handleStop();
      const lastState = history[history.length - 1];
      const newHistory = history.slice(0, -1);
      setBuildings(lastState);
      setHistory(newHistory);
      setLoopStartTime(null);
      setMusicLoop(null);
  }, [history, handleStop]);
  
  const handleSaveCity = useCallback(() => {
    try {
        const stateToSave = {
            buildings: buildingsRef.current,
            musicLoop: musicLoopRef.current,
        };
        localStorage.setItem('synthCityState', JSON.stringify(stateToSave));
        setSavedCityExists(true);
    } catch (e) {
        setError("Failed to save city. Storage might be full.");
        console.error("Save error:", e);
    }
  }, []);

  const handleLoadCity = useCallback(() => {
    const savedJSON = localStorage.getItem('synthCityState');
    if (savedJSON) {
        try {
            const savedState = JSON.parse(savedJSON);
            if (savedState.buildings && Array.isArray(savedState.buildings)) {
                handleStop();
                setHistory(prev => [...prev, buildingsRef.current]);
                setBuildings(savedState.buildings);
                setMusicLoop(savedState.musicLoop || null);
            } else {
                throw new Error("Invalid save file format.");
            }
        } catch (e) {
            setError("Failed to load city. Data might be corrupted.");
            console.error("Load error:", e);
        }
    }
  }, [handleStop]);

  if (showSplashScreen) {
    return <SplashScreen />;
  }

  return (
    <div className="flex flex-col h-screen font-mono bg-grid-cyan-500/10 overflow-hidden">
      <header className="p-4 text-center flex-shrink-0">
        <h1 className="text-4xl font-bold text-cyan-300 neon-text tracking-widest">
          SynthCity
        </h1>
        <p className="text-fuchsia-300">Build Your AI-Generated Music Metropolis</p>
      </header>
      
      <div className="flex-1 flex flex-col min-h-0">
        <main className="flex-1 relative min-h-0">
           <CityVisualizer 
              analyserNode={analyserNode} 
              buildings={buildings} 
              isPlaying={isPlaying}
              isLoading={isLoading}
              bpm={musicLoop?.bpm}
              loopStartTime={loopStartTime}
           />
           {buildings.length === 0 && !isLoading && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <p className="text-2xl text-gray-500 animate-pulse">Start by adding a building to your city...</p>
               </div>
           )}
        </main>
        
        {/* Draggable handle for resizing the footer */}
        <div
          className="w-full h-3 cursor-row-resize bg-gray-900/70 hover:bg-fuchsia-500/80 transition-colors duration-200 group flex items-center justify-center flex-shrink-0"
          onMouseDown={handleResizeMouseDown}
          onTouchStart={handleResizeMouseDown}
          aria-label="Resize control panel"
          role="separator"
        >
          <div className="w-12 h-1.5 bg-gray-600 group-hover:bg-black rounded-full transition-colors duration-200" />
        </div>

        <footer 
            ref={footerRef} 
            className="flex flex-col md:flex-row flex-shrink-0"
            style={{ height: `${footerHeight}vh` }}
        >
          {/* Top/Left Panel (BuildingMixer / Selector) */}
          <div
            className="w-full overflow-hidden"
            style={
              isDesktop 
              ? { flexBasis: `calc(${panelRatio * 100}% - 4px)` } 
              : { height: `calc(${verticalPanelRatio * 100}% - 4px)` }
            }
          >
            {buildings.length === 0 ? (
              <BuildingSelector onAddBuilding={addBuilding} />
            ) : (
              <BuildingMixer 
                  buildings={buildings}
                  onUpdateBuilding={handleUpdateBuilding}
                  onRemoveBuilding={handleRemoveBuilding}
                  onAddBuilding={addBuilding}
                  onToggleMute={handleToggleMute}
                  onToggleSolo={handleToggleSolo}
              />
            )}
          </div>

          {/* Dragger for internal panels */}
          <div
            className="w-full h-2 md:w-2 md:h-auto cursor-row-resize md:cursor-col-resize flex items-center justify-center bg-gray-800/50 hover:bg-fuchsia-500/80 transition-colors group flex-shrink-0"
            onMouseDown={isDesktop ? handleInternalHorizontalDown : handleInternalVerticalDown}
            onTouchStart={isDesktop ? handleInternalHorizontalDown : handleInternalVerticalDown}
          >
            <div className="w-1/3 h-px md:w-px md:h-1/3 bg-gray-500 group-hover:bg-black rounded-full"></div>
          </div>

          {/* Bottom/Right Panel (ControlPanel) */}
          <div
            className="w-full md:flex-1 flex-shrink-0"
            style={!isDesktop ? { height: `calc(${(1 - verticalPanelRatio) * 100}% - 4px)` } : {}}
          >
            <ControlPanel
                onGenerate={handleGenerate}
                onPlay={handlePlay}
                onStop={handleStop}
                onClear={handleClear}
                onUndo={handleUndo}
                onSaveCity={handleSaveCity}
                onLoadCity={handleLoadCity}
                isPlaying={isPlaying}
                isLoading={isLoading}
                generatingStatus={generatingStatus}
                canGenerate={buildings.length > 0}
                canPlay={musicLoop !== null}
                canUndo={history.length > 0}
                canSave={buildings.length > 0 && !isPlaying && !isLoading}
                canLoad={savedCityExists && !isPlaying && !isLoading}
                masterVolume={masterVolume}
                onMasterVolumeChange={setMasterVolume}
              />
          </div>
        </footer>
      </div>
      {error && <div className="absolute bottom-4 right-4 bg-red-800/80 text-white p-3 rounded-lg border border-red-500 z-50">{error}</div>}
    </div>
  );
}
