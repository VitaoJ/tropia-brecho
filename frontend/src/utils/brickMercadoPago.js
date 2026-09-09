/**
 * Carrega o SDK do Mercado Pago uma vez só.
 *
 * O script é global e não pode ser incluído duas vezes: em SPA a mesma tela
 * monta e desmonta várias vezes, e cada `<script>` novo redefine o
 * `window.MercadoPago` no meio de um Brick vivo. Guardar a promessa faz todas
 * as chamadas esperarem o mesmo carregamento.
 */
const URL_SDK = 'https://sdk.mercadopago.com/js/v2'

let carregando = null

export function carregarSdk() {
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago)
  if (carregando) return carregando

  carregando = new Promise((resolve, reject) => {
    // Se a tag já está na página (recarga de tela), espera a que existe.
    const existente = document.querySelector(`script[src="${URL_SDK}"]`)
    const script = existente ?? document.createElement('script')

    const pronto = () => window.MercadoPago
      ? resolve(window.MercadoPago)
      : reject(new Error('SDK do Mercado Pago carregou sem se registrar'))

    script.addEventListener('load', pronto)
    script.addEventListener('error', () => {
      carregando = null   // deixa tentar de novo depois
      reject(new Error('Não foi possível carregar o Mercado Pago'))
    })

    if (!existente) {
      script.src = URL_SDK
      script.async = true
      document.head.appendChild(script)
    } else if (window.MercadoPago) {
      pronto()
    }
  })

  return carregando
}
