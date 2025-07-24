import React, { useState, useCallback, useEffect, useRef } from 'react';

interface UseNumericInputProps {
  initialValue: number;
  setter: React.Dispatch<React.SetStateAction<number>>;
  minValue: number;
  maxValue: number;
  conversionUnit?: number;
}

export const useNumericInput = ({
  initialValue,
  setter,
  minValue,
  maxValue,
  conversionUnit = 1,
}: UseNumericInputProps) => {
  const [inputValue, setInputValue] = useState<string>(
    String(Math.floor(initialValue / conversionUnit))
  );

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const currentDisplayedValue = String(Math.floor(initialValue / conversionUnit));

    if (
      inputRef.current &&
      document.activeElement !== inputRef.current
    ) {
      if (inputValue !== currentDisplayedValue) {
        setInputValue(currentDisplayedValue);
      }
    }
  }, [initialValue, conversionUnit]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    if (newValue.length > 3) {
      newValue = newValue.slice(0, 3);
    }

    if (!/^\d*$/.test(newValue)) {
      return;
    }

    setInputValue(newValue);
  }, []);

  const handleInputBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const finalRawValue = e.target.value;
      let parsedValue: number;

      if (finalRawValue === '' || isNaN(parseInt(finalRawValue, 10))) {
        parsedValue = minValue;
      } else {
        parsedValue = parseInt(finalRawValue, 10);
      }

      parsedValue = Math.max(minValue, parsedValue);
      parsedValue = Math.min(maxValue, parsedValue);

      setter(parsedValue * conversionUnit);
      setInputValue(String(parsedValue));
    },
    [setter, minValue, maxValue, conversionUnit]
  );

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  }, []);

  return { inputValue, handleInputChange, handleInputBlur, handleInputKeyDown, inputRef };
};