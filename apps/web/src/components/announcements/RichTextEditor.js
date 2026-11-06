'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Strikethrough, Heading2, List, ListOrdered, Quote, Code, Undo2, Redo2,
} from 'lucide-react';

const TOOLBAR = [
  { icon: Bold, label: 'Bold (Ctrl+B)', isActive: (e) => e.isActive('bold'), run: (c) => c.toggleBold() },
  { icon: Italic, label: 'Italic (Ctrl+I)', isActive: (e) => e.isActive('italic'), run: (c) => c.toggleItalic() },
  { icon: Strikethrough, label: 'Strikethrough', isActive: (e) => e.isActive('strike'), run: (c) => c.toggleStrike() },
  { icon: Heading2, label: 'Heading', isActive: (e) => e.isActive('heading', { level: 2 }), run: (c) => c.toggleHeading({ level: 2 }) },
  { icon: List, label: 'Bullet list', isActive: (e) => e.isActive('bulletList'), run: (c) => c.toggleBulletList() },
  { icon: ListOrdered, label: 'Numbered list', isActive: (e) => e.isActive('orderedList'), run: (c) => c.toggleOrderedList() },
  { icon: Quote, label: 'Quote', isActive: (e) => e.isActive('blockquote'), run: (c) => c.toggleBlockquote() },
  { icon: Code, label: 'Code', isActive: (e) => e.isActive('code'), run: (c) => c.toggleCode() },
];

// Controlled TipTap editor. `value` is HTML; onChange receives HTML ('' when empty).
export default function RichTextEditor({ value, onChange, placeholder = 'Write something...' }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    // Next renders on the server first; let the client create the editor
    immediatelyRender: false,
    editorProps: { attributes: { class: 'rich-content rte-input' } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
  });

  // parent cleared the value (e.g. after posting) → clear the editor
  useEffect(() => {
    if (editor && !value && !editor.isEmpty) editor.commands.clearContent();
  }, [editor, value]);

  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
        {TOOLBAR.map(({ icon: Icon, label, isActive, run }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            disabled={!editor}
            className={`rte-btn ${editor && isActive(editor) ? 'rte-btn--active' : ''}`}
            onClick={() => run(editor.chain().focus()).run()}
          >
            <Icon size={14} />
          </button>
        ))}
        <span className="rte-sep" />
        <button type="button" title="Undo" aria-label="Undo" className="rte-btn" disabled={!editor?.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={14} />
        </button>
        <button type="button" title="Redo" aria-label="Redo" className="rte-btn" disabled={!editor?.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={14} />
        </button>
      </div>

      <EditorContent editor={editor} />

      <style jsx>{`
        .rte { border: 1px solid var(--c-border); border-radius: 10px; background: var(--c-surface); overflow: hidden; }
        .rte:focus-within { border-color: var(--ws-accent, #6366f1); }
        .rte-toolbar { display: flex; flex-wrap: wrap; gap: 2px; padding: 6px; border-bottom: 1px solid var(--c-border); background: var(--c-bg); }
        .rte-btn { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; border: none; background: none; border-radius: 6px; color: var(--c-text-3); cursor: pointer; }
        .rte-btn:hover:not(:disabled) { background: var(--c-surface-2); color: var(--c-text); }
        .rte-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .rte-btn--active { background: var(--c-accent-soft); color: var(--ws-accent, #4f46e5); }
        .rte-sep { width: 1px; margin: 4px; background: var(--c-surface-3); }
      `}</style>
    </div>
  );
}
