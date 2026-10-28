import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild, ViewEncapsulation} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import type {I18n} from 'emoji-picker-element/shared';
import {PHRASES} from '@config/phrases';

export const EMOJI_DATA_SOURCE = '/assets/emoji/data.json';

@Component({
  selector: 'app-emoji-picker',
  imports: [],
  templateUrl: './emoji-picker.component.html',
  styleUrl: './emoji-picker.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  encapsulation: ViewEncapsulation.None
})
export class EmojiPickerComponent implements AfterViewInit, OnDestroy {
  @Output() picked = new EventEmitter<string>();

  @ViewChild('pickerHost', {static: true}) pickerHost!: ElementRef<HTMLDivElement>;

  private picker: HTMLElement | null = null;
  private destroyed = false;

  constructor(private translateService: TranslateService) {
  }

  async ngAfterViewInit() {
    const {Picker} = await import('emoji-picker-element');
    if (this.destroyed) {
      return;
    }
    const picker = new Picker({dataSource: EMOJI_DATA_SOURCE, locale: 'en', i18n: this.i18n()});
    picker.addEventListener('emoji-click', (event) => {
      const unicode = event.detail.unicode;
      if (unicode) {
        this.picked.emit(unicode);
      }
    });
    this.pickerHost.nativeElement.appendChild(picker);
    this.picker = picker;
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.picker?.remove();
  }

  private i18n(): I18n {
    const t = (key: string) => this.translateService.instant(key);
    return {
      categoriesLabel: t(PHRASES.EMOJI_CATEGORIES),
      emojiUnsupportedMessage: t(PHRASES.EMOJI_UNSUPPORTED),
      favoritesLabel: t(PHRASES.EMOJI_FAVORITES),
      loadingMessage: t(PHRASES.EMOJI_LOADING),
      networkErrorMessage: t(PHRASES.EMOJI_NETWORK_ERROR),
      regionLabel: t(PHRASES.EMOJI_REGION),
      searchDescription: t(PHRASES.EMOJI_SEARCH_DESCRIPTION),
      searchLabel: t(PHRASES.EMOJI_SEARCH),
      searchResultsLabel: t(PHRASES.EMOJI_SEARCH_RESULTS),
      skinToneDescription: t(PHRASES.EMOJI_SKIN_TONE_DESCRIPTION),
      skinToneLabel: t(PHRASES.EMOJI_SKIN_TONE),
      skinTonesLabel: t(PHRASES.EMOJI_SKIN_TONES),
      skinTones: [
        t(PHRASES.EMOJI_SKIN_TONE_DEFAULT),
        t(PHRASES.EMOJI_SKIN_TONE_LIGHT),
        t(PHRASES.EMOJI_SKIN_TONE_MEDIUM_LIGHT),
        t(PHRASES.EMOJI_SKIN_TONE_MEDIUM),
        t(PHRASES.EMOJI_SKIN_TONE_MEDIUM_DARK),
        t(PHRASES.EMOJI_SKIN_TONE_DARK),
      ],
      categories: {
        custom: t(PHRASES.EMOJI_CATEGORY_CUSTOM),
        'smileys-emotion': t(PHRASES.EMOJI_CATEGORY_SMILEYS),
        'people-body': t(PHRASES.EMOJI_CATEGORY_PEOPLE),
        'animals-nature': t(PHRASES.EMOJI_CATEGORY_ANIMALS),
        'food-drink': t(PHRASES.EMOJI_CATEGORY_FOOD),
        'travel-places': t(PHRASES.EMOJI_CATEGORY_TRAVEL),
        activities: t(PHRASES.EMOJI_CATEGORY_ACTIVITIES),
        objects: t(PHRASES.EMOJI_CATEGORY_OBJECTS),
        symbols: t(PHRASES.EMOJI_CATEGORY_SYMBOLS),
        flags: t(PHRASES.EMOJI_CATEGORY_FLAGS),
      },
    };
  }
}
