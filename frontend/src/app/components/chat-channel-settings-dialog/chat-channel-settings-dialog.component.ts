import {Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ChatChannel, GifRating} from '@models/chat.model';
import {DropdownOption} from '@models/dropdown.model';
import {BoardUser} from '@models/board.model';
import {ChatService} from '@services/chat.service';
import {TeamService} from '@services/team.service';
import {errorPhrase} from '@utils/errorPhrase';
import {ButtonComponent} from '@components/button/button.component';
import {DropdownComponent} from '@components/dropdown/dropdown.component';
import {ConfirmDialogComponent} from '@components/confirm-dialog/confirm-dialog.component';
import {CreateNamedItemDialogComponent} from '@components/create-named-item-dialog/create-named-item-dialog.component';
import {ChatMemberPickerComponent} from '@components/chat-member-picker/chat-member-picker.component';

@Component({
  selector: 'app-chat-channel-settings-dialog',
  imports: [
    NgIf,
    TranslatePipe,
    ButtonComponent,
    DropdownComponent,
    ConfirmDialogComponent,
    CreateNamedItemDialogComponent,
    ChatMemberPickerComponent
  ],
  templateUrl: './chat-channel-settings-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './chat-channel-settings-dialog.component.css'
})
export class ChatChannelSettingsDialogComponent implements OnInit {
  protected readonly PHRASES = PHRASES;
  protected readonly ratingOptions: DropdownOption[] = [
    {value: 'pg', labelKey: PHRASES.GIF_RATING_PG},
    {value: 'pg-13', labelKey: PHRASES.GIF_RATING_PG13},
  ];

  @Input({required: true}) channel!: ChatChannel;
  @Output() saved = new EventEmitter<ChatChannel>();
  @Output() deleted = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  gifRating: GifRating = 'pg';
  members: BoardUser[] = [];
  memberIds: number[] = [];
  errorMessage = '';
  isConfirmingDelete = false;

  constructor(private chatService: ChatService, private teamService: TeamService) {
  }

  ngOnInit() {
    this.gifRating = this.channel.gifRating;
    this.memberIds = this.channel.members.map((member) => member.id);
    if (this.channel.scope === 'users') {
      this.teamService.fetchTeamMembers(this.teamService.getCurrentTeamCode()).then((members) => this.members = members);
    }
  }

  async handleConfirm(event: { title: string }) {
    const response = await this.chatService.updateChannel(this.teamService.getCurrentTeamCode(), this.channel.id, {
      name: event.title,
      gifRating: this.gifRating,
      memberIds: this.channel.scope === 'users' ? this.memberIds : undefined,
    });
    if (response.success) {
      this.saved.emit(response.channel);
    } else {
      this.errorMessage = errorPhrase(response.code);
    }
  }

  async handleDeleteConfirmed() {
    this.isConfirmingDelete = false;
    const response = await this.chatService.deleteChannel(this.teamService.getCurrentTeamCode(), this.channel.id);
    if (response.success) {
      this.deleted.emit();
    } else {
      this.errorMessage = errorPhrase(response.code);
    }
  }
}
