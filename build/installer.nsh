LangString message 1033 "Your computer does not have the Visual C++ Redistribuable 2013 which is needed for Karaoke Mugen to run. We will install it now."
LangString message 1036 "Les fichiers Visual C++ Redistribuable 2013 ne sont pas installés sur votre ordinateur. Une fenêtre va s'ouvrir vous demandant de l'installer."

!macro customInstall
	${ifNot} ${isUpdated}
		ifFileExists $WINDIR\system32\msvcp120.dll +4 +1
		ifFileExists $WINDIR\system32\msvcr120.dll +3 0
			MessageBox MB_OK "$(message)"
			Exec '"${BUILD_RESOURCES_DIR}\vc.exe"'
	${endIf}
!macroend