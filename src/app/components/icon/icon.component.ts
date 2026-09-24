import {Component, Input} from '@angular/core';
import {NgSwitch, NgSwitchCase} from '@angular/common';

export type IconName =
  | 'plus' | 'folder' | 'folder-plus' | 'chevron-right'
  | 'trash' | 'edit' | 'save' | 'x'
  | 'menu' | 'zoom-fit'
  | 'flow-terminator' | 'flow-process' | 'flow-decision' | 'flow-io';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [
    NgSwitch,
    NgSwitchCase
  ],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css'
})
export class IconComponent {
  @Input({required: true}) name!: IconName;
}
