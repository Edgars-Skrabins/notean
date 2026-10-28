import {ApplicationRef, ComponentRef, createComponent, EnvironmentInjector, Injector, NgZone} from '@angular/core';
import {Router} from '@angular/router';
import {Overlay, OverlayRef} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {TranslateService} from '@ngx-translate/core';
import Mention from '@tiptap/extension-mention';
import {exitSuggestion, SuggestionProps} from '@tiptap/suggestion';
import {PluginKey} from '@tiptap/pm/state';
import {DROPDOWN_POSITIONS} from "@config/overlayPositions";
import {IconComponent} from "@components/icon/icon.component";
import {MentionPickerComponent} from "@components/mention-picker/mention-picker.component";
import {MentionCandidate, MentionContext, MentionType} from "@models/mention.model";
import {MentionService} from "@services/mention.service";
import {TeamService} from "@services/team.service";
import {mentionChipState} from "@utils/mentionChip";
import {cleanMentionLabel} from "@utils/mentionTokens";

const SEARCH_DEBOUNCE_MS = 300;

interface MentionAttrs {
  id: string;
  label: string;
  mentionType: MentionType;
}

export function createMentionExtension(injector: Injector, context: () => MentionContext) {
  const mentionService = injector.get(MentionService);
  const teamService = injector.get(TeamService);
  const pluginKey = new PluginKey('mentionSuggestion');

  return Mention.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        mentionType: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('data-mention-type'),
          renderHTML: (attributes: Record<string, unknown>) => attributes['mentionType'] ? {'data-mention-type': attributes['mentionType']} : {},
        },
        mentionSuggestionChar: {
          default: '@',
          rendered: false,
          parseHTML: () => '@',
        },
      };
    },

    addNodeView() {
      return ({node}) => mentionChipView(injector, node.attrs['mentionType'], Number(node.attrs['id']), node.attrs['label']);
    },
  }).configure({
    renderText: ({node}) => `@${node.attrs['label'] ?? ''}`,
    suggestion: {
      char: '@',
      pluginKey,
      allowSpaces: true,
      allowedPrefixes: [' ', '(', '['],
      debounce: SEARCH_DEBOUNCE_MS,
      items: async ({query, signal}) => {
        const response = await mentionService.search(teamService.getCurrentTeamCode(), query, context(), signal);
        return response.success ? response.results : [];
      },
      render: () => mentionPickerRenderer(injector, pluginKey),
    },
  });
}

