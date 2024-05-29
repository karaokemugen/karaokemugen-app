if (!window.visualViewport) {
	window.visualViewport = {
		get offsetLeft() {
			return window.document.documentElement.offsetLeft;
		},
		get offsetTop() {
			return window.document.documentElement.offsetTop;
		},
		get pageLeft() {
			return 0;
		},
		get pageTop() {
			return 0;
		},
		get width() {
			return window.document.documentElement.clientWidth;
		},
		get height() {
			return window.document.documentElement.clientHeight;
		},
		get scale() {
			return 0;
		},
		addEventListener: function (
			type: string,
			listener: EventListenerOrEventListenerObject,
			options?: boolean | AddEventListenerOptions
		) {
			return window.addEventListener(type, listener, options);
		},
		removeEventListener: function (
			type: string,
			listener: EventListenerOrEventListenerObject,
			options?: boolean | EventListenerOptions
		) {
			return window.removeEventListener(type, listener, options);
		},
		dispatchEvent: function (event: Event) {
			return window.dispatchEvent(event);
		},
		get onresize() {
			return <any>window.onresize;
		},
		set onresize(value) {
			window.onresize = value;
		},
		get onscroll() {
			return <any>window.onscroll;
		},
		set onscroll(value) {
			window.onscroll = value;
		},
	};
}
