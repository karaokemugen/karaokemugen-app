const CracoAntDesignPlugin = require("craco-antd");

module.exports = {
	plugins: [
		{
			plugin: CracoAntDesignPlugin,
			options: {
				customizeTheme: {
					'@layout-body-background': '#171717',
					'@background-color-base': '#262626',
					'@body-background': '#404041',
					'@layout-sider-background': '#2d2d2f',
					'@component-background': '#2d2d2f',
					'@layout-header-background': '#2d2d2f',
					'@menu-dark-submenu-bg': '#2d2d2f',
					'@input-bg': '#313133',
					'@btn-default-bg': '#262626',
					'@border-color-base': 'rgba(255, 255, 255, 0.25)',
					'@border-color-split': '#363636',
					'@heading-color': '#E3E3E3',
					'@text-color': '#E3E3E3',
					'@link-color': '#accdf5',
					'@text-color-secondary': 'fade(#fff, 80%)',
					'@table-selected-row-bg': '#3a3a3a',
					'@table-expanded-row-bg': '#3b3b3b',
					'@table-header-bg': '#3a3a3b',
					'@table-row-hover-bg': '#3a3a3b',
					'@layout-trigger-color': 'fade(#fff, 80%)',
					'@layout-trigger-background': '#313232',
					'@alert-message-color': 'fade(#fff, 67%)',
					'@item-hover-bg': 'fade(#1890ff, 20%)',
					'@item-active-bg': 'fade(#1890ff, 40%)',
					'@disabled-color': 'rgba(255, 255, 255, 0.25)',
					'@tag-default-bg': '#262628',
					'@popover-bg': '#262629',
					'@wait-icon-color': 'fade(#fff, 64%)',
					'@background-color-light': 'fade(#1890ff, 40%)',
					'@collapse-header-bg': '#262629',
					'@danger-color': '#7d2022',
					'@primary-color': '#1c4f90',
					'@highlight-color': '#a8071a',
					'@success-color': '#2a4213',
					'@alert-success-bg-color': '#384e14',
					'@alert-success-border-color': '@alert-success-bg-color',
					'@alert-success-icon-color': '@text-color',
					'@warning-color': '#7d5e28',
					'@alert-warning-bg-color': '#7d5e28',
					'@alert-warning-icon-color': '@text-color',
					'@alert-warning-border-color': '@alert-warning-bg-color',
					'@error-color': '#a3383b',
					'@alert-error-bg-color': '#652f26',
					'@alert-error-icon-color': '@text-color',
					'@alert-error-border-color': '@alert-error-bg-color',
					'@info-color': '#446165',
					'@alert-info-bg-color': '#547175',
					'@alert-info-icon-color': '@text-color',
					'@alert-info-border-color': '@alert-info-bg-color'
				},
			}
		}
	]
};