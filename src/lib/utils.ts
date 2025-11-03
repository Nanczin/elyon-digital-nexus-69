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
    return value; // Caso base: se o caminho estiver vazio, substitui o objeto inteiro
  }

  // Cria uma cópia rasa do nível atual para manter a imutabilidade
  const newObj = Array.isArray(obj) ? [...obj] : { ...obj };

  const currentKey = keys[0];
  const remainingPath = keys.slice(1).join('.');

  const arrayMatch = currentKey.match(/(\w+)\[(\d+)\]/);

  if (arrayMatch) {
    const arrayName = arrayMatch[1];
    const index = parseInt(arrayMatch[2], 10);

    // Garante que a propriedade seja um array e cria uma nova cópia dele
    if (!Array.isArray((newObj as any)[arrayName])) {
      (newObj as any)[arrayName] = [];
    }
    const newArray = [...(newObj as any)[arrayName]];

    if (remainingPath) {
      // Recursão para objeto/array aninhado dentro do elemento do array
      newArray[index] = setNestedValue(
        (newArray[index] && typeof newArray[index] === 'object' && newArray[index] !== null) ? newArray[index] : {},
        remainingPath,
        value
      );
    } else {
      // Última parte do caminho é um elemento do array
      newArray[index] = value;
    }
    (newObj as any)[arrayName] = newArray;
  } else {
    // Chave de objeto regular
    if (remainingPath) {
      // Recursão para objeto aninhado
      newObj[currentKey as keyof T] = setNestedValue(
        (newObj[currentKey as keyof T] && typeof newObj[currentKey as keyof T] === 'object' && newObj[currentKey as keyof T] !== null) ? newObj[currentKey as keyof T] : {},
        remainingPath,
        value
      ) as T[keyof T];
    } else {
      // Última parte do caminho é uma chave regular
      newObj[currentKey as keyof T] = value;
    }
  }

  return newObj;
}