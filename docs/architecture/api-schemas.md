# Especificação de Schemas & Modelos de Dados

Modelos canônicos consolidados prontos para consumo por qualquer cliente Web/Mobile:

```typescript
export interface Character {
  id: string;
  nome: string;
  equipe: string;
  alinhamento: 'Herói' | 'Anti-Herói' | 'Vilão' | 'Neutro' | 'Divindade';
  escala: 'TERRA' | 'UNIVERSAL';
  desc: string;
  poderes: string[];
  aparicoes: string[];
  img?: string;
}

export interface Faction {
  id: string;
  nome: string;
  base: string;
  lider: string;
  membros: string[];
  desc: string;
}

export interface SeriesOrSolo {
  titulo: string;
  tipo: 'SÉRIE' | 'SOLO';
  local: 'TERRA' | 'UNIVERSAL';
  sinopse: string;
  arcos?: string[];
}
```
