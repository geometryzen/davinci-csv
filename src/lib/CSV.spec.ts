import { Data, Dialect, parse, serialize } from './CSV';
import { CSVError } from './CSVError';

const LF = "\n";

describe("Fundamentals", function () {
    describe("number", function () {
        describe("single, single digit integer", function () {
            it("zero", function () {
                const sourceText = [
                    "0"
                ].join(LF);
                const exp = [
                    [0]
                ];
                expect(parse(sourceText)).toEqual(exp);
            });
            it("one", function () {
                const sourceText = [
                    "1"
                ].join(LF);
                const exp = [
                    [1]
                ];
                expect(parse(sourceText)).toEqual(exp);
            });
            it("two", function () {
                const sourceText = [
                    "2"
                ].join(LF);
                const exp = [
                    [2]
                ];
                expect(parse(sourceText)).toEqual(exp);
            });
            it("three", function () {
                const sourceText = [
                    "3"
                ].join(LF);
                const exp = [
                    [3]
                ];
                expect(parse(sourceText)).toEqual(exp);
            });
            it("four", function () {
                const sourceText = [
                    "4"
                ].join(LF);
                const exp = [
                    [4]
                ];
                expect(parse(sourceText)).toEqual(exp);
            });
            it("five", function () {
                const sourceText = [
                    "5"
                ].join(LF);
                const exp = [
                    [5]
                ];
                expect(parse(sourceText)).toEqual(exp);
            });
            it("six", function () {
                const sourceText = [
                    "6"
                ].join(LF);
                const exp = [
                    [6]
                ];
                expect(parse(sourceText)).toEqual(exp);
            });
            it("seven", function () {
                const sourceText = [
                    "7"
                ].join(LF);
                const exp = [
                    [7]
                ];
                expect(parse(sourceText)).toEqual(exp);
            });
            it("eight", function () {
                const sourceText = [
                    "8"
                ].join(LF);
                const exp = [
                    [8]
                ];
                expect(parse(sourceText)).toEqual(exp);
            });
            it("nine", function () {
                const sourceText = [
                    "9"
                ].join(LF);
                const exp = [
                    [9]
                ];
                expect(parse(sourceText)).toEqual(exp);
            });
        });
        describe("single, multi-digit integer", function () {
            it("should be converted to the corresponding number", function () {
                const sourceText = [
                    "123"
                ].join(LF);
                const exp = [
                    [123]
                ];
                expect(parse(sourceText)).toEqual(exp);
            });
        });
        describe("single, multi-digit decimal", function () {
            it("should be converted to the corresponding number", function () {
                const sourceText = [
                    "1234.5"
                ].join(LF);
                const exp = [
                    [1234.5]
                ];
                expect(parse(sourceText)).toEqual(exp);
            });
        });
        describe("single, multi-digit scientific", function () {
            it("0e0", function () {
                const sourceText = [
                    "0e0"
                ].join(LF);
                const exp = [
                    [0]
                ];
                try {
                    expect(parse(sourceText)).toEqual(exp);
                }
                catch (e) {
                    fail(e);
                }
            });
            it("0e-0", function () {
                const sourceText = [
                    "0e-0"
                ].join(LF);
                const exp = [
                    [0]
                ];
                try {
                    expect(parse(sourceText)).toEqual(exp);
                }
                catch (e) {
                    fail(e);
                }
            });
            it("1e0", function () {
                const sourceText = [
                    "1e0"
                ].join(LF);
                const exp = [
                    [1]
                ];
                try {
                    expect(parse(sourceText)).toEqual(exp);
                }
                catch (e) {
                    fail(e);
                }
            });
            it("should be converted to the corresponding number", function () {
                const sourceText = [
                    "1234.5e1"
                ].join(LF);
                const exp = [
                    [12345]
                ];
                expect(parse(sourceText)).toEqual(exp);
            });
            it("should be converted to the corresponding number", function () {
                const sourceText = [
                    "1234.5e1"
                ].join(LF);
                const exp = [
                    [12345]
                ];
                expect(parse(sourceText)).toEqual(exp);
            });
        });
    });
    describe("string", function () {
        describe("single, apostrophe delimited character", function () {
            it("a", function () {
                const sourceText = [
                    "'a'"
                ].join(LF);
                const exp = [
                    ['a']
                ];
                expect(parse(sourceText)).toEqual(exp);
            });
        });
        describe("single, quote delimited character", function () {
            it("a", function () {
                const sourceText = [
                    '"a"'
                ].join(LF);
                const exp = [
                    ['a']
                ];
                expect(parse(sourceText)).toEqual(exp);
            });
        });
    });
});

