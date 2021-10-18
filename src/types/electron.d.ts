import { MenuItem, MenuItemConstructorOptions } from 'electron';

export type MenuLayout = 'REDUCED' | 'DEFAULT'

export interface MenuItemBuilderOptions {
	layout: MenuLayout,
	isMac: boolean
}

export type MenuItemBuilderFunction = (options?: MenuItemBuilderOptions) => MenuItemConstructorOptions | MenuItem;