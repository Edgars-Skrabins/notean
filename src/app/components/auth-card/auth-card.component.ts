import {Component, Input} from '@angular/core';
import {NgIf} from "@angular/common";

@Component({
  selector: 'app-auth-card',
  standalone: true,
  imports: [
    NgIf
  ],
  templateUrl: './auth-card.component.html',
  styleUrl: './auth-card.component.css'
})
export class AuthCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
