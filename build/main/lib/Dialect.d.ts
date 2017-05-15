/**
 * The (options) dialect is camelCase and everything is optional.
 */
export interface Dialect {
    /**
     * Specifies the delimiter between fields.
     * Default is the comma, </code>','</code>.
     * Used for parsing and serialization.
     */
    fieldDelimiter?: string;
    /**
     * Determines whether embedded quotation marks in strings are escaped during <em>serialization</em> by doubling them.
     * Default is <code>true</code>.
     */
    escapeEmbeddedQuotes?: boolean;
    /**
     * Specifies the character used to terminate a line.
     * Default is a single newline character, <code>'\n'</code>.
     * Used for parsing and serialization.
     */
    lineTerminator?: string;
    /**
     * The character used for quoting string fields.
     * Default is the double quote, <code>'"'</code>.
     * Used for parsing and serialization.
     */
    quoteChar?: string;
    /**
     * Skips the specified number of initial rows during <em>parsing</em>.
     * Default is zero, <code>0</code>.
     */
    skipInitialRows?: number;
    /**
     * Determines whether fields are trimmed during <em>parsing</em>.
     * Default is <code>true</code>.
     */
    trimFields?: boolean;
}
export default Dialect;
