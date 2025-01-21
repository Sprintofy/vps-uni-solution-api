module.exports = {
    apps : [{
        name      : 'Pre Trade API',
        script    : './bin/src/app.js',
        node_args : '-r dotenv/config'
    }],
}
