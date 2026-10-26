import {Component, Input} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {BoardUser} from '@models/board.model';
import {AvatarComponent} from '@components/avatar/avatar.component';

@Component({
  selector: 'app-avatar-stack',
  imports: [
    NgFor,
    NgIf,
    AvatarComponent
  ],
  templateUrl: './avatar-stack.component.html',
  styleUrl: './avatar-stack.component.css'
})
export class AvatarStackComponent {
  @Input({required: true}) users: BoardUser[] = [];
  @Input() max = 3;

  get visibleUsers(): BoardUser[] {
    return this.users.slice(0, this.max);
  }

  get hiddenCount(): number {
    return Math.max(0, this.users.length - this.max);
  }

  get tooltip(): string {
    return this.users.map((user) => user.nickname).join(', ');
  }
}
