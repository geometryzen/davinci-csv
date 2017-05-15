import { parse, serialize } from 'davinci-csv';
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
        expect(parse(csv1)).toEqual(exp);
        const csv2 = '"Jones, Jay", 10\n' +
            '"Xyz ""ABC"" O\'Brien", 11:35\n' +
            '"Other, AN", 12:35\n';
        const array = parse(csv2, { trimFields: true });
        expect(array).toEqual(exp);
    });
    it("semicolon", function () {
        const csv = '"Jones; Jay";10\n' +
            '"Xyz ""ABC"" O\'Brien";11:35\n' +
            '"Other; AN";12:35\n';
        const array = parse(csv, { fieldDelimiter: ';' });
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
        const array = parse(csv, { quoteChar: "'" });
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
        const array = parse(csv, { skipInitialRows: 1 });
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
        expect(parse(csv1)).toEqual(exp);
        const csv2 = '"Jones, Jay", 10\n' +
            '"Xyz ""ABC"" O\'Brien", 11:35\n' +
            '"Other, AN", 12:35\n';
        const array = parse(csv2, { trimFields: true });
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
        const array = parse(csv, settings);
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
        const array1 = parse(csv1);
        expect(array1).toEqual(exp1);
        // Commodore 8-bit machines, Acorn BBC, ZX Spectrum, TRS-80, Apple II family, Oberon, Mac OS up to version 9, and OS-9
        const csv2 = '"Jones, Jay",10\r' +
            '"Xyz ""ABC"" O\'Brien",11:35\r' +
            '"Other, AN",12:35\r';
        const array2 = parse(csv2);
        expect(array2).toEqual(exp1);
        // Microsoft Windows, DOS (MS-DOS, PC DOS, etc.),
        const csv3 = '"Jones, Jay",10\r\n' +
            '"Xyz ""ABC"" O\'Brien",11:35\r\n' +
            '"Other, AN",12:35\r\n';
        const array3 = parse(csv3);
        expect(array3).toEqual(exp1);
        // Override line terminator
        const settings = {
            fieldDelimiter: ',',
            lineTerminator: '\r',
        };
        const csv4 = '"Jones, Jay",10\r' +
            '"Xyz ""ABC"" O\'Brien",11:35\r' +
            '"Other, AN",12:35\r';
        const array4 = parse(csv4, settings);
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
        const array = parse(csv, settings);
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
        expect(parse(csvText)).toEqual(data);
    });
});
describe("serialize", function () {
    it("Array", function () {
        const csv = [
            ['Jones, Jay', 10],
            ['Xyz "ABC" O\'Brien', '11:35'],
            ['Other, AN', '12:35']
        ];
        const out = serialize(csv);
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
        const array = serialize(data);
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
        const out = serialize(csv, { escapeEmbeddedQuotes: false });
        const exp = '"Jones, Jay",10\n' +
            '"Xyz "ABC" O\'Brien",11:35\n';
        expect(out).toEqual(exp);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ1NWLnNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL0NTVi5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRy9DLFFBQVEsQ0FBQyxPQUFPLEVBQUU7SUFDaEIsRUFBRSxDQUFDLE9BQU8sRUFBRTtRQUNWLE1BQU0sSUFBSSxHQUFHLG1CQUFtQjtZQUM5QixnQ0FBZ0M7WUFDaEMscUJBQXFCLENBQUM7UUFFeEIsTUFBTSxHQUFHLEdBQUc7WUFDVixDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7WUFDbEIsQ0FBQyxvQkFBb0IsRUFBRSxPQUFPLENBQUM7WUFDL0IsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDO1NBQ3ZCLENBQUM7UUFDRixNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRWpDLE1BQU0sSUFBSSxHQUFHLG9CQUFvQjtZQUMvQixpQ0FBaUM7WUFDakMsc0JBQXNCLENBQUM7UUFDekIsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDN0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsV0FBVyxFQUFFO1FBQ2QsTUFBTSxHQUFHLEdBQUcsbUJBQW1CO1lBQzdCLGdDQUFnQztZQUNoQyxxQkFBcUIsQ0FBQztRQUV4QixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLEVBQUUsY0FBYyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDbEQsTUFBTSxHQUFHLEdBQUc7WUFDVixDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7WUFDbEIs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