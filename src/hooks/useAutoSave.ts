import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './use-toast';
import { deepMerge } from '@/lib/utils'; // Import deepMerge

interface AutoSaveOptions {
  key: string;
  debounceMs?: number;
  showToast?: boolean;
}

export const useAutoSave = <T extends object>( // Adicionado 'extends object' para compatibilidade com deepMerge
  initialDataFn: () => T, // Agora é uma função que retorna T
  options: AutoSaveOptions
) => {
  const [data, setData] = useState<T>(() => {
    const initialData = initialDataFn(); // Obter uma cópia fresca dos dados iniciais
    const savedData = localStorage.getItem(options.key);
    console.log(`[useAutoSave - ${options.key}] Initializing. Saved data found:`, !!savedData);
    if (savedData) {
      try {
        const parsedSavedData = JSON.parse(savedData);
        const merged = deepMerge(initialData, parsedSavedData);
        console.log(`[useAutoSave - ${options.key}] Initial state (merged from saved):`, merged);
        return merged;
      } catch (e) {
        console.error(`[useAutoSave - ${options.key}] Error parsing saved data, returning initial.`, e);
        return initialData;
      }
    }
    console.log(`[useAutoSave - ${options.key}] Initial state (no saved data):`, initialData);
    return initialData;
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
      console.log(`[useAutoSave - ${options.key}] Initial mount, skipping save.`);
      return;
    }

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    console.log(`[useAutoSave - ${options.key}] Data changed, scheduling save. New data reference:`, data);

    // Salvar com debounce
    timeoutRef.current = setTimeout(() => {
      try {
        // Usar uma função replacer para JSON.stringify para excluir objetos File
        const dataToSave = JSON.stringify(data, (key, value) => {
          if (value instanceof File) {
            return undefined; // Exclui objetos File da serialização
          }
          return value;
        });
        localStorage.setItem(options.key, dataToSave);
        setHasSavedData(true);
        
        if (options.showToast) {
          toast({
            title: "✓ Salvamento automático",
            description: "Configurações salvas com sucesso",
            duration: 1500,
          });
        }
        console.log(`[useAutoSave - ${options.key}] Auto-save successful. Data saved:`, dataToSave.substring(0, 200) + '...');
      } catch (error) {
        console.error(`[useAutoSave - ${options.key}] Erro ao salvar dados:`, error);
      }
    }, options.debounceMs || 1000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, options.key, options.debounceMs, options.showToast, toast]);

  const clearSavedData = useCallback(() => {
    localStorage.removeItem(options.key);
    setHasSavedData(false);
    setData(initialDataFn()); // Chamar initialDataFn
    console.log(`[useAutoSave - ${options.key}] Cleared saved data and reset to initial.`);
  }, [options.key, initialDataFn]);

  const loadData = useCallback((newData: T) => {
    // Garantir que os dados carregados sejam mesclados com a estrutura inicial
    const merged = deepMerge(initialDataFn(), newData); // Chamar initialDataFn
    setData(merged);
    setHasSavedData(true);
    console.log(`[useAutoSave - ${options.key}] Loaded new data:`, merged);
  }, [initialDataFn]);

  const forceLoad = useCallback(() => {
    const savedData = localStorage.getItem(options.key);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        // Usar deepMerge aqui também para garantir a estrutura completa
        const merged = deepMerge(initialDataFn(), parsedData); // Chamar initialDataFn
        setData(merged);
        setHasSavedData(true);
        console.log(`[useAutoSave - ${options.key}] Force loaded saved data:`, merged);
        return true;
      } catch (e) {
        console.error(`[useAutoSave - ${options.key}] Error parsing saved data during forceLoad, returning false.`, e);
        setHasSavedData(false);
        return false;
      }
    }
    setHasSavedData(false);
    console.log(`[useAutoSave - ${options.key}] No saved data to force load.`);
    return false;
  }, [options.key, initialDataFn]);

  const setDataSafe = useCallback((updater: T | ((prev: T) => T)) => {
    setData(prev => {
      // 1. Obter os novos dados (se for uma função, executa-a com o estado anterior)
      const newPartialData = typeof updater === 'function' ? updater(prev) : updater;
      
      // 2. Mesclar os novos dados sobre o estado anterior para preservar campos não tocados
      const mergedWithPrev = deepMerge(prev, newPartialData);
      
      // 3. Mesclar o resultado com o initialData para garantir que a estrutura completa
      // esteja presente e preencher quaisquer valores padrão que possam estar faltando.
      const finalState = deepMerge(initialDataFn(), mergedWithPrev); // Chamar initialDataFn
      
      console.log(`[useAutoSave - ${options.key}] setDataSafe called. Prev:`, prev, 'NewPartial:', newPartialData, 'FinalState:', finalState);
      return finalState; // Retorna o estado final
    });
  }, [initialDataFn, options.key]);

  return {
    data,
    setData: setDataSafe,
    clearSavedData,
    loadData,
    forceLoad,
    hasSavedData
  };
};