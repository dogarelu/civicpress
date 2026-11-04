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
import { Editor, Extension, Mark, Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  ARTICLE_REFERENCE_LABEL,
  articlePhotoBoxStyle,
  isYoutubeUrl,
  parseArticlePhotoAlign,
  parseArticlePhotoSize,
  toYoutubeEmbedUrl,
  type ArticlePhotoAlign,
  type ArticlePhotoSize,
} from '@civicpress/shared';
import { ApiService } from '../services/api.service';
import { ToastService } from '../services/toast.service';
import { videoFileRejection, videoUploadErrorMessage } from '../utils/media-upload';
import { PostPickerComponent, type PickedPost } from './post-picker.component';

const ArticleImage = Image.extend({
  inline: false,
  addAttributes() {
    return {
      ...this.parent?.(),
      size: {
        default: 'full',
        parseHTML: (element) => parseArticlePhotoSize(element.getAttribute('data-size')),
        renderHTML: (attributes) => {
          const size = parseArticlePhotoSize(attributes['size'] as string | undefined);
          const align = parseArticlePhotoAlign(attributes['align'] as string | undefined);
          return {
            'data-size': size,
            style: articlePhotoBoxStyle(size, align),
          };
        },
      },
      align: {
        default: 'center',
        parseHTML: (element) => parseArticlePhotoAlign(element.getAttribute('data-align')),
        renderHTML: (attributes) => ({
          'data-align': parseArticlePhotoAlign(attributes['align'] as string | undefined),
        }),
      },
    };
  },
});

function articleVideoFrame(src: string) {
  if (isYoutubeUrl(src)) {
    return [
      'iframe',
      {
        src: toYoutubeEmbedUrl(src),
        title: 'Video YouTube',
        allow:
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen',
        allowfullscreen: 'true',
        frameborder: '0',
        loading: 'lazy',
      },
    ];
  }
  return [
    'video',
    {
      src,
      controls: 'true',
      playsinline: 'true',
      preload: 'metadata',
    },
  ];
}

/** Block video in the article body, sized and aligned like article photos. */
const ArticleVideo = Node.create({
  name: 'articleVideo',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-src') || '',
        renderHTML: (attributes) => ({ 'data-src': attributes['src'] }),
      },
      size: {
        default: 'full',
        parseHTML: (element) => parseArticlePhotoSize(element.getAttribute('data-size')),
        renderHTML: (attributes) => {
          const size = parseArticlePhotoSize(attributes['size'] as string | undefined);
          const align = parseArticlePhotoAlign(attributes['align'] as string | undefined);
          return {
            'data-size': size,
            style: articlePhotoBoxStyle(size, align),
          };
        },
      },
      align: {
        default: 'center',
        parseHTML: (element) => parseArticlePhotoAlign(element.getAttribute('data-align')),
        renderHTML: (attributes) => ({
          'data-align': parseArticlePhotoAlign(attributes['align'] as string | undefined),
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div.cp-article-video[data-src]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    const src = String(node.attrs['src'] ?? '');
    return [
      'div',
      mergeAttributes(HTMLAttributes, { class: 'cp-article-video not-prose' }),
      ['div', { class: 'cp-article-video-frame' }, articleVideoFrame(src)],
    ];
  },
});

const FRAME_STYLES = ['solid', 'dotted', 'dashed'] as const;
type FrameStyle = (typeof FRAME_STYLES)[number];
const FRAME_PADDING = '0.75rem 1rem';

function parseFrameStyle(value: string | null | undefined): FrameStyle {
  return value === 'dotted' || value === 'dashed' ? value : 'solid';
}

function parseFrameWidth(value: unknown): number {
  const width = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(width)) return 2;
  return Math.min(8, Math.max(1, width));
}

function parseFrameColor(value: string | null | undefined): string {
  const raw = (value || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const hex = raw.slice(1);
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toLowerCase();
  }
  return '#c0392b';
}

function frameBorderStyle(color: string, width: number, style: FrameStyle): string {
  return `border:${width}px ${style} ${parseFrameColor(color)};padding:${FRAME_PADDING}`;
}

/** Box around one or more blocks. Padding is fixed; color, width, and line style are attributes. */
const ArticleFrame = Node.create({
  name: 'articleFrame',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      color: {
        default: '#c0392b',
        parseHTML: (element) => parseFrameColor(element.getAttribute('data-border-color')),
        renderHTML: (attributes) => ({
          'data-border-color': parseFrameColor(String(attributes['color'] ?? '')),
        }),
      },
      width: {
        default: 2,
        parseHTML: (element) => parseFrameWidth(element.getAttribute('data-border-width')),
        renderHTML: (attributes) => ({
          'data-border-width': String(parseFrameWidth(attributes['width'])),
        }),
      },
      style: {
        default: 'solid',
        parseHTML: (element) => parseFrameStyle(element.getAttribute('data-border-style')),
        renderHTML: (attributes) => ({
          'data-border-style': parseFrameStyle(String(attributes['style'] ?? '')),
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div.cp-article-frame' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    const color = parseFrameColor(String(node.attrs['color'] ?? ''));
    const width = parseFrameWidth(node.attrs['width']);
    const style = parseFrameStyle(String(node.attrs['style'] ?? ''));
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'cp-article-frame',
        style: frameBorderStyle(color, width, style),
      }),
      0,
    ];
  },
});

function isNodeSelection(selection: object): boolean {
  const node = (selection as { node?: { type?: { name?: string } } }).node;
  return typeof node?.type?.name === 'string';
}

