import {Component, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgFor, NgIf} from '@angular/common';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {TITLE_MAX_LENGTH, DESCRIPTION_MAX_LENGTH} from '@config/contentLimits';
import {ProjectParams} from '@models/project.model';
import {TeamMember} from '@models/team.model';
import {DropdownOption} from '@models/dropdown.model';
import {AvatarComponent} from '@components/avatar/avatar.component';
import {CheckboxComponent} from '@components/checkbox/checkbox.component';
import {DropdownComponent} from '@components/dropdown/dropdown.component';

@Component({
  selector: 'app-project-form',
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    TranslateModule,
    AvatarComponent,
    CheckboxComponent,
    DropdownComponent
  ],
  templateUrl: './project-form.component.html',
  styleUrl: './project-form.component.css'
})
export class ProjectFormComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly TITLE_MAX_LENGTH = TITLE_MAX_LENGTH;
  protected readonly DESCRIPTION_MAX_LENGTH = DESCRIPTION_MAX_LENGTH;

  @Input({required: true}) params!: ProjectParams;
  @Input({required: true}) members: TeamMember[] = [];
  @Input() readonly = false;
  @Input() nameError = '';
  @Output() paramsChange = new EventEmitter<ProjectParams>();

  get ownerNickname(): string {
    return this.members.find((member) => member.id === this.params.ownerUserId)?.nickname ?? '';
  }

  get ownerOptions(): DropdownOption[] {
    return this.members.map((member) => ({value: member.id, label: member.nickname}));
  }

  get memberNicknames(): string {
    return this.members.filter((member) => this.isMember(member.id)).map((member) => member.nickname).join(', ');
  }

  isMember(userId: number): boolean {
    return userId === this.params.ownerUserId || this.params.memberIds.includes(userId);
  }

  handleNameChange(name: string) {
    this.emit({name});
  }

  handleDescriptionChange(description: string) {
    this.emit({description});
  }

  handleOwnerChange(ownerUserId: number) {
    this.emit({ownerUserId, memberIds: this.withMember(this.params.memberIds, ownerUserId)});
  }

  handleMemberToggle(userId: number, checked: boolean) {
    const memberIds = checked
      ? this.withMember(this.params.memberIds, userId)
      : this.params.memberIds.filter((id) => id !== userId);
    this.emit({memberIds});
  }

  private withMember(memberIds: number[], userId: number): number[] {
    return memberIds.includes(userId) ? memberIds : [...memberIds, userId];
  }

  private emit(changes: Partial<ProjectParams>) {
    this.paramsChange.emit({...this.params, ...changes});
  }
}
