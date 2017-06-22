export enum ErrorCode {
    /**
     * Unexpected apostrophe.
     */
    E001 = 1,
    /**
     * Unexpected quote.
     */
    E002 = 2,
    /**
     * Unexpected character.
     */
    E003 = 3,
    /**
     * Unexpected digit.
     */
    E004 = 4,
    /**
     * Missing closing apostrophe.
     */
    E005 = 5,
    /**
     * Missing closing quote.
     */
    E006 = 6
}

export interface CodeAndDesc {
    code: string;
    desc: string;
}

export const messages: { [code: number]: CodeAndDesc } = {};

messages[ErrorCode.E001] = { code: 'E001', desc: "Unexpected apostrophe." };
messages[ErrorCode.E002] = { code: 'E002', desc: "Unexpected quote." };
messages[ErrorCode.E003] = { code: 'E003', desc: "Unexpected character." };
messages[ErrorCode.E004] = { code: 'E004', desc: "Unexpected digit." };
messages[ErrorCode.E005] = { code: 'E005', desc: "Missing closing apostrophe." };
messages[ErrorCode.E006] = { code: 'E006', desc: "Missing closing quote." };
