import type { editor } from 'monaco-editor';

type PasteViolation = 'PASTE_EXTERNAL' | 'DROP_EXTERNAL';
const normalize = (s: string) => s.replace(/\r\n/g, '\n').trim();

/** Allows copy/paste inside this editor; blocks text that came from outside it. */
export function attachEditorPasteGuard(ed: editor.IStandaloneCodeEditor, onViolation: (type: PasteViolation) => void, root?: HTMLElement | null) {
  // Listen on a stable wrapper when one is given (it outlives editor re-creation), else on the editor's container.
  const node = root ?? ed.getContainerDomNode();
  if (!node) return { dispose() {} };
  const copiedInside = new Set<string>();

  const remember = () => {
    const model = ed.getModel();
    const selections = ed.getSelections() ?? [];
    if (!model) return;
    let text = selections.map((s) => model.getValueInRange(s)).join('\n');
    // Monaco copies the whole line when nothing is selected.
    if (!text && selections[0]) text = model.getLineContent(selections[0].startLineNumber) + '\n';
    if (text) {
      copiedInside.add(normalize(text));
      selections.forEach((s) => copiedInside.add(normalize(model.getValueInRange(s))));
    }
  };

  const onPaste = (e: ClipboardEvent) => {
    const text = normalize(e.clipboardData?.getData('text/plain') ?? '');
    if (!text || copiedInside.has(text)) return;
    e.preventDefault();
    e.stopPropagation();
    onViolation('PASTE_EXTERNAL');
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onViolation('DROP_EXTERNAL');
  };
  const onDragOver = (e: DragEvent) => e.preventDefault();

  node.addEventListener('copy', remember, true);
  node.addEventListener('cut', remember, true);
  node.addEventListener('paste', onPaste, true);
  node.addEventListener('drop', onDrop, true);
  node.addEventListener('dragover', onDragOver, true);
  return {
    dispose() {
      node.removeEventListener('copy', remember, true);
      node.removeEventListener('cut', remember, true);
      node.removeEventListener('paste', onPaste, true);
      node.removeEventListener('drop', onDrop, true);
      node.removeEventListener('dragover', onDragOver, true);
    },
  };
}
