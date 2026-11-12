-- =====================================================================
-- BoardFit — O seu Shaper Virtual
-- Banco de dados (PostgreSQL 14+)
-- PMI II — Modelagem Computacional Ágil | ADS21 | UNICESUSC
--
-- Baseado na ERS v2.0 (RF-001 a RF-008, RN-001 a RN-006, RNF-001 a RNF-007).
-- Como rodar:  psql -U postgres -d boardfit -f boardfit_banco_de_dados.sql
-- =====================================================================

DROP SCHEMA IF EXISTS boardfit CASCADE;
CREATE SCHEMA boardfit;
SET search_path = boardfit;

-- ---------------------------------------------------------------------
-- 1. NÍVEIS DE SURF E PARÂMETROS DO CÁLCULO (RF-001, RF-002, RNF-004)
-- Os coeficientes ficam no banco (tabela nivel_surf) e podem ser ajustados por SQL
-- sem mexer no código. Mesma entrada => mesma saída (determinístico).
-- ---------------------------------------------------------------------
CREATE TABLE nivel_surf (
    id               SMALLINT      PRIMARY KEY,
    nome             VARCHAR(30)   NOT NULL UNIQUE,
    litros_por_kg    NUMERIC(4,3)  NOT NULL CHECK (litros_por_kg > 0),
    ajuste_por_cm    NUMERIC(4,3)  NOT NULL DEFAULT 0.050,  -- litros por cm acima/abaixo de 170 cm
    versao_formula   VARCHAR(10)   NOT NULL DEFAULT '1.0'
);

-- ---------------------------------------------------------------------
-- 2. CATÁLOGO TÉCNICO (RF-003, RF-004, RN-001, RN-004)
-- ---------------------------------------------------------------------
CREATE TABLE modelo_prancha (
    id             SERIAL         PRIMARY KEY,
    nome           VARCHAR(60)    NOT NULL UNIQUE,
    descricao      VARCHAR(300),
    litragem_min   NUMERIC(5,1)   NOT NULL CHECK (litragem_min > 0),
    litragem_max   NUMERIC(5,1)   NOT NULL,
    ativo          BOOLEAN        NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_faixa_litragem CHECK (litragem_max > litragem_min)  -- RN-001
);

-- Níveis para os quais cada modelo é adequado (N:N)
CREATE TABLE modelo_nivel (
    modelo_id  INTEGER   NOT NULL REFERENCES modelo_prancha(id) ON DELETE CASCADE,
    nivel_id   SMALLINT  NOT NULL REFERENCES nivel_surf(id),
    PRIMARY KEY (modelo_id, nivel_id)
);

CREATE TABLE tipo_quilha (
    id    SMALLINT     PRIMARY KEY,
    nome  VARCHAR(30)  NOT NULL UNIQUE
);

-- RN-004: a quilha é sempre derivada do modelo (nunca calculada à parte)
CREATE TABLE modelo_quilha (
    modelo_id  INTEGER   NOT NULL REFERENCES modelo_prancha(id) ON DELETE CASCADE,
    quilha_id  SMALLINT  NOT NULL REFERENCES tipo_quilha(id),
    padrao     BOOLEAN   NOT NULL DEFAULT FALSE,
    PRIMARY KEY (modelo_id, quilha_id)
);
-- no máximo uma quilha "padrão" por modelo
CREATE UNIQUE INDEX uq_modelo_quilha_padrao
    ON modelo_quilha (modelo_id) WHERE padrao;

-- ---------------------------------------------------------------------
-- 3. LOJAS E LINKS DE COMPRA (RF-005, RF-006, RN-002, RN-005, RN-006)
-- RN-006 (neutralidade): não existe coluna de comissão/patrocínio;
-- a ordem de exibição depende só de preço (ver vw_ofertas_priorizadas).
-- ---------------------------------------------------------------------
CREATE TABLE loja_parceira (
    id        SERIAL        PRIMARY KEY,
    nome      VARCHAR(80)   NOT NULL UNIQUE,
    site_url  VARCHAR(300)  NOT NULL,
    ativa     BOOLEAN       NOT NULL DEFAULT TRUE
);

CREATE TABLE oferta_compra (
    id                    SERIAL         PRIMARY KEY,
    modelo_id             INTEGER        NOT NULL REFERENCES modelo_prancha(id),
    loja_id               INTEGER        NOT NULL REFERENCES loja_parceira(id),
    url                   VARCHAR(500)   NOT NULL,
    preco                 NUMERIC(10,2)  NOT NULL CHECK (preco > 0),
    ativa                 BOOLEAN        NOT NULL DEFAULT TRUE,   -- RN-005: link suspenso => FALSE
    ultima_verificacao_em TIMESTAMP,
    UNIQUE (modelo_id, loja_id, url)
);
CREATE INDEX ix_oferta_modelo ON oferta_compra (modelo_id) WHERE ativa;

