// fix error trying to import gif animations
declare module '*.gif' {
	const src: string; // Or any type you want to use
	export default src;
}
