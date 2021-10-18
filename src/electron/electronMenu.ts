import { Menu } from 'electron';

import { MenuItemBuilderOptions, MenuLayout } from '../types/electron';
import { removeNulls } from '../lib/utils/objectHelpers';
import { win } from './electron';
import editMenu from './menus/edit';
import fileMenu from './menus/file';
import goToMenu from './menus/goTo';
import helpMenu from './menus/help';
import optionsMenu from './menus/options';
import toolsMenu from './menus/tools';
import viewMenu from './menus/view';
import windowMenu from './menus/window';

export function initMenu(layout: MenuLayout) {
	const options: MenuItemBuilderOptions = {
		isMac: process.platform === 'darwin',
		layout: layout
	};
	return removeNulls([
		// MAIN MENU / FILE MENU
		fileMenu(options),
		// VIEW MENU
		viewMenu(options),
		// EDIT MENU (Mac only)
		editMenu(options),
		// GO TO MENU
		goToMenu(options),
		// TOOLS MENU
		toolsMenu(options),
		// OPTIONS
		optionsMenu(options),
		// WINDOW MENU
		windowMenu(options),
		// HELP MENU
		helpMenu(options)
	]);
}

export function createMenu(layout: MenuLayout) {
	const menu = Menu.buildFromTemplate(initMenu(layout));
	process.platform === 'darwin' ? Menu.setApplicationMenu(menu) : win.setMenu(menu);
}
