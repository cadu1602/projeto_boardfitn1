-- Migração: cria só a tabela "Minhas pranchas" no banco que JÁ EXISTE (não apaga dados).
-- Rode no pgAdmin (Query Tool, banco board_fit) ou:
--   psql -U postgres -h leandro -d board_fit -f migracao_prancha_salva.sql
SET search_path = boardfit;

CREATE TABLE IF NOT EXISTS prancha_salva (
    id             BIGSERIAL     PRIMARY KEY,
    cliente_id     UUID          NOT NULL,
    modelo_id      INTEGER       NOT NULL REFERENCES modelo_prancha(id),
    nivel_id       SMALLINT      NOT NULL REFERENCES nivel_surf(id),
    litragem       NUMERIC(5,1)  NOT NULL CHECK (litragem BETWEEN 10 AND 120),
    tamanho        VARCHAR(10)   NOT NULL DEFAULT '',
    nota           VARCHAR(80)   NOT NULL DEFAULT '',
    criada_em      TIMESTAMP     NOT NULL DEFAULT now(),
    atualizada_em  TIMESTAMP     NOT NULL DEFAULT now(),
    UNIQUE (cliente_id, modelo_id, litragem, tamanho)
);
CREATE INDEX IF NOT EXISTS ix_prancha_salva_cliente ON prancha_salva (cliente_id);
