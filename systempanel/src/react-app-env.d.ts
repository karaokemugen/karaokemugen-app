/// <reference types="react-scripts" />

export interface ReduxMappedProps {
    loadingActive: boolean
    loading: (boolean) => any,
    infoMessage: (string) => any,
    warnMessage: (string) => any,
    errorMessage: (string) => any,
}