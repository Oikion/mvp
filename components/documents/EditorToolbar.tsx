"use client";

import { type Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Table,
  Minus,
  Quote,
  Code,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const t = useTranslations("documents.editor");

  if (!editor) {
    return null;
  }

  const headingLevels = [
    { value: "paragraph", label: t("paragraph") },
    { value: "1", label: t("heading1") },
    { value: "2", label: t("heading2") },
    { value: "3", label: t("heading3") },
  ];

  const getCurrentHeading = () => {
    if (editor.isActive("heading", { level: 1 })) return "1";
    if (editor.isActive("heading", { level: 2 })) return "2";
    if (editor.isActive("heading", { level: 3 })) return "3";
    return "paragraph";
  };

  const setHeading = (value: string) => {
    if (value === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else {
      const level = parseInt(value) as 1 | 2 | 3;
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  const insertTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/50">
      {/* Undo/Redo */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Heading Selector */}
      <Select value={getCurrentHeading()} onValueChange={setHeading}>
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {headingLevels.map((level) => (
            <SelectItem key={level.value} value={level.value}>
              {level.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text Formatting */}
      <Button
        variant={editor.isActive("bold") ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive("italic") ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive("underline") ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive("strike") ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists */}
      <Button
        variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Alignment */}
      <Button
        variant={editor.isActive({ textAlign: "left" }) ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive({ textAlign: "center" }) ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive({ textAlign: "right" }) ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive({ textAlign: "justify" }) ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Blocks */}
      <Button
        variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive("codeBlock") ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Table */}
      <Button variant="ghost" size="sm" onClick={insertTable}>
        <Table className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default EditorToolbar;










