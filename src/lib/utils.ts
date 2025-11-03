import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Realiza uma fusão profunda de dois objetos, priorizando os valores do objeto 'source'.
 * Se uma propriedade em 'source' for um objeto e também existir em 'target', a fusão é recursiva.
 * Caso contrário, a propriedade de 'source' sobrescreve a de 'target'.
 *
 * @param target O objeto base para onde as propriedades serão mescladas.
 * @param source O objeto cujas propriedades serão mescladas em 'target'.
 * @returns Um novo objeto com as propriedades mescladas.
 */
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const output = { ...target };

  if (target && typeof target === 'object' && source && typeof source === 'object') {
    Object.keys(source).forEach(key => {
      const targetValue = target[key as keyof T];
      const sourceValue = source[key as keyof T];

      // Se ambos são objetos (e não arrays), faz a fusão profunda
      if (
        sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
        targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)
      ) {
        output[key as keyof T] = deepMerge(targetValue as object, sourceValue as object) as T[keyof T];
      } else {
        // Caso contrário, sobrescreve com o valor de source
        output[key as keyof T] = sourceValue as T[keyof T];
      }
    });
  }

  return output;
}

/**
 * Atualiza um valor aninhado em um objeto de forma imutável.
 * Retorna um novo objeto com o valor no caminho especificado atualizado.
 *
 * @param obj O objeto original.
 * @param path O caminho da propriedade a ser atualizada (ex: 'form_fields.packages[0].name').
 * @param value O novo valor.
 * @returns Um novo objeto com a propriedade atualizada.
 */
export function setNestedValue<T extends object>(obj: T, path: string, value: any): T {
  const keys = path.split('.');
  if (keys.length === 0) {
    return value;
  }

  // Cria uma cópia rasa do objeto raiz para iniciar a atualização imutável
  const newRoot = Array.isArray(obj) ? [...obj] : { ...obj };
  let currentLevel: any = newRoot;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const isLastKey = i === keys.length - 1;

    const arrayMatch = key.match(/(\w+)\[(\d+)\]/);

    if (arrayMatch) {
      const arrayName = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);

      // Garante que o array exista e cria uma nova cópia dele
      if (!Array.isArray(currentLevel[arrayName])) {
        currentLevel[arrayName] = [];
      }
      currentLevel[arrayName] = [...currentLevel[arrayName]];

      if (isLastKey) {
        currentLevel[arrayName][index] = value;
      } else {
        // Clona o objeto/array aninhado dentro do elemento do array
        currentLevel[arrayName][index] = (typeof currentLevel[arrayName][index] === 'object' && currentLevel[arrayName][index] !== null)
          ? (Array.isArray(currentLevel[arrayName][index]) ? [...currentLevel[arrayName][index]] : { ...currentLevel[arrayName][index] })
          : {};
        currentLevel = currentLevel[arrayName][index];
      }
    } else {
      // Chave de objeto regular
      if (isLastKey) {
        currentLevel[key] = value;
      } else {
        // Clona o objeto/array aninhado
        currentLevel[key] = (typeof currentLevel[key] === 'object' && currentLevel[key] !== null)
          ? (Array.isArray(currentLevel[key]) ? [...currentLevel[key]] : { ...currentLevel[key] })
          : {};
        currentLevel = currentLevel[key];
      }
    }
  }
  return newRoot as T;
}