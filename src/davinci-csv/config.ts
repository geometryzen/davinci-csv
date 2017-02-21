class Config {
    /**
     * The GitHub URL of the repository.
     */
    GITHUB: string;
    /**
     * The last modification date in YYYY-MM-DD format.
     */
    LAST_MODIFIED: string;
    /**
     * The namespace used for traditional JavaScript module loading.
     */
    NAMESPACE: string;
    /**
     * The semantic version number of this library, i.e., (major.minor.patch) format.
     */
    VERSION: string;

    constructor() {
        this.GITHUB = 'https://github.com/geometryzen/davinci-csv';
        this.LAST_MODIFIED = '2017-02-21';
        this.NAMESPACE = 'CSV';
        this.VERSION = '0.9.0';
    }
}

/**
 * The singleton instance of the configuration information.
 */
const config = new Config();

export default config;
