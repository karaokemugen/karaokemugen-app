import logger from 'winston';
import { graphics } from 'systeminformation';

export async function getDisplays() {
    //Get list of monitors to allow users to select one for the player
    const data = await graphics();
    logger.debug('[Webapp] Displays detected : ' + JSON.stringify(data.displays));
    const displays = data.displays
      .filter(d => d.resolutionx > 0)
      .map(d => {
        d.model = d.model.replace('�', 'e');
        return d;
      });
    return displays;
  }