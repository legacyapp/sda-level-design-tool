export class CloneSongRequest {
    readonly sourceId: string;

    readonly targetId: string;

    overrideData: { [key: string]: any };

    constructor(sourceId: string, targetId: string, overrideData: { [key: string]: any } = {}) {
        this.sourceId = sourceId;
        this.targetId = targetId;
        this.overrideData = overrideData;
    }
}

export interface ParentChildMessage {
    type: string;
    data?: any;
}

export interface MessageData {
    ok?: boolean;
    error?: MessageError;
    data?: any;
}

export interface MessageError {
    [key: string]: any
}