function activeFramePos(state: Editor['state']): number | null {
  const { selection, doc } = state;
  const at = (pos: number) => {
    const safe = Math.max(0, Math.min(pos, doc.content.size));
    const $pos = doc.resolve(safe);
    for (let depth = $pos.depth; depth > 0; depth -= 1) {
      if ($pos.node(depth).type.name === 'articleFrame') return $pos.before(depth);
    }
    return null;
  };
  const start = at(selection.from);
  const end = at(Math.max(selection.from, selection.to - 1));
  if (start != null && start === end) return start;
  const node = doc.nodeAt(selection.from);
  if (node?.type.name === 'articleFrame' && selection.to === selection.from + node.nodeSize) {
    return selection.from;
  }
  return null;
}

interface ArticleReferencePreview {
  title: string;
  imageUrl: string | null;
}

function createArticleReference(load: (postId: string) => Promise<ArticleReferencePreview | null>) {
  return Node.create({
    name: 'articleReference',
    group: 'block',
    atom: true,
    selectable: true,
    draggable: true,
    addAttributes() {
      return {
        postId: {
          default: '',
          parseHTML: (element) => element.getAttribute('data-post-id') || '',
          renderHTML: (attributes) => ({ 'data-post-id': attributes['postId'] }),
        },
        showImage: {
          default: false,
          parseHTML: (element) => element.getAttribute('data-show-image') === 'true',
          renderHTML: (attributes) => ({
            'data-show-image': attributes['showImage'] ? 'true' : 'false',
          }),
        },
      };
    },
    parseHTML() {
      return [{ tag: 'div.cp-article-ref[data-post-id]', priority: 100 }];
    },
    renderHTML({ HTMLAttributes }) {
      return ['div', mergeAttributes(HTMLAttributes, { class: 'cp-article-ref' })];
    },
    addNodeView() {
      return ({ node }) => {
        const postId = String(node.attrs['postId'] ?? '');
        const showImage = node.attrs['showImage'] === true || node.attrs['showImage'] === 'true';
        const dom = document.createElement('div');
        dom.className = 'cp-article-ref';
        dom.setAttribute('contenteditable', 'false');
        const line = document.createElement('div');
        line.className = 'cp-article-ref-line';
        const label = document.createElement('span');
        label.className = 'cp-article-ref-label';
        label.textContent = `${ARTICLE_REFERENCE_LABEL} : `;
        const title = document.createElement('span');
        title.className = 'cp-article-ref-link';
        title.textContent = '…';
        line.append(label, title);
        dom.append(line);

        let cancelled = false;
        void load(postId).then((target) => {
          if (cancelled) return;
          if (!target?.title) {
            title.className = 'cp-article-ref-missing';
            title.textContent = 'Articol indisponibil';
            return;
          }
          title.textContent = target.title;
          if (showImage && target.imageUrl) {
            const img = document.createElement('img');
            img.className = 'cp-article-ref-image';
            img.src = target.imageUrl;
            img.alt = target.title;
            dom.append(img);
          }
        });

        return {
          dom,
          update(updated) {
            const nextId = String(updated.attrs['postId'] ?? '');
            const nextShow =
              updated.attrs['showImage'] === true || updated.attrs['showImage'] === 'true';
            if (updated.type.name !== 'articleReference') return false;
            return nextId === postId && nextShow === showImage;
          },
          destroy() {
            cancelled = true;
          },
        };
      };
    },
  });
}

const LINE_HEIGHT_OPTIONS = [
  { value: '', label: 'Implicit' },
  { value: '1.2', label: '1.2' },
  { value: '1.4', label: '1.4' },
  { value: '1.5', label: '1.5' },
  { value: '1.6', label: '1.6' },
  { value: '1.7', label: '1.7' },
  { value: '1.8', label: '1.8' },
  { value: '2', label: '2.0' },
  { value: '2.4', label: '2.4' },
] as const;

const TEXT_ALIGN_VALUES = ['left', 'center', 'right', 'justify'] as const;
type TextAlignValue = (typeof TEXT_ALIGN_VALUES)[number];

const BLOCK_STYLE_TYPES = ['paragraph', 'heading'] as const;

function parseTextAlign(element: HTMLElement): TextAlignValue | null {
  const fromStyle = element.style.textAlign;
  const fromAttr = element.getAttribute('align');
  const value = (fromStyle || fromAttr || '').toLowerCase();
  return TEXT_ALIGN_VALUES.includes(value as TextAlignValue) ? (value as TextAlignValue) : null;
}

/** Keep line-height and text-align on one style attribute so neither is dropped. */
function blockStyleHTML(attributes: Record<string, unknown>) {
  const styles: string[] = [];
  if (attributes['lineHeight']) styles.push(`line-height: ${attributes['lineHeight']}`);
  if (attributes['textAlign']) styles.push(`text-align: ${attributes['textAlign']}`);
  if (!styles.length) return {};
  return { style: styles.join('; ') };
}

/** Block-level line-height and text-align on paragraphs and headings. */
const LineHeight = Extension.create({
  name: 'lineHeight',
  addGlobalAttributes() {
    return [
      {
        types: [...BLOCK_STYLE_TYPES],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => {
              const value = (element as HTMLElement).style.lineHeight;
              return value || null;
            },
            renderHTML: (attributes) => blockStyleHTML(attributes),
          },
        },
      },
    ];
  },
});

