import {Component} from '@angular/core';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    TranslateModule
  ],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})
export class ProjectsComponent {
  protected readonly PHRASES = PHRASES;
}
