import {Drawer} from "@components/drawer/drawer.component";
import {NotesComponent} from "@components/notes/notes.component";

const enum DashboardDrawers {
  NOTES = 'Notes',
}

const allDrawers: Drawer[] = [
  {
    id: 0,
    name: DashboardDrawers.NOTES,
    component: NotesComponent,
  }
]

export function getSupportedDrawers() {
  const drawers: Drawer[] = [];

  allDrawers.forEach((drawer) => {
    if (isDrawerSupported(drawer.name)) {
      drawers.push(drawer);
    }
  })

  return drawers;
}

function isDrawerSupported(drawerName: string) {
  return true;
}
