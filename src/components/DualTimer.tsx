import { useState, useEffect, useRef } from 'react';
import bellStart from '@sounds/bell-start.mp3';
import bellFinish from '@sounds/bell-finish.mp3';
import mediumBell from '@sounds/medium-bell-ringing-far.mp3';
import championSound from '@sounds/champion-telecasted.mp3';

type TimerMode = 'sitting' | 'preparing' | 'stretching';

export function DualTimer() {
  const [isMuted, setIsMuted] = useState(false);
  const [sittingTime, setSittingTime] = useState(3);
  const [stretchingTime, setStretchingTime] = useState(15);
  const [preparationTime, setPreparationTime] = useState(10);

  const [timeLeft, setTimeLeft] = useState(sittingTime);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [mode, setMode] = useState<TimerMode>('sitting');
  const animationFrameRef = useRef<number>(0);
  const lastModeRef = useRef<TimerMode>(mode);

  const pausedTimeLeftRef = useRef<number | null>(null);
  const soundStartRef = useRef<HTMLAudioElement | null>(null);
  const soundTransitionRef = useRef<HTMLAudioElement | null>(null);
  const soundPreparationRef = useRef<HTMLAudioElement | null>(null);
  const soundStretchingRef = useRef<HTMLAudioElement | null>(null);
  const soundsLoadedRef = useRef(false);

  useEffect(() => {
    soundStartRef.current = new Audio(bellStart);
    soundTransitionRef.current = new Audio(bellFinish);
    soundPreparationRef.current = new Audio(mediumBell);
    soundStretchingRef.current = new Audio(championSound);

    Promise.all([
      new Promise((resolve) => soundStartRef.current?.addEventListener('canplaythrough', resolve)),
      new Promise((resolve) =>
        soundTransitionRef.current?.addEventListener('canplaythrough', resolve)
      ),
      new Promise((resolve) =>
        soundPreparationRef.current?.addEventListener('canplaythrough', resolve)
      ),
      new Promise((resolve) =>
        soundStretchingRef.current?.addEventListener('canplaythrough', resolve)
      ),
    ])
      .then(() => {
        soundsLoadedRef.current = true;
        console.log('Sons carregados!');
      })
      .catch(console.error);

    return () => {
      [soundStartRef, soundTransitionRef, soundPreparationRef, soundStretchingRef].forEach(
        (ref) => {
          ref.current?.pause();
          ref.current = null;
        }
      );
    };
  }, []);

  const useLongFadeOut = (
    audioRef: React.RefObject<HTMLAudioElement>,
    duration: number,
    isActive: boolean,
    isPaused: boolean
  ) => {
    const savedProgress = useRef<number | null>(null);
    const fadeAnimationId = useRef<number | null>(null);

    useEffect(() => {
      if (!audioRef.current) return;

      const audio = audioRef.current;
      const FADE_DURATION = 9;
      const initialVolume = audio.volume;

      // Limpa qualquer animação existente
      if (fadeAnimationId.current) {
        cancelAnimationFrame(fadeAnimationId.current);
        fadeAnimationId.current = null;
      }

      const fadeOut = () => {
        if (!isActive || isPaused) {
          if (isPaused) {
            // Salva o progresso atual ao pausar
            const remaining = duration - (audio.currentTime || 0);
            savedProgress.current = remaining / FADE_DURATION;
          }
          return;
        }

        const remaining = duration - (audio.currentTime || 0);
        const progress =
          savedProgress.current !== null ? savedProgress.current : remaining / FADE_DURATION;

        if (remaining <= FADE_DURATION) {
          audio.volume = initialVolume * (1 - Math.pow(1 - progress, 0.7));
          savedProgress.current = null;
        }

        if (remaining > 1) {
          fadeAnimationId.current = requestAnimationFrame(fadeOut);
        } else {
          audio.volume = 0;
        }
      };

      // Aplica o volume inicial quando despausado
      if (!isPaused && isActive) {
        audio.volume = initialVolume;
      }

      fadeAnimationId.current = requestAnimationFrame(fadeOut);

      return () => {
        if (fadeAnimationId.current) {
          cancelAnimationFrame(fadeAnimationId.current);
        }
      };
    }, [isActive, isPaused, duration]);
  };

  const useShortFadeOut = (
    audioRef: React.RefObject<HTMLAudioElement>,
    duration: number,
    isActive: boolean
  ) => {
    useEffect(() => {
      if (!isActive || !audioRef.current) return;

      const audio = audioRef.current;
      let fadeAnimationId: number;
      const FADE_DURATION = duration * 0.5; // 50% do tempo total
      const initialVolume = audio.volume;

      const fadeOut = () => {
        const remaining = duration - (audio.currentTime || 0);

        if (remaining <= FADE_DURATION) {
          const progress = remaining / FADE_DURATION;
          audio.volume = initialVolume * progress; // Linear simples
        }

        if (remaining > 0) {
          fadeAnimationId = requestAnimationFrame(fadeOut);
        } else {
          audio.volume = 0;
        }
      };

      fadeAnimationId = requestAnimationFrame(fadeOut);

      return () => {
        cancelAnimationFrame(fadeAnimationId);
        audio.volume = initialVolume;
      };
    }, [isActive, duration]);
  };
  // TODO ARRUMAR O PAUSE, TIME NÃO ESTA PARANDO, ARRUMAR O ESTADO DO FADEOUT NO PAUSE PARA RESGATAR NO PLAY
  // No seu componente:
  useLongFadeOut(soundStretchingRef, stretchingTime, isActive && mode === 'stretching', isPaused);

  useShortFadeOut(soundPreparationRef, preparationTime, isActive && mode === 'preparing');

  useEffect(() => {
    if (!isActive) {
      cancelAnimationFrame(animationFrameRef.current);
      stopSound(soundStretchingRef.current);
      stopSound(soundPreparationRef.current);
      return;
    }

    if (isPaused) {
      cancelAnimationFrame(animationFrameRef.current);
      // Quando pausado, armazenamos o tempo restante
      pausedTimeLeftRef.current = timeLeft;
      return;
    }

    // Quando despausado, usamos o tempo armazenado ou o tempo normal
    const initialTimeLeft =
      pausedTimeLeftRef.current !== null ? pausedTimeLeftRef.current : timeLeft;
    pausedTimeLeftRef.current = null;

    const startTime = Date.now();
    const endTime = startTime + initialTimeLeft * 1000;

    const updateTimer = () => {
      if (isPaused) return; // Não atualiza se estiver pausado

      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));

      setTimeLeft(remaining);

      if (remaining > 0) {
        animationFrameRef.current = requestAnimationFrame(updateTimer);
      } else {
        if (mode === 'sitting') {
          playSound(soundTransitionRef.current);
          setMode('preparing');
          setTimeLeft(preparationTime);
        } else if (mode === 'preparing') {
          stopSound(soundPreparationRef.current);
          playSound(soundStretchingRef.current);
          setMode('stretching');
          setTimeLeft(stretchingTime);
        } else {
          stopSound(soundStretchingRef.current);
          playSound(soundStartRef.current);
          setMode('sitting');
          setTimeLeft(sittingTime);
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateTimer);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isActive, isPaused, mode, preparationTime, sittingTime, stretchingTime, timeLeft]);

  const playSound = async (audio: HTMLAudioElement | null) => {
    if (!audio || !soundsLoadedRef.current || isMuted) return; // Adicionada verificação de isMuted

    try {
      audio.volume = isMuted ? 0 : 1; // Garante volume zero se muted
      await audio.play();
    } catch (error) {
      console.error('Erro ao reproduzir som:', error);
      if (audio.src) {
        audio.load();
        await audio.play();
      }
    }
  };

  const stopSound = (audio: HTMLAudioElement | null) => {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = isMuted ? 0 : 1; // Respeita o estado de mute
  };

  useEffect(() => {
    if (mode !== lastModeRef.current) {
      lastModeRef.current = mode;

      if (!isActive) return;

      switch (mode) {
        case 'preparing':
          playSound(soundTransitionRef.current);
          playSound(soundPreparationRef.current);
          if (soundPreparationRef.current) {
            soundPreparationRef.current.loop = true;
          }
          break;
        case 'stretching':
          stopSound(soundPreparationRef.current);
          playSound(soundStretchingRef.current);
          if (soundStretchingRef.current) {
            soundStretchingRef.current.loop = true;
          }
          break;
        case 'sitting':
          stopSound(soundStretchingRef.current);
          break;
      }
    }
  }, [mode, isActive]);

  const handleReset = () => {
    setIsActive(false);
    setMode('sitting');
    setTimeLeft(sittingTime);
    stopSound(soundStretchingRef.current);
    stopSound(soundPreparationRef.current);
  };

  const handleStartPause = () => {
    if (!isActive) {
      playSound(soundStartRef.current);
      setIsActive(true);
      setIsPaused(false);
    } else {
      const newPausedState = !isPaused;
      setIsPaused(newPausedState);

      if (newPausedState) {
        // Pausando
        soundStretchingRef.current?.pause();
        soundPreparationRef.current?.pause();
      } else {
        // Despausando - restaura volume antes de tocar
        if (soundStretchingRef.current && mode === 'stretching') {
          soundStretchingRef.current.volume = 1;
          soundStretchingRef.current.play();
        }
        if (soundPreparationRef.current && mode === 'preparing') {
          soundPreparationRef.current.volume = 1;
          soundPreparationRef.current.play();
        }
      }
    }
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleTimeChange = (type: 'sitting' | 'stretching' | 'preparation', value: number) => {
    if (!isActive) {
      if (type === 'sitting') {
        setSittingTime(value);
        if (mode === 'sitting') setTimeLeft(value);
      } else if (type === 'stretching') {
        setStretchingTime(value);
        if (mode === 'stretching') setTimeLeft(value);
      } else {
        setPreparationTime(value);
        if (mode === 'preparing') setTimeLeft(value);
      }
    }
  };

  return (
    <div className="timer-container">
      <div className={`timer-mode ${mode}`}>
        {mode === 'sitting'
          ? '🪁 Próxima pausa em:'
          : mode === 'preparing'
          ? '🔔 Prepare-se para alongar!'
          : '🤸‍♂️ Hora de Alongar!'}
      </div>
      <div className="timer-display">{formatTime(timeLeft)}</div>

      <div className="timer-settings">
        <div>
          <label>Tempo sentado (min): </label>
          <input
            type="number"
            min="1"
            value={Math.floor(sittingTime / 60)}
            onChange={(e) => handleTimeChange('sitting', parseInt(e.target.value) * 60)}
            disabled={isActive}
          />
        </div>
        <div>
          <label>Tempo alongando (min): </label>
          <input
            type="number"
            min="1"
            value={Math.floor(stretchingTime / 60)}
            onChange={(e) => handleTimeChange('stretching', parseInt(e.target.value) * 60)}
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
        <button onClick={handleStartPause}>{isActive ? 'Pausar' : 'Iniciar'}</button>
        <button onClick={handleReset}>Resetar</button>
      </div>
      <button onClick={() => setIsMuted(!isMuted)}>
        {isMuted ? '🔇 Ativar Som' : '🔈 Silenciar'}
      </button>
    </div>
  );
}
