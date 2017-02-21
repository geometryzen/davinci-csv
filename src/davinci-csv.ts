import config from './davinci-csv/config';
import { dataToArrays, parse, serialize } from './davinci-csv/core/CSV';

/**
 *
 */
const csv = {
    /**
     * The publish date of the latest version of the library.
     */
    get LAST_MODIFIED() { return config.LAST_MODIFIED; },
    /**
     * The semantic version of the library.
     */
    get VERSION() { return config.VERSION; },
    /**
     * 
     */
    get dataToArrays() { return dataToArrays; },
    /**
     * 
     */
    get parse() { return parse; },
    /**
     * 
     */
    get serialize() { return serialize; }
}

export default csv;
