import {Component, Input} from '@angular/core';
import {NgIf} from '@angular/common';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';

@Component({
  selector: 'app-team-code-display',
  standalone: true,
  imports: [
    NgIf,
    TranslateModule
  ],
  templateUrl: './team-code-display.component.html',
  styleUrl: './team-code-display.component.css'
})
export class TeamCodeDisplayComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) code!: string;

  codeCopied = false;

  handleCopyCode() {
    navigator.clipboard.writeText(this.code).then(() => {
      this.codeCopied = true;
      setTimeout(() => {
        this.codeCopied = false;
      }, 1500);
    });
  }
}
