import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Junta classes do Tailwind resolvendo conflito.
 *
 * `twMerge` é o que faz `cn('p-2', 'p-4')` virar `p-4` em vez das duas: sem
 * ele, passar uma classe por prop para um componente do shadcn não
 * sobrescreveria a interna, e o resultado dependeria da ordem no CSS.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
