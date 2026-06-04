import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';

@Component({
  selector: 'cp-rich-text-editor',
  standalone: true,
  styles: [
    `
      :host {
        display: block;
      }

      .tiptap-editor :global(.ProseMirror) {
        outline: none;
        min-height: 24rem;
      }
      .tiptap-editor :global(.ProseMirror p.is-editor-empty:first-child::before) {
        content: attr(data-placeholder);
        color: #9ca3af;
        pointer-events: none;
        float: left;
        height: 0;
      }

      .toolbar-btn {
        padding: 3px 6px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        background: transparent;
        color: #374151;
        line-height: 1.4;
        transition: background 0.1s;
      }
      .toolbar-btn:hover {
        background: #e5e7eb;
      }
      .toolbar-btn.active {
        background: #fee2e2;
        color: #b91c1c;
      }
      .toolbar-sep {
        width: 1px;
        height: 20px;
        background: #e5e7eb;
        margin: 0 2px;
        align-self: center;
      }
    `,
  ],
  template: `
    <div
      class="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-red-500"
    >
      <!-- Toolbar -->
      <div
        class="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200"
      >
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="isBold"
          (click)="cmd('toggleBold')"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="isItalic"
          (click)="cmd('toggleItalic')"
          title="Italic"
          style="font-style:italic"
        >
          I
        </button>
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="isStrike"
          (click)="cmd('toggleStrike')"
          title="Strikethrough"
          style="text-decoration:line-through"
        >
          S
        </button>
        <div class="toolbar-sep"></div>
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="isH1"
          (click)="setHeading(1)"
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="isH2"
          (click)="setHeading(2)"
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="isH3"
          (click)="setHeading(3)"
          title="Heading 3"
        >
          H3
        </button>
        <div class="toolbar-sep"></div>
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="isBulletList"
          (click)="cmd('toggleBulletList')"
          title="Bullet list"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <circle cx="3" cy="6" r="1" fill="currentColor" />
            <circle cx="3" cy="12" r="1" fill="currentColor" />
            <circle cx="3" cy="18" r="1" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="isOrderedList"
          (click)="cmd('toggleOrderedList')"
          title="Numbered list"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <text x="2" y="8" fill="currentColor" stroke="none" font-size="8">1</text>
            <text x="2" y="14" fill="currentColor" stroke="none" font-size="8">2</text>
            <text x="2" y="20" fill="currentColor" stroke="none" font-size="8">3</text>
          </svg>
        </button>
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="isBlockquote"
          (click)="cmd('toggleBlockquote')"
          title="Quote"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"
            />
          </svg>
        </button>
        <div class="toolbar-sep"></div>
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="isCode"
          (click)="cmd('toggleCode')"
          title="Inline code"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </button>
        <button type="button" class="toolbar-btn" (click)="insertLink()" title="Link">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
        </button>
        <button type="button" class="toolbar-btn" (click)="insertImage()" title="Image URL">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>
        <div class="toolbar-sep"></div>
        <button type="button" class="toolbar-btn" (click)="cmd('undo')" title="Undo">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <polyline points="9 14 4 9 9 4" />
            <path d="M20 20v-7a4 4 0 00-4-4H4" />
          </svg>
        </button>
        <button type="button" class="toolbar-btn" (click)="cmd('redo')" title="Redo">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <polyline points="15 14 20 9 15 4" />
            <path d="M4 20v-7a4 4 0 014-4h12" />
          </svg>
        </button>
      </div>
      <!-- Content area -->
      <div
        #editorHost
        class="tiptap-editor prose prose-sm max-w-none p-4 min-h-96 cursor-text"
        (click)="focusEditor()"
      ></div>
    </div>
  `,
})
export class RichTextEditorComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() html = '';
  @Output() htmlChange = new EventEmitter<string>();
  @ViewChild('editorHost') hostRef!: ElementRef<HTMLDivElement>;

  private editor?: Editor;

  isBold = false;
  isItalic = false;
  isStrike = false;
  isH1 = false;
  isH2 = false;
  isH3 = false;
  isBulletList = false;
  isOrderedList = false;
  isBlockquote = false;
  isCode = false;

  ngAfterViewInit() {
    this.editor = new Editor({
      element: this.hostRef.nativeElement,
      extensions: [
        StarterKit,
        Link.configure({ openOnClick: false }),
        Image,
        Placeholder.configure({ placeholder: 'Conținutul articolului...' }),
      ],
      content: this.html,
      onUpdate: ({ editor }) => {
        this.htmlChange.emit(editor.getHTML());
      },
      onSelectionUpdate: ({ editor }) => {
        this.syncActiveStates(editor);
      },
      onTransaction: ({ editor }) => {
        this.syncActiveStates(editor);
      },
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['html'] && this.editor) {
      const incoming = changes['html'].currentValue as string;
      if (incoming !== this.editor.getHTML()) {
        this.editor.commands.setContent(incoming);
      }
    }
  }

  ngOnDestroy() {
    this.editor?.destroy();
  }

  setHtml(html: string) {
    this.editor?.commands.setContent(html);
  }

  focusEditor() {
    this.editor?.commands.focus();
  }

  cmd(command: string) {
    const chain = this.editor?.chain().focus();
    if (!chain) return;
    (chain as unknown as Record<string, () => typeof chain>)[command]?.()?.run?.();
  }

  setHeading(level: 1 | 2 | 3) {
    this.editor?.chain().focus().toggleHeading({ level }).run();
  }

  insertLink() {
    const url = prompt('URL link:');
    if (!url) return;
    this.editor?.chain().focus().setLink({ href: url, target: '_blank' }).run();
  }

  insertImage() {
    const url = prompt('URL imagine:');
    if (!url) return;
    this.editor?.chain().focus().setImage({ src: url }).run();
  }

  private syncActiveStates(editor: Editor) {
    this.isBold = editor.isActive('bold');
    this.isItalic = editor.isActive('italic');
    this.isStrike = editor.isActive('strike');
    this.isH1 = editor.isActive('heading', { level: 1 });
    this.isH2 = editor.isActive('heading', { level: 2 });
    this.isH3 = editor.isActive('heading', { level: 3 });
    this.isBulletList = editor.isActive('bulletList');
    this.isOrderedList = editor.isActive('orderedList');
    this.isBlockquote = editor.isActive('blockquote');
    this.isCode = editor.isActive('code');
  }
}
