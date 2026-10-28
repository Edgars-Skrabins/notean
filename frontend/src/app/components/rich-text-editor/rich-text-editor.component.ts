import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from "@angular/common";
import {TranslatePipe} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {Editor} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

@Component({
  selector: 'app-rich-text-editor',
  imports: [
    NgIf,
    TranslatePipe
  ],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  encapsulation: ViewEncapsulation.None
})
export class RichTextEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  protected readonly PHRASES = PHRASES;

  @Input() content = '';
  @Input() editable = true;
  @Input() compact = false;
  @Output() contentChange = new EventEmitter<string>();

  @ViewChild('editorHost', {static: true}) editorHost!: ElementRef<HTMLDivElement>;

  editor: Editor | null = null;

  ngAfterViewInit() {
    this.editor = new Editor({
      element: this.editorHost.nativeElement,
      extensions: [StarterKit.configure({link: false, underline: false, listKeymap: false, trailingNode: false})],
      content: this.content,
      editable: this.editable,
      editorProps: {
        handleDOMEvents: {
          keydown: (_view, event) => event.key === 'Escape',
        },
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
}
