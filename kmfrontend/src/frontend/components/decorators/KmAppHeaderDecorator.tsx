import { ReactNode } from 'react';

interface IProps {
	children?: ReactNode[] | ReactNode;
	mode: string;
}

function KmAppHeaderDecorator(props: IProps) {
	return (
		<div className="KmAppHeaderDecorator" data-mode={props.mode}>
			{props.children}
		</div>
	);
}

export default KmAppHeaderDecorator;
