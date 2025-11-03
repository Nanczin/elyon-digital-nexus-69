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
  const newObj = { ...obj }; // Cópia superficial do nível superior

  let current: any = newObj;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (i === keys.length - 1) {
      current[key] = value;
    } else {
      // Se o valor da chave atual não for um objeto ou for null/undefined,
      // inicialize-o como um objeto vazio para evitar erros.
      // Garanta que estamos sempre trabalhando em uma cópia.
      if (typeof current[key] !== 'object' || current[key] === null || Array.isArray(current[key])) {
        current[key] = {};
      } else {
        current[key] = { ...current[key] }; // Cópia profunda do objeto aninhado
      }
      current = current[key];
    }
  }
  return newObj;
}