import {ComponentFixture, TestBed} from '@angular/core/testing';
import {AvatarStackComponent} from './avatar-stack.component';
import {BoardUser} from '@models/board.model';

function user(id: number, nickname: string): BoardUser {
  return {id, nickname, avatar: {color: 'red', imageUrl: null}};
}

describe('AvatarStackComponent', () => {
  let fixture: ComponentFixture<AvatarStackComponent>;

  function render(users: BoardUser[]) {
    fixture.componentRef.setInput('users', users);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [AvatarStackComponent]}).compileComponents();
    fixture = TestBed.createComponent(AvatarStackComponent);
  });

  it('shows at most three avatars and a +N circle for the rest', () => {
    render([user(1, 'Ann'), user(2, 'Ben'), user(3, 'Cat'), user(4, 'Dan'), user(5, 'Eve')]);

    expect(fixture.nativeElement.querySelectorAll('app-avatar').length).toBe(3);
    expect(fixture.nativeElement.querySelector('.avatarStack__more').textContent.trim()).toBe('+2');
  });

  it('lists every nickname in the tooltip', () => {
    render([user(1, 'Ann'), user(2, 'Ben'), user(3, 'Cat'), user(4, 'Dan')]);

    expect(fixture.nativeElement.querySelector('.avatarStack').getAttribute('title')).toBe('Ann, Ben, Cat, Dan');
  });

  it('shows no +N circle with three or fewer users', () => {
    render([user(1, 'Ann'), user(2, 'Ben')]);

    expect(fixture.nativeElement.querySelector('.avatarStack__more')).toBeNull();
  });

  it('renders nothing without users', () => {
    render([]);

    expect(fixture.nativeElement.querySelector('.avatarStack')).toBeNull();
  });
});
