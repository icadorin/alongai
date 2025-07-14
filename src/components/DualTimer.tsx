import { useState, useEffect, useRef } from 'react';

type TimerMode = 'sitting' | 'stretching';

export function DualTimer() {
  const sittingTime = 2 * 60;
  const stretchingTime = 1 * 60;

  const [timeLeft, setTimeLeft] = useState(sittingTime);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<TimerMode>('sitting');
  const [endTime, setEndTime] = useState(0);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    if (timeLeft <= 0) {
      const nextMode = mode === 'sitting' ? 'stretching' : 'sitting';
      const nextTime = nextMode === 'sitting' ? sittingTime : stretchingTime;

      setMode(nextMode);
      setTimeLeft(nextTime);

      if (isActive) {
        setEndTime(Date.now() + nextTime * 1000);
      }
    }
  }, [timeLeft, isActive, mode]);

  useEffect(() => {
    if (!isActive) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));

      setTimeLeft(remaining);
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    };

    setEndTime(Date.now() + timeLeft * 1000);
    animationFrameRef.current = requestAnimationFrame(updateTimer);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, timeLeft]);

  const handleReset = () => {
    setIsActive(false);
    setMode('sitting');
    setTimeLeft(sittingTime);
  };

  const handleStartPause = () => {
    if (!isActive) {
      setEndTime(Date.now() + timeLeft * 1000);
    }
    setIsActive((prev) => !prev);
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="timer-container">
      <div className={`timer-mode ${mode}`}>
        {mode === 'sitting' ? 'Tempo Sentado' : 'Hora de Alongar!'}
      </div>
      <div className="timer-display">{formatTime(timeLeft)}</div>
      <div className="timer-controls">
        <button onClick={handleStartPause}>{isActive ? 'Pausar' : 'Iniciar'}</button>
        <button onClick={handleReset}>Resetar</button>
      </div>
    </div>
  );
}
