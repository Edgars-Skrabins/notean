import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgForOf} from "@angular/common";
import {TranslatePipe} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {DEFAULT_THEME, ThemeKey, THEMES} from "@config/themes";
import {ResolvedThemeMode} from "@utils/themeDom";

@Component({
  selector: 'app-theme-picker',
  imports: [
    NgForOf,
    TranslatePipe
  ],
  templateUrl: './theme-picker.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './theme-picker.component.css'
})
export class ThemePickerComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly themes = THEMES;

  @Input() theme: ThemeKey = DEFAULT_THEME;
  @Input() resolvedMode: ResolvedThemeMode = 'dark';
  @Output() themeChange = new EventEmitter<ThemeKey>();

  select(theme: ThemeKey) {
    if (theme === this.theme) {
      return;
    }

    this.theme = theme;
    this.themeChange.emit(theme);
  }
}
