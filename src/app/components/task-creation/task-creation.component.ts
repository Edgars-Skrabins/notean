import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";

@Component({
  selector: 'app-task-creation',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule
  ],
  templateUrl: './task-creation.component.html',
  styleUrl: './task-creation.component.css'
})
export class TaskCreationComponent {
  protected readonly PHRASES = PHRASES;

  taskName = '';

  handleCreateTask() {
    console.log(this.taskName);
  }
}
