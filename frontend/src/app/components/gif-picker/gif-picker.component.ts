import {Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ChangeDetectionStrategy} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {Gif} from '@models/chat.model';
import {ChatService} from '@services/chat.service';
import {TeamService} from '@services/team.service';
import {LoadMoreComponent} from '@components/load-more/load-more.component';

export const GIF_SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-gif-picker',
  imports: [
    NgFor,
    NgIf,
    TranslatePipe,
    LoadMoreComponent
  ],
  templateUrl: './gif-picker.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './gif-picker.component.css'
})
export class GifPickerComponent implements OnChanges, OnDestroy {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) channelId!: number;
  @Input({required: true}) query!: string;
  @Output() picked = new EventEmitter<Gif>();

  gifs: Gif[] = [];
  hasMore = false;
  loading = false;
  unavailable = false;

  private timer: ReturnType<typeof setTimeout> | null = null;
  private controller: AbortController | null = null;

  constructor(private chatService: ChatService, private teamService: TeamService) {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['query']) {
      this.scheduleSearch();
    }
  }

  ngOnDestroy() {
    this.cancel();
  }

  loadMore() {
    this.search(this.gifs.length);
  }

  private scheduleSearch() {
    this.cancel();
    this.loading = true;
    this.timer = setTimeout(() => this.search(0), GIF_SEARCH_DEBOUNCE_MS);
  }

  private async search(offset: number) {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.loading = true;

    const response = await this.chatService.searchGifs(this.teamService.getCurrentTeamCode(), this.channelId, this.query.trim(), offset, controller.signal);
    if (controller.signal.aborted) {
      return;
    }
    this.loading = false;
    if (!response.success) {
      this.unavailable = true;
      this.gifs = [];
      this.hasMore = false;
      return;
    }
    this.unavailable = false;
    this.gifs = offset === 0 ? response.gifs : [...this.gifs, ...response.gifs];
    this.hasMore = response.hasMore;
  }

  private cancel() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.controller?.abort();
    this.controller = null;
  }
}
