# Calendário Metodologia 2027

Calendário dos módulos 51, 52, 53 e 54, com visão anual, seleção de módulo, próximos prazos, matriz geral e cronograma. Mantém separados **Disciplinas Regulares - 1 e 2** e **Disciplinas Portifólio / Online - 3**.

Site: https://avaliacao-nap.github.io/calendario-metodologia-2027/

## Dados e atualização

A fonte é o mesmo arquivo público de planilha utilizado pelo calendário acadêmico. Este projeto interpreta exclusivamente as quatro abas **Calendário Metodologia 51/2027 a 54/2027**, incluindo notas, datas de publicação e prazos que terminam em 2028.

- O GitHub Actions consulta a planilha a cada 5 minutos. Execuções agendadas podem sofrer atrasos do GitHub.
- A leitura validada é publicada em `data/calendar.json`. O navegador verifica esse arquivo a cada 20 segundos enquanto a página está visível e ao retornar à aba.
- Leituras com mais de 15 minutos são indicadas como atualização pendente. O último conjunto válido continua disponível.
- A leitura localiza os cabeçalhos e grupos de disciplinas, aceitando linhas/colunas deslocadas e atividades adicionadas ou retiradas. Datas, notas e totais são validados; uma leitura incompleta preserva a versão anterior.
- A interface compilada é reutilizada quando o código e o conteúdo da planilha permanecem iguais. Uma mudança nos dados renova também o HTML inicial e o modelo de metodologia. Cada publicação verifica a versão disponível no endereço público.
- Os prazos e as barras usam a data real de Brasília. Não há simulação de datas.

O modelo geral de metodologia aparece somente na visão Anual e deriva suas atividades, notas e semanas das datas do primeiro módulo da planilha. As fontes Manrope e os logotipos são distribuídos junto com o site; a licença da fonte está em `public/fonts/Manrope-OFL.txt`.

## Publicação

O repositório utiliza **GitHub Pages → Source: GitHub Actions**. O workflow `Publicar e atualizar metodologia` publica após alterações na branch `main`, por execução manual e pela agenda.

Se necessário, execute **Actions → Publicar e atualizar metodologia → Run workflow**. A publicação está concluída quando o job `deploy` termina com sucesso; o endereço confirmado aparece em **Settings → Pages**.

Não são necessários Cloudflare, tokens pessoais ou um servidor de aplicação. A planilha deve continuar disponível para leitura pública. O GitHub pode desativar workflows agendados em repositórios públicos após 60 dias sem atividade; nesse caso, reative o workflow em Actions.

## Desenvolvimento

Requisitos: Node.js 24 e pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm sync:data
pnpm test:sync
NEXT_PUBLIC_BASE_PATH=/calendario-metodologia-2027 pnpm build:github
NEXT_PUBLIC_BASE_PATH=/calendario-metodologia-2027 pnpm test:export
```

No PowerShell, defina `$env:NEXT_PUBLIC_BASE_PATH="/calendario-metodologia-2027"` antes do build. O resultado estático fica em `out/`. Para desenvolver, execute `pnpm dev`.

## Arquivos principais

- `app/calendar-app.tsx`: calendário, filtros, prazos e matriz.
- `app/academic-gantt.tsx`: cronograma.
- `lib/calendar-source.ts`: interpretação e validação das quatro abas.
- `lib/discipline-tracks.ts`: separação das disciplinas.
- `lib/calendar-client.ts`: consulta dos dados publicados e verificação da atualização.
- `scripts/sync-calendar.mjs`: atualização da planilha para GitHub Pages.
- `.github/workflows/pages.yml`: compilação, publicação e agenda.

Documentação: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) e [exportação estática do Next.js](https://nextjs.org/docs/app/guides/static-exports).
