export class CSVError {
    constructor(public code: string, public message: string, public index: number, public line: number, public column: number) {
    }
}
