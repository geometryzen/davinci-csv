import Data from './Data';
import Dialect from './Dialect';
import { parse, serialize } from './CSV';


export default function () {

  it("parse", function () {
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

  it("parse - semicolon", function () {
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

  it("parse - quotechar", function () {
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

  it("parse skipInitialRows", function () {
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

  it("serialize - Array", function () {
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

  it("serialize - Object", function () {
    const data: Data = {
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

  it("serialize - dialect options", function () {
    const csv = [
      ['Jones, Jay', 10],
      ['Xyz "ABC" O\'Brien', '11:35']
    ];

    const out = serialize(csv, { escapeEmbeddedQuotes: false });
    const exp = '"Jones, Jay",10\n' +
      '"Xyz "ABC" O\'Brien",11:35\n';
    expect(out).toEqual(exp);
  });

  it("parse custom lineterminator", function () {
    const csv = '"Jones, Jay",10\r' +
      '"Xyz ""ABC"" O\'Brien",11:35\r' +
      '"Other, AN",12:35\r';

    const exp = [
      ['Jones, Jay', 10],
      ['Xyz "ABC" O\'Brien', '11:35'],
      ['Other, AN', '12:35']
    ];

    const settings: Dialect = {
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
    const settings: Dialect = {
      fieldDelimiter: ',',
      lineTerminator: '\r',
    };
    const csv4 = '"Jones, Jay",10\r' +
      '"Xyz ""ABC"" O\'Brien",11:35\r' +
      '"Other, AN",12:35\r';
    const array4 = parse(csv4, settings);
    expect(array4).toEqual(exp1);

  });

  it("Nested mixed terminators", function () {
    // Override line terminator
    const settings: Dialect = {
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
}
