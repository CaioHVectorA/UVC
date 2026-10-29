# Studio persistente em PostgreSQL

## Modelo

`uvc_entities` armazena fichas tipadas: personagem, conceito, lugar, objeto, facção, história, documento, evento, visual e tarefa. Os campos comuns incluem título, resumo, texto, tags, estado, publicação e versão. Atributos específicos preservam afiliação, habilidades, prazo, ordem temporal e referência à imagem. As referências canônicas usadas no seed mantêm seus IDs e proveniência.

`uvc_relations` conecta duas fichas com direção e um rótulo descritivo. Chaves estrangeiras, unicidade e validação recusam referências inexistentes, relações duplicadas e autorrelações. `uvc_layout` mantém posições do mapa separadas do conteúdo, evitando que arrastar uma ficha sobrescreva sua redação.

`uvc_revisions` mantém a versão anterior a cada edição. Uma gravação exige a versão atual; conflito retorna 409 e preserva o texto no editor para comparação/exportação. Atualização e histórico usam a mesma transação e cliente PostgreSQL.

`uvc_files` guarda o original importado, MIME e SHA-256, com acesso autenticado. O conteúdo editável é separado do original. Importações são privadas; o app não oferece publicação de manuscritos por um checkbox genérico.

`uvc_users` e `uvc_sessions` guardam o hash scrypt e hashes dos tokens de sessão. Cookies não armazenam a senha, o token não fica em texto simples no banco e logout revoga a sessão.

## Inicialização

`db/migrations/001_initial.sql` cria o esquema idempotente. `uvc_schema_migrations` registra a versão; um advisory lock transacional serializa a inicialização. O seed de dados tem marcador próprio: reiniciar a função não restaura vínculos removidos nem substitui fichas editadas. Alterações futuras de esquema precisam de nova migração versionada.

O seed inclui o acervo do JSON, seis capítulos de RRH, eras/eventos da cronologia, referências visuais e conceitos/lugares/objetos documentados. Planetas cegos é um título indicado pelo autor, com definição pendente; nenhuma cosmologia foi inferida. Marginal é a única história em andamento na vitrine.

O PDF de Marginal é importado separadamente em fonte privada. Não há cópia integral no Git. O importador mantém o original e o texto editável em uma ficha privada. Fichas de personagens são cadastradas separadamente e podem ser ligadas ao manuscrito.

## Interface

A biblioteca, o editor/mapa e as conexões compartilham o mesmo modelo de fichas. As coleções têm rotas próprias, busca e criação; uma ligação abre a ficha correspondente. O grafo mostra vizinhança direta ou em dois passos, ou o universo conectado. É possível arrastar, ampliar e salvar seu layout no banco.

Salvar, importar e criar/remover vínculos têm respostas reais do banco. Falhas e conflitos não limpam o texto editado. Há aviso de saída com alterações pendentes, atalho Ctrl/Cmd+S, download da ficha e histórico carregável para revisão antes de salvar uma nova versão.

A galeria contém imagem e descrição visual. Ideias, regras e outros conhecimentos têm coleções próprias e podem se ligar às referências visuais. Tarefas e eventos também são conectáveis.

## Operação

Produção precisa de um PostgreSQL acessível pela Vercel e `DATABASE_URL` configurada no servidor. A conexão e os backups privados não entram no Git. O banco Docker local serve ao desenvolvimento e não persiste dentro de uma função serverless.

O editor não usa banco em memória nem escreve arquivos mutáveis no filesystem da Vercel. A vitrine tem fallback para o snapshot público apenas quando não há conexão configurada; não finge que o Studio conectado está disponível nessa situação.

Testes de integração usam `uvc_test` isolado, com esquema próprio descartável. Nunca execute seu preparo contra um banco de trabalho ou produção. O CI provisiona PostgreSQL para testar login, persistência, conflito, histórico, publicação, vínculos, documentos e interface.
