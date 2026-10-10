import {Component} from '@angular/core';
import {AsyncPipe, NgIf} from '@angular/common';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {SettingsService} from "@services/settings.service";
import {FavoritesGridComponent} from "@components/favorites-grid/favorites-grid.component";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    TranslateModule,
    FavoritesGridComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  protected readonly PHRASES = PHRASES;

  constructor(protected settingsService: SettingsService) {
  }
}
