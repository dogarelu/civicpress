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
  inject,
} from '@angular/core';
import { Editor, Mark, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { ApiService } from '../services/api.service';
import { ToastService } from '../services/toast.service';

const Underline = Mark.create({
  name: 'underline',
  parseHTML() {
    return [
      { tag: 'u' },
      {
        style: 'text-decoration',
        getAttrs: (value) =>
          typeof value === 'string' && value.includes('underline') ? {} : false,
      },
      {
        style: 'text-decoration-line',
        getAttrs: (value) =>
          typeof value === 'string' && value.includes('underline') ? {} : false,
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['u', mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setUnderline:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),
      toggleUnderline:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
      unsetUnderline:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
  addKeyboardShortcuts() {
    return {
      'Mod-u': () => this.editor.commands.toggleUnderline(),
    };
  },
});

const TextColor = Mark.create({
  name: 'textColor',
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.style.color || null,
        renderHTML: (attributes) => {
          if (!attributes['color']) return {};
          return { style: `color: ${attributes['color']}` };
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[style*="color"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

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
      .tiptap-editor :global(.ProseMirror p) {
        margin: 0;
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
      .color-picker {
        width: 26px;
        height: 26px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        cursor: pointer;
        padding: 1px;
        background: #fff;
      }
      .link-popover-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.35);
        z-index: 40;
      }
      .link-popover {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(28rem, calc(100vw - 2rem));
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        box-shadow: 0 20px 35px rgba(0, 0, 0, 0.15);
        z-index: 50;
        padding: 1rem;
      }
      .link-popover-close {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        width: 1.75rem;
        height: 1.75rem;
        border: none;
        border-radius: 9999px;
        background: transparent;
        color: #b91c1c;
        cursor: pointer;
        font-size: 1rem;
        line-height: 1;
      }
      .link-popover-close:hover {
        background: #fee2e2;
      }
      .link-popover-input {
        width: 100%;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        padding: 0.5rem 0.625rem;
        font-size: 0.875rem;
      }
      .link-popover-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 0.75rem;
      }
      .link-popover-btn {
        border: 1px solid #d1d5db;
        border-radius: 8px;
        padding: 0.375rem 0.75rem;
        font-size: 0.8125rem;
        font-weight: 600;
        cursor: pointer;
        background: #fff;
      }
      .link-popover-btn.primary {
        border-color: #7f1d1d;
        color: #fff;
        background: #991b1b;
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
          [class.active]="isUnderline"
          (click)="cmd('toggleUnderline')"
          title="Underline"
          style="text-decoration:underline"
        >
          U
        </button>
        <input
          type="color"
          class="color-picker"
          [value]="currentTextColor"
          (input)="onTextColorInput($event)"
          title="Text color"
        />
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="hasTextColor"
          (click)="clearTextColor()"
          title="Clear text color"
        >
          A
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
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="uploadingImage"
          [disabled]="uploadingImage"
          (click)="insertImage()"
          title="Încarcă imagine"
        >
          @if (uploadingImage) {
            <span style="font-size:11px">…</span>
          } @else {
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
          }
        </button>
        <input
          #imageInput
          type="file"
          accept="image/*"
          class="hidden"
          (change)="onImageSelected($event)"
        />
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
    @if (showLinkPopover) {
      <button
        type="button"
        class="link-popover-backdrop"
        (click)="closeLinkPopover()"
        aria-label="Închide fereastra de link"
      ></button>
      <div class="link-popover" role="dialog" aria-modal="true" aria-label="Setează link">
        <button
          type="button"
          class="link-popover-close"
          (click)="removeLink()"
          title="Șterge link-ul"
          aria-label="Șterge link-ul"
        >
          ×
        </button>
        <div class="text-sm font-semibold text-gray-800 mb-2">Link URL</div>
        <input
          class="link-popover-input"
          type="url"
          placeholder="https://example.com"
          [value]="pendingLinkUrl"
          (input)="pendingLinkUrl = ($any($event.target).value || '').trim()"
          (keydown.enter)="applyLink()"
        />
        <div class="link-popover-actions">
          <button type="button" class="link-popover-btn" (click)="closeLinkPopover()">
            Anulează
          </button>
          <button type="button" class="link-popover-btn primary" (click)="applyLink()">
            Salvează
          </button>
        </div>
      </div>
    }
  `,
})
export class RichTextEditorComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() html = '';
  @Output() htmlChange = new EventEmitter<string>();
  @ViewChild('editorHost') hostRef!: ElementRef<HTMLDivElement>;
  @ViewChild('imageInput') imageInputRef!: ElementRef<HTMLInputElement>;

  private editor?: Editor;
  private api = inject(ApiService);
  private toast = inject(ToastService);

  uploadingImage = false;

  isBold = false;
  isItalic = false;
  isUnderline = false;
  hasTextColor = false;
  currentTextColor = '#111111';
  isStrike = false;
  isH1 = false;
  isH2 = false;
  isH3 = false;
  isBulletList = false;
  isOrderedList = false;
  isBlockquote = false;
  isCode = false;
  showLinkPopover = false;
  pendingLinkUrl = '';
  private savedLinkSelection: { from: number; to: number } | null = null;

  ngAfterViewInit() {
    this.editor = new Editor({
      element: this.hostRef.nativeElement,
      extensions: [
        StarterKit,
        Link.configure({ openOnClick: false }),
        Image,
        Underline,
        TextColor,
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
    if (!this.editor) return;
    const { from, to } = this.editor.state.selection;
    this.savedLinkSelection = { from, to };
    this.pendingLinkUrl = this.getLinkHrefForSelection(this.savedLinkSelection);
    this.showLinkPopover = true;
  }

  applyLink() {
    const editor = this.editor;
    if (!editor) return;
    const href = this.pendingLinkUrl.trim();
    if (!href) {
      this.removeLink();
      return;
    }
    let chain = editor.chain().focus();
    if (this.savedLinkSelection) {
      chain = chain.setTextSelection(this.savedLinkSelection);
    }
    chain.setLink({ href, target: '_blank' }).run();
    this.closeLinkPopover();
  }

  removeLink() {
    const editor = this.editor;
    if (!editor) return;
    const selection = this.savedLinkSelection ?? {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };
    this.runLinkCommandWithNearbySelections(selection, (chain) =>
      chain.extendMarkRange('link').unsetLink(),
    );
    this.closeLinkPopover();
  }

  closeLinkPopover() {
    this.showLinkPopover = false;
    this.pendingLinkUrl = '';
    this.savedLinkSelection = null;
  }

  private getLinkHrefForSelection(selection: { from: number; to: number }): string {
    const editor = this.editor;
    if (!editor) return '';

    let href = '';
    this.runLinkCommandWithNearbySelections(
      selection,
      (chain) => chain.extendMarkRange('link'),
      () => {
        href = (editor.getAttributes('link')['href'] as string | undefined) ?? '';
      },
      () => editor.isActive('link'),
    );
    return href;
  }

  private runLinkCommandWithNearbySelections(
    selection: { from: number; to: number },
    command: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>,
    onSuccess?: () => void,
    isSuccessful?: (didRun: boolean) => boolean,
  ): boolean {
    const editor = this.editor;
    if (!editor) return false;

    const positions = this.buildSelectionAttempts(selection, editor.state.doc.content.size);
    for (const candidate of positions) {
      const chain = editor.chain().focus().setTextSelection(candidate);
      const didRun = command(chain).run();
      if (isSuccessful?.(didRun) ?? didRun) {
        onSuccess?.();
        return true;
      }
    }

    return false;
  }

  private buildSelectionAttempts(
    selection: { from: number; to: number },
    docSize: number,
  ): Array<{ from: number; to: number }> {
    const boundedFrom = Math.max(1, Math.min(selection.from, docSize));
    const boundedTo = Math.max(1, Math.min(selection.to, docSize));
    const attempts: Array<{ from: number; to: number }> = [{ from: boundedFrom, to: boundedTo }];

    if (boundedFrom === boundedTo) {
      attempts.push({ from: Math.max(1, boundedFrom - 1), to: Math.max(1, boundedTo - 1) });
      attempts.push({
        from: Math.min(docSize, boundedFrom + 1),
        to: Math.min(docSize, boundedTo + 1),
      });
    }

    return attempts;
  }

  setTextColor(color: string) {
    this.currentTextColor = color;
    this.editor?.chain().focus().setMark('textColor', { color }).run();
  }

  onTextColorInput(event: Event) {
    this.setTextColor((event.target as HTMLInputElement).value);
  }

  clearTextColor() {
    this.editor?.chain().focus().unsetMark('textColor').run();
  }

  insertImage() {
    // Open the file picker; the selected file is uploaded to local media storage
    // and the returned local URL is inserted into the document.
    this.imageInputRef?.nativeElement.click();
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.uploadingImage = true;
    this.api.uploadMedia(file).subscribe({
      next: (media) => {
        this.editor?.chain().focus().setImage({ src: media.url }).run();
        this.uploadingImage = false;
        this.toast.success('Imagine încărcată');
      },
      error: (e: { error?: { message?: string } }) => {
        this.uploadingImage = false;
        this.toast.error(e?.error?.message || 'Eroare la încărcarea imaginii');
      },
    });
  }

  private syncActiveStates(editor: Editor) {
    this.isBold = editor.isActive('bold');
    this.isItalic = editor.isActive('italic');
    this.isUnderline = editor.isActive('underline');
    this.hasTextColor = editor.isActive('textColor');
    const textColor = editor.getAttributes('textColor')['color'] as string | undefined;
    this.currentTextColor = this.normalizeColorToHex(textColor) ?? '#111111';
    this.isStrike = editor.isActive('strike');
    this.isH1 = editor.isActive('heading', { level: 1 });
    this.isH2 = editor.isActive('heading', { level: 2 });
    this.isH3 = editor.isActive('heading', { level: 3 });
    this.isBulletList = editor.isActive('bulletList');
    this.isOrderedList = editor.isActive('orderedList');
    this.isBlockquote = editor.isActive('blockquote');
    this.isCode = editor.isActive('code');
  }

  private normalizeColorToHex(color: string | undefined): string | null {
    if (!color) return null;
    const normalized = color.trim().toLowerCase();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) {
      if (normalized.length === 4) {
        return `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
      }
      return normalized;
    }

    const rgbMatch = normalized.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/);
    if (!rgbMatch) return null;

    const [r, g, b] = rgbMatch.slice(1, 4).map((v) => Number(v));
    if ([r, g, b].some((v) => Number.isNaN(v) || v < 0 || v > 255)) return null;
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  }
}
