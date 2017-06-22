import { CSVError } from './CSVError';
import { messages, ErrorCode } from './messages';
var COMMA = ',';
var SEMICOLON = ';';
var CR = '\r';
var LF = '\n';
var CRLF = CR + LF;
var APOS = "'";
var QUOTE = '"';
var SPACE = ' ';
var MINUS = '-';
var PLUS = '+';
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
    CsvState[CsvState["NEGATIVE_EXPONENT"] = 12] = "NEGATIVE_EXPONENT";
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
        case CsvState.NEGATIVE_EXPONENT: return "NEGATIVE_EXPONENT";
        case CsvState.NEGATIVE_INTEGER: return "NEGATIVE_INTEGER";
        case CsvState.TRAILING_WHITESPACE: return "TRAILING_WHITESPACE";
    }
    throw new Error("decodeState(" + state + ")");
}
/**
 * Regular expression for detecting integers.
 */
var rxIsInt = /^\d+$/;
/**
 * Regular expression for detecting floating point numbers (with optional exponents).
 */
var rxIsFloat = /^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/;
// If a string has leading or trailing space,
// contains a comma double quote or a newline
// it needs to be quoted in CSV output
var rxNeedsQuoting = /^\s|\s$|,|"|\n/;
/**
 * A polyfill in case String.trim does not exist.
 */
