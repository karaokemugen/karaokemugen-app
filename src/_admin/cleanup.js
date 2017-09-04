const fs = require('fs');
const path = require('path');
const logger = require('../_common/utils/logger.js');

module.exports = {
	run:function(tmpDir,karaList){
		// Read the folder, then compare with what we got in our database wow wow.
		logger.debug('[Cleanup] Cleaning up temporary folder');
		tmpDir = tmpDir.toString();
		var tmpFiles = fs.readdirSync(tmpDir);		
		var deleteFile;
		tmpFiles.forEach(function(tmpFile) {
			deleteFile = true;
			// If file ends with .ass
			if(tmpFile.endsWith('.ass')) {				
				// Then we check if it exists in the karaList we got.
				// If it does, we turn deleteFile to false.
				karaList.some(function(param){
					if (param.generated_subfile === tmpFile) {
						deleteFile = false;
						return true;
					}
				});
				// If no entry in karalist was found for this file, deleteFile is still true.
				if (deleteFile) {
					fs.unlink(path.join(tmpDir,tmpFile), function(err){
						if (err) {
							logger.warn('[Cleanup] Could not delete '+tmpFile);
						} else {
							logger.debug('[Cleanup] Deleting unused sub '+tmpFile);				
						}					
					});
				}
				
			}
		});
		logger.info('[Cleanup] Cleanup of temporary folder complete');
	},
};