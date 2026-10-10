import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {CardService} from "@services/card.service";
import {TeamService} from "@services/team.service";
import {FavoriteService} from "@services/favorite.service";
import {AppRoutes} from "../../../app/app-routes.enum";
import {CardDetail} from "@models/card.model";
import {IconButtonComponent} from "@components/icon-button/icon-button.component";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {FavoriteStarComponent} from "@components/favorite-star/favorite-star.component";
import {errorPhrase} from "@utils/errorPhrase";

@Component({
  selector: 'app-card-detail',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    TranslateModule,
    IconButtonComponent,
    ConfirmDialogComponent,
    FavoriteStarComponent
  ],
  templateUrl: './card-detail.component.html',
  styleUrl: './card-detail.component.css'
})
export class CardDetailComponent implements OnInit {
  protected readonly PHRASES = PHRASES;

  card: CardDetail | null = null;
  titleDraft = '';
  descriptionDraft = '';
  isLoading = true;
  alertMessage = '';
  showDeleteConfirm = false;

  private teamCode: string;
  private boardId = 0;
  private cardId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cardService: CardService,
    private teamService: TeamService,
    private favoriteService: FavoriteService
  ) {
    this.teamCode = this.teamService.getCurrentTeamCode();
  }

  ngOnInit() {
    this.boardId = Number(this.route.snapshot.paramMap.get('boardId'));
    this.cardId = Number(this.route.snapshot.paramMap.get('cardId'));
    this.loadCard();
  }

  handleGoBack() {
    this.router.navigate([AppRoutes.DASHBOARD, AppRoutes.KANBAN_BOARDS, this.boardId]);
  }

  handleDelete() {
    this.showDeleteConfirm = true;
  }

  handleCancelDelete() {
    this.showDeleteConfirm = false;
  }

  handleConfirmDelete() {
    this.showDeleteConfirm = false;

    this.cardService.deleteCard(this.teamCode, this.boardId, this.cardId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.favoriteService.forgetItem('Card', this.cardId);
        this.handleGoBack();
      });
  }

  commitTitle() {
    if (!this.card) {
      return;
    }

    const title = this.titleDraft.trim();

    if (!title) {
      this.titleDraft = this.card.title;
      return;
    }

    if (title === this.card.title) {
      return;
    }

    this.cardService.updateCard(this.teamCode, this.boardId, this.cardId, {title})
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.card = response.card;
        this.titleDraft = response.card.title;
        this.favoriteService.renameItem('Card', response.card.id, response.card.title);
      });
  }

  cancelTitleEdit() {
    if (this.card) {
      this.titleDraft = this.card.title;
    }
  }

  commitDescription() {
    if (!this.card) {
      return;
    }

    if (this.descriptionDraft === this.card.description) {
      return;
    }

    this.cardService.updateCard(this.teamCode, this.boardId, this.cardId, {description: this.descriptionDraft})
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.card = response.card;
        this.descriptionDraft = response.card.description;
      });
  }

  cancelDescriptionEdit() {
    if (this.card) {
      this.descriptionDraft = this.card.description;
    }
  }

  private loadCard() {
    this.isLoading = true;

    this.cardService.getCard(this.teamCode, this.boardId, this.cardId)
      .then((response) => {
        this.isLoading = false;

        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.card = response.card;
        this.titleDraft = response.card.title;
        this.descriptionDraft = response.card.description;
      });
  }
}
