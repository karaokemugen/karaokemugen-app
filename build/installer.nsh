LangString message 1033 "Your computer does not have the Visual C++ Redistribuable 2013 which is needed for Karaoke Mugen to run. We will install it now."
LangString message 1036 "Les fichiers Visual C++ Redistribuable 2013 ne sont pas installés sur votre ordinateur. Une fenêtre va s'ouvrir vous demandant de l'installer."
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
	${ifNot} ${isUpdated}
		ifFileExists $WINDIR\System32\msvcp120.dll +4 +1
		ifFileExists $WINDIR\System32\msvcr120.dll +3 0
			MessageBox MB_OK "$(message)"
			Exec '"${BUILD_RESOURCES_DIR}\vc.exe"'
	${endIf}
!macroend

!macro customRemoveFiles
	Delete $INSTDIR\*.*
    RMDir /r $INSTDIR\app\bin
	RMDir /r $INSTDIR\locales
	RMDir /r $INSTDIR\resources
	RMDir /r $INSTDIR\swiftshader
!macroend