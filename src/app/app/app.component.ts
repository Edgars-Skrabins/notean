import {RouterOutlet} from '@angular/router';
import {TaskCreationComponent} from "../components/task-creation/task-creation.component";
import {CreateWorkspaceComponent} from "../pages/create-workspace/create-workspace.component";
import {JoinWorkspaceComponent} from "../pages/join-workspace/join-workspace.component";
import {Component} from "@angular/core";
import {TranslateService} from "@ngx-translate/core";
import {getBrowserLanguage} from "../utils/browserInformation";
import {defaultLanguage, supportedTranslations} from "../config/translationConfig";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    TaskCreationComponent,
    CreateWorkspaceComponent,
    JoinWorkspaceComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  constructor(private translationService: TranslateService) {
    this.setDefaultLanguageSettings();
  }

  private setDefaultLanguageSettings() {
    this.translationService.setDefaultLang('en');
    const browserLanguage = getBrowserLanguage();
    const isBrowserLanguageSupported = supportedTranslations.includes(browserLanguage);
    this.translationService.use(isBrowserLanguageSupported ? browserLanguage : defaultLanguage);
  }
}
