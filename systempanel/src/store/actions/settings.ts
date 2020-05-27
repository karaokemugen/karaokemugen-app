import Axios from 'axios';
import { Dispatch } from 'react';
import { SettingsSuccess, SettingsFailure, Settings } from '../types/settings';

export async function setSettings(dispatch: Dispatch<SettingsSuccess | SettingsFailure>): Promise<void>  {
    try {
	const res = await Axios.get('/settings');

      dispatch({
        type: Settings.SETTINGS_SUCCESS,
        payload: { state: res.data.state, config: res.data.config}
      });
    } catch (error) {
      dispatch({
        type: Settings.SETTINGS_FAILURE,
        payload: {
          error: error
        }
      });
      throw error;
    }
}