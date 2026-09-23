import {Component} from '@angular/core';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";

@Component({
  selector: 'app-diagrams',
  standalone: true,
  imports: [
    TranslateModule
  ],
  templateUrl: './diagrams.component.html',
  styleUrl: './diagrams.component.css'
})
export class DiagramsComponent {
  protected readonly PHRASES = PHRASES;
}
