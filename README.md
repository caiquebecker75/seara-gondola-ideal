# Monte sua gôndola ideal | Seara

Experiência interativa para espaço de convenção: o participante se cadastra, recebe uma loja,
monta o sortimento que considera ideal na gôndola virtual e no final vê o próprio diagnóstico de
execução, os gaps de positivação e a comparação com o planograma de referência.

**Página pública:** https://projetos.75lab.com.br/seara-gondola-ideal/
**Painel de dados:** https://projetos.75lab.com.br/seara-gondola-ideal/painel.html

## Fluxo da experiência

1. **Abertura** com a marca e a promessa do jogo.
2. **Cadastro obrigatório** (nome, telefone, e-mail, empresa, área e aceite de uso dos dados).
   Sem preencher, o jogo não abre. O registro é gravado já nesse momento, então mesmo quem
   desiste no meio continua na base.
3. **Escolha do formato de loja**: vizinhança, supermercado de bairro ou atacarejo.
   Cada formato tem shopper, espaço de gôndola e sortimento certo diferentes.
4. **Jogo**: 82 SKUs reais do portfólio Seara, com busca e filtro por categoria. O participante
   ocupa os espaços da gôndola, podendo dar mais de um espaço para o mesmo item.
   Cronômetro de 5 minutos, configurável.
5. **Resultado**: pontuação de 0 a 1000, nível, a gôndola montada, o planograma de referência,
   os gaps de obrigatórios com venda estimada perdida, os excessos de espaço, o comparativo de
   share de espaço contra share de venda e o ranking do evento.

## Como a pontuação é calculada

| Bloco | Peso | O que mede |
| --- | --- | --- |
| Positivação do obrigatório | 400 | Percentual dos itens obrigatórios do formato que estão na gôndola |
| Cobertura das necessidades | 150 | Categorias esperadas pelo shopper daquele formato que foram atendidas |
| Espaço proporcional à venda | 250 | Desvio entre o share de espaço e o share de venda de referência |
| Qualidade do mix | 200 | Penaliza item fora do formato, excesso de espaço no mesmo SKU e gôndola vazia; premia lançamento e item de rentabilidade |

Regras no arquivo [js/motor.js](js/motor.js).

## Dados dos produtos

Nome, EAN e packshot dos 82 SKUs vêm do portfólio oficial publicado em seara.com.br
(raspagem das páginas de categoria). As imagens estão em `assets/produtos/`.

Os atributos de trade (`giro`, `preco`, `papel`, `tier` por formato) são **base de referência do
jogo**, não sell out real. Para plugar os números reais da Seara, edite `js/data.js`:

```js
{
  "id": "116234",
  "ean": "7894904612444",
  "nome": "Linguiça com Queijo Coalho Seara 500g",
  "cat": "linguica",
  "papel": "rentabilidade",   // trafego | destino | rentabilidade | conveniencia | sazonal | inovacao | expansao
  "preco": 22.9,              // preço médio de gôndola
  "giro": 48,                 // índice de giro de 0 a 100 dentro do portfólio
  "tier": { "viz": "plus", "sup": "core", "ata": "core" },  // must | core | plus | fora
  "lancamento": false,
  "arquivo": "assets/produtos/p116234.webp"
}
```

Com `giro` alimentado pelo sell out e `tier` vindo do sortimento obrigatório por formato,
o planograma de referência, os gaps e o comparativo passam a rodar sobre dado real, sem
mexer em mais nada.

Os formatos de loja ficam em [js/cenarios.js](js/cenarios.js).

## Coleta de dados

O arquivo [config.js](config.js) controla tudo. Três modos:

| Modo | Quando usar | O que fazer |
| --- | --- | --- |
| `local` (padrão) | Totem único no estande | Nada. Os registros ficam no aparelho e o painel lê dali. |
| `firebase` | Vários celulares, painel ao vivo | Crie um projeto no Firebase, ative o Firestore e cole as chaves em `config.js`. |
| `sheets` | Vários celulares, sem cartão de crédito | Publique `apps-script/Codigo.gs` como app da web e cole a URL em `config.js`. |

Em qualquer modo, o registro também fica salvo no aparelho: se a rede cair, o dado não se perde.

### Regras sugeridas do Firestore

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /participantes/{doc} {
      allow create: if true;
      allow update: if true;
      allow read: if true;   // troque por false e leia pelo console se não quiser painel público
    }
  }
}
```

## Painel

`painel.html`, protegido pela senha definida em `config.js` (padrão `seara2026`). Mostra
cadastros, gôndolas montadas, pontuação média, gap médio em reais, tempo médio,
itens obrigatórios mais esquecidos, SKUs mais escolhidos, desempenho por formato,
ranking e a base completa. Exporta CSV e JSON.

## Rodar localmente

```bash
python3 -m http.server 8000
```

Depois abra `http://localhost:8000`.

## Estrutura

```
index.html          experiência completa (abertura, cadastro, briefing, jogo, resultado)
painel.html         painel de dados do evento
config.js           evento, senha, tempo de jogo e modo de armazenamento
js/data.js          catálogo de 82 SKUs Seara
js/cenarios.js      formatos de loja e categorias
js/motor.js         planograma de referência e pontuação
js/store.js         gravação e leitura dos registros
js/app.js           fluxo do jogo
js/painel.js        painel
assets/produtos/    packshots oficiais
assets/fonts/       Lufga, fonte usada pela marca
apps-script/        coletor opcional em planilha do Google
```

Projeto 75 LAB.
