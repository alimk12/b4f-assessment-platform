import { PageMeta } from '../../types/common.types';
import Button from './Button';

/** Previous / next for every paginated list (API.md §20.3). Hidden when there is only one page. */
export default function Pagination({ meta, onPage }: { meta: PageMeta | null; onPage(page: number): void }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="ui-pagination">
      <Button variant="secondary" size="small" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>← Previous</Button>
      <span className="ui-muted">Page {meta.page} of {meta.totalPages} · {meta.total} in total</span>
      <Button variant="secondary" size="small" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>Next →</Button>
    </div>
  );
}
