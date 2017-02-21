/**
 * The (options) dialect is camelCase and everything is optional.
 */
export interface Dialect {
    delimiter?: string;
    doubleQuote?: boolean;
    lineTerminator?: string;
    quoteChar?: string;
    skipInitialRows?: number;
    skipInitialSpace?: boolean;
    trim?: boolean;
}

export default Dialect;
