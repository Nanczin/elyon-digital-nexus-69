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
  const numKeys = keys.length;

  if (numKeys === 0) {
    return value; // Se o caminho estiver vazio, substitui o objeto inteiro
  }

  // Função auxiliar recursiva para atualizar o objeto de forma imutável
  const update = (currentObj: any, currentKeys: string[], depth: number): any => {
    const key = currentKeys[depth];
    const isLastKey = depth === numKeys - 1;

    // Verifica se a chave é um acesso a array (ex: 'packages[0]')
    const arrayMatch = key.match(/(\w+)\[(\d+)\]/);
    if (arrayMatch) {
      const arrayName = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);

      // Garante que `currentObj[arrayName]` é um array e cria uma nova cópia
      const newArray = Array.isArray(currentObj[arrayName]) ? [...currentObj[arrayName]] : [];

      // Garante que o elemento no índice exista e seja um objeto se for necessário recursão
      if (isLastKey) {
        newArray[index] = value;
      } else {
        newArray[index] = update(
          (newArray[index] && typeof newArray[index] === 'object' && newArray[index] !== null) ? newArray[index] : {},
          currentKeys,
          depth + 1
        );
      }

      // Retorna uma nova cópia do objeto pai com o novo array
      return { ...currentObj, [arrayName]: newArray };

    } else {
      // Acesso a propriedade de objeto regular
      if (isLastKey) {
        return { ...currentObj, [key]: value };
      } else {
        // Garante que o objeto aninhado exista e cria uma nova cópia
        const nextObj = (currentObj[key] && typeof currentObj[key] === 'object' && currentObj[key] !== null)
          ? currentObj[key]
          : {};
        return { ...currentObj, [key]: update(nextObj, currentKeys, depth + 1) };
      }
    }
  };

  return update(obj, keys, 0);
}