'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Smile } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useEffect } from 'react';

const COMMON_EMOJIS = ['✅', '❌', '⚠️', '🛡️', '🚀', '📈', '📊', '💼', '📄', '🤝', '🏢', '🏗️', '👷', '👨‍⚕️', '🩺', '💡', '🔍', '📍', '📞', '📧'];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, className, minHeight }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: placeholder || 'Digite aqui...',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Only emit if it's not the same as current value to prevent unnecessary state updates
      onChange(html === '<p></p>' ? '' : html);
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none p-3 ${minHeight || 'min-h-[80px]'}`,
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={`border rounded-md bg-background focus-within:ring-1 focus-within:ring-primary ${className}`}>
      <div className="flex items-center gap-1 p-1 border-b bg-muted/20 flex-wrap">
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${editor.isActive('bold') ? 'bg-muted text-primary font-bold' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          type="button"
          title="Negrito"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${editor.isActive('italic') ? 'bg-muted text-primary' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          type="button"
          title="Itálico"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${editor.isActive('underline') ? 'bg-muted text-primary' : ''}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          type="button"
          title="Sublinhado"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${editor.isActive('bulletList') ? 'bg-muted text-primary' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          type="button"
          title="Lista"
        >
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${editor.isActive('orderedList') ? 'bg-muted text-primary' : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          type="button"
          title="Lista Numerada"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" type="button" title="Emojis">
              <Smile className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" side="top">
            <div className="grid grid-cols-6 gap-1">
              {COMMON_EMOJIS.map(emoji => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-lg"
                  onClick={() => editor.chain().focus().insertContent(emoji).run()}
                  type="button"
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
