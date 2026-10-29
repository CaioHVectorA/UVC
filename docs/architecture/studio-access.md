# Acesso ao Studio

O Studio agora usa usuário e senha com sessões persistidas em PostgreSQL. O usuário inicial é `admin`, senha `admin`, conforme solicitado para esta etapa. A senha conhecida é temporária: ela não garante exclusividade do autor em um deploy público.

## Configuração

Configure apenas a conexão `DATABASE_URL` (ou `POSTGRES_URL`) no servidor e a origem pública `UVC_SITE_URL` para os metadados. Não é necessário cadastrar uma OAuth App. A migração cria o usuário inicial e o acervo sem sobrescrever edições existentes. Não use `NEXT_PUBLIC_` na conexão e não envie sua URL com senha ao Git ou ao chat.

Sem banco configurado, o Studio informa a pendência e não cria sessão ou simula salvamento. O PostgreSQL do desenvolvimento não é a conexão hospedada da Vercel. O projeto precisa ser ligado ao banco de produção e receber um novo deploy.

## Sessão e autorização

A senha usa scrypt com salt individual. Login gera um token aleatório de 32 bytes; só seu SHA-256 fica em `uvc_sessions`. O cookie é HttpOnly, SameSite=Lax e Secure no deploy HTTPS. A sessão expira em 8 horas. Logout remove a sessão no banco, revogando também uma cópia do cookie. Tentativas erradas são contadas no DB, com bloqueio temporário após repetição.

Páginas e fontes privadas verificam a sessão no servidor antes de fornecer o workspace, documentos ou imagens. Gravações também verificam a origem. SQL usa parâmetros; atualização e histórico compartilham uma transação. Respostas privadas têm no-store. Erros de conexão não são tratados como sucesso.

A identidade admitida é o administrador do Studio. Não há cadastro público, recuperação de senha ou gerenciamento de usuários nesta etapa. Os endpoints antigos de OAuth respondem 410 e não concedem acesso.

## Publicação

Novas fichas e manuscritos começam privados. A wiki recebe somente fichas publicadas e os campos próprios de apresentação. Notas privadas, documentos e sessões não são serializados para o site público. A galeria pública mostra referências visuais selecionadas; conceitos e ideias têm fichas separadas.

Arquivos já presentes neste Git público continuam públicos. O PDF e os dados privados de Marginal foram importados para armazenamento privado, sem adicionar o texto integral ao repositório.

## Validação

Os testes usam o login real e um PostgreSQL isolado. Verificam senha inválida, origem externa, sessão forjada/revogada, leitura privada, persistência SQL, conflito de versão, histórico, vínculos, arquivos originais e publicação sem notas internas. Não são cookies fictícios que liberam um modo de teste na aplicação.
