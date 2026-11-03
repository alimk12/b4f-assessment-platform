import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';
import { attachEditorPasteGuard } from '../exam-guard/editorPasteGuard';
import Loading from '../components/common/Loading';
import './CodeEditor.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  isReadOnly?: boolean;
  errorLine?: number | null;
  errorMessage?: string | null;
  height?: string;
  onViolation?: (type: 'PASTE_EXTERNAL' | 'DROP_EXTERNAL') => void;
}

export default function CodeEditor({ value, onChange, isReadOnly = false, errorLine = null, errorMessage = null, height = '360px', onViolation }: Props) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const guardRef = useRef<{ dispose(): void } | null>(null);
  const violationRef = useRef(onViolation);
  violationRef.current = onViolation;

  const handleMount: OnMount = (ed) => {
    editorRef.current = ed;
    guardRef.current?.dispose();
    guardRef.current = attachEditorPasteGuard(ed, (t) => violationRef.current?.(t), wrapperRef.current);
  };

  useEffect(() => () => guardRef.current?.dispose(), []);

  // Mark the line from RunResult.error with a red underline and a hover message.
  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (!model) return;
    if (!errorLine || errorLine < 1 || errorLine > model.getLineCount()) {
      monaco.editor.setModelMarkers(model, 'b4f-run', []);
      return;
    }
    monaco.editor.setModelMarkers(model, 'b4f-run', [{
      startLineNumber: errorLine, endLineNumber: errorLine, startColumn: 1, endColumn: model.getLineMaxColumn(errorLine),
      message: errorMessage ?? 'Error on this line', severity: monaco.MarkerSeverity.Error,
    }]);
    editorRef.current?.revealLineInCenterIfOutsideViewport(errorLine);
  }, [errorLine, errorMessage]);

  return (
    <div className="code-editor" data-exam-clipboard="allow" ref={wrapperRef}>
      <div className="code-editor__bar">
        <span>JavaScript</span>
        <span>Ctrl + Space for suggestions</span>
      </div>
      <Editor
        height={height}
        language="javascript"
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={handleMount}
        loading={<Loading label="Loading editor…" />}
        options={{
          readOnly: isReadOnly,
          minimap: { enabled: false },
          fontSize: 14,
          tabSize: 2,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          contextmenu: true,
          dragAndDrop: false,
          quickSuggestions: true,
          suggestOnTriggerCharacters: true,
          wordBasedSuggestions: 'currentDocument',
          fixedOverflowWidgets: true,
        }}
      />
    </div>
  );
}
