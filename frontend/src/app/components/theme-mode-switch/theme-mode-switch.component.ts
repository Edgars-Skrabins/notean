import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgForOf} from "@angular/common";
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {DEFAULT_THEME_MODE, ThemeMode} from "@config/themes";

@Component({
  selector: 'app-theme-mode-switch',
  standalone: true,
  imports: [
    NgForOf,
    TranslateModule
  ],
  templateUrl: './theme-mode-switch.component.html',
  styleUrl: './theme-mode-switch.component.css'
})
export class ThemeModeSwitchComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly options: { mode: ThemeMode, phrase: string }[] = [
    {mode: 'system', phrase: PHRASES.THEME_MODE_SYSTEM},
    {mode: 'light', phrase: PHRASES.THEME_MODE_LIGHT},
    {mode: 'dark', phrase: PHRASES.THEME_MODE_DARK},
  ];

  @Input() mode: ThemeMode = DEFAULT_THEME_MODE;
  @Output() modeChange = new EventEmitter<ThemeMode>();

  select(mode: ThemeMode) {
    if (mode === this.mode) {
      return;
    }

    this.mode = mode;
    this.modeChange.emit(mode);
  }
}
