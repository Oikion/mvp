"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Lightbulb,
  AlertCircle,
  Info,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChangelogRichEditorProps {
  /** The value as HTML string */
  value: string;
  /** Callback when content changes, receives HTML string */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
}

// Callout type for tips, warnings, info
type CalloutType = "tip" | "warning" | "info";

const calloutStyles: Record<CalloutType, { bg: string; border: string; icon: React.ElementType }> = {
  tip: {
    bg: "bg-success/10 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: Lightbulb,
  },
  warning: {
    bg: "bg-warning/10 dark:bg-amber-950/30",
    border: "border-warning/30 dark:border-amber-800",
    icon: AlertCircle,
  },
  info: {
    bg: "bg-primary/10 dark:bg-primary/20/30",
    border: "border-primary/30 dark:border-primary/50",
    icon: Info,
  },
};

/**
 * ChangelogRichEditor - A TipTap-based rich text editor for changelog entries
 * 
 * Features:
 * - Full text formatting (bold, italic, underline, strike, code)
 * - Headings (H1, H2, H3)
 * - Lists (bullet, numbered)
 * - Blockquotes
 * - Links with URL editing
 * - Images with URL input
 * - Callouts/Tips (tip, warning, info)
 * - Horizontal dividers
 * - Text alignment
 */
export function ChangelogRichEditor({
  value,
  onChange,
  placeholder = "Describe the changes in detail...",
  className,
}: ChangelogRichEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [showImagePopover, setShowImagePopover] = useState(false);
  const isInternalChange = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto my-4",
        },
      }),
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: "px-1 rounded",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none min-h-[200px] p-4 focus:outline-none",
          "prose-headings:font-semibold prose-headings:text-foreground",
          "prose-p:text-muted-foreground prose-p:leading-relaxed",
          "prose-ul:text-muted-foreground prose-ol:text-muted-foreground",
          "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground",
          "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm",
          "prose-pre:bg-muted prose-pre:rounded-lg",
          "prose-a:text-primary prose-a:underline",
          "prose-img:rounded-lg prose-img:shadow-md"
        ),
      },
    },
    onUpdate: ({ editor }) => {
      isInternalChange.current = true;
      const html = editor.getHTML();
      onChange(html);
    },
    immediatelyRender: false,
  });

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !isInternalChange.current) {
      editor.commands.setContent(value || "");
    }
    isInternalChange.current = false;
  }, [value, editor]);

  const addLink = useCallback(() => {
    if (!editor || !linkUrl) return;
    
    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    }
    setLinkUrl("");
    setShowLinkPopover(false);
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setImageUrl("");
    setShowImagePopover(false);
  }, [editor, imageUrl]);

  const insertCallout = useCallback((type: CalloutType) => {
    if (!editor) return;
    
    const style = calloutStyles[type];
    const Icon = style.icon;
    const iconName = type === "tip" ? "💡" : type === "warning" ? "⚠️" : "ℹ️";
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    
    // Insert a styled blockquote as a callout
    editor.chain().focus().insertContent({
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: `${iconName} ${label}: `, marks: [{ type: "bold" }] },
            { type: "text", text: "Your message here" },
          ],
        },
      ],
    }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className={cn("rounded-lg border bg-background", className)}>
        <div className="p-4 text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-background overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-muted/30">
        {/* Undo/Redo */}
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          aria-label="Undo"
        >
          <Undo className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          aria-label="Redo"
        >
          <Redo className="h-4 w-4" />
        </Toggle>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Headings Dropdown */}
        <Select
          value={
            editor.isActive("heading", { level: 1 })
              ? "h1"
              : editor.isActive("heading", { level: 2 })
              ? "h2"
              : editor.isActive("heading", { level: 3 })
              ? "h3"
              : "p"
          }
          onValueChange={(value) => {
            if (value === "p") {
              editor.chain().focus().setParagraph().run();
            } else {
              const level = parseInt(value.slice(1)) as 1 | 2 | 3;
              editor.chain().focus().toggleHeading({ level }).run();
            }
          }}
        >
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue placeholder="Style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="p">Paragraph</SelectItem>
            <SelectItem value="h1">Heading 1</SelectItem>
            <SelectItem value="h2">Heading 2</SelectItem>
            <SelectItem value="h3">Heading 3</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Text Formatting */}
        <Toggle
          size="sm"
          pressed={editor.isActive("bold")}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("italic")}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("underline")}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("strike")}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          aria-label="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("code")}
          onPressedChange={() => editor.chain().focus().toggleCode().run()}
          aria-label="Inline Code"
        >
          <Code className="h-4 w-4" />
        </Toggle>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Lists */}
        <Toggle
          size="sm"
          pressed={editor.isActive("bulletList")}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet List"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("orderedList")}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Block Elements */}
        <Toggle
          size="sm"
          pressed={editor.isActive("blockquote")}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          aria-label="Quote"
        >
          <Quote className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => editor.chain().focus().setHorizontalRule().run()}
          aria-label="Divider"
        >
          <Minus className="h-4 w-4" />
        </Toggle>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Alignment */}
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: "left" })}
          onPressedChange={() => editor.chain().focus().setTextAlign("left").run()}
          aria-label="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: "center" })}
          onPressedChange={() => editor.chain().focus().setTextAlign("center").run()}
          aria-label="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: "right" })}
          onPressedChange={() => editor.chain().focus().setTextAlign("right").run()}
          aria-label="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Toggle>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Link */}
        <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
          <PopoverTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive("link")}
              onPressedChange={() => {
                if (editor.isActive("link")) {
                  editor.chain().focus().unsetLink().run();
                } else {
                  const previousUrl = editor.getAttributes("link").href || "";
                  setLinkUrl(previousUrl);
                  setShowLinkPopover(true);
                }
              }}
              aria-label="Link"
            >
              <LinkIcon className="h-4 w-4" />
            </Toggle>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="space-y-2">
              <label className="text-sm font-medium">Link URL</label>
              <Input
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLink();
                  }
                }}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowLinkPopover(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={addLink}>
                  Add Link
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Image */}
        <Popover open={showImagePopover} onOpenChange={setShowImagePopover}>
          <PopoverTrigger asChild>
            <Toggle size="sm" pressed={false} aria-label="Insert Image">
              <ImageIcon className="h-4 w-4" />
            </Toggle>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="space-y-2">
              <label className="text-sm font-medium">Image URL</label>
              <Input
                placeholder="https://example.com/image.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addImage();
                  }
                }}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowImagePopover(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={addImage}>
                  Insert Image
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Callouts */}
        <Select onValueChange={(value) => insertCallout(value as CalloutType)}>
          <SelectTrigger className="h-8 w-[100px] text-xs">
            <SelectValue placeholder="Callout" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tip">
              <span className="flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-success" />
                Tip
              </span>
            </SelectItem>
            <SelectItem value="warning">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-warning" />
                Warning
              </span>
            </SelectItem>
            <SelectItem value="info">
              <span className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-primary" />
                Info
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Character count or tips */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t bg-muted/20 text-xs text-muted-foreground">
        <span>Use the toolbar above to format your content</span>
        <span>{editor.storage.characterCount?.characters?.() || 0} characters</span>
      </div>
    </div>
  );
}

export default ChangelogRichEditor;
