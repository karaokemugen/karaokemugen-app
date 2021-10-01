LangString protocol 1033 "Registering km:// protocol"
LangString protocol 1036 "Enregistrement du protocole km://"

!macro customHeader
  ShowInstDetails show
  ShowUninstDetails show
!macroend

!macro customInstall
	DetailPrint {protocol}
  	DeleteRegKey HKCR "km"
  	WriteRegStr HKCR "km" "" "URL:km"
  	WriteRegStr HKCR "km" "URL Protocol" ""
  	WriteRegStr HKCR "km\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  	WriteRegStr HKCR "km\shell" "" ""
  	WriteRegStr HKCR "km\shell\Open" "" ""
  	WriteRegStr HKCR "km\shell\Open\command" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME} %1"
!macroend

!macro customRemoveFiles
	Delete $INSTDIR\*.*
    RMDir /r $INSTDIR\app\bin
	RMDir /r $INSTDIR\locales
	RMDir /r $INSTDIR\resources
	RMDir /r $INSTDIR\swiftshader
!macroend