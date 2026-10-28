import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Injector, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, ViewEncapsulation} from '@angular/core';
import {NgIf} from "@angular/common";
import {Editor, Extension} from '@tiptap/core';
import {Plugin} from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import {MentionContext} from "@models/mention.model";
import {createMentionExtension} from "@utils/mentionExtension";
import {parseMentionText, serializeMentionDoc} from "@utils/mentionTokens";

export const PLAIN_TEXT_KIT = StarterKit.configure({
  blockquote: false,
  bold: false,
  bulletList: false,
  code: false,
  codeBlock: false,
  dropcursor: false,
  gapcursor: false,
  hardBreak: false,
  heading: false,
  horizontalRule: false,
  italic: false,
  link: false,
  listItem: false,
  listKeymap: false,
  orderedList: false,
  strike: false,
  trailingNode: false,
  underline: false,
});

@Component({
  selector: 'app-mention-text-editor',
  imports: [
    NgIf
  ],
  templateUrl: './mention-text-editor.component.html',
  styleUrl: './mention-text-editor.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  encapsulation: ViewEncapsulation.None
})
export class MentionTextEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() value = '';
  @Input() placeholder = '';
  @Input() maxLength: number | null = null;
  @Input() mentionContext: MentionContext = {};
  @Input() inputId: string | null = null;
  @Output() valueChange = new EventEmitter<string>();
  @Output() focused = new EventEmitter<void>();
  @Output() blurred = new EventEmitter<void>();
  @Output() escape = new EventEmitter<KeyboardEvent>();

  @ViewChild('editorHost', {static: true}) editorHost!: ElementRef<HTMLDivElement>;

  editor: Editor | null = null;
  isEmpty = true;

  constructor(private injector: Injector) {
  }

  ngAfterViewInit() {
    this.editor = new Editor({
      element: this.editorHost.nativeElement,
      extensions: [PLAIN_TEXT_KIT, createMentionExtension(this.injector, () => this.mentionContext), this.maxLengthExtension()],
      content: parseMentionText(this.value),
      editorProps: {
        attributes: this.inputId ? {id: this.inputId, role: 'textbox', 'aria-multiline': 'true'} : {role: 'textbox', 'aria-multiline': 'true'},
        handleDOMEvents: {
          keydown: (_view, event) => {
            if (event.key === 'Escape' && !event.defaultPrevented) {
              this.escape.emit(event);
            }
            return event.key === 'Escape';
          },
        },
      },
      onUpdate: ({editor}) => {
        const value = serializeMentionDoc(editor.getJSON());
        this.isEmpty = value === '';
        this.valueChange.emit(value);
      },
      onFocus: () => this.focused.emit(),
      onBlur: () => this.blurred.emit(),
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['value']) {
      return;
    }
    this.isEmpty = this.value === '';
    if (this.editor && this.value !== serializeMentionDoc(this.editor.getJSON())) {
      this.editor.commands.setContent(parseMentionText(this.value), {emitUpdate: false});
    }
  }

  ngOnDestroy() {
    this.editor?.destroy();
  }

  focus() {
    this.editor?.commands.focus();
  }

  private maxLengthExtension() {
    return Extension.create({
      name: 'maxLength',
      addProseMirrorPlugins: () => [new Plugin({
        filterTransaction: (transaction) => !this.maxLength || !transaction.docChanged
          || serializeMentionDoc(transaction.doc.toJSON()).length <= this.maxLength,
      })],
    });
  }
}
