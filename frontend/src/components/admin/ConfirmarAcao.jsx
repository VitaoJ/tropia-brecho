import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/**
 * Confirmação antes de uma ação que não dá para desfazer.
 *
 * Substitui o `confirm()` do navegador, que não trapeia foco, não fecha no
 * Esc de forma previsível, aparece com a cara do sistema e — no celular —
 * some se a aba perder o foco. O AlertDialog do Radix resolve os três: prende
 * o foco dentro, devolve para quem abriu ao fechar e anuncia o texto para
 * leitor de tela.
 *
 * É `AlertDialog` e não `Dialog` de propósito: alerta não fecha ao clicar
 * fora, porque perder um clique não pode significar apagar sem querer.
 */
export default function ConfirmarAcao({
  aberto,
  titulo,
  descricao,
  rotuloConfirmar = 'Confirmar',
  destrutivo = false,
  aoConfirmar,
  aoFechar,
}) {
  return (
    <AlertDialog open={aberto} onOpenChange={(o) => { if (!o) aoFechar() }}>
      <AlertDialogContent className="bg-[#eae1d4] border-[#d6c8b3] max-w-[420px] rounded-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#250000] text-base font-medium">
            {titulo}
          </AlertDialogTitle>
          {descricao && (
            <AlertDialogDescription className="text-[13px] leading-relaxed text-[#654a2b]">
              {descricao}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel
            className="h-10 px-4 text-[12px] tracking-[0.08em] rounded-sm mt-0
              border-[#d6c8b3] bg-transparent text-[#654a2b] hover:bg-[#e0d4c2] hover:text-[#250000]">
            Voltar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={aoConfirmar}
            className={`h-10 px-4 text-[12px] tracking-[0.08em] rounded-sm ${
              destrutivo
                ? 'bg-[#7a1f1f] text-[#eae1d4] hover:bg-[#5e1717]'
                : 'bg-[#250000] text-[#eae1d4] hover:bg-[#432d1c]'
            }`}>
            {rotuloConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
