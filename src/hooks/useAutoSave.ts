import { useState, useEffect, useRef } from 'react';
import { useToast } from './use-toast';

interface AutoSaveOptions {
  key: string;
  debounceMs?: number;
  showToast?: boolean;
}

export const useAutoSave = <T>(
  initialData: T,
  options: AutoSaveOptions
) => {
  const [data, setData] = useState<T>(() => {
    // Tentar carregar dados salvos do localStorage
    const savedData = localStorage.getItem(options.key);
    if (savedData) {
      try {
        // Fazer cópia profunda para evitar mutações compartilhadas
        return JSON.parse(JSON.stringify(JSON.parse(savedData)));
      } catch {
        return JSON.parse(JSON.stringify(initialData));
      }
    }
    return JSON.parse(JSON.stringify(initialData));
  });
  
  const [hasSavedData, setHasSavedData] = useState<boolean>(() => {
    return localStorage.getItem(options.key) !== null;
  });
  
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Não salvar no primeiro mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Salvar com debounce
    timeoutRef.current = setTimeout(() => {
      try {
        // Fazer cópia profunda antes de salvar para evitar referências compartilhadas
        localStorage.setItem(options.key, JSON.stringify(JSON.parse(JSON.stringify(data))));
        setHasSavedData(true);
        
        if (options.showToast) {
          toast({
            title: "✓ Salvamento automático",
            description: "Configurações salvas com sucesso",
            duration: 1500,
          });
        }
      } catch (error) {
        console.error('Erro ao salvar dados:', error);
      }
    }, options.debounceMs || 1000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, options.key, options.debounceMs, options.showToast, toast]);

  const clearSavedData = () => {
    localStorage.removeItem(options.key);
    setHasSavedData(false);
    setData(JSON.parse(JSON.stringify(initialData)));
  };

  const loadData = (newData: T) => {
    setData(JSON.parse(JSON.stringify(newData)));
  };

  const forceLoad = () => {
    const savedData = localStorage.getItem(options.key);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setData(JSON.parse(JSON.stringify(parsedData)));
        setHasSavedData(true);
        return true;
      } catch {
        setHasSavedData(false);
        return false;
      }
    }
    setHasSavedData(false);
    return false;
  };

  const setDataSafe = (newData: T | ((prev: T) => T)) => {
    if (typeof newData === 'function') {
      setData(prev => {
        const result = (newData as Function)(prev);
        return JSON.parse(JSON.stringify(result));
      });
    } else {
      setData(JSON.parse(JSON.stringify(newData)));
    }
  };

  return {
    data,
    setData: setDataSafe,
    clearSavedData,
    loadData,
    forceLoad,
    hasSavedData
  };
};