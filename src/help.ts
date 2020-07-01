export const help = `Usage :

karaokemugen [options]

Options :
--help                          Displays this message
--version                       Displays version info
--cli                           Do not open the GUI
--debug                         Displays additional debug messages
--sql                           Traces SQL query at the debug log level
--generate                      Generates a new database then quits
--validate                      Validates kara files and modify them if needed (no generation)
--strict                        Generation/validation only. Strict mode, returns an error if kara files had to be modified.
--profiling                     Displays profiling information for some functions
--test                          Launches in test mode (for running unit tests)
--reset                         Reset user data (WARNING! Backup your base first!)
--demo                          Launches in demo mode (no system panel, no password changes)
--config <file>                 Specify a config file to use (default is config.yml)
--updateBase                    Update karaoke base files
--updateMedias                  Update karaoke media files only (no other data files)
--noBaseCheck                   Disable data file checking on startup
--noBrowser                     Do not open a browser window upon launch
--noMedia                       (generation only) Do not try to fetch data from media files
--noPlayer                      Do not open player on startup
--forceAdminPassword <password> Set admin account's password
`;