var trim = (function () {
    // Fx 3.1 has a native trim function, it's about 10x faster, use it if it exists
    if (String.prototype.trim) {
        return function (s) {
            return s.trim();
        };
    }
    else {
        return function (s) {
            return s.replace(/^\s*/, '').replace(/\s*$/, '');
        };
    }
}());
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
function normalizeLineTerminator(csvString, dialect) {
    if (dialect === void 0) { dialect = {}; }
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
export function dataToArrays(data) {
    var arrays = [];
    var fieldIds = data.fields.map(function (field) { return field.id; });
    arrays.push(fieldIds);
    var _loop_1 = function (record) {
        var tmp = fieldIds.map(function (fieldId) { return record[fieldId]; });
        arrays.push(tmp);
    };
    for (var _i = 0, _a = data.records; _i < _a.length; _i++) {
        var record = _a[_i];
        _loop_1(record);
    }
    return arrays;
}
/**
 */
function normalizeDialectOptions(dialect) {
    // note lower case compared to CSV DDF.
    var options = {
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
                    throw new Error("Unexpected dialect field delimiter " + dialect.fieldDelimiter + ".");
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
                    throw new Error("Unexpected dialect lineTerminator " + dialect.lineTerminator + ".");
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
                    throw new Error("Unexpected dialect quoteChar " + dialect.quoteChar + ".");
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
export function serialize(data, dialect) {
    var a = (data instanceof Array) ? data : dataToArrays(data);
    var options = normalizeDialectOptions(dialect);
    var fieldToString = function fieldToString(field) {
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
    var outBuffer = '';
    for (var i = 0; i < a.length; i += 1) {
        /**
         * The fields we are currently processing.
         */
        var fields = a[i];
        /**
         * Buffer for building up the current row.
         */
        var rowBuffer = '';
        for (var j = 0; j < fields.length; j += 1) {
            /**
             * Buffer for building up the current field.
             */
            var fieldBuffer = fieldToString(fields[j]);
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
    var options = normalizeDialectOptions(dialect);
    // Get rid of any trailing \n
    return { s: chomp(csvText, options.lineTerm), options: options };
}
/**
 * Parses a string representation of CSV data into an array of arrays of fields.
 * The dialect may be specified to improve the parsing.
 */
export function parse(csvText, dialect, errors) {
    var _a = normalizeInputString(csvText, dialect), s = _a.s, options = _a.options;
    var state = CsvState.START;
    /**
     * The length of the input string following normalization.
     * Using cached length of s will improve performance and is safe because s is constant.
     */
    var sLength = s.length;
    /**
     * The character we are currently processing.
     */
    var ch = '';
    var fieldQuoted = false;
    /**
     * Keep track of where a quotation mark begins for reporting unterminated string literals.
     */
    var quoteBegin = Number.MAX_SAFE_INTEGER;
    /**
     * The parsed current field
     */
    var field = '';
    /**
     * The parsed row.
     */
    var row = [];
    /**
     * The parsed output.
     */
    var out = [];
    /**
     * The 1-based line number.
     */
    var line = 1;
    /**
     * The zero-based column number.
     */
    var column = 0;
    /**
     * Helper function to parse a single field.
     */
    var parseField = function parseField(fieldAsString) {
        if (fieldQuoted) {
            return fieldAsString;
        }
        else {
            // If field is empty set to null
            if (fieldAsString === '') {
                return null;
                // If the field was not quoted and we are trimming fields, trim it
            }
            else if (options.trim) {
                fieldAsString = trim(fieldAsString);
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
    var error = function (e) {
        if (errors) {
            errors.push(e);
        }
        else {
            throw e;
        }
    };
    for (var i = 0; i < sLength; i += 1) {
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
                        var msg = messages[ErrorCode.E001];
                        error(new CSVError(msg.code, msg.desc, i, line, column));
                        break;
                    }
                    case QUOTE: {
                        var msg = messages[ErrorCode.E002];
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
                        var msg = messages[ErrorCode.E003];
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
                        var msg = messages[ErrorCode.E003];
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
                        var msg = messages[ErrorCode.E001];
                        error(new CSVError(msg.code, msg.desc, i, line, column));
                        break;
                    }
                    case QUOTE: {
                        var msg = messages[ErrorCode.E002];
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
                        var msg = messages[ErrorCode.E003];
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
                        var msg = messages[ErrorCode.E003];
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
                        var msg = messages[ErrorCode.E003];
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
                        var msg = messages[ErrorCode.E003];
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
                    case '-': {
                        field += ch;
                        state = CsvState.NEGATIVE_EXPONENT;
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
                        var msg = messages[ErrorCode.E003];
                        error(new CSVError(msg.code, msg.desc, i, line, column));
                    }
                }
                break;
            }
            case CsvState.NEGATIVE_EXPONENT: {
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
                        var msg = messages[ErrorCode.E003];
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
                        var msg = messages[ErrorCode.E004];
                        error(new CSVError(msg.code, msg.desc, i, line, column));
                        break;
                    }
                    default: {
                        var msg = messages[ErrorCode.E003];
                        error(new CSVError(msg.code, msg.desc, i, line, column));
                    }
                }
                break;
            }
            default: {
                throw new Error("Unexpected state " + decodeState(state) + " at " + i + " for " + s);
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
        case CsvState.NEGATIVE_EXPONENT: {
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
            var msg = messages[ErrorCode.E005];
            error(new CSVError(msg.code, msg.desc, quoteBegin, line, column));
            break;
        }
        case CsvState.QUOTE_STRING: {
            var msg = messages[ErrorCode.E006];
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
            throw new Error("Unexpected end state " + decodeState(state) + " " + s);
        }
    }
    // Expose the ability to discard initial rows
    if (options.skipRows)
        out = out.slice(options.skipRows);
    return out;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ1NWLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9DU1YudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUN0QyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQTBEakQsSUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDO0FBQ2xCLElBQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQztBQUV0QixJQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFDaEIsSUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDO0FBQ2hCLElBQU0sSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFDckIsSUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDO0FBQ2pCLElBQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQztBQUNsQixJQUFNLEtBQUssR0FBRyxHQUFHLENBQUM7QUFDbEIsSUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDO0FBQ2xCLElBQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQztBQUVqQixJQUFLLFFBbUJKO0FBbkJELFdBQUssUUFBUTtJQUNULHlDQUFTLENBQUE7SUFDVCw2Q0FBVyxDQUFBO0lBQ1gsNkNBQVcsQ0FBQTtJQUNYLG1EQUFjLENBQUE7SUFDZCxxREFBZSxDQUFBO0lBQ2YscURBQWUsQ0FBQTtJQUNmLHVEQUFnQixDQUFBO0lBQ2hCLHVEQUFnQixDQUFBO0lBQ2hCOztPQUVHO0lBQ0gseUNBQVMsQ0FBQTtJQUNULHVEQUFnQixDQUFBO0lBQ2hCLDhEQUFvQixDQUFBO0lBQ3BCLGdEQUFhLENBQUE7SUFDYixrRUFBc0IsQ0FBQTtJQUN0QixnRUFBcUIsQ0FBQTtJQUNyQixzRUFBd0IsQ0FBQTtBQUM1QixDQUFDLEVBbkJJLFFBQVEsS0FBUixRQUFRLFFBbUJaO0FBRUQscUJBQXFCLEtBQWU7SUFDaEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFD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