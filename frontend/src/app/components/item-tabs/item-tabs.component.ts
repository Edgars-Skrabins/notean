import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {AppRoutes} from '../../app/app-routes.enum';

@Component({
  selector: 'app-item-tabs',
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslatePipe
  ],
  templateUrl: './item-tabs.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './item-tabs.component.css'
})
export class ItemTabsComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly AppRoutes = AppRoutes;

  @Input({required: true}) itemsLabel!: string;
  @Input({required: true}) itemsRoute!: AppRoutes;
}
