import { useState, useEffect, useRef, useCallback } from 'react';
import bellStart from '../sounds/bell-start.mp3';
import bellFinish from '../sounds/bell-finish.mp3';
import mediumBell from '../sounds/medium-bell-ringing-far.mp3';
import championSound from '../sounds/champion-telecasted.mp3';

type TimerMode = 'sitting' | 'preparing' | 'stretching';

const FADE_DURATION_MUSIC = 9;

const LOCAL_STORAGE_KEYS = {
  sitting: 'dualTimerSittingTime',
  stretching: 'dualTimerStretchingTime',
  preparation: 'dualTimerPreparationTime',
};

const DEFAULT_TIMES = {
  sitting: 30 * 60,
  stretching: 5 * 60,
  preparation: 10,
};

export function DualTimer() {
  const [isMuted, setIsMuted] = useState(false);

  const [sittingTime, setSittingTime] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.sitting);
    return saved ? Number(saved) : DEFAULT_TIMES.sitting;
  });
  const [stretchingTime, setStretchingTime] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.stretching);
    return saved ? Number(saved) : DEFAULT_TIMES.stretching;
  });
  const [preparationTime, setPreparationTime] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.preparation);
    return saved ? Number(saved) : DEFAULT_TIMES.preparation;
  });

  const [timeLeft, setTimeLeft] = useState(sittingTime);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [mode, setMode] = useState<TimerMode>('sitting');

  const timerIdRef = useRef<NodeJS.Timeout | null>(null);
  const modeStartTimeRef = useRef<number>(Date.now());

  const fadeoutAnimationFrameRef = useRef<number>(0);
  const audioRefs = useRef<{ [key in TimerMode]?: HTMLAudioElement }>({});
  const soundBellStartRef = useRef<HTMLAudioElement | null>(null);
  const soundBellFinishRef = useRef<HTMLAudioElement | null>(null);

  const currentFadingAudioRef = useRef<{
    audio: HTMLAudioElement | null;
    startTime: number;
    duration: number;
    initialVolume: number;
  } | null>(null);

  useEffect(() => {
    soundBellStartRef.current = new Audio(bellStart);
    soundBellFinishRef.current = new Audio(bellFinish);
    audioRefs.current.preparing = new Audio(mediumBell);
    audioRefs.current.stretching = new Audio(championSound);

    const loadPromises = [
      soundBellStartRef.current,
      soundBellFinishRef.current,
      audioRefs.current.preparing,
      audioRefs.current.stretching,
    ]
      .filter(Boolean)
      .map(
        (audio) =>
          new Promise<void>((resolve) => {
            if (audio) {
              audio.addEventListener('canplaythrough', () => resolve(), { once: true });
              if (audio === audioRefs.current.preparing || audio === audioRefs.current.stretching) {
                audio.loop = true;
              }
            } else {
              resolve();
            }
          })
      );

    Promise.all(loadPromises)
      .then(() => console.log('Todos os sons carregados!'))
      .catch((error) => console.error('Erro ao carregar sons:', error));

    return () => {
      [
        soundBellStartRef.current,
        soundBellFinishRef.current,
        audioRefs.current.preparing,
        audioRefs.current.stretching,
      ].forEach((audio) => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
          audio.src = '';
        }
      });
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.sitting, String(sittingTime));
  }, [sittingTime]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.stretching, String(stretchingTime));
  }, [stretchingTime]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.preparation, String(preparationTime));
  }, [preparationTime]);

  const playSound = useCallback(
    async (audio: HTMLAudioElement | null, loop: boolean = false) => {
      if (!audio || isMuted) return;

      try {
        audio.currentTime = 0;
        audio.volume = 1;
        if (loop) audio.loop = true;
        await audio.play();
      } catch (error) {
        console.error('Erro ao reproduzir som:', error);
        if (audio.readyState < 3) {
          console.warn('Som não pronto, tentando carregar e reproduzir novamente...');
          audio.load();
          await audio.play().catch((e) => console.error('Erro ao reproduzir após recarregar:', e));
        }
      }
    },
    [isMuted]
  );

  const stopSound = useCallback(
    (audio: HTMLAudioElement | null) => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = isMuted ? 0 : 1;
      }
    },
    [isMuted]
  );

  const stopAllSounds = useCallback(() => {
    [
      soundBellStartRef.current,
      soundBellFinishRef.current,
      audioRefs.current.preparing,
      audioRefs.current.stretching,
    ].forEach((audio) => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = isMuted ? 0 : 1;
      }
    });
    cancelAnimationFrame(fadeoutAnimationFrameRef.current);
    currentFadingAudioRef.current = null;
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
  }, [isMuted]);

  const pauseAllSounds = useCallback(() => {
    [
      soundBellStartRef.current,
      soundBellFinishRef.current,
      audioRefs.current.preparing,
      audioRefs.current.stretching,
    ].forEach((audio) => {
      if (audio) {
        audio.pause();
      }
    });
    cancelAnimationFrame(fadeoutAnimationFrameRef.current);
  }, []);

  const applyVolume = useCallback(
    (audio: HTMLAudioElement | null, targetVolume: number) => {
      if (audio && !isMuted) {
        audio.volume = targetVolume;
      } else if (audio && isMuted) {
        audio.volume = 0;
      }
    },
    [isMuted]
  );

  const startFade = useCallback(
    (audio: HTMLAudioElement | null, fadeDuration: number) => {
      if (!audio || isMuted) {
        currentFadingAudioRef.current = null;
        return;
      }

      cancelAnimationFrame(fadeoutAnimationFrameRef.current);

      const initialVolume = audio.volume;
      const startTime = Date.now();

      currentFadingAudioRef.current = {
        audio,
        startTime,
        duration: fadeDuration * 1000,
        initialVolume,
      };

      const fadeStep = () => {
        if (!currentFadingAudioRef.current || currentFadingAudioRef.current.audio !== audio) {
          return;
        }

        const elapsed = Date.now() - currentFadingAudioRef.current.startTime;
        const progress = Math.min(1, elapsed / currentFadingAudioRef.current.duration);
        const newVolume = currentFadingAudioRef.current.initialVolume * (1 - progress);

        applyVolume(audio, newVolume);

        if (progress < 1) {
          fadeoutAnimationFrameRef.current = requestAnimationFrame(fadeStep);
        } else {
          stopSound(audio);
          currentFadingAudioRef.current = null;
        }
      };

      fadeoutAnimationFrameRef.current = requestAnimationFrame(fadeStep);
    },
    [isMuted, applyVolume, stopSound]
  );

  const restoreVolumeFromFade = useCallback(
    (audio: HTMLAudioElement | null) => {
      if (audio && currentFadingAudioRef.current && currentFadingAudioRef.current.audio === audio) {
        const { startTime, duration, initialVolume } = currentFadingAudioRef.current;
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        audio.volume = initialVolume * (1 - progress);
        currentFadingAudioRef.current = null;
        cancelAnimationFrame(fadeoutAnimationFrameRef.current);
      } else if (audio) {
        applyVolume(audio, 1);
      }
    },
    [applyVolume]
  );

  const continueFade = useCallback(() => {
    if (currentFadingAudioRef.current) {
      const { audio, startTime, duration, initialVolume } = currentFadingAudioRef.current;
      const now = Date.now();
      const remainingDuration = duration - (now - startTime);

      if (remainingDuration > 0) {
        currentFadingAudioRef.current = {
          audio,
          startTime: now - (duration - remainingDuration),
          duration,
          initialVolume,
        };
        startFade(audio, remainingDuration / 1000);
      } else {
        stopSound(audio);
        currentFadingAudioRef.current = null;
      }
    }
  }, [startFade, stopSound]);

  const handleModeTransition = useCallback(() => {
    if (mode === 'preparing' && audioRefs.current.preparing) {
      stopSound(audioRefs.current.preparing);
    } else if (mode === 'stretching' && audioRefs.current.stretching) {
      stopSound(audioRefs.current.stretching);
    }

    let newMode: TimerMode;
    let newTime: number;

    if (mode === 'sitting') {
      playSound(soundBellFinishRef.current, false);
      newMode = 'preparing';
      newTime = preparationTime;
      playSound(audioRefs.current.preparing!, true);
    } else if (mode === 'preparing') {
      playSound(soundBellFinishRef.current, false);
      newMode = 'stretching';
      newTime = stretchingTime;
      playSound(audioRefs.current.stretching!, true);
    } else {
      newMode = 'sitting';
      newTime = sittingTime;
      playSound(soundBellStartRef.current, false);
    }

    setMode(newMode);
    setTimeLeft(newTime);
    modeStartTimeRef.current = Date.now();
  }, [mode, sittingTime, preparationTime, stretchingTime, playSound, stopSound]);

  useEffect(() => {
    if (!isActive) {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
      stopAllSounds();
      return;
    }

    if (isPaused) {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
      pauseAllSounds();
      return;
    }

    const currentModeDuration =
      mode === 'sitting' ? sittingTime : mode === 'preparing' ? preparationTime : stretchingTime;

    const timeElapsedSinceModeStart = Math.floor((Date.now() - modeStartTimeRef.current) / 1000);
    const calculatedTimeLeft = Math.max(0, currentModeDuration - timeElapsedSinceModeStart);

    if (calculatedTimeLeft !== timeLeft) {
      setTimeLeft(calculatedTimeLeft);
    }

    if (calculatedTimeLeft <= 0) {
      handleModeTransition();
      return;
    }

    if (currentFadingAudioRef.current) {
      continueFade();
    } else {
      if (
        mode === 'preparing' &&
        audioRefs.current.preparing &&
        audioRefs.current.preparing.paused
      ) {
        playSound(audioRefs.current.preparing, true);
      } else if (
        mode === 'stretching' &&
        audioRefs.current.stretching &&
        audioRefs.current.stretching.paused
      ) {
        playSound(audioRefs.current.stretching, true);
      }
    }

    const runTimer = () => {
      const elapsed = Math.floor((Date.now() - modeStartTimeRef.current) / 1000);
      const remaining = Math.max(0, currentModeDuration - elapsed);

      setTimeLeft(remaining);

      const currentAudio =
        mode === 'preparing'
          ? audioRefs.current.preparing
          : mode === 'stretching'
          ? audioRefs.current.stretching
          : null;

      const fadeThreshold =
        mode === 'stretching'
          ? FADE_DURATION_MUSIC
          : mode === 'preparing'
          ? currentModeDuration * 0.5
          : 0;

      if (
        currentAudio &&
        !currentAudio.paused &&
        remaining <= fadeThreshold &&
        !currentFadingAudioRef.current
      ) {
        startFade(currentAudio, remaining > 0 ? remaining : 0.1);
      }

      if (remaining > 0) {
        timerIdRef.current = setTimeout(runTimer, 1000);
      } else {
        handleModeTransition();
      }
    };

    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
    }
    timerIdRef.current = setTimeout(runTimer, 1000);

    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
      cancelAnimationFrame(fadeoutAnimationFrameRef.current);
    };
  }, [
    isActive,
    isPaused,
    mode,
    sittingTime,
    preparationTime,
    stretchingTime,
    handleModeTransition,
    playSound,
    stopAllSounds,
    pauseAllSounds,
    startFade,
    continueFade,
    timeLeft,
  ]);

  useEffect(() => {
    [
      soundBellStartRef.current,
      soundBellFinishRef.current,
      audioRefs.current.preparing,
      audioRefs.current.stretching,
    ].forEach((audio) => {
      if (audio) {
        audio.volume = isMuted ? 0 : audio.paused ? 0 : 1;
      }
    });

    if (currentFadingAudioRef.current) {
      applyVolume(
        currentFadingAudioRef.current.audio,
        currentFadingAudioRef.current.audio?.volume || 0
      );
    }
  }, [isMuted, applyVolume]);

  const handleReset = useCallback(() => {
    setIsActive(false);
    setIsPaused(false);
    setMode('sitting');
    setTimeLeft(sittingTime);
    stopAllSounds();
    modeStartTimeRef.current = Date.now();
  }, [sittingTime, stopAllSounds]);

  const handleHardReset = useCallback(() => {
    setIsActive(false);
    setIsPaused(false);
    setMode('sitting');

    setSittingTime(DEFAULT_TIMES.sitting);
    setStretchingTime(DEFAULT_TIMES.stretching);
    setPreparationTime(DEFAULT_TIMES.preparation);
    setTimeLeft(DEFAULT_TIMES.sitting);

    localStorage.removeItem(LOCAL_STORAGE_KEYS.sitting);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.stretching);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.preparation);

    stopAllSounds();
    modeStartTimeRef.current = Date.now();
  }, [stopAllSounds]);

  const handleMuteToggle = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    if (!newMutedState && currentFadingAudioRef.current) {
      restoreVolumeFromFade(currentFadingAudioRef.current.audio);
      continueFade();
    }
  }, [isMuted, continueFade, restoreVolumeFromFade]);

  const handleStartPause = useCallback(() => {
    if (!isActive) {
      setIsActive(true);
      setIsPaused(false);
      modeStartTimeRef.current = Date.now();

      if (mode === 'sitting') {
        setTimeLeft(sittingTime);
      } else if (mode === 'preparing') {
        setTimeLeft(preparationTime);
      } else if (mode === 'stretching') {
        setTimeLeft(stretchingTime);
      }
      playSound(soundBellStartRef.current, false);
    } else {
      setIsPaused((prevIsPaused) => {
        if (!prevIsPaused) {
          pauseAllSounds();
        } else {
          const currentModeDuration =
            mode === 'sitting'
              ? sittingTime
              : mode === 'preparing'
              ? preparationTime
              : stretchingTime;
          modeStartTimeRef.current = Date.now() - (currentModeDuration - timeLeft) * 1000;
        }
        return !prevIsPaused;
      });
    }
  }, [
    isActive,
    mode,
    playSound,
    pauseAllSounds,
    sittingTime,
    preparationTime,
    stretchingTime,
    timeLeft,
  ]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleTimeChange = useCallback(
    (type: 'sitting' | 'stretching' | 'preparation', value: number) => {
      if (!isActive) {
        if (type === 'sitting') {
          setSittingTime(value * 60);
          if (mode === 'sitting') setTimeLeft(value * 60);
        } else if (type === 'stretching') {
          setStretchingTime(value * 60);
          if (mode === 'stretching') setTimeLeft(value * 60);
        } else {
          setPreparationTime(value);
          if (mode === 'preparing') setTimeLeft(value);
        }
      }
    },
    [isActive, mode]
  );

  return (
    <div className="timer-container">
      <button
        className={`sound-button ${isMuted ? 'sound-on' : 'sound-off'}`}
        onClick={handleMuteToggle}
      >
        {isMuted ? (
          <span className="material-symbols-outlined">volume_off</span>
        ) : (
          <span className="material-symbols-outlined">volume_up</span>
        )}
      </button>
      <div className={`timer-mode ${mode}`}>
        {mode === 'sitting'
          ? '🪁 Próxima pausa em:'
          : mode === 'preparing'
          ? '🔔 Prepare-se para alongar!'
          : '🤸‍♂️ Hora de Alongar!'}
      </div>
      <div
        className={`timer-display ${
          mode === 'sitting'
            ? 'border-sit'
            : mode === 'preparing'
            ? 'border-prep'
            : 'border-stretch'
        }`}
      >
        {formatTime(timeLeft)}
      </div>
      <div className="timer-settings">
        <div>
          <label>Tempo sentado (min): </label>
          <input
            type="number"
            min="1"
            value={Math.floor(sittingTime / 60)}
            onChange={(e) => handleTimeChange('sitting', parseInt(e.target.value))}
            disabled={isActive}
          />
        </div>
        <div>
          <label>Tempo alongando (min): </label>
          <input
            type="number"
            min="5"
            value={Math.floor(stretchingTime / 60)}
            onChange={(e) => handleTimeChange('stretching', parseInt(e.target.value))}
            disabled={isActive}
          />
        </div>
        <div>
          <label>Preparação (seg): </label>
          <input
            type="number"
            min="5"
            max="30"
            value={preparationTime}
            onChange={(e) => handleTimeChange('preparation', parseInt(e.target.value))}
            disabled={isActive}
          />
        </div>
      </div>
      <div className="timer-controls">
        <button onClick={handleStartPause}>
          {!isActive ? 'Iniciar' : isPaused ? 'Continuar' : 'Pausar'}
        </button>
        <button onClick={handleReset}>Resetar</button>
      </div>
      <div className="timer-controls">
        <button onClick={handleHardReset}>Redefinir</button>
      </div>
    </div>
  );
}
