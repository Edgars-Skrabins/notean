import {ConnectedPosition} from '@angular/cdk/overlay';

const OFFSET = 4;

const BELOW_START: ConnectedPosition = {originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: OFFSET};
const ABOVE_START: ConnectedPosition = {originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -OFFSET};
const BELOW_END: ConnectedPosition = {originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: OFFSET};
const ABOVE_END: ConnectedPosition = {originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -OFFSET};
const ABOVE_CENTER: ConnectedPosition = {originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -OFFSET};
const BELOW_CENTER: ConnectedPosition = {originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: OFFSET};

export const DROPDOWN_POSITIONS: ConnectedPosition[] = [BELOW_START, ABOVE_START, BELOW_END, ABOVE_END];

export const MENU_POSITIONS: ConnectedPosition[] = [BELOW_END, ABOVE_END, BELOW_START, ABOVE_START];

export const TOOLTIP_POSITIONS: ConnectedPosition[] = [ABOVE_CENTER, BELOW_CENTER];
