import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgFor} from '@angular/common';
import {ChatReaction} from '@models/chat.model';
import {TooltipDirective} from '@components/tooltip/tooltip.directive';

@Component({
  selector: 'app-chat-reactions',
  imports: [
    NgFor,
    TooltipDirective
  ],
  templateUrl: './chat-reactions.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './chat-reactions.component.css'
})
export class ChatReactionsComponent {
  @Input({required: true}) reactions: ChatReaction[] = [];
  @Input() currentUserId: number | null = null;
  @Input() nicknames: Map<number, string> = new Map();
  @Output() toggled = new EventEmitter<string>();

  isMine(reaction: ChatReaction): boolean {
    return this.currentUserId !== null && reaction.userIds.includes(this.currentUserId);
  }

  reactedBy(reaction: ChatReaction): string {
    return reaction.userIds.map((id) => this.nicknames.get(id)).filter((nickname) => !!nickname).join(', ');
  }
}
