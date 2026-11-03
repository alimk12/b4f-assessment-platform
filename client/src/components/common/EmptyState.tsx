export default function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="ui-empty">
      <div className="ui-empty__title">{title}</div>
      {text && <div>{text}</div>}
    </div>
  );
}
