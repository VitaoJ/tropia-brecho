// Pequenas normalizações de texto vindo do painel.

/** "Peças Únicas!" → "pecas-unicas" — para URL. */
export function slugificar(texto) {
  return String(texto ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * Tags da peça: minúsculas, espaço único, sem repetir, até 8 de até 24 letras.
 *
 * Minúscula porque tag é digitada à mão: sem isso "Anos 90" e "anos 90"
 * virariam duas tags, e clicar numa não acharia as peças da outra.
 */
export function normalizarTags(lista) {
  if (!Array.isArray(lista)) return []
  const limpas = lista
    .flatMap(t => String(t ?? '').split(','))   // "a, b" colado vira duas
    .map(t => t.trim().toLowerCase().replace(/\s+/g, ' ').replace(/^#+/, ''))
    .filter(t => t.length > 0 && t.length <= 24)
  return [...new Set(limpas)].slice(0, 8)
}
