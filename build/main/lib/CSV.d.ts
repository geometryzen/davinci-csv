import Data from './Data';
import Dialect from './Dialect';
/**
 * Converts from the fields and records structure to an array of arrays.
 * The first row in the output contains the field names in the same order as the input.
 * @returns An array of arrays, [][], of (number|string|null) field values.
 */
export declare function dataToArrays(data: Data): (number | string | null)[][];
/**
 * Converts from structured data to a string in CSV format of the specified dialect.
 */
export declare function serialize(data: Data | (string | number | null)[][], dialect?: Dialect): string;
/**
 * Parses a string representation of CSV data into an array of arrays, [][]
 * The dialect may be specified to improve the parsing.
 * @returns An array of arrays, [][], of (number|string|null) field values.
 */
export declare function parse(csvText: string, dialect?: Dialect): (string | number | null)[][];
