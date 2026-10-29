"use client";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import type { Editor, JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Undo2, Redo2, Quote, List } from "lucide-react";

export function WritingEditor({
  content,
  onChange,
  editorRef,
}: {
  content: JSONContent;
  onChange: (body: string, richText: JSONContent) => void;
  editorRef: React.RefObject<Editor | null>;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: false },
        codeBlock: false,
        code: false,
        horizontalRule: false,
        trailingNode: false,
      }),
    ],
    content,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: "writing-prose",
        role: "textbox",
        "aria-label": "Texto do manuscrito",
        "aria-multiline": "true",
        spellcheck: "true",
        lang: "pt-BR",
      },
    },
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
    onDestroy: () => {
      editorRef.current = null;
    },
    onUpdate: ({ editor }) =>
      onChange(editor.getText({ blockSeparator: "\n" }), editor.getJSON()),
  });
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      quote: editor?.isActive("blockquote") ?? false,
      list: editor?.isActive("bulletList") ?? false,
      heading:
        [1, 2, 3].find((level) => editor?.isActive("heading", { level })) ?? 0,
      undo: editor?.can().undo() ?? false,
      redo: editor?.can().redo() ?? false,
    }),
  });
  return (
    <>
      <div
        className="writing-format"
        role="toolbar"
        aria-label="Formatação do texto"
      >
        <select
          aria-label="Estilo do parágrafo"
          value={state?.heading ?? 0}
          disabled={!editor}
          onChange={(e) => {
            const level = Number(e.target.value);
            if (level)
              editor
                ?.chain()
                .focus()
                .setHeading({ level: level as 1 | 2 | 3 })
                .run();
            else editor?.chain().focus().setParagraph().run();
          }}
        >
          <option value="0">Corpo do texto</option>
          <option value="1">Título</option>
          <option value="2">Subtítulo</option>
          <option value="3">Seção</option>
        </select>
        <button
          type="button"
          aria-label="Negrito"
          aria-pressed={state?.bold ?? false}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold size={17} />
        </button>
        <button
          type="button"
          aria-label="Itálico"
          aria-pressed={state?.italic ?? false}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic size={17} />
        </button>
        <button
          type="button"
          aria-label="Citação"
          aria-pressed={state?.quote ?? false}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={17} />
        </button>
        <button
          type="button"
          aria-label="Lista"
          aria-pressed={state?.list ?? false}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List size={17} />
        </button>
        <span className="writing-format-spacer" />
        <button
          type="button"
          aria-label="Desfazer"
          disabled={!state?.undo}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 size={17} />
        </button>
        <button
          type="button"
          aria-label="Refazer"
          disabled={!state?.redo}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 size={17} />
        </button>
      </div>
      <EditorContent editor={editor} />
    </>
  );
}
