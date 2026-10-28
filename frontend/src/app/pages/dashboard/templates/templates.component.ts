import {Component, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {BUILT_IN_TEMPLATE_PREFIX, TemplateKind} from '@models/template.model';
import {MenuButtonOption} from '@models/menu-button.model';
import {builtInTemplateRoute, createFromTemplateRoute, TEMPLATE_ITEM_ROUTES, templateRoute} from '@utils/templateRoute';
import {ButtonComponent} from '@components/button/button.component';
import {MenuButtonComponent} from '@components/menu-button/menu-button.component';
import {ItemTabsComponent} from '@components/item-tabs/item-tabs.component';
import {TemplateListComponent} from '@components/template-list/template-list.component';
import {BoardPickerDialogComponent} from '@components/board-picker-dialog/board-picker-dialog.component';
import {AppRoutes} from '../../../app/app-routes.enum';

const ITEM_LABELS: Record<Exclude<TemplateKind, 'board'>, string> = {
  page: PHRASES.DOCUMENT_PAGES,
  diagram: PHRASES.DIAGRAMS,
};

@Component({
  selector: 'app-templates',
  imports: [
    NgIf,
    TranslatePipe,
    ButtonComponent,
    MenuButtonComponent,
    ItemTabsComponent,
    TemplateListComponent,
    BoardPickerDialogComponent
  ],
  templateUrl: './templates.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './templates.component.css'
})
export class TemplatesComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly newBoardTemplateOptions: MenuButtonOption[] = [
    {value: 'blank', labelKey: PHRASES.BLANK},
    {value: 'board', labelKey: PHRASES.FROM_EXISTING_BOARD},
  ];

  readonly kind: TemplateKind;
  isBoardPickerOpen = false;

  constructor(route: ActivatedRoute, private router: Router) {
    this.kind = route.snapshot.data['kind'];
  }

  get itemKind(): Exclude<TemplateKind, 'board'> | null {
    return this.kind === 'board' ? null : this.kind;
  }

  get itemsLabel(): string {
    return this.itemKind ? ITEM_LABELS[this.itemKind] : '';
  }

  get itemsRoute(): AppRoutes {
    return this.itemKind ? TEMPLATE_ITEM_ROUTES[this.itemKind] : AppRoutes.BOARD_TEMPLATES;
  }

  get emptyLabel(): string {
    return this.kind === 'board' ? PHRASES.NO_BOARD_TEMPLATES_YET : PHRASES.NO_TEMPLATES_YET;
  }

  handleOpen(ref: string) {
    this.router.navigate(ref.startsWith(BUILT_IN_TEMPLATE_PREFIX)
      ? builtInTemplateRoute(this.kind, ref.slice(BUILT_IN_TEMPLATE_PREFIX.length))
      : templateRoute(this.kind, Number(ref)));
  }

  handleUse(ref: string) {
    if (!this.itemKind) {
      return;
    }

    const {commands, queryParams} = createFromTemplateRoute(this.itemKind, ref);
    this.router.navigate(commands, {queryParams});
  }

  handleNewTemplate() {
    this.router.navigate(templateRoute(this.kind, AppRoutes.NEW));
  }

  handleNewBoardTemplate(choice: string | number | null) {
    if (choice === 'board') {
      this.isBoardPickerOpen = true;
      return;
    }

    this.handleNewTemplate();
  }

  handleBoardPicked(boardId: number) {
    this.isBoardPickerOpen = false;
    this.router.navigate(templateRoute('board', AppRoutes.NEW), {queryParams: {board: boardId}});
  }

  handleBoardPickerCancelled() {
    this.isBoardPickerOpen = false;
  }
}