describe("Development", function () {
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
        const errors: CSVError[] = [];
        const array = parse(csv2, { trimFields: true }, errors);
        expect(array).toEqual(exp);
    });
});


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
        const errors: CSVError[] = [];
        const array = parse(csv2, { trimFields: true }, errors);
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

    it("simple lineterminator", function () {
        const csv = '"Jones, Jay",10\n' +
            '"Xyz ""ABC"" O\'Brien",11:35\n' +
            '"Other, AN",12:35\n';

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

    it("custom lineterminator", function () {
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

        try {
            const array = parse(csv, settings);
            expect(array).toEqual(exp);
        }
        catch (e) {
            console.warn("Unexpected exception during parse: " + e);
        }
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

    it("nested mixed terminators", function () {
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
    it("Fast Food with quote and LF", function () {
        const csvText = [
            '"Sandwich", "Total Fat (g)", "Total Calories"',
            '"Hamburger", 9, 260'
        ].join('\n');
        const errors: CSVError[] = [];
        parse(csvText, {}, errors);
        expect(errors.length).toBe(0);
    });
    it("Fast Food with apostrophe and LF", function () {
        const csvText = [
            "'Sandwich', 'Total Fat (g)', 'Total Calories'",
            "'Hamburger', 9, 260"
        ].join('\n');
        const errors: CSVError[] = [];
        parse(csvText, {}, errors);
        expect(errors.length).toBe(0);
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

describe("errors", function () {
    describe("Unterminated string literal", function () {
        it("quote", function () {
            const csvText = [
                '1, "'
            ].join('\n');
            const errors: CSVError[] = [];
            parse(csvText, {}, errors);
            expect(errors.length).toBe(1);
            expect(errors[0].code).toBe("E006");
            expect(errors[0].message).toBe("Missing closing quote.");
            expect(errors[0].index).toBe(3);
        });
        it("apos", function () {
            const csvText = [
                "1, '"
            ].join('\n');
            const errors: CSVError[] = [];
            parse(csvText, {}, errors);
            expect(errors.length).toBe(1);
            expect(errors[0].code).toBe("E005");
            expect(errors[0].message).toBe("Missing closing apostrophe.");
            expect(errors[0].index).toBe(3);
        });
    });
    describe("string following a number", function () {
        it("quote following an integer", function () {
            const csvText = [
                '1"'
            ].join('\n');
            const errors: CSVError[] = [];
            parse(csvText, {}, errors);
            expect(errors.length).toBe(1);
            expect(errors[0].code).toBe("E002");
            expect(errors[0].message).toBe("Unexpected quote.");
            expect(errors[0].index).toBe(1);
        });
        it("quote following an decimal", function () {
            const csvText = [
                '1."'
            ].join('\n');
            const errors: CSVError[] = [];
            parse(csvText, {}, errors);
            expect(errors.length).toBe(1);
            expect(errors[0].code).toBe("E002");
            expect(errors[0].message).toBe("Unexpected quote.");
            expect(errors[0].index).toBe(2);
        });
        it("apos following an integer", function () {
            const csvText = [
                "1, 2'"
            ].join('\n');
            const errors: CSVError[] = [];
            parse(csvText, {}, errors);
            expect(errors.length).toBe(1);
            expect(errors[0].code).toBe("E001");
            expect(errors[0].message).toBe("Unexpected apostrophe.");
            expect(errors[0].index).toBe(4);
        });
        it("apos following an decimal", function () {
            const csvText = [
                "1.2'"
            ].join('\n');
            const errors: CSVError[] = [];
            parse(csvText, {}, errors);
            expect(errors.length).toBe(1);
            expect(errors[0].code).toBe("E001");
            expect(errors[0].message).toBe("Unexpected apostrophe.");
            expect(errors[0].index).toBe(3);
        });
    });
    describe("Missing comma between numbers", function () {
        it("integer space integer", function () {
            const csvText = [
                "1 2"
            ].join('\n');
            const errors: CSVError[] = [];
            parse(csvText, {}, errors);
            expect(errors.length).toBe(1);
            expect(errors[0].message).toBe("Unexpected digit.");
            expect(errors[0].index).toBe(2);
        });
        it("decimal space integer", function () {
            const csvText = [
                "1. 2"
            ].join('\n');
            const errors: CSVError[] = [];
            parse(csvText, {}, errors);
            expect(errors.length).toBe(1);
            expect(errors[0].message).toBe("Unexpected digit.");
            expect(errors[0].index).toBe(3);
        });
        it("scientific space integer", function () {
            const csvText = [
                "1.0e5 2"
            ].join('\n');
            const errors: CSVError[] = [];
            parse(csvText, {}, errors);
            expect(errors.length).toBe(1);
            expect(errors[0].message).toBe("Unexpected digit.");
            expect(errors[0].index).toBe(6);
        });
        it("scientific space integer", function () {
            const csvText = [
                "1.0e-5 2"
            ].join('\n');
            const errors: CSVError[] = [];
            parse(csvText, {}, errors);
            expect(errors.length).toBe(1);
            expect(errors[0].message).toBe("Unexpected digit.");
            expect(errors[0].index).toBe(7);
        });
    });
});
