import 'react-image-crop/dist/ReactCrop.css';
import './CropAvatarModal.scss';

import i18next from 'i18next';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ReactCrop, { Crop } from 'react-image-crop';

import { commandBackend, isRemote } from '../../../utils/socket';
import { WS_CMD } from '../../../utils/ws';

interface IProps {
	src: any;
	saveAvatar: (avatar?) => void;
}

function CropAvatarModal(props: IProps) {
	const [imageRef, setImageRef] = useState<HTMLImageElement>();
	const [imageSource, setImageSource] = useState<string>();
	const [crop, setCrop] = useState<Crop>({
		unit: '%' as const,
		width: 100,
		height: 100,
		x: 0,
		y: 0,
	});

	const reader = new FileReader();
	reader.addEventListener('load', () => setImageSource(reader.result as string));
	reader.readAsDataURL(props.src);

	const getCroppedImg = (image, crop) => {
		const canvas = document.createElement('canvas');
		const scaleX = image.naturalWidth / image.width;
		const scaleY = image.naturalHeight / image.height;
		canvas.width = crop.width;
		canvas.height = crop.height;
		const ctx = canvas.getContext('2d');

		ctx.drawImage(
			image,
			crop.x * scaleX,
			crop.y * scaleY,
			crop.width * scaleX,
			crop.height * scaleY,
			0,
			0,
			crop.width,
			crop.height
		);

		return new Promise(resolve => {
			canvas.toBlob(blob => {
				if (!blob) {
					//reject(new Error('Canvas is empty'));
					console.error('Canvas is empty');
					return;
				}
				resolve(blob);
			}, 'image/jpeg');
		});
	};

	const saveAvatar = async () => {
		if (imageRef && crop.width && crop.height) {
			const croppedImageUrl = await getCroppedImg(imageRef, crop);
			if (croppedImageUrl) {
				if (isRemote()) {
					const response = await commandBackend(WS_CMD.IMPORT_FILE, {
						extension: 'jpg',
						buffer: croppedImageUrl,
					});
					props.saveAvatar({ path: response.filename });
				} else {
					const formData = new FormData();
					formData.append('file', croppedImageUrl as any);
					const response = await fetch('/api/importFile', {
						method: 'POST',
						body: formData,
						headers: {
							authorization: localStorage.getItem('kmToken'),
							onlineAuthorization: localStorage.getItem('kmOnlineToken'),
						},
					});
					props.saveAvatar(await response.json());
				}
				closeModal();
			}
		}
	};

	const closeModal = () => {
		const container = document.getElementById('import-avatar');
		const root = createRoot(container);
		root.unmount();
		props.saveAvatar();
	};

	return (
		<div className="modal modalPage">
			<div className="modal-dialog">
				<div className="modal-content">
					<ul className="modal-header">
						<h4 className="modal-title">{i18next.t('MODAL.CROP_AVATAR_MODAL.TITLE')}</h4>
					</ul>
					<div className="modal-body">
						<ReactCrop crop={crop} aspect={1} onChange={setCrop}>
							<img
								className="crop-avatar"
								src={imageSource}
								onLoad={e => setImageRef(e.currentTarget)}
								alt="avatar"
							/>
						</ReactCrop>
					</div>
					<div className="modal-footer">
						<em className="modal-help">{i18next.t('MODAL.CROP_AVATAR_MODAL.HELP')}</em>
						<button type="button" className="btn btn-action btn-primary other" onClick={closeModal}>
							<i className="fas fa-times" /> {i18next.t('CANCEL')}
						</button>
						<button type="button" className="btn btn-action btn-default ok" onClick={saveAvatar}>
							<i className="fas fa-check" /> {i18next.t('SUBMIT')}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default CropAvatarModal;
