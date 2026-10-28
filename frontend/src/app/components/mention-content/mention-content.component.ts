import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Injector, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild, ViewEncapsulation} from '@angular/core';
import {Content, Editor} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {createMentionExtension} from "@utils/mentionExtension";
import {parseMentionText} from "@utils/mentionTokens";
import {PLAIN_TEXT_KIT, PLAIN_TEXT_OPTIONS} from "@components/mention-text-editor/mention-text-editor.component";
import {linkifyMentionDoc} from "@utils/linkifyMentionDoc";

const LINKED_PLAIN_TEXT_KIT = StarterKit.configure({
  ...PLAIN_TEXT_OPTIONS,
  link: {autolink: false, linkOnPaste: false, openOnClick: true, HTMLAttributes: {target: '_blank', rel: 'noopener noreferrer'}},
});

@Component({
  selector: 'app-mention-content',
  imports: [],
  templateUrl: './mention-content.component.html',
  styleUrl: './mention-content.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  encapsulation: ViewEncapsulation.None
})
export class MentionContentComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() html: string | null = null;
  @Input() text: string | null = null;
  @Input() links = false;

  @ViewChild('contentHost', {static: true}) contentHost!: ElementRef<HTMLDivElement>;

  editor: Editor | null = null;

  constructor(private injector: Injector) {
  }

  ngAfterViewInit() {
    const kit = this.html !== null
      ? StarterKit.configure({link: false, underline: false, listKeymap: false, trailingNode: false})
      : this.links ? LINKED_PLAIN_TEXT_KIT : PLAIN_TEXT_KIT;
    this.editor = new Editor({
      element: this.contentHost.nativeElement,
      extensions: [kit, createMentionExtension(this.injector, () => ({}))],
      content: this.content(),
      editable: false,
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['html'] || changes['text']) && this.editor) {
      this.editor.commands.setContent(this.content(), {emitUpdate: false});
    }
  }

  ngOnDestroy() {
    this.editor?.destroy();
  }

  private content(): Content {
    if (this.html !== null) {
      return this.html;
    }
    const doc = parseMentionText(this.text ?? '');
    return this.links ? linkifyMentionDoc(doc) : doc;
  }
}
