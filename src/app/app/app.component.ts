import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {TaskCreationComponent} from "../components/task-creation/task-creation.component";
import {CreateWorkspaceComponent} from "../pages/create-workspace/create-workspace.component";
import {JoinWorkspaceComponent} from "../pages/join-workspace/join-workspace.component";


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TaskCreationComponent, CreateWorkspaceComponent, JoinWorkspaceComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

}
