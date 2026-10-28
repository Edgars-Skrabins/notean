import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {NgSwitch, NgSwitchCase} from '@angular/common';

export type IconName =
  | 'plus' | 'folder' | 'folder-plus' | 'chevron-right'
  | 'trash' | 'edit' | 'save' | 'x'
  | 'menu' | 'zoom-fit' | 'star' | 'star-filled'
  | 'flow-terminator' | 'flow-process' | 'flow-decision' | 'flow-io'
  | 'inbox' | 'columns' | 'link' | 'more'
  | 'project' | 'page' | 'diagram' | 'board' | 'ticket'
  | 'paperclip' | 'upload' | 'download' | 'file' | 'image';

@Component({
  selector: 'app-icon',
  imports: [
    NgSwitch,
    NgSwitchCase
  ],
  templateUrl: './icon.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './icon.component.css'
})
export class IconComponent {
  @Input({required: true}) name!: IconName;
}
