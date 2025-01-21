module.exports = {
    apps : [{
        name      : 'Pre Trade API',
        script    : './bin/app/app.js',
        node_args : '-r dotenv/config'
    }],
}
