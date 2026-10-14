-- Versão do token do admin: a forma de revogar acesso.
--
-- O token leva a versão que o admin tinha quando entrou. O servidor só aceita
-- o token se a versão ainda for a mesma do banco. Subir este número derruba,
-- de uma vez, todo token emitido antes — inclusive um roubado.
--
-- Até aqui não existia como revogar: o servidor só conferia a assinatura, e
-- nem trocar a senha nem apagar o admin invalidava um token já emitido.
ALTER TABLE admins ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
