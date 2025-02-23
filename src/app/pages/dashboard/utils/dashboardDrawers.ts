import {Drawer} from "@components/drawer/drawer.component";
import {NotesComponent} from "@components/notes/notes.component";
import {TranslationPhrase} from "@config/translationConfig";

const enum DashboardDrawers {
  NOTES = TranslationPhrase.Notes,
  TASKS = TranslationPhrase.Tasks,
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

function isDrawerSupported(drawer: string) {
  return true;
}
