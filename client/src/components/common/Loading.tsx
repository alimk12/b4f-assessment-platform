export default function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="ui-loading" role="status">
      <span className="ui-spinner" aria-hidden="true" />
      {label}
    </div>
  );
}
