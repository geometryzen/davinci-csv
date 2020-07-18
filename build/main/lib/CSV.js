"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = exports.serialize = exports.dataToArrays = void 0;
var CSVError_1 = require("./CSVError");
var messages_1 = require("./messages");
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
function dataToArrays(data) {
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
exports.dataToArrays = dataToArrays;
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
function serialize(data, dialect) {
    var a = (data instanceof Array) ? data : dataToArrays(data);
    var options = normalizeDialectOptions(dialect);
    var fieldToString = function (field) {
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
exports.serialize = serialize;
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
function parse(csvText, dialect, errors) {
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
    var parseField = function (fieldAsString) {
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
                        var msg = messages_1.messages[messages_1.ErrorCode.E001];
                        error(new CSVError_1.CSVError(msg.code, msg.desc, i, line, column));
                        break;
                    }
                    case QUOTE: {
                        var msg = messages_1.messages[messages_1.ErrorCode.E002];
                        error(new CSVError_1.CSVError(msg.code, msg.desc, i, line, column));
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
                        var msg = messages_1.messages[messages_1.ErrorCode.E003];
                        error(new CSVError_1.CSVError(msg.code, msg.desc, i, line, column));
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
                        var msg = messages_1.messages[messages_1.ErrorCode.E003];
                        error(new CSVError_1.CSVError(msg.code, msg.desc, i, line, column));
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
                        var msg = messages_1.messages[messages_1.ErrorCode.E001];
                        error(new CSVError_1.CSVError(msg.code, msg.desc, i, line, column));
                        break;
                    }
                    case QUOTE: {
                        var msg = messages_1.messages[messages_1.ErrorCode.E002];
                        error(new CSVError_1.CSVError(msg.code, msg.desc, i, line, column));
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
                        var msg = messages_1.messages[messages_1.ErrorCode.E003];
                        error(new CSVError_1.CSVError(msg.code, msg.desc, i, line, column));
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
                        var msg = messages_1.messages[messages_1.ErrorCode.E003];
                        error(new CSVError_1.CSVError(msg.code, msg.desc, i, line, column));
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
                        var msg = messages_1.messages[messages_1.ErrorCode.E003];
                        error(new CSVError_1.CSVError(msg.code, msg.desc, i, line, column));
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
                        var msg = messages_1.messages[messages_1.ErrorCode.E003];
                        error(new CSVError_1.CSVError(msg.code, msg.desc, i, line, column));
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
                        var msg = messages_1.messages[messages_1.ErrorCode.E003];
                        error(new CSVError_1.CSVError(msg.code, msg.desc, i, line, column));
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
                        var msg = messages_1.messages[messages_1.ErrorCode.E003];
                        error(new CSVError_1.CSVError(msg.code, msg.desc, i, line, column));
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
                        var msg = messages_1.messages[messages_1.ErrorCode.E004];
                        error(new CSVError_1.CSVError(msg.code, msg.desc, i, line, column));
                        break;
                    }
                    default: {
                        var msg = messages_1.messages[messages_1.ErrorCode.E003];
                        error(new CSVError_1.CSVError(msg.code, msg.desc, i, line, column));
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
            var msg = messages_1.messages[messages_1.ErrorCode.E005];
            error(new CSVError_1.CSVError(msg.code, msg.desc, quoteBegin, line, column));
            break;
        }
        case CsvState.QUOTE_STRING: {
            var msg = messages_1.messages[messages_1.ErrorCode.E006];
            error(new CSVError_1.CSVError(msg.code, msg.desc, quoteBegin, line, column));
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
exports.parse = parse;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ1NWLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9DU1YudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsdUNBQXNDO0FBQ3RDLHVDQUFpRDtBQTBEakQsSUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDO0FBQ2xCLElBQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQztBQUV0QixJQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFDaEIsSUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDO0FBQ2hCLElBQU0sSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFDckIsSUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDO0FBQ2pCLElBQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQztBQUNsQixJQUFNLEtBQUssR0FBRyxHQUFHLENBQUM7QUFDbEIsSUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDO0FBQ2xCLElBQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQztBQUVqQixJQUFLLFFBbUJKO0FBbkJELFdBQUssUUFBUTtJQUNULHlDQUFTLENBQUE7SUFDVCw2Q0FBVyxDQUFBO0lBQ1gsNkNBQVcsQ0FBQTtJQUNYLG1EQUFjLENBQUE7SUFDZCxxREFBZSxDQUFBO0lBQ2YscURBQWUsQ0FBQTtJQUNmLHVEQUFnQixDQUFBO0lBQ2hCLHVEQUFnQixDQUFBO0lBQ2hCOztPQUVHO0lBQ0gseUNBQVMsQ0FBQTtJQUNULHVEQUFnQixDQUFBO0lBQ2hCLDhEQUFvQixDQUFBO0lBQ3BCLGdEQUFhLENBQUE7SUFDYiw4REFBb0IsQ0FBQTtJQUNwQixnRUFBcUIsQ0FBQTtJQUNyQixzRUFBd0IsQ0FBQTtBQUM1QixDQUFDLEVBbkJJLFFBQVEsS0FBUixRQUFRLFFBbUJaO0FBRUQsU0FBUyxXQUFXLENBQUMsS0FBZTtJQUNoQyxRQUFRLEtBQUssRUFBRTtRQUNYLEtBQUssUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sT0FBTyxDQUFDO1FBQ3BDLEtBQUssUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sU0FBUyxDQUFDO1FBQ3hDLEtBQUssUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sU0FBUyxDQUFDO1FBQ3hDLEtBQUssUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sWUFBWSxDQUFDO1FBQzlDLEtBQUssUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sYUFBYSxDQUFDO1FBQ2hELEtBQUssUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sYUFBYSxDQUFDO1FBQ2hELEtBQUssUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sY0FBYyxDQUFDO1FBQ2xELEtBQUssUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sY0FBYyxDQUFDO1FBQ2xELEtBQUssUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sT0FBTyxDQUFDO1FBQ3BDLEtBQUssUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sY0FBYyxDQUFDO1FBQ2xELEtBQUssUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLE9BQU8saUJBQWlCLENBQUM7UUFDeEQsS0FBSyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxVQUFVLENBQUM7UUFDMUMsS0FBSyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsT0FBTyxpQkFBaUIsQ0FBQztRQUN4RCxLQUFLLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLE9BQU8sa0JBQWtCLENBQUM7UUFDMUQsS0FBSyxRQUFRLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxPQUFPLHFCQUFxQixDQUFDO0tBQ25FO0lBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBZSxLQUFLLE1BQUcsQ0FBQyxDQUFDO0FBQzdDLENBQUM7QUFjRDs7R0FFRztBQUNILElBQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQztBQUV4Qjs7R0FFRztBQUNILElBQU0sU0FBUyxHQUFHLDBDQUEwQyxDQUFDO0FBRTdELDZDQUE2QztBQUM3Qyw2Q0FBNkM7QUFDN0Msc0NBQXNDO0FBQ3RDLElBQU0sY0FBYyxHQUFHLGdCQUFnQixDQUFDO0FBRXhDOztHQUVHO0FBQ0gsU0FBUyxLQUFLLENBQUMsQ0FBUyxFQUFFLGNBQXNCO0lBQzVDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsS0FBSyxjQUFjLEVBQUU7UUFDL0QsNENBQTRDO1FBQzVDLE9BQU8sQ0FBQyxDQUFDO0tBQ1o7U0FDSTtRQUNELHNCQUFzQjtRQUN0QixPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQzNEO0FBQ0wsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyx1QkFBdUIsQ0FBQyxTQUFpQixFQUFFLE9BQXFCO0lBQXJCLHdCQUFBLEVBQUEsWUFBcUI7SUFDckUscURBQXFEO0lBQ3JELElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFO1FBQ3pCLE9BQU8sU0FBUyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQztLQUNwRDtJQUNELHNDQUFzQztJQUN0QyxPQUFPLFNBQVMsQ0FBQztBQUNyQixDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBZ0IsWUFBWSxDQUFDLElBQVU7SUFDbkMsSUFBTSxNQUFNLEdBQWMsRUFBRSxDQUFDO0lBQzdCLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQUEsS0FBSyxJQUFJLE9BQUEsS0FBSyxDQUFDLEVBQUUsRUFBUixDQUFRLENBQUMsQ0FBQztJQUNwRCxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDOzRCQUNYLE1BQU07UUFDYixJQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQUEsT0FBTyxJQUFJLE9BQUEsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFmLENBQWUsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7O0lBRnJCLEtBQXFCLFVBQVksRUFBWixLQUFBLElBQUksQ0FBQyxPQUFPLEVBQVosY0FBWSxFQUFaLElBQVk7UUFBNUIsSUFBTSxNQUFNLFNBQUE7Z0JBQU4sTUFBTTtLQUdoQjtJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2xCLENBQUM7QUFURCxvQ0FTQztBQUVEO0dBQ0c7QUFDSCxTQUFTLHVCQUF1QixDQUFDLE9BQWlCO0lBQzlDLHVDQUF1QztJQUN2QyxJQUFNLE9BQU8sR0FBc0I7UUFDL0IsS0FBSyxFQUFFLEtBQUs7UUFDWixNQUFNLEVBQUUsSUFBSTtRQUNaLFFBQVEsRUFBRSxFQUFFO1FBQ1osU0FBUyxFQUFFLEtBQUs7UUFDaEIsUUFBUSxFQUFFLENBQUM7UUFDWCxJQUFJLEVBQUUsSUFBSTtLQUNiLENBQUM7SUFDRixJQUFJLE9BQU8sRUFBRTtRQUNULElBQUksT0FBTyxPQUFPLENBQUMsY0FBYyxLQUFLLFFBQVEsRUFBRTtZQUM1QyxRQUFRLE9BQU8sQ0FBQyxjQUFjLEVBQUU7Z0JBQzVCLEtBQUssS0FBSyxDQUFDO2dCQUNYLEtBQUssU0FBUyxDQUFDLENBQUM7b0JBQ1osT0FBTyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDO29CQUN2QyxNQUFNO2lCQUNUO2dCQUNELE9BQU8sQ0FBQyxDQUFDO29CQUNMLE1BQU0sSUFBSSxLQUFLLENBQUMsd0NBQXNDLE9BQU8sQ0FBQyxjQUFjLE1BQUcsQ0FBQyxDQUFDO2lCQUNwRjthQUNKO1NBQ0o7UUFDRCxJQUFJLE9BQU8sT0FBTyxDQUFDLG9CQUFvQixLQUFLLFNBQVMsRUFBRTtZQUNuRCxPQUFPLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQztTQUNqRDtRQUNELElBQUksT0FBTyxPQUFPLENBQUMsY0FBYyxLQUFLLFFBQVEsRUFBRTtZQUM1QyxRQUFRLE9BQU8sQ0FBQyxjQUFjLEVBQUU7Z0JBQzVCLEtBQUssRUFBRSxDQUFDO2dCQUNSLEtBQUssRUFBRSxDQUFDO2dCQUNSLEtBQUssSUFBSSxDQUFDLENBQUM7b0JBQ1AsT0FBTyxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7b0JBQ3RCLE1BQU07aUJBQ1Q7Z0JBQ0QsT0FBTyxDQUFDLENBQUM7b0JBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyx1Q0FBcUMsT0FBTyxDQUFDLGNBQWMsTUFBRyxDQUFDLENBQUM7aUJBQ25GO2FBQ0o7U0FDSjtRQUNELElBQUksT0FBTyxPQUFPLENBQUMsU0FBUyxLQUFLLFFBQVEsRUFBRTtZQUN2QyxRQUFRLE9BQU8sQ0FBQyxTQUFTLEVBQUU7Z0JBQ3ZCLEtBQUssSUFBSSxDQUFDO2dCQUNWLEtBQUssS0FBSyxDQUFDLENBQUM7b0JBQ1IsT0FBTyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDO29CQUN0QyxNQUFNO2lCQUNUO2dCQUNELE9BQU8sQ0FBQyxDQUFDO29CQUNMLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWdDLE9BQU8sQ0FBQyxTQUFTLE1BQUcsQ0FBQyxDQUFDO2lCQUN6RTthQUNKO1NBQ0o7UUFDRCxJQUFJLE9BQU8sT0FBTyxDQUFDLGVBQWUsS0FBSyxRQUFRLEVBQUU7WUFDN0MsT0FBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDO1NBQzlDO1FBQ0QsSUFBSSxPQUFPLE9BQU8sQ0FBQyxVQUFVLEtBQUssU0FBUyxFQUFFO1lBQ3pDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQztTQUNyQztLQUNKO0lBQ0QsT0FBTyxPQUFPLENBQUM7QUFDbkIsQ0FBQztBQUVELGVBQWU7QUFDZixFQUFFO0FBQ0Ysc0JBQXNCO0FBQ3RCLEVBQUU7QUFDRixtRUFBbUU7QUFDbkUsNkNBQTZDO0FBRTdDOztHQUVHO0FBQ0gsU0FBZ0IsU0FBUyxDQUFDLElBQXNCLEVBQUUsT0FBaUI7SUFDL0QsSUFBTSxDQUFDLEdBQWMsQ0FBQyxJQUFJLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pFLElBQU0sT0FBTyxHQUFHLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRWpELElBQU0sYUFBYSxHQUFHLFVBQVUsS0FBNkI7UUFDekQsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFO1lBQ2hCLHVDQUF1QztZQUN2QyxLQUFLLEdBQUcsRUFBRSxDQUFDO1NBQ2Q7YUFDSSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQzlELElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtnQkFDaEIsNkNBQTZDO2dCQUM3QyxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDckM7WUFDRCxxQ0FBcUM7WUFDckMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxTQUFTLEdBQUcsS0FBSyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7U0FDekQ7YUFDSSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRTtZQUNoQywyQkFBMkI7WUFDM0IsS0FBSyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDOUI7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDLENBQUM7SUFFRjs7T0FFRztJQUNILElBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQztJQUVuQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ2xDOztXQUVHO1FBQ0gsSUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXBCOztXQUVHO1FBQ0gsSUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBRW5CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkM7O2VBRUc7WUFDSCxJQUFJLFdBQVcsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0Msb0RBQW9EO1lBQ3BELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRTtnQkFDM0IsU0FBUyxJQUFJLFdBQVcsQ0FBQztnQkFDekIsU0FBUyxJQUFJLFNBQVMsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO2dCQUMxQyxTQUFTLEdBQUcsRUFBRSxDQUFDO2FBQ2xCO2lCQUNJO2dCQUNELDJDQUEyQztnQkFDM0MsU0FBUyxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO2FBQzVDO1NBQ0o7S0FDSjtJQUVELE9BQU8sU0FBUyxDQUFDO0FBQ3JCLENBQUM7QUE1REQsOEJBNERDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLG9CQUFvQixDQUFDLE9BQWUsRUFBRSxPQUFpQjtJQUM1RCwrREFBK0Q7SUFDL0Qsb0NBQW9DO0lBQ3BDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUU7UUFDbEQsT0FBTyxHQUFHLHVCQUF1QixDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztLQUN2RDtJQUVELElBQU0sT0FBTyxHQUFHLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRWpELDZCQUE2QjtJQUM3QixPQUFPLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLE9BQU8sU0FBQSxFQUFFLENBQUM7QUFDNUQsQ0FBQztBQUVEOzs7R0FHRztBQUNILFNBQWdCLEtBQUssQ0FBQyxPQUFlLEVBQUUsT0FBaUIsRUFBRSxNQUFtQjtJQUVuRSxJQUFBLEtBQWlCLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsRUFBckQsQ0FBQyxPQUFBLEVBQUUsT0FBTyxhQUEyQyxDQUFDO0lBRTlELElBQUksS0FBSyxHQUFhLFFBQVEsQ0FBQyxLQUFLLENBQUM7SUFDckM7OztPQUdHO0lBQ0gsSUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUV6Qjs7T0FFRztJQUNILElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQztJQUVaLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQztJQUN4Qjs7T0FFRztJQUNILElBQUksVUFBVSxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztJQUV6Qzs7T0FFRztJQUNILElBQUksS0FBSyxHQUFVLEVBQUUsQ0FBQztJQUV0Qjs7T0FFRztJQUNILElBQUksR0FBRyxHQUFZLEVBQUUsQ0FBQztJQUV0Qjs7T0FFRztJQUNILElBQUksR0FBRyxHQUFjLEVBQUUsQ0FBQztJQUV4Qjs7T0FFRztJQUNILElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQztJQUViOztPQUVHO0lBQ0gsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBRWY7O09BRUc7SUFDSCxJQUFNLFVBQVUsR0FBRyxVQUFVLGFBQXFCO1FBQzlDLElBQUksV0FBVyxFQUFFO1lBQ2IsT0FBTyxhQUFhLENBQUM7U0FDeEI7YUFDSTtZQUNELGdDQUFnQztZQUNoQyxJQUFJLGFBQWEsS0FBSyxFQUFFLEVBQUU7Z0JBQ3RCLE9BQU8sSUFBSSxDQUFDO2dCQUNaLGtFQUFrRTthQUNyRTtpQkFDSSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7Z0JBQ25CLGFBQWEsR0FBRyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUM7YUFDeEM7WUFFRCxzREFBc0Q7WUFDdEQsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFO2dCQUM3QixPQUFPLFFBQVEsQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDdEM7aUJBQ0ksSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFO2dCQUNwQyxPQUFPLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQzthQUNwQztpQkFDSTtnQkFDRCxvREFBb0Q7Z0JBQ3BELE9BQU8sYUFBYSxDQUFDO2FBQ3hCO1NBQ0o7SUFDTCxDQUFDLENBQUM7SUFFRixJQUFNLEtBQUssR0FBRyxVQUFVLENBQVc7UUFDL0IsSUFBSSxNQUFNLEVBQUU7WUFDUixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2xCO2FBQ0k7WUFDRCxNQUFNLENBQUMsQ0FBQztTQUNYO0lBQ0wsQ0FBQyxDQUFDO0lBRUYsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ2pDLEVBQUUsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWpCLFFBQVEsS0FBSyxFQUFFO1lBQ1gsS0FBSyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ2pCLFFBQVEsRUFBRSxFQUFFO29CQUNSLEtBQUssR0FBRyxDQUFDLENBQUM7d0JBQ04scUJBQXFCO3dCQUNyQixNQUFNO3FCQUNUO29CQUNELEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDLENBQUM7d0JBQ04sS0FBSyxJQUFJLEVBQUUsQ0FBQzt3QkFDWixLQUFLLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQzt3QkFDekIsTUFBTTtxQkFDVDtvQkFDRCxLQUFLLEtBQUssQ0FBQyxDQUFDO3dCQUNSLFVBQVUsR0FBRyxDQUFDLENBQUM7d0JBQ2YsS0FBSyxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUM7d0JBQzlCLE1BQU07cUJBQ1Q7b0JBQ0QsS0FBSyxJQUFJLENBQUMsQ0FBQzt3QkFDUCxLQUFLLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQzt3QkFDN0IsTUFBTTtxQkFDVDtvQkFDRCxLQUFLLElBQUksQ0FBQyxDQUFDO3dCQUNQLEtBQUssR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO3dCQUN6QixNQUFNO3FCQUNUO29CQUNELEtBQUssS0FBSyxDQUFDLENBQUM7d0JBQ1IsS0FBSyxJQUFJLEVBQUUsQ0FBQzt3QkFDWixLQUFLLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUFDO3dCQUNsQyxNQUFNO3FCQUNUO29CQUNELE9BQU8sQ0FBQyxDQUFDO3dCQUNMLEtBQUssSUFBSSxFQUFFLENBQUM7d0JBQ1osS0FBSyxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUM7cUJBQ3BDO2lCQUNKO2dCQUNELE1BQU07YUFDVDtZQUNELEtBQUssUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNuQixRQUFRLEVBQUUsRUFBRTtvQkFDUixLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQyxDQUFDO3dCQUNOLEtBQUssSUFBSSxFQUFFLENBQUM7d0JBQ1osTUFBTTtxQkFDVDtvQkFDRCxLQUFLLEdBQUcsQ0FBQyxDQUFDO3dCQUNOLEtBQUssSUFBSSxFQUFFLENBQUM7d0JBQ1osS0FBSyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7d0JBQ3pCLE1BQU07cUJBQ1Q7b0JBQ0QsS0FBSyxHQUFHLENBQUMsQ0FBQzt3QkFDTixLQUFLLElBQUksRUFBRSxDQUFDO3dCQUNaLEtBQUssR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFDO3dCQUM5QixNQUFNO3FCQUNUO29CQUNELEtBQUssR0FBRyxDQUFDLENBQUM7d0JBQ04sS0FBSyxJQUFJLEVBQUUsQ0FBQzt3QkFDWixLQUFLLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQzt3QkFDMUIsTUFBTTtxQkFDVDtvQkFDRCxLQUFLLEtBQUssQ0FBQyxDQUFDO3dCQUNSLEtBQUssR0FBRyxVQUFVLENBQUMsS0FBZSxDQUFDLENBQUM7d0JBQ3BDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQ2hCLEtBQUssR0FBRyxFQUFFLENBQUM7d0JBQ1gsS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUM7d0JBQ3ZCLE1BQU07cUJBQ1Q7b0JBQ0QsS0FBSyxJQUFJLENBQUMsQ0FBQzt3QkFDUCxJQUFNLEdBQUcsR0FBRyxtQkFBUSxDQUFDLG9CQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3JDLEtBQUssQ0FBQyxJQUFJLG1CQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQzt3QkFDekQsTUFBTTtxQkFDVDtvQkFDRCxLQUFLLEtBQUssQ0FBQyxDQUFDO3dCQUNSLElBQU0sR0FBRyxHQUFHLG1CQUFRLENBQUMsb0JBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDckMsS0FBSyxDQUFDLElBQUksbUJBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO3dCQUN6RCxNQUFNO3FCQUNUO29CQUNELEtBQUssS0FBSyxDQUFDLENBQUM7d0JBQ1IsS0FBSyxHQUFHLFVBQVUsQ0FBQyxLQUFlLENBQUMsQ0FBQzt3QkFDcEMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDaEIsS0FBSyxHQUFHLEVBQUUsQ0FBQzt3QkFDWCxLQUFLLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixDQUFDO3dCQUNyQyxNQUFNO3FCQUNUO29CQUNELEtBQUssRUFBRSxDQUFDLENBQUM7d0JBQ0wsS0FBSyxHQUFHLFVBQVUsQ0FBQyxLQUFlLENBQUMsQ0FBQzt3QkFDcEMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDaEIsS0FBSyxHQUFHLEVBQUUsQ0FBQzt3QkFDWCxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUNkLEdBQUcsR0FBRyxFQUFFLENBQUM7d0JBQ1QsS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUM7d0JBQ3ZCLE1BQU07cUJBQ1Q7b0JBQ0QsS0FBSyxFQUFFLENBQUMsQ0FBQzt3QkFDTCw4QkFBOEI7d0JBQzlCLEtBQUssR0FBRyxVQUFVLENBQUMsS0FBZSxDQUFDLENBQUM7d0JBQ3BDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQ2hCLEtBQUssR0FBRyxFQUFFLENBQUM7d0JBQ1gsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDZCxHQUFHLEdBQUcsRUFBRSxDQUFDO3dCQUNULEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDO3dCQUN2QixNQUFNO3FCQUNUO29CQUNELE9BQU8sQ0FBQyxDQUFDO3dCQUNMLElBQU0sR0FBRyxHQUFHLG1CQUFRLENBQUMsb0JBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDckMsS0FBSyxDQUFDLElBQUksbUJBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO3FCQUM1RDtpQkFDSjtnQkFDRCxNQUFNO2FBQ1Q7WUFDRCxLQUFLLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUM1QixRQUFRLEVBQUUsRUFBRTtvQkFDUixLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQyxDQUFDO3dCQUNOLEtBQUssSUFBSSxFQUFFLENBQUM7d0JBQ1osTUFBTTtxQkFDVDtvQkFDRCxLQUFLLEdBQUcsQ0FBQyxDQUFDO3dCQUNOLEtBQUssSUFBSSxFQUFFLENBQUM7d0JBQ1osS0FBSyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7d0JBQ3pCLE1BQU07cUJBQ1Q7b0JBQ0QsT0FBTyxDQUFDLENBQUM7d0JBQ0wsSUFBTSxHQUFHLEdBQUcsbUJBQVEsQ0FBQyxvQkFBUyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNyQyxLQUFLLENBQUMsSUFBSSxtQkFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7cUJBQzVEO2lCQUNKO2dCQUNELE1BQU07YUFDVDtZQUNELEtBQUssUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNuQixRQUFRLEVBQUUsRUFBRTtvQkFDUixLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQyxDQUFDO3dCQUNOLEtBQUssSUFBSSxFQUFFLENBQUM7d0JBQ1osTUFBTTtxQkFDVDtvQkFDRCxLQUFLLEdBQUcsQ0FBQyxDQUFDO3dCQUNOLEtBQUssSUFBSSxFQUFFLENBQUM7d0JBQ1osS0FBSyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUM7d0JBQzFCLE1BQU07cUJBQ1Q7b0JBQ0QsS0FBSyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQ2hCLEtBQUssR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQzFCLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQ2hCLEtBQUssR0FBRyxFQUFFLENBQUM7d0JBQ1gsS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUM7d0JBQ3ZCLE1BQU07cUJBQ1Q7b0JBQ0QsS0FBSyxJQUFJLENBQUMsQ0FBQzt3QkFDUCxJQUFNLEdBQUcsR0FBRyxtQkFBUSxDQUFDLG9CQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3JDLEtBQUssQ0FBQyxJQUFJLG1CQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQzt3QkFDekQsTUFBTTtxQkFDVDtvQkFDRCxLQUFLLEtBQUssQ0FBQyxDQUFDO3dCQUNSLElBQU0sR0FBRyxHQUFHLG1CQUFRLENBQUMsb0JBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDckMsS0FBSyxDQUFDLElBQUksbUJBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO3dCQUN6RCxNQUFNO3FCQUNUO29CQUNELEtBQUssS0FBSyxDQUFDLENBQUM7d0JBQ1IsS0FBSyxHQUFHLFVBQVUsQ0FBQyxLQUFlLENBQUMsQ0FBQzt3QkFDcEMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDaEIsS0FBSyxHQUFHLEVBQUUsQ0FBQzt3QkFDWCxLQUFLLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixDQUFDO3dCQUNyQyxNQUFNO3FCQUNUO29CQUNELE9BQU8sQ0FBQyxDQUFDO3dCQUNMLElBQU0sR0FBRyxHQUFHLG1CQUFRLENBQUMsb0JBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDckMsS0FBSyxDQUFDLElBQUksbUJBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO3FCQUM1RDtpQkFDSjtnQkFDRCxNQUFNO2FBQ1Q7WUFDRCxLQUFLLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDdkIsUUFBUSxFQUFFLEVBQUU7b0JBQ1IsS0FBSyxJQUFJLENBQUMsQ0FBQzt3QkFDUCxLQUFLLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQzt3QkFDN0IsTUFBTTtxQkFDVDtvQkFDRCxPQUFPLENBQUMsQ0FBQzt3QkFDTCxLQUFLLElBQUksRUFBRSxDQUFDO3dCQUNaLE1BQU07cUJBQ1Q7aUJBQ0o7Z0JBQ0QsTUFBTTthQUNUO1lBQ0QsS0FBSyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ3hCLFFBQVEsRUFBRSxFQUFFO29CQUNSLEtBQUssS0FBSyxDQUFDLENBQUM7d0JBQ1IsS0FBSyxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUM7d0JBQzlCLE1BQU07cUJBQ1Q7b0JBQ0QsT0FBTyxDQUFDLENBQUM7d0JBQ0wsS0FBSyxJQUFJLEVBQUUsQ0FBQzt3QkFDWixNQUFNO3FCQUNUO2lCQUNKO2dCQUNELE1BQU07YUFDVDtZQUNELEtBQUssUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUN4QixRQUFRLEVBQUUsRUFBRTtvQkFDUixLQUFLLEtBQUssQ0FBQyxDQUFDO3dCQUNSLEtBQUssSUFBSSxFQUFFLENBQUM7d0JBQ1osS0FBSyxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUM7d0JBQzlCLE1BQU07cUJBQ1Q7b0JBQ0QsS0FBSyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQ2hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQ2hCLEtBQUssR0FBRyxFQUFFLENBQUM7d0JBQ1gsS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUM7d0JBQ3ZCLE1BQU07cUJBQ1Q7b0JBQ0QsS0FBSyxFQUFFLENBQUMsQ0FBQzt3QkFDTCxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUNoQixLQUFLLEdBQUcsRUFBRSxDQUFDO3dCQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ2QsR0FBRyxHQUFHLEVBQUUsQ0FBQzt3QkFDVCxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQzt3QkFDdkIsTUFBTTtxQkFDVDtvQkFDRCxPQUFPLENBQUMsQ0FBQzt3QkFDTCxJQUFNLEdBQUcsR0FBRyxtQkFBUSxDQUFDLG9CQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3JDLEtBQUssQ0FBQyxJQUFJLG1CQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztxQkFDNUQ7aUJBQ0o7Z0JBQ0QsTUFBTTthQUNUO1lBQ0QsS0FBSyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQ3ZCLFFBQVEsRUFBRSxFQUFFO29CQUNSLEtBQUssSUFBSSxDQUFDLENBQUM7d0JBQ1AsS0FBSyxJQUFJLEVBQUUsQ0FBQzt3QkFDWixLQUFLLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQzt3QkFDN0IsTUFBTTtxQkFDVDtvQkFDRCxLQUFLLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDaEIsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDaEIsS0FBSyxHQUFHLEVBQUUsQ0FBQzt3QkFDWCxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQzt3QkFDdkIsTUFBTTtxQkFDVDtvQkFDRCxLQUFLLEVBQUUsQ0FBQyxDQUFDO3dCQUNMLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQ2hCLEtBQUssR0FBRyxFQUFFLENBQUM7d0JBQ1gsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDZCxHQUFHLEdBQUcsRUFBRSxDQUFDO3dCQUNULEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDO3dCQUN2QixNQUFNO3FCQUNUO29CQUNELE9BQU8sQ0FBQyxDQUFDO3dCQUNMLElBQU0sR0FBRyxHQUFHLG1CQUFRLENBQUMsb0JBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDckMsS0FBSyxDQUFDLElBQUksbUJBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO3FCQUM1RDtpQkFDSjtnQkFDRCxNQUFNO2FBQ1Q7WUFDRCxLQUFLLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDakIsUUFBUSxFQUFFLEVBQUU7b0JBQ1IsS0FBSyxHQUFHLENBQUM7b0JBQ1QsS0FBSyxHQUFHLENBQUM7b0JBQ1QsS0FBSyxHQUFHLENBQUM7b0JBQ1QsS0FBSyxHQUFHLENBQUM7b0JBQ1QsS0FBSyxHQUFHLENBQUM7b0JBQ1QsS0FBSyxHQUFHLENBQUM7b0JBQ1QsS0FBSyxHQUFHLENBQUM7b0JBQ1QsS0FBSyxHQUFHLENBQUM7b0JBQ1QsS0FBSyxHQUFHLENBQUM7b0JBQ1QsS0FBSyxHQUFHLENBQUMsQ0FBQzt3QkFDTixLQUFLLElBQUksRUFBRSxDQUFDO3dCQUNaLEtBQUssR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO3dCQUN6QixNQUFNO3FCQUNUO29CQUNELEtBQUssS0FBSyxDQUFDLENBQUM7d0JBQ1IsTUFBTTtxQkFDVDtvQkFDRCxLQUFLLElBQUksQ0FBQyxDQUFDO3dCQUNQLEtBQUssR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO3dCQUN6QixNQUFNO3FCQUNUO29CQUNELEtBQUssS0FBSyxDQUFDLENBQUM7d0JBQ1IsS0FBSyxJQUFJLEVBQUUsQ0FBQzt3QkFDWixLQUFLLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUFDO3dCQUNsQyxNQUFNO3FCQUNUO29CQUNELEtBQUssS0FBSyxDQUFDLENBQUM7d0JBQ1IsVUFBVSxHQUFHLENBQUMsQ0FBQzt3QkFDZixLQUFLLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQzt3QkFDOUIsTUFBTTtxQkFDVDtvQkFDRCxLQUFLLElBQUksQ0FBQyxDQUFDO3dCQUNQLFVBQVUsR0FBRyxDQUFDLENBQUM7d0JBQ2YsS0FBSyxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUM7d0JBQzdCLE1BQU07cUJBQ1Q7b0JBQ0QsT0FBTyxDQUFDLENBQUM7d0JBQ0wsS0FBSyxJQUFJLEVBQUUsQ0FBQzt3QkFDWixLQUFLLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQztxQkFDcEM7aUJBQ0o7Z0JBQ0QsTUFBTTthQUNUO1lBQ0QsS0FBSyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ3hCLFFBQVEsRUFBRSxFQUFFO29CQUNSLEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDLENBQUM7d0JBQ04sS0FBSyxJQUFJLEVBQUUsQ0FBQzt3QkFDWixNQUFNO3FCQUNUO29CQUNELEtBQUssRUFBRSxDQUFDLENBQUM7d0JBQ0wsS0FBSyxHQUFHLFVBQVUsQ0FBQyxLQUFlLENBQUMsQ0FBQzt3QkFDcEMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDaEIsS0FBSyxHQUFHLEVBQUUsQ0FBQzt3QkFDWCxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUNkLEdBQUcsR0FBRyxFQUFFLENBQUM7d0JBQ1QsS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUM7d0JBQ3ZCLE1BQU07cUJBQ1Q7b0JBQ0QsS0FBSyxFQUFFLENBQUMsQ0FBQzt3QkFDTCw4QkFBOEI7d0JBQzlCLEtBQUssR0FBRyxVQUFVLENBQUMsS0FBZSxDQUFDLENBQUM7d0JBQ3BDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQ2hCLEtBQUssR0FBRyxFQUFFLENBQUM7d0JBQ1gsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDZCxHQUFHLEdBQUcsRUFBRSxDQUFDO3dCQUNULEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDO3dCQUN2QixNQUFNO3FCQUNUO29CQUNELE9BQU8sQ0FBQyxDQUFDO3dCQUNMLElBQU0sR0FBRyxHQUFHLG1CQUFRLENBQUMsb0JBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDckMsS0FBSyxDQUFDLElBQUksbUJBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO3FCQUM1RDtpQkFDSjtnQkFDRCxNQUFNO2FBQ1Q7WUFDRCxLQUFLLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDM0IsUUFBUSxFQUFFLEVBQUU7b0JBQ1IsS0FBSyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQ2hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQ2hCLEtBQUssR0FBRyxFQUFFLENBQUM7d0JBQ1gsS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUM7d0JBQ3ZCLE1BQU07cUJBQ1Q7b0JBQ0QsS0FBSyxFQUFFLENBQUMsQ0FBQzt3QkFDTCxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUNoQixLQUFLLEdBQUcsRUFBRSxDQUFDO3dCQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ2QsR0FBRyxHQUFHLEVBQUUsQ0FBQzt3QkFDVCxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQzt3QkFDdkIsTUFBTTtxQkFDVDtvQkFDRCxLQUFLLEVBQUUsQ0FBQyxDQUFDO3dCQUNMLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQ2hCLEtBQUssR0FBRyxFQUFFLENBQUM7d0JBQ1gsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDZCxHQUFHLEdBQUcsRUFBRSxDQUFDO3dCQUNULEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDO3dCQUN2QixNQUFNO3FCQUNUO29CQUNELE9BQU8sQ0FBQyxDQUFDO3dCQUNMLEtBQUssSUFBSSxFQUFFLENBQUM7cUJBQ2Y7aUJBQ0o7Z0JBQ0QsTUFBTTthQUNUO1lBQ0QsS0FBSyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3BCLFFBQVEsRUFBRSxFQUFFO29CQUNSLEtBQUssSUFBSSxDQUFDO29CQUNWLEtBQUssS0FBSyxDQUFDLENBQUM7d0JBQ1IsS0FBSyxJQUFJLEVBQUUsQ0FBQzt3QkFDWixLQUFLLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQzt3QkFDakMsTUFBTTtxQkFDVDtvQkFDRCxLQUFLLEtBQUssQ0FBQyxDQUFDO3dCQUNSLEtBQUssR0FBRyxVQUFVLENBQUMsS0FBZSxDQUFDLENBQUM7d0JBQ3BDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQ2hCLEtBQUssR0FBRyxFQUFFLENBQUM7d0JBQ1gsS0FBSyxHQUFHLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQzt3QkFDckMsTUFBTTtxQkFDVDtvQkFDRCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQztvQkFDVCxLQUFLLEdBQUcsQ0FBQyxDQUFDO3dCQUNOLEtBQUssSUFBSSxFQUFFLENBQUM7d0JBQ1osTUFBTTtxQkFDVDtvQkFDRCxPQUFPLENBQUMsQ0FBQzt3QkFDTCxJQUFNLEdBQUcsR0FBRyxtQkFBUSxDQUFDLG9CQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3JDLEtBQUssQ0FBQyxJQUFJLG1CQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztxQkFDNUQ7aUJBQ0o7Z0JBQ0QsTUFBTTthQUNUO1lBQ0QsS0FBSyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQzNCLFFBQVEsRUFBRSxFQUFFO29CQUNSLEtBQUssS0FBSyxDQUFDLENBQUM7d0JBQ1IsS0FBSyxHQUFHLFVBQVUsQ0FBQyxLQUFlLENBQUMsQ0FBQzt3QkFDcEMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDaEIsS0FBSyxHQUFHLEVBQUUsQ0FBQzt3QkFDWCxLQUFLLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixDQUFDO3dCQUNyQyxNQUFNO3FCQUNUO29CQUNELEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDO29CQUNULEtBQUssR0FBRyxDQUFDLENBQUM7d0JBQ04sS0FBSyxJQUFJLEVBQUUsQ0FBQzt3QkFDWixNQUFNO3FCQUNUO29CQUNELEtBQUssRUFBRSxDQUFDLENBQUM7d0JBQ0wsS0FBSyxHQUFHLFVBQVUsQ0FBQyxLQUFlLENBQUMsQ0FBQzt3QkFDcEMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDaEIsS0FBSyxHQUFHLEVBQUUsQ0FBQzt3QkFDWCxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUNkLEdBQUcsR0FBRyxFQUFFLENBQUM7d0JBQ1QsS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUM7d0JBQ3ZCLE1BQU07cUJBQ1Q7b0JBQ0QsS0FBSyxFQUFFLENBQUMsQ0FBQzt3QkFDTCxLQUFLLEdBQUcsVUFBVSxDQUFDLEtBQWUsQ0FBQyxDQUFDO3dCQUNwQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUNoQixLQUFLLEdBQUcsRUFBRSxDQUFDO3dCQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ2QsR0FBRyxHQUFHLEVBQUUsQ0FBQzt3QkFDVCxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQzt3QkFDdkIsTUFBTTtxQkFDVDtvQkFDRCxPQUFPLENBQUMsQ0FBQzt3QkFDTCxJQUFNLEdBQUcsR0FBRyxtQkFBUSxDQUFDLG9CQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3JDLEtBQUssQ0FBQyxJQUFJLG1CQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztxQkFDNUQ7aUJBQ0o7Z0JBQ0QsTUFBTTthQUNUO1lBQ0QsS0FBSyxRQUFRLENBQUMsbUJBQW1CLENBQUMsQ0FBQztnQkFDL0IsUUFBUSxFQUFFLEVBQUU7b0JBQ1IsS0FBSyxHQUFHLENBQUM7b0JBQ1QsS0FBSyxHQUFHLENBQUM7b0JBQ1QsS0FBSyxHQUFHLENBQUM7b0JBQ1QsS0FBSyxHQUFHLENBQUM7b0JBQ1QsS0FBSyxHQUFHLENBQUM7b0JBQ1QsS0FBSyxHQUFHLENBQUM7b0JBQ1QsS0FBSyxHQUFHLENBQUM7b0JBQ1QsS0FBSyxHQUFHLENBQUM7b0JBQ1QsS0FBSyxHQUFHLENBQUM7b0JBQ1QsS0FBSyxHQUFHLENBQUMsQ0FBQzt3QkFDTixJQUFNLEdBQUcsR0FBRyxtQkFBUSxDQUFDLG9CQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3JDLEtBQUssQ0FBQyxJQUFJLG1CQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQzt3QkFDekQsTUFBTTtxQkFDVDtvQkFDRCxPQUFPLENBQUMsQ0FBQzt3QkFDTCxJQUFNLEdBQUcsR0FBRyxtQkFBUSxDQUFDLG9CQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3JDLEtBQUssQ0FBQyxJQUFJLG1CQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztxQkFDNUQ7aUJBQ0o7Z0JBQ0QsTUFBTTthQUNUO1lBQ0QsT0FBTyxDQUFDLENBQUM7Z0JBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBb0IsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFPLENBQUMsYUFBUSxDQUFHLENBQUMsQ0FBQzthQUM5RTtTQUNKO0tBQ0o7SUFFRCx1Q0FBdUM7SUFDdkMsUUFBUSxLQUFLLEVBQUU7UUFDWCxLQUFLLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuQixxQkFBcUI7WUFDckIsS0FBSyxHQUFHLFVBQVUsQ0FBQyxLQUFlLENBQUMsQ0FBQztZQUNwQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hCLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDWCxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2QsR0FBRyxHQUFHLEVBQUUsQ0FBQztZQUNULE1BQU07U0FDVDtRQUNELEtBQUssUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25CLHFCQUFxQjtZQUNyQixLQUFLLEdBQUcsVUFBVSxDQUFDLEtBQWUsQ0FBQyxDQUFDO1lBQ3BDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEIsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDZCxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQ1QsTUFBTTtTQUNUO1FBQ0QsS0FBSyxRQUFRLENBQUMsUUFBUSxDQUFDO1FBQ3ZCLEtBQUssUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzNCLHFCQUFxQjtZQUNyQixLQUFLLEdBQUcsVUFBVSxDQUFDLEtBQWUsQ0FBQyxDQUFDO1lBQ3BDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEIsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDZCxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQ1QsTUFBTTtTQUNUO1FBQ0QsS0FBSyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdkIsMkZBQTJGO1lBQzNGLHFCQUFxQjtZQUNyQixLQUFLLEdBQUcsVUFBVSxDQUFDLEtBQWUsQ0FBQyxDQUFDO1lBQ3BDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEIsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDZCxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQ1QsTUFBTTtTQUNUO1FBQ0QsS0FBSyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDeEIsc0ZBQXNGO1lBQ3RGLHFCQUFxQjtZQUNyQixLQUFLLEdBQUcsVUFBVSxDQUFDLEtBQWUsQ0FBQyxDQUFDO1lBQ3BDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEIsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDZCxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQ1QsTUFBTTtTQUNUO1FBQ0QsS0FBSyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDeEIscUJBQXFCO1lBQ3JCLEtBQUssR0FBRyxVQUFVLENBQUMsS0FBZSxDQUFDLENBQUM7WUFDcEMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNoQixLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQ1gsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNkLEdBQUcsR0FBRyxFQUFFLENBQUM7WUFDVCxNQUFNO1NBQ1Q7UUFDRCxLQUFLLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqQixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2YsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDZCxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQ1QsTUFBTTtTQUNUO1FBQ0QsS0FBSyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdkIsSUFBTSxHQUFHLEdBQUcsbUJBQVEsQ0FBQyxvQkFBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3JDLEtBQUssQ0FBQyxJQUFJLG1CQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNsRSxNQUFNO1NBQ1Q7UUFDRCxLQUFLLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN4QixJQUFNLEdBQUcsR0FBRyxtQkFBUSxDQUFDLG9CQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckMsS0FBSyxDQUFDLElBQUksbUJBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2xFLE1BQU07U0FDVDtRQUNELEtBQUssUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pCLGNBQWM7WUFDZCxNQUFNO1NBQ1Q7UUFDRCxLQUFLLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBQy9CLGNBQWM7WUFDZCxNQUFNO1NBQ1Q7UUFDRCxPQUFPLENBQUMsQ0FBQztZQUNMLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQXdCLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBSSxDQUFHLENBQUMsQ0FBQztTQUN0RTtLQUNKO0lBRUQsNkNBQTZDO0lBQzdDLElBQUksT0FBTyxDQUFDLFFBQVE7UUFBRSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFeEQsT0FBTyxHQUFHLENBQUM7QUFDZixDQUFDO0FBeHJCRCxzQkF3ckJDIn0=