import {ComponentFixture, TestBed} from '@angular/core/testing';
import {AvatarComponent} from './avatar.component';
import {baseUrl} from '@config/axiosConfig';
import {Avatar} from '@models/avatar.model';

describe('AvatarComponent', () => {
  let fixture: ComponentFixture<AvatarComponent>;
  let component: AvatarComponent;

  function render(avatar: Avatar | null, nickname = 'alice') {
    fixture.componentRef.setInput('avatar', avatar);
    fixture.componentRef.setInput('nickname', nickname);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarComponent);
    component = fixture.componentInstance;
  });

  it('shows the image when there is one', () => {
    render({color: 'blue', imageUrl: '/rails/active_storage/blobs/redirect/abc/a.png'});

    const image: HTMLImageElement = fixture.nativeElement.querySelector('img');
    expect(image.getAttribute('src')).toBe(`${baseUrl}/rails/active_storage/blobs/redirect/abc/a.png`);
    expect(fixture.nativeElement.querySelector('.avatar__letter')).toBeNull();
  });

  it('shows the upper-cased first letter of the nickname without an image', () => {
    render({color: 'blue', imageUrl: null}, 'bob');

    const letter: HTMLElement = fixture.nativeElement.querySelector('.avatar__letter');
    expect(letter.textContent?.trim()).toBe('B');
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('uses white text on dark colours', () => {
    render({color: 'blue', imageUrl: null});

    const letter: HTMLElement = fixture.nativeElement.querySelector('.avatar__letter');
    expect(letter.style.color).toBe('rgb(255, 255, 255)');
    expect(letter.style.background).toContain('rgb(30, 136, 229)');
  });

  it('uses dark text on light colours', () => {
    render({color: 'yellow', imageUrl: null});

    const letter: HTMLElement = fixture.nativeElement.querySelector('.avatar__letter');
    expect(letter.style.color).toBe('rgb(33, 33, 33)');
  });

  it('falls back to the letter when the image fails to load', () => {
    render({color: 'blue', imageUrl: '/broken.png'});

    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.avatar__letter').textContent.trim()).toBe('A');
  });

  it('keeps the letter after a failed image even when the avatar object is replaced', () => {
    render({color: 'blue', imageUrl: '/broken.png'});
    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('error'));

    render({color: 'blue', imageUrl: '/broken.png'});

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('tries again when the image url changes after a failure', () => {
    render({color: 'blue', imageUrl: '/broken.png'});
    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('error'));

    render({color: 'blue', imageUrl: '/new.png'});

    expect(fixture.nativeElement.querySelector('img')).not.toBeNull();
  });

  it('shows a neutral letter circle while the avatar is loading', () => {
    render(null);

    expect(fixture.nativeElement.querySelector('.avatar__letter--neutral')).not.toBeNull();
  });

  it('prefers the preview url over the saved image', () => {
    fixture.componentRef.setInput('previewUrl', 'blob:preview');
    render({color: 'blue', imageUrl: '/saved.png'});

    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('blob:preview');
    expect(component.imageSrc).toBe('blob:preview');
  });
});
