const labels = {
  CANONE_TRAVADO: "Cânone consolidado",
  EM_REVISAO: "Em revisão",
  RASCUNHO: "Rascunho",
};
export function StatusBadge({ status }: { status: keyof typeof labels }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      {labels[status]}
    </span>
  );
}
