import {TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {BehaviorSubject} from "rxjs";
import {provideTranslateService} from "@ngx-translate/core";
import {DashboardSidebarComponent} from "./dashboard-sidebar.component";
import {ProjectFilterService} from "@services/project-filter.service";
import {projectFilterStub} from "../../testing/projectFilterStub";
import {SettingsService} from "@services/settings.service";
import {TeamService} from "@services/team.service";
import {NotificationChannelService} from "@services/notification-channel.service";

describe('DashboardSidebarComponent', () => {
  let component: DashboardSidebarComponent;

  beforeEach(() => {
    component = new DashboardSidebarComponent({} as SettingsService, {} as TeamService, {} as NotificationChannelService);
  });

  it('is collapsed after toggling when not compact', () => {
    component.toggleCollapsed();

    expect(component.isCollapsed).toBeTrue();
  });

  it('is never collapsed while compact', () => {
    component.compact = true;

    component.toggleCollapsed();

    expect(component.isCollapsed).toBeFalse();
  });
});

describe('DashboardSidebarComponent drawer', () => {
  async function render(compact: boolean) {
    const teamService = {features$: new BehaviorSubject({pages: true, diagrams: true, boards: false, chat: false})};
    await TestBed.configureTestingModule({
      imports: [DashboardSidebarComponent],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {provide: TeamService, useValue: teamService},
        {provide: SettingsService, useValue: {settings$: new BehaviorSubject(null)}},
        {provide: NotificationChannelService, useValue: {unreadCount$: new BehaviorSubject(0)}},
        {provide: ProjectFilterService, useValue: projectFilterStub().service},
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DashboardSidebarComponent);
    fixture.componentRef.setInput('compact', compact);
    fixture.detectChanges();
    return fixture;
  }

  it('emits closeRequested when the drawer Close button is pressed', async () => {
    const fixture = await render(true);
    let emitted = 0;
    fixture.componentInstance.closeRequested.subscribe(() => emitted++);

    (fixture.nativeElement.querySelector('.dashboardSidebar__drawerHeader button') as HTMLButtonElement).click();

    expect(emitted).toBe(1);
    expect(fixture.nativeElement.querySelector('.dashboardSidebar__toggle')).toBeNull();
  });

  it('shows the collapse toggle and no drawer row when not compact', async () => {
    const fixture = await render(false);

    expect(fixture.nativeElement.querySelector('.dashboardSidebar__drawerHeader')).toBeNull();
    expect(fixture.nativeElement.querySelector('.dashboardSidebar__toggle')).not.toBeNull();
  });
});
