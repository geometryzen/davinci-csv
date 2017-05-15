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
 * A polyfill in case String.trim does not exist.
 */
const trim = (function () {
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
export function dataToArrays(data) {
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
export function serialize(data, dialect) {
    const a = (data instanceof Array) ? data : dataToArrays(data);
    const options = normalizeDialectOptions(dialect);
    const fieldToString = function fieldToString(field) {
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
export function parse(csvText, dialect) {
    const { s, options } = normalizeInputString(csvText, dialect);
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
     * Helper function to parse a single field.
     */
    const parseField = function parseField(fieldAsString) {
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
    if (options.skipRows)
        out = out.slice(options.skipRows);
    return out;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ1NWLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9DU1YudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBc0VBOztHQUVHO0FBQ0gsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDO0FBRXhCOztHQUVHO0FBQ0gsTUFBTSxTQUFTLEdBQUcsMENBQTBDLENBQUM7QUFFN0QsNkNBQTZDO0FBQzdDLDZDQUE2QztBQUM3QyxzQ0FBc0M7QUFDdEMsTUFBTSxjQUFjLEdBQUcsZ0JBQWdCLENBQUM7QUFFeEM7O0dBRUc7QUFDSCxNQUFNLElBQUksR0FBRyxDQUFDO0lBQ1YsZ0ZBQWdGO0lBQ2hGLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN4QixNQUFNLENBQUMsVUFBVSxDQUFTO1lBQ3RCLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDcEIsQ0FBQyxDQUFDO0lBQ04sQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ0osTUFBTSxDQUFDLFVBQVUsQ0FBUztZQUN0QixNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNyRCxDQUFDLENBQUM7SUFDTixDQUFDO0FBQ0wsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUVMOztHQUVHO0FBQ0gsZUFBZSxDQUFTLEVBQUUsY0FBc0I7SUFDNUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsS0FBSyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLDRDQUE0QztRQUM1QyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ2IsQ0FBQztJQUNELElBQUksQ0FBQyxDQUFDO1FBQ0Ysc0JBQXNCO1FBQ3RCLE1BQU0sQ0FBQyxD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