function mentionPickerRenderer(injector: Injector, pluginKey: PluginKey) {
  const overlay = injector.get(Overlay);
  let overlayRef: OverlayRef | null = null;
  let picker: ComponentRef<MentionPickerComponent> | null = null;
  let current: SuggestionProps<MentionCandidate, MentionAttrs> | null = null;
  let activeIndex = 0;
  let removeEscapeListener: (() => void) | null = null;

  const origin = () => {
    const rect = current?.clientRect?.();
    return rect ? {x: rect.left, y: rect.top, width: rect.width, height: rect.height} : {x: 0, y: 0};
  };

  const pick = (candidate: MentionCandidate | undefined) => {
    if (candidate && current) {
      current.command({id: String(candidate.id), label: cleanMentionLabel(candidate.title), mentionType: candidate.type});
    }
  };

  const refresh = () => {
    if (!picker || !current) {
      return;
    }
    picker.setInput('results', current.items);
    picker.setInput('loading', current.loading);
    picker.setInput('activeIndex', activeIndex);
  };

  const position = () => {
    overlayRef?.updatePositionStrategy(overlay.position().flexibleConnectedTo(origin()).withPositions(DROPDOWN_POSITIONS).withPush(true).withViewportMargin(4));
  };

  return {
    onStart: (props: SuggestionProps<MentionCandidate, MentionAttrs>) => {
      current = props;
      activeIndex = 0;
      overlayRef = overlay.create({
        positionStrategy: overlay.position().flexibleConnectedTo(origin()).withPositions(DROPDOWN_POSITIONS).withPush(true).withViewportMargin(4),
        scrollStrategy: overlay.scrollStrategies.reposition(),
      });
      picker = overlayRef.attach(new ComponentPortal(MentionPickerComponent, null, injector));
      picker.instance.pick.subscribe((candidate) => pick(candidate));
      picker.instance.hover.subscribe((index) => {
        activeIndex = index;
        refresh();
      });
      refresh();

      const editorDom = props.editor.view.dom;
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          exitSuggestion(props.editor.view, pluginKey);
        }
      };
      editorDom.addEventListener('keydown', handleEscape, true);
      removeEscapeListener = () => editorDom.removeEventListener('keydown', handleEscape, true);
    },

    onUpdate: (props: SuggestionProps<MentionCandidate, MentionAttrs>) => {
      if (current?.items !== props.items) {
        activeIndex = 0;
      }
      current = props;
      if (props.query.endsWith(' ') && !props.loading && props.items.length === 0) {
        exitSuggestion(props.editor.view, pluginKey);
        return;
      }
      refresh();
      position();
    },

    onKeyDown: ({event}: { event: KeyboardEvent }) => {
      const items = current?.items ?? [];
      if (!items.length) {
        return false;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        activeIndex = (activeIndex + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
        refresh();
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        pick(items[activeIndex]);
        return true;
      }
      return false;
    },

    onExit: () => {
      removeEscapeListener?.();
      removeEscapeListener = null;
      overlayRef?.dispose();
      overlayRef = null;
      picker = null;
      current = null;
    },
  };
}

function mentionChipView(injector: Injector, type: MentionType, id: number, label: string | null) {
  const router = injector.get(Router);
  const zone = injector.get(NgZone);
  const translate = injector.get(TranslateService);
  const appRef = injector.get(ApplicationRef);
  const mentionService = injector.get(MentionService);
  const teamService = injector.get(TeamService);

  const dom = document.createElement('span');
  dom.contentEditable = 'false';
  const dot = document.createElement('span');
  dot.className = 'mentionChip__dot';
  const text = document.createElement('span');
  text.className = 'mentionChip__text';
  let icon: ComponentRef<IconComponent> | null = null;
  let route: (string | number)[] | null = null;
  let destroyed = false;

  const apply = (state: ReturnType<typeof mentionChipState>) => {
    dom.className = `mentionChip mentionChip--${state.variant}`;
    text.textContent = state.phrase ? translate.instant(state.phrase) : state.text;
    route = state.route;
    dom.setAttribute('aria-label', text.textContent ?? '');
    if (route) {
      dom.setAttribute('role', 'link');
      dom.tabIndex = 0;
    } else {
      dom.removeAttribute('role');
      dom.removeAttribute('tabindex');
    }

    dot.remove();
    if (state.color) {
      dot.style.background = state.color;
      dom.prepend(dot);
    }
    if (state.icon && !icon) {
      icon = createComponent(IconComponent, {environmentInjector: injector.get(EnvironmentInjector)});
      icon.location.nativeElement.classList.add('mentionChip__icon');
      appRef.attachView(icon.hostView);
      dom.prepend(icon.location.nativeElement);
    }
    if (icon && state.icon) {
      icon.setInput('name', state.icon);
    }
  };

  const open = (event: Event) => {
    if (!route) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const target = route;
    zone.run(() => router.navigate(target));
  };

  dom.append(text);
  apply(mentionChipState(type, label, null));
  dom.addEventListener('click', open);
  dom.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      open(event);
    }
  });

  if (type && id) {
    mentionService.resolve(teamService.getCurrentTeamCode(), {type, id}).then((resolved) => {
      if (!destroyed) {
        apply(mentionChipState(type, label, resolved));
      }
    });
  }

  return {
    dom,
    ignoreMutation: () => true,
    destroy: () => {
      destroyed = true;
      if (icon) {
        appRef.detachView(icon.hostView);
        icon.destroy();
      }
    },
  };
}
