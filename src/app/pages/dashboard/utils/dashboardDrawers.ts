import {Drawer} from "@components/drawer/drawer.component";
import {NotesComponent} from "@components/notes/notes.component";

const enum DashboardDrawers {
  NOTES = 'Notes',
  TASKS = 'Tasks',
}

const allDrawers: Drawer[] = [
  {
    id: 0,
    name: DashboardDrawers.NOTES,
    component: NotesComponent,
  },
  {
    id: 0,
    name: DashboardDrawers.TASKS,
    component: NotesComponent,
  }
]

export function getSupportedDrawers() {
  const drawers: Drawer[] = [];
  let currentID = 0;

  allDrawers.forEach((drawer) => {
    if (isDrawerSupported(drawer.name)) {
      drawer.id = currentID++;
      drawers.push(drawer);
    }
  })

  return drawers;
}

function isDrawerSupported(drawerName: string) {
  return true;
}
