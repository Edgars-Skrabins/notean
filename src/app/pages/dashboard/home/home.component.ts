import {Component} from '@angular/core';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    TranslateModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  protected readonly PHRASES = PHRASES;
}
