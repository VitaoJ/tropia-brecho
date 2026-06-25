# Database — Tropia Brechó

## Como rodar as migrations

1. Crie o banco no PostgreSQL:
```sql
CREATE DATABASE tropia;
```

2. Execute o schema:
```bash
psql -d tropia -f migrations/001_create_tables.sql
```

## Tabelas

| Tabela | Descrição |
|--------|-----------|
| `categories` | Categorias das peças (Feminino, Masculino, Calçados, Acessórios) |
| `products` | Peças do brechó com fotos, tamanho, condição |
| `customers` | Clientes que realizaram pedidos |
| `addresses` | Endereços de entrega dos clientes |
| `orders` | Pedidos com status e dados de pagamento |
| `order_items` | Itens de cada pedido |
| `admins` | Usuário admin para acessar a dashboard |
