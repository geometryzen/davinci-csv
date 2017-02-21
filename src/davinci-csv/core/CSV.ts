import Data from './Data';
import Dialect from './Dialect';

/**
 * The normalized dialect is lowercase and everything is required.
 * For internal conceptual integrity.
 */
interface NormalizedDialect {
    delimiter: string;
    doublequote: boolean;
    lineterminator: string;
    quotechar: string;
    skipinitialrows: number;
    skipinitialspace: boolean;
    trim?: boolean;
}

const rxIsInt = /^\d+$/;
const rxIsFloat = /^\d*\.\d+$|^\d+\.\d*$/;
// If a string has leading or trailing space,
// contains a comma double quote or a newline
// it needs to be quoted in CSV output
const rxNeedsQuoting = /^\s|\s$|,|"|\n/;

const trim = (function () {
    // Fx 3.1 has a native trim function, it's about 10x faster, use it if it exists
    if (String.prototype.trim) {
        return function (s: string) {
            return s.trim();
        };
    } else {
        return function (s: string) {
            return s.replace(/^\s*/, '').replace(/\s*$/, '');
        };
    }
}());

function chomp(s: string, lineterminator: string): string {
    if (s.charAt(s.length - lineterminator.length) !== lineterminator) {
        // Does not end with \n, just return string
        return s;
    }
    else {
        // Remove the \n
        return s.substring(0, s.length - lineterminator.length);
    }
}

function normalizeLineTerminator(csvString: string, dialect: Dialect = {}): string {
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
export function dataToArrays(data: Data): (number | string | null)[][] {
    const arrays: (string | number | null)[][] = [];
    const fieldNames: string[] = [];
    for (let ii = 0; ii < data.fields.length; ii++) {
        fieldNames.push(data.fields[ii].id);
    }
    arrays.push(fieldNames);
    for (let ii = 0; ii < data.records.length; ii++) {
        const tmp: (string | number | null)[] = [];
        const record = data.records[ii];
        for (let jj = 0; jj < fieldNames.length; jj++) {
            tmp.push(record[fieldNames[jj]]);
        }
        arrays.push(tmp);
    }
    return arrays;
}

function normalizeDialectOptions(options?: Dialect): NormalizedDialect {
    // note lower case compared to CSV DDF
    const out: NormalizedDialect = {
        delimiter: ',',
        doublequote: true,
        lineterminator: '\n',
        quotechar: '"',
        skipinitialspace: true,
        skipinitialrows: 0
    };
    if (options) {
        for (const key in options) {
            if (key === 'trim') {
                out.skipinitialspace = options.trim ? options.trim : false;
            }
            else {
                (<any>out)[key.toLowerCase()] = (<any>options)[key];
            }
        }
    }
    return out;
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
export function serialize(data: Data | (string | number | null)[][], dialect?: Dialect): string {
    const a: (string | number | null)[][] = (data instanceof Array) ? data : dataToArrays(data);
    const options = normalizeDialectOptions(dialect);

    /**
     * The fields we are currently processing.
     */
    let fields: (string | number | null)[] = [];

    /**
     * Buffer for building up the current field.
     */
    let fieldBuffer = '';
    /**
     * Buffer for building up the current row.
     */
    let rowBuffer = '';
    /**
     * Buffer for building up the output.
     */
    let outBuffer = '';

    let processField = function processedField(field: string | number | null): string {
        if (field === null) {
            // If field is null set to empty string
            field = '';
        }
        else if (typeof field === "string" && rxNeedsQuoting.test(field)) {
            if (options.doublequote) {
                field = field.replace(/"/g, '""');
            }
            // Convert string to delimited string
            field = options.quotechar + field + options.quotechar;
        }
        else if (typeof field === "number") {
            // Convert number to string
            field = field.toString(10);
        }

        return field;
    };

    for (let i = 0; i < a.length; i += 1) {
        fields = a[i];

        for (let j = 0; j < fields.length; j += 1) {
            fieldBuffer = processField(fields[j]);
            // If this is EOR append row to output and flush row
            if (j === (fields.length - 1)) {
                rowBuffer += fieldBuffer;
                outBuffer += rowBuffer + options.lineterminator;
                rowBuffer = '';
            } else {
                // Add the current field to the current row
                rowBuffer += fieldBuffer + options.delimiter;
            }
            // Flush the field buffer
            fieldBuffer = '';
        }
    }

    return outBuffer;
}

export function parse(s: string, dialect?: Dialect): (string | number | null)[][] {

    // When line terminator is not provided then we try to guess it
    // and normalize it across the file.
    if (!dialect || (dialect && !dialect.lineTerminator)) {
        s = normalizeLineTerminator(s, dialect);
    }

    // Get rid of any trailing \n
    const options = normalizeDialectOptions(dialect);
    s = chomp(s, options.lineterminator);

    /**
     * The character we are currently processing.
     */
    let cur = '';
    let inQuote = false;
    let fieldQuoted = false;

    /**
     * Buffer for building up the current field
     */
    let fieldX: string | number | null = '';
    let row: (string | number | null)[] = [];
    let out: (string | number | null)[][] = [];
    let processField = function processField(field: string): string | number | null {
        if (fieldQuoted !== true) {
            // If field is empty set to null
            if (field === '') {
                return null;
                // If the field was not quoted and we are trimming fields, trim it
            }
            else if (options.skipinitialspace === true) {
                field = trim(field);
            }

            // Convert unquoted numbers to their appropriate types
            if (rxIsInt.test(field)) {
                return parseInt(field, 10);
            }
            else if (rxIsFloat.test(field)) {
                return parseFloat(field);
            }
            else {
                return field;
            }
        }
        else {
            return field;
        }
    };

    for (let i = 0; i < s.length; i += 1) {
        cur = s.charAt(i);

        // If we are at a EOF or EOR
        if (inQuote === false && (cur === options.delimiter || cur === options.lineterminator)) {
            fieldX = processField(fieldX);
            // Add the current field to the current row
            row.push(fieldX);
            // If this is EOR append row to output and flush row
            if (cur === options.lineterminator) {
                out.push(row);
                row = [];
            }
            // Flush the field buffer
            fieldX = '';
            fieldQuoted = false;
        }
        else {
            // If it's not a quotechar, add it to the field buffer
            if (cur !== options.quotechar) {
                fieldX += cur;
            }
            else {
                if (!inQuote) {
                    // We are not in a quote, start a quote
                    inQuote = true;
                    fieldQuoted = true;
                }
                else {
                    // Next char is quotechar, this is an escaped quotechar
                    if (s.charAt(i + 1) === options.quotechar) {
                        fieldX += options.quotechar;
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
    fieldX = processField(fieldX);
    row.push(fieldX);
    out.push(row);

    // Expose the ability to discard initial rows
    if (options.skipinitialrows) out = out.slice(options.skipinitialrows);

    return out;
}
