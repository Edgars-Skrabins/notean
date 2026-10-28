import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from "@angular/common";
import {TranslatePipe} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {Editor} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {IMAGE_TYPES} from "@config/attachmentLimits";
import {AttachmentService} from "@services/attachment.service";
import {IconComponent} from "@components/icon/icon.component";
import {TooltipDirective} from "@components/tooltip/tooltip.directive";
import {droppedFiles, isImageFile, pastedFiles} from "@utils/fileDrop";
import {AttachmentImage} from "./attachmentImage";

@Component({
  selector: 'app-rich-text-editor',
  imports: [
    NgIf,
    TranslatePipe,
    IconComponent,
    TooltipDirective
  ],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  encapsulation: ViewEncapsulation.None
})
export class RichTextEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly IMAGE_TYPES = IMAGE_TYPES.join(',');

  @Input() content = '';
  @Input() editable = true;
  @Input() compact = false;
  @Input() teamCode = '';
  @Input() uploadImage: ((file: File) => Promise<number | null>) | null = null;
  @Output() contentChange = new EventEmitter<string>();
  @Output() filesDropped = new EventEmitter<File[]>();

  @ViewChild('editorHost', {static: true}) editorHost!: ElementRef<HTMLDivElement>;
  @ViewChild('imageInput') imageInput?: ElementRef<HTMLInputElement>;

  editor: Editor | null = null;

  private uploadKey = 0;

  constructor(private attachmentService: AttachmentService) {
  }

  ngAfterViewInit() {
    this.editor = new Editor({
      element: this.editorHost.nativeElement,
      extensions: [
        StarterKit.configure({link: false, underline: false, listKeymap: false, trailingNode: false}),
        AttachmentImage.configure({
          resolveUrl: (attachmentId) => this.attachmentService.objectUrl(this.teamCode, attachmentId).then((response) => response.success ? response.url : null),
        }),
      ],
      content: this.content,
      editable: this.editable,
      editorProps: {
        handleDOMEvents: {
          keydown: (_view, event) => event.key === 'Escape',
        },
        handlePaste: (_view, event) => this.handleFiles(pastedFiles(event)),
        handleDrop: (view, event, _slice, moved) => !moved && this.handleFiles(droppedFiles(event), view.posAtCoords({left: event.clientX, top: event.clientY})?.pos),
      },
      onUpdate: ({editor}) => {
        this.contentChange.emit(editor.getHTML());
      },
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['editable'] && this.editor) {
      this.editor.setEditable(this.editable);
    }
    if (changes['content'] && this.editor && this.content !== this.editor.getHTML()) {
      this.editor.commands.setContent(this.content, {emitUpdate: false});
    }
  }

  pickImage() {
    this.imageInput?.nativeElement.click();
  }

  handleImagePicked(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = '';
    files.forEach((file) => this.insertImage(file));
  }

  ngOnDestroy() {
    this.editor?.destroy();
  }

  isActive(name: string, attrs?: Record<string, unknown>): boolean {
    return this.editor?.isActive(name, attrs) ?? false;
  }

  toggleBold() {
    this.editor?.chain().focus().toggleBold().run();
  }

  toggleItalic() {
    this.editor?.chain().focus().toggleItalic().run();
  }

  toggleHeading() {
    this.editor?.chain().focus().toggleHeading({level: 2}).run();
  }

  toggleBulletList() {
    this.editor?.chain().focus().toggleBulletList().run();
  }

  toggleOrderedList() {
    this.editor?.chain().focus().toggleOrderedList().run();
  }

  private handleFiles(files: File[], position?: number): boolean {
    if (!files.length || !this.editable) {
      return false;
    }
    const images = this.uploadImage ? files.filter(isImageFile) : [];
    const others = files.filter((file) => !images.includes(file));
    images.forEach((file) => this.insertImage(file, position));
    if (others.length) {
      this.filesDropped.emit(others);
    }
    return true;
  }

  private async insertImage(file: File, position?: number) {
    const editor = this.editor;
    if (!editor || !this.uploadImage) {
      return;
    }

    const uploadKey = ++this.uploadKey;
    const content = {type: AttachmentImage.name, attrs: {uploadKey, alt: file.name}};
    if (position === undefined) {
      editor.chain().insertContent(content).run();
    } else {
      editor.chain().insertContentAt(position, content).run();
    }

    const attachmentId = await this.uploadImage(file);
    if (editor.isDestroyed) {
      return;
    }
    const placeholders: { pos: number; size: number; attrs: Record<string, unknown> }[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === AttachmentImage.name && node.attrs['uploadKey'] === uploadKey) {
        placeholders.push({pos, size: node.nodeSize, attrs: node.attrs});
      }
    });
    const [placeholder] = placeholders;
    if (!placeholder) {
      return;
    }
    const transaction = attachmentId === null
      ? editor.state.tr.delete(placeholder.pos, placeholder.pos + placeholder.size)
      : editor.state.tr.setNodeMarkup(placeholder.pos, undefined, {...placeholder.attrs, attachmentId, uploadKey: null});
    editor.view.dispatch(transaction);
  }
}
