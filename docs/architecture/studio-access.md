# Portal público e Studio do autor

## Fronteira de acesso

O portal (`app/(public)`) e o Studio (`app/studio`) têm layouts independentes. A vitrine de livros publicados, a seleção pública de personagens e a galeria são públicas. Cronologia e manuscritos de trabalho ficam no Studio. `/timeline` redireciona para `/studio/cronologia`. O Studio tem identificação de área do autor, retorno explícito ao portal e encerramento de sessão. Não herda a navegação editorial pública.

O acesso aos dados de revisão passa por `getStudioContent`, módulo `server-only` que exige sessão e autorização **antes** de ler capítulos ou serializar personagens. Um redirect em middleware, um layout ou um botão oculto não é usado como única barreira. Pedidos diretos, prefetch e RSC passam pela mesma página/autorização. O leitor público não importa os personagens do inspetor; eles são fornecidos pelo servidor ao Studio depois da autorização.

Sem configuração completa, `/studio` redireciona para `/studio/entrar`, não carrega capítulos e não oferece login. `/api/auth/*` responde 503. Não existe senha padrão, bypass de desenvolvimento ou cabeçalho que conceda acesso. O build funciona sem credenciais.

## Configuração no servidor

1. Registrar uma **GitHub OAuth App** para o domínio de produção, com callback exato `https://uvc-olive.vercel.app/api/auth/callback/github`. Login não requer permissão de acesso a repositórios: o escopo é somente `read:user`.
2. Definir `NEXTAUTH_URL` com a origem HTTPS real e `NEXTAUTH_SECRET` com um segredo aleatório persistente (por exemplo, gerado com `openssl rand -base64 32`). Guardar o segredo no provedor, nunca no Git. Em desenvolvimento, HTTP é aceito apenas para localhost/127.0.0.1.
3. Definir `UVC_STUDIO_GITHUB_CLIENT_ID` e `UVC_STUDIO_GITHUB_CLIENT_SECRET` com os valores da OAuth App.
4. Definir `UVC_STUDIO_GITHUB_ID` com o **ID numérico imutável** da conta do autor. Não usar login, nome ou email. Autenticar outra conta GitHub não dá acesso.
5. Configurar `UVC_SITE_URL` com o domínio do portal para canonical/sitemap e publicar novo build. Confirmar login, conta recusada, logout e leitura pública no domínio real.

A configuração é verificada novamente no servidor. HTTPS é obrigatório em produção; configurações com URL inválida, segredos ausentes ou ID inválido mantêm a área fechada. `.env.example` contém apenas orientações, nunca credenciais prontas.

## Sessão e respostas

NextAuth 4 gerencia OAuth com `state` e PKCE, cookies HttpOnly/SameSite (Secure em HTTPS), CSRF e sessão JWT criptografada com duração de 8 horas. A conta autorizada é reavaliada nos callbacks e na leitura de dados. Trocar/remover o ID autorizado revoga acesso nas próximas requisições; rotacionar o segredo invalida todas as sessões anteriores. Logout remove o cookie e navega com recarga completa para limpar o estado cliente da sessão encerrada. Como em outras sessões JWT sem banco, um token copiado não é revogado individualmente pelo logout: expira ou pode ser invalidado pela rotação do segredo/remoção do ID.

Studio e endpoints de autenticação têm `Cache-Control: private, no-store` e `X-Robots-Tag: noindex, nofollow, noarchive`. Essas medidas complementam a autorização; não a substituem. A oficina `/studio/personagens` exige a mesma autorização em `getStudioCharacterData`, antes de enviar o acervo ao formulário. Novas páginas/fontes privadas devem exigir autorização em seu acesso aos dados, usando o mesmo padrão. Novas rotas de escrita precisam de autorização própria; as APIs de capítulos e cronologia continuam rejeitando escrita, inclusive para o autor.

## Publicação e limites

`data/publication.json` declara `studioAccess: author-only` e os capítulos liberados no leitor/API/sitemap. Entrar no Studio não amplia a publicação nem altera o manifesto. A lista de capítulos públicos está vazia. O Studio recebe os seis capítulos de trabalho após autorização, sem salvar edições. O Codex público recebe somente campos resumidos dos personagens classificados como `PUBLICO`. `/api/timeline` responde 401 sem sessão válida do autor. O catálogo de edições publicadas é separado da liberação de trechos: cadastrar um livro não libera automaticamente seu manuscrito.

Proteger `/studio` **não** torna privados os arquivos de `books`, `data`, `docs` nem o histórico deste repositório público. Conteúdo confidencial futuro precisa de fonte privada separada e controles de autorização antes de qualquer serialização. Classificação editorial e aviso de spoilers não são permissões de acesso.

Não há banco, edição persistente, recuperação de conta própria ou publicação automática. MFA e recuperação de conta ficam no GitHub. Alertas e limites distribuídos de tráfego ficam no provedor de hospedagem. Nada disso é simulado com armazenamento em memória.

## Verificação

- Unitários: configuração ausente/incompleta, URL de produção insegura, segredo vazio, comparação de identidade exata e troca do ID autorizado.
- Integração: ambiente fechado sem credenciais, ausência de sessão, cookie forjado/expirado, conta diferente, sessão válida do autor, pedido RSC e tentativa de bypass via cabeçalho de middleware, CSRF e cookie de logout, cabeçalhos e manutenção das APIs somente leitura.
- Navegador: navegação independente, entrada sem conteúdo de manuscrito, ausência de manuscritos públicos, cronologia privada e acessibilidade/reflow. As duas instâncias de teste usam apenas credenciais e tokens locais de teste; nenhuma chamada real ao GitHub é necessária.
- OAuth real: precisa ser validado no domínio configurado com a OAuth App do autor; os testes locais não comprovam consentimento/callback do provedor.

Referências de implementação: [autenticação e acesso aos dados no Next.js](https://nextjs.org/docs/app/guides/authentication), [sessão no servidor](https://next-auth.js.org/configuration/nextjs), [callbacks de autorização](https://next-auth.js.org/configuration/callbacks) e [opções de sessão/cookies](https://next-auth.js.org/configuration/options).

## Ativação na Vercel

Em GitHub → Settings → Developer settings → OAuth Apps, criar uma aplicação com Homepage URL `https://uvc-olive.vercel.app` e o callback acima. Em Vercel → projeto → Settings → Environment Variables, cadastrar para Production:

- `NEXTAUTH_URL=https://uvc-olive.vercel.app`
- `NEXTAUTH_SECRET`: resultado de `openssl rand -base64 32`.
- `UVC_STUDIO_GITHUB_CLIENT_ID` e `UVC_STUDIO_GITHUB_CLIENT_SECRET`: valores da OAuth App.
- `UVC_STUDIO_GITHUB_ID`: campo `id` numérico da conta do autor na API pública do GitHub.
- `UVC_SITE_URL=https://uvc-olive.vercel.app`: origem dos metadados públicos.

Fazer novo deploy após configurar as variáveis. Entrar em `/studio`, autorizar no GitHub e confirmar o retorno à área do autor. Conferir também saída da sessão e recusa de outra conta. Não enviar segredos pelo chat nem adicioná-los ao repositório. A presença da implementação no Git não confirma a configuração das variáveis ou um teste real do OAuth.
