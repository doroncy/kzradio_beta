/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
    /**
     * Array of application names.
     */
    app_name: ['KZRadio'],
    rules: {
        /**
         * A list of rules of the format {pattern : 'pattern', name : 'name'} for
         * matching incoming request URLs and naming the associated New Relic
         * transactions. Both pattern and name are required. Additional attributes
         * are ignored. Patterns may have capture groups (following JavaScript
         * conventions), and names will use $1-style replacement strings. See
         * the documentation for addNamingRule for important caveats.
         *
         * @env NEW_RELIC_NAMING_RULES
         */
        name: [],
        /**
         * A list of patterns for matching incoming request URLs to be ignored by
         * the agent. Patterns may be strings or regular expressions.
         *
         * @env NEW_RELIC_IGNORING_RULES
         */
        ignore: ['/asdk', '/*.txt', '/*.ico']
    },
    logging: {
        /**
         * Level at which to log. 'trace' is most useful to New Relic when diagnosing
         * issues with the agent, 'info' and higher will impose the least overhead on
         * production applications.
         */
        level: 'trace'
    }
};
