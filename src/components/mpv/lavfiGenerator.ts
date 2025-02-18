import { resolve } from 'path';
import semver from 'semver';

import { getConfig, resolvedPath } from '../../lib/utils/config.js';
import { getAvatarResolution } from '../../lib/utils/ffmpeg.js';
import { CurrentSong } from '../../types/playlist.js';
import { requiredMPVFFmpegMasterVersion, requiredMPVFFmpegVersion } from '../../utils/constants.js';
import { playerState } from './mpv.js';

export class lavfiGenerator {
	// Define lavfi-complex commands when we need to display stuff on screen or adjust audio volume. And it's... complex.
	public static async genLavfiComplex(song: CurrentSong, showVideo = true): Promise<string> {
		//audio loudnorm
		const audio = this.genLavfiLoudnorm(song);

		const shouldDisplayAvatar =
			showVideo && song.avatar && getConfig().Player.Display.SongInfo && getConfig().Player.Display.Avatar;
		const shouldDisplayQRcode = showVideo && getConfig().Player.Display.ConnectionInfo.QRCodeDuringSong;

		// Avatar
		const cropRatio = shouldDisplayAvatar ? Math.floor((await getAvatarResolution(song.avatar)) * 0.5) : 0;

		let returnLavfi: string;
		let avatar: string;
		let qrCode: string;

		// Disable this for mpvs with ffmpeg version 7.0
		// Does not work on macOS at the moment (November 2024) due to mpv versions not including a good ffmpeg.
		if (
			process.platform === 'darwin' ||
			(playerState.ffmpegVersion.includes('.') && semver.satisfies(playerState.ffmpegVersion, '7.0.x'))
		) {
			return '[vid1]null[vo]';
		} else {
			const needThirdSplit = shouldDisplayAvatar && shouldDisplayQRcode;

			if (shouldDisplayAvatar) {
				avatar = this.genLavfiAvatar(song.avatar, song.duration, cropRatio, needThirdSplit);
			}

			if (shouldDisplayQRcode) {
				qrCode = this.genLavfiQRCode(needThirdSplit);
			}

			const parts = [audio];
			if (shouldDisplayAvatar) parts.push(avatar + (shouldDisplayQRcode ? '[avatar_out]' : '[vo]'));
			if (shouldDisplayQRcode) parts.push(qrCode + '[vo]');

			returnLavfi = parts.join(';');
		}
		return returnLavfi;
	}

	private static genLavfiLoudnorm(song: CurrentSong): string {
		// Loudnorm normalization scheme: https://ffmpeg.org/ffmpeg-filters.html#loudnorm
		let audio: string;
		if (song.loudnorm) {
			const [input_i, input_tp, input_lra, input_thresh, target_offset] = song.loudnorm.split(',');
			audio = `[aid1]loudnorm=measured_i=${input_i}:measured_tp=${input_tp}:measured_lra=${input_lra}:measured_thresh=${input_thresh}:linear=true:offset=${target_offset}:lra=15:i=-15[ao]`;
		} else {
			audio = '';
		}
		return audio;
	}

	private static genLavfiAvatar(
		songAvatar: string,
		songDuration: number,
		cropRatio: number,
		needThirdSplit: boolean
	): string {
		// Checking if ffmpeg's version in mpv is either a semver or a version revision and if it's better or not than the required versions we have.
		// This is a fix for people using mpvs with ffmpeg < 7.1 or a certain commit version.
		const scaleAvailable = this.isScaleAvailable();

		const split = `[vid${playerState.currentVideoTrack}]split=${needThirdSplit ? '3[base][v_in1][v_in2]' : '2[base][v_in1]'}`;

		// Again, lavfi-complex expert @nah comes to the rescue!
		return [
			`movie=\\'${songAvatar.replaceAll(
				'\\',
				'/'
			)}\\',format=yuva420p,geq=lum='p(X,Y)':a='if(gt(abs(W/2-X),W/2-${cropRatio})*gt(abs(H/2-Y),H/2-${cropRatio}),if(lte(hypot(${cropRatio}-(W/2-abs(W/2-X)),${cropRatio}-(H/2-abs(H/2-Y))),${cropRatio}),255,0),255)'[avatar]`,
			scaleAvailable ? `${split}` : '',
			`nullsrc=size=1x1:duration=${songDuration}[emp]`,
			'[base][emp]overlay[ovrl]',
			scaleAvailable
				? '[avatar][v_in1]scale=w=(rh*.128):h=(rh*.128)[avatar1]'
				: `[avatar][vid${playerState.currentVideoTrack}]scale2ref=w=(ih*.128):h=(ih*.128)[avatar1][ovrl]`,
			`[ovrl][avatar1]overlay=x='if(between(t,0,8)+between(t,${songDuration - 8},${songDuration}),W-(W*29/300),NAN)':y=H-(H*29/200)`,
		]
			.filter(x => !!x)
			.join(';');
	}

	public static genLavfiQRCode(needThirdSplit: boolean): string {
		// Disable this for mpvs with ffmpeg version 7.0
		// Does not work on macOS at the moment (November 2024) due to mpv versions not including a good ffmpeg.
		if (
			process.platform === 'darwin' ||
			(playerState.ffmpegVersion.includes('.') && semver.satisfies(playerState.ffmpegVersion, '7.0.x'))
		)
			return '';

		let overlay: string;
		let videoInput: number;
		let split: string;
		if (needThirdSplit) {
			videoInput = 2;
			split = '';
			overlay = '[avatar_out]';
		} else {
			videoInput = 1;
			split = `[vid${playerState.currentVideoTrack}]split[base][v_in${videoInput}]`;
			overlay = '[base]';
		}

		const scaleAvailable = this.isScaleAvailable();
		const qrCodeFile = resolve(resolvedPath('Temp'), 'qrcode.png').replaceAll('\\', '/');
		return [
			`movie=\\'${qrCodeFile}\\'[qrcode]`,
			scaleAvailable ? `${split}` : '',
			scaleAvailable
				? `[qrcode][v_in${videoInput}]scale=w=(rh*.256):h=(rh*.256)[qrcode1]`
				: `[qrcode][vid${playerState.currentVideoTrack}]scale2ref=w=(ih*.256):h=(ih*.256)[qrcode1][base]`,
			`${overlay}[qrcode1]overlay=x=W-w-(W*0.05):y=H*0.05`,
		]
			.filter(x => !!x)
			.join(';');
	}

	// is the scale ffmpeg lavfi-complex option available?
	private static isScaleAvailable(): boolean {
		// Either it's a semver or a N-xxxxx-xxxx version number
		if (playerState.ffmpegVersion?.startsWith('N')) {
			return parseInt(playerState.ffmpegVersion?.split('-')[1]) >= requiredMPVFFmpegMasterVersion;
		} else {
			return semver.satisfies(semver.coerce(playerState.ffmpegVersion), requiredMPVFFmpegVersion);
		}
	}
}
