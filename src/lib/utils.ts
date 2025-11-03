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
  let newObj: T = { ...obj }; // Começa com uma cópia rasa do objeto de nível superior

  let current: any = newObj;
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let arrayIndexMatch = key.match(/(\w+)\[(\d+)\]/); // Verifica por padrão de índice de array como 'packages[0]'

    if (arrayIndexMatch) {
      const arrayKey = arrayIndexMatch[1];
      const index = parseInt(arrayIndexMatch[2], 10);

      // Garante que o array exista e cria uma nova cópia para imutabilidade
      current[arrayKey] = Array.isArray(current[arrayKey]) ? [...current[arrayKey]] : [];

      if (i === keys.length - 1) {
        // Última parte do caminho é um elemento de array
        current[arrayKey][index] = value;
      } else {
        // Parte intermediária do caminho é um elemento de array
        // Garante que o elemento no índice seja um objeto e cria uma nova cópia
        current[arrayKey][index] = (typeof current[arrayKey][index] === 'object' && current[arrayKey][index] !== null)
          ? { ...current[arrayKey][index] }
          : {};
        current = current[arrayKey][index];
      }
    } else {
      // Chave de objeto regular
      if (i === keys.length - 1) {
        current[key] = value;
      } else {
        // Garante que o objeto aninhado exista e cria uma nova cópia
        current[key] = (typeof current[key] === 'object' && current[key] !== null)
          ? { ...current[key] }
          : {};
        current = current[key];
      }
    }
  }
  return newObj;
}