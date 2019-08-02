import jquery from "jquery";

export default (window.$ = window.jQuery = jquery);

if('ontouchstart' in document.documentElement) jQuery('body').addClass('touch');