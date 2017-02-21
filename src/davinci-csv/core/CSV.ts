import Data from './Data';
import Dialect from './Dialect';

/**
 * For internal conceptual integrity.
 */
interface NormalizedDialect {
    delim: string;
    escape: boolean;
    lineTerm: string;
    quoteChar: string;
    skipRows: number;
    trim: boolean;
}

/**
 * Rehular expression for detecting integers.
 */
const rxIsInt = /^\d+$/;

/**
 * Regular expression for detecting floating point numbers.
 */
const rxIsFloat = /^\d*\.\d+$|^\d+\.\d*$/;
// If a string has leading or trailing space,
// contains a comma double quote or a newline
// it needs to be quoted in CSV output
const rxNeedsQuoting = /^\s|\s$|,|"|\n/;

/**
 * A polyfill in case String.trim does not exist.
 */
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

/**
 * Replaces all the funky line terminators with a single newline character.
 */
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
 * @returns An array of arrays, [][], of (number|string|null) field values.
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

function normalizeDialectOptions(dialect?: Dialect): NormalizedDialect {
    // note lower case compared to CSV DDF
    const options: NormalizedDialect = {
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
export function serialize(data: Data | (string | number | null)[][], dialect?: Dialect): string {
    const a: (string | number | null)[][] = (data instanceof Array) ? data : dataToArrays(data);
    const options = normalizeDialectOptions(dialect);

    const fieldToString = function fieldToString(field: string | number | null): string {
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
            let fieldBuffer = fieldToString(fields[j]);
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
 * Normalizes the line terminator across the file
 */
function normalizeInputString(csvText: string, dialect?: Dialect) {
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
 * Parses a string representation of CSV data into an array of arrays, [][]
 * The dialect may be specified to improve the parsing.
 * @returns An array of arrays, [][], of (number|string|null) field values.
 */
export function parse(csvText: string, dialect?: Dialect): (string | number | null)[][] {

    const {s, options} = normalizeInputString(csvText, dialect);
    /**
     * Using cached length of s will improve performance and is safe because s is constant.
     */
    const sLength = s.length;

    /**
     * The character we are currently processing.
     */
    let ch = '';
    let inQuote = false;
    let fieldQuoted = false;

    /**
     * The parsed current field
     */
    let field: string | number | null = '';

    /**
     * The parsed row.
     */
    let row: (string | number | null)[] = [];

    /**
     * The parsed output.
     */
    let out: (string | number | null)[][] = [];

    /**
     * Helper function to parse a single field.
     */
    const parseField = function parseField(fieldAsString: string): string | number | null {
        if (fieldQuoted !== true) {
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
                return fieldAsString;
            }
        }
        else {
            return fieldAsString;
        }
    };

    for (let i = 0; i < sLength; i += 1) {
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
    if (options.skipRows) out = out.slice(options.skipRows);

    return out;
}
