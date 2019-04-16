declare namespace NodeJS {
    interface Process {
        pkg: boolean;
    }
}

declare namespace winston {
    interface ConsoleTransportOptions {
        colorize?: boolean;
    }
}
