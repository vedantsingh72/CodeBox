'use client';

import CodeMirror from '@uiw/react-codemirror';
import { closeBrackets, autocompletion } from '@codemirror/autocomplete';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';

type CodeEditorProps = {
  language: string;
  value: string;
  onChange: (value: string) => void;
};

function languageExtension(language: string) {
  const lang = language.toUpperCase();

  if (lang === 'CPP' || lang === 'C++' || lang === 'C') return cpp();
  if (lang === 'JAVA') return java();
  if (lang === 'PYTHON') return python();
  if (lang === 'JAVASCRIPT') return javascript();

  return [];
}

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14px',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
  },
  '.cm-editor': {
    height: '100%',
  },
  '.cm-scroller': {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  '.cm-content': {
    minHeight: '100%',
    padding: '14px 0',
  },
  '.cm-line': {
    padding: '0 14px',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--muted)',
    color: 'var(--muted-foreground)',
    borderRight: '1px solid var(--border)',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--muted)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--muted)',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--foreground)',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'color-mix(in oklch, var(--primary), transparent 78%)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
});

export function CodeEditor({ language, value, onChange }: CodeEditorProps) {
  return (
    <CodeMirror
      value={value}
      height='100%'
      basicSetup={false}
      extensions={[
        lineNumbers(),
        highlightSpecialChars(),
        drawSelection(),
        dropCursor(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightActiveLine(),
        EditorState.tabSize.of(4),
        keymap.of([indentWithTab, ...defaultKeymap]),
        languageExtension(language),
        editorTheme,
      ]}
      onChange={onChange}
    />
  );
}
