module.exports = {
    apps : [{
        name      : 'Pre Trade API',
        script    : './bin/server.js',
        node_args : '-r dotenv/config'
    }],
}