-- ---------------------------------------------------------------------
-- 4. PRANCHAS SALVAS ("Minhas pranchas")
-- O surfista não tem login (RN-003): cada navegador gera um código anônimo (UUID)
-- e só enxerga as próprias pranchas. O cliente_id NÃO identifica uma pessoa.
-- ---------------------------------------------------------------------
CREATE TABLE prancha_salva (
    id             BIGSERIAL     PRIMARY KEY,
    cliente_id     UUID          NOT NULL,
    modelo_id      INTEGER       NOT NULL REFERENCES modelo_prancha(id),
    nivel_id       SMALLINT      NOT NULL REFERENCES nivel_surf(id),
    litragem       NUMERIC(5,1)  NOT NULL CHECK (litragem BETWEEN 10 AND 120),
    tamanho        VARCHAR(10)   NOT NULL DEFAULT '',
    nota           VARCHAR(80)   NOT NULL DEFAULT '',
    criada_em      TIMESTAMP     NOT NULL DEFAULT now(),
    atualizada_em  TIMESTAMP     NOT NULL DEFAULT now(),
    UNIQUE (cliente_id, modelo_id, litragem, tamanho)   -- não salva a mesma prancha duas vezes
);
CREATE INDEX ix_prancha_salva_cliente ON prancha_salva (cliente_id);

-- ---------------------------------------------------------------------
-- 5. CONSULTAS ANÔNIMAS (opcional — métricas do MVP Canvas)
-- RN-003: nenhum dado de identificação (sem nome, e-mail, CPF ou IP).
-- Faixas realistas do RF-001 aplicadas por CHECK.
-- ---------------------------------------------------------------------
CREATE TABLE consulta (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    peso_kg              NUMERIC(5,1)  NOT NULL CHECK (peso_kg   BETWEEN 20  AND 200),
    altura_cm            SMALLINT      NOT NULL CHECK (altura_cm BETWEEN 100 AND 220),
    nivel_id             SMALLINT      NOT NULL REFERENCES nivel_surf(id),
    litragem_calculada   NUMERIC(5,1)  NOT NULL,
    modelo_indicado_id   INTEGER       REFERENCES modelo_prancha(id),
    nota_satisfacao      SMALLINT      CHECK (nota_satisfacao BETWEEN 1 AND 5),
    criada_em            TIMESTAMP     NOT NULL DEFAULT now()
);

