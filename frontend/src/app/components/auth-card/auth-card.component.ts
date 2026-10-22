import {Component, Input} from '@angular/core';
import {NgIf} from "@angular/common";
import {LanguageSwitcherComponent} from "@components/language-switcher/language-switcher.component";

@Component({
  selector: 'app-auth-card',
  standalone: true,
  imports: [
    NgIf,
    LanguageSwitcherComponent
  ],
  templateUrl: './auth-card.component.html',
  styleUrl: './auth-card.component.css'
})
export class AuthCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
