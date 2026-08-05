// Reserva de peça durante o checkout.
//
// Por que expiração e não "soltar quando a pessoa sair": não dá para saber
// quando alguém saiu. Fechar a aba às vezes avisa; ficar sem sinal, trocar de
// app no celular ou o navegador matar a aba em segundo plano, nunca. Então o
// prazo é a garantia, e o aviso de saída (POST /reservas/liberar) é só um
// atalho que devolve a peça mais cedo quando dá certo.

// Tempo para preencher o formulário do checkout.
export const RESERVA_MINUTOS = 10

// Depois que o pedido é criado, a peça precisa ficar segurada enquanto o
// pagamento está aberto. O código PIX do Mercado Pago vive ~30 min: se a
// reserva morresse antes, a peça voltaria à vitrine e alguém poderia comprar
// uma peça que o primeiro ainda está pagando.
export const RESERVA_PAGAMENTO_MINUTOS = 30

// Reserva vencida não vale. Usar sempre em conjunto com `sold = FALSE`.
export const SEM_DONO = '(p.reserved_until IS NULL OR p.reserved_until < NOW())'

/** A peça está livre, ou já é desta sessão? `param` é o placeholder do $n. */
export const livrePara = (param) =>
  `(reserved_until IS NULL OR reserved_until < NOW() OR reserved_by = ${param})`

/** Alguém *de fora* está segurando esta peça agora. */
export const reservadaPorOutro = (peca, sessao) =>
  peca.reserved_until != null
  && new Date(peca.reserved_until) > new Date()
  && peca.reserved_by !== sessao

export const daquiAMinutos = (minutos) => new Date(Date.now() + minutos * 60_000)
