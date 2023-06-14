import { Menu } from 'electron';

import { removeNulls } from '../lib/utils/objectHelpers.js';
import { MenuItemBuilderOptions, MenuLayout } from '../types/electron.js';
import { win } from './electron.js';
import editMenu from './menus/edit.js';
import fileMenu from './menus/file.js';
import goToMenu from './menus/goTo.js';
import helpMenu from './menus/help.js';
import optionsMenu from './menus/options.js';
import toolsMenu from './menus/tools.js';
import viewMenu from './menus/view.js';
import windowMenu from './menus/window.js';

export function initMenu(layout: MenuLayout) {
	const options: MenuItemBuilderOptions = {
		isMac: process.platform === 'darwin',
		layout,
	};
	return removeNulls([
		// MAIN MENU / FILE MENU
		fileMenu(options),
		// VIEW MENU
		viewMenu(options),
		// EDIT MENU
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
		helpMenu(options),
	]);
}

export function createMenu(layout: MenuLayout) {
	const menu = Menu.buildFromTemplate(initMenu(layout));
	process.platform === 'darwin' ? Menu.setApplicationMenu(menu) : win?.setMenu(menu);
}
