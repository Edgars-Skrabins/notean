import { Component } from '@angular/core';
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-task-creation',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './task-creation.component.html',
  styleUrl: './task-creation.component.css'
})
export class TaskCreationComponent {
  taskName = '';

  handleCreateTask(){
    console.log(this.taskName);
  }
}
