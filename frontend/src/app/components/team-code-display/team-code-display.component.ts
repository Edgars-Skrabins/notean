import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {TooltipDirective} from '@components/tooltip/tooltip.directive';

@Component({
  selector: 'app-team-code-display',
  imports: [
    NgIf,
    TranslatePipe,
    TooltipDirective
  ],
  templateUrl: './team-code-display.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './team-code-display.component.css'
})
export class TeamCodeDisplayComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) code!: string;
  @Input() compact = false;

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
