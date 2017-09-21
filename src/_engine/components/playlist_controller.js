var path = require('path');
var timestamp = require('unix-timestamp');
timestamp.round = true;
const logger = require('../../_common/utils/logger.js');
const assManager = require('./ass.js');
const L = require('lodash');
const langs = require('langs');
const isoCountriesLanguages = require('iso-countries-languages');
const async = require('async');
const validator = require('validator');

module.exports = {
	SYSPATH:null,
	DB_INTERFACE:null,
	SETTINGS:null,
	samplePlaylist:[],

	/**
	* @function {Initialization}
	* Initializes our playlist controller
	*/
	init: function(){
		if(module.exports.SYSPATH === null) {
			logger.error('_engine/components/playlist_controller.js : SYSPATH is null');
			process.exit();
		}
		if(module.exports.DB_INTERFACE === null) {
			logger.error('_engine/components/playlist_controller.js : DB_INTERFACE is null');
			process.exit();
		}

		logger.info('[PLC] Playlist controller is READY');
	},
	isCurrentPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			module.exports.isPlaylist(playlist_id)
				.then(function(){
					module.exports.DB_INTERFACE.isCurrentPlaylist(playlist_id)
						.then(function(res){
							resolve(res);
						})
						.catch(function(err){
							logger.error('[PLC] DBI isCurrentPlaylist : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] PLC isPlaylist : '+err);
					reject(err);
				});
		});
	},
	isPublicPlaylist:function(playlist_id) {		
		return new Promise(function(resolve,reject){
			module.exports.isPlaylist(playlist_id)
				.then(function(){
					module.exports.DB_INTERFACE.isPublicPlaylist(playlist_id)
						.then(function(res){
							resolve(res);
						})
						.catch(function(err){
							logger.error('[PLC] DBI isPublicPlaylist : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] PLC isPlaylist : '+err);
				});
		});
	},
	/**
	* @function {Is there a current playlist in the database?}
	* @return {number} {Playlist ID, or error message}
	*/
	isACurrentPlaylist:function() {		
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isACurrentPlaylist()
				.then(function(playlist_id){
					resolve(playlist_id);
				})
				.catch(function(err){					
					reject(err);
				});
		});
	},
	/**
	* @function {Sets the flag playing of a playlist}
	* @param {number} {Playlist ID}
	* @param {number} {PLCID}
	* @return {promise} {Promise}
	*/
	setPlaying:function(plc_id,playlist_id){
		return new Promise(function(resolve,reject) {
			if (plc_id) {
				module.exports.DB_INTERFACE.setPlaying(plc_id,playlist_id)
					.then(function(){
						module.exports.emitEvent('playingUpdated',{
							playlist_id: playlist_id,
							plc_id: plc_id,
						});
						resolve();
					})
					.catch(function(err){
						logger.error('[PLC] DBI setPlaying : '+err);
						reject(err);
					});
			} else {
				module.exports.DB_INTERFACE.unsetPlaying(playlist_id)
					.then(function(){
						module.exports.emitEvent('playingUpdated',{
							playlist_id: playlist_id,
							plc_id: null,
						});
						resolve();
					})
					.catch(function(err){
						logger.error('[PLC] DBI setPlaying : '+err);
						reject(err);
					});
			}			
		});
	},
	/**
	* @function {Returns the PLCID of the latest added kara, by date}
	* @param {number} {Playlist ID}
	* @param {number} {Date added in Unix Timestap}
	* @return {number} {PLC ID}
	*/
	getPLCIDByDate:function(playlist_id,date_added) {		
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.getPLCIDByDate(playlist_id,date_added)
				.then(function(plcid){
					resolve(plcid);
				})
				.catch(function(err){
					logger.error('[PLC] DBI getPLCIDByDate : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {(Re)generate blacklist}
	* @return {boolean} {Promise}
	*/
	generateBlacklist:function() {		
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.generateBlacklist()
				.then(function(){
					resolve();
				})
				.catch(function(err){
					logger.error('[PLC] DBI generateBlacklist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Add a blacklist criteria}
	* @param  {number} blctype {Type of blacklist criteria}
	* @param  {string} blcvalue {Value of blacklist criteria}
	* @return {promise} Promise
	*/
	addBlacklistCriteria:function(blctype,blcvalue) {		
		return new Promise(function(resolve,reject){
			if (blctype >= 0 && blctype <= 1003) {
				if (((blctype >= 1001 && blctype <= 1003) || (blctype > 0 && blctype < 999)) && (isNaN(blcvalue))) {
					var err = 'Blacklist criteria type mismatch : type '+blctype+' must have a numeric value!';
					logger.error('[PLC] '+err);
					reject(err);
				} else {
					module.exports.DB_INTERFACE.addBlacklistCriteria(blctype,blcvalue)
						.then(function(){
							// Regenerate blacklist to take new kara into account.
							module.exports.generateBlacklist()
								.then(function(){
									resolve();
								})
								.catch(function(err){
									logger.error('[PLC] addBlacklistCriteria : generateBlacklist : '+err);
									reject(err);
								});							
						})
						.catch(function(err){
							logger.error('[PLC] DBI addBlacklistCriteria : '+err);
							reject(err);
						});
				}
			} else {
				err = 'Blacklist criteria type error : '+blctype+' is incorrect';
				logger.error('[PLC] '+err);
				reject(err);
			}
		});
	},
	/**
	* @function {Add a kara to the whitelist}
	* @param  {number} kara_id {ID of karaoke to add}
	* @param  {string} reason {Reason for add in whitelist}
	* @return {promise} Promise
	*/
	addKaraToWhitelist:function(kara_id,reason) {
		return new Promise(function(resolve,reject){
			var isKaraInWhitelist = undefined;
			var pIsKara = new Promise((resolve,reject) => {
				module.exports.isKara(kara_id)
					.then(function() {						
						resolve();
					})
					.catch(function(err) {						
						logger.error('[PLC] isKara : '+err);
						reject(err);
					});
			});
			var pIsKaraInWhitelist = new Promise((resolve,reject) => {
				module.exports.isKaraInWhitelist(kara_id)
					.then(function(isKaraInWL) {						
						//Karaoke song is in whitelist, then we update the boolean and resolve the promise
						//since we don't want duplicates in playlists.
						isKaraInWhitelist = isKaraInWL;
						resolve(isKaraInWL);
					})
					.catch(function(err) {
						logger.error('[PLC] isKaraInWhitelist : '+err);
						reject(err);
					});
			});
			Promise.all([pIsKara,pIsKaraInWhitelist])
				.then(function() {
					var date_added = timestamp.now();
					logger.debug('[PLC] addKaraToWhitelist : isKaraInWhitelist = '+isKaraInWhitelist);
					if (!isKaraInWhitelist) {
						module.exports.DB_INTERFACE.addKaraToWhitelist(kara_id,reason,date_added)
							.then(function(){
								// Regenerate blacklist to take new kara into account.
								module.exports.generateBlacklist()
									.then(function(){
										resolve();
									})
									.catch(function(err){
										logger.error('[PLC] addKaraToWhitelist : generateBlacklist : '+err);
										reject(err);
									});
							})
							.catch(function(err){
								logger.error('[PLC] DBI addKaraToWhitelist : '+err);
								reject(err);
							});
					} else {
						var err = 'Karaoke already present in whitelist';
						logger.error('[PLC] addKaraToWhitelist : '+err);
						reject(err);
					}

				})
				.catch(function(err) {
					logger.error('[PLC] addKaraToWhitelist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get karaoke lyrics}
	* @param  {number} id_kara {Karaoke ID}
	* @return {string} {List of lyrics}
	*/
	getKaraLyrics:function(kara_id) {
		return new Promise(function(resolve,reject){
			var pIsKara = new Promise((resolve,reject) => {
				module.exports.isKara(kara_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						logger.error('[PLC] isKara : '+err);
						reject(err);
					});
			});
			Promise.all([pIsKara])
				.then(function(){									
					module.exports.getASS(kara_id)
						.then(function(ass) {							
							var lyrics = assManager.ASSToLyrics(ass);
							resolve(lyrics);							
						})
						.catch(function(err){
							logger.error('[PLC] getKara : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] getKaraLyrics : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get karaoke ASS data}
	* @param  {number} id_kara {Karaoke ID}
	* @return {string} {ASS}
	*/
	getASS:function(kara_id) {
		return new Promise(function(resolve,reject){
			var pIsKara = new Promise((resolve,reject) => {
				module.exports.isKara(kara_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						logger.error('[PLC] isKara : '+err);
						reject(err);
					});
			});
			Promise.all([pIsKara])
				.then(function(){									
					module.exports.DB_INTERFACE.getASS(kara_id)
						.then(function(ass) {							
							// ass can be empty if we're viewing a hardsub
							// or a kara without ass
							if (ass) {
								resolve(ass.ass);
							} else {
								resolve();
							}							
						})
						.catch(function(err){
							logger.error('[PLC] DBI getASS : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] getASS : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Delete a blacklist criteria}
	* @param  {number} blc_id {Blacklist Criteria ID}
	* @return {promise} Promise
	*/
	deleteBlacklistCriteria:function(blc_id) {
		return new Promise(function(resolve,reject){
			if (L.isEmpty(blc_id)) {
				var err = 'BLCID is empty';
				logger.error('[PLC] deleteBlacklistCriteria : '+err);
				reject(err);
			}
			var pIsBLC = new Promise((resolve,reject) => {
				module.exports.isBLCriteria(blc_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'BLCID '+blc_id+' unknown';
						logger.error('[PLC] deleteBlacklistCriteria : '+err);
						reject(err);						
					});
			});
			Promise.all([pIsBLC])
				.then(function(){
					module.exports.DB_INTERFACE.deleteBlacklistCriteria(blc_id)
						.then(function(){
							module.exports.generateBlacklist()
								.then(function(){
									resolve();
								})
								.catch(function(err){
									logger.error('[PLC] generateBlacklist : '+err);
									reject(err);
								});
						})
						.catch(function(err){
							logger.error('[PLC] DBI deleteBlacklistCriteria : '+err);
							reject(err);
						});
				});
		});

	},
	/**
	* @function {Edit a blacklist criteria}
	* @param  {number} blc_id {Blacklist Criteria ID}
	* @param  {number} blctype {Blacklist Criteria type}
	* @param  {string} blcvalue {Blacklist Criteria value}
	* @return {promise} Promise
	*/
	editBlacklistCriteria:function(blc_id,blctype,blcvalue) {
		return new Promise(function(resolve,reject){
			var pIsBLC = new Promise((resolve,reject) => {
				module.exports.isBLCriteria(blc_id)
					.then(function() {
						resolve();
					})
					.catch(function(err) {
						err = 'BLCID '+blc_id+' unknown';
						logger.error('[PLC] deleteBlacklistCriteria : '+err);
						reject(err);						
					});
			});
			Promise.all([pIsBLC])
				.then(function(){
					if (blctype >= 0 && blctype <= 1003) {
						if (((blctype >= 1001 && blctype <= 1003) || (blctype > 0 && blctype < 999)) && (isNaN(blcvalue))) {
							reject('Blacklist criteria type mismatch : type '+blctype+' must have a numeric value!');
						} else {
							module.exports.DB_INTERFACE.editBlacklistCriteria(blc_id,blctype,blcvalue)
								.then(function(){
									module.exports.generateBlacklist()
										.then(function(){
											resolve();
										})
										.catch(function(err){
											logger.error('[PLC] generateBlacklist : '+err);
											reject(err);
										});
								})
								.catch(function(err){
									logger.error('[PLC] editBlacklistCriteria : '+err);
									reject(err);
								});
						}
					} else {
						var err = 'Blacklist criteria type error : '+blctype+' is incorrect';
						logger.error('[PLC] '+err);
						reject(err);
					}
				})
				.catch(function(err){
					logger.error('[PLC] isBLC rejected!');
					reject(err);
				});
		});
	},
	/**
	* @function {Edit a whitelist entry}
	* @param  {number} wlc_id {Blacklist Criteria ID}
	* @param  {string} reason {Edit Reason for whitelisting}
	* @return {promise} Promise
	*/
	editWhitelistKara:function(wlc_id,reason) {
		return new Promise(function(resolve,reject){			
			var pIsWLC = new Promise((resolve,reject) => {
				module.exports.isWLC(wlc_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'WLCID '+wlc_id+' unknown';
						logger.error('[PLC] editWhitelistKara : '+err);
						reject(err);						
					});
			});
			Promise.all([pIsWLC])
				.then(function(){
					// Editing whitelist item here
					module.exports.DB_INTERFACE.editWhitelistKara(wlc_id,reason)
						.then(function(){
							resolve();
						})
						.catch(function(err){
							logger.error('[PLC] editWhitelistKara : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] isWLC rejected!');
					reject(err);
				});
		});
	},
	/**
	* @function {Is there a public playlist in the database?}
	* @return {number} {Playlist ID or message}
	*/
	isAPublicPlaylist:function() {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isAPublicPlaylist()
				.then(function (playlist_id) {
					resolve(playlist_id);
				})
				.catch(function (err) {					
					reject(err);
				});
		});
	},
	/**
	* @function {isPlaylist}
	* @param  {number} playlist_id {ID of playlist to check for existence}
	* @return {promise} Promise
	*/
	isPlaylist:function(playlist_id,seenFromUser) {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isPlaylist(playlist_id,seenFromUser)
				.then(function(res){
					if (res == true) {
						resolve(true);
					} else {
						reject(false);
					}
				})
				.catch(function(err){
					logger.error('[PLC] DBI isPlaylist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Does the playlist have a flag_playing set somewhere?}
	* @param  {number} playlist_id {ID of playlist to check}
	* @return {promise} Promise
	*/
	isPlaylistFlagPlaying:function(playlist_id) {
		return new Promise(function(resolve,reject){			
			module.exports.DB_INTERFACE.isPlaylistFlagPlaying(playlist_id)
				.then(function(res){
					if (res == true) {
						resolve(true);
					} else {
						resolve(false);
					}
				})
				.catch(function(err){
					logger.error('[PLC] DBI isPlaylistFlagPlaying : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {isKara}
	* @param  {number} kara_id {Karaoke ID to check for existence}
	* @return {promise} Promise
	*/
	isKara:function(kara_id) {
		//Une requête toute bête pour voir si une Playlist existe
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isKara(kara_id)
				.then(function(res){
					if (res == true) {
						resolve(true);
					} else {
						reject(false);
					}
				})
				.catch(function(err){
					logger.error('[PLC] DBI isKara : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {is Karaoke blacklisted?}
	* @param  {number} kara_id {Karaoke ID to check in the blacklist}
	* @return {boolean} Promise with true or false)
	*/
	isKaraInBlacklist:function(kara_id) {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isKaraInBlacklist(kara_id)
				.then(function(isKaraInBL) {
					resolve(isKaraInBL);
				})
				.catch(function(err) {
					logger.error('[PLC] DBI isKaraInBlacklist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Is it a blacklist criteria ?}
	* @param  {number} blc_id {Blacklist criteria ID}
	* @return {promise} Promise
	*/
	isBLCriteria:function(blc_id) {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isBLCriteria(blc_id)
				.then(function(){
					resolve();
				})
				.catch(function(err){
					logger.error('[PLC] DBI isBLCriteria : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Is it a whitelist item?}
	* @param  {type} wlc_id {ID of whitelist item}
	* @return {boolean} {Promise}
	*/
	isWLC:function(wlc_id) {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isWLC(wlc_id)
				.then(function(){
					resolve();
				})
				.catch(function(err){
					logger.error('[PLC] DBI isWLC : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Tests if a karaoke is already in a playlist or not}
	* @param  {number} kara_id     {ID of karaoke to search}
	* @param  {number} playlist_id {ID of playlist to search into}
	* @return {boolean} {Promise}
	*/
	isKaraInPlaylist:function(kara_id,playlist_id) {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isKaraInPlaylist(kara_id,playlist_id)
				.then(function(isKaraInPL) {
					resolve(isKaraInPL);
				})
				.catch(function(err) {
					logger.error('[PLC] DBI isKaraInPlaylist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Tests if a karaoke is already in the whitelist}
	* @param  {number} kara_id     {ID of karaoke to search}
	* @return {boolean} {Promise}
	*/
	isKaraInWhitelist:function(kara_id) {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isKaraInWhitelist(kara_id)
				.then(function(isKaraInWL) {
					resolve(isKaraInWL);
				})
				.catch(function(err) {
					logger.error('[PLC] DBI isKaraInWhitelist : '+err);
					reject(err);
				});
		});
	},
	setCurrentPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			module.exports.getPlaylistInfo(playlist_id)
				.then(function(playlist){
					if (playlist.flag_public == 1) {
						var err = 'A current playlist cannot be set to public. Set another playlist to current first.';
						logger.error('[PLC] setCurrentPlaylist : '+err);
						reject(err);
					} else {
						module.exports.unsetCurrentAllPlaylists()
							.then(function(){
								module.exports.DB_INTERFACE.setCurrentPlaylist(playlist_id)
									.then(function(){
										module.exports.updatePlaylistLastEditTime(playlist_id)
											.then(function(){
												resolve();
											})
											.catch(function(err){
												logger.error('[PLC] updatePlaylistLastEditTime : '+err);
												reject(err);
											});
									})
									.catch(function(err){
										logger.error('[PLC] DBI setCurrentPlaylist : '+err);					
										reject(err);
									});
							})
							.catch(function(err){
								logger.error('[PLC] unsetCurrentAllPlaylists : '+err);
								reject(err);
							});
						
					}					
				})
				.catch(function(err){
					logger.error('[PLC] DBI getPlaylistInfo : '+err);					
					reject(err);
				});
		});
	},
	/**
	* @function {setVisiblePlaylist}
	* @param  {number} playlist_id {ID of playlist to make visible}
	*/
	setVisiblePlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.setVisiblePlaylist(playlist_id)
				.then(function(){
					logger.info('[PLC] Setting playlist '+playlist_id+' visible flag to ON');
					module.exports.updatePlaylistLastEditTime(playlist_id)
						.then(function(){
							resolve();
						})
						.catch(function(err){
							logger.error('[PLC] updatePlaylistLastEditTime : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] DBI setVisiblePlaylist : '+err);					
					reject(err);
				});
		});
	},
	unsetVisiblePlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.unsetVisiblePlaylist(playlist_id)
				.then(function(){
					module.exports.updatePlaylistLastEditTime(playlist_id)
						.then(function(){
							resolve();					
						})
						.catch(function(err){
							logger.error('[PLC] updatePlaylistLastEditTime : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] DBI unsetVisiblePlaylist : '+err);
					reject(err);
				});
		});
	},
	setPublicPlaylist:function(playlist_id){
		return new Promise(function(resolve,reject){
			module.exports.getPlaylistInfo(playlist_id)
				.then(function(playlist){
					if (playlist.flag_current == 1) {
						var err = 'A public playlist cannot be set to current. Set another playlist to public first.';
						logger.error('[PLC] setPublicPlaylist : '+err);
						reject(err);
					} else {
						module.exports.unsetPublicAllPlaylists()
							.then(function(){
								module.exports.DB_INTERFACE.setPublicPlaylist(playlist_id)
									.then(function(){
										module.exports.updatePlaylistLastEditTime(playlist_id)
											.then(function(){
												resolve();
											})
											.catch(function(err){
												logger.error('[PLC] updatePlaylistLastEditTime : '+err);
												reject(err);
											});
									})
									.catch(function(err){
										logger.error('[PLC] DBI setPublicPlaylist : '+err);					
										reject(err);
									});
							})
							.catch(function(err){
								logger.error('[PLC] unsetPublicAllPlaylists : '+err);
								reject(err);
							});
						
					}					
				})
				.catch(function(err){
					logger.error('[PLC] DBI getPlaylistInfo : '+err);					
					reject(err);
				});
		});
	},
	/**
	* @function {Delete a playlist}
	* @param  {number} playlist_id             {ID of playlist to delete}
	* @return {promise} {Promise}
	*/
	deletePlaylist:function(playlist_id) {
		// Suppression d'une playlist. Si la playlist a un flag_public ou flag_current, c'est refusé.
		return new Promise(function(resolve,reject){
			module.exports.isPlaylist(playlist_id)
				.then(function(){
					var pIsPublic = new Promise((resolve,reject) => {
						module.exports.isPublicPlaylist(playlist_id)
							.then(function(res) {
								if (res == true) {
									var err = 'Playlist to delete is public. Unable to delete it';
									logger.error('[PLC] deletePlaylist : '+err);
									reject(err);
								} else {
									resolve(true);
								}
							})
							.catch(function(err) {
								logger.error('[PLC] isPublicPlaylist : '+err);
								reject(err);
							});
					});
					var pIsCurrent = new Promise((resolve,reject) =>	{
						module.exports.isCurrentPlaylist(playlist_id)
							.then(function(res){
								if (res == true) {									
									var err = 'Playlist to delete is current. Unable to delete it';
									logger.error('[PLC] deletePlaylist : '+err);
									reject(err);								
								} else {
									resolve(true);
								}
							})
							.catch(function(err){
								logger.error('[PLC] isCurrentPlaylist : '+err);
								reject(err);
							});
					});
					Promise.all([pIsPublic,pIsCurrent])
						.then(function() {							
							module.exports.DB_INTERFACE.deletePlaylist(playlist_id)
								.then(function() {
									resolve();
								})
								.catch(function(err){
									logger.error('[PLC] DBI deletePlaylist : '+err);
									reject(err);
								});
						})
						.catch(function(err) {
							logger.error('[PLC] deletePlaylist : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					err = 'Playlist '+playlist_id+' unknown';
					logger.error('[PLC] deletePlaylist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Empty Playlist}
	* @param  {number} playlist_id {ID of playlist to empty}
	* @return {promise} {Promise}
	*/
	emptyPlaylist:function(playlist_id) {		
		return new Promise(function(resolve,reject){
			module.exports.isPlaylist(playlist_id)
				.then(function() {
					module.exports.DB_INTERFACE.emptyPlaylist(playlist_id)
						.then(function(){
							module.exports.updatePlaylistLastEditTime(playlist_id)
								.then(function(){
									resolve();
								})
								.catch(function(err){
									logger.error('[PLC] updatePlaylistLastEditTime : '+err);
									reject(err);
								});
						})
						.catch(function(err){
							logger.error('[PLC] DBI emptyPlaylist : '+err);
							reject(err);
						});
				})
				.catch(function(err) {
					err = 'Playlist '+playlist_id+' unknown';
					logger.error('[PLC] isPlaylist : '+err);
					reject(err);
				});			
		});
	},
	/**
	* @function {Empty Whitelist}
	* @return {promise} {Promise}
	*/
	emptyWhitelist:function() {		
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.emptyWhitelist()
				.then(function(){
					module.exports.generateBlacklist()
						.then(function(){
							resolve();
						})
						.catch(function(err){
							logger.error('[PLC] generateBlacklist : '+err);
							reject(err);							
						});		
				})
				.catch(function(err) {
					logger.error('[PLC] DBI emptyWhitelist : '+err);
					reject(err);
				});			
		});
	},
	/**
	* @function {Empty blacklist criterias}
	* @return {promise} {Promise}
	*/
	emptyBlacklistCriterias:function() {		
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.emptyBlacklistCriterias()
				.then(function(){
					module.exports.generateBlacklist()
						.then(function(){
							resolve();
						})
						.catch(function(err){
							logger.error('[PLC] generateBlacklist : '+err);
							reject(err);							
						});		
				})
				.catch(function(err) {
					logger.error('[PLC] DBI emptyBlacklistCriterias : '+err);
					reject(err);
				});			
		});
	},
	/**
	* @function {editPlaylist}
	* Edits properties of a playlist
	* @param  {number} playlist_id  {Playlist ID to edit}
	* @param  {string} name         {New name of playlist}
	* @param  {number} flag_visible {Is the playlist visible?}
	* @param  {number} flag_current {Is the playlist the current one?}
	* @param  {number} flag_public  {Is the playlist the public one?}
	*/
	editPlaylist:function(playlist_id,name,flag_visible) {
		return new Promise(function(resolve,reject){
			var NORM_name = L.deburr(name);
			var lastedit_time = timestamp.now();
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					module.exports.DB_INTERFACE.editPlaylist(playlist_id,name,NORM_name,lastedit_time,flag_visible)
						.then(function(){
							resolve();
						})
						.catch(function(err){
							logger.error('[PLC] DBI editPlaylist');
							reject(err);
						});
				})
				.catch(function(err) {
					logger.error('[PLC] editPlaylist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Create a new playlist}
	* @param  {string} name         {Playlist name}
	* @param  {number} flag_visible {Is the playlist visible?}
	* @param  {number} flag_current {Is the playlist current}
	* @param  {number} flag_public  {Is the playlist public}
	* @return {promise} {Promise}
	*/
	createPlaylist:function(name,flag_visible,flag_current,flag_public) {

		// Méthode de création playlist
		// Prend en entrée un nom, et des booléens
		// Si flag_public ou flag_current = true il faut désactiver le flag sur toutes les autres playlists

		// on retourne une promise
		
		return new Promise(function(resolve,reject){
			var NORM_name = L.deburr(name);
			var creation_time = timestamp.now();
			var lastedit_time = creation_time;

			if (flag_current == 1 && flag_public == 1) {
				var err = 'A playlist cannot be current and public at the same time!';
				logger.error('[PLC] editPlaylist : '+err);
				reject(err);
			} else {
				var pUnsetFlagPublic = new Promise((resolve,reject) => {
					if (flag_public == 1) {
						module.exports.unsetPublicAllPlaylists()
							.then(function(){
								resolve();
							})
							.catch(function(err){
								logger.error('[PLC] unsetFlagPublic : '+err);
								reject(err);
							});
					} else {
						resolve();
					}
				});

				var pUnsetFlagCurrent = new Promise((resolve,reject) => {
					if (flag_current == 1) {
						module.exports.unsetCurrentAllPlaylists()
							.then(function(){
								resolve();
							})
							.catch(function(err){
								logger.error('[PLC] unsetFlagCurrent : '+err);
								reject(err);
							});
					} else {
						resolve();
					}
				});

				Promise.all([pUnsetFlagCurrent,pUnsetFlagPublic])
					.then(function() {
						module.exports.DB_INTERFACE.createPlaylist(name,NORM_name,creation_time,lastedit_time,flag_visible,flag_current,flag_public)
							.then(function(new_id_playlist){
								resolve(new_id_playlist);
							})
							.catch(function(err){
								logger.error('[PLC] DBI createPlaylist : '+err);
								reject(err);
							});
					})
					.catch(function(err) {
						logger.error('[PLC] createPlaylist : '+err);
						reject(err);
					});
			}
		});
	},
	/**
	* @function {getPlaylistInfo}
	* @param  {number} playlist_id {Playlist ID to fetch}
	* @param  {boolean} seenFromUser {Is the playlist being seen from the user's perspective?}
	* @return {Object} {Playlist object}
	* Returns a playlist object with the following information :
	* - id_playlist
	* - name (name of playlist)
	* - num_karas (Number of karaoke songs in the playlist)
	* - length (duration in seconds of the whole playlist)
	* - creation_time (in UNIX timestamp format)
	* - lastedit_time (in UNIX timestamp format)
	* - flag_visible (is the playlist visible?)
	* - flag_current (is the playlist the current one?)
	* - flag_public (is the playlist the public one?)
	*/
	getPlaylistInfo:function(playlist_id,seenFromUser) {		
		return new Promise(function(resolve,reject){
			module.exports.isPlaylist(playlist_id)
				.then(function() {
					module.exports.DB_INTERFACE.getPlaylistInfo(playlist_id,seenFromUser)
						.then(function(playlist){
							resolve(playlist);
						})
						.catch(function(err){
							logger.error('[PLC] DBI getPlaylistInfo : '+err);
							reject(err);
						});
				})
				.catch(function(err) {
					err = 'Playlist '+playlist_id+' unknown';
					logger.error('[PLC] isPlaylist : '+err);
					reject(err);
				});			
		});
	},
	/**
	* @function {getPlaylists}
	* @return {Object} {array of Playlist objects}
	* @param {boolean} seenFromUser {Is the playlist list seen from the user's perspective?}
	* Returns an array of playlist objects to get all playlists :
	* - playlist_id (ID of playlist)
	* - name (name of playlist)
	* - NORM_name (normalized name of playlist)
	* - num_karas (Number of karaoke songs in the playlist)
	* - length (duration in seconds of the whole playlist)
	* - created_at (in UNIX timestamp format)
	* - modified_at (in UNIX timestamp format)
	* - flag_visible (is the playlist visible?)
	* - flag_current (is the playlist the current one?)
	* - flag_public (is the playlist the public one?)
	*/
	getPlaylists:function(seenFromUser) {
		return new Promise(function(resolve){
			module.exports.DB_INTERFACE.getPlaylists(seenFromUser)
				.then(function(playlists) {
					resolve(playlists);
				})
				.catch(function(err) {
					logger.error('[PLC] DBI getPlaylists : '+err);
					resolve(err);
				});
		});
	},
	unsetPublicAllPlaylists:function() {
		return new Promise(function(resolve,reject){
			// Désactive le flag Public sur toutes les playlists
			module.exports.DB_INTERFACE.unsetPublicAllPlaylists()
				.then(function(){
					resolve();
				})
				.catch(function(err){
					logger.error('[PLC] DBI unsetPublicAllPlaylists : '+err);
					reject();
				});
		});

	},
	unsetCurrentAllPlaylists:function() {
		return new Promise(function(resolve,reject){
			// Désactive le flag Current sur toutes les playlists
			module.exports.DB_INTERFACE.unsetCurrentAllPlaylists()
				.then(function(){
					resolve();
				})
				.catch(function(err){
					logger.error('[PLC] DBI unsetCurrentAllPlaylists : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Update number of karaokes in playlist}
	* @param  {number} playlist_id {ID of playlist to update}
	* @return {number} {number of karaokes found}
	*/
	updatePlaylistNumOfKaras:function(playlist_id) {
		return new Promise(function(resolve,reject) {
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					// Get playlist number of karaokes
					module.exports.DB_INTERFACE.calculatePlaylistNumOfKaras(playlist_id)
						.then(function(num_karas){
							module.exports.DB_INTERFACE.updatePlaylistNumOfKaras(playlist_id,num_karas)
								.then(function(num_karas){
									resolve(num_karas);
								})
								.catch(function(err){
									logger.error('[PLC] DBI updatePlaylistNumOfKaras : '+err);
									reject(err);
								});
						})
						.catch(function(err){
							logger.error('[PLC] DBI calculatePlaylistNumOfKaras : '+err);
							reject(err);
						});
				});
		});
	},
	/**
	* @function {Update playlist's last edit time}
	* @param  {number} playlist_id {ID of playlist to update}
	* @return {boolean} {Promise}
	*/
	updatePlaylistLastEditTime:function(playlist_id) {
		return new Promise(function(resolve,reject) {
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					var lastedit_date = timestamp.now();
					// Update PL's last edit time
					module.exports.DB_INTERFACE.updatePlaylistLastEditTime(playlist_id,lastedit_date)
						.then(function(){
							resolve();
						})
						.catch(function(err){
							logger.error('[PLC] DBI updatePlaylistLastEditTime : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] updatePlaylistLastEditTime : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Update duration of a playlist}
	* @param  {number} playlist_id {ID of playlist to update}
	* @return {number} {duration in seconds}
	*/
	updatePlaylistDuration:function(playlist_id) {
		return new Promise(function(resolve,reject) {
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					// Get playlist duration
					module.exports.DB_INTERFACE.calculatePlaylistDuration(playlist_id)
						.then(function(duration){
							if (duration.duration == null) {
								duration.duration = 0;
							}
							module.exports.DB_INTERFACE.updatePlaylistDuration(playlist_id,duration.duration)
								.then(function(duration){									
									resolve(duration);
								})
								.catch(function(err){
									logger.error('[PLC] DBI updatePlaylistDuration : '+err);
									reject(err);
								});
						})
						.catch(function(err){
							logger.error('[PLC] DBI calculatePlaylistDuration : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] updatePlaylistDuration : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get playlist contents}
	* @param  {number} playlist_id {ID of playlist to get contents from}
	* @param  {boolean} seenFromUser {is it viewed by the user or not?}
	* @param  {boolean} forPlayer {is it for the player or for display?}
	* @return {array} {Array of karaoke objects}
	*/
	getPlaylistContents:function(playlist_id,seenFromUser,forPlayer) {
		return new Promise(function(resolve,reject) {
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id,seenFromUser)
					.then(function() {
						resolve();
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					// Get karaoke list
					module.exports.DB_INTERFACE.getPlaylistContents(playlist_id,forPlayer)
						.then(function(playlist){
							resolve(playlist);
						})
						.catch(function(err){
							logger.error('[PLC] DBI getPlaylistContents : '+err);
							reject(err);
						});
					
				})
				.catch(function(err) {
					logger.error('[PLC] getPlaylistContents : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get kara info from a playlist}
	* @param  {number} plc_id {ID of playlist content to get info from}
	* @return {array} {Array of karaoke objects}
	*/
	getKaraFromPlaylist:function(plc_id,seenFromUser) {
		return new Promise(function(resolve,reject) {
			module.exports.DB_INTERFACE.getPLContentInfo(plc_id,seenFromUser)
				.then(function(kara) {
					if (kara) {
						kara = [kara];
						resolve(kara);
					} else {
						var err = 'PLCID unknown!';
						logger.error('[PLC] getKaraFromPlaylist : '+err);
						reject(err);
					}						
				})
				.catch(function(err) {
					logger.error('[PLC] GetKaraFromPlaylist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get whitelist contents}
	* @return {array} {Array of karaoke objects}
	*/
	getWhitelistContents:function() {
		return new Promise(function(resolve,reject) {
			// Get karaoke list
			module.exports.DB_INTERFACE.getWhitelistContents()
				.then(function(playlist){
					resolve(playlist);
				})
				.catch(function(err){
					logger.error('[PLC] DBI getWhitelistContents : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get blacklist contents}
	* @return {array} {Array of karaoke objects}
	*/
	getBlacklistContents:function() {
		return new Promise(function(resolve,reject) {
			// Get karaoke list
			module.exports.DB_INTERFACE.getBlacklistContents()
				.then(function(playlist){
					resolve(playlist);
				})
				.catch(function(err){
					logger.error('[PLC] DBI getBlacklistContents : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get blacklist contents}
	* @return {array} {Array of karaoke objects}
	*/
	getBlacklistCriterias:function() {
		return new Promise(function(resolve,reject) {
			// Get list of criterias
			module.exports.DB_INTERFACE.getBlacklistCriterias()
				.then(function(blc){
					resolve(blc);
				})
				.catch(function(err){
					logger.error('[PLC] DBI getBlacklistCriterias : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get all karaokes}
	* @return {array} {Array of karaoke objects}
	*/
	getAllKaras:function() {
		return new Promise(function(resolve,reject) {
			// Get karaoke list
			module.exports.DB_INTERFACE.getAllKaras()
				.then(function(playlist){
					resolve(playlist);
				})
				.catch(function(err){
					logger.error('[PLC] DBI getAllKaras : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get a random kara_id}
	* @return {number} {Random kara_id}
	*/
	getRandomKara:function(playlist_id,filter) {
		return new Promise(function(resolve,reject) {
			// Get karaoke list
			module.exports.getAllKaras()
				.then(function(allKaras){
					module.exports.filterPlaylist(allKaras,filter)
						.then(function(playlistFiltered){
							//Strip allKaras to just kara IDs
							playlistFiltered.forEach(function(elem,index){
								playlistFiltered[index] = elem.kara_id;
							});
							//Now, get current playlist's contents.
							module.exports.getPlaylistContents(playlist_id)
								.then(function(playlist){
									//Strip allKaras to just kara IDs
									playlist.forEach(function(elem,index){
										playlist[index] = elem.kara_id;
									});
									var allKarasNotInCurrentPlaylist = [];
									allKarasNotInCurrentPlaylist = playlistFiltered.filter(function(el){
										return playlist.indexOf(el) < 0;
									});
									var randomKara = L.sample(allKarasNotInCurrentPlaylist);
									resolve(randomKara);
								})
								.catch(function(err){
									logger.error('[PLC] getPlaylistContents : '+err);
									reject(err);
								});
						})
						.catch(function(err){
							logger.error('[PLC] filterPlaylist : '+err);
							reject(err);
						});
					
				})
				.catch(function(err){
					logger.error('[PLC] getAllKaras : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get karaoke by ID}
	* @param  {number} kara_id {ID of karaoke to fetch infos from}
	* @return {Object} {karaoke object}
	*/
	getKara:function(kara_id) {
		return new Promise(function(resolve,reject) {
			// Get karaoke list
			module.exports.DB_INTERFACE.getKara(kara_id)
				.then(function(kara){
					logger.debug('[PLC] GetKara : '+JSON.stringify(kara)+' from '+kara_id);
					resolve(kara);
				})
				.catch(function(err){
					logger.error('[PLC] DBI getKara : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get karaoke by KID}
	* @param  {string} kid {KID of karaoke to fetch infos from}
	* @return {Object} {karaoke object}
	*/
	getKaraByKID:function(kid) {
		return new Promise(function(resolve,reject) {
			// Get karaoke list
			module.exports.DB_INTERFACE.getKaraByKID(kid)
				.then(function(kara){
					resolve(kara);
				})
				.catch(function(err){
					logger.error('[PLC] DBI getKaraByKID : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Filter playlist with a text}
	* @param  {object} playlist   {playlist array of karaoke objects}
	* @param  {string} searchText {Words separated by a space}
	* @return {object} {playlist array filtered}
	*/
	filterPlaylist:function(playlist,searchText) {
		return new Promise(function(resolve) {
			function textSearch(kara){
				searchText = L.deburr(searchText);
				searchText = searchText.toLowerCase();

				var searchOK = [];
				var searchWords = searchText.split(' ');

				var searchWordID = 0;
				searchWords.forEach(function(searchWord) {
					searchOK[searchWordID] = false;					
					if (!L.isEmpty(kara.NORM_title)) {
						if (kara.NORM_title.toLowerCase().includes(searchWord)) searchOK[searchWordID] = true;
					}
					if (!L.isEmpty(kara.NORM_serie)) {
						if (kara.NORM_serie.toLowerCase().includes(searchWord)) searchOK[searchWordID] = true;
					}
					if (!L.isEmpty(kara.NORM_serie_altname)) {
						if (kara.NORM_serie_altname.toLowerCase().includes(searchWord)) searchOK[searchWordID] = true;
					}
					if (!L.isEmpty(kara.NORM_singer)) {
						if (kara.NORM_singer.toLowerCase().includes(searchWord)) searchOK[searchWordID] = true;
					}
					if (!L.isEmpty(kara.NORM_creator)) {
						if (kara.NORM_creator.toLowerCase().includes(searchWord)) searchOK[searchWordID] = true;
					}					
					if (!L.isEmpty(kara.songtype_i18n_short)) {
						if (kara.songtype_i18n_short.toLowerCase().includes(searchWord)) searchOK[searchWordID] = true;
					}
					if (!L.isEmpty(kara.misc_i18n)) {
						if (kara.misc_i18n.toLowerCase().includes(searchWord)) searchOK[searchWordID] = true;
					}
					if (!L.isEmpty(kara.language_i18n)) {						
						if (L.deburr(kara.language_i18n).toLowerCase().includes(searchWord)) searchOK[searchWordID] = true;						
					}

					searchWordID++;
				});
				if (searchOK.indexOf(false) > -1 ) {
					return false;
				} else {
					return true;
				}
			}

			var filteredPlaylist = playlist.filter(textSearch);
			resolve(filteredPlaylist);
		});
	},
	/**
	* @function {Add Karaoke to Playlist}
	* @param  {number} kara_id     {ID of karaoke to add}
	* @param  {string} requester   {Name of person submitting karaoke}
	* @param  {number} playlist_id {ID of playlist to add to}
	* @param  {number} pos         {OPTIONAL : Position in playlist}
	* @return {boolean} {Promise}
	* If no position is provided, it will be maximum position in playlist + 1
	*/
	addKaraToPlaylist:function(karas,requester,playlist_id,pos) {
		// Karas is an array of kara_ids.
		return new Promise(function(resolve,reject){
			var NORM_requester = L.deburr(requester);
			var date_add = timestamp.now();
			// Let's build the complete array of kara objects
			var karaList = [];
			karas.forEach(function(kara_id){
				karaList.push({
					kara_id: kara_id,
					requester: requester,
					NORM_requester: NORM_requester,
					playlist_id: playlist_id,
					date_add: date_add,				
				});				
			});

			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			var pIsKara = new Promise((resolve,reject) => {
				// Need to do this for each karaoke.
				async.each(karas,function(kara_id,callback) {				
					module.exports.isKara(kara_id)
						.then(function() {
							callback();
						})
						.catch(function(err) {
							err = 'Karaoke song '+kara_id+' unknown';
							logger.error('[PLC] isKara : '+err);
							callback(err);
						});
				},function(err){
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});				
			});
			var pIsKaraInPlaylist = new Promise((resolve,reject) => {
				// Need to do this for each karaoke.
				async.each(karas,function(kara_id,callback) {				
					module.exports.isKaraInPlaylist(kara_id,playlist_id)
						.then(function(isKaraInPL) {
							//Karaoke song is in playlist, then we update the boolean and resolve the promise
							//since we don't want duplicates in playlists.
							if (isKaraInPL) {
								//Search kara_id in karaList and then delete that index from the array. 
								//Karaoke song won't be added since it already exists in destination playlist.								
								karaList = L.filter(karaList, element => element.kara_id !== kara_id);
							}
							callback();
						})
						.catch(function(err) {
							logger.error('[PLC] isKaraInPlaylist : '+err);
							callback(err);
						});
				},function(err){
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
				
			});
			Promise.all([pIsKara,pIsPlaylist,pIsKaraInPlaylist])
				.then(function(){
					
					if (karaList.length === 0) {
						var err = 'No karaoke could be added, all are in destination playlist already (PLID : '+playlist_id+')';
						logger.error('[PLC] addKaraToPlaylist : '+err);
						reject(err);
					} else {	
						var pManagePos = new Promise((resolve,reject) => {
							// If pos is provided, we need to update all karas above that and add 
							// karas.length to the position
							// If pos is not provided, we need to get the maximum position in the PL
							// And use that +1 to set our playlist position.
							if (pos) {
								module.exports.DB_INTERFACE.shiftPosInPlaylist(playlist_id,pos,karas.length)
									.then(function(){										
										resolve();
									})
									.catch(function(err){
										logger.error('[PLC] DBI shiftPosInPlaylist : '+err);
										reject(err);
									});								
							} else {								
								var startpos;								
								module.exports.DB_INTERFACE.getMaxPosInPlaylist(playlist_id)
									.then(function(maxpos){
										startpos = maxpos + 1.0;
										var index = 0;
										karaList.forEach(function(){
											karaList[index].pos = startpos+index;
											index++;
										});
										resolve();
									})
									.catch(function(err){
										logger.error('[PLC] DBI getMaxPosInPlaylist : '+err);
										reject(err);
									});
							}
						});													
						Promise.all([pManagePos])
							.then(function() {	
								logger.debug('[PLC] addKaraToPlaylist : Adding to database');
								module.exports.DB_INTERFACE.addKaraToPlaylist(karaList)
									.then(function(){										
										logger.debug('[PLC] addKaraToPlaylist : updating playlist info');
										var pUpdateLastEditTime = new Promise((resolve,reject) => {
											module.exports.updatePlaylistLastEditTime(playlist_id)
												.then(function(){
													resolve();
												})
												.catch(function(err){
													logger.error('[PLC] updatePlaylistLastEditTime : '+err);
													reject(err);
												});
										});
										var pUpdatedDuration = new Promise((resolve,reject) => {
											module.exports.updatePlaylistDuration(playlist_id)
												.then(function(){
													resolve();
												})
												.catch(function(err){
													logger.error('[PLC] updatePlaylistDuration : '+err);
													reject(err);
												});
										});
										var pUpdatedKarasCount = new Promise((resolve,reject) => {
											module.exports.updatePlaylistNumOfKaras(playlist_id)
												.then(function(){
													resolve();
												})
												.catch(function(err){
													logger.error('[PLC] updatePlaylistNumOfKaras : '+err);
													reject(err);
												});
										});
										var pSetPlaying = new Promise ((resolve,reject) => {
											// Checking if a flag_playing is present inside the playlist.
											// If not, we'll have to set the karaoke we just added as the currently playing one. 
											module.exports.isPlaylistFlagPlaying(playlist_id)
												.then(function(res){																			// Playlist has no song with flag_playing!
													// Now setting.
													if (!res) {														
														module.exports.getPLCIDByDate(playlist_id,date_add)
															.then(function(plcid){
																module.exports.setPlaying(plcid,playlist_id)
																	.then(function(){
																		resolve();
																	})
																	.catch(function(err){
																		logger.error('[PLC] DBI setPlaying : '+err);
																		reject(err);
																	});
															})
															.catch(function(err){
																logger.error('[PLC] getPLCIDByDate : '+err);
																reject(err);
															});																												
													} else {
														resolve();
													}
												})
												.catch(function(err){
													logger.error('[PLC] isPlaylistFlagPlaying : '+err);
													reject(err);
												});
										});
										Promise.all([pSetPlaying,pUpdateLastEditTime,pUpdatedDuration,pUpdatedKarasCount])
											.then(function() {								
												var karaAdded = [];
												karaList.forEach(function(kara) {
													karaAdded.push(kara.kara_id);
												});
												resolve(karaAdded);
											})
											.catch(function(err) {
												logger.error('[PLC] addKaraToPlaylist : '+err);
												reject(err);
											});
									})
									.catch(function(err) {
										logger.error('[PLC] addKaraToPlaylist : '+err);
										reject(err);
									});

							})
							.catch(function(err) {
								logger.error('[PLC] addKaraToPlaylist : '+err);
								reject(err);
							});
							

					}
				})
				.catch(function(err) {
					logger.error('[PLC] addKaraToPlaylist : '+err);
					reject(err);
				});

		});
	},
	/**
	* @function {copy playlist contents to Playlist}
	* @param  {number} plc_id     {ID of playlist contents to add}
	* @param  {number} playlist_id {ID of playlist to add to}
	* @param  {number} pos         {OPTIONAL : Position in playlist}
	* @return {boolean} {Promise}
	* If no position is provided, it will be maximum position in playlist + 1
	*/
	copyKaraToPlaylist:function(plcs,playlist_id,pos) {
		// plcs is an array of plc_ids.
		return new Promise(function(resolve,reject){
			var date_add = timestamp.now();
			// Let's build the complete array of kara objects
			var plcList = [];
			plcs.forEach(function(plc_id){
				plcList.push({
					plc_id: plc_id,
					playlist_id: playlist_id,
					date_add: date_add,				
				});				
			});

			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			var pCheckPLCandKaraInPlaylist = new Promise((resolve,reject) => {
				// Need to do this for each karaoke.
				async.eachOf(plcList,function(playlistContent,index,callback) {				
					module.exports.DB_INTERFACE.getPLContentInfo(playlistContent.plc_id)
						.then(function(playlistContentData) {
							if (playlistContentData) {
								//We got a hit!
								// Let's check if the kara we're trying to add is 
								// already in the playlist we plan to copy it to.
								module.exports.isKaraInPlaylist(playlistContentData.kara_id,playlist_id)
									.then(function(isKaraInPL) {
										//Karaoke song is already in playlist, abort mission
										//since we don't want duplicates in playlists.
										if (isKaraInPL) {
											var err = 'Karaoke song '+playlistContentData.kara_id+' is already in playlist '+playlist_id;
											callback(err);
										} else {
											// All OK. We need some info though.
											plcList[index].kara_id = playlistContentData.kara_id;
											plcList[index].requester = playlistContentData.pseudo_add;
											plcList[index].NORM_requester = playlistContentData.NORM_pseudo_add;
											callback();
										}									
									})
									.catch(function(err) {
										logger.error('[PLC] isKaraInPlaylist : '+err);
										reject(err);
									});							
							} else {
								var err = 'PLC '+playlistContent.plc_id+' does not exist';
								callback(err);
							}							
						})
						.catch(function(err) {						
							logger.error('[PLC] GetPLContentInfo : '+err);
							callback(err);
						});				
				}, function(err){
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});

			});
			Promise.all([pCheckPLCandKaraInPlaylist,pIsPlaylist])
				.then(function(){
					logger.debug('[PLC] addKaraToPlaylist : copying ASS and setting positions');									
					var pManagePos = new Promise((resolve,reject) => {
						// If pos is provided, we need to update all karas above that and add 
						// karas.length to the position
						// If pos is not provided, we need to get the maximum position in the PL
						// And use that +1 to set our playlist position.					
						if (pos) {
							module.exports.DB_INTERFACE.shiftPosInPlaylist(playlist_id,pos,plcs.length)
								.then(function(){
									resolve();
								})
								.catch(function(err){
									logger.error('[PLC] DBI shiftPosInPlaylist : '+err);
									reject(err);
								});								
						} else {
							var startpos;								
							module.exports.DB_INTERFACE.getMaxPosInPlaylist(playlist_id)
								.then(function(maxpos){
									startpos = maxpos + 1.0;
									var index = 0;
									plcList.forEach(function(){
										plcList[index].pos = startpos+index;
										index++;
									});
									resolve();
								})
								.catch(function(err){
									logger.error('[PLC] DBI getMaxPosInPlaylist : '+err);
									reject(err);
								});
						}
					});													
					Promise.all([pManagePos])
						.then(function() {	
							logger.debug('[PLC] copyKaraToPlaylist : Copying PLCs in database wow wow');
							module.exports.DB_INTERFACE.addKaraToPlaylist(plcList)
								.then(function(){
									logger.debug('[PLC] copyKaraToPlaylist : updating playlist info');
									var pUpdateLastEditTime = new Promise((resolve,reject) => {
										module.exports.updatePlaylistLastEditTime(playlist_id)
											.then(function(){
												resolve();
											})
											.catch(function(err){
												logger.error('[PLC] updatePlaylistLastEditTime : '+err);
												reject(err);
											});
									});
									var pUpdatedDuration = new Promise((resolve,reject) => {
										module.exports.updatePlaylistDuration(playlist_id)
											.then(function(){
												resolve();
											})
											.catch(function(err){
												logger.error('[PLC] updatePlaylistDuration : '+err);
												reject(err);
											});
									});
									var pUpdatedKarasCount = new Promise((resolve,reject) => {
										module.exports.updatePlaylistNumOfKaras(playlist_id)
											.then(function(){
												resolve();
											})
											.catch(function(err){
												logger.error('[PLC] updatePlaylistNumOfKaras : '+err);
												reject(err);
											});
									});										
									Promise.all([pUpdateLastEditTime,pUpdatedDuration,pUpdatedKarasCount])
										.then(function() {
											resolve();
										})
										.catch(function(err) {
											logger.error('[PLC] copyKaraToPlaylist : '+err);
											reject(err);
										});
								})
								.catch(function(err) {
									logger.error('[PLC] copyKaraToPlaylist : '+err);
									reject(err);
								});

						})
						.catch(function(err) {
							logger.error('[PLC] copyKaraToPlaylist : '+err);
							reject(err);
						});					
				})
				.catch(function(err) {
					logger.error('[PLC] copyKaraToPlaylist : '+err);
					reject(err);
				});

		});



	},
	/**
	* @function {Remove karaoke from playlist}
	* @param  {number} playlistcontent_id     {IDs of karaoke to remove}
	* @param  {number} playlist_id {ID of playlist karas will be removed from}
	* @return {boolean} {Promise}
	*/
	deleteKaraFromPlaylist:function(playlistcontent_id,playlist_id) {
		return new Promise(function(resolve,reject){			
			var karaList = [];
			playlistcontent_id.forEach(function(plc_id){
				karaList.push({
					plc_id: plc_id					
				});				
			});
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			var pGetPLContentInfo = new Promise((resolve,reject) => {
				async.eachOf(karaList,function(plc,index,callback) {				
					module.exports.DB_INTERFACE.getPLContentInfo(plc.plc_id)
						.then(function(plcFromDB) {							
							if (plcFromDB) {
								karaList[index].kara_id = plcFromDB.kara_id;
								karaList[index].subFile = plcFromDB.generated_subfile;
								callback();
							} else {
								callback('[PLC] GetPLContentInfo : PLCID '+plc.plc_id+' unknown');								
							}
						})
						.catch(function(err) {						
							logger.error('[PLC] GetPLContentInfo : '+err);
							callback(err);
						});
				},function(err){
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});
			Promise.all([pGetPLContentInfo,pIsPlaylist])
				.then(function() {
					// Removing karaoke here.
					module.exports.DB_INTERFACE.removeKaraFromPlaylist(playlistcontent_id)
						.then(function(){
							var pUpdatedDuration = new Promise((resolve,reject) => {
								module.exports.updatePlaylistDuration(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										logger.error('[PLC] updatePlaylistDuration : '+err);
										reject(err);
									});
							});
							var pUpdatedKarasCount = new Promise((resolve,reject) => {
								module.exports.updatePlaylistNumOfKaras(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										logger.error('[PLC] updatePlaylistNumOfKaras : '+err);
										reject(err);
									});
							});
							var pUpdateLastEditTime = new Promise((resolve,reject) => {
								module.exports.updatePlaylistLastEditTime(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										logger.error('[PLC] updatePlaylistLastEditTime : '+err);
										reject(err);
									});
							});
							var pReorderPlaylist = new Promise((resolve,reject) => {
								module.exports.reorderPlaylist(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										logger.error('[PLC] reorderPlaylist : '+err);
										reject(err);
									});
							});
							Promise.all([pUpdateLastEditTime,pReorderPlaylist,pUpdatedDuration,pUpdatedKarasCount])
								.then(function() {									
									// We return the playlist id so we can send a message update
									resolve(playlist_id);
								})
								.catch(function(err) {
									logger.error('[PLC] deleteKaraFromPlaylist : '+err);
									reject(err);
								});
						})
						.catch(function(err){
							logger.error('[PLC] deleteKaraFromPlaylist : '+err);
							reject(err);
						});
					
				})
				.catch(function(err) {
					logger.error('[PLC] DeleteKaraFromPlaylist : '+err);
					reject(err);
				});

		});



	},	
	/**
	* @function {Update karaoke from playlist}
	* @param  {number} playlistcontent_id     {ID of karaoke to remove}
	* @param  {number} pos {New position of karaoke, optional}
	* @param  {boolean} flag_playing {Is the karaoke currently the playing one?}
	* @return {boolean} {Promise}
	*/
	editKaraFromPlaylist:function(playlistcontent_id,pos,flag_playing) {
		return new Promise(function(resolve,reject){			
			var playlist_id = undefined;
			
			var pIsPLCEmpty = new Promise((resolve,reject) => {
				if (L.isEmpty(playlistcontent_id)) {
					var err = 'PLCID empty';
					logger.error('[PLC] editKaraFromPlaylist : '+err);
					reject(err);
				} else {
					resolve();
				}
			});
			var pIsFlagPlayingUnset = new Promise((resolve,reject) => {
				if (flag_playing == 0) {
					var err = 'flag_playing cannot be unset! Set it to another karaoke to unset it on this one';
					logger.error('[PLC] editKaraFromPlaylist : '+err);
					reject(err);
				} else {
					resolve();
				}
			});
			var pGetPLContentInfo = new Promise((resolve,reject) => {
				module.exports.DB_INTERFACE.getPLContentInfo(playlistcontent_id)
					.then(function(kara) {
						if (kara) {
							playlist_id = kara.playlist_id;
							resolve();
						} else {
							var err = 'PLCID unknown!';
							logger.error('[PLC] editKaraFromPlaylist : '+err);
							reject(err);
						}						
					})
					.catch(function(err) {
						logger.error('[PLC] GetPLContentInfo : '+err);
						reject(err);
					});
			});
			Promise.all([pGetPLContentInfo,pIsPLCEmpty,pIsFlagPlayingUnset])
				.then(function() {
					// Updating karaoke here.
					var pUpdatePlaying = new Promise((resolve,reject) => {
						if (flag_playing) {
							module.exports.setPlaying(playlistcontent_id,playlist_id)
								.then(function(){
									module.exports.isCurrentPlaylist(playlist_id)
										.then(function(res){
											if (res == true) {
												module.exports.onPlayingUpdated()
													.then(function(){
														resolve();
													})
													.catch(function(err){
														logger.error('[PLC] onPlayingUpdated : '+err);
														reject(err);
													});
											} else {
												resolve();
											}											
										})
										.catch(function(err){
											logger.error('[PLC] isCurrentPlaylist : '+err);
											reject(err);
										});
								})
								.catch(function(err){
									logger.error('[PLC] DBI setPlaying : '+err);
									reject(err);
								});
						} else {
							resolve();
						}
					});
					var pUpdatePos = new Promise((resolve,reject) => {
						if (pos) {
							module.exports.raisePosInPlaylist(pos,playlist_id)
								.then(function(){									
									module.exports.DB_INTERFACE.setPos(playlistcontent_id,pos)
										.then(function(){									
											resolve();
										})
										.catch(function(err){
											logger.error('[PLC] DBI pUpdatePos : '+err);
											reject(err);
										});
								})
								.catch(function(err){
									logger.error('[PLC] raisePosInPlaylist : '+err);
									reject(err);
								});
						} else {
							resolve();
						}
					});
					Promise.all([pUpdatePos,pUpdatePlaying])
						.then(function(){							
							var pReorderPlaylist = new Promise((resolve,reject) => {
								if (pos) {
									module.exports.reorderPlaylist(playlist_id)
										.then(function(){
											resolve();
										})
										.catch(function(err){
											logger.error('[PLC] reorderPlaylist : '+err);
											reject(err);
										});
								} else {
									resolve();
								}
							});
							var pUpdateLastEditTime = new Promise((resolve,reject) => {
								module.exports.updatePlaylistLastEditTime(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										logger.error('[PLC] updatePlaylistLastEditTime : '+err);
										reject(err);
									});
							});
							Promise.all([pUpdateLastEditTime,pReorderPlaylist])
								.then(function() {
									// Return the playlist_id we modified so we can send a update message									
									resolve(playlist_id);
								})
								.catch(function(err) {
									logger.error('[PLC] editKaraFromPlaylist : '+err);
									reject(err);
								});
						})
						.catch(function(err) {
							logger.error('[PLC] editKaraFromPlaylist : '+err);
							reject(err);
						});
				})
				.catch(function(err) {
					logger.error('[PLC] editKaraFromPlaylist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Remove karaoke from whitelist}
	* @param  {number} wlc_id     {ID of karaoke to remove}
	* @return {boolean} {Promise}
	*/
	deleteKaraFromWhitelist:function(wlc_id) {
		return new Promise(function(resolve,reject){
			if (L.isEmpty(wlc_id)) {
				var err = 'WLCID empty';
				logger.error('[PLC] deleteKaraFromWhitelist : '+err);
				reject(err);
			}
			// Removing karaoke here.
			module.exports.DB_INTERFACE.removeKaraFromWhitelist(wlc_id)
				.then(function(){
					module.exports.generateBlacklist()
						.then(function(){
							resolve();
						})
						.catch(function(err){
							logger.error('[PLC] generateBlacklist : '+err);
							reject(err);							
						});
				})
				.catch(function(err){
					logger.error('[PLC] DBI removeKaraFromWhitelist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Raises position of kara in a playlist}
	* @param  {number} playlist_id     {ID of playlist to modify order of}
	* @param  {number} order           {Order to raise}
	* @return {boolean} {Promise}
	* This utility function raises the position of a song in a playlist by 0.1
	* This allows the reorderPlaylist function, called immediately after, to
	* reorder the new playlist correctly.
	*/
	raisePosInPlaylist:function(pos,playlist_id) {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.raisePosInPlaylist(pos,playlist_id)
				.then(function() {
					resolve();
				})
				.catch(function(err) {
					logger.error('[PLC] DBI raisePosInPlaylist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {reorders a playlist by updating karaoke positions}
	* @param  {number} playlist_id {ID of playlist to sort}
	* @return {array} {Playlist array of karaoke objects.}
	*/
	reorderPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						module.exports.emitEvent('playlistContentsUpdated',playlist_id);
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					module.exports.getPlaylistContents(playlist_id)
						.then(function(playlist){
							playlist.sort(function(a,b){
								return a.pos - b.pos;
							});
							var newpos = 0;
							var arraypos = 0;
							playlist.forEach(function(){
								newpos++;
								playlist[arraypos].pos = newpos;
								arraypos++;
							});

							module.exports.DB_INTERFACE.reorderPlaylist(playlist_id,playlist)
								.then(function() {
									resolve(playlist);
								})
								.catch(function(err) {
									logger.error('[PLC] DBI reorderPlaylist : '+err);
									reject(err);
								});
						})
						.catch(function(err){
							logger.error('[PLC] getPlaylistContents : '+err);
							reject(err);
						});
				})
				.catch(function(err) {
					logger.error('[PLC] reorderPlaylist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {export a playlist}
	* @param  {number} playlist_id {ID of playlist to sort}
	* @return {array} {Playlist array of karaoke objects.}
	*/
	exportPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					var PLContents;
					var PLInfo;
					var pGetPLContents = new Promise((resolve,reject) => {
						module.exports.getPlaylistContents(playlist_id)
							.then(function(playlist){
								PLContents = playlist;
								resolve();
							})
							.catch(function(err){
								logger.error('[PLC] getPlaylistContents : '+err);
								reject(err);
							});
					});	
					var pGetPLInfo = new Promise((resolve,reject) => {
						module.exports.getPlaylistInfo(playlist_id)
							.then(function(playlist) {
								PLInfo = playlist;
								resolve();
							})
							.catch(function(err){
								logger.error('[PLC] DBI getPlaylistInfo : '+err);					
								reject(err);
							});
					});
					Promise.all([pGetPLContents,pGetPLInfo])
						.then(function(){
							var playlist = {};
							PLInfo.playlist_id = undefined;
							PLInfo.num_karas = undefined;
							PLInfo.flag_current = undefined;
							PLInfo.flag_public = undefined;
							PLInfo.length = undefined;							

							var PLCFiltered = [];
							PLContents.forEach(function(plc){
								var PLCObject = {};
								PLCObject.kid = plc.kid;
								PLCFiltered.push(PLCObject);
							});

							playlist.Header = {
								version: 1,
								description: 'Karaoke Mugen Playlist File',
							};

							playlist.PlaylistInformation = PLInfo;
							playlist.PlaylistContents = PLCFiltered;
							
							resolve(playlist);
						})
						.catch(function(err){
							logger.error('[PLC] exportPlaylist : '+err);					
							reject(err);
						});
				})
				.catch(function(err) {
					logger.error('[PLC] exportPlaylist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Import a playlist}
	* @param  {object} playlist {Playlist object}
	* @return {number} {Playlist ID newly created}
	*/
	importPlaylist:function(playlist) {
		return new Promise(function(resolve,reject){
			// Check if format is valid :
			// Header must contain :
			// description = Karaoke Mugen Playlist File
			// version = 1
			// 
			// PlaylistContents array must contain at least one element.
			// That element needs to have at least kid and pos.
			// pos must be integer
			// kid must be uuid
			// Test each element for those.
			//
			// PlaylistInformation must contain :
			// - created_at : (number)
			// - flag_visible : (0 / 1)
			// - modified_at : (number)
			// - name : playlist name
			//
			// If all tests pass, then add playlist, then add karas
			// Playlist can end up empty if no karaokes are found in database			
			var err;
			if (playlist.Header.description !== 'Karaoke Mugen Playlist File') err = 'Not a .kmplaylist file';
			// This test will change if we make several versions of the .kmplaylist format
			if (playlist.Header.version !== 1) err = 'Cannot import this version ('+playlist.Header.version+')';

			if (playlist.PlaylistContents === undefined) err = 'No PlaylistContents section';
			playlist.PlaylistContents.forEach(function(kara){				
				if (!validator.isUUID(kara.kid)) err = 'KID is not a valid UUID!';
			});

			if (isNaN(playlist.PlaylistInformation.created_at)) err = 'Creation time is not valid';
			if (isNaN(playlist.PlaylistInformation.modified_at)) err = 'Modification time is not valid';
			if (playlist.PlaylistInformation.flag_visible !== 0 && 
				playlist.PlaylistInformation.flag_visible !== 1) err = 'Visible flag must be boolean';
			if (L.isEmpty(playlist.PlaylistInformation.name)) err = 'Playlist name must not be empty';

			// Validations done. First creating playlist.
			if (err) {
				reject(err);
			} else {
				module.exports.createPlaylist(playlist.PlaylistInformation.name,playlist.PlaylistInformation.flag_visible,0,0)
					.then(function(playlist_id){
						var karasToImport = [];
						var karasUnknown = [];
						async.eachSeries(playlist.PlaylistContents,function(kara,callback){
							module.exports.getKaraByKID(kara.kid)
								.then(function(karaFromDB) {
									if (karaFromDB) {
										karasToImport.push(karaFromDB.kara_id);
										callback();
									} else {
										logger.warn('[PLC] importPlaylist : KID '+kara.kid+' unknown');
										karasUnknown.push(kara.kid);
										callback();
									}
								})
								.catch(function(err) {
									logger.error('[PLC] getKaraByKID : '+err);
									callback(err);
								});
						}, function(err) {
							if (err) {
								reject(err);
							} else {																
								module.exports.addKaraToPlaylist(karasToImport,'Admin',playlist_id)
									.then(function(){
										resolve(karasUnknown);
									});
							}
						});
					})
					.catch(function(err){
						logger.error('[PLC] importPlaylist : '+err);
						reject(err);
					});

			}
			
		});
	},
	/**
	* @function {Translate Kara Information}
	* @param  {array} karalist {list of kara objects}
	* @param  {string} lang     {language in ISO639-1 to translate into}
	* @return {array} {Returns array of kara objects}
	*/
	translateKaraInfo:function(karalist,lang){
		return new Promise(function(resolve,reject) {

			// If lang is not provided, assume we're using node's system locale
			if (!lang) lang = module.exports.SETTINGS.EngineDefaultLocale;
			// Test if lang actually exists in ISO639-1 format
			if (!langs.has('1',lang)) {
				var err = 'Unknown language : '+lang;
				logger.error('[PLC] translateKaraInfo : '+err);
				reject(err);
			}
			// Instanciate a translation object for our needs with the correct language.
			const i18n = require('i18n'); // Needed for its own translation instance
			i18n.configure({
				directory: path.resolve(__dirname,'../../_common/locales'),
			});
			i18n.setLocale(lang);

			// We need to read the detected locale in ISO639-1
			var detectedLocale = langs.where('1',lang);

			// If the kara list provided is not an array (only a single karaoke)
			// Put it into an array first
			var karas;
			if (karalist.constructor != Array) {
				karas = [];
				karas[0] = karalist;
			} else {
				karas = karalist;
			}

			karas.forEach(function(kara,index) {
				karas[index].songtype_i18n = i18n.__(kara.songtype);
				karas[index].songtype_i18n_short = i18n.__(kara.songtype+'_SHORT');

				if (kara.language != null) {
					var karalangs = kara.language.split(',');
					var languages = [];
					karalangs.forEach(function(karalang){
						// Special case : und
						// Undefined language
						// In this case we return something different.
						if (karalang === 'und') {
							languages.push(i18n.__('UNDEFINED_LANGUAGE'));
						} else {
							// We need to convert ISO639-2B to ISO639-1 to get its language
							var langdata = langs.where('2B',karalang);
							if (langdata === undefined) {
								languages.push(__('UNKNOWN_LANGUAGE'));
							} else {
								languages.push(isoCountriesLanguages.getLanguage(detectedLocale[1],langdata[1]));
							}

						}
					});
					karas[index].language_i18n = languages.join();
				}
				// Let's do the same with tags, without language stuff
				if (kara.misc != null) {
					var tags = [];
					var karatags = kara.misc.split(',');
					karatags.forEach(function(karatag){
						tags.push(i18n.__(karatag));
					});
					karas[index].misc_i18n = tags.join();
				} else {
					karas[index].misc_i18n = null;
				}
			});
			resolve(karas);
		});
	},
	/**
	* @function {Translate Blacklist criterias information in human form}
	* @param  {array} blc {list of BLC objects}
	* @param  {string} lang     {language in ISO639-1 to translate into}
	* @return {array} {Returns array of BLC objects}
	*/
	translateBlacklistCriterias:function(blclist,lang){
		return new Promise(function(resolve,reject) {

			// If lang is not provided, assume we're using node's system locale
			if (!lang) lang = module.exports.SETTINGS.EngineDefaultLocale;
			// Test if lang actually exists in ISO639-1 format
			if (!langs.has('1',lang)) {
				var err = 'Unknown language : '+lang;
				logger.error('[PLC] translateKaraInfo : '+err);
				reject(err);
			}
			// Instanciate a translation object for our needs with the correct language.
			const i18n = require('i18n'); // Needed for its own translation instance
			i18n.configure({
				directory: path.resolve(__dirname,'../../_common/locales'),
			});
			i18n.setLocale(lang);

			// We need to read the detected locale in ISO639-1
			
			async.eachOf(blclist, function(blc, index, callback){
				var pTagName = new Promise((resolve) => {
					if (blc.type === 1){
						// We just need to translate the tag name if there is a translation
						if (blc.value.startsWith('TAG_')) {
							blclist[index].value_i18n = i18n.__(blc.value);
						} else {
							blclist[index].value_i18n = blc.value;
						}
						resolve();
					} else {
						resolve();
					}
					
				});
				var pTagID = new Promise((resolve,reject) => {
					if (blc.type >= 2 && blc.type <= 999) {
						// We need to get the tag name and then translate it if needed
						module.exports.DB_INTERFACE.getTag(blc.value)
							.then(function (res){								
								if (res.startsWith('TAG_')) {
									blclist[index].value_i18n = i18n.__(res);
								} else {
									blclist[index].value_i18n = res;
								}							
								resolve();
							})	
							.catch(function (err) {
								logger.error('[PLC] translateBlacklistCriterias : '+err);
								reject(err);
							});					
					} else {
						resolve();
					}
				});
				var pTagKaraID = new Promise((resolve,reject) => {
					if (blc.type === 1001) {
						// We have a kara ID, let's get the kara itself and append it to the value
						module.exports.DB_INTERFACE.getKara(blc.value)
							.then(function(kara){
								module.exports.translateKaraInfo(kara,lang)
									.then(function (karaTranslated){
										blclist[index].value = karaTranslated;
										resolve();
									})
									.catch(function (err){
										logger.error('[PLC] translateBlacklistCriterias : translateKaraInfo : '+err);
										reject(err);
									});						
							})
							.catch(function(err){
								logger.error('[PLC] translateBlacklistCriterias : '+err);
								reject(err);
							});
					} else {
						resolve();
					}
				});
				Promise.all([pTagKaraID,pTagName,pTagID])
					.then(function(){
						// No need to do anything, values have been modified if necessary						
						callback();
					})
					.catch(function(err){
						logger.error('[PLC] translateBlacklistCriterias : '+err);
						callback(err);
					});
			},function(err){
				if (err) {
					reject(err);
				}				
				resolve(blclist);
			});			
		});
	},
	/**
	* @function {Translate tag list in human form}
	* @param  {array} blc {list of tags objects}
	* @param  {string} lang     {language in ISO639-1 to translate into}
	* @return {array} {Returns array of tags}
	*/
	translateTags:function(taglist,lang){
		return new Promise(function(resolve,reject) {

			// If lang is not provided, assume we're using node's system locale
			if (!lang) lang = module.exports.SETTINGS.EngineDefaultLocale;
			// Test if lang actually exists in ISO639-1 format
			if (!langs.has('1',lang)) {
				var err = 'Unknown language : '+lang;
				logger.error('[PLC] translateKaraInfo : '+err);
				reject(err);
			}
			// Instanciate a translation object for our needs with the correct language.
			const i18n = require('i18n'); // Needed for its own translation instance
			i18n.configure({
				directory: path.resolve(__dirname,'../../_common/locales'),
			});
			i18n.setLocale(lang);

			// We need to read the detected locale in ISO639-1
			
			taglist.forEach(function(tag, index){
				if (tag.type >= 2 && tag.type <= 999) {
					if (tag.name.startsWith('TAG_') || tag.name.startsWith('TYPE_')) {
						taglist[index].name_i18n = i18n.__(tag.name);
					} else {
						taglist[index].name_i18n = tag.name;
					}							
				}
			});
			resolve(taglist);			
		});
	},
	/**
	* @function {Shuffles playlist}
	* @param  {number} playlist_id {ID of playlist to shuffle}
	* @return {array} {Playlist array of karaoke objects.}
	*/
	shufflePlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			// We check if the playlist to shuffle is the current one. If it is, we will only shuffle
			// the part after the song currently being played.
			var IsCurrent = undefined;
			var pIsCurrent = new Promise((resolve,reject) => {
				module.exports.isCurrentPlaylist(playlist_id)
					.then(function(res){
						if (res == true) {
							IsCurrent = true;
						} else {
							IsCurrent = false;
						}
						resolve();
					})
					.catch(function(err){
						logger.error('[PLC] isCurrentPlaylist : '+err);
						reject(err);
					});
			});
			Promise.all([pIsPlaylist,pIsCurrent])
				.then(function() {
					module.exports.getPlaylistContents(playlist_id)
						.then(function(playlist){
							if (IsCurrent === false) {
								playlist = L.shuffle(playlist);
							} else {
								// If it's current playlist, we'll make two arrays out of the playlist :
								// One before (and including) the current song being played (flag_playing = 1)
								// One after.
								// We'll shuffle the one after then concatenate the two arrays.
								var BeforePlaying = [];
								var AfterPlaying = [];
								var ReachedPlaying = false;
								playlist.forEach(function(kara){
									if (ReachedPlaying == false) {
										BeforePlaying.push(kara);
										if (kara.flag_playing == 1) {
											ReachedPlaying = true;
										}
									} else {
										AfterPlaying.push(kara);
									}
								});
								AfterPlaying = L.shuffle(AfterPlaying);
								playlist = BeforePlaying.concat(AfterPlaying);
								// If no flag_playing has been set, the current playlist won't be shuffled. To fix this, we shuffle the entire playlist if no flag_playing has been met
								if (ReachedPlaying == false) {
									playlist = L.shuffle(playlist);
								}
							}
							var newpos = 0;
							var arraypos = 0;
							playlist.forEach(function(){
								newpos++;
								playlist[arraypos].pos = newpos;
								arraypos++;
							});
							var pUpdateLastEditTime = new Promise((resolve,reject) => {
								module.exports.updatePlaylistLastEditTime(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										logger.error('[PLC] updatePlaylistLastEditTime : '+err);
										reject(err);
									});
							});
							var pReorderPlaylist = new Promise((resolve,reject) => {
								module.exports.DB_INTERFACE.reorderPlaylist(playlist_id,playlist)
									.then(function() {
										resolve();
									})
									.catch(function(err) {
										logger.error('[PLC] reorderPlaylist : '+err);
										reject(err);
									});
							});
							Promise.all([pReorderPlaylist,pUpdateLastEditTime])
								.then(function() {
									resolve();
								})
								.catch(function(err) {
									logger.error('[PLC] shufflePlaylist : '+err);
									reject(err);
								});
						})
						.catch(function(err){
							logger.error('[PLC] getPlaylistContents : '+err);
							reject(err);
						});
				})
				.catch(function(err) {
					logger.error('[PLC] shufflePlaylist : '+err);
					reject(err);
				});
		});
	},
	
	// ---------------------------------------------------------------------------
	// Methodes rapides de gestion de la playlist courante
	// prev / next / get_current
	// ---------------------------------------------------------------------------

	prev:function(){
		return new Promise(function(resolve,reject){
			module.exports.isACurrentPlaylist().then(function(playlist_id){
				module.exports.getPlaylistContents(playlist_id,false,true).then(function(pl_content){
					if(pl_content.length==0) {
						logger.warn('[PLC] prev : pl_content is empty!');
						reject('Playlist is empty!');
					} else {
						var readpos = 0;
						pl_content.forEach(function(element, index) {
							if(element.flag_playing) {
								readpos = index-1;
							}
						});
						// Beginning of playlist
						if(readpos<0) {
							logger.warn('[PLC] prev : current position is first song!');
							reject('Current position is first song!');
						}

						var kara = pl_content[readpos];
						if(kara) {
							// mise à jour du pointeur de lecture
							module.exports.setPlaying(kara.playlistcontent_id,playlist_id)
								.then(function(){
									resolve();
								})
								.catch(function(err){
									reject(err);
								});	
						} else {
							var err = 'Received an empty karaoke!';
							logger.error('[PLC] prev : '+err);
							reject(err);
						}						
					}
				});
			})
				.catch(function(err){
					logger.error('[PLC] isACurrentPlaylist');
					reject(err);
				});
		});
	},
	next:function(){
		return new Promise(function(resolve,reject){
			module.exports.isACurrentPlaylist().then(function(playlist_id){
				module.exports.getPlaylistContents(playlist_id,false,true).then(function(pl_content){
					if(pl_content.length==0) {
						logger.error('[PLC] prev : pl_content is empty!');
						reject('Playlist is empty!');
					} else {
						var readpos = 0;
						pl_content.forEach(function(element, index) {
							if(element.flag_playing)
								readpos = index+1;
						});
						// on est la fin de la playlist
						if(readpos >= pl_content.length) {
							logger.info('[PLC] next : current position is last song');
							// Unset flag_playing on all karas from the playlist
							module.exports.setPlaying(null,playlist_id)
								.then(function(){
									reject('Current position is last song!');										
								})
								.catch(function(err){
									reject(err);
								});
						} else {
							var kara = pl_content[readpos];
							if(kara) {
								// mise à jour du pointeur de lecture
								module.exports.setPlaying(kara.playlistcontent_id,playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										reject(err);
									});								
							} else {
								var err = 'Received an empty karaoke!';
								logger.error('[PLC] next : '+err);
								reject(err);
							}						
						}
					}
				});
			})
				.catch(function(err){
					logger.error('[PLC] isACurrentPlaylist');
					reject(err);
				});
		});
	},
	current_playlist:function(){
		return new Promise(function(resolve,reject){
			module.exports.isACurrentPlaylist()
				.then(function(playlist_id){
					module.exports.getPlaylistContents(playlist_id,false,true)
						.then(function(pl_content){												
							// Setting readpos to 0. If no flag_playing is found in current playlist
							// Then karaoke will begin at the first element of the playlist (0)
							var readpos = 0;
							pl_content.forEach(function(element, index) {
								if(element.flag_playing)
									readpos = index;
							});							
							resolve({'id':playlist_id,content:pl_content,index:readpos});
						})
						.catch(function(err){
							logger.error('[PLC] getPlaylistContents : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] isACurrentPlaylist');
					reject(err);
				});
		});
	},
	current:function(){
		// TODO : renommer en get_current_kara
		return new Promise(function(resolve,reject){
			logger.profile('GetPlaylist');									
			module.exports.current_playlist()
				.then(function(playlist){
					logger.profile('GetPlaylist');					
					var readpos = false;
					playlist.content.forEach(function(element, index) {
						if(element.flag_playing)
							readpos = index;
					});

					var update_playing_kara = false;
					if(readpos===false) {
						readpos = 0;
						update_playing_kara = true;
					}

					var kara = playlist.content[readpos];
					if(kara) {						
						// si il n'y avait pas de morceau en lecture on marque le premier de la playlist
						if(update_playing_kara) {
							// mise à jour du pointeur de lecture
							module.exports.setPlaying(kara.playlistcontent_id,playlist.id)
								.then(function(){
									resolve();
								})
								.catch(function(err){
									reject(err);
								});	
						}

						// on enrichie l'objet pour fournir son contexte et les chemins système prêt à l'emploi
						kara.playlist_id = playlist.id;
						logger.profile('GetASS');						
						module.exports.getASS(kara.kara_id)
							.then(function(ass){
								logger.profile('GetASS');								
								var requester;
								if (module.exports.SETTINGS.EngineDisplayNickname){
									if (!kara.pseudo_add === 'Administrateur') {
										requester = __('REQUESTED_BY')+' '+kara.pseudo_add;
									} else {
										requester = '';
									}									
								} else {									
									requester = '';
								}
								if (!L.isEmpty(kara.title)) {
									kara.title = ' - '+kara.title;
								}
								var series = kara.serie;
								if (L.isEmpty(kara.serie)) {
									series = kara.singer; 
								}
								if (kara.songorder === 0) {
									kara.songorder = '';
								}
								kara.infos = '{\\bord0.7}{\\fscx70}{\\fscy70}{\\b1}'+series+'{\\b0}\\N{\\i1}'+__(kara.songtype+'_SHORT')+kara.songorder+kara.title+'{\\i0}\\N{\\fscx50}{\\fscy50}'+requester;								
								kara.path = {
									video: path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathVideos, kara.videofile),
									subtitle: ass,									
								};													
								resolve(kara);
									
							})
							.catch(function(err){
								logger.error('[PLC] getASS : '+err);
								reject(err);
							});						
					} else { 	
						var err = 'No karaoke found in playlist object';
						logger.error('[PLC] current : '+err);						
						reject(err);
					}
				})
				.catch(function(err){
					logger.error('[PLC] current_playlist : '+err);
					reject(err);
				});
		});
	},

	build_dummy_current_playlist:function(playlist_id){
		logger.info('[PLC] Dummy Plug : Adding some karaokes to the current playlist...');
		return new Promise(function(resolve,reject){
			logger.info('[PLC] Dummy Plug : Adding 5 karas into current playlist');			
			module.exports.addKaraToPlaylist(
				[1,2,3,4,5],
				'Dummy user',
				playlist_id
			)
				.then(function(){
					resolve();
				})
				.catch(function(message){
					logger.error('[PLC] Dummy Plug : '+message);
					reject(message);
				});			
		});
	},

	// ---------------------------------------------------------------------------
	// Evenements à référencer par le composant  parent
	// ---------------------------------------------------------------------------

	emitEvent:function(){},
	onPlaylistUpdated:function(){
		// événement émis pour quitter l'application
		logger.error('_engine/components/playlist_controller.js :: onPlaylistUpdated not set');
	},
	onPlayingUpdated:function(){
		// event when the playing flag is changed in the current playlist
	}
};