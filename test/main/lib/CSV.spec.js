"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const davinci_csv_1 = require("../../.././build/main/index.js");
describe("parse", function () {
    it("basic", function () {
        const csv1 = '"Jones, Jay",10\n' +
            '"Xyz ""ABC"" O\'Brien",11:35\n' +
            '"Other, AN",12:35\n';
        const exp = [
            ['Jones, Jay', 10],
            ['Xyz "ABC" O\'Brien', '11:35'],
            ['Other, AN', '12:35']
        ];
        expect(davinci_csv_1.parse(csv1)).toEqual(exp);
        const csv2 = '"Jones, Jay", 10\n' +
            '"Xyz ""ABC"" O\'Brien", 11:35\n' +
            '"Other, AN", 12:35\n';
        const array = davinci_csv_1.parse(csv2, { trimFields: true });
        expect(array).toEqual(exp);
    });
    it("semicolon", function () {
        const csv = '"Jones; Jay";10\n' +
            '"Xyz ""ABC"" O\'Brien";11:35\n' +
            '"Other; AN";12:35\n';
        const array = davinci_csv_1.parse(csv, { fieldDelimiter: ';' });
        const exp = [
            ['Jones; Jay', 10],
            ['Xyz "ABC" O\'Brien', '11:35'],
            ['Other; AN', '12:35']
        ];
        expect(array).toEqual(exp);
    });
    it("quotechar", function () {
        const csv = "'Jones, Jay',10\n" +
            "'Xyz \"ABC\" O''Brien',11:35\n" +
            "'Other; AN',12:35\n";
        const array = davinci_csv_1.parse(csv, { quoteChar: "'" });
        const exp = [
            ["Jones, Jay", 10],
            ["Xyz \"ABC\" O'Brien", "11:35"],
            ["Other; AN", "12:35"]
        ];
        expect(array).toEqual(exp);
    });
    it("skipInitialRows", function () {
        const csv = '"Jones, Jay",10\n' +
            '"Xyz ""ABC"" O\'Brien",11:35\n' +
            '"Other, AN",12:35\n';
        const array = davinci_csv_1.parse(csv, { skipInitialRows: 1 });
        const exp = [
            ['Xyz "ABC" O\'Brien', '11:35'],
            ['Other, AN', '12:35']
        ];
        expect(array).toEqual(exp);
    });
    it("trimFields", function () {
        const csv1 = '"Jones, Jay",10\n' +
            '"Xyz ""ABC"" O\'Brien",11:35\n' +
            '"Other, AN",12:35\n';
        const exp = [
            ['Jones, Jay', 10],
            ['Xyz "ABC" O\'Brien', '11:35'],
            ['Other, AN', '12:35']
        ];
        expect(davinci_csv_1.parse(csv1)).toEqual(exp);
        const csv2 = '"Jones, Jay", 10\n' +
            '"Xyz ""ABC"" O\'Brien", 11:35\n' +
            '"Other, AN", 12:35\n';
        const array = davinci_csv_1.parse(csv2, { trimFields: true });
        expect(array).toEqual(exp);
    });
    it("custom lineterminator", function () {
        const csv = '"Jones, Jay",10\r' +
            '"Xyz ""ABC"" O\'Brien",11:35\r' +
            '"Other, AN",12:35\r';
        const exp = [
            ['Jones, Jay', 10],
            ['Xyz "ABC" O\'Brien', '11:35'],
            ['Other, AN', '12:35']
        ];
        const settings = {
            fieldDelimiter: ',',
            lineTerminator: '\r',
        };
        const array = davinci_csv_1.parse(csv, settings);
        expect(array).toEqual(exp);
    });
    it('normalizeLineTerminator', function () {
        const exp1 = [
            ['Jones, Jay', 10],
            ['Xyz "ABC" O\'Brien', '11:35'],
            ['Other, AN', '12:35']
        ];
        // Multics, Unix and Unix-like systems (Linux, OS X, FreeBSD, AIX, Xenix, etc.), BeOS, Amiga, RISC OS, and other
        const csv1 = '"Jones, Jay",10\n' +
            '"Xyz ""ABC"" O\'Brien",11:35\n' +
            '"Other, AN",12:35\n';
        const array1 = davinci_csv_1.parse(csv1);
        expect(array1).toEqual(exp1);
        // Commodore 8-bit machines, Acorn BBC, ZX Spectrum, TRS-80, Apple II family, Oberon, Mac OS up to version 9, and OS-9
        const csv2 = '"Jones, Jay",10\r' +
            '"Xyz ""ABC"" O\'Brien",11:35\r' +
            '"Other, AN",12:35\r';
        const array2 = davinci_csv_1.parse(csv2);
        expect(array2).toEqual(exp1);
        // Microsoft Windows, DOS (MS-DOS, PC DOS, etc.),
        const csv3 = '"Jones, Jay",10\r\n' +
            '"Xyz ""ABC"" O\'Brien",11:35\r\n' +
            '"Other, AN",12:35\r\n';
        const array3 = davinci_csv_1.parse(csv3);
        expect(array3).toEqual(exp1);
        // Override line terminator
        const settings = {
            fieldDelimiter: ',',
            lineTerminator: '\r',
        };
        const csv4 = '"Jones, Jay",10\r' +
            '"Xyz ""ABC"" O\'Brien",11:35\r' +
            '"Other, AN",12:35\r';
        const array4 = davinci_csv_1.parse(csv4, settings);
        expect(array4).toEqual(exp1);
    });
    it("nested mixed terminators", function () {
        // Override line terminator
        const settings = {
            fieldDelimiter: ',',
            lineTerminator: '\r',
        };
        const exp = [
            ['Jones,\n Jay', 10],
            ['Xyz "ABC" O\'Brien', '11:35'],
            ['Other, AN', '12:35']
        ];
        const csv = '"Jones,\n Jay",10\r' +
            '"Xyz ""ABC"" O\'Brien",11:35\r' +
            '"Other, AN",12:35\r';
        const array = davinci_csv_1.parse(csv, settings);
        expect(array).toEqual(exp);
    });
    it("exponentialkarma ", function () {
        const csvText = 'mass, number\n' +
            '0.1, 1.20e-19\n' +
            '0.2, 5.29e-18\n' +
            '-0.3, -1.54e-16\n' +
            '+0.4, +3.28e-15\n';
        const data = [
            ['mass', 'number'],
            [0.1, 1.2e-19],
            [0.2, 5.29e-18],
            [-0.3, -1.54e-16],
            [0.4, 3.28e-15]
        ];
        expect(davinci_csv_1.parse(csvText)).toEqual(data);
    });
});
describe("serialize", function () {
    it("Array", function () {
        const csv = [
            ['Jones, Jay', 10],
            ['Xyz "ABC" O\'Brien', '11:35'],
            ['Other, AN', '12:35']
        ];
        const out = davinci_csv_1.serialize(csv);
        const exp = '"Jones, Jay",10\n' +
            '"Xyz ""ABC"" O\'Brien",11:35\n' +
            '"Other, AN",12:35\n';
        expect(out).toEqual(exp);
    });
    it("Data", function () {
        const data = {
            fields: [{ id: 'name' }, { id: 'number' }],
            records: [
                { name: 'Jones, Jay', number: 10 },
                { name: 'Xyz "ABC" O\'Brien', number: '11:35' },
                { name: 'Other, AN', number: '12:35' }
            ]
        };
        const array = davinci_csv_1.serialize(data);
        const exp = 'name,number\n' +
            '"Jones, Jay",10\n' +
            '"Xyz ""ABC"" O\'Brien",11:35\n' +
            '"Other, AN",12:35\n';
        expect(array).toEqual(exp);
    });
    it("dialect options", function () {
        const csv = [
            ['Jones, Jay', 10],
            ['Xyz "ABC" O\'Brien', '11:35']
        ];
        const out = davinci_csv_1.serialize(csv, { escapeEmbeddedQuotes: false });
        const exp = '"Jones, Jay",10\n' +
            '"Xyz "ABC" O\'Brien",11:35\n';
        expect(out).toEqual(exp);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ1NWLnNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL0NTVi5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEsNkNBQStDO0FBRy9DLFFBQVEsQ0FBQyxPQUFPLEVBQUU7SUFDaEIsRUFBRSxDQUFDLE9BQU8sRUFBRTtRQUNWLE1BQU0sSUFBSSxHQUFHLG1CQUFtQjtZQUM5QixnQ0FBZ0M7WUFDaEMscUJBQXFCLENBQUM7UUFFeEIsTUFBTSxHQUFHLEdBQUc7WUFDVixDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7WUFDbEIsQ0FBQyxvQkFBb0IsRUFBRSxPQUFPLENBQUM7WUFDL0IsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDO1NBQ3ZCLENBQUM7UUFDRixNQUFNLENBQUMsbUJBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVqQyxNQUFNLElBQUksR0FBRyxvQkFBb0I7WUFDL0IsaUNBQWlDO1lBQ2pDLHNCQUFzQixDQUFDO1FBQ3pCLE1BQU0sS0FBSyxHQUFHLG1CQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM3QixDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxXQUFXLEVBQUU7UUFDZCxNQUFNLEdBQUcsR0FBRyxtQkFBbUI7WUFDN0IsZ0NBQWdDO1lBQ2hDLHFCQUFxQixDQUFDO1FBRXhCLE1BQU0sS0FBSyxHQUFHLG1CQUFLLENBQUMsR0FBRyxFQUFFLEVBQUUsY0FBYyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDbEQsTUFBTSxHQUFHLEdBQUc7WUFDVixDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7WUFDbEIsQ0FBQyxvQkFBb0IsRUFBRSxPQUFPLENBQUM7WUFDL0Is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