-- Clique nos links de compra (métrica: % de cliques)
CREATE TABLE clique_oferta (
    id           BIGSERIAL  PRIMARY KEY,
    consulta_id  UUID       NOT NULL REFERENCES consulta(id) ON DELETE CASCADE,
    oferta_id    INTEGER    NOT NULL REFERENCES oferta_compra(id),
    clicado_em   TIMESTAMP  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 6. FUNÇÃO DE CÁLCULO (RF-002 / RNF-004)
-- litragem = peso * litros_por_kg + (altura - 170) * ajuste_por_cm
-- Lê os coeficientes da tabela nivel_surf; para a mesma entrada o resultado é sempre o mesmo.
-- ---------------------------------------------------------------------
CREATE FUNCTION calcular_litragem(p_peso NUMERIC, p_altura NUMERIC, p_nivel INTEGER)
RETURNS NUMERIC
LANGUAGE sql STABLE AS $$
    SELECT ROUND(p_peso * n.litros_por_kg + (p_altura - 170) * n.ajuste_por_cm, 1)
    FROM nivel_surf n
    WHERE n.id = p_nivel;
$$;

-- ---------------------------------------------------------------------
-- 7. VIEW DE OFERTAS PRIORIZADAS (RF-006, RN-002, RN-005, RN-006)
-- Só links ativos. Abaixo de R$ 1.000 vêm primeiro; dentro de cada grupo,
-- do mais barato para o mais caro. Se nenhuma estiver abaixo de R$ 1.000,
-- o mais barato continua aparecendo em primeiro.
-- ---------------------------------------------------------------------
CREATE VIEW vw_ofertas_priorizadas AS
SELECT o.id AS oferta_id, o.modelo_id, l.nome AS loja, o.url, o.preco,
       (o.preco < 1000) AS dentro_da_faixa,
       ROW_NUMBER() OVER (PARTITION BY o.modelo_id
                          ORDER BY (o.preco >= 1000), o.preco) AS posicao
FROM oferta_compra o
JOIN loja_parceira l ON l.id = o.loja_id
WHERE o.ativa AND l.ativa;

-- =====================================================================
-- DADOS INICIAIS
-- ATENÇÃO: coeficientes e faixas de litragem são VALORES DE PARTIDA e
-- devem ser validados com um shaper (AT-05, premissa PR-01).
-- Lojas e links abaixo são EXEMPLOS (example.com) — troque pelos reais.
-- =====================================================================
INSERT INTO nivel_surf (id, nome, litros_por_kg) VALUES
    (1, 'Iniciante',    0.650),
    (2, 'Em evolução',  0.520),
    (3, 'Avançado',     0.420);

INSERT INTO tipo_quilha (id, nome) VALUES
    (1, 'Tri-fin'), (2, 'Quad'), (3, 'Single fin'), (4, 'Twin');

INSERT INTO modelo_prancha (nome, descricao, litragem_min, litragem_max) VALUES
    ('Softboard',              'Prancha de espuma, muito estável, ideal para começar.',        30.0, 90.0),
    ('Funboard',               'Prancha volumosa e fácil de remar, boa para evoluir.',         32.0, 55.0),
    ('Evolution / Híbrida',    'Meio-termo entre funboard e shortboard.',                      30.0, 40.0),
    ('Fish',                   'Curta e larga, rápida em ondas pequenas.',                     28.0, 42.0),
    ('Shortboard performance', 'Prancha de performance para manobras radicais.',               22.0, 34.0);

INSERT INTO modelo_nivel (modelo_id, nivel_id)
SELECT m.id, n.id FROM modelo_prancha m JOIN nivel_surf n ON
    (m.nome = 'Softboard'              AND n.id = 1) OR
    (m.nome = 'Funboard'               AND n.id IN (1,2)) OR
    (m.nome = 'Evolution / Híbrida'    AND n.id = 2) OR
    (m.nome = 'Fish'                   AND n.id IN (2,3)) OR
    (m.nome = 'Shortboard performance' AND n.id = 3);

INSERT INTO modelo_quilha (modelo_id, quilha_id, padrao)
SELECT m.id, q.id, d.padrao
FROM (VALUES
    ('Softboard',              'Single fin', TRUE),
    ('Funboard',               'Single fin', TRUE),
    ('Funboard',               'Tri-fin',    FALSE),
    ('Evolution / Híbrida',    'Tri-fin',    TRUE),
    ('Fish',                   'Twin',       TRUE),
    ('Fish',                   'Quad',       FALSE),
    ('Shortboard performance', 'Tri-fin',    TRUE)
) AS d(modelo, quilha, padrao)
JOIN modelo_prancha m ON m.nome = d.modelo
JOIN tipo_quilha q    ON q.nome = d.quilha;

INSERT INTO loja_parceira (nome, site_url) VALUES
    ('Loja Exemplo A', 'https://example.com/lojaA'),
    ('Loja Exemplo B', 'https://example.com/lojaB');

INSERT INTO oferta_compra (modelo_id, loja_id, url, preco, ultima_verificacao_em)
SELECT m.id, l.id, 'https://example.com/' || lower(replace(m.nome,' ','-')) || '/' || l.id, d.preco, now()
FROM (VALUES
    ('Softboard',              'Loja Exemplo A',  650.00),
    ('Softboard',              'Loja Exemplo B',  720.00),
    ('Funboard',               'Loja Exemplo A',  890.00),
    ('Funboard',               'Loja Exemplo B',  980.00),
    ('Evolution / Híbrida',    'Loja Exemplo A',  950.00),
    ('Fish',                   'Loja Exemplo B',  990.00),
    ('Fish',                   'Loja Exemplo A', 1150.00),
    ('Shortboard performance', 'Loja Exemplo A', 1300.00)
) AS d(modelo, loja, preco)
JOIN modelo_prancha m ON m.nome = d.modelo
JOIN loja_parceira  l ON l.nome = d.loja;

-- =====================================================================
-- CONSULTAS DE EXEMPLO (o que o sistema executa em cada RF)
-- =====================================================================

-- RF-002: litragem de um surfista (70 kg, 175 cm, Em evolução)
--   SELECT calcular_litragem(70, 175, 2);

-- RF-003 + RF-004 + RN-001: modelo recomendado + quilha padrão
--   WITH l AS (SELECT calcular_litragem(70, 175, 2) AS litros)
--   SELECT m.nome AS modelo, l.litros, q.nome AS quilha
--   FROM l
--   JOIN modelo_prancha m ON l.litros BETWEEN m.litragem_min AND m.litragem_max AND m.ativo
--   JOIN modelo_nivel  mn ON mn.modelo_id = m.id AND mn.nivel_id = 2
--   JOIN modelo_quilha mq ON mq.modelo_id = m.id AND mq.padrao
--   JOIN tipo_quilha    q ON q.id = mq.quilha_id;

-- RF-005 + RF-006: links de compra do modelo 3, já priorizados
--   SELECT loja, preco, url FROM vw_ofertas_priorizadas
--   WHERE modelo_id = 3 ORDER BY posicao;

-- RF-008: comparar — outro modelo compatível, além do indicado (use LIMIT 2 na consulta acima)

-- RN-005: suspender link quebrado
--   UPDATE oferta_compra SET ativa = FALSE WHERE id = 1;