const TextAlign = Extension.create({
  name: 'textAlign',
  addGlobalAttributes() {
    return [
      {
        types: [...BLOCK_STYLE_TYPES],
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element) => parseTextAlign(element as HTMLElement),
            renderHTML: (attributes) => blockStyleHTML(attributes),
          },
        },
      },
    ];
  },
});

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
  imports: [PostPickerComponent],
  styles: [
    `
      :host {
        display: block;
      }

      .tiptap-editor ::ng-deep .ProseMirror {
        outline: none;
        min-height: 24rem;
      }
      .tiptap-editor ::ng-deep .ProseMirror p {
        margin: 0;
      }
      .tiptap-editor ::ng-deep .ProseMirror img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 1rem 0;
      }
      .tiptap-editor ::ng-deep .ProseMirror img[data-size='small'] {
        width: 40% !important;
        max-width: 40%;
      }
      .tiptap-editor ::ng-deep .ProseMirror img[data-size='medium'] {
        width: 70% !important;
        max-width: 70%;
      }
      .tiptap-editor ::ng-deep .ProseMirror img[data-size='full'] {
        width: 100% !important;
        max-width: 100%;
      }
      .tiptap-editor ::ng-deep .ProseMirror img[data-align='left'] {
        margin-left: 0;
        margin-right: auto;
      }
      .tiptap-editor ::ng-deep .ProseMirror img[data-align='center'] {
        margin-left: auto;
        margin-right: auto;
      }
      .tiptap-editor ::ng-deep .ProseMirror img[data-align='right'] {
        margin-left: auto;
        margin-right: 0;
      }
      .tiptap-editor ::ng-deep .ProseMirror img.ProseMirror-selectednode {
        outline: 2px solid #b91c1c;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-video {
        max-width: 100%;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-video[data-size='small'] {
        width: 40% !important;
        max-width: 40%;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-video[data-size='medium'] {
        width: 70% !important;
        max-width: 70%;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-video[data-size='full'] {
        width: 100% !important;
        max-width: 100%;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-video[data-align='left'] {
        margin-left: 0;
        margin-right: auto;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-video[data-align='center'] {
        margin-left: auto;
        margin-right: auto;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-video[data-align='right'] {
        margin-left: auto;
        margin-right: 0;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-video-frame {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        background: #111;
        overflow: hidden;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-video-frame iframe,
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-video-frame video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
        margin: 0;
        display: block;
        pointer-events: none;
        background: #000;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-video.ProseMirror-selectednode {
        outline: 2px solid #b91c1c;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-ref {
        margin: 0.75rem 0;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-ref.ProseMirror-selectednode {
        outline: 2px solid #b91c1c;
        outline-offset: 2px;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-ref-line {
        margin: 0 0 0.5rem;
        font-weight: 700;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-ref-link {
        color: var(--color-accent, #c0392b);
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-ref-missing {
        color: #6b7280;
        font-weight: 600;
        text-decoration: none;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-ref-image {
        display: block;
        width: min(100%, 420px);
        max-width: 100%;
        height: auto;
        margin: 0;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-frame {
        margin: 0.75rem 0;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-frame > :first-child {
        margin-top: 0;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-frame > :last-child {
        margin-bottom: 0;
      }
      .tiptap-editor ::ng-deep .ProseMirror .cp-article-frame p + p {
        margin-top: 0.75rem;
      }
      .tiptap-editor ::ng-deep .ProseMirror [style*='text-align: center'] img,
      .tiptap-editor ::ng-deep .ProseMirror [style*='text-align:center'] img {
        display: block;
        margin-left: auto;
        margin-right: auto;
      }
      .tiptap-editor ::ng-deep .ProseMirror [style*='text-align: right'] img,
      .tiptap-editor ::ng-deep .ProseMirror [style*='text-align:right'] img {
        display: block;
        margin-left: auto;
        margin-right: 0;
      }
      .tiptap-editor ::ng-deep .ProseMirror p.is-editor-empty:first-child::before {
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
      .toolbar-btn:disabled,
      .line-height-select:disabled {
        opacity: 0.4;
        cursor: not-allowed;
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
        max-height: calc(100vh - 2rem);
        overflow: auto;
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
      .link-popover-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .line-height-select {
        height: 26px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        background: #fff;
        color: #374151;
        font-size: 12px;
        font-weight: 600;
        padding: 0 4px;
        cursor: pointer;
      }
      .line-height-select:hover {
        background: #e5e7eb;
      }
      .image-tools {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.375rem 0.5rem;
        padding: 0.375rem 0.75rem;
        background: #fef2f2;
        border-bottom: 1px solid #fecaca;
        font-size: 12px;
        color: #7f1d1d;
      }
      .image-tools-label {
        font-weight: 700;
        margin-right: 0.25rem;
      }
      .image-tools-btn {
        border: 1px solid #fecaca;
        background: #fff;
        color: #7f1d1d;
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .image-tools-btn.active {
        background: #991b1b;
        border-color: #7f1d1d;
        color: #fff;
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
        <select
          class="line-height-select"
          [value]="currentLineHeight"
          (change)="onLineHeightChange($event)"
          title="Spațiere rânduri (paragraf)"
        >
          @for (opt of lineHeightOptions; track opt.value) {
            <option [value]="opt.value">{{ opt.label }}</option>
          }
        </select>
        <div class="toolbar-sep"></div>
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="currentTextAlign === 'left'"
          (click)="setTextAlign('left')"
          title="Aliniere stânga"
          aria-label="Aliniere stânga"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="15" y2="12" />
            <line x1="3" y1="18" x2="18" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="currentTextAlign === 'center'"
          (click)="setTextAlign('center')"
          title="Aliniere mijloc"
          aria-label="Aliniere mijloc"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="6" y1="12" x2="18" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="currentTextAlign === 'right'"
          (click)="setTextAlign('right')"
          title="Aliniere dreapta"
          aria-label="Aliniere dreapta"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="9" y1="12" x2="21" y2="12" />
            <line x1="6" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="currentTextAlign === 'justify'"
          (click)="setTextAlign('justify')"
          title="Aliniere justify"
          aria-label="Aliniere justify"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
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
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="uploadingVideo || showVideoPopover"
          [disabled]="uploadingVideo"
          (click)="openVideoPopover()"
          title="Inserează video (YouTube sau upload)"
          aria-label="Inserează video"
        >
          @if (uploadingVideo) {
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
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          }
        </button>
        <input
          #videoInput
          type="file"
          accept="video/mp4,video/*"
          class="hidden"
          (change)="onVideoSelected($event)"
        />
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="showRefPopover"
          (click)="openRefPopover()"
          title="Inserează referință către alt articol"
        >
          Vezi și
        </button>
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="isFrame || showFramePopover"
          (mousedown)="keepImageTarget($event)"
          (click)="openFramePopover()"
          title="Pune un chenar în jurul textului sau imaginii selectate"
        >
          Chenar
        </button>
        <select
          class="line-height-select"
          [disabled]="!hasMediaTarget"
          [value]="currentMediaSize"
          (change)="onMediaSizeChange($event)"
          title="Mărime — click pe o poză sau un video din text, apoi alege mărimea"
        >
          <option value="small">{{ mediaSizeOptionLabel('small') }}</option>
          <option value="medium">{{ mediaSizeOptionLabel('medium') }}</option>
          <option value="full">Toată lățimea</option>
        </select>
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="hasMediaTarget && currentMediaAlign === 'left'"
          [disabled]="!hasMediaTarget"
          (mousedown)="keepImageTarget($event)"
          (click)="setMediaAlign('left')"
          [title]="mediaAlignTitle('stânga')"
          [attr.aria-label]="mediaAlignTitle('stânga')"
        >
          ◧
        </button>
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="hasMediaTarget && currentMediaAlign === 'center'"
          [disabled]="!hasMediaTarget"
          (mousedown)="keepImageTarget($event)"
          (click)="setMediaAlign('center')"
          [title]="mediaAlignTitle('centru')"
          [attr.aria-label]="mediaAlignTitle('centru')"
        >
          ▣
        </button>
        <button
          type="button"
          class="toolbar-btn"
          [class.active]="hasMediaTarget && currentMediaAlign === 'right'"
          [disabled]="!hasMediaTarget"
          (mousedown)="keepImageTarget($event)"
          (click)="setMediaAlign('right')"
          [title]="mediaAlignTitle('dreapta')"
          [attr.aria-label]="mediaAlignTitle('dreapta')"
        >
          ◨
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
      @if (hasImageTarget) {
        <div class="image-tools">
          <span class="image-tools-label">Poză selectată</span>
          <span>Mărime:</span>
          <button
            type="button"
            class="image-tools-btn"
            [class.active]="currentImageSize === 'small'"
            (mousedown)="keepImageTarget($event)"
            (click)="setImageSize('small')"
          >
            Mică
          </button>
          <button
            type="button"
            class="image-tools-btn"
            [class.active]="currentImageSize === 'medium'"
            (mousedown)="keepImageTarget($event)"
            (click)="setImageSize('medium')"
          >
            Medie
          </button>
          <button
            type="button"
            class="image-tools-btn"
            [class.active]="currentImageSize === 'full'"
            (mousedown)="keepImageTarget($event)"
            (click)="setImageSize('full')"
          >
            Toată lățimea
          </button>
          <span>Aliniere:</span>
          <button
            type="button"
            class="image-tools-btn"
            [class.active]="currentImageAlign === 'left'"
            (mousedown)="keepImageTarget($event)"
            (click)="setImageAlign('left')"
          >
            Stânga
          </button>
          <button
            type="button"
            class="image-tools-btn"
            [class.active]="currentImageAlign === 'center'"
            (mousedown)="keepImageTarget($event)"
            (click)="setImageAlign('center')"
          >
            Centru
          </button>
          <button
            type="button"
            class="image-tools-btn"
            [class.active]="currentImageAlign === 'right'"
            (mousedown)="keepImageTarget($event)"
            (click)="setImageAlign('right')"
          >
            Dreapta
          </button>
        </div>
      }
      @if (hasVideoTarget) {
        <div class="image-tools">
          <span class="image-tools-label">Video selectat</span>
          <span>Mărime:</span>
          <button
            type="button"
            class="image-tools-btn"
            [class.active]="currentVideoSize === 'small'"
            (mousedown)="keepImageTarget($event)"
            (click)="setVideoSize('small')"
          >
            Mic
          </button>
          <button
            type="button"
            class="image-tools-btn"
            [class.active]="currentVideoSize === 'medium'"
            (mousedown)="keepImageTarget($event)"
            (click)="setVideoSize('medium')"
          >
            Mediu
          </button>
          <button
            type="button"
            class="image-tools-btn"
            [class.active]="currentVideoSize === 'full'"
            (mousedown)="keepImageTarget($event)"
            (click)="setVideoSize('full')"
          >
            Toată lățimea
          </button>
          <span>Aliniere:</span>
          <button
            type="button"
            class="image-tools-btn"
            [class.active]="currentVideoAlign === 'left'"
            (mousedown)="keepImageTarget($event)"
            (click)="setVideoAlign('left')"
          >
            Stânga
          </button>
          <button
            type="button"
            class="image-tools-btn"
            [class.active]="currentVideoAlign === 'center'"
            (mousedown)="keepImageTarget($event)"
            (click)="setVideoAlign('center')"
          >
            Centru
          </button>
          <button
            type="button"
            class="image-tools-btn"
            [class.active]="currentVideoAlign === 'right'"
            (mousedown)="keepImageTarget($event)"
            (click)="setVideoAlign('right')"
          >
            Dreapta
          </button>
        </div>
      }
      @if (isFrame) {
        <div class="image-tools">
          <span class="image-tools-label">Chenar</span>
          <input
            type="color"
            class="color-picker"
            [value]="frameColor"
            (change)="onFrameColor($event)"
            title="Culoare chenar"
          />
          <span>Grosime:</span>
          <select
            class="line-height-select"
            [value]="'' + frameWidth"
            (mousedown)="keepImageTarget($event)"
            (change)="onFrameWidth($event)"
            title="Grosime linie"
          >
            @for (width of frameWidths; track width) {
              <option [value]="width" [selected]="width === frameWidth">{{ width }} px</option>
            }
          </select>
          @for (style of frameStyles; track style.value) {
            <button
              type="button"
              class="image-tools-btn"
              [class.active]="frameStyle === style.value"
              (mousedown)="keepImageTarget($event)"
              (click)="setFrameStyle(style.value)"
            >
              {{ style.label }}
            </button>
          }
          <button
            type="button"
            class="image-tools-btn"
            (mousedown)="keepImageTarget($event)"
            (click)="removeFrame()"
          >
            Scoate
          </button>
        </div>
      }
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
    @if (showVideoPopover) {
      <button
        type="button"
        class="link-popover-backdrop"
        (click)="closeVideoPopover()"
        aria-label="Închide fereastra de video"
      ></button>
      <div class="link-popover" role="dialog" aria-modal="true" aria-label="Inserează video">
        <button
          type="button"
          class="link-popover-close"
          (click)="closeVideoPopover()"
          title="Închide"
          aria-label="Închide"
        >
          ×
        </button>
        <div class="text-sm font-semibold text-gray-800 mb-2">Video în text</div>
        <input
          class="link-popover-input"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          [value]="pendingVideoUrl"
          (input)="pendingVideoUrl = ($any($event.target).value || '').trim()"
          (keydown.enter)="insertYoutubeVideo()"
        />
        <div class="link-popover-actions">
          <button type="button" class="link-popover-btn" (click)="closeVideoPopover()">
            Anulează
          </button>
          <button
            type="button"
            class="link-popover-btn"
            [disabled]="uploadingVideo"
            (click)="pickVideoFile()"
          >
            Încarcă fișier
          </button>
          <button type="button" class="link-popover-btn primary" (click)="insertYoutubeVideo()">
            Inserează
          </button>
        </div>
      </div>
    }
    @if (showRefPopover) {
      <button
        type="button"
        class="link-popover-backdrop"
        (click)="closeRefPopover()"
        aria-label="Închide fereastra de referință"
      ></button>
      <div
        class="link-popover"
        role="dialog"
        aria-modal="true"
        aria-label="Referință către articol"
      >
        <button
          type="button"
          class="link-popover-close"
          (click)="closeRefPopover()"
          title="Închide"
          aria-label="Închide"
        >
          ×
        </button>
        <div class="text-sm font-semibold text-gray-800 mb-2">Vezi și</div>
        <cp-post-picker
          label="Articol"
          [inline]="true"
          [value]="pendingRefPost"
          (selected)="pendingRefPost = $event"
        />
        <label class="mt-3 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            [checked]="pendingRefShowImage"
            (change)="pendingRefShowImage = $any($event.target).checked"
          />
          Cu poză
        </label>
        <p class="mt-1 text-xs text-gray-500">
          Poza este imaginea principală a articolului. Doar titlul este link.
        </p>
        <div class="link-popover-actions">
          <button type="button" class="link-popover-btn" (click)="closeRefPopover()">
            Anulează
          </button>
          <button
            type="button"
            class="link-popover-btn primary"
            [disabled]="!pendingRefPost"
            (click)="insertArticleReference()"
          >
            Inserează
          </button>
        </div>
      </div>
    }
    @if (showFramePopover) {
      <button
        type="button"
        class="link-popover-backdrop"
        (click)="closeFramePopover()"
        aria-label="Închide fereastra de chenar"
      ></button>
      <div class="link-popover" role="dialog" aria-modal="true" aria-label="Chenar">
        <button
          type="button"
          class="link-popover-close"
          (click)="closeFramePopover()"
          title="Închide"
          aria-label="Închide"
        >
          ×
        </button>
        <div class="text-sm font-semibold text-gray-800 mb-2">Chenar</div>
        <p class="mb-3 text-xs text-gray-500">
          Se aplică pe textul sau imaginea selectată. Spațiul din interior este fix.
        </p>
        <label class="mb-2 flex items-center gap-2 text-sm text-gray-700">
          Culoare
          <input
            type="color"
            class="color-picker"
            [value]="draftFrameColor"
            (input)="draftFrameColor = parseFrameColor($any($event.target).value)"
          />
        </label>
        <label class="mb-3 block text-sm text-gray-700">
          Grosime
          <select
            class="line-height-select mt-1"
            [value]="'' + draftFrameWidth"
            (change)="draftFrameWidth = parseFrameWidth($any($event.target).value)"
          >
            @for (width of frameWidths; track width) {
              <option [value]="width" [selected]="width === draftFrameWidth">{{ width }} px</option>
            }
          </select>
        </label>
        <div class="flex flex-wrap gap-1">
          @for (style of frameStyles; track style.value) {
            <button
              type="button"
              class="image-tools-btn"
              [class.active]="draftFrameStyle === style.value"
              (click)="draftFrameStyle = style.value"
            >
              {{ style.label }}
            </button>
          }
        </div>
        <div class="link-popover-actions">
          <button type="button" class="link-popover-btn" (click)="closeFramePopover()">
            Anulează
          </button>
          <button type="button" class="link-popover-btn primary" (click)="applyFrame()">
            Aplică
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
  @ViewChild('videoInput') videoInputRef!: ElementRef<HTMLInputElement>;

  private editor?: Editor;
  private api = inject(ApiService);
  private toast = inject(ToastService);

  uploadingImage = false;
  uploadingVideo = false;

  readonly lineHeightOptions = LINE_HEIGHT_OPTIONS;

  isBold = false;
  isItalic = false;
  isUnderline = false;
  hasTextColor = false;
  currentTextColor = '#111111';
  currentLineHeight = '';
  currentTextAlign: TextAlignValue = 'left';
  isStrike = false;
  isH1 = false;
  isH2 = false;
  isH3 = false;
  isBulletList = false;
  isOrderedList = false;
  isBlockquote = false;
  isCode = false;
  isImage = false;
  hasImageTarget = false;
  currentImageSize: ArticlePhotoSize = 'full';
  currentImageAlign: ArticlePhotoAlign = 'center';
  private lastImagePos: number | null = null;
  isVideo = false;
  hasVideoTarget = false;
  currentVideoSize: ArticlePhotoSize = 'full';
  currentVideoAlign: ArticlePhotoAlign = 'center';
  private lastVideoPos: number | null = null;
  showVideoPopover = false;
  pendingVideoUrl = '';
  showRefPopover = false;
  showFramePopover = false;
  isFrame = false;
  frameColor = '#c0392b';
  frameWidth = 2;
  frameStyle: FrameStyle = 'solid';
  draftFrameColor = '#c0392b';
  draftFrameWidth = 2;
  draftFrameStyle: FrameStyle = 'solid';
  readonly frameWidths = [1, 2, 3, 4, 5, 6, 8];
  readonly frameStyles: { value: FrameStyle; label: string }[] = [
    { value: 'solid', label: 'Continuă' },
    { value: 'dotted', label: 'Punctată' },
    { value: 'dashed', label: 'Întreruptă' },
  ];
  readonly parseFrameColor = parseFrameColor;
  readonly parseFrameWidth = parseFrameWidth;
  private framePos: number | null = null;
  private savedFrameSelection: { from: number; to: number; node: boolean } | null = null;
  pendingRefShowImage = false;
  pendingRefPost: PickedPost | null = null;
  private savedRefSelection: { from: number; to: number } | null = null;
  private refLoads = new Map<string, Promise<ArticleReferencePreview | null>>();
  private savedVideoSelection: { from: number; to: number } | null = null;
  showLinkPopover = false;
  pendingLinkUrl = '';
  private savedLinkSelection: { from: number; to: number } | null = null;

  ngAfterViewInit() {
    this.api.getSettings().subscribe({
      next: (settings) => {
        if (settings.accentColor) {
          this.hostRef?.nativeElement.style.setProperty('--color-accent', settings.accentColor);
        }
      },
      error: () => undefined,
    });
    this.editor = new Editor({
      element: this.hostRef.nativeElement,
      extensions: [
        StarterKit,
        Link.configure({ openOnClick: false }),
        ArticleImage,
        ArticleVideo,
        ArticleFrame,
        createArticleReference((postId) => this.loadArticleReference(postId)),
        Underline,
        TextColor,
        LineHeight,
        TextAlign,
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
    this.showRefPopover = false;
    this.showFramePopover = false;
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

  onLineHeightChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.setLineHeight(value || null);
  }

  setLineHeight(value: string | null) {
    const editor = this.editor;
    if (!editor) return;
    const type = editor.isActive('heading') ? 'heading' : 'paragraph';
    this.currentLineHeight = value ?? '';
    editor.chain().focus().updateAttributes(type, { lineHeight: value }).run();
  }

  setTextAlign(alignment: TextAlignValue) {
    const editor = this.editor;
    if (!editor) return;
    const value = alignment === 'left' ? null : alignment;
    this.currentTextAlign = alignment;
    for (const type of BLOCK_STYLE_TYPES) {
      editor.chain().focus().updateAttributes(type, { textAlign: value }).run();
    }
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
        this.selectImageBySrc(media.url);
        this.applyImageAttrs({ size: 'full', align: 'center' });
        this.uploadingImage = false;
        this.toast.success('Imagine încărcată — alege mărimea din bara de deasupra textului');
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
    const blockType = editor.isActive('heading') ? 'heading' : 'paragraph';
    const lineHeight = editor.getAttributes(blockType)['lineHeight'] as string | null | undefined;
    this.currentLineHeight = lineHeight ?? '';
    const textAlign = editor.getAttributes(blockType)['textAlign'] as
      | TextAlignValue
      | null
      | undefined;
    this.currentTextAlign = textAlign && TEXT_ALIGN_VALUES.includes(textAlign) ? textAlign : 'left';
    this.isStrike = editor.isActive('strike');
    this.isH1 = editor.isActive('heading', { level: 1 });
    this.isH2 = editor.isActive('heading', { level: 2 });
    this.isH3 = editor.isActive('heading', { level: 3 });
    this.isBulletList = editor.isActive('bulletList');
    this.isOrderedList = editor.isActive('orderedList');
    this.isBlockquote = editor.isActive('blockquote');
    this.isCode = editor.isActive('code');
    const framePos = activeFramePos(editor.state);
    this.framePos = framePos;
    this.isFrame = framePos != null;
    if (framePos != null && !this.showFramePopover) {
      const frame = editor.state.doc.nodeAt(framePos);
      this.frameColor = parseFrameColor(String(frame?.attrs['color'] ?? ''));
      this.frameWidth = parseFrameWidth(frame?.attrs['width']);
      this.frameStyle = parseFrameStyle(String(frame?.attrs['style'] ?? ''));
    }
    this.isImage = editor.isActive('image');
    this.isVideo = editor.isActive('articleVideo');
    if (this.isImage) {
      this.lastImagePos = editor.state.selection.from;
      this.lastVideoPos = null;
      const attrs = editor.getAttributes('image');
      this.currentImageSize = parseArticlePhotoSize(attrs['size'] as string | undefined);
      this.currentImageAlign = parseArticlePhotoAlign(attrs['align'] as string | undefined);
    } else if (this.isVideo) {
      this.lastVideoPos = editor.state.selection.from;
      this.lastImagePos = null;
      const attrs = editor.getAttributes('articleVideo');
      this.currentVideoSize = parseArticlePhotoSize(attrs['size'] as string | undefined);
      this.currentVideoAlign = parseArticlePhotoAlign(attrs['align'] as string | undefined);
    } else if (editor.isFocused) {
      this.lastImagePos = null;
      this.lastVideoPos = null;
    }
    this.hasImageTarget = this.isImage || this.lastImagePos != null;
    this.hasVideoTarget = this.isVideo || this.lastVideoPos != null;
  }

  get hasMediaTarget(): boolean {
    return this.hasImageTarget || this.hasVideoTarget;
  }

  get videoControlsActive(): boolean {
    return this.hasVideoTarget && !this.hasImageTarget;
  }

  get currentMediaSize(): ArticlePhotoSize {
    return this.videoControlsActive ? this.currentVideoSize : this.currentImageSize;
  }

  get currentMediaAlign(): ArticlePhotoAlign {
    return this.videoControlsActive ? this.currentVideoAlign : this.currentImageAlign;
  }

  mediaSizeOptionLabel(size: 'small' | 'medium'): string {
    if (this.videoControlsActive) return size === 'small' ? 'Video mic' : 'Video mediu';
    return size === 'small' ? 'Poză mică' : 'Poză medie';
  }

  mediaAlignTitle(side: string): string {
    return this.videoControlsActive ? `Aliniere video ${side}` : `Aliniere poză ${side}`;
  }

  onMediaSizeChange(event: Event) {
    const size = parseArticlePhotoSize((event.target as HTMLSelectElement).value);
    if (this.videoControlsActive) this.setVideoSize(size);
    else this.setImageSize(size);
  }

  setMediaAlign(align: ArticlePhotoAlign) {
    if (this.videoControlsActive) this.setVideoAlign(align);
    else this.setImageAlign(align);
  }

  keepImageTarget(event: Event) {
    event.preventDefault();
  }

  onImageSizeChange(event: Event) {
    this.setImageSize(parseArticlePhotoSize((event.target as HTMLSelectElement).value));
  }

  setImageSize(size: ArticlePhotoSize) {
    if (!this.applyImageAttrs({ size })) return;
    this.currentImageSize = size;
  }

  setImageAlign(align: ArticlePhotoAlign) {
    if (!this.applyImageAttrs({ align })) return;
    this.currentImageAlign = align;
  }

  private applyImageAttrs(attrs: { size?: ArticlePhotoSize; align?: ArticlePhotoAlign }): boolean {
    const editor = this.editor;
    if (!editor) return false;
    const pos = this.resolveImagePos();
    if (pos == null) return false;
    editor.chain().setNodeSelection(pos).focus().updateAttributes('image', attrs).run();
    this.lastImagePos = pos;
    this.isImage = true;
    this.hasImageTarget = true;
    return true;
  }

  private resolveImagePos(): number | null {
    const editor = this.editor;
    if (!editor) return null;
    if (editor.isActive('image')) return editor.state.selection.from;
    if (this.lastImagePos == null) return null;
    const node = editor.state.doc.nodeAt(this.lastImagePos);
    return node?.type.name === 'image' ? this.lastImagePos : null;
  }

  private selectImageBySrc(src: string) {
    const editor = this.editor;
    if (!editor) return;
    let pos: number | null = null;
    editor.state.doc.descendants((node, nodePos) => {
      if (node.type.name === 'image' && node.attrs['src'] === src) {
        pos = nodePos;
      }
      return true;
    });
    if (pos == null) return;
    editor.chain().setNodeSelection(pos).focus().run();
    this.lastImagePos = pos;
    this.isImage = true;
    this.hasImageTarget = true;
    this.currentImageSize = 'full';
    this.currentImageAlign = 'center';
  }

  openVideoPopover() {
    const editor = this.editor;
    if (!editor) return;
    const { from, to } = editor.state.selection;
    this.savedVideoSelection = { from, to };
    this.pendingVideoUrl = '';
    this.showRefPopover = false;
    this.showFramePopover = false;
    this.showVideoPopover = true;
  }

  closeVideoPopover() {
    this.showVideoPopover = false;
    this.pendingVideoUrl = '';
    this.savedVideoSelection = null;
  }

  openRefPopover() {
    const editor = this.editor;
    if (!editor) return;
    const { from, to } = editor.state.selection;
    this.savedRefSelection = { from, to };
    this.pendingRefPost = null;
    this.pendingRefShowImage = false;
    this.showLinkPopover = false;
    this.showVideoPopover = false;
    this.showFramePopover = false;
    this.showRefPopover = true;
  }

  closeRefPopover() {
    this.showRefPopover = false;
    this.pendingRefPost = null;
    this.pendingRefShowImage = false;
    this.savedRefSelection = null;
  }

  openFramePopover() {
    const editor = this.editor;
    if (!editor) return;
    if (this.isFrame) return;
    const selection = editor.state.selection;
    this.savedFrameSelection = {
      from: selection.from,
      to: selection.to,
      node: isNodeSelection(selection),
    };
    this.draftFrameColor = this.frameColor;
    this.draftFrameWidth = this.frameWidth;
    this.draftFrameStyle = this.frameStyle;
    this.showLinkPopover = false;
    this.showVideoPopover = false;
    this.showRefPopover = false;
    this.showFramePopover = true;
  }

  closeFramePopover() {
    this.showFramePopover = false;
    this.savedFrameSelection = null;
  }

  applyFrame() {
    const editor = this.editor;
    if (!editor) return;
    const attrs = {
      color: parseFrameColor(this.draftFrameColor),
      width: parseFrameWidth(this.draftFrameWidth),
      style: parseFrameStyle(this.draftFrameStyle),
    };
    const selection = this.savedFrameSelection;
    let chain = editor.chain().focus();
    if (selection?.node) chain = chain.setNodeSelection(selection.from);
    else if (selection) chain = chain.setTextSelection(selection);
    const applied = chain.wrapIn('articleFrame', attrs).run();
    if (!applied) {
      this.toast.error('Selectează paragrafele sau imaginea pe care vrei chenarul.');
      return;
    }
    this.frameColor = attrs.color;
    this.frameWidth = attrs.width;
    this.frameStyle = attrs.style;
    this.closeFramePopover();
  }

  onFrameColor(event: Event) {
    this.updateFrameAttrs({ color: parseFrameColor((event.target as HTMLInputElement).value) });
  }

  onFrameWidth(event: Event) {
    this.updateFrameAttrs({ width: parseFrameWidth((event.target as HTMLSelectElement).value) });
  }

  setFrameStyle(style: FrameStyle) {
    this.updateFrameAttrs({ style });
  }

  removeFrame() {
    const editor = this.editor;
    const pos = this.framePos;
    if (!editor || pos == null) return;
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        const node = tr.doc.nodeAt(pos);
        if (!node || node.type.name !== 'articleFrame') return false;
        tr.replaceWith(pos, pos + node.nodeSize, node.content);
        return true;
      })
      .run();
  }

  private updateFrameAttrs(partial: { color?: string; width?: number; style?: FrameStyle }) {
    const editor = this.editor;
    const pos = this.framePos;
    if (!editor || pos == null) return;
    const applied = editor
      .chain()
      .command(({ tr }) => {
        const node = tr.doc.nodeAt(pos);
        if (!node || node.type.name !== 'articleFrame') return false;
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...partial });
        return true;
      })
      .run();
    if (!applied) return;
    if (partial.color) this.frameColor = partial.color;
    if (partial.width) this.frameWidth = partial.width;
    if (partial.style) this.frameStyle = partial.style;
  }

  insertArticleReference() {
    const post = this.pendingRefPost;
    const editor = this.editor;
    if (!editor || !post) {
      this.toast.error('Alege un articol.');
      return;
    }
    const selection = this.savedRefSelection;
    let chain = editor.chain().focus();
    if (selection) chain = chain.setTextSelection(selection);
    chain
      .insertContent({
        type: 'articleReference',
        attrs: { postId: post.id, showImage: this.pendingRefShowImage },
      })
      .run();
    this.closeRefPopover();
  }

  private loadArticleReference(postId: string): Promise<ArticleReferencePreview | null> {
    const cached = this.refLoads.get(postId);
    if (cached) return cached;
    const pending = new Promise<ArticleReferencePreview | null>((resolve) => {
      this.api.getArticleReferences([postId]).subscribe({
        next: (res) => {
          const match = res.posts.find((item) => item.id === postId);
          resolve(match ? { title: match.title, imageUrl: match.imageUrl } : null);
        },
        error: () => resolve(null),
      });
    });
    this.refLoads.set(postId, pending);
    return pending;
  }

  insertYoutubeVideo() {
    const url = this.pendingVideoUrl.trim();
    if (!isYoutubeUrl(url)) {
      this.toast.error('Linkul nu este un video YouTube.');
      return;
    }
    this.insertVideo(url);
  }

  pickVideoFile() {
    this.videoInputRef?.nativeElement.click();
  }

  onVideoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const rejection = videoFileRejection(file);
    if (rejection) {
      this.toast.error(rejection);
      return;
    }

    this.uploadingVideo = true;
    this.api.uploadMedia(file).subscribe({
      next: (media) => {
        this.insertVideo(media.url);
        this.uploadingVideo = false;
      },
      error: (err: unknown) => {
        this.uploadingVideo = false;
        this.toast.error(videoUploadErrorMessage(err));
      },
    });
  }

  private insertVideo(src: string) {
    const editor = this.editor;
    if (!editor) return;
    const selection = this.savedVideoSelection;
    let chain = editor.chain().focus();
    if (selection) chain = chain.setTextSelection(selection);
    chain
      .insertContent({
        type: 'articleVideo',
        attrs: { src, size: 'full', align: 'center' },
      })
      .run();
    this.selectVideoBySrc(src);
    this.showVideoPopover = false;
    this.pendingVideoUrl = '';
    this.savedVideoSelection = null;
    this.toast.success('Video adăugat — alege mărimea din bara de deasupra textului');
  }

  setVideoSize(size: ArticlePhotoSize) {
    if (!this.applyVideoAttrs({ size })) return;
    this.currentVideoSize = size;
  }

  setVideoAlign(align: ArticlePhotoAlign) {
    if (!this.applyVideoAttrs({ align })) return;
    this.currentVideoAlign = align;
  }

  private applyVideoAttrs(attrs: { size?: ArticlePhotoSize; align?: ArticlePhotoAlign }): boolean {
    const editor = this.editor;
    if (!editor) return false;
    const pos = this.resolveVideoPos();
    if (pos == null) return false;
    editor.chain().setNodeSelection(pos).focus().updateAttributes('articleVideo', attrs).run();
    this.lastVideoPos = pos;
    this.isVideo = true;
    this.hasVideoTarget = true;
    return true;
  }

  private resolveVideoPos(): number | null {
    const editor = this.editor;
    if (!editor) return null;
    if (editor.isActive('articleVideo')) return editor.state.selection.from;
    if (this.lastVideoPos == null) return null;
    const node = editor.state.doc.nodeAt(this.lastVideoPos);
    return node?.type.name === 'articleVideo' ? this.lastVideoPos : null;
  }

  private selectVideoBySrc(src: string) {
    const editor = this.editor;
    if (!editor) return;
    let pos: number | null = null;
    editor.state.doc.descendants((node, nodePos) => {
      if (node.type.name === 'articleVideo' && node.attrs['src'] === src) {
        pos = nodePos;
      }
      return true;
    });
    if (pos == null) return;
    editor.chain().setNodeSelection(pos).focus().run();
    this.lastVideoPos = pos;
    this.lastImagePos = null;
    this.isVideo = true;
    this.hasVideoTarget = true;
    this.hasImageTarget = false;
    this.currentVideoSize = 'full';
    this.currentVideoAlign = 'center';
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
