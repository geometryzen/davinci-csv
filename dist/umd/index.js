(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.DAVINCI_CSV = {}));
})(this, (function (exports) { 'use strict';

    class CSVError {
        code;
        message;
        index;
        line;
        column;
        constructor(code, message, index, line, column) {
            this.code = code;
            this.message = message;
            this.index = index;
            this.line = line;
            this.column = column;
        }
    }

    var ErrorCode;
    (function (ErrorCode) {
        /**
         * Unexpected apostrophe.
         */
        ErrorCode[ErrorCode["E001"] = 1] = "E001";
        /**
         * Unexpected quote.
         */
        ErrorCode[ErrorCode["E002"] = 2] = "E002";
        /**
         * Unexpected character.
         */
        ErrorCode[ErrorCode["E003"] = 3] = "E003";
        /**
         * Unexpected digit.
         */
        ErrorCode[ErrorCode["E004"] = 4] = "E004";
        /**
         * Missing closing apostrophe.
         */
        ErrorCode[ErrorCode["E005"] = 5] = "E005";
        /**
         * Missing closing quote.
         */
        ErrorCode[ErrorCode["E006"] = 6] = "E006";
    })(ErrorCode || (ErrorCode = {}));
    const messages = {};
    messages[ErrorCode.E001] = { code: 'E001', desc: "Unexpected apostrophe." };
    messages[ErrorCode.E002] = { code: 'E002', desc: "Unexpected quote." };
    messages[ErrorCode.E003] = { code: 'E003', desc: "Unexpected character." };
    messages[ErrorCode.E004] = { code: 'E004', desc: "Unexpected digit." };
    messages[ErrorCode.E005] = { code: 'E005', desc: "Missing closing apostrophe." };
    messages[ErrorCode.E006] = { code: 'E006', desc: "Missing closing quote." };

    const COMMA = ',';
    const SEMICOLON = ';';
    const CR = '\r';
    const LF = '\n';
    const CRLF = CR + LF;
    const APOS = "'";
    const QUOTE = '"';
    const SPACE = ' ';
    const MINUS = '-';
    const PLUS = '+';
    var CsvState;
    (function (CsvState) {
        CsvState[CsvState["START"] = 0] = "START";
        CsvState[CsvState["INTEGER"] = 1] = "INTEGER";
        CsvState[CsvState["DECIMAL"] = 2] = "DECIMAL";
        CsvState[CsvState["SCIENTIFIC"] = 3] = "SCIENTIFIC";
        CsvState[CsvState["APOS_STRING"] = 4] = "APOS_STRING";
        CsvState[CsvState["APOS_ESCAPE"] = 5] = "APOS_ESCAPE";
        CsvState[CsvState["QUOTE_STRING"] = 6] = "QUOTE_STRING";
        CsvState[CsvState["QUOTE_ESCAPE"] = 7] = "QUOTE_ESCAPE";
        /**
         * We've just seen the delimiter, usually a comma or a semicolon.
         */
        CsvState[CsvState["DELIM"] = 8] = "DELIM";
        CsvState[CsvState["ISO8601_HHMM"] = 9] = "ISO8601_HHMM";
        CsvState[CsvState["UNQUOTED_STRING"] = 10] = "UNQUOTED_STRING";
        CsvState[CsvState["EXPONENT"] = 11] = "EXPONENT";
        CsvState[CsvState["SIGNED_EXPONENT"] = 12] = "SIGNED_EXPONENT";
        CsvState[CsvState["NEGATIVE_INTEGER"] = 13] = "NEGATIVE_INTEGER";
        CsvState[CsvState["TRAILING_WHITESPACE"] = 14] = "TRAILING_WHITESPACE";
    })(CsvState || (CsvState = {}));
    function decodeState(state) {
        switch (state) {
            case CsvState.START: return "START";
            case CsvState.INTEGER: return "INTEGER";
            case CsvState.DECIMAL: return "DECIMAL";
            case CsvState.SCIENTIFIC: return "SCIENTIFIC";
            case CsvState.APOS_STRING: return "APOS_STRING";
            case CsvState.APOS_ESCAPE: return "APOS_ESCAPE";
            case CsvState.QUOTE_STRING: return "QUOTE_STRING";
            case CsvState.QUOTE_ESCAPE: return "QUOTE_ESCAPE";
            case CsvState.DELIM: return "DELIM";
            case CsvState.ISO8601_HHMM: return "ISO8601_HHMM";
            case CsvState.UNQUOTED_STRING: return "UNQUOTED_STRING";
            case CsvState.EXPONENT: return "EXPONENT";
            case CsvState.SIGNED_EXPONENT: return "SIGNED_EXPONENT";
            case CsvState.NEGATIVE_INTEGER: return "NEGATIVE_INTEGER";
            case CsvState.TRAILING_WHITESPACE: return "TRAILING_WHITESPACE";
        }
        throw new Error(`decodeState(${state})`);
    }
    /**
     * Regular expression for detecting integers.
     */
    const rxIsInt = /^\d+$/;
    /**
     * Regular expression for detecting floating point numbers (with optional exponents).
     */
    const rxIsFloat = /^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/;
    // If a string has leading or trailing space,
    // contains a comma double quote or a newline
    // it needs to be quoted in CSV output
    const rxNeedsQuoting = /^\s|\s$|,|"|\n/;
    /**
     *
     */
    function chomp(s, lineterminator) {
        if (s.charAt(s.length - lineterminator.length) !== lineterminator) {
            // Does not end with \n, just return string.
            return s;
        }
        else {
            // Remove the newline.
            return s.substring(0, s.length - lineterminator.length);
        }
    }
    /**
     * Replaces all the funky line terminators with a single newline character.
     */
    function normalizeLineTerminator(csvString, dialect = {}) {
        // Try to guess line terminator if it's not provided.
        if (!dialect.lineTerminator) {
            return csvString.replace(/(\r\n|\n|\r)/gm, '\n');
        }
        // if not return the string untouched.
        return csvString;
    }
    /**
     * Converts from the fields and records structure to an array of arrays.
     * The first row in the output contains the field names in the same order as the input.
     */
    function dataToArrays(data) {
        const arrays = [];
        const fieldIds = data.fields.map(field => field.id);
        arrays.push(fieldIds);
        for (const record of data.records) {
            const tmp = fieldIds.map(fieldId => record[fieldId]);
            arrays.push(tmp);
        }
        return arrays;
    }
    /**
     */
    function normalizeDialectOptions(dialect) {
        // note lower case compared to CSV DDF.
        const options = {
            delim: COMMA,
            escape: true,
            lineTerm: LF,
            quoteChar: QUOTE,
            skipRows: 0,
            trim: true
        };
        if (dialect) {
            if (typeof dialect.fieldDelimiter === 'string') {
                switch (dialect.fieldDelimiter) {
                    case COMMA:
                    case SEMICOLON: {
                        options.delim = dialect.fieldDelimiter;
                        break;
                    }
                    default: {
                        throw new Error(`Unexpected dialect field delimiter ${dialect.fieldDelimiter}.`);
                    }
                }
            }
            if (typeof dialect.escapeEmbeddedQuotes === 'boolean') {
                options.escape = dialect.escapeEmbeddedQuotes;
            }
            if (typeof dialect.lineTerminator === 'string') {
                switch (dialect.lineTerminator) {
                    case LF:
                    case CR:
                    case CRLF: {
                        options.lineTerm = LF;
                        break;
                    }
                    default: {
                        throw new Error(`Unexpected dialect lineTerminator ${dialect.lineTerminator}.`);
                    }
                }
            }
            if (typeof dialect.quoteChar === 'string') {
                switch (dialect.quoteChar) {
                    case APOS:
                    case QUOTE: {
                        options.quoteChar = dialect.quoteChar;
                        break;
                    }
                    default: {
                        throw new Error(`Unexpected dialect quoteChar ${dialect.quoteChar}.`);
                    }
                }
            }
            if (typeof dialect.skipInitialRows === 'number') {
                options.skipRows = dialect.skipInitialRows;
            }
            if (typeof dialect.trimFields === 'boolean') {
                options.trim = dialect.trimFields;
            }
        }
        return options;
    }
    // ## serialize
    //
    // See README for docs
    //
    // Heavily based on uselesscode's JS CSV serializer (MIT Licensed):
    // http://www.uselesscode.org/javascript/csv/
    /**
     * Converts from structured data to a string in CSV format of the specified dialect.
     */
    function serialize(data, dialect) {
        const a = (data instanceof Array) ? data : dataToArrays(data);
        const options = normalizeDialectOptions(dialect);
        const fieldToString = function (field) {
            if (field === null) {
                // If field is null set to empty string
                field = '';
            }
            else if (typeof field === "string" && rxNeedsQuoting.test(field)) {
                if (options.escape) {
                    // FIXME: May need to be the quote character?
                    field = field.replace(/"/g, '""');
                }
                // Convert string to delimited string
                field = options.quoteChar + field + options.quoteChar;
            }
            else if (typeof field === "number") {
                // Convert number to string
                field = field.toString(10);
            }
            return field;
        };
        /**
         * Buffer for building up the output.
         */
        let outBuffer = '';
        for (let i = 0; i < a.length; i += 1) {
            /**
             * The fields we are currently processing.
             */
            const fields = a[i];
            /**
             * Buffer for building up the current row.
             */
            let rowBuffer = '';
            for (let j = 0; j < fields.length; j += 1) {
                /**
                 * Buffer for building up the current field.
                 */
                const fieldBuffer = fieldToString(fields[j]);
                // If this is EOR append row to output and flush row
                if (j === (fields.length - 1)) {
                    rowBuffer += fieldBuffer;
                    outBuffer += rowBuffer + options.lineTerm;
                    rowBuffer = '';
                }
                else {
                    // Add the current field to the current row
                    rowBuffer += fieldBuffer + options.delim;
                }
            }
        }
        return outBuffer;
    }
    /**
     * Normalizes the line terminator across the file.
     */
    function normalizeInputString(csvText, dialect) {
        // When line terminator is not provided then we try to guess it
        // and normalize it across the file.
        if (!dialect || (dialect && !dialect.lineTerminator)) {
            csvText = normalizeLineTerminator(csvText, dialect);
        }
        const options = normalizeDialectOptions(dialect);
        // Get rid of any trailing \n
        return { s: chomp(csvText, options.lineTerm), options };
    }
    /**
     * Parses a string representation of CSV data into an array of arrays of fields.
     * The dialect may be specified to improve the parsing.
     */
    function parse(csvText, dialect, errors) {
        const { s, options } = normalizeInputString(csvText, dialect);
        let state = CsvState.START;
        /**
         * The length of the input string following normalization.
         * Using cached length of s will improve performance and is safe because s is constant.
         */
        const sLength = s.length;
        /**
         * The character we are currently processing.
         */
        let ch = '';
        /**
         * Keep track of where a quotation mark begins for reporting unterminated string literals.
         */
        let quoteBegin = Number.MAX_SAFE_INTEGER;
        /**
         * The parsed current field
         */
        let field = '';
        /**
         * The parsed row.
         */
        let row = [];
        /**
         * The parsed output.
         */
        let out = [];
        /**
         * The 1-based line number.
         */
        const line = 1;
        /**
         * The zero-based column number.
         */
        const column = 0;
        /**
         * Helper function to parse a single field.
         */
        const parseField = function (fieldAsString) {
            {
                // If field is empty set to null
                if (fieldAsString === '') {
                    return null;
                    // If the field was not quoted and we are trimming fields, trim it
                }
                else if (options.trim) {
                    fieldAsString = fieldAsString.trim();
                }
                // Convert unquoted numbers to their appropriate types
                if (rxIsInt.test(fieldAsString)) {
                    return parseInt(fieldAsString, 10);
                }
                else if (rxIsFloat.test(fieldAsString)) {
                    return parseFloat(fieldAsString);
                }
                else {
                    // An example here is a heading which is not quoted.
                    return fieldAsString;
                }
            }
        };
        const error = function (e) {
            if (errors) {
                errors.push(e);
            }
            else {
                throw e;
            }
        };
        for (let i = 0; i < sLength; i += 1) {
            ch = s.charAt(i);
            switch (state) {
                case CsvState.START: {
                    switch (ch) {
                        case ' ': {
                            // Ignore whitespace.
                            break;
                        }
                        case '0':
                        case '1':
                        case '2':
                        case '3':
                        case '4':
                        case '5':
                        case '6':
                        case '7':
                        case '8':
                        case '9': {
                            field += ch;
                            state = CsvState.INTEGER;
                            break;
                        }
                        case QUOTE: {
                            quoteBegin = i;
                            state = CsvState.QUOTE_STRING;
                            break;
                        }
                        case APOS: {
                            state = CsvState.APOS_STRING;
                            break;
                        }
                        case PLUS: {
                            state = CsvState.INTEGER;
                            break;
                        }
                        case MINUS: {
                            field += ch;
                            state = CsvState.NEGATIVE_INTEGER;
                            break;
                        }
                        default: {
                            field += ch;
                            state = CsvState.UNQUOTED_STRING;
                        }
                    }
                    break;
                }
                case CsvState.INTEGER: {
                    switch (ch) {
                        case '0':
                        case '1':
                        case '2':
                        case '3':
                        case '4':
                        case '5':
                        case '6':
                        case '7':
                        case '8':
                        case '9': {
                            field += ch;
                            break;
                        }
                        case '.': {
                            field += ch;
                            state = CsvState.DECIMAL;
                            break;
                        }
                        case ':': {
                            field += ch;
                            state = CsvState.ISO8601_HHMM;
                            break;
                        }
                        case 'e': {
                            field += ch;
                            state = CsvState.EXPONENT;
                            break;
                        }
                        case COMMA: {
                            field = parseField(field);
                            row.push(field);
                            field = '';
                            state = CsvState.DELIM;
                            break;
                        }
                        case APOS: {
                            const msg = messages[ErrorCode.E001];
                            error(new CSVError(msg.code, msg.desc, i, line, column));
                            break;
                        }
                        case QUOTE: {
                            const msg = messages[ErrorCode.E002];
                            error(new CSVError(msg.code, msg.desc, i, line, column));
                            break;
                        }
                        case SPACE: {
                            field = parseField(field);
                            row.push(field);
                            field = '';
                            state = CsvState.TRAILING_WHITESPACE;
                            break;
                        }
                        case LF: {
                            field = parseField(field);
                            row.push(field);
                            field = '';
                            out.push(row);
                            row = [];
                            state = CsvState.START;
                            break;
                        }
                        case CR: {
                            // Do we want to support CRLF?
                            field = parseField(field);
                            row.push(field);
                            field = '';
                            out.push(row);
                            row = [];
                            state = CsvState.START;
                            break;
                        }
                        default: {
                            const msg = messages[ErrorCode.E003];
                            error(new CSVError(msg.code, msg.desc, i, line, column));
                        }
                    }
                    break;
                }
                case CsvState.NEGATIVE_INTEGER: {
                    switch (ch) {
                        case '0':
                        case '1':
                        case '2':
                        case '3':
                        case '4':
                        case '5':
                        case '6':
                        case '7':
                        case '8':
                        case '9': {
                            field += ch;
                            break;
                        }
                        case '.': {
                            field += ch;
                            state = CsvState.DECIMAL;
                            break;
                        }
                        default: {
                            const msg = messages[ErrorCode.E003];
                            error(new CSVError(msg.code, msg.desc, i, line, column));
                        }
                    }
                    break;
                }
                case CsvState.DECIMAL: {
                    switch (ch) {
                        case '0':
                        case '1':
                        case '2':
                        case '3':
                        case '4':
                        case '5':
                        case '6':
                        case '7':
                        case '8':
                        case '9': {
                            field += ch;
                            break;
                        }
                        case 'e': {
                            field += ch;
                            state = CsvState.EXPONENT;
                            break;
                        }
                        case options.delim: {
                            field = parseField(field);
                            row.push(field);
                            field = '';
                            state = CsvState.DELIM;
                            break;
                        }
                        case APOS: {
                            const msg = messages[ErrorCode.E001];
                            error(new CSVError(msg.code, msg.desc, i, line, column));
                            break;
                        }
                        case QUOTE: {
                            const msg = messages[ErrorCode.E002];
                            error(new CSVError(msg.code, msg.desc, i, line, column));
                            break;
                        }
                        case SPACE: {
                            field = parseField(field);
                            row.push(field);
                            field = '';
                            state = CsvState.TRAILING_WHITESPACE;
                            break;
                        }
                        default: {
                            const msg = messages[ErrorCode.E003];
                            error(new CSVError(msg.code, msg.desc, i, line, column));
                        }
                    }
                    break;
                }
                case CsvState.APOS_STRING: {
                    switch (ch) {
                        case APOS: {
                            state = CsvState.APOS_ESCAPE;
                            break;
                        }
                        default: {
                            field += ch;
                            break;
                        }
                    }
                    break;
                }
                case CsvState.QUOTE_STRING: {
                    switch (ch) {
                        case QUOTE: {
                            state = CsvState.QUOTE_ESCAPE;
                            break;
                        }
                        default: {
                            field += ch;
                            break;
                        }
                    }
                    break;
                }
                case CsvState.QUOTE_ESCAPE: {
                    switch (ch) {
                        case QUOTE: {
                            field += ch;
                            state = CsvState.QUOTE_STRING;
                            break;
                        }
                        case options.delim: {
                            row.push(field);
                            field = '';
                            state = CsvState.DELIM;
                            break;
                        }
                        case LF: {
                            row.push(field);
                            field = '';
                            out.push(row);
                            row = [];
                            state = CsvState.START;
                            break;
                        }
                        default: {
                            const msg = messages[ErrorCode.E003];
                            error(new CSVError(msg.code, msg.desc, i, line, column));
                        }
                    }
                    break;
                }
                case CsvState.APOS_ESCAPE: {
                    switch (ch) {
                        case APOS: {
                            field += ch;
                            state = CsvState.APOS_STRING;
                            break;
                        }
                        case options.delim: {
                            row.push(field);
                            field = '';
                            state = CsvState.DELIM;
                            break;
                        }
                        case LF: {
                            row.push(field);
                            field = '';
                            out.push(row);
                            row = [];
                            state = CsvState.START;
                            break;
                        }
                        default: {
                            const msg = messages[ErrorCode.E003];
                            error(new CSVError(msg.code, msg.desc, i, line, column));
                        }
                    }
                    break;
                }
                case CsvState.DELIM: {
                    switch (ch) {
                        case '0':
                        case '1':
                        case '2':
                        case '3':
                        case '4':
                        case '5':
                        case '6':
                        case '7':
                        case '8':
                        case '9': {
                            field += ch;
                            state = CsvState.INTEGER;
                            break;
                        }
                        case SPACE: {
                            break;
                        }
                        case PLUS: {
                            state = CsvState.INTEGER;
                            break;
                        }
                        case MINUS: {
                            field += ch;
                            state = CsvState.NEGATIVE_INTEGER;
                            break;
                        }
                        case QUOTE: {
                            quoteBegin = i;
                            state = CsvState.QUOTE_STRING;
                            break;
                        }
                        case APOS: {
                            quoteBegin = i;
                            state = CsvState.APOS_STRING;
                            break;
                        }
                        default: {
                            field += ch;
                            state = CsvState.UNQUOTED_STRING;
                        }
                    }
                    break;
                }
                case CsvState.ISO8601_HHMM: {
                    switch (ch) {
                        case '0':
                        case '1':
                        case '2':
                        case '3':
                        case '4':
                        case '5':
                        case '6':
                        case '7':
                        case '8':
                        case '9': {
                            field += ch;
                            break;
                        }
                        case LF: {
                            field = parseField(field);
                            row.push(field);
                            field = '';
                            out.push(row);
                            row = [];
                            state = CsvState.START;
                            break;
                        }
                        case CR: {
                            // Do we want to support CRLF?
                            field = parseField(field);
                            row.push(field);
                            field = '';
                            out.push(row);
                            row = [];
                            state = CsvState.START;
                            break;
                        }
                        default: {
                            const msg = messages[ErrorCode.E003];
                            error(new CSVError(msg.code, msg.desc, i, line, column));
                        }
                    }
                    break;
                }
                case CsvState.UNQUOTED_STRING: {
                    switch (ch) {
                        case options.delim: {
                            row.push(field);
                            field = '';
                            state = CsvState.DELIM;
                            break;
                        }
                        case LF: {
                            row.push(field);
                            field = '';
                            out.push(row);
                            row = [];
                            state = CsvState.START;
                            break;
                        }
                        case CR: {
                            row.push(field);
                            field = '';
                            out.push(row);
                            row = [];
                            state = CsvState.START;
                            break;
                        }
                        default: {
                            field += ch;
                        }
                    }
                    break;
                }
                case CsvState.EXPONENT: {
                    switch (ch) {
                        case PLUS:
                        case MINUS: {
                            field += ch;
                            state = CsvState.SIGNED_EXPONENT;
                            break;
                        }
                        case SPACE: {
                            field = parseField(field);
                            row.push(field);
                            field = '';
                            state = CsvState.TRAILING_WHITESPACE;
                            break;
                        }
                        case '0':
                        case '1':
                        case '2':
                        case '3':
                        case '4':
                        case '5':
                        case '6':
                        case '7':
                        case '8':
                        case '9': {
                            field += ch;
                            break;
                        }
                        default: {
                            const msg = messages[ErrorCode.E003];
                            error(new CSVError(msg.code, msg.desc, i, line, column));
                        }
                    }
                    break;
                }
                case CsvState.SIGNED_EXPONENT: {
                    switch (ch) {
                        case SPACE: {
                            field = parseField(field);
                            row.push(field);
                            field = '';
                            state = CsvState.TRAILING_WHITESPACE;
                            break;
                        }
                        case '0':
                        case '1':
                        case '2':
                        case '3':
                        case '4':
                        case '5':
                        case '6':
                        case '7':
                        case '8':
                        case '9': {
                            field += ch;
                            break;
                        }
                        case LF: {
                            field = parseField(field);
                            row.push(field);
                            field = '';
                            out.push(row);
                            row = [];
                            state = CsvState.START;
                            break;
                        }
                        case CR: {
                            field = parseField(field);
                            row.push(field);
                            field = '';
                            out.push(row);
                            row = [];
                            state = CsvState.START;
                            break;
                        }
                        default: {
                            const msg = messages[ErrorCode.E003];
                            error(new CSVError(msg.code, msg.desc, i, line, column));
                        }
                    }
                    break;
                }
                case CsvState.TRAILING_WHITESPACE: {
                    switch (ch) {
                        case '0':
                        case '1':
                        case '2':
                        case '3':
                        case '4':
                        case '5':
                        case '6':
                        case '7':
                        case '8':
                        case '9': {
                            const msg = messages[ErrorCode.E004];
                            error(new CSVError(msg.code, msg.desc, i, line, column));
                            break;
                        }
                        default: {
                            const msg = messages[ErrorCode.E003];
                            error(new CSVError(msg.code, msg.desc, i, line, column));
                        }
                    }
                    break;
                }
                default: {
                    throw new Error(`Unexpected state ${decodeState(state)} at ${i} for ${s}`);
                }
            }
        }
        // We've reached the end of the string.
        switch (state) {
            case CsvState.INTEGER: {
                // Add the last field
                field = parseField(field);
                row.push(field);
                field = '';
                out.push(row);
                row = [];
                break;
            }
            case CsvState.DECIMAL: {
                // Add the last field
                field = parseField(field);
                row.push(field);
                field = '';
                out.push(row);
                row = [];
                break;
            }
            case CsvState.EXPONENT:
            case CsvState.SIGNED_EXPONENT: {
                // Add the last field
                field = parseField(field);
                row.push(field);
                field = '';
                out.push(row);
                row = [];
                break;
            }
            case CsvState.APOS_ESCAPE: {
                // It's not actually an escape that we saw, but the end of the apostrophe delimited string.
                // Add the last field
                field = parseField(field);
                row.push(field);
                field = '';
                out.push(row);
                row = [];
                break;
            }
            case CsvState.QUOTE_ESCAPE: {
                // It's not actually an escape that we saw, but the end of the quote delimited string.
                // Add the last field
                field = parseField(field);
                row.push(field);
                field = '';
                out.push(row);
                row = [];
                break;
            }
            case CsvState.ISO8601_HHMM: {
                // Add the last field
                field = parseField(field);
                row.push(field);
                field = '';
                out.push(row);
                row = [];
                break;
            }
            case CsvState.DELIM: {
                row.push(null);
                field = '';
                out.push(row);
                row = [];
                break;
            }
            case CsvState.APOS_STRING: {
                const msg = messages[ErrorCode.E005];
                error(new CSVError(msg.code, msg.desc, quoteBegin, line, column));
                break;
            }
            case CsvState.QUOTE_STRING: {
                const msg = messages[ErrorCode.E006];
                error(new CSVError(msg.code, msg.desc, quoteBegin, line, column));
                break;
            }
            case CsvState.START: {
                // Do nothing?
                break;
            }
            case CsvState.TRAILING_WHITESPACE: {
                // Do nothing?
                break;
            }
            default: {
                throw new Error(`Unexpected end state ${decodeState(state)} ${s}`);
            }
        }
        // Expose the ability to discard initial rows
        if (options.skipRows)
            out = out.slice(options.skipRows);
        return out;
    }

    exports.CSVError = CSVError;
    exports.dataToArrays = dataToArrays;
    exports.parse = parse;
    exports.serialize = serialize;

}));
//# sourceMappingURL=index.js.map
