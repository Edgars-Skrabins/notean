import {NavigationEnd, Router} from "@angular/router";
import {BreakpointObserver, BreakpointState} from "@angular/cdk/layout";
import {Subject} from "rxjs";
import {DashboardComponent} from "./dashboard.component";
import {FavoriteService} from "@services/favorite.service";
import {ProjectFilterService} from "@services/project-filter.service";
import {TeamService} from "@services/team.service";
import {TeamChannelService} from "@services/team-channel.service";
import {NotificationChannelService} from "@services/notification-channel.service";
import {ChatCableService} from "@services/chat-cable.service";
import {NavigationService} from "@services/navigation.service";
import {ToastService} from "@services/toast.service";
import {TeamFeatures} from "@models/team.model";
import {escapeServiceStub, EscapeServiceStub} from "../../testing/escapeServiceStub";

describe('DashboardComponent navigation drawer', () => {
  let component: DashboardComponent;
  let escape: EscapeServiceStub;
  let routerEvents: Subject<unknown>;
  let breakpoints: Subject<BreakpointState>;

  beforeEach(() => {
    escape = escapeServiceStub();
    routerEvents = new Subject<unknown>();
    breakpoints = new Subject<BreakpointState>();
    const router = {events: routerEvents, url: '/dashboard/home'} as unknown as Router;
    const breakpointObserver = {observe: () => breakpoints} as unknown as BreakpointObserver;
    const teamService = {getCurrentTeam: () => null, features$: new Subject<TeamFeatures>()} as unknown as TeamService;
    component = new DashboardComponent(
      {load: () => undefined} as unknown as FavoriteService,
      {load: () => Promise.resolve()} as unknown as ProjectFilterService,
      teamService,
      {disconnect: () => undefined} as unknown as TeamChannelService,
      {disconnect: () => undefined} as unknown as NotificationChannelService,
      {disconnect: () => undefined} as unknown as ChatCableService,
      {} as NavigationService,
      {} as ToastService,
      router,
      breakpointObserver,
      escape.service
    );
    component.ngOnInit();
    breakpoints.next({matches: true, breakpoints: {}});
  });

  afterEach(() => component.ngOnDestroy());

  it('opens on toggle and registers one Esc handler', () => {
    component.toggleNav();

    expect(component.isNavOpen).toBeTrue();
    expect(escape.handlers.length).toBe(1);
  });

  it('closes on Esc and unregisters the handler', () => {
    component.toggleNav();

    escape.press();

    expect(component.isNavOpen).toBeFalse();
    expect(escape.handlers.length).toBe(0);
  });

  it('closes after a completed navigation without restoring focus', () => {
    const menuButton = document.createElement('button');
    document.body.appendChild(menuButton);
    menuButton.focus();
    component.toggleNav();
    menuButton.blur();

    routerEvents.next(new NavigationEnd(1, '/dashboard/boards/1', '/dashboard/boards/1'));

    expect(component.isNavOpen).toBeFalse();
    expect(escape.handlers.length).toBe(0);
    expect(document.activeElement).not.toBe(menuButton);
    menuButton.remove();
  });

  it('closes when the viewport leaves the compact width', () => {
    component.toggleNav();

    breakpoints.next({matches: false, breakpoints: {}});

    expect(component.isCompact).toBeFalse();
    expect(component.isNavOpen).toBeFalse();
  });

  it('returns focus to the element focused before opening', () => {
    const menuButton = document.createElement('button');
    document.body.appendChild(menuButton);
    menuButton.focus();
    component.toggleNav();
    menuButton.blur();

    component.closeNav(true);

    expect(document.activeElement).toBe(menuButton);
    menuButton.remove();
  });
});
