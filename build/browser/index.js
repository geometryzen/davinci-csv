(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.CSV = global.CSV || {})));
}(this, (function (exports) { 'use strict';

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
/**
 */
function normalizeDialectOptions(dialect) {
    // note lower case compared to CSV DDF.
    var options = {
        delim: ',',
        escape: true,
        lineTerm: '\n',
        quoteChar: '"',
        skipRows: 0,
        trim: true
    };
    if (dialect) {
        if (typeof dialect.fieldDelimiter === 'string') {
            options.delim = dialect.fieldDelimiter;
        }
        if (typeof dialect.escapeEmbeddedQuotes === 'boolean') {
            options.escape = dialect.escapeEmbeddedQuotes;
        }
        if (typeof dialect.lineTerminator === 'string') {
            options.lineTerm = dialect.lineTerminator;
        }
        if (typeof dialect.quoteChar === 'string') {
            options.quoteChar = dialect.quoteChar;
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
function parse(csvText, dialect) {
    var _a = normalizeInputString(csvText, dialect), s = _a.s, options = _a.options;
    /**
     * Using cached length of s will improve performance and is safe because s is constant.
     */
    var sLength = s.length;
    /**
     * The character we are currently processing.
     */
    var ch = '';
    var inQuote = false;
    var fieldQuoted = false;
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
    for (var i = 0; i < sLength; i += 1) {
        ch = s.charAt(i);
        // If we are at a EOF or EOR
        if (inQuote === false && (ch === options.delim || ch === options.lineTerm)) {
            field = parseField(field);
            // Add the current field to the current row
            row.push(field);
            // If this is EOR append row to output and flush row
            if (ch === options.lineTerm) {
                out.push(row);
                row = [];
            }
            // Flush the field buffer
            field = '';
            fieldQuoted = false;
        }
        else {
            // If it's not a quote character, add it to the field buffer
            if (ch !== options.quoteChar) {
                field += ch;
            }
            else {
                if (!inQuote) {
                    // We are not in a quote, start a quote
                    inQuote = true;
                    fieldQuoted = true;
                }
                else {
                    // Next char is quote character, this is an escaped quote character.
                    if (s.charAt(i + 1) === options.quoteChar) {
                        field += options.quoteChar;
                        // Skip the next char
                        i += 1;
                    }
                    else {
                        // It's not escaping, so end quote
                        inQuote = false;
                    }
                }
            }
        }
    }
    // Add the last field
    field = parseField(field);
    row.push(field);
    out.push(row);
    // Expose the ability to discard initial rows
    if (options.skipRows)
        out = out.slice(options.skipRows);
    return out;
}

exports.dataToArrays = dataToArrays;
exports.parse = parse;
exports.serialize = serialize;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.js.map
