import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from "@angular/common";
import {LanguageSwitcherComponent} from "@components/language-switcher/language-switcher.component";

@Component({
  selector: 'app-auth-card',
  imports: [
    NgIf,
    LanguageSwitcherComponent
  ],
  templateUrl: './auth-card.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './auth-card.component.css'
})
export class AuthCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
