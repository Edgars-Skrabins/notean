import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {AVATAR_COLORS, AvatarColorOption} from "@config/avatarColors";
import {Avatar} from "@models/avatar.model";
import {apiUrl} from "@utils/apiUrl";

@Component({
  selector: 'app-avatar',
  imports: [
    NgIf
  ],
  templateUrl: './avatar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './avatar.component.css'
})
export class AvatarComponent {
  @Input() avatar: Avatar | null = null;
  @Input() nickname = '';
  @Input() size: 24 | 28 | 32 | 96 = 24;
  @Input() previewUrl: string | null = null;

  private failedSrc: string | null = null;

  get letter(): string {
    return this.nickname.trim().charAt(0).toUpperCase();
  }

  get imageSrc(): string | null {
    const src = this.sourceUrl;
    return src && src !== this.failedSrc ? src : null;
  }

  get colorOption(): AvatarColorOption | null {
    return AVATAR_COLORS.find((option) => option.key === this.avatar?.color) ?? null;
  }

  handleImageError() {
    this.failedSrc = this.sourceUrl;
  }

  private get sourceUrl(): string | null {
    if (this.previewUrl) {
      return this.previewUrl;
    }
    return this.avatar?.imageUrl ? apiUrl(this.avatar.imageUrl) : null;
  }
}
