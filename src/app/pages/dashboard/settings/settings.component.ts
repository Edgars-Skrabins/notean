import {Component} from '@angular/core';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    TranslateModule
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  protected readonly PHRASES = PHRASES;
}
