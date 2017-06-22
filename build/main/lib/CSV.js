"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ1NWLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9DU1YudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1Q0FBc0M7QUFDdEMsdUNBQWlEO0FBMERqRCxJQUFNLEtBQUssR0FBRyxHQUFHLENBQUM7QUFDbEIsSUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDO0FBRXRCLElBQU0sRUFBRSxHQUFHLElBQUksQ0FBQztBQUNoQixJQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFDaEIsSUFBTSxJQUFJLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUNyQixJQUFNLElBQUksR0FBRyxHQUFHLENBQUM7QUFDakIsSUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDO0FBQ2xCLElBQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQztBQUNsQixJQUFNLEtBQUssR0FBRyxHQUFHLENBQUM7QUFDbEIsSUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDO0FBRWpCLElBQUssUUFtQko7QUFuQkQsV0FBSyxRQUFRO0lBQ1QseUNBQVMsQ0FBQTtJQUNULDZDQUFXLENBQUE7SUFDWCw2Q0FBVyxDQUFBO0lBQ1gsbURBQWMsQ0FBQTtJQUNkLHFEQUFlLENBQUE7SUFDZixxREFBZSxDQUFBO0lBQ2YsdURBQWdCLENBQUE7SUFDaEIsdURBQWdCLENBQUE7SUFDaEI7O09BRUc7SUFDSCx5Q0FBUyxDQUFBO0lBQ1QsdURBQWdCLENBQUE7SUFDaEIsOERBQW9CLENBQUE7SUFDcEIsZ0RBQWEsQ0FBQTtJQUNiLDhEQUFvQixDQUFBO0lBQ3BCLGdFQUFxQixDQUFBO0lBQ3JCLHNFQUF3QixDQUFBO0FBQzVCLENBQUMsRUFuQkksUUFBUSxLQUFSLFFBQVEsUUFtQlo7QUFFRCxxQkFBcUIsS0FBZTtJQUNoQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ1osS0FBSyxRQUFRLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUM7UUFD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